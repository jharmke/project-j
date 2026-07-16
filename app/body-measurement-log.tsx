// app/body-measurement-log.tsx
// Full-screen Body Measurements logging + edit form. Grouped by region, all fields optional
// (empty saves as null, never 0). New logs show the last value as a ghost placeholder (no
// pre-fill); edit mode pre-fills the entry being corrected. Live Navy BF% preview. Today only
// for new entries. See SPEC_body_measurements.md.

import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { triggerHaptic } from '@/utils/haptics';
import { BlurView } from 'expo-blur';
import PrimaryCTA from '../components/PrimaryCTA';
import ButtonShine from '../components/ButtonShine';
import { setFloatingBarHeight } from '../utils/floatingBar';
import { useTheme } from '../theme';
import { useToast } from '../components/Toast';
import MeasureHowToModal from '../components/MeasureHowToModal';
import {
  MEASURE_FIELDS, MEASURE_REGIONS, fieldsForRegion, MeasureFieldKey,
  loadMeasurements, addMeasurement, updateMeasurement,
  loadBodyProfile, loadBodyMeasureSettings, lastKnownFor,
  navyBodyFat, fromInput, toDisplay, unitLabel, hasAnyValue,
  BodyProfile, MeasurementUnit,
} from '../utils/bodyMeasurements';
import { Type } from '../typography';
import ScreenHeader from '../components/ScreenHeader';

// Roughly the always-on save bar's content height (button + its padding, no safe-area inset). Registered
// with the floating-bar signal so Otto's FAB glides up and stops covering "Save Measurements".
const SAVE_BAR_H = 74;

