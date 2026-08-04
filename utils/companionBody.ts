// Conditional BODY-MEASUREMENTS context for Otto (on-demand dataset #5 -- same pattern as companionSleep /
// companionFood / companionWorkouts / companionPRs). Body measurements are the SPARSE dataset (logged
// weekly/monthly, not daily), so unlike food/sleep this isn't windowed to 30 days -- it carries the full
// (bounded) history. The always-on snapshot already has latest WEIGHT + recent weight change + goal weight,
// so this block deliberately does NOT touch weight; it fills what the snapshot can't: the 13 tape-measure
// circumference fields + the Navy body-fat estimate, each field's most-recent value, its change since the
// user's first logged entry, and the session history. Attached only when a message is about measurements /
// body fat / a specific body part.
//
// Numbers come from the Body Measurements screen's OWN helpers (utils/bodyMeasurements), so they are
// identical to what Stats > BODY shows (honest-numbers rule). Two tiers:
//   Tier 1  CURRENT: each logged field's last-known value (in the user's unit) + how long ago + staleness +
//           delta since their first entry, plus the latest Navy BF%.
//   Tier 2  HISTORY: each logged session newest-first (date + fields measured + BF%) for "when did I last
//           measure" / "how many times" / trend questions.
import {
  loadMeasurements, loadBodyMeasureSettings,
  lastKnownFor, deltaFromStart, lastKnownBodyFat,
  toDisplay, unitLabel, relativeAge, daysSince, inToCm,
  MEASURE_FIELDS, STALE_DAYS, type BodyMeasurementEntry, type MeasurementUnit,
} from './bodyMeasurements';

const MAX_HISTORY = 24;     // sessions listed in Tier 2 (measurements are sparse; this is plenty)
const CHAR_BUDGET = 4000;

