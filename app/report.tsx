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
import { liftSessionHistory } from '../utils/liftPR';
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
  const [data, setData] = useState<TrendData>(EMPTY_TREND_DATA);   // current period
  const [prior, setPrior] = useState<TrendData>(EMPTY_TREND_DATA); // the period right before it (for trend arrows)
  const [foodDays, setFoodDays] = useState<FoodDay[]>([]);         // raw itemized food entries over the current period
  const [workoutState, setWorkoutState] = useState<any>(null);     // raw pj_workout_state (history + PRs)
  const [loading, setLoading] = useState(true);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
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
        // Fetch a DOUBLE window and split on the current period's start, so each block can show the
        // current period AND the one right before it (the "vs prior" trend arrows).
        const { days, startKey, endKey } = resolveRange(report.range);
        const full = await fetchTrendData(days * 2, ws, sleepGoal);
        const { cur, prev } = splitTrend(full, startKey);
        const fd = await loadRangeEntries(startKey, endKey);
        if (!cancelled) { setData(cur); setPrior(prev); setFoodDays(fd); setWorkoutState(ws); }
      } catch { if (!cancelled) { setData(EMPTY_TREND_DATA); setPrior(EMPTY_TREND_DATA); setFoodDays([]); } }
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

  // Reorder a block up (dir -1) or down (dir +1) in the report.
  const moveBlock = (id: string, dir: -1 | 1) => {
    if (!report) return;
    const idx = report.blockIds.indexOf(id);
    const to = idx + dir;
    if (idx < 0 || to < 0 || to >= report.blockIds.length) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    const bi = [...report.blockIds];
    [bi[idx], bi[to]] = [bi[to], bi[idx]];
    persist({ ...report, blockIds: bi });
  };

  const toggleCollapse = (id: string) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setCollapsed(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const rename = (name: string) => { if (report) setReport({ ...report, name }); };
  const commitName = () => { if (report) persist({ ...report, name: report.name.trim() || 'Untitled Report' }); };

  if (!report) {
    return <View style={{ flex: 1, backgroundColor: theme.bgPrimary, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={theme.accentBlue} /></View>;
  }

  const activeBlocks = report.blockIds.map(getReportBlock).filter(Boolean) as ReportBlock[];
  const rangeBounds = resolveRange(report.range);

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
            {activeBlocks.map((b, i) => (
              <BlockCard key={b.id} block={b} data={data} prior={prior} foodDays={foodDays} workoutState={workoutState}
                startKey={rangeBounds.startKey} endKey={rangeBounds.endKey} theme={theme}
                collapsed={collapsed.has(b.id)} onToggle={() => toggleCollapse(b.id)}
                editMode={libraryOpen} isFirst={i === 0} isLast={i === activeBlocks.length - 1}
                onUp={() => moveBlock(b.id, -1)} onDown={() => moveBlock(b.id, 1)} onRemove={() => toggleBlock(b.id)} />
            ))}
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

// ── Food entry loading (drill-down blocks) ────────────────────────────────────────────────────────
export interface FoodDay { date: string; entries: any[]; }
const keyDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Read the raw food entries for every day in [startKey, endKey] via one batched multiGet.
async function loadRangeEntries(startKey: string, endKey: string): Promise<FoodDay[]> {
  const start = new Date(startKey + 'T12:00:00');
  const end = new Date(endKey + 'T12:00:00');
  const keys: string[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) keys.push(`pj_${keyDate(d)}`);
  const out: FoodDay[] = [];
  try {
    const rows = await AsyncStorage.multiGet(keys);
    for (const [k, val] of rows) {
      if (!val) continue;
      try {
        const day = JSON.parse(val);
        const entries = Array.isArray(day?.entries) ? day.entries : [];
        if (entries.length) out.push({ date: k.replace('pj_', ''), entries });
      } catch {}
    }
  } catch {}
  return out;
}

const FULL_DATE = (key: string) => {
  try { return new Date(key + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }); }
  catch { return key; }
};

// ── Block renderer ───────────────────────────────────────────────────────────────────────────────
interface BlockCardProps {
  block: ReportBlock; data: TrendData; prior: TrendData; foodDays: FoodDay[]; workoutState: any;
  startKey: string; endKey: string; theme: any;
  collapsed: boolean; onToggle: () => void; editMode: boolean; isFirst: boolean; isLast: boolean;
  onUp: () => void; onDown: () => void; onRemove: () => void;
}
function BlockCard({ block, data, prior, foodDays, workoutState, startKey, endKey, theme, collapsed, onToggle, editMode, isFirst, isLast, onUp, onDown, onRemove }: BlockCardProps) {
  // For a trend block, surface its latest value in the header (clean) instead of floating it in the chart.
  const trendLatest = block.form === 'lineTrend' ? latestOf(seriesFor(block.dataKey, data)) : null;
  return (
    <View style={{ backgroundColor: theme.bgCard, borderWidth: 0.5, borderColor: theme.borderCard, borderTopColor: theme.accentBlueRaw, borderTopWidth: 1.5, borderRadius: 14, padding: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: collapsed ? 0 : 12 }}>
        <TouchableOpacity onPress={onToggle} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
          <Ionicons name={collapsed ? 'chevron-forward' : 'chevron-down'} size={15} color={theme.textMuted} />
          <Text style={{ fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'DMSans_700Bold', color: theme.textMuted }}>{block.title}</Text>
        </TouchableOpacity>
        {editMode ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <TouchableOpacity onPress={onUp} disabled={isFirst} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }} style={{ padding: 4 }}>
              <Ionicons name="chevron-up" size={18} color={isFirst ? theme.textDim : theme.accentBlue} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onDown} disabled={isLast} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }} style={{ padding: 4 }}>
              <Ionicons name="chevron-down" size={18} color={isLast ? theme.textDim : theme.accentBlue} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onRemove} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }} style={{ padding: 4, marginLeft: 2 }}>
              <Ionicons name="close-circle" size={18} color={theme.textMuted} />
            </TouchableOpacity>
          </View>
        ) : trendLatest != null ? (
          <Text style={{ fontSize: 14, fontFamily: 'DMSans_700Bold', color: theme.accentBlue }}>{fmtAxis(trendLatest)}</Text>
        ) : null}
      </View>
      {!collapsed && (
        <>
          {block.form === 'lineTrend' && <LineTrend series={seriesFor(block.dataKey, data)} theme={theme} />}
          {block.form === 'statTiles' && <StatTiles blockId={block.id} data={data} prior={prior} theme={theme} />}
          {block.form === 'macroSplit' && <MacroSplit data={data} theme={theme} />}
          {block.form === 'topFoods' && <TopFoods foodDays={foodDays} theme={theme} />}
          {block.form === 'foodLog' && <FoodLog foodDays={foodDays} theme={theme} />}
          {block.form === 'records' && <Records workoutState={workoutState} theme={theme} />}
          {block.form === 'workoutHistory' && <WorkoutHistory workoutState={workoutState} startKey={startKey} endKey={endKey} theme={theme} />}
        </>
      )}
    </View>
  );
}

