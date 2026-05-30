// utils/sleepScore.ts
// Single source of truth for the sleep score formula.
// Extracted verbatim from app/(tabs)/index.tsx (the canonical home version) so
// Day Score and home read the exact same number. Pure function, no side effects.
//
// NOTE: head-to-head.tsx and diagnosticReport.ts still carry their own divergent
// copies (head-to-head omits bedtime consistency pts on feel nights, diagnostic
// uses a linear duration curve). Consolidating those is a separate roadmap item;
// do not assume every screen matches this until that cleanup ships.

export interface SleepStages {
  core: number;
  deep: number;
  rem: number;
  totalMs: number;
}

export function calcSleepScore(
  sleepHours: number | null,
  sleepStages: SleepStages | null,
  sleepGoal: number,
  feelRating?: number | null,
  isManual?: boolean,
  consistencyPts = 0,
): { score: number | null; hasStages: boolean; path: 1 | 2 | 3 } {
  if (!sleepHours || sleepHours <= 0) return { score: null, hasStages: false, path: 3 };

  // Path 1: HealthKit hours plus stages
  if (sleepStages && sleepStages.totalMs > 0) {
    const durationPts = Math.min(40, Math.pow(sleepHours / sleepGoal, 3) * 40);
    const totalMs = sleepStages.totalMs;
    const deepPct = sleepStages.deep / totalMs;
    const remPct = sleepStages.rem / totalMs;
    const deepIdeal = 0.20;
    const deepDiff = Math.abs(deepPct - deepIdeal);
    const deepPts = Math.max(0, 30 - (deepDiff / deepIdeal) * 30);
    const remIdeal = 0.22;
    const remPts = Math.min(30, Math.max(0, (remPct / remIdeal) * 30));
    return { score: Math.round(durationPts + deepPts + remPts), hasStages: true, path: 1 };
  }

  // Path 2 (HealthKit hours only) or Path 3 (manual): feel rating required
  const path = isManual ? 3 : 2;
  if (!feelRating) return { score: null, hasStages: false, path };
  const durationPts = Math.min(60, (sleepHours / sleepGoal) * 60);
  const feelPts = ((feelRating - 1) / 9) * 30;
  return { score: Math.round(Math.min(100, durationPts + feelPts + consistencyPts)), hasStages: false, path };
}
