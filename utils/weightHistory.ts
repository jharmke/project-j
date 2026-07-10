// Weight History -- the safe read/edit/delete engine behind the home Weight card's
// gear modal. Body weight is stored as a per-day SCALAR (pj_<YYYY-MM-DD>.weight = one
// weigh-in per day), NOT a per-entry array like water. So "history" = one row per day
// that has a numeric `.weight`, newest-first.
//
// "Starting weight" is NOT a separate field: it is simply the EARLIEST weigh-in in this
// history. Correcting it = editing that entry; adding an earlier back-dated entry makes it
// the new earliest automatically. The home card + weight milestones already key off the
// earliest weigh-in, so there is no baseline logic to change. See SPEC_weight_history.md.
//
// DATA INTEGRITY: every writer READ-THEN-MERGES the specific pj_<date> key and only ever
// touches `weight` -- that day's food/water/sleep/etc. are never replaced. Delete removes
// ONLY the weight field and writes everything else back. Non-numeric / <=0 / future dates
// are refused; a plausible-or-not NUMBER is allowed to save (this is a fix-it tool, and a
// legit correction can be a big jump). The milestone-typo guard lives at the call site, not
// here (mirrors logWeight: an implausible value saves but does not feed milestones).

// AsyncStorage + storageSet + saveToFirebase are lazy-required inside the async functions (not
// imported at the top) so this module's PURE helpers (parse/validate/date) load in the plain-
// node unit test without dragging in React Native or Firebase, exactly like utils/repeatMeal.ts.
// In the app these resolve identically via Metro.
const getAsyncStorage = () => require('@react-native-async-storage/async-storage').default;
const getStorageSet = () => require('./storage').storageSet as (k: string, v: string) => Promise<void>;
const getSaveToFirebase = () => require('../firebaseConfig').saveToFirebase as (d: string, f: string, v: any) => Promise<void>;

export interface WeighIn {
  date: string;    // YYYY-MM-DD
  weight: number;  // lbs
}

export interface WriteResult {
  ok: boolean;
  reason?: string; // set when ok === false, human-readable
}

// A pj_ daily-data key holding a single day, e.g. "pj_2026-07-10". Excludes pj_profile,
// pj_settings, pj_workout_state, etc. (they aren't YYYY-MM-DD dated).
const DAY_KEY_RE = /^pj_(\d{4}-\d{2}-\d{2})$/;

// ── Pure helpers (unit-tested, no RN / no AsyncStorage) ──────────────────────────────────

// Is this an app storage key for one dated day? Returns the date part or null.
export function dayKeyDate(key: string): string | null {
  const m = DAY_KEY_RE.exec(key);
  return m ? m[1] : null;
}

// ISO date strings (YYYY-MM-DD) compare correctly with plain string ordering, so no Date math
// is needed to tell whether a chosen day is in the future.
export function isFutureDate(dateKey: string, todayKey: string): boolean {
  return dateKey > todayKey;
}

// Validate a raw weight input (string from a TextInput, or a number). Refuses blank, non-
// numeric, zero, and negative. Deliberately does NOT reject "big" values -- a correction can
// legitimately be a large change; the milestone-typo guard is separate and lives at the call
// site. A soft upper bound catches obvious garbage (a mis-typed run-on like 17800).
export function validateWeight(raw: string | number): WriteResult & { value?: number } {
  const val = typeof raw === 'number' ? raw : parseFloat(String(raw).trim());
  if (!isFinite(val) || isNaN(val)) return { ok: false, reason: 'Enter a number' };
  if (val <= 0) return { ok: false, reason: 'Weight must be more than 0' };
  if (val > 1500) return { ok: false, reason: 'That weight looks too high' };
  // Normalize to one decimal place (matches the card's 1-decimal input cap).
  const value = Math.round(val * 10) / 10;
  return { ok: true, value };
}

// Build the newest-first history from raw [key, jsonString] pairs (as AsyncStorage.multiGet
// returns them). Keeps only dated day-keys whose record parses and has a numeric weight > 0.
// Pure so the test can feed fake records; the async gatherWeightHistory() just wraps it.
export function parseHistory(pairs: [string, string | null][]): WeighIn[] {
  const out: WeighIn[] = [];
  for (const [key, raw] of pairs) {
    const date = dayKeyDate(key);
    if (!date || !raw) continue;
    let rec: any;
    try { rec = JSON.parse(raw); } catch { continue; }
    const w = rec?.weight;
    if (typeof w === 'number' && isFinite(w) && w > 0) out.push({ date, weight: w });
  }
  // Newest-first (dates are ISO, so string sort is chronological).
  out.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return out;
}

// The starting weight = the earliest (oldest) weigh-in. history is newest-first, so it's the
// last element. null when there are no weigh-ins yet.
export function startingWeighIn(history: WeighIn[]): WeighIn | null {
  return history.length ? history[history.length - 1] : null;
}

// ── Async storage operations (lazy RN require) ───────────────────────────────────────────

// The true, uncapped full weight history (fixes the >365-day edge case in the home card's
// day-by-day scan). newest-first.
export async function gatherWeightHistory(): Promise<WeighIn[]> {
  const AsyncStorage = getAsyncStorage();
  const allKeys: string[] = await AsyncStorage.getAllKeys();
  const dayKeys = allKeys.filter(k => DAY_KEY_RE.test(k));
  if (!dayKeys.length) return [];
  const pairs: [string, string | null][] = await AsyncStorage.multiGet(dayKeys);
  return parseHistory(pairs);
}

// Save/replace the weigh-in for one day. READ-THEN-MERGE: only `weight` is touched; the rest
// of that day's record is preserved. Refuses non-numeric/<=0/too-high and future dates.
// Syncs the single field to Firebase. Returns { ok, reason } -- the caller shows the toast and
// runs the milestone check (which applies its own plausibility guard).
export async function saveWeightForDate(dateKey: string, raw: string | number, todayKey: string): Promise<WriteResult & { value?: number }> {
  if (isFutureDate(dateKey, todayKey)) return { ok: false, reason: "Can't log a future date" };
  const v = validateWeight(raw);
  if (!v.ok || v.value === undefined) return v;

  const AsyncStorage = getAsyncStorage();
  const storageSet = getStorageSet();
  try {
    const existing = await AsyncStorage.getItem(`pj_${dateKey}`);
    const current = existing ? JSON.parse(existing) : {};
    await storageSet(`pj_${dateKey}`, JSON.stringify({ ...current, weight: v.value }));
    getSaveToFirebase()(dateKey, 'weight', v.value);
    return { ok: true, value: v.value };
  } catch (e) {
    console.log('Weight save error', e);
    return { ok: false, reason: 'Could not save' };
  }
}

// Delete the weigh-in for one day: remove ONLY the `weight` field, write the rest of the day
// back untouched. Syncs the removal to Firebase (null reads as absent to every consumer). No-op
// if the day has no record or no weight.
export async function deleteWeightForDate(dateKey: string): Promise<WriteResult> {
  const AsyncStorage = getAsyncStorage();
  const storageSet = getStorageSet();
  try {
    const existing = await AsyncStorage.getItem(`pj_${dateKey}`);
    if (!existing) return { ok: true }; // nothing to delete
    const current = JSON.parse(existing);
    if (!('weight' in current)) return { ok: true };
    const { weight, ...rest } = current;
    await storageSet(`pj_${dateKey}`, JSON.stringify(rest));
    getSaveToFirebase()(dateKey, 'weight', null);
    return { ok: true };
  } catch (e) {
    console.log('Weight delete error', e);
    return { ok: false, reason: 'Could not delete' };
  }
}
