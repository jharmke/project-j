// utils/dayScoreStore.ts
// Impure orchestration around the pure dayScore.ts engine: loads the inputs for
// a date from AsyncStorage, computes the score, and writes it back with a strict
// read-then-merge (never replaces the day record). Also runs a once-per-day
// backfill scan so the 90-day archive fills in even when days are skipped.
//
// All canonical derivations are reused, not reinvented:
//  - calTarget / dayBmr / paceTarget come from loadCalorieTargets (same source
//    as the home Calories card), so the calorie sub can never drift from home.
//  - protein goal mirrors index.tsx's macro logic.
//  - sleep is recomputed against the per-day stored sleepGoal via the shared
//    calcSleepScore (inside dayScore.ts), matching what home displayed.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { storageSet } from './storage';
import { loadCalorieTargets } from './calorieTarget';
import { computeDayScore, DayScore, DayScoreInput, DayType, StyleMode } from './dayScore';

const SCAN_GATE_KEY = 'pj_last_dayscore_scan';
const ARCHIVE_WINDOW_DAYS = 90;
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function dayNameFromKey(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  return DAY_NAMES[new Date(y, m - 1, d).getDay()];
}

// dateKey for a given number of days before todayKey (local time).
function keyForOffset(todayKey: string, offset: number): string {
  const [y, m, d] = todayKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - offset);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

// Workout day type + completion counts for a date, mirroring the workout tab:
// program is the per-date entry, falling back to the weekly template, then blank.
// Cardio completion is a boolean separate from exercise checks, so a completed
// cardio session counts as a full workout even with no exercise rows (decision 1).
async function loadWorkoutForDate(dateKey: string): Promise<{ dayType: DayType; completed: number; total: number }> {
  let state: any = {};
  try { const r = await AsyncStorage.getItem('pj_workout_state'); state = r ? JSON.parse(r) : {}; } catch {}
  const programs = state.programs || {};
  const weeklyTemplate = state.weeklyTemplate || {};
  const checks = state.checks || {};
  const cardioComplete = state.cardioComplete || {};

  const program = programs[dateKey] || weeklyTemplate[dayNameFromKey(dateKey)] || { type: 'unassigned', exercises: [] };
  const dayType: DayType = program.type || 'unassigned';
  const exercises = Array.isArray(program.exercises) ? program.exercises : [];
  const dayChecks = checks[dateKey] || {};
  const checkedCount = exercises.filter((ex: any) => dayChecks[ex.id]).length;
  const cardioDone = cardioComplete[dateKey] === true;

  let total: number, completed: number;
  if (exercises.length > 0) {
    total = exercises.length;
    completed = cardioDone ? exercises.length : checkedCount;
  } else {
    total = 0;
    completed = cardioDone ? 1 : 0;
  }
  return { dayType, completed, total };
}

