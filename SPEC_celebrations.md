# Celebrations -- Spec

> ✅ **STATUS: BUILT AND SHIPPED 2026-07-27.** This started as an exploration doc full of TBDs. The
> exploration happened, prototypes were built and judged on a real device, and the app changed. **What
> shipped is below; the original exploration is kept underneath it because the REASONING is still the
> most useful thing in this file** -- but do not read the TBD list as open. Most of it is answered.

## WHAT SHIPPED (2026-07-27, device-confirmed)

**RISING MOTES** replaced the confetti for small / medium / large. Soft points of light drifting upward
and fading; 42 / 68 / 100 motes. Diamond is untouched. Colour rule is unchanged from the old confetti:
60% the user's accent, 25% off-white, 15% gold, with gold taking over as dominant if the accent is too
pale or too dark to read.

Chosen on device over three other prototypes -- refined confetti, a badge hero, and a light bloom. **All
four remain in Settings > Dev Tools > Celebration Style**, so the decision can be re-examined rather than
re-argued.

**THE CENTRE TEXT IS GONE.** This answers the file's longest-running question, and not on taste: 25 of the
29 triggers fire the achievement TOAST at the same moment, and that toast already carries the badge, the
name, the tier and the criteria. The overlay was printing the name a second time, simultaneously, in
hardcoded white with no backdrop -- which is what made it illegible on Light and started this whole thing.
The toast informs. The overlay is only the feeling.

**EVERY TIER IS SKIPPABLE**, including large. That was 46 achievements you previously had to sit through.

**WEIGHT ACHIEVEMENTS ARE CONSISTENT** for the first time -- first weigh-in used to toast without
celebrating, milestones and goal weight celebrated without toasting. All now do both. Mattered because
with no centre text, a silent celebration says nothing at all.

## TBDs, RESOLVED

- **TBD-1 (restrained vs loud):** restrained. Motes, non-blocking, no takeover below diamond.
- **TBD-2 (which to prototype):** all four were built and judged on device.
- **TBD-3 (different direction per tier):** no. One language, three intensities, plus diamond in its own
  category. Daily goals keep a celebration at the small size, per LOCKED #2.
- **TBD-4 (does the centre text survive):** no. See above. The RE-OPENED note below is closed.
- **TBD-5 (does the toast change):** yes, separately -- see the achievement toast work the same day
  (card grows to fit, tier name moved into the coloured header, criteria on the bottom row, platinum and
  bronze recoloured, and a theme-token-on-a-dark-card bug fixed).
- **TBD-6 (is `large` the right default):** partly. 9 achievements were re-tiered; the true counts were
  26 / 24 / 37 / 10, NOT the 46-large / 1-diamond this file originally claimed. Full inventory now lives
  in CELEBRATION_TIER_AUDIT.md.
- **TBD-7 (Mindful wording):** moot. There is no wording left to soften.

## STILL OPEN

- **Medium and large still differ only by COUNT.** The original diagnosis was that the tiers differed in
  size, not in kind -- motes made them better-looking, not more distinct. Tracked in the roadmap under
  `### Animations`.
- **TBD-8, reduce-motion / accessibility.** Never handled; the app reads no accessibility motion setting
  at all. Parked at Justin's request 2026-07-27, tracked in the roadmap.
- **TBD-9, diamond's internal readability.** Untouched, since diamond was out of scope.

---

> Original exploration framing, kept because it governed how this was approached and it worked:
> *"I'm okay with ripping up the roots of things and redoing it if it is truly premium. Before we go
> making decisions like 'oh, drop the center text', I'd like to go through what we have and what we COULD
> have, to see if we could improve the foundations before we alter the existing foundation."*

---

## WHAT STARTED THIS

An achievement fired on Home and the centre text ("STEP GOAL") was effectively unreadable -- faint white
letters over the cream Faith card on the Light theme.

Diagnosed: the celebration text is hardcoded `#ffffff` with a coloured glow behind it and **no
backdrop**. It dates from when the app was dark by default; white-on-dark worked. Light is now the
default theme and nobody revisited it. The confetti *was* made theme-aware (particles derive from the
theme accent) but the text was not -- so you get correctly-tinted particles around invisible words.

It is also set in `Type.num`, the CONDENSED NUMBER FACE, with wide letter spacing. That face is built
for digits, not words.

Justin: *"we coded these animations back when we weren't really good at making the app yet. Creativity
was low back then."*

---

## LOCKED (only these)

1. **MINDFUL CELEBRATIONS ARE IDENTICAL TO EVERY OTHER MODE.** Justin, emphatically: *"why the fuck
   would we hide it from them? We celebrate the good there."* Mindful is about not JUDGING, not about
   withholding joy. Do not propose a quieter Mindful variant again.
   (The only thing still open is WORDING -- "PERFECT" is performance framing and Mindful has its own
   vocabulary everywhere else. That is a copy question, not a suppression question. See TBD-7.)
