import AsyncStorage from '@react-native-async-storage/async-storage';
import { storageSet } from './storage';
import { DayScore } from './dayScore';
import { loadCalorieTargets } from './calorieTarget';

const MONTHLY_SUMMARY_KEY_PREFIX = 'pj_monthly_summary_';
const MONTHLY_GATE_KEY = 'pj_last_monthly_generated';

export interface MonthDayEntry {
  dateKey: string;
  dayOfWeek: number; // 0=Sun, 6=Sat -- for calendar grid column placement
  score: number | null;
  nutritionScore: number | null;
  activityScore: number | null;
  sleepScore: number | null;
  excluded: boolean;
}

export interface MonthlySummaryData {
  monthKey: string;      // YYYY-MM
  monthStart: string;    // YYYY-MM-01
  monthEnd: string;      // YYYY-MM-DD (last day)
  generatedDate: string;
  daysInMonth: number;

  // Scores
  avgComposite: number | null;
  avgNutritionScore: number | null;
  avgActivityScore: number | null;
  avgSleepScore: number | null;
  daysScored: number;

  // Calendar (one entry per calendar day, 28-31 entries)
  days: MonthDayEntry[];

  // Nutrition
  avgCalories: number | null;
  calTarget: number;
  avgNet: number | null;
  avgProtein: number | null;
  proteinGoal: number;
  avgWater: number | null;
  waterGoal: number;
  daysLoggedNutrition: number;
  avgCalorieScore: number | null;
  avgProteinScore: number | null;
  avgWaterScore: number | null;
  avgCarbs: number | null;
  avgFat: number | null;
  avgFiber: number | null;
  avgSodium: number | null;
  daysCalorieGoalHit: number;

  // Activity
  avgActiveCalories: number | null;
  activeCalGoal: number;
  avgSteps: number | null;
  workoutDays: number;
  avgExerciseMinutes: number | null;
  avgActiveCalScore: number | null;
  avgWorkoutScore: number | null;
  monthHadWorkouts: boolean;
  stepGoalDays: number;
  totalCardioSessions: number;
  totalLiftSessions: number;

  // Recovery
  avgRecoveryScore: number | null;       // avg real third-category value (recovery, or raw sleep on fallback) -- the card headline
  avgHRV: number | null;                 // avg overnight HRV (recovery factor)
  avgSleepHours: number | null;
  avgSleepCategoryScore: number | null;
  sleepGoal: number;
  avgRestingHR: number | null;
  avgRespiratoryRate: number | null;
  avgPrevActivity: number | null;        // avg prior-day active calories (recovery factor)
  avgBloodOxygen: number | null;         // avg overnight SpO2 (informational)
  monthVo2Max: number | null;
  monthCardioRecovery: number | null;

  // Weight
  startWeight: number | null;
  endWeight: number | null;
  weightChange: number | null;
  weightGoal: string;
}

function avg(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((s, v) => s + v, 0) / values.length);
}

function avgFloat(values: number[], decimals = 1): number | null {
  if (values.length === 0) return null;
  const factor = Math.pow(10, decimals);
  return Math.round((values.reduce((s, v) => s + v, 0) / values.length) * factor) / factor;
}

function advancedNutrient(entries: any[], nutrientName: string): number {
  return entries.reduce((s: number, e: any) => {
    const n = (e.foodNutrients as any[])?.find((fn: any) => fn.nutrientName === nutrientName);
    if (!n) return s;
    let scale: number;
    if (e.fsId) {
      scale = (e.calPer100g && e.calPer100g > 0) ? (e.cal / e.calPer100g) : 0;
    } else {
      const sg = e.servingGrams;
      const servingCal = sg && (e.calPer100g ?? 0) > 0 ? (e.calPer100g ?? 0) * sg / 100 : 0;
      scale = servingCal > 0 ? e.cal / servingCal : 0;
    }
    return s + (n.value || 0) * scale;
  }, 0);
}

