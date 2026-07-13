import * as admin from 'firebase-admin';

// ─── Server-side Supporter truth ─────────────────────────────────────────────
// The AI caps are enforced on the server, so the server has to know who is a Supporter. It must NEVER
// take the client's word for it: if the app could just claim "I'm a Supporter", anyone could modify
// their copy and run up the Anthropic bill. That is the one place in this system where a lie costs
// real money.
//
// So RevenueCat tells us instead. Its webhook (revenueCatWebhook.ts) fires on every subscription
// lifecycle event, and we record the result here, in a collection only the server can write to.
//
// SELF-HEALING BY DESIGN: we store the entitlement's EXPIRY, not a boolean. Supporter status is then
// derived at READ time by comparing that expiry to now. So even if a webhook is missed, dropped, or
// arrives out of order, a lapsed subscriber still loses access on schedule -- their stored expiry
// simply passes. A stored `isSupporter: true` boolean, by contrast, would be one dropped webhook away
// from being wrong forever.
//
// A CANCELLATION does NOT revoke access: the user keeps what they paid for until the period ends.
// It only means the subscription won't renew, so we let the expiry do the work.

const SUPPORTER_ENTITLEMENT_ID = 'supporter';

// Top-level, server-only. Clients never read or write this (they get their status from RevenueCat
// directly); it exists purely so the CAP logic has a source the client cannot forge.
const membershipDoc = (uid: string) => admin.firestore().collection('memberships').doc(uid);

export interface MembershipRecord {
  expiresAtMs: number;       // when the current paid period ends
  willRenew: boolean;        // false once they cancel (access still runs to expiresAtMs)
  productId: string;
  environment: string;       // SANDBOX | PRODUCTION
  lastEventType: string;
  updatedAtMs: number;
}

// Is this user a Supporter RIGHT NOW? Fails CLOSED: any error, missing record, or unreadable doc
// returns false. A bug here can only ever make someone LESS generous, never hand out free AI.
export async function isSupporter(uid: string): Promise<boolean> {
  try {
    const snap = await membershipDoc(uid).get();
    if (!snap.exists) return false;
    const m = snap.data() as MembershipRecord | undefined;
    if (!m?.expiresAtMs) return false;
    return m.expiresAtMs > Date.now();     // derived, not stored -- see note above
  } catch (e) {
    console.error('isSupporter lookup failed (defaulting to free):', uid, e);
    return false;
  }
}

// Record what a RevenueCat webhook event tells us about this user's subscription. Called for EVERY
// subscription lifecycle event -- not just the two we email about -- because the cap logic needs the
// state to stay current, and a cancellation or expiry we never wrote down is a cap we'd get wrong.
export async function recordMembershipEvent(event: any): Promise<void> {
  const uid: string | undefined = event?.app_user_id;
  if (!uid) return;

  // Only subscription events carry entitlement state. Tips (NON_RENEWING_PURCHASE) are deliberately
  // NOT in the `supporter` entitlement -- a $2.99 tip must never confer ongoing perks -- so they
  // must not touch this record.
  const entitlements: string[] = Array.isArray(event.entitlement_ids)
    ? event.entitlement_ids
    : event.entitlement_id ? [event.entitlement_id] : [];
  if (!entitlements.includes(SUPPORTER_ENTITLEMENT_ID)) return;

  const expiresAtMs = Number(event.expiration_at_ms) || 0;
  if (!expiresAtMs) return;

  const record: MembershipRecord = {
    expiresAtMs,
    // RevenueCat sends CANCELLATION when auto-renew is switched off. Access continues to expiresAtMs.
    willRenew: event.type !== 'CANCELLATION' && event.type !== 'EXPIRATION',
    productId: event.product_id || '(unknown)',
    environment: event.environment || '(unknown)',
    lastEventType: event.type || '(unknown)',
    updatedAtMs: Date.now(),
  };

  try {
    await membershipDoc(uid).set(record, { merge: true });
    console.log(`membership recorded: ${uid} ${record.lastEventType} expires=${new Date(expiresAtMs).toISOString()}`);
  } catch (e) {
    console.error('Failed to record membership (event still acknowledged):', uid, e);
  }
}
