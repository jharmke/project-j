// components/MetricDrilldownModal.tsx
// Focused drill-down for a single Sleep/Recovery metric. Tap a metric row to see
// what it is, how it is calculated, what it affects, where you stand, and smart
// (state-selected) tips on how to improve it. Centered modal, mirrors the
// NutrientDrilldownModal pattern. SPEC_sleep.md Section 13.

import { useRef } from 'react';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Animated, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../theme';
import { triggerHaptic } from '../utils/haptics';

export interface MetricDrilldownData {
  title: string;
  value: string;
  statusWord: string | null;
  statusColor: string;
  reference: string | null;
  definition: string;
  calculation: string;
  affects: string;
  tips: string[];
  informationalOnly?: boolean;
  disclaimer?: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  data: MetricDrilldownData | null;
}

export default function MetricDrilldownModal({ visible, onClose, data }: Props) {
  const { theme } = useTheme();
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const open = () => {
    scaleAnim.setValue(0.92);
    opacityAnim.setValue(0);
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, damping: 22, stiffness: 300 }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  };

  const close = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, { toValue: 0.94, duration: 160, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 140, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  const closeWithHaptic = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    close();
  };

  const sectionLabel = {
    fontSize: 9, letterSpacing: 2.5, textTransform: 'uppercase' as const,
    color: theme.textMuted, fontFamily: 'DMSans_700Bold', marginBottom: 6,
  };
  const bodyText = {
    fontSize: 13.5, lineHeight: 20, color: theme.textSecondary, fontFamily: 'DMSans_400Regular',
  };

  // Boxes take a light tint + left accent of the metric's own status color, so the
  // whole drill-down reads in the same color code as the data point (amber/green/red).
  const Section = ({ label, body, accent }: { label: string; body: string; accent: string }) => (
    <View style={{ backgroundColor: accent + '14', borderRadius: 12, borderWidth: 0.5, borderColor: theme.borderSubtle, borderLeftWidth: 3, borderLeftColor: accent, padding: 14, marginBottom: 10 }}>
      <Text style={sectionLabel}>{label}</Text>
      <Text style={bodyText}>{body}</Text>
    </View>
  );

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
          maxHeight: '82%',
          backgroundColor: theme.bgSheet,
          borderRadius: 20,
          borderWidth: 0.5,
          borderColor: theme.borderCard,
          borderTopWidth: 4,
          borderTopColor: data?.statusColor ?? theme.borderCard,
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
          {data && (
            <View style={{ paddingHorizontal: 20, paddingBottom: 14, paddingTop: 4, borderBottomWidth: 0.5, borderBottomColor: theme.borderCard }}>
              <Text style={sectionLabel}>{data.title}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
                <Text style={{ fontSize: 30, color: data.statusColor, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1 }}>
                  {data.value}
                </Text>
                {data.statusWord && (
                  <Text style={{ fontSize: 13, color: data.statusColor, fontFamily: 'DMSans_700Bold' }}>
                    {data.statusWord}
                  </Text>
                )}
              </View>
              {data.reference && (
                <Text style={{ fontSize: 11, color: theme.textDim, fontFamily: 'DMSans_400Regular', marginTop: 3 }}>
                  {data.reference}
                </Text>
              )}
            </View>
          )}

          {/* Body */}
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 26 }} showsVerticalScrollIndicator={false}>
            {data && (
              <>
                <Section label="What it is" body={data.definition} accent={data.statusColor} />
                <Section label="How it's calculated" body={data.calculation} accent={data.statusColor} />
                <Section label="What it affects" body={data.affects} accent={data.statusColor} />

                {!data.informationalOnly && data.tips.length > 0 && (
                  <View style={{ backgroundColor: theme.accentBlueBg, borderRadius: 12, borderWidth: 1, borderColor: theme.accentBlueBorder, padding: 14, marginBottom: 10 }}>
                    <Text style={[sectionLabel, { color: theme.accentBlueRaw }]}>How to improve</Text>
                    {data.tips.map((tip, i) => (
                      <View key={i} style={{ flexDirection: 'row', gap: 9, marginBottom: i < data.tips.length - 1 ? 10 : 0 }}>
                        <Ionicons name="bulb" size={14} color={theme.accentBlueRaw} style={{ marginTop: 2 }} />
                        <Text style={[bodyText, { flex: 1 }]}>{tip}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <Text style={{ fontSize: 10.5, lineHeight: 16, color: theme.textDim, fontFamily: 'DMSans_400Regular', marginTop: 4 }}>
                  {data.disclaimer ?? 'For informational purposes only. Not medical advice.'}
                </Text>
              </>
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}
