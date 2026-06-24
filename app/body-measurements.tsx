// app/body-measurements.tsx
// Body Measurements dashboard (dedicated screen). Top: current snapshot (all fields'
// last-known value with honest staleness labels). Middle: collapsible sparkline trends.
// Bottom: reverse-chron history with edit/delete. FAB -> full-screen logging form.
// See SPEC_body_measurements.md.

import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useRef, useState } from 'react';
import { Alert, Animated, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Polyline } from 'react-native-svg';
import { triggerHaptic } from '@/utils/haptics';
import { useTheme } from '../theme';
import { useToast } from '../components/Toast';
import TooltipIcon from '../components/TooltipIcon';
import MeasureHowToModal from '../components/MeasureHowToModal';
import {
  BodyMeasurementEntry, MEASURE_FIELDS, MEASURE_REGIONS, fieldsForRegion,
  loadMeasurements, deleteMeasurement, loadBodyMeasureSettings, loadBodyProfile,
  lastKnownFor, firstKnownFor, deltaFromStart, lastKnownBodyFat,
  toDisplay, unitLabel, relativeAge, daysSince, STALE_DAYS,
  BodyMeasureSettings, BodyProfile, MeasureFieldKey,
} from '../utils/bodyMeasurements';

const DISCLAIMER_KEY = 'pj_navy_bf_disclaimer_seen';

