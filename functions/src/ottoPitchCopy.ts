// functions/src/ottoPitchCopy.ts
//
// PLAN.md 4.13. What Otto says to a FREE user when his coaching answer would have cost an AI call.
// Approved copy and the full reasoning: SPEC_otto.md, "SUPPORTER-POINTED REPLY COPY".
//
// 🔴 THE SIX VOICE RULES THESE WERE WRITTEN UNDER. ~25 drafts were rejected finding them. Read them before
// adding or editing a line here:
//  1. FIRST PERSON ABOUT OTTO, never third person about a tier. "where I can answer" survived;
//     "Supporters get a real answer" was cut every time.
//  2. NEVER EXPLAIN THE HEDGE. "I am not sure, and I do not want to guess" reads as an AI tic.
//  3. BANNED: intensifiers ("genuinely"), folksy ("that one stumps me"), self-aware machine talk
//     ("I do not have a prepared answer"), Otto narrating his feelings ("and I do not love it"), metaphors.
//  4. "NEARLY" IS JUSTIN'S WORD AND IT STAYS. Even a Supporter's Otto has limits.
//  5. THE BENEFIT MUST BE CONCRETE. Vague benefits were rejected every time.
//  6. NO DASHES OF ANY KIND.
//
// 🔘 EVERY ONE OF THESE CARRIES THE BUTTON. "No exceptions." (Justin, 2026-08-08.) The caller appends
// [[route:support]], which the client renders as "See what Supporters get".

/** CASE B: we have no answer for this at all. Opener + closer, 9 combinations. */
const OPENERS = [
  'Honestly, I am not sure on that one.',
  'Good question, and I am not sure.',
  'I am not certain on that one.',
];

const CLOSERS = [
  'With the Supporter plan I can take on nearly anything you ask.',
  'With the Supporter plan I can help with nearly anything you want to know.',
  'The Supporter plan is where I can answer nearly whatever you bring me.',
];

/**
 * CASE A: the question needed THEIR OWN numbers, which a free Otto cannot see.
 *
 * ⚠️ CATEGORY-NEUTRAL ON PURPOSE. `SPEC_otto.md` carries four category sets (nutrition, training, sleep,
 * weight) written as TAILS that sit after a real answer. Serving the right category tail requires mapping a
 * personal question onto the matching general answer ("am i eating enough protein" -> the protein answer),
 * which is not built. Until it is, these three work for any topic because none of them names one.
 * ➡️ Category tails and the answer-then-tail shape are the follow-up. Tracked in PLAN 4.13.
 */
const OWN_DATA = [
  'What I cannot do on the free plan is look at what you have actually logged. That comes with the Supporter membership.',
  'Reading your own numbers back to you is part of the Supporter plan, and that is where I could tell you where you actually land.',
  'Whether that is true for you specifically is something I could answer on the Supporter plan, where I can read your own numbers.',
];

/**
 * Deterministic pick, so the same question always yields the same reply.
 * ⚠️ NOT `Math.random()`. A random line makes a bug impossible to reproduce and makes the harness useless.
 * ⚠️ NOT `pickVariant` from `utils/smartTipsCopy.ts` either: that rotates off a stored lastIndex, and there
 * is nowhere server-side to keep one per user without a write on every miss.
 */
function pick<T>(pool: T[], seed: string): T {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return pool[h % pool.length];
}

export type PitchKind = 'no-answer' | 'own-data';

/**
 * The reply a free user gets instead of an AI coaching answer.
 * `seed` should be the user's message, so the same question reads the same way twice.
 */
export function buildPitchReply(kind: PitchKind, seed: string): string {
  if (kind === 'own-data') return pick(OWN_DATA, seed);
  // Opener and closer are seeded separately so the 3x3 grid is actually reachable.
  return `${pick(OPENERS, seed)} ${pick(CLOSERS, seed + '.')}`;
}

/** Exported for the harness: every line that can ever be shown, for the dash and voice assertions. */
export const ALL_PITCH_LINES = [
  ...OPENERS.flatMap((o) => CLOSERS.map((c) => `${o} ${c}`)),
  ...OWN_DATA,
];
