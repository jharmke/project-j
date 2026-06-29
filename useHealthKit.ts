import {
    getMostRecentQuantitySample,
    isHealthDataAvailable,
    queryCategorySamples,
    queryQuantitySamples,
    queryStatisticsForQuantity,
    queryWorkoutSamples,
    requestAuthorization,
} from '@kingstinct/react-native-healthkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { formatWorkoutDuration, WORKOUT_TYPE_NAMES } from './workoutData';
import { storageSet } from './utils/storage';

// ── Apple Health workout backfill / recovery ──────────────────────────────────
// Re-imports Apple Health workouts over the last `days` days and merges them into
// pj_workout_state, each marked COMPLETED (faithful to the daily auto-import). This
// is purely ADDITIVE: it reads current state, ADDS any workout not already present
// (deduped by Apple's workout UUID), and writes back. It NEVER deletes or blind-
// overwrites, and it touches ONLY pj_workout_state. Used today as the recovery tool;
// reused later as the "backfill on reinstall" feature so a fresh install rebuilds
// full workout history from Apple Health (the source of truth). Returns counts.
const APPLE_LIFT_TYPES = new Set([20, 50, 59]); // Functional / Traditional Strength, Core Training

// Faithful copy of workout.tsx's local formatDuration so re-imported rows match the
// daily import byte-for-byte (mm:ss, or h:mm:ss past an hour).
const fmtWorkoutDur = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
};

const localDayKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export async function restoreAppleWorkoutHistory(
  days: number,
): Promise<{ imported: number; markedComplete: number; total: number; days: number }> {
  const now = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const workouts = await queryWorkoutSamples({
    limit: 5000,
    filter: { date: { startDate, endDate: now } },
  });

  // Read-then-merge: load current state, never start from scratch.
  const raw = await AsyncStorage.getItem('pj_workout_state');
  const state = raw ? JSON.parse(raw) : {};
  const programs: Record<string, any> = state.programs ? { ...state.programs } : {};
  const checks: Record<string, any> = state.checks ? { ...state.checks } : {};

  let imported = 0;
  let markedComplete = 0;

  for (const w of workouts) {
    const dateKey = localDayKey(new Date(w.startDate));
    const day = programs[dateKey]
      ? { ...programs[dateKey] }
      : { type: 'cardio', focus: 'Cardio', exercises: [] };
    const exercises: any[] = Array.isArray(day.exercises) ? [...day.exercises] : [];
    const existingUUIDs = new Set(exercises.map((e: any) => e.appleHealthUUID).filter(Boolean));

    const exId = `apple_${w.uuid}`;
    if (!existingUUIDs.has(w.uuid)) {
      const distanceMi = w.totalDistance
        ? Math.round((w.totalDistance.quantity / 1609.34) * 100) / 100
        : null;
      exercises.push({
        id: exId,
        name: WORKOUT_TYPE_NAMES[w.workoutActivityType] ?? 'Workout',
        sets: '', reps: '', rest: '', note: '',
        isCardio: !APPLE_LIFT_TYPES.has(w.workoutActivityType),
        duration: String(fmtWorkoutDur(w.duration?.quantity ?? 0)),
        distance: distanceMi ? String(distanceMi) : '',
        calories: String(Math.round(w.totalEnergyBurned?.quantity ?? 0)),
        fromAppleHealth: true,
        appleHealthUUID: w.uuid,
        appleStartDate: w.startDate,
      });
      imported++;
    }

    // An Apple workout means the day wasn't a rest day; flip rest -> cardio so rows
    // aren't hidden (mirrors the daily import).
    if (day.type === 'rest') { day.type = 'cardio'; day.focus = 'Cardio'; }
    day.exercises = exercises;
    programs[dateKey] = day;

    // Mark COMPLETED. Also repairs an already-present-but-unchecked import (today's).
    if (!checks[dateKey]?.[exId]) markedComplete++;
    checks[dateKey] = { ...(checks[dateKey] || {}), [exId]: true };
  }

  await storageSet('pj_workout_state', JSON.stringify({ ...state, programs, checks }));
  return { imported, markedComplete, total: workouts.length, days };
}

