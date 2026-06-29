// components/HRZonesStatsCard.tsx
// Stats-tab "Time in Zones" aggregate: total time in each HR zone across the last
// 7 or 30 days of recorded workouts. Self-contained (mounts its own useHealthKit),
// fetches each workout's HR in parallel, sums time-in-zone via the shared engine.
// Garmin-style independent bars matching the per-workout modal. See SPEC_hr_zones.md.

import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../theme';
import TooltipIcon from './TooltipIcon';
import { useHealthKit } from '../useHealthKit';
import { resolveMaxHR, zoneBounds, timeInZones, fmtZoneTime, ageFromBirthday, ZoneBound, MaxHRSource } from '../utils/hrZones';

interface AggData {
  secs: number[];      // Z1..Z5 total seconds
  belowZ1: number;
  workoutCount: number; // workouts that had HR data
  maxHR: number;
  maxHRSource: MaxHRSource;
  model: 'hrr' | 'maxhr';
  restingHR: number | null;
  bounds: ZoneBound[];
}

const SOURCE_LABEL: Record<MaxHRSource, string> = {
  estimated: 'Based on your age',
  observed: 'From your workouts',
  manual: 'Set by you',
};

const fmtTotal = (sec: number) => {
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

export default function HRZonesStatsCard() {
  const { theme } = useTheme();
  const { hasHealthData, fetchWorkoutWindows, fetchWorkoutHeartRate } = useHealthKit();
  const [period, setPeriod] = useState<7 | 30>(7);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AggData | null>(null);
  const barProgress = useRef(new Animated.Value(0)).current;
  const [trackW, setTrackW] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const windows = await fetchWorkoutWindows(period);
        if (!windows.length) { if (!cancelled) { setData(null); setLoading(false); } return; }
        const prof = await AsyncStorage.getItem('pj_profile');
        const age = ageFromBirthday(prof ? JSON.parse(prof).birthday : null);
        const settingsRaw = await AsyncStorage.getItem('pj_settings');
        const sd = settingsRaw ? JSON.parse(settingsRaw) : {};
        const manualOverride = sd.hrMaxOverride ?? null;
        const model: 'hrr' | 'maxhr' = sd.hrZoneModel === 'maxhr' ? 'maxhr' : 'hrr';
        const storedPeak = typeof sd.hrObservedPeak === 'number' ? sd.hrObservedPeak : null;
        // Resting HR: latest frozen overnight value, walking back up to 14 days.
        let restingHR: number | null = null;
        const now = new Date();
        for (let i = 0; i < 14 && restingHR === null; i++) {
          const d = new Date(now); d.setDate(now.getDate() - i);
          const key = `pj_${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          try {
            const raw = await AsyncStorage.getItem(key);
            const rhr = raw ? JSON.parse(raw)?.recoverySignals?.rhr : null;
            if (typeof rhr === 'number' && rhr > 0) restingHR = rhr;
          } catch {}
        }
        // Fetch all workouts' HR in parallel.
        const allSamples = await Promise.all(windows.map(w => fetchWorkoutHeartRate(w.startMs, w.endMs)));
        let observedPeak = storedPeak ?? 0;
        for (const s of allSamples) for (const p of s) if (p.v > observedPeak) observedPeak = p.v;
        const { value: maxHR, source } = resolveMaxHR({ age, manualOverride, observedPeak: observedPeak || null });
        if (!maxHR) { if (!cancelled) { setData(null); setLoading(false); } return; }
        const bounds = zoneBounds(maxHR, restingHR, model);
        const secs = [0, 0, 0, 0, 0];
        let belowZ1 = 0;
        let workoutCount = 0;
        for (const s of allSamples) {
          if (!s.length) continue;
          workoutCount++;
          const r = timeInZones(s, bounds);
          for (let i = 0; i < 5; i++) secs[i] += r.secs[i];
          belowZ1 += r.belowZ1;
        }
        if (!cancelled) {
          setData(workoutCount > 0 ? { secs, belowZ1, workoutCount, maxHR, maxHRSource: source, model, restingHR, bounds } : null);
          setLoading(false);
        }
      } catch {
        if (!cancelled) { setData(null); setLoading(false); }
      }
    };
    run();
    return () => { cancelled = true; };
  }, [period, hasHealthData]);

  useEffect(() => {
    if (data && !loading && trackW > 0) {
      barProgress.setValue(0);
      Animated.timing(barProgress, { toValue: 1, duration: 650, useNativeDriver: false }).start();
    }
  }, [data, loading, trackW]);

  const rows = data ? [
    ...data.bounds.map((b, i) => ({ key: `z${b.z}`, label: `Z${b.z} ${b.name}`, range: `${b.lo}-${b.hi} bpm`, color: b.color, sec: data.secs[i] ?? 0 })).reverse(),
    { key: 'below', label: 'Below Zone', range: `under ${data.bounds[0]?.lo ?? 0} bpm`, color: theme.textDim, sec: data.belowZ1 },
  ] : [];
  // Bars show each zone's SHARE of total tracked time (bars sum to 100%), so "full"
  // means a real fraction of your time, not just "longest bar wins."
  const totalSec = Math.max(1, rows.reduce((a, r) => a + r.sec, 0));
  const usingKarvonen = data?.model === 'hrr' && data.restingHR != null;

  const Toggle = () => (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {([7, 30] as const).map(p => (
        <TouchableOpacity
          key={p}
          onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setPeriod(p); }}
          style={{
            paddingHorizontal: 12, paddingVertical: 5, borderRadius: 6, borderWidth: 1,
            borderColor: period === p ? theme.accentBlueBorder : theme.borderInput,
            backgroundColor: period === p ? theme.accentBlueBg : theme.bgInput,
          }}>
          <Text style={{ fontSize: 11, fontFamily: 'DMSans_700Bold', color: period === p ? theme.accentBlue : theme.textMuted }}>{p}D</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View style={{ backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: theme.accentBlueRaw, borderWidth: 0.5, borderTopWidth: 0.5, borderRadius: 14, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 12, elevation: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 }}>
          <Text style={{ fontSize: 9, letterSpacing: 3, color: theme.textMuted, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase' }}>
            {data ? `${data.workoutCount} Workout${data.workoutCount === 1 ? '' : 's'}` : 'Heart Rate Zones'}
          </Text>
          <TooltipIcon tooltipKey="hr_zones" size={13} />
        </View>
        <Toggle />
      </View>

      {loading ? (
        <View style={{ paddingVertical: 30, alignItems: 'center' }}>
          <ActivityIndicator color={theme.accentBlueRaw} />
          <Text style={{ marginTop: 10, fontSize: 12, fontFamily: 'DMSans_400Regular', color: theme.textMuted }}>Reading your workouts…</Text>
        </View>
      ) : !data ? (
        <View style={{ paddingVertical: 24, alignItems: 'center' }}>
          <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: theme.textDim + '1A', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
            <Ionicons name="pulse" size={24} color={theme.textMuted} />
          </View>
          <Text style={{ fontSize: 13, fontFamily: 'DMSans_700Bold', color: theme.textSecondary, marginBottom: 4 }}>No workout heart rate yet</Text>
          <Text style={{ fontSize: 11, lineHeight: 16, fontFamily: 'DMSans_400Regular', color: theme.textMuted, textAlign: 'center', paddingHorizontal: 16 }}>
            Record a workout with a smartwatch or fitness tracker and your zone time will show up here.
          </Text>
        </View>
      ) : (
        <>
          {rows.map(r => {
            const pct = Math.round((r.sec / totalSec) * 100);
            return (
              <View key={r.key} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <View style={{ width: 96, paddingRight: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: r.color }} />
                    <Text style={{ fontSize: 12, fontFamily: 'DMSans_600SemiBold', color: theme.textSecondary }} numberOfLines={1}>{r.label}</Text>
                  </View>
                  <Text style={{ fontSize: 9.5, fontFamily: 'DMSans_400Regular', color: theme.textMuted, marginLeft: 13 }}>{r.range}</Text>
                </View>
                <View
                  style={{ flex: 1, height: 10, borderRadius: 5, backgroundColor: theme.bgProgressTrack, overflow: 'hidden' }}
                  onLayout={e => { if (trackW === 0) setTrackW(e.nativeEvent.layout.width); }}
                >
                  <Animated.View style={{ height: '100%', borderRadius: 5, backgroundColor: r.color, width: trackW > 0 ? barProgress.interpolate({ inputRange: [0, 1], outputRange: [0, trackW * pct / 100] }) : 0 }} />
                </View>
                <View style={{ width: 56, alignItems: 'flex-end', paddingLeft: 6 }}>
                  <Text style={{ fontSize: 16, fontFamily: 'BebasNeue_400Regular', letterSpacing: 0.5, color: r.sec > 0 ? theme.textPrimary : theme.textDim }}>{fmtZoneTime(r.sec)}</Text>
                  <Text style={{ fontSize: 10, fontFamily: 'DMSans_500Medium', color: theme.textMuted }}>{pct}%</Text>
                </View>
              </View>
            );
          })}
          <View style={{ marginTop: 6, borderTopWidth: 0.5, borderTopColor: theme.borderCard, paddingTop: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: 6 }}>
              <Text style={{ width: 66, fontSize: 11, letterSpacing: 0.3, fontFamily: 'DMSans_700Bold', color: theme.textMuted }}>Max HR</Text>
              <Text style={{ flex: 1, fontSize: 13, fontFamily: 'DMSans_500Medium', color: theme.textSecondary }}>{data.maxHR} bpm · {SOURCE_LABEL[data.maxHRSource]}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
              <Text style={{ width: 66, fontSize: 11, letterSpacing: 0.3, fontFamily: 'DMSans_700Bold', color: theme.textMuted }}>Zones</Text>
              <Text style={{ flex: 1, fontSize: 13, fontFamily: 'DMSans_500Medium', color: theme.textSecondary }}>{usingKarvonen ? `Personalized to your resting HR (${data.restingHR})` : 'Based on your max HR'}</Text>
            </View>
            <Text style={{ fontSize: 10.5, fontFamily: 'DMSans_400Regular', color: theme.textDim, marginTop: 10, fontStyle: 'italic', textAlign: 'center' }}>
              For informational purposes only. Not medical advice.
            </Text>
          </View>
        </>
      )}
    </View>
  );
}
