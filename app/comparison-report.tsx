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
import { ActivityIndicator, Animated, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import { useTheme } from '../theme';
import { useToast } from '../components/Toast';
import TooltipIcon from '../components/TooltipIcon';
import {
  buildComparison, dateKeysInRange, METRIC_META,
  ComparisonResult, MetricComparison, MetricId,
} from '../utils/comparisonEngine';

const IS_PRO = __DEV__;

// ── Date helpers ──────────────────────────────────────────────────────────────
function fmtKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function addDays(d: Date, n: number): Date {
  const c = new Date(d); c.setDate(c.getDate() + n); return c;
}
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const CAL_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const CAL_DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa'];
function fmtDayLabel(d: Date): string {
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
}

const METRIC_ICON: Record<string, string> = {
  net: 'flame', protein: 'restaurant', steps: 'footsteps',
  activeCals: 'bicycle', water: 'water', sleepScore: 'moon', weight: 'barbell',
};

interface Preset {
  id: string; icon: string; line1: string; line2: string;
  labelA: string; labelB: string;
  startA: string; endA: string; startB: string; endB: string;
}

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
    { id: 'week', icon: 'calendar-outline', line1: 'THIS WEEK', line2: 'vs Last Week (calendar Sun-Sat)',
      labelA: 'This Week', labelB: 'Last Week',
      startA: fmtKey(thisSun), endA: y, startB: fmtKey(lastSun), endB: fmtKey(lastSat) },
    { id: 'month', icon: 'calendar-number-outline', line1: 'THIS MONTH', line2: 'vs Last Month (calendar)',
      labelA: 'This Month', labelB: 'Last Month',
      startA: fmtKey(thisMonth1), endA: y, startB: fmtKey(lastMonth1), endB: fmtKey(lastMonthEnd) },
    { id: '7d', icon: 'trending-up-outline', line1: 'LAST 7 DAYS', line2: 'vs Previous 7 (rolling window)',
      labelA: 'Last 7 Days', labelB: 'Previous 7',
      startA: fmtKey(addDays(yest, -6)), endA: y, startB: fmtKey(addDays(yest, -13)), endB: fmtKey(addDays(yest, -7)) },
    { id: '30d', icon: 'stats-chart-outline', line1: 'LAST 30 DAYS', line2: 'vs Previous 30 (rolling window)',
      labelA: 'Last 30 Days', labelB: 'Previous 30',
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

function formatDelta(id: MetricId, diff: number): string {
  if (diff < 0.01) return '';
  switch (id) {
    case 'net': case 'activeCals': return `${Math.round(diff).toLocaleString()} kcal`;
    case 'protein':    return `${Math.round(diff)}g`;
    case 'steps':      return Math.round(diff).toLocaleString();
    case 'water':      return `${Math.round(diff)} oz`;
    case 'sleepScore': return `${Math.round(diff)} pts`;
    case 'weight':     return `${diff.toFixed(1)} lbs`;
    default:           return `${diff}`;
  }
}

// Numeric part only — unit rendered separately at smaller size
function formatValueNum(id: MetricId, v: number | null): string {
  if (v === null) return '—';
  switch (id) {
    case 'net':        return `${v > 0 ? '+' : ''}${Math.round(v).toLocaleString()}`;
    case 'protein':    return Math.round(v).toLocaleString();
    case 'steps':      return Math.round(v).toLocaleString();
    case 'activeCals': return Math.round(v).toLocaleString();
    case 'water':      return Math.round(v).toLocaleString();
    case 'sleepScore': return `${Math.round(v)}`;
    case 'weight':     return `${v > 0 ? '+' : ''}${Math.abs(v).toFixed(1)}`;
    default:           return `${Math.round(v as number)}`;
  }
}

// Inline unit shown next to the big Bebas value (uppercase, smaller font). Empty = no unit.
function inlineUnit(id: MetricId): string {
  switch (id) {
    case 'protein': return 'G';
    case 'water':   return 'OZ';
    case 'weight':  return 'LBS';
    default:        return '';
  }
}

type Mode = 'preset' | 'dayvsday';

export default function ComparisonReportScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const accent = theme.accentBlueRaw;
  // bgCard uses rgba on Light/Slate/Blush for glassmorphism. In a modal over a dark overlay
  // that alpha bleeds through -- use bgPrimary (always opaque) as the solid fallback.
  const modalCardBg = theme.bgCard.startsWith('rgba') ? theme.bgPrimary : theme.bgCard;

  const presets = useMemo(() => buildPresets(new Date()), []);
  const [available, setAvailable] = useState<Record<string, boolean>>({});
  const [checking, setChecking] = useState(true);
  const [mode, setMode] = useState<Mode>('preset');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [labels, setLabels] = useState<{ a: string; b: string }>({ a: '', b: '' });
  const [loading, setLoading] = useState(false);

  const [dayA, setDayA] = useState<Date>(() => addDays(new Date(), -1));
  const [dayB, setDayB] = useState<Date>(() => addDays(new Date(), -2));
  const [pickerOpen, setPickerOpen] = useState<null | 'a' | 'b'>(null);
  const pickerAnim = useRef(new Animated.Value(0)).current;
  const maxPickDate = useMemo(() => addDays(new Date(), -1), []);
  const [calYear, setCalYear] = useState(() => addDays(new Date(), -1).getFullYear());
  const [calMonth, setCalMonth] = useState(() => addDays(new Date(), -1).getMonth());

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
    if (!IS_PRO) { showToast('Day vs Day is a Pro feature', undefined, 'info'); return; }
    runDayVsDay(dayA, dayB);
  };

  const openPicker = (which: 'a' | 'b') => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    const d = which === 'a' ? dayA : dayB;
    setCalYear(d.getFullYear());
    setCalMonth(d.getMonth());
    setPickerOpen(which);
  };
  const closePicker = () => {
    Animated.timing(pickerAnim, { toValue: 0, duration: 140, useNativeDriver: true }).start(() => setPickerOpen(null));
  };
  const onPickDate = (which: 'a' | 'b', date: Date) => {
    if (which === 'a') { setDayA(date); runDayVsDay(date, dayB); }
    else { setDayB(date); runDayVsDay(dayA, date); }
  };

  const calMaxKey = fmtKey(maxPickDate);
  const calCanGoNext = () => {
    const nm = calMonth === 11 ? 0 : calMonth + 1;
    const ny = calMonth === 11 ? calYear + 1 : calYear;
    return `${ny}-${String(nm + 1).padStart(2, '0')}-01` <= calMaxKey;
  };
  const renderCalGrid = () => {
    const selKey = fmtKey(pickerOpen === 'a' ? dayA : dayB);
    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    const rows: (number | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return (
      <View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <TouchableOpacity onPress={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else { setCalMonth(m => m - 1); } }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="chevron-back" size={20} color={accent} />
          </TouchableOpacity>
          <Text style={{ fontSize: 15, color: theme.textPrimary, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1 }}>{CAL_MONTHS[calMonth]} {calYear}</Text>
          <TouchableOpacity onPress={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else { setCalMonth(m => m + 1); } }} disabled={!calCanGoNext()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="chevron-forward" size={20} color={calCanGoNext() ? accent : theme.textDim} />
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row', marginBottom: 6 }}>
          {CAL_DAYS.map(d => (
            <View key={d} style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontSize: 9, color: theme.textDim, fontFamily: 'DMSans_700Bold', letterSpacing: 1 }}>{d}</Text>
            </View>
          ))}
        </View>
        {rows.map((row, ri) => (
          <View key={ri} style={{ flexDirection: 'row', marginBottom: 2 }}>
            {row.map((day, ci) => {
              if (!day) return <View key={ci} style={{ flex: 1 }} />;
              const dk = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isSel = dk === selKey;
              const isFut = dk > calMaxKey;
              return (
                <TouchableOpacity key={ci} style={{ flex: 1, alignItems: 'center', paddingVertical: 5 }}
                  onPress={() => { if (pickerOpen) { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); onPickDate(pickerOpen, new Date(calYear, calMonth, day)); } }}
                  disabled={isFut} activeOpacity={0.7}>
                  <View style={{ width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: isSel ? accent : 'transparent' }}>
                    <Text style={{ fontSize: 13, fontFamily: isSel ? 'DMSans_700Bold' : 'DMSans_400Regular', color: isSel ? theme.bgPrimary : isFut ? theme.textDim : theme.textSecondary }}>
                      {day}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bgPrimary }}>
      {/* Header */}
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 0.5, borderBottomColor: theme.borderCard, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); router.back(); }} style={{ padding: 4 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={24} color={accent} />
        </TouchableOpacity>
        <Text style={{ fontSize: 24, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2, color: accent, flex: 1 }}>COMPARISON</Text>
        <View style={{ transform: [{ translateY: -1 }] }}>
          <TooltipIcon tooltipKey="comparison_report" size={18} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}>

        {/* ── Preset chips ── */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
          {presets.map(p => {
            const isAvail = available[p.id] !== false;
            const isSel = mode === 'preset' && p.id === selectedId;
            const disabled = checking ? false : !isAvail;
            return (
              <TouchableOpacity
                key={p.id}
                activeOpacity={disabled ? 1 : 0.7}
                onPress={() => { if (disabled) return; triggerHaptic(Haptics.ImpactFeedbackStyle.Light); selectPreset(p); }}
                style={{
                  flexGrow: 1, minWidth: '46%',
                  backgroundColor: isSel ? `${accent}1F` : theme.bgCard,
                  borderWidth: 1, borderColor: isSel ? `${accent}80` : theme.borderCard,
                  borderRadius: 12, paddingVertical: 13, paddingHorizontal: 14,
                  opacity: disabled ? 0.4 : 1,
                  flexDirection: 'row', alignItems: 'center', gap: 10,
                  shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4,
                }}
              >
                <Ionicons name={p.icon as any} size={20} color={isSel ? accent : theme.textSecondary} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10, fontFamily: 'DMSans_700Bold', letterSpacing: 2, textTransform: 'uppercase', color: isSel ? accent : theme.textPrimary }}>{p.line1}</Text>
                  <Text style={{ fontSize: 11, fontFamily: 'DMSans_400Regular', color: theme.textDim, marginTop: 2 }}>{p.line2}</Text>
                </View>
                {isSel && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: accent }} />}
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
            borderRadius: 12, paddingVertical: 13, marginBottom: 16,
            shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4,
          }}
        >
          <Ionicons name={IS_PRO ? 'calendar-outline' : 'lock-closed'} size={16} color={mode === 'dayvsday' ? accent : theme.textSecondary} />
          <Text style={{ fontSize: 13, fontFamily: 'DMSans_600SemiBold', color: mode === 'dayvsday' ? accent : theme.textSecondary }}>Day vs Day</Text>
          {!IS_PRO && <View style={{ backgroundColor: `${accent}20`, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
            <Text style={{ fontSize: 9, fontFamily: 'DMSans_700Bold', letterSpacing: 2, color: accent }}>PRO</Text>
          </View>}
        </TouchableOpacity>

        {/* ── Day-vs-day date selectors ── */}
        {mode === 'dayvsday' && IS_PRO && (
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
            {(['a', 'b'] as const).map(which => (
              <TouchableOpacity
                key={which}
                activeOpacity={0.7}
                onPress={() => openPicker(which)}
                style={{
                  flex: 1, backgroundColor: theme.bgCard, borderWidth: 1, borderColor: theme.borderCard,
                  borderRadius: 12, paddingVertical: 13, alignItems: 'center',
                  shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4,
                }}
              >
                <Text style={{ fontSize: 9, fontFamily: 'DMSans_700Bold', letterSpacing: 2, textTransform: 'uppercase', color: theme.textDim, marginBottom: 5 }}>{which === 'a' ? 'Day A' : 'Day B'}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Ionicons name="calendar-outline" size={13} color={accent} />
                  <Text style={{ fontSize: 17, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1, color: accent }}>{fmtDayLabel(which === 'a' ? dayA : dayB)}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── Loading ── */}
        {loading && <View style={{ paddingVertical: 40, alignItems: 'center' }}><ActivityIndicator color={accent} /></View>}

        {/* ── Metric cards ── */}
        {!loading && result && result.rows.map(row => (
          <MetricCard
            key={row.id}
            row={row}
            theme={theme}
            accent={accent}
            labelA={labels.a}
            labelB={labels.b}
            dayMode={mode === 'dayvsday'}
          />
        ))}

        {/* ── Disclaimer ── */}
        {!loading && result && (
          <View style={{ marginTop: 8, alignItems: 'center' }}>
            <Text style={{ fontSize: 11, lineHeight: 17, fontFamily: 'DMSans_400Regular', color: theme.textDim, textAlign: 'center' }}>
              {mode === 'dayvsday'
                ? 'Each column is a single day. Metrics with no log that day show no data. Today is not selectable.'
                : 'Values are daily averages using only logged days. Today is not included.'}
            </Text>
            <Text style={{ fontSize: 10, fontFamily: 'DMSans_400Regular', color: theme.textDim, marginTop: 6, fontStyle: 'italic', textAlign: 'center' }}>For informational purposes only. Not medical advice.</Text>
          </View>
        )}

        {/* ── Empty state ── */}
        {!checking && !loading && !result && (
          <View style={{ paddingVertical: 50, alignItems: 'center', paddingHorizontal: 30 }}>
            <Ionicons name="bar-chart-outline" size={44} color={theme.textDim} />
            <Text style={{ fontSize: 15, fontFamily: 'DMSans_700Bold', color: theme.textSecondary, marginTop: 12, textAlign: 'center' }}>Not enough data yet</Text>
            <Text style={{ fontSize: 13, fontFamily: 'DMSans_400Regular', color: theme.textDim, marginTop: 6, textAlign: 'center', lineHeight: 19 }}>Keep logging and your periods will fill in. Comparisons need data on both sides.</Text>
          </View>
        )}
      </ScrollView>

      {/* ── Date picker modal ── */}
      <Modal transparent visible={pickerOpen !== null} animationType="none" statusBarTranslucent onRequestClose={closePicker}
        onShow={() => { pickerAnim.setValue(0); Animated.spring(pickerAnim, { toValue: 1, useNativeDriver: true, friction: 8, tension: 90 }).start(); }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <TouchableOpacity activeOpacity={1} onPress={closePicker} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)' }} />
          <Animated.View style={{
            width: '88%', backgroundColor: modalCardBg, borderRadius: 18,
            borderTopWidth: 1.5, borderTopColor: accent,
            borderWidth: 0.5, borderColor: theme.borderCard, padding: 16,
            transform: [{ scale: pickerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }],
          }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.borderCard, alignSelf: 'center', marginBottom: 12 }} />
            <Text style={{ fontSize: 13, fontFamily: 'DMSans_700Bold', letterSpacing: 2, textTransform: 'uppercase', color: theme.textMuted, textAlign: 'center', marginBottom: 12 }}>
              {pickerOpen === 'a' ? 'Day A' : 'Day B'}
            </Text>
            {renderCalGrid()}
            <TouchableOpacity onPress={closePicker} style={{ backgroundColor: accent, borderRadius: 8, paddingVertical: 11, alignItems: 'center', marginTop: 12 }}>
              <Text style={{ fontSize: 13, fontFamily: 'DMSans_600SemiBold', color: '#fff' }}>Done</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

function MetricCard({ row, theme, accent, labelA, labelB, dayMode }: {
  row: MetricComparison; theme: any; accent: string; labelA: string; labelB: string; dayMode: boolean;
}) {
  const meta = METRIC_META[row.id];
  const icon = METRIC_ICON[row.id] ?? 'analytics-outline';
  const aWins = row.winner === 'a';
  const bWins = row.winner === 'b';
  const aColor = aWins ? accent : theme.textSecondary;
  const bColor = bWins ? accent : theme.textSecondary;
  const aLabelColor = aWins ? accent : theme.textDim;
  const bLabelColor = bWins ? accent : theme.textDim;
  const countLabel = (n: number) => n === 1 ? '1 day' : `${n} days`;
  const subCount = (mv: typeof row.a) => mv.avg === null ? 'no data' : countLabel(row.id === 'weight' ? (mv.weighIns ?? 0) : mv.loggedDays);
  const rawDelta = (row.a.avg !== null && row.b.avg !== null) ? Math.abs(row.a.avg - row.b.avg) : null;
  const delta = rawDelta !== null ? formatDelta(row.id, rawDelta) : null;

  return (
    <View style={{
      backgroundColor: theme.bgCard, borderRadius: 14,
      borderWidth: 0.5, borderColor: theme.borderCard,
      marginBottom: 10, overflow: 'hidden',
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6,
    }}>
      {/* Accent bar on winning side */}
      {aWins && <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: accent }} />}
      {bWins && <View style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 3, backgroundColor: accent }} />}

      {/* Metric header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingTop: 11, paddingBottom: 10, borderBottomWidth: 0.5, borderBottomColor: theme.borderCard }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, flex: 1 }}>
          <Ionicons name={icon as any} size={13} color={accent} />
          <Text style={{ fontSize: 9, fontFamily: 'DMSans_700Bold', letterSpacing: 3, textTransform: 'uppercase', color: theme.textMuted }}>{meta.label}</Text>
        </View>
        <Text style={{ fontSize: 10, fontFamily: 'DMSans_400Regular', color: theme.textDim }}>{meta.unit}</Text>
      </View>

      {/* Values */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', paddingLeft: 16, paddingRight: 14, paddingTop: 12, paddingBottom: 14 }}>
        {/* Period A */}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 9, fontFamily: 'DMSans_700Bold', letterSpacing: 1.5, textTransform: 'uppercase', color: aLabelColor, marginBottom: 4 }}>{labelA}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 32, fontFamily: 'BebasNeue_400Regular', color: aColor, letterSpacing: 0.5, lineHeight: 34 }}>{formatValueNum(row.id, row.a.avg)}</Text>
            {!!inlineUnit(row.id) && row.a.avg !== null && (
              <Text style={{ fontSize: 13, fontFamily: 'DMSans_700Bold', color: aColor, paddingBottom: 3, marginLeft: 1 }}>{inlineUnit(row.id)}</Text>
            )}
          </View>
          {!dayMode && <Text style={{ fontSize: 10, fontFamily: 'DMSans_400Regular', color: theme.textDim, marginTop: 4 }}>{subCount(row.a)}</Text>}
        </View>

        {/* Delta chip */}
        <View style={{ alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, paddingTop: dayMode ? 12 : 18, minWidth: 62 }}>
          {delta ? (
            <View style={{ backgroundColor: `${accent}15`, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 0.5, borderColor: `${accent}30`, alignItems: 'center', gap: 2 }}>
              <Text style={{ fontSize: 7, fontFamily: 'DMSans_700Bold', letterSpacing: 1.5, color: theme.textDim, textTransform: 'uppercase' }}>DIFF</Text>
              <Text style={{ fontSize: 11, fontFamily: 'DMSans_600SemiBold', color: theme.textDim, textAlign: 'center' }}>{delta}</Text>
            </View>
          ) : null}
        </View>

        {/* Period B */}
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 9, fontFamily: 'DMSans_700Bold', letterSpacing: 1.5, textTransform: 'uppercase', color: bLabelColor, marginBottom: 4, textAlign: 'right' }}>{labelB}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
            <Text style={{ fontSize: 32, fontFamily: 'BebasNeue_400Regular', color: bColor, letterSpacing: 0.5, lineHeight: 34 }}>{formatValueNum(row.id, row.b.avg)}</Text>
            {!!inlineUnit(row.id) && row.b.avg !== null && (
              <Text style={{ fontSize: 13, fontFamily: 'DMSans_700Bold', color: bColor, paddingBottom: 3, marginLeft: 1 }}>{inlineUnit(row.id)}</Text>
            )}
          </View>
          {!dayMode && <Text style={{ fontSize: 10, fontFamily: 'DMSans_400Regular', color: theme.textDim, marginTop: 4, textAlign: 'right' }}>{subCount(row.b)}</Text>}
        </View>
      </View>
    </View>
  );
}
