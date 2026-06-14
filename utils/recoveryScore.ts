// utils/recoveryScore.ts
// Recovery Score v1 formula. Every signal is compared to the user's personal
// 7-day rolling baseline (not population averages). At baseline = 75 pts.
// Sources: Oura Readiness Score and Whoop Recovery algorithm.

export type RecoveryInput = {
  sleepScore: number | null;
  todayHRV: number | null;
  hrvBaseline: number | null;
  todayRHR: number | null;
  rhrBaseline: number | null;
  yesterdayActiveCal: number | null;
  activCalBaseline: number | null;
  todayResp: number | null;
  respBaseline: number | null;
};

export type RecoveryComponent = {
  value: string;
  score: number;
  delta: string | null;
  isPositive: boolean | null;
};

export type RecoveryResult = {
  score: number | null;
  label: 'PRIMED' | 'STEADY' | 'RECOVER' | null;
  zoneColor: 'good' | 'warn' | 'bad' | null;
  hrv: RecoveryComponent | null;
  sleep: RecoveryComponent | null;
  rhr: RecoveryComponent | null;
  activity: RecoveryComponent | null;
  resp: RecoveryComponent | null;
  isLimitedData: boolean;
};

const NULL_RESULT: RecoveryResult = {
  score: null, label: null, zoneColor: null,
  hrv: null, sleep: null, rhr: null, activity: null, resp: null,
  isLimitedData: true,
};

// Linear component score. Baseline = 75 pts.
// higherIsBetter: HRV = true; RHR, resp rate = false.
// maxDev: fractional deviation for full ±25 pt swing from neutral.
function compScore(today: number, baseline: number, higherIsBetter: boolean, maxDev = 0.3): number {
  const safe = Math.max(0.001, baseline);
  const raw = higherIsBetter ? (today - baseline) / safe : (baseline - today) / safe;
  return Math.max(0, Math.min(100, Math.round(75 + (raw / maxDev) * 25)));
}

// Two-sided: both heavy overload and inactivity hurt recovery.
function actScore(today: number, baseline: number): number {
  const deviation = Math.abs(today - baseline) / Math.max(1, baseline);
  return Math.max(0, Math.min(100, Math.round(75 - deviation * 75)));
}