export default function BodyMeasurementLogScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;

  const [unit, setUnit] = useState<MeasurementUnit>('in');
  const [profile, setProfile] = useState<BodyProfile>({ sex: 'male', heightIn: null, weight: null });
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [placeholders, setPlaceholders] = useState<Record<string, string>>({});
  const [howToOpen, setHowToOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  // The save bar pads itself by insets.bottom for the home indicator. But KeyboardAvoidingView ALREADY
  // lifts the whole container by the keyboard height, and the keyboard covers the home indicator -- so with
  // the keyboard up that padding was ~46px of dead space between the button and the keys (Justin, 2026-07-15).
  const [keyboardUp, setKeyboardUp] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardWillShow', () => setKeyboardUp(true));
    const hide = Keyboard.addListener('keyboardWillHide', () => setKeyboardUp(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  // The save bar is always on this screen, so tell Otto's FAB to sit above it (else it covers Save).
  useEffect(() => {
    setFloatingBarHeight(SAVE_BAR_H);
    return () => setFloatingBarHeight(0);
  }, []);

  useEffect(() => {
    (async () => {
      const [entries, p, s] = await Promise.all([loadMeasurements(), loadBodyProfile(), loadBodyMeasureSettings()]);
      setProfile(p);
      setUnit(s.unit);
      // Ghost placeholders = each field's last known value (in the active unit).
      const ph: Record<string, string> = {};
      for (const f of MEASURE_FIELDS) {
        const lk = lastKnownFor(entries, f.key);
        if (lk) ph[f.key] = `${toDisplay(lk.value, s.unit)}`;
      }
      setPlaceholders(ph);
      // Edit mode: pre-fill the entry's values.
      if (id) {
        const entry = entries.find(e => e.id === id);
        if (entry) {
          const pre: Record<string, string> = {};
          for (const f of MEASURE_FIELDS) {
            const v = entry.values[f.key];
            if (typeof v === 'number') pre[f.key] = String(toDisplay(v, s.unit));
          }
          setInputs(pre);
        }
      }
      setLoaded(true);
    })();
  }, [id]);

  // Build the inches value map from current inputs.
  const valuesIn = (): Partial<Record<MeasureFieldKey, number | null>> => {
    const out: Partial<Record<MeasureFieldKey, number | null>> = {};
    for (const f of MEASURE_FIELDS) {
      const raw = inputs[f.key];
      const n = raw != null && raw.trim() !== '' ? parseFloat(raw) : NaN;
      out[f.key] = Number.isFinite(n) && n > 0 ? fromInput(n, unit) : null;
    }
    return out;
  };

  const vIn = valuesIn();
  const liveBF = navyBodyFat(profile.sex, profile.heightIn, vIn);
  const canSave = hasAnyValue(vIn);

  const onSave = async () => {
    if (!canSave) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    if (isEdit && id) {
      await updateMeasurement(id, vIn, liveBF);
      showToast('Measurements updated', undefined, 'success');
    } else {
      await addMeasurement(vIn, liveBF);
      showToast('Measurements logged', liveBF != null ? `${liveBF}% body fat` : undefined, 'success');
    }
    if (router.canGoBack()) router.back();
  };

  const accent = theme.accentBlueRaw;

  const renderField = (key: MeasureFieldKey, label: string) => (
    <View key={key} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 7 }}>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ width: 3, height: 16, borderRadius: 2, backgroundColor: accent, marginRight: 10 }} />
        <Text style={{ fontSize: 14, fontFamily: Type.uiSemibold, color: theme.textSecondary }}>{label}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', width: 130, backgroundColor: theme.bgInput, borderColor: theme.borderInput, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10 }}>
        <TextInput
          value={inputs[key] ?? ''}
          onChangeText={t => setInputs(prev => ({ ...prev, [key]: t.replace(/[^0-9.]/g, '') }))}
          placeholder={placeholders[key] ?? ''}
          placeholderTextColor={theme.textPlaceholder}
          keyboardType="decimal-pad"
          style={{ flex: 1, fontSize: 15, fontFamily: Type.uiSemibold, color: theme.textPrimary, paddingVertical: 9 }}
        />
        <Text style={{ fontSize: 12, fontFamily: Type.uiMedium, color: theme.textMuted }}>{unitLabel(unit)}</Text>
      </View>
    </View>
  );

  return (
    <LinearGradient colors={[theme.gradientStart, theme.gradientEnd]} style={{ flex: 1 }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={{ flex: 1, paddingTop: insets.top }}>
          {/* Header */}
          {/* The title was in Type.num -- Rajdhani, the NUMBER face -- on a page of text inputs. */}
          <ScreenHeader
            title={isEdit ? 'Edit Measurements' : 'Log Measurements'}
            topInset={false}
            onBack={() => { if (router.canGoBack()) router.back(); }}
          />

          {/* paddingBottom clears the now-ABSOLUTE save bar so the last field is reachable, not trapped
              behind it. ~96 = the bar's height plus air. */}
          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 160 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {/* How to measure entry point -- matches the Stats "View All Achievements" tinted button. */}
            <TouchableOpacity
              onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setHowToOpen(true); }}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.accentBlueBgOpaque, borderColor: theme.accentBlueBorder, borderWidth: 1, borderRadius: 8, paddingVertical: 14, marginBottom: 14 }}>
              <ButtonShine radius={8} />
              <Ionicons name="help-circle" size={16} color={theme.accentBlue} />
              <Text style={{ fontSize: 13, fontFamily: Type.uiBold, color: theme.accentBlue, letterSpacing: 1 }}>HOW TO MEASURE</Text>
            </TouchableOpacity>

            {MEASURE_REGIONS.map(region => (
              <View key={region} style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: accent }]}>
                <Text style={[styles.cardLabel, { color: theme.textMuted }]}>{region.toUpperCase()}</Text>
                {fieldsForRegion(region).map(f => renderField(f.key, f.label))}
              </View>
            ))}

            {/* Calculated: Navy BF% (read-only) */}
            <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: accent }]}>
              <Text style={[styles.cardLabel, { color: theme.textMuted }]}>CALCULATED</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontFamily: Type.uiMedium, color: theme.textSecondary }}>Navy Body Fat %</Text>
                  <Text style={{ fontSize: 10.5, fontFamily: Type.ui, color: theme.textDim }}>
                    {profile.heightIn ? `Needs neck + waist${profile.sex === 'female' ? ' + hips' : ''}` : 'Add height in your profile first'}
                  </Text>
                </View>
                <Text style={{ fontSize: 24, fontFamily: Type.num, color: liveBF != null ? theme.textPrimary : theme.textDim, letterSpacing: 0.5 }}>
                  {liveBF != null ? `${liveBF}%` : '--'}
                </Text>
              </View>
              <Text style={{ fontSize: 9.5, fontFamily: Type.ui, color: theme.textDim, fontStyle: 'italic', marginTop: 8 }}>
                For informational purposes only. Not medical advice.
              </Text>
            </View>
          </ScrollView>

          {/* Save bar. Two fixes, 2026-07-15:
              1. ABSOLUTE, not a flex sibling. As a sibling the ScrollView ENDED at the bar's top edge, so
                 nothing ever passed underneath -- the last card was being CLIPPED, not sliding under. Blur
                 with nothing behind it is just a pale rectangle, which is why it read as "not see-through at
                 all". Profile's bar is absolute; that is why its glass works. Content passes under now.
              2. insets.bottom ONLY when the keyboard is DOWN. KeyboardAvoidingView already lifts this whole
                 container by the keyboard height, and the keyboard covers the home indicator, so adding the
                 inset on top left a dead gap between the button and the keys. */}
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 10, paddingBottom: keyboardUp ? 12 : insets.bottom + 12, borderTopWidth: 0.5, borderTopColor: theme.borderCard, overflow: 'hidden' }}>
            <BlurView
              intensity={theme.id === 'dark' ? 40 : 34}
              tint={theme.id === 'dark' ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.chromeFill }]} pointerEvents="none" />
            <PrimaryCTA
              faceStyle={{ paddingVertical: 15, borderRadius: 12 }}
              label={isEdit ? 'Save Changes' : 'Save Measurements'}
              onPress={onSave}
              disabled={!canSave}
            />
          </View>
        </View>
      </KeyboardAvoidingView>

      <MeasureHowToModal visible={howToOpen} onClose={() => setHowToOpen(false)} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  headerBtn: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  card: { borderWidth: 0.5, borderTopWidth: 0.5, borderRadius: 14, padding: 16, marginBottom: 12 },
  cardLabel: { fontSize: 9, letterSpacing: 3, fontFamily: Type.uiBold, textTransform: 'uppercase', marginBottom: 8 },
});
