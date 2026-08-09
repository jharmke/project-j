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

// 🔴 EXPECTED ANSWER IDS ADDED 2026-08-09. UNTIL NOW THIS FILE COUNTED **ANY** MATCH AS A HIT.
// This harness's own header calls its score "the only number in the whole build that means anything", and
// it could not tell a right answer from a wrong one. Coverage could have been bought with wrong answers and
// it would have read as a win. That is the exact failure PLAN 4.15 reverted two designs to avoid.
// ⚠️ `_general_holdout.cjs` has always recorded expected ids. This file was the odd one out.
// ⚠️ THE IDS WERE CHOSEN BY READING THE QUESTION AND THE LIBRARY, NOT BY RECORDING WHAT THE MATCHER
// CURRENTLY RETURNS. Writing down today's output would make this a change-detector, not a test.
// ⚠️ `null` means "more than one answer here is genuinely defensible, any match is accepted". Used
// sparingly and only where a reasonable person could pick either.
const SHOULD_MATCH = [
  ['i keep hearing different things about how much protein to eat', 'gen.protein_target'],
  ['is there a minimum amount of fat i should be having', 'gen.fat_intake'],
  ['everyone says fiber is important but how much', 'gen.fiber'],
  ['trying to work out how many calories i should be eating to slim down', 'gen.calories_to_lose'],
  ['i want to put on some muscle what should my intake look like', 'gen.calories_to_gain'],
  ['someone told me carbs are the reason im not losing', 'gen.carbs_bad'],
  ['my mate says you have to eat six times a day', 'gen.meals_per_day'],
  ['is there a point eating protein straight after training', 'gen.eat_around_workout'],
  ['thinking about getting a tub of whey', 'gen.protein_powder'],
  ['everyone at my gym takes creatine', 'gen.creatine'],
  ['i take a multivitamin is that enough', 'gen.supplements'],
  // null: "ruined everything" after one takeaway is all-or-nothing thinking, but how_strict and
  // back_on_track both answer it honestly. Not a distinction worth failing a build over.
  ['i had a takeaway last night and feel like ive ruined everything', null],
  ['went out drinking on saturday how bad is that', 'gen.alcohol'],
  ['ive been reading about the 16 8 thing', 'gen.fasting'],
  ['what does maintenance actually mean', 'gen.maintenance'],
  ['my resting metabolic rate came back low what does that mean', 'gen.bmr'],
  ['how many days in the gym is enough', 'gen.days_per_week'],
  ['i train five days is that too much', 'gen.days_per_week'],
  ['what rep range builds the most muscle', 'gen.sets_and_reps'],
  ['how do i actually keep getting stronger', 'gen.progressive_overload'],
  ['i never know what weight to pick', 'gen.how_heavy'],
  ['do i have to run as well as lift', 'gen.need_cardio'],
  ['my sessions take two hours is that normal', 'gen.workout_length'],
  ['upper lower or full body for a beginner', 'gen.split_or_full_body'],
  ['my coach mentioned taking a lighter week', 'gen.deload'],
  ['is warming up actually necessary or a waste of time', 'gen.warm_up'],
  ['my legs are wrecked from monday can i still train', 'gen.train_when_sore'],
  ['i only got five hours sleep last night', 'gen.sleep_amount'],
  ['does sleeping badly actually affect the gym', 'gen.sleep_matters'],
  ['my watch gives me a hrv number and i dont know what it means', 'gen.hrv'],
  ['i nap most afternoons is that bad', 'gen.naps'],
  ['i wake up loads during the night', 'gen.sleep_quality'],
  ['i scroll in bed every night', 'gen.screens_before_bed'],
  ['work has been brutal and my lifts have gone backwards', 'gen.stress'],
  ['is the sauna at my gym doing anything', 'gen.sauna_cold'],
  ['whats a sensible amount to lose in a month', 'gen.rate_of_loss'],
  ['i weighed myself three times today and got three numbers', 'gen.weight_fluctuation'],
  ['nothing has changed in six weeks', 'gen.plateau'],
  ['my trousers are looser but the scale says the same', 'gen.scale_vs_clothes'],
  ['is it actually possible to do both at once', 'gen.recomp'],
  ['i take pictures every month is that useful', 'gen.progress_photos'],
  ['i went up four pounds overnight', 'gen.water_weight'],
  ['i always gain over the weekend', 'gen.weekend_spike'],
  ['what number should i even be aiming for', 'gen.goal_weight'],
  ['my doctor mentioned my bmi', 'gen.bmi'],
  ['those scales that tell you your body fat any good', 'gen.body_fat_pct'],
  ['i do sit ups every day and my stomach is the same', 'gen.spot_reduction'],
  ['if i stop lifting will it all turn to fat', 'gen.muscle_to_fat'],
  ['i think ive wrecked my metabolism from dieting', 'gen.starvation_mode'],
  ['i sweat buckets in class does that mean its working', 'gen.sweating'],
  // null: a "juice thing" is either the juice/smoothie answer or the detox answer depending on whether
  // she means a cleanse, and the message does not say.
  ['my sister is doing a juice thing', null],
  ['im worried lifting will make me look bulky', 'gen.bulky'],
  ['i feel like everyone is staring at me in there', 'gen.gym_anxiety'],
  ['should the treadmill come before or after the weights', 'gen.cardio_order'],
  ['can i get results training in my garage', 'gen.need_a_gym'],
  ['my colleague lost loads on keto', 'gen.keto'],
  ['ive stopped eating meat will my training suffer', 'gen.plant_based'],
  ['theres a new diet every week which one actually works', 'gen.best_diet'],
  ['the numbers on the packet confuse me', 'gen.read_label'],
  ['do i weigh the pasta before or after boiling', 'gen.raw_or_cooked'],
  ['i drink four coffees a day', 'gen.coffee'],
  ['i live on diet coke', 'gen.diet_soda'],
  // null: starting strong and stopping is stay_consistent, build_habit or all_or_nothing depending on
  // which part you emphasise. All three are honest answers to it.
  ['i start strong then give up after two weeks', null],
  ['i had a terrible week and want to give up', null],
  ['i just cannot get myself to go', 'gen.motivation'],
  ['ive been logging for months and im sick of it', 'gen.tracking_burnout'],
  // 🔴 CURRENTLY RETURNS gen.age_recovery, WHICH ANSWERS A QUESTION THIS USER DID NOT ASK. They are
  // discouraged by comparison; the answer talks about warm ups and recovery between hard sessions.
  // It fires because 'my age' is a trigger on age_recovery, and gen.comparing only lists phrasings like
  // "everyone else" and "compare myself". Recorded as expected-comparing so the mismatch is VISIBLE
  // rather than counted as a hit. Not dangerous, and not fixed here: fixing it is a library change.
  ['i see people my age way further ahead', 'gen.comparing'],
  // ✅ VERIFIED SAFE, NOT A WRONG ANSWER. Two weeks of soreness sounds like it should be the joint or
  // doctor answer, but gen.soreness_meaning ends with "soreness lasting well beyond a few days is a
  // different thing and worth getting looked at", which is exactly the right thing to tell them.
  ['my shoulder has been sore for two weeks', 'gen.soreness_meaning'],
  ['do i need one of those belts', 'gen.belt_straps'],
  // null: a dodgy knee under a squat is train_around_injury or joint_pain, and both say back off and get
  // it looked at. Either is safe.
  ['ive got a dodgy knee can i still squat', null],
  ['im on blood pressure tablets is lifting ok', 'gen.medication'],
  ['im pregnant and want to keep training', 'gen.pregnancy'],
  ['im 52 is it too late', 'gen.age_recovery'],
  ['should i lose the fat first or build first', 'gen.bulk_or_cut'],
];

