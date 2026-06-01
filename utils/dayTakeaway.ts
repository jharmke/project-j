// utils/dayTakeaway.ts
// Day Takeaway engine (TRIGGER_LIBRARY.md Section 12). Computes the single most
// worth-saying line for a completed day's summary. Replaces both the retired win
// line and coach note from daySummaryCopy.ts. Ungated -- every user sees it.
// Stored on pj_YYYY-MM-DD alongside dayScore; recomputes on data edit.
// Spec: SPEC_smart_tips.md 15.1, TRIGGER_LIBRARY.md Section 12.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { storageSet } from './storage';
import { DayScore, StyleMode } from './dayScore';

const TAKEAWAY_VERSION = 1;

// Sub-component max points (mirrors dayScore.ts constants)
const CAL_MAX = 55, PROTEIN_MAX = 28, WATER_MAX = 17;

// Notable bands (spec 12.2.2)
const STRONG_THRESHOLD = 0.90;
const WEAK_THRESHOLD   = 0.60;

export interface DayTakeawayPick {
  takeawayId: string;
  body: string;
  metric: string;
  direction: 'strong' | 'gap' | 'balanced' | 'thin' | 'fallback';
}

export interface StoredDayTakeaway {
  primary: DayTakeawayPick;
  positiveSafe: DayTakeawayPick | null;
  computedAt: string;
  version: number;
}

// ── Copy pools (TRIGGER_LIBRARY.md 12.9) ─────────────────────────────────────

const CORRECTIVE: Record<string, string[]> = {
  takeaway_cal_gap: [
    'Strong day overall. Calories were the one piece that drifted.',
    'Good day, but intake ran past your goal pace.',
    'Most of today landed. Calories were the gap.',
  ],
  takeaway_protein_gap: [
    'Solid day. Protein was the one that came up short.',
    'Good day overall, protein lagged the rest.',
    'Today held together well, protein aside.',
  ],
  takeaway_water_gap: [
    'Good day. Hydration was the soft spot.',
    'Most of today was on point. Water fell behind.',
    'Strong day, water was the one to nudge.',
  ],
  takeaway_activity_gap: [
    'Good day. Movement was lighter than the rest of it.',
    'Today mostly landed, activity was the quiet piece.',
    'Strong elsewhere, the body got a lighter day.',
  ],
  takeaway_sleep_gap: [
    'Good day, but recovery was the weak link.',
    'Most of today was strong. Sleep was the gap.',
    'Solid day, sleep aside.',
  ],
};

const POSITIVE: Record<string, string[]> = {
  takeaway_cal_strong: [
    'Calories were dialed in today.',
    'Right on your goal pace. That is the lever that matters.',
    'Intake was exactly where you wanted it.',
  ],
  takeaway_protein_strong: [
    'Protein led the way today.',
    'You fueled this day well. Protein was the standout.',
    'Strong protein day, the foundation was there.',
  ],
  takeaway_water_strong: [
    'Hydration carried this day.',
    'Water was on point all day.',
    'You stayed ahead on hydration.',
  ],
  takeaway_activity_strong: [
    'Activity carried this day.',
    'The body did the work today.',
    'Movement was the highlight.',
  ],
  takeaway_sleep_strong: [
    'Sleep carried this day.',
    'Recovery was the standout. Your body got what it needed.',
    'Sleep was the win today.',
  ],
};

const CORRECTIVE_MINDFUL: Record<string, string[]> = {
  takeaway_cal_gap: [
    'A lot went right today. Eating ran a little fuller than usual, worth a gentle eye.',
    'Good day overall. Food was the one area that drifted a touch.',
  ],
  takeaway_protein_gap: [
    'Today held together nicely. Protein was a little lighter than your other days.',
    'A good day. Protein is the one spot with a bit of room.',
  ],
  takeaway_water_gap: [
    'Nice day overall. Hydration was a little light, easy to top up tomorrow.',
    'Good day. Water was the gentle reminder today.',
  ],
  takeaway_activity_gap: [
    'A good day. Your body had a quieter one, which is part of the rhythm too.',
    'Today mostly landed. Movement was lighter, and that is okay.',
  ],
  takeaway_sleep_gap: [
    'Good day. Rest was a little uneven, even small bedtime shifts help.',
    'Today went well. Sleep was the soft spot, worth a little care.',
  ],
};

const BALANCED_POOL = [
  'Solid, even day. Nothing stood out, in a good way.',
  'A steady one across the board today.',
  'Balanced day. Everything landed in a good place.',
];

const THIN_POOL = [
  'Light logging today, so this is just a partial read.',
  'Not much logged today. What is here looks fine.',
  'A quiet logging day. A bit more would sharpen the picture.',
];

