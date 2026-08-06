// PLAN 4.9 -- FOURTH corpus, built AFTER a live failure on 2026-08-05.
// A free user asked "how many messages do i get a day" and it routed to Coach (no manual); Otto answered
// "that's not something GoodForge tracks or limits". The true answer is 5. Three corpora missed the whole
// class because it has no app noun and no coaching word -- only its SHAPE gives it away.
const { routeCoachOrSupport } = require('./lib/ottoCoachRouting.js');

const ENTITLEMENT = [ // MUST be support -- all are about what the PLAN allows
  'how many messages do i get a day', 'how many messages do i get', 'whats my daily limit',
  'how many ai estimates do i get', 'how many photos do i get a month', 'do i have a limit',
  'how many custom foods do i get', 'how many recipes can i save', 'am i limited on anything',
  'how many messages do i have left', 'did i run out of messages', 'how many do i get per day',
  'is there a cap on how much i can ask you', 'how many questions do i get',
  'whats the free plan limit', 'do i get unlimited messages', 'how much do i get on the free plan',
  'how many meal slots do i get', 'how many graphs do i get', 'how many left today',
  'whats my allowance', 'how many workouts can i save', 'do i run out of anything',
];

const COACH = [ // MUST stay coach -- similar shapes, but about the body. Misses here cost money only.
  'how much protein do i get from chicken', 'how many calories are in an egg',
  'how many rest days should i take', 'how much sleep do i actually need',
  'how many sets should i do per muscle', 'how much water should i drink',
  'how many grams of fiber a day', 'how many steps is enough',
  'is white rice bad', 'whats a good chest workout', 'should i take creatine',
  'how long should i wait between sets', 'is it bad to train fasted',
];

function run(name, list, expect) {
  const misses = [];
  for (const m of list) {
    const r = routeCoachOrSupport(m);
    if (r.coachOnly !== expect) misses.push(`${m}  [${r.reason}]`);
  }
  const ok = list.length - misses.length;
  console.log(`${name.padEnd(12)} ${String(ok).padStart(3)}/${String(list.length).padEnd(3)} (${((ok / list.length) * 100).toFixed(0)}%)`);
  return misses;
}

console.log('\n=== FOURTH CORPUS: ENTITLEMENT QUESTIONS ===\n');
const em = run('ENTITLEMENT', ENTITLEMENT, false);
const cm = run('COACH', COACH, true);
console.log('\n🔴 DANGEROUS (entitlement sent to a manual-less Otto, must be 0):', em.length);
for (const m of em) console.log('   DANGEROUS:', m);
console.log('\n💰 coaching missed (money only):', cm.length);
for (const m of cm) console.log('   missed:', m);
