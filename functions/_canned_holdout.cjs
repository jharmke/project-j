// PLAN 4.8 -- HELD-OUT canned corpus. Written AFTER the matcher was tuned, run ONCE, no tuning after.
// ⚠️ The 71/71 on the first corpus is worth little: it was tuned against. Today already showed how that
// flatters (4.9 scored 100% on its tuned corpus and 81% on unseen phrasing). This is the honest number.
const { CANNED_ANSWERS } = require('./lib/ottoCannedAnswers.js');
const { matchCanned } = require('./lib/ottoCannedMatcher.js');
// 🔴 FOURTH ARGUMENT ADDED 2026-08-09. WITHOUT IT THIS HARNESS WAS NOT TESTING THE APP.
// PLAN 4.15 gave `matchCanned` a fourth parameter: every answer in BOTH libraries, used as the
// conversational trim's guard vocabulary. `appCompanion.ts` passes it. This file did not, so the guard
// could not see the OTHER library's topics and happily discarded them.
// ⚠️ IT REPORTED TWO WRONG ANSWERS THAT THE REAL APP DOES NOT PRODUCE: "is fasting good for fat loss"
// -> nav.fasting, and "how do i log a recipe and is white rice bad" -> nav.recipe. Both were artefacts of
// this line. Verified against production arguments: both correctly decline.
// ➡️ A harness that calls the thing it is testing differently from production measures nothing. It failed
// in the noisy direction this time; it could just as easily have hidden a real leak.
const { GENERAL_ANSWERS } = require('./lib/ottoGeneralAnswers.js');
const ALL_ANSWERS = [...CANNED_ANSWERS, ...GENERAL_ANSWERS];
// ⚠️ FAIL LOUDLY IF A LIBRARY DID NOT LOAD. An empty array would score a clean sheet of zero wrong
// answers, which is the most dangerous possible false pass. Same reason `audit-tips-copy.cjs` exits 2
// when its own parser matches nothing.
if (!CANNED_ANSWERS.length || !GENERAL_ANSWERS.length) {
  console.error('🔴 A LIBRARY FAILED TO LOAD. Run `npm run build` first. Refusing to report a score.');
  process.exit(2);
}
const FREE = { supporter: false, faithTier: 'exploring', styleMode: 'balanced' };
// ⚠️ SEARCHES THE APP LIBRARY ONLY, DELIBERATELY. This is an app-library holdout, so "declined correctly"
// means "no APP answer fired", NOT "Otto declined". Since PLAN 4.13 a free user's fitness question is
// answered by the GENERAL library, which is covered by `_general_cross.cjs`.
const M = (m) => matchCanned(m, FREE, CANNED_ANSWERS, ALL_ANSWERS);

