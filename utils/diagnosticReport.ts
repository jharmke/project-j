import AsyncStorage from '@react-native-async-storage/async-storage';
import { storageSet } from './storage';
import { offsetToDateKey } from './statsData';
import { calcSleepScore } from './sleepScore';

// ── Types ──────────────────────────────────────────────────────────────────────

export type ReportWindow = 14 | 30 | 90;
export type FindingStatus = 'good' | 'attention' | 'factor';
export type GoalDirection = 'lose' | 'gain' | 'maintain';

export interface DeficitFinding {
  type: 'deficit';
  expectedChangeLbs: number;
  actualChangeLbs: number | null;
  gapLbs: number | null;
  goalDirection: GoalDirection;
  avgDailyDeficit: number;
  loggedDays: number;
  status: FindingStatus;
  hasWeightData: boolean;
}

export interface BurnAccuracyFinding {
  type: 'burnAccuracy';
  burnAccuracyPct: number;
  avgActiveCalPerDay: number;
  isFlagged: boolean;
  status: FindingStatus;
}

export interface ConsistencyFinding {
  type: 'consistency';
  loggedDays: number;
  totalDays: number;
  rate: number;
  suspectDays: number;
  excludedDays: number;
  status: FindingStatus;
}

export interface MacroFinding {
  type: 'macros';
  avgProtein: number;
  proteinGoalMin: number;
  proteinGoalMax: number;
  avgFiber: number;
  fiberStatus: FindingStatus;
  macroStatus: FindingStatus;
  status: FindingStatus;
  hasData: boolean;
  bodyWeightLbs: number;
  lowFiberNote: boolean;
}

export interface SleepFinding {
  type: 'sleep';
  avgSleepScore: number | null;
  avgSleepHours: number;
  totalSleepDays: number;
  poorSleepCalDelta: number | null;
  status: FindingStatus;
  hasEnoughData: boolean;
}

export interface Correlation {
  id: string;
  headline: string;
  detail: string;
}

export interface CorrelationsFinding {
  type: 'correlations';
  correlations: Correlation[];
}

export interface Suggestion {
  rank: number;
  headline: string;
  detail: string;
}

export interface DiagnosticReport {
  id: string;
  generatedAt: string;
  windowDays: ReportWindow;
  dateRangeStart: string;
  dateRangeEnd: string;
  goalDirection: GoalDirection;
  summary: string;
  deficit: DeficitFinding | null;
  burnAccuracy: BurnAccuracyFinding | null;
  consistency: ConsistencyFinding;
  macros: MacroFinding | null;
  sleep: SleepFinding | null;
  correlations: CorrelationsFinding | null;
  suggestions: Suggestion[];
  insufficientData: boolean;
  minLoggedDays: number;
}

// ── Threshold ──────────────────────────────────────────────────────────────────

export function minDaysForWindow(windowDays: ReportWindow): number {
  if (windowDays === 14) return 7;
  if (windowDays === 30) return 15;
  return 60; // 90 days
}

// ── Storage ────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'pj_diagnostic_reports';

export async function loadSavedReports(): Promise<DiagnosticReport[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as DiagnosticReport[];
  } catch {
    return [];
  }
}

export async function saveReport(report: DiagnosticReport): Promise<void> {
  try {
    const existing = await loadSavedReports();
    const todayDate = new Date().toISOString().slice(0, 10);
    // Replace any same-day same-window report instead of stacking a duplicate
    const filtered = existing.filter(r =>
      r.id !== report.id &&
      !(r.windowDays === report.windowDays && r.generatedAt.slice(0, 10) === todayDate)
    );
    const updated = [report, ...filtered].slice(0, 15);
    await storageSet(STORAGE_KEY, JSON.stringify(updated));
  } catch {}
}

