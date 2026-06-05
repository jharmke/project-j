import AsyncStorage from '@react-native-async-storage/async-storage';
import { storageSet } from './storage';
import type {
  Devotional,
  DevotionalsStorage,
  DevotionalProgress,
  DevotionalDayEntry,
  DevotionalHaloTurn,
} from '../data/devotionals';

/**
 * Devotional progress storage. Holds the user's enrollment, per-day typed answers, saved
 * Halo conversations, and completion state. The static devotional CONTENT lives in
 * data/devotionals.ts; this file is only the user's progress over that content.
 *
 * Storage: a single pj_devotionals object keyed by devotional id. Every mutation re-reads the
 * whole store, applies the change with a deep read-then-merge (store -> progress -> day entry),
 * and writes back through storageSet (rides the cloud backup like the journal and prayers). It
 * never writes from stale in-memory state, and it never drops a sibling field, so a saved
 * answer can never clobber a saved Halo thread or vice versa.
 */

const STORAGE_KEY = 'pj_devotionals';

// Local YYYY-MM-DD for the enrollment record. App runtime only (not a Workflow script), so
// new Date() is fine here, same as the rest of the app.
function todayKey(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

// Read the raw store straight from storage. Tolerant of a missing or corrupt key (returns {}),
// never throws. Every mutation goes through this so it always operates on the freshest on-disk
// state, not a stale snapshot.
async function readStore(): Promise<DevotionalsStorage> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function writeStore(store: DevotionalsStorage): Promise<void> {
  await storageSet(STORAGE_KEY, JSON.stringify(store));
}

// Internal mutator. Re-reads the store, ensures a progress record exists for this devotional
// (auto-enrolls so an answer or thread is never lost on a never-enrolled devotional), applies
// the change to a SHALLOW COPY of progress + entries, and writes the whole store back.
async function mutateProgress(
  id: string,
  mutator: (progress: DevotionalProgress) => DevotionalProgress,
): Promise<DevotionalsStorage> {
  const store = await readStore();
  const existing: DevotionalProgress = store[id] ?? {
    startDate: todayKey(),
    enrolledAt: Date.now(),
    entries: {},
  };
  const working: DevotionalProgress = {
    ...existing,
    entries: { ...existing.entries },
  };
  const next: DevotionalsStorage = { ...store, [id]: mutator(working) };
  await writeStore(next);
  return next;
}

// Merge a patch into one day's entry, preserving every other field on that entry.
function patchDay(
  progress: DevotionalProgress,
  day: number,
  patch: Partial<DevotionalDayEntry>,
): DevotionalProgress {
  const entry = progress.entries[day] ?? {};
  progress.entries[day] = { ...entry, ...patch };
  return progress;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/** Load the whole devotional progress store for the UI. */
export async function loadDevotionalProgress(): Promise<DevotionalsStorage> {
  return readStore();
}

/** Enroll in a devotional. Idempotent: re-enrolling NEVER resets existing progress. */
export async function enrollDevotional(id: string): Promise<DevotionalsStorage> {
  return mutateProgress(id, p => p);
}

/** Remove a devotional's progress entirely (deletes its saved answers + threads, so the UI
 *  confirms before calling this, the same as deleting a prayer). */
export async function unenrollDevotional(id: string): Promise<DevotionalsStorage> {
  const store = await readStore();
  if (!(id in store)) return store;
  const { [id]: _removed, ...rest } = store;
  await writeStore(rest);
  return rest;
}

/** Save the user's typed reflection answer for a day. Trims; an empty answer clears it. Leaves
 *  the day's saved Halo thread and completion untouched. */
export async function saveDevotionalAnswer(
  id: string,
  day: number,
  answer: string,
): Promise<DevotionalsStorage> {
  const clean = answer.trim();
  return mutateProgress(id, p =>
    patchDay(p, day, { answer: clean, answeredAt: clean ? Date.now() : undefined }),
  );
}

/** Save the inline Halo conversation for a day. Leaves the typed answer and completion alone. */
export async function saveDevotionalHaloThread(
  id: string,
  day: number,
  thread: DevotionalHaloTurn[],
): Promise<DevotionalsStorage> {
  return mutateProgress(id, p => patchDay(p, day, { haloThread: thread }));
}

/** Mark a day complete, stamped now. */
export async function markDevotionalDayComplete(
  id: string,
  day: number,
): Promise<DevotionalsStorage> {
  return mutateProgress(id, p => patchDay(p, day, { completed: true, completedAt: Date.now() }));
}

/** Reverse a day's completion (an accidental tap). Keeps the answer and Halo thread. */
export async function unmarkDevotionalDayComplete(
  id: string,
  day: number,
): Promise<DevotionalsStorage> {
  return mutateProgress(id, p => patchDay(p, day, { completed: false, completedAt: undefined }));
}

// ─── Pure selectors, shared by the card, the plans page, and the devotional screen ───────

export function isDevotionalEnrolled(store: DevotionalsStorage, id: string): boolean {
  return !!store[id];
}

export function getDevotionalProgress(
  store: DevotionalsStorage,
  id: string,
): DevotionalProgress | undefined {
  return store[id];
}

export function getDevotionalEntry(
  store: DevotionalsStorage,
  id: string,
  day: number,
): DevotionalDayEntry | undefined {
  return store[id]?.entries[day];
}

/** Enrolled devotional ids, most recently enrolled first (for the card's active list). */
export function getEnrolledDevotionalIds(store: DevotionalsStorage): string[] {
  return Object.keys(store).sort((a, b) => (store[b].enrolledAt ?? 0) - (store[a].enrolledAt ?? 0));
}

/** The day to resume on: the first day not yet completed, or the last day if all are done.
 *  Returns 1 for a devotional with no progress yet. */
export function getNextDay(dev: Devotional, progress?: DevotionalProgress): number {
  if (!progress) return 1;
  for (let d = 1; d <= dev.totalDays; d++) {
    if (!progress.entries[d]?.completed) return d;
  }
  return dev.totalDays;
}
