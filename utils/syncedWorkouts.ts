import AsyncStorage from '@react-native-async-storage/async-storage';
import { storageSet } from './storage';

// Synced Workouts (Apple Health) grouping -- Phase 1 foundation for the "Workout History" feature.
// Groups raw Apple workout sessions by { activity type + indoor flag } into labeled drawers. This is
// the stable KEY the real feature will file entries under (a rename only changes the label, never the
// key), so getting the grouping right on real data is the whole point of the Phase 1 verification view.

export interface SyncedWorkout {
  uuid: string;
  type: number;              // HKWorkoutActivityType numeric code
  name: string;              // base type name (e.g. "Running")
  indoor: boolean | null;    // true = indoor/treadmill, false = outdoor, null = device never set the flag
  durationSec: number;
  distanceMi: number | null;
  calories: number;
  startDate: string | Date;
}

export interface SyncedGroup {
  key: string;               // stable filing key: `${type}_${in|out|x}`
  label: string;             // display label: "Indoor Running", "Outdoor Cycling", or bare name when flag missing
  type: number;
  indoor: boolean | null;
  sessions: SyncedWorkout[]; // newest first
}

// Activity types (numeric HKWorkoutActivityType) where indoor vs outdoor is a GENUINE, meaningful split
// -- you do them both ways and it changes the workout. Everything else ignores the flag and groups by
// type alone, so we never get nonsense like "Outdoor Traditional Strength Training" or a bogus "Outdoor
// Elliptical" (the flag is set on every workout even where it's meaningless). Small + stable set; Apple's
// codes rarely change. A split type whose flag is MISSING falls into the plain, unprefixed bucket.
export const SPLIT_TYPES = new Set<number>([
  52, // Walking
  37, // Running
  13, // Cycling
  46, // Swimming
  35, // Rowing
]);

export function syncedGroupKey(type: number, indoor: boolean | null): string {
  if (!SPLIT_TYPES.has(type) || indoor === null) return `${type}`;
  return `${type}_${indoor ? 'in' : 'out'}`;
}

export function syncedGroupLabel(name: string, indoor: boolean | null, type: number): string {
  if (!SPLIT_TYPES.has(type) || indoor === null) return name;
  return (indoor ? 'Indoor ' : 'Outdoor ') + name;
}

export function groupSyncedWorkouts(list: SyncedWorkout[]): SyncedGroup[] {
  const map = new Map<string, SyncedGroup>();
  for (const w of list) {
    const key = syncedGroupKey(w.type, w.indoor);
    if (!map.has(key)) {
      map.set(key, { key, label: syncedGroupLabel(w.name, w.indoor, w.type), type: w.type, indoor: w.indoor, sessions: [] });
    }
    map.get(key)!.sessions.push(w);
  }
  const groups = Array.from(map.values());
  // Newest session first within each drawer; drawers ordered by how many sessions they hold.
  groups.forEach(g => g.sessions.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()));
  groups.sort((a, b) => b.sessions.length - a.sessions.length);
  return groups;
}

