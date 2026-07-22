// Tests for the nutrition label parser (utils/nutritionLabelParser.ts). Pure logic, no React/RN.
// Run: compile with tsc to a temp dir and `node` the output.
// Uses REAL block data from the 2026-07-21 device scan (a granola bar box), not invented fixtures --
// exact text/confidence/boundingBox values captured from the actual OCR Test diagnostic run.
import { parseNutritionLabel, OcrBlockLike } from './nutritionLabelParser';

declare const process: { exit(code: number): void };

let passed = 0, failed = 0;
const fails: string[] = [];
function check(name: string, cond: boolean, got?: any) {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; fails.push(name); console.log(`  ✗ ${name}${got !== undefined ? `  (got: ${JSON.stringify(got)})` : ''}`); }
}

const b = (text: string, x: number, y: number, width: number, height: number, confidence = 1): OcrBlockLike =>
  ({ text, confidence, boundingBox: { x, y, width, height } });

console.log('\nnutrition label parser\n');

// ── 1. Real single-column scan (granola bar box, device-captured 2026-07-21) ──────────────────────
{
  const blocks: OcrBlockLike[] = [
    b('Nutrition Facts', 1066, 409, 903, 155),
    b('8 servings per container', 1078, 574, 856, 111),
    b('Serving size', 1078, 678, 394, 98),
    b('1 Bar (37g)', 1611, 672, 353, 92),
    b('Amount per serving', 1090, 832, 457, 71),
    b('Calories 130', 1075, 855, 858, 189),
    b('% Daily Value*', 1600, 1060, 346, 66),
    b('Total Fat 3.5g', 1102, 1137, 399, 83),
    b('4%', 1834, 1131, 117, 82),
    b('Saturated Fat 0.5g', 1148, 1228, 458, 87),
    b('3%', 1834, 1219, 117, 94),
    b('Trans Fat 0g', 1148, 1324, 317, 90),
    b('Cholesterol 0mg', 1107, 1417, 475, 85),
    b('0%', 1834, 1417, 117, 85),
    b('Sodium 115mg', 1107, 1510, 400, 85),
    b('5%', 1834, 1510, 117, 85),
    b('Total Carbohydrate 25g', 1102, 1603, 500, 85),
    b('9%', 1834, 1603, 117, 85),
    b('Dietary Fiber 2g', 1148, 1696, 400, 85),
    b('6%', 1834, 1696, 117, 85),
    b('Total Sugars 11g', 1148, 1789, 400, 85),
    b('Incl. 11g Added Sugars', 1148, 1882, 500, 85),
    b('22%', 1834, 1882, 117, 85),
    b('Protein 2g', 1102, 1975, 350, 85),
    // Vitamins: two per row, "Vitamin D 2mcg 10%" style -- value+percent inline together.
    b('Vitamin D 2mcg 10%', 1102, 2068, 500, 85),
    b('Calcium 130mg 10%', 1834, 2068, 500, 85),
    b('Iron 1.8mg 10%', 1102, 2161, 500, 85),
    b('Potassium 90mg 2%', 1834, 2161, 500, 85),
    // B-vitamins printed as %DV ONLY, no raw amount -- the exact case the value<->%DV
    // live-link feature exists for.
    b('Thiamin 10%', 1102, 2254, 300, 85),
    b('Riboflavin 10%', 1834, 2254, 300, 85),
    b('Niacin 10%', 1102, 2347, 300, 85),
    b('Vitamin B6 10%', 1834, 2347, 300, 85),
    b('Vitamin B12 10%', 1102, 2440, 300, 85),
    b('Zinc 10%', 1834, 2440, 300, 85),
    b('Choline 10%', 1102, 2533, 300, 85),
  ];

  const result = parseNutritionLabel({ text: '', blocks });

  check('calories = 130', result.fields.calories.value === 130, result.fields.calories.value);
  check('fat value = 3.5', result.fields.fat.value === 3.5, result.fields.fat.value);
  check('fat %DV = 4 (cross-block, separate column)', result.fields.fat.percentDV === 4, result.fields.fat.percentDV);
  check('saturatedFat = 0.5 / 3%', result.fields.saturatedFat.value === 0.5 && result.fields.saturatedFat.percentDV === 3, result.fields.saturatedFat);
  check('transFat = 0 (real value, not absent)', result.fields.transFat.value === 0 && result.fields.transFat.confidence !== null, result.fields.transFat);
  check('cholesterol = 0 / 0%', result.fields.cholesterol.value === 0 && result.fields.cholesterol.percentDV === 0, result.fields.cholesterol);
  check('sodium = 115 / 5%', result.fields.sodium.value === 115 && result.fields.sodium.percentDV === 5, result.fields.sodium);
  check('carbs = 25 / 9%', result.fields.carbs.value === 25 && result.fields.carbs.percentDV === 9, result.fields.carbs);
  check('fiber = 2 / 6%', result.fields.fiber.value === 2 && result.fields.fiber.percentDV === 6, result.fields.fiber);
  check('sugar = 11 (no %DV printed for Total Sugars)', result.fields.sugar.value === 11 && result.fields.sugar.percentDV === null, result.fields.sugar);
  check('addedSugars = 11 / 22% ("Incl. Xg" reversed pattern)', result.fields.addedSugars.value === 11 && result.fields.addedSugars.percentDV === 22, result.fields.addedSugars);
  check('protein = 2', result.fields.protein.value === 2, result.fields.protein.value);

  check('vitaminD value+percent both inline = 2 / 10%', result.fields.vitaminD.value === 2 && result.fields.vitaminD.percentDV === 10, result.fields.vitaminD);
  check('calcium value+percent both inline = 130 / 10%', result.fields.calcium.value === 130 && result.fields.calcium.percentDV === 10, result.fields.calcium);

  check('thiamin: %DV-only label derives a real value via DV reference', result.fields.thiamin.percentDV === 10 && result.fields.thiamin.value !== null, result.fields.thiamin);
  check('thiamin derived value = 10% of 1.2mg DV = 0.1 (rounded)', result.fields.thiamin.value === 0.1, result.fields.thiamin.value);
  check('choline: %DV-only, derives from 550mg DV', result.fields.choline.value === 55, result.fields.choline.value);

  check('serving description = "1 Bar (37g)"', result.serving.description === '1 Bar (37g)', result.serving.description);
  check('serving grams parsed out = 37', result.serving.grams === 37, result.serving.grams);
  check('servings per container = 8', result.servingsPerContainer.value === 8, result.servingsPerContainer.value);

  check('no core field missing (all 4 present)', result.missingCoreField === null, result.missingCoreField);
  check('low confidence count = 0 (everything was 100%)', result.lowConfidenceCount === 0, result.lowConfidenceCount);

  // Fields never printed on this label at all must stay untouched (null), never zeroed.
  check('caffeine never printed -> stays null, not 0', result.fields.copper === undefined || result.fields.copper.value === null);
}

