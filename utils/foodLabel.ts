import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * One shared answer to a single question: what is this food's DEFAULT serving worth?
 *
 * Every list in the Food Library shows that one number. It is a property of the FOOD, never of how
 * the food happened to be logged, when it was starred, or what unit was picked that day. Before this
 * existed, each tab guessed from whatever copy it had lying around -- a diary entry, a favourite
 * snapshot, a rounded per-100g figure -- and those copies drifted from the label and from each other
 * (a cottage cheese reading 1 kcal, a 160 kcal shake reading 159, a slice of bread reading 175).
 *
 * There are exactly two authorities:
 *   - A food the user created  -> the record they wrote. Local, exact, no lookup.
 *   - A FatSecret food         -> FatSecret's own label serving, fetched once and cached here.
 *
 * The cache holds nothing the user owns. It is a copy of a public database answer, so it is always
 * safe to drop: a fresh install simply refills it. Writes read-then-merge, never replace wholesale.
 */

export interface FoodLabel {
  cal: number;
  protein: number;
  carbs: number;
  fat: number;
  /** The serving these numbers describe, e.g. "2 slices" -- display/debug only. */
  label?: string;
  grams?: number;
}

const CACHE_KEY = 'pj_food_label_cache';

let memoryCache: Record<string, FoodLabel> | null = null;
let loadPromise: Promise<Record<string, FoodLabel>> | null = null;

/** Loads the cache once per session and keeps it in memory so list rendering stays synchronous. */
export async function loadLabelCache(): Promise<Record<string, FoodLabel>> {
  if (memoryCache) return memoryCache;
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    try {
      const raw = await AsyncStorage.getItem(CACHE_KEY);
      memoryCache = raw ? JSON.parse(raw) : {};
    } catch {
      memoryCache = {};
    }
    return memoryCache!;
  })();
  return loadPromise;
}

/** Synchronous read for render paths. Returns null until loadLabelCache has resolved. */
export function getCachedLabel(fsId?: string | null): FoodLabel | null {
  if (!fsId || !memoryCache) return null;
  return memoryCache[fsId] ?? null;
}

/** Merges one food's label into the cache. Never replaces the whole map. */
export async function cacheLabel(fsId: string, label: FoodLabel): Promise<void> {
  if (!fsId || !(typeof label?.cal === 'number')) return;
  const current = await loadLabelCache();
  current[fsId] = label;
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    const onDisk = raw ? JSON.parse(raw) : {};
    onDisk[fsId] = label;
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(onDisk));
  } catch {
    // A cache write failing costs a refetch next session, nothing more.
  }
}

/**
 * FatSecret's serving list, in the order the app already normalises it, puts the food's real label
 * serving first and pushes the generic "100 g" entry to the back. That first entry IS the label.
 */
export function labelFromServings(servings: any[]): FoodLabel | null {
  const s = servings?.[0];
  if (!s || typeof s.calories !== 'number') return null;
  return {
    cal: Math.round(s.calories),
    protein: Math.round((s.protein || 0) * 10) / 10,
    carbs: Math.round((s.carbs || 0) * 10) / 10,
    fat: Math.round((s.fat || 0) * 10) / 10,
    label: s.label,
    grams: s.grams,
  };
}

/** The label a user-created food carries by definition: the numbers typed against its own serving. */
export function labelFromMyFood(record: any): FoodLabel | null {
  if (!record || typeof record.cal !== 'number') return null;
  return {
    cal: record.cal,
    protein: record.protein || 0,
    carbs: record.carbs || 0,
    fat: record.fat || 0,
    label: record.servingUnit || undefined,
    grams: record.servingSize,
  };
}

/**
 * Resolves a FatSecret food's label, preferring the cache and falling back to a single lookup.
 * `fetchServings` is injected so this stays free of screen-level imports.
 */
export async function resolveFsLabel(
  fsId: string,
  fetchServings: (id: string) => Promise<any[]>,
): Promise<FoodLabel | null> {
  await loadLabelCache();
  const cached = getCachedLabel(fsId);
  if (cached) return cached;
  try {
    const servings = await fetchServings(fsId);
    const label = labelFromServings(servings);
    if (label) {
      await cacheLabel(fsId, label);
      return label;
    }
  } catch {
    // Offline or a failed lookup: the caller keeps showing what it already had.
  }
  return null;
}