export default function BodyMeasurementsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();

  const [entries, setEntries] = useState<BodyMeasurementEntry[]>([]);
  const [settings, setSettings] = useState<BodyMeasureSettings>({ unit: 'in', goal: null, slots: [] });
  const [profile, setProfile] = useState<BodyProfile>({ sex: 'male', heightIn: null, weight: null });
  const [styleMode, setStyleMode] = useState<string>('Balanced');
  const [loaded, setLoaded] = useState(false);
  const [trendsOpen, setTrendsOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [howToOpen, setHowToOpen] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  const isMindful = styleMode === 'Mindful';

  const load = useCallback(async () => {
    const [e, s, p, settingsRaw] = await Promise.all([
      loadMeasurements(), loadBodyMeasureSettings(), loadBodyProfile(),
      AsyncStorage.getItem('pj_settings'),
    ]);
    setEntries(e);
    setSettings(s);
    setProfile(p);
    if (settingsRaw) { try { setStyleMode(JSON.parse(settingsRaw).styleMode || 'Balanced'); } catch {} }
    setLoaded(true);
    // First-use disclaimer: only once any body-fat value exists to show.
    const bf = lastKnownBodyFat(e);
    if (bf) {
      const seen = await AsyncStorage.getItem(DISCLAIMER_KEY);
      if (seen !== 'true') setShowDisclaimer(true);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const dismissDisclaimer = async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    try { await AsyncStorage.setItem(DISCLAIMER_KEY, 'true'); } catch {}
    setShowDisclaimer(false);
  };

  const onDelete = (id: string) => {
    Alert.alert('Delete entry?', 'This removes this measurement session for good.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
        await deleteMeasurement(id);
        showToast('Entry deleted', undefined, 'info');
        setExpandedId(null);
        load();
      } },
    ]);
  };

  const bf = lastKnownBodyFat(entries);
  const hasData = entries.length > 0;
  const u = settings.unit;
  const accent = theme.accentBlueRaw;

  const shadowStyle = {
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 12, elevation: 6,
  };

  return (
    <LinearGradient colors={[theme.gradientStart, theme.gradientEnd]} style={{ flex: 1 }}>
      <View style={{ flex: 1, paddingTop: insets.top }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
            style={[styles.headerBtn, { backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder }]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="chevron-back" size={20} color={theme.accentBlue} />
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 26, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1, color: theme.accentBlueRaw }}>BODY</Text>
            <TooltipIcon tooltipKey="body_measurements" size={15} />
          </View>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 120 }} showsVerticalScrollIndicator={false}>
          {!loaded ? null : !hasData ? (
            <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: accent, ...shadowStyle, alignItems: 'center', paddingVertical: 36 }]}>
              <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: accent + '1A', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <Ionicons name="body" size={28} color={accent} />
              </View>
              <Text style={{ fontSize: 16, fontFamily: 'DMSans_700Bold', color: theme.textSecondary, marginBottom: 6 }}>No measurements yet</Text>
              <Text style={{ fontSize: 13, lineHeight: 19, fontFamily: 'DMSans_400Regular', color: theme.textMuted, textAlign: 'center', paddingHorizontal: 24 }}>
                Grab a tape measure and tap the + to log your first session. Tracking a few key spots over time tells the real story.
              </Text>
            </View>
          ) : (
            <>
              {/* ── Snapshot ───────────────────────────────────────────── */}
              <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: accent, ...shadowStyle }]}>
                <Text style={[styles.cardLabel, { color: theme.textMuted }]}>CURRENT SNAPSHOT</Text>

                {/* Hero: Navy BF% + Weight */}
                <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 9, letterSpacing: 2, color: theme.textMuted, fontFamily: 'DMSans_700Bold' }}>BODY FAT</Text>
                    <Text style={{ fontSize: 34, fontFamily: 'BebasNeue_400Regular', color: theme.textPrimary, letterSpacing: 0.5 }}>
                      {bf ? `${bf.value}%` : '--'}
                    </Text>
                    <Text style={{ fontSize: 10, fontFamily: 'DMSans_400Regular', color: theme.textDim }}>{bf ? `Navy · ${relativeAge(bf.date)}` : 'Log neck + waist'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 9, letterSpacing: 2, color: theme.textMuted, fontFamily: 'DMSans_700Bold' }}>WEIGHT</Text>
                    <Text style={{ fontSize: 34, fontFamily: 'BebasNeue_400Regular', color: theme.textPrimary, letterSpacing: 0.5 }}>
                      {profile.weight ? `${profile.weight}` : '--'}<Text style={{ fontSize: 15, color: theme.textMuted }}>{profile.weight ? ' lb' : ''}</Text>
                    </Text>
                    <Text style={{ fontSize: 10, fontFamily: 'DMSans_400Regular', color: theme.textDim }}>From your profile</Text>
                  </View>
                </View>

                <Text style={{ fontSize: 9.5, fontFamily: 'DMSans_400Regular', color: theme.textDim, fontStyle: 'italic', marginTop: 2, marginBottom: 12 }}>
                  For informational purposes only. Not medical advice.
                </Text>

                {/* All 13 fields, 2-col, honest staleness */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {MEASURE_FIELDS.map(f => {
                    const lk = lastKnownFor(entries, f.key);
                    const stale = lk ? daysSince(lk.date) > STALE_DAYS : false;
                    return (
                      <View key={f.key} style={{ width: '50%', paddingVertical: 6, paddingRight: 8 }}>
                        <Text style={{ fontSize: 9, fontFamily: 'DMSans_700Bold', color: theme.textMuted, letterSpacing: 1, textTransform: 'uppercase' }} numberOfLines={1}>{f.label}</Text>
                        {lk ? (
                          <>
                            <Text style={{ fontSize: 18, fontFamily: 'DMSans_700Bold', color: stale ? theme.textDim : theme.textPrimary }}>
                              {toDisplay(lk.value, u)}<Text style={{ fontSize: 11, color: theme.textMuted }}> {unitLabel(u)}</Text>
                            </Text>
                            <Text style={{ fontSize: 9.5, fontFamily: 'DMSans_400Regular', color: stale ? theme.accentAmber : theme.textDim }}>{relativeAge(lk.date)}</Text>
                          </>
                        ) : (
                          <Text style={{ fontSize: 14, fontFamily: 'DMSans_500Medium', color: theme.textDim, marginTop: 2 }}>Not logged</Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* ── Trends (collapsible) ───────────────────────────────── */}
              <TouchableOpacity activeOpacity={0.8}
                onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setTrendsOpen(o => !o); }}
                style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: accent, ...shadowStyle, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 }]}>
                <Text style={[styles.cardLabel, { color: theme.textMuted, marginBottom: 0 }]}>TRENDS</Text>
                <Ionicons name={trendsOpen ? 'chevron-up' : 'chevron-down'} size={18} color={theme.textMuted} />
              </TouchableOpacity>
              {trendsOpen && (
                <View style={{ marginTop: -6, marginBottom: 12 }}>
                  {MEASURE_FIELDS.map(f => {
                    const series = entries
                      .filter(e => typeof e.values[f.key] === 'number')
                      .map(e => ({ v: e.values[f.key] as number, d: e.date }))
                      .reverse(); // oldest -> newest
                    if (series.length < 2) return null;
                    return <Sparkline key={f.key} label={f.label} series={series} unit={u} theme={theme} isMindful={isMindful} />;
                  })}
                  {MEASURE_FIELDS.every(f => entries.filter(e => typeof e.values[f.key] === 'number').length < 2) && (
                    <Text style={{ fontSize: 12, fontFamily: 'DMSans_400Regular', color: theme.textMuted, textAlign: 'center', paddingVertical: 12 }}>
                      Log a field at least twice to see its trend.
                    </Text>
                  )}
                </View>
              )}

              {/* ── History ─────────────────────────────────────────────── */}
              <Text style={[styles.cardLabel, { color: theme.textMuted, marginTop: 6, marginLeft: 4 }]}>HISTORY</Text>
              {entries.map(entry => {
                const isOpen = expandedId === entry.id;
                const count = MEASURE_FIELDS.filter(f => typeof entry.values[f.key] === 'number').length;
                return (
                  <View key={entry.id} style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: accent, ...shadowStyle, paddingVertical: 0 }]}>
                    <TouchableOpacity activeOpacity={0.7}
                      onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setExpandedId(isOpen ? null : entry.id); }}
                      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 }}>
                      <View>
                        <Text style={{ fontSize: 15, fontFamily: 'DMSans_700Bold', color: theme.textPrimary }}>{formatDate(entry.date)}</Text>
                        <Text style={{ fontSize: 11, fontFamily: 'DMSans_400Regular', color: theme.textMuted }}>
                          {count} field{count === 1 ? '' : 's'}{typeof entry.bodyFat === 'number' ? ` · ${entry.bodyFat}% BF` : ''}
                        </Text>
                      </View>
                      <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={theme.textMuted} />
                    </TouchableOpacity>
                    {isOpen && (
                      <View style={{ paddingBottom: 14 }}>
                        <View style={{ height: 0.5, backgroundColor: theme.borderCard, marginBottom: 10 }} />
                        {MEASURE_FIELDS.filter(f => typeof entry.values[f.key] === 'number').map(f => (
                          <View key={f.key} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 }}>
                            <Text style={{ fontSize: 13, fontFamily: 'DMSans_400Regular', color: theme.textSecondary }}>{f.label}</Text>
                            <Text style={{ fontSize: 13, fontFamily: 'DMSans_600SemiBold', color: theme.textPrimary }}>
                              {toDisplay(entry.values[f.key] as number, u)} {unitLabel(u)}
                            </Text>
                          </View>
                        ))}
                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                          <TouchableOpacity
                            onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); router.push({ pathname: '/body-measurement-log', params: { id: entry.id } }); }}
                            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder, borderWidth: 1, borderRadius: 8, paddingVertical: 10 }}>
                            <Ionicons name="create-outline" size={15} color={theme.accentBlue} />
                            <Text style={{ fontSize: 13, fontFamily: 'DMSans_600SemiBold', color: theme.accentBlue }}>Edit</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => onDelete(entry.id)}
                            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: theme.accentRedBg, borderColor: theme.accentRedBorder, borderWidth: 1, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 16 }}>
                            <Ionicons name="trash-outline" size={15} color={theme.accentRed} />
                            <Text style={{ fontSize: 13, fontFamily: 'DMSans_600SemiBold', color: theme.accentRed }}>Delete</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </>
          )}
        </ScrollView>

        {/* FAB */}
        <TouchableOpacity
          onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Medium); router.push('/body-measurement-log'); }}
          activeOpacity={0.85}
          style={[styles.fab, { backgroundColor: accent, bottom: insets.bottom + 24, shadowColor: accent }]}>
          <Ionicons name="add" size={30} color="#fff" />
        </TouchableOpacity>

        <MeasureHowToModal visible={howToOpen} onClose={() => setHowToOpen(false)} />

        {/* First-use Navy BF% disclaimer */}
        <Modal visible={showDisclaimer} transparent animationType="fade" onRequestClose={dismissDisclaimer}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.overlayBg, paddingHorizontal: 28 }}>
            <View style={{ width: '100%', backgroundColor: theme.bgSheet, borderRadius: 18, borderTopWidth: 4, borderTopColor: accent, padding: 22, ...shadowStyle }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.sheetHandle, alignSelf: 'center', marginBottom: 14 }} />
              <Text style={{ fontSize: 18, fontFamily: 'DMSans_700Bold', color: theme.textPrimary, marginBottom: 10, textAlign: 'center' }}>About Body Fat %</Text>
              <Text style={{ fontSize: 13.5, lineHeight: 21, fontFamily: 'DMSans_400Regular', color: theme.textSecondary, textAlign: 'center' }}>
                This uses the U.S. Navy tape method to estimate body fat from your neck, waist{profile.sex === 'female' ? ', hips' : ''} and height. It is an estimate, not a clinical scan like DEXA, and can be off by a few points. Use the trend over time, not any single number.
              </Text>
              <Text style={{ fontSize: 11, lineHeight: 17, fontFamily: 'DMSans_400Regular', color: theme.textDim, textAlign: 'center', marginTop: 12, fontStyle: 'italic' }}>
                For informational purposes only. Not medical advice.
              </Text>
              <TouchableOpacity onPress={dismissDisclaimer} style={{ backgroundColor: accent, borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginTop: 18 }}>
                <Text style={{ fontSize: 14, fontFamily: 'DMSans_700Bold', color: '#fff' }}>Got it</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </LinearGradient>
  );
}