// ── 2. Missing core field detection (simulates a cut-off/bad photo) ───────────────────────────────
{
  const blocks: OcrBlockLike[] = [
    b('Nutrition Facts', 1066, 409, 903, 155),
    b('Calories 200', 1075, 855, 858, 189),
    // Total Fat, Total Carbohydrate, Protein all missing -- as if the photo was cut off.
  ];
  const result = parseNutritionLabel({ text: '', blocks });
  check('missingCoreField reports the first missing one', result.missingCoreField === 'Total Fat', result.missingCoreField);
}

// ── 3. Low-confidence counting (simulates a blurry photo) ─────────────────────────────────────────
{
  const blocks: OcrBlockLike[] = [
    b('Calories 130', 1075, 855, 858, 189, 0.3),
    b('Total Fat 3.5g', 1102, 1137, 399, 83, 0.2),
    b('Protein 2g', 1102, 1975, 350, 85, 0.9),
    b('Total Carbohydrate 25g', 1102, 1603, 500, 85, 0.1),
  ];
  const result = parseNutritionLabel({ text: '', blocks });
  check('3 fields under the 0.5 threshold trips the low-confidence count', result.lowConfidenceCount === 3, result.lowConfidenceCount);
}

// ── 4. Name and value split into separate blocks (real device scans, 2026-07-21) ──────────────────
// Confirmed via the OCR Test diagnostic on two real boxes: Vision read "Calories" and its number
// as two disconnected blocks, both at 100% confidence, not a low-confidence misread. Exact text/
// position pulled from the real dumps (Krusteaz pancake mix, Campbell's canned chicken).
{
  const blocks: OcrBlockLike[] = [
    b('Nutrition Facts', 1037, 163, 1067, 165),
    b('About 11 servings per container', 1031, 375, 961, 135),
    b('Serving size 1/3 cup mix (40g)', 1031, 516, 1072, 129),
    b('Amount per serving', 1037, 762, 486, 89),
    b('Calories', 1043, 900, 587, 162),
    b('140', 1758, 844, 346, 223),
    b('% Daily Value*', 1705, 1106, 405, 97),
    b('Total Fat 1g', 1043, 1225, 410, 106),
    b('1%', 1975, 1225, 129, 105),
    b('Total Carbohydrate 31g', 1054, 1892, 500, 108),
    b('Protein 2g', 1043, 2200, 350, 85),
  ];
  const result = parseNutritionLabel({ text: '', blocks });
  check('calories = 140 despite name/value in separate blocks (pancake box)', result.fields.calories.value === 140, result.fields.calories.value);
  check('calories confidence still set (not nulled by the split)', result.fields.calories.confidence !== null, result.fields.calories.confidence);
}
{
  const blocks: OcrBlockLike[] = [
    b('Nutrition Facts', 955, 571, 1085, 195),
    b('About 4.5 servings per package', 955, 790, 1078, 130),
    b('Serving size', 949, 908, 364, 136),
    b('3 oz. drained (85g)', 1400, 901, 657, 144),
    b('Amount per serving', 955, 1157, 458, 88),
    b('Calories', 955, 1242, 504, 158),
    b('80', 1793, 1201, 240, 223),
    b('Total Fat 1.5g', 955, 1576, 393, 107),
  ];
  const result = parseNutritionLabel({ text: '', blocks });
  check('calories = 80 despite name/value in separate blocks (canned chicken)', result.fields.calories.value === 80, result.fields.calories.value);
}

