// app/sleep.tsx
// Sleep Hub: two-tab destination screen (Sleep / Recovery). Owns all sleep and
// recovery data the way the Log tab owns food. Reached from the home sleep card.
// Full design in SPEC_sleep.md (Decisions Log #11).
//
// BUILD STATUS: Slice 1 -- scaffold + two-tab pill selector + Sleep Score hero
// (last night). Trend graph, stage history, metrics panel, coach tip, and the
// exclude toggle land in later slices. Recovery tab is a placeholder for now.

import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, PanResponder, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import ReAnimated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, G, Line, LinearGradient as SvgLinearGradient, Path, Polyline, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ToggleSwitch from '../components/ToggleSwitch';
import TooltipIcon from '../components/TooltipIcon';
import { triggerHaptic } from '../utils/haptics';
import { storageSet } from '../utils/storage';
import { calcSleepScore } from '../utils/sleepScore';
import { calcRecoveryScore, RecoveryComponent, RecoveryResult } from '../utils/recoveryScore';
import MetricDrilldownModal, { MetricDrilldownData } from '../components/MetricDrilldownModal';
import { METRIC_DRILLDOWNS } from '../data/metricDrilldowns';
import { useHealthKit } from '../useHealthKit';
import { useTheme } from '../theme';
import { refreshCoachTipSleep, resolveTipBody } from '../utils/coachAI';
import { loadCoachTipCacheSleep, CoachTipCache } from '../utils/smartTipsEngine';

