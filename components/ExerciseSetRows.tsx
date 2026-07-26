// Per-set logging rows for a lift exercise (weight x reps + done check) on the Workout tab.
// Self-contained: holds its OWN local set state so typing never re-renders the parent
// DraggableFlatList, and persists up to the parent on blur / check / add / remove. Remount it
// (key on date+exerciseId) to re-seed when the active day or exercise changes.
import { Ionicons } from '@/components/AppIcons';
import { Text, TextInput } from '@/components/AppText';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import { useEffect, useRef, useState } from 'react';
import { Animated, TouchableOpacity, View } from 'react-native';
import type { SetEntry } from '../workoutData';
import { weightUnitHeader, formatHold, parseHoldInput } from '../workoutData';
import { Type } from '../typography';

const MAX_SETS = 10;

interface Props {
  initialSets: SetEntry[];
  previousSets: SetEntry[] | null; // last session's logged sets for this lift (index-aligned), or null
  defaultRest: number | null;
  onPersist: (sets: SetEntry[]) => void;
  onSetChecked?: (restSeconds: number | null) => void; // fired when a set is checked ON (starts rest)
  unit?: 'lb' | 'kg'; // weight unit for this exercise (missing = lb)
  onUnitPress?: () => void; // tap the weight-column header to toggle lb/kg
  trackingType?: 'reps' | 'time'; // 'time' turns the reps column into a held-duration (M:SS) column
  onTrackingTypePress?: () => void; // tap the reps/time header to toggle reps <-> time
  onStartHold?: (setIndex: number, targetSec: number | null) => void; // tap the play button to run the hold timer
  activeHoldIndex?: number | null; // the set index whose hold timer is currently running (shows active state)
  onStopHold?: () => void; // tapping the CHECK circle of the actively-holding set finishes the hold (= chip Done)
  theme: any;
}

// Prior-session label. In time mode the second value is the held duration (M:SS) instead of reps.
const prevLabel = (p: SetEntry | undefined, time: boolean) => {
  if (!p) return null;
  if (time) {
    if (p.weight != null && p.durationSec != null) return `${p.weight} × ${formatHold(p.durationSec)}`;
    if (p.durationSec != null) return formatHold(p.durationSec);
    if (p.weight != null) return `${p.weight}`;
    return null;
  }
  if (p.weight != null && p.reps != null) return `${p.weight} × ${p.reps}`;
  if (p.weight != null) return `${p.weight}`;
  if (p.reps != null) return `${p.reps} reps`;
  return null;
};

// Shared column flex so the header cells sit dead-center over their data cells, and the row
// spans the full card width with the check + remove pinned to the right edge. The input columns are
// widened enough that the TIME box shows a full M:SS alongside its play button (see PLAY_W below).
const COL = { set: 0.7, prev: 1.15, weight: 1.4, track: 1.75 };
// The hold play button lives in its OWN fixed-width slot BETWEEN the weight and time columns (NOT inside
// the time box). That keeps the TIME box a normal centered box, so its header centers over it exactly like
// KGS does -- no offset math. A matching spacer sits in the header row so the columns stay aligned.
const PLAY_SLOT = 24;
const CHECK_W = 34;
const X_W = 22;

