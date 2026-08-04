// Conditional FOOD-LOG context for Otto (on-demand dataset #3 -- same pattern as companionWorkouts /
// companionPRs). Otto's always-on snapshot (companionStats) already carries today's nutrition + 7-day
// AVERAGES + goals, so this fills only the two gaps that snapshot can't: (1) a SPECIFIC past day's totals
// ("how many calories did I eat on June 24"), and (2) the ITEMIZED foods for a named day ("what did I eat
// Tuesday"). Attached only when a message is about food or is a whole-day recall.
//
// Two tiers so the token cost stays bounded:
//   Tier 1  per-day TOTALS for the last 30 days (calories, macros, fiber/sugar/sodium, water) -- one
//           compact line/day. Numbers come from the app's OWN exclusion-aware loader (loadWindowDays), so
//           they are identical to what the app/coach show (honest-numbers rule). Oldest-first budget trim.
//   Tier 2  ITEMIZED foods per meal, only for a day the user actually NAMES (bounded) -- the one piece
//           that must be gated, because food NAMES are unbounded text.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildEngineContext, loadWindowDays, type WindowDay, type EngineContext } from './smartTipsEngine';
import { loadMealSlots, getMealDisplayName } from './mealSlots';
import { isDayRecall } from './companionWorkouts';

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS: Record<string, number> = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3, may: 4, jun: 5, june: 5,
  jul: 6, july: 6, aug: 7, august: 7, sep: 8, sept: 8, september: 8, oct: 9, october: 9, nov: 10,
  november: 10, dec: 11, december: 11,
};
const WINDOW_DAYS = 30;
const CHAR_BUDGET = 7000;
const MAX_NAMED_DAYS = 2;   // how many specifically-named days we itemize (Tier 2)
const MAX_ITEMS_PER_DAY = 30;

