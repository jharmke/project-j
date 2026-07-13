import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import * as admin from 'firebase-admin';
import Anthropic from '@anthropic-ai/sdk';
import { screenForCrisis } from './crisis';
import { isSupporter } from './membership';
import {
  buildCompanionStable,
  buildCompanionVolatile,
  type StyleMode,
  type FaithTier,
} from './companionSystemPrompt';
import { ASSISTANT_APP_KNOWLEDGE } from './assistantAppKnowledge';

// NOTE: admin.initializeApp() is already called once in index.ts. Do NOT call it again here.
//
// The GENERAL Companion assistant (NOT Halo). Same gatekeeping shape as faithCompanion, but a
// completely separate feature: its own system prompt (wellness + app knowledge, not faith), its
// own daily cap, and its own usage counter so the two assistants never share a quota.
//
// Order of operations on every message:
//   1. Auth: only signed-in users.
//   2. Server-side crisis re-screen (backstop). On a hit, short-circuit BEFORE counting or calling
//      the AI, so a crisis never burns a message and is never blocked by the daily cap. The CLIENT
//      renders the hardcoded crisis response (same as Halo).
//   3. Per-user daily cap (atomic check-and-increment), in a SEPARATE collection from Halo.
//   4. The Anthropic call: a cached STABLE system block (identity + rules + app knowledge) plus a
//      VOLATILE block (this user's context + pre-computed data snapshot).
//   5. On any AI failure, refund the message and return the graceful "resting" fallback.
// Chat content is never logged. No double dashes in user-facing strings (project rule).

const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY');

// Messages per user per day, by tier. Supporter status comes from OUR OWN Firestore record (written by
// the RevenueCat webhook), never from the client -- a client that could simply claim "I'm a Supporter"
// would let anyone run up the Anthropic bill. See membership.ts.
//
// 🚨 BETA HACK (2026-07-01): both tiers are raised so email-invited TestFlight testers can exercise Otto
// freely. REVERT AT LAUNCH to the locked caps: FREE 10 / SUPPORTER 25. See LAUNCH_CHECKLIST.md (2.1).
// They're deliberately EQUAL during beta so no tester is worse off than another while entitlements are
// still being granted.
const FREE_DAILY_CAP = 100;
const SUPPORTER_DAILY_CAP = 100;

// Dev/test accounts that bypass the daily cap (effectively unlimited). Empty this before public
// launch. Currently just Justin's uid for testing (same uid Halo whitelists).
const DEV_UNLIMITED_UIDS = ['zLZOx2aqiKXcl3tlg7LNmkwbGxH3'];

// Cheap, fast model (matches Halo). Alias form, no date suffix.
const MODEL = 'claude-haiku-4-5';
const MAX_TOKENS = 800;            // concise replies; bounds cost and latency
const MAX_HISTORY_TURNS = 12;      // cap the conversation sent to the API (cost + abuse)
const CRISIS_TAG = '[[CRISIS]]';

function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // server UTC date; not client-spoofable
}

// SEPARATE collection from Halo's ai_usage, so the Companion's 10/day and Halo's 5/day never
// share a counter.
function usageDoc(uid: string) {
  return admin.firestore().collection('ai_usage_companion').doc(uid);
}

// Deterministic house-style backstop (same as Halo): strip any dash the model slips past the
// prompt rule so a reply can never ship with one. Single hyphens between digits are preserved so
// numeric ranges (for example a "7-14 day" window) never break.
function sanitizeDashes(text: string): string {
  return text
    .replace(/(\d)\s*[–]\s*(\d)/g, '$1-$2')
    .replace(/\s*(?:[—–]|--)\s*/g, ', ')
    .replace(/\s+,/g, ',')
    .replace(/,\s*,/g, ',')
    .replace(/[ \t]{2,}/g, ' ');
}

// Best-effort refund of one reserved message (AI failed).
async function refundMessage(uid: string): Promise<void> {
  const today = todayKey();
  const ref = usageDoc(uid);
  try {
    await admin.firestore().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const data = snap.exists ? (snap.data() as { date?: string; count?: number }) : {};
      if (data.date === today && (data.count ?? 0) > 0) {
        tx.set(ref, { date: today, count: (data.count ?? 0) - 1 }, { merge: true });
      }
    });
  } catch {
    /* non-fatal: a missed refund only costs the user one message */
  }
}

