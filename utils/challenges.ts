// utils/challenges.ts
// Data layer for the Challenge System (#7). See SPEC_comparison_challenge.md Part 2.
//
// ONE active challenge at a time. Two types:
//   - 'beat'   : multi-metric, beat a past period's daily averages (reuses comparisonEngine).
//   - 'custom' : single-metric temporary elevated daily target (base goal untouched);
//                weight is the exception, an end-state net-change target with a safe cap.
//
// Win rule scales with length: <= 7 days = every day (perfect only); > 7 days =
// Complete (one slip per week) + Perfect (every day).
//
// Storage: pj_challenge (the single active/pending challenge), pj_challenges (history).
// Base goals in pj_profile are NEVER written here.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { storageSet } from './storage';
import {
  computePeriod, loadComparisonGoals, pickWinner, dateKeysInRange,
  ComparisonGoals, MetricId, METRIC_META,
} from './comparisonEngine';

const ACTIVE_KEY = 'pj_challenge';
const HISTORY_KEY = 'pj_challenges';

// #7 metric set: net cals, protein, steps, water, sleep score, weight (NO active cals).
export type ChallengeMetric = Extract<MetricId, 'net' | 'protein' | 'steps' | 'water' | 'sleepScore' | 'weight'>;
export const CHALLENGE_METRICS: ChallengeMetric[] = ['net', 'protein', 'steps', 'water', 'sleepScore', 'weight'];

export type ChallengeType = 'beat' | 'custom';
export type StartMode = 'today' | 'tomorrow';

export interface Challenge {
  id: string;
  type: ChallengeType;
  createdAt: string;          // ISO
  startKey: string;           // first day, inclusive (YYYY-MM-DD)
  endKey: string;             // last day, inclusive
  startMode: StartMode;
  // direction snapshots taken at creation (so a mid-challenge goal change doesn't flip the rules)
  weightGoal: string;
  paceTarget: number;
  // Type 'beat':
  metrics?: ChallengeMetric[];
  benchmarkStartKey?: string;
  benchmarkEndKey?: string;
  // Type 'custom':
  metric?: ChallengeMetric;
  target?: number;            // per-day target; for weight = signed end-state change goal (lbs)
  // set when the user dismisses the completion pop-up
  acknowledged?: boolean;
}

export type ChallengeStatus = 'pending' | 'active' | 'ended';
export type ChallengeTier = 'perfect' | 'complete' | 'partial';

export interface BeatMetricProgress {
  metric: ChallengeMetric;
  label: string;
  unit: string;
  youAvg: number | null;
  benchmarkAvg: number | null;
  beating: boolean;           // strictly ahead of the benchmark right now
  enoughData: boolean;
}

export interface ChallengeProgress {
  status: ChallengeStatus;
  totalDays: number;
  dayNumber: number;          // 1-based day of the challenge that today is (clamped)
  daysRemaining: number;      // full days left after today (0 once ended)
  daysElapsed: number;        // challenge days counted so far (incl. today while active)
  // type 'beat'
  rows?: BeatMetricProgress[];
  metricsBeaten?: number;
  metricsTotal?: number;
  // type 'custom' per-day
  metric?: ChallengeMetric;
  target?: number;
  todayValue?: number | null;
  daysHit?: number;
  // type 'custom' weight (end-state)
  isWeight?: boolean;
  weightChangeSoFar?: number | null;
  // outcome (meaningful once status === 'ended', also previewed live)
  won: boolean;               // hit the Complete bar (or all metrics for 'beat')
  tier: ChallengeTier;
}

// ── Date helpers ────────────────────────────────────────────────────────────────
function fmtKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function addDays(d: Date, n: number): Date { const c = new Date(d); c.setDate(c.getDate() + n); return c; }
function daysBetween(startKey: string, endKey: string): number {
  return dateKeysInRange(startKey, endKey).length;
}
export function todayKey(): string { return fmtKey(new Date()); }

// Short human title for a challenge (shared by the Challenges page + Stats section).
export function challengeTitle(ch: Challenge): string {
  if (ch.type === 'beat') return 'Beat a Previous Period';
  const m = ch.metric as ChallengeMetric;
  if (m === 'weight') {
    const lose = !ch.weightGoal.startsWith('gain');
    return `${lose ? 'Lose' : 'Gain'} ${Math.abs(ch.target ?? 0)} lbs`;
  }
  return `${ch.target} ${METRIC_META[m].unit}/day · ${METRIC_META[m].label}`;
}

