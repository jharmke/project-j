// utils/modeAccent.ts
// The coaching mode's colour, and the tints derived from it.
//
// This is NOT onboarding decoration. all-set.tsx ends the flow with setAccent('discipline' | 'mindful' |
// 'green'), so the mode a user picks on Your Style IS the accent they walk away with -- the colour follows
// them into the app. That is why the flow recolours the moment they choose: it is a live preview of their
// app, not a costume it takes off at the home screen.
//
// The values are the REAL accent colours from theme.tsx's light-theme table, not lookalikes:
//   discipline -> the 'discipline' accent, labelled "Amber"  (#c2621a)
//   mindful    -> the 'mindful' accent,    labelled "Forest" (#0d9268)
//   balanced   -> the 'green' accent,      labelled "Blue"   (#1a44c2)
// Yes, Balanced maps to an accent whose ID is 'green'. The ID is a legacy slot name and has nothing to do
// with the colour -- the LABEL is what the user sees, and that label is "Blue". Do not "fix" the ID.
// Onboarding previously drew Balanced in the base #2563eb, a near-miss of the blue it actually grants.
//
// Faith Journey is deliberately EXEMPT: it keeps its amber. Faith identity outranks the mode colour.

import { mix } from '../theme';

export type StyleMode = 'discipline' | 'balanced' | 'mindful';

export const MODE_ACCENT: Record<string, string> = {
  discipline: '#c2621a',
  balanced:   '#1a44c2',
  mindful:    '#0d9268',
};

export function getModeAccent(mode?: string | null): string {
  return MODE_ACCENT[mode ?? 'balanced'] ?? MODE_ACCENT.balanced;
}

// The mode picked THIS RUN, held in memory.
//
// Downstream screens read styleMode from pj_settings, which works for a real user because Your Style saves
// it before navigating. PREVIEW never saves -- it must not touch the real settings -- so it navigated on
// with nothing written and Apple Health / Notifications read the OLD stored mode and came up the wrong
// colour. Preview being the only way to review the flow, that made the recolour unreviewable.
//
// Set on Continue in BOTH modes, and preferred over storage downstream: for a real user it holds the same
// value the write is about to land, so it changes nothing. Module state, same as onboardingPreview.
let sessionStyleMode: string | null = null;
export function setSessionStyleMode(mode: string) { sessionStyleMode = mode; }
export function getSessionStyleMode(): string | null { return sessionStyleMode; }

// Onboarding reads the STATIC base theme, where the composed accent tokens (accentBlueBgOpaque and friends)
// are still their '#000000' placeholders -- only the provider fills them in. So the tints get composed here,
// the same way the provider does it, and they are OPAQUE: a translucent tint over the accent glow this flow
// sits on turns to mud.
export function getModeAccentTints(mode: string | null | undefined, theme: any) {
  const accent = getModeAccent(mode);
  return {
    accent,
    // A selected row/pill/card sitting on the page.
    selected: mix(accent, theme.bgInput, 0.16),
    // A quiet accent-tinted surface (the back button, small badges).
    bg:       mix(accent, theme.bgCard, 0.12),
    border:   mix(accent, theme.bgCard, 0.45),
  };
}
