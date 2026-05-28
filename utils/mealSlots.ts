import AsyncStorage from '@react-native-async-storage/async-storage';
import { storageSet } from './storage';

export interface MealSlot {
  id: string;
  name: string;
}

export const DEFAULT_MEAL_SLOTS: MealSlot[] = [
  { id: 'ms_morning', name: 'Morning' },
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
