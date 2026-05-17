import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Polyline, Rect, Text as SvgText } from 'react-native-svg';
import { DayDetailContent } from '../day-detail';
import { useTheme } from '../../theme';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const RECORD_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - 64;
const CHART_HEIGHT = 130;
const AnimatedRect = Animated.createAnimatedComponent(Rect);

type DayStatus = 'green' | 'yellow' | 'red' | 'future' | 'none';

const fmtRecordDate = (dk: string | null) => {
  if (!dk) return null;
  const [y, m, d] = dk.split('-');
  return `${RECORD_MONTHS[parseInt(m) - 1]} ${parseInt(d)}, ${y}`;
};

// ── Line chart ────────────────────────────────────────────────────────────────

function LineChart({ data, color, unit, goalValue, theme }: {
  data: { date: string, value: number }[],
  color: string,
  unit: string,
  goalValue?: number,
  theme: any,
}) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    opacity.setValue(0);
    if (data.length >= 2) {
      Animated.timing(opacity, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    }
  }, [data]);

  if (data.length < 2) {
    return (
      <View style={{ height: CHART_HEIGHT, alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <Ionicons name="analytics-outline" size={24} color={theme.iconMuted} />
        <Text style={{ color: theme.textDim, fontSize: 11, fontFamily: 'DMSans_400Regular', fontStyle: 'italic' }}>Not enough data yet</Text>
      </View>
    );
  }

  const values = data.map(d => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;
  const padTop = 16, padBottom = 20;
  const chartH = CHART_HEIGHT - padTop - padBottom;

  const toX = (i: number) => (i / (data.length - 1)) * CHART_WIDTH;
  const toY = (v: number) => padTop + (1 - (v - minVal) / range) * chartH;

  const points = data.map((d, i) => `${toX(i)},${toY(d.value)}`).join(' ');
  const lastVal = data[data.length - 1].value;
  const lastY = toY(lastVal);
  const lastX = toX(data.length - 1);
  const midIdx = Math.floor(data.length / 2);

  const fmtDate = (dk: string) => { const [,m,d] = dk.split('-'); return `${parseInt(m)}/${parseInt(d)}`; };

  return (
    <Animated.View style={{ opacity }}>
      <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
        {goalValue !== undefined && goalValue > minVal && goalValue < maxVal + range * 0.15 && (
          <>
            <Line x1={0} y1={toY(goalValue)} x2={CHART_WIDTH} y2={toY(goalValue)}
              stroke={theme.borderSubtle} strokeWidth={1} strokeDasharray="4,4" />
            <SvgText x={CHART_WIDTH - 2} y={toY(goalValue) - 4} fill={theme.textDim} fontSize={8}
              fontFamily="DMSans_500Medium" textAnchor="end">Goal</SvgText>
          </>
        )}
        <Polyline points={points} fill="none" stroke={color} strokeWidth={2.5}
          strokeLinejoin="round" strokeLinecap="round" />
        <Circle cx={lastX} cy={lastY} r={4} fill={color} />
        <SvgText x={0} y={CHART_HEIGHT} fill={theme.textDim} fontSize={8} fontFamily="DMSans_500Medium">
          {fmtDate(data[0].date)}
        </SvgText>
        {data.length > 10 && (
          <SvgText x={toX(midIdx)} y={CHART_HEIGHT} fill={theme.textDim} fontSize={8}
            fontFamily="DMSans_500Medium" textAnchor="middle">
            {fmtDate(data[midIdx].date)}
          </SvgText>
        )}
        <SvgText x={CHART_WIDTH} y={CHART_HEIGHT} fill={theme.textDim} fontSize={8}
          fontFamily="DMSans_500Medium" textAnchor="end">
          {fmtDate(data[data.length - 1].date)}
        </SvgText>
      </Svg>
    </Animated.View>
  );
}

// ── Calorie bar chart ─────────────────────────────────────────────────────────

function CalorieBarChart({ data, calTarget, theme }: {
  data: { date: string, cal: number }[],
  calTarget: number,
  theme: any,
}) {
  const animProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    animProgress.setValue(0);
    if (data.length > 0) {
      Animated.timing(animProgress, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    }
  }, [data]);

  if (data.length === 0) {
    return (
      <View style={{ height: CHART_HEIGHT, alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <Ionicons name="flame-outline" size={24} color={theme.iconMuted} />
        <Text style={{ color: theme.textDim, fontSize: 11, fontFamily: 'DMSans_400Regular', fontStyle: 'italic' }}>No calorie data yet</Text>
      </View>
    );
  }

  const target = calTarget || 2000;
  const maxCal = Math.max(...data.map(d => d.cal), target * 1.1);
  const barWidth = Math.max(3, (CHART_WIDTH / data.length) - 2);
  const padTop = 16, padBottom = 20;
  const chartH = CHART_HEIGHT - padTop - padBottom;
  const goalY = padTop + (1 - target / maxCal) * chartH;
  const fmtDate = (dk: string) => { const [,m,d] = dk.split('-'); return `${parseInt(m)}/${parseInt(d)}`; };
  const midIdx = Math.floor(data.length / 2);

  return (
    <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
      <Line x1={0} y1={goalY} x2={CHART_WIDTH} y2={goalY}
        stroke={theme.borderSubtle} strokeWidth={1} strokeDasharray="4,4" />
      <SvgText x={CHART_WIDTH - 2} y={goalY - 4} fill={theme.textDim} fontSize={8}
        fontFamily="DMSans_500Medium" textAnchor="end">Goal</SvgText>
      {data.map((d, i) => {
        const pct = target > 0 ? (d.cal / target) * 100 : 0;
        const barColor = pct >= 80 && pct <= 106 ? theme.statusGood : pct >= 63 && pct <= 114 ? theme.statusWarn : theme.statusBad;
        const fullBarH = Math.max(2, (d.cal / maxCal) * chartH);
        const x = i * (CHART_WIDTH / data.length);
        const barH = animProgress.interpolate({ inputRange: [0, 1], outputRange: [0, fullBarH] });
        const barY = animProgress.interpolate({ inputRange: [0, 1], outputRange: [padTop + chartH, padTop + chartH - fullBarH] });
        return <AnimatedRect key={i} x={x + 1} y={barY} width={barWidth} height={barH} fill={barColor} opacity={0.85} rx={2} />;
      })}
      <SvgText x={0} y={CHART_HEIGHT} fill={theme.textDim} fontSize={8} fontFamily="DMSans_500Medium">
        {fmtDate(data[0].date)}
      </SvgText>
      {data.length > 10 && (
        <SvgText x={(midIdx / data.length) * CHART_WIDTH} y={CHART_HEIGHT} fill={theme.textDim} fontSize={8}
          fontFamily="DMSans_500Medium" textAnchor="middle">
          {fmtDate(data[midIdx].date)}
        </SvgText>
      )}
      <SvgText x={CHART_WIDTH} y={CHART_HEIGHT} fill={theme.textDim} fontSize={8}
        fontFamily="DMSans_500Medium" textAnchor="end">
        {fmtDate(data[data.length - 1].date)}
      </SvgText>
    </Svg>
  );
}

// ── Collapsible section header ─────────────────────────────────────────────────

function CollapsibleSection({ label, children, defaultOpen = true, theme }: {
  label: string, children: React.ReactNode, defaultOpen?: boolean, theme: any
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [visible, setVisible] = useState(defaultOpen);
  const fadeAnim = useRef(new Animated.Value(defaultOpen ? 1 : 0)).current;

  const toggle = () => {
    const opening = !open;
    setOpen(opening);
    if (opening) {
      setVisible(true);
      Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: true }).start();
    } else {
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => setVisible(false));
    }
  };

  return (
    <View style={{ marginTop: 20 }}>
      <TouchableOpacity onPress={toggle} activeOpacity={0.7}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, marginBottom: 10 }}>
        <Text style={{ fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'DMSans_700Bold', color: theme.textMuted }}>
          {label}
        </Text>
        <View style={{ flex: 1, height: 0.5, backgroundColor: theme.borderSubtle }} />
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={12} color={theme.textMuted} />
      </TouchableOpacity>
      {visible && (
        <Animated.View style={{ opacity: fadeAnim }}>
          {children}
        </Animated.View>
      )}
    </View>
  );
}

