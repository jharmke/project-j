// utils/dayScore.ts
// Pure computation for the completed-day composite score (0 to 100).
// No UI, no AsyncStorage, no Date access. The caller loads every input and
// stamps computedAt, so this module stays pure and testable (same contract as
// goalHit.ts). Full spec and locked decisions: SPEC_day_score_and_summary.md.

import { evaluateCalorieGoalHit } from './goalHit';
import { calcSleepScore, SleepStages } from './sleepScore';

export type DayType = 'lift' | 'cardio' | 'rest' | 'unassigned';
export type StyleMode = 'discipline' | 'balanced' | 'mindful';

// Composite category weights. Renormalized over present categories only.
export const CATEGORY_WEIGHTS = { nutrition: 0.40, activity: 0.35, sleep: 0.25 };

// Nutrition sub-component max points (before renormalization over present subs).
const CAL_MAX = 55, PROTEIN_MAX = 28, WATER_MAX = 17;

// Calorie proximity denominator. A miss this many kcal past the hit boundary
// scores 0 on the calorie sub. Tune after real-data testing (spec section 9.1).
const CAL_MISS_DENOM = 500;

// Workout-day point split: active calories share vs workout completion share.
const ACTIVE_MAX_WORKOUT_DAY = 60, WORKOUT_MAX = 40;
// Rest day: active cals only, floored so genuine rest is never punished while
// extra movement (walks) still earns credit up to 100. Tunable.
const REST_ACTIVITY_FLOOR = 50;

// Mindful "moved" step floor: steps at or above this fraction of goal counts.
const MINDFUL_STEP_FLOOR = 0.60;

// Sleep floor: any logged night earns at least this on the sleep category.
const SLEEP_FLOOR = 50;

export interface DayScoreInput {
  excluded: boolean;
  // Per-category exclusions (diet / water / exercise) from the day record. An
  // excluded category drops its sub-components from scoring; when every sub of a
  // category is excluded, the whole category drops out and the rest renormalize.
  dietExcluded: boolean;
  waterExcluded: boolean;
  exerciseExcluded: boolean;
  computedAt: string;            // ISO timestamp, supplied by the caller
  styleMode: StyleMode;
  weightGoal: string;            // pj_profile.weightGoal at compute time (frozen into the goal snapshot)

  // Nutrition
  hasFood: boolean;              // any food entries logged for the day
  consumed: number;              // sum of entries[].cal
  dayData: any;                  // the pj_ daily record (active/burn fields)
  dayBmr: number;
  calTarget: number;
  paceTarget: number;            // signed GOAL_DEFICITS[weightGoal]
  burnAccuracyPct: number;
  proteinGoalG: number;          // caller computes per macro mode (0 if no goal)
  actualProteinG: number;
  waterGoal: number;             // oz, 0 if unset
  waterLogged: number;           // oz

  // Activity
  dayType: DayType;
  activeCalGoal: number;
  workoutCompletedCount: number;
  workoutTotalCount: number;
  steps: number;
  stepGoal: number;

  // Sleep (raw fields, scored through the shared calcSleepScore)
  sleepHours: number | null;
  sleepStages: SleepStages | null;
  sleepGoal: number;
  sleepFeelRating: number | null;
  sleepIsManual: boolean;
  sleepConsistencyPts: number;
}

export interface DayScore {
  composite: number;
  label: string;
  nutritionScore: number | null;
  activityScore: number | null;
  sleepScore: number | null;
  nutritionDetail: {
    calorieHit: boolean;
    calorieScore: number;
    proteinScore: number;
    waterScore: number;
  } | null;
  activityDetail: {
    activeCalScore: number;
    workoutScore: number | null;
    isMindfulPresence: boolean;
  } | null;
  sleepDetail: {
    rawSleepScore: number;
    categoryScore: number;
  } | null;
  computedAt: string;
  excludedFromAverages: boolean;
  version?: number;              // stamped by the store; bump to force recompute
}

