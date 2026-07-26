// components/BodyMeasurementsCard.tsx
// Condensed Body Measurements card for Stats > BODY. Whole card taps through to the dedicated
// screen (chevron top-right); a dedicated LOG button + a gear to pick which 4-6 fields show.
// Each slot: value + label + delta from first logged entry. Fixed footer: Weight + Navy BF%.
// Mindful strips delta color. See SPEC_body_measurements.md.

import { Ionicons } from '@/components/AppIcons';
import { Text } from '@/components/AppText';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Animated, Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { triggerHaptic } from '@/utils/haptics';
import { useTheme } from '../theme';
import ButtonShine from './ButtonShine';
import { useToast, ToastRenderer } from './Toast';
import {
  BodyMeasurementEntry, MEASURE_FIELDS, MeasureFieldKey,
  loadMeasurements, loadBodyMeasureSettings, loadBodyProfile, saveBodyMeasureSettings,
  lastKnownFor, deltaFromStart, lastKnownBodyFat, toDisplay, unitLabel, inToCm,
  BodyMeasureSettings, BodyProfile,
} from '../utils/bodyMeasurements';
import { Type } from '../typography';
import GradientNumber from './GradientNumber';
import GradientTitle from './GradientTitle';

export default function BodyMeasurementsCard() {
  const { theme } = useTheme();
  const { showToast } = useToast();
  const [entries, setEntries] = useState<BodyMeasurementEntry[]>([]);
  const [settings, setSettings] = useState<BodyMeasureSettings>({ unit: 'in', goal: null, slots: [] });
  const [profile, setProfile] = useState<BodyProfile>({ sex: 'male', heightIn: null, weight: null });
  const [isMindful, setIsMindful] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draftSlots, setDraftSlots] = useState<MeasureFieldKey[]>([]);

  const load = useCallback(async () => {
    const [e, s, p, raw] = await Promise.all([
      loadMeasurements(), loadBodyMeasureSettings(), loadBodyProfile(), AsyncStorage.getItem('pj_settings'),
    ]);
    setEntries(e); setSettings(s); setProfile(p);
    if (raw) { try { setIsMindful(JSON.parse(raw).styleMode === 'Mindful'); } catch {} }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const accent = theme.accentBlueRaw;
  const u = settings.unit;
  const bf = lastKnownBodyFat(entries);
  const hasData = entries.length > 0;

  const pickerScale = useRef(new Animated.Value(0.85)).current;
  const pickerOpacity = useRef(new Animated.Value(0)).current;
  const animatePickerIn = () => {
    pickerScale.setValue(0.85); pickerOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(pickerScale, { toValue: 1, useNativeDriver: true, damping: 22, stiffness: 300 }),
      Animated.timing(pickerOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  };
  const closePicker = (after?: () => void) => {
    Animated.parallel([
      Animated.timing(pickerScale, { toValue: 0.9, duration: 150, useNativeDriver: true }),
      Animated.timing(pickerOpacity, { toValue: 0, duration: 140, useNativeDriver: true }),
    ]).start(() => { setPickerOpen(false); after?.(); });
  };
  const closePickerHaptic = () => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); closePicker(); };

  const openPicker = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setDraftSlots(settings.slots);
    setPickerOpen(true);
  };
  const toggleSlot = (key: MeasureFieldKey) => {
    if (draftSlots.includes(key)) { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setDraftSlots(draftSlots.filter(k => k !== key)); return; }
    if (draftSlots.length >= 6) { showToast('Up to 6 fields', 'Remove one to add another', 'error'); return; }
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setDraftSlots([...draftSlots, key]);
  };
  const savePicker = async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    await saveBodyMeasureSettings({ slots: draftSlots });
    setSettings(s => ({ ...s, slots: draftSlots }));
    closePicker(() => showToast('Card updated', undefined, 'success'));
  };

  const fmtDelta = (deltaIn: number): string => {
    const d = u === 'cm' ? Math.round(inToCm(deltaIn) * 10) / 10 : deltaIn;
    return `${d > 0 ? '+' : ''}${d} ${unitLabel(u)}`;
  };

  const slots = settings.slots;
  const cardBase = {
    backgroundColor: theme.bgCardGlass, borderColor: theme.borderCard, borderTopColor: accent,
    borderWidth: 0.5, borderTopWidth: 0.5, borderRadius: 14, padding: 16, marginBottom: 12,
    shadowColor: theme.cardShadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: theme.cardShadowOpacity, shadowRadius: 12, elevation: 6,
  };

  return (
    <TouchableOpacity activeOpacity={0.85}
      onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); router.push('/body-measurements'); }}
      style={cardBase}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <Text style={{ fontSize: 9, letterSpacing: 3, color: theme.textMuted, fontFamily: Type.uiBold, textTransform: 'uppercase' }}>Body Measurements</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {hasData && (
            <TouchableOpacity onPress={openPicker} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="options-outline" size={16} color={theme.textMuted} />
            </TouchableOpacity>
          )}
          <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
        </View>
      </View>

      {!hasData ? (
        <View style={{ alignItems: 'center', paddingVertical: 10 }}>
          <Text style={{ fontSize: 13, fontFamily: Type.uiSemibold, color: theme.textSecondary, marginBottom: 4 }}>Track your measurements</Text>
          <Text style={{ fontSize: 11.5, lineHeight: 17, fontFamily: Type.ui, color: theme.textMuted, textAlign: 'center', marginBottom: 12 }}>
            Log waist, arms, and more with a tape measure to see real progress over time.
          </Text>
        </View>
      ) : (
        <>
          {/* Slots grid */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {slots.map((key, i) => {
              const def = MEASURE_FIELDS.find(f => f.key === key);
              if (!def) return null;
              const lk = lastKnownFor(entries, key);
              const delta = deltaFromStart(entries, key);
              const isLastOdd = i === slots.length - 1 && slots.length % 2 === 1;
              // Neutral deltas for now: green/amber would assume "smaller is better", which is
              // wrong for muscle-gain goals. Re-introduce goal-aware coloring with the goal selector.
              const deltaColor = theme.textSecondary;
              return (
                <View key={key} style={{ width: isLastOdd ? '100%' : '50%', alignItems: isLastOdd ? 'center' : 'flex-start', paddingVertical: 7, paddingRight: isLastOdd ? 0 : 8 }}>
                  <Text style={{ fontSize: 10, fontFamily: Type.uiSemibold, color: theme.textMuted }}>{def.label}</Text>
                  <GradientNumber value={lk ? `${toDisplay(lk.value, u)} ${unitLabel(u)}` : '--'} color={lk ? theme.textSecondary : theme.textDim} style={{ fontSize: 22, fontFamily: Type.num, letterSpacing: 0.5 }} />
                  <GradientNumber value={delta == null ? '—' : fmtDelta(delta)} color={deltaColor} style={{ fontSize: 10.5, fontFamily: Type.uiMedium }} />
                </View>
              );
            })}
          </View>

          {/* Fixed footer: Weight + BF% */}
          <View style={{ flexDirection: 'row', borderTopWidth: 0.5, borderTopColor: theme.borderCard, marginTop: 8, paddingTop: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 9, letterSpacing: 1.5, color: theme.textMuted, fontFamily: Type.uiBold }}>WEIGHT</Text>
              <GradientNumber value={profile.weight ? `${profile.weight} lb` : '--'} color={profile.weight ? theme.textSecondary : theme.textDim} style={{ fontSize: 18, fontFamily: Type.uiBold }} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 9, letterSpacing: 1.5, color: theme.textMuted, fontFamily: Type.uiBold }}>BODY FAT</Text>
              <GradientNumber value={bf ? `${bf.value}%` : '--'} color={bf ? theme.textSecondary : theme.textDim} style={{ fontSize: 18, fontFamily: Type.uiBold }} />
            </View>
          </View>
        </>
      )}

      {/* LOG button -- house interactive-button recipe (tinted fill + accent border + accent text).
          Solid accent fill is reserved for the app's one primary CTA (Support screen). */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Medium); router.push('/body-measurement-log'); }}
        style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
          backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder,
          borderRadius: 8, paddingVertical: 11, marginTop: 12,
        }}>
        <ButtonShine radius={8} />
        <Ionicons name="add" size={17} color={theme.accentBlue} />
        <Text style={{ fontSize: 13, fontFamily: Type.uiBold, color: theme.accentBlue }}>Log Measurements</Text>
      </TouchableOpacity>

      {/* Slot picker -- house-standard centered modal */}
      <Modal visible={pickerOpen} transparent animationType="none" onShow={animatePickerIn} onRequestClose={closePickerHaptic}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.overlayBg, opacity: pickerOpacity }]} pointerEvents="none" />
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={closePickerHaptic} />
          <Animated.View style={{ width: '88%', maxHeight: '78%', backgroundColor: theme.bgSheet, borderRadius: 20, borderWidth: 0.5, borderColor: theme.borderCard, borderTopWidth: 4, borderTopColor: accent, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.45, shadowRadius: 28, elevation: 24, transform: [{ scale: pickerScale }], opacity: pickerOpacity }}>
            {/* Handle */}
            <TouchableOpacity onPress={closePickerHaptic} style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }} hitSlop={{ top: 12, bottom: 12, left: 60, right: 60 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.sheetHandle }} />
            </TouchableOpacity>
            {/* Header */}
            <View style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <GradientTitle title="Card Fields" color={theme.accentBlue} style={{ fontSize: 18, letterSpacing: 0.3, fontFamily: Type.display }} />
              <TouchableOpacity onPress={closePickerHaptic} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={20} color={theme.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 12, fontFamily: Type.ui, color: theme.textMuted, paddingHorizontal: 20, marginBottom: 6 }}>Pick up to 6 to show ({draftSlots.length}/6)</Text>
            <ScrollView style={{ paddingHorizontal: 18 }} showsVerticalScrollIndicator={false}>
              {MEASURE_FIELDS.map(f => {
                const on = draftSlots.includes(f.key);
                return (
                  <TouchableOpacity key={f.key} onPress={() => toggleSlot(f.key)}
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 11, borderBottomWidth: 0.5, borderBottomColor: theme.borderCard }}>
                    <Text style={{ fontSize: 14, fontFamily: Type.uiMedium, color: on ? accent : theme.textSecondary }}>{f.label}</Text>
                    <Ionicons name={on ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={on ? accent : theme.textDim} />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <View style={{ flexDirection: 'row', gap: 10, padding: 16 }}>
              <TouchableOpacity onPress={closePickerHaptic} style={{ flex: 1, alignItems: 'center', paddingVertical: 13, borderRadius: 10, borderWidth: 1, borderColor: theme.borderInput }}>
                <Text style={{ fontSize: 14, fontFamily: Type.uiSemibold, color: theme.textSecondary }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={draftSlots.length < 1} onPress={savePicker} style={{ flex: 1, alignItems: 'center', paddingVertical: 13, borderRadius: 10, backgroundColor: draftSlots.length < 1 ? theme.bgInput : accent }}>
                {draftSlots.length >= 1 && <ButtonShine radius={10} />}
                <Text style={{ fontSize: 14, fontFamily: Type.uiBold, color: draftSlots.length < 1 ? theme.textDim : '#fff' }}>Save</Text>
              </TouchableOpacity>
            </View>
            <ToastRenderer />
          </Animated.View>
        </View>
      </Modal>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({});
