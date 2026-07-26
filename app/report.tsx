// app/report.tsx
// A single Custom Report: renders live from the app's existing data (never a snapshot) and lets the user
// pick a date range + assemble blocks from the library. Config persists to pj_reports via utils/reports.
// Renderers are purpose-built to match the approved mockup (gradient trend lines, stat tiles, macro bar).

import { Ionicons } from '@/components/AppIcons';
import { Text, TextInput } from '@/components/AppText';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Defs, LinearGradient as SvgGradient, Stop, Line as SvgLine, Circle, Text as SvgText } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import ButtonShine from '../components/ButtonShine';
import GradientNumber from '../components/GradientNumber';
import BackgroundLayers from '../components/BackgroundLayers';
import PrimaryCTA from '../components/PrimaryCTA';
import { useTheme } from '../theme';
import { useToast } from '../components/Toast';
import { fetchTrendData, TrendData, EMPTY_TREND_DATA } from '../utils/statsData';
import { liftSessionHistory } from '../utils/liftPR';
import { weightUnitLabel, formatHold } from '../workoutData';
import { loadMealSlots, getMealDisplayName } from '../utils/mealSlots';
import { loadMeasurements, loadBodyMeasureSettings, toDisplay, unitLabel, MEASURE_FIELDS, type MeasurementUnit } from '../utils/bodyMeasurements';
import { ACHIEVEMENTS, loadAchievements, type AchievementsStore } from '../achievementData';
import { loadChallengeHistory, computeChallengeProgress, challengeTitle } from '../utils/challenges';
import { loadReports, saveReport, newReportId, resolveRange, RANGE_LABELS, Report, ReportRangePreset } from '../utils/reports';
import { REPORT_CHAPTERS, REPORT_BLOCKS, blocksForChapter, getReportBlock, ReportBlock, REPORT_TEMPLATES, ReportTemplate } from '../utils/reportBlocks';
import { Type } from '../typography';

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
  const [mealCtx, setMealCtx] = useState<{ slots: any[]; cache: any }>({ slots: [], cache: {} });
  const [bodyCtx, setBodyCtx] = useState<{ entries: any[]; unit: MeasurementUnit }>({ entries: [], unit: 'in' });
  const [achieveStore, setAchieveStore] = useState<AchievementsStore>({});
  const [challengeRows, setChallengeRows] = useState<{ id: string; title: string; startKey: string; endKey: string; won: boolean; tier: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);
  const nameRef = useRef<TextInput>(null);
  const shotRef = useRef<View>(null);

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
      // A fresh empty report shows the template chooser first (not the full picker) to avoid overwhelm.
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
        let mc = { slots: [] as any[], cache: {} as any };
        try { const { mealSlots, slotNameCache } = await loadMealSlots(); mc = { slots: mealSlots, cache: slotNameCache }; } catch {}
        let bc = { entries: [] as any[], unit: 'in' as MeasurementUnit };
        try { const be = await loadMeasurements(); const bs = await loadBodyMeasureSettings(); bc = { entries: be, unit: bs.unit }; } catch {}
        let ach: AchievementsStore = {};
        try { ach = await loadAchievements(); } catch {}
        let chRows: { id: string; title: string; startKey: string; endKey: string; won: boolean; tier: string }[] = [];
        try {
          const hist = await loadChallengeHistory();
          chRows = await Promise.all(hist.map(async ch => {
            let won = false, tier = 'partial';
            try { const p = await computeChallengeProgress(ch); won = p.won; tier = p.tier; } catch {}
            return { id: ch.id, title: challengeTitle(ch), startKey: ch.startKey, endKey: ch.endKey, won, tier };
          }));
        } catch {}
        if (!cancelled) { setData(cur); setPrior(prev); setFoodDays(fd); setWorkoutState(ws); setMealCtx(mc); setBodyCtx(bc); setAchieveStore(ach); setChallengeRows(chRows); }
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

  // Apply a template's block set; auto-name the report if it's still untitled.
  const applyTemplate = (tpl: ReportTemplate) => {
    if (!report) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    const name = (!report.name.trim() || report.name === 'Untitled Report') ? tpl.name : report.name;
    const range = tpl.range ? { preset: tpl.range } : report.range;
    persist({ ...report, name, range, blockIds: tpl.blockIds.filter(getReportBlock) });
  };

  const rename = (name: string) => { if (report) setReport({ ...report, name }); };
  const commitName = () => { if (report) persist({ ...report, name: report.name.trim() || 'Untitled Report' }); };

  // Export: capture the report document region as an image and hand it to the share sheet.
  const onExport = async () => {
    if (exporting) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    setExporting(true);
    try {
      // Probe for the native module WITHOUT loading view-shot. view-shot calls TurboModuleRegistry
      // .getEnforcing('RNViewShot') at import, which THROWS on a build that predates it -- and in dev
      // that throw redboxes even inside a try/catch (Metro reports module-load errors itself). get()
      // returns null instead of throwing, so we can check first and never require the missing module.
      let hasNative = false;
      try { hasNative = !!(require('react-native').TurboModuleRegistry?.get?.('RNViewShot')); } catch { hasNative = false; }
      if (!hasNative) {
        showToast('Update needed', 'Export needs the latest app build. Rebuild to enable it.', 'error');
        setExporting(false);
        return;
      }
      const captureRef = require('react-native-view-shot').captureRef;
      const Sharing = require('expo-sharing');
      if (libraryOpen) setLibraryOpen(false); // don't capture edit controls
      await new Promise(r => setTimeout(r, 60)); // let any layout settle
      const uri = await captureRef(shotRef, { format: 'png', quality: 0.98, result: 'tmpfile' });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share report', UTI: 'public.png' });
      } else {
        showToast('Sharing unavailable', 'Export is not available on this device.', 'error');
      }
    } catch (e) {
      showToast('Export failed', 'Could not create the report image.', 'error');
    } finally {
      setExporting(false);
    }
  };

  if (!report) {
    return <View style={{ flex: 1, backgroundColor: theme.bgPrimary, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={theme.accentBlue} /></View>;
  }

  const activeBlocks = report.blockIds.map(getReportBlock).filter(Boolean) as ReportBlock[];
  const rangeBounds = resolveRange(report.range);
  const genDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <View style={{ flex: 1, backgroundColor: theme.bgPrimary }}>
      <BackgroundLayers />
      {/* Header */}
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 0.5, borderBottomColor: theme.borderCard }}>
        <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); router.back(); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={26} color={theme.textSecondary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        {activeBlocks.length > 0 && (
          <TouchableOpacity onPress={onExport} disabled={exporting} hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }} style={{ padding: 4 }}>
            {exporting ? <ActivityIndicator size="small" color={theme.accentBlue} /> : <Ionicons name="share-social" size={20} color={theme.accentBlue} />}
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); nameRef.current?.focus(); }} hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }} style={{ padding: 4 }}>
          <Ionicons name="pencil" size={17} color={theme.textMuted} />
        </TouchableOpacity>
      </View>

      {/* The report-name field sits in this scroll with nothing else handling the keyboard, so iOS's
          own inset adjustment does the work. persistTaps so the first tap after typing hits whatever
          you aimed at instead of being spent dismissing the keyboard. */}
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 110 }} showsVerticalScrollIndicator={false} automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled">
        {/* Range chips */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 14, marginBottom: 4 }}>
          {PRESETS.map(p => {
            const sel = report.range.preset === p;
            return (
              <TouchableOpacity key={p} onPress={() => setRange(p)}
                style={{ backgroundColor: sel ? theme.accentBlueBgOpaque : theme.bgCard, borderWidth: 1, borderColor: sel ? theme.accentBlueBorder : theme.borderCard, borderRadius: 16, paddingHorizontal: 13, paddingVertical: 6 }}>
                {sel && <ButtonShine radius={16} />}
                <Text style={{ fontSize: 12, fontFamily: Type.uiSemibold, color: sel ? theme.accentBlue : theme.textMuted }}>{RANGE_LABELS[p]}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Name field, empty-report state ONLY. The pencil up top focuses nameRef, but the real name input
            normally lives inside the exportable document card below -- which does not exist yet until the
            report has at least one block. Without this, the pencil was a dead button on every report from
            the moment "New Report" was tapped until the first block landed. Same ref, same handlers as the
            document-card input -- only one of the two is ever mounted at once. */}
        {activeBlocks.length === 0 && (
          <TextInput ref={nameRef} value={report.name} onChangeText={rename} onBlur={commitName} placeholder="Report name" placeholderTextColor={theme.textDim}
            style={{ fontSize: 20, fontFamily: Type.display, letterSpacing: 0.3, color: theme.textSecondary, padding: 0, marginTop: 10, marginBottom: 4 }} />
        )}

        {/* Live indicator -- a report re-renders from current data, so numbers move as you keep logging. */}
        {activeBlocks.length > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 9, marginBottom: 2 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: theme.accentGreen }} />
            <Text style={{ fontSize: 11, fontFamily: Type.uiMedium, color: theme.textMuted }}>Live: these numbers update as you log. Export to save a snapshot.</Text>
          </View>
        )}

        {loading ? (
          <View style={{ paddingVertical: 50, alignItems: 'center' }}><ActivityIndicator color={theme.accentBlue} /></View>
        ) : activeBlocks.length > 0 ? (
          <View ref={shotRef} collapsable={false} style={{ backgroundColor: theme.bgCard, borderWidth: 0.5, borderColor: theme.borderCard, borderTopWidth: 1.5, borderTopColor: theme.accentBlueRaw, borderRadius: 14, padding: 16, marginTop: 14, shadowColor: theme.cardShadow, shadowOpacity: theme.cardShadowOpacity, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 6 }}>
            {/* Document header -- captured into the export image */}
            <View style={{ marginBottom: 4 }}>
              <TextInput ref={nameRef} value={report.name} onChangeText={rename} onBlur={commitName} placeholder="Report name" placeholderTextColor={theme.textDim}
                style={{ fontSize: 26, fontFamily: Type.display, letterSpacing: 0.3, color: theme.textSecondary, padding: 0 }} />
              <Text style={{ fontSize: 11.5, fontFamily: Type.uiSemibold, color: theme.textMuted, marginTop: 3 }}>
                {RANGE_LABELS[report.range.preset]} · Generated {genDate} · GoodForge
              </Text>
            </View>
            <View>
              {activeBlocks.map((b, i) => (
                <BlockCard key={b.id} block={b} data={data} prior={prior} foodDays={foodDays} workoutState={workoutState}
                  mealSlots={mealCtx.slots} slotCache={mealCtx.cache} bodyEntries={bodyCtx.entries} bodyUnit={bodyCtx.unit}
                  achieveStore={achieveStore} challengeRows={challengeRows} startKey={rangeBounds.startKey} endKey={rangeBounds.endKey} theme={theme}
                  collapsed={collapsed.has(b.id)} onToggle={() => toggleCollapse(b.id)}
                  editMode={libraryOpen} isFirst={i === 0} isLast={i === activeBlocks.length - 1}
                  onUp={() => moveBlock(b.id, -1)} onDown={() => moveBlock(b.id, 1)} onRemove={() => toggleBlock(b.id)} />
              ))}
            </View>
            <Text style={{ fontSize: 11, color: theme.textMuted, textAlign: 'center', marginTop: 16, paddingTop: 14, borderTopWidth: 0.5, borderTopColor: theme.borderCard, fontFamily: Type.ui }}>For informational purposes only. Not medical advice.</Text>
          </View>
        ) : !libraryOpen ? (
          <TemplateChooser onPick={applyTemplate} onCustom={() => setLibraryOpen(true)} theme={theme} />
        ) : null}

        {/* Add / Done Blocks toggle. Hidden while the template chooser is up (its "Build your own" card
            covers that), shown once the report has blocks or the picker is already open. */}
        {!loading && (activeBlocks.length > 0 || libraryOpen) && (
          <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Medium); setLibraryOpen(o => !o); }}
            style={{ marginTop: 16, borderRadius: 12, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.accentBlueBgOpaque, borderWidth: 1, borderColor: theme.accentBlueBorder }}>
            {/* OPAQUE tint + shine: this sits on the PAGE, not a card, so the translucent accentBlueBg showed
                the bottom glow through it. Same fix as Stats' VIEW ALL ACHIEVEMENTS. */}
            <ButtonShine radius={12} />
            <Ionicons name={libraryOpen ? 'checkmark' : 'add'} size={18} color={theme.accentBlue} />
            <Text style={{ fontSize: 14, fontFamily: Type.uiBold, color: theme.accentBlue }}>{libraryOpen ? 'Done Adding Blocks' : 'Add Blocks'}</Text>
          </TouchableOpacity>
        )}

        {/* Block library */}
        {libraryOpen && (
          <View style={{ marginTop: 16, borderWidth: 1.5, borderStyle: 'dashed', borderColor: theme.borderCard, borderRadius: 12, padding: 14, backgroundColor: theme.bgCard }}>
            <Text style={{ fontSize: 13, fontFamily: Type.uiBold, color: theme.textSecondary, marginBottom: 3 }}>Block library</Text>
            <Text style={{ fontSize: 12, fontFamily: Type.ui, color: theme.textMuted, marginBottom: 12 }}>Add what you care about, skip what you don't. Every block is designed to look premium.</Text>
            {REPORT_CHAPTERS.map(ch => {
              const blocks = blocksForChapter(ch.key);
              if (blocks.length === 0) return null;
              return (
                <View key={ch.key} style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 7 }}>
                    <Ionicons name={ch.icon as any} size={14} color={theme.accentBlue} />
                    <Text style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: Type.uiBold, color: theme.textMuted }}>{ch.label}</Text>
                  </View>
                  <View style={{ gap: 7 }}>
                    {blocks.map(b => {
                      const added = report.blockIds.includes(b.id);
                      return (
                        <View key={b.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: theme.bgInset, borderWidth: 1, borderColor: theme.borderCard, borderRadius: 10, padding: 10 }}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13, fontFamily: Type.uiBold, color: theme.textSecondary }}>{b.title}</Text>
                            <Text style={{ fontSize: 11, fontFamily: Type.ui, color: theme.textMuted, marginTop: 1 }}>{b.desc}</Text>
                          </View>
                          <TouchableOpacity onPress={() => toggleBlock(b.id)}
                            style={{ borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: added ? 'transparent' : theme.accentBlue, borderWidth: added ? 1 : 0, borderColor: theme.accentBlueBorder }}>
                            {!added && <ButtonShine radius={999} />}
                            <Text style={{ fontSize: 11.5, fontFamily: Type.uiBold, color: added ? theme.accentBlue : '#fff' }}>{added ? '✓ Added' : '+ Add'}</Text>
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
  mealSlots: any[]; slotCache: any; bodyEntries: any[]; bodyUnit: MeasurementUnit; achieveStore: AchievementsStore;
  challengeRows: { id: string; title: string; startKey: string; endKey: string; won: boolean; tier: string }[];
  startKey: string; endKey: string; theme: any;
  collapsed: boolean; onToggle: () => void; editMode: boolean; isFirst: boolean; isLast: boolean;
  onUp: () => void; onDown: () => void; onRemove: () => void;
}
function BlockCard({ block, data, prior, foodDays, workoutState, mealSlots, slotCache, bodyEntries, bodyUnit, achieveStore, challengeRows, startKey, endKey, theme, collapsed, onToggle, editMode, isFirst, isLast, onUp, onDown, onRemove }: BlockCardProps) {
  // For a trend block, surface its latest value in the header (clean) instead of floating it in the chart.
  const trendLatest = block.form === 'lineTrend' ? latestOf(seriesFor(block.dataKey, data)) : null;
  return (
    <View style={{ paddingTop: 16, paddingBottom: isLast ? 0 : 16, borderBottomWidth: isLast ? 0 : 0.5, borderBottomColor: theme.borderCard }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: collapsed ? 0 : 12 }}>
        <TouchableOpacity onPress={onToggle} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
          <Ionicons name={collapsed ? 'chevron-forward' : 'chevron-down'} size={15} color={theme.textMuted} />
          <Text style={{ fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', fontFamily: Type.uiBold, color: theme.textMuted }}>{block.title}</Text>
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
          <GradientNumber value={fmtAxis(trendLatest)} color={theme.accentBlue} style={{ fontSize: 14, fontFamily: Type.uiBold }} />
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
          {block.form === 'caloriesByMeal' && <CaloriesByMeal foodDays={foodDays} mealSlots={mealSlots} slotCache={slotCache} theme={theme} />}
          {block.form === 'dayExtremes' && <DayExtremes foodDays={foodDays} theme={theme} />}
          {block.form === 'exerciseFrequency' && <ExerciseFrequency workoutState={workoutState} startKey={startKey} endKey={endKey} theme={theme} />}
          {block.form === 'sleepStages' && <SleepStages data={data} theme={theme} />}
          {block.form === 'bodyMeasurements' && <BodyMeasurements entries={bodyEntries} unit={bodyUnit} startKey={startKey} endKey={endKey} theme={theme} />}
          {block.form === 'achievements' && <AchievementsEarned store={achieveStore} startKey={startKey} endKey={endKey} theme={theme} />}
          {block.form === 'challengeHistory' && <ChallengeHistory rows={challengeRows} startKey={startKey} endKey={endKey} theme={theme} />}
        </>
      )}
    </View>
  );
}

const emptyList = (theme: any, msg: string) => <Text style={{ fontSize: 13, color: theme.textMuted, fontFamily: Type.ui }}>{msg}</Text>;

// New-report front door: pick a ready-made template or build your own. Solves the "too many blocks to
// choose from" overwhelm -- most users tap a template and are done.
function TemplateChooser({ onPick, onCustom, theme }: { onPick: (t: ReportTemplate) => void; onCustom: () => void; theme: any }) {
  return (
    <View style={{ marginTop: 18 }}>
      <GradientNumber value="Start from a template" color={theme.textSecondary} style={{ fontSize: 15, fontFamily: Type.uiBold, marginBottom: 3 }} />
      <Text style={{ fontSize: 12.5, fontFamily: Type.ui, color: theme.textMuted, marginBottom: 14 }}>Pick a ready-made report, or build your own from scratch.</Text>
      <View style={{ gap: 10 }}>
        {REPORT_TEMPLATES.map(t => (
          <TouchableOpacity key={t.id} activeOpacity={0.8} onPress={() => onPick(t)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: theme.bgCard, borderWidth: 0.5, borderColor: theme.borderCard, borderTopColor: theme.accentBlueRaw, borderTopWidth: 1.5, borderRadius: 14, padding: 15, shadowColor: theme.cardShadow, shadowOpacity: theme.cardShadowOpacity, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 6 }}>
            <View style={{ width: 42, height: 42, borderRadius: 11, backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={t.icon as any} size={21} color={theme.accentBlue} />
            </View>
            <View style={{ flex: 1 }}>
              <GradientNumber value={t.name} color={theme.textSecondary} style={{ fontSize: 14.5, fontFamily: Type.uiBold }} />
              <Text numberOfLines={1} style={{ fontSize: 11.5, fontFamily: Type.ui, color: theme.textMuted, marginTop: 2 }}>{t.desc}</Text>
            </View>
            <Text style={{ fontSize: 11, fontFamily: Type.uiSemibold, color: theme.textDim }}>{t.blockIds.length} blocks</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity activeOpacity={0.8} onPress={onCustom}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: theme.bgCard, borderWidth: 1.5, borderStyle: 'dashed', borderColor: theme.borderCard, borderRadius: 14, padding: 15 }}>
          <View style={{ width: 42, height: 42, borderRadius: 11, backgroundColor: theme.bgInset, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="add" size={22} color={theme.textMuted} />
          </View>
          <View style={{ flex: 1 }}>
            <GradientNumber value="Build your own" color={theme.textSecondary} style={{ fontSize: 14.5, fontFamily: Type.uiBold }} />
            <Text style={{ fontSize: 11.5, fontFamily: Type.ui, color: theme.textMuted, marginTop: 2 }}>Start blank and pick blocks yourself</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

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
          <Text style={{ width: 16, fontSize: 12, fontFamily: Type.uiBold, color: theme.textDim, textAlign: 'right' }}>{i + 1}</Text>
          <View style={{ flex: 1 }}>
            <GradientNumber value={r.name} color={theme.textSecondary} style={{ fontSize: 13.5, fontFamily: Type.uiSemibold, marginBottom: 4 }} numberOfLines={1} />
            <View style={{ height: 5, borderRadius: 3, backgroundColor: theme.bgInset, overflow: 'hidden' }}>
              <View style={{ height: '100%', borderRadius: 3, backgroundColor: theme.accentBlue, width: `${Math.max(6, (r.count / maxCount) * 100)}%` }} />
            </View>
          </View>
          <View style={{ alignItems: 'flex-end', minWidth: 58 }}>
            <GradientNumber value={`×${r.count}`} color={theme.textSecondary} style={{ fontSize: 13, fontFamily: Type.uiBold }} />
            <Text style={{ fontSize: 10.5, fontFamily: Type.uiMedium, color: theme.textMuted }}>{r.cal.toLocaleString('en-US')} cal</Text>
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
              <Text style={{ flex: 1, fontSize: 12.5, fontFamily: Type.uiBold, color: theme.textSecondary }}>{FULL_DATE(d.date)}</Text>
              <Text style={{ fontSize: 10.5, fontFamily: Type.uiMedium, color: theme.textMuted }}>{d.entries.length} item{d.entries.length === 1 ? '' : 's'}</Text>
              <GradientNumber value={`${total.toLocaleString('en-US')} cal`} color={theme.accentBlue} style={{ fontSize: 12, fontFamily: Type.uiBold }} />
            </TouchableOpacity>
            {isOpen && (
              <View style={{ gap: 5, paddingHorizontal: 12, paddingBottom: 12 }}>
                {d.entries.map((e, i) => (
                  <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                    <Text numberOfLines={1} style={{ flex: 1, fontSize: 12.5, fontFamily: Type.ui, color: theme.textSecondary }}>{String(e?.name || 'Food')}</Text>
                    <Text style={{ fontSize: 12, fontFamily: Type.uiMedium, color: theme.textMuted, fontVariant: ['tabular-nums'] }}>{Math.round(e?.cal || 0)}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        );
      })}
      {days.length > CAP && (
        <Text style={{ fontSize: 11.5, color: theme.textDim, textAlign: 'center', fontFamily: Type.ui, marginTop: 2 }}>+{days.length - CAP} earlier days. Narrow the range to see them.</Text>
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
      .filter((p: any) => p && (p.bestWeight || p.bestE1RM || p.bestDuration) && liftSessionHistory(p.name, setLogs, resolveDay).length > 0)
      .map((p: any) => ({ name: String(p.name || 'Lift'), bw: p.bestWeight, e1: p.bestE1RM, bd: p.bestDuration, date: (p.bestWeight?.dateKey || p.bestE1RM?.dateKey || p.bestDuration?.dateKey || '') }))
      .sort((a: any, b: any) => b.date.localeCompare(a.date));
  }, [workoutState]);
  if (!rows.length) return emptyList(theme, 'No lift records yet. Log a weighted set to start.');
  return (
    <View style={{ gap: 9 }}>
      {rows.map((r: any, i: number) => (
        <View key={r.name + i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: i === 0 ? 0 : 0.5, borderTopColor: theme.borderCard, paddingTop: i === 0 ? 0 : 9 }}>
          <View style={{ flex: 1 }}>
            <GradientNumber value={r.name} color={theme.textSecondary} style={{ fontSize: 13.5, fontFamily: Type.uiBold }} numberOfLines={1} />
            {r.date ? <Text style={{ fontSize: 10.5, fontFamily: Type.uiMedium, color: theme.textMuted, marginTop: 1 }}>{FULL_DATE(r.date)}</Text> : null}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            {r.bd && !r.bw ? (
              <GradientNumber value={`${formatHold(r.bd.value)}${r.bd.weight != null && r.bd.weight > 0 ? ` · ${r.bd.weight} ${weightUnitLabel(r.bd.unit)}` : ''}`} color={theme.textSecondary} style={{ fontSize: 13, fontFamily: Type.uiBold }} />
            ) : (
              <>
                <GradientNumber value={r.bw ? `${r.bw.value} ${weightUnitLabel(r.bw.unit)} × ${r.bw.reps}` : '—'} color={theme.textSecondary} style={{ fontSize: 13, fontFamily: Type.uiBold }} />
                {r.e1 ? <Text style={{ fontSize: 10.5, fontFamily: Type.uiMedium, color: theme.textMuted }}>Est. 1RM {r.e1.value} {weightUnitLabel(r.e1.unit)}</Text> : null}
              </>
            )}
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
      let volLb = 0, volKg = 0;
      const items = done.map((e: any) => {
        const sets = Array.isArray(dl[e.id]) ? dl[e.id] : [];
        const doneSets = sets.filter((s: any) => s.done);
        const u: 'lb' | 'kg' = e.weightUnit === 'kg' ? 'kg' : 'lb';
        let top: { w: number; r: number } | null = null;
        let topDur = 0;
        for (const s of doneSets) { const w = s.weight || 0, r = s.reps || 0; if (u === 'kg') volKg += w * r; else volLb += w * r; if (w > 0 && r > 0 && (!top || w > top.w)) top = { w, r }; const dur = s.durationSec || 0; if (dur > topDur) topDur = dur; }
        return { name: String(e.name || 'Exercise'), isCardio: !!e.isCardio, setCount: doneSets.length, top, topDur, unit: u, duration: e.duration, distance: e.distance, calories: e.calories };
      });
      out.push({ date: k, focus: String(prog.focus || 'Workout'), volLb: Math.round(volLb), volKg: Math.round(volKg), prCount: Object.keys(prHits[k] || {}).length, items });
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
                <Text style={{ fontSize: 12.5, fontFamily: Type.uiBold, color: theme.textSecondary }}>{FULL_DATE(d.date)}</Text>
                <Text numberOfLines={1} style={{ fontSize: 10.5, fontFamily: Type.uiMedium, color: theme.textMuted, marginTop: 1 }}>{d.focus}</Text>
              </View>
              {d.prCount > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(212,134,10,0.14)', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 }}>
                  <Ionicons name="trophy" size={10} color={theme.accentAmber} />
                  <GradientNumber value={String(d.prCount)} color={theme.accentAmber} style={{ fontSize: 10.5, fontFamily: Type.uiBold }} />
                </View>
              )}
              {(d.volLb > 0 || d.volKg > 0) && <GradientNumber value={[d.volLb > 0 ? `${d.volLb.toLocaleString('en-US')} lb` : null, d.volKg > 0 ? `${d.volKg.toLocaleString('en-US')} kg` : null].filter(Boolean).join(' · ')} color={theme.accentBlue} style={{ fontSize: 11.5, fontFamily: Type.uiBold }} />}
            </TouchableOpacity>
            {isOpen && (
              <View style={{ gap: 5, paddingHorizontal: 12, paddingBottom: 12 }}>
                {d.items.map((it: any, i: number) => (
                  <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                    <Text numberOfLines={1} style={{ flex: 1, fontSize: 12.5, fontFamily: Type.ui, color: theme.textSecondary }}>{it.name}</Text>
                    <Text style={{ fontSize: 11.5, fontFamily: Type.uiMedium, color: theme.textMuted }}>
                      {it.isCardio ? cardioDetail(it) : it.top ? `${it.top.w} ${weightUnitLabel(it.unit)} × ${it.top.r}${it.setCount > 1 ? ` · ${it.setCount} sets` : ''}` : it.topDur ? `${formatHold(it.topDur)}${it.setCount > 1 ? ` · ${it.setCount} sets` : ''}` : `${it.setCount || 1} set${(it.setCount || 1) === 1 ? '' : 's'}`}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        );
      })}
      {days.length > CAP && <Text style={{ fontSize: 11.5, color: theme.textDim, textAlign: 'center', fontFamily: Type.ui, marginTop: 2 }}>+{days.length - CAP} earlier workouts. Narrow the range to see them.</Text>}
    </View>
  );
}

// Calorie share per meal, as horizontal bars with each meal's % of total + avg/day.
function CaloriesByMeal({ foodDays, mealSlots, slotCache, theme }: { foodDays: FoodDay[]; mealSlots: any[]; slotCache: any; theme: any }) {
  const rows = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of foodDays) for (const e of d.entries) {
      const label = getMealDisplayName(e?.meal || '', mealSlots, slotCache) || 'Other';
      map.set(label, (map.get(label) || 0) + Math.round(e?.cal || 0));
    }
    return Array.from(map.entries()).map(([label, cal]) => ({ label, cal })).sort((a, b) => b.cal - a.cal);
  }, [foodDays, mealSlots]);
  if (!rows.length) return emptyList(theme, 'No meals logged in this range.');
  const total = rows.reduce((s, r) => s + r.cal, 0) || 1;
  const max = rows[0].cal || 1;
  const nDays = foodDays.length || 1;
  return (
    <View style={{ gap: 11 }}>
      {rows.map(r => {
        const pct = Math.round((r.cal / total) * 100);
        return (
          <View key={r.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={{ fontSize: 13, fontFamily: Type.uiSemibold, color: theme.textSecondary, marginBottom: 4 }}>{r.label}</Text>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: theme.bgInset, overflow: 'hidden' }}>
                <View style={{ height: '100%', borderRadius: 3, backgroundColor: theme.accentBlue, width: `${Math.max(5, (r.cal / max) * 100)}%` }} />
              </View>
            </View>
            <View style={{ alignItems: 'flex-end', minWidth: 64 }}>
              <GradientNumber value={`${pct}%`} color={theme.textSecondary} style={{ fontSize: 13, fontFamily: Type.uiBold }} />
              <Text style={{ fontSize: 10.5, fontFamily: Type.uiMedium, color: theme.textMuted }}>~{Math.round(r.cal / nDays).toLocaleString('en-US')}/day</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// Biggest & lightest calorie days in the range.
function DayExtremes({ foodDays, theme }: { foodDays: FoodDay[]; theme: any }) {
  const perDay = useMemo(() => foodDays.map(d => ({ date: d.date, cal: Math.round(d.entries.reduce((s, e) => s + (e?.cal || 0), 0)) })).filter(d => d.cal > 0).sort((a, b) => b.cal - a.cal), [foodDays]);
  if (!perDay.length) return emptyList(theme, 'No calories logged in this range.');
  const biggest = perDay.slice(0, 3);
  const lightest = perDay.length > 3 ? perDay.slice(-3).reverse() : [];
  const row = (d: { date: string; cal: number }) => (
    <View key={d.date} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 }}>
      <Text style={{ fontSize: 12.5, fontFamily: Type.uiMedium, color: theme.textSecondary }}>{FULL_DATE(d.date)}</Text>
      <GradientNumber value={`${d.cal.toLocaleString('en-US')} cal`} color={theme.textSecondary} style={{ fontSize: 12.5, fontFamily: Type.uiBold }} />
    </View>
  );
  const label = (t: string) => <Text style={{ fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: Type.uiBold, color: theme.textMuted, marginBottom: 3 }}>{t}</Text>;
  return (
    <View style={{ gap: 12 }}>
      <View>{label('Biggest days')}{biggest.map(row)}</View>
      {lightest.length > 0 && <View>{label('Lightest days')}{lightest.map(row)}</View>}
    </View>
  );
}

// Most-performed exercises across the range, ranked with a frequency bar (your original example).
function ExerciseFrequency({ workoutState, startKey, endKey, theme }: { workoutState: any; startKey: string; endKey: string; theme: any }) {
  const rows = useMemo(() => {
    const programs = workoutState?.programs || {};
    const checks = workoutState?.checks || {};
    const map = new Map<string, { name: string; count: number }>();
    for (const k of Object.keys(programs)) {
      if (k < startKey || k > endKey) continue;
      const exs = Array.isArray(programs[k]?.exercises) ? programs[k].exercises : [];
      const dc = checks[k] || {};
      for (const e of exs) {
        if (!dc[e.id]) continue;
        const name = String(e?.name || '').trim();
        if (!name) continue;
        const key = name.toLowerCase();
        const cur = map.get(key) || { name, count: 0 };
        cur.count += 1; map.set(key, cur);
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 15);
  }, [workoutState, startKey, endKey]);
  if (!rows.length) return emptyList(theme, 'No workouts logged in this range.');
  const maxCount = rows[0].count;
  return (
    <View style={{ gap: 10 }}>
      {rows.map((r, i) => (
        <View key={r.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
          <Text style={{ width: 16, fontSize: 12, fontFamily: Type.uiBold, color: theme.textDim, textAlign: 'right' }}>{i + 1}</Text>
          <View style={{ flex: 1 }}>
            <GradientNumber value={r.name} color={theme.textSecondary} style={{ fontSize: 13, fontFamily: Type.uiSemibold, marginBottom: 4 }} numberOfLines={1} />
            <View style={{ height: 5, borderRadius: 3, backgroundColor: theme.bgInset, overflow: 'hidden' }}>
              <View style={{ height: '100%', borderRadius: 3, backgroundColor: theme.accentBlue, width: `${Math.max(6, (r.count / maxCount) * 100)}%` }} />
            </View>
          </View>
          <GradientNumber value={`×${r.count}`} color={theme.textSecondary} style={{ fontSize: 13, fontFamily: Type.uiBold, minWidth: 30, textAlign: 'right' }} />
        </View>
      ))}
    </View>
  );
}

// Sleep stages: average deep / REM / core (minutes) as a composition bar + legend with per-night avg + %.
function SleepStages({ data, theme }: { data: TrendData; theme: any }) {
  const nights = data.sleepStages.filter(s => (s.deep || 0) + (s.rem || 0) + (s.core || 0) > 0);
  if (!nights.length) return emptyList(theme, 'No sleep stage data in this range.');
  const avgK = (k: 'deep' | 'rem' | 'core') => Math.round(nights.reduce((s, n) => s + ((n as any)[k] || 0), 0) / nights.length);
  const deep = avgK('deep'), rem = avgK('rem'), core = avgK('core');
  const total = deep + rem + core || 1;
  const fmtMin = (m: number) => { const h = Math.floor(m / 60), mm = m % 60; return h > 0 ? `${h}h ${mm}m` : `${mm}m`; };
  const COL: Record<string, string> = { Deep: '#3b5bdb', REM: '#7048e8', Core: '#4dabf7' };
  const segs: [string, number][] = [['Deep', deep], ['REM', rem], ['Core', core]];
  return (
    <View>
      <View style={{ flexDirection: 'row', gap: 2, height: 24, borderRadius: 7, overflow: 'hidden' }}>
        {segs.map(([name, v]) => <View key={name} style={{ flex: v || 0.01, backgroundColor: COL[name] }} />)}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 12 }}>
        {segs.map(([name, v]) => (
          <View key={name} style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
            <View style={{ width: 11, height: 11, borderRadius: 3.5, backgroundColor: COL[name] }} />
            <View>
              <GradientNumber value={`${name} ${Math.round((v / total) * 100)}%`} color={theme.textSecondary} style={{ fontSize: 12, fontFamily: Type.uiBold }} />
              <Text style={{ fontSize: 11, fontFamily: Type.uiMedium, color: theme.textMuted }}>{fmtMin(v)}/night</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

// Body measurements: every tape-measurement session in the range (newest first, collapsible, first open),
// each field shown in the user's unit + the session's body-fat estimate.
function BodyMeasurements({ entries, unit, startKey, endKey, theme }: { entries: any[]; unit: MeasurementUnit; startKey: string; endKey: string; theme: any }) {
  const sessions = useMemo(() => entries.filter(e => e?.date >= startKey && e?.date <= endKey).sort((a, b) => b.date.localeCompare(a.date)), [entries, startKey, endKey]);
  const [open, setOpen] = useState<Set<string>>(new Set());
  useEffect(() => { setOpen(new Set(sessions.length ? [sessions[0].id] : [])); }, [sessions.length, sessions[0]?.id]);
  if (!sessions.length) return emptyList(theme, 'No measurements logged in this range.');
  const CAP = 45;
  const shown = sessions.slice(0, CAP);
  const u = unitLabel(unit);
  const toggle = (id: string) => setOpen(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  return (
    <View style={{ gap: 10 }}>
      {shown.map(s => {
        const isOpen = open.has(s.id);
        const fields = MEASURE_FIELDS.filter(f => typeof s.values?.[f.key] === 'number');
        return (
          <View key={s.id} style={{ backgroundColor: theme.bgInset, borderWidth: 1, borderColor: theme.borderCard, borderRadius: 10, overflow: 'hidden' }}>
            <TouchableOpacity onPress={() => toggle(s.id)} activeOpacity={0.7} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 }}>
              <Ionicons name={isOpen ? 'chevron-down' : 'chevron-forward'} size={14} color={theme.textMuted} />
              <Text style={{ flex: 1, fontSize: 12.5, fontFamily: Type.uiBold, color: theme.textSecondary }}>{FULL_DATE(s.date)}</Text>
              <Text style={{ fontSize: 10.5, fontFamily: Type.uiMedium, color: theme.textMuted }}>{fields.length} field{fields.length === 1 ? '' : 's'}</Text>
              {typeof s.bodyFat === 'number' && <GradientNumber value={`${s.bodyFat}% BF`} color={theme.accentBlue} style={{ fontSize: 12, fontFamily: Type.uiBold }} />}
            </TouchableOpacity>
            {isOpen && (
              <View style={{ gap: 5, paddingHorizontal: 12, paddingBottom: 12 }}>
                {fields.map(f => (
                  <View key={f.key} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 12.5, fontFamily: Type.ui, color: theme.textSecondary }}>{f.label}</Text>
                    <Text style={{ fontSize: 12, fontFamily: Type.uiSemibold, color: theme.textMuted }}>{toDisplay(s.values[f.key], unit)} {u}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        );
      })}
      {sessions.length > CAP && <Text style={{ fontSize: 11.5, color: theme.textDim, textAlign: 'center', fontFamily: Type.ui, marginTop: 2 }}>+{sessions.length - CAP} earlier sessions. Narrow the range to see them.</Text>}
    </View>
  );
}

// Bronze/silver/gold/platinum/diamond metal colors (mirrors the Achievements screen's TIER_CONFIG).
const TIER_METAL: Record<string, { main: string; dark: string }> = {
  bronze: { main: '#cd7f32', dark: '#8b5220' },
  silver: { main: '#a8a8c0', dark: '#6a6a88' },
  gold: { main: '#d4860a', dark: '#8a5200' },
  platinum: { main: '#bfdbfe', dark: '#4f8fb8' },
  diamond: { main: '#e0f2fe', dark: '#38bdf8' },
};
// Same tier mapping the Achievements screen uses.
function displayTierOf(def: any): string {
  if (def.displayTier) return def.displayTier;
  if (def.tier === 'small') return 'bronze';
  if (def.tier === 'medium') return 'silver';
  if (def.tier === 'diamond') return 'diamond';
  return 'gold';
}

// Achievements earned within the range, newest first. Keeps each badge's SUBJECT icon, but tinted by its
// TIER (bronze/silver/gold/platinum/diamond) on a soft tier-colored chip.
function AchievementsEarned({ store, startKey, endKey, theme }: { store: AchievementsStore; startKey: string; endKey: string; theme: any }) {
  const rows = useMemo(() => {
    const s = store || {};
    return ACHIEVEMENTS.filter(a => s[a.id])
      .map(a => {
        const m = TIER_METAL[displayTierOf(a)] || TIER_METAL.gold;
        return { name: a.name, category: String(a.category), icon: a.icon, tint: m.dark, chip: m.main + '2e', date: String(s[a.id].unlockedAt || '').slice(0, 10) };
      })
      .filter(r => r.date && r.date >= startKey && r.date <= endKey)
      .sort((x, y) => y.date.localeCompare(x.date));
  }, [store, startKey, endKey]);
  if (!rows.length) return emptyList(theme, 'No achievements earned in this range.');
  return (
    <View style={{ gap: 9 }}>
      {rows.map((r, i) => (
        <View key={r.name + i} style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
          <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: r.chip, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={(r.icon as any) || 'trophy'} size={15} color={r.tint} />
          </View>
          <View style={{ flex: 1 }}>
            <GradientNumber value={r.name} color={theme.textSecondary} style={{ fontSize: 13.5, fontFamily: Type.uiBold }} numberOfLines={1} />
            <Text style={{ fontSize: 10.5, fontFamily: Type.uiMedium, color: theme.textMuted, marginTop: 1, textTransform: 'capitalize' }}>{r.category}</Text>
          </View>
          <Text style={{ fontSize: 11, fontFamily: Type.uiSemibold, color: theme.textDim }}>{FULL_DATE(r.date)}</Text>
        </View>
      ))}
    </View>
  );
}

// Challenges that ENDED within the range, newest first, with their outcome tier.
function ChallengeHistory({ rows, startKey, endKey, theme }: { rows: { id: string; title: string; startKey: string; endKey: string; won: boolean; tier: string }[]; startKey: string; endKey: string; theme: any }) {
  const list = useMemo(() => rows.filter(r => r.endKey >= startKey && r.endKey <= endKey).sort((a, b) => b.endKey.localeCompare(a.endKey)), [rows, startKey, endKey]);
  if (!list.length) return emptyList(theme, 'No challenges completed in this range.');
  const meta = (tier: string): { label: string; color: string; icon: any } => {
    if (tier === 'perfect') return { label: 'Perfect', color: '#0d9268', icon: 'trophy' };
    if (tier === 'complete') return { label: 'Complete', color: '#0d9268', icon: 'checkmark-circle' };
    return { label: 'Partial', color: theme.textMuted, icon: 'remove-circle' };
  };
  return (
    <View style={{ gap: 9 }}>
      {list.map((r, i) => {
        const m = meta(r.tier);
        return (
          <View key={r.id + i} style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
            <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: m.color + '22', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={m.icon} size={15} color={m.color} />
            </View>
            <View style={{ flex: 1 }}>
              <GradientNumber value={r.title} color={theme.textSecondary} style={{ fontSize: 13.5, fontFamily: Type.uiBold }} numberOfLines={1} />
              <Text style={{ fontSize: 10.5, fontFamily: Type.uiMedium, color: theme.textMuted, marginTop: 1 }}>{fmtDateKey(r.startKey)} – {fmtDateKey(r.endKey)}</Text>
            </View>
            <GradientNumber value={m.label} color={m.color} style={{ fontSize: 11.5, fontFamily: Type.uiBold }} />
          </View>
        );
      })}
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
  if (pct === 0) return <Text style={{ fontSize: 10.5, fontFamily: Type.uiBold, color: theme.textDim, marginTop: 6 }}>No change</Text>;
  const up = pct > 0;
  const good = better === 'none' ? null : (better === 'up') === up;
  const color = good === null ? theme.textMuted : good ? '#0d9268' : '#cc3333';
  const bg = good === null ? theme.bgCard : good ? 'rgba(13,146,104,0.13)' : 'rgba(204,51,51,0.13)';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: bg, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2, marginTop: 7, gap: 3 }}>
      <Text style={{ fontSize: 10, color, fontFamily: Type.uiBold }}>{up ? '▲' : '▼'}</Text>
      <Text style={{ fontSize: 11, color, fontFamily: Type.uiBold }}>{Math.abs(pct)}%</Text>
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
            <Text style={{ fontSize: 8.5, letterSpacing: 1.3, textTransform: 'uppercase', fontFamily: Type.uiBold, color: theme.textMuted, marginBottom: 5 }}>{spec.label}</Text>
            <GradientNumber value={cur != null ? spec.fmt(cur) : '—'} color={theme.textSecondary} style={{ fontSize: 20, fontFamily: Type.uiBold }} />
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
  if (p + c + f === 0) return <Text style={{ fontSize: 13, color: theme.textMuted, fontFamily: Type.ui }}>No macro data logged in this range.</Text>;
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
              <GradientNumber value={`${name} ${percent}%`} color={theme.textSecondary} style={{ fontSize: 12, fontFamily: Type.uiBold }} />
              <Text style={{ fontSize: 11, fontFamily: Type.uiMedium, color: theme.textMuted }}>{g} g/day</Text>
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
    return <Text style={{ fontSize: 13, color: theme.textMuted, fontFamily: Type.ui }}>Not enough data in this range yet.</Text>;
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
