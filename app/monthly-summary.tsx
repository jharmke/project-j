import { Ionicons } from '@/components/AppIcons';
import { Text } from '@/components/AppText';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { useMembership } from '../MembershipContext';
import { ScoreRing } from '../components/DaySummaryModal';
import DaySummaryModal from '../components/DaySummaryModal';
import TooltipIcon from '../components/TooltipIcon';
import { CardWash } from '../components/GradientCard';
import { scoreLabel, StyleMode, CAL_MAX, PROTEIN_MAX, WATER_MAX } from '../utils/dayScore';
import { loadMonthlySummary, MonthlySummaryData, MonthDayEntry } from '../utils/monthlySummary';
import { cancelMonthlySummaryNotification } from '../services/notifications';
import { TIPS_GATED, CoachTipCache, loadCoachTipCache } from '../utils/smartTipsEngine';
import { refreshCoachTipMonthly, resolveTipBody } from '../utils/coachAI';
import { Type, numLine } from '../typography';
import ScreenHeader from '../components/ScreenHeader';
import GradientNumber from '../components/GradientNumber';
import BackgroundLayers from '../components/BackgroundLayers';

const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DOW_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const COLOR_NUTRITION = '#0d9268';
const COLOR_ACTIVITY  = '#d4860a';
const COLOR_RECOVERY  = '#9b7adb';
const COLOR_WEIGHT    = '#888899';

function formatHours(h: number | null): string {
  if (h === null) return '--';
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

function formatNumber(n: number | null, decimals = 0): string {
  if (n === null) return '--';
  return n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function monthDayLabel(dateKey: string): string {
  const [, m, d] = dateKey.split('-').map(Number);
  return `${MONTHS_SHORT[m - 1]} ${d}`;
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size));
  return result;
}

function getPrevMonthKey(mk: string): string {
  const [y, mo] = mk.split('-').map(Number);
  if (mo === 1) return `${y - 1}-12`;
  return `${y}-${String(mo - 1).padStart(2, '0')}`;
}

function SectionCard({ label, icon, score, pct, borderColor, children }: {
  label: string; icon: string; score: number | null; pct: string;
  borderColor: string; children?: React.ReactNode;
}) {
  const { theme } = useTheme();
  // Was '#000' @0.12 on a tight 2/6 blur -- about a third of a normal card, the wrong hue on Light (whose
  // shadow is navy) and invisible on Dark. Nothing clips these, so it always rendered; just weak.
  const shadowStyle = { shadowColor: theme.cardShadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: theme.cardShadowOpacity, shadowRadius: 12, elevation: 6 };
  const barC = score !== null ? borderColor : theme.textDim;
  return (
    <View style={[{
      backgroundColor: theme.bgCard, borderRadius: 14, borderWidth: 0.5,
      borderColor: theme.borderCard, borderTopColor: theme.borderCardTop,
      borderLeftWidth: 0.5, borderLeftColor: theme.borderCard,
      padding: 16, marginBottom: 12,
    }, shadowStyle]}>
      <CardWash color={borderColor} scored={score !== null} />
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 6 }}>
        <Ionicons name={icon as any} size={14} color={barC} />
        <Text style={{ fontSize: 9, letterSpacing: 3, color: theme.textMuted, fontFamily: Type.uiBold, textTransform: 'uppercase', flex: 1 }}>{label}</Text>
        <View style={{ alignItems: 'flex-end' }}>
          {score !== null && (
            <GradientNumber value={String(Math.round(score))} color={barC} style={{ fontSize: 20, lineHeight: numLine(20), fontFamily: Type.num }} />
          )}
          {!!pct && (
            <Text style={{ fontSize: 8, letterSpacing: 0.8, color: theme.textMuted, fontFamily: Type.uiBold }}>{pct}</Text>
          )}
        </View>
      </View>
      {children}
    </View>
  );
}

