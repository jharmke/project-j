// utils/adaptiveTdee.ts
//
// Adaptive TDEE (SPEC_wearable_robustness.md, Phase 2). Estimates the user's REAL daily burn from
// the WEIGHT TREND vs logged intake (the scale is the honest referee; this does NOT read watch
// active-calories, which are too noisy), and produces a SUGGESTED calorie target. Runs on food +
// weight only. Read-only compute: the ONLY thing this feature ever writes is the calorie target,
// and only when the user taps Accept (the same operation as editing the target by hand).
//
// The math (spec): realTDEE = avgDailyIntake - (smoothedWeightChangeLbs/day x 3500). We get the
// smoothed weight change from a least-squares slope over the window's weigh-ins (robust to sparse,
// irregular weigh-in spacing and to single-day water spikes -- serves the same "don't react to
// noise" goal the spec's EMA was for). suggestedTarget = realTDEE + the user's goal pace deficit.
//
// Guards (safety rails): needs >= MIN_WEIGH_INS weigh-ins or it does nothing; if the newest weigh-in
// is >= STALE_WEIGH_DAYS old it HOLDS (status 'stale') and never drifts; only surfaces a change when
// it diverges >= DIVERGENCE_KCAL from the current target; and each suggested move is capped at
// STEP_CAP_KCAL so it eases toward truth instead of lurching.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadCalorieTargets } from './calorieTarget';
import { addNotification } from './notifications';

const KCAL_PER_LB = 3500;
const TREND_WINDOW_DAYS = 35;   // how far back to read weigh-ins + intake
const MIN_WEIGH_INS = 5;        // need at least this many weigh-ins in the window
const MIN_FOOD_DAYS = 14;       // require CONSISTENT logging (2+ weeks) -- the intake average is only
                                // trustworthy if the user actually logs; a scale-based TDEE takes
                                // logged intake at face value, so sparse logging = a bad estimate.
const STALE_WEIGH_DAYS = 10;    // matches EvR's staleness threshold -> hold, don't drift
const DIVERGENCE_KCAL = 150;    // only surface when |suggested - current| >= this
const STEP_CAP_KCAL = 120;      // cap each suggested move (no roller coaster)

export type AdaptiveStatus = 'ok' | 'no_change' | 'stale' | 'insufficient' | 'error';

export interface AdaptiveTdeeResult {
  status: AdaptiveStatus;
  currentTarget: number;
  suggestedTarget: number | null;  // capped + applyable; only set when status === 'ok'
  realTdee: number | null;
  divergence: number | null;       // uncapped (suggested - current), for context
  avgIntake: number | null;
  trendLbsPerWeek: number | null;
  weighIns: number;
  foodDays: number;
  daysSinceWeighIn: number | null;
}

type DayRec = { t: number; weight: number | null; consumed: number | null };

