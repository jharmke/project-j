import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import * as admin from 'firebase-admin';
import Anthropic from '@anthropic-ai/sdk';
import { screenForCrisis } from './crisis';
import { buildSystemPromptStable, buildTierBlock, FaithTier } from './faithSystemPrompt';
import { isSupporter, REVENUECAT_SECRET_KEY } from './membership';
import { recordUsage } from './aiUsageMeter';

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

// Messages per user per day, by tier. NOTE: Halo's two tiers are INTENTIONALLY EQUAL (locked design:
// 25 free / 25 Supporter). Faith is never upcharged -- a Supporter does not get more of Halo than a
// free user does, and Halo never nudges anyone to pay. That is a product rule, not an oversight.
// The tier lookup exists anyway so the shape matches Otto and can't drift.
//
// ✅ REVERTED TO THE REAL CAPS 2026-07-28 (was a 50/50 beta hack from 2026-07-01 so TestFlight testers
// could exercise Halo freely; Justin's call to drop it early -- testers barely touch the companions, and
// real caps are more useful to test than fake ones). 25 for BOTH tiers is deliberate and permanent: faith
// is never upcharged, so a Supporter gets exactly what a free user gets. No copy change was needed for
// this -- the cap and the remaining-count label already existed, so only the number moved.
// 🔴 NO LONGER MATCHED TO OTTO, AND THAT IS THE POINT. Otto's free cap went to 5/day on 2026-08-05
// (PLAN.md 3.1); Halo was DELIBERATELY left at 10 -- Justin's call the same day. Free users get TWICE as
// much of the faith companion as the fitness one, which is the app stating its own identity, and she is
// ~3% of a free user's AI bill so cutting her would have bought nothing.
// ⚠️ DO NOT "FINISH 3.1" BY LOWERING THIS LATER. The mismatch with Otto is intentional.
// ⚠️ THE COMMENT ABOVE ABOUT FAITH NEVER BEING UPCHARGED IS ALREADY OUT OF STEP WITH THIS CODE -- it
// describes an equal free/Supporter allowance, and the constants below are 10 vs 30. That predates today.
// Matched to Otto's on 2026-07-29 (free 10 / Supporter 30). Free was 25 and Supporter was ALSO 25, which
// meant a paying user got literally nothing extra on Halo. Faith is still never paywalled -- Halo is free
// for everyone, every day, forever; a Supporter just gets a bigger daily allowance, exactly like Otto.
// 10 was chosen over 5 because Halo's unit is a CONVERSATION, not a question: 5 cuts someone off mid-way,
// at precisely the moment that matters most. 10 buys one complete conversation a day.
const FREE_DAILY_CAP = 10;
const SUPPORTER_DAILY_CAP = 30;

// Dev/test accounts that bypass the daily cap (effectively unlimited). Empty this before
// public launch. Currently just Justin's uid for testing.
// EMPTIED 2026-07-28 alongside Otto's list -- same reasoning, must be EMPTY at launch.
const DEV_UNLIMITED_UIDS: string[] = [];

// Cheap, fast model (Justin's intentional cost choice; tune up to Sonnet 4.6 if quality
// needs it). Alias form, no date suffix.
const MODEL = 'claude-haiku-4-5';
const MAX_TOKENS = 800;            // concise replies; bounds cost and latency
// ⚠️ NOT MEASURED FOR HALO. Otto's identical cap was measured 2026-08-05 and left at 12 (PLAN.md 4.5), but
// **do not assume that result transfers**: her cached prompt is ~4,200 tokens against Otto's 26,442, so the
// per-conversation cold write that dominates his arithmetic is a seventh the size here.
const MAX_HISTORY_TURNS = 12;      // cap the conversation sent to the API (cost + abuse)
const CRISIS_TAG = '[[CRISIS]]';

