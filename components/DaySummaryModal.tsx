// components/DaySummaryModal.tsx
// The morning Day Summary pop-up: fires on first app load after 5am to show
// yesterday's Day Score. Centered card (Programs-modal pattern, NOT a bottom
// sheet): accent top border, handle pill, scale-in + overlay fade. No X, no
// tap-outside dismiss (prevents accidental dismissal while reading). Dismiss via
// the handle, the GOT IT button, or the inline Exclude action.
//
// Full spec: SPEC_day_score_and_summary.md section 3. Mode-aware copy
// (Discipline/Balanced vs Mindful) and faith-aware win line (Rooted only, when a
// journal/prayer/study/gratitude entry exists for the day).

import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Reanimated, { useSharedValue, useAnimatedStyle, useAnimatedProps, withTiming, withSpring, withDelay, withRepeat, cancelAnimation, runOnJS, Easing, SharedValue } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TooltipIcon from './TooltipIcon';
import { ToastRenderer, useToast } from './Toast';
import { DayScore } from '../utils/dayScore';
import { excludeDayFromAverages, loadRecentComposites } from '../utils/dayScoreStore';

const AnimCircle = Reanimated.createAnimatedComponent(Circle);

type StyleMode = 'discipline' | 'balanced' | 'mindful';
type FaithJourney = 'rooted' | 'exploring' | 'notrightnow';

interface Props {
  score: DayScore;
  dateKey: string;            // yesterday, YYYY-MM-DD
  theme: any;
  styleMode: StyleMode;
  faithJourney: FaithJourney;
  onClose: () => void;        // clears the parent's daySummary state
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function formatLongDate(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return `${DAYS[dt.getDay()]}, ${MONTHS[dt.getMonth()]} ${dt.getDate()}`;
}

// Faith categories that count toward the Rooted win-line framing. Personal and
// fitness journal entries are NOT faith. Legacy entries with no category are the
// old daily-verse reflections, so they count.
const FAITH_CATS = ['verse', 'prayer', 'study', 'gratitude'];
async function hadFaithEntryOn(dateKey: string): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem('pj_bible_reflections');
    if (!raw) return false;
    const entries = JSON.parse(raw);
    if (!Array.isArray(entries)) return false;
    return entries.some((e: any) => e?.date === dateKey && (!e.category || FAITH_CATS.includes(e.category)));
  } catch {
    return false;
  }
}

// ── Win-line / coach-note copy ───────────────────────────────────────────────
const WIN_STD: Record<string, string> = {
  calorie: 'You nailed your calorie target.',
  protein: 'Protein was dialed in.',
  water: 'You crushed your water goal.',
  active: 'You torched your activity goal.',
  workout: 'Every set checked off. Done.',
  movement: 'You moved your body today.',
  sleep: 'You slept like a champ.',
};
const WIN_MINDFUL: Record<string, string> = {
  calorie: 'You showed up for your nutrition.',
  protein: 'You fueled your body well.',
  water: 'You stayed hydrated.',
  active: 'You moved your body today.',
  workout: 'You showed up for your training.',
  movement: 'You moved your body today.',
  sleep: 'You gave your body real rest.',
};
const COACH_STD: Record<string, string> = {
  calorie: 'Calories drifted from target. Reset today.',
  protein: 'Protein was your gap. Aim higher today.',
  water: 'Water came up short. Keep a bottle close today.',
  active: 'Activity was light. A walk today moves the needle.',
  workout: 'A few sets went unchecked.',
  movement: 'Movement was light. A short walk today helps.',
  sleep: 'Sleep ran short. Aim for an earlier night.',
};
const COACH_MINDFUL: Record<string, string> = {
  calorie: "Nutrition's one area to ease back into today.",
  protein: "Protein's one area to explore today.",
  water: 'A little more water today could help.',
  active: 'Some gentle movement today might feel good.',
  workout: 'Training was one area left open.',
  movement: 'Some gentle movement today might feel good.',
  sleep: 'Rest is one area to lean into tonight.',
};
const FAITH_WIN_LINE = 'Strong day. You took care of your body and your spirit.';

type SubKey = 'calorie' | 'protein' | 'water' | 'active' | 'workout' | 'movement' | 'sleep';
// Tie-break order for the win line: most impressive thing wins a tie.
const WIN_PRIORITY: SubKey[] = ['workout', 'calorie', 'active', 'sleep', 'protein', 'water', 'movement'];

