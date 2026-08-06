// services/aiMealEstimator.ts
// Brain for the AI Meal Estimator feature. Owns quota state, prompt
// construction, the Claude vision call, and strict response validation.
// Pure JS, no native modules, no rebuild required. The screen
// (app/ai-meal-estimator.tsx) renders everything; this file makes no UI.
//
// Spec: SPEC_ai_meal_estimator.md (source of truth).

import AsyncStorage from '@react-native-async-storage/async-storage';
import { storageSet } from '../utils/storage';
import { app } from '../firebaseConfig';
import { getFunctions, httpsCallable } from 'firebase/functions';

// ── Tunables ────────────────────────────────────────────────────────────────

// Compression quality handed to expo-image-picker and to the resize (0..1).
//
// 🔴 RAISED 0.4 -> 0.8 ON 2026-08-06, AND THE OLD COMMENT BELOW WAS WRONG IN THE WAY THAT MATTERS.
// It said lower quality means "cheaper vision billing". It does not. **Anthropic bills an image on its
// DIMENSIONS, not its file size** (PLAN 4.1: image tokens scale with AREA). A 1568px photo costs the same
// ~1,550 tokens crisp or mushy, so 0.4 was buying a smaller upload and nothing else.
// ⚠️ And it was costing something real: heavy JPEG compression destroys exactly the fine detail PORTION
// estimation depends on (plate rims, a fork for scale, how deep a bowl is). Identifying a muffin survives
// compression; judging how much is on the plate does not. We were about to protect that detail from a
// resize while the app was already crushing it for free.
// ➡️ So the pair is deliberate: MAX_IMAGE_DIM takes the cost out, and the higher quality protects the
// accuracy that the resize threatens. The only price is a slightly larger upload, which is latency, not money.
export const IMAGE_QUALITY = 0.8;

// Longest edge, in pixels, that a photo is resized to before it is sent. PLAN 4.1, DECIDED 2026-08-05.
//
// ⚠️ THE PHOTO IS ~49% OF AN ESTIMATE'S COST (MEASURED: $0.00465 of $0.00953 on one real photo), which is
// the finding that made this worth doing. The model is NOT the problem, so Sonnet stays: Justin's
// 2026-07-31 call that vision is worth it holds, and switching to Haiku would mean finding out whether it
// reads food worse. This way nobody has to find out.
// ⚠️ Anthropic scales anything larger to their own 1568px ceiling and bills for THAT, so sending a
// full-resolution phone photo buys literally nothing. 1568 -> 1024 is ~660 tokens saved, **28% off the
// whole estimate** ($0.0095 -> $0.0068).
// ⚠️ WHY NOT SMALLER. Going on down to 784 buys only another ~9% and that is where portion cues genuinely
// start to go. The curve is steep early and flattens fast. 1024 is the knee.
// ⚠️ NEVER UPSCALE. Only applied when the longest edge already exceeds this: blowing a small library photo
// up to 1024 would cost MORE tokens for a worse image.
// 🔴 The old comment here claimed a resize "is a native module and needs a rebuild". **STALE.**
// `expo-image-manipulator` is already a dependency and already re-encodes photos in `app/(tabs)/log.tsx`
// and `app/profile-photo-crop.tsx`. Pure JS, no rebuild.
export const MAX_IMAGE_DIM = 1024;

const MODEL = 'claude-sonnet-4-6';
const API_TIMEOUT_MS = 30000; // vision on a complex plate can be slow

// ── Quota ───────────────────────────────────────────────────────────────────

export const QUOTA_KEY = 'pj_ai_estimator_quota';
// ✅ REVERTED TO THE REAL CAPS 2026-07-28 (was a 100 / 9999 beta hack). Justin's call: 5 free, not the 3
// the original code used -- 3 was punitive enough that you would burn it just trying the feature out.
// Each estimate is ~1-3 cents, so free at 5/month is roughly 8 cents per user per month: this number is
// not what moves the economics. It is deliberately the tightest free cap in the app because the estimator
// is the most defensible paid line -- it is the one feature with a real per-use cost.
// aiProxy still enforces a separate 60/day per-user abuse backstop underneath this.
export const FREE_LIMIT = 5;
// Supporter tier -- a clean 10x the free allowance.
export const PRO_LIMIT = 100;

