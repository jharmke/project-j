import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import * as admin from 'firebase-admin';
import Anthropic from '@anthropic-ai/sdk';
import { recordUsage } from './aiUsageMeter';

// Server-side proxy for the app's two DIRECT Anthropic features: the Smart Coach tips (coachAI.ts)
// and the AI Meal Estimator (services/aiMealEstimator.ts). Before this, both called
// api.anthropic.com from the client with a bundled key (EXPO_PUBLIC_ANTHROPIC_API_KEY) that ships
// inside the app binary and is extractable. This function holds the key server-side; the client
// sends the same request shape it used to POST and gets the same raw Anthropic response back, so
// the client-side prompt building + parsing is unchanged.
//
// NOT the same as Otto/Halo (appCompanion/faithCompanion) -- those are conversational assistants
// with their own prompts. This is a thin, guarded relay for the two features whose prompt logic
// already lives (and stays) on the client.
//
// Guards: signed-in only, model allowlist, max_tokens ceiling, and a per-user per-day safety cap
// per feature (an abuse backstop, generous enough to be invisible in normal use). The estimator's
// user-facing "X per month" quota still lives client-side (Option A); this cap only stops runaway
// abuse now that a key can no longer be stolen for unlimited external use.

const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY');

// Only the model these two features actually use. Anything else is rejected so the relay cannot be
// repurposed to call arbitrary (for example, more expensive) models on our key.
// Smart Coach moved to Haiku 2026-07-28 (it only PHRASES a verdict the app already computed, so there is
// no accuracy risk -- see the note on MODEL in utils/coachAI.ts). The estimator stays on Sonnet: it does
// real vision work identifying food, which is exactly the kind of task the cheaper model would hurt.
const ALLOWED_MODELS = new Set(['claude-sonnet-4-6', 'claude-haiku-4-5']);

const MAX_TOKENS_CEILING = 2000; // coach uses <= 1100, estimator 1500; hard ceiling on cost.

// Per-user per-day safety caps (abuse backstop, not the product quota). Coach fires a few auto
// tips a day; the estimator's real limit is client-side. These only catch runaway loops/abuse.
const DAILY_CAPS: Record<string, number> = {
  coach: 100,
  estimator: 60,
};

// Dev/test accounts that bypass the safety cap. EMPTIED 2026-07-28, last of the three lists (Otto's and
// Halo's went the same day). Justin runs on the real caps from here so he sees what users see -- that is
// how the unreachable Reports locked screen got found. Must stay EMPTY at launch.
const DEV_UNLIMITED_UIDS: string[] = [];

function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // server UTC date; not client-spoofable
}

// One usage doc per feature, separate from Otto/Halo's counters.
function usageDoc(feature: string, uid: string) {
  return admin.firestore().collection(`ai_usage_${feature}`).doc(uid);
}

async function refund(feature: string, uid: string): Promise<void> {
  const today = todayKey();
  const ref = usageDoc(feature, uid);
  try {
    await admin.firestore().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const data = snap.exists ? (snap.data() as { date?: string; count?: number }) : {};
      if (data.date === today && (data.count ?? 0) > 0) {
        tx.set(ref, { date: today, count: (data.count ?? 0) - 1 }, { merge: true });
      }
    });
  } catch {
    /* non-fatal */
  }
}

export const aiProxy = onCall(
  { secrets: [ANTHROPIC_API_KEY], maxInstances: 10 },
  async (request) => {
    // 1. Auth.
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Please sign in to use this feature.');
    }
    const uid = request.auth.uid;

    const body = (request.data ?? {}) as {
      feature?: unknown;
      model?: unknown;
      max_tokens?: unknown;
      temperature?: unknown;
      system?: unknown;
      messages?: unknown;
    };

    // 2. Validate feature + model + request shape.
    const feature = body.feature === 'coach' || body.feature === 'estimator' ? body.feature : '';
    if (!feature) {
      throw new HttpsError('invalid-argument', 'Unknown feature.');
    }
    const model = typeof body.model === 'string' && ALLOWED_MODELS.has(body.model) ? body.model : '';
    if (!model) {
      throw new HttpsError('invalid-argument', 'Unsupported model.');
    }
    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      throw new HttpsError('invalid-argument', 'Messages are required.');
    }
    const maxTokens = Math.min(
      typeof body.max_tokens === 'number' && body.max_tokens > 0 ? body.max_tokens : 1000,
      MAX_TOKENS_CEILING,
    );
    const system = typeof body.system === 'string' ? body.system : undefined;
    const temperature = typeof body.temperature === 'number' ? body.temperature : undefined;
    // Client builds these; the SDK validates them on send. We pass through as-is (auth-gated).
    const messages = body.messages as Anthropic.MessageParam[];

    // 3. Per-user per-day safety cap (atomic check-and-increment).
    const cap = DEV_UNLIMITED_UIDS.includes(uid) ? 1_000_000 : DAILY_CAPS[feature];
    const today = todayKey();
    const ref = usageDoc(feature, uid);
    const gate = await admin.firestore().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const d = snap.exists ? (snap.data() as { date?: string; count?: number }) : {};
      const count = d.date === today ? (d.count ?? 0) : 0;
      if (count >= cap) return { allowed: false };
      tx.set(
        ref,
        { date: today, count: count + 1, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
        { merge: true },
      );
      return { allowed: true };
    });
    if (!gate.allowed) {
      return { ok: false, reason: 'daily_limit' };
    }

    // 4. Call Anthropic and return the RAW response so the client's existing parsing works.
    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });
    try {
      const response = await client.messages.create({
        model,
        max_tokens: maxTokens,
        // ⚠️ THE SYSTEM PROMPT IS SENT AS A BLOCK SO IT CAN CARRY A CACHE MARKER (PLAN.md 1.1).
        // The client sends `system` as a plain string and is unchanged; the marker is added HERE so every
        // feature behind this proxy gets it without touching client code.
        // ⚠️ ALWAYS ATTACHING IT IS DELIBERATE AND SAFE. A prefix under the model's minimum simply does not
        // cache -- no error, no charge, `cache_creation_input_tokens` comes back 0. So there is no case to
        // detect and nothing to gate on. ⚠️ AND THE MINIMUM DIFFERS BY MODEL, which is exactly the sort of
        // thing that gets assumed wrong: Haiku 4.5 needs 4,096, Sonnet 4.6 needs 1,024.
        // Smart Coach's prompt was grown past 4,096 for this; the estimator's 562-token prompt is still
        // under Sonnet's 1,024 and simply will not cache, which costs nothing.
        ...(system !== undefined
          ? { system: [{ type: 'text' as const, text: system, cache_control: { type: 'ephemeral' as const } }] }
          : {}),
        ...(temperature !== undefined ? { temperature } : {}),
        messages,
      });
      // PLAN.md item 0: record what this actually cost. Fire and forget -- never awaited, never throws,
      // writes to its own `ai_cost` collection so it cannot touch the cap counters above.
      recordUsage(feature, uid, model, response.usage);
      // response.content is [{ type: 'text', text }, ...] -- same shape the direct HTTP call
      // returned, which both clients read as data.content[0].text.
      return { ok: true, data: response };
    } catch (err) {
      const status = (err as { status?: number })?.status;
      console.error('aiProxy Anthropic call failed', { feature, status, name: (err as Error)?.name });
      await refund(feature, uid);
      return { ok: false, reason: 'unavailable' };
    }
  },
);
