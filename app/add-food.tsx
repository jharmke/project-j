import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Camera, CameraView } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, FlatList, Image, KeyboardAvoidingView, Linking, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Reanimated, { Easing as ReEasing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { Svg, Path, G } from 'react-native-svg';
import { useToast } from '../components/Toast';
import CustomFoodCreator from '../components/CustomFoodCreator';
import { USDA_API_KEY } from '../config';
import { db, getUserId, loadFromFirebase, saveToFirebase } from '../firebaseConfig';
import { useTheme } from '../theme';
import CryptoJS from 'crypto-js';




interface MyFood {
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
}

interface SearchResult {
  description: string;
  foodNutrients: any[];
  isMyFood?: boolean;
  isRecipe?: boolean;
  recipeData?: any;
  cal?: number;
}

// ─── FatSecret OAuth 1.0a helpers ───────────────────────────────────────────

const FS_KEY = 'b8543feaeabd412f81427bc901e2f3b9';
const FS_SECRET = '659c1da30b4e48eaab5788534cb2b77a';
const FS_BASE = 'https://platform.fatsecret.com/rest/server.api';

function hmacSha1(key: string, message: string): string {
  return CryptoJS.HmacSHA1(message, key).toString(CryptoJS.enc.Base64);
}

function buildOAuthParams(): Record<string, string> {
  return {
    oauth_consumer_key: FS_KEY,
    oauth_nonce: Math.random().toString(36).substring(2) + Date.now().toString(36),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_version: '1.0',
  };
}

function signRequest(method: string, url: string, params: Record<string, string>): string {
  const sorted = Object.keys(params).sort().map(k =>
    `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`
  ).join('&');
  const base = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(sorted)}`;
  const signingKey = `${encodeURIComponent(FS_SECRET)}&`;
  return hmacSha1(signingKey, base);
}

function buildFatSecretUrl(apiParams: Record<string, string>): string {
  const oauth = buildOAuthParams();
  const allParams = { ...oauth, ...apiParams };
  const sig = signRequest('GET', FS_BASE, allParams);
  const finalParams = { ...allParams, oauth_signature: sig };
  const qs = Object.keys(finalParams).sort().map(k =>
    `${encodeURIComponent(k)}=${encodeURIComponent((finalParams as Record<string, string>)[k])}`
  ).join('&');
  return `${FS_BASE}?${qs}`;
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
  return {
    description: `${food.food_name}${brand}`,
    foodNutrients: [
      { nutrientName: 'Energy', unitName: 'KCAL', value: Math.round(cal) },
      { nutrientName: 'Protein', unitName: 'G', value: protein },
      { nutrientName: 'Carbohydrate, by difference', unitName: 'G', value: carbs },
      { nutrientName: 'Total lipid (fat)', unitName: 'G', value: fat },
    ],
    fsId: food.food_id,
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

async function fetchFatSecretSearch(q: string): Promise<SearchResult[]> {
  try {
    const apiParams = {
      method: 'foods.search',
      search_expression: q,
      max_results: '20',
      format: 'json',
    };
    const oauth = buildOAuthParams();
    const allParams = { ...oauth, ...apiParams };
    const sig = signRequest('POST', FS_BASE, allParams);
    const finalParams = { ...allParams, oauth_signature: sig };
    const body = Object.keys(finalParams).sort().map(k =>
      `${encodeURIComponent(k)}=${encodeURIComponent((finalParams as Record<string, string>)[k])}`
    ).join('&');
    const res = await fetch(FS_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const data = await res.json();
    
    const foods = data?.foods?.food;
    if (!foods) return [];
    const arr = Array.isArray(foods) ? foods : [foods];
    return arr.map(normalizeFsSearchResult);
  } catch (e) {
    console.log('FatSecret search error', e);
    return [];
  }
}

async function fetchFatSecretBarcode(barcode: string): Promise<SearchResult | null> {
  try {
    // Step 1: barcode -> food_id
    const lookupUrl = buildFatSecretUrl({
      method: 'food.find_id_for_barcode',
      barcode,
      format: 'json',
    });
    const lookupRes = await fetch(lookupUrl);
    const lookupData = await lookupRes.json();
    const foodId = lookupData?.food_id?.value;
    if (!foodId) return null;

    // Step 2: food_id -> full food data
    const getUrl = buildFatSecretUrl({
      method: 'food.get.v4',
      food_id: foodId,
      format: 'json',
    });
    const getRes = await fetch(getUrl);
    const getData = await getRes.json();
    const food = getData?.food;
    if (!food) return null;
    return normalizeFsServing(food);
  } catch (e) {
    console.log('FatSecret barcode error', e);
    return null;
  }
}

async function fetchFatSecretServings(fsId: string): Promise<any[]> {
  try {
    const url = buildFatSecretUrl({
      method: 'food.get.v4',
      food_id: fsId,
      format: 'json',
    });
    const res = await fetch(url);
    const data = await res.json();
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
      grams: parseFloat(s.metric_serving_amount || '0'),
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
  const [searching, setSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<'recent' | 'myfoods' | 'favorites' | 'recipes' | 'pinned'>('recent');
const [recentFoods, setRecentFoods] = useState<SearchResult[]>([]);
const [favorites, setFavorites] = useState<MyFood[]>([]);
const [recipes, setRecipes] = useState<any[]>([]);
const { meal, date, selectMode, day, recipeMode } = useLocalSearchParams<{ meal: string; date: string; selectMode: string; day: string; recipeMode: string }>();
const isRecipeMode = recipeMode === 'true';
const [showEditMyFood, setShowEditMyFood] = useState(false);
const [editFoodData, setEditFoodData] = useState<any>(null);
const editOverlayAnim = useRef(new Animated.Value(0)).current;
const editCardAnim = useRef(new Animated.Value(0)).current;
const [lastScannedBarcode, setLastScannedBarcode] = useState<string | null>(null);
const [barcodeOverrides, setBarcodeOverrides] = useState<Record<string, any>>({});
const [showFabMenu, setShowFabMenu] = useState(false);
const fabScale = useRef(new Animated.Value(1)).current;
const fabItem1Anim = useRef(new Animated.Value(0)).current;
const fabItem2Anim = useRef(new Animated.Value(0)).current;
const favoriteOpacities = useRef<Record<string, Animated.Value>>({}).current;
const getFavOpacity = (name: string) => {
  if (!favoriteOpacities[name]) favoriteOpacities[name] = new Animated.Value(1);
  return favoriteOpacities[name];
};

const filterDecimal = (v: string) => {
  const stripped = v.replace(/[^0-9.]/g, '');
  const dot = stripped.indexOf('.');
  if (dot === -1) return stripped;
  return stripped.slice(0, dot + 1) + stripped.slice(dot + 1).replace(/\./g, '').slice(0, 1);
};

const openEditModal = (food: any) => {
  setEditFoodData({
    _source: food,
    name: food.name || food.description || '',
    cal: food.cal?.toString() || '',
    protein: food.protein?.toString() || '',
    carbs: food.carbs?.toString() || '',
    fat: food.fat?.toString() || '',
    fiber: food.fiber?.toString() || '',
    sugar: food.sugar?.toString() || '',
    sodium: food.sodium?.toString() || '',
    cholesterol: food.cholesterol?.toString() || '',
    saturatedFat: food.saturatedFat?.toString() || '',
  });
  setShowEditMyFood(true);
  editOverlayAnim.setValue(0);
  editCardAnim.setValue(0);
  Animated.parallel([
    Animated.timing(editOverlayAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
    Animated.spring(editCardAnim, { toValue: 1, useNativeDriver: true, damping: 20, stiffness: 300 }),
  ]).start();
};

const closeEditModal = () => {
  Animated.parallel([
    Animated.timing(editOverlayAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
    Animated.timing(editCardAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
  ]).start(() => {
    setShowEditMyFood(false);
    setEditFoodData(null);
  });
};

const saveEditFood = async () => {
  if (!editFoodData || !editFoodData.name.trim() || !editFoodData.cal) return;
  try {
    const saved = await AsyncStorage.getItem('pj_my_foods');
    const foods = saved ? JSON.parse(saved) : [];
    const src = editFoodData._source;
    const calNum = parseInt(editFoodData.cal) || 0;
    const servingGrams = src?.servingSize || 100;
    const updated = foods.map((f: any) =>
      (src?.id ? f.id === src.id : f.name === src.name) ? {
        ...f,
        name: editFoodData.name.trim(),
        cal: calNum,
        protein: parseFloat(editFoodData.protein) || 0,
        carbs: parseFloat(editFoodData.carbs) || 0,
        fat: parseFloat(editFoodData.fat) || 0,
        fiber: parseFloat(editFoodData.fiber) || 0,
        sugar: parseFloat(editFoodData.sugar) || 0,
        sodium: parseFloat(editFoodData.sodium) || 0,
        cholesterol: parseFloat(editFoodData.cholesterol) || 0,
        saturatedFat: parseFloat(editFoodData.saturatedFat) || 0,
        calPer100g: Math.round((calNum / servingGrams) * 100),
        proteinPer100g: Math.round((parseFloat(editFoodData.protein) || 0) / servingGrams * 100 * 10) / 10,
        carbsPer100g: Math.round((parseFloat(editFoodData.carbs) || 0) / servingGrams * 100 * 10) / 10,
        fatPer100g: Math.round((parseFloat(editFoodData.fat) || 0) / servingGrams * 100 * 10) / 10,
      } : f
    );
    setMyFoods(updated);
    await AsyncStorage.setItem('pj_my_foods', JSON.stringify(updated));
    await saveToFirebase('my_foods', 'foods', updated);
    showToast('Food saved', editFoodData.name.trim(), 'success');
    closeEditModal();
  } catch (e) {
    console.log('Edit food error', e);
  }
};

  const openFabMenu = () => {
    fabItem1Anim.setValue(0);
    fabItem2Anim.setValue(0);
    setShowFabMenu(true);
    Animated.stagger(70, [
      Animated.spring(fabItem1Anim, { toValue: 1, useNativeDriver: true, friction: 7, tension: 120 }),
      Animated.spring(fabItem2Anim, { toValue: 1, useNativeDriver: true, friction: 7, tension: 120 }),
    ]).start();
  };

  const closeFabMenu = () => {
    Animated.parallel([
      Animated.timing(fabItem1Anim, { toValue: 0, duration: 130, useNativeDriver: true }),
      Animated.timing(fabItem2Anim, { toValue: 0, duration: 130, useNativeDriver: true }),
    ]).start(() => setShowFabMenu(false));
  };

  const toggleFabMenu = () => {
    if (showFabMenu) closeFabMenu();
    else openFabMenu();
  };

  useEffect(() => {
    loadMyFoods();
    loadRecent();
    loadRecipes();
    loadBarcodeOverrides();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadFavorites();
    }, [])
  );

  const loadBarcodeOverrides = async () => {
    try {
      const saved = await AsyncStorage.getItem('pj_barcode_overrides');
      if (saved) setBarcodeOverrides(JSON.parse(saved));
    } catch (e) {
      console.log('Load barcode overrides error', e);
    }
  };

  const unsetOverride = async (barcode: string) => {
    try {
      const removedItem = barcodeOverrides[barcode];
      const updated = { ...barcodeOverrides };
      delete updated[barcode];
      setBarcodeOverrides(updated);
      await AsyncStorage.setItem('pj_barcode_overrides', JSON.stringify(updated));
      if (removedItem) {
        setResults(prev => prev.map(r => r.description === removedItem.description ? { ...r, isOverride: false } : r));
      }
      showToast('Override removed', '', 'info');
    } catch (e) {}
  };

  const saveOverride = async (item: any) => {
    if (!lastScannedBarcode) return;
    try {
      const confirmedItem = { ...item, isOverride: true };
      const updated = { ...barcodeOverrides, [lastScannedBarcode]: confirmedItem };
      setBarcodeOverrides(updated);
      await AsyncStorage.setItem('pj_barcode_overrides', JSON.stringify(updated));
      setResults(prev => prev.map(r => r.description === item.description ? { ...r, isOverride: true } : r));
      setLastScannedBarcode(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.log('Save override error', e);
    }
  };

  useEffect(() => {
    if (!query.trim()) {
      showMyFoods('');
    }
  }, [myFoods]);

  const loadMyFoods = async () => {
    try {
      const saved = await AsyncStorage.getItem('pj_my_foods');
      if (saved) setMyFoods(JSON.parse(saved));
      else {
        const cloud = await loadFromFirebase('my_foods');
        if (cloud && cloud.foods) setMyFoods(cloud.foods);
      }
    } catch (e) {
      console.log('Load error', e);
    }
  };

  const showMyFoods = (q: string) => {
    const filtered = myFoods
      .filter(f => !q || f.name.toLowerCase().includes(q.toLowerCase()))
      .map(f => ({
        description: f.name,
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
      if (searchDebounceTimer.current) clearTimeout(searchDebounceTimer.current);
      return;
    }

    // Show spinner immediately so there's no blank gap before debounce fires
    setSearching(true);

    // My Foods match immediately -- no debounce needed
    const myFoodResults = myFoods
      .filter(f => f.name.toLowerCase().includes(query.toLowerCase()))
      .map(f => ({
        description: f.name,
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
        const fsResults = await fetchFatSecretSearch(query.trim());

        // Only apply if this is still the latest search
        if (thisSearchId === searchIdRef.current) {
          setResults([...myFoodResults, ...fsResults]);
        }
      } catch (e) {
        console.log('Search error', e);
      } finally {
        if (thisSearchId === searchIdRef.current) {
          setSearching(false);
        }
      }
    }, 400);
  };

  const getCalories = (food: SearchResult) => {
    const e = food.foodNutrients?.find((n: any) => n.nutrientName === 'Energy' && n.unitName === 'KCAL');
    return Math.round(e?.value || 0);
  };

  const getMacros = (food: SearchResult) => {
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
          }),
          meal: 'recipe',
          date: 'recipe',
          recipeMode: 'true',
        }
      });
      return;
    }

    const myFoodMatch = food.isMyFood ? myFoods.find(f => f.name === food.description) : null;
    const fsId = (food as any).fsId;
    const customServingSize = (food as any).servingSize;
    const isCustomFood = !!(food as any).isCustom || !!(myFoodMatch as any)?.isCustom;
    let fsServings: any[] = [];
    if (fsId && !(food as any).fromBarcode) {
      fsServings = await fetchFatSecretServings(fsId);
    }
    // Extract logged amount from description for recent items e.g. "Peanut Butter Powder (16g)"
    let existingAmount: string | undefined;
    let existingUnit: string | undefined;
    if ((food as any).isRecent) {
      const sourceName = (food as any).fullName || food.description;
      const m = sourceName.match(/\((\d+\.?\d*)(g|oz|serving)\)$/);
      if (m) { existingAmount = m[1]; existingUnit = m[2]; }
    }
    router.push({
      pathname: '/food-detail',
      params: {
        foodJson: JSON.stringify({ 
          ...food, 
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
          } : {}),
        }),
        meal,
        date,
      }
    });
  };

  const saveNewFood = async () => {
    const name = newName.trim();
    const cal = parseInt(newCal);
    if (!name || !cal) return;
    const updated = [...myFoods, { name, cal }].sort((a, b) => a.name.localeCompare(b.name));
    setMyFoods(updated);
    await AsyncStorage.setItem('pj_my_foods', JSON.stringify(updated));
    await saveToFirebase('my_foods', 'foods', updated);
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
          const updated = myFoods.filter((_, i) => i !== idx);
          setMyFoods(updated);
          await AsyncStorage.setItem('pj_my_foods', JSON.stringify(updated));
          await saveToFirebase('my_foods', 'foods', updated);
        }},
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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

    const myFoodRows = myFoods.map(f => ({
      description: f.name,
      foodNutrients: [
        { nutrientName: 'Energy', unitName: 'KCAL', value: f.cal },
        { nutrientName: 'Protein', unitName: 'G', value: f.protein || 0 },
        { nutrientName: 'Carbohydrate, by difference', unitName: 'G', value: f.carbs || 0 },
        { nutrientName: 'Total lipid (fat)', unitName: 'G', value: f.fat || 0 },
      ],
      isMyFood: true,
    }));

    // Check for saved SET override
    if (barcodeOverrides[data]) {
      const override = { ...barcodeOverrides[data], isOverride: true };
      const overrideName = override.description;
      setLastScannedBarcode(null);
      setQuery(overrideName);
      setResults([override, ...myFoodRows]);
      isBarcodeSearchRef.current = false;

      // Auto-load full results after delay
      setTimeout(async () => {
        try {
          setSearching(true);
          const fsResults = await fetchFatSecretSearch(overrideName);
          const deduped = fsResults.filter(r => r.description !== overrideName);
          setResults([override, ...myFoodRows, ...deduped]);
        } catch (e) {
          console.log('Override name search failed', e);
        } finally {
          setSearching(false);
        }
      }, 1500);
      return;
    }

    // No override -- fetch barcode from FatSecret
    try {
      setSearching(true);
      const barcodeResult = await fetchFatSecretBarcode(data);

      if (barcodeResult) {
        const searchName = barcodeResult.description;
        isBarcodeSearchRef.current = true;
        setQuery(searchName);
        isBarcodeSearchRef.current = false;
        setLastScannedBarcode(data);
        setResults([barcodeResult, ...myFoodRows]);
        setSearching(false);
        startCooldown();

        // Auto-load full search results after delay
        setTimeout(async () => {
          try {
            setSearching(true);
            const fsResults = await fetchFatSecretSearch(searchName);
            const deduped = fsResults.filter(r => r.description !== searchName);
            setResults([barcodeResult, ...myFoodRows, ...deduped]);
          } catch (e) {
            console.log('Name search failed', e);
          } finally {
            setSearching(false);
          }
        }, 1500);
      } else {
        setLastScannedBarcode(null);
        setQuery('');
        setResults([]);
        setSearching(false);
        Alert.alert(
          'Product Not Found',
          'This barcode wasn\'t found in the database. Search manually to find it and set it as the correct item.',
          [{ text: 'OK' }]
        );
      }
    } catch (e) {
      console.log('Barcode error', e);
      setSearching(false);
      Alert.alert('Scan Error', 'Something went wrong. Please try again.');
    } finally {
      isBarcodeSearchRef.current = false;
    }
  };
  const loadRecent = async () => {
    try {
      // Pull last 30 days of entries and get unique foods
      const recent: {name: string, cal: number, protein?: number, carbs?: number, fat?: number, calPer100g?: number, proteinPer100g?: number, carbsPer100g?: number, fatPer100g?: number, foodNutrients?: any[], fsId?: string | null}[] = [];
      const seen = new Set<string>();
      for (let i = 0; i < 30; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dk = d.toISOString().split('T')[0];
        const saved = await AsyncStorage.getItem(`pj_${dk}`);
        if (saved) {
          const data = JSON.parse(saved);
          if (data.entries) {
            data.entries.reverse().forEach((e: any) => {
              const dedupeKey = e.fsId || e.name.replace(/\s*\(.*?\)\s*$/, '');
              if (!seen.has(dedupeKey)) {
                seen.add(dedupeKey);
                recent.push({ name: e.name, cal: e.labelCal || e.calPer100g || e.cal, protein: e.labelProtein ?? e.proteinPer100g ?? e.protein, carbs: e.labelCarbs ?? e.carbsPer100g ?? e.carbs, fat: e.labelFat ?? e.fatPer100g ?? e.fat, calPer100g: e.calPer100g, proteinPer100g: e.proteinPer100g, carbsPer100g: e.carbsPer100g, fatPer100g: e.fatPer100g, foodNutrients: e.foodNutrients, fsId: e.fsId || null });
              }
            });
          }
        }
      }
      setRecentFoods(recent.slice(0, 15).map(f => ({
        description: f.name.replace(/\s*\(.*?\)\s*$/, ''),
        fullName: f.name,
        foodNutrients: [
          { nutrientName: 'Energy', unitName: 'KCAL', value: f.cal },
          { nutrientName: 'Protein', unitName: 'G', value: f.protein || 0 },
          { nutrientName: 'Carbohydrate, by difference', unitName: 'G', value: f.carbs || 0 },
          { nutrientName: 'Total lipid (fat)', unitName: 'G', value: f.fat || 0 },
        ],
        calPer100g: f.calPer100g,
        proteinPer100g: f.proteinPer100g,
        carbsPer100g: f.carbsPer100g,
        fatPer100g: f.fatPer100g,
        isMyFood: false,
        isRecent: true,
        fsId: f.fsId || null,
      })));
    } catch (e) {
      console.log('Load recent error', e);
    }
  };

  const loadFavorites = async () => {
  try {
    const saved = await AsyncStorage.getItem('pj_favorites');
    if (saved) {
      setFavorites(JSON.parse(saved));
    } else {
      const userId = getUserId();
      const ref = doc(db, 'users', userId, 'days', 'my_foods');
      const snap = await getDoc(ref);
      if (snap.exists() && snap.data().favorites) {
        const data = snap.data().favorites;
        setFavorites(data);
        await AsyncStorage.setItem('pj_favorites', JSON.stringify(data));
      }
    }
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
        await AsyncStorage.setItem('pj_recipes', JSON.stringify(data));
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
    const isFav = favorites.some(f =>
      foodFsId && f.fsId ? f.fsId === foodFsId : f.name === name
    );
    if (isFav) {
      Alert.alert(
        'Remove from Favorites',
        `Remove ${name} from your favorites?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Remove', style: 'destructive', onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            const opacity = getFavOpacity(name);
            Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }).start(async () => {
              delete favoriteOpacities[name];
              const updated = favorites.filter(f =>
                foodFsId && f.fsId ? f.fsId !== foodFsId : f.name !== name
              );
              setFavorites(updated);
              await AsyncStorage.setItem('pj_favorites', JSON.stringify(updated));
              await saveToFirebase('my_foods', 'favorites', updated);
              showToast('Removed from favorites', name, 'info');
            });
          }},
        ]
      );
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
        name,
        cal,
        protein: getN('Protein'),
        carbs: getN('Carbohydrate, by difference'),
        fat: getN('Total lipid (fat)'),
        fiber: getN('Fiber, total dietary'),
        sugar: getN('Sugars, total including NLEA'),
        sodium: getN('Sodium, Na', 'MG'),
        cholesterol: getN('Cholesterol', 'MG'),
        saturatedFat: getN('Fatty acids, total saturated'),
        fsId: (food as any).fsId || null,
      }];
    }
    setFavorites(updated);
    await AsyncStorage.setItem('pj_favorites', JSON.stringify(updated));
    await saveToFirebase('my_foods', 'favorites', updated);
  };

  const styles = useStyles(theme, themeId);
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
  <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
    <Text style={styles.backBtnText}>← Back</Text>
  </TouchableOpacity>
  <Text style={styles.headerTitle}>{meal === 'browse' ? 'Food Library' : `Add to ${meal}`}</Text>
  <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
    <TouchableOpacity
      onPress={startScan}
      style={{ backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder, borderRadius: 6, padding: 6, alignItems: 'center', justifyContent: 'center', width: 38, height: 38 }}>
      <Ionicons name="barcode-outline" size={24} color={theme.accentBlue} />
    </TouchableOpacity>
  </View>
