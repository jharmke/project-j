# SPEC -- Visual Refresh (type, material, surface)

Status: DECIDED 2026-07-14, not yet built. This file is the source of truth for the refresh.
Roadmap points here. Nothing in here ships without Justin seeing it on device first.

---

## THE PROBLEM (Justin's words, 2026-07-14)

"It feels like a Claude/AI generated app. A polished version of it, but it still performs/looks like a
blank form page with data slapped on it. Organized, but not aesthetically pleasing."

He is right, and the diagnosis is NOT the headers he first pointed at. It is three things:

1. **One rhythm, one weight.** Every card is 100% width, 14px radius, same border, same padding, stacked
   in one column. Nothing is more important than anything else, so the eye has nowhere to land. Premium
   fitness apps (Whoop, Oura) give one element the top third and subordinate everything below it.
2. **Everything is painted, nothing is molded.** Flat accent fill on every button, every FAB, the home
   tab button. One flat color with no gradient, no top highlight, no tinted shadow. This is the single
   biggest "machine designed this" tell in the app, and Justin identified it himself.
3. **The type has no voice.** Bebas does every job (52pt calorie number AND 15pt water buttons AND page
   titles) -- a display face used at every size stops being an accent and becomes wallpaper. DM Sans is
   the Google-Fonts default of the AI-app era: not bad, invisible. Lora is loaded and only ever appears
   on scripture.

---

## THE DECISION

One look. Every piece points the same direction: **light rising from below, dissolving as it climbs.**

### Type -- a four-role system

The roles are INDEPENDENT. A serif title over condensed numbers is legal and intentional; no family has
to do two jobs. This is the whole point of the system.

| Role | Face | Job |
|---|---|---|
| Display | **Clash Display** (Fontshare) | Page titles: "Good morning", "Effort vs Results" |
| Numbers | **Rajdhani** (Khand is the live alternate) | Every value. Tabular figures, so counters stop jittering |
| Interface | **Onest** | Labels, buttons, everything structural. A good one is invisible |
| Voice | **Bitter** (Ranade is the live alternate) | Coach insight, verses, Otto. Where the personality lives |

Notes that matter:
- **Bebas is not banned, it is demoted.** If it survives anywhere it is headers only, never below 24px.
- **Tabular figures are the point of the Numbers role.** Bebas has none, which is why animated counters
  currently shift width as they count.
- **Anton was rejected on purpose.** Gorgeous for ONE hero number, punishing when the same weight repeats
  thirty times on a screen -- it flattens hierarchy.
- **The Voice must not be another sans.** Display (Clash) and Interface (Onest) are both sans. If the
  Voice is also a sans, the insight card doesn't read as a different REGISTER, it reads as a slightly
  different sans, which is worse than either committing or not bothering. A slab (Bitter) gives the coach
  an actual voice, and slabs are athletic, not newspapery.
  Justin likes Ranade because "it feels more different." If Ranade wins on device, the resolution is:
  **Ranade becomes the INTERFACE face (replacing Onest), and Bitter still carries the Voice.** Ranade must
  not be both.

### Type treatment -- type as material, not paint

- **Title**: accent GRADIENT fill (accent -> deeper accent, ~168deg), plus a 1px press.
  - The title being a flat accent color is an AI tell: a big cyan word competing with every cyan button.
  - Deep ink was tried and REJECTED (it is theme.textPrimary = near-black; violates the standing
    "no black font for titles" rule).
- **Numbers**: gradient fill (light-to-dark wash down each glyph). Same molding logic as the button.
- **Letterpress on big numbers: REJECTED.** A 1px highlight under a 52pt glyph is invisible. Letterpress
  only works on small and medium text.
- **Dark mode inverts the press.** A black shadow under light glyphs on a dark card is nothing. Dark needs
  a faint LIGHT bevel below instead. (This was a real bug in the first lab.)

### Material

