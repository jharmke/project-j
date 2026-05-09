import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Camera, CameraView } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { USDA_API_KEY } from '../config';
import { db, getUserId, loadFromFirebase, saveToFirebase } from '../firebaseConfig';
import { useTheme } from '../theme';




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

export default function AddFoodScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [myFoods, setMyFoods] = useState<MyFood[]>([]);
  const [scanning, setScanning] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const scanningRef = useRef(false);
  const cameraReadyTimer = useRef<any>(null);
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
  }, []);

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

  const searchFood = async (query: string) => {
    setQuery(query);
    if (!query.trim()) {
      setResults([]);
      return;
    }

    // My Foods first
    const myFoodResults = myFoods
      .filter(f => f.name.toLowerCase().includes(query.toLowerCase()))
      .map(f => ({
        description: f.name,
        foodNutrients: [{ nutrientName: 'Energy', unitName: 'KCAL', value: f.cal }],
        isMyFood: true,
      }));

    setResults(myFoodResults);
    setSearching(true);

    try {
      // Open Food Facts search
      const offResponse = await fetch(
        `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=10`
      );
      const offText = await offResponse.text();
      let offResults: SearchResult[] = [];
      try {
        const offData = JSON.parse(offText);
        offResults = (offData.products || [])
          .filter((p: any) => p.product_name && p.nutriments?.['energy-kcal_100g'])
          .map((p: any) => ({
            description: `${p.product_name}${p.brands ? ' · ' + p.brands : ''}`,
            foodNutrients: [
              { nutrientName: 'Energy', unitName: 'KCAL', value: Math.round(p.nutriments?.['energy-kcal_100g'] || 0) },
              { nutrientName: 'Protein', unitName: 'G', value: p.nutriments?.proteins_100g || 0 },
              { nutrientName: 'Carbohydrate, by difference', unitName: 'G', value: p.nutriments?.carbohydrates_100g || 0 },
              { nutrientName: 'Total lipid (fat)', unitName: 'G', value: p.nutriments?.fat_100g || 0 },
              { nutrientName: 'Fiber, total dietary', unitName: 'G', value: p.nutriments?.fiber_100g || 0 },
              { nutrientName: 'Sugars, total including NLEA', unitName: 'G', value: p.nutriments?.sugars_100g || 0 },
              { nutrientName: 'Sodium, Na', unitName: 'MG', value: (p.nutriments?.sodium_100g || 0) * 1000 },
            ],
            fromOFF: true,
          }));
      } catch (e) {
        console.log('OFF parse error', e);
      }

      // USDA search as backup
      let usdaResults: SearchResult[] = [];
      try {
        const usdaResponse = await fetch(
          `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&pageSize=5&api_key=${USDA_API_KEY}`
        );
        const usdaData = await usdaResponse.json();
        usdaResults = usdaData.foods || [];
      } catch (e) {
        console.log('USDA error', e);
      }

      setResults([...myFoodResults, ...offResults, ...usdaResults]);
    } catch (e) {
      console.log('Search error', e);
    } finally {
      setSearching(false);
    }
  };

  const getCalories = (food: SearchResult) => {
    const e = food.foodNutrients?.find((n: any) => n.nutrientName === 'Energy' && n.unitName === 'KCAL');
    return Math.round(e?.value || 0);
  };

