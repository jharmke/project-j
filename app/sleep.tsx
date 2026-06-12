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
import ReAnimated, { useAnimatedProps, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
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

const AnimPath = ReAnimated.createAnimatedComponent(Path);

// Sleep Score trend line. Animates a left-to-right draw-in on each data change.
function ScoreTrend({ scores, color }: { scores: number[]; color: string }) {
  const W = Dimensions.get('window').width - 24 - 32; // screen minus card margins (24) and padding (32)
  const H = 88;
  const n = scores.length;
  const { d, len } = useMemo(() => {
    if (n === 0) return { d: '', len: 0 };
    const pts = scores.map((s, i) => ({
      x: n === 1 ? W / 2 : (i / (n - 1)) * W,
      y: H - (Math.max(0, Math.min(100, s)) / 100) * (H - 8) - 4,
    }));
    let path = `M ${pts[0].x} ${pts[0].y}`;
    let length = 0;
    for (let i = 1; i < pts.length; i++) {
      path += ` L ${pts[i].x} ${pts[i].y}`;
      length += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    }
    return { d: path, len: length };
  }, [scores]);

  const prog = useSharedValue(0);
  useEffect(() => { prog.value = 0; prog.value = withTiming(1, { duration: 900 }); }, [d]);
  const animProps = useAnimatedProps(() => ({ strokeDashoffset: len * (1 - prog.value) }));

  if (!d) return null;
  return (
    <Svg width={W} height={H}>
      <AnimPath d={d} stroke={color} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round"
        strokeDasharray={len} animatedProps={animProps} />
    </Svg>
  );
}

// One night's stacked stage bar. Grows up from zero, staggered by index.
function NightBar({ segs, totalFrac, maxH, idx }: { segs: { color: string; ms: number }[]; totalFrac: number; maxH: number; idx: number }) {
  const h = useSharedValue(0);
  useEffect(() => { h.value = 0; h.value = withDelay(idx * 22, withTiming(Math.max(2, totalFrac * maxH), { duration: 500 })); }, [totalFrac, maxH]);
  const style = useAnimatedStyle(() => ({ height: h.value }));
  return (
    <ReAnimated.View style={[{ width: '100%', borderRadius: 3, overflow: 'hidden', flexDirection: 'column' }, style]}>
      {segs.filter(s => s.ms > 0).map((s, i) => (
        <View key={i} style={{ flex: s.ms, backgroundColor: s.color }} />
      ))}
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
            <ScoreTrend scores={nightScores} color={theme.accentBlueRaw} />
            {avg !== null && (
              <Text style={{ fontSize: 11, color: theme.textMuted, fontFamily: 'DMSans_500Medium', marginTop: 8 }}>
                {nightScores.length} {nightScores.length === 1 ? 'night' : 'nights'} · avg score {avg}
              </Text>
            )}
          </>
        )}
      </View>
    );
  };

  const renderStageHistory = () => {
    const barAreaH = 110;
    const withBars = history.map(nt => ({ ...nt, barMs: nt.totalMs + nt.awakeMs }));
    const maxBar = withBars.reduce((m, n) => Math.max(m, n.barMs), 0);
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
        ) : withBars.length === 0 ? (
          <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'DMSans_400Regular', paddingVertical: 24, textAlign: 'center' }}>
            No stage history yet for this range.
          </Text>
        ) : (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: barAreaH, gap: range === '7' ? 8 : 3 }}>
              {withBars.map((nt, i) => (
                <View key={nt.dateKey} style={{ flex: 1, height: barAreaH, justifyContent: 'flex-end' }}>
                  <NightBar
                    idx={i}
                    maxH={barAreaH}
                    totalFrac={maxBar > 0 ? nt.barMs / maxBar : 0}
                    segs={[
                      { color: theme.sleepAwake, ms: nt.awakeMs },
                      { color: theme.sleepRem, ms: nt.remMs },
                      { color: theme.sleepCore, ms: nt.coreMs },
                      { color: theme.sleepDeep, ms: nt.deepMs },
                    ]}
                  />
                </View>
              ))}
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 14 }}>
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
    let consistency: { label: string; sub: string } | null = null;
    if (beds.length >= 2) {
      const mean = beds.reduce((a, b) => a + b, 0) / beds.length;
      const sd = Math.round(Math.sqrt(beds.reduce((a, b) => a + (b - mean) ** 2, 0) / beds.length));
      consistency = {
        label: sd <= 30 ? 'Consistent' : sd <= 60 ? 'Mostly steady' : 'Variable',
        sub: `± ${sd}m bedtime`,
      };
    }

    const tile = (label: string, value: string, sub?: string) => (
      <View style={{ flex: 1, backgroundColor: theme.bgInset, borderRadius: 10, borderWidth: 0.5, borderColor: theme.borderInset, padding: 12 }}>
        <Text style={{ fontSize: 9, letterSpacing: 1.5, color: theme.textMuted, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase', marginBottom: 6 }}>{label}</Text>
        <Text style={{ fontSize: 22, color: theme.textPrimary, fontFamily: 'BebasNeue_400Regular', letterSpacing: 0.5 }}>{value}</Text>
        {sub ? <Text style={{ fontSize: 10, color: theme.textDim, fontFamily: 'DMSans_400Regular', marginTop: 2 }}>{sub}</Text> : null}
      </View>
    );

    return (
      <View style={cardStyle}>
        <Text style={[cardLabel, { marginBottom: 12 }]}>Sleep Metrics</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
          {tile('Wake Events', last.awakeCount > 0 ? String(last.awakeCount) : '0', 'last night')}
          {tile('Bedtime', consistency ? consistency.label : '—', consistency ? consistency.sub : `${range}d range`)}
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {tile('Avg Deep', avgDeepPct !== null ? `${avgDeepPct}%` : '—', `${range}d average`)}
          {tile('Avg REM', avgRemPct !== null ? `${avgRemPct}%` : '—', `${range}d average`)}
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
