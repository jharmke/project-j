// utils/caps.ts
//
// THE ONE PLACE THAT OWNS THE NON-AI FREE LIMITS. Design lives in SPEC_monetization.md ->
// "NON-AI SUPPORTER PERKS" (the numbers) and "WHAT THE USER SEES AT A CAP" (the behaviour).
//
// Every dim button, every wall modal and the count on every creation toast asks THIS file. Nothing works
// a cap out for itself. That is the whole point: if eight screens each counted their own, they would drift,
// and the Stats tab would decide you were at 8 graphs while the toast said 7 -- both looking correct in
// isolation. Asking one place makes "the number on the toast" and "the number behind the wall" the same
// number by construction rather than by coincidence.
//
// ⚠️ NOTHING HERE WRITES ANY USER DATA. It reads lists and counts them. The only thing it ever writes is
// the DEV cap override at the bottom of this file.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_MEAL_SLOTS } from './mealSlots';
import { DEFAULT_STATS_CARDS } from '../statsCardRegistry';

export type CapKey =
  | 'foods'        // My Foods
  | 'savedMeals'   // the Meal Catalog
  | 'recipes'
  | 'routines'     // a saved set of EXERCISES
  | 'programs'     // a saved 7-DAY SCHEDULE (carries no exercises -- NOT the same thing as a routine)
  | 'exercises'    // custom entries in the Exercise Library
  | 'mealSlots'
  | 'statsGraphs';

// ⚠️ SPEC_monetization.md -> NON-AI SUPPORTER PERKS IS THE SOURCE OF TRUTH FOR THESE. Do not read them off
// the roadmap, and do not "be generous" -- a cap nobody reaches converts nobody (Justin, 2026-08-01:
// "I WANT free users to hit these limits").
export const FREE_CAPS: Record<CapKey, number> = {
  foods: 20,
  savedMeals: 5,
  recipes: 5,
  routines: 5,
  programs: 3,
  exercises: 15,   // 15 of YOUR OWN, on top of the ones the app ships
  mealSlots: 5,    // RAW TOTAL: the 4 that ship + 1 of your own
  statsGraphs: 8,  // RAW TOTAL: the 7 graph cards that ship + 1 of your own
};

// null = unlimited. ⚠️ MEAL SLOTS ARE THE ONE ROW THAT IS NOT UNLIMITED ON THE SUPPORTER PLAN.
export const SUPPORTER_CAPS: Record<CapKey, number | null> = {
  foods: null,
  savedMeals: null,
  recipes: null,
  routines: null,
  programs: null,
  exercises: null,
  mealSlots: 8,
  statsGraphs: null,
};

export type CapState = {
  cap: number | null;   // null = unlimited
  count: number;        // how many they have RIGHT NOW
  unlimited: boolean;
  atCap: boolean;       // count >= cap (covers OVER cap too, which only ex-Supporters can be)
  canCreate: boolean;   // the only thing a caller normally needs
};

const UNLIMITED: CapState = { cap: null, count: 0, unlimited: true, atCap: false, canCreate: true };

// ─────────────────────────────────────────────────────────────────────────────
// COUNTING
//
// ⚠️⚠️ THE COUNT RULES ARE NOT THE SAME ACROSS CAPS AND GETTING THEM BACKWARDS BREAKS THEM.
//   - Foods / saved meals / recipes / routines: raw list length. Nothing is seeded into those lists.
//     (Routine PRESETS render from their own section and are never stored in pj_routines -- verified.)
//   - Programs + exercises: EXCLUDE the built-ins, which ARE seeded into the user's own list.
//   - Meal slots + stats graphs: RAW TOTAL, defaults included. The free number IS "defaults plus one".
// Somebody who has just learned the skip-the-built-ins rule from programs will apply it to meal slots and
// hand every free user four extra slots. It is written out per key below for exactly that reason.
//
// ⚠️⚠️ EXCLUDE BUILT-INS BY IDENTITY, NEVER BY NUMBER. Plan item J takes the exercise library from ~79 to
// ~143. Anything that computes "how many minus 79" silently gives every user on earth 60 extra slots of
// allowance the day it ships, or takes them away, and nothing errors.
// ─────────────────────────────────────────────────────────────────────────────

