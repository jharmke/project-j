// Tests for utils/unitConversion.ts. Pure logic, no React/RN.
// Run: compile with tsc to a temp dir and `node` the output.
import { convertUnit, unitGroup, convertibleUnitsFor, isWeightUnit, isVolumeUnit } from './unitConversion';

declare const process: { exit(code: number): void };

let passed = 0, failed = 0;
const fails: string[] = [];
function check(name: string, cond: boolean, got?: any) {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; fails.push(name); console.log(`  ✗ ${name}${got !== undefined ? `  (got: ${JSON.stringify(got)})` : ''}`); }
}
function close(a: number, b: number, tolerance = 0.01) {
  return Math.abs(a - b) <= tolerance;
}

console.log('\nunit conversion\n');

// ── Weight group ────────────────────────────────────────────────────────────────────────────────
{
  const gFromOz = convertUnit(1, 'oz', 'g')!;
  check('1 oz = 28.3495g', close(gFromOz, 28.3495), gFromOz);

  const gFromKg = convertUnit(1, 'kg', 'g')!;
  check('1 kg = 1000g', gFromKg === 1000, gFromKg);

  const lbFromOz = convertUnit(16, 'oz', 'lb')!;
  check('16 oz = 1 lb', close(lbFromOz, 1), lbFromOz);

  const gFromLb = convertUnit(1, 'lb', 'g')!;
  check('1 lb = 453.592g', close(gFromLb, 453.592), gFromLb);

  const ozFromG = convertUnit(100, 'g', 'oz')!;
  check('100g rounds back to ~3.53oz', close(ozFromG, 3.5274, 0.01), ozFromG);
}

// ── Volume group ────────────────────────────────────────────────────────────────────────────────
{
  const mlFromCup = convertUnit(1, 'cup', 'ml')!;
  check('1 cup = 236.588ml', close(mlFromCup, 236.588), mlFromCup);

  const mlFromL = convertUnit(1, 'l', 'ml')!;
  check('1 L = 1000ml', mlFromL === 1000, mlFromL);

  const tspFromTbsp = convertUnit(1, 'tbsp', 'tsp')!;
  check('1 tbsp = 3 tsp', close(tspFromTbsp, 3), tspFromTbsp);

  const mlFromFlOz = convertUnit(1, 'fl oz', 'ml')!;
  check('1 fl oz = 29.5735ml', close(mlFromFlOz, 29.5735), mlFromFlOz);
}

// ── Cross-group and non-convertible units never guess ──────────────────────────────────────────
{
  check('grams -> ml (cross-group) returns null, never guesses', convertUnit(1, 'g', 'ml') === null);
  check('ml -> oz (cross-group) returns null, never guesses', convertUnit(1, 'ml', 'oz') === null);
  check('container -> g (non-convertible) returns null', convertUnit(1, 'container', 'g') === null);
  check('serving -> serving (same unit) short-circuits to the same value', convertUnit(5, 'serving', 'serving') === 5);
}

// ── Group + unit-list lookups ────────────────────────────────────────────────────────────────────
{
  check("unitGroup('g') = weight", unitGroup('g') === 'weight');
  check("unitGroup('oz') = weight", unitGroup('oz') === 'weight');
  check("unitGroup('cup') = volume", unitGroup('cup') === 'volume');
  check("unitGroup('fl oz') = volume", unitGroup('fl oz') === 'volume');
  check("unitGroup('container') = null (not convertible)", unitGroup('container') === null);
  check("unitGroup('serving') = null (not convertible)", unitGroup('serving') === null);

  check('isWeightUnit/isVolumeUnit never overlap for the same unit', !(isWeightUnit('cup') && isVolumeUnit('cup')) && isVolumeUnit('cup'));

  const weightOptions = convertibleUnitsFor('g');
  check('convertibleUnitsFor("g") offers the full weight group', ['g', 'kg', 'oz', 'lb'].every(u => weightOptions.includes(u)), weightOptions);

  const volumeOptions = convertibleUnitsFor('cup');
  check('convertibleUnitsFor("cup") offers the full volume group', ['ml', 'l', 'cup', 'tbsp', 'tsp', 'fl oz'].every(u => volumeOptions.includes(u)), volumeOptions);

  check('convertibleUnitsFor("container") offers nothing -- falls back to a plain number input', convertibleUnitsFor('container').length === 0);
  check('convertibleUnitsFor("pill") offers nothing -- falls back to a plain number input', convertibleUnitsFor('pill').length === 0);
}

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) { console.log('Failed:', fails.join(', ')); process.exit(1); }