// Build the list of present sub-components with each one's earned/max ratio.
// Only subs that actually scored above zero are gap candidates downstream, so an
// unset goal (water you never configured) can never trigger a false coach note.
function buildSubs(score: DayScore): { key: SubKey; ratio: number }[] {
  const subs: { key: SubKey; ratio: number }[] = [];
  const nd = score.nutritionDetail;
  if (score.nutritionScore !== null && nd) {
    if (nd.calorieHit || nd.calorieScore > 0) subs.push({ key: 'calorie', ratio: nd.calorieHit ? 1 : nd.calorieScore / 55 });
    if (nd.proteinScore > 0) subs.push({ key: 'protein', ratio: Math.min(1, nd.proteinScore / 28) });
    if (nd.waterScore > 0) subs.push({ key: 'water', ratio: Math.min(1, nd.waterScore / 17) });
  }
  const ad = score.activityDetail;
  if (score.activityScore !== null && ad) {
    if (ad.isMindfulPresence) {
      subs.push({ key: 'movement', ratio: (score.activityScore || 0) / 100 });
    } else if (ad.workoutScore !== null) {
      if (ad.activeCalScore > 0) subs.push({ key: 'active', ratio: Math.min(1, ad.activeCalScore / 60) });
      subs.push({ key: 'workout', ratio: Math.min(1, ad.workoutScore / 40) });
    } else if (ad.activeCalScore > 0) {
      // Rest-floored day: activeCalScore is already on the 0 to 100 floored scale.
      subs.push({ key: 'active', ratio: Math.min(1, ad.activeCalScore / 100) });
    }
  }
  const sd = score.sleepDetail;
  if (score.sleepScore !== null && sd) {
    subs.push({ key: 'sleep', ratio: Math.min(1, sd.rawSleepScore / 100) });
  }
  return subs;
}

// Thin per-category fill bar. Animates up from zero on open (shared progress),
// each bar's fill is its own score percent. Null score renders an empty track.
function PillBar({ value, color, progress }: { value: number | null; color: string; progress: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({ width: `${(value || 0) * progress.value}%` as any }));
  if (value === null) return null;
  return <Reanimated.View style={[{ height: '100%', borderRadius: 2, backgroundColor: color }, style]} />;
}

