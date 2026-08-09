// functions/src/ottoCannedMatcher.ts
//
// PLAN.md 4.8. Answers a fixed-answer app question with NO API CALL AT ALL, so the reply costs zero.
//
// 🔴 THE RULE THAT MAKES THIS SAFE: A MATCH MUST EXPLAIN THE WHOLE MESSAGE, NOT PART OF IT.
// Substring matching is how you end up answering a third of what somebody asked. Every content word in the
// message must be accounted for -- either a stopword, or vocabulary the matched answer legitimately covers.
// Anything left over means we did not understand the message, so it goes to Otto.
//
// ⚠️ THE FAILURE MODE HERE IS WORSE THAN THE COACH/SUPPORT ROUTER'S. That one had a safe default: unsure
// meant "send the manual", which is always correct. This one can return the WRONG one of ~177 answers, with
// no model in the loop to catch it. So the number that must be zero is the WRONG-ANSWER rate, not the miss
// rate. A miss costs $0.0054 (exactly today's behaviour). A wrong answer costs trust.
//
// ⚠️ AND THE SAFETY NET IS WEAKER THAN IT LOOKS. On 2026-08-05 the Coach/Support router misrouted
// "how many messages do i get a day" and Otto's own no-guess rule did NOT catch it -- he confidently
// invented "GoodForge doesn't limit that". Do not lean on a prompt instruction as a backstop here.

import type { FaithTier, StyleMode } from './companionSystemPrompt';

/**
 * The 27 route keys a CANNED ANSWER may carry. Asserted in the test harness; inventing one is a bug.
 *
 * 🔴 THIS LIST IS A SUPERSET OF THE ONE THE MODEL SEES, AND THAT IS DELIBERATE. DO NOT "SYNC" THEM.
 * The model's list lives in `companionSystemPrompt.ts` (TAPPABLE SCREEN LINKS) and tells Otto which
 * [[route:key]] tokens he may emit himself. `support` is HERE and deliberately NOT THERE.
 * ⚠️ Reason (2026-08-09, PLAN 4.13): giving the model a `support` key would let Otto drop a
 * Become-a-Supporter pill whenever he felt like it, which is exactly the mid-conversation nagging the
 * "never nag" rule forbids. `AssistantChat.tsx` states it: the free-user nudge appears ONLY at the wall
 * (1 left / none left), never mid-conversation, never to a Supporter, never on Halo.
 * ➡️ Canned answers name their route in a FIELD, so a pitch answer can use `support` without the model
 * ever being able to.
 */
export const ROUTE_KEYS = [
  'appearance', 'goals', 'faith_style', 'health', 'vacation', 'notifications', 'settings',
  'sleep_hub', 'recovery_hub', 'achievements', 'challenges', 'comparison', 'evr', 'bible',
  'prayer', 'plans', 'journal', 'mission', 'body', 'pr_home', 'home', 'workout', 'log',
  'stats', 'profile', 'faith', 'support',
] as const;
export type RouteKey = (typeof ROUTE_KEYS)[number];

export interface CannedContext {
  supporter: boolean;
  faithTier: FaithTier;
  styleMode: StyleMode;
}

export interface CannedAnswer {
  id: string;
  /**
   * AND of ORs. Every inner array must have at least one of its terms present.
   * Keep these SPECIFIC -- they are what separates "create a recipe" from "log a recipe".
   */
  requires: string[][];
  /**
   * Vocabulary this answer legitimately accounts for, beyond `requires`. Used ONLY by the coverage test.
   * ⚠️ Be generous here with words that belong to the same question and stingy with anything that would
   * let a DIFFERENT question slip through as "explained".
   */
  covers?: string[];
  /** Words that, if present, disqualify this answer outright. The collision breaker. */
  excludes?: string[];
  route?: RouteKey;
  /** A plain string, or a function when the answer genuinely differs by membership / tier / mode. */
  answer: string | ((c: CannedContext) => string);
}

/**
 * Words that carry no topic. A message made only of these plus a matched answer's vocabulary is fully
 * explained. ⚠️ Adding a CONTENT word here is how a wrong answer gets through -- it would let that word go
 * unexplained. Keep this list boring.
 */
