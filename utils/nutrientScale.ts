// utils/nutrientScale.ts
//
// ONE definition of "how much of this food did you eat, relative to the size its stored nutrient
// numbers describe". Before this file that calculation was copy-pasted into fourteen places (Home,
// Log, the nutrient drilldown, Stats, Day Detail, the stats trend data, the weekly and monthly
// summary generators, the Effort vs Results report and Smart Tips), which is how a single wrong
// assumption ended up living in all of them at once.
//
// ⚠️ THIS IS A VERBATIM MOVE, NOT A FIX. The logic below is character-for-character what those call
// sites already did, including its known bug: an entry's `servingGrams` records the serving the user
// PICKED, while `foodNutrients` describes the food's own base serving, and those are only the same
// thing when the user left the serving picker alone. Custom foods and text-searched FatSecret foods
// therefore scale against the wrong reference. Consolidating first, correcting second, so the
// consolidation can be verified by "no number moved anywhere".
//
// See CELEBRATION-adjacent note: nothing here touches calories, protein, carbs or fat. Those are
// stored on the entry directly and read straight back; they never went through this maths.

/**
 * The multiplier to apply to an entry's stored `foodNutrients` values.
 * Returns 0 when the entry carries too little information to scale (missing rate or serving size),
 * which callers already treat as "contributes nothing".
 */
export function entryNutrientScale(e: any): number {
  // Recorded at save time by whoever actually knew the answer. Everything below this line is the old
  // guesswork, kept only for entries logged before that number existed.
  if (typeof e?.nutrientScale === 'number' && isFinite(e.nutrientScale)) return e.nutrientScale;

  if (e?.fsId) {
    return (e.calPer100g && e.calPer100g > 0) ? (e.cal / e.calPer100g) : 0;
  }
  const sg = e?.servingGrams;
  const servingCal = sg && (e?.calPer100g ?? 0) > 0 ? (e.calPer100g ?? 0) * sg / 100 : 0;
  return servingCal > 0 ? e.cal / servingCal : 0;
}

// Recipe-logged entries store their nutrients as FLAT fields on the entry (e.sodium, e.magnesium, ...)
// ALREADY scaled to the logged portion, and carry no `foodNutrients` at all. So this is a fallback, not
// an alternative: it can only fire when there is nothing to scale, which is why it cannot double-count.
//
// This map used to exist in three separate copies covering only TWELVE nutrients, while a logged recipe
// actually stores twenty-four. That gap is why recipes showed up for sodium and fibre but read as zero
// for every B vitamin, magnesium, zinc, copper, caffeine, vitamin E and vitamin K. Keep this in step
// with what app/recipe-log.tsx writes onto the entry.
//
// NOT here because a logged recipe entry does not store them at all: potassium, calcium, iron. No
// reader can recover those; they had to be fixed on the writing side.
export const FLAT_NUTRIENT_KEY: Record<string, string> = {
  'Fiber, total dietary':         'fiber',
  'Sugars, total including NLEA': 'sugar',
  'Added Sugars':                 'addedSugars',
  'Sodium, Na':                   'sodium',
  'Cholesterol':                  'cholesterol',
  'Fatty acids, total saturated': 'saturatedFat',
  'Polyunsaturated Fat':          'polyunsaturatedFat',
  'Monounsaturated Fat':          'monounsaturatedFat',
  'Trans Fat':                    'transFat',
  'Caffeine':                     'caffeine',
  'Potassium, K':                 'potassium',
  'Calcium, Ca':                  'calcium',
  'Iron, Fe':                     'iron',
  'Magnesium, Mg':                'magnesium',
  'Zinc, Zn':                     'zinc',
  'Copper, Cu':                   'copper',
  'Vitamin A':                    'vitaminA',
  'Vitamin C':                    'vitaminC',
  'Vitamin D':                    'vitaminD',
  'Vitamin E':                    'vitaminE',
  'Vitamin K':                    'vitaminK',
  'Vitamin B6':                   'vitaminB6',
  'Vitamin B12':                  'vitaminB12',
  'Biotin':                       'biotin',
  'Choline':                      'choline',
  'Folate':                       'folate',
  'Niacin':                       'niacin',
  'Riboflavin':                   'riboflavin',
  'Thiamin':                      'thiamin',
};

/** A recipe-style flat value for this nutrient, or null when the entry carries none. */
export function entryFlatNutrient(e: any, nutrientName: string): number | null {
  const key = FLAT_NUTRIENT_KEY[nutrientName];
  if (!key) return null;
  const v = e?.[key];
  return typeof v === 'number' ? v : null;
}

/**
 * A single nutrient's contribution from one entry.
 * Scaled when the entry carries a nutrient block; taken as-is for recipe entries, whose flat fields are
 * already the portion total. Returns 0 when the entry has neither.
 */
export function entryNutrient(e: any, nutrientName: string): number {
  const n = e?.foodNutrients?.find((fn: any) => fn.nutrientName === nutrientName);
  if (n) return (n.value || 0) * entryNutrientScale(e);
  return entryFlatNutrient(e, nutrientName) ?? 0;
}
