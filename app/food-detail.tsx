import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text, TextInput } from '@/components/AppText';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@/components/AppIcons';
import * as Haptics from 'expo-haptics';
import { triggerHaptic, triggerHapticNotification } from '@/utils/haptics';
import { Camera, CameraView } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActionSheetIOS, Alert, Animated, Dimensions, Image, Linking, Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import Reanimated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import CustomFoodCreator from '../components/CustomFoodCreator';
import CapWallModal from '../components/CapWallModal';
import { GOLD_BASE } from '../components/SupporterFoil';
import { useMembership } from '../MembershipContext';
import { checkCap, capFor, liveItems, type CapState } from '../utils/caps';
import UnitPickerButton from '../components/UnitPickerButton';
import { convertUnit, convertibleUnitsFor, unitGroup, unitLabel } from '../utils/unitConversion';
import { ToastRenderer, useToast } from '../components/Toast';
import GradientNumber from '../components/GradientNumber';
import GradientTitle from '../components/GradientTitle';
import * as FileSystem from 'expo-file-system';
import { Directory, File as FSFile, Paths } from 'expo-file-system/next';
import * as ImagePicker from 'expo-image-picker';
import { resolveFoodPhoto, uploadFoodPhoto, deleteFoodPhotoCloud } from '../utils/foodPhotos';
import { resolveRecipePhoto, uploadRecipePhoto, deleteRecipePhotoCloud, recipePhotoKey } from '../utils/recipePhotos';
import { ACHIEVEMENTS, checkAndUnlock, loadAchievements, checkMomentumAchievements, checkNutritionAchievements, getCelebTier } from '../achievementData';
import { showAchievementToast } from '../components/AchievementToast';
import { showCelebration } from '../components/CelebrationOverlay';
import { app, saveToFirebase } from '../firebaseConfig';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { storageSet } from '../utils/storage';
import { cancelFoodLogNotification } from '../services/notifications';
import { useTheme } from '../theme';
import { DEFAULT_MEAL_SLOTS, MealSlot, loadMealSlots, getMealDisplayName } from '../utils/mealSlots';
import { FLAT_NUTRIENT_KEY, computeDetailNutrient } from '../utils/nutrientScale';
import { useTutorial } from '../context/TutorialContext';
import { useTutorialTarget } from '../hooks/useTutorialTarget';
import { TUTORIAL_CHICKEN_BREAST } from '../data/tutorialFood';
import { Type, PAGE_TITLE } from '../typography';
import EditFoodModal from '../components/EditFoodModal';
import ScreenHeader from '../components/ScreenHeader';
import ButtonShine from '../components/ButtonShine';
import BackgroundLayers from '../components/BackgroundLayers';
import PrimaryCTA from '../components/PrimaryCTA';
import ModalHeader from '../components/ModalHeader';

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
          <Text style={{ color: theme.textDim, fontSize: 10, fontFamily: Type.ui }}>--</Text>
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
        <GradientNumber value={String(Math.round(calories))} color={theme.textSecondary} style={{ fontSize: 20, fontFamily: Type.numHero }} />
        <Text style={{ color: theme.textDim, fontSize: 8, fontFamily: Type.ui, letterSpacing: 1 }}>KCAL</Text>
      </View>
    </View>
  );
}
// FatSecret access via the server-side proxy (functions/src/fatSecretProxy.ts). Signing + the
// consumer key/secret live server-side; the client just names a method + params. Returns the same
// raw FatSecret JSON the direct call used to return, throws on a transport/proxy failure.
async function callFatSecretProxy(method: string, params: Record<string, string>): Promise<any> {
  const callable = httpsCallable(getFunctions(app), 'fatSecretProxy');
  const res = await callable({ method, params });
  const data = (res.data ?? {}) as { ok?: boolean; data?: any; reason?: string; status?: number };
  if (!data.ok) {
    throw new Error(`FatSecret proxy failed (${data.reason ?? 'unknown'}${data.status ? ' ' + data.status : ''})`);
  }
  return data.data;
}

