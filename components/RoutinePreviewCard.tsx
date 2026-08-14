import { Text } from '@/components/AppText';
import { Ionicons } from '@/components/AppIcons';
import { triggerHaptic } from '@/utils/haptics';
import * as Haptics from 'expo-haptics';
import { useRef, useState } from 'react';
import { Animated, Easing, Pressable, View } from 'react-native';
import ButtonShine from './ButtonShine';
import GradientTitle from './GradientTitle';
import { useTheme } from '../theme';
import { Type } from '../typography';

// ─── RoutinePreviewCard ────────────────────────────────────────────────────────
// Otto's workout preview, rendered INLINE in the chat as a sibling of his bubble (never a modal).
// Design and every decision behind it: SPEC_workout_builder.md 2.1b - 2.1l. The short version:
//
//   • It is the My Routines card, condensed: no pencil/trash (nothing is saved yet), no tag pills,
//     exercise count moved onto the title row.
//   • Rows are STACKED -- name on its own line, "3 sets · 8-10 reps · 90s rest" beneath it as WORDS.
//     The library's right-aligned `3×6-9` read like an abandoned equation and squeezed the names.
//   • The button NAMES ITS DESTINATION ("ADD TO THURSDAY"), is small, and is CENTRED.
//     ⚠️ "Add" is deliberately not "Load": the library's LOAD verb REPLACES a day, Otto MERGES into it.
//   • Multi-day builds collapse to one row per training day, opened on tap.
//   • Days carry CHECKMARKS. Typing changes CONTENT, tapping changes SCOPE.
//   • A card that has been accepted or superseded greys out and cannot be tapped.
//
// ⚠️ THE CARD ONLY EVER SHOWS WHAT WILL ACTUALLY BE SAVED. Validation runs before it renders, so there is
// no "we dropped something" state to design here. See spec 5.2.

export type PreviewExercise = {
  name: string;
  sets?: string;
  reps?: string;
  rest?: string;
  isCardio?: boolean;
  /** A movement not in the library, being created as a custom exercise on accept. */
  isNew?: boolean;
  /** ⚠️ NEW exercises only. Spec 8.1: these are the two fields most likely to be wrong and the only two
   *  the user would otherwise never see before permanently adding a movement to their library. */
  muscles?: string;
  instructions?: string[];
};

export type PreviewDay = {
  /** YYYY-MM-DD. The real date, never a bare weekday -- a weekday alone reads as a recurring template. */
  dateKey: string;
  /** "Mon Aug 17" */
  label: string;
  /** "Push", "Legs + Core" -- derived from the six locked tags, never written by Otto. */
  focus: string;
  /** The tag's own colour, for the dot. */
  color: string;
  exercises: PreviewExercise[];
};

export type WorkoutDraft = {
  id: string;
  /** "Push A" for one day, "Push / Pull / Legs" for a week. */
  title: string;
  days: PreviewDay[];
  /** 'live' = the newest card, tappable. 'used' = accepted or superseded, greyed and inert. */
  status: 'live' | 'used';
  /** Replaces the button on a used card: "Added to Thursday", "Replaced". */
  usedLabel?: string;
};

type Props = {
  draft: WorkoutDraft;
  /** Called with the dateKeys the user still has checked. */
  onAccept?: (dateKeys: string[]) => void;
  /** 🔴 Asks the host (the chat) to scroll a just-expanded day into view, passing the day row's node.
   *  ⚠️ The chat's auto-scroll deliberately IGNORES layout changes now (it used to fling you to the bottom
   *  of the thread), so an expanding day has to ask for the scroll explicitly. Without this the content
   *  simply grows off-screen and nothing follows it. */
  onRevealDay?: (node: any) => void;
};

const rowText = (ex: PreviewExercise) =>
  [ex.sets && `${ex.sets} sets`, ex.reps, ex.rest && `${ex.rest} rest`].filter(Boolean).join(' · ');

