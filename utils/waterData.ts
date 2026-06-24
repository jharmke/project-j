// utils/waterData.ts
// Single source of truth for daily water.
//
// A day stores two water fields that must agree: `water` (the number) and
// `waterEntries` (the list of individual logs). They used to be written from two
// different screens that each trusted a different field, so a stale entries list could
// clobber a day's real total (the 2026-06-24 water-clobber bug). The rule now: the
// entries LIST is the input; the `water` NUMBER is a derived cache kept exactly in sync.
//
// CRITICAL (data integrity): reconciliation NEVER lowers a day. If the stored number is
// higher than the entries sum (legacy days that predate the list, or days the clobber bug
// shortened), we keep the higher number and add a single top-up entry so the list reaches
// it. Worst case a day is unchanged; best case a corrupted day heals back UP to the truth.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { storageSet } from './storage';
import { isSyncReady } from '../services/syncService';

export interface WaterEntry { amount: number; timestamp: string; sign: 'add' | 'remove'; }

// Signed sum of a water entries list (add = +, remove = -). Never negative.
export function sumWaterEntries(entries: WaterEntry[] | undefined | null): number {
  if (!Array.isArray(entries)) return 0;
  return Math.max(0, entries.reduce((s, e) => s + (e?.sign === 'remove' ? -(e?.amount || 0) : (e?.amount || 0)), 0));
}

// Reconcile one day's water so the list and number agree, NEVER reducing the day's total.
// Returns the corrected fields plus whether anything actually changed (so callers can skip
// no-op writes). `dateKey` is the bare Y-M-D (no pj_ prefix), used only to timestamp a heal.
export function reconcileDayWater(
  data: any,
  dateKey: string,
): { water: number; waterEntries: WaterEntry[]; changed: boolean } {
  const entries: WaterEntry[] = Array.isArray(data?.waterEntries)
    ? data.waterEntries.filter((e: any) => e && typeof e.amount === 'number')
    : [];
  const entriesSum = sumWaterEntries(entries);
  const num = typeof data?.water === 'number' && data.water > 0 ? data.water : 0;

  // num > entriesSum: the number is the truthful record (legacy or clobbered day). Heal the
  // list UP by appending one top-up entry so it reaches the number. Never the other way.
  if (num > entriesSum) {
    const topUp: WaterEntry = {
      amount: num - entriesSum,
      sign: 'add',
      timestamp: `${dateKey}T12:00:00.000Z`,
    };
    return { water: num, waterEntries: [...entries, topUp], changed: true };
  }

  // Otherwise the list is the full record. Keep it; only flag a change if the cached number
  // is out of sync with it (and there is real water to sync) so we don't touch empty days.
  const water = entriesSum;
  const changed = entries.length > 0 && data?.water !== water;
  return { water, waterEntries: entries, changed };
}

const RECONCILE_FLAG = 'pj_water_reconciled_v1';

// One-time history heal across every daily record. Idempotent (flag-gated) and SAFE: only
// writes days that need it, and never lowers a total. Runs only once sync is ready so the
// healed days reach the cloud too; if sync isn't ready yet it no-ops WITHOUT setting the
// flag, so it retries on a later launch/focus.
export async function runWaterReconciliation(): Promise<void> {
  try {
    const done = await AsyncStorage.getItem(RECONCILE_FLAG);
    if (done === 'true') return;
    if (!isSyncReady()) return; // wait for restore/unlock so cloud heals too; retry next time
    const keys = await AsyncStorage.getAllKeys();
    const dayKeys = keys.filter(k => /^pj_\d{4}-\d{2}-\d{2}$/.test(k));
    for (const key of dayKeys) {
      try {
        const raw = await AsyncStorage.getItem(key);
        if (!raw) continue;
        const data = JSON.parse(raw);
        const { water, waterEntries, changed } = reconcileDayWater(data, key.slice(3));
        if (changed) {
          await storageSet(key, JSON.stringify({ ...data, water, waterEntries }));
        }
      } catch {}
    }
    await AsyncStorage.setItem(RECONCILE_FLAG, 'true');
  } catch {}
}
