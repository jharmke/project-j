#!/usr/bin/env node
/**
 * SMART TIPS COPY GUARD.  Run: node scripts/audit-tips-copy.cjs
 * Exits non-zero if it finds a problem, so it can gate a commit.
 *
 * 🔴 WHY THIS EXISTS. On 2026-08-07 an audit of `utils/smartTipsCopy.ts` found three pieces of copy written
 * for one goal sitting in a pool that EVERY goal reads from. The worst: a bulking user was told "at a
 * deficit, low protein means more of the weight you lose comes from muscle" -- and `rankCandidates` makes
 * that a TOP priority tip for the gain bucket, so it was one of the first things they saw.
 * ⚠️ Nothing was broken, nothing crashed, and it read perfectly well. Only reading it against the RULE that
 * fires it revealed the mismatch. CLAUDE.md's rule applies: mechanise it or it happens again.
 *
 * 🔴 AND THIS MATTERS MORE AFTER `PLAN.md` 1.9. Once AI voicing is Supporter-only, this copy IS the free
 * product. A stale sentence here is no longer a fallback nobody reads; it is what most users see.
 *
 * ⚠️ THE SCRIPT IS NOT THE AUTHORITY, THE CODE IS. Every check below is a CANDIDATE detector. During the
 * original audit this script reported false problems FOUR times (a regex needing a newline that single-line
 * calls do not have; ES6 shorthand `{ delta }` having no colon; the last rule's chunk swallowing the rest of
 * the file). The copy was right every time. ➡️ HAND-CHECK EVERY FLAG BEFORE CHANGING COPY.
 */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const copy = fs.readFileSync(path.join(root, 'utils/smartTipsCopy.ts'), 'utf8');
const eng = fs.readFileSync(path.join(root, 'utils/smartTipsEngine.ts'), 'utf8');

const body = copy.slice(copy.indexOf('export const RULE_COPY'));
// ⚠️ Bound the LAST rule at the closing brace of RULE_COPY. Without this the final rule's chunk runs to the
// end of the file and swallows the helper functions, which is how `{key}` from `fillSlots` got reported as
// a broken placeholder in `rec_sustained_low`.
const endOfMap = body.indexOf('\n};');
const mapBody = endOfMap === -1 ? body : body.slice(0, endOfMap);

const bounds = [];
const ruleRe = /\n  ([a-z][a-zA-Z0-9_]*): \{/g;
let m;
while ((m = ruleRe.exec(mapBody))) bounds.push({ id: m[1], at: m.index });

const rules = {};
bounds.forEach((b, i) => {
  const chunk = mapBody.slice(b.at, i + 1 < bounds.length ? bounds[i + 1].at : mapBody.length);
  const pools = {};
  const poolRe = /\n      ([a-z][a-zA-Z0-9_]*): \[([\s\S]*?)\n      \]/g;
  let p;
  while ((p = poolRe.exec(chunk))) pools[p[1]] = [...p[2].matchAll(/'([^']*)'/g)].map((x) => x[1]);
  const mind = /\n    mindful: \[([\s\S]*?)\n    \]/.exec(chunk);
  rules[b.id] = {
    pools,
    mindful: mind ? [...mind[1].matchAll(/'([^']*)'/g)].map((x) => x[1]) : [],
    title: (/title: '([^']*)'/.exec(chunk) || [])[1] || '?',
  };
});

// makeTip('ruleId', tier, positive, poolKey, ctx, store, { slots })  -- calls are SINGLE LINE.
const calls = {};
const callRe = /makeTip\(\s*'([^']+)'([^;]*);/g;
let c;
while ((c = callRe.exec(eng))) {
  const id = c[1];
  // ⚠️ STRIP TEMPLATE-LITERAL INTERPOLATIONS FIRST. Several calls pass `` `insight_${ctx.goalBucket}` `` or
  // build a slot from `${d.ifTargetHours}`, and those inner braces made the slot-object regex match the
  // wrong thing -- which reported if_late_close and weight_on_track as printing raw {avg}/{paceLabel} to
  // users. They do not; the calls pass them correctly.
  const argText = c[2].replace(/\$\{[^{}]*\}/g, '');
  const slotObj = /\{([^{}]*)\}\s*\)?\s*$/.exec(argText.trim()) || /\{([^{}]*)\}/.exec(argText);
  // Accept `key:` AND ES6 shorthand `key` before a comma or the closing brace.
  const keys = slotObj ? [...slotObj[1].matchAll(/(\w+)\s*(?::|,|$)/g)].map((x) => x[1]) : [];
  (calls[id] = calls[id] || new Set());
  keys.forEach((k) => calls[id].add(k));
}

const problems = [];
const ids = Object.keys(rules);

// ── 1. Copy with no rule, and rules with no copy ─────────────────────────────
ids.filter((id) => !calls[id]).forEach((id) => problems.push(`DEAD COPY: ${id} is never fired by any rule`));
Object.keys(calls).filter((id) => !rules[id]).forEach((id) => problems.push(`MISSING COPY: rule ${id} fires with no copy`));

