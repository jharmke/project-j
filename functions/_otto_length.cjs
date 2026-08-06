// functions/_otto_length.cjs
//
// PLAN.md 4.7. Does Otto actually obey his own brevity rule?
//
// His rules block says, in plain and specific terms:
//   "Keep most replies to two to four sentences, ONE short paragraph, no exceptions by default...
//    if your draft answer is heading past four sentences or into a second paragraph, cut it down
//    before you respond rather than keeping every detail out of habit."
//
// ⚠️ THE HYPOTHESIS IS NOT THAT THE RULE IS BADLY WRITTEN. It is well written. The hypothesis is that it
// does not BIND, because it lives in the system prompt, and on this project a rule the model must ACT on
// has lost there four separate times (PLAN 4b, 4.9, the pitch, the exercise cap). Halo's length rule was in
// exactly the same place this morning, was being ignored, and collapsed the moment it rode on the user turn.
//
// ⚠️ AND THE RESULT MAY WELL BE "NOTHING TO DO". 4.6 read Otto's rules for cuttable content and found ~3%,
// which was not worth the risk. This may land the same way. That is a fine outcome; the point is to know.
//
// WHAT IT DOES. Sends real coaching questions through Otto's REAL prompt stack, twice each: once as the app
// sends it today, once with a length rider on the user turn. Prints both replies and both token counts.
//
// ⚠️ COACH ROUTE ONLY, deliberately. Since PLAN 4.9 a coaching message carries the ~4,400-token rules block
// and a ~390-token stand-in instead of the 22,000-token manual, so this is both the cheap path and the one
// where reply length is the dominant remaining cost.
//
// KEY HANDLING: environment only, never written to disk, never printed.
//   PowerShell:  $env:ANTHROPIC_API_KEY = "sk-ant-...."
//                node functions/_otto_length.cjs

const fs = require('fs');
const path = require('path');
const SDK = require('@anthropic-ai/sdk');
const Anthropic = SDK.default || SDK;
const P = require('./lib/companionSystemPrompt.js');
const { routeCoachOrSupport } = require('./lib/ottoCoachRouting.js');

const KEY = process.env.ANTHROPIC_API_KEY;
if (!KEY) {
  console.error('\nNo ANTHROPIC_API_KEY in the environment.');
  console.error('PowerShell:  $env:ANTHROPIC_API_KEY = "sk-ant-...."   then re-run.\n');
  process.exit(1);
}

const MODEL = 'claude-haiku-4-5';
const MAX_TOKENS = 800; // matches appCompanion.ts
const client = new Anthropic({ apiKey: KEY });

// A realistic Supporter context block. Kept constant so the only variable is the question and the rider.
const USER_CONTEXT = `Name: Justin
Goal: lose fat while keeping strength
Coaching mode: balanced
Faith journey: rooted
Units: imperial`;

// ⚠️ THE RIDER UNDER TEST. Deliberately SHORT: the point is to find out whether the mechanism moves length
// at all, not to write the final wording. If it works, the wording gets tuned afterwards against this same
// harness. Written in contractions so Otto does not mirror a stiff register (the lesson from Halo's draft 2).
// ⚠️ DRAFT 2. Draft 1 said only "two to four sentences, ONE paragraph" and MEASURED 170 -> 125 output
// tokens, 14/15 multi-paragraph -> 0/15. It worked. But on "whats a good chest workout" it cut the REST
// PERIODS and the session length while keeping the exercises, which is real information a lifter wants.
// 🔴 THAT WAS MY ERROR, NOT THE MECHANISM'S: Otto's own rule already carries the escape hatch ("Only go
// longer when the question has multiple distinct parts that genuinely need separate answers, and even then
// keep each part tight") and my rider dropped it. **I wrote a rider stricter than the rule it enforces.**
// ➡️ Draft 2 restores the exception and names the failure explicitly, because "distinct parts" did not
// read as covering sets/reps/rest to the model.
const LENGTH_RIDER = `[Reply guidance from the app, not from the person. Never mention it or refer to it.]
Two to four sentences, ONE paragraph. Lead with the answer, and cut whatever isn't the answer rather than keeping every detail out of habit.
Exception: when the answer IS a prescription, give the whole thing. A workout keeps its sets, reps AND rest periods; a plan keeps its steps. Keep each part tight, but never drop the specifics that make it usable. Padding is what you cut, not substance.`;

// Real coaching questions. No app nouns, so they route to Coach and never carry the manual.
const CASES = [
  'is white rice bad for me',
  'should i take a deload week',
  'how much protein do i actually need',
  'why am i so tired in the afternoons',
  'is it bad to eat late at night',
  'whats a good chest workout',
  'how do i stop snacking at night',
  'is cardio going to kill my gains',
  'my weight went up 3 pounds overnight, what gives',
  'how many rest days should i take',
  'is creatine worth taking',
  'why does my sleep score keep dropping',
  'should i be worried about sodium',
  'how long until i see results',
  'whats better for fat loss, lifting or cardio',
  // ⚠️ PRESCRIPTION CASES. These are what draft 1 damaged, so the exception has to hold here or the rider
  // is not shippable. Judge them on whether SETS, REPS AND REST survive, not on how short they are.
  'give me a beginner full body routine',
  'how should i structure my training week',
  'whats a good warm up before lifting',
];