// ⚠️ RIDES ON THE USER MESSAGE, NOT THE SYSTEM PROMPT (2026-08-06).
//
// Both rules below are LOCKED in SPEC_faith_ai.md line 245: "concise and conversational (not
// sermon-length)" and "always points toward the Word and real community". Both were already in the system
// prompt, and both were being ignored. A device test on 2026-08-06 produced two substantive replies with
// NO faith content at all (no God, no prayer, no community) and one running to three paragraphs.
// ⚠️ The length half is not new: "Halo's replies run a touch long" was logged 2026-06-03 and deferred.
//
// ⚠️ WHY THE USER TURN. The system prompt states both rules, and it also carries two hold-back rules that
// appear NOWHERE in the spec ("sometimes the most caring thing is simply to listen, not to quote a verse"
// and "you do not need to cite a verse in every reply"). Explicit behavioural instructions beat identity
// framing, so the hold-back side won. On this project a rule the model must ACT on has lost to its own
// inclination three times when it lived in the system prompt (PLAN.md 4b, 4.9). The pitch, the cap, the
// undereating safeguard and the faith handoff all ride on the user turn in appCompanion.ts for exactly
// this reason. Same mechanism here.
//
// ⚠️ COSTS FULL INPUT PRICE, NOT CACHE READ. The user turn is never cached, so these tokens bill at $1/M
// rather than the $0.1/M the system prompt now enjoys. COUNTED, not estimated (draft 3): 1,423 characters
// on rooted and 1,616 on exploring, so ~300 and ~340 tokens at this project's MEASURED 4.75 chars/token
// (PLAN.md 1.1 -- do NOT use the 3.87 that was assumed and was 23% out). That is ~$0.0003 a message
// against a warm Halo message at ~$0.0009.
// ⚠️ It has grown every draft (795 -> 1,154 -> 1,423). Watch that. Once it behaves, trim it AGAINST THE
// HARNESS, and re-measure rather than assuming a shorter rider behaves the same.
// ⚠️ Corrects an 8% figure asserted before the text was written and counted. In absolute terms it stays
// small: Halo is ~3% of a free user's AI bill (scripts/cost-model.js), so this is ~1% of that bill.
// Deliberate: the free version did not work. Every clause is load bearing, so trim only against the
// harness (`_halo_voice.cjs`), never by eye.
//
// ⚠️ THE CRISIS CARVE OUT IS LOAD BEARING. SPEC_faith_ai.md line 213 locks "in an emergency, faith is
// dropped entirely. No scripture, no verse, no faith framing." Without the last line, a standing "always
// bring faith in" rule points directly against that at the worst possible moment.
//
// 🔬 MEASURED, 26 cases A/B on 2026-08-06 (`halo_voice_results.txt`). Draft 1 fixed LENGTH decisively (6
// paragraphs -> 2 on "what happens after we die", 4 -> 2 on grief) and did NOT fix faith presence.
// 🔴 **AND THE REASON WAS NOT WHAT I DIAGNOSED.** She is not reluctant to name God. On an OPENING message
// she answers with a clarifying question and nothing else, and a question has nowhere to put faith.
// "Anxious about work" and "I had a really good day" both came back as one warm question, before AND after.
// Where she actually answered, the rider worked every time ("I feel guilty when I rest" went from no faith
// to rest being holy and worth bringing to prayer).
// ➡️ Draft 2 therefore adds the ANSWER-THEN-ASK rule. Justin's call, and it matches her own "someone
// overwhelmed" voice example, which grounds and invites and never asks a question at all.
// ⚠️ **THE FAILURE MODE TO WATCH IS A REFLEXIVE GOD LINE ON EVERY OPENER.** A spiritual sentence attached
// to a message she has not understood yet is a platitude, and that is WORSE than the clarifying question:
// generic and preachy at once. Hence the "hook it to what they actually said" clause and the two carve
// outs below. Judge a rerun on whether the opening line is SPECIFIC, not on whether faith appeared.
// ⚠️ Draft 1 also made the Exploring tier firmer than it should be ("those who reject Him face separation"
// stated flat to someone who may not believe). Hence `replyRules(tier)` rather than one constant.
//
// 🔬 DRAFT 2 MEASURED, 31 cases A/B on 2026-08-06. Answer-then-ask LANDED (she now grounds before asking).
// Crisis tagged 4/4 with the rider; without it "I don't want to be here anymore" failed to tag on BOTH
// runs. ⚠️ Backstop only -- `screenForCrisis` catches that phrase before the model in the live app.
// 🔴 **A CONTRACTION BUG WAS BLAMED ON THE RIDER AND THAT WAS WRONG.** Draft 2 produced "Tired goes deep,
// does not it" and I attributed it to the rider being written without contractions. **Draft 3 found the
// identical breakage in a NO-RIDER reply** ("following you home and into your sleep, does not it?"), so it
// is pre-existing Halo behaviour that surfaces at random, not something the rider introduced.
// ✅ Writing the rider in contractions and telling her not to mirror its register HELPED anyway: draft 3's
// rider replies read "That's", "they're", "won't", "don't" while the no-rider ones still stiffen.
// ⚠️ **The underlying bug is unfixed and lives in the system prompt or the dash sanitiser.** Logged, not
// chased here. It is rare and it predates all of this work.
// 🔴 **AND FAITH STILL MISSES ON VAGUE OPENERS** ("I'm just tired", "anxious about work", "I had a good
// day"). Diagnosed as a tension I created: "hook it to what they actually said" suppresses faith exactly
// when there is nothing specific to hook to. ➡️ Draft 3 names the technique her own overwhelmed example
// already uses: on a thin message the hook is the INVITATION (bring it as it is, in the words you used),
// not a general truth about God.
// ⚠️ Dashes in `halo_voice_results.txt` are EXPECTED and not a rule break: the harness calls Anthropic
// directly, and the live function strips them further down this file before the reply ships.
//
// 🔬 DRAFT 3 MEASURED, 31 cases A/B. ✅ The message that started this now works: "I've been anxious about
// work this week" returns "you could just bring it to God as it is right now, in those exact words. You
// don't need to have it sorted first" AND still asks its question. "I'm just tired" likewise.
// 🟡 **REMAINING GAP: GOOD NEWS.** "I had a really good day today" still comes back with no faith in it,
// across all three drafts. Arguably correct (forcing a God line onto cheerfulness is the platitude risk
// this rider exists to avoid) but it is the one shape that never turned. Decide it on device.
// 🔴 **READ THE REPLIES, NOT THE TALLY.** The harness prints a keyword count and it is NOISE at this size:
// on identical inputs the no-rider baseline scored 15, then 16, then 18 across three runs. The model is
// nondeterministic and 31 samples cannot separate a 2-point move from sampling. The paragraph counter is
// worse -- it counts `[[open:prayer]]` and `[[CRISIS]]` on their own lines as paragraphs, which is why
// "multi-paragraph" appeared to rise. **Every conclusion above comes from reading the text.**
//
// Exported ONLY so the offline harness tests the real text rather than a copy of it. Nothing else reads it.
export function replyRules(tier: FaithTier): string {
  return `[Reply guidance from the app, not from the person you're talking to. Never mention it, quote it, or refer to it.]
Write in your own voice, contractions and all. Don't mirror the register of this note.
Say something real before you ask anything. Don't let the whole reply be a clarifying question: give them something to hold first, then ask if you still need to.
Let faith be present somewhere in this reply, even when no verse fits: God, prayer, or the real people who can walk with them. Quoting a verse is optional and often unnecessary, so this isn't asking for one. Hook it to what they actually said, and a spiritual sentence that would fit any message at all is worse than none.
When they've told you too little to be specific, the hook is the INVITATION, not a claim: that they can bring this to God as it is, in the words they just used, without having it sorted first. That works on a vague message where a general truth about God wouldn't.
Two exceptions. A short greeting or a thank you needs none of this; answer it briefly and naturally. A how to question about the app just needs the answer.
Keep this reply to ONE short paragraph, three to five sentences. Use a second short paragraph only if they're clearly sharing something heavy and specific and want to be walked through it slowly. Never three paragraphs.${
    tier === 'exploring'
      ? `
This person may not share this faith. Present rather than presume, keep any invitation gentle and optional, and don't state contested specifics about their standing before God as settled fact.`
      : ''
  }
