#!/usr/bin/env node
/**
 * PROJECT J -- COST / REVENUE MODEL.  Run: node scripts/cost-model.js
 *
 * 🔴 THIS FILE EXISTS BECAUSE THE LAST ONE DID NOT. The tables in SPEC_cost_model.md were produced by
 * `scratchpad/cost-model.js`, which no longer exists -- so the headline economics of the app sat in a
 * table nobody could reproduce, while the same spec told readers to re-run the missing script.
 * ⚠️ IT IS COMMITTED ON PURPOSE. If you change an assumption, change it HERE and re-run; do not hand-edit
 * numbers into a doc. Docs get a pointer to this file, never a copy of its output.
 *
 * ⚠️ NET IS DEFINED ONCE:  net = subscription revenue after Apple's cut  MINUS  all AI costs.
 *    Fixed costs (Apple's $99/yr developer program, Firebase) are DELIBERATELY EXCLUDED -- Justin's call,
 *    2026-08-05. Add them yourself if you want a true P&L.
 */

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS. Every one carries its provenance. MEASURED = read off `ai_cost`.
// ─────────────────────────────────────────────────────────────────────────────
const C = {
  // --- AI, per call -----------------------------------------------------------
  ottoCoach:    { v: 0.0032,  src: 'DERIVED 2026-08-05 from metered block sizes (PLAN 4.9). Not yet metered warm.' },
  ottoSupport:  { v: 0.0054,  src: 'DERIVED 2026-08-05, same basis.' },
  halo:         { v: 0.00067, src: 'MEASURED 2026-08-05, warm (PLAN 2.3).' },
  smartCoach:   { v: 0.00107, src: 'MEASURED 2026-08-05, warm (PLAN 1.1).' },
  estimator:    { v: 0.00953, src: 'MEASURED 2026-08-05, one real photo (PLAN 4.1).' },

  // --- Behaviour --------------------------------------------------------------
  // ⚠️ THE SINGLE SOFTEST NUMBER IN THIS FILE. `ai_cost` now counts routeCoach/routeSupport, so this
  // becomes MEASURED after a few days of real traffic. Until then it is a coin flip, stated as one.
  coachShare:   { v: 0.50, src: 'ASSUMED. Production counters (routeCoach/routeSupport) will replace this.' },
  haloShare:    { v: 0.20, src: 'ASSUMED -- share of companion messages going to Halo rather than Otto.' },
  coachTipsDay: { v: 2,    src: 'MEASURED behaviour: Home fires smart_tip + sleep per day (PLAN 1.3).' },
  estimatorMo:  { v: 2,    src: 'ASSUMED photos/month. Free cap is 5/month.' },
  supporterMult:{ v: 2,    src: 'ASSUMED. Supporters message ~2x a free user (higher caps, more engaged).' },

  // --- Money ------------------------------------------------------------------
  priceMonthly: { v: 9.99,  src: 'Real price (SPEC_monetization).' },
  priceAnnual:  { v: 89.99, src: 'Real price.' },
  appleCut:     { v: 0.15,  src: "Small Business Program. Justin's instruction: ALWAYS 15%, never 30%." },
  annualShare:  { v: 0.30,  src: 'ASSUMED share of Supporters choosing annual.' },
};
const v = (k) => C[k].v;

// ─────────────────────────────────────────────────────────────────────────────
const money = (n) => (n < 0 ? `-$${Math.abs(n).toFixed(0)}` : `+$${n.toFixed(0)}`);
const pad = (s, n) => String(s).padStart(n);

/** Blended cost of one Otto message, given how many need the manual. */
function ottoMsg() {
  return v('coachShare') * v('ottoCoach') + (1 - v('coachShare')) * v('ottoSupport');
}

/** AI cost per MONTH for one user sending `perDay` companion messages a day. */
function monthlyAiCost(perDay) {
  const msgs = perDay * 30;
  const otto = msgs * (1 - v('haloShare')) * ottoMsg();
  const halo = msgs * v('haloShare') * v('halo');
  const tips = v('coachTipsDay') * 30 * v('smartCoach');
  const est = v('estimatorMo') * v('estimator');
  return otto + halo + tips + est;
}

/** What one Supporter is worth, after Apple, over a lifetime of `months`. */
function revenuePerSupporter(months) {
  const keep = 1 - v('appleCut');
  const monthly = v('priceMonthly') * keep * months;
  const annual = v('priceAnnual') * keep * (months / 12);
  return (1 - v('annualShare')) * monthly + v('annualShare') * annual;
}

/** Year-one net for a given population. Free users cost 12 months; Supporters cost while subscribed. */
function net({ installs, conv, perDay, months, activeRate = 1 }) {
  const supporters = installs * conv;
  const free = installs - supporters;
  const freeCost = free * activeRate * monthlyAiCost(perDay) * 12;
  const supCost = supporters * activeRate * monthlyAiCost(perDay * v('supporterMult')) * Math.min(months, 12);
  return supporters * revenuePerSupporter(months) - freeCost - supCost;
}

