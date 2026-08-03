// utils/macroPresets.ts
//
// THE FOUR MACRO PRESETS, IN ONE PLACE. They were defined THREE times -- inside the Home Macros modal,
// inside onboarding's your-style screen, and (from 2026-08-03) they were about to be typed a fourth time
// into Settings > Goals. Item C piece 2 gates CUSTOM splits and leaves these free, which makes them the
// user's escape hatch: if two copies ever disagree, one screen offers a way out of the wall that the other
// does not.
//
// ⚠️ THESE ARE FREE ON EVERY TIER AND MUST STAY THAT WAY. The whole "limit, don't paywall" line for macros
// rests on four presets covering what most people need. Never gate a preset.
//
// ⚠️ app/onboarding/your-style.tsx STILL HOLDS ITS OWN COPY (verified identical on 2026-08-03: same four
// keys, same numbers, no icon field). It was left alone to keep the onboarding flow out of this change;
// switching it over is logged in NEXT UP. If these numbers ever change, change them there too until it is.

export type MacroPresetKey = 'high_protein' | 'balanced' | 'low_carb' | 'performance';

export type MacroPreset = {
  label: string;
  p: number;
  c: number;
  f: number;
  icon: any;
};

export const MACRO_PRESETS: Record<MacroPresetKey, MacroPreset> = {
  high_protein: { label: 'High Protein', p: 35, c: 35, f: 30, icon: 'barbell' },
  balanced:     { label: 'Balanced',     p: 30, c: 40, f: 30, icon: 'pie-chart' },
  low_carb:     { label: 'Low Carb',     p: 35, c: 25, f: 40, icon: 'leaf' },
  performance:  { label: 'Performance',  p: 25, c: 50, f: 25, icon: 'flash' },
};

/**
 * Which preset a set of percentages matches, or null for none.
 *
 * ⚠️ ONLY FOR ACCOUNTS THAT HAVE NEVER STORED AN ANSWER. `pj_settings.macroPreset` is the real source of
 * truth, because matching on numbers alone cannot tell "I picked Balanced" from "I typed 30/40/30 by hand",
 * and Justin's call (2026-08-02) is that hand-authored numbers read as Custom either way.
 */
export function matchMacroPreset(p: string | number, c: string | number, f: string | number): MacroPresetKey | null {
  const entry = (Object.entries(MACRO_PRESETS) as [MacroPresetKey, MacroPreset][]).find(([, pr]) =>
    String(pr.p) === String(p) && String(pr.c) === String(c) && String(pr.f) === String(f));
  return entry ? entry[0] : null;
}
