import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import * as admin from 'firebase-admin';
import Anthropic from '@anthropic-ai/sdk';
import { screenForCrisis } from './crisis';
import { membershipStatus, REVENUECAT_SECRET_KEY } from './membership';
import {
  buildCompanionStable,
  buildFaithHandoffBlock,
  buildCompanionVolatile,
  PITCH_REQUIRED_BLOCK,
  buildWorkoutCapBlock,
  buildUndereatingAskBlock,
  buildUndereatingFollowUpBlock,
  REPLY_SHAPE_BLOCK,
  DECLINE_WATCH_BLOCK,
  type StyleMode,
  type FaithTier,
} from './companionSystemPrompt';
import { assembleAppKnowledge } from './knowledgeChapters';
import { recordUsage } from './aiUsageMeter';

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

// Messages per user per day, by tier. Supporter status is resolved SERVER-SIDE (Firestore cache, backed
// by a direct RevenueCat lookup on a miss) and NEVER taken from the client -- a client that could simply
// claim "I'm a Supporter" would let anyone run up the Anthropic bill. See membership.ts.
//
// ✅ REVERTED TO THE REAL CAPS 2026-07-28 (was a 100/100 beta hack from 2026-07-01 so TestFlight testers
// could exercise Otto freely; dropped early on Justin's call).
// SUPPORTER IS 30, NOT THE 25 THE SPEC ORIGINALLY LOCKED -- deliberate change 2026-07-28. 3x the free tier
// makes the perk read as real, and it functions as a runaway backstop rather than a product limit (if 10 is
// rare for a free user, 30 is unreachable for a paying one). The tail exposure is accepted knowingly: a
// Supporter who genuinely maxed 30/day would cost more than they pay, but they would have to max Halo and
// the estimator too for the scary combined number, and that user does not exist.
// FREE IS 10 by Justin's call -- new users are the heaviest Otto users and they are all free, so this is
// the number to revisit first if onboarding feedback says people hit a wall while learning the app.
const FREE_DAILY_CAP = 10;
const SUPPORTER_DAILY_CAP = 30;

// Dev/test accounts that bypass the daily cap (effectively unlimited). Empty this before public
// launch. Currently just Justin's uid for testing (same uid Halo whitelists).
// EMPTIED 2026-07-28 (Justin's own uid removed) so he experiences the real caps like any other user --
// he found the unreachable Reports locked screen precisely by being on the free path. Add a uid back here
// temporarily if heavy Otto testing needs it; must be EMPTY at launch either way.
// ⚠️ TEMPORARILY REPOPULATED 2026-07-31 for the free/paid split work (THE PLAN item B). Justin is the only
// tester and testing the free tier means asking Otto far more than 10 questions in an afternoon. This ONLY
// lifts the daily message cap -- it does NOT grant entitlement, so the free-tier gate below still applies to
// him and the walls still fire. MUST BE EMPTY AT LAUNCH (already on the launch checklist).
const DEV_UNLIMITED_UIDS: string[] = ['zLZOx2aqiKXcl3tlg7LNmkwbGxH3'];

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

// ─── PITCH BUDGET (SPEC_otto.md open item 4) ─────────────────────────────────
// At most THREE mentions of the Supporter plan in any rolling 7 days. The "once per conversation" half is
// the CLIENT's job -- a conversation only exists on the client, the server sees one message at a time -- but
// the weekly budget is per ACCOUNT and must not be client-trusted, so it lives here beside the usage counter.
const PITCH_MAX_PER_WEEK = 3;
const PITCH_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
// An explicit no buys 30 days of silence from the UNPROMPTED pitch. Long on purpose and it costs almost
// nothing, because trigger 1 still works throughout: if they ask, he answers. Being asked again two weeks
// after saying no is how a maybe becomes a never.
const DECLINE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const DECLINE_TAG = '[[DECLINED]]';

/**
 * ⚠️ THE BUDGET IS CHECKED BEFORE THE CALL AND SPENT AFTER IT, and those are deliberately two steps.
 *
 * They used to be one, and it cost two evenings: the slot was spent the moment the app DECIDED a pitch was
 * allowed, with nothing checking that Otto went on to make one. Every message where he stayed quiet (a
 * contradiction in his prompt, a refusal, a failed call) silently burned one of the three, so the pitch
 * disabled itself for a week without a trace. Spending it only on a reply that really names the plan means
 * the budget counts pitches the USER SAW, which is the only thing it was ever meant to ration.
 *
 * Both halves FAIL SILENT, NOT OPEN: any error means no pitch. The cost of a missed pitch is nothing; the
 * cost of a wrongly-fired one is pitching a paying subscriber.
 */