// Phrased differently on purpose: sloppier, shorter, more oblique.
const SHOULD_MATCH = [
  ['where do i switch themes', 'nav.theme'],
  ['can i make the app dark', 'nav.theme'],
  ['where do i set my step goal', 'nav.goals'],
  ['how do i swap to mindful', 'nav.coachingmode'],
  ['how do i hide the faith stuff', 'nav.faithtoggle'],
  ['how do i give the app access to apple health', 'nav.applehealth'],
  ['where do i put my weight in', 'nav.logweight'],
  ['i typed my weight wrong how do i fix it', 'nav.weighthistory'],
  ['whats the fastest way to log breakfast', 'nav.logfood'],
  ['where is the barcode scanner', 'nav.barcode'],
  ['how do i use the photo estimator', 'nav.estimator'],
  ['how do i wipe a meal', 'nav.clearmeal'],
  ['how do i save a recipe', 'nav.recipe'],
  ['how do i add my own food', 'nav.customfood'],
  ['where do i add water', 'nav.logwater'],
  ['how do i move cards around on home', 'nav.homecards'],
  ['how do i rename a meal slot', 'nav.mealslots'],
  ['how do i put a new graph on stats', 'nav.statsgraph'],
  ['where do i start a fast', 'nav.fasting'],
  ['where do i see my badges', 'nav.achievements'],
  ['how do i look at an older day', 'nav.pastday'],
  ['where do i see my sleep stages', 'nav.sleephub'],
  ['how do i make a new challenge', 'nav.challenge'],
  ['how do i run the effort vs results report', 'nav.evr'],
  ['how do i pause everything for a trip', 'nav.vacation'],
  ['how do i stop the app buzzing me overnight', 'nav.quiethours'],
  ['where do i favourite a verse', 'nav.favoriteverse'],
  ['how do i log a prayer', 'nav.prayer'],
  ['how do i report a bug', 'nav.feedback'],
  ['the text is too small how do i fix it', 'nav.textsize'],
  ['where do i log my waist', 'nav.body'],
  ['how do i open a devotional', 'nav.plans'],
  ['whos halo', 'nav.halo'],
  ['is a program the same as a routine', 'con.programroutine'],
  ['whats an estimated one rep max', 'con.pr'],
  ['what counts as a net carb', 'con.netcarbsmeaning'],
  ['why is my burned number so high', 'con.burned'],
  ['whats the day score made of', 'con.dayscore'],
  ['what does not right now do', 'con.faithtiers'],
  ['is the body fat number accurate', 'con.navybf'],
  ['how much does the supporter plan cost', 'money.price'],
  ['can i just tip instead', 'money.tipjar'],
  ['if i stop paying do i lose my stuff', 'money.cancel'],
  ['is halo free', 'money.faithfree'],
  ['whats my daily message limit', 'money.aiallowance'],
  ['how many saved meals do i get', 'limit.savedmeals'],
  ['how many programs can i make', 'limit.programs'],
  ['how many stats graphs do i get', 'limit.statsgraphs'],
  ['what is deep sleeper', 'ach.deepsleeper'],
  ['how do i earn road warrior', 'ach.roadwarrior'],
  ['what is unbroken', 'ach.unbroken'],
  ['cheers', 'plea.thanks'],
  ['appreciate it', 'plea.thanks'],
  ['sounds good', 'plea.ack'],
];

const MUST_NOT = [
  'whats a good leg workout', 'how many carbs should i eat', 'is fasting good for fat loss',
  'why do i wake up at 3am', 'should i deload', 'is oatmeal a good breakfast',
  'how many recipes have i saved', 'whats my current streak', 'how many badges do i have',
  'did i log water yesterday', 'hows my sleep been', 'what did i weigh last month',
  'and where is that', 'what about the other one', 'ok so where', 'how do i change it',
  'how do i log a recipe and is white rice bad',
  'whats the tip jar and how much protein should i eat',
  'idk', 'help me', 'wait what', 'hmm',
];

let wrong = 0, missed = 0, leaked = 0;
console.log('\n=== HELD-OUT CANNED CORPUS (never tuned against) ===\n');
for (const [m, want] of SHOULD_MATCH) {
  const r = M(m);
  if (!r.matched) { missed++; console.log(`   MISS  "${m}"  [${r.reason}]`); }
  else if (r.matched.id !== want) { wrong++; console.log(`   🔴 WRONG "${m}" -> ${r.matched.id} (wanted ${want})`); }
}
for (const m of MUST_NOT) {
  const r = M(m);
  if (r.matched) { leaked++; console.log(`   🔴 LEAK "${m}" -> ${r.matched.id}`); }
}
const hit = SHOULD_MATCH.length - wrong - missed;
console.log(`\nmatched correctly: ${hit}/${SHOULD_MATCH.length} (${((hit / SHOULD_MATCH.length) * 100).toFixed(0)}%)`);
console.log(`declined correctly: ${MUST_NOT.length - leaked}/${MUST_NOT.length}`);
console.log(`🔴 WRONG ANSWERS (must be 0): ${wrong + leaked}`);
console.log(`💰 misses (cost only): ${missed}\n`);
// ⚠️ EXITS NON-ZERO ON A WRONG ANSWER. It used to always exit 0, so a leak scrolled past in a run of six
// harnesses and nothing failed. A miss is deliberately NOT a failure: it costs $0.0054 and is today's
// behaviour anyway. Only a wrong answer breaks the rule that must never move.
process.exit(wrong + leaked > 0 ? 1 : 0);
