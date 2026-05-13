import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';

// ─── Types ────────────────────────────────────────────────────────────────────
type MetricId = 'net' | 'steps' | 'sleepScore' | 'water' | 'weight' | 'activeCals' | 'sleepHours';
type Result = 'win' | 'lose' | 'tie';

interface DaySnapshot {
  net: number | null;
  steps: number | null;
  sleepScore: number | null;
  sleepHours: number | null;
  water: number | null;
  activeCals: number | null;
  weight: number | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function calcSleepScore(
  sleepHours: number | null,
  sleepStages: { core: number; deep: number; rem: number; totalMs: number } | null,
  sleepGoal: number
): { score: number; hasStages: boolean } {
  if (!sleepHours || sleepHours <= 0) return { score: 0, hasStages: false };
  const durationPts = Math.min(40, (sleepHours / sleepGoal) * 40);
  if (!sleepStages || sleepStages.totalMs <= 0) {
    return { score: Math.round(Math.min(60, durationPts * 1.5)), hasStages: false };
  }
  const totalMs = sleepStages.totalMs;
  const deepPct = sleepStages.deep / totalMs;
  const remPct = sleepStages.rem / totalMs;
  const deepIdeal = 0.20;
  const deepDiff = Math.abs(deepPct - deepIdeal);
  const deepPts = Math.max(0, 30 - (deepDiff / deepIdeal) * 30);
  const remIdeal = 0.22;
  const remDiff = Math.abs(remPct - remIdeal);
  const remPts = Math.max(0, 30 - (remDiff / remIdeal) * 30);
  return { score: Math.round(durationPts + deepPts + remPts), hasStages: true };
}

function fmt(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function displayDate(key: string): string {
  const d = parseKey(key);
  const today = fmt(new Date());
  const yesterday = fmt(new Date(Date.now() - 86400000));
  if (key === today) return 'Today';
  if (key === yesterday) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

async function loadSnapshot(dateKey: string, sleepGoal: number, calTarget: number, weightGoalPace: string, profileBmr: number): Promise<DaySnapshot> {
  const snap: DaySnapshot = { net: null, steps: null, sleepScore: null, sleepHours: null, water: null, activeCals: null, weight: null };
  try {
    const raw = await AsyncStorage.getItem(`pj_${dateKey}`);
    if (!raw) return snap;
    const d = JSON.parse(raw);

    // Net calories
    if (d.entries && Array.isArray(d.entries)) {
      const consumed = d.entries.reduce((s: number, e: any) => s + e.cal, 0);
      const burned = d.activeCalories || d.caloriesBurned || 0;
      if (consumed >= 400) snap.net = consumed - burned - (profileBmr ?? 0);
    }

    // Steps
    if (d.steps) snap.steps = d.steps;

    // Water
    if (typeof d.water === 'number') snap.water = d.water;

    // Active cals
    if (d.activeCalories) snap.activeCals = d.activeCalories;
    else if (d.caloriesBurned) snap.activeCals = d.caloriesBurned;

    // Weight
    if (d.weight) snap.weight = d.weight;

    // Sleep
    const hours = d.sleepOverride || d.sleepHours || null;
    if (hours) {
      snap.sleepHours = hours;
      const stages = d.sleepStages || null;
      const { score, hasStages } = calcSleepScore(hours, stages, sleepGoal);
      if (hasStages) snap.sleepScore = score;
    }
  } catch (e) {
    console.log('snapshot load error', e);
  }
  return snap;
}

// ─── Calendar Modal ───────────────────────────────────────────────────────────
function CalendarModal({
  visible,
  selectedKey,
  onSelect,
  onClose,
  theme,
}: {
  visible: boolean;
  selectedKey: string;
  onSelect: (key: string) => void;
  onClose: () => void;
  theme: any;
}) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(() => parseKey(selectedKey).getFullYear());
  const [viewMonth, setViewMonth] = useState(() => parseKey(selectedKey).getMonth());

  useEffect(() => {
    if (visible) {
      const d = parseKey(selectedKey);
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [visible]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth();
    if (isCurrentMonth) return;
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const monthName = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Build day grid
  const firstDow = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={{
          backgroundColor: theme.bgSheet,
          borderRadius: 16,
          padding: 20,
          width: 320,
          borderWidth: 1,
          borderColor: theme.borderCardTop,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.6,
          shadowRadius: 24,
          elevation: 20,
        }}>
          {/* Month nav */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <TouchableOpacity onPress={prevMonth} style={{ padding: 8 }}>
              <Ionicons name="chevron-back" size={20} color={theme.textPrimary} />
            </TouchableOpacity>
            <Text style={{ fontSize: 15, fontFamily: 'DMSans_600SemiBold', color: theme.textPrimary }}>{monthName}</Text>
            <TouchableOpacity onPress={nextMonth} style={{ padding: 8, opacity: isCurrentMonth ? 0.25 : 1 }} disabled={isCurrentMonth}>
              <Ionicons name="chevron-forward" size={20} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Day of week headers */}
          <View style={{ flexDirection: 'row', marginBottom: 8 }}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: 10, fontFamily: 'DMSans_700Bold', color: theme.textDim, letterSpacing: 1 }}>{d}</Text>
              </View>
            ))}
          </View>

