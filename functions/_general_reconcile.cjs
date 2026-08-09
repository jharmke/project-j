// PLAN.md 4.13 -- RECONCILE the shipped library against the approved spec.
// Run from functions/: node _general_reconcile.cjs
//
// 🔴 TWO QUESTIONS THIS ANSWERS, AND NEITHER WAS EVER CHECKED.
//  1. **DID A TOPIC GET DROPPED?** The topic sweep estimated ~198, the spec landed at 141, the code shipped
//     137. Merges and duplicates explain some of that and nobody verified the rest.
//  2. **IS EVERY APPROVED ANSWER REACHABLE?** An answer can exist in the file and never fire, and that is
//     invisible from reading it. This is the same class as the four word-form misses found while building.
//
// ⚠️ THIS IS NOT A COVERAGE TEST AND MUST NOT BE READ AS ONE. The spec headings are the CANONICAL phrasing
// of each question, i.e. the exact wording the trigger list was written against. Scoring well here is the
// minimum bar, not evidence. The honest coverage numbers are `_general_holdout2.cjs` (26%) and
// `_general_holdout.cjs` (75%). ➡️ A miss here is a real defect; a hit here proves almost nothing.

const fs = require('fs');
const { GENERAL_ANSWERS } = require('./lib/ottoGeneralAnswers.js');
const { CANNED_ANSWERS } = require('./lib/ottoCannedAnswers.js');
const { matchCanned } = require('./lib/ottoCannedMatcher.js');
const ALL_ANSWERS = [...CANNED_ANSWERS, ...GENERAL_ANSWERS];
const FREE = { supporter: false, faithTier: 'exploring', styleMode: 'balanced' };

const spec = fs.readFileSync('../SPEC_otto_general_answers.md', 'utf8').split('\n');

// A question in the spec is a bold line immediately followed by a blockquote answer.
const questions = [];
for (let i = 0; i < spec.length - 1; i++) {
  const m = spec[i].match(/^\*\*(.+?)\*\*/);
  if (!m) continue;
  if (!spec[i + 1].startsWith('> ')) continue;
  const q = m[1].replace(/[🟣⚠️🔴✅❌➡️]/g, '').trim();
  // Skip the worked example and any heading that is not itself a question.
  if (/^(Worked example|THE LINE|TOTAL)/i.test(q)) continue;
  questions.push(q);
}

if (questions.length < 100) {
  console.error(`PARSER FOUND ONLY ${questions.length} QUESTIONS. Refusing to report a pass.`);
  process.exit(2);
}

let hit = 0;
const misses = [];
// ⚠️ BOTH LIBRARIES, because production searches both and a spec question belongs to whichever one owns
// it. "Do I eat back exercise calories" is approved in the general spec and correctly lives in the APP
// library, so a general-library-only check reported it missing when it was simply somewhere else.
for (const q of questions) {
  const gen = matchCanned(q, FREE, GENERAL_ANSWERS, ALL_ANSWERS);
  const app = matchCanned(q, FREE, CANNED_ANSWERS, ALL_ANSWERS);
  if (gen.matched || app.matched) hit++;
  else misses.push(`${q}   (${gen.reason})`);
}

console.log('='.repeat(72));
console.log(`RECONCILE -- ${questions.length} approved spec questions vs ${GENERAL_ANSWERS.length} shipped answers`);
console.log('='.repeat(72));
console.log(`\nreachable: ${hit}/${questions.length}`);
console.log(`🔴 UNREACHABLE (must be 0): ${misses.length}`);
if (misses.length) { console.log('\nNOT REACHABLE FROM THEIR OWN CANONICAL WORDING:'); for (const m of misses) console.log('   🔴 ' + m); }
process.exit(misses.length > 0 ? 1 : 0);
