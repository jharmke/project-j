// utils/companionStats.ts
//
// The Companion "stat pack": a curated set of PRE-COMPUTED facts about the user's recent data,
// built for the general Companion assistant. This is the accuracy spine of the data-aware
// Companion. Two hard rules make a Companion number impossible to get wrong:
//   1. REUSE, never reinvent. Every number here comes from the coach's own exclusion-aware loader
//      (loadWindowDays) + goals (buildEngineContext) in smartTipsEngine.ts, so a Companion stat is
//      literally the same computation Smart Coach / EvR run. No new math, no drift.
//   2. The model never types these numbers. It emits a token [[stat:<key>]]; the client substitutes
//      the value from this pack (see AssistantChat). A missing key renders nothing (safe); a wrong
//      value is impossible (the client owns the value).
//
// Exclusion + Vacation Mode: loadWindowDays already DROPS fully-excluded and vacation days before
// any metric is read, so every average/trend here is exclusion-correct by construction.
//
// "today" values come from today's own record (partial, labeled "so far today"); averages and
// trends use the trailing COMPLETE days only (today's incomplete day never skews an average, same
// as the coach). No double dashes in any user-facing display string (project rule).

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  buildEngineContext,
  loadWindowDays,
  computeLoggingStreak,
  type WindowDay,
  type EngineContext,
} from './smartTipsEngine';
import { loadMetricPresence, seedMetricPresenceOnce, type PresenceMetric } from './metricPresence';

export type CompanionStat = {
  key: string;        // token key, e.g. "protein_7d_avg"
  label: string;      // human label, e.g. "protein, last 7 logged days"
  value: number;      // raw numeric (for substitution + the leak monitor)
  display: string;    // formatted string the client substitutes, e.g. "118g"
};

export type CompanionStatPack = {
  stats: CompanionStat[];
  valueMap: Record<string, string>;   // key -> display, for client token substitution
  snapshotText: string;               // the readable block injected into the prompt
};

// ── formatting ──────────────────────────────────────────────────────────────
const r0 = (n: number) => Math.round(n);
const r1 = (n: number) => Math.round(n * 10) / 10;
const commas = (n: number) => r0(n).toLocaleString('en-US');

function fmtHoursFromHours(h: number): string {
  const totalMin = Math.round(h * 60);
  const hh = Math.floor(totalMin / 60);
  const mm = totalMin % 60;
  return mm === 0 ? `${hh}h` : `${hh}h ${mm}m`;
}

// The coach engine's `deepSleepPct` field is actually deep sleep DURATION in milliseconds
// (day.sleepStages.deep), not a percent, so we format it as a duration.
function fmtMsToHm(ms: number): string {
  const totalMin = Math.round(ms / 60000);
  const hh = Math.floor(totalMin / 60);
  const mm = totalMin % 60;
  return hh > 0 ? (mm === 0 ? `${hh}h` : `${hh}h ${mm}m`) : `${mm}m`;
}

// ── aggregation helpers (all exclusion-correct because the input days already are) ──
function pick(days: WindowDay[], sel: (d: WindowDay) => number | null): number[] {
  const out: number[] = [];
  for (const d of days) {
    const v = sel(d);
    if (v !== null && v !== undefined && Number.isFinite(v)) out.push(v);
  }
  return out;
}
function mean(nums: number[]): number | null {
  if (!nums.length) return null;
  return nums.reduce((s, v) => s + v, 0) / nums.length;
}

/**
 * Build the stat pack for the given local day key (YYYY-MM-DD).
 * Returns null-safe: any metric with no data is simply omitted from the pack.
 */