// ── Safe-rate weight cap (SPEC: 2 lb/wk loss, 1 lb/wk gain, maintain = no weight challenge) ──
export function maxWeightChangeLbs(weightGoal: string, days: number): number {
  const weeks = days / 7;
  if (weightGoal.startsWith('lose')) return Math.round(2 * weeks * 10) / 10;
  if (weightGoal.startsWith('gain')) return Math.round(1 * weeks * 10) / 10;
  return 0; // maintain
}

// ── Storage CRUD ────────────────────────────────────────────────────────────────
export async function loadActiveChallenge(): Promise<Challenge | null> {
  try {
    const raw = await AsyncStorage.getItem(ACTIVE_KEY);
    return raw ? JSON.parse(raw) as Challenge : null;
  } catch { return null; }
}

export async function saveActiveChallenge(ch: Challenge): Promise<void> {
  await storageSet(ACTIVE_KEY, JSON.stringify(ch));
}

export async function clearActiveChallenge(): Promise<void> {
  try { await AsyncStorage.removeItem(ACTIVE_KEY); } catch {}
}

export async function loadChallengeHistory(): Promise<Challenge[]> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

// Append to history (read-then-merge, newest first). Never overwrites the array wholesale.
export async function appendChallengeHistory(ch: Challenge): Promise<void> {
  const existing = await loadChallengeHistory();
  const next = [ch, ...existing.filter(c => c.id !== ch.id)];
  await storageSet(HISTORY_KEY, JSON.stringify(next));
}

// ── Creation ────────────────────────────────────────────────────────────────────
export interface CreateChallengeInput {
  type: ChallengeType;
  startMode: StartMode;
  durationDays: number;
  metrics?: ChallengeMetric[];          // beat
  benchmarkStartKey?: string;           // beat (optional custom past period; else previous-equivalent)
  metric?: ChallengeMetric;             // custom
  target?: number;                      // custom
}

export async function createChallenge(input: CreateChallengeInput): Promise<Challenge> {
  const now = new Date();
  const start = input.startMode === 'today' ? now : addDays(now, 1);
  const startKey = fmtKey(start);
  const endKey = fmtKey(addDays(start, input.durationDays - 1));
  const goals = await loadComparisonGoals(startKey);

  const ch: Challenge = {
    id: `ch_${Date.now()}`,
    type: input.type,
    createdAt: new Date().toISOString(),
    startKey,
    endKey,
    startMode: input.startMode,
    weightGoal: goals.weightGoal,
    paceTarget: goals.paceTarget,
  };

  if (input.type === 'beat') {
    ch.metrics = input.metrics && input.metrics.length ? input.metrics : ['steps'];
    // Benchmark = the chosen past anchor (single date) + matched length, else the
    // immediately-preceding equivalent block (the duration just before the start).
    const benchEnd = addDays(start, -1);
    const benchStartDefault = addDays(benchEnd, -(input.durationDays - 1));
    if (input.benchmarkStartKey) {
      const [by, bm, bd] = input.benchmarkStartKey.split('-').map(Number);
      const bs = new Date(by, bm - 1, bd);
      ch.benchmarkStartKey = fmtKey(bs);
      ch.benchmarkEndKey = fmtKey(addDays(bs, input.durationDays - 1));
    } else {
      ch.benchmarkStartKey = fmtKey(benchStartDefault);
      ch.benchmarkEndKey = fmtKey(benchEnd);
    }
  } else {
    ch.metric = input.metric ?? 'steps';
    ch.target = input.target ?? 0;
  }

  await saveActiveChallenge(ch);
  return ch;
}

// ── Status helpers ──────────────────────────────────────────────────────────────
export function challengeStatus(ch: Challenge, today = todayKey()): ChallengeStatus {
  if (today < ch.startKey) return 'pending';
  if (today > ch.endKey) return 'ended';
  return 'active';
}

// Did a single day's value meet the per-day target? Directional for net cals.
function dayHitsTarget(metric: ChallengeMetric, value: number | null, target: number, paceTarget: number): boolean {
  if (value === null) return false;
  if (metric === 'net') {
    // Tougher target = a more aggressive deficit/surplus in the goal direction.
    // Deficit goal (negative pace): hit when net <= target. Surplus goal: net >= target.
    return paceTarget <= 0 ? value <= target : value >= target;
  }
  return value >= target; // steps/water/protein/sleepScore: higher = hit
}

