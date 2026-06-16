// utils/smartTipsEngine.ts
// Core rules engine for Smart Tips. Loads the rolling window, evaluates all 40
// rules, applies Mindful suppression and cooldowns, ranks candidates, and stores
// the top 5 to pj_smart_tips. No UI. No navigation. Pure compute + storage.
// Gating (blur/lock for free tier) is render-time in the view layer; see TIPS_GATED.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { storageSet } from './storage';
import { GOAL_DEFICITS, loadCalorieTargets } from './calorieTarget';
import { calcSleepScore } from './sleepScore';
import { RULE_COPY, pickVariant, fillSlots } from './smartTipsCopy';

// ── Config ────────────────────────────────────────────────────────────────────
export const TIPS_GATED = false;          // TestFlight: gate off. Flip true pre-launch.
const RATE_LIMIT_PER_DAY = 0;            // 0 = disabled (parked until launch)
const TOPIC_LEDGER_TTL_DAYS = 14;
const SMART_TIPS_KEY = 'pj_smart_tips';
const MAX_ACTIVE_TIPS = 5;
const WINDOW_SIZE = 14;                  // load 14 days; rules use 5, 7, or 14 slices

const CROSS_SIGNAL_RULES = new Set([
  'cross_protein_sleep', 'cross_sodium_scale', 'cross_high_burn_overeating',
  'cross_sleep_intake', 'cross_workout_intake', 'cross_steps_sleep', 'cross_fiber_calorie',
]);
export function isCrossSignalRule(ruleId: string): boolean {
  return CROSS_SIGNAL_RULES.has(ruleId);
}

const PACE_LABELS: Record<string, string> = {
  lose_2: 'Lose 2 lb/wk', lose_1_5: 'Lose 1.5 lb/wk', lose_1: 'Lose 1 lb/wk',
  lose_0_5: 'Lose 0.5 lb/wk', maintain: 'Maintain',
  gain_0_5: 'Gain 0.5 lb/wk', gain_1: 'Gain 1 lb/wk',
};

// ── Types ─────────────────────────────────────────────────────────────────────
export type SmartTipTier = 'urgent' | 'pattern' | 'insight';
export type GoalBucket = 'lose' | 'maintain' | 'gain';

export interface StoredTip {
  id: string;
  ruleId: string;
  tier: SmartTipTier;
  title: string;
  body: string;
  firedDate: string;
  goalType: string;
  positive: boolean;
  surfacedOn: string[];
  topic: string;
}

export interface SmartTipsStore {
  activeTips: StoredTip[];
  recentHistory: StoredTip[];
  cooldowns: Record<string, string>;
  variantHistory: Record<string, number>;
  lastComputed: string;
  topicLedger: Record<string, { date: string; surface: string }>;
}

interface WindowDay {
  dateKey: string;
  consumed: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
  sodium: number;
  sugar: number;
  waterLogged: number;
  rawActive: number;
  steps: number;
  weight: number | null;
  sleepScore: number | null;
  sleepHours: number | null;
  sleepBedTimeMin: number | null;
  deepSleepPct: number | null;
  bmr: number;
  workoutChecked: number;
  workoutTotal: number;
  workoutScheduled: boolean;
  ifStart: number | null;
  ifEnd: number | null;
  ifTargetHours: number | null;
  isLoggedDay: boolean;
  hasFoodData: boolean;
  totalEntries: number;
  fiberEntries: number;
  sodiumEntries: number;
  sugarEntries: number;
  hasManualSleep: boolean;
  isWeekend: boolean;
  // Recovery: the frozen daily score + that night's overnight signals (persisted with
  // the morning snapshot). Null when no watch data that day. Used by the Recovery Coach.
  recoveryScore: number | null;
  recoverySignals: { hrv: number | null; rhr: number | null; resp: number | null; spo2: number | null } | null;
  excluded: boolean;
}

interface EngineContext {
  bmr: number;
  calTarget: number;
  paceTarget: number;
  burnAccuracyPct: number;
  proteinGoalG: number;
  waterGoal: number;
  activeCalGoal: number;
  stepGoal: number;
  sleepGoal: number;
  weightGoal: string;
  goalBucket: GoalBucket;
  styleMode: string;
  isMindful: boolean;
  mindfulGrowthAreas: boolean;
  ifEnabled: boolean;
  fiberGoal: number;
  paceLabel: string;
  todayKey: string;
}

interface CandidateTip {
  ruleId: string;
  tier: SmartTipTier;
  title: string;
  body: string;
  positive: boolean;
  variantIndex: number;
  goalType: string;
  topic: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function goalBucket(weightGoal: string): GoalBucket {
  if (weightGoal.startsWith('lose')) return 'lose';
  if (weightGoal.startsWith('gain')) return 'gain';
  return 'maintain';
}

function avg(arr: number[]): number {
  if (!arr.length) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const mean = avg(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - mean) ** 2, 0) / arr.length);
}

function simpleHash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return h >>> 0;
}

function todayDateKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function keyForOffset(todayKey: string, offset: number): string {
  const [y, m, d] = todayKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - offset);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

function isWeekend(dateKey: string): boolean {
  const [y, m, d] = dateKey.split('-').map(Number);
  const day = new Date(y, m - 1, d).getDay();
  return day === 0 || day === 6;
}

function parseBedTimeMin(val: any): number | null {
  if (val == null) return null;
  if (typeof val === 'number' && val >= 0 && val <= 1440) return val;
  if (typeof val === 'string') {
    const iso = new Date(val);
    if (!isNaN(iso.getTime())) return iso.getHours() * 60 + iso.getMinutes();
    const parts = val.split(':');
    if (parts.length >= 2) {
      const h = parseInt(parts[0]), mn = parseInt(parts[1]);
      if (!isNaN(h) && !isNaN(mn)) return h * 60 + mn;
    }
  }
  return null;
}

function parseIfTargetHours(method: string | null): number | null {
  if (!method) return null;
  const match = method.match(/^(\d+)/);
  return match ? parseInt(match[1]) : null;
}

function getEntryNutrient(entry: any, name: string): number {
  const n = entry.foodNutrients?.find((fn: any) => fn.nutrientName === name);
  if (!n) return 0;
  let scale: number;
  if (entry.fsId) {
    scale = (entry.calPer100g && entry.calPer100g > 0) ? (entry.cal / entry.calPer100g) : 0;
  } else {
    const sg = entry.servingGrams;
    const servingCal = sg && entry.calPer100g > 0 ? entry.calPer100g * sg / 100 : 0;
    scale = servingCal > 0 ? entry.cal / servingCal : 0;
  }
  return (n.value || 0) * scale;
}

function computeNet(day: WindowDay, burnAccuracyPct: number): number {
  const adjusted = Math.round(day.rawActive * burnAccuracyPct / 100);
  return Math.round(day.consumed - adjusted - day.bmr);
}

function dayNameFromKey(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(y, m - 1, d).getDay()];
}

function uniqueId(): string {
  return `tip_${Date.now()}_${simpleHash(Math.random().toString()).toString(36)}`;
}

function pruneLedger(ledger: Record<string, { date: string; surface: string }>, todayKey: string): Record<string, { date: string; surface: string }> {
  const cutoff = keyForOffset(todayKey, TOPIC_LEDGER_TTL_DAYS);
  const pruned: Record<string, { date: string; surface: string }> = {};
  for (const [topic, entry] of Object.entries(ledger)) {
    if (entry.date >= cutoff) pruned[topic] = entry;
  }
  return pruned;
}

function cooldownDays(tier: SmartTipTier): number {
  return tier === 'urgent' ? 3 : 5;
}

function isCooledDown(ruleId: string, tier: SmartTipTier, store: SmartTipsStore, todayKey: string): boolean {
  const lastFired = store.cooldowns[ruleId];
  if (!lastFired) return false;
  const cdDays = cooldownDays(tier);
  const cutoff = keyForOffset(todayKey, cdDays);
  return lastFired >= cutoff;
}

// ── Storage ───────────────────────────────────────────────────────────────────

export async function loadSmartTips(): Promise<SmartTipsStore | null> {
  try {
    const raw = await AsyncStorage.getItem(SMART_TIPS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SmartTipsStore;
  } catch {
    return null;
  }
}

const EMPTY_STORE: SmartTipsStore = {
  activeTips: [], recentHistory: [], cooldowns: {}, variantHistory: {}, lastComputed: '', topicLedger: {},
};

async function saveSmartTipsStore(store: SmartTipsStore): Promise<void> {
  try { await storageSet(SMART_TIPS_KEY, JSON.stringify(store)); } catch {}
}

// ── Window loading ────────────────────────────────────────────────────────────

async function loadWindowDays(
  todayKey: string,
  ctx: EngineContext,
  workoutState: any,
  startOffset: number = 1,
): Promise<WindowDay[]> {
  // Default startOffset 1 = yesterday back (today's food/activity is incomplete at
  // app open, so the general coaches exclude it). The Sleep Coach passes 0 to
  // INCLUDE last night, whose sleep is complete and is the whole point of the hub.
  const keys: string[] = [];
  for (let i = startOffset; i < startOffset + WINDOW_SIZE; i++) keys.push(`pj_${keyForOffset(todayKey, i)}`);

  let pairs: readonly [string, string | null][] = [];
  try { pairs = await AsyncStorage.multiGet(keys); } catch { return []; }

  const days: WindowDay[] = [];
  for (const [fullKey, raw] of pairs) {
    if (!raw) continue;
    const dateKey = fullKey.slice(3);
    let day: any;
    try { day = JSON.parse(raw); } catch { continue; }

    const entries: any[] = Array.isArray(day.entries) ? day.entries : [];
    let consumed = 0, protein = 0, fat = 0, carbs = 0;
    let fiber = 0, sodium = 0, sugar = 0;
    let fiberEntries = 0, sodiumEntries = 0, sugarEntries = 0;

    for (const e of entries) {
      consumed += e.cal || 0;
      protein += e.protein || 0;
      fat += e.fat || 0;
      carbs += e.carbs || 0;
      const f = getEntryNutrient(e, 'Fiber, total dietary');
      const s = getEntryNutrient(e, 'Sodium, Na');
      const su = getEntryNutrient(e, 'Sugars, total');
      fiber += f; sodium += s; sugar += su;
      if (f > 0) fiberEntries++;
      if (s > 0) sodiumEntries++;
      if (su > 0) sugarEntries++;
    }

    const sleepHours: number | null = day.sleepOverride ?? day.sleepHours ?? null;
    let sleepScore: number | null = null;
    if (sleepHours) {
      const result = calcSleepScore(
        sleepHours, day.sleepStages ?? null, ctx.sleepGoal,
        day.sleepFeelRating ?? null, !!day.sleepOverride, day.sleepConsistencyPts ?? 0,
      );
      sleepScore = result.score;
    }

    const deepSleepPct: number | null = (day.sleepStages?.deep != null)
      ? day.sleepStages.deep : null;

    const rawActive = day.activeCalories || day.caloriesBurned || 0;
    const bmr: number = day.goalSnapshot?.bmr || ctx.bmr;

    const dayName = dayNameFromKey(dateKey);
    const template = workoutState.programs?.[dateKey] ?? workoutState.weeklyTemplate?.[dayName];
    const dayType: string = template?.type ?? 'unassigned';
    // Lift-only: the completion-rate / "ended short" rule (ruleWorkoutLow) is the ONLY
    // consumer of workoutScheduled. Cardio days (incl. auto-synced Apple Health cardio,
    // which logs but never sets the manual cardioComplete flag) were being read as 0%
    // complete, firing a false "scheduled sessions ended short" insight. Cardio is
    // binary, not a completion rate, so only planned lift sessions count here.
    const workoutScheduled = dayType === 'lift';
    const exercises: any[] = Array.isArray(template?.exercises) ? template.exercises : [];
    const checks = workoutState.checks?.[dateKey] ?? {};
    const workoutChecked = exercises.filter((ex: any) => checks[ex.id]).length + (workoutState.cardioComplete?.[dateKey] ? 1 : 0);
    const workoutTotal = exercises.length + (dayType === 'cardio' ? 1 : 0);

    const ifStart = day.ifStart ? new Date(day.ifStart).getTime() : null;
    const ifEnd = day.ifEnd ? new Date(day.ifEnd).getTime() : null;
    const ifMethod = day.ifMethod ?? null;

    const hasFoodData = entries.length > 0;
    const hasManualSleep = !!day.sleepOverride;
    const workoutLogged = workoutChecked > 0;
    const isLoggedDay = hasFoodData || workoutLogged || hasManualSleep;

    days.push({
      dateKey,
      consumed: Math.round(consumed),
      protein: Math.round(protein * 10) / 10,
      fat: Math.round(fat * 10) / 10,
      carbs: Math.round(carbs * 10) / 10,
      fiber: Math.round(fiber * 10) / 10,
      sodium: Math.round(sodium),
      sugar: Math.round(sugar * 10) / 10,
      waterLogged: typeof day.water === 'number' ? day.water : 0,
      rawActive,
      steps: day.steps || 0,
      weight: day.weight ?? null,
      sleepScore,
      sleepHours,
      sleepBedTimeMin: parseBedTimeMin(day.sleepBedTime),
      deepSleepPct,
      bmr,
      workoutChecked,
      workoutTotal,
      workoutScheduled,
      ifStart,
      ifEnd,
      ifTargetHours: parseIfTargetHours(ifMethod),
      isLoggedDay,
      hasFoodData,
      totalEntries: entries.length,
      fiberEntries,
      sodiumEntries,
      sugarEntries,
      hasManualSleep,
      isWeekend: isWeekend(dateKey),
      recoveryScore: (typeof day.recoveryScore === 'number' && Number.isFinite(day.recoveryScore)) ? day.recoveryScore : null,
      recoverySignals: (day.recoverySignals && typeof day.recoverySignals === 'object') ? {
        hrv: typeof day.recoverySignals.hrv === 'number' ? day.recoverySignals.hrv : null,
        rhr: typeof day.recoverySignals.rhr === 'number' ? day.recoverySignals.rhr : null,
        resp: typeof day.recoverySignals.resp === 'number' ? day.recoverySignals.resp : null,
        spo2: typeof day.recoverySignals.spo2 === 'number' ? day.recoverySignals.spo2 : null,
      } : null,
      excluded: !!day.excluded,
    });
  }

  return days;
}

// ── Engine context ────────────────────────────────────────────────────────────

async function buildEngineContext(todayKey: string): Promise<EngineContext> {
  let profile: any = {}, settings: any = {};
  try { const r = await AsyncStorage.getItem('pj_profile'); profile = r ? JSON.parse(r) : {}; } catch {}
  try { const r = await AsyncStorage.getItem('pj_settings'); settings = r ? JSON.parse(r) : {}; } catch {}

  const { bmr, calTarget, paceDeficit } = await loadCalorieTargets(todayKey);
  const weightGoal: string = profile.weightGoal || 'maintain';
  const paceTarget: number = GOAL_DEFICITS[weightGoal] ?? 0;
  const burnAccuracyPct: number = settings.burnAccuracyPct ?? 100;
  const styleMode: string = settings.styleMode ?? 'balanced';
  const isMindful = styleMode === 'mindful';
  const mindfulGrowthAreas: boolean = settings.mindfulGrowthAreas === true;

  let proteinGoalG = 0;
  if (profile.macroMode === 'fixed' && profile.macroProteinG) {
    proteinGoalG = parseFloat(profile.macroProteinG) || 0;
  } else if (profile.macroProteinPct && calTarget > 0) {
    proteinGoalG = Math.round(((parseFloat(profile.macroProteinPct) || 35) / 100) * calTarget / 4);
  }

  const fiberGoal = profile.sex === 'male' ? 38 : 25;

  return {
    bmr,
    calTarget,
    paceTarget,
    burnAccuracyPct,
    proteinGoalG,
    waterGoal: parseFloat(profile.waterGoal) || 0,
    activeCalGoal: parseInt(profile.activeCalGoal) || 500,
    stepGoal: parseInt(profile.stepGoal) || 10000,
    sleepGoal: parseFloat(profile.sleepGoal) || 7,
    weightGoal,
    goalBucket: goalBucket(weightGoal),
    styleMode,
    isMindful,
    mindfulGrowthAreas,
    ifEnabled: !!settings.ifEnabled || !!settings.ifMethod,
    fiberGoal,
    paceLabel: PACE_LABELS[weightGoal] ?? 'Maintain',
    todayKey,
  };
}

// ── Logging gate helpers ──────────────────────────────────────────────────────

function loggedDaysInWindow(days: WindowDay[]): number {
  return days.filter(d => d.isLoggedDay).length;
}

function meetsLoggingGate(days: WindowDay[], required: number): boolean {
  return loggedDaysInWindow(days) >= required;
}

interface DensityFields {
  daysLogged: number;
  daysWithNutritionData: number;
  daysWithActivityData: number;
  daysWithSleepData: number;
}

function computeDensityFields(days: WindowDay[]): DensityFields {
  return {
    daysLogged: days.filter(d => d.isLoggedDay).length,
    daysWithNutritionData: days.filter(d => d.hasFoodData).length,
    daysWithActivityData: days.filter(d => d.rawActive > 0 || d.steps > 0).length,
    daysWithSleepData: days.filter(d => d.sleepHours !== null && d.sleepHours > 0).length,
  };
}

// Loads all days in a fixed date range (startDate..endDate inclusive) using the
// same WindowDay shape as loadWindowDays. Used by weekly and monthly packet builders.
async function loadWindowDayRange(
  startDate: string,
  endDate: string,
  ctx: EngineContext,
  workoutState: any,
): Promise<WindowDay[]> {
  const [sy, sm, sd] = startDate.split('-').map(Number);
  const [ey, em, ed] = endDate.split('-').map(Number);
  const start = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);

  const keys: string[] = [];
  for (const dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
    const dk = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    keys.push(`pj_${dk}`);
  }

  let pairs: readonly [string, string | null][] = [];
  try { pairs = await AsyncStorage.multiGet(keys); } catch { return []; }

  const days: WindowDay[] = [];
  for (const [fullKey, raw] of pairs) {
    if (!raw) continue;
    const dateKey = fullKey.slice(3);
    let day: any;
    try { day = JSON.parse(raw); } catch { continue; }

    const entries: any[] = Array.isArray(day.entries) ? day.entries : [];
    let consumed = 0, protein = 0, fat = 0, carbs = 0;
    let fiber = 0, sodium = 0, sugar = 0;
    let fiberEntries = 0, sodiumEntries = 0, sugarEntries = 0;

    for (const e of entries) {
      consumed += e.cal || 0;
      protein += e.protein || 0;
      fat += e.fat || 0;
      carbs += e.carbs || 0;
      const f = getEntryNutrient(e, 'Fiber, total dietary');
      const s = getEntryNutrient(e, 'Sodium, Na');
      const su = getEntryNutrient(e, 'Sugars, total');
      fiber += f; sodium += s; sugar += su;
      if (f > 0) fiberEntries++;
      if (s > 0) sodiumEntries++;
      if (su > 0) sugarEntries++;
    }

    const sleepHours: number | null = day.sleepOverride ?? day.sleepHours ?? null;
    let sleepScore: number | null = null;
    if (sleepHours) {
      const result = calcSleepScore(
        sleepHours, day.sleepStages ?? null, ctx.sleepGoal,
        day.sleepFeelRating ?? null, !!day.sleepOverride, day.sleepConsistencyPts ?? 0,
      );
      sleepScore = result.score;
    }

    const deepSleepPct: number | null = (day.sleepStages?.deep != null)
      ? day.sleepStages.deep : null;

    const rawActive = day.activeCalories || day.caloriesBurned || 0;
    const bmr: number = day.goalSnapshot?.bmr || ctx.bmr;

    const dayName = dayNameFromKey(dateKey);
    const template = workoutState.programs?.[dateKey] ?? workoutState.weeklyTemplate?.[dayName];
    const dayType: string = template?.type ?? 'unassigned';
    // Lift-only: the completion-rate / "ended short" rule (ruleWorkoutLow) is the ONLY
    // consumer of workoutScheduled. Cardio days (incl. auto-synced Apple Health cardio,
    // which logs but never sets the manual cardioComplete flag) were being read as 0%
    // complete, firing a false "scheduled sessions ended short" insight. Cardio is
    // binary, not a completion rate, so only planned lift sessions count here.
    const workoutScheduled = dayType === 'lift';
    const exercises: any[] = Array.isArray(template?.exercises) ? template.exercises : [];
    const checks = workoutState.checks?.[dateKey] ?? {};
    const workoutChecked = exercises.filter((ex: any) => checks[ex.id]).length + (workoutState.cardioComplete?.[dateKey] ? 1 : 0);
    const workoutTotal = exercises.length + (dayType === 'cardio' ? 1 : 0);

    const ifStart = day.ifStart ? new Date(day.ifStart).getTime() : null;
    const ifEnd = day.ifEnd ? new Date(day.ifEnd).getTime() : null;
    const ifMethod = day.ifMethod ?? null;

    const hasFoodData = entries.length > 0;
    const hasManualSleep = !!day.sleepOverride;
    const workoutLogged = workoutChecked > 0;
    const isLoggedDay = hasFoodData || workoutLogged || hasManualSleep;

    days.push({
      dateKey,
      consumed: Math.round(consumed),
      protein: Math.round(protein * 10) / 10,
      fat: Math.round(fat * 10) / 10,
      carbs: Math.round(carbs * 10) / 10,
      fiber: Math.round(fiber * 10) / 10,
      sodium: Math.round(sodium),
      sugar: Math.round(sugar * 10) / 10,
      waterLogged: typeof day.water === 'number' ? day.water : 0,
      rawActive,
      steps: day.steps || 0,
      weight: day.weight ?? null,
      sleepScore,
      sleepHours,
      sleepBedTimeMin: parseBedTimeMin(day.sleepBedTime),
      deepSleepPct,
      bmr,
      workoutChecked,
      workoutTotal,
      workoutScheduled,
      ifStart,
      ifEnd,
      ifTargetHours: parseIfTargetHours(ifMethod),
      isLoggedDay,
      hasFoodData,
      totalEntries: entries.length,
      fiberEntries,
      sodiumEntries,
      sugarEntries,
      hasManualSleep,
      isWeekend: isWeekend(dateKey),
      recoveryScore: (typeof day.recoveryScore === 'number' && Number.isFinite(day.recoveryScore)) ? day.recoveryScore : null,
      recoverySignals: (day.recoverySignals && typeof day.recoverySignals === 'object') ? {
        hrv: typeof day.recoverySignals.hrv === 'number' ? day.recoverySignals.hrv : null,
        rhr: typeof day.recoverySignals.rhr === 'number' ? day.recoverySignals.rhr : null,
        resp: typeof day.recoverySignals.resp === 'number' ? day.recoverySignals.resp : null,
        spo2: typeof day.recoverySignals.spo2 === 'number' ? day.recoverySignals.spo2 : null,
      } : null,
      excluded: !!day.excluded,
    });
  }

  return days;
}

