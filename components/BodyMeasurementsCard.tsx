// components/BodyMeasurementsCard.tsx
// Condensed Body Measurements card for Stats > BODY. Whole card taps through to the dedicated
// screen (chevron top-right); a dedicated LOG button + a gear to pick which 4-6 fields show.
// Each slot: value + label + delta from first logged entry. Fixed footer: Weight + Navy BF%.
// Mindful strips delta color. See SPEC_body_measurements.md.

import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { triggerHaptic } from '@/utils/haptics';
import { useTheme } from '../theme';
import { useToast } from './Toast';
import {
  BodyMeasurementEntry, MEASURE_FIELDS, MeasureFieldKey,
  loadMeasurements, loadBodyMeasureSettings, loadBodyProfile, saveBodyMeasureSettings,
  lastKnownFor, deltaFromStart, lastKnownBodyFat, toDisplay, unitLabel, inToCm,
  BodyMeasureSettings, BodyProfile,
} from '../utils/bodyMeasurements';

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

  const openPicker = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setDraftSlots(settings.slots);
    setPickerOpen(true);
  };
  const toggleSlot = (key: MeasureFieldKey) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setDraftSlots(prev => {
      if (prev.includes(key)) return prev.filter(k => k !== key);
      if (prev.length >= 6) return prev; // cap at 6
      return [...prev, key];
    });
  };
  const savePicker = async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    await saveBodyMeasureSettings({ slots: draftSlots });
    setSettings(s => ({ ...s, slots: draftSlots }));
    setPickerOpen(false);
    showToast('Card updated', undefined, 'success');
  };

  const fmtDelta = (deltaIn: number): string => {
    const d = u === 'cm' ? Math.round(inToCm(deltaIn) * 10) / 10 : deltaIn;
    return `${d > 0 ? '+' : ''}${d} ${unitLabel(u)}`;
  };

  const slots = settings.slots;
  const cardBase = {
    backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: accent,
    borderWidth: 0.5, borderTopWidth: 0.5, borderRadius: 14, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 12, elevation: 6,
  };

  return (
    <TouchableOpacity activeOpacity={0.85}
      onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); router.push('/body-measurements'); }}
      style={cardBase}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <Text style={{ fontSize: 9, letterSpacing: 3, color: theme.textMuted, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase' }}>Body Measurements</Text>
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
          <Text style={{ fontSize: 13, fontFamily: 'DMSans_600SemiBold', color: theme.textSecondary, marginBottom: 4 }}>Track your measurements</Text>
          <Text style={{ fontSize: 11.5, lineHeight: 17, fontFamily: 'DMSans_400Regular', color: theme.textMuted, textAlign: 'center', marginBottom: 12 }}>
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
              const deltaColor = isMindful ? theme.textSecondary : (delta == null || delta === 0 ? theme.textMuted : delta < 0 ? theme.accentGreen : theme.accentAmber);
              return (
                <View key={key} style={{ width: isLastOdd ? '100%' : '50%', alignItems: isLastOdd ? 'center' : 'flex-start', paddingVertical: 7, paddingRight: isLastOdd ? 0 : 8 }}>
                  <Text style={{ fontSize: 10, fontFamily: 'DMSans_600SemiBold', color: theme.textMuted }}>{def.label}</Text>
                  <Text style={{ fontSize: 22, fontFamily: 'BebasNeue_400Regular', letterSpacing: 0.5, color: lk ? theme.textPrimary : theme.textDim }}>
                    {lk ? toDisplay(lk.value, u) : '--'}<Text style={{ fontSize: 12, color: theme.textMuted }}>{lk ? ` ${unitLabel(u)}` : ''}</Text>
                  </Text>
                  <Text style={{ fontSize: 10.5, fontFamily: 'DMSans_500Medium', color: deltaColor }}>
                    {delta == null ? '—' : fmtDelta(delta)}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Fixed footer: Weight + BF% */}
          <View style={{ flexDirection: 'row', borderTopWidth: 0.5, borderTopColor: theme.borderCard, marginTop: 8, paddingTop: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 9, letterSpacing: 1.5, color: theme.textMuted, fontFamily: 'DMSans_700Bold' }}>WEIGHT</Text>
              <Text style={{ fontSize: 18, fontFamily: 'DMSans_700Bold', color: profile.weight ? theme.textPrimary : theme.textDim }}>
                {profile.weight ? `${profile.weight}` : '--'}<Text style={{ fontSize: 11, color: theme.textMuted }}>{profile.weight ? ' lb' : ''}</Text>
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 9, letterSpacing: 1.5, color: theme.textMuted, fontFamily: 'DMSans_700Bold' }}>BODY FAT</Text>
              <Text style={{ fontSize: 18, fontFamily: 'DMSans_700Bold', color: bf ? theme.textPrimary : theme.textDim }}>
                {bf ? `${bf.value}%` : '--'}
              </Text>
            </View>
          </View>
        </>
      )}

      {/* LOG button */}
      <TouchableOpacity
        onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Medium); router.push('/body-measurement-log'); }}
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: accent, borderRadius: 8, paddingVertical: 11, marginTop: 12 }}>
        <Ionicons name="add" size={17} color="#fff" />
        <Text style={{ fontSize: 13, fontFamily: 'DMSans_700Bold', color: '#fff' }}>Log Measurements</Text>
      </TouchableOpacity>

      {/* Slot picker */}
      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.overlayBg, paddingHorizontal: 24 }}>
          <View style={{ width: '100%', maxHeight: '76%', backgroundColor: theme.bgSheet, borderRadius: 18, borderTopWidth: 4, borderTopColor: accent, paddingTop: 16, paddingBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.45, shadowRadius: 28, elevation: 24 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.sheetHandle, alignSelf: 'center', marginBottom: 12 }} />
            <Text style={{ fontSize: 16, fontFamily: 'DMSans_700Bold', color: theme.textPrimary, textAlign: 'center', marginBottom: 2 }}>Card Fields</Text>
            <Text style={{ fontSize: 12, fontFamily: 'DMSans_400Regular', color: theme.textMuted, textAlign: 'center', marginBottom: 10 }}>Pick up to 6 to show ({draftSlots.length}/6)</Text>
            <ScrollView style={{ paddingHorizontal: 18 }} showsVerticalScrollIndicator={false}>
              {MEASURE_FIELDS.map(f => {
                const on = draftSlots.includes(f.key);
                return (
                  <TouchableOpacity key={f.key} onPress={() => toggleSlot(f.key)}
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 11, borderBottomWidth: 0.5, borderBottomColor: theme.borderCard }}>
                    <Text style={{ fontSize: 14, fontFamily: 'DMSans_500Medium', color: on ? theme.textPrimary : theme.textSecondary }}>{f.label}</Text>
                    <Ionicons name={on ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={on ? accent : theme.textDim} />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <View style={{ flexDirection: 'row', gap: 10, padding: 16 }}>
              <TouchableOpacity onPress={() => setPickerOpen(false)} style={{ flex: 1, alignItems: 'center', paddingVertical: 13, borderRadius: 10, borderWidth: 1, borderColor: theme.borderInput }}>
                <Text style={{ fontSize: 14, fontFamily: 'DMSans_600SemiBold', color: theme.textSecondary }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={draftSlots.length < 1} onPress={savePicker} style={{ flex: 1, alignItems: 'center', paddingVertical: 13, borderRadius: 10, backgroundColor: draftSlots.length < 1 ? theme.bgInput : accent }}>
                <Text style={{ fontSize: 14, fontFamily: 'DMSans_700Bold', color: draftSlots.length < 1 ? theme.textDim : '#fff' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({});