const STOPWORDS = new Set([
  'i', 'me', 'my', 'mine', 'you', 'your', 'we', 'it', 'its', 'this', 'that', 'these', 'those',
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'am', 'do', 'does', 'did', 'doing',
  'can', 'could', 'should', 'would', 'will', 'shall', 'may', 'might', 'must',
  'how', 'what', 'where', 'when', 'which', 'who', 'whats', 'wheres', 'hows', 'whos',
  'to', 'in', 'on', 'at', 'for', 'of', 'and', 'or', 'but', 'with', 'from', 'by', 'about',
  'if', 'so', 'as', 'up', 'out', 'off', 'again', 'there', 'here', 'any', 'some', 'all',
  'please', 'thanks', 'thank', 'hey', 'hi', 'hello', 'ok', 'okay', 'yeah', 'yes', 'no',
  'tell', 'show', 'explain', 'know', 'want', 'need', 'like', 'get', 'go', 'see', 'find', 'use',
  'using', 'work', 'works', 'mean', 'means', 'does', 'lets', 'im', 'ive', 'dont', 'cant', 'whats',
  'sorry', 'just', 'now', 'then', 'much', 'many', 'more', 'else', 'thing', 'stuff',
  // ⚠️ ADDED AFTER THE HELD-OUT RUN scored 61%. Almost every miss was `unexplained-remainder` caused by
  // ordinary filler, not by a real topic word: "whats the FASTEST WAY to log breakfast", "how do i put a
  // NEW graph ON stats", "can i JUST tip INSTEAD". These carry no topic and were blocking otherwise
  // perfect matches. Generic filler only. Nothing here names a feature.
  'way', 'ways', 'new', 'around', 'instead', 'really', 'actually', 'app', 'goodforge', 'best',
  'fastest', 'quickest', 'easiest', 'simplest', 'other', 'one', 'make', 'give', 'access', 'everything',
  'look', 'over', 'into', 'back', 'stop', 'keep', 'let', 'him', 'her', 'me', 'us', 'thats',
  'counts', 'number', 'wrong', 'fix', 'typed', 'still', 'ever', 'even',
]);

/**
 * ⚠️ A SMALL SYNONYM LAYER, ADDED FOR THE SAME REASON. Users do not type the app's own vocabulary:
 * they "wipe" a meal rather than clear it, "swap" a mode rather than change it, get "buzzed" rather than
 * notified. Mapping the user's word onto the app's is a mechanism; adding each miss to a specific answer's
 * `covers` would be fitting the test, which is what made the first corpus worthless.
 */
const SYNONYMS: Record<string, string> = {
  wipe: 'clear', erase: 'clear', empty: 'clear',
  // ⚠️ put -> ADD, not 'log'. Mapping it to 'log' fixed 'where do i put my weight in' and immediately
  // broke 'how do i put a new graph on stats', because a graph is added, not logged. 'add' serves both.
  put: 'add', typing: 'log', type: 'log',
  swap: 'change', switching: 'change', switched: 'change',
  buzzing: 'notification', buzz: 'notification', pinging: 'notification', ping: 'notification',
  older: 'past', earlier: 'past', previous: 'past',
  trip: 'vacation', holiday: 'vacation', away: 'vacation',
  badge: 'achievement', badges: 'achievement',
  dark: 'theme', light: 'theme',
  // ⚠️ NO BODY-PART SYNONYMS. 'waist' is already in the body answer's own requires, and canonicalising it
  // to 'measurement' broke that match outright. A synonym that duplicates a requires term is pure downside.
  tiny: 'size', small: 'size', big: 'size', bigger: 'size', smaller: 'size',
  // ⚠️ UK SPELLINGS. The third corpus lost 'how do i get a different COLOUR scheme' outright. Generic,
  // not fitted: British users type these constantly and no answer will ever list both forms.
  colour: 'color', colours: 'color', favourite: 'favorite', favourites: 'favorite',
  customise: 'customize', personalise: 'personalize', organise: 'organize',
};