export default function RoutinePreviewCard({ draft, onAccept, onRevealDay }: Props) {
  const { theme } = useTheme();
  const isMulti = draft.days.length > 1;
  const used = draft.status === 'used';

  // Which days are still checked. All on by default -- the ordinary case asks the user nothing.
  const [checked, setChecked] = useState<Record<string, boolean>>(
    () => Object.fromEntries(draft.days.map(d => [d.dateKey, true])),
  );
  const [openDay, setOpenDay] = useState<string | null>(null);

  const keptDays = draft.days.filter(d => checked[d.dateKey]);
  const canAccept = !used && keptDays.length > 0;

  const totalExercises = draft.days.reduce((n, d) => n + d.exercises.length, 0);
  const countLabel = isMulti
    ? `${draft.days.length} Day${draft.days.length !== 1 ? 's' : ''}`
    : `${totalExercises} Exercise${totalExercises !== 1 ? 's' : ''}`;

  // The button names where it is going. One day = that day; several = how many.
  const buttonLabel = isMulti
    ? `ADD ${keptDays.length} DAY${keptDays.length !== 1 ? 'S' : ''}`
    : `ADD TO ${(draft.days[0]?.label || 'TODAY').toUpperCase()}`;

  // Greyed cards keep the layout and lose the colour, so the transcript still reads.
  const nameColor = used ? theme.textDim : theme.textSecondary;
  const metaColor = used ? theme.textDim : theme.textMuted;

  const ExerciseRow = ({ ex, i, inset }: { ex: PreviewExercise; i: number; inset?: boolean }) => (
    <View
      // ⚠️ NESTED ROWS USE A DIFFERENT DEVICE FROM THE DAY ROWS, DELIBERATELY. Justin, 2026-08-13: the
      // separators inside a day must not read like the ones BETWEEN days -- "this needs to feel like it
      // only belongs to that day's section". So: day rows get full-width lines + an alternating stripe;
      // exercises inside a day get INDENTED hairlines (they start at the text, not the card edge, because
      // the wrapper is inset by 28) in the lighter `borderSubtle`, and NO stripe. Indentation is the
      // signal that these are children of the row above.
      // ✅ The grouping itself is already carried by the shared background tint the open day and its
      // exercises inherit, so nothing more is needed to say "this belongs to Wednesday".
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        paddingHorizontal: inset ? 0 : 10,
        paddingVertical: 7,
        backgroundColor: !inset && i % 2 === 0 ? theme.bgInset : 'transparent',
        borderTopWidth: i > 0 ? 0.5 : 0,
        borderTopColor: inset ? theme.borderSubtle : theme.borderCard,
      }}
    >
      <View
        style={{
          width: 4,
          height: 4,
          borderRadius: 2,
          marginTop: 6,
          backgroundColor: used ? theme.textDim : ex.isCardio ? theme.accentAmber : theme.accentBlue,
        }}
      />
      <View style={{ flex: 1, minWidth: 0 }}>
        {/* Two lines, not one: truncating a name in the PREVIEW is how you lose an accept.
            ⚠️ SEMIBOLD 13 against the 10pt detail line beneath it. At regular 12 the two lines sat too
            close in weight and the list read as one flat block (Justin, 2026-08-13). The hierarchy is
            carried by WEIGHT AND SIZE, not colour -- accent was considered and rejected because every
            accent-coloured thing on this card means "tappable" (the button, the checkboxes, the top edge)
            and an exercise name is not. If it still reads flat, the next step is a darker grey. */}
        <Text style={{ fontSize: 13, lineHeight: 17, color: nameColor, fontFamily: Type.uiSemibold }} numberOfLines={2}>
          {ex.name}
        </Text>
        {!!rowText(ex) && (
          <Text style={{ fontSize: 10, lineHeight: 14, marginTop: 2, color: metaColor, fontFamily: Type.uiMedium }}>
            {rowText(ex)}
          </Text>
        )}
        {/* ⚠️ NEW exercises only (spec 8.1). This movement is about to join their library permanently and
            there is no in-app way to edit either field until the exercise editor ships. */}
        {ex.isNew && !used && (
          <View
            style={{
              marginTop: 6,
              paddingTop: 6,
              paddingLeft: 8,
              borderLeftWidth: 2,
              borderLeftColor: theme.accentBlueBorder,
            }}
          >
            <Text
              style={{
                fontSize: 9,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                color: theme.accentBlue,
                fontFamily: Type.uiBold,
                marginBottom: 3,
              }}
            >
              New Exercise
            </Text>
            {!!ex.muscles && (
              <Text style={{ fontSize: 10, lineHeight: 14, color: metaColor, fontFamily: Type.uiMedium }}>
                {ex.muscles}
              </Text>
            )}
            {ex.instructions?.map((line, n) => (
              <Text
                key={n}
                style={{ fontSize: 10, lineHeight: 14, marginTop: 2, color: theme.textDim, fontFamily: Type.ui }}
              >
                {line}
              </Text>
            ))}
          </View>
        )}
      </View>
    </View>
  );

  return (
    <View
      style={{
        marginTop: 8,
        backgroundColor: theme.bgCard,
        borderWidth: 0.5,
        borderTopWidth: 1.5,
        borderColor: theme.borderCard,
        borderTopColor: used ? theme.borderCard : theme.accentBlueRaw,
        borderRadius: 12,
        padding: 12,
        opacity: used ? 0.72 : 1,
        shadowColor: theme.cardShadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: used ? 0 : theme.cardShadowOpacity,
        shadowRadius: 12,
        elevation: used ? 0 : 6,
      }}
    >
      {/* Title row. The exercise/day count sits in the corner the pencil and trash vacated. */}
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <GradientTitle
            title={draft.title}
            color={nameColor}
            style={{ fontSize: 16, fontFamily: Type.uiBold }}
            numberOfLines={1}
          />
        </View>
        <Text
          style={{
            fontSize: 9,
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: metaColor,
            fontFamily: Type.uiBold,
          }}
        >
          {countLabel}
        </Text>
      </View>

      <View style={{ borderWidth: 0.5, borderColor: theme.borderCard, borderRadius: 6, overflow: 'hidden', marginBottom: 12 }}>
        {isMulti
          ? draft.days.map((day, di) => (
              <DayRow
                key={day.dateKey}
                day={day}
                index={di}
                used={used}
                open={openDay === day.dateKey}
                checked={!!checked[day.dateKey]}
                onToggleOpen={() => setOpenDay(openDay === day.dateKey ? null : day.dateKey)}
                onToggleChecked={() =>
                  setChecked(c => ({ ...c, [day.dateKey]: !c[day.dateKey] }))
                }
                onRevealDay={onRevealDay}
                renderExercise={(ex, i) => <ExerciseRow key={i} ex={ex} i={i} inset />}
              />
            ))
          : (draft.days[0]?.exercises || []).map((ex, i) => <ExerciseRow key={i} ex={ex} i={i} />)}
      </View>

      {/* One primary action, CENTRED, hugging its label. Never full width -- a chat card is a small space. */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
        {used ? (
          <Text
            style={{
              fontSize: 10,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              color: theme.textDim,
              fontFamily: Type.uiBold,
              paddingVertical: 7,
            }}
          >
            {draft.usedLabel || 'Done'}
          </Text>
        ) : (
          <Pressable
            disabled={!canAccept}
            hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
            onPress={() => {
              if (!canAccept) return;
              triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
              onAccept?.(keptDays.map(d => d.dateKey));
            }}
            style={{
              paddingVertical: 7,
              paddingHorizontal: 14,
              borderRadius: 8,
              backgroundColor: canAccept ? theme.accentBlueBg : theme.bgInset,
              borderWidth: 1,
              borderColor: canAccept ? theme.accentBlueBorder : theme.borderCard,
            }}
          >
            {canAccept && <ButtonShine radius={8} />}
            <Text
              style={{
                fontSize: 12,
                letterSpacing: 1,
                color: canAccept ? theme.accentBlue : theme.textDim,
                fontFamily: Type.uiBold,
              }}
            >
              {keptDays.length === 0 ? 'NOTHING SELECTED' : buttonLabel}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

// ─── One collapsed training day in a multi-day build ───────────────────────────
// The collapsed row is the Programs card's day pill, made openable: chevron, tag-coloured dot, the DATE,
// the focus and the exercise count, plus its checkbox.
// ⚠️ TWO TAP TARGETS ON ONE ROW. The checkbox must not be hit when someone means to expand, so it gets its
// own Pressable and its own hitSlop. Spec 2.1i.
function DayRow({
  day,
  index,
  used,
  open,
  checked,
  onToggleOpen,
  onToggleChecked,
  onRevealDay,
  renderExercise,
}: {
  day: PreviewDay;
  index: number;
  used: boolean;
  open: boolean;
  checked: boolean;
  onToggleOpen: () => void;
  onToggleChecked: () => void;
  onRevealDay?: (node: any) => void;
  renderExercise: (ex: PreviewExercise, i: number) => React.ReactNode;
}) {
  const { theme } = useTheme();
  const [contentH, setContentH] = useState(0);
  const anim = useRef(new Animated.Value(0)).current;
  const measured = useRef(false);
  const rowRef = useRef<View>(null);

  // ⚠️ NEVER maxHeight (CLAUDE.md). The content is always mounted so it can be measured by onLayout, the
  // wrapper animates to that exact pixel height, and overflow hides the rest.
  const toggle = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    const to = open ? 0 : 1;
    onToggleOpen();
    Animated.timing(anim, {
      toValue: to,
      duration: 220,
      easing: to ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: false, // height is a layout prop; the native driver cannot carry it
    }).start();
    // Only on OPEN. Collapsing shrinks the thread and never hides anything, so it needs no scroll.
    if (to === 1) onRevealDay?.(rowRef.current);
  };

  const dim = used || !checked;

  return (
    <View
      ref={rowRef}
      collapsable={false}
      style={{
        backgroundColor: index % 2 === 0 ? theme.bgInset : 'transparent',
        borderTopWidth: index > 0 ? 0.5 : 0,
        borderTopColor: theme.borderCard,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Pressable
          disabled={used}
          onPress={toggle}
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 9 }}
        >
          <Ionicons
            name={open ? 'chevron-down' : 'chevron-forward'}
            size={10}
            color={theme.textDim}
          />
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: dim ? theme.textDim : day.color }} />
          <Text style={{ fontSize: 12, color: dim ? theme.textDim : theme.textSecondary, fontFamily: Type.uiBold }}>
            {day.label}
          </Text>
          <Text style={{ flex: 1, fontSize: 12, color: dim ? theme.textDim : theme.textSecondary, fontFamily: Type.ui }} numberOfLines={1}>
            · {day.focus}
          </Text>
          <Text style={{ fontSize: 10, color: theme.textDim, fontFamily: Type.uiMedium }}>
            {day.exercises.length} exercises
          </Text>
        </Pressable>

        {/* Its own target, deliberately separated from the expand. */}
        <Pressable
          disabled={used}
          onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); onToggleChecked(); }}
          hitSlop={{ top: 12, bottom: 12, left: 10, right: 12 }}
          style={{ paddingHorizontal: 10, paddingVertical: 9 }}
        >
          <View
            style={{
              width: 16,
              height: 16,
              borderRadius: 4,
              borderWidth: 1.5,
              alignItems: 'center',
              justifyContent: 'center',
              borderColor: checked && !used ? theme.accentBlue : theme.textDim,
              backgroundColor: checked && !used ? theme.accentBlue : 'transparent',
            }}
          >
            {checked && <Ionicons name="checkmark" size={11} color={theme.bgCard} />}
          </View>
        </Pressable>
      </View>

      <Animated.View
        style={{
          height: measured.current ? anim.interpolate({ inputRange: [0, 1], outputRange: [0, contentH] }) : open ? undefined : 0,
          overflow: 'hidden',
        }}
      >
        <View
          onLayout={e => {
            const h = e.nativeEvent.layout.height;
            if (h > 0 && h !== contentH) { setContentH(h); measured.current = true; }
          }}
          style={{ paddingHorizontal: 10, paddingBottom: 9, paddingLeft: 28 }}
        >
          {day.exercises.map((ex, i) => renderExercise(ex, i))}
        </View>
      </Animated.View>
    </View>
  );
}