const WARM_FALLBACK_POOL = [
  'Every day is part of the bigger picture. Tomorrow is a fresh start.',
  'Some days are about just showing up. That counts.',
  'Progress is not a straight line. You are still moving.',
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function simpleHash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return h >>> 0;
}

function deterministicVariant(pool: string[], dateKey: string, id: string): string {
  if (!pool.length) return '';
  const idx = simpleHash(`${dateKey}:${id}`) % pool.length;
  return pool[idx];
}

// Goal importance tiers per spec 12.2.1
type GoalBucket = 'lose' | 'maintain' | 'gain';
type MetricKey = 'cal' | 'protein' | 'water' | 'activity' | 'sleep';

const GOAL_TIERS: Record<GoalBucket, MetricKey[][]> = {
  lose:     [['cal', 'protein'], ['activity', 'sleep'], ['water']],
  gain:     [['cal', 'protein'], ['sleep', 'activity'], ['water']],
  maintain: [['cal', 'protein', 'activity', 'sleep'], ['water']],
};

function goalBucket(weightGoal: string): GoalBucket {
  if (weightGoal.startsWith('lose')) return 'lose';
  if (weightGoal.startsWith('gain')) return 'gain';
  return 'maintain';
}

// ── Standout picker ───────────────────────────────────────────────────────────

interface SubPiece { key: MetricKey; fill: number; hasData: boolean }

function buildSubPieces(score: DayScore): SubPiece[] {
  const pieces: SubPiece[] = [];
  const nd = score.nutritionDetail;
  const ad = score.activityDetail;
  const sd = score.sleepDetail;

  if (score.nutritionScore !== null && nd) {
    if (nd.calorieScore > 0 || nd.calorieHit) {
      pieces.push({ key: 'cal', fill: nd.calorieHit ? 1 : nd.calorieScore / CAL_MAX, hasData: true });
    }
    if (nd.proteinScore > 0) {
      pieces.push({ key: 'protein', fill: Math.min(1, nd.proteinScore / PROTEIN_MAX), hasData: true });
    }
    if (nd.waterScore > 0) {
      pieces.push({ key: 'water', fill: Math.min(1, nd.waterScore / WATER_MAX), hasData: true });
    }
  }
  if (score.activityScore !== null && ad) {
    pieces.push({ key: 'activity', fill: Math.min(1, (score.activityScore || 0) / 100), hasData: true });
  }
  if (score.sleepScore !== null && sd) {
    pieces.push({ key: 'sleep', fill: Math.min(1, sd.rawSleepScore / 100), hasData: true });
  }
  return pieces;
}

function selectStandout(
  pieces: SubPiece[],
  bucket: GoalBucket,
  preferPositive: boolean,
): { key: MetricKey; direction: 'strong' | 'gap' } | null {
  if (!pieces.length) return null;
  const avgFill = pieces.reduce((s, p) => s + p.fill, 0) / pieces.length;
  const tiers = GOAL_TIERS[bucket];

  for (const tier of tiers) {
    const tierPieces = pieces.filter(p => tier.includes(p.key));
    const notableStrong = tierPieces.filter(p => p.fill >= STRONG_THRESHOLD);
    const notableWeak   = tierPieces.filter(p => p.fill < WEAK_THRESHOLD);

    if (!notableStrong.length && !notableWeak.length) continue;

    // When both exist: if preferPositive or the strong one is goal-critical, lead positive
    if (notableStrong.length && notableWeak.length) {
      if (preferPositive) {
        const best = [...notableStrong].sort((a, b) => Math.abs(b.fill - avgFill) - Math.abs(a.fill - avgFill))[0];
        return { key: best.key, direction: 'strong' };
      }
      // Corrective: pick whichever is furthest from average
      const allNotable = [...notableStrong.map(p => ({ ...p, dir: 'strong' as const })), ...notableWeak.map(p => ({ ...p, dir: 'gap' as const }))];
      const winner = allNotable.sort((a, b) => Math.abs(b.fill - avgFill) - Math.abs(a.fill - avgFill))[0];
      return { key: winner.key, direction: winner.dir };
    }

    if (notableStrong.length) {
      const best = [...notableStrong].sort((a, b) => Math.abs(b.fill - avgFill) - Math.abs(a.fill - avgFill))[0];
      return { key: best.key, direction: 'strong' };
    }
    if (notableWeak.length) {
      const best = [...notableWeak].sort((a, b) => Math.abs(a.fill - avgFill) - Math.abs(b.fill - avgFill))[0]; // furthest below
      return { key: best.key, direction: 'gap' };
    }
  }

  return null;
}

