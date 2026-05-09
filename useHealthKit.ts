import {
    getMostRecentQuantitySample,
    isHealthDataAvailable,
    queryCategorySamples,
    queryStatisticsForQuantity,
    queryWorkoutSamples,
    requestAuthorization,
} from '@kingstinct/react-native-healthkit';
import { useEffect, useState } from 'react';

export function useHealthKit() {
  const [authorized, setAuthorized] = useState(false);
  const [activeCalories, setActiveCalories] = useState(0);
  const [steps, setSteps] = useState(0);
  const [distance, setDistance] = useState(0);
  const [sleepHours, setSleepHours] = useState<number | null>(null);
  const [sleepStages, setSleepStages] = useState<{ core: number, deep: number, rem: number, totalMs: number } | null>(null);
  const [sleepTimes, setSleepTimes] = useState<{ bed: string, wake: string } | null>(null);
  const [vo2Max, setVo2Max] = useState<number | null>(null);
  const [cardioRecovery, setCardioRecovery] = useState<number | null>(null);
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
      let coreMs = 0, deepMs = 0, remMs = 0;
      let earliestBed: number | null = null;
      let latestWake: number | null = null;
      for (const sample of sleepData) {
        const start = new Date(sample.startDate).getTime();
        const end = new Date(sample.endDate).getTime();
        const dur = end - start;
        if (sample.value === 3) coreMs += dur;
        else if (sample.value === 4) deepMs += dur;
        else if (sample.value === 5) remMs += dur;
        if ([3, 4, 5].includes(sample.value as number)) {
          if (earliestBed === null || start < earliestBed) earliestBed = start;
          if (latestWake === null || end > latestWake) latestWake = end;
        }
      }
      const totalSleepMs = coreMs + deepMs + remMs;
      setSleepHours(totalSleepMs > 0 ? Math.round((totalSleepMs / 3600000) * 10) / 10 : null);
      setSleepStages(totalSleepMs > 0 ? { core: coreMs, deep: deepMs, rem: remMs, totalMs: totalSleepMs } : null);
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

  return { authorized, activeCalories, steps, distance, sleepHours, sleepStages, sleepTimes, vo2Max, cardioRecovery, appleWorkouts, fetchTodayData };
}