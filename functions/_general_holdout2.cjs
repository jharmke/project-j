// PLAN.md 4.13 -- SECOND HOLDOUT, written AFTER all structural tuning and never tuned against.
// Run from functions/: node _general_holdout2.cjs
//
// 🔴 THIS IS THE ONLY NUMBER IN THE WHOLE BUILD THAT MEANS ANYTHING.
// Holdout 1 scored 57%, then structural fixes (generic stopwords, a numeric filter, a synonym layer) took
// it to 69%. **A score on the corpus you just tuned against is not evidence.** On this project a corpus
// once went 61% -> 87% -> 100% under tuning while the next fresh one still opened at 60%.
// ➡️ So: if this corpus lands near 69%, the fixes were STRUCTURAL and generalised. If it falls back toward
// 57%, they merely fitted holdout 1 and the honest number is still ~57%.
//
// ⚠️ WRITTEN IN A THIRD REGISTER ON PURPOSE. Holdout 1 was terse phone-typing. These are longer, more
// conversational, and several are STATEMENTS rather than questions, which is how people actually open.
// 🔴 DO NOT TUNE ANYTHING TO MAKE THESE PASS. Record the number and move on. The real measurement still
// only arrives with production traffic (PLAN 4.11a).

const { GENERAL_ANSWERS } = require('./lib/ottoGeneralAnswers.js');
const { matchCanned } = require('./lib/ottoCannedMatcher.js');
const { CANNED_ANSWERS } = require('./lib/ottoCannedAnswers.js');
// PLAN.md 4.15: the trim's guard must see every topic in BOTH libraries, exactly as production does.
const ALL_ANSWERS = [...CANNED_ANSWERS, ...GENERAL_ANSWERS];

const FREE = { supporter: false, faithTier: 'exploring', styleMode: 'balanced' };

const SHOULD_MATCH = [
  'i keep hearing different things about how much protein to eat',
  'is there a minimum amount of fat i should be having',
  'everyone says fiber is important but how much',
  'trying to work out how many calories i should be eating to slim down',
  'i want to put on some muscle what should my intake look like',
  'someone told me carbs are the reason im not losing',
  'my mate says you have to eat six times a day',
  'is there a point eating protein straight after training',
  'thinking about getting a tub of whey',
  'everyone at my gym takes creatine',
  'i take a multivitamin is that enough',
  'i had a takeaway last night and feel like ive ruined everything',
  'went out drinking on saturday how bad is that',
  'ive been reading about the 16 8 thing',
  'what does maintenance actually mean',
  'my resting metabolic rate came back low what does that mean',
  'how many days in the gym is enough',
  'i train five days is that too much',
  'what rep range builds the most muscle',
  'how do i actually keep getting stronger',
  'i never know what weight to pick',
  'do i have to run as well as lift',
  'my sessions take two hours is that normal',
  'upper lower or full body for a beginner',
  'my coach mentioned taking a lighter week',
  'is warming up actually necessary or a waste of time',
  'my legs are wrecked from monday can i still train',
  'i only got five hours sleep last night',
  'does sleeping badly actually affect the gym',
  'my watch gives me a hrv number and i dont know what it means',
  'i nap most afternoons is that bad',
  'i wake up loads during the night',
  'i scroll in bed every night',
  'work has been brutal and my lifts have gone backwards',
  'is the sauna at my gym doing anything',
  'whats a sensible amount to lose in a month',
  'i weighed myself three times today and got three numbers',
  'nothing has changed in six weeks',
  'my trousers are looser but the scale says the same',
  'is it actually possible to do both at once',
  'i take pictures every month is that useful',
  'i went up four pounds overnight',
  'i always gain over the weekend',
  'what number should i even be aiming for',
  'my doctor mentioned my bmi',
  'those scales that tell you your body fat any good',
  'i do sit ups every day and my stomach is the same',
  'if i stop lifting will it all turn to fat',
  'i think ive wrecked my metabolism from dieting',
  'i sweat buckets in class does that mean its working',
  'my sister is doing a juice thing',
  'im worried lifting will make me look bulky',
  'i feel like everyone is staring at me in there',
  'should the treadmill come before or after the weights',
  'can i get results training in my garage',
  'my colleague lost loads on keto',
  'ive stopped eating meat will my training suffer',
  'theres a new diet every week which one actually works',
  'the numbers on the packet confuse me',
  'do i weigh the pasta before or after boiling',
  'i drink four coffees a day',
  'i live on diet coke',
  'i start strong then give up after two weeks',
  'i had a terrible week and want to give up',
  'i just cannot get myself to go',
  'ive been logging for months and im sick of it',
  'i see people my age way further ahead',
  'my shoulder has been sore for two weeks',
  'do i need one of those belts',
  'ive got a dodgy knee can i still squat',
  'im on blood pressure tablets is lifting ok',
  'im pregnant and want to keep training',
  'im 52 is it too late',
  'should i lose the fat first or build first',
];

const MUST_NOT = [
  'is sourdough better than white bread',
  'give me a leg workout',
  'how many calories are in a slice of pizza',
  'what did i eat on tuesday',
  'add chicken to my lunch',
  'my chest feels tight when i climb stairs',
  'i went dizzy and could not breathe properly',
  'where do i turn on dark mode',
  'how many recipes can i save',
];

let hit = 0, miss = 0, leaked = 0;
const misses = [], leaks = [];
for (const q of SHOULD_MATCH) {
  const r = matchCanned(q, FREE, GENERAL_ANSWERS, ALL_ANSWERS);
  if (r.matched) hit++; else { miss++; misses.push(`${q}   (${r.reason})`); }
}
for (const q of MUST_NOT) {
  const r = matchCanned(q, FREE, GENERAL_ANSWERS, ALL_ANSWERS);
  if (r.matched) { leaked++; leaks.push(`${q}  ->  ${r.matched.id}`); }
}

console.log('='.repeat(70));
console.log(`HOLDOUT 2 (never tuned against) -- ${SHOULD_MATCH.length} in-scope, ${MUST_NOT.length} must-not-match`);
console.log('='.repeat(70));
console.log(`\nCOVERAGE:  ${hit}/${SHOULD_MATCH.length}  (${Math.round((hit / SHOULD_MATCH.length) * 100)}%)`);
console.log(`🔴 LEAKED:  ${leaked}   <- must be 0`);
if (leaks.length) { console.log('\nLEAKED:'); for (const l of leaks) console.log('   🔴 ' + l); }
console.log('\nMISSED (cost only):');
for (const m of misses) console.log('   - ' + m);
process.exit(leaked > 0 ? 1 : 0);