function sentences(text) {
  return (text.match(/[^.!?]+[.!?]+/g) || [text]).filter((s) => s.trim().length > 2).length;
}
function paragraphs(text) {
  return text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).length;
}

async function ask(msg, withRider) {
  const route = routeCoachOrSupport(msg);
  const volatile = P.buildCompanionVolatileSplit(USER_CONTEXT, true, undefined, undefined, 'rooted');
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: [
      { type: 'text', text: P.buildCompanionRules() },
      { type: 'text', text: route.coachOnly ? P.COACH_NO_MANUAL_BLOCK : P.buildCompanionManual('') },
      { type: 'text', text: volatile.cached },
      ...(volatile.tail ? [{ type: 'text', text: volatile.tail }] : []),
    ],
    // 🔴 THE BASELINE MUST INCLUDE `REPLY_SHAPE_BLOCK`. Corrected 2026-08-06 after the first two runs were
    // INVALID: `appCompanion.ts` attaches it to the user turn on EVERY message (it is the one unconditional
    // entry in `suffix`), and it is already a full length rider -- "TWO TO FOUR SENTENCES, one short
    // paragraph, COUNT the sentences before you send". Omitting it measured Otto with his length rule
    // stripped out, which is why the baseline looked like 7.3 sentences and 18/18 multi-paragraph.
    // ➡️ So "as shipped" now means what actually ships, and the rider is tested as an ADDITION to it.
    messages: [{
      role: 'user',
      content: withRider
        ? `${msg}\n\n${P.REPLY_SHAPE_BLOCK}\n\n${LENGTH_RIDER}`
        : `${msg}\n\n${P.REPLY_SHAPE_BLOCK}`,
    }],
  });
  const text = (res.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
  return { text, out: res.usage?.output_tokens ?? 0, coachOnly: route.coachOnly };
}

(async () => {
  const lines = [];
  const say = (s) => { console.log(s); lines.push(s); };

  say('OTTO REPLY LENGTH -- PLAN 4.7');
  say(`model ${MODEL}   cases ${CASES.length}   A/B (as shipped, then with an EXTRA rider on top)`);
  say('🔴 BASELINE NOW INCLUDES REPLY_SHAPE_BLOCK, which the app already sends on every message.');
  say('   The first two runs omitted it and were INVALID. The real question is whether Otto already complies.');
  say('   His shape block demands: "TWO TO FOUR SENTENCES, one short paragraph. COUNT the sentences."');
  say(`   REPLY_SHAPE_BLOCK is ${P.REPLY_SHAPE_BLOCK.length} chars (~${Math.round(P.REPLY_SHAPE_BLOCK.length / 3.9)} tokens).`);
  say('='.repeat(100));

  let bOut = 0, aOut = 0, bSent = 0, aSent = 0, bMulti = 0, aMulti = 0, routedSupport = 0, n = 0;

  for (const msg of CASES) {
    let before, after;
    try {
      before = await ask(msg, false);
      after = await ask(msg, true);
    } catch (e) {
      say(`\n[${msg}] API ERROR: ${e && e.message}`);
      continue;
    }
    n++;
    if (!before.coachOnly) routedSupport++;
    bOut += before.out; aOut += after.out;
    bSent += sentences(before.text); aSent += sentences(after.text);
    if (paragraphs(before.text) > 1) bMulti++;
    if (paragraphs(after.text) > 1) aMulti++;

    say('\n' + '='.repeat(100));
    say(`USER: ${msg}      (route: ${before.coachOnly ? 'coach' : 'SUPPORT'})`);
    say('-'.repeat(100));
    say(`AS SHIPPED    output=${before.out} tok  sentences=${sentences(before.text)}  paragraphs=${paragraphs(before.text)}`);
    say(before.text);
    say('-'.repeat(100));
    say(`WITH RIDER    output=${after.out} tok  sentences=${sentences(after.text)}  paragraphs=${paragraphs(after.text)}`);
    say(after.text);
  }

  const usd = (t) => (t * 5) / 1e6; // Haiku output, $5/M
  say('\n' + '='.repeat(100));
  say('TOTALS');
  say(`messages measured: ${n}   (routed to SUPPORT unexpectedly: ${routedSupport})`);
  say(`avg output tokens:   as shipped ${(bOut / n).toFixed(0)}   with rider ${(aOut / n).toFixed(0)}`);
  say(`avg sentences:       as shipped ${(bSent / n).toFixed(1)}   with rider ${(aSent / n).toFixed(1)}`);
  say(`replies over 1 para: as shipped ${bMulti}/${n}   with rider ${aMulti}/${n}`);
  say(`avg output cost:     as shipped $${usd(bOut / n).toFixed(5)}   with rider $${usd(aOut / n).toFixed(5)}`);
  say('');
  say('⚠️ READ THE REPLIES, NOT JUST THE TOTALS. A shorter reply that drops the actual answer is not a win.');
  say('⚠️ The rider itself costs ~50 tokens of UNCACHED input (~$0.00005). Subtract it from any saving.');

  const out = path.join(__dirname, 'otto_length_results.txt');
  fs.writeFileSync(out, lines.join('\n'), 'utf8');
  say(`\nWritten to ${out}`);
})();
