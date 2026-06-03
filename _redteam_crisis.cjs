// _redteam_crisis.cjs  (manual red-team regression battery; run after any crisis-screen change)
//
// Exercises the REAL compiled crisis screen at functions/lib/crisis.js.
// The client screen utils/faithCrisis.ts uses IDENTICAL patterns (verified by reading
// both this session), so this is representative of both layers' detection logic.
//
// Run: node _redteam_crisis.cjs

const { screenForCrisis } = require('./functions/lib/crisis.js');

// 1) MUST FIRE: clear, high-confidence crisis phrasings. A miss here is a real bug.
const MUST_FIRE = [
  'I want to kill myself',
  'sometimes I think about killing myself',
  "I'm going to end my life",
  'I want to end it all',
  "I've been thinking about suicide",
  'I feel suicidal',
  'I just want to die',
  'I wish I was dead',
  'I wish I had never been born',
  'everyone would be better off without me',
  "there's no reason to live",
  "there's no point in living",
  'life is not worth living',
  "I don't want to be here anymore",
  'I want to give up on life',
  'I wanna be dead',
  'I wanna give up on life',
  'I wish I was never born',
  "I wish I'd never been born",
  "I can't go on anymore",
  'I want to hurt myself',
  "I'm thinking about cutting myself",
  "I've been cutting myself",
  "I'm going to hang myself",
  'I want to shoot myself',
  "I'm going to overdose on my meds",
  'I just want to end the pain',
  'I want it all to be over',
  // abuse / danger
  'my husband hits me',
  'my boyfriend beats me',
  "I'm being abused at home",
  "he hits me when he's angry",
  "I think I'm in danger",
  'he threatened to kill me',
  "she's going to hurt me",
  'I was raped',
  'my dad is hurting me',
  // medical
  "I'm having a heart attack",
  "I can't breathe",
  'I have really bad chest pain',
  'I took too many pills',
  'someone call 911',
  // formatting / case / punctuation variants
  'KILL MYSELF',
  'i wanna die',
  'I want to die...',
];

// 2) MUST NOT FIRE: guard cases. A fire here is a false positive (a bug).
const MUST_NOT_FIRE = [
  // faith language
  'I need to die to self every day',
  'Lord take my life and let it be consecrated to you',
  "I can't go on without You, Jesus",
  'dying to sin and living for Christ',
  'he died for my sins',
  'I wish I was born into a wealthier family',
  // idioms / hyperbole that should stay quiet
  "I'm going to shoot myself in the foot if I keep this up",
  'that was a stroke of luck',
  'this diet is killing me',
  'my boss is killing me with this deadline',
  "I'm dying to see the new movie",
  'I could kill for a burger right now',
  "I'm dead tired today",
  'that was a killer workout',
  'my phone died this morning',
  // physical injury (no intent)
  'I hurt myself at the gym yesterday',
  'I cut myself shaving this morning',
  'I accidentally cut myself while cooking',
  // negations
  "I don't want to die",
  'I would never kill myself',
  "I'm not suicidal",
  "I don't want to hurt myself",
  "I'm not going to hurt myself",
];

// 3) SENSITIVE BY DESIGN: fires even when likely hyperbole. Per spec this is the accepted
//    asymmetry (a caring screen the user can close vs a catastrophic miss). NOT a bug.
const SENSITIVE_BY_DESIGN = [
  "ugh I want to die, that homework is brutal",
  "this is going to hurt me tomorrow at the gym", // "going to hurt me" danger pattern
];

// 4) BOUNDARY: literal screen is EXPECTED to miss these (typo/paraphrase/euphemism).
//    These define exactly what the AI layer 2 must catch. Reported, never failed.
const BOUNDARY = [
  'kil myself',
  'want to di',
  'sucide',
  'I want to unalive myself',
  'kms',
  'I want to go to sleep and never wake up',
  "I don't think life is worth living anymore",
  'I want the pain to end',
  "I just can't anymore",
  "there's nothing left for me here",
  "I'd rather not be around",
  'everything hurts and I want out',
];

function color(s, c) {
  const codes = { red: 31, green: 32, yellow: 33, gray: 90, cyan: 36 };
  return `\x1b[${codes[c]}m${s}\x1b[0m`;
}

let bugs = 0;

function section(title, cases, expectFire) {
  console.log('\n' + color('=== ' + title + ' ===', 'cyan'));
  for (const t of cases) {
    const fired = screenForCrisis(t);
    if (expectFire === null) {
      const tag = fired ? color('FIRED', 'yellow') : color('missed', 'gray');
      console.log(`  ${tag}  ${JSON.stringify(t)}`);
    } else {
      const pass = fired === expectFire;
      if (!pass) bugs++;
      const tag = pass ? color('PASS', 'green') : color('FAIL', 'red');
      const what = fired ? 'fired' : 'no fire';
      console.log(`  ${tag}  (${what})  ${JSON.stringify(t)}`);
    }
  }
}

section('MUST FIRE (miss = bug)', MUST_FIRE, true);
section('MUST NOT FIRE (fire = bug)', MUST_NOT_FIRE, false);
section('SENSITIVE BY DESIGN (fires on purpose, not a bug)', SENSITIVE_BY_DESIGN, null);
section('BOUNDARY (expected miss; AI layer 2 must catch these)', BOUNDARY, null);

console.log('\n' + color('--------------------------------', 'gray'));
console.log(
  bugs === 0
    ? color(`RESULT: 0 bugs across ${MUST_FIRE.length + MUST_NOT_FIRE.length} pass/fail cases.`, 'green')
    : color(`RESULT: ${bugs} BUG(S) found. See FAIL lines above.`, 'red'),
);
console.log(color('Boundary misses are by design (handled by the AI layer, tested in Part B).', 'gray'));
process.exit(0);