// DEV testing: unlimited estimates in the dev build only. __DEV__ is false in
// release/TestFlight builds, so the real FREE_LIMIT/PRO_LIMIT caps apply there
// automatically -- this can never ship unlimited to real users.
export const DEV_UNLIMITED_ESTIMATES = __DEV__;

export interface QuotaState {
  month: string; // "YYYY-MM"
  usesThisMonth: number;
}

/** Current calendar month as "YYYY-MM". */
function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

/** Human-readable first-of-next-month, e.g. "July 1". For the limit modal. */
export function nextResetLabel(): string {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return next.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
}

/**
 * Load quota, normalized to the current month. If the stored month is stale
 * (a new calendar month has started) the count is treated as 0. This does not
 * persist the reset on its own; incrementQuota writes the normalized state.
 */
export async function loadQuota(): Promise<QuotaState> {
  const month = currentMonth();
  try {
    const raw = await AsyncStorage.getItem(QUOTA_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.month === month && typeof parsed.usesThisMonth === 'number') {
        return { month, usesThisMonth: parsed.usesThisMonth };
      }
    }
  } catch {}
  return { month, usesThisMonth: 0 };
}

export function limitFor(isPro: boolean): number {
  if (DEV_UNLIMITED_ESTIMATES) return 99999;
  return isPro ? PRO_LIMIT : FREE_LIMIT;
}

/** Uses remaining this month, never negative. */
export async function getRemainingUses(isPro: boolean): Promise<number> {
  const { usesThisMonth } = await loadQuota();
  return Math.max(0, limitFor(isPro) - usesThisMonth);
}

/**
 * Increment the monthly use count by one, month-safe. Called only when a valid
 * estimation result is successfully shown to the user (see generateMealEstimate
 * contract below). Read-then-merge so a mid-month month-rollover resets cleanly.
 */
export async function incrementQuota(): Promise<QuotaState> {
  const current = await loadQuota(); // already normalized to this month
  const next: QuotaState = { month: current.month, usesThisMonth: current.usesThisMonth + 1 };
  try {
    await storageSet(QUOTA_KEY, JSON.stringify(next));
  } catch {}
  return next;
}

// ── Result types ──────────────────────────────────────────────────────────────

export type Confidence = 'high' | 'medium' | 'low';
export type InputQuality = 'photo_only' | 'text_only' | 'photo_and_text';

export interface LineItem {
  id: string;
  name: string;
  portion_description: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  confidence: Confidence;
}
// ⚠️ `assumption_note` REMOVED 2026-08-06. It was declared, instructed in the prompt, parsed and stored,
// and **never rendered on any screen** (grepped every .tsx). So the model paid to type it on every line
// item and no user ever saw one. Not a bug and nothing was lost: the model was already putting the portion
// assumption in `portion_description`, which IS displayed, so the prompt now asks for it there.
// ⚠️ Old stored estimates still carry the field. Harmless: nothing reads it.
// 🔬 Worth ~10 output tokens per line item, ~2% of an estimate. Small on its own, and taken because output
// is now the dominant cost here: after the 1024px resize the reply is ~40% of an estimate, the photo ~33%.
// ❌ NOT DONE, and deliberately: shortening the JSON KEYS themselves ("portion_description" -> "p"). Field
// names are instructions to the model, not just labels, and the field most at risk is the portion
// description, which is this feature's whole value. Adding a legend to compensate pushes the net saving to
// ~5% of an estimate, ~0.3% of the AI bill, in exchange for a real accuracy risk. Bad trade. Do not revisit
// without a measured reason.

