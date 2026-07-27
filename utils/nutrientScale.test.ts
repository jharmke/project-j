// Consistency tests for the nutrient maths (utils/nutrientScale.ts). No React/RN/AsyncStorage.
// Run: npm run test:nutrients  (compiles with tsc to a temp dir and node's the output).
//
// WHY THIS FILE EXISTS
// On 2026-07-27 the app had FOUR different conventions for what an entry's nutrient block described --
// per 100 for barcode foods, per the selected serving for text-searched ones, per the food's own base
// serving for custom ones, and per the exact portion for recipes -- and every reader assumed one of
// them. A 110 g log of an 84 g custom food reported 82,500 mg of sodium.
//
// The single sharpest symptom was this: THE NUMBER THE DETAIL SCREEN SHOWED AND THE NUMBER THE DAY'S
// TOTALS PRODUCED DISAGREED. That is what the "round trip" tests below assert, per food type. They are
// the ones that would have caught the original bug, so if one ever fails, do not adjust it to pass --
// find out which of the two halves moved.

import {
  entryNutrientScale, entryNutrient, entryFlatNutrient,
  computeDetailNutrient, DetailNutrientCtx, FLAT_NUTRIENT_KEY,
} from './nutrientScale';

declare const process: { exit(code: number): void };

let passed = 0, failed = 0;
const fails: string[] = [];
function check(name: string, cond: boolean, got?: any) {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; fails.push(name); console.log(`  ✗ ${name}${got !== undefined ? `  (got: ${JSON.stringify(got)})` : ''}`); }
}
const near = (a: number, b: number, tol = 0.15) => Math.abs(a - b) <= tol;

const SODIUM = 'Sodium, Na';

// ── Fixtures modelled on Justin's real foods ────────────────────────────────────────────────────
// Chicken Breast Chunks: base serving 84 g, 160 kcal, 750 mg sodium. Logged as 110 g.
const CHICKEN_BASE_G = 84, CHICKEN_SODIUM = 750, CHICKEN_LOGGED_G = 110;
const chickenExpectedSodium = CHICKEN_SODIUM * CHICKEN_LOGGED_G / CHICKEN_BASE_G; // 982.1

// ── entryNutrientScale: the recorded number wins ─────────────────────────────────────────────────
console.log('\nentryNutrientScale');
check('uses the recorded nutrientScale when present',
  entryNutrientScale({ nutrientScale: 1.3095, cal: 210, calPer100g: 190, servingGrams: 1 }) === 1.3095);

check('ignores a recorded scale that is not a finite number',
  entryNutrientScale({ nutrientScale: NaN, fsId: 'x', cal: 190, calPer100g: 475 }) === 0.4);

// THE GUARD. Entries logged before nutrientScale existed must keep reading the OLD way, wrong and all,
// so a pre-fix entry never disagrees with its own day totals. Deleting this behaviour silently rewrites
// history. If this test fails, someone "cleaned up" the legacy branch.
console.log('\nlegacy fallback (pre-2026-07-27 entries must not move)');
{
  const oldCustom = { cal: 210, calPer100g: 190, servingGrams: 1 };  // the 84x-inflated chicken
  const scale = entryNutrientScale(oldCustom);
  check('an old custom entry still scales the old (wrong) way', near(scale, 110.5, 0.5), scale);
  check('and still yields its historical ~82,900 mg sodium',
    near(entryNutrient({ ...oldCustom, foodNutrients: [{ nutrientName: SODIUM, value: CHICKEN_SODIUM }] }, SODIUM), 82894.7, 1));
}

// ── Per food type: the detail screen and the day totals must agree ───────────────────────────────
function ctx(over: Partial<DetailNutrientCtx>): DetailNutrientCtx {
  return {
    calories: 0, grams: 0, multiplier: 0, servingCount: 1,
    useServingBased: false, useExisting: false,
    nutrientBasisSize: null, effectiveServing: null, servingRates: null,
    ...over,
  };
}

console.log('\nround trip: custom food logged by weight (the 2026-07-27 bug)');
{
  const food = {
    isCustom: true,
    foodNutrients: [{ nutrientName: SODIUM, value: CHICKEN_SODIUM }],  // per the 84 g base serving
  };
  // What the screen shows with 110 g dialled in, the serving picker on plain grams (a 1 g serving).
  const shown = computeDetailNutrient(food, 'sodium', SODIUM, ctx({
    grams: CHICKEN_LOGGED_G,
    multiplier: CHICKEN_LOGGED_G / 100,
    nutrientBasisSize: CHICKEN_BASE_G,
    effectiveServing: { grams: 1, sodium: 0 },
    servingRates: { sodium: 0 },
  }))!;
  check('detail screen shows ~982 mg, not 82,500', near(shown, chickenExpectedSodium), shown);

  // The entry that save would write, and what the day totals then make of it.
  const entry = {
    cal: 210, calPer100g: 190, servingGrams: 1,
    nutrientScale: CHICKEN_LOGGED_G / CHICKEN_BASE_G,
    foodNutrients: food.foodNutrients,
  };
  const totalled = entryNutrient(entry, SODIUM);
  check('day totals produce ~982 mg too', near(totalled, chickenExpectedSodium), totalled);
  check('★ screen and totals AGREE', near(shown, totalled), { shown, totalled });
}

