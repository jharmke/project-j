// utils/floatingBar.ts
//
// A tiny global signal that tells the app-wide Otto FAB (AssistantOverlay) to lift up and clear a
// screen's own floating save/cancel bar (Settings > Goals, Profile) instead of sitting under it.
// AssistantOverlay only knows tab vs pushed screen for its resting position -- it has no idea a
// screen's local floating bar is covering it, so any screen with one measures its bar via onLayout
// and calls setFloatingBarHeight(height) while visible, and setFloatingBarHeight(0) when it hides.
// Mirrors utils/assistantFab.ts's camera signal, but carries a height instead of a bool so Otto can
// lift by exactly the right amount rather than disappearing.

import { useEffect, useState } from 'react';

let activeHeight = 0;
const listeners = new Set<(height: number) => void>();

function notify() {
  listeners.forEach(l => l(activeHeight));
}

/** Call with the bar's measured height while it's visible, or 0 when it hides. */
export function setFloatingBarHeight(height: number) {
  activeHeight = Math.max(0, height);
  notify();
}

/** Subscribe hook: the current active floating bar's height, or 0 if none is showing. */
export function useFloatingBarHeight(): number {
  const [height, setHeight] = useState(activeHeight);
  useEffect(() => {
    const l = (h: number) => setHeight(h);
    listeners.add(l);
    setHeight(activeHeight); // sync in case it changed between render and subscribe
    return () => { listeners.delete(l); };
  }, []);
  return height;
}
