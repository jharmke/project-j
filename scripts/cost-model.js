#!/usr/bin/env node
/**
 * PROJECT J -- COST / REVENUE MODEL.  Run: node scripts/cost-model.js
 *
 * 🔴 THIS FILE EXISTS BECAUSE THE LAST ONE DID NOT. The tables in SPEC_cost_model.md were produced by
 * `scratchpad/cost-model.js`, which no longer exists, so the app's headline economics sat in a table nobody
 * could reproduce while the same spec told readers to re-run the missing script.
 * ⚠️ IT IS COMMITTED ON PURPOSE. Change an assumption HERE and re-run. Never hand-edit numbers into a doc.
 *
 * ⚠️ NET IS DEFINED ONCE:  net = subscription revenue after Apple's 15% cut  MINUS  all AI costs.
 *    Fixed costs (Apple's $99/yr developer program, Firebase) are EXCLUDED. Justin's call, 2026-08-05.
 *
 * 🔴🔴 THE BUG THIS FILE WAS REWRITTEN TO KILL, 2026-08-05 evening. Justin spotted it from the output alone:
 * "+$50k? yeah...". The first version applied the ACTIVE RATE TO COSTS BUT NOT TO SUBSCRIBERS. At 25,000
 * installs and 30% active it charged AI for 7,500 people and still counted 750 subscribers, i.e. 3% of ALL
 * installs. If only 7,500 people use the app, 750 subscribers is 10% conversion, not 3%. It handed the
 * model a 70% discount on cost and none on revenue, turning a -$6,000 year into +$43,000.
 * ✅ **CONVERSION IS NOW A SHARE OF ACTIVES**, and the active rate applies to both sides.
 * ➡️ **AND THEN IT CANCELS OUT.** Break-even conversion is identical at any active rate, because the same
 * fraction of people generate the cost and the revenue. The old "30% active" row was never good news; it
 * was arithmetic error dressed up as good news. Do not re-add an active-rate sensitivity row.
 */

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS. Every one carries its provenance. MEASURED = read off `ai_cost`.
// ─────────────────────────────────────────────────────────────────────────────
const C = {
  ottoCoach:    { v: 0.0032,  src: 'DERIVED 2026-08-05 from metered block sizes (PLAN 4.9).' },
  ottoSupport:  { v: 0.0054,  src: 'DERIVED 2026-08-05, same basis.' },
  halo:         { v: 0.00097, src: 'MEASURED 2026-08-05 warm (0.00067, PLAN 2.3) PLUS the 2026-08-06 voice rider, which rides on the UNCACHED user turn at ~300 tokens (~$0.0003). ⚠️ The 0.00067 base is a SHORT reply; a realistic one is nearer $0.0011, so this line is optimistic.' },
  smartCoach:   { v: 0.00107, src: 'MEASURED 2026-08-05, warm (PLAN 1.1).' },
  estimator:    { v: 0.00717, src: 'MEASURED 2026-08-06 on device, same photo before and after the 1024px resize + dead-field removal (PLAN 4.1). Was 0.00953.' },

  coachShare:   { v: 0.50, src: 'ASSUMED. ai_cost now counts routeCoach/routeSupport; real traffic replaces this.' },
  haloShare:    { v: 0.20, src: 'ASSUMED share of companion messages going to Halo rather than Otto.' },
  coachTipsDay: { v: 2,    src: 'MEASURED behaviour: Home fires smart_tip + sleep per day (PLAN 1.3). ⚠️ These are the TWO DAILY surfaces only. The other six are in coachOtherYr.' },
  coachOtherYr: { v: 0.12, src: 'ASSUMED 2026-08-07. The SIX surfaces this model used to ignore entirely, per free user per year: recovery ~$0.077 (6 hub opens/mo), weekly ~$0.026, EvR card feed ~$0.018 (free users voice ONE card, PLAN 1.7), day summary ~$0.006, monthly ~$0.006. ⚠️ The EvR *tip* is $0: both report screens call refreshCoachTip("home") and share the home cache key, so it is the same call (VERIFIED 2026-08-07, refreshCoachTipEvr has no callers). ⚠️ Frequencies are ASSUMED; only the $0.00107 per-call price is MEASURED. Fixes the "counts 2 of 8 surfaces" gap flagged in PLAN 1.8.' },
  // 🔴 THE GATING DIAL. 0 = today (everyone gets AI-voiced coaching). 1 = AI voicing is Supporter-only and
  // free users read the deterministic copy from utils/smartTipsCopy.ts, which costs nothing.
  // ✅ FLIPPED TO 1 ON 2026-08-07, THE DAY IT SHIPPED. Free users now generate NO coach call on any of the
  // six surfaces (device-verified: 11 calls before the test, 11 after). This is the app's real behaviour.
  // ➡️ Run `gateCoachFree=0 node scripts/cost-model.js` to see the pre-gating world for comparison.
  gateCoachFree:{ v: 1,    src: 'BUILT + DEVICE-VERIFIED 2026-08-07 (PLAN 1.9). Free users generate no coach call.' },
  estimatorMo:  { v: 2,    src: 'ASSUMED photos/month. Free cap is 5/month.' },
  supporterMult:{ v: 2,    src: 'ASSUMED. Supporters message ~2x a free user.' },

  priceMonthly: { v: 9.99,  src: 'Real price (SPEC_monetization).' },
  priceAnnual:  { v: 89.99, src: 'Real price.' },
  appleCut:     { v: 0.15,  src: "Small Business Program. Justin's instruction: ALWAYS 15%." },
  annualShare:  { v: 0.30,  src: 'ASSUMED share of Supporters choosing annual.' },
  activeRate:   { v: 0.30,  src: 'ASSUMED share of installs still active. ⚠️ CANCELS OUT of break-even.' },
};
// ⚠️ ENV OVERRIDES, for scenario work without editing the committed assumptions.
// e.g.  coachTipsDay=1 estimator=0.0095 node scripts/cost-model.js
// ⚠️ The old example here used estimator=0.0068, which was the PREDICTED post-resize figure. The real
// measured number is 0.00717 and it is now the committed default, so that example was doubly misleading.
for (const k of Object.keys(C)) if (process.env[k] !== undefined) C[k] = { v: Number(process.env[k]), src: 'OVERRIDDEN via env for this run' };
const v = (k) => C[k].v;

