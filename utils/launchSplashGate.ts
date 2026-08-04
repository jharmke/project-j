// Cross-route signal for whether the app has finished launching.
//
// Several things want the first moment after a cold launch -- the Day/Week/Month summary pop-up, the
// first-week step-down notice, the meta tutorial -- and they live on the Home tab, a separate route that
// cannot read the root layout's state directly. This module is how they wait.
//
// ⚠️⚠️ THE DEFAULT IS "NOT FINISHED", AND THAT IS THE WHOLE POINT. This used to ask the opposite question,
// "is the splash on screen RIGHT NOW", starting at false. The flag was only switched on partway through
// launch, after auth and the restore gate had resolved -- but the Home tab mounts and starts its own timer
// long before that. On a slow cold start the timer won, asked "is the splash up?", was told NO because the
// flag had not been set yet, and showed itself. The splash then appeared, and since iOS gives every Modal
// its own window, the pop-up sat ON TOP of the cinematic.
//
// That is the bug Justin kept hitting, and it is why two previous attempts at re-ordering the timing did
// not fix it: the timing was never the problem, the flag being late was. Asking "has launch FINISHED",
// starting at false, means unknown resolves to WAIT instead of GO. The race cannot be lost, only delayed.
//
// Celebrations and the achievement toast do not use this -- their renderers take a `hold` prop instead.

let launchFinished = false;
const waiting: Array<() => void> = [];

function flush(): void {
  waiting.splice(0).forEach(cb => { try { cb(); } catch {} });
}

/**
 * ⚠️ SAFETY NET, ARMED AT MODULE LOAD rather than when the splash starts. Nothing may wait forever: if a
 * launch path is ever added that never calls `markLaunchFinished`, a summary that silently never appears is
 * a worse failure than one that appears a little late.
 *
 * Deliberately generous. The old five seconds was measured from the splash STARTING; this runs from app
 * start and has to cover auth, the restore gate and the cinematic on a cold start over a bad connection --
 * exactly the case this whole fix is about. Too short and the net becomes the very race it is guarding.
 */
const fallback = setTimeout(() => { launchFinished = true; flush(); }, 12000);

/** Has the launch sequence finished (splash done, or there was never going to be one)? */
export function isLaunchFinished(): boolean {
  return launchFinished;
}

/**
 * Called once the launch splash finishes, AND on any launch path that shows no splash at all. Idempotent.
 * ⚠️ EVERY path that reaches the tabs must call this. Miss one and the pop-ups on that path wait for the
 * 12 second net instead of appearing when they should.
 */
export function markLaunchFinished(): void {
  if (launchFinished) return;
  launchFinished = true;
  clearTimeout(fallback);
  flush();
}

/** Run cb now if launch has finished, otherwise queue it until it has. */
export function runAfterLaunch(cb: () => void): void {
  if (launchFinished) { cb(); return; }
  waiting.push(cb);
}