export const appCompanion = onCall(
  { secrets: [ANTHROPIC_API_KEY], maxInstances: 10 },
  async (request) => {
    // 1. Auth.
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Please sign in to use Otto.');
    }
    const uid = request.auth.uid;

    const data = (request.data ?? {}) as {
      message?: unknown;
      history?: unknown;
      styleMode?: unknown;
      faithTier?: unknown;
      userContext?: unknown;
      dataSnapshot?: unknown;
    };
    const message = typeof data.message === 'string' ? data.message.trim() : '';
    if (!message) {
      throw new HttpsError('invalid-argument', 'Message is required.');
    }

    // Mode + tier default to the gentlest sensible values if unspecified.
    const styleMode: StyleMode =
      data.styleMode === 'discipline' ? 'discipline'
      : data.styleMode === 'mindful' ? 'mindful'
      : 'balanced';
    const faithTier: FaithTier =
      data.faithTier === 'rooted' ? 'rooted'
      : data.faithTier === 'notrightnow' ? 'notrightnow'
      : 'exploring';

    const userContext = typeof data.userContext === 'string' && data.userContext.trim()
      ? data.userContext.trim()
      : '(No profile context provided.)';
    const dataSnapshot = typeof data.dataSnapshot === 'string' && data.dataSnapshot.trim()
      ? data.dataSnapshot.trim()
      : undefined;

    // 2. Server-side crisis re-screen (backstop). Short-circuit before counting or calling AI.
    if (screenForCrisis(message)) {
      return { ok: true, crisis: true };
    }

    // 3. Per-user daily cap: atomic check-and-increment so concurrent calls cannot race past it.
    // Tier from the SERVER's own membership record (fails closed to free on any error).
    const supporter = await isSupporter(uid);
    const dailyCap = DEV_UNLIMITED_UIDS.includes(uid)
      ? 100000
      : supporter ? SUPPORTER_DAILY_CAP : FREE_DAILY_CAP;
    const today = todayKey();
    const ref = usageDoc(uid);
    const cap = await admin.firestore().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const d = snap.exists ? (snap.data() as { date?: string; count?: number }) : {};
      const count = d.date === today ? (d.count ?? 0) : 0;
      if (count >= dailyCap) {
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
      return {
        ok: false,
        reason: 'daily_limit',
        cap: dailyCap,
        used: cap.used,
        message: "You're out of messages for today. They reset tomorrow.",
      };
    }

    // 4. Build the multi-turn message list (history, capped) and call Anthropic.
    const rawHistory = Array.isArray(data.history) ? data.history : [];
    const history = rawHistory
      .filter(
        (h): h is { role: 'user' | 'assistant'; text: string } =>
          !!h &&
          typeof (h as { text?: unknown }).text === 'string' &&
          ((h as { role?: unknown }).role === 'user' || (h as { role?: unknown }).role === 'assistant'),
      )
      .slice(-MAX_HISTORY_TURNS)
      .map((h) => ({ role: h.role, content: h.text } as Anthropic.MessageParam));

    const messages: Anthropic.MessageParam[] = [
      ...history,
      { role: 'user', content: message },
    ];

    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });

    let replyText = '';
    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: [
          {
            // Stable half (identity + rules + app knowledge): cached across messages.
            type: 'text',
            text: buildCompanionStable(faithTier, ASSISTANT_APP_KNOWLEDGE),
            cache_control: { type: 'ephemeral' },
          },
          {
            // Volatile half (this user's context + data snapshot): not cached.
            type: 'text',
            text: buildCompanionVolatile(userContext, dataSnapshot),
          },
        ],
        messages,
      });
      replyText = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('')
        .trim();
    } catch (err) {
      // Log type only, never chat content (privacy spec).
      const status = (err as { status?: number })?.status;
      console.error('appCompanion Anthropic call failed', { status, name: (err as Error)?.name });
      await refundMessage(uid);
      return {
        ok: false,
        reason: 'unavailable',
        message: 'Otto is resting. Please try again in a little bit.',
      };
    }

    // House-style backstop: strip any dash the model slipped past the prompt rule.
    replyText = sanitizeDashes(replyText);

    // AI crisis backstop: model flagged a crisis the screens missed. Refund (a crisis never costs
    // a message) and let the client show the hardcoded crisis response.
    if (replyText.includes(CRISIS_TAG)) {
      await refundMessage(uid);
      return { ok: true, crisis: true };
    }

    // Empty reply is treated as a soft failure (refund + graceful fallback).
    if (!replyText) {
      await refundMessage(uid);
      return {
        ok: false,
        reason: 'unavailable',
        message: 'Otto is resting. Please try again in a little bit.',
      };
    }

    return { ok: true, reply: replyText, used: cap.used, cap: dailyCap };
  },
);
