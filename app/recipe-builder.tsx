import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useCallback, useRef, useEffect, useState } from 'react';
import { Animated, Dimensions, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CustomFoodCreator from '../components/CustomFoodCreator';
import { useToast } from '../components/Toast';
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
  fiber?: number;
  sugar?: number;
  sodium?: number;
  cholesterol?: number;
  saturatedFat?: number;
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
  totalFiber?: number;
  totalSugar?: number;
  totalSodium?: number;
  totalCholesterol?: number;
  totalSaturatedFat?: number;
  createdAt: number;
}

const makeId = () => Math.random().toString(36).substr(2, 9);
const WEIGHT_UNITS = ['g', 'oz', 'lbs', 'ml', 'cups'];
const SCREEN_W = Dimensions.get('window').width;

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
  const { showToast } = useToast();
  const { recipeId } = useLocalSearchParams<{ recipeId: string }>();

  const [recipeName, setRecipeName] = useState('');
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [totalWeight, setTotalWeight] = useState('');
  const [totalWeightUnit, setTotalWeightUnit] = useState('g');
  const [servingCount, setServingCount] = useState('1');
  const [servingName, setServingName] = useState('serving');
  const [showCustomFoodModal, setShowCustomFoodModal] = useState(false);
  const [showWeightUnitDropdown, setShowWeightUnitDropdown] = useState(false);
  const [unitBtnPos, setUnitBtnPos] = useState<{ top: number; right: number } | null>(null);
  const weightUnitAnim = useRef(new Animated.Value(0)).current;
  const unitBtnRef = useRef<View>(null);

  const openWeightUnitDropdown = () => {
    weightUnitAnim.setValue(0);
    unitBtnRef.current?.measureInWindow((x, y, width, height) => {
      setUnitBtnPos({ top: y + height + 4, right: SCREEN_W - x - width });
      setShowWeightUnitDropdown(true);
      Animated.timing(weightUnitAnim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    });
  };
  const closeWeightUnitDropdown = () => {
    Animated.timing(weightUnitAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      setShowWeightUnitDropdown(false);
      setUnitBtnPos(null);
    });
  };

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
      fiber: food.fiber || 0,
      sugar: food.sugar || 0,
      sodium: food.sodium || 0,
      cholesterol: food.cholesterol || 0,
      saturatedFat: food.saturatedFat || 0,
      amount: food.servingSize || 100,
      unit: food.servingUnit || 'g',
    };
    setIngredients(prev => [...prev, ingredient]);
  };

  const removeIngredient = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIngredients(prev => prev.filter(i => i.id !== id));
  };

  const totalCal = ingredients.reduce((s, i) => s + i.cal, 0);
  const totalProtein = Math.round(ingredients.reduce((s, i) => s + i.protein, 0) * 10) / 10;
  const totalCarbs = Math.round(ingredients.reduce((s, i) => s + i.carbs, 0) * 10) / 10;
  const totalFat = Math.round(ingredients.reduce((s, i) => s + i.fat, 0) * 10) / 10;
  const totalFiber = Math.round(ingredients.reduce((s, i) => s + (i.fiber || 0), 0) * 10) / 10;
  const totalSugar = Math.round(ingredients.reduce((s, i) => s + (i.sugar || 0), 0) * 10) / 10;
  const totalSodium = Math.round(ingredients.reduce((s, i) => s + (i.sodium || 0), 0));
  const totalCholesterol = Math.round(ingredients.reduce((s, i) => s + (i.cholesterol || 0), 0));
  const totalSaturatedFat = Math.round(ingredients.reduce((s, i) => s + (i.saturatedFat || 0), 0) * 10) / 10;
  const hasExtended = ingredients.some(i => (i.fiber || 0) + (i.sugar || 0) + (i.sodium || 0) + (i.cholesterol || 0) + (i.saturatedFat || 0) > 0);

  const servings = parseInt(servingCount) || 1;
  const calPerServing = Math.round(totalCal / servings);
  const proteinPerServing = Math.round(totalProtein / servings * 10) / 10;
  const carbsPerServing = Math.round(totalCarbs / servings * 10) / 10;
  const fatPerServing = Math.round(totalFat / servings * 10) / 10;
  const fiberPerServing = Math.round(totalFiber / servings * 10) / 10;
  const sugarPerServing = Math.round(totalSugar / servings * 10) / 10;
  const sodiumPerServing = Math.round(totalSodium / servings);
  const cholesterolPerServing = Math.round(totalCholesterol / servings);
  const saturatedFatPerServing = Math.round(totalSaturatedFat / servings * 10) / 10;

  const canSave = recipeName.trim().length > 0 && ingredients.length > 0;

  const saveRecipe = async () => {
    if (!canSave) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const recipe: Recipe = {
        id: recipeId || makeId(),
        name: recipeName.trim(),
        ingredients,
        totalWeight: parseFloat(totalWeight) || 0,
        totalWeightUnit,
        servingCount: servings,
        servingName,
        totalCal,
        totalProtein,
        totalCarbs,
        totalFat,
        totalFiber,
        totalSugar,
        totalSodium,
        totalCholesterol,
        totalSaturatedFat,
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
      showToast(recipeId ? 'Recipe updated' : 'Recipe saved', recipeName.trim(), 'success');
      router.back();
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
        <TouchableOpacity
          onPress={saveRecipe}
          disabled={!canSave}
          style={[styles.saveBtn, !canSave && { opacity: 0.35 }]}>
          <Text style={styles.saveBtnText}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets>

        {/* Recipe Name */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Recipe Name</Text>
          <TextInput
            style={styles.recipeNameInput}
            placeholder="e.g. Chicken Stir Fry"
            placeholderTextColor={theme.textDim}
            value={recipeName}
            onChangeText={setRecipeName}
          />
        </View>

        {/* Add Ingredient buttons */}
        <View style={styles.addRow}>
          <TouchableOpacity
            style={styles.addIngredientBtn}
            onPress={() => router.push({ pathname: '/add-food', params: { meal: 'recipe', date: 'recipe', recipeMode: 'true' } })}>
            <Ionicons name="search" size={16} color={theme.accentBlue} />
            <Text style={styles.addIngredientText}>Search Food</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addCustomBtn} onPress={() => setShowCustomFoodModal(true)}>
            <Ionicons name="add" size={16} color={theme.accentBlue} />
            <Text style={styles.addCustomText}>Create</Text>
          </TouchableOpacity>
        </View>

        {/* Ingredients */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Ingredients ({ingredients.length})</Text>
          {ingredients.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="restaurant-outline" size={28} color={theme.textDim} />
              <Text style={styles.emptyTitle}>No ingredients yet</Text>
              <Text style={styles.emptySubtitle}>Search for a food or create a custom one above</Text>
            </View>
          ) : (
            ingredients.map((ing, idx) => (
              <View key={ing.id} style={[styles.ingredientRow, idx < ingredients.length - 1 && styles.ingredientBorder]}>
                <View style={styles.ingredientLeft}>
                  <Text style={styles.ingredientName} numberOfLines={1}>{ing.name}</Text>
                  <View style={styles.ingredientMeta}>
                    <Text style={styles.ingAmount} numberOfLines={1}>{ing.amount}{ing.unit}</Text>
                    <Text style={styles.ingDot}>·</Text>
                    <Text style={styles.ingCal}>{ing.cal} kcal</Text>
                    <Text style={styles.ingDot}>·</Text>
                    <Text style={[styles.ingMacro, { color: theme.macroProtein }]}>P{ing.protein}g</Text>
                    <Text style={[styles.ingMacro, { color: theme.macroCarbs }]}>C{ing.carbs}g</Text>
                    <Text style={[styles.ingMacro, { color: theme.macroFat }]}>F{ing.fat}g</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => removeIngredient(ing.id)} style={styles.removeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="trash-outline" size={16} color={theme.accentRed || '#cc3333'} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* Running Totals */}
        {ingredients.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Total Nutrition</Text>
            <View style={styles.macroRow}>
              <View style={styles.macroStat}>
                <Text style={[styles.macroVal, { color: theme.textPrimary }]}>{totalCal}</Text>
                <Text style={styles.macroLabel}>kcal</Text>
              </View>
              <View style={styles.macroDivider} />
              <View style={styles.macroStat}>
                <Text style={[styles.macroVal, { color: theme.macroProtein }]}>{totalProtein}<Text style={styles.macroUnit}>g</Text></Text>
                <Text style={styles.macroLabel}>Protein</Text>
              </View>
              <View style={styles.macroDivider} />
              <View style={styles.macroStat}>
                <Text style={[styles.macroVal, { color: theme.macroCarbs }]}>{totalCarbs}<Text style={styles.macroUnit}>g</Text></Text>
                <Text style={styles.macroLabel}>Carbs</Text>
              </View>
              <View style={styles.macroDivider} />
              <View style={styles.macroStat}>
                <Text style={[styles.macroVal, { color: theme.macroFat }]}>{totalFat}<Text style={styles.macroUnit}>g</Text></Text>
                <Text style={styles.macroLabel}>Fat</Text>
              </View>
            </View>
            {hasExtended && (
              <View style={styles.extendedRow}>
                <View style={styles.extStat}>
                  <Text style={styles.extVal}>{totalFiber}g</Text>
                  <Text style={styles.extLabel}>Fiber</Text>
                </View>
                <View style={styles.extStat}>
                  <Text style={styles.extVal}>{totalSugar}g</Text>
                  <Text style={styles.extLabel}>Sugar</Text>
                </View>
                <View style={styles.extStat}>
                  <Text style={styles.extVal}>{totalSodium}mg</Text>
                  <Text style={styles.extLabel}>Sodium</Text>
                </View>
                <View style={styles.extStat}>
                  <Text style={styles.extVal}>{totalCholesterol}mg</Text>
                  <Text style={styles.extLabel}>Chol.</Text>
                </View>
                <View style={styles.extStat}>
                  <Text style={styles.extVal}>{totalSaturatedFat}g</Text>
                  <Text style={styles.extLabel}>Sat. Fat</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Servings */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Servings</Text>
          <View style={styles.servingRow}>
            <View style={{ flex: 0.35 }}>
              <Text style={styles.fieldLabel}>Count</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="1"
                placeholderTextColor={theme.textDim}
                keyboardType="number-pad"
                value={servingCount}
                onChangeText={setServingCount}
              />
            </View>
            <View style={{ flex: 0.65 }}>
              <Text style={styles.fieldLabel}>Unit name</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="serving, slice, scoop..."
                placeholderTextColor={theme.textDim}
                value={servingName}
                onChangeText={setServingName}
              />
            </View>
          </View>

          {ingredients.length > 0 && servings > 0 && (
            <View style={styles.perServingCard}>
              <Text style={[styles.cardLabel, { color: theme.accentBlue, marginBottom: 12 }]}>Per {servingName}</Text>
              <View style={styles.macroRow}>
                <View style={styles.macroStat}>
                  <Text style={[styles.macroVal, { color: theme.textPrimary }]}>{calPerServing}</Text>
                  <Text style={styles.macroLabel}>kcal</Text>
                </View>
                <View style={styles.macroDivider} />
                <View style={styles.macroStat}>
                  <Text style={[styles.macroVal, { color: theme.macroProtein }]}>{proteinPerServing}<Text style={styles.macroUnit}>g</Text></Text>
                  <Text style={styles.macroLabel}>Protein</Text>
                </View>
                <View style={styles.macroDivider} />
                <View style={styles.macroStat}>
                  <Text style={[styles.macroVal, { color: theme.macroCarbs }]}>{carbsPerServing}<Text style={styles.macroUnit}>g</Text></Text>
                  <Text style={styles.macroLabel}>Carbs</Text>
                </View>
                <View style={styles.macroDivider} />
                <View style={styles.macroStat}>
                  <Text style={[styles.macroVal, { color: theme.macroFat }]}>{fatPerServing}<Text style={styles.macroUnit}>g</Text></Text>
                  <Text style={styles.macroLabel}>Fat</Text>
                </View>
              </View>
              {hasExtended && (
                <View style={styles.extendedRow}>
                  <View style={styles.extStat}>
                    <Text style={styles.extVal}>{fiberPerServing}g</Text>
                    <Text style={styles.extLabel}>Fiber</Text>
                  </View>
                  <View style={styles.extStat}>
                    <Text style={styles.extVal}>{sugarPerServing}g</Text>
                    <Text style={styles.extLabel}>Sugar</Text>
                  </View>
                  <View style={styles.extStat}>
                    <Text style={styles.extVal}>{sodiumPerServing}mg</Text>
                    <Text style={styles.extLabel}>Sodium</Text>
                  </View>
                  <View style={styles.extStat}>
                    <Text style={styles.extVal}>{cholesterolPerServing}mg</Text>
                    <Text style={styles.extLabel}>Chol.</Text>
                  </View>
                  <View style={styles.extStat}>
                    <Text style={styles.extVal}>{saturatedFatPerServing}g</Text>
                    <Text style={styles.extLabel}>Sat. Fat</Text>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Total Weight (optional) */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Total Finished Weight <Text style={{ color: theme.textDim, textTransform: 'none', letterSpacing: 0, fontSize: 9 }}>(optional)</Text></Text>
          <View style={styles.weightRow}>
            <TextInput
              style={[styles.fieldInput, { flex: 1 }]}
              placeholder="e.g. 2000"
              placeholderTextColor={theme.textDim}
              keyboardType="decimal-pad"
              value={totalWeight}
              onChangeText={v => filterDecimal(v, setTotalWeight)}
            />
            <View ref={unitBtnRef} collapsable={false}>
              <TouchableOpacity
                style={styles.unitPickerBtn}
                onPress={showWeightUnitDropdown ? closeWeightUnitDropdown : openWeightUnitDropdown}>
                <Text style={styles.unitPickerBtnText}>{totalWeightUnit}</Text>
                <Ionicons name={showWeightUnitDropdown ? 'chevron-up' : 'chevron-down'} size={12} color={theme.accentBlue} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

      </ScrollView>

      {/* Weight unit dropdown -- Modal for reliable click-outside dismiss */}
      {showWeightUnitDropdown && unitBtnPos && (
        <Modal transparent animationType="none" onRequestClose={closeWeightUnitDropdown}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={closeWeightUnitDropdown} />
          <Animated.View style={[styles.unitDropdown, {
            position: 'absolute',
            top: unitBtnPos.top,
            right: unitBtnPos.right,
            opacity: weightUnitAnim,
            transform: [{ translateY: weightUnitAnim.interpolate({ inputRange: [0, 1], outputRange: [-6, 0] }) }],
          }]}>
            {WEIGHT_UNITS.map((u, i) => (
              <TouchableOpacity
                key={u}
                style={[styles.unitDropdownItem, i < WEIGHT_UNITS.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.borderSubtle }]}
                onPress={() => { setTotalWeightUnit(u); closeWeightUnitDropdown(); }}>
                <Text style={[styles.unitDropdownText, totalWeightUnit === u && { color: theme.accentBlue, fontFamily: 'DMSans_600SemiBold' }]}>{u}</Text>
                {totalWeightUnit === u && <Ionicons name="checkmark" size={12} color={theme.accentBlue} />}
              </TouchableOpacity>
            ))}
          </Animated.View>
        </Modal>
      )}

      <CustomFoodCreator
        visible={showCustomFoodModal}
        onClose={() => setShowCustomFoodModal(false)}
        onSaved={handleCustomFoodSaved}
      />

    </View>
  );
}

const useStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bgPrimary },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.borderCard,
  },
  backBtn: { width: 60, paddingVertical: 4 },
  backBtnText: { color: theme.accentBlue, fontSize: 14, fontFamily: 'DMSans_500Medium' },
  headerTitle: { fontSize: 20, color: theme.accentBlueRaw, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1 },
  saveBtn: { backgroundColor: theme.accentGreen, borderRadius: 8, paddingHorizontal: 18, paddingVertical: 8 },
  saveBtnText: { color: theme.bgPrimary, fontSize: 14, fontFamily: 'DMSans_700Bold' },
  content: { padding: 12, paddingBottom: 40, gap: 12 },
  card: {
    backgroundColor: theme.bgCard,
    borderWidth: 0.5,
    borderColor: theme.borderCard,
    borderTopWidth: 1.5,
    borderTopColor: theme.accentBlueRaw,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  cardLabel: {
    fontSize: 9, letterSpacing: 3, color: theme.textMuted,
    textTransform: 'uppercase', fontFamily: 'DMSans_700Bold', marginBottom: 12,
  },
  recipeNameInput: {
    color: theme.textPrimary, fontSize: 16, fontFamily: 'DMSans_600SemiBold',
    backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput,
    borderRadius: 8, padding: 12,
  },
  addRow: { flexDirection: 'row', gap: 8 },
  addIngredientBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder,
    borderRadius: 10, padding: 14,
  },
  addIngredientText: { color: theme.accentBlue, fontSize: 14, fontFamily: 'DMSans_600SemiBold' },
  addCustomBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder,
    borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14,
  },
  addCustomText: { color: theme.accentBlue, fontSize: 14, fontFamily: 'DMSans_600SemiBold' },
  emptyState: { alignItems: 'center', paddingVertical: 20, gap: 6 },
  emptyTitle: { fontSize: 14, color: theme.textSecondary, fontFamily: 'DMSans_600SemiBold' },
  emptySubtitle: { fontSize: 12, color: theme.textMuted, fontFamily: 'DMSans_400Regular', textAlign: 'center' },
  ingredientRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  ingredientBorder: { borderBottomWidth: 1, borderBottomColor: theme.borderSubtle },
  ingredientLeft: { flex: 1, marginRight: 12 },
  ingredientName: { fontSize: 14, color: theme.textPrimary, fontFamily: 'DMSans_600SemiBold', marginBottom: 4 },
  ingredientMeta: { flexDirection: 'row', alignItems: 'center' },
  ingAmount: { width: 56, fontSize: 11, color: theme.textSecondary, fontFamily: 'DMSans_500Medium' },
  ingDot: { fontSize: 11, color: theme.textDim, marginHorizontal: 3 },
  ingCal: { width: 60, fontSize: 11, color: theme.textSecondary, fontFamily: 'DMSans_500Medium' },
  ingMacro: { width: 38, fontSize: 11, fontFamily: 'DMSans_500Medium' },
  removeBtn: { padding: 4 },
  macroRow: { flexDirection: 'row', alignItems: 'center' },
  macroStat: { flex: 1, alignItems: 'center' },
  macroVal: { fontSize: 22, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1 },
  macroUnit: { fontSize: 14, fontFamily: 'DMSans_400Regular', letterSpacing: 0 },
  macroLabel: { fontSize: 9, color: theme.textMuted, fontFamily: 'DMSans_400Regular', marginTop: 1, letterSpacing: 1 },
  macroDivider: { width: 1, height: 32, backgroundColor: theme.borderSubtle },
  extendedRow: {
    flexDirection: 'row', marginTop: 12, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: theme.borderSubtle,
  },
  extStat: { flex: 1, alignItems: 'center' },
  extVal: { fontSize: 13, color: theme.textSecondary, fontFamily: 'DMSans_600SemiBold' },
  extLabel: { fontSize: 8, color: theme.textMuted, fontFamily: 'DMSans_400Regular', marginTop: 2, letterSpacing: 0.5, textTransform: 'uppercase' },
  perServingCard: {
    backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder,
    borderRadius: 10, padding: 14, marginTop: 14,
  },
  servingRow: { flexDirection: 'row', gap: 10 },
  fieldLabel: { fontSize: 9, color: theme.textMuted, fontFamily: 'DMSans_700Bold', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 },
  fieldInput: {
    backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput,
    borderRadius: 8, color: theme.textPrimary, padding: 12, fontSize: 14, fontFamily: 'DMSans_400Regular',
  },
  weightRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  unitPickerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder,
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 13,
  },
  unitPickerBtnText: { color: theme.accentBlue, fontSize: 13, fontFamily: 'DMSans_600SemiBold' },
  unitDropdown: {
    backgroundColor: theme.bgSheet, borderWidth: 1, borderColor: theme.borderCard,
    borderTopWidth: 1.5, borderTopColor: theme.accentBlueRaw,
    borderRadius: 10, minWidth: 80,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8,
    elevation: 10,
  },
  unitDropdownItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 12,
  },
  unitDropdownText: { fontSize: 14, color: theme.textSecondary, fontFamily: 'DMSans_500Medium' },
});
