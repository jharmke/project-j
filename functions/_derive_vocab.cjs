// PLAN.md 4.11(c) -- DERIVE EACH ANSWER'S COVERAGE VOCABULARY INSTEAD OF HAND-LISTING IT.
// Run from functions/:  node _derive_vocab.cjs            (report only, writes nothing)
//                       node _derive_vocab.cjs --write    (rewrites the two answer libraries)
//
// 🔴 WHAT THIS TOUCHES, AND WHY THAT IS THE WHOLE SAFETY ARGUMENT.
// Every answer has TWO word lists and they do completely different jobs:
//   `requires`  decides whether an answer FIRES. It also builds the shared trigger vocabulary that guards
//               the conversational trim (PLAN 4.15). THIS SCRIPT NEVER TOUCHES IT.
//   `covers`    is used by ONE thing: the whole-message-explained test. Widening it can never make an
//               answer fire on a message it does not already match.
// ➡️ So the failure mode here is NOT the cross-library leak that killed three designs on 2026-08-09.
// It is narrower and there are exactly two of them:
//   1. An answer whose `requires` ALREADY match, which used to fail coverage and now survives it. That is
//      the only route to a genuinely wrong answer, and the trigger filter below is aimed squarely at it.
//   2. Two answers both explaining the whole message, which is an `ambiguous-tie` and goes to Otto. Safe,
//      but it can LOSE coverage that works today, so the harnesses have to be read for regressions and
//      not just for gains.
//
// 🔴 THE FILTER THAT MAKES (1) SAFE, AND IT IS THE LESSON FROM THE THREE REVERTED ATTEMPTS:
// A WORD IS NEVER ADDED TO ONE ANSWER IF IT IS A TRIGGER OF ANY OTHER ANSWER IN EITHER LIBRARY.
// That is why "how much protein should i be eating" cannot start resolving to the pricing answer: 'protein'
// is another answer's trigger, so the pricing answer may never learn to explain it. Built from BOTH
// libraries, because "a guard assembled from whatever happens to be in the same array is not a guard".
//
// 🔴 AND EVERY WORD DECISION USES THE MATCHER'S OWN `has`, `STOPWORDS` AND `SYNONYMS`, IMPORTED.
// A second word list would drift from the one that decides matches, which is exactly how the guard that
// used Set membership leaked on "notifications". There is no local copy in this file. On purpose.

const fs = require('fs');
const path = require('path');
const { CANNED_ANSWERS } = require('./lib/ottoCannedAnswers.js');
const { GENERAL_ANSWERS } = require('./lib/ottoGeneralAnswers.js');
const { has, STOPWORDS, SYNONYMS, normalise } = require('./lib/ottoCannedMatcher.js');

const WRITE = process.argv.includes('--write');
const ALL_ANSWERS = [...CANNED_ANSWERS, ...GENERAL_ANSWERS];

if (!CANNED_ANSWERS.length || !GENERAL_ANSWERS.length || typeof has !== 'function') {
  console.error('🔴 LIBRARY OR MATCHER FAILED TO LOAD. Run `npm run build` first.');
  process.exit(2);
}

const canon = (w) => SYNONYMS[w] ?? w;
const words = (s) => normalise(s).split(' ').filter(Boolean).map(canon);

// ─────────────────────────────────────────────────────────────────────────────
// THE SHARED TRIGGER VOCABULARY. Single-word `requires` terms across BOTH libraries.
// ⚠️ Multi-word triggers ("net carbs") are deliberately NOT included as whole phrases, but each of their
// words IS, because a word that helps identify one answer must not become explainable filler in another.
// ─────────────────────────────────────────────────────────────────────────────
const triggerOwners = new Map(); // canonical word -> Set of answer ids that trigger on it
for (const a of ALL_ANSWERS) {
  for (const group of a.requires) {
    for (const term of group) {
      for (const w of words(term)) {
        if (STOPWORDS.has(w)) continue;
        if (!triggerOwners.has(w)) triggerOwners.set(w, new Set());
        triggerOwners.get(w).add(a.id);
      }
    }
  }
}
/** Is `w` a trigger of some answer OTHER than `a`? */
const ownedByAnother = (w, a) => {
  const owners = triggerOwners.get(w);
  if (!owners) return false;
  for (const id of owners) if (id !== a.id) return true;
  return false;
};

