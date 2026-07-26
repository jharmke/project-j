import { forwardRef } from 'react';
import {
  Text as RNText,
  TextInput as RNTextInput,
  type TextProps,
  type TextInputProps,
} from 'react-native';

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
 * Refs are forwarded. Non-negotiable -- the multiline select-all fix in the build standards relies on
 * `ref.current?.setNativeProps(...)` on TextInput, and it would break silently without this.
 */

export const Text = forwardRef<RNText, TextProps>((props, ref) => (
  <RNText allowFontScaling={false} {...props} ref={ref} />
));
Text.displayName = 'Text';

export const TextInput = forwardRef<RNTextInput, TextInputProps>((props, ref) => (
  <RNTextInput allowFontScaling={false} {...props} ref={ref} />
));
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
