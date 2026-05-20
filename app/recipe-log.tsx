import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { saveToFirebase } from '../firebaseConfig';
import { storageSet } from '../utils/storage';
import { useTheme } from '../theme';

const MEALS = ['Morning', 'Lunch', 'Dinner', 'Snacks'];

export default function RecipeLogScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { recipeJson, meal, date } = useLocalSearchParams<{ recipeJson: string; meal: string; date: string }>();

  const recipe = recipeJson ? JSON.parse(recipeJson) : null;
  const [logMode, setLogMode] = useState<'serving' | 'weight'>('serving');
  const [servingAmount, setServingAmount] = useState('1');
  const [weightAmount, setWeightAmount] = useState('');
  const [showMealPicker, setShowMealPicker] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState(meal || 'Lunch');

  if (!recipe) return null;

  const totalWeight = recipe.totalWeight || 0;
  const servingCount = recipe.servingCount || 1;

  const getMultiplier = () => {
    if (logMode === 'serving') return parseFloat(servingAmount) / servingCount;
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
    try {
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
        timestamp: Date.now(),
      };
      entries.push(newEntry);
      await storageSet(`pj_${date}`, JSON.stringify({ ...current, entries }));
      await saveToFirebase(date, 'entries', entries);
      router.back();
      router.back();
    } catch (e) {
      console.log('Log error', e);
    }
  };

  const styles = useStyles(theme);
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{recipe.name}</Text>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => router.push({ pathname: '/recipe-builder', params: { recipeId: recipe.id } })}>
          <Text style={styles.editBtnText}>Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* Recipe Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            {recipe.servingCount} {recipe.servingName} total
            {totalWeight > 0 ? ` · ${totalWeight}${recipe.totalWeightUnit} total weight` : ''}
          </Text>
          <View style={styles.macroRow}>
            <View style={styles.macroStat}>
              <Text style={[styles.macroVal, { color: theme.accentGreen }]}>{Math.round(recipe.totalCal / servingCount)}</Text>
              <Text style={styles.macroLabel}>cal/{recipe.servingName}</Text>
            </View>
            <View style={styles.macroStat}>
              <Text style={[styles.macroVal, { color: theme.macroProtein }]}>{Math.round(recipe.totalProtein / servingCount * 10) / 10}g</Text>
              <Text style={styles.macroLabel}>protein</Text>
            </View>
            <View style={styles.macroStat}>
              <Text style={[styles.macroVal, { color: theme.macroCarbs }]}>{Math.round(recipe.totalCarbs / servingCount * 10) / 10}g</Text>
              <Text style={styles.macroLabel}>carbs</Text>
            </View>
            <View style={styles.macroStat}>
              <Text style={[styles.macroVal, { color: theme.macroFat }]}>{Math.round(recipe.totalFat / servingCount * 10) / 10}g</Text>
              <Text style={styles.macroLabel}>fat</Text>
            </View>
          </View>
        </View>

        {/* Ingredients */}
        {recipe.ingredients && recipe.ingredients.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Ingredients</Text>
            {recipe.ingredients.map((ing: any, i: number) => (
              <View key={i} style={styles.ingredientRow}>
                <Text style={styles.ingredientName} numberOfLines={1}>{ing.name}</Text>
                <Text style={styles.ingredientMeta}>{ing.amount}{ing.unit} · {ing.cal} kcal</Text>
              </View>
            ))}
          </View>
        )}

        {/* Log Mode Toggle */}
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

        {/* Amount Input */}
        <View style={styles.amountRow}>
          <Text style={styles.amountLabel}>
            {logMode === 'serving' ? `How many ${recipe.servingName}?` : `How many ${recipe.totalWeightUnit}?`}
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
              : `Nutrition for ${weightAmount || '0'}${recipe.totalWeightUnit}`}
          </Text>
          <View style={styles.macroRow}>
            <View style={styles.macroStat}>
              <Text style={[styles.macroVal, { color: theme.accentGreen, fontSize: 32 }]}>{calories}</Text>
              <Text style={styles.macroLabel}>Calories</Text>
            </View>
            <View style={styles.macroStat}>
              <Text style={[styles.macroVal, { color: theme.macroProtein }]}>{protein}g</Text>
              <Text style={styles.macroLabel}>Protein</Text>
            </View>
            <View style={styles.macroStat}>
              <Text style={[styles.macroVal, { color: theme.macroCarbs }]}>{carbs}g</Text>
              <Text style={styles.macroLabel}>Carbs</Text>
            </View>
            <View style={styles.macroStat}>
              <Text style={[styles.macroVal, { color: theme.macroFat }]}>{fat}g</Text>
              <Text style={styles.macroLabel}>Fat</Text>
            </View>
          </View>
        </View>

        {/* Add to Diary */}
        <TouchableOpacity style={styles.logBtn} onPress={() => setShowMealPicker(true)}>
          <Text style={styles.logBtnText}>ADD TO DIARY</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Meal Picker Modal */}
      <Modal visible={showMealPicker} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowMealPicker(false)}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Add to which meal?</Text>
            {MEALS.map(m => (
              <TouchableOpacity
                key={m}
                style={styles.mealOption}
                onPress={() => { setShowMealPicker(false); logRecipe(m); }}>
                <Text style={styles.mealOptionText}>{m}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowMealPicker(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

    </View>
    </KeyboardAvoidingView>
  );
}

const useStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bgPrimary },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.borderCard },
  backBtn: { padding: 4, width: 60 },
  backBtnText: { color: theme.accentBlue, fontSize: 14, fontFamily: 'DMSans_500Medium' },
  headerTitle: { fontSize: 20, color: theme.textPrimary, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1, flex: 1, textAlign: 'center' },
  editBtn: { backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 },
  editBtnText: { color: theme.accentBlue, fontSize: 13, fontFamily: 'DMSans_600SemiBold' },
  content: { padding: 16, paddingBottom: 80 },
  infoCard: { backgroundColor: theme.bgCard, borderWidth: 1, borderColor: theme.borderCard, borderRadius: 10, padding: 16, marginBottom: 16 },
  infoText: { fontSize: 12, color: theme.textMuted, fontFamily: 'DMSans_400Regular', marginBottom: 12 },
  macroRow: { flexDirection: 'row', justifyContent: 'space-between' },
  macroStat: { alignItems: 'center', flex: 1 },
  macroVal: { fontSize: 22, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1 },
  macroLabel: { fontSize: 10, color: theme.textMuted, fontFamily: 'DMSans_400Regular', marginTop: 2, textAlign: 'center' },
  section: { marginBottom: 16 },
  sectionLabel: { fontSize: 9, letterSpacing: 3, color: theme.textMuted, textTransform: 'uppercase', fontFamily: 'DMSans_500Medium', marginBottom: 8 },
  ingredientRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.borderSubtle },
  ingredientName: { fontSize: 13, color: theme.textPrimary, fontFamily: 'DMSans_400Regular', flex: 1, marginRight: 8 },
  ingredientMeta: { fontSize: 12, color: theme.textMuted, fontFamily: 'DMSans_400Regular' },
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
  modalOverlay: { flex: 1, backgroundColor: theme.overlayBg, justifyContent: 'flex-end' },
  modal: { backgroundColor: theme.bgCard, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 24, borderWidth: 1, borderColor: theme.borderCard },
  modalTitle: { fontSize: 18, color: theme.textPrimary, fontFamily: 'DMSans_600SemiBold', marginBottom: 16 },
  mealOption: { padding: 16, borderBottomWidth: 1, borderBottomColor: theme.borderSubtle, alignItems: 'center' },
  mealOptionText: { fontSize: 16, color: theme.textSecondary, fontFamily: 'DMSans_500Medium' },
  cancelBtn: { padding: 16, alignItems: 'center', marginTop: 4 },
  cancelBtnText: { color: theme.accentRed, fontSize: 14, fontFamily: 'DMSans_500Medium' },
});