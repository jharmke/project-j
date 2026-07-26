# Accessibility -- Spec

Home for the app's accessibility work. Text scaling is the first section because it surfaced as a real
bug; VoiceOver labels, contrast and reduce-motion belong here too when they come up, rather than
scattering across the roadmap.

---

# 1. TEXT SCALING (Dynamic Type)

## What happened

Justin's uncle, on the current TestFlight build, had iOS's system text size turned up near maximum.
Large parts of the app broke: text ran enormous, and content was cut off with no way to reach it. The
onboarding Faith Journey step (step 4 of 6) was the example screenshot -- the verse at the bottom was
clipped behind the fixed Continue button with no way to scroll to it.

This is a **launch-quality bug**, not a nicety. It lands hardest on the first-run experience, which is
the one part of the app a new user cannot skip.

## Root cause -- TWO independent problems

Both are real. Fixing one does not fix the other.

**(a) Nothing in the app caps text scaling.** iOS Dynamic Type multiplies every `<Text>`, and
`allowFontScaling` / `maxFontSizeMultiplier` appear **ZERO times** across `app/` and `components/`
(grepped 2026-07-26). Nothing is guarded anywhere, so text scales without limit.

**(b) Some screens cannot scroll.** `app/onboarding/faith-journey.tsx` contains no ScrollView at all.
The screen was built assuming its content fits. Once content grows there is nowhere for it to go, so
it is simply clipped. Capping the font reduces this but cannot fix a screen that physically cannot
scroll.

## VERIFIED TECHNICAL FACTS (read from installed source 2026-07-26, not from memory)

**The famous one-line fix does NOT work on this stack. Do not try it.**
Setting `Text.defaultProps.allowFontScaling = false` in the root layout is the answer all over the
internet, and it is dead here:
- `react@19.1.0`. React 19 **removed `defaultProps` support for function components.**
- `react-native@0.81.5`. Its `Text` is `TextImpl`, a **function component** (`export default TextImpl`
  at the end of `Libraries/Text/Text.js`), which reads the prop straight through
  (`allowFontScaling: allowFontScaling !== false`). No defaultProps merging anywhere.

So the default is ON unless a component explicitly passes `false`, and there is no global switch.

**Therefore a chokepoint is required.** Font sizes in this app are written inline all over
(`fontSize: 13`, `fontSize: 9`, ...) with no central token for size. The only way to control text
app-wide is to route text through a wrapper component and rewrite the imports to point at it.

Scope, measured: ~127 files import from `'react-native'`; roughly 105 of those pull in `Text`.
Approximate -- the grep pattern was loose, confirm before scripting.

---

## LOCKED DECISIONS

1. **Phase 1 kills forced scaling.** Everyone renders at the designed size, 1.0. Nobody's phone
   setting can change the app.
2. **Ship at Default. No auto-seeding from the system setting.** Day one is exactly the layout that
   has been tested. Seeding is revisited only after the audit, if at all.
3. **Our own setting is DISCRETE STEPS, never a slider.** e.g. Default / Large / Larger. A slider is
   infinite states to test and infinite ways to break; steps give a finite matrix and are better UX.
4. **Test the MAXIMUM only.** Nothing gets tighter as text shrinks, so if the app survives the top
   step, every step below it is safe by definition. One pass, not one per step.
5. **No new onboarding step.** Onboarding is 6 steps and the count matters across coaching modes
   (a step was CUT once for breaking it -- see CLAUDE.md on commitment.tsx). Font size is not a step.
6. **Discoverability is a one-time first-launch prompt**, fired only when the system is set to
   noticeably large text, placed BEFORE onboarding step 1. "Your phone is set to larger text. Want
   GoodForge to match?" Two options, three seconds. Everyone else never sees it. This is the answer to
   both "how do they find the setting" and "onboarding happens before Settings is reachable".
