import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActionSheetIOS, Alert, Animated, Dimensions, Image, KeyboardAvoidingView, Linking, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import Reanimated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import CustomFoodCreator from '../components/CustomFoodCreator';
import { ToastRenderer, useToast } from '../components/Toast';
import * as FileSystem from 'expo-file-system';
import { Directory, File as FSFile, Paths } from 'expo-file-system/next';
import * as ImagePicker from 'expo-image-picker';
import { ACHIEVEMENTS, checkAndUnlock, loadAchievements, checkMomentumAchievements, checkNutritionAchievements, getCelebTier } from '../achievementData';
import { showAchievementToast } from '../components/AchievementToast';
import { showCelebration } from '../components/CelebrationOverlay';
import { saveToFirebase } from '../firebaseConfig';
import { storageSet } from '../utils/storage';
import { cancelFoodLogNotification } from '../services/notifications';
import { useTheme } from '../theme';
import { DEFAULT_MEAL_SLOTS, MealSlot, loadMealSlots, getMealDisplayName } from '../utils/mealSlots';
import { useTutorial } from '../context/TutorialContext';
import { useTutorialTarget } from '../hooks/useTutorialTarget';
import { TUTORIAL_CHICKEN_BREAST } from '../data/tutorialFood';
import CryptoJS from 'crypto-js';

function buildTutorialChickenFood() {
  const fsServings = TUTORIAL_CHICKEN_BREAST.servings.serving.map(s => ({
    label: s.serving_description,
    calories: Math.round(parseFloat(s.calories)),
    protein: parseFloat(s.protein),
    carbs: parseFloat(s.carbohydrate),
    fat: parseFloat(s.fat),
    fiber: 0,
    sugar: 0,
    sodium: parseFloat(s.sodium),
    cholesterol: parseFloat(s.cholesterol),
    saturatedFat: parseFloat(s.saturated_fat),
    grams: parseFloat(s.metric_serving_amount),
    unit: s.metric_serving_unit,
    isDefault: s.serving_id === '__tutorial_serving_100g__',
  }));
  return {
    description: TUTORIAL_CHICKEN_BREAST.food_name,
    fsId: TUTORIAL_CHICKEN_BREAST.food_id,
    foodNutrients: [
      { nutrientName: 'Energy', unitName: 'KCAL', value: 165 },
      { nutrientName: 'Protein', unitName: 'G', value: 31 },
      { nutrientName: 'Carbohydrate, by difference', unitName: 'G', value: 0 },
      { nutrientName: 'Total lipid (fat)', unitName: 'G', value: 3.6 },
      { nutrientName: 'Fiber, total dietary', unitName: 'G', value: 0 },
      { nutrientName: 'Sugars, total including NLEA', unitName: 'G', value: 0 },
      { nutrientName: 'Sodium, Na', unitName: 'MG', value: 74 },
      { nutrientName: 'Cholesterol', unitName: 'MG', value: 85 },
      { nutrientName: 'Fatty acids, total saturated', unitName: 'G', value: 1 },
      { nutrientName: 'Polyunsaturated Fat', unitName: 'G', value: 0.8 },
      { nutrientName: 'Monounsaturated Fat', unitName: 'G', value: 1.2 },
      { nutrientName: 'Potassium, K', unitName: 'MG', value: 256 },
    ],
    fsServings,
    fsServingGrams: 100,
  };
}

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
    setTimeout(() => { carbsAnim.value = withTiming(carbsTarget, { duration: 700 }); }, 1150);
    setTimeout(() => { fatAnim.value = withTiming(fatTarget, { duration: 600 }); }, 2000);
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
        <Text style={{ color: theme.textPrimary, fontSize: 16, fontFamily: 'Bebas_400Regular' }}>{Math.round(calories)}</Text>
        <Text style={{ color: theme.textDim, fontSize: 8, fontFamily: 'DMSans_400Regular', letterSpacing: 1 }}>KCAL</Text>
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
      polyunsaturatedFat: parseFloat(s.polyunsaturated_fat || '0'),
      monounsaturatedFat: parseFloat(s.monounsaturated_fat || '0'),
      potassium: parseFloat(s.potassium || '0'),
      vitaminA: parseFloat(s.vitamin_a || '0'),
      vitaminC: parseFloat(s.vitamin_c || '0'),
      calcium: parseFloat(s.calcium || '0'),
      iron: parseFloat(s.iron || '0'),
      sugarAlcohols: parseFloat(s.sugar_alcohols || '0'),
      addedSugars: parseFloat(s.added_sugars || '0'),
      transFat: parseFloat(s.trans_fat || '0'),
      vitaminD: parseFloat(s.vitamin_d || '0'),
      grams: parseFloat(s.metric_serving_amount || '0'),
      unit: s.metric_serving_unit || 'g',
      isDefault: s.is_default === '1',
    }));
  } catch (e) {
    return [];
  }
}

// Search FatSecret by name and return servings for the top result.
// Used as a fallback when a food has no fsId (stale diary/recent entry).
async function fetchFatSecretByName(name: string): Promise<any[]> {
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
    const apiParams: Record<string, string> = { method: 'foods.search', search_expression: name, format: 'json', max_results: '5' };
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
    let foods = data?.foods?.food;
    if (!foods) return [];
    if (!Array.isArray(foods)) foods = [foods];
    const firstFoodId = foods[0]?.food_id;
    if (!firstFoodId) return [];
    return fetchFatSecretServings(firstFoodId);
  } catch {
    return [];
  }
}

export default function FoodDetailScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { foodJson, meal, date, entryIndex, recipeMode, tutorialMode, tutorialFood } = useLocalSearchParams<{
    foodJson: string;
    meal: string;
    date: string;
    entryIndex: string;
    recipeMode: string;
    tutorialMode: string;
    tutorialFood: string;
  }>();
