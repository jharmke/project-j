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
import { triggerHaptic } from '@/utils/haptics';
import TooltipIcon from './TooltipIcon';
import { CardWash } from './GradientCard';
import { ToastRenderer, useToast } from './Toast';
import { DayScore, scoreLabel } from '../utils/dayScore';
import { excludeDayFromAverages } from '../utils/dayScoreStore';
import { winAndCoachLines, contextLine as computeContextLine, hadFaithEntryOn } from '../utils/daySummaryCopy';

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
  onViewSummary?: () => void; // morning pop-up: navigate to the archive. Omit in
                              // the archive itself (the button is then hidden).
  hideExclude?: boolean;      // pass true when opening from Weekly/Monthly summary (frozen snapshot)
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function formatLongDate(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return `${DAYS[dt.getDay()]}, ${MONTHS[dt.getMonth()]} ${dt.getDate()}`;
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
export function ScoreRing({ value, color, theme, celebrate }: { value: number; color: string; theme: any; celebrate: 'none' | 'pulse' | 'shine' }) {
  const size = 152, stroke = 10, radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const arc = useSharedValue(0);
  const t = useSharedValue(0);   // shared clock (0 to 1) drives the pulse swell

  // Pulse phase as a fraction of the loop; the rest of the cycle sits at rest.
  const PULSE_END = 0.21;

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

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={theme.bgInput} strokeWidth={stroke} fill="none" />
        <AnimCircle cx={size / 2} cy={size / 2} r={radius} stroke={color} strokeWidth={stroke} fill="none"
          animatedProps={arcProps} strokeLinecap="round" rotation="-90" origin={`${size / 2},${size / 2}`} />
      </Svg>
      <Reanimated.View style={[{ alignItems: 'center' }, pulseStyle]}>
        <View style={{ shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 0 }}>
          <Text style={{ fontSize: 54, lineHeight: 58, fontFamily: 'BebasNeue_400Regular', color, opacity: 0.92 }}>
            {Math.round(value)}
          </Text>
        </View>
        <Text style={{ fontSize: 8, letterSpacing: 2, fontFamily: 'DMSans_700Bold', color, opacity: 0.55, marginTop: -2 }}>OUT OF 100</Text>
      </Reanimated.View>
    </View>
  );
}

