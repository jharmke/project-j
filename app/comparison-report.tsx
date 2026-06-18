// app/comparison-report.tsx
// Comparison Report (#6). Pick two matched-length periods, see a side-by-side
// per-metric comparison with the stronger value highlighted. Just data: no
// scoreboard, no coaching. Runs entirely on utils/comparisonEngine.ts.
//
// v1 step: the 4 free presets + the live table + transparency layer + empty
// states. Day-vs-day (Pro) and image export land in later steps.
//
// Today is EXCLUDED from every range (a half-logged today would skew an average),
// consistent with how EvR / the summaries treat the current day.

import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import { useTheme } from '../theme';
import {
  buildComparison, dateKeysInRange, COMPARISON_METRICS, METRIC_META,
  ComparisonResult, MetricComparison, MetricId,
} from '../utils/comparisonEngine';

// ── Date helpers ────────────────────────────────────────────────────────────────
function fmtKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

interface Preset {
  id: string;
  label: string;       // chip label
  labelA: string;      // column header A
  labelB: string;      // column header B
  startA: string; endA: string;
  startB: string; endB: string;
}

// Built at runtime off "now". Every range ends yesterday-or-earlier (today excluded).
function buildPresets(now: Date): Preset[] {
  const yest = addDays(now, -1);
  const y = fmtKey(yest);

  // This week (Sun..yesterday) vs last week (full Sun..Sat)
  const thisSun = addDays(now, -now.getDay());          // Sunday of the current week
  const lastSun = addDays(thisSun, -7);
  const lastSat = addDays(thisSun, -1);

  // This month (1st..yesterday) vs last month (full previous calendar month)
  const thisMonth1 = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonth1 = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  return [
    {
      id: 'week', label: 'This week\nvs last week', labelA: 'This Week', labelB: 'Last Week',
      startA: fmtKey(thisSun), endA: y, startB: fmtKey(lastSun), endB: fmtKey(lastSat),
    },
    {
      id: 'month', label: 'This month\nvs last month', labelA: 'This Month', labelB: 'Last Month',
      startA: fmtKey(thisMonth1), endA: y, startB: fmtKey(lastMonth1), endB: fmtKey(lastMonthEnd),
    },
    {
      id: '7d', label: 'Last 7 days\nvs prev 7', labelA: 'Last 7 Days', labelB: 'Previous 7',
      startA: fmtKey(addDays(yest, -6)), endA: y, startB: fmtKey(addDays(yest, -13)), endB: fmtKey(addDays(yest, -7)),
    },
    {
      id: '30d', label: 'Last 30 days\nvs prev 30', labelA: 'Last 30 Days', labelB: 'Previous 30',
      startA: fmtKey(addDays(yest, -29)), endA: y, startB: fmtKey(addDays(yest, -59)), endB: fmtKey(addDays(yest, -30)),
    },
  ];
}

// ── Value formatting per metric (the SAME rounded value the winner is decided on) ──
function formatMetric(id: MetricId, v: number | null): string {
  if (v === null) return '—';
  switch (id) {
    case 'net':        return `${v > 0 ? '+' : ''}${Math.round(v).toLocaleString()}`;
    case 'protein':    return `${Math.round(v).toLocaleString()}g`;
    case 'steps':      return Math.round(v).toLocaleString();
    case 'activeCals': return Math.round(v).toLocaleString();
    case 'water':      return `${Math.round(v)} oz`;
    case 'sleepScore': return `${Math.round(v)}`;
    case 'weight':     return `${v > 0 ? '+' : ''}${v.toFixed(1)} lbs`; // net change
    default:           return `${v}`;
  }
}

