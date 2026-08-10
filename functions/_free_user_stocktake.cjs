// PLAN.md 4.13 / 4.15 -- WHAT ACTUALLY HAPPENS TO A FREE USER'S QUESTION. Run: node _free_user_stocktake.cjs
//
// 🔴 WHY THIS EXISTS. Every other harness measures ONE library in isolation. A real free user's message is
// decided by both libraries, a router tiebreak and the coach gate, in that order, and no test had ever run
// that whole path end to end. So "coverage is 26%" and "coverage is 75%" were both true, of different
// things, and neither answered the only question that matters: **how often is a free user HELPED, how often
// are they SOLD TO, and how often do we pay Anthropic?**
//
// 🔴 THE DECISION PATH BELOW IS COPIED FROM `appCompanion.ts` (the block after `ridersOnThisMessage`), NOT
// INVENTED. If that file changes, this is wrong until it is updated. It is duplicated rather than imported
// because the real one is inside an async handler wrapped in cap checks, Firestore writes and an Anthropic
// client. ⚠️ Re-read the source before trusting a number out of here. See [[feedback_verify_the_call_site]].
//
// ⚠️ WHAT THIS CANNOT SEE, STATED UP FRONT:
//   - RIDERS. A pitch, the undereating safeguard, the workout cap or the FAITH HANDOFF short-circuit this
//     whole block. Faith messages therefore never reach the gate at all, which is why faith stays free.
//   - CRISIS, handled on the client before the request is made.
//   - CONVERSATION HISTORY. The escalation copy depends on how many times the user has already been gated
//     in this conversation; every message here is treated as the first.
//   So this measures the SINGLE-MESSAGE path, which is the common case, not every case.

const fs = require('fs');
const { CANNED_ANSWERS } = require('./lib/ottoCannedAnswers.js');
const { GENERAL_ANSWERS } = require('./lib/ottoGeneralAnswers.js');
const { matchCanned } = require('./lib/ottoCannedMatcher.js');
const { routeCoachOrSupport } = require('./lib/ottoCoachRouting.js');

const ALL_ANSWERS = [...CANNED_ANSWERS, ...GENERAL_ANSWERS];
if (!CANNED_ANSWERS.length || !GENERAL_ANSWERS.length) {
  console.error('🔴 LIBRARY FAILED TO LOAD. Run `npm run build` first.');
  process.exit(2);
}

/** The free-user path from appCompanion.ts. Returns what the user gets and what it costs us. */
function freeUserOutcome(message) {
  const ctx = { supporter: false, faithTier: 'exploring', styleMode: 'balanced' };
  const appHit = matchCanned(message, ctx, CANNED_ANSWERS, ALL_ANSWERS);
  const genHit = matchCanned(message, ctx, GENERAL_ANSWERS, ALL_ANSWERS);

  let canned = appHit;
  if (appHit.matched && genHit.matched) {
    canned = routeCoachOrSupport(message).coachOnly ? genHit : appHit;
  } else if (genHit.matched) {
    canned = genHit;
  }
  if (canned.matched) {
    const from = canned === genHit ? 'general' : 'app';
    return { outcome: 'answered', from, id: canned.matched.id };
  }

  const route = routeCoachOrSupport(message);
  const ownData = (appHit.reason === 'own-data' || genHit.reason === 'own-data')
    && route.reason === 'own-data';
  if (ownData || route.coachOnly) {
    return { outcome: 'gated', id: `gate.${ownData ? 'own-data' : 'no-answer'}` };
  }
  return { outcome: 'ai', id: null };
}

