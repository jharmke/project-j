// app/challenge-create.tsx
// Challenge creation (#7). One dedicated screen: pick a type, configure it,
// confirm. See SPEC_comparison_challenge.md Part 2 "Entry points + creation".
//
// Type 'beat'  : multi-metric, beat the previous equivalent period (or a picked
//                past period), all chosen metrics to win.
// Type 'custom': single-metric temporary elevated daily target; weight is an
//                end-state change target hard-capped at a safe rate.

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import { useTheme } from '../theme';
import { useToast } from '../components/Toast';
import { loadComparisonGoals, METRIC_META } from '../utils/comparisonEngine';
import {
  CHALLENGE_METRICS, ChallengeMetric, ChallengeType, StartMode,
  createChallenge, maxWeightChangeLbs,
} from '../utils/challenges';

const METRIC_ICON: Record<ChallengeMetric, string> = {
  net: 'flame', protein: 'restaurant', steps: 'footsteps', water: 'water', sleepScore: 'moon', weight: 'barbell',
};

const DURATION_PRESETS = [
  { id: '1w', label: '1 Week', days: 7 },
  { id: '2w', label: '2 Weeks', days: 14 },
  { id: '1m', label: '1 Month', days: 30 },
];

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fmtKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function addDays(d: Date, n: number): Date { const c = new Date(d); c.setDate(c.getDate() + n); return c; }
function fmtDayLabel(d: Date): string { return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`; }
function pickerVariantFor(bg: string): 'light' | 'dark' {
  const h = (bg || '').replace('#', '');
  if (h.length < 6) return 'light';
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 140 ? 'light' : 'dark';
}

// Sensible default per-day target per metric (custom goals).
function defaultTargetFor(m: ChallengeMetric, paceTarget: number): string {
  switch (m) {
    case 'steps': return '12000';
    case 'water': return '140';
    case 'protein': return '180';
    case 'sleepScore': return '85';
    case 'net': return String(paceTarget || -750);
    case 'weight': return '';
    default: return '';
  }
}

export default function ChallengeCreateScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const accent = theme.accentBlueRaw;
  const pickerVariant = useMemo(() => pickerVariantFor(theme.bgPrimary), [theme.bgPrimary]);

  const [type, setType] = useState<ChallengeType | null>(null);
  const [weightGoal, setWeightGoal] = useState<string>('maintain');
  const [paceTarget, setPaceTarget] = useState<number>(-500);
  const [loaded, setLoaded] = useState(false);

  // beat
  const [selectedMetrics, setSelectedMetrics] = useState<ChallengeMetric[]>([]);
  const [benchmarkMode, setBenchmarkMode] = useState<'previous' | 'custom'>('previous');
  const [benchStart, setBenchStart] = useState<Date>(() => addDays(new Date(), -8));

  // custom
  const [customMetric, setCustomMetric] = useState<ChallengeMetric>('steps');
  const [target, setTarget] = useState<string>('12000');

  // shared
  const [durationId, setDurationId] = useState<string>('1w');
  const [customDays, setCustomDays] = useState<number>(10);
  const [startMode, setStartMode] = useState<StartMode>('tomorrow');

  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerAnim = useRef(new Animated.Value(0)).current;
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const g = await loadComparisonGoals(fmtKey(new Date()));
      setWeightGoal(g.weightGoal);
      setPaceTarget(g.paceTarget);
      setLoaded(true);
    })();
  }, []);

  const durationDays = durationId === 'custom' ? customDays : (DURATION_PRESETS.find(d => d.id === durationId)?.days ?? 7);
  const maintain = !weightGoal.startsWith('lose') && !weightGoal.startsWith('gain');
  // Weight is only offered when the user has a lose/gain goal.
  const offeredMetrics = CHALLENGE_METRICS.filter(m => m !== 'weight' || !maintain);
  const weightCap = maxWeightChangeLbs(weightGoal, durationDays);
  const weightVerb = weightGoal.startsWith('gain') ? 'Gain' : 'Lose';

  // When switching the custom metric, reset target to its default.
  const pickCustomMetric = (m: ChallengeMetric) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setCustomMetric(m);
    setTarget(defaultTargetFor(m, paceTarget));
  };

  const toggleMetric = (m: ChallengeMetric) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setSelectedMetrics(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
  };

  const maxBenchDate = useMemo(() => addDays(new Date(), -1), []);
  const openPicker = () => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setPickerOpen(true); };
  const closePicker = () => Animated.timing(pickerAnim, { toValue: 0, duration: 140, useNativeDriver: true }).start(() => setPickerOpen(false));

  // ── Validation + confirm ──
  const targetNum = parseFloat(target);
  const validCustomTarget = !isNaN(targetNum) && (customMetric === 'net' ? true : targetNum > 0);
  const canConfirm = type === 'beat'
    ? selectedMetrics.length > 0
    : (customMetric === 'weight' ? (validCustomTarget && targetNum > 0 && targetNum <= weightCap) : validCustomTarget);

  // Live summary line for the confirm button area.
  const startWord = startMode === 'today' ? 'today' : 'tomorrow';
  const durWord = durationId === 'custom' ? `${customDays} days` : DURATION_PRESETS.find(d => d.id === durationId)?.label.toLowerCase();
  const summary = useMemo(() => {
    if (!type) return '';
    if (type === 'beat') {
      const names = selectedMetrics.map(m => METRIC_META[m].label).join(', ') || 'metrics';
      return `Beat ${benchmarkMode === 'custom' ? 'a past period' : 'last period'} on ${names} over ${durWord}, starting ${startWord}.`;
    }
    if (customMetric === 'weight') return `${weightVerb} ${target || '?'} lbs over ${durWord}, starting ${startWord}.`;
    return `Hit ${target || '?'} ${METRIC_META[customMetric].unit}/day on ${METRIC_META[customMetric].label} over ${durWord}, starting ${startWord}.`;
  }, [type, selectedMetrics, customMetric, target, benchmarkMode, durWord, startWord, weightVerb]);

  const confirm = async () => {
    if (!canConfirm || saving) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    setSaving(true);
    try {
      await createChallenge({
        type: type!,
        startMode,
        durationDays,
        metrics: type === 'beat' ? selectedMetrics : undefined,
        benchmarkStartKey: type === 'beat' && benchmarkMode === 'custom' ? fmtKey(benchStart) : undefined,
        metric: type === 'custom' ? customMetric : undefined,
        target: type === 'custom' ? (customMetric === 'weight' ? -Math.abs(targetNum) * (weightGoal.startsWith('gain') ? -1 : 1) : targetNum) : undefined,
      });
      showToast('Challenge started', undefined, 'success');
      router.back();
    } catch {
      showToast('Could not start challenge', undefined, 'error');
      setSaving(false);
    }
  };

  // ── Small UI helpers ──
  const SectionLabel = ({ children }: { children: string }) => (
    <Text style={{ fontSize: 9, letterSpacing: 3, color: theme.textMuted, textTransform: 'uppercase', fontFamily: 'DMSans_700Bold', marginBottom: 10, marginTop: 22 }}>{children}</Text>
  );

  if (!loaded) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bgPrimary, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={accent} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: theme.bgPrimary }}>
      {/* Header */}
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 0.5, borderBottomColor: theme.borderCard, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); router.back(); }} style={{ padding: 4 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={24} color={accent} />
        </TouchableOpacity>
        <Text style={{ fontSize: 24, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2, color: accent, flex: 1 }}>NEW CHALLENGE</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 160 }} keyboardShouldPersistTaps="handled">

        {/* ── Type ── */}
        <SectionLabel>Challenge Type</SectionLabel>
        <View style={{ gap: 10 }}>
          {([
            { id: 'beat', icon: 'trophy', title: 'Beat a Previous Period', sub: 'Outperform a past week or month across the metrics you pick.' },
            { id: 'custom', icon: 'flag', title: 'Custom Goal', sub: 'Set a higher daily target for one metric, just for this stretch.' },
          ] as const).map(opt => {
            const sel = type === opt.id;
            return (
              <TouchableOpacity key={opt.id} activeOpacity={0.8}
                onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setType(opt.id); }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: sel ? `${accent}14` : theme.bgCard, borderWidth: 1, borderColor: sel ? `${accent}80` : theme.borderCard, borderRadius: 12, padding: 14 }}>
                <Ionicons name={opt.icon as any} size={22} color={sel ? accent : theme.textSecondary} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontFamily: 'DMSans_700Bold', color: sel ? accent : theme.textPrimary }}>{opt.title}</Text>
                  <Text style={{ fontSize: 12, fontFamily: 'DMSans_400Regular', color: theme.textSecondary, marginTop: 2, lineHeight: 17 }}>{opt.sub}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Beat config ── */}
        {type === 'beat' && (
          <>
            <SectionLabel>Metrics to Beat</SectionLabel>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {offeredMetrics.map(m => {
                const sel = selectedMetrics.includes(m);
                return (
                  <TouchableOpacity key={m} activeOpacity={0.7} onPress={() => toggleMetric(m)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: sel ? `${accent}1F` : theme.bgCard, borderWidth: 1, borderColor: sel ? `${accent}80` : theme.borderCard, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 12 }}>
                    <Ionicons name={METRIC_ICON[m] as any} size={14} color={sel ? accent : theme.textSecondary} />
                    <Text style={{ fontSize: 13, fontFamily: 'DMSans_600SemiBold', color: sel ? accent : theme.textSecondary }}>{METRIC_META[m].label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={{ fontSize: 11, color: theme.textDim, marginTop: 8, fontFamily: 'DMSans_400Regular' }}>Beat the past period on all chosen metrics to win.</Text>

            <SectionLabel>Compare Against</SectionLabel>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {([{ id: 'previous', label: 'Previous Period' }, { id: 'custom', label: 'Pick a Past Period' }] as const).map(o => {
                const sel = benchmarkMode === o.id;
                return (
                  <TouchableOpacity key={o.id} activeOpacity={0.7} onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setBenchmarkMode(o.id); }}
                    style={{ flex: 1, alignItems: 'center', backgroundColor: sel ? `${accent}1F` : theme.bgCard, borderWidth: 1, borderColor: sel ? `${accent}80` : theme.borderCard, borderRadius: 10, paddingVertical: 11 }}>
                    <Text style={{ fontSize: 13, fontFamily: 'DMSans_600SemiBold', color: sel ? accent : theme.textSecondary }}>{o.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {benchmarkMode === 'custom' && (
              <TouchableOpacity activeOpacity={0.7} onPress={openPicker}
                style={{ marginTop: 10, backgroundColor: theme.bgCard, borderWidth: 1, borderColor: theme.borderCard, borderRadius: 10, paddingVertical: 12, alignItems: 'center' }}>
                <Text style={{ fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: theme.textDim, fontFamily: 'DMSans_700Bold', marginBottom: 3 }}>Past period starts</Text>
                <Text style={{ fontSize: 15, fontFamily: 'DMSans_600SemiBold', color: accent }}>{fmtDayLabel(benchStart)} ({durationDays} days)</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* ── Custom config ── */}
        {type === 'custom' && (
          <>
            <SectionLabel>Metric</SectionLabel>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {offeredMetrics.map(m => {
                const sel = customMetric === m;
                return (
                  <TouchableOpacity key={m} activeOpacity={0.7} onPress={() => pickCustomMetric(m)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: sel ? `${accent}1F` : theme.bgCard, borderWidth: 1, borderColor: sel ? `${accent}80` : theme.borderCard, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 12 }}>
                    <Ionicons name={METRIC_ICON[m] as any} size={14} color={sel ? accent : theme.textSecondary} />
                    <Text style={{ fontSize: 13, fontFamily: 'DMSans_600SemiBold', color: sel ? accent : theme.textSecondary }}>{METRIC_META[m].label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <SectionLabel>{customMetric === 'weight' ? `${weightVerb} (lbs)` : 'Daily Target'}</SectionLabel>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.bgInput ?? theme.bgCard, borderWidth: 1, borderColor: theme.borderCard, borderRadius: 10, paddingHorizontal: 14 }}>
              <TextInput
                value={target}
                onChangeText={setTarget}
                keyboardType={customMetric === 'net' ? 'numbers-and-punctuation' : 'numeric'}
                placeholder={customMetric === 'weight' ? `up to ${weightCap}` : 'Target'}
                placeholderTextColor={theme.textDim}
                style={{ flex: 1, fontSize: 18, fontFamily: 'DMSans_600SemiBold', color: theme.textPrimary, paddingVertical: 12 }}
              />
              <Text style={{ fontSize: 13, color: theme.textMuted, fontFamily: 'DMSans_500Medium' }}>
                {customMetric === 'weight' ? 'lbs total' : `${METRIC_META[customMetric].unit}/day`}
              </Text>
            </View>
            {customMetric === 'weight' && (
              <Text style={{ fontSize: 11, color: theme.textDim, marginTop: 8, fontFamily: 'DMSans_400Regular', lineHeight: 16 }}>
                Healthy {weightVerb.toLowerCase()} tops out around {weightGoal.startsWith('gain') ? '1 lb' : '2 lbs'} a week, so this challenge maxes at {weightCap} lbs. For informational purposes only. Not medical advice.
              </Text>
            )}
            {customMetric === 'net' && (
              <Text style={{ fontSize: 11, color: theme.textDim, marginTop: 8, fontFamily: 'DMSans_400Regular' }}>
                A tougher daily net than your usual pace ({paceTarget} kcal). Use a negative number for a bigger deficit.
              </Text>
            )}
          </>
        )}

        {/* ── Duration + start (both types) ── */}
        {type && (
          <>
            <SectionLabel>Duration</SectionLabel>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {DURATION_PRESETS.map(d => {
                const sel = durationId === d.id;
                return (
                  <TouchableOpacity key={d.id} activeOpacity={0.7} onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setDurationId(d.id); }}
                    style={{ backgroundColor: sel ? `${accent}1F` : theme.bgCard, borderWidth: 1, borderColor: sel ? `${accent}80` : theme.borderCard, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 16 }}>
                    <Text style={{ fontSize: 13, fontFamily: 'DMSans_600SemiBold', color: sel ? accent : theme.textSecondary }}>{d.label}</Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity activeOpacity={0.7} onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setDurationId('custom'); }}
                style={{ backgroundColor: durationId === 'custom' ? `${accent}1F` : theme.bgCard, borderWidth: 1, borderColor: durationId === 'custom' ? `${accent}80` : theme.borderCard, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 16 }}>
                <Text style={{ fontSize: 13, fontFamily: 'DMSans_600SemiBold', color: durationId === 'custom' ? accent : theme.textSecondary }}>Custom</Text>
              </TouchableOpacity>
            </View>
            {durationId === 'custom' && (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, marginTop: 12 }}>
                <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setCustomDays(d => Math.max(2, d - 1)); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="remove-circle" size={32} color={accent} />
                </TouchableOpacity>
                <Text style={{ fontSize: 22, fontFamily: 'BebasNeue_400Regular', color: theme.textPrimary, minWidth: 80, textAlign: 'center' }}>{customDays} DAYS</Text>
                <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setCustomDays(d => Math.min(90, d + 1)); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="add-circle" size={32} color={accent} />
                </TouchableOpacity>
              </View>
            )}

            <SectionLabel>Start</SectionLabel>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {([{ id: 'today', label: 'Today' }, { id: 'tomorrow', label: 'Tomorrow' }] as const).map(o => {
                const sel = startMode === o.id;
                return (
                  <TouchableOpacity key={o.id} activeOpacity={0.7} onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setStartMode(o.id); }}
                    style={{ flex: 1, alignItems: 'center', backgroundColor: sel ? `${accent}1F` : theme.bgCard, borderWidth: 1, borderColor: sel ? `${accent}80` : theme.borderCard, borderRadius: 10, paddingVertical: 11 }}>
                    <Text style={{ fontSize: 13, fontFamily: 'DMSans_600SemiBold', color: sel ? accent : theme.textSecondary }}>{o.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      {/* ── Confirm bar ── */}
      {type && (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 12, backgroundColor: theme.bgPrimary, borderTopWidth: 0.5, borderTopColor: theme.borderCard }}>
          {!!summary && <Text style={{ fontSize: 12, color: theme.textSecondary, fontFamily: 'DMSans_400Regular', textAlign: 'center', marginBottom: 10, lineHeight: 17 }}>{summary}</Text>}
          <TouchableOpacity activeOpacity={0.85} disabled={!canConfirm || saving} onPress={confirm}
            style={{ backgroundColor: accent, borderRadius: 10, paddingVertical: 15, alignItems: 'center', opacity: canConfirm && !saving ? 1 : 0.4 }}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ fontSize: 15, fontFamily: 'DMSans_700Bold', color: '#fff' }}>Start Challenge</Text>}
          </TouchableOpacity>
        </View>
      )}

      {/* ── Benchmark date picker ── */}
      <Modal transparent visible={pickerOpen} animationType="none" statusBarTranslucent onRequestClose={closePicker}
        onShow={() => { pickerAnim.setValue(0); Animated.spring(pickerAnim, { toValue: 1, useNativeDriver: true, friction: 8, tension: 90 }).start(); }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <TouchableOpacity activeOpacity={1} onPress={closePicker} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)' }} />
          <Animated.View style={{ width: '88%', backgroundColor: theme.bgCard, borderRadius: 18, borderTopWidth: 1.5, borderTopColor: accent, borderWidth: 0.5, borderColor: theme.borderCard, padding: 16, opacity: pickerAnim, transform: [{ scale: pickerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }] }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.borderCard, alignSelf: 'center', marginBottom: 12 }} />
            <Text style={{ fontSize: 13, fontFamily: 'DMSans_700Bold', letterSpacing: 1, textTransform: 'uppercase', color: theme.textMuted, textAlign: 'center', marginBottom: 8 }}>Past period start</Text>
            <DateTimePicker value={benchStart} mode="date" display={Platform.OS === 'ios' ? 'inline' : 'calendar'} maximumDate={maxBenchDate} themeVariant={pickerVariant}
              onChange={(_e, date) => { if (Platform.OS !== 'ios') setPickerOpen(false); if (date) setBenchStart(date); }} />
            <TouchableOpacity onPress={closePicker} style={{ backgroundColor: accent, borderRadius: 8, paddingVertical: 11, alignItems: 'center', marginTop: 8 }}>
              <Text style={{ fontSize: 13, fontFamily: 'DMSans_600SemiBold', color: '#fff' }}>Done</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