2. **Daily goals keep a celebration.** They are not being removed. Justin: *"yes daily goals absolutely
   should get something."*
3. **Every celebration must be skippable.** Including whatever the biggest tier becomes.
4. **Diamond keeps its signature blue.** It is allowed to look different from the user's accent -- a
   milestone having its own identity is the point. Readability inside it is still open.
5. **PROTOTYPE BEFORE SPECCING THE DESIGN.** Build candidates behind dev tools, side by side with the
   current one, flip between them on a real device, and only then write down what won. Justin cannot
   judge this from prose and neither can Claude.

## ✅ CLOSED 2026-07-27 (was: RE-OPENED -- DO NOT TREAT AS DECIDED)

**Dropping the centre text.** Dropped on EVERY tier, not just small -- and the reason is worth keeping,
because it is not the reason anyone expected. It was not a taste call about whether the words looked good.
Justin noticed that the achievement toast fires at the same moment and already carries the badge, the
name, the tier and the criteria. The overlay was repeating information that was already on screen. Once
that was clear the decision made itself.

Original note, kept because the instinct behind it was right: Justin said "ok" to this early in the
conversation and then explicitly pulled it back, because it was exactly the kind of decision he did not
want made before surveying the whole thing. Surveying the whole thing is what produced the actual reason.

---

## INVENTORY (measured 2026-07-26, not remembered)

**31 trigger sites across 8 files:** `app/(tabs)/index.tsx`, `log.tsx`, `workout.tsx`, `bible.tsx`,
`journal.tsx`, `food-detail.tsx`, `recipe-log.tsx`, `workout-library.tsx`.

**Four tiers, very unevenly distributed across achievements:**
⚠️ **THESE FOUR NUMBERS WERE WRONG** -- corrected 2026-07-27 by re-parsing achievementData.ts. Large was
37, not 46, and diamond was TEN, not one: `getCelebTier()` promotes anything carrying
`displayTier: 'diamond'`, which nine achievements do, plus one whose real tier is diamond. There is also a
FIFTH badge tier nobody had mentioned -- platinum, 17 achievements -- which fires a plain large
celebration. Current counts and the full per-achievement inventory live in **CELEBRATION_TIER_AUDIT.md**.
Original (incorrect) figures kept below so the reasoning that followed from them still reads:
- small: 26
- medium: 24
- **large: 46** -- so "large" is the DEFAULT experience, not the special one
- **diamond: 1** -- genuinely rare

**Non-achievement triggers:**
- Daily goals (step / water / active calories / exercise) -> always `small`, and each also fires a toast
- Challenge complete -> `large` if perfect, else `medium`; a lesser variant fires `small`
- Goal weight hit -> `diamond` on first earn, else `large`

**TWO SEPARATE SYSTEMS fire from those sites:**
- `components/CelebrationOverlay.tsx` -- the full-screen confetti + text
- `components/AchievementToast.tsx` -- the top banner that slides in
Some triggers fire BOTH, some only one. Justin on the toast: *"I think it's okay but worth looking at as
well."* So it is in scope, lightly.

**API shape (this is the blast radius):** all 31 sites call `showCelebration(tier, label, def)`. Change
that signature and all 31 need touching. Decide the interface before the visuals.

**`def` is only used by the DIAMOND tier.** small / medium / large ignore it entirely and use only
`tier`, `label` and `accentColor`.

**Achievement `tier` is a lever we already have.** Re-tiering achievements changes what users experience
without touching the overlay at all.

---

## DEV TOOLS -- mostly fine, one real gap

Settings > Dev Tools (7-tap) has **Fire Small / Medium / Large / Diamond Celebration** and **Fire
Achievement Toast**. Verified: the dev tool passes a real achievement `def` for diamond, and since the
other tiers ignore `def` entirely, **what you fire from Settings genuinely is what a user sees.**

⚠️ **THE GAP: labels are short and tidy** ("NICE WORK", "MILESTONE", "GOAL WEIGHT"). Real labels include
full achievement names. **You cannot currently test what a long name does to the layout** -- which is
exactly where text breaks. Fix this in Phase 0 before judging anything.

---

## DEFECTS FOUND

1. **Centre text is hardcoded white with no backdrop.** Illegible on Light. Confetti is theme-aware; the
   text is not.
2. **Text uses the condensed NUMBER face for words**, with wide tracking.
3. **The tiers differ in SIZE, not in KIND.** small/medium/large are the same celebration with more
   particles, bigger type and a longer duration. This is likely the real reason medium and large do not
   feel like a bigger deal -- they are more of the same thing, not a different thing.
4. **LARGE IS THE ONLY TIER YOU CANNOT SKIP.** The dismiss pill renders for every tier except `large`
   (`tier !== 'large'`), and large is 46 achievements -- the most common tier. It just runs its 3.5
   seconds. This already contradicts LOCKED item 3.
5. **Diamond's palette is hardcoded blue** and ignores the user's accent. Intentional per LOCKED item 4,
   but its internal readability has not been looked at in a long time.