// ── 5. Serving size merged into ONE block (real pancake box scan) ─────────────────────────────────
// Same product's earlier scan had "Serving size" and "1/3 cup mix (40g)" as separate blocks; this
// scan merged them into one -- both shapes have to work since Vision isn't consistent scan to scan.
{
  const blocks: OcrBlockLike[] = [
    b('Nutrition Facts', 1037, 163, 1067, 165),
    b('Serving size 1/3 cup mix (40g)', 1031, 516, 1072, 129),
    b('Calories', 1043, 900, 587, 162),
    b('140', 1758, 844, 346, 223),
  ];
  const result = parseNutritionLabel({ text: '', blocks });
  check('serving description parsed out of a MERGED label+value block', result.serving.description === '1/3 cup mix (40g)', result.serving.description);
  check('serving grams parsed out of the merged block = 40', result.serving.grams === 40, result.serving.grams);
}

// ── 6. "Servings per package" instead of "per container" (real canned chicken scan) ────────────────
{
  const blocks: OcrBlockLike[] = [
    b('Nutrition Facts', 955, 571, 1085, 195),
    b('About 4.5 servings per package', 955, 790, 1078, 130),
  ];
  const result = parseNutritionLabel({ text: '', blocks });
  check('servings per container = 4.5 despite label saying "per package"', result.servingsPerContainer.value === 4.5, result.servingsPerContainer.value);
}

