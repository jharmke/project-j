import AsyncStorage from '@react-native-async-storage/async-storage';
import { storageSet } from './storage';
import { offsetToDateKey } from './statsData';
import { calcSleepScore } from './sleepScore';
import { loadCalorieTargets } from './calorieTarget';
import { computeEvrRecoveryFindings, EvrRecoveryFinding } from './smartTipsEngine';

// ── Types ──────────────────────────────────────────────────────────────────────

export type ReportWindow = 14 | 30 | 90;
export type FindingStatus = 'good' | 'attention' | 'factor';
export type GoalDirection = 'lose' | 'gain' | 'maintain';

export interface DeficitFinding {
  type: 'deficit';
  expectedChangeLbs: number;
  actualChangeLbs: number | null;
  gapLbs: number | null;
  goalDirection: GoalDirection;
  avgDailyDeficit: number;
  loggedDays: number;
  status: FindingStatus;
  hasWeightData: boolean;
}

export interface BurnAccuracyFinding {
  type: 'burnAccuracy';
  burnAccuracyPct: number;
  avgActiveCalPerDay: number;
  isFlagged: boolean;
  status: FindingStatus;
}

export interface ConsistencyFinding {
  type: 'consistency';
  loggedDays: number;
  totalDays: number;
  rate: number;
  suspectDays: number;
  excludedDays: number;
  status: FindingStatus;
}

export interface MacroFinding {
  type: 'macros';
  avgProtein: number;
  proteinGoalMin: number;
  proteinGoalMax: number;
  avgFiber: number;
  fiberStatus: FindingStatus;
  macroStatus: FindingStatus;
  status: FindingStatus;
  hasData: boolean;
  bodyWeightLbs: number;
  lowFiberNote: boolean;
  // Trend-aware (change #2): recent 7d vs 30d baseline, so a card can lead with a recent
  // change ("dropped this week") instead of a single flat average. Absent when there isn't
  // enough data in both windows to be real.
  proteinTrend?: {
    recentAvg: number; recentN: number;
    baselineAvg: number; baselineN: number;
    diverges: boolean; direction: 'up' | 'down'; pctDelta: number;
  };
}

export interface SleepFinding {
  type: 'sleep';
  avgSleepScore: number | null;
  avgSleepHours: number;
  totalSleepDays: number;
  poorSleepCalDelta: number | null;
  status: FindingStatus;
  hasEnoughData: boolean;
}

export interface Correlation {
  id: string;
  headline: string;
  detail: string;
  // Diagnostic-card fields (additive). Populated where the correlation is computed
  // so the one number that proves the claim travels with it. buildDiagnosticCards
  // turns any correlation carrying these into a ranked DiagnosticCard.
  claim?: string;
  proof?: string;
  lever?: string;
  strength?: number;      // 0-100, effect size relative to the pattern's floor
  positive?: boolean;     // true = a "why it's working" story
  windowLabel?: string;   // overrides the default "Last N days"
  metric?: DiagnosticCard['metric']; // optional structured proof (e.g. a frequency dot row)
}

export interface CorrelationsFinding {
  type: 'correlations';
  correlations: Correlation[];
}

// Unified diagnostic card: claim + pointed proof + lever. Everything the EvR feed
// renders is one of these, ranked by strength. Findings and correlations both
// collapse into this single shape so the surface just renders a sorted list.
export interface DiagnosticCard {
  id: string;
  claim: string;
  proof: string;
  lever: string;
  window: string;
  strength: number;       // 0-100
  tone: 'positive' | 'attention' | 'factor';
  positive: boolean;
  insight?: string;       // AI-voiced "why it matters" sentence; absent on deterministic fallback
  // Optional structured proof so the surface can render a stat module (big numbers + bar)
  // instead of a line of text. When absent, the surface falls back to the `proof` string.
  metric?: {
    // Bar shape (default 'target'):
    //  target  -> value vs goal, higher-better, "short"/"over" delta pill (protein, logging)
    //  score   -> single 0-100 number, NO delta, second number is a caption (sleep, recovery mean)
    //  range   -> value vs a [min,max] band, "in range" when inside, short/over only when outside (fiber)
    //  compare -> two bars A vs B, no goal/delta (deficit predicted-vs-actual, recovery easy-vs-hard)
    kind?: 'target' | 'score' | 'range' | 'compare' | 'goalbar' | 'dots';
    value: number;          // current value (compare: the A / first bar)
    target: number;         // target: goal | score: bar max (100) | range: bar max | compare: the B / second bar
    unit?: string;          // 'g', '%', 'lb', etc.
    primaryLabel: string;   // label under `value`  (compare: A label)
    secondaryLabel: string; // label under `target` (compare: B label; score: unused)
    caption?: string;       // score: small line replacing the second number (e.g. "OVER 14 NIGHTS")
    rangeMin?: number;      // range: low edge of the healthy band
    rangeMax?: number;      // range: high edge of the healthy band
  };
}

export interface Suggestion {
  rank: number;
  headline: string;
  detail: string;
}

export interface DiagnosticReport {
  id: string;
  generatedAt: string;
  windowDays: ReportWindow;
  dateRangeStart: string;
  dateRangeEnd: string;
  goalDirection: GoalDirection;
  summary: string;
  deficit: DeficitFinding | null;
  burnAccuracy: BurnAccuracyFinding | null;
  consistency: ConsistencyFinding;
  macros: MacroFinding | null;
  sleep: SleepFinding | null;
  correlations: CorrelationsFinding | null;
  suggestions: Suggestion[];
  cards: DiagnosticCard[];
  insufficientData: boolean;
  minLoggedDays: number;
  // Read-only dev diagnostic (Dump EvR Cards): the snowball-card fire math. Optional/transient.
  momentumDebug?: { overDays: number; ranHigh: number; ratio: number | null; overage: number | null; fired: boolean } | null;
}

// ── Threshold ──────────────────────────────────────────────────────────────────

export function minDaysForWindow(windowDays: ReportWindow): number {
  if (windowDays === 14) return 7;
  if (windowDays === 30) return 15;
  return 60; // 90 days
}

// ── Storage ────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'pj_diagnostic_reports';

export async function loadSavedReports(): Promise<DiagnosticReport[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as DiagnosticReport[];
  } catch {
    return [];
  }
}

export async function saveReport(report: DiagnosticReport): Promise<void> {
  try {
    const existing = await loadSavedReports();
    const todayDate = new Date().toISOString().slice(0, 10);
    // Replace any same-day same-window report instead of stacking a duplicate
    const filtered = existing.filter(r =>
      r.id !== report.id &&
      !(r.windowDays === report.windowDays && r.generatedAt.slice(0, 10) === todayDate)
    );
    const updated = [report, ...filtered].slice(0, 15);
    await storageSet(STORAGE_KEY, JSON.stringify(updated));
  } catch {}
}

