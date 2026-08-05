// PLAN.md 4.9 -- bulk audit of the Coach/Support classifier. Run: node _route_audit.cjs
// ⚠️ THIS MEASURES ACCURACY, NOT THE MIX. Writing the messages myself and then counting how many are
// coaching would be marking my own homework (PLAN.md, section 8 of SPEC_cost_model). The MIX only comes
// from real users. What a hand-built corpus CAN test is whether the rule survives real phrasing.
const { routeCoachOrSupport } = require('./lib/ottoCoachRouting.js');

// Written deliberately the way people type: lowercase, no punctuation, typos, curly apostrophes.
const COACH = [ // must be coachOnly TRUE to save money. A miss here costs money only.
  'how much protein should i be eating', 'whats a good chest workout', 'is it bad if i train fasted',
  'how soon after a workout should i eat', 'does that change on a rest day', 'how much water a day',
  'should i be doing cardio before or after lifting', 'why am i so sore two days later',
  'is creatine worth taking', 'how many rest days a week', 'best breakfast before a morning lift',
  'how do i get more protein without eating meat', 'whats a realistic rate to lose weight',
  'is it ok to eat late at night', 'how much sleep do i actually need',
  'why do i keep waking up at 3am', 'does deep sleep matter more than total sleep',
  'how do i stop snacking at night', 'whats a good deadlift warm up',
  'should i lift heavy or do more reps', 'how long should a workout be',
  'i keep hitting a plateau on bench', 'is soreness a sign of a good workout',
  'how do i build more muscle at 40', 'whats a good post workout meal',
  'should i eat before bed', 'how many calories should i cut to lose a pound a week',
  'do i need to eat carbs to build muscle', 'is walking enough cardio',
  'how do i stay motivated when im tired', 'why does my energy crash in the afternoon',
  'whats better for fat loss cardio or weights', 'how much fibre should i get',
  'is intermittent fasting good for building muscle', 'i feel burnt out from training',
  'how do i fix my sleep schedule', 'whats a good amount of steps a day',
  'should i train when im sore', 'does caffeine hurt my sleep',
  'how do i get back into a routine after two weeks off', 'why is my resting heart rate going up',
  'is a high protein diet bad for you', 'how much fat should i be eating',
  'whats the best time of day to train', 'i want to gain muscle without gaining fat',
  'how long until i see results', 'is it normal to be hungry all the time in a deficit',
  'should i do full body or split', 'how do i improve my hrv',
  'why am i always tired even after 8 hours', 'is stretching before lifting bad',
  'how do i keep consistency when work gets busy', 'whats a good rep range for strength',
  'do i need a warm up for cardio', 'how do i lose weight without losing muscle',
  'is running bad for my knees', 'how much protein after a workout',
  'whats a healthy dinner if im cutting', 'does alcohol affect recovery',
];

const APP = [ // MUST be coachOnly FALSE. A miss here is Otto with no manual inventing app details.
  'how do i add a prayer request', 'where is the recipe builder', 'how do i log a recipe',
  'how do i change my theme', 'where do i see my day score', 'how do i turn off notifications',
  'can i change my calorie goal', 'how do i scan a barcode', 'where are my achievements',
  'how do i start a challenge', 'how do i cancel my subscription', 'what does the supporter plan cost',
  'how do i connect apple health', 'where is vacation mode', 'how do i add a custom food',
  'how do i rename a meal slot', 'where do i see my weekly summary', 'how do i export my data',
  'the app keeps crashing when i open the log tab', 'my steps arent syncing',
  'how do i delete an entry', 'where is the exercise library', 'how do i save a routine',
  'how do i change my macro preset', 'where do i find effort vs results',
  'how do i turn faith features off', 'where is the bible reader', 'how do i favourite a verse',
  'how do i log water', 'whats the difference between the free plan and supporter',
  'how do i change my accent color', 'where do i see my streak', 'how do i reset my password',
  'my weight didnt save', 'how do i add a workout to today', 'where is the gratitude card',
  'can i see last months summary', 'how do i change my step goal',
  'how do i log a workout i did yesterday', 'where do i change my sleep goal',
  'how do i use the toolkit', 'is there a way to hide a card on the home screen',
  'how do i restore my data after reinstalling', 'where do i see my prs',
  'how do i add a reading plan', 'the barcode scanner isnt working',
  'how do i turn on dark mode', 'where do i find the tutorials',
  'how much does it cost a month', 'how do i upgrade', 'can i get a refund',
  'how do i change my birthday', 'where is the journal', 'how do i log a devotional',
  'how do i set a reminder', 'my achievements disappeared', 'how do i change my font size',
  'where do i log my weight', 'how do i see yesterdays food', 'how do i make a custom exercise',
];

const DATA = [ // MUST be FALSE: these get answered by pointing at a screen, which needs the manual.
  'hows my protein been this week', 'did i hit my calorie target yesterday',
  'am i hitting my macros most days', 'how did i sleep last night',
  'whats my average protein this month', 'how many steps did i do yesterday',
  'is my weight trending down', 'how many workouts did i do this week',
  'what was my recovery score', 'how much water did i drink today',
  'did i log dinner yesterday', 'whats my current streak',
  'how many calories have i had today', 'what did i eat for lunch',
  'am i on pace for my goal weight', 'hows my sleep been trending',
  'what was my day score yesterday', 'how much did i lift last chest day',
  'whats my bench pr', 'have i been consistent with logging',
];

const AMBIGUOUS = [ // MUST be FALSE. No evidence either way; the manual is cheap insurance.
  'thanks', 'ok', 'what about now', 'can you help', 'hey', 'i need help',
  'whats up', 'not sure', 'tell me more', 'why', 'what do you mean', 'go on',
  'that doesnt work', 'still confused', 'help me out here',
];

function run(name, list, expectCoach) {
  let wrong = 0;
  const misses = [];
  for (const m of list) {
    const r = routeCoachOrSupport(m);
    if (r.coachOnly !== expectCoach) { wrong++; misses.push(`${m}  [${r.reason}]`); }
  }
  const pct = (((list.length - wrong) / list.length) * 100).toFixed(0);
  console.log(`${name.padEnd(12)} ${String(list.length - wrong).padStart(3)}/${String(list.length).padEnd(3)} correct  (${pct}%)`);
  return misses;
}

console.log('\n=== PLAN 4.9 CLASSIFIER AUDIT ===\n');
const coachMiss = run('COACH', COACH, true);
const appMiss = run('APP', APP, false);
const dataMiss = run('DATA', DATA, false);
const ambMiss = run('AMBIGUOUS', AMBIGUOUS, false);

console.log('\n🔴 THE NUMBER THAT MATTERS -- app/data questions wrongly sent to Coach (must be 0):',
  appMiss.length + dataMiss.length + ambMiss.length);
for (const m of [...appMiss, ...dataMiss, ...ambMiss]) console.log('   DANGEROUS:', m);

console.log('\n💰 Coaching questions we FAIL to route (costs money only):', coachMiss.length);
for (const m of coachMiss) console.log('   missed:', m);

const total = COACH.length + APP.length + DATA.length + AMBIGUOUS.length;
const coachRouted = COACH.length - coachMiss.length;
console.log(`\nShare of THIS corpus routed to Coach: ${((coachRouted / total) * 100).toFixed(0)}%`);
console.log('⚠️ That share is NOT a prediction of the real mix -- I wrote the corpus. Real mix needs production.\n');
