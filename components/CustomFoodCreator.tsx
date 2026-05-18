import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { saveToFirebase } from '../firebaseConfig';
import { useTheme } from '../theme';
import { useToast } from './Toast';

interface CustomFoodCreatorProps {
  visible: boolean;
  onClose: () => void;
  onSaved?: (food: any) => void;
  title?: string;
  prefill?: {
    name?: string;
    brand?: string;
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
    cholesterol?: number;
    saturatedFat?: number;
    servingGrams?: number;
    servingLabel?: string;
  };
}

export default function CustomFoodCreator({ visible, onClose, onSaved, title, prefill }: CustomFoodCreatorProps) {
  const { theme } = useTheme();
  const { showToast } = useToast();
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.95)).current;

  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [brand, setBrand] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [fiber, setFiber] = useState('');
  const [sugar, setSugar] = useState('');
  const [sodium, setSodium] = useState('');
  const [cholesterol, setCholesterol] = useState('');
  const [saturatedFat, setSaturatedFat] = useState('');
  const [servingGrams, setServingGrams] = useState('');
  const [servingLabel, setServingLabel] = useState('');
  const [showOptional, setShowOptional] = useState(false);
  const optionalHeight = useRef(new Animated.Value(0)).current;
  const optionalMeasured = useRef(0);
  const prefillExpanded = useRef(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      if (prefill) {
        setName(prefill.name || '');
        setBrand(prefill.brand || '');
        setCalories(prefill.calories?.toString() || '');
        setProtein(prefill.protein?.toString() || '');
        setCarbs(prefill.carbs?.toString() || '');
        setFat(prefill.fat?.toString() || '');
        setFiber(prefill.fiber?.toString() || '');
        setSugar(prefill.sugar?.toString() || '');
        setSodium(prefill.sodium?.toString() || '');
        setCholesterol(prefill.cholesterol?.toString() || '');
        setSaturatedFat(prefill.saturatedFat?.toString() || '');
        setServingGrams(prefill.servingGrams?.toString() || '');
        setServingLabel(prefill.servingLabel || '');
        const hasOptional = !!(prefill.protein || prefill.carbs || prefill.fat || prefill.fiber || prefill.sugar || prefill.sodium || prefill.servingGrams);
        if (hasOptional) {
          setShowOptional(true);
          optionalHeight.setValue(9999);
          prefillExpanded.current = true;
        }
      }
      Animated.parallel([
        Animated.timing(overlayOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(cardScale, { toValue: 1, useNativeDriver: true, friction: 8, tension: 100 }),
      ]).start();
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(overlayOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(cardScale, { toValue: 0.95, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      resetForm();
      onClose();
    });
  };

  const resetForm = () => {
    setName(''); setBrand(''); setCalories('');
    setProtein(''); setCarbs(''); setFat('');
    setFiber(''); setSugar(''); setSodium('');
    setCholesterol(''); setSaturatedFat('');
    setServingGrams(''); setServingLabel('');
    setShowOptional(false);
    optionalHeight.setValue(0);
    optionalMeasured.current = 0;
    prefillExpanded.current = false;
    cardScale.setValue(0.95);
  };

  const toggleOptional = () => {
    const toValue = showOptional ? 0 : optionalMeasured.current;
    Animated.timing(optionalHeight, { toValue, duration: 250, useNativeDriver: false }).start();
    setShowOptional(v => !v);
  };

  const canSave = name.trim().length > 0 && calories.trim().length > 0 && parseInt(calories) > 0;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const saved = await AsyncStorage.getItem('pj_my_foods');
      const existing = saved ? JSON.parse(saved) : [];
      const id = `custom_${Date.now().toString(36)}${Math.random().toString(36).substr(2, 4)}`;
      const grams = parseFloat(servingGrams) || 100;
      const newFood: any = {
        id,
        name: name.trim(),
        cal: parseInt(calories),
        ...(brand.trim() ? { brand: brand.trim() } : {}),
        ...(protein ? { protein: parseFloat(protein) } : {}),
        ...(carbs ? { carbs: parseFloat(carbs) } : {}),
        ...(fat ? { fat: parseFloat(fat) } : {}),
        ...(fiber ? { fiber: parseFloat(fiber) } : {}),
        ...(sugar ? { sugar: parseFloat(sugar) } : {}),
        ...(sodium ? { sodium: parseFloat(sodium) } : {}),
        ...(cholesterol ? { cholesterol: parseFloat(cholesterol) } : {}),
        ...(saturatedFat ? { saturatedFat: parseFloat(saturatedFat) } : {}),
        servingSize: grams,
        servingUnit: servingLabel.trim() || `${grams}g`,
        calPer100g: Math.round((parseInt(calories) / grams) * 100),
        proteinPer100g: protein ? Math.round((parseFloat(protein) / grams) * 100 * 10) / 10 : 0,
        carbsPer100g: carbs ? Math.round((parseFloat(carbs) / grams) * 100 * 10) / 10 : 0,
        fatPer100g: fat ? Math.round((parseFloat(fat) / grams) * 100 * 10) / 10 : 0,
        isCustom: true,
        foodNutrients: [
          { nutrientName: 'Energy', unitName: 'KCAL', value: parseInt(calories) },
          { nutrientName: 'Protein', unitName: 'G', value: parseFloat(protein) || 0 },
          { nutrientName: 'Carbohydrate, by difference', unitName: 'G', value: parseFloat(carbs) || 0 },
          { nutrientName: 'Total lipid (fat)', unitName: 'G', value: parseFloat(fat) || 0 },
          { nutrientName: 'Fiber, total dietary', unitName: 'G', value: parseFloat(fiber) || 0 },
          { nutrientName: 'Sugars, total including NLEA', unitName: 'G', value: parseFloat(sugar) || 0 },
          { nutrientName: 'Sodium, Na', unitName: 'MG', value: parseFloat(sodium) || 0 },
          { nutrientName: 'Cholesterol', unitName: 'MG', value: parseFloat(cholesterol) || 0 },
          { nutrientName: 'Fatty acids, total saturated', unitName: 'G', value: parseFloat(saturatedFat) || 0 },
        ],
      };
      const updated = [...existing, newFood].sort((a, b) => a.name.localeCompare(b.name));
      await AsyncStorage.setItem('pj_my_foods', JSON.stringify(updated));
      await saveToFirebase('my_foods', 'foods', updated);
      showToast('Food saved', name.trim(), 'success');
      onSaved?.(newFood);
      handleClose();
    } catch (e) {
      console.log('CustomFoodCreator save error', e);
      showToast('Save failed', 'Please try again', 'info');
    } finally {
      setSaving(false);
    }
  };

  const s = styles(theme);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <Animated.View style={[s.overlay, { opacity: overlayOpacity }]}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={handleClose} />
          <Animated.View style={[s.card, { transform: [{ scale: cardScale }] }]}>
            <View style={s.header}>
              <Text style={s.title}>{title ? title.toUpperCase() : 'CREATE FOOD'}</Text>
              <TouchableOpacity onPress={handleClose} style={s.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={20} color={theme.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={s.requiredNote}>* Required</Text>
              <View style={s.fieldRow}>
                <Text style={s.fieldLabel}>Food Name <Text style={s.requiredStar}>*</Text></Text>
                <TextInput style={s.input} placeholder="e.g. Chicken Breast" placeholderTextColor={theme.textPlaceholder} value={name} onChangeText={setName} autoCapitalize="words" />
              </View>
              <View style={s.fieldRow}>
                <Text style={s.fieldLabel}>Brand</Text>
                <TextInput style={s.input} placeholder="e.g. Tyson" placeholderTextColor={theme.textPlaceholder} value={brand} onChangeText={setBrand} autoCapitalize="words" />
              </View>
              <View style={s.twoCol}>
                <View style={[s.fieldRow, { flex: 1 }]}>
                  <Text style={s.fieldLabel}>Calories <Text style={s.unitText}>kcal</Text> <Text style={s.requiredStar}>*</Text></Text>
                  <TextInput style={s.input} placeholder="0" placeholderTextColor={theme.textPlaceholder} value={calories} onChangeText={setCalories} keyboardType="number-pad" />
                </View>
                <View style={[s.fieldRow, { flex: 1 }]}>
                  <Text style={s.fieldLabel}>Serving <Text style={s.unitText}>g</Text></Text>
                  <TextInput style={s.input} placeholder="100" placeholderTextColor={theme.textPlaceholder} value={servingGrams} onChangeText={setServingGrams} keyboardType="decimal-pad" />
                </View>
              </View>
              <View style={s.fieldRow}>
                <Text style={s.fieldLabel}>Serving Label</Text>
                <TextInput style={s.input} placeholder="e.g. 1 scoop, 1 cup" placeholderTextColor={theme.textPlaceholder} value={servingLabel} onChangeText={setServingLabel} />
              </View>
              <TouchableOpacity style={s.optionalToggle} onPress={toggleOptional}>
                <Text style={s.optionalToggleText}>Macros &amp; Extended Nutrition</Text>
                <Ionicons name={showOptional ? 'chevron-up' : 'chevron-down'} size={14} color={theme.accentBlue} />
              </TouchableOpacity>
              <Animated.View style={{ overflow: 'hidden', height: optionalHeight }}>
                <View
                  onLayout={e => {
                    const h = e.nativeEvent.layout.height;
                    if (h > 0) {
                      optionalMeasured.current = h;
                      if (prefillExpanded.current) {
                        optionalHeight.setValue(h);
                        prefillExpanded.current = false;
                      }
                    }
                  }}
                  style={{ position: showOptional ? 'relative' : 'absolute', opacity: showOptional ? 1 : 0 }}>
                  <Text style={[s.sectionLabel, { marginTop: 12 }]}>MACROS</Text>
                  <View style={s.twoCol}>
                    <View style={[s.fieldRow, { flex: 1 }]}>
                      <Text style={s.fieldLabel}>Protein <Text style={s.unitText}>g</Text></Text>
                      <TextInput style={s.input} placeholder="0" placeholderTextColor={theme.textPlaceholder} value={protein} onChangeText={setProtein} keyboardType="decimal-pad" />
                    </View>
                    <View style={[s.fieldRow, { flex: 1 }]}>
                      <Text style={s.fieldLabel}>Carbs <Text style={s.unitText}>g</Text></Text>
                      <TextInput style={s.input} placeholder="0" placeholderTextColor={theme.textPlaceholder} value={carbs} onChangeText={setCarbs} keyboardType="decimal-pad" />
                    </View>
                    <View style={[s.fieldRow, { flex: 1 }]}>
                      <Text style={s.fieldLabel}>Fat <Text style={s.unitText}>g</Text></Text>
                      <TextInput style={s.input} placeholder="0" placeholderTextColor={theme.textPlaceholder} value={fat} onChangeText={setFat} keyboardType="decimal-pad" />
                    </View>
                  </View>
                  <Text style={[s.sectionLabel, { marginTop: 12 }]}>EXTENDED</Text>
                  <View style={s.twoCol}>
                    <View style={[s.fieldRow, { flex: 1 }]}>
                      <Text style={s.fieldLabel}>Fiber <Text style={s.unitText}>g</Text></Text>
                      <TextInput style={s.input} placeholder="0" placeholderTextColor={theme.textPlaceholder} value={fiber} onChangeText={setFiber} keyboardType="decimal-pad" />
                    </View>
                    <View style={[s.fieldRow, { flex: 1 }]}>
                      <Text style={s.fieldLabel}>Sugar <Text style={s.unitText}>g</Text></Text>
                      <TextInput style={s.input} placeholder="0" placeholderTextColor={theme.textPlaceholder} value={sugar} onChangeText={setSugar} keyboardType="decimal-pad" />
                    </View>
                    <View style={[s.fieldRow, { flex: 1 }]}>
                      <Text style={s.fieldLabel}>Sodium <Text style={s.unitText}>mg</Text></Text>
                      <TextInput style={s.input} placeholder="0" placeholderTextColor={theme.textPlaceholder} value={sodium} onChangeText={setSodium} keyboardType="decimal-pad" />
                    </View>
                    <View style={[s.fieldRow, { flex: 1 }]}>
                      <Text style={s.fieldLabel}>Chol. <Text style={s.unitText}>mg</Text></Text>
                      <TextInput style={s.input} placeholder="0" placeholderTextColor={theme.textPlaceholder} value={cholesterol} onChangeText={setCholesterol} keyboardType="decimal-pad" />
                    </View>
                    <View style={[s.fieldRow, { flex: 1 }]}>
                      <Text style={s.fieldLabel}>Sat. Fat <Text style={s.unitText}>g</Text></Text>
                      <TextInput style={s.input} placeholder="0" placeholderTextColor={theme.textPlaceholder} value={saturatedFat} onChangeText={setSaturatedFat} keyboardType="decimal-pad" />
                    </View>
                  </View>
                </View>
              </Animated.View>
              <TouchableOpacity style={[s.saveBtn, !canSave && s.saveBtnDim]} onPress={handleSave} disabled={!canSave || saving}>
                <Text style={s.saveBtnText}>{saving ? 'SAVING...' : 'SAVE FOOD'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = (theme: any) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: theme.overlayBg, justifyContent: 'center', alignItems: 'center', padding: 20 },
  cardWrapper: { width: '100%' },
  card: {
    backgroundColor: theme.bgSheet,
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: theme.borderCard,
    borderTopColor: theme.borderCardTop,
    width: '100%',
    height: 560,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 18, paddingBottom: 14,
    borderBottomWidth: 0.5, borderBottomColor: theme.borderCard,
  },
  title: { fontSize: 20, color: theme.accentBlueRaw, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2 },
  closeBtn: { padding: 4 },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 24 },
  sectionLabel: { fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: theme.textMuted, fontFamily: 'DMSans_700Bold', marginBottom: 10 },
  fieldRow: { marginBottom: 12 },
  fieldLabel: { fontSize: 12, color: theme.textSecondary, fontFamily: 'DMSans_500Medium', marginBottom: 5 },
  unitText: { color: theme.textMuted, fontSize: 11 },
  dimText: { color: theme.textDim, fontSize: 11 },
  requiredStar: { color: theme.accentRed || '#cc3333', fontSize: 12 },
  requiredNote: { fontSize: 10, color: theme.accentRed || '#cc3333', fontFamily: 'DMSans_400Regular', marginBottom: 12 },
  input: { backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, color: theme.textPrimary, padding: 10, fontSize: 14, fontFamily: 'DMSans_400Regular' },
  twoCol: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  optionalToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 4 },
  optionalToggleText: { fontSize: 13, color: theme.accentBlue, fontFamily: 'DMSans_600SemiBold' },
  saveBtn: { backgroundColor: theme.accentGreen, borderRadius: 10, padding: 15, alignItems: 'center', marginTop: 16 },
  saveBtnDim: { opacity: 0.35 },
  saveBtnText: { color: theme.bgPrimary, fontSize: 18, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2 },
});