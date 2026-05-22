import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import { ReactNode, useCallback, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ToastRenderer, useToast } from '../components/Toast';
import TooltipIcon from '../components/TooltipIcon';
import { useTheme } from '../theme';
import {
  BurnAccuracyFinding,
  ConsistencyFinding,
  DeficitFinding,
  DiagnosticReport,
  FindingStatus,
  MacroFinding,
  ReportWindow,
  SleepFinding,
  deleteReport,
  generateDiagnosticReport,
  loadSavedReports,
  minDaysForWindow,
  saveReport,
} from '../utils/diagnosticReport';

// ── Helpers ────────────────────────────────────────────────────────────────────

const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmtDate(dk: string): string {
  const [, m, d] = dk.split('-');
  return `${MONTH_ABBR[parseInt(m) - 1]} ${parseInt(d)}`;
}

function fmtDateFull(dk: string): string {
  const [y, m, d] = dk.split('-');
  return `${MONTH_ABBR[parseInt(m) - 1]} ${parseInt(d)}, ${y}`;
}

function fmtLbs(v: number): string {
  return `${Math.abs(Math.round(v * 10) / 10).toFixed(1)} lbs`;
}

function windowDateRange(windowDays: number): string {
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - windowDays + 1);
  const pad = (n: number) => String(n).padStart(2, '0');
  const startKey = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
  const endKey = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  return `${fmtDate(startKey)} – ${fmtDate(endKey)}`;
}

