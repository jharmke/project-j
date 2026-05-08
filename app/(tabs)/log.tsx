import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { loadFromFirebase, saveToFirebase } from '../../firebaseConfig';


const WATER_TARGET = 128;
const MEALS = ['Morning', 'Lunch', 'Dinner', 'Snacks'];

interface FoodEntry {
  name: string;
  cal: number;
  meal: string;
  protein?: number;
  carbs?: number;
  fat?: number;
  timestamp?: number;
  calPer100g?: number;
  proteinPer100g?: number;
  carbsPer100g?: number;
  fatPer100g?: number;
  foodNutrients?: any[];
}


const SCREEN_WIDTH = Dimensions.get('window').width - 32 - 32; // full width minus padding minus card padding

function MacroDonut({ protein, carbs, fat, calories }: { protein: number; carbs: number; fat: number; calories: number }) {
  const size = 100;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = protein + carbs + fat;
  if (total === 0) {
    return (
      <View style={{ alignItems: 'center', justifyContent: 'center', width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle cx={size/2} cy={size/2} r={radius} stroke="#2a2a2a" strokeWidth={strokeWidth} fill="none" />
        </Svg>
        <View style={{ position: 'absolute', alignItems: 'center' }}>
          <Text style={{ color: '#444444', fontSize: 10, fontFamily: 'DMSans_400Regular' }}>no data</Text>
        </View>
      </View>
    );
  }
  const proteinPct = protein / total;
  const carbsPct = carbs / total;
  const fatPct = fat / total;
  const proteinDash = proteinPct * circumference;
  const carbsDash = carbsPct * circumference;
  const fatDash = fatPct * circumference;
  const carbsOffset = -(proteinPct * circumference);
  const fatOffset = -((proteinPct + carbsPct) * circumference);
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: size, height: size }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size/2} cy={size/2} r={radius} stroke="#2a2a2a" strokeWidth={strokeWidth} fill="none" />
        <Circle cx={size/2} cy={size/2} r={radius} stroke="#10b981" strokeWidth={strokeWidth} fill="none"
          strokeDasharray={`${proteinDash} ${circumference}`} strokeDashoffset={0} strokeLinecap="butt" />
        <Circle cx={size/2} cy={size/2} r={radius} stroke="#f59e0b" strokeWidth={strokeWidth} fill="none"
          strokeDasharray={`${carbsDash} ${circumference}`} strokeDashoffset={carbsOffset} strokeLinecap="butt" />
        <Circle cx={size/2} cy={size/2} r={radius} stroke="#ef4444" strokeWidth={strokeWidth} fill="none"
          strokeDasharray={`${fatDash} ${circumference}`} strokeDashoffset={fatOffset} strokeLinecap="butt" />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={{ color: '#ffffff', fontSize: 14, fontFamily: 'BebasNeue_400Regular' }}>{calories}</Text>
        <Text style={{ color: '#888888', fontSize: 8, fontFamily: 'DMSans_400Regular' }}>kcal</Text>
      </View>
    </View>
  );
}

