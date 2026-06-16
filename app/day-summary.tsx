// app/day-summary.tsx
// The full Day Summary breakdown: a dedicated page that shows exactly what made
// up a day's score. Reached from the Stats > Reports archive (tap a day) and,
// later, the morning pop-up's VIEW FULL SUMMARY button.
//
// Points come straight from the stored dayScore (the historical snapshot). The
// real underlying numbers (protein g, water oz, active cals, workout counts,
// net) come from buildDayScoreInput -- the SAME assembly the scoring engine
// uses -- so the displayed values can never drift from the score.
//
// Renders defensively off the stored detail shape: a day scored in Mindful
// (presence-based) shows a presence line instead of point fractions, and a day
// with no score / an excluded day shows a clean empty state rather than crashing.

import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import { useTheme } from '../theme';
import TooltipIcon from '../components/TooltipIcon';
import { useToast } from '../components/Toast';
import { ScoreRing } from '../components/DaySummaryModal';
import { CardWash } from '../components/GradientCard';
import { DayScore, DayScoreInput, scoreLabel, StyleMode, CATEGORY_WEIGHTS } from '../utils/dayScore';
import { buildDayScoreInput, excludeDayFromAverages, ensureFreshDayScore } from '../utils/dayScoreStore';
import { contextLine as computeContextLine, hadFaithEntryOn } from '../utils/daySummaryCopy';
import { useTutorialTarget } from '../hooks/useTutorialTarget';
import { useTutorial } from '../context/TutorialContext';
import { refreshDayCoachTip, resolveTipBody } from '../utils/coachAI';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function formatLongDate(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return `${DAYS[dt.getDay()]}, ${MONTHS[dt.getMonth()]} ${dt.getDate()}`;
}

