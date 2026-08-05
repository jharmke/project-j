// PLAN 4.9 -- HELD-OUT set. Written AFTER the classifier was tuned, run ONCE, no tuning afterwards.
// ⚠️ The 100% on the first corpus is not evidence: that corpus was tuned against. This one is.
const { routeCoachOrSupport } = require('./lib/ottoCoachRouting.js');

const COACH = [
  'i want to get stronger without getting bigger', 'whats better for sleep magnesium or melatonin',
  'do i need to eat every 3 hours', 'is 6 hours enough if i feel fine',
  'whats the deal with protein timing', 'can you build muscle in a deficit',
  'i hate cardio whats the minimum', 'thoughts on high rep training',
  'how do i eat more without feeling stuffed', 'is it worth training twice a day',
  'i keep getting shin splints when i run', 'whats a decent bench for a beginner',
  'should older lifters train differently', 'does soreness mean growth',
  'why cant i sleep after evening workouts', 'best way to warm up shoulders',
  'do rest days need to be full rest', 'is white rice bad',
  'i travel a lot how do i stay on track', 'is it ok to skip breakfast',
  'how much cardio is too much', 'does lifting stunt growth',
  'whats a good protein powder', 'i get lightheaded when i train fasted',
  'should i take a deload week', 'does stretching help soreness',
];

const APP = [
  'i cant find where to put my height', 'is there dark mode', 'the widget isnt updating',
  'can i use this on ipad', 'do you have an android version', 'how do i share a report',
  'whats the difference between a challenge and a streak', 'i want to stop getting emails',
  'can i log food for tomorrow', 'does it work offline', 'how do i pause my subscription',
  'where did my recipes go', 'can i merge two accounts', 'how do i see what otto said earlier',
  'is my data private', 'can i print my summary', 'how do i change units to kg',
  'the numbers on the home screen look wrong', 'how do i turn off the daily reminder',
  'can two people use one account', 'how do i hide the faith stuff',
  'why does it keep asking me to rate the app', 'can i back date an entry',
  'how do i find a food that isnt in the database', 'whats the little i icon for',
];

const DATA = [
  'am i eating enough', 'been slacking this week havent i', 'how consistent have i been',
  'give me my numbers', 'summarise my week', 'whats my best lift',
  'did i improve since last month', 'how am i doing', 'compare this week to last week',
  'whats my longest streak', 'read me my stats', 'how many days have i logged',
];

const AMBIGUOUS = ['yo', 'idk', 'sure', 'one more thing', 'wait what', 'nvm', 'and'];

function run(name, list, expectCoach) {
  const misses = [];
  for (const m of list) {
    const r = routeCoachOrSupport(m);
    if (r.coachOnly !== expectCoach) misses.push(`${m}  [${r.reason}]`);
  }
  const ok = list.length - misses.length;
  console.log(`${name.padEnd(12)} ${String(ok).padStart(3)}/${String(list.length).padEnd(3)} (${((ok / list.length) * 100).toFixed(0)}%)`);
  return misses;
}

console.log('\n=== HELD-OUT AUDIT (never tuned against) ===\n');
const cm = run('COACH', COACH, true);
const am = run('APP', APP, false);
const dm = run('DATA', DATA, false);
const gm = run('AMBIGUOUS', AMBIGUOUS, false);
console.log('\n🔴 DANGEROUS (app/data sent to Coach, must be 0):', am.length + dm.length + gm.length);
for (const m of [...am, ...dm, ...gm]) console.log('   DANGEROUS:', m);
console.log('\n💰 Coaching missed (costs money only):', cm.length);
for (const m of cm) console.log('   missed:', m);
