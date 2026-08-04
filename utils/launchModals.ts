// utils/launchModals.ts
//
// ONE thing gets the moment after launch. Everything else stands down and tries again next time.
//
// ⚠️ THIS IS NOT A QUEUE FRAMEWORK, and it must not become one. Nothing is held for later in this session,
// nothing chains, nothing re-fires when the winner is dismissed. A user who opens the app gets at most one
// interruption, and the loser simply asks again on the next launch. That is the whole design.
//
// ⚠️ WHY IT EXISTS AT ALL -- this is not tidiness, it is a real dead-screen bug. Five things want this
// moment (summaries, the free-week step-down, a real subscription ending, the meta tutorial, and Rate Us
// riding in on an achievement). They used to avoid each other purely by firing at different times. When two
// DID land together, the second modal mounted while the first was still presented, and on iOS a modal
// mounted in that state never receives its presented event -- so it never animated in, never became
// visible, and never dismissed, because dismissal only happens through its own buttons. Home sat underneath
// an invisible open modal and could not be tapped until the app was force quit. Reproduced 2026-08-04 with
// a day summary and the step-down notice due on the same launch, which is an ordinary thing to happen to a
// real user the morning their free week runs out.
//
// One winner per launch means a second launch modal is never mounted on top of a live one, so the event
// they all depend on always fires. The bug cannot occur by construction rather than by luck.
import { runAfterLaunch } from './launchSplashGate';

/**
 * Lower number wins. Justin's order (roadmap, and confirmed 2026-08-04).
 *
 * ⚠️ THE TUTORIAL IS LAST BY REASONING, NOT BY VALUE. It only ever fires for somebody who has not seen it,
 * i.e. a brand new account -- who has no summaries yet and cannot have finished a free week. In practice it
 * competes with nothing, so putting it below the two that carry real news costs nothing.
 * Adding a sixth thing later means picking a number here, not writing new rules.
 */
export const LAUNCH_RANK = {
  summary: 1,   // day / week / month
  stepDown: 2,  // free week ended, or a real subscription ended
  tutorial: 3,  // the meta tutorial
  rateUs: 4,    // reserved -- see the note at the bottom of this file
} as const;

/**
 * How long to collect competing requests before choosing. Also the "let Home paint first" delay every one
 * of these used to hold privately (800ms in two places, 1500ms in a third, which is exactly how they
 * drifted). Measured from the FIRST request, so a single lone pop-up is not slowed by the others' absence.
 */
const DECIDE_AFTER_MS = 800;

interface Request { rank: number; show: () => void }

let decided = false;
const pending: Request[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

function decide(): void {
  timer = null;
  decided = true;
  // Sort is stable, so two things at the same rank keep the order they arrived in.
  const winner = pending.slice().sort((a, b) => a.rank - b.rank)[0];
  pending.length = 0;
  if (winner) { try { winner.show(); } catch {} }
}

/**
 * Ask for the launch moment. `show` runs only if this request wins.
 *
 * ⚠️ THE CALLER MUST DO NOTHING IRREVERSIBLE UNTIL `show` RUNS. Stamping a once-per-day gate, or a
 * once-ever "we told them" flag, belongs INSIDE the callback. A request that loses never showed anything,
 * so it must leave no trace behind -- otherwise standing down silently burns the thing it was going to say.
 */
export function requestLaunchModal(rank: number, show: () => void): void {
  runAfterLaunch(() => {
    // Slot already spent this launch. Stand down; whatever this was will ask again next time.
    if (decided) return;
    pending.push({ rank, show });
    if (!timer) timer = setTimeout(decide, DECIDE_AFTER_MS);
  });
}

/** Has this launch's one slot already been spent? */
export function launchModalSlotSpent(): boolean {
  return decided;
}


// ⚠️ RATE US IS NOT ROUTED THROUGH HERE, and its rank above is reserved rather than used. It is not a
// launch modal: every one of its triggers is a physical user action (logging water or protein past the
// goal, saving or editing a weight, finishing a workout or a challenge, a Bible/devotional/journal/
// gratitude entry), and none of those are possible while a modal is on screen. Apple health data does not
// trigger it at all. TRACED CALL SITE BY CALL SITE 2026-08-04 -- the collision is unreachable, a guard was
// written and then removed rather than carried for a problem that cannot occur. Do not re-add one without
// finding a trigger that fires with no user action behind it.
