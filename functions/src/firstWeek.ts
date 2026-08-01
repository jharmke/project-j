import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { REVENUECAT_SECRET_KEY } from './membership';

// ─── THE 7-DAY TASTE ─────────────────────────────────────────────────────────
// New accounts run on FULL Supporter limits for their first week, then step down. Design + reasoning:
// SPEC_monetization.md -> "THE FIRST WEEK: A 7-DAY TASTE, THEN STEP DOWN".
//
// It is NOT a third membership state and must never be built as one. A taste IS Supporter status with a
// known end date -- exactly the shape of a monthly sub someone cancelled. So we grant a RevenueCat
// PROMOTIONAL entitlement (the same mechanism used to comp testers) and every gate in the app opens on its
// own, because `isSupporter` is genuinely true.
//
// ⚠️ THE GRANT MUST BE SERVER-SIDE. A client that could grant itself Supporter could run up the Anthropic
// bill, which is the one place in this system where a lie costs real money.

const SUPPORTER_ENTITLEMENT_ID = 'supporter';
const RC_BASE = 'https://api.revenuecat.com/v1';

// Server-only. Records that this account has HAD its week, which is doing two jobs at once:
//   1. it stops the retry (see grantFirstWeek's caller) granting twice, and
//   2. it stops a REINSTALL farming a second week -- `pj_onboarding_complete` is LOCAL, so a reinstall
//      re-runs onboarding and would otherwise ask for another one.
// Load-bearing, not a nice-to-have.
const firstWeekDoc = (uid: string) => admin.firestore().collection('firstWeek').doc(uid);

export interface FirstWeekRecord {
  grantedAtMs: number;
  endsAtMs: number;
  revokedAtMs?: number;   // dev-tool revoke only; the record itself is NEVER deleted
}

// How many whole local days the taste covers, on top of whatever is left of the day they finish onboarding.
// So finishing at 11pm still gets a full week rather than an hour and six days.
const TASTE_DAYS = 7;

// End of the taste = LOCAL MIDNIGHT, so the week never expires at some random hour of the afternoon.
// RevenueCat takes an arbitrary `end_time_ms`, so we are not stuck with its fixed duration buckets.
//
// The client sends `Date.getTimezoneOffset()` verbatim (minutes to ADD to local time to reach UTC, so it is
// POSITIVE west of Greenwich). We only ever use it for this calculation -- it cannot buy anyone extra
// access beyond a day's worth, so it is not worth defending against.
function endOfTasteMs(nowMs: number, tzOffsetMinutes: number): number {
  const offsetMs = tzOffsetMinutes * 60_000;
  const localNow = nowMs - offsetMs;
  const localMidnightToday = Math.floor(localNow / 86_400_000) * 86_400_000;
  const localEnd = localMidnightToday + (TASTE_DAYS + 1) * 86_400_000;
  return localEnd + offsetMs;
}

