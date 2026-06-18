import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import * as admin from 'firebase-admin';
import Anthropic from '@anthropic-ai/sdk';
import { screenForCrisis } from './crisis';
import { buildSystemPrompt, FaithTier } from './faithSystemPrompt';

// NOTE: admin.initializeApp() is already called once in index.ts. Do NOT call it again here.
//
// Faith AI companion: Pieces 3 + 4. Order of operations on every message:
//   1. Auth: only signed-in users.
//   2. Server-side crisis re-screen (backstop). On a hit, short-circuit to a crisis flag
//      BEFORE counting or calling the AI, so a crisis never burns a message and is never
//      blocked by the daily cap. The CLIENT renders the hardcoded crisis response.
//   3. Per-user daily cap (atomic check-and-increment in Firestore).
//   4. The Anthropic call, carrying the system prompt for the user's faith tier.
//   5. AI crisis backstop: if the model flags a crisis it caught, refund the message and
//      return the crisis flag (the client shows the same hardcoded crisis response).
//   6. On any AI failure, refund the message and return the graceful "resting" fallback.
// Verse verification runs CLIENT-SIDE on the returned reply (utils/faithVerse.ts).
// Chat content is never logged. No double dashes anywhere (project rule).

const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY');

// Free tier messages per user per day. Pro (about 50/day) does not exist yet (no
// subscription system), so EVERYONE is free for now; this becomes a tier lookup later.
const FREE_DAILY_CAP = 5;

// Dev/test accounts that bypass the daily cap (effectively unlimited). Empty this before
// public launch. Currently just Justin's uid for testing.
const DEV_UNLIMITED_UIDS = ['zLZOx2aqiKXcl3tlg7LNmkwbGxH3'];

// Cheap, fast model (Justin's intentional cost choice; tune up to Sonnet 4.6 if quality
// needs it). Alias form, no date suffix.
const MODEL = 'claude-haiku-4-5';
const MAX_TOKENS = 800;            // concise replies; bounds cost and latency
const MAX_HISTORY_TURNS = 12;      // cap the conversation sent to the API (cost + abuse)
const CRISIS_TAG = '[[CRISIS]]';

function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // server UTC date; not client-spoofable
}

function usageDoc(uid: string) {
  return admin.firestore().collection('ai_usage').doc(uid);
}

// Deterministic house-style backstop. The system prompt already forbids em dashes and
// double hyphens, but a model can still slip one through, so we strip it here and the
// reply can never ship with a dash (project rule). Single hyphens and number ranges
// (verse refs like 11:28-30) are deliberately preserved so references never break.
function sanitizeDashes(text: string): string {
  return text
    // en dash between numbers stays a verse range: 28–30 -> 28-30
    .replace(/(\d)\s*–\s*(\d)/g, '$1-$2')
    // em dash, any other en dash, or a double hyphen used to join thoughts -> comma
    .replace(/\s*(?:—|–|--)\s*/g, ', ')
    // tidy any artifacts the replacement can create
    .replace(/\s+,/g, ',')
    .replace(/,\s*,/g, ',')
    .replace(/[ \t]{2,}/g, ' ');
}

// Best-effort refund of one reserved message (AI failed or turned out to be a crisis).
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

export const faithCompanion = onCall(
  { secrets: [ANTHROPIC_API_KEY], maxInstances: 10 },
  async (request) => {
    // 1. Auth.
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Please sign in to use the companion.');
    }
    const uid = request.auth.uid;

    const data = (request.data ?? {}) as {
      message?: unknown;
      tier?: unknown;
      history?: unknown;
    };
    const message = typeof data.message === 'string' ? data.message.trim() : '';
    if (!message) {
      throw new HttpsError('invalid-argument', 'Message is required.');
    }
    // Default to the gentler Exploring posture if unspecified (never presume belief).
    const tier: FaithTier = data.tier === 'rooted' ? 'rooted' : 'exploring';

    // 2. Server-side crisis re-screen (backstop). Short-circuit before counting or calling AI.
    if (screenForCrisis(message)) {
      return { ok: true, crisis: true };
    }

    // 3. Per-user daily cap: atomic check-and-increment so concurrent calls cannot race past it.
    const dailyCap = DEV_UNLIMITED_UIDS.includes(uid) ? 100000 : FREE_DAILY_CAP;
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
            type: 'text',
            text: buildSystemPrompt(tier),
            cache_control: { type: 'ephemeral' }, // caches when the prefix clears the model threshold
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
      console.error('faithCompanion Anthropic call failed', { status, name: (err as Error)?.name });
      await refundMessage(uid);
      return {
        ok: false,
        reason: 'unavailable',
        message: 'The companion is resting. Please try again in a little bit.',
      };
    }

    // House-style backstop: strip any dash the model slipped past the prompt rule, so the
    // reply never ships with one. Runs before the crisis-tag check (the tag has no dashes).
    replyText = sanitizeDashes(replyText);

    // 5. AI crisis backstop: model flagged a crisis the screens missed. Refund (a crisis
    // never costs a message) and let the client show the hardcoded crisis response.
    if (replyText.includes(CRISIS_TAG)) {
      await refundMessage(uid);
      return { ok: true, crisis: true };
    }

    // 6. Empty reply is treated as a soft failure (refund + graceful fallback).
    if (!replyText) {
      await refundMessage(uid);
      return {
        ok: false,
        reason: 'unavailable',
        message: 'The companion is resting. Please try again in a little bit.',
      };
    }

    return { ok: true, reply: replyText, used: cap.used, cap: dailyCap };
  },
);