const isRecipeMode = recipeMode === 'true';
const isTutorialMode = tutorialMode === 'true';
  const food = tutorialFood === 'chicken_breast' ? buildTutorialChickenFood() : (foodJson ? JSON.parse(foodJson) : null);
  const foodId: string | null = food?.myFoodData?.id || (food as any)?.myFoodId || food?.fsId || null;
  const fsServings: any[] = food?.fsServings || [];
  const myFoodAdditionalServings: Array<{ label: string; grams: number }> = food?.myFoodData?.additionalServings || [];
  const baseServingSize = food?.myFoodData?.servingSize || parseFloat(food?.existingAmount || '100') || 100;
  const customServings = (food?.isCustom && myFoodAdditionalServings.length > 0 && (food?.calPer100g ?? 0) > 0)
    ? [
        {
          label: food.servingUnit || `${baseServingSize}${food.servingUnitType || 'g'}`,
          calories: Math.round((food.calPer100g || 0) * baseServingSize / 100),
          protein: Math.round(((food.proteinPer100g || 0) * baseServingSize / 100) * 10) / 10,
          carbs: Math.round(((food.carbsPer100g || 0) * baseServingSize / 100) * 10) / 10,
          fat: Math.round(((food.fatPer100g || 0) * baseServingSize / 100) * 10) / 10,
          fiber: 0, sugar: 0, sodium: 0, cholesterol: 0, saturatedFat: 0,
          polyunsaturatedFat: 0, monounsaturatedFat: 0, potassium: 0,
          vitaminA: 0, vitaminC: 0, calcium: 0, iron: 0, sugarAlcohols: 0,
          addedSugars: 0, transFat: 0, vitaminD: 0,
          grams: baseServingSize,
          unit: food.servingUnitType || 'g',
          isDefault: true,
        },
        ...myFoodAdditionalServings.map((s) => ({
          label: s.label,
          calories: Math.round((food.calPer100g || 0) * s.grams / 100),
          protein: Math.round(((food.proteinPer100g || 0) * s.grams / 100) * 10) / 10,
          carbs: Math.round(((food.carbsPer100g || 0) * s.grams / 100) * 10) / 10,
          fat: Math.round(((food.fatPer100g || 0) * s.grams / 100) * 10) / 10,
          fiber: 0, sugar: 0, sodium: 0, cholesterol: 0, saturatedFat: 0,
          polyunsaturatedFat: 0, monounsaturatedFat: 0, potassium: 0,
          vitaminA: 0, vitaminC: 0, calcium: 0, iron: 0, sugarAlcohols: 0,
          addedSugars: 0, transFat: 0, vitaminD: 0,
          grams: s.grams,
          unit: food.servingUnitType || 'g',
          isDefault: false,
        })),
      ]
    : [];
  const allServings = fsServings.length > 0 ? fsServings : customServings;
  const searchResultCal: number | null = food?.foodNutrients?.find((n: any) => n.nutrientName === 'Energy')?.value ?? null;
  const defaultFsServing = allServings.length > 0
    ? ((searchResultCal !== null ? allServings.find((s: any) => s.calories === searchResultCal) : null) || allServings.find((s: any) => s.isDefault) || allServings[0])
    : null;
  // When search result calories don't match any food.get.v4 serving (FatSecret data inconsistency),
  // construct a virtual serving from the search result macros so detail matches the list.
  const virtualDefaultServing = (
    searchResultCal !== null &&
    defaultFsServing !== null &&
    defaultFsServing.calories !== searchResultCal &&
    food?.fsId && !food?.isCustom && !food?.fromBarcode
  ) ? {
    ...defaultFsServing,
    calories: searchResultCal,
    protein: food?.foodNutrients?.find((n: any) => n.nutrientName === 'Protein')?.value ?? defaultFsServing.protein,
    carbs: food?.foodNutrients?.find((n: any) => n.nutrientName === 'Carbohydrate, by difference')?.value ?? defaultFsServing.carbs,
    fat: food?.foodNutrients?.find((n: any) => n.nutrientName === 'Total lipid (fat)')?.value ?? defaultFsServing.fat,
    grams: food?.fsServingGrams || defaultFsServing.grams,
  } : defaultFsServing;
  const { showToast } = useToast();
  const amountRowRef = useTutorialTarget('log_food_detail_amount');
  const stepperRowRef = useTutorialTarget('log_food_detail_stepper');
  const servingPickerRef = useTutorialTarget('log_food_detail_serving');
  const mealSelectorRef = useTutorialTarget('log_food_detail_meal');
  const saveButtonRef = useTutorialTarget('log_save_btn');
  const { registerTutorialAction, unregisterTutorialAction, registerScrollView, unregisterScrollView } = useTutorial();
  const detailScrollRef = useRef<ScrollView>(null);
  useEffect(() => {
    registerScrollView('food_detail', detailScrollRef as any);
    return () => unregisterScrollView('food_detail');
  }, [registerScrollView, unregisterScrollView]);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [showPhotoFullscreen, setShowPhotoFullscreen] = useState(false);
  const [foodStats, setFoodStats] = useState<{ count: number; lastDate: string | null; avgGrams: number } | null>(null);
  const [isFav, setIsFav] = useState(false);
  const [showSaveAsCopy, setShowSaveAsCopy] = useState(false);
  const [showEllipsisMenu, setShowEllipsisMenu] = useState(false);
  const [carbsOpen, setCarbsOpen] = useState(true);
  const [fatsOpen, setFatsOpen] = useState(true);
  const [otherOpen, setOtherOpen] = useState(true);
  const [vitaminsOpen, setVitaminsOpen] = useState(false);
  const [bVitaminsOpen, setBVitaminsOpen] = useState(false);
  const [mineralsOpen, setMineralsOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 60, right: 16 });
  const ellipsisRef = useRef<TouchableOpacity>(null);
  const menuAnim = useRef(new Animated.Value(0)).current;
  const starScale = useRef(new Animated.Value(1)).current;
  const [showServingPicker, setShowServingPicker] = useState(false);
  const [selectedServing, setSelectedServing] = useState<any>(virtualDefaultServing);
  // Resolved base serving size for edit mode -- starts from stored servingGrams, falls back to My Foods lookup
  const [resolvedServingGrams, setResolvedServingGrams] = useState<number>(
    food?.servingGrams > 0 ? food.servingGrams : 0
  );

  // Synthetic serving for custom/My Foods with no fsServings -- enables stepper.
  // food.servingGrams is the base serving size stored at save time (new diary entries only).
  // For edit mode: derive per-serving values from the ratio of servingGrams / logged grams.
  const syntheticServing = (() => {
    if (!(!food?.fsId && fsServings.length === 0 && customServings.length === 0 && food?.existingCal !== undefined && food?.existingAmount)) return null;
    const baseGrams = resolvedServingGrams > 0 ? resolvedServingGrams : parseFloat(food.existingAmount);
    const loggedGrams = parseFloat(food.existingAmount);
    const ratio = loggedGrams > 0 ? baseGrams / loggedGrams : 1;
    return {
      calories: Math.round(food.existingCal * ratio),
      protein: Math.round((food.existingProtein || 0) * ratio * 10) / 10,
      carbs: Math.round((food.existingCarbs || 0) * ratio * 10) / 10,
      fat: Math.round((food.existingFat || 0) * ratio * 10) / 10,
      grams: baseGrams,
      unit: food.servingUnitType || 'g',
      label: (food.servingUnit && /\d/.test(food.servingUnit)) ? food.servingUnit : `${baseGrams}${food.servingUnitType || 'g'}`,
      fiber: 0, sugar: 0, sodium: 0, cholesterol: 0, saturatedFat: 0,
      polyunsaturatedFat: 0, monounsaturatedFat: 0, potassium: 0,
      vitaminA: 0, vitaminC: 0, calcium: 0, iron: 0, sugarAlcohols: 0,
      isDefault: true,
    };
  })();
  const effectiveServing = selectedServing ?? syntheticServing;

  // Per-gram rates derived from effective serving -- used for manual gram input scaling
  const servingRates = effectiveServing && effectiveServing.grams > 0 ? {
    calories: effectiveServing.calories / effectiveServing.grams,
    protein: effectiveServing.protein / effectiveServing.grams,
    carbs: effectiveServing.carbs / effectiveServing.grams,
    fat: effectiveServing.fat / effectiveServing.grams,
    fiber: effectiveServing.fiber / effectiveServing.grams,
    sugar: effectiveServing.sugar / effectiveServing.grams,
    sodium: effectiveServing.sodium / effectiveServing.grams,
    cholesterol: effectiveServing.cholesterol / effectiveServing.grams,
    saturatedFat: effectiveServing.saturatedFat / effectiveServing.grams,
    polyunsaturatedFat: (effectiveServing.polyunsaturatedFat ?? 0) / effectiveServing.grams,
    monounsaturatedFat: (effectiveServing.monounsaturatedFat ?? 0) / effectiveServing.grams,
    potassium: (effectiveServing.potassium ?? 0) / effectiveServing.grams,
    vitaminA: (effectiveServing.vitaminA ?? 0) / effectiveServing.grams,
    vitaminC: (effectiveServing.vitaminC ?? 0) / effectiveServing.grams,
    calcium: (effectiveServing.calcium ?? 0) / effectiveServing.grams,
    iron: (effectiveServing.iron ?? 0) / effectiveServing.grams,
    sugarAlcohols: (effectiveServing.sugarAlcohols ?? 0) / effectiveServing.grams,
    addedSugars: (effectiveServing.addedSugars ?? 0) / effectiveServing.grams,
    transFat: (effectiveServing.transFat ?? 0) / effectiveServing.grams,
    vitaminD: (effectiveServing.vitaminD ?? 0) / effectiveServing.grams,
  } : null;

  useEffect(() => {
    const resolveServings = async () => {
      if (fsServings.length > 0) return;
      let servings: any[] = [];
      if (food?.fsId) {
        // Has fsId -- fetch servings directly
        servings = await fetchFatSecretServings(food.fsId).catch(() => []);
      } else if (!food?.isCustom && !food?.isMyFood && !isEditing && food?.description) {
        // No fsId (stale entry) -- search by name and use top result's servings
        servings = await fetchFatSecretByName(food.description).catch(() => []);
      }
      if (servings.length > 0) {
        const def = (searchResultCal !== null ? servings.find((s: any) => s.calories === searchResultCal) : null) || servings.find((s: any) => s.isDefault) || servings[0];
        if (def) {
          setSelectedServing(def);
          if (def.grams > 0 && !isEditing) {
            setAmount(def.grams.toString());
          }
        }
      }
    };
    resolveServings();
  }, []);

  // For edit mode custom foods: look up base serving size from My Foods when not already known
  useEffect(() => {
    if (!food?.fsId && !resolvedServingGrams && food?.description) {
      AsyncStorage.getItem('pj_my_foods').then(saved => {
        if (!saved) return;
        const myFoods = JSON.parse(saved);
        const myFoodId = (food as any).myFoodId;
        const match = myFoods.find((f: any) => myFoodId ? f.id === myFoodId : (f.name === food.description || (f.id && f.id === (food as any).id)));
        if (match?.servingSize > 0) setResolvedServingGrams(match.servingSize);
      }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const loadFav = async () => {
      try {
        const saved = await AsyncStorage.getItem('pj_favorites');
        if (saved && food) {
          const favs = JSON.parse(saved);
          setIsFav(favs.some((f: any) =>
            food.fsId ? f.fsId === food.fsId : (f.name === food.description && !f.fsId)
          ));
        }
      } catch (e) {}
    };
    loadFav();
  }, []);

  useEffect(() => {
    if (!foodId) return;
    (async () => {
      try {
        const uri = await AsyncStorage.getItem(`pj_food_photo_${foodId}`);
        if (!uri) return;
        const file = new FSFile(uri);
        if (file.exists) {
          setPhotoUri(uri);
        } else {
          await AsyncStorage.removeItem(`pj_food_photo_${foodId}`);
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!food?.description) return;
      try {
        const allKeys = await AsyncStorage.getAllKeys();
        const dayKeys = allKeys.filter(k => /^pj_\d{4}-\d{2}-\d{2}$/.test(k));
        if (dayKeys.length === 0) return;
        const pairs = await AsyncStorage.multiGet(dayKeys);
        let count = 0;
        let lastDate: string | null = null;
        let totalAmount = 0;
        for (const [key, raw] of pairs) {
          if (!raw) continue;
          try {
            const data = JSON.parse(raw);
            const entries: any[] = data.entries || [];
            const dateStr = key.replace('pj_', '');
            for (const entry of entries) {
              if (!entry?.name) continue;
              const isMatch = food.fsId
                ? entry.fsId === food.fsId || entry.name.startsWith(food.description + ' (')
                : entry.name.startsWith(food.description + ' (');
              if (isMatch) {
                count++;
                if (!lastDate || dateStr > lastDate) lastDate = dateStr;
                totalAmount += parseFloat(entry.loggedAmount || '0') || 0;
              }
            }
          } catch {}
        }
        if (count > 0) setFoodStats({ count, lastDate, avgGrams: totalAmount / count });
      } catch {}
    })();
  }, []);

  const tutorialSaveDataRef = useRef({ amount: '100', unit: 'g', calories: 0, currentMeal: 'ms_lunch', protein: 0, carbs: 0, fat: 0, calPer100g: 0, proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 0 });

  useEffect(() => {
    tutorialSaveDataRef.current = { amount, unit, calories, currentMeal, protein, carbs, fat, calPer100g, proteinPer100g, carbsPer100g, fatPer100g };
  });

  useEffect(() => {
    if (!isTutorialMode) return;
    const saveTutorialEntry = async () => {
      try {
        const d = tutorialSaveDataRef.current;
        const today = new Date();
        const todayKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
        const saved = await AsyncStorage.getItem(`pj_${todayKey}`);
        const current = saved ? JSON.parse(saved) : {};
        const entries = current.entries || [];
        const tutorialEntry = {
          name: `${food.description} (${d.amount}${d.unit})`,
          cal: d.calories,
          meal: d.currentMeal,
          protein: d.protein,
          carbs: d.carbs,
          fat: d.fat,
          calPer100g: d.calPer100g,
          proteinPer100g: d.proteinPer100g,
          carbsPer100g: d.carbsPer100g,
          fatPer100g: d.fatPer100g,
          foodNutrients: food.foodNutrients || [],
          timestamp: Date.now(),
          fsId: food.fsId || null,
          tutorialEntry: true,
        };
        entries.push(tutorialEntry);
        await AsyncStorage.setItem(`pj_${todayKey}`, JSON.stringify({ ...current, entries }));
      } catch {}
    };
    registerTutorialAction('saveTutorialEntry', saveTutorialEntry);
    return () => unregisterTutorialAction('saveTutorialEntry');
  }, [isTutorialMode]);

  const toggleFav = async () => {
    // Spring animation
    Animated.sequence([
      Animated.timing(starScale, { toValue: 1.4, duration: 120, useNativeDriver: true }),
      Animated.spring(starScale, { toValue: 1, useNativeDriver: true, friction: 4, tension: 200 }),
    ]).start();
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    try {
      const saved = await AsyncStorage.getItem('pj_favorites');
      let favs = saved ? JSON.parse(saved) : [];
      if (isFav) {
        if (food.fsId) {
          favs = favs.filter((f: any) => f.fsId !== food.fsId);
        } else {
          const idx = favs.findIndex((f: any) => f.name === food.description && !f.fsId);
          if (idx !== -1) favs.splice(idx, 1);
        }
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
          id: Math.random().toString(36).slice(2) + Date.now().toString(36),
          name: food.description,
          brand: food.brand || null,
          isMyFood: food?.isMyFood || false,
          isCustom: food?.isCustom || false,
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
      await storageSet('pj_favorites', JSON.stringify(favs));
      await saveToFirebase('my_foods', 'favorites', favs);
      setIsFav(!isFav);
    } catch (e) {}
  };
    const [entryTime, setEntryTime] = useState<Date>( food?.timestamp ? new Date(food.timestamp) : new Date());
const [showTimePicker, setShowTimePicker] = useState(false);
  const isEditing = entryIndex !== undefined && entryIndex !== '';
  const originalAmount = food?.existingAmount ||
    (defaultFsServing && defaultFsServing.grams > 0
      ? defaultFsServing.grams.toString()
      : '100');
  const [amount, setAmount] = useState(originalAmount);
  const [amountChanged, setAmountChanged] = useState(false);
  const [servingCountTouched, setServingCountTouched] = useState(false);
  const initialServingCount = resolvedServingGrams > 0 && food?.existingAmount
    ? Math.max(1, parseFloat(food.existingAmount) / resolvedServingGrams)
    : 1;
  const [servingCount, setServingCount] = useState(initialServingCount);
  const [servingCountStr, setServingCountStr] = useState(initialServingCount.toString());
  const [hasChanges, setHasChanges] = useState(false);
  const [unit, setUnit] = useState<'g' | 'oz' | 'serving'>(food?.existingUnit || 'g');
    const [showMealPicker, setShowMealPicker] = useState(false);
const [currentMeal, setCurrentMeal] = useState(meal === 'browse' || !meal ? 'ms_morning' : meal);
  const [mealSlots, setMealSlots] = useState<MealSlot[]>(DEFAULT_MEAL_SLOTS);
  const [slotNameCache, setSlotNameCache] = useState<Record<string, string>>({});
  useEffect(() => {
    loadMealSlots().then(({ mealSlots: slots, slotNameCache: cache }) => { setMealSlots(slots); setSlotNameCache(cache); });
  }, []);
  const [showEditFoodModal, setShowEditFoodModal] = useState(false);
  const [editFoodData, setEditFoodData] = useState<any>(null);
  const editOverlayAnim = useRef(new Animated.Value(0)).current;
  const editCardAnim = useRef(new Animated.Value(0)).current;
  const mealDropdownAnim = useRef(new Animated.Value(0)).current;
  const timePickerAnim = useRef(new Animated.Value(0)).current;
  const servingPickerAnim = useRef(new Animated.Value(0)).current;

  // When async My Foods lookup resolves, update servingCount to match the real base serving
  useEffect(() => {
    if (resolvedServingGrams > 0 && food?.existingAmount && !servingCountTouched) {
      const count = Math.max(1, parseFloat(food.existingAmount) / resolvedServingGrams);
      setServingCount(count);
    }
  }, [resolvedServingGrams]);

  if (!food) return null;

  // Helper: compute a scaled extended nutrient value for the current serving/amount state.
  // Returns null when no data is available at all for this nutrient.
  const computeExtended = (servingKey: string, nutrientName: string): number | null => {
    const sk = effectiveServing ? (effectiveServing as any)[servingKey] : null;
    if (food?.fsId && effectiveServing && sk != null) {
      if (useServingBased) return Math.round(sk * servingCount * 10) / 10;
      if (servingRates && (servingRates as any)[servingKey] != null)
        return Math.round((servingRates as any)[servingKey] * grams * 10) / 10;
      return Math.round(sk * 10) / 10;
    }
    const n = food.foodNutrients?.find((fn: any) => fn.nutrientName === nutrientName);
    if (n) {
      let scale: number;
      if (useExisting) scale = 1;
      else if (!food?.fsId && effectiveServing && effectiveServing.grams > 0)
        scale = useServingBased ? servingCount : grams / effectiveServing.grams;
      else scale = multiplier;
      return Math.round((n.value || 0) * scale * 10) / 10;
    }
    if (effectiveServing && sk != null && sk > 0) {
      const raw = useServingBased ? sk * servingCount : servingRates ? (servingRates as any)[servingKey] * grams : sk;
      return Math.round(raw * 10) / 10;
    }
    return null;
  };

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
  const useExisting = (isEditing || food.isCustom) && !amountChanged && !servingCountTouched && food.existingCal !== undefined;
  // Primary path for FatSecret foods: multiply selected serving directly by servingCount
  const useServingBased = !useExisting && effectiveServing !== null && !amountChanged;
  // Edit entry fallback: derive per-gram rate from original logged amount + values
  const origGrams = parseFloat(food.existingAmount || '0');
  const editRates = isEditing && origGrams > 0 ? {
    calories: (food.existingCal || 0) / origGrams,
    protein: (food.existingProtein || 0) / origGrams,
    carbs: (food.existingCarbs || 0) / origGrams,
    fat: (food.existingFat || 0) / origGrams,
  } : null;

  const grams = parseFloat(amount) || 0;
  const calories = useExisting
    ? (food.existingCal || 0)
    : useServingBased
      ? Math.round(effectiveServing!.calories * servingCount)
      : servingRates
        ? Math.round(servingRates.calories * grams)
        : editRates
          ? Math.round(editRates.calories * grams)
          : calPer100g > 0 ? Math.round(calPer100g * multiplier) : (food.existingCal || 0);
  const protein = useExisting
    ? (food.existingProtein || 0)
    : useServingBased
      ? Math.round(effectiveServing!.protein * servingCount * 10) / 10
      : servingRates
        ? Math.round(servingRates.protein * grams * 10) / 10
        : editRates
          ? Math.round(editRates.protein * grams * 10) / 10
          : calPer100g > 0 ? Math.round(proteinPer100g * multiplier * 10) / 10 : (food.existingProtein || 0);
  const carbs = useExisting
    ? (food.existingCarbs || 0)
    : useServingBased
      ? Math.round(effectiveServing!.carbs * servingCount * 10) / 10
      : servingRates
        ? Math.round(servingRates.carbs * grams * 10) / 10
        : editRates
          ? Math.round(editRates.carbs * grams * 10) / 10
          : calPer100g > 0 ? Math.round(carbsPer100g * multiplier * 10) / 10 : (food.existingCarbs || 0);
  const fat = useExisting
    ? (food.existingFat || 0)
    : useServingBased
      ? Math.round(effectiveServing!.fat * servingCount * 10) / 10
      : servingRates
        ? Math.round(servingRates.fat * grams * 10) / 10
        : editRates
          ? Math.round(editRates.fat * grams * 10) / 10
          : calPer100g > 0 ? Math.round(fatPer100g * multiplier * 10) / 10 : (food.existingFat || 0);

  const savingRef = useRef(false);
  const saveEntry = async () => {
    if (!calories && calories !== 0) return;
    if (savingRef.current) return; // ignore repeat taps while a save is in flight
    savingRef.current = true;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    try {
      if (isRecipeMode) {
        // Save as pending ingredient for recipe builder to pick up
        const ingredient = {
          id: Math.random().toString(36).substr(2, 9),
          name: food.brand ? `${food.description} · ${food.brand}` : (food.description?.split(' · ')[0] ?? food.description),
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
        await storageSet('pj_pending_ingredient', JSON.stringify(ingredient));
        if (router.canGoBack()) router.back();
        if (router.canGoBack()) router.back();
        return;
      }

      const saved = await AsyncStorage.getItem(`pj_${date}`);
      const current = saved ? JSON.parse(saved) : {};
      const entries = current.entries || [];
      // Augment foodNutrients with extended data from serving (fiber, sugar, sodium, etc.)
      // FatSecret text-search results only carry 4 macros; barcode already includes extended.
      const baseNutrients = [...(food.foodNutrients || [])];
      if (food.fsId && effectiveServing) {
        const extMap = [
          { nutrientName: 'Fiber, total dietary',          unitName: 'G',   key: 'fiber' },
          { nutrientName: 'Sugars, total including NLEA',  unitName: 'G',   key: 'sugar' },
          { nutrientName: 'Sodium, Na',                    unitName: 'MG',  key: 'sodium' },
          { nutrientName: 'Cholesterol',                   unitName: 'MG',  key: 'cholesterol' },
          { nutrientName: 'Fatty acids, total saturated',  unitName: 'G',   key: 'saturatedFat' },
          { nutrientName: 'Polyunsaturated Fat',           unitName: 'G',   key: 'polyunsaturatedFat' },
          { nutrientName: 'Monounsaturated Fat',           unitName: 'G',   key: 'monounsaturatedFat' },
          { nutrientName: 'Potassium, K',                  unitName: 'MG',  key: 'potassium' },
          { nutrientName: 'Vitamin A',                     unitName: 'MCG', key: 'vitaminA' },
          { nutrientName: 'Vitamin C',                     unitName: 'MG',  key: 'vitaminC' },
          { nutrientName: 'Calcium, Ca',                   unitName: 'MG',  key: 'calcium' },
          { nutrientName: 'Iron, Fe',                      unitName: 'MG',  key: 'iron' },
          { nutrientName: 'Sugar Alcohols',                unitName: 'G',   key: 'sugarAlcohols' },
          { nutrientName: 'Added Sugars',                 unitName: 'G',   key: 'addedSugars' },
          { nutrientName: 'Trans Fat',                    unitName: 'G',   key: 'transFat' },
          { nutrientName: 'Vitamin D',                    unitName: 'MCG', key: 'vitaminD' },
        ];
        extMap.forEach(({ nutrientName, unitName, key }) => {
          if (!baseNutrients.find(n => n.nutrientName === nutrientName)) {
            baseNutrients.push({ nutrientName, unitName, value: (effectiveServing as any)[key] || 0 });
          }
        });
      }
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
  labelCal: selectedServing?.calories || effectiveServing?.calories || defaultFsServing?.calories || calPer100g,
  labelProtein: selectedServing?.protein || effectiveServing?.protein || defaultFsServing?.protein || proteinPer100g,
  labelCarbs: selectedServing?.carbs || effectiveServing?.carbs || defaultFsServing?.carbs || carbsPer100g,
  labelFat: selectedServing?.fat || effectiveServing?.fat || defaultFsServing?.fat || fatPer100g,
  loggedAmount: amount,
  loggedUnit: unit,
  servingGrams: effectiveServing?.grams,
  foodNutrients: baseNutrients,
  timestamp: entryTime.getTime(),
  fsId: food.fsId || null,
  myFoodId: food.myFoodData?.id || (food as any)?.myFoodId || null,
  isMyFood: !!(food.isMyFood || food.myFoodData || (food as any)?.myFoodId),
  brand: food.brand || food.description?.split(' · ')[1] || null,
  ...(food.type === 'supplement' ? { type: 'supplement' } : {}),
};
      if (isEditing) {
        entries[parseInt(entryIndex)] = { ...entries[parseInt(entryIndex)], ...newEntry };
      } else {
        entries.push(newEntry);
      }
      await storageSet(`pj_${date}`, JSON.stringify({ ...current, entries }));
      // Fire-and-forget: the local write above already persisted the entry AND
      // mirrored it to the cloud backup. This secondary write to the days
      // collection must not block navigation -- awaiting it froze the screen
      // ~800ms+ per log on WiFi (and several seconds on weak signal). It still
      // runs and still saves; we just don't make the user wait on the ack.
      saveToFirebase(date, 'entries', entries).catch(() => {});
      showToast(isEditing ? 'Entry updated' : 'Entry logged', `${calories} kcal · ${getMealDisplayName(currentMeal, mealSlots, slotNameCache)}`, 'success');
      if (!isEditing) {
        cancelFoodLogNotification();
        const store = await loadAchievements();
        const result = await checkAndUnlock('general_first_log', store);
        if (result.newlyUnlocked) {
          const def = ACHIEVEMENTS.find(a => a.id === 'general_first_log');
          if (def) { showAchievementToast(def); showCelebration(getCelebTier(def), def.name, def); }
        }
        const momentumUnlocked = await checkMomentumAchievements();
        momentumUnlocked.forEach(def => {
          showCelebration(getCelebTier(def), def.name, def);
          showAchievementToast(def);
        });
        const nutritionUnlocked = await checkNutritionAchievements();
        nutritionUnlocked.forEach(def => {
          showCelebration(getCelebTier(def), def.name, def);
          showAchievementToast(def);
        });
      }
      if (router.canGoBack()) router.back();
      if (!isEditing && router.canGoBack()) router.back();
    } catch (e) {
      console.log('Save error', e);
    } finally {
      savingRef.current = false;
    }
  };

  const filterDecimal = (v: string) => {
    const stripped = v.replace(/[^0-9.]/g, '');
    const dot = stripped.indexOf('.');
    if (dot === -1) return stripped;
    return stripped.slice(0, dot + 1) + stripped.slice(dot + 1).replace(/\./g, '').slice(0, 1);
  };

  const openEditFoodModal = () => {
    const src = food;
    const mf = src.myFoodData;
    setEditFoodData({
      _source: src,
      name: src.description || src.name || '',
      brand: mf?.brand?.toString() || '',
      cal: mf?.cal?.toString() || src.existingCal?.toString() || '',
      protein: mf?.protein?.toString() || src.existingProtein?.toString() || '',
      carbs: mf?.carbs?.toString() || src.existingCarbs?.toString() || '',
      fat: mf?.fat?.toString() || src.existingFat?.toString() || '',
      fiber: mf?.fiber?.toString() || '',
      sugar: mf?.sugar?.toString() || '',
      sodium: mf?.sodium?.toString() || '',
      cholesterol: mf?.cholesterol?.toString() || '',
      saturatedFat: mf?.saturatedFat?.toString() || '',
      polyunsaturatedFat: mf?.polyunsaturatedFat?.toString() || '',
      monounsaturatedFat: mf?.monounsaturatedFat?.toString() || '',
      potassium: mf?.potassium?.toString() || '',
      vitaminA: mf?.vitaminA?.toString() || '',
      vitaminC: mf?.vitaminC?.toString() || '',
      calcium: mf?.calcium?.toString() || '',
      iron: mf?.iron?.toString() || '',
      sugarAlcohols: mf?.sugarAlcohols?.toString() || '',
      addedSugars: mf?.addedSugars?.toString() || '',
      transFat: mf?.transFat?.toString() || '',
      vitaminD: mf?.vitaminD?.toString() || '',
      vitaminE: mf?.vitaminE?.toString() || '',
      vitaminK: mf?.vitaminK?.toString() || '',
      vitaminB6: mf?.vitaminB6?.toString() || '',
      folate: mf?.folate?.toString() || '',
      vitaminB12: mf?.vitaminB12?.toString() || '',
      biotin: mf?.biotin?.toString() || '',
      magnesium: mf?.magnesium?.toString() || '',
      zinc: mf?.zinc?.toString() || '',
      copper: mf?.copper?.toString() || '',
      caffeine: mf?.caffeine?.toString() || '',
      servingGrams: (mf?.servingSize ?? src.servingSize)?.toString() || '100',
      servingUnitType: mf?.servingUnitType || src.servingUnitType || 'g',
      servingLabel: mf?.servingUnit || src.servingUnit || '',
      additionalServings: (mf?.additionalServings || src.additionalServings || []).map((s: any, i: number) => ({
        id: `as_${i}`,
        label: s.label || '',
        grams: s.grams?.toString() || '',
      })),
      type: mf?.type || 'food',
    });
    setShowEditFoodModal(true);
    editOverlayAnim.setValue(0);
    editCardAnim.setValue(0);
    Animated.parallel([
      Animated.timing(editOverlayAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.spring(editCardAnim, { toValue: 1, useNativeDriver: true, damping: 20, stiffness: 300 }),
    ]).start();
  };

  const closeMealPicker = () => {
    Animated.timing(mealDropdownAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => setShowMealPicker(false));
  };

  const closeTimePicker = () => {
    Animated.timing(timePickerAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => setShowTimePicker(false));
  };

  const closeEditFoodModal = () => {
    Animated.parallel([
      Animated.timing(editOverlayAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(editCardAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      setShowEditFoodModal(false);
      setEditFoodData(null);
    });
  };

  const saveEditFoodFromDetail = async () => {
    if (!editFoodData || !editFoodData.name.trim() || !editFoodData.cal) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const saved = await AsyncStorage.getItem('pj_my_foods');
      const foods = saved ? JSON.parse(saved) : [];
      const src = editFoodData._source?.myFoodData || editFoodData._source;
      const calNum = parseInt(editFoodData.cal) || 0;
      const servingGrams = parseFloat(editFoodData.servingGrams) || src?.servingSize || 100;
      const servingUnitType = editFoodData.servingUnitType || 'g';
      const servingLabel = editFoodData.servingLabel?.trim() || `${servingGrams}${servingUnitType}`;
      const updated = foods.map((f: any) =>
        (src?.id ? f.id === src.id : f.name === (src?.name || src?.description)) ? {
          ...f,
          name: editFoodData.name.trim(),
          brand: editFoodData.brand?.trim() || undefined,
          cal: calNum,
          protein: parseFloat(editFoodData.protein) || 0,
          carbs: parseFloat(editFoodData.carbs) || 0,
          fat: parseFloat(editFoodData.fat) || 0,
          fiber: parseFloat(editFoodData.fiber) || 0,
          sugar: parseFloat(editFoodData.sugar) || 0,
          sodium: parseFloat(editFoodData.sodium) || 0,
          cholesterol: parseFloat(editFoodData.cholesterol) || 0,
          saturatedFat: parseFloat(editFoodData.saturatedFat) || 0,
          polyunsaturatedFat: parseFloat(editFoodData.polyunsaturatedFat) || 0,
          monounsaturatedFat: parseFloat(editFoodData.monounsaturatedFat) || 0,
          potassium: parseFloat(editFoodData.potassium) || 0,
          vitaminA: parseFloat(editFoodData.vitaminA) || 0,
          vitaminC: parseFloat(editFoodData.vitaminC) || 0,
          calcium: parseFloat(editFoodData.calcium) || 0,
          iron: parseFloat(editFoodData.iron) || 0,
          sugarAlcohols: parseFloat(editFoodData.sugarAlcohols) || 0,
          addedSugars: parseFloat(editFoodData.addedSugars) || 0,
          transFat: parseFloat(editFoodData.transFat) || 0,
          vitaminD: parseFloat(editFoodData.vitaminD) || 0,
          vitaminE: parseFloat(editFoodData.vitaminE) || 0,
          vitaminK: parseFloat(editFoodData.vitaminK) || 0,
          vitaminB6: parseFloat(editFoodData.vitaminB6) || 0,
          folate: parseFloat(editFoodData.folate) || 0,
          vitaminB12: parseFloat(editFoodData.vitaminB12) || 0,
          biotin: parseFloat(editFoodData.biotin) || 0,
          magnesium: parseFloat(editFoodData.magnesium) || 0,
          zinc: parseFloat(editFoodData.zinc) || 0,
          copper: parseFloat(editFoodData.copper) || 0,
          caffeine: parseFloat(editFoodData.caffeine) || 0,
          servingSize: servingGrams,
          servingUnitType,
          servingUnit: servingLabel,
          calPer100g: Math.round((calNum / servingGrams) * 100),
          proteinPer100g: Math.round((parseFloat(editFoodData.protein) || 0) / servingGrams * 100 * 10) / 10,
          carbsPer100g: Math.round((parseFloat(editFoodData.carbs) || 0) / servingGrams * 100 * 10) / 10,
          fatPer100g: Math.round((parseFloat(editFoodData.fat) || 0) / servingGrams * 100 * 10) / 10,
          additionalServings: (editFoodData.additionalServings || [])
            .filter((s: any) => s.label?.trim() && parseFloat(s.grams) > 0)
            .map((s: any) => ({ label: s.label.trim(), grams: parseFloat(s.grams) })),
          type: editFoodData.type || 'food',
        } : f
      );
      await storageSet('pj_my_foods', JSON.stringify(updated));
      await saveToFirebase('my_foods', 'foods', updated);
      showToast('Food saved', editFoodData.name.trim(), 'success');
      closeEditFoodModal();
    } catch (e) {
      console.log('Edit food error', e);
    }
  };

  const handlePhotoAdd = () => {
    if (!foodId) return;
    ActionSheetIOS.showActionSheetWithOptions(
      { options: ['Take Photo', 'Choose from Library', 'Cancel'], cancelButtonIndex: 2 },
      (buttonIndex) => {
        if (buttonIndex === 2) return;
        (async () => {
          try {
            let result: ImagePicker.ImagePickerResult;
            if (buttonIndex === 0) {
              result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.85 });
            } else {
              result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
            }
            if (result.canceled) return;
            await savePhoto(result.assets[0].uri);
          } catch {
            showToast('Photo failed', 'Unable to access camera or library', 'error');
          }
        })();
      }
    );
  };

  const savePhoto = async (sourceUri: string) => {
    if (!foodId) return;
    try {
      const safeId = foodId.replace(/[^a-zA-Z0-9_-]/g, '_');
      const photoDir = new Directory(Paths.document, 'food_photos');
      if (!photoDir.exists) photoDir.create();
      const destUri = `${photoDir.uri}${safeId}.jpg`;
      const destFile = new FSFile(destUri);
      if (destFile.exists) destFile.delete();
      const srcFile = new FSFile(sourceUri);
      srcFile.copy(destFile);
      await AsyncStorage.setItem(`pj_food_photo_${foodId}`, destUri);
      setPhotoUri(destUri);
      setShowPhotoFullscreen(false);
      triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
      showToast('Photo saved', undefined, 'success');
    } catch (e: any) {
      showToast('Photo save failed', e?.message || 'Please try again', 'error');
    }
  };

  const handlePhotoRemove = () => {
    if (!foodId || !photoUri) return;
    Alert.alert('Remove Photo', 'Remove this photo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
          try {
            const file = new FSFile(photoUri);
            if (file.exists) file.delete();
            await AsyncStorage.removeItem(`pj_food_photo_${foodId}`);
            setPhotoUri(null);
            setShowPhotoFullscreen(false);
            showToast('Photo removed', undefined, 'success');
          } catch (e: any) {
            showToast('Failed to remove photo', e?.message || 'Please try again', 'error');
          }
        }
      },
    ]);
  };

  const styles = useStyles(theme);
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); router.back(); }} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {isEditing ? 'Edit Entry' : 'Food Detail'}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 60, justifyContent: 'flex-end' }}>
          {food?.isMyFood ? (
            <TouchableOpacity
              style={{ backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 }}
              onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); openEditFoodModal(); }}>
              <Text style={{ color: theme.accentBlue, fontSize: 13, fontFamily: 'DMSans_600SemiBold' }}>Edit</Text>
            </TouchableOpacity>
          ) : food?.fsId ? (
            <TouchableOpacity
              ref={ellipsisRef}
              onPress={() => {
                triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                (ellipsisRef.current as any)?.measure((_x: number, _y: number, w: number, h: number, px: number, py: number) => {
                  const screenWidth = Dimensions.get('window').width;
                  setMenuPos({ top: py + h + 6, right: screenWidth - px - w });
                  menuAnim.setValue(0);
                  setShowEllipsisMenu(true);
                  Animated.timing(menuAnim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
                });
              }}
              style={{ width: 30, height: 30, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="ellipsis-horizontal" size={22} color={theme.textDim} />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity onPress={toggleFav} style={{ width: 30, height: 30, alignItems: 'center', justifyContent: 'center' }}>
            <Animated.View style={{ transform: [{ scale: starScale }], alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons
                name={isFav ? 'star' : 'star-outline'}
                size={22}
                color={isFav ? theme.accentAmber : theme.textDim}
              />
            </Animated.View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView ref={detailScrollRef} contentContainerStyle={styles.content} automaticallyAdjustKeyboardInsets keyboardDismissMode="on-drag">
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 }}>
          <View style={{ flex: 1, paddingRight: foodId ? 16 : 0 }}>
            {food?.aiEstimated && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder, borderRadius: 3, paddingHorizontal: 5, paddingVertical: 2, alignSelf: 'flex-start', marginBottom: 4 }}>
                <Ionicons name="sparkles" size={8} color={theme.accentBlue} />
                <Text style={{ fontSize: 8, color: theme.accentBlue, fontFamily: 'DMSans_700Bold' }}>AI ESTIMATE</Text>
              </View>
            )}
            {(food?.isMyFood || food?.isCustom) && (
              <View style={{ backgroundColor: theme.accentGreenBg, borderRadius: 3, paddingHorizontal: 5, paddingVertical: 1, alignSelf: 'flex-start', marginBottom: 4 }}>
                <Text style={{ fontSize: 8, color: theme.accentGreen, fontFamily: 'DMSans_700Bold' }}>MY FOOD</Text>
              </View>
            )}
            <Text style={[styles.foodName, { marginBottom: (food.brand || food.description?.includes(' · ')) ? 4 : 0 }]}>{food.brand ? food.description : (food.description?.split(' · ')[0] ?? food.description)}</Text>
            {(food.brand || food.description?.split(' · ')[1]) && (
              <Text style={{ fontSize: 13, color: theme.textSecondary, fontFamily: 'DMSans_500Medium' }}>{food.brand || food.description?.split(' · ')[1]}</Text>
            )}
          </View>
          {foodId && (
            <TouchableOpacity
              onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); photoUri ? setShowPhotoFullscreen(true) : handlePhotoAdd(); }}
              style={{ width: 64, height: 64 }}
              activeOpacity={0.8}>
              {photoUri ? (
                <Image
                  source={{ uri: photoUri }}
                  style={{ width: 64, height: 64, borderRadius: 10 }}
                  resizeMode="cover"
                />
              ) : (
                <View style={{
                  width: 64, height: 64, borderRadius: 10,
                  borderWidth: 1.5, borderStyle: 'dashed', borderColor: theme.textDim,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Ionicons name="camera-outline" size={24} color={theme.textDim} />
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Serving picker -- shows when multiple servings available (FatSecret or custom additional) */}
        {(fsServings.length > 1 || customServings.length > 1) && (
          <TouchableOpacity
            ref={servingPickerRef as any}
            style={styles.servingPickerBtn}
            onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setShowServingPicker(true); }}>
            <View>
              <Text style={styles.servingPickerLabel}>Serving Size</Text>
              <Text style={styles.servingPickerValue}>{selectedServing?.label || 'Select serving'}</Text>
            </View>
            <Text style={styles.servingPickerCal}>{selectedServing?.calories || 0} kcal ▼</Text>
          </TouchableOpacity>
        )}

        {/* Servings stepper */}
        {effectiveServing && (
          <View ref={stepperRowRef} style={[styles.amountRow, { marginBottom: 12 }]}>
            <View>
              <Text style={styles.amountLabel}>Servings</Text>
              {effectiveServing.label && /\d/.test(effectiveServing.label) ? <Text style={{ fontSize: 10, color: theme.textDim, fontFamily: 'DMSans_400Regular', marginTop: 2 }}>{effectiveServing.label}</Text> : null}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity
                onPress={() => {
                  triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                  const next = Math.max(0.5, Math.round((servingCount - 1) * 2) / 2);
                  setServingCount(next);
                  setServingCountStr(next % 1 === 0 ? next.toString() : next.toFixed(1));
                  setServingCountTouched(true);
                  setAmountChanged(false);
                  setHasChanges(true);
                  if (effectiveServing.grams > 0) setAmount((effectiveServing.grams * next).toString());
                }}
                style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder, borderRadius: 8 }}>
                <Text style={{ fontSize: 22, color: theme.accentBlue, fontFamily: 'DMSans_400Regular', lineHeight: 26 }}>−</Text>
              </TouchableOpacity>
              <TextInput
                style={{ width: 54, textAlign: 'center', fontSize: 22, color: theme.textSecondary, fontFamily: 'BebasNeue_400Regular', backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 6, paddingVertical: 4 }}
                value={servingCountStr}
                onChangeText={v => {
                  const stripped = v.replace(/[^0-9.]/g, '');
                  const dots = stripped.split('.');
                  const clean = dots.length > 2 ? dots[0] + '.' + dots.slice(1).join('') : stripped;
                  setServingCountStr(clean);
                  const parsed = parseFloat(clean);
                  if (!isNaN(parsed) && parsed > 0) {
                    setServingCount(parsed);
                    setServingCountTouched(true);
                    setAmountChanged(false);
                    setHasChanges(true);
                    if (effectiveServing?.grams > 0) setAmount((effectiveServing.grams * parsed).toString());
                  }
                }}
                keyboardType="decimal-pad"
                selectTextOnFocus
              />
              <TouchableOpacity
                onPress={() => {
                  triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                  const next = Math.ceil(servingCount) + (Number.isInteger(servingCount) ? 1 : 0);
                  setServingCount(next);
                  setServingCountStr(next.toString());
                  setServingCountTouched(true);
                  setAmountChanged(false);
                  setHasChanges(true);
                  if (effectiveServing.grams > 0) setAmount((effectiveServing.grams * next).toString());
                }}
                style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder, borderRadius: 8 }}>
                <Text style={{ fontSize: 22, color: theme.accentBlue, fontFamily: 'DMSans_400Regular', lineHeight: 26 }}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Amount input -- label reflects actual serving unit */}
        <View ref={amountRowRef} style={styles.amountRow}>
          <Text style={styles.amountLabel}>Amount ({effectiveServing?.unit || food?.servingUnitType || 'g'})</Text>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={v => {
              const stripped = v.replace(/[^0-9.]/g, '');
              const dot = stripped.indexOf('.');
              if (dot === -1) {
                setAmount(stripped); setAmountChanged(true); setServingCount(1); setHasChanges(true);
              } else {
                const before = stripped.slice(0, dot);
                const after = stripped.slice(dot + 1).replace(/\./g, '').slice(0, 1);
                setAmount(before + '.' + after); setAmountChanged(true); setServingCount(1); setHasChanges(true);
              }
            }}
            keyboardType="decimal-pad"
            selectTextOnFocus
          />
        </View>

        {/* Nutrition */}
        <View style={styles.nutritionCard}>
          <Text style={styles.nutritionTitle}>
            {'Nutrition for '}
            <Text style={{ textTransform: 'none' }}>{amount}{effectiveServing?.unit || unit}</Text>
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

          {/* ── Extended Fats ── */}
          {(() => {
            const satFat  = computeExtended('saturatedFat',       'Fatty acids, total saturated');
            const polyFat = computeExtended('polyunsaturatedFat', 'Polyunsaturated Fat');
            const monoFat = computeExtended('monounsaturatedFat', 'Monounsaturated Fat');
            const transFat = computeExtended('transFat',          'Trans Fat');
            const rows = [
              { label: 'Saturated Fat',       val: satFat,   unit: 'g' },
              { label: 'Polyunsaturated Fat', val: polyFat,  unit: 'g' },
              { label: 'Monounsaturated Fat', val: monoFat,  unit: 'g' },
              { label: 'Trans Fat',           val: transFat, unit: 'g' },
            ].filter(r => r.val !== null && r.val !== 0);
            if (rows.length === 0) return null;
            return (
              <View style={{ marginTop: 4 }}>
                <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setFatsOpen(o => !o); }} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: theme.borderSubtle }}>
                  <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: 'DMSans_700Bold', letterSpacing: 2, textTransform: 'uppercase' }}>Extended Fats</Text>
                  <Ionicons name={fatsOpen ? 'chevron-up' : 'chevron-down'} size={13} color={theme.textDim} />
                </TouchableOpacity>
                {fatsOpen && rows.map(r => (
                  <View key={r.label} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderTopWidth: 0.5, borderTopColor: theme.borderSubtle }}>
                    <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'DMSans_400Regular' }}>{r.label}</Text>
                    <Text style={{ fontSize: 12, color: theme.textSecondary, fontFamily: 'DMSans_500Medium' }}>{r.val}{r.unit}</Text>
                  </View>
                ))}
              </View>
            );
          })()}

          {/* ── Carb Breakdown ── */}
          {(() => {
            const fiber      = computeExtended('fiber',         'Fiber, total dietary');
            const addedSug   = computeExtended('addedSugars',   'Added Sugars');
            const sugar      = computeExtended('sugar',         'Sugars, total including NLEA');
            const sugarAlc   = computeExtended('sugarAlcohols', 'Sugar Alcohols');
            const fiberVal   = fiber ?? 0;
            const sugarAlcVal = sugarAlc ?? 0;
            const netCarbs   = Math.max(0, Math.round((carbs - fiberVal - sugarAlcVal) * 10) / 10);
            const hasAny = (fiber !== null && fiber !== 0) || (addedSug !== null && addedSug !== 0) || (sugar !== null && sugar !== 0) || (sugarAlc !== null && sugarAlc !== 0);
            if (!hasAny) return null;
            const rows = [
              { label: 'Total Carbs',    val: carbs,    unit: 'g' },
              { label: 'Fiber',          val: fiber,    unit: 'g' },
              { label: 'Added Sugars',   val: addedSug, unit: 'g' },
              { label: 'Sugar',          val: sugar,    unit: 'g' },
              ...(sugarAlcVal > 0 ? [{ label: 'Sugar Alcohols', val: sugarAlc, unit: 'g' }] : []),
              { label: 'Net Carbs',      val: netCarbs, unit: 'g' },
            ].filter(r => r.val !== null && r.val !== 0);
            return (
              <View style={{ marginTop: 4 }}>
                <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setCarbsOpen(o => !o); }} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: theme.borderSubtle }}>
                  <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: 'DMSans_700Bold', letterSpacing: 2, textTransform: 'uppercase' }}>Carb Breakdown</Text>
                  <Ionicons name={carbsOpen ? 'chevron-up' : 'chevron-down'} size={13} color={theme.textDim} />
                </TouchableOpacity>
                {carbsOpen && rows.map(r => (
                  <View key={r.label} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderTopWidth: 0.5, borderTopColor: theme.borderSubtle }}>
                    <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'DMSans_400Regular' }}>{r.label}</Text>
                    <Text style={{ fontSize: 12, color: theme.textSecondary, fontFamily: 'DMSans_500Medium' }}>{r.val}{r.unit}</Text>
                  </View>
                ))}
              </View>
            );
          })()}

          {/* ── Other Nutrients ── */}
          {(() => {
            const cholesterol = computeExtended('cholesterol', 'Cholesterol');
            const sodium      = computeExtended('sodium',      'Sodium, Na');
            const potassium   = computeExtended('potassium',   'Potassium, K');
            const caffeine    = computeExtended('caffeine',    'Caffeine');
            const rows = [
              { label: 'Cholesterol', val: cholesterol, unit: 'mg' },
              { label: 'Sodium',      val: sodium,      unit: 'mg' },
              { label: 'Potassium',   val: potassium,   unit: 'mg' },
              { label: 'Caffeine',    val: caffeine,    unit: 'mg' },
            ].filter(r => r.val !== null && r.val !== 0);
            if (rows.length === 0) return null;
            return (
              <View style={{ marginTop: 4 }}>
                <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setOtherOpen(o => !o); }} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: theme.borderSubtle }}>
                  <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: 'DMSans_700Bold', letterSpacing: 2, textTransform: 'uppercase' }}>Other Nutrients</Text>
                  <Ionicons name={otherOpen ? 'chevron-up' : 'chevron-down'} size={13} color={theme.textDim} />
                </TouchableOpacity>
                {otherOpen && rows.map(r => (
                  <View key={r.label} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderTopWidth: 0.5, borderTopColor: theme.borderSubtle }}>
                    <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'DMSans_400Regular' }}>{r.label}</Text>
                    <Text style={{ fontSize: 12, color: theme.textSecondary, fontFamily: 'DMSans_500Medium' }}>{r.val}{r.unit}</Text>
                  </View>
                ))}
              </View>
            );
          })()}

          {/* ── Vitamins ── */}
          {(() => {
            const vitA  = computeExtended('vitaminA', 'Vitamin A');
            const vitC  = computeExtended('vitaminC', 'Vitamin C');
            const vitD  = computeExtended('vitaminD', 'Vitamin D');
            const vitE  = computeExtended('vitaminE', 'Vitamin E');
            const vitK  = computeExtended('vitaminK', 'Vitamin K');
            const rows = [
              { label: 'Vitamin A', val: vitA, unit: 'mcg' },
              { label: 'Vitamin C', val: vitC, unit: 'mg'  },
              { label: 'Vitamin D', val: vitD, unit: 'mcg' },
              { label: 'Vitamin E', val: vitE, unit: 'mg'  },
              { label: 'Vitamin K', val: vitK, unit: 'mcg' },
            ].filter(r => r.val !== null && r.val !== 0);
            if (rows.length === 0) return null;
            return (
              <View style={{ marginTop: 4 }}>
                <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setVitaminsOpen(o => !o); }} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: theme.borderSubtle }}>
                  <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: 'DMSans_700Bold', letterSpacing: 2, textTransform: 'uppercase' }}>Vitamins</Text>
                  <Ionicons name={vitaminsOpen ? 'chevron-up' : 'chevron-down'} size={13} color={theme.textDim} />
                </TouchableOpacity>
                {vitaminsOpen && rows.map(r => (
                  <View key={r.label} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderTopWidth: 0.5, borderTopColor: theme.borderSubtle }}>
                    <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'DMSans_400Regular' }}>{r.label}</Text>
                    <Text style={{ fontSize: 12, color: theme.textSecondary, fontFamily: 'DMSans_500Medium' }}>{r.val}{r.unit}</Text>
                  </View>
                ))}
              </View>
            );
          })()}

          {/* ── B Vitamins ── */}
          {(() => {
            const b6     = computeExtended('vitaminB6',  'Vitamin B6');
            const folate = computeExtended('folate',     'Folate');
            const b12    = computeExtended('vitaminB12', 'Vitamin B12');
            const biotin = computeExtended('biotin',     'Biotin');
            const rows = [
              { label: 'Vitamin B6', val: b6,     unit: 'mg'  },
              { label: 'Folate',     val: folate,  unit: 'mcg' },
              { label: 'Vitamin B12', val: b12,   unit: 'mcg' },
              { label: 'Biotin',     val: biotin,  unit: 'mcg' },
            ].filter(r => r.val !== null && r.val !== 0);
            if (rows.length === 0) return null;
            return (
              <View style={{ marginTop: 4 }}>
                <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setBVitaminsOpen(o => !o); }} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: theme.borderSubtle }}>
                  <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: 'DMSans_700Bold', letterSpacing: 2, textTransform: 'uppercase' }}>B Vitamins</Text>
                  <Ionicons name={bVitaminsOpen ? 'chevron-up' : 'chevron-down'} size={13} color={theme.textDim} />
                </TouchableOpacity>
                {bVitaminsOpen && rows.map(r => (
                  <View key={r.label} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderTopWidth: 0.5, borderTopColor: theme.borderSubtle }}>
                    <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'DMSans_400Regular' }}>{r.label}</Text>
                    <Text style={{ fontSize: 12, color: theme.textSecondary, fontFamily: 'DMSans_500Medium' }}>{r.val}{r.unit}</Text>
                  </View>
                ))}
              </View>
            );
          })()}

          {/* ── Minerals ── */}
          {(() => {
            const calcium   = computeExtended('calcium',   'Calcium, Ca');
            const iron      = computeExtended('iron',      'Iron, Fe');
            const magnesium = computeExtended('magnesium', 'Magnesium, Mg');
            const zinc      = computeExtended('zinc',      'Zinc, Zn');
            const copper    = computeExtended('copper',    'Copper, Cu');
            const rows = [
              { label: 'Calcium',   val: calcium,   unit: 'mg' },
              { label: 'Iron',      val: iron,      unit: 'mg' },
              { label: 'Magnesium', val: magnesium, unit: 'mg' },
              { label: 'Zinc',      val: zinc,      unit: 'mg' },
              { label: 'Copper',    val: copper,    unit: 'mg' },
            ].filter(r => r.val !== null && r.val !== 0);
            if (rows.length === 0) return null;
            return (
              <View style={{ marginTop: 4 }}>
                <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setMineralsOpen(o => !o); }} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: theme.borderSubtle }}>
                  <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: 'DMSans_700Bold', letterSpacing: 2, textTransform: 'uppercase' }}>Minerals</Text>
                  <Ionicons name={mineralsOpen ? 'chevron-up' : 'chevron-down'} size={13} color={theme.textDim} />
                </TouchableOpacity>
                {mineralsOpen && rows.map(r => (
                  <View key={r.label} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderTopWidth: 0.5, borderTopColor: theme.borderSubtle }}>
                    <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'DMSans_400Regular' }}>{r.label}</Text>
                    <Text style={{ fontSize: 12, color: theme.textSecondary, fontFamily: 'DMSans_500Medium' }}>{r.val}{r.unit}</Text>
                  </View>
                ))}
              </View>
            );
          })()}
        </View>

        {foodStats && foodStats.count > 0 && (
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16, marginTop: -4 }}>
            <View style={{ flex: 1, backgroundColor: theme.bgCard, borderRadius: 8, borderWidth: 0.5, borderColor: theme.borderCard, borderTopWidth: 1.5, borderTopColor: theme.accentBlueRaw, padding: 10 }}>
              <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: 'DMSans_700Bold', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2 }}>LOGGED</Text>
              <Text style={{ fontSize: 18, color: theme.textSecondary, fontFamily: 'BebasNeue_400Regular' }}>{foodStats.count}x</Text>
            </View>
            <View style={{ flex: 1.8, backgroundColor: theme.bgCard, borderRadius: 8, borderWidth: 0.5, borderColor: theme.borderCard, borderTopWidth: 1.5, borderTopColor: theme.accentBlueRaw, padding: 10 }}>
              <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: 'DMSans_700Bold', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2 }}>LAST LOGGED</Text>
              <Text style={{ fontSize: 18, color: theme.textSecondary, fontFamily: 'BebasNeue_400Regular' }}>
                {foodStats.lastDate ? new Date(foodStats.lastDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '--'}
              </Text>
            </View>
            <View style={{ flex: 1.8, backgroundColor: theme.bgCard, borderRadius: 8, borderWidth: 0.5, borderColor: theme.borderCard, borderTopWidth: 1.5, borderTopColor: theme.accentBlueRaw, padding: 10 }}>
              <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: 'DMSans_700Bold', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2 }}>AVG SERVING</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <Text style={{ fontSize: 18, color: theme.textSecondary, fontFamily: 'BebasNeue_400Regular' }}>
                  {foodStats.avgGrams > 0 ? Math.round(foodStats.avgGrams) : '--'}
                </Text>
                {foodStats.avgGrams > 0 && <Text style={{ fontSize: 12, color: theme.textSecondary, fontFamily: 'DMSans_500Medium', marginLeft: 1 }}>{effectiveServing?.unit || food?.servingUnitType || 'g'}</Text>}
              </View>
            </View>
          </View>
        )}

        {calPer100g === 0 && (
          <Text style={styles.noDataText}>No detailed nutrition data. Calories will be logged as entered.</Text>
        )}
{/* Timestamp */}
        <TouchableOpacity style={styles.mealSelector} onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); timePickerAnim.setValue(0); setShowTimePicker(true); }}>
          <Text style={styles.mealSelectorLabel}>Time logged</Text>
          <Text style={styles.mealSelectorValue}>
            {isEditing && date && (() => {
              const today = new Date();
              const todayKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
              if (date !== todayKey) {
                const d = new Date(date + 'T12:00:00');
                const datePart = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                return `${datePart} · `;
              }
              return '';
            })()}{entryTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ▼
          </Text>
        </TouchableOpacity>

        <Modal
          visible={showTimePicker}
          transparent
          animationType="none"
          onShow={() => Animated.timing(timePickerAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start()}
          onRequestClose={closeTimePicker}>
          <Animated.View style={[styles.modalOverlay, { opacity: timePickerAnim }]}>
            <TouchableOpacity style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} activeOpacity={1} onPress={closeTimePicker} />
            <View style={styles.modal} pointerEvents="box-none">
              <View style={{ width: 36, height: 4, backgroundColor: theme.borderCard, borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />
              <Text style={styles.modalTitle}>Time logged</Text>
              <View style={{ alignItems: 'center' }}>
                <DateTimePicker
                  mode="time"
                  value={entryTime}
                  display="spinner"
                  textColor={theme.textPrimary}
                  style={{ width: Dimensions.get('window').width - 48 }}
                  onChange={(event, date) => {
                    if (date) { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setEntryTime(date); setHasChanges(true); }
                  }}
                />
              </View>
              <TouchableOpacity style={{ padding: 16, alignItems: 'center', marginTop: 4 }} onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); closeTimePicker(); }}>
                <Text style={{ fontSize: 15, color: theme.accentGreen, fontFamily: 'DMSans_600SemiBold' }}>Confirm</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ paddingBottom: 8, paddingTop: 4, alignItems: 'center' }} onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); closeTimePicker(); }}>
                <Text style={{ fontSize: 15, color: theme.textMuted, fontFamily: 'DMSans_500Medium' }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Modal>

       {/* Meal selector -- opens floating modal */}
<TouchableOpacity
  ref={mealSelectorRef as any}
  style={styles.mealSelector}
  onPress={() => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    mealDropdownAnim.setValue(0);
    setShowMealPicker(true);
  }}>
  <Text style={styles.mealSelectorLabel}>Adding to</Text>
  <Text style={styles.mealSelectorValue}>{getMealDisplayName(currentMeal, mealSlots, slotNameCache)} ▼</Text>
