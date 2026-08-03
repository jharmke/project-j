// utils/undereatingSafeguard.ts
//
// THE UNDEREATING SAFEGUARD (THE PLAN item L). Full reasoning: SPEC_otto.md -> THE UNDEREATING SAFEGUARD.
//
// Split by job: DETECTION is app-side, deterministic, no model involved. The VOICE is Otto and only Otto.
// He never speaks first, and he only raises it when the user brings up food, intake or the scale THEMSELVES
// (narrowed 2026-08-03 -- fatigue is deliberately OUT, "why am I so tired" gets a normal answer).
//
// ⚠️ THE NUMBERS ARE RENDERED BY THE APP, NOT BY OTTO. Free Otto has no snapshot and no [[stat:key]] system,
// so he cannot put a real figure in a sentence. He receives a FINISHED sentence and repeats it. What crosses
// the wire is a flag plus two numbers, never the user's food history, so the item B data gate is untouched
// and this works identically on both tiers.
//
// ⚠️ IT ASKS, IT NEVER ASSERTS. The app cannot know what anyone ate, only what the log says -- see THE TWO
// WOMEN PROBLEM in the spec. Someone who logs breakfast and lunch, cooks dinner and never reopens the app
// looks identical in the totals to someone genuinely eating 900. So the message is a QUESTION.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadCalorieTargets } from './calorieTarget';

// { lastShownAt: epoch ms }. Spent when the question is SHOWN, not when it is answered.
const COOLDOWN_KEY = 'pj_undereating_safeguard';

/** Justin's call 2026-08-03: 30 days flat, no per-branch variation. A safeguard that asks again next
 *  Tuesday is nagging, and nagging is how someone starts hiding their logging from the app. */
export const COOLDOWN_DAYS = 30;
/** Days looked at, yesterday backwards. TODAY IS NEVER COUNTED -- today's food is incomplete at any hour
 *  before bed, so counting it would trip the check every morning on a perfectly normal user. */
export const WINDOW_DAYS = 7;
/** Qualifying days needed before the check may fire at all (Justin's call: 5, not 7). At 7 the user would
 *  have to log every single day that week, which almost nobody does, and the safeguard would never fire. */
export const MIN_LOGGED_DAYS = 5;
/** How many of those days must come in under the line. */
export const MIN_LOW_DAYS = 4;

export interface UndereatingFlag {
  /** Average across EVERY qualifying day, not just the low ones. Averaging only the low days quietly picks
   *  the user's worst days and shows a scarier number than they actually ate, and this is the one feature
   *  where the number has to be straight. */
  avgCal: number;
  bmr: number;
}

// ── The trigger: did THEY raise it? ───────────────────────────────────────────────────────────────────
//
// ⚠️ DELIBERATELY NOT `messageWantsFood` FROM companionFood.ts. That one is generous on purpose -- it decides
// whether to ATTACH the food dataset, where a false positive costs a few tokens. It fires on "water",
// "drink" and "hydration", and a false positive HERE puts a medical-adjacent question in front of somebody
// asking whether they drank enough water. Two jobs, two detectors.
const INTAKE_WORDS =
  /\b(calories?|kcal|intake|eat|eats|eating|ate|eaten|food|meals?|breakfast|lunch|dinner|macros?|protein|deficit|portions?|under ?eating|restricting|restriction|diet|dieting|cutting|fasting)\b/;
const SCALE_WORDS =
  /\b(scale|weight|weigh|weighing|weighed|lbs?|pounds?|kilos?|kgs?|plateau|plateaued|stalled|stalling)\b/;

/**
 * Did the user bring up food, intake or the scale themselves? Everything else, INCLUDING fatigue, gets a
 * normal answer with no mention of this.
 */
export function messageRaisesIntake(text: string): boolean {
  const t = (text || '').toLowerCase();

  // ⚠️ APP HOW-TO QUESTIONS ARE NOT THE SUBJECT. "How do I create a custom food" mentions food and is a
  // question about the APP -- landing the safeguard there is exactly the swerve the narrowing removed.
  if (/\bhow (do|can|would) i\b[^?]*\b(add|create|make|log|edit|delete|remove|find|change|set|scan|track|save|build)\b/.test(t)) return false;
  if (/\b(where is|where do i find|how does .{1,30} work|what does .{1,30} mean)\b/.test(t)) return false;

  return INTAKE_WORDS.test(t) || SCALE_WORDS.test(t);
}

// ── The pattern check ─────────────────────────────────────────────────────────────────────────────────

const pad = (n: number) => String(n).padStart(2, '0');

// A day is fully excluded only when all three category exclusions are on, or the Day Score pop-up's
// "Exclude this day" (which Vacation Mode writes) is set. Matches dayFullyExcluded in smartTipsEngine and
// isDayExcluded in dayScoreStore; inlined here for the same reason they inline it, to avoid an import cycle.
function dayFullyExcluded(day: any): boolean {
  if (day?.dayScore?.excludedFromAverages === true) return true;
  const ex = day?.excluded;
  return !!(ex && typeof ex === 'object' && ex.diet && ex.water && ex.exercise);
}

