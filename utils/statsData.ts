import AsyncStorage from '@react-native-async-storage/async-storage';

export type TrendData = {
  weight: { date: string; value: number }[];
  cal: { date: string; cal: number }[];
  steps: { date: string; value: number }[];
  activeCal: { date: string; value: number }[];
  sleep: { date: string; value: number }[];
  macro: { date: string; protein: number; carbs: number; fat: number }[];
  workoutDay: { date: string; hadWorkout: boolean }[];
  // Extended
  water: { date: string; value: number }[];
  netCal: { date: string; value: number }[];
  sleepScore: { date: string; value: number }[];
  restingHR: { date: string; value: number }[];
  respiratoryRate: { date: string; value: number }[];
  bloodOxygen: { date: string; value: number }[];
  bodyFatPct: { date: string; value: number }[];
  exerciseMinutes: { date: string; value: number }[];
  fiber: { date: string; value: number }[];
  sodium: { date: string; value: number }[];
  cholesterol: { date: string; value: number }[];
  saturatedFat: { date: string; value: number }[];
  sugarAlcohols: { date: string; value: number }[];
  effortScore: { date: string; value: number }[];
  excludedCounts: { diet: number; water: number; exercise: number };
};

export const EMPTY_TREND_DATA: TrendData = {
  weight: [], cal: [], steps: [], activeCal: [], sleep: [], macro: [], workoutDay: [],
  water: [], netCal: [], sleepScore: [], restingHR: [], respiratoryRate: [], bloodOxygen: [],
  bodyFatPct: [], exerciseMinutes: [], fiber: [], sodium: [], cholesterol: [], saturatedFat: [],
  sugarAlcohols: [], effortScore: [],
  excludedCounts: { diet: 0, water: 0, exercise: 0 },
};

