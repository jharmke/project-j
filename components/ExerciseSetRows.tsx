// Per-set logging rows for a lift exercise (weight x reps + done check) on the Workout tab.
// Self-contained: holds its OWN local set state so typing never re-renders the parent
// DraggableFlatList, and persists up to the parent on blur / check / add / remove. Remount it
// (key on date+exerciseId) to re-seed when the active day or exercise changes.
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import { useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { SetEntry } from '../workoutData';

const MAX_SETS = 10;

interface Props {
  initialSets: SetEntry[];
  previousSets: SetEntry[] | null; // last session's logged sets for this lift (index-aligned), or null
  defaultRest: number | null;
  onPersist: (sets: SetEntry[]) => void;
  onSetChecked?: (restSeconds: number | null) => void; // fired when a set is checked ON (starts rest)
  theme: any;
}

const prevLabel = (p: SetEntry | undefined) => {
  if (!p) return null;
  if (p.weight != null && p.reps != null) return `${p.weight} × ${p.reps}`;
  if (p.weight != null) return `${p.weight}`;
  if (p.reps != null) return `${p.reps} reps`;
  return null;
};

// Shared column flex so the header cells sit dead-center over their data cells, and the row
// spans the full card width with the check + remove pinned to the right edge.
const COL = { set: 0.6, prev: 1.3, input: 1.5 };
const CHECK_W = 34;
const X_W = 22;

export default function ExerciseSetRows({ initialSets, previousSets, defaultRest, onPersist, onSetChecked, theme: t }: Props) {
  const [sets, setSets] = useState<SetEntry[]>(initialSets);
  const atMax = sets.length >= MAX_SETS;

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
      if (s.done) return { ...s, done: false };
      // Checking an empty row auto-fills weight/reps from last session, so a repeat set is one tap.
      const p = previousSets?.[i];
      return {
        ...s,
        done: true,
        weight: s.weight == null && p ? p.weight : s.weight,
        reps: s.reps == null && p ? p.reps : s.reps,
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

  const headerCell = { fontSize: 8, letterSpacing: 1.2, color: t.textMuted, fontFamily: 'DMSans_700Bold' as const, textTransform: 'uppercase' as const, textAlign: 'center' as const };
  const inputStyle = (done: boolean) => ({
    width: '100%' as const, height: 32, borderRadius: 8, borderWidth: 1, textAlign: 'center' as const,
    fontSize: 15, fontFamily: 'DMSans_700Bold' as const, paddingVertical: 0,
    backgroundColor: t.bgInput, borderColor: done ? t.accentGreenBorder : t.borderInput, color: t.textPrimary,
  });

  return (
    <View style={{ marginTop: 12 }}>
      {/* Column headers -- same flex as the data rows so they line up */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
        <Text style={[headerCell, { flex: COL.set }]}>Set</Text>
        <Text style={[headerCell, { flex: COL.prev }]}>Prev</Text>
        <Text style={[headerCell, { flex: COL.input }]}>Lbs</Text>
        <Text style={[headerCell, { flex: COL.input }]}>Reps</Text>
        <View style={{ width: CHECK_W }} />
        <View style={{ width: X_W }} />
      </View>

      {sets.map((s, i) => {
        const prev = prevLabel(previousSets?.[i]);
        return (
          <View
            key={i}
            style={{
              flexDirection: 'row', alignItems: 'center', marginBottom: 4,
              paddingVertical: 3, borderRadius: 8, backgroundColor: s.done ? t.accentGreenBg : 'transparent',
            }}>
            <Text style={{ flex: COL.set, textAlign: 'center', fontSize: 14, fontFamily: 'DMSans_700Bold', color: s.done ? t.accentGreen : t.textSecondary }}>
              {i + 1}
            </Text>
            <Text style={{ flex: COL.prev, textAlign: 'center', fontSize: 11, fontFamily: 'DMSans_500Medium', color: t.textDim }} numberOfLines={1}>
              {prev ?? '—'}
            </Text>
            <View style={{ flex: COL.input, paddingHorizontal: 4 }}>
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
            <View style={{ flex: COL.input, paddingHorizontal: 4 }}>
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
            </View>
            <TouchableOpacity onPress={() => toggle(i)} style={{ width: CHECK_W, alignItems: 'center' }} hitSlop={{ top: 8, bottom: 8, left: 4, right: 2 }}>
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
        <Text style={{ fontSize: 12, fontFamily: 'DMSans_600SemiBold', color: t.accentBlue }}>
          {atMax ? 'Max 10 sets' : 'Add set'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
