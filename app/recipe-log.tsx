import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useToast } from '../components/Toast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { saveToFirebase } from '../firebaseConfig';
import { storageSet } from '../utils/storage';
import { useTheme } from '../theme';
import { DEFAULT_MEAL_SLOTS, MealSlot, loadMealSlots } from '../utils/mealSlots';

export default function RecipeLogScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { recipeJson, meal, date } = useLocalSearchParams<{ recipeJson: string; meal: string; date: string }>();

  const recipe = recipeJson ? JSON.parse(recipeJson) : null;
  const isWholeBatch = (recipe?.servingCount ?? 1) === 0;
  const [logMode, setLogMode] = useState<'serving' | 'weight'>(
    isWholeBatch || (recipe?.defaultToWeight && recipe?.totalWeight > 0) ? 'weight' : 'serving'
  );
  const [servingAmount, setServingAmount] = useState('1');
  const [weightAmount, setWeightAmount] = useState('');
  const [showMealPicker, setShowMealPicker] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState(meal || 'ms_lunch');
  const [mealSlots, setMealSlots] = useState<MealSlot[]>(DEFAULT_MEAL_SLOTS);

  useEffect(() => {
    loadMealSlots().then(({ mealSlots: slots }) => setMealSlots(slots));
  }, []);
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

  const getMultiplier = () => {
    if (logMode === 'serving' && servingCount > 0) return parseFloat(servingAmount) / servingCount;
    if (!totalWeight) return 0;
    return parseFloat(weightAmount) / totalWeight;
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
          ...(recipe.totalMagnesium  ? { magnesium:          Math.round((recipe.totalMagnesium  || 0) * multiplier) } : {}),
          ...(recipe.totalZinc       ? { zinc:               Math.round((recipe.totalZinc       || 0) * multiplier * 10) / 10 } : {}),
          ...(recipe.totalCopper     ? { copper:             Math.round((recipe.totalCopper     || 0) * multiplier * 10) / 10 } : {}),
          ...(recipe.totalCaffeine   ? { caffeine:           Math.round((recipe.totalCaffeine   || 0) * multiplier) } : {}),
          amount: logMode === 'weight' ? parseFloat(weightAmount) : parseFloat(servingAmount),
          unit: logMode === 'weight' ? (recipe.totalWeightUnit || 'g') : recipe.servingName,
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
        : `${weightAmount}${recipe.totalWeightUnit}`;
      const newEntry = {
        name: `${recipe.name} (${label})`,
        cal: calories,
        meal: mealName,
        protein,
        carbs,
        fat,
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
        ...(recipe.totalMagnesium   ? { magnesium:          Math.round((recipe.totalMagnesium  || 0) * multiplier) } : {}),
        ...(recipe.totalZinc        ? { zinc:               Math.round((recipe.totalZinc       || 0) * multiplier * 10) / 10 } : {}),
        ...(recipe.totalCopper      ? { copper:             Math.round((recipe.totalCopper     || 0) * multiplier * 10) / 10 } : {}),
        ...(recipe.totalCaffeine    ? { caffeine:           Math.round((recipe.totalCaffeine   || 0) * multiplier) } : {}),
        timestamp: Date.now(),
      };
      entries.push(newEntry);
      await storageSet(`pj_${date}`, JSON.stringify({ ...current, entries }));
      await saveToFirebase(date, 'entries', entries);
      showToast('Recipe logged', recipe.name, 'success');
      router.back();
      router.back();
    } catch (e) {
      console.log('Log error', e);
    }
  };

  const weightUnitWord: Record<string, string> = { g: 'grams', oz: 'ounces', lbs: 'pounds', ml: 'milliliters', cups: 'cups' };
  const styles = useStyles(theme);
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); router.back(); }} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{recipe.name}</Text>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => router.push({ pathname: '/recipe-builder', params: { recipeId: recipe.id } })}>
          <Text style={styles.editBtnText}>Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" automaticallyAdjustKeyboardInsets={true}>

        {/* Recipe Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            {isWholeBatch ? 'Whole batch' : `${recipe.servingCount} ${recipe.servingName} total`}
            {totalWeight > 0 ? ` · ${totalWeight}${recipe.totalWeightUnit} total weight` : ''}
          </Text>
          <View style={styles.macroRow}>
            <View style={styles.macroStat}>
              <Text style={[styles.macroVal, { color: theme.accentGreen }]}>
                {isWholeBatch ? Math.round(recipe.totalCal) : Math.round(recipe.totalCal / servingCount)}
              </Text>
              <Text style={styles.macroLabel}>{isWholeBatch ? 'total cal' : `cal/${recipe.servingName}`}</Text>
            </View>
            <View style={styles.macroStat}>
              <Text style={[styles.macroVal, { color: theme.macroProtein }]}>
                {isWholeBatch ? Math.round(recipe.totalProtein * 10) / 10 : Math.round(recipe.totalProtein / servingCount * 10) / 10}<Text style={styles.macroUnit}>g</Text>
              </Text>
              <Text style={styles.macroLabel}>protein</Text>
            </View>
            <View style={styles.macroStat}>
              <Text style={[styles.macroVal, { color: theme.macroCarbs }]}>
                {isWholeBatch ? Math.round(recipe.totalCarbs * 10) / 10 : Math.round(recipe.totalCarbs / servingCount * 10) / 10}<Text style={styles.macroUnit}>g</Text>
              </Text>
              <Text style={styles.macroLabel}>carbs</Text>
            </View>
            <View style={styles.macroStat}>
              <Text style={[styles.macroVal, { color: theme.macroFat }]}>
                {isWholeBatch ? Math.round(recipe.totalFat * 10) / 10 : Math.round(recipe.totalFat / servingCount * 10) / 10}<Text style={styles.macroUnit}>g</Text>
              </Text>
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
                    <Text style={{ fontSize: 13, color: theme.textSecondary, fontFamily: 'DMSans_600SemiBold' }}>{e.val}{e.unit}</Text>
                    <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: 'DMSans_400Regular', letterSpacing: 1, marginTop: 2, textAlign: 'center' }}>{e.label}</Text>
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
              <View key={i} style={styles.ingredientRow}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={styles.ingredientName}>{ing.name} ({ing.amount}{ing.unit})</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: theme.macroProtein }} />
                      <Text style={styles.ingredientMacro}>{Number(ing.protein || 0).toFixed(1)}g</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: theme.macroCarbs }} />
                      <Text style={styles.ingredientMacro}>{Number(ing.carbs || 0).toFixed(1)}g</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: theme.macroFat }} />
                      <Text style={styles.ingredientMacro}>{Number(ing.fat || 0).toFixed(1)}g</Text>
                    </View>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end', justifyContent: 'flex-start' }}>
                  <Text style={{ fontSize: 18, color: theme.accentGreen, fontFamily: 'BebasNeue_400Regular' }}>{ing.cal}</Text>
                  <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: 'DMSans_400Regular', letterSpacing: 1 }}>kcal</Text>
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
              <Text style={[styles.toggleBtnText, logMode === 'serving' && { color: theme.accentBlue }]}>
                By {recipe.servingName}
              </Text>
            </TouchableOpacity>
            {totalWeight > 0 && (
              <TouchableOpacity
                style={[styles.toggleBtn, logMode === 'weight' && styles.toggleBtnActive]}
                onPress={() => setLogMode('weight')}>
                <Text style={[styles.toggleBtnText, logMode === 'weight' && { color: theme.accentBlue }]}>
                  By weight ({recipe.totalWeightUnit})
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Amount Input */}
        <View style={styles.amountRow}>
          <Text style={styles.amountLabel}>
            {logMode === 'serving' ? `How many ${recipe.servingName}?` : `How many ${weightUnitWord[recipe.totalWeightUnit] || recipe.totalWeightUnit}?`}
          </Text>
          <TextInput
            style={styles.amountInput}
            value={logMode === 'serving' ? servingAmount : weightAmount}
            onChangeText={logMode === 'serving' ? setServingAmount : setWeightAmount}
            keyboardType="decimal-pad"
            selectTextOnFocus
          />
        </View>

        {/* Nutrition Preview */}
        <View style={styles.nutritionCard}>
          <Text style={styles.nutritionTitle}>
            {logMode === 'serving'
              ? `Nutrition for ${servingAmount} ${recipe.servingName}`
              : `Nutrition for ${weightAmount || '0'} ${weightUnitWord[recipe.totalWeightUnit] || recipe.totalWeightUnit}`}
          </Text>
          <View style={styles.macroRow}>
            <View style={styles.macroStat}>
              <Text style={[styles.macroVal, { color: theme.accentGreen, fontSize: 32 }]}>{calories}</Text>
              <Text style={styles.macroLabel}>Calories</Text>
            </View>
            <View style={styles.macroStat}>
              <Text style={[styles.macroVal, { color: theme.macroProtein }]}>{protein}<Text style={styles.macroUnit}>g</Text></Text>
              <Text style={styles.macroLabel}>Protein</Text>
            </View>
            <View style={styles.macroStat}>
              <Text style={[styles.macroVal, { color: theme.macroCarbs }]}>{carbs}<Text style={styles.macroUnit}>g</Text></Text>
              <Text style={styles.macroLabel}>Carbs</Text>
            </View>
            <View style={styles.macroStat}>
              <Text style={[styles.macroVal, { color: theme.macroFat }]}>{fat}<Text style={styles.macroUnit}>g</Text></Text>
              <Text style={styles.macroLabel}>Fat</Text>
            </View>
          </View>
        </View>

        {/* Add to Diary */}
        <TouchableOpacity
          style={[styles.logBtn, !calories && { opacity: 0.35 }]}
          onPress={date === 'recipe' ? () => logRecipe('recipe') : openMealPicker}
          disabled={!calories}>
          <Text style={styles.logBtnText}>{date === 'recipe' ? 'ADD TO RECIPE' : 'ADD TO DIARY'}</Text>
        </TouchableOpacity>

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
          <View style={styles.modal} pointerEvents="box-none">
            <View style={styles.handlePill} />
            <Text style={styles.modalTitle}>Add to which meal?</Text>
            {mealSlots.map(slot => (
              <TouchableOpacity
                key={slot.id}
                style={styles.mealOption}
                onPress={() => logRecipe(slot.id)}>
                <Text style={styles.mealOptionText}>{slot.name}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.cancelBtn} onPress={closeMealPicker}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
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
  backBtnText: { color: theme.accentBlue, fontSize: 14, fontFamily: 'DMSans_500Medium' },
  headerTitle: { fontSize: 20, color: theme.textSecondary, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1, flex: 1, textAlign: 'center' },
  editBtn: { backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 },
  editBtnText: { color: theme.accentBlue, fontSize: 13, fontFamily: 'DMSans_600SemiBold' },
  content: { padding: 16, paddingBottom: 80 },
  infoCard: { backgroundColor: theme.bgCard, borderWidth: 1, borderColor: theme.borderCard, borderRadius: 10, padding: 16, marginBottom: 16 },
  infoText: { fontSize: 12, color: theme.textMuted, fontFamily: 'DMSans_400Regular', marginBottom: 12 },
  macroRow: { flexDirection: 'row', justifyContent: 'space-between' },
  macroStat: { alignItems: 'center', flex: 1 },
  macroVal: { fontSize: 22, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1 },
  macroUnit: { fontSize: 13, fontFamily: 'DMSans_400Regular', letterSpacing: 0 },
  macroLabel: { fontSize: 10, color: theme.textMuted, fontFamily: 'DMSans_400Regular', marginTop: 2, textAlign: 'center' },
  section: { marginBottom: 16 },
  sectionLabel: { fontSize: 9, letterSpacing: 3, color: theme.textMuted, textTransform: 'uppercase', fontFamily: 'DMSans_500Medium', marginBottom: 8 },
  ingredientRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.borderSubtle },
  ingredientName: { fontSize: 13, color: theme.textPrimary, fontFamily: 'DMSans_500Medium' },
  ingredientMacro: { fontSize: 11, color: theme.textMuted, fontFamily: 'DMSans_400Regular' },
  toggleRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  toggleBtn: { flex: 1, padding: 10, backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 6, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder },
  toggleBtnText: { color: theme.textMuted, fontSize: 13, fontFamily: 'DMSans_500Medium' },
  amountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  amountLabel: { fontSize: 14, color: theme.textMuted, fontFamily: 'DMSans_400Regular' },
  amountInput: { backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, color: theme.textPrimary, padding: 12, fontSize: 24, fontFamily: 'BebasNeue_400Regular', width: 120, textAlign: 'center' },
  servingBtns: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  servingBtn: { flex: 1, padding: 10, backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 6, alignItems: 'center' },
  servingBtnActive: { backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder },
  servingBtnText: { color: theme.textMuted, fontSize: 14, fontFamily: 'DMSans_500Medium' },
  nutritionCard: { backgroundColor: theme.bgCard, borderWidth: 1, borderColor: theme.borderCard, borderRadius: 10, padding: 16, marginBottom: 20 },
  nutritionTitle: { fontSize: 11, color: theme.textMuted, fontFamily: 'DMSans_500Medium', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 },
  logBtn: { backgroundColor: theme.accentGreen, borderRadius: 10, padding: 16, alignItems: 'center' },
  logBtnText: { color: theme.bgPrimary, fontSize: 18, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2 },
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
  modalTitle: { fontSize: 18, color: theme.accentBlueRaw, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1, marginBottom: 16 },
  mealOption: { width: '100%', padding: 14, borderBottomWidth: 1, borderBottomColor: theme.borderSubtle, alignItems: 'center' },
  mealOptionText: { fontSize: 16, color: theme.textSecondary, fontFamily: 'DMSans_500Medium' },
  cancelBtn: { width: '100%', padding: 14, alignItems: 'center', marginTop: 4 },
  cancelBtnText: { color: theme.accentRed, fontSize: 14, fontFamily: 'DMSans_500Medium' },
});