// Unit tests for the lift PR engine (utils/liftPR.ts). Pure logic, no React/RN.
// Run: compile with tsc to a temp dir and `node` the output.
// Covers the revoke bug fix + the "up from" honesty fix + the protected floor (deleted program).
import { recomputeLiftPR, liftSessionHistory, ResolveDay, PRMap, SetLogs } from './liftPR';

// Node global (no @types/node in this project); erased at compile time, real at runtime.
declare const process: { exit(code: number): void };

// ── tiny assert harness ───────────────────────────────────────────────────────────────────────────
let passed = 0, failed = 0;
const fails: string[] = [];
function check(name: string, cond: boolean, got?: any) {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; fails.push(name); console.log(`  ✗ ${name}${got !== undefined ? `  (got: ${JSON.stringify(got)})` : ''}`); }
}

// ── fixture helpers ───────────────────────────────────────────────────────────────────────────────
const set = (weight: number | null, reps: number | null, done = true) => ({ weight, reps, rest: null, done });
const resolver = (progByDay: Record<string, { id: string; name: string }[]>): ResolveDay =>
  (d: string) => progByDay[d] || [];

const BENCH = 'Bench Press';
const KEY = 'bench press';
const PRIOR = '2026-06-29';   // a real prior session (programmed + logged) -> the true 135 record
const TODAY = '2026-07-04';
const NOW = 1000;

// A backed prior best of 135x5 (how a real user's prior record actually exists: in the logs).
const backedPriorProg = { [PRIOR]: [{ id: 'p1', name: BENCH }], [TODAY]: [{ id: 'b1', name: BENCH }] };
const backedPriorLogs: SetLogs = { [PRIOR]: { p1: [set(135, 5)] } };

console.log('\nlift PR engine\n');

// ── 1. Honest "up from": beat a real 135 prior, twice in one session -> both read "up from 135" ─────
{
  const prog = resolver(backedPriorProg);
  const r1 = recomputeLiftPR(BENCH, { ...backedPriorLogs, [TODAY]: { b1: [set(150, 5)] } }, prog, {}, {}, TODAY, NOW);
  check('150 beats 135 -> PR fires', !!r1.hit && r1.hit.weightVal === 150, r1.hit?.weightVal);
  check('150 card reads "up from 135"', r1.hit?.prevWeightVal === 135, r1.hit?.prevWeightVal);
  // add a heavier 190 SAME session -> up-from must STAY 135, never the same-session 150
  const r2 = recomputeLiftPR(BENCH, { ...backedPriorLogs, [TODAY]: { b1: [set(150, 5), set(190, 5)] } }, prog, r1.prs, r1.hits, TODAY, NOW);
  check('190 card reads "up from 135" (NOT the same-session 150)', r2.hit?.weightVal === 190 && r2.hit?.prevWeightVal === 135, { w: r2.hit?.weightVal, from: r2.hit?.prevWeightVal });
  check('all-time best now 190', r2.prs[KEY].bestWeight?.value === 190, r2.prs[KEY].bestWeight?.value);
}

// ── 2. Revoke by uncheck: pull 190, then 150, watch it roll back to the real 135 record ─────────────
{
  const prog = resolver(backedPriorProg);
  let r = recomputeLiftPR(BENCH, { ...backedPriorLogs, [TODAY]: { b1: [set(150, 5), set(190, 5)] } }, prog, {}, {}, TODAY, NOW);
  check('setup: 190 PR banked', r.prs[KEY].bestWeight?.value === 190);
  r = recomputeLiftPR(BENCH, { ...backedPriorLogs, [TODAY]: { b1: [set(150, 5), set(190, 5, false)] } }, prog, r.prs, r.hits, TODAY, NOW);
  check('uncheck 190: record drops to 150', r.prs[KEY].bestWeight?.value === 150, r.prs[KEY].bestWeight?.value);
  check('uncheck 190: still a PR (150 > 135)', !!r.hit && r.hit.weightVal === 150 && r.hit.prevWeightVal === 135);
  r = recomputeLiftPR(BENCH, { ...backedPriorLogs, [TODAY]: { b1: [set(150, 5, false), set(190, 5, false)] } }, prog, r.prs, r.hits, TODAY, NOW);
  check('uncheck all: record rolls back to the real 135', r.prs[KEY].bestWeight?.value === 135, r.prs[KEY].bestWeight?.value);
  check('uncheck all: today\'s hit revoked (clear Otto)', r.hit === null && r.revoked === true, { hit: r.hit, revoked: r.revoked });
}

// ── 3. Edit a set DOWN below the prior best -> no PR, record back to 135 ─────────────────────────────
{
  const prog = resolver(backedPriorProg);
  let r = recomputeLiftPR(BENCH, { ...backedPriorLogs, [TODAY]: { b1: [set(190, 5)] } }, prog, {}, {}, TODAY, NOW);
  r = recomputeLiftPR(BENCH, { ...backedPriorLogs, [TODAY]: { b1: [set(100, 5)] } }, prog, r.prs, r.hits, TODAY, NOW);
  check('edit-down: 100 < 135 -> no PR', r.hit === null, r.hit);
  check('edit-down: record back at 135', r.prs[KEY].bestWeight?.value === 135, r.prs[KEY].bestWeight?.value);
  check('edit-down: prior hit revoked', r.revoked === true);
}