type SleepTab = 'sleep' | 'recovery';

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const fmtMs = (ms: number) => {
  const h = Math.floor(ms / 3600000);
  const m = Math.round((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

type SleepNight = {
  dateKey: string; coreMs: number; deepMs: number; remMs: number; awakeMs: number;
  totalMs: number; bed: string | null; wake: string | null; awakeCount: number; bedMin: number | null;
};

// ─── Chart layout (matches the StatsGraphCard pattern: y-axis ticks, x-axis
// dates, tap-a-point callout pill) ───────────────────────────────────────────
const CHART_W = Dimensions.get('window').width - 24 - 32; // screen minus card margins (24) and padding (32)
const CHART_H = 150;
const C_TOP = 12, C_BOTTOM = 18, C_LEFT = 28, C_RIGHT = 8;
const PLOT_W = CHART_W - C_LEFT - C_RIGHT;
const PLOT_H = CHART_H - C_TOP - C_BOTTOM;

type Callout = { x: number; y: number; label1: string; label2: string } | null;

const fmtDay = (dateKey: string) => {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString([], { month: 'short', day: 'numeric' });
};

function useSlideIn(dep: string) {
  const t = useSharedValue(0);
  useEffect(() => { t.value = 0; t.value = withTiming(1, { duration: 600 }); }, [dep]);
  return useAnimatedStyle(() => ({ opacity: t.value, transform: [{ translateY: (1 - t.value) * 12 }] }));
}

function CalloutPill({ callout, theme, clear }: { callout: NonNullable<Callout>; theme: any; clear: () => void }) {
  const w = Math.max(callout.label1.length, callout.label2.length) * 6 + 16;
  const h = 32;
  const x = Math.min(Math.max(callout.x - w / 2, C_LEFT), CHART_W - C_RIGHT - w);
  const y = Math.max(0, callout.y - h - 8);
  return (
    <>
      <Rect x={x} y={y} width={w} height={h} fill={theme.bgCard} stroke={theme.borderCard} strokeWidth={0.5} rx={6} onPress={clear} />
      <SvgText x={x + w / 2} y={y + 12} fill={theme.textDim} fontSize={8} fontFamily="DMSans_500Medium" textAnchor="middle">{callout.label1}</SvgText>
      <SvgText x={x + w / 2} y={y + 26} fill={theme.textPrimary} fontSize={10} fontFamily="DMSans_700Bold" textAnchor="middle">{callout.label2}</SvgText>
    </>
  );
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// Nice-number y-axis ticks (mirrors the Stats graph-creator niceYTicks). Lets a
// chart auto-scale to its data's min/max instead of a fixed 0-100, so the line
// fills the card and the variation is actually readable.
function niceYTicks(minVal: number, maxVal: number, targetCount = 4): number[] {
  const range = (maxVal - minVal) || 1;
  const roughStep = range / (targetCount - 1);
  const pow = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const niceSteps = [1, 2, 2.5, 5, 10];
  const niceStep = niceSteps.reduce((best, s) => {
    const step = s * pow;
    return Math.abs(step - roughStep) < Math.abs(best - roughStep) ? step : best;
  }, Infinity);
  const start = Math.floor(minVal / niceStep) * niceStep;
  const ticks: number[] = [];
  let t = start;
  while (t <= maxVal + niceStep * 0.1 && ticks.length <= targetCount + 1) {
    ticks.push(Math.round(t * 10000) / 10000);
    t += niceStep;
  }
  if (ticks.length > 0 && ticks[ticks.length - 1] < maxVal) {
    ticks.push(Math.round((ticks[ticks.length - 1] + niceStep) * 10000) / 10000);
  }
  return ticks;
}

// Minutes-of-day (possibly >1440 from the after-midnight shift) -> "9:33 PM".
const fmtBedMin = (min: number) => {
  const mm = ((Math.round(min) % 1440) + 1440) % 1440;
  const d = new Date();
  d.setHours(Math.floor(mm / 60), mm % 60, 0, 0);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

// Sleep Score trend line: y-axis auto-scales to the data min/max, x-axis dates,
// tap a point for that night.
function ScoreTrendChart({ nights, scores, theme }: { nights: SleepNight[]; scores: number[]; theme: any }) {
  const [callout, setCallout] = useState<Callout>(null);
  const slide = useSlideIn(`${scores.length}:${nights[0]?.dateKey ?? ''}`);
  const n = scores.length;
  if (n === 0) return null;
  // Auto-scale the y-axis to the data (like the Stats graph creator) so the line
  // fills the card instead of hugging the floor of a fixed 0-100 axis.
  const dataMin = Math.min(...scores);
  const dataMax = Math.max(...scores);
  const ticks = niceYTicks(dataMin, dataMax, 4);
  const tickMin = ticks[0];
  const tickMax = ticks[ticks.length - 1] || tickMin + 1;
  const span = (tickMax - tickMin) || 1;
  const toX = (i: number) => C_LEFT + (n === 1 ? PLOT_W / 2 : (i / (n - 1)) * PLOT_W);
  const toY = (v: number) => C_TOP + (1 - (clamp(v, tickMin, tickMax) - tickMin) / span) * PLOT_H;
  const pts = scores.map((s, i) => `${toX(i)},${toY(s)}`).join(' ');
  const midIdx = Math.floor(n / 2);
  // App line-graph standard: neutral high-contrast line + score-tier-colored dots
  // (sleep bands: >=85 green / >=70 amber / else red) + neutral gradient fade.
  const lineColor = theme.textPrimary;
  const baseY = C_TOP + PLOT_H;
  const areaPath = `M ${toX(0)},${toY(scores[0])} ` + scores.slice(1).map((s, i) => `L ${toX(i + 1)},${toY(s)}`).join(' ') + ` L ${toX(n - 1)},${baseY} L ${toX(0)},${baseY} Z`;
  const dotColor = (s: number) => s >= 85 ? theme.statusGood : s >= 70 ? theme.statusWarn : theme.statusBad;
  return (
    <ReAnimated.View style={slide}>
      <Svg width={CHART_W} height={CHART_H}>
        <Defs>
          <SvgLinearGradient id="sleepTrendFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={lineColor} stopOpacity={0.2} />
            <Stop offset="1" stopColor={lineColor} stopOpacity={0} />
          </SvgLinearGradient>
        </Defs>
        <Rect x={0} y={0} width={CHART_W} height={CHART_H} fill="transparent" onPress={() => setCallout(null)} />
        {ticks.map(t => (
          <Line key={`g${t}`} x1={C_LEFT} y1={toY(t)} x2={C_LEFT + PLOT_W} y2={toY(t)} stroke={theme.borderSubtle} strokeWidth={1} />
        ))}
        {ticks.map(t => (
          <SvgText key={`y${t}`} x={C_LEFT - 5} y={toY(t) + 3} fill={theme.textDim} fontSize={8} fontFamily="DMSans_500Medium" textAnchor="end">{t}</SvgText>
        ))}
        <Path d={areaPath} fill="url(#sleepTrendFill)" />
        <Polyline points={pts} fill="none" stroke={lineColor} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {scores.map((s, i) => <Circle key={`d${i}`} cx={toX(i)} cy={toY(s)} r={3.5} fill={dotColor(s)} />)}
        <SvgText x={C_LEFT} y={CHART_H - 4} fill={theme.textDim} fontSize={8} fontFamily="DMSans_500Medium">{fmtDay(nights[0].dateKey)}</SvgText>
        {n > 3 && <SvgText x={toX(midIdx)} y={CHART_H - 4} fill={theme.textDim} fontSize={8} fontFamily="DMSans_500Medium" textAnchor="middle">{fmtDay(nights[midIdx].dateKey)}</SvgText>}
        <SvgText x={C_LEFT + PLOT_W} y={CHART_H - 4} fill={theme.textDim} fontSize={8} fontFamily="DMSans_500Medium" textAnchor="end">{fmtDay(nights[n - 1].dateKey)}</SvgText>
        {scores.map((s, i) => (
          <Circle key={`t${i}`} cx={toX(i)} cy={toY(s)} r={16} fill="transparent"
            onPress={() => setCallout(prev => prev?.label1 === fmtDay(nights[i].dateKey) ? null : { x: toX(i), y: toY(s), label1: fmtDay(nights[i].dateKey), label2: `Score ${s}` })} />
        ))}
        {callout && <CalloutPill callout={callout} theme={theme} clear={() => setCallout(null)} />}
      </Svg>
    </ReAnimated.View>
  );
}

// Per-night stacked stage bars: y-axis hours, x-axis dates, tap a bar for totals.
function StageHistoryChart({ nights, theme }: { nights: SleepNight[]; theme: any }) {
  const [sel, setSel] = useState<number | null>(null);
  const slide = useSlideIn(`${nights.length}:${nights[0]?.dateKey ?? ''}`);
  const n = nights.length;
  if (n === 0) return null;
  const barMs = nights.map(nt => nt.totalMs); // sleep only; awake lives in metrics
  const maxMs = Math.max(...barMs, 1);
  const rawMaxH = Math.max(1, Math.ceil(maxMs / 3600000));
  const step = rawMaxH <= 4 ? 1 : rawMaxH <= 9 ? 2 : 3;
  const maxH = Math.ceil(rawMaxH / step) * step;
  const ticks: number[] = [];
  for (let h = 0; h <= maxH; h += step) ticks.push(h);
  const tickMaxMs = maxH * 3600000;
  const toY = (ms: number) => C_TOP + (1 - ms / tickMaxMs) * PLOT_H;
  const slot = PLOT_W / n;
  const BAR_W = Math.min(28, slot - 4);
  const barX = (i: number) => C_LEFT + i * slot + (slot - BAR_W) / 2;
  const midIdx = Math.floor(n / 2);
  return (
    <ReAnimated.View style={slide}>
      <View>
        <Svg width={CHART_W} height={CHART_H}>
          <Rect x={0} y={0} width={CHART_W} height={CHART_H} fill="transparent" onPress={() => setSel(null)} />
          {ticks.map(h => (
            <Line key={`g${h}`} x1={C_LEFT} y1={toY(h * 3600000)} x2={C_LEFT + PLOT_W} y2={toY(h * 3600000)} stroke={theme.borderSubtle} strokeWidth={1} />
          ))}
          {ticks.map(h => (
            <SvgText key={`y${h}`} x={C_LEFT - 5} y={toY(h * 3600000) + 3} fill={theme.textDim} fontSize={8} fontFamily="DMSans_500Medium" textAnchor="end">{`${h}h`}</SvgText>
          ))}
          {nights.map((nt, i) => {
            const x = barX(i);
            const segs = [
              { c: theme.sleepDeep, ms: nt.deepMs },
              { c: theme.sleepCore, ms: nt.coreMs },
              { c: theme.sleepRem, ms: nt.remMs },
            ];
            let acc = 0;
            return (
              <G key={nt.dateKey}>
                {segs.map((s, si) => {
                  if (s.ms <= 0) return null;
                  const segH = (s.ms / tickMaxMs) * PLOT_H;
                  const y = C_TOP + PLOT_H - ((acc + s.ms) / tickMaxMs) * PLOT_H;
                  acc += s.ms;
                  return <Rect key={si} x={x} y={y} width={BAR_W} height={segH} fill={s.c} rx={si === segs.length - 1 ? 2 : 0} opacity={sel === null || sel === i ? 1 : 0.45} />;
                })}
                <Rect x={x} y={C_TOP} width={BAR_W} height={PLOT_H} fill="transparent"
                  onPress={() => setSel(prev => prev === i ? null : i)} />
              </G>
            );
          })}
          <SvgText x={C_LEFT + slot / 2} y={CHART_H - 4} fill={theme.textDim} fontSize={8} fontFamily="DMSans_500Medium" textAnchor="middle">{fmtDay(nights[0].dateKey)}</SvgText>
          {n > 3 && <SvgText x={C_LEFT + midIdx * slot + slot / 2} y={CHART_H - 4} fill={theme.textDim} fontSize={8} fontFamily="DMSans_500Medium" textAnchor="middle">{fmtDay(nights[midIdx].dateKey)}</SvgText>}
          <SvgText x={C_LEFT + (n - 1) * slot + slot / 2} y={CHART_H - 4} fill={theme.textDim} fontSize={8} fontFamily="DMSans_500Medium" textAnchor="middle">{fmtDay(nights[n - 1].dateKey)}</SvgText>
        </Svg>
        {sel !== null && (() => {
          const nt = nights[sel];
          const W = 154;
          const left = Math.max(0, Math.min(CHART_W - W, barX(sel) + BAR_W / 2 - W / 2));
          const rows = [
            { label: 'Core', color: theme.sleepCore, ms: nt.coreMs },
            { label: 'Deep', color: theme.sleepDeep, ms: nt.deepMs },
            { label: 'REM', color: theme.sleepRem, ms: nt.remMs },
            ...(nt.awakeMs > 0 ? [{ label: 'Awake', color: theme.sleepAwake, ms: nt.awakeMs }] : []),
          ];
          return (
            <TouchableOpacity activeOpacity={1} onPress={() => setSel(null)} style={{ position: 'absolute', top: 0, left, width: W }}>
              <View style={{ backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderWidth: 0.5, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 4 }}>
                <Text style={{ fontSize: 10, color: theme.textDim, fontFamily: 'DMSans_700Bold', letterSpacing: 0.5, marginBottom: 6 }}>{fmtDay(nt.dateKey)}</Text>
                <View style={{ height: 0.5, backgroundColor: theme.borderCard, marginBottom: 6 }} />
                {rows.map(r => (
                  <View key={r.label} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: r.color }} />
                      <Text style={{ fontSize: 10, color: theme.textMuted, fontFamily: 'DMSans_700Bold', letterSpacing: 0.5, textTransform: 'uppercase' }}>{r.label}</Text>
                    </View>
                    <Text style={{ fontSize: 11, color: r.color, fontFamily: 'DMSans_700Bold' }}>{fmtMs(r.ms)}</Text>
                  </View>
                ))}
                <View style={{ height: 0.5, backgroundColor: theme.borderCard, marginTop: 2, marginBottom: 6 }} />
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 10, color: theme.textMuted, fontFamily: 'DMSans_700Bold', letterSpacing: 0.5, textTransform: 'uppercase' }}>Duration</Text>
                  <Text style={{ fontSize: 11, color: theme.textPrimary, fontFamily: 'DMSans_700Bold' }}>{fmtMs(nt.totalMs)}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })()}
      </View>
    </ReAnimated.View>
  );
}

type SleepSeg = { stage: 'awake' | 'core' | 'deep' | 'rem'; start: number; end: number };

// Hypnogram: last night's stage timeline (bedtime -> wake), four lanes (Awake top,
// REM, Core, Deep bottom). Drag a finger across to read the stage + clock time.
function Hypnogram({ segments, theme, hideAxis }: { segments: SleepSeg[]; theme: any; hideAxis?: boolean }) {
  const [cursor, setCursor] = useState<{ x: number; time: string; stage: string; color: string } | null>(null);
  const slide = useSlideIn(`${segments.length}:${segments[0]?.start ?? 0}`);
  const bed = segments[0].start;
  const wake = segments[segments.length - 1].end;
  const dur = Math.max(1, wake - bed);
  const GUT = 40;
  const plotW = CHART_W - GUT;
  const laneH = 22, laneGap = 3;
  const lanes: SleepSeg['stage'][] = ['awake', 'rem', 'core', 'deep'];
  const laneLabel: Record<SleepSeg['stage'], string> = { awake: 'Awake', rem: 'REM', core: 'Core', deep: 'Deep' };
  const laneColor: Record<SleepSeg['stage'], string> = { awake: theme.sleepAwake, rem: theme.sleepRem, core: theme.sleepCore, deep: theme.sleepDeep };
  const H = lanes.length * laneH + (lanes.length - 1) * laneGap;
  const toX = (ms: number) => GUT + ((ms - bed) / dur) * plotW;
  const laneY = (stage: SleepSeg['stage']) => lanes.indexOf(stage) * (laneH + laneGap);
  const fmtClock = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const handle = (locX: number) => {
    const x = Math.max(GUT, Math.min(CHART_W, locX));
    const t = bed + ((x - GUT) / plotW) * dur;
    let seg = segments.find(s => t >= s.start && t <= s.end);
    if (!seg) seg = segments.reduce((best, s) => Math.abs((s.start + s.end) / 2 - t) < Math.abs((best.start + best.end) / 2 - t) ? s : best, segments[0]);
    setCursor({ x, time: fmtClock(t), stage: laneLabel[seg.stage], color: laneColor[seg.stage] });
  };

  // Only claim horizontal drags so vertical page scroll still passes through.
  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > Math.abs(g.dy) && Math.abs(g.dx) > 4,
    onPanResponderGrant: e => handle(e.nativeEvent.locationX),
    onPanResponderMove: e => handle(e.nativeEvent.locationX),
    onPanResponderRelease: () => setCursor(null),
    onPanResponderTerminate: () => setCursor(null),
  })).current;

  return (
    <ReAnimated.View style={slide}>
      <View {...pan.panHandlers}>
        <Svg width={CHART_W} height={H}>
          {lanes.map(stage => (
            <G key={stage}>
              <Rect x={GUT} y={laneY(stage)} width={plotW} height={laneH} fill={theme.bgInset} rx={4} />
              <SvgText x={GUT - 6} y={laneY(stage) + laneH / 2 + 3} fill={laneColor[stage]} fontSize={8} fontFamily="DMSans_600SemiBold" textAnchor="end">{laneLabel[stage]}</SvgText>
            </G>
          ))}
          {segments.map((s, i) => (
            <Rect key={i} x={toX(s.start)} y={laneY(s.stage)} width={Math.max(3, toX(s.end) - toX(s.start))} height={laneH} fill={laneColor[s.stage]} rx={3} />
          ))}
          {cursor && <Line x1={cursor.x} y1={0} x2={cursor.x} y2={H} stroke={theme.textPrimary} strokeWidth={1} opacity={0.45} />}
        </Svg>
      </View>
      {!hideAxis && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, paddingLeft: GUT }}>
          <Text style={{ fontSize: 9, color: theme.textDim, fontFamily: 'DMSans_500Medium' }}>{fmtClock(bed)}</Text>
          <Text style={{ fontSize: 9, color: theme.textDim, fontFamily: 'DMSans_500Medium' }}>{fmtClock(wake)}</Text>
        </View>
      )}
      {cursor && (
        <View style={{ position: 'absolute', top: 0, left: Math.max(0, Math.min(CHART_W - 96, cursor.x - 48)), backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderWidth: 0.5, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 6, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } }}>
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: cursor.color }} />
          <Text style={{ fontSize: 11, color: theme.textPrimary, fontFamily: 'DMSans_700Bold' }}>{cursor.stage}</Text>
          <Text style={{ fontSize: 11, color: theme.textMuted, fontFamily: 'DMSans_500Medium' }}>{cursor.time}</Text>
        </View>
      )}
    </ReAnimated.View>
  );
}

