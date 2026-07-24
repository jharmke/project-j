// utils/ratingPrompt.ts
// Rate Us prompt engine. See SPEC_rate_us_and_feedback.md.
//
// Storage: pj_rate_prompt -- { firstSeenAt, lastAskedAt, totalAsks }. Synced automatically (any
// pj_ prefixed key rides the generic sync mechanism in services/syncService.ts).
//
// Budget: 30 days minimum between asks, 3 total for the life of the install, shared across every
// trigger + the Otto fallback -- every caller goes through requestRatingPrompt() so there is exactly
// ONE place that increments totalAsks. We never learn whether a rating was actually given (Apple's
// own design, no callback exists) -- this only tracks that WE asked, never the outcome. Apple's own
// client-side state silently stops showing the prompt to someone who already rated; we don't and
// can't replicate that, we just don't need to.

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';
import { storageSet } from './storage';

const KEY = 'pj_rate_prompt';
const MIN_DAYS_BETWEEN_ASKS = 30;
const MAX_TOTAL_ASKS = 3;
const MIN_ACCOUNT_AGE_DAYS = 7;

export interface RatePromptState {
  firstSeenAt: string;        // ISO, stamped once (lazy-init, never overwritten)
  lastAskedAt: string | null; // ISO
  totalAsks: number;
}

function daysSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24);
}

async function readRaw(): Promise<RatePromptState | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed.firstSeenAt) return null; // malformed, treat as absent
    return {
      firstSeenAt: parsed.firstSeenAt,
      lastAskedAt: parsed.lastAskedAt ?? null,
      totalAsks: parsed.totalAsks ?? 0,
    };
  } catch { return null; }
}

// Stamps firstSeenAt exactly once. Call after the restore gate has resolved (app/_layout.tsx) so a
// reinstalled long-time user's real original firstSeenAt (already pulled down from the cloud by then)
// is never mistaken for a brand-new install and overwritten with "now."
export async function ensureRatePromptInitialized(): Promise<void> {
  const existing = await readRaw();
  if (existing) return;
  const state: RatePromptState = { firstSeenAt: new Date().toISOString(), lastAskedAt: null, totalAsks: 0 };
  await storageSet(KEY, JSON.stringify(state));
}

export async function loadRatePromptState(): Promise<RatePromptState> {
  const existing = await readRaw();
  if (existing) return existing;
  // Not yet initialized (shouldn't normally happen post-boot) -- initialize now rather than block.
  await ensureRatePromptInitialized();
  return (await readRaw()) ?? { firstSeenAt: new Date().toISOString(), lastAskedAt: null, totalAsks: 0 };
}

export type CanAskReason = 'account_too_new' | 'budget_exhausted' | 'too_soon';

export async function canAskForRating(): Promise<{ allowed: boolean; reason?: CanAskReason }> {
  const state = await loadRatePromptState();
  if (daysSince(state.firstSeenAt) < MIN_ACCOUNT_AGE_DAYS) return { allowed: false, reason: 'account_too_new' };
  if (state.totalAsks >= MAX_TOTAL_ASKS) return { allowed: false, reason: 'budget_exhausted' };
  if (state.lastAskedAt && daysSince(state.lastAskedAt) < MIN_DAYS_BETWEEN_ASKS) return { allowed: false, reason: 'too_soon' };
  return { allowed: true };
}

// Fires Apple's native prompt if allowed and records the ask. `force` (dev-tools testing only) skips
// every guard but STILL records the ask, so the budget bookkeeping itself is exercised by the test,
// not bypassed along with everything else.
export async function requestRatingPrompt(opts?: { force?: boolean }): Promise<{ fired: boolean; reason?: CanAskReason }> {
  if (!opts?.force) {
    const check = await canAskForRating();
    if (!check.allowed) return { fired: false, reason: check.reason };
  }
  try {
    if (await StoreReview.hasAction()) {
      await StoreReview.requestReview();
    }
  } catch {}
  const state = await loadRatePromptState();
  await storageSet(KEY, JSON.stringify({ ...state, lastAskedAt: new Date().toISOString(), totalAsks: state.totalAsks + 1 }));
  return { fired: true };
}
