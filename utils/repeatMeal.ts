// Repeat a Meal -- re-log a previous day's meal-slot entries into the day you're
// viewing by CLONING the stored entries exactly (no saved object, no re-resolve).
//
// The whole design rests on one idea: copy = byte-for-byte clone of the stored entry,
// changing only `meal` (-> destination slot id) and `timestamp` (-> incremented "now").
// Because nothing is re-looked-up, serving/amount, macros, and every extended-nutrition
// field are GUARANTEED identical to the original, and AI-estimated + stale-food name-match
// bugs can't trigger. Photos come free: they key off the food's fsId/myFoodId (which the
// clone carries), not the entry. See SPEC_repeat_meal.md.

import { MealSlot } from './mealSlots';

// AsyncStorage + storageSet are lazy-required inside the async scanners (below) rather than
// imported at the top. That keeps this module's PURE logic (buildClones / matchSlotEntries /
// label + date helpers) loadable by the plain-node unit test without dragging in React Native,
// exactly like the other pure engines. In the app these resolve identically via Metro.
const getAsyncStorage = () => require('@react-native-async-storage/async-storage').default;
const getStorageSet = () => require('./storage').storageSet as (k: string, v: string) => Promise<void>;

export interface RepeatItem {
  entry: any;   // the raw stored entry (the clone source)
  name: string;
  cal: number;      // raw (round at display / after summing, to match the Log tab)
  protein: number;  // raw grams
  carbs: number;    // raw grams
  fat: number;      // raw grams
}

// Round any over-precise number baked into a food name for display, e.g. a gram weight stored
// as "108.5000000031" -> "108.5". Only touches numbers with 3+ decimal places so clean values
// (43, 50, 12.5) are left alone. Display-only; the stored entry is never mutated.
export function tidyFoodName(name: string): string {
  if (!name) return name;
  return name.replace(/\d+\.\d{3,}/g, m => String(Math.round(parseFloat(m) * 10) / 10));
}

// Map a stored entry to a RepeatItem (raw macros; display rounds).
function entryToItem(e: any): RepeatItem {
  return { entry: e, name: e.name, cal: e.cal || 0, protein: e.protein || 0, carbs: e.carbs || 0, fat: e.fat || 0 };
}

export interface RepeatDay {
  dateKey: string;        // 'YYYY-MM-DD'
  relativeLabel: string;  // 'Yesterday' | 'Tuesday'
  dateLabel: string;      // 'Wed, Jul 9' | 'Jul 8'
  totalKcal: number;
  items: RepeatItem[];    // matching entries in the source slot, in stored order
}

export interface SlotRepeatInfo {
  hasHistory: boolean;          // any day in the window has copyable items for this slot
  yesterdayItems: RepeatItem[]; // items in the same slot on the day before the viewed day ([] if none)
  yesterdayTotal: number;
}

// ── pure date helpers (local time) ────────────────────────────────────────────────────────────────
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAYS_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function keyFromDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Parse a YYYY-MM-DD key into a local Date (noon, to dodge DST edges).
export function dateFromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

// Given a viewed-day key, return the key of the day before it.
export function prevDayKey(viewedKey: string, daysBack = 1): string {
  const d = dateFromKey(viewedKey);
  d.setDate(d.getDate() - daysBack);
  return keyFromDate(d);
}

// Human labels for an accordion row. When the day is the one right before the viewed day
// we say "Yesterday" and show an abbreviated weekday + date; otherwise the full weekday is
// the primary label and the date carries no weekday (avoids "Tuesday · Tue, Jul 8").
export function formatDayLabels(dateKey: string, yesterdayKey: string): { relativeLabel: string; dateLabel: string } {
  const d = dateFromKey(dateKey);
  if (dateKey === yesterdayKey) {
    return { relativeLabel: 'Yesterday', dateLabel: `${WEEKDAYS_ABBR[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}` };
  }
  return { relativeLabel: WEEKDAYS_FULL[d.getDay()], dateLabel: `${MONTHS[d.getMonth()]} ${d.getDate()}` };
}

// ── pure entry logic ──────────────────────────────────────────────────────────────────────────────

// The Log matches a slot's entries by id OR legacy display name (slots are renamable).
// Reuse that exact rule to find source entries. Null-safe.
export function matchSlotEntries(entries: any[], slot: MealSlot): any[] {
  if (!Array.isArray(entries)) return [];
  return entries.filter(e => e != null && (e.meal === slot.id || e.meal === slot.name));
}