async function revenueCat(path: string, key: string): Promise<Response> {
  return fetch(`${RC_BASE}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });
}

// ─── GRANT ───────────────────────────────────────────────────────────────────
// Returns { granted: false, reason: 'already' } rather than throwing when the account has had its week.
// That is a normal outcome (a retry, a reinstall), not an error.
export const grantFirstWeek = onCall(
  { secrets: [REVENUECAT_SECRET_KEY], maxInstances: 10 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Please sign in.');
    }
    const uid = request.auth.uid;

    const data = (request.data ?? {}) as { tzOffsetMinutes?: unknown };
    const tzOffsetMinutes =
      typeof data.tzOffsetMinutes === 'number' && Number.isFinite(data.tzOffsetMinutes)
        ? data.tzOffsetMinutes
        : 0;

    const existing = await firstWeekDoc(uid).get();
    if (existing.exists) {
      const rec = existing.data() as FirstWeekRecord | undefined;
      return { granted: false, reason: 'already', endsAtMs: rec?.endsAtMs ?? 0 };
    }

    const nowMs = Date.now();
    const endsAtMs = endOfTasteMs(nowMs, tzOffsetMinutes);

    const res = await fetch(
      `${RC_BASE}/subscribers/${encodeURIComponent(uid)}/entitlements/${SUPPORTER_ENTITLEMENT_ID}/promotional`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${REVENUECAT_SECRET_KEY.value()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ end_time_ms: endsAtMs }),
      },
    );

    if (!res.ok) {
      // Deliberately NOT recorded. If RevenueCat refused, this account has not had its week, and the
      // caller's retry must be free to try again.
      const body = await res.text().catch(() => '');
      console.error('grantFirstWeek: RevenueCat refused', uid, res.status, body.slice(0, 300));
      throw new HttpsError('internal', 'Could not start the first week.');
    }

    await firstWeekDoc(uid).set({ grantedAtMs: nowMs, endsAtMs } satisfies FirstWeekRecord);
    return { granted: true, endsAtMs };
  },
);

// ─── REVOKE (DEV TOOL ONLY) ──────────────────────────────────────────────────
// Justin is the only tester, so he needs to be able to run this more than once. Revokes the promotional
// entitlement and clears the record so the account can be granted again.
// ⚠️ NOT for production use: revoking a real user's week mid-taste is a rug pull.
export const revokeFirstWeek = onCall(
  { secrets: [REVENUECAT_SECRET_KEY], maxInstances: 5 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Please sign in.');
    }
    const uid = request.auth.uid;

    const res = await revenueCat(
      `/subscribers/${encodeURIComponent(uid)}/entitlements/${SUPPORTER_ENTITLEMENT_ID}/revoke_promotionals`,
      REVENUECAT_SECRET_KEY.value(),
    );

    // ⚠️ "NOTHING TO REVOKE" IS SUCCESS, NOT FAILURE. RevenueCat answers 404 / code 7242 when the account
    // has no promotional entitlement left to take away -- which is the state this row leaves behind, so
    // every repeat tap hit it. Treating that as an error made both dev rows a NO-OP after their first use:
    // the throw fired before the cleanups below, so the cached membership and the pitch budget stayed stale
    // and Otto could not pitch for seven days. (Found 2026-07-31; it cost two evenings of debugging.)
    const body = res.ok ? '' : await res.text().catch(() => '');
    const nothingToRevoke =
      res.status === 404 && /"code"\s*:\s*7242|No promotional entitlements/i.test(body);
    const revoked = res.ok || nothingToRevoke;

    if (!revoked) {
      console.error('revokeFirstWeek: RevenueCat refused', uid, res.status, body.slice(0, 300));
    }

    // Only clear the grant record once the entitlement is genuinely gone. On a REAL refusal the week may
    // still be live, and deleting the record there would let the account be granted a second one.
    if (revoked) {
      await firstWeekDoc(uid).delete().catch(() => {});
    }

    // ⚠️ CLEAR THE SERVER'S CACHED MEMBERSHIP TOO, or the revoke only half happens. `membershipStatus` takes
    // a shortcut: if it already believes there is a LIVE entitlement it returns 'entitled' without asking
    // RevenueCat again. So without this, the phone correctly knows you are free while the server still
    // thinks you are a Supporter until the original end date -- a half state that silently breaks any test
    // of the free tier. (Found 2026-07-31: the pitch would not fire because the server saw a subscriber.)
    // Zeroing the expiry is enough; the next lookup re-asks RevenueCat and writes the truth back.
    await admin.firestore().collection('memberships').doc(uid)
      .set({ expiresAtMs: 0, checkedAtMs: 0, updatedAtMs: Date.now(), lastEventType: 'DEV_REVOKE' }, { merge: true })
      .catch(() => {});

    // Clear the pitch budget AND any recorded decline. This row is the "reset my test state" button, and
    // the weekly cap of three is otherwise a seven-day lockout the moment a test run uses them up -- while
    // a recorded decline would be a THIRTY-day one, i.e. one test a month.
    await admin.firestore().collection('ai_usage_companion').doc(uid)
      .set({ pitchAtMs: [], declinedAtMs: 0 }, { merge: true })
      .catch(() => {});

    // Both cleanups above run even when RevenueCat refused, and BEFORE this throw. The whole job of this row
    // is "put my account back to a clean free state", and leaving half of it undone is exactly what broke.
    // Clearing the cached membership after a real refusal is safe: the next lookup re-asks RevenueCat and
    // writes the truth back, so it self-corrects. A stale cache does not.
    if (!revoked) {
      throw new HttpsError('internal', 'Could not revoke the first week.');
    }

    return { revoked: true, alreadyRevoked: nothingToRevoke };
  },
);
