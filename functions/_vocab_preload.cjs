// PLAN.md 4.11(c) -- MEASUREMENT HARNESS FOR THE DERIVED VOCABULARY.
//
//   node -r ./_vocab_preload.cjs _general_holdout2.cjs      <- WITH derived vocabulary
//   node _general_holdout2.cjs                              <- baseline, unchanged
//
// 🔴 WHY IT IS DONE THIS WAY AND NOT BY EDITING THE LIBRARIES. Node caches modules, so requiring the two
// answer libraries here and mutating the objects in place means every harness loaded afterwards sees the
// derived vocabulary through the SAME object references. Production code is untouched for the whole
// measurement, which is the difference between "we tried it and reverted it" and "we tried it and there
// is nothing to revert". Three designs were reverted on 2026-08-09; this one cannot leave a mark.
//
// ⚠️ IT MUTATES `covers` ONLY, NEVER `requires`. Widening `covers` cannot make an answer fire on a message
// it does not already match, and it cannot widen the shared trigger vocabulary that guards the
// conversational trim. See the header of `_derive_vocab.cjs` for the full argument.

const { CANNED_ANSWERS } = require('./lib/ottoCannedAnswers.js');
const { GENERAL_ANSWERS } = require('./lib/ottoGeneralAnswers.js');
const { app, gen } = require('./_derive_vocab.cjs');

// A single switch so each source can be measured on its own. Attributing a change to the wrong half is
// how a good idea gets thrown out with a bad one.
const ONLY = process.env.VOCAB_ONLY || 'both'; // 'app' | 'general' | 'both'

let patched = 0, wordsAdded = 0;
const apply = (answers, proposals) => {
  for (const a of answers) {
    const add = proposals.get(a.id);
    if (!add || !add.size) continue;
    a.covers = [...(a.covers ?? []), ...add];
    patched++;
    wordsAdded += add.size;
  }
};
if (ONLY === 'app' || ONLY === 'both') apply(CANNED_ANSWERS, app.proposals);
if (ONLY === 'general' || ONLY === 'both') apply(GENERAL_ANSWERS, gen.proposals);

if (!patched) {
  console.error('🔴 PRELOAD PATCHED NOTHING. The harness below is measuring the baseline and will look');
  console.error('   like a null result. Refusing to let that be mistaken for evidence.');
  process.exit(2);
}
console.log(`[vocab preload: ${ONLY}, ${patched} answers, +${wordsAdded} coverage words]`);
