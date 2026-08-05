// utils/companionFaith.ts
//
// Decides whether a message to Otto is a FAITH CONVERSATION that belongs to Halo, rather than an APP
// question that belongs to Otto. See PLAN.md item 8.
//
// ⚠️ WHY THIS EXISTS. Otto's system prompt already says "send genuine faith conversation to Halo" and he
// ignores it. Found on device 2026-08-05: a Not Right Now user asked "is it okay to pray about lust?" and
// got a full pastoral answer, no handoff, no mention that Halo exists. That is a violation for EVERY tier,
// not just Not Right Now -- Otto was never meant to counsel anyone about prayer.
// ⚠️ AND A SYSTEM-PROMPT RULE WILL NOT FIX IT. Measured three times on this app: the pitch fired 0/10 from
// the system prompt and 10/10 appended to the user's message; the decline tag went 3/6 to 11/11; the
// exercise cap leaked through six wordings. A per-message directive has to ride on the user turn.
// See [[feedback_measure_dont_ask_justin]].
//
// ⚠️⚠️ THE ONE THING THIS MUST NOT DO IS BLOCK APP HELP. Faith features live all over the app, including
// the Home tab (gratitude card, faith hub card with prayer, verse of the day and reading plans). "Where is
// the gratitude card" and "why isn't my verse showing" are APP questions and Otto answers them. A detector
// that matched the words prayer / verse / gratitude would catch those too and Otto would start refusing to
// explain his own app, which is WORSE than the problem being fixed. Justin's call, and the right one.

/**
 * ⚠️ AN APP QUESTION NEEDS BOTH A SHAPE AND A TARGET, and that structure was arrived at by measuring, not
 * by design. Two earlier drafts failed in opposite directions:
 *   - Draft 1 matched feature NAMES with a trailing-space bug, so "how do i log a prayer" was never
 *     recognised as an app question. 19 false alarms out of 64.
 *   - Draft 2 matched a bare "how" or "where" anywhere, which fixed those but then swallowed genuine faith
 *     questions containing either word: "how do you even pray", "is it a sin to care about how i look",
 *     "where's that in the bible". 6 false alarms, but 18 faith misses, several of them obvious.
 * Requiring a shape AND an app-ish target separates them: "how do i stay humble" has the shape and no
 * target, so it is faith; "how do i add a prayer request" has both, so it is the app.
 */
const APP_SHAPE = new RegExp(
  [
    String.raw`\bhow\b`,
    String.raw`\bwhere'?s?\b`,
    String.raw`\b(can'?t|cannot|couldn'?t) (find|see|get|figure|work out)\b`,
    String.raw`\b(is\s?n'?t|are\s?n'?t|not|doesn'?t|won'?t|wont) (showing|working|there|appearing|loading|show|work|appear|load|open)\b`,
    String.raw`\bdisappear(ed|ing)?\b`,
    String.raw`\b(add|log|open|find|enable|disable|hide|unhide|move|reorder|rearrange|edit|remove|delete|turn|turning|turned|set up|put)\b`,
    String.raw`\b(show me|walk me through|tutorial|how-to)\b`,
    String.raw`\bhelp\s*$`,
  ].join('|'),
);

/**
 * Things in the app a question can be ABOUT. A faith word only counts as a target in its FEATURE form:
 * "bible reader" is a screen, "the bible" is scripture. That distinction is what keeps
 * "where's that in the bible" a faith question while "where's the bible reader" is an app one.
 */
const APP_TARGET =
  /\b(prayer request|prayer list|prayers?|verse of the day|verse card|verses?|reading plans?|devotionals?|bible reader|bible tab|bible reading|scripture reader|gratitude|faith (features?|stuff|journey|tab|card|hub)|journal)\b/;

/** UI nouns strong enough to mark a message as an app question on their own. */
const UI_NOUN = /\b(card|button|screen|tab|icon|widget|layout|toggle|settings?|home screen|app feature|feature)\b/;

/**
 * Faith TOPICS. Deliberately explicit religious vocabulary only.
 *
 * ⚠️ NOT INCLUDED ON PURPOSE: "blessed", "grateful", "gratitude", "journal", "reflect", "thankful",
 * "meaning", "purpose", "believe" on its own. Those turn up constantly in ordinary wellness talk
 * ("blessed to have hit my goal", "I believe I can get to 200") and firing on them hands Otto's own
 * territory to Halo. Narrow is the right bias: a miss costs one warm answer, a false positive costs app help.
 */
const FAITH_TOPIC =
  /\b(pray|prays|prayed|prayer|prayers|praying|god|gods|god'?s|jesus|christ|christian|christianity|bible|biblical|scripture|scriptures|gospel|gospels|psalm|psalms|verse|verses|sermon|church|churches|pastor|worship|faith|faithful|sin|sins|sinful|sinning|repent|repentance|forgiveness|salvation|heaven|hell|holy spirit|the lord|almighty|devotional|devotionals|theology|theological|doctrine|blasphemy|spiritual|spiritually|temple|idolatry|idoliz|idolis)\b/;

/**
 * "Praying" used as ordinary emphasis rather than religion: "praying i hit 180", "praying for results".
 * Measured: the only false alarms across 77 ordinary wellness messages were this exact shape.
 */
const CASUAL_PRAYING = /\bpraying (that )?(i|we|for|this|it|my)\b/;

/**
 * True when this message is faith CONVERSATION and should be handed to Halo instead of answered by Otto.
 */
export function messageWantsFaithHandoff(text: string): boolean {
  const t = (text || '').toLowerCase();
  if (!FAITH_TOPIC.test(t)) return false;
  // "praying i hit my goal" is not a faith question.
  if (CASUAL_PRAYING.test(t) && !/\b(god|jesus|christ|bible|scripture|church)\b/.test(t)) return false;
  // A UI noun alone is enough ("my verse card disappeared"). Otherwise an app question needs both a
  // question shape and something in the app to be about.
  if (UI_NOUN.test(t)) return false;
  if (APP_SHAPE.test(t) && APP_TARGET.test(t)) return false;
  return true;
}
