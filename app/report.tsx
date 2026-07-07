// app/report.tsx
// A single Custom Report: renders live from the app's existing data (never a snapshot) and lets the user
// pick a date range + assemble blocks from the library. Config persists to pj_reports via utils/reports.
// Renderers are purpose-built to match the approved mockup (gradient trend lines, stat tiles, macro bar).

import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Defs, LinearGradient as SvgGradient, Stop, Line as SvgLine, Circle, Text as SvgText } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import { useTheme } from '../theme';
import { useToast } from '../components/Toast';
import { fetchTrendData, TrendData, EMPTY_TREND_DATA } from '../utils/statsData';
import { loadReports, saveReport, newReportId, resolveRange, RANGE_LABELS, Report, ReportRangePreset } from '../utils/reports';
import { REPORT_CHAPTERS, REPORT_BLOCKS, blocksForChapter, getReportBlock, ReportBlock } from '../utils/reportBlocks';

const PRESETS: ReportRangePreset[] = ['week', 'month', '3month', '6month', 'year'];
const avg = (nums: number[]) => (nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0);

export default function ReportScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const params = useLocalSearchParams<{ id?: string; new?: string }>();

  const [report, setReport] = useState<Report | null>(null);
  const [data, setData] = useState<TrendData>(EMPTY_TREND_DATA);
  const [loading, setLoading] = useState(true);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const nameRef = useRef<TextInput>(null);

  // Load or create the report config.
  useEffect(() => {
    (async () => {
      if (params.id) {
        const all = await loadReports();
        const found = all.find(r => r.id === params.id);
        if (found) { setReport(found); return; }
      }
      const now = Date.now();
      setReport({ id: newReportId(), name: 'Untitled Report', range: { preset: 'month' }, blockIds: [], createdAt: now, updatedAt: now });
      setLibraryOpen(true); // a fresh report opens with the block library visible so the user can add blocks
    })();
  }, [params.id, params.new]);

  // Fetch the live data whenever the range changes.
  useEffect(() => {
    if (!report) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const wsRaw = await AsyncStorage.getItem('pj_workout_state');
        const ws = wsRaw ? JSON.parse(wsRaw) : {};
        let sleepGoal = 8;
        try { const p = await AsyncStorage.getItem('pj_profile'); if (p) sleepGoal = JSON.parse(p).sleepGoal || 8; } catch {}
        const days = resolveRange(report.range).days;
        const td = await fetchTrendData(days, ws, sleepGoal);
        if (!cancelled) setData(td);
      } catch { if (!cancelled) setData(EMPTY_TREND_DATA); }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [report?.range.preset, report?.range.startKey, report?.range.endKey]);

  const persist = async (next: Report) => {
    const stamped = { ...next, updatedAt: Date.now() };
    setReport(stamped);
    await saveReport(stamped);
  };

  const setRange = (preset: ReportRangePreset) => {
    if (!report) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    persist({ ...report, range: { preset } });
  };

  const toggleBlock = (id: string) => {
    if (!report) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    const has = report.blockIds.includes(id);
    const blockIds = has ? report.blockIds.filter(b => b !== id) : [...report.blockIds, id];
    persist({ ...report, blockIds });
  };

  const rename = (name: string) => { if (report) setReport({ ...report, name }); };
  const commitName = () => { if (report) persist({ ...report, name: report.name.trim() || 'Untitled Report' }); };

  if (!report) {
    return <View style={{ flex: 1, backgroundColor: theme.bgPrimary, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={theme.accentBlue} /></View>;
  }

  const activeBlocks = report.blockIds.map(getReportBlock).filter(Boolean) as ReportBlock[];

  return (
    <View style={{ flex: 1, backgroundColor: theme.bgPrimary }}>
      {/* Header */}
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 0.5, borderBottomColor: theme.borderCard }}>
        <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); router.back(); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={26} color={theme.textSecondary} />
        </TouchableOpacity>
        <TextInput
          ref={nameRef}
          value={report.name}
          onChangeText={rename}
          onBlur={commitName}
          placeholder="Report name"
          placeholderTextColor={theme.textDim}
          style={{ flex: 1, fontSize: 20, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1, color: theme.textSecondary, paddingVertical: 2 }}
        />
        <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); nameRef.current?.focus(); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ padding: 4 }}>
          <Ionicons name="pencil" size={17} color={theme.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        {/* Range chips */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 14, marginBottom: 4 }}>
          {PRESETS.map(p => {
            const sel = report.range.preset === p;
            return (
              <TouchableOpacity key={p} onPress={() => setRange(p)}
                style={{ backgroundColor: sel ? theme.accentBlueBg : theme.bgCard, borderWidth: 1, borderColor: sel ? theme.accentBlueBorder : theme.borderCard, borderRadius: 16, paddingHorizontal: 13, paddingVertical: 6 }}>
                <Text style={{ fontSize: 12, fontFamily: 'DMSans_600SemiBold', color: sel ? theme.accentBlue : theme.textMuted }}>{RANGE_LABELS[p]}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {loading ? (
          <View style={{ paddingVertical: 50, alignItems: 'center' }}><ActivityIndicator color={theme.accentBlue} /></View>
        ) : activeBlocks.length > 0 ? (
          <View style={{ marginTop: 14, gap: 12 }}>
            {activeBlocks.map(b => <BlockCard key={b.id} block={b} data={data} theme={theme} />)}
          </View>
        ) : !libraryOpen ? (
          <View style={{ alignItems: 'center', paddingTop: 54, paddingHorizontal: 24 }}>
            <View style={{ width: 60, height: 60, borderRadius: 16, backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              <Ionicons name="add-circle" size={30} color={theme.accentBlue} />
            </View>
            <Text style={{ fontSize: 16, fontFamily: 'DMSans_700Bold', color: theme.textSecondary, marginBottom: 5 }}>Add your first block</Text>
            <Text style={{ fontSize: 13, fontFamily: 'DMSans_400Regular', color: theme.textMuted, textAlign: 'center', lineHeight: 19 }}>
              Tap Add Blocks below to build this report.
            </Text>
          </View>
        ) : null}

        {/* Add / Done Blocks toggle -- clear labeled control (replaces the old icon-only edit toggle) */}
        {!loading && (
          <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Medium); setLibraryOpen(o => !o); }}
            style={{ marginTop: 16, borderRadius: 12, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: libraryOpen ? theme.bgCard : theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder }}>
            <Ionicons name={libraryOpen ? 'checkmark' : 'add'} size={18} color={theme.accentBlue} />
            <Text style={{ fontSize: 14, fontFamily: 'DMSans_700Bold', color: theme.accentBlue }}>{libraryOpen ? 'Done Adding Blocks' : 'Add Blocks'}</Text>
          </TouchableOpacity>
        )}

        {/* Block library */}
        {libraryOpen && (
          <View style={{ marginTop: 16, borderWidth: 1.5, borderStyle: 'dashed', borderColor: theme.borderCard, borderRadius: 12, padding: 14, backgroundColor: theme.bgCard }}>
            <Text style={{ fontSize: 13, fontFamily: 'DMSans_700Bold', color: theme.textSecondary, marginBottom: 3 }}>Block library</Text>
            <Text style={{ fontSize: 12, fontFamily: 'DMSans_400Regular', color: theme.textMuted, marginBottom: 12 }}>Add what you care about, skip what you don't. Every block is designed to look premium.</Text>
            {REPORT_CHAPTERS.map(ch => {
              const blocks = blocksForChapter(ch.key);
              if (blocks.length === 0) return null;
              return (
                <View key={ch.key} style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 7 }}>
                    <Ionicons name={ch.icon as any} size={14} color={theme.accentBlue} />
                    <Text style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: 'DMSans_700Bold', color: theme.textMuted }}>{ch.label}</Text>
                  </View>
                  <View style={{ gap: 7 }}>
                    {blocks.map(b => {
                      const added = report.blockIds.includes(b.id);
                      return (
                        <View key={b.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: theme.bgInset, borderWidth: 1, borderColor: theme.borderCard, borderRadius: 10, padding: 10 }}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13, fontFamily: 'DMSans_700Bold', color: theme.textSecondary }}>{b.title}</Text>
                            <Text style={{ fontSize: 11, fontFamily: 'DMSans_400Regular', color: theme.textMuted, marginTop: 1 }}>{b.desc}</Text>
                          </View>
                          <TouchableOpacity onPress={() => toggleBlock(b.id)}
                            style={{ borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: added ? 'transparent' : theme.accentBlue, borderWidth: added ? 1 : 0, borderColor: theme.accentBlueBorder }}>
                            <Text style={{ fontSize: 11.5, fontFamily: 'DMSans_700Bold', color: added ? theme.accentBlue : '#fff' }}>{added ? '✓ Added' : '+ Add'}</Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <Text style={{ fontSize: 11, color: theme.textDim, textAlign: 'center', marginTop: 20, fontFamily: 'DMSans_400Regular' }}>For informational purposes only. Not medical advice.</Text>
      </ScrollView>
    </View>
  );
}

// ── Block renderer ───────────────────────────────────────────────────────────────────────────────
function BlockCard({ block, data, theme }: { block: ReportBlock; data: TrendData; theme: any }) {
  return (
    <View style={{ backgroundColor: theme.bgCard, borderWidth: 0.5, borderColor: theme.borderCard, borderTopColor: theme.accentBlueRaw, borderTopWidth: 1.5, borderRadius: 14, padding: 16 }}>
      <Text style={{ fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'DMSans_700Bold', color: theme.textMuted, marginBottom: 12 }}>{block.title}</Text>
      {block.form === 'lineTrend' && <LineTrend series={seriesFor(block.dataKey, data)} theme={theme} />}
      {block.form === 'statTiles' && <NutritionHeadline data={data} theme={theme} />}
      {block.form === 'macroSplit' && <MacroSplit data={data} theme={theme} />}
    </View>
  );
}

function seriesFor(dataKey: string | undefined, data: TrendData): { date: string; value: number }[] {
  switch (dataKey) {
    case 'weight': return data.weight;
    case 'steps': return data.steps;
    case 'activeCals': return data.activeCal;
    case 'sleep': return data.sleep;
    default: return [];
  }
}

// Stat-tiles form: nutrition headline numbers.
function NutritionHeadline({ data, theme }: { data: TrendData; theme: any }) {
  const cals = data.cal.map(d => d.cal).filter(v => v > 0);
  const prot = data.macro.map(d => d.protein).filter(v => v > 0);
  const carb = data.macro.map(d => d.carbs).filter(v => v > 0);
  const fat = data.macro.map(d => d.fat).filter(v => v > 0);
  const tiles = [
    { label: 'Avg Calories', value: cals.length ? Math.round(avg(cals)).toLocaleString('en-US') : '—' },
    { label: 'Avg Protein', value: prot.length ? Math.round(avg(prot)) + ' g' : '—' },
    { label: 'Avg Carbs', value: carb.length ? Math.round(avg(carb)) + ' g' : '—' },
    { label: 'Avg Fat', value: fat.length ? Math.round(avg(fat)) + ' g' : '—' },
  ];
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {tiles.map(t => (
        <View key={t.label} style={{ width: '47.6%', flexGrow: 1, backgroundColor: theme.bgInset, borderWidth: 1, borderColor: theme.borderCard, borderRadius: 10, paddingVertical: 11, paddingHorizontal: 12 }}>
          <Text style={{ fontSize: 8.5, letterSpacing: 1.3, textTransform: 'uppercase', fontFamily: 'DMSans_700Bold', color: theme.textMuted, marginBottom: 5 }}>{t.label}</Text>
          <Text style={{ fontSize: 20, fontFamily: 'DMSans_700Bold', color: theme.textSecondary }}>{t.value}</Text>
        </View>
      ))}
    </View>
  );
}

// Macro-split form: average protein/carbs/fat as a stacked bar + legend.
function MacroSplit({ data, theme }: { data: TrendData; theme: any }) {
  const p = Math.round(avg(data.macro.map(d => d.protein).filter(v => v > 0)));
  const c = Math.round(avg(data.macro.map(d => d.carbs).filter(v => v > 0)));
  const f = Math.round(avg(data.macro.map(d => d.fat).filter(v => v > 0)));
  const pC = p * 4, cC = c * 4, fC = f * 9;
  const total = pC + cC + fC || 1;
  const pct = (n: number) => Math.round((n / total) * 100);
  const COL = { protein: '#0d9268', carbs: '#c47d1a', fat: '#a83232' };
  if (p + c + f === 0) return <Text style={{ fontSize: 13, color: theme.textMuted, fontFamily: 'DMSans_400Regular' }}>No macro data logged in this range.</Text>;
  return (
    <View>
      <View style={{ flexDirection: 'row', gap: 2, height: 24, borderRadius: 7, overflow: 'hidden' }}>
        <View style={{ flex: pC || 0.01, backgroundColor: COL.protein }} />
        <View style={{ flex: cC || 0.01, backgroundColor: COL.carbs }} />
        <View style={{ flex: fC || 0.01, backgroundColor: COL.fat }} />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 12 }}>
        {([['Protein', p, pct(pC), COL.protein], ['Carbs', c, pct(cC), COL.carbs], ['Fat', f, pct(fC), COL.fat]] as [string, number, number, string][]).map(([name, g, percent, col]) => (
          <View key={name} style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
            <View style={{ width: 11, height: 11, borderRadius: 3.5, backgroundColor: col }} />
            <View>
              <Text style={{ fontSize: 12, fontFamily: 'DMSans_700Bold', color: theme.textSecondary }}>{name} {percent}%</Text>
              <Text style={{ fontSize: 11, fontFamily: 'DMSans_500Medium', color: theme.textMuted }}>{g} g/day</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

// Line-trend form: a gradient-filled SVG line with y-axis labels + endpoint marker.
function LineTrend({ series, theme }: { series: { date: string; value: number }[]; theme: any }) {
  const points = useMemo(() => series.filter(d => typeof d.value === 'number' && !isNaN(d.value) && d.value > 0), [series]);
  if (points.length < 2) {
    return <Text style={{ fontSize: 13, color: theme.textMuted, fontFamily: 'DMSans_400Regular' }}>Not enough data in this range yet.</Text>;
  }
  const W = 320, H = 150, padL = 34, padR = 8, padT = 10, padB = 18;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const vals = points.map(p => p.value);
  let min = Math.min(...vals), max = Math.max(...vals);
  if (min === max) { min -= 1; max += 1; }
  const pad = (max - min) * 0.12; min -= pad; max += pad;
  const X = (i: number) => padL + (i / (points.length - 1)) * plotW;
  const Y = (v: number) => padT + (1 - (v - min) / (max - min)) * plotH;
  const accent = theme.accentBlue;

  let dLine = '';
  points.forEach((p, i) => { dLine += (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(p.value).toFixed(1) + ' '; });
  const dArea = dLine + `L${X(points.length - 1).toFixed(1)} ${padT + plotH} L${X(0).toFixed(1)} ${padT + plotH} Z`;
  const ticks = [max - pad, (max + min) / 2, min + pad];
  const fmtTick = (v: number) => (Math.abs(v) >= 100 ? Math.round(v).toString() : (Math.round(v * 10) / 10).toString());

  return (
    <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
      <Defs>
        <SvgGradient id="lt" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={accent} stopOpacity={0.28} />
          <Stop offset="0.65" stopColor={accent} stopOpacity={0.07} />
          <Stop offset="1" stopColor={accent} stopOpacity={0} />
        </SvgGradient>
      </Defs>
      {ticks.map((t, i) => (
        <React.Fragment key={i}>
          <SvgLine x1={padL} y1={Y(t)} x2={W - padR} y2={Y(t)} stroke={theme.borderCard} strokeWidth={1} />
          <SvgText x={padL - 5} y={Y(t) + 3} fontSize={9} fill={theme.textDim} textAnchor="end" fontFamily="DMSans_600SemiBold">{fmtTick(t)}</SvgText>
        </React.Fragment>
      ))}
      <Path d={dArea} fill="url(#lt)" />
      <Path d={dLine} fill="none" stroke={accent} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={X(points.length - 1)} cy={Y(points[points.length - 1].value)} r={4} fill={accent} stroke={theme.bgCard} strokeWidth={2} />
    </Svg>
  );
}
