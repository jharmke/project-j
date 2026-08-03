import AsyncStorage from '@react-native-async-storage/async-storage';
import { storageSet } from './storage';

export interface MealSlot {
  id: string;
  name: string;
}

export const DEFAULT_MEAL_SLOTS: MealSlot[] = [
  // ⚠️ ID STAYS `ms_morning`, NAME IS "Breakfast" (renamed 2026-08-03). The id is what entries store and what
  // slotNameCache keys off, so changing it would orphan every meal ever logged to this slot. The NAME is the
  // only part anyone sees, and it is renameable by the user anyway.
  // WHY: "Morning" was one time-of-day label sitting between two meal names, and every food logger on earth
  // uses Breakfast -- Otto guessed "Breakfast" unprompted for exactly that reason. No migration: existing
  // accounts keep whatever their stored slots already say, so this only affects NEW accounts.
  { id: 'ms_morning', name: 'Breakfast' },
  { id: 'ms_lunch',   name: 'Lunch'   },
  { id: 'ms_dinner',  name: 'Dinner'  },
  { id: 'ms_snacks',  name: 'Snacks'  },
];

/** Resolve display name from slot ID (new) or legacy string name. */
export function getMealDisplayName(
  meal: string,
  mealSlots: MealSlot[],
  slotNameCache: Record<string, string>,
): string {
  const byId = mealSlots.find(s => s.id === meal);
  if (byId) return byId.name;
  if (slotNameCache[meal]) return slotNameCache[meal];
  return meal;
}

/** Find the slot that owns a meal value (ID match or legacy name match). */
export function findSlotForMeal(meal: string, mealSlots: MealSlot[]): MealSlot | undefined {
  return mealSlots.find(s => s.id === meal || s.name === meal);
}

export async function loadMealSlots(): Promise<{ mealSlots: MealSlot[]; slotNameCache: Record<string, string> }> {
  try {
    const raw = await AsyncStorage.getItem('pj_settings');
    if (raw) {
      const s = JSON.parse(raw);
      const mealSlots: MealSlot[] = Array.isArray(s.mealSlots) && s.mealSlots.length > 0
        ? s.mealSlots
        : DEFAULT_MEAL_SLOTS;
      const slotNameCache: Record<string, string> = s.slotNameCache && typeof s.slotNameCache === 'object'
        ? s.slotNameCache
        : {};
      return { mealSlots, slotNameCache };
    }
  } catch {}
  return { mealSlots: DEFAULT_MEAL_SLOTS, slotNameCache: {} };
}

export async function saveMealSlots(
  mealSlots: MealSlot[],
  slotNameCache: Record<string, string>,
): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem('pj_settings');
    const current = raw ? JSON.parse(raw) : {};
    await storageSet('pj_settings', JSON.stringify({ ...current, mealSlots, slotNameCache }));
  } catch {}
}