const r1 = (n: number) => Math.round(n * 10) / 10;
const fmtShort = (dk: string) => {
  try { return new Date(dk + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
  catch { return dk; }
};
// A stored-inches delta -> the user's unit, signed string ("+1.5", "-0.5").
const fmtDelta = (deltaIn: number, unit: MeasurementUnit): string => {
  const v = r1(unit === 'cm' ? inToCm(deltaIn) : deltaIn);
  return `${v > 0 ? '+' : ''}${v}`;
};

// Body-measurement words (a specific field, or a measurement / body-fat concept) + an ask/possessive.
// Deliberately NOT hooked to isDayRecall (measurements aren't a daily-recall thing) and NOT triggered by
// bare "weight" (the always-on snapshot already answers weight). Generous within that: a false positive
// costs a few hundred tokens, a false negative reads as "I don't have that."
/**
 * ⚠️ MEASURED 2026-08-04: the old version caught **60% of 42 realistic phrasings**, missing "body fat
 * percentage update", "chest measurements", "arms inches", "measurements update" and "chest", because it
 * needed a body word AND a separate ask word together. Same fix and same asymmetry as the food and sleep
 * detectors: a miss means Otto answers without their tape measurements, a false positive costs tokens.
 *
 * ⚠️ THE BODY-PART WORDS OVERLAP WITH TRAINING ("chest", "back", "arms"), so a workout question has to be
 * excluded explicitly or every "good chest workout" drags the measurement history along with it.
 */
export const messageWantsBody = (text: string): boolean => {
  const t = (text || '').toLowerCase();
  // A training question that happens to name a body part is not a measurements question.
  if (/\b(workouts?|routines?|exercises?|sets?|reps?|lift(?:s|ing)?|train(?:ing)?|press|curl|squat|deadlift|row)\b/.test(t)) return false;
  // Nor is an injury one. "My shoulder keeps popping" is about pain, not circumference.
  if (/\b(pain|painful|hurts?|hurting|sore|stiff|ache|aching|popping|clicking|injur(?:y|ed)|strain(?:ed)?|pull(?:ed)? a|tweaked)\b/.test(t)) return false;

  // Unambiguous: these words are only ever about measuring.
  const measuring = /\b(measurement|measurements|measure(?:d|ing)?|tape|circumference|body ?fat|bodyfat|bf%|body composition|navy|inches|arm size|leg size)\b/;
  if (measuring.test(t)) return true;

  // Body parts need something around them, since they are also everyday words.
  const part = /\b(waist|neck|shoulders?|chest|hips?|bicep|biceps|forearms?|thighs?|calf|calves|arms?)\b/;
  const ask = /\b(did|do|does|had|have|how|what|whats|what['’]s|when|last|latest|current|my|change|changed|trend|trending|progress|since|been|big|size|lost|gained|down|up|inch|cm|update|check)\b/;
  return part.test(t) && (ask.test(t) || t.trim().split(/\s+/).length <= 3);
};

export const buildBodyContextIfRelevant = async (message: string): Promise<string | null> => {
  if (!messageWantsBody(message || '')) return null;

  let entries: BodyMeasurementEntry[] = [];
  let unit: MeasurementUnit = 'in';
  try {
    entries = await loadMeasurements();
    const settings = await loadBodyMeasureSettings();
    unit = settings.unit;
  } catch { return null; }
  if (!entries.length) return null; // nothing logged -> let Otto handle it from the KB (offer to log)

  const u = unitLabel(unit);

  // Tier 1: CURRENT -- each field that has ANY logged value, most-recent value + age + delta since start.
  const currentLines: string[] = [];
  for (const f of MEASURE_FIELDS) {
    const lk = lastKnownFor(entries, f.key);
    if (!lk) continue;
    const stale = daysSince(lk.date) > STALE_DAYS;
    const delta = deltaFromStart(entries, f.key);
    const deltaStr = delta === null ? 'first entry' : `${fmtDelta(delta, unit)} ${u} since start`;
    currentLines.push(
      `- ${f.label}: ${toDisplay(lk.value, unit)} ${u} · ${relativeAge(lk.date)}${stale ? ' (may be out of date)' : ''} · ${deltaStr}`,
    );
  }
  const bf = lastKnownBodyFat(entries);
  if (bf) {
    const stale = daysSince(bf.date) > STALE_DAYS;
    currentLines.push(`- Body fat (Navy estimate): ${bf.value}% · ${relativeAge(bf.date)}${stale ? ' (may be out of date)' : ''}`);
  }

  // Tier 2: HISTORY -- each logged session, newest first, char-budget + count bounded.
  const histLines: string[] = [];
  let size = 0, dropped = 0;
  for (const e of entries) {
    if (histLines.length >= MAX_HISTORY) { dropped = entries.length - histLines.length; break; }
    const count = MEASURE_FIELDS.filter(f => typeof e.values[f.key] === 'number').length;
    const bfStr = typeof e.bodyFat === 'number' ? ` · ${e.bodyFat}% BF` : '';
    const line = `- ${fmtShort(e.date)}: ${count} field${count === 1 ? '' : 's'}${bfStr}`;
    if (histLines.length > 0 && size + line.length > CHAR_BUDGET) { dropped = entries.length - histLines.length; break; }
    histLines.push(line);
    size += line.length + 1;
  }

  const out: string[] = [
    `BODY MEASUREMENTS (the user's actual logged tape measurements + Navy body-fat estimate). Values in ${u}.`,
    `These match the Body Measurements screen (Stats > BODY) exactly -- quote them verbatim; never invent a`,
    `field or value. This does NOT include weight (the always-on snapshot already has latest weight + change).`,
    '',
    'CURRENT (each logged field: most-recent value · how long ago · change since the first logged entry):',
    ...currentLines,
    '(Any of the 13 fields not listed here has never been logged.)',
    '',
    'HISTORY (each logged measurement session, newest first: date · fields measured · body fat if computed):',
    ...histLines,
  ];
  if (dropped > 0) out.push(`(${dropped} older session${dropped === 1 ? '' : 's'} omitted to save space.)`);
  out.push(
    '',
    'How to answer:',
    '- "What\'s my <field>" -> give the CURRENT value + how recent it is. If it\'s tagged "may be out of date", say so honestly rather than implying it\'s fresh.',
    '- "How has my <field> changed / trended" -> use the "since start" delta; for the full graph point them to Stats > BODY (the Body Measurements screen has per-field trends).',
    '- "When did I last measure / how many times" -> read the HISTORY list.',
    '- Body fat here is the U.S. Navy tape estimate (neck/waist, + hips for women), not a clinical scan like DEXA -- it can be off a few points; it is informational only, not medical advice.',
    '- A field with no value has never been measured -> say so plainly and suggest logging it on the Body Measurements screen (Stats > BODY, or the LOG button on its card). Never invent a number.',
  );
  return out.join('\n');
};
