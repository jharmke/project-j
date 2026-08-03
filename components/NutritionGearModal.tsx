import { Ionicons } from '@/components/AppIcons';
import { Text, TextInput } from '@/components/AppText';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import { useEffect, useRef, useState } from 'react';
import { Animated, Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { storageSet } from '../utils/storage';
import { useTheme } from '../theme';
import { useToast, ToastRenderer } from './Toast';
import PrimaryCTA from './PrimaryCTA';
import { Type } from '../typography';
import ModalHeader from './ModalHeader';
import GradientTitle from './GradientTitle';
import GoalsWallModal from './GoalsWallModal';
import { GOLD_BASE } from './SupporterFoil';
import { useMembership } from '../MembershipContext';

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
  addedSugars: number | null; fiber: number | null; sugar: number | null; sugarAlcohols: number | null;
  saturatedFat: number | null; transFat: number | null; polyunsaturatedFat: number | null; monounsaturatedFat: number | null;
  cholesterol: number | null; sodium: number | null; potassium: number | null; caffeine: number | null;
  vitaminA: number | null; vitaminC: number | null; vitaminD: number | null; vitaminE: number | null; vitaminK: number | null;
  vitaminB6: number | null; folate: number | null; vitaminB12: number | null; biotin: number | null;
  thiamin: number | null; riboflavin: number | null; niacin: number | null; choline: number | null;
  calcium: number | null; iron: number | null; magnesium: number | null; zinc: number | null; copper: number | null;
}

export const NUTRITION_PRESETS: Record<string, NutritionGoals> = {
  standard: {
    addedSugars: 50, fiber: 28, sugar: 50, sugarAlcohols: null,
    saturatedFat: 20, transFat: 2, polyunsaturatedFat: null, monounsaturatedFat: null,
    cholesterol: 300, sodium: 2300, potassium: 4700, caffeine: 400,
    vitaminA: 900, vitaminC: 90, vitaminD: 20, vitaminE: 15, vitaminK: 120,
    vitaminB6: 1.7, folate: 400, vitaminB12: 2.4, biotin: 30,
    thiamin: 1.2, riboflavin: 1.3, niacin: 16, choline: 550,
    calcium: 1300, iron: 18, magnesium: 420, zinc: 11, copper: 0.9,
  },
  keto: {
    addedSugars: 5, fiber: 25, sugar: 5, sugarAlcohols: null,
    saturatedFat: 50, transFat: 2, polyunsaturatedFat: null, monounsaturatedFat: null,
    cholesterol: 300, sodium: 3000, potassium: 4700, caffeine: 400,
    vitaminA: 900, vitaminC: 90, vitaminD: 20, vitaminE: 15, vitaminK: 120,
    vitaminB6: 1.7, folate: 400, vitaminB12: 2.4, biotin: 30,
    thiamin: 1.2, riboflavin: 1.3, niacin: 16, choline: 550,
    calcium: 1300, iron: 18, magnesium: 420, zinc: 11, copper: 0.9,
  },
  heart: {
    addedSugars: 25, fiber: 30, sugar: 25, sugarAlcohols: null,
    saturatedFat: 13, transFat: 0, polyunsaturatedFat: null, monounsaturatedFat: null,
    cholesterol: 300, sodium: 1500, potassium: 4700, caffeine: 400,
    vitaminA: 900, vitaminC: 90, vitaminD: 20, vitaminE: 15, vitaminK: 120,
    vitaminB6: 1.7, folate: 400, vitaminB12: 2.4, biotin: 30,
    thiamin: 1.2, riboflavin: 1.3, niacin: 16, choline: 550,
    calcium: 1300, iron: 18, magnesium: 420, zinc: 11, copper: 0.9,
  },
  fiber: {
    addedSugars: 25, fiber: 40, sugar: 30, sugarAlcohols: null,
    saturatedFat: 20, transFat: 2, polyunsaturatedFat: null, monounsaturatedFat: null,
    cholesterol: 300, sodium: 2300, potassium: 4700, caffeine: 400,
    vitaminA: 900, vitaminC: 90, vitaminD: 20, vitaminE: 15, vitaminK: 120,
    vitaminB6: 1.7, folate: 400, vitaminB12: 2.4, biotin: 30,
    thiamin: 1.2, riboflavin: 1.3, niacin: 16, choline: 550,
    calcium: 1300, iron: 18, magnesium: 420, zinc: 11, copper: 0.9,
  },
  athletic: {
    addedSugars: 50, fiber: 32, sugar: 50, sugarAlcohols: null,
    saturatedFat: 20, transFat: 2, polyunsaturatedFat: null, monounsaturatedFat: null,
    cholesterol: 300, sodium: 3000, potassium: 4700, caffeine: 400,
    vitaminA: 900, vitaminC: 120, vitaminD: 25, vitaminE: 15, vitaminK: 120,
    vitaminB6: 2.0, folate: 400, vitaminB12: 2.4, biotin: 30,
    thiamin: 1.2, riboflavin: 1.3, niacin: 16, choline: 550,
    calcium: 1300, iron: 18, magnesium: 500, zinc: 14, copper: 0.9,
  },
};

