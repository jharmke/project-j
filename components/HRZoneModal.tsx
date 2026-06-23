// components/HRZoneModal.tsx
// Per-workout HR zone breakdown. Centered floating card (house modal standard: spring
// scale + opacity fired on show, handle pill, tap-off + handle to close). Garmin-style
// independent bars: 5 colored training zones + a grey "Below Zone" bar, each sized to its
// own time (bars do NOT claim to sum to the workout, so below-zone time is honest, not a
// proportional lie). Bars animate in. See SPEC_hr_zones.md.

import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../theme';
import TooltipIcon from './TooltipIcon';
import { ZoneBound, fmtZoneTime, MaxHRSource, HRZoneModel } from '../utils/hrZones';

export interface HRZoneData {
  workoutName: string;
  durationSec: number;
  maxHR: number;
  maxHRSource: MaxHRSource;
  model: HRZoneModel;
  restingHR: number | null;
  bounds: ZoneBound[]; // 5 zones, Z1..Z5
  secs: number[];      // index 0..4 = Z1..Z5 seconds
  belowZ1: number;     // seconds below Z1
  peak: number | null;
}

interface Props {
  visible: boolean;
  loading: boolean;
  data: HRZoneData | null;
  onClose: () => void;
}

const fmtDuration = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

const SOURCE_LABEL: Record<MaxHRSource, string> = {
  estimated: 'Based on your age',
  observed: 'From your workouts',
  manual: 'Set by you',
};