7. **Permanent home is Settings > Accessibility.** The prompt is discovery, not the feature.
8. **The onboarding scroll fix is NOT optional and NOT deferrable.** A new user with large system text
   hits onboarding before our setting exists in their world and cannot reach Settings to escape.
   Screens with no scroll today: `apple-health.tsx`, `faith-journey.tsx`, `notifications.tsx`.
9. **The audit size is a function of ONE number: the maximum multiplier.** It is NOT a function of
   which approach is chosen. Max 1.0 = no audit. A higher ceiling = a bigger audit. Cap-only and
   cap-plus-setting carry the SAME audit; the setting screen is the only extra work.

## OPEN QUESTIONS (do not quietly resolve these)

- **What is the maximum multiplier, and how many steps?** Everything about audit size follows from
  this. A modest ceiling keeps the sweep targeted.
- **Do icons get capped with text?** Ionicons renders through an icon FONT, so it scales with the same
  setting. Capped text beside uncapped icons looks worse than either extreme on its own.
- **SVG text.** Deferred by Justin's call: land phase 1 first, then look at how small chart labels
  actually are before deciding. They may be fine, or may want the opposite treatment.
- **Third-party text.** Anything a library renders internally never flows through our wrapper. Verify
  rather than assume "we control all text".
- **Does auto-seeding ever ship?** Parked behind the audit, deliberately.

---

## PHASE 1 -- SHIPPED 2026-07-26, DEVICE VERIFIED AT MAX iOS TEXT SIZE

Everything below was learned doing it. Read before touching any of this again.

**What shipped:** `components/AppText.tsx` (Text, TextInput) and `components/AppIcons.tsx` (Ionicons,
MaterialCommunityIcons, AntDesign), with imports rewritten across 111 files, plus scroll on the three
onboarding screens. Icons were folded into phase 1 rather than left as an open question: they render
from an icon FONT, and capping text beside uncapped icons is worse than capping neither.

**⚠️ THE BIGGEST TRAP, and it cost a whole debugging pass.** Changing AppText.tsx changes behaviour in
~111 files that only IMPORT it, and **Fast Refresh does not reliably re-apply that**. Modules that did
not themselves change keep running their old compiled version. The result looks like a partial,
incoherent fix: some cards correct, some not, no pattern to it. A long stretch was spent hunting a
"category" of broken component that did not exist -- the real answer was that a scattered set of
modules were simply stale. **A full app kill + `npx expo start -c` fixed nearly all of it at once.**
ALWAYS verify a chokepoint change that way. A JS reload is not enough and will lie to you.

**⚠️ `Animated.Text` / `Reanimated.Text` CANNOT be reached by an import swap.** They wrap RN's own Text
inside the animation library, so the file's imports say nothing about it. 13 instances were patched by
hand (`allowFontScaling={false}`): the bottom tab bar (the genuinely last thing in the app still
growing, since its labels animate on tab change), a stats tile, prayer's "Praise God", 6 in the
achievement toast, 3 in the celebration overlay, 1 in the tooltip modal. Most only appear mid-animation,
so browsing the app would never have found them. ANY NEW ONE NEEDS THE PROP BY HAND -- nothing enforces
this from the wrapper.

**RESOLVED, do not re-investigate:**
- **SVG text does NOT scale.** 79 elements across 5 files (sleep, report, StatsGraphCard,
  MetricDrilldownModal, onboarding/your-style). Verified on device at max text: chart axis labels, donut
  values and graph numbers all held their size. The deferred "SVG decision" is CLOSED, nothing to build.
- **Native `Alert` dialogs scale and that is correct.** 213 call sites. iOS draws them; no app code can
  or should stop it. Verified they render fine at max size. Not a bug, do not report it as a miss.
- **Icons: capped.** Included in phase 1. `components/ui/icon-symbol.tsx` imports MaterialIcons by
  SUBPATH so the sweep correctly skipped it; handled directly (IconSymbol is live, the Workout pencil).