const money = (n) => (n < 0 ? `-$${Math.round(Math.abs(n)).toLocaleString()}` : `+$${Math.round(n).toLocaleString()}`);
const pad = (s, n) => String(s).padStart(n);

/**
 * Cost of one Otto message.
 * ⚠️ `deflect` = share of ALL Otto messages answered by a CANNED answer (PLAN 4.8). Those cost ZERO: no API
 * call is made. Canned answers only ever replace SUPPORT-route traffic (app questions and pleasantries),
 * never coaching, so it comes out of that half.
 */
function ottoMsg(deflect) {
  const support = Math.max(0, (1 - v('coachShare')) - deflect);
  return v('coachShare') * v('ottoCoach') + support * v('ottoSupport');
}

/**
 * AI cost per MONTH for one ACTIVE user sending `perDay` companion messages a day.
 * ⚠️ `supporter` MATTERS ONLY FOR THE COACH TERM, and only when `gateCoachFree` is on. Companion volume is
 * handled by the caller passing a larger `perDay` (see `supporterMult`), not by this flag.
 */
function monthlyAiCost(perDay, deflect, supporter = false) {
  const msgs = perDay * 30;
  // 🔴 A GATED FREE USER GENERATES NO COACH CALL AT ALL. Not a cheaper one: the deterministic copy is a
  // local string lookup, so the whole term goes to zero. Same shape as the NO_DATA short-circuit (PLAN 1.2).
  const coachOn = supporter || v('gateCoachFree') !== 1;
  const coachMo = coachOn
    ? v('coachTipsDay') * 30 * v('smartCoach') + v('coachOtherYr') / 12
    : 0;
  return msgs * (1 - v('haloShare')) * ottoMsg(deflect)
    + msgs * v('haloShare') * v('halo')
    + coachMo
    + v('estimatorMo') * v('estimator');
}