function dateKeyFromMonthDay(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
function dayNameFromDateKey(dk: string): string {
  const [y, m, d] = dk.split('-').map(Number);
  return DAY_NAMES[new Date(y, m - 1, d).getDay()];
}

export async function loadMonthlySummary(monthKey: string): Promise<MonthlySummaryData | null> {
  try {
    const raw = await AsyncStorage.getItem(`${MONTHLY_SUMMARY_KEY_PREFIX}${monthKey}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function generateMonthlySummary(monthKey: string): Promise<MonthlySummaryData | null> {
  const [y, m] = monthKey.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate(); // day 0 of next month = last day of this month

  const dateKeys: string[] = [];
  for (let d = 1; d <= daysInMonth; d++) dateKeys.push(dateKeyFromMonthDay(y, m, d));

  const monthStart = dateKeys[0];
  const monthEnd = dateKeys[dateKeys.length - 1];

  const storageKeys = dateKeys.map(k => `pj_${k}`);
  let pairs: readonly [string, string | null][] = [];
  try { pairs = await AsyncStorage.multiGet(storageKeys); } catch { return null; }

  let calTarget = 0, proteinGoal = 0, waterGoal = 0, weightGoal = 'maintain';
  let stepGoal = 10000, sleepGoal = 8, activeCalGoal = 500;
  let bmr = 0;
  let workoutState: any = {};
  try {
    const [profRaw, setRaw, workoutRaw] = await Promise.all([
      AsyncStorage.getItem('pj_profile'),
      AsyncStorage.getItem('pj_settings'),
      AsyncStorage.getItem('pj_workout_state'),
    ]);
    const profile = profRaw ? JSON.parse(profRaw) : {};
    const settings = setRaw ? JSON.parse(setRaw) : {};
    workoutState = workoutRaw ? JSON.parse(workoutRaw) : {};
    weightGoal = profile.weightGoal || 'maintain';

    const targets = await loadCalorieTargets(dateKeys[0]);
    calTarget = targets.calTarget || 0;
    bmr = targets.bmr || 0;

    if (profile.macroMode === 'fixed' && profile.macroProteinG) {
      proteinGoal = parseFloat(profile.macroProteinG) || 0;
    } else if (profile.macroProteinPct && calTarget > 0) {
      proteinGoal = Math.round((parseFloat(profile.macroProteinPct) / 100) * calTarget / 4);
    }

    if (settings.waterGoal) waterGoal = parseFloat(settings.waterGoal) || 0;
    else if (profile.waterGoal) waterGoal = parseFloat(profile.waterGoal) || 0;
    if (profile.stepGoal) stepGoal = parseFloat(profile.stepGoal) || 10000;
    if (profile.sleepGoal) sleepGoal = parseFloat(profile.sleepGoal) || 8;
    if (profile.activeCalGoal) activeCalGoal = parseFloat(profile.activeCalGoal) || 500;
  } catch {}

  const dayMap: Record<string, any> = {};
  for (const [fullKey, raw] of pairs) {
    if (!raw) continue;
    const dk = fullKey.slice(3);
    try { dayMap[dk] = JSON.parse(raw); } catch {}
  }

  const dayEntries: MonthDayEntry[] = [];
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
  const carbsList: number[] = [];
  const fatList: number[] = [];
  const fiberList: number[] = [];
  const sodiumList: number[] = [];
  let daysLoggedNutrition = 0;
  let daysCalorieGoalHit = 0;

  const activeCaloriesList: number[] = [];
  const stepsList: number[] = [];
  const exerciseMinutesList: number[] = [];
  const activeCalScoreList: number[] = [];
  const workoutScoreList: number[] = [];
  let monthHadWorkouts = false;
  let workoutDays = 0;
  let stepGoalDays = 0;
  let totalCardioSessions = 0;
  let totalLiftSessions = 0;

  const sleepHoursList: number[] = [];
  const sleepCategoryScoreList: number[] = [];
  const restingHRList: number[] = [];
  const respiratoryRateList: number[] = [];
  const recoveryScoreList: number[] = [];
  const hrvList: number[] = [];
  const spo2List: number[] = [];
  const prevActivityList: number[] = [];
  let monthVo2Max: number | null = null;
  let monthCardioRecovery: number | null = null;

  // Active calories of the day BEFORE the month starts, so day 1 has a prior-day
  // activity value for the recovery "Prev. Activity" factor. Raw (not burn-adjusted),
  // matching recoveryScore.ts. Other days read their prior day from dayMap.
  let dayBeforeMonthKey = '';
  let dayBeforeMonthActive = 0;
  try {
    const [fy, fm, fd] = dateKeys[0].split('-').map(Number);
    const bdt = new Date(fy, fm - 1, fd - 1);
    dayBeforeMonthKey = `${bdt.getFullYear()}-${String(bdt.getMonth() + 1).padStart(2, '0')}-${String(bdt.getDate()).padStart(2, '0')}`;
    const r = await AsyncStorage.getItem(`pj_${dayBeforeMonthKey}`);
    if (r) { const d = JSON.parse(r); dayBeforeMonthActive = d.activeCalories || d.caloriesBurned || 0; }
  } catch {}

  const weightEntries: { dateKey: string; weight: number }[] = [];

  for (const dk of dateKeys) {
    const [dy, dm, dd] = dk.split('-').map(Number);
    const dayOfWeek = new Date(dy, dm - 1, dd).getDay();
    const day = dayMap[dk];
    const dayScore: DayScore | undefined = day?.dayScore;
    const _ex = day?.excluded;
    const excluded = !!(
      day?.dayScore?.excludedFromAverages ||
      (_ex && typeof _ex === 'object' && !!(_ex.diet && _ex.water && _ex.exercise))
    );

    dayEntries.push({
      dateKey: dk,
      dayOfWeek,
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

    const burnAccuracyPct = day.goalSnapshot?.burnAccuracyPct ?? 100;
    const entries: any[] = Array.isArray(day.entries) ? day.entries : [];
    if (entries.length > 0) {
      const cal = Math.round(entries.reduce((s: number, e: any) => s + (e.cal || 0), 0));
      const prot = Math.round(entries.reduce((s: number, e: any) => s + (e.protein || 0), 0));
      const carbs = Math.round(entries.reduce((s: number, e: any) => s + (e.carbs || 0), 0));
      const fat = Math.round(entries.reduce((s: number, e: any) => s + (e.fat || 0), 0));
      const fiber = Math.round(advancedNutrient(entries, 'Fiber, total dietary'));
      const sodium = Math.round(advancedNutrient(entries, 'Sodium, Na'));
      caloriesList.push(cal);
      proteinList.push(prot);
      carbsList.push(carbs);
      fatList.push(fat);
      if (fiber > 0) fiberList.push(fiber);
      if (sodium > 0) sodiumList.push(sodium);
      daysLoggedNutrition++;

      const dayBmr = day.goalSnapshot?.bmr || bmr;
      const active = Math.round((day.activeCalories || day.caloriesBurned || 0) * burnAccuracyPct / 100);
      if (dayBmr > 0) netList.push(cal - active - dayBmr);
    }

    if (dayScore.nutritionDetail) {
      calScoreList.push(dayScore.nutritionDetail.calorieScore);
      protScoreList.push(dayScore.nutritionDetail.proteinScore);
      waterScoreList.push(dayScore.nutritionDetail.waterScore);
      if (dayScore.nutritionDetail.calorieHit === true) daysCalorieGoalHit++;
    }

    const water = typeof day.water === 'number' ? day.water : 0;
    if (water > 0) waterList.push(water);

    const rawActive = day.activeCalories || day.caloriesBurned || 0;
    const activeCalories = Math.round(rawActive * burnAccuracyPct / 100);
    if (activeCalories > 0) activeCaloriesList.push(activeCalories);

    const steps = day.steps || 0;
    if (steps > 0) stepsList.push(steps);

    const exMin = day.exerciseMinutes;
    if (typeof exMin === 'number' && exMin > 0) exerciseMinutesList.push(exMin);

    if (typeof day.restingHR === 'number' && day.restingHR > 0) restingHRList.push(day.restingHR);
    if (typeof day.respiratoryRate === 'number' && day.respiratoryRate > 0) respiratoryRateList.push(day.respiratoryRate);
    if (typeof day.vo2Max === 'number' && day.vo2Max > 0) monthVo2Max = day.vo2Max;
    if (typeof day.cardioRecovery === 'number' && day.cardioRecovery > 0) monthCardioRecovery = day.cardioRecovery;

    // Recovery factors: the real third-category value + overnight HRV / SpO2 + prior-day load.
    if (typeof dayScore.recoveryCategoryScore === 'number') recoveryScoreList.push(dayScore.recoveryCategoryScore);
    const rsig = day.recoverySignals;
    if (rsig && typeof rsig.hrv === 'number' && rsig.hrv > 0) hrvList.push(rsig.hrv);
    if (rsig && typeof rsig.spo2 === 'number' && rsig.spo2 > 0) spo2List.push(rsig.spo2);
    const [ppy, ppm, ppd] = dk.split('-').map(Number);
    const pdt = new Date(ppy, ppm - 1, ppd - 1);
    const prevKey = `${pdt.getFullYear()}-${String(pdt.getMonth() + 1).padStart(2, '0')}-${String(pdt.getDate()).padStart(2, '0')}`;
    const prevActiveRaw = dayMap[prevKey]
      ? (dayMap[prevKey].activeCalories ?? dayMap[prevKey].caloriesBurned ?? 0)
      : (prevKey === dayBeforeMonthKey ? dayBeforeMonthActive : 0);
    if (prevActiveRaw > 0) prevActivityList.push(Math.round(prevActiveRaw));

    if (dayScore.activityDetail) {
      if (typeof dayScore.activityDetail.activeCalScore === 'number') {
        activeCalScoreList.push(dayScore.activityDetail.activeCalScore);
      }
      if (typeof dayScore.activityDetail.workoutScore === 'number' && dayScore.activityDetail.workoutScore > 0) {
        workoutScoreList.push(dayScore.activityDetail.workoutScore);
        monthHadWorkouts = true;
      }
    }

    if (dayScore.sleepDetail && typeof dayScore.sleepDetail.categoryScore === 'number') {
      sleepCategoryScoreList.push(dayScore.sleepDetail.categoryScore);
    }

    const sleepHours: number | null = day.sleepOverride ?? day.sleepHours ?? null;
    if (sleepHours && sleepHours > 0) sleepHoursList.push(sleepHours);

    if (day.weight && day.weight > 0) weightEntries.push({ dateKey: dk, weight: day.weight });

    if ((dayScore.activityDetail?.workoutScore ?? 0) > 0) {
      workoutDays++;
    } else if (activeCalories > 0) {
      workoutDays++;
    }

    if (steps >= stepGoal) stepGoalDays++;

    // Count real session totals: gate on checked exercises or cardioDone, not workoutScore
    // (HealthKit-synced days can have checked exercises but workoutScore=0)
    const wPrograms = workoutState.programs || {};
    const wTemplate = workoutState.weeklyTemplate || {};
    const dayProgram = wPrograms[dk] || wTemplate[dayNameFromDateKey(dk)];
    const exercises = Array.isArray(dayProgram?.exercises) ? dayProgram.exercises : [];
    const dayChecks = (workoutState.checks || {})[dk] || {};
    const cardioDone = (workoutState.cardioComplete || {})[dk] === true;
    const checkedExercises = exercises.filter((ex: any) => dayChecks[ex.id]);
    if (checkedExercises.length > 0) {
      totalCardioSessions += checkedExercises.filter((ex: any) => ex.isCardio).length;
      totalLiftSessions += checkedExercises.filter((ex: any) => !ex.isCardio).length;
    } else if (cardioDone) {
      totalCardioSessions += 1;
    }
  }

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

  const data: MonthlySummaryData = {
    monthKey,
    monthStart,
    monthEnd,
    generatedDate: new Date().toISOString().slice(0, 10),
    daysInMonth,

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
    avgCarbs: avg(carbsList),
    avgFat: avg(fatList),
    avgFiber: avg(fiberList),
    avgSodium: avg(sodiumList),
    daysCalorieGoalHit,

    avgActiveCalories: avg(activeCaloriesList),
    activeCalGoal,
    avgSteps: avg(stepsList),
    workoutDays,
    avgExerciseMinutes: avg(exerciseMinutesList),
    avgActiveCalScore: avg(activeCalScoreList),
    avgWorkoutScore: avg(workoutScoreList),
    monthHadWorkouts,
    stepGoalDays,
    totalCardioSessions,
    totalLiftSessions,

    avgRecoveryScore: avg(recoveryScoreList),
    avgHRV: avgFloat(hrvList),
    avgSleepHours: avgFloat(sleepHoursList),
    avgSleepCategoryScore: avg(sleepCategoryScoreList),
    sleepGoal,
    avgRestingHR: avg(restingHRList),
    avgRespiratoryRate: avgFloat(respiratoryRateList),
    avgPrevActivity: avg(prevActivityList),
    avgBloodOxygen: avg(spo2List),
    monthVo2Max,
    monthCardioRecovery,

    startWeight,
    endWeight,
    weightChange,
    weightGoal,
  };

  await storageSet(`${MONTHLY_SUMMARY_KEY_PREFIX}${monthKey}`, JSON.stringify(data));
  return data;
}

// Returns the YYYY-MM key for the most recently closed calendar month.
export function getLastClosedMonth(): string {
  const today = new Date();
  const year = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();
  const month = today.getMonth() === 0 ? 12 : today.getMonth(); // getMonth() is 0-based; month-1 in 1-based = getMonth() when > 0
  return `${year}-${String(month).padStart(2, '0')}`;
}

// Gate check + generation. Called on first app load after 5am on the 1st of each month.
export async function checkAndGenerateMonthly(): Promise<void> {
  try {
    const today = new Date();
    if (today.getDate() !== 1) return;
    if (today.getHours() < 5) return;

    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const lastGenerated = await AsyncStorage.getItem(MONTHLY_GATE_KEY);
    if (lastGenerated === todayKey) return;

    const monthKey = getLastClosedMonth();
    const existing = await loadMonthlySummary(monthKey);
    if (!existing) {
      await generateMonthlySummary(monthKey);
    }

    await storageSet(MONTHLY_GATE_KEY, todayKey);
  } catch {}
}
