import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const CAL_TARGET = 1750;

type DayStatus = 'green' | 'yellow' | 'red' | 'future' | 'none';

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const [weightHistory, setWeightHistory] = useState<{date: string, w: number}[]>([]);
  const [calHistory, setCalHistory] = useState<{date: string, cal: number}[]>([]);
  const [excludedDays, setExcludedDays] = useState<{date: string, diet: boolean, water: boolean, exercise: boolean}[]>([]);
  const [periodData, setPeriodData] = useState({
    avgCal: 0, avgProtein: 0, avgCarbs: 0, avgFat: 0,
    avgWater: 0, workoutDays: 0, totalDays: 0, loggedDays: 0,
    startWeight: null as number | null,
    endWeight: null as number | null,
  });
  const [activePeriod, setActivePeriod] = useState<'7' | '30' | '90' | '180' | 'ytd'>('7');
  const [streaks, setStreaks] = useState({
  gym: 0,
  calories: 0,
  water: 0,
  bible: 0,
});

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
        const d = new Date();
        d.setDate(d.getDate() - i);
        dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
      }
    } else {
      const days = parseInt(period);
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
      }
    }

    let totalCal = 0, totalProtein = 0, totalCarbs = 0, totalFat = 0, totalWater = 0;
    let dietDays = 0, waterDays = 0, workoutDays = 0;
    let startWeight: number | null = null;
    let endWeight: number | null = null;

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
          if (data.weight) {
            if (startWeight === null) startWeight = data.weight;
            endWeight = data.weight;
          }
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
      workoutDays,
      totalDays: dates.length,
      loggedDays: dietDays,
      startWeight,
      endWeight,
    });
  };

 const loadStreaks = async () => {
  let gymStreak = 0, calStreak = 0, waterStreak = 0;
  let i = 0;
  while (true) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    try {
      const saved = await AsyncStorage.getItem(`pj_${dk}`);
      if (!saved) {
        if (i === 0) { i++; continue; }
        break;
      }
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
      i++;
      if (i > 365) break;
    } catch (e) { break; }
  }
  setStreaks({ gym: gymStreak, calories: calStreak, water: waterStreak, bible: 0 });
};


  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        const wh: {date: string, w: number}[] = [];
        const ch: {date: string, cal: number}[] = [];
        const exDays: {date: string, diet: boolean, water: boolean, exercise: boolean}[] = [];
        for (let d = 1; d <= daysInMonth; d++) {
          const dk = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          try {
            const saved = await AsyncStorage.getItem(`pj_${dk}`);
            if (saved) {
              const data = JSON.parse(saved);
              if (data.weight) wh.push({ date: dk, w: data.weight });
              if (data.entries) {
                const total = data.entries.reduce((s: number, e: any) => s + e.cal, 0);
                if (total > 0) ch.push({ date: dk, cal: total });
              }
              if (data.excluded && Object.values(data.excluded).some(v => v === true)) {
                exDays.push({ date: dk, diet: !!data.excluded.diet, water: !!data.excluded.water, exercise: !!data.excluded.exercise });
              }
            }
          } catch (e) {}
        }
        setWeightHistory(wh);
        setCalHistory(ch);
        setExcludedDays(exDays);
      };
     load();
      loadPeriodData(activePeriod);
      loadStreaks();
    }, [calendarMonth, calendarYear, activePeriod])
  );

  const getDayStatus = (day: number): DayStatus => {
    const dk = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (dk > today) return 'future';
    const calEntry = calHistory.find(c => c.date === dk);
    const weightEntry = weightHistory.find(w => w.date === dk);
    if (!calEntry && !weightEntry) return 'none';
    if (calEntry) {
      const pct = (calEntry.cal / CAL_TARGET) * 100;
      if (pct >= 80 && pct <= 106) return 'green';
      if (pct >= 63 && pct <= 114) return 'yellow';
      return 'red';
    }
    return 'none';
  };

  const dayStatusColor = (status: DayStatus) => {
    if (status === 'green') return { bg: 'rgba(16,185,129,0.25)', text: '#10b981' };
    if (status === 'yellow') return { bg: 'rgba(245,158,11,0.25)', text: '#f59e0b' };
    if (status === 'red') return { bg: 'rgba(239,68,68,0.2)', text: '#ef4444' };
    if (status === 'future') return { bg: 'transparent', text: '#333333' };
    return { bg: 'transparent', text: '#444444' };
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: insets.top + .5 }]}>

      <View style={styles.header}>
        <Text style={styles.headerLabel}>PROJECT J</Text>
        <Text style={styles.headerTitle}>Stats</Text>
      </View>

      {/* Calendar */}
      <View style={styles.card}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <TouchableOpacity onPress={goToPrevMonth} style={{ padding: 4 }}>
            <Text style={{ color: '#3b82f6', fontSize: 18, fontFamily: 'DMSans_600SemiBold' }}>‹</Text>
          </TouchableOpacity>
          <Text style={[styles.cardLabel, { marginBottom: 0 }]}>{MONTH_NAMES[month]} {year}</Text>
          <TouchableOpacity onPress={goToNextMonth} style={{ padding: 4 }}>
            <Text style={{ color: '#3b82f6', fontSize: 18, fontFamily: 'DMSans_600SemiBold' }}>›</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.legend}>
          <Text style={[styles.legendDot, { color: '#10b981' }]}>● Full</Text>
          <Text style={[styles.legendDot, { color: '#f59e0b' }]}>● Partial</Text>
          <Text style={[styles.legendDot, { color: '#ef4444' }]}>● Missed</Text>
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
            const isToday = day === now.getDate();
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
      </View>

      {/* Weight History */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Weight Log</Text>
        {weightHistory.length === 0 ? (
          <Text style={styles.emptyText}>No weight data yet. Log your weight daily on the home screen.</Text>
        ) : (
          weightHistory.slice(-7).map((w, i) => (
            <View key={i} style={styles.historyRow}>
              <Text style={styles.historyDate}>{w.date}</Text>
              <Text style={styles.historyVal}>{w.w} lbs</Text>
            </View>
          ))
        )}
      </View>

      {/* Calorie History */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Calorie Log</Text>
        {calHistory.length === 0 ? (
          <Text style={styles.emptyText}>No calorie data yet. Start logging meals in the Log tab.</Text>
        ) : (
          calHistory.slice(-7).map((c, i) => (
            <View key={i} style={styles.historyRow}>
              <Text style={styles.historyDate}>{c.date}</Text>
              <Text style={[styles.historyVal, { color: (() => { const p = (c.cal / CAL_TARGET) * 100; return p >= 80 && p <= 106 ? '#10b981' : p >= 63 && p <= 114 ? '#f59e0b' : '#ef4444'; })() }]}>{c.cal} kcal</Text>
            </View>
          ))
        )}
      </View>

      {/* Period Summary */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Summary</Text>
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 14 }}>
          {(['7', '30', '90', '180', 'ytd'] as const).map(p => (
            <TouchableOpacity
              key={p}
              onPress={() => setActivePeriod(p)}
              style={{ flex: 1, paddingVertical: 6, borderRadius: 6, alignItems: 'center',
                backgroundColor: activePeriod === p ? 'rgba(59,130,246,0.2)' : '#1e1e1e',
                borderWidth: 1, borderColor: activePeriod === p ? 'rgba(59,130,246,0.5)' : '#2a2a2a' }}>
              <Text style={{ fontSize: 11, fontFamily: 'DMSans_600SemiBold',
                color: activePeriod === p ? '#3b82f6' : '#888888' }}>
                {p === 'ytd' ? 'YTD' : p === '7' ? '7D' : p === '30' ? '30D' : p === '90' ? '3M' : '6M'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={{ fontSize: 10, color: '#666666', fontFamily: 'DMSans_400Regular', marginBottom: 10 }}>
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
            <Text style={[styles.historyVal, { color: periodData.endWeight < periodData.startWeight ? '#10b981' : periodData.endWeight > periodData.startWeight ? '#ef4444' : '#ffffff' }]}>
              {periodData.endWeight > periodData.startWeight ? '+' : ''}
              {Math.round((periodData.endWeight - periodData.startWeight) * 10) / 10} lbs
            </Text>
          </View>
        )}
      </View>

      {/* Streaks */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Streaks</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={{ alignItems: 'center', flex: 1 }}>
            <Text style={{ fontSize: 32, fontFamily: 'BebasNeue_400Regular', color: '#10b981' }}>{streaks.gym}</Text>
            <Text style={{ fontSize: 10, color: '#888888', fontFamily: 'DMSans_400Regular' }}>🏋️ Gym</Text>
          </View>
          <View style={{ alignItems: 'center', flex: 1 }}>
            <Text style={{ fontSize: 32, fontFamily: 'BebasNeue_400Regular', color: '#3b82f6' }}>{streaks.calories}</Text>
            <Text style={{ fontSize: 10, color: '#888888', fontFamily: 'DMSans_400Regular' }}>🍎 Calories</Text>
          </View>
          <View style={{ alignItems: 'center', flex: 1 }}>
            <Text style={{ fontSize: 32, fontFamily: 'BebasNeue_400Regular', color: '#06b6d4' }}>{streaks.water}</Text>
            <Text style={{ fontSize: 10, color: '#888888', fontFamily: 'DMSans_400Regular' }}>💧 Water</Text>
          </View>
          <View style={{ alignItems: 'center', flex: 1 }}>
            <Text style={{ fontSize: 32, fontFamily: 'BebasNeue_400Regular', color: '#f59e0b' }}>{streaks.bible}</Text>
            <Text style={{ fontSize: 10, color: '#888888', fontFamily: 'DMSans_400Regular' }}>📖 Bible</Text>
          </View>
        </View>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080808' },
  content: { padding: 16, paddingBottom: 80 },
  header: { paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#222222', marginBottom: 16 },
  headerLabel: { fontSize: 10, letterSpacing: 4, color: '#999999', textTransform: 'uppercase', marginBottom: 2, fontFamily: 'DMSans_500Medium' },
  headerTitle: { fontSize: 32, color: '#ffffff', fontFamily: 'BebasNeue_400Regular', letterSpacing: 2 },
  card: { backgroundColor: '#161616', borderWidth: 1, borderColor: '#2a2a2a', borderRadius: 10, padding: 16, marginBottom: 12 },
  cardLabel: { fontSize: 9, letterSpacing: 3, color: '#999999', textTransform: 'uppercase', marginBottom: 8, fontFamily: 'DMSans_500Medium' },
  legend: { flexDirection: 'row', gap: 14, marginBottom: 12 },
  legendDot: { fontSize: 11, fontFamily: 'DMSans_500Medium' },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calDayHeader: { width: '14.28%', textAlign: 'center', fontSize: 9, letterSpacing: 1, color: '#888888', paddingVertical: 4, fontFamily: 'DMSans_500Medium' },
  calDay: { width: '14.28%', aspectRatio: 1, borderRadius: 4, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  calDayToday: { borderWidth: 1, borderColor: '#999999' },
  calDayText: { fontSize: 11, fontWeight: '600', fontFamily: 'DMSans_600SemiBold' },
  emptyText: { fontSize: 13, color: '#888888', fontStyle: 'italic', fontFamily: 'DMSans_400Regular' },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1e1e1e' },
  historyDate: { fontSize: 12, color: '#999999', fontFamily: 'DMSans_400Regular' },
  historyVal: { fontSize: 13, color: '#ffffff', fontWeight: '600', fontFamily: 'DMSans_600SemiBold' },
});