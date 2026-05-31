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
import { computeDayScore, scoreLabel, DayScore, DayScoreInput, DayType, StyleMode } from './dayScore';

const SCAN_GATE_KEY = 'pj_last_dayscore_scan';
const ARCHIVE_WINDOW_DAYS = 90;
// Bump when the scoring logic changes so stored scores recompute once. v2 added
// per-category (diet/water/exercise) exclusion handling.
const DAYSCORE_VERSION = 2;
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

// A day counts as fully excluded from the Day Score (no score, dash in archive,
// out of the weekly average) only when every category exclusion is on. The app
// stores per-category exclusions as { diet, water, exercise } (Day Detail
// toggles + calendar dots); the pop-up's "Exclude this day" sets all three. A
// legacy plain-boolean excluded is also honored for safety.
export function isDayExcluded(day: any): boolean {
  const ex = day?.excluded;
  if (ex === true) return true;
  if (ex && typeof ex === 'object') return !!(ex.diet && ex.water && ex.exercise);
  return false;
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

  // Per-category exclusions: diet drops calorie + protein, water drops the water
  // sub, exercise drops Activity. A fully-excluded day (all three) is handled by
  // isDayExcluded above (no score at all).
  const exObj = (day.excluded && typeof day.excluded === 'object') ? day.excluded : {};

  return {
    excluded: isDayExcluded(day),
    dietExcluded: !!exObj.diet,
    waterExcluded: !!exObj.water,
    exerciseExcluded: !!exObj.exercise,
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

  const stamped: DayScore = { ...score, version: DAYSCORE_VERSION };
  const raw = await AsyncStorage.getItem(`pj_${dateKey}`);
  const cur = raw ? JSON.parse(raw) : {};
  await storageSet(`pj_${dateKey}`, JSON.stringify({ ...cur, dayScore: stamped }));
  return stamped;
}

// Return a day's score, computing and storing it once if it does not exist yet.
// Excluded days never get a score. Returns the stored score on later calls (no
// recompute), so a day is a one-time snapshot per the spec.
async function ensureDayScore(dateKey: string, nowISO: string): Promise<DayScore | null> {
  const raw = await AsyncStorage.getItem(`pj_${dateKey}`);
  if (!raw) return null;
  let day: any;
  try { day = JSON.parse(raw); } catch { return null; }
  if (isDayExcluded(day)) return null;
  if (day.dayScore && day.dayScore.version === DAYSCORE_VERSION) return day.dayScore;
  return computeAndStoreDayScore(dateKey, nowISO);
}

// Composites for up to `count` completed days immediately before beforeKey,
// skipping excluded days and days with no score. Feeds the pop-up's context line
// (best day this week / vs weekly average). Read-only, never writes.
export async function loadRecentComposites(beforeKey: string, count: number): Promise<number[]> {
  const keys: string[] = [];
  for (let i = 1; i <= count; i++) keys.push(`pj_${keyForOffset(beforeKey, i)}`);
  let pairs: readonly [string, string | null][] = [];
  try { pairs = await AsyncStorage.multiGet(keys); } catch { return []; }
  const out: number[] = [];
  for (const [, raw] of pairs) {
    if (!raw) continue;
    try {
      const day = JSON.parse(raw);
      if (day.excluded) continue;
      if (day.dayScore && typeof day.dayScore.composite === 'number') out.push(day.dayScore.composite);
    } catch {}
  }
  return out;
}

// Fast-exclude path from the morning pop-up. Read-then-merge: flips the day's
// excluded flag and mirrors it onto the stored dayScore so the archive shows a
// dash and weekly averages skip it. Never replaces the day record.
export async function excludeDayFromAverages(dateKey: string): Promise<void> {
  const raw = await AsyncStorage.getItem(`pj_${dateKey}`);
  if (!raw) return;
  let day: any;
  try { day = JSON.parse(raw); } catch { return; }
  // Merge into the existing per-category exclusion object, never replace it, so
  // the calendar dots and Day Detail toggles stay intact. Full day = all three.
  const prevEx = (day.excluded && typeof day.excluded === 'object') ? day.excluded : {};
  const merged: any = { ...day, excluded: { ...prevEx, diet: true, water: true, exercise: true } };
  if (day.dayScore) merged.dayScore = { ...day.dayScore, excludedFromAverages: true };
  await storageSet(`pj_${dateKey}`, JSON.stringify(merged));
}

// Ensures yesterday is scored (every call) and, at most once per calendar day,
// backfills any older completed day in the 90-day window that has data but no
// score yet. Returns yesterday's score for the morning pop-up (step 3).
export async function runDayScoreScan(todayKey: string, nowISO: string): Promise<DayScore | null> {
  // Yesterday is always ensured, so the pop-up has it on every morning open.
  const yesterdayScore = await ensureDayScore(keyForOffset(todayKey, 1), nowISO);

  // The wider backfill is gated to once per day (it is the expensive part). The
  // gate value includes DAYSCORE_VERSION so a logic bump forces one extra rescan
  // (which migrates every stored score to the new version) even if today already
  // ran under the old version.
  const gateVal = `${todayKey}:v${DAYSCORE_VERSION}`;
  let alreadyScanned = false;
  try { alreadyScanned = (await AsyncStorage.getItem(SCAN_GATE_KEY)) === gateVal; } catch {}
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
    if (isDayExcluded(day)) continue;
    if (day.dayScore && day.dayScore.version === DAYSCORE_VERSION) continue;
    await computeAndStoreDayScore(fullKey.slice(3), nowISO); // strip "pj_"
  }

  try { await storageSet(SCAN_GATE_KEY, gateVal); } catch {}
  return yesterdayScore;
}

