// utils/hrZones.ts
// HR Zone Training calculation engine. Pure functions, no I/O. See SPEC_hr_zones.md.
//
// Locked model (Justin 2026-06-23):
//  - Zone model: %HRR (Karvonen) default, %Max HR toggle.
//  - Max HR: Tanaka (208 - 0.7*age) estimate, auto-raised to observed workout peak,
//    manual override always wins. Source is surfaced (honest-numbers).
//  - Universal 5-zone split at 50/60/70/80/90/100%.
//
// Zone colors are the universal HR convention (blue -> green -> amber -> orange -> red),
// deliberately NOT themed: zones are a standard language like traffic lights. Verify they
// read on all 5 themes during the audit.

export interface ZoneDef {
  z: number;        // 1..5
  name: string;
  loPct: number;    // lower bound as fraction of max (or reserve)
  hiPct: number;
  color: string;
}

export const HR_ZONES: ZoneDef[] = [
  { z: 1, name: 'Warm Up',   loPct: 0.50, hiPct: 0.60, color: '#3b82f6' }, // blue
  { z: 2, name: 'Fat Burn',  loPct: 0.60, hiPct: 0.70, color: '#0d9268' }, // green
  { z: 3, name: 'Cardio',    loPct: 0.70, hiPct: 0.80, color: '#d4860a' }, // amber
  { z: 4, name: 'Threshold', loPct: 0.80, hiPct: 0.90, color: '#e2622e' }, // orange
  { z: 5, name: 'Peak',      loPct: 0.90, hiPct: 1.00, color: '#cc3333' }, // red
];

export type HRZoneModel = 'hrr' | 'maxhr';
export type MaxHRSource = 'manual' | 'observed' | 'estimated';

export interface HRSample { t: number; v: number; } // t = ms epoch, v = bpm

export interface ZoneBound { z: number; name: string; lo: number; hi: number; color: string; }

// Tanaka (208 - 0.7*age): the validated best age-based estimate (NOT 220-age).
export function tanakaMaxHR(age: number): number {
  return Math.round(208 - 0.7 * age);
}

// Resolve the max HR to use + where it came from. Manual override wins; otherwise use the
// observed workout peak when it exceeds the age estimate (Garmin/Whoop behavior); else estimate.
export function resolveMaxHR(opts: {
  age: number | null;
  manualOverride?: number | null;
  observedPeak?: number | null;
}): { value: number | null; source: MaxHRSource } {
  const { age, manualOverride, observedPeak } = opts;
  if (manualOverride && manualOverride > 0) return { value: Math.round(manualOverride), source: 'manual' };
  const est = age && age > 0 ? tanakaMaxHR(age) : null;
  if (observedPeak && observedPeak > 0 && (est === null || observedPeak > est)) {
    return { value: Math.round(observedPeak), source: 'observed' };
  }
  if (est !== null) return { value: est, source: 'estimated' };
  return { value: null, source: 'estimated' };
}

// bpm bounds per zone for the active model. %HRR uses resting HR (Karvonen); falls back to
// %Max HR if resting HR is missing/invalid even when model is 'hrr', so it never breaks.
export function zoneBounds(maxHR: number, restingHR: number | null, model: HRZoneModel): ZoneBound[] {
  const useHRR = model === 'hrr' && restingHR != null && restingHR > 0 && restingHR < maxHR;
  const reserve = useHRR ? maxHR - (restingHR as number) : 0;
  return HR_ZONES.map(zd => {
    const lo = useHRR ? Math.round(reserve * zd.loPct + (restingHR as number)) : Math.round(maxHR * zd.loPct);
    const hi = useHRR ? Math.round(reserve * zd.hiPct + (restingHR as number)) : Math.round(maxHR * zd.hiPct);
    return { z: zd.z, name: zd.name, lo, hi, color: zd.color };
  });
}

// Which zone (1..5) a bpm falls in; 0 = below Z1 (uncounted/rest).
export function zoneForValue(bpm: number, bounds: ZoneBound[]): number {
  if (!bounds.length || bpm < bounds[0].lo) return 0;
  for (let i = bounds.length - 1; i >= 0; i--) {
    if (bpm >= bounds[i].lo) return bounds[i].z;
  }
  return 0;
}

// Long gaps (auto-pause, dropout) get clamped so a stop doesn't dump minutes into one zone.
const MAX_GAP_SEC = 30;

export interface TimeInZoneResult {
  secs: number[];      // index 0..4 = Z1..Z5, seconds
  belowZ1: number;     // seconds below Z1 (uncounted)
  total: number;       // total attributed seconds (incl. belowZ1)
  peak: number | null; // peak bpm seen
}