export default function DaySummaryModal({ score, dateKey, theme, styleMode, faithJourney, onClose, onViewSummary, hideExclude }: Props) {
  const { showToast } = useToast();
  const [hadFaith, setHadFaith] = useState(false);
  const [confirmingExclude, setConfirmingExclude] = useState(false);
  const [contextLine, setContextLine] = useState('');

  const overlay = useSharedValue(0);
  const cardScale = useSharedValue(0.92);
  const barProgress = useSharedValue(0);
  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlay.value }));
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: cardScale.value }] }));

  useEffect(() => {
    if (faithJourney === 'rooted') hadFaithEntryOn(dateKey).then(setHadFaith);
  }, [dateKey, faithJourney]);

  // Context line under the hero (shared util; Mindful stays comparison-free).
  useEffect(() => {
    let alive = true;
    computeContextLine(dateKey, score.composite, styleMode === 'mindful').then(line => {
      if (alive) setContextLine(line);
    });
    return () => { alive = false; };
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
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    overlay.value = withTiming(0, { duration: 140 });
    cardScale.value = withTiming(0.92, { duration: 140 }, (finished) => {
      if (finished) runOnJS(onClose)();
    });
  };

  const handleExclude = async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
    await excludeDayFromAverages(dateKey);
    showToast('Day excluded', 'Removed from your weekly average', 'success');
    dismiss();
  };

  const handleViewSummary = () => {
    if (!onViewSummary) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    onViewSummary();
  };

  const isMindful = styleMode === 'mindful';
  const { winLine, coachLine } = winAndCoachLines(score, isMindful, faithJourney === 'rooted' && hadFaith);

  const pills: { label: string; val: number | null; icon: keyof typeof Ionicons.glyphMap }[] = [
    { label: 'NUTRITION', val: score.nutritionScore, icon: 'restaurant' },
    { label: 'RECOVERY', val: score.recoveryCategoryScore ?? score.sleepScore, icon: 'heart' },
    { label: 'ACTIVITY', val: score.activityScore, icon: 'barbell' },
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
            borderColor: theme.borderCard,
            borderTopColor: theme.borderCardTop,
            paddingHorizontal: 24,
            paddingTop: 12,
            paddingBottom: 22,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.3,
            shadowRadius: 16,
          }}>
            <CardWash color={heroColor} scored radius={18} />
            {/* Handle pill (tap to dismiss) */}
            <TouchableOpacity onPress={dismiss} hitSlop={{ top: 10, bottom: 10, left: 40, right: 40 }} style={{ alignItems: 'center', paddingBottom: 14 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.sheetHandle }} />
            </TouchableOpacity>

            {/* Header row: title + inline (i), matching every other surface in the app */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <Text style={{ fontSize: 18, letterSpacing: 2, fontFamily: 'BebasNeue_400Regular', color: theme.accentBlue }}>DAY SUMMARY</Text>
              {/* Bebas sits high in its line box; lift the (i) to the caps' optical center */}
              <View style={{ transform: [{ translateY: -2 }] }}>
                <TooltipIcon tooltipKey="day_score" hideTour />
              </View>
            </View>

            {/* Date (lead-in to the centered hero) */}
            <Text style={{ fontSize: 13, color: theme.textSecondary, fontFamily: 'DMSans_400Regular', textAlign: 'center', marginTop: 2 }}>{formatLongDate(dateKey)}</Text>

            {/* Hero composite ring + label + context line */}
            <View style={{ alignItems: 'center', marginTop: 12 }}>
              <ScoreRing value={score.composite} color={heroColor} theme={theme} celebrate={celebrate} />
              <Text style={{ fontSize: 20, letterSpacing: 2, fontFamily: 'BebasNeue_400Regular', color: heroColor, marginTop: 8 }}>
                {scoreLabel(Math.round(score.composite), styleMode).toUpperCase()}
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

            {/* FULL BREAKDOWN (morning pop-up only; hidden when already in the archive) */}
            {onViewSummary && (
              <TouchableOpacity onPress={handleViewSummary} style={{ paddingVertical: 13, borderRadius: 10, alignItems: 'center', backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder }}>
                <Text style={{ color: theme.accentBlue, fontSize: 13, letterSpacing: 1, fontFamily: 'DMSans_600SemiBold' }}>FULL BREAKDOWN</Text>
              </TouchableOpacity>
            )}

            {/* GOT IT (the obvious labeled exit, secondary bordered button) */}
            <TouchableOpacity onPress={dismiss} style={{ paddingVertical: 13, borderRadius: 10, alignItems: 'center', marginTop: 8, backgroundColor: theme.bgInset, borderWidth: 0.5, borderColor: theme.borderCard }}>
              <Text style={{ color: theme.textSecondary, fontSize: 13, letterSpacing: 1, fontFamily: 'DMSans_600SemiBold' }}>GOT IT</Text>
            </TouchableOpacity>

            {/* Micro disclaimer */}
            <Text style={{ fontSize: 10, color: theme.textDim, fontFamily: 'DMSans_400Regular', textAlign: 'center', marginTop: 12 }}>
              For informational purposes only. Not medical advice.
            </Text>

            {/* Exclude this day (inline confirm) -- hidden when opened from a frozen snapshot (Weekly/Monthly) */}
            {!hideExclude && confirmingExclude ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 12, flexWrap: 'wrap' }}>
                <Text style={{ fontSize: 11, color: theme.textMuted, fontFamily: 'DMSans_400Regular', textAlign: 'center' }}>Remove from your weekly average?</Text>
                <TouchableOpacity onPress={() => setConfirmingExclude(false)} hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}>
                  <Text style={{ fontSize: 12, color: theme.textSecondary, fontFamily: 'DMSans_600SemiBold' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleExclude} hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}>
                  <Text style={{ fontSize: 12, color: theme.statusBad, fontFamily: 'DMSans_600SemiBold' }}>Exclude</Text>
                </TouchableOpacity>
              </View>
            ) : !hideExclude ? (
              <TouchableOpacity onPress={() => setConfirmingExclude(true)} hitSlop={{ top: 10, bottom: 10, left: 20, right: 20 }} style={{ alignItems: 'center', marginTop: 12 }}>
                <Text style={{ fontSize: 11, color: theme.textDim, fontFamily: 'DMSans_400Regular', textDecorationLine: 'underline' }}>Exclude this day</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </Reanimated.View>
      </View>
    </Modal>
  );
}
