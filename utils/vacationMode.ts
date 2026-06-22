// Vacation Mode engine -- see SPEC_vacation_mode.md.
//
// One toggle: the user sets a number of days and the app treats that whole stretch
// as planned off days. Each in-range day gets a FULL-DAY exclusion merged onto its
// pj_<date> record (read-then-merge, additive), so every shipped exclusion reader
// (Day Score, weekly/monthly, comparison, EvR, streaks via the full-day branch of
// streakHeldByExclusion) already honors it for free. Sleep + recovery scores still
// generate/stay viewable (vacation sets ONLY the averaging `excluded`, never
// `sleepTrendExcluded`). Streaks freeze; nothing counts.
//
// Storage: a single `pj_vacation` record. It is a pj_ key, so storageSet mirrors it
// to the cloud and the restore gate brings it back on reinstall automatically (no
// syncService change needed). Per-day excluded flags ride on the already-synced
// pj_<date> records.
//
// Data safety: every write is read-then-merge and never drops other fields. When a
// day is stamped, its PRIOR excluded state is saved on the record (vacationPrevExcluded)
// so un-stamping restores any manual exclusion the user had set before the vacation.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { storageSet } from './storage';

export interface VacationState {
  active: boolean;
  startKey: string;   // YYYY-MM-DD inclusive
  endKey: string;     // YYYY-MM-DD inclusive
  startedAt: string;  // ISO
}

const KEY = 'pj_vacation';
export const MAX_VACATION_DAYS = 30;

// ── date helpers (local time) ─────────────────────────────────────────────────
function toKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function vacationTodayKey(): string { return toKey(new Date()); }
export function addDaysKey(key: string, n: number): string {
  const d = new Date(key + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return toKey(d);
}
// YYYY-MM-DD strings compare correctly with <, <=, >.

// ── read ──────────────────────────────────────────────────────────────────────
export async function getVacation(): Promise<VacationState | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (v && typeof v === 'object' && typeof v.startKey === 'string' && typeof v.endKey === 'string') {
      return { active: !!v.active, startKey: v.startKey, endKey: v.endKey, startedAt: v.startedAt || '' };
    }
  } catch {}
  return null;
}

// True when a date falls inside the CURRENTLY ACTIVE vacation window. Cheap helper
// for any caller that wants a live check without reading the day record.
export function isDateInVacation(dateKey: string, v: VacationState | null): boolean {
  return !!v && v.active && dateKey >= v.startKey && dateKey <= v.endKey;
}

// ── per-day stamping (read-then-merge, manual-exclusion preserving) ────────────
async function stampDayIfNeeded(dateKey: string): Promise<void> {
  const k = `pj_${dateKey}`;
  let cur: any = {};
  try { const raw = await AsyncStorage.getItem(k); if (raw) cur = JSON.parse(raw); } catch {}
  if (cur.vacationDay) return; // already stamped -- never re-capture prior state
  const prevEx = (cur.excluded && typeof cur.excluded === 'object') ? cur.excluded : {};
  await storageSet(k, JSON.stringify({
    ...cur,
    excluded: { ...prevEx, diet: true, water: true, exercise: true },
    vacationPrevExcluded: prevEx, // restore target for un-stamp
    vacationDay: true,
  }));
}

async function unstampDay(dateKey: string): Promise<void> {
  const k = `pj_${dateKey}`;
  let cur: any = null;
  try { const raw = await AsyncStorage.getItem(k); if (raw) cur = JSON.parse(raw); } catch {}
  if (!cur || !cur.vacationDay) return; // only clear days VACATION set
  const restore = (cur.vacationPrevExcluded && typeof cur.vacationPrevExcluded === 'object')
    ? cur.vacationPrevExcluded
    : { diet: false, water: false, exercise: false };
  const { vacationDay, vacationPrevExcluded, ...rest } = cur;
  await storageSet(k, JSON.stringify({ ...rest, excluded: restore }));
}

// ── lifecycle ───────────────────────────────────────────────────────────────--
// Stamp every in-range day that is today-or-earlier (future days are stamped lazily
// as they arrive, so end-early never has to un-stamp days that never happened). Also
// auto-expires the vacation once today is past the end date.
export async function applyVacation(): Promise<void> {
  const v = await getVacation();
  if (!v || !v.active) return;
  const today = vacationTodayKey();
  const last = today < v.endKey ? today : v.endKey; // min(today, endKey)
  for (let d = v.startKey; d <= last; d = addDaysKey(d, 1)) {
    await stampDayIfNeeded(d);
  }
  if (today > v.endKey) {
    // Window is over: deactivate (past days keep their stamps = honest record).
    await storageSet(KEY, JSON.stringify({ ...v, active: false }));
  }
}

// Start a vacation of `days` length beginning on startKey (today, future, or past).
// `days` is clamped to [1, MAX_VACATION_DAYS]. Stamps the elapsed/today portion now.
export async function startVacation(startKey: string, days: number): Promise<VacationState> {
  const n = Math.max(1, Math.min(MAX_VACATION_DAYS, Math.floor(days)));
  const v: VacationState = {
    active: true,
    startKey,
    endKey: addDaysKey(startKey, n - 1),
    startedAt: new Date().toISOString(),
  };
  await storageSet(KEY, JSON.stringify(v));
  await applyVacation(); // stamp anything already elapsed (incl. a fully-past range)
  return v;
}

// End a running vacation now: today and any future in-range days are un-stamped (you
// are back), days that already elapsed STAY excluded (you really were off). If nothing
// had elapsed yet (a future-scheduled vacation), the record is removed entirely.
export async function endVacationEarly(): Promise<void> {
  const v = await getVacation();
  if (!v) return;
  const today = vacationTodayKey();
  for (let d = today < v.startKey ? v.startKey : today; d <= v.endKey; d = addDaysKey(d, 1)) {
    await unstampDay(d);
  }
  if (v.startKey >= today) {
    // Never started (today or future start): cancel it completely.
    await AsyncStorage.removeItem(KEY);
    return;
  }
  // Some days elapsed: keep the shortened, now-inactive record (history of the trip).
  await storageSet(KEY, JSON.stringify({ ...v, active: false, endKey: addDaysKey(today, -1) }));
}

// DEV ONLY -- fully reverse a vacation, un-stamping EVERY in-range day (including past)
// and removing the record, so a test leaves zero trace. Not used by real UI.
export async function cancelVacationFully(): Promise<void> {
  const v = await getVacation();
  if (!v) return;
  for (let d = v.startKey; d <= v.endKey; d = addDaysKey(d, 1)) {
    await unstampDay(d);
  }
  await AsyncStorage.removeItem(KEY);
}

// One-line summary for the dev tool.
export async function describeVacation(): Promise<string> {
  const v = await getVacation();
  if (!v) return 'No vacation set.';
  const today = vacationTodayKey();
  const status = v.active ? (today < v.startKey ? 'scheduled' : 'ACTIVE') : 'ended/expired';
  return `${status}: ${v.startKey} -> ${v.endKey} (started ${v.startedAt.slice(0, 10) || '?'})`;
}