If you're flagging a crisis, ignore everything above and follow your crisis instruction instead.`;
}

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
  { secrets: [ANTHROPIC_API_KEY, REVENUECAT_SECRET_KEY], maxInstances: 10 },
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
      catalog?: unknown;
    };
    const message = typeof data.message === 'string' ? data.message.trim() : '';
    if (!message) {
      throw new HttpsError('invalid-argument', 'Message is required.');
    }
    // Default to the gentler Exploring posture if unspecified (never presume belief).
    const tier: FaithTier = data.tier === 'rooted' ? 'rooted' : 'exploring';
    // Live catalog of reading plans + devotionals, built and sent by the client from the app's own
    // data so it never drifts. Client-provided, so cap the length as a safety bound. Absent on older
    // clients, in which case buildSystemPrompt just omits the recommend rules (unchanged behavior).
    const catalog = typeof data.catalog === 'string' ? data.catalog.slice(0, 6000) : '';

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
      // ⚠️ The rules ride on THIS turn only. `history` comes from the client and carries the person's raw
      // text, so the guidance never accumulates across a conversation and is never paid for twice.
      { role: 'user', content: `${message}\n\n${replyRules(tier)}` },
    ];

    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });

    let replyText = '';
    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: [
          {
            // Shared half: identical for every user, so ONE cached copy serves the whole account.
            // ⚠️ Until 2026-08-05 this was a single block INCLUDING the tier, at 3,987 tokens -- ~109 short
            // of Haiku's 4,096 minimum, so it had never cached once. See PLAN.md 2.3.
            type: 'text',
            text: buildSystemPromptStable(catalog),
            cache_control: { type: 'ephemeral' },
          },
          {
            // Per-user tail (~12 tokens of difference between the two tiers). Deliberately AFTER the cache
            // marker: inside it, this would split the cached copy in two for a rounding error.
            type: 'text',
            text: buildTierBlock(tier),
          },
        ],
        messages,
      });
      // PLAN.md item 0: record what this call actually cost. Fire and forget -- never
      // awaited, never throws, and writes to its own collection so it cannot touch the cap counters.
      recordUsage('halo', uid, MODEL, response.usage);
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