// The goals in effect the day a score was computed, frozen onto the day record
// alongside the dayScore (spec SPEC_smart_tips.md 15.5). Recompute-on-edit reads
// this frozen snapshot so a forward goal change never rewrites a past day's score.
// Additive: written on each (re)compute; days scored before this existed simply
// lack it until they are naturally recomputed.
export interface GoalSnapshot {
  bmr: number;
  calTarget: number;
  paceTarget: number;
  proteinGoalG: number;
  waterGoal: number;
  activeCalGoal: number;
  stepGoal: number;
  sleepGoal: number;
  weightGoal: string;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// Score label tiers by mode (spec section 2.6). Highest floor first.
const LABELS_STANDARD: [number, string][] = [
  [95, 'Elite'], [90, 'Excellent'], [85, 'Great'], [80, 'Good'],
  [70, 'Solid'], [60, 'Decent'], [50, 'Okay'], [0, 'Rough'],
];
const LABELS_MINDFUL: [number, string][] = [
  [95, 'Fully Present'], [90, 'Fully Present'], [85, 'Showing Up'], [80, 'Showing Up'],
  [70, 'Making Progress'], [60, 'Making Progress'], [50, 'Keep Going'], [0, 'Light Day'],
];

export function scoreLabel(composite: number, mode: StyleMode): string {
  const table = mode === 'mindful' ? LABELS_MINDFUL : LABELS_STANDARD;
  for (const [floor, label] of table) {
    if (composite >= floor) return label;
  }
  return table[table.length - 1][1];
}

// Accuracy-adjusted active calories, same rule used everywhere in the app.
function adjustedActiveCals(input: DayScoreInput): number {
  const raw = input.dayData?.activeCalories || input.dayData?.caloriesBurned || 0;
  return Math.round(raw * input.burnAccuracyPct / 100);
}

// Calorie sub: full points on a hit, proximity scaling on a miss.
function calorieSubScore(input: DayScoreInput): { score: number; hit: boolean } {
  const result = evaluateCalorieGoalHit({
    consumed: input.consumed,
    dayData: input.dayData,
    dayBmr: input.dayBmr,
    calTarget: input.calTarget,
    paceTarget: input.paceTarget,
    burnAccuracyPct: input.burnAccuracyPct,
    isToday: false,
    minutesNow: 0,
  });
  if (result.hit) return { score: CAL_MAX, hit: true };

  // Miss: distance past the hit boundary, scaled by CAL_MISS_DENOM.
  let missDistance: number;
  if (result.net !== null) {
    // Way 2: judged on true net against the signed pace target band (150 kcal).
    const t = input.paceTarget;
    if (t < 0) missDistance = Math.abs(result.net - (t + 150));
    else if (t > 0) missDistance = Math.abs(result.net - (t - 150));
    else missDistance = Math.abs(result.net) - 150;
  } else {
    // Way 1: no wearable burn. Judge consumed against the static target window
    // [calTarget - 300, calTarget + 150], mirroring the Way 1 hit window.
    // NOTE: the spec did not define Way 1 miss proximity. This is my fill-in,
    // flagged for sign-off.
    const lo = input.calTarget - 300;
    const hi = input.calTarget + 150;
    if (input.consumed < lo) missDistance = lo - input.consumed;
    else if (input.consumed > hi) missDistance = input.consumed - hi;
    else missDistance = 0;
  }
  const score = Math.max(0, CAL_MAX * (1 - missDistance / CAL_MISS_DENOM));
  return { score, hit: false };
}

// Nutrition category (0 to 100). Null when the day has no food data, or when no
// sub-component can be graded (no calorie target, no protein goal, no water goal).
function nutritionScore(input: DayScoreInput): { score: number; detail: NonNullable<DayScore['nutritionDetail']> } | null {
  if (!input.hasFood) return null;

  // Calorie + protein are diet sub-components: excluding diet drops them both.
  // Calorie also needs a target to grade against (no target, no calorie sub).
  const caloriePresent = input.calTarget > 0 && !input.dietExcluded;
  const cal = caloriePresent ? calorieSubScore(input) : { score: 0, hit: false };

  // Protein present only when a protein goal exists and diet is not excluded.
  const proteinPresent = input.proteinGoalG > 0 && !input.dietExcluded;
  const proteinScore = proteinPresent
    ? Math.min(PROTEIN_MAX, PROTEIN_MAX * (input.actualProteinG / input.proteinGoalG))
    : 0;

  // Water present only when a goal is set, water was logged, and water is not excluded.
  const waterPresent = input.waterGoal > 0 && input.waterLogged > 0 && !input.waterExcluded;
  const waterScore = waterPresent
    ? Math.min(WATER_MAX, WATER_MAX * (input.waterLogged / input.waterGoal))
    : 0;

  // Renormalize over present sub-components (excluded subs redistribute weight).
  let earned = 0;
  let max = 0;
  if (caloriePresent) { earned += cal.score; max += CAL_MAX; }
  if (proteinPresent) { earned += proteinScore; max += PROTEIN_MAX; }
  if (waterPresent) { earned += waterScore; max += WATER_MAX; }
  if (max === 0) return null;   // no goal set for any sub, cannot grade nutrition

  const score = (earned / max) * 100;

  return {
    score,
    detail: {
      calorieHit: cal.hit,
      calorieScore: round1(cal.score),
      proteinScore: round1(proteinScore),
      waterScore: round1(waterScore),
    },
  };
}

// Activity category (0 to 100). Null when there is nothing to judge.
// Locked rules (session 63 thread):
//  - A completed workout always scores (active /60 + completion /40), even on a
//    rest-tagged day. A completed cardio session with no exercise rows to check
//    counts as full completion.
//  - A rest-tagged day with no completed workout is protected: completion is
//    excluded and active cals are floored, so genuine rest is never punished and
//    extra movement (walks) still earns credit toward 100.
//  - Any other day with activity data and no completed workout takes the skip
//    ding (0 of 40 on completion).
//  - Mindful is presence based; a rest-tagged day is excluded (no judgment).
// The day type only matters here as the rest signal (dayType === 'rest').
function activityScore(input: DayScoreInput): { score: number; detail: NonNullable<DayScore['activityDetail']> } | null {
  if (input.exerciseExcluded) return null;   // exercise excluded: Activity drops out
  const adjActive = adjustedActiveCals(input);
  const goal = input.activeCalGoal;
  const isRest = input.dayType === 'rest';
  const completed = input.workoutCompletedCount;
  const total = input.workoutTotalCount;
  const didWorkout = completed > 0;

  // Active calories scored against the goal, capped at a max. Guarded against a
  // missing or zero goal so we never divide by zero.
  const activeAgainst = (max: number) =>
    goal > 0 ? Math.min(max, max * (adjActive / goal)) : 0;

  if (input.styleMode === 'mindful') {
    if (isRest) return null;                                // rest: no judgment
    const movedSteps = input.stepGoal > 0 && input.steps >= MINDFUL_STEP_FLOOR * input.stepGoal;
    const moved = didWorkout || movedSteps;
    const anySignal = adjActive > 0 || didWorkout || input.steps > 0;
    if (!anySignal) return null;
    return {
      score: moved ? 100 : 0,
      detail: { activeCalScore: 0, workoutScore: null, isMindfulPresence: true },
    };
  }

  // A completed workout always earns credit, rest tag or not.
  if (didWorkout) {
    const activeScore = activeAgainst(ACTIVE_MAX_WORKOUT_DAY);
    // total 0 with a completion means a logged cardio session: full credit.
    const workoutScore = total > 0
      ? WORKOUT_MAX * Math.min(1, completed / total)
      : WORKOUT_MAX;
    return {
      score: activeScore + workoutScore,
      detail: { activeCalScore: round1(activeScore), workoutScore: round1(workoutScore), isMindfulPresence: false },
    };
  }

  // No completed workout, rest tag: protect the rest, reward extra movement.
  if (isRest) {
    if (adjActive <= 0) return null;                       // nothing to measure
    const floored = goal > 0
      ? REST_ACTIVITY_FLOOR + (100 - REST_ACTIVITY_FLOOR) * Math.min(1, adjActive / goal)
      : REST_ACTIVITY_FLOOR;
    return {
      score: floored,
      detail: { activeCalScore: round1(floored), workoutScore: null, isMindfulPresence: false },
    };
  }

  // No completed workout, no rest tag: judge only if there is activity data.
  const hasData = adjActive > 0 || total > 0;
  if (!hasData) return null;
  const activeScore = activeAgainst(ACTIVE_MAX_WORKOUT_DAY);
  return {
    score: activeScore,                                    // completion is 0 of 40 (the skip ding)
    detail: { activeCalScore: round1(activeScore), workoutScore: 0, isMindfulPresence: false },
  };
}

// Sleep category (0 to 100). Null when no sleep was logged. Floor rule applied:
// any logged night earns at least SLEEP_FLOOR, the rest scales with raw score.
function sleepScoreCategory(input: DayScoreInput): { score: number; detail: NonNullable<DayScore['sleepDetail']> } | null {
  const raw = calcSleepScore(
    input.sleepHours, input.sleepStages, input.sleepGoal,
    input.sleepFeelRating, input.sleepIsManual, input.sleepConsistencyPts,
  ).score;
  if (raw === null) return null;
  const categoryScore = SLEEP_FLOOR + (raw / 100) * (100 - SLEEP_FLOOR);
  return { score: categoryScore, detail: { rawSleepScore: raw, categoryScore: round1(categoryScore) } };
}

// Compute the completed-day composite. Returns null when the day is excluded or
// no category has data (no score, no pop-up, dash in the archive).
export function computeDayScore(input: DayScoreInput): DayScore | null {
  if (input.excluded) return null;

  const nutrition = nutritionScore(input);
  const activity = activityScore(input);
  const sleep = sleepScoreCategory(input);

  // Minimum data threshold: at least one category must have data (spec 2.7).
  if (!nutrition && !activity && !sleep) return null;

  let weightedSum = 0;
  let weightTotal = 0;
  if (nutrition) { weightedSum += nutrition.score * CATEGORY_WEIGHTS.nutrition; weightTotal += CATEGORY_WEIGHTS.nutrition; }
  if (activity) { weightedSum += activity.score * CATEGORY_WEIGHTS.activity; weightTotal += CATEGORY_WEIGHTS.activity; }
  if (sleep) { weightedSum += sleep.score * CATEGORY_WEIGHTS.sleep; weightTotal += CATEGORY_WEIGHTS.sleep; }

  const composite = round1(weightTotal > 0 ? weightedSum / weightTotal : 0);

  return {
    composite,
    // Label off the rounded number that gets displayed, so a shown "95" never
    // reads Excellent one day and Elite the next (composite is 1-decimal).
    label: scoreLabel(Math.round(composite), input.styleMode),
    nutritionScore: nutrition ? round1(nutrition.score) : null,
    activityScore: activity ? round1(activity.score) : null,
    sleepScore: sleep ? round1(sleep.score) : null,
    nutritionDetail: nutrition ? nutrition.detail : null,
    activityDetail: activity ? activity.detail : null,
    sleepDetail: sleep ? sleep.detail : null,
    computedAt: input.computedAt,
    excludedFromAverages: !!input.excluded,
  };
}
