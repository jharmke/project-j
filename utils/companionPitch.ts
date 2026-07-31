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
  return /\b(give me (the|more)|can you (give|do|build|make) me the (rest|whole|full)|the rest of|full (version|thing|session|plan)|build me|make me a (workout|routine|meal|plan)|unlock|upgrade|how much (is|does)|what does it cost|is there a (paid|pro|premium)|worth paying|subscri)/.test(t);
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
