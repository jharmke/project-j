import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Animated, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { loadFromFirebase, saveToFirebase } from '../../firebaseConfig';
import { useTheme } from '../../theme';
import { useHealthKit } from '../../useHealthKit';


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
        <Circle cx={size/2} cy={size/2} r={radius} stroke="#0d9268" strokeWidth={strokeWidth} fill="none"
          strokeDasharray={`${proteinDash} ${circumference}`} strokeDashoffset={0} strokeLinecap="butt" />
        <Circle cx={size/2} cy={size/2} r={radius} stroke="#c47d1a" strokeWidth={strokeWidth} fill="none"
          strokeDasharray={`${carbsDash} ${circumference}`} strokeDashoffset={carbsOffset} strokeLinecap="butt" />
        <Circle cx={size/2} cy={size/2} r={radius} stroke="#a83232" strokeWidth={strokeWidth} fill="none"
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
  const { theme } = useTheme();
  const [loaded, setLoaded] = useState(false);
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [water, setWater] = useState(0);
  const [calTarget, setCalTarget] = useState(0);
  const [totalProtein, setTotalProtein] = useState(0);
  const [totalCarbs, setTotalCarbs] = useState(0);
  const [totalFat, setTotalFat] = useState(0);
  const [activePage, setActivePage] = useState(0);
  const [caloriesBurned, setCaloriesBurned] = useState(0);
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const [expandedMeals, setExpandedMeals] = useState<Record<string, boolean>>({});
  const mealAnimations = useRef<Record<string, Animated.Value>>({});
  const mealHeights = useRef<Record<string, number>>({});

  const getMealAnim = (meal: string) => {
    if (!mealAnimations.current[meal]) {
      mealAnimations.current[meal] = new Animated.Value(0);
    }
    return mealAnimations.current[meal];
  };
  const [activeDate, setActiveDate] = useState(todayKey);
  const { activeCalories } = useHealthKit();

  const goToPrevDay = () => {
    const d = new Date(activeDate + 'T12:00:00');
    d.setDate(d.getDate() - 1);
    setActiveDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  };

  const goToNextDay = () => {
    const d = new Date(activeDate + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (next <= todayKey) setActiveDate(next);
  };

  const isToday = activeDate === todayKey;

  const formatActiveDate = () => {
    const d = new Date(activeDate + 'T12:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  };
  
  const totalCals = entries.reduce((s, e) => s + e.cal, 0);
  const adjustedTarget = calTarget + caloriesBurned;
  const calPct = adjustedTarget > 0 ? (totalCals / adjustedTarget) * 100 : 0;
  const getAdvancedNutrient = (name: string) => {
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
      const existing = await AsyncStorage.getItem(`pj_${activeDate}`);
      const current = existing ? JSON.parse(existing) : {};
      await AsyncStorage.setItem(`pj_${activeDate}`, JSON.stringify({ ...current, [field]: value }));
    } catch (e) {
      console.log('Save error', e);
    }
  };

  useEffect(() => {
    const load = async () => {
    try {
        const saved = await AsyncStorage.getItem(`pj_${activeDate}`);
        if (saved) {
          const data = JSON.parse(saved);
          if (data.entries && Array.isArray(data.entries)) {
  setEntries(data.entries);
  setTotalProtein(Math.round(data.entries.reduce((s: number, e: any) => s + (e.protein || 0), 0) * 10) / 10);
  setTotalCarbs(Math.round(data.entries.reduce((s: number, e: any) => s + (e.carbs || 0), 0) * 10) / 10);
  setTotalFat(Math.round(data.entries.reduce((s: number, e: any) => s + (e.fat || 0), 0) * 10) / 10);
}
          if (typeof data.water === 'number') setWater(data.water);
        } else {
          const cloudData = await loadFromFirebase(todayKey);
          if (cloudData) {
            if (cloudData.entries && Array.isArray(cloudData.entries)) setEntries(cloudData.entries);
            if (typeof cloudData.water === 'number') setWater(cloudData.water);
            await AsyncStorage.setItem(`pj_${activeDate}`, JSON.stringify(cloudData));
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
            const dayData = await AsyncStorage.getItem(`pj_${activeDate}`);
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
        setEntries([]);
        setWater(0);
        setTotalProtein(0);
        setTotalCarbs(0);
        setTotalFat(0);
        try {
          const saved = await AsyncStorage.getItem(`pj_${activeDate}`);
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
            setEntries([]);
            setWater(0);
            setTotalProtein(0);
            setTotalCarbs(0);
            setTotalFat(0);
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
            const dayData = await AsyncStorage.getItem(`pj_${activeDate}`);
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
    }, [activeDate])
  );

  const deleteEntry = (idx: number) => {
    const newEntries = entries.filter((_, i) => i !== idx);
    setEntries(newEntries);
    saveField('entries', newEntries);
    saveToFirebase(activeDate, 'entries', newEntries);
  };

  const toggleMeal = (meal: string) => {
    const isCurrentlyOpen = expandedMeals[meal];
    const anim = getMealAnim(meal);
    Animated.spring(anim, {
      toValue: isCurrentlyOpen ? 0 : 1,
      useNativeDriver: false,
      bounciness: 0,
      speed: 20,
    }).start();
    setExpandedMeals(prev => ({ ...prev, [meal]: !prev[meal] }));
  };

  const updateWater = (oz: number) => {
    const newWater = Math.max(0, Math.min(WATER_TARGET, water + oz));
    setWater(newWater);
    saveField('water', newWater);
    saveToFirebase(activeDate, 'water', newWater);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: theme.bgPrimary }]}>
      <View style={[styles.header, { borderBottomColor: theme.borderCard }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerLabel, { color: theme.textMuted }]}>PROJECT J</Text>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Food Log</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 }}>
            <TouchableOpacity onPress={goToPrevDay} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Text style={{ color: theme.accentBlue, fontSize: 11, fontFamily: 'DMSans_700Bold', lineHeight: 12 }}>‹</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 9, color: isToday ? theme.textMuted : theme.accentAmber, fontFamily: 'DMSans_700Bold', letterSpacing: 2, textTransform: 'uppercase', lineHeight: 12 }}>
              {formatActiveDate()}
            </Text>
            <TouchableOpacity onPress={goToNextDay} disabled={isToday} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Text style={{ color: isToday ? theme.textDim : theme.accentBlue, fontSize: 11, fontFamily: 'DMSans_700Bold', lineHeight: 12 }}>›</Text>
            </TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.libraryBtn, { height: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder }]}
          onPress={() => router.push({ pathname: '/add-food', params: { meal: 'Morning', date: activeDate } })}>
          <Text style={[styles.libraryBtnText, { color: theme.accentBlue }]}>Library</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        onScrollBeginDrag={() => {}}
      >

      {/* Totals Card - Scrollable */}
      <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: theme.borderCardTop }]}>
        <Text style={[styles.cardLabel, { color: theme.textMuted }]}>Today's Total</Text>
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
                  <Text style={[styles.calTarget, { color: theme.textMuted }]}>/ {adjustedTarget} kcal</Text>
                </View>
                <View style={[styles.progressBarBg, { backgroundColor: theme.bgProgressTrack }]}>
                  <View style={[styles.progressBarFill, { width: `${Math.min(calPct, 100)}%`, backgroundColor: calColor }]} />
                </View>
                <Text style={[styles.calRemaining, { color: theme.textMuted }]}>
                  {adjustedTarget > 0 ? (totalCals < adjustedTarget ? `${adjustedTarget - totalCals} kcal remaining (${activeCalories} burned)` : `${totalCals - adjustedTarget} kcal over target (${activeCalories} burned)`) : ''}
                </Text>
              </View>
              <MacroDonut protein={totalProtein} carbs={totalCarbs} fat={totalFat} calories={totalCals} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: theme.borderSubtle }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ color: theme.macroProtein, fontSize: 16, fontFamily: 'BebasNeue_400Regular' }}>{totalProtein}g</Text>
                <Text style={{ color: theme.textMuted, fontSize: 10, fontFamily: 'DMSans_400Regular' }}>Protein</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ color: theme.macroCarbs, fontSize: 16, fontFamily: 'BebasNeue_400Regular' }}>{totalCarbs}g</Text>
                <Text style={{ color: theme.textMuted, fontSize: 10, fontFamily: 'DMSans_400Regular' }}>Carbs</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ color: theme.macroFat, fontSize: 16, fontFamily: 'BebasNeue_400Regular' }}>{totalFat}g</Text>
                <Text style={{ color: theme.textMuted, fontSize: 10, fontFamily: 'DMSans_400Regular' }}>Fat</Text>
              </View>
            </View>
          </View>

          {/* Page 2 - Advanced Nutrition */}
          <View style={{ width: SCREEN_WIDTH, paddingTop: 4 }}>
            <Text style={{ fontSize: 9, letterSpacing: 2, color: theme.textMuted, textTransform: 'uppercase', fontFamily: 'DMSans_500Medium', marginBottom: 10 }}>Advanced Nutrition</Text>
            {[
              { label: 'Fiber', value: totalFiber, unit: 'g', color: '#6366f1' },
              { label: 'Sugar', value: totalSugar, unit: 'g', color: '#ec4899' },
              { label: 'Sodium', value: totalSodium, unit: 'mg', color: '#8b5cf6' },
              { label: 'Cholesterol', value: totalCholesterol, unit: 'mg', color: '#14b8a6' },
              { label: 'Saturated Fat', value: totalSatFat, unit: 'g', color: '#f97316' },
            ].map(n => (
              <View key={n.label} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: theme.borderSubtle }}>
                <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'DMSans_400Regular' }}>{n.label}</Text>
                <Text style={{ fontSize: 12, color: n.value > 0 ? n.color : theme.textDim, fontFamily: 'DMSans_600SemiBold' }}>
                  {n.value > 0 ? `${n.value}${n.unit}` : '--'}
                </Text>
              </View>
            ))}
          </View>

        </ScrollView>

        {/* Page dots */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 12 }}>
          {[0, 1].map(i => (
            <View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: activePage === i ? theme.accentBlue : theme.donutTrack }} />
          ))}
        </View>
      </View>

      {/* Meal Sections */}
      {MEALS.map(meal => {
        const mealEntries = entries.filter(e => e.meal === meal);
        const mealTotal = mealEntries.reduce((s, e) => s + e.cal, 0);
        const isExpanded = expandedMeals[meal];

        return (
          <View key={meal} style={[styles.mealRow, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: theme.borderCardTop }]}>
            {/* + button on left */}
            <TouchableOpacity
              style={styles.mealAddBtn}
              onPress={() => router.push({ pathname: '/add-food', params: { meal, date: todayKey } })}>
              <Text style={[styles.mealAddBtnText, { color: theme.macroProtein }]}>+</Text>
            </TouchableOpacity>

            {/* Meal info middle */}
            <TouchableOpacity style={styles.mealInfo} onPress={() => toggleMeal(meal)}>
              <Text style={[styles.mealName, { color: theme.textPrimary }]}>{meal}</Text>
              {mealTotal > 0 && <Text style={[styles.mealCals, { color: theme.textMuted }]}>{mealTotal} kcal</Text>}
            </TouchableOpacity>

            {/* Chevron on right */}
            <TouchableOpacity style={styles.mealChevron} onPress={() => toggleMeal(meal)}>
              <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={14} color={theme.textMuted} />
            </TouchableOpacity>

            {/* Expanded food list */}
            {(
              <Animated.View style={{
                overflow: 'hidden',
                width: '100%',
                opacity: getMealAnim(meal),
                height: getMealAnim(meal).interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, mealEntries.length === 0 ? 60 : (mealEntries.length * 60) + 16],
                }),
              }}>
              <View style={[styles.mealExpanded, { borderTopColor: theme.borderCard }]}>
                {mealEntries.length === 0 ? (
                  <Text style={[styles.emptyMealText, { color: theme.textDim }]}>Nothing logged yet. Tap + to add.</Text>
                ) : (
                  mealEntries.map((entry, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[styles.foodEntry, { borderBottomColor: theme.borderSubtle }]}
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
                        <Text style={[styles.foodEntryName, { color: theme.textPrimary }]} numberOfLines={1}>{entry.name}</Text>
                        {(entry.protein || entry.carbs || entry.fat) ? (
                          <Text style={[styles.foodEntryMacros, { color: theme.textMuted }]}>
                            {entry.protein ? `P: ${entry.protein}g` : ''}
                            {entry.carbs ? `  C: ${entry.carbs}g` : ''}
                            {entry.fat ? `  F: ${entry.fat}g` : ''}
                          </Text>
                        ) : null}
                      </View>
                      <View style={styles.foodEntryRight}>
                        <Text style={[styles.foodEntryCal, { color: theme.macroProtein }]}>{entry.cal}</Text>
                        <Text style={[styles.foodEntryCalLabel, { color: theme.textMuted }]}>kcal</Text>
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
                          <Text style={[styles.foodEntryDeleteText, { color: theme.textDim }]}>×</Text>
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </View>
              </Animated.View>
            )}
          </View>
        );
      })}

      {/* Water Card */}
      <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: theme.borderCardTop }]}>
        <Text style={[styles.cardLabel, { color: theme.textMuted }]}>Water · {water}oz / {WATER_TARGET}oz</Text>
        <View style={[styles.progressBarBg, { backgroundColor: theme.bgProgressTrack }]}>
          <View style={[styles.progressBarFill, { width: `${waterPct}%`, backgroundColor: theme.accentBlue }]} />
        </View>
        <View style={styles.waterBtns}>
          <TouchableOpacity style={[styles.waterBtn, { backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder }]} onPress={() => updateWater(12)}>
            <Text style={[styles.waterBtnText, { color: theme.accentBlue }]}>+12 oz</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.waterBtn, { backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder }]} onPress={() => updateWater(16)}>
            <Text style={[styles.waterBtnText, { color: theme.accentBlue }]}>+16 oz</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.waterBtn, { backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder }]} onPress={() => updateWater(22)}>
            <Text style={[styles.waterBtnText, { color: theme.accentBlue }]}>+22 oz</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.waterBtns, { marginTop: 8 }]}>
          <TouchableOpacity style={[styles.waterBtnRed, { backgroundColor: theme.accentRedBg, borderColor: theme.accentRedBorder }]} onPress={() => updateWater(-12)}>
            <Text style={[styles.waterBtnRedText, { color: theme.accentRed }]}>-12 oz</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.waterBtnRed, { backgroundColor: theme.accentRedBg, borderColor: theme.accentRedBorder }]} onPress={() => updateWater(-16)}>
            <Text style={[styles.waterBtnRedText, { color: theme.accentRed }]}>-16 oz</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.waterBtnRed, { backgroundColor: theme.accentRedBg, borderColor: theme.accentRedBorder }]} onPress={() => updateWater(-22)}>
            <Text style={[styles.waterBtnRedText, { color: theme.accentRed }]}>-22 oz</Text>
          </TouchableOpacity>
        </View>
      </View>

    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1 },
  content:            { padding: 16, paddingBottom: 80 },
  header:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 0.5, marginBottom: 16 },
  headerLabel:        { fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2, fontFamily: 'DMSans_700Bold' },
  headerTitle:        { fontSize: 32, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2 },
  libraryBtn:         { borderWidth: 1, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 },
  libraryBtnText:     { fontSize: 14, fontFamily: 'DMSans_700Bold' },
  card:               { borderWidth: 0.5, borderTopWidth: 0.5, borderRadius: 14, padding: 16, marginBottom: 12 },
  cardLabel:          { fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8, fontFamily: 'DMSans_700Bold' },
  calRow:             { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 10 },
  calNumber:          { fontSize: 52, lineHeight: 56, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1 },
  calTarget:          { fontSize: 14, fontFamily: 'DMSans_700Bold', letterSpacing: 0.3 },
  progressBarBg:      { height: 6, borderRadius: 6, overflow: 'hidden', marginBottom: 12 },
  progressBarFill:    { height: '100%', borderRadius: 6 },
  calRemaining:       { fontSize: 10, fontFamily: 'DMSans_700Bold', letterSpacing: 1.5, textTransform: 'uppercase' },
  mealRow:            { borderWidth: 0.5, borderTopWidth: 0.5, borderRadius: 14, marginBottom: 8, overflow: 'hidden' },
  mealAddBtn:         { position: 'absolute', left: 14, top: 14, zIndex: 1, width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  mealAddBtnText:     { fontSize: 22, fontFamily: 'DMSans_400Regular', lineHeight: 24 },
  mealInfo:           { paddingLeft: 50, paddingRight: 40, paddingVertical: 14 },
  mealName:           { fontSize: 16, fontFamily: 'DMSans_600SemiBold' },
  mealCals:           { fontSize: 10, fontFamily: 'DMSans_700Bold', marginTop: 2, letterSpacing: 1.5, textTransform: 'uppercase' },
  mealChevron:        { position: 'absolute', right: 14, top: 14, width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  mealChevronText:    { fontSize: 14, fontFamily: 'DMSans_400Regular' },
  mealExpanded:       { borderTopWidth: 0.5, paddingHorizontal: 16, paddingVertical: 8 },
  foodEntry:          { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 0.5 },
  foodEntryLeft:      { flex: 1, marginRight: 8 },
  foodEntryName:      { fontSize: 13, fontFamily: 'DMSans_400Regular' },
  foodEntryMacros:    { fontSize: 10, fontFamily: 'DMSans_700Bold', marginTop: 2, letterSpacing: 1, textTransform: 'uppercase' },
  foodEntryRight:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  foodEntryCal:       { fontSize: 16, fontFamily: 'BebasNeue_400Regular' },
  foodEntryCalLabel:  { fontSize: 10, fontFamily: 'DMSans_400Regular' },
  foodEntryDelete:    { marginLeft: 8, padding: 4 },
  foodEntryDeleteText:{ fontSize: 18 },
  emptyMealText:      { fontSize: 11, fontFamily: 'DMSans_400Regular', fontStyle: 'italic', paddingVertical: 8 },
  waterBtns:          { flexDirection: 'row', gap: 8 },
  waterBtn:           { flex: 1, padding: 10, borderWidth: 0.5, borderRadius: 8, alignItems: 'center' },
  waterBtnText:       { fontFamily: 'BebasNeue_400Regular', fontSize: 15, letterSpacing: 1 },
  waterBtnRed:        { flex: 1, padding: 10, borderWidth: 0.5, borderRadius: 8, alignItems: 'center' },
  waterBtnRedText:    { fontFamily: 'BebasNeue_400Regular', fontSize: 15, letterSpacing: 1 },
});