import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ToastRenderer, useToast } from '../components/Toast';
import TooltipIcon from '../components/TooltipIcon';
import { useTheme } from '../theme';
import { useTutorial } from '../context/TutorialContext';
import { useTutorialTarget } from '../hooks/useTutorialTarget';
import {
  BurnAccuracyFinding,
  ConsistencyFinding,
  DeficitFinding,
  DiagnosticCard,
  DiagnosticReport,
  FindingStatus,
  MacroFinding,
  ReportWindow,
  SleepFinding,
  deleteReport,
  loadSavedReports,
} from '../utils/diagnosticReport';
import {
  SmartTipsStore,
  StoredTip,
  CoachTipCache,
  TIPS_GATED,
  computeAndStoreSmartTips,
  isCrossSignalRule,
  loadCoachTipCache,
  loadCoachTipCacheEvr,
  loadSmartTips,
} from '../utils/smartTipsEngine';
import { refreshCoachTipEvr, resolveTipBody, resolveTipTitle, voiceDiagnosticCards } from '../utils/coachAI';

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

function windowLabel(windowDays: ReportWindow): string {
  return windowDays === 14 ? '14-Day' : windowDays === 30 ? '30-Day' : '90-Day';
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
      <Text style={{ fontSize: 12, fontFamily: 'DMSans_600SemiBold', color: valueColor ?? theme.textSecondary }}>{value}</Text>
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
      <Text style={{ fontSize: 18, fontFamily: 'BebasNeue_400Regular', color: theme.textSecondary, letterSpacing: 1, marginBottom: children ? 10 : 0, lineHeight: 22 }}>
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
  const gapColor = !isMindful && f.gapLbs != null && f.gapLbs > 0.3 ? theme.statusWarn : theme.textSecondary;
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
  const proteinColor = !isMindful && f.macroStatus !== 'good' ? theme.statusWarn : theme.textSecondary;
  const fiberColor = !isMindful && f.fiberStatus !== 'good' ? theme.statusWarn : theme.textSecondary;
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

function SleepCard({ f, isMindful, theme, shadowStyle }: { f: any; isMindful: boolean; theme: any; shadowStyle: any }) {
  const headline = f.avgSleepScore !== null
    ? `Avg sleep score: ${f.avgSleepScore} over ${f.totalSleepDays} nights`
    : `Avg ${f.avgSleepHours}h/night over ${f.totalSleepDays} nights`;
  const scoreColor = !isMindful && f.status !== 'good' ? theme.statusWarn : theme.textSecondary;
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

// ── Diagnostic card feed (track 2 surface) ───────────────────────────────────────
// Renders one ranked DiagnosticCard: claim (headline) + proof (the number, prominent)
// + insight (AI context line, when voiced) + lever (the action, NEVER labeled "lever").
// Replaces the old fixed scorecard finding cards. Mindful hides the status chip; full
// Mindful lever-suppression is a later sub-step (voicer already softens copy in Mindful).
function DiagnosticFeedCard({ card, theme, shadowStyle, isMindful }: { card: DiagnosticCard; theme: any; shadowStyle: any; isMindful: boolean }) {
  const t = theme;
  const accent = card.positive ? t.statusGood : (card.tone === 'factor' ? t.statusBad : t.statusWarn);
  const chip = card.positive ? 'WORKING' : (card.tone === 'factor' ? 'KEY FACTOR' : 'WORTH ATTENTION');
  return (
    <View style={[styles.card, { backgroundColor: t.bgCard, borderColor: t.borderCard, borderTopColor: accent, ...shadowStyle, marginBottom: 12 }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text style={[styles.cardLabel, { color: t.textMuted }]}>{(card.window || '').toUpperCase()}</Text>
        {!isMindful && (
          <View style={{ backgroundColor: accent + '22', borderColor: accent + '55', borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
            <Text style={{ fontSize: 9, letterSpacing: 1.5, fontFamily: 'DMSans_700Bold', color: accent }}>{chip}</Text>
          </View>
        )}
      </View>
      <Text style={{ fontSize: 16, fontFamily: 'DMSans_700Bold', color: t.textPrimary, lineHeight: 22, marginBottom: 8 }}>{card.claim}</Text>
      <Text style={{ fontSize: 14, fontFamily: 'DMSans_600SemiBold', color: accent, marginBottom: card.insight ? 8 : 10 }}>{card.proof}</Text>
      {card.insight ? (
        <Text style={{ fontSize: 13, fontFamily: 'DMSans_400Regular', color: t.textSecondary, lineHeight: 20, marginBottom: 10 }}>{card.insight}</Text>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 7 }}>
        <Text style={{ fontSize: 14, color: t.accentBlueRaw, marginTop: 1, fontFamily: 'DMSans_700Bold' }}>→</Text>
        <Text style={{ flex: 1, fontSize: 13, fontFamily: 'DMSans_600SemiBold', color: t.textPrimary, lineHeight: 20 }}>{card.lever}</Text>
      </View>
    </View>
  );
}

// ── Smart Tip cards ────────────────────────────────────────────────────────────

function InsightTipCard({ tip, isBlurred, theme, shadowStyle }: { tip: StoredTip; isBlurred: boolean; theme: any; shadowStyle: any }) {
  const chipLabel = tip.positive ? 'CORRELATION: POSITIVE' : 'CORRELATION: INSIGHT';
  if (isBlurred) {
    return (
      <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: theme.accentBlueRaw, ...shadowStyle }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <ChipLabel label="INSIGHT" theme={theme} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="lock-closed" size={12} color={theme.textMuted} />
            <View style={{ backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
              <Text style={{ fontSize: 8, fontFamily: 'DMSans_700Bold', letterSpacing: 2, color: theme.accentBlueRaw }}>PRO</Text>
            </View>
          </View>
        </View>
        <Text style={{ fontSize: 14, fontFamily: 'DMSans_600SemiBold', color: theme.textSecondary, lineHeight: 20, marginBottom: 10 }}>
          {tip.title}
        </Text>
        <View style={{ gap: 6 }}>
          <View style={{ height: 10, backgroundColor: theme.textMuted + '30', borderRadius: 4, width: '100%' }} />
          <View style={{ height: 10, backgroundColor: theme.textMuted + '30', borderRadius: 4, width: '82%' }} />
          <View style={{ height: 10, backgroundColor: theme.textMuted + '20', borderRadius: 4, width: '65%' }} />
        </View>
      </View>
    );
  }
  return (
    <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: theme.accentBlueRaw, ...shadowStyle }]}>
      <View style={{ marginBottom: 10 }}>
        <ChipLabel label={chipLabel} theme={theme} />
      </View>
      <Text style={{ fontSize: 15, fontFamily: 'DMSans_600SemiBold', color: theme.textSecondary, lineHeight: 21, marginBottom: 8 }}>
        {tip.title}
      </Text>
      <Text style={{ fontSize: 13, fontFamily: 'DMSans_400Regular', color: theme.textSecondary, lineHeight: 20 }}>
        {tip.body}
      </Text>
    </View>
  );
}

function SmartTipCard({ tip, theme, shadowStyle }: { tip: StoredTip; theme: any; shadowStyle: any }) {
  const borderColor = tip.positive ? theme.statusGood : tip.tier === 'urgent' ? theme.statusBad : theme.statusWarn;
  const chipLabel = tip.positive ? 'POSITIVE' : tip.tier.toUpperCase();
  const chipColor = tip.positive ? theme.statusGood : tip.tier === 'urgent' ? theme.statusBad : theme.statusWarn;
  return (
    <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: borderColor, ...shadowStyle }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <View style={{ backgroundColor: chipColor + '22', borderWidth: 1, borderColor: chipColor + '55', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
          <Text style={{ fontSize: 9, fontFamily: 'DMSans_700Bold', letterSpacing: 2, color: chipColor }}>{chipLabel}</Text>
        </View>
      </View>
      <Text style={{ fontSize: 14, fontFamily: 'DMSans_600SemiBold', color: theme.textSecondary, lineHeight: 20, marginBottom: 6 }}>
        {tip.title}
      </Text>
      <Text style={{ fontSize: 12, fontFamily: 'DMSans_400Regular', color: theme.textSecondary, lineHeight: 18 }}>
        {tip.body}
      </Text>
    </View>
  );
}

// ── Tutorial demo report ───────────────────────────────────────────────────────

const TUTORIAL_DEMO_REPORT: DiagnosticReport = {
  id: 'tutorial_demo',
  generatedAt: new Date().toISOString(),
  windowDays: 30,
  dateRangeStart: '2026-04-28',
  dateRangeEnd: '2026-05-27',
  goalDirection: 'lose',
  summary: 'You logged 22 of 30 days. Your calorie deficit looks solid on paper, but sleep quality and weekend patterns are likely holding back your results.',
  insufficientData: false,
  minLoggedDays: 22,
  consistency: { type: 'consistency', status: 'attention', loggedDays: 22, totalDays: 30, suspectDays: 2, excludedDays: 0, rate: 0.73 },
  deficit: { type: 'deficit', status: 'good', goalDirection: 'lose', avgDailyDeficit: -340, expectedChangeLbs: 2.9, actualChangeLbs: -1.6, gapLbs: 1.3, loggedDays: 22, hasWeightData: true },
  burnAccuracy: { type: 'burnAccuracy', status: 'attention', burnAccuracyPct: 100, avgActiveCalPerDay: 480, isFlagged: true },
  macros: { type: 'macros', status: 'attention', macroStatus: 'attention', fiberStatus: 'good', avgProtein: 112, proteinGoalMin: 140, proteinGoalMax: 160, avgFiber: 28, hasData: true, bodyWeightLbs: 185, lowFiberNote: false },
  sleep: { type: 'sleep', status: 'attention', avgSleepScore: 61, avgSleepHours: 6.4, totalSleepDays: 18, poorSleepCalDelta: 180, hasEnoughData: true },
  correlations: {
    type: 'correlations',
    correlations: [
      { id: 'sleep_intake', headline: 'After nights under 6 hours, you logged 180 more calories', detail: 'Sleep deprivation raises ghrelin (hunger) and lowers leptin (fullness). This pattern appeared consistently across your window.' },
      { id: 'weekend_pattern', headline: 'Weekend calories averaged 350 more than weekdays', detail: 'Weekends showed a consistent surplus pattern. Most of the gap between expected and actual weight change comes from these days.' },
    ],
  },
  suggestions: [
    { rank: 1, headline: 'Protect your sleep', detail: 'Getting under 6 hours consistently is adding about 180 extra calories per day through appetite shifts. Prioritizing sleep could close most of your result gap.' },
    { rank: 2, headline: 'Set a weekend calorie buffer', detail: 'Your weekday logging is strong. On weekends, plan for a 200-300 cal higher limit rather than trying to match weekday strictness.' },
    { rank: 3, headline: 'Adjust your burn estimate', detail: 'Your burn accuracy is at 100%. Most wearables overestimate by 15-25%. Try 85% in Settings > Health for more accurate math.' },
  ],
  cards: [
    { id: 'weekend_weekday', claim: 'Weekends are erasing your weekday deficit.', proof: 'Weekdays 1,820 cal · weekends 2,310 cal', lever: 'Give weekends the same loose plan you give weekdays and the deficit holds.', window: 'Weekends, last 30 days', strength: 86, tone: 'factor', positive: false },
    { id: 'sleep_nextday_cals', claim: 'Short sleep is pushing your intake up the next day.', proof: 'After poor sleep: +180 cal the next day', lever: 'Protect a consistent bedtime. It moves your intake more than willpower does.', window: 'Last 30 days', strength: 72, tone: 'attention', positive: false },
    { id: 'deficit', claim: 'Your results are lagging what your logging predicts.', proof: 'Predicted: lost 2.9 lbs · Actual: lost 1.6 lbs', lever: 'The gap usually hides in unlogged days or an overstated calorie burn. Tighten one.', window: 'Over 30 days', strength: 68, tone: 'attention', positive: false },
  ],
};

// ── Main screen ────────────────────────────────────────────────────────────────

export default function DiagnosticReportViewScreen() {
  const insets = useSafeAreaInsets();
  const { theme: t } = useTheme();
  const { showToast } = useToast();
  const { id, tutorial } = useLocalSearchParams<{ id?: string; tutorial?: string }>();
  const isTutorialMode = tutorial === '1';

  const { registerScrollView, unregisterScrollView } = useTutorial();
  const findingsSectionRef = useTutorialTarget('evr_findings_section');
  const correlationsRef    = useTutorialTarget('evr_correlations');
  const suggestionsRef     = useTutorialTarget('evr_suggestions');
  const scrollRef = useRef<any>(null);

  const [report, setReport]       = useState<DiagnosticReport | null>(isTutorialMode ? TUTORIAL_DEMO_REPORT : null);
  const [styleMode, setStyleMode] = useState<'Discipline' | 'Balanced' | 'Mindful'>('Balanced');
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);
  const [notFound, setNotFound]   = useState(false);
  const [smartTips, setSmartTips] = useState<SmartTipsStore | null>(null);
  const [coachCache, setCoachCache] = useState<CoachTipCache | null>(null);
  const [coachLoading, setCoachLoading] = useState(false);
  // Voiced diagnostic card feed: show deterministic cards instantly, upgrade to AI-voiced
  // (claim/lever rewritten + insight added) when the batched call returns. Proof is never
  // sent for editing, so numbers stay exact. Falls back to deterministic on any failure.
  const [voicedCards, setVoicedCards] = useState<DiagnosticCard[] | null>(
    isTutorialMode ? (TUTORIAL_DEMO_REPORT.cards ?? null) : null
  );

  const isMindful = styleMode === 'Mindful';
  const shadowStyle = { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 3 };

  useEffect(() => {
    registerScrollView('effort_vs_results_view', scrollRef);
    return () => unregisterScrollView('effort_vs_results_view');
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (isTutorialMode) return;
      const load = async () => {
        let mode: 'Discipline' | 'Balanced' | 'Mindful' = 'Balanced';
        try {
          const s = await AsyncStorage.getItem('pj_settings');
          if (s) { const d = JSON.parse(s); if (d.styleMode) { setStyleMode(d.styleMode); mode = d.styleMode; } }
        } catch {}
        if (!id) { setNotFound(true); return; }
        const reports = await loadSavedReports();
        const found = reports.find(r => r.id === decodeURIComponent(id));
        if (!found) { setNotFound(true); return; }
        setReport(found);
        // Card feed: deterministic instantly, then voice in the background and upgrade.
        const baseCards = found.cards ?? [];
        setVoicedCards(baseCards);
        if (baseCards.length > 0) {
          voiceDiagnosticCards(baseCards, mode).then(setVoicedCards).catch(() => {});
        }
        // Load stored Smart Tips for instant display, then refresh in background
        const stored = await loadSmartTips();
        if (stored) setSmartTips(stored);
        computeAndStoreSmartTips().then(fresh => setSmartTips(fresh)).catch(() => {});
        // Load EvR coach tip: show cached instantly, then refresh in background.
        // Home ruleId is passed so EvR never repeats the same scenario as the home card.
        const windowDays = found.windowDays as 14 | 30 | 90;
        const [cachedEvr, homeCache] = await Promise.all([
          loadCoachTipCacheEvr(windowDays),
          loadCoachTipCache(),
        ]);
        if (cachedEvr) { setCoachCache(cachedEvr); } else { setCoachLoading(true); }
        const homeRuleId = homeCache?.packet.ruleId ?? null;
        refreshCoachTipEvr(windowDays, homeRuleId)
          .then(cache => { setCoachCache(cache); setCoachLoading(false); })
          .catch(() => setCoachLoading(false));
      };
      load();
    }, [id, isTutorialMode])
  );

  const handleDelete = () => {
    if (!report || isTutorialMode) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      'Delete Report',
      'Remove this saved report? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteReport(report.id);
            showToast('Report deleted', undefined, 'success');
            router.back();
          },
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bgPrimary }}>
      <ToastRenderer />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); router.back(); }} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={22} color={t.accentBlueRaw} />
          <Text style={[styles.backText, { color: t.accentBlueRaw }]}>Reports</Text>
        </TouchableOpacity>
        {report && !isTutorialMode && (
          <TouchableOpacity onPress={handleDelete} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ padding: 4 }}>
            <Ionicons name="trash-outline" size={20} color={t.statusBad} />
          </TouchableOpacity>
        )}
      </View>

      {/* Not found state */}
      {notFound && (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <Ionicons name="alert-circle-outline" size={48} color={t.textMuted} style={{ marginBottom: 14 }} />
          <Text style={{ fontSize: 18, fontFamily: 'BebasNeue_400Regular', color: t.textPrimary, letterSpacing: 1, marginBottom: 8 }}>Report Not Found</Text>
          <Text style={{ fontSize: 13, fontFamily: 'DMSans_400Regular', color: t.textSecondary, textAlign: 'center', lineHeight: 20 }}>
            This report may have been deleted.
          </Text>
          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
            <Text style={{ fontSize: 14, fontFamily: 'DMSans_600SemiBold', color: t.accentBlueRaw }}>Go back</Text>
          </TouchableOpacity>
        </View>
      )}

      {report && (
        <ScrollView ref={scrollRef} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>

          {/* Title + window info */}
          <View style={{ paddingHorizontal: 4, marginBottom: 8, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <Text style={[styles.heroTitle, { color: t.accentBlueRaw }]}>{'EFFORT VS\nRESULTS'}</Text>
            <TooltipIcon tooltipKey="effort_vs_results" size={18} />
          </View>

          {/* Window + date range pill */}
          <View style={{ alignItems: 'flex-start', marginBottom: 16 }}>
            <View style={{ backgroundColor: t.accentBlueBg, borderWidth: 1, borderColor: t.accentBlueBorder, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5 }}>
              <Text style={{ fontSize: 11, fontFamily: 'DMSans_700Bold', letterSpacing: 2, textTransform: 'uppercase', color: t.accentBlueRaw }}>
                {windowLabel(report.windowDays)}  ·  {fmtDate(report.dateRangeStart)} – {fmtDateFull(report.dateRangeEnd)}
              </Text>
            </View>
          </View>

          {/* Summary */}
          <View style={[styles.card, { backgroundColor: t.bgCard, borderColor: t.borderCard, borderTopColor: t.accentBlueRaw, ...shadowStyle, overflow: 'hidden' }]}>
            <Ionicons name="analytics" size={130} color={t.accentBlueRaw} style={{ position: 'absolute', right: -24, bottom: -28, opacity: 0.08 }} />
            <Text style={[styles.cardLabel, { color: t.textMuted, marginBottom: 8 }]}>SUMMARY</Text>
            <Text style={{ fontSize: 14, fontFamily: 'DMSans_400Regular', color: t.textSecondary, lineHeight: 22 }}>
              {report.summary}
            </Text>
            {report.insufficientData && (
              <View style={{ marginTop: 12, backgroundColor: t.statusWarn + '18', borderRadius: 8, padding: 12, borderLeftWidth: 3, borderLeftColor: t.statusWarn }}>
                <Text style={{ fontSize: 12, fontFamily: 'DMSans_600SemiBold', color: t.statusWarn, marginBottom: 2 }}>Needs more data</Text>
                <Text style={{ fontSize: 12, fontFamily: 'DMSans_400Regular', color: t.textSecondary, lineHeight: 18 }}>
                  Log food for at least 7 days in this window to unlock the full analysis.
                </Text>
              </View>
            )}
          </View>

          {/* Diagnostic card feed (claim + proof + lever) -- replaces the old scorecard finding cards */}
          {!report.insufficientData && (
            <>
              <View ref={findingsSectionRef} collapsable={false}>
                {(voicedCards ?? report.cards ?? []).length > 0 ? (
                  (voicedCards ?? report.cards ?? []).map((c, i) => (
                    <DiagnosticFeedCard key={`${c.id}-${i}`} card={c} theme={t} shadowStyle={shadowStyle} isMindful={isMindful} />
                  ))
                ) : (
                  <View style={[styles.card, { backgroundColor: t.bgCard, borderColor: t.borderCard, borderTopColor: 'rgba(255,255,255,0.1)', ...shadowStyle }]}>
                    <Text style={{ fontSize: 13, fontFamily: 'DMSans_400Regular', color: t.textSecondary, lineHeight: 20 }}>
                      Nothing stands out in this window. Keep logging and patterns will surface here as they develop.
                    </Text>
                  </View>
                )}
              </View>

              {/* AI Coach Insight card */}
              {TIPS_GATED ? (
                <View style={{ marginBottom: 12 }}>
                  <Text style={[styles.sectionLabel, { color: t.textMuted }]}>COACH INSIGHT</Text>
                  <View style={[shadowStyle, {
                    backgroundColor: t.bgCard, borderRadius: 14, borderWidth: 0.5,
                    borderColor: t.borderCard, borderTopColor: 'rgba(255,255,255,0.1)',
                    borderLeftWidth: 3, borderLeftColor: t.accentBlueRaw, padding: 16, paddingLeft: 15,
                  }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="sparkles" size={13} color={t.accentBlueRaw} />
                        <Text style={{ fontSize: 9, letterSpacing: 3, color: t.textMuted, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase' }}>Coach Insight</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="lock-closed" size={12} color={t.textMuted} />
                        <View style={{ backgroundColor: t.accentBlueBg, borderWidth: 1, borderColor: t.accentBlueBorder, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 8, fontFamily: 'DMSans_700Bold', letterSpacing: 2, color: t.accentBlueRaw }}>PRO</Text>
                        </View>
                      </View>
                    </View>
                    <View style={{ gap: 6 }}>
                      <View style={{ height: 10, backgroundColor: t.textMuted + '30', borderRadius: 4, width: '100%' }} />
                      <View style={{ height: 10, backgroundColor: t.textMuted + '30', borderRadius: 4, width: '82%' }} />
                      <View style={{ height: 10, backgroundColor: t.textMuted + '20', borderRadius: 4, width: '65%' }} />
                    </View>
                  </View>
                </View>
              ) : (coachLoading || !!coachCache) && (() => {
                if (coachLoading && !coachCache) {
                  return (
                    <View style={{ marginBottom: 12 }}>
                      <Text style={[styles.sectionLabel, { color: t.textMuted }]}>COACH INSIGHT</Text>
                      <View style={[shadowStyle, {
                        backgroundColor: t.bgCard, borderRadius: 14, borderWidth: 0.5,
                        borderColor: t.borderCard, borderTopColor: 'rgba(255,255,255,0.1)',
                        borderLeftWidth: 3, borderLeftColor: t.accentBlueRaw, padding: 16, paddingLeft: 15,
                      }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <ActivityIndicator size="small" color={t.accentBlueRaw} />
                          <Text style={{ fontSize: 13, fontFamily: 'DMSans_400Regular', color: t.textMuted, fontStyle: 'italic' }}>Analyzing your data...</Text>
                        </View>
                      </View>
                    </View>
                  );
                }
                if (!coachCache) return null;
                const body = resolveTipBody(coachCache);
                const title = resolveTipTitle(coachCache);
                const tone = coachCache.packet.tone;
                const borderColor = tone === 'positive' ? t.statusGood : tone === 'care' ? t.statusBad : t.accentBlueRaw;
                if (!body) return null;
                return (
                  <View style={{ marginBottom: 12 }}>
                    <Text style={[styles.sectionLabel, { color: t.textMuted }]}>COACH INSIGHT</Text>
                    <View style={[shadowStyle, {
                      backgroundColor: t.bgCard, borderRadius: 14, borderWidth: 0.5,
                      borderColor: t.borderCard, borderTopColor: 'rgba(255,255,255,0.1)',
                      borderLeftWidth: 3, borderLeftColor: borderColor, padding: 16, paddingLeft: 15,
                    }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <Ionicons name="sparkles" size={13} color={borderColor} />
                        <Text style={{ fontSize: 9, letterSpacing: 3, color: t.textMuted, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase' }}>
                          {tone === 'positive' ? 'Positive' : tone === 'care' ? 'Heads Up' : tone === 'educational' ? 'Insight' : 'Focus Area'}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 14, fontFamily: 'DMSans_600SemiBold', color: t.textSecondary, lineHeight: 20, marginBottom: 8 }}>{title}</Text>
                      <Text style={{ fontSize: 13, fontFamily: 'DMSans_400Regular', color: t.textSecondary, lineHeight: 20 }}>{body}</Text>
                    </View>
                  </View>
                );
              })()}

              {/* Smart Tips: cross-signal insight cards (gated) */}
              {(() => {
                const insightTips = (smartTips?.activeTips ?? [])
                  .filter(tip => isCrossSignalRule(tip.ruleId))
                  .slice(0, 5);
                if (!insightTips.length) return null;
                return (
                  <View ref={correlationsRef} collapsable={false}>
                    <Text style={[styles.sectionLabel, { color: t.textMuted }]}>PATTERNS IN YOUR DATA</Text>
                    {insightTips.map((tip, idx) => {
                      const isBlurred = TIPS_GATED && idx > 0;
                      return <InsightTipCard key={tip.id} tip={tip} isBlurred={isBlurred} theme={t} shadowStyle={shadowStyle} />;
                    })}
                  </View>
                );
              })()}

              {/* Disclaimer */}
              <Text style={{ fontSize: 10, fontFamily: 'DMSans_400Regular', color: t.textMuted, textAlign: 'center', lineHeight: 16, paddingHorizontal: 16 }}>
                Based on your logged data only. For informational purposes only. Not medical advice.
              </Text>
            </>
          )}

        </ScrollView>
      )}
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
