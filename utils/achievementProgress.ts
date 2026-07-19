// utils/achievementProgress.ts
// Shared "current progress toward each achievement" scanner. app/achievements.tsx and Otto's
// companionAchievements.ts both call loadProgressValues() directly -- there is no separate inline copy
// anywhere else to keep in sync with, so this IS the one source of truth (honest-numbers rule). Returns a
// map keyed by each AchievementDef.progressKey (waterGoalDays, stepGoalDays, greenSleepDays, totalLost,
// workoutDays, nutritionGoalDays, ...), plus the helper keys _startWeight / _goalWeight used to decide
// weight direction.
//
// logStreak fixed 2026-07-18: was building its date key with d.toISOString(), which converts to UTC
// first -- in a US timezone in the evening that rolls the key into TOMORROW, which never has data yet,
// so the streak broke on its first check and always read 0 (this is what made "All In" show 0/90 despite
// already holding "Sixty Strong"). Now uses local date components, matching the unlock check in
// checkMomentumAchievements (achievementData.ts). The OTHER toISOString spots below (waterGoalDays /
// stepGoalDays / totalLost) were NOT touched -- same latent risk, not confirmed broken, out of scope for
// this fix.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { evaluateCalorieGoalHit, paceTargetFromWeightGoal } from './goalHit';
import { buildDailyBmrMap } from './statsData';
import { effectiveExerciseMinutes } from './exerciseMinutes';

