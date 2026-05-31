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
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme';
import TooltipIcon from '../components/TooltipIcon';
import { useToast } from '../components/Toast';
import { ScoreRing } from '../components/DaySummaryModal';
import { DayScore, DayScoreInput, scoreLabel, StyleMode, CATEGORY_WEIGHTS } from '../utils/dayScore';
import { buildDayScoreInput, excludeDayFromAverages } from '../utils/dayScoreStore';
import { winAndCoachLines, contextLine as computeContextLine, hadFaithEntryOn } from '../utils/daySummaryCopy';
import { useTutorialTarget } from '../hooks/useTutorialTarget';

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
  const [winLine, setWinLine] = useState('');
  const [coachLine, setCoachLine] = useState('');
  const [contextLine, setContextLine] = useState('');
  const styleMode: StyleMode = (input?.styleMode as StyleMode) || 'balanced';
  const isMindful = styleMode === 'mindful';

  // Tutorial spotlight targets (the tour lives on this page, not the modal).
  const ringRef = useTutorialTarget('ds_ring');
  const nutritionRef = useTutorialTarget('ds_nutrition');
  const activityRef = useTutorialTarget('ds_activity');
  const recoveryRef = useTutorialTarget('ds_recovery');
  const excludeRef = useTutorialTarget('ds_exclude');

  // Fast-exclude from the page (mirrors the modal): heavy haptic, write, toast,
  // then back to wherever the user came from (the archive shows a dash).
  const handleExclude = async () => {
    if (!date) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await excludeDayFromAverages(date);
    showToast('Day excluded', 'Removed from your weekly average', 'success');
    router.back();
  };

  useEffect(() => {
    (async () => {
      if (!date) { setLoading(false); return; }
      try {
        const raw = await AsyncStorage.getItem(`pj_${date}`);
        const day = raw ? JSON.parse(raw) : null;
        const sc: DayScore | null = day?.dayScore ?? null;
        setScore(sc);
        const ex = day?.excluded;
        setExcluded(ex === true || (ex && typeof ex === 'object' && !!(ex.diet && ex.water && ex.exercise)));
        const inp = await buildDayScoreInput(date, new Date().toISOString());
        setInput(inp);

        // Narrative lines (shared with the morning modal): win, coach, context.
        if (sc) {
          const mindful = (inp?.styleMode ?? 'balanced') === 'mindful';
          let faithJourney = 'rooted';
          try {
            const s = await AsyncStorage.getItem('pj_settings');
            if (s) faithJourney = JSON.parse(s)?.faithJourney ?? 'rooted';
          } catch {}
          const faithEligible = faithJourney === 'rooted' && (await hadFaithEntryOn(date));
          const lines = winAndCoachLines(sc, mindful, faithEligible);
          setWinLine(lines.winLine);
          setCoachLine(lines.coachLine);
          setContextLine(await computeContextLine(date, sc.composite, mindful));
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
      <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
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
  const net = input ? Math.round(input.consumed - adjustedActive - input.dayBmr) : null;
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
  const SectionCard = ({ label, value, icon, weightPct, innerRef, children }: { label: string; value: number | null; icon: keyof typeof Ionicons.glyphMap; weightPct?: number | null; innerRef: React.RefObject<View>; children: React.ReactNode }) => {
    const barC = value !== null ? tierColor(value) : theme.textDim;
    return (
      <View ref={innerRef} collapsable={false} style={{
        backgroundColor: theme.bgCard, borderRadius: 14, borderWidth: 0.5, borderColor: theme.borderCard,
        borderTopColor: 'rgba(255,255,255,0.1)', borderLeftWidth: 3, borderLeftColor: barC,
        padding: 16, paddingLeft: 15, marginBottom: 12,
      }}>
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

  // One sub-component row: name, the real numbers, and points earned.
  const SubRow = ({ name, detail, pts }: { name: string; detail: string; pts?: string }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 7, borderTopWidth: 0.5, borderTopColor: theme.borderSubtle }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, color: theme.textSecondary, fontFamily: 'DMSans_600SemiBold' }}>{name}</Text>
        <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'DMSans_400Regular', marginTop: 1 }}>{detail}</Text>
      </View>
      {!!pts && (
        <Text style={{ fontSize: 12, color: theme.textSecondary, fontFamily: 'DMSans_600SemiBold' }}>{pts}</Text>
      )}
    </View>
  );

  const nd = score.nutritionDetail;
  const ad = score.activityDetail;
  const sd = score.sleepDetail;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bgPrimary }}>
      {Header}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>

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
          {!!winLine && (
            <Text style={{ fontSize: 14, color: theme.accentBlue, fontFamily: 'DMSans_400Regular', fontStyle: 'italic', textAlign: 'center', marginTop: 12, lineHeight: 20, paddingHorizontal: 12 }}>{winLine}</Text>
          )}
          {!!coachLine && (
            <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'DMSans_400Regular', fontStyle: 'italic', textAlign: 'center', marginTop: 6, lineHeight: 17, paddingHorizontal: 12 }}>{coachLine}</Text>
          )}
        </View>

        {presentCats.length < 3 && (
          <Text style={{ fontSize: 11, color: theme.textMuted, fontFamily: 'DMSans_400Regular', marginTop: 2, marginBottom: 12, textAlign: 'center', fontStyle: 'italic' }}>
            Areas you did not log drop out, and the rest rebalance.
          </Text>
        )}

        {/* NUTRITION */}
        {score.nutritionScore !== null && nd ? (
          <SectionCard label="Nutrition" icon="restaurant" value={score.nutritionScore} weightPct={catPct(CATEGORY_WEIGHTS.nutrition)} innerRef={nutritionRef}>
            {(nd.calorieHit || nd.calorieScore > 0) && (
              <SubRow
                name="Calories"
                detail={nd.calorieHit
                  ? `On target${net !== null ? ` · net ${net > 0 ? '+' : ''}${net} kcal` : ''}`
                  : `Net ${net !== null ? `${net > 0 ? '+' : ''}${net}` : '--'} kcal vs ${input ? `${input.paceTarget > 0 ? '+' : ''}${input.paceTarget}` : '--'} pace`}
                pts={`${Math.round(nd.calorieScore)} / 55`}
              />
            )}
            {nd.proteinScore > 0 && input && (
              <SubRow name="Protein" detail={`${Math.round(input.actualProteinG)}g of ${Math.round(input.proteinGoalG)}g goal`} pts={`${Math.round(nd.proteinScore)} / 28`} />
            )}
            {nd.waterScore > 0 && input && (
              <SubRow name="Water" detail={`${Math.round(input.waterLogged)}oz of ${Math.round(input.waterGoal)}oz goal`} pts={`${Math.round(nd.waterScore)} / 17`} />
            )}
          </SectionCard>
        ) : (
          <SectionCard label="Nutrition" icon="restaurant" value={null} innerRef={nutritionRef}>
            <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'DMSans_400Regular', paddingVertical: 4 }}>
              {dietExcluded || waterExcluded ? 'Nutrition was excluded for this day.' : 'No food logged this day.'}
            </Text>
          </SectionCard>
        )}

        {/* ACTIVITY */}
        {score.activityScore !== null && ad ? (
          <SectionCard label="Activity" icon="barbell" value={score.activityScore} weightPct={catPct(CATEGORY_WEIGHTS.activity)} innerRef={activityRef}>
            {ad.isMindfulPresence ? (
              <SubRow name="Movement" detail={score.activityScore > 0 ? 'You moved your body today.' : 'A quiet day.'} />
            ) : ad.workoutScore !== null ? (
              <>
                {input && <SubRow name="Active calories" detail={`${adjustedActive} of ${input.activeCalGoal} kcal goal`} pts={`${Math.round(ad.activeCalScore)} / 60`} />}
                {input && <SubRow name="Workout" detail={input.workoutTotalCount > 0 ? `${input.workoutCompletedCount} of ${input.workoutTotalCount} exercises` : 'Cardio session complete'} pts={`${Math.round(ad.workoutScore)} / 40`} />}
              </>
            ) : (
              input && <SubRow name="Active calories" detail={`${adjustedActive} kcal${input.dayType === 'rest' ? ' · rest day floor applied' : ''}`} pts={`${Math.round(ad.activeCalScore)} / 100`} />
            )}
          </SectionCard>
        ) : (
          <SectionCard label="Activity" icon="barbell" value={null} innerRef={activityRef}>
            <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'DMSans_400Regular', paddingVertical: 4 }}>
              {exerciseExcluded ? 'Activity was excluded for this day.' : 'No activity data this day.'}
            </Text>
          </SectionCard>
        )}

        {/* RECOVERY */}
        {score.sleepScore !== null && sd ? (
          <SectionCard label="Recovery" icon="heart" value={score.sleepScore} weightPct={catPct(CATEGORY_WEIGHTS.sleep)} innerRef={recoveryRef}>
            <SubRow name="Sleep score" detail={`Raw ${Math.round(sd.rawSleepScore)} of 100`} pts={`${Math.round(sd.categoryScore)} / 100`} />
            <Text style={{ fontSize: 11, color: theme.textMuted, fontFamily: 'DMSans_400Regular', marginTop: 8, lineHeight: 16, fontStyle: 'italic' }}>
              Logged sleep never scores below 50, so a rough night will not tank your day.
            </Text>
          </SectionCard>
        ) : (
          <SectionCard label="Recovery" icon="heart" value={null} innerRef={recoveryRef}>
            <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'DMSans_400Regular', paddingVertical: 4 }}>No sleep logged this day.</Text>
          </SectionCard>
        )}

        {/* Disclaimer */}
        <Text style={{ fontSize: 10, color: theme.textDim, fontFamily: 'DMSans_400Regular', textAlign: 'center', marginTop: 10 }}>
          For informational purposes only. Not medical advice.
        </Text>

        {/* Exclude this day (inline confirm, mirrors the morning modal) */}
        <View ref={excludeRef} collapsable={false}>
          {confirmingExclude ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 16, flexWrap: 'wrap' }}>
              <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'DMSans_400Regular' }}>Remove from your weekly average?</Text>
              <TouchableOpacity onPress={() => setConfirmingExclude(false)} hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}>
                <Text style={{ fontSize: 13, color: theme.textSecondary, fontFamily: 'DMSans_600SemiBold' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleExclude} hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}>
                <Text style={{ fontSize: 13, color: theme.statusBad, fontFamily: 'DMSans_600SemiBold' }}>Exclude</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setConfirmingExclude(true)} hitSlop={{ top: 10, bottom: 10, left: 20, right: 20 }} style={{ alignItems: 'center', marginTop: 16 }}>
              <Text style={{ fontSize: 12, color: theme.textDim, fontFamily: 'DMSans_400Regular', textDecorationLine: 'underline' }}>Exclude this day</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