// ── 7. Row tolerance scales with text size (synthetic, isolates the exact mechanism) ───────────────
// Simulates a farther-away photo: rows compressed to 20px apart, row height only 34px (vs ~85px
// up close). A fixed-pixel tolerance would treat these as the same row and grab the WRONG %DV
// (confirmed happening on real device scans -- cholesterol grabbed sodium's %DV on a farther-away
// shot); a tolerance proportional to the row's own height correctly keeps them separate.
{
  const blocks: OcrBlockLike[] = [
    b('Iron 2mg', 100, 600, 200, 34),          // no inline %DV -- must derive or cross-match
    b('Potassium 200mg', 100, 620, 300, 34),   // a DIFFERENT row, only 20px lower
    b('80%', 400, 620, 80, 34),                // potassium's own %DV, NOT iron's
  ];
  const result = parseNutritionLabel({ text: '', blocks });
  check("iron does not steal potassium's %DV from a compressed neighboring row", result.fields.iron.percentDV !== 80, result.fields.iron.percentDV);
  check('iron %DV instead derives correctly from its own value (2/18 DV = 11%)', result.fields.iron.percentDV === 11, result.fields.iron.percentDV);
}

// ── 8. Dual-column label: never read across into the second column ────────────────────────────────
// Shape of a real "Per serving | Per container" pint (Justin's protein ice cream, 2026-07-22), where
// Total Fat 8g was coming back carrying the CONTAINER column's 30% DV.
{
  const blocks: OcrBlockLike[] = [
    b('3 servings per container', 100, 100, 500, 40),
    b('Serving size', 100, 150, 300, 40),
    b('2/3 cup (90g)', 900, 150, 300, 40),
    b('Per serving', 700, 220, 220, 40),
    b('Per container', 1000, 220, 260, 40),
    b('Calories', 100, 280, 300, 60),
    b('140', 700, 280, 140, 60),
    b('420', 1000, 280, 140, 60),
    b('Total Fat', 100, 360, 250, 40),
    b('8g', 700, 360, 70, 40),
    b('10%', 830, 360, 90, 40),
    b('24g', 1000, 360, 80, 40),
    b('30%', 1150, 360, 90, 40),
    b('Total Carb.', 100, 420, 280, 40),
    b('17g', 700, 420, 80, 40),
    b('6%', 830, 420, 80, 40),
    b('51g', 1000, 420, 80, 40),
    b('18%', 1150, 420, 90, 40),
  ];
  const result = parseNutritionLabel({ text: '', blocks });
  check('dual column: calories takes the per-serving column (140, not 420)', result.fields.calories.value === 140, result.fields.calories.value);
  check('dual column: fat value from the per-serving column', result.fields.fat.value === 8, result.fields.fat.value);
  check("dual column: fat %DV does NOT come from the container column", result.fields.fat.percentDV === 10, result.fields.fat.percentDV);
  check('"Total Carb." abbreviation is recognised', result.fields.carbs.value === 17, result.fields.carbs.value);
  check('dual column: carbs %DV from the per-serving column', result.fields.carbs.percentDV === 6, result.fields.carbs.percentDV);
  check('dual column: serving size still read despite sitting right of the cut', result.serving.grams === 90, result.serving.grams);
}

// ── 9. Wording variants that real boxes print ─────────────────────────────────────────────────────
{
  const blocks: OcrBlockLike[] = [
    b('Sat. Fat 4g', 100, 100, 300, 40),
    b('Includes 9g Added Sugars', 100, 160, 500, 40),
    b('Cholest. 47mg', 100, 220, 300, 40),
    b('Total Carbs 19g', 100, 280, 300, 40),
  ];
  const result = parseNutritionLabel({ text: '', blocks });
  check('"Sat. Fat" abbreviation', result.fields.saturatedFat.value === 4, result.fields.saturatedFat.value);
  check('"Includes ... Added Sugars" long form', result.fields.addedSugars.value === 9, result.fields.addedSugars.value);
  check('"Cholest." abbreviation', result.fields.cholesterol.value === 47, result.fields.cholesterol.value);
  check('"Total Carbs" plural form', result.fields.carbs.value === 19, result.fields.carbs.value);
}

