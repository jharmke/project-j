import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Camera, CameraView } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, FlatList, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Reanimated, { Easing as ReEasing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { Svg, Path, G } from 'react-native-svg';
import { useToast } from '../components/Toast';
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
  const [searching, setSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<'recent' | 'myfoods' | 'favorites' | 'recipes'>('recent');
const [recentFoods, setRecentFoods] = useState<SearchResult[]>([]);
const [favorites, setFavorites] = useState<MyFood[]>([]);
const [recipes, setRecipes] = useState<any[]>([]);
const { meal, date, selectMode, day, recipeMode } = useLocalSearchParams<{ meal: string; date: string; selectMode: string; day: string; recipeMode: string }>();
const isRecipeMode = recipeMode === 'true';
const [showEditMyFood, setShowEditMyFood] = useState(false);
const [editingMyFood, setEditingMyFood] = useState<{idx: number, name: string, cal: string} | null>(null);
const [lastScannedBarcode, setLastScannedBarcode] = useState<string | null>(null);
const [barcodeOverrides, setBarcodeOverrides] = useState<Record<string, any>>({});

const saveEditMyFood = async () => {
    if (!editingMyFood || !editingMyFood.name || !editingMyFood.cal) return;
    const updated = myFoods.map((f, i) => 
      i === editingMyFood.idx ? { ...f, name: editingMyFood.name, cal: parseInt(editingMyFood.cal) } : f
    );
    setMyFoods(updated);
    await AsyncStorage.setItem('pj_my_foods', JSON.stringify(updated));
    await saveToFirebase('my_foods', 'foods', updated);
    setShowEditMyFood(false);
    setEditingMyFood(null);
  };

  useEffect(() => {
    loadMyFoods();
    loadRecent();
    loadFavorites();
    loadRecipes();
    loadBarcodeOverrides();
  }, []);

  const loadBarcodeOverrides = async () => {
    try {
      const saved = await AsyncStorage.getItem('pj_barcode_overrides');
      if (saved) setBarcodeOverrides(JSON.parse(saved));
    } catch (e) {
      console.log('Load barcode overrides error', e);
    }
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
        foodNutrients: [{ nutrientName: 'Energy', unitName: 'KCAL', value: f.cal }],
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

    // My Foods match immediately -- no debounce needed
    const myFoodResults = myFoods
      .filter(f => f.name.toLowerCase().includes(query.toLowerCase()))
      .map(f => ({
        description: f.name,
        foodNutrients: [{ nutrientName: 'Energy', unitName: 'KCAL', value: f.cal }],
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
      router.push({
        pathname: '/food-detail',
        params: {
          foodJson: JSON.stringify(food),
          meal: 'recipe',
          date: 'recipe',
          recipeMode: 'true',
        }
      });
      return;
    }
    const myFoodMatch = food.isMyFood ? myFoods.find(f => f.name === food.description) : null;
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
          isMyFood: food.isMyFood,
          myFoodData: myFoodMatch,
          fsServings: fsServings.length > 0 ? fsServings : undefined,
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

  const deleteMyFood = async (idx: number) => {
    const updated = myFoods.filter((_, i) => i !== idx);
    setMyFoods(updated);
    await AsyncStorage.setItem('pj_my_foods', JSON.stringify(updated));
    await saveToFirebase('my_foods', 'foods', updated);
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

    // Check for saved SET override
    if (barcodeOverrides[data]) {
      const override = { ...barcodeOverrides[data], isOverride: true };
      const overrideName = override.description;
      setLastScannedBarcode(null);
      setQuery(overrideName);
      setResults([override]);
      isBarcodeSearchRef.current = false;

      // Auto-load full results after delay
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
      const recent: {name: string, cal: number}[] = [];
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
              if (!seen.has(e.name)) {
                seen.add(e.name);
                recent.push({ name: e.name, cal: e.cal });
              }
            });
          }
        }
      }
      setRecentFoods(recent.slice(0, 15).map(f => ({
        description: f.name,
        foodNutrients: [{ nutrientName: 'Energy', unitName: 'KCAL', value: f.cal }],
        isMyFood: false,
        isRecent: true,
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
    const isFav = favorites.some(f => f.name === name);
    let updated;
    if (isFav) {
      updated = favorites.filter(f => f.name !== name);
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
  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
    <TouchableOpacity
      onPress={() => router.push('/recipe-builder')}
      style={{ backgroundColor: theme.accentGreenBg, borderWidth: 1, borderColor: theme.accentGreenBorder, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: theme.accentGreen, fontSize: 13, fontFamily: 'DMSans_600SemiBold' }}>+ Recipe</Text>
    </TouchableOpacity>
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
        {searching && <Text style={styles.searching}>...</Text>}
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
        </View>
      )}

      {/* Add New Food */}
      {meal === 'browse' && (
        <TouchableOpacity style={styles.addNewBtn} onPress={() => setShowAddNew(!showAddNew)}>
          <Ionicons name="add-circle-outline" size={13} color={theme.accentBlue} />
          <Text style={styles.addNewBtnText}>Save New Food to Library</Text>
        </TouchableOpacity>
      )}

      {showAddNew && (
        <View style={styles.addNewForm}>
          <TextInput
            style={styles.formInput}
            placeholder="Food name..."
            placeholderTextColor="#444444"
            value={newName}
            onChangeText={setNewName}
          />
          <View style={styles.formRow}>
            <TextInput
              style={[styles.formInput, { flex: 1 }]}
              placeholder="Calories..."
              placeholderTextColor="#444444"
              keyboardType="number-pad"
              value={newCal}
              onChangeText={setNewCal}
            />
            <TouchableOpacity style={styles.saveBtn} onPress={saveNewFood}>
              <Text style={styles.saveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
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
})) :
          activeTab === 'recipes' ? recipes.map((r: any) => ({
            description: r.name,
            foodNutrients: [],
            isRecipe: true,
            recipeData: r,
            cal: Math.round(r.totalCal / r.servingCount),
          })) :
          myFoods.map(f => ({
            description: f.name,
            foodNutrients: [{ nutrientName: 'Energy', unitName: 'KCAL', value: f.cal }],
            isMyFood: true,
          }))
        }
        keyExtractor={(_, i) => i.toString()}
        renderItem={({ item, index }) => {
          const macros = getMacros(item);
          const nameParts = item.description.split(' · ');
          const foodName = nameParts[0];
          const brandName = nameParts.length > 1 ? nameParts.slice(1).join(' · ') : null;
          return (
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
                {(item as any).isOverride && (
                  <Ionicons name="checkmark-circle" size={16} color={theme.accentGreen} style={{ marginRight: 6 }} />
                )}
                {lastScannedBarcode && !(item as any).isOverride && (
                  <TouchableOpacity
                    onPress={() => saveOverride(item)}
                    style={{ marginRight: 6, backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 3 }}>
                    <Text style={{ fontSize: 10, color: theme.accentBlue, fontFamily: 'DMSans_600SemiBold' }}>SET</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => toggleFavorite(item)} style={styles.starBtn}>
                  <Ionicons
                    name={favorites.some(f => f.name === item.description) ? 'star' : 'star-outline'}
                    size={16}
                    color={favorites.some(f => f.name === item.description) ? theme.accentAmber : theme.textDim}
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
                        setEditingMyFood({ idx, name: myFoods[idx].name, cal: myFoods[idx].cal.toString() });
                        setShowEditMyFood(true);
                      }}
                      style={{ marginLeft: 8 }}>
                      <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'DMSans_500Medium' }}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteMyFood(myFoods.findIndex(f => f.name === item.description))} style={styles.deleteBtn}>
                      <Text style={styles.deleteBtnText}>×</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListFooterComponent={null}
      />

     {/* Edit My Food Modal */}
      <Modal visible={showEditMyFood} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'flex-end' }}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setShowEditMyFood(false)} />
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Edit Food</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Food name"
              placeholderTextColor="#444"
              value={editingMyFood?.name || ''}
              onChangeText={v => setEditingMyFood(p => p ? { ...p, name: v } : null)}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Calories"
              placeholderTextColor="#444"
              keyboardType="number-pad"
              value={editingMyFood?.cal || ''}
              onChangeText={v => setEditingMyFood(p => p ? { ...p, cal: v } : null)}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowEditMyFood(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={saveEditMyFood}>
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
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
  tabText: { fontSize: 13, color: theme.textMuted, fontFamily: 'DMSans_500Medium' },
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