// ── CORPORA. Lifted from the harnesses so nothing new is written for this test. ─────────────────────
// ⚠️ SHOULD_MATCH sets only. The must-not-match sets are excluded on purpose: an app corpus's must-not
// list is full of fitness questions that the general library is now SUPPOSED to answer, so counting them
// as failures here would measure the opposite of the truth.
const pull = (file, varName) => {
  const s = fs.readFileSync(file, 'utf8');
  const m = s.match(new RegExp(`const ${varName} = \\[([\\s\\S]*?)\\n\\];`));
  if (!m) return [];
  // Handles both flat lists and [question, expectedId] pairs.
  return [...m[1].matchAll(/^\s*(?:\[\s*)?'([^']+)'/gm)].map((x) => x[1]);
};

const CORPORA = [
  ['app: audit corpus A (tuned)', pull('_canned_audit.cjs', 'HITS')],
  ['app: holdout 1', pull('_canned_holdout.cjs', 'SHOULD_MATCH')],
  ['app: holdout 2', pull('_canned_holdout2.cjs', 'SHOULD_MATCH')],
  ['fitness: holdout 1 (terse)', pull('_general_holdout.cjs', 'SHOULD_MATCH')],
  ['fitness: holdout 2 (conversational)', pull('_general_holdout2.cjs', 'SHOULD_MATCH')],
];

// ⚠️ REFUSE TO REPORT ON AN EMPTY PULL. A regex that silently matched nothing would print a tidy table of
// zeros and read like a result. Same reason `audit-tips-copy.cjs` exits 2 when its parser finds nothing.
for (const [label, qs] of CORPORA) {
  if (!qs.length) { console.error(`🔴 CORPUS PARSE FAILED: ${label}`); process.exit(2); }
}

// ⚠️ MEASURED, 2026-08-05, on a real 10-message conversation. Not the warm price, which assumes the cold
// cache write never happens; it happens once per conversation. See PLAN.md.
const COST_PER_AI_MESSAGE = 0.0072;

console.log('\n' + '='.repeat(78));
console.log('WHAT HAPPENS TO A FREE USER\'S QUESTION -- full production path, both libraries + the gate');
console.log('='.repeat(78));
console.log('\n  answered = real answer, costs nothing');
console.log('  GATED    = no answer, they get pointed at the Supporter plan');
console.log('  AI       = we pay Anthropic\n');

let tA = 0, tG = 0, tAI = 0, tN = 0;
const gatedExamples = [];
console.log('corpus                                   n   answered   gated    AI');
console.log('-'.repeat(78));
for (const [label, qs] of CORPORA) {
  let a = 0, g = 0, ai = 0;
  for (const q of qs) {
    const r = freeUserOutcome(q);
    if (r.outcome === 'answered') a++;
    else if (r.outcome === 'gated') { g++; if (gatedExamples.length < 12) gatedExamples.push(q); }
    else ai++;
  }
  tA += a; tG += g; tAI += ai; tN += qs.length;
  const pct = (x) => `${String(Math.round((x / qs.length) * 100)).padStart(3)}%`;
  console.log(
    `${label.padEnd(38)} ${String(qs.length).padStart(3)}   ${pct(a)}      ${pct(g)}    ${pct(ai)}`,
  );
}
console.log('-'.repeat(78));
const p = (x) => `${String(Math.round((x / tN) * 100)).padStart(3)}%`;
console.log(`${'ALL QUESTIONS'.padEnd(38)} ${String(tN).padStart(3)}   ${p(tA)}      ${p(tG)}    ${p(tAI)}`);

console.log(`\nOf every 100 free-user questions like these:`);
console.log(`   ${Math.round((tA / tN) * 100)} get a real answer for nothing`);
console.log(`   ${Math.round((tG / tN) * 100)} get pointed at the Supporter plan instead of an answer`);
console.log(`   ${Math.round((tAI / tN) * 100)} reach the AI, at about $${COST_PER_AI_MESSAGE} each`);
console.log(`\n   cost of 100 such questions: $${((tAI / tN) * 100 * COST_PER_AI_MESSAGE).toFixed(3)}`);
console.log(`   before the gate and the libraries, 100 questions cost $${(100 * COST_PER_AI_MESSAGE).toFixed(2)}`);

// ─────────────────────────────────────────────────────────────────────────────
// 🔴 GATE INTEGRITY. COACHING QUESTIONS WRITTEN IN HOW-TO SHAPE.
//
// WHY THIS SECTION IS PERMANENT. On 2026-08-09 the stock-take found four APP questions being sold to
// ("where do i change how many steps im aiming for"), and the proposed fix was to exempt app how-tos from
// the gate using the matcher's own `isHowTo` regex. Measured against every corpus in the project it looked
// perfect: it rescued 2 and leaked 0 coaching questions.
// ❌ **IT LEAKED ELEVEN OF THE TWENTY BELOW, AND NOT ONE OF THEM EXISTED IN ANY CORPUS.** "how do i build
// muscle", "how do i get abs", "how can i sleep better", "how do i cut without losing muscle". Every one is
// a coaching question in how-to clothing, and freeing them hands a free user AI coaching, which is the one
// thing the gate exists to prevent. **A rescue of 2 bought with 11 leaks.**
// ➡️ THE LESSON, AND IT IS THE SAME ONE AS THE TRIGGER GUARD: a measurement is only as good as the corpus
// under it, and every corpus here was written to test COVERAGE, so none of them contained an attack on the
// gate. If you are about to relax the gate, add your adversarial cases to this list FIRST.
// ⚠️ NOTE `app=no-match, gen=no-match` ON BOTH THE GOOD AND BAD CASES, so "did an app answer nearly fire"
// does NOT separate them either. That was the obvious second idea and it is already dead.
const COACHING_IN_HOWTO_SHAPE = [
  'how do i lose weight', 'how do i lose belly fat', 'how can i lose weight fast',
  'how do i build muscle', 'how do i get abs', 'how do i get stronger',
  'how do i eat more protein', 'how do i stop snacking', 'how do i stay motivated',
  'how do i bulk properly', 'how do i cut without losing muscle', 'how can i sleep better',
  'how do i start lifting', 'where do i start with weights', 'how do i fix my diet',
  'how can i speed up my metabolism', 'how do i get rid of love handles',
  'how do i train for a marathon', 'how can i recover faster', 'how do i break a plateau',
];
{
  let answered = 0, gated = 0, ai = 0;
  const leaked = [];
  for (const q of COACHING_IN_HOWTO_SHAPE) {
    const r = freeUserOutcome(q);
    if (r.outcome === 'answered') answered++;
    else if (r.outcome === 'gated') gated++;
    else { ai++; leaked.push(q); }
  }
  console.log(`\n${'-'.repeat(78)}`);
  console.log('GATE INTEGRITY -- coaching questions in how-to shape (see the note above this section)');
  console.log(`   answered free by the library: ${answered}   gated: ${gated}   REACHING THE AI: ${ai}`);
  // ⚠️ Reaching the AI here is NOT automatically a bug: the router deliberately fails open, and a handful
  // of these are labelled app-shape and always have been. The number is here to be WATCHED, not to be zero.
  // If it jumps after a change to the gate or the router, that change is handing out free AI coaching.
  if (leaked.length) { console.log('   reaching the AI:'); for (const q of leaked) console.log('      - ' + q); }
}

// 🔴 THE NUMBER THAT IS A PRODUCT PROBLEM RATHER THAN A COST ONE. Every one of these is a free user who
// asked something reasonable and got sold to. PLAN 4.13 calls this out: below the gate the AI is never
// called either way, so the library's hit rate decides how often somebody is helped rather than pitched.
if (gatedExamples.length) {
  console.log('\nSOLD TO INSTEAD OF HELPED (sample):');
  for (const q of gatedExamples) console.log('   - ' + q);
}
