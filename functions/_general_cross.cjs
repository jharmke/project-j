// PLAN.md 4.13 -- CROSS-DOMAIN CHECK for the general nutrition/fitness library.
// Run from functions/: node _general_cross.cjs   (needs `npm run build` first)
//
// 🔴 WHY THIS HARNESS EXISTS AND WHY IT IS TRUSTWORTHY.
// The corpora are NOT written for this test. They are lifted verbatim out of `_canned_audit.cjs`, where
// they were written months earlier for the OPPOSITE purpose (proving the APP library behaves). That makes
// them the one thing a hand-tuned trigger list cannot be fitted to, which is the failure that made three
// earlier corpora worthless: tuning lifted each one to ~100% and the next fresh one still opened at 60%.
//
// TWO QUESTIONS, AND THE FIRST ONE IS THE IMPORTANT ONE:
//   1. COLLISIONS. Corpus A + B are APP questions ("how do i change my theme"). NONE of them may match a
//      general fitness answer. A hit here is a real bug: the user asked about the app and got told about
//      protein. **This number must be ZERO.**
//   2. COVERAGE. Corpus C is the list the app library must NEVER answer, and it is mostly coaching
//      ("how much protein should i be eating", "is creatine worth taking"). Those are precisely what the
//      general library is for, so matches here are GOOD. This is an honest coverage reading.
//
// ⚠️ DISCIPLINE NOTE: having now READ corpus C, do not tune trigger words against it. That converts an
// unbiased holdout into a fitted one and the score stops meaning anything. Record the number and move on.

const fs = require('fs');
const { GENERAL_ANSWERS } = require('./lib/ottoGeneralAnswers.js');
const { CANNED_ANSWERS } = require('./lib/ottoCannedAnswers.js');
const { matchCanned } = require('./lib/ottoCannedMatcher.js');

const FREE = { supporter: false, faithTier: 'exploring', styleMode: 'balanced' };
const src = fs.readFileSync('./_canned_audit.cjs', 'utf8');

/** Pull an array literal out of the audit harness by name and eval it in isolation. */
function lift(name) {
  const start = src.indexOf(`const ${name} = [`);
  if (start === -1) throw new Error(`corpus ${name} not found -- the audit harness changed shape`);
  const open = src.indexOf('[', start);
  let depth = 0, end = -1;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '[') depth++;
    else if (src[i] === ']') { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end === -1) throw new Error(`corpus ${name} never closed`);
  // eslint-disable-next-line no-new-func
  return new Function(`return ${src.slice(open, end + 1)};`)();
}

const HITS = lift('HITS');
const COLLISIONS = lift('COLLISIONS');
const MUST_NOT = lift('MUST_NOT');

// 🔴 FAIL LOUDLY IF THE PARSER MATCHED NOTHING. A broken extractor otherwise reports a clean bill of
// health, which is exactly how `audit-tips-copy.cjs` once reported false problems four times running.
if (!HITS.length || !COLLISIONS.length || !MUST_NOT.length) {
  console.error('PARSER FOUND NOTHING. Refusing to report a pass.');
  process.exit(2);
}

console.log('='.repeat(70));
console.log(`GENERAL LIBRARY CROSS-DOMAIN CHECK -- ${GENERAL_ANSWERS.length} general answers vs ${CANNED_ANSWERS.length} app answers`);
console.log('='.repeat(70));

// ── 1. COLLISIONS: app questions must never reach a general answer ───────────
const appQuestions = [...HITS.map((h) => h[0]), ...COLLISIONS.map((c) => c[0])];
let collisions = 0;
for (const q of appQuestions) {
  const r = matchCanned(q, FREE, GENERAL_ANSWERS);
  if (r.matched) {
    console.log(`   🔴 COLLISION: "${q}"  ->  ${r.matched.id}`);
    collisions++;
  }
}
console.log(`\n1. COLLISIONS (must be 0): ${collisions} of ${appQuestions.length} app questions`);

// ── 2. Reverse direction: general questions must not reach an APP answer ─────
// Already asserted inside _canned_audit.cjs corpus C, re-run here so one command covers both directions.
let reverse = 0;
for (const q of MUST_NOT) {
  const r = matchCanned(q, FREE, CANNED_ANSWERS);
  if (r.matched) { console.log(`   🔴 REVERSE: "${q}"  ->  ${r.matched.id}`); reverse++; }
}
console.log(`2. REVERSE collisions (must be 0): ${reverse} of ${MUST_NOT.length}`);

// ── 3. COVERAGE on an unbiased corpus ────────────────────────────────────────
let hit = 0;
const missed = [];
for (const q of MUST_NOT) {
  const r = matchCanned(q, FREE, GENERAL_ANSWERS);
  if (r.matched) hit++;
  else missed.push(q);
}
console.log(`3. COVERAGE of corpus C by the general library: ${hit}/${MUST_NOT.length}`);
console.log('   ⚠️ Not all of corpus C SHOULD be covered: per-food rulings ("is white rice bad") and');
console.log('   own-data questions ("hows my protein been this week") are deliberately out of scope.');
console.log('\n   not matched:');
for (const q of missed) console.log(`     - ${q}`);

// ── 4. INTERNAL COLLISIONS: general answers fighting each other ──────────────
// 🔴 THE BIGGEST RISK IN THIS LIBRARY, AND THE CROSS-DOMAIN TEST ABOVE IS BLIND TO IT. "Do I need cardio"
// and "how much cardio" share a topic word; so do the three soreness answers and the two protein ones.
// ⚠️ MECHANICALLY DERIVED, NOT HAND-WRITTEN. The probe for each answer is built from its OWN `requires`
// (first term of each array), so this cannot be fitted the way a corpus I invented could be. If an
// answer's own minimal probe reaches a DIFFERENT answer, that is a definite collision, not a judgment call.
// ⚠️ A probe that matches NOTHING is usually fine and is reported separately: the answer may legitimately
// need a word from `covers` before it fires, or an `excludes` term may appear inside a `requires` phrase.
let selfWrong = 0;
let selfNone = 0;
for (const a of GENERAL_ANSWERS) {
  const probe = a.requires.map((group) => group[0]).join(' ');
  const r = matchCanned(probe, FREE, GENERAL_ANSWERS);
  if (!r.matched) { selfNone++; console.log(`   ○ no match: ${a.id.padEnd(28)} probe "${probe}"`); continue; }
  if (r.matched.id !== a.id) {
    console.log(`   🔴 INTERNAL COLLISION: probe "${probe}" belongs to ${a.id} but matched ${r.matched.id}`);
    selfWrong++;
  }
}
console.log(`\n4. INTERNAL collisions (must be 0): ${selfWrong}   |   probes matching nothing: ${selfNone}`);

console.log('\n' + '='.repeat(70));
console.log(`🔴 COLLISIONS (must be 0): ${collisions + reverse + selfWrong}`);
console.log('='.repeat(70));
process.exit(collisions + reverse + selfWrong > 0 ? 1 : 0);