// ── 10. A stray "per container" fragment must NOT be read as a column header ──────────────────────
// OCR splits "3 servings per container" unpredictably; when the "per container" half arrived as its
// own left-margin block it was mistaken for the second column's header, the cut landed at the label's
// left edge, and EVERY nutrient row fell outside it (intermittent total-wipeout, 2026-07-22).
{
  const blocks: OcrBlockLike[] = [
    b('3 servings', 100, 100, 200, 40),
    b('per container', 320, 100, 260, 40),   // left margin, NOT a column header
    b('Total Fat 8g', 100, 200, 300, 40),
    b('10%', 830, 200, 90, 40),
    b('Protein 10g', 100, 260, 300, 40),
  ];
  const result = parseNutritionLabel({ text: '', blocks });
  check('stray "per container" fragment does not blank the label', result.fields.fat.value === 8, result.fields.fat.value);
  check('...and the rest of the rows survive too', result.fields.protein.value === 10, result.fields.protein.value);
}

// ── 11. OCR reading a zero as the letter O ────────────────────────────────────────────────────────
// Real failure: "Vitamin D 0mcg" came back as "Omcg", so the parser skipped it and took the NEXT
// number on the row -- which on a dual-column label is the container column's value.
{
  const blocks: OcrBlockLike[] = [
    b('Per serving', 700, 50, 220, 40),
    b('Per container', 1000, 50, 260, 40),
    b('Vitamin D', 100, 200, 250, 40),
    b('Omcg', 700, 200, 90, 40),            // OCR's letter-O zero
    b('0%', 830, 200, 70, 40),
    b('2mcg', 1000, 200, 90, 40),
    b('10%', 1150, 200, 90, 40),
  ];
  const result = parseNutritionLabel({ text: '', blocks });
  check('letter-O zero is read as 0, not skipped into the next column', result.fields.vitaminD.value === 0, result.fields.vitaminD.value);
}

// ── 12. Column cut found from the VALUES when headers and %DVs are unreadable ─────────────────────
// A glossy pint's "Per container" header and its faint %DV column both fail to OCR, but the values
// still read. Four vertical bands of numbers means two columns; two bands means one.
{
  const blocks: OcrBlockLike[] = [
    b('Total Fat', 100, 200, 250, 40),
    b('8g', 700, 200, 70, 40),   b('10%', 830, 200, 90, 40),
    b('24g', 1000, 200, 80, 40), b('30%', 1150, 200, 90, 40),
    b('Iron', 100, 260, 200, 40),
    b('0mg', 700, 260, 80, 40),  b('0%', 830, 260, 70, 40),
    b('2mg', 1000, 260, 80, 40), b('10%', 1150, 260, 90, 40),
  ];
  const result = parseNutritionLabel({ text: '', blocks });
  check('value-band cut: iron takes 0mg, not the container column 2mg', result.fields.iron.value === 0, result.fields.iron.value);
}

// ── 13. A single-column label must NOT be split between its values and its %DVs ────────────────────
// The dangerous inverse of the test above: two bands (values, %DVs) is ONE column. Cutting there
// would throw away every %DV on every normal label.
{
  const blocks: OcrBlockLike[] = [
    b('Total Fat', 100, 200, 250, 40), b('8g', 700, 200, 70, 40),  b('10%', 900, 200, 90, 40),
    b('Sodium', 100, 260, 250, 40),    b('35mg', 700, 260, 90, 40), b('2%', 900, 260, 70, 40),
    b('Protein', 100, 320, 250, 40),   b('3g', 700, 320, 70, 40),   b('6%', 900, 320, 70, 40),
  ];
  const result = parseNutritionLabel({ text: '', blocks });
  check('single column keeps its %DV (no false split)', result.fields.fat.percentDV === 10, result.fields.fat.percentDV);
  check('single column values still read', result.fields.sodium.value === 35, result.fields.sodium.value);
}

// ── 14. OCR letter-O inside a number ──────────────────────────────────────────────────────────────
{
  const blocks: OcrBlockLike[] = [b('Protein 1Og', 100, 100, 300, 40)];
  const result = parseNutritionLabel({ text: '', blocks });
  check('"1Og" is read as 10g', result.fields.protein.value === 10, result.fields.protein.value);
}