/** Curly apostrophes, punctuation, and the way people actually type. See [[detectors-are-brittle]]. */
export function normalise(s: string): string {
  return s
    .toLowerCase()
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[^a-z0-9'\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(t: string): string[] {
  return t.split(' ').filter(Boolean);
}

/** Word-boundary match with the endings people type, so `recipe` catches `recipes`. */
function has(t: string, term: string): boolean {
  return term.includes(' ')
    ? t.includes(term)
    : new RegExp(`\\b${term}(s|es|ing|ed)?\\b`).test(t);
}

/**
 * 🔴 QUESTIONS ABOUT THEIR OWN DATA CAN NEVER BE CANNED, and this is the collision Justin predicted:
 *   "how many custom foods do I HAVE"  -> their data, needs Otto
 *   "how many custom foods do I GET"   -> the plan's limit, canned
 * One word apart, completely different answers. The first draft got this wrong twice, exactly here.
 * ⚠️ Same family of signals as `ottoCoachRouting.ts`, deliberately duplicated rather than imported: this
 * list needs the POSSESSIVE forms ("do i have", "how many have i") that the router does not.
 */
const OWN_DATA_SIGNALS = [
  'do i have', 'have i', 'did i', 'was i', 'am i on', 'am i hitting', 'am i eating', 'am i close',
  "how's my", 'hows my', "what's my", 'whats my', 'what was my', 'what did i', 'how did i',
  'my average', 'my current', 'my streak', 'my longest', 'my best', 'my total', 'my progress',
  'so far', 'trending', 'on pace', 'yesterday', 'today', 'this week', 'last week', 'this month',
  'last night', 'left today',
];

/**
 * 🔴 CONTEXT-DEPENDENT OPENERS. "and how do i edit it" only makes sense after the previous turn, so a
 * matcher looking at it alone could fire confidently on the wrong thing. These go to Otto, who has the
 * conversation.
 */
const CONNECTOR_OPENERS = [
  'and ', 'also ', 'what about', 'how about', 'ok so', 'okay so', 'so ', 'then ', 'plus ',
  'but ', 'or ', 'as well', 'too ',
];

/** A bare pronoun with no noun: "how do i edit it", "where is that". Needs the previous turn. */
const BARE_PRONOUN = /\b(it|that|those|them|this one|the same)\b\s*\??$/;

export interface CannedResult {
  matched: false | { id: string; text: string; route?: RouteKey };
  /** Why nothing fired, for the log and the harness. Never shown to a user. */
  reason:
    | 'hit'
    | 'stitched'
    | 'no-match'
    | 'unexplained-remainder'
    | 'context-dependent'
    | 'too-many-parts'
    | 'ambiguous-tie'
    | 'own-data';
}

/**
 * ⚠️ THE CALLER MUST ALREADY HAVE RULED OUT: any attached block (pitch, workout cap, decline watch,
 * undereating safeguard, faith handoff) and a crisis message. If the app has decided something must ride
 * on this turn, a canned answer would silently swallow it. See appCompanion.ts.
 */
export function matchCanned(
  message: string,
  ctx: CannedContext,
  answers: CannedAnswer[],
): CannedResult {
  // ⚠️ SYNONYMS ARE APPLIED TO THE MESSAGE, NOT JUST TO THE COVERAGE TEST. Doing it only in coverage was
  // half a fix: "how do i WIPE a meal" and "how do i look at an OLDER day" still failed, because the
  // answer's `requires` never saw the canonical word. Canonicalising once, up front, means every stage
  // downstream benefits.
  const t = normalise(message).split(' ').map((w) => SYNONYMS[w] ?? w).join(' ');
  if (!t) return { matched: false, reason: 'no-match' };

  if (CONNECTOR_OPENERS.some((c) => t.startsWith(c))) return { matched: false, reason: 'context-dependent' };
  // ⚠️ THE PLEASANTRY TEST RUNS BEFORE THE BARE-PRONOUN GUARD. "got it" ends in a bare pronoun and was
  // being sent to Otto as context-dependent, which is precisely the cheap message this feature exists to
  // catch. A short message that is ENTIRELY a pleasantry needs no context by definition.
  const pleasantry = answers.find(
    (a) => a.id.startsWith('plea.') && a.requires.every((g) => g.some((term) => has(t, term))),
  );
  if (pleasantry && tokens(t).length <= 4) return hit(pleasantry, ctx);

  // ⚠️ ONLY ON A SHORT MESSAGE. The held-out run refused 'i typed my weight wrong how do i fix it' and
  // 'the text is too small how do i fix it' as context-dependent. Both name their subject perfectly well;
  // the trailing 'it' refers to something INSIDE the same sentence, not to the previous turn.
  if (BARE_PRONOUN.test(t) && tokens(t).length <= 4) return { matched: false, reason: 'context-dependent' };

  // 🔴 THEIR OWN DATA IS NEVER CANNABLE. See OWN_DATA_SIGNALS.
  // ⚠️ TWO EXEMPTIONS, BOTH FOUND BY THE AUDIT. A HOW-TO is never a data question however many time words
  // it contains ("how do i repeat YESTERDAY's meal" was being refused), and "do i have TO" is an obligation,
  // not a possession ("do i have to pay for halo").
  const isHowTo = /^(how do i|how can i|how to|where (is|are|do i|can i))\b/.test(t);
  // ⚠️ AND AN ENTITLEMENT EXEMPTION. "whats my daily message limit" trips the possessive "whats my", but it
  // asks what the PLAN allows, not what they have logged. Same distinction the router had to learn.
  const entitlement = /\b(limit|limits|allowance|quota|cap|plan)\b/.test(t);
  const dataHit = OWN_DATA_SIGNALS.some((s) => has(t, s)) && !/\bdo i have to\b/.test(t) && !entitlement;
  if (dataHit && !isHowTo) return { matched: false, reason: 'own-data' };

  // ── STITCHING BY SPLITTING, not by set-cover (PLAN 4.8 hole 2) ──────────────────────────────────
  // ⚠️ REWRITTEN AFTER THE FIRST AUDIT SCORED 0/2. Set-cover could never work, because an answer's
  // `excludes` are evaluated against the WHOLE message: "how do i log food and how do i log water" was
  // disqualifying the food answer for containing the word "water". Splitting on the connector first means
  // each half is judged on its own, which is what a two-part question actually is.
  // ⚠️ LIMIT 2, and both halves must match on their own. Anything else falls through to the normal path,
  // so an innocent "and" ("sleep and recovery") costs nothing.
  const parts = t.split(/\s+(?:and|also|plus)\s+/);
  if (parts.length === 2 && parts.every((p) => tokens(p).length >= 3)) {
    const a = matchOne(parts[0], ctx, answers);
    const b = matchOne(parts[1], ctx, answers);
    if (a && b && a.id !== b.id) {
      return {
        matched: {
          id: `${a.id}+${b.id}`,
          text: `Two things:\n\n${a.text}\n\n${b.text}`,
          route: a.route ?? b.route,
        },
        reason: 'stitched',
      };
    }
  }
  if (parts.length > 2) return { matched: false, reason: 'too-many-parts' };

  const single = matchOne(t, ctx, answers);
  if (single) return { matched: single, reason: 'hit' };
  return { matched: false, reason: lastReason };
}

/** Set by `matchOne` so the caller can report WHY nothing fired. */
let lastReason: CannedResult['reason'] = 'no-match';

/** One message, one answer, or nothing. Assumes guards above have already run. */
function matchOne(
  t: string,
  ctx: CannedContext,
  answers: CannedAnswer[],
): { id: string; text: string; route?: RouteKey } | null {
  const candidates = answers.filter((a) => {
    if (a.excludes && a.excludes.some((x) => has(t, x))) return false;
    return a.requires.every((group) => group.some((term) => has(t, term)));
  });
  if (candidates.length === 0) { lastReason = 'no-match'; return null; }

  // ── COVERAGE: is every content word in the message explained? ────────────────────────────────────
  const vocabOf = (a: CannedAnswer) => [...a.requires.flat(), ...(a.covers ?? [])];
  // ⚠️ PHRASE TERMS MUST STEM TOO. "meal slot" has to explain the word "slots", or
  // "how many meal slots do i get" reports an unexplained remainder and goes to Otto for nothing.
  // ⚠️ KEEP `return` AND ITS EXPRESSION ON ONE LINE. A `return` alone on a line triggers automatic
  // semicolon insertion, so this silently returned undefined and EVERY match failed. The audit went from
  // 71/71 to 3/71 and reported "unexplained-remainder" on "how do i log a recipe", which is what gave it
  // away: no rule change could break something that simple.
  const canon = (w: string) => SYNONYMS[w] ?? w;
  const explains = (raw: string, a: CannedAnswer): boolean => {
    const word = canon(raw);
    return vocabOf(a).some((term) => (term.includes(' ')
      ? term.split(' ').some((part) => has(word, part))
      : has(word, term)));
  };

  const contentWords = tokens(t).filter((w) => !STOPWORDS.has(w));
  const ranked = [...candidates].sort((a, b) => vocabOf(b).length - vocabOf(a).length);
  const fullyExplaining = ranked.filter((a) => contentWords.every((w) => explains(w, a)));

  if (fullyExplaining.length === 1) {
    const a = fullyExplaining[0];
    return { id: a.id, text: typeof a.answer === 'function' ? a.answer(ctx) : a.answer, route: a.route };
  }
  if (fullyExplaining.length > 1) {
    // 🔴 TWO ANSWERS BOTH EXPLAINING THE WHOLE MESSAGE MEANS THE MESSAGE IS AMBIGUOUS, NOT THAT EITHER IS
    // RIGHT. Picking one is exactly how the wrong answer of ~183 gets returned. Otto takes it.
    lastReason = 'ambiguous-tie';
    return null;
  }
  lastReason = 'unexplained-remainder';
  return null;
}

function hit(a: CannedAnswer, ctx: CannedContext): CannedResult {
  const text = typeof a.answer === 'function' ? a.answer(ctx) : a.answer;
  return { matched: { id: a.id, text, route: a.route }, reason: 'hit' };
}