/** What one Supporter is worth after Apple, over a lifetime of `months`. */
function revenuePerSupporter(months) {
  const keep = 1 - v('appleCut');
  return (1 - v('annualShare')) * v('priceMonthly') * keep * months
    + v('annualShare') * v('priceAnnual') * keep * (months / 12);
}

/**
 * Year-one net.
 * 🔴 `conv` IS A SHARE OF ACTIVE USERS, not of installs. See the header.
 */
function net({ installs, conv, perDay, months, deflect = 0, activeRate = v('activeRate') }) {
  const actives = installs * activeRate;
  const supporters = actives * conv;
  const freeActives = actives - supporters;
  const freeCost = freeActives * monthlyAiCost(perDay, deflect, false) * 12;
  const supCost = supporters * monthlyAiCost(perDay * v('supporterMult'), deflect, true) * Math.min(months, 12);
  return supporters * revenuePerSupporter(months) - freeCost - supCost;
}

/** Conversion (of actives) at which net crosses zero. Independent of install count and active rate. */
function breakEven({ perDay, months, deflect = 0 }) {
  let lo = 0, hi = 1;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (net({ installs: 100000, conv: mid, perDay, months, deflect }) < 0) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

// ─────────────────────────────────────────────────────────────────────────────
const SCENARIOS = [
  { name: 'Light (1 msg/day)', perDay: 1 },
  { name: 'Typical (2/day)', perDay: 2 },
  { name: 'Heavy (5/day)', perDay: 5 },
];
const LIFETIMES = [3, 6, 12, 24];
const INSTALLS = [1000, 5000, 10000, 25000, 50000, 100000];
const CONVS = [0.02, 0.03, 0.05, 0.08, 0.12];
const DEFLECTS = [0, 0.15, 0.30, 0.45];
const BASE_MONTHS = 12;

const line = (c = '─') => console.log(c.repeat(96));

console.log('\n' + '='.repeat(96));
console.log('PROJECT J -- COST / REVENUE MODEL');
console.log('='.repeat(96));
console.log(`NET = subscription revenue after Apple's 15% MINUS all AI costs. Fixed costs excluded.`);
console.log(`ACTIVE RATE ${(v('activeRate') * 100).toFixed(0)}% of installs. CONVERSION IS A SHARE OF ACTIVE USERS, not of installs.`);
console.log('Canned answers cost ZERO (no API call). "canned %" = share of ALL Otto messages answered by one.');
console.log('Measured coverage is ~30% of all messages (PLAN 4.8). Rows either side show the range.\n');

// ── 1. COSTS ────────────────────────────────────────────────────────────────
line(); console.log('1. WHAT ONE FREE ACTIVE USER COSTS PER YEAR'); line();
// ⚠️ THIS TABLE IS THE FREE USER, who is ~97% of actives at 3% conversion. A Supporter costs more
// (supporterMult on companion volume, and the coach term they always keep). Called out because the row
// label used to say "one active user" and got quoted as though it covered everybody.
if (v('gateCoachFree') === 1) console.log('  🔴 gateCoachFree=1: free users generate NO coach call. Supporters still do.');
console.log('                        canned 0%     canned 15%     canned 30%     canned 45%');
for (const s of SCENARIOS) {
  let row = pad(s.name, 20);
  for (const d of DEFLECTS) row += pad('$' + (monthlyAiCost(s.perDay, d, false) * 12).toFixed(2), 15);
  console.log(row);
}
console.log();
console.log('  and one SUPPORTER (2x companion volume, always keeps the coach):');
for (const s of SCENARIOS) {
  let row = pad(s.name, 20);
  for (const d of DEFLECTS) row += pad('$' + (monthlyAiCost(s.perDay * v('supporterMult'), d, true) * 12).toFixed(2), 15);
  console.log(row);
}

// ── 2. REVENUE ──────────────────────────────────────────────────────────────
console.log(); line(); console.log("2. WHAT ONE SUPPORTER IS WORTH (after Apple's 15%)"); line();
for (const m of LIFETIMES) console.log(`  stays ${pad(m + ' months', 10)}   ${pad('$' + revenuePerSupporter(m).toFixed(2), 9)}`);

// ── 3. BREAK-EVEN ───────────────────────────────────────────────────────────
console.log(); line(); console.log('3. BREAK-EVEN CONVERSION (share of ACTIVE users). 12-month Supporters.'); line();
console.log('                        canned 0%     canned 15%     canned 30%     canned 45%');
for (const s of SCENARIOS) {
  let row = pad(s.name, 20);
  for (const d of DEFLECTS) row += pad((breakEven({ perDay: s.perDay, months: BASE_MONTHS, deflect: d }) * 100).toFixed(2) + '%', 15);
  console.log(row);
}
console.log('\n  and by how long a Supporter stays (typical usage, canned 30%):');
for (const m of LIFETIMES) {
  console.log(`  stays ${pad(m + ' months', 10)}   break-even ${(breakEven({ perDay: 2, months: m, deflect: 0.30 }) * 100).toFixed(2)}%`);
}

// ── 4. NET GRIDS ────────────────────────────────────────────────────────────
for (const d of DEFLECTS) {
  console.log(); line();
  console.log(`4. NET PER YEAR -- typical usage (2 msgs/day), 12-month Supporters, CANNED ${(d * 100).toFixed(0)}%`);
  line();
  console.log('  installs   actives |' + CONVS.map((c) => pad((c * 100) + '% conv', 13)).join(''));
  for (const i of INSTALLS) {
    let row = `  ${pad(i.toLocaleString(), 8)}  ${pad(Math.round(i * v('activeRate')).toLocaleString(), 8)} |`;
    for (const c of CONVS) row += pad(money(net({ installs: i, conv: c, perDay: 2, months: BASE_MONTHS, deflect: d })), 13);
    console.log(row);
  }
}

// ── 5. USAGE SENSITIVITY AT THE MEASURED CANNED RATE ────────────────────────
console.log(); line();
console.log('5. NET PER YEAR at canned 30%, 12-month Supporters, 5% conversion of actives');
line();
console.log('  installs   actives |' + SCENARIOS.map((s) => pad(s.name, 20)).join(''));
for (const i of INSTALLS) {
  let row = `  ${pad(i.toLocaleString(), 8)}  ${pad(Math.round(i * v('activeRate')).toLocaleString(), 8)} |`;
  for (const s of SCENARIOS) row += pad(money(net({ installs: i, conv: 0.05, perDay: s.perDay, months: BASE_MONTHS, deflect: 0.30 })), 20);
  console.log(row);
}

// ═════════════════════════════════════════════════════════════════════════════
// SCENARIO MATRIX. Added 2026-08-07 at Justin's request: "a bunch of different scenarios ... most
// importantly tables should have net there as well."
// ⚠️ SEVEN THINGS MOVE NET and they cannot all be crossed without producing noise. Each table below holds
// everything fixed except TWO, names what it fixed, and always prints NET.
// ⚠️ Anything not being varied sits at the committed assumption in section 6. Change one there and every
// table moves together, which is the point of them living in one script.
// ═════════════════════════════════════════════════════════════════════════════

// ═════════════════════════════════════════════════════════════════════════════
// THE SCENARIO BOOK. Added 2026-08-07 at Justin's request, after a first attempt gave him ONE combined
// table and a lot of prose: "i want a bunch of tables and scenarios, not just one".
//
// EVERY table below is the SAME SHAPE ON PURPOSE: installs down the side, conversion across the top, NET in
// every cell. One dial changes per table, and the heading says which. That way any two tables can be read
// against each other by eye without re-reading the axes.
//
// ⚠️ CONVERSION STARTS AT 1%. Break-even sits near 2%, so a table starting at 2% hides the entire losing
// half of the range. The 1% column is there to show what below-water actually costs.
// ⚠️ EVERYTHING NOT NAMED IN A HEADING sits at the committed assumption in the constants block. Change one
// there and every table in the book moves together, which is the whole reason they live in one script.
// ═════════════════════════════════════════════════════════════════════════════

const BOOK_INSTALLS = [1000, 2500, 5000, 10000, 25000, 50000, 100000, 250000];
const BOOK_CONVS = [0.01, 0.02, 0.03, 0.05, 0.06, 0.08, 0.12];
const wide = (c = '─') => console.log(c.repeat(108));

/**
 * One table: installs x conversion, net in the cell.
 * `over` carries whatever this table is varying; anything absent falls back to the committed assumption.
 */
function netTable(title, note, over = {}) {
  console.log('');
  wide();
  console.log(title);
  if (note) console.log('  ' + note);
  wide();
  console.log('  installs   actives |' + BOOK_CONVS.map((c) => pad((c * 100).toFixed(0) + '%', 12)).join(''));
  const ar = over.activeRate ?? v('activeRate');
  for (const i of BOOK_INSTALLS) {
    let row = `  ${pad(i.toLocaleString(), 8)}  ${pad(Math.round(i * ar).toLocaleString(), 8)} |`;
    for (const c of BOOK_CONVS) {
      row += pad(money(net({
        installs: i,
        conv: c,
        perDay: over.perDay ?? 2,
        months: over.months ?? BASE_MONTHS,
        deflect: over.deflect ?? 0.30,
        activeRate: ar,
      })), 12);
    }
    console.log(row);
  }
}

console.log('\n');
wide('═');
console.log('THE SCENARIO BOOK -- every table is installs x conversion, and every cell is NET FOR YEAR ONE');
wide('═');
console.log('Unless a heading says otherwise: 30% of installs active, 12-month Supporters, 2 messages/day,');
console.log('canned answers catching 30%, coaching 50% of Otto traffic, $9.99 / $89.99, Apple keeping 15%.');

// ── A. USAGE ────────────────────────────────────────────────────────────────
console.log('\n');
wide('━');
console.log('A. HOW MUCH PEOPLE USE THE AI');
console.log('   The only lever here that a heavy user makes worse. Everything else in the book is upside.');
wide('━');
for (const p of [1, 2, 3, 5, 8]) {
  netTable(
    `A${[1, 2, 3, 5, 8].indexOf(p) + 1}. ${p} companion message${p === 1 ? '' : 's'} per day`,
    p >= 5 ? 'A Supporter sends 2x this, so the heavy rows are carrying real cost on the paying side too.' : '',
    { perDay: p },
  );
}

// ── B. SUPPORTER LIFETIME ───────────────────────────────────────────────────
console.log('\n');
wide('━');
console.log('B. HOW LONG A SUPPORTER STAYS');
console.log('   🔴 THE BIGGEST UNMEASURED NUMBER IN THE MODEL. Nobody has churn data yet (PLAN 7.3).');
console.log('   Revenue scales with it directly; cost does not fall when they leave, it just stops.');
wide('━');
for (const m of [3, 6, 9, 12, 18, 24]) {
  netTable(`B${[3, 6, 9, 12, 18, 24].indexOf(m) + 1}. Supporters stay ${m} months`, '', { months: m });
}

// ── C. ACTIVE RATE ──────────────────────────────────────────────────────────
console.log('\n');
wide('━');
console.log('C. HOW MANY INSTALLS STAY ACTIVE');
console.log('   ⚠️ This CANCELS OUT of break-even (it scales cost and revenue alike) and does NOT cancel');
console.log('   out of net. Below break-even a higher active rate loses MORE, not less.');
wide('━');
for (const ar of [0.10, 0.15, 0.20, 0.30, 0.40, 0.50]) {
  netTable(`C${[0.10, 0.15, 0.20, 0.30, 0.40, 0.50].indexOf(ar) + 1}. ${(ar * 100).toFixed(0)}% of installs still active`, '', { activeRate: ar });
}

// ── D. MESSAGE MIX ──────────────────────────────────────────────────────────
// ⚠️ MUTATES THE CONSTANT AROUND EACH TABLE because `ottoMsg` reads it through `v()`. Restored after.
// Contained and deliberate: threading a share argument through five functions for one section is worse.
console.log('\n');
wide('━');
console.log('D. WHAT PEOPLE ASK OTTO ABOUT');
console.log(`   A COACHING message costs ${v('ottoCoach').toFixed(4)}: no app manual is sent.`);
console.log(`   An APP question costs ${v('ottoSupport').toFixed(4)}: the 22k-token manual rides along.`);
console.log('   ⚠️ Canned answers only ever replace APP questions, so a high-coaching mix also has less');
console.log('   for them to deflect. The two dials are not independent.');
wide('━');
const savedShare = C.coachShare.v;
for (const mix of [0.2, 0.35, 0.5, 0.65, 0.8]) {
  C.coachShare.v = mix;
  netTable(
    `D${[0.2, 0.35, 0.5, 0.65, 0.8].indexOf(mix) + 1}. ${(mix * 100).toFixed(0)}% coaching / ${(100 - mix * 100).toFixed(0)}% app questions`,
    '',
    {},
  );
}
C.coachShare.v = savedShare;

// ── E. CANNED DEFLECTION ────────────────────────────────────────────────────
console.log('\n');
wide('━');
console.log('E. HOW OFTEN A CANNED ANSWER CATCHES THE MESSAGE');
console.log('   Measured coverage is ~30% of ALL Otto messages (PLAN 4.8, three corpora). A canned answer');
console.log('   costs zero: no API call is made at all.');
wide('━');
for (const d of [0, 0.15, 0.30, 0.45, 0.60]) {
  netTable(`E${[0, 0.15, 0.30, 0.45, 0.60].indexOf(d) + 1}. ${(d * 100).toFixed(0)}% of messages answered from the canned bank`, '', { deflect: d });
}

// ── F. COMBINED ─────────────────────────────────────────────────────────────
// 🔴 THE ONLY HONEST TABLE IN THE BOOK, and the reason is that every table above moves ONE dial while
// holding the rest at the committed assumption. Real outcomes do not arrive one dial at a time: the world
// where few people convert is usually also the world where they leave early and fewer stay active.
console.log('\n');
wide('━');
console.log('F. SEVERAL DIALS MOVING TOGETHER');
console.log('   Every table above moves one thing and holds the rest at plan. Reality does not do that.');
console.log('   These three move active rate, lifetime, usage and deflection together, and read conversion');
console.log('   off the top like every other table.');
wide('━');
const COMBOS = [
  { n: 'F1. CAUTIOUS', activeRate: 0.15, months: 6, perDay: 3, deflect: 0.15 },
  { n: 'F2. PLANNED ', activeRate: 0.30, months: 12, perDay: 2, deflect: 0.30 },
  { n: 'F3. STRONG  ', activeRate: 0.40, months: 18, perDay: 2, deflect: 0.45 },
];
for (const w of COMBOS) {
  netTable(
    `${w.n}`,
    `${(w.activeRate * 100).toFixed(0)}% active, ${w.months}-month Supporters, ${w.perDay} msgs/day, canned ${(w.deflect * 100).toFixed(0)}%`,
    w,
  );
}
console.log('');
console.log('  ⚠️ F1 IS NOT THE FLOOR. It still assumes people convert and that nobody churns in month one.');
console.log('     The true floor is zero conversion, where net is just the AI bill and every cell is red.');

// ── 6. PROVENANCE ───────────────────────────────────────────────────────────
console.log(); line(); console.log('6. EVERY NUMBER THIS MODEL USED'); line();
for (const [k, o] of Object.entries(C)) console.log(`  ${pad(k, 14)} = ${pad(o.v, 8)}   ${o.src}`);
console.log('');
