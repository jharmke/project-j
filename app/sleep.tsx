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
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
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

export default function SleepHub() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { sleepHours, sleepStages, sleepTimes, sleepAwakeMs } = useHealthKit();

  const [activeTab, setActiveTab] = useState<SleepTab>('sleep');

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
        {activeTab === 'sleep' ? renderHero() : renderRecoveryPlaceholder()}
      </ScrollView>
    </LinearGradient>
  );
}