export interface MacroTotals {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface EstimateResult {
  meal_name_suggestion: string;
  line_items: LineItem[];
  totals: MacroTotals;
  hidden_items: string[];
  input_quality: InputQuality;
}

export interface EstimateInput {
  description: string;            // required, non-empty
  imageBase64?: string | null;   // raw base64 (no data: prefix)
  imageMediaType?: string;       // e.g. "image/jpeg"
}

// Discriminated outcome. ok:true is the only path that should count a use.
export type EstimateOutcome =
  | { ok: true; result: EstimateResult }
  | { ok: false; kind: 'no_food' | 'no_key' | 'network' | 'malformed' };

// ── Prompt ──────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a nutrition estimation assistant with deep knowledge of the macro profiles of common foods, restaurant dishes, and home cooking. Your job is to estimate the calories and macronutrients of a meal from a photo, a text description, or both.

This is a "pretty close" tool, not a precision tool. Be realistic, not falsely precise.

RELEVANCE GATE (do this first):
If an image is provided and it contains no identifiable food or drink, respond with ONLY this exact JSON and nothing else: {"no_food_detected": true}
Otherwise, set "no_food_detected": false and produce the full estimate below.

ESTIMATION RULES:
- When portion size is not stated, assume a standard restaurant or home serving and say so in that item's "portion_description".
- List up to 5 probable hidden additions that are easy to miss (cooking oils, butter, seasoning rubs, sauces or dressings not visible) in the top-level "hidden_items" array as plain phrases. Lean toward more of them when the description is vague or the meal is complex, but never invent items just to reach 5. Favor additions the person likely actually ate (sauces, butter, oils on the food itself) over trace prep residues that barely touch the food. Do NOT inflate line item macros to cover them.
- Never invent a confident number for something you genuinely cannot judge. If you are unsure about an item, still give your best estimate but mark its "confidence" as "low".
- Every line item must include a "confidence" of "high", "medium", or "low".
- Keep numbers realistic and internally consistent (calories should roughly match 4*protein_g + 4*carbs_g + 9*fat_g).

OUTPUT FORMAT:
Respond with ONLY valid minified JSON. No markdown, no code fences, no commentary before or after. Use this exact shape:
{"no_food_detected":false,"meal_name_suggestion":string,"line_items":[{"name":string,"portion_description":string,"calories":number,"protein_g":number,"carbs_g":number,"fat_g":number,"confidence":"high"|"medium"|"low"}],"hidden_items":[string]}

All numbers are plain integers or decimals (no units inside the numbers). meal_name_suggestion is a short friendly name for the whole meal.`;

function buildUserText(description: string, hasImage: boolean): string {
  const intro = hasImage
    ? 'Estimate this meal from the attached photo and the description below.'
    : 'Estimate this meal from the description below.';
  return `${intro}\n\nUser description:\n${description.trim()}`;
}

// ── Validation ────────────────────────────────────────────────────────────────

function num(v: any, fallback = 0): number {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : fallback;
}

function asConfidence(v: any): Confidence {
  return v === 'high' || v === 'low' ? v : 'medium';
}

let _idSeq = 0;
function makeId(): string {
  _idSeq += 1;
  return `ai_${Date.now().toString(36)}_${_idSeq}`;
}

/**
 * Validate and normalize the raw model JSON into an EstimateResult.
 * Returns null if the payload is unusable (caller treats as 'malformed').
 * Totals are recomputed from the line items so the displayed total is always
 * internally consistent regardless of what the model reported.
 */
function validateResult(raw: any, inputQuality: InputQuality): EstimateResult | null {
  if (!raw || typeof raw !== 'object') return null;
  if (!Array.isArray(raw.line_items) || raw.line_items.length === 0) return null;

  const line_items: LineItem[] = raw.line_items.map((it: any) => ({
    id: makeId(),
    name: typeof it?.name === 'string' && it.name.trim() ? it.name.trim() : 'Item',
    portion_description: typeof it?.portion_description === 'string' ? it.portion_description.trim() : '',
    calories: Math.max(0, Math.round(num(it?.calories))),
    protein_g: Math.max(0, Math.round(num(it?.protein_g))),
    carbs_g: Math.max(0, Math.round(num(it?.carbs_g))),
    fat_g: Math.max(0, Math.round(num(it?.fat_g))),
    confidence: asConfidence(it?.confidence),
  }));

  const totals = computeTotals(line_items);

  const hidden_items: string[] = Array.isArray(raw.hidden_items)
    ? raw.hidden_items.filter((h: any) => typeof h === 'string' && h.trim()).map((h: string) => h.trim()).slice(0, 5)
    : [];

  const meal_name_suggestion = typeof raw.meal_name_suggestion === 'string' && raw.meal_name_suggestion.trim()
    ? raw.meal_name_suggestion.trim()
    : 'Estimated Meal';

  return { meal_name_suggestion, line_items, totals, hidden_items, input_quality: inputQuality };
}

/** Sum a set of line items into totals. Exported for live recompute in the UI. */
export function computeTotals(items: { calories: number; protein_g: number; carbs_g: number; fat_g: number }[]): MacroTotals {
  return items.reduce<MacroTotals>(
    (acc, it) => ({
      calories: acc.calories + (it.calories || 0),
      protein_g: acc.protein_g + (it.protein_g || 0),
      carbs_g: acc.carbs_g + (it.carbs_g || 0),
      fat_g: acc.fat_g + (it.fat_g || 0),
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  );
}

/** Pull the text body out of an Anthropic messages response and strip fences. */
function extractJsonText(data: any): string | null {
  const block = data?.content?.[0];
  if (!block || block.type !== 'text' || typeof block.text !== 'string') return null;
  let t = block.text.trim();
  // Strip ```json ... ``` or ``` ... ``` fences if the model added them anyway.
  if (t.startsWith('```')) {
    t = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }
  // If there is leading/trailing prose, grab the outermost JSON object.
  const first = t.indexOf('{');
  const last = t.lastIndexOf('}');
  if (first > 0 || last < t.length - 1) {
    if (first !== -1 && last !== -1 && last > first) t = t.slice(first, last + 1);
  }
  return t;
}

