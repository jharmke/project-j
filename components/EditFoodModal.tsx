import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import { useEffect, useRef, useState } from 'react';
import { Animated, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { recognizeText as ocrRecognizeText } from 'expo-ocr-kit';
import { useTheme } from '../theme';
import { Type } from '../typography';
import ModalHeader from './ModalHeader';
import PrimaryCTA from './PrimaryCTA';
import ButtonShine from './ButtonShine';
import NutrientFieldsGrid from './NutrientFieldsGrid';
import GradientIcon from './GradientIcon';
import GradientNumber from './GradientNumber';
import { useToast } from './Toast';
import { parseNutritionLabel, ParsedLabel } from '../utils/nutritionLabelParser';
import LabelScanReviewModal, { ScanRowResult } from './LabelScanReviewModal';
import { convertUnit, convertibleUnitsFor } from '../utils/unitConversion';
import UnitPickerButton from './UnitPickerButton';

const FOOD_SERVING_UNITS = ['g', 'ml', 'fl oz', 'oz', 'container', 'serving', 'tbsp', 'tsp', 'cup'];
const SUPPLEMENT_ONLY_UNITS = ['pill', 'capsule', 'tablet', 'softgel', 'gummy'];
const EDIT_SERVING_UNITS = [...FOOD_SERVING_UNITS, ...SUPPLEMENT_ONLY_UNITS];
const SUPPLEMENT_UNIT_OPTIONS = [...SUPPLEMENT_ONLY_UNITS, 'ml', 'g'];
const WEIGHT_ENTRY_UNITS = ['g', 'kg', 'oz', 'lb'];

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
  const { showToast } = useToast();
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;
  const [scannedLabel, setScannedLabel] = useState<ParsedLabel | null>(null);
  const [showScanReview, setShowScanReview] = useState(false);
  const [scanningLabel, setScanningLabel] = useState(false);
  // Per-row entry unit for Additional Servings, same mechanism as Create Food -- lets someone
  // type an alternate serving in oz/cup/etc. and have it convert into the primary serving's
  // unit automatically. Draft holds raw in-progress text so mid-typing isn't reformatted.
  const [additionalServingUnits, setAdditionalServingUnits] = useState<Record<string, string>>({});
  const [additionalServingDrafts, setAdditionalServingDrafts] = useState<Record<string, string>>({});
  // Weight-unit entry convenience on the primary Serving amount (food type only). servingGrams stays
  // canonical grams always; servingEntryUnit/servingDraft are transient typing state, never persisted.
  const [servingEntryUnit, setServingEntryUnit] = useState('g');
  const [servingDraft, setServingDraft] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (visible) {
      overlayAnim.setValue(0);
      cardAnim.setValue(0);
      setServingEntryUnit('g');
      setServingDraft(undefined);
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

  const handleScanLabel = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        showToast('Camera access needed', 'Enable camera access to scan a nutrition label', 'error');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9, allowsEditing: true });
      if (result.canceled || !result.assets?.[0]?.uri) return;
      setScanningLabel(true);
      const ocr = await ocrRecognizeText(result.assets[0].uri);
      const parsed = parseNutritionLabel(ocr);
      setScannedLabel(parsed);
      setShowScanReview(true);
    } catch (e) {
      showToast('Scan failed', String(e), 'error');
    } finally {
      setScanningLabel(false);
    }
  };

  // Maps the review modal's confirmed values onto editFoodData's field names -- note some of these
  // differ from the parser's own keys (e.g. "cal" here vs "calories" in the parser), matched by hand
  // below. Never touches a field the label didn't print anything for, same rule as Create Food.
  const handleScanConfirm = (fields: Record<string, ScanRowResult>, serving: ParsedLabel['serving'], servingsPerContainer: number | null) => {
    const keyMap: Record<string, string> = { calories: 'cal' };
    setEditFoodData((p: any) => {
      if (!p) return null;
      const updated = { ...p };
      for (const [key, row] of Object.entries(fields)) {
        if (row.value !== null) updated[keyMap[key] || key] = String(row.value);
      }
      if (serving.grams !== null) updated.servingGrams = String(serving.grams);
      if (serving.description) updated.servingLabel = serving.description;
      // "1 Container" auto-added as an Additional Serving, same as Create Food -- skipped at
      // exactly 1 (identical to the primary serving), replaces a prior auto-added container row
      // on re-scan instead of stacking a duplicate.
      if (servingsPerContainer !== null && servingsPerContainer > 1 && serving.grams !== null) {
        const containerGrams = Math.round(serving.grams * servingsPerContainer * 10) / 10;
        updated.additionalServings = [
          ...(p.additionalServings || []).filter((s: any) => !s.id.startsWith('as_container_')),
          { id: `as_container_${Date.now()}`, label: '1 Container', grams: String(containerGrams) },
        ];
      }
      return updated;
    });
    showToast('Label scanned', 'Review the fields and save when ready', 'success');
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', opacity: overlayAnim }}>
        <TouchableOpacity
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          activeOpacity={1}
          onPress={() => {
            triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
            if (showScanReview) setShowScanReview(false); else handleClose();
          }}
        />
        {showScanReview && scannedLabel ? (
          <LabelScanReviewModal
            parsed={scannedLabel}
            onConfirm={handleScanConfirm}
            onClose={() => setShowScanReview(false)}
          />
        ) : (
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

            {/* Basic Info box */}
            <View style={{ backgroundColor: theme.bgCard, borderRadius: 12, borderWidth: 0.5, borderColor: theme.borderCard, padding: 14, marginBottom: 10 }}>
              <Text style={{ fontSize: 11, fontFamily: Type.uiBold, color: theme.textPrimary, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>Basic Info</Text>
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 12, color: theme.textSecondary, fontFamily: Type.uiMedium, marginBottom: 5 }}>Food Name <Text style={{ color: '#cc3333' }}>*</Text></Text>
                <TextInput
                  style={{ backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, color: theme.textPrimary, padding: 10, fontSize: 14, fontFamily: Type.ui }}
                  value={editFoodData?.name || ''}
                  onChangeText={v => set('name', v)}
                  placeholder="e.g. Chicken Breast"
                  placeholderTextColor={theme.textDim}
                  autoCapitalize="words"
                  selectTextOnFocus
                />
              </View>
              <View>
                <Text style={{ fontSize: 12, color: theme.textSecondary, fontFamily: Type.uiMedium, marginBottom: 5 }}>Brand</Text>
                <TextInput
                  style={{ backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, color: theme.textPrimary, padding: 10, fontSize: 14, fontFamily: Type.ui }}
                  value={editFoodData?.brand || ''}
                  onChangeText={v => set('brand', v)}
                  placeholder="e.g. Tyson"
                  placeholderTextColor={theme.textDim}
                  autoCapitalize="words"
                  selectTextOnFocus
                />
              </View>
            </View>

            <TouchableOpacity
              onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); handleScanLabel(); }}
              disabled={scanningLabel}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder, borderRadius: 10, paddingVertical: 12, marginBottom: 4, opacity: scanningLabel ? 0.6 : 1 }}
            >
              <Ionicons name="scan-outline" size={18} color={theme.accentBlue} />
              <Text style={{ fontSize: 14, fontFamily: Type.uiSemibold, color: theme.accentBlue }}>{scanningLabel ? 'Reading Label...' : 'Scan Nutrition Label'}</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 11, color: theme.textDim, fontFamily: Type.ui, marginBottom: 14, textAlign: 'center' }}>
              Tip: get as close as you can while keeping the whole label in frame.
            </Text>

            {/* Serving box -- Calories lives here too, mirrors Create Food's layout */}
            <View style={{ backgroundColor: theme.bgCard, borderRadius: 12, borderWidth: 0.5, borderColor: theme.borderCard, padding: 14, marginBottom: 10 }}>
              <Text style={{ fontSize: 11, fontFamily: Type.uiBold, color: theme.textPrimary, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>Serving</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, color: theme.textSecondary, fontFamily: Type.uiMedium, marginBottom: 5 }}>Calories <Text style={{ color: theme.textDim }}>kcal</Text> <Text style={{ color: '#cc3333' }}>*</Text></Text>
                  <TextInput
                    style={{ backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, color: theme.textPrimary, padding: 10, fontSize: 14, fontFamily: Type.ui }}
                    value={editFoodData?.cal || ''}
                    onChangeText={setNum('cal')}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={theme.textDim}
                    selectTextOnFocus
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, color: theme.textSecondary, fontFamily: Type.uiMedium, marginBottom: 5 }}>Serving</Text>
                  {editFoodData?.type === 'supplement' ? (
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <TextInput
                        style={{ flex: 1, backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, color: theme.textPrimary, padding: 10, fontSize: 14, fontFamily: Type.ui }}
                        value={editFoodData?.servingGrams || ''}
                        onChangeText={setNum('servingGrams')}
                        keyboardType="decimal-pad"
                        placeholder="100"
                        placeholderTextColor={theme.textDim}
                        selectTextOnFocus
                      />
                      <UnitPickerButton value={editFoodData?.servingUnitType || 'g'} options={SUPPLEMENT_UNIT_OPTIONS} onChange={u => set('servingUnitType', u)} minWidth={60} />
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <TextInput
                        style={{ flex: 1, backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, color: theme.textPrimary, padding: 10, fontSize: 14, fontFamily: Type.ui }}
                        value={servingEntryUnit === 'g' ? (editFoodData?.servingGrams || '') : (servingDraft !== undefined ? servingDraft : (editFoodData?.servingGrams ? String(Math.round(((convertUnit(parseFloat(editFoodData.servingGrams), 'g', servingEntryUnit) ?? 0)) * 100) / 100) : ''))}
                        onChangeText={v => {
                          const stripped = filterDecimal(v);
                          if (servingEntryUnit === 'g') set('servingGrams', stripped);
                          else setServingDraft(stripped);
                        }}
                        onBlur={() => {
                          if (servingEntryUnit === 'g' || servingDraft === undefined) return;
                          const typed = parseFloat(servingDraft);
                          const grams = !isNaN(typed) ? convertUnit(typed, servingEntryUnit, 'g') : null;
                          if (grams !== null) set('servingGrams', String(Math.round(grams * 100) / 100));
                          setServingDraft(undefined);
                        }}
                        keyboardType="decimal-pad"
                        placeholder="100"
                        placeholderTextColor={theme.textDim}
                        selectTextOnFocus
                      />
                      <UnitPickerButton value={servingEntryUnit} options={WEIGHT_ENTRY_UNITS} onChange={u => { setServingEntryUnit(u); setServingDraft(undefined); }} />
                    </View>
                  )}
                </View>
              </View>
              {/* Serving Name -- one free-text field, replaces the old Label box + unit scroller.
                  Purely descriptive; the Amount above is always the real number, in grams. */}
              <View style={{ marginTop: 12 }}>
                <Text style={{ fontSize: 12, color: theme.textSecondary, fontFamily: Type.uiMedium, marginBottom: 5 }}>Serving Name <Text style={{ color: theme.textDim }}>(optional)</Text></Text>
                <TextInput
                  style={{ backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, color: theme.textPrimary, padding: 10, fontSize: 14, fontFamily: Type.ui }}
                  value={editFoodData?.servingLabel || ''}
                  onChangeText={v => set('servingLabel', v)}
                  placeholder="e.g. 1 scoop, 3 tbsp, 250 mL"
                  placeholderTextColor={theme.textDim}
                />
              </View>
            </View>

            {/* Additional Servings */}
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
            {(editFoodData?.additionalServings || []).map((s: any, i: number) => {
              const primaryUnit = editFoodData?.servingUnitType || 'g';
              const convertibleUnits = convertibleUnitsFor(primaryUnit);
              const rowUnit = additionalServingUnits[s.id] || primaryUnit;
              const isConverting = rowUnit !== primaryUnit;
              const draft = additionalServingDrafts[s.id];
              const displayValue = isConverting
                ? (draft !== undefined ? draft : (s.grams ? String(Math.round(((convertUnit(parseFloat(s.grams), primaryUnit, rowUnit) ?? 0)) * 100) / 100) : ''))
                : s.grams;
              return (
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
                  placeholder={rowUnit}
                  placeholderTextColor={theme.textDim}
                  keyboardType="decimal-pad"
                  value={displayValue}
                  onChangeText={v => {
                    const stripped = filterDecimal(v);
                    if (isConverting) {
                      setAdditionalServingDrafts(prev => ({ ...prev, [s.id]: stripped }));
                    } else {
                      setEditFoodData((p: any) => {
                        if (!p) return null;
                        const updated = [...(p.additionalServings || [])];
                        updated[i] = { ...updated[i], grams: stripped };
                        return { ...p, additionalServings: updated };
                      });
                    }
                  }}
                  onBlur={() => {
                    if (!isConverting || draft === undefined) return;
                    const typed = parseFloat(draft);
                    const canonical = !isNaN(typed) ? convertUnit(typed, rowUnit, primaryUnit) : null;
                    if (canonical !== null) {
                      setEditFoodData((p: any) => {
                        if (!p) return null;
                        const updated = [...(p.additionalServings || [])];
                        updated[i] = { ...updated[i], grams: String(Math.round(canonical * 100) / 100) };
                        return { ...p, additionalServings: updated };
                      });
                    }
                    setAdditionalServingDrafts(prev => { const next = { ...prev }; delete next[s.id]; return next; });
                  }}
                />
                {convertibleUnits.length > 0 && (
                  <UnitPickerButton
                    value={rowUnit}
                    options={convertibleUnits}
                    minWidth={44}
                    onChange={u => {
                      setAdditionalServingUnits(prev => ({ ...prev, [s.id]: u }));
                      setAdditionalServingDrafts(prev => { const next = { ...prev }; delete next[s.id]; return next; });
                    }}
                  />
                )}
                <TouchableOpacity
                  onPress={() => {
                    setEditFoodData((p: any) => p ? { ...p, additionalServings: (p.additionalServings || []).filter((_: any, j: number) => j !== i) } : null);
                    setAdditionalServingUnits(prev => { const next = { ...prev }; delete next[s.id]; return next; });
                    setAdditionalServingDrafts(prev => { const next = { ...prev }; delete next[s.id]; return next; });
                  }}
                  style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close-circle" size={18} color={theme.textDim} />
                </TouchableOpacity>
              </View>
              );
            })}
            {(editFoodData?.additionalServings || []).length === 0 && (
              <Text style={{ fontSize: 11, color: theme.textDim, fontFamily: Type.ui, marginBottom: 10 }}>Tap Add to define extra serving sizes (e.g. 1 link, 6 pieces)</Text>
            )}

            {/* Nutrients -- last, mirrors Create Food's order */}
            <View style={{ height: 1, backgroundColor: theme.borderCard, marginTop: 10, marginBottom: 14 }} />
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
              disabled={!editFoodData?.name?.trim() || !editFoodData?.cal || !(parseFloat(editFoodData?.servingGrams) > 0)}
            />
          </View>
        </Animated.View>
        )}
      </Animated.View>
    </Modal>
  );
}