export default function ComparisonReportScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const accent = theme.accentBlueRaw;

  const presets = useMemo(() => buildPresets(new Date()), []);
  const [available, setAvailable] = useState<Record<string, boolean>>({});
  const [checking, setChecking] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);

  // ── Availability scan: a preset is usable only if BOTH sides have >= 1 logged day ──
  useEffect(() => {
    (async () => {
      const avail: Record<string, boolean> = {};
      for (const p of presets) {
        const keysA = dateKeysInRange(p.startA, p.endA).map(k => `pj_${k}`);
        const keysB = dateKeysInRange(p.startB, p.endB).map(k => `pj_${k}`);
        try {
          const [pa, pb] = await Promise.all([
            AsyncStorage.multiGet(keysA),
            AsyncStorage.multiGet(keysB),
          ]);
          const hasA = pa.some(([, v]) => !!v);
          const hasB = pb.some(([, v]) => !!v);
          avail[p.id] = hasA && hasB;
        } catch {
          avail[p.id] = false;
        }
      }
      setAvailable(avail);
      setChecking(false);
      // Auto-select the first available preset.
      const first = presets.find(p => avail[p.id]);
      if (first) selectPreset(first);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectPreset = async (p: Preset) => {
    setSelectedId(p.id);
    setLoading(true);
    try {
      const res = await buildComparison(
        dateKeysInRange(p.startA, p.endA),
        dateKeysInRange(p.startB, p.endB),
      );
      setResult(res);
    } catch {
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const selectedPreset = presets.find(p => p.id === selectedId) || null;

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
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.bgPrimary }}>
      {Header}
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}>

        {/* ── Preset chips ── */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
          {presets.map(p => {
            const isAvail = available[p.id] !== false; // treat unknown (pre-scan) as enabled
            const isSel = p.id === selectedId;
            const disabled = checking ? false : !isAvail;
            return (
              <TouchableOpacity
                key={p.id}
                activeOpacity={disabled ? 1 : 0.7}
                onPress={() => {
                  if (disabled) { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); return; }
                  triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                  selectPreset(p);
                }}
                style={{
                  flexGrow: 1, minWidth: '46%',
                  backgroundColor: isSel ? `${accent}1F` : theme.bgCard,
                  borderWidth: 1,
                  borderColor: isSel ? `${accent}80` : theme.borderCard,
                  borderRadius: 10, paddingVertical: 12, paddingHorizontal: 12,
                  opacity: disabled ? 0.4 : 1,
                }}
              >
                <Text style={{
                  fontSize: 13, lineHeight: 18, fontFamily: 'DMSans_600SemiBold',
                  color: isSel ? accent : theme.textSecondary,
                }}>
                  {p.label}
                </Text>
                {disabled && (
                  <Text style={{ fontSize: 10, fontFamily: 'DMSans_400Regular', color: theme.textDim, marginTop: 3 }}>
                    Needs more data
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Table ── */}
        {loading && (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator color={accent} />
          </View>
        )}

        {!loading && result && selectedPreset && (
          <View style={{
            backgroundColor: theme.bgCard, borderWidth: 0.5, borderColor: theme.borderCard,
            borderTopColor: accent, borderRadius: 14, padding: 16,
          }}>
            {/* Column headers */}
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: 10 }}>
              <View style={{ flex: 1.2 }} />
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: 10, fontFamily: 'DMSans_700Bold', letterSpacing: 1, textTransform: 'uppercase', color: accent, textAlign: 'center' }}>{selectedPreset.labelA}</Text>
              </View>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: 10, fontFamily: 'DMSans_700Bold', letterSpacing: 1, textTransform: 'uppercase', color: theme.textDim, textAlign: 'center' }}>{selectedPreset.labelB}</Text>
              </View>
            </View>

            {result.rows.map((row, i) => (
              <MetricRow key={row.id} row={row} theme={theme} accent={accent} isLast={i === result.rows.length - 1} />
            ))}
          </View>
        )}

        {/* ── Transparency layer ── */}
        {!loading && result && (
          <>
            <Text style={{ fontSize: 11, lineHeight: 16, fontFamily: 'DMSans_400Regular', color: theme.textDim, marginTop: 14 }}>
              Averages use only days with logged data. Excluded days are removed, so metrics can span different day counts. Today is not included.
            </Text>
            <Text style={{ fontSize: 10, fontFamily: 'DMSans_400Regular', color: theme.textDim, marginTop: 8, fontStyle: 'italic' }}>
              For informational purposes only. Not medical advice.
            </Text>
          </>
        )}

        {/* ── No preset available at all ── */}
        {!checking && !loading && !result && (
          <View style={{ paddingVertical: 50, alignItems: 'center', paddingHorizontal: 30 }}>
            <Ionicons name="bar-chart-outline" size={44} color={theme.textDim} />
            <Text style={{ fontSize: 15, fontFamily: 'DMSans_700Bold', color: theme.textSecondary, marginTop: 12, textAlign: 'center' }}>Not enough data yet</Text>
            <Text style={{ fontSize: 13, fontFamily: 'DMSans_400Regular', color: theme.textDim, marginTop: 6, textAlign: 'center', lineHeight: 19 }}>
              Keep logging and your periods will fill in. Comparisons need data on both sides.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ── One metric row: label + sub-count on left, the two values, winner highlighted ──
function MetricRow({ row, theme, accent, isLast }: { row: MetricComparison; theme: any; accent: string; isLast: boolean }) {
  const meta = METRIC_META[row.id];
  const aWins = row.winner === 'a';
  const bWins = row.winner === 'b';

  const aColor = aWins ? accent : theme.textSecondary;
  const bColor = bWins ? accent : theme.textSecondary;
  const aWeight = aWins ? 'DMSans_700Bold' : 'DMSans_500Medium';
  const bWeight = bWins ? 'DMSans_700Bold' : 'DMSans_500Medium';

  const countLabel = (n: number) => n === 1 ? '1 day' : `${n} days`;

  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', paddingVertical: 11,
      borderBottomWidth: isLast ? 0 : 0.5, borderBottomColor: theme.borderSubtle ?? theme.borderCard,
    }}>
      <View style={{ flex: 1.2 }}>
        <Text style={{ fontSize: 13, fontFamily: 'DMSans_600SemiBold', color: theme.textPrimary }}>{meta.label}</Text>
        <Text style={{ fontSize: 9, fontFamily: 'DMSans_400Regular', color: theme.textDim, marginTop: 2 }}>{meta.unit}</Text>
      </View>
      <View style={{ flex: 1, alignItems: 'center' }}>
        <Text style={{ fontSize: 16, fontFamily: aWeight, color: aColor }}>{formatMetric(row.id, row.a.avg)}</Text>
        <Text style={{ fontSize: 9, fontFamily: 'DMSans_400Regular', color: theme.textDim, marginTop: 2 }}>
          {row.a.avg === null ? 'no data' : countLabel(row.id === 'weight' ? (row.a.weighIns ?? 0) : row.a.loggedDays)}
        </Text>
      </View>
      <View style={{ flex: 1, alignItems: 'center' }}>
        <Text style={{ fontSize: 16, fontFamily: bWeight, color: bColor }}>{formatMetric(row.id, row.b.avg)}</Text>
        <Text style={{ fontSize: 9, fontFamily: 'DMSans_400Regular', color: theme.textDim, marginTop: 2 }}>
          {row.b.avg === null ? 'no data' : countLabel(row.id === 'weight' ? (row.b.weighIns ?? 0) : row.b.loggedDays)}
        </Text>
      </View>
    </View>
  );
}