// Time in each zone from timestamped HR samples. Attributes the interval between consecutive
// samples to the EARLIER sample's zone (standard approach for irregular sampling).
export function timeInZones(samples: HRSample[], bounds: ZoneBound[]): TimeInZoneResult {
  const secs = [0, 0, 0, 0, 0];
  let belowZ1 = 0;
  let peak: number | null = null;
  const sorted = [...samples].filter(s => Number.isFinite(s.v) && s.v > 0).sort((a, b) => a.t - b.t);
  for (let i = 0; i < sorted.length; i++) {
    if (peak === null || sorted[i].v > peak) peak = sorted[i].v;
    if (i === sorted.length - 1) break;
    let dt = (sorted[i + 1].t - sorted[i].t) / 1000;
    if (dt <= 0) continue;
    if (dt > MAX_GAP_SEC) dt = MAX_GAP_SEC;
    const z = zoneForValue(sorted[i].v, bounds);
    if (z === 0) belowZ1 += dt; else secs[z - 1] += dt;
  }
  const total = secs.reduce((a, b) => a + b, 0) + belowZ1;
  return { secs, belowZ1, total, peak };
}

// "m:ss" for a zone duration.
export function fmtZoneTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export interface ZoneDebrief {
  key: 'intensity' | 'cardio' | 'aerobic' | 'mixed';
  headline: string;
  body: string;
}

// A short written read of a workout's character from where its time landed across the
// zones (NOT a numbers recap, the bars already show that). Deterministic / rule based.
// secs = Z1..Z5 in-zone seconds; below-zone time is ignored so standing around does not
// dilute the read. Mode aware: Discipline + Balanced share the performance voice, Mindful
// softens to observational (no push, no recovery-debt nudge). Returns null when there is
// too little tracked zone time to say anything honest.
export function zoneDebrief(secs: number[], styleMode: string): ZoneDebrief | null {
  const s = secs.map(v => v || 0);
  const inZone = s[0] + s[1] + s[2] + s[3] + s[4];
  if (inZone < 60) return null;
  const pLow = (s[0] + s[1]) / inZone;   // Z1 Warm Up + Z2 Fat Burn
  const pMid = s[2] / inZone;            // Z3 Cardio
  const pHigh = (s[3] + s[4]) / inZone;  // Z4 Threshold + Z5 Peak
  const mindful = styleMode === 'mindful';

  if (pHigh >= 0.30) {
    return mindful
      ? { key: 'intensity', headline: 'A Hard Effort', body: 'You spent real time in your higher zones today. Let your body settle and recover when it asks for it.' }
      : { key: 'intensity', headline: 'Real Intensity Today', body: 'A solid share of this lived in your Threshold and Peak zones, the effort that lifts your top end. Give recovery the same respect you gave the work.' };
  }
  if (pMid >= 0.40) {
    return mindful
      ? { key: 'cardio', headline: 'Steady Cardio', body: 'You held a steady working pace through most of this. Nice rhythm.' }
      : { key: 'cardio', headline: 'Strong Cardio Session', body: 'You held a sustained moderate to hard effort in your Cardio zone, the bread and butter of cardiovascular fitness.' };
  }
  if (pLow >= 0.60) {
    return mindful
      ? { key: 'aerobic', headline: 'Easy Aerobic Day', body: 'You kept this at an easy, steady effort. Gentle on the body and still good for you.' }
      : { key: 'aerobic', headline: 'Aerobic Base Work', body: 'Most of this sat in your easier aerobic zones, the steady effort that builds your endurance base and burns fat at a low recovery cost.' };
  }
  return mindful
    ? { key: 'mixed', headline: 'A Bit of Everything', body: 'Your effort moved across a range of zones today. A nice mix.' }
    : { key: 'mixed', headline: 'Mixed Effort', body: 'Your time spread across easy and harder zones today, a versatile session that touches a bit of everything.' };
}

// Age from a stored birthday string (mirrors settings.tsx BMR age parse).
export function ageFromBirthday(birthday: string | null | undefined): number | null {
  if (!birthday) return null;
  const parts = birthday.split(/[-\/T]/);
  const isISO = birthday.includes('-') && parts[0]?.length === 4;
  const birthDate = isISO ? new Date(`${parts[0]}-${parts[1]}-${parts[2]}`) : new Date(birthday);
  if (isNaN(birthDate.getTime())) return null;
  const age = Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 3600 * 1000));
  return age > 0 && age < 120 ? age : null;
}