// ── Rule: pick body copy ──────────────────────────────────────────────────────

function pickBody(
  ruleId: string,
  poolKey: string,
  store: SmartTipsStore,
  slots: Record<string, string | number> = {},
  useMindful = false,
): { body: string; variantIndex: number } {
  const rule = RULE_COPY[ruleId];
  if (!rule) return { body: '', variantIndex: 0 };
  const pool = useMindful && rule.mindful.length > 0
    ? rule.mindful
    : (rule.db[poolKey] ?? rule.db['insight_all'] ?? rule.db['pattern'] ?? []);
  const lastIndex = store.variantHistory[ruleId];
  const { text, index } = pickVariant(pool, lastIndex);
  return { body: fillSlots(text, slots), variantIndex: index };
}

function makeTip(
  ruleId: string,
  tier: SmartTipTier,
  positive: boolean,
  poolKey: string,
  ctx: EngineContext,
  store: SmartTipsStore,
  slots: Record<string, string | number> = {},
): CandidateTip | null {
  const rule = RULE_COPY[ruleId];
  if (!rule) return null;
  const useMindful = ctx.isMindful && (positive || ctx.mindfulGrowthAreas);
  const { body, variantIndex } = pickBody(ruleId, poolKey, store, slots, useMindful);
  if (!body) return null;
  return {
    ruleId, tier, title: rule.title, body,
    positive, variantIndex, goalType: ctx.weightGoal, topic: ruleId.split('_')[0],
  };
}

// ── NUTRITION RULES ───────────────────────────────────────────────────────────

function ruleNetAbovePace(w7: WindowDay[], w5: WindowDay[], ctx: EngineContext, store: SmartTipsStore): CandidateTip | null {
  if (ctx.goalBucket === 'gain') return null;
  if (ctx.bmr === 0) return null;

  const { paceTarget, burnAccuracyPct } = ctx;

  function qualifyDays(days: WindowDay[], threshold: number): WindowDay[] {
    return days.filter(d => {
      if (!d.hasFoodData) return false;
      if (d.consumed < 0.5 * d.bmr) return false;
      const net = computeNet(d, burnAccuracyPct);
      if (net > paceTarget + 900) return false;
      return net > paceTarget + threshold;
    });
  }

  const patternGoalKey = `pattern_${ctx.goalBucket}`;

  const urgentQual = qualifyDays(w5, 500);
  if (urgentQual.length >= 3 && meetsLoggingGate(w5, 4)) {
    return makeTip('net_above_pace', 'urgent', false, patternGoalKey, ctx, store, { days: urgentQual.length, paceLabel: ctx.paceLabel });
  }

  const patternQual = qualifyDays(w7, 200);
  if (patternQual.length >= 5 && meetsLoggingGate(w7, 6)) {
    return makeTip('net_above_pace', 'pattern', false, patternGoalKey, ctx, store, { days: patternQual.length, paceLabel: ctx.paceLabel });
  }

  return null;
}

function ruleNetBelowPace(w7: WindowDay[], w5: WindowDay[], ctx: EngineContext, store: SmartTipsStore): CandidateTip | null {
  if (ctx.goalBucket === 'lose') return null;
  if (ctx.bmr === 0) return null;

  const { paceTarget, burnAccuracyPct } = ctx;

  function qualifyDays(days: WindowDay[], threshold: number): WindowDay[] {
    return days.filter(d => {
      if (!d.hasFoodData) return false;
      if (d.consumed < 0.5 * d.bmr) return false;
      const net = computeNet(d, burnAccuracyPct);
      return net < paceTarget - threshold;
    });
  }

  const patternGoalKey = `pattern_${ctx.goalBucket}`;
  const urgentGoalKey = `urgent_${ctx.goalBucket}`;

  if (ctx.goalBucket === 'gain') {
    const urgentQual = qualifyDays(w5, 500);
    if (urgentQual.length >= 3 && meetsLoggingGate(w5, 4)) {
      return makeTip('net_below_pace', 'urgent', false, urgentGoalKey, ctx, store, { days: urgentQual.length });
    }
  }

  const patternQual = qualifyDays(w7, 200);
  if (patternQual.length >= 5 && meetsLoggingGate(w7, 6)) {
    return makeTip('net_below_pace', 'pattern', false, patternGoalKey, ctx, store, { days: patternQual.length });
  }

  return null;
}

function ruleCalSmallGap(w7: WindowDay[], ctx: EngineContext, store: SmartTipsStore): CandidateTip | null {
  if (ctx.goalBucket !== 'lose') return null;
  if (ctx.bmr === 0) return null;
  if (!meetsLoggingGate(w7, 6)) return null;

  const { paceTarget, burnAccuracyPct } = ctx;
  const gapDays = w7.filter(d => {
    if (!d.hasFoodData || d.consumed < 0.5 * d.bmr) return false;
    const net = computeNet(d, burnAccuracyPct);
    return net > paceTarget + 50 && net < paceTarget + 250;
  });
  if (gapDays.length < 5) return null;

  const avgGap = Math.round(avg(gapDays.map(d => computeNet(d, burnAccuracyPct) - paceTarget)));
  return makeTip('cal_small_gap', 'pattern', false, 'pattern_lose', ctx, store, { gap: avgGap });
}

function ruleCalOutlierWeek(w7: WindowDay[], ctx: EngineContext, store: SmartTipsStore): CandidateTip | null {
  if (ctx.goalBucket === 'gain') return null;
  if (ctx.bmr === 0) return null;

  const { paceTarget, burnAccuracyPct } = ctx;
  const foodDays = w7.filter(d => d.hasFoodData && d.consumed > 0.5 * d.bmr);
  if (foodDays.length < 6) return null;

  const outliers = foodDays.filter(d => computeNet(d, burnAccuracyPct) > paceTarget + 900);
  if (outliers.length !== 1) return null;
  const onTrack = foodDays.filter(d => computeNet(d, burnAccuracyPct) <= paceTarget + 100);
  if (onTrack.length < 5) return null;

  return makeTip('cal_outlier_week', 'insight', false, 'insight_all', ctx, store, { days: onTrack.length });
}

function ruleProteinUnder(w7: WindowDay[], w5: WindowDay[], ctx: EngineContext, store: SmartTipsStore): CandidateTip | null {
  if (ctx.proteinGoalG <= 0) return null;
  const { proteinGoalG } = ctx;

  const urgentQual = w5.filter(d => d.hasFoodData && d.protein < proteinGoalG * 0.5);
  if (urgentQual.length >= 3 && meetsLoggingGate(w5, 4)) {
    return makeTip('protein_under', 'urgent', false, 'urgent', ctx, store, { goal: Math.round(proteinGoalG), days: urgentQual.length });
  }

  const patternQual = w7.filter(d => d.hasFoodData && d.protein < proteinGoalG * 0.8);
  if (patternQual.length >= 4 && meetsLoggingGate(w7, 6)) {
    return makeTip('protein_under', 'pattern', false, 'pattern', ctx, store, { goal: Math.round(proteinGoalG), days: patternQual.length });
  }

  return null;
}

function ruleProteinHigh(w7: WindowDay[], ctx: EngineContext, store: SmartTipsStore): CandidateTip | null {
  if (ctx.proteinGoalG <= 0) return null;
  if (!meetsLoggingGate(w7, 6)) return null;
  const days = w7.filter(d => d.hasFoodData && d.protein > ctx.proteinGoalG * 1.1);
  if (days.length < 5) return null;
  return makeTip('protein_high', 'insight', true, 'insight_all', ctx, store, { days: days.length });
}

function ruleWaterUnder(w7: WindowDay[], w5: WindowDay[], ctx: EngineContext, store: SmartTipsStore): CandidateTip | null {
  if (ctx.waterGoal <= 0) return null;
  const { waterGoal } = ctx;

  const urgentQual = w5.filter(d => d.isLoggedDay && d.waterLogged < waterGoal * 0.5);
  if (urgentQual.length >= 3 && meetsLoggingGate(w5, 4)) {
    return makeTip('water_under', 'urgent', false, 'urgent', ctx, store, { goal: Math.round(waterGoal) });
  }

  const patternQual = w7.filter(d => d.isLoggedDay && d.waterLogged < waterGoal * 0.7);
  if (patternQual.length >= 5 && meetsLoggingGate(w7, 6)) {
    return makeTip('water_under', 'pattern', false, 'pattern', ctx, store, { goal: Math.round(waterGoal) });
  }

  return null;
}

function ruleWaterHigh(w7: WindowDay[], ctx: EngineContext, store: SmartTipsStore): CandidateTip | null {
  if (ctx.waterGoal <= 0) return null;
  if (!meetsLoggingGate(w7, 6)) return null;
  const days = w7.filter(d => d.isLoggedDay && d.waterLogged >= ctx.waterGoal);
  if (days.length < 6) return null;
  return makeTip('water_high', 'insight', true, 'insight_all', ctx, store, { days: days.length });
}

function ruleFiberLow(w7: WindowDay[], ctx: EngineContext, store: SmartTipsStore): CandidateTip | null {
  if (!meetsLoggingGate(w7, 6)) return null;
  const foodDays = w7.filter(d => d.hasFoodData);
  const totalE = foodDays.reduce((s, d) => s + d.totalEntries, 0);
  const fiberE = foodDays.reduce((s, d) => s + d.fiberEntries, 0);
  if (totalE < 1 || fiberE / totalE < 0.6) return null;
  const lowDays = foodDays.filter(d => d.fiber < ctx.fiberGoal * 0.4);
  if (lowDays.length < 5) return null;
  return makeTip('fiber_low', 'pattern', false, 'pattern', ctx, store, { goal: ctx.fiberGoal });
}

function ruleSodiumHigh(w7: WindowDay[], w5: WindowDay[], ctx: EngineContext, store: SmartTipsStore): CandidateTip | null {
  function sodiumGate(days: WindowDay[]): boolean {
    const totalE = days.reduce((s, d) => s + d.totalEntries, 0);
    const sodiumE = days.reduce((s, d) => s + d.sodiumEntries, 0);
    return totalE > 0 && sodiumE / totalE >= 0.6;
  }

  if (sodiumGate(w5)) {
    const urgentQual = w5.filter(d => d.hasFoodData && d.sodium > 4600);
    if (urgentQual.length >= 3 && meetsLoggingGate(w5, 4)) {
      return makeTip('sodium_high', 'urgent', false, 'urgent', ctx, store, { threshold: 4600, days: urgentQual.length });
    }
  }

  if (sodiumGate(w7)) {
    const patternQual = w7.filter(d => d.hasFoodData && d.sodium > 3450);
    if (patternQual.length >= 5 && meetsLoggingGate(w7, 6)) {
      return makeTip('sodium_high', 'pattern', false, 'pattern', ctx, store, { threshold: 3450, days: patternQual.length });
    }
  }

  return null;
}

function ruleSugarHigh(w7: WindowDay[], ctx: EngineContext, store: SmartTipsStore): CandidateTip | null {
  if (ctx.goalBucket === 'gain') return null;
  if (!meetsLoggingGate(w7, 6)) return null;
  const foodDays = w7.filter(d => d.hasFoodData);
  const totalE = foodDays.reduce((s, d) => s + d.totalEntries, 0);
  const sugarE = foodDays.reduce((s, d) => s + d.sugarEntries, 0);
  if (totalE < 1 || sugarE / totalE < 0.6) return null;
  const highDays = foodDays.filter(d => d.sugar > 75);
  if (highDays.length < 5) return null;
  return makeTip('sugar_high', 'pattern', false, 'pattern', ctx, store);
}

function ruleCalGoalHit(w7: WindowDay[], ctx: EngineContext, store: SmartTipsStore): CandidateTip | null {
  if (ctx.bmr === 0) return null;
  if (!meetsLoggingGate(w7, 6)) return null;
  const hitDays = w7.filter(d => {
    if (!d.hasFoodData) return false;
    const net = computeNet(d, ctx.burnAccuracyPct);
    const t = ctx.paceTarget;
    if (t < 0) return net <= t + 150;
    if (t > 0) return net >= t - 150;
    return Math.abs(net) <= 150;
  });
  if (hitDays.length < 6) return null;
  const poolKey = ctx.isMindful ? 'insight_all' : 'insight_all';
  return makeTip('cal_goal_hit', 'insight', true, poolKey, ctx, store, { days: hitDays.length });
}

// ── SLEEP RULES ───────────────────────────────────────────────────────────────

function ruleSleepScoreLow(w7: WindowDay[], w5: WindowDay[], ctx: EngineContext, store: SmartTipsStore): CandidateTip | null {
  const sleepDays5 = w5.filter(d => d.sleepScore !== null);
  if (sleepDays5.length >= 3) {
    const poor = sleepDays5.filter(d => d.sleepScore! < 50);
    if (poor.length >= 3) {
      return makeTip('sleep_score_low', 'urgent', false, 'urgent', ctx, store, { days: poor.length, avg: Math.round(avg(poor.map(d => d.sleepScore!))) });
    }
  }
  const sleepDays7 = w7.filter(d => d.sleepScore !== null);
  if (sleepDays7.length >= 5) {
    const poor = sleepDays7.filter(d => d.sleepScore! < 65);
    if (poor.length >= 5) {
      return makeTip('sleep_score_low', 'pattern', false, 'pattern', ctx, store, { days: poor.length, avg: Math.round(avg(poor.map(d => d.sleepScore!))) });
    }
  }
  return null;
}

function ruleSleepDurationShort(w7: WindowDay[], w5: WindowDay[], ctx: EngineContext, store: SmartTipsStore): CandidateTip | null {
  const { sleepGoal } = ctx;
  const short5 = w5.filter(d => d.sleepHours !== null && d.sleepHours < sleepGoal * 0.65);
  if (short5.length >= 3) {
    return makeTip('sleep_duration_short', 'urgent', false, 'urgent', ctx, store, { days: short5.length, avg: (Math.round(avg(short5.map(d => d.sleepHours!)) * 10) / 10).toFixed(1), goal: sleepGoal });
  }
  const short7 = w7.filter(d => d.sleepHours !== null && d.sleepHours < sleepGoal * 0.8);
  if (short7.length >= 5) {
    return makeTip('sleep_duration_short', 'pattern', false, 'pattern', ctx, store, { days: short7.length, avg: (Math.round(avg(short7.map(d => d.sleepHours!)) * 10) / 10).toFixed(1), goal: sleepGoal });
  }
  return null;
}

function ruleSleepBedtimeInconsistent(w7: WindowDay[], ctx: EngineContext, store: SmartTipsStore): CandidateTip | null {
  const bedtimeDays = w7.filter(d => d.sleepBedTimeMin !== null);
  if (bedtimeDays.length < 5) return null;
  const sd = stdDev(bedtimeDays.map(d => d.sleepBedTimeMin!));
  if (sd <= 60) return null;
  return makeTip('sleep_bedtime_inconsistent', 'pattern', false, 'pattern', ctx, store);
}

function ruleSleepScoreHigh(w7: WindowDay[], ctx: EngineContext, store: SmartTipsStore): CandidateTip | null {
  const sleepDays = w7.filter(d => d.sleepScore !== null);
  if (sleepDays.length < 5) return null;
  const high = sleepDays.filter(d => d.sleepScore! >= 85);
  if (high.length < 5) return null;
  return makeTip('sleep_score_high', 'insight', true, 'insight_all', ctx, store, { days: high.length, avg: Math.round(avg(high.map(d => d.sleepScore!))) });
}

function ruleSleepDeepLow(w7: WindowDay[], ctx: EngineContext, store: SmartTipsStore): CandidateTip | null {
  const stageDays = w7.filter(d => d.deepSleepPct !== null);
  if (stageDays.length < 5) return null;
  const low = stageDays.filter(d => d.deepSleepPct! < 15);
  if (low.length < 5) return null;
  return makeTip('sleep_deep_low', 'pattern', false, 'pattern', ctx, store);
}

// ── ACTIVITY RULES ────────────────────────────────────────────────────────────

function ruleActiveLow(w7: WindowDay[], w5: WindowDay[], ctx: EngineContext, store: SmartTipsStore): CandidateTip | null {
  if (ctx.goalBucket === 'gain') return null;
  const { activeCalGoal, burnAccuracyPct } = ctx;

  const urgentQual = w5.filter(d => d.rawActive * burnAccuracyPct / 100 < activeCalGoal * 0.4);
  if (urgentQual.length >= 3 && meetsLoggingGate(w5, 4)) {
    const poolKey = ctx.goalBucket === 'lose' ? 'urgent_lose' : 'pattern';
    return makeTip('active_low', 'urgent', false, poolKey, ctx, store, { goal: activeCalGoal, avg: Math.round(avg(urgentQual.map(d => d.rawActive * burnAccuracyPct / 100))), days: urgentQual.length });
  }

  const patternQual = w7.filter(d => d.rawActive * burnAccuracyPct / 100 < activeCalGoal * 0.6);
  if (patternQual.length >= 5 && meetsLoggingGate(w7, 6)) {
    return makeTip('active_low', 'pattern', false, 'pattern', ctx, store, { goal: activeCalGoal, avg: Math.round(avg(patternQual.map(d => d.rawActive * burnAccuracyPct / 100))), days: patternQual.length });
  }

  return null;
}

function ruleActivityStreakLow(w14: WindowDay[], ctx: EngineContext, store: SmartTipsStore): CandidateTip | null {
  if (ctx.goalBucket === 'gain') return null;
  const { activeCalGoal, burnAccuracyPct } = ctx;

  // Count the CURRENT streak from yesterday backwards (w14[0] = yesterday)
  let streak = 0;
  for (const d of w14) {
    const adjActive = d.rawActive * burnAccuracyPct / 100;
    if (adjActive < activeCalGoal * 0.3 && d.workoutChecked === 0) {
      streak++;
    } else {
      break;
    }
  }

  if (streak < 4) return null;
  const tier: SmartTipTier = streak >= 6 ? 'urgent' : 'pattern';
  return makeTip('activity_streak_low', tier, false, 'pattern', ctx, store, { days: streak });
}

function ruleStepsLow(w7: WindowDay[], ctx: EngineContext, store: SmartTipsStore): CandidateTip | null {
  if (ctx.stepGoal <= 0) return null;
  if (!meetsLoggingGate(w7, 6)) return null;
  const low = w7.filter(d => d.steps < ctx.stepGoal * 0.6);
  if (low.length < 5) return null;
  return makeTip('steps_low', 'pattern', false, 'pattern', ctx, store, { goal: ctx.stepGoal.toLocaleString(), days: low.length });
}

