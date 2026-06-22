// utils/comparisonEngine.ts
// Shared engine for the Comparison Report (#6) and the Challenge System (#7).
// Given a date range, computes each metric's DAILY AVERAGE over only the days that
// actually have data for that metric (per-metric denominator), drops excluded days,
// treats weight as NET CHANGE (first-to-last weigh-in), and picks a winner per metric
// with NO buffer (exact equality on the displayed value = tie; net cals = closest to
// pace target; weight = bigger change in goal direction).
//
// Honesty rules (see SPEC_comparison_challenge.md, Part 1):
//   - Average over logged days only. An unlogged day is NOT counted as 0.
//   - Per-metric denominators: steps may span 7 days while protein spans 5 on the same side.
//   - Excluded days (pj_<date>.excluded) are dropped from both numerator and denominator.
//   - Winner is decided on the SAME rounded value the UI shows (honest-numbers rule).
//
// Reading logic mirrors utils/weeklySummary.ts so values match the summaries exactly.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { paceTargetFromWeightGoal } from './goalHit';
import { loadCalorieTargets } from './calorieTarget';

export type MetricId = 'net' | 'protein' | 'steps' | 'activeCals' | 'water' | 'sleepScore' | 'weight';

// Fixed 7-metric set, in display order (SPEC Part 1 "Metrics").
export const COMPARISON_METRICS: MetricId[] = [
  'net', 'protein', 'steps', 'activeCals', 'water', 'sleepScore', 'weight',
];

export const METRIC_META: Record<MetricId, { label: string; unit: string; higherIsBetter: boolean }> = {
  net:        { label: 'Net Cals',    unit: 'kcal',  higherIsBetter: false }, // closest-to-pace, special
  protein:    { label: 'Protein',     unit: 'g',     higherIsBetter: true },
  steps:      { label: 'Steps',       unit: 'steps', higherIsBetter: true },
  activeCals: { label: 'Active Cals', unit: 'kcal',  higherIsBetter: true },
  water:      { label: 'Water',       unit: 'oz',    higherIsBetter: true },
  sleepScore: { label: 'Sleep Score', unit: '/100',  higherIsBetter: true },
  weight:     { label: 'Weight',      unit: 'lbs',   higherIsBetter: false }, // net change, special
};

export interface ComparisonGoals {
  calTarget: number;
  bmr: number;
  paceTarget: number;      // signed GOAL_DEFICITS[weightGoal]
  weightGoal: string;      // 'lose_1_5' | 'maintain' | 'gain_1' | ...
}

// One metric's result for one period.
export interface MetricValue {
  avg: number | null;      // daily average over logged days; for weight this is NET CHANGE
  loggedDays: number;      // the denominator (days that had data for this metric)
  // Weight-only extras (undefined for other metrics):
  startWeight?: number | null;
  endWeight?: number | null;
  weighIns?: number;
}

export interface PeriodResult {
  dateKeys: string[];      // the (non-excluded) day keys actually considered
  rangeDays: number;       // calendar days in the requested range
  excludedDays: number;    // how many were dropped as excluded
  metrics: Record<MetricId, MetricValue>;
}

export type Winner = 'a' | 'b' | 'tie' | null; // null = not enough data on one/both sides

export interface MetricComparison {
  id: MetricId;
  label: string;
  unit: string;
  a: MetricValue;
  b: MetricValue;
  winner: Winner;          // null => row renders "not enough data"
}

export interface ComparisonResult {
  goals: ComparisonGoals;
  periodA: PeriodResult;
  periodB: PeriodResult;
  rows: MetricComparison[]; // one per COMPARISON_METRICS, in order
}

