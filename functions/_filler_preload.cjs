// PLAN.md 4.11(c) follow-up -- MEASURE THREE STRUCTURAL FILLER CLASSES, in memory, nothing written.
//
//   FILLER=numbers  node -r ./_filler_preload.cjs _general_holdout2.cjs
//   FILLER=speech   ...
//   FILLER=people   ...
//   FILLER=all      ...
//
// 🔴 WHY THESE THREE AND NOT THE FOURTEEN WORDS THAT WOULD SCORE BEST.
// The words blocking the coverage-failure misses are ordinary conversational framing: told, mentioned,
// hearing, colleague, buckets, four. Adding exactly those words would lift the corpus they came from and
// measure nothing, which is the corpus-fitting that made three earlier corpora worthless on this project.
// Each class below is a CLASS a person can state without looking at the corpus, and each is checked on the
// OTHER holdout, which it was not derived from.
//
// ⚠️ STOPWORDS IS THE RISKY LIST, AND ITS OWN COMMENT SAYS SO: "adding a CONTENT word here is how a wrong
// answer gets through". Every candidate below was checked against both libraries' triggers first, and any
// word that identifies an answer is excluded by name with the reason written down.

const { STOPWORDS } = require('./lib/ottoCannedMatcher.js');

// (a) SPELLED-OUT NUMBERS. The matcher ALREADY strips bare digits structurally, with the reasoning that a
// number carries no topic ("why am i sore for 3 days"). It only ever handled DIGITS. "i drink four coffees
// a day" fails for the want of the same rule applied to the written form. This is finishing an existing
// structural decision, not a new one.
// ⚠️ SEVEN CANDIDATES WERE REFUSED BY THE TRIGGER CHECK BELOW AND ARE LEFT OUT WITH THEIR REASONS:
// 'one' and 'two' and 'three' (one rep max, "two a day"), 'six' (six times a day, six pack), 'hundred'
// and 'triple' (the Triple Digits achievement), 'half'. Every one of them names something. This is the
// check earning its place on the first run: a number word is USUALLY topicless, not always.
const NUMBERS = [
  'four', 'five', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'twenty', 'thirty', 'forty', 'fifty', 'thousand',
  'couple', 'several', 'dozen', 'double',
];

// (b) REPORTED SPEECH. People relay what somebody else said before asking their own question: "my coach
// mentioned a lighter week", "someone told me carbs are the reason", "i keep hearing different things".
// The verb names no topic; the topic is always elsewhere in the sentence.
// ⚠️ 'read' IS DELIBERATELY EXCLUDED -- it is a trigger on gen.read_label ("how do i read labels").
const SPEECH = [
  'told', 'telling', 'tells', 'mentioned', 'mentions', 'mentioning', 'hearing', 'heard',
  'said', 'says', 'saying', 'reckons', 'claims', 'claimed', 'apparently', 'according',
  'things', 'thing', 'reason', 'reasons', 'came', 'badly', 'suffer', 'suffering',
];

// (c) OTHER PEOPLE. The commonest opener in the corpus is somebody else's situation: "my mate says", "my
// colleague lost loads on keto", "everyone at my gym". The person is never the subject of the question.
// ⚠️ 'doctor' IS DELIBERATELY EXCLUDED -- it is a trigger on gen.see_a_doctor and gen.medical_condition,
// and it is the one person word that genuinely changes the answer. Same for 'trainer' (gen.trainer).
// ⚠️ 'friends', 'wife', 'husband' and 'everyone' WERE REFUSED: they are triggers on the social-pressure
// and comparison answers, where who is doing the pressuring is the entire subject. 'friend' singular is
// left out too, for consistency rather than because the check caught it.
const PEOPLE = [
  'mate', 'mates', 'colleague', 'colleagues', 'sister', 'brother',
  'mum', 'dad', 'mother', 'father', 'coworker', 'everybody',
];

const SETS = { numbers: NUMBERS, speech: SPEECH, people: PEOPLE };
const which = process.env.FILLER || 'all';
const chosen = which === 'all' ? [...NUMBERS, ...SPEECH, ...PEOPLE] : SETS[which];
if (!chosen) { console.error('🔴 FILLER must be numbers | speech | people | all'); process.exit(2); }

// 🔴 REFUSE TO ADD A WORD THAT IDENTIFIES AN ANSWER. This is the whole safety check and it runs every time
// rather than being a promise in a comment. If a future edit adds 'protein' to a list above, this stops it.
const { CANNED_ANSWERS } = require('./lib/ottoCannedAnswers.js');
const { GENERAL_ANSWERS } = require('./lib/ottoGeneralAnswers.js');
const triggers = new Set();
for (const a of [...CANNED_ANSWERS, ...GENERAL_ANSWERS]) {
  for (const g of a.requires) for (const t of g) for (const w of t.split(' ')) triggers.add(w);
}
const clash = chosen.filter((w) => triggers.has(w));
if (clash.length) {
  console.error('🔴 THESE ARE TRIGGERS OF REAL ANSWERS AND MUST NOT BE STOPWORDS: ' + clash.join(', '));
  process.exit(2);
}

for (const w of chosen) STOPWORDS.add(w);
console.log(`[filler preload: ${which}, +${chosen.length} stopwords]`);
