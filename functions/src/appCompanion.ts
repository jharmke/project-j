import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import * as admin from 'firebase-admin';
import Anthropic from '@anthropic-ai/sdk';
import { screenForCrisis } from './crisis';
import { membershipStatus, REVENUECAT_SECRET_KEY } from './membership';
import {
  buildCompanionRules,
  buildCompanionManual,
  COACH_NO_MANUAL_BLOCK,
  buildFaithHandoffBlock,
  faithHandoffReply,
  buildCompanionVolatileSplit,
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
import { recordUsage, recordHistorySample, recordCannedOutcome } from './aiUsageMeter';
import { routeCoachOrSupport } from './ottoCoachRouting';
import { matchCanned } from './ottoCannedMatcher';
import { CANNED_ANSWERS } from './ottoCannedAnswers';
import { GENERAL_ANSWERS } from './ottoGeneralAnswers';
import { buildPitchReply } from './ottoPitchCopy';

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
// ⚠️ 10 -> 5 ON 2026-08-05 (PLAN.md 3.1). Done BEFORE launch on purpose: this is the one dial users can
// SEE, and PLAN's rule is that a visible limit may be raised but never tightened. There are no free users
// yet (every TestFlight tester is a Supporter), so this is the last moment it costs nothing.
// ⚠️ CHANGING THIS NUMBER MEANS CHANGING FOUR OTHER PLACES, not one: Otto's knowledge base states it out
// loud (`assistantAppKnowledge.ts`), `FirstWeekEndedModal.tsx` promises it in copy, and LAUNCH_CHECKLIST.md
// records the locked design. The in-chat counter is fine -- it reads `cap` off the response.
const FREE_DAILY_CAP = 5;
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
// ⚠️ MEASURED 2026-08-05 AND DELIBERATELY LEFT AT 12 (PLAN.md 4.5). Do not "optimise" this.
// History is 38% of full-price input but only 5% of the bill. A free user on the 5/day cap tops out at 9
// messages of history and never reaches this cap, so lowering it bills SUPPORTERS almost exclusively.
// And it backfires: the cold cache write is a per-CONVERSATION cost, so a shorter history means fewer
// messages to spread it over ($0.0072/msg over 10 messages vs ~$0.021 over 2).
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
    const suffixParts = [
      // ⚠️ THE HANDOFF LEADS. If a message is faith, nothing else matters: Otto is not answering it, so a
      // workout cap or a pitch riding underneath would be attached to a reply that never happens.
      faithHandoff ? buildFaithHandoffBlock(faithTier, faithHandoffRepeat) : '',
      // ⚠️ ON EVERY MESSAGE, unlike the blocks below which are conditional.
      // 🔴 **ITS COST JUSTIFICATION WAS WRONG AND IS CORRECTED HERE (2026-08-06, PLAN 4.4).** This comment
      // used to say "~40 input tokens... buys back ~100 output tokens... pays for itself roughly twelve
      // times over". MEASURED on 18 coaching questions with and without it (`_otto_length.cjs`): the block
      // is **334 tokens**, and it saves **63** output tokens (185 -> 122). At $1/M in and $5/M out that is
      // $0.000336 spent to save $0.000315. **It is a net loss of about $0.00002 a message.**
      // ✅ **KEEP IT ANYWAY.** It is not only a length rule: it also carries the no-questions rule, the
      // answer-the-likely-reading rule and the no-dashes rule, and those are QUALITY. Removing it to save a
      // fiftieth of a cent would cost all three. Read it as "a quality block that is roughly cost-neutral",
      // not as a cost optimisation.
      REPLY_SHAPE_BLOCK,
      // ⚠️ THE SAFEGUARD LEADS. If a message somehow both asks for exercises and raises food, the safety
      // question comes first and the cap block still rides along underneath it: obeying the safeguard means
      // naming no movements at all, so the ceiling costs nothing, and if he ignores it the cap still holds.
      safeguardFollowUp ? buildUndereatingFollowUpBlock(underAvg, underBmr)
        : safeguardActive ? buildUndereatingAskBlock(underAvg) : '',
      capsWorkout ? buildWorkoutCapBlock(workoutCut) : '',
      mayDecline ? DECLINE_WATCH_BLOCK : '',
      pitchAllowed ? PITCH_REQUIRED_BLOCK : '',
    ].filter(Boolean);
    const suffix = suffixParts.join('\n\n');
    // 🔴 WHAT THE CANNED GATE BELOW ACTUALLY NEEDS TO KNOW: has the APP decided something must ride on THIS
    // message? That means the CONDITIONAL blocks only. `REPLY_SHAPE_BLOCK` is on every single message and is
    // an instruction to the MODEL about how to write its reply, which a canned answer never involves.
    // 🔴 THIS EXACT LINE IS WHY CANNED ANSWERS DID NOTHING FOR THEIR FIRST DAY IN PRODUCTION.
    // The gate was `if (!suffix)`. `suffix` always contains `REPLY_SHAPE_BLOCK`, so it is NEVER empty, so the
    // matcher NEVER ran. Found 2026-08-07 from the meter, not from reading the code: Justin's 10-message test
    // metered `cannedBlocked: 10, cannedHit: 0` and every reply came back AI-written at full price. The
    // replies all looked fine, which is exactly why nothing but the counter could have caught it.
    // ⚠️ DERIVED FROM THE ARRAY ON PURPOSE, not restated as a boolean: add a new conditional rider above and
    // this gate counts it automatically. A hand-written `safeguardActive || capsWorkout || ...` would silently
    // fall out of date the first time someone adds a sixth block.
    // 🔴 PITCH_REQUIRED_BLOCK NO LONGER BLOCKS A CANNED ANSWER (2026-08-09, PLAN 4.13).
    // ⚠️ IT USED TO, AND JUSTIN'S DEVICE TEST IS WHAT EXPOSED THE COST. He asked four questions: "how much
    // protein" came back instantly from the library, and "is creatine worth it" and "how many rest days"
    // both went to the AI at full price even though both have perfectly good canned answers. The only
    // difference was that the app had decided those messages were pitch moments.
    // ➡️ **That trade was fine when canned answers were app paths only. With 137 fitness answers behind the
    // gate, every pitch moment now throws away a free answer AND pays for an AI one.**
    // ✅ SAFE, AND VERIFIED IN THE CODE RATHER THAN ASSUMED: the pitch slot is spent lazily. `recordPitch`
    // runs only after a reply is generated AND only if the model actually mentioned the plan (see the
    // `pitched` calculation near the end of this function). The canned path returns `pitched: false` and
    // never calls it, so the slot is NOT consumed and the pitch simply lands on a later message.
    // 🔴 EVERY OTHER RIDER STILL BLOCKS, and the distinction is deliberate: the faith handoff, the
    // undereating safeguard, the workout cap and the decline watch are all SAFETY or CORRECTNESS. A pitch
    // is marketing. Losing a pitch for one message costs a mention; swallowing a safeguard costs more.
    const ridersOnThisMessage = suffixParts.filter(
      (p) => p !== REPLY_SHAPE_BLOCK && p !== PITCH_REQUIRED_BLOCK,
    );

    // ── PLAN.md 4.14: THE FAITH HANDOFF IS SERVED DIRECTLY. No API call. ────────────────────────────────
    // 🔴 THE REPLY WAS ALWAYS A FIXED SENTENCE AND WE WERE PAYING A FULL PRICE MESSAGE TO PRODUCE IT.
    // Otto read his entire prompt and emitted text already written in this file. Justin watched it happen on
    // device on 2026-08-09: "I'm struggling with my faith right now" came back word for word, and cost.
    // ✅ **AND CANNING IT GUARANTEES THE WORDING, WHICH IS WORTH MORE THAN THE MONEY.** "Reply word for word"
    // is an instruction to a MODEL, and on this project a prompt instruction has lost to the model's own
    // inclination three times (Halo's two locked voice rules, Otto's no-guess rule inventing a limit, and
    // the invented "supplement tracker" the same day as this). A served string cannot paraphrase.
    // ✅ It also gains a BUTTON, which the AI reply could never carry: the words describe where the gold
    // cross button is, and now the reply can just take them there.
    //
    // ⚠️ GUARDED SO IT CANNOT SWALLOW ANYTHING. It fires only when the faith handoff is the ONLY thing the
    // app decided must ride on this message. If the undereating safeguard, a workout cap or the decline
    // watch is also active, the message goes the long way exactly as before.
    // ⚠️ THE GUARD IS DERIVED FROM THE ARRAY, not restated as booleans, for the same reason the comment
    // above says: a hand-written `!safeguardActive && !capsWorkout && ...` silently falls out of date the
    // first time somebody adds a sixth rider.
    // ⚠️ The cap has already been incremented above, so a handoff still spends a message. That matches
    // Justin's ruling that a canned answer spends one, and is what the old AI-written handoff did too.
    const faithBlockText = faithHandoff ? buildFaithHandoffBlock(faithTier, faithHandoffRepeat) : '';
    if (faithHandoff && ridersOnThisMessage.every((p) => p === faithBlockText)) {
      const handoff = faithHandoffReply(faithTier, faithHandoffRepeat);
      recordCannedOutcome('otto', uid, 'hit');
      return {
        ok: true,
        reply: handoff.route ? `${handoff.text} [[route:${handoff.route}]]` : handoff.text,
        used: cap.used,
        cap: dailyCap,
        pitched: false,
      };
    }
    // ── PLAN.md 4.8: CANNED ANSWER. No API call at all, so this reply costs ZERO. ──────────────────────
    // 🔴 POSITION IS LOAD-BEARING, TWICE OVER.
    //  1. AFTER the cap increment above, because Justin's call is that a canned answer still spends a
    //     message: hitting the wall is what creates pitch moments, and conversion moves the needle harder
    //     than cost does. Move this earlier and the cap silently stops counting them.
    //  2. AFTER the riders are built, because they are how we know the app has decided something must ride
    //     on THIS message. If it has, a canned answer would silently swallow it: the undereating safeguard
    //     would never ask its question, the faith handoff would never fire, and a pitch slot the weekly
    //     budget already approved would evaporate.
    // ⚠️ Crisis needs no guard here: the client short-circuits a crisis before it ever reaches this call.
    // ⚠️ GATE ON `ridersOnThisMessage`, NEVER ON `suffix` -- see the note where it is built. Testing `suffix`
    // switches this whole feature off and nothing on screen looks wrong.
    if (ridersOnThisMessage.length === 0) {
      const cannedCtx = { supporter, faithTier, styleMode };
      const appHit = matchCanned(message, cannedCtx, CANNED_ANSWERS);

      // ── PLAN.md 4.13: the GENERAL nutrition/fitness library ──────────────────────────────────────
      // 🔴 FREE USERS ONLY, AND THAT IS THE WHOLE POINT OF 4.13. A Supporter pays for answers written
      // against their own numbers; handing them a generic pre-written one would be a downgrade, not a
      // saving. (This is the opposite call from the APP library, which serves both: there the canned
      // answer is EXACT and instant, so a Supporter gains from it.)
      const genHit = supporter
        ? ({ matched: false } as ReturnType<typeof matchCanned>)
        : matchCanned(message, cannedCtx, GENERAL_ANSWERS);

      // 🔴 TIEBREAK WITH THE ROUTER, AND ONLY ON A COLLISION.
      // ⚠️ THE ORIGINAL PLAN WAS TO HARD-SPLIT: route first, then search ONE library. **MEASURED AND
      // REJECTED 2026-08-09.** The router sent 4 of 18 real fitness questions to the app side ("is keto
      // any good", "how do i stay consistent", "do detox teas work", "is bmi accurate") and 1 of 8 app
      // questions to the fitness side. Splitting on that loses every one of them outright, ~20% of
      // coverage, from a change meant to improve things.
      // ⚠️ **The router's "zero dangerous misroutes" record does not mean what it looks like here.**
      // Dangerous there meant an APP question reaching a manual-less Otto. A fitness question landing on
      // the Support side was harmless in that design and is fatal in this one. Same measurement, different
      // question being asked of it.
      // ✅ So both libraries are always searched and the router only arbitrates when BOTH match, where it
      // cannot cost coverage. Verified it calls the two real leak cases correctly: "how much protein should
      // i be eating" and "should i train fasted" both come back as coaching, so the fitness answer wins.
      let canned = appHit;
      if (appHit.matched && genHit.matched) {
        canned = routeCoachOrSupport(message).coachOnly ? genHit : appHit;
      } else if (genHit.matched) {
        canned = genHit;
      }

      if (canned.matched) {
        recordCannedOutcome('otto', uid, 'hit');
        return {
          ok: true,
          reply: canned.matched.route
            ? `${canned.matched.text} [[route:${canned.matched.route}]]`
            : canned.matched.text,
          used: cap.used,
          cap: dailyCap,
          pitched: false,
        };
      }
      recordCannedOutcome('otto', uid, 'miss');

      // ── PLAN.md 4.13 STEP 5: THE COACH GATE. A free user's coaching question never reaches the AI. ──
      // 🔴 THIS IS WHERE THE MONEY IS, and the 137-answer library above is what stops it feeling brutal.
      // Without the library every coaching question would land here; with it, only the uncovered ones do.
      // ⚠️ **COVERAGE STOPS BEING A COST QUESTION AT THIS LINE.** Below it the AI is never called either
      // way, so the library's hit rate decides how often a free user is HELPED rather than SOLD TO. That is
      // a product judgement now, not a spreadsheet one.
      //
      // ✅ FAITH IS PROTECTED FOR FREE, WITH NO CODE HERE. This whole block only runs when
      // `ridersOnThisMessage` is empty, and the faith handoff is one of those riders. A faith message can
      // never reach this gate. (PLAN 4.13's faith-fails-open rule, satisfied structurally.)
      // ⚠️ FAILS OPEN BY DESIGN: `routeCoachOrSupport` sends roughly 4 in 18 real fitness questions to the
      // Support side, and those still get an AI answer. That costs money and never costs the user anything,
      // which is the correct direction for a wrong guess.
      // ⚠️ `pitched: false` DELIBERATELY. The weekly pitch budget exists to stop Otto NAGGING; this is not a
      // nag bolted onto an answer, it IS the answer. Spending a budget slot here would silence the
      // spontaneous pitches the budget was built for.
      // ⏳ NOT BUILT YET: the escalated second-miss copy and the category-specific Case A tails. Both need
      // conversation state or the personal-question-to-general-answer mapping. See SPEC_otto.md.
      // ⚠️ OWN-DATA QUESTIONS ARE GATED TOO, EVEN THOUGH THE ROUTER CALLS THEM SUPPORT. "Am i eating enough
      // protein" was reaching the AI, and that call was pure waste: `FREE_TIER_BLOCK` tells a free Otto he
      // has NO logged food, training, sleep or averages for this user, so he could never have answered it.
      // We were paying for him to say so. This is exactly the case A scenario the copy was written for.
      // 🔴 AND THE ROUTER'S OWN REASON IS WHAT SEPARATES THE TWO KINDS OF "MY" QUESTION. Gating on the
      // matcher's own-data verdict alone was wrong: **"how many custom foods do i have" got pitched**, and
      // that is a saved-item count, not coaching data. The router already tells them apart and was measured
      // doing it: `own-data` for "am i eating enough protein", `app-term` for "how many recipes have i made".
      const route = routeCoachOrSupport(message);
      const ownData = (appHit.reason === 'own-data' || genHit.reason === 'own-data')
        && route.reason === 'own-data';
      if (!supporter && (ownData || route.coachOnly)) {
        const kind = ownData ? 'own-data' : 'no-answer';
        recordCannedOutcome('otto', uid, 'gated');
        return {
          ok: true,
          reply: `${buildPitchReply(kind, message)} [[route:support]]`,
          used: cap.used,
          cap: dailyCap,
          pitched: false,
        };
      }
    } else {
      recordCannedOutcome('otto', uid, 'blocked');
    }

    const messages: Anthropic.MessageParam[] = [
      ...history,
      { role: 'user', content: suffix ? `${message}\n\n${suffix}` : message },
    ];

    // PLAN.md 4.9. ONE yes/no: can this be answered without the app manual? Measured over 306 messages
    // across three corpora at ZERO dangerous misses (an app question sent to a manual-less Otto).
    // ⚠️ The default is the manual, so anything this is unsure about behaves exactly as it did before.
    const route = routeCoachOrSupport(message);

    // PLAN.md 4.3. Split, not rewritten: `cached + tail` is byte-identical to what this call has always
    // sent, so the prompt Otto reads is unchanged in both content and order.
    const volatile = buildCompanionVolatileSplit(
      userContext, supporter, supporter ? dataSnapshot : undefined, freeContext, faithTier,
    );

    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });

    let replyText = '';
    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: [
          {
            // PLAN.md 4.9, block 1 of 3: THE RULES. Identical for every user and for BOTH routes, so this
            // stays one shared cached copy that Coach and Support messages warm for each other.
            type: 'text',
            text: buildCompanionRules(),
            cache_control: { type: 'ephemeral' },
          },
          {
            // Block 2: the manual, or the short stand-in that replaces it on a coaching message.
            // ⚠️ The stand-in is NOT optional -- the rules above refer to "the map below", and BASE's
            // no-guess rule needs something to be true about. See COACH_NO_MANUAL_BLOCK.
            type: 'text',
            text: route.coachOnly ? COACH_NO_MANUAL_BLOCK : buildCompanionManual(assembleAppKnowledge()),
            cache_control: { type: 'ephemeral' },
          },
          {
            // Per-user half that does NOT change between messages (their context + faith tier, plus the
            // free-plan block for a free user). PLAN.md 4.3: this was being re-sent at full price on every
            // message, and for a free user ~74% of it is text that never changes at all.
            // ⚠️ THE GATE IS ENFORCED HERE TOO, not only on the client. The app already declines to build a
            // snapshot for a free user, but a modified client could send one, and this is the one place in
            // the system where trusting the client would hand out a paid feature. `supporter` comes from
            // the server's own membership record and fails closed to free on any error.
            // (A user who TYPES their own numbers into the message still gets personalised advice. That is
            // the accepted loophole from SPEC_otto.md open item 5 -- the app revealed nothing.)
            type: 'text',
            text: volatile.cached,
            cache_control: { type: 'ephemeral' },
          },
          // Everything that genuinely changes message to message (a Supporter's freshly built snapshot,
          // and the always-free extras that only ride along when the question calls for them). Outside the
          // marker deliberately -- inside it, one changed number would rewrite the whole cached copy.
          // Pushed only when it has content: an empty text block is not valid.
          ...(volatile.tail ? [{ type: 'text' as const, text: volatile.tail }] : []),
        ],
        messages,
      });
      // PLAN.md item 0: record what this call actually cost. Fire and forget -- never
      // awaited, never throws, and writes to its own collection so it cannot touch the cap counters.
      recordUsage('otto', uid, MODEL, response.usage, route.coachOnly ? 'coach' : 'support');
      // PLAN.md 4.5. What does re-sending the conversation actually cost? Both system blocks carry cache
      // markers now, so `usage.input_tokens` is the MESSAGE side of the request at full price. Count this
      // turn on its own and the remainder is the history.
      // ⚠️ NOT AWAITED, and inside its own try -- a measurement must never delay or break a reply. The
      // count_tokens call is free and does not consume the daily cap.
      void (async () => {
        try {
          if (!history.length) return;
          const turnOnly = await client.messages.countTokens({
            model: MODEL,
            messages: [messages[messages.length - 1]],
          });
          const histTok = (response.usage?.input_tokens ?? 0) - (turnOnly.input_tokens ?? 0);
          recordHistorySample('otto', uid, histTok, history.length);
        } catch (e) {
          console.error('[otto] history sample failed', { msg: (e as Error)?.message });
        }
      })();
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
