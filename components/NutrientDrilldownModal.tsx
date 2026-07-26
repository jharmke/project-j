import { useState } from 'react';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import { useRef, useMemo } from 'react';
import { Animated, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme';
import { Type } from '../typography';
import ModalHeader from './ModalHeader';
import GradientNumber from './GradientNumber';
import ButtonShine from './ButtonShine';
import { barFillGradient } from '../utils/barGradient';
import { getNutrientInfo, NUTRIENT_DISCLAIMER } from '../utils/nutrientInfo';

// Recipe-logged entries store extended nutrients as FLAT fields (e.fiber, e.sodium, ...),
// already scaled to the logged portion, NOT inside foodNutrients. Map readable names to those
// flat keys so recipe nutrients show in the drilldown source list + net-carb math.
// NOTE: this same map is mirrored in log.tsx and utils/diagnosticReport.ts -- centralize later.
const FLAT_NUTRIENT_KEY: Record<string, string> = {
  'Fiber, total dietary': 'fiber',
  'Sugars, total including NLEA': 'sugar',
  'Sodium, Na': 'sodium',
  'Cholesterol': 'cholesterol',
  'Fatty acids, total saturated': 'saturatedFat',
  'Polyunsaturated Fat': 'polyunsaturatedFat',
  'Monounsaturated Fat': 'monounsaturatedFat',
  'Added Sugars': 'addedSugars',
  'Trans Fat': 'transFat',
  'Vitamin A': 'vitaminA',
  'Vitamin C': 'vitaminC',
  'Vitamin D': 'vitaminD',
};

export function computeNetCarbsForEntry(e: any): number {
  const carbs = e.carbs || 0;
  let scale: number;
  if (e.fsId) {
    scale = (e.calPer100g && e.calPer100g > 0) ? (e.cal / e.calPer100g) : 0;
  } else {
    const sg = e.servingGrams;
    const servingCal = sg && (e.calPer100g ?? 0) > 0 ? (e.calPer100g ?? 0) * sg / 100 : 0;
    scale = servingCal > 0 ? e.cal / servingCal : 0;
  }
  const fiberN = e.foodNutrients?.find((fn: any) => fn.nutrientName === 'Fiber, total dietary');
  const sacarN = e.foodNutrients?.find((fn: any) => fn.nutrientName === 'Sugar Alcohols');
  // Recipe entries: fiber lives in the flat field, already portion-scaled.
  const fiber = fiberN ? (fiberN.value || 0) * scale : (typeof e.fiber === 'number' ? e.fiber : 0);
  const sa    = sacarN ? (sacarN.value || 0) * scale : 0;
  return Math.max(0, Math.round((carbs - fiber - sa) * 10) / 10);
}

export interface DrilldownItem {
  label: string;
  total: number;
  unit: string;
  direction: 'want-more' | 'want-less' | 'neutral';
  goal: number | null;
  nutrientKey?: string;
  directField?: string;
  computeValue?: (entry: any) => number;
  hasNetToggle?: boolean;
  netTotal?: number;
  netComputeValue?: (entry: any) => number;
}

interface EntryContribution {
  name: string;
  value: number;
  pct: number;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  item: DrilldownItem | null;
  entries: any[];
  defaultShowNet?: boolean;
}

const MUTED_GREEN = '#0d9268';
const MUTED_RED   = '#cc3333';

function valueColor(value: number, direction: string, goal: number | null, accentBlue: string): string {
  if (direction === 'neutral' || goal === null) return accentBlue;
  if (direction === 'want-more') return value >= goal ? MUTED_GREEN : accentBlue;
  return value > goal ? MUTED_RED : accentBlue;
}

export default function NutrientDrilldownModal({ visible, onClose, item, entries, defaultShowNet }: Props) {
  const { theme } = useTheme();
  const scaleAnim   = useRef(new Animated.Value(0.92)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const [localNet, setLocalNet] = useState(false);

  const open = () => {
    setLocalNet(defaultShowNet ?? false);
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

  const contributions = useMemo((): EntryContribution[] => {
    if (!item) return [];
    const results: { name: string; value: number }[] = [];

    const computeFn = (item.hasNetToggle && localNet && item.netComputeValue)
      ? item.netComputeValue
      : item.computeValue ?? null;

    for (const e of entries) {
      let value = 0;

      if (computeFn) {
        value = computeFn(e);
      } else if (item.nutrientKey) {
        const n = e.foodNutrients?.find((fn: any) => fn.nutrientName === item.nutrientKey);
        if (!n) {
          // Recipe entries: flat field, already portion-scaled (no foodNutrients on the entry).
          const flatKey = FLAT_NUTRIENT_KEY[item.nutrientKey];
          const flatVal = flatKey && typeof (e as any)[flatKey] === 'number' ? (e as any)[flatKey] : 0;
          if (flatVal <= 0) continue;
          value = Math.round(flatVal * 10) / 10;
        } else {
          let scale: number;
          if (e.fsId) {
            scale = (e.calPer100g && e.calPer100g > 0) ? (e.cal / e.calPer100g) : 0;
          } else {
            const sg = e.servingGrams;
            const servingCal = sg && (e.calPer100g ?? 0) > 0 ? (e.calPer100g ?? 0) * sg / 100 : 0;
            scale = servingCal > 0 ? e.cal / servingCal : 0;
          }
          value = Math.round((n.value || 0) * scale * 10) / 10;
        }
      } else if (item.directField) {
        value = Math.round(((e as any)[item.directField] || 0) * 10) / 10;
      }

      if (value <= 0) continue;
      const rawName = e.name.replace(/\s*\(.*?\)\s*$/, '');
      const foodName = rawName.split(' · ')[0];
      results.push({ name: foodName, value });
    }

    results.sort((a, b) => b.value - a.value);
    const sum = results.reduce((s, r) => s + r.value, 0);
    return results.map(r => ({ ...r, pct: sum > 0 ? Math.round((r.value / sum) * 100) : 0 }));
  }, [item, entries, localNet]);

  const displayTotal = (item?.hasNetToggle && localNet && item?.netTotal !== undefined)
    ? item.netTotal
    : (item?.total ?? 0);
  const maxValue = contributions.length > 0 ? contributions[0].value : 1;
  const color    = item ? valueColor(displayTotal, item.direction, item.goal, theme.accentBlue) : theme.accentBlue;
  const goalPct  = item?.goal ? Math.min((displayTotal / item.goal) * 100, 100) : 0;

  // Educational content. Deliberately independent of whether anything was logged today -- a
  // nutrient sitting at 0 is exactly when "why does this matter" is worth reading.
  const info = getNutrientInfo(item?.nutrientKey, item?.directField);

  return (
    <Modal visible={visible} transparent animationType="none" onShow={open} onRequestClose={closeWithHaptic}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>

        <Animated.View
          style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.55)', opacity: opacityAnim }]}
          pointerEvents="none"
        />
        <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={closeWithHaptic} />

        <Animated.View style={{
          width: '88%',
          maxHeight: '72%',
          backgroundColor: theme.bgSheet,
          borderRadius: 20,
          borderWidth: 0.5,
          borderColor: theme.borderCard,
          borderTopWidth: 2,
          borderTopColor: color,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.45,
          shadowRadius: 28,
          elevation: 24,
          overflow: 'hidden',
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
        }}>

          {/* Title is the nutrient itself (was buried next to the number, with a MISPLACED "TODAY'S
              SOURCES" label sitting above the total -- that label now labels the actual sources list). */}
          <ModalHeader title={item?.label ?? 'Nutrient'} onClose={closeWithHaptic} />

          {/* Stat readout */}
          <View style={{ paddingHorizontal: 20, paddingBottom: 14, paddingTop: 2, borderBottomWidth: 0.5, borderBottomColor: theme.borderCard }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 6 }}>
              <GradientNumber
                value={`${displayTotal}${item?.unit ?? ''}`}
                color={color}
                style={{ fontSize: 28, fontFamily: Type.num, letterSpacing: 1 }}
              />
              {item?.goal !== null && item?.goal !== undefined && (
                <Text style={{ fontSize: 12, color: theme.textDim, fontFamily: Type.ui }}>
                  / {item.goal}{item.unit} goal
                </Text>
              )}
            </View>
            {item?.goal !== null && item?.goal !== undefined && (
              <View style={{ height: 3, backgroundColor: theme.bgProgressTrack, borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
                <View style={{ width: `${goalPct}%`, height: '100%', borderRadius: 2, overflow: 'hidden' }}>
                  <LinearGradient colors={barFillGradient(color)} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={{ flex: 1 }} />
                </View>
              </View>
            )}
            {item?.hasNetToggle && (
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
                <TouchableOpacity
                  onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setLocalNet(false); }}
                  style={{
                    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4,
                    backgroundColor: !localNet ? theme.bgSelected : 'transparent',
                    borderWidth: 1,
                    borderColor: !localNet ? theme.accentBlue : theme.borderCard,
                  }}
                >
                  {!localNet && <ButtonShine radius={4} />}
                  <Text style={{ fontSize: 10, color: !localNet ? theme.accentBlue : theme.textDim, fontFamily: Type.uiBold, letterSpacing: 1.5 }}>TOTAL</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setLocalNet(true); }}
                  style={{
                    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4,
                    backgroundColor: localNet ? theme.bgSelected : 'transparent',
                    borderWidth: 1,
                    borderColor: localNet ? theme.accentBlue : theme.borderCard,
                  }}
                >
                  {localNet && <ButtonShine radius={4} />}
                  <Text style={{ fontSize: 10, color: localNet ? theme.accentBlue : theme.textDim, fontFamily: Type.uiBold, letterSpacing: 1.5 }}>NET</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Entry list */}
          <ScrollView
            contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
          >
            <Text style={{ fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: theme.textSecondary, fontFamily: Type.uiBold, marginBottom: 12 }}>
              Today's Sources
            </Text>
            {contributions.length === 0 ? (
              <Text style={{ color: theme.textDim, fontSize: 13, fontFamily: Type.ui, fontStyle: 'italic', textAlign: 'center', paddingVertical: 12 }}>
                No entries with data for this nutrient.
              </Text>
            ) : (
              contributions.map((c, i) => (
                <View key={i} style={{ marginBottom: i < contributions.length - 1 ? 14 : 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
                    <Text
                      style={{ flex: 1, fontSize: 13, color: theme.textPrimary, fontFamily: Type.uiSemibold, marginRight: 8 }}
                      numberOfLines={1}
                    >
                      {c.name}
                    </Text>
                    <GradientNumber
                      value={`${c.value}${item?.unit ?? ''}`}
                      color={color}
                      style={{ fontSize: 13, fontFamily: Type.uiBold, flexShrink: 0 }}
                    />
                    <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: Type.ui, marginLeft: 6, width: 34, textAlign: 'right', flexShrink: 0 }}>
                      {c.pct}%
                    </Text>
                  </View>
                  <View style={{ height: 3, backgroundColor: theme.bgProgressTrack, borderRadius: 2, overflow: 'hidden' }}>
                    <View style={{
                      width: `${Math.round((c.value / maxValue) * 100)}%`,
                      height: '100%',
                      borderRadius: 2,
                      overflow: 'hidden',
                      opacity: 0.55 + (c.value / maxValue) * 0.45,
                    }}>
                      <LinearGradient colors={barFillGradient(color)} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={{ flex: 1 }} />
                    </View>
                  </View>
                </View>
              ))
            )}

            {/* Why It Matters / Food Sources. Identical in all three coaching modes -- this is
                education, not a grade, so the want-less nutrients describe rather than scold. */}
            {info && (
              <>
                <View style={{ height: 0.5, backgroundColor: theme.borderCard, marginTop: 22, marginBottom: 18 }} />

                {/* Section headers, NOT card labels -- deliberately off the 9/ls3/textMuted card-label
                    spec. At 9pt under 13pt body copy they read as smaller than the paragraph they
                    introduce, which is backwards. Size + contrast do the work here; Type.uiBold is
                    already the heaviest UI weight, so there was no weight left to add. All three
                    section headers in this modal share this style, Today's Sources included.
                    CARDS: the reference content sits in cards, Today's Sources list deliberately does
                    NOT (Justin's call -- that list already carries its own bars and percentages, a box
                    around it is a box around a box). The card CANNOT lean on fill alone: on Light,
                    bgSheet and bgCard are BOTH pure white, and on Dark, bgSheet and bgInput are the
                    same value -- neither token separates in every theme, and the contrast direction
                    flips between them. Border + shadow is what actually makes it read as a card in all
                    five, which is the Visual Philosophy rule anyway (cards float above background). */}
                <Text style={{ fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: theme.textSecondary, fontFamily: Type.uiBold, marginBottom: 10 }}>
                  Why It Matters
                </Text>
                <View style={{
                  backgroundColor: theme.bgCard,
                  borderWidth: 0.5,
                  borderColor: theme.borderCard,
                  borderRadius: 14,
                  padding: 16,
                  shadowColor: theme.cardShadow,
                  shadowOpacity: theme.cardShadowOpacity,
                  shadowOffset: { width: 0, height: 4 },
                  shadowRadius: 12,
                  elevation: 6,
                }}>
                  {info.whyItMatters.map((para, i) => (
                    <Text
                      key={i}
                      style={{
                        fontSize: 13,
                        lineHeight: 20,
                        color: theme.textSecondary,
                        fontFamily: Type.ui,
                        marginBottom: i < info.whyItMatters.length - 1 ? 12 : 0,
                      }}
                    >
                      {para}
                    </Text>
                  ))}
                </View>

                <Text style={{ fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: theme.textSecondary, fontFamily: Type.uiBold, marginTop: 22, marginBottom: 10 }}>
                  Food Sources
                </Text>
                <View style={{
                  backgroundColor: theme.bgCard,
                  borderWidth: 0.5,
                  borderColor: theme.borderCard,
                  borderRadius: 14,
                  padding: 16,
                  shadowColor: theme.cardShadow,
                  shadowOpacity: theme.cardShadowOpacity,
                  shadowOffset: { width: 0, height: 4 },
                  shadowRadius: 12,
                  elevation: 6,
                }}>
                  <Text style={{ fontSize: 13, lineHeight: 20, color: theme.textSecondary, fontFamily: Type.ui }}>
                    {info.foodSources}
                  </Text>
                </View>

                <Text style={{ fontSize: 10, lineHeight: 15, color: theme.textDim, fontFamily: Type.ui, marginTop: 18 }}>
                  {NUTRIENT_DISCLAIMER}
                </Text>
              </>
            )}
          </ScrollView>

        </Animated.View>
      </View>
    </Modal>
  );
}