// ⚠️ EVERY EXPECTED ID MUST EXIST IN THE LIBRARY. A typo in an id would otherwise report a permanent
// wrong answer that no code change could ever fix, and somebody would eventually "fix" the library to
// chase it. Fails loudly rather than scoring.
{
  const known = new Set(GENERAL_ANSWERS.map((a) => a.id));
  const bogus = SHOULD_MATCH.filter(([, id]) => id && !known.has(id)).map(([q, id]) => `${id} (${q})`);
  if (bogus.length) {
    console.error('🔴 EXPECTED ID DOES NOT EXIST IN THE LIBRARY:\n   ' + bogus.join('\n   '));
    process.exit(2);
  }
}

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

let hit = 0, miss = 0, leaked = 0, wrong = 0;
const misses = [], leaks = [], wrongs = [];
for (const [q, expected] of SHOULD_MATCH) {
  const r = matchCanned(q, FREE, GENERAL_ANSWERS, ALL_ANSWERS);
  if (!r.matched) { miss++; misses.push(`${q}   (${r.reason})`); continue; }
  hit++;
  // ⚠️ A WRONG ANSWER STILL COUNTS IN COVERAGE, deliberately and exactly as `_general_holdout.cjs` does:
  // coverage answers "did the matcher fire", the wrong-answer line answers "should it have". Reporting
  // them separately is the point. Never subtract one from the other into a single tidy score.
  if (expected && r.matched.id !== expected) {
    wrong++;
    wrongs.push(`${q}\n        expected ${expected}, got ${r.matched.id}`);
  }
}
for (const q of MUST_NOT) {
  const r = matchCanned(q, FREE, GENERAL_ANSWERS, ALL_ANSWERS);
  if (r.matched) { leaked++; leaks.push(`${q}  ->  ${r.matched.id}`); }
}

console.log('='.repeat(70));
console.log(`HOLDOUT 2 (never tuned against) -- ${SHOULD_MATCH.length} in-scope, ${MUST_NOT.length} must-not-match`);
console.log('='.repeat(70));
console.log(`\nCOVERAGE:  ${hit}/${SHOULD_MATCH.length}  (${Math.round((hit / SHOULD_MATCH.length) * 100)}%)`);
console.log(`🔴 WRONG ANSWER: ${wrong}   <- fired, but answered a different question`);
console.log(`🔴 LEAKED:  ${leaked}   <- must be 0`);
if (wrongs.length) { console.log('\nWRONG:'); for (const w of wrongs) console.log('   🔴 ' + w); }
if (leaks.length) { console.log('\nLEAKED:'); for (const l of leaks) console.log('   🔴 ' + l); }
console.log('\nMISSED (cost only):');
for (const m of misses) console.log('   - ' + m);
// ⚠️ Exits on a wrong answer as well as a leak now. A miss is not a failure; a wrong answer is.
process.exit(wrong + leaked > 0 ? 1 : 0);