export default function LogScreen() {
  const insets = useSafeAreaInsets();
  const [loaded, setLoaded] = useState(false);
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [water, setWater] = useState(0);
  const [calTarget, setCalTarget] = useState(0);
  const [expandedMeals, setExpandedMeals] = useState<Record<string, boolean>>({});
  const [caloriesBurned, setCaloriesBurned] = useState(0);
  const [activePage, setActivePage] = useState(0);
const [totalProtein, setTotalProtein] = useState(0);
const [totalCarbs, setTotalCarbs] = useState(0);
const [totalFat, setTotalFat] = useState(0);
const today = new Date();
const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const totalCals = entries.reduce((s, e) => s + e.cal, 0);
  const adjustedTarget = calTarget + caloriesBurned;
const calPct = (totalCals / adjustedTarget) * 100;
  const getAdvancedNutrient = (name: string, unitName?: string) => {
    return Math.round(entries.reduce((s, e) => {
      const n = e.foodNutrients?.find((fn: any) => fn.nutrientName === name);
      return s + ((n?.value || 0) * ((e.calPer100g && e.calPer100g > 0) ? (e.cal / e.calPer100g) : 0));
    }, 0) * 10) / 10;
  };
  const totalFiber = getAdvancedNutrient('Fiber, total dietary');
  const totalSugar = getAdvancedNutrient('Sugars, total including NLEA');
  const totalSodium = getAdvancedNutrient('Sodium, Na');
  const totalCholesterol = getAdvancedNutrient('Cholesterol');
  const totalSatFat = getAdvancedNutrient('Fatty acids, total saturated');
  const calColor = calPct > 114 ? '#ef4444' : calPct > 106 ? '#f59e0b' : calPct >= 80 ? '#10b981' : calPct >= 63 ? '#f59e0b' : '#ef4444';
  const waterPct = Math.min(100, (water / WATER_TARGET) * 100);

  const saveField = async (field: string, value: any) => {
    try {
      const existing = await AsyncStorage.getItem(`pj_${todayKey}`);
      const current = existing ? JSON.parse(existing) : {};
      await AsyncStorage.setItem(`pj_${todayKey}`, JSON.stringify({ ...current, [field]: value }));
    } catch (e) {
      console.log('Save error', e);
    }
  };

  useEffect(() => {
    const load = async () => {
    try {
        const saved = await AsyncStorage.getItem(`pj_${todayKey}`);
        if (saved) {
          const data = JSON.parse(saved);
          if (data.entries && Array.isArray(data.entries)) {
  setEntries(data.entries);
  setTotalProtein(Math.round(data.entries.reduce((s: number, e: any) => s + (e.protein || 0), 0) * 10) / 10);
  setTotalCarbs(Math.round(data.entries.reduce((s: number, e: any) => s + (e.carbs || 0), 0) * 10) / 10);
  setTotalFat(Math.round(data.entries.reduce((s: number, e: any) => s + (e.fat || 0), 0) * 10) / 10);
}
          if (typeof data.water === 'number') setWater(data.water);
            if (data.caloriesBurned) setCaloriesBurned(parseInt(data.caloriesBurned) || 0);
        } else {
          const cloudData = await loadFromFirebase(todayKey);
          if (cloudData) {
            if (cloudData.entries && Array.isArray(cloudData.entries)) setEntries(cloudData.entries);
            if (typeof cloudData.water === 'number') setWater(cloudData.water);
            await AsyncStorage.setItem(`pj_${todayKey}`, JSON.stringify(cloudData));
          }
        }
        const profileData = await AsyncStorage.getItem('pj_profile');
        if (profileData) {
          const p = JSON.parse(profileData);
          const GOAL_DEFICITS: Record<string, number> = {
            lose_2: -1000, lose_1_5: -750, lose_1: -500, lose_0_5: -250,
            maintain: 0, gain_0_5: 250, gain_1: 500,
          };
          if (p.calTarget && parseInt(p.calTarget) > 0) {
            setCalTarget(parseInt(p.calTarget));
          } else if (p.activityLevel && p.weightGoal) {
            const ACTIVITY_MULTIPLIERS: Record<string, number> = {
              sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9,
            };
            const dayData = await AsyncStorage.getItem(`pj_${todayKey}`);
            const weight = dayData ? JSON.parse(dayData)?.weight : null;
            if (weight && p.birthday && p.heightFt && p.heightIn) {
              const weightKg = weight * 0.453592;
              const heightCm = (parseFloat(p.heightFt) * 30.48) + (parseFloat(p.heightIn) * 2.54);
              const age = Math.floor((Date.now() - new Date(p.birthday).getTime()) / (365.25 * 24 * 3600 * 1000));
              const bmr = p.sex === 'male'
                ? Math.round((10 * weightKg) + (6.25 * heightCm) - (5 * age) + 5)
                : Math.round((10 * weightKg) + (6.25 * heightCm) - (5 * age) - 161);
              const tdee = Math.round(bmr * (ACTIVITY_MULTIPLIERS[p.activityLevel] || 1.55));
              const deficit = GOAL_DEFICITS[p.weightGoal] ?? -500;
              setCalTarget(tdee + deficit);
            }
          }
        }
      } catch (e) {
        console.log('Load error', e);
      } finally {
        setLoaded(true);
      }
    };
    load();
  }, []);

  useFocusEffect(
    useCallback(() => {
      const reload = async () => {
        try {
          const saved = await AsyncStorage.getItem(`pj_${todayKey}`);
          if (saved) {
            const data = JSON.parse(saved);
            if (data.entries && Array.isArray(data.entries)) {
  setEntries(data.entries);
  setTotalProtein(Math.round(data.entries.reduce((s: number, e: any) => s + (e.protein || 0), 0) * 10) / 10);
  setTotalCarbs(Math.round(data.entries.reduce((s: number, e: any) => s + (e.carbs || 0), 0) * 10) / 10);
  setTotalFat(Math.round(data.entries.reduce((s: number, e: any) => s + (e.fat || 0), 0) * 10) / 10);
}
            if (typeof data.water === 'number') setWater(data.water);
          }
        const profileData = await AsyncStorage.getItem('pj_profile');
        if (profileData) {
          const p = JSON.parse(profileData);
          const GOAL_DEFICITS: Record<string, number> = {
            lose_2: -1000, lose_1_5: -750, lose_1: -500, lose_0_5: -250,
            maintain: 0, gain_0_5: 250, gain_1: 500,
          };
          if (p.calTarget && parseInt(p.calTarget) > 0) {
            setCalTarget(parseInt(p.calTarget));
          } else if (p.activityLevel && p.weightGoal) {
            const ACTIVITY_MULTIPLIERS: Record<string, number> = {
              sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9,
            };
            const dayData = await AsyncStorage.getItem(`pj_${todayKey}`);
            const weight = dayData ? JSON.parse(dayData)?.weight : null;
            if (weight && p.birthday && p.heightFt && p.heightIn) {
              const weightKg = weight * 0.453592;
              const heightCm = (parseFloat(p.heightFt) * 30.48) + (parseFloat(p.heightIn) * 2.54);
              const age = Math.floor((Date.now() - new Date(p.birthday).getTime()) / (365.25 * 24 * 3600 * 1000));
              const bmr = p.sex === 'male'
                ? Math.round((10 * weightKg) + (6.25 * heightCm) - (5 * age) + 5)
                : Math.round((10 * weightKg) + (6.25 * heightCm) - (5 * age) - 161);
              const tdee = Math.round(bmr * (ACTIVITY_MULTIPLIERS[p.activityLevel] || 1.55));
              const deficit = GOAL_DEFICITS[p.weightGoal] ?? -500;
              setCalTarget(tdee + deficit);
            }
          }
        }
        } catch (e) {
          console.log('Reload error', e);
        }
      };
      reload();
    }, [])
  );

  const deleteEntry = (idx: number) => {
    const newEntries = entries.filter((_, i) => i !== idx);
    setEntries(newEntries);
    saveField('entries', newEntries);
    saveToFirebase(todayKey, 'entries', newEntries);
  };

  const toggleMeal = (meal: string) => {
    setExpandedMeals(prev => ({ ...prev, [meal]: !prev[meal] }));
  };

  const updateWater = (oz: number) => {
    const newWater = Math.max(0, Math.min(WATER_TARGET, water + oz));
    setWater(newWater);
    saveField('water', newWater);
    saveToFirebase(todayKey, 'water', newWater);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + .5 }]}
      onScrollBeginDrag={() => {}}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerLabel}>PROJECT J</Text>
          <Text style={styles.headerTitle}>Food Log</Text>
        </View>
        <TouchableOpacity
          style={styles.libraryBtn}
          onPress={() => router.push({ pathname: '/add-food', params: { meal: 'Morning', date: todayKey } })}>
          <Text style={styles.libraryBtnText}>Library</Text>
        </TouchableOpacity>
      </View>

      {/* Totals Card - Scrollable */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Today's Total</Text>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={e => setActivePage(Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH))}
          style={{ width: SCREEN_WIDTH }}>

         {/* Page 1 - Calories + Macros */}
          <View style={{ width: SCREEN_WIDTH }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <View style={styles.calRow}>
                  <Text style={[styles.calNumber, { color: calColor }]}>{totalCals}</Text>
                  <Text style={styles.calTarget}>/ {adjustedTarget} kcal</Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${Math.min(calPct, 100)}%`, backgroundColor: calColor }]} />
                </View>
                <Text style={styles.calRemaining}>
          {adjustedTarget > 0 ? (totalCals < adjustedTarget ? `${adjustedTarget - totalCals} kcal remaining (${caloriesBurned} burned)` : `${totalCals - adjustedTarget} kcal over target (${caloriesBurned} burned)`) : ''}
        </Text>
              </View>
              <MacroDonut protein={totalProtein} carbs={totalCarbs} fat={totalFat} calories={totalCals} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#2a2a2a' }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ color: '#10b981', fontSize: 16, fontFamily: 'BebasNeue_400Regular' }}>{totalProtein}g</Text>
                <Text style={{ color: '#888888', fontSize: 10, fontFamily: 'DMSans_400Regular' }}>Protein</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ color: '#f59e0b', fontSize: 16, fontFamily: 'BebasNeue_400Regular' }}>{totalCarbs}g</Text>
                <Text style={{ color: '#888888', fontSize: 10, fontFamily: 'DMSans_400Regular' }}>Carbs</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ color: '#ef4444', fontSize: 16, fontFamily: 'BebasNeue_400Regular' }}>{totalFat}g</Text>
                <Text style={{ color: '#888888', fontSize: 10, fontFamily: 'DMSans_400Regular' }}>Fat</Text>
              </View>
            </View>
          </View>

          {/* Page 3 - Advanced Nutrition */}
          <View style={{ width: SCREEN_WIDTH, paddingTop: 4 }}>
            <Text style={{ fontSize: 9, letterSpacing: 2, color: '#888888', textTransform: 'uppercase', fontFamily: 'DMSans_500Medium', marginBottom: 10 }}>Advanced Nutrition</Text>
            {[
              { label: 'Fiber', value: totalFiber, unit: 'g', color: '#6366f1' },
              { label: 'Sugar', value: totalSugar, unit: 'g', color: '#ec4899' },
              { label: 'Sodium', value: totalSodium, unit: 'mg', color: '#8b5cf6' },
              { label: 'Cholesterol', value: totalCholesterol, unit: 'mg', color: '#14b8a6' },
              { label: 'Saturated Fat', value: totalSatFat, unit: 'g', color: '#f97316' },
            ].map(n => (
              <View key={n.label} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#1e1e1e' }}>
                <Text style={{ fontSize: 12, color: '#888888', fontFamily: 'DMSans_400Regular' }}>{n.label}</Text>
                <Text style={{ fontSize: 12, color: n.value > 0 ? n.color : '#444444', fontFamily: 'DMSans_600SemiBold' }}>
                  {n.value > 0 ? `${n.value}${n.unit}` : '--'}
                </Text>
              </View>
            ))}
          </View>

        </ScrollView>

        {/* Page dots */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 12 }}>
          {[0, 1].map(i => (
            <View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: activePage === i ? '#3b82f6' : '#2a2a2a' }} />
          ))}
        </View>
      </View>


      {/* Meal Sections */}
      {MEALS.map(meal => {
        const mealEntries = entries.filter(e => e.meal === meal);
        const mealTotal = mealEntries.reduce((s, e) => s + e.cal, 0);
        const isExpanded = expandedMeals[meal];

        return (
          <View key={meal} style={styles.mealRow}>
            {/* + button on left */}
            <TouchableOpacity
              style={styles.mealAddBtn}
              onPress={() => router.push({ pathname: '/add-food', params: { meal, date: todayKey } })}>
              <Text style={styles.mealAddBtnText}>+</Text>
            </TouchableOpacity>

            {/* Meal info middle */}
            <TouchableOpacity style={styles.mealInfo} onPress={() => toggleMeal(meal)}>
              <Text style={styles.mealName}>{meal}</Text>
              {mealTotal > 0 && <Text style={styles.mealCals}>{mealTotal} kcal</Text>}
            </TouchableOpacity>

            {/* Chevron on right */}
            <TouchableOpacity style={styles.mealChevron} onPress={() => toggleMeal(meal)}>
              <Text style={styles.mealChevronText}>{isExpanded ? '∧' : '∨'}</Text>
            </TouchableOpacity>

            {/* Expanded food list */}
            {isExpanded && mealEntries.length > 0 && (
              <View style={styles.mealExpanded}>
                {mealEntries.map((entry, i) => (
                  <TouchableOpacity
  key={i}
  style={styles.foodEntry}
  onPress={() => router.push({
    pathname: '/food-detail',
    params: {
    foodJson: JSON.stringify({
  description: entry.name.replace(/\s*\(.*?\)\s*$/, ''),
  calPer100g: entry.calPer100g || 0,
  proteinPer100g: entry.proteinPer100g || 0,
  carbsPer100g: entry.carbsPer100g || 0,
  fatPer100g: entry.fatPer100g || 0,
  existingCal: entry.cal,
  existingProtein: entry.protein || 0,
  existingCarbs: entry.carbs || 0,
  existingFat: entry.fat || 0,
  foodNutrients: (entry as any).foodNutrients || [],
  existingAmount: (() => { const m = entry.name.match(/\((\d+\.?\d*)(g|oz|serving)\)/); return m ? m[1] : '100'; })(),
  existingUnit: (() => { const m = entry.name.match(/\((\d+\.?\d*)(g|oz|serving)\)/); return m ? m[2] : 'g'; })(),
  timestamp: entry.timestamp || Date.now(),
}),
      meal: entry.meal,
      date: todayKey,
      entryIndex: String(entries.indexOf(entry)),
    }
  })}>
                    <View style={styles.foodEntryLeft}>
                      <Text style={styles.foodEntryName} numberOfLines={1}>{entry.name}</Text>
                      {(entry.protein || entry.carbs || entry.fat) ? (
                        <Text style={styles.foodEntryMacros}>
                          {entry.protein ? `P: ${entry.protein}g` : ''}
                          {entry.carbs ? `  C: ${entry.carbs}g` : ''}
                          {entry.fat ? `  F: ${entry.fat}g` : ''}
                        </Text>
                      ) : null}
                    </View>
                    <View style={styles.foodEntryRight}>
                      <Text style={styles.foodEntryCal}>{entry.cal}</Text>
                      <Text style={styles.foodEntryCalLabel}>kcal</Text>
                      <TouchableOpacity 
  onPress={() => {
    Alert.alert(
      'Remove Entry',
      `Remove ${entry.name} from your log?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => deleteEntry(entries.indexOf(entry)) }
      ]
    );
  }} 
  style={styles.foodEntryDelete}>
  <Text style={styles.foodEntryDeleteText}>×</Text>
</TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {isExpanded && mealEntries.length === 0 && (
              <View style={styles.mealExpanded}>
                <Text style={styles.emptyMealText}>Nothing logged yet. Tap + to add.</Text>
              </View>
            )}
          </View>
        );
      })}

      {/* Water Card */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Water · {water}oz / {WATER_TARGET}oz</Text>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${waterPct}%`, backgroundColor: '#3b82f6' }]} />
        </View>
        <View style={styles.waterBtns}>
          <TouchableOpacity style={styles.waterBtn} onPress={() => updateWater(12)}>
            <Text style={styles.waterBtnText}>+12 oz</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.waterBtn} onPress={() => updateWater(16)}>
            <Text style={styles.waterBtnText}>+16 oz</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.waterBtn} onPress={() => updateWater(22)}>
            <Text style={styles.waterBtnText}>+22 oz</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.waterBtns, { marginTop: 8 }]}>
          <TouchableOpacity style={styles.waterBtnRed} onPress={() => updateWater(-12)}>
            <Text style={styles.waterBtnRedText}>-12 oz</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.waterBtnRed} onPress={() => updateWater(-16)}>
            <Text style={styles.waterBtnRedText}>-16 oz</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.waterBtnRed} onPress={() => updateWater(-22)}>
            <Text style={styles.waterBtnRedText}>-22 oz</Text>
          </TouchableOpacity>
        </View>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080808' },
  content: { padding: 16, paddingBottom: 80 },
  header: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#222222', marginBottom: 16 },
  headerLabel: { fontSize: 10, letterSpacing: 4, color: '#999999', textTransform: 'uppercase', marginBottom: 2, fontFamily: 'DMSans_500Medium' },
  headerTitle: { fontSize: 32, color: '#ffffff', fontFamily: 'BebasNeue_400Regular', letterSpacing: 2 },
  libraryBtn: { backgroundColor: 'rgba(59,130,246,0.15)', borderWidth: 1, borderColor: 'rgba(59,130,246,0.3)', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 },
  libraryBtnText: { color: '#3b82f6', fontSize: 13, fontFamily: 'DMSans_600SemiBold' },
  card: { backgroundColor: '#161616', borderWidth: 1, borderColor: '#2a2a2a', borderRadius: 10, padding: 16, marginBottom: 12 },
  cardLabel: { fontSize: 9, letterSpacing: 3, color: '#999999', textTransform: 'uppercase', marginBottom: 8, fontFamily: 'DMSans_500Medium' },
  calRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 10 },
  calNumber: { fontSize: 52, lineHeight: 56, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1 },
  calTarget: { fontSize: 14, color: '#999999', fontFamily: 'DMSans_400Regular' },
  progressBarBg: { height: 6, backgroundColor: '#2a2a2a', borderRadius: 6, overflow: 'hidden', marginBottom: 12 },
  progressBarFill: { height: '100%', borderRadius: 6 },
  calRemaining: { fontSize: 12, color: '#999999', fontFamily: 'DMSans_400Regular' },
  mealRow: { backgroundColor: '#161616', borderWidth: 1, borderColor: '#2a2a2a', borderRadius: 10, marginBottom: 8, overflow: 'hidden' },
  mealAddBtn: { position: 'absolute', left: 14, top: 14, zIndex: 1, width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  mealAddBtnText: { color: '#10b981', fontSize: 22, fontFamily: 'DMSans_400Regular', lineHeight: 24 },
  mealInfo: { paddingLeft: 50, paddingRight: 40, paddingVertical: 14 },
  mealName: { fontSize: 16, color: '#ffffff', fontFamily: 'DMSans_600SemiBold' },
  mealCals: { fontSize: 12, color: '#999999', fontFamily: 'DMSans_400Regular', marginTop: 2 },
  mealChevron: { position: 'absolute', right: 14, top: 14, width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  mealChevronText: { color: '#888888', fontSize: 14, fontFamily: 'DMSans_400Regular' },
  mealExpanded: { borderTopWidth: 1, borderTopColor: '#2a2a2a', paddingHorizontal: 16, paddingVertical: 8 },
  foodEntry: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1e1e1e' },
  foodEntryLeft: { flex: 1, marginRight: 8 },
  foodEntryName: { fontSize: 13, color: '#e8e8e8', fontFamily: 'DMSans_400Regular' },
  foodEntryMacros: { fontSize: 11, color: '#888888', fontFamily: 'DMSans_400Regular', marginTop: 2 },
  foodEntryRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  foodEntryCal: { fontSize: 16, color: '#10b981', fontFamily: 'BebasNeue_400Regular' },
  foodEntryCalLabel: { fontSize: 10, color: '#888888', fontFamily: 'DMSans_400Regular' },
  foodEntryDelete: { marginLeft: 8, padding: 4 },
  foodEntryDeleteText: { fontSize: 18, color: '#444444' },
  emptyMealText: { fontSize: 12, color: '#444444', fontFamily: 'DMSans_400Regular', fontStyle: 'italic', paddingVertical: 8 },
  waterBtns: { flexDirection: 'row', gap: 8 },
  waterBtn: { flex: 1, padding: 10, backgroundColor: 'rgba(59,130,246,0.1)', borderWidth: 1, borderColor: 'rgba(59,130,246,0.25)', borderRadius: 6, alignItems: 'center' },
  waterBtnText: { color: '#3b82f6', fontFamily: 'BebasNeue_400Regular', fontSize: 15, letterSpacing: 1 },
  waterBtnRed: { flex: 1, padding: 10, backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)', borderRadius: 6, alignItems: 'center' },
  waterBtnRedText: { color: '#ef4444', fontFamily: 'BebasNeue_400Regular', fontSize: 15, letterSpacing: 1 },
});