export const offsetToDateKey = (offset: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function calcSleepScoreForTrend(
  sleepHours: number,
  sleepStages: { core: number; deep: number; rem: number; totalMs: number } | null,
  sleepGoal: number,
  feelRating: number | null,
  isManual: boolean,
  consistencyPts = 0,
): number | null {
  if (sleepStages && sleepStages.totalMs > 0) {
    const durationPts = Math.min(40, Math.pow(sleepHours / sleepGoal, 3) * 40);
    const totalMs = sleepStages.totalMs;
    const deepPts = Math.max(0, 30 - (Math.abs(sleepStages.deep / totalMs - 0.20) / 0.20) * 30);
    const remPts = Math.min(30, Math.max(0, (sleepStages.rem / totalMs / 0.22) * 30));
    return Math.round(durationPts + deepPts + remPts);
  }
  if (!feelRating) return null;
  const feelPts = ((feelRating - 1) / 9) * 30;
  return Math.round(Math.min(100, Math.min(60, (sleepHours / sleepGoal) * 60) + feelPts + consistencyPts));
}

function getEntryNutrient(entries: any[], nutrientName: string): number {
  return Math.round(entries.reduce((s: number, e: any) => {
    const n = e.foodNutrients?.find((fn: any) => fn.nutrientName === nutrientName);
    if (!n) return s;
    let scale: number;
    if (e.fsId) {
      scale = (e.calPer100g && e.calPer100g > 0) ? (e.cal / e.calPer100g) : 0;
    } else {
      const sg = e.servingGrams;
      const servingCal = sg && e.calPer100g > 0 ? e.calPer100g * sg / 100 : 0;
      scale = servingCal > 0 ? e.cal / servingCal : 0;
    }
    return s + (n.value || 0) * scale;
  }, 0) * 10) / 10;
}

export const fetchTrendData = async (days: number, workoutState: any, sleepGoal = 8): Promise<TrendData> => {
  const wh: TrendData['weight'] = [];
  const ch: TrendData['cal'] = [];
  const sh: TrendData['steps'] = [];
  const ah: TrendData['activeCal'] = [];
  const slh: TrendData['sleep'] = [];
  const mh: TrendData['macro'] = [];
  const wdh: TrendData['workoutDay'] = [];
  const waterH: TrendData['water'] = [];
  const ncH: TrendData['netCal'] = [];
  const ssH: TrendData['sleepScore'] = [];
  const rhrH: TrendData['restingHR'] = [];
  const rrH: TrendData['respiratoryRate'] = [];
  const boH: TrendData['bloodOxygen'] = [];
  const bfH: TrendData['bodyFatPct'] = [];
  const emH: TrendData['exerciseMinutes'] = [];
  const fbH: TrendData['fiber'] = [];
  const sodH: TrendData['sodium'] = [];
  const choH: TrendData['cholesterol'] = [];
  const sfH: TrendData['saturatedFat'] = [];
  const saH: TrendData['sugarAlcohols'] = [];
  const esH: TrendData['effortScore'] = [];
  let exDiet = 0, exWater = 0, exExercise = 0;

  for (let i = days - 1; i >= 0; i--) {
    const dateKey = offsetToDateKey(i);
    let hadWorkout = false;
    try {
      const saved = await AsyncStorage.getItem(`pj_${dateKey}`);
      if (saved) {
        const data = JSON.parse(saved);
        const excl = data.excluded || {};
        if (excl.diet) exDiet++;
        if (excl.water) exWater++;
        if (excl.exercise) exExercise++;
        if (data.weight) wh.push({ date: dateKey, value: data.weight });
        if (!excl.diet && data.entries?.length > 0) {
          const total = data.entries.reduce((s: number, e: any) => s + e.cal, 0);
          if (total > 0) {
            ch.push({ date: dateKey, cal: total });
            const p = data.entries.reduce((s: number, e: any) => s + (e.protein || 0), 0);
            const c = data.entries.reduce((s: number, e: any) => s + (e.carbs || 0), 0);
            const f = data.entries.reduce((s: number, e: any) => s + (e.fat || 0), 0);
            if (p + c + f > 0) mh.push({ date: dateKey, protein: Math.round(p), carbs: Math.round(c), fat: Math.round(f) });
            ncH.push({ date: dateKey, value: Math.round(total - (data.activeCalories || 0)) });
            const fiberVal = getEntryNutrient(data.entries, 'Fiber, total dietary');
            const sodiumVal = getEntryNutrient(data.entries, 'Sodium, Na');
            const choVal = getEntryNutrient(data.entries, 'Cholesterol');
            const sfVal = getEntryNutrient(data.entries, 'Fatty acids, total saturated');
            const saVal = getEntryNutrient(data.entries, 'Sugar Alcohols');
            if (fiberVal > 0) fbH.push({ date: dateKey, value: fiberVal });
            if (sodiumVal > 0) sodH.push({ date: dateKey, value: sodiumVal });
            if (choVal > 0) choH.push({ date: dateKey, value: choVal });
            if (sfVal > 0) sfH.push({ date: dateKey, value: sfVal });
            if (saVal > 0) saH.push({ date: dateKey, value: saVal });
          }
        }
        if (data.steps) sh.push({ date: dateKey, value: data.steps });
        if (!excl.exercise && data.activeCalories) ah.push({ date: dateKey, value: data.activeCalories });
        if (!excl.water && typeof data.water === 'number' && data.water > 0) waterH.push({ date: dateKey, value: data.water });
        // Sleep
        const sleepH = data.sleepOverride || data.sleepHours;
        if (sleepH) {
          slh.push({ date: dateKey, value: sleepH });
          const stages = data.sleepStages || null;
          const feel = data.sleepFeelRating ?? null;
          const isManual = !!data.sleepOverride;
          const consistencyPts = data.sleepConsistencyPts ?? 0;
          const score = calcSleepScoreForTrend(sleepH, stages, sleepGoal, feel, isManual, consistencyPts);
          if (score !== null) ssH.push({ date: dateKey, value: score });
        }
        // HealthKit metrics persisted to storage
        if (data.restingHR) rhrH.push({ date: dateKey, value: data.restingHR });
        if (data.respiratoryRate) rrH.push({ date: dateKey, value: data.respiratoryRate });
        if (data.bloodOxygen) boH.push({ date: dateKey, value: data.bloodOxygen });
        if (data.bodyFatPct) bfH.push({ date: dateKey, value: data.bodyFatPct });
        if (!excl.exercise && data.exerciseMinutes) emH.push({ date: dateKey, value: data.exerciseMinutes });
        if (!excl.exercise) hadWorkout = (workoutState.programs?.[dateKey]?.exercises?.length ?? 0) > 0;
        const es = workoutState.cardioLogs?.[dateKey]?.effortScore;
        if (!excl.exercise && es != null) esH.push({ date: dateKey, value: es });
      }
    } catch {}
    wdh.push({ date: dateKey, hadWorkout });
  }
  return {
    weight: wh, cal: ch, steps: sh, activeCal: ah, sleep: slh, macro: mh, workoutDay: wdh,
    water: waterH, netCal: ncH, sleepScore: ssH, restingHR: rhrH, respiratoryRate: rrH,
    bloodOxygen: boH, bodyFatPct: bfH, exerciseMinutes: emH, effortScore: esH,
    fiber: fbH, sodium: sodH, cholesterol: choH, saturatedFat: sfH, sugarAlcohols: saH,
    excludedCounts: { diet: exDiet, water: exWater, exercise: exExercise },
  };
};

// Compute a quick "latest value + trend" summary for a pinned graph card on the home screen.
// Returns { headline, sublabel } strings ready to display.
export const getPinnedCardSummary = (dataKey: string, data: TrendData): { headline: string; sublabel: string } | null => {
  switch (dataKey) {
    case 'weight': {
      if (data.weight.length === 0) return null;
      const latest = data.weight[data.weight.length - 1].value;
      const change = data.weight.length >= 2
        ? Math.round((latest - data.weight[0].value) * 10) / 10
        : null;
      const fmtLbs = (v: number) => v % 1 === 0 ? `${v} lbs` : `${v.toFixed(1)} lbs`;
      const sub = change !== null
        ? `${change > 0 ? '+' : ''}${change} lbs this period`
        : 'Not enough data';
      return { headline: fmtLbs(latest), sublabel: sub };
    }
    case 'calories': {
      if (data.cal.length === 0) return null;
      const avg = Math.round(data.cal.reduce((s, x) => s + x.cal, 0) / data.cal.length);
      return { headline: `${avg.toLocaleString()} kcal`, sublabel: `avg/day · ${data.cal.length} days logged` };
    }
    case 'steps': {
      if (data.steps.length === 0) return null;
      const avg = Math.round(data.steps.reduce((s, x) => s + x.value, 0) / data.steps.length);
      return { headline: avg.toLocaleString(), sublabel: 'avg steps/day' };
    }
    case 'activeCals': {
      if (data.activeCal.length === 0) return null;
      const avg = Math.round(data.activeCal.reduce((s, x) => s + x.value, 0) / data.activeCal.length);
      return { headline: `${avg.toLocaleString()} kcal`, sublabel: 'avg active cals/day' };
    }
    case 'sleep': {
      if (data.sleep.length === 0) return null;
      const avg = Math.round(data.sleep.reduce((s, x) => s + x.value, 0) / data.sleep.length * 10) / 10;
      const h = Math.floor(avg);
      const m = Math.round((avg % 1) * 60);
      return { headline: m > 0 ? `${h}h ${m}m` : `${h}h`, sublabel: 'avg sleep/night' };
    }
    case 'macros': {
      if (data.macro.length === 0) return null;
      const avgP = Math.round(data.macro.reduce((s, x) => s + x.protein, 0) / data.macro.length);
      const avgC = Math.round(data.macro.reduce((s, x) => s + x.carbs, 0) / data.macro.length);
      const avgF = Math.round(data.macro.reduce((s, x) => s + x.fat, 0) / data.macro.length);
      return { headline: `P ${avgP}g · C ${avgC}g · F ${avgF}g`, sublabel: 'avg macros/day' };
    }
    case 'workoutFreq': {
      const total = data.workoutDay.filter(d => d.hadWorkout).length;
      const weeks = Math.ceil(data.workoutDay.length / 7);
      const avg = weeks > 0 ? Math.round((total / weeks) * 10) / 10 : total;
      return { headline: `${avg}x / week`, sublabel: `${total} workouts this period` };
    }
    case 'water': {
      if (data.water.length === 0) return null;
      const avg = Math.round(data.water.reduce((s, x) => s + x.value, 0) / data.water.length);
      return { headline: `${avg} oz`, sublabel: 'avg water/day' };
    }
    case 'netCalories': {
      if (data.netCal.length === 0) return null;
      const avg = Math.round(data.netCal.reduce((s, x) => s + x.value, 0) / data.netCal.length);
      return { headline: `${avg.toLocaleString()} kcal`, sublabel: 'avg net cals/day' };
    }
    case 'sleepScore': {
      if (data.sleepScore.length === 0) return null;
      const avg = Math.round(data.sleepScore.reduce((s, x) => s + x.value, 0) / data.sleepScore.length);
      return { headline: `${avg}`, sublabel: 'avg sleep score' };
    }
    case 'restingHR': {
      if (data.restingHR.length === 0) return null;
      const avg = Math.round(data.restingHR.reduce((s, x) => s + x.value, 0) / data.restingHR.length);
      return { headline: `${avg} bpm`, sublabel: 'avg resting HR' };
    }
    case 'respiratoryRate': {
      if (data.respiratoryRate.length === 0) return null;
      const avg = Math.round(data.respiratoryRate.reduce((s, x) => s + x.value, 0) / data.respiratoryRate.length * 10) / 10;
      return { headline: `${avg} br/min`, sublabel: 'avg respiratory rate' };
    }
    case 'bloodOxygen': {
      if (data.bloodOxygen.length === 0) return null;
      const avg = Math.round(data.bloodOxygen.reduce((s, x) => s + x.value, 0) / data.bloodOxygen.length * 10) / 10;
      return { headline: `${avg}%`, sublabel: 'avg blood oxygen' };
    }
    case 'bodyFatPct': {
      if (data.bodyFatPct.length === 0) return null;
      const latest = data.bodyFatPct[data.bodyFatPct.length - 1].value;
      return { headline: `${Math.round(latest * 10) / 10}%`, sublabel: 'latest body fat %' };
    }
    case 'exerciseMinutes': {
      if (data.exerciseMinutes.length === 0) return null;
      const avg = Math.round(data.exerciseMinutes.reduce((s, x) => s + x.value, 0) / data.exerciseMinutes.length);
      return { headline: `${avg} min`, sublabel: 'avg exercise/day' };
    }
    case 'fiber': {
      if (data.fiber.length === 0) return null;
      const avg = Math.round(data.fiber.reduce((s, x) => s + x.value, 0) / data.fiber.length * 10) / 10;
      return { headline: `${avg}g`, sublabel: 'avg fiber/day' };
    }
    case 'sodium': {
      if (data.sodium.length === 0) return null;
      const avg = Math.round(data.sodium.reduce((s, x) => s + x.value, 0) / data.sodium.length);
      return { headline: `${avg.toLocaleString()} mg`, sublabel: 'avg sodium/day' };
    }
    case 'cholesterol': {
      if (data.cholesterol.length === 0) return null;
      const avg = Math.round(data.cholesterol.reduce((s, x) => s + x.value, 0) / data.cholesterol.length);
      return { headline: `${avg} mg`, sublabel: 'avg cholesterol/day' };
    }
    case 'saturatedFat': {
      if (data.saturatedFat.length === 0) return null;
      const avg = Math.round(data.saturatedFat.reduce((s, x) => s + x.value, 0) / data.saturatedFat.length * 10) / 10;
      return { headline: `${avg}g`, sublabel: 'avg sat fat/day' };
    }
    default:
      return null;
  }
};
