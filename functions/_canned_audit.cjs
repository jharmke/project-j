// PLAN.md 4.8 -- canned answer audit. Run: node _canned_audit.cjs
// The number that must be ZERO is WRONG ANSWERS. A miss just costs $0.0054 (today's behaviour).
const fs = require('fs');
const { CANNED_ANSWERS } = require('./lib/ottoCannedAnswers.js');
const { matchCanned, ROUTE_KEYS } = require('./lib/ottoCannedMatcher.js');

// ⚠️ COLLAPSE WHITESPACE. The KB wraps lines mid-path, so "Accessibility > Text Size" can sit across a
// newline and a raw read reports a real path as missing. That is a harness bug, not a stale answer.
const KB = fs.readFileSync('./src/assistantAppKnowledge.ts', 'utf8').toLowerCase().replace(/\s+/g, ' ');
const FREE = { supporter: false, faithTier: 'exploring', styleMode: 'balanced' };
const SUP = { supporter: true, faithTier: 'exploring', styleMode: 'balanced' };
const M = (msg, ctx = FREE) => matchCanned(msg, ctx, CANNED_ANSWERS);
const textOf = (a, ctx) => (typeof a.answer === 'function' ? a.answer(ctx) : a.answer);

let fails = 0;
const bad = (s) => { console.log('   ' + s); fails++; };

// ═══ ASSERTION 1: NO DASHES ANYWHERE ═════════════════════════════════════════
console.log('\n1. DASH SCAN (em, en, double hyphen, spaced hyphen)');
const DASH = /[–—]|--|\s-\s/;
let dashHits = 0;
for (const a of CANNED_ANSWERS) {
  for (const ctx of [FREE, SUP]) {
    const t = textOf(a, ctx);
    if (DASH.test(t)) { bad(`DASH in ${a.id}: ${t.slice(0, 70)}`); dashHits++; }
  }
}
console.log(dashHits === 0 ? '   clean' : `   ${dashHits} found`);

// ═══ ASSERTION 2: EVERY ROUTE KEY IS REAL ════════════════════════════════════
console.log('\n2. ROUTE KEYS');
let routeHits = 0;
for (const a of CANNED_ANSWERS) {
  if (a.route && !ROUTE_KEYS.includes(a.route)) { bad(`BAD ROUTE in ${a.id}: ${a.route}`); routeHits++; }
}
console.log(routeHits === 0 ? `   all valid (${CANNED_ANSWERS.filter(a => a.route).length} of ${CANNED_ANSWERS.length} answers carry one)` : `   ${routeHits} invalid`);