async function countLoggedDaysInWindow(windowDays: number): Promise<number> {
  let count = 0;
  const today = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  for (let i = 0; i < windowDays; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = `pj_${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    try {
      const raw = await AsyncStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (!parsed.excluded?.diet && parsed.entries?.length > 0) {
          const cals = parsed.entries.reduce((s: number, e: any) => s + (e.cal || 0), 0);
          if (cals > 400) count++;
        }
      }
    } catch {}
  }
  return count;
}

// ── Status pill ────────────────────────────────────────────────────────────────

function StatusPill({ status, theme }: { status: FindingStatus; theme: any }) {
  const label = status === 'good' ? 'LOOKING GOOD' : status === 'attention' ? 'WORTH ATTENTION' : 'LIKELY FACTOR';
  const color = status === 'good' ? theme.statusGood : status === 'attention' ? theme.statusWarn : theme.statusBad;
  return (
    <View style={{ backgroundColor: color + '22', borderWidth: 1, borderColor: color + '55', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
      <Text style={{ fontSize: 9, fontFamily: 'DMSans_700Bold', letterSpacing: 2, color }}>{label}</Text>
    </View>
  );
}

// ── Chip label ─────────────────────────────────────────────────────────────────

function ChipLabel({ label, theme }: { label: string; theme: any }) {
  return (
    <View style={{ backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
      <Text style={{ fontSize: 9, fontFamily: 'DMSans_700Bold', letterSpacing: 2, color: theme.accentBlueRaw }}>{label}</Text>
    </View>
  );
}

// ── Data row ───────────────────────────────────────────────────────────────────

function DataRow({ label, value, valueColor, theme }: { label: string; value: string; valueColor?: string; theme: any }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5, borderBottomWidth: 0.5, borderBottomColor: theme.borderSubtle }}>
      <Text style={{ fontSize: 12, fontFamily: 'DMSans_400Regular', color: theme.textMuted, flex: 1 }}>{label}</Text>
      <Text style={{ fontSize: 12, fontFamily: 'DMSans_600SemiBold', color: valueColor ?? theme.textPrimary }}>{value}</Text>
    </View>
  );
}

// ── Finding card ───────────────────────────────────────────────────────────────

function FindingCard({
  chipLabel, headline, status, showStatus, theme, shadowStyle, children,
}: {
  chipLabel: string;
  headline: ReactNode;
  status: FindingStatus;
  showStatus: boolean;
  theme: any;
  shadowStyle: any;
  children?: React.ReactNode;
}) {
  const topColor = showStatus
    ? (status === 'good' ? theme.statusGood : status === 'attention' ? theme.statusWarn : theme.statusBad)
    : theme.accentBlueRaw;
  return (
    <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: topColor, ...shadowStyle }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <ChipLabel label={chipLabel} theme={theme} />
        {showStatus && <StatusPill status={status} theme={theme} />}
      </View>
      <Text style={{ fontSize: 18, fontFamily: 'BebasNeue_400Regular', color: theme.textPrimary, letterSpacing: 1, marginBottom: children ? 10 : 0, lineHeight: 22 }}>
        {headline}
      </Text>
      {children}
    </View>
  );
}

// ── Consistency card ───────────────────────────────────────────────────────────

function ConsistencyCard({ f, isMindful, theme, shadowStyle }: { f: ConsistencyFinding; isMindful: boolean; theme: any; shadowStyle: any }) {
  const rate = Math.round(f.rate * 100);
  const headline = `${f.loggedDays} of ${f.totalDays} days logged  ·  ${rate}%`;
  const noteText = f.status !== 'good'
    ? isMindful
      ? `There are some gaps in this window. More logging days give the report more to work with.`
      : `Inconsistent logging creates gaps in the deficit calculation. Even rough entries on hard days are better than nothing.`
    : null;
  return (
    <FindingCard chipLabel="LOGGING CONSISTENCY" headline={headline} status={f.status} showStatus={!isMindful} theme={theme} shadowStyle={shadowStyle}>
      <DataRow label="Logged days" value={`${f.loggedDays} / ${f.totalDays}`} theme={theme} />
      {f.suspectDays > 0 && <DataRow label="Under 400 cal (suspect)" value={`${f.suspectDays} day${f.suspectDays !== 1 ? 's' : ''}`} valueColor={!isMindful ? theme.statusWarn : undefined} theme={theme} />}
      {f.excludedDays > 0 && <DataRow label="Excluded from stats" value={`${f.excludedDays} day${f.excludedDays !== 1 ? 's' : ''}`} theme={theme} />}
      {noteText && <Text style={styles.noteText}>{noteText}</Text>}
    </FindingCard>
  );
}

// ── Deficit card ───────────────────────────────────────────────────────────────

function DeficitCard({ f, isMindful, theme, shadowStyle }: { f: DeficitFinding; isMindful: boolean; theme: any; shadowStyle: any }) {
  const chipLabel = f.goalDirection === 'gain' ? 'CALORIE SURPLUS' : 'CALORIE DEFICIT';
  let headline = '';
  if (f.actualChangeLbs !== null) {
    const expAbs = fmtLbs(Math.abs(f.expectedChangeLbs));
    const expDir = f.goalDirection === 'lose' ? 'lost' : 'gained';
    const actAbs = fmtLbs(Math.abs(f.actualChangeLbs));
    const actDir = f.actualChangeLbs <= 0 ? 'lost' : 'gained';
    headline = `Expected ${expDir} ${expAbs}. Actually ${actDir} ${actAbs}.`;
  } else {
    const abs = Math.abs(Math.round(f.avgDailyDeficit));
    headline = `Avg ${abs} cal/day ${f.avgDailyDeficit >= 0 ? 'deficit' : 'surplus'} logged`;
  }
  const gapColor = !isMindful && f.gapLbs != null && f.gapLbs > 0.3 ? theme.statusWarn : theme.textPrimary;
  return (
    <FindingCard chipLabel={chipLabel} headline={headline} status={f.status} showStatus={!isMindful && f.hasWeightData} theme={theme} shadowStyle={shadowStyle}>
      <DataRow label="Avg daily deficit" value={`${Math.abs(Math.round(f.avgDailyDeficit)).toLocaleString()} cal`} theme={theme} />
      {Math.abs(f.expectedChangeLbs) >= 0.1 && (
        <DataRow label="Expected over window" value={`${f.goalDirection === 'lose' ? '-' : '+'}${fmtLbs(f.expectedChangeLbs)}`} theme={theme} />
      )}
      {f.actualChangeLbs !== null && (
        <DataRow label="Actual weight change" value={`${f.actualChangeLbs <= 0 ? '-' : '+'}${fmtLbs(f.actualChangeLbs)}`} theme={theme} />
      )}
      {!isMindful && f.gapLbs != null && Math.abs(f.gapLbs) >= 0.3 && (
        <DataRow
          label={f.goalDirection === 'lose' ? (f.gapLbs > 0 ? 'Fell short by' : 'Exceeded by') : (f.gapLbs < 0 ? 'Fell short by' : 'Exceeded by')}
          value={fmtLbs(f.gapLbs)}
          valueColor={gapColor}
          theme={theme}
        />
      )}
      {!f.hasWeightData && (
        <Text style={[styles.noteText, { color: theme.textSecondary }]}>
          Log your weight at least twice in this window to compare expected vs actual results.
        </Text>
      )}
    </FindingCard>
  );
}

// ── Burn accuracy card ─────────────────────────────────────────────────────────

function BurnAccuracyCard({ f, isMindful, theme, shadowStyle }: { f: BurnAccuracyFinding; isMindful: boolean; theme: any; shadowStyle: any }) {
  const headline = f.burnAccuracyPct === 100 ? `Burn estimate hasn't been adjusted` : `Burn estimate adjusted to ${f.burnAccuracyPct}%`;
  const note = f.isFlagged
    ? isMindful
      ? `Your burn estimate is using the default 100%. Most wearables measure differently -- adjusting this in Settings is something worth exploring.`
      : `Apple Watch and most wearables overestimate active burn by 10-30%. Try Settings → Health and set it to 80-90% for more accurate math.`
    : null;
  return (
    <FindingCard chipLabel="BURN ACCURACY" headline={headline} status={f.status} showStatus={!isMindful && f.isFlagged} theme={theme} shadowStyle={shadowStyle}>
      <DataRow label="Avg active calories/day" value={`${f.avgActiveCalPerDay.toLocaleString()} cal`} theme={theme} />
      <DataRow label="Current adjustment" value={`${f.burnAccuracyPct}%`} theme={theme} />
      {f.burnAccuracyPct < 100 && (
        <DataRow label="Adjusted avg/day" value={`${Math.round(f.avgActiveCalPerDay * f.burnAccuracyPct / 100).toLocaleString()} cal`} theme={theme} />
      )}
      {note && <Text style={[styles.noteText, { color: theme.textSecondary }]}>{note}</Text>}
    </FindingCard>
  );
}

// ── Macro card ─────────────────────────────────────────────────────────────────

function MacroCard({ f, isMindful, theme, shadowStyle }: { f: MacroFinding; isMindful: boolean; theme: any; shadowStyle: any }) {
  const headline: ReactNode = f.macroStatus === 'good' && f.fiberStatus === 'good'
    ? 'Macros and food quality look balanced'
    : f.macroStatus !== 'good'
    ? <>Protein averaging {f.avgProtein}<Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 18 }}>g</Text> -- below target</>
    : 'Food quality has room to improve';
  const proteinColor = !isMindful && f.macroStatus !== 'good' ? theme.statusWarn : theme.textPrimary;
  const fiberColor = !isMindful && f.fiberStatus !== 'good' ? theme.statusWarn : theme.textPrimary;
  const fiberNote = f.lowFiberNote
    ? isMindful
      ? `Fiber tends to reflect how much of your diet comes from whole foods. Your average of ${f.avgFiber}g/day is worth paying attention to.`
      : `Low fiber usually means fewer fruits, vegetables, and whole grains. Fiber is the best available proxy for food quality we can measure.`
    : null;
  return (
    <FindingCard chipLabel="MACRO QUALITY" headline={headline} status={f.status} showStatus={!isMindful} theme={theme} shadowStyle={shadowStyle}>
      <DataRow label="Avg protein/day" value={`${f.avgProtein}g`} valueColor={proteinColor} theme={theme} />
      <DataRow label="Protein target" value={`${f.proteinGoalMin}–${f.proteinGoalMax}g`} theme={theme} />
      {f.avgFiber > 0 && <DataRow label="Avg fiber/day" value={`${f.avgFiber}g`} valueColor={fiberColor} theme={theme} />}
      {f.avgFiber > 0 && <DataRow label="Fiber target" value="25–38g" theme={theme} />}
      {fiberNote && <Text style={[styles.noteText, { color: theme.textSecondary }]}>{fiberNote}</Text>}
    </FindingCard>
  );
}

