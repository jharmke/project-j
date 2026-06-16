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

export function useHealthKit() {
  const [authorized, setAuthorized] = useState(false);
  const [activeCalories, setActiveCalories] = useState(0);
  const [steps, setSteps] = useState(0);
  const [distance, setDistance] = useState(0);
  const [sleepHours, setSleepHours] = useState<number | null>(null);
  const [sleepStages, setSleepStages] = useState<{ core: number, deep: number, rem: number, totalMs: number } | null>(null);
  const [sleepTimes, setSleepTimes] = useState<{ bed: string, wake: string } | null>(null);
  const [sleepAwakeMs, setSleepAwakeMs] = useState<number>(0);
  const [vo2Max, setVo2Max] = useState<number | null>(null);
  const [cardioRecovery, setCardioRecovery] = useState<number | null>(null);
  const [restingHR, setRestingHR] = useState<number | null>(null);
  const [respiratoryRate, setRespiratoryRate] = useState<number | null>(null);
  const [bloodOxygen, setBloodOxygen] = useState<number | null>(null);
  const [hrv, setHrv] = useState<number | null>(null);
  const [bodyFatPct, setBodyFatPct] = useState<number | null>(null);
  const [exerciseMinutes, setExerciseMinutes] = useState<number | null>(null);
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
          toShare: [
            // Write-back permissions. Project J only writes data that originates
            // in-app (manual weight, water, logged nutrition) and never reads any
            // of these back from HealthKit -- read and write sets stay disjoint so
            // no feedback loop is possible. Write logic ships later as pure JS.
            'HKQuantityTypeIdentifierBodyMass',
            'HKQuantityTypeIdentifierDietaryWater',
            'HKQuantityTypeIdentifierDietaryEnergyConsumed',
            'HKQuantityTypeIdentifierDietaryProtein',
            'HKQuantityTypeIdentifierDietaryCarbohydrates',
            'HKQuantityTypeIdentifierDietaryFatTotal',
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
      let coreMs = 0, deepMs = 0, remMs = 0, awakeMs = 0;
      let earliestBed: number | null = null;
      let latestWake: number | null = null;
      for (const sample of sleepData) {
        const start = new Date(sample.startDate).getTime();
        const end = new Date(sample.endDate).getTime();
        const dur = end - start;
        if (sample.value === 3) coreMs += dur;
        else if (sample.value === 4) deepMs += dur;
        else if (sample.value === 5) remMs += dur;
        else if (sample.value === 2) awakeMs += dur;
        if ([3, 4, 5].includes(sample.value as number)) {
          if (earliestBed === null || start < earliestBed) earliestBed = start;
          if (latestWake === null || end > latestWake) latestWake = end;
        }
      }
      const totalSleepMs = coreMs + deepMs + remMs;
      setSleepHours(totalSleepMs > 0 ? Math.round((totalSleepMs / 3600000) * 10) / 10 : null);
      setSleepStages(totalSleepMs > 0 ? { core: coreMs, deep: deepMs, rem: remMs, totalMs: totalSleepMs } : null);
      setSleepAwakeMs(awakeMs);
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

      // Body fat % -- most recent
      const fatData = await getMostRecentQuantitySample('HKQuantityTypeIdentifierBodyFatPercentage');
      if (fatData) setBodyFatPct(Math.round((fatData.quantity as number) * 1000) / 10);

      // Exercise minutes -- daily sum
      const exMinData = await queryStatisticsForQuantity(
        'HKQuantityTypeIdentifierAppleExerciseTime',
        ['cumulativeSum'],
        { filter: { date: { startDate: startOfDay, endDate: now } } }
      );
      setExerciseMinutes(Math.round(exMinData?.sumQuantity?.quantity ?? 0));

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
  }> => {
    const empty = { rhr: null, rhrCount: 0, asleepP5: null, asleepCount: 0, deepMean: null, deepSampleCount: 0, nightMin: null, nightSampleCount: 0, appleRHR: null, asleepMinutes: 0, fallbackUsed: 'none' as const };
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
        };
      }
      // No overnight sleep data (manual-sleep / watchless night): there is no honest
      // resting floor. Return null rather than computing from awake daytime HR, which
      // produced absurd 80-90 "RHR" spikes. The recovery score drops a null RHR (and
      // voids if no other overnight signal exists), and the trend chart leaves a gap.
      return { ...empty, deepMean, deepSampleCount: deepBpm.length, nightMin, nightSampleCount, appleRHR };
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

      // Sleep window (yesterday 6pm → today noon) for the HRV average
      const sleepStart = new Date(startOfDay);
      sleepStart.setDate(sleepStart.getDate() - 1);
      sleepStart.setHours(18, 0, 0, 0);
      const sleepEnd = new Date(startOfDay);
      sleepEnd.setHours(12, 0, 0, 0);

      // HRV: average SDNN during sleep window (canonical daily value per spec Decision #7)
      const hrvSleep = await queryStatisticsForQuantity(
        'HKQuantityTypeIdentifierHeartRateVariabilitySDNN',
        ['discreteAverage'],
        { filter: { date: { startDate: sleepStart, endDate: sleepEnd } } }
      );
      const todayHRV = hrvSleep?.averageQuantity?.quantity
        ? Math.round(hrvSleep.averageQuantity.quantity * 10) / 10
        : null;

      // HRV baseline: N-day average prior to this sleep window
      const baselineStart = new Date(sleepStart);
      baselineStart.setDate(baselineStart.getDate() - baselineDays);
      const hrvBase = await queryStatisticsForQuantity(
        'HKQuantityTypeIdentifierHeartRateVariabilitySDNN',
        ['discreteAverage'],
        { filter: { date: { startDate: baselineStart, endDate: sleepStart } } }
      );
      const hrvBaseline = hrvBase?.averageQuantity?.quantity
        ? Math.round(hrvBase.averageQuantity.quantity * 10) / 10
        : null;

      // RHR: our own overnight resting floor (raw HR during sleep, artifact-trimmed
      // robust low). Validated to match Apple's RHR but computed consistently from the
      // overnight window every night, so it never drifts during the day. Same call for
      // live (last night) and historical backfill (the anchor night).
      const todayRHR = (await fetchOvernightRHR(anchorDate)).rhr;

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

      // Resp rate: most recent for today; sleep-window average for a backfill day.
      let todayResp: number | null;
      if (isHistorical) {
        const respDay = await queryStatisticsForQuantity(
          'HKQuantityTypeIdentifierRespiratoryRate',
          ['discreteAverage'],
          { filter: { date: { startDate: sleepStart, endDate: sleepEnd } } }
        );
        todayResp = respDay?.averageQuantity?.quantity ? Math.round(respDay.averageQuantity.quantity * 10) / 10 : null;
      } else {
        // Morning snapshot: overnight sleep-window average (matches the backfill branch).
        const respSleep = await queryStatisticsForQuantity(
          'HKQuantityTypeIdentifierRespiratoryRate',
          ['discreteAverage'],
          { filter: { date: { startDate: sleepStart, endDate: sleepEnd } } }
        );
        todayResp = respSleep?.averageQuantity?.quantity ? Math.round(respSleep.averageQuantity.quantity * 10) / 10 : null;
      }

      // Resp baseline: N-day average
      const respBase = await queryStatisticsForQuantity(
        'HKQuantityTypeIdentifierRespiratoryRate',
        ['discreteAverage'],
        { filter: { date: { startDate: new Date(startOfDay.getTime() - baselineDays * 86400000), endDate: startOfDay } } }
      );
      const respBaseline = respBase?.averageQuantity?.quantity
        ? Math.round(respBase.averageQuantity.quantity * 10) / 10
        : null;

      // SpO2: most recent for today; sleep-window average for a backfill day (display only).
      let todaySpO2: number | null;
      if (isHistorical) {
        const spo2Day = await queryStatisticsForQuantity(
          'HKQuantityTypeIdentifierOxygenSaturation',
          ['discreteAverage'],
          { filter: { date: { startDate: sleepStart, endDate: sleepEnd } } }
        );
        todaySpO2 = spo2Day?.averageQuantity?.quantity ? Math.round(spo2Day.averageQuantity.quantity * 1000) / 10 : null;
      } else {
        const spo2Data = await getMostRecentQuantitySample('HKQuantityTypeIdentifierOxygenSaturation');
        todaySpO2 = spo2Data ? Math.round((spo2Data.quantity as number) * 1000) / 10 : null;
      }

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

  return { authorized, activeCalories, steps, distance, sleepHours, sleepStages, sleepTimes, sleepAwakeMs, vo2Max, cardioRecovery, restingHR, respiratoryRate, bloodOxygen, hrv, bodyFatPct, exerciseMinutes, appleWorkouts, fetchTodayData, fetchHistoricalWorkouts, fetchSleepHistory, fetchLastNightSegments, fetchRecoverySignals, fetchOvernightRHR };
}