export default function DaySummaryScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState<DayScore | null>(null);
  const [input, setInput] = useState<DayScoreInput | null>(null);
  const [excluded, setExcluded] = useState(false);
  const [confirmingExclude, setConfirmingExclude] = useState(false);
  const [contextLine, setContextLine] = useState('');
  const [dayCoachBody, setDayCoachBody] = useState<string | null>(null);
  // The page renders in the user's CURRENT coaching mode (colors, celebration,
  // labels, copy), not the mode frozen into the score. The score NUMBER and
  // sub-scores stay frozen via the snapshot; only presentation follows current mode,
  // so a Mindful user never sees judgment-style display resurfaced on an old day.
  const [displayMode, setDisplayMode] = useState<StyleMode>('balanced');
  const styleMode: StyleMode = displayMode;
  const isMindful = styleMode === 'mindful';
  const [cardioExerciseCount, setCardioExerciseCount] = useState<number | null>(null);
  const [liftExerciseCount, setLiftExerciseCount] = useState<number | null>(null);

  // Tutorial spotlight targets (the tour lives on this page, not the modal).
  const ringRef = useTutorialTarget('ds_ring');
  const nutritionRef = useTutorialTarget('ds_nutrition');
  const activityRef = useTutorialTarget('ds_activity');
  const recoveryRef = useTutorialTarget('ds_recovery');
  const excludeRef = useTutorialTarget('ds_exclude');

  // Register the page's ScrollView so the tutorial overlay can scroll off-screen
  // targets (Recovery, Exclude) into view before spotlighting them.
  const scrollRef = useRef<ScrollView>(null);
  const { registerScrollView, unregisterScrollView } = useTutorial();
  useEffect(() => {
    registerScrollView('day_summary', scrollRef);
    return () => unregisterScrollView('day_summary');
  }, [registerScrollView, unregisterScrollView]);

  // Fast-exclude from the page (mirrors the modal): heavy haptic, write, toast,
  // then back to wherever the user came from (the archive shows a dash).
  const handleExclude = async () => {
    if (!date) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
    await excludeDayFromAverages(date);
    showToast('Day excluded', 'Removed from your weekly average', 'success');
    router.back();
  };

  useEffect(() => {
    (async () => {
      if (!date) { setLoading(false); return; }
      try {
        // Recompute-on-edit: if this day's logged data changed since it was last
        // scored, refresh it before we read the record so the summary reflects the
        // edit. Unchanged data is a no-op (same signature), so a plain view never
        // re-rolls the score.
        await ensureFreshDayScore(date);
        const raw = await AsyncStorage.getItem(`pj_${date}`);
        const day = raw ? JSON.parse(raw) : null;
        const sc: DayScore | null = day?.dayScore ?? null;
        setScore(sc);
        const ex = day?.excluded;
        setExcluded(ex === true || (ex && typeof ex === 'object' && !!(ex.diet && ex.water && ex.exercise)));
        const inp = await buildDayScoreInput(date, new Date().toISOString());
        setInput(inp);

        // Per-exercise cardio/lift counts for the Activity card display.
        try {
          const wsRaw = await AsyncStorage.getItem('pj_workout_state');
          if (wsRaw) {
            const ws = JSON.parse(wsRaw);
            const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const [dy, dm, dd] = date.split('-').map(Number);
            const dayName = DAY_NAMES[new Date(dy, dm - 1, dd).getDay()];
            const program = (ws.programs || {})[date] || (ws.weeklyTemplate || {})[dayName] || null;
            const exercises = Array.isArray(program?.exercises) ? program.exercises : [];
            const dayChecks = (ws.checks || {})[date] || {};
            const checked = exercises.filter((ex: any) => dayChecks[ex.id]);
            setCardioExerciseCount(checked.filter((ex: any) => ex.isCardio).length);
            setLiftExerciseCount(checked.filter((ex: any) => !ex.isCardio).length);
          }
        } catch {}

        // Current coaching mode + faith journey from live settings. Display and
        // narrative follow CURRENT mode (not the score's frozen mode), so the page
        // never resurfaces judgment copy/colors to a now-Mindful user.
        let faithJourney = 'rooted';
        let currentMode: StyleMode = 'balanced';
        try {
          const s = await AsyncStorage.getItem('pj_settings');
          if (s) {
            const parsed = JSON.parse(s);
            faithJourney = parsed?.faithJourney ?? 'rooted';
            currentMode = (parsed?.styleMode as StyleMode) || 'balanced';
          }
        } catch {}
        setDisplayMode(currentMode);

        // Context line
        if (sc) {
          const mindful = currentMode === 'mindful';
          setContextLine(await computeContextLine(date, sc.composite, mindful));

          let weightGoal = 'maintain';
          try {
            const raw2 = await AsyncStorage.getItem(`pj_${date}`);
            if (raw2) { const d = JSON.parse(raw2); weightGoal = d.goalSnapshot?.weightGoal ?? weightGoal; }
          } catch {}

          // AI coaching tip for any scored day
          if (inp) {
            refreshDayCoachTip(date, sc, inp, currentMode, faithJourney, weightGoal)
              .then(cache => {
                const body = resolveTipBody(cache);
                if (body) setDayCoachBody(body);
              })
              .catch(() => {});
          }
        }
      } catch {}

      setLoading(false);
    })();
  }, [date]);

  const accent = theme.accentBlueRaw;

  // ── Header (shared across loading / empty / content) ──
  const Header = (
    <View style={{
      paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 12,
      borderBottomWidth: 0.5, borderBottomColor: theme.borderCard,
      flexDirection: 'row', alignItems: 'center', gap: 10,
    }}>
      <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); router.back(); }} style={{ padding: 4 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="chevron-back" size={24} color={accent} />
      </TouchableOpacity>
      <Text style={{ fontSize: 24, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2, color: accent, flex: 1 }}>DAY SUMMARY</Text>
      <View style={{ transform: [{ translateY: -1 }] }}>
        <TooltipIcon tooltipKey="day_score" size={18} />
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bgPrimary }}>
        {Header}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={accent} />
        </View>
      </View>
    );
  }

  // No score (excluded, today/future, or no logged data): clean empty state.
  if (!score) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bgPrimary }}>
        {Header}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
          <Ionicons name={excluded ? 'remove-circle-outline' : 'calendar-outline'} size={44} color={theme.textDim} />
          <Text style={{ fontSize: 16, fontFamily: 'DMSans_700Bold', color: theme.textSecondary, marginTop: 14, textAlign: 'center' }}>
            {excluded ? 'This day was excluded' : 'No score for this day'}
          </Text>
          <Text style={{ fontSize: 13, fontFamily: 'DMSans_400Regular', color: theme.textMuted, marginTop: 6, textAlign: 'center', lineHeight: 19 }}>
            {excluded
              ? 'Excluded days are kept out of your scores and weekly averages.'
              : 'Scores appear the morning after a logged day. Log food, activity, or sleep to get one.'}
          </Text>
        </View>
      </View>
    );
  }

  // ── Derived raw numbers (drift-proof, from buildDayScoreInput) ──
  const adjustedActive = input
    ? Math.round((input.dayData?.activeCalories || input.dayData?.caloriesBurned || 0) * input.burnAccuracyPct / 100)
    : 0;
  // Net needs BMR; with no resolvable weight (frozen BMR 0) it would be overstated by
  // the whole missing BMR, so leave it null (the line below already renders null as "--").
  const net = input && input.dayBmr > 0 ? Math.round(input.consumed - adjustedActive - input.dayBmr) : null;
  const dietExcluded = !!input?.dietExcluded;
  const waterExcluded = !!input?.waterExcluded;
  const exerciseExcluded = !!input?.exerciseExcluded;

  const shown = Math.round(score.composite);
  const heroColor = isMindful ? theme.accentBlue : (shown >= 80 ? theme.statusGood : shown >= 60 ? theme.statusWarn : theme.statusBad);
  const celebrate: 'none' | 'pulse' | 'shine' = isMindful ? 'none' : shown >= 95 ? 'shine' : shown >= 85 ? 'pulse' : 'none';
  const tierColor = (v: number) => (isMindful ? theme.accentBlue : v >= 80 ? theme.statusGood : v >= 60 ? theme.statusWarn : theme.statusBad);

  // ── Composite math, renormalized over present categories so it always adds up ──
  const presentCats: { name: string; score: number; weight: number }[] = [];
  if (score.nutritionScore !== null) presentCats.push({ name: 'Nutrition', score: score.nutritionScore, weight: CATEGORY_WEIGHTS.nutrition });
  if (score.activityScore !== null) presentCats.push({ name: 'Activity', score: score.activityScore, weight: CATEGORY_WEIGHTS.activity });
  if (score.sleepScore !== null) presentCats.push({ name: 'Recovery', score: score.sleepScore, weight: CATEGORY_WEIGHTS.sleep });
  const weightTotal = presentCats.reduce((s, c) => s + c.weight, 0) || 1;
  const catPct = (w: number) => Math.round((w / weightTotal) * 100);

  // ── Reusable bits ──
  const SectionCard = ({ label, value, icon, weightPct, innerRef, children, categoryColor }: { label: string; value: number | null; icon: keyof typeof Ionicons.glyphMap; weightPct?: number | null; innerRef: React.RefObject<View | null>; children: React.ReactNode; categoryColor: string }) => {
    const barC = value !== null ? categoryColor : theme.textDim;
    return (
      <View ref={innerRef} collapsable={false} style={{
        backgroundColor: theme.bgCard, borderRadius: 14, borderWidth: 0.5, borderColor: theme.borderCard,
        borderTopColor: theme.borderCardTop, borderLeftWidth: 0.5, borderLeftColor: theme.borderCard,
        padding: 16, marginBottom: 12,
      }}>
        <CardWash color={value !== null ? categoryColor : undefined} scored={value !== null} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name={icon} size={17} color={barC} />
            <Text style={{ fontSize: 17, letterSpacing: 1.5, color: theme.textSecondary, fontFamily: 'BebasNeue_400Regular' }}>{label.toUpperCase()}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 26, lineHeight: 28, fontFamily: 'BebasNeue_400Regular', color: barC }}>
              {value !== null ? Math.round(value) : '--'}
            </Text>
            {value !== null && weightPct != null && (
              <Text style={{ fontSize: 8, letterSpacing: 0.8, color: theme.textMuted, fontFamily: 'DMSans_700Bold' }}>{weightPct}% OF SCORE</Text>
            )}
          </View>
        </View>
        {children}
      </View>
    );
  };

  function SubBlock({ left, right }: { left: { label: string; value: string }; right?: { label: string; value: string } }) {
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

  function formatSleepHours(h: number | null): string {
    if (h === null) return '--';
    const hrs = Math.floor(h);
    const mins = Math.round((h - hrs) * 60);
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  }

  // One sub-component row: name, the real numbers, and points earned.
  const SubRow = ({ name, detail, pts, subBlock, labelColor }: { name: string; detail?: string; pts?: string; subBlock?: React.ReactNode; labelColor?: string }) => (
    <View style={{ paddingVertical: 7, borderTopWidth: 0.5, borderTopColor: theme.borderSubtle }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 13, color: labelColor ?? theme.textSecondary, fontFamily: 'DMSans_600SemiBold', flex: 1 }}>{name}</Text>
        {!!pts && (
          <Text style={{ fontSize: 12, color: theme.textSecondary, fontFamily: 'DMSans_600SemiBold' }}>{pts}</Text>
        )}
      </View>
      {!!detail && <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'DMSans_400Regular', marginTop: 1 }}>{detail}</Text>}
      {subBlock}
    </View>
  );

  const nd = score.nutritionDetail;
  const ad = score.activityDetail;
  const sd = score.sleepDetail;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bgPrimary }}>
      {Header}
      <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 120 }} showsVerticalScrollIndicator={false}>

        {/* Date */}
        <Text style={{ fontSize: 17, color: theme.textPrimary, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2, textAlign: 'center', marginTop: 4 }}>
          {date ? formatLongDate(date) : ''}
        </Text>

        {/* Hero ring + label + narrative (context / win / coach) */}
        <View ref={ringRef} collapsable={false} style={{ alignItems: 'center', marginTop: 10, marginBottom: 18 }}>
          <ScoreRing value={score.composite} color={heroColor} theme={theme} celebrate={celebrate} />
          <View style={{ shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 0, marginTop: 10 }}>
            <Text style={{ fontSize: 24, letterSpacing: 2, fontFamily: 'BebasNeue_400Regular', color: heroColor }}>
              {scoreLabel(shown, styleMode).toUpperCase()}
            </Text>
          </View>
          {!!contextLine && (
            <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'DMSans_400Regular', fontStyle: 'italic', textAlign: 'center', marginTop: 8 }}>{contextLine}</Text>
          )}
        </View>

        {/* Coach insight card: accent-tinted, centered, italic — the standard for all AI coaching surfaces */}
        {!!dayCoachBody && (
          <View style={{
            backgroundColor: `${accent}12`,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: `${accent}50`,
            padding: 14,
            marginBottom: 12,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 4,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 10 }}>
              <Ionicons name="sparkles" size={12} color={accent} />
              <Text style={{ fontSize: 9, letterSpacing: 3, color: accent, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase' }}>Coach Insight</Text>
            </View>
            <View style={{ width: '100%', height: 0.5, backgroundColor: `${accent}40`, marginBottom: 10 }} />
            <Text style={{ fontSize: 14, color: theme.textSecondary, fontFamily: 'DMSans_600SemiBold', lineHeight: 22, fontStyle: 'italic', textAlign: 'center' }}>
              {dayCoachBody}
            </Text>
          </View>
        )}

        {presentCats.length < 3 && (
          <Text style={{ fontSize: 11, color: theme.textMuted, fontFamily: 'DMSans_400Regular', marginTop: 2, marginBottom: 12, textAlign: 'center', fontStyle: 'italic' }}>
            Areas you did not log drop out, and the rest rebalance.
          </Text>
        )}

        {/* NUTRITION */}
        {score.nutritionScore !== null && nd ? (
          <SectionCard label="Nutrition" icon="restaurant" value={score.nutritionScore} weightPct={catPct(CATEGORY_WEIGHTS.nutrition)} innerRef={nutritionRef} categoryColor="#0d9268">
            {(nd.calorieHit || nd.calorieScore > 0) && input && (
              <SubRow
                name="Calories"
                labelColor="#0d9268"
                pts={`${Math.round(nd.calorieScore)} / 55`}
                subBlock={
                  <View style={{ flexDirection: 'row', marginTop: 6 }}>
                    <View style={{ flex: 1, alignItems: 'flex-start', paddingLeft: 2 }}>
                      <Text style={{ fontSize: 9, fontFamily: 'DMSans_700Bold', color: theme.textMuted, letterSpacing: 1.5 }}>EATEN</Text>
                      <Text style={{ fontSize: 13, fontFamily: 'DMSans_600SemiBold', color: theme.textSecondary, marginTop: 1 }}>{Math.round(input.consumed).toLocaleString()}</Text>
                    </View>
                    <View style={{ flex: 1, alignItems: 'flex-start', paddingLeft: 2 }}>
                      <Text style={{ fontSize: 9, fontFamily: 'DMSans_700Bold', color: theme.textMuted, letterSpacing: 1.5 }}>
                        {!isMindful && net !== null ? (net < 0 ? 'DEFICIT' : 'SURPLUS') : 'DAILY GOAL'}
                      </Text>
                      <Text style={{ fontSize: 13, fontFamily: 'DMSans_600SemiBold', color: theme.textSecondary, marginTop: 1 }}>
                        {!isMindful && net !== null
                          ? Math.abs(net).toLocaleString()
                          : Math.round(input.calTarget).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                }
              />
            )}
            {nd.proteinScore > 0 && input && (
              <SubRow
                name="Protein"
                labelColor="#0d9268"
                pts={`${Math.round(nd.proteinScore)} / 28`}
                subBlock={
                  <View style={{ flexDirection: 'row', marginTop: 6 }}>
                    <View style={{ flex: 1, alignItems: 'flex-start', paddingLeft: 2 }}>
                      <Text style={{ fontSize: 9, fontFamily: 'DMSans_700Bold', color: theme.textMuted, letterSpacing: 1.5 }}>EATEN</Text>
                      <Text style={{ fontSize: 13, fontFamily: 'DMSans_600SemiBold', color: theme.textSecondary, marginTop: 1 }}>{Math.round(input.actualProteinG)}g</Text>
                    </View>
                    <View style={{ flex: 1, alignItems: 'flex-start', paddingLeft: 2 }}>
                      <Text style={{ fontSize: 9, fontFamily: 'DMSans_700Bold', color: theme.textMuted, letterSpacing: 1.5 }}>DAILY GOAL</Text>
                      <Text style={{ fontSize: 13, fontFamily: 'DMSans_600SemiBold', color: theme.textSecondary, marginTop: 1 }}>{Math.round(input.proteinGoalG)}g</Text>
                    </View>
                  </View>
                }
              />
            )}
            {nd.waterScore > 0 && input && (
              <SubRow
                name="Water"
                labelColor="#0d9268"
                pts={`${Math.round(nd.waterScore)} / 17`}
                subBlock={
                  <View style={{ flexDirection: 'row', marginTop: 6 }}>
                    <View style={{ flex: 1, alignItems: 'flex-start', paddingLeft: 2 }}>
                      <Text style={{ fontSize: 9, fontFamily: 'DMSans_700Bold', color: theme.textMuted, letterSpacing: 1.5 }}>LOGGED</Text>
                      <Text style={{ fontSize: 13, fontFamily: 'DMSans_600SemiBold', color: theme.textSecondary, marginTop: 1 }}>{Math.round(input.waterLogged)} oz</Text>
                    </View>
                    <View style={{ flex: 1, alignItems: 'flex-start', paddingLeft: 2 }}>
                      <Text style={{ fontSize: 9, fontFamily: 'DMSans_700Bold', color: theme.textMuted, letterSpacing: 1.5 }}>DAILY GOAL</Text>
                      <Text style={{ fontSize: 13, fontFamily: 'DMSans_600SemiBold', color: theme.textSecondary, marginTop: 1 }}>{Math.round(input.waterGoal)} oz</Text>
                    </View>
                  </View>
                }
              />
            )}
          </SectionCard>
        ) : (
          <SectionCard label="Nutrition" icon="restaurant" value={null} innerRef={nutritionRef} categoryColor="#0d9268">
            <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'DMSans_400Regular', paddingVertical: 4 }}>
              {dietExcluded || waterExcluded ? 'Nutrition was excluded for this day.' : 'No food logged this day.'}
            </Text>
          </SectionCard>
        )}

        {/* ACTIVITY */}
        {score.activityScore !== null && ad ? (
          <SectionCard label="Activity" icon="barbell" value={score.activityScore} weightPct={catPct(CATEGORY_WEIGHTS.activity)} innerRef={activityRef} categoryColor="#d4860a">
            {ad.isMindfulPresence ? (
              <SubRow name="Movement" labelColor="#d4860a" detail={score.activityScore > 0 ? 'You moved your body today.' : 'A quiet day.'} />
            ) : ad.workoutScore !== null ? (
              <>
                {input && (
                  <SubRow
                    name="Active calories"
                    labelColor="#d4860a"
                    pts={`${Math.round(ad.activeCalScore)} / 60`}
                    subBlock={
                      <SubBlock
                        left={{ label: 'ACTIVE CALORIES', value: `${adjustedActive.toLocaleString()} kcal` }}
                        right={{ label: 'ACTIVE CAL GOAL', value: `${input.activeCalGoal.toLocaleString()} kcal` }}
                      />
                    }
                  />
                )}
                {input && (
                  <SubRow
                    name="Workout"
                    labelColor="#d4860a"
                    pts={`${Math.round(ad.workoutScore)} / 40`}
                    subBlock={
                      <SubBlock
                        left={input.workoutTotalCount > 0
                          ? { label: 'COMPLETED', value: `${input.workoutCompletedCount}` }
                          : { label: 'CARDIO', value: 'Complete' }}
                        right={input.dayData?.exerciseMinutes ? { label: 'ACTIVE MINS', value: `${input.dayData.exerciseMinutes} min` } : undefined}
                      />
                    }
                  />
                )}
              </>
            ) : (
              input && (
                <SubRow
                  name="Active calories"
                  labelColor="#d4860a"
                  pts={`${Math.round(ad.activeCalScore)} / 100`}
                  subBlock={
                    <SubBlock
                      left={{ label: 'ACTIVE CALORIES', value: `${adjustedActive.toLocaleString()} kcal` }}
                      right={{ label: 'ACTIVE CAL GOAL', value: `${input.activeCalGoal.toLocaleString()} kcal` }}
                    />
                  }
                />
              )
            )}
            {(cardioExerciseCount !== null || liftExerciseCount !== null) && (
              <View style={{ borderTopWidth: 0.5, borderTopColor: theme.borderCard, marginTop: 4, paddingTop: 4 }}>
                <SubBlock
                  left={{ label: 'CARDIO', value: cardioExerciseCount !== null ? `${cardioExerciseCount} ${cardioExerciseCount === 1 ? 'workout' : 'workouts'}` : '--' }}
                  right={{ label: 'LIFT', value: liftExerciseCount !== null ? `${liftExerciseCount} ${liftExerciseCount === 1 ? 'workout' : 'workouts'}` : '--' }}
                />
              </View>
            )}
            {input && input.steps > 0 && (
              <View style={{ borderTopWidth: 0.5, borderTopColor: theme.borderCard, marginTop: 4, paddingTop: 4 }}>
                <SubBlock
                  left={{ label: 'STEPS', value: input.steps.toLocaleString() }}
                  right={{ label: 'STEP GOAL', value: input.stepGoal > 0 ? input.stepGoal.toLocaleString() : '--' }}
                />
              </View>
            )}
          </SectionCard>
        ) : (
          <SectionCard label="Activity" icon="barbell" value={null} innerRef={activityRef} categoryColor="#d4860a">
            <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'DMSans_400Regular', paddingVertical: 4 }}>
              {exerciseExcluded ? 'Activity was excluded for this day.' : 'No activity data this day.'}
            </Text>
          </SectionCard>
        )}

        {/* RECOVERY */}
        {score.sleepScore !== null && sd ? (
          <SectionCard label="Recovery" icon="heart" value={score.sleepScore} weightPct={catPct(CATEGORY_WEIGHTS.sleep)} innerRef={recoveryRef} categoryColor="#9b7adb">
            <SubRow
              name="Sleep"
              labelColor="#9b7adb"
              pts={`${Math.round(sd.categoryScore)} / 100`}
              subBlock={input?.sleepHours != null ? (
                <SubBlock
                  left={{ label: 'SLEEP DURATION', value: formatSleepHours(input.sleepHours) }}
                  right={input.sleepGoal ? { label: 'SLEEP GOAL', value: formatSleepHours(input.sleepGoal) } : undefined}
                />
              ) : undefined}
            />
            {(input?.dayData?.restingHR != null || input?.dayData?.respiratoryRate != null || input?.dayData?.vo2Max != null || input?.dayData?.cardioRecovery != null) && (
              <View style={{ borderTopWidth: 0.5, borderTopColor: theme.borderCard, marginTop: 4, paddingTop: 4 }}>
                <SubBlock
                  left={{ label: 'RESTING HR', value: input?.dayData?.restingHR != null ? `${input.dayData.restingHR} bpm` : '--' }}
                  right={{ label: 'RESP RATE', value: input?.dayData?.respiratoryRate != null ? `${input.dayData.respiratoryRate}/min` : '--' }}
                />
                <SubBlock
                  left={{ label: 'VO2 MAX', value: input?.dayData?.vo2Max != null ? `${input.dayData.vo2Max} mL/kg/min` : '--' }}
                  right={{ label: 'CARDIO RECOVERY', value: input?.dayData?.cardioRecovery != null ? `${input.dayData.cardioRecovery} bpm` : '--' }}
                />
              </View>
            )}
          </SectionCard>
        ) : (
          <SectionCard label="Recovery" icon="heart" value={null} innerRef={recoveryRef} categoryColor="#9b7adb">
            <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'DMSans_400Regular', paddingVertical: 4 }}>No sleep logged this day.</Text>
          </SectionCard>
        )}

        {/* Disclaimer */}
        <Text style={{ fontSize: 10, color: theme.textDim, fontFamily: 'DMSans_400Regular', textAlign: 'center', marginTop: 10 }}>
          For informational purposes only. Not medical advice.
        </Text>

        {/* Exclude this day (inline confirm, mirrors the morning modal) */}
        {/* marginTop is on the wrapper (outside its measured frame) so the tutorial
            spotlight hugs just the button, not 16px of empty space above it. */}
        <View ref={excludeRef} collapsable={false} style={{ marginTop: 16 }}>
          {confirmingExclude ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
              <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'DMSans_400Regular' }}>Remove from your weekly average?</Text>
              <TouchableOpacity onPress={() => setConfirmingExclude(false)} hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}>
                <Text style={{ fontSize: 13, color: theme.textSecondary, fontFamily: 'DMSans_600SemiBold' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleExclude} hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}>
                <Text style={{ fontSize: 13, color: theme.statusBad, fontFamily: 'DMSans_600SemiBold' }}>Exclude</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setConfirmingExclude(true)} hitSlop={{ top: 10, bottom: 10, left: 20, right: 20 }} style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 12, color: theme.textDim, fontFamily: 'DMSans_400Regular', textDecorationLine: 'underline' }}>Exclude this day</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