// ── 15. Second column classified: per-container (redundant) vs as-prepared (a different food) ─────
{
  // Ice cream: 3 servings per container, second column is exactly 3x the first.
  const container: OcrBlockLike[] = [
    b('3 servings per container', 100, 50, 500, 40),
    b('Per serving', 700, 100, 220, 40), b('Per container', 1000, 100, 260, 40),
    b('Calories', 100, 160, 300, 60), b('140', 700, 160, 140, 60), b('420', 1000, 160, 140, 60),
    b('Total Fat', 100, 220, 250, 40), b('8g', 700, 220, 70, 40), b('24g', 1000, 220, 80, 40),
    b('Sodium', 100, 280, 250, 40), b('120mg', 700, 280, 100, 40), b('360mg', 1000, 280, 110, 40),
    b('Protein', 100, 340, 250, 40), b('10g', 700, 340, 80, 40), b('30g', 1000, 340, 80, 40),
  ];
  const r1 = parseNutritionLabel({ text: '', blocks: container });
  check('per-container column is classified as container, not offered as a choice', r1.secondary?.kind === 'container', r1.secondary?.kind);
  check('per-container label still takes the per-serving numbers', r1.fields.calories.value === 140, r1.fields.calories.value);

  // Granola: 6 servings per container, but the second column is "with milk" -- NOT 6x anything.
  const prepared: OcrBlockLike[] = [
    b('About 6 servings per container', 100, 50, 600, 40),
    b('Granola', 700, 100, 200, 40), b('Granola with 1/2 Cup Fat Free Milk', 1000, 100, 400, 40),
    b('Calories', 100, 160, 300, 60), b('250', 700, 160, 140, 60), b('300', 1000, 160, 140, 60),
    b('Total Fat', 100, 220, 250, 40), b('12g', 700, 220, 80, 40), b('8g', 1000, 220, 70, 40),
    b('Sodium', 100, 280, 250, 40), b('100mg', 700, 280, 100, 40), b('160mg', 1000, 280, 110, 40),
    b('Protein', 100, 340, 250, 40), b('5g', 700, 340, 70, 40), b('10g', 1000, 340, 80, 40),
  ];
  const r2 = parseNutritionLabel({ text: '', blocks: prepared });
  check('as-prepared column is classified as a variant the user can choose', r2.secondary?.kind === 'variant', r2.secondary?.kind);
  check('variant label defaults to the first column (250 cal, not 300)', r2.fields.calories.value === 250, r2.fields.calories.value);
  check('variant column carries its own numbers (300 cal)', r2.secondary?.fields.calories.value === 300, r2.secondary?.fields.calories.value);
  check('variant column keeps its own fat (8g with milk vs 12g dry)', r2.secondary?.fields.fat.value === 8, r2.secondary?.fields.fat.value);
}

// ── 16. A dual-column row with no %DV arrives as ONE merged block ─────────────────────────────────
// Protein prints no %DV, so its row is just two numbers and OCR hands it back merged: "Protein 5g
// 10g". The first number is column one, the second is column two -- there is no separate right-hand
// cell to find (real granola label, 2026-07-22: As Prepared protein came back empty every scan).
{
  const blocks: OcrBlockLike[] = [
    b('About 6 servings per container', 100, 50, 600, 40),
    b('Granola', 700, 100, 200, 40), b('Granola with 1/2 Cup Fat Free Milk', 1000, 100, 400, 40),
    b('Calories', 100, 160, 300, 60), b('250', 700, 160, 140, 60), b('300', 1000, 160, 140, 60),
    b('Total Fat', 100, 220, 250, 40), b('12g', 700, 220, 80, 40), b('8g', 1000, 220, 70, 40),
    b('Sodium', 100, 280, 250, 40), b('100mg', 700, 280, 100, 40), b('160mg', 1000, 280, 110, 40),
    b('Protein 5g 10g', 100, 340, 900, 40),   // merged across both columns
  ];
  const result = parseNutritionLabel({ text: '', blocks });
  check('merged no-%DV row: primary protein is the first number', result.fields.protein.value === 5, result.fields.protein.value);
  check('merged no-%DV row: variant protein is the second number', result.secondary?.fields.protein.value === 10, result.secondary?.fields.protein.value);
}