          {/* Day grid */}
          {Array.from({ length: cells.length / 7 }, (_, row) => (
            <View key={row} style={{ flexDirection: 'row', marginBottom: 4 }}>
              {cells.slice(row * 7, row * 7 + 7).map((day, col) => {
                if (!day) return <View key={col} style={{ flex: 1 }} />;
                const cellDate = new Date(viewYear, viewMonth, day);
                const cellKey = fmt(cellDate);
                const isFuture = cellDate > today;
                const isSelected = cellKey === selectedKey;
                const isToday = cellKey === fmt(today);
                return (
                  <TouchableOpacity
                    key={col}
                    disabled={isFuture}
                    onPress={() => { onSelect(cellKey); onClose(); }}
                    style={{
                      flex: 1,
                      aspectRatio: 1,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 8,
                      backgroundColor: isSelected ? theme.accentBlueRaw : 'transparent',
                      opacity: isFuture ? 0.2 : 1,
                    }}
                  >
                    <Text style={{
                      fontSize: 14,
                      fontFamily: isSelected ? 'DMSans_700Bold' : 'DMSans_400Regular',
                      color: isSelected ? '#ffffff' : isToday ? theme.accentBlueRaw : theme.textPrimary,
                    }}>{day}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function HeadToHeadScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const params = useLocalSearchParams<{ dateA: string; dateB: string }>();

  const todayKey = fmt(new Date());
  const yesterdayKey = fmt(new Date(Date.now() - 86400000));

  const [dateA, setDateA] = useState(params.dateA ?? todayKey);
  const [dateB, setDateB] = useState(params.dateB ?? yesterdayKey);
  const [snapA, setSnapA] = useState<DaySnapshot | null>(null);
  const [snapB, setSnapB] = useState<DaySnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCalA, setShowCalA] = useState(false);
  const [showCalB, setShowCalB] = useState(false);

  // Profile values needed for calculations
  const [sleepGoal, setSleepGoal] = useState(7);
  const [calTarget, setCalTarget] = useState(1800);
  const [weightGoalPace, setWeightGoalPace] = useState('lose_1');
  const [profileBmr, setProfileBmr] = useState(0);

  // Load profile settings once
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const raw = await AsyncStorage.getItem('pj_profile');
        if (!raw) return;
        const p = JSON.parse(raw);
        if (p.sleepGoal && parseFloat(p.sleepGoal) > 0) setSleepGoal(parseFloat(p.sleepGoal));
        if (p.weightGoal) setWeightGoalPace(p.weightGoal);
        if (p.activityLevel && p.weightGoal && p.birthday && p.heightFt && p.heightIn) {
          const ACTIVITY_MULTIPLIERS: Record<string, number> = {
            sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9,
          };
          const GOAL_DEFICITS: Record<string, number> = {
            lose_2: -1000, lose_1_5: -750, lose_1: -500, lose_0_5: -250, maintain: 0, gain_0_5: 250, gain_1: 500,
          };
          // Use last known weight for BMR
          let w: number | null = null;
          for (let i = 0; i <= 30; i++) {
            const d = new Date(); d.setDate(d.getDate() - i);
            const ld = await AsyncStorage.getItem(`pj_${fmt(d)}`);
            if (ld) { const ldp = JSON.parse(ld); if (ldp.weight) { w = ldp.weight; break; } }
          }
          if (w) {
            const wKg = w * 0.453592;
            const hCm = (parseFloat(p.heightFt) * 30.48) + (parseFloat(p.heightIn) * 2.54);
            const age = Math.floor((Date.now() - new Date(p.birthday).getTime()) / (365.25 * 24 * 3600 * 1000));
            const bmr = p.sex === 'male'
              ? Math.round((10 * wKg) + (6.25 * hCm) - (5 * age) + 5)
              : Math.round((10 * wKg) + (6.25 * hCm) - (5 * age) - 161);
            const tdee = Math.round(bmr * (ACTIVITY_MULTIPLIERS[p.activityLevel] || 1.55));
            setProfileBmr(bmr);
            setCalTarget(tdee + (GOAL_DEFICITS[p.weightGoal] ?? -500));
          }
        }
      } catch (e) {
        console.log('profile load error', e);
      } finally {
        setProfileLoaded(true);
      }
    };
    loadProfile();
  }, []);

  const [profileLoaded, setProfileLoaded] = useState(false);

  // Load snapshots only after profile is ready
  useEffect(() => {
    if (!profileLoaded) return;
    const load = async () => {
      setLoading(true);
      const [a, b] = await Promise.all([
        loadSnapshot(dateA, sleepGoal, calTarget, weightGoalPace, profileBmr),
        loadSnapshot(dateB, sleepGoal, calTarget, weightGoalPace, profileBmr),
      ]);
      setSnapA(a);
      setSnapB(b);
      setLoading(false);
    };
    load();
  }, [dateA, dateB, sleepGoal, calTarget, weightGoalPace, profileBmr, profileLoaded]);

  const accentRaw = theme.accentBlueRaw;

  // ── Metric definitions ────────────────────────────────────────────────────────
  const sleepFmt = (h: number) => {
    const hrs = Math.floor(h);
    const mins = Math.round((h - hrs) * 60);
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  };

  interface MetricDef {
    id: MetricId;
    label: string;
    sub: string;
    icon: string;
    valA: number | null;
    valB: number | null;
    format: (v: number) => string;
    unit: string;
    winCondition: (a: number, b: number) => Result;
  }

  const paceLabels: Record<string, string> = {
    lose_2: 'Lose 2 lbs / wk pace',
    lose_1_5: 'Lose 1.5 lbs / wk pace',
    lose_1: 'Lose 1 lb / wk pace',
    lose_0_5: 'Lose 0.5 lbs / wk pace',
    maintain: 'Maintain weight pace',
    gain_0_5: 'Gain 0.5 lbs / wk pace',
    gain_1: 'Gain 1 lb / wk pace',
  };

  const metrics: MetricDef[] = snapA && snapB ? [
    {
      id: 'net',
      label: 'Net Calories',
      sub: paceLabels[weightGoalPace] ?? 'Calorie target pace',
      icon: 'flame',
      valA: snapA.net,
      valB: snapB.net,
      format: v => Math.abs(Math.round(v)).toLocaleString(),
      unit: 'kcal',
      winCondition: (a, b) => {
        const aDiff = Math.abs(a - calTarget);
        const bDiff = Math.abs(b - calTarget);
        if (Math.abs(aDiff - bDiff) < 25) return 'tie';
        return aDiff < bDiff ? 'win' : 'lose';
      },
    },
    {
      id: 'steps',
      label: 'Steps',
      sub: 'Daily movement',
      icon: 'footsteps',
      valA: snapA.steps,
      valB: snapB.steps,
      format: v => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : Math.round(v).toString(),
      unit: 'steps',
      winCondition: (a, b) => a === b ? 'tie' : a > b ? 'win' : 'lose',
    },
    {
      id: 'sleepScore',
      label: 'Sleep Score',
      sub: `${sleepGoal}h goal`,
      icon: 'moon',
      valA: snapA.sleepScore,
      valB: snapB.sleepScore,
      format: v => Math.round(v).toString(),
      unit: '/100',
      winCondition: (a, b) => Math.abs(a - b) < 3 ? 'tie' : a > b ? 'win' : 'lose',
    },
    {
      id: 'water',
      label: 'Water',
      sub: '128 oz goal',
      icon: 'water',
      valA: snapA.water,
      valB: snapB.water,
      format: v => Math.round(v).toString(),
      unit: 'oz',
      winCondition: (a, b) => a === b ? 'tie' : a > b ? 'win' : 'lose',
    },
    {
      id: 'activeCals',
      label: 'Active Cals',
      sub: 'Burned',
      icon: 'bicycle',
      valA: snapA.activeCals,
      valB: snapB.activeCals,
      format: v => Math.round(v).toLocaleString(),
      unit: 'kcal',
      winCondition: (a, b) => Math.abs(a - b) < 25 ? 'tie' : a > b ? 'win' : 'lose',
    },
    {
      id: 'weight',
      label: 'Weight',
      sub: 'Daily weigh-in',
      icon: 'barbell',
      valA: snapA.weight,
      valB: snapB.weight,
      format: v => v.toFixed(1),
      unit: 'lbs',
      winCondition: (a, b) => {
        if (Math.round(Math.abs(a - b) * 10) / 10 <= 0.3) return 'tie';
        const losing = weightGoalPace.startsWith('lose');
        const gaining = weightGoalPace.startsWith('gain');
        if (losing) return a < b ? 'win' : 'lose';
        if (gaining) return a > b ? 'win' : 'lose';
        return 'tie';
      },
    },
    {
      id: 'sleepHours',
      label: 'Sleep Duration',
      sub: `${sleepGoal}h goal`,
      icon: 'bed',
      valA: snapA.sleepScore === null ? snapA.sleepHours : null,
      valB: snapB.sleepScore === null ? snapB.sleepHours : null,
      format: sleepFmt,
      unit: 'hrs',
      winCondition: (a, b) => Math.abs(a - b) < 0.25 ? 'tie' : a > b ? 'win' : 'lose',
    },
  ] : [];

  // ── Score calculation ─────────────────────────────────────────────────────────
  const results: Result[] = metrics.map(m => {
    if (m.valA === null || m.valB === null) return 'tie';
    return m.winCondition(m.valA, m.valB);
  });

  const eligibleMetrics = metrics.filter((m, i) => m.valA !== null && m.valB !== null);
  const eligibleResults = eligibleMetrics.map(m => {
    if (m.valA === null || m.valB === null) return 'tie';
    return m.winCondition(m.valA, m.valB);
  });

  const wins   = eligibleResults.filter(r => r === 'win').length;
  const losses = eligibleResults.filter(r => r === 'lose').length;
  const ties   = eligibleResults.filter(r => r === 'tie').length;
  const overallResult: Result = wins > losses ? 'win' : losses > wins ? 'lose' : 'tie';

  const labelA = displayDate(dateA);
  const labelB = displayDate(dateB);

  // ── Delta helper ──────────────────────────────────────────────────────────────
  const getDelta = (m: MetricDef): string | null => {
    if (m.valA === null || m.valB === null) return null;
    const diff = m.valA - m.valB;
    if (m.id === 'sleepHours') {
      const absDiff = Math.abs(diff);
      const h = Math.floor(absDiff);
      const mins = Math.round((absDiff - h) * 60);
      const str = h > 0 ? (mins > 0 ? `${h}h ${mins}m` : `${h}h`) : `${mins}m`;
      return diff === 0 ? 'No change' : `${diff > 0 ? '+' : '-'}${str}`;
    }
    if (m.id === 'weight') {
      const str = Math.abs(diff).toFixed(1);
      return diff === 0 ? 'No change' : `${diff > 0 ? '+' : ''}${diff.toFixed(1)} lbs`;
    }
    if (m.id === 'sleepScore') {
      return diff === 0 ? 'No change' : `${diff > 0 ? '+' : ''}${Math.round(diff)} pts`;
    }
    const rounded = Math.round(diff);
    return rounded === 0 ? 'No change' : `${rounded > 0 ? '+' : ''}${Math.abs(rounded).toLocaleString()} ${m.unit}`;
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bgPrimary }}>
      {/* Header */}
      <View style={{
        paddingTop: insets.top + 8,
        paddingHorizontal: 16,
        paddingBottom: 12,
        borderBottomWidth: 0.5,
        borderBottomColor: theme.borderCard,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <Ionicons name="chevron-back" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={{ fontSize: 24, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2, color: accentRaw, flex: 1 }}>
          HEAD TO HEAD
        </Text>
        <TouchableOpacity onPress={() => router.push('/achievements')} style={{ padding: 4 }}>
          <TouchableOpacity
          onPress={() => router.push('/achievements')}
          style={{ borderWidth: 1, borderRadius: 6, borderColor: theme.accentBlueBorder, backgroundColor: theme.accentBlueBg, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="trophy" size={16} color={theme.accentBlue} />
        </TouchableOpacity>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Date selectors */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
          {/* Date A */}
          <TouchableOpacity
            onPress={() => setShowCalA(true)}
            style={{
              flex: 1,
              backgroundColor: theme.bgCard,
              borderWidth: 1,
              borderColor: accentRaw,
              borderRadius: 10,
              padding: 12,
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 6,
            }}
          >
            <Text style={{ fontSize: 9, fontFamily: 'DMSans_700Bold', letterSpacing: 2, textTransform: 'uppercase', color: accentRaw, marginBottom: 4 }}>YOU</Text>
            <Text style={{ fontSize: 15, fontFamily: 'DMSans_600SemiBold', color: accentRaw }}>{labelA}</Text>
            <Ionicons name="calendar" size={12} color={accentRaw} style={{ marginTop: 4 }} />
          </TouchableOpacity>

          {/* VS divider */}
          <View style={{ alignItems: 'center', justifyContent: 'center', width: 32 }}>
            <Text style={{ fontSize: 18, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2, color: theme.textDim }}>VS</Text>
          </View>

          {/* Date B */}
          <TouchableOpacity
            onPress={() => setShowCalB(true)}
            style={{
              flex: 1,
              backgroundColor: theme.bgCard,
              borderWidth: 1,
              borderColor: theme.borderCard,
              borderRadius: 10,
              padding: 12,
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 6,
            }}
          >
            <Text style={{ fontSize: 9, fontFamily: 'DMSans_700Bold', letterSpacing: 2, textTransform: 'uppercase', color: theme.textDim, marginBottom: 4 }}>OPPONENT</Text>
            <Text style={{ fontSize: 15, fontFamily: 'DMSans_600SemiBold', color: theme.textPrimary }}>{labelB}</Text>
            <Ionicons name="calendar" size={12} color={theme.textDim} style={{ marginTop: 4 }} />
          </TouchableOpacity>
        </View>

        {/* Score bar */}
        {!loading && eligibleMetrics.length >= 2 && (
          <View style={{
            backgroundColor: theme.bgCard,
            borderRadius: 12,
            overflow: 'hidden',
            marginBottom: 16,
            borderWidth: 0.5,
            borderColor: theme.borderCard,
            borderTopColor: theme.borderCardTop,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 10,
          }}>
            <View style={{ height: 2, backgroundColor: accentRaw, opacity: 0.8 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 8 }}>
              <View style={{ alignItems: 'center', minWidth: 32 }}>
                <Text style={{ fontSize: 32, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1, lineHeight: 34, color: overallResult === 'win' ? accentRaw : theme.textDim }}>{wins}</Text>
                <Text style={{ fontSize: 8, fontFamily: 'DMSans_700Bold', letterSpacing: 1.5, textTransform: 'uppercase', color: overallResult === 'win' ? accentRaw : theme.textDim, opacity: 0.7 }}>YOU</Text>
              </View>
              <Text style={{ fontSize: 18, fontFamily: 'BebasNeue_400Regular', color: theme.textDim, letterSpacing: 1, paddingBottom: 6 }}>·</Text>
              <View style={{ alignItems: 'center', minWidth: 32 }}>
                <Text style={{ fontSize: 32, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1, lineHeight: 34, color: overallResult === 'lose' ? theme.textSecondary : theme.textDim }}>{losses}</Text>
                <Text style={{ fontSize: 8, fontFamily: 'DMSans_700Bold', letterSpacing: 1.5, textTransform: 'uppercase', color: overallResult === 'lose' ? theme.textSecondary : theme.textDim, opacity: 0.7 }}>{labelB.toUpperCase().slice(0, 9)}</Text>
              </View>
              <Text style={{ fontSize: 18, fontFamily: 'BebasNeue_400Regular', color: theme.textDim, letterSpacing: 1, paddingBottom: 6 }}>·</Text>
              <View style={{ alignItems: 'center', minWidth: 32 }}>
                <Text style={{ fontSize: 32, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1, lineHeight: 34, color: ties > 0 ? theme.textDim : theme.textDim }}>{ties}</Text>
                <Text style={{ fontSize: 8, fontFamily: 'DMSans_700Bold', letterSpacing: 1.5, textTransform: 'uppercase', color: theme.textDim, opacity: 0.7 }}>TIED</Text>
              </View>
              <View style={{ flex: 1, paddingLeft: 8, alignItems: 'center' }}>
                <Text style={{ fontSize: 9, fontFamily: 'DMSans_700Bold', letterSpacing: 2, textTransform: 'uppercase', color: theme.textDim, marginBottom: 2 }}>
                  {labelA} vs {labelB}
                </Text>
                <Text style={{ fontSize: 11, fontFamily: 'DMSans_500Medium', color: theme.textMuted, textAlign: 'center' }}>
                  {eligibleMetrics.length} of 7 metrics tracked
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Loading state */}
        {loading && (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Text style={{ fontSize: 13, fontFamily: 'DMSans_400Regular', color: theme.textDim }}>Loading data...</Text>
          </View>
        )}

        {/* Metric cards */}
        {!loading && metrics.map((m, i) => {
          const result = m.valA !== null && m.valB !== null ? m.winCondition(m.valA, m.valB) : null;
          const hasData = m.valA !== null || m.valB !== null;
          const delta = getDelta(m);

          const aColor = result === 'win' ? accentRaw : theme.textDim;
          const bColor = result === 'lose' ? theme.textSecondary : theme.textDim;

          return (
            <View
              key={m.id}
              style={{
                backgroundColor: theme.bgCard,
                borderRadius: 12,
                borderWidth: 0.5,
                borderColor: theme.borderCard,
                borderTopColor: theme.borderCardTop,
                marginBottom: 10,
                overflow: 'hidden',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.15,
                shadowRadius: 8,
              }}
            >
              {/* Win indicator bar on left edge */}
              {result === 'win' && (
                <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: accentRaw }} />
              )}
              {result === 'lose' && (
                <View style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 3, backgroundColor: theme.textSecondary }} />
              )}

              <View style={{ padding: 14 }}>
                {/* Metric label row */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                  <Ionicons name={m.icon as any} size={12} color={theme.textMuted} />
                  <Text style={{ fontSize: 9, fontFamily: 'DMSans_700Bold', letterSpacing: 3, textTransform: 'uppercase', color: theme.textMuted }}>{m.label}</Text>
                  <View style={{ flex: 1 }} />
                  <Text style={{ fontSize: 10, fontFamily: 'DMSans_400Regular', color: theme.textDim }}>{m.sub}</Text>
                </View>

                {/* Values row */}
                <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
                  {/* Date A value */}
                  <View style={{ flex: 1, alignItems: 'flex-start' }}>
                    <Text style={{ fontSize: 9, fontFamily: 'DMSans_700Bold', letterSpacing: 2, textTransform: 'uppercase', color: accentRaw, marginBottom: 2 }}>{labelA}</Text>
                    {m.valA !== null ? (
                      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
                        <Text style={{ fontSize: 36, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1, lineHeight: 38, color: aColor }}>
                          {m.format(m.valA)}
                        </Text>
                        <Text style={{ fontSize: 11, fontFamily: 'DMSans_700Bold', letterSpacing: 1, textTransform: 'uppercase', color: aColor, opacity: 0.6, paddingBottom: 4 }}>
                          {m.unit}
                        </Text>
                      </View>
                    ) : (
                      <Text style={{ fontSize: 28, fontFamily: 'BebasNeue_400Regular', color: theme.textDim, opacity: 0.3, letterSpacing: 1 }}>--</Text>
                    )}
                  </View>

                  {/* Delta / result badge */}
                  <View style={{ alignItems: 'center', paddingHorizontal: 8 }}>
                    {result !== null ? (
                      <View style={{
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 6,
                        backgroundColor: result === 'win'
                          ? `${accentRaw}20`
                          : result === 'lose'
                          ? `${theme.textSecondary}18`
                          : theme.bgProgressTrack,
                        borderWidth: 1,
                        borderColor: result === 'win'
                          ? `${accentRaw}50`
                          : result === 'lose'
                          ? `${theme.textSecondary}40`
                          : theme.borderSubtle,
                        marginBottom: 4,
                      }}>
                        <Text style={{
                          fontSize: 10,
                          fontFamily: 'DMSans_700Bold',
                          letterSpacing: 1,
                          textTransform: 'uppercase',
                          color: result === 'win' ? accentRaw : result === 'lose' ? theme.textSecondary : theme.textDim,
                        }}>
                          {result === 'win' ? 'WIN' : result === 'lose' ? 'LOSS' : 'TIE'}
                        </Text>
                      </View>
                    ) : null}
                    {delta && (
                      <Text style={{ fontSize: 10, fontFamily: 'DMSans_500Medium', color: theme.textDim, textAlign: 'center' }}>{delta}</Text>
                    )}
                  </View>

                  {/* Date B value */}
                  <View style={{ flex: 1, alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 9, fontFamily: 'DMSans_700Bold', letterSpacing: 2, textTransform: 'uppercase', color: theme.textDim, marginBottom: 2 }}>{labelB}</Text>
                    {m.valB !== null ? (
                      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
                        <Text style={{ fontSize: 36, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1, lineHeight: 38, color: bColor }}>
                          {m.format(m.valB)}
                        </Text>
                        <Text style={{ fontSize: 11, fontFamily: 'DMSans_700Bold', letterSpacing: 1, textTransform: 'uppercase', color: bColor, opacity: 0.6, paddingBottom: 4 }}>
                          {m.unit}
                        </Text>
                      </View>
                    ) : (
                      <Text style={{ fontSize: 28, fontFamily: 'BebasNeue_400Regular', color: theme.textDim, opacity: 0.3, letterSpacing: 1 }}>--</Text>
                    )}
                  </View>
                </View>

                {/* No data note */}
                {!hasData && (
                  <Text style={{ fontSize: 11, fontFamily: 'DMSans_400Regular', color: theme.textDim, marginTop: 4 }}>No data for either date</Text>
                )}
              </View>
            </View>
          );
        })}

        {/* Empty state -- not enough data */}
        {!loading && snapA && snapB && eligibleMetrics.length < 2 && (
          <View style={{ alignItems: 'center', paddingVertical: 40, gap: 8 }}>
            <Ionicons name="analytics-outline" size={32} color={theme.textDim} />
            <Text style={{ fontSize: 16, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1, color: theme.textPrimary }}>Not enough data</Text>
            <Text style={{ fontSize: 12, fontFamily: 'DMSans_400Regular', color: theme.textDim, textAlign: 'center', maxWidth: 260 }}>
              At least 2 shared metrics are needed to run a comparison. Try different dates.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Calendar modals */}
      <CalendarModal
        visible={showCalA}
        selectedKey={dateA}
        onSelect={setDateA}
        onClose={() => setShowCalA(false)}
        theme={theme}
      />
      <CalendarModal
        visible={showCalB}
        selectedKey={dateB}
        onSelect={setDateB}
        onClose={() => setShowCalB(false)}
        theme={theme}
      />
    </View>
  );
}