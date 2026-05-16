import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Animated, Dimensions, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { loadFromFirebase, saveToFirebase } from '../../firebaseConfig';
import CustomFoodCreator from '../../components/CustomFoodCreator';
import { useTheme } from '../../theme';
import { useToast } from '../../components/Toast';
import { useHealthKit } from '../../useHealthKit';
import ReAnimated, { useAnimatedStyle, useSharedValue, withTiming, useAnimatedProps } from 'react-native-reanimated';


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

const AnimCircle = ReAnimated.createAnimatedComponent(Circle);

function MacroDonut({ protein, carbs, fat, calories, theme }: { protein: number; carbs: number; fat: number; calories: number; theme: any }) {
  const size = 100;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = protein + carbs + fat;

  const proteinAnim = useSharedValue(0);
  const carbsAnim   = useSharedValue(0);
  const fatAnim     = useSharedValue(0);

  useEffect(() => {
    proteinAnim.value = 0;
    carbsAnim.value   = 0;
    fatAnim.value     = 0;
    if (total === 0) return;
    const proteinTarget = (protein / total) * circumference;
    const carbsTarget   = (carbs   / total) * circumference;
    const fatTarget     = (fat     / total) * circumference;
    setTimeout(() => {
      proteinAnim.value = withTiming(proteinTarget, { duration: 800 });
    }, 200);
    setTimeout(() => {
      carbsAnim.value = withTiming(carbsTarget, { duration: 700 });
    }, 900);
    setTimeout(() => {
      fatAnim.value = withTiming(fatTarget, { duration: 600 });
    }, 1500);
  }, [protein, carbs, fat]);

  const proteinProps = useAnimatedProps(() => ({ strokeDasharray: `${proteinAnim.value} ${circumference}` } as any));
  const carbsProps   = useAnimatedProps(() => ({ strokeDasharray: `${carbsAnim.value} ${circumference}` } as any));
  const fatProps     = useAnimatedProps(() => ({ strokeDasharray: `${fatAnim.value} ${circumference}` } as any));

  const proteinPct = total > 0 ? protein / total : 0;
  const carbsPct   = total > 0 ? carbs   / total : 0;

  if (total === 0) {
    return (
      <View style={{ alignItems: 'center', justifyContent: 'center', width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle cx={size/2} cy={size/2} r={radius} stroke={theme.donutTrack} strokeWidth={strokeWidth} fill="none" />
        </Svg>
        <View style={{ position: 'absolute', alignItems: 'center' }}>
          <Text style={{ color: theme.textDim, fontSize: 10, fontFamily: 'DMSans_400Regular' }}>no data</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: size, height: size }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size/2} cy={size/2} r={radius} stroke={theme.donutTrack} strokeWidth={strokeWidth} fill="none" />
        <AnimCircle cx={size/2} cy={size/2} r={radius} stroke={theme.macroProtein} strokeWidth={strokeWidth} fill="none"
          animatedProps={proteinProps} strokeDashoffset={0} strokeLinecap="butt" />
        <AnimCircle cx={size/2} cy={size/2} r={radius} stroke={theme.macroCarbs} strokeWidth={strokeWidth} fill="none"
          animatedProps={carbsProps} strokeDashoffset={-(proteinPct * circumference)} strokeLinecap="butt" />
        <AnimCircle cx={size/2} cy={size/2} r={radius} stroke={theme.macroFat} strokeWidth={strokeWidth} fill="none"
          animatedProps={fatProps} strokeDashoffset={-((proteinPct + carbsPct) * circumference)} strokeLinecap="butt" />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={{ color: theme.textPrimary, fontSize: 14, fontFamily: 'BebasNeue_400Regular' }}>{calories}</Text>
        <Text style={{ color: theme.textMuted, fontSize: 8, fontFamily: 'DMSans_400Regular' }}>kcal</Text>
      </View>
    </View>
  );
}

function WaterBar({ pct, color, trackColor, refreshKey }: { pct: number; color: string; trackColor?: string; refreshKey?: number }) {
  const width = useSharedValue(pct);
  useEffect(() => {
    width.value = withTiming(Math.min(100, pct), { duration: 600 });
  }, [pct]);
  const animStyle = useAnimatedStyle(() => ({ width: `${width.value}%` as any }));
  return (
    <View style={[{ height: 6, borderRadius: 6, overflow: 'hidden', marginBottom: 12 }, { backgroundColor: trackColor ?? '#1e1e2e' }]}>
      <ReAnimated.View style={[{ height: '100%', borderRadius: 6, backgroundColor: color }, animStyle]} />
    </View>
  );
}

export default function LogScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { showToast } = useToast();
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
  const [visibleMeals, setVisibleMeals] = useState<Record<string, boolean>>({});
  const mealAnimations = useRef<Record<string, Animated.Value>>({});

  const getMealAnim = (meal: string) => {
    if (!mealAnimations.current[meal]) {
      mealAnimations.current[meal] = new Animated.Value(0);
    }
    return mealAnimations.current[meal];
  };
  const [activeDate, setActiveDate] = useState(todayKey);
  const [waterPresets, setWaterPresets] = useState<[number,number,number]>([12,16,22]);
  const [showWaterCustomModal, setShowWaterCustomModal] = useState(false);
  const [waterCustomSign, setWaterCustomSign] = useState<'add'|'subtract'>('add');
  const [waterCustomInput, setWaterCustomInput] = useState('');
  const [logRefreshKey, setLogRefreshKey] = useState(0);
  const { activeCalories } = useHealthKit();
  const [showCreateFood, setShowCreateFood] = useState(false);
  const [styleMode, setStyleMode] = useState<'discipline' | 'balanced' | 'mindful'>('balanced');

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
  const adjustedTarget = calTarget + (activeCalories > 0 ? activeCalories : caloriesBurned);
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
  const calDelta = Math.abs(totalCals - adjustedTarget);
  const calColor = styleMode === 'mindful'
    ? theme.textSecondary
    : styleMode === 'discipline'
      ? calDelta <= 50  ? theme.statusGood
      : calDelta <= 149 ? theme.statusWarn
      : theme.statusBad
    : /* balanced */ calDelta <= 150 ? theme.statusGood
      : calDelta <= 300 ? theme.statusWarn
      : theme.statusBad;
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
          if (p.waterPresets) setWaterPresets(p.waterPresets);
          const GOAL_DEFICITS: Record<string, number> = {
            lose_2: -1000, lose_1_5: -750, lose_1: -500, lose_0_5: -250,
            maintain: 0, gain_0_5: 250, gain_1: 500,
          };
          if (p.calTarget && parseInt(p.calTarget) > 0) {
            setCalTarget(parseInt(p.calTarget));
          } else if (p.lifestyleActivity && p.trainingFrequency && p.weightGoal) {
            const LIFESTYLE_MULTIPLIERS: Record<string, number> = {
              sedentary: 1.2, light: 1.3, active: 1.45, very_active: 1.6,
            };
            const TRAINING_BONUSES: Record<string, number> = {
              none: 0, '1x': 100, '3x': 200, '5x': 300, daily: 400,
            };
            const dayData = await AsyncStorage.getItem(`pj_${activeDate}`);
            const weight = dayData ? JSON.parse(dayData)?.weight : null;
            if (weight && p.birthday && p.heightFt && p.heightIn) {
              const weightKg = weight * 0.453592;
              const heightCm = (parseFloat(p.heightFt) * 30.48) + (parseFloat(p.heightIn) * 2.54);
              const parts = p.birthday.split('-');
              const age = Math.floor((Date.now() - new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2])).getTime()) / (365.25 * 24 * 3600 * 1000));
              const bmr = p.sex === 'male'
                ? Math.round((10 * weightKg) + (6.25 * heightCm) - (5 * age) + 5)
                : Math.round((10 * weightKg) + (6.25 * heightCm) - (5 * age) - 161);
              const tdee = Math.round((bmr * (LIFESTYLE_MULTIPLIERS[p.lifestyleActivity] ?? 1.2)) + (TRAINING_BONUSES[p.trainingFrequency] ?? 0));
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
      AsyncStorage.getItem('pj_settings').then(s => {
        if (s) { const d = JSON.parse(s); if (d.styleMode) setStyleMode(d.styleMode); }
      });
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
          if (p.waterPresets) setWaterPresets(p.waterPresets);
          const GOAL_DEFICITS: Record<string, number> = {
            lose_2: -1000, lose_1_5: -750, lose_1: -500, lose_0_5: -250,
            maintain: 0, gain_0_5: 250, gain_1: 500,
          };
          if (p.calTarget && parseInt(p.calTarget) > 0) {
            setCalTarget(parseInt(p.calTarget));
          } else if (p.lifestyleActivity && p.trainingFrequency && p.weightGoal) {
            const LIFESTYLE_MULTIPLIERS: Record<string, number> = {
              sedentary: 1.2, light: 1.3, active: 1.45, very_active: 1.6,
            };
            const TRAINING_BONUSES: Record<string, number> = {
              none: 0, '1x': 100, '3x': 200, '5x': 300, daily: 400,
            };
            const dayData = await AsyncStorage.getItem(`pj_${activeDate}`);
            const weight = dayData ? JSON.parse(dayData)?.weight : null;
            if (weight && p.birthday && p.heightFt && p.heightIn) {
              const weightKg = weight * 0.453592;
              const heightCm = (parseFloat(p.heightFt) * 30.48) + (parseFloat(p.heightIn) * 2.54);
              const parts = p.birthday.split('-');
              const age = Math.floor((Date.now() - new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2])).getTime()) / (365.25 * 24 * 3600 * 1000));
              const bmr = p.sex === 'male'
                ? Math.round((10 * weightKg) + (6.25 * heightCm) - (5 * age) + 5)
                : Math.round((10 * weightKg) + (6.25 * heightCm) - (5 * age) - 161);
              const tdee = Math.round((bmr * (LIFESTYLE_MULTIPLIERS[p.lifestyleActivity] ?? 1.2)) + (TRAINING_BONUSES[p.trainingFrequency] ?? 0));
              const deficit = GOAL_DEFICITS[p.weightGoal] ?? -500;
              setCalTarget(tdee + deficit);
            }
          }
        }
        setLogRefreshKey(k => k + 1);
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
    setTotalProtein(Math.round(newEntries.reduce((s, e) => s + (e.protein || 0), 0) * 10) / 10);
    setTotalCarbs(Math.round(newEntries.reduce((s, e) => s + (e.carbs || 0), 0) * 10) / 10);
    setTotalFat(Math.round(newEntries.reduce((s, e) => s + (e.fat || 0), 0) * 10) / 10);
    saveField('entries', newEntries);
    saveToFirebase(activeDate, 'entries', newEntries);
  };

  const toggleMeal = (meal: string) => {
    const isCurrentlyOpen = expandedMeals[meal];
    const anim = getMealAnim(meal);
    if (!isCurrentlyOpen) {
      setVisibleMeals(prev => ({ ...prev, [meal]: true }));
      setExpandedMeals(prev => ({ ...prev, [meal]: true }));
      Animated.timing(anim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      setExpandedMeals(prev => ({ ...prev, [meal]: false }));
      Animated.timing(anim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }).start(() => setVisibleMeals(prev => ({ ...prev, [meal]: false })));
    }
  };

  const updateWater = (oz: number) => {
    const newWater = Math.max(0, Math.min(WATER_TARGET, water + oz));
    setWater(newWater);
    saveField('water', newWater);
    saveToFirebase(activeDate, 'water', newWater);
  };

  return (
    <LinearGradient colors={[theme.gradientStart, theme.gradientEnd]} style={[styles.container, { paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: theme.borderCard }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerLabel, { color: theme.textMuted }]}>PROJECT J</Text>
          <Text style={[styles.headerTitle, { color: theme.accentBlueRaw }]}>Food Log</Text>
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
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          <TouchableOpacity
            style={[styles.libraryBtn, { height: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder }]}
            onPress={() => router.push({ pathname: '/add-food', params: { meal: 'browse', date: activeDate } })}>
            <Text style={[styles.libraryBtnText, { color: theme.accentBlue }]}>Library</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.libraryBtn, { height: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder }]}
            onPress={() => setShowCreateFood(true)}>
            <Text style={[styles.libraryBtnText, { color: theme.accentBlue }]}>+ Food</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.libraryBtn, { height: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder }]}
            onPress={() => router.push('/recipe-builder')}>
            <Text style={[styles.libraryBtnText, { color: theme.accentBlue }]}>+ Recipe</Text>
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        onScrollBeginDrag={() => {}}
      >

      {/* Totals Card - Scrollable */}
      <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: theme.accentBlueRaw, overflow: 'hidden' }]}>
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
                  <View style={{ shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 0 }}>
                    <Text style={[styles.calNumber, { color: calColor, opacity: 0.88 }]}>{totalCals}</Text>
                  </View>
                  <Text style={[styles.calTarget, { color: theme.textMuted }]}>/ {adjustedTarget} kcal</Text>
                </View>
                <View style={[styles.progressBarBg, { backgroundColor: theme.bgProgressTrack }]}>
                  <ReAnimated.View style={[styles.progressBarFill, useAnimatedStyle(() => ({ width: withTiming(`${Math.min(calPct, 100)}%` as any, { duration: 400 }) })), { backgroundColor: calColor }]} />
                </View>
                <Text style={[styles.calRemaining, { color: theme.textMuted }]}>
                  {adjustedTarget > 0 ? (totalCals < adjustedTarget ? `${adjustedTarget - totalCals} kcal remaining (${activeCalories} burned)` : `${totalCals - adjustedTarget} kcal over target (${activeCalories} burned)`) : ''}
                </Text>
              </View>
              <MacroDonut protein={totalProtein} carbs={totalCarbs} fat={totalFat} calories={totalCals} theme={theme} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTopWidth: 0.5, borderTopColor: theme.borderCardTop }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ color: theme.macroProtein, fontSize: 16, fontFamily: 'DMSans_600SemiBold' }}>{totalProtein}<Text style={{ fontSize: 11 }}>g</Text></Text>
                <Text style={{ color: theme.textMuted, fontSize: 10, fontFamily: 'DMSans_400Regular' }}>Protein</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ color: theme.macroCarbs, fontSize: 16, fontFamily: 'DMSans_600SemiBold' }}>{totalCarbs}<Text style={{ fontSize: 11 }}>g</Text></Text>
                <Text style={{ color: theme.textMuted, fontSize: 10, fontFamily: 'DMSans_400Regular' }}>Carbs</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ color: theme.macroFat, fontSize: 16, fontFamily: 'DMSans_600SemiBold' }}>{totalFat}<Text style={{ fontSize: 11 }}>g</Text></Text>
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
          <View key={meal} style={[styles.mealRow, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: theme.accentBlueRaw }]}>
            {/* + button on left */}
            <TouchableOpacity
              style={styles.mealAddBtn}
              onPress={() => router.push({ pathname: '/add-food', params: { meal, date: todayKey } })}>
              <Text style={[styles.mealAddBtnText, { color: theme.accentBlue }]}>+</Text>
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
            {visibleMeals[meal] && (
              <Animated.View style={{
                width: '100%',
                opacity: getMealAnim(meal),
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
                            existingAmount: (entry as any).loggedAmount || (() => { const m = entry.name.match(/\((\d+\.?\d*)(g|oz|serving)\)/); return m ? m[1] : '100'; })(),
                            existingUnit: (entry as any).loggedUnit || (() => { const m = entry.name.match(/\((\d+\.?\d*)(g|oz|serving)\)/); return m ? m[2] : 'g'; })(),
                            timestamp: entry.timestamp || Date.now(),
                            fsId: (entry as any).fsId || null,
                          }),
                          meal: entry.meal,
                          date: todayKey,
                          entryIndex: String(entries.indexOf(entry)),
                        }
                      })}>
                      <View style={styles.foodEntryLeft}>
                        {(() => {
                          const rawName = entry.name.replace(/\s*\(.*?\)\s*$/, '');
                          const parts = rawName.split(' · ');
                          const foodName = parts[0];
                          const brand = parts.length > 1 ? parts.slice(1).join(' · ') : null;
                          const amountMatch = entry.name.match(/\((\d+\.?\d*(?:g|oz|serving))\)$/);
                          const amountLabel = amountMatch ? amountMatch[1] : null;
                          return (
                            <>
                              <Text style={[styles.foodEntryName, { color: theme.textPrimary }]} numberOfLines={1}>{foodName}{amountLabel ? ` · ${amountLabel}` : ''}</Text>
                              {(entry.protein !== undefined || entry.carbs !== undefined || entry.fat !== undefined) ? (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 }}>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#0d9268' }} />
                                    <Text style={{ fontSize: 10, color: theme.textMuted, fontFamily: 'DMSans_400Regular' }}>{entry.protein ?? 0}g</Text>
                                  </View>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#c47d1a' }} />
                                    <Text style={{ fontSize: 10, color: theme.textMuted, fontFamily: 'DMSans_400Regular' }}>{entry.carbs ?? 0}g</Text>
                                  </View>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#a83232' }} />
                                    <Text style={{ fontSize: 10, color: theme.textMuted, fontFamily: 'DMSans_400Regular' }}>{entry.fat ?? 0}g</Text>
                                  </View>
                                </View>
                              ) : null}
                            </>
                          );
                        })()}
                      </View>
                      <View style={styles.foodEntryRight}>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={[styles.foodEntryCal, { color: theme.macroProtein }]}>{entry.cal}</Text>
                          <Text style={[styles.foodEntryCalLabel, { color: theme.textMuted }]}>kcal</Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => {
                            Alert.alert(
                              'Remove Entry',
                              `Remove ${entry.name} from your log?`,
                              [
                                { text: 'Cancel', style: 'cancel' },
                                { text: 'Remove', style: 'destructive', onPress: () => {
                                  deleteEntry(entries.indexOf(entry));
                                  showToast('Entry removed', `${entry.cal} kcal · ${entry.meal}`, 'success');
                                }},
                              ]
                            );
                          }}
                          style={styles.foodEntryDelete}>
                          <Text style={[styles.foodEntryDeleteText, { color: theme.accentBlue }]}>×</Text>
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
      <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: theme.accentBlueRaw, shadowOpacity: 0, elevation: 0, overflow: 'hidden' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <Ionicons name="water-outline" size={11} color={theme.textMuted} />
          <Text style={[styles.cardLabel, { marginBottom: 0, color: theme.textMuted }]}>
            {'Water · '}
            <Text style={{ textTransform: 'none' }}>{water}oz / {WATER_TARGET}oz</Text>
          </Text>
        </View>
        <WaterBar pct={waterPct} color={theme.accentBlue} trackColor={theme.bgProgressTrack} refreshKey={logRefreshKey} />
        <View style={styles.waterBtns}>
          {waterPresets.map((oz, i) => (
            <TouchableOpacity key={i} style={[styles.waterBtn, { backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder }]} onPress={() => updateWater(oz)}>
              <Text style={[styles.waterBtnText, { color: theme.accentBlue }]}>+{oz} oz</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={[styles.waterBtn, { backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder }]} onPress={() => setShowWaterCustomModal(true)}>
            <View style={{ alignItems: 'center', justifyContent: 'center', width: 20, height: 20 }}>
              <Ionicons name="water-outline" size={18} color={theme.accentBlue} />
              <Text style={{ color: theme.accentBlue, fontSize: 9, fontFamily: 'DMSans_700Bold', position: 'absolute', bottom: -2, right: -4 }}>+</Text>
            </View>
          </TouchableOpacity>
        </View>
        <View style={[styles.waterBtns, { marginTop: 8 }]}>
          {waterPresets.map((oz, i) => (
            <TouchableOpacity key={i} style={[styles.waterBtnRed, { backgroundColor: theme.accentRedBg, borderColor: theme.accentRedBorder }]} onPress={() => updateWater(-oz)}>
              <Text style={[styles.waterBtnRedText, { color: theme.accentRed }]}>-{oz} oz</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={[styles.waterBtnRed, { backgroundColor: theme.accentRedBg, borderColor: theme.accentRedBorder }]} onPress={() => { setWaterCustomSign('subtract'); setShowWaterCustomModal(true); }}>
            <View style={{ alignItems: 'center', justifyContent: 'center', width: 20, height: 20 }}>
              <Ionicons name="water-outline" size={18} color={theme.accentRed} />
              <Text style={{ color: theme.accentRed, fontSize: 9, fontFamily: 'DMSans_700Bold', position: 'absolute', bottom: -2, right: -4 }}>-</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

    </ScrollView>

    {showWaterCustomModal && (
      <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: theme.overlayBg, justifyContent: 'center', alignItems: 'center', zIndex: 999 }}>
        <View style={{ backgroundColor: theme.bgCard, borderRadius: 14, padding: 24, width: '80%', borderWidth: 0.5, borderColor: theme.borderCard }}>
          <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: 'DMSans_700Bold', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>
            {waterCustomSign === 'add' ? 'Add Custom Amount' : 'Remove Custom Amount'}
          </Text>
          <TextInput
            style={{ backgroundColor: theme.bgInput, borderWidth: 0.5, borderColor: theme.borderInput, borderRadius: 8, color: theme.textPrimary, padding: 12, fontSize: 24, fontFamily: 'BebasNeue_400Regular', textAlign: 'center', marginBottom: 16 }}
            value={waterCustomInput} onChangeText={setWaterCustomInput} keyboardType="number-pad" placeholder="0" placeholderTextColor={theme.textPlaceholder} autoFocus />
          <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: 'DMSans_700Bold', letterSpacing: 1, textTransform: 'uppercase', textAlign: 'center', marginBottom: 16 }}>oz</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity style={{ flex: 1, padding: 12, borderRadius: 8, backgroundColor: theme.bgInput, alignItems: 'center' }} onPress={() => { setShowWaterCustomModal(false); setWaterCustomInput(''); }}>
              <Text style={{ color: theme.textMuted, fontFamily: 'DMSans_600SemiBold', fontSize: 14 }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flex: 1, padding: 12, borderRadius: 8, backgroundColor: waterCustomSign === 'add' ? theme.accentBlueBg : theme.accentRedBg, alignItems: 'center' }}
              onPress={() => {
                const amt = parseInt(waterCustomInput);
                if (amt > 0) { updateWater(waterCustomSign === 'add' ? amt : -amt); }
                setShowWaterCustomModal(false);
                setWaterCustomInput('');
              }}>
              <Text style={{ color: waterCustomSign === 'add' ? theme.accentBlue : theme.accentRed, fontFamily: 'DMSans_600SemiBold', fontSize: 14 }}>
                {waterCustomSign === 'add' ? 'Add' : 'Remove'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    )}

    <CustomFoodCreator
        visible={showCreateFood}
        onClose={() => setShowCreateFood(false)}
        onSaved={() => {}}
      />
    </LinearGradient>
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
  card:               { borderWidth: 0.5, borderTopWidth: 1.5, borderRadius: 14, padding: 16, marginBottom: 12, shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6 },
  cardLabel:          { fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8, fontFamily: 'DMSans_700Bold' },
  calRow:             { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 10 },
  calNumber:          { fontSize: 52, lineHeight: 56, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1 },
  calTarget:          { fontSize: 14, fontFamily: 'DMSans_700Bold', letterSpacing: 0.3 },
  progressBarBg:      { height: 6, borderRadius: 6, overflow: 'hidden', marginBottom: 12 },
  progressBarFill:    { height: '100%', borderRadius: 6 },
  calRemaining:       { fontSize: 10, fontFamily: 'DMSans_700Bold', letterSpacing: 1.5, textTransform: 'uppercase' },
  mealRow:            { borderWidth: 0.5, borderTopWidth: 1.5, borderRadius: 14, marginBottom: 8, overflow: 'hidden', shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6 },
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
  foodEntryName:      { fontSize: 13, fontFamily: 'DMSans_600SemiBold' },
  foodEntryMacros:    { fontSize: 10, fontFamily: 'DMSans_700Bold', marginTop: 2, letterSpacing: 1, textTransform: 'uppercase' },
  foodEntryRight:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
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