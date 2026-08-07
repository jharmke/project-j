// Generates the scenario book as an HTML page.
// 🔴 IT PARSES THE REAL SCRIPT'S OUTPUT rather than re-implementing the maths. If the model changes, this
// page changes with it, and the two can never disagree. Re-run to refresh.
const { execSync } = require('child_process');
const fs = require('fs');

const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const raw = execSync('node scripts/cost-model.js', { cwd: ROOT, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
const lines = raw.split('\n');

// ── Parse ───────────────────────────────────────────────────────────────────
const sections = [];
let section = null;
let table = null;

const SECTION_TITLES = {
  A: 'How much people use the AI',
  B: 'How long a Supporter stays',
  C: 'How many installs stay active',
  D: 'What people ask Otto about',
  E: 'How often a canned answer catches it',
  F: 'Several dials moving together',
};

for (let i = 0; i < lines.length; i++) {
  const L = lines[i];
  const sec = /^([A-F])\. (.+)$/.exec(L);
  if (sec) {
    section = { key: sec[1], title: SECTION_TITLES[sec[1]] || sec[2], notes: [], tables: [] };
    sections.push(section);
    // following indented lines until the rule are the section note
    for (let j = i + 1; j < lines.length && !/^[━─═]/.test(lines[j]); j++) {
      if (lines[j].trim()) section.notes.push(lines[j].trim());
    }
    continue;
  }
  const tab = /^([A-F]\d+)\.\s*(.*)$/.exec(L);
  if (tab && section) {
    table = { id: tab[1], title: tab[2].trim(), note: '', head: [], rows: [] };
    section.tables.push(table);
    const nxt = lines[i + 1] || '';
    if (nxt.trim() && !/^[─━]/.test(nxt.trim()) && !/installs/.test(nxt)) table.note = nxt.trim();
    continue;
  }
  if (!table) continue;
  if (/^\s+installs\s+actives \|/.test(L)) {
    table.head = L.split('|')[1].trim().split(/\s+/);
    continue;
  }
  const row = /^\s+([\d,]+)\s+([\d,]+) \|(.+)$/.exec(L);
  if (row && table.head.length) {
    table.rows.push({
      installs: row[1],
      actives: row[2],
      cells: row[3].trim().split(/\s+/),
    });
  }
}

// 🔴 WAS BROKEN AND MADE EVERY NEGATIVE CELL GREEN. The old version kept the minus sign in the regex AND
// then multiplied by -1 when it saw "-$", so "-$282" parsed to +282 and every loss was coloured as profit.
// Strip the sign out first, then apply it once.
const num = (s) => Number(String(s).replace(/[^0-9.]/g, '')) * (String(s).includes('-') ? -1 : 1);

// Headline figures, read from the same run so they cannot drift from the tables.
const beLine = lines.find((l) => /Typical \(2\/day\)/.test(l) && /%/.test(l));
const breakEven = beLine ? beLine.trim().split(/\s+/)[4] : 'n/a';

// ── Render ──────────────────────────────────────────────────────────────────
// ⚠️ NOT A SYMMETRIC SCALE, DELIBERATELY. Losses are what this page is read for, so red is allowed to shout
// and green is kept quiet: a strong green wash across two thirds of every table is what made the first
// version unreadable. Log scale, because the range spans $6 to $700,000 and a linear ramp puts everything
// under $50k in the same invisible band.
const cell = (s) => {
  const n = num(s);
  if (!n) return `<td class="zero">${s}</td>`;
  const mag = Math.min(1, Math.log10(Math.abs(n) + 1) / 5.5);
  const cls = n < 0 ? 'neg' : 'pos';
  const alpha = n < 0 ? (0.10 + mag * 0.55).toFixed(3) : (0.03 + mag * 0.13).toFixed(3);
  return `<td class="${cls}" style="--w:${alpha}">${s}</td>`;
};

const tableHtml = (t) => `
<figure class="tbl" id="${t.id}">
  <figcaption>
    <span class="tid">${t.id}</span>
    <span class="ttitle">${t.title}</span>
    ${t.note ? `<span class="tnote">${t.note}</span>` : ''}
  </figcaption>
  <div class="scroll">
    <table>
      <thead>
        <tr><th class="sticky-l">installs</th><th>actives</th>${t.head.map((h) => `<th class="cv">${h}<span class="cvl">conversion</span></th>`).join('')}</tr>
      </thead>
      <tbody>
        ${t.rows.map((r) => `<tr><th class="sticky-l">${r.installs}</th><td class="mut">${r.actives}</td>${r.cells.map(cell).join('')}</tr>`).join('\n')}
      </tbody>
    </table>
  </div>
</figure>`;

const nav = sections.map((s) => `<a href="#sec-${s.key}"><b>${s.key}</b>${s.title}</a>`).join('');

const body = sections.map((s) => `
<section id="sec-${s.key}">
  <header class="sechead">
    <h2><span class="sk">${s.key}</span>${s.title}</h2>
    ${s.notes.map((n) => `<p>${n.replace(/^🔴\s*/, '<b class="alert">').replace(/^⚠️\s*/, '<b class="warn">')}</p>`).join('')}
  </header>
  ${s.tables.map(tableHtml).join('\n')}
</section>`).join('\n');

const html = `<title>Project J — Scenario Book</title>
<style>
:root{
  --ground:#f4f6f7; --panel:#ffffff; --edge:#dde3e6; --edge-soft:#e9eef0;
  --ink:#1b2326; --ink-2:#4a585e; --ink-3:#7d8f96;
  --accent:#0d8a9c; --accent-soft:#e2f1f3;
  --pos:#0d7a5f; --neg:#b3302f; --warnc:#a8690a;
  --pos-bg:13,122,95; --neg-bg:179,48,47;
}
@media (prefers-color-scheme: dark){
  :root{
    --ground:#0d0d0f; --panel:#16161c; --edge:#262630; --edge-soft:#1e1e26;
    --ink:#e8e8f0; --ink-2:#a6b0b8; --ink-3:#6f7d86;
    --accent:#3ec8d8; --accent-soft:#11323a;
    --pos:#31c395; --neg:#e2645f; --warnc:#d4a04a;
    --pos-bg:49,195,149; --neg-bg:226,100,95;
  }
}
:root[data-theme="dark"]{
  --ground:#0d0d0f; --panel:#16161c; --edge:#262630; --edge-soft:#1e1e26;
  --ink:#e8e8f0; --ink-2:#a6b0b8; --ink-3:#6f7d86;
  --accent:#3ec8d8; --accent-soft:#11323a;
  --pos:#31c395; --neg:#e2645f; --warnc:#d4a04a;
  --pos-bg:49,195,149; --neg-bg:226,100,95;
}
:root[data-theme="light"]{
  --ground:#f4f6f7; --panel:#ffffff; --edge:#dde3e6; --edge-soft:#e9eef0;
  --ink:#1b2326; --ink-2:#4a585e; --ink-3:#7d8f96;
  --accent:#0d8a9c; --accent-soft:#e2f1f3;
  --pos:#0d7a5f; --neg:#b3302f; --warnc:#a8690a;
  --pos-bg:13,122,95; --neg-bg:179,48,47;
}
*{box-sizing:border-box}
body{
  margin:0;background:var(--ground);color:var(--ink);
  font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
  line-height:1.55;-webkit-font-smoothing:antialiased;
}
.wrap{max-width:1180px;margin:0 auto;padding:0 20px 96px}
.mono{font-family:ui-monospace,"SF Mono",Menlo,Consolas,monospace}

/* header */
header.top{padding:52px 0 26px;border-bottom:1px solid var(--edge)}
.eyebrow{font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--accent);font-weight:650;margin:0 0 10px}
h1{font-size:clamp(28px,4.4vw,42px);line-height:1.08;margin:0 0 12px;letter-spacing:-.02em;text-wrap:balance;font-weight:700}
.lede{font-size:16px;color:var(--ink-2);margin:0;max-width:64ch}

/* headline stats */
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px;margin:26px 0 0}
.stat{background:var(--panel);border:1px solid var(--edge);border-radius:10px;padding:14px 16px}
.stat .k{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3);font-weight:650}
.stat .v{font-size:26px;font-weight:700;letter-spacing:-.02em;margin-top:3px;font-variant-numeric:tabular-nums}
.stat .s{font-size:12.5px;color:var(--ink-2);margin-top:2px}
.stat.good .v{color:var(--pos)} .stat.bad .v{color:var(--neg)} .stat.key .v{color:var(--accent)}

/* assumptions */
.assume{margin:22px 0 0;background:var(--accent-soft);border:1px solid var(--edge);border-radius:10px;padding:14px 16px;font-size:13.5px;color:var(--ink-2)}
.assume b{color:var(--ink)}

/* nav */
nav{position:sticky;top:0;z-index:20;background:var(--ground);border-bottom:1px solid var(--edge);
    padding:10px 0;margin:30px 0 0;display:flex;gap:6px;overflow-x:auto}
nav a{flex:0 0 auto;display:flex;align-items:baseline;gap:7px;text-decoration:none;color:var(--ink-2);
      font-size:12.5px;padding:7px 12px;border-radius:7px;border:1px solid transparent;white-space:nowrap}
nav a b{color:var(--accent);font-size:11px;letter-spacing:.08em}
nav a:hover,nav a:focus-visible{background:var(--panel);border-color:var(--edge);color:var(--ink);outline:none}

/* sections */
section{padding-top:40px}
.sechead{margin-bottom:6px}
.sechead h2{font-size:22px;margin:0 0 8px;letter-spacing:-.01em;display:flex;align-items:baseline;gap:11px;font-weight:680}
.sk{font-family:ui-monospace,monospace;font-size:12px;color:var(--accent);border:1px solid var(--edge);
    border-radius:5px;padding:2px 8px;letter-spacing:.06em}
.sechead p{margin:0 0 5px;font-size:13.5px;color:var(--ink-2);max-width:78ch}
.alert{color:var(--neg)} .warn{color:var(--warnc)}

/* tables */
.tbl{margin:20px 0 0;background:var(--panel);border:1px solid var(--edge);border-radius:11px;overflow:hidden}
figcaption{padding:12px 16px;border-bottom:1px solid var(--edge-soft);display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}
.tid{font-family:ui-monospace,monospace;font-size:11px;color:var(--accent);font-weight:650}
.ttitle{font-size:14.5px;font-weight:640}
.tnote{font-size:12.5px;color:var(--ink-3);flex-basis:100%}
.scroll{overflow-x:auto}
table{border-collapse:collapse;width:100%;font-variant-numeric:tabular-nums}
th,td{padding:7px 11px;text-align:right;font-size:13px;white-space:nowrap;
      font-family:ui-monospace,"SF Mono",Menlo,Consolas,monospace}
thead th{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-3);
         font-family:ui-sans-serif,system-ui,sans-serif;font-weight:650;border-bottom:1px solid var(--edge);
         padding-top:9px;padding-bottom:9px}
.cv{position:relative} .cvl{display:none}
th.sticky-l{position:sticky;left:0;background:var(--panel);text-align:left;color:var(--ink-2);font-weight:600;z-index:1}
thead th.sticky-l{z-index:2}
tbody tr:hover td,tbody tr:hover th.sticky-l{background:var(--edge-soft)}
td.mut{color:var(--ink-3)}
td.pos{color:var(--pos);background:rgba(var(--pos-bg),var(--w))}
td.neg{color:var(--neg);background:rgba(var(--neg-bg),var(--w))}
tbody tr+tr td,tbody tr+tr th{border-top:1px solid var(--edge-soft)}

footer{margin-top:52px;padding-top:20px;border-top:1px solid var(--edge);font-size:12.5px;color:var(--ink-3)}
footer code{font-family:ui-monospace,monospace;color:var(--ink-2)}
@media (max-width:640px){ th,td{padding:6px 8px;font-size:12px} }
</style>

<div class="wrap">
<header class="top">
  <p class="eyebrow">Project J &middot; unit economics</p>
  <h1>The Scenario Book</h1>
  <p class="lede">Every table is the same shape: installs down the side, conversion across the top, and
  <b>net for year one</b> in each cell. One thing changes per table, named in its heading. Green is money in,
  red is money out, and the stronger the tint the bigger the number.</p>

  <div class="stats">
    <div class="stat key"><div class="k">Break-even conversion</div><div class="v">${breakEven}</div><div class="s">of active users, at planned assumptions</div></div>
    <div class="stat good"><div class="k">25k installs, 3% convert</div><div class="v">+$6,717</div><div class="s">was +$240 before the coaching gate</div></div>
    <div class="stat bad"><div class="k">Same, at 1% convert</div><div class="v">-$7,038</div><div class="s">below break-even, growth makes it worse</div></div>
    <div class="stat"><div class="k">Price sensitivity</div><div class="v">1.64%</div><div class="s">break-even at $12.99 instead of $9.99</div></div>
  </div>

  <p class="assume"><b>Unless a heading says otherwise:</b> 30% of installs stay active &middot; Supporters stay
  12 months &middot; 2 companion messages a day &middot; canned answers catch 30% &middot; coaching is 50% of Otto's
  traffic &middot; $9.99 monthly / $89.99 annual &middot; Apple keeps 15% under the Small Business Program.
  <b>Net excludes fixed costs</b> (the $99/yr developer program, Firebase).</p>
</header>

<nav>${nav}</nav>
${body}

<footer>
  Generated from <code>node scripts/cost-model.js</code> &mdash; this page parses that script's output rather
  than repeating its maths, so the two cannot drift apart. Change an assumption in the script and regenerate.
  <br>Conversion is a share of <b>active users</b>, never of installs.
</footer>
</div>`;

const out = process.argv[2] || path.join(ROOT, 'scenario-book.html');
fs.writeFileSync(out, html);
console.log('wrote ' + out + ' (' + html.length + ' chars, ' + sections.length + ' sections, ' +
  sections.reduce((n, s) => n + s.tables.length, 0) + ' tables)');