// ─── 90-day archive (Stats > Reports), grouped by week ───────────────────────

export interface ArchiveDay {
  dateKey: string;
  hasData: boolean;                 // a pj_ record exists for the day
  excluded: boolean;
  score: DayScore | null;           // null when no score (no data / today / future)
}

export interface ArchiveWeek {
  startKey: string;                 // Sunday of the week (YYYY-MM-DD)
  endKey: string;                   // Saturday of the week (YYYY-MM-DD)
  days: ArchiveDay[];               // chronological, Sunday to Saturday
  avgComposite: number | null;      // mean of non-excluded scored days, or null
  avgLabel: string | null;          // label for avgComposite in the given mode
  scoredCount: number;              // non-excluded days with a composite
  loggedCount: number;              // days with a pj_ record (any data)
}

// Sunday-of-week key for a date (the app calendar is Sunday-first).
function weekStartKey(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - dt.getDay());
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

function addDaysKey(dateKey: string, n: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

// Loads the last ARCHIVE_WINDOW_DAYS completed days (yesterday back), grouped
// into Sunday-Saturday weeks, most recent week first. Read-only: it surfaces
// whatever scores the once-per-day scan has already computed and stored; it does
// not compute or write. Weekly average excludes excluded days. mode only affects
// the average label text.
export async function loadDayScoreArchive(todayKey: string, mode: StyleMode): Promise<ArchiveWeek[]> {
  // Gather yesterday back through the window into a date-keyed map.
  const keys: string[] = [];
  for (let offset = 1; offset <= ARCHIVE_WINDOW_DAYS; offset++) keys.push(`pj_${keyForOffset(todayKey, offset)}`);

  let pairs: readonly [string, string | null][] = [];
  try { pairs = await AsyncStorage.multiGet(keys); } catch { return []; }

  const byDate = new Map<string, ArchiveDay>();
  for (const [fullKey, raw] of pairs) {
    const dateKey = fullKey.slice(3); // strip "pj_"
    if (!raw) { byDate.set(dateKey, { dateKey, hasData: false, excluded: false, score: null }); continue; }
    let day: any;
    try { day = JSON.parse(raw); } catch { byDate.set(dateKey, { dateKey, hasData: false, excluded: false, score: null }); continue; }
    byDate.set(dateKey, {
      dateKey,
      hasData: true,
      excluded: isDayExcluded(day),
      score: day.dayScore && typeof day.dayScore.composite === 'number' ? day.dayScore as DayScore : null,
    });
  }

  // Group into Sunday-Saturday weeks. Build each week's 7 day slots so a row can
  // render the full week even where days are missing or outside the window.
  const weekStarts = new Set<string>();
  for (const dateKey of byDate.keys()) weekStarts.add(weekStartKey(dateKey));

  const weeks: ArchiveWeek[] = [];
  for (const startKey of weekStarts) {
    const days: ArchiveDay[] = [];
    for (let i = 0; i < 7; i++) {
      const dk = addDaysKey(startKey, i);
      days.push(byDate.get(dk) || { dateKey: dk, hasData: false, excluded: false, score: null });
    }
    const scored = days.filter(d => d.score && !d.excluded);
    const avgComposite = scored.length
      ? Math.round((scored.reduce((s, d) => s + (d.score as DayScore).composite, 0) / scored.length) * 10) / 10
      : null;
    weeks.push({
      startKey,
      endKey: addDaysKey(startKey, 6),
      days,
      avgComposite,
      avgLabel: avgComposite !== null ? scoreLabel(avgComposite, mode) : null,
      scoredCount: scored.length,
      loggedCount: days.filter(d => d.hasData).length,
    });
  }

  weeks.sort((a, b) => (a.startKey < b.startKey ? 1 : -1)); // most recent first
  return weeks;
}
