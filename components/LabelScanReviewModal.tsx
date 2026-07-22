import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { triggerHaptic } from '@/utils/haptics';
import { useEffect, useRef, useState } from 'react';
import { Animated, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../theme';
import { Type } from '../typography';
import ModalHeader from './ModalHeader';
import PrimaryCTA from './PrimaryCTA';
import UnitPickerButton from './UnitPickerButton';
import { CollapsibleBody } from './NutrientFieldsGrid';
import { ParsedLabel, DV_REFERENCE } from '../utils/nutritionLabelParser';

const LOW_CONFIDENCE_THRESHOLD = 0.5;

// Serving sizes are printed in weight OR volume, so the picker offers both families -- same control
// and same two-column layout as Create Food's own Amount field.
const ALL_SERVING_UNITS = ['g', 'kg', 'oz', 'lb', 'ml', 'l', 'cup', 'tbsp', 'tsp', 'fl oz'];

const fieldLabelStyle = (theme: any) => ({
  fontSize: 12, color: theme.textSecondary, fontFamily: Type.uiMedium, marginBottom: 5,
});
const inputStyle = (theme: any, flagged: boolean) => ({
  backgroundColor: theme.bgInput,
  borderWidth: 1,
  borderColor: flagged ? '#d4860a' : theme.borderInput,
  borderRadius: 8,
  color: theme.textPrimary,
  paddingVertical: 10,
  paddingHorizontal: 10,
  fontSize: 14,
  fontFamily: Type.num,
});

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

// Every field the app supports, grouped the way the food form groups them. The review card lists
// ALL of them, not just what OCR found -- a scan that missed Sodium used to leave no way to type it
// in while the user was standing there holding the label.
const CORE_FIELDS = ['calories', 'fat', 'carbs', 'protein'];

const SECTIONS: { key: string; title: string; fields: string[]; alwaysOpen?: boolean }[] = [
  { key: 'core',     title: 'Calories & Macros', fields: CORE_FIELDS, alwaysOpen: true },
  { key: 'extended', title: 'More Nutrition',    fields: ['saturatedFat', 'transFat', 'cholesterol', 'sodium', 'fiber', 'sugar', 'addedSugars', 'potassium'] },
  { key: 'vitamins', title: 'Vitamins',          fields: ['vitaminA', 'vitaminC', 'vitaminD', 'vitaminE', 'vitaminK', 'vitaminB6', 'folate', 'vitaminB12', 'biotin', 'thiamin', 'riboflavin', 'niacin', 'choline'] },
  { key: 'minerals', title: 'Minerals',          fields: ['calcium', 'iron', 'magnesium', 'zinc', 'copper'] },
];

export interface ScanRowResult {
  value: number | null;
  percentDV: number | null;
}

export interface ScanServingResult {
  name: string | null;
  amount: number | null;
  unit: string | null;
}

interface LabelScanReviewModalProps {
  parsed: ParsedLabel;
  onConfirm: (fields: Record<string, ScanRowResult>, serving: ScanServingResult, servingsPerContainer: number | null) => void;
  onClose: () => void;
  // The banner tells people to retake the photo; without this they'd have to cancel out and find
  // the Scan button again to follow the app's own instruction.
  onRetake?: () => void;
}

// Renders as a plain card, NOT its own Modal -- it's swapped into the parent CustomFoodCreator's
// existing Modal/overlay in place of the normal form card. Two separate native Modals stacked at
// once caused a stuck invisible layer on iOS that silently ate touches once the first was closed.
export default function LabelScanReviewModal({ parsed, onConfirm, onClose, onRetake }: LabelScanReviewModalProps) {
  const { theme } = useTheme();
  const cardAnim = useRef(new Animated.Value(0)).current;

  // Local editable copies -- string for the TextInput, kept alongside the field's confidence
  // (carried over unchanged; editing doesn't erase the "double-check this one" flag, since the
  // point is a human glance-and-confirm, not that typing silently clears a warning).
  type Row = { value: string; percentDV: string; confidence: number | null };
  // Built synchronously, NOT in an effect: each collapsible section measures its own height on its
  // first render, and rows that arrived one render later measured as zero and stayed collapsed to
  // nothing. The rows have to exist before the first paint.
  const buildRows = (label: ParsedLabel): Record<string, Row> => {
    const initial: Record<string, Row> = {};
    for (const key of Object.keys(FIELD_META)) {
      const f = label.fields[key];
      initial[key] = {
        value: f?.value != null ? String(f.value) : '',
        percentDV: f?.percentDV != null ? String(f.percentDV) : '',
        confidence: f?.confidence ?? null,
      };
    }
    return initial;
  };
  const sectionsOpenFor = (label: ParsedLabel) => Object.fromEntries(
    SECTIONS.map(s => [s.key, s.alwaysOpen === true || s.fields.some(k => {
      const f = label.fields[k];
      return !!f && (f.value !== null || f.percentDV !== null || f.confidence !== null);
    })])
  );

  const [rows, setRows] = useState<Record<string, Row>>(() => buildRows(parsed));
  // Serving is editable now: it's the one number every other number on the card is keyed to, and it
  // used to be the only thing on this screen a user couldn't correct.
  const [servingName, setServingName] = useState(parsed.serving.name ?? parsed.serving.description ?? '');
  const [servingAmount, setServingAmount] = useState(
    parsed.serving.amount != null ? String(parsed.serving.amount)
      : parsed.serving.grams != null ? String(parsed.serving.grams) : ''
  );
  const [servingUnit, setServingUnit] = useState(parsed.serving.unit ?? 'g');
  const [perContainer, setPerContainer] = useState(
    parsed.servingsPerContainer.value != null ? String(parsed.servingsPerContainer.value) : ''
  );
  // A section opens when the scan sensed ANYTHING in it -- a real number, a %DV, or a field it saw
  // but couldn't read. Only sections with no inkling at all start collapsed.
  const [openMap, setOpenMap] = useState<Record<string, boolean>>(() => sectionsOpenFor(parsed));

  useEffect(() => {
    cardAnim.setValue(0);
    Animated.spring(cardAnim, { toValue: 1, useNativeDriver: true, damping: 20, stiffness: 300 }).start();

    // Re-sync only when a NEW scan replaces this one; the first scan is already seeded above.
    setRows(buildRows(parsed));
    setServingName(parsed.serving.name ?? parsed.serving.description ?? '');
    setServingAmount(parsed.serving.amount != null ? String(parsed.serving.amount)
      : parsed.serving.grams != null ? String(parsed.serving.grams) : '');
    setServingUnit(parsed.serving.unit ?? 'g');
    setPerContainer(parsed.servingsPerContainer.value != null ? String(parsed.servingsPerContainer.value) : '');
    setOpenMap(sectionsOpenFor(parsed));
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

  const renderRow = (key: string) => {
    const meta = FIELD_META[key];
    const row = rows[key];
    if (!meta || !row) return null;
    const lowConfidence = row.confidence !== null && row.confidence < LOW_CONFIDENCE_THRESHOLD;
    // A core field the scan never found is just as much a "look at this" as one it read badly --
    // without this, a missing Calories box looked identical to a confirmed one. Clears on typing.
    // Limited to the core four on purpose: most of the 30+ fields are legitimately absent from a
    // real label, and amber on all of them would mean nothing.
    const missingCore = CORE_FIELDS.includes(key) && row.value === '';
    const flagged = lowConfidence || missingCore;
    const hasDV = !!DV_REFERENCE[key];
    return (
      <View key={key} style={{ marginBottom: 12 }}>
        <Text style={{ fontSize: 11, color: theme.textMuted, fontFamily: Type.uiMedium, marginBottom: 4 }}>
          {meta.label} <Text style={{ color: theme.textDim }}>{meta.unit}</Text>
        </Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput
            style={[inputStyle(theme, flagged), { flex: hasDV ? 1 : undefined, width: hasDV ? undefined : '100%' }]}
            value={row.value}
            onChangeText={t => updateValue(key, t)}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={theme.textDim}
            selectTextOnFocus
          />
          {hasDV && (
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <TextInput
                style={[inputStyle(theme, flagged), { flex: 1 }]}
                value={row.percentDV}
                onChangeText={t => updatePercent(key, t)}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={theme.textDim}
                selectTextOnFocus
              />
              <Text style={{ fontSize: 13, color: theme.textDim }}>%DV</Text>
            </View>
          )}
        </View>
        {flagged && (
          <Text style={{ fontSize: 10, color: '#d4860a', fontFamily: Type.ui, marginTop: 3 }}>
            {missingCore ? 'Not found on the scan, type it in' : 'Double-check this one'}
          </Text>
        )}
      </View>
    );
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
    const amount = parseFloat(servingAmount);
    onConfirm(
      out,
      { name: servingName.trim() || null, amount: isNaN(amount) ? null : amount, unit: servingUnit },
      perContainer.trim() !== '' && !isNaN(parseFloat(perContainer)) ? parseFloat(perContainer) : null,
    );
    handleClose();
  };

  return (
      // The card is centered in the parent's overlay; with a keypad up, its lower half (including the
      // Looks Good button) sat behind the keyboard. flex:1 gives the avoider a bounded height so the
      // card's own maxHeight resolves against the space that's actually left.
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' }}
        pointerEvents="box-none"
      >
        <Animated.View style={{
          width: '92%', maxHeight: '80%',
          backgroundColor: theme.bgSheet, borderRadius: 16,
          borderWidth: 1, borderColor: theme.borderCard, borderTopWidth: 1.5, borderTopColor: theme.accentBlueRaw,
          shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16,
          transform: [{ scale: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] }) }],
        }}>
          <ModalHeader
            title="Scanned Label"
            subtitle="Check the numbers below before saving"
            onClose={handleClose}
            right={onRetake ? (
              <TouchableOpacity
                onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); onRetake(); }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 }}
              >
                <Ionicons name="camera" size={13} color={theme.accentBlue} />
                <Text style={{ fontSize: 12, color: theme.accentBlue, fontFamily: Type.uiSemibold }}>Retake</Text>
              </TouchableOpacity>
            ) : undefined}
          />

          {showBanner && (
            <View style={{ marginHorizontal: 16, marginTop: 8, backgroundColor: 'rgba(212,134,10,0.12)', borderWidth: 1, borderColor: 'rgba(212,134,10,0.4)', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 }}>
              <Text style={{ fontSize: 12, color: '#d4860a', fontFamily: Type.uiMedium }}>
                {parsed.missingCoreField
                  ? `Couldn't find ${parsed.missingCoreField}. Try retaking with the full label in frame.`
                  : `Some of this scan is unclear, double-check before saving.`}
              </Text>
            </View>
          )}

          <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets={true}>
            {/* Serving: editable, mirroring Create Food's own Serving Name + Amount + unit. */}
            <View style={{ backgroundColor: theme.bgCard, borderRadius: 12, borderWidth: 0.5, borderColor: theme.borderCard, padding: 14, marginBottom: 10 }}>
              <Text style={{ fontSize: 11, fontFamily: Type.uiBold, color: theme.textPrimary, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>Serving</Text>
              <Text style={fieldLabelStyle(theme)}>Serving Name</Text>
              <TextInput
                style={inputStyle(theme, false)}
                value={servingName}
                onChangeText={setServingName}
                placeholder="e.g. 1 Can"
                placeholderTextColor={theme.textDim}
              />
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={fieldLabelStyle(theme)}>Amount</Text>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <TextInput
                      style={[inputStyle(theme, false), { flex: 1 }]}
                      value={servingAmount}
                      onChangeText={t => setServingAmount(t.replace(/[^0-9.]/g, ''))}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      placeholderTextColor={theme.textDim}
                      selectTextOnFocus
                    />
                    <UnitPickerButton
                      value={servingUnit}
                      options={ALL_SERVING_UNITS}
                      twoColumn
                      onChange={setServingUnit}
                    />
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={fieldLabelStyle(theme)}>Servings Per Container</Text>
                  <TextInput
                    style={inputStyle(theme, false)}
                    value={perContainer}
                    onChangeText={t => setPerContainer(t.replace(/[^0-9.]/g, ''))}
                    keyboardType="decimal-pad"
                    placeholder="1"
                    placeholderTextColor={theme.textDim}
                    selectTextOnFocus
                  />
                </View>
              </View>
            </View>

            {SECTIONS.map(section => {
              const isOpen = section.alwaysOpen === true || openMap[section.key] !== false;
              const foundCount = section.fields.filter(k => rows[k]?.value !== '' && rows[k]?.value != null).length;
              const sectionFlagged = section.fields.some(k => {
                const r = rows[k];
                if (!r) return false;
                return (r.confidence !== null && r.confidence < LOW_CONFIDENCE_THRESHOLD)
                  || (CORE_FIELDS.includes(k) && r.value === '');
              });
              const body = (
                <View>
                  {section.fields.map(key => renderRow(key))}
                </View>
              );
              return (
                <View key={section.key} style={{ backgroundColor: theme.bgCard, borderRadius: 12, borderWidth: 0.5, borderColor: theme.borderCard, padding: 14, marginBottom: 10 }}>
                  <TouchableOpacity
                    disabled={section.alwaysOpen === true}
                    onPress={() => {
                      triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                      setOpenMap(p => ({ ...p, [section.key]: !isOpen }));
                    }}
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 11, fontFamily: Type.uiBold, color: theme.textPrimary, letterSpacing: 2, textTransform: 'uppercase' }}>
                        {section.title}
                      </Text>
                      {/* Count so a closed box tells you whether it's worth opening. */}
                      {section.alwaysOpen !== true && (
                        <Text style={{ fontSize: 11, fontFamily: Type.ui, color: theme.textDim }}>
                          {foundCount > 0 ? `· ${foundCount} found` : '· none found'}
                        </Text>
                      )}
                      {/* Amber marker rides the header so collapsing a section can never hide a flag. */}
                      {sectionFlagged && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#d4860a' }} />}
                    </View>
                    {section.alwaysOpen !== true && (
                      <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={15} color={theme.textDim} />
                    )}
                  </TouchableOpacity>
                  {section.alwaysOpen === true ? body : <CollapsibleBody open={isOpen}>{body}</CollapsibleBody>}
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
      </KeyboardAvoidingView>
  );
}
