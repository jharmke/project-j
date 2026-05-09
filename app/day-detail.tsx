import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MEALS = ['Morning', 'Lunch', 'Dinner', 'Snacks'];
const WATER_TARGET = 128;

export default function DayDetailScreen() {
  const insets = useSafeAreaInsets();
  const { date } = useLocalSearchParams<{ date: string }>();
  const [data, setData] = useState<any>(null);
  const [loaded, setLoaded] = useState(false);
  const [excluded, setExcluded] = useState({ diet: false, water: false, exercise: false });
  const [workoutState, setWorkoutState] = useState<any>(null);
  const [mealsOpen, setMealsOpen] = useState(true);
  const [workoutOpen, setWorkoutOpen] = useState(true);
  const [summaryPage, setSummaryPage] = useState(0);
  const CARD_WIDTH = Dimensions.get('window').width - 32 - 32;

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const isToday = date === todayKey;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

  useEffect(() => {
    const load = async () => {
      try {
        const saved = await AsyncStorage.getItem(`pj_${date}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          setData(parsed);
          if (parsed.excluded) setExcluded(parsed.excluded);
        } else setData({});
        const ws = await AsyncStorage.getItem('pj_workout_state');
        if (ws) setWorkoutState(JSON.parse(ws));
      } catch (e) {
        setData({});
      } finally {
        setLoaded(true);
      }
    };
    load();
  }, [date]);

  const toggleExclude = async (key: 'diet' | 'water' | 'exercise') => {
    const updated = { ...excluded, [key]: !excluded[key] };
    setExcluded(updated);
    try {
      const saved = await AsyncStorage.getItem(`pj_${date}`);
      const current = saved ? JSON.parse(saved) : {};
      await AsyncStorage.setItem(`pj_${date}`, JSON.stringify({ ...current, excluded: updated }));
    } catch (e) {}
  };

  if (!loaded) return null;

  const entries = data?.entries || [];
  const totalCals = entries.reduce((s: number, e: any) => s + e.cal, 0);
  const totalProtein = Math.round(entries.reduce((s: number, e: any) => s + (e.protein || 0), 0) * 10) / 10;
  const totalCarbs = Math.round(entries.reduce((s: number, e: any) => s + (e.carbs || 0), 0) * 10) / 10;
  const totalFat = Math.round(entries.reduce((s: number, e: any) => s + (e.fat || 0), 0) * 10) / 10;
  const water = data?.water || 0;
  const weight = data?.weight || null;
  const caloriesBurned = data?.caloriesBurned || 0;
  const netcals = totalCals - caloriesBurned;
  const totalfiber = Math.round(entries.reduce((s: number, e: any) => { const n = e.foodnutrients?.find((fn: any) => fn.nutrientname === 'fiber, total dietary'); return s + ((n?.value || 0) * (e.calper100g > 0 ? e.cal / e.calper100g : 0)); }, 0) * 10) / 10;
  const totalsodium = Math.round(entries.reduce((s: number, e: any) => { const n = e.foodnutrients?.find((fn: any) => fn.nutrientname === 'sodium, na'); return s + ((n?.value || 0) * (e.calper100g > 0 ? e.cal / e.calper100g : 0)); }, 0));
  const totalsugar = Math.round(entries.reduce((s: number, e: any) => { const n = e.foodnutrients?.find((fn: any) => fn.nutrientname === 'sugars, total including nlea'); return s + ((n?.value || 0) * (e.calper100g > 0 ? e.cal / e.calper100g : 0)); }, 0) * 10) / 10;

  const dayprogram = workoutState?.programs?.[date];
  const daychecks = workoutState?.checks?.[date] || {};
  const daycardiolog = workoutState?.cardiologs?.[date] || {};
  const dayWorkoutNote = workoutState?.workoutNotes?.[date] || '';
  const exercises = dayprogram?.exercises || [];
  const donecount = exercises.filter((ex: any) => daychecks[ex.id]).length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity
              onPress={() => {
                const d = new Date(date + 'T12:00:00');
                d.setDate(d.getDate() - 1);
                const prev = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                router.replace({ pathname: '/day-detail', params: { date: prev } });
              }}
              style={{ padding: 12 }}>
              <Text style={{ color: '#3b82f6', fontSize: 20 }}>‹</Text>
            </TouchableOpacity>
            <Text style={[styles.headerDate, !isToday && { color: '#f59e0b' }]}>
              {formatDate(date || todayKey)}
            </Text>
            <TouchableOpacity
              disabled={isToday}
              onPress={() => {
                const d = new Date(date + 'T12:00:00');
                d.setDate(d.getDate() + 1);
                const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                if (next <= todayKey) router.replace({ pathname: '/day-detail', params: { date: next } });
              }}
              style={{ padding: 12 }}>
              <Text style={{ color: isToday ? '#333333' : '#3b82f6', fontSize: 20 }}>›</Text>
            </TouchableOpacity>
          </View>
          {!isToday && (
            <View style={styles.historyBadge}>
              <Text style={styles.historyBadgeText}>HISTORY</Text>
            </View>
          )}
        </View>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* Summary Card -- scrollable pages */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Summary</Text>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={e => setSummaryPage(Math.round(e.nativeEvent.contentOffset.x / CARD_WIDTH))}
            style={{ width: CARD_WIDTH }}>

            {/* Page 1 -- Calories & Macros */}
            <View style={{ width: CARD_WIDTH, flexDirection: 'column' }}>
              <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                <View style={styles.summaryStat}>
                  <Text style={styles.summaryVal}>{totalCals}</Text>
                  <Text style={styles.summaryLabel}>Cal Consumed</Text>
                </View>
                <View style={styles.summaryStat}>
                  <Text style={styles.summaryVal}>{caloriesBurned || '--'}</Text>
                  <Text style={styles.summaryLabel}>Cal Burned</Text>
                </View>
                <View style={styles.summaryStat}>
                  <Text style={styles.summaryVal}>{netcals}</Text>
                  <Text style={styles.summaryLabel}>Net Cal</Text>
                </View>
              </View>
              <View style={{ height: 0.5, backgroundColor: 'rgba(255,255,255,0.06)', marginBottom: 12 }} />
              <View style={{ flexDirection: 'row' }}>
                <View style={styles.summaryStat}>
                  <Text style={styles.summaryVal}>{totalProtein}<Text style={{ fontSize: 12, color: '#666680' }}>g</Text></Text>
                  <Text style={styles.summaryLabel}>Protein</Text>
                </View>
                <View style={styles.summaryStat}>
                  <Text style={styles.summaryVal}>{totalCarbs}<Text style={{ fontSize: 12, color: '#666680' }}>g</Text></Text>
                  <Text style={styles.summaryLabel}>Carbs</Text>
                </View>
                <View style={styles.summaryStat}>
                  <Text style={styles.summaryVal}>{totalFat}<Text style={{ fontSize: 12, color: '#666680' }}>g</Text></Text>
                  <Text style={styles.summaryLabel}>Fat</Text>
                </View>
              </View>
            </View>

            {/* Page 2 -- Body & Wellness */}
            <View style={{ width: CARD_WIDTH }}>
              <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                <View style={styles.summaryStat}>
                  <Text style={styles.summaryVal}>{weight ? `${weight}` : '--'}</Text>
                  <Text style={styles.summaryLabel}>Weight (lbs)</Text>
                </View>
                <View style={styles.summaryStat}>
                  <Text style={styles.summaryVal}>{water}</Text>
                  <Text style={styles.summaryLabel}>Water (oz)</Text>
                </View>
                <View style={styles.summaryStat}>
                  <Text style={styles.summaryVal}>{(() => { const s = data?.sleepOverride ?? data?.sleepHours; if (!s) return '--'; const h = Math.floor(s); const m = Math.round((s - h) * 60); return m > 0 ? `${h}h ${m}m` : `${h}h`; })()}</Text>
                  <Text style={styles.summaryLabel}>Sleep</Text>
                </View>
              </View>
            </View>

            {/* Page 3 -- Advanced Nutrition */}
            <View style={{ width: CARD_WIDTH }}>
              <Text style={{ fontSize: 9, color: '#666680', fontFamily: 'DMSans_700Bold', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>Advanced Nutrition</Text>
              {[
                { label: 'Fiber', value: totalfiber, unit: 'g', color: '#6366f1' },
                { label: 'Sugar', value: totalsugar, unit: 'g', color: '#ec4899' },
                { label: 'Sodium', value: totalsodium, unit: 'mg', color: '#8b5cf6' },
              ].map(n => (
                <View key={n.label} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.04)' }}>
                  <Text style={{ fontSize: 12, color: '#666680', fontFamily: 'DMSans_700Bold', letterSpacing: 1, textTransform: 'uppercase' }}>{n.label}</Text>
                  <Text style={{ fontSize: 12, color: n.value > 0 ? n.color : '#444455', fontFamily: 'DMSans_600SemiBold' }}>{n.value > 0 ? `${n.value}${n.unit}` : '--'}</Text>
                </View>
              ))}
            </View>

          </ScrollView>
          {/* Page dots */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 12 }}>
            {[0, 1, 2].map(i => (
              <View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: summaryPage === i ? '#3b82f6' : '#2a2a2a' }} />
            ))}
          </View>
        </View>

        {/* Workout Card -- collapsible */}
        <View style={styles.card}>
          <TouchableOpacity
            onPress={() => setWorkoutOpen(!workoutOpen)}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={styles.cardLabel}>{dayprogram ? `${dayprogram.focus || dayprogram.type} · ${donecount}/${exercises.length}` : 'Workout'}</Text>
            <Text style={{ color: '#666680', fontSize: 16 }}>{workoutOpen ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {workoutOpen && (
            <View style={{ marginTop: 8 }}>
              {exercises.length === 0 ? (
                <Text style={styles.emptyText}>No workout logged.</Text>
              ) : (
                exercises.map((ex: any) => (
                  <View key={ex.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 7, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.04)' }}>
                    <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: daychecks[ex.id] ? '#0d9268' : 'transparent', borderWidth: 1, borderColor: daychecks[ex.id] ? '#0d9268' : 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                      {daychecks[ex.id] && <Text style={{ color: '#000', fontSize: 10, fontWeight: '700' }}>✓</Text>}
                    </View>
                    <Text style={{ flex: 1, fontSize: 13, color: daychecks[ex.id] ? '#444455' : '#e8e8f0', fontFamily: 'DMSans_400Regular', textDecorationLine: daychecks[ex.id] ? 'line-through' : 'none' }}>{ex.name}</Text>
                    {ex.isCardio && (
                      <Text style={{ fontSize: 10, color: '#666680', fontFamily: 'DMSans_700Bold', letterSpacing: 1 }}>
                        {[ex.duration ? `${ex.duration}m` : null, ex.distance ? `${ex.distance}mi` : null].filter(Boolean).join(' · ')}
                      </Text>
                    )}
                  </View>
                ))
              )}
              {daycardiolog.effortScore && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                  <Text style={{ fontSize: 10, color: '#666680', fontFamily: 'DMSans_700Bold', letterSpacing: 2, textTransform: 'uppercase' }}>Effort Score</Text>
                  <Text style={{ fontSize: 16, color: '#e8e8f0', fontFamily: 'BebasNeue_400Regular', letterSpacing: 1 }}>{daycardiolog.effortScore} / 10</Text>
                </View>
              )}
              {dayWorkoutNote ? (
                <Text style={{ fontSize: 12, color: '#666680', fontFamily: 'DMSans_400Regular', marginTop: 8, fontStyle: 'italic' }}>{dayWorkoutNote}</Text>
              ) : null}
              {daycardiolog.caloriesBurned ? (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                  <Text style={{ fontSize: 10, color: '#666680', fontFamily: 'DMSans_700Bold', letterSpacing: 2, textTransform: 'uppercase' }}>Calories Burned</Text>
                  <Text style={{ fontSize: 16, color: '#cc3333', fontFamily: 'BebasNeue_400Regular', letterSpacing: 1 }}>{daycardiolog.caloriesBurned} kcal</Text>
                </View>
              ) : null}
            </View>
          )}
        </View>

        {/* Meals -- collapsible */}
        <View style={styles.card}>
          <TouchableOpacity
            onPress={() => setMealsOpen(!mealsOpen)}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={styles.cardLabel}>Meals · {totalCals} kcal</Text>
            <Text style={{ color: '#666680', fontSize: 16 }}>{mealsOpen ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {mealsOpen && (
            <View style={{ marginTop: 8 }}>
              {entries.length === 0 ? (
                <Text style={styles.emptyText}>No food logged this day.</Text>
              ) : (
                MEALS.map(meal => {
                  const mealEntries = entries.filter((e: any) => e.meal === meal);
                  const mealTotal = mealEntries.reduce((s: number, e: any) => s + e.cal, 0);
                  if (mealEntries.length === 0) return null;
                  return (
                    <View key={meal} style={{ marginBottom: 12 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                        <Text style={{ fontSize: 10, color: '#666680', fontFamily: 'DMSans_700Bold', letterSpacing: 2, textTransform: 'uppercase' }}>{meal}</Text>
                        <Text style={{ fontSize: 12, color: '#0d9268', fontFamily: 'DMSans_600SemiBold' }}>{mealTotal} kcal</Text>
                      </View>
                      {mealEntries.map((entry: any, i: number) => (
                        <View key={i} style={styles.foodRow}>
                          <Text style={styles.foodName} numberOfLines={1}>{entry.name}</Text>
                          <Text style={styles.foodCal}>{entry.cal} kcal</Text>
                        </View>
                      ))}
                    </View>
                  );
                })
              )}
            </View>
          )}
        </View>

        {/* Daily note */}
        {data?.dailyNote ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Daily Note</Text>
            <Text style={styles.noteText}>{data.dailyNote}</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Exclude from Stats</Text>
          <Text style={{ fontSize: 11, color: '#666680', fontFamily: 'DMSans_700Bold', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>
            Excluded days skipped in averages
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['diet', 'water', 'exercise'] as const).map(key => (
              <TouchableOpacity
                key={key}
                onPress={() => toggleExclude(key)}
                style={{
                  flex: 1, paddingVertical: 8, borderRadius: 6, alignItems: 'center',
                  backgroundColor: excluded[key] ? 'rgba(204,51,51,0.15)' : 'rgba(13,146,104,0.1)',
                  borderWidth: 0.5,
                  borderColor: excluded[key] ? 'rgba(204,51,51,0.4)' : 'rgba(13,146,104,0.25)',
                }}>
                <Text style={{
                  fontSize: 10, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase', letterSpacing: 1,
                  color: excluded[key] ? '#cc3333' : '#0d9268',
                }}>
                  {excluded[key] ? `✕ ${key}` : `✓ ${key}`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {!isToday && (
          <TouchableOpacity style={styles.backToTodayBtn} onPress={() => router.back()}>
            <Text style={styles.backToTodayText}>← Back to Today</Text>
          </TouchableOpacity>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0f' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.06)' },
  backBtn: { width: 60 },
  backBtnText: { color: '#3b82f6', fontSize: 14, fontFamily: 'DMSans_600SemiBold' },
  headerDate: { fontSize: 13, color: '#e8e8f0', fontFamily: 'DMSans_600SemiBold', textAlign: 'center' },
  historyBadge: { marginTop: 4, backgroundColor: 'rgba(245,158,11,0.15)', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 },
  historyBadgeText: { fontSize: 9, color: '#f59e0b', fontFamily: 'DMSans_700Bold', letterSpacing: 2 },
  content: { padding: 16, paddingBottom: 80 },
  card: { backgroundColor: '#1a1a24', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.06)', borderTopColor: 'rgba(255,255,255,0.1)', borderTopWidth: 0.5, borderRadius: 14, padding: 16, marginBottom: 12 },
  cardLabel: { fontSize: 9, letterSpacing: 3, color: '#666680', textTransform: 'uppercase', fontFamily: 'DMSans_700Bold', marginBottom: 10 },
  summaryStat: { alignItems: 'center', flex: 1 },
  summaryVal: { fontSize: 22, color: '#c8c8d8', fontFamily: 'BebasNeue_400Regular', letterSpacing: 1 },
  summaryLabel: { fontSize: 8, color: '#666680', fontFamily: 'DMSans_700Bold', marginTop: 2, letterSpacing: 1, textTransform: 'uppercase', textAlign: 'center' },
  foodRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.04)' },
  foodName: { fontSize: 13, color: '#e8e8f0', fontFamily: 'DMSans_400Regular', flex: 1, marginRight: 8 },
  foodCal: { fontSize: 13, color: '#666680', fontFamily: 'DMSans_600SemiBold' },
  emptyText: { fontSize: 13, color: '#444455', fontFamily: 'DMSans_400Regular', fontStyle: 'italic' },
  noteText: { fontSize: 13, color: '#888899', fontFamily: 'DMSans_400Regular', lineHeight: 20 },
  backToTodayBtn: { padding: 16, alignItems: 'center' },
  backToTodayText: { color: '#3b82f6', fontSize: 14, fontFamily: 'DMSans_600SemiBold' },
});