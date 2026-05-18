import AsyncStorage from '@react-native-async-storage/async-storage';

export type TrendData = {
  weight: { date: string; value: number }[];
  cal: { date: string; cal: number }[];
  steps: { date: string; value: number }[];
  activeCal: { date: string; value: number }[];
  sleep: { date: string; value: number }[];
  macro: { date: string; protein: number; carbs: number; fat: number }[];
  workoutDay: { date: string; hadWorkout: boolean }[];
};

export const EMPTY_TREND_DATA: TrendData = {
  weight: [], cal: [], steps: [], activeCal: [], sleep: [], macro: [], workoutDay: [],
};

export const offsetToDateKey = (offset: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const fetchTrendData = async (days: number, workoutState: any): Promise<TrendData> => {
  const wh: TrendData['weight'] = [];
  const ch: TrendData['cal'] = [];
  const sh: TrendData['steps'] = [];
  const ah: TrendData['activeCal'] = [];
  const slh: TrendData['sleep'] = [];
  const mh: TrendData['macro'] = [];
  const wdh: TrendData['workoutDay'] = [];

  for (let i = days - 1; i >= 0; i--) {
    const dateKey = offsetToDateKey(i);
    let hadWorkout = false;
    try {
      const saved = await AsyncStorage.getItem(`pj_${dateKey}`);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.weight) wh.push({ date: dateKey, value: data.weight });
        if (data.entries?.length > 0) {
          const total = data.entries.reduce((s: number, e: any) => s + e.cal, 0);
          if (total > 0) {
            ch.push({ date: dateKey, cal: total });
            const p = data.entries.reduce((s: number, e: any) => s + (e.protein || 0), 0);
            const c = data.entries.reduce((s: number, e: any) => s + (e.carbs || 0), 0);
            const f = data.entries.reduce((s: number, e: any) => s + (e.fat || 0), 0);
            if (p + c + f > 0) mh.push({ date: dateKey, protein: Math.round(p), carbs: Math.round(c), fat: Math.round(f) });
          }
        }
        if (data.steps) sh.push({ date: dateKey, value: data.steps });
        if (data.activeCalories) ah.push({ date: dateKey, value: data.activeCalories });
        const sleepH = data.sleepOverride || data.sleepHours;
        if (sleepH) slh.push({ date: dateKey, value: sleepH });
        hadWorkout = (workoutState.programs?.[dateKey]?.exercises?.length ?? 0) > 0;
      }
    } catch {}
    wdh.push({ date: dateKey, hadWorkout });
  }
  return { weight: wh, cal: ch, steps: sh, activeCal: ah, sleep: slh, macro: mh, workoutDay: wdh };
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
    default:
      return null;
  }
};
