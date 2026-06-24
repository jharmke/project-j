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
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { triggerHaptic } from '@/utils/haptics';
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

  useEffect(() => {
    (async () => {
      const [entries, p, s] = await Promise.all([loadMeasurements(), loadBodyProfile(), loadBodyMeasureSettings()]);
      setProfile(p);
      setUnit(s.unit);
      // Ghost placeholders = each field's last known value (in the active unit).
      const ph: Record<string, string> = {};
      for (const f of MEASURE_FIELDS) {
        const lk = lastKnownFor(entries, f.key);
        if (lk) ph[f.key] = `last: ${toDisplay(lk.value, s.unit)}`;
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
      <Text style={{ flex: 1, fontSize: 14, fontFamily: 'DMSans_500Medium', color: theme.textSecondary }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', width: 130, backgroundColor: theme.bgInput, borderColor: theme.borderInput, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10 }}>
        <TextInput
          value={inputs[key] ?? ''}
          onChangeText={t => setInputs(prev => ({ ...prev, [key]: t.replace(/[^0-9.]/g, '') }))}
          placeholder={placeholders[key] ?? unitLabel(unit)}
          placeholderTextColor={theme.textPlaceholder}
          keyboardType="decimal-pad"
          style={{ flex: 1, fontSize: 15, fontFamily: 'DMSans_600SemiBold', color: theme.textPrimary, paddingVertical: 9 }}
        />
        <Text style={{ fontSize: 12, fontFamily: 'DMSans_500Medium', color: theme.textMuted }}>{unitLabel(unit)}</Text>
      </View>
    </View>
  );

  return (
    <LinearGradient colors={[theme.gradientStart, theme.gradientEnd]} style={{ flex: 1 }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={{ flex: 1, paddingTop: insets.top }}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); if (router.canGoBack()) router.back(); }}
              style={[styles.headerBtn, { backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder }]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="chevron-back" size={20} color={theme.accentBlue} />
            </TouchableOpacity>
            <Text style={{ fontSize: 16, fontFamily: 'DMSans_700Bold', color: theme.textPrimary }}>{isEdit ? 'Edit Measurements' : 'Log Measurements'}</Text>
            <View style={{ width: 38 }} />
          </View>

          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {/* How to measure entry point */}
            <TouchableOpacity
              onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setHowToOpen(true); }}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder, borderWidth: 1, borderRadius: 10, paddingVertical: 11, marginBottom: 14 }}>
              <Ionicons name="help-circle-outline" size={17} color={theme.accentBlue} />
              <Text style={{ fontSize: 13, fontFamily: 'DMSans_600SemiBold', color: theme.accentBlue }}>How to measure</Text>
            </TouchableOpacity>

            {MEASURE_REGIONS.map(region => (
              <View key={region} style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: theme.borderCardTop }]}>
                <Text style={[styles.cardLabel, { color: theme.textMuted }]}>{region.toUpperCase()}</Text>
                {fieldsForRegion(region).map(f => renderField(f.key, f.label))}
              </View>
            ))}

            {/* Calculated: Navy BF% (read-only) */}
            <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: accent }]}>
              <Text style={[styles.cardLabel, { color: theme.textMuted }]}>CALCULATED</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontFamily: 'DMSans_500Medium', color: theme.textSecondary }}>Navy Body Fat %</Text>
                  <Text style={{ fontSize: 10.5, fontFamily: 'DMSans_400Regular', color: theme.textDim }}>
                    {profile.heightIn ? `Needs neck + waist${profile.sex === 'female' ? ' + hips' : ''}` : 'Add height in your profile first'}
                  </Text>
                </View>
                <Text style={{ fontSize: 24, fontFamily: 'BebasNeue_400Regular', color: liveBF != null ? theme.textPrimary : theme.textDim, letterSpacing: 0.5 }}>
                  {liveBF != null ? `${liveBF}%` : '--'}
                </Text>
              </View>
              <Text style={{ fontSize: 9.5, fontFamily: 'DMSans_400Regular', color: theme.textDim, fontStyle: 'italic', marginTop: 8 }}>
                For informational purposes only. Not medical advice.
              </Text>
            </View>
          </ScrollView>

          {/* Save bar */}
          <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: insets.bottom + 12, borderTopWidth: 0.5, borderTopColor: theme.borderCard, backgroundColor: theme.bgSheet }}>
            <TouchableOpacity
              disabled={!canSave}
              onPress={onSave}
              activeOpacity={0.85}
              style={{ backgroundColor: canSave ? accent : theme.bgInput, borderWidth: canSave ? 0 : 1, borderColor: theme.borderInput, borderRadius: 12, paddingVertical: 15, alignItems: 'center' }}>
              <Text style={{ fontSize: 15, fontFamily: 'DMSans_700Bold', color: canSave ? '#fff' : theme.textDim }}>
                {isEdit ? 'Save Changes' : 'Save Measurements'}
              </Text>
            </TouchableOpacity>
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
  cardLabel: { fontSize: 9, letterSpacing: 3, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase', marginBottom: 8 },
});