// ── 2. A placeholder the engine never fills renders literally on screen ──────
// ⚠️ INJECTED SLOTS. `makeTip` adds these to every tip from `ctx`, so no individual call site passes them
// and the check below would flag all 45 rules. They carry the surface's period ("this week" / "this month")
// and its real window length, which is why monthly stopped claiming "your last 7 logged days" over 30 days.
const INJECTED = new Set(['period', 'window', 'span']);
ids.forEach((id) => {
  if (!calls[id]) return;
  const all = [...Object.values(rules[id].pools).flat(), ...rules[id].mindful].join(' ');
  [...new Set([...all.matchAll(/\{(\w+)\}/g)].map((x) => x[1]))]
    .filter((s) => !calls[id].has(s) && !INJECTED.has(s))
    .forEach((s) => problems.push(`UNFILLED PLACEHOLDER: ${id} uses {${s}} but no makeTip call passes it`));
});

// ── 3. Goal language in a pool every goal reads ──────────────────────────────
// ⚠️ ALLOWLIST, each with the reason. A rule that BAILS OUT for a goal bucket may safely speak to the
// buckets that remain. Verified in the engine on 2026-08-07; re-verify before adding to this list.
const GOAL_OK = {
  'weekend_spike.insight_all': 'ruleWeekendSpike returns null for the gain bucket',
  'cross_high_burn_overeating.pattern': 'ruleCrossHighBurnOvereating returns null for the gain bucket',
  // ⚠️ ruleProteinUnder now picks `pattern_gain`/`urgent_gain` for the gain bucket by explicit ternary, so
  // these two pools only reach LOSE and MAINTAIN. The wording ("at a deficit", "while cutting") is right for
  // lose and is a KNOWN, ACCEPTED minor mismatch for maintain. Logged in PLAN.md 1.9; if maintain ever gets
  // its own pool, delete these two lines so the guard starts watching them again.
  'protein_under.pattern': 'gain bucket is routed to pattern_gain; wording suits lose, minor mismatch for maintain (accepted)',
  'protein_under.urgent': 'gain bucket is routed to urgent_gain; wording suits lose, minor mismatch for maintain (accepted)',
};
const GOAL_WORDS = /\b(on a cut|your cut|a deficit|the deficit|your deficit|bulk|bulking|surplus|gaining goal|weight loss|cutting)\b/i;
ids.forEach((id) => {
  Object.entries(rules[id].pools).forEach(([key, lines]) => {
    if (/_(lose|gain|maintain)$/.test(key)) return;
    if (GOAL_OK[`${id}.${key}`]) return;
    lines.forEach((ln) => {
      if (GOAL_WORDS.test(ln)) {
        problems.push(`GOAL MISMATCH: ${id}.${key} speaks to one goal in a pool all goals read\n      "${ln.slice(0, 100)}"`);
      }
    });
  });
});

// ── 4. Project copy rule: no double dashes in anything a user reads ──────────
ids.forEach((id) => {
  [...Object.values(rules[id].pools).flat(), ...rules[id].mindful].forEach((ln) => {
    if (ln.includes('--')) problems.push(`DOUBLE DASH: ${id} -> "${ln.slice(0, 70)}"`);
  });
});

// ── 5. Thin rotation. Under 3 and a user repeats within days ────────────────
ids.forEach((id) => {
  Object.entries(rules[id].pools).forEach(([k, lines]) => {
    if (lines.length < 3) problems.push(`THIN POOL: ${id}.${k} has only ${lines.length}`);
  });
  if (rules[id].mindful.length && rules[id].mindful.length < 3) {
    problems.push(`THIN POOL: ${id}.mindful has only ${rules[id].mindful.length}`);
  }
});

// ── Report ───────────────────────────────────────────────────────────────────
const poolCount = ids.reduce((n, id) => n + Object.keys(rules[id].pools).length + (rules[id].mindful.length ? 1 : 0), 0);
const varCount = ids.reduce((n, id) => n + Object.values(rules[id].pools).flat().length + rules[id].mindful.length, 0);
console.log(`Smart Tips copy: ${ids.length} rules, ${poolCount} pools, ${varCount} variants.`);
// 🔴 A PARSER THAT MATCHES NOTHING REPORTS A CLEAN BILL OF HEALTH. Fail loudly instead.
if (!ids.length || !Object.keys(calls).length || !varCount) {
  console.error('\n❌ PARSER FOUND NOTHING. The script is broken, not the copy. Fix the regexes.');
  process.exit(2);
}
if (!problems.length) {
  console.log('✅ No problems found.');
  process.exit(0);
}
console.error(`\n❌ ${problems.length} problem(s). HAND-CHECK EACH before editing copy:\n`);
problems.forEach((p) => console.error(`   ${p}`));
process.exit(1);