</View>

      {/* Search */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search food..."
          placeholderTextColor="#444444"
          value={query}
          onChangeText={searchFood}
          
        />
        </View>

{/* Scan banner -- shows while lastScannedBarcode is set */}
      {lastScannedBarcode && (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 8, paddingVertical: 2 }}>
          <Ionicons name="information-circle-outline" size={13} color={theme.textMuted} style={{ marginRight: 5 }} />
          <Text style={{ flex: 1, fontSize: 11, color: theme.textMuted, fontFamily: 'DMSans_400Regular' }}>Tap SET on the correct item to confirm it for future scans</Text>
        </View>
      )}

{/* Tabs -- only show when not searching */}
      {!query.trim() && (
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'recent' && styles.tabActive]}
            onPress={() => setActiveTab('recent')}>
            <Text style={[styles.tabText, activeTab === 'recent' && styles.tabTextActive]}>Recent</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'myfoods' && styles.tabActive]}
            onPress={() => setActiveTab('myfoods')}>
            <Text style={[styles.tabText, activeTab === 'myfoods' && styles.tabTextActive]}>My Foods</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'favorites' && styles.tabActive]}
            onPress={() => setActiveTab('favorites')}>
            <Text style={[styles.tabText, activeTab === 'favorites' && styles.tabTextActive]}>Favorites</Text>
          </TouchableOpacity>
          <TouchableOpacity
  style={[styles.tab, activeTab === 'recipes' && styles.tabActive]}
  onPress={() => setActiveTab('recipes')}>
  <Text style={[styles.tabText, activeTab === 'recipes' && styles.tabTextActive]}>Recipes</Text>
</TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'pinned' && styles.tabActive]}
            onPress={() => setActiveTab('pinned')}>
            <Text style={[styles.tabText, activeTab === 'pinned' && styles.tabTextActive]}>Set Foods</Text>
          </TouchableOpacity>
        </View>
      )}

      

      {/* Loading indicator -- shows when searching and no results yet */}
      {searching && query.trim() && results.length === 0 && (
        <View style={{ alignItems: 'center', paddingTop: 40, gap: 10 }}>
          <ActivityIndicator size="small" color={theme.accentBlueRaw} />
          <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'DMSans_400Regular' }}>Searching...</Text>
        </View>
      )}

      {/* No results state */}
      {!searching && query.trim() && results.length === 0 && (
        <View style={{ alignItems: 'center', paddingTop: 60, paddingHorizontal: 32, gap: 12 }}>
          <Ionicons name="search-outline" size={40} color={theme.textDim} />
          <Text style={{ fontSize: 16, color: theme.textSecondary, fontFamily: 'DMSans_600SemiBold', textAlign: 'center' }}>
            No results for "{query}"
          </Text>
          <Text style={{ fontSize: 13, color: theme.textMuted, fontFamily: 'DMSans_400Regular', textAlign: 'center', lineHeight: 20 }}>
            Try a different search term or scan the barcode
          </Text>
        </View>
      )}

      {/* Results */}
      <FlatList
        data={query.trim() ? results : 
          activeTab === 'recent' ? recentFoods :
          activeTab === 'favorites' ? favorites.map(f => ({
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
  isMyFood: false,
  fsId: (f as any).fsId || null,
})) :
          activeTab === 'recipes' ? recipes.map((r: any) => ({
            description: r.name,
            foodNutrients: [],
            isRecipe: true,
            recipeData: r,
            cal: Math.round(r.totalCal / r.servingCount),
          })) :
          activeTab === 'pinned' ? Object.entries(barcodeOverrides).map(([barcode, item]: [string, any]) => ({
            ...item,
            _pinnedBarcode: barcode,
            isPinned: true,
          })) :
          myFoods.map(f => ({
            description: f.name,
            foodNutrients: [
              { nutrientName: 'Energy', unitName: 'KCAL', value: f.cal },
              { nutrientName: 'Protein', unitName: 'G', value: f.protein || 0 },
              { nutrientName: 'Carbohydrate, by difference', unitName: 'G', value: f.carbs || 0 },
              { nutrientName: 'Total lipid (fat)', unitName: 'G', value: f.fat || 0 },
            ],
            isMyFood: true,
          servingSize: (f as any).servingSize || null,
          servingUnit: (f as any).servingUnit || null,
          isCustom: (f as any).isCustom || false,
          }))
        }
        keyExtractor={(_, i) => i.toString()}
        renderItem={({ item, index }) => {
          const macros = getMacros(item);
          const nameParts = item.description.split(' · ');
          const foodName = nameParts[0];
          const brandName = nameParts.length > 1 ? nameParts.slice(1).join(' · ') : null;
          return (
            <Animated.View style={{ opacity: activeTab === 'favorites' && !query.trim() ? getFavOpacity(item.description) : 1 }}>
            <TouchableOpacity style={[styles.resultItem, (item as any).isOverride && styles.resultItemSet]} onPress={() => openFoodDetail(item)}>
              <View style={styles.resultLeft}>
                {/* Badges */}
                {(item.isMyFood || item.isRecipe) && (
                  <View style={item.isRecipe ? [styles.savedBadge, { backgroundColor: theme.accentGreenBg }] : styles.savedBadge}>
                    <Text style={item.isRecipe ? [styles.savedBadgeText, { color: theme.accentGreen }] : styles.savedBadgeText}>
                      {item.isRecipe ? 'RECIPE' : 'SAVED'}
                    </Text>
                  </View>
                )}
                {/* Food name + brand */}
                <Text style={styles.resultName} numberOfLines={2}>{foodName}</Text>
                {brandName && (
                  <Text style={styles.resultBrand} numberOfLines={1}>{brandName}</Text>
                )}
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
                {activeTab === 'pinned' ? (
                  <TouchableOpacity
                    onPress={() => unsetOverride((item as any)._pinnedBarcode)}
                    style={{ marginRight: 6, backgroundColor: 'rgba(204,51,51,0.12)', borderWidth: 1, borderColor: 'rgba(204,51,51,0.4)', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 3 }}>
                    <Text style={{ fontSize: 10, color: '#cc3333', fontFamily: 'DMSans_600SemiBold' }}>UNSET</Text>
                  </TouchableOpacity>
                ) : (item as any).isOverride ? (
                  <Ionicons name="checkmark-circle" size={16} color={theme.accentGreen} style={{ marginRight: 6 }} />
                ) : lastScannedBarcode ? (
                  <TouchableOpacity
                    onPress={() => saveOverride(item)}
                    style={{ marginRight: 6, backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 3 }}>
                    <Text style={{ fontSize: 10, color: theme.accentBlue, fontFamily: 'DMSans_600SemiBold' }}>SET</Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity onPress={() => toggleFavorite(item)} style={styles.starBtn}>
                  <Ionicons
                    name={favorites.some(f => (item as any).fsId && f.fsId ? f.fsId === (item as any).fsId : f.name === item.description) ? 'star' : 'star-outline'}
                    size={16}
                    color={favorites.some(f => (item as any).fsId && f.fsId ? f.fsId === (item as any).fsId : f.name === item.description) ? theme.accentAmber : theme.textDim}
                  />
                </TouchableOpacity>
                <View style={styles.calBlock}>
                  <Text style={styles.resultCal}>{getCalories(item)}</Text>
                  <Text style={styles.resultCalLabel}>kcal</Text>
                </View>
                {item.isMyFood && (
                  <>
                    <TouchableOpacity
                      onPress={() => {
                        const idx = myFoods.findIndex(f => f.name === item.description);
                        if (idx >= 0) openEditModal(myFoods[idx]);
                      }}
                      style={{ marginLeft: 4, paddingHorizontal: 8, paddingVertical: 10 }}>
                      <Text style={{ fontSize: 12, color: theme.accentBlue, fontFamily: 'DMSans_500Medium' }}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteMyFood(myFoods.findIndex(f => f.name === item.description))} style={styles.deleteBtn}>
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
              <Text style={{ fontSize: 16, color: theme.textSecondary, fontFamily: 'DMSans_600SemiBold', textAlign: 'center' }}>
                {config.title}
              </Text>
              <Text style={{ fontSize: 13, color: theme.textMuted, fontFamily: 'DMSans_400Regular', textAlign: 'center', lineHeight: 20 }}>
                {config.subtitle}
              </Text>
            </View>
          );
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListFooterComponent={() => (
          (!query.trim() || results.length > 0) ? (
            <TouchableOpacity
              onPress={() => Linking.openURL('https://platform.fatsecret.com')}
              style={{ alignItems: 'center', paddingVertical: 20, paddingBottom: 32, opacity: 0.65, alignSelf: 'center' }}>
              <Image
                source={{ uri: 'https://platform.fatsecret.com/api/static/images/powered_by_fatsecret_horizontal_brand.png' }}
                style={{ width: 140, height: 34 }}
                resizeMode="contain"
              />
            </TouchableOpacity>
          ) : null
        )}
      />

     <CustomFoodCreator
        visible={showCreateFood}
        onClose={() => setShowCreateFood(false)}
        onSaved={() => {
          loadMyFoods();
          setShowCreateFood(false);
        }}
      />

      {/* Edit My Food Modal */}
      <Modal visible={showEditMyFood} transparent animationType="none">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', opacity: editOverlayAnim }}>
            <TouchableOpacity style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} activeOpacity={1} onPress={closeEditModal} />
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
              <View style={{ height: 4, width: 40, backgroundColor: theme.borderCard, borderRadius: 2, alignSelf: 'center', marginTop: 12 }} />
              <Text style={{ fontSize: 16, color: theme.accentBlueRaw, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2, textAlign: 'center', marginTop: 8, marginBottom: 4 }}>EDIT FOOD</Text>
              <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ padding: 16, paddingTop: 8 }} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled">
                {/* Basic Info */}
                <Text style={{ fontSize: 9, color: theme.textSecondary, fontFamily: 'DMSans_700Bold', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 10 }}>Basic Info</Text>
                {([
                  { label: 'Food Name', key: 'name', keyboard: 'default' as const },
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
                {([
                  [{ label: 'FIBER (g)', key: 'fiber' }, { label: 'SUGAR (g)', key: 'sugar' }],
                  [{ label: 'SODIUM (mg)', key: 'sodium' }, { label: 'CHOLESTEROL (mg)', key: 'cholesterol' }],
                ] as { label: string; key: string }[][]).map((row, ri) => (
                  <View key={ri} style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                    {row.map(f => (
                      <View key={f.key} style={{ flex: 1 }}>
                        <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: 'DMSans_700Bold', letterSpacing: 2, marginBottom: 4 }}>{f.label}</Text>
                        <TextInput
                          style={{ backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, color: theme.textPrimary, paddingVertical: 10, paddingHorizontal: 8, fontSize: 14, fontFamily: 'DMSans_400Regular' }}
                          value={editFoodData?.[f.key] || ''}
                          onChangeText={v => setEditFoodData((p: any) => p ? { ...p, [f.key]: filterDecimal(v) } : null)}
                          keyboardType="decimal-pad"
                          placeholderTextColor={theme.textDim}
                          selectTextOnFocus
                        />
                      </View>
                    ))}
                  </View>
                ))}
                <View style={{ marginBottom: 10 }}>
                  <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: 'DMSans_700Bold', letterSpacing: 2, marginBottom: 4 }}>SATURATED FAT (g)</Text>
                  <TextInput
                    style={{ backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, color: theme.textPrimary, paddingVertical: 10, paddingHorizontal: 8, fontSize: 14, fontFamily: 'DMSans_400Regular' }}
                    value={editFoodData?.saturatedFat || ''}
                    onChangeText={v => setEditFoodData((p: any) => p ? { ...p, saturatedFat: filterDecimal(v) } : null)}
                    keyboardType="decimal-pad"
                    placeholderTextColor={theme.textDim}
                    selectTextOnFocus
                  />
                </View>
              </ScrollView>
              <View style={{ flexDirection: 'row', gap: 10, padding: 16, paddingTop: 12 }}>
                <TouchableOpacity onPress={closeEditModal} style={{ flex: 1, padding: 12, backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, alignItems: 'center' }}>
                  <Text style={{ color: theme.textMuted, fontFamily: 'DMSans_500Medium', fontSize: 14 }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={saveEditFood}
                  disabled={!editFoodData?.name?.trim() || !editFoodData?.cal}
                  style={{ flex: 2, padding: 12, backgroundColor: theme.accentBlue, borderRadius: 8, alignItems: 'center', opacity: editFoodData?.name?.trim() && editFoodData?.cal ? 1 : 0.4 }}>
                  <Text style={{ color: '#ffffff', fontFamily: 'BebasNeue_400Regular', fontSize: 16, letterSpacing: 1 }}>SAVE</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>

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
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontFamily: 'DMSans_400Regular', marginTop: 12, letterSpacing: 1 }}>
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
                <Text style={{ color: '#ffffff', fontSize: 16, fontFamily: 'DMSans_600SemiBold' }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      )}

      {/* FAB -- only in browse/library mode */}
      {meal === 'browse' && (
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
              {/* Create Recipe - top, animates second */}
              <Animated.View style={{ opacity: fabItem2Anim, transform: [{ translateY: fabItem2Anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <TouchableOpacity
                    onPress={() => { closeFabMenu(); router.push('/recipe-builder'); }}
                    style={{ backgroundColor: theme.accentBlue, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, shadowColor: theme.accentBlue, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 6 }}>
                    <Text style={{ color: '#ffffff', fontSize: 13, fontFamily: 'DMSans_600SemiBold' }}>Create Recipe</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => { closeFabMenu(); router.push('/recipe-builder'); }}
                    style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.accentBlue, alignItems: 'center', justifyContent: 'center', shadowColor: theme.accentBlue, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 6 }}>
                    <Ionicons name="book-outline" size={20} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              </Animated.View>

              {/* Create Food - bottom, animates first */}
              <Animated.View style={{ opacity: fabItem1Anim, transform: [{ translateY: fabItem1Anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <TouchableOpacity
                    onPress={() => { closeFabMenu(); setShowCreateFood(true); }}
                    style={{ backgroundColor: theme.accentBlue, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, shadowColor: theme.accentBlue, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 6 }}>
                    <Text style={{ color: '#ffffff', fontSize: 13, fontFamily: 'DMSans_600SemiBold' }}>Create Food</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => { closeFabMenu(); setShowCreateFood(true); }}
                    style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.accentBlue, alignItems: 'center', justifyContent: 'center', shadowColor: theme.accentBlue, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 6 }}>
                    <Ionicons name="restaurant-outline" size={20} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </View>
          )}

          <Animated.View style={{ position: 'absolute', bottom: 20 + insets.bottom, right: 20, transform: [{ scale: fabScale }] }}>
            <TouchableOpacity
              onPress={toggleFabMenu}
              onPressIn={() => Animated.timing(fabScale, { toValue: 0.9, duration: 80, useNativeDriver: true }).start()}
              onPressOut={() => Animated.timing(fabScale, { toValue: 1, duration: 80, useNativeDriver: true }).start()}
              activeOpacity={1}
              style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: theme.accentBlue, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 }}>
              <Ionicons name={showFabMenu ? 'close' : 'add'} size={28} color="#ffffff" />
            </TouchableOpacity>
          </Animated.View>
        </>
      )}
    </View>
  );
}