// Win tier from days hit vs total (duration-scaled).
function tierFor(totalDays: number, daysHit: number): ChallengeTier {
  if (daysHit >= totalDays) return 'perfect';
  if (totalDays <= 7) return 'partial';            // short = every-day or nothing
  const maxMisses = Math.floor(totalDays / 7);     // one slip per week
  return (totalDays - daysHit) <= maxMisses ? 'complete' : 'partial';
}

// ── Live progress ───────────────────────────────────────────────────────────────
export async function computeChallengeProgress(ch: Challenge, today = todayKey()): Promise<ChallengeProgress> {
  const status = challengeStatus(ch, today);
  const totalDays = daysBetween(ch.startKey, ch.endKey);

  // Elapsed window: start..min(today, endKey). Empty while pending.
  const lastCounted = status === 'pending' ? null : (today <= ch.endKey ? today : ch.endKey);
  const elapsedKeys = lastCounted ? dateKeysInRange(ch.startKey, lastCounted) : [];
  const daysElapsed = elapsedKeys.length;
  const dayNumber = Math.min(Math.max(daysElapsed, status === 'pending' ? 0 : 1), totalDays);
  const daysRemaining = Math.max(0, totalDays - daysElapsed);

  const goals: ComparisonGoals = {
    calTarget: 0, bmr: 0, paceTarget: ch.paceTarget, weightGoal: ch.weightGoal,
  };

  if (ch.type === 'beat') {
    const metrics = ch.metrics ?? [];
    const benchKeys = dateKeysInRange(ch.benchmarkStartKey!, ch.benchmarkEndKey!);
    const [youPeriod, benchPeriod] = await Promise.all([
      computePeriod(elapsedKeys, goals),
      computePeriod(benchKeys, goals),
    ]);
    const rows: BeatMetricProgress[] = metrics.map(m => {
      const you = youPeriod.metrics[m];
      const bench = benchPeriod.metrics[m];
      const winner = pickWinner(m, you, bench, goals);
      return {
        metric: m,
        label: METRIC_META[m].label,
        unit: METRIC_META[m].unit,
        youAvg: you.avg,
        benchmarkAvg: bench.avg,
        beating: winner === 'a',
        enoughData: you.avg !== null && bench.avg !== null,
      };
    });
    const metricsBeaten = rows.filter(r => r.beating).length;
    const won = metrics.length > 0 && metricsBeaten === metrics.length;
    return {
      status, totalDays, dayNumber, daysRemaining, daysElapsed,
      rows, metricsBeaten, metricsTotal: metrics.length,
      won, tier: won ? 'perfect' : 'partial',
    };
  }

  // ── custom ──
  const metric = ch.metric!;
  const target = ch.target ?? 0;

  if (metric === 'weight') {
    // End-state net change across the elapsed window (first-to-last weigh-in).
    const period = await computePeriod(elapsedKeys, goals);
    const change = period.metrics.weight.avg; // net change or null (<2 weigh-ins)
    // won when the change reaches the target in the goal direction.
    let won = false;
    if (change !== null) {
      won = ch.weightGoal.startsWith('lose') ? change <= target : ch.weightGoal.startsWith('gain') ? change >= target : false;
    }
    return {
      status, totalDays, dayNumber, daysRemaining, daysElapsed,
      metric, target, isWeight: true, weightChangeSoFar: change,
      won, tier: won ? 'perfect' : 'partial',
    };
  }

  // Per-day metric: count days that hit the target.
  let daysHit = 0;
  let todayValue: number | null = null;
  for (const dk of elapsedKeys) {
    const p = await computePeriod([dk], goals);
    const v = p.metrics[metric].avg; // single-day -> the day's value
    if (dk === today) todayValue = v;
    if (dayHitsTarget(metric, v, target, ch.paceTarget)) daysHit++;
  }
  const tier = tierFor(totalDays, daysHit);
  const won = tier === 'perfect' || tier === 'complete';
  return {
    status, totalDays, dayNumber, daysRemaining, daysElapsed,
    metric, target, todayValue, daysHit,
    won, tier,
  };
}
