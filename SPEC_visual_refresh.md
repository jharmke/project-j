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

## THE LEDGER -- what was actually tried on device, and the verdict

Kept here because it was getting lost in chat and Justin was (rightly) losing track. PROCESS RULE learned
the hard way: change ONE variable per look. Early rounds changed face + weight + size together, so nothing
could be isolated and two rounds were judged on a screen with a rendering bug.

| Role | Tried | Verdict |
|---|---|---|
| Display | **Clash Display Semibold** | ✅ **LOCKED.** Liked immediately, twice. Oswald + Fraunces are loaded but never seen in-app; only look if Clash ever sours |
| Interface | **Onest** | ✅ **LOCKED.** Never once mentioned, which is exactly what a good interface face does |
| Numbers | Rajdhani Bold 700 | "I think I like it" (but the tops were clipped -- see below) |
| Numbers | Khand Bold 700 | ❌ "too bold and big" (also clipped) |
| Numbers | Khand Medium 500 | ❌ "too small/plain" |
| Numbers | Khand SemiBold 600 | ❌ "looks exactly like what we started with" -- and he was right. Khand SemiBold and Bebas sit in the same visual niche, so the swap bought nothing |
| Numbers | **Rajdhani Bold 700 (unclipped)** | ✅ **LOCKED.** "def the best so far" |
| Voice | Bitter (slab) | ❌ "def feels like a newspaper". Which is what a book serif IS. My call, and it was wrong |
| Voice | **Ranade** | ✅ FACE LOCKED -- "I really like the voice font". WEIGHT still open (reads too heavy) |

Two bugs that polluted early verdicts, both mine, both fixed:
- **Clipped numbers.** Every number style carried a lineHeight hand-tuned to Bebas (the calorie number was
  52/56). Bebas is all-caps with no ascenders so it fits a tight box; Rajdhani and Khand have real
  ascenders and got their tops sliced. Fixed by `numLine()` in typography.ts -- any number style that sets
  an explicit lineHeight MUST run it through that, never keep the old value.
- **Everything mapped to its BOLD cut.** Bebas ships one weight that reads optically MEDIUM, so pointing a
  role at a 700 made every value shout at once. That reads as "this font is too heavy" when the font was
  fine and the weight was wrong.

## PARKED -- molded button rollout (started, not finished)

Proven on three buttons and Justin signed off: Generate Analysis (diagnostic-report), Estimate My Meal +
Add to Log (ai-meal-estimator, both the results-page hero and the confirm modal). Disabled states verified.

Remaining:
- **Sweep the other ~13 files' primary CTAs.** Mechanical now the pattern is proven.
- **Circular variant + the FABs.** PrimaryCTA has no circular form yet; the app has a pile of 44/56px
  accent circles (add-food, workout, bible scroll-speed, quick-add) that want the same mould.
- **BUG in PrimaryCTA: a CTA in a row does not match its sibling's height.** The glow WRAPPER stretches
  with the row but the button FACE inside it keeps its natural height, so a Cancel/Confirm pair comes out
  uneven. Seen in the AI-estimator confirm modal. faceStyle was added as a stopgap and does NOT fix it.
  Fix inside the component during the sweep, not per call site.

NOT molding (deliberate, do not "fix" these):
- Entry-point / doorway buttons (Stats > Open Analysis, Comparison, etc). Solid fill is reserved for a
  screen's ONE primary action; molding every doorway would put six competing solid buttons on Stats.
- Progress-bar fills, workout set checkboxes, profile picker dots. They are solid accent but they are not
  buttons.
- Home's weight Log button. It is already the tinted secondary recipe, by design.
- Cancel is NOT red. Red is the destructive colour (delete/remove). Cancel dismisses; nothing is lost.

## OPEN -- test on device, do not decide in a browser

- **Voice WEIGHT.** The face is settled (Ranade). Ranade-Light (usWeightClass 300, verified in the actual
  file) still reads heavy next to Onest. Two possibilities and they need different fixes: either Ranade's
  Light genuinely is that dense (it is a low-contrast, big-x-height face), or the weight is not resolving
  on iOS at all. DIAGNOSTIC: set the body to Light and the title to Bold. If they look identical, it is a
  loading problem, not a taste problem.
- **Halftone at real screen brightness.** May be invisible, may be perfect. Ten-second check.
- **Title press on/off.** Justin was 60/40 for keeping it. On glass the press earns its keep (it separates
  the word from a background now moving underneath), but confirm.

RESOLVED: Numbers = Rajdhani Bold. Voice face = Ranade. Display = Clash Display. Interface = Onest.
The "if Ranade wins the Voice, Interface must move" rule is DROPPED -- Clash (display) and Onest
(deliberately invisible) leave Ranade plenty of room to have its own register between them.

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