export function formatDurationShort(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// ── History-modal summary / sort / month grouping (Phase 3b polish) ──────────────────────────────────
export type SyncedSort = 'newest' | 'oldest' | 'longest' | 'furthest' | 'mostcal';

export interface SyncedSummary {
  count: number; totalSec: number; totalMi: number; totalCal: number;
  avgSec: number; avgMi: number; avgCal: number;
  longestSec: number; furthestMi: number; mostCal: number;
  // Date each record was set (the session that holds the max), for the "SET <date>" sub-line on the
  // record tiles. null only when there are no qualifying sessions.
  longestDate: string | Date | null; furthestDate: string | Date | null; mostCalDate: string | Date | null;
  hasDistance: boolean;
}

export function summarizeSessions(sessions: SyncedWorkout[]): SyncedSummary {
  let totalSec = 0, totalMi = 0, totalCal = 0, longestSec = 0, furthestMi = 0, mostCal = 0;
  let longestDate: string | Date | null = null, furthestDate: string | Date | null = null, mostCalDate: string | Date | null = null;
  for (const s of sessions) {
    totalSec += s.durationSec || 0;
    totalMi += s.distanceMi || 0;
    totalCal += s.calories || 0;
    if ((s.durationSec || 0) > longestSec) { longestSec = s.durationSec || 0; longestDate = s.startDate; }
    if ((s.distanceMi || 0) > furthestMi) { furthestMi = s.distanceMi || 0; furthestDate = s.startDate; }
    if ((s.calories || 0) > mostCal) { mostCal = s.calories || 0; mostCalDate = s.startDate; }
  }
  const n = sessions.length || 1;
  return {
    count: sessions.length, totalSec, totalMi: Math.round(totalMi * 10) / 10, totalCal,
    avgSec: Math.round(totalSec / n), avgMi: Math.round((totalMi / n) * 100) / 100, avgCal: Math.round(totalCal / n),
    longestSec, furthestMi: Math.round(furthestMi * 100) / 100, mostCal,
    longestDate, furthestDate, mostCalDate,
    hasDistance: sessions.some(s => (s.distanceMi || 0) > 0),
  };
}

// ── Cardio PR detection (View Summary recap) ─────────────────────────────────────────────────────
// A cardio PR is per DRAWER (activity type + indoor flag), never a lumped "Cardio" bucket -- Indoor
// Walking, Outdoor Walking, and Indoor Cycling each keep their own records. For the given day, today's
// best beats the best of every PRIOR session in that drawer (or it's the drawer's first-ever session).
// Distance + duration only; calories intentionally excluded (noisy, mostly duration-driven). The bar is
// "beats the prior all-time best," so re-opening the summary is idempotent and tomorrow today's session
// becomes the mark to beat -- no re-pop. Apple-synced sessions only (manual cardio lacks per-session
// history). Self-healing: delete a session from Health and the record recomputes, like lift ghost-PRs.
export interface CardioPRHit {
  key: string;
  label: string;          // drawer label (custom rename applied), e.g. "Outdoor Walking"
  durationPR: boolean;
  durationSec: number;    // today's best duration for this drawer
  distancePR: boolean;
  distanceMi: number;     // today's best distance for this drawer
}

// Local YYYY-MM-DD for a session's start, to compare against a day key (which is also local).
function localDateKey(d: string | Date): string {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

export function detectCardioPRs(sessions: SyncedWorkout[], dayKey: string, labels: Record<string, string> = {}): CardioPRHit[] {
  const groups = groupSyncedWorkouts(sessions);
  const hits: CardioPRHit[] = [];
  for (const g of groups) {
    let priorDur = 0, priorDist = 0, todayDur = 0, todayDist = 0;
    let hasToday = false;
    for (const s of g.sessions) {
      const day = localDateKey(s.startDate);
      const dur = s.durationSec || 0, dist = s.distanceMi || 0;
      if (day === dayKey) {
        hasToday = true;
        if (dur > todayDur) todayDur = dur;
        if (dist > todayDist) todayDist = dist;
      } else if (day < dayKey) {
        if (dur > priorDur) priorDur = dur;
        if (dist > priorDist) priorDist = dist;
      }
      // sessions AFTER dayKey are ignored (a later day can't affect this day's record)
    }
    if (!hasToday) continue;
    const durationPR = todayDur > 0 && todayDur > priorDur;
    const distancePR = todayDist > 0 && todayDist > priorDist;
    if (durationPR || distancePR) {
      hits.push({ key: g.key, label: labels[g.key] || g.label, durationPR, durationSec: todayDur, distancePR, distanceMi: todayDist });
    }
  }
  return hits;
}

export function sortSessions(sessions: SyncedWorkout[], sort: SyncedSort): SyncedWorkout[] {
  const arr = [...sessions];
  switch (sort) {
    case 'oldest': arr.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()); break;
    case 'longest': arr.sort((a, b) => (b.durationSec || 0) - (a.durationSec || 0)); break;
    case 'furthest': arr.sort((a, b) => (b.distanceMi || 0) - (a.distanceMi || 0)); break;
    case 'mostcal': arr.sort((a, b) => (b.calories || 0) - (a.calories || 0)); break;
    default: arr.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }
  return arr;
}

export interface MonthSection { key: string; label: string; sessions: SyncedWorkout[]; }
export function groupSessionsByMonth(sessions: SyncedWorkout[]): MonthSection[] {
  const map = new Map<string, MonthSection>();
  for (const s of sessions) {
    const d = new Date(s.startDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!map.has(key)) map.set(key, { key, label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), sessions: [] });
    map.get(key)!.sessions.push(s);
  }
  const sections = Array.from(map.values());
  sections.sort((a, b) => b.key.localeCompare(a.key)); // newest month first
  return sections;
}

export function formatDurationLong(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// ── Custom labels (Phase 2) ────────────────────────────────────────────────────────────────────────
// The ONLY thing the synced-workouts feature persists. A group's entry is otherwise derived live from
// HealthKit, so this map is purely a rename override keyed by the STABLE group key ({type}_{in|out} or
// {type}). Additive: read-then-merge, never touches pj_exercise_library or pj_workout_state. An empty
// label resets the group back to its default ("Indoor Running" etc.).
const LABELS_KEY = 'pj_synced_workout_labels';

export async function loadSyncedLabels(): Promise<Record<string, string>> {
  try {
    const raw = await AsyncStorage.getItem(LABELS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export async function saveSyncedLabel(key: string, label: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(LABELS_KEY);
    const current: Record<string, string> = raw ? JSON.parse(raw) : {};
    const trimmed = label.trim();
    if (trimmed) current[key] = trimmed;
    else delete current[key];
    await storageSet(LABELS_KEY, JSON.stringify(current));
  } catch {}
}

// Apply saved custom labels over the derived defaults.
export function applySyncedLabels(groups: SyncedGroup[], labels: Record<string, string>): SyncedGroup[] {
  return groups.map(g => (labels[g.key] ? { ...g, label: labels[g.key] } : g));
}

// ── Query cache (perf, stale-while-revalidate) ───────────────────────────────────────────────────
// The synced library entries derive from a native HealthKit queryWorkoutSamples (1 year, up to 1000
// sessions) that runs on every Library open, so the Apple entries used to pop in a beat after the
// list painted. This cache lets the last-known list render on the FIRST frame; a fresh query still
// runs in the background and updates if anything changed.
//
// Display-only + device-local: we cache the RAW SyncedWorkout[] (labels are applied fresh at render,
// so a rename is never frozen into the cache) and write with plain AsyncStorage, NOT storageSet --
// this is re-derivable HealthKit data, it must not consume cloud sync. Never touches pj_workout_state,
// pj_exercise_library, or the label store.
const CACHE_KEY = 'pj_synced_workout_cache';
let memCache: SyncedWorkout[] | null = null; // survives navigation within a session (skips even the AsyncStorage read)

// Cached raw list if we have one (in-memory first, else disk). Returns null on a true cold miss.
export async function loadSyncedCache(): Promise<SyncedWorkout[] | null> {
  if (memCache) return memCache;
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) { memCache = parsed; return parsed; }
    return null;
  } catch {
    return null;
  }
}

export async function saveSyncedCache(list: SyncedWorkout[]): Promise<void> {
  memCache = list;
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(list));
  } catch {}
}
