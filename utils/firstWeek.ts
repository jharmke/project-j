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

// When the taste runs out. Stored locally the moment it is granted, so the step-down notice does not have to
// watch for an entitled -> not-entitled transition (which is fragile: it depends on catching one launch).
// Instead the check is three flat questions -- is that date past, are they no longer entitled, has the notice
// already been shown -- which behave identically in testing and in production.
const ENDS_AT_KEY = 'pj_first_week_ends_at';

// Once-ever flag for the step-down notice. Its own key, so it is impossible for the notice to fire twice.
const STEP_DOWN_SHOWN_KEY = 'pj_first_week_stepdown_shown';

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
      // Remember the end date either way. On a REFUSAL the server hands back the end date of the week they
      // already had, which is exactly what a reinstall mid-taste needs to know.
      if (result.endsAtMs > 0) {
        await AsyncStorage.setItem(ENDS_AT_KEY, String(result.endsAtMs)).catch(() => {});
      }
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

// Which kind of membership this account last HELD: the promotional free week, or something they paid for.
// ⚠️ IT HAS TO BE RECORDED WHILE THEY STILL HAVE IT. RevenueCat tells the app which one it is (a granted
// week comes back as PROMOTIONAL -- see readDetails in MembershipContext), but the moment the entitlement
// lapses that detail is gone, and the lapse is exactly when the answer is needed.
const LAST_KIND_KEY = 'pj_last_membership_kind';

export type MembershipKind = 'taste' | 'paid';

/**
 * Called on every launch that finds a live entitlement. Two jobs:
 *  1. remember which kind it is, so the notice can pick its title once it ends, and
 *  2. CLEAR the once-shown flag, so a later cancellation gets its own notice.
 *
 * ⚠️ (2) is what fixes subscribe -> cancel -> resubscribe -> cancel only ever telling somebody once. The flag
 * was "once ever"; it is now once per membership.
 */
export async function recordActiveMembership(kind: MembershipKind): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_KIND_KEY, kind);
    await AsyncStorage.removeItem(STEP_DOWN_SHOWN_KEY);
  } catch {}
}

/**
 * Should the step-down notice fire on this launch, and which version?
 * Returns null for "no notice".
 *
 * `entitled` is passed in rather than read here, because membership truth lives in MembershipContext and a
 * second source would eventually disagree with the first.
 *
 * ⚠️ The "still entitled" check is what stops this firing for someone who SUBSCRIBED during their week. Their
 * taste end date passes exactly the same way, but nothing has been taken from them, so there is nothing to
 * announce.
 *
 * ⚠️ TWO WAYS IN, AND THE PAID ONE USED NOT TO EXIST. This was only ever three checks against the 7-DAY TASTE
 * end date, which is right for the taste and wrong for everybody else: somebody who subscribed later (after
 * their taste ended and the notice had already fired) and then cancelled got NOTHING -- their meal slots and
 * stats graphs quietly reverted with no explanation. That is a paying customer, and the group most likely to
 * read a silent change as the app breaking.
 */
export async function stepDownKind(entitled: boolean): Promise<'firstWeek' | 'cancelled' | null> {
  if (entitled) return null;
  try {
    if ((await AsyncStorage.getItem(STEP_DOWN_SHOWN_KEY)) === 'true') return null;

    // A membership that has ENDED. Recorded while it was live, so this is the only reliable signal once the
    // entitlement itself is gone.
    const lastKind = await AsyncStorage.getItem(LAST_KIND_KEY);
    if (lastKind === 'paid') return 'cancelled';

    const raw = await AsyncStorage.getItem(ENDS_AT_KEY);
    const endsAtMs = raw ? Number(raw) : 0;
    if (!endsAtMs || !Number.isFinite(endsAtMs)) return null;
    return Date.now() >= endsAtMs ? 'firstWeek' : null;
  } catch {
    return null;
  }
}

/** Marked the moment the notice is actually rendered, so it can never appear twice for one membership. */
export async function markStepDownShown(): Promise<void> {
  try { await AsyncStorage.setItem(STEP_DOWN_SHOWN_KEY, 'true'); } catch {}
}

/**
 * DEV TOOL ONLY: pretend the week has already run out, so the notice can be tested without waiting seven days.
 * ⚠️ Forces the recorded kind back to 'taste'. Without that, any account that has ever held a real
 * subscription would get the CANCELLED version from this button, because a paid membership ending outranks
 * the taste date -- and the free-week version would be untestable.
 */
export async function devExpireFirstWeek(): Promise<void> {
  await AsyncStorage.setItem(ENDS_AT_KEY, String(Date.now() - 60_000)).catch(() => {});
  await AsyncStorage.setItem(LAST_KIND_KEY, 'taste').catch(() => {});
  await AsyncStorage.removeItem(STEP_DOWN_SHOWN_KEY).catch(() => {});
}

/**
 * DEV TOOL ONLY: pretend a real subscription just ended, so the cancelled version of the notice can be seen.
 * ⚠️ Exists because the taste is granted as a PROMOTIONAL entitlement, so Grant/Revoke First Week can only
 * ever produce the 'taste' state -- reaching 'paid' otherwise needs an actual purchase and cancellation.
 */
export async function devSimulateCancelled(): Promise<void> {
  await AsyncStorage.setItem(LAST_KIND_KEY, 'paid').catch(() => {});
  await AsyncStorage.removeItem(STEP_DOWN_SHOWN_KEY).catch(() => {});
}
