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
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Dimensions, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import ReAnimated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, G, Line, Polyline, Rect, Text as SvgText } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SleepDonut from '../components/SleepDonut';
import { triggerHaptic } from '../utils/haptics';
import { calcSleepScore } from '../utils/sleepScore';
import { useHealthKit } from '../useHealthKit';
import { useTheme } from '../theme';

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

// Sleep Score trend line: y-axis 0-100, x-axis dates, tap a point for that night.
function ScoreTrendChart({ nights, scores, color, theme }: { nights: SleepNight[]; scores: number[]; color: string; theme: any }) {
  const [callout, setCallout] = useState<Callout>(null);
  const slide = useSlideIn(`${scores.length}:${nights[0]?.dateKey ?? ''}`);
  const n = scores.length;
  if (n === 0) return null;
  const ticks = [0, 25, 50, 75, 100];
  const toX = (i: number) => C_LEFT + (n === 1 ? PLOT_W / 2 : (i / (n - 1)) * PLOT_W);
  const toY = (v: number) => C_TOP + (1 - Math.max(0, Math.min(100, v)) / 100) * PLOT_H;
  const pts = scores.map((s, i) => `${toX(i)},${toY(s)}`).join(' ');
  const midIdx = Math.floor(n / 2);
  return (
    <ReAnimated.View style={slide}>
      <Svg width={CHART_W} height={CHART_H}>
        <Rect x={0} y={0} width={CHART_W} height={CHART_H} fill="transparent" onPress={() => setCallout(null)} />
        {ticks.map(t => (
          <Line key={`g${t}`} x1={C_LEFT} y1={toY(t)} x2={C_LEFT + PLOT_W} y2={toY(t)} stroke={theme.borderSubtle} strokeWidth={1} />
        ))}
        {ticks.map(t => (
          <SvgText key={`y${t}`} x={C_LEFT - 5} y={toY(t) + 3} fill={theme.textDim} fontSize={8} fontFamily="DMSans_500Medium" textAnchor="end">{t}</SvgText>
        ))}
        <Polyline points={pts} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {scores.map((s, i) => <Circle key={`d${i}`} cx={toX(i)} cy={toY(s)} r={3} fill={color} />)}
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
  const [callout, setCallout] = useState<Callout>(null);
  const slide = useSlideIn(`${nights.length}:${nights[0]?.dateKey ?? ''}`);
  const n = nights.length;
  if (n === 0) return null;
  const barMs = nights.map(nt => nt.totalMs + nt.awakeMs);
  const maxMs = Math.max(...barMs, 1);
  const maxH = Math.max(1, Math.ceil(maxMs / 3600000));
  const step = maxH <= 4 ? 1 : maxH <= 9 ? 2 : 3;
  const ticks: number[] = [];
  for (let h = 0; h <= maxH; h += step) ticks.push(h);
  if (ticks[ticks.length - 1] !== maxH) ticks.push(maxH);
  const tickMaxMs = maxH * 3600000;
  const toY = (ms: number) => C_TOP + (1 - ms / tickMaxMs) * PLOT_H;
  const slot = PLOT_W / n;
  const BAR_W = Math.min(28, slot - 4);
  const midIdx = Math.floor(n / 2);
  return (
    <ReAnimated.View style={slide}>
      <Svg width={CHART_W} height={CHART_H}>
        <Rect x={0} y={0} width={CHART_W} height={CHART_H} fill="transparent" onPress={() => setCallout(null)} />
        {ticks.map(h => (
          <Line key={`g${h}`} x1={C_LEFT} y1={toY(h * 3600000)} x2={C_LEFT + PLOT_W} y2={toY(h * 3600000)} stroke={theme.borderSubtle} strokeWidth={1} />
        ))}
        {ticks.map(h => (
          <SvgText key={`y${h}`} x={C_LEFT - 5} y={toY(h * 3600000) + 3} fill={theme.textDim} fontSize={8} fontFamily="DMSans_500Medium" textAnchor="end">{h}h</SvgText>
        ))}
        {nights.map((nt, i) => {
          const x = C_LEFT + i * slot + (slot - BAR_W) / 2;
          const segs = [
            { c: theme.sleepDeep, ms: nt.deepMs },
            { c: theme.sleepCore, ms: nt.coreMs },
            { c: theme.sleepRem, ms: nt.remMs },
            { c: theme.sleepAwake, ms: nt.awakeMs },
          ];
          let acc = 0;
          return (
            <G key={nt.dateKey}>
              {segs.map((s, si) => {
                if (s.ms <= 0) return null;
                const segH = (s.ms / tickMaxMs) * PLOT_H;
                const y = C_TOP + PLOT_H - ((acc + s.ms) / tickMaxMs) * PLOT_H;
                acc += s.ms;
                return <Rect key={si} x={x} y={y} width={BAR_W} height={segH} fill={s.c} rx={si === segs.length - 1 ? 2 : 0} />;
              })}
              <Rect x={x} y={C_TOP} width={BAR_W} height={PLOT_H} fill="transparent"
                onPress={() => setCallout(prev => prev?.label1 === fmtDay(nt.dateKey) ? null : { x: x + BAR_W / 2, y: toY(barMs[i]), label1: fmtDay(nt.dateKey), label2: `${fmtMs(nt.totalMs)} sleep` })} />
            </G>
          );
        })}
        <SvgText x={C_LEFT + slot / 2} y={CHART_H - 4} fill={theme.textDim} fontSize={8} fontFamily="DMSans_500Medium" textAnchor="middle">{fmtDay(nights[0].dateKey)}</SvgText>
        {n > 3 && <SvgText x={C_LEFT + midIdx * slot + slot / 2} y={CHART_H - 4} fill={theme.textDim} fontSize={8} fontFamily="DMSans_500Medium" textAnchor="middle">{fmtDay(nights[midIdx].dateKey)}</SvgText>}
        <SvgText x={C_LEFT + (n - 1) * slot + slot / 2} y={CHART_H - 4} fill={theme.textDim} fontSize={8} fontFamily="DMSans_500Medium" textAnchor="middle">{fmtDay(nights[n - 1].dateKey)}</SvgText>
        {callout && <CalloutPill callout={callout} theme={theme} clear={() => setCallout(null)} />}
      </Svg>
    </ReAnimated.View>
  );
}

export default function SleepHub() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { sleepHours, sleepStages, sleepTimes, sleepAwakeMs, fetchSleepHistory } = useHealthKit();

  const [activeTab, setActiveTab] = useState<SleepTab>('sleep');
  const [range, setRange] = useState<'7' | '30'>('7');
  const [history, setHistory] = useState<SleepNight[]>([]);
  const [loadingHist, setLoadingHist] = useState(true);

  // Day-stored sleep fields (mirror how the home card resolves the same number)
  const [sleepGoal, setSleepGoal] = useState(7);
  const [sleepOverride, setSleepOverride] = useState<number | null>(null);
  const [sleepFeelRating, setSleepFeelRating] = useState<number | null>(null);
  const [sleepConsistencyPts, setSleepConsistencyPts] = useState(0);
  const [storedBed, setStoredBed] = useState<string | null>(null);
  const [storedWake, setStoredWake] = useState<string | null>(null);

  // Bumped on focus so the donut re-animates each time the screen is entered.
  const [refreshKey, setRefreshKey] = useState(0);
  useFocusEffect(useCallback(() => { setRefreshKey(k => k + 1); }, []));

  useEffect(() => {
    let cancelled = false;
    setLoadingHist(true);
    fetchSleepHistory(parseInt(range, 10))
      .then(h => { if (!cancelled) { setHistory(h); setLoadingHist(false); } })
      .catch(() => { if (!cancelled) setLoadingHist(false); });
    return () => { cancelled = true; };
  }, [range]);

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
      } catch {}
    })();
  }, []);

  const displaySleep = sleepOverride ?? sleepHours;
  const isManual = !!sleepOverride;
  const { score } = calcSleepScore(displaySleep, sleepStages, sleepGoal, sleepFeelRating, isManual, sleepConsistencyPts);
  const scoreColor = score !== null ? (score >= 85 ? theme.statusGood : score >= 70 ? theme.statusWarn : theme.statusBad) : theme.textDim;
  const scoreLabel = score !== null ? (score >= 85 ? 'Well Rested' : score >= 70 ? 'Could Be Better' : 'Poor Sleep') : null;

  const cardStyle = {
    backgroundColor: theme.bgCard,
    borderWidth: 0.5,
    borderColor: theme.borderCard,
    borderTopColor: theme.borderCardTop,
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
    const goalPct = sleepGoal > 0 ? Math.round((displaySleep / sleepGoal) * 100) : 0;

    const totalMs = sleepStages?.totalMs || displaySleep * 3600000;
    const coreMs = sleepStages?.core || 0;
    const deepMs = sleepStages?.deep || 0;
    const remMs = sleepStages?.rem || 0;
    const corePct = totalMs > 0 ? coreMs / totalMs : 0;
    const deepPct = totalMs > 0 ? deepMs / totalMs : 0;
    const remPct = totalMs > 0 ? remMs / totalMs : 0;

    const donutSize = 140, donutStroke = 16, donutRadius = (donutSize - donutStroke) / 2;
    const donutCirc = 2 * Math.PI * donutRadius;
    const coreFrac = corePct * donutCirc, deepFrac = deepPct * donutCirc, remFrac = remPct * donutCirc;
    const gapFrac = 0.03 * donutCirc;

    const legend: { label: string; color: string; val: number }[] = [
      { label: 'Core', color: theme.sleepCore, val: coreMs },
      { label: 'Deep', color: theme.sleepDeep, val: deepMs },
      { label: 'REM', color: theme.sleepRem, val: remMs },
    ];
    if (sleepAwakeMs > 0) legend.push({ label: 'Awake', color: theme.sleepAwake, val: sleepAwakeMs });

    return (
      <View style={cardStyle}>
        <Text style={{ fontSize: 9, letterSpacing: 3, color: theme.textMuted, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase', marginBottom: 12 }}>
          Sleep Score
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <View style={{ shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 0 }}>
              <Text style={{ fontSize: 44, color: scoreColor, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1, opacity: 0.9 }}>{hrs}h {mins}m</Text>
            </View>
            <Text style={{ fontSize: 9, color: scoreLabel ? scoreColor : theme.textDim, fontFamily: 'DMSans_700Bold', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>
              {scoreLabel ? `${scoreLabel}${isManual ? ' · manual' : ''}` : isManual ? 'MANUAL' : 'HEALTHKIT'}
            </Text>
            {((storedBed && storedWake) || sleepTimes) && (
              <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'DMSans_500Medium', marginBottom: sleepAwakeMs > 0 ? 4 : 10 }}>
                {storedBed || sleepTimes?.bed} → {storedWake || sleepTimes?.wake}
              </Text>
            )}
            {sleepAwakeMs > 0 && (
              <Text style={{ fontSize: 11, color: theme.textDim, fontFamily: 'DMSans_400Regular', marginBottom: 10 }}>{fmtMs(sleepAwakeMs)} awake during night</Text>
            )}
            <Text style={{ fontSize: 11, color: theme.textMuted, fontFamily: 'DMSans_500Medium', marginBottom: 12 }}>
              Goal {sleepGoal}h · {goalPct}%
            </Text>
            {sleepStages && (
              <View style={{ gap: 6 }}>
                {legend.map(s => (
                  <View key={s.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: s.color }} />
                    <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: 'DMSans_700Bold', letterSpacing: 1, textTransform: 'uppercase', width: 42 }}>{s.label}</Text>
                    <Text style={{ fontSize: 11, color: s.color, fontFamily: 'DMSans_600SemiBold' }}>{fmtMs(s.val)}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
          {sleepStages && score !== null && (
            <SleepDonut
              coreFrac={coreFrac} deepFrac={deepFrac} remFrac={remFrac}
              donutCirc={donutCirc} donutSize={donutSize} donutStroke={donutStroke} donutRadius={donutRadius}
              coreColor={theme.sleepCore} deepColor={theme.sleepDeep} remColor={theme.sleepRem}
              trackColor={theme.sleepTrack} gapFrac={gapFrac} refreshKey={refreshKey}
              score={score} scoreColor={scoreColor}
              shimmer={score >= 85}
            />
          )}
        </View>
        <Text style={{ fontSize: 10, color: theme.textDim, fontFamily: 'DMSans_400Regular', marginTop: 14, textAlign: 'center' }}>
          For informational purposes only. Not medical advice.
        </Text>
      </View>
    );
  };

  const renderRecoveryPlaceholder = () => (
    <View style={[cardStyle, { alignItems: 'center', paddingVertical: 32 }]}>
      <Ionicons name="pulse-outline" size={34} color={theme.iconMuted} />
      <Text style={{ fontSize: 15, color: theme.textPrimary, fontFamily: 'DMSans_700Bold', marginTop: 10 }}>Recovery Score</Text>
      <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'DMSans_400Regular', marginTop: 6, textAlign: 'center', lineHeight: 18 }}>
        How ready your body is to perform today, built from HRV, resting heart rate, sleep, and yesterday's strain. Landing in an upcoming build.
      </Text>
    </View>
  );

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
    () => history.map(nt => calcSleepScore(nt.totalMs / 3600000, { core: nt.coreMs, deep: nt.deepMs, rem: nt.remMs, totalMs: nt.totalMs }, sleepGoal).score ?? 0),
    [history, sleepGoal],
  );

  const renderTrend = () => {
    const avg = nightScores.length ? Math.round(nightScores.reduce((a, b) => a + b, 0) / nightScores.length) : null;
    return (
      <View style={cardStyle}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <Text style={cardLabel}>Sleep Score Trend</Text>
          {rangeToggle()}
        </View>
        {loadingHist ? (
          <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'DMSans_400Regular', paddingVertical: 24, textAlign: 'center' }}>Loading…</Text>
        ) : nightScores.length === 0 ? (
          <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'DMSans_400Regular', paddingVertical: 24, textAlign: 'center' }}>
            No sleep history yet for this range. Stages sync from Apple Health.
          </Text>
        ) : (
          <>
            <ScoreTrendChart nights={history} scores={nightScores} color={theme.accentBlueRaw} theme={theme} />
            {avg !== null && (
              <Text style={{ fontSize: 11, color: theme.textMuted, fontFamily: 'DMSans_500Medium', marginTop: 8 }}>
                {nightScores.length} {nightScores.length === 1 ? 'night' : 'nights'} · avg score {avg} · tap a point for that night
              </Text>
            )}
          </>
        )}
      </View>
    );
  };

  const renderStageHistory = () => {
    const legend = [
      { label: 'Core', color: theme.sleepCore },
      { label: 'Deep', color: theme.sleepDeep },
      { label: 'REM', color: theme.sleepRem },
      { label: 'Awake', color: theme.sleepAwake },
    ];
    return (
      <View style={cardStyle}>
        <Text style={[cardLabel, { marginBottom: 12 }]}>Sleep Stages</Text>
        {loadingHist ? (
          <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'DMSans_400Regular', paddingVertical: 24, textAlign: 'center' }}>Loading…</Text>
        ) : history.length === 0 ? (
          <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'DMSans_400Regular', paddingVertical: 24, textAlign: 'center' }}>
            No stage history yet for this range.
          </Text>
        ) : (
          <>
            <StageHistoryChart nights={history} theme={theme} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 12 }}>
              {legend.map(l => (
                <View key={l.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: l.color }} />
                  <Text style={{ fontSize: 10, color: theme.textMuted, fontFamily: 'DMSans_600SemiBold', letterSpacing: 0.5, textTransform: 'uppercase' }}>{l.label}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </View>
    );
  };

  const renderMetrics = () => {
    if (loadingHist || history.length === 0) return null;

    const last = history[history.length - 1];
    const withStages = history.filter(n => n.totalMs > 0);
    const avgDeepPct = withStages.length ? Math.round(withStages.reduce((a, n) => a + n.deepMs / n.totalMs, 0) / withStages.length * 100) : null;
    const avgRemPct = withStages.length ? Math.round(withStages.reduce((a, n) => a + n.remMs / n.totalMs, 0) / withStages.length * 100) : null;

    const beds = history.map(n => n.bedMin).filter((b): b is number => b !== null);
    let consistency: { label: string; sub: string; color: string } | null = null;
    if (beds.length >= 2) {
      const mean = beds.reduce((a, b) => a + b, 0) / beds.length;
      const sd = Math.round(Math.sqrt(beds.reduce((a, b) => a + (b - mean) ** 2, 0) / beds.length));
      consistency = {
        label: sd <= 30 ? 'Consistent' : sd <= 60 ? 'Mostly steady' : 'Variable',
        sub: `± ${sd}m bedtime`,
        color: sd <= 30 ? theme.statusGood : sd <= 60 ? theme.statusWarn : theme.statusBad,
      };
    }

    const wakeColor = last.awakeCount >= 4 ? theme.statusWarn : theme.textSecondary;

    const tile = (label: string, value: string, color: string, sub: string, numeric = true) => (
      <View style={{ flex: 1, backgroundColor: theme.bgInset, borderRadius: 10, borderWidth: 0.5, borderColor: theme.borderInset, padding: 12 }}>
        <Text style={{ fontSize: 9, letterSpacing: 1.5, color: theme.textMuted, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase', marginBottom: 6 }}>{label}</Text>
        {numeric
          ? <Text style={{ fontSize: 24, color, fontFamily: 'BebasNeue_400Regular', letterSpacing: 0.5 }}>{value}</Text>
          : <Text style={{ fontSize: 15, color, fontFamily: 'DMSans_700Bold', letterSpacing: 0.3, marginVertical: 3 }}>{value}</Text>}
        <Text style={{ fontSize: 10, color: theme.textDim, fontFamily: 'DMSans_400Regular', marginTop: 2 }}>{sub}</Text>
      </View>
    );

    return (
      <View style={cardStyle}>
        <Text style={[cardLabel, { marginBottom: 12 }]}>Sleep Metrics</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
          {tile('Wake Events', String(last.awakeCount), wakeColor, 'last night')}
          {tile('Bedtime', consistency ? consistency.label : '—', consistency ? consistency.color : theme.textSecondary, consistency ? consistency.sub : `${range}d range`, false)}
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {tile('Avg Deep', avgDeepPct !== null ? `${avgDeepPct}%` : '—', theme.sleepDeep, `${range}d average`)}
          {tile('Avg REM', avgRemPct !== null ? `${avgRemPct}%` : '—', theme.sleepRem, `${range}d average`)}
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
        <Text style={{ fontSize: 12, color: active ? theme.textPrimary : theme.textMuted, fontFamily: active ? 'DMSans_700Bold' : 'DMSans_500Medium' }}>{label}</Text>
      </TouchableOpacity>
    );
  };

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
        <View style={{ width: 36 }} />
      </View>

      {/* Tab pill selector */}
      <View style={{ flexDirection: 'row', marginHorizontal: 12, marginTop: 12, marginBottom: 4, backgroundColor: theme.bgProgressTrack, borderRadius: 8, padding: 4 }}>
        {tabBtn('sleep', 'Sleep')}
        {tabBtn('recovery', 'Recovery')}
      </View>

      <ScrollView contentContainerStyle={{ paddingTop: 8, paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
        {activeTab === 'sleep' ? (
          <>
            {renderHero()}
            {renderTrend()}
            {renderStageHistory()}
            {renderMetrics()}
          </>
        ) : renderRecoveryPlaceholder()}
      </ScrollView>
    </LinearGradient>
  );
}
