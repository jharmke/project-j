import AsyncStorage from '@react-native-async-storage/async-storage';
import { storageSet } from './storage';
import type { ReadingPlansStorage } from '../data/readingPlans';

/**
 * Reading-plan progress storage, used by the Plans page (app/plans.tsx).
 *
 * IMPORTANT: this reads and writes the SAME pj_reading_plans key and the SAME shape that the Bible
 * reader (app/bible.tsx) already uses ({ startDate, completedDays, enrolledAt } per plan id). The
 * reader keeps its own inline copy of this logic; both go through storageSet with a read-then-merge,
 * so the two writers never clobber each other and a plan started here shows up there and vice versa.
 * This file exists so the Plans page does not have to import from the reader screen; it is purely
 * additive and changes nothing in bible.tsx.
 */

const STORAGE_KEY = 'pj_reading_plans';

function todayKey(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

async function readStore(): Promise<ReadingPlansStorage> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function writeStore(store: ReadingPlansStorage): Promise<void> {
  await storageSet(STORAGE_KEY, JSON.stringify(store));
}

/** Load all reading-plan progress for the UI. */
export async function loadReadingPlanProgress(): Promise<ReadingPlansStorage> {
  return readStore();
}

/** Enroll in a reading plan. Idempotent: re-enrolling NEVER resets existing progress. */
export async function enrollReadingPlan(planId: string): Promise<ReadingPlansStorage> {
  const store = await readStore();
  if (store[planId]) return store;
  const next: ReadingPlansStorage = {
    ...store,
    [planId]: { startDate: todayKey(), completedDays: [], enrolledAt: Date.now() },
  };
  await writeStore(next);
  return next;
}

/** Drop a reading plan (removes its progress; the UI confirms first, it is real progress). */
export async function dropReadingPlan(planId: string): Promise<ReadingPlansStorage> {
  const store = await readStore();
  if (!(planId in store)) return store;
  const { [planId]: _removed, ...rest } = store;
  await writeStore(rest);
  return rest;
}

/** Mark a plan day complete (0-indexed). No-op if already complete. */
export async function markReadingPlanDay(planId: string, dayIndex: number): Promise<ReadingPlansStorage> {
  const store = await readStore();
  const prog = store[planId];
  if (!prog || prog.completedDays.includes(dayIndex)) return store;
  const next: ReadingPlansStorage = {
    ...store,
    [planId]: { ...prog, completedDays: [...prog.completedDays, dayIndex] },
  };
  await writeStore(next);
  return next;
}

export function isReadingPlanEnrolled(store: ReadingPlansStorage, planId: string): boolean {
  return !!store[planId];
}