function ruleActiveHigh(w7: WindowDay[], ctx: EngineContext, store: SmartTipsStore): CandidateTip | null {
  if (!meetsLoggingGate(w7, 6)) return null;
  const { activeCalGoal, burnAccuracyPct } = ctx;
  const hit = w7.filter(d => d.rawActive * burnAccuracyPct / 100 >= activeCalGoal);
  if (hit.length < 6) return null;
  return makeTip('active_high', 'insight', true, 'insight_all', ctx, store, { goal: activeCalGoal, days: hit.length });
}

function ruleStepsHigh(w7: WindowDay[], ctx: EngineContext, store: SmartTipsStore): CandidateTip | null {
  if (ctx.stepGoal <= 0) return null;
  if (!meetsLoggingGate(w7, 6)) return null;
  const hit = w7.filter(d => d.steps >= ctx.stepGoal);
  if (hit.length < 6) return null;
  return makeTip('steps_high', 'insight', true, 'insight_all', ctx, store, { days: hit.length });
}

function ruleWorkoutLow(w7: WindowDay[], ctx: EngineContext, store: SmartTipsStore): CandidateTip | null {
  const scheduledDays = w7.filter(d => d.workoutScheduled);
  if (scheduledDays.length < 4) return null;
  const lowCompletion = scheduledDays.filter(d => {
    if (d.workoutTotal === 0) return false;
    return d.workoutChecked / d.workoutTotal < 0.6;
  });
  if (lowCompletion.length < 4) return null;
  return makeTip('workout_low', 'pattern', false, 'pattern', ctx, store);
}

// ── IF RULES ─────────────────────────────────────────────────────────────────

function ruleIfInconsistent(w7: WindowDay[], ctx: EngineContext, store: SmartTipsStore): CandidateTip | null {
  if (!ctx.ifEnabled) return null;
  const ifDays = w7.filter(d => d.ifStart !== null && d.ifEnd !== null && d.ifTargetHours !== null);
  if (ifDays.length < 4) return null;
  const broken = ifDays.filter(d => {
    const durationHrs = (d.ifEnd! - d.ifStart!) / 3600000;
    return durationHrs < d.ifTargetHours! - 1;
  });
  if (broken.length < 4) return null;
  return makeTip('if_inconsistent', 'pattern', false, 'pattern', ctx, store, { days: broken.length });
}

function ruleIfLateClose(w7: WindowDay[], ctx: EngineContext, store: SmartTipsStore): CandidateTip | null {
  if (!ctx.ifEnabled || ctx.goalBucket === 'gain') return null;
  const ifDays = w7.filter(d => d.ifStart !== null && d.ifEnd !== null && d.ifTargetHours !== null);
  if (ifDays.length < 5) return null;
  const lateClose = ifDays.filter(d => {
    const actualHrs = (d.ifEnd! - d.ifStart!) / 3600000;
    return actualHrs - d.ifTargetHours! > 1.5;
  });
  if (lateClose.length < 5) return null;
  const avgOverrun = Math.round(avg(lateClose.map(d => (d.ifEnd! - d.ifStart!) / 3600000 - d.ifTargetHours!)) * 10) / 10;
  return makeTip('if_late_close', 'pattern', false, 'pattern', ctx, store, { avg: avgOverrun, days: lateClose.length, method: `${lateClose[0].ifTargetHours}:${24 - lateClose[0].ifTargetHours!}` });
}

function ruleIfConsistent(w7: WindowDay[], ctx: EngineContext, store: SmartTipsStore): CandidateTip | null {
  if (!ctx.ifEnabled) return null;
  const ifDays = w7.filter(d => d.ifStart !== null && d.ifEnd !== null && d.ifTargetHours !== null);
  if (ifDays.length < 6) return null;
  const onTarget = ifDays.filter(d => {
    const actualHrs = (d.ifEnd! - d.ifStart!) / 3600000;
    return Math.abs(actualHrs - d.ifTargetHours!) <= 0.5;
  });
  if (onTarget.length < 6) return null;
  return makeTip('if_consistent', 'insight', true, 'insight_all', ctx, store, { days: onTarget.length });
}

// ── WEIGHT RULES ──────────────────────────────────────────────────────────────

function ruleWeightPlateau(w14: WindowDay[], ctx: EngineContext, store: SmartTipsStore): CandidateTip | null {
  if (ctx.goalBucket === 'maintain') return null;
  const weighIns = w14.filter(d => d.weight !== null).sort((a, b) => a.dateKey < b.dateKey ? -1 : 1);
  if (weighIns.length < 5) return null;
  const early = weighIns.slice(0, 3).map(d => d.weight!);
  const late = weighIns.slice(-3).map(d => d.weight!);
  const change = Math.abs(avg(late) - avg(early));
  if (change >= 0.5) return null;
  const days = weighIns.length;
  const poolKey = `urgent_${ctx.goalBucket}`;
  return makeTip('weight_plateau', 'urgent', false, poolKey, ctx, store, { days });
}

function ruleWeightWrongDirection(w14: WindowDay[], ctx: EngineContext, store: SmartTipsStore): CandidateTip | null {
  if (ctx.goalBucket === 'maintain') return null;
  const weighIns = w14.filter(d => d.weight !== null).sort((a, b) => a.dateKey < b.dateKey ? -1 : 1);
  if (weighIns.length < 4) return null;
  const first = weighIns[0].weight!;
  const last = weighIns[weighIns.length - 1].weight!;
  const daySpan = Math.max(1, Math.round((new Date(weighIns[weighIns.length - 1].dateKey).getTime() - new Date(weighIns[0].dateKey).getTime()) / 86400000));
  const lbsPerWeek = ((last - first) / daySpan) * 7;
  const isWrong = ctx.goalBucket === 'lose' ? lbsPerWeek > 0.5 : lbsPerWeek < -0.5;
  if (!isWrong) return null;
  return makeTip('weight_wrong_direction', 'pattern', false, `pattern_${ctx.goalBucket}`, ctx, store);
}

function ruleWeightOnTrack(w14: WindowDay[], ctx: EngineContext, store: SmartTipsStore): CandidateTip | null {
  const weighIns = w14.filter(d => d.weight !== null).sort((a, b) => a.dateKey < b.dateKey ? -1 : 1);
  if (weighIns.length < 4) return null;
  const first = weighIns[0].weight!;
  const last = weighIns[weighIns.length - 1].weight!;
  const daySpan = Math.max(1, Math.round((new Date(weighIns[weighIns.length - 1].dateKey).getTime() - new Date(weighIns[0].dateKey).getTime()) / 86400000));
  const lbsPerWeek = ((last - first) / daySpan) * 7;
  const paceRatePerWeek = Math.abs(GOAL_DEFICITS[ctx.weightGoal] ?? 0) / 3500;

  let onTrack = false;
  if (ctx.goalBucket === 'lose') onTrack = lbsPerWeek < -paceRatePerWeek * 0.5;
  else if (ctx.goalBucket === 'gain') onTrack = lbsPerWeek > paceRatePerWeek * 0.5;
  else onTrack = Math.abs(last - first) < 0.5;
  if (!onTrack) return null;

  return makeTip('weight_on_track', 'insight', true, `insight_${ctx.goalBucket}`, ctx, store, { paceLabel: ctx.paceLabel });
}

function ruleWeightInfrequent(w14: WindowDay[], ctx: EngineContext, store: SmartTipsStore): CandidateTip | null {
  if (ctx.goalBucket === 'maintain') return null;
  if (ctx.isMindful) return null;
  const weighIns = w14.filter(d => d.weight !== null);
  if (weighIns.length >= 3) return null;
  return makeTip('weight_infrequent', 'insight', false, 'insight_all', ctx, store, { count: weighIns.length });
}

// ── CONSISTENCY RULES ─────────────────────────────────────────────────────────

function ruleLogConsistencyLow(w7: WindowDay[], ctx: EngineContext, store: SmartTipsStore): CandidateTip | null {
  const logged = loggedDaysInWindow(w7);
  if (logged < 2) {
    return makeTip('log_consistency_low', 'urgent', false, 'urgent', ctx, store, { days: logged });
  }
  if (logged < 4) {
    return makeTip('log_consistency_low', 'pattern', false, 'pattern', ctx, store, { days: logged });
  }
  return null;
}

function ruleWeekendSpike(w14: WindowDay[], ctx: EngineContext, store: SmartTipsStore): CandidateTip | null {
  if (ctx.goalBucket === 'gain') return null;
  if (ctx.bmr === 0) return null;

  const foodDays = w14.filter(d => d.hasFoodData && d.consumed > 0.5 * d.bmr);
  const weekendDays = foodDays.filter(d => d.isWeekend);
  const weekdayDays = foodDays.filter(d => !d.isWeekend);

  const satCount = weekendDays.filter(d => {
    const day = new Date(d.dateKey + 'T12:00:00').getDay();
    return day === 6;
  }).length;
  if (satCount < 2) return null;
  if (weekdayDays.length < 4 || weekendDays.length < 2) return null;

  const weekdayAvg = avg(weekdayDays.map(d => d.consumed));
  const weekendAvg = avg(weekendDays.map(d => d.consumed));
  const gap = Math.round(weekendAvg - weekdayAvg);
  if (gap < 400) return null;

  return makeTip('weekend_spike', 'insight', false, 'insight_all', ctx, store, { gap });
}

function ruleLogStreakStrong(w7: WindowDay[], ctx: EngineContext, store: SmartTipsStore): CandidateTip | null {
  if (w7.length < 7) return null;
  const allLogged = w7.every(d => d.hasFoodData);
  if (!allLogged) return null;
  return makeTip('log_streak_strong', 'insight', true, 'insight_all', ctx, store);
}

// ── CROSS-SIGNAL RULES ────────────────────────────────────────────────────────

function buildDayMap(w14: WindowDay[]): Map<string, WindowDay> {
  const map = new Map<string, WindowDay>();
  for (const d of w14) map.set(d.dateKey, d);
  return map;
}

function nextDayKey(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d + 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

function ruleCrossProteinSleep(w14: WindowDay[], ctx: EngineContext, store: SmartTipsStore): CandidateTip | null {
  if (ctx.proteinGoalG <= 0) return null;
  const dayMap = buildDayMap(w14);
  const withBoth = w14.filter(d => d.hasFoodData && d.sleepScore !== null);
  if (withBoth.length < 7) return null;

  const low: number[] = [], adequate: number[] = [];
  for (const d of withBoth) {
    const nextKey = nextDayKey(d.dateKey);
    const nextDay = dayMap.get(nextKey);
    if (!nextDay || nextDay.sleepScore === null) continue;
    if (d.protein < ctx.proteinGoalG * 0.7) low.push(nextDay.sleepScore);
    else adequate.push(nextDay.sleepScore);
  }
  if (low.length < 3 || adequate.length < 3) return null;
  const delta = Math.round(avg(adequate) - avg(low));
  if (delta < 8) return null;
  return makeTip('cross_protein_sleep', 'insight', false, 'insight_all', ctx, store, { delta });
}

function ruleCrossSodiumScale(w14: WindowDay[], ctx: EngineContext, store: SmartTipsStore): CandidateTip | null {
  if (ctx.goalBucket === 'gain') return null;
  const dayMap = buildDayMap(w14);
  const withSodiumAndWeight = w14.filter(d => d.sodium > 0 && d.weight !== null);
  if (withSodiumAndWeight.length < 5) return null;

  const highSodiumDeltas: number[] = [], normalSodiumDeltas: number[] = [];
  for (const d of withSodiumAndWeight) {
    const nextKey = nextDayKey(d.dateKey);
    const nextDay = dayMap.get(nextKey);
    if (!nextDay || nextDay.weight === null || d.weight === null) continue;
    const weightDelta = nextDay.weight - d.weight;
    if (d.sodium > 3000) highSodiumDeltas.push(weightDelta);
    else if (d.sodium <= 2300) normalSodiumDeltas.push(weightDelta);
  }
  if (highSodiumDeltas.length < 3 || normalSodiumDeltas.length < 3) return null;
  const delta = Math.round((avg(highSodiumDeltas) - avg(normalSodiumDeltas)) * 10) / 10;
  if (delta < 1.0) return null;
  return makeTip('cross_sodium_scale', 'insight', false, 'insight_all', ctx, store, { delta: delta.toFixed(1) });
}

function ruleCrossHighBurnOvereating(w14: WindowDay[], ctx: EngineContext, store: SmartTipsStore): CandidateTip | null {
  if (ctx.goalBucket === 'gain') return null;
  const dayMap = buildDayMap(w14);
  const { activeCalGoal, burnAccuracyPct } = ctx;
  const withBurn = w14.filter(d => d.rawActive > 0);
  if (withBurn.length < 5) return null;

  const highBurnNext: number[] = [], normalBurnNext: number[] = [];
  for (const d of w14) {
    const nextKey = nextDayKey(d.dateKey);
    const nextDay = dayMap.get(nextKey);
    if (!nextDay || !nextDay.hasFoodData) continue;
    const adjActive = d.rawActive * burnAccuracyPct / 100;
    if (adjActive > activeCalGoal * 1.5) highBurnNext.push(nextDay.consumed);
    else if (adjActive > 0) normalBurnNext.push(nextDay.consumed);
  }
  if (highBurnNext.length < 3 || normalBurnNext.length < 3) return null;
  const delta = Math.round(avg(highBurnNext) - avg(normalBurnNext));
  if (delta < 400) return null;
  return makeTip('cross_high_burn_overeating', 'pattern', false, 'pattern', ctx, store, { delta });
}

function ruleCrossSleepIntake(w14: WindowDay[], ctx: EngineContext, store: SmartTipsStore): CandidateTip | null {
  if (ctx.goalBucket === 'gain') return null;
  const dayMap = buildDayMap(w14);
  const withSleep = w14.filter(d => d.sleepScore !== null || d.sleepHours !== null);
  if (withSleep.length < 7) return null;

  const poorNext: number[] = [], goodNext: number[] = [];
  for (const d of withSleep) {
    const nextKey = nextDayKey(d.dateKey);
    const nextDay = dayMap.get(nextKey);
    if (!nextDay || !nextDay.hasFoodData) continue;
    const isPoor = d.sleepScore !== null ? d.sleepScore < 65 : (d.sleepHours !== null && d.sleepHours < ctx.sleepGoal * 0.8);
    const isGood = d.sleepScore !== null ? d.sleepScore >= 75 : (d.sleepHours !== null && d.sleepHours >= ctx.sleepGoal);
    if (isPoor) poorNext.push(nextDay.consumed);
    else if (isGood) goodNext.push(nextDay.consumed);
  }
  if (poorNext.length < 3 || goodNext.length < 3) return null;
  const delta = Math.round(avg(poorNext) - avg(goodNext));
  if (delta < 300) return null;
  return makeTip('cross_sleep_intake', 'insight', false, 'insight_all', ctx, store, { delta });
}

function ruleCrossWorkoutIntake(w14: WindowDay[], ctx: EngineContext, store: SmartTipsStore): CandidateTip | null {
  if (ctx.goalBucket !== 'lose') return null;
  if (ctx.bmr === 0) return null;

  const foodDays = w14.filter(d => d.hasFoodData && d.consumed > 0.5 * d.bmr);
  const workoutDays = foodDays.filter(d => d.workoutChecked > 0);
  const restDays = foodDays.filter(d => d.workoutChecked === 0);
  if (workoutDays.length < 4 || restDays.length < 4) return null;

  const workoutNet = avg(workoutDays.map(d => computeNet(d, ctx.burnAccuracyPct)));
  const restNet = avg(restDays.map(d => computeNet(d, ctx.burnAccuracyPct)));
  const delta = Math.round(restNet - workoutNet);
  if (delta < 400) return null;
  return makeTip('cross_workout_intake', 'pattern', false, 'pattern_lose', ctx, store, { delta });
}

function ruleCrossStepsSleep(w14: WindowDay[], ctx: EngineContext, store: SmartTipsStore): CandidateTip | null {
  if (ctx.stepGoal <= 0) return null;
  const withBoth = w14.filter(d => d.steps > 0 && d.sleepScore !== null);
  if (withBoth.length < 7) return null;

  const highStepSleep: number[] = [], lowStepSleep: number[] = [];
  for (const d of withBoth) {
    if (d.steps >= ctx.stepGoal) highStepSleep.push(d.sleepScore!);
    else if (d.steps < ctx.stepGoal * 0.6) lowStepSleep.push(d.sleepScore!);
  }
  if (highStepSleep.length < 3 || lowStepSleep.length < 3) return null;
  const delta = Math.round(avg(highStepSleep) - avg(lowStepSleep));
  if (delta < 8) return null;
  return makeTip('cross_steps_sleep', 'insight', true, 'insight_all', ctx, store, { delta });
}

function ruleCrossFiberCalorie(w14: WindowDay[], ctx: EngineContext, store: SmartTipsStore): CandidateTip | null {
  if (ctx.goalBucket === 'gain') return null;
  const foodDays = w14.filter(d => d.hasFoodData);
  const totalE = foodDays.reduce((s, d) => s + d.totalEntries, 0);
  const fiberE = foodDays.reduce((s, d) => s + d.fiberEntries, 0);
  if (totalE < 1 || fiberE / totalE < 0.6) return null;

  const lowFiber = foodDays.filter(d => d.fiber < 15);
  const highFiber = foodDays.filter(d => d.fiber >= 25);
  if (lowFiber.length < 3 || highFiber.length < 3) return null;

  const delta = Math.round(avg(lowFiber.map(d => d.consumed)) - avg(highFiber.map(d => d.consumed)));
  if (delta < 300) return null;
  return makeTip('cross_fiber_calorie', 'insight', true, 'insight_all', ctx, store, { delta });
}

// ── RECOVERY (graduated from the Recovery coach into EvR as cross-signal) ──────
// These mirror R1/R2/R3 of buildRecoveryFinding but run as standard EvR
// candidates. The hub Recovery coach is untouched; this only makes recovery
// eligible to win an EvR insight. Snapshot/acute/no-cause rules stay hub-only.

function recEvrDays(w14: WindowDay[]): WindowDay[] {
  return w14.filter(d => d.recoveryScore !== null && !d.excluded);
}

// R1: next-day recovery drags after the highest-effort days.
function computeRecLoadDrag(w14: WindowDay[]): { delta: number; n: number; hardMean: number; easyMean: number } | null {
  const recDays = recEvrDays(w14);
  if (recDays.length < REC_MIN_PATTERN_DAYS) return null;
  const dayMap = buildDayMap(w14);
  const actives = w14.map(d => d.rawActive).filter(a => a > 0).sort((a, b) => a - b);
  if (actives.length < 3) return null;
  const highCut = actives[Math.floor(actives.length * 0.66)];
  const afterHigh: number[] = [], afterLow: number[] = [];
  for (const d of recDays) {
    const p = dayMap.get(keyForOffset(d.dateKey, 1)); // prior day's load
    if (!p || p.rawActive <= 0) continue;
    (p.rawActive >= highCut ? afterHigh : afterLow).push(d.recoveryScore as number);
  }
  if (afterHigh.length < REC_MIN_PAIRS || afterLow.length < REC_MIN_PAIRS) return null;
  const delta = Math.round(avg(afterLow) - avg(afterHigh)); // positive = lower after hard days
  if (delta < REC_PATTERN_DELTA) return null;
  return { delta, n: recDays.length, hardMean: Math.round(avg(afterHigh)), easyMean: Math.round(avg(afterLow)) };
}

// R2: recovery tracks sleep (lower after short nights).
function computeRecTracksSleep(w14: WindowDay[], sleepGoal: number): { delta: number; n: number; shortMean: number; okMean: number } | null {
  const recDays = recEvrDays(w14);
  if (recDays.length < REC_MIN_PATTERN_DAYS) return null;
  const shortS: number[] = [], okS: number[] = [];
  for (const d of recDays) {
    if (d.sleepHours === null) continue;
    (d.sleepHours < sleepGoal * 0.9 ? shortS : okS).push(d.recoveryScore as number);
  }
  if (shortS.length < REC_MIN_PAIRS || okS.length < REC_MIN_PAIRS) return null;
  const delta = Math.round(avg(okS) - avg(shortS)); // positive = lower after short nights
  if (delta < REC_PATTERN_DELTA) return null;
  return { delta, n: recDays.length, shortMean: Math.round(avg(shortS)), okMean: Math.round(avg(okS)) };
}

// R3: sustained under-recovery while training holds steady.
function computeRecSustainedLow(w14: WindowDay[]): { mean: number; n: number } | null {
  const recDays = recEvrDays(w14);
  if (recDays.length < REC_MIN_PATTERN_DAYS) return null;
  const scores = recDays.map(d => d.recoveryScore as number);
  const mean = avg(scores);
  const sd = stdDev(scores);
  const trainingDays = recDays.filter(d => d.rawActive > 0 || d.workoutChecked > 0).length;
  if (mean < REC_LOW_MEAN && sd < 12 && trainingDays >= recDays.length * 0.5) {
    return { mean: Math.round(mean), n: recDays.length };
  }
  return null;
}

function ruleRecLoadDrag(w14: WindowDay[], ctx: EngineContext, store: SmartTipsStore): CandidateTip | null {
  const r = computeRecLoadDrag(w14);
  if (!r) return null;
  return makeTip('rec_load_drag', 'insight', false, 'insight_all', ctx, store, { delta: r.delta });
}

function ruleRecTracksSleep(w14: WindowDay[], ctx: EngineContext, store: SmartTipsStore): CandidateTip | null {
  const r = computeRecTracksSleep(w14, ctx.sleepGoal);
  if (!r) return null;
  return makeTip('rec_tracks_sleep', 'insight', false, 'insight_all', ctx, store, { delta: r.delta });
}

function ruleRecSustainedLow(w14: WindowDay[], ctx: EngineContext, store: SmartTipsStore): CandidateTip | null {
  const r = computeRecSustainedLow(w14);
  if (!r) return null;
  return makeTip('rec_sustained_low', 'pattern', false, 'pattern', ctx, store, { mean: r.mean });
}

// EvR card port (2026-06-16): expose the three recovery EvR patterns as card-ready findings
// so the diagnostic card engine (utils/diagnosticReport.ts) can render them without
// duplicating the math. Reuses the exact computeRec* helpers + REC constants. Loads its own
// fixed 14-day window -- these patterns are 14d by nature, independent of the EvR report
// window (this IS the per-pattern-window model). All three are correctives (never positive).
export interface EvrRecoveryFinding {
  id: 'rec_load_drag' | 'rec_tracks_sleep' | 'rec_sustained_low';
  delta?: number;   // load_drag / tracks_sleep: recovery pts lower after hard days / short nights
  mean?: number;    // sustained_low: window mean recovery score
  n: number;        // recovery-equipped days in the window
  strength: number; // 0-100, first-pass (tuned live during the EvR build per decision 2)
  // A-vs-B means for the comparison bar (load_drag / tracks_sleep). a = the worse cohort
  // (after hard / after short), b = the better cohort (after easy / after full).
  compare?: { a: number; aLabel: string; b: number; bLabel: string };
}

export async function computeEvrRecoveryFindings(todayKey?: string): Promise<EvrRecoveryFinding[]> {
  const tk = todayKey ?? todayDateKey();
  const ctx = await buildEngineContext(tk);
  let workoutState: any = {};
  try { const r = await AsyncStorage.getItem('pj_workout_state'); workoutState = r ? JSON.parse(r) : {}; } catch {}
  const allDays = await loadWindowDays(tk, ctx, workoutState);
  const w14 = allDays.slice(0, 14);

  const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));
  const out: EvrRecoveryFinding[] = [];

  const load = computeRecLoadDrag(w14);
  if (load) out.push({
    id: 'rec_load_drag', delta: load.delta, n: load.n,
    strength: clamp(46 + (load.delta / REC_PATTERN_DELTA - 1) * 30),
    compare: { a: load.hardMean, aLabel: 'AFTER HARD', b: load.easyMean, bLabel: 'AFTER EASY' },
  });

  const tracks = computeRecTracksSleep(w14, ctx.sleepGoal);
  if (tracks) out.push({
    id: 'rec_tracks_sleep', delta: tracks.delta, n: tracks.n,
    strength: clamp(46 + (tracks.delta / REC_PATTERN_DELTA - 1) * 30),
    compare: { a: tracks.shortMean, aLabel: 'AFTER SHORT', b: tracks.okMean, bLabel: 'AFTER FULL' },
  });

  const sustained = computeRecSustainedLow(w14);
  if (sustained) out.push({
    id: 'rec_sustained_low', mean: sustained.mean, n: sustained.n,
    strength: clamp(58 + (REC_LOW_MEAN - sustained.mean) * 1.5),
  });

  return out;
}