// Recovery Score trend: same structure as ScoreTrendChart but typed for
// { dateKey, score } arrays (no SleepNight fields needed).
function RecoveryTrendChart({ data, theme }: { data: { dateKey: string; score: number }[]; theme: any }) {
  const [callout, setCallout] = useState<Callout>(null);
  const slide = useSlideIn(`rec:${data.length}:${data[0]?.dateKey ?? ''}`);
  const n = data.length;
  if (n === 0) return null;
  // Auto-scale the y-axis to the data (mirrors ScoreTrendChart) so the line fills
  // the card instead of hugging a fixed 0-100 axis.
  const scores = data.map(d => d.score);
  const dataMin = Math.min(...scores);
  const dataMax = Math.max(...scores);
  const ticks = niceYTicks(dataMin, dataMax, 4);
  const tickMin = ticks[0];
  const tickMax = ticks[ticks.length - 1] || tickMin + 1;
  const span = (tickMax - tickMin) || 1;
  const toX = (i: number) => C_LEFT + (n === 1 ? PLOT_W / 2 : (i / (n - 1)) * PLOT_W);
  const toY = (v: number) => C_TOP + (1 - (clamp(v, tickMin, tickMax) - tickMin) / span) * PLOT_H;
  const pts = data.map((d, i) => `${toX(i)},${toY(d.score)}`).join(' ');
  const midIdx = Math.floor(n / 2);
  // App line-graph standard: neutral high-contrast line + recovery-tier-colored dots
  // (>=80 PRIMED green / >=60 STEADY amber / else RECOVER red) + neutral gradient fade.
  const lineColor = theme.textPrimary;
  const baseY = C_TOP + PLOT_H;
  const areaPath = `M ${toX(0)},${toY(scores[0])} ` + scores.slice(1).map((s, i) => `L ${toX(i + 1)},${toY(s)}`).join(' ') + ` L ${toX(n - 1)},${baseY} L ${toX(0)},${baseY} Z`;
  const dotColor = (s: number) => s >= 80 ? theme.statusGood : s >= 60 ? theme.statusWarn : theme.statusBad;
  return (
    <ReAnimated.View style={slide}>
      <Svg width={CHART_W} height={CHART_H}>
        <Defs>
          <SvgLinearGradient id="recTrendFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={lineColor} stopOpacity={0.2} />
            <Stop offset="1" stopColor={lineColor} stopOpacity={0} />
          </SvgLinearGradient>
        </Defs>
        <Rect x={0} y={0} width={CHART_W} height={CHART_H} fill="transparent" onPress={() => setCallout(null)} />
        {ticks.map(t => (
          <Line key={`rg${t}`} x1={C_LEFT} y1={toY(t)} x2={C_LEFT + PLOT_W} y2={toY(t)} stroke={theme.borderSubtle} strokeWidth={1} />
        ))}
        {ticks.map(t => (
          <SvgText key={`ry${t}`} x={C_LEFT - 5} y={toY(t) + 3} fill={theme.textDim} fontSize={8} fontFamily="DMSans_500Medium" textAnchor="end">{t}</SvgText>
        ))}
        <Path d={areaPath} fill="url(#recTrendFill)" />
        <Polyline points={pts} fill="none" stroke={lineColor} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {data.map((d, i) => <Circle key={`rd${i}`} cx={toX(i)} cy={toY(d.score)} r={3.5} fill={dotColor(d.score)} />)}
        <SvgText x={C_LEFT} y={CHART_H - 4} fill={theme.textDim} fontSize={8} fontFamily="DMSans_500Medium">{fmtDay(data[0].dateKey)}</SvgText>
        {n > 3 && <SvgText x={toX(midIdx)} y={CHART_H - 4} fill={theme.textDim} fontSize={8} fontFamily="DMSans_500Medium" textAnchor="middle">{fmtDay(data[midIdx].dateKey)}</SvgText>}
        <SvgText x={C_LEFT + PLOT_W} y={CHART_H - 4} fill={theme.textDim} fontSize={8} fontFamily="DMSans_500Medium" textAnchor="end">{fmtDay(data[n - 1].dateKey)}</SvgText>
        {data.map((d, i) => (
          <Circle key={`rt${i}`} cx={toX(i)} cy={toY(d.score)} r={16} fill="transparent"
            onPress={() => setCallout(prev => prev?.label1 === fmtDay(d.dateKey) ? null : { x: toX(i), y: toY(d.score), label1: fmtDay(d.dateKey), label2: `Recovery ${d.score}` })} />
        ))}
        {callout && <CalloutPill callout={callout} theme={theme} clear={() => setCallout(null)} />}
      </Svg>
    </ReAnimated.View>
  );
}

// Sleep Coach observation for the most recent night. Returns a kind so Mindful
// mode (without "Allow gentle coaching") can suppress corrective tips and only
// show positive/neutral summaries.
function sleepCoachTip(n: SleepNight, score: number, goalH: number, bedSd: number | null, allowCorrective: boolean): { text: string; kind: 'positive' | 'neutral' | 'corrective' } {
  const total = n.totalMs;
  const deepPct = total > 0 ? Math.round((n.deepMs / total) * 100) : 0;
  const remPct = total > 0 ? Math.round((n.remMs / total) * 100) : 0;
  const dur = fmtMs(total);
  if (allowCorrective) {
    if (deepPct < 13) return { text: `Deep sleep landed at ${deepPct}% last night (${dur} total). Deep is when your body physically repairs. A cooler, darker room and no heavy meals within 3 hours of bed push it up.`, kind: 'corrective' };
    if (remPct < 15) return { text: `REM came in low at ${remPct}%. REM supports memory and mood, and most of it happens in your last cycles. A steady wake time and skipping late alcohol protect it.`, kind: 'corrective' };
    if (total / 3600000 < goalH * 0.85) return { text: `You slept ${dur} against your ${goalH}h goal. Even 30 minutes earlier tonight compounds fast.`, kind: 'corrective' };
    if (bedSd !== null && bedSd > 60) return { text: `Your bedtime swung about ${bedSd} minutes across this stretch. A steadier schedule trains your body to reach deep sleep sooner.`, kind: 'corrective' };
  }
  if (score >= 85) return { text: `Strong night: ${dur} with healthy deep (${deepPct}%) and REM (${remPct}%). Same bedtime tonight keeps it going.`, kind: 'positive' };
  return { text: `You logged ${dur} last night, ${deepPct}% deep and ${remPct}% REM.`, kind: 'neutral' };
}

function recoveryCoachTip(result: RecoveryResult, styleMode: string, mindfulGrowth: boolean): { text: string; kind: 'positive' | 'neutral' | 'corrective' } {
  if (result.score === null) return { text: 'Log sleep and connect Apple Health to see your daily recovery score.', kind: 'neutral' };
  const score = result.score;

  if (result.hrv && !result.hrv.isPositive && !(styleMode === 'mindful' && !mindfulGrowth)) {
    return { text: `HRV came in at ${result.hrv.value} last night, ${result.hrv.delta} vs your baseline. Suppressed HRV signals the nervous system is still processing yesterday's load. A lighter session today pays back faster than pushing through.`, kind: 'corrective' };
  }
  if (result.rhr && !result.rhr.isPositive && !(styleMode === 'mindful' && !mindfulGrowth)) {
    return { text: `Resting HR is elevated at ${result.rhr.value} (${result.rhr.delta} vs baseline). Classic recovery debt signal. It can mean accumulated strain, stress, or early illness onset. Prioritize sleep and easy movement today.`, kind: 'corrective' };
  }
  if (result.resp && !result.resp.isPositive && result.resp.score < 55 && !(styleMode === 'mindful' && !mindfulGrowth)) {
    return { text: `Respiratory rate is running high at ${result.resp.value}, ${result.resp.delta} above baseline. Elevated overnight breathing often leads how you feel by a day or two. Worth watching.`, kind: 'corrective' };
  }
  if (score >= 80) {
    const htext = result.hrv ? ` HRV at ${result.hrv.value}${result.hrv.delta ? ` (${result.hrv.delta})` : ''}.` : '';
    return { text: `Strong recovery:${htext} Signals point to full readiness. Match today's effort to that.`, kind: 'positive' };
  }
  if (score >= 60) {
    return { text: `Solid recovery at ${score}. You are in the ready zone. Train or rest based on your plan, not the number.`, kind: 'positive' };
  }
  return { text: `Recovery sitting at ${score}. Not an alarm, but signals suggest moderate readiness today. Useful training is still possible, just be honest about your top end.`, kind: 'neutral' };
}

