// app/comparison-report.tsx
// Comparison Report (#6). Pick two matched-length periods, see a side-by-side
// per-metric comparison with the stronger value highlighted. Just data: no
// scoreboard, no coaching. Runs entirely on utils/comparisonEngine.ts.
//
// Free: the 4 presets, view only. Pro: + Day vs Day (and image export, later).
// Pro is the dev-true / prod-false constant until a real subscription lands
// (mirrors services/aiMealEstimator DEV_UNLIMITED pattern).
//
// Today is EXCLUDED from every range (a half-logged today would skew an average),
// consistent with how EvR / the summaries treat the current day.

import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Modal, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import { useTheme } from '../theme';
import { useToast } from '../components/Toast';
import TooltipIcon from '../components/TooltipIcon';
import {
  buildComparison, dateKeysInRange, METRIC_META,
  ComparisonResult, MetricComparison, MetricId,
} from '../utils/comparisonEngine';

// Pro gate: true in dev builds so day-vs-day + export are testable; false in
// production until the real entitlement exists. Swap when the subscription ships.
const IS_PRO = __DEV__;

// ── Date helpers ────────────────────────────────────────────────────────────────
function fmtKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fmtDayLabel(d: Date): string {
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
}

// Pick the native date-picker variant from the theme's background luminance, so
// the inline calendar is readable on every theme (only Dark is a dark bg).
function pickerVariantFor(bg: string): 'light' | 'dark' {
  const h = (bg || '').replace('#', '');
  if (h.length < 6) return 'light';
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 140 ? 'light' : 'dark';
}

interface Preset {
  id: string;
  label: string;
  labelA: string;
  labelB: string;
  startA: string; endA: string;
  startB: string; endB: string;
}

// Built at runtime off "now". Every range ends yesterday-or-earlier (today excluded).
function buildPresets(now: Date): Preset[] {
  const yest = addDays(now, -1);
  const y = fmtKey(yest);
  const thisSun = addDays(now, -now.getDay());
  const lastSun = addDays(thisSun, -7);
  const lastSat = addDays(thisSun, -1);
  const thisMonth1 = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonth1 = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  return [
    { id: 'week', label: 'This week\nvs last week', labelA: 'This Week', labelB: 'Last Week',
      startA: fmtKey(thisSun), endA: y, startB: fmtKey(lastSun), endB: fmtKey(lastSat) },
    { id: 'month', label: 'This month\nvs last month', labelA: 'This Month', labelB: 'Last Month',
      startA: fmtKey(thisMonth1), endA: y, startB: fmtKey(lastMonth1), endB: fmtKey(lastMonthEnd) },
    { id: '7d', label: 'Last 7 days\nvs prev 7', labelA: 'Last 7 Days', labelB: 'Previous 7',
      startA: fmtKey(addDays(yest, -6)), endA: y, startB: fmtKey(addDays(yest, -13)), endB: fmtKey(addDays(yest, -7)) },
    { id: '30d', label: 'Last 30 days\nvs prev 30', labelA: 'Last 30 Days', labelB: 'Previous 30',
      startA: fmtKey(addDays(yest, -29)), endA: y, startB: fmtKey(addDays(yest, -59)), endB: fmtKey(addDays(yest, -30)) },
  ];
}

function formatMetric(id: MetricId, v: number | null): string {
  if (v === null) return '—';
  switch (id) {
    case 'net':        return `${v > 0 ? '+' : ''}${Math.round(v).toLocaleString()}`;
    case 'protein':    return `${Math.round(v).toLocaleString()}g`;
    case 'steps':      return Math.round(v).toLocaleString();
    case 'activeCals': return Math.round(v).toLocaleString();
    case 'water':      return `${Math.round(v)} oz`;
    case 'sleepScore': return `${Math.round(v)}`;
    case 'weight':     return `${v > 0 ? '+' : ''}${v.toFixed(1)} lbs`;
    default:           return `${v}`;
  }
}

type Mode = 'preset' | 'dayvsday';

