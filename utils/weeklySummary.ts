// utils/weeklySummary.ts
// Generation and storage for the Weekly Summary feature.
// Fires Sunday morning (same gate as Day Summary) and saves to pj_weekly_summary_{weekStart}.
// Generated once per week, never regenerated.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { storageSet } from './storage';
import { DayScore } from './dayScore';
import { loadCalorieTargets } from './calorieTarget';
import { CAL_MAX, PROTEIN_MAX, WATER_MAX } from './dayScore';

const WEEKLY_SUMMARY_KEY_PREFIX = 'pj_weekly_summary_';
const WEEKLY_GATE_KEY = 'pj_last_weekly_generated';

export interface WeekDayEntry {
  dateKey: string;
  dayLetter: string;
  score: number | null;
  nutritionScore: number | null;
  activityScore: number | null;
  sleepScore: number | null;
  excluded: boolean;
}

export interface WeeklySummaryData {
  weekStart: string;
  weekEnd: string;
  generatedDate: string;

  // Score
  avgComposite: number | null;
  avgNutritionScore: number | null;
  avgActivityScore: number | null;
  avgSleepScore: number | null;
  daysScored: number;

  // Day strip (7 entries, one per day Sun-Sat)
  days: WeekDayEntry[];

  // Nutrition
  avgCalories: number | null;
  calTarget: number;
  avgNet: number | null;
  avgProtein: number | null;
  proteinGoal: number;
  avgWater: number | null;
  waterGoal: number;
  daysLoggedNutrition: number;
  // Averaged point sub-scores (for the score-first display format: "41 / 55")
  avgCalorieScore: number | null;
  avgProteinScore: number | null;
  avgWaterScore: number | null;

  // Activity
  avgActiveCalories: number | null;
  avgSteps: number | null;
  workoutDays: number;
  avgExerciseMinutes: number | null;
  avgActiveCalScore: number | null;
  avgWorkoutScore: number | null;
  weekHadWorkouts: boolean;

  // Recovery (avgSleepScore is shared with score section above)
  avgSleepHours: number | null;
  avgSleepCategoryScore: number | null;

  // Weight
  startWeight: number | null;
  endWeight: number | null;
  weightChange: number | null;
  weightGoal: string;
}

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function dateKeyFromSunday(weekStart: string, offset: number): string {
  const [y, m, d] = weekStart.split('-').map(Number);
  const dt = new Date(y, m - 1, d + offset);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

function avg(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((s, v) => s + v, 0) / values.length);
}

function avgFloat(values: number[], decimals = 1): number | null {
  if (values.length === 0) return null;
  const sum = values.reduce((s, v) => s + v, 0);
  const factor = Math.pow(10, decimals);
  return Math.round((sum / values.length) * factor) / factor;
}