// ── Main call ─────────────────────────────────────────────────────────────────

/**
 * Run a meal estimate. Returns a discriminated outcome:
 *   ok:true  -> a valid result the user can be shown. The caller counts this as
 *               a use (incrementQuota) exactly once, when the result renders.
 *   no_food  -> the relevance gate found no food in the image. NOT a use.
 *   network  -> fetch failed / timed out / offline. NOT a use.
 *   malformed-> response was not usable JSON. NOT a use.
 *   no_key   -> API key missing (dev/config issue). NOT a use.
 *
 * Quota is intentionally NOT touched in here. The screen owns the increment so
 * that "a use is counted only when the user sees a result" stays in one place.
 */
export async function generateMealEstimate(input: EstimateInput): Promise<EstimateOutcome> {
  const description = (input.description || '').trim();
  const hasImage = !!input.imageBase64;
  const inputQuality: InputQuality = hasImage ? 'photo_and_text' : 'text_only';

  const content: any[] = [];
  if (hasImage) {
    content.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: input.imageMediaType || 'image/jpeg',
        data: input.imageBase64,
      },
    });
  }
  content.push({ type: 'text', text: buildUserText(description, hasImage) });

  // Routes through the aiProxy Cloud Function so the Anthropic key stays server-side. Returns the
  // same raw Anthropic response the direct call did, so extractJsonText below is unchanged. Any
  // failure (offline, timeout, or the server-side safety cap) collapses to the single 'network'
  // state, never a use.
  let data: any;
  try {
    const callable = httpsCallable(getFunctions(app), 'aiProxy', { timeout: API_TIMEOUT_MS });
    const res = await callable({
      feature: 'estimator',
      model: MODEL,
      max_tokens: 1500,
      temperature: 0.1,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content }],
    });
    const payload = (res.data ?? {}) as { ok?: boolean; data?: any; reason?: string };
    if (!payload.ok || !payload.data) {
      return { ok: false, kind: 'network' };
    }
    data = payload.data;
  } catch {
    return { ok: false, kind: 'network' };
  }

  const jsonText = extractJsonText(data);
  if (!jsonText) return { ok: false, kind: 'malformed' };

  let parsed: any;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return { ok: false, kind: 'malformed' };
  }

  // Relevance gate result. Not a use, not an error: a clean "no food" outcome.
  if (parsed && parsed.no_food_detected === true) {
    return { ok: false, kind: 'no_food' };
  }

  const result = validateResult(parsed, inputQuality);
  if (!result) return { ok: false, kind: 'malformed' };

  return { ok: true, result };
}