// Hero score dial: the composite as a circular gauge (Oura/Whoop style), filled
// to value%, with the number centered. Arc animates up from zero on open.
// celebrate: 'pulse' (great day) adds a gentle scale shimmer; 'shine' (elite)
// adds a bright glint that sweeps around the ring (reads on any theme). Both fire
// only after the arc finishes filling.
function ScoreRing({ value, color, theme, celebrate }: { value: number; color: string; theme: any; celebrate: 'none' | 'pulse' | 'shine' }) {
  const size = 152, stroke = 10, radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const arc = useSharedValue(0);
  const t = useSharedValue(0);   // one shared clock (0 to 1) drives pulse + glint
  const isShine = celebrate === 'shine';

  // Cycle phases (fractions of the loop): pulse, then a quick glint, then rest.
  const PULSE_END = 0.21, GLINT_END = 0.36;   // rest fills the remainder

  useEffect(() => {
    arc.value = 0;
    const frac = Math.min(100, Math.max(0, value)) / 100;
    arc.value = withDelay(180, withTiming(frac * circ, { duration: 800, easing: Easing.out(Easing.cubic) }));
  }, [value]);

  useEffect(() => {
    if (celebrate === 'none') { cancelAnimation(t); t.value = 0; return; }
    // Start after the arc finishes filling (~1s); one linear loop per cycle.
    t.value = withDelay(1050, withRepeat(withTiming(1, { duration: 2800, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(t);
  }, [celebrate]);

  const arcProps = useAnimatedProps(() => ({ strokeDasharray: `${arc.value} ${circ}` } as any));
  // Pulse: a single up/down swell over the first phase, flat the rest of the cycle.
  const pulseStyle = useAnimatedStyle(() => {
    const v = t.value;
    const scale = v < PULSE_END ? 1 + 0.05 * Math.sin(Math.PI * (v / PULSE_END)) : 1;
    return { transform: [{ scale }] };
  });
  // Glint: sweeps the ring during the phase right after the pulse, hidden otherwise.
  const sweepProps = useAnimatedProps(() => {
    const v = t.value;
    const span = GLINT_END - PULSE_END;
    const active = v >= PULSE_END && v <= GLINT_END;
    const local = active ? (v - PULSE_END) / span : 1;
    return { strokeDashoffset: -local * circ, strokeOpacity: active ? 1 : 0 } as any;
  });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={theme.bgInput} strokeWidth={stroke} fill="none" />
        <AnimCircle cx={size / 2} cy={size / 2} r={radius} stroke={color} strokeWidth={stroke} fill="none"
          animatedProps={arcProps} strokeLinecap="round" rotation="-90" origin={`${size / 2},${size / 2}`} />
        {isShine && (
          <AnimCircle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(255,255,255,0.7)" strokeWidth={stroke} fill="none"
            strokeDasharray={`${circ * 0.05} ${circ}`} animatedProps={sweepProps}
            strokeLinecap="round" rotation="-90" origin={`${size / 2},${size / 2}`} />
        )}
      </Svg>
      <Reanimated.View style={[{ alignItems: 'center' }, pulseStyle]}>
        <Text style={{ fontSize: 54, lineHeight: 58, fontFamily: 'BebasNeue_400Regular', color, opacity: 0.92 }}>
          {Math.round(value)}
        </Text>
        <Text style={{ fontSize: 8, letterSpacing: 2, fontFamily: 'DMSans_700Bold', color, opacity: 0.55, marginTop: -2 }}>OUT OF 100</Text>
      </Reanimated.View>
    </View>
  );
}

export default function DaySummaryModal({ score, dateKey, theme, styleMode, faithJourney, onClose }: Props) {
  const { showToast } = useToast();
  const [hadFaith, setHadFaith] = useState(false);
  const [confirmingExclude, setConfirmingExclude] = useState(false);
  const [contextLine, setContextLine] = useState('');

  const overlay = useSharedValue(0);
  const cardScale = useSharedValue(0.92);
  const barProgress = useSharedValue(0);
  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlay.value }));
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: cardScale.value }] }));

  // "YESTERDAY" only when this really is yesterday (morning pop-up). Tapping an
  // older day from the archive shows a neutral chip instead.
  const chipLabel = (() => {
    const t = new Date(); t.setDate(t.getDate() - 1);
    const yKey = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
    return dateKey === yKey ? 'YESTERDAY' : 'DAY SUMMARY';
  })();

  useEffect(() => {
    if (faithJourney === 'rooted') hadFaithEntryOn(dateKey).then(setHadFaith);
  }, [dateKey, faithJourney]);

  // Context line under the hero: gives the score a story. Mindful stays neutral
  // and comparison-free; other modes compare to the trailing week.
  useEffect(() => {
    if (styleMode === 'mindful') {
      const c = score.composite;
      setContextLine(c >= 80 ? 'A strong, steady day.' : c >= 60 ? 'A steady day.' : 'A gentle day.');
      return;
    }
    loadRecentComposites(dateKey, 6).then(prior => {
      if (!prior.length) { setContextLine(''); return; }
      if (score.composite >= Math.max(...prior)) { setContextLine('Your best day this week.'); return; }
      const avg = prior.reduce((a, b) => a + b, 0) / prior.length;
      const diff = Math.round(score.composite - avg);
      if (diff >= 1) setContextLine(`Up ${diff} from your weekly average.`);
      else if (diff <= -1) setContextLine(`Down ${Math.abs(diff)} from your weekly average.`);
      else setContextLine('Right on your weekly average.');
    }).catch(() => setContextLine(''));
  }, [dateKey, styleMode, score.composite]);

  const animateIn = () => {
    overlay.value = 0;
    cardScale.value = 0.92;
    barProgress.value = 0;
    overlay.value = withTiming(1, { duration: 180 });
    cardScale.value = withSpring(1, { damping: 24, stiffness: 320, overshootClamping: true });
    barProgress.value = withTiming(1, { duration: 650, easing: Easing.out(Easing.cubic) });
  };

  const dismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    overlay.value = withTiming(0, { duration: 140 });
    cardScale.value = withTiming(0.92, { duration: 140 }, (finished) => {
      if (finished) runOnJS(onClose)();
    });
  };

  const handleExclude = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await excludeDayFromAverages(dateKey);
    showToast('Day excluded', 'Removed from your weekly average', 'success');
    dismiss();
  };

  const handleViewSummary = () => {
    // Stub until the Stats Reports archive (step 4) exists.
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    showToast('Full summary is coming soon', undefined, 'info');
  };

  const isMindful = styleMode === 'mindful';
  const subs = buildSubs(score);

  let winLine = '';
  if (subs.length) {
    const best = [...subs].sort((a, b) => b.ratio - a.ratio || WIN_PRIORITY.indexOf(a.key) - WIN_PRIORITY.indexOf(b.key))[0];
    winLine = (isMindful ? WIN_MINDFUL : WIN_STD)[best.key];
  }
  if (faithJourney === 'rooted' && hadFaith) winLine = FAITH_WIN_LINE;

  let coachLine = '';
  const gaps = subs.filter(s => s.ratio < 0.60).sort((a, b) => a.ratio - b.ratio);
  if (gaps.length) coachLine = (isMindful ? COACH_MINDFUL : COACH_STD)[gaps[0].key];

  const pills: { label: string; val: number | null; icon: keyof typeof Ionicons.glyphMap }[] = [
    { label: 'NUTRITION', val: score.nutritionScore, icon: 'restaurant' },
    { label: 'ACTIVITY', val: score.activityScore, icon: 'barbell' },
    { label: 'RECOVERY', val: score.sleepScore, icon: 'heart' },
  ];
  // Bar color: tier-graded in Discipline/Balanced, neutral accent in Mindful
  // (no color judgment), dim when the category has no data.
  const tierColor = (v: number) => (v >= 80 ? theme.statusGood : v >= 60 ? theme.statusWarn : theme.statusBad);
  const barColor = (v: number | null) => (v === null ? theme.textDim : isMindful ? theme.accentBlue : tierColor(v));
  const heroColor = isMindful ? theme.accentBlue : tierColor(score.composite);
  // Celebrate a strong day (no hype in Mindful): pulse at Great+, shine at Elite.
  // Gate on the rounded number the user actually sees, not the raw composite.
  const shownComposite = Math.round(score.composite);
  const celebrate: 'none' | 'pulse' | 'shine' = isMindful
    ? 'none'
    : shownComposite >= 95 ? 'shine' : shownComposite >= 85 ? 'pulse' : 'none';

  return (
    <Modal transparent animationType="none" visible statusBarTranslucent hardwareAccelerated onShow={animateIn} onRequestClose={dismiss}>
      <ToastRenderer />
      <Reanimated.View style={[StyleSheet.absoluteFill, { backgroundColor: theme.overlayBg }, overlayStyle]} pointerEvents="none" />
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }} pointerEvents="box-none">
        <Reanimated.View pointerEvents="auto" style={[{ width: '100%', maxWidth: 420 }, cardStyle]}>
          <View style={{
            backgroundColor: theme.bgSheet,
            borderRadius: 18,
            borderWidth: 0.5,
            borderTopWidth: 1.5,
            borderColor: theme.borderCard,
            borderTopColor: theme.accentBlueRaw,
            paddingHorizontal: 24,
            paddingTop: 12,
            paddingBottom: 22,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.3,
            shadowRadius: 16,
          }}>
            {/* Handle pill (tap to dismiss) */}
            <TouchableOpacity onPress={dismiss} hitSlop={{ top: 10, bottom: 10, left: 40, right: 40 }} style={{ alignItems: 'center', paddingBottom: 16 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.sheetHandle }} />
            </TouchableOpacity>

            {/* Info (i): explains the Day Score, reads from tooltipRegistry */}
            <View style={{ position: 'absolute', top: 14, right: 16, zIndex: 5 }}>
              <TooltipIcon tooltipKey="day_score" size={18} />
            </View>

            {/* YESTERDAY chip + date */}
            <Text style={{ fontSize: 9, letterSpacing: 3, color: theme.textMuted, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase', textAlign: 'center' }}>{chipLabel}</Text>
            <Text style={{ fontSize: 13, color: theme.textSecondary, fontFamily: 'DMSans_400Regular', textAlign: 'center', marginTop: 4 }}>{formatLongDate(dateKey)}</Text>

            {/* Hero composite ring + label + context line */}
            <View style={{ alignItems: 'center', marginTop: 12 }}>
              <ScoreRing value={score.composite} color={heroColor} theme={theme} celebrate={celebrate} />
              <Text style={{ fontSize: 20, letterSpacing: 2, fontFamily: 'BebasNeue_400Regular', color: heroColor, marginTop: 8 }}>
                {score.label.toUpperCase()}
              </Text>
              {!!contextLine && (
                <Text style={{ fontSize: 11, color: theme.textMuted, fontFamily: 'DMSans_400Regular', fontStyle: 'italic', marginTop: 4 }}>{contextLine}</Text>
              )}
            </View>

            {/* Category pills: icon + label, soft number, animated tier fill bar */}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 18 }}>
              {pills.map(p => (
                <View key={p.label} style={{ flex: 1, backgroundColor: theme.bgInset, borderRadius: 10, borderWidth: 0.5, borderColor: theme.borderCard, paddingVertical: 10, paddingHorizontal: 10, alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name={p.icon} size={10} color={theme.textMuted} />
                    <Text style={{ fontSize: 8, letterSpacing: 1.5, color: theme.textMuted, fontFamily: 'DMSans_700Bold' }}>{p.label}</Text>
                  </View>
                  <Text style={{ fontSize: 24, lineHeight: 28, fontFamily: 'BebasNeue_400Regular', color: p.val !== null ? theme.textSecondary : theme.textDim, marginTop: 2 }}>
                    {p.val !== null ? Math.round(p.val) : '--'}
                  </Text>
                  <View style={{ width: '100%', height: 5, borderRadius: 3, backgroundColor: barColor(p.val) + '33', marginTop: 6, overflow: 'hidden' }}>
                    <PillBar value={p.val} color={barColor(p.val)} progress={barProgress} />
                  </View>
                </View>
              ))}
            </View>

            {/* Win line (app coach voice: regular weight, italic, accent) */}
            {!!winLine && (
              <Text style={{ fontSize: 14, color: theme.accentBlue, fontFamily: 'DMSans_400Regular', fontStyle: 'italic', textAlign: 'center', marginTop: 18, lineHeight: 20 }}>{winLine}</Text>
            )}
            {/* Coach note (only when something lagged) */}
            {!!coachLine && (
              <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'DMSans_400Regular', fontStyle: 'italic', textAlign: 'center', marginTop: 8, lineHeight: 17 }}>{coachLine}</Text>
            )}

            {/* Divider */}
            <View style={{ height: 0.5, backgroundColor: theme.borderCard, marginTop: 20, marginBottom: 16 }} />

            {/* VIEW FULL SUMMARY */}
            <TouchableOpacity onPress={handleViewSummary} style={{ paddingVertical: 13, borderRadius: 10, alignItems: 'center', backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder }}>
              <Text style={{ color: theme.accentBlue, fontSize: 13, letterSpacing: 1, fontFamily: 'DMSans_600SemiBold' }}>VIEW FULL SUMMARY</Text>
            </TouchableOpacity>

            {/* GOT IT (the obvious labeled exit, secondary bordered button) */}
            <TouchableOpacity onPress={dismiss} style={{ paddingVertical: 13, borderRadius: 10, alignItems: 'center', marginTop: 8, backgroundColor: theme.bgInset, borderWidth: 0.5, borderColor: theme.borderCard }}>
              <Text style={{ color: theme.textSecondary, fontSize: 13, letterSpacing: 1, fontFamily: 'DMSans_600SemiBold' }}>GOT IT</Text>
            </TouchableOpacity>

            {/* Micro disclaimer */}
            <Text style={{ fontSize: 10, color: theme.textDim, fontFamily: 'DMSans_400Regular', textAlign: 'center', marginTop: 12 }}>
              For informational purposes only. Not medical advice.
            </Text>

            {/* Exclude this day (inline confirm) */}
            {confirmingExclude ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 12, flexWrap: 'wrap' }}>
                <Text style={{ fontSize: 11, color: theme.textMuted, fontFamily: 'DMSans_400Regular', textAlign: 'center' }}>Remove from your weekly average?</Text>
                <TouchableOpacity onPress={() => setConfirmingExclude(false)} hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}>
                  <Text style={{ fontSize: 12, color: theme.textSecondary, fontFamily: 'DMSans_600SemiBold' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleExclude} hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}>
                  <Text style={{ fontSize: 12, color: theme.statusBad, fontFamily: 'DMSans_600SemiBold' }}>Exclude</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={() => setConfirmingExclude(true)} hitSlop={{ top: 10, bottom: 10, left: 20, right: 20 }} style={{ alignItems: 'center', marginTop: 12 }}>
                <Text style={{ fontSize: 11, color: theme.textDim, fontFamily: 'DMSans_400Regular', textDecorationLine: 'underline' }}>Exclude this day</Text>
              </TouchableOpacity>
            )}
          </View>
        </Reanimated.View>
      </View>
    </Modal>
  );
}