// ── Sleep card ─────────────────────────────────────────────────────────────────

function SleepCard({ f, isMindful, theme, shadowStyle }: { f: SleepFinding; isMindful: boolean; theme: any; shadowStyle: any }) {
  const headline = f.avgSleepScore !== null
    ? `Avg sleep score: ${f.avgSleepScore} over ${f.totalSleepDays} nights`
    : `Avg ${f.avgSleepHours}h/night over ${f.totalSleepDays} nights`;
  const scoreColor = !isMindful && f.status !== 'good' ? theme.statusWarn : theme.textPrimary;
  const note = f.status !== 'good'
    ? isMindful
      ? `Your sleep data shows some nights that could be improved. Sleep quality has an interesting relationship with appetite and energy.`
      : `Poor sleep increases ghrelin (hunger hormone) and decreases leptin (fullness hormone), making fat loss harder even with a consistent deficit.`
    : null;
  return (
    <FindingCard chipLabel="SLEEP QUALITY" headline={headline} status={f.status} showStatus={!isMindful} theme={theme} shadowStyle={shadowStyle}>
      {f.avgSleepScore !== null && <DataRow label="Avg sleep score" value={`${f.avgSleepScore} / 100`} valueColor={scoreColor} theme={theme} />}
      <DataRow label="Avg sleep duration" value={`${f.avgSleepHours}h`} theme={theme} />
      {f.poorSleepCalDelta != null && f.poorSleepCalDelta > 0 && (
        <DataRow label="Extra cals after poor sleep" value={`+${f.poorSleepCalDelta} cal`} valueColor={!isMindful ? theme.statusWarn : undefined} theme={theme} />
      )}
      {note && <Text style={[styles.noteText, { color: theme.textSecondary }]}>{note}</Text>}
    </FindingCard>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────────

export default function DiagnosticReportScreen() {
  const insets = useSafeAreaInsets();
  const { theme: t } = useTheme();
  const { showToast } = useToast();

  const [savedReports, setSavedReports] = useState<DiagnosticReport[]>([]);
  const [currentReport, setCurrentReport] = useState<DiagnosticReport | null>(null);
  const [selectedWindow, setSelectedWindow] = useState<ReportWindow>(30);
  const [generating, setGenerating] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [styleMode, setStyleMode] = useState<'Discipline' | 'Balanced' | 'Mindful'>('Balanced');
  const [loggedDayCounts, setLoggedDayCounts] = useState<Record<number, number>>({});
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);

  const isMindful = styleMode === 'Mindful';
  const shadowStyle = { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 3 };

  // Locked when the current report for THIS window came back insufficient.
  // Switching to a different window clears it.
  const preCheckCount = loggedDayCounts[selectedWindow] ?? null;
  const isBlocked = initialized && (
    (!!currentReport?.insufficientData && currentReport.windowDays === selectedWindow) ||
    (preCheckCount !== null && preCheckCount < minDaysForWindow(selectedWindow))
  );
  const needsRegenerate = !!currentReport && currentReport.windowDays !== selectedWindow;

  useFocusEffect(
    useCallback(() => {
      setInitialized(false);
      const load = async () => {
        try {
          const s = await AsyncStorage.getItem('pj_settings');
          if (s) { const d = JSON.parse(s); if (d.styleMode) setStyleMode(d.styleMode); }
        } catch {}
        const reports = await loadSavedReports();
        setSavedReports(reports);
        if (reports.length > 0) {
          setCurrentReport(reports[0]);
          setSelectedWindow(reports[0].windowDays);
        }
        const [c14, c30, c90] = await Promise.all([
          countLoggedDaysInWindow(14),
          countLoggedDaysInWindow(30),
          countLoggedDaysInWindow(90),
        ]);
        setLoggedDayCounts({ 14: c14, 30: c30, 90: c90 });
        setInitialized(true);
      };
      load();
    }, [])
  );

  const handleGenerate = async () => {
    setGenerating(true);
    setShowAllSuggestions(false);
    try {
      const report = await generateDiagnosticReport(selectedWindow);
      await saveReport(report);
      const updated = await loadSavedReports();
      setSavedReports(updated);
      setCurrentReport(updated[0]);
    } catch {
      showToast('Could not generate report -- try again', undefined, 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteArchive = (id: string) => {
    Alert.alert('Delete Report', 'Remove this saved report?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await deleteReport(id);
        const updated = await loadSavedReports();
        setSavedReports(updated);
        if (currentReport?.id === id) setCurrentReport(updated[0] ?? null);
      }},
    ]);
  };

  const archiveReports = savedReports.filter(r => r.id !== currentReport?.id);

  return (
    <View style={{ flex: 1, backgroundColor: t.bgPrimary }}>
      <ToastRenderer />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={22} color={t.accentBlueRaw} />
          <Text style={[styles.backText, { color: t.accentBlueRaw }]}>Stats</Text>
        </TouchableOpacity>
        <TooltipIcon tooltipKey="effort_vs_results" size={22} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>

        {/* Title */}
        <View style={{ paddingHorizontal: 4, marginBottom: 16 }}>
          <Text style={[styles.heroTitle, { color: t.accentBlueRaw }]}>{'EFFORT VS\nRESULTS'}</Text>
        </View>

        {/* Window picker */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {([14, 30, 90] as ReportWindow[]).map(w => (
            <TouchableOpacity
              key={w}
              onPress={() => setSelectedWindow(w)}
              style={{
                flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: 'center',
                backgroundColor: selectedWindow === w ? t.accentBlueBg : t.bgCard,
                borderWidth: 1, borderColor: selectedWindow === w ? t.accentBlueBorder : t.borderCard,
              }}
            >
              <Text style={{ fontSize: 13, fontFamily: 'DMSans_600SemiBold', color: selectedWindow === w ? t.accentBlueRaw : t.textMuted }}>
                {w === 14 ? '14 days' : w === 30 ? '30 days' : '90 days'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={{ alignItems: 'center', marginTop: 6, marginBottom: 12 }}>
          <View style={{ backgroundColor: t.accentBlueBg, borderWidth: 1, borderColor: t.accentBlueBorder, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5 }}>
            <Text style={{ fontSize: 11, fontFamily: 'DMSans_700Bold', letterSpacing: 2, textTransform: 'uppercase', color: t.accentBlueRaw }}>
              {windowDateRange(selectedWindow)}
            </Text>
          </View>
        </View>

        {/* Generate button */}
        <TouchableOpacity
          onPress={handleGenerate}
          disabled={!initialized || generating || isBlocked}
          style={{
            backgroundColor: t.accentBlueRaw,
            borderRadius: 10, paddingVertical: 14, alignItems: 'center',
            marginBottom: 20,
            opacity: !initialized ? 0.4 : generating ? 0.7 : isBlocked ? 0.4 : 1,
          }}
        >
          {generating ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={{ fontSize: 14, fontFamily: 'DMSans_600SemiBold', color: '#fff' }}>Analyzing your data...</Text>
            </View>
          ) : (
            <Text style={{ fontSize: 14, fontFamily: 'DMSans_600SemiBold', color: '#fff' }}>
              {!currentReport ? 'Generate Analysis' : needsRegenerate ? `Regenerate for ${selectedWindow} days` : 'Regenerate'}
            </Text>
          )}
        </TouchableOpacity>

        {/* Empty state */}
        {!currentReport && !generating && (
          isBlocked ? (
            <View style={[styles.card, { backgroundColor: t.bgCard, borderColor: t.borderCard, borderTopColor: t.accentBlueRaw, ...shadowStyle, alignItems: 'center', paddingVertical: 36 }]}>
              <Ionicons name="calendar-outline" size={48} color={t.textMuted} style={{ marginBottom: 14 }} />
              <Text style={{ fontSize: 18, fontFamily: 'BebasNeue_400Regular', color: t.textPrimary, letterSpacing: 1, marginBottom: 8 }}>Not Enough Data Yet</Text>
              <Text style={{ fontSize: 13, fontFamily: 'DMSans_400Regular', color: t.textSecondary, textAlign: 'center', lineHeight: 20, paddingHorizontal: 8 }}>
                {`You have ${preCheckCount ?? 0} of ${minDaysForWindow(selectedWindow)} days logged in the ${selectedWindow}-day window. Keep logging your meals — the report unlocks when you hit ${minDaysForWindow(selectedWindow)}.`}
              </Text>
              <Text style={{ fontSize: 11, fontFamily: 'DMSans_400Regular', color: t.textMuted, textAlign: 'center', lineHeight: 18, marginTop: 12, paddingHorizontal: 8 }}>
                Try a shorter window above if you have enough data there.
              </Text>
            </View>
          ) : (
            <View style={[styles.card, { backgroundColor: t.bgCard, borderColor: t.borderCard, borderTopColor: t.accentBlueRaw, ...shadowStyle, alignItems: 'center', paddingVertical: 36 }]}>
              <Ionicons name="analytics-outline" size={48} color={t.textMuted} style={{ marginBottom: 14 }} />
              <Text style={{ fontSize: 18, fontFamily: 'BebasNeue_400Regular', color: t.textPrimary, letterSpacing: 1, marginBottom: 8 }}>No Analysis Yet</Text>
              <Text style={{ fontSize: 13, fontFamily: 'DMSans_400Regular', color: t.textSecondary, textAlign: 'center', lineHeight: 20, paddingHorizontal: 8 }}>
                Select a window above and tap Generate to see what your logged data says about your results.
              </Text>
              <Text style={{ fontSize: 11, fontFamily: 'DMSans_400Regular', color: t.textMuted, textAlign: 'center', lineHeight: 18, marginTop: 12, paddingHorizontal: 8 }}>
                More data = more accurate findings. The report only works with what you've logged.
              </Text>
            </View>
          )
        )}

        {/* Report content */}
        {currentReport && !generating && (
          <>
            {/* Summary */}
            <View style={[styles.card, { backgroundColor: t.bgCard, borderColor: t.borderCard, borderTopColor: t.accentBlueRaw, ...shadowStyle }]}>
              <Ionicons name="analytics" size={130} color={t.accentBlueRaw} style={{ position: 'absolute', right: -24, bottom: -28, opacity: 0.08 }} />
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={[styles.cardLabel, { color: t.textMuted }]}>SUMMARY</Text>
                <TouchableOpacity onPress={() => handleDeleteArchive(currentReport.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="trash-outline" size={16} color={t.statusBad} />
                </TouchableOpacity>
              </View>
              <Text style={{ fontSize: 14, fontFamily: 'DMSans_400Regular', color: t.textSecondary, lineHeight: 22 }}>
                {currentReport.summary}
              </Text>
              {currentReport.insufficientData && (
                <View style={{ marginTop: 12, backgroundColor: t.statusWarn + '18', borderRadius: 8, padding: 12, borderLeftWidth: 3, borderLeftColor: t.statusWarn }}>
                  <Text style={{ fontSize: 12, fontFamily: 'DMSans_600SemiBold', color: t.statusWarn, marginBottom: 2 }}>Needs more data</Text>
                  <Text style={{ fontSize: 12, fontFamily: 'DMSans_400Regular', color: t.textSecondary, lineHeight: 18 }}>
                    Log food for at least 7 days in this window to unlock the full analysis.
                  </Text>
                </View>
              )}
            </View>

            {/* Finding cards */}
            {!currentReport.insufficientData && (
              <>
                <ConsistencyCard f={currentReport.consistency} isMindful={isMindful} theme={t} shadowStyle={shadowStyle} />
                {currentReport.deficit && <DeficitCard f={currentReport.deficit} isMindful={isMindful} theme={t} shadowStyle={shadowStyle} />}
                {currentReport.burnAccuracy && <BurnAccuracyCard f={currentReport.burnAccuracy} isMindful={isMindful} theme={t} shadowStyle={shadowStyle} />}
                {currentReport.macros && <MacroCard f={currentReport.macros} isMindful={isMindful} theme={t} shadowStyle={shadowStyle} />}
                {currentReport.sleep && <SleepCard f={currentReport.sleep} isMindful={isMindful} theme={t} shadowStyle={shadowStyle} />}

                {/* Correlations */}
                {currentReport.correlations && currentReport.correlations.correlations.length > 0 && (
                  <View style={[styles.card, { backgroundColor: t.bgCard, borderColor: t.borderCard, borderTopColor: t.accentBlueRaw, ...shadowStyle }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                      <ChipLabel label="PATTERNS IN YOUR DATA" theme={t} />
                      <TooltipIcon tooltipKey="diagnostic_correlations" />
                    </View>
                    {currentReport.correlations.correlations.map((c, i) => (
                      <View key={c.id}>
                        {i > 0 && <View style={{ height: 0.5, backgroundColor: t.borderSubtle, marginVertical: 12 }} />}
                        <Text style={{ fontSize: 14, fontFamily: 'DMSans_600SemiBold', color: t.textPrimary, lineHeight: 20, marginBottom: 4 }}>
                          {c.headline}
                        </Text>
                        <Text style={{ fontSize: 12, fontFamily: 'DMSans_400Regular', color: t.textSecondary, lineHeight: 18 }}>
                          {c.detail}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Suggestions */}
                {currentReport.suggestions.length > 0 && (
                  <View>
                    <Text style={[styles.sectionLabel, { color: t.textMuted }]}>
                      {isMindful ? 'THINGS TO EXPLORE' : 'YOUR TOP SUGGESTIONS'}
                    </Text>
                    {(showAllSuggestions ? currentReport.suggestions : currentReport.suggestions.slice(0, 3)).map(s => (
                      <View key={s.rank} style={[styles.card, { backgroundColor: t.bgCard, borderColor: t.borderCard, borderTopColor: t.accentBlueRaw, borderLeftWidth: 3, borderLeftColor: t.accentBlueRaw, ...shadowStyle, flexDirection: 'row', gap: 12 }]}>
                        <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: t.accentBlueBg, borderWidth: 1, borderColor: t.accentBlueBorder, alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0 }}>
                          <Text style={{ fontSize: 11, fontFamily: 'DMSans_700Bold', color: t.accentBlueRaw }}>{s.rank}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 14, fontFamily: 'DMSans_600SemiBold', color: t.textPrimary, lineHeight: 20, marginBottom: 4 }}>{s.headline}</Text>
                          <Text style={{ fontSize: 12, fontFamily: 'DMSans_400Regular', color: t.textSecondary, lineHeight: 18 }}>{s.detail}</Text>
                        </View>
                      </View>
                    ))}
                    {currentReport.suggestions.length > 3 && (
                      <TouchableOpacity
                        onPress={() => setShowAllSuggestions(v => !v)}
                        style={{ alignItems: 'center', paddingVertical: 10 }}
                      >
                        <Text style={{ fontSize: 12, fontFamily: 'DMSans_600SemiBold', color: t.accentBlueRaw }}>
                          {showAllSuggestions ? 'Show less' : `Show ${currentReport.suggestions.length - 3} more`}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* Disclaimer */}
                <Text style={{ fontSize: 10, fontFamily: 'DMSans_400Regular', color: t.textMuted, textAlign: 'center', lineHeight: 16, paddingHorizontal: 16 }}>
                  Based on your logged data only. For informational purposes only. Not medical advice.
                </Text>
              </>
            )}
          </>
        )}

        {/* Report history */}
        {archiveReports.length > 0 && (
          <View style={{ marginTop: 8 }}>
            <Text style={[styles.sectionLabel, { color: t.textMuted }]}>REPORT HISTORY</Text>
            {archiveReports.map(r => (
              <View key={r.id} style={[styles.card, { backgroundColor: t.bgCard, borderColor: t.borderCard, borderTopColor: t.borderCard, ...shadowStyle, flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontFamily: 'DMSans_600SemiBold', color: t.textPrimary }}>
                    {fmtDate(r.dateRangeStart)} – {fmtDateFull(r.dateRangeEnd)}
                  </Text>
                  <Text style={{ fontSize: 11, fontFamily: 'DMSans_400Regular', color: t.textSecondary, marginTop: 2 }}>
                    {r.windowDays}d window · {r.insufficientData ? 'Insufficient data' : `${r.minLoggedDays} days logged`}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleDeleteArchive(r.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="trash-outline" size={16} color={t.statusBad} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  backText: {
    fontSize: 15,
    fontFamily: 'DMSans_400Regular',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 12,
  },
  heroTitle: {
    fontSize: 48,
    fontFamily: 'BebasNeue_400Regular',
    letterSpacing: 3,
    lineHeight: 52,
  },
  card: {
    borderRadius: 14,
    borderWidth: 0.5,
    borderTopWidth: 1.5,
    padding: 16,
  },
  cardLabel: {
    fontSize: 9,
    fontFamily: 'DMSans_700Bold',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  sectionLabel: {
    fontSize: 9,
    fontFamily: 'DMSans_700Bold',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  noteText: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    lineHeight: 18,
    marginTop: 10,
  },
});