**Wrapper fallout worth knowing if it is ever rewritten:** `Ionicons.glyphMap` is read in 9 places, so a
bare function wrapper drops the statics and degrades `keyof typeof glyphMap` to `string|number|symbol`,
which then fails the `name` prop. And RN's Text/TextInput are each BOTH a value and a type
(`useRef<TextInput>` throughout, needed by the multiline select-all fix). Statics are re-attached and
the instance types re-exported for exactly these reasons.

**Still open after phase 1:** nothing broken. Phases 2-4 below are OPTIONAL PRODUCT WORK now, not bug
fixes -- the app renders correctly for every user at any system setting. Decide whether an in-app size
setting is worth building on its own merits.

---

## PHASING

**Phase 1 -- get safe.** The wrapper + the scripted import rewrite + the onboarding scroll fix.
Self-contained, commits to nothing else. Low risk for almost everyone: anyone at the default system
setting is already at 1.0, so their app does not change at all. It only affects people who
deliberately changed it, and for them it is a return to the designed layout.
NOTE: phase 1 does NOT stress the tutorial system. Everyone lands on exactly the size the tutorials
were built and tested against, so nothing shifts.

**Phase 2 -- our setting.** Settings > Accessibility, discrete steps, `pj_settings` (read-then-merge).

**Phase 3 -- the sweep.** Audit at the maximum step against the trap list below.

**Phase 4 -- the prompt.** First-launch detection, only for large system settings.

**Later / open** -- SVG text, auto-seeding.

---

## TRAP LIST

Traps in the mechanical sweep:

- **The import rewrite is more dangerous than it looks.** Two specific hazards:
  (1) imports in this codebase are MULTI-LINE blocks (`import {\n  Alert, Animated, ... Text, ...\n}
  from 'react-native';`), so a naive line-based regex misses most of them and silently under-applies,
  which looks like success;
  (2) **`react-native-svg` ALSO exports `Text`.** A script that is not careful about which import it
  rewrites will break chart labels while appearing to work. Diff-review the result, do not trust it.
- **`TextInput` scales too** and needs the same treatment, placeholder text included.

Traps in the wrapper itself:

- **Do NOT inject a fontSize where none was specified.** The app styles runs of text by NESTING one
  Text inside another, where the inner one inherits its size from the outer. A wrapper that defaults a
  missing size silently breaks that inheritance everywhere. Scale only what was explicitly set.
- **Line height must scale with font size.** Scale the text but not its line height and you get
  clipping and overlap at larger settings, which is worse than the original bug. Invisible at 1.0,
  which is exactly why it gets missed.
- **Style flattening runs on every Text render.** Probably fine, worth watching in a text-heavy screen.

Regressions to watch for during the audit:

- **Truncated NUMBERS are worse than truncated words.** Anywhere text is pinned to one line, a bigger
  font truncates more. A food name losing its tail is ugly; a calorie value rendering as "1,2..." is a
  correctness problem and collides directly with the honest-numbers standard. Numbers on a single line
  deserve specific attention.
- **Tutorial spotlights may drift.** The overlay measures real element positions and larger text means
  taller elements. "Too-tall targets" is already a recurring bug in that system. Phase 3 problem, not
  phase 1.
- **Fixed heights break before wrapping text does.** Buttons and cards with a set height clip; text
  that is free to wrap usually survives.
- **Rows with a label and a value side by side collide** before anything else on the screen does.

## WHERE THE BREAKAGE ACTUALLY CLUSTERS (drives the audit, greppable, not an eyeball tour)

1. Screens with no ScrollView -- cutoff is fatal there.
2. Text pinned to a single line, which truncates instead of wrapping.
3. Label-and-value rows that collide.
4. Fixed-height buttons and cards.

## RELATED

- Likely the SAME root cause as the **iPad layout item** on the roadmap (wrapped date on Home,
  oversized Otto chat header). That item already guessed the iPad's system text size was the culprit;
  this makes that guess look right. Fixing this may close it.
- Testing note: our own in-app setting makes the QA loop dramatically faster than iOS's. Today,
  reproducing means leaving the app, digging through iOS settings, and coming back. With our toggle it
  is one tap and a re-render.