export default function ComparisonReportScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const accent = theme.accentBlueRaw;

  const presets = useMemo(() => buildPresets(new Date()), []);
  const [available, setAvailable] = useState<Record<string, boolean>>({});
  const [checking, setChecking] = useState(true);
  const [mode, setMode] = useState<Mode>('preset');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [labels, setLabels] = useState<{ a: string; b: string }>({ a: '', b: '' });
  const [loading, setLoading] = useState(false);

  // Day-vs-day state (Pro). Defaults: yesterday vs the day before.
  const [dayA, setDayA] = useState<Date>(() => addDays(new Date(), -1));
  const [dayB, setDayB] = useState<Date>(() => addDays(new Date(), -2));
  const [pickerOpen, setPickerOpen] = useState<null | 'a' | 'b'>(null);
  const pickerAnim = useRef(new Animated.Value(0)).current;
  const maxPickDate = useMemo(() => addDays(new Date(), -1), []); // today excluded
  const pickerVariant = useMemo(() => pickerVariantFor(theme.bgPrimary), [theme.bgPrimary]);

  useEffect(() => {
    (async () => {
      const avail: Record<string, boolean> = {};
      for (const p of presets) {
        const keysA = dateKeysInRange(p.startA, p.endA).map(k => `pj_${k}`);
        const keysB = dateKeysInRange(p.startB, p.endB).map(k => `pj_${k}`);
        try {
          const [pa, pb] = await Promise.all([AsyncStorage.multiGet(keysA), AsyncStorage.multiGet(keysB)]);
          avail[p.id] = pa.some(([, v]) => !!v) && pb.some(([, v]) => !!v);
        } catch { avail[p.id] = false; }
      }
      setAvailable(avail);
      setChecking(false);
      const first = presets.find(p => avail[p.id]);
      if (first) selectPreset(first);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectPreset = async (p: Preset) => {
    setMode('preset');
    setSelectedId(p.id);
    setLabels({ a: p.labelA, b: p.labelB });
    setLoading(true);
    try {
      const res = await buildComparison(dateKeysInRange(p.startA, p.endA), dateKeysInRange(p.startB, p.endB));
      setResult(res);
    } catch { setResult(null); }
    finally { setLoading(false); }
  };

  const runDayVsDay = async (a: Date, b: Date) => {
    setMode('dayvsday');
    setSelectedId(null);
    setLabels({ a: fmtDayLabel(a), b: fmtDayLabel(b) });
    setLoading(true);
    try {
      const res = await buildComparison([fmtKey(a)], [fmtKey(b)]);
      setResult(res);
    } catch { setResult(null); }
    finally { setLoading(false); }
  };

  const onDayVsDayChip = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    if (!IS_PRO) {
      showToast('Day vs Day is a Pro feature', undefined, 'info');
      return;
    }
    runDayVsDay(dayA, dayB);
  };

  const openPicker = (which: 'a' | 'b') => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setPickerOpen(which);
  };
  const closePicker = () => {
    Animated.timing(pickerAnim, { toValue: 0, duration: 140, useNativeDriver: true }).start(() => setPickerOpen(null));
  };
  const onPickDate = (which: 'a' | 'b', date: Date) => {
    if (which === 'a') { setDayA(date); runDayVsDay(date, dayB); }
    else { setDayB(date); runDayVsDay(dayA, date); }
  };

  // ── Header ──
  const Header = (
    <View style={{
      paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 12,
      borderBottomWidth: 0.5, borderBottomColor: theme.borderCard,
      flexDirection: 'row', alignItems: 'center', gap: 10,
    }}>
      <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); router.back(); }} style={{ padding: 4 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="chevron-back" size={24} color={accent} />
      </TouchableOpacity>
      <Text style={{ fontSize: 24, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2, color: accent, flex: 1 }}>COMPARISON</Text>
      <View style={{ transform: [{ translateY: -1 }] }}>
        <TooltipIcon tooltipKey="comparison_report" size={18} />
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.bgPrimary }}>
      {Header}
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}>

        {/* ── Preset chips ── */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
          {presets.map(p => {
            const isAvail = available[p.id] !== false;
            const isSel = mode === 'preset' && p.id === selectedId;
            const disabled = checking ? false : !isAvail;
            return (
              <TouchableOpacity
                key={p.id}
                activeOpacity={disabled ? 1 : 0.7}
                onPress={() => { if (disabled) { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); return; } triggerHaptic(Haptics.ImpactFeedbackStyle.Light); selectPreset(p); }}
                style={{
                  flexGrow: 1, minWidth: '46%',
                  backgroundColor: isSel ? `${accent}1F` : theme.bgCard,
                  borderWidth: 1, borderColor: isSel ? `${accent}80` : theme.borderCard,
                  borderRadius: 10, paddingVertical: 12, paddingHorizontal: 12,
                  opacity: disabled ? 0.4 : 1,
                }}
              >
                <Text style={{ fontSize: 13, lineHeight: 18, fontFamily: 'DMSans_600SemiBold', color: isSel ? accent : theme.textSecondary }}>{p.label}</Text>
                {disabled && <Text style={{ fontSize: 10, fontFamily: 'DMSans_400Regular', color: theme.textDim, marginTop: 3 }}>Needs more data</Text>}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Day vs Day chip (Pro) ── */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onDayVsDayChip}
          style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
            backgroundColor: mode === 'dayvsday' ? `${accent}1F` : theme.bgCard,
            borderWidth: 1, borderColor: mode === 'dayvsday' ? `${accent}80` : theme.borderCard,
            borderRadius: 10, paddingVertical: 12, marginBottom: 16,
          }}
        >
          <Ionicons name={IS_PRO ? 'calendar-outline' : 'lock-closed'} size={15} color={mode === 'dayvsday' ? accent : theme.textSecondary} />
          <Text style={{ fontSize: 13, fontFamily: 'DMSans_600SemiBold', color: mode === 'dayvsday' ? accent : theme.textSecondary }}>Day vs Day</Text>
          {!IS_PRO && <Text style={{ fontSize: 10, fontFamily: 'DMSans_700Bold', letterSpacing: 1, color: theme.textDim }}>PRO</Text>}
        </TouchableOpacity>

        {/* ── Day-vs-day date selectors ── */}
        {mode === 'dayvsday' && IS_PRO && (
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
            {(['a', 'b'] as const).map(which => (
              <TouchableOpacity
                key={which}
                activeOpacity={0.7}
                onPress={() => openPicker(which)}
                style={{ flex: 1, backgroundColor: theme.bgCard, borderWidth: 1, borderColor: theme.borderCard, borderRadius: 10, paddingVertical: 10, alignItems: 'center' }}
              >
                <Text style={{ fontSize: 9, fontFamily: 'DMSans_700Bold', letterSpacing: 1, textTransform: 'uppercase', color: theme.textDim, marginBottom: 3 }}>{which === 'a' ? 'Day A' : 'Day B'}</Text>
                <Text style={{ fontSize: 15, fontFamily: 'DMSans_600SemiBold', color: accent }}>{fmtDayLabel(which === 'a' ? dayA : dayB)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── Table ── */}
        {loading && <View style={{ paddingVertical: 40, alignItems: 'center' }}><ActivityIndicator color={accent} /></View>}

        {!loading && result && (
          <View style={{ backgroundColor: theme.bgCard, borderWidth: 0.5, borderColor: theme.borderCard, borderTopColor: accent, borderRadius: 14, padding: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: 10 }}>
              <View style={{ flex: 1.2 }} />
              <View style={{ flex: 1, alignItems: 'center' }}><Text style={{ fontSize: 10, fontFamily: 'DMSans_700Bold', letterSpacing: 1, textTransform: 'uppercase', color: accent, textAlign: 'center' }}>{labels.a}</Text></View>
              <View style={{ flex: 1, alignItems: 'center' }}><Text style={{ fontSize: 10, fontFamily: 'DMSans_700Bold', letterSpacing: 1, textTransform: 'uppercase', color: theme.textDim, textAlign: 'center' }}>{labels.b}</Text></View>
            </View>
            {result.rows.map((row, i) => (
              <MetricRow key={row.id} row={row} theme={theme} accent={accent} isLast={i === result.rows.length - 1} dayMode={mode === 'dayvsday'} />
            ))}
          </View>
        )}

        {/* ── Transparency layer ── */}
        {!loading && result && (
          <>
            <Text style={{ fontSize: 11, lineHeight: 16, fontFamily: 'DMSans_400Regular', color: theme.textDim, marginTop: 14 }}>
              {mode === 'dayvsday'
                ? 'Each column is a single day. A metric with no log that day shows no data. Today is not selectable.'
                : 'Averages use only days with logged data. Excluded days are removed, so metrics can span different day counts. Today is not included.'}
            </Text>
            <Text style={{ fontSize: 10, fontFamily: 'DMSans_400Regular', color: theme.textDim, marginTop: 8, fontStyle: 'italic' }}>For informational purposes only. Not medical advice.</Text>
          </>
        )}

        {!checking && !loading && !result && (
          <View style={{ paddingVertical: 50, alignItems: 'center', paddingHorizontal: 30 }}>
            <Ionicons name="bar-chart-outline" size={44} color={theme.textDim} />
            <Text style={{ fontSize: 15, fontFamily: 'DMSans_700Bold', color: theme.textSecondary, marginTop: 12, textAlign: 'center' }}>Not enough data yet</Text>
            <Text style={{ fontSize: 13, fontFamily: 'DMSans_400Regular', color: theme.textDim, marginTop: 6, textAlign: 'center', lineHeight: 19 }}>Keep logging and your periods will fill in. Comparisons need data on both sides.</Text>
          </View>
        )}
      </ScrollView>

      {/* ── Date picker modal (centered) ── */}
      <Modal transparent visible={pickerOpen !== null} animationType="none" statusBarTranslucent onRequestClose={closePicker}
        onShow={() => { pickerAnim.setValue(0); Animated.spring(pickerAnim, { toValue: 1, useNativeDriver: true, friction: 8, tension: 90 }).start(); }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <TouchableOpacity activeOpacity={1} onPress={closePicker} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)' }} />
          <Animated.View style={{
            width: '88%', backgroundColor: theme.bgCard, borderRadius: 18, borderTopWidth: 1.5, borderTopColor: accent,
            borderWidth: 0.5, borderColor: theme.borderCard, padding: 16,
            opacity: pickerAnim, transform: [{ scale: pickerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }],
          }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.borderCard, alignSelf: 'center', marginBottom: 12 }} />
            <Text style={{ fontSize: 13, fontFamily: 'DMSans_700Bold', letterSpacing: 1, textTransform: 'uppercase', color: theme.textMuted, textAlign: 'center', marginBottom: 8 }}>
              {pickerOpen === 'a' ? 'Day A' : 'Day B'}
            </Text>
            <DateTimePicker
              value={pickerOpen === 'a' ? dayA : (pickerOpen === 'b' ? dayB : maxPickDate)}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'calendar'}
              maximumDate={maxPickDate}
              themeVariant={pickerVariant}
              onChange={(_e, date) => {
                if (Platform.OS !== 'ios') setPickerOpen(null);
                if (date && pickerOpen) onPickDate(pickerOpen, date);
              }}
            />
            <TouchableOpacity onPress={closePicker} style={{ backgroundColor: accent, borderRadius: 8, paddingVertical: 11, alignItems: 'center', marginTop: 8 }}>
              <Text style={{ fontSize: 13, fontFamily: 'DMSans_600SemiBold', color: '#fff' }}>Done</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

function MetricRow({ row, theme, accent, isLast, dayMode }: { row: MetricComparison; theme: any; accent: string; isLast: boolean; dayMode: boolean }) {
  const meta = METRIC_META[row.id];
  const aWins = row.winner === 'a';
  const bWins = row.winner === 'b';
  const aColor = aWins ? accent : theme.textSecondary;
  const bColor = bWins ? accent : theme.textSecondary;
  const aWeight = aWins ? 'DMSans_700Bold' : 'DMSans_500Medium';
  const bWeight = bWins ? 'DMSans_700Bold' : 'DMSans_500Medium';
  const countLabel = (n: number) => n === 1 ? '1 day' : `${n} days`;
  const subCount = (mv: typeof row.a) => mv.avg === null ? 'no data' : countLabel(row.id === 'weight' ? (mv.weighIns ?? 0) : mv.loggedDays);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 11, borderBottomWidth: isLast ? 0 : 0.5, borderBottomColor: theme.borderSubtle ?? theme.borderCard }}>
      <View style={{ flex: 1.2 }}>
        <Text style={{ fontSize: 13, fontFamily: 'DMSans_600SemiBold', color: theme.textPrimary }}>{meta.label}</Text>
        <Text style={{ fontSize: 9, fontFamily: 'DMSans_400Regular', color: theme.textDim, marginTop: 2 }}>{meta.unit}</Text>
      </View>
      <View style={{ flex: 1, alignItems: 'center' }}>
        <Text style={{ fontSize: 16, fontFamily: aWeight, color: aColor }}>{formatMetric(row.id, row.a.avg)}</Text>
        {!dayMode && <Text style={{ fontSize: 9, fontFamily: 'DMSans_400Regular', color: theme.textDim, marginTop: 2 }}>{subCount(row.a)}</Text>}
      </View>
      <View style={{ flex: 1, alignItems: 'center' }}>
        <Text style={{ fontSize: 16, fontFamily: bWeight, color: bColor }}>{formatMetric(row.id, row.b.avg)}</Text>
        {!dayMode && <Text style={{ fontSize: 9, fontFamily: 'DMSans_400Regular', color: theme.textDim, marginTop: 2 }}>{subCount(row.b)}</Text>}
      </View>
    </View>
  );
}
