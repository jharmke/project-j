import * as admin from 'firebase-admin';
import { defineSecret } from 'firebase-functions/params';

// RevenueCat's SECRET REST key (never the public SDK key). Set with:
//   firebase functions:secrets:set REVENUECAT_SECRET_KEY
export const REVENUECAT_SECRET_KEY = defineSecret('REVENUECAT_SECRET_KEY');

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
  expiresAtMs: number;       // when the current paid period ends (0 = not a Supporter)
  willRenew: boolean;        // false once they cancel (access still runs to expiresAtMs)
  productId: string;
  environment: string;       // SANDBOX | PRODUCTION
  lastEventType: string;
  lastEventAtMs: number;     // the EVENT's own timestamp -- see the out-of-order note below
  updatedAtMs: number;
  checkedAtMs?: number;      // last time we asked RevenueCat directly (see the cache note below)
}

// How long we trust a "not a Supporter" answer before asking RevenueCat again.
const NEGATIVE_CACHE_MS = 6 * 60 * 60 * 1000;   // 6 hours

// ─── FIRESTORE IS A CACHE. REVENUECAT IS THE TRUTH. ──────────────────────────
// Webhooks alone are not enough. Proven live 2026-07-13: a PROMOTIONAL grant (how we hand testers a free
// Supporter entitlement) reaches RevenueCat but never lands here as a usable subscription event -- so a
// webhook-only design would have told every granted tester they were a Supporter in the app while the
// SERVER quietly gave them free-tier AI limits. Silent, and hell to diagnose.
//
// So on a cache MISS we ask RevenueCat directly and store the answer. That covers promotional grants,
// transfers, and any webhook that is ever dropped, delayed, or shaped differently than we expected.
// Webhooks still do the fast path; this is the safety net underneath them.
async function fetchFromRevenueCat(uid: string): Promise<number> {
  try {
    const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(uid)}`, {
      headers: { Authorization: `Bearer ${REVENUECAT_SECRET_KEY.value()}` },
    });
    if (!res.ok) return 0;
    const body: any = await res.json();
    const ent = body?.subscriber?.entitlements?.[SUPPORTER_ENTITLEMENT_ID];
    if (!ent?.expires_date) return 0;
    const ms = new Date(ent.expires_date).getTime();
    return isNaN(ms) ? 0 : ms;
  } catch (e) {
    console.error('RevenueCat lookup failed (defaulting to free):', uid, e);
    return 0;
  }
}

// Is this user a Supporter RIGHT NOW?
// FAILS CLOSED: any error, missing record, or unreachable RevenueCat returns false. A bug here can only
// ever make someone LESS generous, never hand out free AI on Justin's bill.
export async function isSupporter(uid: string): Promise<boolean> {
  const now = Date.now();
  try {
    const snap = await membershipDoc(uid).get();
    const m = snap.exists ? (snap.data() as MembershipRecord | undefined) : undefined;

    // Fast path: a live entitlement we already know about. No network call.
    if (m?.expiresAtMs && m.expiresAtMs > now) return true;

    // We think they're NOT a Supporter. Trust that only briefly -- they may have just been granted one.
    if (m?.checkedAtMs && now - m.checkedAtMs < NEGATIVE_CACHE_MS) return false;

    // Cache miss (or stale negative): ask RevenueCat itself.
    const expiresAtMs = await fetchFromRevenueCat(uid);
    await membershipDoc(uid).set(
      { expiresAtMs, checkedAtMs: now, updatedAtMs: now, lastEventType: 'API_LOOKUP' },
      { merge: true },
    );
    return expiresAtMs > now;
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

  // WEBHOOKS ARRIVE OUT OF ORDER. Observed live 2026-07-13: an EXPIRATION landed, then a PRODUCT_CHANGE
  // carrying an OLDER expiry, then the RENEWAL with the true new one. A blind overwrite means a stale
  // event can stomp a newer one and leave someone on the wrong expiry -- granting or denying access
  // wrongly, and self-healing can't save us because the record itself would be wrong.
  //
  // So: stamp each write with the EVENT's own timestamp and, inside a transaction, ignore anything older
  // than what we already hold. Delivery order stops mattering; only the event's real chronology does.
  const eventAtMs = Number(event.event_timestamp_ms) || Date.now();

  const record: MembershipRecord = {
    expiresAtMs,
    // RevenueCat sends CANCELLATION when auto-renew is switched off. Access continues to expiresAtMs.
    willRenew: event.type !== 'CANCELLATION' && event.type !== 'EXPIRATION',
    productId: event.product_id || '(unknown)',
    environment: event.environment || '(unknown)',
    lastEventType: event.type || '(unknown)',
    lastEventAtMs: eventAtMs,
    updatedAtMs: Date.now(),
  };

  try {
    const ref = membershipDoc(uid);
    const applied = await admin.firestore().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const prev = snap.exists ? (snap.data() as MembershipRecord | undefined) : undefined;
      if (prev?.lastEventAtMs && prev.lastEventAtMs > eventAtMs) return false;   // stale, drop it
      tx.set(ref, record, { merge: true });
      return true;
    });
    if (applied) {
      console.log(`membership recorded: ${uid} ${record.lastEventType} expires=${new Date(expiresAtMs).toISOString()}`);
    } else {
      console.log(`membership SKIPPED (out-of-order/stale): ${uid} ${record.lastEventType}`);
    }
  } catch (e) {
    console.error('Failed to record membership (event still acknowledged):', uid, e);
  }
}
