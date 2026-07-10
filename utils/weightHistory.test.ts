// Unit tests for the Weight History pure logic (utils/weightHistory.ts). No React/RN/AsyncStorage.
// Run: npm run test:weight  (compiles with tsc to a temp dir and node's the output).
// Covers key detection, future-date guard, weight validation, history parse/sort/filter, and the
// earliest("starting")-weigh-in selector.
import { dayKeyDate, isFutureDate, validateWeight, parseHistory, startingWeighIn } from './weightHistory';

declare const process: { exit(code: number): void };

let passed = 0, failed = 0;
const fails: string[] = [];
function check(name: string, cond: boolean, got?: any) {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; fails.push(name); console.log(`  ✗ ${name}${got !== undefined ? `  (got: ${JSON.stringify(got)})` : ''}`); }
}

// ── dayKeyDate: only YYYY-MM-DD day keys, not profile/settings/workout ───────────────────────────
(() => {
  check('dayKeyDate accepts a dated day key', dayKeyDate('pj_2026-07-10') === '2026-07-10');
  check('dayKeyDate rejects pj_profile', dayKeyDate('pj_profile') === null);
  check('dayKeyDate rejects pj_workout_state', dayKeyDate('pj_workout_state') === null);
  check('dayKeyDate rejects pj_settings', dayKeyDate('pj_settings') === null);
  check('dayKeyDate rejects a non-pj key', dayKeyDate('2026-07-10') === null);
  check('dayKeyDate rejects a bad date shape', dayKeyDate('pj_2026-7-10') === null);
})();

// ── isFutureDate: string-ISO comparison, no Date math ────────────────────────────────────────────
(() => {
  const today = '2026-07-10';
  check('tomorrow is future', isFutureDate('2026-07-11', today) === true);
  check('today is NOT future', isFutureDate('2026-07-10', today) === false);
  check('yesterday is NOT future', isFutureDate('2026-07-09', today) === false);
  check('next month is future', isFutureDate('2026-08-01', today) === true);
  check('last year is NOT future', isFutureDate('2025-12-31', today) === false);
})();

// ── validateWeight: refuse blank/zero/negative/garbage, accept + round a real number ─────────────
(() => {
  check('rejects blank', validateWeight('').ok === false);
  check('rejects whitespace', validateWeight('   ').ok === false);
  check('rejects non-numeric', validateWeight('abc').ok === false);
  check('rejects zero', validateWeight('0').ok === false);
  check('rejects negative', validateWeight('-5').ok === false);
  check('rejects absurdly high', validateWeight('17800').ok === false);
  const a = validateWeight('187');
  check('accepts a plain integer', a.ok === true && a.value === 187, a);
  const b = validateWeight('187.4');
  check('accepts one decimal', b.ok === true && b.value === 187.4, b);
  const c = validateWeight('187.46');
  check('rounds to one decimal', c.ok === true && c.value === 187.5, c);
  const d = validateWeight(172);
  check('accepts a number arg', d.ok === true && d.value === 172, d);
  // A big correction (fix-it tool) must still save -- only garbage is refused.
  const e = validateWeight('250');
  check('a big-but-real weight saves (no plausibility block)', e.ok === true && e.value === 250, e);
})();

// ── parseHistory: filter to dated weigh-ins, newest-first, tolerate junk ─────────────────────────
(() => {
  const pairs: [string, string | null][] = [
    ['pj_2026-07-08', JSON.stringify({ weight: 189, water: 40 })],
    ['pj_2026-07-10', JSON.stringify({ weight: 187.5, entries: [{ cal: 100 }] })],
    ['pj_2026-07-09', JSON.stringify({ weight: 188 })],
    ['pj_2026-07-07', JSON.stringify({ water: 30 })],          // no weight -> skipped
    ['pj_2026-07-06', JSON.stringify({ weight: 0 })],          // zero weight -> skipped
    ['pj_2026-07-05', JSON.stringify({ weight: 'heavy' })],    // non-number -> skipped
    ['pj_profile', JSON.stringify({ weight: 999 })],           // not a day key -> skipped
    ['pj_2026-07-04', 'not json'],                             // unparseable -> skipped
    ['pj_2026-07-03', null],                                   // null raw -> skipped
  ];
  const h = parseHistory(pairs);
  check('parseHistory keeps only real dated weigh-ins', h.length === 3, h);
  check('parseHistory is newest-first', h[0].date === '2026-07-10' && h[1].date === '2026-07-09' && h[2].date === '2026-07-08', h.map(x => x.date));
  check('parseHistory carries the weight value', h[0].weight === 187.5, h[0]);
  check('parseHistory skips a zero weight', !h.some(x => x.date === '2026-07-06'));
  check('parseHistory skips pj_profile', !h.some(x => x.weight === 999));
  check('parseHistory empty on empty input', parseHistory([]).length === 0);
})();

// ── startingWeighIn: earliest (oldest) entry = the "starting weight" ──────────────────────────────
(() => {
  const h = parseHistory([
    ['pj_2026-07-10', JSON.stringify({ weight: 187 })],
    ['pj_2026-07-01', JSON.stringify({ weight: 195 })],
    ['pj_2026-07-05', JSON.stringify({ weight: 190 })],
  ]);
  const start = startingWeighIn(h);
  check('starting weigh-in is the earliest date', start !== null && start.date === '2026-07-01', start);
  check('starting weigh-in carries its weight', start !== null && start.weight === 195, start);
  check('starting weigh-in is null when history is empty', startingWeighIn([]) === null);
  // Adding an earlier back-dated entry makes IT the new starting weight.
  const h2 = parseHistory([
    ['pj_2026-07-10', JSON.stringify({ weight: 187 })],
    ['pj_2026-07-01', JSON.stringify({ weight: 195 })],
    ['pj_2026-06-15', JSON.stringify({ weight: 201 })],   // back-dated earlier
  ]);
  const start2 = startingWeighIn(h2);
  check('an earlier back-dated entry becomes the new starting weight', start2 !== null && start2.date === '2026-06-15' && start2.weight === 201, start2);
})();

// ── Summary ──────────────────────────────────────────────────────────────────────────────────────
console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) { console.log('FAILED:', fails.join(', ')); process.exit(1); }
