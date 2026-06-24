// components/MeasureHowToModal.tsx
// "How to measure" guide. Centered floating card (house standard: spring scale + opacity on
// show, handle pill, tap-off to close). Opens to an INDEX (13 measurements grouped by region,
// no forced first item), tap a tile -> detail page (hero + step-by-step), swipe left/right
// between measurements, "All measurements" back to the index. Visuals are placeholder icons
// for v1 (copy carries the technique); swap in real illustrations as a polish pass.
// See SPEC_body_measurements.md.

import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import { useRef, useState } from 'react';
import { Animated, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../theme';
import { MEASURE_FIELDS, MEASURE_REGIONS, fieldsForRegion, MeasureFieldKey } from '../utils/bodyMeasurements';

// Technique copy per field. Steps are short and imperative.
const HOWTO: Record<MeasureFieldKey, string[]> = {
  neck: [
    'Wrap the tape around the base of your neck, just below the Adam\'s apple.',
    'Keep it level and snug, not tight.',
    'Relax your shoulders and look straight ahead.',
  ],
  chest: [
    'Run the tape across the fullest part of your chest, at the nipple line, around your back.',
    'Arms relaxed at your sides.',
    'Measure on a normal breath out, don\'t puff up.',
  ],
  shoulders: [
    'Wrap around the widest part of your shoulders, all the way around the back.',
    'Stand relaxed with arms at your sides.',
    'One measurement around, not left and right separately.',
  ],
  waist: [
    'Tape around your waist at the navel.',
    'Stand relaxed, don\'t suck in.',
    'Keep the tape level and measure on a normal exhale.',
  ],
  hips: [
    'Wrap around the widest part of your hips and glutes.',
    'Feet together.',
    'Keep the tape level all the way around.',
  ],
  leftBicep: ['Flex the arm at its peak.', 'Tape around the largest part of the bicep, parallel to the floor.', 'Snug, not digging in.'],
  rightBicep: ['Flex the arm at its peak.', 'Tape around the largest part of the bicep, parallel to the floor.', 'Snug, not digging in.'],
  leftForearm: ['Relax and extend the arm.', 'Tape around the widest part of the forearm, just below the elbow.'],
  rightForearm: ['Relax and extend the arm.', 'Tape around the widest part of the forearm, just below the elbow.'],
  leftThigh: ['Stand with weight even on both legs.', 'Tape around the widest part of the upper thigh, just below the glute.', 'Keep it parallel to the floor.'],
  rightThigh: ['Stand with weight even on both legs.', 'Tape around the widest part of the upper thigh, just below the glute.', 'Keep it parallel to the floor.'],
  leftCalf: ['Stand with weight even on both legs.', 'Tape around the widest part of the calf.', 'Keep it parallel to the floor.'],
  rightCalf: ['Stand with weight even on both legs.', 'Tape around the widest part of the calf.', 'Keep it parallel to the floor.'],
};

const CONSISTENCY = 'Measure the same spot, same time of day, same flexed or relaxed state each time so your trend stays honest.';

interface Props { visible: boolean; onClose: () => void; }

export default function MeasureHowToModal({ visible, onClose }: Props) {
  const { theme } = useTheme();
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const pagerRef = useRef<ScrollView>(null);
  const [mode, setMode] = useState<'index' | 'detail'>('index');
  const [current, setCurrent] = useState(0);
  const [pageW, setPageW] = useState(0);

  const open = () => {
    setMode('index');
    scaleAnim.setValue(0.85);
    opacityAnim.setValue(0);
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, damping: 22, stiffness: 300 }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  };
  const close = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, { toValue: 0.9, duration: 150, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 140, useNativeDriver: true }),
    ]).start(() => onClose());
  };
  const closeWithHaptic = () => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); close(); };

  const goDetail = (index: number) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setCurrent(index);
    setMode('detail');
    // Jump the pager to the tapped measurement once it has laid out.
    requestAnimationFrame(() => pagerRef.current?.scrollTo({ x: index * pageW, animated: false }));
  };

  const accent = theme.accentBlueRaw;

  return (
    <Modal visible={visible} transparent animationType="none" onShow={open} onRequestClose={closeWithHaptic}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.overlayBg, opacity: opacityAnim }]} pointerEvents="none" />
        <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={closeWithHaptic} />

        <Animated.View style={{
          width: '88%', maxHeight: '82%', backgroundColor: theme.bgSheet, borderRadius: 20,
          borderWidth: 0.5, borderColor: theme.borderCard, borderTopWidth: 4, borderTopColor: accent,
          shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.45, shadowRadius: 28, elevation: 24,
          overflow: 'hidden', transform: [{ scale: scaleAnim }], opacity: opacityAnim,
        }}>
          {/* Handle */}
          <TouchableOpacity onPress={closeWithHaptic} style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }} hitSlop={{ top: 12, bottom: 12, left: 60, right: 60 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.sheetHandle }} />
          </TouchableOpacity>

          {/* Header */}
          <View style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            {mode === 'detail' ? (
              <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setMode('index'); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="chevron-back" size={16} color={accent} />
                <Text style={{ fontSize: 12, fontFamily: 'DMSans_600SemiBold', color: accent }}>All measurements</Text>
              </TouchableOpacity>
            ) : (
              <Text style={{ fontSize: 9, letterSpacing: 3, color: theme.textMuted, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase' }}>How to Measure</Text>
            )}
            <TouchableOpacity onPress={closeWithHaptic} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={20} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          {mode === 'index' ? (
            <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 22 }} showsVerticalScrollIndicator={false}>
              {MEASURE_REGIONS.map(region => (
                <View key={region} style={{ marginBottom: 14 }}>
                  <Text style={{ fontSize: 10, letterSpacing: 1.5, fontFamily: 'DMSans_700Bold', color: theme.textMuted, marginBottom: 8, marginLeft: 2 }}>{region.toUpperCase()}</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {fieldsForRegion(region).map(f => {
                      const idx = MEASURE_FIELDS.findIndex(mf => mf.key === f.key);
                      return (
                        <TouchableOpacity key={f.key} onPress={() => goDetail(idx)}
                          style={{ backgroundColor: theme.bgInput, borderColor: theme.borderInput, borderWidth: 1, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 12, minWidth: '47%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexGrow: 1 }}>
                          <Text style={{ fontSize: 13, fontFamily: 'DMSans_600SemiBold', color: theme.textSecondary }}>{f.label}</Text>
                          <Ionicons name="chevron-forward" size={15} color={theme.textMuted} />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
            </ScrollView>
          ) : (
            <View style={{ flex: 1 }} onLayout={e => setPageW(e.nativeEvent.layout.width)}>
              <ScrollView
                ref={pagerRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={e => { if (pageW > 0) setCurrent(Math.round(e.nativeEvent.contentOffset.x / pageW)); }}>
                {MEASURE_FIELDS.map(f => (
                  <ScrollView key={f.key} style={{ width: pageW || undefined }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, alignItems: 'center' }} showsVerticalScrollIndicator={false}>
                    {/* Hero (placeholder visual for v1) */}
                    <View style={{ width: 92, height: 92, borderRadius: 46, backgroundColor: accent + '14', alignItems: 'center', justifyContent: 'center', marginBottom: 14, marginTop: 4 }}>
                      <Ionicons name="body-outline" size={46} color={accent} />
                    </View>
                    <Text style={{ fontSize: 19, fontFamily: 'DMSans_700Bold', color: theme.textPrimary, marginBottom: 14 }}>{f.label}</Text>
                    <View style={{ alignSelf: 'stretch' }}>
                      {HOWTO[f.key].map((step, i) => (
                        <View key={i} style={{ flexDirection: 'row', marginBottom: 10 }}>
                          <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: accent + '1A', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                            <Text style={{ fontSize: 11, fontFamily: 'DMSans_700Bold', color: accent }}>{i + 1}</Text>
                          </View>
                          <Text style={{ flex: 1, fontSize: 13.5, lineHeight: 20, fontFamily: 'DMSans_400Regular', color: theme.textSecondary }}>{step}</Text>
                        </View>
                      ))}
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginTop: 6, backgroundColor: theme.bgInput, borderRadius: 10, padding: 12 }}>
                        <Ionicons name="bulb-outline" size={15} color={theme.accentAmber} style={{ marginRight: 8, marginTop: 1 }} />
                        <Text style={{ flex: 1, fontSize: 12, lineHeight: 18, fontFamily: 'DMSans_400Regular', color: theme.textMuted }}>{CONSISTENCY}</Text>
                      </View>
                    </View>
                  </ScrollView>
                ))}
              </ScrollView>
              {/* Position dots */}
              <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 5, paddingVertical: 10 }}>
                {MEASURE_FIELDS.map((_, i) => (
                  <View key={i} style={{ width: i === current ? 16 : 5, height: 5, borderRadius: 3, backgroundColor: i === current ? accent : theme.borderInput }} />
                ))}
              </View>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}