function StatRow({ label, value, sub, valueColor, labelColor, subNode, deltaStr, deltaColor }: {
  label: string; value: string; sub?: string; valueColor?: string; labelColor?: string; subNode?: React.ReactNode; deltaStr?: string; deltaColor?: string;
}) {
  const { theme } = useTheme();
  return (
    <View style={{ paddingVertical: 8, borderTopWidth: 0.5, borderTopColor: theme.borderCard }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <GradientNumber value={label} color={labelColor ?? theme.textSecondary} style={{ fontSize: 13, fontFamily: Type.uiSemibold }} />
        <View style={{ alignItems: 'flex-end', paddingLeft: 8 }}>
          <GradientNumber value={value} color={valueColor ?? theme.textSecondary} style={{ fontSize: 13, fontFamily: Type.uiSemibold }} />
          {!!deltaStr && (
            <Text style={{ fontSize: 10, color: deltaColor ?? theme.textDim, fontFamily: Type.uiSemibold, marginTop: 1 }}>{deltaStr}</Text>
          )}
        </View>
      </View>
      {subNode ?? (!!sub && <Text style={{ fontSize: 11, color: theme.textMuted, fontFamily: Type.ui, marginTop: 2 }}>{sub}</Text>)}
    </View>
  );
}

function SubBlock({ left, right }: {
  left: { label: string; value: string };
  right?: { label: string; value: string };
}) {
  const { theme } = useTheme();
  return (
    <View style={{ flexDirection: 'row', marginTop: 6 }}>
      <View style={{ flex: 1, alignItems: 'flex-start', paddingLeft: 2 }}>
        <Text style={{ fontSize: 9, fontFamily: Type.uiBold, color: theme.textMuted, letterSpacing: 1.5 }}>{left.label}</Text>
        <GradientNumber value={left.value} color={theme.textSecondary} style={{ fontSize: 13, fontFamily: Type.uiSemibold, marginTop: 1 }} />
      </View>
      {right && (
        <View style={{ flex: 1, alignItems: 'flex-start', paddingLeft: 2 }}>
          <Text style={{ fontSize: 9, fontFamily: Type.uiBold, color: theme.textMuted, letterSpacing: 1.5 }}>{right.label}</Text>
          <GradientNumber value={right.value} color={theme.textSecondary} style={{ fontSize: 13, fontFamily: Type.uiSemibold, marginTop: 1 }} />
        </View>
      )}
    </View>
  );
}

function CalendarGrid({ days, isMindful, theme, onDayPress }: {
  days: MonthDayEntry[];
  isMindful: boolean;
  theme: any;
  onDayPress: (dateKey: string) => void;
}) {
  if (days.length === 0) return null;

  const firstDOW = days[0].dayOfWeek;
  const cells: (MonthDayEntry | null)[] = [];
  for (let i = 0; i < firstDOW; i++) cells.push(null);
  for (const day of days) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);

  const rows = chunkArray(cells, 7);

  return (
    <View>
      {/* Day-of-week column headers */}
      <View style={{ flexDirection: 'row', marginBottom: 6 }}>
        {DOW_LABELS.map((l, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 9, fontFamily: Type.uiBold, color: theme.textMuted, letterSpacing: 1 }}>{l}</Text>
          </View>
        ))}
      </View>
      {rows.map((row, ri) => (
        <View key={ri} style={{ flexDirection: 'row', marginBottom: 4 }}>
          {row.map((cell, ci) => {
            if (!cell) {
              return <View key={ci} style={{ flex: 1, aspectRatio: 1, margin: 2 }} />;
            }
            const hasScore = cell.score !== null && !cell.excluded;
            const scoreColor = hasScore
              ? (isMindful ? theme.accentBlue : cell.score! >= 80 ? theme.statusGood : cell.score! >= 60 ? theme.statusWarn : theme.statusBad)
              : null;
            const [, , dd] = cell.dateKey.split('-').map(Number);
            return (
              <TouchableOpacity
                key={ci}
                activeOpacity={hasScore ? 0.7 : 1}
                onPress={() => { if (hasScore) onDayPress(cell.dateKey); }}
                style={{ flex: 1, margin: 2 }}
              >
                <View style={{
                  aspectRatio: 1,
                  borderRadius: 8,
                  backgroundColor: hasScore ? `${scoreColor}30` : 'rgba(255,255,255,0.03)',
                  borderWidth: 1,
                  borderColor: hasScore ? scoreColor! : 'rgba(255,255,255,0.06)',
                  justifyContent: 'center',
                  alignItems: 'center',
                  paddingVertical: 2,
                }}>
                  {hasScore && (
                    <Text style={{ fontSize: 12, fontFamily: Type.num, color: scoreColor!, lineHeight: numLine(12) }}>{cell.score}</Text>
                  )}
                  <Text style={{ fontSize: 8, fontFamily: Type.ui, color: hasScore ? scoreColor! + 'bb' : theme.textDim, lineHeight: 10 }}>{dd}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

export default function MonthlySummaryScreen() {
  const { monthKey } = useLocalSearchParams<{ monthKey: string }>();
  // PLAN.md 1.9. AI voicing is a Supporter feature; free users read the written fallback copy.
  const { isSupporter, loading: membershipLoading } = useMembership();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const accent = theme.accentBlueRaw;

  const [data, setData] = useState<MonthlySummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [styleMode, setStyleMode] = useState<StyleMode>('balanced');
  const [isMindful, setIsMindful] = useState(false);
  const [coachCache, setCoachCache] = useState<CoachTipCache | null>(null);
  const [coachLoading, setCoachLoading] = useState(true);
  const [calendarOpen, setCalendarOpen] = useState(true);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [selectedDayScore, setSelectedDayScore] = useState<any | null>(null);
  const [dayModalVisible, setDayModalVisible] = useState(false);
  const [faithJourney, setFaithJourney] = useState<'rooted' | 'exploring' | 'notrightnow'>('rooted');
  const [prevData, setPrevData] = useState<MonthlySummaryData | null>(null);
  const [showNetCarbs, setShowNetCarbs] = useState(false);

  // Was '#000' @0.12 on a tight 2/6 blur -- about a third of a normal card, the wrong hue on Light (whose
  // shadow is navy) and invisible on Dark. Nothing clips these, so it always rendered; just weak.
  const shadowStyle = { shadowColor: theme.cardShadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: theme.cardShadowOpacity, shadowRadius: 12, elevation: 6 };

  // Cancel the "Monthly Summary Ready" notification when the user views this screen
  useEffect(() => {
    cancelMonthlySummaryNotification().catch(() => {});
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!monthKey) { setLoading(false); return; }
      try {
        const [raw, setRaw, homeCache, prev] = await Promise.all([
          loadMonthlySummary(monthKey),
          AsyncStorage.getItem('pj_settings'),
          loadCoachTipCache(),
          loadMonthlySummary(getPrevMonthKey(monthKey)),
        ]);
        setData(raw);
        setPrevData(prev && prev.daysScored >= 7 ? prev : null);
        const settings = setRaw ? JSON.parse(setRaw) : {};
        const mode = (settings.styleMode ?? 'balanced') as StyleMode;
        setStyleMode(mode);
        setIsMindful(mode === 'mindful');
        setFaithJourney((settings.faithJourney ?? 'rooted') as 'rooted' | 'exploring' | 'notrightnow');
        setShowNetCarbs(!!settings.showNetCarbs);

        if (raw && !TIPS_GATED) {
          const homeRuleId = homeCache?.packet.ruleId ?? null;
          // ✅ GATED like every other surface as of 2026-08-07. PLAN.md 1.9.
          // ⚠️ It was briefly hardcoded `true` because the deterministic copy could read "excellent on 22 of
          // your last 7 logged nights": `computeCoachPacketMonthly` passes the whole month into the SEVEN-day
          // slot. That is fixed. Copy now carries {period}, {window} and {span}, filled from `monthCtx`, so a
          // monthly tip says "this month" and "your last 30 logged days".
          refreshCoachTipMonthly(isSupporter, raw.monthStart, raw.monthEnd, homeRuleId)
            .then(cache => { setCoachCache(cache); setCoachLoading(false); })
            .catch(() => { setCoachLoading(false); });
        } else {
          setCoachLoading(false);
        }
      } catch {
        setCoachLoading(false);
      }
      setLoading(false);
    };
    load();
    // 🔴 PLAN.md 1.9. `membershipLoading` in the deps, same reason as weekly: without it a Supporter opening
    // this during startup gets the free version and never a second pass. The month's tip freezes once voiced.
  }, [monthKey, membershipLoading, isSupporter]);

  const openDayModal = async (dateKey: string) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    try {
      const raw = await AsyncStorage.getItem(`pj_${dateKey}`);
      if (!raw) return;
      const day = JSON.parse(raw);
      if (!day.dayScore) return;
      setSelectedDayScore(day.dayScore);
      setSelectedDayKey(dateKey);
      setDayModalVisible(true);
    } catch {}
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bgPrimary, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={accent} />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bgPrimary }}>
        <ScreenHeader title="Monthly Summary" right={<TooltipIcon tooltipKey="day_score" size={18} />} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
          <Text style={{ fontSize: 14, color: theme.textMuted, fontFamily: Type.ui, textAlign: 'center' }}>
            No summary found for this month.
          </Text>
        </View>
      </View>
    );
  }

  const {
    avgComposite, avgNutritionScore, avgActivityScore, avgSleepScore, daysScored, days, daysInMonth,
    avgCalories, calTarget, avgNet, avgProtein, proteinGoal, avgWater, waterGoal, daysLoggedNutrition,
    avgCarbs, avgNetCarbs, avgFat, avgFiber, avgSodium, daysCalorieGoalHit,
    avgActiveCalories, activeCalGoal, avgSteps, workoutDays, avgExerciseMinutes,
    avgActiveCalScore, avgWorkoutScore, monthHadWorkouts, stepGoalDays, totalCardioSessions, totalLiftSessions,
    avgRecoveryScore, avgHRV, avgSleepHours, avgSleepCategoryScore, sleepGoal, avgRestingHR, avgRespiratoryRate, avgPrevActivity, avgBloodOxygen, monthVo2Max, monthCardioRecovery,
    startWeight, endWeight, weightChange, weightGoal,
    avgCalorieScore, avgProteinScore, avgWaterScore,
  } = data;

  const [y, m] = data.monthKey.split('-').map(Number);
  const monthYearLabel = `${MONTHS_FULL[m - 1]} ${y}`;

  const hasScore = avgComposite !== null && daysScored > 0;
  const heroColor = hasScore
    ? (isMindful ? theme.accentBlue : avgComposite! >= 80 ? theme.statusGood : avgComposite! >= 60 ? theme.statusWarn : theme.statusBad)
    : theme.textDim;

  const coachBody = coachCache ? resolveTipBody(coachCache) : null;
  const coachTone = coachCache?.packet.tone ?? 'corrective';
  const coachBorderColor = coachTone === 'positive' ? theme.statusGood : coachTone === 'care' ? theme.statusBad : accent;

  const fmtDelta = (curr: number | null, prev: number | null | undefined, unit: string, decimals = 0): string | undefined => {
    if (!prevData || curr === null || prev == null) return undefined;
    const factor = Math.pow(10, decimals);
    const rounded = Math.round((curr - prev) * factor) / factor;
    if (rounded === 0) return undefined;
    const abs = Math.abs(rounded);
    const sign = rounded > 0 ? '+' : '-';
    const num = decimals > 0 ? abs.toFixed(decimals) : abs.toLocaleString();
    return `${sign}${num}${unit}`;
  };

  const upColor = (curr: number | null, prev: number | null | undefined): string => {
    if (!prevData || curr === null || prev == null || Math.abs(curr - prev) < 0.5) return theme.textDim;
    return curr > prev ? theme.statusGood : theme.statusBad;
  };

  const deltaColor = (() => {
    if (weightChange === null) return theme.textSecondary;
    if (weightGoal === 'lose') return weightChange < 0 ? theme.statusGood : weightChange > 0 ? theme.statusBad : theme.statusWarn;
    if (weightGoal === 'gain') return weightChange > 0 ? theme.statusGood : weightChange < 0 ? theme.statusBad : theme.statusWarn;
    return weightChange === 0 ? theme.statusGood : theme.statusWarn;
  })();

  return (
    <View style={{ flex: 1, backgroundColor: theme.bgPrimary }}>
      <BackgroundLayers />
      <ScreenHeader
        title="Monthly Summary"
        subtitle={monthYearLabel}
        right={<TooltipIcon tooltipKey="day_score" size={18} />}
      />
      <ScrollView contentContainerStyle={{ paddingTop: 16, paddingBottom: insets.bottom + 96 }} showsVerticalScrollIndicator={false}>

        <View style={{ paddingHorizontal: 20 }}>

          {/* Score circle */}
          {hasScore ? (
            <View style={{ alignItems: 'center', marginBottom: 8 }}>
              <ScoreRing value={avgComposite!} color={heroColor} theme={theme} celebrate="none" />
              <Text style={{ fontSize: 11, letterSpacing: 3, color: heroColor, fontFamily: Type.uiBold, textTransform: 'uppercase', marginTop: 8 }}>
                {scoreLabel(avgComposite!, styleMode).toUpperCase()}
              </Text>
            </View>
          ) : (
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 13, color: theme.textDim, fontFamily: Type.ui, fontStyle: 'italic' }}>No scored days this month</Text>
            </View>
          )}

          {/* Coach Insight card (always free -- coaching is free for all, per monetization spec) */}
          {daysScored < 14 ? (
            <View style={[shadowStyle, {
              backgroundColor: `${accent}12`, borderRadius: 12, borderWidth: 1,
              borderColor: `${accent}50`, padding: 14, marginBottom: 12,
            }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Ionicons name="information-circle-outline" size={14} color={theme.textMuted} />
                <Text style={{ fontSize: 9, letterSpacing: 3, color: theme.textMuted, fontFamily: Type.uiBold, textTransform: 'uppercase' }}>Coach Insight</Text>
              </View>
              <Text style={{ fontSize: 13, color: theme.textSecondary, fontFamily: Type.ui, lineHeight: 20 }}>
                Not enough logged days this month to generate a coaching insight. Log consistently and your monthly summary will have more to work with.
              </Text>
            </View>
          ) : (coachLoading && !coachCache) ? (
            <View style={[shadowStyle, {
              backgroundColor: `${accent}12`, borderRadius: 12, borderWidth: 1,
              borderColor: `${accent}50`, padding: 14, marginBottom: 12,
            }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ActivityIndicator size="small" color={accent} />
                <Text style={{ fontSize: 13, fontFamily: Type.ui, color: theme.textMuted, fontStyle: 'italic' }}>Analyzing your month...</Text>
              </View>
            </View>
          ) : coachBody ? (
            /* TWO layers, matching Sleep & Recovery's coach and day-summary's. See the fuller note in
               day-summary.tsx: the card USED to be the tint, which goes strainy over the page glow. */
            <View style={[shadowStyle, {
              backgroundColor: theme.bgCard, borderRadius: 12, borderWidth: 0.5,
              borderColor: theme.borderCard, borderTopWidth: 1.5, borderTopColor: accent,
              padding: 14, marginBottom: 12,
            }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 10 }}>
                <Ionicons name="sparkles" size={12} color={accent} />
                <Text style={{ fontSize: 9, letterSpacing: 3, color: accent, fontFamily: Type.uiBold, textTransform: 'uppercase' }}>Coach Insight</Text>
              </View>
              <View style={{ backgroundColor: `${accent}12`, borderRadius: 10, padding: 12 }}>
                {/* VOICE, upright -- matched to Home's Coach Insight. See the same note in weekly-summary. */}
                <Text style={{ fontSize: 14, color: theme.textSecondary, fontFamily: Type.voice, lineHeight: 22, textAlign: 'center' }}>
                  {coachBody}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); router.push('/diagnostic-report'); }}
                style={{ marginTop: 12, alignSelf: 'center' }}
              >
                {/* PLAN.md 1.9 signpost. Same wording as Home and weekly (Justin: "just make them the
                    same"). Replaces the footer, tap still goes to Effort vs Results. */}
                <Text style={{ fontSize: 11, color: accent, fontFamily: Type.uiSemibold }}>
                  {isSupporter ? 'View in Effort vs Results' : 'Read against your numbers with the Supporter plan'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Month at a Glance card */}
          <View style={[{ backgroundColor: theme.bgCard, borderRadius: 14, borderWidth: 0.5, borderColor: theme.borderCard, borderTopColor: theme.borderCardTop, padding: 14, marginBottom: 12 }, shadowStyle]}>
            <CardWash color={hasScore ? heroColor : undefined} scored={hasScore} />
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setCalendarOpen(o => !o); }}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: calendarOpen ? 12 : 0 }}
            >
              <Text style={{ fontSize: 9, letterSpacing: 3, color: theme.textMuted, fontFamily: Type.uiBold, textTransform: 'uppercase' }}>Month at a Glance</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 11, color: theme.textDim, fontFamily: Type.ui }}>
                  {daysLoggedNutrition} of {daysInMonth} days logged
                </Text>
                <Ionicons name={calendarOpen ? 'chevron-up' : 'chevron-down'} size={14} color={theme.textMuted} />
              </View>
            </TouchableOpacity>
            {calendarOpen && (
              <CalendarGrid
                days={days}
                isMindful={isMindful}
                theme={theme}
                onDayPress={openDayModal}
              />
            )}
            {calendarOpen && (
              <Text style={{ fontSize: 11, color: theme.textDim, fontFamily: Type.ui, textAlign: 'center', marginTop: 10 }}>
                {daysScored} of {daysInMonth} days scored
              </Text>
            )}
          </View>

          {/* Nutrition card */}
          <SectionCard label="Nutrition" icon="restaurant" score={avgNutritionScore} pct="35% OF SCORE" borderColor={COLOR_NUTRITION}>
            <StatRow
              label="Calories"
              labelColor={COLOR_NUTRITION}
              value={avgCalorieScore != null ? `${avgCalorieScore} / ${CAL_MAX}` : '--'}
              deltaStr={fmtDelta(avgCalories, prevData?.avgCalories, ' kcal')}
              deltaColor={theme.textDim}
              subNode={
                <SubBlock
                  left={{ label: 'CONSUMED AVG', value: avgCalories !== null ? `${formatNumber(avgCalories)} kcal` : '--' }}
                  right={
                    !isMindful && avgNet !== null
                      ? { label: avgNet < 0 ? 'DEFICIT' : 'SURPLUS', value: `${formatNumber(Math.abs(avgNet))} kcal` }
                      : { label: 'DAILY GOAL', value: `${formatNumber(calTarget)} kcal` }
                  }
                />
              }
            />
            <StatRow
              label="Protein"
              labelColor={COLOR_NUTRITION}
              value={avgProteinScore != null ? `${avgProteinScore} / ${PROTEIN_MAX}` : '--'}
              deltaStr={fmtDelta(avgProtein, prevData?.avgProtein, 'g')}
              deltaColor={upColor(avgProtein, prevData?.avgProtein)}
              subNode={
                <SubBlock
                  left={{ label: 'CONSUMED AVG', value: avgProtein !== null ? `${formatNumber(avgProtein)}g` : '--' }}
                  right={{ label: 'DAILY GOAL', value: `${formatNumber(proteinGoal)}g` }}
                />
              }
            />
            <StatRow
              label="Water"
              labelColor={COLOR_NUTRITION}
              value={avgWaterScore != null ? `${avgWaterScore} / ${WATER_MAX}` : '--'}
              deltaStr={fmtDelta(avgWater, prevData?.avgWater, ' oz', 1)}
              deltaColor={upColor(avgWater, prevData?.avgWater)}
              subNode={
                <SubBlock
                  left={{ label: 'CONSUMED AVG', value: avgWater !== null ? `${avgWater} oz` : '--' }}
                  right={{ label: 'DAILY GOAL', value: `${formatNumber(waterGoal)} oz` }}
                />
              }
            />
            <View style={{ borderTopWidth: 0.5, borderTopColor: theme.borderCard, marginTop: 4, paddingTop: 4 }}>
              <SubBlock
                left={{ label: 'DAYS LOGGED', value: `${daysLoggedNutrition} of ${daysInMonth}` }}
                right={{ label: 'CAL GOAL DAYS', value: `${daysCalorieGoalHit} of ${daysInMonth}` }}
              />
              {/* A summary generated before 2026-07-29 has no avgNetCarbs at all, so it can only report
                  the total it froze. Those keep the honest "AVG CARBS" label rather than being dressed
                  up as net. Summaries written from now on carry both and follow the setting. */}
              <SubBlock
                left={showNetCarbs && avgNetCarbs != null
                  ? { label: 'AVG NET CARBS', value: `${formatNumber(avgNetCarbs)}g` }
                  : { label: 'AVG CARBS', value: avgCarbs !== null ? `${formatNumber(avgCarbs)}g` : '--' }}
                right={{ label: 'AVG FAT', value: avgFat !== null ? `${formatNumber(avgFat)}g` : '--' }}
              />
              <SubBlock
                left={{ label: 'AVG FIBER', value: avgFiber !== null ? `${formatNumber(avgFiber)}g` : '--' }}
                right={{ label: 'AVG SODIUM', value: avgSodium !== null ? `${formatNumber(avgSodium)}mg` : '--' }}
              />
              <Text style={{ fontSize: 10, color: theme.textDim, fontFamily: Type.ui, marginTop: 5, marginLeft: 2 }}>
                Fiber and sodium only count foods with complete data
              </Text>
            </View>
          </SectionCard>

          {/* Recovery card -- headline is the avg real Recovery Score (raw sleep on fallback) */}
          <SectionCard label="Recovery" icon="heart" score={avgRecoveryScore} pct={avgRecoveryScore == null ? '' : '35% OF SCORE'} borderColor={COLOR_RECOVERY}>
            {avgRecoveryScore == null ? (
              <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: Type.ui, paddingVertical: 4 }}>Recovery needs a smartwatch or fitness tracker worn overnight. No recovery or sleep data this month.</Text>
            ) : (
            <>
            {avgHRV !== null && (
              <StatRow
                label="HRV"
                labelColor={COLOR_RECOVERY}
                value={`${avgHRV} ms`}
                deltaStr={fmtDelta(avgHRV, prevData?.avgHRV, ' ms', 1)}
                deltaColor={upColor(avgHRV, prevData?.avgHRV)}
              />
            )}
            <StatRow
              label="Sleep"
              labelColor={COLOR_RECOVERY}
              value={avgSleepScore != null ? `${formatNumber(avgSleepScore)} / 100` : '--'}
              deltaStr={fmtDelta(avgSleepHours, prevData?.avgSleepHours, 'h', 1)}
              deltaColor={upColor(avgSleepHours, prevData?.avgSleepHours)}
              subNode={avgSleepHours !== null ? (
                <SubBlock
                  left={{ label: 'AVG PER NIGHT', value: formatHours(avgSleepHours) }}
                  right={sleepGoal ? { label: 'SLEEP GOAL', value: formatHours(sleepGoal) } : undefined}
                />
              ) : undefined}
            />
            <StatRow label="Resting HR" labelColor={COLOR_RECOVERY} value={avgRestingHR !== null ? `${avgRestingHR} bpm` : '--'} />
            <StatRow label="Resp Rate" labelColor={COLOR_RECOVERY} value={avgRespiratoryRate !== null ? `${avgRespiratoryRate}/min` : '--'} />
            <StatRow label="Prev. Activity" labelColor={COLOR_RECOVERY} value={avgPrevActivity !== null ? `${formatNumber(avgPrevActivity)} kcal` : '--'} />
            {(monthVo2Max !== null || monthCardioRecovery !== null || avgBloodOxygen !== null) && (
              <View style={{ borderTopWidth: 0.5, borderTopColor: theme.borderCard, marginTop: 4, paddingTop: 8 }}>
                <Text style={{ fontSize: 8, letterSpacing: 1.5, color: theme.textMuted, fontFamily: Type.uiBold, marginBottom: 2 }}>INFORMATIONAL</Text>
                <SubBlock
                  left={{ label: 'VO2 MAX', value: monthVo2Max !== null ? `${monthVo2Max} mL/kg/min` : '--' }}
                  right={{ label: 'CARDIO RECOVERY', value: monthCardioRecovery !== null ? `${monthCardioRecovery} bpm` : '--' }}
                />
                {avgBloodOxygen !== null && (
                  <SubBlock left={{ label: 'BLOOD OXYGEN', value: `${avgBloodOxygen}%` }} />
                )}
              </View>
            )}
            </>
            )}
          </SectionCard>

          {/* Activity card */}
          <SectionCard label="Activity" icon="barbell" score={avgActivityScore} pct="30% OF SCORE" borderColor={COLOR_ACTIVITY}>
            <StatRow
              label="Active calories"
              labelColor={COLOR_ACTIVITY}
              value={avgActiveCalScore != null ? `${avgActiveCalScore} / ${monthHadWorkouts ? '60' : '100'}` : (avgActiveCalories !== null ? `${formatNumber(avgActiveCalories)} kcal avg` : '--')}
              deltaStr={fmtDelta(avgActiveCalories, prevData?.avgActiveCalories, ' kcal')}
              deltaColor={upColor(avgActiveCalories, prevData?.avgActiveCalories)}
              subNode={avgActiveCalScore != null && avgActiveCalories !== null ? (
                <SubBlock
                  left={{ label: 'ACTIVE CAL AVG', value: `${formatNumber(avgActiveCalories)} kcal` }}
                  right={{ label: 'ACTIVE CAL GOAL', value: `${(activeCalGoal ?? 500).toLocaleString()} kcal` }}
                />
              ) : undefined}
            />
            {monthHadWorkouts && avgWorkoutScore != null && (
              <StatRow
                label="Workout"
                labelColor={COLOR_ACTIVITY}
                value={`${avgWorkoutScore} / 40`}
                deltaStr={fmtDelta(workoutDays, prevData?.workoutDays, ' days')}
                deltaColor={upColor(workoutDays, prevData?.workoutDays)}
                subNode={
                  <SubBlock
                    left={{ label: 'DAYS ACTIVE', value: `${workoutDays} of ${daysInMonth}` }}
                    right={avgExerciseMinutes !== null ? { label: 'DAILY AVG', value: `${formatNumber(avgExerciseMinutes)} min` } : undefined}
                  />
                }
              />
            )}
            <View style={{ borderTopWidth: 0.5, borderTopColor: theme.borderCard, marginTop: 4, paddingTop: 4 }}>
              <SubBlock
                left={{ label: 'STEPS AVG', value: avgSteps !== null ? `${formatNumber(avgSteps)}/day` : '--' }}
                right={{ label: 'STEP GOAL', value: `${stepGoalDays} of ${daysInMonth}` }}
              />
              <SubBlock
                left={{ label: 'CARDIO', value: `${totalCardioSessions}` }}
                right={{ label: 'LIFT', value: `${totalLiftSessions}` }}
              />
            </View>
          </SectionCard>

          {/* Weight card (hidden in Mindful) */}
          {!isMindful && (startWeight !== null || endWeight !== null) && (
            <SectionCard label="Weight" icon="scale-outline" score={null} pct="" borderColor={COLOR_WEIGHT}>
              {startWeight !== null && (
                <StatRow label={`Start (${monthDayLabel(data.monthStart)})`} labelColor={COLOR_WEIGHT} value={`${startWeight} lbs`} />
              )}
              {endWeight !== null && (
                <StatRow label={`End (${monthDayLabel(data.monthEnd)})`} labelColor={COLOR_WEIGHT} value={`${endWeight} lbs`} />
              )}
              {weightChange !== null && (
                <StatRow
                  label="Change"
                  value={`${weightChange > 0 ? '+' : ''}${weightChange} lbs`}
                  valueColor={deltaColor}
                />
              )}
            </SectionCard>
          )}

          {/* Disclaimer. textMuted, not textDim: it sits on the PAGE at the bottom, which is the strongest
              part of the glow, and a health disclaimer is the one line not allowed to be unreadable. */}
          <Text style={{ fontSize: 10, color: theme.textMuted, fontFamily: Type.ui, textAlign: 'center', marginTop: 4 }}>
            For informational purposes only. Not medical advice.
          </Text>

        </View>
      </ScrollView>

      {/* Day Summary modal */}
      {dayModalVisible && selectedDayKey && selectedDayScore && (
        <DaySummaryModal
          score={selectedDayScore}
          dateKey={selectedDayKey}
          theme={theme}
          styleMode={styleMode}
          faithJourney={faithJourney}
          hideExclude
          onClose={() => { setDayModalVisible(false); setSelectedDayScore(null); setSelectedDayKey(null); }}
        />
      )}
    </View>
  );
}
