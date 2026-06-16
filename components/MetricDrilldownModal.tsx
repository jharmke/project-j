// components/MetricDrilldownModal.tsx
// Focused drill-down for a single Sleep/Recovery metric. Tap a metric row to see
// what it is, how it is calculated, what it affects, where you stand, and smart
// (state-selected) tips on how to improve it. Centered modal, mirrors the
// NutrientDrilldownModal pattern. SPEC_sleep.md Section 13.

import { useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Animated, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient as SvgLinearGradient, Path, Polyline, Stop, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../theme';
import { triggerHaptic } from '../utils/haptics';

export interface MetricDrilldownData {
  title: string;
  value: string;
  statusWord: string | null;
  statusColor: string;
  reference: string | null;
  definition: string;
  calculation: string;
  affects: string;
  tips: string[];
  informationalOnly?: boolean;
  disclaimer?: string;
  // Slice 2: per-metric history series (one point per day/night) for the mini trend
  // graph, following the universal 7D/30D range. chartColor overrides the status
  // color (Mindful neutralizes to accent).
  history?: { dateKey: string; value: number; label: string }[];
  rangeDays?: number;   // total nights in the selected range, for the "X of Y" caption
  chartColor?: string;
  // Optional y-axis tick formatter (e.g. clock time for bedtime, hours for sleep
  // balance). Defaults to a plain numeric format.
  chartValueFormat?: (v: number) => string;
}

function fmtDay(dateKey: string): string {
  const parts = dateKey.split('-').map(Number);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[(parts[1] || 1) - 1]} ${parts[2]}`;
}

// Round-number y-axis ticks. Mirrors the hub's niceYTicks but drops the 2.5 step so
// whole-number metrics (bpm, score, kcal) get whole-number axes instead of decimals.
function niceYTicks(minVal: number, maxVal: number, targetCount = 3): number[] {
  const range = (maxVal - minVal) || 1;
  const roughStep = range / (targetCount - 1);
  const pow = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const niceStep = [1, 2, 5, 10].reduce((best, s) => {
    const step = s * pow;
    return Math.abs(step - roughStep) < Math.abs(best - roughStep) ? step : best;
  }, Infinity);
  const start = Math.floor(minVal / niceStep) * niceStep;
  const ticks: number[] = [];
  let t = start;
  while (t <= maxVal + niceStep * 0.1 && ticks.length <= targetCount + 2) {
    ticks.push(Math.round(t * 10000) / 10000);
    t += niceStep;
  }
  if (ticks.length > 0 && ticks[ticks.length - 1] < maxVal) {
    ticks.push(Math.round((ticks[ticks.length - 1] + niceStep) * 10000) / 10000);
  }
  return ticks;
}

// Compact single-metric trend chart for the drill-down. Auto-scaled y-axis, area
// fill + line + dots (selected/latest emphasized), tap a point to read its value
// in the header line. Mirrors the hub trend charts; width measured via onLayout
// since the modal width is dynamic.
function MiniMetricChart({ points, color, theme, formatTick }: { points: { dateKey: string; value: number; label: string }[]; color: string; theme: any; formatTick?: (v: number) => string }) {
  const [w, setW] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  const n = points.length;
  const H = 116, PAD_R = 10, PAD_T = 10, PAD_B = 20;
  const vals = points.map(p => p.value);
  let dmin = Math.min(...vals), dmax = Math.max(...vals);
  if (dmin === dmax) { dmin -= 1; dmax += 1; }
  const ticks = niceYTicks(dmin, dmax, 3);
  const tickMin = ticks[0];
  const tickMax = ticks[ticks.length - 1] || tickMin + 1;
  const span = (tickMax - tickMin) || 1;
  const fmtTick = formatTick ?? ((v: number) => Number.isInteger(v) ? `${v}` : v.toFixed(1));
  // Left gutter sizes to the widest y-axis label so wide ticks (clock time like
  // "9:40 PM", hours) don't clip past the left edge. Numeric metrics keep ~32.
  const maxTickChars = Math.max(...ticks.map(t => fmtTick(t).length));
  const PAD_L = Math.max(32, Math.ceil(maxTickChars * 4.3) + 6);
  const plotW = Math.max(1, w - PAD_L - PAD_R);
  const plotH = H - PAD_T - PAD_B;
  const toX = (i: number) => PAD_L + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const toY = (v: number) => PAD_T + (1 - (Math.max(tickMin, Math.min(tickMax, v)) - tickMin) / span) * plotH;
  const linePts = points.map((p, i) => `${toX(i)},${toY(p.value)}`).join(' ');
  const areaPath = `M ${toX(0)},${toY(vals[0])} ` + vals.slice(1).map((v, i) => `L ${toX(i + 1)},${toY(v)}`).join(' ') + ` L ${toX(n - 1)},${PAD_T + plotH} L ${toX(0)},${PAD_T + plotH} Z`;
  const selIdx = sel ?? n - 1;
  const selP = points[selIdx];
  const midIdx = Math.floor(n / 2);
  return (
    <View onLayout={e => setW(e.nativeEvent.layout.width)}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <Text style={{ fontSize: 9, letterSpacing: 2.5, textTransform: 'uppercase', color: theme.textMuted, fontFamily: 'DMSans_700Bold' }}>Trend</Text>
        {selP && (
          <Text style={{ fontSize: 11, color: theme.textSecondary, fontFamily: 'DMSans_500Medium' }}>
            {fmtDay(selP.dateKey)} · <Text style={{ color, fontFamily: 'DMSans_700Bold' }}>{selP.label}</Text>
          </Text>
        )}
      </View>
      {w > 0 && (
        <Svg width={w} height={H}>
          <Defs>
            <SvgLinearGradient id="miniFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity={0.18} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </SvgLinearGradient>
          </Defs>
          {ticks.map((t, i) => (
            <Line key={`g${i}`} x1={PAD_L} y1={toY(t)} x2={PAD_L + plotW} y2={toY(t)} stroke={theme.borderSubtle} strokeWidth={1} />
          ))}
          {ticks.map((t, i) => (
            <SvgText key={`tx${i}`} x={PAD_L - 5} y={toY(t) + 3} fill={theme.textDim} fontSize={8} fontFamily="DMSans_500Medium" textAnchor="end">{fmtTick(t)}</SvgText>
          ))}
          <Path d={areaPath} fill="url(#miniFill)" />
          <Polyline points={linePts} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
          {points.map((p, i) => <Circle key={`d${i}`} cx={toX(i)} cy={toY(p.value)} r={i === selIdx ? 4.5 : 3} fill={color} opacity={i === selIdx ? 1 : 0.6} />)}
          <SvgText x={PAD_L} y={H - 4} fill={theme.textDim} fontSize={8} fontFamily="DMSans_500Medium">{fmtDay(points[0].dateKey)}</SvgText>
          {n > 3 && <SvgText x={toX(midIdx)} y={H - 4} fill={theme.textDim} fontSize={8} fontFamily="DMSans_500Medium" textAnchor="middle">{fmtDay(points[midIdx].dateKey)}</SvgText>}
          <SvgText x={PAD_L + plotW} y={H - 4} fill={theme.textDim} fontSize={8} fontFamily="DMSans_500Medium" textAnchor="end">{fmtDay(points[n - 1].dateKey)}</SvgText>
          {points.map((p, i) => <Circle key={`h${i}`} cx={toX(i)} cy={toY(p.value)} r={14} fill="transparent" onPress={() => setSel(prev => prev === i ? null : i)} />)}
        </Svg>
      )}
    </View>
  );
}

interface Props {
  visible: boolean;
  onClose: () => void;
  data: MetricDrilldownData | null;
}

export default function MetricDrilldownModal({ visible, onClose, data }: Props) {
  const { theme } = useTheme();
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const open = () => {
    scaleAnim.setValue(0.92);
    opacityAnim.setValue(0);
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, damping: 22, stiffness: 300 }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  };

  const close = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, { toValue: 0.94, duration: 160, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 140, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  const closeWithHaptic = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    close();
  };

  const sectionLabel = {
    fontSize: 9, letterSpacing: 2.5, textTransform: 'uppercase' as const,
    color: theme.textMuted, fontFamily: 'DMSans_700Bold', marginBottom: 6,
  };
  const bodyText = {
    fontSize: 13.5, lineHeight: 20, color: theme.textSecondary, fontFamily: 'DMSans_400Regular',
  };

  // Boxes take a light tint + left accent of the metric's own status color, so the
  // whole drill-down reads in the same color code as the data point (amber/green/red).
  const Section = ({ label, body, accent }: { label: string; body: string; accent: string }) => (
    <View style={{ backgroundColor: accent + '14', borderRadius: 12, borderWidth: 0.5, borderColor: theme.borderSubtle, borderLeftWidth: 3, borderLeftColor: accent, padding: 14, marginBottom: 10 }}>
      <Text style={sectionLabel}>{label}</Text>
      <Text style={bodyText}>{body}</Text>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="none" onShow={open} onRequestClose={closeWithHaptic}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Animated.View
          style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.55)', opacity: opacityAnim }]}
          pointerEvents="none"
        />
        <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={closeWithHaptic} />

        <Animated.View style={{
          width: '88%',
          maxHeight: '82%',
          backgroundColor: theme.bgSheet,
          borderRadius: 20,
          borderWidth: 0.5,
          borderColor: theme.borderCard,
          borderTopWidth: 4,
          borderTopColor: data?.statusColor ?? theme.borderCard,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.45,
          shadowRadius: 28,
          elevation: 24,
          overflow: 'hidden',
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
        }}>
          {/* Handle */}
          <TouchableOpacity
            onPress={closeWithHaptic}
            style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 6 }}
            hitSlop={{ top: 12, bottom: 12, left: 60, right: 60 }}
          >
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.borderCard }} />
          </TouchableOpacity>

          {/* Header */}
          {data && (
            <View style={{ paddingHorizontal: 20, paddingBottom: 14, paddingTop: 4, borderBottomWidth: 0.5, borderBottomColor: theme.borderCard }}>
              <Text style={sectionLabel}>{data.title}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
                <Text style={{ fontSize: 30, color: data.statusColor, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1 }}>
                  {data.value}
                </Text>
                {data.statusWord && (
                  <Text style={{ fontSize: 13, color: data.statusColor, fontFamily: 'DMSans_700Bold' }}>
                    {data.statusWord}
                  </Text>
                )}
              </View>
              {data.reference && (
                <Text style={{ fontSize: 11, color: theme.textDim, fontFamily: 'DMSans_400Regular', marginTop: 3 }}>
                  {data.reference}
                </Text>
              )}
            </View>
          )}

          {/* Body */}
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 26 }} showsVerticalScrollIndicator={false}>
            {data && (
              <>
                {data.history && data.history.length >= 2 ? (
                  <View style={{ marginBottom: 12 }}>
                    <MiniMetricChart points={data.history} color={data.chartColor ?? data.statusColor} theme={theme} formatTick={data.chartValueFormat} />
                    {data.rangeDays && data.rangeDays > data.history.length && (
                      <Text style={{ fontSize: 10, color: theme.textMuted, fontFamily: 'DMSans_400Regular', textAlign: 'center', marginTop: 6 }}>
                        {data.history.length} of {data.rangeDays} nights tracked · {data.rangeDays - data.history.length} without data
                      </Text>
                    )}
                  </View>
                ) : data.history ? (
                  <View style={{ marginBottom: 12, paddingVertical: 14, alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'DMSans_400Regular', textAlign: 'center' }}>
                      Trend builds over time as more days are recorded.
                    </Text>
                  </View>
                ) : null}

                <Section label="What it is" body={data.definition} accent={data.statusColor} />
                <Section label="How it's calculated" body={data.calculation} accent={data.statusColor} />
                <Section label="What it affects" body={data.affects} accent={data.statusColor} />

                {!data.informationalOnly && data.tips.length > 0 && (
                  <View style={{ backgroundColor: theme.accentBlueBg, borderRadius: 12, borderWidth: 1, borderColor: theme.accentBlueBorder, padding: 14, marginBottom: 10 }}>
                    <Text style={[sectionLabel, { color: theme.accentBlueRaw }]}>How to improve</Text>
                    {data.tips.map((tip, i) => (
                      <View key={i} style={{ flexDirection: 'row', gap: 9, marginBottom: i < data.tips.length - 1 ? 10 : 0 }}>
                        <Ionicons name="bulb" size={14} color={theme.accentBlueRaw} style={{ marginTop: 2 }} />
                        <Text style={[bodyText, { flex: 1 }]}>{tip}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <Text style={{ fontSize: 10.5, lineHeight: 16, color: theme.textDim, fontFamily: 'DMSans_400Regular', marginTop: 4 }}>
                  {data.disclaimer ?? 'For informational purposes only. Not medical advice.'}
                </Text>
              </>
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}
