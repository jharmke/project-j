// Saved Meals -- a named, permanent bundle of foods a user explicitly saves from an
// already-logged meal slot (the Log tab's "Save as Meal" action). Unlike Repeat a Meal's
// rolling ~14-day history, these never age out; they live until the user deletes them.
//
// Logging a saved meal clones its stored items exactly, same guarantee as Repeat a Meal
// (see utils/repeatMeal.ts's buildClones) -- no re-search, no re-estimate, so servings,
// macros, and extended nutrition are always identical to what was originally logged.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { storageSet } from './storage';

export interface SavedMeal {
  id: string;
  name: string;
  items: any[];      // raw stored entries (clone source), same shape Repeat a Meal clones from
  totalKcal: number;
  createdAt: number;
  // Usage, for the Catalog's "Recent" sort. Both optional: meals saved before this existed have
  // neither, and sort treats a missing value as never-used rather than as zero-and-therefore-newest.
  lastUsedAt?: number;
  useCount?: number;
}

const KEY = 'pj_saved_meals';

export async function loadSavedMeals(): Promise<SavedMeal[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

// Deep-clones the given entries into a new named SavedMeal and appends it to storage.
// Read-then-merge, never replaces the list (data-integrity rule).
export async function saveMealFromEntries(name: string, entries: any[]): Promise<SavedMeal[]> {
  const existing = await loadSavedMeals();
  const meal: SavedMeal = {
    id: `meal_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: name.trim(),
    items: entries.map(e => JSON.parse(JSON.stringify(e))),
    totalKcal: Math.round(entries.reduce((s, e) => s + (e.cal || 0), 0)),
    createdAt: Date.now(),
  };
  const updated = [...existing, meal];
  await storageSet(KEY, JSON.stringify(updated));
  return updated;
}

export async function deleteSavedMeal(id: string): Promise<SavedMeal[]> {
  const existing = await loadSavedMeals();
  const updated = existing.filter(m => m.id !== id);
  await storageSet(KEY, JSON.stringify(updated));
  return updated;
}

// Stamps a meal as used, so the Catalog can sort by what you actually reach for. Called when a meal
// is added to a day, NOT when it's merely expanded to look at. Read-then-merge, one meal, two fields;
// a failure here must never block the food from being logged, which is the thing the user asked for.
export async function markSavedMealUsed(id: string): Promise<void> {
  try {
    const existing = await loadSavedMeals();
    const updated = existing.map(m =>
      m.id === id ? { ...m, lastUsedAt: Date.now(), useCount: (m.useCount ?? 0) + 1 } : m
    );
    await storageSet(KEY, JSON.stringify(updated));
  } catch {
    // Sorting metadata is not worth surfacing an error for.
  }
}

// Adding a saved meal's (possibly partial, checkbox-selected) items to a day reuses
// utils/repeatMeal.ts's logRepeatedItems directly -- same read-then-merge clone logic Recent
// already uses, just fed from a SavedMeal's stored items instead of a past day's entries.
