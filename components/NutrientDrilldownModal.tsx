import { useState } from 'react';
import * as Haptics from 'expo-haptics';
import { useRef, useMemo } from 'react';
import { Animated, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../theme';

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
  const fiber = fiberN ? (fiberN.value || 0) * scale : 0;
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
        if (!n) continue;
        let scale: number;
        if (e.fsId) {
          scale = (e.calPer100g && e.calPer100g > 0) ? (e.cal / e.calPer100g) : 0;
        } else {
          const sg = e.servingGrams;
          const servingCal = sg && (e.calPer100g ?? 0) > 0 ? (e.calPer100g ?? 0) * sg / 100 : 0;
          scale = servingCal > 0 ? e.cal / servingCal : 0;
        }
        value = Math.round((n.value || 0) * scale * 10) / 10;
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
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.45,
          shadowRadius: 28,
          elevation: 24,
          overflow: 'hidden',
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
        }}>

          {/* Handle */}
          <TouchableOpacity
            onPress={closeWithHaptic}
            style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 6 }}
            hitSlop={{ top: 12, bottom: 12, left: 60, right: 60 }}
          >
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.borderCard }} />
          </TouchableOpacity>

          {/* Header */}
          <View style={{ paddingHorizontal: 20, paddingBottom: 14, paddingTop: 4, borderBottomWidth: 0.5, borderBottomColor: theme.borderCard }}>
            <Text style={{ fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: theme.textMuted, fontFamily: 'DMSans_700Bold', marginBottom: 4 }}>
              TODAY'S SOURCES
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 6 }}>
              <Text style={{ fontSize: 28, color, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1 }}>
                {displayTotal}{item?.unit ?? ''}
              </Text>
              <Text style={{ fontSize: 14, color: theme.textMuted, fontFamily: 'DMSans_600SemiBold' }}>
                {item?.label}
              </Text>
              {item?.goal !== null && item?.goal !== undefined && (
                <Text style={{ fontSize: 12, color: theme.textDim, fontFamily: 'DMSans_400Regular' }}>
                  / {item.goal}{item.unit} goal
                </Text>
              )}
            </View>
            {item?.goal !== null && item?.goal !== undefined && (
              <View style={{ height: 3, backgroundColor: theme.bgProgressTrack, borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
                <View style={{ width: `${goalPct}%`, height: '100%', backgroundColor: color, borderRadius: 2 }} />
              </View>
            )}
            {item?.hasNetToggle && (
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
                <TouchableOpacity
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setLocalNet(false); }}
                  style={{
                    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4,
                    backgroundColor: !localNet ? theme.accentBlueBg : 'transparent',
                    borderWidth: 1,
                    borderColor: !localNet ? theme.accentBlueBorder : theme.borderCard,
                  }}
                >
                  <Text style={{ fontSize: 10, color: !localNet ? theme.accentBlue : theme.textDim, fontFamily: 'DMSans_700Bold', letterSpacing: 1.5 }}>TOTAL</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setLocalNet(true); }}
                  style={{
                    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4,
                    backgroundColor: localNet ? theme.accentBlueBg : 'transparent',
                    borderWidth: 1,
                    borderColor: localNet ? theme.accentBlueBorder : theme.borderCard,
                  }}
                >
                  <Text style={{ fontSize: 10, color: localNet ? theme.accentBlue : theme.textDim, fontFamily: 'DMSans_700Bold', letterSpacing: 1.5 }}>NET</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Entry list */}
          <ScrollView
            contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
          >
            {contributions.length === 0 ? (
              <Text style={{ color: theme.textDim, fontSize: 13, fontFamily: 'DMSans_400Regular', fontStyle: 'italic', textAlign: 'center', paddingVertical: 12 }}>
                No entries with data for this nutrient.
              </Text>
            ) : (
              contributions.map((c, i) => (
                <View key={i} style={{ marginBottom: i < contributions.length - 1 ? 14 : 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
                    <Text
                      style={{ flex: 1, fontSize: 13, color: theme.textPrimary, fontFamily: 'DMSans_600SemiBold', marginRight: 8 }}
                      numberOfLines={1}
                    >
                      {c.name}
                    </Text>
                    <Text style={{ fontSize: 13, color, fontFamily: 'DMSans_700Bold', flexShrink: 0 }}>
                      {c.value}{item?.unit}
                    </Text>
                    <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'DMSans_400Regular', marginLeft: 6, width: 34, textAlign: 'right', flexShrink: 0 }}>
                      {c.pct}%
                    </Text>
                  </View>
                  <View style={{ height: 3, backgroundColor: theme.bgProgressTrack, borderRadius: 2, overflow: 'hidden' }}>
                    <View style={{
                      width: `${Math.round((c.value / maxValue) * 100)}%`,
                      height: '100%',
                      backgroundColor: color,
                      borderRadius: 2,
                      opacity: 0.55 + (c.value / maxValue) * 0.45,
                    }} />
                  </View>
                </View>
              ))
            )}
          </ScrollView>

        </Animated.View>
      </View>
    </Modal>
  );
}
