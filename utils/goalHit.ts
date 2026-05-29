// utils/goalHit.ts
// Single source of truth for "did this day hit the calorie goal."
// Replaces 6 divergent goal-hit formulas (achievements, home card, log card,
// calendar dots, At a Glance count, calorie streak) with one shared check.
// Pure functions, no side effects, no AsyncStorage. Callers load the inputs.
// One-way import from statsData (statsData never imports this), so no cycle.
// Full rationale + locked decisions: SPEC_calorie_goal_hit.md.

import { computeDayNet } from './statsData';

// Signed daily pace targets (kcal/day net). Lose is negative, gain positive.
// Mirrors the GOAL_DEFICITS block duplicated across index.tsx and head-to-head.tsx.
export const GOAL_DEFICITS: Record<string, number> = {
  lose_2: -1000,
  lose_1_5: -750,
  lose_1: -500,
  lose_0_5: -250,
  maintain: 0,
  gain_0_5: 250,
  gain_1: 500,
};

// -500 default mirrors the existing fallback used elsewhere in the app.
export function paceTargetFromWeightGoal(weightGoal: string): number {
  return GOAL_DEFICITS[weightGoal] ?? -500;
}

export interface GoalHitInput {
  consumed: number;          // sum of entries[].cal for the day
  dayData: any;              // the pj_ daily record (activeCalories || caloriesBurned)
  dayBmr: number;            // from buildDailyBmrMap, or live BMR for today
  calTarget: number;         // tdee + deficit, the static target
  paceTarget: number;        // signed GOAL_DEFICITS[weightGoal]
  burnAccuracyPct: number;   // 100 / 90 / 80 / 70
  isToday: boolean;
  minutesNow: number;        // running BMR for today, ignored when !isToday
}

export interface GoalHitResult {
  hit: boolean;
  way: 1 | 2;
  net: number | null;        // null on Way 1 (no net computed)
  adjustedActive: number;
}

// The active-cals floor that switches Way 1 (no/dead wearable) vs Way 2 (real burn).
export const ACTIVE_FLOOR = 50;

// Directional grace band for Way 2, applied by magnitude but directionally per
// goal. Universal across all coaching modes (see Decision 1 in the spec).
export const WAY2_BAND = 150;

// Way 1 window against the static calTarget (the deficit is already baked in).
export const WAY1_UNDER = 300;
export const WAY1_OVER = 150;

export function evaluateCalorieGoalHit(input: GoalHitInput): GoalHitResult {
  const rawActive = input.dayData?.activeCalories || input.dayData?.caloriesBurned || 0;
  const adjustedActive = Math.round(rawActive * input.burnAccuracyPct / 100);

  // WAY 1: no meaningful burn data. Judge consumed against the static target only.
  if (adjustedActive < ACTIVE_FLOOR) {
    const hit =
      input.calTarget > 0 &&
      input.consumed >= input.calTarget - WAY1_UNDER &&
      input.consumed <= input.calTarget + WAY1_OVER;
    return { hit, way: 1, net: null, adjustedActive };
  }

  // WAY 2: real burn present. Judge true net against the signed pace target.
  const net = computeDayNet(
    input.consumed,
    input.dayData,
    input.dayBmr,
    input.burnAccuracyPct,
    input.isToday,
    input.minutesNow,
  );
  const t = input.paceTarget;
  let hit: boolean;
  if (t < 0) {
    hit = net <= t + WAY2_BAND;       // lose: a bigger deficit still counts
  } else if (t > 0) {
    hit = net >= t - WAY2_BAND;       // gain: a bigger surplus still counts
  } else {
    hit = Math.abs(net) <= WAY2_BAND; // maintain
  }
  return { hit, way: 2, net, adjustedActive };
}

// Graded color for the home/log calorie card. Green appears only on a real hit,
// so the card can never contradict the streak. Non-hit days split warn vs bad
// by the existing mode delta thresholds. Mindful returns neutral (no color).
// adjustedTarget for the home card = calTarget + adjustedActive; it is used only
// to grade warn vs bad on a miss, never to decide the hit itself.
export function calorieColorTier(
  result: GoalHitResult,
  consumed: number,
  adjustedTarget: number,
  styleMode: string,
): 'good' | 'warn' | 'bad' | 'neutral' {
  // Case-insensitive: index.tsx uses lowercase styleMode, stats.tsx capitalized.
  const mode = (styleMode || '').toLowerCase();
  if (mode === 'mindful') return 'neutral';
  if (result.hit) return 'good';
  const delta = Math.abs(consumed - adjustedTarget);
  if (mode === 'discipline') return delta <= 149 ? 'warn' : 'bad';
  return delta <= 300 ? 'warn' : 'bad'; // Balanced
}