// ── 17. The cut comes from the Calories row, not the column HEADING's left edge ───────────────────
// A heading ("Granola with 1/2 Cup Fat Free Milk") is wider than the numbers beneath it and starts
// further right, so using its x put the boundary PAST the second column's own values: fat and sodium
// were being back-derived from their %DV, and Protein (no %DV printed) came back empty every scan.
{
  const blocks: OcrBlockLike[] = [
    b('About 6 servings per container', 60, 40, 500, 30),
    b('Granola', 480, 90, 90, 26),
    b('Granola with 1/2 Cup Fat Free Milk', 585, 85, 210, 40),   // heading starts RIGHT of its column
    b('Calories', 40, 160, 180, 50),
    b('250', 440, 155, 120, 60),
    b('300', 680, 155, 120, 60),
    b('Total Fat', 40, 240, 130, 26), b('12g', 345, 240, 45, 26), b('15%', 505, 240, 45, 26),
    b('8g', 567, 240, 35, 26), b('10%', 720, 240, 45, 26),
    b('Protein', 40, 300, 110, 26), b('5g', 345, 300, 35, 26), b('10g', 567, 300, 45, 26),
  ];
  const result = parseNutritionLabel({ text: '', blocks });
  check('heading-right-of-column: primary fat is read, not derived', result.fields.fat.value === 12, result.fields.fat.value);
  check('heading-right-of-column: variant fat comes from its own cell (8g)', result.secondary?.fields.fat.value === 8, result.secondary?.fields.fat.value);
  check('heading-right-of-column: variant protein is 10g, not empty', result.secondary?.fields.protein.value === 10, result.secondary?.fields.protein.value);
  check('caption still quotes the column heading', !!result.secondary?.headerText?.includes('Fat Free Milk'), result.secondary?.headerText);
}

// ── 18. A faint left-hand cell must NOT be replaced by the right column's ─────────────────────────
// On a glossy pint the small grey per-serving %DV sometimes fails to OCR entirely. Reading cells by
// order alone then promoted the CONTAINER column's %DV into its place (Total Fat 8g showing 30% DV,
// repeatedly, 2026-07-22). Other rows read both cells, so the column positions are known -- a lone
// cell sitting in column two's territory must leave column one empty, not fill it.
{
  const blocks: OcrBlockLike[] = [
    b('3 servings per container', 60, 40, 500, 30),
    b('Calories', 40, 100, 180, 50), b('140', 440, 100, 120, 50), b('420', 680, 100, 120, 50),
    // Clean rows: both %DV cells present, so the columns' positions are learnable.
    b('Sodium', 40, 180, 130, 26), b('120mg', 345, 180, 60, 26), b('5%', 505, 180, 40, 26),
    b('360mg', 600, 180, 60, 26), b('15%', 720, 180, 45, 26),
    b('Total Carb.', 40, 220, 150, 26), b('17g', 345, 220, 45, 26), b('6%', 505, 220, 40, 26),
    b('51g', 600, 220, 45, 26), b('18%', 720, 220, 45, 26),
    // Fat's own 10% failed to read; only the container column's 30% survived.
    b('Total Fat', 40, 260, 130, 26), b('8g', 345, 260, 40, 26),
    b('24g', 600, 260, 45, 26), b('30%', 720, 260, 45, 26),
  ];
  const result = parseNutritionLabel({ text: '', blocks });
  check('faint left cell: fat value still 8g', result.fields.fat.value === 8, result.fields.fat.value);
  check('faint left cell: fat does NOT inherit the container column 30% DV', result.fields.fat.percentDV !== 30, result.fields.fat.percentDV);
  check('faint left cell: neighbouring clean rows unaffected', result.fields.sodium.percentDV === 5, result.fields.sodium.percentDV);
  check('faint left cell: carbs keep their own 6%', result.fields.carbs.percentDV === 6, result.fields.carbs.percentDV);
}