// ── Collapsible card (for calendar) ───────────────────────────────────────────

function CollapsibleCard({ label, defaultOpen = false, children, theme }: {
  label: string, defaultOpen?: boolean, children: React.ReactNode, theme: any
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [visible, setVisible] = useState(defaultOpen);
  const fadeAnim = useRef(new Animated.Value(defaultOpen ? 1 : 0)).current;

  const toggle = () => {
    const opening = !open;
    setOpen(opening);
    if (opening) {
      setVisible(true);
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    } else {
      Animated.timing(fadeAnim, { toValue: 0, duration: 100, useNativeDriver: true }).start(() => setVisible(false));
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: theme.accentBlueRaw }]}>
      <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, paddingVertical: 12, marginVertical: -12 }} onPress={toggle}>
        <Text style={[styles.cardLabel, { color: theme.textMuted }]}>{label}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={theme.textMuted} />
      </TouchableOpacity>
      {visible && (
        <Animated.View style={{ marginTop: 12, opacity: fadeAnim }}>
          {children}
        </Animated.View>
      )}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const [trendPeriod, setTrendPeriod] = useState<'7' | '30' | '90'>('30');
  const [activePeriod, setActivePeriod] = useState<'7' | '30' | '90' | '180' | 'ytd'>('7');

  const [weightHistory, setWeightHistory] = useState<{ date: string, value: number }[]>([]);
  const [calHistory, setCalHistory] = useState<{ date: string, cal: number }[]>([]);
  const [stepsHistory, setStepsHistory] = useState<{ date: string, value: number }[]>([]);
  const [activeCalHistory, setActiveCalHistory] = useState<{ date: string, value: number }[]>([]);
  const [sleepHistory, setSleepHistory] = useState<{ date: string, value: number }[]>([]);

  const [calTarget, setCalTarget] = useState(0);
  const [stepGoal, setStepGoal] = useState(10000);
  const [sleepGoal, setSleepGoal] = useState(8);

  const [records, setRecords] = useState<{
    steps: number | null, stepsDate: string | null,
    activeCals: number | null, activeCalsDate: string | null,
    water: number | null, waterDate: string | null,
    sleepHours: number | null, sleepHoursDate: string | null,
  }>({ steps: null, stepsDate: null, activeCals: null, activeCalsDate: null, water: null, waterDate: null, sleepHours: null, sleepHoursDate: null });

  const [periodData, setPeriodData] = useState({
    avgCal: 0, avgProtein: 0, avgCarbs: 0, avgFat: 0,
    avgWater: 0, workoutDays: 0, totalDays: 0, loggedDays: 0,
    startWeight: null as number | null, endWeight: null as number | null,
  });
  const [streaks, setStreaks] = useState({ gym: 0, calories: 0, water: 0, bible: 0 });
  const [excludedDays, setExcludedDays] = useState<{ date: string, diet: boolean, water: boolean, exercise: boolean }[]>([]);

  const [dayDetailDate, setDayDetailDate] = useState<string | null>(null);
  const dayDetailAnim = useRef(new Animated.Value(0)).current;

  const now = new Date();
  const [calendarYear, setCalendarYear] = useState(now.getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(now.getMonth());
  const year = calendarYear;
  const month = calendarMonth;
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const closeDayDetail = () => {
    Animated.timing(dayDetailAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => setDayDetailDate(null));
  };

  const getDateKey = (offset: number) => {
    const d = new Date(); d.setDate(d.getDate() - offset);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const loadTrendData = async (period: '7' | '30' | '90') => {
    const days = parseInt(period);
    const wh: { date: string, value: number }[] = [];
    const ch: { date: string, cal: number }[] = [];
    const sh: { date: string, value: number }[] = [];
    const ah: { date: string, value: number }[] = [];
    const slh: { date: string, value: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const dateKey = getDateKey(i);
      try {
        const saved = await AsyncStorage.getItem(`pj_${dateKey}`);
        if (saved) {
          const data = JSON.parse(saved);
          if (data.weight) wh.push({ date: dateKey, value: data.weight });
          if (data.entries?.length > 0) {
            const total = data.entries.reduce((s: number, e: any) => s + e.cal, 0);
            if (total > 0) ch.push({ date: dateKey, cal: total });
          }
          if (data.steps) sh.push({ date: dateKey, value: data.steps });
          if (data.activeCalories) ah.push({ date: dateKey, value: data.activeCalories });
          const sleepH = data.sleepOverride || data.sleepHours;
          if (sleepH) slh.push({ date: dateKey, value: sleepH });
        }
      } catch {}
    }
    setWeightHistory(wh);
    setCalHistory(ch);
    setStepsHistory(sh);
    setActiveCalHistory(ah);
    setSleepHistory(slh);
  };

  const loadRecords = async () => {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const dayKeys = allKeys.filter(k => /^pj_\d{4}-\d{2}-\d{2}$/.test(k));
      if (dayKeys.length === 0) return;
      const pairs = await AsyncStorage.multiGet(dayKeys);
      let maxSteps = 0, maxActiveCals = 0, maxWater = 0, maxSleepH = 0;
      let maxStepsDate = '', maxActiveCalsDate = '', maxWaterDate = '', maxSleepHDate = '';
      for (const [key, val] of pairs) {
        if (!val) continue;
        try {
          const data = JSON.parse(val);
          const dateKey = key.replace('pj_', '');
          if ((data.steps || 0) > maxSteps) { maxSteps = data.steps; maxStepsDate = dateKey; }
          if ((data.activeCalories || 0) > maxActiveCals) { maxActiveCals = data.activeCalories; maxActiveCalsDate = dateKey; }
          if ((data.water || 0) > maxWater) { maxWater = data.water; maxWaterDate = dateKey; }
          const sh = data.sleepOverride || data.sleepHours;
          if (sh && sh > maxSleepH) { maxSleepH = sh; maxSleepHDate = dateKey; }
        } catch {}
      }
      setRecords({
        steps: maxSteps || null, stepsDate: maxStepsDate || null,
        activeCals: maxActiveCals || null, activeCalsDate: maxActiveCalsDate || null,
        water: maxWater || null, waterDate: maxWaterDate || null,
        sleepHours: maxSleepH || null, sleepHoursDate: maxSleepHDate || null,
      });
    } catch {}
  };

  const loadPeriodData = async (period: '7' | '30' | '90' | '180' | 'ytd') => {
    let dates: string[] = [];
    const nowD = new Date();
    if (period === 'ytd') {
      const start = new Date(nowD.getFullYear(), 0, 1);
      const diff = Math.floor((nowD.getTime() - start.getTime()) / 86400000);
      for (let i = diff; i >= 0; i--) dates.push(getDateKey(i));
    } else {
      const days = parseInt(period);
      for (let i = days - 1; i >= 0; i--) dates.push(getDateKey(i));
    }
    let totalCal = 0, totalProtein = 0, totalCarbs = 0, totalFat = 0, totalWater = 0;
    let dietDays = 0, waterDays = 0, workoutDays = 0;
    let startWeight: number | null = null, endWeight: number | null = null;
    for (const dateKey of dates) {
      try {
        const saved = await AsyncStorage.getItem(`pj_${dateKey}`);
        if (saved) {
          const data = JSON.parse(saved);
          const excl = data.excluded || {};
          if (!excl.diet && data.entries?.length > 0) {
            totalCal += data.entries.reduce((s: number, e: any) => s + e.cal, 0);
            totalProtein += data.entries.reduce((s: number, e: any) => s + (e.protein || 0), 0);
            totalCarbs += data.entries.reduce((s: number, e: any) => s + (e.carbs || 0), 0);
            totalFat += data.entries.reduce((s: number, e: any) => s + (e.fat || 0), 0);
            dietDays++;
          }
          if (!excl.water && data.water) { totalWater += data.water; waterDays++; }
          if (data.weight) { if (startWeight === null) startWeight = data.weight; endWeight = data.weight; }
          if (!excl.exercise && (data.caloriesBurned || data.entries?.length > 0)) workoutDays++;
        }
      } catch {}
    }
    setPeriodData({
      avgCal: dietDays > 0 ? Math.round(totalCal / dietDays) : 0,
      avgProtein: dietDays > 0 ? Math.round(totalProtein / dietDays * 10) / 10 : 0,
      avgCarbs: dietDays > 0 ? Math.round(totalCarbs / dietDays * 10) / 10 : 0,
      avgFat: dietDays > 0 ? Math.round(totalFat / dietDays * 10) / 10 : 0,
      avgWater: waterDays > 0 ? Math.round(totalWater / waterDays) : 0,
      workoutDays, totalDays: dates.length, loggedDays: dietDays, startWeight, endWeight,
    });
  };

  const loadStreaks = async (target: number) => {
    let gymStreak = 0, calStreak = 0, waterStreak = 0;
    let i = 0;
    while (true) {
      const dateKey = getDateKey(i);
      try {
        const saved = await AsyncStorage.getItem(`pj_${dateKey}`);
        if (!saved) { if (i === 0) { i++; continue; } break; }
        const data = JSON.parse(saved);
        const calTotal = data.entries?.reduce((s: number, e: any) => s + e.cal, 0) || 0;
        const calPct = target > 0 ? (calTotal / target) * 100 : 0;
        const hasCals = calPct >= 80 && calPct <= 106;
        const hasWater = (data.water || 0) >= 128;
        const hasWorkout = data.caloriesBurned > 0 || data.entries?.length > 0;
        if (i === 0 || gymStreak > 0) { if (hasWorkout) gymStreak++; else if (i > 0) gymStreak = 0; }
        if (i === 0 || calStreak > 0) { if (hasCals) calStreak++; else if (i > 0) calStreak = 0; }
        if (i === 0 || waterStreak > 0) { if (hasWater) waterStreak++; else if (i > 0) waterStreak = 0; }
        if (!hasWorkout && !hasCals && !hasWater) break;
        i++; if (i > 365) break;
      } catch { break; }
    }
    setStreaks({ gym: gymStreak, calories: calStreak, water: waterStreak, bible: 0 });
  };

  useFocusEffect(
    useCallback(() => {
      const loadAll = async () => {
        const exDays: { date: string, diet: boolean, water: boolean, exercise: boolean }[] = [];
        for (let d = 1; d <= daysInMonth; d++) {
          const dateKey = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          try {
            const saved = await AsyncStorage.getItem(`pj_${dateKey}`);
            if (saved) {
              const data = JSON.parse(saved);
              if (data.excluded && Object.values(data.excluded).some(v => v === true)) {
                exDays.push({ date: dateKey, diet: !!data.excluded.diet, water: !!data.excluded.water, exercise: !!data.excluded.exercise });
              }
            }
          } catch {}
        }
        setExcludedDays(exDays);

        let target = 0, step = 10000, sleep = 8;
        try {
          const p = await AsyncStorage.getItem('pj_profile');
          if (p) { const d = JSON.parse(p); if (d.stepGoal) step = parseInt(d.stepGoal); if (d.sleepGoal) sleep = parseFloat(d.sleepGoal); }
          const s = await AsyncStorage.getItem('pj_settings');
          if (s) { const d = JSON.parse(s); if (d.calTarget) target = parseInt(d.calTarget); }
        } catch {}
        setCalTarget(target);
        setStepGoal(step);
        setSleepGoal(sleep);

        await Promise.all([
          loadTrendData(trendPeriod),
          loadRecords(),
          loadPeriodData(activePeriod),
          loadStreaks(target),
        ]);
      };
      loadAll();
    }, [calendarMonth, calendarYear, activePeriod, trendPeriod])
  );

  useEffect(() => {
    loadTrendData(trendPeriod);
  }, [trendPeriod]);

  const getDayStatus = (day: number): DayStatus => {
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (dateKey > today) return 'future';
    const calEntry = calHistory.find(c => c.date === dateKey);
    if (!calEntry || !calTarget) return 'none';
    const pct = (calEntry.cal / calTarget) * 100;
    if (pct >= 80 && pct <= 106) return 'green';
    if (pct >= 63 && pct <= 114) return 'yellow';
    return 'red';
  };

  const dayStatusColor = (status: DayStatus) => {
    if (status === 'green') return { bg: 'rgba(16,185,129,0.25)', text: theme.statusGood };
    if (status === 'yellow') return { bg: 'rgba(245,158,11,0.25)', text: theme.statusWarn };
    if (status === 'red') return { bg: 'rgba(239,68,68,0.2)', text: theme.statusBad };
    return { bg: 'transparent', text: theme.textDim };
  };

  const shadowStyle = { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 12, elevation: 6 };

  const GraphCard = ({ icon, label, children, stat }: { icon: string, label: string, children: React.ReactNode, stat?: string }) => (
    <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: theme.accentBlueRaw, ...shadowStyle }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        <Ionicons name={icon as any} size={11} color={theme.textMuted} />
        <Text style={[styles.cardLabel, { color: theme.textMuted }]}>{label}</Text>
      </View>
      {children}
      {stat ? <Text style={{ fontSize: 11, color: theme.textMuted, fontFamily: 'DMSans_500Medium', marginTop: 8 }}>{stat}</Text> : null}
    </View>
  );

  const RecordTile = ({ icon, label, value, unit, color, date, fmt }: {
    icon: string, label: string, value: number | null, unit: string,
    color: string, date: string | null, fmt: (v: number) => string,
  }) => (
    <View style={[{ flex: 1, backgroundColor: theme.bgCard, borderWidth: 0.5, borderColor: theme.borderCard, borderTopWidth: 1.5, borderTopColor: theme.accentBlueRaw, borderRadius: 14, padding: 14, alignItems: 'center' }, shadowStyle]}>
      <Ionicons name={icon as any} size={18} color={color} style={{ marginBottom: 4 }} />
      <Text style={{ fontSize: 26, color, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 0, opacity: 0.88 }}>
        {value !== null ? fmt(value) : '--'}
      </Text>
      <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: 'DMSans_700Bold', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 2, textAlign: 'center' }}>{unit}</Text>
      <Text style={{ fontSize: 9, color: theme.textDim, fontFamily: 'DMSans_400Regular', marginTop: 2 }}>{label}</Text>
      {date && value !== null && (
        <Text style={{ fontSize: 9, color: theme.textDim, fontFamily: 'DMSans_400Regular', marginTop: 4, textAlign: 'center' }}>
          {fmtRecordDate(date)}
        </Text>
      )}
    </View>
  );

  const avgWeight = weightHistory.length > 0
    ? Math.round(weightHistory.reduce((s, d) => s + d.value, 0) / weightHistory.length * 10) / 10 : null;
  const avgSteps = stepsHistory.length > 0
    ? Math.round(stepsHistory.reduce((s, d) => s + d.value, 0) / stepsHistory.length) : null;
  const avgActiveCals = activeCalHistory.length > 0
    ? Math.round(activeCalHistory.reduce((s, d) => s + d.value, 0) / activeCalHistory.length) : null;
  const avgSleep = sleepHistory.length > 0
    ? Math.round(sleepHistory.reduce((s, d) => s + d.value, 0) / sleepHistory.length * 10) / 10 : null;
  const weightChange = periodData.startWeight && periodData.endWeight
    ? Math.round((periodData.endWeight - periodData.startWeight) * 10) / 10 : null;
  const stepsAboveGoal = stepsHistory.filter(d => d.value >= stepGoal).length;
  const sleepAtGoal = sleepHistory.filter(d => d.value >= sleepGoal).length;

  return (
    <LinearGradient colors={[theme.gradientStart, theme.gradientEnd]} style={{ flex: 1, paddingTop: insets.top }}>
      <View style={[styles.header, { borderBottomColor: theme.borderCard }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerLabel, { color: theme.textMuted }]}>PROJECT J</Text>
          <Text style={[styles.headerTitle, { color: theme.accentBlueRaw }]}>Stats</Text>
          <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: 'DMSans_700Bold', marginTop: 1, letterSpacing: 2, textTransform: 'uppercase' }}>
            {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/journal')}
          style={{ backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6, height: 32, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="journal" size={14} color={theme.accentBlue} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

        {/* ── AT A GLANCE ── */}
        <CollapsibleSection label="At a Glance" defaultOpen={true} theme={theme}>
          <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: theme.accentBlueRaw, ...shadowStyle }]}>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 14 }}>
              {(['7', '30', '90', '180', 'ytd'] as const).map(p => (
                <TouchableOpacity key={p} onPress={() => setActivePeriod(p)}
                  style={{ flex: 1, paddingVertical: 6, borderRadius: 6, alignItems: 'center',
                    backgroundColor: activePeriod === p ? theme.accentBlueBg : theme.bgInput,
                    borderWidth: 1, borderColor: activePeriod === p ? theme.accentBlueBorder : theme.borderInput }}>
                  <Text style={{ fontSize: 11, fontFamily: 'DMSans_600SemiBold', color: activePeriod === p ? theme.accentBlue : theme.textMuted }}>
                    {p === 'ytd' ? 'YTD' : p === '7' ? '7D' : p === '30' ? '30D' : p === '90' ? '3M' : '6M'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: 'DMSans_700Bold', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>
              {periodData.loggedDays} logged days · excludes flagged days
            </Text>
            {[
              { label: 'Avg Calories / Day', value: periodData.avgCal > 0 ? `${periodData.avgCal} kcal` : '--', color: theme.textPrimary },
              { label: 'Avg Protein / Day', value: periodData.avgProtein > 0 ? `${periodData.avgProtein}g` : '--', color: theme.macroProtein },
              { label: 'Avg Carbs / Day', value: periodData.avgCarbs > 0 ? `${periodData.avgCarbs}g` : '--', color: theme.macroCarbs },
              { label: 'Avg Fat / Day', value: periodData.avgFat > 0 ? `${periodData.avgFat}g` : '--', color: theme.macroFat },
              { label: 'Avg Water / Day', value: periodData.avgWater > 0 ? `${periodData.avgWater} oz` : '--', color: theme.textPrimary },
              { label: 'Workout Days', value: `${periodData.workoutDays} / ${periodData.totalDays}`, color: theme.textPrimary },
            ].map((row, i, arr) => (
              <View key={row.label} style={[styles.historyRow, { borderBottomColor: i < arr.length - 1 ? theme.borderSubtle : 'transparent' }]}>
                <Text style={[styles.historyDate, { color: theme.textMuted }]}>{row.label}</Text>
                <Text style={[styles.historyVal, { color: row.color }]}>{row.value}</Text>
              </View>
            ))}
            {weightChange !== null && (
              <View style={[styles.historyRow, { borderBottomColor: 'transparent' }]}>
                <Text style={[styles.historyDate, { color: theme.textMuted }]}>Weight Change</Text>
                <Text style={[styles.historyVal, { color: weightChange < 0 ? theme.statusGood : weightChange > 0 ? theme.statusBad : theme.textPrimary }]}>
                  {weightChange > 0 ? '+' : ''}{weightChange} lbs
                </Text>
              </View>
            )}
          </View>
        </CollapsibleSection>

        {/* ── TRENDS ── */}
        <CollapsibleSection label="Trends" defaultOpen={true} theme={theme}>
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
            {(['7', '30', '90'] as const).map(p => (
              <TouchableOpacity key={p} onPress={() => setTrendPeriod(p)}
                style={{ paddingVertical: 7, paddingHorizontal: 18, borderRadius: 8,
                  backgroundColor: trendPeriod === p ? theme.accentBlueBg : theme.bgInput,
                  borderWidth: 1, borderColor: trendPeriod === p ? theme.accentBlueBorder : theme.borderInput }}>
                <Text style={{ fontSize: 12, fontFamily: 'DMSans_600SemiBold', color: trendPeriod === p ? theme.accentBlue : theme.textMuted }}>
                  {p}D
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <GraphCard icon="body-outline" label="Weight"
            stat={avgWeight ? `Avg ${avgWeight} lbs this period${weightChange !== null ? ` · ${weightChange > 0 ? '+' : ''}${weightChange} lbs from start` : ''}` : undefined}>
            <LineChart data={weightHistory} color={theme.textSecondary} unit=" lbs" theme={theme} />
          </GraphCard>

          <GraphCard icon="flame-outline" label="Calories"
            stat={periodData.avgCal > 0 ? `Avg ${periodData.avgCal} kcal/day · ${periodData.loggedDays} days logged` : undefined}>
            <CalorieBarChart data={calHistory} calTarget={calTarget} theme={theme} />
            <View style={{ flexDirection: 'row', gap: 14, marginTop: 8 }}>
              <Text style={{ fontSize: 9, color: theme.statusGood, fontFamily: 'DMSans_700Bold', letterSpacing: 1 }}>{'● On target'}</Text>
              <Text style={{ fontSize: 9, color: theme.statusWarn, fontFamily: 'DMSans_700Bold', letterSpacing: 1 }}>{'● Close'}</Text>
              <Text style={{ fontSize: 9, color: theme.statusBad, fontFamily: 'DMSans_700Bold', letterSpacing: 1 }}>{'● Off'}</Text>
            </View>
          </GraphCard>

          <GraphCard icon="footsteps-outline" label="Steps"
            stat={avgSteps !== null ? `Avg ${avgSteps.toLocaleString()} steps/day · ${stepsAboveGoal} days above goal` : undefined}>
            <LineChart data={stepsHistory} color={theme.accentBlue} unit="" goalValue={stepGoal} theme={theme} />
          </GraphCard>

          <GraphCard icon="heart-outline" label="Active Calories"
            stat={avgActiveCals !== null ? `Avg ${avgActiveCals.toLocaleString()} kcal/day this period` : undefined}>
            <LineChart data={activeCalHistory} color={theme.statusWarn} unit=" kcal" theme={theme} />
          </GraphCard>

          <GraphCard icon="moon-outline" label="Sleep"
            stat={avgSleep !== null ? `Avg ${avgSleep}h/night · ${sleepAtGoal} nights at goal` : undefined}>
            <LineChart data={sleepHistory} color={theme.sleepRem} unit="h" goalValue={sleepGoal} theme={theme} />
          </GraphCard>
        </CollapsibleSection>

        {/* ── RECORDS ── */}
        <CollapsibleSection label="Records" defaultOpen={false} theme={theme}>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
            <RecordTile icon="footsteps" label="Best Steps" value={records.steps} unit="steps"
              color={theme.accentBlue} date={records.stepsDate}
              fmt={(v) => Math.round(v).toLocaleString()} />
            <RecordTile icon="flame" label="Best Active" value={records.activeCals} unit="kcal burned"
              color={theme.statusWarn} date={records.activeCalsDate}
              fmt={(v) => Math.round(v).toLocaleString()} />
          </View>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
            <RecordTile icon="water" label="Best Water" value={records.water} unit="oz"
              color={'#06b6d4'} date={records.waterDate}
              fmt={(v) => Math.round(v).toLocaleString()} />
            <RecordTile icon="moon" label="Best Sleep" value={records.sleepHours} unit="hrs"
              color={theme.sleepRem} date={records.sleepHoursDate}
              fmt={(v) => `${Math.floor(v)}h ${Math.round((v % 1) * 60)}m`} />
          </View>
        </CollapsibleSection>

        {/* ── STREAKS ── */}
        <CollapsibleSection label="Streaks" defaultOpen={false} theme={theme}>
          <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: theme.accentBlueRaw, ...shadowStyle }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              {[
                { label: 'Workout', value: streaks.gym, color: theme.statusGood },
                { label: 'Calories', value: streaks.calories, color: theme.accentBlue },
                { label: 'Water', value: streaks.water, color: '#06b6d4' },
                { label: 'Bible', value: streaks.bible, color: theme.accentAmber },
              ].map(s => (
                <View key={s.label} style={{ alignItems: 'center', flex: 1 }}>
                  <Text style={{ fontSize: 36, fontFamily: 'BebasNeue_400Regular', color: s.color, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 0, opacity: 0.88 }}>
                    {s.value}
                  </Text>
                  <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: 'DMSans_700Bold', letterSpacing: 2, textTransform: 'uppercase' }}>{s.label}</Text>
                  <Text style={{ fontSize: 9, color: theme.textDim, fontFamily: 'DMSans_400Regular', marginTop: 2 }}>days</Text>
                </View>
              ))}
            </View>
          </View>
        </CollapsibleSection>

        {/* ── CALENDAR ── */}
        <CollapsibleSection label="Calendar" defaultOpen={false} theme={theme}>
          <CollapsibleCard label="Monthly View" defaultOpen={true} theme={theme}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <TouchableOpacity onPress={() => { if (calendarMonth === 0) { setCalendarMonth(11); setCalendarYear(y => y - 1); } else setCalendarMonth(m => m - 1); }} style={{ padding: 8 }}>
                <Ionicons name="chevron-back" size={18} color={theme.accentBlue} />
              </TouchableOpacity>
              <Text style={[styles.cardLabel, { marginBottom: 0, color: theme.textMuted }]}>{MONTH_NAMES[month]} {year}</Text>
              <TouchableOpacity onPress={() => { if (calendarMonth === 11) { setCalendarMonth(0); setCalendarYear(y => y + 1); } else setCalendarMonth(m => m + 1); }} style={{ padding: 8 }}>
                <Ionicons name="chevron-forward" size={18} color={theme.accentBlue} />
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
              {[
                { label: 'On Target', bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.3)', color: theme.statusGood },
                { label: 'Close', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)', color: theme.statusWarn },
                { label: 'Off', bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.3)', color: theme.statusBad },
              ].map(l => (
                <View key={l.label} style={{ backgroundColor: l.bg, borderWidth: 1, borderColor: l.border, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 }}>
                  <Text style={{ color: l.color, fontSize: 10, fontFamily: 'DMSans_600SemiBold' }}>{l.label}</Text>
                </View>
              ))}
            </View>
            <View style={styles.calGrid}>
              {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
                <Text key={d} style={[styles.calDayHeader, { color: theme.textMuted }]}>{d}</Text>
              ))}
              {Array.from({ length: firstDay }).map((_, i) => (
                <View key={`empty-${i}`} style={{ width: '14.28%' }} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const status = getDayStatus(day);
                const colors = dayStatusColor(status);
                const isToday = day === now.getDate() && month === now.getMonth() && year === now.getFullYear();
                const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const exDay = excludedDays.find(e => e.date === dateKey);
                return (
                  <TouchableOpacity key={day}
                    style={[styles.calDay, { backgroundColor: colors.bg }, isToday && [styles.calDayToday, { borderColor: theme.accentBlueBorder }]]}
                    onPress={() => { if (dateKey <= today) setDayDetailDate(dateKey); }}>
                    <Text style={[styles.calDayText, { color: colors.text }]}>{day}</Text>
                    {exDay && (
                      <View style={{ position: 'absolute', bottom: 2, left: 0, right: 0, flexDirection: 'row', gap: 2, justifyContent: 'center' }}>
                        {exDay.diet && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(245,158,11,0.6)' }} />}
                        {exDay.water && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(59,130,246,0.6)' }} />}
                        {exDay.exercise && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(239,68,68,0.6)' }} />}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
              {[
                { color: 'rgba(245,158,11,0.6)', label: 'Diet excluded' },
                { color: 'rgba(59,130,246,0.6)', label: 'Water excluded' },
                { color: 'rgba(239,68,68,0.6)', label: 'Exercise excluded' },
              ].map(l => (
                <View key={l.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: l.color }} />
                  <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: 'DMSans_700Bold', letterSpacing: 1, textTransform: 'uppercase' }}>{l.label}</Text>
                </View>
              ))}
            </View>
          </CollapsibleCard>
        </CollapsibleSection>

      </ScrollView>

      {dayDetailDate !== null && (
        <Modal transparent animationType="none" visible={dayDetailDate !== null} onRequestClose={closeDayDetail} statusBarTranslucent hardwareAccelerated
          onShow={() => {
            dayDetailAnim.setValue(0);
            Animated.timing(dayDetailAnim, { toValue: 1, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
          }}>
          <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', opacity: dayDetailAnim, justifyContent: 'center', alignItems: 'center' }}>
            <TouchableOpacity style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} activeOpacity={1} onPress={closeDayDetail} />
            <Animated.View style={{ width: '92%', height: '75%', borderRadius: 20, backgroundColor: theme.bgSheet, borderWidth: 0.5, borderColor: theme.borderSheet, overflow: 'hidden', opacity: dayDetailAnim }}>
              <TouchableOpacity onPress={closeDayDetail} style={{ alignSelf: 'center', paddingVertical: 6, paddingHorizontal: 40 }}>
                <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.sheetHandle, marginTop: 12, marginBottom: 12 }} />
              </TouchableOpacity>
              <DayDetailContent date={dayDetailDate} onClose={closeDayDetail} />
            </Animated.View>
          </Animated.View>
        </Modal>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1 },
  content:      { padding: 16, paddingBottom: 100 },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 0.5, marginBottom: 4 },
  headerLabel:  { fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2, fontFamily: 'DMSans_700Bold' },
  headerTitle:  { fontSize: 32, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2 },
  card:         { borderWidth: 0.5, borderTopWidth: 1.5, borderRadius: 14, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 12, elevation: 6 },
  cardLabel:    { fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 0, fontFamily: 'DMSans_700Bold' },
  calGrid:      { flexDirection: 'row', flexWrap: 'wrap' },
  calDayHeader: { width: '14.28%', textAlign: 'center', fontSize: 9, letterSpacing: 1, paddingVertical: 4, fontFamily: 'DMSans_700Bold' },
  calDay:       { width: '14.28%', height: 36, borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  calDayToday:  { borderWidth: 1 },
  calDayText:   { fontSize: 14, fontFamily: 'DMSans_600SemiBold' },
  historyRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 0.5 },
  historyDate:  { fontSize: 12, fontFamily: 'DMSans_400Regular' },
  historyVal:   { fontSize: 13, fontFamily: 'DMSans_600SemiBold' },
});
