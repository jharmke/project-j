import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import { useCallback, useRef, useEffect, useState } from 'react';
import { Alert, Animated, Dimensions, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CustomFoodCreator from '../components/CustomFoodCreator';
import { useToast } from '../components/Toast';
import { saveToFirebase } from '../firebaseConfig';
import { storageSet } from '../utils/storage';
import { useTheme } from '../theme';
import { useTutorial } from '../context/TutorialContext';
import { useTutorialTarget } from '../hooks/useTutorialTarget';

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
  polyunsaturatedFat?: number;
  monounsaturatedFat?: number;
  addedSugars?: number;
  transFat?: number;
  vitaminA?: number;
  vitaminC?: number;
  vitaminD?: number;
  vitaminE?: number;
  vitaminK?: number;
  vitaminB6?: number;
  folate?: number;
  vitaminB12?: number;
  biotin?: number;
  magnesium?: number;
  zinc?: number;
  copper?: number;
  caffeine?: number;
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
  totalPolyFat?: number;
  totalMonoFat?: number;
  totalAddedSugars?: number;
  totalTransFat?: number;
  totalVitaminA?: number;
  totalVitaminC?: number;
  totalVitaminD?: number;
  totalVitaminE?: number;
  totalVitaminK?: number;
  totalVitaminB6?: number;
  totalFolate?: number;
  totalVitaminB12?: number;
  totalBiotin?: number;
  totalMagnesium?: number;
  totalZinc?: number;
  totalCopper?: number;
  totalCaffeine?: number;
  createdAt: number;
  defaultToWeight?: boolean;
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
  const { activeState, registerTutorialAction, unregisterTutorialAction, registerScrollView, unregisterScrollView } = useTutorial();
  const isTutorialMode = activeState?.tutorial.id === 'recipes';
  const { recipeId } = useLocalSearchParams<{ recipeId: string }>();

  const [recipeName, setRecipeName] = useState('');
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [totalWeight, setTotalWeight] = useState('');
  const [totalWeightUnit, setTotalWeightUnit] = useState('g');
  const [servingCount, setServingCount] = useState('');
  const [servingName, setServingName] = useState('');
  const [defaultToWeight, setDefaultToWeight] = useState(false);
  const [showCustomFoodModal, setShowCustomFoodModal] = useState(false);
  const [showWeightUnitDropdown, setShowWeightUnitDropdown] = useState(false);
  const [unitBtnPos, setUnitBtnPos] = useState<{ top: number; right: number } | null>(null);
  const weightUnitAnim = useRef(new Animated.Value(0)).current;
  const unitBtnRef = useRef<View>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const tutorialStateRef = useRef<any>({});

  // Tutorial spotlight refs
  const nameInputRef = useTutorialTarget('recipe_name_input');
  const addRowRef = useTutorialTarget('recipe_add_ingredient_row');
  const ingredientsCardRef = useTutorialTarget('recipe_ingredients_card');
  const ingredientRowRef = useTutorialTarget('recipe_ingredient_row');
  const totalsCardRef = useTutorialTarget('recipe_totals_card');
  const servingsCardRef = useTutorialTarget('recipe_servings_card');
  const saveBtnRef = useTutorialTarget('recipe_save_btn');

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

  // Inject demo ingredients when the recipes tutorial is active
  useEffect(() => {
    if (isTutorialMode && !recipeId) {
      setRecipeName('Chicken Bowl');
      setServingCount('4');
      setIngredients([
        { id: 'demo_1', name: 'Chicken Breast', cal: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, sugar: 0, sodium: 74, cholesterol: 85, saturatedFat: 1, amount: 100, unit: 'g' },
        { id: 'demo_2', name: 'Brown Rice', cal: 216, protein: 4, carbs: 45, fat: 1.8, fiber: 3.5, sugar: 0, sodium: 10, cholesterol: 0, saturatedFat: 0, amount: 100, unit: 'g' },
        { id: 'demo_3', name: 'Olive Oil', cal: 119, protein: 0, carbs: 0, fat: 13.5, fiber: 0, sugar: 0, sodium: 0, cholesterol: 0, saturatedFat: 1.9, amount: 14, unit: 'g' },
      ]);
    }
  }, [isTutorialMode]);

  // Keep tutorialStateRef current so action callbacks always read latest values
  useEffect(() => {
    tutorialStateRef.current = {
      recipeName, ingredients, totalWeight, totalWeightUnit, servings, servingName,
      totalCal, totalProtein, totalCarbs, totalFat, totalFiber, totalSugar,
      totalSodium, totalCholesterol, totalSaturatedFat,
    };
  });

  // Register scroll view + tutorial actions on mount
  useEffect(() => {
    registerScrollView('recipe_builder_scroll', scrollViewRef);
    registerTutorialAction('saveTutorialRecipe', async () => {
      const s = tutorialStateRef.current;
      const tutorialRecipe = {
        id: 'tutorial_recipe_temp',
        name: s.recipeName?.trim() || 'Demo Chicken Bowl',
        ingredients: s.ingredients || [],
        totalWeight: parseFloat(s.totalWeight) || 0,
        totalWeightUnit: s.totalWeightUnit || 'g',
        servingCount: s.servings || 4,
        servingName: s.servingName || 'serving',
        totalCal: s.totalCal || 0,
        totalProtein: s.totalProtein || 0,
        totalCarbs: s.totalCarbs || 0,
        totalFat: s.totalFat || 0,
        totalFiber: s.totalFiber || 0,
        totalSugar: s.totalSugar || 0,
        totalSodium: s.totalSodium || 0,
        totalCholesterol: s.totalCholesterol || 0,
        totalSaturatedFat: s.totalSaturatedFat || 0,
        createdAt: Date.now(),
        tutorialRecipe: true,
      };
      try {
        const saved = await AsyncStorage.getItem('pj_recipes');
        const existing = saved ? JSON.parse(saved) : [];
        const cleaned = existing.filter((r: any) => !r.tutorialRecipe);
        await storageSet('pj_recipes', JSON.stringify([...cleaned, tutorialRecipe]));
      } catch {}
      // Pop recipe-builder out of the nav stack so the user never lands back here
      // after the tutorial ends. Step 8's navigateTo fires after this resolves.
      if (router.canGoBack()) router.back();
    });
    registerTutorialAction('closeRecipeTutorial', async () => {
      if (router.canGoBack()) router.back();
    });
    return () => {
      unregisterScrollView('recipe_builder_scroll');
      unregisterTutorialAction('saveTutorialRecipe');
      unregisterTutorialAction('closeRecipeTutorial');
    };
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
          setServingCount(recipe.servingCount === 0 ? '' : recipe.servingCount.toString());
          setServingName(recipe.servingName);
          setDefaultToWeight(recipe.defaultToWeight || false);
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
      ...(food.polyunsaturatedFat  ? { polyunsaturatedFat:  food.polyunsaturatedFat  } : {}),
      ...(food.monounsaturatedFat  ? { monounsaturatedFat:  food.monounsaturatedFat  } : {}),
      ...(food.addedSugars         ? { addedSugars:         food.addedSugars         } : {}),
      ...(food.transFat            ? { transFat:            food.transFat            } : {}),
      ...(food.vitaminA            ? { vitaminA:            food.vitaminA            } : {}),
      ...(food.vitaminC            ? { vitaminC:            food.vitaminC            } : {}),
      ...(food.vitaminD            ? { vitaminD:            food.vitaminD            } : {}),
      ...(food.vitaminE            ? { vitaminE:            food.vitaminE            } : {}),
      ...(food.vitaminK            ? { vitaminK:            food.vitaminK            } : {}),
      ...(food.vitaminB6           ? { vitaminB6:           food.vitaminB6           } : {}),
      ...(food.folate              ? { folate:              food.folate              } : {}),
      ...(food.vitaminB12          ? { vitaminB12:          food.vitaminB12          } : {}),
      ...(food.biotin              ? { biotin:              food.biotin              } : {}),
      ...(food.magnesium           ? { magnesium:           food.magnesium           } : {}),
      ...(food.zinc                ? { zinc:                food.zinc                } : {}),
      ...(food.copper              ? { copper:              food.copper              } : {}),
      ...(food.caffeine            ? { caffeine:            food.caffeine            } : {}),
      amount: food.servingSize || 100,
      unit: food.servingUnit || 'g',
    };
    setIngredients(prev => [...prev, ingredient]);
  };

  const removeIngredient = (id: string) => {
    const ing = ingredients.find(i => i.id === id);
    Alert.alert(
      'Remove Ingredient',
      `Remove ${ing?.name ?? 'this ingredient'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => {
          triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
          setIngredients(prev => prev.filter(i => i.id !== id));
        }},
      ]
    );
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
  const totalPolyFat    = Math.round(ingredients.reduce((s, i) => s + (i.polyunsaturatedFat || 0), 0) * 10) / 10;
  const totalMonoFat    = Math.round(ingredients.reduce((s, i) => s + (i.monounsaturatedFat || 0), 0) * 10) / 10;
  const totalAddedSugars = Math.round(ingredients.reduce((s, i) => s + (i.addedSugars || 0), 0) * 10) / 10;
  const totalTransFat   = Math.round(ingredients.reduce((s, i) => s + (i.transFat || 0), 0) * 10) / 10;
  const totalVitaminA   = Math.round(ingredients.reduce((s, i) => s + (i.vitaminA || 0), 0));
  const totalVitaminC   = Math.round(ingredients.reduce((s, i) => s + (i.vitaminC || 0), 0) * 10) / 10;
  const totalVitaminD   = Math.round(ingredients.reduce((s, i) => s + (i.vitaminD || 0), 0) * 10) / 10;
  const totalVitaminE   = Math.round(ingredients.reduce((s, i) => s + (i.vitaminE || 0), 0) * 10) / 10;
  const totalVitaminK   = Math.round(ingredients.reduce((s, i) => s + (i.vitaminK || 0), 0));
  const totalVitaminB6  = Math.round(ingredients.reduce((s, i) => s + (i.vitaminB6 || 0), 0) * 10) / 10;
  const totalFolate     = Math.round(ingredients.reduce((s, i) => s + (i.folate || 0), 0));
  const totalVitaminB12 = Math.round(ingredients.reduce((s, i) => s + (i.vitaminB12 || 0), 0) * 10) / 10;
  const totalBiotin     = Math.round(ingredients.reduce((s, i) => s + (i.biotin || 0), 0));
  const totalMagnesium  = Math.round(ingredients.reduce((s, i) => s + (i.magnesium || 0), 0));
  const totalZinc       = Math.round(ingredients.reduce((s, i) => s + (i.zinc || 0), 0) * 10) / 10;
  const totalCopper     = Math.round(ingredients.reduce((s, i) => s + (i.copper || 0), 0) * 10) / 10;
  const totalCaffeine   = Math.round(ingredients.reduce((s, i) => s + (i.caffeine || 0), 0));
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

  // Shared extended-nutrition grid: shows every extended nutrient the recipe actually carries
  // (wraps), not a fixed 5. div=1 for whole-batch totals, div=servings for per-serving.
  const renderExtendedGrid = (div: number) => {
    const f = (v: number) => Math.round((v || 0) / div * 10) / 10;
    const exts = [
      { val: f(totalFiber), unit: 'g', label: 'Fiber' },
      { val: f(totalSugar), unit: 'g', label: 'Sugar' },
      { val: f(totalAddedSugars), unit: 'g', label: 'Added Sug.' },
      { val: f(totalSodium), unit: 'mg', label: 'Sodium' },
      { val: f(totalCholesterol), unit: 'mg', label: 'Chol.' },
      { val: f(totalSaturatedFat), unit: 'g', label: 'Sat. Fat' },
      { val: f(totalPolyFat), unit: 'g', label: 'Poly Fat' },
      { val: f(totalMonoFat), unit: 'g', label: 'Mono Fat' },
      { val: f(totalTransFat), unit: 'g', label: 'Trans Fat' },
      { val: f(totalVitaminA), unit: 'mcg', label: 'Vit A' },
      { val: f(totalVitaminC), unit: 'mg', label: 'Vit C' },
      { val: f(totalVitaminD), unit: 'mcg', label: 'Vit D' },
      { val: f(totalVitaminE), unit: 'mg', label: 'Vit E' },
      { val: f(totalVitaminK), unit: 'mcg', label: 'Vit K' },
      { val: f(totalVitaminB6), unit: 'mg', label: 'B6' },
      { val: f(totalFolate), unit: 'mcg', label: 'Folate' },
      { val: f(totalVitaminB12), unit: 'mcg', label: 'B12' },
      { val: f(totalBiotin), unit: 'mcg', label: 'Biotin' },
      { val: f(totalMagnesium), unit: 'mg', label: 'Magnesium' },
      { val: f(totalZinc), unit: 'mg', label: 'Zinc' },
      { val: f(totalCopper), unit: 'mg', label: 'Copper' },
      { val: f(totalCaffeine), unit: 'mg', label: 'Caffeine' },
    ].filter(e => e.val > 0);
    if (exts.length === 0) return null;
    return (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, paddingTop: 12, borderTopWidth: 0.5, borderTopColor: theme.borderSubtle }}>
        {exts.map(e => (
          <View key={e.label} style={{ width: '25%', alignItems: 'center', marginBottom: 12 }}>
            <Text style={styles.extVal}>{e.val}{e.unit}</Text>
            <Text style={[styles.extLabel, { textAlign: 'center' }]}>{e.label}</Text>
          </View>
        ))}
      </View>
    );
  };

  const canSave = recipeName.trim().length > 0 && ingredients.length > 0;

  const saveRecipe = async () => {
    if (!canSave) return;
    if (isTutorialMode) return; // blocked in tutorial -- saveTutorialRecipe action handles it
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const recipe: Recipe = {
        id: recipeId || makeId(),
        name: recipeName.trim(),
        ingredients,
        totalWeight: parseFloat(totalWeight) || 0,
        totalWeightUnit,
        servingCount: parseInt(servingCount) || 0,
        servingName: servingName.trim() || 'serving',
        totalCal,
        totalProtein,
        totalCarbs,
        totalFat,
        totalFiber,
        totalSugar,
        totalSodium,
        totalCholesterol,
        totalSaturatedFat,
        totalPolyFat,
        totalMonoFat,
        totalAddedSugars,
        totalTransFat,
        totalVitaminA,
        totalVitaminC,
        totalVitaminD,
        totalVitaminE,
        totalVitaminK,
        totalVitaminB6,
        totalFolate,
        totalVitaminB12,
        totalBiotin,
        totalMagnesium,
        totalZinc,
        totalCopper,
        totalCaffeine,
        createdAt: Date.now(),
        defaultToWeight,
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
        <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); router.back(); }} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{recipeId ? 'Edit Recipe' : 'New Recipe'}</Text>
        <View ref={saveBtnRef} collapsable={false}>
          <TouchableOpacity
            onPress={saveRecipe}
            disabled={!canSave}
            style={[styles.saveBtn, !canSave && { opacity: 0.35 }]}>
            <Text style={styles.saveBtnText}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.content}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets>

        {/* Recipe Name */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Recipe Name</Text>
          <View ref={nameInputRef} collapsable={false}>
            <TextInput
              style={styles.recipeNameInput}
              placeholder="e.g. Chicken Stir Fry"
              placeholderTextColor={theme.textDim}
              value={recipeName}
              onChangeText={setRecipeName}
            />
          </View>
        </View>

        {/* Add Ingredient buttons */}
        <View ref={addRowRef} style={styles.addRow}>
          <TouchableOpacity
            style={styles.addIngredientBtn}
            onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); router.push({ pathname: '/add-food', params: { meal: 'recipe', date: 'recipe', recipeMode: 'true' } }); }}>
            <Ionicons name="search" size={16} color={theme.accentBlue} />
            <Text style={styles.addIngredientText}>Search Food</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addCustomBtn} onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setShowCustomFoodModal(true); }}>
            <Ionicons name="add" size={16} color={theme.accentBlue} />
            <Text style={styles.addCustomText}>Create</Text>
          </TouchableOpacity>
        </View>

        {/* Ingredients */}
        <View ref={ingredientsCardRef} style={styles.card}>
          <Text style={styles.cardLabel}>Ingredients ({ingredients.length})</Text>
          {ingredients.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="restaurant-outline" size={28} color={theme.textDim} />
              <Text style={styles.emptyTitle}>No ingredients yet</Text>
              <Text style={styles.emptySubtitle}>Search for a food or create a custom one above</Text>
            </View>
          ) : (
            ingredients.map((ing, idx) => (
              <View key={ing.id} ref={idx === 0 ? ingredientRowRef : null} style={[styles.ingredientRow, idx < ingredients.length - 1 && styles.ingredientBorder]}>
                <View style={styles.ingredientLeft}>
                  <Text style={styles.ingredientName}>{ing.name} ({ing.amount}{ing.unit})</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: theme.macroProtein }} />
                      <Text style={styles.ingMacro}>{Number(ing.protein).toFixed(1)}g</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: theme.macroCarbs }} />
                      <Text style={styles.ingMacro}>{Number(ing.carbs).toFixed(1)}g</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: theme.macroFat }} />
                      <Text style={styles.ingMacro}>{Number(ing.fat).toFixed(1)}g</Text>
                    </View>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end', justifyContent: 'flex-start', marginRight: 12 }}>
                  <Text style={{ fontSize: 18, color: theme.accentGreen, fontFamily: 'BebasNeue_400Regular' }}>{ing.cal}</Text>
                  <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: 'DMSans_400Regular', letterSpacing: 1 }}>kcal</Text>
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
          <View ref={totalsCardRef} style={styles.card}>
            <Text style={styles.cardLabel}>Total Nutrition</Text>
            <View style={styles.macroRow}>
              <View style={styles.macroStat}>
                <Text style={[styles.macroVal, { color: theme.textSecondary }]}>{totalCal}</Text>
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
            {renderExtendedGrid(1)}
          </View>
        )}

        {/* Servings */}
        <View ref={servingsCardRef} style={styles.card}>
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

          {ingredients.length > 0 && servingCount.trim() !== '' && servings > 0 && (
            <View style={styles.perServingCard}>
              <Text style={[styles.cardLabel, { color: theme.accentBlue, marginBottom: 12 }]}>Per {servingName.trim() || 'serving'}</Text>
              <View style={styles.macroRow}>
                <View style={styles.macroStat}>
                  <Text style={[styles.macroVal, { color: theme.textSecondary }]}>{calPerServing}</Text>
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
              {renderExtendedGrid(servings)}
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
                onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); showWeightUnitDropdown ? closeWeightUnitDropdown() : openWeightUnitDropdown(); }}>
                <Text style={styles.unitPickerBtnText}>{totalWeightUnit}</Text>
                <Ionicons name={showWeightUnitDropdown ? 'chevron-up' : 'chevron-down'} size={12} color={theme.accentBlue} />
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity style={styles.defaultWeightToggleRow} onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setDefaultToWeight(v => !v); }} activeOpacity={0.7}>
            <View style={[styles.defaultWeightCheckbox, defaultToWeight && styles.defaultWeightCheckboxActive]}>
              {defaultToWeight && <Ionicons name="checkmark" size={12} color={theme.bgPrimary} />}
            </View>
            <Text style={styles.defaultWeightLabel}>Log by weight by default</Text>
          </TouchableOpacity>
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
                onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setTotalWeightUnit(u); closeWeightUnitDropdown(); }}>
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
  ingredientRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 12 },
  ingredientBorder: { borderBottomWidth: 1, borderBottomColor: theme.borderSubtle },
  ingredientLeft: { flex: 1, marginRight: 12 },
  ingredientName: { fontSize: 14, color: theme.textSecondary, fontFamily: 'DMSans_600SemiBold' },
  ingMacro: { fontSize: 11, color: theme.textMuted, fontFamily: 'DMSans_400Regular' },
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
  defaultWeightToggleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  defaultWeightCheckbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 1, borderColor: theme.borderInput, backgroundColor: theme.bgInput, alignItems: 'center', justifyContent: 'center' },
  defaultWeightCheckboxActive: { backgroundColor: theme.accentBlue, borderColor: theme.accentBlue },
  defaultWeightLabel: { fontSize: 13, color: theme.textSecondary, fontFamily: 'DMSans_400Regular' },
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
