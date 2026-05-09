import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Animated, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Polyline, Rect, Text as SvgText } from 'react-native-svg';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const CAL_TARGET = 1750;
const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - 64;
const CHART_HEIGHT = 120;

type DayStatus = 'green' | 'yellow' | 'red' | 'future' | 'none';

function LineChart({ data, color, label, unit, goalValue }: {
  data: { date: string, value: number }[],
  color: string,
  label: string,
  unit: string,
  goalValue?: number,
}) {
  if (data.length < 2) {
    return (
      <View style={{ height: CHART_HEIGHT, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#666680', fontSize: 11, fontFamily: 'DMSans_400Regular', fontStyle: 'italic' }}>Not enough data yet</Text>
      </View>
    );
  }

  const values = data.map(d => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;
  const pad = 20;
  const chartH = CHART_HEIGHT - pad;

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * CHART_WIDTH;
    const y = pad + (1 - (d.value - minVal) / range) * chartH;
    return `${x},${y}`;
  }).join(' ');

  const lastVal = data[data.length - 1].value;
  const lastX = CHART_WIDTH;
  const lastY = pad + (1 - (lastVal - minVal) / range) * chartH;

  return (
    <View>
      <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
        {goalValue !== undefined && goalValue >= minVal && goalValue <= maxVal + range * 0.2 && (
          <>
            <Line
              x1={0} y1={pad + (1 - (goalValue - minVal) / range) * chartH}
              x2={CHART_WIDTH} y2={pad + (1 - (goalValue - minVal) / range) * chartH}
              stroke="rgba(255,255,255,0.1)" strokeWidth={1} strokeDasharray="4,4"
            />
            <SvgText
              x={4} y={pad + (1 - (goalValue - minVal) / range) * chartH - 4}
              fill="rgba(255,255,255,0.25)" fontSize={8} fontFamily="DMSans_400Regular">
              Goal
            </SvgText>
          </>
        )}
        <Polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <Circle cx={lastX} cy={lastY} r={3} fill={color} />
        <SvgText x={lastX - 2} y={lastY - 8} fill={color} fontSize={9} fontFamily="DMSans_700Bold" textAnchor="end">
          {Math.round(lastVal * 10) / 10}{unit}
        </SvgText>
        <SvgText x={0} y={CHART_HEIGHT} fill="#666680" fontSize={8} fontFamily="DMSans_400Regular">
          {data[0].date.slice(5)}
        </SvgText>
        <SvgText x={CHART_WIDTH} y={CHART_HEIGHT} fill="#666680" fontSize={8} fontFamily="DMSans_400Regular" textAnchor="end">
          {data[data.length - 1].date.slice(5)}
        </SvgText>
      </Svg>
    </View>
  );
}

function CalorieBarChart({ data }: { data: { date: string, cal: number }[] }) {
  if (data.length === 0) {
    return (
      <View style={{ height: CHART_HEIGHT, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#666680', fontSize: 11, fontFamily: 'DMSans_400Regular', fontStyle: 'italic' }}>No calorie data yet</Text>
      </View>
    );
  }

  const maxCal = Math.max(...data.map(d => d.cal), CAL_TARGET);
  const barWidth = Math.max(4, (CHART_WIDTH / data.length) - 2);
  const pad = 16;
  const chartH = CHART_HEIGHT - pad;

  return (
    <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
      <Line x1={0} y1={pad + (1 - CAL_TARGET / maxCal) * chartH} x2={CHART_WIDTH} y2={pad + (1 - CAL_TARGET / maxCal) * chartH}
        stroke="rgba(255,255,255,0.1)" strokeWidth={1} strokeDasharray="4,4" />
      {data.map((d, i) => {
        const pct = (d.cal / CAL_TARGET) * 100;
        const barColor = pct >= 80 && pct <= 106 ? '#10b981' : pct >= 63 && pct <= 114 ? '#f59e0b' : '#ef4444';
        const barH = (d.cal / maxCal) * chartH;
        const x = i * (CHART_WIDTH / data.length);
        const y = pad + chartH - barH;
        return (
          <Rect key={i} x={x + 1} y={y} width={barWidth} height={barH} fill={barColor} opacity={0.8} rx={2} />
        );
      })}
      <SvgText x={0} y={CHART_HEIGHT} fill="#666680" fontSize={8} fontFamily="DMSans_400Regular">
        {data[0].date.slice(5)}
      </SvgText>
      <SvgText x={CHART_WIDTH} y={CHART_HEIGHT} fill="#666680" fontSize={8} fontFamily="DMSans_400Regular" textAnchor="end">
        {data[data.length - 1].date.slice(5)}
      </SvgText>
    </Svg>
  );
}

function CollapsibleCard({ label, defaultOpen = false, children }: { label: string, defaultOpen?: boolean, children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  const animHeight = useRef(new Animated.Value(defaultOpen ? 1 : 0)).current;
  const [measuredHeight, setMeasuredHeight] = useState(0);

  const toggle = () => {
    const toValue = open ? 0 : 1;
    Animated.spring(animHeight, {
      toValue,
      useNativeDriver: false,
      bounciness: 0,
      speed: 20,
    }).start();
    setOpen(o => !o);
  };

  return (
    <View style={styles.card}>
      <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }} onPress={toggle}>
        <Text style={styles.cardLabel}>{label}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color="#666680" />
      </TouchableOpacity>
      <Animated.View style={{
        overflow: 'hidden',
        height: measuredHeight > 0 ? animHeight.interpolate({
          inputRange: [0, 1],
          outputRange: [0, measuredHeight + 12],
        }) : undefined,
        opacity: animHeight,
      }}>
        <View
          style={{ marginTop: 12 }}
          onLayout={e => {
            const h = e.nativeEvent.layout.height;
            if (h > 0 && h !== measuredHeight) setMeasuredHeight(h);
          }}>
          {children}
        </View>
      </Animated.View>
    </View>
  );
}

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const [weightHistory, setWeightHistory] = useState<{date: string, w: number}[]>([]);
  const [calHistory, setCalHistory] = useState<{date: string, cal: number}[]>([]);
  const [stepsHistory, setStepsHistory] = useState<{date: string, value: number}[]>([]);
  const [activeCalHistory, setActiveCalHistory] = useState<{date: string, value: number}[]>([]);
  const [excludedDays, setExcludedDays] = useState<{date: string, diet: boolean, water: boolean, exercise: boolean}[]>([]);
  const [periodData, setPeriodData] = useState({
    avgCal: 0, avgProtein: 0, avgCarbs: 0, avgFat: 0,
    avgWater: 0, workoutDays: 0, totalDays: 0, loggedDays: 0,
    startWeight: null as number | null,
    endWeight: null as number | null,
  });
  const [activePeriod, setActivePeriod] = useState<'7' | '30' | '90' | '180' | 'ytd'>('7');
  const [streaks, setStreaks] = useState({ gym: 0, calories: 0, water: 0, bible: 0 });
  const [stepGoal, setStepGoal] = useState(10000);

  const now = new Date();
  const [calendarYear, setCalendarYear] = useState(now.getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(now.getMonth());
  const year = calendarYear;
  const month = calendarMonth;
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const goToPrevMonth = () => {
    if (calendarMonth === 0) { setCalendarMonth(11); setCalendarYear(y => y - 1); }
    else setCalendarMonth(m => m - 1);
  };
  const goToNextMonth = () => {
    if (calendarMonth === 11) { setCalendarMonth(0); setCalendarYear(y => y + 1); }
    else setCalendarMonth(m => m + 1);
  };

  const loadPeriodData = async (period: '7' | '30' | '90' | '180' | 'ytd') => {
    let dates: string[] = [];
    const nowD = new Date();
    if (period === 'ytd') {
      const start = new Date(nowD.getFullYear(), 0, 1);
      const diff = Math.floor((nowD.getTime() - start.getTime()) / 86400000);
      for (let i = diff; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
      }
    } else {
      const days = parseInt(period);
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
      }
    }

    let totalCal = 0, totalProtein = 0, totalCarbs = 0, totalFat = 0, totalWater = 0;
    let dietDays = 0, waterDays = 0, workoutDays = 0;
    let startWeight: number | null = null, endWeight: number | null = null;

    for (const dk of dates) {
      try {
        const saved = await AsyncStorage.getItem(`pj_${dk}`);
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
      } catch (e) {}
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

  const loadStreaks = async () => {
    let gymStreak = 0, calStreak = 0, waterStreak = 0;
    let i = 0;
    while (true) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const dk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      try {
        const saved = await AsyncStorage.getItem(`pj_${dk}`);
        if (!saved) { if (i === 0) { i++; continue; } break; }
        const data = JSON.parse(saved);
        const calTotal = data.entries?.reduce((s: number, e: any) => s + e.cal, 0) || 0;
        const calPct = CAL_TARGET > 0 ? (calTotal / CAL_TARGET) * 100 : 0;
        const hasCals = calPct >= 80 && calPct <= 106;
        const hasWater = (data.water || 0) >= 128;
        const hasWorkout = data.caloriesBurned > 0 || data.entries?.length > 0;
        if (i === 0 || gymStreak > 0) hasWorkout ? gymStreak++ : (i > 0 ? gymStreak = 0 : null);
        if (i === 0 || calStreak > 0) hasCals ? calStreak++ : (i > 0 ? calStreak = 0 : null);
        if (i === 0 || waterStreak > 0) hasWater ? waterStreak++ : (i > 0 ? waterStreak = 0 : null);
        if (!hasWorkout && !hasCals && !hasWater) break;
        i++; if (i > 365) break;
      } catch (e) { break; }
    }
    setStreaks({ gym: gymStreak, calories: calStreak, water: waterStreak, bible: 0 });
  };

  const loadTrendData = async () => {
    const wh: {date: string, w: number}[] = [];
    const ch: {date: string, cal: number}[] = [];
    const sh: {date: string, value: number}[] = [];
    const ah: {date: string, value: number}[] = [];

    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const dk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      try {
        const saved = await AsyncStorage.getItem(`pj_${dk}`);
        if (saved) {
          const data = JSON.parse(saved);
          if (data.weight) wh.push({ date: dk, w: data.weight });
          if (data.entries?.length > 0) {
            const total = data.entries.reduce((s: number, e: any) => s + e.cal, 0);
            if (total > 0) ch.push({ date: dk, cal: total });
          }
          if (data.steps) sh.push({ date: dk, value: data.steps });
          if (data.activeCalories) ah.push({ date: dk, value: data.activeCalories });
        }
      } catch (e) {}
    }

    setWeightHistory(wh);
    setCalHistory(ch);
    setStepsHistory(sh);
    setActiveCalHistory(ah);
  };

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        const exDays: {date: string, diet: boolean, water: boolean, exercise: boolean}[] = [];
        for (let d = 1; d <= daysInMonth; d++) {
          const dk = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          try {
            const saved = await AsyncStorage.getItem(`pj_${dk}`);
            if (saved) {
              const data = JSON.parse(saved);
              if (data.excluded && Object.values(data.excluded).some(v => v === true)) {
                exDays.push({ date: dk, diet: !!data.excluded.diet, water: !!data.excluded.water, exercise: !!data.excluded.exercise });
              }
            }
          } catch (e) {}
        }
        setExcludedDays(exDays);

        const profile = await AsyncStorage.getItem('pj_profile');
        if (profile) {
          const p = JSON.parse(profile);
          if (p.stepGoal) setStepGoal(parseInt(p.stepGoal));
        }
      };
      load();
      loadTrendData();
      loadPeriodData(activePeriod);
      loadStreaks();
    }, [calendarMonth, calendarYear, activePeriod])
  );

  const getDayStatus = (day: number): DayStatus => {
    const dk = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (dk > today) return 'future';
    const calEntry = calHistory.find(c => c.date === dk);
    if (!calEntry) return 'none';
    const pct = (calEntry.cal / CAL_TARGET) * 100;
    if (pct >= 80 && pct <= 106) return 'green';
    if (pct >= 63 && pct <= 114) return 'yellow';
    return 'red';
  };

  const dayStatusColor = (status: DayStatus) => {
    if (status === 'green') return { bg: 'rgba(16,185,129,0.25)', text: '#10b981' };
    if (status === 'yellow') return { bg: 'rgba(245,158,11,0.25)', text: '#f59e0b' };
    if (status === 'red') return { bg: 'rgba(239,68,68,0.2)', text: '#ef4444' };
    if (status === 'future') return { bg: 'transparent', text: '#333333' };
    return { bg: 'transparent', text: '#444444' };
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0d0d0f', paddingTop: insets.top }}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerLabel}>PROJECT J</Text>
          <Text style={styles.headerTitle}>Stats</Text>
          <Text style={{ fontSize: 9, color: '#666680', fontFamily: 'DMSans_700Bold', marginTop: 1, letterSpacing: 2, textTransform: 'uppercase' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
        </View>
        <View style={{ backgroundColor: 'rgba(59,130,246,0.15)', borderWidth: 1, borderColor: 'rgba(59,130,246,0.3)', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6, opacity: 0 }}>
          <Text style={{ fontSize: 14, fontFamily: 'DMSans_700Bold', color: '#3b82f6' }}>Library</Text>
        </View>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

        {/* Calendar */}
        <CollapsibleCard label="Calendar" defaultOpen={true}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <TouchableOpacity onPress={goToPrevMonth} style={{ padding: 4 }}>
              <Text style={{ color: '#3b82f6', fontSize: 18, fontFamily: 'DMSans_600SemiBold' }}>{'<'}</Text>
            </TouchableOpacity>
            <Text style={[styles.cardLabel, { marginBottom: 0 }]}>{MONTH_NAMES[month]} {year}</Text>
            <TouchableOpacity onPress={goToNextMonth} style={{ padding: 4 }}>
              <Text style={{ color: '#3b82f6', fontSize: 18, fontFamily: 'DMSans_600SemiBold' }}>{'>'}</Text>
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
            <View style={{ backgroundColor: 'rgba(16,185,129,0.15)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 }}>
              <Text style={{ color: '#10b981', fontSize: 10, fontFamily: 'DMSans_600SemiBold' }}>Full</Text>
            </View>
            <View style={{ backgroundColor: 'rgba(245,158,11,0.15)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 }}>
              <Text style={{ color: '#f59e0b', fontSize: 10, fontFamily: 'DMSans_600SemiBold' }}>Partial</Text>
            </View>
            <View style={{ backgroundColor: 'rgba(239,68,68,0.15)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 }}>
              <Text style={{ color: '#ef4444', fontSize: 10, fontFamily: 'DMSans_600SemiBold' }}>Missed</Text>
            </View>
          </View>
          <View style={styles.calGrid}>
            {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
              <Text key={d} style={styles.calDayHeader}>{d}</Text>
            ))}
            {Array.from({ length: firstDay }).map((_, i) => (
              <View key={`empty-${i}`} style={{ width: '14.28%' }} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const status = getDayStatus(day);
              const colors = dayStatusColor(status);
              const isToday = day === now.getDate() && month === now.getMonth() && year === now.getFullYear();
              return (
                <TouchableOpacity
                  key={day}
                  style={[styles.calDay, { backgroundColor: colors.bg }, isToday && styles.calDayToday]}
                  onPress={() => {
                    const dk = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    if (dk <= today) router.push({ pathname: '/day-detail', params: { date: dk } });
                  }}>
                  <Text style={[styles.calDayText, { color: colors.text }]}>{day}</Text>
                  {(() => {
                    const dk = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const dayData = excludedDays.find(e => e.date === dk);
                    if (!dayData) return null;
                    return (
                      <View style={{ position: 'absolute', bottom: 2, left: 0, right: 0, flexDirection: 'row', gap: 2, justifyContent: 'center' }}>
                        {dayData.diet && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(245,158,11,0.6)' }} />}
                        {dayData.water && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(59,130,246,0.6)' }} />}
                        {dayData.exercise && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(239,68,68,0.6)' }} />}
                      </View>
                    );
                  })()}
                </TouchableOpacity>
              );
            })}
          </View>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(245,158,11,0.6)' }} />
              <Text style={{ fontSize: 9, color: '#666680', fontFamily: 'DMSans_700Bold', letterSpacing: 1, textTransform: 'uppercase' }}>Diet excluded</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(59,130,246,0.6)' }} />
              <Text style={{ fontSize: 9, color: '#666680', fontFamily: 'DMSans_700Bold', letterSpacing: 1, textTransform: 'uppercase' }}>Water excluded</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(239,68,68,0.6)' }} />
              <Text style={{ fontSize: 9, color: '#666680', fontFamily: 'DMSans_700Bold', letterSpacing: 1, textTransform: 'uppercase' }}>Exercise excluded</Text>
            </View>
          </View>
        </CollapsibleCard>

        {/* Weight Trend */}
        <CollapsibleCard label="Weight Trend">
          <LineChart
            data={weightHistory.map(w => ({ date: w.date, value: w.w }))}
            color="#e8e8f0"
            label="Weight"
            unit=" lbs"
          />
        </CollapsibleCard>

        {/* Calorie Trend */}
        <CollapsibleCard label="Calorie Trend">
          <CalorieBarChart data={calHistory} />
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
            <Text style={{ fontSize: 9, color: '#10b981', fontFamily: 'DMSans_700Bold', letterSpacing: 1 }}>{'● On target'}</Text>
            <Text style={{ fontSize: 9, color: '#f59e0b', fontFamily: 'DMSans_700Bold', letterSpacing: 1 }}>{'● Close'}</Text>
            <Text style={{ fontSize: 9, color: '#ef4444', fontFamily: 'DMSans_700Bold', letterSpacing: 1 }}>{'● Off'}</Text>
          </View>
        </CollapsibleCard>

        {/* Steps Trend */}
        <CollapsibleCard label="Steps Trend">
          <LineChart
            data={stepsHistory}
            color="#3b82f6"
            label="Steps"
            unit=""
            goalValue={stepGoal}
          />
          {stepsHistory.length < 2 && (
            <Text style={{ fontSize: 9, color: '#666680', fontFamily: 'DMSans_400Regular', marginTop: 4, fontStyle: 'italic' }}>
              Steps will populate here as you use the app going forward.
            </Text>
          )}
        </CollapsibleCard>

        {/* Active Calories Trend */}
        <CollapsibleCard label="Active Calories Trend">
          <LineChart
            data={activeCalHistory}
            color="#0d9268"
            label="Active Calories"
            unit=" kcal"
          />
          {activeCalHistory.length < 2 && (
            <Text style={{ fontSize: 9, color: '#666680', fontFamily: 'DMSans_400Regular', marginTop: 4, fontStyle: 'italic' }}>
              Active calories will populate here as you use the app going forward.
            </Text>
          )}
        </CollapsibleCard>

        {/* Period Summary */}
        <CollapsibleCard label="Summary">
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 14 }}>
            {(['7', '30', '90', '180', 'ytd'] as const).map(p => (
              <TouchableOpacity
                key={p}
                onPress={() => setActivePeriod(p)}
                style={{ flex: 1, paddingVertical: 6, borderRadius: 6, alignItems: 'center',
                  backgroundColor: activePeriod === p ? 'rgba(59,130,246,0.2)' : '#13131e',
                  borderWidth: 1, borderColor: activePeriod === p ? 'rgba(59,130,246,0.5)' : 'rgba(255,255,255,0.08)' }}>
                <Text style={{ fontSize: 11, fontFamily: 'DMSans_600SemiBold', color: activePeriod === p ? '#3b82f6' : '#666680' }}>
                  {p === 'ytd' ? 'YTD' : p === '7' ? '7D' : p === '30' ? '30D' : p === '90' ? '3M' : '6M'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={{ fontSize: 9, color: '#666680', fontFamily: 'DMSans_700Bold', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>
            {periodData.loggedDays} logged days · excludes flagged days
          </Text>
          <View style={styles.historyRow}>
            <Text style={styles.historyDate}>Avg Calories / Day</Text>
            <Text style={styles.historyVal}>{periodData.avgCal} kcal</Text>
          </View>
          <View style={styles.historyRow}>
            <Text style={styles.historyDate}>Avg Protein / Day</Text>
            <Text style={[styles.historyVal, { color: '#10b981' }]}>{periodData.avgProtein}g</Text>
          </View>
          <View style={styles.historyRow}>
            <Text style={styles.historyDate}>Avg Carbs / Day</Text>
            <Text style={[styles.historyVal, { color: '#f59e0b' }]}>{periodData.avgCarbs}g</Text>
          </View>
          <View style={styles.historyRow}>
            <Text style={styles.historyDate}>Avg Fat / Day</Text>
            <Text style={[styles.historyVal, { color: '#ef4444' }]}>{periodData.avgFat}g</Text>
          </View>
          <View style={styles.historyRow}>
            <Text style={styles.historyDate}>Avg Water / Day</Text>
            <Text style={styles.historyVal}>{periodData.avgWater} oz</Text>
          </View>
          <View style={styles.historyRow}>
            <Text style={styles.historyDate}>Workout Days</Text>
            <Text style={styles.historyVal}>{periodData.workoutDays} / {periodData.totalDays}</Text>
          </View>
          {periodData.startWeight && periodData.endWeight && (
            <View style={styles.historyRow}>
              <Text style={styles.historyDate}>Weight Change</Text>
              <Text style={[styles.historyVal, { color: periodData.endWeight < periodData.startWeight ? '#10b981' : periodData.endWeight > periodData.startWeight ? '#ef4444' : '#e8e8f0' }]}>
                {periodData.endWeight > periodData.startWeight ? '+' : ''}
                {Math.round((periodData.endWeight - periodData.startWeight) * 10) / 10} lbs
              </Text>
            </View>
          )}
        </CollapsibleCard>

        {/* Streaks */}
        <CollapsibleCard label="Streaks">
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={{ fontSize: 32, fontFamily: 'BebasNeue_400Regular', color: '#10b981' }}>{streaks.gym}</Text>
              <Text style={{ fontSize: 9, color: '#666680', fontFamily: 'DMSans_700Bold', letterSpacing: 2, textTransform: 'uppercase' }}>Gym</Text>
            </View>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={{ fontSize: 32, fontFamily: 'BebasNeue_400Regular', color: '#3b82f6' }}>{streaks.calories}</Text>
              <Text style={{ fontSize: 9, color: '#666680', fontFamily: 'DMSans_700Bold', letterSpacing: 2, textTransform: 'uppercase' }}>Calories</Text>
            </View>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={{ fontSize: 32, fontFamily: 'BebasNeue_400Regular', color: '#06b6d4' }}>{streaks.water}</Text>
              <Text style={{ fontSize: 9, color: '#666680', fontFamily: 'DMSans_700Bold', letterSpacing: 2, textTransform: 'uppercase' }}>Water</Text>
            </View>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={{ fontSize: 32, fontFamily: 'BebasNeue_400Regular', color: '#f59e0b' }}>{streaks.bible}</Text>
              <Text style={{ fontSize: 9, color: '#666680', fontFamily: 'DMSans_700Bold', letterSpacing: 2, textTransform: 'uppercase' }}>Bible</Text>
            </View>
          </View>
        </CollapsibleCard>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0f' },
  content: { padding: 16, paddingBottom: 80 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.06)', marginBottom: 16 },
  headerLabel: { fontSize: 9, letterSpacing: 2, color: '#666680', textTransform: 'uppercase', marginBottom: 2, fontFamily: 'DMSans_700Bold' },
  headerTitle: { fontSize: 32, color: '#e8e8f0', fontFamily: 'BebasNeue_400Regular', letterSpacing: 2 },
  card: { backgroundColor: '#1a1a24', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.06)', borderTopColor: 'rgba(255,255,255,0.1)', borderTopWidth: 0.5, borderRadius: 14, padding: 16, marginBottom: 12 },
  cardLabel: { fontSize: 9, letterSpacing: 3, color: '#666680', textTransform: 'uppercase', marginBottom: 0, fontFamily: 'DMSans_700Bold' },
  legend: { flexDirection: 'row', gap: 14, marginBottom: 12 },
  legendDot: { fontSize: 11, fontFamily: 'DMSans_500Medium' },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calDayHeader: { width: '14.28%', textAlign: 'center', fontSize: 9, letterSpacing: 1, color: '#666680', paddingVertical: 4, fontFamily: 'DMSans_700Bold' },
  calDay: { width: '14.28%', height: 36, borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  calDayToday: { borderWidth: 1, borderColor: 'rgba(59,130,246,0.5)' },
  calDayText: { fontSize: 14, fontFamily: 'DMSans_600SemiBold' },
  emptyText: { fontSize: 13, color: '#666680', fontStyle: 'italic', fontFamily: 'DMSans_400Regular' },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.04)' },
  historyDate: { fontSize: 12, color: '#666680', fontFamily: 'DMSans_400Regular' },
  historyVal: { fontSize: 13, color: '#e8e8f0', fontFamily: 'DMSans_600SemiBold' },
});