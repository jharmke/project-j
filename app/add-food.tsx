import { Ionicons } from '@/components/AppIcons';
import { Text, TextInput } from '@/components/AppText';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Camera, CameraView } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { triggerHaptic, triggerHapticNotification } from '@/utils/haptics';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, FlatList, Image, Linking, Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Reanimated, { Easing as ReEasing, runOnJS, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { Svg, Path, G } from 'react-native-svg';
import { useToast } from '../components/Toast';
import CustomFoodCreator from '../components/CustomFoodCreator';
import CapWallModal from '../components/CapWallModal';
import { GOLD_BASE } from '../components/SupporterFoil';
import { useMembership } from '../MembershipContext';
import { capStateFrom, capFor, checkCap } from '../utils/caps';
import { USDA_API_KEY } from '../config';
import { app, db, getUserId, loadFromFirebase, saveToFirebase } from '../firebaseConfig';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { storageSet } from '../utils/storage';
import { purgeFoodPhoto } from '../utils/foodPhotos';
import { purgeRecipePhoto } from '../utils/recipePhotos';
import { getMealDisplayName, MealSlot, loadMealSlots } from '../utils/mealSlots';
import { setCameraActive } from '../utils/assistantFab';
import { unitLabel } from '../utils/unitConversion';
import { loadLabelCache, getCachedLabel, labelFromMyFood, resolveFsLabel } from '../utils/foodLabel';
import { useTheme } from '../theme';
import { useTutorial } from '../context/TutorialContext';
import { useTutorialTarget } from '../hooks/useTutorialTarget';
import { TUTORIAL_CHICKEN_BREAST } from '../data/tutorialFood';
import { Type, PAGE_TITLE } from '../typography';
import ScreenHeader from '../components/ScreenHeader';
import HeaderIconButton from '../components/HeaderIconButton';
import ButtonShine from '../components/ButtonShine';
import GradientTitle from '../components/GradientTitle';
import GradientNumber from '../components/GradientNumber';
import FabDome from '../components/FabDome';
import BackgroundLayers from '../components/BackgroundLayers';
import PrimaryCTA from '../components/PrimaryCTA';
import ModalHeader from '../components/ModalHeader';
import EditFoodModal from '../components/EditFoodModal';




interface MyFood {
  id?: string;
  name: string;
  cal: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  cholesterol?: number;
  saturatedFat?: number;
  servingSize?: number;
  servingUnit?: string;
  fsId?: string | null;
  brand?: string;
  isCustom?: boolean;
  type?: 'supplement' | 'food';
}

interface SearchResult {
  description: string;
  foodNutrients: any[];
  isMyFood?: boolean;
  isRecipe?: boolean;
  recipeData?: any;
  cal?: number;
}

// ─── FatSecret access (via server-side proxy) ───────────────────────────────
// Signing moved server-side (functions/src/fatSecretProxy.ts) so the OAuth consumer key + secret
// are no longer bundled in the app. The client just names a method + params; the function signs the
// request and calls FatSecret, returning the same raw JSON the direct call used to return.
//
// Throws on a transport/proxy failure so callers can still tell "offline" from a genuine empty
// result (the offline-as-not-found distinction the barcode + search flows depend on).
async function callFatSecretProxy(method: string, params: Record<string, string>): Promise<any> {
  const callable = httpsCallable(getFunctions(app), 'fatSecretProxy');
  const res = await callable({ method, params });
  const data = (res.data ?? {}) as { ok?: boolean; data?: any; reason?: string; status?: number };
  if (!data.ok) {
    throw new Error(`FatSecret proxy failed (${data.reason ?? 'unknown'}${data.status ? ' ' + data.status : ''})`);
  }
  return data.data;
}

// Parse FatSecret food_description string: "Per 1 cup - Calories: 52kcal | Fat: 0.17g | Carbs: 13.81g | Protein: 0.26g"
function parseFsDescription(desc: string) {
  const cal = parseFloat(desc.match(/Calories:\s*([\d.]+)/i)?.[1] || '0');
  const fat = parseFloat(desc.match(/Fat:\s*([\d.]+)/i)?.[1] || '0');
  const carbs = parseFloat(desc.match(/Carbs:\s*([\d.]+)/i)?.[1] || '0');
  const protein = parseFloat(desc.match(/Protein:\s*([\d.]+)/i)?.[1] || '0');
  return { cal, fat, carbs, protein };
}

// Convert FatSecret food object (from foods.search) to SearchResult shape
function normalizeFsSearchResult(food: any): SearchResult {
  const desc = food.food_description || '';
  const { cal, fat, carbs, protein } = parseFsDescription(desc);
  const brand = food.brand_name ? ` · ${food.brand_name}` : '';
  // Extract gram weight from serving description e.g. "Per 2 patties (56g) - ..."
  const gramsMatch = desc.match(/\((\d+(?:\.\d+)?)\s*g\)/i);
  const fsServingGrams = gramsMatch ? parseFloat(gramsMatch[1]) : 0;
  return {
    description: `${food.food_name}${brand}`,
    foodNutrients: [
      { nutrientName: 'Energy', unitName: 'KCAL', value: Math.round(cal) },
      { nutrientName: 'Protein', unitName: 'G', value: protein },
      { nutrientName: 'Carbohydrate, by difference', unitName: 'G', value: carbs },
      { nutrientName: 'Total lipid (fat)', unitName: 'G', value: fat },
    ],
    fsId: food.food_id,
    fsServingGrams,
  } as any;
}

// Convert FatSecret food.get serving to SearchResult shape
function normalizeFsServing(food: any): SearchResult | null {
  try {
    let servings = food.servings?.serving;
    if (!servings) return null;
    if (!Array.isArray(servings)) servings = [servings];
    // Prefer first non-100g serving, fall back to first
    const serving = servings.find((s: any) => !s.serving_description?.toLowerCase().includes('100g')) || servings[0];
    const brand = food.brand_name ? ` · ${food.brand_name}` : '';
    return {
      description: `${food.food_name}${brand}`,
      fromBarcode: true,
      foodNutrients: [
        { nutrientName: 'Energy', unitName: 'KCAL', value: Math.round(parseFloat(serving.calories || '0')) },
        { nutrientName: 'Protein', unitName: 'G', value: parseFloat(serving.protein || '0') },
        { nutrientName: 'Carbohydrate, by difference', unitName: 'G', value: parseFloat(serving.carbohydrate || '0') },
        { nutrientName: 'Total lipid (fat)', unitName: 'G', value: parseFloat(serving.fat || '0') },
        { nutrientName: 'Fiber, total dietary', unitName: 'G', value: parseFloat(serving.fiber || '0') },
        { nutrientName: 'Sugars, total including NLEA', unitName: 'G', value: parseFloat(serving.sugar || '0') },
        { nutrientName: 'Sodium, Na', unitName: 'MG', value: parseFloat(serving.sodium || '0') },
        { nutrientName: 'Cholesterol', unitName: 'MG', value: parseFloat(serving.cholesterol || '0') },
        { nutrientName: 'Fatty acids, total saturated', unitName: 'G', value: parseFloat(serving.saturated_fat || '0') },
      ],
      fsId: food.food_id,
      fsServingDesc: serving.serving_description,
    } as any;
  } catch { return null; }
}

function normalizeForMatch(s: string): string {
  return s.toLowerCase().replace(/[-']/g, ' ').replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

function normalizeQueryForApi(q: string): string {
  return q
    .replace(/[‘’‚‛]/g, '') // strip iOS curly apostrophes
    .replace(/'/g, '')                           // strip straight apostrophes
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function callFatSecretApi(q: string): Promise<SearchResult[]> {
  const data = await callFatSecretProxy('foods.search', {
    search_expression: q,
    max_results: '20',
  });
  const foods = data?.foods?.food;
  if (!foods) return [];
  const arr = Array.isArray(foods) ? foods : [foods];
  return arr.map(normalizeFsSearchResult);
}

async function fetchFatSecretSearch(q: string): Promise<SearchResult[]> {
  const words = q.trim().split(' ');
  const last = words[words.length - 1];
  const pluralQ = last && last.length >= 5 && !last.endsWith('s')
    ? [...words.slice(0, -1), last + 's'].join(' ')
    : null;

  // The primary query is allowed to throw on a network/HTTP failure so callers can tell
  // "offline" from "no results". The plural variant is best-effort enrichment -- its failure
  // must never sink a good primary, so it swallows its own error.
  const [primary, secondary] = await Promise.all([
    callFatSecretApi(q),
    pluralQ ? callFatSecretApi(pluralQ).catch(() => [] as SearchResult[]) : Promise.resolve([] as SearchResult[]),
  ]);

  const seen = new Set<string>();
  const merged: SearchResult[] = [];
  for (const r of [...secondary, ...primary]) {
    const key = (r as any).fsId ?? r.description;
    if (!seen.has(key)) { seen.add(key); merged.push(r); }
  }
  return merged;
}

async function fetchFatSecretBarcode(barcode: string): Promise<SearchResult | null> {
  // Network/HTTP failures throw (caller shows a connection error); null is reserved for a genuine
  // "barcode not in the database" so the two are never confused (the offline-as-not-found bug).
  // Step 1: barcode -> food_id
  const lookupData = await callFatSecretProxy('food.find_id_for_barcode', { barcode });
  const foodId = lookupData?.food_id?.value;
  if (!foodId || foodId === '0') return null; // FatSecret returns "0" for an unknown barcode

  // Step 2: food_id -> full food data
  const getData = await callFatSecretProxy('food.get.v4', { food_id: foodId });
  const food = getData?.food;
  if (!food) return null;
  return normalizeFsServing(food);
}

async function fetchFatSecretServings(fsId: string): Promise<any[]> {
  try {
    const data = await callFatSecretProxy('food.get.v4', { food_id: fsId });
    const food = data?.food;
    if (!food) return [];
    let servings = food.servings?.serving;
    if (!servings) return [];
    if (!Array.isArray(servings)) servings = [servings];
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
    console.log('FatSecret servings error', e);
    return [];
  }
}

// ─── End FatSecret helpers ───────────────────────────────────────────────────

function AnimatedSweep({ sweepProgress, color }: { sweepProgress: Animated.Value; color: string }) {
  const [arc, setArc] = useState('');
  useEffect(() => {
    const id = sweepProgress.addListener(({ value }) => {
      const angle = value * 360;
      const rad = (angle - 0.001) * Math.PI / 180;
      const x = 12 + 10 * Math.cos(rad);
      const y = 12 + 10 * Math.sin(rad);
      const large = angle > 180 ? 1 : 0;
      setArc(`M 12 2 A 10 10 0 ${large} 1 ${x.toFixed(3)} ${y.toFixed(3)}`);
    });
    return () => sweepProgress.removeListener(id);
  }, []);
  if (!arc) return null;
  return <Path d={arc} stroke={color} strokeWidth={2.5} fill="none" strokeLinecap="round" />;
}

export default function AddFoodScreen() {
  const insets = useSafeAreaInsets();
  const { theme, themeId } = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [myFoods, setMyFoods] = useState<MyFood[]>([]);
  const [scanning, setScanning] = useState(false);
  // Hide the Companion FAB while the barcode camera is open (a floating button over a live camera
  // preview is wrong). Increments the shared camera signal on open, decrements on close/unmount.
  useEffect(() => {
    if (!scanning) return;
    setCameraActive(true);
    return () => setCameraActive(false);
  }, [scanning]);
  const [closingCamera, setClosingCamera] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [viewfinderHeight, setViewfinderHeight] = useState(0);
  const scanFlash = useRef(new Animated.Value(0)).current;
  const cameraOpacity = useRef(new Animated.Value(0)).current;
  const scanningRef = useRef(false);
  const cameraReadyTimer = useRef<any>(null);
  const closeTimer = useRef<any>(null);

  const SCAN_COOLDOWN_MS = 10000;
  const { showToast } = useToast();
  const [scanCooldownActive, setScanCooldownActive] = useState(false);
  const scanCooldownTimer = useRef<any>(null);
  const sweepProgress = useRef(new Animated.Value(0)).current;

  const startCooldown = () => {
    setScanCooldownActive(true);
    sweepProgress.setValue(0);
    Animated.timing(sweepProgress, {
      toValue: 1,
      duration: SCAN_COOLDOWN_MS,
      useNativeDriver: false,
    }).start();
    if (scanCooldownTimer.current) clearTimeout(scanCooldownTimer.current);
    scanCooldownTimer.current = setTimeout(() => {
      setScanCooldownActive(false);
      sweepProgress.setValue(0);
    }, SCAN_COOLDOWN_MS);
  };

  const scanLineY = useSharedValue(0);
  const scanLineOpacity = useSharedValue(0);

  const scanLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanLineY.value }],
    opacity: scanLineOpacity.value,
  }));

  const startScanLineAnim = (containerHeight: number) => {
    if (containerHeight <= 0) return;
    scanLineY.value = 0;
    scanLineOpacity.value = 1;
    scanLineY.value = withRepeat(
      withSequence(
        withTiming(containerHeight - 2, { duration: 900, easing: ReEasing.inOut(ReEasing.quad) }),
        withTiming(0, { duration: 900, easing: ReEasing.inOut(ReEasing.quad) })
      ),
      3,
      false,
      (finished) => {
        if (finished) {
          scanLineOpacity.value = withTiming(0, { duration: 200 });
        }
      }
    );
  };
  const [showAddNew, setShowAddNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCal, setNewCal] = useState('');
  const [showCreateFood, setShowCreateFood] = useState(false);
  // ── Custom-food cap (item C). `myFoods` is already loaded on this screen for its own reasons, so the count
  // is free and updates the instant a food is deleted -- no extra read, no stale dim button.
  // ⚠️ membershipLoading is taken so an unknown answer NEVER dims a paying customer's button. See utils/caps.
  const { isSupporter, loading: membershipLoading } = useMembership();
  const [foodCapWall, setFoodCapWall] = useState(false);
  const foodCap = capStateFrom('foods', myFoods.length, isSupporter, membershipLoading);
  const [barcodeForCreate, setBarcodeForCreate] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);   // online search/barcode-name lookup failed (offline / server)
  const [barcodeLookup, setBarcodeLookup] = useState(false); // barcode -> food lookup in flight (separate from `scanning`, which is the camera being open)
  const [activeTab, setActiveTab] = useState<'recent' | 'myfoods' | 'favorites' | 'recipes' | 'pinned'>('recent');
  // Reset the results list to the top on tab switch so scroll position doesn't carry between tabs
  // (all tabs share one FlatList; only its data swaps). Matches the plans/devotionals reset idiom.
  const foodListRef = useRef<FlatList>(null);
  useEffect(() => {
    foodListRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [activeTab]);
  // Which food row is mid-open (openFoodDetail can await 1-2 FatSecret calls before navigating).
  // Drives a spinner + dim on the tapped row so the tap never reads as unresponsive.
  const [loadingItemKey, setLoadingItemKey] = useState<string | null>(null);
const [recentFoods, setRecentFoods] = useState<SearchResult[]>([]);
  // Bumped when a batch of label lookups finishes, so the lists rebuild from the now-warm cache.
  const [labelVersion, setLabelVersion] = useState(0);
const [favorites, setFavorites] = useState<MyFood[]>([]);
const [recipes, setRecipes] = useState<any[]>([]);
const { meal, date, selectMode, day, recipeMode, tutorialMode, tutorialTab, openCreate, openScanner } = useLocalSearchParams<{ meal: string; date: string; selectMode: string; day: string; recipeMode: string; tutorialMode: string; tutorialTab: string; openCreate: string; openScanner: string }>();
const isRecipeMode = recipeMode === 'true';
const isTutorialMode = tutorialMode === 'true';
const [isTutorialScanMode, setIsTutorialScanMode] = useState(false);
const [isTutorialCreateMode, setIsTutorialCreateMode] = useState(false);
const searchBarRef = useTutorialTarget('log_search_bar');
const barcodeIconRef = useTutorialTarget('add_food_barcode_icon');
const createFoodFabRef = useTutorialTarget('create_food_fab');
const tutorialRecipeRowRef = useTutorialTarget('recipe_library_row');
const tutorialRecipeDeleteRef = useTutorialTarget('recipe_library_delete_btn');
const addFoodTabPillsRef = useTutorialTarget('add_food_tab_pills');
const firstResultRef = useRef<View>(null);
const topResultRef = useRef<View>(null);
const setButtonRef = useRef<View>(null);
const unsetButtonRef = useRef<View>(null);
const createBarcodeRef = useRef<View>(null);
const { registerTarget, unregisterTarget, registerTutorialAction, unregisterTutorialAction } = useTutorial();
const [showEditMyFood, setShowEditMyFood] = useState(false);
const [showSavedFoodsSection, setShowSavedFoodsSection] = useState(false);
const [editFoodData, setEditFoodData] = useState<any>(null);
const [sortOption, setSortOption] = useState<'az' | 'za' | 'cal-hl' | 'cal-lh' | 'protein-hl'>('az');
const [showSortModal, setShowSortModal] = useState(false);
const sortOverlay = useSharedValue(0);
const sortScale = useSharedValue(0.92);
const sortOverlayStyle = useAnimatedStyle(() => ({ opacity: sortOverlay.value }));
const sortCardStyle = useAnimatedStyle(() => ({ transform: [{ scale: sortScale.value }] }));
const [lastScannedBarcode, setLastScannedBarcode] = useState<string | null>(null);
const [barcodeOverrides, setBarcodeOverrides] = useState<Record<string, any>>({});
const [showFabMenu, setShowFabMenu] = useState(false);
const fabScale = useRef(new Animated.Value(1)).current;
const fabItem1Anim = useRef(new Animated.Value(0)).current;
const fabItem2Anim = useRef(new Animated.Value(0)).current;
const fabItem3Anim = useRef(new Animated.Value(0)).current;
const fabItem4Anim = useRef(new Animated.Value(0)).current;
const [mealSlots, setMealSlots] = useState<MealSlot[]>([]);
const [slotNameCache, setSlotNameCache] = useState<Record<string, string>>({});
const favoriteOpacities = useRef<Record<string, Animated.Value>>({}).current;
const getFavOpacity = (name: string) => {
  if (!favoriteOpacities[name]) favoriteOpacities[name] = new Animated.Value(1);
  return favoriteOpacities[name];
};

const openEditModal = (food: any) => {
  setEditFoodData({
    _source: food,
    name: food.name || food.description || '',
    brand: food.brand?.toString() || '',
    cal: food.cal?.toString() || '',
    protein: food.protein?.toString() || '',
    carbs: food.carbs?.toString() || '',
    fat: food.fat?.toString() || '',
    fiber: food.fiber?.toString() || '',
    sugar: food.sugar?.toString() || '',
    sodium: food.sodium?.toString() || '',
    cholesterol: food.cholesterol?.toString() || '',
    saturatedFat: food.saturatedFat?.toString() || '',
    polyunsaturatedFat: food.polyunsaturatedFat?.toString() || '',
    monounsaturatedFat: food.monounsaturatedFat?.toString() || '',
    potassium: food.potassium?.toString() || '',
    vitaminA: food.vitaminA?.toString() || '',
    vitaminC: food.vitaminC?.toString() || '',
    calcium: food.calcium?.toString() || '',
    iron: food.iron?.toString() || '',
    sugarAlcohols: food.sugarAlcohols?.toString() || '',
    addedSugars: food.addedSugars?.toString() || '',
    transFat: food.transFat?.toString() || '',
    vitaminD: food.vitaminD?.toString() || '',
    vitaminE: food.vitaminE?.toString() || '',
    vitaminK: food.vitaminK?.toString() || '',
    vitaminB6: food.vitaminB6?.toString() || '',
    folate: food.folate?.toString() || '',
    vitaminB12: food.vitaminB12?.toString() || '',
    biotin: food.biotin?.toString() || '',
    thiamin: food.thiamin?.toString() || '',
    riboflavin: food.riboflavin?.toString() || '',
    niacin: food.niacin?.toString() || '',
    choline: food.choline?.toString() || '',
    magnesium: food.magnesium?.toString() || '',
    zinc: food.zinc?.toString() || '',
    copper: food.copper?.toString() || '',
    caffeine: food.caffeine?.toString() || '',
    type: food.type || 'food',
    servingGrams: food.servingSize?.toString() || '100',
    servingUnitType: food.servingUnitType || 'g',
    servingDisplayUnit: food.servingDisplayUnit,
    servingLabel: food.servingUnit || '',
    additionalServings: (food.additionalServings || []).map((s: any, i: number) => ({
      id: `as_${i}`,
      label: s.label || '',
      grams: s.grams?.toString() || '',
    })),
  });
  setShowEditMyFood(true);
};

const closeEditModal = () => {
  setShowEditMyFood(false);
  setEditFoodData(null);
};

const saveEditFood = async () => {
  if (!editFoodData || !editFoodData.name.trim() || !editFoodData.cal) return;
  try {
    const saved = await AsyncStorage.getItem('pj_my_foods');
    const foods = saved ? JSON.parse(saved) : [];
    const src = editFoodData._source;
    const calNum = parseInt(editFoodData.cal) || 0;
    const servingGrams = parseFloat(editFoodData.servingGrams) || src?.servingSize || 100;
    const servingUnitType = editFoodData.servingUnitType || 'g';
    const servingLabel = editFoodData.servingLabel?.trim() || `${servingGrams}${unitLabel(servingUnitType)}`;
    const updated = foods.map((f: any) =>
      (src?.id ? f.id === src.id : f.name === src.name) ? {
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
        type: editFoodData.type || 'food',
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
      } : f
    );
    setMyFoods(updated);
    await storageSet('pj_my_foods', JSON.stringify(updated));
    saveToFirebase('my_foods', 'foods', updated).catch(() => {});
    showToast('Food saved', editFoodData.name.trim(), 'success');
    closeEditModal();
  } catch (e) {
    console.log('Edit food error', e);
  }
};

  const openSortModal = () => {
    sortOverlay.value = 0;
    sortScale.value = 0.92;
    setShowSortModal(true);
  };

  const onSortModalShow = () => {
    sortOverlay.value = withTiming(1, { duration: 180 });
    sortScale.value = withSpring(1, { damping: 24, stiffness: 320, overshootClamping: true });
  };

  const closeSortModal = () => {
    sortOverlay.value = withTiming(0, { duration: 140 });
    sortScale.value = withTiming(0.92, { duration: 140 }, (finished) => {
      if (finished) runOnJS(setShowSortModal)(false);
    });
  };

  const openFabMenu = () => {
    fabItem1Anim.setValue(0);
    fabItem2Anim.setValue(0);
    fabItem3Anim.setValue(0);
    fabItem4Anim.setValue(0);
    setShowFabMenu(true);
    Animated.stagger(70, [
      Animated.spring(fabItem1Anim, { toValue: 1, useNativeDriver: true, friction: 7, tension: 120 }),
      Animated.spring(fabItem2Anim, { toValue: 1, useNativeDriver: true, friction: 7, tension: 120 }),
      Animated.spring(fabItem3Anim, { toValue: 1, useNativeDriver: true, friction: 7, tension: 120 }),
      Animated.spring(fabItem4Anim, { toValue: 1, useNativeDriver: true, friction: 7, tension: 120 }),
    ]).start();
  };

  const closeFabMenu = () => {
    Animated.parallel([
      Animated.timing(fabItem1Anim, { toValue: 0, duration: 130, useNativeDriver: true }),
      Animated.timing(fabItem2Anim, { toValue: 0, duration: 130, useNativeDriver: true }),
      Animated.timing(fabItem3Anim, { toValue: 0, duration: 130, useNativeDriver: true }),
      Animated.timing(fabItem4Anim, { toValue: 0, duration: 130, useNativeDriver: true }),
    ]).start(() => setShowFabMenu(false));
  };

  const toggleFabMenu = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    if (showFabMenu) closeFabMenu();
    else openFabMenu();
  };

  useEffect(() => {
    loadMyFoods();
    loadRecent();
    loadRecipes();
    loadBarcodeOverrides();
    loadMealSlots().then(({ mealSlots: ms, slotNameCache: sc }) => {
      setMealSlots(ms);
      setSlotNameCache(sc);
    });
  }, []);

  // Auto-switch to Recipes tab when arriving from recipes tutorial step 7
  useEffect(() => {
    if (tutorialTab === 'recipes') {
      setActiveTab('recipes');
    }
  }, [tutorialTab]);

  // Register deleteTutorialRecipe action so TutorialContext can call it on DONE or skip
  useEffect(() => {
    registerTutorialAction('deleteTutorialRecipe', async () => {
      try {
        const saved = await AsyncStorage.getItem('pj_recipes');
        if (saved) {
          const all = JSON.parse(saved);
          const cleaned = all.filter((r: any) => !r.tutorialRecipe);
          if (cleaned.length !== all.length) {
            await storageSet('pj_recipes', JSON.stringify(cleaned));
            setRecipes(cleaned);
          }
        }
      } catch {}
      if (router.canGoBack()) router.back();
    });
    return () => {
      unregisterTutorialAction('deleteTutorialRecipe');
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadFavorites();
      loadMyFoods();
      loadRecipes();
      loadRecent();
      return () => {
        setSortOption('az');
      };
    }, [])
  );

  // A finished round of label lookups rebuilds the lists so the freshly cached numbers replace the
  // placeholders. Skipped on first render, when there's nothing new to fold in yet.
  useEffect(() => {
    if (labelVersion === 0) return;
    loadRecent();
    loadFavorites();
  }, [labelVersion]);

  const loadBarcodeOverrides = async () => {
    try {
      const saved = await AsyncStorage.getItem('pj_barcode_overrides');
      if (saved) setBarcodeOverrides(JSON.parse(saved));
    } catch (e) {
      console.log('Load barcode overrides error', e);
    }
  };

  const resolveMyFoodOverride = (override: any): any => {
    if (!override.isMyFood) return override;
    const fresh = myFoods.find(f =>
      (override.myFoodId && f.id === override.myFoodId) ||
      f.name === (override.myFoodName || override.description)
    );
    if (!fresh) {
      // Food was deleted -- fall back to whatever we have stored
      return override.description
        ? override
        : { ...override, description: override.myFoodName || 'Unknown Food', foodNutrients: [] };
    }
    return {
      description: fresh.name,
      brand: fresh.brand || null,
      foodNutrients: [
        { nutrientName: 'Energy', unitName: 'KCAL', value: fresh.cal },
        { nutrientName: 'Protein', unitName: 'G', value: fresh.protein || 0 },
        { nutrientName: 'Carbohydrate, by difference', unitName: 'G', value: fresh.carbs || 0 },
        { nutrientName: 'Total lipid (fat)', unitName: 'G', value: fresh.fat || 0 },
      ],
      isMyFood: true,
      isOverride: override.isOverride || false,
    };
  };

  const unsetOverride = async (barcode: string) => {
    if (barcode === 'tutorial_barcode_demo') return;
    try {
      const removedItem = barcodeOverrides[barcode];
      const updated = { ...barcodeOverrides };
      delete updated[barcode];
      setBarcodeOverrides(updated);
      await storageSet('pj_barcode_overrides', JSON.stringify(updated));
      if (removedItem) {
        const removedName = removedItem.myFoodName || removedItem.description;
        setResults(prev => prev.map(r => r.description === removedName ? { ...r, isOverride: false } : r));
      }
      showToast('Override removed', '', 'info');
    } catch (e) {}
  };

  const pinFoodToBarcode = async (barcode: string, item: any) => {
    let storedItem: any;
    if (item.isMyFood || item.isCustom) {
      const myFoodMatch = myFoods.find(f => f.name === (item.description || item.name));
      storedItem = {
        isMyFood: true,
        myFoodName: item.description || item.name,
        myFoodId: item.id || myFoodMatch?.id || null,
        isOverride: true,
      };
    } else {
      storedItem = { ...item, isOverride: true };
    }
    const updated = { ...barcodeOverrides, [barcode]: storedItem };
    setBarcodeOverrides(updated);
    await storageSet('pj_barcode_overrides', JSON.stringify(updated));
  };

  const saveOverride = async (item: any) => {
    if (!lastScannedBarcode || lastScannedBarcode === 'tutorial_barcode_demo') return;
    try {
      await pinFoodToBarcode(lastScannedBarcode, item);
      setResults(prev => prev.map(r => r.description === item.description ? { ...r, isOverride: true } : r));
      setLastScannedBarcode(null);
      triggerHapticNotification(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.log('Save override error', e);
    }
  };

  useEffect(() => {
    if (!query.trim()) {
      showMyFoods('');
    }
  }, [myFoods]);

  useEffect(() => {
    if (!isTutorialMode) return;
    const s0 = TUTORIAL_CHICKEN_BREAST.servings.serving[0];
    const tutorialResult = {
      description: TUTORIAL_CHICKEN_BREAST.food_name,
      foodNutrients: [
        { nutrientName: 'Energy', unitName: 'KCAL', value: parseInt(s0.calories) },
        { nutrientName: 'Protein', unitName: 'G', value: parseFloat(s0.protein) },
        { nutrientName: 'Carbohydrate, by difference', unitName: 'G', value: parseFloat(s0.carbohydrate) },
        { nutrientName: 'Total lipid (fat)', unitName: 'G', value: parseFloat(s0.fat) },
      ],
      fsId: TUTORIAL_CHICKEN_BREAST.food_id,
      isTutorialFood: true,
    };
    setResults([tutorialResult as any]);
    setQuery(TUTORIAL_CHICKEN_BREAST.food_name);
    registerTarget('log_result_row', firstResultRef);
    return () => unregisterTarget('log_result_row');
  }, [isTutorialMode]);

  useEffect(() => {
    if (isTutorialScanMode) {
      registerTarget('add_food_top_result', topResultRef);
      registerTarget('add_food_set_button', setButtonRef);
      registerTarget('add_food_unset_button', unsetButtonRef);
      registerTarget('add_food_create_barcode', createBarcodeRef);
    } else {
      unregisterTarget('add_food_top_result');
      unregisterTarget('add_food_set_button');
      unregisterTarget('add_food_unset_button');
      unregisterTarget('add_food_create_barcode');
    }
  }, [isTutorialScanMode]);

  useEffect(() => {
    const showTutorialScanResults = async () => {
      setIsTutorialScanMode(true);
      setLastScannedBarcode('tutorial_barcode_demo');
      setQuery('Chicken Breast');
      setResults([
        {
          description: 'Chicken Breast, Grilled',
          foodNutrients: [
            { nutrientName: 'Energy', unitName: 'KCAL', value: 165 },
            { nutrientName: 'Protein', unitName: 'G', value: 31 },
            { nutrientName: 'Carbohydrate, by difference', unitName: 'G', value: 0 },
            { nutrientName: 'Total lipid (fat)', unitName: 'G', value: 3.6 },
          ],
          isOverride: false,
          isTutorialFood: true,
          fsId: null,
        },
        {
          description: 'Chicken Breast, Roasted',
          foodNutrients: [
            { nutrientName: 'Energy', unitName: 'KCAL', value: 172 },
            { nutrientName: 'Protein', unitName: 'G', value: 32 },
            { nutrientName: 'Carbohydrate, by difference', unitName: 'G', value: 1 },
            { nutrientName: 'Total lipid (fat)', unitName: 'G', value: 4.2 },
          ],
          isOverride: false,
          isTutorialFood: true,
          fsId: null,
        },
        {
          description: 'Chicken Breast, Breaded',
          foodNutrients: [
            { nutrientName: 'Energy', unitName: 'KCAL', value: 220 },
            { nutrientName: 'Protein', unitName: 'G', value: 24 },
            { nutrientName: 'Carbohydrate, by difference', unitName: 'G', value: 15 },
            { nutrientName: 'Total lipid (fat)', unitName: 'G', value: 8 },
          ],
          isOverride: false,
          isTutorialFood: true,
          fsId: null,
        },
      ] as any[]);
    };
    registerTutorialAction('showTutorialScanResults', showTutorialScanResults);
    return () => unregisterTutorialAction('showTutorialScanResults');
  }, []);

  useEffect(() => {
    const switchToSetFoodsTab = async () => {
      setQuery('');
      setBarcodeOverrides(prev => ({
        tutorial_barcode_demo: { isMyFood: false, description: 'Chicken Breast, Grilled' },
        ...prev,
      }));
      setActiveTab('pinned');
    };
    registerTutorialAction('switchToSetFoodsTab', switchToSetFoodsTab);
    return () => unregisterTutorialAction('switchToSetFoodsTab');
  }, []);

  useEffect(() => {
    const showTutorialNoMatchState = async () => {
      setResults([]);
      setQuery('');
      setActiveTab('recent');
    };
    registerTutorialAction('showTutorialNoMatchState', showTutorialNoMatchState);
    return () => unregisterTutorialAction('showTutorialNoMatchState');
  }, []);

  useEffect(() => {
    const clearTutorialScanState = async () => {
      setIsTutorialScanMode(false);
      setLastScannedBarcode(null);
      setResults([]);
      setQuery('');
      setActiveTab('recent');
      setShowSavedFoodsSection(false);
      try {
        const saved = await AsyncStorage.getItem('pj_barcode_overrides');
        setBarcodeOverrides(saved ? JSON.parse(saved) : {});
      } catch {}
      if (router.canGoBack()) router.back();
    };
    registerTutorialAction('clearTutorialScanState', clearTutorialScanState);
    return () => unregisterTutorialAction('clearTutorialScanState');
  }, []);

  useEffect(() => {
    const openCreatorForTutorial = async () => {
      setShowCreateFood(true);
      setIsTutorialCreateMode(true);
      // Small settle delay so React can render the inline creator and
      // register its refs before the tutorial engine starts measuring.
      await new Promise<void>(r => setTimeout(r, 120));
    };
    registerTutorialAction('openCreatorForTutorial', openCreatorForTutorial);
    return () => unregisterTutorialAction('openCreatorForTutorial');
  }, []);

  // Deep-link entry points from the Log tab FAB: land on this screen already in the right mode
  // instead of making the user open the Create Food modal or the scanner themselves.
  useEffect(() => {
    // ⚠️ ITEM C BACKSTOP. The Log tab's Create Food is already dimmed and locked at the cap, so this normally
    // never fires while capped. It is checked again here because this is a PARAM-driven entry: anything that
    // navigates here with openCreate=1 (a future deep link, a notification, a tutorial route) would otherwise
    // walk straight past the wall. The gate belongs on the action, not only on the button that usually
    // triggers it. Reads fresh rather than trusting whatever screen sent us here.
    if (openCreate === '1') {
      checkCap('foods', isSupporter, membershipLoading)
        .then(s => { if (s.canCreate) setShowCreateFood(true); else setFoodCapWall(true); })
        .catch(() => setShowCreateFood(true));
    }
    if (openScanner === '1') startScan();
  }, []);

  useEffect(() => {
    const closeCreatorAfterTutorial = async () => {
      setShowCreateFood(false);
      setIsTutorialCreateMode(false);
      await new Promise<void>(r => setTimeout(r, 150));
      if (router.canGoBack()) router.back();
    };
    registerTutorialAction('closeCreatorAfterTutorial', closeCreatorAfterTutorial);
    return () => unregisterTutorialAction('closeCreatorAfterTutorial');
  }, []);

  // Backfill: ensure every My Foods entry has a stable unique id so duplicate names
  // resolve to the exact tapped/edited/deleted entry. ADDITIVE ONLY -- it adds an id
  // where one is missing and preserves every other field; it never alters or removes
  // anything. Returns the (possibly) updated list + whether anything changed.
  const ensureMyFoodIds = (foods: any[]): { foods: any[]; changed: boolean } => {
    let changed = false;
    const out = (Array.isArray(foods) ? foods : []).map((f: any, i: number) => {
      if (f && !f.id) {
        changed = true;
        return { ...f, id: `mf_${Date.now().toString(36)}${i}${Math.random().toString(36).slice(2, 6)}` };
      }
      return f;
    });
    return { foods: out, changed };
  };

  const loadMyFoods = async () => {
    try {
      const saved = await AsyncStorage.getItem('pj_my_foods');
      const source = saved ? JSON.parse(saved) : null;
      if (source) {
        const { foods, changed } = ensureMyFoodIds(source);
        setMyFoods(foods);
        if (changed) await storageSet('pj_my_foods', JSON.stringify(foods));
      } else {
        const cloud = await loadFromFirebase('my_foods');
        if (cloud && cloud.foods) {
          const { foods, changed } = ensureMyFoodIds(cloud.foods);
          setMyFoods(foods);
          if (changed) await storageSet('pj_my_foods', JSON.stringify(foods));
        }
      }
    } catch (e) {
      console.log('Load error', e);
    }
  };

  const showMyFoods = (q: string) => {
    const filtered = myFoods
      .filter(f => !q || f.name.toLowerCase().includes(q.toLowerCase()))
      .map(f => ({
        id: (f as any).id,
        description: f.name,
        brand: f.brand || null,
        isCustom: f.isCustom || true,
        servingSize: f.servingSize,
        type: f.type || 'food',
        foodNutrients: [
          { nutrientName: 'Energy', unitName: 'KCAL', value: f.cal },
          { nutrientName: 'Protein', unitName: 'G', value: f.protein || 0 },
          { nutrientName: 'Carbohydrate, by difference', unitName: 'G', value: f.carbs || 0 },
          { nutrientName: 'Total lipid (fat)', unitName: 'G', value: f.fat || 0 },
        ],
        isMyFood: true,
      }));
    setResults(filtered);
  };

  const searchDebounceTimer = useRef<any>(null);
  const searchIdRef = useRef(0);
  const isBarcodeSearchRef = useRef(false);

  const searchFood = async (query: string) => {
    setQuery(query);
    if (isBarcodeSearchRef.current) return;
    if (!query.trim()) {
      setResults([]);
      setSearching(false);
      setSearchError(false);
      if (searchDebounceTimer.current) clearTimeout(searchDebounceTimer.current);
      return;
    }

    // Show spinner immediately so there's no blank gap before debounce fires
    setSearching(true);
    setSearchError(false);

    // My Foods match immediately -- no debounce needed
    const nq = normalizeForMatch(query);
    const myFoodResults = myFoods
      .filter(f => normalizeForMatch(f.name).includes(nq))
      .map(f => ({
        id: (f as any).id,
        description: f.name,
        brand: f.brand || null,
        type: f.type || 'food',
        foodNutrients: [
          { nutrientName: 'Energy', unitName: 'KCAL', value: f.cal },
          { nutrientName: 'Protein', unitName: 'G', value: f.protein || 0 },
          { nutrientName: 'Carbohydrate, by difference', unitName: 'G', value: f.carbs || 0 },
          { nutrientName: 'Total lipid (fat)', unitName: 'G', value: f.fat || 0 },
        ],
        isMyFood: true,
      }));
    if (!isBarcodeSearchRef.current) setResults(myFoodResults);

    // Debounce the API calls
    if (searchDebounceTimer.current) clearTimeout(searchDebounceTimer.current);
    searchDebounceTimer.current = setTimeout(async () => {
      const thisSearchId = ++searchIdRef.current;
      setSearching(true);

      try {
        const fsResults = await fetchFatSecretSearch(normalizeQueryForApi(query.trim()));
        const matchingRecents = recentFoods.filter(r => normalizeForMatch(r.description).includes(nq));

        // Only apply if this is still the latest search
        if (thisSearchId === searchIdRef.current) {
          // Flagged as coming straight from the database. Food Detail trusts a result's calorie
          // value to identify the label serving ONLY when it carries this flag, because only here is
          // that number FatSecret's own. The same number arriving from Recent or Favourites is our
          // stored copy, and trusting a stored copy is what let wrong values re-save themselves.
          setResults([...matchingRecents, ...myFoodResults, ...fsResults.map((r: any) => ({ ...r, isSearchResult: true }))]);
        }
      } catch (e) {
        console.log('Search error', e);
        if (thisSearchId === searchIdRef.current) setSearchError(true);
      } finally {
        if (thisSearchId === searchIdRef.current) {
          setSearching(false);
        }
      }
    }, 400);
  };

  const getCalories = (food: SearchResult) => {
    const e = food.foodNutrients?.find((n: any) => n.nutrientName === 'Energy' && n.unitName === 'KCAL');
    return Math.round(e?.value || (food as any).cal || 0);
  };

  const getMacros = (food: SearchResult) => {
    if ((food as any).isRecipe && (food as any).recipeData) {
      const r = (food as any).recipeData;
      const servings = r.servingCount || 1;
      return {
        protein: Math.round((r.totalProtein || 0) / servings),
        carbs: Math.round((r.totalCarbs || 0) / servings),
        fat: Math.round((r.totalFat || 0) / servings),
      };
    }
    const p = food.foodNutrients?.find((n: any) => n.nutrientName === 'Protein');
    const c = food.foodNutrients?.find((n: any) => n.nutrientName === 'Carbohydrate, by difference');
    const f = food.foodNutrients?.find((n: any) => n.nutrientName === 'Total lipid (fat)');
    if (!p && !c && !f) return null;
    return {
      protein: Math.round(p?.value || 0),
      carbs: Math.round(c?.value || 0),
      fat: Math.round(f?.value || 0),
    };
  };

  const applySortToFoodItems = (items: any[]) => {
    return [...items].sort((a, b) => {
      const nameA = (a.description || '').toLowerCase();
      const nameB = (b.description || '').toLowerCase();
      switch (sortOption) {
        case 'az': return nameA.localeCompare(nameB);
        case 'za': return nameB.localeCompare(nameA);
        case 'cal-hl': return getCalories(b) - getCalories(a);
        case 'cal-lh': return getCalories(a) - getCalories(b);
        case 'protein-hl': return (getMacros(b)?.protein || 0) - (getMacros(a)?.protein || 0);
        default: return 0;
      }
    });
  };

const openFoodDetail = async (food: SearchResult) => {
    if ((food as any).isRecipe) {
      router.push({
        pathname: '/recipe-log',
        params: {
          recipeJson: JSON.stringify((food as any).recipeData),
          meal,
          date,
        }
      });
      return;
    }
    if (isRecipeMode) {
      const myFoodMatch = food.isMyFood
        ? (myFoods.find(f => f.name === food.description) || (food as any).myFoodData || null)
        : null;
      const isCustomFood = !!(food as any).isCustom || !!(myFoodMatch as any)?.isCustom;
      const fsId = (food as any).fsId;
      let fsServings: any[] = [];
      if (fsId && !(food as any).fromBarcode) {
        fsServings = await fetchFatSecretServings(fsId);
      }
      router.push({
        pathname: '/food-detail',
        params: {
          foodJson: JSON.stringify({
            ...food,
            fsServings: fsServings.length > 0 ? fsServings : undefined,
            ...(isCustomFood && myFoodMatch ? {
              existingCal: myFoodMatch.cal,
              existingProtein: myFoodMatch.protein || 0,
              existingCarbs: myFoodMatch.carbs || 0,
              existingFat: myFoodMatch.fat || 0,
              calPer100g: (myFoodMatch as any).calPer100g || 0,
              proteinPer100g: (myFoodMatch as any).proteinPer100g || 0,
              carbsPer100g: (myFoodMatch as any).carbsPer100g || 0,
              fatPer100g: (myFoodMatch as any).fatPer100g || 0,
              foodNutrients: (myFoodMatch as any).foodNutrients || food.foodNutrients || [],
              servingUnitType: (myFoodMatch as any).servingUnitType || 'g',
              servingDisplayUnit: (myFoodMatch as any).servingDisplayUnit,
              servingUnit: (myFoodMatch as any).servingUnit || '',
              existingAmount: ((myFoodMatch as any).servingSize || 100).toString(),
              myFoodData: myFoodMatch,
              isCustom: true,
              brand: (myFoodMatch as any).brand || null,
            } : {}),
          }),
          meal: 'recipe',
          date: 'recipe',
          recipeMode: 'true',
        }
      });
      return;
    }

    const myFoodId = (food as any).id || (food as any).myFoodId || null;
    const foodLookupName = (food.description || (food as any).name || '').replace(/\s*\(.*?\)\s*$/, '').split(' · ')[0].trim();
    // Recover a custom food by name for old entries lacking the isMyFood flag -- but
    // NOT for genuine FatSecret database results (fsId present). Without the fsId guard,
    // tapping a real database item (e.g. "Broccoli Florets · Kroger") gets hijacked by a
    // same-named custom food (e.g. the Great Value one) and opens the wrong food.
    const customNameMatch: any = (foodLookupName && !(food as any).fsId)
      ? myFoods.find((f: any) => f.isCustom && f.name === foodLookupName)
      : null;
    const myFoodMatch: any = (food.isMyFood || myFoodId)
      ? (myFoods.find(f => myFoodId ? (f as any).id === myFoodId : (foodLookupName && f.name === foodLookupName)) || (food as any).myFoodData || null)
      : (customNameMatch || null);
    let fsId: string | null = (food as any).fsId ?? null;
    const customServingSize = (food as any).servingSize;
    const isCustomFood = !!(food as any).isCustom || !!(myFoodMatch as any)?.isCustom || food.isMyFood || (!!myFoodMatch && !!myFoodId);
    // Custom foods must not fetch FatSecret servings or show the API badge
    if (isCustomFood && myFoodMatch) fsId = null;

    // Resolve missing fsId for stale diary/recent entries logged before fsId was stored.
    // Order: favorites (in-memory, instant) -> myFoods (in-memory, instant) -> FatSecret name search (API).
    // AI-estimated foods stay pure to their estimate (cals + big 3). Skipping the name-search
    // stops the app silently stapling a name-matched FatSecret product's label (serving size +
    // fiber/sodium/micros) onto a meal the AI never produced that data for. The stale-food
    // recovery below still runs for every non-AI food that lost its fsId.
    if (!fsId && !isCustomFood && !(food as any).aiEstimated && food.description) {
      const foodName = (food as any).fullName || food.description;
      // 1. Check favorites
      const favMatch = favorites.find(f => f.name === foodName || f.name === food.description);
      if (favMatch?.fsId) {
        fsId = favMatch.fsId;
      }
      // 2. Check myFoods
      if (!fsId) {
        const myFoodByName = myFoods.find(f => f.name === foodName || f.name === food.description);
        if (myFoodByName?.fsId) {
          fsId = myFoodByName.fsId;
        }
      }
      // 3. FatSecret name search as final fallback
      if (!fsId) {
        try {
          const nameResults = await fetchFatSecretSearch(foodName);
          if (nameResults.length > 0) fsId = (nameResults[0] as any).fsId ?? null;
        } catch {}
      }
    }

    let fsServings: any[] = [];
    if (fsId && !(food as any).fromBarcode) {
      fsServings = await fetchFatSecretServings(fsId);
    }
    let existingAmount: string | undefined;
    let existingUnit: string | undefined;
    router.push({
      pathname: '/food-detail',
      params: {
        foodJson: JSON.stringify({
          ...food,
          fsId,
          isMyFood: food.isMyFood,
          isCustom: (food as any).isCustom || (myFoodMatch as any)?.isCustom || false,
          brand: (myFoodMatch as any)?.brand || null,
          myFoodData: myFoodMatch,
          fsServings: fsServings.length > 0 ? fsServings : undefined,
          ...(existingAmount ? { existingAmount, existingUnit: existingUnit || 'g' } : {}),
          ...(customServingSize && !existingAmount ? { existingAmount: customServingSize.toString(), existingUnit: 'g' } : {}),
          ...(isCustomFood && myFoodMatch ? {
            existingCal: myFoodMatch.cal,
            existingProtein: myFoodMatch.protein || 0,
            existingCarbs: myFoodMatch.carbs || 0,
            existingFat: myFoodMatch.fat || 0,
            calPer100g: (myFoodMatch as any).calPer100g || 0,
            proteinPer100g: (myFoodMatch as any).proteinPer100g || 0,
            carbsPer100g: (myFoodMatch as any).carbsPer100g || 0,
            fatPer100g: (myFoodMatch as any).fatPer100g || 0,
            foodNutrients: (myFoodMatch as any).foodNutrients || food.foodNutrients || [],
          servingUnitType: (myFoodMatch as any).servingUnitType || 'g',
          servingDisplayUnit: (myFoodMatch as any).servingDisplayUnit,
          servingUnit: (myFoodMatch as any).servingUnit || '',
          existingAmount: existingAmount || ((myFoodMatch as any).servingSize || 100).toString(),
          } : {}),
        }),
        meal,
        date,
      }
    });
  };

  // ITEM C: one handler for BOTH touchables of the Create Food row. At the cap the tap opens the wall
  // instead of the creator. The small delay lets the FAB menu finish closing before a second Modal appears.
  const onCreateFoodPress = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    closeFabMenu();
    if (!foodCap.canCreate) { setTimeout(() => setFoodCapWall(true), 150); return; }
    setShowCreateFood(true);
  };

  const saveNewFood = async () => {
    const name = newName.trim();
    const cal = parseInt(newCal);
    if (!name || !cal) return;
    const updated = [...myFoods, { name, cal }].sort((a, b) => a.name.localeCompare(b.name));
    setMyFoods(updated);
    await storageSet('pj_my_foods', JSON.stringify(updated));
    saveToFirebase('my_foods', 'foods', updated).catch(() => {});
    setNewName('');
    setNewCal('');
    setShowAddNew(false);
  };

  const deleteMyFood = (idx: number) => {
    const food = myFoods[idx];
    Alert.alert(
      'Delete Food',
      `Remove "${food?.name}" from My Foods? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
          const updated = myFoods.filter((_, i) => i !== idx);
          setMyFoods(updated);
          await storageSet('pj_my_foods', JSON.stringify(updated));
          saveToFirebase('my_foods', 'foods', updated).catch(() => {});
          // Clean up this food's photo (local + cloud) so no orphan is left behind.
          if ((food as any)?.id) purgeFoodPhoto((food as any).id).catch(() => {});
        }},
      ]
    );
  };

  const deleteRecipe = (recipeId: string, recipeName: string) => {
    Alert.alert(
      'Delete Recipe',
      `Remove "${recipeName}" from your Recipes? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
            const updated = recipes.filter((r: any) => r.id !== recipeId);
            setRecipes(updated);
            await storageSet('pj_recipes', JSON.stringify(updated));
            saveToFirebase('recipes', 'list', updated).catch(() => {});
            // Clean up this recipe's photo (local + cloud) so no orphan is left behind.
            purgeRecipePhoto(recipeId).catch(() => {});
            showToast('Recipe deleted', recipeName, 'success');
          },
        },
      ]
    );
  };

  const startScan = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    if (status === 'granted') {
      scanningRef.current = true;
      setClosingCamera(false);
      setTorchOn(false);
      setViewfinderHeight(0);
      cameraOpacity.setValue(0);
      setScanning(true);
      setCameraReady(false);
      cameraReadyTimer.current = setTimeout(() => {
        setCameraReady(true);
        Animated.timing(cameraOpacity, { toValue: 1, duration: 250, useNativeDriver: true }).start();
      }, 435);
    }
  };

  const stopScanning = (delay = 200) => {
    scanningRef.current = false;
    setCameraReady(false);
    setClosingCamera(true);
    if (cameraReadyTimer.current) clearTimeout(cameraReadyTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    Animated.timing(cameraOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      closeTimer.current = setTimeout(() => {
        setScanning(false);
        setClosingCamera(false);
        setTorchOn(false);
      }, delay);
    });
  };

