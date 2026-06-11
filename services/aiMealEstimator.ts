// services/aiMealEstimator.ts
// Brain for the AI Meal Estimator feature. Owns quota state, prompt
// construction, the Claude vision call, and strict response validation.
// Pure JS, no native modules, no rebuild required. The screen
// (app/ai-meal-estimator.tsx) renders everything; this file makes no UI.
//
// Spec: SPEC_ai_meal_estimator.md (source of truth).

import AsyncStorage from '@react-native-async-storage/async-storage';
import { storageSet } from '../utils/storage';

// ── Tunables ────────────────────────────────────────────────────────────────

// Compression quality handed to expo-image-picker (0..1). Lower = smaller
// payload and cheaper vision billing. 0.4 keeps food clearly readable while
// pushing typical phone photos toward the under-1MB target. If real photos
// still come back too large, the next step is expo-image-manipulator for a
// hard max-dimension resize (that is a native module and needs a rebuild).
export const IMAGE_QUALITY = 0.4;

const MODEL = 'claude-sonnet-4-6';
const API_TIMEOUT_MS = 30000; // vision on a complex plate can be slow
const API_URL = 'https://api.anthropic.com/v1/messages';

// ── Quota ───────────────────────────────────────────────────────────────────

export const QUOTA_KEY = 'pj_ai_estimator_quota';
export const FREE_LIMIT = 3;
export const PRO_LIMIT = 30;

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
  assumption_note: string | null;
  confidence: Confidence;
}

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
- When portion size is not stated, assume a standard restaurant or home serving and record that assumption in the item's "assumption_note".
- List up to 5 probable hidden additions that are easy to miss (cooking oils, butter, seasoning rubs, sauces or dressings not visible) in the top-level "hidden_items" array as plain phrases. Lean toward more of them when the description is vague or the meal is complex, but never invent items just to reach 5. Favor additions the person likely actually ate (sauces, butter, oils on the food itself) over trace prep residues that barely touch the food. Do NOT inflate line item macros to cover them.
- Never invent a confident number for something you genuinely cannot judge. If you are unsure about an item, still give your best estimate but mark its "confidence" as "low".
- Every line item must include a "confidence" of "high", "medium", or "low".
- Keep numbers realistic and internally consistent (calories should roughly match 4*protein_g + 4*carbs_g + 9*fat_g).

OUTPUT FORMAT:
Respond with ONLY valid minified JSON. No markdown, no code fences, no commentary before or after. Use this exact shape:
{"no_food_detected":false,"meal_name_suggestion":string,"line_items":[{"name":string,"portion_description":string,"calories":number,"protein_g":number,"carbs_g":number,"fat_g":number,"assumption_note":string|null,"confidence":"high"|"medium"|"low"}],"hidden_items":[string]}

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
    assumption_note: typeof it?.assumption_note === 'string' && it.assumption_note.trim()
      ? it.assumption_note.trim()
      : null,
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
  const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  if (!apiKey) return { ok: false, kind: 'no_key' };

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

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  let data: any;
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1500,
        temperature: 0.1,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content }],
      }),
    });
    if (!res.ok) {
      // 4xx/5xx from the API. Treat as a service/network problem, never a use.
      return { ok: false, kind: 'network' };
    }
    data = await res.json();
  } catch {
    // Abort (timeout) or fetch failure (offline). Single network error state.
    return { ok: false, kind: 'network' };
  } finally {
    clearTimeout(timer);
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
