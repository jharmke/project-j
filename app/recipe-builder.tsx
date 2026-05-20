import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CustomFoodCreator from '../components/CustomFoodCreator';
import { saveToFirebase } from '../firebaseConfig';
import { storageSet } from '../utils/storage';
import { useTheme } from '../theme';

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

const filterDecimal = (v: string, set: (s: string) => void) => {
  const stripped = v.replace(/[^0-9.]/g, '');
  const dot = stripped.indexOf('.');
  if (dot === -1) { set(stripped); }
  else {
    const before = stripped.slice(0, dot);
    const after = stripped.slice(dot + 1).replace(/\./g, '').slice(0, 1);
    set(before + '.' + after);
  }
};

export default function RecipeBuilderScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { recipeId } = useLocalSearchParams<{ recipeId: string }>();

  const [recipeName, setRecipeName] = useState('');
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [totalWeight, setTotalWeight] = useState('');
  const [totalWeightUnit, setTotalWeightUnit] = useState('g');
  const [servingCount, setServingCount] = useState('1');
  const [servingName, setServingName] = useState('serving');
  const [showCustomFoodModal, setShowCustomFoodModal] = useState(false);
  const [showWeightUnitPicker, setShowWeightUnitPicker] = useState(false);

  useEffect(() => {
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


  const handleCustomFoodSaved = (food: any) => {
    const ingredient: Ingredient = {
      id: makeId(),
      name: food.name,
      cal: food.cal || 0,
      protein: food.protein || 0,
      carbs: food.carbs || 0,
      fat: food.fat || 0,
      amount: food.servingSize || 100,
      unit: food.servingUnit || 'g',
    };
    setIngredients(prev => [...prev, ingredient]);
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
      await storageSet('pj_recipes', JSON.stringify(recipes));
      await saveToFirebase('recipes', 'list', recipes);
      Alert.alert('Saved!', `${recipeName} saved to your recipe library.`, [{ text: 'OK', onPress: () => router.back() }]);
    } catch (e) {
      console.log('Save recipe error', e);
    }
  };


  const styles = useStyles(theme);
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
          placeholderTextColor={theme.textPlaceholder}
          value={recipeName}
          onChangeText={setRecipeName}
        />

        {/* Add Ingredient */}
<View style={styles.searchRow}>
  <TouchableOpacity
    style={[styles.searchInput, { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }]}
    onPress={() => router.push({ pathname: '/add-food', params: { meal: 'recipe', date: 'recipe', recipeMode: 'true' } })}>
    <Text style={{ color: theme.accentBlue, fontSize: 16, fontFamily: 'DMSans_600SemiBold' }}>+ Add Ingredient</Text>
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
                <Text style={[styles.macroVal, { color: theme.accentGreen }]}>{totalCal}</Text>
                <Text style={styles.macroLabel}>Cal</Text>
              </View>
              <View style={styles.macroStat}>
                <Text style={[styles.macroVal, { color: theme.macroProtein }]}>{totalProtein}g</Text>
                <Text style={styles.macroLabel}>Protein</Text>
              </View>
              <View style={styles.macroStat}>
                <Text style={[styles.macroVal, { color: theme.macroCarbs }]}>{totalCarbs}g</Text>
                <Text style={styles.macroLabel}>Carbs</Text>
              </View>
              <View style={styles.macroStat}>
                <Text style={[styles.macroVal, { color: theme.macroFat }]}>{totalFat}g</Text>
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
              placeholderTextColor={theme.textPlaceholder}
              keyboardType="decimal-pad"
              value={totalWeight}
              onChangeText={v => filterDecimal(v, setTotalWeight)}
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
              placeholderTextColor={theme.textPlaceholder}
              keyboardType="number-pad"
              value={servingCount}
              onChangeText={setServingCount}
            />
            <TextInput
              style={[styles.searchInput, { flex: 1 }]}
              placeholder="servings, slices, scoops..."
              placeholderTextColor={theme.textPlaceholder}
              value={servingName}
              onChangeText={setServingName}
            />
          </View>
          {ingredients.length > 0 && servings > 0 && (
            <View style={styles.perServingCard}>
              <Text style={styles.perServingTitle}>Per {servingName}</Text>
              <View style={styles.macroRow}>
                <View style={styles.macroStat}>
                  <Text style={[styles.macroVal, { color: theme.accentGreen }]}>{calPerServing}</Text>
                  <Text style={styles.macroLabel}>Cal</Text>
                </View>
                <View style={styles.macroStat}>
                  <Text style={[styles.macroVal, { color: theme.macroProtein }]}>{proteinPerServing}g</Text>
                  <Text style={styles.macroLabel}>Protein</Text>
                </View>
                <View style={styles.macroStat}>
                  <Text style={[styles.macroVal, { color: theme.macroCarbs }]}>{carbsPerServing}g</Text>
                  <Text style={styles.macroLabel}>Carbs</Text>
                </View>
                <View style={styles.macroStat}>
                  <Text style={[styles.macroVal, { color: theme.macroFat }]}>{fatPerServing}g</Text>
                  <Text style={styles.macroLabel}>Fat</Text>
                </View>
              </View>
            </View>
          )}
        </View>

      </ScrollView>

      <CustomFoodCreator
        visible={showCustomFoodModal}
        onClose={() => setShowCustomFoodModal(false)}
        onSaved={handleCustomFoodSaved}
      />

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
                <Text style={[styles.unitPickerOptionText, totalWeightUnit === u && { color: theme.accentBlue }]}>{u}</Text>
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
  backBtn: { width: 60 },
  backBtnText: { color: theme.accentBlue, fontSize: 14, fontFamily: 'DMSans_500Medium' },
  headerTitle: { fontSize: 20, color: theme.textPrimary, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1 },
  saveBtn: { backgroundColor: theme.accentGreen, borderRadius: 6, paddingHorizontal: 16, paddingVertical: 6 },
  saveBtnText: { color: theme.bgPrimary, fontSize: 14, fontFamily: 'DMSans_700Bold' },
  content: { padding: 16, paddingBottom: 80 },
  recipeNameInput: { backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 10, color: theme.textPrimary, padding: 14, fontSize: 18, fontFamily: 'DMSans_600SemiBold', marginBottom: 16 },
  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  searchInput: { backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, color: theme.textPrimary, padding: 12, fontSize: 14, fontFamily: 'DMSans_400Regular' },
  customBtn: { backgroundColor: theme.accentGreenBg, borderWidth: 1, borderColor: theme.accentGreenBorder, borderRadius: 8, paddingHorizontal: 14, justifyContent: 'center' },
  customBtnText: { color: theme.accentGreen, fontSize: 22, fontFamily: 'DMSans_400Regular' },
  section: { marginBottom: 20 },
  sectionLabel: { fontSize: 9, letterSpacing: 3, color: theme.textMuted, textTransform: 'uppercase', fontFamily: 'DMSans_500Medium', marginBottom: 10 },
  emptyText: { fontSize: 13, color: theme.textDim, fontFamily: 'DMSans_400Regular', fontStyle: 'italic' },
  ingredientRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.bgCard, borderWidth: 1, borderColor: theme.borderCard, borderRadius: 8, padding: 12, marginBottom: 8 },
  ingredientLeft: { flex: 1, marginRight: 8 },
  ingredientName: { fontSize: 14, color: theme.textPrimary, fontFamily: 'DMSans_600SemiBold', marginBottom: 2 },
  ingredientMeta: { fontSize: 11, color: theme.textMuted, fontFamily: 'DMSans_400Regular' },
  removeBtn: { fontSize: 20, color: theme.textDim, padding: 4 },
  totalsCard: { backgroundColor: theme.bgCard, borderWidth: 1, borderColor: theme.borderCard, borderRadius: 10, padding: 16, marginBottom: 20 },
  macroRow: { flexDirection: 'row', justifyContent: 'space-between' },
  macroStat: { alignItems: 'center', flex: 1 },
  macroVal: { fontSize: 22, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1 },
  macroLabel: { fontSize: 10, color: theme.textMuted, fontFamily: 'DMSans_400Regular', marginTop: 2 },
  weightRow: { flexDirection: 'row', gap: 8 },
  unitPickerBtn: { backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center' },
  unitPickerBtnText: { color: theme.accentBlue, fontSize: 14, fontFamily: 'DMSans_600SemiBold' },
  perServingCard: { backgroundColor: theme.accentGreenBg, borderWidth: 1, borderColor: theme.accentGreenBorder, borderRadius: 10, padding: 14, marginTop: 8 },
  perServingTitle: { fontSize: 9, letterSpacing: 3, color: theme.accentGreen, textTransform: 'uppercase', fontFamily: 'DMSans_500Medium', marginBottom: 10 },
  modalOverlay: { flex: 1, backgroundColor: theme.overlayBg, justifyContent: 'flex-end' },
  modal: { backgroundColor: theme.bgCard, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 24, borderWidth: 1, borderColor: theme.borderCard },
  modalTitle: { fontSize: 18, color: theme.textPrimary, fontFamily: 'DMSans_600SemiBold', marginBottom: 4 },
  servingRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  unitPickerOption: { padding: 14, borderBottomWidth: 1, borderBottomColor: theme.borderSubtle },
  unitPickerOptionActive: { backgroundColor: theme.accentBlueBg },
  unitPickerOptionText: { fontSize: 16, color: theme.textMuted, fontFamily: 'DMSans_500Medium' },
});