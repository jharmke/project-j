// PLAN.md 4.13 -- HOLDOUT for the general library. Run from functions/: node _general_holdout.cjs
//
// 🔴 THE ONE RULE THAT MAKES THIS WORTH ANYTHING: DO NOT TUNE TRIGGER WORDS TO MAKE THESE PASS.
// Three earlier corpora on this project were destroyed exactly that way. Each was tuned to ~100% and the
// next fresh corpus still opened at 60%, which means the tuned score measured nothing at all.
// ➡️ If a miss here reveals a STRUCTURAL fault (a whole class of phrasing, a missing word form), fix the
// structure and say so. If it is one unlucky sentence, LEAVE IT and let the number stand.
//
// ⚠️ HONEST WEAKNESS, STATED UP FRONT: these were written by the same person who wrote the trigger lists,
// which makes this a weaker holdout than one written by somebody else. It is mitigated by writing in a
// deliberately different register (lowercase, slang, abbreviations, no punctuation, indirect phrasing)
// rather than the clean question forms the answers were built around. Treat the result as an OPTIMISTIC
// ceiling, not a measurement. The real number arrives with production traffic (PLAN 4.11a).

const { GENERAL_ANSWERS } = require('./lib/ottoGeneralAnswers.js');
const { matchCanned } = require('./lib/ottoCannedMatcher.js');
const { CANNED_ANSWERS } = require('./lib/ottoCannedAnswers.js');
// PLAN.md 4.15: the trim's guard must see every topic in BOTH libraries, exactly as production does.
const ALL_ANSWERS = [...CANNED_ANSWERS, ...GENERAL_ANSWERS];

const FREE = { supporter: false, faithTier: 'exploring', styleMode: 'balanced' };

// Should find SOMETHING in the general library. The expected id is recorded so a WRONG answer is visible
// separately from a miss: a miss costs money, a wrong answer costs trust.
const SHOULD_MATCH = [
  ['whats a good amount of protein', 'gen.protein_target'],
  ['do i really need to eat that much protein', 'gen.protein_target'],
  ['how many cals to drop a few pounds', 'gen.calories_to_lose'],
  ['whats a deficit', 'gen.what_is_deficit'],
  ['should i be eating carbs at all', 'gen.carbs_bad'],
  ['how much water a day', 'gen.water_intake'],
  ['do i have to weigh my food', 'gen.count_calories'],
  ['does it matter when i eat', 'gen.meal_timing'],
  ['whey any good', 'gen.protein_powder'],
  ['is creatine safe', 'gen.creatine'],
  ['do vitamins do anything', 'gen.supplements'],
  ['are cheat days ok', 'gen.how_strict'],
  ['can i drink beer and still lose weight', 'gen.alcohol'],
  ['is fasting worth trying', 'gen.fasting'],
  ['is eating at midnight bad', 'gen.eating_late'],
  ['whats bmr', 'gen.bmr'],
  ['how much sugar is ok', 'gen.sugar'],
  ['how many times a week should i be in the gym', 'gen.days_per_week'],
  ['how many rest days', 'gen.rest_days'],
  ['reps and sets for muscle', 'gen.sets_and_reps'],
  ['whats progressive overload', 'gen.progressive_overload'],
  ['how heavy do i go', 'gen.how_heavy'],
  ['is cardio necessary', 'gen.need_cardio'],
  ['how much cardio for fat loss', 'gen.how_much_cardio'],
  ['how long should i be in the gym', 'gen.workout_length'],
  ['ppl or full body', 'gen.split_or_full_body'],
  ['whats a deload week', 'gen.deload'],
  ['do i have to warm up', 'gen.warm_up'],
  ['should i stretch first', 'gen.stretching'],
  ['can i go to the gym while sore', 'gen.train_when_sore'],
  ['missed 2 days does it matter', 'gen.missed_workout'],
  ['how many hours of sleep', 'gen.sleep_amount'],
  ['does sleep really matter that much', 'gen.sleep_matters'],
  ['whats hrv', 'gen.hrv'],
  ['why am i sore for 3 days', 'gen.soreness_meaning'],
  ['are naps good or bad', 'gen.naps'],
  ['is phone before bed bad', 'gen.screens_before_bed'],
  ['does going to bed at random times matter', 'gen.sleep_schedule'],
  ['is stress messing with my progress', 'gen.stress'],
  ['is a cold plunge worth it', 'gen.sauna_cold'],
  ['how quick can i lose weight', 'gen.rate_of_loss'],
  ['should i weigh daily', 'gen.weigh_frequency'],
  ['why is my weight all over the place', 'gen.weight_fluctuation'],
  ['when will i see a difference', 'gen.time_to_results'],
  ['scale hasnt moved in a month', 'gen.plateau'],
  ['can you build muscle and lose fat', 'gen.recomp'],
  ['clothes looser but same weight', 'gen.scale_vs_clothes'],
  ['is bmi accurate', 'gen.bmi'],
  ['whats a good body fat percent', 'gen.body_fat_pct'],
  ['can i target belly fat', 'gen.spot_reduction'],
  ['will muscle turn into fat if i stop', 'gen.muscle_to_fat'],
  ['is starvation mode a thing', 'gen.starvation_mode'],
  ['are carbs at night bad', 'gen.carbs_at_night'],
  ['does sweating more mean more fat burned', 'gen.sweating'],
  ['do detox teas work', 'gen.detox'],
  ['do waist trainers work', 'gen.fat_burners'],
  ['will weights make me huge', 'gen.bulky'],
  ['what shoes for the gym', 'gen.shoes'],
  ['the gym makes me anxious', 'gen.gym_anxiety'],
  ['cardio first or weights first', 'gen.cardio_order'],
  ['do i need a gym membership', 'gen.need_a_gym'],
  ['is keto any good', 'gen.keto'],
  ['can you get big vegan', 'gen.plant_based'],
  ['whats the best diet for fat loss', 'gen.best_diet'],
  ['how do i read labels', 'gen.read_label'],
  ['raw or cooked chicken', 'gen.raw_or_cooked'],
  ['does coffee count as water', 'gen.coffee'],
  ['is diet coke bad', 'gen.diet_soda'],
  ['how do i stay consistent', 'gen.stay_consistent'],
  ['i keep falling off', 'gen.fell_off'],
  ['no motivation lately', 'gen.motivation'],
  ['should i see a doc about my knee', null],
  ['can i lift pregnant', 'gen.pregnancy'],
  ['do my meds affect training', 'gen.medication'],
  ['bulk or cut', 'gen.bulk_or_cut'],
  ['am i too old to start lifting', 'gen.age_recovery'],
  ['is gluten bad', 'gen.gluten_free'],
];