// ── 19. Bilingual label: read the PRINTED number, don't work backwards from the %DV ───────────────
// Real tortilla-chip bag, 2026-07-22. "Total Fat / Grasa Total 7g" is one block, so there was no
// separate value cell to find, and the name-to-number gap was too long for the pattern -- so every
// value got back-derived from the %DV column (carbs came out 19.3 = 7% of 275, instead of the
// printed 18g) and rows with no %DV at all came back empty.
{
  const blocks: OcrBlockLike[] = [
    b('11 Servings per container / Raciones por envase', 60, 40, 700, 30),
    b('Serving Size / Tamaño por ración 1oz (28g/about 12 chips)', 60, 80, 780, 30),
    b('Calories / Calorías', 60, 130, 400, 50), b('140', 700, 130, 120, 50),
    b('Total Fat / Grasa Total 7g', 60, 200, 420, 30), b('9%', 780, 200, 50, 30),
    b('Saturated Fat / Grasa Saturada 1g', 80, 240, 460, 30), b('5%', 780, 240, 50, 30),
    b('Trans Fat / Grasa Trans 0g', 80, 280, 420, 30),
    b('Cholesterol / Colesterol 0mg', 60, 320, 430, 30), b('0%', 780, 320, 50, 30),
    b('Sodium / Sodio 90mg', 60, 360, 360, 30), b('4%', 780, 360, 50, 30),
    b('Total Carbohydrate / Carbohidratos Totales 18g', 60, 400, 640, 30), b('7%', 780, 400, 50, 30),
    b('Dietary Fiber / Fibra Dietética 2g', 80, 440, 460, 30), b('7%', 780, 440, 50, 30),
    b('Total Sugars / Azúcares Totales 0g', 80, 480, 470, 30),
    b('Includes / Incluye 0g Added Sugars / Azúcares Añadidos', 100, 520, 700, 30), b('0%', 780, 520, 50, 30),
    b('Protein / Proteínas 2g', 60, 560, 350, 30),
    b('Calcium / Calcio 20mg', 60, 640, 370, 30), b('2%', 780, 640, 50, 30),
    b('Iron / Hierro 0mg', 60, 680, 320, 30), b('0%', 780, 680, 50, 30),
    b('Potassium / Potasio 80mg', 60, 720, 400, 30), b('2%', 780, 720, 50, 30),
  ];
  const result = parseNutritionLabel({ text: '', blocks });
  check('bilingual: carbs are the printed 18g, not 19.3 derived from 7%', result.fields.carbs.value === 18, result.fields.carbs.value);
  check('bilingual: sodium is the printed 90mg, not 92', result.fields.sodium.value === 90, result.fields.sodium.value);
  check('bilingual: potassium is the printed 80mg, not 94', result.fields.potassium.value === 80, result.fields.potassium.value);
  check('bilingual: calcium is the printed 20mg, not 26', result.fields.calcium.value === 20, result.fields.calcium.value);
  check('bilingual: iron is the printed 0mg, not 0.4', result.fields.iron.value === 0, result.fields.iron.value);
  check('bilingual: protein reads 2g (no %DV to fall back on)', result.fields.protein.value === 2, result.fields.protein.value);
  check('bilingual: total sugars reads 0g', result.fields.sugar.value === 0, result.fields.sugar.value);
  check('bilingual: trans fat reads 0g', result.fields.transFat.value === 0, result.fields.transFat.value);
  check('bilingual: added sugars reads 0g through the translation', result.fields.addedSugars.value === 0, result.fields.addedSugars.value);
  check('bilingual: fat still 7g', result.fields.fat.value === 7, result.fields.fat.value);
  check('bilingual: serving amount 28g', result.serving.amount === 28, result.serving.amount);
  check('bilingual: serving name drops the Spanish half', result.serving.name === '1oz', result.serving.name);
  check('bilingual: servings per container 11', result.servingsPerContainer.value === 11, result.servingsPerContainer.value);
}

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) { console.log('Failed:', fails.join(', ')); process.exit(1); }