export default function ExerciseSetRows({ initialSets, previousSets, defaultRest, onPersist, onSetChecked, unit, onUnitPress, trackingType, onTrackingTypePress, onStartHold, activeHoldIndex, onStopHold, theme: t }: Props) {
  const [sets, setSets] = useState<SetEntry[]>(initialSets);
  const atMax = sets.length >= MAX_SETS;

  // While a TIME field is focused, show the RAW digits being typed ("145") and only format to clock
  // (1:45) on blur. Editing the formatted value directly makes every keystroke reformat and the cursor
  // jump ("0:004" -> "0:04"); typing raw digits fills cleanly with no flicker. durationSec updates live.
  const [holdEdit, setHoldEdit] = useState<{ i: number; raw: string } | null>(null);
  const holdDigitsFor = (sec: number | null | undefined) => (sec ? String(Math.floor(sec / 60) * 100 + (sec % 60)) : '');
  const isTime = trackingType === 'time';

  // Blinking cursor for the focused time box. The real caret is hidden (the box you SEE is a formatted
  // clock, the box you TYPE into is a transparent raw-digit input), so we draw our own blink after the
  // digits to show the box is live. Native-driver opacity loop, cheap enough to just always run.
  const caretBlink = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(caretBlink, { toValue: 0, duration: 480, useNativeDriver: true }),
      Animated.timing(caretBlink, { toValue: 1, duration: 480, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);

  const numStr = (n: number | null) => (n != null ? String(n) : '');

  // Live, local-only edit (smooth typing, no parent re-render). Persists on blur.
  const edit = (i: number, patch: Partial<SetEntry>) =>
    setSets(prev => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  // Mutations that persist immediately (check / add / remove).
  const commit = (next: SetEntry[]) => { setSets(next); onPersist(next); };

  const toggle = (i: number) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    const turningOn = !sets[i].done;
    commit(sets.map((s, idx) => {
      if (idx !== i) return s;
      if (s.done) return { ...s, done: false, doneAt: undefined };
      // Checking an empty row auto-fills from last session, so a repeat set is one tap. Time mode fills
      // the held duration; reps mode fills reps. Weight is filled in either mode.
      const p = previousSets?.[i];
      return {
        ...s,
        done: true,
        doneAt: Date.now(),
        weight: s.weight == null && p ? p.weight : s.weight,
        // Reps and duration are mutually exclusive per the column mode. Store ONLY the metric this
        // set is tracked by, so a value typed in the other mode (e.g. a rep typed before switching
        // to Time) can't linger as a ghost. What shows is exactly what saves.
        reps: isTime ? null : (s.reps == null && p ? p.reps : s.reps),
        durationSec: isTime ? (s.durationSec == null && p ? p.durationSec : s.durationSec) : null,
      };
    }));
    if (turningOn) onSetChecked?.(sets[i].rest ?? defaultRest);
  };
  const addSet = () => {
    if (sets.length >= MAX_SETS) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    const last = sets[sets.length - 1];
    commit([...sets, { weight: last?.weight ?? null, reps: null, rest: last?.rest ?? defaultRest, done: false }]);
  };
  const removeSet = (i: number) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    commit(sets.filter((_, idx) => idx !== i));
  };

  const headerCell = { fontSize: 8, letterSpacing: 1.2, color: t.textMuted, fontFamily: Type.uiBold, textTransform: 'uppercase' as const, textAlign: 'center' as const };
  const inputStyle = (done: boolean) => ({
    width: '100%' as const, height: 32, borderRadius: 8, borderWidth: 1, textAlign: 'center' as const,
    fontSize: 15, fontFamily: Type.uiBold, paddingVertical: 0,
    backgroundColor: t.bgInput, borderColor: done ? t.accentGreenBorder : t.borderInput, color: t.textSecondary,
  });

  return (
    <View style={{ marginTop: 12 }}>
      {/* Column headers -- same flex as the data rows so they line up */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
        <Text numberOfLines={1} style={[headerCell, { flex: COL.set }]}>Set</Text>
        <Text numberOfLines={1} style={[headerCell, { flex: COL.prev }]}>Prev</Text>
        <TouchableOpacity
          style={{ flex: COL.weight, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2 }}
          onPress={onUnitPress}
          disabled={!onUnitPress}
          hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}>
          <Text style={headerCell}>{weightUnitHeader(unit)}</Text>
          {onUnitPress ? <Ionicons name="swap-horizontal" size={11} color={t.textMuted} /> : null}
        </TouchableOpacity>
        {/* Fixed spacer matching the data row's play-button slot, so TIME lines up over its box. */}
        {isTime && onStartHold ? <View style={{ width: PLAY_SLOT }} /> : null}
        <TouchableOpacity
          style={{ flex: COL.track, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2 }}
          onPress={onTrackingTypePress}
          disabled={!onTrackingTypePress}
          hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}>
          <Text style={headerCell}>{isTime ? 'Time' : 'Reps'}</Text>
          {onTrackingTypePress ? <Ionicons name="swap-horizontal" size={11} color={t.textMuted} /> : null}
        </TouchableOpacity>
        <View style={{ width: CHECK_W }} />
        <View style={{ width: X_W }} />
      </View>

      {sets.map((s, i) => {
        const prev = prevLabel(previousSets?.[i], isTime);
        const pd = previousSets?.[i]?.durationSec;
        // Hold time cell: while focused, the shown seconds come from the live digit buffer; otherwise
        // from the stored durationSec. A transparent input on top captures typing so the visible clock
        // (a plain Text) never reformats mid-keystroke -- no flash, no cursor jump.
        const holdActive = holdEdit != null && holdEdit.i === i;
        const holdSec = holdActive ? (holdEdit.raw ? parseHoldInput(holdEdit.raw) : null) : (s.durationSec ?? null);
        return (
          <View
            key={i}
            style={{
              flexDirection: 'row', alignItems: 'center', marginBottom: 4,
              paddingVertical: 3, borderRadius: 8, backgroundColor: s.done ? t.accentGreenBg : 'transparent',
            }}>
            <Text style={{ flex: COL.set, textAlign: 'center', fontSize: 14, fontFamily: Type.uiBold, color: s.done ? t.accentGreen : t.textSecondary }}>
              {i + 1}
            </Text>
            <Text style={{ flex: COL.prev, textAlign: 'center', fontSize: 11, fontFamily: Type.uiMedium, color: t.textDim }} numberOfLines={1}>
              {prev ?? '—'}
            </Text>
            <View style={{ flex: COL.weight, paddingHorizontal: 4 }}>
              <TextInput
                style={inputStyle(s.done)}
                value={numStr(s.weight)}
                onChangeText={txt => edit(i, { weight: txt === '' ? null : (parseFloat(txt) || 0) })}
                onEndEditing={() => onPersist(sets)}
                keyboardType="decimal-pad"
                placeholder={previousSets?.[i]?.weight != null ? String(previousSets[i].weight) : '—'}
                placeholderTextColor={t.textDim}
                returnKeyType="done"
              />
            </View>
            {/* Play button in its own fixed slot (time mode only), so the time box stays centered. The
                icon shows only for un-done sets: once a hold is logged, re-pressing it would count down
                from the logged time and hand off to rest. Uncheck the set to redo. Slot stays for alignment. */}
            {isTime && onStartHold ? (
              <View style={{ width: PLAY_SLOT, alignItems: 'center' }}>
                {!s.done ? (
                  <TouchableOpacity
                    onPress={() => { if (activeHoldIndex === i) return; onPersist(sets); onStartHold(i, s.durationSec ?? null); }}
                    hitSlop={{ top: 8, bottom: 8, left: 2, right: 2 }}>
                    <Ionicons name={activeHoldIndex === i ? 'radio-button-on' : 'play-circle'} size={22} color={activeHoldIndex === i ? t.accentGreen : t.accentBlue} />
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}
            <View style={{ flex: COL.track, paddingHorizontal: 4 }}>
              {isTime ? (
                // Display (plain Text) + invisible input on top: the box you SEE is never the box you
                // TYPE into, so the formatted clock can't flicker as it reformats each keystroke.
                <View style={[inputStyle(s.done), { justifyContent: 'center', alignItems: 'center' }, holdActive && { borderColor: t.accentBlue, backgroundColor: t.accentBlue + '1f' }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 15, fontFamily: Type.uiBold, color: holdSec != null ? t.textSecondary : t.textDim }} numberOfLines={1}>
                      {holdSec != null ? formatHold(holdSec) : (pd != null ? formatHold(pd) : '—')}
                    </Text>
                    {holdActive ? <Animated.View style={{ opacity: caretBlink, width: 2, height: 17, borderRadius: 1, backgroundColor: t.accentBlue, marginLeft: 2 }} /> : null}
                  </View>
                  <TextInput
                    value={holdActive ? holdEdit.raw : holdDigitsFor(s.durationSec)}
                    // Pin the caret to the end so a digit always enters on the RIGHT and shifts the rest
                    // left (clock fill), no matter where in the box the user tapped.
                    selection={holdActive ? { start: holdEdit.raw.length, end: holdEdit.raw.length } : undefined}
                    onFocus={() => setHoldEdit({ i, raw: holdDigitsFor(s.durationSec) })}
                    onChangeText={txt => { const d = txt.replace(/\D/g, '').slice(-4); setHoldEdit({ i, raw: d }); edit(i, { durationSec: d === '' ? null : parseHoldInput(d) }); }}
                    onEndEditing={() => { setHoldEdit(prev => (prev && prev.i === i ? null : prev)); onPersist(sets); }}
                    onBlur={() => setHoldEdit(prev => (prev && prev.i === i ? null : prev))}
                    keyboardType="number-pad"
                    caretHidden
                    returnKeyType="done"
                    style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, color: 'transparent', textAlign: 'center', paddingVertical: 0 }}
                  />
                </View>
              ) : (
                <TextInput
                  style={inputStyle(s.done)}
                  value={numStr(s.reps)}
                  onChangeText={txt => edit(i, { reps: txt === '' ? null : (parseInt(txt) || 0) })}
                  onEndEditing={() => onPersist(sets)}
                  keyboardType="number-pad"
                  placeholder={previousSets?.[i]?.reps != null ? String(previousSets[i].reps) : '—'}
                  placeholderTextColor={t.textDim}
                  returnKeyType="done"
                />
              )}
            </View>
            <TouchableOpacity onPress={() => { if (activeHoldIndex === i && onStopHold) { onStopHold(); return; } toggle(i); }} style={{ width: CHECK_W, alignItems: 'center' }} hitSlop={{ top: 8, bottom: 8, left: 4, right: 2 }}>
              <View style={{
                width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center',
                backgroundColor: s.done ? t.accentGreen : 'transparent',
                borderColor: s.done ? t.accentGreen : t.borderCard,
              }}>
                {s.done && <Ionicons name="checkmark" size={14} color={t.bgPrimary} />}
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => removeSet(i)} style={{ width: X_W, alignItems: 'center' }} hitSlop={{ top: 8, bottom: 8, left: 2, right: 6 }}>
              <Ionicons name="close" size={15} color={t.textDim} />
            </TouchableOpacity>
          </View>
        );
      })}

      <TouchableOpacity
        onPress={addSet}
        disabled={atMax}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 7, marginTop: 2, alignSelf: 'flex-start', opacity: atMax ? 0.4 : 1 }}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
        <Ionicons name="add-circle-outline" size={16} color={t.accentBlue} />
        <Text style={{ fontSize: 12, fontFamily: Type.uiSemibold, color: t.accentBlue }}>
          {atMax ? 'Max 10 sets' : 'Add set'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
