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

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) { console.log('Failed:', fails.join(', ')); process.exit(1); }
