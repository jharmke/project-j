// utils/companionPitch.ts
//
// Decides, on the CLIENT, whether this message earns Otto the right to mention the Supporter plan.
// Rules and reasoning: SPEC_otto.md -> OPEN ITEMS -> item 4.
//
// ⚠️ WHY THE CLIENT AND NOT OTTO. He has no memory between messages, so he would have to guess how many
// walls this conversation has hit. The app knows exactly, because it is the thing doing the walling.
//
// ⚠️ WHY THE CLIENT AND NOT THE SERVER. "Once per conversation" needs a conversation, and one only exists
// here -- the server sees a single message at a time. The per-ACCOUNT weekly budget is the server's job
// (claimPitchSlot in appCompanion.ts) precisely because it must not be client-trusted. This half only ever
// REQUESTS; the server still has to agree.
import { messageWantsFood } from './companionFood';
import { messageWantsSleep } from './companionSleep';
import { messageWantsBody } from './companionBody';
import { messageWantsJournal } from './companionJournal';
import { messageWantsRecentWorkouts } from './companionWorkouts';

/** Walls before Otto is allowed to say anything. Three means they keep reaching for the paid product. */
export const WALLS_BEFORE_PITCH = 3;

/**
 * Did THIS message hit a data wall? i.e. would it have pulled gated data if they were paying?
 *
 * ⚠️ Deliberately does NOT count the exercise-name list, achievements or journal: those are still sent on
 * the free plan, so nothing was withheld and nothing was walled.
 */
export function messageHitsWall(text: string): boolean {
  return (
    messageWantsFood(text) ||
    messageWantsSleep(text) ||
    messageWantsBody(text) ||
    messageWantsRecentWorkouts(text)
  );
}

/**
 * Did they ASK for more? This is the trigger that has always been allowed, because it is the user saying
 * they want the thing. Kept tight on purpose -- it should catch someone reaching, not someone curious.
 */
export function messageAsksForMore(text: string): boolean {
  const t = (text || '').toLowerCase();
  // ⚠️ "why can't you" IS a reach, added 2026-08-01. Someone pushing back on a limit is a person actively
  // wanting the thing, and it is the most natural moment to explain a better version exists, because they
  // literally asked why. Matches on "you" so "why can't I see my weight" (a how-to question) does NOT fire.
  // The curly apostrophe is deliberate: iOS smart punctuation types ’ not ', so ' alone misses most phones.
  return /\b(give me (the|more)|can you (give|do|build|make) me the (rest|whole|full)|the rest of|full (version|thing|session|plan)|build me|make me a (workout|routine|meal|plan)|unlock|upgrade|how much (is|does)|what does it cost|is there a (paid|pro|premium)|worth paying|subscri|why (ca|wo|do)n['’]?t you|how come you (ca|do)n['’]?t)/.test(t);
}

/**
 * Did they ask for exercises to actually DO? This is what turns the two-movement cap ON for a free user.
 *
 * ⚠️ DELIBERATELY BROADER THAN THE WALL CHECK BELOW. The cap's ceiling applies to every request for
 * movements, including "give me 2" -- but only a request for MORE than two actually withholds anything, and
 * only that counts as a wall. Two questions, two functions.
 *
 * Excluded on purpose: teaching a movement they already named ("how do I do a Romanian deadlift"), comparing
 * two ("incline or flat"), general set/rep knowledge, and anything about their own past training -- that last
 * one is a DATA wall and is already counted by `messageHitsWall`.
 */