export default function SleepHub() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { sleepHours, sleepStages, sleepTimes, sleepAwakeMs, fetchSleepHistory, fetchLastNightSegments, fetchRecoverySignals } = useHealthKit();

  const [activeTab, setActiveTab] = useState<SleepTab>('sleep');
  const [range, setRange] = useState<'7' | '30'>('7');
  const [history, setHistory] = useState<SleepNight[]>([]);
  // Always-30-night set powering the PERSONAL BASELINES (avg deep/REM/bedtime/wake).
  // Separate from `history` so the range-driven chart fetch stays untouched. The
  // 7D/30D toggle only changes what the charts/metric values DISPLAY; the baseline
  // is always your last 30 nights. (SPEC_sleep.md Section 11.)
  const [history30, setHistory30] = useState<SleepNight[]>([]);
  const [loadingHist, setLoadingHist] = useState(true);
  const [styleMode, setStyleMode] = useState<'discipline' | 'balanced' | 'mindful'>('balanced');
  const [mindfulGrowth, setMindfulGrowth] = useState(false);
  const [excludedSet, setExcludedSet] = useState<Set<string>>(new Set());
  const [excludedToday, setExcludedToday] = useState(false);
  const [segments, setSegments] = useState<SleepSeg[]>([]);
  const [manualNights, setManualNights] = useState<{ dateKey: string; score: number }[]>([]);

  // Day-stored sleep fields (mirror how the home card resolves the same number)
  const [sleepGoal, setSleepGoal] = useState(7);
  const [sleepOverride, setSleepOverride] = useState<number | null>(null);
  const [sleepFeelRating, setSleepFeelRating] = useState<number | null>(null);
  const [sleepConsistencyPts, setSleepConsistencyPts] = useState(0);
  const [storedBed, setStoredBed] = useState<string | null>(null);
  const [storedWake, setStoredWake] = useState<string | null>(null);

  type RecoverySignals = {
    todayHRV: number | null; hrvBaseline: number | null;
    todayRHR: number | null; rhrBaseline: number | null;
    todayResp: number | null; respBaseline: number | null;
    todaySpO2: number | null;
    yesterdayActiveCal: number | null; activCalBaseline: number | null;
  };
  const [recoverySignals, setRecoverySignals] = useState<RecoverySignals | null>(null);
  const [loadingRecovery, setLoadingRecovery] = useState(true);
  const [burnAccuracyPct, setBurnAccuracyPct] = useState(100);
  const [recoveryTrend, setRecoveryTrend] = useState<{ dateKey: string; score: number }[]>([]);
  const [backfilling, setBackfilling] = useState<string | null>(null);
  const [trendReload, setTrendReload] = useState(0);
  const [drillKey, setDrillKey] = useState<string | null>(null);

  // Bumped on focus so the donut re-animates each time the screen is entered.
  const [refreshKey, setRefreshKey] = useState(0);
  useFocusEffect(useCallback(() => { setRefreshKey(k => k + 1); }, []));

  // Sleep Coach (Level 1, sleep-scoped). Shows the cached tip instantly, then the
  // AI-voiced version once it returns. Both are computed/cached once per day in the
  // engine, so this is at most one AI call a day. Falls back to templated copy.
  const [sleepCoachCache, setSleepCoachCache] = useState<CoachTipCache | null>(null);
  useEffect(() => {
    let cancelled = false;
    loadCoachTipCacheSleep().then(c => { if (!cancelled && c) setSleepCoachCache(c); }).catch(() => {});
    refreshCoachTipSleep(14).then(c => { if (!cancelled) setSleepCoachCache(c); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchLastNightSegments().then(s => { if (!cancelled) setSegments(s); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoadingHist(true);
    fetchSleepHistory(parseInt(range, 10))
      .then(h => { if (!cancelled) { setHistory(h); setLoadingHist(false); } })
      .catch(() => { if (!cancelled) setLoadingHist(false); });
    return () => { cancelled = true; };
  }, [range]);

  // Baseline set: always the last 30 nights, fetched once on mount.
  useEffect(() => {
    let cancelled = false;
    fetchSleepHistory(30)
      .then(h => { if (!cancelled) setHistory30(h); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Load per-day exclusion flags for the nights in range (+ today) so excluded
  // nights drop out of trends on both tabs. Excluded days keep their saved data.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const keys = Array.from(new Set<string>([todayKey(), ...history.map(n => n.dateKey), ...history30.map(n => n.dateKey)]));
      const ex = new Set<string>();
      for (const dk of keys) {
        try {
          const raw = await AsyncStorage.getItem(`pj_${dk}`);
          if (raw && JSON.parse(raw).excluded) ex.add(dk);
        } catch {}
      }
      if (!cancelled) { setExcludedSet(ex); setExcludedToday(ex.has(todayKey())); }
    })();
    return () => { cancelled = true; };
  }, [history, history30]);

  // Manual sleep nights (logged by hand on the home card, no Apple Health stages)
  // so the score trend works for users without a watch. Feel-based scores.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const days = parseInt(range, 10);
      const out: { dateKey: string; score: number }[] = [];
      const base = new Date();
      for (let i = 0; i < days; i++) {
        const d = new Date(base);
        d.setDate(d.getDate() - i);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        try {
          const raw = await AsyncStorage.getItem(`pj_${key}`);
          if (!raw) continue;
          const data = JSON.parse(raw);
          if (!data.sleepOverride) continue;
          const { score: ms } = calcSleepScore(data.sleepOverride, null, sleepGoal, data.sleepFeelRating ?? null, true, data.sleepConsistencyPts ?? 0);
          if (ms !== null) out.push({ dateKey: key, score: ms });
        } catch {}
      }
      if (!cancelled) setManualNights(out);
    })();
    return () => { cancelled = true; };
  }, [range, sleepGoal]);

  // Recovery signals: load once with a FIXED 7-day baseline. Today's Recovery is a
  // STABLE number -- it always compares today against the same yardstick. The
  // viewing-range toggle moves the trend chart's history only, NOT today's score
  // (letting the toggle change the baseline window made the hero wobble on a mere
  // view change, and left today's point computed by a different rule than the
  // 7d-baseline backfilled history -- both wrong).
  useEffect(() => {
    let cancelled = false;
    setLoadingRecovery(true);
    fetchRecoverySignals(7)
      .then(s => { if (!cancelled) { setRecoverySignals(s); setLoadingRecovery(false); } })
      .catch(() => { if (!cancelled) setLoadingRecovery(false); });
    return () => { cancelled = true; };
  }, []);

  const filteredHistory = useMemo(() => history.filter(n => !excludedSet.has(n.dateKey)), [history, excludedSet]);

  // Personal 30-day baselines (excludes removed). Needs >= 7 stage nights, else
  // null and the metrics rows fall back to static healthy-range references.
  const baseline30 = useMemo(() => {
    const nights = history30.filter(n => !excludedSet.has(n.dateKey) && n.totalMs > 0);
    if (nights.length < 7) return null;
    const deepPct = nights.reduce((a, n) => a + n.deepMs / n.totalMs, 0) / nights.length * 100;
    const remPct = nights.reduce((a, n) => a + n.remMs / n.totalMs, 0) / nights.length * 100;
    const beds = nights.map(n => n.bedMin).filter((b): b is number => b !== null);
    const bedMin = beds.length ? beds.reduce((a, b) => a + b, 0) / beds.length : null;
    const bedSd = beds.length >= 2 && bedMin !== null
      ? Math.round(Math.sqrt(beds.reduce((a, b) => a + (b - bedMin) ** 2, 0) / beds.length)) : null;
    // Bedtime range = 10th-90th percentile of your nights (trims the odd 2 AM
    // night so it doesn't blow the window open). bedMid = your typical (median).
    const sortedBeds = [...beds].sort((a, b) => a - b);
    const pct = (p: number) => sortedBeds.length ? sortedBeds[clamp(Math.round((p / 100) * (sortedBeds.length - 1)), 0, sortedBeds.length - 1)] : null;
    const bedLo = pct(10), bedMid = pct(50), bedHi = pct(90);
    const wake = nights.reduce((a, n) => a + n.awakeCount, 0) / nights.length;
    return { deepPct, remPct, bedMin, bedSd, bedLo, bedMid, bedHi, wake, count: nights.length };
  }, [history30, excludedSet]);
  // Only blank the cards on the very first load. On range switches we keep the
  // existing charts mounted so the page doesn't collapse and jump to the top.
  const firstLoad = loadingHist && history.length === 0;

  // Today's sleep score, resolved the same way the home card does. Computed here,
  // ABOVE the Recovery memo, so the memo actually sees it -- sleep feeds Recovery
  // at 22% weight. (Declared lower previously, which made the memo read it as
  // undefined and silently drop sleep from every recovery score.)
  const displaySleep = sleepOverride ?? sleepHours;
  const isManual = !!sleepOverride;
  const { score } = calcSleepScore(displaySleep, sleepStages, sleepGoal, sleepFeelRating, isManual, sleepConsistencyPts);

  // Burn-accuracy-adjusted signals: scale the activity numbers by the user's
  // burnAccuracyPct so Recovery shows the same adjusted active calories as the
  // rest of the app. Scaling today AND the baseline by the same factor leaves the
  // recovery sub-score unchanged -- it only corrects the displayed kcal + delta.
  const adjustedSignals = useMemo(() => {
    if (!recoverySignals) return null;
    const k = burnAccuracyPct / 100;
    return {
      ...recoverySignals,
      yesterdayActiveCal: recoverySignals.yesterdayActiveCal !== null ? Math.round(recoverySignals.yesterdayActiveCal * k) : null,
      activCalBaseline: recoverySignals.activCalBaseline !== null ? Math.round(recoverySignals.activCalBaseline * k) : null,
    };
  }, [recoverySignals, burnAccuracyPct]);

  // Recovery Score computed from live signals + today's sleep score.
  const recoveryResult = useMemo(() => {
    if (adjustedSignals === null) return null;
    return calcRecoveryScore({
      sleepScore: score,
      todayHRV: adjustedSignals.todayHRV,
      hrvBaseline: adjustedSignals.hrvBaseline,
      todayRHR: adjustedSignals.todayRHR,
      rhrBaseline: adjustedSignals.rhrBaseline,
      yesterdayActiveCal: adjustedSignals.yesterdayActiveCal,
      activCalBaseline: adjustedSignals.activCalBaseline,
      todayResp: adjustedSignals.todayResp,
      respBaseline: adjustedSignals.respBaseline,
    });
  }, [adjustedSignals, score]);

  // Persist today's Recovery Score to pj_<date> so the trend accumulates over time.
  useEffect(() => {
    if (!recoveryResult || recoveryResult.score === null) return;
    const sc = recoveryResult.score;
    (async () => {
      try {
        const k = `pj_${todayKey()}`;
        const raw = await AsyncStorage.getItem(k);
        const cur = raw ? JSON.parse(raw) : {};
        if (cur.recoveryScore !== sc) await storageSet(k, JSON.stringify({ ...cur, recoveryScore: sc }));
      } catch {}
    })();
  }, [recoveryResult]);

  // Load historical Recovery Scores from pj_<date> for the trend chart.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const days = parseInt(range, 10);
      const out: { dateKey: string; score: number }[] = [];
      const base = new Date();
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(base);
        d.setDate(d.getDate() - i);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (excludedSet.has(key)) continue;
        try {
          const raw = await AsyncStorage.getItem(`pj_${key}`);
          if (!raw) continue;
          const data = JSON.parse(raw);
          if (typeof data.recoveryScore === 'number') out.push({ dateKey: key, score: data.recoveryScore });
        } catch {}
      }
      if (!cancelled) setRecoveryTrend(out);
    })();
    return () => { cancelled = true; };
  }, [range, excludedSet, trendReload]);

  // Dev: backfill REAL recovery history. Triggered by the Settings dev tool
  // (pj_dev_backfill_recovery). For each of the last 30 days it recomputes the
  // genuine recovery score from that day's real Apple Health signals + that
  // night's real sleep score, then read-then-merges it into pj_<date> (never
  // overwrites the day). Days with no watch data are skipped (honest gaps).
  // Burn accuracy is intentionally NOT applied: scaling activity + its baseline
  // by the same factor leaves the recovery score unchanged, and only the score
  // is stored here.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if ((await AsyncStorage.getItem('pj_dev_backfill_recovery')) !== '1') return;
        await AsyncStorage.removeItem('pj_dev_backfill_recovery'); // consume once
        setBackfilling('Backfilling your recovery history...');

        // Real sleep score per night (HealthKit stages), keyed by wake-day.
        const nights = await fetchSleepHistory(30);
        const sleepByDate: Record<string, number | null> = {};
        for (const nt of nights) {
          sleepByDate[nt.dateKey] = calcSleepScore(nt.totalMs / 3600000, { core: nt.coreMs, deep: nt.deepMs, rem: nt.remMs, totalMs: nt.totalMs }, sleepGoal).score;
        }

        let written = 0;
        const today = new Date();
        for (let i = 1; i <= 30; i++) {
          if (cancelled) return;
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          setBackfilling(`Backfilling recovery... day ${i} of 30`);
          const sig = await fetchRecoverySignals(7, d);
          const res = calcRecoveryScore({
            sleepScore: sleepByDate[key] ?? null,
            todayHRV: sig.todayHRV, hrvBaseline: sig.hrvBaseline,
            todayRHR: sig.todayRHR, rhrBaseline: sig.rhrBaseline,
            yesterdayActiveCal: sig.yesterdayActiveCal, activCalBaseline: sig.activCalBaseline,
            todayResp: sig.todayResp, respBaseline: sig.respBaseline,
          });
          if (res.score === null) continue; // no data that day -> honest gap, no write
          const k = `pj_${key}`;
          const raw = await AsyncStorage.getItem(k);
          const cur = raw ? JSON.parse(raw) : {};
          if (cur.recoveryScore !== res.score) {
            await storageSet(k, JSON.stringify({ ...cur, recoveryScore: res.score }));
          }
          written++;
        }
        if (!cancelled) {
          setBackfilling(null);
          setTrendReload(n => n + 1);
          Alert.alert('Recovery History Backfilled', `Filled in ${written} day${written === 1 ? '' : 's'} of real recovery scores from your Apple Health history.`);
        }
      } catch {
        if (!cancelled) setBackfilling(null);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const toggleExclude = async (val: boolean) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    setExcludedToday(val);
    setExcludedSet(prev => {
      const s = new Set(prev);
      if (val) s.add(todayKey()); else s.delete(todayKey());
      return s;
    });
    try {
      const k = `pj_${todayKey()}`;
      const raw = await AsyncStorage.getItem(k);
      const cur = raw ? JSON.parse(raw) : {};
      await storageSet(k, JSON.stringify({ ...cur, excluded: val }));
    } catch {}
  };

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(`pj_${todayKey()}`);
        if (raw) {
          const d = JSON.parse(raw);
          if (d.sleepOverride) setSleepOverride(d.sleepOverride);
          if (d.sleepFeelRating) setSleepFeelRating(d.sleepFeelRating);
          if (typeof d.sleepConsistencyPts === 'number') setSleepConsistencyPts(d.sleepConsistencyPts);
          if (d.sleepBedTime) setStoredBed(d.sleepBedTime);
          if (d.sleepWakeTime) setStoredWake(d.sleepWakeTime);
        }
        const prof = await AsyncStorage.getItem('pj_profile');
        if (prof) {
          const p = JSON.parse(prof);
          if (p.sleepGoal && parseFloat(p.sleepGoal) > 0) setSleepGoal(parseFloat(p.sleepGoal));
        }
        const settings = await AsyncStorage.getItem('pj_settings');
        if (settings) {
          const s = JSON.parse(settings);
          if (s.styleMode) setStyleMode(s.styleMode);
          if (typeof s.mindfulGrowthAreas === 'boolean') setMindfulGrowth(s.mindfulGrowthAreas);
          if (typeof s.burnAccuracyPct === 'number') setBurnAccuracyPct(s.burnAccuracyPct);
        }
      } catch {}
    })();
  }, []);

  const scoreColor = score !== null ? (score >= 85 ? theme.statusGood : score >= 70 ? theme.statusWarn : theme.statusBad) : theme.textDim;
  const scoreLabel = score !== null ? (score >= 85 ? 'Well Rested' : score >= 70 ? 'Could Be Better' : 'Poor Sleep') : null;

  const cardStyle = {
    backgroundColor: theme.bgCard,
    borderWidth: 0.5,
    borderColor: theme.borderCard,
    borderTopColor: theme.borderCardTop,
    borderLeftWidth: 3,
    borderLeftColor: theme.accentBlueRaw,
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  } as const;

  // No donut (the hypnogram below is the stage visual). Duration on the left, the
  // Sleep Score as a compact number on the right, stage durations as text.
  const renderHero = () => {
    if (displaySleep === null || displaySleep <= 0) {
      return (
        <View style={[cardStyle, { alignItems: 'center', paddingVertical: 28 }]}>
          <Ionicons name="moon-outline" size={34} color={theme.iconMuted} />
          <Text style={{ fontSize: 14, color: theme.textPrimary, fontFamily: 'DMSans_700Bold', marginTop: 10 }}>No sleep logged last night</Text>
          <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'DMSans_400Regular', marginTop: 4, textAlign: 'center' }}>
            Sleep syncs from Apple Health, or you can log it by hand on the home Sleep card.
          </Text>
        </View>
      );
    }

    const hrs = Math.floor(displaySleep);
    const mins = Math.round((displaySleep - hrs) * 60);
    const coreMs = sleepStages?.core || 0;
    const deepMs = sleepStages?.deep || 0;
    const remMs = sleepStages?.rem || 0;

    const legend = [
      { label: 'Core', color: theme.sleepCore, val: coreMs },
      { label: 'Deep', color: theme.sleepDeep, val: deepMs },
      { label: 'REM', color: theme.sleepRem, val: remMs },
      ...(sleepAwakeMs > 0 ? [{ label: 'Awake', color: theme.sleepAwake, val: sleepAwakeMs }] : []),
    ];

    return (
      <View style={cardStyle}>
        <Text style={[cardLabel, { marginBottom: 14 }]}>Last Night</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 38, color: scoreColor, fontFamily: 'BebasNeue_400Regular', letterSpacing: 0.5, lineHeight: 44 }}>{hrs}h {mins}m</Text>
            <Text style={{ fontSize: 9, color: scoreLabel ? scoreColor : theme.textDim, fontFamily: 'DMSans_700Bold', letterSpacing: 2, textTransform: 'uppercase', marginTop: 3 }}>
              {scoreLabel ?? (isManual ? 'MANUAL' : 'HEALTHKIT')}
            </Text>
          </View>
          {score !== null && (
            <>
              <View style={{ width: 1, height: 52, backgroundColor: theme.borderSubtle }} />
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: 38, color: scoreColor, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1, lineHeight: 44 }}>{score}</Text>
                <Text style={{ fontSize: 8, color: theme.textMuted, fontFamily: 'DMSans_700Bold', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 4 }}>Sleep Score</Text>
              </View>
            </>
          )}
        </View>
        {segments.length > 0 && (
          <View style={{ marginTop: 16 }}>
            <Hypnogram segments={segments} theme={theme} hideAxis />
          </View>
        )}
        <View style={{ alignItems: 'center', marginTop: 14 }}>
          {((storedBed && storedWake) || sleepTimes) && (
            <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'DMSans_500Medium' }}>
              {storedBed || sleepTimes?.bed} → {storedWake || sleepTimes?.wake}
            </Text>
          )}
        </View>
        {sleepStages && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 16, paddingHorizontal: 8 }}>
            {legend.map(s => (
              <View key={s.label} style={{ alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                  <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: s.color }} />
                  <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: 'DMSans_700Bold', letterSpacing: 1, textTransform: 'uppercase' }}>{s.label}</Text>
                </View>
                <Text style={{ fontSize: 14, color: s.color, fontFamily: 'DMSans_700Bold' }}>{fmtMs(s.val)}</Text>
              </View>
            ))}
          </View>
        )}
        <Text style={{ fontSize: 10, color: theme.textDim, fontFamily: 'DMSans_400Regular', marginTop: 16, textAlign: 'center' }}>
          For informational purposes only. Not medical advice.
        </Text>
      </View>
    );
  };

  const renderRecovery = () => {
    const recColor = recoveryResult?.zoneColor === 'good' ? theme.statusGood : recoveryResult?.zoneColor === 'warn' ? theme.statusWarn : theme.statusBad;
    const rowColor = (sc: number) => sc >= 75 ? theme.statusGood : sc >= 55 ? theme.statusWarn : theme.statusBad;

    // Hero card
    const heroCard = () => {
      if (loadingRecovery && recoveryResult === null) {
        return (
          <View style={[cardStyle, { alignItems: 'center', paddingVertical: 32 }]}>
            <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'DMSans_400Regular' }}>Loading recovery data...</Text>
          </View>
        );
      }
      if (recoveryResult === null || recoveryResult.score === null) {
        return (
          <View style={[cardStyle, { alignItems: 'center', paddingVertical: 28 }]}>
            <Ionicons name="pulse-outline" size={34} color={theme.iconMuted} />
            <Text style={{ fontSize: 14, color: theme.textPrimary, fontFamily: 'DMSans_700Bold', marginTop: 10 }}>Recovery data unavailable</Text>
            <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'DMSans_400Regular', marginTop: 4, textAlign: 'center', lineHeight: 18 }}>
              Connect Apple Health and log sleep to see your Recovery Score.
            </Text>
          </View>
        );
      }

      const rows: { key: string; dkey: string; comp: RecoveryComponent | null }[] = [
        { key: 'HRV', dkey: 'hrv', comp: recoveryResult.hrv },
        { key: 'Sleep Score', dkey: 'sleepScore', comp: recoveryResult.sleep },
        { key: 'Resting HR', dkey: 'rhr', comp: recoveryResult.rhr },
        { key: 'Prev. Activity', dkey: 'activity', comp: recoveryResult.activity },
        { key: 'Resp. Rate', dkey: 'resp', comp: recoveryResult.resp },
      ].filter(r => r.comp !== null);

      return (
        <View style={cardStyle}>
          <Text style={[cardLabel, { marginBottom: 14 }]}>Today's Recovery</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18, marginBottom: 18 }}>
            <Text style={{ fontSize: 72, color: recColor, fontFamily: 'BebasNeue_400Regular', lineHeight: 78 }}>{recoveryResult.score}</Text>
            <View>
              <Text style={{ fontSize: 20, color: recColor, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2 }}>{recoveryResult.label}</Text>
              {recoveryResult.isLimitedData && (
                <View style={{ marginTop: 5, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder, alignSelf: 'flex-start' }}>
                  <Text style={{ fontSize: 9, color: theme.accentBlueRaw, fontFamily: 'DMSans_700Bold', letterSpacing: 1, textTransform: 'uppercase' }}>Limited data</Text>
                </View>
              )}
            </View>
          </View>

          <Text style={{ fontSize: 10, color: theme.textDim, fontFamily: 'DMSans_400Regular', textAlign: 'right', marginBottom: 4 }}>
            Change vs your 7-day baseline
          </Text>
          <View style={{ borderTopWidth: 0.5, borderTopColor: theme.borderSubtle }}>
            {rows.map(({ key, dkey, comp }, idx) => {
              if (!comp) return null;
              const rc = rowColor(comp.score);
              const isLast = idx === rows.length - 1;
              return (
                <TouchableOpacity key={key} activeOpacity={0.6} onPress={() => openDrill(dkey)} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: isLast ? 0 : 0.5, borderBottomColor: theme.borderSubtle }}>
                  <View style={{ width: 3, height: 28, borderRadius: 2, backgroundColor: rc, marginRight: 12 }} />
                  <Text style={{ flex: 1, fontSize: 13, color: theme.textSecondary, fontFamily: 'DMSans_500Medium' }}>{key}</Text>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 14, color: rc, fontFamily: 'DMSans_700Bold' }}>{comp.value}</Text>
                    {comp.delta && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 1 }}>
                        <Ionicons name={comp.isPositive ? 'arrow-up' : 'arrow-down'} size={9} color={comp.isPositive ? theme.statusGood : theme.statusBad} />
                        <Text style={{ fontSize: 10, color: theme.textDim, fontFamily: 'DMSans_400Regular' }}>{comp.delta}</Text>
                      </View>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={14} color={theme.textDim} style={{ marginLeft: 8 }} />
                </TouchableOpacity>
              );
            })}
          </View>

          {adjustedSignals?.todaySpO2 !== null && adjustedSignals?.todaySpO2 !== undefined && (
            <TouchableOpacity activeOpacity={0.6} onPress={() => openDrill('spo2')} style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 10, borderTopWidth: 0.5, borderTopColor: theme.borderSubtle, marginTop: 2 }}>
              <View style={{ width: 3, height: 28, borderRadius: 2, backgroundColor: adjustedSignals.todaySpO2 >= 95 ? theme.statusGood : theme.statusWarn, marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, color: theme.textMuted, fontFamily: 'DMSans_500Medium' }}>Blood Oxygen (SpO2)</Text>
                <Text style={{ fontSize: 10, color: theme.textDim, fontFamily: 'DMSans_400Regular', marginTop: 1 }}>Informational only</Text>
              </View>
              <Text style={{ fontSize: 14, color: adjustedSignals.todaySpO2 >= 95 ? theme.statusGood : theme.statusWarn, fontFamily: 'DMSans_700Bold' }}>{adjustedSignals.todaySpO2}%</Text>
              <Ionicons name="chevron-forward" size={14} color={theme.textDim} style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          )}

          <Text style={{ fontSize: 10, color: theme.textDim, fontFamily: 'DMSans_400Regular', marginTop: 14, textAlign: 'center' }}>
            For informational purposes only. Not medical advice.
          </Text>
        </View>
      );
    };

    // Trend card
    const trendCard = () => {
      const avg = recoveryTrend.length ? Math.round(recoveryTrend.reduce((a, d) => a + d.score, 0) / recoveryTrend.length) : null;
      return (
        <View style={cardStyle}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
            <View>
              <Text style={cardLabel}>Recovery Trend</Text>
              {avg !== null && (
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 6 }}>
                  <Text style={{ fontSize: 24, color: theme.statusGood, fontFamily: 'BebasNeue_400Regular', letterSpacing: 0.5 }}>{avg}</Text>
                  <Text style={{ fontSize: 11, color: theme.textMuted, fontFamily: 'DMSans_500Medium' }}>avg over {recoveryTrend.length} {recoveryTrend.length === 1 ? 'day' : 'days'}</Text>
                </View>
              )}
            </View>
          </View>
          {recoveryTrend.length > 0 ? (
            <RecoveryTrendChart data={recoveryTrend} theme={theme} />
          ) : (
            <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'DMSans_400Regular', paddingVertical: 24, textAlign: 'center', lineHeight: 18 }}>
              Your recovery trend builds over time. Today's score is the first data point.
            </Text>
          )}
        </View>
      );
    };

    // Key signals panel
    const signalsCard = () => {
      if (!adjustedSignals) return null;
      const { todayHRV, hrvBaseline, todayRHR, rhrBaseline, todayResp, respBaseline, todaySpO2, yesterdayActiveCal, activCalBaseline } = adjustedSignals;
      const anySignal = todayHRV !== null || todayRHR !== null || todayResp !== null || todaySpO2 !== null || yesterdayActiveCal !== null;
      if (!anySignal) return null;

      const sigRow = (label: string, value: string | null, sub: string | null, dkey: string, isLast = false) =>
        value === null ? null : (
          <TouchableOpacity activeOpacity={0.6} onPress={() => openDrill(dkey)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: isLast ? 0 : 0.5, borderBottomColor: theme.borderSubtle }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, color: theme.textSecondary, fontFamily: 'DMSans_500Medium' }}>{label}</Text>
              {sub ? <Text style={{ fontSize: 10, color: theme.textDim, fontFamily: 'DMSans_400Regular', marginTop: 2 }}>{sub}</Text> : null}
            </View>
            <Text style={{ fontSize: 16, color: theme.textPrimary, fontFamily: 'DMSans_700Bold' }}>{value}</Text>
            <Ionicons name="chevron-forward" size={14} color={theme.textDim} style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        );

      return (
        <View style={cardStyle}>
          <Text style={[cardLabel, { marginBottom: 4 }]}>Key Signals</Text>
          {sigRow('HRV (overnight)', todayHRV !== null ? `${Math.round(todayHRV * 10) / 10}ms` : null, hrvBaseline !== null ? `7d avg: ${Math.round(hrvBaseline * 10) / 10}ms` : null, 'hrv')}
          {sigRow('Resting HR', todayRHR !== null ? `${todayRHR} bpm` : null, rhrBaseline !== null ? `7d avg: ${rhrBaseline} bpm` : null, 'rhr')}
          {sigRow('Resp. Rate', todayResp !== null ? `${todayResp} brpm` : null, respBaseline !== null ? `7d avg: ${respBaseline} brpm` : null, 'resp')}
          {sigRow('Blood Oxygen', todaySpO2 !== null ? `${todaySpO2}%` : null, 'Informational only', 'spo2')}
          {sigRow('Prev. Day Activity', yesterdayActiveCal !== null ? `${yesterdayActiveCal} kcal` : null, activCalBaseline !== null ? `7d avg: ${activCalBaseline} kcal` : null, 'activity', true)}
        </View>
      );
    };

    // Recovery coach tip
    const coachCard = () => {
      if (!recoveryResult) return null;
      const tip = recoveryCoachTip(recoveryResult, styleMode, mindfulGrowth);
      if (styleMode === 'mindful' && !mindfulGrowth && tip.kind === 'corrective') return null;
      return (
        <View style={cardStyle}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <Ionicons name="sparkles" size={11} color={theme.statusGood} />
            <Text style={cardLabel}>Recovery Coach</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10, padding: 12, borderRadius: 10, backgroundColor: theme.accentBlueBg }}>
            <Ionicons name="bulb" size={16} color={theme.accentBlueRaw} style={{ marginTop: 1 }} />
            <Text style={{ flex: 1, fontSize: 13, color: theme.textPrimary, fontFamily: 'DMSans_500Medium', lineHeight: 20 }}>{tip.text}</Text>
          </View>
        </View>
      );
    };

    return (
      <>
        {heroCard()}
        {trendCard()}
        {signalsCard()}
        {coachCard()}
      </>
    );
  };

  const cardLabel = { fontSize: 9, letterSpacing: 3, color: theme.textMuted, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase' as const };

  const rangeToggle = () => (
    <View style={{ flexDirection: 'row', backgroundColor: theme.bgProgressTrack, borderRadius: 6, padding: 2 }}>
      {(['7', '30'] as const).map(r => (
        <TouchableOpacity key={r} onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setRange(r); }}
          style={{ paddingVertical: 4, paddingHorizontal: 10, borderRadius: 4, backgroundColor: range === r ? theme.bgCard : 'transparent' }}
          hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}>
          <Text style={{ fontSize: 11, color: range === r ? theme.textPrimary : theme.textMuted, fontFamily: range === r ? 'DMSans_700Bold' : 'DMSans_500Medium' }}>{r}D</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const nightScores = useMemo(
    () => filteredHistory.map(nt => calcSleepScore(nt.totalMs / 3600000, { core: nt.coreMs, deep: nt.deepMs, rem: nt.remMs, totalMs: nt.totalMs }, sleepGoal).score ?? 0),
    [filteredHistory, sleepGoal],
  );

  // Trend points = Apple Health stage nights + manual nights (HealthKit wins on a
  // shared date), excluded days dropped, sorted by date.
  const trendData = useMemo(() => {
    const map = new Map<string, number>();
    filteredHistory.forEach((nt, i) => map.set(nt.dateKey, nightScores[i]));
    manualNights.forEach(m => { if (!map.has(m.dateKey) && !excludedSet.has(m.dateKey)) map.set(m.dateKey, m.score); });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([dateKey, score]) => ({ dateKey, score })).slice(-parseInt(range, 10));
  }, [filteredHistory, nightScores, manualNights, excludedSet, range]);

  const renderTrend = () => {
    const avg = trendData.length ? Math.round(trendData.reduce((a, d) => a + d.score, 0) / trendData.length) : null;
    return (
      <View style={cardStyle}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
          <View>
            <Text style={cardLabel}>Sleep Score Trend</Text>
            {avg !== null && (
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 6 }}>
                <Text style={{ fontSize: 24, color: theme.accentBlueRaw, fontFamily: 'BebasNeue_400Regular', letterSpacing: 0.5 }}>{avg}</Text>
                <Text style={{ fontSize: 11, color: theme.textMuted, fontFamily: 'DMSans_500Medium' }}>avg over {trendData.length} {trendData.length === 1 ? 'night' : 'nights'}</Text>
              </View>
            )}
          </View>
        </View>
        {trendData.length > 0 ? (
          <ScoreTrendChart nights={trendData as unknown as SleepNight[]} scores={trendData.map(d => d.score)} theme={theme} />
        ) : firstLoad ? (
          <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'DMSans_400Regular', paddingVertical: 24, textAlign: 'center' }}>Loading…</Text>
        ) : (
          <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'DMSans_400Regular', paddingVertical: 24, textAlign: 'center' }}>
            No sleep logged in this range yet.
          </Text>
        )}
      </View>
    );
  };

  const renderStageHistory = () => {
    const legend = [
      { label: 'Core', color: theme.sleepCore },
      { label: 'Deep', color: theme.sleepDeep },
      { label: 'REM', color: theme.sleepRem },
    ];
    return (
      <View style={cardStyle}>
        <Text style={[cardLabel, { marginBottom: 12 }]}>Sleep Stages</Text>
        {filteredHistory.length > 0 ? (
          <>
            <StageHistoryChart nights={filteredHistory} theme={theme} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 12 }}>
              {legend.map(l => (
                <View key={l.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: l.color }} />
                  <Text style={{ fontSize: 10, color: theme.textMuted, fontFamily: 'DMSans_600SemiBold', letterSpacing: 0.5, textTransform: 'uppercase' }}>{l.label}</Text>
                </View>
              ))}
            </View>
            <Text style={{ fontSize: 10, color: theme.textDim, fontFamily: 'DMSans_400Regular', textAlign: 'center', marginTop: 10 }}>Apple Health data only. Manual sleep nights not included.</Text>
          </>
        ) : firstLoad ? (
          <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'DMSans_400Regular', paddingVertical: 24, textAlign: 'center' }}>Loading…</Text>
        ) : (
          <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'DMSans_400Regular', paddingVertical: 24, textAlign: 'center', lineHeight: 18 }}>
            Sleep stages need Apple Health. Your manual sleep still counts toward your score and trend.
          </Text>
        )}
      </View>
    );
  };

  const renderMetrics = () => {
    if (filteredHistory.length === 0) return null;

    const n = filteredHistory.length;
    const withStages = filteredHistory.filter(nt => nt.totalMs > 0);
    const avgDeepPct = withStages.length ? withStages.reduce((a, nt) => a + nt.deepMs / nt.totalMs, 0) / withStages.length * 100 : null;
    const avgRemPct = withStages.length ? withStages.reduce((a, nt) => a + nt.remMs / nt.totalMs, 0) / withStages.length * 100 : null;

    const beds = filteredHistory.map(nt => nt.bedMin).filter((b): b is number => b !== null);
    const bedMean = beds.length ? beds.reduce((a, b) => a + b, 0) / beds.length : null;
    const bedSd = beds.length >= 2 && bedMean !== null
      ? Math.round(Math.sqrt(beds.reduce((a, b) => a + (b - bedMean) ** 2, 0) / beds.length)) : null;

    // Sleep debt: cumulative shortfall vs goal across the viewed range.
    const goalMs = sleepGoal * 3600000;
    const totalSleepMs = filteredHistory.reduce((a, nt) => a + nt.totalMs, 0);
    const debtMs = goalMs * n - totalSleepMs;

    const good = theme.statusGood, warn = theme.statusWarn, bad = theme.statusBad;
    const neutral = theme.textMuted;

    // Inline comparison rows (no bars): big colored value on the right, a small
    // qualifier next to it, one muted subtext line below. The qualifier is NEUTRAL
    // for the stage "vs norm" deltas so a down-arrow never fights a green value, and
    // COLORED where the qualifier itself is the judgment (bedtime / balance / wakes).
    type RowCfg = { icon: any; label: string; value: string; valueColor: string; delta?: string; deltaColor?: string; caption?: string };
    const rows: RowCfg[] = [];

    // Avg deep / Avg REM over the viewed range (NOT last night). COLOR by medical
    // healthy range: below = amber, in OR above = green (above is not a problem).
    // The "vs norm" delta is neutral grey so its arrow can't contradict the color.
    const stageRow = (icon: string, label: string, val: number | null, base: number | null, lo: number, hi: number) => {
      if (val === null) { rows.push({ icon, label, value: '—', valueColor: theme.textSecondary, caption: 'No stage data yet' }); return; }
      const vr = Math.round(val);
      const color = val < lo ? warn : good;
      const caption = val < lo ? `Below healthy range (${lo} to ${hi}%)`
        : val > hi ? `Above healthy range (${lo} to ${hi}%)`
        : `In healthy range (${lo} to ${hi}%)`;
      let delta: string | undefined;
      if (base !== null) {
        const diff = vr - Math.round(base);
        delta = diff === 0 ? '= norm' : diff > 0 ? `↑ ${diff}% norm` : `↓ ${-diff}% norm`;
      }
      rows.push({ icon, label, value: `${vr}%`, valueColor: color, delta, deltaColor: neutral, caption });
    };
    stageRow('moon', 'Avg deep sleep', avgDeepPct, baseline30?.deepPct ?? null, 13, 23);
    stageRow('pulse', 'Avg REM sleep', avgRemPct, baseline30?.remPct ?? null, 20, 25);

    // Bedtime: typical time, colored by how tightly your bedtimes cluster over the
    // baseline window (std dev). The qualifier word IS the judgment, so it matches
    // the value color. Subtext = your 10th-90th percentile range.
    const sortedRangeBeds = [...beds].sort((a, b) => a - b);
    const rPct = (p: number) => sortedRangeBeds.length ? sortedRangeBeds[clamp(Math.round((p / 100) * (sortedRangeBeds.length - 1)), 0, sortedRangeBeds.length - 1)] : null;
    const bedLo = baseline30?.bedLo ?? rPct(10);
    const bedMid = baseline30?.bedMid ?? rPct(50);
    const bedHi = baseline30?.bedHi ?? rPct(90);
    const bedSpread = baseline30?.bedSd ?? bedSd;
    if (bedMid === null) {
      rows.push({ icon: 'time', label: 'Bedtime', value: '—', valueColor: theme.textSecondary, caption: 'Need 2+ nights' });
    } else {
      const color = (bedSpread === null || bedSpread <= 60) ? good : warn;
      const word = bedSpread === null ? undefined : bedSpread <= 30 ? 'Consistent' : bedSpread <= 60 ? 'Mostly steady' : 'Variable';
      const caption = (bedLo !== null && bedHi !== null && bedLo !== bedHi) ? `Range ${fmtBedMin(bedLo)} to ${fmtBedMin(bedHi)}` : undefined;
      rows.push({ icon: 'time', label: 'Bedtime', value: fmtBedMin(bedMid), valueColor: color, delta: word, deltaColor: color, caption });
    }

    // Sleep balance: surplus (green) / deficit (red) / on goal, vs your goal across
    // the viewed range. Magnitude is the value, the word carries the same color.
    let balValue: string, balColor: string, balWord: string | undefined;
    if (Math.abs(debtMs) < 60000) { balValue = 'On goal'; balColor = good; balWord = undefined; }
    else if (debtMs > 0) { balValue = `-${fmtMs(debtMs)}`; balColor = bad; balWord = 'Deficit'; }
    else { balValue = `+${fmtMs(-debtMs)}`; balColor = good; balWord = 'Surplus'; }
    rows.push({ icon: 'bed', label: 'Sleep balance', value: balValue, valueColor: balColor, delta: balWord, deltaColor: balColor, caption: `Goal ${sleepGoal}h · Past ${n} nights` });

    // Avg wake events over the range vs your norm, consistent with the rows above
    // (last night's count + awake time live on the Last Night card). At/below norm =
    // green, up to 2x = amber, above 2x = red. Colored word-badge, no fussy decimal.
    if (withStages.length === 0) {
      rows.push({ icon: 'eye', label: 'Avg wake events', value: '—', valueColor: theme.textSecondary, caption: 'No stage data yet' });
    } else {
      const avgWake = withStages.reduce((a, nt) => a + nt.awakeCount, 0) / withStages.length;
      const avgAwakeMs = withStages.reduce((a, nt) => a + nt.awakeMs, 0) / withStages.length;
      const wakeBase = baseline30 ? Math.round(baseline30.wake) : 3;
      const r1 = Math.round(avgWake * 10) / 10;
      const valStr = Number.isInteger(r1) ? `${r1}` : r1.toFixed(1);
      // Color is the verdict (at/below norm green, up to 2x amber, above 2x red).
      // "events" unit fills the right column; avg awake duration is the subtext.
      const wakeColor = avgWake <= wakeBase ? good : avgWake <= wakeBase * 2 ? warn : bad;
      const awakeCap = avgAwakeMs > 0 ? `${fmtMs(Math.round(avgAwakeMs))} awake` : undefined;
      rows.push({ icon: 'eye', label: 'Avg wake events', value: valStr, valueColor: wakeColor, delta: 'events', deltaColor: neutral, caption: awakeCap });
    }

    return (
      <View style={cardStyle}>
        <Text style={[cardLabel, { marginBottom: 4 }]}>Sleep Metrics</Text>
        {rows.map((r, i) => (
          <View key={r.label} style={{ paddingVertical: 12, borderBottomWidth: i === rows.length - 1 ? 0 : 0.5, borderBottomColor: theme.borderSubtle }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>
                <Ionicons name={r.icon} size={14} color={theme.textMuted} />
                <Text style={{ fontSize: 13, color: theme.textSecondary, fontFamily: 'DMSans_500Medium' }}>{r.label}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, flexShrink: 0 }}>
                <Text style={{ fontSize: 17, color: r.valueColor, fontFamily: 'DMSans_700Bold' }}>{r.value}</Text>
                {r.delta ? <Text style={{ fontSize: 11, color: r.deltaColor, fontFamily: 'DMSans_600SemiBold' }}>{r.delta}</Text> : null}
              </View>
            </View>
            {r.caption ? <Text style={{ fontSize: 11, color: theme.textDim, fontFamily: 'DMSans_400Regular', marginTop: 3 }}>{r.caption}</Text> : null}
          </View>
        ))}
      </View>
    );
  };

  const renderExclude = () => (
    <View style={cardStyle}>
      <Text style={[cardLabel, { marginBottom: 12 }]}>Options</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ flex: 1, paddingRight: 12, fontSize: 13, color: theme.textSecondary, fontFamily: 'DMSans_500Medium' }}>
          Exclude last night from sleep and recovery trends
        </Text>
        <ToggleSwitch value={excludedToday} onValueChange={toggleExclude} />
      </View>
    </View>
  );

  const renderCoach = () => {
    if (filteredHistory.length === 0) return null;
    const last = filteredHistory[filteredHistory.length - 1];
    const score = calcSleepScore(last.totalMs / 3600000, { core: last.coreMs, deep: last.deepMs, rem: last.remMs, totalMs: last.totalMs }, sleepGoal).score ?? 0;
    const beds = filteredHistory.map(n => n.bedMin).filter((b): b is number => b !== null);
    let bedSd: number | null = null;
    if (beds.length >= 2) {
      const m = beds.reduce((a, b) => a + b, 0) / beds.length;
      bedSd = Math.round(Math.sqrt(beds.reduce((a, b) => a + (b - m) ** 2, 0) / beds.length));
    }
    const allowCorrective = !(styleMode === 'mindful' && !mindfulGrowth);
    // AI-voiced sleep tip when ready; deterministic observation as the instant fallback.
    const deterministic = sleepCoachTip(last, score, sleepGoal, bedSd, allowCorrective);
    const body = sleepCoachCache ? resolveTipBody(sleepCoachCache) : deterministic.text;
    return (
      <View style={cardStyle}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <Ionicons name="sparkles" size={11} color={theme.accentBlueRaw} />
          <Text style={cardLabel}>Sleep Coach</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 10, padding: 12, borderRadius: 10, backgroundColor: theme.accentBlueBg }}>
          <Ionicons name="bulb" size={16} color={theme.accentBlueRaw} style={{ marginTop: 1 }} />
          <Text style={{ flex: 1, fontSize: 13, color: theme.textPrimary, fontFamily: 'DMSans_500Medium', lineHeight: 20 }}>{body}</Text>
        </View>
      </View>
    );
  };


  const tabBtn = (id: SleepTab, label: string) => {
    const active = activeTab === id;
    return (
      <TouchableOpacity
        key={id}
        onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setActiveTab(id); }}
        style={{
          flex: 1,
          paddingVertical: 8,
          alignItems: 'center',
          borderRadius: 6,
          backgroundColor: active ? theme.bgCard : 'transparent',
          shadowColor: active ? '#000' : 'transparent',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: active ? 0.15 : 0,
          shadowRadius: 3,
        }}
      >
        <Text style={{ fontSize: 12, color: active ? theme.accentBlueRaw : theme.textMuted, fontFamily: active ? 'DMSans_700Bold' : 'DMSans_500Medium' }}>{label}</Text>
      </TouchableOpacity>
    );
  };

  // Assemble a metric drill-down from the registry content + the user's live
  // standing, so the improve tips reflect their REAL state (SPEC_sleep 13).
  const openDrill = (key: string) => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setDrillKey(key); };
  const buildDrill = (key: string): MetricDrilldownData | null => {
    const content = METRIC_DRILLDOWNS[key];
    if (!content || !recoveryResult) return null;
    const rc = (sc: number) => sc >= 75 ? theme.statusGood : sc >= 55 ? theme.statusWarn : theme.statusBad;
    const sig = adjustedSignals;
    let value = '', reference: string | null = null, statusColor: string = theme.textSecondary;
    let isGood: boolean | null = null;
    if (key === 'hrv' && recoveryResult.hrv) {
      const c = recoveryResult.hrv; value = c.value; isGood = c.isPositive; statusColor = rc(c.score);
      reference = sig?.hrvBaseline != null ? `7-day baseline: ${Math.round(sig.hrvBaseline * 10) / 10}ms` : null;
    } else if (key === 'rhr' && recoveryResult.rhr) {
      const c = recoveryResult.rhr; value = c.value; isGood = c.isPositive; statusColor = rc(c.score);
      reference = sig?.rhrBaseline != null ? `7-day baseline: ${sig.rhrBaseline} bpm` : null;
    } else if (key === 'resp' && recoveryResult.resp) {
      const c = recoveryResult.resp; value = c.value; isGood = c.isPositive; statusColor = rc(c.score);
      reference = sig?.respBaseline != null ? `7-day baseline: ${sig.respBaseline} brpm` : null;
    } else if (key === 'activity' && recoveryResult.activity) {
      const c = recoveryResult.activity; value = c.value; isGood = c.isPositive; statusColor = rc(c.score);
      reference = sig?.activCalBaseline != null ? `7-day baseline: ${sig.activCalBaseline} kcal` : null;
    } else if (key === 'sleepScore' && recoveryResult.sleep) {
      const c = recoveryResult.sleep; value = c.value; isGood = c.score >= 70; statusColor = rc(c.score);
      reference = 'Out of 100';
    } else if (key === 'spo2' && sig?.todaySpO2 != null) {
      value = `${sig.todaySpO2}%`; isGood = null;
      statusColor = sig.todaySpO2 >= 95 ? theme.statusGood : theme.statusWarn;
      reference = 'Healthy range: 95 to 100%';
    } else {
      return null;
    }
    const statusWord = isGood === null ? 'Informational' : isGood ? 'In a healthy range' : 'Worth watching';
    return {
      title: content.title, value, statusWord, statusColor, reference,
      definition: content.definition, calculation: content.calculation, affects: content.affects,
      tips: content.improve(isGood), informationalOnly: content.informationalOnly, disclaimer: content.disclaimer,
    };
  };
  const drillData = drillKey ? buildDrill(drillKey) : null;

  return (
    <LinearGradient colors={[theme.gradientStart, theme.gradientEnd]} style={{ flex: 1, paddingTop: insets.top }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: theme.borderCard }}>
        <TouchableOpacity
          onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
          style={{ width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={16} color={theme.accentBlue} />
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2, color: theme.accentBlueRaw }}>SLEEP & RECOVERY</Text>
        <View style={{ width: 36, alignItems: 'flex-end', justifyContent: 'center' }}>
          <TooltipIcon tooltipKey="sleep_hub" size={20} />
        </View>
      </View>

      {/* Tab pill selector */}
      <View style={{ flexDirection: 'row', marginHorizontal: 12, marginTop: 12, marginBottom: 4, backgroundColor: theme.bgProgressTrack, borderRadius: 8, padding: 4 }}>
        {tabBtn('sleep', 'Sleep')}
        {tabBtn('recovery', 'Recovery')}
      </View>

      {/* Universal range control: pinned in the fixed header on BOTH tabs so it never
          scrolls away. Drives every card AND the recovery baseline window (7d/30d). */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 12, marginTop: 8, marginBottom: 2 }}>
        <Text style={cardLabel}>Viewing Range</Text>
        {rangeToggle()}
      </View>

      {backfilling && (
        <View style={{ marginHorizontal: 12, marginTop: 6, padding: 10, borderRadius: 8, backgroundColor: theme.accentBlueBg, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <ActivityIndicator size="small" color={theme.accentBlueRaw} />
          <Text style={{ fontSize: 12, color: theme.accentBlueRaw, fontFamily: 'DMSans_600SemiBold' }}>{backfilling}</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={{ paddingTop: 8, paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
        {activeTab === 'sleep' ? (
          <>
            {renderHero()}
            {renderTrend()}
            {renderStageHistory()}
            {renderMetrics()}
            {renderCoach()}
            {renderExclude()}
          </>
        ) : renderRecovery()}
      </ScrollView>

      <MetricDrilldownModal visible={drillKey !== null} data={drillData} onClose={() => setDrillKey(null)} />
    </LinearGradient>
  );
}