console.log('\nround trip: barcode food (was always correct -- must stay correct)');
{
  // 1 bar = 40 g, 190 kcal, 300 mg sodium per 100 g.
  const perHundred = 300, loggedG = 40;
  const expected = perHundred * loggedG / 100; // 120
  const food = { fsId: 'fs1', foodNutrients: [{ nutrientName: SODIUM, value: perHundred }] };
  const shown = computeDetailNutrient(food, 'sodium', SODIUM, ctx({
    grams: loggedG, multiplier: loggedG / 100, servingCount: 1, useServingBased: true,
    effectiveServing: { grams: 40, sodium: expected },
    servingRates: { sodium: expected / 40 },
  }))!;
  check('detail screen shows 120 mg', near(shown, expected), shown);

  const entry = { fsId: 'fs1', cal: 190, calPer100g: 475, nutrientScale: loggedG / 100, foodNutrients: food.foodNutrients };
  const totalled = entryNutrient(entry, SODIUM);
  check('day totals show 120 mg', near(totalled, expected), totalled);
  check('★ screen and totals AGREE', near(shown, totalled), { shown, totalled });
}

console.log('\nround trip: text-searched food (nutrients stored per 100 at save)');
{
  // Yogurt: 170 g serving, 65 mg sodium, logged as 100 g. Stored per 100 => 38.24.
  const servingG = 170, servingSodium = 65, loggedG = 100;
  const perHundred = servingSodium / servingG * 100;
  const expected = perHundred * loggedG / 100; // 38.2
  const entry = { fsId: 'fs2', cal: 53, calPer100g: 53, nutrientScale: loggedG / 100,
                  foodNutrients: [{ nutrientName: SODIUM, value: perHundred }] };
  const totalled = entryNutrient(entry, SODIUM);
  check('day totals show ~38 mg, not 0.4 and not 110', near(totalled, expected), totalled);
  check('a per-SERVING store would have been ~100x wrong', !near(servingSodium / servingG, expected, 1));
}

console.log('\nround trip: recipe (flat fields, already the portion -- never rescaled)');
{
  const entry = { isRecipe: true, cal: 346, sodium: 617 };   // no foodNutrients at all
  const totalled = entryNutrient(entry, SODIUM);
  check('day totals take the flat value as-is', totalled === 617, totalled);
  check('scale is irrelevant for a recipe', entryNutrientScale(entry) === 0);

  const shown = computeDetailNutrient({ ...entry, existingCal: 346 }, 'sodium', SODIUM,
    ctx({ calories: 346 }))!;
  check('★ screen and totals AGREE at the logged portion', shown === 617, shown);

  const threeQuarters = computeDetailNutrient({ ...entry, existingCal: 346 }, 'sodium', SODIUM,
    ctx({ calories: 256 }))!;
  check('editing the portion rescales it (617 -> ~456)', near(threeQuarters, 456.5, 1), threeQuarters);
}

// ── The recipe lookup must cover everything a recipe actually stores ─────────────────────────────
// It shipped covering 12 of them, so recipe B vitamins, magnesium, zinc, copper, caffeine and vitamins
// E/K silently counted as zero on every screen. Keep this in step with app/recipe-log.tsx.
console.log('\nrecipe nutrient map coverage');
{
  const mustCover = [
    'Fiber, total dietary', 'Sugars, total including NLEA', 'Added Sugars', 'Sodium, Na', 'Cholesterol',
    'Fatty acids, total saturated', 'Polyunsaturated Fat', 'Monounsaturated Fat', 'Trans Fat', 'Caffeine',
    'Potassium, K', 'Calcium, Ca', 'Iron, Fe', 'Magnesium, Mg', 'Zinc, Zn', 'Copper, Cu',
    'Vitamin A', 'Vitamin C', 'Vitamin D', 'Vitamin E', 'Vitamin K', 'Vitamin B6', 'Vitamin B12',
    'Biotin', 'Choline', 'Folate', 'Niacin', 'Riboflavin', 'Thiamin',
  ];
  const missing = mustCover.filter(n => !FLAT_NUTRIENT_KEY[n]);
  check(`covers all ${mustCover.length} nutrients a recipe stores`, missing.length === 0, missing);
  check('reads a flat value through the map', entryFlatNutrient({ magnesium: 42 }, 'Magnesium, Mg') === 42);
  check('returns null, not 0, when the entry has no flat value',
    entryFlatNutrient({}, 'Magnesium, Mg') === null);
}

// ── Degenerate input must yield 0, never NaN or Infinity ─────────────────────────────────────────
console.log('\nmissing / broken data');
{
  check('no nutrient at all -> 0', entryNutrient({ nutrientScale: 2, foodNutrients: [] }, SODIUM) === 0);
  check('missing calPer100g -> 0 scale', entryNutrientScale({ fsId: 'x', cal: 100 }) === 0);
  check('missing servingGrams -> 0 scale', entryNutrientScale({ cal: 100, calPer100g: 200 }) === 0);
  check('zero servingGrams -> 0, not Infinity', entryNutrientScale({ cal: 100, calPer100g: 200, servingGrams: 0 }) === 0);
  check('null entry -> 0', entryNutrientScale(null) === 0);
  check('detail: nothing known at all -> null', computeDetailNutrient({}, 'sodium', SODIUM, ctx({})) === null);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) { console.log('FAILED: ' + fails.join(', ')); process.exit(1); }