// ⚠️ ONE READ, TWO ANSWERS. The weekly budget and the 30-day decline live in the same document, so they are
// fetched together rather than costing two lookups on every single message.
async function pitchState(uid: string): Promise<{ hasRoom: boolean; declined: boolean }> {
  try {
    const snap = await usageDoc(uid).get();
    const d = snap.exists ? (snap.data() as { pitchAtMs?: number[]; declinedAtMs?: number }) : {};
    const now = Date.now();
    const recent = (d.pitchAtMs ?? []).filter((t) => typeof t === 'number' && now - t < PITCH_WINDOW_MS);
    const declined = typeof d.declinedAtMs === 'number' && now - d.declinedAtMs < DECLINE_WINDOW_MS;
    return { hasRoom: recent.length < PITCH_MAX_PER_WEEK, declined };
  } catch (e) {
    // Fails to SILENCE, like every other pitch check: no room, and treat them as having declined.
    console.error('pitchState failed (staying silent):', uid, e);
    return { hasRoom: false, declined: true };
  }
}

/** They told him no. Silences the UNPROMPTED pitch for 30 days; if they ask, he still answers. */
async function recordDecline(uid: string): Promise<void> {
  try {
    await usageDoc(uid).set({ declinedAtMs: Date.now() }, { merge: true });
  } catch (e) {
    console.error('recordDecline failed:', uid, e);
  }
}

/**
 * Spend one slot, now that Otto has actually pitched. Re-checks the cap inside the transaction rather than
 * trusting the earlier read, so two messages in flight at once can never push the week past three.
 */
async function recordPitch(uid: string): Promise<void> {
  try {
    const ref = usageDoc(uid);
    await admin.firestore().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const d = snap.exists ? (snap.data() as { pitchAtMs?: number[] }) : {};
      const now = Date.now();
      const recent = (d.pitchAtMs ?? []).filter((t) => typeof t === 'number' && now - t < PITCH_WINDOW_MS);
      if (recent.length >= PITCH_MAX_PER_WEEK) return;
      tx.set(ref, { pitchAtMs: [...recent, now] }, { merge: true });
    });
  } catch (e) {
    console.error('recordPitch failed (slot not spent):', uid, e);
  }
}

/**
 * Did Otto actually mention the plan? The pitch block orders him to name it as "the Supporter plan" and
 * forbids the bare word on its own, so the word itself is a reliable marker. Only consulted on messages
 * where a pitch was already allowed, so an ordinary answer about membership can never trip it.
 */
function mentionsThePlan(reply: string): boolean {
  return /supporter/i.test(reply);
}

