import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { saveToFirebase } from '../firebaseConfig';

function MacroDonut({ protein, carbs, fat, calories }: { protein: number; carbs: number; fat: number; calories: number }) {
  const size = 100;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = protein + carbs + fat;
  

  if (total === 0) {
    return (
      <View style={{ alignItems: 'center', justifyContent: 'center', width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle cx={size/2} cy={size/2} r={radius} stroke="#2a2a2a" strokeWidth={strokeWidth} fill="none" />
        </Svg>
        <View style={{ position: 'absolute', alignItems: 'center' }}>
          <Text style={{ color: '#333333', fontSize: 10, fontFamily: 'DMSans_400Regular' }}>--</Text>
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
        <Circle cx={size/2} cy={size/2} r={radius} stroke="#2a2a2a" strokeWidth={strokeWidth} fill="none" />
        <Circle cx={size/2} cy={size/2} r={radius} stroke="#10b981" strokeWidth={strokeWidth} fill="none"
          strokeDasharray={`${proteinDash} ${circumference}`} strokeDashoffset={0} strokeLinecap="butt" />
        <Circle cx={size/2} cy={size/2} r={radius} stroke="#f59e0b" strokeWidth={strokeWidth} fill="none"
          strokeDasharray={`${carbsDash} ${circumference}`} strokeDashoffset={carbsOffset} strokeLinecap="butt" />
        <Circle cx={size/2} cy={size/2} r={radius} stroke="#ef4444" strokeWidth={strokeWidth} fill="none"
          strokeDasharray={`${fatDash} ${circumference}`} strokeDashoffset={fatOffset} strokeLinecap="butt" />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={{ color: '#ffffff', fontSize: 14, fontFamily: 'BebasNeue_400Regular' }}>{calories}</Text>
        <Text style={{ color: '#888888', fontSize: 8, fontFamily: 'DMSans_400Regular' }}>kcal</Text>
      </View>
    </View>
  );
}
export default function FoodDetailScreen() {
  const insets = useSafeAreaInsets();
  const { foodJson, meal, date, entryIndex, recipeMode } = useLocalSearchParams<{ 
    foodJson: string; 
    meal: string; 
    date: string;
    entryIndex: string;
    recipeMode: string;
  }>();
const isRecipeMode = recipeMode === 'true';
  const food = foodJson ? JSON.parse(foodJson) : null;
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
      router.back();
      if (!isEditing) router.back();
    } catch (e) {
      console.log('Save error', e);
    }
  };

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
              style={{ backgroundColor: 'rgba(59,130,246,0.15)', borderWidth: 1, borderColor: 'rgba(59,130,246,0.3)', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 }}
              onPress={() => router.push({ pathname: '/edit-food', params: { foodJson: JSON.stringify(food) } })}>
              <Text style={{ color: '#3b82f6', fontSize: 13, fontFamily: 'DMSans_600SemiBold' }}>Edit</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={toggleFav} style={{ padding: 4 }}>
            <Text style={{ fontSize: 22, color: isFav ? '#f59e0b' : '#444444' }}>★</Text>
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
            <MacroDonut protein={protein} carbs={carbs} fat={fat} calories={calories} />
            <View style={{ flex: 1, gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981' }} />
                <Text style={{ color: '#888888', fontSize: 12, fontFamily: 'DMSans_400Regular', flex: 1 }}>Protein</Text>
                <Text style={{ color: '#10b981', fontSize: 15, fontFamily: 'BebasNeue_400Regular' }}>{protein}g</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#f59e0b' }} />
                <Text style={{ color: '#888888', fontSize: 12, fontFamily: 'DMSans_400Regular', flex: 1 }}>Carbs</Text>
                <Text style={{ color: '#f59e0b', fontSize: 15, fontFamily: 'BebasNeue_400Regular' }}>{carbs}g</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444' }} />
                <Text style={{ color: '#888888', fontSize: 12, fontFamily: 'DMSans_400Regular', flex: 1 }}>Fat</Text>
                <Text style={{ color: '#ef4444', fontSize: 15, fontFamily: 'BebasNeue_400Regular' }}>{fat}g</Text>
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
              <View key={nutrient.key} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderTopWidth: 1, borderTopColor: '#1e1e1e' }}>
                <Text style={{ fontSize: 12, color: '#999999', fontFamily: 'DMSans_400Regular' }}>{nutrient.label}</Text>
                <Text style={{ fontSize: 12, color: '#e8e8e8', fontFamily: 'DMSans_500Medium' }}>{val}{unit2}</Text>
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
                <Text style={{ color: '#999999', fontSize: 12, fontFamily: 'DMSans_500Medium' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                <Text style={{ color: '#10b981', fontSize: 12, fontFamily: 'DMSans_600SemiBold' }}>Confirm</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              mode="time"
              value={entryTime}
              display="spinner"
              textColor="#ffffff"
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
            onPress={async () => {
              try {
                const saved = await AsyncStorage.getItem(`pj_${date}`);
                const current = saved ? JSON.parse(saved) : {};
                const entries = (current.entries || []).filter((_: any, i: number) => i !== parseInt(entryIndex));
                await AsyncStorage.setItem(`pj_${date}`, JSON.stringify({ ...current, entries }));
                await saveToFirebase(date, 'entries', entries);
                router.back();
              } catch (e) {
                console.log('Delete error', e);
              }
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
                <Text style={[styles.mealOptionText, currentMeal === m && { color: '#10b981' }]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080808' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#222222' },
  backBtn: { padding: 4, width: 60 },
  backBtnText: { color: '#3b82f6', fontSize: 14, fontFamily: 'DMSans_500Medium' },
  headerTitle: { fontSize: 20, color: '#ffffff', fontFamily: 'BebasNeue_400Regular', letterSpacing: 1, flex: 1, textAlign: 'center' },
  content: { padding: 16 },
  foodName: { fontSize: 18, color: '#ffffff', fontFamily: 'DMSans_600SemiBold', marginBottom: 20, lineHeight: 24 },
  unitRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  unitBtn: { flex: 1, padding: 10, backgroundColor: '#161616', borderWidth: 1, borderColor: '#2a2a2a', borderRadius: 6, alignItems: 'center' },
  unitBtnActive: { backgroundColor: 'rgba(59,130,246,0.15)', borderColor: 'rgba(59,130,246,0.4)' },
  unitBtnText: { fontSize: 14, color: '#888888', fontFamily: 'DMSans_600SemiBold' },
  unitBtnTextActive: { color: '#3b82f6' },
  amountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  amountLabel: { fontSize: 14, color: '#888888', fontFamily: 'DMSans_400Regular' },
  amountInput: { backgroundColor: '#161616', borderWidth: 1, borderColor: '#2a2a2a', borderRadius: 8, color: '#ffffff', padding: 12, fontSize: 24, fontFamily: 'BebasNeue_400Regular', width: 120, textAlign: 'center' },
  nutritionCard: { backgroundColor: '#161616', borderWidth: 1, borderColor: '#2a2a2a', borderRadius: 10, padding: 16, marginBottom: 20 },
  nutritionTitle: { fontSize: 11, color: '#888888', fontFamily: 'DMSans_500Medium', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 },
  nutritionRow: { flexDirection: 'row', justifyContent: 'space-between' },
  nutritionStat: { alignItems: 'center', flex: 1 },
  nutritionVal: { fontSize: 28, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1 },
  nutritionLabel: { fontSize: 10, color: '#888888', fontFamily: 'DMSans_400Regular', marginTop: 2 },
  noDataText: { fontSize: 12, color: '#888888', fontStyle: 'italic', fontFamily: 'DMSans_400Regular', marginBottom: 16, textAlign: 'center' },
  logBtn: { backgroundColor: '#10b981', borderRadius: 10, padding: 16, alignItems: 'center', marginBottom: 12 },
  logBtnText: { color: '#000000', fontSize: 18, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2 },
  deleteBtn: { padding: 16, alignItems: 'center' },
  deleteBtnText: { color: '#ef4444', fontSize: 14, fontFamily: 'DMSans_500Medium' },
  mealSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#161616', borderWidth: 1, borderColor: '#2a2a2a', borderRadius: 8, padding: 12, marginBottom: 10 },
  mealSelectorLabel: { fontSize: 12, color: '#999999', fontFamily: 'DMSans_400Regular' },
  mealSelectorValue: { fontSize: 14, color: '#3b82f6', fontFamily: 'DMSans_600SemiBold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#161616', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 24, borderWidth: 1, borderColor: '#2a2a2a' },
  modalTitle: { fontSize: 18, color: '#ffffff', fontFamily: 'DMSans_600SemiBold', marginBottom: 16 },
  mealOption: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#2a2a2a', alignItems: 'center' },
  mealOptionActive: { backgroundColor: 'rgba(16,185,129,0.1)' },
  mealOptionText: { fontSize: 16, color: '#e8e8e8', fontFamily: 'DMSans_500Medium' },
});