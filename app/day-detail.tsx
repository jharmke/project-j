import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MEALS = ['Morning', 'Lunch', 'Dinner', 'Snacks'];
const WATER_TARGET = 128;

export default function DayDetailScreen() {
  const insets = useSafeAreaInsets();
  const { date } = useLocalSearchParams<{ date: string }>();
  const [data, setData] = useState<any>(null);
  const [loaded, setLoaded] = useState(false);
  const [excluded, setExcluded] = useState({ diet: false, water: false, exercise: false });

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

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity onPress={() => {
              const d = new Date(date + 'T12:00:00');
              d.setDate(d.getDate() - 1);
              const prev = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
              router.replace({ pathname: '/day-detail', params: { date: prev } });
            }}>
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
              }}>
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

        {/* Summary Card */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Summary</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryStat}>
              <Text style={[styles.summaryVal, { color: '#10b981' }]}>{totalCals}</Text>
              <Text style={styles.summaryLabel}>Calories</Text>
            </View>
            <View style={styles.summaryStat}>
              <Text style={[styles.summaryVal, { color: '#3b82f6' }]}>{totalProtein}g</Text>
              <Text style={styles.summaryLabel}>Protein</Text>
            </View>
            <View style={styles.summaryStat}>
              <Text style={[styles.summaryVal, { color: '#f59e0b' }]}>{totalCarbs}g</Text>
              <Text style={styles.summaryLabel}>Carbs</Text>
            </View>
            <View style={styles.summaryStat}>
              <Text style={[styles.summaryVal, { color: '#ef4444' }]}>{totalFat}g</Text>
              <Text style={styles.summaryLabel}>Fat</Text>
            </View>
          </View>
          <View style={[styles.summaryRow, { marginTop: 12 }]}>
            <View style={styles.summaryStat}>
              <Text style={styles.summaryVal}>{water}<Text style={{ fontSize: 12, color: '#888888' }}> oz</Text></Text>
              <Text style={styles.summaryLabel}>Water</Text>
            </View>
            <View style={styles.summaryStat}>
              <Text style={styles.summaryVal}>{weight ? `${weight} lbs` : '--'}</Text>
              <Text style={styles.summaryLabel}>Weight</Text>
            </View>
          </View>
        </View>

        {/* Meal breakdown */}
        {MEALS.map(meal => {
          const mealEntries = entries.filter((e: any) => e.meal === meal);
          const mealTotal = mealEntries.reduce((s: number, e: any) => s + e.cal, 0);
          if (mealEntries.length === 0) return null;
          return (
            <View key={meal} style={styles.card}>
              <View style={styles.mealHeader}>
                <Text style={styles.cardLabel}>{meal}</Text>
                <Text style={styles.mealTotal}>{mealTotal} kcal</Text>
              </View>
              {mealEntries.map((entry: any, i: number) => (
                <View key={i} style={styles.foodRow}>
                  <Text style={styles.foodName} numberOfLines={1}>{entry.name}</Text>
                  <Text style={styles.foodCal}>{entry.cal} kcal</Text>
                </View>
              ))}
            </View>
          );
        })}

        {entries.length === 0 && (
          <View style={styles.card}>
            <Text style={styles.emptyText}>No food logged this day.</Text>
          </View>
        )}

        {/* Daily note */}
        {data?.dailyNote ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Daily Note</Text>
            <Text style={styles.noteText}>{data.dailyNote}</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Exclude from Stats</Text>
          <Text style={{ fontSize: 11, color: '#888888', fontFamily: 'DMSans_400Regular', marginBottom: 12 }}>
            Excluded days are skipped in weekly, monthly, and YTD averages.
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['diet', 'water', 'exercise'] as const).map(key => (
              <TouchableOpacity
                key={key}
                onPress={() => toggleExclude(key)}
                style={{
                  flex: 1, paddingVertical: 8, borderRadius: 6, alignItems: 'center',
                  backgroundColor: excluded[key] ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.1)',
                  borderWidth: 1,
                  borderColor: excluded[key] ? 'rgba(239,68,68,0.4)' : 'rgba(16,185,129,0.25)',
                }}>
                <Text style={{
                  fontSize: 11, fontFamily: 'DMSans_600SemiBold', textTransform: 'capitalize',
                  color: excluded[key] ? '#ef4444' : '#10b981',
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
  container: { flex: 1, backgroundColor: '#080808' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#222222' },
  backBtn: { width: 60 },
  backBtnText: { color: '#3b82f6', fontSize: 14, fontFamily: 'DMSans_500Medium' },
  headerDate: { fontSize: 14, color: '#ffffff', fontFamily: 'DMSans_600SemiBold', textAlign: 'center' },
  historyBadge: { marginTop: 4, backgroundColor: 'rgba(245,158,11,0.15)', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 },
  historyBadgeText: { fontSize: 9, color: '#f59e0b', fontFamily: 'DMSans_700Bold', letterSpacing: 2 },
  content: { padding: 16, paddingBottom: 80 },
  card: { backgroundColor: '#161616', borderWidth: 1, borderColor: '#2a2a2a', borderRadius: 10, padding: 16, marginBottom: 12 },
  cardLabel: { fontSize: 9, letterSpacing: 3, color: '#999999', textTransform: 'uppercase', fontFamily: 'DMSans_500Medium', marginBottom: 10 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around' },
  summaryStat: { alignItems: 'center' },
  summaryVal: { fontSize: 22, color: '#ffffff', fontFamily: 'BebasNeue_400Regular', letterSpacing: 1 },
  summaryLabel: { fontSize: 10, color: '#888888', fontFamily: 'DMSans_400Regular', marginTop: 2 },
  mealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  mealTotal: { fontSize: 13, color: '#10b981', fontFamily: 'DMSans_600SemiBold' },
  foodRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#1e1e1e' },
  foodName: { fontSize: 13, color: '#e8e8e8', fontFamily: 'DMSans_400Regular', flex: 1, marginRight: 8 },
  foodCal: { fontSize: 13, color: '#888888', fontFamily: 'DMSans_500Medium' },
  emptyText: { fontSize: 13, color: '#444444', fontFamily: 'DMSans_400Regular', fontStyle: 'italic' },
  noteText: { fontSize: 13, color: '#888888', fontFamily: 'DMSans_400Regular', lineHeight: 20 },
  backToTodayBtn: { padding: 16, alignItems: 'center' },
  backToTodayText: { color: '#3b82f6', fontSize: 14, fontFamily: 'DMSans_600SemiBold' },
});