import AsyncStorage from '@react-native-async-storage/async-storage';

import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';

const MEALS = ['Morning', 'Lunch', 'Dinner', 'Snacks'];
const WATER_TARGET = 128;

export default function DayDetailScreen() { return null; }

export function DayDetailContent({ date, onClose, todayBurned }: { date: string; onClose: () => void; todayBurned?: number }) {
  const insets = useSafeAreaInsets();
  const { theme, themeId } = useTheme();
  const [data, setData] = useState<any>(null);
  const [loaded, setLoaded] = useState(false);
  const [excluded, setExcluded] = useState({ diet: false, water: false, exercise: false });
  const [workoutState, setWorkoutState] = useState<any>(null);
  const [currentDate, setCurrentDate] = useState(date);
  const [mealsOpen, setMealsOpen] = useState(true);
  const [workoutOpen, setWorkoutOpen] = useState(true);
  const [summaryPage, setSummaryPage] = useState(0);
  const [profileBmr, setProfileBmr] = useState(0);
  const CARD_WIDTH = (Dimensions.get('window').width * 0.92) - 32 - 32;

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const isToday = currentDate === todayKey;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

  useEffect(() => {
    const load = async () => {
      try {
        const saved = await AsyncStorage.getItem(`pj_${currentDate}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          setData(parsed);
          if (parsed.excluded) setExcluded(parsed.excluded);
        } else setData({});
        const ws = await AsyncStorage.getItem('pj_workout_state');
        if (ws) setWorkoutState(JSON.parse(ws));
        const profileRaw = await AsyncStorage.getItem('pj_profile');
        if (profileRaw) {
          const p = JSON.parse(profileRaw);
          let w = null;
          const dayRaw = await AsyncStorage.getItem(`pj_${currentDate}`);
          if (dayRaw) { const dp = JSON.parse(dayRaw); if (dp.weight) w = dp.weight; }
          if (!w) {
            for (let i = 1; i <= 30; i++) {
              const d = new Date(currentDate + 'T12:00:00'); d.setDate(d.getDate() - i);
              const dk = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
              const ld = await AsyncStorage.getItem(`pj_${dk}`);
              if (ld) { const ldp = JSON.parse(ld); if (ldp.weight) { w = ldp.weight; break; } }
            }
          }
          if (w && p.birthday && p.heightFt && p.heightIn) {
            const wKg = w * 0.453592;
            const hCm = (parseFloat(p.heightFt) * 30.48) + (parseFloat(p.heightIn) * 2.54);
            const age = Math.floor((Date.now() - new Date(p.birthday).getTime()) / (365.25 * 24 * 3600 * 1000));
            const bmr = p.sex === 'male' ? Math.round((10*wKg)+(6.25*hCm)-(5*age)+5) : Math.round((10*wKg)+(6.25*hCm)-(5*age)-161);
            setProfileBmr(bmr);
          }
        }
      } catch (e) {
        setData({});
      } finally {
        setLoaded(true);
      }
    };
    load();
  }, [currentDate]);

  const toggleExclude = async (key: 'diet' | 'water' | 'exercise') => {
    const updated = { ...excluded, [key]: !excluded[key] };
    setExcluded(updated);
    try {
      const saved = await AsyncStorage.getItem(`pj_${currentDate}`);
      const current = saved ? JSON.parse(saved) : {};
      await AsyncStorage.setItem(`pj_${currentDate}`, JSON.stringify({ ...current, excluded: updated }));
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
  const caloriesBurned = isToday && todayBurned != null ? todayBurned : (data?.activeCalories || data?.caloriesBurned || 0);
  const now = new Date();
  const minutesToday = now.getHours() * 60 + now.getMinutes();
  const runningBmr = isToday && profileBmr > 0 ? Math.round((profileBmr / 1440) * minutesToday) : profileBmr;
  const netcals = totalCals - caloriesBurned - runningBmr;
  const totalfiber = Math.round(entries.reduce((s: number, e: any) => { const n = e.foodnutrients?.find((fn: any) => fn.nutrientname === 'fiber, total dietary'); return s + ((n?.value || 0) * (e.calper100g > 0 ? e.cal / e.calper100g : 0)); }, 0) * 10) / 10;
  const totalsodium = Math.round(entries.reduce((s: number, e: any) => { const n = e.foodnutrients?.find((fn: any) => fn.nutrientname === 'sodium, na'); return s + ((n?.value || 0) * (e.calper100g > 0 ? e.cal / e.calper100g : 0)); }, 0));
  const totalsugar = Math.round(entries.reduce((s: number, e: any) => { const n = e.foodnutrients?.find((fn: any) => fn.nutrientname === 'sugars, total including nlea'); return s + ((n?.value || 0) * (e.calper100g > 0 ? e.cal / e.calper100g : 0)); }, 0) * 10) / 10;

  const dayprogram = workoutState?.programs?.[currentDate];
  const daychecks = workoutState?.checks?.[currentDate] || {};
  const daycardiolog = workoutState?.cardiologs?.[currentDate] || {};
  const dayWorkoutNote = workoutState?.workoutNotes?.[currentDate] || '';
  const exercises = dayprogram?.exercises || [];
  const donecount = exercises.filter((ex: any) => daychecks[ex.id]).length;

  const styles = useStyles(theme, themeId);
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          <TouchableOpacity
            onPress={() => {
              const d = new Date(currentDate + 'T12:00:00');
              d.setDate(d.getDate() - 1);
              const prev = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
              setCurrentDate(prev);
            }}
            style={{ padding: 8 }}>
            <Text style={{ color: theme.accentBlue, fontSize: 20 }}>‹</Text>
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={[styles.headerDate, { color: theme.accentBlueRaw }]}>
              {formatDate(currentDate || todayKey)}
            </Text>
          </View>
          <TouchableOpacity
            disabled={isToday}
            onPress={() => {
              const d = new Date(currentDate + 'T12:00:00');
              d.setDate(d.getDate() + 1);
              const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
              if (next <= todayKey) setCurrentDate(next);
            }}
            style={{ padding: 8 }}>
            <Text style={{ color: isToday ? theme.textDim : theme.accentBlue, fontSize: 20 }}>›</Text>
          </TouchableOpacity>
        </View>
        </View>
      {!isToday && (
        <View style={{ alignItems: 'center', paddingVertical: 5 }}>
          <View style={styles.historyBadge}>
            <Text style={styles.historyBadgeText}>HISTORY</Text>
          </View>
        </View>
      )}

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
              <View style={{ height: 0.5, backgroundColor: theme.borderSubtle, marginBottom: 12 }} />
              <View style={{ flexDirection: 'row' }}>
                <View style={styles.summaryStat}>
                  <Text style={styles.summaryVal}>{totalProtein}<Text style={{ fontSize: 12, color: theme.textDim }}>g</Text></Text>
                  <Text style={styles.summaryLabel}>Protein</Text>
                </View>
                <View style={styles.summaryStat}>
                  <Text style={styles.summaryVal}>{totalCarbs}<Text style={{ fontSize: 12, color: theme.textDim }}>g</Text></Text>
                  <Text style={styles.summaryLabel}>Carbs</Text>
                </View>
                <View style={styles.summaryStat}>
                  <Text style={styles.summaryVal}>{totalFat}<Text style={{ fontSize: 12, color: theme.textDim }}>g</Text></Text>
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
              <Text style={{ fontSize: 9, color: theme.textDim, fontFamily: 'DMSans_700Bold', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>Advanced Nutrition</Text>
              {[
                { label: 'Fiber', value: totalfiber, unit: 'g', color: '#6366f1' },
                { label: 'Sugar', value: totalsugar, unit: 'g', color: '#ec4899' },
                { label: 'Sodium', value: totalsodium, unit: 'mg', color: '#8b5cf6' },
              ].map(n => (
                <View key={n.label} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 0.5, borderBottomColor: theme.borderSubtle }}>
                  <Text style={{ fontSize: 12, color: theme.textDim, fontFamily: 'DMSans_700Bold', letterSpacing: 1, textTransform: 'uppercase' }}>{n.label}</Text>
                  <Text style={{ fontSize: 12, color: n.value > 0 ? n.color : theme.textPlaceholder, fontFamily: 'DMSans_600SemiBold' }}>{n.value > 0 ? `${n.value}${n.unit}` : '--'}</Text>
                </View>
              ))}
            </View>

          </ScrollView>
          {/* Page dots */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 12 }}>
            {[0, 1, 2].map(i => (
              <View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: summaryPage === i ? theme.accentBlue : theme.bgInset }} />
            ))}
          </View>
        </View>

        {/* Workout Card -- collapsible */}
        <View style={styles.card}>
          <TouchableOpacity
            onPress={() => setWorkoutOpen(!workoutOpen)}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={styles.cardLabel}>{dayprogram ? `${dayprogram.focus || dayprogram.type} · ${donecount}/${exercises.length}` : 'Workout'}</Text>
            <Text style={{ color: theme.textDim, fontSize: 16 }}>{workoutOpen ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {workoutOpen && (
            <View style={{ marginTop: 8 }}>
              {exercises.length === 0 ? (
                <Text style={styles.emptyText}>No workout logged.</Text>
              ) : (
                exercises.map((ex: any) => (
                  <View key={ex.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 7, borderBottomWidth: 0.5, borderBottomColor: theme.borderSubtle }}>
                    <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: daychecks[ex.id] ? theme.accentGreen : 'transparent', borderWidth: 1, borderColor: daychecks[ex.id] ? theme.accentGreen : theme.borderSubtle, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                      {daychecks[ex.id] && <Text style={{ color: theme.bgPrimary, fontSize: 10, fontWeight: '700' }}>✓</Text>}
                    </View>
                    <Text style={{ flex: 1, fontSize: 13, color: daychecks[ex.id] ? theme.textDim : theme.textSecondary, fontFamily: 'DMSans_600SemiBold', textDecorationLine: daychecks[ex.id] ? 'line-through' : 'none' }}>{ex.name}</Text>
                    {ex.isCardio && (
                      <Text style={{ fontSize: 10, color: theme.textDim, fontFamily: 'DMSans_700Bold', letterSpacing: 1 }}>
                        {[ex.duration ? `${ex.duration}m` : null, ex.distance ? `${ex.distance}mi` : null].filter(Boolean).join(' · ')}
                      </Text>
                    )}
                  </View>
                ))
              )}
              {daycardiolog.effortScore && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                  <Text style={{ fontSize: 10, color: theme.textDim, fontFamily: 'DMSans_700Bold', letterSpacing: 2, textTransform: 'uppercase' }}>Effort Score</Text>
                  <Text style={{ fontSize: 16, color: theme.textPrimary, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1 }}>{daycardiolog.effortScore} / 10</Text>
                </View>
              )}
              {dayWorkoutNote ? (
                <Text style={{ fontSize: 12, color: theme.textDim, fontFamily: 'DMSans_400Regular', marginTop: 8, fontStyle: 'italic' }}>{dayWorkoutNote}</Text>
              ) : null}
              {daycardiolog.caloriesBurned ? (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                  <Text style={{ fontSize: 10, color: theme.textDim, fontFamily: 'DMSans_700Bold', letterSpacing: 2, textTransform: 'uppercase' }}>Calories Burned</Text>
                  <Text style={{ fontSize: 16, color: theme.accentRed, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1 }}>{daycardiolog.caloriesBurned} kcal</Text>
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
            <Text style={{ color: theme.textDim, fontSize: 16 }}>{mealsOpen ? '▲' : '▼'}</Text>
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
                        <Text style={{ fontSize: 10, color: theme.textDim, fontFamily: 'DMSans_700Bold', letterSpacing: 2, textTransform: 'uppercase' }}>{meal}</Text>
                        <Text style={{ fontSize: 12, color: theme.accentGreen, fontFamily: 'DMSans_600SemiBold' }}>{mealTotal} kcal</Text>
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
          <Text style={{ fontSize: 11, color: theme.textDim, fontFamily: 'DMSans_700Bold', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>
            Excluded days skipped in averages
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['diet', 'water', 'exercise'] as const).map(key => (
              <TouchableOpacity
                key={key}
                onPress={() => toggleExclude(key)}
                style={{
                  flex: 1, paddingVertical: 8, borderRadius: 6, alignItems: 'center',
                  backgroundColor: excluded[key] ? theme.accentRedBg : theme.accentGreenBg,
                  borderWidth: 0.5,
                  borderColor: excluded[key] ? theme.accentRedBorder : theme.accentGreenBorder,
                }}>
                <Text style={{
                  fontSize: 10, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase', letterSpacing: 1,
                  color: excluded[key] ? theme.accentRed : theme.accentGreen,
                }}>
                  {excluded[key] ? `✕ ${key}` : `✓ ${key}`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {!isToday && (
          <TouchableOpacity style={styles.backToTodayBtn} onPress={onClose}>
            <Text style={styles.backToTodayText}>Back to Today</Text>
          </TouchableOpacity>
        )}

      </ScrollView>
    </View>
  );
}

const useStyles = (theme: any, themeId: string) => {
  const shadowOpacity = ({ light: 0.35, dark: 0.14, slate: 0.28, warm: 0.30, blush: 0.30 } as Record<string, number>)[themeId] ?? 0.18;
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bgSheet },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 48, borderBottomWidth: 0.5, borderBottomColor: theme.borderCard },
  
  headerDate: { fontSize: 20, color: theme.textPrimary, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1.5, textAlign: 'center' },
  historyBadge: { marginTop: 4, backgroundColor: `${theme.accentBlueRaw}26`, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 },
  historyBadgeText: { fontSize: 9, color: theme.accentBlueRaw, fontFamily: 'DMSans_700Bold', letterSpacing: 2 },
  content: { padding: 16, paddingBottom: 80 },
  card: { backgroundColor: theme.bgCard, borderWidth: 1, borderColor: theme.borderCard, borderTopColor: theme.borderCardTop, borderTopWidth: 1, borderRadius: 14, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity, shadowRadius: 6, elevation: 3 },
  cardLabel: { fontSize: 9, letterSpacing: 3, color: theme.textDim, textTransform: 'uppercase', fontFamily: 'DMSans_700Bold', marginBottom: 10 },
  summaryStat: { alignItems: 'center', flex: 1 },
  summaryVal: { fontSize: 22, color: theme.textSecondary, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1 },
  summaryLabel: { fontSize: 8, color: theme.textDim, fontFamily: 'DMSans_700Bold', marginTop: 2, letterSpacing: 1, textTransform: 'uppercase', textAlign: 'center' },
  foodRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: theme.borderSubtle },
  foodName: { fontSize: 13, color: theme.textSecondary, fontFamily: 'DMSans_600SemiBold', flex: 1, marginRight: 8 },
  foodCal: { fontSize: 13, color: theme.textDim, fontFamily: 'DMSans_600SemiBold' },
  emptyText: { fontSize: 13, color: theme.textPlaceholder, fontFamily: 'DMSans_400Regular', fontStyle: 'italic' },
  noteText: { fontSize: 13, color: theme.textMuted, fontFamily: 'DMSans_400Regular', lineHeight: 20 },
  backToTodayBtn: { padding: 16, alignItems: 'center' },
  backToTodayText: { color: theme.accentBlue, fontSize: 14, fontFamily: 'DMSans_600SemiBold' },
  });
};