async function inCooldown(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(COOLDOWN_KEY);
    const at = raw ? JSON.parse(raw)?.lastShownAt : null;
    if (typeof at !== 'number') return false;
    return Date.now() - at < COOLDOWN_DAYS * 86400000;
  } catch { return false; }
}

/** Spent when the question is SHOWN. Called after the reply lands, so a failed request cannot burn it. */
export async function markSafeguardShown(): Promise<void> {
  try { await AsyncStorage.setItem(COOLDOWN_KEY, JSON.stringify({ lastShownAt: Date.now() })); } catch {}
}

// ── DEV TOOLS ─────────────────────────────────────────────────────────────────────────────────────────
// ⚠️ WITHOUT THIS THE FEATURE CANNOT BE TESTED BY HAND. The real trigger needs five logged days with four
// of them under the floor, and the only honest way to produce that is to eat that way for a week. This
// forces the flag on the next Otto message instead. It TOUCHES NO LOGGED DATA -- it never reads, writes or
// alters a single pj_YYYY-MM-DD key, it just makes the check answer yes once.
const DEV_FORCE_KEY = 'pj_dev_undereating_force';

/** Arms the safeguard for the next Otto message and clears the cooldown so it can be run again. */
export async function armSafeguardForTest(): Promise<void> {
  try {
    await AsyncStorage.setItem(DEV_FORCE_KEY, '1');
    await AsyncStorage.removeItem(COOLDOWN_KEY);
  } catch {}
}

/** Disarms, and clears the 30-day quiet period so the next real check is not silenced by a test. */
export async function clearSafeguardTestState(): Promise<void> {
  try {
    await AsyncStorage.removeItem(DEV_FORCE_KEY);
    await AsyncStorage.removeItem(COOLDOWN_KEY);
  } catch {}
}

/**
 * Is the pattern there? Returns the two numbers the copy needs, or null.
 *
 * ⚠️ CHEAP CHECKS FIRST. The cooldown is one read; the target load can walk back through history looking for
 * a weight. The caller only ever runs this on a message that already raised the subject, so on a normal
 * message this whole file costs nothing.
 */
export async function checkUndereatingPattern(todayKey: string): Promise<UndereatingFlag | null> {
  let forced = false;
  try { forced = (await AsyncStorage.getItem(DEV_FORCE_KEY)) === '1'; } catch {}
  if (!forced && await inCooldown()) return null;

  // ⚠️ THE LINE IS THE MODAL LINE FROM utils/calorieFloor.ts (male 1200, female 1000, sex unset falls back
  // to the stricter women's number). Reused, never reinvented: consistency with the calorie floor matters
  // more than precision. loadCalorieTargets is the canonical source for both numbers.
  let bmr = 0;
  let line = 0;
  try {
    const targets = await loadCalorieTargets(todayKey);
    bmr = Math.round(targets.bmr || 0);
    line = targets.floor?.modalLine || 0;
  } catch { return null; }
  // ⚠️ BOTH BRANCH ANSWERS QUOTE THE BMR, so without one there is no safeguard to deliver. An incomplete
  // profile (no weight, no height, no age) returns 0 here rather than a wrong figure.
  if (bmr <= 0 || line <= 0) {
    // Armed for testing on a profile too incomplete to produce a BMR: use stand-in figures rather than
    // print a zero into copy the user reads.
    return forced ? { avgCal: 1050, bmr: 1640 } : null;
  }
  // ⚠️ ARMED: answer yes WITHOUT reading a single day of logged food. The numbers are this user's real BMR
  // and a plausible average just under their own line, so the sentence reads exactly as it would in anger.
  if (forced) return { avgCal: Math.max(400, line - 150), bmr };

  const parts = todayKey.split('-').map(Number);
  const base = new Date(parts[0], (parts[1] || 1) - 1, parts[2] || 1);
  const keys: string[] = [];
  for (let i = 1; i <= WINDOW_DAYS; i++) {
    const d = new Date(base);
    d.setDate(d.getDate() - i);
    keys.push(`pj_${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
  }

  let pairs: readonly [string, string | null][] = [];
  try { pairs = await AsyncStorage.multiGet(keys); } catch { return null; }

  const totals: number[] = [];
  for (const [, raw] of pairs) {
    if (!raw) continue;
    let day: any;
    try { day = JSON.parse(raw); } catch { continue; }
    if (dayFullyExcluded(day)) continue;
    const entries: any[] = Array.isArray(day.entries) ? day.entries : [];
    // ⚠️ THE BIGGEST FALSE-POSITIVE SOURCE BY FAR. A day with no food logged is not a day of eating nothing,
    // and counting it as zero would flag every user who forgets to log for four days.
    if (entries.length === 0) continue;
    // ⚠️ GROSS INTAKE, NEVER NET. Somebody eating 2,500 and burning 1,200 has a net of 1,300 and would trip
    // the women's line while eating plenty, so heavy exercisers would be flagged constantly.
    let consumed = 0;
    for (const e of entries) consumed += e.cal || 0;
    totals.push(consumed);
  }

  if (totals.length < MIN_LOGGED_DAYS) return null;
  if (totals.filter(c => c < line).length < MIN_LOW_DAYS) return null;

  const avgCal = Math.round(totals.reduce((a, b) => a + b, 0) / totals.length);
  return { avgCal, bmr };
}
