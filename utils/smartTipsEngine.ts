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
): Promise<WindowDay[]> {
  const keys: string[] = [];
  for (let i = 1; i <= WINDOW_SIZE; i++) keys.push(`pj_${keyForOffset(todayKey, i)}`);

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
    const workoutScheduled = dayType === 'lift' || dayType === 'cardio';
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

  const patternQual = w7.filter(d => d.hasFoodData && d.protein < proteinGoalG * 0.7);
  if (patternQual.length >= 5 && meetsLoggingGate(w7, 6)) {
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
  const span = weighIns.length;
  const lbsPerWeek = ((last - first) / span) * 7;
  const isWrong = ctx.goalBucket === 'lose' ? lbsPerWeek > 0.5 : lbsPerWeek < -0.5;
  if (!isWrong) return null;
  return makeTip('weight_wrong_direction', 'pattern', false, `pattern_${ctx.goalBucket}`, ctx, store);
}

function ruleWeightOnTrack(w14: WindowDay[], ctx: EngineContext, store: SmartTipsStore): CandidateTip | null {
  const weighIns = w14.filter(d => d.weight !== null).sort((a, b) => a.dateKey < b.dateKey ? -1 : 1);
  if (weighIns.length < 4) return null;
  const first = weighIns[0].weight!;
  const last = weighIns[weighIns.length - 1].weight!;
  const span = weighIns.length;
  const lbsPerWeek = ((last - first) / span) * 7;
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
