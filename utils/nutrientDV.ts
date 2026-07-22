// ── FDA Daily Value reference ─────────────────────────────────────────────────────────────────
// The FIXED reference a nutrition label's own %DV column is calculated against. This is a fact about
// the label, NOT the user's personal nutrient goals -- those live in the profile and move with the
// person; these numbers never change at runtime.
//
// ONE table, shared by everything that converts between an amount and a percent: the label scanner's
// review card and the manual amount/%DV fields in Create Food and Edit Food. Two copies would let the
// two screens quietly disagree about what 100% of Vitamin C is.
//
// Nutrients with no real published DV are omitted ON PURPOSE (calories, protein, trans fat, poly and
// mono fat, sugar, sugar alcohols, caffeine). Deriving a number for those would be inventing data:
// there is no official percentage, and real labels never print one. Protein is the notable case --
// the FDA does define 50g, but labels essentially never print protein's %DV, so it stays amount-only
// everywhere for consistency with the scanner (decided 2026-07-22).
export const DV_REFERENCE: Record<string, number> = {
  fat: 78, saturatedFat: 20, cholesterol: 300, sodium: 2300, carbs: 275, fiber: 28,
  addedSugars: 50, potassium: 4700,
  vitaminA: 900, vitaminC: 90, vitaminD: 20, vitaminE: 15, vitaminK: 120,
  vitaminB6: 1.7, folate: 400, vitaminB12: 2.4, biotin: 30,
  thiamin: 1.2, riboflavin: 1.3, niacin: 16, choline: 550,
  calcium: 1300, iron: 18, magnesium: 420, zinc: 11, copper: 0.9,
};

/** Amount -> percent of the FDA daily value. Null when the nutrient has no published DV. */
export function amountToPercentDV(key: string, amount: number): number | null {
  const dv = DV_REFERENCE[key];
  if (!dv || isNaN(amount)) return null;
  return Math.round((amount / dv) * 100);
}

/** Percent of the FDA daily value -> amount. Null when the nutrient has no published DV. */
export function percentDVToAmount(key: string, percent: number): number | null {
  const dv = DV_REFERENCE[key];
  if (!dv || isNaN(percent)) return null;
  return Math.round((percent / 100) * dv * 10) / 10;
}