const openFoodDetail = (food: SearchResult) => {
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
    router.push({
      pathname: '/food-detail',
      params: {
        foodJson: JSON.stringify({ 
          ...food, 
          isMyFood: food.isMyFood,
          myFoodData: myFoodMatch,
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
      setScanning(true);
      setCameraReady(false);
      cameraReadyTimer.current = setTimeout(() => setCameraReady(true), 435);
    }
  };

const handleBarcodeScan = async ({ data }: { data: string }) => {
    if (scanningRef.current === false) return;
    scanningRef.current = false;
    setScanning(false);
    setCameraReady(false);
    if (cameraReadyTimer.current) clearTimeout(cameraReadyTimer.current);
    try {
      // Try Open Food Facts first with retry logic
      let result = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const response = await fetch(
            `https://world.openfoodfacts.org/api/v0/product/${data}.json`,
            { headers: { 'Accept': 'application/json' } }
          );
          const text = await response.text();
          result = JSON.parse(text);
          break;
        } catch (e) {
          console.log(`Attempt ${attempt + 1} failed`, e);
          if (attempt < 2) await new Promise(r => setTimeout(r, 500));
        }
      }

      if (result?.status === 1 && result.product) {
        const product = result.product;
        const cal = Math.round(
          product.nutriments?.['energy-kcal_serving'] ||
          product.nutriments?.['energy-kcal'] ||
          product.nutriments?.['energy-kcal_100g'] ||
          0
        );
        const name = product.product_name || 'Unknown Product';
        const brands = product.brands || '';
        setResults([{
          description: `${name}${brands ? ' · ' + brands : ''}`,
          foodNutrients: [
            { nutrientName: 'Energy', unitName: 'KCAL', value: cal },
            { nutrientName: 'Protein', unitName: 'G', value: product.nutriments?.proteins_100g || 0 },
            { nutrientName: 'Carbohydrate, by difference', unitName: 'G', value: product.nutriments?.carbohydrates_100g || 0 },
            { nutrientName: 'Total lipid (fat)', unitName: 'G', value: product.nutriments?.fat_100g || 0 },
            { nutrientName: 'Fiber, total dietary', unitName: 'G', value: product.nutriments?.fiber_100g || 0 },
            { nutrientName: 'Sugars, total including NLEA', unitName: 'G', value: product.nutriments?.sugars_100g || 0 },
            { nutrientName: 'Sodium, Na', unitName: 'MG', value: (product.nutriments?.sodium_100g || 0) * 1000 },
          ],
        }]);
      } else {
        Alert.alert(
          'Product Not Found',
          'This barcode wasn\'t found in the database. Would you like to search manually?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Search', onPress: () => {} }
          ]
        );
      }
    } catch (e) {
      console.log('Barcode error', e);
      Alert.alert('Scan Error', 'Something went wrong. Please try again.');
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

  const styles = useStyles(theme);
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
      style={{ backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder, borderRadius: 6, padding: 6, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name="camera-outline" size={24} color={theme.accentBlue} />
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
      <TouchableOpacity style={styles.addNewBtn} onPress={() => setShowAddNew(!showAddNew)}>
        <Text style={styles.addNewBtnText}>+ Save New Food to Library</Text>
      </TouchableOpacity>

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
        renderItem={({ item, index }) => (
          <TouchableOpacity style={styles.resultItem} onPress={() => openFoodDetail(item)}>
            <View style={styles.resultLeft}>
              {item.isMyFood && (
                <View style={styles.savedBadge}>
                  <Text style={styles.savedBadgeText}>SAVED</Text>
                </View>
              )}
              {item.isRecipe && (
                <View style={[styles.savedBadge, { backgroundColor: theme.accentGreenBg }]}>
                  <Text style={[styles.savedBadgeText, { color: theme.accentGreen }]}>RECIPE</Text>
                </View>
              )}
              <Text style={styles.resultName} numberOfLines={2}>{item.description}</Text>
            </View>
            <View style={styles.resultRight}>
              <TouchableOpacity onPress={() => toggleFavorite(item)} style={{ marginRight: 8 }}>
                <Text style={{ fontSize: 16, color: favorites.some(f => f.name === item.description) ? theme.accentAmber : theme.textDim }}>★</Text>
              </TouchableOpacity>
              <Text style={styles.resultCal}>{getCalories(item)}</Text>
              <Text style={styles.resultCalLabel}>kcal</Text>
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
        )}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
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
        <View style={styles.cameraOverlay}>
          <CameraView
            style={styles.camera}
            onBarcodeScanned={handleBarcodeScan}
            barcodeScannerSettings={{ barcodeTypes: ['upc_a', 'upc_e', 'ean13', 'ean8'] }}
          />
          {/* Viewfinder overlay */}
          {cameraReady && <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
            {/* Top dark band */}
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '30%', backgroundColor: 'rgba(0,0,0,0.55)' }} />
            {/* Bottom dark band */}
            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '35%', backgroundColor: 'rgba(0,0,0,0.55)' }} />
            {/* Left dark band */}
            <View style={{ position: 'absolute', top: '30%', bottom: '35%', left: 0, width: '10%', backgroundColor: 'rgba(0,0,0,0.55)' }} />
            {/* Right dark band */}
            <View style={{ position: 'absolute', top: '30%', bottom: '35%', right: 0, width: '10%', backgroundColor: 'rgba(0,0,0,0.55)' }} />
            {/* Corner brackets */}
            <View style={{ width: '80%', aspectRatio: 2.5, position: 'relative' }}>
              {/* Top-left */}
              <View style={{ position: 'absolute', top: 0, left: 0, width: 28, height: 28, borderTopWidth: 3, borderLeftWidth: 3, borderColor: '#10b981', borderTopLeftRadius: 4 }} />
              {/* Top-right */}
              <View style={{ position: 'absolute', top: 0, right: 0, width: 28, height: 28, borderTopWidth: 3, borderRightWidth: 3, borderColor: '#10b981', borderTopRightRadius: 4 }} />
              {/* Bottom-left */}
              <View style={{ position: 'absolute', bottom: 0, left: 0, width: 28, height: 28, borderBottomWidth: 3, borderLeftWidth: 3, borderColor: '#10b981', borderBottomLeftRadius: 4 }} />
              {/* Bottom-right */}
              <View style={{ position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderBottomWidth: 3, borderRightWidth: 3, borderColor: '#10b981', borderBottomRightRadius: 4 }} />
              {/* Center line */}
              <View style={{ position: 'absolute', top: '50%', left: '5%', right: '5%', height: 1, backgroundColor: 'rgba(16,185,129,0.5)' }} />
            </View>
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontFamily: 'DMSans_400Regular', marginTop: 12, letterSpacing: 1 }}>Align barcode within frame</Text>
          </View>}
          <TouchableOpacity style={styles.cancelScan} onPress={() => setScanning(false)}>
            <Text style={styles.cancelScanText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const useStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bgPrimary },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.borderCard },
  backBtn: { padding: 4 },
  backBtnText: { color: theme.accentBlue, fontSize: 14, fontFamily: 'DMSans_500Medium' },
  headerTitle: { fontSize: 20, color: theme.textPrimary, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1 },
  scanBtn: { padding: 4 },
  scanBtnText: { fontSize: 20 },
  searchRow: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingBottom: 8 },
  searchInput: { flex: 1, backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, color: theme.textPrimary, padding: 12, fontSize: 15, fontFamily: 'DMSans_400Regular' },
  searching: { color: theme.textMuted, marginLeft: 8, fontFamily: 'DMSans_400Regular' },
  addNewBtn: { marginHorizontal: 16, marginBottom: 8, padding: 10, backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder, borderRadius: 6, alignItems: 'center' },
  addNewBtnText: { color: theme.accentBlue, fontSize: 13, fontFamily: 'DMSans_600SemiBold' },
  addNewForm: { marginHorizontal: 16, marginBottom: 8, backgroundColor: theme.bgCard, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: theme.borderCard },
  formInput: { backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 6, color: theme.textPrimary, padding: 10, fontSize: 14, fontFamily: 'DMSans_400Regular', marginBottom: 8 },
  formRow: { flexDirection: 'row', gap: 8 },
  saveBtn: { backgroundColor: theme.accentGreenBg, borderWidth: 1, borderColor: theme.accentGreenBorder, borderRadius: 6, paddingHorizontal: 16, justifyContent: 'center' },
  saveBtnText: { color: theme.accentGreen, fontFamily: 'DMSans_600SemiBold', fontSize: 14 },
  resultItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderBottomWidth: 1, borderBottomColor: theme.borderSubtle },
  resultLeft: { flex: 1, marginRight: 12 },
  savedBadge: { backgroundColor: theme.accentGreenBg, borderRadius: 3, paddingHorizontal: 5, paddingVertical: 1, alignSelf: 'flex-start', marginBottom: 4 },
  savedBadgeText: { fontSize: 8, color: theme.accentGreen, fontFamily: 'DMSans_700Bold' },
  resultName: { fontSize: 13, color: theme.textPrimary, fontFamily: 'DMSans_400Regular' },
  resultRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  resultCal: { fontSize: 18, color: theme.accentGreen, fontFamily: 'BebasNeue_400Regular' },
  resultCalLabel: { fontSize: 10, color: theme.textMuted, fontFamily: 'DMSans_400Regular' },
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
});