const handleBarcodeScan = async ({ data }: { data: string }) => {
    if (scanningRef.current === false) return;
    scanningRef.current = false;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    Animated.sequence([
      Animated.timing(scanFlash, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(scanFlash, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
    setCameraReady(false);
    if (cameraReadyTimer.current) clearTimeout(cameraReadyTimer.current);
    setTimeout(() => stopScanning(200), 150);

    if (searchDebounceTimer.current) clearTimeout(searchDebounceTimer.current);
    ++searchIdRef.current;
    isBarcodeSearchRef.current = true;

    setShowSavedFoodsSection(false);

    // Check for saved SET override
    if (barcodeOverrides[data]) {
      const override = resolveMyFoodOverride({ ...barcodeOverrides[data], isOverride: true });
      const overrideName = override.description;
      setLastScannedBarcode(null);
      setQuery(overrideName);
      setResults([override]);
      isBarcodeSearchRef.current = false;

      // My Food overrides are custom -- no FatSecret search needed
      if (!override.isMyFood) {
        setTimeout(async () => {
          try {
            setSearching(true);
            const fsResults = await fetchFatSecretSearch(overrideName);
            const deduped = fsResults.filter(r => r.description !== overrideName);
            setResults([override, ...deduped]);
          } catch (e) {
            console.log('Override name search failed', e);
          } finally {
            setSearching(false);
          }
        }, 1500);
      }
      return;
    }

    // No override -- fetch barcode from FatSecret
    try {
      setSearching(true);
      setBarcodeLookup(true);
      const barcodeResult = await fetchFatSecretBarcode(data);

      if (barcodeResult) {
        const searchName = barcodeResult.description;
        isBarcodeSearchRef.current = true;
        setQuery(searchName);
        isBarcodeSearchRef.current = false;
        setLastScannedBarcode(data);
        setResults([barcodeResult]);
        setSearching(false);
        startCooldown();

        // Auto-load full search results after delay
        setTimeout(async () => {
          try {
            setSearching(true);
            const fsResults = await fetchFatSecretSearch(searchName);
            const deduped = fsResults.filter(r => r.description !== searchName);
            setResults([barcodeResult, ...deduped]);
          } catch (e) {
            console.log('Name search failed', e);
          } finally {
            setSearching(false);
          }
        }, 1500);
      } else {
        setLastScannedBarcode(data);
        setQuery('');
        setResults([]);
        setSearching(false);
        Alert.alert(
          'Product Not Found',
          'This barcode isn\'t in the database yet. Search for it below and tap SET to link it permanently.',
          [{ text: 'OK' }]
        );
      }
    } catch (e) {
      console.log('Barcode error', e);
      setSearching(false);
      Alert.alert(
        'No Connection',
        'Couldn\'t reach the food database. Check your internet connection and try again.'
      );
    } finally {
      isBarcodeSearchRef.current = false;
      setBarcodeLookup(false);
    }
  };
  const loadRecent = async () => {
    try {
      // Pull last 30 days of entries and get unique foods
      const recent: {name: string, cal: number, protein?: number, carbs?: number, fat?: number, brand?: string, calPer100g?: number, proteinPer100g?: number, carbsPer100g?: number, fatPer100g?: number, foodNutrients?: any[], fsId?: string | null, myFoodId?: string | null, isMyFood?: boolean}[] = [];
      const seen = new Set<string>();
      // One batched read instead of 30 sequential ones
      const recentKeys30 = Array.from({ length: 30 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return `pj_${d.toISOString().split('T')[0]}`;
      });
      const recentPairs30 = await AsyncStorage.multiGet(recentKeys30);
      for (const [, saved] of recentPairs30) {
        if (saved) {
          const data = JSON.parse(saved);
          if (data.entries) {
            data.entries.reverse().forEach((e: any) => {
              // AI Meal Estimator entries are one-off composites, not reusable foods.
              // Keep them out of Recents so they never trigger a FatSecret name-match.
              if (e.aiEstimated) return;
              const cleanName = e.name.replace(/\s*\(.*?\)\s*$/, '').split(' · ')[0].trim();
              const nameKey = `name_${cleanName}`;
              const dedupeKey = e.myFoodId ? `mf_${e.myFoodId}` : e.fsId ? `fs_${e.fsId}` : nameKey;
              if (!seen.has(dedupeKey) && !seen.has(nameKey)) {
                seen.add(dedupeKey);
                seen.add(nameKey);
                // labelCal/labelProtein/etc. are the food's real DEFAULT serving (decoupled from
                // whatever amount was actually logged that day) -- intentional, see the comment
                // by newEntry in food-detail.tsx. The real bug was upstream: a custom food with no
                // extra named serving defined was treated as having NO default serving at all,
                // so labelCal fell through to the custom gram amount typed that day. Fixed at the
                // source (food-detail.tsx's customServings) rather than here.
                recent.push({ name: e.name, cal: e.labelCal || e.calPer100g || e.cal, protein: e.labelProtein ?? e.proteinPer100g ?? e.protein, carbs: e.labelCarbs ?? e.carbsPer100g ?? e.carbs, fat: e.labelFat ?? e.fatPer100g ?? e.fat, brand: e.brand || null, calPer100g: e.calPer100g, proteinPer100g: e.proteinPer100g, carbsPer100g: e.carbsPer100g, fatPer100g: e.fatPer100g, foodNutrients: e.foodNutrients, fsId: e.fsId || null, myFoodId: e.myFoodId || null, isMyFood: e.isMyFood || false });
              }
            });
          }
        }
      }
      // Enrich brand + type from pj_my_foods for custom foods
      const savedFoods = await AsyncStorage.getItem('pj_my_foods');
      const myFoodsMap: Record<string, string> = {};
      const myFoodsTypeMap: Record<string, 'supplement' | 'food'> = {};
      // The food's own definition, keyed by name -- the most authoritative label there is, because
      // the user wrote it. Used below to repair Recent rows whose stored label went bad.
      const myFoodByName: Record<string, any> = {};
      const myFoodById: Record<string, any> = {};
      if (savedFoods) {
        (JSON.parse(savedFoods) as MyFood[]).forEach(f => {
          if (f.brand) myFoodsMap[f.name] = f.brand;
          if (f.type === 'supplement') myFoodsTypeMap[f.name] = 'supplement';
          myFoodByName[f.name] = f;
          if ((f as any).id) myFoodById[(f as any).id] = f;
        });
      }
      // A favourite's stored numbers are deliberately NOT consulted here. They're a snapshot taken
      // when the star was tapped, and a snapshot can be wrong: the white bread favourite held a
      // 2.5-serving dinner, so trusting it made a 41 g slice read 175 kcal everywhere it appeared.
      // FatSecret foods resolve through the shared label cache below instead.
      await loadLabelCache();
      const savedRecipesRaw = await AsyncStorage.getItem('pj_recipes');
      const recipeByName: Record<string, any> = {};
      if (savedRecipesRaw) {
        (JSON.parse(savedRecipesRaw) as any[]).forEach(r => { recipeByName[r.name] = r; });
      }
      // FatSecret foods whose label isn't cached yet. Resolved one at a time after the list is on
      // screen so the Library never blocks on the network, and never fires a burst of lookups.
      const pendingLabelIds: string[] = [];
      setRecentFoods(recent.slice(0, 30).map(f => {
        const stripped = f.name.replace(/\s*\(.*?\)\s*$/, '');
        const matchedRecipe = recipeByName[stripped];
        if (matchedRecipe) {
          return {
            description: stripped,
            fullName: f.name,
            foodNutrients: [],
            isMyFood: false,
            isRecent: true,
            isRecipe: true,
            recipeData: matchedRecipe,
            cal: Math.round(matchedRecipe.totalCal / (matchedRecipe.servingCount || 1)),
            fsId: null,
          };
        }
        // The number on a Library card is a property of the FOOD -- its default serving -- and never
        // a property of how it happened to be logged. A food the user wrote answers for itself; a
        // FatSecret food answers through the shared label cache. The value stored on the diary entry
        // is only a placeholder for the moment before a lookup returns.
        // My Foods are matched by name only when the row has no fsId, so a real database food can
        // never be hijacked by a same-named custom one.
        const myFoodRecord =
          (f.myFoodId ? myFoodById[f.myFoodId] : null) ||
          ((f.isMyFood || !f.fsId) ? myFoodByName[stripped] : null) ||
          null;
        const resolved = labelFromMyFood(myFoodRecord) || getCachedLabel(f.fsId);
        if (!resolved && f.fsId) pendingLabelIds.push(f.fsId);
        const labelCal = resolved ? resolved.cal : f.cal;
        const labelProtein = resolved ? resolved.protein : (f.protein || 0);
        const labelCarbs = resolved ? resolved.carbs : (f.carbs || 0);
        const labelFat = resolved ? resolved.fat : (f.fat || 0);
        return {
          labelPending: !resolved && !!f.fsId,
          description: stripped,
          fullName: f.name,
          brand: f.brand || myFoodsMap[stripped] || null,
          foodNutrients: [
            { nutrientName: 'Energy', unitName: 'KCAL', value: labelCal },
            { nutrientName: 'Protein', unitName: 'G', value: labelProtein },
            { nutrientName: 'Carbohydrate, by difference', unitName: 'G', value: labelCarbs },
            { nutrientName: 'Total lipid (fat)', unitName: 'G', value: labelFat },
          ],
          calPer100g: f.calPer100g,
          proteinPer100g: f.proteinPer100g,
          carbsPer100g: f.carbsPer100g,
          fatPer100g: f.fatPer100g,
          isMyFood: false,
          isRecent: true,
          fsId: f.fsId || null,
          type: myFoodsTypeMap[stripped] || 'food',
        };
      }));
      resolvePendingLabels(pendingLabelIds);
    } catch (e) {
      console.log('Load recent error', e);
    }
  };

  // Looks up the label serving for foods we haven't cached, strictly one at a time, and refreshes
  // the lists as each answer lands. Sequential on purpose: this is the same lookup the app already
  // makes when a food is tapped, so spreading it out keeps the Library off the API's daily budget
  // rather than firing thirty requests the moment the screen opens. Cached forever after.
  const labelQueueRef = useRef<string[]>([]);
  const labelWorkingRef = useRef(false);
  const resolvePendingLabels = useCallback((ids: string[]) => {
    const fresh = ids.filter(id => id && !getCachedLabel(id) && !labelQueueRef.current.includes(id));
    if (fresh.length === 0) return;
    labelQueueRef.current.push(...fresh);
    if (labelWorkingRef.current) return;
    labelWorkingRef.current = true;
    (async () => {
      let resolvedAny = false;
      while (labelQueueRef.current.length > 0) {
        const id = labelQueueRef.current.shift()!;
        const label = await resolveFsLabel(id, fetchFatSecretServings);
        if (label) resolvedAny = true;
      }
      labelWorkingRef.current = false;
      // One re-render at the end rather than per lookup, so the list doesn't flicker its way
      // through the queue. Rows waiting on an answer show a spinner in the meantime.
      if (resolvedAny) setLabelVersion(v => v + 1);
    })();
  }, []);

  const loadFavorites = async () => {
  try {
    let favs: any[] = [];
    const saved = await AsyncStorage.getItem('pj_favorites');
    if (saved) {
      favs = JSON.parse(saved);
    } else {
      const userId = getUserId();
      const ref = doc(db, 'users', userId, 'days', 'my_foods');
      const snap = await getDoc(ref);
      if (snap.exists() && snap.data().favorites) {
        favs = snap.data().favorites;
        await storageSet('pj_favorites', JSON.stringify(favs));
      }
    }
    const myFoodsRaw = await AsyncStorage.getItem('pj_my_foods');
    const myFoodsByName: Record<string, MyFood> = {};
    if (myFoodsRaw) {
      (JSON.parse(myFoodsRaw) as MyFood[]).forEach(f => { myFoodsByName[f.name] = f; });
    }
    let changed = false;
    const enriched = favs.map((fav: any) => {
      if (fav.isMyFood || fav.fsId) return fav;
      const match = myFoodsByName[fav.name];
      if (!match) return fav;
      changed = true;
      return { ...fav, isMyFood: true, isCustom: match.isCustom ?? true, id: fav.id || match.id || (Math.random().toString(36).slice(2) + Date.now().toString(36)) };
    });
    if (changed) await storageSet('pj_favorites', JSON.stringify(enriched));
    // A star is a pointer, not a nutrition record. The numbers saved alongside it are a snapshot of
    // whatever was on screen when it was tapped, and that snapshot drifts: white bread's favourite
    // held a 2.5-serving dinner and made a 41 g slice read 175 kcal. Display the food's real default
    // serving instead -- the user's own record for a My Food, the cached label for a FatSecret food.
    // The stored snapshot survives untouched on disk as the offline last resort.
    await loadLabelCache();
    const pendingFavIds: string[] = [];
    const withLabels = enriched.map((fav: any) => {
      const resolved = labelFromMyFood(myFoodsByName[fav.name]) || getCachedLabel(fav.fsId);
      if (!resolved && fav.fsId) pendingFavIds.push(fav.fsId);
      if (!resolved) return { ...fav, labelPending: !!fav.fsId };
      return { ...fav, cal: resolved.cal, protein: resolved.protein, carbs: resolved.carbs, fat: resolved.fat, labelPending: false };
    });
    setFavorites(withLabels);
    resolvePendingLabels(pendingFavIds);
  } catch (e) {
    console.log('Load favorites error', e);
  }
};

  const loadRecipes = async () => {
  try {
    const saved = await AsyncStorage.getItem('pj_recipes');
    if (saved) {
      setRecipes(JSON.parse(saved));
    } else {
      const ref = doc(db, 'users', getUserId(), 'days', 'my_foods');
      const snap = await getDoc(ref);
      if (snap.exists() && snap.data().recipes) {
        const data = snap.data().recipes;
        setRecipes(data);
        await storageSet('pj_recipes', JSON.stringify(data));
      }
    }
  } catch (e) {
    console.log('Load recipes error', e);
  }
};

  const toggleFavorite = async (food: SearchResult) => {
    const name = food.description;
    const cal = getCalories(food);
    const foodFsId = (food as any).fsId || null;
    const isFav = favorites.some(f => {
      const fFsId = (f as any).fsId;
      if (foodFsId && fFsId) return fFsId === foodFsId;
      if (foodFsId || fFsId) return false;
      return f.name === name && !!(f as any).isMyFood === !!(food as any).isMyFood;
    });
    if (isFav) {
      Alert.alert(
        'Remove from Favorites',
        `Remove ${name} from your favorites?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Remove', style: 'destructive', onPress: async () => {
            triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
            const opacity = getFavOpacity(name);
            Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }).start(async () => {
              delete favoriteOpacities[name];
              const updated = favorites.filter(f =>
                foodFsId && f.fsId ? f.fsId !== foodFsId : f.name !== name
              );
              setFavorites(updated);
              await storageSet('pj_favorites', JSON.stringify(updated));
              saveToFirebase('my_foods', 'favorites', updated).catch(() => {});
              showToast('Removed from favorites', name, 'info');
            });
          }},
        ]
      );
      return;
    }
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    showToast('Added to favorites', name, 'success');
    let updated;
    if (isFav) {
      updated = favorites.filter(f =>
        foodFsId && f.fsId ? f.fsId !== foodFsId : f.name !== name
      );
    } else {
      const getN = (nName: string, unit: string = 'G') => {
        const n = food.foodNutrients?.find((fn: any) => fn.nutrientName === nName && fn.unitName === unit);
        return Math.round((n?.value || 0) * 10) / 10;
      };
      updated = [...favorites, {
        id: Math.random().toString(36).slice(2) + Date.now().toString(36),
        name,
        cal,
        brand: (food as any).brand || null,
        isMyFood: (food as any).isMyFood || false,
        isCustom: (food as any).isCustom || false,
        protein: getN('Protein'),
        carbs: getN('Carbohydrate, by difference'),
        fat: getN('Total lipid (fat)'),
        fiber: getN('Fiber, total dietary'),
        sugar: getN('Sugars, total including NLEA'),
        sodium: getN('Sodium, Na', 'MG'),
        cholesterol: getN('Cholesterol', 'MG'),
        saturatedFat: getN('Fatty acids, total saturated'),
        fsId: (food as any).fsId || null,
        type: (food as any).type || 'food',
      }];
    }
    setFavorites(updated);
    await storageSet('pj_favorites', JSON.stringify(updated));
    saveToFirebase('my_foods', 'favorites', updated).catch(() => {});
  };

  const styles = useStyles(theme, themeId);
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <BackgroundLayers />
      {/* The two `right` actions were hand-built 38x38 squares with 22-24px icons -- built before
          HeaderIconButton existed, so they had drifted BIGGER than the same square everywhere else in the app
          (32 tall, 14px icon). Now the shared component, so Add Food's header stops disagreeing with the tabs
          and Bible. */}
      <ScreenHeader
        title={meal === 'browse' ? 'Food Library' : `Add to ${getMealDisplayName(meal, mealSlots, slotNameCache)}`}
        topInset={false}
        right={
          <>
            <HeaderIconButton
              icon="sparkles"
              onPress={() => router.push({ pathname: '/ai-meal-estimator', params: { meal, date } })}
            />
            {/* The one header icon that is deliberately NOT the filled variant, and NOT 14px. The filled-
                only rule exists because outline glyphs go faint on light themes -- but a barcode IS thin
                lines, so `barcode` (filled) just thickens the bars until they merge into a grey grate at
                small sizes. Outline keeps the bars separate, which is the entire glyph. 18px because a
                barcode is high-frequency detail where sparkles is not: the BOX stays 32 like every other
                header square (that is the consistency that matters), the icon inside gets room to read. */}
            <View ref={barcodeIconRef as any} collapsable={false}>
              <HeaderIconButton icon="barcode-outline" size={18} onPress={startScan} />
            </View>
          </>
        }
      />

      {/* Search */}
      <View ref={searchBarRef} style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search food..."
          placeholderTextColor={theme.textDim}
          value={query}
          onChangeText={searchFood}

        />
        </View>

{/* Scan banner -- shows while lastScannedBarcode is set. A quiet info banner with the "Tap SET"
          instruction, and the Create & Set button underneath as a real action. */}
      {lastScannedBarcode && (
        <View style={{ marginHorizontal: 16, marginBottom: 8, backgroundColor: theme.bgInset, borderWidth: 0.5, borderColor: theme.borderCard, borderRadius: 10, padding: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
            <Ionicons name="information-circle-outline" size={14} color={theme.textMuted} style={{ marginRight: 6 }} />
            <Text style={{ flexShrink: 1, fontSize: 12, color: theme.textMuted, fontFamily: Type.ui, lineHeight: 16, textAlign: 'center' }}>Tap SET on the correct item to confirm it for future scans</Text>
          </View>
          <TouchableOpacity
            ref={isTutorialScanMode ? (createBarcodeRef as any) : undefined}
            onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setBarcodeForCreate(lastScannedBarcode); setShowCreateFood(true); }}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44, paddingHorizontal: 12, backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder, borderRadius: 8, overflow: 'hidden' }}>
            <ButtonShine radius={8} />
            <Ionicons name="add-circle-outline" size={15} color={theme.accentBlue} />
            <Text style={{ fontSize: 13, color: theme.accentBlue, fontFamily: Type.uiSemibold }}>None match? Create & Set food</Text>
          </TouchableOpacity>
        </View>
      )}

{/* Tabs -- only show when not searching */}
      {!query.trim() && (
        <View ref={addFoodTabPillsRef} collapsable={false} style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'recent' && styles.tabActive]}
            onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setActiveTab('recent'); }}>
            <Text style={[styles.tabText, activeTab === 'recent' && styles.tabTextActive]}>Recent</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'myfoods' && styles.tabActive]}
            onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setActiveTab('myfoods'); }}>
            <Text style={[styles.tabText, activeTab === 'myfoods' && styles.tabTextActive]}>My Foods</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'favorites' && styles.tabActive]}
            onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setActiveTab('favorites'); }}>
            <Text style={[styles.tabText, activeTab === 'favorites' && styles.tabTextActive]}>Favorites</Text>
          </TouchableOpacity>
          <TouchableOpacity
  style={[styles.tab, activeTab === 'recipes' && styles.tabActive]}
  onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setActiveTab('recipes'); }}>
  <Text style={[styles.tabText, activeTab === 'recipes' && styles.tabTextActive]}>Recipes</Text>
</TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'pinned' && styles.tabActive]}
            onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setActiveTab('pinned'); }}>
            <Text style={[styles.tabText, activeTab === 'pinned' && styles.tabTextActive]}>Set Foods</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Sort button -- only on sortable tabs, hidden while searching */}
      {!query.trim() && activeTab !== 'recent' && (
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 14, paddingTop: 6, paddingBottom: 2 }}>
          <TouchableOpacity
            onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); openSortModal(); }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: sortOption !== 'az' ? theme.accentBlueBg : 'transparent', borderWidth: 1, borderColor: sortOption !== 'az' ? theme.accentBlueBorder : 'transparent' }}>
            <Ionicons name="swap-vertical" size={13} color={sortOption !== 'az' ? theme.accentBlue : theme.textMuted} />
            <Text style={{ fontSize: 11, color: sortOption !== 'az' ? theme.accentBlue : theme.textMuted, fontFamily: Type.uiSemibold }}>
              {sortOption === 'az' ? 'Sort' : sortOption === 'za' ? 'Z-A' : sortOption === 'cal-hl' ? 'Cal: High-Low' : sortOption === 'cal-lh' ? 'Cal: Low-High' : 'Protein: High-Low'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Loading indicator -- shows while a search or barcode lookup is in flight and nothing is shown yet */}
      {((searching && query.trim()) || barcodeLookup) && results.length === 0 && (
        <View style={{ alignItems: 'center', paddingTop: 40, gap: 10 }}>
          <ActivityIndicator size="small" color={theme.accentBlueRaw} />
          <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: Type.ui }}>{barcodeLookup ? 'Looking up barcode...' : 'Searching...'}</Text>
        </View>
      )}

      {/* Connection error state -- distinct from "no results" so offline never reads as "not found" */}
      {!searching && !barcodeLookup && searchError && query.trim() && results.length === 0 && (
        <View style={{ alignItems: 'center', paddingTop: 60, paddingHorizontal: 32, gap: 12 }}>
          <Ionicons name="cloud-offline-outline" size={40} color={theme.textDim} />
          <Text style={{ fontSize: 16, color: theme.textSecondary, fontFamily: Type.uiSemibold, textAlign: 'center' }}>
            Can't reach the food database
          </Text>
          <Text style={{ fontSize: 13, color: theme.textMuted, fontFamily: Type.ui, textAlign: 'center', lineHeight: 20 }}>
            Check your internet connection and try again.
          </Text>
          <TouchableOpacity
            onPress={() => searchFood(query)}
            style={{ marginTop: 4, backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder, borderRadius: 8, paddingHorizontal: 22, paddingVertical: 10 }}>
            <ButtonShine radius={8} />
            <Text style={{ fontSize: 13, color: theme.accentBlue, fontFamily: Type.uiSemibold }}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* No results state -- genuine empty only (not a connection error) */}
      {!searching && !barcodeLookup && !searchError && query.trim() && results.length === 0 && (
        <View style={{ alignItems: 'center', paddingTop: 60, paddingHorizontal: 32, gap: 12 }}>
          <Ionicons name="search-outline" size={40} color={theme.textDim} />
          <Text style={{ fontSize: 16, color: theme.textSecondary, fontFamily: Type.uiSemibold, textAlign: 'center' }}>
            No results for "{query}"
          </Text>
          <Text style={{ fontSize: 13, color: theme.textMuted, fontFamily: Type.ui, textAlign: 'center', lineHeight: 20 }}>
            Try a different search term or scan the barcode
          </Text>
        </View>
      )}

      {/* Offline but local matches exist -- show them, but be honest the online search didn't run */}
      {searchError && query.trim() && results.length > 0 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8 }}>
          <Ionicons name="cloud-offline-outline" size={14} color={theme.textMuted} />
          <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: Type.ui }}>Offline. Couldn't load online results.</Text>
        </View>
      )}

      {/* Results */}
      <FlatList
        ref={foodListRef}
        // No bottom clearance previously: Otto's 56px disc (bottom+20..bottom+76) sat right over the
        // last row/the FatSecret footer. Same +96 fix already applied on achievements/prayer/etc.
        contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
        data={query.trim() ? results :
          activeTab === 'recent' ? recentFoods :
          activeTab === 'favorites' ? (() => {
  const mapFav = (f: MyFood) => ({
    description: f.name,
    foodNutrients: [
      { nutrientName: 'Energy', unitName: 'KCAL', value: f.cal },
      { nutrientName: 'Protein', unitName: 'G', value: f.protein || 0 },
      { nutrientName: 'Carbohydrate, by difference', unitName: 'G', value: f.carbs || 0 },
      { nutrientName: 'Total lipid (fat)', unitName: 'G', value: f.fat || 0 },
      { nutrientName: 'Fiber, total dietary', unitName: 'G', value: f.fiber || 0 },
      { nutrientName: 'Sugars, total including NLEA', unitName: 'G', value: f.sugar || 0 },
      { nutrientName: 'Sodium, Na', unitName: 'MG', value: f.sodium || 0 },
      { nutrientName: 'Cholesterol', unitName: 'MG', value: f.cholesterol || 0 },
      { nutrientName: 'Fatty acids, total saturated', unitName: 'G', value: f.saturatedFat || 0 },
    ],
    isMyFood: (f as any).isMyFood || false,
    isCustom: (f as any).isCustom || false,
    fsId: (f as any).fsId || null,
    type: f.type || 'food',
    brand: (f as any).brand || null,
    labelPending: (f as any).labelPending || false,
    // Carry the AI flag through so openFoodDetail skips the FatSecret name-search for it.
    aiEstimated: (f as any).aiEstimated || false,
    // AI favorites have no gram serving; hand food-detail an existing-value basis (1 serving =
    // the whole estimate) so it renders "1 serving" instead of a bogus "Amount (g): 100".
    ...((f as any).aiEstimated ? {
      existingCal: f.cal,
      existingProtein: f.protein || 0,
      existingCarbs: f.carbs || 0,
      existingFat: f.fat || 0,
      existingAmount: '1',
      existingUnit: 'serving',
    } : {}),
  });
  const regularFavs = applySortToFoodItems(favorites.filter(f => f.type !== 'supplement').map(mapFav));
  const suppFavs = applySortToFoodItems(favorites.filter(f => f.type === 'supplement').map(mapFav));
  if (suppFavs.length === 0) return regularFavs;
  return [...regularFavs, { _isSuppDivider: true } as any, ...suppFavs];
})() :
          activeTab === 'recipes' ? applySortToFoodItems(recipes.map((r: any) => ({
            description: r.name,
            foodNutrients: [],
            isRecipe: true,
            recipeData: r,
            cal: r.servingCount > 0 ? Math.round(r.totalCal / r.servingCount) : r.totalCal,
          }))) :
          activeTab === 'pinned' ? applySortToFoodItems(Object.entries(barcodeOverrides).map(([barcode, item]: [string, any]) => ({
            ...resolveMyFoodOverride({ ...item, isOverride: true }),
            _pinnedBarcode: barcode,
            isPinned: true,
          }))) :
          (() => {
            const regularFoods = applySortToFoodItems(myFoods.filter(f => f.type !== 'supplement').map(f => ({
              description: f.name, brand: f.brand || null,
              foodNutrients: [
                { nutrientName: 'Energy', unitName: 'KCAL', value: f.cal },
                { nutrientName: 'Protein', unitName: 'G', value: f.protein || 0 },
                { nutrientName: 'Carbohydrate, by difference', unitName: 'G', value: f.carbs || 0 },
                { nutrientName: 'Total lipid (fat)', unitName: 'G', value: f.fat || 0 },
              ],
              isMyFood: true, servingSize: (f as any).servingSize || null,
              servingUnit: (f as any).servingUnit || null, isCustom: (f as any).isCustom || false,
              type: f.type || 'food',
            })));
            const supplements = applySortToFoodItems(myFoods.filter(f => f.type === 'supplement').map(f => ({
              description: f.name, brand: f.brand || null,
              foodNutrients: [
                { nutrientName: 'Energy', unitName: 'KCAL', value: f.cal },
                { nutrientName: 'Protein', unitName: 'G', value: f.protein || 0 },
                { nutrientName: 'Carbohydrate, by difference', unitName: 'G', value: f.carbs || 0 },
                { nutrientName: 'Total lipid (fat)', unitName: 'G', value: f.fat || 0 },
              ],
              isMyFood: true, servingSize: (f as any).servingSize || null,
              servingUnit: (f as any).servingUnit || null, isCustom: (f as any).isCustom || false,
              type: 'supplement' as const,
            })));
            if (supplements.length === 0) return regularFoods;
            return [...regularFoods, { _isSuppDivider: true } as any, ...supplements];
          })()
        }
        keyExtractor={(item, i) => {
          if ((item as any)._isSuppDivider) return 'supp-divider';
          if ((item as any).recipeData) return `recipe-${(item as any).recipeData.name || i}`;
          // Append the index so two results that share an id/fsId (e.g. a barcode result plus the
          // same food already in the search list) can never collide into a duplicate React key.
          const base = (item as any).id || ((item as any).fsId ? `fs_${(item as any).fsId}` : 'item');
          return `${base}_${i}`;
        }}
        renderItem={({ item, index }) => {
          if ((item as any)._isSuppDivider) {
            return (
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, gap: 10 }}>
                <View style={{ flex: 1, height: 0.5, backgroundColor: theme.borderCard }} />
                <Text style={{ fontSize: 9, fontFamily: Type.uiBold, letterSpacing: 3, color: theme.textMuted, textTransform: 'uppercase' }}>Supplements</Text>
                <View style={{ flex: 1, height: 0.5, backgroundColor: theme.borderCard }} />
              </View>
            );
          }
          const macros = getMacros(item);
          const nameParts = item.description.split(' · ');
          const foodName = nameParts[0];
          const brandName = (item as any).brand || (nameParts.length > 1 ? nameParts.slice(1).join(' · ') : null);
          const isSupplement = (item as any).type === 'supplement';
          const rowLoadingKey = `${(item as any).id || (item as any).fsId || item.description}_${index}`;
          // Also true while this food's label serving is still being looked up, so the row shows a
          // spinner rather than a placeholder number that's about to change under the user.
          const isRowLoading = loadingItemKey === rowLoadingKey || !!(item as any).labelPending;
          return (
            <Animated.View
              ref={
                index === 0 && isTutorialScanMode ? (topResultRef as any) :
                index === 0 && isTutorialMode ? (firstResultRef as any) :
                (item as any).recipeData?.tutorialRecipe ? (tutorialRecipeRowRef as any) :
                undefined
              }
              style={{ opacity: activeTab === 'favorites' && !query.trim() ? getFavOpacity(item.description) : 1 }}>
            <TouchableOpacity style={[styles.resultItem, (item as any).isOverride && styles.resultItemSet, isRowLoading && { opacity: 0.5 }]} disabled={!!loadingItemKey} onPress={async () => {
              triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
              setLoadingItemKey(rowLoadingKey);
              try { await openFoodDetail(item); } finally { setLoadingItemKey(null); }
            }}>
              <View style={styles.resultLeft}>
                {/* Badges */}
                {activeTab === 'favorites' && !query.trim() && ((item as any).isMyFood || (item as any).isCustom) && (
                  <View style={[styles.savedBadge, { backgroundColor: theme.accentGreenBg }]}>
                    <Text style={[styles.savedBadgeText, { color: theme.accentGreen }]}>MY FOOD</Text>
                  </View>
                )}
                {(item.isMyFood || item.isRecipe || (item.isRecent && query.trim())) && !(activeTab === 'favorites' && !query.trim()) && (
                  <View style={item.isRecipe ? [styles.savedBadge, { backgroundColor: theme.accentGreenBg }] : item.isRecent && query.trim() ? [styles.savedBadge, { backgroundColor: theme.textMuted }] : styles.savedBadge}>
                    <Text style={item.isRecipe ? [styles.savedBadgeText, { color: theme.accentGreen }] : item.isRecent && query.trim() ? [styles.savedBadgeText, { color: theme.textMuted }] : styles.savedBadgeText}>
                      {item.isRecipe ? 'RECIPE' : item.isRecent && query.trim() ? 'RECENT' : 'SAVED'}
                    </Text>
                  </View>
                )}
                {/* Food name + brand */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  {isSupplement && <Ionicons name="medical" size={11} color={theme.textMuted} />}
                  <GradientTitle title={foodName} color={theme.textSecondary} style={{ fontSize: 14, fontFamily: Type.uiSemibold }} numberOfLines={1} />
                </View>
                <Text style={[styles.resultBrand, !brandName && { color: theme.textDim }]} numberOfLines={1}>{brandName || 'Unbranded'}</Text>
                {/* Macro strip */}
                {macros && (
                  <View style={styles.macroStrip}>
                    <View style={styles.macroDot}>
                      <View style={[styles.dotCircle, { backgroundColor: '#0d9268' }]} />
                      <Text style={styles.macroVal}>{macros.protein}g</Text>
                    </View>
                    <View style={styles.macroDot}>
                      <View style={[styles.dotCircle, { backgroundColor: '#c47d1a' }]} />
                      <Text style={styles.macroVal}>{macros.carbs}g</Text>
                    </View>
                    <View style={styles.macroDot}>
                      <View style={[styles.dotCircle, { backgroundColor: '#a83232' }]} />
                      <Text style={styles.macroVal}>{macros.fat}g</Text>
                    </View>
                  </View>
                )}
              </View>
              {/* Right side -- fixed layout so everything aligns */}
              <View style={styles.resultRight}>
                {(item as any).isPinned ? (
                  <TouchableOpacity
                    ref={index === 0 && isTutorialScanMode ? (unsetButtonRef as any) : undefined}
                    onPress={() => {
                      const foodName = (item as any).description || 'this food';
                      Alert.alert(
                        'Remove Barcode Link?',
                        `"${foodName}" will no longer be linked to this barcode. You can re-link it by scanning again.`,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Remove', style: 'destructive', onPress: () => unsetOverride((item as any)._pinnedBarcode) },
                        ]
                      );
                    }}
                    style={{ marginRight: 6, backgroundColor: 'rgba(204,51,51,0.12)', borderWidth: 1, borderColor: 'rgba(204,51,51,0.4)', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 3 }}>
                    <Text style={{ fontSize: 10, color: '#cc3333', fontFamily: Type.uiSemibold }}>UNSET</Text>
                  </TouchableOpacity>
                ) : (item as any).isOverride ? (
                  <Ionicons name="checkmark-circle" size={16} color={theme.accentGreen} style={{ marginRight: 6 }} />
                ) : lastScannedBarcode ? (
                  <TouchableOpacity
                    ref={index === 1 && isTutorialScanMode ? (setButtonRef as any) : undefined}
                    onPress={() => saveOverride(item)}
                    style={{ marginRight: 6, backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 3 }}>
                    <Text style={{ fontSize: 10, color: theme.accentBlue, fontFamily: Type.uiSemibold }}>SET</Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity onPress={() => toggleFavorite(item)} style={styles.starBtn}>
                  <Ionicons
                    name={favorites.some(f => {
                      const iId = (item as any).fsId; const fId = (f as any).fsId;
                      if (iId && fId) return fId === iId;
                      if (iId || fId) return false;
                      return f.name === item.description && !!(f as any).isMyFood === !!(item as any).isMyFood;
                    }) ? 'star' : 'star-outline'}
                    size={16}
                    color={favorites.some(f => {
                      const iId = (item as any).fsId; const fId = (f as any).fsId;
                      if (iId && fId) return fId === iId;
                      if (iId || fId) return false;
                      return f.name === item.description && !!(f as any).isMyFood === !!(item as any).isMyFood;
                    }) ? theme.accentAmber : theme.textDim}
                  />
                </TouchableOpacity>
                <View style={styles.calBlock}>
                  {isRowLoading ? (
                    <ActivityIndicator size="small" color={theme.accentBlue} />
                  ) : (
                    <>
                      <GradientNumber value={String(getCalories(item))} color={theme.accentGreen} style={{ fontSize: 20, fontFamily: Type.num, textAlign: 'right' }} />
                      <Text style={styles.resultCalLabel}>kcal</Text>
                    </>
                  )}
                </View>
                {item.isMyFood && activeTab === 'myfoods' && (
                  <>
                    <TouchableOpacity
                      onPress={() => {
                        triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                        const idx = myFoods.findIndex(f => (item as any).id ? (f as any).id === (item as any).id : f.name === item.description);
                        if (idx >= 0) openEditModal(myFoods[idx]);
                      }}
                      style={{ marginLeft: 4, paddingHorizontal: 8, paddingVertical: 10 }}>
                      <Text style={{ fontSize: 12, color: theme.accentBlue, fontFamily: Type.uiMedium }}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); deleteMyFood(myFoods.findIndex(f => (item as any).id ? (f as any).id === (item as any).id : f.name === item.description)); }} style={styles.deleteBtn}>
                      <Text style={styles.deleteBtnText}>×</Text>
                    </TouchableOpacity>
                  </>
                )}
                {item.isRecipe && activeTab === 'recipes' && (
                  <>
                    <TouchableOpacity
                      onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); router.push({ pathname: '/recipe-builder', params: { recipeId: (item as any).recipeData?.id } }); }}
                      style={{ marginLeft: 4, paddingHorizontal: 8, paddingVertical: 10 }}>
                      <Text style={{ fontSize: 12, color: theme.accentBlue, fontFamily: Type.uiMedium }}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      ref={(item as any).recipeData?.tutorialRecipe ? (tutorialRecipeDeleteRef as any) : undefined}
                      onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); deleteRecipe((item as any).recipeData?.id, item.description); }}
                      style={styles.deleteBtn}>
                      <Text style={styles.deleteBtnText}>×</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </TouchableOpacity>
            </Animated.View>
          );
        }}
        ListEmptyComponent={() => {
          if (query.trim()) return null;
          const configs: Record<string, { icon: string; title: string; subtitle: string }> = {
            recent: {
              icon: 'time-outline',
              title: 'No recent foods',
              subtitle: 'Foods you log will appear here for quick access',
            },
            myfoods: {
              icon: 'bookmark-outline',
              title: 'No saved foods',
              subtitle: 'Save custom foods to your library for quick logging',
            },
            favorites: {
              icon: 'star-outline',
              title: 'No favorites yet',
              subtitle: 'Tap the star on any food to save it here',
            },
            recipes: {
              icon: 'restaurant-outline',
              title: 'No recipes yet',
              subtitle: 'Build a recipe to log multiple ingredients at once',
            },
            pinned: {
              icon: 'pin-outline',
              title: 'No pinned foods',
              subtitle: 'Scan a barcode and tap SET to pin a food to that barcode',
            },
          };
          const config = configs[activeTab];
          if (!config) return null;
          return (
            <View style={{ alignItems: 'center', paddingTop: 60, paddingHorizontal: 32, gap: 12 }}>
              <Ionicons name={config.icon as any} size={40} color={theme.textDim} />
              <Text style={{ fontSize: 16, color: theme.textSecondary, fontFamily: Type.uiSemibold, textAlign: 'center' }}>
                {config.title}
              </Text>
              <Text style={{ fontSize: 13, color: theme.textMuted, fontFamily: Type.ui, textAlign: 'center', lineHeight: 20 }}>
                {config.subtitle}
              </Text>
            </View>
          );
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListFooterComponent={() => (
          <View>
            {lastScannedBarcode && myFoods.length > 0 && (
              <View style={{ marginHorizontal: 12, marginTop: 8, marginBottom: 4 }}>
                <TouchableOpacity
                  onPress={() => setShowSavedFoodsSection(v => !v)}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 14, backgroundColor: theme.accentBlueBgOpaque, borderWidth: 1, borderColor: theme.accentBlueBorder, borderRadius: 10 }}>
                  {/* Was translucent (accentBlueBg) over the moving page glow, so the button dissolved into
                      the background -- same fix as View All Achievements (accentBlueBgOpaque). Also dropped
                      the hand-rolled 1.5px bright top border: shine owns the top-light, a border stays on
                      all four sides, having both was doubled-up. */}
                  <ButtonShine radius={10} />
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="bookmark" size={14} color={theme.accentBlue} />
                    <Text style={{ fontSize: 9, color: theme.accentBlue, fontFamily: Type.uiBold, letterSpacing: 3, textTransform: 'uppercase' }}>
                      Use a Saved Food ({myFoods.length})
                    </Text>
                  </View>
                  <Ionicons name={showSavedFoodsSection ? 'chevron-up' : 'chevron-down'} size={14} color={theme.accentBlue} />
                </TouchableOpacity>
                {showSavedFoodsSection && myFoods.map((f, i) => (
                  <View key={f.name + i} style={[styles.resultItem, { marginHorizontal: 0, marginTop: 2 }]}>
                    <View style={styles.resultLeft}>
                      <View style={styles.savedBadge}>
                        <Text style={styles.savedBadgeText}>SAVED</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        {f.type === 'supplement' && <Ionicons name="medical" size={11} color={theme.textMuted} />}
                        <GradientTitle title={f.name} color={theme.textSecondary} style={{ fontSize: 14, fontFamily: Type.uiSemibold }} numberOfLines={1} />
                      </View>
                      {f.brand ? <Text style={styles.resultBrand} numberOfLines={1}>{f.brand}</Text> : null}
                      {(f.protein != null || f.carbs != null || f.fat != null) && (
                        <View style={styles.macroStrip}>
                          <View style={styles.macroDot}>
                            <View style={[styles.dotCircle, { backgroundColor: '#0d9268' }]} />
                            <Text style={styles.macroVal}>{Math.round(f.protein || 0)}g</Text>
                          </View>
                          <View style={styles.macroDot}>
                            <View style={[styles.dotCircle, { backgroundColor: '#c47d1a' }]} />
                            <Text style={styles.macroVal}>{Math.round(f.carbs || 0)}g</Text>
                          </View>
                          <View style={styles.macroDot}>
                            <View style={[styles.dotCircle, { backgroundColor: '#a83232' }]} />
                            <Text style={styles.macroVal}>{Math.round(f.fat || 0)}g</Text>
                          </View>
                        </View>
                      )}
                    </View>
                    <View style={styles.resultRight}>
                      <TouchableOpacity
                        onPress={() => {
                          const foodItem = {
                            description: f.name,
                            foodNutrients: [
                              { nutrientName: 'Energy', unitName: 'KCAL', value: f.cal },
                              { nutrientName: 'Protein', unitName: 'G', value: f.protein || 0 },
                              { nutrientName: 'Carbohydrate, by difference', unitName: 'G', value: f.carbs || 0 },
                              { nutrientName: 'Total lipid (fat)', unitName: 'G', value: f.fat || 0 },
                            ],
                            isMyFood: true,
                            id: f.id,
                            type: f.type || 'food',
                          };
                          saveOverride(foodItem);
                          openFoodDetail(foodItem);
                        }}
                        style={{ marginRight: 6, backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 3 }}>
                        <Text style={{ fontSize: 10, color: theme.accentBlue, fontFamily: Type.uiSemibold }}>SET</Text>
                      </TouchableOpacity>
                      <View style={styles.calBlock}>
                        <GradientNumber value={String(f.cal)} color={theme.accentGreen} style={{ fontSize: 20, fontFamily: Type.num, textAlign: 'right' }} />
                        <Text style={styles.resultCalLabel}>kcal</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
            {lastScannedBarcode && !query.trim() && (
              <View style={{ marginHorizontal: 12, marginTop: 8, marginBottom: 4 }}>
                <TouchableOpacity
                  onPress={() => { setBarcodeForCreate(lastScannedBarcode); setShowCreateFood(true); }}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 14, backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder, borderRadius: 10, borderTopWidth: 1.5, borderTopColor: theme.accentBlueRaw }}>
                  {/* Same doubled top-light as "Use a Saved Food" above: bright 1.5px accent top border AND
                      the shine. Judge them together -- they are twins. */}
                  <ButtonShine radius={10} />
                  <Ionicons name="add-circle" size={16} color={theme.accentBlueRaw} />
                  <Text style={{ fontSize: 13, color: theme.accentBlueRaw, fontFamily: Type.uiSemibold }}>Create Food for this Barcode</Text>
                </TouchableOpacity>
              </View>
            )}
            {(!query.trim() || results.length > 0) ? (
              <TouchableOpacity
                onPress={() => Linking.openURL('https://platform.fatsecret.com')}
                style={{ alignItems: 'center', paddingVertical: 20, paddingBottom: 32, opacity: 0.65, alignSelf: 'center' }}>
                <Image
                  source={{ uri: 'https://platform.fatsecret.com/api/static/images/powered_by_fatsecret_horizontal_brand.png' }}
                  style={{ width: 140, height: 34 }}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            ) : null}
          </View>
        )}
      />

     {foodCapWall && (
       <CapWallModal
         capKey="foods"
         cap={capFor('foods', isSupporter) ?? 0}
         count={myFoods.length}
         theme={theme}
         onDismiss={() => setFoodCapWall(false)}
       />
     )}

     <CustomFoodCreator
        visible={showCreateFood}
        title={barcodeForCreate ? 'Create & Set Food' : undefined}
        tutorialMode={isTutorialCreateMode}
        prefill={isTutorialCreateMode ? { name: 'Protein Shake', calories: 200 } : undefined}
        onClose={() => { setShowCreateFood(false); setBarcodeForCreate(null); setIsTutorialCreateMode(false); }}
        onSaved={(newFood) => {
          loadMyFoods();
          if (barcodeForCreate) {
            pinFoodToBarcode(barcodeForCreate, newFood);
            setBarcodeForCreate(null);
            setLastScannedBarcode(null);
            openFoodDetail({
              description: newFood.name,
              foodNutrients: newFood.foodNutrients,
              isMyFood: true,
              isCustom: true,
              myFoodData: newFood,
            } as any);
          }
        }}
      />

      <EditFoodModal
        visible={showEditMyFood}
        editFoodData={editFoodData}
        setEditFoodData={setEditFoodData}
        onSave={saveEditFood}
        onClose={closeEditModal}
      />

      {/* Camera */}
      {scanning && (
        <Animated.View style={[styles.cameraOverlay, { opacity: cameraOpacity }]}>
          <CameraView
            style={styles.camera}
            onBarcodeScanned={closingCamera ? undefined : handleBarcodeScan}
            barcodeScannerSettings={{ barcodeTypes: ['upc_a', 'upc_e', 'ean13', 'ean8'] }}
            enableTorch={torchOn}
          />
          {/* Scan confirmation flash */}
          <Animated.View
            pointerEvents="none"
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#ffffff', opacity: scanFlash }}
          />
          {/* Viewfinder -- only show after camera is ready */}
          {cameraReady && !closingCamera && (
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
              {/* Dark bands */}
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '30%', backgroundColor: 'rgba(0,0,0,0.55)' }} />
              <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '35%', backgroundColor: 'rgba(0,0,0,0.55)' }} />
              <View style={{ position: 'absolute', top: '30%', bottom: '35%', left: 0, width: '10%', backgroundColor: 'rgba(0,0,0,0.55)' }} />
              <View style={{ position: 'absolute', top: '30%', bottom: '35%', right: 0, width: '10%', backgroundColor: 'rgba(0,0,0,0.55)' }} />
              {/* Corner brackets + scan line */}
              <View
                style={{ width: '80%', aspectRatio: 2.5, position: 'relative' }}
                onLayout={e => {
                  const h = e.nativeEvent.layout.height;
                  if (h > 0 && h !== viewfinderHeight) {
                    setViewfinderHeight(h);
                    startScanLineAnim(h);
                  }
                }}>
                <View style={{ position: 'absolute', top: 0, left: 0, width: 28, height: 28, borderTopWidth: 3, borderLeftWidth: 3, borderColor: theme.accentBlueRaw, borderTopLeftRadius: 4 }} />
                <View style={{ position: 'absolute', top: 0, right: 0, width: 28, height: 28, borderTopWidth: 3, borderRightWidth: 3, borderColor: theme.accentBlueRaw, borderTopRightRadius: 4 }} />
                <View style={{ position: 'absolute', bottom: 0, left: 0, width: 28, height: 28, borderBottomWidth: 3, borderLeftWidth: 3, borderColor: theme.accentBlueRaw, borderBottomLeftRadius: 4 }} />
                <View style={{ position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderBottomWidth: 3, borderRightWidth: 3, borderColor: theme.accentBlueRaw, borderBottomRightRadius: 4 }} />
                <Reanimated.View style={[
                  { position: 'absolute', left: 4, right: 4, height: 2, backgroundColor: theme.accentBlueRaw, borderRadius: 1 },
                  scanLineStyle,
                ]} />
              </View>
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontFamily: Type.ui, marginTop: 12, letterSpacing: 1 }}>
                Align barcode within frame
              </Text>
              {/* Torch toggle */}
              <TouchableOpacity
                onPress={() => setTorchOn(t => !t)}
                style={{
                  position: 'absolute',
                  bottom: 100,
                  alignSelf: 'center',
                  backgroundColor: torchOn ? theme.accentBlueRaw : 'rgba(0,0,0,0.5)',
                  borderRadius: 30,
                  width: 52,
                  height: 52,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: theme.accentBlueRaw,
                }}>
                <Ionicons name={torchOn ? 'flashlight' : 'flashlight-outline'} size={24} color="#ffffff" />
              </TouchableOpacity>
              {/* Cancel -- only shows when camera is ready */}
              <TouchableOpacity style={{ position: 'absolute', bottom: 40, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.5)', borderWidth: 1, borderColor: theme.accentBlueRaw, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 8 }} onPress={() => stopScanning(200)}>
                <Text style={{ color: '#ffffff', fontSize: 16, fontFamily: Type.uiSemibold }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      )}

      {/* Sort modal */}
      <Modal visible={showSortModal} transparent animationType="none" onRequestClose={closeSortModal} onShow={onSortModalShow}>
        <Reanimated.View style={[{ flex: 1, backgroundColor: theme.overlayBg, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 }, sortOverlayStyle]}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={closeSortModal} />
          <Reanimated.View style={[{ backgroundColor: theme.bgSheet, borderRadius: 18, borderWidth: 0.5, borderTopWidth: 1.5, borderColor: theme.borderCard, borderTopColor: theme.accentBlueRaw, width: '100%', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 20 }, sortCardStyle]}>
            <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); closeSortModal(); }} style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 4 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.textDim }} />
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14, borderBottomWidth: 0.5, borderBottomColor: theme.borderCard }}>
              <GradientTitle title="Sort" color={theme.accentBlue} style={{ fontSize: 18, fontFamily: Type.display, letterSpacing: 0.3 }} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {sortOption !== 'az' && (
                  <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setSortOption('az'); }} style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: theme.accentRedBorder, backgroundColor: theme.accentRedBg }}>
                    <Text style={{ color: theme.accentRed, fontSize: 11, fontFamily: Type.uiBold }}>CLEAR</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); closeSortModal(); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close" size={20} color={theme.textMuted} />
                </TouchableOpacity>
              </View>
            </View>
            <View style={{ padding: 20 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {([
                  ['az', 'A–Z'],
                  ['za', 'Z–A'],
                  ['cal-hl', 'Calories: High-Low'],
                  ['cal-lh', 'Calories: Low-High'],
                  ['protein-hl', 'Protein: High-Low'],
                ] as const).map(([val, label]) => (
                  <TouchableOpacity
                    key={val}
                    onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setSortOption(val); }}
                    style={{ backgroundColor: sortOption === val ? theme.accentBlueBg : theme.bgInset, borderWidth: 1, borderColor: sortOption === val ? theme.accentBlueBorder : theme.borderCard, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 }}>
                    <Text style={{ fontSize: 13, fontFamily: Type.uiSemibold, color: sortOption === val ? theme.accentBlue : theme.textMuted }}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </Reanimated.View>
        </Reanimated.View>
      </Modal>

      {/* FAB (AI Estimate / Create Recipe / Create Food) -- shows in browse AND when adding to a meal,
          so you can create a food without backing out to the Library first (tester feedback). Hidden
          only when adding an ingredient to a recipe, where that flow is different. */}
      {!isRecipeMode && (
        <>
          {showFabMenu && (
            <TouchableOpacity
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
              activeOpacity={1}
              onPress={closeFabMenu}
            />
          )}

          {showFabMenu && (
            <View style={{ position: 'absolute', bottom: 90 + insets.bottom, right: 20, alignItems: 'flex-end', gap: 12 }}>
              {/* Barcode - new top, animates fourth */}
              <Animated.View style={{ opacity: fabItem4Anim, transform: [{ translateY: fabItem4Anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <TouchableOpacity
                    onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Medium); closeFabMenu(); startScan(); }}
                    style={{ backgroundColor: theme.accentBlue, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 2, borderColor: theme.bgPrimary, shadowColor: theme.accentBlue, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 6 }}>
                    <ButtonShine radius={8} solid />
                    <Text style={{ color: '#ffffff', fontSize: 13, fontFamily: Type.uiSemibold }}>Barcode</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Medium); closeFabMenu(); startScan(); }}
                    style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.accentBlue, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: theme.bgPrimary, shadowColor: theme.accentBlue, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 6 }}>
                    <ButtonShine radius={22} solid />
                    <Ionicons name="barcode-outline" size={20} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              </Animated.View>

              {/* AI Estimate - top, animates third */}
              <Animated.View style={{ opacity: fabItem3Anim, transform: [{ translateY: fabItem3Anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <TouchableOpacity
                    onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Medium); closeFabMenu(); router.push('/ai-meal-estimator'); }}
                    style={{ backgroundColor: theme.accentBlue, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 2, borderColor: theme.bgPrimary, shadowColor: theme.accentBlue, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 6 }}>
                    <ButtonShine radius={8} solid />
                    <Text style={{ color: '#ffffff', fontSize: 13, fontFamily: Type.uiSemibold }}>AI Estimate</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Medium); closeFabMenu(); router.push('/ai-meal-estimator'); }}
                    style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.accentBlue, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: theme.bgPrimary, shadowColor: theme.accentBlue, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 6 }}>
                    <ButtonShine radius={22} solid />
                    <Ionicons name="sparkles" size={20} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              </Animated.View>

              {/* Create Recipe - middle, animates second */}
              <Animated.View style={{ opacity: fabItem2Anim, transform: [{ translateY: fabItem2Anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <TouchableOpacity
                    onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Medium); closeFabMenu(); router.push('/recipe-builder'); }}
                    style={{ backgroundColor: theme.accentBlue, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 2, borderColor: theme.bgPrimary, shadowColor: theme.accentBlue, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 6 }}>
                    <ButtonShine radius={8} solid />
                    <Text style={{ color: '#ffffff', fontSize: 13, fontFamily: Type.uiSemibold }}>Create Recipe</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Medium); closeFabMenu(); router.push('/recipe-builder'); }}
                    style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.accentBlue, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: theme.bgPrimary, shadowColor: theme.accentBlue, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 6 }}>
                    <ButtonShine radius={22} solid />
                    <Ionicons name="book-outline" size={20} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              </Animated.View>

              {/* Create Food - bottom, animates first */}
              {/* ⚠️ ITEM C: at the cap this row goes DIM with the flat gold lock and STAYS PRESSABLE -- the tap
                  is what explains. A disabled button would say "you did something wrong" for something the
                  user cannot fix. Both touchables (pill + round icon) are one button and must move together. */}
              <Animated.View style={{ opacity: fabItem1Anim, transform: [{ translateY: fabItem1Anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <TouchableOpacity
                    onPress={onCreateFoodPress}
                    style={foodCap.canCreate
                      ? { backgroundColor: theme.accentBlue, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 2, borderColor: theme.bgPrimary, shadowColor: theme.accentBlue, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 6 }
                      : { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.textMuted, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 2, borderColor: theme.bgPrimary }}>
                    {foodCap.canCreate && <ButtonShine radius={8} solid />}
                    {!foodCap.canCreate && <Ionicons name="lock-closed" size={12} color={GOLD_BASE} />}
                    <Text style={{ color: '#ffffff', fontSize: 13, fontFamily: Type.uiSemibold }}>Create Food</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={onCreateFoodPress}
                    style={foodCap.canCreate
                      ? { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.accentBlue, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: theme.bgPrimary, shadowColor: theme.accentBlue, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 6 }
                      : { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.textMuted, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: theme.bgPrimary }}>
                    {foodCap.canCreate && <ButtonShine radius={22} solid />}
                    <Ionicons name={foodCap.canCreate ? 'restaurant-outline' : 'lock-closed'} size={20} color={foodCap.canCreate ? '#ffffff' : GOLD_BASE} />
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </View>
          )}

          <Animated.View style={{ position: 'absolute', bottom: 20 + insets.bottom, right: 20, transform: [{ scale: fabScale }] }}>
            <TouchableOpacity
              ref={createFoodFabRef as any}
              onPress={toggleFabMenu}
              onPressIn={() => Animated.timing(fabScale, { toValue: 0.9, duration: 80, useNativeDriver: true }).start()}
              onPressOut={() => Animated.timing(fabScale, { toValue: 1, duration: 80, useNativeDriver: true }).start()}
              activeOpacity={1}
              style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: theme.accentBlue, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: theme.bgPrimary, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 }}>
              <FabDome size={56} />
              <Ionicons name={showFabMenu ? 'close' : 'add'} size={28} color="#ffffff" />
            </TouchableOpacity>
          </Animated.View>
        </>
      )}
    </View>
  );
}

const useStyles = (theme: any, themeId: string) => {
  // Was a PRIVATE per-theme opacity map living here -- a hand-rolled duplicate of theme.cardShadowOpacity,
  // used in exactly one place (resultCard below) and sitting next to a hardcoded '#000'. The token already
  // does this, per theme, and is tinted (navy on Light, brown on Warm) rather than black.
  const shadowOpacity = theme.cardShadowOpacity;
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bgPrimary },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.borderCard },
  backBtn: { padding: 4 },
  backBtnText: { color: theme.accentBlue, fontSize: 14, fontFamily: Type.uiMedium },
  headerTitle: { ...PAGE_TITLE, color: theme.accentBlueRaw },
  scanBtn: { padding: 4 },
  scanBtnText: { fontSize: 20 },
  searchRow: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingBottom: 8 },
  searchInput: { flex: 1, backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, color: theme.textPrimary, padding: 12, fontSize: 15, fontFamily: Type.ui },
  searching: { color: theme.textMuted, marginLeft: 8, fontFamily: Type.ui },
  addNewForm: { marginHorizontal: 16, marginBottom: 8, backgroundColor: theme.bgCard, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: theme.borderCard },
  formInput: { backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 6, color: theme.textPrimary, padding: 10, fontSize: 14, fontFamily: Type.ui, marginBottom: 8 },
  formRow: { flexDirection: 'row', gap: 8 },
  saveBtn: { backgroundColor: theme.accentGreenBg, borderWidth: 1, borderColor: theme.accentGreenBorder, borderRadius: 6, paddingHorizontal: 16, justifyContent: 'center' },
  saveBtnText: { color: theme.accentGreen, fontFamily: Type.uiSemibold, fontSize: 14 },
  resultItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 12, marginVertical: 4,
    minHeight: 76,
    backgroundColor: theme.bgCard,
    borderWidth: 0.5, borderColor: theme.borderCard,
    borderTopColor: 'rgba(255,255,255,0.1)',
    borderLeftWidth: 3, borderLeftColor: theme.accentBlueRaw,
    borderRadius: 10, padding: 14,
    shadowColor: theme.cardShadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity, shadowRadius: 6,
  },
  resultLeft: { flex: 1, marginRight: 12 },
  savedBadge: { backgroundColor: theme.accentBlueBg, borderRadius: 3, paddingHorizontal: 5, paddingVertical: 1, alignSelf: 'flex-start', marginBottom: 4 },
  savedBadgeText: { fontSize: 8, color: theme.accentBlue, fontFamily: Type.uiBold },
  resultName: { fontSize: 14, color: theme.textSecondary, fontFamily: Type.uiSemibold },
  resultBrand: { fontSize: 11, color: theme.textMuted, fontFamily: Type.ui, marginTop: 1 },
  macroStrip: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5 },
  macroDot: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  dotCircle: { width: 6, height: 6, borderRadius: 3 },
  macroVal: { fontSize: 11, color: theme.textMuted, fontFamily: Type.ui },
  resultRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  starBtn: { padding: 4 },
  calBlock: { alignItems: 'flex-end', minWidth: 46 },
  resultCal: { fontSize: 20, color: theme.accentGreen, fontFamily: Type.num, textAlign: 'right' },
  resultCalLabel: { fontSize: 9, color: theme.textMuted, fontFamily: Type.ui, textAlign: 'right', marginTop: -2 },
  deleteBtn: { marginLeft: 8, padding: 4 },
  deleteBtnText: { fontSize: 18, color: theme.textDim },
  cameraOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 },
  camera: { flex: 1 },
  cancelScan: { position: 'absolute', bottom: 40, alignSelf: 'center', backgroundColor: theme.overlayBg, padding: 16, borderRadius: 8 },
  cancelScanText: { color: theme.textPrimary, fontSize: 16, fontFamily: Type.uiSemibold },
  tabRow: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 8, backgroundColor: theme.textMuted, borderRadius: 8, padding: 4 },
  tab: { flex: 1, padding: 8, alignItems: 'center', borderRadius: 6 },
  tabActive: { backgroundColor: theme.bgCard, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 3 },
  tabText: { fontSize: 11, color: theme.textMuted, fontFamily: Type.uiMedium },
  tabTextActive: { color: theme.textPrimary, fontFamily: Type.uiBold },
  modalOverlay: { flex: 1, backgroundColor: theme.overlayBg, justifyContent: 'flex-end' },
  modal: { backgroundColor: theme.bgCard, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 24, borderWidth: 1, borderColor: theme.borderCard },
  modalTitle: { fontSize: 18, color: theme.textPrimary, fontFamily: Type.uiSemibold, marginBottom: 16 },
  modalInput: { backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 6, color: theme.textPrimary, padding: 10, fontSize: 14, fontFamily: Type.ui, marginBottom: 10 },
  modalBtns: { flexDirection: 'row', gap: 8, marginTop: 8 },
  modalCancelBtn: { flex: 1, padding: 12, backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 6, alignItems: 'center' },
  modalCancelText: { color: theme.textMuted, fontFamily: Type.uiMedium, fontSize: 14 },
  modalSaveBtn: { flex: 1, padding: 12, backgroundColor: theme.accentBlue, borderRadius: 6, alignItems: 'center' },
  modalSaveText: { color: theme.textWhite, fontFamily: Type.uiBold, fontSize: 16, letterSpacing: 1 },
  resultItemSet: { borderLeftColor: '#0d9268' },
  });
};