</TouchableOpacity>

<Modal
  visible={showMealPicker}
  transparent
  animationType="none"
  onShow={() => Animated.timing(mealDropdownAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start()}
  onRequestClose={closeMealPicker}>
  <Animated.View style={[styles.modalOverlay, { opacity: mealDropdownAnim }]}>
    <TouchableOpacity style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} activeOpacity={1} onPress={closeMealPicker} />
    <View style={styles.modal} pointerEvents="box-none">
      <View style={{ width: 36, height: 4, backgroundColor: theme.borderCard, borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />
      <Text style={styles.modalTitle}>Adding to</Text>
      {mealSlots.map((slot) => (
        <TouchableOpacity
          key={slot.id}
          style={[styles.mealOption, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
          onPress={() => {
            triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
            setCurrentMeal(slot.id);
            setHasChanges(true);
            closeMealPicker();
          }}>
          <Text style={[styles.mealOptionText, (currentMeal === slot.id || currentMeal === slot.name) && { color: theme.accentBlue, fontFamily: 'DMSans_600SemiBold' }]}>{slot.name}</Text>
          {(currentMeal === slot.id || currentMeal === slot.name) && <Ionicons name="checkmark" size={16} color={theme.accentBlue} />}
        </TouchableOpacity>
      ))}
      <TouchableOpacity style={{ padding: 16, alignItems: 'center', marginTop: 4 }} onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); closeMealPicker(); }}>
        <Text style={{ fontSize: 15, color: theme.textMuted, fontFamily: 'DMSans_500Medium' }}>Cancel</Text>
      </TouchableOpacity>
    </View>
  </Animated.View>
</Modal>

<TouchableOpacity
  ref={saveButtonRef as any}
  style={[styles.logBtn, isEditing && !hasChanges && { opacity: 0.4 }]}
  onPress={saveEntry}
  disabled={isEditing && !hasChanges}>
  <Text style={styles.logBtnText}>
    {isRecipeMode ? 'ADD TO RECIPE' : isEditing ? `UPDATE ENTRY` : `ADD TO DIARY`}
  </Text>
</TouchableOpacity>

{isEditing && (
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => {
              triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
              Alert.alert(
                'Remove Entry',
                'Remove this entry from your log?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Remove', style: 'destructive', onPress: async () => {
                    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
                    try {
                      const saved = await AsyncStorage.getItem(`pj_${date}`);
                      const current = saved ? JSON.parse(saved) : {};
                      const entries = (current.entries || []).filter((_: any, i: number) => i !== parseInt(entryIndex));
                      await storageSet(`pj_${date}`, JSON.stringify({ ...current, entries }));
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
          style={{ alignItems: 'center', marginTop: 20, marginBottom: 8, opacity: 0.65, alignSelf: 'center' }}>
          <Image
            source={{ uri: 'https://platform.fatsecret.com/api/static/images/powered_by_fatsecret_horizontal_brand.png' }}
            style={{ width: 160, height: 38 }}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </ScrollView>

      {/* Ellipsis dropdown */}
      <Modal visible={showEllipsisMenu} transparent animationType="none">
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setShowEllipsisMenu(false)}>
          <Animated.View style={{
            position: 'absolute',
            top: menuPos.top,
            right: menuPos.right,
            backgroundColor: theme.bgSheet,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: theme.borderCard,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.22,
            shadowRadius: 10,
            elevation: 8,
            minWidth: 160,
            overflow: 'hidden',
            opacity: menuAnim,
            transform: [{ translateY: menuAnim.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }],
          }}>
            <TouchableOpacity
              onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setShowEllipsisMenu(false); setTimeout(() => setShowSaveAsCopy(true), 50); }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14 }}>
              <Ionicons name="copy-outline" size={17} color={theme.accentBlue} />
              <Text style={{ fontSize: 15, color: theme.textPrimary, fontFamily: 'DMSans_500Medium' }}>Save as Copy</Text>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* Save as Copy */}
      <CustomFoodCreator
        visible={showSaveAsCopy}
        onClose={() => setShowSaveAsCopy(false)}
        onSaved={() => { setShowSaveAsCopy(false); showToast('Saved to My Foods', food.description, 'success'); }}
        title="Clone Food"
        prefill={{
          name: food.brand ? food.description : (food.description?.split(' · ')[0] ?? food.description),
          brand: food.brand || food.description?.split(' · ')[1] || '',
          calories: selectedServing?.calories ?? defaultFsServing?.calories,
          protein: selectedServing?.protein ?? defaultFsServing?.protein,
          carbs: selectedServing?.carbs ?? defaultFsServing?.carbs,
          fat: selectedServing?.fat ?? defaultFsServing?.fat,
          fiber: selectedServing?.fiber ?? defaultFsServing?.fiber,
          sugar: selectedServing?.sugar ?? defaultFsServing?.sugar,
          sodium: selectedServing?.sodium ?? defaultFsServing?.sodium,
          cholesterol: selectedServing?.cholesterol ?? defaultFsServing?.cholesterol,
          saturatedFat: selectedServing?.saturatedFat ?? defaultFsServing?.saturatedFat,
          polyunsaturatedFat: selectedServing?.polyunsaturatedFat ?? defaultFsServing?.polyunsaturatedFat,
          monounsaturatedFat: selectedServing?.monounsaturatedFat ?? defaultFsServing?.monounsaturatedFat,
          potassium: selectedServing?.potassium ?? defaultFsServing?.potassium,
          vitaminA: selectedServing?.vitaminA ?? defaultFsServing?.vitaminA,
          vitaminC: selectedServing?.vitaminC ?? defaultFsServing?.vitaminC,
          calcium: selectedServing?.calcium ?? defaultFsServing?.calcium,
          iron: selectedServing?.iron ?? defaultFsServing?.iron,
          sugarAlcohols: selectedServing?.sugarAlcohols ?? defaultFsServing?.sugarAlcohols,
          servingGrams: selectedServing?.grams ?? defaultFsServing?.grams,
          servingLabel: selectedServing?.label ?? defaultFsServing?.label,
          servingUnitType: selectedServing?.unit ?? defaultFsServing?.unit ?? 'g',
        }}
      />

      {/* Serving Picker Modal -- fade in/out, no slide */}
      <Modal visible={showServingPicker} transparent animationType="none" onShow={() => {
        servingPickerAnim.setValue(0);
        Animated.timing(servingPickerAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      }}>
        <Animated.View style={[styles.modalOverlay, { opacity: servingPickerAnim }]}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => {
            Animated.timing(servingPickerAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => setShowServingPicker(false));
          }} />
          <Animated.View style={[styles.modal, { transform: [{ translateY: servingPickerAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
            <Text style={styles.modalTitle}>Select Serving Size</Text>
            {allServings.map((s: any, i: number) => (
              <TouchableOpacity
                key={i}
                style={[styles.mealOption, selectedServing?.label === s.label && styles.mealOptionActive]}
                onPress={() => {
                  triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedServing(s);
                  setAmount(s.grams > 0 ? s.grams.toString() : '100');
                  setAmountChanged(true);
                  setServingCount(1);
                  Animated.timing(servingPickerAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => setShowServingPicker(false));
                }}>
                <Text style={[styles.mealOptionText, selectedServing?.label === s.label && { color: theme.accentBlue }]}>{s.label}</Text>
                <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'DMSans_400Regular' }}>{s.calories} kcal</Text>
              </TouchableOpacity>
            ))}
          </Animated.View>
        </Animated.View>
      </Modal>

      {/* Edit My Food Modal */}
      <Modal visible={showEditFoodModal} transparent animationType="none">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', opacity: editOverlayAnim }}>
            <TouchableOpacity style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} activeOpacity={1} onPress={closeEditFoodModal} />
            <Animated.View style={{
              width: '92%',
              backgroundColor: theme.bgSheet,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: theme.borderCard,
              borderTopWidth: 1.5,
              borderTopColor: theme.accentBlueRaw,
              shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16,
              transform: [{ scale: editCardAnim.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] }) }],
            }}>
              <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); closeEditFoodModal(); }} style={{ alignSelf: 'center', paddingTop: 12, paddingBottom: 4, paddingHorizontal: 20 }} hitSlop={{ top: 8, bottom: 8, left: 20, right: 20 }}>
                <View style={{ height: 4, width: 40, backgroundColor: theme.borderCard, borderRadius: 2 }} />
              </TouchableOpacity>
              <Text style={{ fontSize: 16, color: theme.accentBlueRaw, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2, textAlign: 'center', marginTop: 8, marginBottom: 4 }}>EDIT FOOD</Text>
              <ScrollView style={{ maxHeight: 580 }} contentContainerStyle={{ padding: 16, paddingTop: 8 }} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets={true}>
                {/* Type selector */}
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                  <TouchableOpacity
                    onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setEditFoodData((p: any) => p ? { ...p, type: 'food' } : null); }}
                    style={{ flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, backgroundColor: editFoodData?.type !== 'supplement' ? theme.accentBlueBg : theme.bgInput, borderColor: editFoodData?.type !== 'supplement' ? theme.accentBlueBorder : theme.borderInput }}
                  >
                    <Ionicons name="nutrition" size={16} color={editFoodData?.type !== 'supplement' ? theme.accentBlue : theme.textMuted} />
                    <Text style={{ fontSize: 12, fontFamily: 'DMSans_600SemiBold', marginTop: 3, color: editFoodData?.type !== 'supplement' ? theme.accentBlue : theme.textMuted }}>Food</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setEditFoodData((p: any) => p ? { ...p, type: 'supplement' } : null); }}
                    style={{ flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, backgroundColor: editFoodData?.type === 'supplement' ? theme.accentBlueBg : theme.bgInput, borderColor: editFoodData?.type === 'supplement' ? theme.accentBlueBorder : theme.borderInput }}
                  >
                    <Ionicons name="medical" size={16} color={editFoodData?.type === 'supplement' ? theme.accentBlue : theme.textMuted} />
                    <Text style={{ fontSize: 12, fontFamily: 'DMSans_600SemiBold', marginTop: 3, color: editFoodData?.type === 'supplement' ? theme.accentBlue : theme.textMuted }}>Supplement</Text>
                  </TouchableOpacity>
                </View>
                {/* Basic Info */}
                <Text style={{ fontSize: 9, color: theme.textSecondary, fontFamily: 'DMSans_700Bold', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 10 }}>Basic Info</Text>
                {([
                  { label: 'Food Name', key: 'name', keyboard: 'default' as const },
                  { label: 'Brand (optional)', key: 'brand', keyboard: 'default' as const },
                  { label: 'Calories (kcal)', key: 'cal', keyboard: 'decimal-pad' as const },
                ] as { label: string; key: string; keyboard: 'default' | 'decimal-pad' }[]).map(f => (
                  <View key={f.key} style={{ marginBottom: 10 }}>
                    <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: 'DMSans_700Bold', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 4 }}>{f.label}</Text>
                    <TextInput
                      style={{ backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, color: theme.textPrimary, padding: 12, fontSize: 15, fontFamily: 'DMSans_400Regular' }}
                      value={editFoodData?.[f.key] || ''}
                      onChangeText={v => setEditFoodData((p: any) => p ? { ...p, [f.key]: f.keyboard === 'decimal-pad' ? filterDecimal(v) : v } : null)}
                      keyboardType={f.keyboard}
                      placeholderTextColor={theme.textDim}
                      selectTextOnFocus
                    />
                  </View>
                ))}
                {/* Macronutrients -- 3 column */}
                <View style={{ height: 1, backgroundColor: theme.borderCard, marginTop: 4, marginBottom: 14 }} />
                <Text style={{ fontSize: 9, color: theme.textSecondary, fontFamily: 'DMSans_700Bold', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 10 }}>Macronutrients</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                  {([
                    { label: 'PROTEIN (g)', key: 'protein', dot: '#0d9268' },
                    { label: 'CARBS (g)', key: 'carbs', dot: '#c47d1a' },
                    { label: 'FAT (g)', key: 'fat', dot: '#a83232' },
                  ] as { label: string; key: string; dot: string }[]).map(f => (
                    <View key={f.key} style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: f.dot, marginRight: 4 }} />
                        <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: 'DMSans_700Bold', letterSpacing: 2 }}>{f.label}</Text>
                      </View>
                      <TextInput
                        style={{ backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, color: theme.textPrimary, paddingVertical: 10, paddingHorizontal: 8, fontSize: 14, fontFamily: 'DMSans_400Regular', textAlign: 'center' }}
                        value={editFoodData?.[f.key] || ''}
                        onChangeText={v => setEditFoodData((p: any) => p ? { ...p, [f.key]: filterDecimal(v) } : null)}
                        keyboardType="decimal-pad"
                        placeholderTextColor={theme.textDim}
                        selectTextOnFocus
                      />
                    </View>
                  ))}
                </View>
                {/* Extended Nutrition -- 2 column pairs */}
                <View style={{ height: 1, backgroundColor: theme.borderCard, marginTop: 4, marginBottom: 14 }} />
                <Text style={{ fontSize: 9, color: theme.textSecondary, fontFamily: 'DMSans_700Bold', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 10 }}>Extended Nutrition</Text>
                {[
                  [{ label: 'FIBER (g)',           key: 'fiber' },             { label: 'SUGAR (g)',          key: 'sugar' }],
                  [{ label: 'SUGAR ALCOHOLS (g)',   key: 'sugarAlcohols' },     { label: 'SODIUM (mg)',        key: 'sodium' }],
                  [{ label: 'CHOLESTEROL (mg)',     key: 'cholesterol' },       { label: 'POTASSIUM (mg)',     key: 'potassium' }],
                  [{ label: 'SATURATED FAT (g)',    key: 'saturatedFat' },      { label: 'POLY FAT (g)',       key: 'polyunsaturatedFat' }],
                  [{ label: 'MONO FAT (g)',         key: 'monounsaturatedFat' }, { label: 'CALCIUM (mg)',       key: 'calcium' }],
                  [{ label: 'IRON (mg)',            key: 'iron' },              { label: 'ADDED SUGARS (g)',   key: 'addedSugars' }],
                  [{ label: 'TRANS FAT (g)',        key: 'transFat' },          null],
                ].map((row, ri) => (
                  <View key={ri} style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                    {row.map((f, fi) => f ? (
                      <View key={f.key} style={{ flex: 1 }}>
                        <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: 'DMSans_700Bold', letterSpacing: 2, marginBottom: 4 }}>{f.label}</Text>
                        <TextInput
                          style={{ backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, color: theme.textPrimary, paddingVertical: 10, paddingHorizontal: 8, fontSize: 14, fontFamily: 'DMSans_400Regular' }}
                          value={editFoodData?.[f.key] || ''}
                          onChangeText={v => setEditFoodData((p: any) => p ? { ...p, [f.key]: filterDecimal(v) } : null)}
                          keyboardType="decimal-pad"
                          placeholder="--"
                          placeholderTextColor={theme.textDim}
                          selectTextOnFocus
                        />
                      </View>
                    ) : <View key={fi} style={{ flex: 1 }} />)}
                  </View>
                ))}
                {/* Vitamins D/E/K + B Vitamins + Minerals + Other */}
                <View style={{ height: 1, backgroundColor: theme.borderCard, marginTop: 4, marginBottom: 14 }} />
                <Text style={{ fontSize: 9, color: theme.textSecondary, fontFamily: 'DMSans_700Bold', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 10 }}>Vitamins</Text>
                {[
                  [{ label: 'VITAMIN A (mcg)', key: 'vitaminA' }, { label: 'VITAMIN C (mg)', key: 'vitaminC' }],
                  [{ label: 'VITAMIN D (mcg)', key: 'vitaminD' }, { label: 'VITAMIN E (mg)', key: 'vitaminE' }],
                  [{ label: 'VITAMIN K (mcg)', key: 'vitaminK' }, null],
                ].map((row, ri) => (
                  <View key={ri} style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                    {row.map((f, fi) => f ? (
                      <View key={f.key} style={{ flex: 1 }}>
                        <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: 'DMSans_700Bold', letterSpacing: 2, marginBottom: 4 }}>{f.label}</Text>
                        <TextInput
                          style={{ backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, color: theme.textPrimary, paddingVertical: 10, paddingHorizontal: 8, fontSize: 14, fontFamily: 'DMSans_400Regular' }}
                          value={editFoodData?.[f.key] || ''}
                          onChangeText={v => setEditFoodData((p: any) => p ? { ...p, [f.key]: filterDecimal(v) } : null)}
                          keyboardType="decimal-pad"
                          placeholder="--"
                          placeholderTextColor={theme.textDim}
                          selectTextOnFocus
                        />
                      </View>
                    ) : <View key={fi} style={{ flex: 1 }} />)}
                  </View>
                ))}
                <View style={{ height: 1, backgroundColor: theme.borderCard, marginTop: 4, marginBottom: 14 }} />
                <Text style={{ fontSize: 9, color: theme.textSecondary, fontFamily: 'DMSans_700Bold', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 10 }}>B Vitamins</Text>
                {[
                  [{ label: 'B6 (mg)', key: 'vitaminB6' }, { label: 'FOLATE (mcg)', key: 'folate' }],
                  [{ label: 'B12 (mcg)', key: 'vitaminB12' }, { label: 'BIOTIN (mcg)', key: 'biotin' }],
                ].map((row, ri) => (
                  <View key={ri} style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                    {row.map((f, fi) => f ? (
                      <View key={f.key} style={{ flex: 1 }}>
                        <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: 'DMSans_700Bold', letterSpacing: 2, marginBottom: 4 }}>{f.label}</Text>
                        <TextInput
                          style={{ backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, color: theme.textPrimary, paddingVertical: 10, paddingHorizontal: 8, fontSize: 14, fontFamily: 'DMSans_400Regular' }}
                          value={editFoodData?.[f.key] || ''}
                          onChangeText={v => setEditFoodData((p: any) => p ? { ...p, [f.key]: filterDecimal(v) } : null)}
                          keyboardType="decimal-pad"
                          placeholder="--"
                          placeholderTextColor={theme.textDim}
                          selectTextOnFocus
                        />
                      </View>
                    ) : <View key={fi} style={{ flex: 1 }} />)}
                  </View>
                ))}
                <View style={{ height: 1, backgroundColor: theme.borderCard, marginTop: 4, marginBottom: 14 }} />
                <Text style={{ fontSize: 9, color: theme.textSecondary, fontFamily: 'DMSans_700Bold', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 10 }}>Minerals</Text>
                {[
                  [{ label: 'MAGNESIUM (mg)', key: 'magnesium' }, { label: 'ZINC (mg)', key: 'zinc' }],
                  [{ label: 'COPPER (mg)', key: 'copper' }, null],
                ].map((row, ri) => (
                  <View key={ri} style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                    {row.map((f, fi) => f ? (
                      <View key={f.key} style={{ flex: 1 }}>
                        <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: 'DMSans_700Bold', letterSpacing: 2, marginBottom: 4 }}>{f.label}</Text>
                        <TextInput
                          style={{ backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, color: theme.textPrimary, paddingVertical: 10, paddingHorizontal: 8, fontSize: 14, fontFamily: 'DMSans_400Regular' }}
                          value={editFoodData?.[f.key] || ''}
                          onChangeText={v => setEditFoodData((p: any) => p ? { ...p, [f.key]: filterDecimal(v) } : null)}
                          keyboardType="decimal-pad"
                          placeholder="--"
                          placeholderTextColor={theme.textDim}
                          selectTextOnFocus
                        />
                      </View>
                    ) : <View key={fi} style={{ flex: 1 }} />)}
                  </View>
                ))}
                <View style={{ height: 1, backgroundColor: theme.borderCard, marginTop: 4, marginBottom: 14 }} />
                <Text style={{ fontSize: 9, color: theme.textSecondary, fontFamily: 'DMSans_700Bold', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 10 }}>Other</Text>
                {[
                  [{ label: 'CAFFEINE (mg)', key: 'caffeine' }, null],
                ].map((row, ri) => (
                  <View key={ri} style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                    {row.map((f, fi) => f ? (
                      <View key={f.key} style={{ flex: 1 }}>
                        <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: 'DMSans_700Bold', letterSpacing: 2, marginBottom: 4 }}>{f.label}</Text>
                        <TextInput
                          style={{ backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, color: theme.textPrimary, paddingVertical: 10, paddingHorizontal: 8, fontSize: 14, fontFamily: 'DMSans_400Regular' }}
                          value={editFoodData?.[f.key] || ''}
                          onChangeText={v => setEditFoodData((p: any) => p ? { ...p, [f.key]: filterDecimal(v) } : null)}
                          keyboardType="decimal-pad"
                          placeholder="--"
                          placeholderTextColor={theme.textDim}
                          selectTextOnFocus
                        />
                      </View>
                    ) : <View key={fi} style={{ flex: 1 }} />)}
                  </View>
                ))}
                {/* Serving */}
                <View style={{ height: 1, backgroundColor: theme.borderCard, marginTop: 4, marginBottom: 14 }} />
                <Text style={{ fontSize: 9, color: theme.textSecondary, fontFamily: 'DMSans_700Bold', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 10 }}>Serving</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: 'DMSans_700Bold', letterSpacing: 2, marginBottom: 4 }}>AMOUNT ({editFoodData?.servingUnitType || 'g'})</Text>
                    <TextInput
                      style={{ backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, color: theme.textPrimary, paddingVertical: 10, paddingHorizontal: 8, fontSize: 14, fontFamily: 'DMSans_400Regular' }}
                      value={editFoodData?.servingGrams || ''}
                      onChangeText={v => setEditFoodData((p: any) => p ? { ...p, servingGrams: filterDecimal(v) } : null)}
                      keyboardType="decimal-pad"
                      placeholderTextColor={theme.textDim}
                      selectTextOnFocus
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: 'DMSans_700Bold', letterSpacing: 2, marginBottom: 4 }}>LABEL (OPTIONAL)</Text>
                    <TextInput
                      style={{ backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, color: theme.textPrimary, paddingVertical: 10, paddingHorizontal: 8, fontSize: 14, fontFamily: 'DMSans_400Regular' }}
                      value={editFoodData?.servingLabel || ''}
                      onChangeText={v => setEditFoodData((p: any) => p ? { ...p, servingLabel: v } : null)}
                      placeholderTextColor={theme.textDim}
                    />
                  </View>
                </View>
                <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: 'DMSans_700Bold', letterSpacing: 2, marginBottom: 8 }}>UNIT</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingRight: 4, marginBottom: 10 }}>
                  {['g', 'ml', 'fl oz', 'oz', 'container', 'serving', 'tbsp', 'tsp', 'cup'].map(u => (
                    <TouchableOpacity
                      key={u}
                      onPress={() => setEditFoodData((p: any) => p ? { ...p, servingUnitType: u } : null)}
                      style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, borderWidth: 1, backgroundColor: editFoodData?.servingUnitType === u ? theme.accentBlueBg : 'transparent', borderColor: editFoodData?.servingUnitType === u ? theme.accentBlueBorder : theme.borderInput }}>
                      <Text style={{ fontSize: 12, fontFamily: 'DMSans_600SemiBold', color: editFoodData?.servingUnitType === u ? theme.accentBlue : theme.textMuted }}>{u}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                {/* Additional Servings */}
                <View style={{ height: 1, backgroundColor: theme.borderCard, marginTop: 4, marginBottom: 14 }} />
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <Text style={{ fontSize: 9, color: theme.textSecondary, fontFamily: 'DMSans_700Bold', letterSpacing: 3, textTransform: 'uppercase' }}>Additional Servings</Text>
                  <TouchableOpacity
                    onPress={() => setEditFoodData((p: any) => p ? { ...p, additionalServings: [...(p.additionalServings || []), { id: `as_${Date.now()}`, label: '', grams: '' }] } : null)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 }}>
                    <Ionicons name="add" size={12} color={theme.accentBlue} />
                    <Text style={{ fontSize: 11, color: theme.accentBlue, fontFamily: 'DMSans_600SemiBold' }}>Add</Text>
                  </TouchableOpacity>
                </View>
                {(editFoodData?.additionalServings || []).map((s: any, i: number) => (
                  <View key={s.id} style={{ flexDirection: 'row', gap: 6, marginBottom: 8, alignItems: 'center' }}>
                    <TextInput
                      style={{ flex: 1.4, backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, color: theme.textPrimary, paddingVertical: 8, paddingHorizontal: 10, fontSize: 13, fontFamily: 'DMSans_400Regular' }}
                      placeholder="Label (e.g. 1 link)"
                      placeholderTextColor={theme.textDim}
                      value={s.label}
                      onChangeText={v => setEditFoodData((p: any) => {
                        if (!p) return null;
                        const updated = [...(p.additionalServings || [])];
                        updated[i] = { ...updated[i], label: v };
                        return { ...p, additionalServings: updated };
                      })}
                    />
                    <TextInput
                      style={{ flex: 0.8, backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, color: theme.textPrimary, paddingVertical: 8, paddingHorizontal: 10, fontSize: 13, fontFamily: 'DMSans_400Regular' }}
                      placeholder="g"
                      placeholderTextColor={theme.textDim}
                      keyboardType="decimal-pad"
                      value={s.grams}
                      onChangeText={v => setEditFoodData((p: any) => {
                        if (!p) return null;
                        const updated = [...(p.additionalServings || [])];
                        updated[i] = { ...updated[i], grams: filterDecimal(v) };
                        return { ...p, additionalServings: updated };
                      })}
                    />
                    <TouchableOpacity
                      onPress={() => setEditFoodData((p: any) => p ? { ...p, additionalServings: (p.additionalServings || []).filter((_: any, j: number) => j !== i) } : null)}
                      style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="close-circle" size={18} color={theme.textDim} />
                    </TouchableOpacity>
                  </View>
                ))}
                {(editFoodData?.additionalServings || []).length === 0 && (
                  <Text style={{ fontSize: 11, color: theme.textDim, fontFamily: 'DMSans_400Regular', marginBottom: 10 }}>Tap Add to define extra serving sizes (e.g. 1 link, 6 pieces)</Text>
                )}
              </ScrollView>
              <View style={{ flexDirection: 'row', gap: 10, padding: 16, paddingTop: 12 }}>
                <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); closeEditFoodModal(); }} style={{ flex: 1, padding: 12, backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, alignItems: 'center' }}>
                  <Text style={{ color: theme.textMuted, fontFamily: 'DMSans_500Medium', fontSize: 14 }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={saveEditFoodFromDetail}
                  disabled={!editFoodData?.name?.trim() || !editFoodData?.cal}
                  style={{ flex: 2, padding: 12, backgroundColor: theme.accentBlue, borderRadius: 8, alignItems: 'center', opacity: editFoodData?.name?.trim() && editFoodData?.cal ? 1 : 0.4 }}>
                  <Text style={{ color: '#ffffff', fontFamily: 'BebasNeue_400Regular', fontSize: 16, letterSpacing: 1 }}>SAVE</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Photo Full-Screen Modal */}
      <Modal visible={showPhotoFullscreen} transparent animationType="fade">
        <ToastRenderer />
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.96)', justifyContent: 'center', alignItems: 'center' }}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => setShowPhotoFullscreen(false)} />
          {photoUri && (
            <Image
              source={{ uri: photoUri }}
              style={{ width: Dimensions.get('window').width * 0.88, height: Dimensions.get('window').width * 0.88, borderRadius: 16 }}
              resizeMode="cover"
            />
          )}
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
            <TouchableOpacity
              onPress={handlePhotoAdd}
              style={{ paddingHorizontal: 28, paddingVertical: 12, backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder, borderRadius: 10 }}>
              <Text style={{ color: theme.accentBlue, fontSize: 15, fontFamily: 'DMSans_600SemiBold' }}>Replace</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handlePhotoRemove}
              style={{ paddingHorizontal: 28, paddingVertical: 12, backgroundColor: 'rgba(204,51,51,0.15)', borderWidth: 1, borderColor: 'rgba(204,51,51,0.4)', borderRadius: 10 }}>
              <Text style={{ color: '#cc3333', fontSize: 15, fontFamily: 'DMSans_600SemiBold' }}>Remove</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => setShowPhotoFullscreen(false)} style={{ marginTop: 20, padding: 8 }}>
            <Text style={{ color: theme.textMuted, fontSize: 13, fontFamily: 'DMSans_500Medium' }}>Close</Text>
          </TouchableOpacity>
        </View>
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
  foodName: { fontSize: 18, color: theme.textSecondary, fontFamily: 'DMSans_600SemiBold', marginBottom: 20, lineHeight: 24 },
  unitRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  unitBtn: { flex: 1, padding: 10, backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 6, alignItems: 'center' },
  unitBtnActive: { backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder },
  unitBtnText: { fontSize: 14, color: theme.textMuted, fontFamily: 'DMSans_600SemiBold' },
  unitBtnTextActive: { color: theme.accentBlue },
  amountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  amountLabel: { fontSize: 14, color: theme.textMuted, fontFamily: 'DMSans_400Regular' },
  amountInput: { backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, color: theme.textSecondary, padding: 12, fontSize: 24, fontFamily: 'BebasNeue_400Regular', width: 120, textAlign: 'center' },
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