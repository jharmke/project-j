import React, { createContext, forwardRef, useContext, useEffect, useState } from 'react';
import {
  PixelRatio,
  StyleSheet,
  Text as RNText,
  TextInput as RNTextInput,
  type TextStyle,
  type TextProps,
  type TextInputProps,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { storageSet } from '../utils/storage';

/**
 * THE app-wide text chokepoint. Every `Text` and `TextInput` in the app imports from here instead of
 * straight from 'react-native'. See SPEC_accessibility.md section 1.
 *
 * WHY THIS FILE EXISTS AT ALL:
 * iOS Dynamic Type multiplies every piece of text, without limit. Justin's uncle had his phone near
 * max and large parts of the app broke -- text ran enormous and content was cut off with no way to
 * reach it. Nothing in the app capped it: `allowFontScaling` appeared ZERO times across the codebase.
 *
 * WHY NOT THE ONE-LINER EVERYONE POSTS ONLINE -- `Text.defaultProps.allowFontScaling = false`:
 * IT DOES NOT WORK ON THIS STACK, and it fails silently, which is worse.
 *   - react 19.1.0 REMOVED defaultProps support for function components.
 *   - react-native 0.81.5's Text is `TextImpl`, a function component, which reads the prop straight
 *     through (`allowFontScaling !== false`). Nothing merges defaultProps anywhere.
 * Verified by reading the installed source, not from memory. Do not "simplify" this file back into
 * that one-liner.
 *
 * Font sizes in this app are written inline everywhere (`fontSize: 13`, `fontSize: 9`, ...) with no
 * central size token, so a wrapper is the ONLY way to reach all text at once.
 *
 * PHASE 1 SCOPE -- deliberately minimal: this refuses the system's scaling and does NOTHING else.
 * It does not read, inject or multiply fontSize or lineHeight. That keeps the two nastiest traps out
 * of play for now:
 *   - injecting a fontSize where none was set would break NESTED text, which inherits its size from
 *     the Text above it (the app styles runs of text this way).
 *   - scaling fontSize without scaling lineHeight clips and overlaps, and is invisible at 1.0.
 * Phase 2 (our own in-app size setting) is where that maths arrives, and both traps apply then.
 *
 * `allowFontScaling` is placed BEFORE the prop spread on purpose: a caller that genuinely wants
 * scaling can still pass its own value and win.
 *
 * ⚠️ WHAT THIS WRAPPER CANNOT REACH -- `Animated.Text` and `Reanimated.Text`.
 * Those wrap React Native's OWN Text directly, so an import swap never touches them and they keep
 * scaling. This is not theoretical: the bottom tab bar's labels render through `Animated.Text` and were
 * the last thing in the app still growing after everything else was fixed. Every current instance
 * (13 of them, across the tab bar, stats, prayer, the achievement toast, the celebration overlay and
 * the tooltip modal) now passes `allowFontScaling={false}` by hand.
 * ANY NEW `Animated.Text` MUST DO THE SAME. There is no way to enforce it from here.
 *
 * ⚠️ AND A WARNING ABOUT TESTING THIS: changing this file alters behaviour in ~111 files that only
 * IMPORT it. Fast Refresh does not reliably re-apply that -- modules that did not themselves change can
 * keep running their old compiled version, which looks exactly like a partial, incoherent fix (some
 * cards right, some wrong, no pattern). A whole debugging pass was spent hunting a "category" that did
 * not exist. VERIFY WITH A FULL RESTART: kill the app and run `npx expo start -c`. A JS reload is not
 * enough.
 *
 * Refs are forwarded. Non-negotiable -- the multiline select-all fix in the build standards relies on
 * `ref.current?.setNativeProps(...)` on TextInput, and it would break silently without this.
 */

// ─── Our own text size control ────────────────────────────────────────────────
//
// Having refused the SYSTEM's scaling above, we owe users a way to size text themselves. This is that.
//
// DISCRETE STEPS, NEVER A SLIDER. A slider is infinite states to verify and infinite ways to be broken;
// steps give a finite matrix and read better as a setting. Adding a step later is ONE LINE here.
//
// STEP COUNT IS FREE, THE CEILING IS NOT. Only the MAXIMUM has to be audited: nothing gets tighter as
// text shrinks, so if the app survives the top step every step below it is safe by definition. Adding a
// step BELOW the ceiling costs no testing at all. RAISING the ceiling means auditing again.
//
// WHY 1.15 AND NOT 1.1: the two are four percent apart, which nobody can perceive. A step a user cannot
// see makes the whole setting feel broken, so the ladder gets fewer, clearly different rungs instead.
export const FONT_SCALE_STEPS = [
  { id: 'default', label: 'Default', scale: 1 },
  { id: 'large', label: 'Large', scale: 1.15 },
] as const;

export type FontScaleId = (typeof FONT_SCALE_STEPS)[number]['id'];

const DEFAULT_SCALE_ID: FontScaleId = 'default';

/**
 * AUTO-MATCH. The app refuses iOS's own scaling app-wide, so a user who has deliberately turned their
 * phone's text up would otherwise open GoodForge and find it ignored their choice with no hint that a
 * setting exists. This honours their intent while keeping OUR ceiling.
 *
 * THE RULE: snap DOWN to the nearest step at or below their system scale. Never give someone MORE than
 * they asked for. Measured on a real device 2026-07-26: iOS default reports 1.0, one notch up 1.118,
 * and the top of the regular range 1.353 (Apple's separate accessibility sizes go past 2).
 * So with today's steps it takes TWO notches to trigger -- one notch (1.118) is a mild preference and
 * snapping down leaves it at Default, which was Justin's call and is the right one: nearest-step logic
 * would have bumped that user to Large off a 3% difference.
 * Not an arbitrary cutoff -- it falls out of the rule, and adding a step later re-maps everyone
 * automatically with no logic to revisit.
 *
 * NO TOAST, deliberately. An app showing larger text because the phone asked for larger text is the
 * expected outcome, not an event worth announcing -- and the message would land mid-onboarding for a
 * new user. Settings > Accessibility is the discovery path if they want something different.
 */
function autoMatchedId(systemScale: number): FontScaleId {
  let best: FontScaleId = DEFAULT_SCALE_ID;
  for (const step of FONT_SCALE_STEPS) {
    if (step.scale <= systemScale + 0.001) best = step.id;
  }
  return best;
}

/**
 * CLAMP ON READ, and this is why it exists from day one rather than later: if a step is ever REMOVED
 * (or renamed), anyone who had it selected is holding a value nothing offers anymore, and they would
 * sit at a size we no longer test. Retrofitting this later means guessing which old values are out
 * there on real devices. An unknown id falls back to Default.
 */
function resolveScaleId(raw: unknown): FontScaleId {
  return FONT_SCALE_STEPS.some(s => s.id === raw) ? (raw as FontScaleId) : DEFAULT_SCALE_ID;
}

const scaleFor = (id: FontScaleId) =>
  FONT_SCALE_STEPS.find(s => s.id === id)?.scale ?? 1;

interface FontScaleValue {
  scaleId: FontScaleId;
  scale: number;
  setScaleId: (id: FontScaleId) => void;
}

const FontScaleContext = createContext<FontScaleValue>({
  scaleId: DEFAULT_SCALE_ID,
  scale: 1,
  setScaleId: () => {},
});

/** Wrap the app once, in app/_layout.tsx. Everything below reads it through Text/TextInput. */
export function FontScaleProvider({ children }: { children: React.ReactNode }) {
  const [scaleId, setId] = useState<FontScaleId>(DEFAULT_SCALE_ID);

  useEffect(() => {
    AsyncStorage.getItem('pj_settings')
      .then(s => {
        const parsed = s ? JSON.parse(s) : {};

        // A CHOICE THE USER MADE HIMSELF ALWAYS WINS, permanently. `fontScaleSource` is what makes that
        // distinguishable -- both paths write the same `fontScale` value, so without it an explicit
        // "Default" from someone whose phone is set large would be indistinguishable from never having
        // been asked, and auto-match would silently overrule them on the next launch.
        if (parsed.fontScaleSource === 'user') {
          setId(resolveScaleId(parsed.fontScale));
          return;
        }

        // Otherwise re-evaluate EVERY launch, not once. Checking a single time would mean someone who
        // turns their phone's text up months from now is never matched, because the one moment we
        // looked has passed.
        const matched = autoMatchedId(PixelRatio.getFontScale());
        setId(matched);
        if (matched !== resolveScaleId(parsed.fontScale)) {
          storageSet('pj_settings', JSON.stringify({ ...parsed, fontScale: matched, fontScaleSource: 'auto' }))
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, []);

  const setScaleId = async (id: FontScaleId) => {
    setId(id);
    try {
      // READ-THEN-MERGE, never replace. pj_settings carries the user's whole configuration.
      const s = await AsyncStorage.getItem('pj_settings');
      const current = s ? JSON.parse(s) : {};
      // 'user' locks auto-match out from here on -- see the note above.
      await storageSet('pj_settings', JSON.stringify({ ...current, fontScale: id, fontScaleSource: 'user' }));
    } catch (e) {
      console.log('Font scale save error', e);
    }
  };

  return (
    <FontScaleContext.Provider value={{ scaleId, scale: scaleFor(scaleId), setScaleId }}>
      {children}
    </FontScaleContext.Provider>
  );
}

export function useFontScale(): FontScaleValue {
  return useContext(FontScaleContext);
}

/**
 * Applies the user's multiplier to a style.
 *
 * ⚠️ ONLY SCALES WHAT WAS EXPLICITLY SET. Injecting a fontSize where the code set none would break
 * NESTED text -- this app styles runs of text by nesting one Text inside another and letting the inner
 * one INHERIT its size. Inject a default and every one of those silently detaches from its parent.
 *
 * ⚠️ SCALES lineHeight TOO. Growing the glyphs while the line box stays put clips and overlaps them,
 * which is worse than the problem this feature solves. Invisible at 1.0, which is exactly why it gets
 * missed.
 */
function scaleTextStyle(style: any, scale: number): any {
  if (scale === 1 || !style) return style;
  const flat = StyleSheet.flatten(style) as TextStyle | undefined;
  if (!flat) return style;
  const out: TextStyle = { ...flat };
  if (typeof flat.fontSize === 'number') out.fontSize = flat.fontSize * scale;
  if (typeof flat.lineHeight === 'number') out.lineHeight = flat.lineHeight * scale;
  return out;
}

export const Text = forwardRef<RNText, TextProps>((props, ref) => {
  const { scale } = useFontScale();
  // At 1.0 the style is passed straight through untouched -- no flatten, no allocation. The default
  // user pays nothing for this feature existing.
  return (
    <RNText
      allowFontScaling={false}
      {...props}
      style={scale === 1 ? props.style : scaleTextStyle(props.style, scale)}
      ref={ref}
    />
  );
});
Text.displayName = 'Text';

export const TextInput = forwardRef<RNTextInput, TextInputProps>((props, ref) => {
  const { scale } = useFontScale();
  return (
    <RNTextInput
      allowFontScaling={false}
      {...props}
      style={scale === 1 ? props.style : scaleTextStyle(props.style, scale)}
      ref={ref}
    />
  );
});
TextInput.displayName = 'TextInput';

/**
 * RN's `Text` / `TextInput` are each BOTH a value and a type, and the app relies on the type half:
 * `useRef<TextInput>(null)` appears throughout (the multiline select-all fix needs it). Exporting only
 * the components above shadows the type meaning, and every one of those refs stops compiling with
 * "refers to a value, but is being used as a type here". Re-export the instance types under the same
 * names so `useRef<TextInput>` keeps working untouched at the call sites.
 */
export type Text = RNText;
export type TextInput = RNTextInput;

export type { TextProps, TextInputProps };
