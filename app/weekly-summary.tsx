// app/weekly-summary.tsx
// Weekly Summary detail screen. Push-navigated from Stats > Reports > Weekly Summaries.
// Shows averaged composite score, day strip, Coach Insight (Pro-gated), and
// per-category stats for a completed Sun-Sat week.

import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { ScoreRing } from '../components/DaySummaryModal';
import DaySummaryModal from '../components/DaySummaryModal';
import { scoreLabel, StyleMode, CAL_MAX, PROTEIN_MAX, WATER_MAX } from '../utils/dayScore';
import { loadWeeklySummary, WeeklySummaryData } from '../utils/weeklySummary';
import { cancelWeeklySummaryNotification } from '../services/notifications';
import { TIPS_GATED, CoachTipCache, loadCoachTipCache } from '../utils/smartTipsEngine';
import { refreshCoachTipWeekly, resolveTipBody } from '../utils/coachAI';

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDateRange(weekStart: string, weekEnd: string): string {
  const [sy, sm, sd] = weekStart.split('-').map(Number);
  const [, em, ed] = weekEnd.split('-').map(Number);
  const year = sy;
  if (sm === em) return `${MONTHS_SHORT[sm - 1]} ${sd} - ${ed}, ${year}`;
  return `${MONTHS_SHORT[sm - 1]} ${sd} - ${MONTHS_SHORT[em - 1]} ${ed}, ${year}`;
}

// M/D format for day strip labels (no leading zero on month)
function formatDayStripDate(dateKey: string): string {
  const [, m, d] = dateKey.split('-').map(Number);
  return `${m}/${d}`;
}

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

// Category colors: fixed per category, not score-based. Monthly must match.
const COLOR_NUTRITION = '#0d9268';
const COLOR_ACTIVITY  = '#d4860a';
const COLOR_RECOVERY  = '#9b7adb';
const COLOR_WEIGHT    = '#888899';

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

