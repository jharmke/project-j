// PLAN 4.8 -- THIRD canned corpus. Written after ALL tuning, run once.
// ⚠️ Corpus 1 and the first held-out set are both burned now (tuned against). This is the honest number.
const { CANNED_ANSWERS } = require('./lib/ottoCannedAnswers.js');
const { matchCanned } = require('./lib/ottoCannedMatcher.js');
const FREE = { supporter: false, faithTier: 'exploring', styleMode: 'balanced' };
const M = (m) => matchCanned(m, FREE, CANNED_ANSWERS);

const SHOULD_MATCH = [
  ['how do i get a different colour scheme', 'nav.theme'],
  ['where do i change how many steps im aiming for', 'nav.goals'],
  ['i want to go back to balanced', 'nav.coachingmode'],
  ['how do i turn the bible stuff on', 'nav.faithtoggle'],
  ['why cant the app see my steps', 'nav.applehealth'],
  ['where do i enter todays weight', 'nav.logweight'],
  ['i need to delete a weigh in from last month', 'nav.weighthistory'],
  ['how do i add dinner', 'nav.logfood'],
  ['can i scan the barcode on a box', 'nav.barcode'],
  ['how do i empty out lunch', 'nav.clearmeal'],
  ['where do i build a recipe', 'nav.recipe'],
  ['how do i drink log', 'nav.logwater'],
  ['how do i record a set', 'nav.loglift'],
  ['can i hide a card on the home screen', 'nav.homecards'],
  ['how do i add another meal slot', 'nav.mealslots'],
  ['where do i begin a challenge', 'nav.challenge'],
  ['how do i pause my streaks while im away', 'nav.vacation'],
  ['how do i turn a reminder off', 'nav.notifications'],
  ['where do i become a supporter', 'nav.membership'],
  ['how do i save a verse', 'nav.favoriteverse'],
  ['how do i submit a prayer request', 'nav.prayer'],
  ['how do i tell you about a bug', 'nav.feedback'],
  ['where do i measure my body', 'nav.body'],
  ['whats halo for', 'nav.halo'],
  ['do programs have exercises in them', 'con.programroutine'],
  ['how is my one rep max worked out', 'con.pr'],
  ['why is my burn already so big', 'con.burned'],
  ['whats in the day score', 'con.dayscore'],
  ['what does exploring mean', 'con.faithtiers'],
  ['is the navy body fat reliable', 'con.navybf'],
  ['whats the price of the supporter plan', 'money.price'],
  ['can i leave a one time tip', 'money.tipjar'],
  ['what do i lose if i unsubscribe', 'money.cancel'],
  ['do i pay for the bible', 'money.faithfree'],
  ['how many messages a day do i get', 'money.aiallowance'],
  ['how many meal slots am i allowed', 'limit.mealslots'],
  ['how many custom exercises can i make', 'limit.exercises'],
  ['what is triple digits', 'ach.tripledigits'],
  ['how do i earn iron will', 'ach.ironwill'],
  ['what is week warrior', 'ach.weekwarrior'],
  ['thank you', 'plea.thanks'],
  ['nice one', 'plea.ack'],
];

const MUST_NOT = [
  'whats a good back workout', 'should i eat more protein', 'is soreness normal',
  'how long should i sleep', 'does creatine make you bloated', 'whats better cardio or weights',
  'how many meal slots do i have', 'whats my step count', 'have i hit my water goal',
  'what did i log for dinner', 'hows my weight trending', 'how many workouts this week',
  'and that one', 'what about the other', 'ok so that', 'how do i turn that off',
  'how do i log water and whats a good breakfast',
  'whats the supporter plan and should i cut carbs',
  'hmm', 'idk man', 'wait',
];

let wrong = 0, missed = 0, leaked = 0;
console.log('\n=== THIRD CANNED CORPUS (written after all tuning) ===\n');
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
