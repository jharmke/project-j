import AsyncStorage from '@react-native-async-storage/async-storage';

// Single source of truth for the daily calorie target + BMR math. Used by the home
// Calories card (index.tsx) and the log Today's Total card (log.tsx) so the two can
// never drift. Mirrors the suggested-target calc in settings.tsx (same LIFESTYLE /
// TRAINING values, same Mifflin-St Jeor BMR, same robust birthday parser).

export const GOAL_DEFICITS: Record<string, number> = {
  lose_2: -1000, lose_1_5: -750, lose_1: -500, lose_0_5: -250, maintain: 0, gain_0_5: 250, gain_1: 500,
};
const LIFESTYLE_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2, light: 1.3, active: 1.45, very_active: 1.6,
};
const TRAINING_BONUSES: Record<string, number> = {
  none: 0, '1x': 100, '3x': 200, '5x': 300, daily: 400,
};

export interface CalorieTargets {
  bmr: number;          // full Mifflin-St Jeor BMR (0 when stats are incomplete)
  calTarget: number;    // daily calorie target (auto = TDEE - deficit, or the manual value)
  paceDeficit: number;  // signed daily delta for the user's weight goal (negative = deficit)
}

// Age from a birthday stored as ISO (YYYY-MM-DD) or US (MM/DD/YYYY). Matches settings.tsx.
function ageFromBirthday(birthday: string): number {
  if (!birthday) return 0;
  const parts = birthday.split(/[-\/T]/);
  if (parts.length < 3) return 0;
  const isISO = parts[0].length === 4;
  const bd = isISO
    ? new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
    : new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
  return Math.floor((Date.now() - bd.getTime()) / (365.25 * 24 * 3600 * 1000));
}

// Mifflin-St Jeor BMR from profile + weight in lbs. Returns 0 if inputs are incomplete.
export function computeBmr(profile: any, weightLbs: number): number {
  const age = ageFromBirthday(profile?.birthday);
  if (!weightLbs || !profile?.heightFt || !profile?.heightIn || !age) return 0;
  const wKg = weightLbs * 0.453592;
  const hCm = (parseFloat(profile.heightFt) * 30.48) + (parseFloat(profile.heightIn) * 2.54);
  return profile.sex === 'male'
    ? Math.round((10 * wKg) + (6.25 * hCm) - (5 * age) + 5)
    : Math.round((10 * wKg) + (6.25 * hCm) - (5 * age) - 161);
}

// Weight (lbs) to use for a date: that date's logged weight, else the most recent
// weigh-in within the prior 30 days, else null. Same rule on home and log.
export async function resolveWeightForDate(dateKey: string): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(`pj_${dateKey}`);
    const w = raw ? JSON.parse(raw)?.weight : null;
    if (w) return w;
  } catch {}
  const parts = dateKey.split('-').map(Number);
  const base = new Date(parts[0], (parts[1] || 1) - 1, parts[2] || 1);
  for (let i = 1; i <= 30; i++) {
    const d = new Date(base); d.setDate(d.getDate() - i);
    const dk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    try {
      const ld = await AsyncStorage.getItem(`pj_${dk}`);
      if (ld) { const w = JSON.parse(ld)?.weight; if (w) return w; }
    } catch {}
  }
  return null;
}

// THE canonical target computation for a given date. Reads pj_profile itself.
// BMR is ALWAYS computed when stats allow (the live-net stat needs it) regardless of
// the recommended/manual toggle. calTarget honors the toggle: recommended recomputes
// TDEE - deficit from the resolved weight; manual (useRecommendedCal === false) uses
// the stored profile.calTarget. Falls back to the stored target if stats are incomplete.
export async function loadCalorieTargets(dateKey: string): Promise<CalorieTargets> {
  let profile: any = {};
  try { const raw = await AsyncStorage.getItem('pj_profile'); profile = raw ? JSON.parse(raw) : {}; } catch {}

  const paceDeficit = GOAL_DEFICITS[profile.weightGoal] ?? -500;
  const weight = await resolveWeightForDate(dateKey);
  const bmr = computeBmr(profile, weight ?? 0);
  const manualTarget = parseInt(profile.calTarget) || 0;

  let calTarget = manualTarget; // manual value, or fallback when stats are incomplete
  const canCompute = bmr > 0 && profile.lifestyleActivity && profile.trainingFrequency && profile.weightGoal;
  if (profile.useRecommendedCal !== false && canCompute) {
    const tdee = Math.round((bmr * (LIFESTYLE_MULTIPLIERS[profile.lifestyleActivity] ?? 1.2)) + (TRAINING_BONUSES[profile.trainingFrequency] ?? 0));
    calTarget = tdee + paceDeficit;
  }
  return { bmr, calTarget, paceDeficit };
}
