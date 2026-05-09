import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { saveToFirebase } from '../firebaseConfig';
import { useTheme } from '../theme';

export default function EditFoodScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { foodJson } = useLocalSearchParams<{ foodJson: string }>();
  const food = foodJson ? JSON.parse(foodJson) : null;
  const rawFood = food?.myFoodData || food;
  console.log('rawFood:', JSON.stringify(rawFood));
console.log('food:', JSON.stringify(food));

  const [name, setName] = useState(rawFood?.name || food?.description || '');
  const [cal, setCal] = useState(rawFood?.cal?.toString() || '');
  const [protein, setProtein] = useState(rawFood?.protein?.toString() || '');
  const [carbs, setCarbs] = useState(rawFood?.carbs?.toString() || '');
  const [fat, setFat] = useState(rawFood?.fat?.toString() || '');
  const [fiber, setFiber] = useState(rawFood?.fiber?.toString() || '');
  const [sugar, setSugar] = useState(rawFood?.sugar?.toString() || '');
  const [sodium, setSodium] = useState(rawFood?.sodium?.toString() || '');
  const [cholesterol, setCholesterol] = useState(rawFood?.cholesterol?.toString() || '');
  const [saturatedFat, setSaturatedFat] = useState(rawFood?.saturatedFat?.toString() || '');

  if (!food) return null;

  const save = async () => {
    if (!name.trim() || !cal) return;
    try {
      const saved = await AsyncStorage.getItem('pj_my_foods');
      const myFoods = saved ? JSON.parse(saved) : [];
      const updated = myFoods.map((f: any) =>
        f.name === food.name ? {
          ...f,
          name: name.trim(),
          cal: parseInt(cal) || 0,
          protein: parseFloat(protein) || 0,
          carbs: parseFloat(carbs) || 0,
          fat: parseFloat(fat) || 0,
          fiber: parseFloat(fiber) || 0,
          sugar: parseFloat(sugar) || 0,
          sodium: parseFloat(sodium) || 0,
          cholesterol: parseFloat(cholesterol) || 0,
          saturatedFat: parseFloat(saturatedFat) || 0,
        } : f
      );
      await AsyncStorage.setItem('pj_my_foods', JSON.stringify(updated));
      await saveToFirebase('my_foods', 'foods', updated);
      router.back();
    } catch (e) {
      console.log('Save error', e);
    }
  };

  const fields = [
    { label: 'Food Name', value: name, onChange: setName, keyboard: 'default' as const },
    { label: 'Calories (kcal)', value: cal, onChange: setCal, keyboard: 'decimal-pad' as const },
    { label: 'Protein (g)', value: protein, onChange: setProtein, keyboard: 'decimal-pad' as const },
    { label: 'Carbs (g)', value: carbs, onChange: setCarbs, keyboard: 'decimal-pad' as const },
    { label: 'Fat (g)', value: fat, onChange: setFat, keyboard: 'decimal-pad' as const },
    { label: 'Fiber (g)', value: fiber, onChange: setFiber, keyboard: 'decimal-pad' as const },
    { label: 'Sugar (g)', value: sugar, onChange: setSugar, keyboard: 'decimal-pad' as const },
    { label: 'Sodium (mg)', value: sodium, onChange: setSodium, keyboard: 'decimal-pad' as const },
    { label: 'Cholesterol (mg)', value: cholesterol, onChange: setCholesterol, keyboard: 'decimal-pad' as const },
    { label: 'Saturated Fat (g)', value: saturatedFat, onChange: setSaturatedFat, keyboard: 'decimal-pad' as const },
  ];

  const styles = useStyles(theme);
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Food</Text>
          <TouchableOpacity style={styles.saveBtn} onPress={save}>
            <Text style={styles.saveBtnText}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardDismissMode="on-drag">
          {fields.map(field => (
            <View key={field.label} style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>{field.label}</Text>
              <TextInput
                style={styles.fieldInput}
                value={field.value}
                onChangeText={field.onChange}
                keyboardType={field.keyboard}
                placeholderTextColor="#444444"
                selectTextOnFocus
              />
            </View>
          ))}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
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
  fieldRow: { marginBottom: 16 },
  fieldLabel: { fontSize: 11, color: theme.textMuted, fontFamily: 'DMSans_500Medium', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 },
  fieldInput: { backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, color: theme.textPrimary, padding: 12, fontSize: 16, fontFamily: 'DMSans_400Regular' },
});