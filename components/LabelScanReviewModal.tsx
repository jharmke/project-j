import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import { useEffect, useRef, useState } from 'react';
import { Animated, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../theme';
import { Type } from '../typography';
import ModalHeader from './ModalHeader';
import PrimaryCTA from './PrimaryCTA';
import { ParsedLabel, DV_REFERENCE } from '../utils/nutritionLabelParser';

const LOW_CONFIDENCE_THRESHOLD = 0.5;

const FIELD_META: Record<string, { label: string; unit: string }> = {
  calories:    { label: 'Calories',    unit: 'kcal' },
  fat:         { label: 'Fat',         unit: 'g' },
  saturatedFat:{ label: 'Sat. Fat',    unit: 'g' },
  transFat:    { label: 'Trans Fat',   unit: 'g' },
  cholesterol: { label: 'Cholesterol', unit: 'mg' },
  sodium:      { label: 'Sodium',      unit: 'mg' },
  carbs:       { label: 'Carbs',       unit: 'g' },
  fiber:       { label: 'Fiber',       unit: 'g' },
  sugar:       { label: 'Sugar',       unit: 'g' },
  addedSugars: { label: 'Added Sugars',unit: 'g' },
  protein:     { label: 'Protein',     unit: 'g' },
  vitaminA:    { label: 'Vitamin A',   unit: 'mcg' },
  vitaminC:    { label: 'Vitamin C',   unit: 'mg' },
  vitaminD:    { label: 'Vitamin D',   unit: 'mcg' },
  vitaminE:    { label: 'Vitamin E',   unit: 'mg' },
  vitaminK:    { label: 'Vitamin K',   unit: 'mcg' },
  vitaminB6:   { label: 'B6',          unit: 'mg' },
  folate:      { label: 'Folate',      unit: 'mcg' },
  vitaminB12:  { label: 'B12',         unit: 'mcg' },
  biotin:      { label: 'Biotin',      unit: 'mcg' },
  thiamin:     { label: 'Thiamin',     unit: 'mg' },
  riboflavin:  { label: 'Riboflavin',  unit: 'mg' },
  niacin:      { label: 'Niacin',      unit: 'mg' },
  choline:     { label: 'Choline',     unit: 'mg' },
  calcium:     { label: 'Calcium',     unit: 'mg' },
  iron:        { label: 'Iron',        unit: 'mg' },
  potassium:   { label: 'Potassium',   unit: 'mg' },
  magnesium:   { label: 'Magnesium',   unit: 'mg' },
  zinc:        { label: 'Zinc',        unit: 'mg' },
  copper:      { label: 'Copper',      unit: 'mg' },
};

export interface ScanRowResult {
  value: number | null;
  percentDV: number | null;
}

interface LabelScanReviewModalProps {
  parsed: ParsedLabel;
  onConfirm: (fields: Record<string, ScanRowResult>, serving: ParsedLabel['serving'], servingsPerContainer: number | null) => void;
  onClose: () => void;
}

// Renders as a plain card, NOT its own Modal -- it's swapped into the parent CustomFoodCreator's
// existing Modal/overlay in place of the normal form card. Two separate native Modals stacked at
// once caused a stuck invisible layer on iOS that silently ate touches once the first was closed.
export default function LabelScanReviewModal({ parsed, onConfirm, onClose }: LabelScanReviewModalProps) {
  const { theme } = useTheme();
  const cardAnim = useRef(new Animated.Value(0)).current;

  // Local editable copies -- string for the TextInput, kept alongside the field's confidence
  // (carried over unchanged; editing doesn't erase the "double-check this one" flag, since the
  // point is a human glance-and-confirm, not that typing silently clears a warning).
  const [rows, setRows] = useState<Record<string, { value: string; percentDV: string; confidence: number | null }>>({});

  useEffect(() => {
    cardAnim.setValue(0);
    Animated.spring(cardAnim, { toValue: 1, useNativeDriver: true, damping: 20, stiffness: 300 }).start();

    const initial: Record<string, { value: string; percentDV: string; confidence: number | null }> = {};
    for (const [key, f] of Object.entries(parsed.fields)) {
      if (f.value === null && f.percentDV === null) continue; // never printed -- not shown here
      initial[key] = {
        value: f.value !== null ? String(f.value) : '',
        percentDV: f.percentDV !== null ? String(f.percentDV) : '',
        confidence: f.confidence,
      };
    }
    setRows(initial);
  }, [parsed]);

  const handleClose = () => {
    Animated.timing(cardAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => onClose());
  };

  const updateValue = (key: string, text: string) => {
    setRows(prev => {
      const dv = DV_REFERENCE[key];
      const num = parseFloat(text);
      const nextPercent = dv && !isNaN(num) ? String(Math.round((num / dv) * 100)) : prev[key].percentDV;
      return { ...prev, [key]: { ...prev[key], value: text, percentDV: text === '' ? prev[key].percentDV : nextPercent } };
    });
  };

  const updatePercent = (key: string, text: string) => {
    setRows(prev => {
      const dv = DV_REFERENCE[key];
      const num = parseFloat(text);
      const nextValue = dv && !isNaN(num) ? String(Math.round((num / 100) * dv * 10) / 10) : prev[key].value;
      return { ...prev, [key]: { ...prev[key], percentDV: text, value: text === '' ? prev[key].value : nextValue } };
    });
  };

  const showBanner = !!parsed.missingCoreField || parsed.lowConfidenceCount >= 3;

  const confirm = () => {
    const out: Record<string, ScanRowResult> = {};
    for (const [key, r] of Object.entries(rows)) {
      out[key] = {
        value: r.value !== '' ? parseFloat(r.value) : null,
        percentDV: r.percentDV !== '' ? parseFloat(r.percentDV) : null,
      };
    }
    onConfirm(out, parsed.serving, parsed.servingsPerContainer.value);
    handleClose();
  };

  return (
        <Animated.View style={{
          width: '92%', maxHeight: '80%',
          backgroundColor: theme.bgSheet, borderRadius: 16,
          borderWidth: 1, borderColor: theme.borderCard, borderTopWidth: 1.5, borderTopColor: theme.accentBlueRaw,
          shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16,
          transform: [{ scale: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] }) }],
        }}>
          <ModalHeader title="Scanned Label" subtitle="Check the numbers below before saving" onClose={handleClose} />

          {showBanner && (
            <View style={{ marginHorizontal: 16, marginTop: 8, backgroundColor: 'rgba(212,134,10,0.12)', borderWidth: 1, borderColor: 'rgba(212,134,10,0.4)', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 }}>
              <Text style={{ fontSize: 12, color: '#d4860a', fontFamily: Type.uiMedium }}>
                {parsed.missingCoreField
                  ? `Couldn't find ${parsed.missingCoreField} -- try retaking with the full label in frame.`
                  : `Some of this scan is unclear, double-check before saving.`}
              </Text>
            </View>
          )}

          <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
            {parsed.serving.description && (
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: Type.uiBold, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>Serving</Text>
                <Text style={{ fontSize: 14, color: theme.textPrimary, fontFamily: Type.ui }}>
                  {parsed.serving.description}{parsed.servingsPerContainer.value ? `  ·  ${parsed.servingsPerContainer.value} per container` : ''}
                </Text>
              </View>
            )}

            {Object.entries(rows).map(([key, row]) => {
              const meta = FIELD_META[key];
              if (!meta) return null;
              const flagged = row.confidence !== null && row.confidence < LOW_CONFIDENCE_THRESHOLD;
              const hasDV = !!DV_REFERENCE[key];
              return (
                <View key={key} style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 11, color: theme.textMuted, fontFamily: Type.uiMedium, marginBottom: 4 }}>
                    {meta.label} <Text style={{ color: theme.textDim }}>{meta.unit}</Text>
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TextInput
                      style={{
                        flex: hasDV ? 1 : undefined, width: hasDV ? undefined : '100%',
                        backgroundColor: theme.bgInput, borderWidth: 1,
                        borderColor: flagged ? '#d4860a' : theme.borderInput,
                        borderRadius: 8, color: theme.textPrimary, paddingVertical: 10, paddingHorizontal: 10,
                        fontSize: 14, fontFamily: Type.num,
                      }}
                      value={row.value}
                      onChangeText={t => updateValue(key, t)}
                      keyboardType="decimal-pad"
                      selectTextOnFocus
                    />
                    {hasDV && (
                      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <TextInput
                          style={{
                            flex: 1, backgroundColor: theme.bgInput, borderWidth: 1,
                            borderColor: flagged ? '#d4860a' : theme.borderInput,
                            borderRadius: 8, color: theme.textPrimary, paddingVertical: 10, paddingHorizontal: 10,
                            fontSize: 14, fontFamily: Type.num,
                          }}
                          value={row.percentDV}
                          onChangeText={t => updatePercent(key, t)}
                          keyboardType="decimal-pad"
                          selectTextOnFocus
                        />
                        <Text style={{ fontSize: 13, color: theme.textDim }}>%DV</Text>
                      </View>
                    )}
                  </View>
                  {flagged && (
                    <Text style={{ fontSize: 10, color: '#d4860a', fontFamily: Type.ui, marginTop: 3 }}>Double-check this one</Text>
                  )}
                </View>
              );
            })}
          </ScrollView>

          <View style={{ flexDirection: 'row', gap: 10, padding: 16, paddingTop: 12 }}>
            <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); handleClose(); }} style={{ flex: 1, padding: 12, backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, alignItems: 'center' }}>
              <Text style={{ color: theme.textMuted, fontFamily: Type.uiMedium, fontSize: 14 }}>Cancel</Text>
            </TouchableOpacity>
            <PrimaryCTA wrapperStyle={{ flex: 2 }} faceStyle={{ paddingVertical: 12, borderRadius: 8 }} label="Looks Good" onPress={confirm} />
          </View>
        </Animated.View>
  );
}