const useStyles = (theme: any, themeId: string) => {
  const shadowOpacity = ({ light: 0.35, dark: 0.14, slate: 0.28, warm: 0.30, blush: 0.30 } as Record<string, number>)[themeId] ?? 0.18;
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bgPrimary },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.borderCard },
  backBtn: { padding: 4 },
  backBtnText: { color: theme.accentBlue, fontSize: 14, fontFamily: 'DMSans_500Medium' },
  headerTitle: { fontSize: 20, color: theme.accentBlueRaw, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1 },
  scanBtn: { padding: 4 },
  scanBtnText: { fontSize: 20 },
  searchRow: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingBottom: 8 },
  searchInput: { flex: 1, backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, color: theme.textPrimary, padding: 12, fontSize: 15, fontFamily: 'DMSans_400Regular' },
  searching: { color: theme.textMuted, marginLeft: 8, fontFamily: 'DMSans_400Regular' },
  addNewBtn: { marginHorizontal: 16, marginBottom: 8, paddingVertical: 6, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder, borderRadius: 6 },
  addNewBtnText: { color: theme.accentBlue, fontSize: 12, fontFamily: 'DMSans_600SemiBold' },
  addNewForm: { marginHorizontal: 16, marginBottom: 8, backgroundColor: theme.bgCard, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: theme.borderCard },
  formInput: { backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 6, color: theme.textPrimary, padding: 10, fontSize: 14, fontFamily: 'DMSans_400Regular', marginBottom: 8 },
  formRow: { flexDirection: 'row', gap: 8 },
  saveBtn: { backgroundColor: theme.accentGreenBg, borderWidth: 1, borderColor: theme.accentGreenBorder, borderRadius: 6, paddingHorizontal: 16, justifyContent: 'center' },
  saveBtnText: { color: theme.accentGreen, fontFamily: 'DMSans_600SemiBold', fontSize: 14 },
  resultItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 12, marginVertical: 4,
    backgroundColor: theme.bgCard,
    borderWidth: 0.5, borderColor: theme.borderCard,
    borderTopColor: 'rgba(255,255,255,0.1)',
    borderLeftWidth: 3, borderLeftColor: theme.accentBlueRaw,
    borderRadius: 10, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity, shadowRadius: 6,
  },
  resultLeft: { flex: 1, marginRight: 12 },
  savedBadge: { backgroundColor: theme.accentBlueBg, borderRadius: 3, paddingHorizontal: 5, paddingVertical: 1, alignSelf: 'flex-start', marginBottom: 4 },
  savedBadgeText: { fontSize: 8, color: theme.accentBlue, fontFamily: 'DMSans_700Bold' },
  resultName: { fontSize: 14, color: theme.textPrimary, fontFamily: 'DMSans_600SemiBold' },
  resultBrand: { fontSize: 11, color: theme.textMuted, fontFamily: 'DMSans_400Regular', marginTop: 1 },
  macroStrip: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5 },
  macroDot: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  dotCircle: { width: 6, height: 6, borderRadius: 3 },
  macroVal: { fontSize: 11, color: theme.textMuted, fontFamily: 'DMSans_400Regular' },
  resultRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  starBtn: { padding: 4 },
  calBlock: { alignItems: 'flex-end', minWidth: 46 },
  resultCal: { fontSize: 20, color: theme.accentGreen, fontFamily: 'BebasNeue_400Regular', textAlign: 'right' },
  resultCalLabel: { fontSize: 9, color: theme.textMuted, fontFamily: 'DMSans_400Regular', textAlign: 'right', marginTop: -2 },
  deleteBtn: { marginLeft: 8, padding: 4 },
  deleteBtnText: { fontSize: 18, color: theme.textDim },
  cameraOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 },
  camera: { flex: 1 },
  cancelScan: { position: 'absolute', bottom: 40, alignSelf: 'center', backgroundColor: theme.overlayBg, padding: 16, borderRadius: 8 },
  cancelScanText: { color: theme.textPrimary, fontSize: 16, fontFamily: 'DMSans_600SemiBold' },
  tabRow: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 8, backgroundColor: theme.bgProgressTrack, borderRadius: 8, padding: 4 },
  tab: { flex: 1, padding: 8, alignItems: 'center', borderRadius: 6 },
  tabActive: { backgroundColor: theme.bgCard },
  tabText: { fontSize: 11, color: theme.textMuted, fontFamily: 'DMSans_500Medium' },
  tabTextActive: { color: theme.textPrimary },
  modalOverlay: { flex: 1, backgroundColor: theme.overlayBg, justifyContent: 'flex-end' },
  modal: { backgroundColor: theme.bgCard, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 24, borderWidth: 1, borderColor: theme.borderCard },
  modalTitle: { fontSize: 18, color: theme.textPrimary, fontFamily: 'DMSans_600SemiBold', marginBottom: 16 },
  modalInput: { backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 6, color: theme.textPrimary, padding: 10, fontSize: 14, fontFamily: 'DMSans_400Regular', marginBottom: 10 },
  modalBtns: { flexDirection: 'row', gap: 8, marginTop: 8 },
  modalCancelBtn: { flex: 1, padding: 12, backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 6, alignItems: 'center' },
  modalCancelText: { color: theme.textMuted, fontFamily: 'DMSans_500Medium', fontSize: 14 },
  modalSaveBtn: { flex: 1, padding: 12, backgroundColor: theme.accentBlue, borderRadius: 6, alignItems: 'center' },
  modalSaveText: { color: theme.textWhite, fontFamily: 'BebasNeue_400Regular', fontSize: 16, letterSpacing: 1 },
  resultItemSet: { borderLeftColor: '#0d9268' },
  });
};