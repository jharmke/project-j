import {
    getMostRecentQuantitySample,
    isHealthDataAvailable,
    queryCategorySamples,
    queryStatisticsForQuantity,
    queryWorkoutSamples,
    requestAuthorization,
} from '@kingstinct/react-native-healthkit';
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

      // Resting heart rate -- most recent
      const restingHRData = await getMostRecentQuantitySample('HKQuantityTypeIdentifierRestingHeartRate');
      if (restingHRData) setRestingHR(Math.round(restingHRData.quantity as number));

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

  // All signals needed by calcRecoveryScore: today's values + 7-day rolling
  // baselines for each signal. HRV is the sleep-window average (spec Decision #7).
  const fetchRecoverySignals = async (): Promise<{
    todayHRV: number | null; hrvBaseline: number | null;
    todayRHR: number | null; rhrBaseline: number | null;
    todayResp: number | null; respBaseline: number | null;
    todaySpO2: number | null;
    yesterdayActiveCal: number | null; activCalBaseline: number | null;
  }> => {
    const empty = { todayHRV: null, hrvBaseline: null, todayRHR: null, rhrBaseline: null, todayResp: null, respBaseline: null, todaySpO2: null, yesterdayActiveCal: null, activCalBaseline: null };
    try {
      const now = new Date();
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

      // HRV baseline: 7-day average prior to this sleep window
      const baselineStart = new Date(sleepStart);
      baselineStart.setDate(baselineStart.getDate() - 7);
      const hrvBase = await queryStatisticsForQuantity(
        'HKQuantityTypeIdentifierHeartRateVariabilitySDNN',
        ['discreteAverage'],
        { filter: { date: { startDate: baselineStart, endDate: sleepStart } } }
      );
      const hrvBaseline = hrvBase?.averageQuantity?.quantity
        ? Math.round(hrvBase.averageQuantity.quantity * 10) / 10
        : null;

      // RHR: most recent
      const rhrData = await getMostRecentQuantitySample('HKQuantityTypeIdentifierRestingHeartRate');
      const todayRHR = rhrData ? Math.round(rhrData.quantity as number) : null;

      // RHR baseline: 7-day average
      const rhrBase = await queryStatisticsForQuantity(
        'HKQuantityTypeIdentifierRestingHeartRate',
        ['discreteAverage'],
        { filter: { date: { startDate: new Date(startOfDay.getTime() - 7 * 86400000), endDate: startOfDay } } }
      );
      const rhrBaseline = rhrBase?.averageQuantity?.quantity
        ? Math.round(rhrBase.averageQuantity.quantity)
        : null;

      // Resp rate: most recent
      const respData = await getMostRecentQuantitySample('HKQuantityTypeIdentifierRespiratoryRate');
      const todayResp = respData ? Math.round((respData.quantity as number) * 10) / 10 : null;

      // Resp baseline: 7-day average
      const respBase = await queryStatisticsForQuantity(
        'HKQuantityTypeIdentifierRespiratoryRate',
        ['discreteAverage'],
        { filter: { date: { startDate: new Date(startOfDay.getTime() - 7 * 86400000), endDate: startOfDay } } }
      );
      const respBaseline = respBase?.averageQuantity?.quantity
        ? Math.round(respBase.averageQuantity.quantity * 10) / 10
        : null;

      // SpO2: most recent (display only, not in formula)
      const spo2Data = await getMostRecentQuantitySample('HKQuantityTypeIdentifierOxygenSaturation');
      const todaySpO2 = spo2Data ? Math.round((spo2Data.quantity as number) * 1000) / 10 : null;

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

      // 7-day average daily active calories (past 7 complete days)
      const weekAgo = new Date(startOfDay);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekCal = await queryStatisticsForQuantity(
        'HKQuantityTypeIdentifierActiveEnergyBurned',
        ['cumulativeSum'],
        { filter: { date: { startDate: weekAgo, endDate: startOfDay } } }
      );
      const activCalBaseline = weekCal?.sumQuantity?.quantity
        ? Math.round(weekCal.sumQuantity.quantity / 7)
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

  return { authorized, activeCalories, steps, distance, sleepHours, sleepStages, sleepTimes, sleepAwakeMs, vo2Max, cardioRecovery, restingHR, respiratoryRate, bloodOxygen, hrv, bodyFatPct, exerciseMinutes, appleWorkouts, fetchTodayData, fetchHistoricalWorkouts, fetchSleepHistory, fetchLastNightSegments, fetchRecoverySignals };
}