export async function deleteReport(id: string): Promise<void> {
  try {
    const existing = await loadSavedReports();
    const updated = existing.filter(r => r.id !== id);
    await storageSet(STORAGE_KEY, JSON.stringify(updated));
  } catch {}
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getEntryNutrient(entries: any[], nutrientName: string): number {
  return Math.round(entries.reduce((s: number, e: any) => {
    const n = e.foodNutrients?.find((fn: any) => fn.nutrientName === nutrientName);
    if (!n) return s;
    let scale: number;
    if (e.fsId) {
      scale = (e.calPer100g && e.calPer100g > 0) ? (e.cal / e.calPer100g) : 0;
    } else {
      const sg = e.servingGrams;
      const servingCal = sg && e.calPer100g > 0 ? e.calPer100g * sg / 100 : 0;
      scale = servingCal > 0 ? e.cal / servingCal : 0;
    }
    return s + (n.value || 0) * scale;
  }, 0) * 10) / 10;
}

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function isWeekend(dateKey: string): boolean {
  const [y, m, d] = dateKey.split('-').map(Number);
  const day = new Date(y, m - 1, d).getDay();
  return day === 0 || day === 6;
}

// ── Main generation function ───────────────────────────────────────────────────

export async function generateDiagnosticReport(windowDays: ReportWindow): Promise<DiagnosticReport> {
  const yesterday = offsetToDateKey(1);
  const rangeStart = offsetToDateKey(windowDays);

  // ── Load profile + settings ──
  let bodyWeightLbs = 0, weightGoal = 0, hasWeightGoal = false;
  let calTarget = 0, burnAccuracyPct = 100, sleepGoal = 8;
  let goalDirection: GoalDirection = 'maintain';

  try {
    const profileRaw = await AsyncStorage.getItem('pj_profile');
    if (profileRaw) {
      const p = JSON.parse(profileRaw);
      if (p.weightGoal) { weightGoal = parseFloat(p.weightGoal); hasWeightGoal = weightGoal > 0; }
      if (p.sleepGoal) sleepGoal = parseFloat(p.sleepGoal);
      for (let i = 0; i <= 7 && bodyWeightLbs === 0; i++) {
        try {
          const dd = await AsyncStorage.getItem(`pj_${offsetToDateKey(i)}`);
          if (dd) { const x = JSON.parse(dd); if (x.weight) bodyWeightLbs = x.weight; }
        } catch {}
      }
    }
  } catch {}

  try {
    const settingsRaw = await AsyncStorage.getItem('pj_settings');
    if (settingsRaw) {
      const s = JSON.parse(settingsRaw);
      if (s.calTarget) calTarget = parseInt(s.calTarget);
      if (s.burnAccuracyPct) burnAccuracyPct = parseInt(s.burnAccuracyPct);
    }
  } catch {}

  if (hasWeightGoal && bodyWeightLbs > 0) {
    const diff = weightGoal - bodyWeightLbs;
    if (diff < -2) goalDirection = 'lose';
    else if (diff > 2) goalDirection = 'gain';
  }

  // ── Load workout state ──
  let workoutState: any = {};
  try {
    const ws = await AsyncStorage.getItem('pj_workout_state');
    if (ws) workoutState = JSON.parse(ws);
  } catch {}

  // ── Per-day data collection ──
  type DayData = {
    dateKey: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sodium: number;
    weight: number | null;
    activeCalories: number;
    sleepHours: number | null;
    sleepScore: number | null;
    steps: number;
    water: number;
    excluded: boolean;
    hadWorkout: boolean;
    isWeekend: boolean;
  };

  const days: DayData[] = [];

  for (let i = windowDays; i >= 1; i--) {
    const dateKey = offsetToDateKey(i);
    let calories = 0, protein = 0, carbs = 0, fat = 0, fiber = 0, sodium = 0;
    let weight: number | null = null;
    let activeCalories = 0, steps = 0, water = 0;
    let sleepHours: number | null = null, sleepScore: number | null = null;
    let excludedDiet = false;
    const hadWorkout = (workoutState.programs?.[dateKey]?.exercises?.length ?? 0) > 0;

    try {
      const raw = await AsyncStorage.getItem(`pj_${dateKey}`);
      if (raw) {
        const d = JSON.parse(raw);
        excludedDiet = !!(d.excluded?.diet);
        if (!excludedDiet && d.entries?.length > 0) {
          calories = d.entries.reduce((s: number, e: any) => s + (e.cal || 0), 0);
          protein = d.entries.reduce((s: number, e: any) => s + (e.protein || 0), 0);
          carbs = d.entries.reduce((s: number, e: any) => s + (e.carbs || 0), 0);
          fat = d.entries.reduce((s: number, e: any) => s + (e.fat || 0), 0);
          fiber = getEntryNutrient(d.entries, 'Fiber, total dietary');
          sodium = getEntryNutrient(d.entries, 'Sodium, Na');
        }
        if (d.weight) weight = d.weight;
        activeCalories = d.activeCalories || d.caloriesBurned || 0;
        if (d.steps) steps = d.steps;
        if (typeof d.water === 'number') water = d.water;
        const sh = d.sleepOverride || d.sleepHours;
        if (sh) {
          sleepHours = sh;
          sleepScore = calcSleepScore(sh, d.sleepStages || null, sleepGoal, d.sleepFeelRating ?? null, !!d.sleepOverride, d.sleepConsistencyPts ?? 0).score;
        }
      }
    } catch {}

    days.push({ dateKey, calories, protein, carbs, fat, fiber, sodium, weight, activeCalories, sleepHours, sleepScore, steps, water, excluded: excludedDiet, hadWorkout, isWeekend: isWeekend(dateKey) });
  }

  // ── Consistency ──
  const loggedDays = days.filter(d => !d.excluded && d.calories > 400).length;
  const suspectDays = days.filter(d => !d.excluded && d.calories > 0 && d.calories <= 400).length;
  const excludedCount = days.filter(d => d.excluded).length;
  const consistencyRate = windowDays > 0 ? loggedDays / windowDays : 0;
  const firstLoggedDayIdx = days.findIndex(d => !d.excluded && d.calories > 400);
  const effectiveWindowDays = firstLoggedDayIdx >= 0 ? windowDays - firstLoggedDayIdx : windowDays;
  const adjustedConsistencyRate = effectiveWindowDays > 0 ? loggedDays / effectiveWindowDays : 0;

  let consistencyStatus: FindingStatus = 'good';
  if (adjustedConsistencyRate < 0.70) consistencyStatus = 'factor';
  else if (adjustedConsistencyRate < 0.85) consistencyStatus = 'attention';

  const consistency: ConsistencyFinding = {
    type: 'consistency', loggedDays, totalDays: windowDays, rate: consistencyRate,
    suspectDays, excludedDays: excludedCount, status: consistencyStatus,
  };

  const minDays = minDaysForWindow(windowDays);
  const insufficientData = loggedDays < minDays;

  if (insufficientData) {
    return {
      id: Date.now().toString(),
      generatedAt: new Date().toISOString(),
      windowDays, dateRangeStart: rangeStart, dateRangeEnd: yesterday, goalDirection,
      summary: `Not enough logged data to generate a full analysis. You need at least ${minDays} days with food logged in the ${windowDays}-day window. You currently have ${loggedDays} logged day${loggedDays !== 1 ? 's' : ''}.`,
      deficit: null, burnAccuracy: null, consistency, macros: null, sleep: null, correlations: null,
      suggestions: [{ rank: 1, headline: 'Log your food consistently', detail: `Aim for at least ${minDays} days of logging in a ${windowDays}-day window to unlock the full analysis. Even rough estimates count.` }],
      insufficientData: true, minLoggedDays: loggedDays,
    };
  }

  // ── Deficit/surplus ──
  const loggedDayData = days.filter(d => !d.excluded && d.calories > 400);
  const avgCals = avg(loggedDayData.map(d => d.calories));
  const avgActiveCalsRaw = avg(loggedDayData.map(d => d.activeCalories));
  const avgActiveCalsAdj = avgActiveCalsRaw * (burnAccuracyPct / 100);
  const avgDailyDeficit = calTarget > 0 ? calTarget - avgCals + avgActiveCalsAdj : 0;

  const weightEntries = days.filter(d => d.weight !== null);
  const hasWeightData = weightEntries.length >= 2;
  let actualChangeLbs: number | null = null;
  if (hasWeightData) actualChangeLbs = weightEntries[weightEntries.length - 1].weight! - weightEntries[0].weight!;

  let deficitFinding: DeficitFinding | null = null;
  if (goalDirection !== 'maintain' && calTarget > 0) {
    const totalDeficit = loggedDayData.reduce((s, d) => s + (calTarget - d.calories + d.activeCalories * (burnAccuracyPct / 100)), 0);
    const expectedChangeLbs = -(totalDeficit / 3500);
    let gapLbs: number | null = null;
    if (actualChangeLbs !== null) gapLbs = actualChangeLbs - expectedChangeLbs;

    let deficitStatus: FindingStatus = 'good';
    if (gapLbs !== null) {
      if (goalDirection === 'lose') {
        if (gapLbs > 1.0) deficitStatus = 'factor';
        else if (gapLbs > 0.3) deficitStatus = 'attention';
      } else {
        if (gapLbs < -1.0) deficitStatus = 'factor';
        else if (gapLbs < -0.3) deficitStatus = 'attention';
      }
    }

    deficitFinding = {
      type: 'deficit', expectedChangeLbs, actualChangeLbs, gapLbs, goalDirection,
      avgDailyDeficit, loggedDays, status: hasWeightData ? deficitStatus : 'attention', hasWeightData,
    };
  }

  // ── Burn accuracy ──
  const isBurnFlagged = burnAccuracyPct === 100 && (
    (deficitFinding?.gapLbs != null && deficitFinding.gapLbs > 0.5) || avgActiveCalsRaw > 450
  );
  const burnAccuracyFinding: BurnAccuracyFinding = {
    type: 'burnAccuracy', burnAccuracyPct, avgActiveCalPerDay: Math.round(avgActiveCalsRaw),
    isFlagged: isBurnFlagged, status: isBurnFlagged ? 'attention' : 'good',
  };

  // ── Macros ──
  let macroFinding: MacroFinding | null = null;
  const macroLoggedDays = loggedDayData.filter(d => d.protein > 0 || d.carbs > 0 || d.fat > 0);
  if (macroLoggedDays.length >= 5 && bodyWeightLbs > 0) {
    const avgProtein = avg(macroLoggedDays.map(d => d.protein));
    const fiberDays = macroLoggedDays.filter(d => d.fiber > 0);
    const avgFiber = fiberDays.length > 0 ? avg(fiberDays.map(d => d.fiber)) : 0;
    const proteinGoalMin = Math.round(bodyWeightLbs * 0.7);
    const proteinGoalMax = Math.round(bodyWeightLbs * 1.0);
    const macroStatus: FindingStatus = avgProtein < proteinGoalMin * 0.7 ? 'factor' : avgProtein < proteinGoalMin ? 'attention' : 'good';
    const fiberStatus: FindingStatus = avgFiber > 0 ? (avgFiber < 15 ? 'factor' : avgFiber < 22 ? 'attention' : 'good') : 'attention';
    const status: FindingStatus = macroStatus === 'factor' || fiberStatus === 'factor' ? 'factor' : macroStatus === 'attention' || fiberStatus === 'attention' ? 'attention' : 'good';
    macroFinding = {
      type: 'macros', avgProtein: Math.round(avgProtein), proteinGoalMin, proteinGoalMax,
      avgFiber: Math.round(avgFiber * 10) / 10, fiberStatus, macroStatus, status,
      hasData: true, bodyWeightLbs: Math.round(bodyWeightLbs), lowFiberNote: fiberStatus !== 'good',
    };
  }

  // ── Sleep ──
  let sleepFinding: SleepFinding | null = null;
  const sleepDays = days.filter(d => d.sleepHours !== null && d.sleepHours > 0);
  if (sleepDays.length >= 5) {
    const scoreDays = sleepDays.filter(d => d.sleepScore !== null);
    const avgSleepScore = scoreDays.length > 0 ? Math.round(avg(scoreDays.map(d => d.sleepScore!))) : null;
    const avgSleepHours = Math.round(avg(sleepDays.map(d => d.sleepHours!)) * 10) / 10;

    let poorSleepCalDelta: number | null = null;
    if (sleepDays.length >= 7 && loggedDayData.length >= 7) {
      const poorNextCals: number[] = [], goodNextCals: number[] = [];
      for (let i = 0; i < days.length - 1; i++) {
        if (days[i].sleepHours === null || days[i + 1].calories < 400) continue;
        const isPoor = (days[i].sleepScore !== null && days[i].sleepScore! < 70) || (days[i].sleepScore === null && days[i].sleepHours! < 6);
        const isGood = (days[i].sleepScore !== null && days[i].sleepScore! >= 70) || (days[i].sleepScore === null && days[i].sleepHours! >= 7);
        if (isPoor) poorNextCals.push(days[i + 1].calories);
        else if (isGood) goodNextCals.push(days[i + 1].calories);
      }
      if (poorNextCals.length >= 3 && goodNextCals.length >= 3) {
        const delta = avg(poorNextCals) - avg(goodNextCals);
        if (Math.abs(delta) >= 100) poorSleepCalDelta = Math.round(delta);
      }
    }

    let sleepStatus: FindingStatus = 'good';
    if (avgSleepScore !== null) {
      if (avgSleepScore < 65) sleepStatus = 'factor';
      else if (avgSleepScore < 75) sleepStatus = 'attention';
    } else if (avgSleepHours < 6) sleepStatus = 'factor';
    else if (avgSleepHours < 7) sleepStatus = 'attention';

    sleepFinding = {
      type: 'sleep', avgSleepScore, avgSleepHours, totalSleepDays: sleepDays.length,
      poorSleepCalDelta, status: sleepStatus, hasEnoughData: true,
    };
  }

  // ── Correlations ──
  const correlations: Correlation[] = [];

  // 1. Sleep → next-day calories
  if (sleepFinding?.poorSleepCalDelta != null) {
    const delta = sleepFinding.poorSleepCalDelta;
    correlations.push({
      id: 'sleep_nextday_cals',
      headline: delta > 0
        ? `After poor sleep, you ate ${delta} more calories the next day`
        : `After good sleep, you ate ${Math.abs(delta)} fewer calories the next day`,
      detail: delta > 0
        ? `Your body releases more hunger hormones when you're tired. For you specifically, poor sleep nights are directly linked to higher calorie intake the following day.`
        : `Your data shows a clear pattern: better sleep nights are followed by lower calorie intake. Good sleep seems to regulate your appetite well.`,
    });
  }

  // 2. High burn day → next-day calories
  if (loggedDayData.length >= 7) {
    const activeDays = days.filter(d => d.activeCalories > 0);
    const activeCalGoal = activeDays.length > 0 ? avg(activeDays.map(d => d.activeCalories)) * 1.1 : 0;
    if (activeCalGoal > 0) {
      const highBurnNext: number[] = [], normalBurnNext: number[] = [];
      for (let i = 0; i < days.length - 1; i++) {
        if (days[i + 1].calories < 400) continue;
        if (days[i].activeCalories > activeCalGoal) highBurnNext.push(days[i + 1].calories);
        else if (days[i].activeCalories > 0 && days[i].activeCalories <= activeCalGoal) normalBurnNext.push(days[i + 1].calories);
      }
      if (highBurnNext.length >= 3 && normalBurnNext.length >= 3) {
        const delta = Math.round(avg(highBurnNext) - avg(normalBurnNext));
        if (Math.abs(delta) >= 150) {
          correlations.push({
            id: 'highburn_nextday',
            headline: delta > 0
              ? `After big burn days, you ate ${delta} more calories the next day`
              : `After big burn days, you ate ${Math.abs(delta)} fewer calories the next day`,
            detail: delta > 0
              ? `After high-activity days, your body often seeks a reward. That ${delta} cal swing the following day can partially offset the extra burn.`
              : `Interesting: your big workout days don't lead to overeating the next day. Your appetite regulation on recovery days is solid.`,
          });
        }
      }
    }
  }

  // 3. Weekend vs weekday calories
  if (loggedDayData.length >= 8) {
    const weekdayCals = loggedDayData.filter(d => !d.isWeekend).map(d => d.calories);
    const weekendCals = loggedDayData.filter(d => d.isWeekend).map(d => d.calories);
    if (weekdayCals.length >= 4 && weekendCals.length >= 2) {
      const weekdayAvg = Math.round(avg(weekdayCals));
      const weekendAvg = Math.round(avg(weekendCals));
      const delta = weekendAvg - weekdayAvg;
      if (Math.abs(delta) >= 250) {
        correlations.push({
          id: 'weekend_weekday',
          headline: delta > 0
            ? `You average ${delta} more calories on weekends`
            : `You eat ${Math.abs(delta)} fewer calories on weekends`,
          detail: delta > 0
            ? `Monday through Friday you averaged ${weekdayAvg.toLocaleString()} cal. Weekends averaged ${weekendAvg.toLocaleString()} cal. That ${delta} cal gap, across the month, adds up more than most people realize.`
            : `Interesting -- your weekends are actually cleaner than your weekdays. You averaged ${weekdayAvg.toLocaleString()} cal on weekdays vs ${weekendAvg.toLocaleString()} on weekends.`,
        });
      }
    }
  }

  // 4. Water → calorie intake
  if (loggedDayData.length >= 7) {
    const waterDays = days.filter(d => d.water > 0);
    const avgWater = waterDays.length > 0 ? avg(waterDays.map(d => d.water)) : 0;
    if (avgWater > 0) {
      const wellHydratedCals = loggedDayData.filter(d => d.water >= avgWater * 1.1).map(d => d.calories);
      const poorHydrationCals = loggedDayData.filter(d => d.water > 0 && d.water < avgWater * 0.8).map(d => d.calories);
      if (wellHydratedCals.length >= 3 && poorHydrationCals.length >= 3) {
        const delta = Math.round(avg(poorHydrationCals) - avg(wellHydratedCals));
        if (delta >= 100) {
          correlations.push({
            id: 'water_cals',
            headline: `On low-water days, you ate ${delta} more calories`,
            detail: `Thirst and hunger signals fire from the same place in the brain. On days you hit your water goal, your appetite was more controlled. Dehydration can read as hunger.`,
          });
        }
      }
    }
  }

  // 5. High sodium → next-day weight
  const sodiumWeightPairs = days.filter(d => d.sodium > 0 && d.weight !== null);
  if (sodiumWeightPairs.length >= 5) {
    const highSodiumDeltas: number[] = [], normalSodiumDeltas: number[] = [];
    for (let i = 0; i < days.length - 1; i++) {
      if (days[i].sodium <= 0 || days[i + 1].weight === null || days[i].weight === null) continue;
      const weightDelta = days[i + 1].weight! - days[i].weight!;
      if (days[i].sodium > 2300) highSodiumDeltas.push(weightDelta);
      else if (days[i].sodium <= 2000) normalSodiumDeltas.push(weightDelta);
    }
    if (highSodiumDeltas.length >= 2 && normalSodiumDeltas.length >= 2) {
      const delta = avg(highSodiumDeltas) - avg(normalSodiumDeltas);
      if (delta >= 0.5) {
        correlations.push({
          id: 'sodium_weight',
          headline: `After high-sodium days, the scale jumps ${(Math.round(delta * 10) / 10).toFixed(1)} lbs`,
          detail: `High sodium causes your body to retain water overnight. This isn't fat -- it's fluid. After high-sodium days, your next-morning weight tends to be ${(Math.round(delta * 10) / 10).toFixed(1)} lbs higher on average.`,
        });
      }
    }
  }

  // 6. Steps → sleep score
  if (sleepDays.length >= 7) {
    const stepDays = days.filter(d => d.steps > 0);
    const avgSteps = stepDays.length > 0 ? avg(stepDays.map(d => d.steps)) : 0;
    if (avgSteps > 0) {
      const highStepSleep: number[] = [], lowStepSleep: number[] = [];
      for (const day of days) {
        if (day.sleepScore === null || day.steps === 0) continue;
        if (day.steps > avgSteps * 1.1) highStepSleep.push(day.sleepScore);
        else if (day.steps < avgSteps * 0.7) lowStepSleep.push(day.sleepScore);
      }
      if (highStepSleep.length >= 3 && lowStepSleep.length >= 3) {
        const delta = Math.round(avg(highStepSleep) - avg(lowStepSleep));
        if (delta >= 8) {
          correlations.push({
            id: 'steps_sleep',
            headline: `Higher step days lead to ${delta} pts better sleep score`,
            detail: `On above-average step days, your sleep score averaged ${Math.round(avg(highStepSleep))} vs ${Math.round(avg(lowStepSleep))} on lower-step days. Movement during the day is one of the strongest predictors of sleep quality.`,
          });
        }
      }
    }
  }

  // 7. Workout days vs rest days → calorie intake
  if (loggedDayData.length >= 7) {
    const workoutCals = loggedDayData.filter(d => d.hadWorkout).map(d => d.calories);
    const restCals = loggedDayData.filter(d => !d.hadWorkout).map(d => d.calories);
    if (workoutCals.length >= 3 && restCals.length >= 3) {
      const workoutAvg = Math.round(avg(workoutCals));
      const restAvg = Math.round(avg(restCals));
      const delta = workoutAvg - restAvg;
      if (Math.abs(delta) >= 200) {
        correlations.push({
          id: 'workout_vs_rest_cals',
          headline: delta > 0
            ? `You eat ${delta} more calories on workout days`
            : `You eat ${Math.abs(delta)} fewer calories on workout days`,
          detail: delta > 0
            ? `Workout days averaged ${workoutAvg.toLocaleString()} cal, rest days ${restAvg.toLocaleString()} cal. Your appetite rises on training days -- whether it offsets the calorie burn is in the deficit math above.`
            : `Your calorie intake is actually lower on workout days (${workoutAvg.toLocaleString()} cal) than rest days (${restAvg.toLocaleString()} cal). You may be under-fueling training sessions.`,
        });
      }
    }
  }

  // 8. Sleep → next-day workout completion
  if (sleepDays.length >= 7) {
    const poorSleepWorkout: number[] = [], goodSleepWorkout: number[] = [];
    for (let i = 0; i < days.length - 1; i++) {
      if (days[i].sleepHours === null) continue;
      const isPoor = (days[i].sleepScore !== null && days[i].sleepScore! < 70) || (days[i].sleepScore === null && days[i].sleepHours! < 6);
      const isGood = (days[i].sleepScore !== null && days[i].sleepScore! >= 70) || (days[i].sleepScore === null && days[i].sleepHours! >= 7);
      if (isPoor) poorSleepWorkout.push(days[i + 1].hadWorkout ? 1 : 0);
      else if (isGood) goodSleepWorkout.push(days[i + 1].hadWorkout ? 1 : 0);
    }
    if (poorSleepWorkout.length >= 3 && goodSleepWorkout.length >= 3) {
      const poorRate = avg(poorSleepWorkout);
      const goodRate = avg(goodSleepWorkout);
      const delta = goodRate - poorRate;
      if (delta >= 0.2) {
        correlations.push({
          id: 'sleep_workout',
          headline: `Poor sleep nights cut your next-day workout rate by ${Math.round(delta * 100)}%`,
          detail: `After good sleep, you worked out ${Math.round(goodRate * 100)}% of the time. After poor sleep, that dropped to ${Math.round(poorRate * 100)}%. Sleep and training have a direct relationship in your data.`,
        });
      }
    }
  }

  // 9. Post-surplus day → next-day intake
  if (loggedDayData.length >= 7 && calTarget > 0) {
    const surplusNext: number[] = [], deficitNext: number[] = [];
    for (let i = 0; i < days.length - 1; i++) {
      if (days[i].calories < 400 || days[i + 1].calories < 400) continue;
      if (days[i].calories > calTarget * 1.1) surplusNext.push(days[i + 1].calories);
      else if (days[i].calories < calTarget * 0.9) deficitNext.push(days[i + 1].calories);
    }
    if (surplusNext.length >= 3 && deficitNext.length >= 3) {
      const surplusNextAvg = Math.round(avg(surplusNext));
      const deficitNextAvg = Math.round(avg(deficitNext));
      const delta = surplusNextAvg - deficitNextAvg;
      if (delta >= 150) {
        correlations.push({
          id: 'surplus_nextday',
          headline: `After going over your target, you ate ${delta} more the next day too`,
          detail: `Days after exceeding your calorie target, you averaged ${surplusNextAvg.toLocaleString()} cal vs ${deficitNextAvg.toLocaleString()} cal after on-target days. Surpluses don't tend to self-correct -- they compound.`,
        });
      }
    }
  }

  // ── Suggestions ──
  const suggestions: Suggestion[] = [];

  if (consistency.status === 'factor') {
    suggestions.push({ rank: 1, headline: 'Log more consistently', detail: `You logged ${loggedDays} out of ${windowDays} days. Even rough estimates on hard days are better than gaps -- aim for something every day.` });
  }
  if (burnAccuracyFinding.isFlagged) {
    suggestions.push({ rank: suggestions.length + 1, headline: 'Adjust your burn accuracy setting', detail: `You're using 100% of Apple Health's active calorie estimate. Most wearables overstate by 10-30%. Go to Settings → Health and try 80-90%.` });
  }
  if (deficitFinding && !deficitFinding.hasWeightData) {
    suggestions.push({ rank: suggestions.length + 1, headline: 'Log your weight more regularly', detail: `The most powerful comparison -- expected vs actual results -- needs at least 2 weight entries in the window. Log a few times a week.` });
  }
  if (macroFinding && macroFinding.macroStatus !== 'good') {
    suggestions.push({ rank: suggestions.length + 1, headline: 'Increase your protein intake', detail: `Your average was ${macroFinding.avgProtein}g/day. For your size, ${macroFinding.proteinGoalMin}-${macroFinding.proteinGoalMax}g is the target. Protein preserves muscle during a deficit and keeps you fuller longer.` });
  }
  if (sleepFinding && sleepFinding.status !== 'good') {
    suggestions.push({
      rank: suggestions.length + 1, headline: 'Prioritize sleep',
      detail: sleepFinding.avgSleepScore !== null
        ? `Your average sleep score was ${sleepFinding.avgSleepScore}. Poor sleep increases appetite hormones, making fat loss harder even with a consistent calorie deficit.`
        : `You're averaging ${sleepFinding.avgSleepHours}h of sleep. Poor sleep increases hunger hormones and reduces workout motivation -- both work against your goals.`,
    });
  }
  if (macroFinding && macroFinding.lowFiberNote) {
    suggestions.push({ rank: suggestions.length + 1, headline: 'Improve food quality', detail: `Your average fiber was ${macroFinding.avgFiber}g/day vs the recommended 25-38g. Low fiber signals a diet heavy in processed foods. More whole foods improves satiety and long-term results.` });
  }
  if (consistency.status === 'attention') {
    suggestions.push({ rank: suggestions.length + 1, headline: 'Close the logging gaps', detail: `You logged ${Math.round(consistencyRate * 100)}% of days. Unlisted days create gaps in the deficit calculation that the report can't account for.` });
  }
  if (suggestions.length === 0) {
    suggestions.push({ rank: 1, headline: 'Your data looks solid', detail: `Consistency, macros, and sleep all look good over this window. Keep the habits going -- this is what sustained progress looks like.` });
  }

  // ── Summary ──
  let summary = '';
  if (deficitFinding && deficitFinding.actualChangeLbs !== null) {
    const expAbs = (Math.abs(Math.round(deficitFinding.expectedChangeLbs * 10) / 10)).toFixed(1);
    const actAbs = (Math.abs(Math.round(deficitFinding.actualChangeLbs * 10) / 10)).toFixed(1);
    const expDir = goalDirection === 'lose' ? 'lost' : 'gained';
    const actDir = deficitFinding.actualChangeLbs <= 0 ? 'lost' : 'gained';
    summary = `Your logged data suggests you should have ${expDir} about ${expAbs} lbs over the past ${windowDays} days. You actually ${actDir} ${actAbs} lbs. Here's what the data says.`;
  } else if (deficitFinding && avgCals > 0) {
    const defStr = avgDailyDeficit > 0 ? `a ${Math.round(avgDailyDeficit)} cal/day deficit` : `a ${Math.round(Math.abs(avgDailyDeficit))} cal/day surplus`;
    summary = `Your data shows you logged ${defStr} on average over the past ${windowDays} days. Log your weight consistently to compare expected vs actual results.`;
  } else {
    summary = `Your data from the past ${windowDays} days is analyzed below. The more consistently you log, the more accurate these findings become.`;
  }

  return {
    id: Date.now().toString(),
    generatedAt: new Date().toISOString(),
    windowDays, dateRangeStart: rangeStart, dateRangeEnd: yesterday, goalDirection, summary,
    deficit: deficitFinding, burnAccuracy: burnAccuracyFinding, consistency,
    macros: macroFinding, sleep: sleepFinding,
    correlations: correlations.length > 0 ? { type: 'correlations', correlations } : null,
    suggestions,
    insufficientData: false, minLoggedDays: loggedDays,
  };
}