// ── Date helpers ───────────────────────────────────────────────────────────────
function fmtKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Inclusive list of date keys from startKey..endKey (both 'YYYY-MM-DD').
export function dateKeysInRange(startKey: string, endKey: string): string[] {
  const [sy, sm, sd] = startKey.split('-').map(Number);
  const [ey, em, ed] = endKey.split('-').map(Number);
  const start = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);
  const keys: string[] = [];
  const cur = new Date(start);
  // guard against reversed input
  if (end < start) return [startKey];
  while (cur <= end) {
    keys.push(fmtKey(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return keys;
}

// ── Goal loading (mirrors weeklySummary.ts) ────────────────────────────────────
export async function loadComparisonGoals(anchorKey: string): Promise<ComparisonGoals> {
  let calTarget = 0, bmr = 0, weightGoal = 'maintain';
  try {
    const profRaw = await AsyncStorage.getItem('pj_profile');
    const profile = profRaw ? JSON.parse(profRaw) : {};
    weightGoal = profile.weightGoal || 'maintain';
    const targets = await loadCalorieTargets(anchorKey);
    calTarget = targets.calTarget || 0;
    bmr = targets.bmr || 0;
  } catch {}
  return { calTarget, bmr, paceTarget: paceTargetFromWeightGoal(weightGoal), weightGoal };
}

// ── Excluded-day test (mirrors weeklySummary.ts) ───────────────────────────────
function isExcluded(day: any): boolean {
  const _ex = day?.excluded;
  return !!(
    day?.dayScore?.excludedFromAverages ||
    (_ex && typeof _ex === 'object' && !!(_ex.diet && _ex.water && _ex.exercise))
  );
}

function round(v: number): number { return Math.round(v); }
function avgInt(vals: number[]): number | null {
  if (!vals.length) return null;
  return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
}
function avgFloat1(vals: number[]): number | null {
  if (!vals.length) return null;
  return Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10;
}

// ── Per-period computation ─────────────────────────────────────────────────────
// Reads pj_<date> for each key, builds per-metric lists over logged (non-excluded) days.
export async function computePeriod(dateKeys: string[], goals: ComparisonGoals): Promise<PeriodResult> {
  const storageKeys = dateKeys.map(k => `pj_${k}`);
  let pairs: readonly [string, string | null][] = [];
  try { pairs = await AsyncStorage.multiGet(storageKeys); } catch {}

  const dayMap: Record<string, any> = {};
  for (const [fullKey, raw] of pairs) {
    if (!raw) continue;
    try { dayMap[fullKey.slice(3)] = JSON.parse(raw); } catch {}
  }

  const netList: number[] = [];
  const proteinList: number[] = [];
  const stepsList: number[] = [];
  const activeList: number[] = [];
  const waterList: number[] = [];
  const sleepScoreList: number[] = [];
  const weighIns: { dateKey: string; weight: number }[] = [];

  const consideredKeys: string[] = [];
  let excludedDays = 0;

  for (const dk of dateKeys) {
    const day = dayMap[dk];
    if (!day) continue;                 // no record at all -> absent, not a logged day
    if (isExcluded(day)) { excludedDays++; continue; }
    consideredKeys.push(dk);

    const burnAccuracyPct = day.goalSnapshot?.burnAccuracyPct ?? 100;
    const entries: any[] = Array.isArray(day.entries) ? day.entries : [];

    // Nutrition: only counts on days food was actually logged.
    if (entries.length > 0) {
      const cal = round(entries.reduce((s, e: any) => s + (e.cal || 0), 0));
      const prot = round(entries.reduce((s, e: any) => s + (e.protein || 0), 0));
      proteinList.push(prot);
      const dayBmr = day.goalSnapshot?.bmr || goals.bmr;
      const active = round((day.activeCalories || day.caloriesBurned || 0) * burnAccuracyPct / 100);
      if (dayBmr > 0) netList.push(cal - active - dayBmr);
    }

    const water = typeof day.water === 'number' ? day.water : 0;
    if (water > 0) waterList.push(water);

    const rawActive = day.activeCalories || day.caloriesBurned || 0;
    const activeCals = round(rawActive * burnAccuracyPct / 100);
    if (activeCals > 0) activeList.push(activeCals);

    const steps = day.steps || 0;
    if (steps > 0) stepsList.push(steps);

    // Sleep score from the stored day score (raw sleep score as of DAYSCORE_VERSION 4).
    const ss = day.dayScore?.sleepScore;
    if (typeof ss === 'number' && ss > 0) sleepScoreList.push(ss);

    if (day.weight && day.weight > 0) weighIns.push({ dateKey: dk, weight: day.weight });
  }

  // Weight = net change first-to-last (needs >= 2 weigh-ins).
  let weightVal: MetricValue;
  if (weighIns.length >= 1) {
    weighIns.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
    const startWeight = weighIns[0].weight;
    const endWeight = weighIns[weighIns.length - 1].weight;
    const change = weighIns.length >= 2 ? Math.round((endWeight - startWeight) * 10) / 10 : null;
    weightVal = { avg: change, loggedDays: weighIns.length, startWeight, endWeight, weighIns: weighIns.length };
  } else {
    weightVal = { avg: null, loggedDays: 0, startWeight: null, endWeight: null, weighIns: 0 };
  }

  return {
    dateKeys: consideredKeys,
    rangeDays: dateKeys.length,
    excludedDays,
    metrics: {
      net:        { avg: avgInt(netList),        loggedDays: netList.length },
      protein:    { avg: avgInt(proteinList),    loggedDays: proteinList.length },
      steps:      { avg: avgInt(stepsList),      loggedDays: stepsList.length },
      activeCals: { avg: avgInt(activeList),     loggedDays: activeList.length },
      water:      { avg: avgInt(waterList),      loggedDays: waterList.length },
      sleepScore: { avg: avgInt(sleepScoreList), loggedDays: sleepScoreList.length },
      weight:     weightVal,
    },
  };
}

// ── Winner logic (NO buffer; decided on the displayed value) ────────────────────
export function pickWinner(id: MetricId, a: MetricValue, b: MetricValue, goals: ComparisonGoals): Winner {
  if (a.avg === null || b.avg === null) return null; // not enough data on a side

  if (id === 'net') {
    // Closest to pace target wins. Exact-equal distance = tie. No buffer.
    const da = Math.abs(a.avg - goals.paceTarget);
    const db = Math.abs(b.avg - goals.paceTarget);
    if (da === db) return 'tie';
    return da < db ? 'a' : 'b';
  }

  if (id === 'weight') {
    // a.avg / b.avg are NET CHANGES (signed lbs). Bigger change in goal direction wins.
    const losing = goals.weightGoal.startsWith('lose');
    const gaining = goals.weightGoal.startsWith('gain');
    if (a.avg === b.avg) return 'tie';
    if (losing) return a.avg < b.avg ? 'a' : 'b';      // more negative = more lost
    if (gaining) return a.avg > b.avg ? 'a' : 'b';     // more positive = more gained
    // maintain: held steadier (smaller absolute change) wins
    const aa = Math.abs(a.avg), ab = Math.abs(b.avg);
    if (aa === ab) return 'tie';
    return aa < ab ? 'a' : 'b';
  }

  // Higher-is-better metrics: protein, steps, activeCals, water, sleepScore.
  if (a.avg === b.avg) return 'tie';
  return a.avg > b.avg ? 'a' : 'b';
}

// ── Top-level: compare two date ranges across all 7 metrics ────────────────────
export async function buildComparison(
  dateKeysA: string[],
  dateKeysB: string[],
  goalsOverride?: ComparisonGoals,
): Promise<ComparisonResult> {
  // Anchor goals to the most recent day across both ranges.
  const anchor = [...dateKeysA, ...dateKeysB].sort().pop() || fmtKey(new Date());
  const goals = goalsOverride ?? await loadComparisonGoals(anchor);

  const [periodA, periodB] = await Promise.all([
    computePeriod(dateKeysA, goals),
    computePeriod(dateKeysB, goals),
  ]);

  const rows: MetricComparison[] = COMPARISON_METRICS.map(id => ({
    id,
    label: METRIC_META[id].label,
    unit: METRIC_META[id].unit,
    a: periodA.metrics[id],
    b: periodB.metrics[id],
    winner: pickWinner(id, periodA.metrics[id], periodB.metrics[id], goals),
  }));

  return { goals, periodA, periodB, rows };
}
