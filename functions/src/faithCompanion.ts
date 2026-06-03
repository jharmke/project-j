import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

// NOTE: admin.initializeApp() is already called once in index.ts. Do NOT call it again
// here (calling it twice throws). This module only uses admin.firestore() at runtime,
// inside the handler, so initialization has always happened by the time it runs.
//
// Faith AI companion: Piece 3, the server-side gatekeeping (auth + per-user daily cap).
// The actual AI call, the server-side crisis re-screen, and verse verification handoff
// are added in Piece 4 where the stub is below. No Anthropic key and no cost yet.
// No double dashes anywhere (project rule).

// Free tier: messages per user per day. Pro (about 50/day) does not exist yet because
// no subscription system is built, so EVERYONE is free for now. When Pro ships, this
// becomes a one-line lookup of the user's tier.
const FREE_DAILY_CAP = 5;

// Server-side date as a YYYY-MM-DD key, in UTC. Using the SERVER date (not a date sent
// by the app) is deliberate: a client-supplied date could be spoofed to reset the cap.
// Tradeoff flagged for build: the daily reset happens at UTC midnight, not the user's
// local midnight. Acceptable for a US launch; revisit if it feels off in testing.
function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

// The counter lives in a TOP-LEVEL collection the app has no security-rule access to, so
// only the admin SDK (this function) can read or write it. This makes the cap impossible
// to bypass from the client regardless of the users/{uid} rules. See PRIVACY AND SECURITY
// in SPEC_faith_ai.md (Firestore rules still need a console verification for no permissive
// catch-all, tracked separately).
function usageDoc(uid: string) {
  return admin.firestore().collection('ai_usage').doc(uid);
}

export const faithCompanion = onCall({ maxInstances: 10 }, async (request) => {
  // 1. Auth: only signed-in users. Blocks anonymous abuse.
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Please sign in to use the companion.');
  }
  const uid = request.auth.uid;

  const message = typeof request.data?.message === 'string' ? request.data.message.trim() : '';
  if (!message) {
    throw new HttpsError('invalid-argument', 'Message is required.');
  }

  // (Piece 4 inserts the server-side crisis re-screen here, BEFORE counting or calling AI.)

  // 2. Per-user daily cap: atomic check-and-increment so concurrent calls cannot race
  // past the limit. Counts a turn only when one is actually about to be served.
  const today = todayKey();
  const ref = usageDoc(uid);

  const cap = await admin.firestore().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.exists ? (snap.data() as { date?: string; count?: number }) : {};
    const count = data.date === today ? (data.count ?? 0) : 0;

    if (count >= FREE_DAILY_CAP) {
      return { allowed: false, used: count };
    }
    tx.set(
      ref,
      { date: today, count: count + 1, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true },
    );
    return { allowed: true, used: count + 1 };
  });

  if (!cap.allowed) {
    // Friendly, never silent (matches the limit-hit UX in the spec). The Pro nudge for
    // free users is added on the app side where this reason is shown.
    return {
      ok: false,
      reason: 'daily_limit',
      cap: FREE_DAILY_CAP,
      used: cap.used,
      message: "You're out of messages for today. They reset tomorrow.",
    };
  }

  // 3. Stub. Piece 4 replaces this with: server-side crisis re-screen, the Anthropic call
  // carrying the system prompt, and the verse-verification handoff to the client.
  return {
    ok: true,
    used: cap.used,
    cap: FREE_DAILY_CAP,
    reply: '[Faith companion is not connected to the AI yet. Piece 4 wires the Anthropic call here.]',
  };
});
