import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Image, Linking, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import Reanimated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import { useToast } from '../components/Toast';
import { saveToFirebase } from '../firebaseConfig';
import { useTheme } from '../theme';
import CryptoJS from 'crypto-js';

const AnimCircle = Reanimated.createAnimatedComponent(Circle);

function MacroDonut({ protein, carbs, fat, calories, theme }: { protein: number; carbs: number; fat: number; calories: number; theme: any }) {
  const size = 100;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = protein + carbs + fat;

  const proteinAnim = useSharedValue(0);
  const carbsAnim = useSharedValue(0);
  const fatAnim = useSharedValue(0);

  useEffect(() => {
    proteinAnim.value = 0;
    carbsAnim.value = 0;
    fatAnim.value = 0;
    if (total === 0) return;
    const proteinTarget = (protein / total) * circumference;
    const carbsTarget = (carbs / total) * circumference;
    const fatTarget = (fat / total) * circumference;
    setTimeout(() => { proteinAnim.value = withTiming(proteinTarget, { duration: 800 }); }, 200);
    setTimeout(() => { carbsAnim.value = withTiming(carbsTarget, { duration: 700 }); }, 900);
    setTimeout(() => { fatAnim.value = withTiming(fatTarget, { duration: 600 }); }, 1500);
  }, [protein, carbs, fat]);

  const proteinProps = useAnimatedProps(() => ({ strokeDasharray: `${proteinAnim.value} ${circumference}` } as any));
  const carbsProps = useAnimatedProps(() => ({ strokeDasharray: `${carbsAnim.value} ${circumference}` } as any));
  const fatProps = useAnimatedProps(() => ({ strokeDasharray: `${fatAnim.value} ${circumference}` } as any));

  const proteinPct = total > 0 ? protein / total : 0;
  const carbsPct = total > 0 ? carbs / total : 0;

  if (total === 0) {
    return (
      <View style={{ alignItems: 'center', justifyContent: 'center', width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle cx={size/2} cy={size/2} r={radius} stroke={theme.donutTrack} strokeWidth={strokeWidth} fill="none" />
        </Svg>
        <View style={{ position: 'absolute', alignItems: 'center' }}>
          <Text style={{ color: theme.textDim, fontSize: 10, fontFamily: 'DMSans_400Regular' }}>--</Text>
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
async function fetchFatSecretServings(fsId: string): Promise<any[]> {
  try {
    const FS_KEY = 'b8543feaeabd412f81427bc901e2f3b9';
    const FS_SECRET = '659c1da30b4e48eaab5788534cb2b77a';
    const FS_BASE = 'https://platform.fatsecret.com/rest/server.api';
    const oauth: Record<string, string> = {
      oauth_consumer_key: FS_KEY,
      oauth_nonce: Math.random().toString(36).substring(2) + Date.now().toString(36),
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_version: '1.0',
    };
    const apiParams: Record<string, string> = { method: 'food.get.v4', food_id: fsId, format: 'json' };
    const allParams = { ...oauth, ...apiParams };
    const sorted = Object.keys(allParams).sort().map(k =>
      `${encodeURIComponent(k)}=${encodeURIComponent(allParams[k])}`
    ).join('&');
    const base = `GET&${encodeURIComponent(FS_BASE)}&${encodeURIComponent(sorted)}`;
    const signingKey = `${encodeURIComponent(FS_SECRET)}&`;
    const sig = CryptoJS.HmacSHA1(base, signingKey).toString(CryptoJS.enc.Base64);
    const finalParams: Record<string, string> = { ...allParams, oauth_signature: sig };
    const qs = Object.keys(finalParams).sort().map(k =>
      `${encodeURIComponent(k)}=${encodeURIComponent(finalParams[k])}`
    ).join('&');
    const res = await fetch(`${FS_BASE}?${qs}`);
    const data = await res.json();
    const food = data?.food;
    if (!food) return [];
    let servings = food.servings?.serving;
    if (!servings) return [];
    if (!Array.isArray(servings)) servings = [servings];
    // Sort so non-100g servings come first -- matches normalizeFsServing behavior in add-food
    servings = [...servings].sort((a: any, b: any) => {
      const aIs100g = a.serving_description?.toLowerCase().includes('100g');
      const bIs100g = b.serving_description?.toLowerCase().includes('100g');
      if (aIs100g && !bIs100g) return 1;
      if (!aIs100g && bIs100g) return -1;
      return 0;
    });
    return servings.map((s: any) => ({
      label: s.serving_description,
      calories: Math.round(parseFloat(s.calories || '0')),
      protein: parseFloat(s.protein || '0'),
      carbs: parseFloat(s.carbohydrate || '0'),
      fat: parseFloat(s.fat || '0'),
      fiber: parseFloat(s.fiber || '0'),
      sugar: parseFloat(s.sugar || '0'),
      sodium: parseFloat(s.sodium || '0'),
      cholesterol: parseFloat(s.cholesterol || '0'),
      saturatedFat: parseFloat(s.saturated_fat || '0'),
      grams: parseFloat(s.metric_serving_amount || '0'),
    }));
  } catch (e) {
    return [];
  }
}

export default function FoodDetailScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { foodJson, meal, date, entryIndex, recipeMode } = useLocalSearchParams<{ 
    foodJson: string; 
    meal: string; 
    date: string;
    entryIndex: string;
    recipeMode: string;
  }>();
const isRecipeMode = recipeMode === 'true';
  const food = foodJson ? JSON.parse(foodJson) : null;
  const fsServings: any[] = food?.fsServings || [];
  const { showToast } = useToast();
  const [isFav, setIsFav] = useState(false);
  const starScale = useRef(new Animated.Value(1)).current;
  const [showServingPicker, setShowServingPicker] = useState(false);
  const [selectedServing, setSelectedServing] = useState<any>(fsServings.length > 0 ? fsServings[0] : null);

  // Per-gram rates derived from selected serving -- used for manual gram input scaling
  const servingRates = selectedServing && selectedServing.grams > 0 ? {
    calories: selectedServing.calories / selectedServing.grams,
    protein: selectedServing.protein / selectedServing.grams,
    carbs: selectedServing.carbs / selectedServing.grams,
    fat: selectedServing.fat / selectedServing.grams,
    fiber: selectedServing.fiber / selectedServing.grams,
    sugar: selectedServing.sugar / selectedServing.grams,
    sodium: selectedServing.sodium / selectedServing.grams,
    cholesterol: selectedServing.cholesterol / selectedServing.grams,
    saturatedFat: selectedServing.saturatedFat / selectedServing.grams,
  } : null;

  useEffect(() => {
    const loadFav = async () => {
      try {
        const saved = await AsyncStorage.getItem('pj_favorites');
        if (saved && food) {
          const favs = JSON.parse(saved);
          setIsFav(favs.some((f: any) => f.name === food.description));
        }
      } catch (e) {}
    };
    loadFav();
  }, []);

  const toggleFav = async () => {
    // Spring animation
    Animated.sequence([
      Animated.timing(starScale, { toValue: 1.4, duration: 120, useNativeDriver: true }),
      Animated.spring(starScale, { toValue: 1, useNativeDriver: true, friction: 4, tension: 200 }),
    ]).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const saved = await AsyncStorage.getItem('pj_favorites');
      let favs = saved ? JSON.parse(saved) : [];
      if (isFav) {
        favs = favs.filter((f: any) => f.name !== food.description);
        showToast('Removed from favorites', food.description, 'info');
      } else {
        // Use the first (label) serving for saved macros -- not the current text box amount.
        // This ensures favorites always open to the correct label serving.
        // If servings weren't pre-loaded (e.g. edit entry path), fetch them now on demand.
        let resolvedServings = fsServings;
        if (resolvedServings.length === 0 && food.fsId) {
          resolvedServings = await fetchFatSecretServings(food.fsId);
        }
        const labelServing = resolvedServings.length > 0 ? resolvedServings[0] : null;
        const getN = (nName: string, unitName: string = 'G') => {
          if (labelServing) {
            const map: Record<string, number> = {
              'Protein': labelServing.protein || 0,
              'Carbohydrate, by difference': labelServing.carbs || 0,
              'Total lipid (fat)': labelServing.fat || 0,
              'Fiber, total dietary': labelServing.fiber || 0,
              'Sugars, total including NLEA': labelServing.sugar || 0,
              'Sodium, Na': labelServing.sodium || 0,
              'Cholesterol': labelServing.cholesterol || 0,
              'Fatty acids, total saturated': labelServing.saturatedFat || 0,
            };
            if (nName in map) return Math.round(map[nName] * 10) / 10;
          }
          const n = (food.foodNutrients || []).find((fn: any) => fn.nutrientName === nName && fn.unitName === unitName);
          return Math.round((n?.value || 0) * 10) / 10;
        };
        const labelCal = labelServing ? labelServing.calories : calories;
        favs.push({
          name: food.description,
          cal: labelCal,
          protein: getN('Protein'),
          carbs: getN('Carbohydrate, by difference'),
          fat: getN('Total lipid (fat)'),
          fiber: getN('Fiber, total dietary'),
          sugar: getN('Sugars, total including NLEA'),
          sodium: getN('Sodium, Na', 'MG'),
          cholesterol: getN('Cholesterol', 'MG'),
          saturatedFat: getN('Fatty acids, total saturated'),
          calPer100g: food.calPer100g || 0,
          proteinPer100g: food.proteinPer100g || 0,
          carbsPer100g: food.carbsPer100g || 0,
          fatPer100g: food.fatPer100g || 0,
          foodNutrients: food.foodNutrients || [],
          fsId: food.fsId || null,
        });
        showToast('Added to favorites', food.description, 'success');
      }
      await AsyncStorage.setItem('pj_favorites', JSON.stringify(favs));
      await saveToFirebase('my_foods', 'favorites', favs);
      setIsFav(!isFav);
    } catch (e) {}
  };
    const [entryTime, setEntryTime] = useState<Date>( food?.timestamp ? new Date(food.timestamp) : new Date());
const [showTimePicker, setShowTimePicker] = useState(false);
  const isEditing = entryIndex !== undefined && entryIndex !== '';
  const originalAmount = food?.existingAmount || 
    (food?.fsServings?.length > 0 && food.fsServings[0].grams > 0 
      ? food.fsServings[0].grams.toString() 
      : '100');
  const [amount, setAmount] = useState(originalAmount);
  const [amountChanged, setAmountChanged] = useState(false);
  const [unit, setUnit] = useState<'g' | 'oz' | 'serving'>(food?.existingUnit || 'g');
    const [showMealPicker, setShowMealPicker] = useState(false);
const [currentMeal, setCurrentMeal] = useState(meal === 'browse' || !meal ? 'Morning' : meal);

  if (!food) return null;

  const getNutrientPer100g = (name: string, unitName: string = 'G') => {
    const n = food.foodNutrients?.find((n: any) => 
      n.nutrientName === name && n.unitName === unitName
    );
    return n?.value || 0;
  };

  const calPer100g = food.calPer100g || getNutrientPer100g('Energy', 'KCAL');
  const proteinPer100g = food.proteinPer100g || getNutrientPer100g('Protein');
  const carbsPer100g = food.carbsPer100g || getNutrientPer100g('Carbohydrate, by difference');
  const fatPer100g = food.fatPer100g || getNutrientPer100g('Total lipid (fat)');

  const getMultiplier = () => {
    const val = parseFloat(amount) || 0;
    return val / 100;
  };

  const multiplier = getMultiplier();

  // In edit mode OR for custom foods, use stored absolute values until the user changes the amount
  const useExisting = (isEditing || food.isCustom) && !amountChanged && food.existingCal !== undefined;

  const grams = parseFloat(amount) || 0;
  const calories = useExisting
    ? (food.existingCal || 0)
    : servingRates
      ? Math.round(servingRates.calories * grams)
      : calPer100g > 0 ? Math.round(calPer100g * multiplier) : (food.existingCal || 0);
  const protein = useExisting
    ? (food.existingProtein || 0)
    : servingRates
      ? Math.round(servingRates.protein * grams * 10) / 10
      : calPer100g > 0 ? Math.round(proteinPer100g * multiplier * 10) / 10 : (food.existingProtein || 0);
  const carbs = useExisting
    ? (food.existingCarbs || 0)
    : servingRates
      ? Math.round(servingRates.carbs * grams * 10) / 10
      : calPer100g > 0 ? Math.round(carbsPer100g * multiplier * 10) / 10 : (food.existingCarbs || 0);
  const fat = useExisting
    ? (food.existingFat || 0)
    : servingRates
      ? Math.round(servingRates.fat * grams * 10) / 10
      : calPer100g > 0 ? Math.round(fatPer100g * multiplier * 10) / 10 : (food.existingFat || 0);

  const saveEntry = async () => {
    if (!calories && calories !== 0) return;
    try {
      if (isRecipeMode) {
        // Save as pending ingredient for recipe builder to pick up
        const ingredient = {
          id: Math.random().toString(36).substr(2, 9),
          name: food.description,
          cal: calories,
          protein,
          carbs,
          fat,
          amount: parseFloat(amount),
          unit,
          calPer100g,
          proteinPer100g,
          carbsPer100g,
          fatPer100g,
        };
        await AsyncStorage.setItem('pj_pending_ingredient', JSON.stringify(ingredient));
        router.back();
        router.back();
        return;
      }

      const saved = await AsyncStorage.getItem(`pj_${date}`);
      const current = saved ? JSON.parse(saved) : {};
      const entries = current.entries || [];
      const newEntry = {
  name: `${food.description} (${amount}${unit})`,
  cal: calories,
  meal: currentMeal,
  protein,
  carbs,
  fat,
  calPer100g,
  proteinPer100g,
  carbsPer100g,
  fatPer100g,
  loggedAmount: amount,
  loggedUnit: unit,
  foodNutrients: food.foodNutrients || [],
  timestamp: entryTime.getTime(),
  fsId: food.fsId || null,
};
      if (isEditing) {
        entries[parseInt(entryIndex)] = { ...entries[parseInt(entryIndex)], ...newEntry };
      } else {
        entries.push(newEntry);
      }
      await AsyncStorage.setItem(`pj_${date}`, JSON.stringify({ ...current, entries }));
      await saveToFirebase(date, 'entries', entries);
      showToast(isEditing ? 'Entry updated' : 'Entry logged', `${calories} kcal · ${currentMeal}`, 'success');
      router.back();
      if (!isEditing) router.back();
    } catch (e) {
      console.log('Save error', e);
    }
  };

  const styles = useStyles(theme);
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {isEditing ? 'Edit Entry' : 'Food Detail'}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, width: 60, justifyContent: 'flex-end' }}>
          {food?.isMyFood && (
            <TouchableOpacity
              style={{ backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 }}
              onPress={() => router.push({ pathname: '/edit-food', params: { foodJson: JSON.stringify(food) } })}>
              <Text style={{ color: theme.accentBlue, fontSize: 13, fontFamily: 'DMSans_600SemiBold' }}>Edit</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={toggleFav} style={{ padding: 4 }}>
            <Animated.View style={{ transform: [{ scale: starScale }] }}>
              <Ionicons
                name={isFav ? 'star' : 'star-outline'}
                size={22}
                color={isFav ? theme.accentAmber : theme.textDim}
              />
            </Animated.View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.foodName}>{food.description}</Text>
        {food.brand && (
          <Text style={{ fontSize: 13, color: theme.textSecondary, fontFamily: 'DMSans_500Medium', marginTop: -14, marginBottom: 16 }}>{food.brand}</Text>
        )}

        {/* Serving picker -- only shows when FatSecret servings available */}
        {fsServings.length > 0 && (
          <TouchableOpacity
            style={styles.servingPickerBtn}
            onPress={() => setShowServingPicker(true)}>
            <View>
              <Text style={styles.servingPickerLabel}>Serving Size</Text>
              <Text style={styles.servingPickerValue}>{selectedServing?.label || 'Select serving'}</Text>
            </View>
            <Text style={styles.servingPickerCal}>{selectedServing?.calories || 0} kcal ▼</Text>
          </TouchableOpacity>
        )}

        {/* Grams input */}
        <View style={styles.amountRow}>
          <Text style={styles.amountLabel}>Amount (g)</Text>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={v => { setAmount(v); setAmountChanged(true); }}
            keyboardType="decimal-pad"
            selectTextOnFocus
          />
        </View>

        {/* Nutrition */}
        <View style={styles.nutritionCard}>
          <Text style={styles.nutritionTitle}>
            {'Nutrition for '}
            <Text style={{ textTransform: 'none' }}>{amount}{unit}</Text>
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <MacroDonut protein={protein} carbs={carbs} fat={fat} calories={calories} theme={theme} />
            <View style={{ flex: 1, gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.macroProtein }} />
                <Text style={{ color: theme.textMuted, fontSize: 12, fontFamily: 'DMSans_400Regular', flex: 1 }}>Protein</Text>
                <Text style={{ color: theme.macroProtein, fontSize: 15, fontFamily: 'DMSans_600SemiBold' }}>{protein}g</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.macroCarbs }} />
                <Text style={{ color: theme.textMuted, fontSize: 12, fontFamily: 'DMSans_400Regular', flex: 1 }}>Carbs</Text>
                <Text style={{ color: theme.macroCarbs, fontSize: 15, fontFamily: 'DMSans_600SemiBold' }}>{carbs}g</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.macroFat }} />
                <Text style={{ color: theme.textMuted, fontSize: 12, fontFamily: 'DMSans_400Regular', flex: 1 }}>Fat</Text>
                <Text style={{ color: theme.macroFat, fontSize: 15, fontFamily: 'DMSans_600SemiBold' }}>{fat}g</Text>
              </View>
            </View>
          </View>

          {/* Extended nutrition */}
          {[
            { label: 'Fiber', key: 'Fiber, total dietary', color: '#6366f1' },
            { label: 'Sugar', key: 'Sugars, total including NLEA', color: '#ec4899' },
            { label: 'Sodium', key: 'Sodium, Na', color: '#8b5cf6', unitName: 'MG' },
            { label: 'Cholesterol', key: 'Cholesterol', color: '#14b8a6', unitName: 'MG' },
            { label: 'Saturated Fat', key: 'Fatty acids, total saturated', color: '#f97316' },
          ].map(nutrient => {
            const n = food.foodNutrients?.find((fn: any) => 
              fn.nutrientName === nutrient.key
            );
            const val = n ? Math.round((n.value || 0) * (useExisting ? 1 : multiplier) * 10) / 10 : null;
            const unit2 = nutrient.unitName === 'MG' ? 'mg' : 'g';
            if (val === null) return null;
            return (
              <View key={nutrient.key} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderTopWidth: 1, borderTopColor: theme.borderSubtle }}>
                <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'DMSans_400Regular' }}>{nutrient.label}</Text>
                <Text style={{ fontSize: 12, color: theme.textPrimary, fontFamily: 'DMSans_500Medium' }}>{val}{unit2}</Text>
              </View>
            );
          })}
        </View>

        {calPer100g === 0 && (
          <Text style={styles.noDataText}>No detailed nutrition data. Calories will be logged as entered.</Text>
        )}
{/* Timestamp */}
        <TouchableOpacity style={styles.mealSelector} onPress={() => setShowTimePicker(true)}>
          <Text style={styles.mealSelectorLabel}>Time logged</Text>
          <Text style={styles.mealSelectorValue}>
            {entryTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ▼
          </Text>
        </TouchableOpacity>

        {showTimePicker && (
          <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                <Text style={{ color: theme.textMuted, fontSize: 12, fontFamily: 'DMSans_500Medium' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                <Text style={{ color: theme.accentGreen, fontSize: 12, fontFamily: 'DMSans_600SemiBold' }}>Confirm</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              mode="time"
              value={entryTime}
              display="spinner"
              textColor={theme.textPrimary}
              onChange={(event, date) => {
                if (date) setEntryTime(date);
              }}
            />
          </View>
        )}

       {/* Meal selector */}
<TouchableOpacity 
  style={styles.mealSelector}
  onPress={() => setShowMealPicker(true)}>
  <Text style={styles.mealSelectorLabel}>Adding to</Text>
  <Text style={styles.mealSelectorValue}>{currentMeal} ▼</Text>
</TouchableOpacity>

<TouchableOpacity style={styles.logBtn} onPress={saveEntry}>
  <Text style={styles.logBtnText}>
    {isRecipeMode ? 'ADD TO RECIPE' : isEditing ? `UPDATE ENTRY` : `ADD TO DIARY`}
  </Text>
</TouchableOpacity>

{isEditing && (
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => {
              Alert.alert(
                'Remove Entry',
                'Remove this entry from your log?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Remove', style: 'destructive', onPress: async () => {
                    try {
                      const saved = await AsyncStorage.getItem(`pj_${date}`);
                      const current = saved ? JSON.parse(saved) : {};
                      const entries = (current.entries || []).filter((_: any, i: number) => i !== parseInt(entryIndex));
                      await AsyncStorage.setItem(`pj_${date}`, JSON.stringify({ ...current, entries }));
                      await saveToFirebase(date, 'entries', entries);
                      showToast('Removed from log', undefined, 'success');
                      router.back();
                    } catch (e) {
                      console.log('Delete error', e);
                    }
                  }},
                ]
              );
            }}>
            <Text style={styles.deleteBtnText}>Remove Entry</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={() => Linking.openURL('https://platform.fatsecret.com')}
          style={{ alignItems: 'center', marginTop: 20, marginBottom: 8, opacity: 0.65 }}>
          <Image
            source={{ uri: 'https://platform.fatsecret.com/api/static/images/powered_by_fatsecret_horizontal_brand.png' }}
            style={{ width: 160, height: 38 }}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </ScrollView>

      {/* Serving Picker Modal */}
      <Modal visible={showServingPicker} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowServingPicker(false)}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Select Serving Size</Text>
            {fsServings.map((s: any, i: number) => (
              <TouchableOpacity
                key={i}
                style={[styles.mealOption, selectedServing?.label === s.label && styles.mealOptionActive]}
                onPress={() => {
                  setSelectedServing(s);
                  setAmount(s.grams > 0 ? s.grams.toString() : '100');
                  setShowServingPicker(false);
                }}>
                <Text style={[styles.mealOptionText, selectedServing?.label === s.label && { color: theme.accentGreen }]}>{s.label}</Text>
                <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'DMSans_400Regular' }}>{s.calories} kcal</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Meal Picker Modal */}
      <Modal visible={showMealPicker} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowMealPicker(false)}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Add to which meal?</Text>
            {['Morning', 'Lunch', 'Dinner', 'Snacks'].map(m => (
              <TouchableOpacity
                key={m}
                style={[styles.mealOption, currentMeal === m && styles.mealOptionActive]}
                onPress={() => { setCurrentMeal(m); setShowMealPicker(false); }}>
                <Text style={[styles.mealOptionText, currentMeal === m && { color: theme.accentGreen }]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

    </View>
  );
}

const useStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bgPrimary },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.borderCard },
  backBtn: { padding: 4, width: 60 },
  backBtnText: { color: theme.accentBlue, fontSize: 14, fontFamily: 'DMSans_500Medium' },
  headerTitle: { fontSize: 20, color: theme.accentBlueRaw, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1, flex: 1, textAlign: 'center' },
  content: { padding: 16 },
  foodName: { fontSize: 18, color: theme.textPrimary, fontFamily: 'DMSans_600SemiBold', marginBottom: 20, lineHeight: 24 },
  unitRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  unitBtn: { flex: 1, padding: 10, backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 6, alignItems: 'center' },
  unitBtnActive: { backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder },
  unitBtnText: { fontSize: 14, color: theme.textMuted, fontFamily: 'DMSans_600SemiBold' },
  unitBtnTextActive: { color: theme.accentBlue },
  amountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  amountLabel: { fontSize: 14, color: theme.textMuted, fontFamily: 'DMSans_400Regular' },
  amountInput: { backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, color: theme.textPrimary, padding: 12, fontSize: 24, fontFamily: 'BebasNeue_400Regular', width: 120, textAlign: 'center' },
  nutritionCard: { backgroundColor: theme.bgCard, borderWidth: 1, borderColor: theme.borderCard, borderRadius: 10, padding: 16, marginBottom: 20 },
  nutritionTitle: { fontSize: 11, color: theme.textMuted, fontFamily: 'DMSans_500Medium', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 },
  nutritionRow: { flexDirection: 'row', justifyContent: 'space-between' },
  nutritionStat: { alignItems: 'center', flex: 1 },
  nutritionVal: { fontSize: 28, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1 },
  nutritionLabel: { fontSize: 10, color: theme.textMuted, fontFamily: 'DMSans_400Regular', marginTop: 2 },
  noDataText: { fontSize: 12, color: theme.textMuted, fontStyle: 'italic', fontFamily: 'DMSans_400Regular', marginBottom: 16, textAlign: 'center' },
  logBtn: { backgroundColor: theme.accentGreen, borderRadius: 10, padding: 16, alignItems: 'center', marginBottom: 12 },
  logBtnText: { color: theme.bgPrimary, fontSize: 18, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2 },
  deleteBtn: { backgroundColor: '#cc3333', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center', marginTop: 8, alignSelf: 'center', minWidth: 220 },
  deleteBtnText: { color: theme.bgPrimary, fontSize: 16, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2 },
  mealSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, padding: 12, marginBottom: 10 },
  mealSelectorLabel: { fontSize: 12, color: theme.textMuted, fontFamily: 'DMSans_400Regular' },
  mealSelectorValue: { fontSize: 14, color: theme.accentBlue, fontFamily: 'DMSans_600SemiBold' },
  modalOverlay: { flex: 1, backgroundColor: theme.overlayBg, justifyContent: 'flex-end' },
  modal: { backgroundColor: theme.bgSheet, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 24, borderWidth: 1, borderColor: theme.borderCard },
  modalTitle: { fontSize: 18, color: theme.textPrimary, fontFamily: 'DMSans_600SemiBold', marginBottom: 16 },
  servingPickerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.bgCard, borderWidth: 1, borderColor: theme.borderCard, borderTopColor: theme.borderCardTop, borderRadius: 10, padding: 14, marginBottom: 12 },
  servingPickerLabel: { fontSize: 10, color: theme.textMuted, fontFamily: 'DMSans_700Bold', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 3 },
  servingPickerValue: { fontSize: 15, color: theme.textPrimary, fontFamily: 'DMSans_600SemiBold' },
  servingPickerCal: { fontSize: 18, color: theme.accentGreen, fontFamily: 'BebasNeue_400Regular' },
  mealOption: { padding: 16, borderBottomWidth: 1, borderBottomColor: theme.borderSubtle, alignItems: 'center' },
  mealOptionActive: { backgroundColor: theme.accentGreenBg },
  mealOptionText: { fontSize: 16, color: theme.textSecondary, fontFamily: 'DMSans_500Medium' },
});