// ── Build a takeaway pick ─────────────────────────────────────────────────────

function buildPick(
  key: MetricKey,
  direction: 'strong' | 'gap',
  dateKey: string,
  isMindful: boolean,
  growthAreas: boolean,
): DayTakeawayPick {
  const takeawayId = `takeaway_${key}_${direction}`;

  let pool: string[];
  if (direction === 'strong') {
    pool = POSITIVE[`takeaway_${key}_strong`] ?? POSITIVE['takeaway_cal_strong'];
  } else {
    pool = isMindful && !growthAreas
      ? (CORRECTIVE_MINDFUL[`takeaway_${key}_gap`] ?? CORRECTIVE_MINDFUL['takeaway_cal_gap'])
      : (CORRECTIVE[`takeaway_${key}_gap`] ?? CORRECTIVE['takeaway_cal_gap']);
  }

  const body = deterministicVariant(pool, dateKey, takeawayId);
  return { takeawayId, body, metric: key, direction };
}

// ── Main compute ──────────────────────────────────────────────────────────────

export async function computeAndStoreDayTakeaway(
  dateKey: string,
  score: DayScore,
  weightGoal: string,
  styleMode: StyleMode,
  mindfulGrowthAreas: boolean,
): Promise<StoredDayTakeaway> {
  const isMindful = styleMode === 'mindful';
  const bucket = goalBucket(weightGoal);
  const pieces = buildSubPieces(score);

  let primary: DayTakeawayPick;
  let positiveSafe: DayTakeawayPick | null = null;

  if (pieces.filter(p => p.hasData).length <= 1) {
    // Thin-data: too few pieces
    const body = deterministicVariant(THIN_POOL, dateKey, 'takeaway_thin');
    primary = { takeawayId: 'takeaway_thin', body, metric: '', direction: 'thin' };
    positiveSafe = primary;
  } else {
    // Pick primary (can be corrective or positive)
    const standout = selectStandout(pieces, bucket, false);
    if (!standout) {
      // Balanced day: all pieces between 60-90%
      const body = deterministicVariant(BALANCED_POOL, dateKey, 'takeaway_balanced');
      primary = { takeawayId: 'takeaway_balanced', body, metric: '', direction: 'balanced' };
      positiveSafe = primary;
    } else {
      primary = buildPick(standout.key, standout.direction, dateKey, isMindful, mindfulGrowthAreas);

      // Build positiveSafe: best positive pick ignoring corrective candidates
      if (standout.direction === 'gap') {
        const positiveStandout = selectStandout(pieces, bucket, true);
        if (positiveStandout && positiveStandout.direction === 'strong') {
          positiveSafe = buildPick(positiveStandout.key, 'strong', dateKey, false, false);
        } else {
          // No positive standout: warm fallback
          const body = deterministicVariant(WARM_FALLBACK_POOL, dateKey, 'takeaway_warm_fallback');
          positiveSafe = { takeawayId: 'takeaway_warm_fallback', body, metric: '', direction: 'fallback' };
        }
      } else {
        positiveSafe = primary;
      }
    }
  }

  const result: StoredDayTakeaway = {
    primary, positiveSafe, computedAt: new Date().toISOString(), version: TAKEAWAY_VERSION,
  };

  // Read-then-merge: write only the dayTakeaway field onto the existing record
  try {
    const raw = await AsyncStorage.getItem(`pj_${dateKey}`);
    if (raw) {
      const cur = JSON.parse(raw);
      await storageSet(`pj_${dateKey}`, JSON.stringify({ ...cur, dayTakeaway: result }));
    }
  } catch {}

  return result;
}

// Public: returns the stored takeaway, computing it if missing or stale.
export async function ensureDayTakeaway(
  dateKey: string,
  score: DayScore,
  weightGoal: string,
  styleMode: StyleMode,
  mindfulGrowthAreas = false,
): Promise<StoredDayTakeaway> {
  try {
    const raw = await AsyncStorage.getItem(`pj_${dateKey}`);
    if (raw) {
      const day = JSON.parse(raw);
      const stored: StoredDayTakeaway | undefined = day.dayTakeaway;
      if (stored && stored.version === TAKEAWAY_VERSION) return stored;
    }
  } catch {}
  return computeAndStoreDayTakeaway(dateKey, score, weightGoal, styleMode, mindfulGrowthAreas);
}

// Render-time: which pick to show given current mode.
export function resolveTakeawayBody(
  takeaway: StoredDayTakeaway,
  isMindful: boolean,
  growthAreasOn: boolean,
): string {
  if (!isMindful || growthAreasOn) return takeaway.primary.body;
  return (takeaway.positiveSafe ?? takeaway.primary).body;
}
