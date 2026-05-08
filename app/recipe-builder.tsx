import AsyncStorage from '@react-native-async-storage/async-storage';
import { Camera, CameraView } from 'expo-camera';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Keyboard, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { USDA_API_KEY } from '../config';
import { saveToFirebase } from '../firebaseConfig';

interface Ingredient {
  id: string;
  name: string;
  cal: number;
  protein: number;
  carbs: number;
  fat: number;
  amount: number;
  unit: string;
}

interface Recipe {
  id: string;
  name: string;
  ingredients: Ingredient[];
  totalWeight: number;
  totalWeightUnit: string;
  servingCount: number;
  servingName: string;
  totalCal: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  createdAt: number;
}

const makeId = () => Math.random().toString(36).substr(2, 9);
const WEIGHT_UNITS = ['g', 'oz', 'lbs', 'ml', 'cups'];

export default function RecipeBuilderScreen() {
  const insets = useSafeAreaInsets();
  const { recipeId } = useLocalSearchParams<{ recipeId: string }>();

  const [recipeName, setRecipeName] = useState('');
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [totalWeight, setTotalWeight] = useState('');
  const [totalWeightUnit, setTotalWeightUnit] = useState('g');
  const [servingCount, setServingCount] = useState('1');
  const [servingName, setServingName] = useState('serving');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [showAddIngredientModal, setShowAddIngredientModal] = useState(false);
  const [showCustomFoodModal, setShowCustomFoodModal] = useState(false);
  const [showWeightUnitPicker, setShowWeightUnitPicker] = useState(false);
  const [selectedFood, setSelectedFood] = useState<any>(null);
  const [ingredientAmount, setIngredientAmount] = useState('100');
  const [ingredientUnit, setIngredientUnit] = useState('g');
  const [customFood, setCustomFood] = useState({ name: '', cal: '', protein: '', carbs: '', fat: '', saveToLibrary: true });
  const [myFoods, setMyFoods] = useState<any[]>([]);

  useEffect(() => {
    loadMyFoods();
    if (recipeId) loadExistingRecipe();
  }, []);

  useFocusEffect(
    useCallback(() => {
      const checkPendingIngredient = async () => {
        try {
          const pending = await AsyncStorage.getItem('pj_pending_ingredient');
          if (pending) {
            const ingredient = JSON.parse(pending);
            setIngredients(prev => [...prev, ingredient]);
            await AsyncStorage.removeItem('pj_pending_ingredient');
          }
        } catch (e) {}
      };
      checkPendingIngredient();
    }, [])
  );

  const loadMyFoods = async () => {
    try {
      const saved = await AsyncStorage.getItem('pj_my_foods');
      if (saved) setMyFoods(JSON.parse(saved));
    } catch (e) {}
  };

  const loadExistingRecipe = async () => {
    try {
      const saved = await AsyncStorage.getItem('pj_recipes');
      if (saved) {
        const recipes = JSON.parse(saved);
        const recipe = recipes.find((r: Recipe) => r.id === recipeId);
        if (recipe) {
          setRecipeName(recipe.name);
          setIngredients(recipe.ingredients);
          setTotalWeight(recipe.totalWeight.toString());
          setTotalWeightUnit(recipe.totalWeightUnit);
          setServingCount(recipe.servingCount.toString());
          setServingName(recipe.servingName);
        }
      }
    } catch (e) {}
  };

  const searchFood = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) { setSearchResults([]); return; }
    
    const myFoodResults = myFoods
      .filter(f => f.name.toLowerCase().includes(query.toLowerCase()))
      .map(f => ({ description: f.name, cal: f.cal, isMyFood: true, foodNutrients: [] }));

    setSearching(true);
    try {
      const response = await fetch(
        `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&pageSize=8&api_key=${USDA_API_KEY}`
      );
      const data = await response.json();
      setSearchResults([...myFoodResults, ...(data.foods || [])]);
    } catch (e) {
      setSearchResults(myFoodResults);
    } finally {
      setSearching(false);
    }
  };

  const getCaloriesFromFood = (food: any) => {
    if (food.cal) return food.cal;
    const e = food.foodNutrients?.find((n: any) => n.nutrientName === 'Energy' && n.unitName === 'KCAL');
    return Math.round(e?.value || 0);
  };

  const getNutrient = (food: any, name: string) => {
    const n = food.foodNutrients?.find((f: any) => f.nutrientName === name);
    return Math.round((n?.value || 0) * 10) / 10;
  };

  const selectFood = (food: any) => {
    setSelectedFood(food);
    setIngredientAmount('100');
    setIngredientUnit('g');
    setSearchQuery('');
    setSearchResults([]);
    setShowAddIngredientModal(true);
    Keyboard.dismiss();
  };

  const addIngredient = () => {
    if (!selectedFood || !ingredientAmount) return;
    const multiplier = parseFloat(ingredientAmount) / 100;
    const calPer100g = getCaloriesFromFood(selectedFood);
    const ingredient: Ingredient = {
      id: makeId(),
      name: selectedFood.description || selectedFood.name,
      cal: Math.round(calPer100g * multiplier),
      protein: Math.round(getNutrient(selectedFood, 'Protein') * multiplier * 10) / 10,
      carbs: Math.round(getNutrient(selectedFood, 'Carbohydrate, by difference') * multiplier * 10) / 10,
      fat: Math.round(getNutrient(selectedFood, 'Total lipid (fat)') * multiplier * 10) / 10,
      amount: parseFloat(ingredientAmount),
      unit: ingredientUnit,
    };
    setIngredients(prev => [...prev, ingredient]);
    setShowAddIngredientModal(false);
    setSelectedFood(null);
  };

  const addCustomFood = async () => {
    if (!customFood.name || !customFood.cal) return;
    const ingredient: Ingredient = {
      id: makeId(),
      name: customFood.name,
      cal: parseInt(customFood.cal) || 0,
      protein: parseFloat(customFood.protein) || 0,
      carbs: parseFloat(customFood.carbs) || 0,
      fat: parseFloat(customFood.fat) || 0,
      amount: 100,
      unit: 'g',
    };
    setIngredients(prev => [...prev, ingredient]);
    if (customFood.saveToLibrary) {
      const updated = [...myFoods, { name: customFood.name, cal: parseInt(customFood.cal) }];
      setMyFoods(updated);
      await AsyncStorage.setItem('pj_my_foods', JSON.stringify(updated));
    }
    setCustomFood({ name: '', cal: '', protein: '', carbs: '', fat: '', saveToLibrary: true });
    setShowCustomFoodModal(false);
  };

  const removeIngredient = (id: string) => {
    setIngredients(prev => prev.filter(i => i.id !== id));
  };

  const totalCal = ingredients.reduce((s, i) => s + i.cal, 0);
  const totalProtein = Math.round(ingredients.reduce((s, i) => s + i.protein, 0) * 10) / 10;
  const totalCarbs = Math.round(ingredients.reduce((s, i) => s + i.carbs, 0) * 10) / 10;
  const totalFat = Math.round(ingredients.reduce((s, i) => s + i.fat, 0) * 10) / 10;
  const servings = parseInt(servingCount) || 1;
  const calPerServing = Math.round(totalCal / servings);
  const proteinPerServing = Math.round(totalProtein / servings * 10) / 10;
  const carbsPerServing = Math.round(totalCarbs / servings * 10) / 10;
  const fatPerServing = Math.round(totalFat / servings * 10) / 10;

  const saveRecipe = async () => {
    if (!recipeName.trim()) { Alert.alert('Name required', 'Please give your recipe a name.'); return; }
    if (ingredients.length === 0) { Alert.alert('No ingredients', 'Add at least one ingredient.'); return; }
    try {
      const recipe: Recipe = {
        id: recipeId || makeId(),
        name: recipeName,
        ingredients,
        totalWeight: parseFloat(totalWeight) || 0,
        totalWeightUnit,
        servingCount: servings,
        servingName,
        totalCal,
        totalProtein,
        totalCarbs,
        totalFat,
        createdAt: Date.now(),
      };
      const saved = await AsyncStorage.getItem('pj_recipes');
      let recipes = saved ? JSON.parse(saved) : [];
      if (recipeId) {
        recipes = recipes.map((r: Recipe) => r.id === recipeId ? recipe : r);
      } else {
        recipes.push(recipe);
      }
      await AsyncStorage.setItem('pj_recipes', JSON.stringify(recipes));
      await saveToFirebase('recipes', 'list', recipes);
      Alert.alert('Saved!', `${recipeName} saved to your recipe library.`, [{ text: 'OK', onPress: () => router.back() }]);
    } catch (e) {
      console.log('Save recipe error', e);
    }
  };

  const startScan = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    if (status === 'granted') setScanning(true);
  };

  const handleBarcodeScan = async ({ data }: { data: string }) => {
    setScanning(false);
    try {
      const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${data}.json`);
      const result = await response.json();
      if (result.status === 1 && result.product) {
        const product = result.product;
        selectFood({
          description: `${product.product_name}${product.brands ? ' · ' + product.brands : ''}`,
          foodNutrients: [
            { nutrientName: 'Energy', unitName: 'KCAL', value: product.nutriments?.['energy-kcal_100g'] || 0 },
            { nutrientName: 'Protein', value: product.nutriments?.proteins_100g || 0 },
            { nutrientName: 'Carbohydrate, by difference', value: product.nutriments?.carbohydrates_100g || 0 },
            { nutrientName: 'Total lipid (fat)', value: product.nutriments?.fat_100g || 0 },
          ],
        });
      } else {
        Alert.alert('Not found', 'Product not found. Try searching manually.');
      }
    } catch (e) {
      console.log('Barcode error', e);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{recipeId ? 'Edit Recipe' : 'New Recipe'}</Text>
        <TouchableOpacity onPress={saveRecipe} style={styles.saveBtn}>
          <Text style={styles.saveBtnText}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled">

        {/* Recipe Name */}
        <TextInput
          style={styles.recipeNameInput}
          placeholder="Recipe name..."
          placeholderTextColor="#444444"
          value={recipeName}
          onChangeText={setRecipeName}
        />

        {/* Add Ingredient */}
<View style={styles.searchRow}>
  <TouchableOpacity
    style={[styles.searchInput, { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }]}
    onPress={() => router.push({ pathname: '/add-food', params: { meal: 'recipe', date: 'recipe', recipeMode: 'true' } })}>
    <Text style={{ color: '#3b82f6', fontSize: 16, fontFamily: 'DMSans_600SemiBold' }}>+ Add Ingredient</Text>
  </TouchableOpacity>
  <TouchableOpacity style={styles.customBtn} onPress={() => setShowCustomFoodModal(true)}>
    <Text style={styles.customBtnText}>+</Text>
  </TouchableOpacity>
</View>

        {/* Ingredients List */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Ingredients ({ingredients.length})</Text>
          {ingredients.length === 0 && (
            <Text style={styles.emptyText}>No ingredients yet. Search or scan above.</Text>
          )}
          {ingredients.map(ing => (
            <View key={ing.id} style={styles.ingredientRow}>
              <View style={styles.ingredientLeft}>
                <Text style={styles.ingredientName} numberOfLines={1}>{ing.name}</Text>
                <Text style={styles.ingredientMeta}>{ing.amount}{ing.unit} · {ing.cal} kcal · P:{ing.protein}g C:{ing.carbs}g F:{ing.fat}g</Text>
              </View>
              <TouchableOpacity onPress={() => removeIngredient(ing.id)}>
                <Text style={styles.removeBtn}>×</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Running Totals */}
        {ingredients.length > 0 && (
          <View style={styles.totalsCard}>
            <Text style={styles.sectionLabel}>Total Nutrition</Text>
            <View style={styles.macroRow}>
              <View style={styles.macroStat}>
                <Text style={[styles.macroVal, { color: '#10b981' }]}>{totalCal}</Text>
                <Text style={styles.macroLabel}>Cal</Text>
              </View>
              <View style={styles.macroStat}>
                <Text style={[styles.macroVal, { color: '#3b82f6' }]}>{totalProtein}g</Text>
                <Text style={styles.macroLabel}>Protein</Text>
              </View>
              <View style={styles.macroStat}>
                <Text style={[styles.macroVal, { color: '#f59e0b' }]}>{totalCarbs}g</Text>
                <Text style={styles.macroLabel}>Carbs</Text>
              </View>
              <View style={styles.macroStat}>
                <Text style={[styles.macroVal, { color: '#ef4444' }]}>{totalFat}g</Text>
                <Text style={styles.macroLabel}>Fat</Text>
              </View>
            </View>
          </View>
        )}

        {/* Total Weight */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Total Finished Weight (optional)</Text>
          <View style={styles.weightRow}>
            <TextInput
              style={[styles.searchInput, { flex: 1 }]}
              placeholder="e.g. 2000"
              placeholderTextColor="#444444"
              keyboardType="decimal-pad"
              value={totalWeight}
              onChangeText={setTotalWeight}
            />
            <TouchableOpacity style={styles.unitPickerBtn} onPress={() => setShowWeightUnitPicker(true)}>
              <Text style={styles.unitPickerBtnText}>{totalWeightUnit} ▼</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Serving Size */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Servings</Text>
          <View style={styles.servingRow}>
            <TextInput
              style={[styles.searchInput, { width: 80 }]}
              placeholder="5"
              placeholderTextColor="#444444"
              keyboardType="number-pad"
              value={servingCount}
              onChangeText={setServingCount}
            />
            <TextInput
              style={[styles.searchInput, { flex: 1 }]}
              placeholder="servings, slices, scoops..."
              placeholderTextColor="#444444"
              value={servingName}
              onChangeText={setServingName}
            />
          </View>
          {ingredients.length > 0 && servings > 0 && (
            <View style={styles.perServingCard}>
              <Text style={styles.perServingTitle}>Per {servingName}</Text>
              <View style={styles.macroRow}>
                <View style={styles.macroStat}>
                  <Text style={[styles.macroVal, { color: '#10b981' }]}>{calPerServing}</Text>
                  <Text style={styles.macroLabel}>Cal</Text>
                </View>
                <View style={styles.macroStat}>
                  <Text style={[styles.macroVal, { color: '#3b82f6' }]}>{proteinPerServing}g</Text>
                  <Text style={styles.macroLabel}>Protein</Text>
                </View>
                <View style={styles.macroStat}>
                  <Text style={[styles.macroVal, { color: '#f59e0b' }]}>{carbsPerServing}g</Text>
                  <Text style={styles.macroLabel}>Carbs</Text>
                </View>
                <View style={styles.macroStat}>
                  <Text style={[styles.macroVal, { color: '#ef4444' }]}>{fatPerServing}g</Text>
                  <Text style={styles.macroLabel}>Fat</Text>
                </View>
              </View>
            </View>
          )}
        </View>

      </ScrollView>

      {/* Add Ingredient Modal */}
      <Modal visible={showAddIngredientModal} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => Keyboard.dismiss()}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{selectedFood?.description}</Text>
            <Text style={styles.modalSubtitle}>How much are you using?</Text>
            <View style={styles.servingRow}>
              <TextInput
                style={[styles.searchInput, { width: 100 }]}
                value={ingredientAmount}
                onChangeText={setIngredientAmount}
                keyboardType="decimal-pad"
                selectTextOnFocus
              />
              <View style={styles.unitBtns}>
                {['g', 'oz', 'serving'].map(u => (
                  <TouchableOpacity
                    key={u}
                    style={[styles.unitBtn, ingredientUnit === u && styles.unitBtnActive]}
                    onPress={() => setIngredientUnit(u)}>
                    <Text style={[styles.unitBtnText, ingredientUnit === u && { color: '#3b82f6' }]}>{u}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowAddIngredientModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={addIngredient}>
                <Text style={styles.modalSaveText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Custom Food Modal */}
      <Modal visible={showCustomFoodModal} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => Keyboard.dismiss()}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Add Custom Food</Text>
            <TextInput style={styles.modalInput} placeholder="Food name" placeholderTextColor="#444" value={customFood.name} onChangeText={v => setCustomFood(p => ({ ...p, name: v }))} />
            <View style={styles.servingRow}>
              <TextInput style={[styles.modalInput, { flex: 1 }]} placeholder="Calories" placeholderTextColor="#444" keyboardType="decimal-pad" value={customFood.cal} onChangeText={v => setCustomFood(p => ({ ...p, cal: v }))} />
              <TextInput style={[styles.modalInput, { flex: 1 }]} placeholder="Protein g" placeholderTextColor="#444" keyboardType="decimal-pad" value={customFood.protein} onChangeText={v => setCustomFood(p => ({ ...p, protein: v }))} />
            </View>
            <View style={styles.servingRow}>
              <TextInput style={[styles.modalInput, { flex: 1 }]} placeholder="Carbs g" placeholderTextColor="#444" keyboardType="decimal-pad" value={customFood.carbs} onChangeText={v => setCustomFood(p => ({ ...p, carbs: v }))} />
              <TextInput style={[styles.modalInput, { flex: 1 }]} placeholder="Fat g" placeholderTextColor="#444" keyboardType="decimal-pad" value={customFood.fat} onChangeText={v => setCustomFood(p => ({ ...p, fat: v }))} />
            </View>
            <TouchableOpacity
              style={styles.saveToLibraryRow}
              onPress={() => setCustomFood(p => ({ ...p, saveToLibrary: !p.saveToLibrary }))}>
              <View style={[styles.checkbox, customFood.saveToLibrary && styles.checkboxChecked]}>
                {customFood.saveToLibrary && <Text style={styles.checkboxCheck}>✓</Text>}
              </View>
              <Text style={styles.saveToLibraryText}>Save to My Foods library</Text>
            </TouchableOpacity>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowCustomFoodModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={addCustomFood}>
                <Text style={styles.modalSaveText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Weight Unit Picker */}
      <Modal visible={showWeightUnitPicker} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowWeightUnitPicker(false)}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Select Unit</Text>
            {WEIGHT_UNITS.map(u => (
              <TouchableOpacity
                key={u}
                style={[styles.unitPickerOption, totalWeightUnit === u && styles.unitPickerOptionActive]}
                onPress={() => { setTotalWeightUnit(u); setShowWeightUnitPicker(false); }}>
                <Text style={[styles.unitPickerOptionText, totalWeightUnit === u && { color: '#3b82f6' }]}>{u}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Camera */}
      {scanning && (
        <View style={styles.cameraOverlay}>
          <CameraView
            style={styles.camera}
            onBarcodeScanned={handleBarcodeScan}
            barcodeScannerSettings={{ barcodeTypes: ['upc_a', 'upc_e', 'ean13', 'ean8'] }}
          />
          <TouchableOpacity style={styles.cancelScan} onPress={() => setScanning(false)}>
            <Text style={styles.cancelScanText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080808' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#222222' },
  backBtn: { width: 60 },
  backBtnText: { color: '#3b82f6', fontSize: 14, fontFamily: 'DMSans_500Medium' },
  headerTitle: { fontSize: 20, color: '#ffffff', fontFamily: 'BebasNeue_400Regular', letterSpacing: 1 },
  saveBtn: { backgroundColor: '#10b981', borderRadius: 6, paddingHorizontal: 16, paddingVertical: 6 },
  saveBtnText: { color: '#000000', fontSize: 14, fontFamily: 'DMSans_700Bold' },
  content: { padding: 16, paddingBottom: 80 },
  recipeNameInput: { backgroundColor: '#161616', borderWidth: 1, borderColor: '#2a2a2a', borderRadius: 10, color: '#ffffff', padding: 14, fontSize: 18, fontFamily: 'DMSans_600SemiBold', marginBottom: 16 },
  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  searchInput: { backgroundColor: '#161616', borderWidth: 1, borderColor: '#2a2a2a', borderRadius: 8, color: '#ffffff', padding: 12, fontSize: 14, fontFamily: 'DMSans_400Regular' },
  scanBtn: { backgroundColor: 'rgba(245,158,11,0.15)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)', borderRadius: 8, paddingHorizontal: 12, justifyContent: 'center' },
  scanBtnText: { fontSize: 18 },
  customBtn: { backgroundColor: 'rgba(16,185,129,0.15)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)', borderRadius: 8, paddingHorizontal: 14, justifyContent: 'center' },
  customBtnText: { color: '#10b981', fontSize: 22, fontFamily: 'DMSans_400Regular' },
  searchResults: { backgroundColor: '#161616', borderWidth: 1, borderColor: '#2a2a2a', borderRadius: 8, marginBottom: 16, overflow: 'hidden' },
  searchResult: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#1e1e1e' },
  searchResultName: { fontSize: 13, color: '#e8e8e8', fontFamily: 'DMSans_400Regular', flex: 1, marginRight: 8 },
  searchResultCal: { fontSize: 12, color: '#10b981', fontFamily: 'DMSans_600SemiBold' },
  section: { marginBottom: 20 },
  sectionLabel: { fontSize: 9, letterSpacing: 3, color: '#999999', textTransform: 'uppercase', fontFamily: 'DMSans_500Medium', marginBottom: 10 },
  emptyText: { fontSize: 13, color: '#444444', fontFamily: 'DMSans_400Regular', fontStyle: 'italic' },
  ingredientRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#161616', borderWidth: 1, borderColor: '#2a2a2a', borderRadius: 8, padding: 12, marginBottom: 8 },
  ingredientLeft: { flex: 1, marginRight: 8 },
  ingredientName: { fontSize: 14, color: '#ffffff', fontFamily: 'DMSans_600SemiBold', marginBottom: 2 },
  ingredientMeta: { fontSize: 11, color: '#888888', fontFamily: 'DMSans_400Regular' },
  removeBtn: { fontSize: 20, color: '#444444', padding: 4 },
  totalsCard: { backgroundColor: '#161616', borderWidth: 1, borderColor: '#2a2a2a', borderRadius: 10, padding: 16, marginBottom: 20 },
  macroRow: { flexDirection: 'row', justifyContent: 'space-between' },
  macroStat: { alignItems: 'center', flex: 1 },
  macroVal: { fontSize: 22, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1 },
  macroLabel: { fontSize: 10, color: '#888888', fontFamily: 'DMSans_400Regular', marginTop: 2 },
  weightRow: { flexDirection: 'row', gap: 8 },
  unitPickerBtn: { backgroundColor: '#161616', borderWidth: 1, borderColor: '#2a2a2a', borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center' },
  unitPickerBtnText: { color: '#3b82f6', fontSize: 14, fontFamily: 'DMSans_600SemiBold' },
  servingRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  perServingCard: { backgroundColor: '#0f1a14', borderWidth: 1, borderColor: '#1a3a25', borderRadius: 10, padding: 14, marginTop: 8 },
  perServingTitle: { fontSize: 9, letterSpacing: 3, color: '#4a9e6a', textTransform: 'uppercase', fontFamily: 'DMSans_500Medium', marginBottom: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#161616', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 24, borderWidth: 1, borderColor: '#2a2a2a' },
  modalTitle: { fontSize: 18, color: '#ffffff', fontFamily: 'DMSans_600SemiBold', marginBottom: 4 },
  modalSubtitle: { fontSize: 12, color: '#999999', fontFamily: 'DMSans_400Regular', marginBottom: 16 },
  modalInput: { backgroundColor: '#1e1e1e', borderWidth: 1, borderColor: '#2a2a2a', borderRadius: 6, color: '#ffffff', padding: 10, fontSize: 14, fontFamily: 'DMSans_400Regular', marginBottom: 10 },
  unitBtns: { flexDirection: 'row', gap: 6, flex: 1 },
  unitBtn: { flex: 1, padding: 10, backgroundColor: '#1e1e1e', borderWidth: 1, borderColor: '#2a2a2a', borderRadius: 6, alignItems: 'center' },
  unitBtnActive: { backgroundColor: 'rgba(59,130,246,0.15)', borderColor: 'rgba(59,130,246,0.4)' },
  unitBtnText: { color: '#888888', fontSize: 13, fontFamily: 'DMSans_500Medium' },
  modalBtns: { flexDirection: 'row', gap: 8, marginTop: 8 },
  modalCancelBtn: { flex: 1, padding: 12, backgroundColor: '#1e1e1e', borderWidth: 1, borderColor: '#2a2a2a', borderRadius: 6, alignItems: 'center' },
  modalCancelText: { color: '#999999', fontFamily: 'DMSans_500Medium', fontSize: 14 },
  modalSaveBtn: { flex: 1, padding: 12, backgroundColor: '#3b82f6', borderRadius: 6, alignItems: 'center' },
  modalSaveText: { color: '#ffffff', fontFamily: 'BebasNeue_400Regular', fontSize: 16, letterSpacing: 1 },
  saveToLibraryRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 1, borderColor: '#444444', alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: '#10b981', borderColor: '#10b981' },
  checkboxCheck: { color: '#000000', fontSize: 12, fontWeight: '700' },
  saveToLibraryText: { color: '#888888', fontSize: 13, fontFamily: 'DMSans_400Regular' },
  unitPickerOption: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#1e1e1e' },
  unitPickerOptionActive: { backgroundColor: 'rgba(59,130,246,0.1)' },
  unitPickerOptionText: { fontSize: 16, color: '#888888', fontFamily: 'DMSans_500Medium' },
  cameraOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 },
  camera: { flex: 1 },
  cancelScan: { position: 'absolute', bottom: 40, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.7)', padding: 16, borderRadius: 8 },
  cancelScanText: { color: '#ffffff', fontSize: 16, fontFamily: 'DMSans_600SemiBold' },
});