6. **Small fires on ordinary daily goals**, several times a day, with the same full-screen treatment as
   an achievement.

---

## THE OPEN QUESTION (TBD-1) -- what should this FEEL like?

Justin: *"I'm torn and probably need to see/hear about different potential options before I make that
decision. I guess leaning premium restrained but am truly open. Like medium/large/diamond celebrations
should be more than just some confetti and a little banner, no? A whole screen thing is interesting
(still would need to be skippable)."*

The two poles pull in opposite directions and everything downstream follows from this:
- **Restrained/premium** (Whoop, Oura): quiet, typographic, expensive-feeling. Matches the rest of the app.
- **Loud/characterful** (Duolingo, Strava): fun, animated, memorable. A celebration is arguably the ONE
  place where the app should break its own restraint.

**Not decided. Needs prototypes to answer.**

---

## FOUR DIRECTIONS (options, NOT recommendations)

**A. Refined confetti.** What exists, executed properly -- varied shapes, rotation, real gravity and
drift, depth. Fixes "cheap and coded" without changing the concept.
Justin on the current version: *"the confetti might feel a little cheap/'coded' feeling? isn't premium
so that probably needs a touchup."* He also felt toast + confetti is the right WEIGHT for daily goals:
*"they happen daily so don't need to be huge but I think it could be more polished."*
→ The strongest candidate for the DAILY tier specifically.

**B. Typographic.** No particles. Screen dims, the achievement name arrives in the app's molded gradient
type, badge underneath, everything else recedes. Distinctive precisely because every fitness app reaches
for confetti.

**C. The badge as hero.** A medal that mints itself -- scales in with weight, catches a light sweep,
settles. This is where the existing gold/shine system (`ButtonShine`, the molded gradient language,
`GradientTitle`) pays off, and it would feel unmistakably like THIS app rather than a library.
Justin raised this himself: *"we have the gold effect/shine like we do in the supporter stuff, not sure
if we could implement in here and trophies?"*

**D. Light rather than particles.** A bloom of accent light from the centre, expanding rings, glow that
fades. Expensive-feeling, no confetti cliché. Works beautifully on dark themes, needs care on light.

**Structural idea worth testing alongside these:** make the tiers differ in KIND.
- daily = **ambient** (banner + a light touch, gone)
- milestone = **a moment** (the screen acknowledges it)
- diamond = **an event** (takes over, you remember it)

---

## TECH -- what a prototype actually costs

**A, C and D can be prototyped with ZERO new packages.** Already installed: Reanimated, expo-linear-
gradient, react-native-svg, masked-view. No build needed to explore.

**Lottie** (designed animations) and **Skia** (shaders, real blur, richer particles) would open more, but
both are native modules -- a new dev build -- AND they need an asset designed or sourced. Justin is
explicitly open to this: *"I am OKAY with doing a new build and trying new imports and downloads and
stuff. more than okay, I urge you to."*
Recommendation is only to find out whether they are NEEDED after seeing what the installed stack does.

---

## PROCESS (proposed, agreed in principle)

**Phase 0 -- make it testable, capture the baseline.**
Close the dev-tool label gap (long realistic achievement names). Then screenshot all four tiers across
all five themes BEFORE touching anything, or we end up comparing new work against memory.

**Phase 1 -- prototype the shortlisted directions** behind dev tools, ALONGSIDE the current one, so they
can be flipped between on a real device. Nothing replaced yet.

**Phase 2 -- Justin picks** by thumb, not by document.

**Phase 3 -- build the winner for real**, decide the API shape (remember: 31 call sites).

**Phase 4 -- verify.** Four tiers x five themes x three coaching modes. Plus a long achievement name.

---

## REMAINING TBDs

- **TBD-1:** Restrained vs loud. The big one. Needs prototypes.
- **TBD-2:** Which of the four directions get prototyped (probably 2-3, not all four).
- **TBD-3:** Should the daily tier and the milestone tier be DIFFERENT directions entirely?
- **TBD-4:** Does the centre text survive at all, in any tier? (See RE-OPENED above.)
- **TBD-5:** Does the achievement toast change, and does it need to coexist on screen with a redesigned
  overlay?
- **TBD-6:** Is `large` (46 achievements) the right default, or should more of them be medium?
- **TBD-7:** Mindful WORDING -- "PERFECT" is performance framing. Same celebration, possibly different
  word.
- **TBD-8:** Reduce-motion / accessibility. Not handled at all today; the accessibility spec now exists
  as a home for it.
- **TBD-9:** Diamond's internal readability, keeping its signature blue.

---

## RELATED

- `components/CelebrationOverlay.tsx` -- all four tiers, plus `DiamondCelebration` inside it
- `components/AchievementToast.tsx` -- the separate top banner
- `achievementData.ts` -- `getCelebTier()` and every achievement's `tier`
- `SPEC_accessibility.md` -- home for the reduce-motion question (TBD-8)