- **Buttons: molded, everywhere.** `components/PrimaryCTA.tsx` ALREADY DOES THIS -- vertical gradient
  mold, accent-tinted glow instead of a black shadow, press-scale, and it already handles Dark differently
  (molds from the shadow side so bright accents don't glare). It is used in exactly TWO files
  (`support.tsx`, `log.tsx`). Every other Save / Generate / Log / Estimate button and every FAB is still a
  flat painted rectangle. **This is a rollout, not a redesign.** The circular form (FAB, home tab button)
  needs the same recipe applied.
- **Cards: glass.** Translucent + backdrop blur. The accent top edge SURVIVES glass.
- **Tab bar: frosted.** Content visibly scrolls behind it.
- **Active tab icons: accent.** Currently `CustomTabBar.tsx:239` is
  `isFocused ? theme.textPrimary : theme.textDim` -- near-black on Light. The Faith fish already goes amber
  and the home button already goes white-on-accent; the other three were simply missed. Also a direct
  violation of the standing no-black-for-prominence rule.

### Surface -- background is TWO layers, not one

Colour and texture STACK. Treating them as one list forced a false choice.

- **Layer 1, colour: bottom glow.** Medium. **Never strong** -- at strong, glass cards near the bottom
  turn into accent slabs.
- **Layer 2, texture: halftone.** Neutral ink, subtle. Dots rise from the BOTTOM and dissolve upward --
  the same gesture as the glow. One idea, not two.
- **Grain: subtle**, over everything. Nearly invisible by design: it makes flat color read as material
  instead of plastic. If you can see it as texture, it is turned up too far.

### Motion

- **Staggered card entrance**: each card fades in and rises ~12px, ~50ms apart, ~400ms total. Reanimated
  layout animations (`entering={FadeInDown.delay(i*50).springify()}`) -- roughly one prop per card.
  Highest feel-per-effort change available in the app. Today the tab switch fades the whole screen as one
  dead sheet and the cards have no entrance of their own.

### Watermarks -- keep, but quiet

The 130px Ionicon watermarks (flame / water / footsteps / body / barbell / nutrition, all at
`right:-24 bottom:-28 opacity:0.10` tinted with accentBlueRaw) are a CONSISTENT system, not an accident.
What is weak: they are a 24px UI glyph blown up 5x (no interior detail -> reads as a blob), they get
hard-clipped by the card corner, and on the Weight card the body silhouette sits directly under the input
field and the LOG button.

- Glass does NOT remove them (they live inside the card, above the fill, below the content).
- On glass they must get QUIETER: outline variant and/or a gradient fade so the mark dissolves into the
  card edge instead of being cropped.
- They must never sit under interactive content.

### The lunch row (Log tab, empty meal slot)

Two separate bugs, and fixing the width does NOT fix the icon column:

1. **Icon column.** Every repeat pill CENTERS its contents. On a wide "Repeat Yesterday - 160 kcal" the
   icon gets pushed way in from the left; on the narrow "Repeat a Previous Meal" it sits near the left
   edge. Same left edge, different icon x. Fix: left-align the pill's contents so the icon is always 10px
   in from the button's left edge.
2. **Width.** When there is no yesterday-meal, the two-slot row is thrown away for a single hugging pill,
   which reads as an orphan. Fix: keep the two-slot structure always -- "Repeat a Previous Meal" takes the
   flex:1 slot, an invisible spacer holds the "Pick a Day" slot.

A full-row button was proposed and REJECTED by Justin.

---

## OPEN -- test on device, do not decide in a browser

- **Numbers: Rajdhani vs Khand.** Both condensed and heavy. One-token swap.
- **Voice: Bitter vs Ranade.** If Ranade wins, Interface has to move so the Voice stays distinct.
- **Halftone at real screen brightness.** May be invisible, may be perfect. Ten-second check.
- **Title press on/off.** Justin was 60/40 for keeping it. On glass the press earns its keep (it separates
  the word from a background now moving underneath), but confirm.

---

## CUT -- do not resurrect

- **Topographic contours.** Best idea in the lab, worst fit. Contours only survive in the GUTTERS between
  cards, so sliced into 12px strips they read as random squiggles. It fights the card layout.
- **Mesh, Aurora, Vignette.** Different app.
- **Dot grid, line grid, stripes.** Line grid genuinely looks good and is still cut: it is a different
  idea about what the surface is, and it fights bottom-glow + halftone.
- **Deep-ink titles.** Near-black, violates the no-black-titles rule.
- **Letterpress on big numbers.** Invisible at 52pt.
- **A user-facing background PICKER (the "lab in the app" idea).** Twelve backgrounds = no look of your
  own. The code is cheap; the cost is the combinatorial audit (5 themes x every accent) and the brand
  incoherence. Whoop and Oura ship ONE opinionated identity. Justin agreed and cut it.
- **The bottom tab bar's shape/layout.** It is the most distinctive object in the app already. Frosting
  and accent icons only; no structural change.

---

## BUILD ORDER (safest first, one step at a time, confirm between each)

1. This spec + roadmap entry. [DONE]
2. Lunch row fix + active tab icons go accent. Two one-liners, zero risk. Pure JS.
3. **Fonts.** Load the faces, add type-role tokens to `theme.tsx`, migrate Home first, then screen by
   screen. THE BIG ONE: hundreds of hardcoded `fontFamily` strings across the app. Pure JS (font files
   bundle through Metro; no native rebuild).
4. Molded buttons: roll `PrimaryCTA` out screen by screen. Pure JS.
5. Background: bottom glow + halftone + grain. Pure JS (react-native-svg is already a dependency).
6. Glass cards.
7. Frosted tab bar + gradient number fill. **NEEDS A NATIVE REBUILD** (`expo-blur`, and a masked-view for
   gradient-filled text).
8. Card stagger (Reanimated layout animations). Pure JS.

## AUDIT GATE (every step)

- All 5 themes x every accent. Justin's primary is Light + cyan.
- Every coaching mode. Mindful in particular: does the mold/glow/stagger read as pressure?
- Three Gate Rule: works / looks premium / feels right.
- Tooltips, tutorials, and Otto's KB do NOT need updating for this work -- nothing here changes a
  calculation, rule, count, or behavior. It is presentation only. (Re-check if that stops being true.)