const readArray = async (key: string): Promise<any[]> => {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

/**
 * Custom exercises the USER made, out of the whole library.
 *
 * ⚠️ Takes the built-in list as an ARGUMENT on purpose. `DEFAULT_LIBRARY` is a private constant inside
 * app/workout-library.tsx, and BOTH doors that create an exercise live in that same screen, so it is the
 * only caller that ever needs this and it already has the list in scope. Exporting a screen's internals into
 * a utility, or moving a 79-entry constant between files, would both be bigger changes than this deserves.
 * (The tidier long-term home for DEFAULT_LIBRARY is workoutData.ts, next to PRESET_PROGRAMS -- item J is
 * about to add ~60 entries to it and is the natural moment to move it.)
 *
 * Identity, not arithmetic: an entry is the user's if its id is not one of the built-in ids. That is the
 * same test workout-library.tsx already uses when it merges new defaults in.
 */
export function countUserExercises(library: { id: string }[], builtInIds: string[]): number {
  const builtIn = new Set(builtInIds);
  return library.filter(e => !builtIn.has(e.id)).length;
}

// ─────────────────────────────────────────────────────────────────────────────
// DORMANCY -- the two REVERT caps (meal slots, stats graphs)
//
// The other six caps GRANDFATHER: an over-cap user keeps everything and simply cannot add more. These two
// REVERT: the extras stop being drawn and the layout goes back to its free shape. Nothing is ever deleted.
//
// ⚠️⚠️ POSITION DECIDES, AND NOTHING IS STORED. The first N are awake, the rest are asleep. There is no
// "dormant" flag anywhere, which is the whole point:
//   - nothing can disagree with the count,
//   - NO MIGRATION RUNS when a membership ends (nothing to run twice, nothing to fail halfway),
//   - resubscribing is the same in reverse and equally free,
//   - waking one is just dragging it above the line,
//   - deleting a live one automatically wakes the next one down.
// ⚠️ NEVER build this on the stats cards' `visible` flag: that one is USER-controlled, so a downgraded user
// would simply switch their extras back on.
// ⚠️ This decides what is DRAWN. It must never be what gets SAVED -- see the warnings on the save paths.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ⚠️ STATS GRAPHS DO NOT USE liveItems/sleepingItems. Read this before touching that cap.
 *
 * Meal slots are a RAW TOTAL: 5 means five slots, defaults included, so "the first 5 are awake" is right.
 * Stats graphs are NOT. "7 defaults + 1 of your own" means the seven the app ships NEVER sleep and you get
 * exactly ONE custom graph awake. Treating it as "the first 8 graph cards" was built first and is WRONG --
 * Justin caught it on device with two of his customs awake purely because they happened to sit inside the
 * first eight, which is arbitrary. It also meant deleting default graphs bought you custom slots.
 *
 * Consequences worth knowing: sleeping graphs are NOT a contiguous tail (customs are scattered through the
 * order), so there is no divider to draw -- each sleeping one carries its own lock. And a card is custom if
 * its id is not one of DEFAULT_STATS_CARDS': identity, never arithmetic.
 */
export function liveCustomGraphIds(
  graphCards: { id: string }[],
  defaultIds: string[],
  cap: number | null,
): Set<string> {
  if (cap === null) return new Set(graphCards.map(c => c.id));
  const isDefault = new Set(defaultIds);
  const awake = new Set<string>();
  let customsAwake = 0;
  // The free allowance is "the defaults, plus (cap - defaults) of your own" -- one, at the shipped numbers.
  const customAllowance = Math.max(0, cap - defaultIds.length);
  for (const c of graphCards) {
    if (isDefault.has(c.id)) { awake.add(c.id); continue; }
    if (customsAwake < customAllowance) { awake.add(c.id); customsAwake++; }
  }
  return awake;
}

/** The items that are awake. Everything past the cap sleeps. Unlimited/unknown = all of them. */
export function liveItems<T>(items: T[], cap: number | null): T[] {
  if (cap === null) return items;
  return items.slice(0, cap);
}

/** The items that are asleep -- what the Edit sheets show below the line, and nothing else ever draws. */
export function sleepingItems<T>(items: T[], cap: number | null): T[] {
  if (cap === null) return [];
  return items.slice(cap);
}

/**
 * Programs the USER made. The built-ins are seeded into the SAME list (`pj_my_programs`) marked
 * `createdAt: 0`, while the builder stamps a real `Date.now()` on anything a user saves. So a truthy
 * createdAt IS the identity test, and it needs no import.
 * A program somehow saved without a createdAt reads as built-in and is not counted -- that errs toward
 * giving the user MORE room, which is the safe direction for a miscount.
 */
const countUserPrograms = (programs: any[]): number => programs.filter(p => !!p?.createdAt).length;

/**
 * How many of `key` the user has right now.
 *
 * ⚠️ `exercises` cannot be counted here (see countUserExercises above) and returns 0. The Exercise Library
 * screen is the only place that needs it and calls countUserExercises directly.
 */
export async function countFor(key: CapKey): Promise<number> {
  switch (key) {
    case 'foods':      return (await readArray('pj_my_foods')).length;
    case 'savedMeals': return (await readArray('pj_saved_meals')).length;
    case 'recipes':    return (await readArray('pj_recipes')).length;
    case 'routines':   return (await readArray('pj_routines')).length;
    case 'programs':   return countUserPrograms(await readArray('pj_my_programs'));
    case 'exercises':  return 0;
    case 'mealSlots': {
      // Lives inside pj_settings, not its own key. An account that has never touched them has the 4 defaults.
      try {
        const raw = await AsyncStorage.getItem('pj_settings');
        const s = raw ? JSON.parse(raw) : {};
        return Array.isArray(s.mealSlots) && s.mealSlots.length > 0 ? s.mealSlots.length : DEFAULT_MEAL_SLOTS.length;
      } catch {
        return DEFAULT_MEAL_SLOTS.length;
      }
    }
    case 'statsGraphs': {
      // GRAPH cards only. The system sections (At a Glance, Trends, Records...) are not part of this cap.
      const cards = await readArray('pj_stats_cards');
      if (cards.length === 0) return DEFAULT_STATS_CARDS.filter(c => c.type === 'graph').length;
      return cards.filter(c => c?.type === 'graph').length;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// THE ANSWER
// ─────────────────────────────────────────────────────────────────────────────

/** The limit for this user, honouring the DEV override. null = unlimited. */
export function capFor(key: CapKey, isSupporter: boolean): number | null {
  const override = __DEV__ ? devOverrides[key] : undefined;
  if (typeof override === 'number') return override;
  return isSupporter ? SUPPORTER_CAPS[key] : FREE_CAPS[key];
}

/** Build the answer from a count the caller already has. Sync, so a screen holding its own list pays nothing. */
export function capStateFrom(key: CapKey, count: number, isSupporter: boolean, membershipLoading: boolean): CapState {
  // ⚠️ NEVER GATE ON AN UNKNOWN ANSWER. During startup isSupporter is false because RevenueCat has not
  // replied, not because the user is free. Treating that as free would dim a paying customer's buttons and
  // put a padlock on them, which is the worst bug this feature can have. Same rule, same reason, as the
  // step-down notice's loading guard on Home.
  if (membershipLoading) return UNLIMITED;

  const cap = capFor(key, isSupporter);
  if (cap === null) return { ...UNLIMITED, count };

  const atCap = count >= cap;
  return { cap, count, unlimited: false, atCap, canCreate: !atCap };
}

/**
 * The normal entry point: read the count and answer.
 *
 * ⚠️ Reads fresh every time ON PURPOSE (Justin's call, 2026-08-01). Delete a food while sitting at the cap
 * and the button must come back immediately, not when you next revisit the screen. Most screens already hold
 * their list in memory anyway and should use capStateFrom instead of this.
 * ⚠️ `exercises` must go through capStateFrom with a count from countUserExercises.
 */
export async function checkCap(key: CapKey, isSupporter: boolean, membershipLoading: boolean): Promise<CapState> {
  if (membershipLoading) return UNLIMITED;
  const count = await countFor(key);
  return capStateFrom(key, count, isSupporter, membershipLoading);
}

// ─────────────────────────────────────────────────────────────────────────────
// 🚨 DEV ONLY -- MUST BE UNREACHABLE IN A STORE BUILD. On the revert-before-launch list.
//
// WHY IT EXISTS: every cap has TWO walls, one AT the limit ("You've Built 20 Foods", with the offer to
// delete one) and one OVER it ("All 50 Of Your Foods Are Still Here", with no delete offer). Justin's real
// account sits well over most caps, so without this the AT-cap wall could only be reached by deleting his
// real data, which is never happening. Setting foods to 50 puts him exactly at the cap; setting it back to
// 20 puts him over. Both walls, same data, nothing destroyed.
// It also reaches the caps his account is UNDER (routines, programs, exercises) without creating junk.
// ─────────────────────────────────────────────────────────────────────────────

const DEV_OVERRIDE_KEY = 'pj_dev_cap_overrides';

// Read into memory so capFor can stay synchronous. Loaded once at startup by loadDevCapOverrides().
let devOverrides: Partial<Record<CapKey, number>> = {};

export async function loadDevCapOverrides(): Promise<void> {
  if (!__DEV__) return;
  try {
    const raw = await AsyncStorage.getItem(DEV_OVERRIDE_KEY);
    devOverrides = raw ? (JSON.parse(raw) || {}) : {};
  } catch {
    devOverrides = {};
  }
}

export function getDevCapOverrides(): Partial<Record<CapKey, number>> {
  return __DEV__ ? { ...devOverrides } : {};
}

/** Pass null to clear one back to its real value. */
export async function setDevCapOverride(key: CapKey, value: number | null): Promise<void> {
  if (!__DEV__) return;
  const next = { ...devOverrides };
  if (value === null) delete next[key];
  else next[key] = value;
  devOverrides = next;
  try { await AsyncStorage.setItem(DEV_OVERRIDE_KEY, JSON.stringify(next)); } catch {}
}

export async function clearDevCapOverrides(): Promise<void> {
  if (!__DEV__) return;
  devOverrides = {};
  try { await AsyncStorage.removeItem(DEV_OVERRIDE_KEY); } catch {}
}