// Deterministic house-style backstop (same as Halo): strip any dash the model slips past the
// prompt rule so a reply can never ship with one. Single hyphens between digits are preserved so
// numeric ranges (for example a "7-14 day" window) never break.
function sanitizeDashes(text: string): string {
  return text
    .replace(/(\d)\s*[–]\s*(\d)/g, '$1-$2')
    .replace(/\s*(?:[—–]|--)\s*/g, ', ')
    // A PLAIN hyphen used as a dash ("your Log tab - just tap the date") slipped through: the rule above
    // only catches long dashes and double hyphens. Digits on either side are excluded so a spaced numeric
    // range ("60 - 90 seconds") stays a range instead of becoming "60, 90".
    .replace(/(?<!\d)\s+-\s+(?!\d)/g, ', ')
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
  { secrets: [ANTHROPIC_API_KEY, REVENUECAT_SECRET_KEY], maxInstances: 10 },
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
      freeContext?: unknown;
      pitchRequested?: unknown;
      capsWorkout?: unknown;
      faithHandoff?: unknown;
      faithHandoffRepeat?: unknown;
      workoutCut?: unknown;
      pitchAsked?: unknown;
      mayDecline?: unknown;
      undereating?: unknown;
      undereatingFollowUp?: unknown;
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
    // The always-free extras (achievements, journal + prayers, the exercise-name list). Kept separate from
    // dataSnapshot precisely so the server's gate below can discard the gated half without taking these
    // with it. See SPEC_otto.md open item 1.
    const freeContext = typeof data.freeContext === 'string' && data.freeContext.trim()
      ? data.freeContext.trim()
      : undefined;
    // The CLIENT's half of the pitch decision: this conversation has hit its third wall, or the user asked
    // outright for more. It is only ever a REQUEST -- the server still has to agree (below).
    const pitchRequested = data.pitchRequested === true;

    // 2. Server-side crisis re-screen (backstop). Short-circuit before counting or calling AI.
    if (screenForCrisis(message)) {
      return { ok: true, crisis: true };
    }

    // 3. Per-user daily cap: atomic check-and-increment so concurrent calls cannot race past it.
    // Tier from the SERVER's own membership record (fails closed to free on any error).
    // ⚠️ ONE lookup, TWO decisions with OPPOSITE defaults (see membership.ts). ACCESS treats anything that
    // is not a confirmed entitlement as free, so a failure can never hand out a paid feature. PITCHING only
    // fires on a CONFIRMED free user, so a failure can never sell to a subscriber.
    const status = await membershipStatus(uid);
    const supporter = status === 'entitled';
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

    // ⚠️ ALL THREE MUST AGREE: only a CONFIRMED free user (never 'unknown', never a subscriber), only when
    // the client says this conversation earned it, and only if the weekly budget has room. The slot is not
    // spent here -- see `pitchBudgetHasRoom` for why that is two steps now.
    const state = status === 'free' && pitchRequested ? await pitchState(uid) : { hasRoom: false, declined: false };
    const budgetHasRoom = state.hasRoom;
    // ⚠️ THE 30-DAY SILENCE GAGS THE WALL TRIGGER ONLY. If THEY asked, he answers, every time -- that is the
    // whole reason the window can be this long. The client tells us which trigger fired; without that split
    // a decline would silence their own questions too, which would be a worse app than before the feature.
    const pitchAsked = data.pitchAsked === true;
    const silenced = state.declined && !pitchAsked;
    // ── THE UNDEREATING SAFEGUARD (THE PLAN item L) ────────────────────────────────────────────────────
    // The APP detects the pattern and renders the numbers; Otto is only the voice. What arrives here is a
    // flag plus two figures, never anybody's food history, so the item B data gate is untouched and this
    // behaves identically for a free user and a Supporter. Numbers are validated because they are printed
    // into copy the user reads word for word.
    const rawUnder = data.undereating as { avgCal?: unknown; bmr?: unknown } | undefined;
    const underAvg = typeof rawUnder?.avgCal === 'number' && rawUnder.avgCal > 0 ? Math.round(rawUnder.avgCal) : 0;
    const underBmr = typeof rawUnder?.bmr === 'number' && rawUnder.bmr > 0 ? Math.round(rawUnder.bmr) : 0;
    const safeguardActive = underAvg > 0 && underBmr > 0;
    // The app arms the follow-up for the two turns after the question, so the two medical-adjacent answers
    // are ready if they go that way. Otto picks between them; the app cannot see which answer they gave.
    const safeguardFollowUp = safeguardActive && data.undereatingFollowUp === true;

    // ⚠️ A SAFETY QUESTION AND A SALES LINE DO NOT SHARE A REPLY. Suppressing it here rather than on the
    // client also means the weekly slot is never spent (see `pitched` below, which reads this same flag).
    const pitchAllowed = status === 'free' && pitchRequested && budgetHasRoom && !silenced && !safeguardActive;

    // ⚠️ THE PITCH INSTRUCTION RIDES ON THE MESSAGE, NOT THE SYSTEM PROMPT. See PITCH_REQUIRED_BLOCK for the
    // measurements; the short version is that Otto is on a small model with a ~90,000 character system
    // prompt, and an instruction at the end of that loses to his standing "never be pushy" character. On the
    // message it lands every time. This is appended SERVER-SIDE only: the phone stores the user's own text,
    // so the block is never shown to them and never survives into the next turn's history.
    // ⚠️ THE CAP IS ENFORCED FOR A FREE USER ONLY, and the server decides that from its OWN membership
    // record -- `capsWorkout` from the client only says "this message asked for exercises". A modified
    // client cannot switch the cap off, and a Supporter can never have it switched on.
    const capsWorkout = status !== 'entitled' && data.capsWorkout === true;
    // Did the cap actually withhold something? Only then does Otto say the limit line. The APP decides this,
    // he does not -- see buildWorkoutCapBlock.
    const workoutCut = capsWorkout && data.workoutCut === true;

    // ⚠️ BOTH BLOCKS RIDE ON THE MESSAGE, NOT THE SYSTEM PROMPT. See PITCH_REQUIRED_BLOCK and
    // buildWorkoutCapBlock for the measurements behind that. Appended server-side only: the phone stores the
    // user's own text, so neither block is ever shown to them or carried into the next turn's history.
    // Watch for a refusal only once he has actually pitched in this conversation -- you cannot decline
    // something you were never offered. The client tracks that; the server still gates it on being free.
    const mayDecline = status === 'free' && data.mayDecline === true;
    // PLAN.md item 8. The CLIENT detects a faith conversation (utils/companionFaith.ts, measured 0 false
    // alarms across 141 app and wellness messages) and the block rides on the user turn, because a rule in
    // the system half is exactly what Otto has been ignoring.
    const faithHandoff = data.faithHandoff === true;
    const faithHandoffRepeat = data.faithHandoffRepeat === true;
    const suffix = [
      // ⚠️ THE HANDOFF LEADS. If a message is faith, nothing else matters: Otto is not answering it, so a
      // workout cap or a pitch riding underneath would be attached to a reply that never happens.
      faithHandoff ? buildFaithHandoffBlock(faithTier, faithHandoffRepeat) : '',
      // ⚠️ ON EVERY MESSAGE, unlike the blocks below which are conditional. It is ~40 input tokens and it
      // buys back ~100 output tokens, and output costs five times what input does, so it pays for itself
      // roughly twelve times over. Measured 2026-08-04: replies drop from 216 to 113 tokens.
      REPLY_SHAPE_BLOCK,
      // ⚠️ THE SAFEGUARD LEADS. If a message somehow both asks for exercises and raises food, the safety
      // question comes first and the cap block still rides along underneath it: obeying the safeguard means
      // naming no movements at all, so the ceiling costs nothing, and if he ignores it the cap still holds.
      safeguardFollowUp ? buildUndereatingFollowUpBlock(underAvg, underBmr)
        : safeguardActive ? buildUndereatingAskBlock(underAvg) : '',
      capsWorkout ? buildWorkoutCapBlock(workoutCut) : '',
      mayDecline ? DECLINE_WATCH_BLOCK : '',
      pitchAllowed ? PITCH_REQUIRED_BLOCK : '',
    ].filter(Boolean).join('\n\n');
    const messages: Anthropic.MessageParam[] = [
      ...history,
      { role: 'user', content: suffix ? `${message}\n\n${suffix}` : message },
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
            // Batch 1 of item H: assembled from chapters instead of one blob. With no argument this is
            // byte-identical to ASSISTANT_APP_KNOWLEDGE, so nothing Otto sees has changed yet. Routing
            // (passing a chapter list here) is a later batch. See SPEC_otto_routing.md.
            text: buildCompanionStable(assembleAppKnowledge()),
            cache_control: { type: 'ephemeral' },
          },
          {
            // Volatile half (this user's context + data snapshot): not cached.
            type: 'text',
            // ⚠️ THE GATE IS ENFORCED HERE TOO, not only on the client. The app already declines to build a
            // snapshot for a free user, but a modified client could send one, and this is the one place in
            // the system where trusting the client would hand out a paid feature. `supporter` comes from
            // the server's own membership record and fails closed to free on any error.
            // (A user who TYPES their own numbers into the message still gets personalised advice. That is
            // the accepted loophole from SPEC_otto.md open item 5 -- the app revealed nothing.)
            text: buildCompanionVolatile(userContext, supporter, supporter ? dataSnapshot : undefined, freeContext, faithTier),
          },
        ],
        messages,
      });
      // PLAN.md item 0: record what this call actually cost. Fire and forget -- never
      // awaited, never throws, and writes to its own collection so it cannot touch the cap counters.
      recordUsage('otto', uid, MODEL, response.usage);
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

    // ⚠️ STRIP THE DECLINE TAG BEFORE ANYTHING ELSE TOUCHES THE REPLY. Unlike the crisis tag, this reply IS
    // shown to the user, so a missed strip means they read "[[DECLINED]]" in the chat. Done before the dash
    // pass so the brackets can never be mangled into something the regex leaves behind.
    const declinedNow = replyText.includes(DECLINE_TAG);
    if (declinedNow) replyText = replyText.split(DECLINE_TAG).join('').trim();

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

    // The reply is real and the user is about to see it, so a pitch inside it is a pitch that happened.
    // Deliberately AFTER the crisis and empty-reply exits above: neither of those reaches the user, and a
    // crisis reply must never cost a slot.
    // ⚠️ A DECLINE BEATS A PITCH IN THE SAME REPLY. If both somehow land, record the no and spend nothing --
    // banking a slot against someone who just said stop is the worst of both outcomes.
    if (declinedNow && status === 'free') await recordDecline(uid);
    const pitched = !declinedNow && pitchAllowed && mentionsThePlan(replyText);
    if (pitched) await recordPitch(uid);

    // TEMPORARY DIAGNOSTIC (2026-07-31): the pitch was not firing and the inputs could not be told apart
    // from the outside. Remove once it is behaving. Never logs the reply itself, only whether it pitched.
    console.log('[pitch]', JSON.stringify({ status, pitchRequested, pitchAsked, budgetHasRoom, silenced, pitchAllowed, pitched, declinedNow }));

    // ⚠️ `pitched` GOES BACK TO THE APP because "one pitch per conversation" is the client's half of the rule
    // and it cannot work this out for itself: the wall count only ever climbs, so without being told, the app
    // asks again on every message after the third and Otto could pitch three times in one sitting. The server
    // is the only side that knows whether he actually said it.
    return { ok: true, reply: replyText, used: cap.used, cap: dailyCap, pitched };
  },
);