async function fetchFatSecretServings(fsId: string): Promise<any[]> {
  try {
    const data = await callFatSecretProxy('food.get.v4', { food_id: fsId });
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
    const data = await callFatSecretProxy('foods.search', { search_expression: name, max_results: '5' });
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
  const paramFood = tutorialFood === 'chicken_breast' ? buildTutorialChickenFood() : (foodJson ? JSON.parse(foodJson) : null);
  // The route param is a snapshot taken when this screen opened. Editing the food definition used to
  // force a bounce back off the screen because there was no way to show the new numbers; now a save
  // swaps in the record that was just written so the user can stay put. Only ever set for a real My
  // Food save -- every other route (FatSecret result, AI estimate, recipe, tutorial) keeps the param.
  const [refreshedFood, setRefreshedFood] = useState<any>(null);
  const food = refreshedFood ?? paramFood;
  const foodId: string | null = food?.myFoodData?.id || (food as any)?.myFoodId || food?.fsId || null;
  // A logged recipe has no food id, so the photo slot never rendered for one at all. Recipe photos are
  // their own store (utils/recipePhotos.ts, keyed by recipe id) but the API is the same shape, so the
  // slot behaves EXACTLY as it does for a food: tap empty to add, tap filled to view, long-press to
  // remove. photoTargetId is whichever id this entry actually has.
  const recipeId: string | null = (food as any)?.recipeId || null;
  const isRecipePhoto = !foodId && !!recipeId;
  const photoTargetId: string | null = foodId || recipeId;
  const fsServings: any[] = food?.fsServings || [];
  // FatSecret's serving list when it had to be fetched on this screen rather than arriving with the
  // food. Declared up here (not with the other state below) so the default-serving math further down
  // can see it: the Edit Entry route never pre-fetches servings, so that math had no list to call
  // "the default" and fell through to whatever serving happened to be selected.
  const [fetchedServings, setFetchedServings] = useState<any[]>([]);
  const isEditRouteEarly = entryIndex !== undefined && entryIndex !== '';
  // Opening a LOGGED entry, the Log tab hands over about forty loose fields but not the food record
  // itself -- so this screen never knew a custom food was custom, built no serving list for it, and
  // invented a single fake serving instead. That fake serving borrowed the food's name ("3 oz.", "1
  // bun") and the weight of whatever serving was actually picked, producing labels like "1 bun · 28.3 g"
  // for a 43 g bun. It also meant a logged entry's serving dropdown offered only that invention, so you
  // could not switch a logged entry to another of its servings.
  // Resolved here rather than passed through the route: the Log tab has no access to My Foods, and this
  // screen was already looking the record up for the Edit Food modal (see the 2026-07-15 note below).
  const [resolvedMyFood, setResolvedMyFood] = useState<any>(null);
  const [myFoodLookupDone, setMyFoodLookupDone] = useState(false);
  const effectiveMyFood = food?.myFoodData ?? resolvedMyFood;
  const myFoodAdditionalServings: Array<{ label: string; grams: number }> = effectiveMyFood?.additionalServings || [];
  const baseServingSize = effectiveMyFood?.servingSize || parseFloat(food?.existingAmount || '100') || 100;
  // The size a custom food's own foodNutrients block actually describes: the serving it was CREATED
  // with. Deliberately NOT baseServingSize, which falls back to the logged amount when the My Food
  // record hasn't loaded -- a different number that happens to sit in the same variable. Null when we
  // genuinely don't know, and callers then leave the old behaviour alone rather than guess.
  const nutrientBasisSize: number | null = (() => {
    // NOT effectiveMyFood on the edit route, deliberately. Knowing the food record means we COULD now
    // compute correct nutrients for entries logged before nutrientScale existed -- but their day totals
    // would still read the old way, so the same entry would show two different numbers depending on the
    // screen. Justin's call: old entries stay consistently as they are, everywhere. One clean line.
    if (!isEditRouteEarly && effectiveMyFood?.servingSize > 0) return effectiveMyFood.servingSize;
    // REOPENING a logged entry: myFoodData isn't attached, so the line above finds nothing. But an entry
    // saved with a nutrientScale carries enough to recover the basis -- it ate `existingAmount` and that
    // was `nutrientScale` of the block, so the block describes existingAmount / nutrientScale. For the
    // chicken: 110 g logged at 1.31 of a serving means the block is 84 g. Entries logged before
    // nutrientScale existed return null here and keep the old behaviour.
    const ns = (food as any)?.nutrientScale;
    const logged = parseFloat(food?.existingAmount || '0');
    if (typeof ns === 'number' && isFinite(ns) && ns > 0 && logged > 0) return logged / ns;
    return null;
  })();
  // NOT gated on myFoodAdditionalServings.length > 0 -- a custom food with no EXTRA named serving
  // still has its own base serving (the label/servingUnit + calPer100g it was created with). That
  // gate used to treat "no extra servings" as "no default serving at all", so labelCal/Recent's
  // headline number for these foods fell through all the way to whatever custom gram amount was
  // typed on a given day instead of the food's real default -- e.g. a cottage cheese logged in
  // custom grams showed "1 kcal" instead of its real per-serving calories.
  // A My Food's base serving uses the EXACT numbers the user typed on its label, never a
  // recomputation from calPer100g. That round trip loses a calorie: a 160 kcal / 325 g shake stores
  // 49 kcal per 100 g (rounded at creation), and 49 x 325 / 100 rounds back to 159. The label said
  // 160, so every screen must say 160. Only trusted when the base serving IS this record's serving,
  // so the numbers can never describe a size they don't belong to.
  const exactLabel = (effectiveMyFood && (effectiveMyFood.servingSize ?? baseServingSize) === baseServingSize)
    ? effectiveMyFood
    : null;
  // `food.isCustom` never arrives on the edit route -- the entry knows it came from a My Food, but not
  // that the food is one of yours. Resolving the record answers that directly.
  const customServings = ((food?.isCustom || !!effectiveMyFood) && (food?.calPer100g ?? 0) > 0)
    ? [
        {
          label: food.servingUnit || `${baseServingSize}${unitLabel(food.servingUnitType || 'g')}`,
          calories: exactLabel?.cal ?? Math.round((food.calPer100g || 0) * baseServingSize / 100),
          protein: exactLabel?.protein ?? Math.round(((food.proteinPer100g || 0) * baseServingSize / 100) * 10) / 10,
          carbs: exactLabel?.carbs ?? Math.round(((food.carbsPer100g || 0) * baseServingSize / 100) * 10) / 10,
          fat: exactLabel?.fat ?? Math.round(((food.fatPer100g || 0) * baseServingSize / 100) * 10) / 10,
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
  // Falls back to the servings fetched on this screen so the Edit Entry route (which arrives with no
  // serving list) still has a real default serving to reason about instead of an empty list.
  const allServings = fsServings.length > 0
    ? fsServings
    : (customServings.length > 0 ? customServings : fetchedServings);
  // ONLY a live FatSecret search result's Energy value is authoritative enough to pick the label
  // serving by matching calories against it, or to build a serving out of. Everywhere else -- Recent,
  // Favorites, Set Foods, an entry opened for editing -- that value is OUR OWN previously stored
  // number, and trusting it was the whole bug: a wrong number picked (or invented) a serving to match
  // itself, then saved itself back, so it re-signed itself on every log and no amount of re-logging
  // could heal it. A "1 kcal" Recent card conjured a 1 kcal serving from nothing; a favourite holding
  // a 2.5-serving dinner made the detail screen read 175 kcal for a 41 g slice of bread. Every other
  // route now resolves the default serving on its own merits.
  const isEditRoute = entryIndex !== undefined && entryIndex !== '';
  const searchResultCal: number | null = (food?.isSearchResult && !isEditRoute)
    ? (food?.foodNutrients?.find((n: any) => n.nutrientName === 'Energy')?.value ?? null)
    : null;
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
  // Barcode link. SET/UNSET is the same vocabulary the barcode results list already teaches, reached
  // from the food itself instead of only from a scan. One barcode maps to one food, and pinning
  // overwrites, so there is no conflict case to handle here.
  const [linkedBarcode, setLinkedBarcode] = useState<string | null>(null);
  const [scanningForLink, setScanningForLink] = useState(false);
  const [showSaveAsCopy, setShowSaveAsCopy] = useState(false);
  // ── Custom-food cap (item C). This screen does not hold the food list, so the count is read on focus.
  // Starts UNLIMITED so the badge can never appear before the real answer arrives.
  const { isSupporter, loading: membershipLoading } = useMembership();
  const [foodCap, setFoodCap] = useState<CapState>({ cap: null, count: 0, unlimited: true, atCap: false, canCreate: true });
  const [foodCapWall, setFoodCapWall] = useState(false);
  const [carbsOpen, setCarbsOpen] = useState(true);
  const [fatsOpen, setFatsOpen] = useState(true);
  const [otherOpen, setOtherOpen] = useState(true);
  const [vitaminsOpen, setVitaminsOpen] = useState(false);
  const [bVitaminsOpen, setBVitaminsOpen] = useState(false);
  const [mineralsOpen, setMineralsOpen] = useState(false);
  const starScale = useRef(new Animated.Value(1)).current;
  const [showServingPicker, setShowServingPicker] = useState(false);
  // AI-estimated meals have no real gram serving, so treat them like serving-only recipes: the
  // stepper counts servings (1 serving = the whole estimate) instead of showing a bogus gram amount.
  const isServingOnly = !!(food as any)?.servingOnly || !!food?.aiEstimated;
  const [selectedServing, setSelectedServing] = useState<any>(virtualDefaultServing);
  // Resolved base serving size for edit mode -- starts from stored servingGrams, falls back to My Foods lookup
  const [resolvedServingGrams, setResolvedServingGrams] = useState<number>(
    // Serving-only recipe entries have no grams; treat "1 serving" as the unit (nominal grams = 1) so
    // the stepper counts servings and the count resolves to the logged servings (existingAmount).
    food?.servingGrams > 0 ? food.servingGrams : (isServingOnly ? 1 : 0)
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
      // NOT rounded, same rule the unit servings already follow: rounding happens once, on screen,
      // never before the maths. When the base serving is 1 g this was catastrophic -- a 110 g / 210 kcal
      // entry became "1 g = 2 kcal" (1.909 rounded up), and touching the stepper multiplied that back
      // out to 220 kcal. The user watched calories climb 10 by nudging the amount up and back down.
      calories: food.existingCal * ratio,
      protein: (food.existingProtein || 0) * ratio,
      carbs: (food.existingCarbs || 0) * ratio,
      fat: (food.existingFat || 0) * ratio,
      grams: baseGrams,
      unit: isServingOnly ? 'serving' : (food.servingUnitType || 'g'),
      label: isServingOnly ? 'serving' : ((food.servingUnit && /\d/.test(food.servingUnit)) ? food.servingUnit : `${baseGrams}${unitLabel(food.servingUnitType || 'g')}`),
      fiber: 0, sugar: 0, sodium: 0, cholesterol: 0, saturatedFat: 0,
      polyunsaturatedFat: 0, monounsaturatedFat: 0, potassium: 0,
      vitaminA: 0, vitaminC: 0, calcium: 0, iron: 0, sugarAlcohols: 0,
      isDefault: true,
    };
  })();
  // `defaultFsServing` in the middle is load-bearing. selectedServing is chosen ONCE, at first render,
  // and on the Edit Entry route for a custom food nothing ever sets it afterwards -- the FatSecret
  // resolver that normally would is skipped for foods that aren't FatSecret's. It used to not matter
  // because the invented serving caught the fall. With that gone, this was null, which meant no
  // per-unit rates, which meant no unit servings, which hid the Serving Size AND Amount rows entirely:
  // a logged entry you could look at but not change. This picks the food's real default the moment the
  // record resolves, and the restore effect then swaps in the serving actually logged.
  const effectiveServing = selectedServing ?? defaultFsServing ?? syntheticServing;

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

  // The food's OWN serving ("15 chips", "3 oz", "1 bar (37g)") is often not in allServings at all --
  // it's built from the food's stored data as syntheticServing when FatSecret's serving list wasn't
  // fetched. The picker was therefore missing the very serving the screen was already using, which
  // made four different branded foods look like the app had no idea what their serving was.
  // Built from the food's OWN serving (syntheticServing), NOT from whatever is currently selected.
  // Using the selection meant that picking "g" replaced "15 chips" in this section with "g" -- the
  // food's real serving vanished from the list the moment you chose anything else.
  const namedServings = (() => {
    const list = allServings.length > 0 ? [...allServings] : [...fetchedServings];
    const own = syntheticServing;
    if (own && own.grams > 0 && !list.some((s: any) => s.label === own.label)) {
      list.unshift(own);
    }
    return list;
  })();

  // A serving's weight, but only when its name doesn't already state it. "1 serving (85 g)" and
  // "100 g" carry their own weight; "1 cup cooked, diced" and "15 chips" don't. Without this the
  // list printed things like "85 g · 85 g".
  const servingWeightSuffix = (s: any): string | null => {
    if (!s || s.isUnit || !(s.grams > 0)) return null;
    const rounded = Math.round(s.grams * 10) / 10;
    const name = String(s.label ?? '');
    if (name.includes(String(rounded)) || name.includes(String(Math.round(s.grams)))) return null;
    return `${rounded} ${unitLabel(s.unit || 'g')}`;
  };

  // ── Plain units as servings ───────────────────────────────────────────────────────────────────
  // "g", "oz", "cup" answer the same question the named servings do: what does ONE of this mean?
  // They used to live in a SECOND dropdown on the Amount row, so the screen asked that question
  // twice, in two different places, with a stepper in between. Built here as ordinary servings so
  // one list can hold both and the Amount row can go away entirely.
  const unitServingBase = effectiveServing?.unit || food?.servingUnitType || 'g';
  const unitServings = (servingRates && !isServingOnly)
    ? convertibleUnitsFor(unitServingBase).map(u => {
        const perOne = convertUnit(1, u, unitServingBase) ?? 1;
        // NOT rounded. One gram of a 37 g / 130 kcal bar is 3.5135 kcal; storing it as 4 and then
        // multiplying by 37 gave 148. Rounding happens once, on screen, never before the maths.
        const scale = (v: number) => v * perOne;
        return {
          label: unitLabel(u),
          unitKey: u,
          isUnit: true,
          grams: perOne,
          unit: unitServingBase,
          calories: servingRates.calories * perOne,
          protein: scale(servingRates.protein),
          carbs: scale(servingRates.carbs),
          fat: scale(servingRates.fat),
          fiber: scale(servingRates.fiber),
          sugar: scale(servingRates.sugar),
          sodium: scale(servingRates.sodium),
          cholesterol: scale(servingRates.cholesterol),
          saturatedFat: scale(servingRates.saturatedFat),
          polyunsaturatedFat: scale(servingRates.polyunsaturatedFat),
          monounsaturatedFat: scale(servingRates.monounsaturatedFat),
          potassium: scale(servingRates.potassium),
          vitaminA: scale(servingRates.vitaminA),
          vitaminC: scale(servingRates.vitaminC),
          calcium: scale(servingRates.calcium),
          iron: scale(servingRates.iron),
          sugarAlcohols: scale(servingRates.sugarAlcohols),
          addedSugars: scale(servingRates.addedSugars),
          transFat: scale(servingRates.transFat),
          vitaminD: scale(servingRates.vitaminD),
          isDefault: false,
        };
      })
    : [];

  // Editing an entry has to reopen on the serving it was LOGGED in. The entry stores that serving's
  // weight, and the plain-unit options ("g", "oz", "mL") are built right here rather than coming
  // from FatSecret -- which is why an earlier attempt that searched only the named servings never
  // found "g" and snapped back to the default. Searching both lists is the whole fix: without it the
  // amount box read "93" against a 1/2 cup serving, so one tap of + logged 94 x 113 g.
  const loggedServingRestored = useRef(false);
  useEffect(() => {
    if (!isEditRoute || loggedServingRestored.current) return;
    // Wait for the My Food lookup. Without this the invented serving wins the race: it is prepended to
    // the list and weighs exactly what the entry saved, so it matches first, latches the ref, and the
    // real serving never gets a look in even once it arrives.
    if (!myFoodLookupDone) return;
    const target = Number(food?.servingGrams);
    if (!(target > 0)) return;
    const match = [...namedServings, ...unitServings]
      .find((s: any) => Math.abs((s.grams || 0) - target) < 0.005);
    if (match) {
      loggedServingRestored.current = true;
      setSelectedServing(match);
    }
  }, [isEditRoute, food?.servingGrams, namedServings.length, unitServings.length, myFoodLookupDone]);

  useEffect(() => {
    const resolveServings = async () => {
      if (fsServings.length > 0) return;
      let servings: any[] = [];
      if (food?.fsId) {
        // Has fsId -- fetch servings directly
        servings = await fetchFatSecretServings(food.fsId).catch(() => []);
      } else if (!food?.isCustom && !food?.isMyFood && !isEditing && !food?.aiEstimated && food?.description) {
        // No fsId (stale entry) -- search by name and use top result's servings.
        // AI-estimated foods are excluded: they stay pure to their own estimate and must never
        // be snapped onto a name-matched FatSecret product's serving/macros.
        servings = await fetchFatSecretByName(food.description).catch(() => []);
      }
      if (servings.length > 0) {
        // Keep the WHOLE fetched list, not just the default. Throwing the rest away is why a scanned
        // food showed "15 chips" on the screen while the picker had nothing but plain units to offer.
        setFetchedServings(servings);
        // Editing an entry must reopen on the serving it was LOGGED in, not the food's default. The
        // entry stores that serving's weight; without honouring it the picker snapped back to the
        // default while the amount box still held the logged number, so "93 g" was read as 93 of a
        // 113 g serving and a single tap of + would have logged 94 x 113 g.
        const loggedServing = (isEditing && Number(food?.servingGrams) > 0)
          ? servings.find((s: any) => Math.abs((s.grams || 0) - Number(food.servingGrams)) < 0.005)
          : null;
        const def = loggedServing || (searchResultCal !== null ? servings.find((s: any) => s.calories === searchResultCal) : null) || servings.find((s: any) => s.isDefault) || servings[0];
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

  // BUG FIX 2026-07-15 -- Edit Food opened EMPTY from the Edit Entry route.
  // The Edit button shows when food.isMyFood, but the modal fills from food.myFoodData, and those two can
  // DISAGREE: only add-food.tsx attaches myFoodData (it does this same myFoods.find lookup). Arriving from
  // Log > a logged entry > Edit Entry, the entry carries isMyFood/myFoodId but NOT myFoodData -- so the
  // button appeared, the modal opened, and all 26 extended fields came back blank. Calories and the 3
  // macros survived only because they alone have an `|| src.existingCal` fallback; nothing else does.
  // So: resolve the My Food here too, and let openEditFoodModal fall back to it. Read-only -- no writes.
  // State lives further up now (the serving list needs it); this effect fills it.
  // `myFoodLookupDone` must be set on EVERY path, including the early bail-outs -- the serving-restore
  // effect below waits on it, and a path that never sets it would leave a logged entry stuck.
  useEffect(() => {
    if (food?.myFoodData) { setMyFoodLookupDone(true); return; }   // already attached (the add-food route)
    const myFoodId = (food as any)?.myFoodId;
    if (!myFoodId && !food?.description) { setMyFoodLookupDone(true); return; }
    AsyncStorage.getItem('pj_my_foods').then(saved => {
      if (!saved) { setMyFoodLookupDone(true); return; }
      const myFoods = JSON.parse(saved);
      const match = myFoods.find((f: any) => myFoodId ? f.id === myFoodId : f.name === food.description);
      if (match) setResolvedMyFood(match);
      setMyFoodLookupDone(true);
    }).catch(() => setMyFoodLookupDone(true));
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
    if (!photoTargetId) return;
    (async () => {
      try {
        // Resolves the local cache, or re-downloads from cloud on a reinstall, or
        // backfills a legacy local-only photo up to the cloud. Returns a local uri.
        const local = isRecipePhoto
          ? await resolveRecipePhoto(photoTargetId)
          : await resolveFoodPhoto(photoTargetId);
        if (local) setPhotoUri(local);
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

  // Is a barcode already pinned to THIS food? Overrides are stored keyed by barcode, holding either a
  // My Food reference (id + name) or a whole FatSecret result, so both shapes are checked.
  const overrideMatchesThisFood = (entry: any): boolean => {
    if (!entry) return false;
    if (entry.isMyFood) {
      const myFoodId = (food as any)?.myFoodData?.id || (food as any)?.myFoodId;
      if (myFoodId && entry.myFoodId) return entry.myFoodId === myFoodId;
      return entry.myFoodName === food?.description;
    }
    if (entry.fsId && food?.fsId) return entry.fsId === food.fsId;
    return entry.description === food?.description;
  };

  useEffect(() => {
    if (!food?.description) return;
    AsyncStorage.getItem('pj_barcode_overrides').then(saved => {
      if (!saved) return;
      const overrides = JSON.parse(saved);
      const hit = Object.keys(overrides).find(code => overrideMatchesThisFood(overrides[code]));
      setLinkedBarcode(hit ?? null);
    }).catch(() => {});
  }, [food?.description, food?.fsId]);

  const closeServingPicker = () => {
    Animated.timing(servingPickerAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => setShowServingPicker(false));
  };

  // Confirms first, with the same wording the Set Foods list already uses for this action.
  const confirmUnsetBarcode = () => {
    if (!linkedBarcode) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'Remove Barcode Link?',
      `"${food?.description}" will no longer be linked to this barcode. You can re-link it by scanning again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: unsetBarcode },
      ]
    );
  };

  const unsetBarcode = async () => {
    if (!linkedBarcode) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      const saved = await AsyncStorage.getItem('pj_barcode_overrides');
      const overrides = saved ? JSON.parse(saved) : {};
      delete overrides[linkedBarcode];
      await storageSet('pj_barcode_overrides', JSON.stringify(overrides));
      setLinkedBarcode(null);
      showToast('Barcode unset', food.description, 'info');
    } catch (e) {
      showToast('Could not unset', 'Try again', 'error');
    }
  };

  // The camera fires onBarcodeScanned on EVERY frame it can read a code, and setState is async, so
  // a state flag let dozens of frames through before it flipped -- one scan produced a wall of
  // toasts. A ref flips synchronously on the very first frame.
  const linkScanLock = useRef(false);

  const writeBarcodeLink = async (code: string) => {
    try {
      const saved = await AsyncStorage.getItem('pj_barcode_overrides');
      const overrides = saved ? JSON.parse(saved) : {};
      // Same shape add-food writes, so the scan flow reads it back without knowing where it came from.
      overrides[code] = (food.isMyFood || food.isCustom)
        ? {
            isMyFood: true,
            myFoodName: food.description,
            myFoodId: (food as any)?.myFoodData?.id || (food as any)?.myFoodId || null,
            isOverride: true,
          }
        : { ...food, isOverride: true };
      await storageSet('pj_barcode_overrides', JSON.stringify(overrides));
      setLinkedBarcode(code);
      triggerHapticNotification(Haptics.NotificationFeedbackType.Success);
      showToast('Barcode set', `Future scans open ${food.description}`, 'success');
    } catch (e) {
      showToast('Could not set barcode', 'Try again', 'error');
    }
  };

  const handleLinkScan = async ({ data }: { data: string }) => {
    if (!data || linkScanLock.current) return;
    linkScanLock.current = true;
    setScanningForLink(false);
    try {
      const saved = await AsyncStorage.getItem('pj_barcode_overrides');
      const overrides = saved ? JSON.parse(saved) : {};
      const existing = overrides[data];
      // Pinning overwrites, so a barcode already pointing at a DIFFERENT food would silently move
      // without the user knowing which one they just unlinked. Ask first, by name.
      if (existing && !overrideMatchesThisFood(existing)) {
        const otherName = existing.myFoodName || existing.description || 'another food';
        Alert.alert(
          'Barcode Already Set',
          `This barcode currently opens "${otherName}". Move it to "${food.description}"?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Move It', onPress: () => writeBarcodeLink(data) },
          ]
        );
        return;
      }
      await writeBarcodeLink(data);
    } catch (e) {
      showToast('Could not set barcode', 'Try again', 'error');
    }
  };

  const startLinkScan = async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    const perm = await Camera.requestCameraPermissionsAsync();
    if (!perm.granted) {
      showToast('Camera access needed', 'Enable camera access to scan a barcode', 'error');
      return;
    }
    linkScanLock.current = false;
    setScanningForLink(true);
  };

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
        // Flat/AI-estimated entries carry macros in flat fields, not a label serving or a
        // foodNutrients array, so getN() finds nothing and returns 0 (calories already dodge
        // this by falling back to `calories`). Mirror that fallback for the macros: when there's
        // no label serving AND no foodNutrients list, use the live on-screen macro values.
        // FatSecret + custom foods (which always have one of those sources) are untouched.
        const isFlatEntry = !labelServing && !(food.foodNutrients && food.foodNutrients.length > 0);
        favs.push({
          id: Math.random().toString(36).slice(2) + Date.now().toString(36),
          name: food.description,
          brand: food.brand || null,
          isMyFood: food?.isMyFood || false,
          isCustom: food?.isCustom || false,
          cal: labelCal,
          protein: isFlatEntry ? protein : getN('Protein'),
          carbs: isFlatEntry ? carbs : getN('Carbohydrate, by difference'),
          fat: isFlatEntry ? fat : getN('Total lipid (fat)'),
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
          // Persist the AI flag so a re-logged AI favorite isn't mistaken for a stale
          // FatSecret food and silently name-search enriched with a stranger's label.
          aiEstimated: food.aiEstimated || false,
        });
        showToast('Added to favorites', food.description, 'success');
      }
      await storageSet('pj_favorites', JSON.stringify(favs));
      saveToFirebase('my_foods', 'favorites', favs).catch(() => {});
      setIsFav(!isFav);
    } catch (e) {}
  };
    const [entryTime, setEntryTime] = useState<Date>( food?.timestamp ? new Date(food.timestamp) : new Date());
const [showTimePicker, setShowTimePicker] = useState(false);
  const isEditing = entryIndex !== undefined && entryIndex !== '';
  // Serving-count-only recipe entry (recipe had no total weight): no gram basis, so the amount box is
  // hidden and the save preserves the original "(N servings)" name instead of rewriting it to grams.
  const isServingOnlyRecipe = isServingOnly;
  const originalAmount = food?.existingAmount ||
    (defaultFsServing && defaultFsServing.grams > 0
      ? defaultFsServing.grams.toString()
      : '100');
  const [amount, setAmount] = useState(originalAmount);
  const [amountChanged, setAmountChanged] = useState(false);
  // Weight/volume entry-unit convenience on the logged Amount. `amount` stays in the food's base
  // unit (grams for weight foods, mL for volume foods) so all nutrition math is untouched; the
  // dropdown just lets you type in a sibling unit (oz, cup, etc.) and converts back on blur.
  const amountBaseUnit = effectiveServing?.unit || food?.servingUnitType || 'g';
  const amountFamily = convertibleUnitsFor(amountBaseUnit);
  // The unit this food is greeted in: the one it was built in (servingDisplayUnit) when that still
  // belongs to the base unit's family, otherwise the base itself. A juice built as "1 Cup" opens as
  // 1 Cup instead of 236.59 mL -- display only, the canonical number never moves.
  const preferredDisplayUnit = (food?.servingDisplayUnit && unitGroup(food.servingDisplayUnit) === unitGroup(amountBaseUnit))
    ? food.servingDisplayUnit
    : amountBaseUnit;
  // On edit, restore the unit the entry was logged in (persisted as displayUnit); fresh logs start
  // in the food's preferred unit. The displayed value derives from the canonical amount via conversion.
  const [amountEntryUnit, setAmountEntryUnit] = useState<string>(food?.existingDisplayUnit || preferredDisplayUnit);
  const [amountDraft, setAmountDraft] = useState<string | undefined>(undefined);
  // Reset the entry unit to the base unit ONLY when the base actually changes (e.g. switching
  // servings), never on mount -- mounting would otherwise clobber a restored displayUnit above.
  const amountBaseMountRef = useRef(true);
  useEffect(() => {
    if (amountBaseMountRef.current) { amountBaseMountRef.current = false; return; }
    setAmountEntryUnit(preferredDisplayUnit);
    setAmountDraft(undefined);
  }, [amountBaseUnit]);
  const [servingCountTouched, setServingCountTouched] = useState(false);
  // A FRACTION of a serving is a real thing to have logged (half a recipe, 0.74 of a portion). This
  // used to clamp to a minimum of 1, so reopening such an entry showed "1" in the amount box while the
  // card above it correctly said 0.74 servings -- and saving from that screen silently rounded the
  // entry UP to a full serving. Only guard against zero/NaN, which would make the stepper unusable.
  const initialServingCount = resolvedServingGrams > 0 && food?.existingAmount
    ? (parseFloat(food.existingAmount) / resolvedServingGrams) || 1
    : 1;
  const [servingCount, setServingCount] = useState(initialServingCount);
  const [servingCountStr, setServingCountStr] = useState(initialServingCount.toString());
  const [hasChanges, setHasChanges] = useState(false);
  const [unit, setUnit] = useState<'g' | 'oz' | 'serving'>(food?.existingUnit || 'g');
    const [showMealPicker, setShowMealPicker] = useState(false);
const [currentMeal, setCurrentMeal] = useState(meal === 'browse' || !meal ? 'ms_morning' : meal);
  const [mealSlots, setMealSlots] = useState<MealSlot[]>(DEFAULT_MEAL_SLOTS);
  // ITEM C, PART B: the meal picker below offers destinations, so it gets the LIVE slots only.
  const liveSlots = liveItems(mealSlots, capFor('mealSlots', isSupporter));
  const [slotNameCache, setSlotNameCache] = useState<Record<string, string>>({});
  useEffect(() => {
    loadMealSlots().then(({ mealSlots: slots, slotNameCache: cache }) => { setMealSlots(slots); setSlotNameCache(cache); });
  }, []);

  // ITEM C: the food count, on its OWN effect with real dependencies. This screen does not hold the food
  // list, so unlike add-food it cannot derive the count -- it has to re-read.
  // ⚠️ THIS USED TO RUN ONCE ON MOUNT WITH `[]` DEPS, which broke it two ways:
  //   1. Clone a food and the count never updated, so Save as Copy stayed unlocked and you could keep
  //      cloning straight past the cap (found on device 2026-08-02: the toast read "60 of 59").
  //   2. Worse and unreported: if the screen mounted before RevenueCat answered, membershipLoading was
  //      true, checkCap correctly returned UNLIMITED, and nothing ever re-ran -- so a free user on a slow
  //      launch got no padlock on this screen at all for as long as it stayed open.
  // Re-running on membership resolving fixes both halves. `refreshFoodCap` is also called after a clone.
  // (Pattern copied from recipe-builder.tsx, which had this right; every other cap door was already fine.)
  const refreshFoodCap = useCallback(() => {
    checkCap('foods', isSupporter, membershipLoading).then(setFoodCap).catch(() => {});
  }, [isSupporter, membershipLoading]);
  useEffect(() => { refreshFoodCap(); }, [refreshFoodCap]);
  const [showEditFoodModal, setShowEditFoodModal] = useState(false);
  const [editFoodData, setEditFoodData] = useState<any>(null);
  const mealDropdownAnim = useRef(new Animated.Value(0)).current;
  const timePickerAnim = useRef(new Animated.Value(0)).current;
  const servingPickerAnim = useRef(new Animated.Value(0)).current;

  // When async My Foods lookup resolves, update servingCount to match the real base serving
  useEffect(() => {
    if (resolvedServingGrams > 0 && food?.existingAmount && !servingCountTouched) {
      // Same fraction rule as initialServingCount above -- zero/NaN guarded, fractions preserved.
      const count = (parseFloat(food.existingAmount) / resolvedServingGrams) || 1;
      setServingCount(count);
      // The VISIBLE box reads servingCountStr, which this effect never updated. So even once the count
      // was right, the field kept showing whatever it was built with -- the second half of why a 0.74
      // entry displayed "1". Round for display only; servingCount keeps full precision for the maths.
      setServingCountStr(count % 1 === 0 ? count.toString() : String(Math.round(count * 100) / 100));
    }
  }, [resolvedServingGrams]);

  if (!food) return null;

  // Helper: compute a scaled extended nutrient value for the current serving/amount state.
  // Returns null when no data is available at all for this nutrient.
  // The maths itself now lives in utils/nutrientScale.ts so it can be tested against the day-totals
  // side. The screen showing one number while the day's totals produce another is the entire bug class
  // of 2026-07-27, and it was untestable while this lived inside the component. This is just the wiring
  // that hands it the screen's current state.
  const computeExtended = (servingKey: string, nutrientName: string): number | null =>
    computeDetailNutrient(food, servingKey, nutrientName, {
      calories, grams, multiplier, servingCount, useServingBased, useExisting,
      nutrientBasisSize, effectiveServing, servingRates,
    });


  // True when this entry carries recipe-style flat extended nutrients (so the edit screen
  // shows them instead of the "no detailed nutrition data" line).
  const hasFlatExtended = ['fiber','sugar','sodium','cholesterol','saturatedFat','polyunsaturatedFat','monounsaturatedFat','addedSugars','transFat','vitaminA','vitaminC','vitaminD','potassium','calcium','iron','caffeine','sugarAlcohols']
    .some(k => (((food as any)[k]) || 0) > 0);

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
        // Save as pending ingredient for recipe builder to pick up. Capture the EXTENDED
        // nutrients (fiber, sugar, sodium, etc.) too -- previously only cal + the big 3 macros
        // were carried, so every recipe ingredient logged 0 fiber/sodium/micros, starving the
        // recipe (and the day's advanced nutrition / EvR fiber) of real data. computeExtended
        // scales each to the chosen portion exactly like the macros above; optional micros are
        // only carried when actually present.
        const fiber        = computeExtended('fiber',              'Fiber, total dietary');
        const sugar        = computeExtended('sugar',              'Sugars, total including NLEA');
        const sodium       = computeExtended('sodium',             'Sodium, Na');
        const cholesterol  = computeExtended('cholesterol',        'Cholesterol');
        const saturatedFat = computeExtended('saturatedFat',       'Fatty acids, total saturated');
        const polyFat      = computeExtended('polyunsaturatedFat', 'Polyunsaturated Fat');
        const monoFat      = computeExtended('monounsaturatedFat', 'Monounsaturated Fat');
        const addedSugars  = computeExtended('addedSugars',        'Added Sugars');
        const transFat     = computeExtended('transFat',           'Trans Fat');
        const vitaminA     = computeExtended('vitaminA',           'Vitamin A');
        const vitaminC     = computeExtended('vitaminC',           'Vitamin C');
        const vitaminD     = computeExtended('vitaminD',           'Vitamin D');
        const ingredient = {
          id: Math.random().toString(36).substr(2, 9),
          // A database food's description usually ALREADY ends in its brand ("White Bread · Healthy
          // Life"), so appending the brand again produced "White Bread · Healthy Life · Healthy Life".
          // Custom foods dodged it because their name carries no brand suffix, which is why only some
          // ingredients doubled. Strip the suffix before re-adding it, and only when it's really there.
          name: (() => {
            const desc = (food.description ?? '').trim();
            if (!food.brand) return desc.split(' · ')[0] ?? desc;
            const suffix = ` · ${food.brand}`;
            return `${desc.endsWith(suffix) ? desc.slice(0, -suffix.length) : desc}${suffix}`;
          })(),
          cal: calories,
          protein,
          carbs,
          fat,
          fiber: fiber ?? 0,
          sugar: sugar ?? 0,
          sodium: sodium ?? 0,
          cholesterol: cholesterol ?? 0,
          saturatedFat: saturatedFat ?? 0,
          ...(polyFat     ? { polyunsaturatedFat: polyFat } : {}),
          ...(monoFat     ? { monounsaturatedFat: monoFat } : {}),
          ...(addedSugars ? { addedSugars } : {}),
          ...(transFat    ? { transFat } : {}),
          ...(vitaminA    ? { vitaminA } : {}),
          ...(vitaminC    ? { vitaminC } : {}),
          ...(vitaminD    ? { vitaminD } : {}),
          amount: parseFloat(amount),
          // The food's REAL base unit (mL for volume foods), not the vestigial `unit` state this used
          // to read, which was stuck on 'g' and made every ingredient claim to be grams.
          unit: amountBaseUnit,
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
        // Normalised to PER 100, not left as the selected serving's absolute values. A FatSecret food
        // that arrived by barcode already carries these per 100, and every reader assumes that -- but a
        // TEXT-SEARCH result carries only the four macros, so these got filled in from whatever serving
        // happened to be selected and were then read as if per 100. Logging the yogurt by the gram
        // stored sodium as 0.38 and reported it as 0.38; logging its 170 g serving would have reported
        // 1.7x too much. Writing them in the same basis as the barcode path removes the ambiguity at
        // the source rather than teaching ten readers about a second convention.
        const evGrams = (effectiveServing as any).grams;
        extMap.forEach(({ nutrientName, unitName, key }) => {
          if (!baseNutrients.find(n => n.nutrientName === nutrientName)) {
            const raw = (effectiveServing as any)[key] || 0;
            const per100 = evGrams > 0 ? (raw / evGrams) * 100 : raw;
            baseNutrients.push({ nutrientName, unitName, value: per100 });
          }
        });
      }
      // Round the gram/oz weight shown in the NAME to <=1 decimal so a serving-count conversion can't bake
      // a float artifact into the stored name (e.g. 1.3333 servings -> "113.33304999999999g"). Display-only:
      // loggedAmount below keeps the precise value, so edit math is unaffected.
      const nameAmount = (() => { const n = parseFloat(amount); return isFinite(n) ? String(Math.round(n * 10) / 10) : amount; })();
      // #9: remember the unit the user logged in whenever it isn't plain grams -- covers foods whose
      // native unit is already oz/mL (logged with no switch) AND portions switched to a sibling unit.
      // Grams stays canonical (loggedAmount/calPer100g/totals unchanged); these display-only fields
      // drive the meal card + Edit reopen so it reads "11 oz"/"240 mL" instead of a stale "11g".
      // Picking "oz" in the SERVING picker counts as choosing ounces, same as typing them on the Amount
      // row. Units used to be their own dropdown on that row and were later merged into the serving
      // picker, but this only ever watched the old one -- so logging a bun as 1 oz produced a meal card
      // reading "Hot Dog Buns 28.3g", the weight instead of what was actually chosen.
      const pickedUnitKey = (effectiveServing as any)?.isUnit ? (effectiveServing as any).unitKey : null;
      const amtEntryUnit = pickedUnitKey ?? amountEntryUnit;
      const amtShowUnit = amountFamily.length > 0 && amtEntryUnit !== 'g';
      const amtDisplayAmount = amtEntryUnit === amountBaseUnit
        ? nameAmount
        : String(Math.round(((convertUnit(parseFloat(amount), amountBaseUnit, amtEntryUnit) ?? 0)) * 100) / 100);
      // Editing a RECIPE entry's portion updated its calories and macros but left its nutrients at the
      // OLD portion: those live as flat fields on the entry, and this save never rewrote them. The
      // screen above already shows the rescaled figures, so the entry disagreed with what you just
      // looked at. Rescale by the same calorie ratio the display uses. Non-recipe entries carry no flat
      // fields, so this object stays empty for them and nothing changes.
      const rescaledFlat: Record<string, number> = {};
      if (isEditing) {
        const baseCal = food.existingCal || food.cal || 0;
        if (baseCal > 0 && calories !== baseCal) {
          const ratio = calories / baseCal;
          for (const key of Object.values(FLAT_NUTRIENT_KEY)) {
            const v = (food as any)[key];
            if (typeof v === 'number' && v !== 0) rescaledFlat[key] = Math.round(v * ratio * 10) / 10;
          }
        }
      }
      // THE FIX for "extended nutrients scale against the wrong serving". Readers used to reverse-
      // engineer this from calories and servingGrams, but servingGrams records the serving the user
      // PICKED while foodNutrients describes something else entirely -- per 100 for database foods, the
      // food's own base serving for custom ones. Pick grams from the serving dropdown on an 84 g custom
      // food and the two disagreed by a factor of 84.
      // Here, at save time, we simply know: this is how much of that block was eaten. One number, no
      // inference. Entries saved before this carry no such number and keep reading exactly as they did.
      const loggedUnits = parseFloat(amount) || 0;
      const nutrientScale = (() => {
        if (isServingOnly || loggedUnits <= 0) return undefined; // no weight to reason about
        if (food.fsId) return loggedUnits / 100;                       // block is per 100, incl. the push above
        if (nutrientBasisSize) return loggedUnits / nutrientBasisSize; // custom: block is one base serving
        return undefined;                                              // unknown basis -- leave readers as-is
      })();
      const newEntry = {
  ...rescaledFlat,
  ...(nutrientScale !== undefined ? { nutrientScale } : {}),
  // Serving-only recipe entries rebuild the name in servings (amount tracks the serving count), so an
  // edited count is reflected; everything else rebuilds from the edited amount + unit.
  name: isServingOnlyRecipe ? `${food.description} (${amount} ${amount === '1' ? 'serving' : 'servings'})` : `${food.description} (${nameAmount}${unitLabel(amountBaseUnit)})`,
  cal: calories,
  meal: currentMeal,
  protein,
  carbs,
  fat,
  calPer100g,
  proteinPer100g,
  carbsPer100g,
  fatPer100g,
  // The stored "label" is the food's real DEFAULT serving (what Recent shows as the headline number),
  // decoupled from whatever unit was actually logged. Logging 18g by weight must NOT overwrite the
  // label with "1 gram = 3 kcal" -- prefer the canonical default serving, and only fall back to the
  // selected/effective serving for custom/AI foods that have no default serving.
  labelCal: virtualDefaultServing?.calories || selectedServing?.calories || effectiveServing?.calories || calPer100g,
  labelProtein: virtualDefaultServing?.protein || selectedServing?.protein || effectiveServing?.protein || proteinPer100g,
  labelCarbs: virtualDefaultServing?.carbs || selectedServing?.carbs || effectiveServing?.carbs || carbsPer100g,
  labelFat: virtualDefaultServing?.fat || selectedServing?.fat || effectiveServing?.fat || fatPer100g,
  loggedAmount: amount,
  loggedUnit: amountBaseUnit,
  // Preserve the food's serving NAME ("1 Cup", "1 scoop") so re-opening the entry shows it under
  // Servings instead of falling back to the raw amount+unit.
  servingLabelText: food.servingUnit || null,
  displayUnit: amtShowUnit ? amtEntryUnit : null,
  displayAmount: amtShowUnit ? amtDisplayAmount : null,
  servingGrams: effectiveServing?.grams,
  foodNutrients: baseNutrients,
  timestamp: entryTime.getTime(),
  fsId: food.fsId || null,
  myFoodId: food.myFoodData?.id || (food as any)?.myFoodId || null,
  isMyFood: !!(food.isMyFood || food.myFoodData || (food as any)?.myFoodId),
  brand: food.brand || food.description?.split(' · ')[1] || null,
  ...(food.type === 'supplement' ? { type: 'supplement' } : {}),
  // Preserve the AI flag on the saved entry so a re-logged AI meal keeps its "AI ESTIMATE" badge,
  // its serving-only (1 serving) display, and its immunity from FatSecret name-search enrichment.
  ...(food.aiEstimated ? { aiEstimated: true } : {}),
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
        const momentumUnlocked = await checkMomentumAchievements(true);
        momentumUnlocked.forEach(def => {
          showCelebration(getCelebTier(def), def.name, def);
          showAchievementToast(def);
        });
        // NOT forced: nutrition/calorie-goal achievements only ever count COMPLETED days (today is
        // excluded), so a same-day log can never newly-complete one. Forcing it just popped legit
        // past-day badges at random mid-day moments. Leave it gated -> fires on app-open, correctly.
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

  const openEditFoodModal = () => {
    const src = food;
    // `?? resolvedMyFood` is the fix: on the Edit Entry route myFoodData is never attached (only add-food
    // does that), so every extended field below -- all of which read ONLY from `mf` with no fallback --
    // came back empty. See the resolvedMyFood note above.
    const mf = src.myFoodData ?? resolvedMyFood;
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
      thiamin: mf?.thiamin?.toString() || '',
      riboflavin: mf?.riboflavin?.toString() || '',
      niacin: mf?.niacin?.toString() || '',
      choline: mf?.choline?.toString() || '',
      magnesium: mf?.magnesium?.toString() || '',
      zinc: mf?.zinc?.toString() || '',
      copper: mf?.copper?.toString() || '',
      caffeine: mf?.caffeine?.toString() || '',
      servingGrams: (mf?.servingSize ?? src.servingSize)?.toString() || '100',
      servingUnitType: mf?.servingUnitType || src.servingUnitType || 'g',
      servingDisplayUnit: mf?.servingDisplayUnit || src.servingDisplayUnit,
      servingLabel: mf?.servingUnit || src.servingUnit || '',
      additionalServings: (mf?.additionalServings || src.additionalServings || []).map((s: any, i: number) => ({
        id: `as_${i}`,
        label: s.label || '',
        grams: s.grams?.toString() || '',
      })),
      type: mf?.type || 'food',
    });
    setShowEditFoodModal(true);
  };

  const closeMealPicker = () => {
    Animated.timing(mealDropdownAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => setShowMealPicker(false));
  };

  const closeTimePicker = () => {
    Animated.timing(timePickerAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => setShowTimePicker(false));
  };

  const closeEditFoodModal = () => {
    setShowEditFoodModal(false);
    setEditFoodData(null);
  };

  const saveEditFoodFromDetail = async () => {
    if (!editFoodData || !editFoodData.name.trim() || !editFoodData.cal) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const saved = await AsyncStorage.getItem('pj_my_foods');
      const foods = saved ? JSON.parse(saved) : [];
      // DATA-LOSS FIX 2026-07-15. `_source.myFoodData || _source` fell through to the ENTRY on the Edit
      // Entry route (only add-food attaches myFoodData), so the row match below ran against the entry's id
      // instead of the My Food's. Combined with the load bug -- every extended field arrived '' -- a Save
      // from that route wrote `parseFloat('') || 0` into all 26 nutrients: fiber, sodium, cholesterol,
      // vitamins, minerals, ALL silently zeroed on a real saved food. resolvedMyFood is the same lookup
      // add-food does, so both the load and this match now resolve the actual My Food.
      const src = editFoodData._source?.myFoodData ?? resolvedMyFood ?? editFoodData._source;
      const calNum = parseInt(editFoodData.cal) || 0;
      const servingGrams = parseFloat(editFoodData.servingGrams) || src?.servingSize || 100;
      const servingUnitType = editFoodData.servingUnitType || 'g';
      const servingLabel = editFoodData.servingLabel?.trim() || `${servingGrams}${unitLabel(servingUnitType)}`;
      // Held onto so the screen can refresh in place instead of bouncing the user off it.
      let savedRecord: any = null;
      const updated = foods.map((f: any) =>
        (src?.id ? f.id === src.id : f.name === (src?.name || src?.description)) ? (savedRecord = {
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
          thiamin: parseFloat(editFoodData.thiamin) || 0,
          riboflavin: parseFloat(editFoodData.riboflavin) || 0,
          niacin: parseFloat(editFoodData.niacin) || 0,
          choline: parseFloat(editFoodData.choline) || 0,
          magnesium: parseFloat(editFoodData.magnesium) || 0,
          zinc: parseFloat(editFoodData.zinc) || 0,
          copper: parseFloat(editFoodData.copper) || 0,
          caffeine: parseFloat(editFoodData.caffeine) || 0,
          servingSize: servingGrams,
          servingUnitType,
          // Display-only preference: the unit this food is greeted in. Never used for math.
          servingDisplayUnit: editFoodData.servingDisplayUnit || f.servingDisplayUnit,
          servingUnit: servingLabel,
          calPer100g: Math.round((calNum / servingGrams) * 100),
          proteinPer100g: Math.round((parseFloat(editFoodData.protein) || 0) / servingGrams * 100 * 10) / 10,
          carbsPer100g: Math.round((parseFloat(editFoodData.carbs) || 0) / servingGrams * 100 * 10) / 10,
          fatPer100g: Math.round((parseFloat(editFoodData.fat) || 0) / servingGrams * 100 * 10) / 10,
          additionalServings: (editFoodData.additionalServings || [])
            .filter((s: any) => s.label?.trim() && parseFloat(s.grams) > 0)
            .map((s: any) => ({ label: s.label.trim(), grams: parseFloat(s.grams) })),
          type: editFoodData.type || 'food',
        }) : f
      );
      await storageSet('pj_my_foods', JSON.stringify(updated));
      saveToFirebase('my_foods', 'foods', updated).catch(() => {});
      showToast('Food saved', editFoodData.name.trim(), 'success');
      closeEditFoodModal();
      if (savedRecord) {
        // Refresh in place: swap in the record that was just written, and re-seed the serving and
        // amount so the box can't sit on the OLD serving size next to the NEW nutrition -- that
        // would look correct while being wrong, which is worse than the old bounce-out.
        const newBase = savedRecord.servingUnitType || 'g';
        const newServing = {
          label: savedRecord.servingUnit || `${savedRecord.servingSize}${unitLabel(newBase)}`,
          calories: savedRecord.cal || 0,
          protein: savedRecord.protein || 0,
          carbs: savedRecord.carbs || 0,
          fat: savedRecord.fat || 0,
          fiber: savedRecord.fiber || 0,
          sugar: savedRecord.sugar || 0,
          sodium: savedRecord.sodium || 0,
          cholesterol: savedRecord.cholesterol || 0,
          saturatedFat: savedRecord.saturatedFat || 0,
          polyunsaturatedFat: savedRecord.polyunsaturatedFat || 0,
          monounsaturatedFat: savedRecord.monounsaturatedFat || 0,
          potassium: savedRecord.potassium || 0,
          vitaminA: savedRecord.vitaminA || 0,
          vitaminC: savedRecord.vitaminC || 0,
          calcium: savedRecord.calcium || 0,
          iron: savedRecord.iron || 0,
          sugarAlcohols: savedRecord.sugarAlcohols || 0,
          addedSugars: savedRecord.addedSugars || 0,
          transFat: savedRecord.transFat || 0,
          vitaminD: savedRecord.vitaminD || 0,
          grams: savedRecord.servingSize || 100,
          unit: newBase,
          isDefault: true,
        };
        setRefreshedFood({
          ...food,
          description: savedRecord.name,
          brand: savedRecord.brand || null,
          calPer100g: savedRecord.calPer100g,
          proteinPer100g: savedRecord.proteinPer100g,
          carbsPer100g: savedRecord.carbsPer100g,
          fatPer100g: savedRecord.fatPer100g,
          servingGrams: savedRecord.servingSize,
          servingUnitType: newBase,
          servingDisplayUnit: savedRecord.servingDisplayUnit,
          servingUnit: savedRecord.servingUnit,
          myFoodData: savedRecord,
          isCustom: true,
          // A custom food displays its STORED absolute values (existingCal and friends) until the
          // user touches the amount -- refreshing only the per-100g figures left calories and macros
          // showing the pre-edit numbers. On the Edit Entry route these belong to the logged entry,
          // not the food, so they stay exactly as the user logged them.
          ...(isEditing ? {} : {
            existingCal: savedRecord.cal || 0,
            existingProtein: savedRecord.protein || 0,
            existingCarbs: savedRecord.carbs || 0,
            existingFat: savedRecord.fat || 0,
            existingAmount: String(savedRecord.servingSize || 100),
            foodNutrients: [
              { nutrientName: 'Energy', unitName: 'KCAL', value: savedRecord.cal || 0 },
              { nutrientName: 'Protein', unitName: 'G', value: savedRecord.protein || 0 },
              { nutrientName: 'Carbohydrate, by difference', unitName: 'G', value: savedRecord.carbs || 0 },
              { nutrientName: 'Total lipid (fat)', unitName: 'G', value: savedRecord.fat || 0 },
            ],
          }),
        });
        setResolvedMyFood(savedRecord);
        setResolvedServingGrams(savedRecord.servingSize || 0);
        setSelectedServing(newServing);
        setAmountDraft(undefined);
        setAmountEntryUnit(
          savedRecord.servingDisplayUnit && unitGroup(savedRecord.servingDisplayUnit) === unitGroup(newBase)
            ? savedRecord.servingDisplayUnit
            : newBase
        );
        // Editing an existing diary entry: that entry's logged amount is the user's, not ours to
        // overwrite because the food definition changed. Only a fresh log re-seeds to one serving.
        if (!isEditing) {
          setServingCount(1);
          setServingCountStr('1');
          setAmount(String(savedRecord.servingSize || 100));
        }
      } else if (router.canGoBack()) {
        // Couldn't find the food in My Foods (shouldn't happen) -- never sit on numbers this screen
        // can't vouch for. Leave, same as the regular back button, never a hardcoded destination.
        router.back();
      }
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
    if (!photoTargetId) return;
    try {
      const safeId = photoTargetId.replace(/[^a-zA-Z0-9_-]/g, '_');
      const photoDir = new Directory(Paths.document, isRecipePhoto ? 'recipe_photos' : 'food_photos');
      if (!photoDir.exists) photoDir.create();
      const destUri = `${photoDir.uri}${safeId}.jpg`;
      const destFile = new FSFile(destUri);
      if (destFile.exists) destFile.delete();
      const srcFile = new FSFile(sourceUri);
      srcFile.copy(destFile);
      setPhotoUri(destUri);
      setShowPhotoFullscreen(false);
      triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
      showToast('Photo saved', undefined, 'success');
      // Upload to cloud so it survives a reinstall; store the cloud URL (falls back to
      // the local path if offline / not signed in -- the next load backfills it).
      const { url } = isRecipePhoto
        ? await uploadRecipePhoto(photoTargetId, destUri)
        : await uploadFoodPhoto(photoTargetId, destUri);
      await AsyncStorage.setItem(
        isRecipePhoto ? recipePhotoKey(photoTargetId) : `pj_food_photo_${photoTargetId}`,
        url || destUri,
      );
    } catch (e: any) {
      showToast('Photo save failed', e?.message || 'Please try again', 'error');
    }
  };

  const handlePhotoRemove = () => {
    if (!photoTargetId || !photoUri) return;
    Alert.alert('Remove Photo', 'Remove this photo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
          try {
            const file = new FSFile(photoUri);
            if (file.exists) file.delete();
            await AsyncStorage.removeItem(isRecipePhoto ? recipePhotoKey(photoTargetId) : `pj_food_photo_${photoTargetId}`);
            // Remove the cloud copy too.
            (isRecipePhoto ? deleteRecipePhotoCloud(photoTargetId) : deleteFoodPhotoCloud(photoTargetId)).catch(() => {});
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
      <BackgroundLayers />
      <ScreenHeader
        title={isEditing ? 'Edit Entry' : 'Food Detail'}
        topInset={false}
        right={
        <>
          {food?.isMyFood ? (
            <TouchableOpacity
              style={{ backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 }}
              onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); openEditFoodModal(); }}>
              {/* Header-slot action, but a TEXT button -- so it takes the shine directly rather than becoming
                  a HeaderIconButton (that component is the ICON square). */}
              <ButtonShine radius={6} />
              <Text style={{ color: theme.accentBlue, fontSize: 13, fontFamily: Type.uiSemibold }}>Edit</Text>
            </TouchableOpacity>
          ) : food?.fsId ? (
            <TouchableOpacity
              onPress={() => {
                triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                if (!foodCap.canCreate) { setFoodCapWall(true); return; }
                setShowSaveAsCopy(true);
              }}
              style={{ width: 30, height: 30, alignItems: 'center', justifyContent: 'center' }}>
              {/* ⚠️ ITEM C door 4 (Save as Copy -- the clone path). ICON-ONLY, so the locked treatment differs
                  from every other door: there is no surface to drain and the icon is already the dimmest grey
                  in the theme.
                  ⚠️ NEVER REPLACE THE ICON WITH THE PADLOCK -- BADGE IT. Swapping it would leave a bare gold
                  lock in a header, and somebody who has never used clone would tap it, be told their custom
                  foods are full, and have no idea what those two things have to do with each other; they would
                  not know what they had just tried to do. The copy icon says WHAT, the badge says LOCKED, and
                  the wall modal then needs no special wording for this door. Justin caught this 2026-08-02.
                  This is the rule for every icon-only door from here on. */}
              <Ionicons name="copy-outline" size={22} color={theme.textDim} />
              {/* The badge disc carries a GOLD RING, same reason as the lock circle on CapWallModal: without
                  it the disc reads as an accidental white blob rather than a deliberate badge. */}
              {!foodCap.canCreate && (
                <View style={{ position: 'absolute', right: 0, bottom: 0, width: 14, height: 14, borderRadius: 7, backgroundColor: theme.bgCard, borderWidth: 1, borderColor: GOLD_BASE, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="lock-closed" size={10} color={GOLD_BASE} />
                </View>
              )}
            </TouchableOpacity>
          ) : null}
          {/* SET / UNSET a barcode for this food. Blue reads like Edit next to it; red is the same
              destructive treatment used for CLEAR elsewhere, so the linked state is unmistakable. */}
          {!isEditing && !isTutorialMode && (
            <TouchableOpacity
              style={{
                backgroundColor: linkedBarcode ? theme.accentRedBg : theme.accentBlueBg,
                borderWidth: 1,
                borderColor: linkedBarcode ? theme.accentRedBorder : theme.accentBlueBorder,
                borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6, overflow: 'hidden',
              }}
              onPress={linkedBarcode ? confirmUnsetBarcode : startLinkScan}>
              <ButtonShine radius={6} />
              <Text style={{ color: linkedBarcode ? theme.accentRed : theme.accentBlue, fontSize: 13, fontFamily: Type.uiSemibold }}>
                {linkedBarcode ? 'Unset' : 'Set'}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={toggleFav} style={{ width: 30, height: 30, alignItems: 'center', justifyContent: 'center' }}>
            <Animated.View style={{ transform: [{ scale: starScale }], alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons
                name={isFav ? 'star' : 'star-outline'}
                size={22}
                color={isFav ? theme.accentAmber : theme.textDim}
              />
            </Animated.View>
          </TouchableOpacity>
        </>
        }
      />

      <ScrollView ref={detailScrollRef} contentContainerStyle={styles.content} automaticallyAdjustKeyboardInsets keyboardDismissMode="on-drag">
        {/* Centred, not top-aligned: the photo tile sets this row's height, so a food with no brand
            left its name stranded at the top of a tall empty row. Centring resolves it either way --
            a taller text column (badge + name + brand) simply centres the tile against itself. */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
          <View style={{ flex: 1, paddingRight: foodId ? 16 : 0 }}>
            {food?.aiEstimated && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder, borderRadius: 3, paddingHorizontal: 5, paddingVertical: 2, alignSelf: 'flex-start', marginBottom: 4 }}>
                <Ionicons name="sparkles" size={8} color={theme.accentBlue} />
                <Text style={{ fontSize: 8, color: theme.accentBlue, fontFamily: Type.uiBold }}>AI ESTIMATE</Text>
              </View>
            )}
            {(food?.isMyFood || food?.isCustom) && (
              <View style={{ backgroundColor: theme.accentGreenBg, borderRadius: 3, paddingHorizontal: 5, paddingVertical: 1, alignSelf: 'flex-start', marginBottom: 4 }}>
                <Text style={{ fontSize: 8, color: theme.accentGreen, fontFamily: Type.uiBold }}>MY FOOD</Text>
              </View>
            )}
            <GradientTitle
              title={(food.brand ? food.description : (food.description?.split(' · ')[0] ?? food.description)) ?? ''}
              color={theme.textSecondary}
              style={[styles.foodName, { marginBottom: (food.brand || food.description?.includes(' · ')) ? 4 : 0 }]}
              numberOfLines={1}
            />
            {(food.brand || food.description?.split(' · ')[1]) && (
              <Text style={{ fontSize: 13, color: theme.textSecondary, fontFamily: Type.uiMedium }}>{food.brand || food.description?.split(' · ')[1]}</Text>
            )}
          </View>
          {photoTargetId && (
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

        {/* Serving picker -- now the ONLY place that answers "what does one of this mean?", so it shows
            whenever there's anything to choose between, including the plain units. */}
        {/* Laid out like the Amount row below it: the LABEL sits on the page and only the tappable
            part is a bordered control on the right, so the two read as a pair and the control is
            obviously a control. The pill is width-capped and clamps to two lines, so neither a
            FatSecret name like "1 small piece (yield after cooking, bone removed)" nor anything a
            user types can push it off the screen. */}
        {(fsServings.length > 1 || customServings.length > 1 || unitServings.length > 0) && (
          <View ref={amountRowRef as any} collapsable={false} style={[styles.amountRow, { marginBottom: 12 }]}>
            <Text style={styles.amountLabel}>Serving Size</Text>
            <TouchableOpacity
              style={styles.servingPickerBtn}
              onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setShowServingPicker(true); }}>
              {/* No flex:1 -- that forced the pill to its maximum width even for "100 g", leaving the
                  text floating in a box sized for a sentence. It hugs its content and only grows to
                  the cap when a serving name actually needs the room. */}
              <ButtonShine radius={8} />
              <Text
                numberOfLines={2}
                style={{ flexShrink: 1, fontSize: 14, color: theme.accentBlue, fontFamily: Type.uiSemibold, textAlign: 'right' }}>
                {(() => {
                  const label = selectedServing?.label || effectiveServing?.label || 'Select serving';
                  const weight = servingWeightSuffix(effectiveServing);
                  return weight ? `${label} · ${weight}` : label;
                })()}
              </Text>
              {/* No calorie number here on purpose. It describes the serving DEFINITION, but the Amount
                  row below is what gets logged -- at 80g this said 239 while the donut said 191. */}
              <Ionicons name="chevron-down" size={16} color={theme.accentBlue} style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </View>
        )}

        {/* Servings stepper */}
        {effectiveServing && (
          <View ref={servingPickerRef as any} collapsable={false} style={{ width: '100%' }}>
          <View ref={stepperRowRef} style={[styles.amountRow, { marginBottom: 12 }]}>
            {/* "Amount", not "Servings": once a plain unit can be the serving, this counts grams or
                ounces just as often as it counts servings. The sub-line restates the choice in plain
                words so the math never has to be held in your head. */}
            {/* No sub-line here. Whatever it said was the TOTAL, which the nutrition heading below
                already states -- on the default the same "28 g" was printing three times down one
                screen. This row answers "how many", nothing else. */}
            <Text style={styles.amountLabel}>Amount</Text>
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
                <ButtonShine radius={8} />
                <Text style={{ fontSize: 22, color: theme.accentBlue, fontFamily: Type.ui, lineHeight: 26 }}>−</Text>
              </TouchableOpacity>
              <TextInput
                style={{ width: 54, textAlign: 'center', fontSize: 22, color: theme.textSecondary, fontFamily: Type.num, backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 6, paddingVertical: 4 }}
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
                <ButtonShine radius={8} />
                <Text style={{ fontSize: 22, color: theme.accentBlue, fontFamily: Type.ui, lineHeight: 26 }}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
          </View>
        )}

        {/* The Amount row (number + its own unit dropdown) was REMOVED here 2026-07-22. It asked the
            same question as the Serving Size picker above -- "what does one of this mean?" -- in a
            second dropdown, with a stepper sandwiched between them. Three controls for one quantity.
            The units moved into the serving list, so the stepper above is now the only number to
            enter. `amountRowRef` still anchors the tutorial to the stepper row instead. */}

        {/* Nutrition */}
        <View style={styles.nutritionCard}>
          <Text style={styles.nutritionTitle}>
            {'Nutrition for '}
            {/* The quantity, nothing else. Spelling out the serving name here made headings like
                "Nutrition for 2 x 1 thin slice (approx 2" x 1-1/2" x 1/8")" wrap across two lines. */}
            <Text style={{ textTransform: 'none' }}>
              {isServingOnlyRecipe
                ? `${amount} ${amount === '1' ? 'serving' : 'servings'}`
                : `${amount} ${unitLabel(amountBaseUnit)}`}
            </Text>
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <MacroDonut protein={protein} carbs={carbs} fat={fat} calories={calories} theme={theme} />
            <View style={{ flex: 1, gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.macroProtein }} />
                <Text style={{ color: theme.textMuted, fontSize: 12, fontFamily: Type.ui, flex: 1 }}>Protein</Text>
                <GradientNumber value={`${protein}g`} color={theme.macroProtein} style={{ fontSize: 15, fontFamily: Type.uiSemibold }} />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.macroCarbs }} />
                <Text style={{ color: theme.textMuted, fontSize: 12, fontFamily: Type.ui, flex: 1 }}>Carbs</Text>
                <GradientNumber value={`${carbs}g`} color={theme.macroCarbs} style={{ fontSize: 15, fontFamily: Type.uiSemibold }} />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.macroFat }} />
                <Text style={{ color: theme.textMuted, fontSize: 12, fontFamily: Type.ui, flex: 1 }}>Fat</Text>
                <GradientNumber value={`${fat}g`} color={theme.macroFat} style={{ fontSize: 15, fontFamily: Type.uiSemibold }} />
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
                  <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: Type.uiBold, letterSpacing: 2, textTransform: 'uppercase' }}>Extended Fats</Text>
                  <Ionicons name={fatsOpen ? 'chevron-up' : 'chevron-down'} size={13} color={theme.textDim} />
                </TouchableOpacity>
                {fatsOpen && rows.map(r => (
                  <View key={r.label} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderTopWidth: 0.5, borderTopColor: theme.borderSubtle }}>
                    <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: Type.ui }}>{r.label}</Text>
                    <Text style={{ fontSize: 12, color: theme.textSecondary, fontFamily: Type.uiMedium }}>{r.val}{r.unit}</Text>
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
                  <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: Type.uiBold, letterSpacing: 2, textTransform: 'uppercase' }}>Carb Breakdown</Text>
                  <Ionicons name={carbsOpen ? 'chevron-up' : 'chevron-down'} size={13} color={theme.textDim} />
                </TouchableOpacity>
                {carbsOpen && rows.map(r => (
                  <View key={r.label} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderTopWidth: 0.5, borderTopColor: theme.borderSubtle }}>
                    <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: Type.ui }}>{r.label}</Text>
                    <Text style={{ fontSize: 12, color: theme.textSecondary, fontFamily: Type.uiMedium }}>{r.val}{r.unit}</Text>
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
                  <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: Type.uiBold, letterSpacing: 2, textTransform: 'uppercase' }}>Other Nutrients</Text>
                  <Ionicons name={otherOpen ? 'chevron-up' : 'chevron-down'} size={13} color={theme.textDim} />
                </TouchableOpacity>
                {otherOpen && rows.map(r => (
                  <View key={r.label} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderTopWidth: 0.5, borderTopColor: theme.borderSubtle }}>
                    <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: Type.ui }}>{r.label}</Text>
                    <Text style={{ fontSize: 12, color: theme.textSecondary, fontFamily: Type.uiMedium }}>{r.val}{r.unit}</Text>
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
                  <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: Type.uiBold, letterSpacing: 2, textTransform: 'uppercase' }}>Vitamins</Text>
                  <Ionicons name={vitaminsOpen ? 'chevron-up' : 'chevron-down'} size={13} color={theme.textDim} />
                </TouchableOpacity>
                {vitaminsOpen && rows.map(r => (
                  <View key={r.label} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderTopWidth: 0.5, borderTopColor: theme.borderSubtle }}>
                    <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: Type.ui }}>{r.label}</Text>
                    <Text style={{ fontSize: 12, color: theme.textSecondary, fontFamily: Type.uiMedium }}>{r.val}{r.unit}</Text>
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
            const thiamin    = computeExtended('thiamin',    'Thiamin');
            const riboflavin = computeExtended('riboflavin', 'Riboflavin');
            const niacin     = computeExtended('niacin',     'Niacin');
            const choline    = computeExtended('choline',    'Choline');
            const rows = [
              { label: 'Vitamin B6', val: b6,     unit: 'mg'  },
              { label: 'Folate',     val: folate,  unit: 'mcg' },
              { label: 'Vitamin B12', val: b12,   unit: 'mcg' },
              { label: 'Biotin',     val: biotin,  unit: 'mcg' },
              { label: 'Thiamin',    val: thiamin,    unit: 'mg'  },
              { label: 'Riboflavin', val: riboflavin, unit: 'mg'  },
              { label: 'Niacin',     val: niacin,     unit: 'mg'  },
              { label: 'Choline',    val: choline,    unit: 'mg'  },
            ].filter(r => r.val !== null && r.val !== 0);
            if (rows.length === 0) return null;
            return (
              <View style={{ marginTop: 4 }}>
                <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setBVitaminsOpen(o => !o); }} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: theme.borderSubtle }}>
                  <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: Type.uiBold, letterSpacing: 2, textTransform: 'uppercase' }}>B Vitamins</Text>
                  <Ionicons name={bVitaminsOpen ? 'chevron-up' : 'chevron-down'} size={13} color={theme.textDim} />
                </TouchableOpacity>
                {bVitaminsOpen && rows.map(r => (
                  <View key={r.label} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderTopWidth: 0.5, borderTopColor: theme.borderSubtle }}>
                    <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: Type.ui }}>{r.label}</Text>
                    <Text style={{ fontSize: 12, color: theme.textSecondary, fontFamily: Type.uiMedium }}>{r.val}{r.unit}</Text>
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
                  <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: Type.uiBold, letterSpacing: 2, textTransform: 'uppercase' }}>Minerals</Text>
                  <Ionicons name={mineralsOpen ? 'chevron-up' : 'chevron-down'} size={13} color={theme.textDim} />
                </TouchableOpacity>
                {mineralsOpen && rows.map(r => (
                  <View key={r.label} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderTopWidth: 0.5, borderTopColor: theme.borderSubtle }}>
                    <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: Type.ui }}>{r.label}</Text>
                    <Text style={{ fontSize: 12, color: theme.textSecondary, fontFamily: Type.uiMedium }}>{r.val}{r.unit}</Text>
                  </View>
                ))}
              </View>
            );
          })()}
        </View>

        {foodStats && foodStats.count > 0 && (
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16, marginTop: -4 }}>
            <View style={{ flex: 1, backgroundColor: theme.bgCard, borderRadius: 8, borderWidth: 0.5, borderColor: theme.borderCard, borderTopWidth: 1.5, borderTopColor: theme.accentBlueRaw, padding: 10, shadowColor: theme.cardShadow, shadowOpacity: theme.cardShadowOpacity, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 6 }}>
              <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: Type.uiBold, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2 }}>LOGGED</Text>
              <GradientNumber value={`${foodStats.count}x`} color={theme.textSecondary} style={{ fontSize: 18, fontFamily: Type.num }} />
            </View>
            <View style={{ flex: 1.8, backgroundColor: theme.bgCard, borderRadius: 8, borderWidth: 0.5, borderColor: theme.borderCard, borderTopWidth: 1.5, borderTopColor: theme.accentBlueRaw, padding: 10, shadowColor: theme.cardShadow, shadowOpacity: theme.cardShadowOpacity, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 6 }}>
              <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: Type.uiBold, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2 }}>LAST LOGGED</Text>
              <GradientNumber
                value={foodStats.lastDate ? new Date(foodStats.lastDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '--'}
                color={theme.textSecondary}
                style={{ fontSize: 18, fontFamily: Type.num }}
              />
            </View>
            <View style={{ flex: 1.8, backgroundColor: theme.bgCard, borderRadius: 8, borderWidth: 0.5, borderColor: theme.borderCard, borderTopWidth: 1.5, borderTopColor: theme.accentBlueRaw, padding: 10, shadowColor: theme.cardShadow, shadowOpacity: theme.cardShadowOpacity, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 6 }}>
              <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: Type.uiBold, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2 }}>AVG SERVING</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <GradientNumber
                  value={foodStats.avgGrams > 0 ? String(Math.round(foodStats.avgGrams)) : '--'}
                  color={theme.textSecondary}
                  style={{ fontSize: 18, fontFamily: Type.num }}
                />
                {foodStats.avgGrams > 0 && <Text style={{ fontSize: 12, color: theme.textSecondary, fontFamily: Type.uiMedium, marginLeft: 1 }}>{unitLabel(effectiveServing?.unit || food?.servingUnitType || 'g')}</Text>}
              </View>
            </View>
          </View>
        )}

        {calPer100g === 0 && !hasFlatExtended && (
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
          onShow={() => {
            timePickerAnim.setValue(0);
            Animated.spring(timePickerAnim, { toValue: 1, useNativeDriver: true, damping: 18, stiffness: 260 }).start();
          }}
          onRequestClose={closeTimePicker}>
          <Animated.View style={[styles.pickerOverlay, { opacity: timePickerAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' }) }]}>
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeTimePicker} />
            <Animated.View style={[styles.pickerCard, { transform: [{ scale: timePickerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }] }]}>
              <ModalHeader title="Time Logged" onClose={closeTimePicker} />
              <View style={{ alignItems: 'center' }}>
                {/* Sized to the CARD, not the screen. The spinner is a native view that needs a real
                    width, and the old screen-width figure was set when this was a full-width sheet. */}
                <DateTimePicker
                  mode="time"
                  value={entryTime}
                  display="spinner"
                  textColor={theme.textPrimary}
                  style={{ width: Dimensions.get('window').width * 0.88 - 32 }}
                  onChange={(event, date) => {
                    if (date) { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setEntryTime(date); setHasChanges(true); }
                  }}
                />
              </View>
              {/* One Done, in the accent. It replaces a Confirm/Cancel pair that both did exactly the
                  same thing: the spinner applies the time as you scroll it, so Cancel never cancelled
                  anything. Green is reserved for success and goal-hits in this app, not for a button
                  that simply closes a picker. */}
              <View style={{ paddingHorizontal: 16, paddingBottom: 16, paddingTop: 4 }}>
                <PrimaryCTA
                  label="Done"
                  onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); closeTimePicker(); }}
                  faceStyle={{ paddingVertical: 12, borderRadius: 8 }}
                />
              </View>
            </Animated.View>
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

{/* Centred card, not the slide-up sheet this used to be. Options are real selectable rows -- filled and
    outlined in the accent when chosen -- rather than a bare list separated by hairlines, which read as
    text you couldn't tell was tappable. The Cancel row is gone: the header X and tap-outside both close
    it, and picking a slot closes it too, so a third dismiss was just noise. */}
<Modal
  visible={showMealPicker}
  transparent
  animationType="none"
  onShow={() => {
    mealDropdownAnim.setValue(0);
    Animated.spring(mealDropdownAnim, { toValue: 1, useNativeDriver: true, damping: 18, stiffness: 260 }).start();
  }}
  onRequestClose={closeMealPicker}>
  {/* Opacity is clamped: the spring overshoots past 1 on its way to settling, and an un-clamped
      opacity would flicker as it does. */}
  <Animated.View style={[styles.pickerOverlay, { opacity: mealDropdownAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' }) }]}>
    <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeMealPicker} />
    <Animated.View style={[styles.pickerCard, { transform: [{ scale: mealDropdownAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }] }]}>
      <ModalHeader title="Adding To" onClose={closeMealPicker} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 8, gap: 8 }} showsVerticalScrollIndicator={false}>
        {/* ⚠️ ITEM C, PART B: liveSlots, not mealSlots. This is a DESTINATION picker -- offering a sleeping
            slot would let somebody log food into one that will not show on today. */}
        {liveSlots.map((slot) => {
          const selected = currentMeal === slot.id || currentMeal === slot.name;
          return (
            <TouchableOpacity
              key={slot.id}
              activeOpacity={0.8}
              style={[styles.mealOptionRow, {
                backgroundColor: selected ? theme.accentBlueBg : theme.bgInput,
                borderColor: selected ? theme.accentBlueBorder : theme.borderInput,
              }]}
              onPress={() => {
                triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                setCurrentMeal(slot.id);
                setHasChanges(true);
                closeMealPicker();
              }}>
              <Text style={{ fontSize: 15, fontFamily: selected ? Type.uiSemibold : Type.uiMedium, color: selected ? theme.accentBlue : theme.textSecondary }}>{slot.name}</Text>
              {selected && <Ionicons name="checkmark" size={16} color={theme.accentBlue} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </Animated.View>
  </Animated.View>
</Modal>

{/* MOLDED, and ACCENT rather than accentGreen. Green means SUCCESS / goal-hit in this app -- "you did it"
    -- so spending it on a button that STARTS an action diluted the one job it is good at. This is an
    action, not an outcome. PrimaryCTA also owns the disabled state, so the hand-rolled opacity: 0.4 goes.
    The ref is a TUTORIAL target and PrimaryCTA takes no ref, so it moves to a wrapper View. */}
<View ref={saveButtonRef as any} collapsable={false} style={{ marginBottom: 12 }}>
  <PrimaryCTA
    label={isRecipeMode ? 'Add to Recipe' : isEditing ? 'Update Entry' : 'Add to Diary'}
    onPress={saveEntry}
    disabled={isEditing && !hasChanges}
  />
</View>

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
                      saveToFirebase(date, 'entries', entries).catch(() => {}); // fire-and-forget: don't block nav on the secondary write
                      showToast('Removed from log', undefined, 'success');
                      if (router.canGoBack()) router.back();
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

      {/* Save as Copy */}
      {foodCapWall && (
        <CapWallModal
          capKey="foods"
          cap={capFor('foods', isSupporter) ?? 0}
          count={foodCap.count}
          theme={theme}
          onDismiss={() => setFoodCapWall(false)}
        />
      )}

      {/* ⚠️ onSaved FIRES NO TOAST, deliberately. CustomFoodCreator fires its own "Food saved" on the way
          out, so this used to double-toast a single save -- and this one named `food.description`, the food
          you copied FROM, so renaming during a clone made it announce the wrong food. The creator's toast is
          the one all five doors share and the only one carrying the free-plan count. Closing the sheet still
          belongs here. */}
      <CustomFoodCreator
        visible={showSaveAsCopy}
        onClose={() => setShowSaveAsCopy(false)}
        onSaved={() => { setShowSaveAsCopy(false); refreshFoodCap(); }}
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

      {/* Barcode scanner for SET. Its own lightweight viewfinder rather than routing through Add Food's
          scanner: that one runs a whole lookup-and-results flow, and this only needs the digits. */}
      <Modal visible={scanningForLink} animationType="slide" onRequestClose={() => setScanningForLink(false)}>
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <CameraView
            style={StyleSheet.absoluteFillObject}
            onBarcodeScanned={handleLinkScan}
            barcodeScannerSettings={{ barcodeTypes: ['upc_a', 'upc_e', 'ean13', 'ean8'] }}
          />
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '30%', backgroundColor: 'rgba(0,0,0,0.55)' }} />
            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '35%', backgroundColor: 'rgba(0,0,0,0.55)' }} />
            <View style={{ position: 'absolute', top: '30%', bottom: '35%', left: 0, width: '10%', backgroundColor: 'rgba(0,0,0,0.55)' }} />
            <View style={{ position: 'absolute', top: '30%', bottom: '35%', right: 0, width: '10%', backgroundColor: 'rgba(0,0,0,0.55)' }} />
            <View style={{ width: '80%', aspectRatio: 2.5, position: 'relative' }}>
              <View style={{ position: 'absolute', top: 0, left: 0, width: 28, height: 28, borderTopWidth: 3, borderLeftWidth: 3, borderColor: theme.accentBlueRaw, borderTopLeftRadius: 4 }} />
              <View style={{ position: 'absolute', top: 0, right: 0, width: 28, height: 28, borderTopWidth: 3, borderRightWidth: 3, borderColor: theme.accentBlueRaw, borderTopRightRadius: 4 }} />
              <View style={{ position: 'absolute', bottom: 0, left: 0, width: 28, height: 28, borderBottomWidth: 3, borderLeftWidth: 3, borderColor: theme.accentBlueRaw, borderBottomLeftRadius: 4 }} />
              <View style={{ position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderBottomWidth: 3, borderRightWidth: 3, borderColor: theme.accentBlueRaw, borderBottomRightRadius: 4 }} />
            </View>
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, fontFamily: Type.ui, marginTop: 14, letterSpacing: 1 }}>
              Scan this food's barcode
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontFamily: Type.ui, marginTop: 4 }}>
              Future scans will open {food?.description}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setScanningForLink(false); }}
            style={{ position: 'absolute', bottom: insets.bottom + 30, alignSelf: 'center', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.14)' }}>
            <Text style={{ color: '#fff', fontSize: 15, fontFamily: Type.uiSemibold }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Serving Picker -- a centered floating card, not the bottom sheet it used to be. A FatSecret
          staple like generic chicken carries 15+ servings, which used to grow past the screen with no
          scroll and no way out except picking one. Capped and scrollable now, and it follows the app's
          own modal standard: handle pill, gradient title, X, top accent border, tap-outside to close. */}
      <Modal visible={showServingPicker} transparent animationType="none" onShow={() => {
        servingPickerAnim.setValue(0);
        Animated.spring(servingPickerAnim, { toValue: 1, useNativeDriver: true, damping: 20, stiffness: 300 }).start();
      }}>
        <Animated.View style={[styles.centeredOverlay, { opacity: servingPickerAnim }]}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={closeServingPicker} />
          <Animated.View
            style={[styles.centeredCard, { transform: [{ scale: servingPickerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }] }]}
            pointerEvents="box-none">
            <ModalHeader title="Select Serving Size" subtitle="What should one serving be?" onClose={closeServingPicker} />
            {/* Row CARDS, matching the food library's search results -- same left accent edge, same
                name-over-detail stack, same green kcal with its caption. A serving like "1 thin slice
                (approx 2" x 1-1/2" x 1/8")" is split at the parenthesis so the measurement becomes the
                quiet second line instead of one long wrapping string. */}
            <ScrollView style={{ width: '100%' }} contentContainerStyle={{ paddingVertical: 8 }}>
              {[
                { key: 'units', title: unitServingBase === 'ml' ? 'By Volume' : 'By Weight', rows: unitServings },
                { key: 'named', title: 'Common Servings', rows: namedServings },
              ].filter(sec => sec.rows.length > 0).map(sec => (
                <View key={sec.key}>
                  <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: Type.uiBold, letterSpacing: 2, textTransform: 'uppercase', marginTop: 8, marginBottom: 6, marginHorizontal: 16 }}>
                    {sec.title}
                  </Text>
                  {sec.rows.map((s: any, i: number) => {
                    const active = selectedServing?.label === s.label;
                    const raw = String(s.label ?? '');
                    const parenAt = raw.indexOf('(');
                    const title = parenAt > 0 ? raw.slice(0, parenAt).trim() : raw;
                    const detail = parenAt > 0 ? raw.slice(parenAt).replace(/^\(|\)$/g, '').trim() : null;
                    return (
                      <TouchableOpacity
                        key={`${sec.key}_${i}`}
                        style={[styles.servingRow, active && { borderColor: theme.accentBlueBorder, backgroundColor: theme.accentBlueBg }]}
                        onPress={() => {
                          triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                          setSelectedServing(s);
                          setAmount(s.grams > 0 ? s.grams.toString() : '100');
                          setAmountChanged(false);
                          setServingCount(1);
                          setServingCountStr('1');
                          // Picking a serving IS a deliberate change. Without this, a food that
                          // displays its stored values (any of your own foods) kept showing them
                          // whatever you chose -- "Nutrition for 1 g" reading 130 kcal, a whole bar.
                          setServingCountTouched(true);
                          setHasChanges(true);
                          closeServingPicker();
                        }}>
                        <View style={{ flex: 1, marginRight: 12 }}>
                          <GradientNumber
                            value={title}
                            color={active ? theme.accentBlue : theme.textSecondary}
                            style={{ fontSize: 14, fontFamily: Type.uiSemibold }}
                          />
                          {/* Every serving carries its WEIGHT, the way Cronometer lists "cup - 245g".
                              It's what makes a serving checkable against the package: a bag reading
                              "28g / about 12 chips" against an entry called "15 chips" looks wrong
                              until you can see they're both 28 g. */}
                          {(detail || servingWeightSuffix(s)) && (
                            <Text style={{ fontSize: 11, color: theme.textMuted, fontFamily: Type.ui, marginTop: 1 }}>
                              {[detail, servingWeightSuffix(s)].filter(Boolean).join(' · ')}
                            </Text>
                          )}
                        </View>
                        {/* Calories only on the named servings. Comparing "1 cup = 320" against
                            "1 slice = 17" is a real decision; comparing "1 g = 2" against "1 oz = 67"
                            is not -- you pick whichever unit your scale reads. */}
                        {!s.isUnit && (
                          <View style={{ alignItems: 'flex-end', minWidth: 46 }}>
                            <GradientNumber value={String(s.calories)} color={theme.accentGreen} style={{ fontSize: 20, fontFamily: Type.num }} />
                            <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: Type.ui, marginTop: -2 }}>kcal</Text>
                          </View>
                        )}
                        {active && <Ionicons name="checkmark" size={16} color={theme.accentBlue} style={{ marginLeft: 8 }} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </ScrollView>
          </Animated.View>
        </Animated.View>
      </Modal>

      <EditFoodModal
        visible={showEditFoodModal}
        editFoodData={editFoodData}
        setEditFoodData={setEditFoodData}
        onSave={saveEditFoodFromDetail}
        onClose={closeEditFoodModal}
      />

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
              style={{ paddingHorizontal: 28, paddingVertical: 12, backgroundColor: theme.accentBlueRaw, borderRadius: 10 }}>
              {/* SOLID accent, not the 10% tint. This button lives on a 96%-BLACK fullscreen overlay, so a
                  translucent tint just showed the black through and the button read as a dark hole -- the
                  same "translucent fill with nothing opaque behind it" bug as Stats' VIEW ALL ACHIEVEMENTS,
                  except accentBlueBgOpaque cannot help: that token is pre-composited against a LIGHT surface.
                  On black, the fill has to be opaque itself. `solid` on the shine because this is now a fixed
                  bright fill, which carries a real reflection instead of the softened tinted-button value.
                  Its neighbour "Remove" stays flat and outlined on purpose: DESTRUCTIVE. */}
              <ButtonShine radius={10} solid />
              <Text style={{ color: '#ffffff', fontSize: 15, fontFamily: Type.uiSemibold }}>Replace</Text>
            </TouchableOpacity>
            {/* FULL red, not the 15% tint. Same reason as Replace beside it: on a 96%-black overlay a
                translucent fill just shows the black, so the button was nearly invisible. NO shine -- it is
                destructive, and shine says "press me". Solid red carries it here; the gloss is not needed to
                make it visible, only opacity was. */}
            <TouchableOpacity
              onPress={handlePhotoRemove}
              style={{ paddingHorizontal: 28, paddingVertical: 12, backgroundColor: '#cc3333', borderRadius: 10 }}>
              <Text style={{ color: '#ffffff', fontSize: 15, fontFamily: Type.uiSemibold }}>Remove</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => setShowPhotoFullscreen(false)} style={{ marginTop: 20, padding: 8 }}>
            <Text style={{ color: theme.textMuted, fontSize: 13, fontFamily: Type.uiMedium }}>Close</Text>
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
  backBtnText: { color: theme.accentBlue, fontSize: 14, fontFamily: Type.uiMedium },
  headerTitle: { ...PAGE_TITLE, color: theme.accentBlueRaw, flex: 1 },
  // paddingBottom clears the global Otto FAB (AssistantOverlay in _layout.tsx: 56px disc at bottom: 18),
  // which was sitting on the corner of ADD TO DIARY. Scrolled to the end, the button now lands above it.
  content: { padding: 16, paddingBottom: 96 },
  foodName: { fontSize: 18, color: theme.textSecondary, fontFamily: Type.uiSemibold, marginBottom: 20, lineHeight: 24 },
  unitRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  unitBtn: { flex: 1, padding: 10, backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 6, alignItems: 'center' },
  unitBtnActive: { backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder },
  unitBtnText: { fontSize: 14, color: theme.textMuted, fontFamily: Type.uiSemibold },
  unitBtnTextActive: { color: theme.accentBlue },
  amountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  amountLabel: { fontSize: 14, color: theme.textMuted, fontFamily: Type.ui },
  amountInput: { backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, color: theme.textSecondary, padding: 12, fontSize: 24, fontFamily: Type.num, width: 120, textAlign: 'center' },
  // Had NO shadow at all -- not clipped, not hardcoded, just never given one. It got away with it while
  // Light's ground was the old grey #e3e6ee (a white card had value contrast to lean on); on the
  // brightened #f2f3f7 there is nothing left to separate it from the page.
  nutritionCard: { backgroundColor: theme.bgCard, borderWidth: 1, borderColor: theme.borderCard, borderRadius: 10, padding: 16, marginBottom: 20, shadowColor: theme.cardShadow, shadowOpacity: theme.cardShadowOpacity, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 6 },
  nutritionTitle: { fontSize: 11, color: theme.textMuted, fontFamily: Type.uiMedium, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 },
  nutritionRow: { flexDirection: 'row', justifyContent: 'space-between' },
  nutritionStat: { alignItems: 'center', flex: 1 },
  nutritionVal: { fontSize: 28, fontFamily: Type.num, letterSpacing: 1 },
  nutritionLabel: { fontSize: 10, color: theme.textMuted, fontFamily: Type.ui, marginTop: 2 },
  noDataText: { fontSize: 12, color: theme.textMuted, fontStyle: 'italic', fontFamily: Type.ui, marginBottom: 16, textAlign: 'center' },
  // logBtn / logBtnText removed 2026-07-15: the Add to Diary button is PrimaryCTA now, which owns its own
  // fill, mould, label face and disabled state.
  deleteBtn: { backgroundColor: '#cc3333', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center', marginTop: 8, alignSelf: 'center', minWidth: 220 },
  deleteBtnText: { color: theme.bgPrimary, fontSize: 16, fontFamily: Type.uiBold, letterSpacing: 2 },
  mealSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, padding: 12, marginBottom: 10 },
  mealSelectorLabel: { fontSize: 12, color: theme.textMuted, fontFamily: Type.ui },
  mealSelectorValue: { fontSize: 14, color: theme.accentBlue, fontFamily: Type.uiSemibold },
  // (The old bottom-sheet `modalOverlay` / `modal` pair lived here. Both pickers on this screen are
  // centred cards now, so the styles were removed rather than left lying around for someone to reuse
  // and reintroduce a slide-up sheet.)
  // Centred floating card, the app's standard modal shape. Kept separate from modalOverlay/modal
  // above, which the meal and time pickers still use -- those weren't part of this change.
  centeredOverlay: { flex: 1, backgroundColor: theme.overlayBg, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  // Deliberately mirrors add-food's `resultItem`: the food library's row is the app's most-used list
  // shape, and the picker previously read as a plain iOS settings list bolted onto the screen.
  servingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 12, marginVertical: 4,
    minHeight: 64,
    backgroundColor: theme.bgCard,
    borderWidth: 0.5, borderColor: theme.borderCard,
    borderTopColor: 'rgba(255,255,255,0.1)',
    borderLeftWidth: 3, borderLeftColor: theme.accentBlueRaw,
    borderRadius: 10, padding: 14,
    shadowColor: theme.cardShadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: theme.cardShadowOpacity, shadowRadius: 6,
  },
  centeredCard: {
    width: '100%', maxHeight: '70%',
    backgroundColor: theme.bgSheet,
    borderRadius: 16,
    borderWidth: 0.5, borderColor: theme.borderCard,
    borderTopWidth: 1.5, borderTopColor: theme.accentBlueRaw,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 12,
  },
  modalTitle: { fontSize: 18, color: theme.textPrimary, fontFamily: Type.uiSemibold, marginBottom: 16 },
  // A compact control on the right of its row, not a full-width panel. maxWidth keeps it from
  // swallowing the row when a serving name is long; the text inside clamps to two lines.
  // Styled like the stepper's own +/- buttons rather than as a card: it sits directly beside them,
  // and one "blue means tappable" language reads as deliberate where two did not. The top accent
  // border went with the card shape it was drawn for.
  servingPickerBtn: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', flexShrink: 1,
    maxWidth: '62%', minHeight: 44,
    backgroundColor: theme.accentBlueBg,
    borderWidth: 1, borderColor: theme.accentBlueBorder,
    borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12,
    overflow: 'hidden',
  },
  servingPickerLabel: { fontSize: 10, color: theme.textMuted, fontFamily: Type.uiBold, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 3 },
  servingPickerValue: { fontSize: 15, color: theme.textPrimary, fontFamily: Type.uiSemibold },
  servingPickerCal: { fontSize: 18, color: theme.accentGreen, fontFamily: Type.num },
  // Centred picker card, shared by the meal-slot picker and the time picker. Both used to be slide-up
  // sheets, which the project bans outright.
  pickerOverlay: { flex: 1, backgroundColor: theme.overlayBg, justifyContent: 'center', alignItems: 'center' },
  pickerCard: {
    width: '88%', maxHeight: '80%', backgroundColor: theme.bgSheet, borderRadius: 16,
    borderWidth: 0.5, borderColor: theme.borderCard, borderTopWidth: 1.5, borderTopColor: theme.accentBlue,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 20,
  },
  mealOptionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1 },
  mealOptionActive: { backgroundColor: theme.accentGreenBg },
});
