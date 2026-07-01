// utils/assistantFab.ts
//
// A tiny global signal for hiding the Companion FAB while a live camera is on screen (the barcode
// scanner, the AI meal estimator capture, or any future camera). A floating button over a camera
// preview is wrong, so any screen that opens a camera calls setCameraActive(true) while it is open
// and setCameraActive(false) when it closes. The AssistantOverlay subscribes via useCameraActive()
// and hides the FAB while the count is above zero.
//
// A reference COUNT (not a bool) so overlapping opens/closes never clobber each other: each opener
// increments on open and decrements on close, and the FAB shows again only when all are closed.

import { useEffect, useState } from 'react';

let cameraCount = 0;
const listeners = new Set<(active: boolean) => void>();

function notify() {
  const active = cameraCount > 0;
  listeners.forEach(l => l(active));
}

/** Call with true when a camera opens, false when it closes. Safe to call repeatedly. */
export function setCameraActive(active: boolean) {
  cameraCount = Math.max(0, cameraCount + (active ? 1 : -1));
  notify();
}

/** Reset to zero (defensive: e.g. a screen unmounts without its cleanup running). */
export function resetCameraActive() {
  if (cameraCount === 0) return;
  cameraCount = 0;
  notify();
}

/** Subscribe hook: true while any camera is open. */
export function useCameraActive(): boolean {
  const [active, setActive] = useState(cameraCount > 0);
  useEffect(() => {
    const l = (a: boolean) => setActive(a);
    listeners.add(l);
    setActive(cameraCount > 0); // sync in case it changed between render and subscribe
    return () => { listeners.delete(l); };
  }, []);
  return active;
}