function dkToMs(dk: string): number {
  const [y, m, d] = dk.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1).getTime();
}
function offsetKey(todayKey: string, back: number): string {
  const [y, m, d] = todayKey.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  dt.setDate(dt.getDate() - back);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

async function loadDays(todayKey: string): Promise<DayRec[]> {
  const keys: string[] = [];
  for (let i = 0; i <= TREND_WINDOW_DAYS; i++) keys.push(`pj_${offsetKey(todayKey, i)}`);
  let pairs: readonly [string, string | null][] = [];
  try { pairs = await AsyncStorage.multiGet(keys); } catch { return []; }
  const out: DayRec[] = [];
  for (const [full, raw] of pairs) {
    if (!raw) continue;
    try {
      const d = JSON.parse(raw);
      const excludedDiet = !!(d.excluded && d.excluded.diet);
      const weight = (typeof d.weight === 'number' && d.weight > 0) ? d.weight : null;
      let consumed: number | null = null;
      if (!excludedDiet && Array.isArray(d.entries) && d.entries.length) {
        consumed = d.entries.reduce((s: number, e: any) => s + (e.cal || 0), 0);
      }
      out.push({ t: dkToMs(full.slice(3)), weight, consumed });
    } catch {}
  }
  return out;
}

// Least-squares slope (lbs/day) over the weigh-in points. Robust to irregular spacing.
function slopeLbsPerDay(pts: { t: number; w: number }[]): number | null {
  const n = pts.length;
  if (n < 2) return null;
  const t0 = pts[0].t;
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (const p of pts) {
    const x = (p.t - t0) / 86400000;
    sx += x; sy += p.w; sxx += x * x; sxy += x * p.w;
  }
  const den = n * sxx - sx * sx;
  if (den === 0) return null;
  return (n * sxy - sx * sy) / den;
}

const empty = (status: AdaptiveStatus, currentTarget: number, extra: Partial<AdaptiveTdeeResult> = {}): AdaptiveTdeeResult => ({
  status, currentTarget, suggestedTarget: null, realTdee: null, divergence: null,
  avgIntake: null, trendLbsPerWeek: null, weighIns: 0, foodDays: 0, daysSinceWeighIn: null, ...extra,
});

export async function computeAdaptiveTdee(todayKey: string): Promise<AdaptiveTdeeResult> {
  try {
    const { calTarget, paceDeficit } = await loadCalorieTargets(todayKey);
    if (!calTarget || calTarget <= 0) return empty('error', 0);

    const days = await loadDays(todayKey);
    const weighIns = days.filter(d => d.weight != null).map(d => ({ t: d.t, w: d.weight as number })).sort((a, b) => a.t - b.t);
    const foodVals = days.filter(d => d.consumed != null && (d.consumed as number) > 0).map(d => d.consumed as number);
    const avgIntake = foodVals.length ? Math.round(foodVals.reduce((s, v) => s + v, 0) / foodVals.length) : null;
    const daysSinceWeighIn = weighIns.length ? Math.floor((dkToMs(todayKey) - weighIns[weighIns.length - 1].t) / 86400000) : null;

    const base = { weighIns: weighIns.length, foodDays: foodVals.length, avgIntake, daysSinceWeighIn };

    if (weighIns.length < MIN_WEIGH_INS || foodVals.length < MIN_FOOD_DAYS) {
      return empty('insufficient', calTarget, base);
    }

    const slope = slopeLbsPerDay(weighIns);
    if (slope == null || avgIntake == null) return empty('error', calTarget, base);

    const realTdee = Math.round(avgIntake - slope * KCAL_PER_LB);
    const divergence = Math.round(realTdee + paceDeficit) - calTarget;
    const trendLbsPerWeek = Math.round(slope * 7 * 10) / 10;
    const math = { realTdee, divergence, trendLbsPerWeek };

    // Stale weigh-ins: HOLD. Show the math for transparency, but never suggest a change or drift.
    if (daysSinceWeighIn != null && daysSinceWeighIn >= STALE_WEIGH_DAYS) {
      return { ...empty('stale', calTarget, base), ...math };
    }
    if (Math.abs(divergence) < DIVERGENCE_KCAL) {
      return { ...empty('no_change', calTarget, base), ...math };
    }
    const step = Math.max(-STEP_CAP_KCAL, Math.min(STEP_CAP_KCAL, divergence));
    return { ...empty('ok', calTarget, base), ...math, suggestedTarget: calTarget + step };
  } catch {
    return empty('error', 0);
  }
}

// Weekly-gated background check, called on Home mount. SUGGEST by default (posts a Type-A hub
// notification); if the user opted into auto-adjust it applies silently; in Mindful mode it never
// posts a visible nudge (per the mode contract). Safe + silent: writes only the once-per-week gate,
// plus the target itself only in the auto-adjust case.
export async function maybeRunAdaptiveTdee(tKey: string): Promise<void> {
  try {
    const last = await AsyncStorage.getItem('pj_adaptive_tdee_lastrun');
    if (last) {
      const days = Math.floor((dkToMs(tKey) - dkToMs(last)) / 86400000);
      if (days < 7) return; // weekly cadence
    }
    let styleMode = 'Balanced';
    let auto = false;
    try {
      const s = await AsyncStorage.getItem('pj_settings');
      if (s) { const p = JSON.parse(s); styleMode = p.styleMode || 'Balanced'; auto = p.adaptiveTdeeAuto === true; }
    } catch {}

    const r = await computeAdaptiveTdee(tKey);
    await AsyncStorage.setItem('pj_adaptive_tdee_lastrun', tKey); // stamp regardless (don't recompute every open)

    if (r.status !== 'ok' || r.suggestedTarget == null) return;

    if (auto) { await applyAdaptiveTarget(r.suggestedTarget); return; } // opted-in: quiet, no callout
    if (styleMode === 'Mindful') return;                                // Mindful: no visible nudge

    await addNotification({
      id: 'tdee_suggestion',
      lifecycle: 'replace',
      category: 'tdee_suggestion',
      title: 'Your target may need a bump',
      body: `Your recent trend points to about ${r.realTdee} kcal burned a day. Tap to review a suggested target.`,
      icon: 'trending-up',
      iconColor: '#3b82f6',
      route: { pathname: '/adaptive-target' },
    });
  } catch {}
}

// Apply an accepted suggestion: the ONLY target write this feature makes. Sets the manual calorie
// target (same operation as typing a new target in Settings) via read-then-merge on pj_profile.
export async function applyAdaptiveTarget(newTarget: number): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem('pj_profile');
    const profile = raw ? JSON.parse(raw) : {};
    profile.calTarget = String(Math.round(newTarget));
    profile.useRecommendedCal = false; // the accepted number is now the manual target
    await AsyncStorage.setItem('pj_profile', JSON.stringify(profile));
    return true;
  } catch { return false; }
}
