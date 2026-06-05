import AsyncStorage from '@react-native-async-storage/async-storage';
import { storageSet } from './storage';

/**
 * Prayer tracker storage. The user's OWN private prayer list, distinct from the email
 * PrayerRequestModal (which sends a request to the team). Backs the faith-tab Prayer
 * preview card and the dedicated app/prayer.tsx screen.
 *
 * Framing: "things I am carrying before God," not a todo checklist. Ongoing prayers are
 * SUPPOSED to persist; marking answered is optional and reversible; there is no day counter.
 *
 * Storage: a single pj_prayers array. Every mutation re-reads the current array, applies the
 * change, and writes back through storageSet (rides the cloud backup like the journal). It
 * never writes from stale in-memory state, so a concurrent write can never clobber data.
 */

export type PrayerStatus = 'active' | 'answered';

export interface Prayer {
  id: string;
  text: string;
  status: PrayerStatus;
  createdAt: number;       // epoch ms when first added
  answeredAt: number | null; // epoch ms when marked answered, null while active
}

const STORAGE_KEY = 'pj_prayers';

// Short unique id. base36 timestamp + random suffix, so two adds in the same millisecond
// still differ. App runtime only (not a Workflow script), so Date.now/Math.random are fine.
function newId(): string {
  return `p_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e9).toString(36)}`;
}

// Read the raw array straight from storage. Tolerant of a missing or corrupt key (returns
// []), never throws, and never drops fields. Every mutation goes through this so it always
// operates on the freshest on-disk state, not a stale snapshot.
async function readList(): Promise<Prayer[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeList(list: Prayer[]): Promise<void> {
  await storageSet(STORAGE_KEY, JSON.stringify(list));
}

/** Load every prayer for the UI. Filtering and sorting are the caller's job (see selectors). */
export async function loadPrayers(): Promise<Prayer[]> {
  return readList();
}

/** Add a new active prayer. Trims the text; ignores an empty add. Returns the updated list. */
export async function addPrayer(text: string): Promise<Prayer[]> {
  const clean = text.trim();
  if (!clean) return readList();
  const list = await readList();
  const entry: Prayer = { id: newId(), text: clean, status: 'active', createdAt: Date.now(), answeredAt: null };
  const updated = [entry, ...list];
  await writeList(updated);
  return updated;
}

/** Update a prayer's text (edit). Trims; ignores an empty edit. Status and dates are untouched. */
export async function updatePrayer(id: string, text: string): Promise<Prayer[]> {
  const clean = text.trim();
  if (!clean) return readList();
  const list = await readList();
  const updated = list.map(p => (p.id === id ? { ...p, text: clean } : p));
  await writeList(updated);
  return updated;
}

/** Mark a prayer answered, stamped now. No-op if it is already answered. Returns the new list. */
export async function markAnswered(id: string): Promise<Prayer[]> {
  const list = await readList();
  const updated = list.map(p =>
    p.id === id && p.status !== 'answered' ? { ...p, status: 'answered' as const, answeredAt: Date.now() } : p,
  );
  await writeList(updated);
  return updated;
}

/** Move an answered prayer back to active (the reversibility for an accidental tap). */
export async function unanswerPrayer(id: string): Promise<Prayer[]> {
  const list = await readList();
  const updated = list.map(p =>
    p.id === id ? { ...p, status: 'active' as const, answeredAt: null } : p,
  );
  await writeList(updated);
  return updated;
}

/** Permanently remove a prayer (real data, so the screen confirms before calling this). */
export async function deletePrayer(id: string): Promise<Prayer[]> {
  const list = await readList();
  const updated = list.filter(p => p.id !== id);
  await writeList(updated);
  return updated;
}

// ─── Pure selectors, shared by the card and the screen so both stay consistent ───────────

/** Active prayers, most recently added first. */
export function getActive(list: Prayer[]): Prayer[] {
  return list.filter(p => p.status === 'active').sort((a, b) => b.createdAt - a.createdAt);
}

/** Answered prayers, most recently answered first. */
export function getAnswered(list: Prayer[]): Prayer[] {
  return list.filter(p => p.status === 'answered').sort((a, b) => (b.answeredAt ?? 0) - (a.answeredAt ?? 0));
}

/** How many prayers have been answered (the preview-card hero stat, shown only when > 0). */
export function answeredCount(list: Prayer[]): number {
  return list.filter(p => p.status === 'answered').length;
}
