import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { ScoreRing } from '../components/DaySummaryModal';
import DaySummaryModal from '../components/DaySummaryModal';
import { scoreLabel, StyleMode, CAL_MAX, PROTEIN_MAX, WATER_MAX } from '../utils/dayScore';
import { loadMonthlySummary, MonthlySummaryData, MonthDayEntry } from '../utils/monthlySummary';
import { cancelMonthlySummaryNotification } from '../services/notifications';
import { TIPS_GATED, CoachTipCache, loadCoachTipCache } from '../utils/smartTipsEngine';
import { refreshCoachTipMonthly, resolveTipBody } from '../utils/coachAI';

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
  const shadowStyle = { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6 };
  const barC = score !== null ? borderColor : theme.textDim;
  return (
    <View style={[{
      backgroundColor: theme.bgCard, borderRadius: 14, borderWidth: 0.5,
      borderColor: theme.borderCard, borderTopColor: 'rgba(255,255,255,0.1)',
      borderLeftWidth: 3, borderLeftColor: barC,
      padding: 16, paddingLeft: 15, marginBottom: 12,
    }, shadowStyle]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 6 }}>
        <Ionicons name={icon as any} size={14} color={barC} />
        <Text style={{ fontSize: 9, letterSpacing: 3, color: theme.textMuted, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase', flex: 1 }}>{label}</Text>
        <View style={{ alignItems: 'flex-end' }}>
          {score !== null && (
            <Text style={{ fontSize: 20, lineHeight: 22, fontFamily: 'BebasNeue_400Regular', color: barC }}>{Math.round(score)}</Text>
          )}
          {!!pct && (
            <Text style={{ fontSize: 8, letterSpacing: 0.8, color: theme.textMuted, fontFamily: 'DMSans_700Bold' }}>{pct}</Text>
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
        <Text style={{ fontSize: 13, color: labelColor ?? theme.textSecondary, fontFamily: 'DMSans_600SemiBold' }}>{label}</Text>
        <View style={{ alignItems: 'flex-end', paddingLeft: 8 }}>
          <Text style={{ fontSize: 13, color: valueColor ?? theme.textPrimary, fontFamily: 'DMSans_600SemiBold' }}>{value}</Text>
          {!!deltaStr && (
            <Text style={{ fontSize: 10, color: deltaColor ?? theme.textDim, fontFamily: 'DMSans_600SemiBold', marginTop: 1 }}>{deltaStr}</Text>
          )}
        </View>
      </View>
      {subNode ?? (!!sub && <Text style={{ fontSize: 11, color: theme.textMuted, fontFamily: 'DMSans_400Regular', marginTop: 2 }}>{sub}</Text>)}
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
        <Text style={{ fontSize: 9, fontFamily: 'DMSans_700Bold', color: theme.textMuted, letterSpacing: 1.5 }}>{left.label}</Text>
        <Text style={{ fontSize: 13, fontFamily: 'DMSans_600SemiBold', color: theme.textSecondary, marginTop: 1 }}>{left.value}</Text>
      </View>
      {right && (
        <View style={{ flex: 1, alignItems: 'flex-start', paddingLeft: 2 }}>
          <Text style={{ fontSize: 9, fontFamily: 'DMSans_700Bold', color: theme.textMuted, letterSpacing: 1.5 }}>{right.label}</Text>
          <Text style={{ fontSize: 13, fontFamily: 'DMSans_600SemiBold', color: theme.textSecondary, marginTop: 1 }}>{right.value}</Text>
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
            <Text style={{ fontSize: 9, fontFamily: 'DMSans_700Bold', color: theme.textMuted, letterSpacing: 1 }}>{l}</Text>
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
                    <Text style={{ fontSize: 12, fontFamily: 'BebasNeue_400Regular', color: scoreColor!, lineHeight: 14 }}>{cell.score}</Text>
                  )}
                  <Text style={{ fontSize: 8, fontFamily: 'DMSans_400Regular', color: hasScore ? scoreColor! + 'bb' : theme.textDim, lineHeight: 10 }}>{dd}</Text>
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

  const shadowStyle = { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6 };

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

        if (raw && !TIPS_GATED) {
          const homeRuleId = homeCache?.packet.ruleId ?? null;
          refreshCoachTipMonthly(raw.monthStart, raw.monthEnd, homeRuleId)
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
  }, [monthKey]);

  const openDayModal = async (dateKey: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
        <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="chevron-back" size={22} color={accent} />
            </TouchableOpacity>
            <Text style={{ fontSize: 22, letterSpacing: 2, fontFamily: 'BebasNeue_400Regular', color: accent }}>MONTHLY SUMMARY</Text>
          </View>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
          <Text style={{ fontSize: 14, color: theme.textMuted, fontFamily: 'DMSans_400Regular', textAlign: 'center' }}>
            No summary found for this month.
          </Text>
        </View>
      </View>
    );
  }

  const {
    avgComposite, avgNutritionScore, avgActivityScore, avgSleepScore, daysScored, days, daysInMonth,
    avgCalories, calTarget, avgNet, avgProtein, proteinGoal, avgWater, waterGoal, daysLoggedNutrition,
    avgCarbs, avgFat, avgFiber, avgSodium, daysCalorieGoalHit,
    avgActiveCalories, activeCalGoal, avgSteps, workoutDays, avgExerciseMinutes,
    avgActiveCalScore, avgWorkoutScore, monthHadWorkouts, stepGoalDays, totalCardioSessions, totalLiftSessions,
    avgSleepHours, avgSleepCategoryScore, sleepGoal, avgRestingHR, avgRespiratoryRate, monthVo2Max, monthCardioRecovery,
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
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="chevron-back" size={22} color={accent} />
            </TouchableOpacity>
            <Text style={{ fontSize: 22, letterSpacing: 2, fontFamily: 'BebasNeue_400Regular', color: accent }}>
              MONTHLY SUMMARY
            </Text>
          </View>
          <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'DMSans_400Regular', marginLeft: 34, marginTop: 2 }}>
            {monthYearLabel}
          </Text>
        </View>

        <View style={{ paddingHorizontal: 20 }}>

          {/* Score circle */}
          {hasScore ? (
            <View style={{ alignItems: 'center', marginBottom: 8 }}>
              <ScoreRing value={avgComposite!} color={heroColor} theme={theme} celebrate="none" />
              <Text style={{ fontSize: 11, letterSpacing: 3, color: heroColor, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase', marginTop: 8 }}>
                {scoreLabel(avgComposite!, styleMode).toUpperCase()}
              </Text>
            </View>
          ) : (
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 13, color: theme.textDim, fontFamily: 'DMSans_400Regular', fontStyle: 'italic' }}>No scored days this month</Text>
            </View>
          )}

          {/* Coach Insight card */}
          {TIPS_GATED ? (
            <View style={[shadowStyle, {
              backgroundColor: theme.bgCard, borderRadius: 14, borderWidth: 0.5,
              borderColor: theme.borderCard, borderTopColor: 'rgba(255,255,255,0.1)',
              borderLeftWidth: 3, borderLeftColor: accent, padding: 16, paddingLeft: 15, marginBottom: 12,
            }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="sparkles" size={13} color={accent} />
                  <Text style={{ fontSize: 9, letterSpacing: 3, color: theme.textMuted, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase' }}>Coach Insight</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="lock-closed" size={12} color={theme.textMuted} />
                  <View style={{ backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                    <Text style={{ fontSize: 8, fontFamily: 'DMSans_700Bold', letterSpacing: 2, color: accent }}>PRO</Text>
                  </View>
                </View>
              </View>
              <View style={{ gap: 6 }}>
                <View style={{ height: 10, backgroundColor: theme.textMuted + '30', borderRadius: 4, width: '100%' }} />
                <View style={{ height: 10, backgroundColor: theme.textMuted + '30', borderRadius: 4, width: '82%' }} />
                <View style={{ height: 10, backgroundColor: theme.textMuted + '20', borderRadius: 4, width: '65%' }} />
              </View>
            </View>
          ) : daysScored < 14 ? (
            <View style={[shadowStyle, {
              backgroundColor: theme.bgCard, borderRadius: 14, borderWidth: 0.5,
              borderColor: theme.borderCard, borderTopColor: 'rgba(255,255,255,0.1)',
              padding: 16, marginBottom: 12,
            }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Ionicons name="information-circle-outline" size={14} color={theme.textMuted} />
                <Text style={{ fontSize: 9, letterSpacing: 3, color: theme.textMuted, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase' }}>Coach Insight</Text>
              </View>
              <Text style={{ fontSize: 13, color: theme.textSecondary, fontFamily: 'DMSans_400Regular', lineHeight: 20 }}>
                Not enough logged days this month to generate a coaching insight. Log consistently and your monthly summary will have more to work with.
              </Text>
            </View>
          ) : (coachLoading && !coachCache) ? (
            <View style={[shadowStyle, {
              backgroundColor: theme.bgCard, borderRadius: 14, borderWidth: 0.5,
              borderColor: theme.borderCard, borderTopColor: 'rgba(255,255,255,0.1)',
              borderLeftWidth: 3, borderLeftColor: accent, padding: 16, paddingLeft: 15, marginBottom: 12,
            }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ActivityIndicator size="small" color={accent} />
                <Text style={{ fontSize: 13, fontFamily: 'DMSans_400Regular', color: theme.textMuted, fontStyle: 'italic' }}>Analyzing your month...</Text>
              </View>
            </View>
          ) : coachBody ? (
            <View style={[shadowStyle, {
              backgroundColor: theme.bgCard, borderRadius: 14, borderWidth: 0.5,
              borderColor: theme.borderCard, borderTopColor: 'rgba(255,255,255,0.1)',
              borderLeftWidth: 3, borderLeftColor: coachBorderColor, padding: 16, paddingLeft: 15, marginBottom: 12,
            }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <Ionicons name="sparkles" size={13} color={accent} />
                <Text style={{ fontSize: 9, letterSpacing: 3, color: theme.textMuted, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase', flex: 1 }}>Coach Insight</Text>
              </View>
              <View style={{ width: '100%', height: 0.5, backgroundColor: `${accent}30`, marginBottom: 10 }} />
              <Text style={{ fontSize: 14, color: theme.textSecondary, fontFamily: 'DMSans_600SemiBold', lineHeight: 22, fontStyle: 'italic' }}>
                {coachBody}
              </Text>
              <TouchableOpacity
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/diagnostic-report'); }}
                style={{ marginTop: 12, alignSelf: 'flex-start' }}
              >
                <Text style={{ fontSize: 11, color: accent, fontFamily: 'DMSans_600SemiBold' }}>View in Effort vs Results</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Month at a Glance card */}
          <View style={[{ backgroundColor: theme.bgCard, borderRadius: 14, borderWidth: 0.5, borderColor: theme.borderCard, borderTopColor: 'rgba(255,255,255,0.1)', padding: 14, marginBottom: 12 }, shadowStyle]}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setCalendarOpen(o => !o); }}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: calendarOpen ? 12 : 0 }}
            >
              <Text style={{ fontSize: 9, letterSpacing: 3, color: theme.textMuted, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase' }}>Month at a Glance</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 11, color: theme.textDim, fontFamily: 'DMSans_400Regular' }}>
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
              <Text style={{ fontSize: 11, color: theme.textDim, fontFamily: 'DMSans_400Regular', textAlign: 'center', marginTop: 10 }}>
                {daysScored} of {daysInMonth} days scored
              </Text>
            )}
          </View>

          {/* Nutrition card */}
          <SectionCard label="Nutrition" icon="restaurant" score={avgNutritionScore} pct="40% OF SCORE" borderColor={COLOR_NUTRITION}>
            <StatRow
              label="Calories"
              labelColor={COLOR_NUTRITION}
              value={avgCalorieScore != null ? `${avgCalorieScore} / ${CAL_MAX}` : '--'}
              deltaStr={fmtDelta(avgCalories, prevData?.avgCalories, ' kcal')}
              deltaColor={theme.textDim}
              subNode={
                <SubBlock
                  left={{ label: 'CONSUMED AVG', value: avgCalories !== null ? formatNumber(avgCalories) : '--' }}
                  right={
                    !isMindful && avgNet !== null
                      ? { label: avgNet < 0 ? 'DEFICIT' : 'SURPLUS', value: formatNumber(Math.abs(avgNet)) }
                      : { label: 'DAILY GOAL', value: formatNumber(calTarget) }
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
              <SubBlock
                left={{ label: 'AVG CARBS', value: avgCarbs !== null ? `${formatNumber(avgCarbs)}g` : '--' }}
                right={{ label: 'AVG FAT', value: avgFat !== null ? `${formatNumber(avgFat)}g` : '--' }}
              />
              <SubBlock
                left={{ label: 'AVG FIBER', value: avgFiber !== null ? `${formatNumber(avgFiber)}g` : '--' }}
                right={{ label: 'AVG SODIUM', value: avgSodium !== null ? `${formatNumber(avgSodium)}mg` : '--' }}
              />
              <Text style={{ fontSize: 10, color: theme.textDim, fontFamily: 'DMSans_400Regular', marginTop: 5, marginLeft: 2 }}>
                Fiber and sodium only count foods with complete data
              </Text>
            </View>
          </SectionCard>

          {/* Activity card */}
          <SectionCard label="Activity" icon="barbell" score={avgActivityScore} pct="35% OF SCORE" borderColor={COLOR_ACTIVITY}>
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

          {/* Recovery card */}
          <SectionCard label="Recovery" icon="heart" score={avgSleepScore} pct="25% OF SCORE" borderColor={COLOR_RECOVERY}>
            <StatRow
              label="Sleep"
              labelColor={COLOR_RECOVERY}
              value={avgSleepCategoryScore != null ? `${avgSleepCategoryScore} / 100` : (avgSleepScore != null ? `${formatNumber(avgSleepScore)} / 100` : '--')}
              deltaStr={fmtDelta(avgSleepHours, prevData?.avgSleepHours, 'h', 1)}
              deltaColor={upColor(avgSleepHours, prevData?.avgSleepHours)}
              subNode={avgSleepHours !== null ? (
                <SubBlock
                  left={{ label: 'AVG PER NIGHT', value: formatHours(avgSleepHours) }}
                  right={sleepGoal ? { label: 'SLEEP GOAL', value: formatHours(sleepGoal) } : undefined}
                />
              ) : undefined}
            />
            {(avgRestingHR !== null || avgRespiratoryRate !== null || monthVo2Max !== null || monthCardioRecovery !== null) && (
              <View style={{ borderTopWidth: 0.5, borderTopColor: theme.borderCard, marginTop: 4, paddingTop: 4 }}>
                <SubBlock
                  left={{ label: 'RESTING HR', value: avgRestingHR !== null ? `${avgRestingHR} bpm` : '--' }}
                  right={{ label: 'RESP RATE', value: avgRespiratoryRate !== null ? `${avgRespiratoryRate}/min` : '--' }}
                />
                <SubBlock
                  left={{ label: 'VO2 MAX', value: monthVo2Max !== null ? `${monthVo2Max}` : '--' }}
                  right={{ label: 'CARDIO RECOVERY', value: monthCardioRecovery !== null ? `${monthCardioRecovery}` : '--' }}
                />
              </View>
            )}
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

          {/* Disclaimer */}
          <Text style={{ fontSize: 10, color: theme.textDim, fontFamily: 'DMSans_400Regular', textAlign: 'center', marginTop: 4 }}>
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