// Build the pure-compute input for a date from storage. Returns null if the day
// record does not exist at all (nothing to score).
export async function buildDayScoreInput(dateKey: string, computedAt: string): Promise<DayScoreInput | null> {
  const rawDay = await AsyncStorage.getItem(`pj_${dateKey}`);
  if (!rawDay) return null;
  let day: any;
  try { day = JSON.parse(rawDay); } catch { return null; }

  let profile: any = {}, settings: any = {};
  try { const r = await AsyncStorage.getItem('pj_profile'); profile = r ? JSON.parse(r) : {}; } catch {}
  try { const r = await AsyncStorage.getItem('pj_settings'); settings = r ? JSON.parse(r) : {}; } catch {}

  const { bmr, calTarget, paceDeficit } = await loadCalorieTargets(dateKey);
  const burnAccuracyPct = settings.burnAccuracyPct ?? 100;
  const styleMode: StyleMode = (settings.styleMode as StyleMode) || 'balanced';

  // Nutrition
  const entries = Array.isArray(day.entries) ? day.entries : [];
  const hasFood = entries.length > 0;
  const consumed = entries.reduce((s: number, e: any) => s + (e.cal || 0), 0);
  const actualProteinG = entries.reduce((s: number, e: any) => s + (e.protein || 0), 0);
  let proteinGoalG = 0;
  if (profile.macroMode === 'fixed' && profile.macroProteinG) {
    proteinGoalG = parseFloat(profile.macroProteinG) || 0;
  } else if (profile.macroProteinPct && calTarget > 0) {
    proteinGoalG = Math.round(((parseFloat(profile.macroProteinPct) || 35) / 100) * calTarget / 4);
  }
  const waterGoal = parseFloat(profile.waterGoal) || 0;
  const waterLogged = typeof day.water === 'number' ? day.water : 0;

  // Activity
  const ws = await loadWorkoutForDate(dateKey);
  const activeCalGoal = parseInt(profile.activeCalGoal) || 500;
  const stepGoal = parseInt(profile.stepGoal) || 0;
  const steps = day.steps || 0;

  // Sleep (recomputed against the per-day stored goal via the shared formula)
  const sleepHours = day.sleepOverride ?? day.sleepHours ?? null;
  const sleepStages = day.sleepStages || null;
  const sleepGoal = day.sleepGoal ?? (parseFloat(profile.sleepGoal) || 7);
  const sleepFeelRating = day.sleepFeelRating ?? null;
  const sleepIsManual = !!day.sleepOverride;
  const sleepConsistencyPts = day.sleepConsistencyPts ?? 0;

  return {
    excluded: !!day.excluded,
    computedAt,
    styleMode,
    hasFood,
    consumed,
    dayData: day,
    dayBmr: bmr,
    calTarget,
    paceTarget: paceDeficit,
    burnAccuracyPct,
    proteinGoalG,
    actualProteinG,
    waterGoal,
    waterLogged,
    dayType: ws.dayType,
    activeCalGoal,
    workoutCompletedCount: ws.completed,
    workoutTotalCount: ws.total,
    steps,
    stepGoal,
    sleepHours,
    sleepStages,
    sleepGoal,
    sleepFeelRating,
    sleepIsManual,
    sleepConsistencyPts,
  };
}

// Compute and store a single day's score. Read-then-merge: never replaces the
// day record. Returns the score (null when the day has no scorable data).
export async function computeAndStoreDayScore(dateKey: string, computedAt: string): Promise<DayScore | null> {
  const input = await buildDayScoreInput(dateKey, computedAt);
  if (!input) return null;
  const score = computeDayScore(input);
  if (!score) return null;

  const raw = await AsyncStorage.getItem(`pj_${dateKey}`);
  const cur = raw ? JSON.parse(raw) : {};
  await storageSet(`pj_${dateKey}`, JSON.stringify({ ...cur, dayScore: score }));
  return score;
}

// Return a day's score, computing and storing it once if it does not exist yet.
// Excluded days never get a score. Returns the stored score on later calls (no
// recompute), so a day is a one-time snapshot per the spec.
async function ensureDayScore(dateKey: string, nowISO: string): Promise<DayScore | null> {
  const raw = await AsyncStorage.getItem(`pj_${dateKey}`);
  if (!raw) return null;
  let day: any;
  try { day = JSON.parse(raw); } catch { return null; }
  if (day.excluded) return null;
  if (day.dayScore) return day.dayScore;
  return computeAndStoreDayScore(dateKey, nowISO);
}

// Ensures yesterday is scored (every call) and, at most once per calendar day,
// backfills any older completed day in the 90-day window that has data but no
// score yet. Returns yesterday's score for the morning pop-up (step 3).
export async function runDayScoreScan(todayKey: string, nowISO: string): Promise<DayScore | null> {
  // Yesterday is always ensured, so the pop-up has it on every morning open.
  const yesterdayScore = await ensureDayScore(keyForOffset(todayKey, 1), nowISO);

  // The wider backfill is gated to once per day (it is the expensive part).
  let alreadyScanned = false;
  try { alreadyScanned = (await AsyncStorage.getItem(SCAN_GATE_KEY)) === todayKey; } catch {}
  if (alreadyScanned) return yesterdayScore;

  const keys: string[] = [];
  for (let offset = 2; offset <= ARCHIVE_WINDOW_DAYS; offset++) {
    keys.push(`pj_${keyForOffset(todayKey, offset)}`);
  }

  let pairs: readonly [string, string | null][] = [];
  try { pairs = await AsyncStorage.multiGet(keys); } catch { return yesterdayScore; }

  for (const [fullKey, raw] of pairs) {
    if (!raw) continue;
    let day: any;
    try { day = JSON.parse(raw); } catch { continue; }
    if (day.dayScore || day.excluded) continue;
    await computeAndStoreDayScore(fullKey.slice(3), nowISO); // strip "pj_"
  }

  try { await storageSet(SCAN_GATE_KEY, todayKey); } catch {}
  return yesterdayScore;
}
