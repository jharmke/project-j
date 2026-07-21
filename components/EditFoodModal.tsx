import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import { useEffect, useRef } from 'react';
import { Animated, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../theme';
import { Type } from '../typography';
import ModalHeader from './ModalHeader';
import PrimaryCTA from './PrimaryCTA';
import ButtonShine from './ButtonShine';
import NutrientFieldsGrid from './NutrientFieldsGrid';
import GradientIcon from './GradientIcon';
import GradientNumber from './GradientNumber';

const FOOD_SERVING_UNITS = ['g', 'ml', 'fl oz', 'oz', 'container', 'serving', 'tbsp', 'tsp', 'cup'];
const SUPPLEMENT_ONLY_UNITS = ['pill', 'capsule', 'tablet', 'softgel', 'gummy'];
const EDIT_SERVING_UNITS = [...FOOD_SERVING_UNITS, ...SUPPLEMENT_ONLY_UNITS];

const filterDecimal = (v: string) => {
  const stripped = v.replace(/[^0-9.]/g, '');
  const dot = stripped.indexOf('.');
  if (dot === -1) return stripped;
  return stripped.slice(0, dot + 1) + stripped.slice(dot + 1).replace(/\./g, '').slice(0, 1);
};

interface EditFoodModalProps {
  visible: boolean;
  editFoodData: any;
  setEditFoodData: (updater: (p: any) => any) => void;
  onSave: () => void;
  onClose: () => void;
}

export default function EditFoodModal({ visible, editFoodData, setEditFoodData, onSave, onClose }: EditFoodModalProps) {
  const { theme } = useTheme();
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      overlayAnim.setValue(0);
      cardAnim.setValue(0);
      Animated.parallel([
        Animated.timing(overlayAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.spring(cardAnim, { toValue: 1, useNativeDriver: true, damping: 20, stiffness: 300 }),
      ]).start();
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(overlayAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(cardAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  const set = (key: string, v: any) => setEditFoodData((p: any) => p ? { ...p, [key]: v } : null);
  const setNum = (key: string) => (v: string) => set(key, filterDecimal(v));

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', opacity: overlayAnim }}>
        <TouchableOpacity style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} activeOpacity={1} onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); handleClose(); }} />
        <Animated.View style={{
          width: '92%',
          backgroundColor: theme.bgSheet,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: theme.borderCard,
          borderTopWidth: 1.5,
          borderTopColor: theme.accentBlueRaw,
          shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16,
          transform: [{ scale: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] }) }],
        }}>
          <ModalHeader title="Edit Food" subtitle="Scroll for all nutrients" onClose={handleClose} />
          <ScrollView style={{ maxHeight: 580 }} contentContainerStyle={{ padding: 16, paddingTop: 8 }} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets={true}>
            {/* Type selector */}
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
              <TouchableOpacity
                onPress={() => {
                  triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                  set('type', 'food');
                  // A supplement-only unit (capsule, pill, etc.) no longer has a home in Food's
                  // shorter list -- reset to the default rather than leave a "selected" unit
                  // that isn't even shown anymore.
                  if (SUPPLEMENT_ONLY_UNITS.includes(editFoodData?.servingUnitType)) set('servingUnitType', 'g');
                }}
                style={{ flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, backgroundColor: editFoodData?.type !== 'supplement' ? theme.accentBlueBg : theme.bgInput, borderColor: editFoodData?.type !== 'supplement' ? theme.accentBlueBorder : theme.borderInput }}
              >
                <GradientIcon name="nutrition" size={16} color={editFoodData?.type !== 'supplement' ? theme.accentBlue : theme.textMuted} />
                <GradientNumber value="Food" color={editFoodData?.type !== 'supplement' ? theme.accentBlue : theme.textMuted} style={{ fontSize: 12, fontFamily: Type.uiSemibold, marginTop: 3 }} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); set('type', 'supplement'); }}
                style={{ flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, backgroundColor: editFoodData?.type === 'supplement' ? theme.accentBlueBg : theme.bgInput, borderColor: editFoodData?.type === 'supplement' ? theme.accentBlueBorder : theme.borderInput }}
              >
                <GradientIcon name="medical" size={16} color={editFoodData?.type === 'supplement' ? theme.accentBlue : theme.textMuted} />
                <GradientNumber value="Supplement" color={editFoodData?.type === 'supplement' ? theme.accentBlue : theme.textMuted} style={{ fontSize: 12, fontFamily: Type.uiSemibold, marginTop: 3 }} />
              </TouchableOpacity>
            </View>

            {/* Basic Info */}
            <Text style={{ fontSize: 9, color: theme.textSecondary, fontFamily: Type.uiBold, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 10 }}>Basic Info</Text>
            {([
              { label: 'Food Name', key: 'name', keyboard: 'default' as const },
              { label: 'Brand (optional)', key: 'brand', keyboard: 'default' as const },
              { label: 'Calories (kcal)', key: 'cal', keyboard: 'decimal-pad' as const },
            ]).map(f => (
              <View key={f.key} style={{ marginBottom: 10 }}>
                <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: Type.uiBold, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 4 }}>{f.label}</Text>
                <TextInput
                  style={{ backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, color: theme.textPrimary, padding: 12, fontSize: 15, fontFamily: Type.ui }}
                  value={editFoodData?.[f.key] || ''}
                  onChangeText={v => set(f.key, f.keyboard === 'decimal-pad' ? filterDecimal(v) : v)}
                  keyboardType={f.keyboard}
                  placeholderTextColor={theme.textDim}
                  selectTextOnFocus
                />
              </View>
            ))}

            <View style={{ height: 1, backgroundColor: theme.borderCard, marginTop: 4, marginBottom: 14 }} />
            <NutrientFieldsGrid
              sections={[
                {
                  key: 'macros', title: 'Macros', columns: 3,
                  fields: [
                    { key: 'protein', label: 'Protein', unit: 'g', value: editFoodData?.protein || '', onChange: setNum('protein'), dotColor: '#0d9268' },
                    { key: 'carbs',   label: 'Carbs',   unit: 'g', value: editFoodData?.carbs || '',   onChange: setNum('carbs'),   dotColor: '#c47d1a' },
                    { key: 'fat',     label: 'Fat',     unit: 'g', value: editFoodData?.fat || '',     onChange: setNum('fat'),     dotColor: '#a83232' },
                  ],
                },
                {
                  key: 'extendedFats', title: 'Extended Fats', columns: 2,
                  fields: [
                    { key: 'saturatedFat',       label: 'Sat. Fat',  unit: 'g', value: editFoodData?.saturatedFat || '',       onChange: setNum('saturatedFat') },
                    { key: 'polyunsaturatedFat', label: 'Poly Fat',  unit: 'g', value: editFoodData?.polyunsaturatedFat || '', onChange: setNum('polyunsaturatedFat') },
                    { key: 'monounsaturatedFat', label: 'Mono Fat',  unit: 'g', value: editFoodData?.monounsaturatedFat || '', onChange: setNum('monounsaturatedFat') },
                    { key: 'transFat',           label: 'Trans Fat', unit: 'g', value: editFoodData?.transFat || '',           onChange: setNum('transFat') },
                  ],
                },
                {
                  key: 'otherNutrients', title: 'Other Nutrients', columns: 2,
                  fields: [
                    { key: 'fiber',         label: 'Fiber',        unit: 'g',  value: editFoodData?.fiber || '',         onChange: setNum('fiber') },
                    { key: 'sugar',         label: 'Sugar',        unit: 'g',  value: editFoodData?.sugar || '',         onChange: setNum('sugar') },
                    { key: 'sugarAlcohols', label: 'Sugar Alc.',   unit: 'g',  value: editFoodData?.sugarAlcohols || '', onChange: setNum('sugarAlcohols') },
                    { key: 'addedSugars',   label: 'Added Sugars', unit: 'g',  value: editFoodData?.addedSugars || '',   onChange: setNum('addedSugars') },
                    { key: 'sodium',        label: 'Sodium',       unit: 'mg', value: editFoodData?.sodium || '',        onChange: setNum('sodium') },
                    { key: 'cholesterol',   label: 'Chol.',        unit: 'mg', value: editFoodData?.cholesterol || '',   onChange: setNum('cholesterol') },
                    { key: 'potassium',     label: 'Potassium',    unit: 'mg', value: editFoodData?.potassium || '',     onChange: setNum('potassium') },
                  ],
                },
                {
                  key: 'vitamins', title: 'Vitamins', columns: 2,
                  fields: [
                    { key: 'vitaminA', label: 'Vitamin A', unit: 'mcg', value: editFoodData?.vitaminA || '', onChange: setNum('vitaminA') },
                    { key: 'vitaminC', label: 'Vitamin C', unit: 'mg',  value: editFoodData?.vitaminC || '', onChange: setNum('vitaminC') },
                    { key: 'vitaminD', label: 'Vitamin D', unit: 'mcg', value: editFoodData?.vitaminD || '', onChange: setNum('vitaminD') },
                    { key: 'vitaminE', label: 'Vitamin E', unit: 'mg',  value: editFoodData?.vitaminE || '', onChange: setNum('vitaminE') },
                    { key: 'vitaminK', label: 'Vitamin K', unit: 'mcg', value: editFoodData?.vitaminK || '', onChange: setNum('vitaminK') },
                  ],
                },
                {
                  key: 'bVitamins', title: 'B Vitamins', columns: 2,
                  fields: [
                    { key: 'vitaminB6',  label: 'B6',         unit: 'mg',  value: editFoodData?.vitaminB6 || '',  onChange: setNum('vitaminB6') },
                    { key: 'folate',     label: 'Folate',     unit: 'mcg', value: editFoodData?.folate || '',     onChange: setNum('folate') },
                    { key: 'vitaminB12', label: 'B12',        unit: 'mcg', value: editFoodData?.vitaminB12 || '', onChange: setNum('vitaminB12') },
                    { key: 'biotin',     label: 'Biotin',     unit: 'mcg', value: editFoodData?.biotin || '',     onChange: setNum('biotin') },
                    { key: 'thiamin',    label: 'Thiamin',    unit: 'mg',  value: editFoodData?.thiamin || '',    onChange: setNum('thiamin') },
                    { key: 'riboflavin', label: 'Riboflavin', unit: 'mg',  value: editFoodData?.riboflavin || '', onChange: setNum('riboflavin') },
                    { key: 'niacin',     label: 'Niacin',     unit: 'mg',  value: editFoodData?.niacin || '',     onChange: setNum('niacin') },
                    { key: 'choline',    label: 'Choline',    unit: 'mg',  value: editFoodData?.choline || '',    onChange: setNum('choline') },
                  ],
                },
                {
                  key: 'minerals', title: 'Minerals', columns: 2,
                  fields: [
                    { key: 'calcium',   label: 'Calcium',   unit: 'mg', value: editFoodData?.calcium || '',   onChange: setNum('calcium') },
                    { key: 'iron',      label: 'Iron',      unit: 'mg', value: editFoodData?.iron || '',      onChange: setNum('iron') },
                    { key: 'magnesium', label: 'Magnesium', unit: 'mg', value: editFoodData?.magnesium || '', onChange: setNum('magnesium') },
                    { key: 'zinc',      label: 'Zinc',      unit: 'mg', value: editFoodData?.zinc || '',      onChange: setNum('zinc') },
                    { key: 'copper',    label: 'Copper',    unit: 'mg', value: editFoodData?.copper || '',    onChange: setNum('copper') },
                  ],
                },
                {
                  key: 'other', title: 'Other', columns: 2,
                  fields: [
                    { key: 'caffeine', label: 'Caffeine', unit: 'mg', value: editFoodData?.caffeine || '', onChange: setNum('caffeine') },
                  ],
                },
              ]}
            />

            {/* Serving */}
            <View style={{ height: 1, backgroundColor: theme.borderCard, marginTop: 4, marginBottom: 14 }} />
            <Text style={{ fontSize: 9, color: theme.textSecondary, fontFamily: Type.uiBold, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 10 }}>Serving</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: Type.uiBold, letterSpacing: 2, marginBottom: 4 }}>AMOUNT ({editFoodData?.servingUnitType || 'g'})</Text>
                <TextInput
                  style={{ backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, color: theme.textPrimary, paddingVertical: 10, paddingHorizontal: 8, fontSize: 14, fontFamily: Type.ui }}
                  value={editFoodData?.servingGrams || ''}
                  onChangeText={setNum('servingGrams')}
                  keyboardType="decimal-pad"
                  placeholderTextColor={theme.textDim}
                  selectTextOnFocus
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: Type.uiBold, letterSpacing: 2, marginBottom: 4 }}>LABEL (OPTIONAL)</Text>
                <TextInput
                  style={{ backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, color: theme.textPrimary, paddingVertical: 10, paddingHorizontal: 8, fontSize: 14, fontFamily: Type.ui }}
                  value={editFoodData?.servingLabel || ''}
                  onChangeText={v => set('servingLabel', v)}
                  placeholderTextColor={theme.textDim}
                  placeholder="e.g. 1 scoop"
                />
              </View>
            </View>
            <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: Type.uiBold, letterSpacing: 2, marginBottom: 8 }}>UNIT</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingRight: 4, marginBottom: 10 }}>
              {(editFoodData?.type === 'supplement' ? EDIT_SERVING_UNITS : FOOD_SERVING_UNITS).map(u => (
                <TouchableOpacity
                  key={u}
                  onPress={() => set('servingUnitType', u)}
                  style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, borderWidth: 1, backgroundColor: editFoodData?.servingUnitType === u ? theme.accentBlueBg : 'transparent', borderColor: editFoodData?.servingUnitType === u ? theme.accentBlueBorder : theme.borderInput }}>
                  <Text style={{ fontSize: 12, fontFamily: Type.uiSemibold, color: editFoodData?.servingUnitType === u ? theme.accentBlue : theme.textMuted }}>{u}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Additional Servings */}
            <View style={{ height: 1, backgroundColor: theme.borderCard, marginTop: 4, marginBottom: 14 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <Text style={{ fontSize: 9, color: theme.textSecondary, fontFamily: Type.uiBold, letterSpacing: 3, textTransform: 'uppercase' }}>Additional Servings</Text>
              <TouchableOpacity
                onPress={() => setEditFoodData((p: any) => p ? { ...p, additionalServings: [...(p.additionalServings || []), { id: `as_${Date.now()}`, label: '', grams: '' }] } : null)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 }}>
                <ButtonShine radius={6} />
                <Ionicons name="add" size={12} color={theme.accentBlue} />
                <Text style={{ fontSize: 11, color: theme.accentBlue, fontFamily: Type.uiSemibold }}>Add</Text>
              </TouchableOpacity>
            </View>
            {(editFoodData?.additionalServings || []).map((s: any, i: number) => (
              <View key={s.id} style={{ flexDirection: 'row', gap: 6, marginBottom: 8, alignItems: 'center' }}>
                <TextInput
                  style={{ flex: 1.4, backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, color: theme.textPrimary, paddingVertical: 8, paddingHorizontal: 10, fontSize: 13, fontFamily: Type.ui }}
                  placeholder="Label (e.g. 1 link)"
                  placeholderTextColor={theme.textDim}
                  value={s.label}
                  onChangeText={v => setEditFoodData((p: any) => {
                    if (!p) return null;
                    const updated = [...(p.additionalServings || [])];
                    updated[i] = { ...updated[i], label: v };
                    return { ...p, additionalServings: updated };
                  })}
                />
                <TextInput
                  style={{ flex: 0.8, backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, color: theme.textPrimary, paddingVertical: 8, paddingHorizontal: 10, fontSize: 13, fontFamily: Type.ui }}
                  placeholder="g"
                  placeholderTextColor={theme.textDim}
                  keyboardType="decimal-pad"
                  value={s.grams}
                  onChangeText={v => setEditFoodData((p: any) => {
                    if (!p) return null;
                    const updated = [...(p.additionalServings || [])];
                    updated[i] = { ...updated[i], grams: filterDecimal(v) };
                    return { ...p, additionalServings: updated };
                  })}
                />
                <TouchableOpacity
                  onPress={() => setEditFoodData((p: any) => p ? { ...p, additionalServings: (p.additionalServings || []).filter((_: any, j: number) => j !== i) } : null)}
                  style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close-circle" size={18} color={theme.textDim} />
                </TouchableOpacity>
              </View>
            ))}
            {(editFoodData?.additionalServings || []).length === 0 && (
              <Text style={{ fontSize: 11, color: theme.textDim, fontFamily: Type.ui, marginBottom: 10 }}>Tap Add to define extra serving sizes (e.g. 1 link, 6 pieces)</Text>
            )}
          </ScrollView>
          <View style={{ flexDirection: 'row', gap: 10, padding: 16, paddingTop: 12 }}>
            <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); handleClose(); }} style={{ flex: 1, padding: 12, backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, alignItems: 'center' }}>
              <Text style={{ color: theme.textMuted, fontFamily: Type.uiMedium, fontSize: 14 }}>Cancel</Text>
            </TouchableOpacity>
            <PrimaryCTA
              wrapperStyle={{ flex: 2 }}
              faceStyle={{ paddingVertical: 12, borderRadius: 8 }}
              label="Save"
              onPress={onSave}
              disabled={!editFoodData?.name?.trim() || !editFoodData?.cal}
            />
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