export function calcRecoveryScore(input: RecoveryInput): RecoveryResult {
  const { sleepScore, todayHRV, hrvBaseline, todayRHR, rhrBaseline,
    yesterdayActiveCal, activCalBaseline, todayResp, respBaseline } = input;

  // Every signal must be a real, finite number to count. A NaN (e.g. a bad
  // sleep-stage read) is treated as missing, never multiplied into the score.
  const hasSleep = sleepScore !== null && Number.isFinite(sleepScore);
  const hasHRV = todayHRV !== null && hrvBaseline !== null && Number.isFinite(todayHRV) && Number.isFinite(hrvBaseline);
  const hasRHR = todayRHR !== null && rhrBaseline !== null && Number.isFinite(todayRHR) && Number.isFinite(rhrBaseline);
  const hasResp = todayResp !== null && respBaseline !== null && Number.isFinite(todayResp) && Number.isFinite(respBaseline);
  const hasActivity = yesterdayActiveCal !== null && activCalBaseline !== null && Number.isFinite(yesterdayActiveCal) && Number.isFinite(activCalBaseline);

  // Minimum-data gate: need at least one trustworthy primary signal (sleep, HRV,
  // or RHR). Resp / activity alone are too weak to anchor a credible score.
  if (!hasSleep && !hasHRV && !hasRHR) return NULL_RESULT;

  const isLimitedData = !hasHRV;

  const sc_hrv = hasHRV ? compScore(todayHRV!, hrvBaseline!, true, 0.3) : null;
  const sc_rhr = hasRHR ? compScore(todayRHR!, rhrBaseline!, false, 0.25) : null;
  const sc_resp = hasResp ? compScore(todayResp!, respBaseline!, false, 0.2) : null;
  const sc_act = hasActivity ? actScore(yesterdayActiveCal!, activCalBaseline!) : null;

  // Each present signal contributes its weight; the total is normalized by the
  // weights actually used, so a missing input (including sleep) redistributes
  // proportionally across the rest instead of poisoning the score.
  const entries: [number, number][] = [];
  if (isLimitedData) {
    // No HRV: reweighted fallback (spec Section 5.5) Sleep 40 / RHR 40 / Resp 20.
    if (hasSleep) entries.push([sleepScore!, 0.40]);
    if (sc_rhr !== null) entries.push([sc_rhr, 0.40]);
    if (sc_resp !== null) entries.push([sc_resp, 0.20]);
  } else {
    // Full v1 formula. Activity Balance (5%) folded into prevDayActivity: 0.17.
    entries.push([sc_hrv!, 0.35]);
    if (hasSleep) entries.push([sleepScore!, 0.22]);
    if (sc_rhr !== null) entries.push([sc_rhr, 0.18]);
    if (sc_act !== null) entries.push([sc_act, 0.17]);
    if (sc_resp !== null) entries.push([sc_resp, 0.08]);
  }
  const totalW = entries.reduce((s, [, w]) => s + w, 0);
  const totalScore = Math.round(entries.reduce((s, [v, w]) => s + v * w, 0) / totalW);

  // Zones calibrated 2026-06-14 from 30d of real data: PRIMED reserved for genuinely
  // strong 80+ days; a normal ~70-79 day reads STEADY, not top-tier. (Was 70 / 55.)
  const label: 'PRIMED' | 'STEADY' | 'RECOVER' = totalScore >= 80 ? 'PRIMED' : totalScore >= 60 ? 'STEADY' : 'RECOVER';
  const zoneColor: 'good' | 'warn' | 'bad' = totalScore >= 80 ? 'good' : totalScore >= 60 ? 'warn' : 'bad';

  const hrv: RecoveryComponent | null = hasHRV ? {
    value: `${Math.round(todayHRV! * 10) / 10}ms`,
    score: sc_hrv!,
    delta: `${todayHRV! >= hrvBaseline! ? '+' : ''}${Math.round(todayHRV! - hrvBaseline!)}ms`,
    isPositive: todayHRV! >= hrvBaseline!,
  } : null;

  const sleep: RecoveryComponent | null = hasSleep ? {
    value: String(Math.round(sleepScore!)),
    score: sleepScore!,
    delta: null,
    isPositive: null,
  } : null;

  const rhr: RecoveryComponent | null = hasRHR ? {
    value: `${Math.round(todayRHR!)} bpm`,
    score: sc_rhr!,
    delta: `${todayRHR! >= rhrBaseline! ? '+' : ''}${Math.round(todayRHR! - rhrBaseline!)} bpm`,
    isPositive: todayRHR! <= rhrBaseline!,
  } : null;

  const activity: RecoveryComponent | null = hasActivity ? {
    value: `${Math.round(yesterdayActiveCal!)} kcal`,
    score: sc_act!,
    delta: `${yesterdayActiveCal! >= activCalBaseline! ? '+' : ''}${Math.round(yesterdayActiveCal! - activCalBaseline!)} kcal`,
    isPositive: Math.abs((yesterdayActiveCal! - activCalBaseline!) / Math.max(1, activCalBaseline!)) <= 0.3,
  } : null;

  const resp: RecoveryComponent | null = hasResp ? {
    value: `${(Math.round(todayResp! * 10) / 10).toFixed(1)} brpm`,
    score: sc_resp!,
    delta: `${todayResp! >= respBaseline! ? '+' : ''}${(Math.round((todayResp! - respBaseline!) * 10) / 10).toFixed(1)} brpm`,
    isPositive: todayResp! <= respBaseline!,
  } : null;

  return { score: totalScore, label, zoneColor, hrv, sleep, rhr, activity, resp, isLimitedData };
}