// 🔴 MUST NOT MATCH. Per-food rulings, own-data, app questions, and anything crisis-adjacent.
const MUST_NOT = [
  'is white rice bad',
  'whats a good chest workout',
  'how many calories in a banana',
  'hows my week been',
  'log my breakfast',
  'my chest hurts when i run',
  'i feel dizzy and short of breath',
  'how do i change my theme',
  'whats my streak',
];

let hit = 0, wrong = 0, miss = 0;
const misses = [], wrongs = [];
for (const [q, expected] of SHOULD_MATCH) {
  const r = matchCanned(q, FREE, GENERAL_ANSWERS, ALL_ANSWERS);
  if (!r.matched) { miss++; misses.push(`${q}   (${r.reason})`); continue; }
  hit++;
  // `expected: null` means "any sensible answer is fine", used where two entries could both be right.
  if (expected && r.matched.id !== expected) { wrong++; wrongs.push(`${q}\n        expected ${expected}, got ${r.matched.id}`); }
}

let leaked = 0;
const leaks = [];
for (const q of MUST_NOT) {
  const r = matchCanned(q, FREE, GENERAL_ANSWERS, ALL_ANSWERS);
  if (r.matched) { leaked++; leaks.push(`${q}  ->  ${r.matched.id}`); }
}

console.log('='.repeat(70));
console.log(`HOLDOUT -- ${SHOULD_MATCH.length} in-scope questions, ${MUST_NOT.length} that must not match`);
console.log('='.repeat(70));
console.log(`\nCOVERAGE:      ${hit}/${SHOULD_MATCH.length}  (${Math.round((hit / SHOULD_MATCH.length) * 100)}%)`);
console.log(`🔴 WRONG ANSWER: ${wrong}   <- the number that must be 0`);
console.log(`🔴 LEAKED:       ${leaked}   <- must-not-match questions that matched anyway`);
if (wrongs.length) { console.log('\nWRONG:'); for (const w of wrongs) console.log('   🔴 ' + w); }
if (leaks.length) { console.log('\nLEAKED:'); for (const l of leaks) console.log('   🔴 ' + l); }
if (misses.length) { console.log('\nMISSED (cost only):'); for (const m of misses) console.log('   - ' + m); }
process.exit(wrong + leaked > 0 ? 1 : 0);