const emptyList = (theme: any, msg: string) => <Text style={{ fontSize: 13, color: theme.textMuted, fontFamily: 'DMSans_400Regular' }}>{msg}</Text>;

// Most-logged foods: rank every food by how often it was logged, with a frequency bar + total calories.
function TopFoods({ foodDays, theme }: { foodDays: FoodDay[]; theme: any }) {
  const rows = useMemo(() => {
    const map = new Map<string, { name: string; count: number; cal: number }>();
    for (const d of foodDays) for (const e of d.entries) {
      const name = String(e?.name || '').replace(/\s+/g, ' ').trim();
      if (!name) continue;
      const k = name.toLowerCase();
      const cur = map.get(k) || { name, count: 0, cal: 0 };
      cur.count += 1; cur.cal += Math.round(e?.cal || 0);
      map.set(k, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count || b.cal - a.cal).slice(0, 12);
  }, [foodDays]);
  if (!rows.length) return emptyList(theme, 'No foods logged in this range.');
  const maxCount = rows[0].count;
  return (
    <View style={{ gap: 10 }}>
      {rows.map((r, i) => (
        <View key={r.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
          <Text style={{ width: 16, fontSize: 12, fontFamily: 'DMSans_700Bold', color: theme.textDim, textAlign: 'right' }}>{i + 1}</Text>
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={{ fontSize: 13.5, fontFamily: 'DMSans_600SemiBold', color: theme.textSecondary, marginBottom: 4 }}>{r.name}</Text>
            <View style={{ height: 5, borderRadius: 3, backgroundColor: theme.bgInset, overflow: 'hidden' }}>
              <View style={{ height: '100%', borderRadius: 3, backgroundColor: theme.accentBlue, width: `${Math.max(6, (r.count / maxCount) * 100)}%` }} />
            </View>
          </View>
          <View style={{ alignItems: 'flex-end', minWidth: 58 }}>
            <Text style={{ fontSize: 13, fontFamily: 'DMSans_700Bold', color: theme.textSecondary }}>×{r.count}</Text>
            <Text style={{ fontSize: 10.5, fontFamily: 'DMSans_500Medium', color: theme.textMuted }}>{r.cal.toLocaleString('en-US')} cal</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

// Full food log: every logged item, grouped by day (newest first). Each day collapses; the most recent
// day starts open and the rest collapsed, so a long range stays scannable.
function FoodLog({ foodDays, theme }: { foodDays: FoodDay[]; theme: any }) {
  const days = useMemo(() => [...foodDays].sort((a, b) => b.date.localeCompare(a.date)), [foodDays]);
  const [open, setOpen] = useState<Set<string>>(new Set());
  useEffect(() => { setOpen(new Set(days.length ? [days[0].date] : [])); }, [days.length, days[0]?.date]);
  if (!days.length) return emptyList(theme, 'No foods logged in this range.');
  const CAP = 45;
  const shown = days.slice(0, CAP);
  const toggle = (date: string) => setOpen(prev => { const n = new Set(prev); n.has(date) ? n.delete(date) : n.add(date); return n; });
  return (
    <View style={{ gap: 10 }}>
      {shown.map(d => {
        const total = Math.round(d.entries.reduce((s, e) => s + (e?.cal || 0), 0));
        const isOpen = open.has(d.date);
        return (
          <View key={d.date} style={{ backgroundColor: theme.bgInset, borderWidth: 1, borderColor: theme.borderCard, borderRadius: 10, overflow: 'hidden' }}>
            <TouchableOpacity onPress={() => toggle(d.date)} activeOpacity={0.7} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 }}>
              <Ionicons name={isOpen ? 'chevron-down' : 'chevron-forward'} size={14} color={theme.textMuted} />
              <Text style={{ flex: 1, fontSize: 12.5, fontFamily: 'DMSans_700Bold', color: theme.textSecondary }}>{FULL_DATE(d.date)}</Text>
              <Text style={{ fontSize: 10.5, fontFamily: 'DMSans_500Medium', color: theme.textMuted }}>{d.entries.length} item{d.entries.length === 1 ? '' : 's'}</Text>
              <Text style={{ fontSize: 12, fontFamily: 'DMSans_700Bold', color: theme.accentBlue }}>{total.toLocaleString('en-US')} cal</Text>
            </TouchableOpacity>
            {isOpen && (
              <View style={{ gap: 5, paddingHorizontal: 12, paddingBottom: 12 }}>
                {d.entries.map((e, i) => (
                  <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                    <Text numberOfLines={1} style={{ flex: 1, fontSize: 12.5, fontFamily: 'DMSans_400Regular', color: theme.textSecondary }}>{String(e?.name || 'Food')}</Text>
                    <Text style={{ fontSize: 12, fontFamily: 'DMSans_500Medium', color: theme.textMuted, fontVariant: ['tabular-nums'] }}>{Math.round(e?.cal || 0)}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        );
      })}
      {days.length > CAP && (
        <Text style={{ fontSize: 11.5, color: theme.textDim, textAlign: 'center', fontFamily: 'DMSans_400Regular', marginTop: 2 }}>+{days.length - CAP} earlier days. Narrow the range to see them.</Text>
      )}
    </View>
  );
}

// All-time lift records (heaviest set + est. 1-rep max per lift), most recent first. Reads the PR engine's
// banked records from pj_workout_state.prs.
function Records({ workoutState, theme }: { workoutState: any; theme: any }) {
  const rows = useMemo(() => {
    const prs = workoutState?.prs || {};
    const setLogs = workoutState?.setLogs || {};
    const programs = workoutState?.programs || {};
    const template = workoutState?.weeklyTemplate || {};
    const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    // Same resolver the workout screen's All-PRs list uses.
    const resolveDay = (dk: string) => {
      const wd = WEEKDAY[new Date(dk + 'T12:00:00').getDay()];
      return (programs[dk] || template[wd])?.exercises || [];
    };
    return Object.values(prs)
      // Only records still backed by SURVIVING logged history -- filters out ghost PRs from lifts that
      // were deleted (matches app/workout-library.tsx). A protected floor otherwise keeps them forever.
      .filter((p: any) => p && (p.bestWeight || p.bestE1RM) && liftSessionHistory(p.name, setLogs, resolveDay).length > 0)
      .map((p: any) => ({ name: String(p.name || 'Lift'), bw: p.bestWeight, e1: p.bestE1RM, date: (p.bestWeight?.dateKey || p.bestE1RM?.dateKey || '') }))
      .sort((a: any, b: any) => b.date.localeCompare(a.date));
  }, [workoutState]);
  if (!rows.length) return emptyList(theme, 'No lift records yet. Log a weighted set to start.');
  return (
    <View style={{ gap: 9 }}>
      {rows.map((r: any, i: number) => (
        <View key={r.name + i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: i === 0 ? 0 : 0.5, borderTopColor: theme.borderCard, paddingTop: i === 0 ? 0 : 9 }}>
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={{ fontSize: 13.5, fontFamily: 'DMSans_700Bold', color: theme.textSecondary }}>{r.name}</Text>
            {r.date ? <Text style={{ fontSize: 10.5, fontFamily: 'DMSans_500Medium', color: theme.textMuted, marginTop: 1 }}>{FULL_DATE(r.date)}</Text> : null}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 13, fontFamily: 'DMSans_700Bold', color: theme.textSecondary }}>{r.bw ? `${r.bw.value} lb × ${r.bw.reps}` : '—'}</Text>
            {r.e1 ? <Text style={{ fontSize: 10.5, fontFamily: 'DMSans_500Medium', color: theme.textMuted }}>Est. 1RM {r.e1.value} lb</Text> : null}
          </View>
        </View>
      ))}
    </View>
  );
}

// Cardio detail line: duration · distance · calories (only the parts that are present).
function cardioDetail(it: any): string {
  const parts: string[] = [];
  if (it.duration) parts.push(String(it.duration));
  const dist = parseFloat(it.distance); if (!isNaN(dist) && dist > 0) parts.push(`${it.distance} mi`);
  const cal = parseFloat(it.calories); if (!isNaN(cal) && cal > 0) parts.push(`${Math.round(cal)} cal`);
  return parts.join(' · ') || 'done';
}

// Every workout in the range, day by day (newest first), collapsible with the most recent open. Shows
// focus, day volume, PR count, and each exercise's top set (or cardio detail).
function WorkoutHistory({ workoutState, startKey, endKey, theme }: { workoutState: any; startKey: string; endKey: string; theme: any }) {
  const days = useMemo(() => {
    const programs = workoutState?.programs || {};
    const setLogs = workoutState?.setLogs || {};
    const checks = workoutState?.checks || {};
    const prHits = workoutState?.prHitsByDay || {};
    const out: any[] = [];
    for (const k of Object.keys(programs)) {
      if (k < startKey || k > endKey) continue;
      const prog = programs[k];
      const exs = Array.isArray(prog?.exercises) ? prog.exercises : [];
      const dc = checks[k] || {}; const dl = setLogs[k] || {};
      const done = exs.filter((e: any) => dc[e.id]);
      if (!done.length) continue;
      let volume = 0;
      const items = done.map((e: any) => {
        const sets = Array.isArray(dl[e.id]) ? dl[e.id] : [];
        const doneSets = sets.filter((s: any) => s.done);
        let top: { w: number; r: number } | null = null;
        for (const s of doneSets) { const w = s.weight || 0, r = s.reps || 0; volume += w * r; if (w > 0 && r > 0 && (!top || w > top.w)) top = { w, r }; }
        return { name: String(e.name || 'Exercise'), isCardio: !!e.isCardio, setCount: doneSets.length, top, duration: e.duration, distance: e.distance, calories: e.calories };
      });
      out.push({ date: k, focus: String(prog.focus || 'Workout'), volume: Math.round(volume), prCount: Object.keys(prHits[k] || {}).length, items });
    }
    return out.sort((a, b) => b.date.localeCompare(a.date));
  }, [workoutState, startKey, endKey]);
  const [open, setOpen] = useState<Set<string>>(new Set());
  useEffect(() => { setOpen(new Set(days.length ? [days[0].date] : [])); }, [days.length, days[0]?.date]);
  if (!days.length) return emptyList(theme, 'No workouts logged in this range.');
  const CAP = 45;
  const shown = days.slice(0, CAP);
  const toggle = (date: string) => setOpen(prev => { const n = new Set(prev); n.has(date) ? n.delete(date) : n.add(date); return n; });
  return (
    <View style={{ gap: 10 }}>
      {shown.map(d => {
        const isOpen = open.has(d.date);
        return (
          <View key={d.date} style={{ backgroundColor: theme.bgInset, borderWidth: 1, borderColor: theme.borderCard, borderRadius: 10, overflow: 'hidden' }}>
            <TouchableOpacity onPress={() => toggle(d.date)} activeOpacity={0.7} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 }}>
              <Ionicons name={isOpen ? 'chevron-down' : 'chevron-forward'} size={14} color={theme.textMuted} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12.5, fontFamily: 'DMSans_700Bold', color: theme.textSecondary }}>{FULL_DATE(d.date)}</Text>
                <Text numberOfLines={1} style={{ fontSize: 10.5, fontFamily: 'DMSans_500Medium', color: theme.textMuted, marginTop: 1 }}>{d.focus}</Text>
              </View>
              {d.prCount > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(212,134,10,0.14)', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 }}>
                  <Ionicons name="trophy" size={10} color={theme.accentAmber} />
                  <Text style={{ fontSize: 10.5, fontFamily: 'DMSans_700Bold', color: theme.accentAmber }}>{d.prCount}</Text>
                </View>
              )}
              {d.volume > 0 && <Text style={{ fontSize: 11.5, fontFamily: 'DMSans_700Bold', color: theme.accentBlue }}>{d.volume.toLocaleString('en-US')} lb</Text>}
            </TouchableOpacity>
            {isOpen && (
              <View style={{ gap: 5, paddingHorizontal: 12, paddingBottom: 12 }}>
                {d.items.map((it: any, i: number) => (
                  <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                    <Text numberOfLines={1} style={{ flex: 1, fontSize: 12.5, fontFamily: 'DMSans_400Regular', color: theme.textSecondary }}>{it.name}</Text>
                    <Text style={{ fontSize: 11.5, fontFamily: 'DMSans_500Medium', color: theme.textMuted }}>
                      {it.isCardio ? cardioDetail(it) : it.top ? `${it.top.w} × ${it.top.r}${it.setCount > 1 ? ` · ${it.setCount} sets` : ''}` : `${it.setCount || 1} set${(it.setCount || 1) === 1 ? '' : 's'}`}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        );
      })}
      {days.length > CAP && <Text style={{ fontSize: 11.5, color: theme.textDim, textAlign: 'center', fontFamily: 'DMSans_400Regular', marginTop: 2 }}>+{days.length - CAP} earlier workouts. Narrow the range to see them.</Text>}
    </View>
  );
}

function seriesFor(dataKey: string | undefined, data: TrendData): { date: string; value: number }[] {
  switch (dataKey) {
    case 'weight': return data.weight;
    case 'steps': return data.steps;
    case 'activeCals': return data.activeCal;
    case 'exerciseMinutes': return data.exerciseMinutes;
    case 'vo2Max': return data.vo2Max;
    case 'calories': return data.cal.map(d => ({ date: d.date, value: d.cal }));
    case 'water': return data.water;
    case 'netCal': return data.netCal;
    case 'fiber': return data.fiber;
    case 'sodium': return data.sodium;
    case 'sleep': return data.sleep;
    case 'sleepScore': return data.sleepScore;
    case 'hrv': return data.hrv;
    case 'restingHR': return data.restingHR;
    case 'respiratoryRate': return data.respiratoryRate;
    case 'bloodOxygen': return data.bloodOxygen;
    case 'recoveryScore': return data.recoveryScore;
    case 'effortScore': return data.effortScore;
    default: return [];
  }
}

// Split a double-window TrendData into the current period (>= startKey) and the one before it.
const ARRAY_KEYS: (keyof TrendData)[] = ['weight', 'cal', 'steps', 'activeCal', 'sleep', 'macro', 'workoutDay', 'water', 'netCal', 'sleepScore', 'sleepStages', 'restingHR', 'respiratoryRate', 'bloodOxygen', 'recoveryScore', 'hrv', 'vo2Max', 'cardioRecovery', 'exerciseMinutes', 'fiber', 'sodium', 'cholesterol', 'saturatedFat', 'sugarAlcohols', 'effortScore'];
function splitTrend(full: TrendData, startKey: string): { cur: TrendData; prev: TrendData } {
  const cur: any = { ...EMPTY_TREND_DATA };
  const prev: any = { ...EMPTY_TREND_DATA };
  for (const k of ARRAY_KEYS) {
    const arr = (full as any)[k] as { date: string }[];
    cur[k] = arr.filter(d => d.date >= startKey);
    prev[k] = arr.filter(d => d.date < startKey);
  }
  cur.excludedCounts = full.excludedCounts; prev.excludedCounts = full.excludedCounts;
  cur.nutrients = full.nutrients; prev.nutrients = full.nutrients;
  return { cur: cur as TrendData, prev: prev as TrendData };
}

const fmtHrs = (v: number) => { const h = Math.floor(v); const m = Math.round((v - h) * 60); return `${h}:${String(m).padStart(2, '0')}`; };

// Stat-tiles form: number-forward "headline" numbers + a trend arrow vs the prior period.
type TileSpec = { label: string; pick: (d: TrendData) => number[]; fmt: (v: number) => string; better: 'up' | 'down' | 'none' };
const HEADLINES: Record<string, TileSpec[]> = {
  nutrition_headline: [
    { label: 'Avg Calories', pick: d => d.cal.map(x => x.cal).filter(v => v > 0), fmt: v => Math.round(v).toLocaleString('en-US'), better: 'none' },
    { label: 'Avg Protein', pick: d => d.macro.map(x => x.protein).filter(v => v > 0), fmt: v => Math.round(v) + ' g', better: 'up' },
    { label: 'Avg Carbs', pick: d => d.macro.map(x => x.carbs).filter(v => v > 0), fmt: v => Math.round(v) + ' g', better: 'none' },
    { label: 'Avg Fat', pick: d => d.macro.map(x => x.fat).filter(v => v > 0), fmt: v => Math.round(v) + ' g', better: 'none' },
  ],
  activity_headline: [
    { label: 'Avg Steps', pick: d => d.steps.map(x => x.value).filter(v => v > 0), fmt: v => Math.round(v).toLocaleString('en-US'), better: 'up' },
    { label: 'Avg Active Cal', pick: d => d.activeCal.map(x => x.value).filter(v => v > 0), fmt: v => Math.round(v).toLocaleString('en-US'), better: 'up' },
    { label: 'Avg Exercise', pick: d => d.exerciseMinutes.map(x => x.value).filter(v => v > 0), fmt: v => Math.round(v) + ' min', better: 'up' },
  ],
  sleep_headline: [
    { label: 'Avg Sleep', pick: d => d.sleep.map(x => x.value).filter(v => v > 0), fmt: v => fmtHrs(v), better: 'up' },
    { label: 'Avg Sleep Score', pick: d => d.sleepScore.map(x => x.value).filter(v => v > 0), fmt: v => Math.round(v).toString(), better: 'up' },
    { label: 'Avg HRV', pick: d => d.hrv.map(x => x.value).filter(v => v > 0), fmt: v => Math.round(v) + ' ms', better: 'up' },
    { label: 'Avg Resting HR', pick: d => d.restingHR.map(x => x.value).filter(v => v > 0), fmt: v => Math.round(v) + ' bpm', better: 'down' },
  ],
};

function DeltaChip({ cur, prev, better, theme }: { cur: number; prev: number; better: 'up' | 'down' | 'none'; theme: any }) {
  if (!isFinite(prev) || prev === 0 || !isFinite(cur)) return null;
  const pct = Math.round(((cur - prev) / Math.abs(prev)) * 100);
  if (pct === 0) return <Text style={{ fontSize: 10.5, fontFamily: 'DMSans_700Bold', color: theme.textDim, marginTop: 6 }}>No change</Text>;
  const up = pct > 0;
  const good = better === 'none' ? null : (better === 'up') === up;
  const color = good === null ? theme.textMuted : good ? '#0d9268' : '#cc3333';
  const bg = good === null ? theme.bgCard : good ? 'rgba(13,146,104,0.13)' : 'rgba(204,51,51,0.13)';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: bg, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2, marginTop: 7, gap: 3 }}>
      <Text style={{ fontSize: 10, color, fontFamily: 'DMSans_700Bold' }}>{up ? '▲' : '▼'}</Text>
      <Text style={{ fontSize: 11, color, fontFamily: 'DMSans_700Bold' }}>{Math.abs(pct)}%</Text>
    </View>
  );
}

function StatTiles({ blockId, data, prior, theme }: { blockId: string; data: TrendData; prior: TrendData; theme: any }) {
  const specs = HEADLINES[blockId] || [];
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {specs.map(spec => {
        const cv = spec.pick(data); const pv = spec.pick(prior);
        const cur = cv.length ? avg(cv) : null;
        const prev = pv.length ? avg(pv) : null;
        return (
          <View key={spec.label} style={{ width: '47.6%', flexGrow: 1, backgroundColor: theme.bgInset, borderWidth: 1, borderColor: theme.borderCard, borderRadius: 10, paddingVertical: 11, paddingHorizontal: 12 }}>
            <Text style={{ fontSize: 8.5, letterSpacing: 1.3, textTransform: 'uppercase', fontFamily: 'DMSans_700Bold', color: theme.textMuted, marginBottom: 5 }}>{spec.label}</Text>
            <Text style={{ fontSize: 20, fontFamily: 'DMSans_700Bold', color: theme.textSecondary }}>{cur != null ? spec.fmt(cur) : '—'}</Text>
            {cur != null && prev != null && <DeltaChip cur={cur} prev={prev} better={spec.better} theme={theme} />}
          </View>
        );
      })}
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

// "Nice number" axis: rounds a data range to clean tick values (185/190/195, not 187.3).
function niceNum(range: number, round: boolean): number {
  const exp = Math.floor(Math.log10(range));
  const f = range / Math.pow(10, exp);
  let nf: number;
  if (round) nf = f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10;
  else nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return nf * Math.pow(10, exp);
}
function niceScale(dmin: number, dmax: number, count: number): { ticks: number[]; niceMin: number; niceMax: number } {
  const range = niceNum(Math.max(dmax - dmin, 1e-6), false);
  const step = niceNum(range / Math.max(1, count - 1), true);
  const niceMin = Math.floor(dmin / step) * step;
  const niceMax = Math.ceil(dmax / step) * step;
  const ticks: number[] = [];
  for (let v = niceMin; v <= niceMax + step * 0.5; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  return { ticks, niceMin, niceMax };
}
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtDateKey = (key: string) => { const [, m, d] = key.split('-'); return `${MONTHS_SHORT[(+m) - 1]} ${+d}`; };
const fmtAxis = (v: number) => (Number.isInteger(v) ? v.toLocaleString('en-US') : (Math.round(v * 10) / 10).toString());
// Latest valid value in a series (for the trend block's header value).
function latestOf(series: { value: number }[]): number | null {
  for (let i = series.length - 1; i >= 0; i--) { const v = series[i]?.value; if (typeof v === 'number' && !isNaN(v) && v > 0) return v; }
  return null;
}

// Line-trend form: gradient fill, rounded y-ticks, x-axis date labels, and an endpoint value badge.
function LineTrend({ series, theme }: { series: { date: string; value: number }[]; theme: any }) {
  const points = useMemo(() => series.filter(d => typeof d.value === 'number' && !isNaN(d.value) && d.value > 0), [series]);
  if (points.length < 2) {
    return <Text style={{ fontSize: 13, color: theme.textMuted, fontFamily: 'DMSans_400Regular' }}>Not enough data in this range yet.</Text>;
  }
  const W = 320, H = 172, padL = 44, padR = 14, padT = 16, padB = 30;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const vals = points.map(p => p.value);
  let dmin = Math.min(...vals), dmax = Math.max(...vals);
  if (dmin === dmax) { dmin -= 1; dmax += 1; }
  const { ticks, niceMin, niceMax } = niceScale(dmin, dmax, 4);
  const min = niceMin, max = niceMax > niceMin ? niceMax : niceMin + 1;
  const X = (i: number) => padL + (i / (points.length - 1)) * plotW;
  const Y = (v: number) => padT + (1 - (v - min) / (max - min)) * plotH;
  const accent = theme.accentBlue;
  const lastIdx = points.length - 1;

  let dLine = '';
  points.forEach((p, i) => { dLine += (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(p.value).toFixed(1) + ' '; });
  const dArea = dLine + `L${X(lastIdx).toFixed(1)} ${padT + plotH} L${X(0).toFixed(1)} ${padT + plotH} Z`;
  const xIdx = Array.from(new Set([0, Math.round(lastIdx / 3), Math.round((2 * lastIdx) / 3), lastIdx]));

  return (
    <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
      <Defs>
        <SvgGradient id="lt" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={accent} stopOpacity={0.26} />
          <Stop offset="0.65" stopColor={accent} stopOpacity={0.06} />
          <Stop offset="1" stopColor={accent} stopOpacity={0} />
        </SvgGradient>
      </Defs>
      {/* y gridlines + rounded labels */}
      {ticks.map((t, i) => (
        <React.Fragment key={`y${i}`}>
          <SvgLine x1={padL} y1={Y(t)} x2={W - padR} y2={Y(t)} stroke={theme.borderCard} strokeWidth={1} />
          <SvgText x={padL - 6} y={Y(t) + 3.2} fontSize={9} fill={theme.textDim} textAnchor="end" fontFamily="DMSans_600SemiBold">{fmtAxis(t)}</SvgText>
        </React.Fragment>
      ))}
      <Path d={dArea} fill="url(#lt)" />
      <Path d={dLine} fill="none" stroke={accent} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
      {/* x-axis date labels */}
      {xIdx.map((i, k) => (
        <SvgText key={`x${k}`} x={X(i)} y={H - 9} fontSize={9} fill={theme.textDim} fontFamily="DMSans_600SemiBold"
          textAnchor={i === 0 ? 'start' : i === lastIdx ? 'end' : 'middle'}>{fmtDateKey(points[i].date)}</SvgText>
      ))}
      {/* endpoint marker (latest value now lives in the card header, not floating in the chart) */}
      <Circle cx={X(lastIdx)} cy={Y(points[lastIdx].value)} r={4} fill={accent} stroke={theme.bgCard} strokeWidth={2} />
    </Svg>
  );
}