export function useHealthKit() {
  const [authorized, setAuthorized] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null); // ms epoch of last successful HealthKit pull
  const [activeCalories, setActiveCalories] = useState(0);
  const [steps, setSteps] = useState(0);
  const [distance, setDistance] = useState(0);
  const [sleepHours, setSleepHours] = useState<number | null>(null);
  const [sleepStages, setSleepStages] = useState<{ core: number, deep: number, rem: number, totalMs: number } | null>(null);
  const [sleepTimes, setSleepTimes] = useState<{ bed: string, wake: string } | null>(null);
  const [sleepAwakeMs, setSleepAwakeMs] = useState<number>(0);
  const [sleepAwakeCount, setSleepAwakeCount] = useState<number>(0); // awake events last night (one per awake segment)
  const [vo2Max, setVo2Max] = useState<number | null>(null);
  const [cardioRecovery, setCardioRecovery] = useState<number | null>(null);
  const [restingHR, setRestingHR] = useState<number | null>(null);
  const [respiratoryRate, setRespiratoryRate] = useState<number | null>(null);
  const [bloodOxygen, setBloodOxygen] = useState<number | null>(null);
  const [hrv, setHrv] = useState<number | null>(null);
  const [exerciseMinutes, setExerciseMinutes] = useState<number | null>(null);
  // LOCAL date (Y-M-D) the core activity metrics (steps/cals/exercise) were last pulled FOR.
  // Lets goal detection confirm the numbers belong to today before firing, so it can never fire
  // on yesterday's leftover values during a warm-app date rollover.
  const [activityDataDate, setActivityDataDate] = useState<string>('');
  const [appleWorkouts, setAppleWorkouts] = useState<readonly any[]>([]);

  useEffect(() => {
    const init = async () => {
      try {
        const isAvailable = await isHealthDataAvailable();
        if (!isAvailable) return;

        await requestAuthorization({
          toRead: [
            'HKQuantityTypeIdentifierActiveEnergyBurned',
            'HKQuantityTypeIdentifierStepCount',
            'HKQuantityTypeIdentifierDistanceWalkingRunning',
            'HKQuantityTypeIdentifierVO2Max',
            'HKQuantityTypeIdentifierHeartRateRecoveryOneMinute',
            'HKCategoryTypeIdentifierSleepAnalysis',
            'HKWorkoutTypeIdentifier',
            'HKQuantityTypeIdentifierHeartRate',
            'HKQuantityTypeIdentifierBodyMass',
            'HKQuantityTypeIdentifierBodyFatPercentage',
            'HKQuantityTypeIdentifierRestingHeartRate',
            'HKQuantityTypeIdentifierAppleExerciseTime',
            'HKQuantityTypeIdentifierRespiratoryRate',
            'HKQuantityTypeIdentifierOxygenSaturation',
            'HKCategoryTypeIdentifierMindfulSession',
            'HKQuantityTypeIdentifierHeartRateVariabilitySDNN',
            'HKQuantityTypeIdentifierFlightsClimbed',
            'HKQuantityTypeIdentifierBasalEnergyBurned',
            'HKQuantityTypeIdentifierWaistCircumference',
            'HKQuantityTypeIdentifierBasalBodyTemperature',
            'HKCategoryTypeIdentifierAppleStandHour',
          ],
        });

        setAuthorized(true);
        await fetchTodayData();
      } catch (e) {
        console.log('HealthKit init error', e);
      }
    };
    init();
  }, []);

  const fetchTodayData = async () => {
    try {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // Active calories
      const calories = await queryStatisticsForQuantity(
        'HKQuantityTypeIdentifierActiveEnergyBurned',
        ['cumulativeSum'],
        { filter: { date: { startDate: startOfDay, endDate: now } } }
      );
      setActiveCalories(Math.round(calories?.sumQuantity?.quantity ?? 0));

      // Steps
      const stepsData = await queryStatisticsForQuantity(
        'HKQuantityTypeIdentifierStepCount',
        ['cumulativeSum'],
        { filter: { date: { startDate: startOfDay, endDate: now } } }
      );
      setSteps(Math.round(stepsData?.sumQuantity?.quantity ?? 0));
      setLastSyncedAt(Date.now()); // core activity metrics just pulled from HealthKit

      // Distance
      const distanceData = await queryStatisticsForQuantity(
        'HKQuantityTypeIdentifierDistanceWalkingRunning',
        ['cumulativeSum'],
        { filter: { date: { startDate: startOfDay, endDate: now } } }
      );
      setDistance(Math.round((distanceData?.sumQuantity?.quantity ?? 0) * 100) / 100);

      // Sleep -- look back from yesterday 6pm to today 12pm to capture last night
      const sleepStart = new Date(startOfDay);
      sleepStart.setDate(sleepStart.getDate() - 1);
      sleepStart.setHours(18, 0, 0, 0);
      const sleepEnd = new Date(startOfDay);
      sleepEnd.setHours(12, 0, 0, 0);

      const sleepData = await queryCategorySamples(
        'HKCategoryTypeIdentifierSleepAnalysis',
        { limit: 100, filter: { date: { startDate: sleepStart, endDate: sleepEnd } } }
      );

      // Sum up asleep stages separately
      let coreMs = 0, deepMs = 0, remMs = 0, awakeMs = 0, awakeCount = 0;
      let earliestBed: number | null = null;
      let latestWake: number | null = null;
      for (const sample of sleepData) {
        const start = new Date(sample.startDate).getTime();
        const end = new Date(sample.endDate).getTime();
        const dur = end - start;
        if (sample.value === 3) coreMs += dur;
        else if (sample.value === 4) deepMs += dur;
        else if (sample.value === 5) remMs += dur;
        else if (sample.value === 2) { awakeMs += dur; awakeCount += 1; }
        if ([3, 4, 5].includes(sample.value as number)) {
          if (earliestBed === null || start < earliestBed) earliestBed = start;
          if (latestWake === null || end > latestWake) latestWake = end;
        }
      }
      const totalSleepMs = coreMs + deepMs + remMs;
      setSleepHours(totalSleepMs > 0 ? Math.round((totalSleepMs / 3600000) * 10) / 10 : null);
      setSleepStages(totalSleepMs > 0 ? { core: coreMs, deep: deepMs, rem: remMs, totalMs: totalSleepMs } : null);
      setSleepAwakeMs(awakeMs);
      setSleepAwakeCount(totalSleepMs > 0 ? awakeCount : 0);
      if (earliestBed && latestWake) {
        const bedStr = new Date(earliestBed).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const wakeStr = new Date(latestWake).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setSleepTimes({ bed: bedStr, wake: wakeStr });
      }

      // VO2 Max -- most recent
      const vo2Data = await getMostRecentQuantitySample('HKQuantityTypeIdentifierVO2Max');
      if (vo2Data) setVo2Max(Math.round((vo2Data.quantity as number) * 10) / 10);

      // Cardio recovery -- most recent
      const recoveryData = await getMostRecentQuantitySample('HKQuantityTypeIdentifierHeartRateRecoveryOneMinute');
      if (recoveryData) setCardioRecovery(Math.round(recoveryData.quantity as number));

      // Resting heart rate -- our overnight resting floor (same method as the Recovery
      // tab), not Apple's daytime "most recent" value, so the number is consistent app
      // wide (home card, day record, stats, summaries). Null on a watchless night leaves
      // the prior value rather than flickering.
      const overnightRHR = await fetchOvernightRHR();
      if (overnightRHR.rhr !== null) setRestingHR(overnightRHR.rhr);

      // Respiratory rate -- most recent
      const respData = await getMostRecentQuantitySample('HKQuantityTypeIdentifierRespiratoryRate');
      if (respData) setRespiratoryRate(Math.round((respData.quantity as number) * 10) / 10);

      // HRV (SDNN, ms) -- most recent. First wiring for Recovery Score; the formula
      // will later scope this to the overnight sleep window.
      const hrvData = await getMostRecentQuantitySample('HKQuantityTypeIdentifierHeartRateVariabilitySDNN');
      if (hrvData) setHrv(Math.round((hrvData.quantity as number) * 10) / 10);

      // Blood oxygen -- most recent
      const spo2Data = await getMostRecentQuantitySample('HKQuantityTypeIdentifierOxygenSaturation');
      if (spo2Data) setBloodOxygen(Math.round((spo2Data.quantity as number) * 1000) / 10);

      // Exercise minutes -- daily sum
      const exMinData = await queryStatisticsForQuantity(
        'HKQuantityTypeIdentifierAppleExerciseTime',
        ['cumulativeSum'],
        { filter: { date: { startDate: startOfDay, endDate: now } } }
      );
      setExerciseMinutes(Math.round(exMinData?.sumQuantity?.quantity ?? 0));
      // Core activity metrics (cals/steps/exercise) are now all today's -- stamp the local date so
      // goal detection knows the numbers are fresh for today before it fires.
      setActivityDataDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`);

      // Apple Workouts
      try {
        const workouts = await queryWorkoutSamples({
          limit: 20,
          filter: { date: { startDate: startOfDay, endDate: now } }
        });
        setAppleWorkouts(workouts);
      } catch (we) {
        console.log('Workout query error:', we);
      }

    } catch (e) {
      console.log('HealthKit fetch error', e);
    }
  };

  // Per-night sleep history for the Sleep Hub trend + stage-history charts.
  // Buckets raw HealthKit stage samples into nights keyed by wake-up day,
  // matching the home card's "last night = today" convention (a segment that
  // starts at/after 6pm belongs to the next morning's night).
  const fetchSleepHistory = async (days: number): Promise<{
    dateKey: string; coreMs: number; deepMs: number; remMs: number; awakeMs: number;
    totalMs: number; bed: string | null; wake: string | null; awakeCount: number; bedMin: number | null;
  }[]> => {
    try {
      const now = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      startDate.setHours(0, 0, 0, 0);

      const samples = await queryCategorySamples(
        'HKCategoryTypeIdentifierSleepAnalysis',
        { limit: 5000, filter: { date: { startDate, endDate: now } } }
      );
      if (!samples || samples.length === 0) return [];

      const nights: Record<string, { coreMs: number; deepMs: number; remMs: number; awakeMs: number; bed: number | null; wake: number | null; awakeCount: number }> = {};

      for (const sample of samples) {
        const start = new Date(sample.startDate);
        const startMs = start.getTime();
        const endMs = new Date(sample.endDate).getTime();
        const dur = endMs - startMs;
        if (dur <= 0) continue;

        const wakeDay = new Date(start);
        if (start.getHours() >= 18) wakeDay.setDate(wakeDay.getDate() + 1);
        const key = `${wakeDay.getFullYear()}-${String(wakeDay.getMonth() + 1).padStart(2, '0')}-${String(wakeDay.getDate()).padStart(2, '0')}`;

        if (!nights[key]) nights[key] = { coreMs: 0, deepMs: 0, remMs: 0, awakeMs: 0, bed: null, wake: null, awakeCount: 0 };
        const n = nights[key];
        if (sample.value === 3) n.coreMs += dur;
        else if (sample.value === 4) n.deepMs += dur;
        else if (sample.value === 5) n.remMs += dur;
        else if (sample.value === 2) { n.awakeMs += dur; n.awakeCount += 1; }
        if ([3, 4, 5].includes(sample.value as number)) {
          if (n.bed === null || startMs < n.bed) n.bed = startMs;
          if (n.wake === null || endMs > n.wake) n.wake = endMs;
        }
      }

      return Object.entries(nights)
        .map(([dateKey, n]) => {
          const totalMs = n.coreMs + n.deepMs + n.remMs;
          const bd = n.bed !== null ? new Date(n.bed) : null;
          // Minutes-of-day, shifted so after-midnight bedtimes (AM) sit continuously
          // after evening ones for a clean consistency (std-dev) calculation.
          let bedMin: number | null = null;
          if (bd) { bedMin = bd.getHours() * 60 + bd.getMinutes(); if (bedMin < 12 * 60) bedMin += 24 * 60; }
          return {
            dateKey,
            coreMs: n.coreMs, deepMs: n.deepMs, remMs: n.remMs, awakeMs: n.awakeMs, totalMs,
            bed: n.bed !== null ? new Date(n.bed).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
            wake: n.wake !== null ? new Date(n.wake).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
            awakeCount: n.awakeCount,
            bedMin,
          };
        })
        .filter(n => n.totalMs > 0)
        .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
        .slice(-days); // the lookback window can span days+1 calendar nights; keep exactly N
    } catch (e) {
      console.log('Sleep history fetch error', e);
      return [];
    }
  };

  // Ordered stage segments for last night, for the Sleep Hub hypnogram (the night
  // timeline). Same window as fetchTodayData's sleep pull.
  const fetchLastNightSegments = async (): Promise<{ stage: 'awake' | 'core' | 'deep' | 'rem'; start: number; end: number }[]> => {
    try {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const sleepStart = new Date(startOfDay);
      sleepStart.setDate(sleepStart.getDate() - 1);
      sleepStart.setHours(18, 0, 0, 0);
      const sleepEnd = new Date(startOfDay);
      sleepEnd.setHours(12, 0, 0, 0);

      const data = await queryCategorySamples(
        'HKCategoryTypeIdentifierSleepAnalysis',
        { limit: 1000, filter: { date: { startDate: sleepStart, endDate: sleepEnd } } }
      );
      const map: Record<number, 'awake' | 'core' | 'deep' | 'rem'> = { 2: 'awake', 3: 'core', 4: 'deep', 5: 'rem' };
      const segs: { stage: 'awake' | 'core' | 'deep' | 'rem'; start: number; end: number }[] = [];
      for (const s of data) {
        const stage = map[s.value as number];
        if (!stage) continue;
        segs.push({ stage, start: new Date(s.startDate).getTime(), end: new Date(s.endDate).getTime() });
      }
      segs.sort((a, b) => a.start - b.start);
      return segs;
    } catch (e) {
      console.log('Last night segments error', e);
      return [];
    }
  };

  // Overnight RHR (Whoop/Oura method): the resting floor across the WHOLE night's sleep
  // (all stages, awake excluded), computed as an artifact-trimmed robust low, not a raw
  // minimum (a single dropout beat can read absurdly low) and not the average (reads
  // high). We drop the bottom ~2% of asleep beats as sensor artifacts, then average the
  // next low band (~2nd to 12th percentile). Deep-sleep-only was too narrow: it kept a
  // tiny non-representative slice of samples and missed the true troughs. Apple's
  // RestingHeartRate is a daytime sedentary value; this anchors to actual sleep. Pass
  // anchorDate for a past night; omit for last night. Returns reference fields (Apple's
  // value, raw night min, deep-only avg, p5) so the value can be verified on device.
  const fetchOvernightRHR = async (anchorDate?: Date): Promise<{
    rhr: number | null;           // robust low over all sleep (THE recovery RHR)
    rhrCount: number;             // beats that fed the robust low
    asleepP5: number | null;      // 5th percentile of asleep beats (reference)
    asleepCount: number;
    deepMean: number | null;      // old deep-only average (reference only)
    deepSampleCount: number;
    nightMin: number | null;      // single lowest raw beat (artifact sanity check)
    nightSampleCount: number;
    appleRHR: number | null;
    asleepMinutes: number;
    fallbackUsed: 'asleep' | 'none';
    sleepWindowStart: number | null;  // real bed (earliest asleep-segment start), ms epoch
    sleepWindowEnd: number | null;    // real wake (latest asleep-segment end), ms epoch
    asleepSegs: { start: number; end: number }[];  // asleep stage segments (for HRV strictness)
  }> => {
    const empty = { rhr: null, rhrCount: 0, asleepP5: null, asleepCount: 0, deepMean: null, deepSampleCount: 0, nightMin: null, nightSampleCount: 0, appleRHR: null, asleepMinutes: 0, fallbackUsed: 'none' as const, sleepWindowStart: null, sleepWindowEnd: null, asleepSegs: [] as { start: number; end: number }[] };
    try {
      const now = anchorDate ? new Date(anchorDate) : new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const sleepStart = new Date(startOfDay); sleepStart.setDate(sleepStart.getDate() - 1); sleepStart.setHours(18, 0, 0, 0);
      const sleepEnd = new Date(startOfDay); sleepEnd.setHours(12, 0, 0, 0);

      // Sleep segments. Asleep = core(3) + deep(4) + rem(5); awake(2) excluded.
      const segData = await queryCategorySamples(
        'HKCategoryTypeIdentifierSleepAnalysis',
        { limit: 1000, filter: { date: { startDate: sleepStart, endDate: sleepEnd } } }
      );
      const asleepSegs: { start: number; end: number }[] = [];
      const deepSegs: { start: number; end: number }[] = [];
      for (const s of segData) {
        const v = s.value as number;
        if (v === 3 || v === 4 || v === 5) asleepSegs.push({ start: new Date(s.startDate).getTime(), end: new Date(s.endDate).getTime() });
        if (v === 4) deepSegs.push({ start: new Date(s.startDate).getTime(), end: new Date(s.endDate).getTime() });
      }
      const asleepMinutes = Math.round(asleepSegs.reduce((m, seg) => m + (seg.end - seg.start), 0) / 60000);
      // The REAL overnight sleep window: earliest bed -> latest wake across asleep segments.
      // Returned so HRV (and any other overnight signal) can scope its query to actual
      // tracked sleep instead of a wide 6pm->noon bracket that leaks daytime samples.
      const bedMs = asleepSegs.length ? Math.min(...asleepSegs.map(s => s.start)) : null;
      const wakeMs = asleepSegs.length ? Math.max(...asleepSegs.map(s => s.end)) : null;

      // Raw heart-rate samples across the sleep window
      const hr = await queryQuantitySamples(
        'HKQuantityTypeIdentifierHeartRate',
        { unit: 'count/min', limit: 0, filter: { date: { startDate: sleepStart, endDate: sleepEnd } } }
      );
      const allBpm: number[] = [];
      const asleepBpm: number[] = [];
      const deepBpm: number[] = [];
      for (const sample of hr) {
        const bpm = sample.quantity as number;
        if (!Number.isFinite(bpm) || bpm <= 0) continue;
        allBpm.push(bpm);
        const t = new Date(sample.startDate).getTime();
        if (asleepSegs.some(seg => t >= seg.start && t <= seg.end)) asleepBpm.push(bpm);
        if (deepSegs.some(seg => t >= seg.start && t <= seg.end)) deepBpm.push(bpm);
      }
      const mean = (a: number[]) => a.length ? Math.round(a.reduce((s, v) => s + v, 0) / a.length) : null;
      const pct = (a: number[], p: number): number | null => {
        if (!a.length) return null;
        const s = [...a].sort((x, y) => x - y);
        return Math.round(s[Math.min(s.length - 1, Math.floor(s.length * p / 100))]);
      };
      // Artifact-trimmed robust low: drop bottom ~2% (dropout beats), average the next
      // low band up to ~12th percentile. With few samples, fall back to a gentle low.
      const robustLow = (a: number[]): { value: number | null; count: number } => {
        if (!a.length) return { value: null, count: 0 };
        const sorted = [...a].sort((x, y) => x - y);
        if (sorted.length < 10) {
          const n = Math.min(sorted.length, Math.max(3, Math.ceil(sorted.length * 0.25)));
          const slice = sorted.slice(0, n);
          return { value: Math.round(slice.reduce((s, v) => s + v, 0) / slice.length), count: n };
        }
        const lo = Math.floor(sorted.length * 0.02);
        const hi = Math.max(lo + 1, Math.floor(sorted.length * 0.12));
        const band = sorted.slice(lo, hi);
        return { value: Math.round(band.reduce((s, v) => s + v, 0) / band.length), count: band.length };
      };

      // Apple's RHR for side-by-side comparison (the value being replaced)
      const appleData = await getMostRecentQuantitySample('HKQuantityTypeIdentifierRestingHeartRate');
      const appleRHR = appleData ? Math.round(appleData.quantity as number) : null;

      const nightMin = allBpm.length ? Math.min(...allBpm) : null;
      const nightSampleCount = allBpm.length;
      const deepMean = mean(deepBpm);

      if (asleepBpm.length > 0) {
        const low = robustLow(asleepBpm);
        return {
          rhr: low.value, rhrCount: low.count,
          asleepP5: pct(asleepBpm, 5), asleepCount: asleepBpm.length,
          deepMean, deepSampleCount: deepBpm.length,
          nightMin, nightSampleCount, appleRHR, asleepMinutes, fallbackUsed: 'asleep',
          sleepWindowStart: bedMs, sleepWindowEnd: wakeMs, asleepSegs,
        };
      }
      // No overnight sleep data (manual-sleep / watchless night): there is no honest
      // resting floor. Return null rather than computing from awake daytime HR, which
      // produced absurd 80-90 "RHR" spikes. The recovery score drops a null RHR (and
      // voids if no other overnight signal exists), and the trend chart leaves a gap.
      return { ...empty, deepMean, deepSampleCount: deepBpm.length, nightMin, nightSampleCount, appleRHR, sleepWindowStart: bedMs, sleepWindowEnd: wakeMs, asleepSegs };
    } catch (e) {
      console.log('Overnight RHR error', e);
      return empty;
    }
  };

  // All signals needed by calcRecoveryScore for a given day: that day's values +
  // N-day rolling baselines (baselineDays, default 7). HRV is the sleep-window
  // average (spec Decision #7). Pass anchorDate to compute a PAST day (recovery
  // history backfill) -- when given, RHR/resp/SpO2 are read as that day's average
  // instead of "most recent" so each historical day gets its own real value.
  const fetchRecoverySignals = async (baselineDays = 7, anchorDate?: Date): Promise<{
    todayHRV: number | null; hrvBaseline: number | null;
    todayRHR: number | null; rhrBaseline: number | null;
    todayResp: number | null; respBaseline: number | null;
    todaySpO2: number | null;
    yesterdayActiveCal: number | null; activCalBaseline: number | null;
  }> => {
    const empty = { todayHRV: null, hrvBaseline: null, todayRHR: null, rhrBaseline: null, todayResp: null, respBaseline: null, todaySpO2: null, yesterdayActiveCal: null, activCalBaseline: null };
    try {
      const now = anchorDate ? new Date(anchorDate) : new Date();
      const isHistorical = !!anchorDate;
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // Fallback sleep window (yesterday 6pm → today noon) for resp/SpO2 on non-tracked nights.
      // HRV and RHR use the REAL bed→wake window from fetchOvernightRHR; resp/SpO2 now do too,
      // with this wide bracket as the fallback when no tracked sleep exists.
      const sleepStart = new Date(startOfDay);
      sleepStart.setDate(sleepStart.getDate() - 1);
      sleepStart.setHours(18, 0, 0, 0);
      const sleepEnd = new Date(startOfDay);
      sleepEnd.setHours(12, 0, 0, 0);

      // RHR: our own overnight resting floor (raw HR during sleep, artifact-trimmed
      // robust low). Validated to match Apple's RHR but computed consistently from the
      // overnight window every night, so it never drifts during the day. Also returns the
      // REAL sleep window (bed→wake) which we reuse to scope HRV. Same call for live
      // (last night) and historical backfill (the anchor night).
      const rhrResult = await fetchOvernightRHR(anchorDate);
      const todayRHR = rhrResult.rhr;

      // HRV gate: hold HRV to the SAME real-overnight standard as RHR. Only accept the
      // night's HRV when there was real tracked sleep (asleep sleep-stage segments exist
      // -- the exact signal RHR already requires via fetchOvernightRHR.asleepMinutes); a
      // manual/watch-off night voids HRV, and with RHR also null the recovery score voids
      // cleanly (calcRecoveryScore !hasHRV && !hasRHR).
      const hadTrackedSleep = rhrResult.asleepMinutes > 0;

      // HRV: average SDNN scoped to ACTUAL ASLEEP SEGMENTS (the Oura model + the canonical
      // daily value, spec Decision #7). Matches RHR's strictness exactly -- only readings
      // taken inside a real asleep stage count; any reading during a mid-night awake gap is
      // dropped, same sleep definition both signals use. The old 6pm→noon bracket averaged
      // in low pre-sleep/post-wake daytime samples, inflating the value. Apple records SDNN
      // sparsely (~hourly), so we average every asleep reading -- deep-only is not viable
      // (deep segments routinely get zero SDNN samples). Only queried on a tracked-sleep night.
      let hrvWindow: number | null = null;
      if (hadTrackedSleep && rhrResult.sleepWindowStart != null && rhrResult.sleepWindowEnd != null) {
        const segs = rhrResult.asleepSegs;
        const sdnn = await queryQuantitySamples(
          'HKQuantityTypeIdentifierHeartRateVariabilitySDNN',
          { unit: 'ms', limit: 0, filter: { date: { startDate: new Date(rhrResult.sleepWindowStart), endDate: new Date(rhrResult.sleepWindowEnd) } } }
        );
        const asleepHrv: number[] = [];
        for (const s of sdnn) {
          const v = s.quantity as number;
          if (!Number.isFinite(v) || v <= 0) continue;
          const t = new Date(s.startDate).getTime();
          if (segs.some(seg => t >= seg.start && t <= seg.end)) asleepHrv.push(v);
        }
        hrvWindow = asleepHrv.length
          ? Math.round((asleepHrv.reduce((a, b) => a + b, 0) / asleepHrv.length) * 10) / 10
          : null;
      }
      const todayHRV = hadTrackedSleep ? hrvWindow : null;

      // Real bed→wake window for resp/SpO2; falls back to the wide 6pm→noon bracket on
      // non-tracked (manual/watch-off) nights where no sleep window is available.
      const respSpo2Start = rhrResult.sleepWindowStart != null ? new Date(rhrResult.sleepWindowStart) : sleepStart;
      const respSpo2End = rhrResult.sleepWindowEnd != null ? new Date(rhrResult.sleepWindowEnd) : sleepEnd;

      // RHR baseline: average of our OWN stored overnight RHRs over the prior N days, so
      // the baseline uses the same method as the daily value above. Apple's 7-day raw
      // average runs ~10 bpm high (noisy resting-HR samples), which made the daily-vs-
      // baseline delta look exaggerated. Manual/watchless nights stored null and are
      // skipped. Cold-start fallback to Apple's average only when too few nights exist.
      const pad2 = (n: number) => String(n).padStart(2, '0');
      const priorRHRs: number[] = [];
      for (let i = 1; i <= baselineDays; i++) {
        const d = new Date(startOfDay); d.setDate(d.getDate() - i);
        const dk = `pj_${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
        try {
          const raw = await AsyncStorage.getItem(dk);
          if (raw) {
            const v = JSON.parse(raw)?.recoverySignals?.rhr;
            if (typeof v === 'number' && Number.isFinite(v)) priorRHRs.push(v);
          }
        } catch {}
      }
      let rhrBaseline: number | null = priorRHRs.length >= 3
        ? Math.round(priorRHRs.reduce((s, v) => s + v, 0) / priorRHRs.length)
        : null;
      if (rhrBaseline === null) {
        const rhrBase = await queryStatisticsForQuantity(
          'HKQuantityTypeIdentifierRestingHeartRate',
          ['discreteAverage'],
          { filter: { date: { startDate: new Date(startOfDay.getTime() - baselineDays * 86400000), endDate: startOfDay } } }
        );
        rhrBaseline = rhrBase?.averageQuantity?.quantity ? Math.round(rhrBase.averageQuantity.quantity) : null;
      }

      // HRV baseline: average of our OWN stored per-night overnight HRVs over the prior N
      // days, so the baseline uses the same real-sleep-window method as the daily value
      // above (mirrors the RHR baseline). Cold-start fallback to a continuous N-day SDNN
      // average when too few stored nights exist (older stored values self-heal as new
      // real-window nights accumulate).
      const priorHRVs: number[] = [];
      for (let i = 1; i <= baselineDays; i++) {
        const d = new Date(startOfDay); d.setDate(d.getDate() - i);
        const dk = `pj_${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
        try {
          const raw = await AsyncStorage.getItem(dk);
          if (raw) {
            const v = JSON.parse(raw)?.recoverySignals?.hrv;
            if (typeof v === 'number' && Number.isFinite(v)) priorHRVs.push(v);
          }
        } catch {}
      }
      let hrvBaseline: number | null = priorHRVs.length >= 3
        ? Math.round((priorHRVs.reduce((s, v) => s + v, 0) / priorHRVs.length) * 10) / 10
        : null;
      if (hrvBaseline === null) {
        const baselineStart = new Date(startOfDay);
        baselineStart.setDate(baselineStart.getDate() - baselineDays);
        const hrvBase = await queryStatisticsForQuantity(
          'HKQuantityTypeIdentifierHeartRateVariabilitySDNN',
          ['discreteAverage'],
          { filter: { date: { startDate: baselineStart, endDate: startOfDay } } }
        );
        hrvBaseline = hrvBase?.averageQuantity?.quantity
          ? Math.round(hrvBase.averageQuantity.quantity * 10) / 10
          : null;
      }

      // Resp rate: real bed→wake window average (live and backfill paths now identical).
      // Falls back to the wide bracket on non-tracked nights via respSpo2Start/End.
      const respSleep = await queryStatisticsForQuantity(
        'HKQuantityTypeIdentifierRespiratoryRate',
        ['discreteAverage'],
        { filter: { date: { startDate: respSpo2Start, endDate: respSpo2End } } }
      );
      const todayResp = respSleep?.averageQuantity?.quantity ? Math.round(respSleep.averageQuantity.quantity * 10) / 10 : null;

      // Resp baseline: N-day average
      const respBase = await queryStatisticsForQuantity(
        'HKQuantityTypeIdentifierRespiratoryRate',
        ['discreteAverage'],
        { filter: { date: { startDate: new Date(startOfDay.getTime() - baselineDays * 86400000), endDate: startOfDay } } }
      );
      const respBaseline = respBase?.averageQuantity?.quantity
        ? Math.round(respBase.averageQuantity.quantity * 10) / 10
        : null;

      // SpO2: real sleep-window average for both live and backfill (display only, not in score).
      // The old live path used getMostRecentQuantitySample which could pick a daytime reading.
      const spo2Sleep = await queryStatisticsForQuantity(
        'HKQuantityTypeIdentifierOxygenSaturation',
        ['discreteAverage'],
        { filter: { date: { startDate: respSpo2Start, endDate: respSpo2End } } }
      );
      const todaySpO2 = spo2Sleep?.averageQuantity?.quantity ? Math.round(spo2Sleep.averageQuantity.quantity * 1000) / 10 : null;

      // Yesterday's active calories
      const yestStart = new Date(startOfDay);
      yestStart.setDate(yestStart.getDate() - 1);
      const yestCal = await queryStatisticsForQuantity(
        'HKQuantityTypeIdentifierActiveEnergyBurned',
        ['cumulativeSum'],
        { filter: { date: { startDate: yestStart, endDate: startOfDay } } }
      );
      const yesterdayActiveCal = yestCal?.sumQuantity?.quantity
        ? Math.round(yestCal.sumQuantity.quantity)
        : null;

      // N-day average daily active calories (past N complete days)
      const baseStart = new Date(startOfDay);
      baseStart.setDate(baseStart.getDate() - baselineDays);
      const baseCal = await queryStatisticsForQuantity(
        'HKQuantityTypeIdentifierActiveEnergyBurned',
        ['cumulativeSum'],
        { filter: { date: { startDate: baseStart, endDate: startOfDay } } }
      );
      const activCalBaseline = baseCal?.sumQuantity?.quantity
        ? Math.round(baseCal.sumQuantity.quantity / baselineDays)
        : null;

      return { todayHRV, hrvBaseline, todayRHR, rhrBaseline, todayResp, respBaseline, todaySpO2, yesterdayActiveCal, activCalBaseline };
    } catch (e) {
      console.log('Recovery signals fetch error', e);
      return empty;
    }
  };

  // DEV DIAGNOSTIC (read-only): everything we need to decide how HRV should be computed.
  // Shows the real sleep window, the TOTAL SDNN sample count last night (settles "is Apple
  // sparse or dense?"), and the average broken down per sleep stage (deep / core / REM /
  // awake) plus the all-asleep average and the current bed->wake bracket average. Lets us
  // see whether stage actually changes the number for THIS user and whether deep-only would
  // have enough samples to trust. Nothing is saved.
  const dumpHRV = async (): Promise<{
    windowStart: number | null; windowEnd: number | null; asleepMinutes: number;
    total: number;
    bracketAvg: number | null; bracketCount: number;
    asleepAvg: number | null; asleepCount: number;
    deepAvg: number | null; deepCount: number;
    coreAvg: number | null; coreCount: number;
    remAvg: number | null; remCount: number;
    awakeAvg: number | null; awakeCount: number;
    daytimeAvg: number | null; daytimeCount: number;
    rows: { time: string; v: number; stage: string }[];
  }> => {
    const empty = { windowStart: null, windowEnd: null, asleepMinutes: 0, total: 0, bracketAvg: null, bracketCount: 0, asleepAvg: null, asleepCount: 0, deepAvg: null, deepCount: 0, coreAvg: null, coreCount: 0, remAvg: null, remCount: 0, awakeAvg: null, awakeCount: 0, daytimeAvg: null, daytimeCount: 0, rows: [] as { time: string; v: number; stage: string }[] };
    try {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const sleepStart = new Date(startOfDay); sleepStart.setDate(sleepStart.getDate() - 1); sleepStart.setHours(18, 0, 0, 0);
      const sleepEnd = new Date(startOfDay); sleepEnd.setHours(12, 0, 0, 0);

      const stageName: Record<number, string> = { 2: 'awake', 3: 'core', 4: 'deep', 5: 'rem' };
      const segData = await queryCategorySamples(
        'HKCategoryTypeIdentifierSleepAnalysis',
        { limit: 1000, filter: { date: { startDate: sleepStart, endDate: sleepEnd } } }
      );
      const segs: { start: number; end: number; stage: string }[] = [];
      const asleepSegs: { start: number; end: number }[] = [];
      for (const s of segData) {
        const name = stageName[s.value as number];
        if (!name) continue;
        const seg = { start: new Date(s.startDate).getTime(), end: new Date(s.endDate).getTime(), stage: name };
        segs.push(seg);
        if (name === 'core' || name === 'deep' || name === 'rem') asleepSegs.push({ start: seg.start, end: seg.end });
      }
      const bedMs = asleepSegs.length ? Math.min(...asleepSegs.map(s => s.start)) : null;
      const wakeMs = asleepSegs.length ? Math.max(...asleepSegs.map(s => s.end)) : null;
      const asleepMinutes = Math.round(asleepSegs.reduce((m, seg) => m + (seg.end - seg.start), 0) / 60000);

      const sdnn = await queryQuantitySamples(
        'HKQuantityTypeIdentifierHeartRateVariabilitySDNN',
        { unit: 'ms', limit: 0, filter: { date: { startDate: sleepStart, endDate: sleepEnd } } }
      );
      const stageFor = (t: number): string => {
        const seg = segs.find(s => t >= s.start && t <= s.end);
        if (seg) return seg.stage;
        if (bedMs != null && wakeMs != null && t >= bedMs && t <= wakeMs) return 'gap';
        return 'daytime';
      };
      const rows: { time: string; v: number; stage: string; t: number }[] = [];
      for (const s of sdnn) {
        const v = s.quantity as number;
        if (!Number.isFinite(v) || v <= 0) continue;
        const t = new Date(s.startDate).getTime();
        rows.push({ time: new Date(s.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), v: Math.round(v * 10) / 10, stage: stageFor(t), t });
      }
      rows.sort((a, b) => a.t - b.t);
      const avg = (a: number[]) => a.length ? Math.round((a.reduce((s, x) => s + x, 0) / a.length) * 10) / 10 : null;
      const vals = (name: string) => rows.filter(r => r.stage === name).map(r => r.v);
      const asleepVals = rows.filter(r => r.stage === 'core' || r.stage === 'deep' || r.stage === 'rem').map(r => r.v);
      const bracketVals = (bedMs != null && wakeMs != null) ? rows.filter(r => r.t >= bedMs && r.t <= wakeMs).map(r => r.v) : [];
      return {
        windowStart: bedMs, windowEnd: wakeMs, asleepMinutes,
        total: rows.length,
        bracketAvg: avg(bracketVals), bracketCount: bracketVals.length,
        asleepAvg: avg(asleepVals), asleepCount: asleepVals.length,
        deepAvg: avg(vals('deep')), deepCount: vals('deep').length,
        coreAvg: avg(vals('core')), coreCount: vals('core').length,
        remAvg: avg(vals('rem')), remCount: vals('rem').length,
        awakeAvg: avg(vals('awake')), awakeCount: vals('awake').length,
        daytimeAvg: avg(vals('daytime')), daytimeCount: vals('daytime').length,
        rows: rows.map(({ time, v, stage }) => ({ time, v, stage })),
      };
    } catch (e) {
      console.log('Dump HRV error', e);
      return empty;
    }
  };

  const fetchHistoricalWorkouts = async (days: number): Promise<any[]> => {
    try {
      const now = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      startDate.setHours(0, 0, 0, 0);

      const workouts = await queryWorkoutSamples({
        limit: 500,
        filter: { date: { startDate, endDate: now } }
      });

      if (!workouts || workouts.length === 0) return [];

      // Group workouts by date key
      const byDate: Record<string, any[]> = {};
      for (const w of workouts) {
        const d = new Date(w.startDate);
        const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (!byDate[dateKey]) byDate[dateKey] = [];
        byDate[dateKey].push(w);
      }

      // Build exercise objects keyed by date
      const result: { dateKey: string; exercise: any }[] = [];
      for (const [dateKey, dayWorkouts] of Object.entries(byDate)) {
        for (const w of dayWorkouts) {
          const durationFormatted = formatWorkoutDuration(w.duration.quantity);
          const calories = Math.round(w.totalEnergyBurned?.quantity ?? 0);
          const distanceMi = w.totalDistance
            ? Math.round((w.totalDistance.quantity / 1609.34) * 100) / 100
            : null;
          const name = WORKOUT_TYPE_NAMES[w.workoutActivityType] ?? 'Workout';
          result.push({
            dateKey,
            exercise: {
              id: `apple_${w.uuid}`,
              name,
              sets: '',
              reps: '',
              rest: '',
              note: '',
              isCardio: true,
              duration: String(durationFormatted),
              distance: distanceMi ? String(distanceMi) : '',
              calories: String(calories),
              fromAppleHealth: true,
              appleHealthUUID: w.uuid,
              appleStartDate: w.startDate,
            },
          });
        }
      }

      return result;
    } catch (e) {
      console.log('Historical workout fetch error', e);
      return [];
    }
  };

  // HR ZONES: recent workout time windows (start/end) from Apple Health workout sessions.
  // Used to attach an HR-zone breakdown to each recorded workout. endMs computed from
  // start + duration (robust across HealthKit shapes).
  const fetchWorkoutWindows = async (days: number): Promise<{ uuid: string; name: string; startMs: number; endMs: number; durationSec: number }[]> => {
    try {
      const now = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      startDate.setHours(0, 0, 0, 0);
      const workouts = await queryWorkoutSamples({ limit: 500, filter: { date: { startDate, endDate: now } } });
      if (!workouts || workouts.length === 0) return [];
      return workouts.map((w: any) => {
        const startMs = new Date(w.startDate).getTime();
        const durationSec = w.duration?.quantity ?? 0;
        const endMs = w.endDate ? new Date(w.endDate).getTime() : startMs + durationSec * 1000;
        return {
          uuid: w.uuid,
          name: WORKOUT_TYPE_NAMES[w.workoutActivityType] ?? 'Workout',
          startMs, endMs, durationSec,
        };
      }).sort((a, b) => b.startMs - a.startMs);
    } catch { return []; }
  };

  // HR ZONES: find a specific imported workout by its UUID (querying the calendar day it
  // started) and return its real start/end window + HR samples. Works for any imported
  // workout regardless of age, using only the stored appleHealthUUID + appleStartDate -- no
  // migration of older imports needed.
  const fetchWorkoutHRByUUID = async (uuid: string, approxDateMs: number): Promise<{ found: boolean; startMs: number; endMs: number; durationSec: number; samples: { t: number; v: number }[] }> => {
    const empty = { found: false, startMs: 0, endMs: 0, durationSec: 0, samples: [] as { t: number; v: number }[] };
    try {
      const start = new Date(approxDateMs); start.setHours(0, 0, 0, 0);
      const end = new Date(approxDateMs); end.setHours(23, 59, 59, 999);
      const workouts = await queryWorkoutSamples({ limit: 100, filter: { date: { startDate: start, endDate: end } } });
      const w = (workouts || []).find((x: any) => x.uuid === uuid);
      if (!w) return empty;
      const startMs = new Date(w.startDate).getTime();
      const durationSec = w.duration?.quantity ?? 0;
      const endMs = w.endDate ? new Date(w.endDate).getTime() : startMs + durationSec * 1000;
      const samples = await fetchWorkoutHeartRate(startMs, endMs);
      return { found: true, startMs, endMs, durationSec, samples };
    } catch { return empty; }
  };

  // HR ZONES: raw heart-rate samples within a workout window, for time-in-zone math.
  const fetchWorkoutHeartRate = async (startMs: number, endMs: number): Promise<{ t: number; v: number }[]> => {
    try {
      const hr = await queryQuantitySamples(
        'HKQuantityTypeIdentifierHeartRate',
        { unit: 'count/min', limit: 0, filter: { date: { startDate: new Date(startMs), endDate: new Date(endMs) } } }
      );
      const out: { t: number; v: number }[] = [];
      for (const s of hr) {
        const v = s.quantity as number;
        if (!Number.isFinite(v) || v <= 0) continue;
        out.push({ t: new Date(s.startDate).getTime(), v });
      }
      return out;
    } catch { return []; }
  };

  // HONEST connection signal. `authorized` only means "this device has HealthKit and we
  // asked for access" -- iOS resolves requestAuthorization successfully EVEN IF the user
  // denied, and never tells us read access was refused. So `authorized` being true does
  // NOT mean we can actually read anything. `hasHealthData` is the truthful signal: it is
  // true only when at least one real value has actually come back from HealthKit. Use this
  // (not `authorized`) for any "connected / receiving data" UI or to decide whether to show
  // a "connect your Apple Watch" empty state. A granted-but-no-data-yet device reads false
  // until data arrives -- which is the correct behavior (we show the same honest empty
  // state whether access was denied or simply has nothing yet; Apple can't tell them apart
  // either, and the right UX is identical for both).
  const hasHealthData =
    activeCalories > 0 || steps > 0 || distance > 0 ||
    sleepHours !== null || restingHR !== null || respiratoryRate !== null ||
    bloodOxygen !== null || hrv !== null || vo2Max !== null ||
    cardioRecovery !== null || exerciseMinutes !== null;

  return { authorized, hasHealthData, lastSyncedAt, activityDataDate, activeCalories, steps, distance, sleepHours, sleepStages, sleepTimes, sleepAwakeMs, sleepAwakeCount, vo2Max, cardioRecovery, restingHR, respiratoryRate, bloodOxygen, hrv, exerciseMinutes, appleWorkouts, fetchTodayData, fetchHistoricalWorkouts, fetchSleepHistory, fetchLastNightSegments, fetchRecoverySignals, fetchOvernightRHR, fetchWorkoutWindows, fetchWorkoutHeartRate, fetchWorkoutHRByUUID, dumpHRV };
}