export async function deleteReport(id: string): Promise<void> {
  try {
    const existing = await loadSavedReports();
    const updated = existing.filter(r => r.id !== id);
    await storageSet(STORAGE_KEY, JSON.stringify(updated));
  } catch {}
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getEntryNutrient(entries: any[], nutrientName: string): number {
  return Math.round(entries.reduce((s: number, e: any) => {
    const n = e.foodNutrients?.find((fn: any) => fn.nutrientName === nutrientName);
    if (!n) return s;
    let scale: number;
    if (e.fsId) {
      scale = (e.calPer100g && e.calPer100g > 0) ? (e.cal / e.calPer100g) : 0;
    } else {
      const sg = e.servingGrams;
      const servingCal = sg && e.calPer100g > 0 ? e.calPer100g * sg / 100 : 0;
      scale = servingCal > 0 ? e.cal / servingCal : 0;
    }
    return s + (n.value || 0) * scale;
  }, 0) * 10) / 10;
}

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function isWeekend(dateKey: string): boolean {
  const [y, m, d] = dateKey.split('-').map(Number);
  const day = new Date(y, m - 1, d).getDay();
  return day === 0 || day === 6;
}

// ── Diagnostic card model ────────────────────────────────────────────────────────

function clampStrength(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

// Effect size relative to a pattern's floor, mapped to a comparable 0-100 strength.
// At the floor (ratio 1) a card scores `base`; at 2x the floor it reaches base+span.
function corrStrength(effect: number, floor: number, base = 50, span = 42): number {
  const ratio = floor > 0 ? Math.abs(effect) / floor : 1;
  return clampStrength(base + Math.min(span, (ratio - 1) * span));
}

function fmtLbs1(v: number): string {
  return `${(Math.round(Math.abs(v) * 10) / 10).toFixed(1)} lbs`;
}

// Turns the computed findings + correlations into one ranked, relevant-only feed of
// claim + proof + lever cards. A finding only becomes a card when it has a genuine
// current pattern; correlations carry their own floors. Positives count as cards so
// the feed is rarely empty. Sort: strength desc, corrective above positive on a tie.
// Capped at 6. The headline-dedupe (suppressing the card matching the EvR headline)
// happens at the view layer, since the headline is resolved there.
function buildDiagnosticCards(
  windows: { weight: number; weightSpanDays?: number | null; protein: number; fiber: number; sleep: number; consistency: number },
  deficitFinding: DeficitFinding | null,
  burnAccuracyFinding: BurnAccuracyFinding | null,
  macroFinding: MacroFinding | null,
  sleepFinding: SleepFinding | null,
  consistency: ConsistencyFinding,
  correlations: Correlation[],
  recoveryFindings: EvrRecoveryFinding[],
): DiagnosticCard[] {
  const cards: DiagnosticCard[] = [];
  // Per-pattern window labels -- each card states its OWN lookback in its proof.
  const winWeight = `Over ${windows.weightSpanDays ?? windows.weight} days`;
  const winProtein = `Over ${windows.protein} days`;
  const winFiber = `Over ${windows.fiber} days`;
  const winSleep = `Over ${windows.sleep} days`;
  const winConsistency = `Over ${windows.consistency} days`;

  // ── Deficit: predicted vs actual results ──
  // Tracks whether results are LAGGING the logged deficit; the burn-accuracy card gates
  // on this (decision 2026-06-16) so it only fires when it actually explains a mismatch.
  let deficitLagging = false;
  if (deficitFinding && deficitFinding.hasWeightData && deficitFinding.actualChangeLbs !== null) {
    const gap = deficitFinding.gapLbs ?? 0;
    const lose = deficitFinding.goalDirection === 'lose';
    const expDir = lose ? 'lost' : 'gained';
    const actDir = deficitFinding.actualChangeLbs <= 0 ? 'lost' : 'gained';
    const proof = `Predicted: ${expDir} ${fmtLbs1(deficitFinding.expectedChangeLbs)} · Actual: ${actDir} ${fmtLbs1(deficitFinding.actualChangeLbs)}`;
    // A-vs-B comparison bar: predicted change vs what the scale actually did (magnitudes;
    // direction lives in the claim/proof). Shape 4.
    const deficitMetric = {
      kind: 'goalbar' as const,
      value: Math.round(Math.abs(deficitFinding.expectedChangeLbs) * 10) / 10,
      target: Math.round(Math.abs(deficitFinding.actualChangeLbs) * 10) / 10,
      unit: 'lb', primaryLabel: 'PREDICTED', secondaryLabel: 'ACTUAL',
    };
    const onTrack = lose ? gap <= 0.3 : gap >= -0.3;
    if (onTrack) {
      cards.push({
        id: 'deficit', claim: `Your effort is showing up on the scale.`, proof,
        lever: `Whatever you are doing is working. Hold the pattern.`,
        window: winWeight, strength: clampStrength(48), tone: 'positive', positive: true,
        metric: deficitMetric,
      });
    } else {
      const fellShort = lose ? gap > 0 : gap < 0;
      deficitLagging = fellShort;
      cards.push({
        id: 'deficit',
        claim: fellShort ? `Your results are lagging what your logging predicts.` : `You are moving faster than your logging predicts.`,
        proof,
        lever: fellShort
          ? `The gap usually hides in unlogged days or an overstated calorie burn. Tighten one.`
          : `Strong pace. Make sure you are fueling enough to hold onto muscle.`,
        window: winWeight,
        strength: clampStrength(45 + Math.min(50, Math.abs(gap) * 28)),
        tone: Math.abs(gap) > 1.0 ? 'factor' : 'attention',
        positive: false,
        metric: deficitMetric,
      });
    }
  }

  // ── Burn accuracy ── (decision 2026-06-16: only when it is EXPLAINING a deficit-vs-
  // results mismatch, i.e. results lagging; never a standalone readout)
  if (burnAccuracyFinding && burnAccuracyFinding.isFlagged && deficitLagging) {
    const gapBump = deficitFinding?.gapLbs != null && deficitFinding.gapLbs > 0.5 ? 15 : 0;
    cards.push({
      id: 'burn_accuracy',
      claim: `Your calorie burn may be overstated.`,
      proof: `Burn accuracy at 100% · avg ${burnAccuracyFinding.avgActiveCalPerDay.toLocaleString()} active cal/day`,
      lever: `Set burn accuracy to 80 to 90% in Settings, Health for truer deficit math.`,
      window: winWeight, strength: clampStrength(50 + gapBump), tone: 'attention', positive: false,
    });
  }

  // ── Protein (trend-aware -- change #2 prototype) ──
  // When the recent 7d read diverges from the 30d baseline the card LEADS with that story
  // (a recent drop, or a climb) instead of one flat 14d average; when the windows agree it
  // falls back to the original status-vs-goal read. Every branch labels its real window and
  // uses honest numbers (recent 7d vs 30d baseline, each backed by a real day count). This
  // block emits exactly ONE protein card (replaces the old separate corrective + positive).
  if (macroFinding && macroFinding.hasData) {
    const goal = macroFinding.proteinGoalMin;
    const t = macroFinding.proteinTrend;
    const trendWin = `Last 7 days vs your last 30`;
    const recentBar = (val: number): DiagnosticCard['metric'] => ({ value: val, target: goal, unit: 'g', primaryLabel: 'LAST 7d', secondaryLabel: 'GOAL' });
    if (t && t.diverges && t.direction === 'down') {
      // Recent drop -- worth flagging even if the 14d average still looks fine.
      cards.push({
        id: 'protein',
        claim: `Your protein dropped off this week.`,
        proof: `Last 7 days: ${t.recentAvg} g/day, down from your ${t.baselineAvg} g/day norm`,
        lever: `Anchor one meal a day around a protein source to pull it back up.`,
        window: trendWin, strength: clampStrength(48 + Math.min(30, Math.abs(t.pctDelta))),
        tone: t.recentAvg < goal * 0.7 ? 'factor' : 'attention', positive: false,
        metric: recentBar(t.recentAvg),
      });
    } else if (t && t.diverges && t.direction === 'up') {
      // Recent climb. Still short of goal = encouraging-but-not-done; at goal = clean positive.
      const stillUnder = t.recentAvg < goal * 0.95;
      cards.push({
        id: stillUnder ? 'protein' : 'protein_good',
        claim: stillUnder ? `Your protein is climbing, not there yet.` : `Your protein is trending up.`,
        proof: stillUnder
          ? `Last 7 days: ${t.recentAvg} g/day, up from ${t.baselineAvg} · goal ${goal} g`
          : `Last 7 days: ${t.recentAvg} g/day, up from your ${t.baselineAvg} g/day norm`,
        lever: stillUnder
          ? `Keep the momentum: one more protein-anchored meal closes the gap to ${goal} g.`
          : `Whatever you changed this week, keep it on the plate.`,
        window: trendWin, strength: clampStrength(stillUnder ? 44 : 46),
        tone: stillUnder ? 'attention' : 'positive', positive: !stillUnder,
        metric: recentBar(t.recentAvg),
      });
    } else if (macroFinding.macroStatus !== 'good') {
      // Windows agree, under target: the original status-vs-goal read (14d average).
      const pctUnder = (goal - macroFinding.avgProtein) / Math.max(1, goal);
      cards.push({
        id: 'protein',
        claim: `Your protein is running under target.`,
        proof: `Avg ${macroFinding.avgProtein} g/day · goal ${goal} g`,
        lever: `Anchor one meal a day around a protein source to close the gap.`,
        window: winProtein, strength: clampStrength(42 + Math.min(50, pctUnder * 130)),
        tone: macroFinding.macroStatus === 'factor' ? 'factor' : 'attention', positive: false,
        metric: { value: macroFinding.avgProtein, target: goal, unit: 'g', primaryLabel: 'AVG/DAY', secondaryLabel: 'GOAL' },
      });
    } else {
      // Windows agree, on target: positive (the old protein_good card).
      cards.push({
        id: 'protein_good',
        claim: `Your protein is right where it needs to be.`,
        proof: `Avg ${macroFinding.avgProtein} g/day · goal ${goal} g`,
        lever: `Hold this. Protein is protecting your muscle while you cut.`,
        window: winProtein, strength: clampStrength(50), tone: 'positive', positive: true,
        metric: { kind: 'target', value: macroFinding.avgProtein, target: goal, unit: 'g', primaryLabel: 'AVG/DAY', secondaryLabel: 'GOAL' },
      });
    }
  }

  // ── Fiber (food quality) ──
  if (macroFinding && macroFinding.fiberStatus !== 'good' && macroFinding.avgFiber > 0) {
    const pctUnder = (25 - macroFinding.avgFiber) / 25;
    cards.push({
      id: 'fiber',
      claim: `Food quality has room: fiber is low.`,
      proof: `Avg ${macroFinding.avgFiber} g/day · target 25 to 38 g`,
      lever: `Lean on whole foods: fruit, vegetables, beans, whole grains.`,
      window: winFiber, strength: clampStrength(34 + Math.min(40, pctUnder * 70)),
      tone: macroFinding.fiberStatus === 'factor' ? 'factor' : 'attention', positive: false,
      metric: { kind: 'range', value: macroFinding.avgFiber, target: 38, rangeMin: 25, rangeMax: 38, unit: 'g', primaryLabel: 'AVG/DAY', secondaryLabel: '25 TO 38' },
    });
  }

  // ── Positive whys: genuinely-good findings get a "here's what's working and why"
  // card too. Lower strength band so any real problem outranks them, but on a good
  // week these fill the feed instead of a hollow "you're good." This is the
  // never-blank, explain-the-good-stuff behavior the spec demands. ──

  // Deficit holding (results agree with effort) handled above as a positive deficit card.

  // Consistency: matters most when there are GAPS (they blur everything below). A clean
  // log is reassuring but a low-value lead, so it sits in a low band and never leads.
  // Gappy logging ranks up because it undermines the whole read.
  if (consistency.status === 'good' && consistency.loggedDays > 0) {
    cards.push({
      id: 'consistency_good',
      claim: `Your logging is consistent enough to trust this read.`,
      proof: `${consistency.loggedDays} of ${consistency.totalDays} days logged`,
      lever: `Keep it up. The more you log, the sharper every pattern here gets.`,
      window: winConsistency,
      // Lowest-strength positive by decision (2026-06-16): a clean log is reassuring but a
      // low-value lead, so it sits under every other positive and the positives cap drops it
      // first. Back-pat positives must always score below result-explaining ones.
      strength: clampStrength(10 + Math.min(6, (consistency.rate - 0.85) * 40)),
      tone: 'positive', positive: true,
      metric: { kind: 'target', value: consistency.loggedDays, target: consistency.totalDays, unit: '', primaryLabel: 'LOGGED', secondaryLabel: 'DAYS' },
    });
  } else if (consistency.status !== 'good' && consistency.loggedDays > 0) {
    cards.push({
      id: 'consistency_gaps',
      claim: `Gaps in your logging are blurring the picture.`,
      proof: `${consistency.loggedDays} of ${consistency.totalDays} days logged`,
      lever: `Even a rough entry on the days you miss keeps this read honest.`,
      window: winConsistency,
      strength: clampStrength(consistency.status === 'factor' ? 52 : 38),
      tone: consistency.status === 'factor' ? 'factor' : 'attention',
      positive: false,
      metric: { kind: 'target', value: consistency.loggedDays, target: consistency.totalDays, unit: '', primaryLabel: 'LOGGED', secondaryLabel: 'DAYS' },
    });
  }

  // (Protein "on point" is now handled in the consolidated trend-aware protein block above.)

  // Fiber / food quality on point
  if (macroFinding && macroFinding.fiberStatus === 'good' && macroFinding.avgFiber > 0) {
    cards.push({
      id: 'fiber_good',
      claim: `Your food quality is holding up.`,
      proof: `Avg ${macroFinding.avgFiber} g fiber/day · target 25 to 38 g`,
      lever: `Whole foods are doing the work. Keep them on the plate.`,
      window: winFiber, strength: clampStrength(40), tone: 'positive', positive: true,
      metric: { kind: 'range', value: macroFinding.avgFiber, target: 38, rangeMin: 25, rangeMax: 38, unit: 'g', primaryLabel: 'AVG/DAY', secondaryLabel: '25 TO 38' },
    });
  }

  // Sleep solid
  if (sleepFinding && sleepFinding.hasEnoughData && sleepFinding.status === 'good') {
    const proof = sleepFinding.avgSleepScore !== null
      ? `Avg sleep score ${sleepFinding.avgSleepScore} over ${sleepFinding.totalSleepDays} nights`
      : `Avg ${sleepFinding.avgSleepHours}h over ${sleepFinding.totalSleepDays} nights`;
    cards.push({
      id: 'sleep_good',
      claim: `Your sleep is working in your favor.`,
      proof,
      lever: `Keep guarding it. Good sleep keeps your appetite and training steady.`,
      window: winSleep, strength: clampStrength(46), tone: 'positive', positive: true,
      // Score bar only when we have a 0-100 sleep score; the hours-only fallback has no
      // /100 scale, so it keeps the text proof (no broken bar).
      metric: sleepFinding.avgSleepScore !== null
        ? { kind: 'score', value: sleepFinding.avgSleepScore, target: 100, unit: '', primaryLabel: 'SLEEP SCORE', secondaryLabel: '', caption: `OVER ${sleepFinding.totalSleepDays} NIGHTS` }
        : undefined,
    });
  }

  // ── Recovery (ported 2026-06-16 from the hub coach's rec_* rules). These were only ever
  // in the OLD EvR coach pool; the new card engine never had them, so without this port
  // recovery findings vanish from EvR. All three are correctives with a 14-day per-pattern
  // window. load_drag / tracks_sleep are educational in voice, sustained_low is a real "back
  // off" corrective. Mindful softening is handled by voiceDiagnosticCards + the feed-wide
  // Mindful pass (track 2 step 3); not special-cased here. ──
  for (const r of recoveryFindings) {
    let claim = '', proof = '', lever = '';
    let metric: DiagnosticCard['metric'];
    if (r.id === 'rec_load_drag') {
      claim = `Your recovery dips after your hardest training days.`;
      proof = `Recovery runs ${r.delta} pts lower the day after high-load days`;
      lever = `Treat the day after a hard session as a real recovery day: lighter training, earlier night.`;
      if (r.compare) metric = { kind: 'compare', value: r.compare.a, target: r.compare.b, unit: '', primaryLabel: r.compare.aLabel, secondaryLabel: r.compare.bLabel };
    } else if (r.id === 'rec_tracks_sleep') {
      claim = `Your recovery follows your sleep.`;
      proof = `Recovery runs ${r.delta} pts lower after your short nights`;
      lever = `Sleep is your strongest recovery lever right now. Protect the short nights first.`;
      if (r.compare) metric = { kind: 'compare', value: r.compare.a, target: r.compare.b, unit: '', primaryLabel: r.compare.aLabel, secondaryLabel: r.compare.bLabel };
    } else {
      claim = `You have been under-recovered while training has held steady.`;
      proof = `Recovery averaging ${r.mean} over ${r.n} days`;
      lever = `A lighter week is worth considering. Sustained low recovery is recovery debt, not weakness.`;
      if (r.mean != null) metric = { kind: 'score', value: r.mean, target: 100, unit: '', primaryLabel: 'RECOVERY', secondaryLabel: '', caption: `OVER ${r.n} DAYS` };
    }
    cards.push({
      id: r.id, claim, proof, lever,
      window: `Last 14 days`,
      strength: r.strength,
      tone: r.strength >= 75 ? 'factor' : 'attention',
      positive: false,
      metric,
    });
  }

  // ── Correlations that carry card fields ──
  for (const c of correlations) {
    if (c.claim && c.proof && c.lever && c.strength != null) {
      const positive = !!c.positive;
      cards.push({
        id: c.id, claim: c.claim, proof: c.proof, lever: c.lever,
        window: c.windowLabel ?? `Last ${windows.weight} days`,
        strength: c.strength,
        tone: positive ? 'positive' : (c.strength >= 75 ? 'factor' : 'attention'),
        positive,
        metric: c.metric,
      });
    }
  }

  // Strength desc; on a tie, corrective (positive=false) ranks above positive.
  cards.sort((a, b) => (b.strength - a.strength) || (Number(a.positive) - Number(b.positive)));
  // Cap positives at 3 (decision 2026-06-16) so a good week stays a diagnosis feed, not a
  // trophy case; correctives are never capped. Total feed still capped at 6. Because the
  // list is already strength-sorted, this keeps the 3 highest-strength positives and drops
  // the rest (back-pats, which carry the lowest strength, fall out first).
  const MAX_POSITIVES = 3;
  const out: DiagnosticCard[] = [];
  let posCount = 0;
  for (const c of cards) {
    if (c.positive) {
      if (posCount >= MAX_POSITIVES) continue;
      posCount++;
    }
    out.push(c);
    if (out.length >= 6) break;
  }
  return out;
}

// ── Main generation function ───────────────────────────────────────────────────

// Per-pattern windows (spec section 5): each finding looks back only as far as IT needs.
// We load the longest (weight) once, then slice shorter recent views off it. No user-picked
// window. Tiers: SLOW (weight), BEHAVIORAL (~4wk patterns), RECENT (~2wk recency-sensitive).
const W = {
  weight: 90,
  weekend: 28,
  behavioral: 28,   // sleep->intake, burn->intake, water, sodium, steps->sleep, workout/rest
  consistency: 30,  // logging reliability
  fiber: 28,
  protein: 14,
  sleep: 14,
  momentum: 30,
} as const;
const MAX_WINDOW = W.weight;
const MIN_TOTAL_LOGGED = 7; // report blocks only if there's basically nothing to analyze

export async function generateDiagnosticReport(): Promise<DiagnosticReport> {
  const yesterday = offsetToDateKey(1);
  const rangeStart = offsetToDateKey(MAX_WINDOW);

  // ── Load profile + settings ──
  // calTarget, goal direction, and the protein goal all come from the SAME canonical
  // sources every other coach uses (utils/calorieTarget + the macro calc that mirrors
  // buildEngineContext in smartTipsEngine), so EvR never guesses a target. The old code
  // read calTarget from pj_settings (wrong bucket, always 0) and treated weightGoal as a
  // number (it's a bucket string like 'lose_1'), which silently disabled the entire
  // deficit/weight analysis.
  let bodyWeightLbs = 0, burnAccuracyPct = 100, sleepGoal = 8;
  let proteinGoalG = 0;
  let goalDirection: GoalDirection = 'maintain';

  const { calTarget, paceDeficit } = await loadCalorieTargets(yesterday);
  if (paceDeficit < 0) goalDirection = 'lose';
  else if (paceDeficit > 0) goalDirection = 'gain';

  try {
    const profileRaw = await AsyncStorage.getItem('pj_profile');
    if (profileRaw) {
      const p = JSON.parse(profileRaw);
      if (p.sleepGoal) sleepGoal = parseFloat(p.sleepGoal);
      // Real protein goal: fixed grams, or ratio % of the canonical calTarget. Mirrors
      // buildEngineContext so EvR reads the exact number your Macros card shows.
      if (p.macroMode === 'fixed' && p.macroProteinG) {
        proteinGoalG = parseFloat(p.macroProteinG) || 0;
      } else if (p.macroProteinPct && calTarget > 0) {
        proteinGoalG = Math.round(((parseFloat(p.macroProteinPct) || 35) / 100) * calTarget / 4);
      }
      for (let i = 0; i <= 7 && bodyWeightLbs === 0; i++) {
        try {
          const dd = await AsyncStorage.getItem(`pj_${offsetToDateKey(i)}`);
          if (dd) { const x = JSON.parse(dd); if (x.weight) bodyWeightLbs = x.weight; }
        } catch {}
      }
    }
  } catch {}

  try {
    const settingsRaw = await AsyncStorage.getItem('pj_settings');
    if (settingsRaw) {
      const s = JSON.parse(settingsRaw);
      if (s.burnAccuracyPct) burnAccuracyPct = parseInt(s.burnAccuracyPct);
    }
  } catch {}

  // ── Load workout state ──
  let workoutState: any = {};
  try {
    const ws = await AsyncStorage.getItem('pj_workout_state');
    if (ws) workoutState = JSON.parse(ws);
  } catch {}

  // ── Per-day data collection ──
  type DayData = {
    dateKey: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sodium: number;
    weight: number | null;
    activeCalories: number;
    sleepHours: number | null;
    sleepScore: number | null;
    steps: number;
    water: number;
    excluded: boolean;
    hadWorkout: boolean;
    isWeekend: boolean;
  };

  const days: DayData[] = [];

  for (let i = MAX_WINDOW; i >= 1; i--) {
    const dateKey = offsetToDateKey(i);
    let calories = 0, protein = 0, carbs = 0, fat = 0, fiber = 0, sodium = 0;
    let weight: number | null = null;
    let activeCalories = 0, steps = 0, water = 0;
    let sleepHours: number | null = null, sleepScore: number | null = null;
    let excludedDiet = false;
    const hadWorkout = (workoutState.programs?.[dateKey]?.exercises?.length ?? 0) > 0;

    try {
      const raw = await AsyncStorage.getItem(`pj_${dateKey}`);
      if (raw) {
        const d = JSON.parse(raw);
        excludedDiet = !!(d.excluded?.diet);
        if (!excludedDiet && d.entries?.length > 0) {
          calories = d.entries.reduce((s: number, e: any) => s + (e.cal || 0), 0);
          protein = d.entries.reduce((s: number, e: any) => s + (e.protein || 0), 0);
          carbs = d.entries.reduce((s: number, e: any) => s + (e.carbs || 0), 0);
          fat = d.entries.reduce((s: number, e: any) => s + (e.fat || 0), 0);
          fiber = getEntryNutrient(d.entries, 'Fiber, total dietary');
          sodium = getEntryNutrient(d.entries, 'Sodium, Na');
        }
        if (d.weight) weight = d.weight;
        activeCalories = d.activeCalories || d.caloriesBurned || 0;
        if (d.steps) steps = d.steps;
        if (typeof d.water === 'number') water = d.water;
        const sh = d.sleepOverride || d.sleepHours;
        if (sh) {
          sleepHours = sh;
          sleepScore = calcSleepScore(sh, d.sleepStages || null, sleepGoal, d.sleepFeelRating ?? null, !!d.sleepOverride, d.sleepConsistencyPts ?? 0).score;
        }
      }
    } catch {}

    days.push({ dateKey, calories, protein, carbs, fat, fiber, sodium, weight, activeCalories, sleepHours, sleepScore, steps, water, excluded: excludedDiet, hadWorkout, isWeekend: isWeekend(dateKey) });
  }

  // ── Per-pattern slices off the 90-day load (days is oldest->newest; slice(-n) = recent n) ──
  const daysB = days.slice(-W.behavioral);   // behavioral correlations + weekend
  const daysR = days.slice(-W.protein);      // recency-sensitive averages (protein, sleep)
  const daysC = days.slice(-W.consistency);  // logging reliability

  // Total logged across the full load -- gates the report and anchors deficit context.
  const loggedDays = days.filter(d => !d.excluded && d.calories > 400).length;
  const insufficientData = loggedDays < MIN_TOTAL_LOGGED;

  // ── Consistency (own ~30d window) ──
  const loggedC = daysC.filter(d => !d.excluded && d.calories > 400).length;
  const suspectDays = daysC.filter(d => !d.excluded && d.calories > 0 && d.calories <= 400).length;
  const excludedCount = daysC.filter(d => d.excluded).length;
  const consistencyRate = daysC.length > 0 ? loggedC / daysC.length : 0;
  const firstLoggedDayIdx = daysC.findIndex(d => !d.excluded && d.calories > 400);
  const effectiveWindowDays = firstLoggedDayIdx >= 0 ? daysC.length - firstLoggedDayIdx : daysC.length;
  const adjustedConsistencyRate = effectiveWindowDays > 0 ? loggedC / effectiveWindowDays : 0;

  let consistencyStatus: FindingStatus = 'good';
  if (adjustedConsistencyRate < 0.70) consistencyStatus = 'factor';
  else if (adjustedConsistencyRate < 0.85) consistencyStatus = 'attention';

  const consistency: ConsistencyFinding = {
    type: 'consistency', loggedDays: loggedC, totalDays: daysC.length, rate: consistencyRate,
    suspectDays, excludedDays: excludedCount, status: consistencyStatus,
  };

  if (insufficientData) {
    return {
      id: Date.now().toString(),
      generatedAt: new Date().toISOString(),
      windowDays: MAX_WINDOW, dateRangeStart: rangeStart, dateRangeEnd: yesterday, goalDirection,
      summary: `Not enough logged data to analyze yet. Log food on at least ${MIN_TOTAL_LOGGED} days and your report unlocks. You currently have ${loggedDays} logged day${loggedDays !== 1 ? 's' : ''}.`,
      deficit: null, burnAccuracy: null, consistency, macros: null, sleep: null, correlations: null,
      suggestions: [{ rank: 1, headline: 'Log your food consistently', detail: `Aim for at least ${MIN_TOTAL_LOGGED} days of logging. Even rough estimates count.` }],
      cards: [],
      insufficientData: true, minLoggedDays: loggedDays,
      momentumDebug: null,
    };
  }

  // ── Deficit/surplus (own ~90d window: the scale moves slowly) ──
  const loggedDayData = days.filter(d => !d.excluded && d.calories > 400);          // 90d (deficit/weight + correlations)
  const loggedB = daysB.filter(d => !d.excluded && d.calories > 400);               // ~28d behavioral
  const loggedR = daysR.filter(d => !d.excluded && d.calories > 400);               // ~14d recency-sensitive
  const avgCals = avg(loggedDayData.map(d => d.calories));
  const avgActiveCalsRaw = avg(loggedDayData.map(d => d.activeCalories));
  const avgActiveCalsAdj = avgActiveCalsRaw * (burnAccuracyPct / 100);
  const avgDailyDeficit = calTarget > 0 ? calTarget - avgCals + avgActiveCalsAdj : 0;

  const weightEntries = days.filter(d => d.weight !== null);
  const hasWeightData = weightEntries.length >= 2;
  let actualChangeLbs: number | null = null;
  // Honest weight window: the REAL span from first to last weigh-in, replacing the
  // hardcoded "Over 90 days" label. days is oldest->newest and dateKeys sort
  // chronologically, so [0] = oldest weigh-in, [last] = newest. We also use this span to
  // scope the deficit prediction below, so Predicted vs Actual cover the SAME days.
  let weightSpanDays: number | null = null;
  let firstWeighKey = '', lastWeighKey = '';
  if (hasWeightData) {
    firstWeighKey = weightEntries[0].dateKey;
    lastWeighKey = weightEntries[weightEntries.length - 1].dateKey;
    actualChangeLbs = weightEntries[weightEntries.length - 1].weight! - weightEntries[0].weight!;
    weightSpanDays = Math.round(Math.abs(new Date(lastWeighKey).getTime() - new Date(firstWeighKey).getTime()) / 86400000) + 1;
  }

  let deficitFinding: DeficitFinding | null = null;
  if (goalDirection !== 'maintain' && calTarget > 0) {
    // Predict over the SAME span the scale change is measured across (when we have weigh-ins),
    // so the comparison is apples-to-apples instead of 90 days of logging vs 3 weeks of scale.
    const predictionDays = hasWeightData
      ? loggedDayData.filter(d => d.dateKey >= firstWeighKey && d.dateKey <= lastWeighKey)
      : loggedDayData;
    const totalDeficit = predictionDays.reduce((s, d) => s + (calTarget - d.calories + d.activeCalories * (burnAccuracyPct / 100)), 0);
    const expectedChangeLbs = -(totalDeficit / 3500);
    let gapLbs: number | null = null;
    if (actualChangeLbs !== null) gapLbs = actualChangeLbs - expectedChangeLbs;

    let deficitStatus: FindingStatus = 'good';
    if (gapLbs !== null) {
      if (goalDirection === 'lose') {
        if (gapLbs > 1.0) deficitStatus = 'factor';
        else if (gapLbs > 0.3) deficitStatus = 'attention';
      } else {
        if (gapLbs < -1.0) deficitStatus = 'factor';
        else if (gapLbs < -0.3) deficitStatus = 'attention';
      }
    }

    deficitFinding = {
      type: 'deficit', expectedChangeLbs, actualChangeLbs, gapLbs, goalDirection,
      avgDailyDeficit, loggedDays, status: hasWeightData ? deficitStatus : 'attention', hasWeightData,
    };
  }

  // ── Burn accuracy ──
  const isBurnFlagged = burnAccuracyPct === 100 && (
    (deficitFinding?.gapLbs != null && deficitFinding.gapLbs > 0.5) || avgActiveCalsRaw > 450
  );
  const burnAccuracyFinding: BurnAccuracyFinding = {
    type: 'burnAccuracy', burnAccuracyPct, avgActiveCalPerDay: Math.round(avgActiveCalsRaw),
    isFlagged: isBurnFlagged, status: isBurnFlagged ? 'attention' : 'good',
  };

  // ── Macros: protein on its own ~14d window (recency matters -- a recent dip shouldn't be
  // hidden by good months), fiber on the ~28d behavioral window (food-quality trend). ──
  let macroFinding: MacroFinding | null = null;
  const proteinLoggedDays = loggedR.filter(d => d.protein > 0 || d.carbs > 0 || d.fat > 0);
  if (proteinLoggedDays.length >= 5 && proteinGoalG > 0) {
    const avgProtein = avg(proteinLoggedDays.map(d => d.protein));
    const fiberDays = loggedB.filter(d => d.fiber > 0);
    const avgFiber = fiberDays.length > 0 ? avg(fiberDays.map(d => d.fiber)) : 0;
    // Single real goal (your configured protein target), not a bodyweight estimate.
    const proteinGoalMin = Math.round(proteinGoalG);
    const proteinGoalMax = Math.round(proteinGoalG);
    const macroStatus: FindingStatus = avgProtein < proteinGoalMin * 0.7 ? 'factor' : avgProtein < proteinGoalMin * 0.9 ? 'attention' : 'good';
    const fiberStatus: FindingStatus = avgFiber > 0 ? (avgFiber < 15 ? 'factor' : avgFiber < 22 ? 'attention' : 'good') : 'attention';
    const status: FindingStatus = macroStatus === 'factor' || fiberStatus === 'factor' ? 'factor' : macroStatus === 'attention' || fiberStatus === 'attention' ? 'attention' : 'good';

    // Trend: recent 7d protein vs the 30d baseline, each over real logged days. Only computed
    // when both windows have enough days to be real (recent >=4, baseline >=10). Divergence
    // threshold 12% is FIRST-PASS -- tune on the dump. A protein-logged day = any macro logged.
    const isMacroDay = (d: typeof days[number]) => !d.excluded && (d.protein > 0 || d.carbs > 0 || d.fat > 0);
    const recent7 = days.slice(-7).filter(isMacroDay);
    const baseline30 = days.slice(-30).filter(isMacroDay);
    let proteinTrend: MacroFinding['proteinTrend'];
    if (recent7.length >= 4 && baseline30.length >= 10) {
      const recentAvg = Math.round(avg(recent7.map(d => d.protein)));
      const baselineAvg = Math.round(avg(baseline30.map(d => d.protein)));
      const pctDelta = baselineAvg > 0 ? Math.round(((recentAvg - baselineAvg) / baselineAvg) * 100) : 0;
      proteinTrend = {
        recentAvg, recentN: recent7.length, baselineAvg, baselineN: baseline30.length,
        diverges: Math.abs(pctDelta) >= 12, direction: pctDelta >= 0 ? 'up' : 'down', pctDelta,
      };
    }

    macroFinding = {
      type: 'macros', avgProtein: Math.round(avgProtein), proteinGoalMin, proteinGoalMax,
      avgFiber: Math.round(avgFiber * 10) / 10, fiberStatus, macroStatus, status,
      hasData: true, bodyWeightLbs: Math.round(bodyWeightLbs), lowFiberNote: fiberStatus !== 'good',
      proteinTrend,
    };
  }

  // ── Sleep: finding average on its own ~14d window; the sleep->intake correlation below
  // uses the full pool (more pairs = a more reliable pattern). ──
  let sleepFinding: SleepFinding | null = null;
  const sleepDaysAll = days.filter(d => d.sleepHours !== null && d.sleepHours > 0); // full pool (correlation)
  const sleepDays = daysR.filter(d => d.sleepHours !== null && d.sleepHours > 0);   // recent (~14d) average
  if (sleepDays.length >= 5) {
    const scoreDays = sleepDays.filter(d => d.sleepScore !== null);
    const avgSleepScore = scoreDays.length > 0 ? Math.round(avg(scoreDays.map(d => d.sleepScore!))) : null;
    const avgSleepHours = Math.round(avg(sleepDays.map(d => d.sleepHours!)) * 10) / 10;

    let poorSleepCalDelta: number | null = null;
    if (sleepDaysAll.length >= 7 && loggedDayData.length >= 7) {
      const poorNextCals: number[] = [], goodNextCals: number[] = [];
      for (let i = 0; i < days.length - 1; i++) {
        if (days[i].sleepHours === null || days[i + 1].calories < 400) continue;
        const isPoor = (days[i].sleepScore !== null && days[i].sleepScore! < 70) || (days[i].sleepScore === null && days[i].sleepHours! < 6);
        const isGood = (days[i].sleepScore !== null && days[i].sleepScore! >= 70) || (days[i].sleepScore === null && days[i].sleepHours! >= 7);
        if (isPoor) poorNextCals.push(days[i + 1].calories);
        else if (isGood) goodNextCals.push(days[i + 1].calories);
      }
      if (poorNextCals.length >= 3 && goodNextCals.length >= 3) {
        const delta = avg(poorNextCals) - avg(goodNextCals);
        if (Math.abs(delta) >= 100) poorSleepCalDelta = Math.round(delta);
      }
    }

    let sleepStatus: FindingStatus = 'good';
    if (avgSleepScore !== null) {
      if (avgSleepScore < 65) sleepStatus = 'factor';
      else if (avgSleepScore < 75) sleepStatus = 'attention';
    } else if (avgSleepHours < 6) sleepStatus = 'factor';
    else if (avgSleepHours < 7) sleepStatus = 'attention';

    sleepFinding = {
      type: 'sleep', avgSleepScore, avgSleepHours, totalSleepDays: sleepDays.length,
      poorSleepCalDelta, status: sleepStatus, hasEnoughData: true,
    };
  }

  // ── Correlations ──
  const correlations: Correlation[] = [];

  // 1. Sleep → next-day calories
  if (sleepFinding?.poorSleepCalDelta != null) {
    const delta = sleepFinding.poorSleepCalDelta;
    correlations.push({
      id: 'sleep_nextday_cals',
      headline: delta > 0
        ? `After poor sleep, you ate ${delta} more calories the next day`
        : `After good sleep, you ate ${Math.abs(delta)} fewer calories the next day`,
      detail: delta > 0
        ? `Your body releases more hunger hormones when you're tired. For you specifically, poor sleep nights are directly linked to higher calorie intake the following day.`
        : `Your data shows a clear pattern: better sleep nights are followed by lower calorie intake. Good sleep seems to regulate your appetite well.`,
      claim: delta > 0
        ? `Short sleep is pushing your intake up the next day.`
        : `Good sleep is keeping your appetite in check.`,
      proof: delta > 0
        ? `After poor sleep: +${delta} cal the next day`
        : `After good sleep: ${delta} cal the next day`,
      lever: delta > 0
        ? `Protect a consistent bedtime. It moves your intake more than willpower does.`
        : `Keep guarding your sleep. It is regulating your hunger well.`,
      strength: corrStrength(delta, 100),
      positive: delta < 0,
    });
  }

  // 2. High burn day → next-day calories
  if (loggedDayData.length >= 7) {
    const activeDays = days.filter(d => d.activeCalories > 0);
    const activeCalGoal = activeDays.length > 0 ? avg(activeDays.map(d => d.activeCalories)) * 1.1 : 0;
    if (activeCalGoal > 0) {
      const highBurnNext: number[] = [], normalBurnNext: number[] = [];
      for (let i = 0; i < days.length - 1; i++) {
        if (days[i + 1].calories < 400) continue;
        if (days[i].activeCalories > activeCalGoal) highBurnNext.push(days[i + 1].calories);
        else if (days[i].activeCalories > 0 && days[i].activeCalories <= activeCalGoal) normalBurnNext.push(days[i + 1].calories);
      }
      if (highBurnNext.length >= 3 && normalBurnNext.length >= 3) {
        const delta = Math.round(avg(highBurnNext) - avg(normalBurnNext));
        if (Math.abs(delta) >= 150) {
          correlations.push({
            id: 'highburn_nextday',
            headline: delta > 0
              ? `After big burn days, you ate ${delta} more calories the next day`
              : `After big burn days, you ate ${Math.abs(delta)} fewer calories the next day`,
            detail: delta > 0
              ? `After high-activity days, your body often seeks a reward. That ${delta} cal swing the following day can partially offset the extra burn.`
              : `Interesting: your big workout days don't lead to overeating the next day. Your appetite regulation on recovery days is solid.`,
            claim: delta > 0
              ? `Big training days trigger a rebound the next day.`
              : `Your appetite holds steady after hard training.`,
            proof: delta > 0
              ? `After big burn days: +${delta} cal the next day`
              : `After big burn days: ${delta} cal the next day`,
            lever: delta > 0
              ? `Pre-plan the day after a hard session so the burn is not erased.`
              : `Strong control. Nothing to change here.`,
            strength: corrStrength(delta, 150),
            positive: delta < 0,
          });
        }
      }
    }
  }

  // 3. Weekend vs weekday calories
  if (loggedDayData.length >= 8) {
    const weekdayCals = loggedDayData.filter(d => !d.isWeekend).map(d => d.calories);
    const weekendCals = loggedDayData.filter(d => d.isWeekend).map(d => d.calories);
    if (weekdayCals.length >= 4 && weekendCals.length >= 2) {
      const weekdayAvg = Math.round(avg(weekdayCals));
      const weekendAvg = Math.round(avg(weekendCals));
      const delta = weekendAvg - weekdayAvg;
      if (Math.abs(delta) >= 250) {
        correlations.push({
          id: 'weekend_weekday',
          headline: delta > 0
            ? `You average ${delta} more calories on weekends`
            : `You eat ${Math.abs(delta)} fewer calories on weekends`,
          detail: delta > 0
            ? `Monday through Friday you averaged ${weekdayAvg.toLocaleString()} cal. Weekends averaged ${weekendAvg.toLocaleString()} cal. That ${delta} cal gap, across the month, adds up more than most people realize.`
            : `Interesting -- your weekends are actually cleaner than your weekdays. You averaged ${weekdayAvg.toLocaleString()} cal on weekdays vs ${weekendAvg.toLocaleString()} on weekends.`,
          claim: delta > 0
            ? `Weekends are erasing your weekday deficit.`
            : `Your weekends are actually cleaner than your weekdays.`,
          proof: `Weekdays ${weekdayAvg.toLocaleString()} cal · weekends ${weekendAvg.toLocaleString()} cal`,
          lever: delta > 0
            ? `Give weekends the same loose plan you give weekdays and the deficit holds.`
            : `Whatever your weekend rhythm is, it is working.`,
          strength: corrStrength(delta, 250),
          positive: delta < 0,
          windowLabel: `Across your recent weekends`,
        });
      }
    }
  }

  // 4. Water → calorie intake
  if (loggedDayData.length >= 7) {
    const waterDays = days.filter(d => d.water > 0);
    const avgWater = waterDays.length > 0 ? avg(waterDays.map(d => d.water)) : 0;
    if (avgWater > 0) {
      const wellHydratedCals = loggedDayData.filter(d => d.water >= avgWater * 1.1).map(d => d.calories);
      const poorHydrationCals = loggedDayData.filter(d => d.water > 0 && d.water < avgWater * 0.8).map(d => d.calories);
      if (wellHydratedCals.length >= 3 && poorHydrationCals.length >= 3) {
        const delta = Math.round(avg(poorHydrationCals) - avg(wellHydratedCals));
        if (delta >= 100) {
          correlations.push({
            id: 'water_cals',
            headline: `On low-water days, you ate ${delta} more calories`,
            detail: `Thirst and hunger signals fire from the same place in the brain. On days you hit your water goal, your appetite was more controlled. Dehydration can read as hunger.`,
            claim: `Low-water days come with more eating.`,
            proof: `On low-water days: +${delta} cal`,
            lever: `Hit your water goal first. Thirst often reads as hunger.`,
            strength: corrStrength(delta, 100),
            positive: false,
          });
        }
      }
    }
  }

  // 5. High sodium → next-day weight
  const sodiumWeightPairs = days.filter(d => d.sodium > 0 && d.weight !== null);
  if (sodiumWeightPairs.length >= 5) {
    const highSodiumDeltas: number[] = [], normalSodiumDeltas: number[] = [];
    for (let i = 0; i < days.length - 1; i++) {
      if (days[i].sodium <= 0 || days[i + 1].weight === null || days[i].weight === null) continue;
      const weightDelta = days[i + 1].weight! - days[i].weight!;
      if (days[i].sodium > 2300) highSodiumDeltas.push(weightDelta);
      else if (days[i].sodium <= 2000) normalSodiumDeltas.push(weightDelta);
    }
    if (highSodiumDeltas.length >= 2 && normalSodiumDeltas.length >= 2) {
      const delta = avg(highSodiumDeltas) - avg(normalSodiumDeltas);
      if (delta >= 0.5) {
        correlations.push({
          id: 'sodium_weight',
          headline: `After high-sodium days, the scale jumps ${(Math.round(delta * 10) / 10).toFixed(1)} lbs`,
          detail: `High sodium causes your body to retain water overnight. This isn't fat -- it's fluid. After high-sodium days, your next-morning weight tends to be ${(Math.round(delta * 10) / 10).toFixed(1)} lbs higher on average.`,
          claim: `High-sodium days spike the scale the next morning.`,
          proof: `After high-sodium days: +${(Math.round(delta * 10) / 10).toFixed(1)} lbs`,
          lever: `That jump is water, not fat. Do not let it derail you.`,
          strength: corrStrength(delta, 0.5),
          positive: false,
        });
      }
    }
  }

  // 6. Steps → sleep score
  if (sleepDaysAll.length >= 7) {
    const stepDays = days.filter(d => d.steps > 0);
    const avgSteps = stepDays.length > 0 ? avg(stepDays.map(d => d.steps)) : 0;
    if (avgSteps > 0) {
      const highStepSleep: number[] = [], lowStepSleep: number[] = [];
      for (const day of days) {
        if (day.sleepScore === null || day.steps === 0) continue;
        if (day.steps > avgSteps * 1.1) highStepSleep.push(day.sleepScore);
        else if (day.steps < avgSteps * 0.7) lowStepSleep.push(day.sleepScore);
      }
      if (highStepSleep.length >= 3 && lowStepSleep.length >= 3) {
        const delta = Math.round(avg(highStepSleep) - avg(lowStepSleep));
        if (delta >= 8) {
          correlations.push({
            id: 'steps_sleep',
            headline: `Higher step days lead to ${delta} pts better sleep score`,
            detail: `On above-average step days, your sleep score averaged ${Math.round(avg(highStepSleep))} vs ${Math.round(avg(lowStepSleep))} on lower-step days. Movement during the day is one of the strongest predictors of sleep quality.`,
            claim: `Moving more is buying you better sleep.`,
            proof: `High-step days: +${delta} pt sleep score`,
            lever: `Keep the steps up. Daytime movement is one of the strongest things you can do for your sleep.`,
            strength: corrStrength(delta, 8),
            positive: true,
          });
        }
      }
    }
  }

  // 7. Workout days vs rest days → calorie intake
  if (loggedDayData.length >= 7) {
    const workoutCals = loggedDayData.filter(d => d.hadWorkout).map(d => d.calories);
    const restCals = loggedDayData.filter(d => !d.hadWorkout).map(d => d.calories);
    if (workoutCals.length >= 3 && restCals.length >= 3) {
      const workoutAvg = Math.round(avg(workoutCals));
      const restAvg = Math.round(avg(restCals));
      const delta = workoutAvg - restAvg;
      if (Math.abs(delta) >= 200) {
        correlations.push({
          id: 'workout_vs_rest_cals',
          headline: delta > 0
            ? `You eat ${delta} more calories on workout days`
            : `You eat ${Math.abs(delta)} fewer calories on workout days`,
          detail: delta > 0
            ? `Workout days averaged ${workoutAvg.toLocaleString()} cal, rest days ${restAvg.toLocaleString()} cal. Your appetite rises on training days -- whether it offsets the calorie burn is in the deficit math above.`
            : `Your calorie intake is actually lower on workout days (${workoutAvg.toLocaleString()} cal) than rest days (${restAvg.toLocaleString()} cal). You may be under-fueling training sessions.`,
          claim: delta > 0
            ? `Training days bump your appetite up.`
            : `You under-eat on training days.`,
          proof: `Workout days ${workoutAvg.toLocaleString()} cal · rest days ${restAvg.toLocaleString()} cal`,
          lever: delta > 0
            ? `Plan for the extra hunger on training days so it does not undo the burn.`
            : `Fuel your sessions a bit more. Under-fueling stalls progress.`,
          strength: corrStrength(delta, 200),
          positive: false,
        });
      }
    }
  }

  // 8. Sleep → next-day workout completion
  if (sleepDaysAll.length >= 7) {
    const poorSleepWorkout: number[] = [], goodSleepWorkout: number[] = [];
    for (let i = 0; i < days.length - 1; i++) {
      if (days[i].sleepHours === null) continue;
      const isPoor = (days[i].sleepScore !== null && days[i].sleepScore! < 70) || (days[i].sleepScore === null && days[i].sleepHours! < 6);
      const isGood = (days[i].sleepScore !== null && days[i].sleepScore! >= 70) || (days[i].sleepScore === null && days[i].sleepHours! >= 7);
      if (isPoor) poorSleepWorkout.push(days[i + 1].hadWorkout ? 1 : 0);
      else if (isGood) goodSleepWorkout.push(days[i + 1].hadWorkout ? 1 : 0);
    }
    if (poorSleepWorkout.length >= 3 && goodSleepWorkout.length >= 3) {
      const poorRate = avg(poorSleepWorkout);
      const goodRate = avg(goodSleepWorkout);
      const delta = goodRate - poorRate;
      if (delta >= 0.2) {
        correlations.push({
          id: 'sleep_workout',
          headline: `Poor sleep nights cut your next-day workout rate by ${Math.round(delta * 100)}%`,
          detail: `After good sleep, you worked out ${Math.round(goodRate * 100)}% of the time. After poor sleep, that dropped to ${Math.round(poorRate * 100)}%. Sleep and training have a direct relationship in your data.`,
          claim: `Poor sleep is costing you workouts.`,
          proof: `Good sleep: ${Math.round(goodRate * 100)}% trained · poor sleep: ${Math.round(poorRate * 100)}%`,
          lever: `Sleep is upstream of training. Guard it and the sessions follow.`,
          strength: corrStrength(delta, 0.2),
          positive: false,
        });
      }
    }
  }

  // Read-only diagnostic for the Dump EvR Cards dev tool: why the snowball card did/didn't fire.
  let momentumDebug: { overDays: number; ranHigh: number; ratio: number | null; overage: number | null; fired: boolean } | null = null;
  // 9. Big day -> next-day snowball (frequency-led, skew-proof). Own ~30d window, independent
  // of the report window. "Over target" / "ran high" are judged against each day's FINAL goal
  // = base target + that day's active calories (burn-accuracy adjusted), so high-burn days are
  // not falsely flagged. The signal is FREQUENCY (how many big days snowballed), NOT a fragile
  // small-sample average; a trimmed-mean overage (single biggest next-day dropped) rides along
  // as secondary context only.
  if (calTarget > 0) {
    const recent = days.slice(-30); // chronological oldest -> newest
    const goalFor = (d: typeof days[number]) => calTarget + d.activeCalories * (burnAccuracyPct / 100);
    let overWithNext = 0, ranHigh = 0;
    const overages: number[] = [];
    for (let i = 0; i < recent.length - 1; i++) {
      const day = recent[i], next = recent[i + 1];
      if (day.excluded || day.calories < 400) continue;          // need a real logged day
      if (day.calories <= goalFor(day) * 1.1) continue;          // not an over-target day
      if (next.excluded || next.calories < 400) continue;        // can't judge an unlogged next day
      overWithNext++;
      overages.push(Math.round(next.calories - goalFor(next)));
      if (next.calories > goalFor(next) * 1.1) ranHigh++;
    }
    const sorted = [...overages].sort((a, b) => a - b);
    const trimmed = sorted.length > 2 ? sorted.slice(0, -1) : sorted; // drop the single biggest
    const overage = trimmed.length ? Math.round(trimmed.reduce((s, v) => s + v, 0) / trimmed.length) : null;
    const ratio = overWithNext > 0 ? ranHigh / overWithNext : null;
    const fired = overWithNext >= 5 && (ratio ?? 0) >= 0.6;
    momentumDebug = { overDays: overWithNext, ranHigh, ratio, overage, fired };
    if (fired && overage !== null) {
      correlations.push({
        id: 'surplus_nextday',
        headline: `${ranHigh} of ${overWithNext} big days rolled into another high day`,
        detail: `Across your last 30 days, ${ranHigh} of ${overWithNext} over-target days were followed by another day over goal${overage > 0 ? ` (about +${overage} cal the next day on average)` : ''}. Big days tend not to self-correct.`,
        claim: `Your big days are snowballing into the next one.`,
        proof: `${ranHigh} of ${overWithNext} big days were followed by another high day`,
        lever: `Treat a big day as done and reset the next morning instead of carrying it forward.`,
        windowLabel: 'Last 30 days',
        strength: corrStrength(ranHigh / overWithNext, 0.6),
        positive: false,
        metric: { kind: 'dots', value: ranHigh, target: overWithNext, primaryLabel: `${ranHigh} OF ${overWithNext} BIG DAYS RAN HIGH`, secondaryLabel: '', caption: overage > 0 ? `+${overage} CAL THE NEXT DAY ON AVERAGE` : undefined },
      });
    }
  }

  // ── Suggestions ──
  const suggestions: Suggestion[] = [];

  if (consistency.status === 'factor') {
    suggestions.push({ rank: 1, headline: 'Log more consistently', detail: `You logged ${consistency.loggedDays} out of the last ${consistency.totalDays} days. Even rough estimates on hard days are better than gaps -- aim for something every day.` });
  }
  if (burnAccuracyFinding.isFlagged) {
    suggestions.push({ rank: suggestions.length + 1, headline: 'Adjust your burn accuracy setting', detail: `You're using 100% of Apple Health's active calorie estimate. Most wearables overstate by 10-30%. Go to Settings → Health and try 80-90%.` });
  }
  if (deficitFinding && !deficitFinding.hasWeightData) {
    suggestions.push({ rank: suggestions.length + 1, headline: 'Log your weight more regularly', detail: `The most powerful comparison -- expected vs actual results -- needs at least 2 weight entries in the window. Log a few times a week.` });
  }
  if (macroFinding && macroFinding.macroStatus !== 'good') {
    suggestions.push({ rank: suggestions.length + 1, headline: 'Increase your protein intake', detail: `Your average was ${macroFinding.avgProtein}g/day. For your size, ${macroFinding.proteinGoalMin}-${macroFinding.proteinGoalMax}g is the target. Protein preserves muscle during a deficit and keeps you fuller longer.` });
  }
  if (sleepFinding && sleepFinding.status !== 'good') {
    suggestions.push({
      rank: suggestions.length + 1, headline: 'Prioritize sleep',
      detail: sleepFinding.avgSleepScore !== null
        ? `Your average sleep score was ${sleepFinding.avgSleepScore}. Poor sleep increases appetite hormones, making fat loss harder even with a consistent calorie deficit.`
        : `You're averaging ${sleepFinding.avgSleepHours}h of sleep. Poor sleep increases hunger hormones and reduces workout motivation -- both work against your goals.`,
    });
  }
  if (macroFinding && macroFinding.lowFiberNote) {
    suggestions.push({ rank: suggestions.length + 1, headline: 'Improve food quality', detail: `Your average fiber was ${macroFinding.avgFiber}g/day vs the recommended 25-38g. Low fiber signals a diet heavy in processed foods. More whole foods improves satiety and long-term results.` });
  }
  if (consistency.status === 'attention') {
    suggestions.push({ rank: suggestions.length + 1, headline: 'Close the logging gaps', detail: `You logged ${Math.round(consistencyRate * 100)}% of days. Unlisted days create gaps in the deficit calculation that the report can't account for.` });
  }
  if (suggestions.length === 0) {
    suggestions.push({ rank: 1, headline: 'Your data looks solid', detail: `Consistency, macros, and sleep all look good over this window. Keep the habits going -- this is what sustained progress looks like.` });
  }

  // ── Summary ──
  let summary = '';
  if (deficitFinding && deficitFinding.actualChangeLbs !== null) {
    const expAbs = (Math.abs(Math.round(deficitFinding.expectedChangeLbs * 10) / 10)).toFixed(1);
    const actAbs = (Math.abs(Math.round(deficitFinding.actualChangeLbs * 10) / 10)).toFixed(1);
    const expDir = goalDirection === 'lose' ? 'lost' : 'gained';
    const actDir = deficitFinding.actualChangeLbs <= 0 ? 'lost' : 'gained';
    summary = `Your logged data suggests you should have ${expDir} about ${expAbs} lbs over the past ${W.weight} days. You actually ${actDir} ${actAbs} lbs. Here's what the data says.`;
  } else if (deficitFinding && avgCals > 0) {
    const defStr = avgDailyDeficit > 0 ? `a ${Math.round(avgDailyDeficit)} cal/day deficit` : `a ${Math.round(Math.abs(avgDailyDeficit))} cal/day surplus`;
    summary = `Your data shows you logged ${defStr} on average over the past ${W.weight} days. Log your weight consistently to compare expected vs actual results.`;
  } else {
    summary = `Your recent data is analyzed below. The more consistently you log, the more accurate these findings become.`;
  }

  // Recovery findings (rec_load_drag / tracks_sleep / sustained_low) come from the hub
  // coach's exact math via a fixed 14-day window, independent of this report's window.
  const recoveryFindings = await computeEvrRecoveryFindings();
  const cards = buildDiagnosticCards(
    { weight: W.weight, weightSpanDays, protein: W.protein, fiber: W.fiber, sleep: W.sleep, consistency: W.consistency },
    deficitFinding, burnAccuracyFinding, macroFinding, sleepFinding, consistency, correlations, recoveryFindings,
  );

  return {
    id: Date.now().toString(),
    generatedAt: new Date().toISOString(),
    windowDays: MAX_WINDOW, dateRangeStart: rangeStart, dateRangeEnd: yesterday, goalDirection, summary,
    deficit: deficitFinding, burnAccuracy: burnAccuracyFinding, consistency,
    macros: macroFinding, sleep: sleepFinding,
    correlations: correlations.length > 0 ? { type: 'correlations', correlations } : null,
    suggestions,
    cards,
    insufficientData: false, minLoggedDays: loggedDays,
    momentumDebug,
  };
}

// ── DEV-ONLY read-only window comparison ─────────────────────────────────────────
// Throwaway diagnostic (NOT shipped UI). For each metric it computes the average over
// the last 7 / 14 / 30 days plus the COUNT of days that actually had data in each
// window, so we can SEE whether the windows tell different stories on real data before
// committing to a multi-window card design. Pure read: never writes a key.
type WinStat = { avg: number | null; n: number };
function pctDiff(a: number | null, b: number | null): number | null {
  if (a == null || b == null || b === 0) return null;
  return Math.round(((a - b) / Math.abs(b)) * 100);
}
function fmtWin(label: string, unit: string, s7: WinStat, s14: WinStat, s30: WinStat): string {
  const f = (s: WinStat) => s.avg == null ? `--   (n=${s.n})` : `${s.avg}${unit} (n=${s.n})`;
  const d = pctDiff(s7.avg, s30.avg);
  const flag = d == null ? '' : (Math.abs(d) >= 10 ? `  <<< 7v30 ${d > 0 ? '+' : ''}${d}%  DIVERGES` : `  (7v30 ${d > 0 ? '+' : ''}${d}%, aligned)`);
  return `${label.padEnd(14)}  7d: ${f(s7).padEnd(16)}  14d: ${f(s14).padEnd(16)}  30d: ${f(s30)}${flag}`;
}

export async function dumpWindowComparison(): Promise<string> {
  let sleepGoal = 8;
  try {
    const profileRaw = await AsyncStorage.getItem('pj_profile');
    if (profileRaw) { const p = JSON.parse(profileRaw); if (p.sleepGoal) sleepGoal = parseFloat(p.sleepGoal); }
  } catch {}

  type Row = {
    protein: number; fiber: number; calories: number; activeCalories: number;
    steps: number; water: number; sleepScore: number | null; weight: number | null;
    excluded: boolean; dateKey: string;
  };
  const rows: Row[] = [];
  for (let i = 1; i <= 30; i++) {
    const dateKey = offsetToDateKey(i);
    let calories = 0, protein = 0, fiber = 0, activeCalories = 0, steps = 0, water = 0;
    let sleepScore: number | null = null, weight: number | null = null, excluded = false;
    try {
      const raw = await AsyncStorage.getItem(`pj_${dateKey}`);
      if (raw) {
        const d = JSON.parse(raw);
        excluded = !!(d.excluded?.diet);
        if (!excluded && d.entries?.length > 0) {
          calories = d.entries.reduce((s: number, e: any) => s + (e.cal || 0), 0);
          protein = d.entries.reduce((s: number, e: any) => s + (e.protein || 0), 0);
          fiber = getEntryNutrient(d.entries, 'Fiber, total dietary');
        }
        if (d.weight) weight = d.weight;
        activeCalories = d.activeCalories || d.caloriesBurned || 0;
        if (d.steps) steps = d.steps;
        if (typeof d.water === 'number') water = d.water;
        const sh = d.sleepOverride || d.sleepHours;
        if (sh) sleepScore = calcSleepScore(sh, d.sleepStages || null, sleepGoal, d.sleepFeelRating ?? null, !!d.sleepOverride, d.sleepConsistencyPts ?? 0).score;
      }
    } catch {}
    rows.push({ protein, fiber, calories, activeCalories, steps, water, sleepScore, weight, excluded, dateKey });
  }

  // rows[0] = yesterday ... rows[29] = 30 days ago. slice(0,n) = most recent n days.
  const win = (n: number, pick: (r: Row) => number | null, isLogged: (r: Row) => boolean): WinStat => {
    const slice = rows.slice(0, n).filter(isLogged);
    const vals = slice.map(pick).filter((v): v is number => v != null);
    return { avg: vals.length ? Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10 : null, n: vals.length };
  };
  const loggedDiet = (r: Row) => !r.excluded && r.calories > 400;

  const lines: string[] = [];
  lines.push('=== WINDOW COMPARISON (read-only) ===');
  lines.push('Avg over each window + (n = days with real data in it).');
  lines.push('"DIVERGES" = 7d differs from 30d by >=10%: a window the current card throws away.');
  lines.push('');
  lines.push(fmtWin('Protein', 'g', win(7, r => r.protein, loggedDiet), win(14, r => r.protein, loggedDiet), win(30, r => r.protein, loggedDiet)));
  lines.push(fmtWin('Fiber', 'g', win(7, r => r.fiber, r => loggedDiet(r) && r.fiber > 0), win(14, r => r.fiber, r => loggedDiet(r) && r.fiber > 0), win(30, r => r.fiber, r => loggedDiet(r) && r.fiber > 0)));
  lines.push(fmtWin('Calories', '', win(7, r => r.calories, loggedDiet), win(14, r => r.calories, loggedDiet), win(30, r => r.calories, loggedDiet)));
  lines.push(fmtWin('Active cal', '', win(7, r => r.activeCalories, r => r.activeCalories > 0), win(14, r => r.activeCalories, r => r.activeCalories > 0), win(30, r => r.activeCalories, r => r.activeCalories > 0)));
  lines.push(fmtWin('Steps', '', win(7, r => r.steps, r => r.steps > 0), win(14, r => r.steps, r => r.steps > 0), win(30, r => r.steps, r => r.steps > 0)));
  lines.push(fmtWin('Water', 'oz', win(7, r => r.water, r => r.water > 0), win(14, r => r.water, r => r.water > 0), win(30, r => r.water, r => r.water > 0)));
  lines.push(fmtWin('Sleep score', '', win(7, r => r.sleepScore, r => r.sleepScore != null), win(14, r => r.sleepScore, r => r.sleepScore != null), win(30, r => r.sleepScore, r => r.sleepScore != null)));
  lines.push('');

  // Weight: the real first->last span inside each window (vs the hardcoded "Over 90 days").
  const weighStat = (n: number): string => {
    const slice = rows.slice(0, n).filter(r => r.weight != null);
    if (slice.length < 2) return `${n}d: ${slice.length} weigh-in(s) -- need >=2`;
    const newest = slice[0], oldest = slice[slice.length - 1];
    const span = Math.abs((new Date(oldest.dateKey).getTime() - new Date(newest.dateKey).getTime()) / 86400000) + 1;
    const change = Math.round((newest.weight! - oldest.weight!) * 10) / 10;
    return `${n}d window: ${slice.length} weigh-ins, REAL span ${Math.round(span)} days, change ${change > 0 ? '+' : ''}${change} lbs`;
  };
  lines.push('--- WEIGHT (real span vs the hardcoded "Over 90 days") ---');
  lines.push(weighStat(7));
  lines.push(weighStat(14));
  lines.push(weighStat(30));

  return lines.join('\n');
}
