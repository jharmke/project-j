// Unit tests for the Repeat a Meal pure logic (utils/repeatMeal.ts). No React/RN/AsyncStorage.
// Run: npm run test:repeat  (compiles with tsc to a temp dir and node's the output).
// Covers the exact-clone guarantee, timestamp incrementing, meal override, tutorialEntry strip,
// the id-or-name slot matcher, and the accordion day labels.
import { buildClones, matchSlotEntries, formatDayLabels, prevDayKey, tidyFoodName, RepeatItem } from './repeatMeal';
import { MealSlot } from './mealSlots';

declare const process: { exit(code: number): void };

let passed = 0, failed = 0;
const fails: string[] = [];
function check(name: string, cond: boolean, got?: any) {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; fails.push(name); console.log(`  ✗ ${name}${got !== undefined ? `  (got: ${JSON.stringify(got)})` : ''}`); }
}

const lunch: MealSlot = { id: 'ms_lunch', name: 'Lunch' };
const dinner: MealSlot = { id: 'ms_dinner', name: 'Dinner' };

// ── matchSlotEntries: id match, legacy-name match, null-safe ─────────────────────────────────────
(() => {
  const entries = [
    { name: 'A', cal: 100, meal: 'ms_lunch' },          // id match
    { name: 'B', cal: 200, meal: 'Lunch' },             // legacy display-name match
    { name: 'C', cal: 300, meal: 'ms_dinner' },         // other slot
    null,                                                // null-safe
    { name: 'D', cal: 400, meal: 'Dinner' },            // other slot by name
  ];
  const got = matchSlotEntries(entries as any[], lunch);
  check('matchSlotEntries picks id + legacy-name for the slot only', got.length === 2 && got[0].name === 'A' && got[1].name === 'B', got.map(e => e.name));
  check('matchSlotEntries is null-safe', matchSlotEntries([null, undefined] as any[], lunch).length === 0);
  check('matchSlotEntries handles non-array', matchSlotEntries(undefined as any, lunch).length === 0);
})();

// ── buildClones: exact clone, meal override, incremented + unique timestamps, tutorial strip ─────
(() => {
  const source = {
    name: 'Van\'s Waffles', cal: 190, meal: 'ms_morning', protein: 4, carbs: 32, fat: 6,
    calPer100g: 250, foodNutrients: [{ id: 203, amount: 4 }], fsId: 'fs123', loggedAmount: 2,
    loggedUnit: 'serving', fiber: 3, sugar: 8, sodium: 300, aiEstimated: false, timestamp: 111,
    tutorialEntry: true,
  };
  const items: RepeatItem[] = [
    { entry: source, name: source.name, cal: source.cal, protein: 4, carbs: 32, fat: 6 },
    { entry: { name: 'Eggs', cal: 140, meal: 'ms_morning', protein: 12, timestamp: 112 }, name: 'Eggs', cal: 140, protein: 12, carbs: 0, fat: 10 },
  ];
  const clones = buildClones(items, 'ms_dinner', 5000);

  check('clone count matches item count', clones.length === 2);
  check('meal overridden to destination slot', clones[0].meal === 'ms_dinner' && clones[1].meal === 'ms_dinner');
  check('timestamps incremented from base', clones[0].timestamp === 5000 && clones[1].timestamp === 5001);
  check('timestamps unique', clones[0].timestamp !== clones[1].timestamp);
  check('tutorialEntry stripped', clones[0].tutorialEntry === undefined);

  // every non-meal / non-timestamp / non-tutorial field carries verbatim
  check('cal carried', clones[0].cal === 190);
  check('macros carried', clones[0].protein === 4 && clones[0].carbs === 32 && clones[0].fat === 6);
  check('calPer100g carried', clones[0].calPer100g === 250);
  check('extended nutrients carried', clones[0].fiber === 3 && clones[0].sugar === 8 && clones[0].sodium === 300);
  check('serving fields carried', clones[0].loggedAmount === 2 && clones[0].loggedUnit === 'serving');
  check('fsId carried', clones[0].fsId === 'fs123');
  check('foodNutrients array carried by value', clones[0].foodNutrients[0].id === 203 && clones[0].foodNutrients[0].amount === 4);

  // deep clone -- mutating the clone must NOT touch the source (no shared references)
  clones[0].foodNutrients[0].amount = 999;
  clones[0].name = 'CHANGED';
  check('clone is deep (source foodNutrients untouched)', source.foodNutrients[0].amount === 4);
  check('clone is deep (source name untouched)', source.name === 'Van\'s Waffles');
  check('source meal untouched', source.meal === 'ms_morning');
})();

// ── AI-estimated item is included and cloned safely (numbers copied, flag preserved) ─────────────
(() => {
  const ai = { name: 'AI Burrito', cal: 620, meal: 'ms_lunch', protein: 30, aiEstimated: true, timestamp: 1 };
  const clones = buildClones([{ entry: ai, name: ai.name, cal: ai.cal, protein: 30, carbs: 0, fat: 0 }], 'ms_lunch', 9000);
  check('AI item cloned with numbers + flag intact', clones[0].cal === 620 && clones[0].aiEstimated === true && clones[0].timestamp === 9000);
})();

// ── tidyFoodName: round over-precise gram weights baked into a name ───────────────────────────────
(() => {
  check('rounds a long float in a name', tidyFoodName('Chicken Dino Nuggets (108.5000000031g)') === 'Chicken Dino Nuggets (108.5g)', tidyFoodName('Chicken Dino Nuggets (108.5000000031g)'));
  check('leaves clean integers alone', tidyFoodName('Carb Balance Flour Tortilla (43g)') === 'Carb Balance Flour Tortilla (43g)');
  check('leaves 1-2 decimals alone', tidyFoodName('Something (12.5g)') === 'Something (12.5g)');
  check('rounds 100.00000000 to 100', tidyFoodName('Rice (100.00000000g)') === 'Rice (100g)', tidyFoodName('Rice (100.00000000g)'));
  check('null-safe', tidyFoodName('') === '');
})();

// ── formatDayLabels + prevDayKey ─────────────────────────────────────────────────────────────────
(() => {
  const viewed = '2026-07-10';
  const yesterday = prevDayKey(viewed);
  check('prevDayKey returns the day before', yesterday === '2026-07-09');
  check('prevDayKey daysBack works across month boundary', prevDayKey('2026-07-01') === '2026-06-30');

  const y = formatDayLabels('2026-07-09', yesterday);
  check('yesterday label reads "Yesterday"', y.relativeLabel === 'Yesterday', y);
  check('yesterday date shows abbrev weekday + date', y.dateLabel === 'Thu, Jul 9', y.dateLabel);

  const older = formatDayLabels('2026-07-07', yesterday); // a Tuesday
  check('older day uses full weekday as primary', older.relativeLabel === 'Tuesday', older.relativeLabel);
  check('older day date has no weekday', older.dateLabel === 'Jul 7', older.dateLabel);
})();

// ── summary ──────────────────────────────────────────────────────────────────────────────────────
console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) { console.log('FAILED:', fails.join(', ')); process.exit(1); }
