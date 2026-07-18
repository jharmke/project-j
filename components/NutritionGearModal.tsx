import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import { useEffect, useRef, useState } from 'react';
import { Animated, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { storageSet } from '../utils/storage';
import { useTheme } from '../theme';
import { useToast, ToastRenderer } from './Toast';
import PrimaryCTA from './PrimaryCTA';
import { Type } from '../typography';
import ModalHeader from './ModalHeader';
import GradientTitle from './GradientTitle';

// Same lift/sink recipe as GradientNumber -- a preset icon glyph is roughly square like a number
// glyph, not a wide word, so GradientNumber's tuning fits it better than GradientTitle's.
const ICON_LIGHT = 0.24;
const ICON_DARK  = 0.20;
function clampChan(n: number) { return Math.max(0, Math.min(255, Math.round(n))); }
function parseHexChan(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(hex.trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
const toHexChan = (r: number, g: number, b: number) =>
  '#' + [r, g, b].map(v => clampChan(v).toString(16).padStart(2, '0')).join('');
const liftChan = (rgb: [number, number, number], amt: number) =>
  toHexChan(rgb[0] + (255 - rgb[0]) * amt, rgb[1] + (255 - rgb[1]) * amt, rgb[2] + (255 - rgb[2]) * amt);
const sinkChan = (rgb: [number, number, number], amt: number) =>
  toHexChan(rgb[0] * (1 - amt), rgb[1] * (1 - amt), rgb[2] * (1 - amt));

function GradientPresetIcon({ name, size, color }: { name: keyof typeof Ionicons.glyphMap; size: number; color: string }) {
  const rgb = parseHexChan(color);
  if (!rgb) return <Ionicons name={name} size={size} color={color} />;
  const stops: [string, string, string] = [liftChan(rgb, ICON_LIGHT), color, sinkChan(rgb, ICON_DARK)];
  return (
    <MaskedView maskElement={<Ionicons name={name} size={size} color="#000000" />}>
      <LinearGradient colors={stops} locations={[0, 0.52, 1]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}>
        <Ionicons name={name} size={size} color={color} style={{ opacity: 0 }} />
      </LinearGradient>
    </MaskedView>
  );
}

export type NutritionPreset = 'standard' | 'keto' | 'heart' | 'fiber' | 'athletic' | 'custom';

export interface NutritionGoals {
  addedSugars: number | null; fiber: number | null; sugar: number | null;
  saturatedFat: number | null; transFat: number | null;
  cholesterol: number | null; sodium: number | null; potassium: number | null; caffeine: number | null;
  vitaminA: number | null; vitaminC: number | null; vitaminD: number | null; vitaminE: number | null; vitaminK: number | null;
  vitaminB6: number | null; folate: number | null; vitaminB12: number | null; biotin: number | null;
  calcium: number | null; iron: number | null; magnesium: number | null; zinc: number | null; copper: number | null;
}

export const NUTRITION_PRESETS: Record<string, NutritionGoals> = {
  standard: {
    addedSugars: 50, fiber: 28, sugar: 50,
    saturatedFat: 20, transFat: 2,
    cholesterol: 300, sodium: 2300, potassium: 4700, caffeine: 400,
    vitaminA: 900, vitaminC: 90, vitaminD: 20, vitaminE: 15, vitaminK: 120,
    vitaminB6: 1.7, folate: 400, vitaminB12: 2.4, biotin: 30,
    calcium: 1300, iron: 18, magnesium: 420, zinc: 11, copper: 0.9,
  },
  keto: {
    addedSugars: 5, fiber: 25, sugar: 5,
    saturatedFat: 50, transFat: 2,
    cholesterol: 300, sodium: 3000, potassium: 4700, caffeine: 400,
    vitaminA: 900, vitaminC: 90, vitaminD: 20, vitaminE: 15, vitaminK: 120,
    vitaminB6: 1.7, folate: 400, vitaminB12: 2.4, biotin: 30,
    calcium: 1300, iron: 18, magnesium: 420, zinc: 11, copper: 0.9,
  },
  heart: {
    addedSugars: 25, fiber: 30, sugar: 25,
    saturatedFat: 13, transFat: 0,
    cholesterol: 300, sodium: 1500, potassium: 4700, caffeine: 400,
    vitaminA: 900, vitaminC: 90, vitaminD: 20, vitaminE: 15, vitaminK: 120,
    vitaminB6: 1.7, folate: 400, vitaminB12: 2.4, biotin: 30,
    calcium: 1300, iron: 18, magnesium: 420, zinc: 11, copper: 0.9,
  },
  fiber: {
    addedSugars: 25, fiber: 40, sugar: 30,
    saturatedFat: 20, transFat: 2,
    cholesterol: 300, sodium: 2300, potassium: 4700, caffeine: 400,
    vitaminA: 900, vitaminC: 90, vitaminD: 20, vitaminE: 15, vitaminK: 120,
    vitaminB6: 1.7, folate: 400, vitaminB12: 2.4, biotin: 30,
    calcium: 1300, iron: 18, magnesium: 420, zinc: 11, copper: 0.9,
  },
  athletic: {
    addedSugars: 50, fiber: 32, sugar: 50,
    saturatedFat: 20, transFat: 2,
    cholesterol: 300, sodium: 3000, potassium: 4700, caffeine: 400,
    vitaminA: 900, vitaminC: 120, vitaminD: 25, vitaminE: 15, vitaminK: 120,
    vitaminB6: 2.0, folate: 400, vitaminB12: 2.4, biotin: 30,
    calcium: 1300, iron: 18, magnesium: 500, zinc: 14, copper: 0.9,
  },
};

const PRESET_META = [
  { key: 'standard', icon: 'checkmark-circle' as const, label: 'Standard',     subtitle: 'FDA Daily Values'      },
  { key: 'keto',     icon: 'flame'            as const, label: 'Keto',          subtitle: 'Low carb, high fat'    },
  { key: 'heart',    icon: 'heart'            as const, label: 'Heart Health',  subtitle: 'Heart-friendly limits'  },
  { key: 'fiber',    icon: 'leaf'             as const, label: 'High Fiber',    subtitle: '40g fiber target'       },
  { key: 'athletic', icon: 'flash'            as const, label: 'Athletic',      subtitle: 'Performance focus'      },
  { key: 'custom',   icon: 'build'            as const, label: 'Custom',        subtitle: 'Your own goals'         },
];

const GOAL_GROUPS = [
  {
    name: 'CARBS',
    fields: [
      { key: 'addedSugars', label: 'Added Sugars', unit: 'g' },
      { key: 'fiber',       label: 'Fiber',        unit: 'g' },
      { key: 'sugar',       label: 'Sugar',        unit: 'g' },
    ],
  },
  {
    name: 'FATS',
    fields: [
      { key: 'saturatedFat', label: 'Sat. Fat',  unit: 'g' },
      { key: 'transFat',     label: 'Trans Fat', unit: 'g' },
    ],
  },
  {
    name: 'CORE',
    fields: [
      { key: 'cholesterol', label: 'Cholesterol', unit: 'mg' },
      { key: 'sodium',      label: 'Sodium',      unit: 'mg' },
      { key: 'potassium',   label: 'Potassium',   unit: 'mg' },
      { key: 'caffeine',    label: 'Caffeine',    unit: 'mg' },
    ],
  },
  {
    name: 'VITAMINS',
    fields: [
      { key: 'vitaminA', label: 'Vitamin A', unit: 'mcg' },
      { key: 'vitaminC', label: 'Vitamin C', unit: 'mg'  },
      { key: 'vitaminD', label: 'Vitamin D', unit: 'mcg' },
      { key: 'vitaminE', label: 'Vitamin E', unit: 'mg'  },
      { key: 'vitaminK', label: 'Vitamin K', unit: 'mcg' },
    ],
  },
  {
    name: 'B VITAMINS',
    fields: [
      { key: 'vitaminB6',  label: 'B6',     unit: 'mg'  },
      { key: 'folate',     label: 'Folate', unit: 'mcg' },
      { key: 'vitaminB12', label: 'B12',    unit: 'mcg' },
      { key: 'biotin',     label: 'Biotin', unit: 'mcg' },
    ],
  },
  {
    name: 'MINERALS',
    fields: [
      { key: 'calcium',   label: 'Calcium',   unit: 'mg' },
      { key: 'iron',      label: 'Iron',      unit: 'mg' },
      { key: 'magnesium', label: 'Magnesium', unit: 'mg' },
      { key: 'zinc',      label: 'Zinc',      unit: 'mg' },
      { key: 'copper',    label: 'Copper',    unit: 'mg' },
    ],
  },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  preset: NutritionPreset;
  goals: NutritionGoals;
  onSave: (preset: NutritionPreset, goals: NutritionGoals) => void;
}

export default function NutritionGearModal({ visible, onClose, preset, goals, onSave }: Props) {
  const { theme } = useTheme();
  const { showToast } = useToast();
  const scaleAnim  = useRef(new Animated.Value(0.92)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const [localPreset, setLocalPreset] = useState<NutritionPreset>(preset);
  const [localGoals,  setLocalGoals]  = useState<NutritionGoals>({ ...goals });
  const [pressedKey,  setPressedKey]  = useState<string | null>(null);

  const isCustom = localPreset === 'custom';

  useEffect(() => {
    if (visible) {
      setLocalPreset(preset);
      setLocalGoals({ ...goals });
    }
  }, [visible, preset, goals]);

  const open = () => {
    scaleAnim.setValue(0.92);
    opacityAnim.setValue(0);
    Animated.parallel([
      Animated.spring(scaleAnim,   { toValue: 1, useNativeDriver: true, damping: 22, stiffness: 300 }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  };

  const close = () => {
    Animated.parallel([
      Animated.timing(scaleAnim,   { toValue: 0.94, duration: 160, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0,    duration: 140, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  const closeWithHaptic = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    close();
  };

  const applyPreset = (p: string) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setLocalPreset(p as NutritionPreset);
    setLocalGoals({ ...NUTRITION_PRESETS[p] });
  };

  const unlockCustom = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setLocalPreset('custom');
  };

  const updateField = (key: string, val: string) => {
    const clean = val.replace(/[^0-9.]/g, '');
    setLocalGoals(prev => ({
      ...prev,
      [key]: clean === '' ? null : isNaN(parseFloat(clean)) ? null : parseFloat(clean),
    }));
  };

  const handleSave = async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const saved = await AsyncStorage.getItem('pj_settings');
      const settings = saved ? JSON.parse(saved) : {};
      await storageSet('pj_settings', JSON.stringify({
        ...settings,
        nutritionPreset: localPreset,
        nutritionGoals: localGoals,
      }));
      onSave(localPreset, localGoals);
      const presetMeta = PRESET_META.find(p => p.key === localPreset);
      showToast('Goals saved', presetMeta?.label || 'Custom', 'success');
      close();
    } catch {
      showToast('Save failed', 'Please try again', 'error');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="none" onShow={open} onRequestClose={closeWithHaptic}>
      <ToastRenderer />
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>

        {/* Animated dim overlay */}
        <Animated.View
          style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.55)', opacity: opacityAnim }]}
          pointerEvents="none"
        />
        {/* Tap-outside dismiss */}
        <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={closeWithHaptic} />

        {/* Floating card */}
        <Animated.View
          style={{
            width: '86%',
            maxHeight: '78%',
            backgroundColor: theme.bgSheet,
            borderRadius: 20,
            borderWidth: 0.5,
            borderColor: theme.borderCard,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.45,
            shadowRadius: 28,
            elevation: 24,
            overflow: 'hidden',
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          }}
        >
          {/* Was "NUTRITION GOALS" in Type.num -- caps, in the NUMBER face. */}
          <ModalHeader title="Nutrition Goals" onClose={closeWithHaptic} />
          <View style={{ borderBottomWidth: 0.5, borderBottomColor: theme.borderCard }} />

          {/* Scrollable body */}
          <ScrollView
            contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            automaticallyAdjustKeyboardInsets
          >
            {/* Preset grid */}
            <Text style={{ fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: theme.textMuted, fontFamily: Type.uiBold, marginBottom: 10 }}>
              PRESET
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
              {PRESET_META.map(p => {
                const active = localPreset === p.key;
                const isPressed = pressedKey === p.key;
                return (
                  <TouchableOpacity
                    key={p.key}
                    onPress={() => p.key === 'custom' ? unlockCustom() : applyPreset(p.key)}
                    onPressIn={() => setPressedKey(p.key)}
                    onPressOut={() => setPressedKey(null)}
                    activeOpacity={1}
                    style={{
                      width: '47%',
                      paddingVertical: 12,
                      paddingHorizontal: 10,
                      borderRadius: 12,
                      borderWidth: active ? 1.5 : 1,
                      backgroundColor: active ? theme.accentBlueBg : theme.bgCard,
                      borderColor: active ? theme.accentBlueBorder : theme.borderCard,
                      alignItems: 'center',
                      gap: 3,
                      transform: [{ scale: isPressed ? 0.94 : 1 }],
                    }}
                  >
                    <GradientPresetIcon
                      name={p.icon}
                      size={22}
                      color={active ? theme.accentBlue : theme.textMuted}
                    />
                    <GradientTitle
                      title={p.label}
                      color={active ? theme.accentBlue : theme.textSecondary}
                      style={{ fontSize: 13, fontFamily: Type.uiBold }}
                    />
                    <Text style={{
                      fontSize: 10,
                      fontFamily: Type.ui,
                      color: theme.textDim,
                      textAlign: 'center',
                    }}>
                      {p.subtitle}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {!isCustom && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'center', marginBottom: 16, paddingVertical: 4 }}>
                <Ionicons name="lock-closed-outline" size={11} color={theme.textDim} />
                <Text style={{ fontSize: 11, color: theme.textDim, fontFamily: Type.ui }}>
                  Tap "Custom" or any field to edit
                </Text>
              </View>
            )}
            {isCustom && <View style={{ height: 16 }} />}

            {/* Goal groups */}
            {GOAL_GROUPS.map(group => (
              <View
                key={group.name}
                style={{
                  backgroundColor: theme.bgCard,
                  borderRadius: 12,
                  borderWidth: 0.5,
                  borderColor: theme.borderCard,
                  padding: 14,
                  marginBottom: 10,
                }}
              >
                <Text style={{
                  fontSize: 11,
                  fontFamily: Type.uiBold,
                  color: theme.textPrimary,
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                  marginBottom: 12,
                }}>
                  {group.name}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  {group.fields.map(f => {
                    const currentVal = localGoals[f.key as keyof NutritionGoals];
                    return (
                      <View key={f.key} style={{ width: '47%' }}>
                        <Text style={{ fontSize: 10, color: theme.textMuted, fontFamily: Type.uiMedium, marginBottom: 5 }}>
                          {f.label}{' '}
                          <Text style={{ color: theme.textDim }}>({f.unit})</Text>
                        </Text>
                        {isCustom ? (
                          <TextInput
                            style={{
                              backgroundColor: theme.bgInput,
                              borderWidth: 1,
                              borderColor: theme.borderInput,
                              borderRadius: 8,
                              color: theme.textPrimary,
                              paddingHorizontal: 10,
                              paddingVertical: 8,
                              fontSize: 14,
                              fontFamily: Type.ui,
                              minHeight: 40,
                            }}
                            value={currentVal === null ? '' : String(currentVal)}
                            onChangeText={v => updateField(f.key, v)}
                            keyboardType="decimal-pad"
                            selectTextOnFocus
                            placeholder="—"
                            placeholderTextColor={theme.textDim}
                          />
                        ) : (
                          <TouchableOpacity
                            onPress={unlockCustom}
                            style={{
                              borderWidth: 1,
                              borderColor: theme.borderSubtle,
                              borderRadius: 8,
                              paddingHorizontal: 10,
                              paddingVertical: 8,
                              minHeight: 40,
                              justifyContent: 'center',
                            }}
                          >
                            <Text style={{ fontSize: 14, fontFamily: Type.ui, color: theme.textDim }}>
                              {currentVal !== null ? String(currentVal) : '—'}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            ))}

            {/* Disclaimer */}
            <View style={{
              backgroundColor: theme.bgCard,
              borderRadius: 8,
              padding: 12,
              marginBottom: 16,
              borderWidth: 0.5,
              borderColor: theme.borderCard,
            }}>
              <Text style={{ fontSize: 11, color: theme.textDim, fontFamily: Type.ui, lineHeight: 16 }}>
                Goals are based on general dietary guidelines. Individual needs vary. Consult a registered dietitian before making significant dietary changes.
              </Text>
            </View>

            {/* Save button. Molded + ACCENT (was flat accentGreen -- green is success/goal-hit, this is an
                action). Also drops Type.num: that is the NUMBER face (Rajdhani, condensed + tabular, built
                for values) on a button LABEL -- the same straggler as Profile's save bar. PrimaryCTA owns
                the label face, so it cannot come back here. */}
            <PrimaryCTA
              faceStyle={{ paddingVertical: 15, borderRadius: 10 }}
              label="Save Goals"
              onPress={handleSave}
            />
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}
