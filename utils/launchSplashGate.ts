// Cross-route signal for whether the cold-launch splash cinematic is still on screen.
//
// The launch splash (showSplash) lives in app/_layout.tsx, but several things that fire on a
// cold launch live elsewhere -- the Day Summary pop-up and the meta tutorial live on the Home tab,
// a separate route that can't read the root layout's state directly. Without this, those pops play
// BEHIND the splash and the user misses them (the confetti/trophy/summary "already gone when the
// splash lifted" bug). This module lets any of them defer until the splash finishes.
//
// Celebrations + the achievement toast use their renderers' own `hold` prop instead; this gate is
// for the pops that can't take a prop (they're triggered imperatively from the Home screen).

let splashShowing = false;
let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
const doneCbs: Array<() => void> = [];

function flush(): void {
  const cbs = doneCbs.splice(0);
  cbs.forEach(cb => { try { cb(); } catch {} });
}

export function isLaunchSplashShowing(): boolean {
  return splashShowing;
}

// Called by _layout when the splash cinematic starts (true) and when it finishes (false).
export function setLaunchSplashShowing(v: boolean): void {
  splashShowing = v;
  if (fallbackTimer) { clearTimeout(fallbackTimer); fallbackTimer = null; }
  if (v) {
    // Safety net: if the splash's onDone somehow never fires, never strand a queued pop-up
    // (a summary that never shows would silently burn nothing, but the user would just miss it).
    fallbackTimer = setTimeout(() => { splashShowing = false; fallbackTimer = null; flush(); }, 5000);
  } else {
    flush();
  }
}

// Run cb now if the splash isn't showing, otherwise queue it to run the moment the splash finishes.
export function runAfterLaunchSplash(cb: () => void): void {
  if (!splashShowing) { cb(); return; }
  doneCbs.push(cb);
}