export async function loadWeeklySummary(weekStart: string): Promise<WeeklySummaryData | null> {
  try {
    const raw = await AsyncStorage.getItem(`${WEEKLY_SUMMARY_KEY_PREFIX}${weekStart}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function generateWeeklySummary(weekStart: string): Promise<WeeklySummaryData | null> {
  // Build the 7 date keys for this week (Sun through Sat)
  const dateKeys: string[] = [];
  for (let i = 0; i < 7; i++) dateKeys.push(dateKeyFromSunday(weekStart, i));
  const weekEnd = dateKeys[6];

  const storageKeys = dateKeys.map(k => `pj_${k}`);
  let pairs: readonly [string, string | null][] = [];
  try { pairs = await AsyncStorage.multiGet(storageKeys); } catch { return null; }

  // Load profile/settings for goal references
  let calTarget = 0, proteinGoal = 0, waterGoal = 0, weightGoal = 'maintain';
  let bmr = 0;
  try {
    const [profRaw, setRaw] = await Promise.all([
      AsyncStorage.getItem('pj_profile'),
      AsyncStorage.getItem('pj_settings'),
    ]);
    const profile = profRaw ? JSON.parse(profRaw) : {};
    const settings = setRaw ? JSON.parse(setRaw) : {};
    weightGoal = profile.weightGoal || 'maintain';

    // Use goalSnapshot from first scored day if available, else live values
    const todayKey = dateKeys[0];
    const targets = await loadCalorieTargets(todayKey);
    calTarget = targets.calTarget || 0;
    bmr = targets.bmr || 0;

    if (profile.macroMode === 'fixed' && profile.macroProteinG) {
      proteinGoal = parseFloat(profile.macroProteinG) || 0;
    } else if (profile.macroProteinPct && calTarget > 0) {
      proteinGoal = Math.round((parseFloat(profile.macroProteinPct) / 100) * calTarget / 4);
    }

    if (settings.waterGoal) waterGoal = parseFloat(settings.waterGoal) || 0;
    else if (profile.waterGoal) waterGoal = parseFloat(profile.waterGoal) || 0;
  } catch {}

  // Parse each day
  const dayMap: Record<string, any> = {};
  for (const [fullKey, raw] of pairs) {
    if (!raw) continue;
    const dk = fullKey.slice(3);
    try { dayMap[dk] = JSON.parse(raw); } catch {}
  }

  const dayEntries: WeekDayEntry[] = [];
  const composites: number[] = [];
  const nutritionScores: number[] = [];
  const activityScores: number[] = [];
  const sleepScores: number[] = [];

  const caloriesList: number[] = [];
  const netList: number[] = [];
  const proteinList: number[] = [];
  const waterList: number[] = [];
  const calScoreList: number[] = [];
  const protScoreList: number[] = [];
  const waterScoreList: number[] = [];

  const activeCaloriesList: number[] = [];
  const stepsList: number[] = [];
  const exerciseMinutesList: number[] = [];
  const activeCalScoreList: number[] = [];
  const workoutScoreList: number[] = [];
  let weekHadWorkouts = false;

  const sleepHoursList: number[] = [];
  const sleepCategoryScoreList: number[] = [];

  const weightEntries: { dateKey: string; weight: number }[] = [];

  let daysLoggedNutrition = 0;
  let workoutDays = 0;

  for (let i = 0; i < 7; i++) {
    const dk = dateKeys[i];
    const day = dayMap[dk];
    const dayScore: DayScore | undefined = day?.dayScore;
    const _ex = day?.excluded;
    const excluded = !!(
      day?.dayScore?.excludedFromAverages ||
      _ex === true ||
      (_ex && typeof _ex === 'object' && !!(_ex.diet && _ex.water && _ex.exercise))
    );

    dayEntries.push({
      dateKey: dk,
      dayLetter: DAY_LETTERS[i],
      score: dayScore && !excluded && typeof dayScore.composite === 'number' ? Math.round(dayScore.composite) : null,
      nutritionScore: dayScore && !excluded && dayScore.nutritionScore !== null ? Math.round(dayScore.nutritionScore) : null,
      activityScore: dayScore && !excluded && dayScore.activityScore !== null ? Math.round(dayScore.activityScore) : null,
      sleepScore: dayScore && !excluded && dayScore.sleepScore !== null ? Math.round(dayScore.sleepScore) : null,
      excluded,
    });

    if (!dayScore || excluded) continue;

    composites.push(dayScore.composite);
    if (dayScore.nutritionScore !== null) nutritionScores.push(dayScore.nutritionScore);
    if (dayScore.activityScore !== null) activityScores.push(dayScore.activityScore);
    if (dayScore.sleepScore !== null) sleepScores.push(dayScore.sleepScore);

    const entries: any[] = Array.isArray(day.entries) ? day.entries : [];
    if (entries.length > 0) {
      const cal = Math.round(entries.reduce((s: number, e: any) => s + (e.cal || 0), 0));
      const prot = Math.round(entries.reduce((s: number, e: any) => s + (e.protein || 0), 0));
      caloriesList.push(cal);
      proteinList.push(prot);
      daysLoggedNutrition++;

      // Net: consumed - active (with burn accuracy applied) - bmr
      const dayBmr = day.goalSnapshot?.bmr || bmr;
      const burnAccuracyPct = day.goalSnapshot?.burnAccuracyPct ?? 100;
      const active = Math.round((day.activeCalories || day.caloriesBurned || 0) * burnAccuracyPct / 100);
      if (dayBmr > 0) netList.push(cal - active - dayBmr);
    }

    if (dayScore.nutritionDetail) {
      calScoreList.push(dayScore.nutritionDetail.calorieScore);
      protScoreList.push(dayScore.nutritionDetail.proteinScore);
      waterScoreList.push(dayScore.nutritionDetail.waterScore);
    }

    const water = typeof day.water === 'number' ? day.water : 0;
    if (water > 0) waterList.push(water);

    const activeCalories = day.activeCalories || day.caloriesBurned || 0;
    if (activeCalories > 0) activeCaloriesList.push(activeCalories);

    const steps = day.steps || 0;
    if (steps > 0) stepsList.push(steps);

    const exMin = day.exerciseMinutes;
    if (typeof exMin === 'number' && exMin > 0) exerciseMinutesList.push(exMin);

    if (dayScore.activityDetail) {
      if (typeof dayScore.activityDetail.activeCalScore === 'number') {
        activeCalScoreList.push(dayScore.activityDetail.activeCalScore);
      }
      if (typeof dayScore.activityDetail.workoutScore === 'number' && dayScore.activityDetail.workoutScore > 0) {
        workoutScoreList.push(dayScore.activityDetail.workoutScore);
        weekHadWorkouts = true;
      }
    }

    if (dayScore.sleepDetail && typeof dayScore.sleepDetail.categoryScore === 'number') {
      sleepCategoryScoreList.push(dayScore.sleepDetail.categoryScore);
    }

    const sleepHours: number | null = day.sleepOverride ?? day.sleepHours ?? null;
    if (sleepHours && sleepHours > 0) sleepHoursList.push(sleepHours);

    if (day.weight && day.weight > 0) weightEntries.push({ dateKey: dk, weight: day.weight });

    // Workout days: scored workout (workoutScore > 0) or just had active calories
    if ((dayScore.activityDetail?.workoutScore ?? 0) > 0) {
      workoutDays++;
    } else if (activeCalories > 0) {
      workoutDays++;
    }
  }

  // Weight: start = first logged, end = last logged
  let startWeight: number | null = null;
  let endWeight: number | null = null;
  let weightChange: number | null = null;
  if (weightEntries.length >= 1) {
    weightEntries.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
    startWeight = weightEntries[0].weight;
    endWeight = weightEntries[weightEntries.length - 1].weight;
    weightChange = weightEntries.length >= 2
      ? Math.round((endWeight - startWeight) * 10) / 10
      : null;
  }

  const data: WeeklySummaryData = {
    weekStart,
    weekEnd,
    generatedDate: new Date().toISOString().slice(0, 10),

    avgComposite: avg(composites),
    avgNutritionScore: avg(nutritionScores),
    avgActivityScore: avg(activityScores),
    avgSleepScore: avg(sleepScores),
    daysScored: composites.length,

    days: dayEntries,

    avgCalories: avg(caloriesList),
    calTarget,
    avgNet: avg(netList),
    avgProtein: avg(proteinList),
    proteinGoal,
    avgWater: avgFloat(waterList),
    waterGoal,
    daysLoggedNutrition,
    avgCalorieScore: avg(calScoreList),
    avgProteinScore: avg(protScoreList),
    avgWaterScore: avg(waterScoreList),

    avgActiveCalories: avg(activeCaloriesList),
    avgSteps: avg(stepsList),
    workoutDays,
    avgExerciseMinutes: avg(exerciseMinutesList),
    avgActiveCalScore: avg(activeCalScoreList),
    avgWorkoutScore: avg(workoutScoreList),
    weekHadWorkouts,

    avgSleepHours: avgFloat(sleepHoursList),
    avgSleepCategoryScore: avg(sleepCategoryScoreList),

    startWeight,
    endWeight,
    weightChange,
    weightGoal,
  };

  await storageSet(`${WEEKLY_SUMMARY_KEY_PREFIX}${weekStart}`, JSON.stringify(data));
  return data;
}

// Returns the Sunday date key for the most recently closed week (last Sun-Sat).
// Called on Sunday morning to identify the week that just closed (Saturday night).
export function getLastClosedWeekStart(): string {
  const today = new Date();
  // Today is Sunday (day 0). Last Saturday = today - 1. Last Sunday = today - 7.
  const lastSunday = new Date(today);
  lastSunday.setDate(today.getDate() - 7);
  return `${lastSunday.getFullYear()}-${String(lastSunday.getMonth() + 1).padStart(2, '0')}-${String(lastSunday.getDate()).padStart(2, '0')}`;
}

// Gate check + generation. Called on first app load after 5am on Sunday.
// Safe to call multiple times (self-gated by storage key).
export async function checkAndGenerateWeeklySummary(): Promise<void> {
  try {
    const today = new Date();
    // Only fires on Sunday (day 0)
    if (today.getDay() !== 0) return;
    if (today.getHours() < 5) return;

    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const lastGenerated = await AsyncStorage.getItem(WEEKLY_GATE_KEY);
    if (lastGenerated === todayKey) return;

    const weekStart = getLastClosedWeekStart();
    const existing = await loadWeeklySummary(weekStart);
    if (!existing) {
      await generateWeeklySummary(weekStart);
    }

    await storageSet(WEEKLY_GATE_KEY, todayKey);
  } catch {}
}