// DEV diagnostic for the recovery port: shows whether the rec_* rules can even evaluate
// (enough recovery days) and the window mean, so a no-card result can be read as
// "wired, no pattern" vs "broken". Read-only.
export async function dumpEvrRecoveryDebug(todayKey?: string): Promise<{
  recDaysInWindow: number;
  minNeeded: number;
  meanRecovery: number | null;
  sustainedLowFloor: number;
  findings: EvrRecoveryFinding[];
}> {
  const tk = todayKey ?? todayDateKey();
  const ctx = await buildEngineContext(tk);
  let workoutState: any = {};
  try { const r = await AsyncStorage.getItem('pj_workout_state'); workoutState = r ? JSON.parse(r) : {}; } catch {}
  const allDays = await loadWindowDays(tk, ctx, workoutState);
  const w14 = allDays.slice(0, 14);
  const recDays = recEvrDays(w14);
  const scores = recDays.map(d => d.recoveryScore as number);
  const meanRecovery = scores.length ? Math.round(avg(scores)) : null;
  const findings = await computeEvrRecoveryFindings(tk);
  return {
    recDaysInWindow: recDays.length,
    minNeeded: REC_MIN_PATTERN_DAYS,
    meanRecovery,
    sustainedLowFloor: REC_LOW_MEAN,
    findings,
  };
}

// ── Run all rules ─────────────────────────────────────────────────────────────

function runAllRules(
  w7: WindowDay[], w5: WindowDay[], w14: WindowDay[],
  ctx: EngineContext, store: SmartTipsStore,
): CandidateTip[] {
  const candidates: CandidateTip[] = [];

  const push = (tip: CandidateTip | null) => { if (tip) candidates.push(tip); };

  push(ruleNetAbovePace(w7, w5, ctx, store));
  push(ruleNetBelowPace(w7, w5, ctx, store));
  push(ruleCalSmallGap(w7, ctx, store));
  push(ruleCalOutlierWeek(w7, ctx, store));
  push(ruleProteinUnder(w7, w5, ctx, store));
  push(ruleProteinHigh(w7, ctx, store));
  push(ruleWaterUnder(w7, w5, ctx, store));
  push(ruleWaterHigh(w7, ctx, store));
  push(ruleFiberLow(w7, ctx, store));
  push(ruleSodiumHigh(w7, w5, ctx, store));
  push(ruleSugarHigh(w7, ctx, store));
  push(ruleCalGoalHit(w7, ctx, store));
  push(ruleSleepScoreLow(w7, w5, ctx, store));
  push(ruleSleepDurationShort(w7, w5, ctx, store));
  push(ruleSleepBedtimeInconsistent(w7, ctx, store));
  push(ruleSleepScoreHigh(w7, ctx, store));
  push(ruleSleepDeepLow(w7, ctx, store));
  push(ruleActiveLow(w7, w5, ctx, store));
  push(ruleActivityStreakLow(w14, ctx, store));
  push(ruleStepsLow(w7, ctx, store));
  push(ruleActiveHigh(w7, ctx, store));
  push(ruleStepsHigh(w7, ctx, store));
  push(ruleWorkoutLow(w7, ctx, store));
  push(ruleIfInconsistent(w7, ctx, store));
  push(ruleIfLateClose(w7, ctx, store));
  push(ruleIfConsistent(w7, ctx, store));
  push(ruleWeightPlateau(w14, ctx, store));
  push(ruleWeightWrongDirection(w14, ctx, store));
  push(ruleWeightOnTrack(w14, ctx, store));
  push(ruleWeightInfrequent(w14, ctx, store));
  push(ruleLogConsistencyLow(w7, ctx, store));
  push(ruleWeekendSpike(w14, ctx, store));
  push(ruleLogStreakStrong(w7, ctx, store));
  push(ruleCrossProteinSleep(w14, ctx, store));
  push(ruleCrossSodiumScale(w14, ctx, store));
  push(ruleCrossHighBurnOvereating(w14, ctx, store));
  push(ruleCrossSleepIntake(w14, ctx, store));
  push(ruleCrossWorkoutIntake(w14, ctx, store));
  push(ruleCrossStepsSleep(w14, ctx, store));
  push(ruleCrossFiberCalorie(w14, ctx, store));
  push(ruleRecLoadDrag(w14, ctx, store));
  push(ruleRecTracksSleep(w14, ctx, store));
  push(ruleRecSustainedLow(w14, ctx, store));

  return candidates;
}

// ── Filtering + ranking ───────────────────────────────────────────────────────

function applyMindfulSuppression(candidates: CandidateTip[], ctx: EngineContext): CandidateTip[] {
  if (!ctx.isMindful) return candidates;

  return candidates.filter(tip => {
    if (tip.positive) return true;
    if (tip.ruleId === 'weight_infrequent') return false;
    if (tip.ruleId === 'log_consistency_low') return true;
    if (!ctx.mindfulGrowthAreas) return false;
    return true;
  });
}

function applyCooldowns(candidates: CandidateTip[], store: SmartTipsStore, todayKey: string): CandidateTip[] {
  return candidates.filter(tip => !isCooledDown(tip.ruleId, tip.tier, store, todayKey));
}

const TIER_RANK: Record<SmartTipTier, number> = { urgent: 3, pattern: 2, insight: 1 };

function rankCandidates(candidates: CandidateTip[], ctx: EngineContext): CandidateTip[] {
  const goalPriority = (ruleId: string): number => {
    if (ctx.goalBucket === 'lose') {
      if (['net_above_pace', 'protein_under', 'cal_small_gap'].includes(ruleId)) return 3;
      if (['active_low', 'cal_goal_hit', 'activity_streak_low'].includes(ruleId)) return 2;
    } else if (ctx.goalBucket === 'gain') {
      if (['net_below_pace', 'protein_under', 'protein_high'].includes(ruleId)) return 3;
    }
    return 1;
  };

  return [...candidates].sort((a, b) => {
    const tierDiff = TIER_RANK[b.tier] - TIER_RANK[a.tier];
    if (tierDiff !== 0) return tierDiff;
    const goalDiff = goalPriority(b.ruleId) - goalPriority(a.ruleId);
    if (goalDiff !== 0) return goalDiff;
    return 0;
  });
}

// ── Main compute ──────────────────────────────────────────────────────────────

export async function computeAndStoreSmartTips(): Promise<SmartTipsStore> {
  const todayKey = todayDateKey();
  const [ctx, existingStore, workoutRaw] = await Promise.all([
    buildEngineContext(todayKey),
    loadSmartTips(),
    AsyncStorage.getItem('pj_workout_state').catch(() => null),
  ]);

  const store: SmartTipsStore = existingStore ?? { ...EMPTY_STORE };

  // Compute once per day. If already computed today, return stored tips as-is.
  // Recomputing same-day fires cooldowns and wipes active tips on repeated EvR opens.
  if (store.lastComputed && store.lastComputed.startsWith(todayKey) && store.activeTips.length > 0) {
    return store;
  }

  const workoutState: any = workoutRaw ? JSON.parse(workoutRaw) : {};

  const allDays = await loadWindowDays(todayKey, ctx, workoutState);
  const w14 = allDays;
  const w7 = allDays.slice(0, 7);
  const w5 = allDays.slice(0, 5);

  const rawCandidates = runAllRules(w7, w5, w14, ctx, store);
  const mindfulFiltered = applyMindfulSuppression(rawCandidates, ctx);
  const cooledFiltered = applyCooldowns(mindfulFiltered, store, todayKey);
  const ranked = rankCandidates(cooledFiltered, ctx);
  const selected = ranked.slice(0, MAX_ACTIVE_TIPS);

  const todayISO = new Date().toISOString();
  const newCooldowns = { ...store.cooldowns };
  const newVariantHistory = { ...store.variantHistory };

  const activeTips: StoredTip[] = selected.map(tip => {
    newCooldowns[tip.ruleId] = todayKey;
    newVariantHistory[tip.ruleId] = tip.variantIndex;
    return {
      id: uniqueId(),
      ruleId: tip.ruleId,
      tier: tip.tier,
      title: tip.title,
      body: tip.body,
      firedDate: todayISO,
      goalType: tip.goalType,
      positive: tip.positive,
      surfacedOn: [],
      topic: tip.topic,
    };
  });

  const allHistory = [...activeTips, ...store.recentHistory].slice(0, 50);

  const newStore: SmartTipsStore = {
    activeTips,
    recentHistory: allHistory,
    cooldowns: newCooldowns,
    variantHistory: newVariantHistory,
    lastComputed: todayISO,
    topicLedger: pruneLedger(store.topicLedger, todayKey),
  };

  await saveSmartTipsStore(newStore);
  return newStore;
}

// ── Coach Packet System ───────────────────────────────────────────────────────
// Selects ONE headline scenario via the priority spine, assembles a structured
// packet for the AI call, and caches to pj_coach_tip (read-then-merge always).

const COACH_TIP_KEY = 'pj_coach_tip';

export interface CoachPacket {
  scenario: string;
  ruleId: string;
  familyNum: number;
  diagnosis: string;
  action: string;
  facts: Record<string, string | number>;
  tone: 'positive' | 'corrective' | 'care' | 'educational';
  careSeverity?: 'mild' | 'moderate' | 'strong';
  mode: string;
  goal: string;
  surface: 'home' | 'day_summary' | 'evr' | 'weekly' | 'monthly' | 'sleep' | 'recovery';
  windowDays: number;
  startDate?: string;
  endDate?: string;
  ifActive: boolean;
  previousTip: string;
  faithTier: string;
  computedDate: string;
  fallbackTitle: string;
  fallbackBody: string;
  // Data density fields (multi-day surfaces: evr, weekly, monthly)
  daysLogged?: number;
  daysWithNutritionData?: number;
  daysWithActivityData?: number;
  daysWithSleepData?: number;
}

export interface CoachTipCache {
  packet: CoachPacket;
  aiBody: string | null;
  aiGeneratedDate: string | null;
  fallbackUsed: boolean;
}

