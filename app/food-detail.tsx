import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { useToast } from '../components/Toast';
import { saveToFirebase } from '../firebaseConfig';
import { useTheme } from '../theme';

function MacroDonut({ protein, carbs, fat, calories, theme }: { protein: number; carbs: number; fat: number; calories: number; theme: any }) {
  const size = 100;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = protein + carbs + fat;

  if (total === 0) {
    return (
      <View style={{ alignItems: 'center', justifyContent: 'center', width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle cx={size/2} cy={size/2} r={radius} stroke={theme.donutTrack} strokeWidth={strokeWidth} fill="none" />
        </Svg>
        <View style={{ position: 'absolute', alignItems: 'center' }}>
          <Text style={{ color: theme.textDim, fontSize: 10, fontFamily: 'DMSans_400Regular' }}>--</Text>
        </View>
      </View>
    );
  }

  const proteinPct = protein / total;
  const carbsPct = carbs / total;
  const fatPct = fat / total;
  const proteinDash = proteinPct * circumference;
  const carbsDash = carbsPct * circumference;
  const fatDash = fatPct * circumference;
  const carbsOffset = -(proteinPct * circumference);
  const fatOffset = -((proteinPct + carbsPct) * circumference);

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: size, height: size }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size/2} cy={size/2} r={radius} stroke={theme.donutTrack} strokeWidth={strokeWidth} fill="none" />
        <Circle cx={size/2} cy={size/2} r={radius} stroke={theme.macroProtein} strokeWidth={strokeWidth} fill="none"
          strokeDasharray={`${proteinDash} ${circumference}`} strokeDashoffset={0} strokeLinecap="butt" />
        <Circle cx={size/2} cy={size/2} r={radius} stroke={theme.macroCarbs} strokeWidth={strokeWidth} fill="none"
          strokeDasharray={`${carbsDash} ${circumference}`} strokeDashoffset={carbsOffset} strokeLinecap="butt" />
        <Circle cx={size/2} cy={size/2} r={radius} stroke={theme.macroFat} strokeWidth={strokeWidth} fill="none"
          strokeDasharray={`${fatDash} ${circumference}`} strokeDashoffset={fatOffset} strokeLinecap="butt" />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={{ color: theme.textPrimary, fontSize: 14, fontFamily: 'BebasNeue_400Regular' }}>{calories}</Text>
        <Text style={{ color: theme.textMuted, fontSize: 8, fontFamily: 'DMSans_400Regular' }}>kcal</Text>
      </View>
    </View>
  );
}
export default function FoodDetailScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { foodJson, meal, date, entryIndex, recipeMode } = useLocalSearchParams<{ 
    foodJson: string; 
    meal: string; 
    date: string;
    entryIndex: string;
    recipeMode: string;
  }>();
const isRecipeMode = recipeMode === 'true';
  const food = foodJson ? JSON.parse(foodJson) : null;
  const { showToast } = useToast();
  const [isFav, setIsFav] = useState(false);

  useEffect(() => {
    const loadFav = async () => {
      try {
        const saved = await AsyncStorage.getItem('pj_favorites');
        if (saved && food) {
          const favs = JSON.parse(saved);
          setIsFav(favs.some((f: any) => f.name === food.description));
        }
      } catch (e) {}
    };
    loadFav();
  }, []);

  const toggleFav = async () => {
    try {
      const saved = await AsyncStorage.getItem('pj_favorites');
      let favs = saved ? JSON.parse(saved) : [];
      if (isFav) {
        favs = favs.filter((f: any) => f.name !== food.description);
      } else {
        favs.push({
          name: food.description,
          cal: food.calPer100g || 0,
          calPer100g: food.calPer100g || 0,
          proteinPer100g: food.proteinPer100g || 0,
          carbsPer100g: food.carbsPer100g || 0,
          fatPer100g: food.fatPer100g || 0,
          foodNutrients: food.foodNutrients || [],
        });
      }
      await AsyncStorage.setItem('pj_favorites', JSON.stringify(favs));
      await saveToFirebase('my_foods', 'favorites', favs);
      setIsFav(!isFav);
    } catch (e) {}
  };
    const [entryTime, setEntryTime] = useState<Date>( food?.timestamp ? new Date(food.timestamp) : new Date());
const [showTimePicker, setShowTimePicker] = useState(false);
  const isEditing = entryIndex !== undefined && entryIndex !== '';
  const [amount, setAmount] = useState(food?.existingAmount || '100');
  const [unit, setUnit] = useState<'g' | 'oz' | 'serving'>(food?.existingUnit || 'g');
    const [showMealPicker, setShowMealPicker] = useState(false);