export async function loadProgressValues(): Promise<Record<string, number>> {
  const values: Record<string, number> = {};

  try {
    // waterGoalDays and stepGoalDays -- count days in storage where goal was hit
    // We scan last 365 days
    const profile = await AsyncStorage.getItem('pj_profile');
    const parsed  = profile ? JSON.parse(profile) : {};
    const profileWaterGoal = parsed.waterGoal ? parseInt(parsed.waterGoal) : 128;

    let waterDays      = 0;
    let stepDays       = 0;
    let activeCalDays  = 0;
    let exerciseMinDays = 0;
    let sleepAnyDays   = 0;
    let greenSleepDays = 0;
    const stepGoal        = parsed.stepGoal        ? parseInt(parsed.stepGoal)        : 10000;
    const activeCalGoal   = parsed.activeCalGoal   ? parseInt(parsed.activeCalGoal)   : 500;
    const exerciseMinsGoal = parsed.exerciseMinsGoal ? parseInt(parsed.exerciseMinsGoal) : 30;
    const sleepGoalNum = parsed.sleepGoal ? parseFloat(parsed.sleepGoal) : 7;
    const FEEL_BONUS: Record<number, number> = { 1: 0, 2: 10, 3: 20, 4: 30, 5: 40 };

    const today = new Date();

    // Batch-fetch the last 365 days in ONE round trip instead of 365 sequential ones -- the totalLost
    // scan just below reuses this same fetch since it's the identical UTC-based key list.
    const utcKeys: string[] = [];
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      utcKeys.push(`pj_${d.toISOString().split('T')[0]}`);
    }
    const utcPairs = await AsyncStorage.multiGet(utcKeys);
    const utcDayByKey = new Map<string, any>();
    for (const [key, raw] of utcPairs) {
      if (!raw) continue;
      try { utcDayByKey.set(key, JSON.parse(raw)); } catch { /* skip corrupted day */ }
    }

    for (const key of utcKeys) {
      const day = utcDayByKey.get(key);
      if (!day) continue;
      const dayWaterGoal = day.waterGoal ? parseInt(day.waterGoal) : profileWaterGoal;
      if ((day.water ?? 0) >= dayWaterGoal) waterDays++;
      if ((day.steps ?? 0) >= stepGoal)    stepDays++;
      // Active-calorie + exercise-minute goal days -- same thresholds the Home screen uses to fire the
      // daily-goal celebration, so the Daily Goals card can show an accurate recount instead of its
      // lossy live tally. Active cals fall back to caloriesBurned (matches statsData); exercise minutes
      // blend Apple Health + manual timer via effectiveExerciseMinutes.
      const activeCals = day.activeCalories ?? day.caloriesBurned ?? 0;
      if (activeCalGoal > 0 && activeCals >= activeCalGoal) activeCalDays++;
      if (exerciseMinsGoal > 0 && effectiveExerciseMinutes(day) >= exerciseMinsGoal) exerciseMinDays++;
      const sleepHrs = day.sleepOverride ?? day.sleepHours ?? null;
      if (sleepHrs && sleepHrs > 0) {
        sleepAnyDays++;
        const stages = day.sleepStages ?? null;
        const feel   = day.sleepFeelRating ?? null;
        let score: number | null = null;
        if (stages && stages.totalMs > 0) {
          const durPts  = Math.min(40, Math.pow(sleepHrs / sleepGoalNum, 3) * 40);
          const deepPts = Math.min(30, ((stages.deep / stages.totalMs) / 0.20) * 30);
          const remPts  = Math.min(30, ((stages.rem  / stages.totalMs) / 0.22) * 30);
          score = Math.round(Math.min(100, durPts + deepPts + remPts));
        } else if (feel) {
          const durPts = Math.min(60, (sleepHrs / sleepGoalNum) * 60);
          score = Math.round(Math.min(100, durPts + (FEEL_BONUS[feel] ?? 0)));
        }
        if (score !== null && score >= 85) greenSleepDays++;
      }
    }

    values['waterGoalDays']       = waterDays;
    values['stepGoalDays']        = stepDays;
    values['activeCalGoalDays']   = activeCalDays;
    values['exerciseMinsGoalDays'] = exerciseMinDays;
    values['sleepAnyDays']   = sleepAnyDays;
    values['greenSleepDays'] = greenSleepDays;

    // totalLost -- earliest vs most recent weight (same 365-day batch fetched above, walked oldest -> newest)
    let earliestWeight: number | null = null;
    let mostRecentWeight: number | null = null;
    for (let i = utcKeys.length - 1; i >= 0; i--) {
      const day = utcDayByKey.get(utcKeys[i]);
      if (day && day.weight) {
        if (!earliestWeight) earliestWeight = day.weight;
        mostRecentWeight = day.weight;
      }
    }
    if (earliestWeight && mostRecentWeight) {
      values['totalLost']   = Math.max(0, earliestWeight - mostRecentWeight);
      values['totalGained'] = Math.max(0, mostRecentWeight - earliestWeight);
    } else {
      values['totalLost']   = 0;
      values['totalGained'] = 0;
    }
    values['_startWeight'] = earliestWeight ?? 0;
    if (parsed.goalWeight) values['_goalWeight'] = parseFloat(parsed.goalWeight);

    // logStreak -- count consecutive days from today going back that have any data
    // LOCAL date components, not toISOString() (which converts to UTC first): in a US timezone in the
    // evening, toISOString() rolls the date into tomorrow, which never has data yet, so the streak broke
    // on its very first check and always read 0. Matches the local-date key checkMomentumAchievements
    // uses to unlock the SAME achievement, in achievementData.ts.
    // Different key format than the UTC scan above (local date components), so it needs its own batch --
    // still one round trip instead of up to 365 sequential ones.
    const localKeys: string[] = [];
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      localKeys.push(`pj_${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    }
    const localPairs = await AsyncStorage.multiGet(localKeys);
    let streak = 0;
    for (const [, raw] of localPairs) {
      if (raw) streak++; else break;
    }
    values['logStreak'] = streak;

    // generalJournalEntries -- personal/fitness/workout entries only (gratitude is in faith)
    const GENERAL_JOURNAL_CATS = ['personal', 'fitness', 'workout'];
    const journalRaw = await AsyncStorage.getItem('pj_bible_reflections');
    const journalEntries: Array<{ category?: string }> = journalRaw ? JSON.parse(journalRaw) : [];
    values['generalJournalEntries'] = Array.isArray(journalEntries)
      ? journalEntries.filter(e => GENERAL_JOURNAL_CATS.includes(e.category ?? '')).length
      : 0;

    // Faith journal counts -- verse, prayer, gratitude from pj_bible_reflections
    if (Array.isArray(journalEntries)) {
      values['verseReflections']  = journalEntries.filter(e => e.category === 'verse').length;
      values['prayerEntries']     = journalEntries.filter(e => e.category === 'prayer').length;
      values['gratitudeEntries']  = journalEntries.filter(e => e.category === 'gratitude').length;
    } else {
      values['verseReflections']  = 0;
      values['prayerEntries']     = 0;
      values['gratitudeEntries']  = 0;
    }

    // bibleReadingDays -- cumulative completed days across all reading plans
    const plansRaw = await AsyncStorage.getItem('pj_reading_plans');
    const plans: Record<string, { completedDays?: number[] }> = plansRaw ? JSON.parse(plansRaw) : {};
    values['bibleReadingDays'] = Object.values(plans).reduce(
      (acc, prog) => acc + new Set(prog.completedDays ?? []).size,
      0
    );

    // workoutDays -- days with at least one exercise logged
    const workoutRaw = await AsyncStorage.getItem('pj_workout_state');
    const workoutState = workoutRaw ? JSON.parse(workoutRaw) : {};
    const workoutPrograms: Record<string, { exercises?: { id: string }[] }> = workoutState.programs ?? {};
    const workoutChecks: Record<string, Record<string, boolean>> = workoutState.checks ?? {};
    // Checks-based, matching the unlock check in achievementData.ts -- see the note there.
    values['workoutDays'] = Object.keys(workoutPrograms).filter(key => {
      const exs = workoutPrograms[key]?.exercises;
      if (!Array.isArray(exs) || exs.length === 0) return false;
      const dayChecks = workoutChecks[key] || {};
      return exs.some(e => dayChecks[e.id]);
    }).length;

    // nutritionGoalDays -- completed days that hit the calorie goal per the shared
    // evaluator (utils/goalHit). Way 1 (consumed vs static target) when active cals
    // are below the floor, Way 2 (net vs pace target) otherwise. Burn-accuracy and
    // per-day BMR applied. Excludes today (in-progress). Mirrors achievementData.ts
    // checkNutritionAchievements byte-for-byte so the page and the engine agree.
    let nutritionCalTarget = parseFloat(parsed.calTarget) || 0;
    let nutritionWeightGoal = parsed.weightGoal || '';
    let nutritionBurnAccuracy = 100;
    try {
      const settingsRaw2 = await AsyncStorage.getItem('pj_settings');
      const settings2    = settingsRaw2 ? JSON.parse(settingsRaw2) : {};
      nutritionCalTarget = parseFloat(settings2.calTarget) || nutritionCalTarget;
      if (settings2.burnAccuracyPct !== undefined) nutritionBurnAccuracy = settings2.burnAccuracyPct;
    } catch {}
    let nutritionGoalDays = 0;
    if (nutritionCalTarget > 0) {
      const nutritionPaceTarget = paceTargetFromWeightGoal(nutritionWeightGoal);
      // NOTE: verbatim from the screen -- `today` is a Date object, so `pj_${today}` stringifies to
      // "pj_Sun Jul 05 2026..." and never matches a real day key. Kept IDENTICAL so this number equals the
      // screen's exactly; do not "fix" it here without changing app/achievements.tsx in lockstep.
      const allKeys   = await AsyncStorage.getAllKeys();
      const dailyKeys = (allKeys as string[]).filter(
        k => /^pj_\d{4}-\d{2}-\d{2}$/.test(k) && k !== `pj_${today}`
      );
      const bmrMap = await buildDailyBmrMap(dailyKeys.map(k => k.slice(3)));
      // Batch-fetch every matching day in ONE round trip instead of one getItem per key -- this list has
      // no 365-day cap, so for a long-time user it was the worst offender of all four loops in this file.
      const dailyPairs = await AsyncStorage.multiGet(dailyKeys);
      for (const [key, raw] of dailyPairs) {
        try {
          if (!raw) continue;
          const day     = JSON.parse(raw);
          const entries = Array.isArray(day.entries) ? day.entries.filter(Boolean) : [];
          if (entries.length < 1) continue;
          const consumed = entries.reduce((s: number, e: any) => s + (e.cal || 0), 0);
          const result = evaluateCalorieGoalHit({
            consumed,
            dayData: day,
            dayBmr: bmrMap[key.slice(3)] ?? 0,
            calTarget: nutritionCalTarget,
            paceTarget: nutritionPaceTarget,
            burnAccuracyPct: nutritionBurnAccuracy,
            isToday: false,
            minutesNow: 0,
          });
          if (result.hit) nutritionGoalDays++;
        } catch { /* skip corrupted day */ }
      }
    }
    values['nutritionGoalDays'] = nutritionGoalDays;

  } catch (e) {
    console.log('Progress load error', e);
  }

  return values;
}