const pad = (n: number) => String(n).padStart(2, '0');
const keyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const r0 = (n: number) => Math.round(n);
const commas = (n: number) => r0(n).toLocaleString('en-US');
const fmtShort = (dk: string) => {
  try { return new Date(dk + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
  catch { return dk; }
};

// Food words, OR the shared whole-day recall ("what did I do on June 24") so a broad day question also
// pulls the nutrition slice. Generous: a false positive costs a few tokens, a false negative reads as
// "I don't have that."
/**
 * ⚠️ MEASURED 2026-08-04: the old version caught **57% of 42 realistic phrasings**. It needed a food word
 * AND a separate "ask" word in the same message, so "whats my water intake looking like", "macros for my
 * breakfast", "how's my hydration" and "protein count for eggs" all missed -- and a miss means Otto answers
 * about their eating with NONE of their food log, which for a Supporter is the paid feature failing.
 *
 * ⚠️ THE COMMENT ABOVE ALREADY SAID "generous", AND IT WAS NOT. The and-condition quietly made it strict.
 * A food word alone is now enough. The asymmetry is the justification, same as the exercise cap and the
 * sleep detector: a false positive costs a few hundred tokens, a miss costs the answer.
 */
export const messageWantsFood = (text: string): boolean => {
  const t = (text || '').toLowerCase();
  const food = /\b(ate|eat|eats|eating|eaten|food|foods|meal|meals|breakfast|lunch|dinner|brunch|snacks?|calories?|cals?|kcal|macros?|protein|carbs?|carbohydrates?|fats?|fiber|fibre|sugar|sodium|nutrition|nutrients?|diet|dieting|deficit|surplus|water|hydration|hydrated|drank|drink(?:ing)?|fasting|intake|portion|serving)\b/;
  if (food.test(t)) return true;
  return isDayRecall(t);
};

// Resolve any specific days the user NAMED to date keys (for Tier 2 itemizing). Handles yesterday/today,
// weekday names (most recent past), "June 24" / "jun 24", "6/24", and a bare ordinal "the 24th" (this
// month, or last month if that would be in the future). Never returns a future date. Exported + shared:
// the sleep builder (and future date-scoped datasets) reuse this so date parsing lives in one place.
export const resolveNamedDays = (t: string, today: Date): string[] => {
  const out = new Set<string>();
  const todayKey = keyOf(today);
  const add = (d: Date) => { const k = keyOf(d); if (k <= todayKey) out.add(k); };

  if (/\byesterday\b/.test(t)) { const d = new Date(today); d.setDate(today.getDate() - 1); add(d); }
  if (/\btoday\b/.test(t)) add(new Date(today));

  // month name + day, e.g. "june 24", "jun 24th"
  let m: RegExpExecArray | null;
  const monRe = /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sept?|september|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?\b/g;
  while ((m = monRe.exec(t)) !== null) {
    const mon = MONTHS[m[1]]; const day = parseInt(m[2], 10);
    if (mon === undefined || !(day >= 1 && day <= 31)) continue;
    let d = new Date(today.getFullYear(), mon, day, 12, 0, 0);
    if (keyOf(d) > todayKey) d = new Date(today.getFullYear() - 1, mon, day, 12, 0, 0); // future -> last year
    add(d);
  }

  // numeric M/D, e.g. "6/24"
  const slashRe = /\b(\d{1,2})\/(\d{1,2})\b/g;
  while ((m = slashRe.exec(t)) !== null) {
    const mon = parseInt(m[1], 10) - 1; const day = parseInt(m[2], 10);
    if (!(mon >= 0 && mon <= 11) || !(day >= 1 && day <= 31)) continue;
    let d = new Date(today.getFullYear(), mon, day, 12, 0, 0);
    if (keyOf(d) > todayKey) d = new Date(today.getFullYear() - 1, mon, day, 12, 0, 0);
    add(d);
  }

  // weekday name -> most recent past occurrence (incl. today)
  const wdRe = /\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/g;
  while ((m = wdRe.exec(t)) !== null) {
    const target = WEEKDAY_LONG.map(w => w.toLowerCase()).indexOf(m[1]);
    if (target < 0) continue;
    const d = new Date(today);
    const diff = (today.getDay() - target + 7) % 7;
    d.setDate(today.getDate() - diff);
    add(d);
  }

  // bare ordinal "the 24th" (only if no month already matched it) -> this month, else last month
  const ordRe = /\bthe\s+(\d{1,2})(?:st|nd|rd|th)\b/g;
  while ((m = ordRe.exec(t)) !== null) {
    const day = parseInt(m[1], 10);
    if (!(day >= 1 && day <= 31)) continue;
    let d = new Date(today.getFullYear(), today.getMonth(), day, 12, 0, 0);
    if (keyOf(d) > todayKey) d = new Date(today.getFullYear(), today.getMonth() - 1, day, 12, 0, 0);
    add(d);
  }

  return Array.from(out).sort().reverse().slice(0, MAX_NAMED_DAYS);
};

// Load up to 30 days of exclusion-correct per-day totals by stitching loadWindowDays (its internal window
// is 14 days), so every number matches the app's own math exactly.
const loadThirtyDays = async (todayKey: string, ctx: EngineContext, ws: any, cutoffKey: string): Promise<WindowDay[]> => {
  const seen = new Set<string>();
  const all: WindowDay[] = [];
  for (const off of [0, 14, 28]) {
    let chunk: WindowDay[] = [];
    try { chunk = await loadWindowDays(todayKey, ctx, ws, off); } catch { chunk = []; }
    for (const d of chunk) {
      if (seen.has(d.dateKey)) continue;
      seen.add(d.dateKey);
      if (d.dateKey >= cutoffKey && d.hasFoodData) all.push(d);
    }
  }
  return all.sort((a, b) => (a.dateKey < b.dateKey ? 1 : a.dateKey > b.dateKey ? -1 : 0)); // newest first
};

// Itemized foods for one named day, grouped by meal. Reads the raw day record + the user's meal slots.
const itemizeDay = async (dayKey: string, slots: any, cache: any): Promise<string | null> => {
  let day: any = null;
  try { const raw = await AsyncStorage.getItem(`pj_${dayKey}`); day = raw ? JSON.parse(raw) : null; } catch { return null; }
  const entries: any[] = Array.isArray(day?.entries) ? day.entries : [];
  if (!entries.length) return null;

  // Preserve the user's meal-slot order; unknown meals fall to the end.
  const order = new Map<string, number>(slots.map((s: any, i: number) => [s.id, i]));
  const groups = new Map<string, string[]>();
  let shown = 0;
  for (const e of entries) {
    if (shown >= MAX_ITEMS_PER_DAY) break;
    const label = getMealDisplayName(e.meal || '', slots, cache) || 'Other';
    const cal = r0(e.cal || 0);
    const name = String(e.name || 'Food').replace(/\s+/g, ' ').trim();
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(`${name} (${cal} cal)`);
    shown++;
  }
  const labels = Array.from(groups.keys()).sort((a, b) => {
    const ai = order.has(findId(a, slots)) ? order.get(findId(a, slots))! : 999;
    const bi = order.has(findId(b, slots)) ? order.get(findId(b, slots))! : 999;
    return ai - bi;
  });
  const lines = labels.map(l => `    ${l}: ${groups.get(l)!.join(', ')}`);
  const dk = dayKey;
  const dow = WEEKDAY_LONG[new Date(dk + 'T12:00:00').getDay()];
  const more = entries.length > shown ? `\n    (+${entries.length - shown} more items)` : '';
  return `${dow} ${fmtShort(dk)} foods:\n${lines.join('\n')}${more}`;
};
const findId = (label: string, slots: any): string => {
  const s = slots.find((x: any) => x.name === label);
  return s ? s.id : label;
};

// If the message is about food / a whole day, return a compact food-log block; otherwise null.
export const buildFoodContextIfRelevant = async (message: string): Promise<string | null> => {
  if (!messageWantsFood(message || '')) return null;

  const today = new Date();
  const todayKey = keyOf(today);
  const cutoff = new Date(today); cutoff.setDate(today.getDate() - (WINDOW_DAYS - 1));
  const cutoffKey = keyOf(cutoff);
  const weekStart = new Date(today); weekStart.setDate(today.getDate() - today.getDay());
  const weekStartKey = keyOf(weekStart);

  let ctx: EngineContext;
  try { ctx = await buildEngineContext(todayKey); } catch { return null; }
  let ws: any = null;
  try { const raw = await AsyncStorage.getItem('pj_workout_state'); ws = raw ? JSON.parse(raw) : null; } catch {}
  // Match the user's Log tab: when they display NET carbs (total minus fiber and sugar alcohols), so must
  // Otto, or its carb number contradicts what they see on the card.
  let showNetCarbs = false;
  try { const raw = await AsyncStorage.getItem('pj_settings'); if (raw) showNetCarbs = !!JSON.parse(raw).showNetCarbs; } catch {}

  const days = await loadThirtyDays(todayKey, ctx, ws, cutoffKey);
  if (!days.length) return null;

  // Tier 1: per-day totals, newest first, oldest trimmed to fit the budget.
  const dayLines: string[] = [];
  let size = 0, dropped = 0;
  for (const d of days) {
    const label = `${WEEKDAY[new Date(d.dateKey + 'T12:00:00').getDay()]} ${fmtShort(d.dateKey)}`
      + (d.dateKey === todayKey ? ' (today so far)' : '')
      + (d.dateKey >= weekStartKey ? ' [this week]' : '');
    const carbsVal = showNetCarbs ? Math.max(0, d.carbs - d.fiber - (d.sugarAlcohols || 0)) : d.carbs;
    const parts = [
      `${commas(d.consumed)} cal`,
      `P ${r0(d.protein)}g C ${r0(carbsVal)}g F ${r0(d.fat)}g`,
    ];
    if (d.fiber > 0) parts.push(`fiber ${r0(d.fiber)}g`);
    if (d.sugar > 0) parts.push(`sugar ${r0(d.sugar)}g`);
    if (d.sodium > 0) parts.push(`sodium ${r0(d.sodium)}mg`);
    if (d.waterLogged > 0) parts.push(`water ${r0(d.waterLogged)} oz`);
    const line = `- ${label}: ${parts.join(' | ')}`;
    if (dayLines.length > 0 && size + line.length > CHAR_BUDGET) { dropped = days.length - dayLines.length; break; }
    dayLines.push(line);
    size += line.length + 1;
  }

  // Tier 2: itemized foods ONLY when the user actually wants the food LIST ("what did I eat / what foods /
  // for lunch"), NOT for a plain totals question ("how many calories on June 24"). Sending the item list on
  // a totals question wastes tokens AND tempts the model to re-sum the items and get the total wrong.
  const lc = (message || '').toLowerCase();
  const nutrientAsk = /\b(calorie|calories|kcal|protein|carbs?|carbohydrate|fats?|macros?|fiber|sugar|sodium|how many|how much|total|average|avg)\b/.test(lc);
  const listAsk = /\b(what did i (?:eat|have)|what.*\bi (?:ate|eat)\b|what foods?|list|itemize|breakdown|what was in|meals?|breakfast|lunch|dinner|snack)\b/.test(lc);
  const wantsItems = listAsk || (!nutrientAsk && /\b(ate|eat|eaten|foods?)\b/.test(lc));
  const named = wantsItems ? resolveNamedDays(lc, today).filter(k => k >= cutoffKey) : [];
  const itemBlocks: string[] = [];
  if (named.length) {
    const { mealSlots, slotNameCache } = await loadMealSlots();
    for (const k of named) {
      const block = await itemizeDay(k, mealSlots, slotNameCache);
      if (block) itemBlocks.push(block);
    }
  }

  const out: string[] = [
    `FOOD LOG (the user's actual logged nutrition, last ${WINDOW_DAYS} days, newest first). Daily totals below;`,
    `today is partial ("so far"). "This week" = on or after ${fmtShort(weekStartKey)} (marked [this week]). These`,
    `totals already match the user's Log tab exactly${showNetCarbs ? ' (carbs are shown NET: total minus fiber and sugar alcohols, matching their card)' : ''} -- quote them VERBATIM; do NOT re-add or`,
    `recompute. The always-on snapshot already has today + 7-day averages, so use THIS for a SPECIFIC past day`,
    `or a day-by-day trend. Never invent a day, food, or value.`,
    '',
    ...dayLines,
  ];
  if (dropped > 0) out.push(`(${dropped} older logged day${dropped === 1 ? '' : 's'} within 30 days omitted to save space.)`);
  if (itemBlocks.length) {
    out.push('', 'ITEMIZED foods for the day(s) the user named (each food + its calories):', ...itemBlocks.map(b => `  ${b}`));
  }
  out.push(
    '',
    'How to answer:',
    '- One nutrient for one day ("how many calories / how much protein on June 24") -> give JUST that day\'s number from its line, stated cleanly. Do NOT also volunteer the 7-day average, and do NOT mention "itemized data" -- just answer the question.',
    '- A day\'s totals -> read them straight off that day\'s line; never re-add the food items to get a total (the line is already correct).',
    '- "What did I eat on [day]" -> list the foods by meal from the ITEMIZED section if present; if not, give the totals and point them to the Log tab for the item list.',
    '- Aggregates ("average protein this week", "how many days over goal") -> compute from the daily lines / [this week] days.',
    '- A day NOT shown here is either older than 30 days or had nothing logged -> say so plainly; do not invent it.',
    'WHERE TO SEE ANY PAST DAY IN THE APP: on the LOG tab, tap the date at the top (or use the arrows) to step',
    'back to any day. Backup: Stats -> Calendar, or the Home header calendar icon (Day Detail).',
  );
  return out.join('\n');
};