/** Conversion rate at which net crosses zero. */
function breakEven({ perDay, months, activeRate = 1 }) {
  let lo = 0, hi = 1;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (net({ installs: 100000, conv: mid, perDay, months, activeRate }) < 0) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

// ─────────────────────────────────────────────────────────────────────────────
const SCENARIOS = [
  { name: 'Light  (1 msg/day)', perDay: 1 },
  { name: 'Typical(2 msg/day)', perDay: 2 },
  { name: 'Heavy  (5 msg/day)', perDay: 5 },
];
const LIFETIMES = [1, 3, 6, 12, 24];
const INSTALLS = [300, 1500, 4000, 8000, 25000, 50000];
const CONVS = [0.01, 0.02, 0.03, 0.05, 0.10];
const DEFAULT_MONTHS = 12;

console.log('\n' + '='.repeat(78));
console.log('PROJECT J -- COST / REVENUE MODEL   (run: node scripts/cost-model.js)');
console.log('='.repeat(78));
console.log('NET = subscription revenue after Apple\'s 15% cut MINUS all AI costs.');
console.log('Fixed costs (Apple $99/yr dev program, Firebase) are EXCLUDED by choice.');
console.log('Every install is charged a full year of AI. That is the PESSIMISTIC read;');
console.log('a 30%-active version is printed at the bottom.\n');

// ── 1. COSTS ────────────────────────────────────────────────────────────────
console.log('─'.repeat(78));
console.log('1. WHAT USERS COST');
console.log('─'.repeat(78));
console.log('                     free user      free user     Supporter     Supporter');
console.log('                       /month          /year        /month         /year');
for (const s of SCENARIOS) {
  const f = monthlyAiCost(s.perDay);
  const sup = monthlyAiCost(s.perDay * v('supporterMult'));
  console.log(`${s.name}  ${pad('$' + f.toFixed(3), 12)}  ${pad('$' + (f * 12).toFixed(2), 13)}  ${pad('$' + sup.toFixed(3), 12)}  ${pad('$' + (sup * 12).toFixed(2), 12)}`);
}

// ── 2. REVENUE ──────────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(78));
console.log('2. WHAT A SUPPORTER IS WORTH  (after Apple\'s 15%)');
console.log('─'.repeat(78));
console.log('  stays for      revenue');
for (const m of LIFETIMES) {
  console.log(`  ${pad(m + ' months', 9)}   ${pad('$' + revenuePerSupporter(m).toFixed(2), 10)}`);
}

// ── 3. BREAK-EVEN ───────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(78));
console.log('3. BREAK-EVEN CONVERSION, and NET/YEAR at 3% on 25,000 installs');
console.log('─'.repeat(78));
console.log('  stays for   |  1 msg/day        2 msg/day        5 msg/day');
console.log('              |  b/e    net@3%    b/e    net@3%    b/e    net@3%');
for (const m of LIFETIMES) {
  let row = `  ${pad(m + ' mo', 9)}   | `;
  for (const s of SCENARIOS) {
    const be = breakEven({ perDay: s.perDay, months: m });
    const n = net({ installs: 25000, conv: 0.03, perDay: s.perDay, months: m });
    row += `${pad((be * 100).toFixed(1) + '%', 5)}  ${pad(money(n), 8)}  `;
  }
  console.log(row);
}

// ── 4. NET GRIDS ────────────────────────────────────────────────────────────
for (const s of SCENARIOS) {
  console.log('\n' + '─'.repeat(78));
  console.log(`4. NET PER YEAR -- ${s.name}, Supporters staying ${DEFAULT_MONTHS} months`);
  console.log('─'.repeat(78));
  console.log('  installs |' + CONVS.map((c) => pad((c * 100) + '% conv', 11)).join(''));
  for (const i of INSTALLS) {
    let row = `  ${pad(i.toLocaleString(), 8)} |`;
    for (const c of CONVS) row += pad(money(net({ installs: i, conv: c, perDay: s.perDay, months: DEFAULT_MONTHS })), 11);
    console.log(row);
  }
}

// ── 5. SENSITIVITY ──────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(78));
console.log('5. IF ONLY 30% OF INSTALLS ARE ACTIVE  (net/yr, 25,000 installs, 12-month Supporters)');
console.log('─'.repeat(78));
console.log('             |  100% active     30% active');
for (const s of SCENARIOS) {
  const a = net({ installs: 25000, conv: 0.03, perDay: s.perDay, months: DEFAULT_MONTHS });
  const b = net({ installs: 25000, conv: 0.03, perDay: s.perDay, months: DEFAULT_MONTHS, activeRate: 0.3 });
  console.log(`${s.name} |  ${pad(money(a), 12)}   ${pad(money(b), 12)}`);
}

// ── 6. PROVENANCE ───────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(78));
console.log('6. EVERY NUMBER THIS MODEL USED');
console.log('─'.repeat(78));
for (const [k, o] of Object.entries(C)) console.log(`  ${pad(k, 14)} = ${pad(o.v, 8)}   ${o.src}`);
console.log('');