export async function buildCompanionStats(todayKey: string): Promise<CompanionStatPack> {
  const stats: CompanionStat[] = [];
  const add = (key: string, label: string, value: number, display: string) => {
    stats.push({ key, label, value, display });
  };

  let ctx: EngineContext;
  try {
    ctx = await buildEngineContext(todayKey);
  } catch {
    return { stats: [], valueMap: {}, snapshotText: '(No recent data available.)' };
  }
  // goalWeight (the target weight number) lives in pj_profile, NOT the engine context.
  let goalWeight: number | null = null;
  try {
    const raw = await AsyncStorage.getItem('pj_profile');
    if (raw) { const gw = parseFloat(JSON.parse(raw).goalWeight); if (Number.isFinite(gw) && gw > 0) goalWeight = gw; }
  } catch {}
  let workoutState: any = null;
  try {
    const raw = await AsyncStorage.getItem('pj_workout_state');
    workoutState = raw ? JSON.parse(raw) : null;
  } catch {}

  // One load including today (offset 0): today's WindowDay for "so far today", the rest are the
  // trailing complete days for averages/trends. Excluded/vacation days are already dropped.
  let windowIncludingToday: WindowDay[] = [];
  try {
    windowIncludingToday = await loadWindowDays(todayKey, ctx, workoutState, 0);
  } catch {}
  const today = windowIncludingToday.find(d => d.dateKey === todayKey) || null;
  const trailing = windowIncludingToday.filter(d => d.dateKey !== todayKey); // most-recent-first
  const last7 = trailing.slice(0, 7);

  const foodDays = (arr: WindowDay[]) => arr.filter(d => d.hasFoodData);
  const sleepDays = (arr: WindowDay[]) => arr.filter(d => d.sleepScore !== null);
  // Active calories carry the user's burn-accuracy adjustment so they match what the app shows.
  const burnAdj = (raw: number) => raw * (ctx.burnAccuracyPct > 0 ? ctx.burnAccuracyPct / 100 : 1);

  // ── Nutrition: calories + macros (today, 7d avg, goal, delta-to-goal) ──────
  type NutriDef = { key: string; sel: (d: WindowDay) => number; goal: number; unit: 'kcal' | 'g'; name: string };
  const nutri: NutriDef[] = [
    { key: 'calories', sel: d => d.consumed, goal: ctx.calTarget,     unit: 'kcal', name: 'calories' },
    { key: 'protein',  sel: d => d.protein,  goal: ctx.proteinGoalG,  unit: 'g',    name: 'protein' },
    { key: 'carbs',    sel: d => d.carbs,    goal: ctx.carbGoalG,     unit: 'g',    name: 'carbs' },
    { key: 'fat',      sel: d => d.fat,      goal: ctx.fatGoalG,      unit: 'g',    name: 'fat' },
    { key: 'fiber',    sel: d => d.fiber,    goal: ctx.fiberGoal,     unit: 'g',    name: 'fiber' },
  ];
  const unitStr = (v: number, unit: 'kcal' | 'g') => (unit === 'kcal' ? `${commas(v)}` : `${r0(v)}g`);
  for (const m of nutri) {
    if (today && today.hasFoodData) {
      const v = m.sel(today);
      add(`${m.key}_today`, `${m.name} so far today`, v, unitStr(v, m.unit));
    }
    const avg7 = mean(pick(foodDays(last7), m.sel));
    if (avg7 !== null) {
      add(`${m.key}_7d_avg`, `${m.name}, average over last 7 logged days`, avg7, unitStr(avg7, m.unit));
      if (m.goal && m.goal > 0) {
        add(`${m.key}_goal`, `${m.name} daily goal`, m.goal, unitStr(m.goal, m.unit));
        // Calories vs goal is handled separately below because it MUST account for active-calorie
        // burn (effective budget = base target + what you burned). A raw intake-vs-target delta
        // would falsely read "over" on an active day. Macros are pure intake vs goal, so they stay.
        if (m.key !== 'calories') {
          const delta = avg7 - m.goal;
          add(`${m.key}_vs_goal_7d`, `${m.name} 7-day average vs goal (positive is over)`, delta,
            `${delta >= 0 ? '+' : ''}${unitStr(Math.abs(delta), m.unit).replace('+', '')}${delta < 0 ? ' under' : ' over'}`);
        }
      }
    }
  }

  // Calories vs BUDGET (activity-aware). The app's real model is consumed vs (base target + active
  // calories burned), so eating at target on an active day is actually UNDER budget. We compute the
  // net (eaten minus active burn) and the vs-budget delta per day (burn-accuracy adjusted, like the
  // coach's momentum rule), never raw intake vs the flat target.
  const calBudget = (d: WindowDay) => ctx.calTarget + burnAdj(d.rawActive);
  if (today && today.hasFoodData) {
    const netToday = today.consumed - burnAdj(today.rawActive);
    add('calories_net_today', 'net calories so far today (eaten minus active burn)', netToday, commas(netToday));
    const vb = today.consumed - calBudget(today);
    add('calories_vs_budget_today', 'calories today vs your activity-adjusted budget (negative is under budget)', vb,
      `${commas(Math.abs(vb))} ${vb < 0 ? 'under' : 'over'}`);
  }
  const fdays = foodDays(last7);
  const netAvg = mean(fdays.map(d => d.consumed - burnAdj(d.rawActive)));
  if (netAvg !== null) add('calories_net_7d_avg', 'net calories, average over last 7 logged days (eaten minus active burn)', netAvg, commas(netAvg));
  const vbAvg = mean(fdays.map(d => d.consumed - calBudget(d)));
  if (vbAvg !== null) add('calories_vs_budget_7d', 'daily calories vs your activity-adjusted budget, 7-day average (negative is under budget)', vbAvg,
    `${commas(Math.abs(vbAvg))} ${vbAvg < 0 ? 'under' : 'over'}`);

  // Sodium + sugar: 7d average only (no goal in the app model).
  for (const m of [
    { key: 'sodium', sel: (d: WindowDay) => d.sodium, name: 'sodium' },
    { key: 'sugar',  sel: (d: WindowDay) => d.sugar,  name: 'sugar' },
  ]) {
    const avg7 = mean(pick(foodDays(last7), m.sel));
    if (avg7 !== null) add(`${m.key}_7d_avg`, `${m.name}, average over last 7 logged days`, avg7, `${r0(avg7)}mg`);
  }

  // ── Water / steps / active calories (today, 7d avg, goal) ─────────────────
  const water7 = mean(pick(last7, d => d.waterLogged));
  if (today) add('water_today', 'water so far today', today.waterLogged, `${r0(today.waterLogged)} oz`);
  if (water7 !== null) add('water_7d_avg', 'water, average over last 7 days', water7, `${r0(water7)} oz`);
  if (ctx.waterGoal) add('water_goal', 'water daily goal', ctx.waterGoal, `${r0(ctx.waterGoal)} oz`);

  const steps7 = mean(pick(last7, d => (d.steps > 0 ? d.steps : null)));
  if (today && today.steps > 0) add('steps_today', 'steps today', today.steps, commas(today.steps));
  if (steps7 !== null) add('steps_7d_avg', 'steps, average over last 7 days', steps7, commas(steps7));
  if (ctx.stepGoal) add('steps_goal', 'step daily goal', ctx.stepGoal, commas(ctx.stepGoal));

  const active7 = mean(pick(last7, d => (d.rawActive > 0 ? burnAdj(d.rawActive) : null)));
  if (today && today.rawActive > 0) add('activecals_today', 'active calories today', burnAdj(today.rawActive), commas(burnAdj(today.rawActive)));
  if (active7 !== null) add('activecals_7d_avg', 'active calories, average over last 7 days', active7, commas(active7));
  if (ctx.activeCalGoal) add('activecals_goal', 'active calorie daily goal', ctx.activeCalGoal, commas(ctx.activeCalGoal));

  // ── Weight (latest + change over the window + goal) ───────────────────────
  const weighed = trailing.filter(d => d.weight !== null) as (WindowDay & { weight: number })[];
  if (weighed.length) {
    const latest = weighed[0].weight;         // most-recent-first
    add('weight_latest', 'latest logged weight', latest, `${r1(latest)} lbs`);
    if (weighed.length >= 2) {
      const oldest = weighed[weighed.length - 1].weight;
      const change = latest - oldest;
      add('weight_change_recent', `weight change across last ${weighed.length} weigh-ins`, change,
        `${change >= 0 ? '+' : ''}${r1(change)} lbs`);
    }
    if (goalWeight !== null) {
      add('weight_goal', 'goal weight', goalWeight, `${r1(goalWeight)} lbs`);
    }
  }

  // ── Sleep (last night + 7-night averages) ─────────────────────────────────
  // Sleep + recovery are keyed to the WAKE day (today's date key) and are COMPLETE overnight
  // records, unlike the partial "so far today" nutrition/activity that must exclude today. So they
  // must INCLUDE today or they read one night stale (this made Otto report sleep from 2 nights ago
  // while the app showed last night). sleepNights is most-recent-first and includes today; [0]
  // falls back to the prior night automatically if today has no sleep record yet.
  const sleepNights = sleepDays(windowIncludingToday);
  const last7Nights = sleepNights.slice(0, 7);
  const lastNight = sleepNights[0] || null;
  if (lastNight) {
    if (lastNight.sleepScore !== null) add('sleep_score_lastnight', 'last night sleep score', lastNight.sleepScore, `${r0(lastNight.sleepScore)}`);
    if (lastNight.sleepHours !== null) add('sleep_hours_lastnight', 'last night sleep duration', lastNight.sleepHours, fmtHoursFromHours(lastNight.sleepHours));
    if (lastNight.deepSleepPct !== null) add('deep_sleep_lastnight', 'last night deep sleep', lastNight.deepSleepPct, fmtMsToHm(lastNight.deepSleepPct));
  }
  const score7 = mean(pick(last7Nights, d => d.sleepScore));
  if (score7 !== null) add('sleep_score_7d_avg', 'sleep score, average over last 7 nights', score7, `${r0(score7)}`);
  const hours7 = mean(pick(last7Nights, d => d.sleepHours));
  if (hours7 !== null) add('sleep_hours_7d_avg', 'sleep duration, average over last 7 nights', hours7, fmtHoursFromHours(hours7));
  const deep7 = mean(pick(last7Nights, d => d.deepSleepPct));
  if (deep7 !== null) add('deep_sleep_7d_avg', 'deep sleep, average over last 7 nights', deep7, fmtMsToHm(deep7));
  if (ctx.sleepGoal) add('sleep_goal', 'sleep duration goal', ctx.sleepGoal, `${r1(ctx.sleepGoal)}h`);

  // ── Recovery (latest score + signals) ─────────────────────────────────────
  // Recovery is also wake-day-keyed (see the sleep note above), so include today.
  const recNights = windowIncludingToday.filter(d => d.recoveryScore !== null);
  const rec = recNights[0] || null;
  if (rec) {
    if (rec.recoveryScore !== null) add('recovery_score_latest', 'latest recovery score', rec.recoveryScore, `${r0(rec.recoveryScore)}`);
    const sig = rec.recoverySignals;
    if (sig) {
      if (sig.hrv !== null) add('hrv_latest', 'latest overnight HRV', sig.hrv, `${r1(sig.hrv)} ms`);
      if (sig.rhr !== null) add('rhr_latest', 'latest resting heart rate', sig.rhr, `${r0(sig.rhr)} bpm`);
      if (sig.resp !== null) add('resp_latest', 'latest respiratory rate', sig.resp, `${r1(sig.resp)} brpm`);
      if (sig.spo2 !== null) add('spo2_latest', 'latest blood oxygen', sig.spo2, `${r0(sig.spo2)}%`);
    }
  }
  const recAvg7 = mean(pick(recNights.slice(0, 7), d => d.recoveryScore));
  if (recAvg7 !== null) add('recovery_score_7d_avg', 'recovery score, average over last 7 days', recAvg7, `${r0(recAvg7)}`);

  // ── Workouts (count in the last 7 days) ───────────────────────────────────
  const workoutDays = last7.filter(d => d.workoutChecked > 0 || (d.workoutScheduled && d.workoutTotal > 0 && d.workoutChecked === d.workoutTotal)).length;
  add('workouts_7d_count', 'workouts completed in the last 7 days', workoutDays, `${workoutDays}`);

  // ── Logging streak + IF ───────────────────────────────────────────────────
  try {
    const streak = await computeLoggingStreak(todayKey);
    if (streak > 0) add('logging_streak', 'current food logging streak', streak, `${streak} ${streak === 1 ? 'day' : 'days'}`);
  } catch {}
  const ifTarget = (today?.ifTargetHours ?? trailing.find(d => d.ifTargetHours !== null)?.ifTargetHours) ?? null;
  if (ctx.ifEnabled && ifTarget) {
    add('if_target_hours', 'intermittent fasting target window', ifTarget, `${r0(ifTarget)}h`);
  }

  // ── Device data availability (wearable awareness) ─────────────────────────
  // Tell Otto which watch-only metrics this user has NEVER recorded, so instead of
  // dodging ("I don't have that number") it can honestly explain the metric needs a
  // wearable to track. FAIL-OPEN: we only speak up when the presence map shows real
  // signal (at least one metric ever true); an empty/unseeded map stays silent so we
  // can NEVER tell a real wearer they lack a device. Only genuinely device-dependent
  // metrics are listed here (steps come from a phone, sleep score + exercise minutes
  // have manual fallbacks, so those are never flagged).
  let deviceNote = '';
  try {
    await seedMetricPresenceOnce();
    const presence = await loadMetricPresence();
    const anyPresent = Object.values(presence).some(v => v === true);
    if (anyPresent) {
      const deviceOnly: { key: PresenceMetric; name: string }[] = [
        { key: 'recovery', name: 'recovery score' },
        { key: 'hrv', name: 'HRV' },
        { key: 'restingHR', name: 'resting heart rate' },
        { key: 'respiratoryRate', name: 'respiratory rate' },
        { key: 'bloodOxygen', name: 'blood oxygen' },
        { key: 'vo2Max', name: 'VO2 max' },
        { key: 'cardioRecovery', name: 'cardio recovery' },
        { key: 'sleepStages', name: 'sleep stages (deep, REM, core)' },
        { key: 'activeCals', name: 'active calories' },
      ];
      const missing = deviceOnly.filter(m => presence[m.key] !== true).map(m => m.name);
      if (missing.length) {
        deviceNote =
          '\n\nDEVICE DATA AVAILABILITY (accuracy guard): This user has never recorded the ' +
          'following, which require a smartwatch or fitness tracker: ' + missing.join(', ') + '. ' +
          'If they ask about any of these, warmly and plainly explain it needs a smartwatch or ' +
          'fitness tracker to track (worn overnight for recovery and sleep stages), instead of ' +
          'implying the app is broken or that you cannot access their data. Do NOT tell them to ' +
          'buy or go get a device. Do NOT offer or promise any other metric unless it actually ' +
          'appears in the snapshot above; if nothing relevant is listed, do not force a pivot.';
      }
    }
  } catch {}

  // ── Assemble outputs ──────────────────────────────────────────────────────
  const valueMap: Record<string, string> = {};
  for (const s of stats) valueMap[s.key] = s.display;

  const snapshotText = (stats.length
    ? stats.map(s => `- ${s.key}: ${s.label} = ${s.display}`).join('\n')
    : '(No recent logged data available for this user right now.)') + deviceNote;

  return { stats, valueMap, snapshotText };
}
