// PLAN 4.9 -- THIRD corpus. Written after the inversion, deliberately wider than the first two:
// food and exercise names the whitelist never had, slang, typos, statements rather than questions.
const { routeCoachOrSupport } = require('./lib/ottoCoachRouting.js');

const COACH = [
  'is white rice bad', 'are eggs ok every day', 'thoughts on oatmeal',
  'quinoa or brown rice', 'should i take a deload week', 'whats a superset',
  'i want to get stronger without getting bigger', 'is 6 hours enough if i feel fine',
  'how many chin ups should i be able to do', 'does chocolate milk work after lifting',
  'ive been feeling flat in the gym lately', 'my knees hurt when i squat deep',
  'whats the point of a rest week', 'do i need to count everything forever',
  'i cant stop craving sweets at night', 'is it normal to gain at the start',
  'whats better bulgarian split squats or lunges', 'do i have to do abs',
  'i get nauseous during hard sets', 'is coffee before bed really that bad',
  'ive plateaued', 'salmon vs chicken', 'how many eggs is too many',
  'should i be sore every session', 'whats the deal with zone 2',
  'i feel guilty when i miss a day', 'is peanut butter fattening',
  'do i need a spotter for heavy bench', 'whats a beginner mistake to avoid',
  'i want to look leaner not lighter', 'ive got 20 minutes what do i do',
  'does muscle turn into fat', 'is it better to train morning or night',
  'i always skip warm ups', 'whats a realistic goal for a year',
];

const APP = [
  'wheres the thing that shows my week', 'i cant see yesterday',
  'how do i get rid of the popup', 'it logged the wrong amount',
  'can i edit something i already saved', 'theres no option for that',
  'i tapped it and nothing happened', 'how do i see older stuff',
  'why did it sign me out', 'can i use it without the watch',
  'how do i get the numbers to show in kg', 'the screen is blank',
  'how do i undo that', 'is there a way to see everything at once',
  'i want to remove a card', 'how do i get back to the main page',
  'where did the button go', 'can i turn the sounds off',
  'how much is it after the free bit', 'do i lose my stuff if i uninstall',
  'can i change the colour', 'it says error when i save',
  'how do i see what i logged last tuesday', 'wheres the settings',
  'can i add a photo', 'how do i share this with my wife',
];

const DATA = [
  'am i eating enough', 'how am i doing', 'give me my numbers',
  'whats my best lift', 'read me my stats', 'how many days have i logged',
  'summarise my week', 'did i improve since last month', 'compare this week to last week',
  'whats my longest streak', 'been slacking this week havent i', 'how consistent have i been',
];

const AMBIGUOUS = ['yo', 'idk', 'sure', 'one more thing', 'wait what', 'nvm', 'and', 'huh', 'ok cool'];

function run(name, list, expect) {
  const misses = [];
  for (const m of list) {
    const r = routeCoachOrSupport(m);
    if (r.coachOnly !== expect) misses.push(`${m}  [${r.reason}]`);
  }
  const ok = list.length - misses.length;
  console.log(`${name.padEnd(11)} ${String(ok).padStart(3)}/${String(list.length).padEnd(3)} (${((ok / list.length) * 100).toFixed(0)}%)`);
  return misses;
}

console.log('\n=== THIRD CORPUS ===\n');
const cm = run('COACH', COACH, true);
const am = run('APP', APP, false);
const dm = run('DATA', DATA, false);
const gm = run('AMBIG', AMBIGUOUS, false);
console.log('\n🔴 DANGEROUS (must be 0):', am.length + dm.length + gm.length);
for (const m of [...am, ...dm, ...gm]) console.log('   DANGEROUS:', m);
console.log('\n💰 coaching missed (money only):', cm.length);
for (const m of cm) console.log('   missed:', m);