export async function loadCoachTipCache(): Promise<CoachTipCache | null> {
  try {
    const raw = await AsyncStorage.getItem(COACH_TIP_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function saveCoachTipCache(cache: CoachTipCache): Promise<void> {
  try {
    await storageSet(COACH_TIP_KEY, JSON.stringify(cache));
  } catch {}
}

// EvR uses separate per-window cache keys so each report window stores its own tip.
// Brain data always analyzes the most recent 14 days regardless of window (actionable
// coaching is always about current state). If 30/90-day-specific scenarios are added
// later (e.g. long-term plateau needing 3 months of weigh-ins), expand loadWindowDays
// to accept a maxDays param and pass windowDays here.
const COACH_TIP_EVR_KEYS: Record<number, string> = {
  14: 'pj_coach_tip_evr_14',
  30: 'pj_coach_tip_evr_30',
  90: 'pj_coach_tip_evr_90',
};

export async function loadCoachTipCacheEvr(windowDays: number): Promise<CoachTipCache | null> {
  try {
    const key = COACH_TIP_EVR_KEYS[windowDays] ?? COACH_TIP_EVR_KEYS[14];
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function saveCoachTipCacheEvr(windowDays: number, cache: CoachTipCache): Promise<void> {
  try {
    const key = COACH_TIP_EVR_KEYS[windowDays] ?? COACH_TIP_EVR_KEYS[14];
    await storageSet(key, JSON.stringify(cache));
  } catch {}
}

// Sleep Coach (Sleep Hub) has its own cache key, independent of the home tip.
const COACH_TIP_SLEEP_KEY = 'pj_coach_tip_sleep';

export async function loadCoachTipCacheSleep(): Promise<CoachTipCache | null> {
  try {
    const raw = await AsyncStorage.getItem(COACH_TIP_SLEEP_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function saveCoachTipCacheSleep(cache: CoachTipCache): Promise<void> {
  try {
    await storageSet(COACH_TIP_SLEEP_KEY, JSON.stringify(cache));
  } catch {}
}

// Computes the EvR coach packet for the given window size, deduped against the
// home card's current scenario. Each window size caches independently so a 14-day
// and 30-day report each show a distinct tip.
export async function computeCoachPacketEvr(
  windowDays: number,
  homeRuleId: string | null,
): Promise<CoachTipCache> {
  const todayKey = todayDateKey();
  const evrLastRuleKey = `pj_coach_last_rule_evr_${windowDays}`;
  const evrTopicHistKey = 'pj_coach_topic_hist_evr'; // shared across windows: user sees one story

  const [existing, lastRuleRaw, topicHistRaw] = await Promise.all([
    loadCoachTipCacheEvr(windowDays),
    AsyncStorage.getItem(evrLastRuleKey),
    AsyncStorage.getItem(evrTopicHistKey),
  ]);
  const persistedLastRuleId: string | null = lastRuleRaw ? JSON.parse(lastRuleRaw).ruleId : null;
  let recentTopics: string[] = [];
  try { recentTopics = topicHistRaw ? (JSON.parse(topicHistRaw) || []) : []; } catch { recentTopics = []; }

  if (existing && existing.packet.computedDate === todayKey && existing.packet.windowDays === windowDays) {
    return existing;
  }

  const [ctx, store, workoutRaw] = await Promise.all([
    buildEngineContext(todayKey),
    loadSmartTips(),
    AsyncStorage.getItem('pj_workout_state').catch(() => null),
  ]);

  const tipStore: SmartTipsStore = store ?? {
    activeTips: [], recentHistory: [], cooldowns: {},
    variantHistory: {}, lastComputed: '', topicLedger: {},
  };
  const workoutState: any = workoutRaw ? JSON.parse(workoutRaw) : {};

  const allDays = await loadWindowDays(todayKey, ctx, workoutState);
  const w14 = allDays.slice(0, 14);
  const w7 = allDays.slice(0, 7);
  const w5 = allDays.slice(0, 5);

  const loggedCount = loggedDaysInWindow(w7);
  const evrDensity = computeDensityFields(w14);
  const previousTip = existing?.aiBody ?? existing?.packet.fallbackBody ?? 'none';

  let faithTier = 'rooted';
  try {
    const s = await AsyncStorage.getItem('pj_settings');
    if (s) { const parsed = JSON.parse(s); faithTier = parsed?.faithJourney ?? 'rooted'; }
  } catch {}

  let packet: CoachPacket;

  const safety9 = checkFamily9Safety(w7, ctx);

  if (safety9) {
    packet = {
      scenario: safety9.scenario,
      ruleId: `safety_${safety9.scenario}`,
      familyNum: 9,
      diagnosis: safety9.diagnosis,
      action: safety9.action,
      facts: safety9.facts,
      tone: 'care',
      careSeverity: safety9.careSeverity,
      mode: ctx.styleMode,
      goal: ctx.goalBucket,
      surface: 'evr',
      windowDays,
      ifActive: ctx.ifEnabled,
      previousTip,
      faithTier,
      computedDate: todayKey,
      fallbackTitle: 'A Note on Your Pace',
      fallbackBody: `Something worth flagging. ${safety9.diagnosis}. ${safety9.action}.`,
    };
  } else if (loggedCount < 4) {
    packet = {
      scenario: '5.5',
      ruleId: 'log_consistency_low',
      familyNum: 5,
      diagnosis: `Only ${loggedCount} of 7 days have logged data, not enough for reliable trend analysis`,
      action: 'Log food on at least 5 days this week to unlock full coaching insights',
      facts: { loggedDays: loggedCount },
      tone: 'corrective',
      mode: ctx.styleMode,
      goal: ctx.goalBucket,
      surface: 'evr',
      windowDays,
      ifActive: ctx.ifEnabled,
      previousTip,
      faithTier,
      computedDate: todayKey,
      fallbackTitle: 'Building Your Picture',
      fallbackBody: `The coach has ${loggedCount} logged days to work with. Log food on 5 or more days this week to get a full read on what is working.`,
    };
  } else {
    const rawCandidates = runAllRules(w7, w5, w14, ctx, tipStore);
    const suppressed = applyMindfulSuppression(rawCandidates, ctx);

    // Exclude home's current scenario and EvR's own prior scenario to avoid repeating either
    const excludeIds = [homeRuleId, persistedLastRuleId].filter((id): id is string => !!id);
    const selected = selectByPrioritySpine(suppressed, ctx, excludeIds, recentTopics);

    if (!selected) {
      packet = {
        scenario: '6.0',
        ruleId: 'cal_goal_hit',
        familyNum: 6,
        diagnosis: 'All tracked metrics are within range for the week',
        action: 'Maintain the current approach',
        facts: { loggedDays: loggedCount },
        tone: 'positive',
        mode: ctx.styleMode,
        goal: ctx.goalBucket,
        surface: 'evr',
        windowDays,
        ifActive: ctx.ifEnabled,
        previousTip,
        faithTier,
        computedDate: todayKey,
        fallbackTitle: 'Looking Good',
        fallbackBody: 'Everything is tracking in range this week. Keep the current approach going.',
      };
    } else {
      const { diagnosis, action, facts } = buildDiagnosisActionFacts(selected, w7, w14, ctx);
      const tone = deriveTone(selected);
      packet = {
        scenario: RULE_SCENARIO[selected.ruleId] ?? selected.ruleId,
        ruleId: selected.ruleId,
        familyNum: RULE_FAMILY[selected.ruleId] ?? 0,
        diagnosis,
        action,
        facts,
        tone,
        mode: ctx.styleMode,
        goal: ctx.goalBucket,
        surface: 'evr',
        windowDays,
        ifActive: ctx.ifEnabled,
        previousTip,
        faithTier,
        computedDate: todayKey,
        fallbackTitle: selected.title,
        fallbackBody: selected.body,
      };
    }
  }

  packet.daysLogged = evrDensity.daysLogged;
  packet.daysWithNutritionData = evrDensity.daysWithNutritionData;
  packet.daysWithActivityData = evrDensity.daysWithActivityData;
  packet.daysWithSleepData = evrDensity.daysWithSleepData;

  const sameScenario = existing?.packet.scenario === packet.scenario;
  const cache: CoachTipCache = {
    packet,
    aiBody: (sameScenario && existing?.aiBody) ? existing.aiBody : null,
    aiGeneratedDate: (sameScenario && existing?.aiGeneratedDate) ? existing.aiGeneratedDate : null,
    fallbackUsed: false,
  };

  await Promise.all([
    saveCoachTipCacheEvr(windowDays, cache),
    AsyncStorage.setItem(evrLastRuleKey, JSON.stringify({ ruleId: packet.ruleId })),
    AsyncStorage.setItem(evrTopicHistKey, JSON.stringify([headlineTopic(packet.ruleId), ...recentTopics].slice(0, 3))),
  ]);
  return cache;
}

const RULE_FAMILY: Record<string, number> = {
  net_above_pace: 1, net_below_pace: 1, weight_plateau: 1,
  weight_wrong_direction: 1, weight_on_track: 1,
  protein_under: 2, water_under: 2, fiber_low: 2, sodium_high: 2,
  sugar_high: 2, active_low: 2, steps_low: 2, workout_low: 2,
  cross_protein_sleep: 3, cross_sodium_scale: 3, cross_high_burn_overeating: 3,
  cross_sleep_intake: 3, cross_workout_intake: 3, cross_steps_sleep: 3,
  cross_fiber_calorie: 3, weekend_spike: 3, cal_outlier_week: 3,
  rec_load_drag: 3, rec_tracks_sleep: 3, rec_sustained_low: 3,
  sleep_score_low: 4, sleep_duration_short: 4, sleep_bedtime_inconsistent: 4,
  sleep_deep_low: 4,
  log_consistency_low: 5, weight_infrequent: 5, activity_streak_low: 5,
  cal_small_gap: 5,
  protein_high: 6, water_high: 6, active_high: 6, steps_high: 6,
  cal_goal_hit: 6, log_streak_strong: 6, if_consistent: 6, sleep_score_high: 6,
  if_inconsistent: 7, if_late_close: 7,
};

const RULE_SCENARIO: Record<string, string> = {
  net_above_pace: '1.1', net_below_pace: '1.2', weight_plateau: '1.3',
  weight_wrong_direction: '1.4', weight_on_track: '1.5',
  protein_under: '2.1', water_under: '2.2', fiber_low: '2.3',
  sodium_high: '2.4', sugar_high: '2.5', active_low: '2.6',
  steps_low: '2.7', workout_low: '2.8',
  cross_protein_sleep: '3.1', cross_sodium_scale: '3.2',
  cross_high_burn_overeating: '3.3', cross_sleep_intake: '3.4',
  cross_workout_intake: '3.5', cross_steps_sleep: '3.6',
  cross_fiber_calorie: '3.7', weekend_spike: '3.8', cal_outlier_week: '3.9',
  rec_load_drag: '3.10', rec_tracks_sleep: '3.11', rec_sustained_low: '3.12',
  sleep_score_low: '4.1', sleep_duration_short: '4.2',
  sleep_bedtime_inconsistent: '4.3', sleep_deep_low: '4.4',
  log_consistency_low: '5.1', weight_infrequent: '5.2',
  activity_streak_low: '5.3', cal_small_gap: '5.4',
  protein_high: '6.1', water_high: '6.2', active_high: '6.3',
  steps_high: '6.4', cal_goal_hit: '6.5', log_streak_strong: '6.6',
  if_consistent: '6.7', sleep_score_high: '6.8',
  if_inconsistent: '7.1', if_late_close: '7.2',
};

const EDUCATIONAL_RULES = new Set([
  'cross_sodium_scale', 'cross_protein_sleep', 'cross_steps_sleep',
  'cross_fiber_calorie', 'cross_sleep_intake',
  'rec_load_drag', 'rec_tracks_sleep',
]);

function deriveTone(candidate: CandidateTip): 'positive' | 'corrective' | 'educational' {
  if (candidate.positive) return 'positive';
  if (EDUCATIONAL_RULES.has(candidate.ruleId)) return 'educational';
  return 'corrective';
}

function buildDiagnosisActionFacts(
  candidate: CandidateTip,
  w7: WindowDay[],
  w14: WindowDay[],
  ctx: EngineContext,
): { diagnosis: string; action: string; facts: Record<string, string | number> } {
  const { ruleId } = candidate;
  const foodDays7 = w7.filter(d => d.hasFoodData);
  const burnAcc = ctx.burnAccuracyPct;

  switch (ruleId) {
    case 'net_above_pace': {
      const over = foodDays7.filter(d => computeNet(d, burnAcc) > (ctx.paceTarget ?? 0) + 200);
      const avgNet = over.length ? Math.round(avg(over.map(d => computeNet(d, burnAcc)))) : 0;
      return {
        diagnosis: `Over the last 7 days, net calories above ${ctx.paceLabel} target on ${over.length} of ${foodDays7.length} logged days`,
        action: 'Trim 100 to 200 calories from the highest-calorie days to close the gap',
        facts: { daysOver: over.length, avgNet, paceTarget: ctx.paceTarget ?? 0, goal: ctx.goalBucket },
      };
    }
    case 'net_below_pace': {
      const under = foodDays7.filter(d => computeNet(d, burnAcc) < (ctx.paceTarget ?? 0) - 200);
      return {
        diagnosis: `Over the last 7 days, net calories below ${ctx.paceLabel} target on ${under.length} of ${foodDays7.length} logged days`,
        action: 'Increase daily intake to hit the surplus target consistently',
        facts: { daysUnder: under.length, paceTarget: ctx.paceTarget ?? 0, goal: ctx.goalBucket },
      };
    }
    case 'weight_plateau': {
      const weighIns = w14.filter(d => d.weight !== null);
      return {
        diagnosis: `Over the last 14 days, the scale has moved less than 0.5 lb over ${weighIns.length} weigh-ins despite a logged deficit`,
        action: 'Check calorie logging accuracy or adjust the deficit by 100 to 150 calories',
        facts: { weighIns: weighIns.length },
      };
    }
    case 'weight_wrong_direction': {
      const weighIns = w14.filter(d => d.weight !== null).sort((a, b) => a.dateKey < b.dateKey ? -1 : 1);
      const first = weighIns[0]?.weight ?? 0;
      const last = weighIns[weighIns.length - 1]?.weight ?? 0;
      const change = Math.abs(last - first).toFixed(1);
      return {
        diagnosis: `Weight has moved ${change} lbs in the wrong direction over ${weighIns.length} weigh-ins in the last 14 days`,
        action: 'Revisit calorie tracking accuracy and check that active calorie estimates are reasonable',
        facts: { change, weighIns: weighIns.length, weighInRate: `${weighIns.length} of 14 days`, direction: ctx.goalBucket === 'gain' ? 'down' : 'up' },
      };
    }
    case 'weight_on_track': {
      const weighIns = w14.filter(d => d.weight !== null).sort((a, b) => a.dateKey < b.dateKey ? -1 : 1);
      const first = weighIns[0]?.weight ?? 0;
      const last = weighIns[weighIns.length - 1]?.weight ?? 0;
      const change = Math.abs(last - first).toFixed(1);
      return {
        diagnosis: `Over the last 14 days, weight is trending in the right direction, ${change} lbs over ${weighIns.length} weigh-ins`,
        action: 'Maintain current approach',
        facts: { change, weighIns: weighIns.length, goal: ctx.goalBucket },
      };
    }
    case 'protein_under': {
      const low = foodDays7.filter(d => d.protein < ctx.proteinGoalG * 0.8);
      const avgLow = low.length ? Math.round(avg(low.map(d => d.protein))) : 0;
      return {
        diagnosis: `Over the last 7 days, protein fell short on ${low.length} of ${foodDays7.length} logged days, averaging ${avgLow}g on those days against a ${Math.round(ctx.proteinGoalG)}g goal`,
        action: 'Add one high-protein meal or snack on training days',
        facts: { avgProteinOnLowDays: avgLow, goal: Math.round(ctx.proteinGoalG), daysLow: low.length },
      };
    }
    case 'water_under': {
      const low = w7.filter(d => d.isLoggedDay && d.waterLogged < ctx.waterGoal * 0.7);
      const avgW = low.length ? Math.round(avg(low.map(d => d.waterLogged))) : 0;
      return {
        diagnosis: `Over the last 7 days, water intake averaging ${avgW} oz on low days, against a ${Math.round(ctx.waterGoal)} oz goal`,
        action: 'Add one extra glass at morning, lunch, and dinner',
        facts: { avgWater: avgW, goal: Math.round(ctx.waterGoal), daysLow: low.length },
      };
    }
    case 'sodium_high': {
      const high = foodDays7.filter(d => d.hasFoodData && d.sodium > 3450);
      const avgS = high.length ? Math.round(avg(high.map(d => d.sodium))) : 0;
      return {
        diagnosis: `Over the last 7 days, sodium averaging ${avgS}mg on ${high.length} of ${foodDays7.length} logged days`,
        action: 'Identify the highest-sodium meal each day and find a lower-sodium swap',
        facts: { avgSodium: avgS, daysHigh: high.length },
      };
    }
    case 'fiber_low': {
      const low = foodDays7.filter(d => d.hasFoodData && d.fiber < ctx.fiberGoal * 0.4);
      const avgF = low.length ? parseFloat((avg(low.map(d => d.fiber))).toFixed(1)) : 0;
      return {
        diagnosis: `Over the last 7 days, fiber averaging ${avgF}g on low days, well below the ${ctx.fiberGoal}g goal`,
        action: 'Add one high-fiber food such as legumes, vegetables, or whole grains to at least one meal each day',
        facts: { avgFiber: avgF, goal: ctx.fiberGoal, daysLow: low.length },
      };
    }
    case 'sugar_high': {
      const high = foodDays7.filter(d => d.hasFoodData && d.sugar > 75);
      const avgSug = high.length ? parseFloat((avg(high.map(d => d.sugar))).toFixed(1)) : 0;
      return {
        diagnosis: `Over the last 7 days, sugar averaging ${avgSug}g on ${high.length} of ${foodDays7.length} logged days`,
        action: 'Identify the primary sugar source and reduce frequency or portion',
        facts: { avgSugar: avgSug, daysHigh: high.length },
      };
    }
    case 'active_low': {
      const low = w7.filter(d => d.rawActive * burnAcc / 100 < ctx.activeCalGoal * 0.6);
      const adjActives = low.map(d => d.rawActive * burnAcc / 100);
      const avgA = adjActives.length ? Math.round(avg(adjActives)) : 0;
      return {
        diagnosis: `Over the last 7 days, active calories averaging ${avgA} on low days, against a ${ctx.activeCalGoal} goal`,
        action: 'Add 20 minutes of walking on the lowest-activity days',
        facts: { avgActive: avgA, goal: ctx.activeCalGoal, daysLow: low.length },
      };
    }
    case 'steps_low': {
      const low = w7.filter(d => d.steps < ctx.stepGoal * 0.6);
      const avgSt = low.length ? Math.round(avg(low.map(d => d.steps))) : 0;
      return {
        diagnosis: `Steps averaging ${avgSt.toLocaleString()} on ${low.length} of 7 days, against a ${ctx.stepGoal.toLocaleString()} goal`,
        action: 'Break up long sits with short walks to accumulate steps throughout the day',
        facts: { avgSteps: avgSt, goal: ctx.stepGoal, daysLow: low.length },
      };
    }
    case 'workout_low': {
      const scheduled = w7.filter(d => d.workoutScheduled);
      const low = scheduled.filter(d => d.workoutTotal > 0 && d.workoutChecked / d.workoutTotal < 0.6);
      return {
        diagnosis: `Over the last 7 days, workout completion rate low on ${low.length} of ${scheduled.length} scheduled days`,
        action: 'Identify what is cutting workouts short and remove that friction point',
        facts: { daysLow: low.length, scheduledDays: scheduled.length },
      };
    }
    case 'sleep_score_low': {
      const poor = w7.filter(d => d.sleepScore !== null && d.sleepScore < 65);
      const avgScore = poor.length ? Math.round(avg(poor.map(d => d.sleepScore!))) : 0;
      return {
        diagnosis: `Over the last 7 days, sleep score averaging ${avgScore} on ${poor.length} nights, below the 65 quality threshold`,
        action: 'Prioritize a consistent bedtime to improve sleep architecture',
        facts: { avgScore, daysLow: poor.length },
      };
    }
    case 'sleep_duration_short': {
      const short = w7.filter(d => d.sleepHours !== null && d.sleepHours < ctx.sleepGoal * 0.8);
      const avgH = short.length ? (Math.round(avg(short.map(d => d.sleepHours!)) * 10) / 10).toFixed(1) : '0.0';
      return {
        diagnosis: `Over the last 7 days, sleep duration averaging ${avgH} hours on ${short.length} nights, against a ${ctx.sleepGoal}h goal`,
        action: 'Move bedtime earlier by 30 minutes to reclaim the missing sleep',
        facts: { avgHours: avgH, goal: ctx.sleepGoal, daysShort: short.length },
      };
    }
    case 'sleep_bedtime_inconsistent': {
      return {
        diagnosis: 'Bedtime varying by more than 60 minutes across the last 7 nights',
        action: 'Pick a consistent bedtime and hold it within 30 minutes on weekends too',
        facts: {},
      };
    }
    case 'sleep_deep_low': {
      return {
        diagnosis: 'Deep sleep percentage consistently below 15% over the last 7 nights',
        action: 'Avoid alcohol and heavy meals within 3 hours of bedtime to protect deep sleep',
        facts: {},
      };
    }
    case 'activity_streak_low': {
      return {
        diagnosis: 'No meaningful activity logged for several consecutive days in the last week',
        action: 'Start with a 10-minute walk today to break the inactivity streak',
        facts: {},
      };
    }
    case 'log_consistency_low': {
      const logged = w7.filter(d => d.isLoggedDay).length;
      return {
        diagnosis: `Food logged on ${logged} of 7 days, making trends harder to read accurately`,
        action: 'Log at least 5 days this week to give the coach enough data to work with',
        facts: { loggedDays: logged },
      };
    }
    case 'weight_infrequent': {
      const weighIns = w14.filter(d => d.weight !== null);
      return {
        diagnosis: `Only ${weighIns.length} weigh-ins in the last 14 days, not enough for trend accuracy`,
        action: 'Weigh in at least 3 to 4 times per week at the same time each morning',
        facts: { weighIns: weighIns.length },
      };
    }
    case 'cal_small_gap': {
      const gapDays = foodDays7.filter(d => {
        const net = computeNet(d, burnAcc);
        const t = ctx.paceTarget ?? 0;
        return net > t + 50 && net < t + 250;
      });
      const avgGap = gapDays.length
        ? Math.round(avg(gapDays.map(d => computeNet(d, burnAcc) - (ctx.paceTarget ?? 0))))
        : 0;
      return {
        diagnosis: `Over the last 7 days, net calories running ${avgGap} calories above target on ${gapDays.length} of ${foodDays7.length} logged days`,
        action: 'Close the gap with one small swap per day, around 100 to 200 calories',
        facts: { avgGap, daysOver: gapDays.length },
      };
    }
    case 'weekend_spike': {
      const wknd = w14.filter(d => d.isWeekend && d.hasFoodData);
      const wkdy = w14.filter(d => !d.isWeekend && d.hasFoodData);
      const wkndAvg = wknd.length ? Math.round(avg(wknd.map(d => d.consumed))) : 0;
      const wkdyAvg = wkdy.length ? Math.round(avg(wkdy.map(d => d.consumed))) : 0;
      const delta = wkndAvg - wkdyAvg;
      return {
        diagnosis: `Over the last 14 days, weekend calories averaging ${wkndAvg}, versus ${wkdyAvg} on weekdays, a ${delta}-calorie gap`,
        action: 'Pick one weekend meal to anchor with a clear plan and let the rest stay flexible',
        facts: { weekendAvg: wkndAvg, weekdayAvg: wkdyAvg, delta },
      };
    }
    case 'cal_outlier_week': {
      const outlier = foodDays7.filter(d => computeNet(d, burnAcc) > (ctx.paceTarget ?? 0) + 900);
      const onTrack = foodDays7.filter(d => computeNet(d, burnAcc) <= (ctx.paceTarget ?? 0) + 100);
      const outlierCal = outlier.length ? Math.round(avg(outlier.map(d => d.consumed))) : 0;
      return {
        diagnosis: `Over the last 7 days, one high day at ${outlierCal} calories is the main outlier; ${onTrack.length} of ${foodDays7.length} days were on target`,
        action: 'Identify what drove the high day and build a plan for that scenario next time',
        facts: { outlierCal, onTrackDays: onTrack.length, totalDays: foodDays7.length },
      };
    }
    case 'cross_sodium_scale': {
      return {
        diagnosis: 'Over the last 14 days, weight spikes of 1 to 2 lbs are appearing the morning after high-sodium days',
        action: 'Expect the spike to clear within 24 to 48 hours as sodium returns to normal',
        facts: {},
      };
    }
    case 'cross_protein_sleep': {
      return {
        diagnosis: 'Over the two weeks we track, on the nights with sleep data your sleep scores are averaging higher after days with strong protein intake',
        action: 'Keep protein consistent to maintain the sleep quality pattern',
        facts: {},
      };
    }
    case 'cross_sleep_intake': {
      const poorNights = w14.filter(d => d.sleepScore !== null && d.sleepScore < 60 && d.hasFoodData);
      const goodNights = w14.filter(d => d.sleepScore !== null && d.sleepScore >= 80 && d.hasFoodData);
      const poorNextCal = poorNights.length ? Math.round(avg(poorNights.map(d => d.consumed))) : 0;
      const goodNextCal = goodNights.length ? Math.round(avg(goodNights.map(d => d.consumed))) : 0;
      const delta = poorNextCal - goodNextCal;
      return {
        diagnosis: `Over the last 14 days, after poor sleep, intake is running ${Math.abs(delta)} calories ${delta > 0 ? 'higher' : 'lower'} compared to well-rested days`,
        action: 'Plan for extra hunger the day after a rough night rather than relying on willpower alone',
        facts: { delta: Math.abs(delta), poorSleepCal: poorNextCal, goodSleepCal: goodNextCal },
      };
    }
    case 'cross_workout_intake': {
      const food14 = w14.filter(d => d.hasFoodData);
      const wkDays = food14.filter(d => d.workoutChecked > 0);
      const rstDays = food14.filter(d => d.workoutChecked === 0);
      const wkAvg = wkDays.length ? Math.round(avg(wkDays.map(d => d.consumed))) : 0;
      const rstAvg = rstDays.length ? Math.round(avg(rstDays.map(d => d.consumed))) : 0;
      return {
        diagnosis: `Over the last 14 days, intake is averaging ${rstAvg} on rest days versus ${wkAvg} on workout days, a ${rstAvg - wkAvg}-calorie gap`,
        action: 'Anchor rest-day meals to reduce the spread between workout and non-workout intake',
        facts: { workoutDayCal: wkAvg, restDayCal: rstAvg, delta: rstAvg - wkAvg },
      };
    }
    case 'cross_high_burn_overeating': {
      return {
        diagnosis: 'Over the last 14 days, high-burn days are correlating with higher intake, offsetting the calorie benefit of the extra activity',
        action: 'Plan meals ahead on high-activity days to avoid reactive eating after big burns',
        facts: {},
      };
    }
    case 'rec_load_drag': {
      const r = computeRecLoadDrag(w14);
      const n = r?.n ?? recEvrDays(w14).length;
      const delta = r?.delta ?? 0;
      return {
        diagnosis: `Over the last ${n} days, your recovery averages about ${delta} points lower the day after your highest-effort days`,
        action: 'Protect an easy or deload day after hard sessions so your body absorbs the work',
        facts: { delta, days: n },
      };
    }
    case 'rec_tracks_sleep': {
      const r = computeRecTracksSleep(w14, ctx.sleepGoal);
      const n = r?.n ?? recEvrDays(w14).length;
      const delta = r?.delta ?? 0;
      return {
        diagnosis: `Over the last ${n} days, your recovery averages about ${delta} points lower after nights under ${Math.round(ctx.sleepGoal)} hours than after fuller nights`,
        action: 'Treat sleep as your main recovery lever right now, not training volume',
        facts: { delta, days: n },
      };
    }
    case 'rec_sustained_low': {
      const r = computeRecSustainedLow(w14);
      const n = r?.n ?? recEvrDays(w14).length;
      const mean = r?.mean ?? 0;
      return {
        diagnosis: `Recovery has averaged ${mean} across the last ${n} days while training stayed steady`,
        action: 'Take a genuinely lighter week and let recovery catch up before pushing again',
        facts: { mean, days: n },
      };
    }
    case 'cross_steps_sleep': {
      return {
        diagnosis: 'Over the two weeks we track, on the nights with sleep data your sleep scores are averaging higher after days with strong step counts',
        action: 'Use morning walks to anchor daily movement and protect sleep quality',
        facts: {},
      };
    }
    case 'cross_fiber_calorie': {
      return {
        diagnosis: 'Higher-fiber days are correlating with lower total calorie intake over the 14-day window',
        action: 'Front-load fiber at breakfast and lunch to reduce overall intake naturally',
        facts: {},
      };
    }
    case 'protein_high': {
      const high = foodDays7.filter(d => d.protein > ctx.proteinGoalG * 1.1);
      const avgP = high.length ? Math.round(avg(high.map(d => d.protein))) : 0;
      return {
        diagnosis: `Over the last 7 days, protein averaging ${avgP}g on ${high.length} of ${foodDays7.length} logged days, consistently above the ${Math.round(ctx.proteinGoalG)}g goal`,
        action: 'Maintain the current food pattern',
        facts: { avgProtein: avgP, goal: Math.round(ctx.proteinGoalG), daysHigh: high.length },
      };
    }
    case 'water_high': {
      const hit = w7.filter(d => d.isLoggedDay && d.waterLogged >= ctx.waterGoal);
      return {
        diagnosis: `Hitting the ${Math.round(ctx.waterGoal)} oz water goal on ${hit.length} of 7 logged days`,
        action: 'Keep the current hydration routine',
        facts: { goal: Math.round(ctx.waterGoal), daysHit: hit.length },
      };
    }
    case 'active_high': {
      const hit = w7.filter(d => d.rawActive * burnAcc / 100 >= ctx.activeCalGoal);
      return {
        diagnosis: `Active calorie goal of ${ctx.activeCalGoal} hit on ${hit.length} of 7 days`,
        action: 'Maintain the current activity level',
        facts: { goal: ctx.activeCalGoal, daysHit: hit.length },
      };
    }
    case 'steps_high': {
      const hit = w7.filter(d => d.steps >= ctx.stepGoal);
      return {
        diagnosis: `Step goal of ${ctx.stepGoal.toLocaleString()} hit on ${hit.length} of 7 days`,
        action: 'Maintain the current movement routine',
        facts: { goal: ctx.stepGoal, daysHit: hit.length },
      };
    }
    case 'cal_goal_hit': {
      const hit = foodDays7.filter(d => {
        const net = computeNet(d, burnAcc);
        const t = ctx.paceTarget ?? 0;
        if (t < 0) return net <= t + 150;
        if (t > 0) return net >= t - 150;
        return Math.abs(net) <= 150;
      });
      return {
        diagnosis: `Over the last 7 days, calorie target hit on ${hit.length} of ${foodDays7.length} logged days`,
        action: 'Keep the current approach',
        facts: { daysHit: hit.length, totalLogged: foodDays7.length },
      };
    }
    case 'log_streak_strong': {
      const logged = w7.filter(d => d.isLoggedDay).length;
      return {
        diagnosis: `Food logged on ${logged} of the last 7 days, strong consistency`,
        action: 'Maintain the logging habit',
        facts: { loggedDays: logged },
      };
    }
    case 'sleep_score_high': {
      const high = w7.filter(d => d.sleepScore !== null && d.sleepScore! >= 85);
      const avgScore = high.length ? Math.round(avg(high.map(d => d.sleepScore!))) : 0;
      return {
        diagnosis: `Sleep score averaging ${avgScore} on ${high.length} of 7 nights, consistently strong`,
        action: 'Protect the current evening routine',
        facts: { avgScore, daysHigh: high.length },
      };
    }
    case 'if_consistent': {
      const ifDays = w7.filter(d => d.ifStart !== null && d.ifEnd !== null && d.ifTargetHours !== null);
      const onTarget = ifDays.filter(d => {
        const hrs = (d.ifEnd! - d.ifStart!) / 3600000;
        return Math.abs(hrs - d.ifTargetHours!) <= 0.5;
      });
      return {
        diagnosis: `Over the last 7 days, IF window on target on ${onTarget.length} of ${ifDays.length} tracked days`,
        action: 'Keep the current fasting schedule',
        facts: { daysOnTarget: onTarget.length, totalIF: ifDays.length },
      };
    }
    case 'if_inconsistent': {
      const ifDays = w7.filter(d => d.ifStart !== null && d.ifEnd !== null && d.ifTargetHours !== null);
      const broken = ifDays.filter(d => {
        const hrs = (d.ifEnd! - d.ifStart!) / 3600000;
        return hrs < d.ifTargetHours! - 1;
      });
      return {
        diagnosis: `Over the last 7 days, IF window broken short on ${broken.length} of ${ifDays.length} tracked days`,
        action: 'Identify the most common break point and build a strategy around it',
        facts: { daysBroken: broken.length, totalIF: ifDays.length },
      };
    }
    case 'if_late_close': {
      const ifDays = w7.filter(d => d.ifStart !== null && d.ifEnd !== null && d.ifTargetHours !== null);
      const late = ifDays.filter(d => {
        const hrs = (d.ifEnd! - d.ifStart!) / 3600000;
        return hrs - d.ifTargetHours! > 1.5;
      });
      const avgOver = late.length
        ? (Math.round(avg(late.map(d => (d.ifEnd! - d.ifStart!) / 3600000 - d.ifTargetHours!)) * 10) / 10).toFixed(1)
        : '0.0';
      return {
        diagnosis: `Over the last 7 days, eating window closing ${avgOver} hours past target on ${late.length} of ${ifDays.length} tracked days`,
        action: 'Set an alert for 30 minutes before the window closes to prepare for the fast',
        facts: { avgOverrun: avgOver, daysLate: late.length },
      };
    }
    default: {
      return {
        diagnosis: candidate.body.slice(0, 120),
        action: 'Stay consistent with the current approach',
        facts: {},
      };
    }
  }
}

interface Safety9Result {
  scenario: string;
  diagnosis: string;
  action: string;
  facts: Record<string, string | number>;
  careSeverity: 'mild' | 'moderate' | 'strong';
}

function checkFamily9Safety(w7: WindowDay[], ctx: EngineContext): Safety9Result | null {
  if (ctx.bmr <= 0) return null;

  const foodDays = w7.filter(d => d.hasFoodData && d.bmr > 0);
  if (foodDays.length >= 4) {
    const veryLow = foodDays.filter(d => d.consumed < d.bmr * 0.7);
    if (veryLow.length >= 3) {
      const avgCal = Math.round(avg(veryLow.map(d => d.consumed)));
      const avgBmr = Math.round(avg(veryLow.map(d => d.bmr)));
      const severity: 'mild' | 'moderate' | 'strong' =
        veryLow.length >= 6 ? 'strong' : veryLow.length >= 4 ? 'moderate' : 'mild';
      return {
        scenario: '9.1',
        diagnosis: `Intake has averaged ${avgCal} calories over ${veryLow.length} logged days, significantly below the estimated BMR of ${avgBmr}`,
        action: 'Bring intake closer to BMR to protect muscle mass and metabolic rate',
        facts: { avgCal, avgBmr, daysLow: veryLow.length },
        careSeverity: severity,
      };
    }
  }

  const weighIns = w7.filter(d => d.weight !== null).sort((a, b) => a.dateKey < b.dateKey ? -1 : 1);
  if (weighIns.length >= 3) {
    const startWeight = weighIns[0].weight!;
    const endWeight = weighIns[weighIns.length - 1].weight!;
    if (startWeight > 0 && endWeight < startWeight) {
      // Use actual calendar days between first and last weigh-in.
      // Require at least 5 days of span to avoid false alarms from normal daily fluctuation.
      const firstDate = new Date(weighIns[0].dateKey);
      const lastDate = new Date(weighIns[weighIns.length - 1].dateKey);
      const daySpan = Math.round((lastDate.getTime() - firstDate.getTime()) / 86400000);
      if (daySpan < 5) return null;
      const weeklyRate = ((startWeight - endWeight) / daySpan) * 7;
      const weeklyPct = weeklyRate / startWeight;
      if (weeklyPct > 0.01) {
        const severity: 'mild' | 'moderate' | 'strong' =
          weeklyPct > 0.02 ? 'strong' : weeklyPct > 0.015 ? 'moderate' : 'mild';
        return {
          scenario: '9.2',
          diagnosis: `Weight dropping at approximately ${(weeklyPct * 100).toFixed(1)}% per week on a ${Math.round(startWeight)} lb frame, past the safe pace of 1%`,
          action: 'Increase intake by 150 to 200 calories per day to bring the rate of loss back to a healthy pace',
          facts: {
            weeklyRateLbs: weeklyRate.toFixed(1),
            weeklyPct: (weeklyPct * 100).toFixed(1),
            startWeight: Math.round(startWeight),
          },
          careSeverity: severity,
        };
      }
    }
  }

  return null;
}

// Coarse headline topic for anti-repeat rotation. The net/weight/cal rules all
// read as one "weight" story to the user, so they share a bucket; everything
// else uses its own rule prefix. Used only to rotate the daily headline.
function headlineTopic(ruleId: string): string {
  const t = ruleId.split('_')[0];
  if (t === 'net' || t === 'cal' || t === 'weight') return 'weight';
  return t;
}

// recentTopics: most-recent-first list of headline topics led on prior computes.
// Empty (the default) = NO fatigue, byte-identical to the old family/tier spine,
// so every caller that does not pass it is completely unaffected.
function selectByPrioritySpine(
  candidates: CandidateTip[],
  _ctx: EngineContext,
  excludeRuleIds: string[] = [],
  recentTopics: string[] = [],
): CandidateTip | null {
  if (candidates.length === 0) return null;
  const TIER_RANK_SPINE: Record<SmartTipTier, number> = { urgent: 3, pattern: 2, insight: 1 };
  const FATIGUE_BY_RECENCY = [2.0, 1.2, 0.6]; // penalty if this topic led 1/2/3 computes ago

  const fatiguePenalty = (ruleId: string): number => {
    if (recentTopics.length === 0) return 0;
    const topic = headlineTopic(ruleId);
    let penalty = 0;
    for (let i = 0; i < recentTopics.length && i < FATIGUE_BY_RECENCY.length; i++) {
      if (recentTopics[i] === topic) penalty = Math.max(penalty, FATIGUE_BY_RECENCY[i]);
    }
    return penalty;
  };

  // Lower score wins. family (1..7) dominates; tier breaks ties within a family
  // (urgent best, +0.1/0.2 never crosses a family); fatigue pushes a recently-led
  // topic down by up to ~2 families so the headline rotates instead of repeating.
  const score = (c: CandidateTip): number =>
    (RULE_FAMILY[c.ruleId] ?? 99)
    + (3 - TIER_RANK_SPINE[c.tier]) * 0.1
    + fatiguePenalty(c.ruleId);

  const pick = (pool: CandidateTip[]): CandidateTip | null => {
    const corrective = pool.filter(c => !c.positive);
    const positive = pool.filter(c => c.positive);
    const ranked = corrective.length > 0 ? corrective : positive;
    return [...ranked].sort((a, b) => score(a) - score(b))[0] ?? null;
  };

  if (excludeRuleIds.length > 0) {
    const without = candidates.filter(c => !excludeRuleIds.includes(c.ruleId));
    if (without.length > 0) return pick(without);
  }

  return pick(candidates);
}

// ── DEV diagnostic: dump the home spine candidates with full score breakdown ──
// Read-only. Mirrors computeCoachPacket's home else-branch exactly (runAllRules ->
// Mindful suppression -> selectByPrioritySpine scoring) so we can SEE whether a
// non-weight corrective is competing and whether the fatigue penalty is landing.
// Does not touch any storage, does not affect the live coach.
export interface CoachCandidateRow {
  ruleId: string;
  scenario: string;
  topic: string;
  family: number;
  tier: SmartTipTier;
  positive: boolean;
  fatigue: number;
  score: number;
  excluded: boolean;
}
export interface CoachCandidateDump {
  recentTopics: string[];
  loggedCount: number;
  override: 'safety' | 'sparse-data' | null;
  correctiveCount: number;
  positiveCount: number;
  poolUsed: 'corrective' | 'positive' | 'none';
  rows: CoachCandidateRow[];
  selectedRuleId: string | null;
  selectedTitle: string | null;
  proteinDebug: {
    goal: number;
    last7: (number | null)[];   // protein per day, most-recent-first; null = no food logged
    under80Count: number;       // days < 80% goal (pattern threshold, needs >=4)
    under50CountW5: number;     // days < 50% goal in last 5 (urgent threshold, needs >=3)
    loggedFoodDaysW7: number;
    loggedFoodDaysW5: number;
    patternFires: boolean;
    urgentFires: boolean;
  };
}

export async function dumpHomeCoachCandidates(): Promise<CoachCandidateDump> {
  const todayKey = todayDateKey();
  const [lastRuleRaw, topicHistRaw, store, workoutRaw] = await Promise.all([
    AsyncStorage.getItem('pj_coach_last_rule_home'),
    AsyncStorage.getItem('pj_coach_topic_hist_home'),
    loadSmartTips(),
    AsyncStorage.getItem('pj_workout_state').catch(() => null),
  ]);
  let recentTopics: string[] = [];
  try { recentTopics = topicHistRaw ? (JSON.parse(topicHistRaw) || []) : []; } catch { recentTopics = []; }
  const persistedLastRuleId: string | null = lastRuleRaw ? JSON.parse(lastRuleRaw).ruleId : null;

  const ctx = await buildEngineContext(todayKey);
  const tipStore: SmartTipsStore = store ?? {
    activeTips: [], recentHistory: [], cooldowns: {},
    variantHistory: {}, lastComputed: '', topicLedger: {},
  };
  const workoutState: any = workoutRaw ? JSON.parse(workoutRaw) : {};

  const allDays = await loadWindowDays(todayKey, ctx, workoutState);
  const w14 = allDays.slice(0, 14);
  const w7 = allDays.slice(0, 7);
  const w5 = allDays.slice(0, 5);
  const loggedCount = loggedDaysInWindow(w7);

  const safety9 = checkFamily9Safety(w7, ctx);
  const override: 'safety' | 'sparse-data' | null =
    safety9 ? 'safety' : (loggedCount < 4 ? 'sparse-data' : null);

  const rawCandidates = runAllRules(w7, w5, w14, ctx, tipStore);
  const suppressed = applyMindfulSuppression(rawCandidates, ctx);

  // Mirror selectByPrioritySpine scoring exactly.
  const TIER_RANK_SPINE: Record<SmartTipTier, number> = { urgent: 3, pattern: 2, insight: 1 };
  const FATIGUE_BY_RECENCY = [2.0, 1.2, 0.6];
  const fatiguePenalty = (ruleId: string): number => {
    if (recentTopics.length === 0) return 0;
    const topic = headlineTopic(ruleId);
    let penalty = 0;
    for (let i = 0; i < recentTopics.length && i < FATIGUE_BY_RECENCY.length; i++) {
      if (recentTopics[i] === topic) penalty = Math.max(penalty, FATIGUE_BY_RECENCY[i]);
    }
    return penalty;
  };
  const scoreOf = (c: CandidateTip): number =>
    (RULE_FAMILY[c.ruleId] ?? 99) + (3 - TIER_RANK_SPINE[c.tier]) * 0.1 + fatiguePenalty(c.ruleId);

  const excludeRuleIds = persistedLastRuleId ? [persistedLastRuleId] : [];
  let pool = suppressed;
  if (excludeRuleIds.length > 0) {
    const without = suppressed.filter(c => !excludeRuleIds.includes(c.ruleId));
    if (without.length > 0) pool = without;
  }
  const corrective = pool.filter(c => !c.positive);
  const positive = pool.filter(c => c.positive);
  const ranked = corrective.length > 0 ? corrective : positive;
  const poolUsed: 'corrective' | 'positive' | 'none' =
    ranked.length === 0 ? 'none' : (corrective.length > 0 ? 'corrective' : 'positive');
  const selected = [...ranked].sort((a, b) => scoreOf(a) - scoreOf(b))[0] ?? null;

  const rows: CoachCandidateRow[] = suppressed
    .map(c => ({
      ruleId: c.ruleId,
      scenario: RULE_SCENARIO[c.ruleId] ?? '',
      topic: headlineTopic(c.ruleId),
      family: RULE_FAMILY[c.ruleId] ?? 99,
      tier: c.tier,
      positive: c.positive,
      fatigue: fatiguePenalty(c.ruleId),
      score: scoreOf(c),
      excluded: excludeRuleIds.includes(c.ruleId),
    }))
    .sort((a, b) => a.score - b.score);

  // Protein diagnostic: show exactly why ruleProteinUnder did or did not fire,
  // since EvR's average-based detection and home's day-count detection disagree.
  const pGoal = ctx.proteinGoalG;
  const foodDaysW7 = w7.filter(d => d.hasFoodData);
  const foodDaysW5 = w5.filter(d => d.hasFoodData);
  const under80Count = pGoal > 0 ? foodDaysW7.filter(d => d.protein < pGoal * 0.8).length : 0;
  const under50CountW5 = pGoal > 0 ? foodDaysW5.filter(d => d.protein < pGoal * 0.5).length : 0;
  const proteinDebug = {
    goal: pGoal,
    last7: w7.map(d => d.hasFoodData ? Math.round(d.protein) : null),
    under80Count,
    under50CountW5,
    loggedFoodDaysW7: foodDaysW7.length,
    loggedFoodDaysW5: foodDaysW5.length,
    patternFires: pGoal > 0 && under80Count >= 4 && loggedDaysInWindow(w7) >= 6,
    urgentFires: pGoal > 0 && under50CountW5 >= 3 && loggedDaysInWindow(w5) >= 4,
  };

  return {
    recentTopics,
    loggedCount,
    override,
    correctiveCount: corrective.length,
    positiveCount: positive.length,
    poolUsed,
    rows,
    selectedRuleId: selected?.ruleId ?? null,
    selectedTitle: selected?.title ?? null,
    proteinDebug,
  };
}

export async function computeCoachPacket(
  surface: 'home' | 'day_summary' | 'evr' = 'home',
  windowDays: number = 14,
): Promise<CoachTipCache> {
  const todayKey = todayDateKey();
  const coachLastRuleKey = `pj_coach_last_rule_${surface}`;
  const coachTopicHistKey = `pj_coach_topic_hist_${surface}`;
  const [existing, lastRuleRaw, topicHistRaw] = await Promise.all([
    loadCoachTipCache(),
    AsyncStorage.getItem(coachLastRuleKey),
    AsyncStorage.getItem(coachTopicHistKey),
  ]);
  const persistedLastRuleId: string | null = lastRuleRaw ? JSON.parse(lastRuleRaw).ruleId : null;
  // Headline-topic rotation history (NEW key, additive). Home only for now;
  // every other surface passes [] below so its ranking is unchanged.
  let recentTopicHist: string[] = [];
  try { recentTopicHist = topicHistRaw ? (JSON.parse(topicHistRaw) || []) : []; } catch { recentTopicHist = []; }
  const recentTopics = surface === 'home' ? recentTopicHist : [];

  // Return cache if already computed today for this surface
  if (
    existing &&
    existing.packet.computedDate === todayKey &&
    existing.packet.surface === surface
  ) {
    return existing;
  }

  const [ctx, store, workoutRaw] = await Promise.all([
    buildEngineContext(todayKey),
    loadSmartTips(),
    AsyncStorage.getItem('pj_workout_state').catch(() => null),
  ]);

  const tipStore: SmartTipsStore = store ?? {
    activeTips: [], recentHistory: [], cooldowns: {},
    variantHistory: {}, lastComputed: '', topicLedger: {},
  };
  const workoutState: any = workoutRaw ? JSON.parse(workoutRaw) : {};

  const allDays = await loadWindowDays(todayKey, ctx, workoutState);
  const w14 = allDays.slice(0, Math.min(windowDays, 14));
  const w7 = allDays.slice(0, 7);
  const w5 = allDays.slice(0, 5);

  const loggedCount = loggedDaysInWindow(w7);

  const previousTip = existing?.aiBody ?? existing?.packet.fallbackBody ?? 'none';

  let faithTier = 'rooted';
  try {
    const s = await AsyncStorage.getItem('pj_settings');
    if (s) { const parsed = JSON.parse(s); faithTier = parsed?.faithJourney ?? 'rooted'; }
  } catch {}

  let packet: CoachPacket;

  const safety9 = checkFamily9Safety(w7, ctx);

  if (safety9) {
    packet = {
      scenario: safety9.scenario,
      ruleId: `safety_${safety9.scenario}`,
      familyNum: 9,
      diagnosis: safety9.diagnosis,
      action: safety9.action,
      facts: safety9.facts,
      tone: 'care',
      careSeverity: safety9.careSeverity,
      mode: ctx.styleMode,
      goal: ctx.goalBucket,
      surface,
      windowDays,
      ifActive: ctx.ifEnabled,
      previousTip,
      faithTier,
      computedDate: todayKey,
      fallbackTitle: 'A Note on Your Pace',
      fallbackBody: `Something worth flagging. ${safety9.diagnosis}. ${safety9.action}.`,
    };
  } else if (loggedCount < 4) {
    packet = {
      scenario: '5.5',
      ruleId: 'log_consistency_low',
      familyNum: 5,
      diagnosis: `Only ${loggedCount} of 7 days have logged data, not enough for reliable trend analysis`,
      action: 'Log food on at least 5 days this week to unlock full coaching insights',
      facts: { loggedDays: loggedCount },
      tone: 'corrective',
      mode: ctx.styleMode,
      goal: ctx.goalBucket,
      surface,
      windowDays,
      ifActive: ctx.ifEnabled,
      previousTip,
      faithTier,
      computedDate: todayKey,
      fallbackTitle: 'Building Your Picture',
      fallbackBody: `The coach has ${loggedCount} logged days to work with. Log food on 5 or more days this week to get a full read on what is working.`,
    };
  } else {
    const rawCandidates = runAllRules(w7, w5, w14, ctx, tipStore);
    const suppressed = applyMindfulSuppression(rawCandidates, ctx);
    const lastRuleId = persistedLastRuleId ?? existing?.packet.ruleId;
    const selected = selectByPrioritySpine(suppressed, ctx, lastRuleId ? [lastRuleId] : [], recentTopics);

    if (!selected) {
      packet = {
        scenario: '6.0',
        ruleId: 'cal_goal_hit',
        familyNum: 6,
        diagnosis: 'All tracked metrics are within range for the week',
        action: 'Maintain the current approach',
        facts: { loggedDays: loggedCount },
        tone: 'positive',
        mode: ctx.styleMode,
        goal: ctx.goalBucket,
        surface,
        windowDays,
        ifActive: ctx.ifEnabled,
        previousTip,
        faithTier,
        computedDate: todayKey,
        fallbackTitle: 'Looking Good',
        fallbackBody: 'Everything is tracking in range this week. Keep the current approach going.',
      };
    } else {
      const { diagnosis, action, facts } = buildDiagnosisActionFacts(selected, w7, w14, ctx);
      const tone = deriveTone(selected);

      packet = {
        scenario: RULE_SCENARIO[selected.ruleId] ?? selected.ruleId,
        ruleId: selected.ruleId,
        familyNum: RULE_FAMILY[selected.ruleId] ?? 0,
        diagnosis,
        action,
        facts,
        tone,
        mode: ctx.styleMode,
        goal: ctx.goalBucket,
        surface,
        windowDays,
        ifActive: ctx.ifEnabled,
        previousTip,
        faithTier,
        computedDate: todayKey,
        fallbackTitle: selected.title,
        fallbackBody: selected.body,
      };
    }
  }

  // Read-then-merge: preserve AI output if scenario unchanged from prior run today
  const sameScenario = existing?.packet.scenario === packet.scenario;
  const cache: CoachTipCache = {
    packet,
    aiBody: (sameScenario && existing?.aiBody) ? existing.aiBody : null,
    aiGeneratedDate: (sameScenario && existing?.aiGeneratedDate) ? existing.aiGeneratedDate : null,
    fallbackUsed: false,
  };

  const savePromises = [
    saveCoachTipCache(cache),
    AsyncStorage.setItem(coachLastRuleKey, JSON.stringify({ ruleId: packet.ruleId })),
  ];
  if (surface === 'home') {
    const newHist = [headlineTopic(packet.ruleId), ...recentTopicHist].slice(0, 3);
    savePromises.push(AsyncStorage.setItem(coachTopicHistKey, JSON.stringify(newHist)));
  }
  await Promise.all(savePromises);
  return cache;
}

// ── Sleep Coach: Level 1 scoped to sleep ──────────────────────────────────────
// Same brain + AI + cleanup pipeline as the home coach, but candidate findings are
// restricted to the sleep rule set so the headline is always about sleep. Powers
// the Sleep Hub "Sleep Coach" card. No Family 9 (calorie-safety) branch and no food
// logging gate; gates on sleep nights instead. Recovery (HRV/RHR) is a future surface.
const SLEEP_COACH_RULE_IDS = new Set([
  'sleep_score_low', 'sleep_duration_short', 'sleep_bedtime_inconsistent',
  'sleep_deep_low', 'sleep_score_high', 'cross_protein_sleep', 'cross_steps_sleep',
]);

export async function computeCoachPacketSleep(
  windowDays: number = 14,
): Promise<CoachTipCache> {
  const todayKey = todayDateKey();
  const sleepLastRuleKey = 'pj_coach_last_rule_sleep';
  const [existing, lastRuleRaw] = await Promise.all([
    loadCoachTipCacheSleep(),
    AsyncStorage.getItem(sleepLastRuleKey),
  ]);
  const persistedLastRuleId: string | null = lastRuleRaw ? JSON.parse(lastRuleRaw).ruleId : null;

  if (existing && existing.packet.computedDate === todayKey && existing.packet.surface === 'sleep') {
    return existing;
  }

  const [ctx, store, workoutRaw] = await Promise.all([
    buildEngineContext(todayKey),
    loadSmartTips(),
    AsyncStorage.getItem('pj_workout_state').catch(() => null),
  ]);

  const tipStore: SmartTipsStore = store ?? {
    activeTips: [], recentHistory: [], cooldowns: {},
    variantHistory: {}, lastComputed: '', topicLedger: {},
  };
  const workoutState: any = workoutRaw ? JSON.parse(workoutRaw) : {};

  // startOffset 0: include last night, so the coach analyzes the same recent nights
  // the Sleep Hub shows (not the window ending yesterday).
  const allDays = await loadWindowDays(todayKey, ctx, workoutState, 0);
  const w14 = allDays.slice(0, 14);
  const w7 = allDays.slice(0, 7);
  const w5 = allDays.slice(0, 5);

  const sleepNights = w7.filter(d => d.sleepHours !== null && d.sleepHours > 0).length;
  const previousTip = existing?.aiBody ?? existing?.packet.fallbackBody ?? 'none';

  let faithTier = 'rooted';
  try {
    const s = await AsyncStorage.getItem('pj_settings');
    if (s) { const parsed = JSON.parse(s); faithTier = parsed?.faithJourney ?? 'rooted'; }
  } catch {}

  let packet: CoachPacket;

  if (sleepNights < 3) {
    packet = {
      scenario: 'sleep_data_low',
      ruleId: 'sleep_data_low',
      familyNum: 5,
      diagnosis: `Only ${sleepNights} of the last 7 nights have sleep data, not enough for reliable sleep coaching`,
      action: 'Log or sync a few more nights to unlock sleep insights',
      facts: { sleepNights },
      tone: 'corrective',
      mode: ctx.styleMode,
      goal: ctx.goalBucket,
      surface: 'sleep',
      windowDays,
      ifActive: ctx.ifEnabled,
      previousTip,
      faithTier,
      computedDate: todayKey,
      fallbackTitle: 'Building Your Sleep Picture',
      fallbackBody: `The coach has ${sleepNights} of 7 nights to work with. Track or sync a few more nights to get a full read on your sleep.`,
    };
  } else {
    const rawCandidates = runAllRules(w7, w5, w14, ctx, tipStore);
    const suppressed = applyMindfulSuppression(rawCandidates, ctx);
    const sleepCandidates = suppressed.filter(c => SLEEP_COACH_RULE_IDS.has(c.ruleId));
    const selected = selectByPrioritySpine(sleepCandidates, ctx, persistedLastRuleId ? [persistedLastRuleId] : []);

    if (!selected) {
      packet = {
        scenario: 'sleep_steady',
        ruleId: 'sleep_steady',
        familyNum: 6,
        diagnosis: 'Sleep is tracking in a healthy range across the week',
        action: 'Keep the current sleep routine going',
        facts: { sleepNights },
        tone: 'positive',
        mode: ctx.styleMode,
        goal: ctx.goalBucket,
        surface: 'sleep',
        windowDays,
        ifActive: ctx.ifEnabled,
        previousTip,
        faithTier,
        computedDate: todayKey,
        fallbackTitle: 'Sleep Looking Good',
        fallbackBody: 'Your sleep is tracking in a healthy range this week. Keep the routine that is working.',
      };
    } else {
      const { diagnosis, action, facts } = buildDiagnosisActionFacts(selected, w7, w14, ctx);
      const tone = deriveTone(selected);
      packet = {
        scenario: RULE_SCENARIO[selected.ruleId] ?? selected.ruleId,
        ruleId: selected.ruleId,
        familyNum: RULE_FAMILY[selected.ruleId] ?? 0,
        diagnosis,
        action,
        facts,
        tone,
        mode: ctx.styleMode,
        goal: ctx.goalBucket,
        surface: 'sleep',
        windowDays,
        ifActive: ctx.ifEnabled,
        previousTip,
        faithTier,
        computedDate: todayKey,
        fallbackTitle: selected.title,
        fallbackBody: selected.body,
      };
    }
  }

  const sameScenario = existing?.packet.scenario === packet.scenario;
  const cache: CoachTipCache = {
    packet,
    aiBody: (sameScenario && existing?.aiBody) ? existing.aiBody : null,
    aiGeneratedDate: (sameScenario && existing?.aiGeneratedDate) ? existing.aiGeneratedDate : null,
    fallbackUsed: false,
  };

  await Promise.all([
    saveCoachTipCacheSleep(cache),
    AsyncStorage.setItem(sleepLastRuleKey, JSON.stringify({ ruleId: packet.ruleId })),
  ]);
  return cache;
}

// ── Recovery Coach (Recovery tab) ─────────────────────────────────────────────
// Pattern-detection coach: correlates the daily recovery score against the user's
// own logged sleep / training load / bedtime over the window and surfaces the
// dominant lever. Hybrid: this brain decides the verdict, coachAI.ts voices it.
// Behavioral, never clinical. STRICT: prefers the honest "no clear cause" answer
// over a shaky pattern. Spec: SPEC_recovery_coach.md.

const COACH_TIP_RECOVERY_KEY = 'pj_coach_tip_recovery';
const COACH_LAST_RULE_RECOVERY_KEY = 'pj_coach_last_rule_recovery';

export async function loadCoachTipCacheRecovery(): Promise<CoachTipCache | null> {
  try {
    const raw = await AsyncStorage.getItem(COACH_TIP_RECOVERY_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
async function saveCoachTipCacheRecovery(cache: CoachTipCache): Promise<void> {
  try { await storageSet(COACH_TIP_RECOVERY_KEY, JSON.stringify(cache)); } catch {}
}

// Today's live snapshot passed in from the hub (RecoveryResult-shaped). Lets the
// snapshot floor (R8) cite the real HRV/RHR/resp standing without a baseline store.
export type RecoveryLiveToday = {
  score: number | null;
  hrv: { value: string; delta: string | null; isPositive: boolean | null } | null;
  rhr: { value: string; delta: string | null; isPositive: boolean | null } | null;
  resp: { value: string; delta: string | null; isPositive: boolean | null } | null;
} | null;

// Strict thresholds (tune with real data; SPEC_recovery_coach.md).
const REC_MIN_PATTERN_DAYS = 10;   // below this: snapshot only, no pattern claims
const REC_MIN_PAIRS = 3;           // min days in each bucket for a split comparison
const REC_ACUTE_DROP = 12;         // pts below recent norm = acute drop (R0)
const REC_PATTERN_DELTA = 6;       // pts separation to claim a behavioral pattern
const REC_LOW_MEAN = 70;           // window mean below this = under-recovery (R3)
const REC_STRONG_MEAN = 80;        // window mean at/above + stable = strong (R7)
const REC_BEDTIME_SD = 60;         // bedtime std-dev (min) above this = inconsistent (R4)

type RecFinding = {
  ruleId: string; scenario: string; familyNum: number;
  tone: 'positive' | 'corrective' | 'educational';
  diagnosis: string; action: string; facts: Record<string, string | number>;
  fallbackTitle: string; fallbackBody: string;
};

const recAvg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const recStd = (xs: number[]) => {
  const m = recAvg(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length);
};

// Snapshot floor (R8): describe today's state from the live signals. building=true
// appends the honest "still building" note when under the pattern-data threshold.
function recSnapshotFinding(score: number, live: RecoveryLiveToday, n: number, building: boolean): RecFinding {
  const note = building ? ` Still building your recovery picture (${n} of 14 nights).` : '';
  if (live?.hrv && live.hrv.isPositive === false) {
    return {
      ruleId: 'rec_snapshot_hrv', scenario: 'rec_snapshot_hrv', familyNum: 4, tone: 'corrective',
      diagnosis: `HRV came in at ${live.hrv.value}${live.hrv.delta ? `, ${live.hrv.delta} vs your baseline` : ''}, below your norm, with recovery at ${score}.${note}`,
      action: 'Keep today on the easier side and protect tonight\'s sleep',
      facts: { score },
      fallbackTitle: 'Recovery Worth Watching',
      fallbackBody: `Recovery is ${score} today with HRV below your norm. Keep today easier and protect tonight's sleep.${note}`,
    };
  }
  if (live?.rhr && live.rhr.isPositive === false) {
    return {
      ruleId: 'rec_snapshot_rhr', scenario: 'rec_snapshot_rhr', familyNum: 4, tone: 'corrective',
      diagnosis: `Resting heart rate is elevated at ${live.rhr.value}${live.rhr.delta ? ` (${live.rhr.delta} vs baseline)` : ''}, with recovery at ${score}.${note}`,
      action: 'Treat today as a lighter day, hydrate well, and protect tonight\'s sleep',
      facts: { score },
      fallbackTitle: 'Recovery Worth Watching',
      fallbackBody: `Recovery is ${score} today with resting heart rate up versus your norm. Take it a little easier today.${note}`,
    };
  }
  if (score >= 80) {
    return {
      ruleId: 'rec_snapshot_strong', scenario: 'rec_strong', familyNum: 6, tone: 'positive',
      diagnosis: `Recovery is strong at ${score} today, signals point to full readiness.${note}`,
      action: 'Match today\'s effort to that readiness',
      facts: { score },
      fallbackTitle: 'Recovered and Ready',
      fallbackBody: `Recovery is strong at ${score} today. Signals point to full readiness, so match your effort to it.${note}`,
    };
  }
  if (score >= 60) {
    return {
      ruleId: 'rec_snapshot_steady', scenario: 'rec_steady', familyNum: 6, tone: 'positive',
      diagnosis: `Recovery is at ${score} today, in the ready zone.${note}`,
      action: 'Train or rest based on your plan, not the number',
      facts: { score },
      fallbackTitle: 'Steady Recovery',
      fallbackBody: `Recovery is at ${score}, in the ready zone. Train or rest based on your plan, not the number.${note}`,
    };
  }
  return {
    ruleId: 'rec_snapshot_low', scenario: 'rec_moderate', familyNum: 4, tone: 'corrective',
    diagnosis: `Recovery is sitting at ${score} today, signals suggest moderate readiness.${note}`,
    action: 'Useful training is still possible, just be honest about your top end',
    facts: { score },
    fallbackTitle: 'Moderate Readiness',
    fallbackBody: `Recovery is at ${score} today. Not an alarm, but signals suggest moderate readiness. Train if you like, just be honest about your top end.${note}`,
  };
}

// The recovery brain. Returns the single highest-priority finding for the window.
function buildRecoveryFinding(days: WindowDay[], live: RecoveryLiveToday, sleepGoal: number): RecFinding | null {
  const recDays = days.filter(d => d.recoveryScore !== null && !d.excluded); // most-recent-first
  if (recDays.length === 0) return null;
  const scores = recDays.map(d => d.recoveryScore as number);
  const n = recDays.length;
  const todayScore = scores[0];

  const byDate: Record<string, WindowDay> = {};
  for (const d of days) byDate[d.dateKey] = d;
  const prevOf = (d: WindowDay): WindowDay | null => byDate[keyForOffset(d.dateKey, 1)] ?? null;

  // R0 ACUTE DROP (same-day). Needs a few prior days to define a norm.
  const prior = scores.slice(1, 9);
  if (prior.length >= 4) {
    const norm = recAvg(prior);
    if (todayScore <= norm - REC_ACUTE_DROP) {
      const drop = Math.round(norm - todayScore);
      return {
        ruleId: 'rec_acute_drop', scenario: 'rec_acute_drop', familyNum: 0, tone: 'corrective',
        diagnosis: `Today's recovery is ${todayScore}, down ${drop} from your recent average of ${Math.round(norm)}`,
        action: 'Treat today as an easy day and see how you bounce back tomorrow',
        facts: { today: todayScore, recentAvg: Math.round(norm), drop },
        fallbackTitle: 'Recovery Dropped Today',
        fallbackBody: `Recovery is ${todayScore} today, down ${drop} from your recent average. A rough night, a hard day, alcohol, or early illness can all do this. Keep today easy and see how you bounce back.`,
      };
    }
  }

  // Below the pattern-data threshold: snapshot only, no pattern claims.
  if (n < REC_MIN_PATTERN_DAYS) return recSnapshotFinding(todayScore, live, n, true);

  const mean = recAvg(scores);
  const sd = recStd(scores);

  // R1 training load drags next-day recovery: split recDays by PRIOR day's load.
  const actives = days.map(d => d.rawActive).filter(a => a > 0).sort((a, b) => a - b);
  const highCut = actives.length >= 3 ? actives[Math.floor(actives.length * 0.66)] : Infinity;
  const afterHigh: number[] = [], afterLow: number[] = [];
  for (const d of recDays) {
    const p = prevOf(d);
    if (!p || p.rawActive <= 0) continue;
    (p.rawActive >= highCut ? afterHigh : afterLow).push(d.recoveryScore as number);
  }
  const r1Delta = (afterHigh.length >= REC_MIN_PAIRS && afterLow.length >= REC_MIN_PAIRS)
    ? recAvg(afterLow) - recAvg(afterHigh) : 0; // positive = recovery lower after hard days

  // R2 recovery tracks sleep: split by short vs adequate sleep nights.
  const shortS: number[] = [], okS: number[] = [];
  for (const d of recDays) {
    if (d.sleepHours === null) continue;
    (d.sleepHours < sleepGoal * 0.9 ? shortS : okS).push(d.recoveryScore as number);
  }
  const r2Delta = (shortS.length >= REC_MIN_PAIRS && okS.length >= REC_MIN_PAIRS)
    ? recAvg(okS) - recAvg(shortS) : 0; // positive = recovery lower on short nights

  // Pick the stronger of the two behavioral drivers if either clears the bar.
  if (r1Delta >= REC_PATTERN_DELTA || r2Delta >= REC_PATTERN_DELTA) {
    if (r2Delta >= r1Delta) {
      const d = Math.round(r2Delta);
      return {
        ruleId: 'rec_tracks_sleep', scenario: 'rec_tracks_sleep', familyNum: 3, tone: 'educational',
        diagnosis: `Over the last ${n} days, your recovery averages about ${d} points lower after nights under ${sleepGoal} hours than after fuller nights`,
        action: 'Treat sleep as your main recovery lever right now, not training volume',
        facts: { delta: d, days: n },
        fallbackTitle: 'Sleep Is Your Lever',
        fallbackBody: `Your lowest recovery days are following your shortest nights, not your hardest workouts. Sleep, not the gym, looks like your main lever right now.`,
      };
    }
    const d = Math.round(r1Delta);
    return {
      ruleId: 'rec_load_drag', scenario: 'rec_load_drag', familyNum: 3, tone: 'educational',
      diagnosis: `Over the last ${n} days, your recovery averages about ${d} points lower the day after your highest-effort days`,
      action: 'Protect an easy or deload day after hard sessions so your body absorbs the work',
      facts: { delta: d, days: n },
      fallbackTitle: 'Recover From Your Hard Days',
      fallbackBody: `Your recovery dips the day after your hardest days. The fix usually is not training harder, it is protecting an easy day so your body absorbs the work.`,
    };
  }

  // R3 sustained under-recovery: persistently low + steady + training present.
  const trainingDays = recDays.filter(d => d.rawActive > 0 || d.workoutChecked > 0).length;
  if (mean < REC_LOW_MEAN && sd < 12 && trainingDays >= n * 0.5) {
    return {
      ruleId: 'rec_sustained_low', scenario: 'rec_sustained_low', familyNum: 4, tone: 'corrective',
      diagnosis: `Recovery has averaged ${Math.round(mean)} across the last ${n} days while training stayed steady`,
      action: 'Take a genuinely lighter week and let recovery catch up before pushing again',
      facts: { mean: Math.round(mean), days: n },
      fallbackTitle: 'Time for a Lighter Week',
      fallbackBody: `Recovery has run below par for most of the last ${n} days while your training held steady. That pattern usually means a lighter week, not more effort, is what moves it.`,
    };
  }

  // R4 bedtime inconsistency dragging recovery.
  const beds = recDays.map(d => d.sleepBedTimeMin).filter((b): b is number => b !== null);
  if (beds.length >= REC_MIN_PAIRS * 2) {
    const bsd = recStd(beds);
    if (bsd > REC_BEDTIME_SD && mean < 75) {
      return {
        ruleId: 'rec_bedtime', scenario: 'rec_bedtime', familyNum: 4, tone: 'corrective',
        diagnosis: `Your bedtime has been swinging by over an hour across the last ${n} days, and recovery has averaged ${Math.round(mean)}`,
        action: 'Anchor one bedtime and hold it within thirty minutes, weekends included',
        facts: { mean: Math.round(mean), days: n },
        fallbackTitle: 'Steady Your Bedtime',
        fallbackBody: `Your bedtimes are swinging, and recovery tends to follow. Anchoring one bedtime is often the quietest fix for the score.`,
      };
    }
  }

  // R7 strong & stable (positive).
  if (mean >= REC_STRONG_MEAN && sd < 10) {
    return {
      ruleId: 'rec_strong_stable', scenario: 'rec_strong', familyNum: 6, tone: 'positive',
      diagnosis: `Recovery has held strong and steady, averaging ${Math.round(mean)} across the last ${n} days`,
      action: 'Protect the sleep and easy days that got you here',
      facts: { mean: Math.round(mean), days: n },
      fallbackTitle: 'Recovery Dialed In',
      fallbackBody: `Recovery is holding strong and steady. Whatever the current rhythm is, it is working, protect the sleep and easy days that got you here.`,
    };
  }

  // R9 honest no-cause: stuck-ish but nothing in logged data explains it.
  if (mean < 75) {
    return {
      ruleId: 'rec_no_cause', scenario: 'rec_no_cause', familyNum: 4, tone: 'educational',
      diagnosis: `Recovery has averaged ${Math.round(mean)} across the last ${n} days, but nothing in your logged sleep, training, or bedtime clearly explains it`,
      action: 'This may simply be your baseline, or something not tracked like stress, caffeine, or alcohol',
      facts: { mean: Math.round(mean), days: n },
      fallbackTitle: 'No Clear Culprit',
      fallbackBody: `Recovery has sat around ${Math.round(mean)} lately, but nothing in your logged sleep, training, or routine is clearly dragging it. It may just be your baseline, or something we do not track like stress, caffeine, or alcohol.`,
    };
  }

  // Otherwise: snapshot floor (today's state).
  return recSnapshotFinding(todayScore, live, n, false);
}

export async function computeCoachPacketRecovery(
  live: RecoveryLiveToday,
  windowDays: number = 14,
): Promise<CoachTipCache> {
  const todayKey = todayDateKey();
  const [existing, ctx, store, workoutRaw] = await Promise.all([
    loadCoachTipCacheRecovery(),
    buildEngineContext(todayKey),
    loadSmartTips(),
    AsyncStorage.getItem('pj_workout_state').catch(() => null),
  ]);

  if (existing && existing.packet.computedDate === todayKey && existing.packet.surface === 'recovery') {
    return existing;
  }

  const workoutState: any = workoutRaw ? JSON.parse(workoutRaw) : {};
  const allDays = await loadWindowDays(todayKey, ctx, workoutState, 0); // include today
  const previousTip = existing?.aiBody ?? existing?.packet.fallbackBody ?? 'none';

  let faithTier = 'rooted';
  try {
    const s = await AsyncStorage.getItem('pj_settings');
    if (s) { const parsed = JSON.parse(s); faithTier = parsed?.faithJourney ?? 'rooted'; }
  } catch {}

  let finding = buildRecoveryFinding(allDays, live, ctx.sleepGoal);
  if (!finding) {
    finding = {
      ruleId: 'rec_no_data', scenario: 'rec_no_data', familyNum: 5, tone: 'corrective',
      diagnosis: 'Not enough recovery data yet to coach on',
      action: 'Wear a watch overnight and let it sync to build your recovery picture',
      facts: {},
      fallbackTitle: 'Building Your Recovery Picture',
      fallbackBody: 'Once a few nights of overnight heart data sync, the coach can start reading your recovery.',
    };
  }

  // Mindful (no growth areas): suppress corrective coaching, fall to a gentle read.
  if (ctx.isMindful && !ctx.mindfulGrowthAreas && finding.tone === 'corrective') {
    const sc = live?.score ?? finding.facts.score ?? 0;
    finding = {
      ruleId: 'rec_mindful_neutral', scenario: 'rec_steady', familyNum: 6, tone: 'positive',
      diagnosis: `Recovery is at ${sc} today`,
      action: 'Notice how you feel and let that guide today',
      facts: { score: sc },
      fallbackTitle: 'Recovery Today',
      fallbackBody: `Recovery is sitting at ${sc} today. Let how you feel guide your effort.`,
    };
  }

  const packet: CoachPacket = {
    scenario: finding.scenario,
    ruleId: finding.ruleId,
    familyNum: finding.familyNum,
    diagnosis: finding.diagnosis,
    action: finding.action,
    facts: finding.facts,
    tone: finding.tone,
    mode: ctx.styleMode,
    goal: ctx.goalBucket,
    surface: 'recovery',
    windowDays,
    ifActive: ctx.ifEnabled,
    previousTip,
    faithTier,
    computedDate: todayKey,
    fallbackTitle: finding.fallbackTitle,
    fallbackBody: finding.fallbackBody,
  };

  const sameScenario = existing?.packet.scenario === packet.scenario;
  const cache: CoachTipCache = {
    packet,
    aiBody: (sameScenario && existing?.aiBody) ? existing.aiBody : null,
    aiGeneratedDate: (sameScenario && existing?.aiGeneratedDate) ? existing.aiGeneratedDate : null,
    fallbackUsed: false,
  };

  await Promise.all([
    saveCoachTipCacheRecovery(cache),
    AsyncStorage.setItem(COACH_LAST_RULE_RECOVERY_KEY, JSON.stringify({ ruleId: packet.ruleId })),
  ]);
  return cache;
}

// ── Weekly packet builder ─────────────────────────────────────────────────────
// Loads data for a fixed Sun-Sat week and builds a Coach packet for that week.
// Generated once Sunday morning; never regenerated. Cache key is per-weekStart.

const COACH_TIP_WEEKLY_KEY_PREFIX = 'pj_coach_tip_weekly_';
const COACH_LAST_RULE_WEEKLY_KEY_PREFIX = 'pj_coach_last_rule_weekly_';
const COACH_TIP_MONTHLY_KEY_PREFIX = 'pj_coach_tip_monthly_';
const COACH_LAST_RULE_MONTHLY_KEY_PREFIX = 'pj_coach_last_rule_monthly_';

export async function loadCoachTipCacheWeekly(weekStart: string): Promise<CoachTipCache | null> {
  try {
    const raw = await AsyncStorage.getItem(`${COACH_TIP_WEEKLY_KEY_PREFIX}${weekStart}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function computeCoachPacketWeekly(
  weekStart: string,
  weekEnd: string,
  homeRuleId: string | null,
): Promise<CoachTipCache> {
  const cacheKey = `${COACH_TIP_WEEKLY_KEY_PREFIX}${weekStart}`;
  const lastRuleKey = `${COACH_LAST_RULE_WEEKLY_KEY_PREFIX}${weekStart}`;
  const weeklyTopicHistKey = 'pj_coach_topic_hist_weekly'; // last 3 weeks' headline topics

  const [existing, lastRuleRaw, topicHistRaw] = await Promise.all([
    loadCoachTipCacheWeekly(weekStart),
    AsyncStorage.getItem(lastRuleKey),
    AsyncStorage.getItem(weeklyTopicHistKey),
  ]);
  const persistedLastRuleId: string | null = lastRuleRaw ? JSON.parse(lastRuleRaw).ruleId : null;
  let recentTopics: string[] = [];
  try { recentTopics = topicHistRaw ? (JSON.parse(topicHistRaw) || []) : []; } catch { recentTopics = []; }

  // Already computed: return as-is (generated once, never regenerated)
  if (existing) return existing;

  const todayKey = todayDateKey();
  const [ctx, store, workoutRaw] = await Promise.all([
    buildEngineContext(todayKey),
    loadSmartTips(),
    AsyncStorage.getItem('pj_workout_state').catch(() => null),
  ]);

  const tipStore: SmartTipsStore = store ?? {
    activeTips: [], recentHistory: [], cooldowns: {},
    variantHistory: {}, lastComputed: '', topicLedger: {},
  };
  const workoutState: any = workoutRaw ? JSON.parse(workoutRaw) : {};

  const weekDays = await loadWindowDayRange(weekStart, weekEnd, ctx, workoutState);
  const density = computeDensityFields(weekDays);
  const windowDays = weekDays.length || 7;
  const loggedCount = density.daysLogged;
  const previousTip = 'none'; // Generated once; no prior tip to deduplicate against

  let faithTier = 'rooted';
  try {
    const s = await AsyncStorage.getItem('pj_settings');
    if (s) { const parsed = JSON.parse(s); faithTier = parsed?.faithJourney ?? 'rooted'; }
  } catch {}

  let packet: CoachPacket;

  const safety9 = checkFamily9Safety(weekDays, ctx);

  if (safety9) {
    packet = {
      scenario: safety9.scenario,
      ruleId: `safety_${safety9.scenario}`,
      familyNum: 9,
      diagnosis: safety9.diagnosis,
      action: safety9.action,
      facts: safety9.facts,
      tone: 'care',
      careSeverity: safety9.careSeverity,
      mode: ctx.styleMode,
      goal: ctx.goalBucket,
      surface: 'weekly',
      windowDays,
      startDate: weekStart,
      endDate: weekEnd,
      ifActive: ctx.ifEnabled,
      previousTip,
      faithTier,
      computedDate: todayKey,
      fallbackTitle: 'A Note on Your Pace',
      fallbackBody: `Something worth flagging. ${safety9.diagnosis}. ${safety9.action}.`,
    };
  } else if (loggedCount < 4) {
    packet = {
      scenario: '5.5',
      ruleId: 'log_consistency_low',
      familyNum: 5,
      diagnosis: `Only ${loggedCount} of ${windowDays} days have logged data, not enough for reliable trend analysis`,
      action: 'Log food on at least 4 days next week to unlock a full coaching insight',
      facts: { loggedDays: loggedCount, windowDays },
      tone: 'corrective',
      mode: ctx.styleMode,
      goal: ctx.goalBucket,
      surface: 'weekly',
      windowDays,
      startDate: weekStart,
      endDate: weekEnd,
      ifActive: ctx.ifEnabled,
      previousTip,
      faithTier,
      computedDate: todayKey,
      fallbackTitle: 'Building Your Picture',
      fallbackBody: `The coach has ${loggedCount} logged days to work with for this week. Log food on 4 or more days to get a full weekly coaching insight.`,
    };
  } else {
    const w5 = weekDays.slice(0, 5);
    const rawCandidates = runAllRules(weekDays, w5, weekDays, ctx, tipStore);
    const suppressed = applyMindfulSuppression(rawCandidates, ctx);

    const excludeIds = [homeRuleId, persistedLastRuleId].filter((id): id is string => !!id);
    const selected = selectByPrioritySpine(suppressed, ctx, excludeIds, recentTopics);

    if (!selected) {
      packet = {
        scenario: '6.0',
        ruleId: 'cal_goal_hit',
        familyNum: 6,
        diagnosis: 'All tracked metrics are within range for the week',
        action: 'Maintain the current approach',
        facts: { loggedDays: loggedCount, windowDays },
        tone: 'positive',
        mode: ctx.styleMode,
        goal: ctx.goalBucket,
        surface: 'weekly',
        windowDays,
        startDate: weekStart,
        endDate: weekEnd,
        ifActive: ctx.ifEnabled,
        previousTip,
        faithTier,
        computedDate: todayKey,
        fallbackTitle: 'Looking Good This Week',
        fallbackBody: 'Everything tracked in range this week. Keep the current approach going.',
      };
    } else {
      const { diagnosis, action, facts } = buildDiagnosisActionFacts(selected, weekDays, weekDays, ctx);
      const tone = deriveTone(selected);
      packet = {
        scenario: RULE_SCENARIO[selected.ruleId] ?? selected.ruleId,
        ruleId: selected.ruleId,
        familyNum: RULE_FAMILY[selected.ruleId] ?? 0,
        diagnosis,
        action,
        facts,
        tone,
        mode: ctx.styleMode,
        goal: ctx.goalBucket,
        surface: 'weekly',
        windowDays,
        startDate: weekStart,
        endDate: weekEnd,
        ifActive: ctx.ifEnabled,
        previousTip,
        faithTier,
        computedDate: todayKey,
        fallbackTitle: selected.title,
        fallbackBody: selected.body,
      };
    }
  }

  packet.daysLogged = density.daysLogged;
  packet.daysWithNutritionData = density.daysWithNutritionData;
  packet.daysWithActivityData = density.daysWithActivityData;
  packet.daysWithSleepData = density.daysWithSleepData;

  const cache: CoachTipCache = {
    packet,
    aiBody: null,
    aiGeneratedDate: null,
    fallbackUsed: false,
  };

  await Promise.all([
    storageSet(cacheKey, JSON.stringify(cache)),
    AsyncStorage.setItem(lastRuleKey, JSON.stringify({ ruleId: packet.ruleId })),
    AsyncStorage.setItem(weeklyTopicHistKey, JSON.stringify([headlineTopic(packet.ruleId), ...recentTopics].slice(0, 3))),
  ]);
  return cache;
}

export async function loadCoachTipCacheMonthly(monthKey: string): Promise<CoachTipCache | null> {
  try {
    const raw = await AsyncStorage.getItem(`${COACH_TIP_MONTHLY_KEY_PREFIX}${monthKey}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function computeCoachPacketMonthly(
  monthStart: string,
  monthEnd: string,
  homeRuleId: string | null,
): Promise<CoachTipCache> {
  const monthKey = monthStart.slice(0, 7); // YYYY-MM
  const cacheKey = `${COACH_TIP_MONTHLY_KEY_PREFIX}${monthKey}`;
  const lastRuleKey = `${COACH_LAST_RULE_MONTHLY_KEY_PREFIX}${monthKey}`;
  const monthlyTopicHistKey = 'pj_coach_topic_hist_monthly'; // last 3 months' headline topics

  const [existing, lastRuleRaw, topicHistRaw] = await Promise.all([
    loadCoachTipCacheMonthly(monthKey),
    AsyncStorage.getItem(lastRuleKey),
    AsyncStorage.getItem(monthlyTopicHistKey),
  ]);
  const persistedLastRuleId: string | null = lastRuleRaw ? JSON.parse(lastRuleRaw).ruleId : null;
  let recentTopics: string[] = [];
  try { recentTopics = topicHistRaw ? (JSON.parse(topicHistRaw) || []) : []; } catch { recentTopics = []; }

  if (existing) return existing;

  const todayKey = todayDateKey();
  const [ctx, store, workoutRaw] = await Promise.all([
    buildEngineContext(todayKey),
    loadSmartTips(),
    AsyncStorage.getItem('pj_workout_state').catch(() => null),
  ]);

  const tipStore: SmartTipsStore = store ?? {
    activeTips: [], recentHistory: [], cooldowns: {},
    variantHistory: {}, lastComputed: '', topicLedger: {},
  };
  const workoutState: any = workoutRaw ? JSON.parse(workoutRaw) : {};

  const monthDays = await loadWindowDayRange(monthStart, monthEnd, ctx, workoutState);
  const density = computeDensityFields(monthDays);
  const windowDays = monthDays.length || 30;
  const loggedCount = density.daysLogged;
  const previousTip = 'none';

  let faithTier = 'rooted';
  try {
    const s = await AsyncStorage.getItem('pj_settings');
    if (s) { const parsed = JSON.parse(s); faithTier = parsed?.faithJourney ?? 'rooted'; }
  } catch {}

  let packet: CoachPacket;

  const safety9 = checkFamily9Safety(monthDays, ctx);

  if (safety9) {
    packet = {
      scenario: safety9.scenario,
      ruleId: `safety_${safety9.scenario}`,
      familyNum: 9,
      diagnosis: safety9.diagnosis,
      action: safety9.action,
      facts: safety9.facts,
      tone: 'care',
      careSeverity: safety9.careSeverity,
      mode: ctx.styleMode,
      goal: ctx.goalBucket,
      surface: 'monthly',
      windowDays,
      startDate: monthStart,
      endDate: monthEnd,
      ifActive: ctx.ifEnabled,
      previousTip,
      faithTier,
      computedDate: todayKey,
      fallbackTitle: 'A Note on Your Pace',
      fallbackBody: `Something worth flagging. ${safety9.diagnosis}. ${safety9.action}.`,
    };
  } else if (loggedCount < 14) {
    packet = {
      scenario: '5.5',
      ruleId: 'log_consistency_low_monthly',
      familyNum: 5,
      diagnosis: `Only ${loggedCount} of ${windowDays} days have logged data, not enough for reliable monthly trend analysis`,
      action: 'Log food on at least 14 days next month to unlock a full monthly coaching insight',
      facts: { loggedDays: loggedCount, windowDays },
      tone: 'corrective',
      mode: ctx.styleMode,
      goal: ctx.goalBucket,
      surface: 'monthly',
      windowDays,
      startDate: monthStart,
      endDate: monthEnd,
      ifActive: ctx.ifEnabled,
      previousTip,
      faithTier,
      computedDate: todayKey,
      fallbackTitle: 'Building Your Picture',
      fallbackBody: `The coach has ${loggedCount} logged days to work with this month. Log food on 14 or more days to get a full monthly coaching insight.`,
    };
  } else {
    const rawCandidates = runAllRules(monthDays, monthDays.slice(0, 5), monthDays, ctx, tipStore);
    const suppressed = applyMindfulSuppression(rawCandidates, ctx);

    const excludeIds = [homeRuleId, persistedLastRuleId].filter((id): id is string => !!id);
    const selected = selectByPrioritySpine(suppressed, ctx, excludeIds, recentTopics);

    if (!selected) {
      packet = {
        scenario: '6.0',
        ruleId: 'cal_goal_hit',
        familyNum: 6,
        diagnosis: 'All tracked metrics are within range for the month',
        action: 'Maintain the current approach',
        facts: { loggedDays: loggedCount, windowDays },
        tone: 'positive',
        mode: ctx.styleMode,
        goal: ctx.goalBucket,
        surface: 'monthly',
        windowDays,
        startDate: monthStart,
        endDate: monthEnd,
        ifActive: ctx.ifEnabled,
        previousTip,
        faithTier,
        computedDate: todayKey,
        fallbackTitle: 'Strong Month',
        fallbackBody: 'Everything tracked in range this month. Keep the current approach going.',
      };
    } else {
      const { diagnosis, action, facts } = buildDiagnosisActionFacts(selected, monthDays, monthDays, ctx);
      const tone = deriveTone(selected);
      packet = {
        scenario: RULE_SCENARIO[selected.ruleId] ?? selected.ruleId,
        ruleId: selected.ruleId,
        familyNum: RULE_FAMILY[selected.ruleId] ?? 0,
        diagnosis,
        action,
        facts,
        tone,
        mode: ctx.styleMode,
        goal: ctx.goalBucket,
        surface: 'monthly',
        windowDays,
        startDate: monthStart,
        endDate: monthEnd,
        ifActive: ctx.ifEnabled,
        previousTip,
        faithTier,
        computedDate: todayKey,
        fallbackTitle: selected.title,
        fallbackBody: selected.body,
      };
    }
  }

  packet.daysLogged = density.daysLogged;
  packet.daysWithNutritionData = density.daysWithNutritionData;
  packet.daysWithActivityData = density.daysWithActivityData;
  packet.daysWithSleepData = density.daysWithSleepData;

  const cache: CoachTipCache = {
    packet,
    aiBody: null,
    aiGeneratedDate: null,
    fallbackUsed: false,
  };

  await Promise.all([
    storageSet(cacheKey, JSON.stringify(cache)),
    AsyncStorage.setItem(lastRuleKey, JSON.stringify({ ruleId: packet.ruleId })),
    AsyncStorage.setItem(monthlyTopicHistKey, JSON.stringify([headlineTopic(packet.ruleId), ...recentTopics].slice(0, 3))),
  ]);
  return cache;
}