export default function HRZoneModal({ visible, loading, data, onClose }: Props) {
  const { theme } = useTheme();
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const barProgress = useRef(new Animated.Value(0)).current;

  const open = () => {
    scaleAnim.setValue(0.85);
    opacityAnim.setValue(0);
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, damping: 22, stiffness: 300 }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  };

  // Animate the bars whenever real data arrives (not during the loading frame).
  useEffect(() => {
    if (visible && data && !loading) {
      barProgress.setValue(0);
      Animated.timing(barProgress, { toValue: 1, duration: 650, useNativeDriver: false }).start();
    }
  }, [visible, data, loading]);

  const close = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, { toValue: 0.9, duration: 150, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 140, useNativeDriver: true }),
    ]).start(() => onClose());
  };
  const closeWithHaptic = () => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); close(); };

  // Rows: hardest at top (Z5 -> Z1), then Below Zone at the bottom.
  const rows = data ? [
    ...data.bounds.map((b, i) => ({
      key: `z${b.z}`,
      label: `Z${b.z} ${b.name}`,
      range: `${b.lo}-${b.hi} bpm`,
      color: b.color,
      sec: data.secs[i] ?? 0,
    })).reverse(),
    {
      key: 'below',
      label: 'Below Zone',
      range: `under ${data.bounds[0]?.lo ?? 0} bpm`,
      color: theme.textDim,
      sec: data.belowZ1,
    },
  ] : [];
  const maxSec = Math.max(1, ...rows.map(r => r.sec));

  const usingKarvonen = data?.model === 'hrr' && data.restingHR != null;
  const methodValue = data
    ? (usingKarvonen ? `Personalized to your resting HR (${data.restingHR})` : 'Based on your max HR')
    : '';

  return (
    <Modal visible={visible} transparent animationType="none" onShow={open} onRequestClose={closeWithHaptic}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.55)', opacity: opacityAnim }]} pointerEvents="none" />
        <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={closeWithHaptic} />

        <Animated.View style={{
          width: '88%', maxHeight: '84%', backgroundColor: theme.bgSheet, borderRadius: 20,
          borderWidth: 0.5, borderColor: theme.borderCard, borderTopWidth: 4, borderTopColor: theme.accentBlueRaw,
          shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.45, shadowRadius: 28, elevation: 24,
          overflow: 'hidden', transform: [{ scale: scaleAnim }], opacity: opacityAnim,
        }}>
          {/* Handle */}
          <TouchableOpacity onPress={closeWithHaptic} style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }} hitSlop={{ top: 12, bottom: 12, left: 60, right: 60 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.borderCard }} />
          </TouchableOpacity>

          <View style={{ paddingHorizontal: 20, paddingBottom: 18, paddingTop: 6 }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 }}>
              <Text style={{ fontSize: 9, letterSpacing: 3, color: theme.accentBlue, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase' }}>HR Zones</Text>
              <TooltipIcon tooltipKey="hr_zones" size={14} hideTour />
            </View>
            {data && (
              <Text style={{ fontSize: 16, fontFamily: 'DMSans_700Bold', color: theme.textSecondary, marginBottom: 14 }}>
                {data.workoutName} · {fmtDuration(data.durationSec)}
              </Text>
            )}

            {loading ? (
              <View style={{ paddingVertical: 36, alignItems: 'center' }}>
                <ActivityIndicator color={theme.accentBlueRaw} />
                <Text style={{ marginTop: 12, fontSize: 13, fontFamily: 'DMSans_400Regular', color: theme.textMuted }}>Reading heart rate…</Text>
              </View>
            ) : !data ? (
              <View style={{ paddingVertical: 28, alignItems: 'center' }}>
                <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: theme.textDim + '1A', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                  <Ionicons name="pulse" size={26} color={theme.textMuted} />
                </View>
                <Text style={{ fontSize: 14, fontFamily: 'DMSans_700Bold', color: theme.textSecondary, marginBottom: 4 }}>No heart rate recorded</Text>
                <Text style={{ fontSize: 12, lineHeight: 18, fontFamily: 'DMSans_400Regular', color: theme.textMuted, textAlign: 'center', paddingHorizontal: 10 }}>
                  This workout has no heart-rate data to build zones from. HR zones need a watch or tracker that recorded your heart rate during the session.
                </Text>
              </View>
            ) : (
              <>
                {/* Zone bars */}
                {rows.map(r => (
                  <View key={r.key} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                    <View style={{ width: 96, paddingRight: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: r.color }} />
                        <Text style={{ fontSize: 12, fontFamily: 'DMSans_600SemiBold', color: theme.textSecondary }} numberOfLines={1}>{r.label}</Text>
                      </View>
                      <Text style={{ fontSize: 9.5, fontFamily: 'DMSans_400Regular', color: theme.textMuted, marginLeft: 13 }}>{r.range}</Text>
                    </View>
                    <View style={{ flex: 1, height: 10, borderRadius: 5, backgroundColor: theme.bgProgressTrack, overflow: 'hidden' }}>
                      <Animated.View style={{
                        height: '100%', borderRadius: 5, backgroundColor: r.color,
                        width: barProgress.interpolate({ inputRange: [0, 1], outputRange: ['0%', `${Math.round((r.sec / maxSec) * 100)}%`] }),
                      }} />
                    </View>
                    <Text style={{ width: 50, textAlign: 'right', fontSize: 16, fontFamily: 'BebasNeue_400Regular', letterSpacing: 0.5, color: r.sec > 0 ? theme.textPrimary : theme.textDim }}>
                      {fmtZoneTime(r.sec)}
                    </Text>
                  </View>
                ))}

                {/* Max HR + method: consistent label/value rows */}
                <View style={{ marginTop: 6, borderTopWidth: 0.5, borderTopColor: theme.borderCard, paddingTop: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: 7 }}>
                    <Text style={{ width: 66, fontSize: 11, letterSpacing: 0.3, fontFamily: 'DMSans_700Bold', color: theme.textMuted }}>Max HR</Text>
                    <Text style={{ flex: 1, fontSize: 13, fontFamily: 'DMSans_500Medium', color: theme.textSecondary }}>{data.maxHR} bpm · {SOURCE_LABEL[data.maxHRSource]}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                    <Text style={{ width: 66, fontSize: 11, letterSpacing: 0.3, fontFamily: 'DMSans_700Bold', color: theme.textMuted }}>Zones</Text>
                    <Text style={{ flex: 1, fontSize: 13, fontFamily: 'DMSans_500Medium', color: theme.textSecondary }}>{methodValue}</Text>
                  </View>
                  <Text style={{ fontSize: 10.5, fontFamily: 'DMSans_400Regular', color: theme.textDim, marginTop: 12, fontStyle: 'italic', textAlign: 'center' }}>
                    For informational purposes only. Not medical advice.
                  </Text>
                </View>
              </>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