/** Does this answer's existing vocabulary already account for `w`? Uses the matcher's own `has`. */
const alreadyKnown = (w, a) => {
  const vocab = [...a.requires.flat(), ...(a.covers ?? [])];
  return vocab.some((term) => (term.includes(' ')
    ? term.split(' ').some((part) => has(w, part))
    : has(w, term)));
};

// ─────────────────────────────────────────────────────────────────────────────
// SOURCE 1 -- THE KNOWLEDGE BASE, for the APP library (PLAN 4.11c as written).
// ⚠️ ONLY THE APP LIBRARY. The KB is a map of the app's screens, so it has nothing to say about protein or
// deloads. The 137 general answers are handled by source 2.
// ─────────────────────────────────────────────────────────────────────────────
const kbSrc = fs.readFileSync(path.join(__dirname, 'src', 'assistantAppKnowledge.ts'), 'utf8');
// Take the template literal's contents, not the TypeScript around it, so `export const` and file paths
// cannot be harvested as if they were app vocabulary.
const kbBody = kbSrc.slice(kbSrc.indexOf('`') + 1, kbSrc.lastIndexOf('`'));
const kbLines = kbBody.split('\n').map((l) => l.trim()).filter(Boolean);

// 🔴 A KB LINE IS HARVESTED ONLY IF EXACTLY ONE ANSWER CLAIMS IT. FIRST ATTEMPT DID NOT DO THIS AND THE
// RESULT WAS JUNK: `nav.theme` was taught the words "praying", "clinically" and "tender", because a line
// merely CONTAINING the word "appearance" was treated as a line ABOUT appearance, and a three-line window
// dragged in whatever the KB happened to be discussing next.
// ➡️ Requiring sole ownership is the same principle the matcher already applies to messages: two answers
// both explaining something means it is ambiguous, not that either is right. An ambiguous line teaches
// nothing safe, so it is skipped.
// ⚠️ AND THE WINDOW IS GONE. A feature's description straddling two lines costs a few words; a window
// crossing into the next feature costs correctness.
const kbClaims = new Map(); // line index -> the single answer that claims it
kbLines.forEach((line, i) => {
  const claimants = CANNED_ANSWERS.filter((a) => a.requires.every((g) => g.some((t) => has(line, t))));
  if (claimants.length === 1) kbClaims.set(i, claimants[0].id);
});
const kbFor = (a) => kbLines.filter((_, i) => kbClaims.get(i) === a.id);

// ─────────────────────────────────────────────────────────────────────────────
// SOURCE 2 -- THE ANSWER'S OWN TEXT, for the GENERAL library.
// ⚠️ A DIFFERENT SOURCE FOR A DIFFERENT REASON. There is no manual describing nutrition, but each general
// answer already carries a couple of hundred words of prose ON ITS OWN TOPIC, written and approved. The
// words a user would reach for are far more likely to be in there than in a hand-written trigger list.
// ⚠️ The trigger filter matters MORE here, not less: these answers all speak the same domain, so the
// protein answer's prose mentions muscle and the muscle answer's prose mentions protein. Any word that
// identifies another answer is dropped, which is precisely what stops them dissolving into each other.
// ─────────────────────────────────────────────────────────────────────────────
const ctxs = [
  { supporter: false, faithTier: 'exploring', styleMode: 'balanced' },
  { supporter: true, faithTier: 'exploring', styleMode: 'balanced' },
  { supporter: false, faithTier: 'exploring', styleMode: 'mindful' },
];
const textOf = (a) => (typeof a.answer === 'function' ? ctxs.map((c) => a.answer(c)).join(' ') : a.answer);

// ─────────────────────────────────────────────────────────────────────────────
// DERIVE
// ─────────────────────────────────────────────────────────────────────────────
/** A chunk belongs to an answer only if the answer's FULL requires are satisfied inside it. */
const chunkMatches = (chunk, a) => a.requires.every((g) => g.some((term) => has(chunk, term)));

// ⚠️ A WORD ADDED TO TOO MANY ANSWERS IS NOT VOCABULARY, IT IS FILLER, and filler belongs in STOPWORDS
// where it is one decision reviewed once, not scattered across N answers. Rather than silently editing
// STOPWORDS (which is how a content word gets in and a wrong answer gets out), such words are DROPPED and
// reported at the end for a human to consider.
const MAX_ANSWERS_PER_WORD = 8;