function StatRow({ label, value, sub, valueColor, labelColor, subNode }: { label: string; value: string; sub?: string; valueColor?: string; labelColor?: string; subNode?: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <View style={{ paddingVertical: 8, borderTopWidth: 0.5, borderTopColor: theme.borderCard }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 13, color: labelColor ?? theme.textSecondary, fontFamily: 'DMSans_600SemiBold' }}>{label}</Text>
        <Text style={{ fontSize: 13, color: valueColor ?? theme.textPrimary, fontFamily: 'DMSans_600SemiBold', paddingLeft: 8 }}>{value}</Text>
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

export default function WeeklySummaryScreen() {
  const { weekStart } = useLocalSearchParams<{ weekStart: string }>();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const accent = theme.accentBlueRaw;

  const [data, setData] = useState<WeeklySummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [styleMode, setStyleMode] = useState<StyleMode>('balanced');
  const [isMindful, setIsMindful] = useState(false);
  const [coachCache, setCoachCache] = useState<CoachTipCache | null>(null);
  const [coachLoading, setCoachLoading] = useState(true);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [selectedDayScore, setSelectedDayScore] = useState<any | null>(null);
  const [dayModalVisible, setDayModalVisible] = useState(false);
  const [faithJourney, setFaithJourney] = useState<'rooted' | 'exploring' | 'notrightnow'>('rooted');
  const [activeCalGoal, setActiveCalGoal] = useState<number>(500);

  const shadowStyle = { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6 };

  // Cancel the "Weekly Summary Ready" notification when the user views this screen
  useEffect(() => {
    cancelWeeklySummaryNotification().catch(() => {});
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!weekStart) { setLoading(false); return; }
      try {
        const [raw, setRaw, profRaw, homeCache] = await Promise.all([
          loadWeeklySummary(weekStart),
          AsyncStorage.getItem('pj_settings'),
          AsyncStorage.getItem('pj_profile'),
          loadCoachTipCache(),
        ]);
        setData(raw);
        const settings = setRaw ? JSON.parse(setRaw) : {};
        const profile = profRaw ? JSON.parse(profRaw) : {};
        const mode = (settings.styleMode ?? 'balanced') as StyleMode;
        setStyleMode(mode);
        setIsMindful(mode === 'mindful');
        setFaithJourney((settings.faithJourney ?? 'rooted') as 'rooted' | 'exploring' | 'notrightnow');
        setActiveCalGoal(parseInt(profile.activeCalGoal) || 500);

        if (raw) {
          const weekEnd = raw.weekEnd;
          const homeRuleId = homeCache?.packet.ruleId ?? null;
          const wStart = weekStart as string;
          refreshCoachTipWeekly(wStart, weekEnd, homeRuleId)
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
  }, [weekStart]);

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
        {/* Header */}
        <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); router.back(); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="chevron-back" size={22} color={accent} />
            </TouchableOpacity>
            <Text style={{ fontSize: 22, letterSpacing: 2, fontFamily: 'BebasNeue_400Regular', color: accent }}>WEEKLY SUMMARY</Text>
          </View>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
          <Text style={{ fontSize: 14, color: theme.textMuted, fontFamily: 'DMSans_400Regular', textAlign: 'center' }}>
            No summary found for this week.
          </Text>
        </View>
      </View>
    );
  }

  const { avgComposite, avgNutritionScore, avgActivityScore, avgSleepScore, daysScored, days,
    avgCalories, calTarget, avgNet, avgProtein, proteinGoal, avgWater, waterGoal, daysLoggedNutrition,
    avgCarbs, avgFat, avgFiber, avgSodium, daysCalorieGoalHit,
    avgActiveCalories, avgSteps, workoutDays, avgExerciseMinutes, avgActiveCalScore, avgWorkoutScore, weekHadWorkouts,
    stepGoalDays, cardioDays, liftDays,
    avgSleepHours, avgSleepCategoryScore, sleepGoal, avgRestingHR, avgRespiratoryRate, weekVo2Max, weekCardioRecovery,
    startWeight, endWeight, weightChange, weightGoal,
    avgCalorieScore, avgProteinScore, avgWaterScore } = data;

  const hasScore = avgComposite !== null && daysScored > 0;
  const heroColor = hasScore
    ? (isMindful ? theme.accentBlue : avgComposite! >= 80 ? theme.statusGood : avgComposite! >= 60 ? theme.statusWarn : theme.statusBad)
    : theme.textDim;

  const coachBody = coachCache ? resolveTipBody(coachCache) : null;
  const coachTone = coachCache?.packet.tone ?? 'corrective';
  const coachBorderColor = coachTone === 'positive' ? theme.statusGood : coachTone === 'care' ? theme.statusBad : accent;

  const deltaColor = (() => {
    if (weightChange === null) return theme.textSecondary;
    if (weightGoal === 'lose') return weightChange < 0 ? theme.statusGood : weightChange > 0 ? theme.statusBad : theme.statusWarn;
    if (weightGoal === 'gain') return weightChange > 0 ? theme.statusGood : weightChange < 0 ? theme.statusBad : theme.statusWarn;
    return weightChange === 0 ? theme.statusGood : theme.statusWarn;
  })();

  return (
    <View style={{ flex: 1, backgroundColor: theme.bgPrimary }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header: WEEKLY SUMMARY in accent (matches DAY SUMMARY style), date range as subtitle */}
        <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); router.back(); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="chevron-back" size={22} color={accent} />
            </TouchableOpacity>
            <Text style={{ fontSize: 22, letterSpacing: 2, fontFamily: 'BebasNeue_400Regular', color: accent }}>
              WEEKLY SUMMARY
            </Text>
          </View>
          <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'DMSans_400Regular', marginLeft: 34, marginTop: 2 }}>
            {formatDateRange(data.weekStart, data.weekEnd)}
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
              <Text style={{ fontSize: 13, color: theme.textDim, fontFamily: 'DMSans_400Regular', fontStyle: 'italic' }}>No scored days this week</Text>
            </View>
          )}

          {/* Day strip */}
          <View style={[{ backgroundColor: theme.bgCard, borderRadius: 14, borderWidth: 0.5, borderColor: theme.borderCard, borderTopColor: 'rgba(255,255,255,0.1)', padding: 14, marginBottom: 12 }, shadowStyle]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              {days.map((day) => {
                const hasDay = day.score !== null && !day.excluded;
                const barColor = hasDay
                  ? (isMindful ? theme.accentBlue : day.score! >= 80 ? theme.statusGood : day.score! >= 60 ? theme.statusWarn : theme.statusBad)
                  : theme.borderCard;

                return (
                  <TouchableOpacity
                    key={day.dateKey}
                    activeOpacity={hasDay ? 0.7 : 1}
                    onPress={() => { if (hasDay) openDayModal(day.dateKey); }}
                    style={{ alignItems: 'center', flex: 1 }}
                  >
                    <Text style={{ fontSize: 10, color: theme.textMuted, fontFamily: 'DMSans_700Bold', marginBottom: 4 }}>{day.dayLetter}</Text>
                    <View style={{
                      width: 36, height: 52, borderRadius: 8,
                      backgroundColor: hasDay ? `${barColor}30` : `${theme.borderCard}60`,
                      borderWidth: 1, borderColor: hasDay ? barColor : theme.borderCard,
                      justifyContent: 'center', alignItems: 'center', marginBottom: 4,
                    }}>
                      {hasDay && (
                        <Text style={{ fontSize: 12, fontFamily: 'BebasNeue_400Regular', color: barColor }}>{day.score}</Text>
                      )}
                    </View>
                    {/* M/D date label */}
                    <Text style={{ fontSize: 9, color: theme.textDim, fontFamily: 'DMSans_400Regular' }}>
                      {formatDayStripDate(day.dateKey)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={{ fontSize: 11, color: theme.textDim, fontFamily: 'DMSans_400Regular', textAlign: 'center', marginTop: 10 }}>
              {daysScored} of 7 days scored
            </Text>
          </View>

          {/* Coach Insight card */}
          {TIPS_GATED ? (
            <View style={{ marginBottom: 12 }}>
              <View style={[shadowStyle, {
                backgroundColor: theme.bgCard, borderRadius: 14, borderWidth: 0.5,
                borderColor: theme.borderCard, borderTopColor: 'rgba(255,255,255,0.1)',
                borderLeftWidth: 3, borderLeftColor: accent, padding: 16, paddingLeft: 15,
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
            </View>
          ) : daysScored < 4 ? (
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
                Not enough logged days this week to generate a coaching insight. Log consistently and your weekly summary will have more to work with.
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
                <Text style={{ fontSize: 13, fontFamily: 'DMSans_400Regular', color: theme.textMuted, fontStyle: 'italic' }}>Analyzing your week...</Text>
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
                onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); router.push('/diagnostic-report'); }}
                style={{ marginTop: 12, alignSelf: 'flex-start' }}
              >
                <Text style={{ fontSize: 11, color: accent, fontFamily: 'DMSans_600SemiBold' }}>View in Effort vs Results</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Nutrition card */}
          <SectionCard label="Nutrition" icon="restaurant" score={avgNutritionScore} pct="40% OF SCORE" borderColor={COLOR_NUTRITION}>
            <StatRow
              label="Calories"
              labelColor={COLOR_NUTRITION}
              value={avgCalorieScore != null ? `${avgCalorieScore} / ${CAL_MAX}` : '--'}
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
              subNode={
                <SubBlock
                  left={{ label: 'CONSUMED AVG', value: avgWater !== null ? `${avgWater} oz` : '--' }}
                  right={{ label: 'DAILY GOAL', value: `${formatNumber(waterGoal)} oz` }}
                />
              }
            />
            <View style={{ borderTopWidth: 0.5, borderTopColor: theme.borderCard, marginTop: 4, paddingTop: 4 }}>
              <SubBlock
                left={{ label: 'DAYS LOGGED', value: `${daysLoggedNutrition} of 7` }}
                right={{ label: 'CAL GOAL DAYS', value: `${daysCalorieGoalHit} of 7` }}
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
              value={avgActiveCalScore != null ? `${avgActiveCalScore} / ${weekHadWorkouts ? '60' : '100'}` : (avgActiveCalories !== null ? `${formatNumber(avgActiveCalories)} kcal avg` : '--')}
              subNode={avgActiveCalScore != null && avgActiveCalories !== null ? (
                <SubBlock
                  left={{ label: 'ACTIVE CAL AVG', value: `${formatNumber(avgActiveCalories)} kcal` }}
                  right={{ label: 'ACTIVE CAL GOAL', value: `${activeCalGoal.toLocaleString()} kcal` }}
                />
              ) : undefined}
            />
            {weekHadWorkouts && avgWorkoutScore != null && (
              <StatRow
                label="Workout"
                labelColor={COLOR_ACTIVITY}
                value={`${avgWorkoutScore} / 40`}
                subNode={
                  <SubBlock
                    left={{ label: 'DAYS ACTIVE', value: `${workoutDays} of 7` }}
                    right={avgExerciseMinutes !== null ? { label: 'DAILY AVG', value: `${formatNumber(avgExerciseMinutes)} min` } : undefined}
                  />
                }
              />
            )}
            <View style={{ borderTopWidth: 0.5, borderTopColor: theme.borderCard, marginTop: 4, paddingTop: 4 }}>
              <SubBlock
                left={{ label: 'STEPS AVG', value: avgSteps !== null ? `${formatNumber(avgSteps)}/day` : '--' }}
                right={{ label: 'STEP GOAL', value: stepGoalDays != null ? `${stepGoalDays} of 7` : '--' }}
              />
              <SubBlock
                left={{ label: 'CARDIO', value: cardioDays != null ? `${cardioDays}` : '--' }}
                right={{ label: 'LIFT', value: liftDays != null ? `${liftDays}` : '--' }}
              />
            </View>
          </SectionCard>

          {/* Recovery card */}
          <SectionCard label="Recovery" icon="heart" score={avgSleepScore} pct="25% OF SCORE" borderColor={COLOR_RECOVERY}>
            <StatRow
              label="Sleep"
              labelColor={COLOR_RECOVERY}
              value={avgSleepCategoryScore != null ? `${avgSleepCategoryScore} / 100` : (avgSleepScore != null ? `${formatNumber(avgSleepScore)} / 100` : '--')}
              subNode={avgSleepHours !== null ? (
                <SubBlock
                  left={{ label: 'AVG PER NIGHT', value: formatHours(avgSleepHours) }}
                  right={sleepGoal ? { label: 'SLEEP GOAL', value: formatHours(sleepGoal) } : undefined}
                />
              ) : undefined}
            />
            {(avgRestingHR !== null || avgRespiratoryRate !== null || weekVo2Max !== null || weekCardioRecovery !== null) && (
              <View style={{ borderTopWidth: 0.5, borderTopColor: theme.borderCard, marginTop: 4, paddingTop: 4 }}>
                <SubBlock
                  left={{ label: 'RESTING HR', value: avgRestingHR !== null ? `${avgRestingHR} bpm` : '--' }}
                  right={{ label: 'RESP RATE', value: avgRespiratoryRate !== null ? `${avgRespiratoryRate}/min` : '--' }}
                />
                <SubBlock
                  left={{ label: 'VO2 MAX', value: weekVo2Max !== null ? `${weekVo2Max}` : '--' }}
                  right={{ label: 'CARDIO RECOVERY', value: weekCardioRecovery !== null ? `${weekCardioRecovery}` : '--' }}
                />
              </View>
            )}
          </SectionCard>

          {/* Weight card (hidden in Mindful) -- same SectionCard treatment as other categories */}
          {!isMindful && (startWeight !== null || endWeight !== null) && (
            <SectionCard label="Weight" icon="scale-outline" score={null} pct="" borderColor={COLOR_WEIGHT}>
              {startWeight !== null && <StatRow label="Start (Sun)" labelColor={COLOR_WEIGHT} value={`${startWeight} lbs`} />}
              {endWeight !== null && <StatRow label="End (Sat)" labelColor={COLOR_WEIGHT} value={`${endWeight} lbs`} />}
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

      {/* Day Summary modal: self-contained, hideExclude so frozen snapshot isn't affected */}
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
