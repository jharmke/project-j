import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useToast } from '../components/Toast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { saveToFirebase } from '../firebaseConfig';
import { storageSet } from '../utils/storage';
import { cancelFoodLogNotification } from '../services/notifications';
import { useTheme } from '../theme';
import { DEFAULT_MEAL_SLOTS, MealSlot, loadMealSlots } from '../utils/mealSlots';
import { ACHIEVEMENTS, checkAndUnlock, loadAchievements, checkMomentumAchievements, checkNutritionAchievements, getCelebTier } from '../achievementData';
import { showAchievementToast } from '../components/AchievementToast';
import { showCelebration } from '../components/CelebrationOverlay';
import { Type, PAGE_TITLE } from '../typography';
import ScreenHeader from '../components/ScreenHeader';
import BackgroundLayers from '../components/BackgroundLayers';
import ButtonShine from '../components/ButtonShine';
import GradientNumber from '../components/GradientNumber';
import { convertUnit, convertibleUnitsFor, normalizeUnitKey, unitLabel } from '../utils/unitConversion';
import UnitPickerButton from '../components/UnitPickerButton';
import PrimaryCTA from '../components/PrimaryCTA';
import ModalHeader from '../components/ModalHeader';

export default function RecipeLogScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { recipeJson, meal, date } = useLocalSearchParams<{ recipeJson: string; meal: string; date: string }>();

  // The route param is a snapshot taken when this screen opened. Editing the recipe in the builder and
  // coming back would otherwise land on those stale numbers and read as a save that didn't take, so the
  // live copy is re-read from storage every time the screen comes back into view.
  const paramRecipe = recipeJson ? JSON.parse(recipeJson) : null;
  const [recipe, setRecipe] = useState<any>(paramRecipe);
  const isWholeBatch = (recipe?.servingCount ?? 1) === 0;
  const [logMode, setLogMode] = useState<'serving' | 'weight'>(
    isWholeBatch || (recipe?.defaultToWeight && recipe?.totalWeight > 0) ? 'weight' : 'serving'
  );
  const [servingAmount, setServingAmount] = useState('1');
  const [weightAmount, setWeightAmount] = useState('');
  // Typing unit for the portion box, defaults to the recipe's own unit. Never persisted onto the recipe.
  const [weightUnit, setWeightUnit] = useState<string>(normalizeUnitKey(paramRecipe?.totalWeightUnit));
  const [showMealPicker, setShowMealPicker] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState(meal || 'ms_lunch');
  const [mealSlots, setMealSlots] = useState<MealSlot[]>(DEFAULT_MEAL_SLOTS);

  useEffect(() => {
    loadMealSlots().then(({ mealSlots: slots }) => setMealSlots(slots));
  }, []);

  const paramRecipeId = paramRecipe?.id;
  const paramRecipeName = paramRecipe?.name;
  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        try {
          const saved = await AsyncStorage.getItem('pj_recipes');
          if (!saved || !active) return;
          const list = JSON.parse(saved);
          if (!Array.isArray(list)) return;
          const fresh = list.find((r: any) => (paramRecipeId ? r.id === paramRecipeId : r.name === paramRecipeName));
          // Not found means it was deleted from another screen -- keep the snapshot rather than
          // blanking the page out from under someone mid-log.
          if (fresh && active) {
            setRecipe(fresh);
            // The recipe may have been re-saved in a different unit while we were away; a typing unit
            // from the old family would silently mean something else, so follow the recipe.
            const freshUnit = normalizeUnitKey(fresh.totalWeightUnit);
            setWeightUnit(prev => (convertUnit(1, prev, freshUnit) === null ? freshUnit : prev));
          }
        } catch {}
      })();
      return () => { active = false; };
    }, [paramRecipeId, paramRecipeName])
  );
  const { showToast } = useToast();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const openMealPicker = () => {
    fadeAnim.setValue(0);
    setShowMealPicker(true);
  };
  const closeMealPicker = () => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 160, useNativeDriver: true }).start(() => {
      setShowMealPicker(false);
    });
  };

  if (!recipe) return null;

  const totalWeight = recipe.totalWeight || 0;
  const servingCount = recipe.servingCount || 0;
  // The unit the recipe itself is defined in. The portion box can be typed in any sibling unit
  // (a batch defined in lb, weighed out at 8 oz) -- the typed amount converts back to the recipe's
  // own unit before it ever touches the math, so the recipe is never redefined by logging it.
  const recipeUnit = normalizeUnitKey(recipe.totalWeightUnit);
  const weightAmountInRecipeUnit = () => {
    const typed = parseFloat(weightAmount);
    if (isNaN(typed)) return NaN;
    if (weightUnit === recipeUnit) return typed;
    return convertUnit(typed, weightUnit, recipeUnit) ?? typed;
  };

  const getMultiplier = () => {
    if (logMode === 'serving' && servingCount > 0) return parseFloat(servingAmount) / servingCount;
    if (!totalWeight) return 0;
    return weightAmountInRecipeUnit() / totalWeight;
  };

  const multiplier = getMultiplier() || 0;
  const calories = Math.round(recipe.totalCal * multiplier);
  const protein = Math.round(recipe.totalProtein * multiplier * 10) / 10;
  const carbs = Math.round(recipe.totalCarbs * multiplier * 10) / 10;
  const fat = Math.round(recipe.totalFat * multiplier * 10) / 10;

  const logRecipe = async (mealName: string) => {
    if (!calories) return;
    setShowMealPicker(false);
    try {
      if (date === 'recipe') {
        const makeId = () => Math.random().toString(36).substr(2, 9);
        const ingredient = {
          id: makeId(),
          name: recipe.name,
          cal: calories,
          protein,
          carbs,
          fat,
          fiber: Math.round((recipe.totalFiber || 0) * multiplier * 10) / 10,
          sugar: Math.round((recipe.totalSugar || 0) * multiplier * 10) / 10,
          sodium: Math.round((recipe.totalSodium || 0) * multiplier),
          cholesterol: Math.round((recipe.totalCholesterol || 0) * multiplier),
          saturatedFat: Math.round((recipe.totalSaturatedFat || 0) * multiplier * 10) / 10,
          ...(recipe.totalPolyFat    ? { polyunsaturatedFat: Math.round((recipe.totalPolyFat    || 0) * multiplier * 10) / 10 } : {}),
          ...(recipe.totalMonoFat    ? { monounsaturatedFat: Math.round((recipe.totalMonoFat    || 0) * multiplier * 10) / 10 } : {}),
          ...(recipe.totalAddedSugars ? { addedSugars:       Math.round((recipe.totalAddedSugars || 0) * multiplier * 10) / 10 } : {}),
          ...(recipe.totalTransFat   ? { transFat:           Math.round((recipe.totalTransFat   || 0) * multiplier * 10) / 10 } : {}),
          ...(recipe.totalVitaminA   ? { vitaminA:           Math.round((recipe.totalVitaminA   || 0) * multiplier) } : {}),
          ...(recipe.totalVitaminC   ? { vitaminC:           Math.round((recipe.totalVitaminC   || 0) * multiplier * 10) / 10 } : {}),
          ...(recipe.totalVitaminD   ? { vitaminD:           Math.round((recipe.totalVitaminD   || 0) * multiplier * 10) / 10 } : {}),
          ...(recipe.totalVitaminE   ? { vitaminE:           Math.round((recipe.totalVitaminE   || 0) * multiplier * 10) / 10 } : {}),
          ...(recipe.totalVitaminK   ? { vitaminK:           Math.round((recipe.totalVitaminK   || 0) * multiplier) } : {}),
          ...(recipe.totalVitaminB6  ? { vitaminB6:          Math.round((recipe.totalVitaminB6  || 0) * multiplier * 10) / 10 } : {}),
          ...(recipe.totalFolate     ? { folate:             Math.round((recipe.totalFolate     || 0) * multiplier) } : {}),
          ...(recipe.totalVitaminB12 ? { vitaminB12:         Math.round((recipe.totalVitaminB12 || 0) * multiplier * 10) / 10 } : {}),
          ...(recipe.totalBiotin     ? { biotin:             Math.round((recipe.totalBiotin     || 0) * multiplier) } : {}),
          ...(recipe.totalThiamin    ? { thiamin:            Math.round((recipe.totalThiamin    || 0) * multiplier * 10) / 10 } : {}),
          ...(recipe.totalRiboflavin ? { riboflavin:         Math.round((recipe.totalRiboflavin || 0) * multiplier * 10) / 10 } : {}),
          ...(recipe.totalNiacin     ? { niacin:             Math.round((recipe.totalNiacin     || 0) * multiplier * 10) / 10 } : {}),
          ...(recipe.totalCholine    ? { choline:            Math.round((recipe.totalCholine    || 0) * multiplier * 10) / 10 } : {}),
          ...(recipe.totalMagnesium  ? { magnesium:          Math.round((recipe.totalMagnesium  || 0) * multiplier) } : {}),
          ...(recipe.totalZinc       ? { zinc:               Math.round((recipe.totalZinc       || 0) * multiplier * 10) / 10 } : {}),
          ...(recipe.totalCopper     ? { copper:             Math.round((recipe.totalCopper     || 0) * multiplier * 10) / 10 } : {}),
          ...(recipe.totalCaffeine   ? { caffeine:           Math.round((recipe.totalCaffeine   || 0) * multiplier) } : {}),
          // As an ingredient, the amount is stored in the RECIPE's own unit, whatever it was typed in.
          amount: logMode === 'weight' ? Math.round(weightAmountInRecipeUnit() * 100) / 100 : parseFloat(servingAmount),
          unit: logMode === 'weight' ? recipeUnit : recipe.servingName,
        };
        await AsyncStorage.setItem('pj_pending_ingredient', JSON.stringify(ingredient));
        showToast('Added to recipe', recipe.name, 'success');
        router.back();
        router.back();
        return;
      }
      const saved = await AsyncStorage.getItem(`pj_${date}`);
      const current = saved ? JSON.parse(saved) : {};
      const entries = current.entries || [];
      const label = logMode === 'serving'
        ? `${servingAmount} ${recipe.servingName}`
        : `${weightAmount}${unitLabel(weightUnit)}`;
      // A recipe with a total weight has a gram basis, so Edit Entry shows the amount box with the real
      // portion (in the recipe's weight unit). A serving-count-only recipe has no gram basis, so the
      // entry is flagged servingOnly and Edit Entry hides the amount box (no fake "Amount (g): 100").
      const hasWeight = totalWeight > 0;
      const portionInWeightUnit = hasWeight ? Math.round(multiplier * totalWeight * 10) / 10 : 0;
      const newEntry = {
        name: `${recipe.name} (${label})`,
        cal: calories,
        meal: mealName,
        protein,
        carbs,
        fat,
        isRecipe: true,
        servingOnly: !hasWeight,
        loggedAmount: hasWeight ? portionInWeightUnit : parseFloat(servingAmount),
        loggedUnit: hasWeight ? recipeUnit : recipe.servingName,
        // Logged in a sibling unit: remember what the user actually typed so the meal card reads
        // "8 oz" instead of the recipe-unit number. Same mechanism food entries already use.
        ...(hasWeight && logMode === 'weight' && weightUnit !== recipeUnit
          ? { displayUnit: weightUnit, displayAmount: parseFloat(weightAmount) }
          : {}),
        fiber: Math.round((recipe.totalFiber || 0) * multiplier * 10) / 10,
        sugar: Math.round((recipe.totalSugar || 0) * multiplier * 10) / 10,
        sodium: Math.round((recipe.totalSodium || 0) * multiplier),
        cholesterol: Math.round((recipe.totalCholesterol || 0) * multiplier),
        saturatedFat: Math.round((recipe.totalSaturatedFat || 0) * multiplier * 10) / 10,
        ...(recipe.totalPolyFat     ? { polyunsaturatedFat: Math.round((recipe.totalPolyFat    || 0) * multiplier * 10) / 10 } : {}),
        ...(recipe.totalMonoFat     ? { monounsaturatedFat: Math.round((recipe.totalMonoFat    || 0) * multiplier * 10) / 10 } : {}),
        ...(recipe.totalAddedSugars ? { addedSugars:        Math.round((recipe.totalAddedSugars || 0) * multiplier * 10) / 10 } : {}),
        ...(recipe.totalTransFat    ? { transFat:           Math.round((recipe.totalTransFat   || 0) * multiplier * 10) / 10 } : {}),
        ...(recipe.totalVitaminA    ? { vitaminA:           Math.round((recipe.totalVitaminA   || 0) * multiplier) } : {}),
        ...(recipe.totalVitaminC    ? { vitaminC:           Math.round((recipe.totalVitaminC   || 0) * multiplier * 10) / 10 } : {}),
        ...(recipe.totalVitaminD    ? { vitaminD:           Math.round((recipe.totalVitaminD   || 0) * multiplier * 10) / 10 } : {}),
        ...(recipe.totalVitaminE    ? { vitaminE:           Math.round((recipe.totalVitaminE   || 0) * multiplier * 10) / 10 } : {}),
        ...(recipe.totalVitaminK    ? { vitaminK:           Math.round((recipe.totalVitaminK   || 0) * multiplier) } : {}),
        ...(recipe.totalVitaminB6   ? { vitaminB6:          Math.round((recipe.totalVitaminB6  || 0) * multiplier * 10) / 10 } : {}),
        ...(recipe.totalFolate      ? { folate:             Math.round((recipe.totalFolate     || 0) * multiplier) } : {}),
        ...(recipe.totalVitaminB12  ? { vitaminB12:         Math.round((recipe.totalVitaminB12 || 0) * multiplier * 10) / 10 } : {}),
        ...(recipe.totalBiotin      ? { biotin:             Math.round((recipe.totalBiotin     || 0) * multiplier) } : {}),
        ...(recipe.totalThiamin     ? { thiamin:            Math.round((recipe.totalThiamin    || 0) * multiplier * 10) / 10 } : {}),
        ...(recipe.totalRiboflavin  ? { riboflavin:         Math.round((recipe.totalRiboflavin || 0) * multiplier * 10) / 10 } : {}),
        ...(recipe.totalNiacin      ? { niacin:             Math.round((recipe.totalNiacin     || 0) * multiplier * 10) / 10 } : {}),
        ...(recipe.totalCholine     ? { choline:            Math.round((recipe.totalCholine    || 0) * multiplier * 10) / 10 } : {}),
        ...(recipe.totalMagnesium   ? { magnesium:          Math.round((recipe.totalMagnesium  || 0) * multiplier) } : {}),
        ...(recipe.totalZinc        ? { zinc:               Math.round((recipe.totalZinc       || 0) * multiplier * 10) / 10 } : {}),
        ...(recipe.totalCopper      ? { copper:             Math.round((recipe.totalCopper     || 0) * multiplier * 10) / 10 } : {}),
        ...(recipe.totalCaffeine    ? { caffeine:           Math.round((recipe.totalCaffeine   || 0) * multiplier) } : {}),
        timestamp: Date.now(),
      };
      entries.push(newEntry);
      await storageSet(`pj_${date}`, JSON.stringify({ ...current, entries }));
      await saveToFirebase(date, 'entries', entries);
      cancelFoodLogNotification();
      showToast('Recipe logged', recipe.name, 'success');
      // A recipe log is a food log: fire the same achievement checks food-detail does, forced past
      // the once-per-day gate so a same-day threshold pops now instead of on the next app-open.
      try {
        const store = await loadAchievements();
        const result = await checkAndUnlock('general_first_log', store);
        if (result.newlyUnlocked) {
          const def = ACHIEVEMENTS.find(a => a.id === 'general_first_log');
          if (def) { showAchievementToast(def); showCelebration(getCelebTier(def), def.name, def); }
        }
        const momentumUnlocked = await checkMomentumAchievements(true);
        momentumUnlocked.forEach(def => { showCelebration(getCelebTier(def), def.name, def); showAchievementToast(def); });
        // Not forced (see food-detail): nutrition achievements only count completed days, so a
        // same-day log can never complete one -- gated is correct, avoids random mid-day pops.
        const nutritionUnlocked = await checkNutritionAchievements();
        nutritionUnlocked.forEach(def => { showCelebration(getCelebTier(def), def.name, def); showAchievementToast(def); });
      } catch {}
      router.back();
      router.back();
    } catch (e) {
      console.log('Log error', e);
    }
  };

  // Spoken form for "How many ___?". Covers the app-wide unit keys plus the two legacy spellings
  // ("lbs"/"cups") that recipes saved before the serving-unit redesign still carry on disk.
  const weightUnitWord: Record<string, string> = {
    g: 'grams', kg: 'kilograms', oz: 'ounces', lb: 'pounds', lbs: 'pounds',
    ml: 'milliliters', l: 'liters', cup: 'cups', cups: 'cups',
    tbsp: 'tablespoons', tsp: 'teaspoons', 'fl oz': 'fluid ounces',
  };
  const styles = useStyles(theme);
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <BackgroundLayers />
      <ScreenHeader
        title={recipe.name}
        topInset={false}
        right={
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => router.push({ pathname: '/recipe-builder', params: { recipeId: recipe.id } })}>
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" automaticallyAdjustKeyboardInsets={true}>

        {/* Recipe Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            {isWholeBatch ? 'Whole batch' : `${recipe.servingCount} ${recipe.servingName} total`}
            {totalWeight > 0 ? ` · ${totalWeight}${unitLabel(recipe.totalWeightUnit || 'g')} total weight` : ''}
          </Text>
          <View style={styles.macroRow}>
            <View style={styles.macroStat}>
              <GradientNumber
                value={String(isWholeBatch ? Math.round(recipe.totalCal) : Math.round(recipe.totalCal / servingCount))}
                color={theme.accentGreen} style={styles.macroVal} />
              <Text style={styles.macroLabel}>{isWholeBatch ? 'total cal' : `cal/${recipe.servingName}`}</Text>
            </View>
            <View style={styles.macroStat}>
              <GradientNumber
                value={`${isWholeBatch ? Math.round(recipe.totalProtein * 10) / 10 : Math.round(recipe.totalProtein / servingCount * 10) / 10}g`}
                color={theme.macroProtein} style={styles.macroVal} />
              <Text style={styles.macroLabel}>protein</Text>
            </View>
            <View style={styles.macroStat}>
              <GradientNumber
                value={`${isWholeBatch ? Math.round(recipe.totalCarbs * 10) / 10 : Math.round(recipe.totalCarbs / servingCount * 10) / 10}g`}
                color={theme.macroCarbs} style={styles.macroVal} />
              <Text style={styles.macroLabel}>carbs</Text>
            </View>
            <View style={styles.macroStat}>
              <GradientNumber
                value={`${isWholeBatch ? Math.round(recipe.totalFat * 10) / 10 : Math.round(recipe.totalFat / servingCount * 10) / 10}g`}
                color={theme.macroFat} style={styles.macroVal} />
              <Text style={styles.macroLabel}>fat</Text>
            </View>
          </View>
          {/* Extended nutrition: every nutrient the recipe actually carries, on the same basis
              (whole batch vs per serving) as the macros above. Shows only what's present, so a
              search food that only returned fiber/sugar/sodium shows just those -- honest. */}
          {(() => {
            const div = isWholeBatch ? 1 : (servingCount || 1);
            const g = (v: number) => Math.round((v || 0) / div * 10) / 10;
            const mg = (v: number) => Math.round((v || 0) / div);
            const exts = [
              { val: g(recipe.totalFiber), unit: 'g', label: 'Fiber' },
              { val: g(recipe.totalSugar), unit: 'g', label: 'Sugar' },
              { val: g(recipe.totalAddedSugars), unit: 'g', label: 'Added Sug.' },
              { val: mg(recipe.totalSodium), unit: 'mg', label: 'Sodium' },
              { val: mg(recipe.totalPotassium), unit: 'mg', label: 'Potassium' },
              { val: mg(recipe.totalCholesterol), unit: 'mg', label: 'Chol.' },
              { val: g(recipe.totalSaturatedFat), unit: 'g', label: 'Sat. Fat' },
              { val: g(recipe.totalPolyFat), unit: 'g', label: 'Poly Fat' },
              { val: g(recipe.totalMonoFat), unit: 'g', label: 'Mono Fat' },
              { val: g(recipe.totalTransFat), unit: 'g', label: 'Trans Fat' },
              { val: mg(recipe.totalCalcium), unit: 'mg', label: 'Calcium' },
              { val: g(recipe.totalIron), unit: 'mg', label: 'Iron' },
              { val: mg(recipe.totalVitaminA), unit: 'mcg', label: 'Vit A' },
              { val: g(recipe.totalVitaminC), unit: 'mg', label: 'Vit C' },
              { val: g(recipe.totalVitaminD), unit: 'mcg', label: 'Vit D' },
              { val: mg(recipe.totalCaffeine), unit: 'mg', label: 'Caffeine' },
            ].filter(e => e.val > 0);
            if (exts.length === 0) return null;
            return (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 14, paddingTop: 14, borderTopWidth: 0.5, borderTopColor: theme.borderSubtle }}>
                {exts.map(e => (
                  <View key={e.label} style={{ width: '25%', alignItems: 'center', marginBottom: 12 }}>
                    <GradientNumber value={`${e.val}${e.unit}`} color={theme.textSecondary} style={{ fontSize: 13, fontFamily: Type.uiSemibold }} />
                    <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: Type.ui, letterSpacing: 1, marginTop: 2, textAlign: 'center' }}>{e.label}</Text>
                  </View>
                ))}
              </View>
            );
          })()}
        </View>

        {/* Ingredients */}
        {recipe.ingredients && recipe.ingredients.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Ingredients</Text>
            {recipe.ingredients.map((ing: any, i: number) => (
              // Last row drops its divider: inside a card a trailing rule reads as a broken edge.
              <View key={i} style={[styles.ingredientRow, i === recipe.ingredients.length - 1 && { borderBottomWidth: 0, paddingBottom: 0 }]}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <GradientNumber value={`${ing.name} (${ing.amount}${unitLabel(ing.unit || 'g')})`} color={theme.textSecondary} style={styles.ingredientName} />
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: theme.macroProtein }} />
                      <GradientNumber value={`${Number(ing.protein || 0).toFixed(1)}g`} color={theme.textMuted} style={styles.ingredientMacro} />
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: theme.macroCarbs }} />
                      <GradientNumber value={`${Number(ing.carbs || 0).toFixed(1)}g`} color={theme.textMuted} style={styles.ingredientMacro} />
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: theme.macroFat }} />
                      <GradientNumber value={`${Number(ing.fat || 0).toFixed(1)}g`} color={theme.textMuted} style={styles.ingredientMacro} />
                    </View>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end', justifyContent: 'flex-start' }}>
                  <GradientNumber value={String(ing.cal)} color={theme.accentGreen} style={{ fontSize: 18, fontFamily: Type.num }} />
                  <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: Type.ui, letterSpacing: 1 }}>kcal</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Log Mode Toggle -- hidden when whole batch (weight only) */}
        {!isWholeBatch && (
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, logMode === 'serving' && styles.toggleBtnActive]}
              onPress={() => setLogMode('serving')}>
              {logMode === 'serving' ? <ButtonShine radius={6} /> : null}
              <Text style={[styles.toggleBtnText, logMode === 'serving' && { color: theme.accentBlue }]}>
                By {recipe.servingName}
              </Text>
            </TouchableOpacity>
            {totalWeight > 0 && (
              <TouchableOpacity
                style={[styles.toggleBtn, logMode === 'weight' && styles.toggleBtnActive]}
                onPress={() => setLogMode('weight')}>
                {logMode === 'weight' ? <ButtonShine radius={6} /> : null}
                <Text style={[styles.toggleBtnText, logMode === 'weight' && { color: theme.accentBlue }]}>
                  By weight ({unitLabel(weightUnit)})
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Amount + Nutrition -- ONE card. They were two surfaces doing one job: you type an amount, and the
            thing below tells you what that amount IS. The question floated naked on the page while the
            answer had a card, and the answer's own title just echoes the question's value back
            ("Nutrition for 0 grams"). Together they read as one unit: how much -> here is what that is.
            It also fixes the input, which read as a mystery white box floating in the page; on a card a
            near-white field is a proper recess. */}
        <View style={styles.nutritionCard}>
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>
              {logMode === 'serving' ? `How many ${recipe.servingName}?` : `How many ${weightUnitWord[weightUnit] || unitLabel(weightUnit)}?`}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TextInput
                style={styles.amountInput}
                value={logMode === 'serving' ? servingAmount : weightAmount}
                onChangeText={logMode === 'serving' ? setServingAmount : setWeightAmount}
                keyboardType="decimal-pad"
                selectTextOnFocus
              />
              {/* Weigh your portion in whatever your scale reads -- the recipe stays defined in its own
                  unit, this only changes what you type in. Same family only (no density guessing). */}
              {logMode === 'weight' && convertibleUnitsFor(recipeUnit).length > 0 && (
                <UnitPickerButton
                  value={weightUnit}
                  options={convertibleUnitsFor(recipeUnit)}
                  onChange={u => {
                    const typed = parseFloat(weightAmount);
                    if (!isNaN(typed)) {
                      const converted = convertUnit(typed, weightUnit, u);
                      if (converted !== null) setWeightAmount(String(Math.round(converted * 100) / 100));
                    }
                    setWeightUnit(u);
                  }}
                />
              )}
            </View>
          </View>
          <Text style={styles.nutritionTitle}>
            {logMode === 'serving'
              ? `Nutrition for ${servingAmount} ${recipe.servingName}`
              : `Nutrition for ${weightAmount || '0'} ${weightUnitWord[weightUnit] || unitLabel(weightUnit)}`}
          </Text>
          <View style={styles.macroRow}>
            <View style={styles.macroStat}>
              <GradientNumber value={String(calories)} color={theme.accentGreen} style={[styles.macroVal, { fontSize: 32 }]} />
              <Text style={styles.macroLabel}>Calories</Text>
            </View>
            <View style={styles.macroStat}>
              <GradientNumber value={`${protein}g`} color={theme.macroProtein} style={styles.macroVal} />
              <Text style={styles.macroLabel}>Protein</Text>
            </View>
            <View style={styles.macroStat}>
              <GradientNumber value={`${carbs}g`} color={theme.macroCarbs} style={styles.macroVal} />
              <Text style={styles.macroLabel}>Carbs</Text>
            </View>
            <View style={styles.macroStat}>
              <GradientNumber value={`${fat}g`} color={theme.macroFat} style={styles.macroVal} />
              <Text style={styles.macroLabel}>Fat</Text>
            </View>
          </View>
        </View>

        {/* Add to Diary. Molded + ACCENT (was flat accentGreen): green means success/goal-hit, and this
            starts an action rather than reporting an outcome. Same call as Food Detail's twin of this. */}
        <PrimaryCTA
          label={date === 'recipe' ? 'Add to Recipe' : 'Add to Diary'}
          onPress={date === 'recipe' ? () => logRecipe('recipe') : openMealPicker}
          disabled={!calories}
        />

      </ScrollView>

      {/* Meal Picker Modal */}
      <Modal
        visible={showMealPicker}
        transparent
        animationType="none"
        onShow={() => Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start()}
        onRequestClose={closeMealPicker}>
        <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
          <TouchableOpacity style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} activeOpacity={1} onPress={closeMealPicker} />
          {/* ModalHeader owns the pill, the title and the X -- which makes the Cancel at the bottom a second
              close control on one modal, so it goes. Body padding moves inside so the header owns the top. */}
          <View style={[styles.modal, { padding: 0, overflow: 'hidden' }]} pointerEvents="box-none">
            <ModalHeader title="Add to Which Meal?" onClose={closeMealPicker} />
            <View style={{ paddingHorizontal: 24, paddingBottom: 24, paddingTop: 4 }}>
              {mealSlots.map(slot => (
                <TouchableOpacity
                  key={slot.id}
                  style={styles.mealOption}
                  onPress={() => logRecipe(slot.id)}>
                  <Text style={styles.mealOptionText}>{slot.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Animated.View>
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
  editBtn: { backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 },
  editBtnText: { color: theme.accentBlue, fontSize: 13, fontFamily: Type.uiSemibold },
  // paddingBottom 80 -> 120: Otto's disc sits bottom-left (bottom+20..bottom+76) and was covering the left
  // end of Add to Diary. The CONTENT clears the FAB, never the other way round -- Otto is bottom-left on
  // every screen in the app, so moving him here would just make him inconsistent everywhere else.
  content: { padding: 16, paddingBottom: 120 },
  // Had NO shadow -- never written, not broken. Read fine while Light's ground was the old grey #e3e6ee
  // (a white card had value contrast to lean on); the brightened #f2f3f7 took that away.
  infoCard: { backgroundColor: theme.bgCard, borderWidth: 1, borderColor: theme.borderCard, borderRadius: 10, padding: 16, marginBottom: 16, shadowColor: theme.cardShadow, shadowOpacity: theme.cardShadowOpacity, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 6 },
  infoText: { fontSize: 12, color: theme.textMuted, fontFamily: Type.ui, marginBottom: 12 },
  // alignItems 'flex-end': the stats TOP-aligned before, and Calories is 32px while the macros are 22px --
  // so the three small numbers floated high and Calories hung below them. Bottom-aligning the columns fixes
  // both: the labels line up, and since the labels are identical heights the numbers land on a shared
  // baseline. (No effect on the infoCard row above, where every value is the same size.)
  macroRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  macroStat: { alignItems: 'center', flex: 1 },
  macroVal: { fontSize: 22, fontFamily: Type.num, letterSpacing: 1 },
  macroLabel: { fontSize: 10, color: theme.textMuted, fontFamily: Type.ui, marginTop: 2, textAlign: 'center' },
  // Ingredients is a CARD now. It was naked content sitting between two cards, so the page read
  // card / nothing / card -- it looked like something had failed to load, and once the page gained a glow
  // the list was floating in it. It is also the thing you actually scan on this screen.
  section: { backgroundColor: theme.bgCard, borderWidth: 0.5, borderColor: theme.borderCard, borderTopWidth: 1.5, borderTopColor: theme.accentBlueRaw, borderRadius: 10, padding: 16, marginBottom: 16, shadowColor: theme.cardShadow, shadowOpacity: theme.cardShadowOpacity, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 6 },
  sectionLabel: { fontSize: 9, letterSpacing: 3, color: theme.textMuted, textTransform: 'uppercase', fontFamily: Type.uiMedium, marginBottom: 8 },
  ingredientRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.borderSubtle },
  ingredientName: { fontSize: 13, color: theme.textSecondary, fontFamily: Type.uiSemibold },
  ingredientMacro: { fontSize: 11, color: theme.textMuted, fontFamily: Type.ui },
  toggleRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  toggleBtn: { flex: 1, padding: 10, backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 6, alignItems: 'center' },
  // The SELECTED half wears the View-All-Achievements recipe: an OPAQUE accent fill, not the translucent
  // accentBlueBg. This row sits on the PAGE, not on a card, so a ~10% tint just shows you the accent bottom
  // glow through it. Same reason Stats' VIEW ALL ACHIEVEMENTS and the Plans sort chips needed the opaque
  // token. (+ ButtonShine at the render site, so it reads as a surface catching light.)
  toggleBtnActive: { backgroundColor: theme.accentBlueBgOpaque, borderColor: theme.accentBlueBorder },
  toggleBtnText: { color: theme.textMuted, fontSize: 13, fontFamily: Type.uiMedium },
  // Lives INSIDE nutritionCard now (see the note at its render site). The rule under it separates the
  // question from the answer without needing a second card.
  amountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: theme.borderSubtle },
  amountLabel: { fontSize: 14, color: theme.textMuted, fontFamily: Type.ui },
  amountInput: { backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, color: theme.textPrimary, padding: 12, fontSize: 24, fontFamily: Type.num, width: 120, textAlign: 'center' },
  servingBtns: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  servingBtn: { flex: 1, padding: 10, backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 6, alignItems: 'center' },
  servingBtnActive: { backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder },
  servingBtnText: { color: theme.textMuted, fontSize: 14, fontFamily: Type.uiMedium },
  nutritionCard: { backgroundColor: theme.bgCard, borderWidth: 1, borderColor: theme.borderCard, borderRadius: 10, padding: 16, marginBottom: 20, shadowColor: theme.cardShadow, shadowOpacity: theme.cardShadowOpacity, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 6 },
  nutritionTitle: { fontSize: 11, color: theme.textMuted, fontFamily: Type.uiMedium, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 },
  // logBtn / logBtnText removed 2026-07-15: Add to Diary is PrimaryCTA now.
  modalOverlay: { flex: 1, backgroundColor: theme.overlayBg, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  modal: {
    backgroundColor: theme.bgSheet,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: theme.borderCard,
    borderTopWidth: 1.5,
    borderTopColor: theme.accentBlueRaw,
    padding: 24,
    width: '100%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 12,
    alignItems: 'center',
  },
  handlePill: { width: 36, height: 4, backgroundColor: theme.borderCard, borderRadius: 2, marginBottom: 16 },
  modalTitle: { fontSize: 18, color: theme.accentBlueRaw, fontFamily: Type.display, letterSpacing: 0.3, marginBottom: 16 },
  mealOption: { width: '100%', padding: 14, borderBottomWidth: 1, borderBottomColor: theme.borderSubtle, alignItems: 'center' },
  mealOptionText: { fontSize: 16, color: theme.textSecondary, fontFamily: Type.uiMedium },
  cancelBtn: { width: '100%', padding: 14, alignItems: 'center', marginTop: 4 },
  cancelBtnText: { color: theme.accentRed, fontSize: 14, fontFamily: Type.uiMedium },
});