function derive(answers, sourceFor) {
  const proposals = new Map(); // answer id -> Set of new words
  for (const a of answers) {
    const found = new Set();
    for (const chunk of sourceFor(a)) {
      for (const w of words(chunk)) {
        if (STOPWORDS.has(w)) continue;          // carries no topic by definition
        if (/^\d+$/.test(w)) continue;           // bare numbers were already handled structurally
        if (w.length < 3) continue;              // 'ok', 'vs' and friends
        if (alreadyKnown(w, a)) continue;        // nothing to add
        if (ownedByAnother(w, a)) continue;      // 🔴 THE GUARD. Never explain another answer's subject.
        found.add(w);
      }
    }
    if (found.size) proposals.set(a.id, found);
  }
  // Global frequency pass.
  const spread = new Map();
  for (const set of proposals.values()) for (const w of set) spread.set(w, (spread.get(w) ?? 0) + 1);
  const tooCommon = new Set([...spread].filter(([, n]) => n > MAX_ANSWERS_PER_WORD).map(([w]) => w));
  for (const [id, set] of proposals) {
    for (const w of [...set]) if (tooCommon.has(w)) set.delete(w);
    if (!set.size) proposals.delete(id);
  }
  return { proposals, tooCommon };
}

const app = derive(CANNED_ANSWERS, kbFor);
const gen = derive(GENERAL_ANSWERS, (a) => [textOf(a)]);

// ⚠️ USABLE AS A MODULE. `_vocab_preload.cjs` requires this to measure the derived vocabulary against the
// real harnesses WITHOUT changing any production code, so a bad result costs a deleted file and nothing
// else. Only print when run directly.
module.exports = { app, gen, MAX_ANSWERS_PER_WORD };
if (require.main !== module) return;

// ─────────────────────────────────────────────────────────────────────────────
// REPORT
// ─────────────────────────────────────────────────────────────────────────────
const summarise = (label, { proposals, tooCommon }, total) => {
  let added = 0;
  for (const s of proposals.values()) added += s.size;
  console.log(`\n${'='.repeat(70)}\n${label}\n${'='.repeat(70)}`);
  console.log(`answers gaining vocabulary: ${proposals.size}/${total}`);
  console.log(`words added in total:       ${added}`);
  console.log(`dropped as too widespread (>${MAX_ANSWERS_PER_WORD} answers): ${tooCommon.size}`);
  if (tooCommon.size) console.log('   ' + [...tooCommon].sort().join(' '));
};
summarise('SOURCE 1: KNOWLEDGE BASE -> APP LIBRARY', app, CANNED_ANSWERS.length);
summarise('SOURCE 2: ANSWER TEXT -> GENERAL LIBRARY', gen, GENERAL_ANSWERS.length);

if (process.argv.includes('--detail')) {
  for (const [label, { proposals }] of [['APP', app], ['GENERAL', gen]]) {
    console.log(`\n--- ${label} per answer ---`);
    for (const [id, set] of proposals) console.log(`${id}: ${[...set].sort().join(' ')}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// WRITE. Emits a single generated block per library that the matcher merges into `covers` at load time.
// ⚠️ WRITTEN TO A SEPARATE FILE, NOT EDITED INTO THE ANSWER SOURCES. Hand-written `covers` stay hand
// written and reviewable; the derived half is regenerable and can be deleted in one move if it does not
// earn its place. Mixing the two would make the next person unable to tell which is which.
// ─────────────────────────────────────────────────────────────────────────────
if (WRITE) {
  const dump = (m) => [...m].sort(([a], [b]) => a.localeCompare(b))
    .map(([id, set]) => `  '${id}': [${[...set].sort().map((w) => `'${w}'`).join(', ')}],`).join('\n');
  const out = `// GENERATED BY \`node _derive_vocab.cjs --write\` (PLAN.md 4.11c). DO NOT EDIT BY HAND.
//
// Extra COVERAGE vocabulary per answer id, merged into \`covers\` at load time. These words widen only the
// whole-message-explained test. They can never make an answer fire, and no word here is a trigger of any
// other answer in either library, which is what stops one answer learning to explain another's subject.
//
// Sources: the app knowledge base for \`nav.*\`/\`con.*\`/\`money.*\`/\`limit.*\`/\`ach.*\`, and each general
// answer's own approved text for \`gen.*\`. Regenerate rather than editing.

export const DERIVED_COVERS: Record<string, string[]> = {
${dump(app.proposals)}
${dump(gen.proposals)}
};
`;
  fs.writeFileSync(path.join(__dirname, 'src', 'ottoDerivedCovers.ts'), out);
  console.log('\n✅ wrote src/ottoDerivedCovers.ts');
}