const [currentMeal, setCurrentMeal] = useState(meal || 'Morning');

  if (!food) return null;

  const getNutrientPer100g = (name: string, unitName: string = 'G') => {
    const n = food.foodNutrients?.find((n: any) => 
      n.nutrientName === name && n.unitName === unitName
    );
    return n?.value || 0;
  };

  const calPer100g = food.calPer100g || getNutrientPer100g('Energy', 'KCAL');
  const proteinPer100g = food.proteinPer100g || getNutrientPer100g('Protein');
  const carbsPer100g = food.carbsPer100g || getNutrientPer100g('Carbohydrate, by difference');
  const fatPer100g = food.fatPer100g || getNutrientPer100g('Total lipid (fat)');

  const getMultiplier = () => {
    const val = parseFloat(amount) || 0;
    if (unit === 'g') return val / 100;
    if (unit === 'oz') return (val * 28.3495) / 100;
    if (unit === 'serving') return val;
    return 0;
  };

  const multiplier = getMultiplier();
  const calories = calPer100g > 0 ? Math.round(calPer100g * multiplier) : (food.existingCal || 0);
const protein = calPer100g > 0 ? Math.round(proteinPer100g * multiplier * 10) / 10 : (food.existingProtein || 0);
const carbs = calPer100g > 0 ? Math.round(carbsPer100g * multiplier * 10) / 10 : (food.existingCarbs || 0);
const fat = calPer100g > 0 ? Math.round(fatPer100g * multiplier * 10) / 10 : (food.existingFat || 0);

  const saveEntry = async () => {
    if (!calories && calories !== 0) return;
    try {
      if (isRecipeMode) {
        // Save as pending ingredient for recipe builder to pick up
        const ingredient = {
          id: Math.random().toString(36).substr(2, 9),
          name: food.description,
          cal: calories,
          protein,
          carbs,
          fat,
          amount: parseFloat(amount),
          unit,
          calPer100g,
          proteinPer100g,
          carbsPer100g,
          fatPer100g,
        };
        await AsyncStorage.setItem('pj_pending_ingredient', JSON.stringify(ingredient));
        router.back();
        router.back();
        return;
      }

      const saved = await AsyncStorage.getItem(`pj_${date}`);
      const current = saved ? JSON.parse(saved) : {};
      const entries = current.entries || [];
      const newEntry = {
  name: `${food.description} (${amount}${unit})`,
  cal: calories,
  meal: currentMeal,
  protein,
  carbs,
  fat,
  calPer100g,
  proteinPer100g,
  carbsPer100g,
  fatPer100g,
  foodNutrients: food.foodNutrients || [],
  timestamp: entryTime.getTime(),
};
      if (isEditing) {
        entries[parseInt(entryIndex)] = { ...entries[parseInt(entryIndex)], ...newEntry };
      } else {
        entries.push(newEntry);
      }
      await AsyncStorage.setItem(`pj_${date}`, JSON.stringify({ ...current, entries }));
      await saveToFirebase(date, 'entries', entries);
      showToast(isEditing ? 'Entry updated' : 'Entry logged', `${calories} kcal · ${currentMeal}`, 'success');
      router.back();
      if (!isEditing) router.back();
    } catch (e) {
      console.log('Save error', e);
    }
  };

  const styles = useStyles(theme);
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {isEditing ? 'Edit Entry' : 'Food Detail'}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, width: 60, justifyContent: 'flex-end' }}>
          {food?.isMyFood && (
            <TouchableOpacity
              style={{ backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 }}
              onPress={() => router.push({ pathname: '/edit-food', params: { foodJson: JSON.stringify(food) } })}>
              <Text style={{ color: theme.accentBlue, fontSize: 13, fontFamily: 'DMSans_600SemiBold' }}>Edit</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={toggleFav} style={{ padding: 4 }}>
            <Text style={{ fontSize: 22, color: isFav ? theme.accentAmber : theme.textDim }}>★</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.foodName}>{food.description}</Text>

        {/* Unit Toggle */}
        <View style={styles.unitRow}>
          {(['g', 'oz', 'serving'] as const).map(u => (
            <TouchableOpacity
              key={u}
              style={[styles.unitBtn, unit === u && styles.unitBtnActive]}
              onPress={() => { setUnit(u); setAmount(u === 'serving' ? '1' : '100'); }}>
              <Text style={[styles.unitBtnText, unit === u && styles.unitBtnTextActive]}>{u}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Amount Input */}
        <View style={styles.amountRow}>
          <Text style={styles.amountLabel}>Amount ({unit})</Text>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            selectTextOnFocus
          />
        </View>

        {/* Nutrition */}
        <View style={styles.nutritionCard}>
          <Text style={styles.nutritionTitle}>Nutrition for {amount}{unit}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <MacroDonut protein={protein} carbs={carbs} fat={fat} calories={calories} theme={theme} />
            <View style={{ flex: 1, gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.macroProtein }} />
                <Text style={{ color: theme.textMuted, fontSize: 12, fontFamily: 'DMSans_400Regular', flex: 1 }}>Protein</Text>
                <Text style={{ color: theme.macroProtein, fontSize: 15, fontFamily: 'BebasNeue_400Regular' }}>{protein}g</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.macroCarbs }} />
                <Text style={{ color: theme.textMuted, fontSize: 12, fontFamily: 'DMSans_400Regular', flex: 1 }}>Carbs</Text>
                <Text style={{ color: theme.macroCarbs, fontSize: 15, fontFamily: 'BebasNeue_400Regular' }}>{carbs}g</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.macroFat }} />
                <Text style={{ color: theme.textMuted, fontSize: 12, fontFamily: 'DMSans_400Regular', flex: 1 }}>Fat</Text>
                <Text style={{ color: theme.macroFat, fontSize: 15, fontFamily: 'BebasNeue_400Regular' }}>{fat}g</Text>
              </View>
            </View>
          </View>

          {/* Extended nutrition */}
          {[
            { label: 'Fiber', key: 'Fiber, total dietary', color: '#6366f1' },
            { label: 'Sugar', key: 'Sugars, total including NLEA', color: '#ec4899' },
            { label: 'Sodium', key: 'Sodium, Na', color: '#8b5cf6', unitName: 'MG' },
            { label: 'Cholesterol', key: 'Cholesterol', color: '#14b8a6', unitName: 'MG' },
            { label: 'Saturated Fat', key: 'Fatty acids, total saturated', color: '#f97316' },
          ].map(nutrient => {
            const n = food.foodNutrients?.find((fn: any) => 
              fn.nutrientName === nutrient.key
            );
            const val = n ? Math.round((n.value || 0) * multiplier * 10) / 10 : null;
            const unit2 = nutrient.unitName === 'MG' ? 'mg' : 'g';
            if (val === null) return null;
            return (
              <View key={nutrient.key} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderTopWidth: 1, borderTopColor: theme.borderSubtle }}>
                <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'DMSans_400Regular' }}>{nutrient.label}</Text>
                <Text style={{ fontSize: 12, color: theme.textPrimary, fontFamily: 'DMSans_500Medium' }}>{val}{unit2}</Text>
              </View>
            );
          })}
        </View>

        {calPer100g === 0 && (
          <Text style={styles.noDataText}>No detailed nutrition data. Calories will be logged as entered.</Text>
        )}
{/* Timestamp */}
        <TouchableOpacity style={styles.mealSelector} onPress={() => setShowTimePicker(true)}>
          <Text style={styles.mealSelectorLabel}>Time logged</Text>
          <Text style={styles.mealSelectorValue}>
            {entryTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ▼
          </Text>
        </TouchableOpacity>

        {showTimePicker && (
          <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                <Text style={{ color: theme.textMuted, fontSize: 12, fontFamily: 'DMSans_500Medium' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                <Text style={{ color: theme.accentGreen, fontSize: 12, fontFamily: 'DMSans_600SemiBold' }}>Confirm</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              mode="time"
              value={entryTime}
              display="spinner"
              textColor={theme.textPrimary}
              onChange={(event, date) => {
                if (date) setEntryTime(date);
              }}
            />
          </View>
        )}

       {/* Meal selector */}
<TouchableOpacity 
  style={styles.mealSelector}
  onPress={() => setShowMealPicker(true)}>
  <Text style={styles.mealSelectorLabel}>Adding to</Text>
  <Text style={styles.mealSelectorValue}>{currentMeal} ▼</Text>
</TouchableOpacity>

<TouchableOpacity style={styles.logBtn} onPress={saveEntry}>
  <Text style={styles.logBtnText}>
    {isRecipeMode ? 'ADD TO RECIPE' : isEditing ? `UPDATE ENTRY` : `ADD TO DIARY`}
  </Text>
</TouchableOpacity>

        {isEditing && (
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => {
              Alert.alert(
                'Remove Entry',
                'Remove this entry from your log?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Remove', style: 'destructive', onPress: async () => {
                    try {
                      const saved = await AsyncStorage.getItem(`pj_${date}`);
                      const current = saved ? JSON.parse(saved) : {};
                      const entries = (current.entries || []).filter((_: any, i: number) => i !== parseInt(entryIndex));
                      await AsyncStorage.setItem(`pj_${date}`, JSON.stringify({ ...current, entries }));
                      await saveToFirebase(date, 'entries', entries);
                      showToast('Removed from log', undefined, 'success');
                      router.back();
                    } catch (e) {
                      console.log('Delete error', e);
                    }
                  }},
                ]
              );
            }}>
            <Text style={styles.deleteBtnText}>Remove Entry</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Meal Picker Modal */}
      <Modal visible={showMealPicker} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowMealPicker(false)}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Add to which meal?</Text>
            {['Morning', 'Lunch', 'Dinner', 'Snacks'].map(m => (
              <TouchableOpacity
                key={m}
                style={[styles.mealOption, currentMeal === m && styles.mealOptionActive]}
                onPress={() => { setCurrentMeal(m); setShowMealPicker(false); }}>
                <Text style={[styles.mealOptionText, currentMeal === m && { color: theme.accentGreen }]}>{m}</Text>
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
  backBtn: { padding: 4, width: 60 },
  backBtnText: { color: theme.accentBlue, fontSize: 14, fontFamily: 'DMSans_500Medium' },
  headerTitle: { fontSize: 20, color: theme.textPrimary, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1, flex: 1, textAlign: 'center' },
  content: { padding: 16 },
  foodName: { fontSize: 18, color: theme.textPrimary, fontFamily: 'DMSans_600SemiBold', marginBottom: 20, lineHeight: 24 },
  unitRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  unitBtn: { flex: 1, padding: 10, backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 6, alignItems: 'center' },
  unitBtnActive: { backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder },
  unitBtnText: { fontSize: 14, color: theme.textMuted, fontFamily: 'DMSans_600SemiBold' },
  unitBtnTextActive: { color: theme.accentBlue },
  amountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  amountLabel: { fontSize: 14, color: theme.textMuted, fontFamily: 'DMSans_400Regular' },
  amountInput: { backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, color: theme.textPrimary, padding: 12, fontSize: 24, fontFamily: 'BebasNeue_400Regular', width: 120, textAlign: 'center' },
  nutritionCard: { backgroundColor: theme.bgCard, borderWidth: 1, borderColor: theme.borderCard, borderRadius: 10, padding: 16, marginBottom: 20 },
  nutritionTitle: { fontSize: 11, color: theme.textMuted, fontFamily: 'DMSans_500Medium', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 },
  nutritionRow: { flexDirection: 'row', justifyContent: 'space-between' },
  nutritionStat: { alignItems: 'center', flex: 1 },
  nutritionVal: { fontSize: 28, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1 },
  nutritionLabel: { fontSize: 10, color: theme.textMuted, fontFamily: 'DMSans_400Regular', marginTop: 2 },
  noDataText: { fontSize: 12, color: theme.textMuted, fontStyle: 'italic', fontFamily: 'DMSans_400Regular', marginBottom: 16, textAlign: 'center' },
  logBtn: { backgroundColor: theme.accentGreen, borderRadius: 10, padding: 16, alignItems: 'center', marginBottom: 12 },
  logBtnText: { color: theme.bgPrimary, fontSize: 18, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2 },
  deleteBtn: { padding: 16, alignItems: 'center' },
  deleteBtnText: { color: theme.accentRed, fontSize: 14, fontFamily: 'DMSans_500Medium' },
  mealSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, padding: 12, marginBottom: 10 },
  mealSelectorLabel: { fontSize: 12, color: theme.textMuted, fontFamily: 'DMSans_400Regular' },
  mealSelectorValue: { fontSize: 14, color: theme.accentBlue, fontFamily: 'DMSans_600SemiBold' },
  modalOverlay: { flex: 1, backgroundColor: theme.overlayBg, justifyContent: 'flex-end' },
  modal: { backgroundColor: theme.bgCard, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 24, borderWidth: 1, borderColor: theme.borderCard },
  modalTitle: { fontSize: 18, color: theme.textPrimary, fontFamily: 'DMSans_600SemiBold', marginBottom: 16 },
  mealOption: { padding: 16, borderBottomWidth: 1, borderBottomColor: theme.borderSubtle, alignItems: 'center' },
  mealOptionActive: { backgroundColor: theme.accentGreenBg },
  mealOptionText: { fontSize: 16, color: theme.textSecondary, fontFamily: 'DMSans_500Medium' },
});