export function messageAsksForExercises(text: string): boolean {
  const t = (text || '').toLowerCase();
  if (/\bhow (do|to|would|should) (i|you)\b.*\b(do|perform)\b/.test(t)) return false;
  if (/\bshould i\b.*\bor\b/.test(t)) return false;
  if (/\b(did i|have i|last (week|month)|yesterday|trending|progress(ing)?|how many .*(this|last) week|history)\b/.test(t)) return false;
  if (/\bhow many (sets?|reps?)\b/.test(t)) return false;
  // ⚠️ AN APP HOW-TO IS NOT A PRESCRIPTION. "How do I add custom exercises to my routine" is navigation help,
  // and capping it makes Otto end a perfectly good answer with a limit line that withheld nothing.
  if (/\bhow (do|can) (i|you)\b.*\b(add|create|make|save|edit|delete|remove|find|load|log|track|set up)\b/.test(t)) return false;
  // Opinion and safety questions ("is it bad to work out when I'm tired") are knowledge, not a request.
  // ⚠️ NOT "should i be" -- that killed "what exercises should i be doing", which is squarely a request.
  if (/\b(is it (bad|ok|okay|safe|fine|worth)|do i need to)\b/.test(t)) return false;

  // ⚠️ FOOD BEATS TRAINING when both appear. "What should I eat before a workout" is a nutrition question
  // that happens to contain the word workout, and capping it makes Otto quote a limit that withheld nothing.
  if (/\b(eat|eating|ate|food|meal|snack|carbs|calories|drink)\b/.test(t)) return false;

  const thing = /\b(workouts?|routines?|sessions?|exercises?|movements?|lifts?|circuits?|splits?|programs?|training)\b/;
  // ⚠️ A WARMUP QUESTION IS NOT A REQUEST FOR A SESSION. "Give me a warmup for chest day" used to match on
  // "chest day" and pick up the cap, so Otto ended a perfectly complete warmup answer with the limit line --
  // pointing at a limit that had withheld nothing. Warmups are uncapped by design (Justin, 2026-08-01), so
  // unless they ALSO asked for the workout itself, this is not a prescription ask.
  if (/\bwarm ?ups?\b|\bwarming up\b|\bstretch(es|ing)?\b|\bmobility\b/.test(t) && !thing.test(t)) return false;
  // ⚠️ THE CURLY APOSTROPHE IS LOAD-BEARING. iOS smart punctuation types ’ not ', so a straight-quote-only
  // pattern misses almost every real iPhone message. FOUND ON DEVICE 2026-08-04: Justin, on the free plan,
  // typed "What's a good chest workout?" and got SIX movements and no limit line, because this regex did not
  // match, so the cap was never attached to the message at all. The cap itself was fine the whole time.
  // The same fix was already applied to `messageAsksForMore` above for exactly this reason; this line was
  // missed. Any new pattern with an apostrophe needs ['’] or it will work in testing and fail on a phone.
  const askVerb = /\b(give|gimme|build|make|list|show|suggest|recommend|need|want|plan|got any|any good|any ideas?|what['’]?s? a good|what should i|what can i|what do i|hit me|help me|create|put together|construct)\b/;

  // ⚠️ A THING-WORD ALONE IS NOW ENOUGH, and this is the big change. The old rule needed a thing-word AND an
  // ask-verb TOGETHER, which caught 13 of 60 realistic phrasings when measured 2026-08-04: "gimme a routine",
  // "workout please", "give me abs", "what should my workout be" and forty others all sailed past, so the
  // two-movement cap almost never fired in real use. That is the paid feature being given away silently.
  // ⚠️ ERRING TOWARD FIRING IS CHEAP, and that asymmetry is the whole justification: a false positive costs
  // a few tokens and Otto names no movements anyway, while the limit LINE is decided separately by
  // workoutAskWantsMoreThanTwo. A false NEGATIVE hands a free user an uncapped session.
  if (thing.test(t)) return true;

  // Body part with any request shape around it, or on its own ("shoulders", "arms and chest").
  const bodyPart = /\b(push|pull|legs?|chest|back|shoulders?|arms?|bis|biceps?|tris|triceps?|core|abs?|glutes?|quads?|hamstrings?|calves|cardio|full body|upper body|lower body)\b/;
  if (bodyPart.test(t) && (askVerb.test(t) || /\b(day|today|now|please|pls|ideas?)\b/.test(t) || t.trim().split(/\s+/).length <= 3)) return true;

  if (/\b(train me|work me out|what should i (train|do|hit)|ready to (train|lift|work ?out))\b/.test(t)) return true;
  return false;
}

/**
 * Did the cap actually CUT something? Only then is it a wall.
 *
 * Someone who asks for two and gets two was not limited, so it must not count toward the three walls that
 * earn a pitch -- and Otto must not tell them about a limit they never hit. See SPEC_otto.md, WHAT COUNTS AS
 * A WORKOUT WALL.
 */
export function workoutAskWantsMoreThanTwo(text: string): boolean {
  const t = (text || '').toLowerCase();
  if (/\b(1|2|one|two|a couple(?: of)?|a single|a)\b[^.?!]{0,24}?\b(exercises?|movements?|lifts?)\b/.test(t)) return false;
  return true;
}

/**
 * ⚠️ NEVER PITCH ON A FAITH MESSAGE, whatever the wall count says. Faith is never paywalled, so a prayer or
 * journal question cannot itself be a wall -- but the counter could already be at three from earlier in the
 * conversation and land a sales line on top of someone asking about their prayer list. (Crisis needs no
 * check here: the server short-circuits before Otto is called at all.)
 */
export function messageBlocksPitch(text: string): boolean {
  return messageWantsJournal(text);
}