// Deep-clone each source entry, overriding ONLY meal + timestamp. Timestamps are stamped
// baseTs, baseTs+1, ... so original order is preserved and every entry stays unique.
// tutorialEntry is stripped (a demo flag should never ride a real re-log).
export function buildClones(items: RepeatItem[], destSlotId: string, baseTs: number): any[] {
  return items.map((it, idx) => {
    const clone = JSON.parse(JSON.stringify(it.entry));
    clone.meal = destSlotId;
    clone.timestamp = baseTs + idx;
    delete clone.tutorialEntry;
    return clone;
  });
}

// ── AsyncStorage scanners ─────────────────────────────────────────────────────────────────────────

// ONE pass over the last `windowDays` day-records (relative to the viewed day), bucketed per
// slot, so the Log tab can decide -- cheaply, for every slot at once -- whether to show the
// Repeat pill and whether a one-tap "repeat yesterday" target exists. Reads each day record
// only once regardless of how many slots the user has.
export async function getRepeatSummary(
  slots: MealSlot[],
  viewedKey: string,
  windowDays = 14,
): Promise<Record<string, SlotRepeatInfo>> {
  const AsyncStorage = getAsyncStorage();
  const viewed = dateFromKey(viewedKey);
  const yesterdayKey = prevDayKey(viewedKey);
  const result: Record<string, SlotRepeatInfo> = {};
  for (const s of slots) result[s.id] = { hasHistory: false, yesterdayItems: [], yesterdayTotal: 0 };

  for (let i = 1; i <= windowDays; i++) {
    const d = new Date(viewed);
    d.setDate(viewed.getDate() - i);
    const dateKey = keyFromDate(d);
    let raw: string | null = null;
    try { raw = await AsyncStorage.getItem(`pj_${dateKey}`); } catch {}
    if (!raw) continue;
    let data: any;
    try { data = JSON.parse(raw); } catch { continue; }
    const entries: any[] = Array.isArray(data?.entries) ? data.entries : [];
    if (entries.length === 0) continue;
    for (const s of slots) {
      const items = matchSlotEntries(entries, s);
      if (items.length === 0) continue;
      result[s.id].hasHistory = true;
      if (dateKey === yesterdayKey) {
        result[s.id].yesterdayItems = items.map(entryToItem);
        result[s.id].yesterdayTotal = Math.round(items.reduce((sum, e) => sum + (e.cal || 0), 0));
      }
    }
  }
  return result;
}

// Full accordion data for ONE source slot: every day in the window (newest-first) that has
// at least one copyable item in that slot. A day with zero matching items is simply skipped
// (no blank/0-item row). Called when the modal opens or its source chip changes.
export async function getRepeatDays(
  sourceSlot: MealSlot,
  viewedKey: string,
  windowDays = 14,
): Promise<RepeatDay[]> {
  const AsyncStorage = getAsyncStorage();
  const viewed = dateFromKey(viewedKey);
  const yesterdayKey = prevDayKey(viewedKey);
  const days: RepeatDay[] = [];

  for (let i = 1; i <= windowDays; i++) {
    const d = new Date(viewed);
    d.setDate(viewed.getDate() - i);
    const dateKey = keyFromDate(d);
    let raw: string | null = null;
    try { raw = await AsyncStorage.getItem(`pj_${dateKey}`); } catch {}
    if (!raw) continue;
    let data: any;
    try { data = JSON.parse(raw); } catch { continue; }
    const entries: any[] = Array.isArray(data?.entries) ? data.entries : [];
    const items = matchSlotEntries(entries, sourceSlot);
    if (items.length === 0) continue;
    const { relativeLabel, dateLabel } = formatDayLabels(dateKey, yesterdayKey);
    days.push({
      dateKey,
      relativeLabel,
      dateLabel,
      totalKcal: Math.round(items.reduce((s, e) => s + (e.cal || 0), 0)),
      items: items.map(entryToItem),
    });
  }
  return days; // i=1 is the most recent, so already newest-first
}

// Read-then-merge the viewed day's record and append the cloned items. Never replaces the
// day's entries -- appends to whatever is already stored (data-integrity rule). Returns the
// merged entries array so the caller can update state + push to Firebase.
export async function logRepeatedItems(
  viewedKey: string,
  destSlotId: string,
  items: RepeatItem[],
): Promise<any[]> {
  const AsyncStorage = getAsyncStorage();
  const storageSet = getStorageSet();
  let raw: string | null = null;
  try { raw = await AsyncStorage.getItem(`pj_${viewedKey}`); } catch {}
  const data = raw ? JSON.parse(raw) : {};
  const existing: any[] = Array.isArray(data.entries) ? data.entries.filter((e: any) => e != null) : [];
  const clones = buildClones(items, destSlotId, Date.now());
  const merged = [...existing, ...clones];
  await storageSet(`pj_${viewedKey}`, JSON.stringify({ ...data, entries: merged }));
  return merged;
}
