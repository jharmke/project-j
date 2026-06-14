// components/SummaryReadyModal.tsx
// The Weekly / Monthly "summary ready" pop-up. Mirrors DaySummaryModal's centered
// card (accent top border, handle pill, scale-in + overlay fade, no X, no
// tap-outside dismiss) but shows the period's AVERAGE Day Score, not a single day.
// Deliberately compact: score ring + three category averages + a one-line context,
// then FULL BREAKDOWN (-> the dedicated /weekly-summary or /monthly-summary screen)
// and GOT IT. No exclude action (these are frozen aggregates).
//
// Precedence (which tier fires on open) is decided in index.tsx, not here.
// Reuses the exported ScoreRing from DaySummaryModal so the Day modal is untouched.

import React, { useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Reanimated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, runOnJS, Easing, SharedValue } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import TooltipIcon from './TooltipIcon';
import { scoreLabel } from '../utils/dayScore';
import { periodSummaryLines } from '../utils/daySummaryCopy';
import { ScoreRing } from './DaySummaryModal';

type StyleMode = 'discipline' | 'balanced' | 'mindful';
type Tier = 'week' | 'month';

interface Props {
  tier: Tier;
  avgComposite: number | null;
  avgNutritionScore: number | null;
  avgActivityScore: number | null;
  avgSleepScore: number | null;
  daysScored: number;
  totalDays: number;          // 7 for a week, days-in-month for a month
  rangeStart: string;         // YYYY-MM-DD
  rangeEnd: string;           // YYYY-MM-DD
  theme: any;
  styleMode: StyleMode;
  onClose: () => void;        // clears the parent's pop-up state
  onViewBreakdown: () => void; // navigate to the dedicated full-summary screen
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// "Jun 1 to Jun 7" for a week; "June 2026" for a month.
function formatRange(tier: Tier, start: string, end: string): string {
  const [sy, sm, sd] = start.split('-').map(Number);
  if (tier === 'month') return `${MONTHS[sm - 1]} ${sy}`;
  const [, em, ed] = end.split('-').map(Number);
  return `${MONTHS_SHORT[sm - 1]} ${sd} to ${MONTHS_SHORT[em - 1]} ${ed}`;
}

// Thin per-category fill bar; animates up from zero on open (shared progress).
function PillBar({ value, color, progress }: { value: number | null; color: string; progress: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({ width: `${(value || 0) * progress.value}%` as any }));
  if (value === null) return null;
  return <Reanimated.View style={[{ height: '100%', borderRadius: 2, backgroundColor: color }, style]} />;
}

export default function SummaryReadyModal({
  tier, avgComposite, avgNutritionScore, avgActivityScore, avgSleepScore,
  daysScored, totalDays, rangeStart, rangeEnd, theme, styleMode, onClose, onViewBreakdown,
}: Props) {
  const overlay = useSharedValue(0);
  const cardScale = useSharedValue(0.92);
  const barProgress = useSharedValue(0);
  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlay.value }));
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: cardScale.value }] }));

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

  const handleViewBreakdown = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    onViewBreakdown();
  };

  const isMindful = styleMode === 'mindful';
  const title = tier === 'week' ? 'WEEKLY SUMMARY' : 'MONTHLY SUMMARY';
  const composite = avgComposite ?? 0;

  // Same coloring rules as the Day modal: tier-graded in Discipline/Balanced,
  // neutral accent in Mindful, dim when a category has no data.
  const tierColor = (v: number) => (v >= 80 ? theme.statusGood : v >= 60 ? theme.statusWarn : theme.statusBad);
  const barColor = (v: number | null) => (v === null ? theme.textDim : isMindful ? theme.accentBlue : tierColor(v));
  const heroColor = isMindful ? theme.accentBlue : tierColor(composite);
  const shownComposite = Math.round(composite);
  const celebrate: 'none' | 'pulse' | 'shine' = isMindful
    ? 'none'
    : shownComposite >= 95 ? 'shine' : shownComposite >= 85 ? 'pulse' : 'none';

  const contextLine = `${daysScored} of ${totalDays} days logged`;

  // Encouraging line + optional coach note, period-aware and varied by period.
  const { winLine, coachLine } = periodSummaryLines(
    tier, composite, avgNutritionScore, avgActivityScore, avgSleepScore, isMindful, rangeStart,
  );

  const pills: { label: string; val: number | null; icon: keyof typeof Ionicons.glyphMap }[] = [
    { label: 'NUTRITION', val: avgNutritionScore, icon: 'restaurant' },
    { label: 'ACTIVITY', val: avgActivityScore, icon: 'barbell' },
    { label: 'RECOVERY', val: avgSleepScore, icon: 'heart' },
  ];

  return (
    <Modal transparent animationType="none" visible statusBarTranslucent hardwareAccelerated onShow={animateIn} onRequestClose={dismiss}>
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
            <TouchableOpacity onPress={dismiss} hitSlop={{ top: 10, bottom: 10, left: 40, right: 40 }} style={{ alignItems: 'center', paddingBottom: 14 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.sheetHandle }} />
            </TouchableOpacity>

            {/* Header row: title + inline (i) */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <Text style={{ fontSize: 18, letterSpacing: 2, fontFamily: 'BebasNeue_400Regular', color: theme.accentBlue }}>{title}</Text>
              <View style={{ transform: [{ translateY: -2 }] }}>
                <TooltipIcon tooltipKey="day_score" hideTour />
              </View>
            </View>

            {/* Date range (lead-in to the centered hero) */}
            <Text style={{ fontSize: 13, color: theme.textSecondary, fontFamily: 'DMSans_400Regular', textAlign: 'center', marginTop: 2 }}>{formatRange(tier, rangeStart, rangeEnd)}</Text>

            {/* Hero composite ring + label + context line */}
            <View style={{ alignItems: 'center', marginTop: 12 }}>
              <ScoreRing value={composite} color={heroColor} theme={theme} celebrate={celebrate} />
              <Text style={{ fontSize: 20, letterSpacing: 2, fontFamily: 'BebasNeue_400Regular', color: heroColor, marginTop: 8 }}>
                {scoreLabel(shownComposite, styleMode).toUpperCase()}
              </Text>
              <Text style={{ fontSize: 11, color: theme.textMuted, fontFamily: 'DMSans_400Regular', fontStyle: 'italic', marginTop: 4 }}>{contextLine}</Text>
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

            {/* Encouraging line (period-aware, app coach voice) */}
            {!!winLine && (
              <Text style={{ fontSize: 14, color: theme.accentBlue, fontFamily: 'DMSans_400Regular', fontStyle: 'italic', textAlign: 'center', marginTop: 18, lineHeight: 20 }}>{winLine}</Text>
            )}
            {/* Coach note (only when a category lagged) */}
            {!!coachLine && (
              <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'DMSans_400Regular', fontStyle: 'italic', textAlign: 'center', marginTop: 8, lineHeight: 17 }}>{coachLine}</Text>
            )}

            {/* Divider */}
            <View style={{ height: 0.5, backgroundColor: theme.borderCard, marginTop: 20, marginBottom: 16 }} />

            {/* FULL BREAKDOWN -> dedicated full-summary screen */}
            <TouchableOpacity onPress={handleViewBreakdown} style={{ paddingVertical: 13, borderRadius: 10, alignItems: 'center', backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder }}>
              <Text style={{ color: theme.accentBlue, fontSize: 13, letterSpacing: 1, fontFamily: 'DMSans_600SemiBold' }}>FULL BREAKDOWN</Text>
            </TouchableOpacity>

            {/* GOT IT (labeled secondary exit) */}
            <TouchableOpacity onPress={dismiss} style={{ paddingVertical: 13, borderRadius: 10, alignItems: 'center', marginTop: 8, backgroundColor: theme.bgInset, borderWidth: 0.5, borderColor: theme.borderCard }}>
              <Text style={{ color: theme.textSecondary, fontSize: 13, letterSpacing: 1, fontFamily: 'DMSans_600SemiBold' }}>GOT IT</Text>
            </TouchableOpacity>

            {/* Micro disclaimer */}
            <Text style={{ fontSize: 10, color: theme.textDim, fontFamily: 'DMSans_400Regular', textAlign: 'center', marginTop: 12 }}>
              For informational purposes only. Not medical advice.
            </Text>
          </View>
        </Reanimated.View>
      </View>
    </Modal>
  );
}
