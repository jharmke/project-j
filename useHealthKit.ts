import {
    getMostRecentQuantitySample,
    isHealthDataAvailable,
    queryCategorySamples,
    queryStatisticsForQuantity,
    requestAuthorization,
} from '@kingstinct/react-native-healthkit';
import { useEffect, useState } from 'react';

export function useHealthKit() {
  const [authorized, setAuthorized] = useState(false);
  const [activeCalories, setActiveCalories] = useState(0);
  const [steps, setSteps] = useState(0);
  const [distance, setDistance] = useState(0);
  const [sleepHours, setSleepHours] = useState<number | null>(null);
  const [vo2Max, setVo2Max] = useState<number | null>(null);
  const [cardioRecovery, setCardioRecovery] = useState<number | null>(null);

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

      // Sum up asleep stages only (not inBed or awake)
      const asleepStages = [3, 4, 5]; // asleepCore, asleepDeep, asleepREM only -- excludes unspecified and inBed
      let totalSleepMs = 0;
      for (const sample of sleepData) {
        if (asleepStages.includes(sample.value as number)) {
          const start = new Date(sample.startDate).getTime();
          const end = new Date(sample.endDate).getTime();
          totalSleepMs += end - start;
        }
      }
      setSleepHours(totalSleepMs > 0 ? Math.round((totalSleepMs / 3600000) * 10) / 10 : null);

      // VO2 Max -- most recent
      const vo2Data = await getMostRecentQuantitySample('HKQuantityTypeIdentifierVO2Max');
      if (vo2Data) setVo2Max(Math.round((vo2Data.quantity as number) * 10) / 10);

      // Cardio recovery -- most recent
      const recoveryData = await getMostRecentQuantitySample('HKQuantityTypeIdentifierHeartRateRecoveryOneMinute');
      if (recoveryData) setCardioRecovery(Math.round(recoveryData.quantity as number));

    } catch (e) {
      console.log('HealthKit fetch error', e);
    }
  };

  return { authorized, activeCalories, steps, distance, sleepHours, vo2Max, cardioRecovery, fetchTodayData };
}