// ═══ ASSERTION 3: NAVIGATION PATHS STILL EXIST IN THE KB ═════════════════════
// ⚠️ This is the staleness guard. Answers are voiced by hand, so this is what buys back the
// single-source-of-truth. Only checks answers that state an explicit "A > B" path.
console.log('\n3. KB PATH ASSERTION');
let checked = 0, pathFails = 0;
for (const a of CANNED_ANSWERS) {
  const t = textOf(a, FREE).toLowerCase();
  // ⚠️ EXTRACT TIGHTLY. The first version grabbed whole clauses ("and you can manage it from profile >
  // membership") and then failed on the prose, which is a harness bug reported as a content bug. Take at
  // most two words either side of each ">" and try longest first.
  // ⚠️ STRIP PUNCTUATION FIRST. Without this the extractor picks up "membership, or" and "goodforge, and"
  // and reports a content failure that is really a comma.
  const words = t.replace(/[^a-z0-9&>' ]/g, ' ').replace(/\s+/g, ' ').trim().split(' ');
  for (let i = 0; i < words.length; i++) {
    if (words[i] !== '>') continue;
    checked++;
    const before = words.slice(Math.max(0, i - 2), i);
    const after = words.slice(i + 1, i + 3);
    const tries = [];
    for (let b = before.length; b >= 1; b--) {
      for (let af = after.length; af >= 1; af--) {
        tries.push(`${before.slice(-b).join(' ')} > ${after.slice(0, af).join(' ')}`);
      }
    }
    if (!tries.some((x) => KB.includes(x))) {
      bad(`PATH not in KB (${a.id}): "${tries[0]}"`); pathFails++;
    }
  }
}
const noPath = CANNED_ANSWERS.filter((a) => !/ > /.test(textOf(a, FREE))).length;
console.log(`   ${checked} paths checked, ${pathFails} missing.  ⚠️ ${noPath} answers state no explicit path, so are NOT covered by this guard.`);

// ═══ ASSERTION 4: MINDFUL-HIDDEN SURFACES NEED A MODE BRANCH ═════════════════
console.log('\n4. MINDFUL SURFACES');
const MINDFUL_HIDDEN = ['macros card', 'net calories', 'calorie strip'];
let mindfulHits = 0;
for (const a of CANNED_ANSWERS) {
  const t = textOf(a, FREE).toLowerCase();
  if (MINDFUL_HIDDEN.some((s) => t.includes(s)) && typeof a.answer !== 'function') {
    bad(`names a Mindful-hidden surface with no branch: ${a.id}`); mindfulHits++;
  }
}
console.log(mindfulHits === 0 ? '   clean' : `   ${mindfulHits} found`);

// ═══ CORPUS A: MUST MATCH, AND MATCH THE RIGHT ONE ═══════════════════════════
const HITS = [
  ['how do i change my theme', 'nav.theme'],
  ['how do i change my calorie goal', 'nav.goals'],
  ['where do i change my sleep goal', 'nav.goals'],
  ['how do i turn on net carbs', 'nav.netcarbs'],
  ['how do i change my coaching style', 'nav.coachingmode'],
  ['how do i turn faith features off', 'nav.faithtoggle'],
  ['how do i connect apple health', 'nav.applehealth'],
  ['how do i change my apple health permissions', 'nav.applehealth'],
  ['where do i set my goal weight', 'nav.weightgoal'],
  ['how do i log my weight', 'nav.logweight'],
  ['how do i fix a past weigh in', 'nav.weighthistory'],
  ['how do i log food', 'nav.logfood'],
  ['how do i scan a barcode', 'nav.barcode'],
  ['how do i use the ai estimator', 'nav.estimator'],
  ['how do i repeat yesterdays meal', 'nav.repeatmeal'],
  ['how do i clear a whole meal', 'nav.clearmeal'],
  ['how do i log a recipe', 'nav.recipe'],
  ['how do i build a recipe', 'nav.recipe'],
  ['how do i create a custom food', 'nav.customfood'],
  ['how do i log water', 'nav.logwater'],
  ['how do i delete a water entry', 'nav.editwater'],
  ['how do i log a lift', 'nav.loglift'],
  ['how do i rearrange my home cards', 'nav.homecards'],
  ['how do i add a meal slot', 'nav.mealslots'],
  ['how do i add a stats graph', 'nav.statsgraph'],
  ['how do i track intermittent fasting', 'nav.fasting'],
  ['where are my achievements', 'nav.achievements'],
  ['how do i see a past day', 'nav.pastday'],
  ['where do i see sleep detail', 'nav.sleephub'],
  ['how do i start a challenge', 'nav.challenge'],
  ['how do i compare two periods', 'nav.comparison'],
  ['where is effort vs results', 'nav.evr'],
  ['how do i set up vacation mode', 'nav.vacation'],
  ['how do i change my notification settings', 'nav.notifications'],
  ['how do i stop notifications at night', 'nav.quiethours'],
  ['how do i get fewer notifications', 'nav.dailylimit'],
  ['where is membership', 'nav.membership'],
  ['how do i add a verse to my daily message', 'nav.versrotation'],
  ['how do i favorite a verse', 'nav.favoriteverse'],
  ['how do i add a prayer request', 'nav.prayer'],
  ['how do i send feedback', 'nav.feedback'],
  ['how do i change the text size', 'nav.textsize'],
  ['where do i log body measurements', 'nav.body'],
  ['where is my journal', 'nav.journal'],
  ['how do i start a reading plan', 'nav.plans'],
  ['who is halo', 'nav.halo'],
  ['whats the difference between a program and a routine', 'con.programroutine'],
  ['what is an estimated 1rm', 'con.pr'],
  ['what do net carbs mean', 'con.netcarbsmeaning'],
  ['why is burned so high already', 'con.burned'],
  ['what does the day score mean', 'con.dayscore'],
  ['what is mindful mode', 'con.mindfulmode'],
  ['what does rooted mean', 'con.faithtiers'],
  ['why does it keep asking me to rate the app', 'con.rateprompt'],
  ['how accurate is the body fat estimate', 'con.navybf'],
  ['what does the supporter plan cost', 'money.price'],
  ['how much is the tip jar', 'money.tipjar'],
  ['what happens if i cancel', 'money.cancel'],
  ['do i have to pay for halo', 'money.faithfree'],
  ['how many messages do i get a day', 'money.aiallowance'],
  ['how many custom foods do i get', 'limit.customfoods'],
  ['how many recipes can i save', 'limit.recipes'],
  ['how many meal slots do i get', 'limit.mealslots'],
  ['what is well worn', 'ach.wellworn'],
  ['what is bathtub', 'ach.bathtub'],
  ['how do i get sleep architect', 'ach.sleeparchitect'],
  ['what is the summit', 'ach.thesummit'],
  ['thanks', 'plea.thanks'],
  ['thanks man', 'plea.thanks'],
  ['hey', 'plea.greeting'],
  ['got it', 'plea.ack'],
];

console.log('\n5. CORPUS A: must match the RIGHT answer');
let wrong = 0, missed = 0;
for (const [msg, want] of HITS) {
  const r = M(msg);
  if (!r.matched) { missed++; console.log(`   MISS  "${msg}"  [${r.reason}]`); }
  else if (r.matched.id !== want) { bad(`WRONG "${msg}" -> ${r.matched.id} (wanted ${want})`); wrong++; }
}
console.log(`   ${HITS.length - wrong - missed}/${HITS.length} correct.  wrong=${wrong}  missed=${missed}`);

// ═══ CORPUS B: COLLISIONS THE KB ITSELF DOCUMENTS ════════════════════════════
// Each must resolve to the right one OR not match. Never to the other one.
const COLLISIONS = [
  ['where are my lift prs', ['con.pr']],
  ['what is in stats records', ['con.statsrecords']],
  ['whats a program', ['con.programroutine']],
  ['whats a routine', ['con.programroutine']],
  ['how do i repeat yesterday', ['nav.repeatmeal']],
  ['how do i find a meal', ['nav.repeatmeal']],
  ['how many programs can i save', ['limit.programs']],
  ['how many routines can i save', ['limit.routines']],
  ['how do i create a recipe', ['nav.recipe']],
  ['how many recipes do i get', ['limit.recipes']],
  ['how do i make a custom food', ['nav.customfood']],
  ['how many custom foods can i have', ['limit.customfoods']],
  ['how do i add a meal slot', ['nav.mealslots']],
  ['how many meal slots can i have', ['limit.mealslots']],
  ['how do i add a graph', ['nav.statsgraph']],
  ['how many graphs do i get', ['limit.statsgraphs']],
  ['how do i log water', ['nav.logwater']],
  ['how do i edit a water entry', ['nav.editwater']],
  ['how do i log my weight', ['nav.logweight']],
  ['how do i delete an old weigh in', ['nav.weighthistory']],
  ['whats the sun icon for', ['con.sunstar', 'nav.versrotation']],
  ['whats the star icon for', ['con.sunstar', 'nav.favoriteverse']],
];
console.log('\n6. CORPUS B: collisions the KB documents');
let collWrong = 0;
for (const [msg, ok] of COLLISIONS) {
  const r = M(msg);
  if (r.matched && !ok.includes(r.matched.id)) { bad(`COLLISION "${msg}" -> ${r.matched.id} (acceptable: ${ok.join('/')})`); collWrong++; }
}
console.log(`   ${COLLISIONS.length - collWrong}/${COLLISIONS.length} resolved acceptably`);

// ═══ CORPUS C: MUST NEVER MATCH ══════════════════════════════════════════════
const MUST_NOT = [
  // coaching
  'how much protein should i be eating', 'whats a good chest workout', 'is white rice bad',
  'should i train fasted', 'how much sleep do i need', 'why am i so sore',
  'is creatine worth taking', 'how do i lose weight', 'whats a good breakfast',
  // their own data
  'hows my protein been this week', 'did i hit my calorie goal yesterday', 'how many custom foods do i have',
  'whats my longest streak', 'how did i sleep last night', 'how many recipes have i made',
  'am i on pace for my goal weight', 'what did i eat for lunch',
  // context dependent
  'and how do i edit it', 'what about water', 'ok so how do i do that', 'where is that',
  'how do i edit it', 'and the other one',
  // two parters with a coaching half
  'how do i log a recipe and whats a good protein target',
  'how do i change my theme and should i eat before bed',
  'whats the tip jar and how much protein do i need',
  // vague
  'help', 'i need help', 'what', 'idk',
];
console.log('\n7. CORPUS C: must NEVER match');
let leaked = 0;
for (const msg of MUST_NOT) {
  const r = M(msg);
  if (r.matched) { bad(`LEAK "${msg}" -> ${r.matched.id}`); leaked++; }
}
console.log(`   ${MUST_NOT.length - leaked}/${MUST_NOT.length} correctly declined`);

// ═══ CORPUS D: STITCHING ═════════════════════════════════════════════════════
const STITCH = [
  'how do i log food and how do i log water',
  'how do i change my theme and how do i change my text size',
];
console.log('\n8. CORPUS D: stitching two canned answers');
let stitchFail = 0;
for (const msg of STITCH) {
  const r = M(msg);
  if (r.reason !== 'stitched') { bad(`NOT STITCHED "${msg}" [${r.reason}]`); stitchFail++; }
}
console.log(`   ${STITCH.length - stitchFail}/${STITCH.length} stitched`);

// ═══ SUMMARY ═════════════════════════════════════════════════════════════════
console.log('\n' + '='.repeat(70));
console.log(`ANSWERS: ${CANNED_ANSWERS.length}`);
console.log(`🔴 WRONG ANSWERS (must be 0): ${wrong + collWrong + leaked}`);
console.log(`💰 misses (cost only): ${missed + stitchFail}`);
console.log(`assertion failures: ${dashHits + routeHits + pathFails + mindfulHits}`);
console.log('='.repeat(70) + '\n');