// ── Sparkline (lightweight, self-contained) ──────────────────────────────────
function Sparkline({ label, series, unit, theme, isMindful }: {
  label: string; series: { v: number; d: string }[]; unit: 'in' | 'cm'; theme: any; isMindful: boolean;
}) {
  const W = 220, H = 38, pad = 3;
  const vals = series.map(s => s.v);
  const min = Math.min(...vals), max = Math.max(...vals);
  const range = max - min || 1;
  const pts = series.map((s, i) => {
    const x = pad + (i / (series.length - 1)) * (W - pad * 2);
    const y = pad + (1 - (s.v - min) / range) * (H - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const first = series[0].v, last = series[series.length - 1].v;
  const change = Math.round((last - first) * 10) / 10;
  const changeColor = isMindful ? theme.textSecondary : (change === 0 ? theme.textMuted : change < 0 ? theme.accentGreen : theme.accentAmber);
  return (
    <View style={{ backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: theme.borderCardTop, borderWidth: 0.5, borderRadius: 12, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ width: 84 }}>
        <Text style={{ fontSize: 12, fontFamily: 'DMSans_600SemiBold', color: theme.textSecondary }} numberOfLines={1}>{label}</Text>
        <Text style={{ fontSize: 11, fontFamily: 'DMSans_500Medium', color: changeColor }}>
          {change > 0 ? '+' : ''}{change} {unit}
        </Text>
      </View>
      <Svg width={W} height={H} style={{ flex: 1 }}>
        <Polyline points={pts} fill="none" stroke={theme.accentBlueRaw} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      </Svg>
    </View>
  );
}

function formatDate(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  if (!y) return dateKey;
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  headerBtn: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  card: { borderWidth: 0.5, borderTopWidth: 0.5, borderRadius: 14, padding: 16, marginBottom: 12 },
  cardLabel: { fontSize: 9, letterSpacing: 3, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase', marginBottom: 12 },
  fab: { position: 'absolute', right: 22, width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 10 },
});