// ── 4. Delete the whole exercise TODAY -> record reverts to the prior 135, card clears ──────────────
{
  const logs: SetLogs = { ...backedPriorLogs, [TODAY]: { b1: [set(190, 5)] } };
  let r = recomputeLiftPR(BENCH, logs, resolver(backedPriorProg), {}, {}, TODAY, NOW);
  check('setup: 190 PR banked', r.prs[KEY].bestWeight?.value === 190);
  // exercise removed -> today no longer resolves b1 to a name (logs orphaned)
  const removedProg = resolver({ [PRIOR]: [{ id: 'p1', name: BENCH }], [TODAY]: [] });
  r = recomputeLiftPR(BENCH, logs, removedProg, r.prs, r.hits, TODAY, NOW);
  check('delete exercise: record reverts to prior 135', r.prs[KEY].bestWeight?.value === 135, r.prs[KEY].bestWeight?.value);
  check('delete exercise: hit cleared', r.revoked === true && r.hit === null);
}

// ── 5. Debut lift (no prior at all): shows the top set, NO "up from" ─────────────────────────────────
{
  const prog = resolver({ [TODAY]: [{ id: 'b1', name: BENCH }] });
  const logs: SetLogs = { [TODAY]: { b1: [set(135, 8), set(155, 5), set(185, 3)] } };
  const r = recomputeLiftPR(BENCH, logs, prog, {}, {}, TODAY, NOW);
  check('debut: top set 185 shows as PR', !!r.hit && r.hit.weightVal === 185, r.hit?.weightVal);
  check('debut: no "up from" (no real prior)', r.hit?.prevWeightVal === undefined, r.hit?.prevWeightVal);
  check('debut: est-1RM recorded from the 185x3', (r.prs[KEY].bestE1RM?.value ?? 0) >= 200, r.prs[KEY].bestE1RM?.value);
}

// ── 6. Deleted-program floor: a record with no surviving logged history is PROTECTED, never wiped ────
{
  // Old 200 PR (dateKey in the past) whose program was later deleted -> not resolvable in the logs.
  const prs: PRMap = { [KEY]: { name: BENCH, bestWeight: { value: 200, reps: 3, dateKey: '2026-06-20' }, bestE1RM: { value: 220, weight: 200, reps: 3, dateKey: '2026-06-20' }, updatedAt: '2026-06-20' } };
  const prog = resolver({ [TODAY]: [{ id: 'b1', name: BENCH }] }); // 06-20 program gone
  const logs: SetLogs = { '2026-06-20': { old1: [set(200, 3)] }, [TODAY]: { b1: [set(150, 5)] } };
  const r = recomputeLiftPR(BENCH, logs, prog, prs, {}, TODAY, NOW);
  check('deleted-program: old 200 record preserved', r.prs[KEY].bestWeight?.value === 200, r.prs[KEY].bestWeight?.value);
  check('deleted-program: today 150 < 200 -> no false PR', r.hit === null, r.hit);
}

// ── 7. Recompute touches ONLY the named lift ────────────────────────────────────────────────────────
{
  const prs: PRMap = {
    [KEY]: { name: BENCH, bestWeight: { value: 135, reps: 5, dateKey: PRIOR }, bestE1RM: null, updatedAt: PRIOR },
    'barbell squat': { name: 'Barbell Squat', bestWeight: { value: 185, reps: 5, dateKey: PRIOR }, bestE1RM: null, updatedAt: PRIOR },
  };
  const prog = resolver({ [TODAY]: [{ id: 'b1', name: BENCH }] });
  const r = recomputeLiftPR(BENCH, { [TODAY]: { b1: [set(150, 5)] } }, prog, prs, {}, TODAY, NOW);
  check('isolation: squat record untouched by a bench recompute', r.prs['barbell squat']?.bestWeight?.value === 185, r.prs['barbell squat']?.bestWeight?.value);
}

// ── 8. Session history (PR home): newest-first, one row per logged day, with that day's top set ──────
{
  const prog = resolver({
    '2026-06-21': [{ id: 'a', name: BENCH }],
    '2026-06-28': [{ id: 'b', name: BENCH }],
    [TODAY]: [{ id: 'c', name: BENCH }],
  });
  const logs: SetLogs = {
    '2026-06-21': { a: [set(40, 8), set(40, 6)] },
    '2026-06-28': { b: [set(45, 5), set(45, 5, false)] }, // unchecked set ignored
    [TODAY]: { c: [set(50, 5), set(48, 6)] },
  };
  const hist = liftSessionHistory(BENCH, logs, prog);
  check('history: one row per logged day', hist.length === 3, hist.length);
  check('history: newest first', hist[0].dateKey === TODAY && hist[2].dateKey === '2026-06-21', hist.map(h => h.dateKey));
  check('history: top set per day (heaviest)', hist[0].topWeight === 50 && hist[0].topReps === 5, { w: hist[0].topWeight, r: hist[0].topReps });
  check('history: unchecked sets excluded', hist[1].topWeight === 45 && hist[1].topReps === 5, hist[1]);
  check('history: est-1RM computed per day', hist[0].e1rm !== null && hist[0].e1rm >= 55, hist[0].e1rm);
}

console.log(`\n${failed === 0 ? '✅ ALL PASS' : '❌ FAILURES'} — ${passed} passed, ${failed} failed`);
if (failed) { console.log('failed: ' + fails.join(', ')); process.exit(1); }
