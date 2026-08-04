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
export async function requestRatingPrompt(opts?: { force?: boolean }): Promise<{ fired: boolean; reason?: CanAskReason; hadAction?: boolean; error?: string }> {
  if (!opts?.force) {
    const check = await canAskForRating();
    if (!check.allowed) return { fired: false, reason: check.reason };
  }
  let hadAction = false;
  let error: string | undefined;
  try {
    hadAction = await StoreReview.hasAction();
    if (hadAction) {
      await StoreReview.requestReview();
    }
  } catch (e: any) {
    error = e?.message || String(e);
  }
  const state = await loadRatePromptState();
  await storageSet(KEY, JSON.stringify({ ...state, lastAskedAt: new Date().toISOString(), totalAsks: state.totalAsks + 1 }));
  return { fired: true, hadAction, error };
}

// Dev-tools testing only: resets the ask history (lastAskedAt/totalAsks) and backdates firstSeenAt
// to (MIN_ACCOUNT_AGE_DAYS + 1) days ago, so the 7-day account-age gate can never block a test --
// including undoing the damage from any earlier reset that wiped firstSeenAt to "now." A raw
// AsyncStorage.removeItem of the whole key was the original (wrong) approach.
export async function resetRatePromptBudget(): Promise<void> {
  const backdated = new Date(Date.now() - (MIN_ACCOUNT_AGE_DAYS + 1) * 24 * 60 * 60 * 1000).toISOString();
  await storageSet(KEY, JSON.stringify({ firstSeenAt: backdated, lastAskedAt: null, totalAsks: 0 }));
}

// Call from a real trigger moment (water goal hit, gratitude logged, etc.), NOT from the dev-tools
// button. Fires 3 seconds after the call so it never fights an achievement toast / celebration
// overlay popping from the same action for the screen. `tutorialActive` must be the caller's own
// useTutorial().activeState -- pass it truthy whenever a tutorial/demo walkthrough is running so a
// simulated demo action can never spend one of the 3 real asks. Fire-and-forget; never throws.
// ⚠️ NO LAUNCH-COLLISION GUARD HERE, and that is a checked decision, not an oversight (2026-08-04).
// Item N raised the worry that this could land the store review sheet on top of a launch pop-up. Every
// trigger was then traced: water and protein goals only move when you log in the app, weight achievements
// come from saving or editing a weight, and the workout, challenge, Bible, devotional, journal and
// gratitude triggers are all button presses. You cannot do any of those while a modal is on screen, so the
// collision is unreachable. A guard was written, then removed rather than carried as insurance against
// something that cannot happen. Apple health data does NOT trigger this at all.
export function fireRatingTrigger(tutorialActive: unknown): void {
  if (tutorialActive) return;
  setTimeout(() => { requestRatingPrompt().catch(() => {}); }, 3000);
}