const PRESET_META = [
  { key: 'standard', icon: 'checkmark-circle' as const, label: 'Standard',     subtitle: 'FDA Daily Values'      },
  { key: 'keto',     icon: 'flame'            as const, label: 'Keto',          subtitle: 'Low carb, high fat'    },
  { key: 'heart',    icon: 'heart'            as const, label: 'Heart Health',  subtitle: 'Heart-friendly limits'  },
  { key: 'fiber',    icon: 'leaf'             as const, label: 'High Fiber',    subtitle: '40g fiber target'       },
  { key: 'athletic', icon: 'flash'            as const, label: 'Athletic',      subtitle: 'Performance focus'      },
  // ITEM C: sliders, not the wrench. `build` reads as tools and repair (Settings territory); sliders is the
  // "dial in your own values" metaphor, which is what this tile is. Kept identical to the Custom card in the
  // Macros modal on purpose -- they are the same idea on two screens and must not drift apart.
  { key: 'custom',   icon: 'options'          as const, label: 'Custom',        subtitle: 'Your own goals'         },
];

const GOAL_GROUPS = [
  {
    name: 'CARBS',
    fields: [
      { key: 'addedSugars',   label: 'Added Sugars', unit: 'g' },
      { key: 'fiber',         label: 'Fiber',        unit: 'g' },
      { key: 'sugar',         label: 'Sugar',        unit: 'g' },
      { key: 'sugarAlcohols', label: 'Sugar Alc.',   unit: 'g' },
    ],
  },
  {
    name: 'FATS',
    fields: [
      { key: 'saturatedFat',       label: 'Sat. Fat',  unit: 'g' },
      { key: 'transFat',           label: 'Trans Fat', unit: 'g' },
      { key: 'polyunsaturatedFat', label: 'Poly Fat',  unit: 'g' },
      { key: 'monounsaturatedFat', label: 'Mono Fat',  unit: 'g' },
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
      { key: 'thiamin',    label: 'Thiamin',    unit: 'mg' },
      { key: 'riboflavin', label: 'Riboflavin', unit: 'mg' },
      { key: 'niacin',     label: 'Niacin',     unit: 'mg' },
      { key: 'choline',    label: 'Choline',    unit: 'mg' },
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

  // ── ITEM C: SETTING YOUR OWN NUTRITION TARGETS IS SUPPORTER-ONLY ──────────────────────────────────────
  // The five presets stay free, and a grandfathered user keeps the targets they already built -- this only
  // blocks CHANGING them. ⚠️ Never lock on an unknown answer: isSupporter is false during startup because
  // RevenueCat has not replied, not because the user is free.
  const { isSupporter, loading: membershipLoading } = useMembership();
  const nutritionLocked = !membershipLoading && !isSupporter;
  const [goalsWall, setGoalsWall] = useState(false);
  // The targets the user built, kept where presets cannot overwrite them. See the note on applyPreset.
  const [customGoals, setCustomGoals] = useState<NutritionGoals | null>(null);

  // ⚠️ SAVE MUST BE DIM UNTIL SOMETHING ACTUALLY CHANGES. It was lit the instant the modal opened, inviting
  // a pointless write -- and on this screen that write is not harmless: saving while on Custom rewrites the
  // stored copy of your own targets. Same fix, same reason, as the Macros modal.
  const [nutritionBaseline, setNutritionBaseline] = useState<{ preset: NutritionPreset; goals: string } | null>(null);
  // Keys are sorted so two identical goal sets always serialise the same way, whatever order they were built
  // in -- a preset spread and a field-by-field edit do not produce the same key order.
  const serializeGoals = (g: NutritionGoals) =>
    JSON.stringify(Object.keys(g).sort().map(k => [k, (g as any)[k]]));
  const nutritionDirty = nutritionBaseline
    ? nutritionBaseline.preset !== localPreset || nutritionBaseline.goals !== serializeGoals(localGoals)
    : false;

  const isCustom = localPreset === 'custom';
  // ⚠️ "CUSTOM IS SELECTED" AND "YOU MAY TYPE" ARE TWO DIFFERENT THINGS. A grandfathered free user IS on
  // custom, so keying the text inputs off isCustom alone would hand editing straight back to exactly the
  // people the gate exists for.
  const fieldsEditable = isCustom && !nutritionLocked;

  useEffect(() => {
    if (visible) {
      setLocalPreset(preset);
      setLocalGoals({ ...goals });
      setNutritionBaseline({ preset, goals: serializeGoals(goals) });
      (async () => {
        try {
          const raw = await AsyncStorage.getItem('pj_settings');
          const s = raw ? JSON.parse(raw) : {};
          if (s.customNutritionGoals) {
            setCustomGoals(s.customNutritionGoals);
          } else if (preset === 'custom') {
            // ⚠️ ONE-TIME BACKFILL, same reasoning as the macro split. Somebody already on custom targets
            // with no stored copy would lose the lot the first time they tapped a preset, and rebuilding
            // them is the gated action. Purely additive; once the field exists this never runs again.
            const backfill = { ...goals };
            setCustomGoals(backfill);
            await storageSet('pj_settings', JSON.stringify({ ...s, customNutritionGoals: backfill }));
          } else {
            setCustomGoals(null);
          }
        } catch {}
      })();
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

  // ⚠️ THE TWO DOORS. This is called from the Custom TILE and from tapping ANY read-only field. Gating the
  // tile alone would leave a whole grid of fields as an unlocked way in -- the exact "a missed door is not a
  // visible bug, it is a cap that silently does not exist" failure from the caps work.
  const unlockCustom = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    if (nutritionLocked) { setGoalsWall(true); return; }
    // Restores the targets they built, if there are any. Falls back to whatever is on screen, which is the
    // old behaviour and a reasonable starting point for somebody who has never set their own.
    if (customGoals) setLocalGoals({ ...customGoals });
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
      // ⚠️ A PRESET SAVE MUST NOT TOUCH THE BACKUP. Picking a preset replaces every value on screen, so
      // writing the backup on every save would overwrite the user's own fiber, sodium and vitamin targets
      // with Keto's and then hand them back on the Custom tile as if they had built them. Only a save that
      // IS custom updates the copy.
      const savingCustom = localPreset === 'custom';
      if (savingCustom) setCustomGoals({ ...localGoals });
      await storageSet('pj_settings', JSON.stringify({
        ...settings,
        nutritionPreset: localPreset,
        nutritionGoals: localGoals,
        ...(savingCustom ? { customNutritionGoals: { ...localGoals } } : {}),
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
      {/* ⚠️ INSIDE this Modal, like the ToastRenderer above it. iOS gives every Modal its own window, so a
          wall rendered outside would open underneath this one and be invisible. */}
      {goalsWall && <GoalsWallModal kind="nutrition" theme={theme} onDismiss={() => setGoalsWall(false)} />}
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
                      borderWidth: (active || (p.key === 'custom' && nutritionLocked)) ? 1.5 : 1,
                      backgroundColor: active ? theme.accentBlueBg : theme.bgCard,
                      borderColor: p.key === 'custom' && nutritionLocked
                        ? GOLD_BASE
                        : active ? theme.accentBlueBorder : theme.borderCard,
                      alignItems: 'center',
                      gap: 3,
                      transform: [{ scale: isPressed ? 0.94 : 1 }],
                    }}
                  >
                    {p.key === 'custom' && nutritionLocked && (
                      <View style={{ position: 'absolute', top: 6, right: 6 }}>
                        <Ionicons name="lock-closed" size={12} color={GOLD_BASE} />
                      </View>
                    )}
                    {/* ⚠️ THE LOCK BELONGS TO THE CARD, NOT THE ICON. It was first badged onto the sliders
                        glyph and read as a wart on the icon rather than a locked tile. "Badge the icon" is
                        the rule for ICON-ONLY buttons, where the icon IS the control; this is a full card
                        with a title and a subtitle, so the card is what is locked -- gold border, plus a
                        padlock in the corner. The BORDER is the part that carries "locked"; the fill was
                        never what did the work.
                        ⚠️ When the card is both SELECTED and locked, selection keeps the fill and the lock
                        takes the border and badge, so the two read together instead of fighting. */}
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

            {/* ⚠️ The unlocked line invites you to do the thing a free user cannot, so it gets a locked
                variant. Wording is parallel to the macro side's "Custom splits are part of the Supporter
                plan", and the icon steps up from the faint outline padlock to the flat GOLD one, because
                here it means "this needs the plan" rather than "tap to start editing". */}
            {nutritionLocked ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'center', marginBottom: 16, paddingVertical: 4 }}>
                <Ionicons name="lock-closed" size={12} color={GOLD_BASE} />
                <Text style={{ fontSize: 11, color: theme.textMuted, fontFamily: Type.uiSemibold }}>
                  Custom targets are part of the Supporter plan
                </Text>
              </View>
            ) : !isCustom && (
              /* ⚠️ NO PADLOCK HERE ANY MORE. This line used to carry a faint outline one meaning "read-only
                 until you pick Custom". Since item C a padlock in this app means exactly one thing -- needs
                 the Supporter plan -- and the GOLD one directly above says so. Two padlocks with two
                 different meanings in the same spot, at different times, is a collision the gate created.
                 The sentence says it perfectly well on its own. */
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'center', marginBottom: 16, paddingVertical: 4 }}>
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
                        {fieldsEditable ? (
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
              disabled={!nutritionDirty}
            />
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}
