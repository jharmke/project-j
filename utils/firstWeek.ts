// utils/firstWeek.ts
//
// Claims the 7-day taste for a brand-new account. Design lives in SPEC_monetization.md ->
// "THE FIRST WEEK: A 7-DAY TASTE, THEN STEP DOWN". The grant itself is SERVER-SIDE
// (functions/src/firstWeek.ts) because a client that could grant itself Supporter could run up the
// Anthropic bill.
//
// ⚠️ WHY THIS RETRIES. The all-set screen tells the user their first week is on us and then navigates
// straight into the app -- deliberately, because nobody should sit on a spinner at the end of onboarding.
// If the grant call fails on a bad network moment, they would spend their free week on free limits and
// neither they nor we would ever know. So a failure is remembered and retried promptly, not silently
// swallowed and not left until some launch tomorrow.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebaseConfig';

// Set when a claim fails, cleared the moment one succeeds (or is refused as already-had). Its presence is
// the only thing that makes the app try again.
const PENDING_KEY = 'pj_first_week_pending';

const ATTEMPT_DELAYS_MS = [0, 3_000, 12_000];

export type ClaimResult = { ok: boolean; granted: boolean; endsAtMs: number };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function callGrant(): Promise<ClaimResult> {
  const fn = httpsCallable(getFunctions(app), 'grantFirstWeek');
  const res = await fn({ tzOffsetMinutes: new Date().getTimezoneOffset() });
  const d = (res.data ?? {}) as { granted?: boolean; endsAtMs?: number };
  return { ok: true, granted: !!d.granted, endsAtMs: typeof d.endsAtMs === 'number' ? d.endsAtMs : 0 };
}

/**
 * Claim the first week. Safe to call more than once: the server refuses a second grant for an account that
 * has already had one, and reports that as a normal outcome rather than an error.
 * Never throws -- onboarding must not be blocked or broken by this.
 */
export async function claimFirstWeek(): Promise<ClaimResult> {
  for (let i = 0; i < ATTEMPT_DELAYS_MS.length; i++) {
    if (ATTEMPT_DELAYS_MS[i] > 0) await sleep(ATTEMPT_DELAYS_MS[i]);
    try {
      const result = await callGrant();
      // Reached the server, so there is nothing left to retry -- whether it granted or refused.
      await AsyncStorage.removeItem(PENDING_KEY).catch(() => {});
      return result;
    } catch {
      // keep trying
    }
  }
  await AsyncStorage.setItem(PENDING_KEY, 'true').catch(() => {});
  return { ok: false, granted: false, endsAtMs: 0 };
}

/** True if a previous claim never reached the server. Checked on launch. */
export async function firstWeekClaimPending(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(PENDING_KEY)) === 'true';
  } catch {
    return false;
  }
}
