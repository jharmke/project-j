# SPEC -- Visual Refresh (type, material, surface)

Status: IN PROGRESS. Decided AND largely built 2026-07-14. This file is the source of truth for the
refresh. Roadmap points here. Nothing in here ships without Justin seeing it on device first.

SHIPPED so far: the surface (flat ground + bottom glow + halftone + grain, glass cards, absolute glass
tab bar and header, per-theme shadows, bgSelected), the four-role type system, the type sweep across all 6
tabs + 43 stack screens + 42 components, the font-packaging patch, and BOTH HEADER COMPONENTS (see below).

STILL OPEN: the SURFACE pass (22 stack screens still top-lit), the VOICE pass, the Journal slide-up sheet,
the molded-button rollout, chip shine, title gradient, card stagger, Warm + Blush getting the Light
treatment, and a few non-modal number-face stragglers. (Roadmap NEXT UP has the ranked list.)

---

## HEADERS -- two components own every header (DONE 2026-07-14)

A style guide is what the app HAD, and it drifted anyway (seven page-title sizes, three treatments). So
headers are now actual COMPONENTS. Two of them, because a page and a modal are different objects.

**`components/ScreenHeader.tsx` -- every pushed SCREEN.** Bare chevron (never boxed -- a tinted box reads
as an action; never the text "<- Back"), then the title. `PAGE_TITLE` token: **28px Clash, accent, mixed
case, LEFT-aligned** (a page's content is left-aligned, so the title shares that edge). No eyebrow above a
title, ever. Optional right slot, subtitle, subRow (date nav / filter pills), onTitlePress (Settings'
7-tap dev unlock), colour override, topInset. On all 34 pushed screens. Bible keeps its own header (title
is a book-picker dropdown); Report keeps its toolbar (title is an editable field in the printable doc).

**`components/ModalHeader.tsx` -- every titled MODAL.** Same face/colour as a page title but **20px** (a
modal is a smaller surface), still LEFT-aligned (a modal's content is left-aligned too, and the page you
opened FROM has a left title -- centring makes it jump on open). Centred handle pill (drags/taps to close).
An explicit **X top-right is the DEFAULT** -- the one unambiguous close (the pill's native meaning is
"drag", tap-outside is invisible and risks losing a half-typed form). Optional subtitle, subRow, right
slot (sits LEFT of the X), colour override (faith modals go amber), showClose.

RULES for which treatment a modal gets:
- **Full-bleed sheet** (content edge to edge) -> ModalHeader (pill + left title + X).
- **Padded compact card** (its own paddingHorizontal, smaller) -> title-FACE fix only (ModalHeader would
  double the padding). Day Summary, the prayer cards, New Tag went this way.
- **A FORM card with unsaved input** is the case that earns an explicit X even when padded (data-loss guard
  -- tap-outside must not silently discard typed input).
- **Compact dialog** whose heading is a small uiBold caps LABEL (Workout Duration, Finish summary, the
  date pickers) -> left as-is. Not the number-face bug; a 20px Clash title would read top-heavy there.
- **No-title picker / dropdown** (colour picker, fill-from-preset) -> nothing to do.
- Day Detail is ALWAYS a sheet (its /day-detail page route is never navigated to) -> ModalHeader at 20px,
  NOT the 28px page title. Host sheets' external handle pills were removed so there is exactly one pill.

THE RECURRING TRAP, logged so it is not repeated: DO NOT declare the modal sweep "done" from memory. A
grep-backed scan (`Type.num` at title size + title tracking, per file) found modals that a memory-based
claim missed (RepeatMeal, BibleStartGuide, DayScoreDisclaimer, Otto Notifications). Scan, don't assert.

---

## ⚠️ THE FONT BUG -- READ BEFORE TOUCHING ANY WEIGHT

This cost an entire afternoon and it will cost another one if it is ever forgotten.

**Fontshare ships Ranade and Clash Display as ONE FAMILY PER WEIGHT** -- `Ranade-Light.ttf` internally
declares its family as "Ranade Light", `Ranade-Medium.ttf` declares "Ranade Medium", and so on -- rather
than one family carrying four cuts. **iOS resolves a React Native `fontFamily` string against a font's
internal names, and a miss falls back SILENTLY.** It never throws. So every Ranade weight collapsed onto
a single face, and the app rendered one cut no matter what the code asked for.

**The symptom, and the lesson:** three separate weight changes to the coach voice produced ZERO pixels of
difference on device. Justin flagged it himself early ("did you do anything to the voice? it still feels
very bold?") right after the body had been dropped to Light. Instead of chasing that, I treated it as a
taste problem for three more rounds -- chased colour, shipped a `textMuted` body that is PURPLE on Light
and gave the card five hues, and told Justin the title/body hierarchy was broken when it never was (they
have shared an ink since long before the refresh).

> **A weight change that produces no visible response is a BUG, not a design failure.**
> Two or three no-ops in a row means stop designing and go look at the font.

**The fix (done):** the six .ttf `name` tables are patched so each cut is its own one-face family named
exactly what the code asks for (`Ranade-Light`, `ClashDisplay-Bold`, ...). Glyphs untouched; every other
table copied through byte-for-byte, file repacked, checksums recomputed. Originals were backed up first.
Patcher script lived in the session scratchpad -- **if new Fontshare weights are ever added, they MUST be
patched the same way or they will silently collapse again.**

**The instrument:** an on-device specimen block -- the same sentence rendered in all four Ranade cuts,
plus an **Onest 400/700 control**. The control is the part that makes it conclusive: it proves the screen
can render a weight difference at all, so an all-identical Ranade block cannot be blamed on the display.
Rebuild that specimen for any future font that behaves strangely.

**Clash had the same bug latent.** `Type.displayBold` had zero usages, so it cost nothing -- but it would
have bitten the first time anyone set a bold title.

Also worth knowing: **Onest and Rajdhani were never affected.** They come from `@expo-google-fonts`
packages, which are packaged correctly. Only hand-dropped Fontshare `.ttf` files have this problem.
**Prefer a Google-Fonts-packaged face whenever one will do.**

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

### The lunch row (Log tab, empty meal slot) -- RESOLVED 2026-07-15, and the whole row is gone

Both bugs below were fixed, then OVERTAKEN: the pills no longer live on the collapsed row at all. A fresh
morning put 2 pills on every empty slot (~10 buttons) and the repeat SHORTCUT out-shouted the `+` that is
the row's real primary action, so the pills moved INTO the expanded slot and the collapsed row now carries
a muted "Expand to repeat a meal" scent line in its blank subtitle slot. Full post-mortem + the copy ledger
live in project_j_roadmap_archive.md (2026-07-15). Kept here for the history:

1. **Icon column.** Every repeat pill CENTERED its contents, so the icon landed at a different x on every
   row. Fixed by left-aligning the pill's contents; STILL LIVE (the pills kept this in the tray).
2. **Width.** When there was no yesterday-meal, the two-slot row was thrown away for a single hugging pill,
   which read as an orphan. Fixed with an invisible spacer holding the "Pick a Day" slot. NOW DROPPED: that
   spacer aligned the icon column DOWN the meal stack, and no such column exists once the pills are in
   trays.

A full-row button was proposed and REJECTED by Justin (NOTE 2026-07-15: re-proposed by me from scratch when
the pills felt "plastic-y" in the tray, not knowing it had already been killed. He passed again. Read this
line before proposing it a third time.)

CENTERING the pills was also tried and rejected on 07-15: the tray has a left-aligned text line
establishing an edge, so a centered pair floats against nothing. Left-aligned wins.

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
| Voice | **Ranade** | ✅ **FACE LOCKED** -- "I really like the voice font" |
| Voice weight | Ranade Light body | ❌ Once the fonts ACTUALLY WORKED, Light read as too thin. (Every judgement of Ranade before the font patch was worthless -- see the font bug above.) |
| Voice weight | **Regular body / Medium emphasis / Bold title** | ✅ **LOCKED.** Ranade is a chunky face, so its body sits a step below where a sans body would. Bold-over-Regular restores the 4-step spread DM Sans always had (700 vs 400) |

Three bugs that polluted early verdicts, all mine, all fixed:
- **The font packaging bug.** See the top of this file. It invalidated EVERY voice-weight judgement made
  before it was found.
- **Clipped numbers.** Every number style carried a lineHeight hand-tuned to Bebas (the calorie number was
  52/56). Bebas is all-caps with no ascenders so it fits a tight box; Rajdhani and Khand have real
  ascenders and got their tops sliced. Fixed by `numLine()` in typography.ts -- any number style that sets
  an explicit lineHeight MUST run it through that, never keep the old value.
- **Everything mapped to its BOLD cut.** Bebas ships one weight that reads optically MEDIUM, so pointing a
  role at a 700 made every value shout at once. That reads as "this font is too heavy" when the font was
  fine and the weight was wrong.

### Rules the sweep taught us

- **Bebas was doing THREE jobs, so `Bebas -> Num` is not always right.** A script maps it faithfully and
  will happily put Rajdhani -- a condensed TABULAR face built for values -- on the app's primary CTA
  label. A button label is INTERFACE. Modal titles are DISPLAY. Check every Bebas site the script touches.
- **Voice is for SPEECH, not for data.** "Your body is ready to perform." is the coach talking -> Voice.
  A bed time ("9:41 PM -> 6:01 AM") is a value -> Numbers/Interface, never Voice. Putting data in the
  voice face is the same category error that turned Bebas into wallpaper.
- **Do not lighten text with `textMuted` on Light.** It is `#6666aa` -- a PURPLE. It lightens by changing
  HUE, and on a card that already carries an accent label and a coloured chip it hands you a fifth colour.
  Carry hierarchy on the WEIGHT axis and leave the ink alone.
- **Card labels use ONE recipe app-wide:** `styles.cardLabel` + `theme.textMuted`, icon at size 11 in
  `textMuted`. Coach Insight was the lone accent-coloured label on Home -- invisible on the old flat white
  page, wrong the moment the page started glowing accent. Same class of bug as Stats' section headers.
- **"Plastic" comes from REPETITION, not width.** This started life as a rule called SHINE SCALES WITH AREA:
  Justin called the 190px Repeat pills "plastic-y", and I concluded a wide button spreads the gloss into a
  Web-2.0 candy panel. That rule made a prediction -- full-width buttons will go plastic -- and on 2026-07-15
  the prediction FAILED. workout-library's LOAD PROGRAM / LOAD ROUTINE are FULL CARD WIDTH, roughly double
  the Repeat pill, took the default 0.52 gloss unchanged, and Justin's verdict was "honestly i like it".
  What actually differed: the pills came TWO PER SLOT across up to 8 slots, and his "plastic-y" landed in the
  same breath as "8-10 of these buttons yelling at you". LOAD ROUTINE is ONE button per card with air around
  it. So the variable was never size -- it was how many glossy faces the eye takes in at once. This is not a
  new rule at all; it is DON'T OVER-GLAZE wearing a costume. A wide button alone is fine. Ten glossy
  chiclets in a scroll column are not. Do not "fix" a plastic feeling by tuning the gloss down until you
  have counted how many are on screen.
- **`accentBlueBg` is NOT a button.** The tint marks selected rows, food entries, badges and containers too.
  Of 92 `accentBlueBg` + `accentBlueBorder` hits on tappable-looking elements, real shine candidates were a
  minority: the Achievements "EARNED" badge is a plain `View`, and Bible's Reflect bar is a button AND a
  toolbar sharing one skin. VERIFY TAPPABILITY IN THE CODE, and read the WHOLE element -- I called the
  Reflect bar "not tappable" off its container line and was wrong; its left `flex:1` region is a tap target.
- **Don't extrapolate a lesson past its case.** "Gloss is invisible on white/near-white fills" is TRUE of
  actual white fills (selectors' unselected states) and FALSE of a 10% accent tint -- `HeaderIconButton`
  uses the tint recipe at 0.52 and shines fine. I quoted the rule at Justin to argue the Repeat pills
  couldn't shine on Light; he pushed back ("idk why it wouldnt shine since literally every other icon is
  shining right now") and he was right. Check the code, not the memory of a rule.
- **The filled-icon rule has ONE blind spot: the barcode.** Header icons are filled-only because outline
  glyphs go faint on light themes. But a barcode IS thin lines -- `barcode` (filled) just thickens the bars
  until they merge into a grey grate at 14px ("looks like a grate"). It stays `barcode-outline` at 18 while
  its BOX stays the standard 32. Generalise: the rule is about FAINTNESS, so a glyph whose meaning is fine
  line detail is outside it. Icon size may vary for legibility; the BOX is what must stay consistent.

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

- **Title press on/off.** Justin was 60/40 for keeping it. On glass the press earns its keep (it separates
  the word from a background now moving underneath), but confirm.
- **Title accent-GRADIENT fill.** Still flat accent in-app. The gradient machinery exists
  (`GradientNumber` + masked-view) and is already carrying the hero numbers; titles never got it.
- **Chip / tinted-button top shine.** BUILT and rolling out. DONE: tab-header squares, Library pills,
  "+ Log", water buttons, HR Zones/Tags, selected effort tile, Repeat/Pick-a-Day, and the stack-screen
  header squares (Bible + Add Food -> `HeaderIconButton`, Bible's Mark Read, Achievements' EARNED badge).
  REMAINING: the BODY tinted buttons per screen (workout-library is the big one at 13) -- see the roadmap's
  catalog for the full breakdown of what is a button vs a selector vs a bare icon.
- **Bible's Reflect bar does DOUBLE DUTY -- own design pass.** One tinted strip is BOTH a button (the left
  `flex:1` region opens the reflection modal / the journal) AND a toolbar of four unrelated icon buttons
  (sun / star / share / Halo). The tint claims "one thing you press" while four parts do four things and
  only the left half does what the label says. REFUSED shine 2026-07-15: a gloss would double down on the
  lie, and it is the widest surface in the app so it would go plastic regardless. Flat is correct for now
  (tier-3 passive) but that is symptom-treatment. FIX = split it: "Reflect" becomes a real tinted pill that
  shines, the four icons go on a flat strip or the page. NOT free -- sun + star are TUTORIAL TARGETS.
- **Grain on big saturated buttons.** Justin: reads as too much on the Workout tab's large buttons.
  Deliberately deferred -- revisit once everything else has landed.
- **Stats section subtext colour.** Deferred on purpose until the fonts are done everywhere, so the same
  text is not tuned twice.

RESOLVED: Numbers = Rajdhani Bold. Display = Clash Display. Interface = Onest.
Voice = Ranade -- **Regular body / Medium emphasis / Bold title**.
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

1. This spec + roadmap entry. **[DONE]**
2. Lunch row fix + active tab icons go accent. **[DONE]**
3. **Fonts.** typography.ts + the four roles. Home, then the 6 tabs, then 42 components -- 406 font refs.
   **[DONE for tabs + components]**
4. Background: flat ground + bottom glow + halftone + grain. **[DONE]**
5. Glass cards + absolute glass tab bar and header + per-theme shadows + bgSelected. **[DONE]**
6. Gradient number fill (masked-view). **[DONE]** -- needed the native rebuild, which is spent.
7. **Font packaging patch.** **[DONE]** -- see the top of this file.
8. **-> NEXT: the ~30 stack screens.** Settings, add-food, Bible reader, Effort vs Results, the reports,
   onboarding, journal, prayer. Still on Bebas + DM Sans, so there is a visible seam the moment you leave
   a tab. Mostly mechanical (the sweep script), but see "Rules the sweep taught us" -- it cannot judge
   Bebas's three jobs for you.
9. **The voice pass.** The judgement calls a script cannot make. Ranade currently lives on SIX lines, all
   on Home (Coach Insight title + body, the readiness line, the Recovery and Sleep AI tips, one line on
   the Weight card). EvR's insight copy, Otto's chat bubbles, the verses and devotionals are where the
   voice actually earns its keep. Otto's bubbles are the single biggest win available: HIS bubbles are
   voice, YOURS stay Interface -- that contrast is the point.
10. A single readability pass once the fonts are everywhere.
11. Molded button rollout (see PARKED) -- including the row-height bug.
12. Chip top-shine + title accent-gradient.
13. Card stagger (Reanimated `FadeInDown.delay(i*50).springify()`). Pure JS.
14. Warm + Blush get the Light treatment once Light is signed off.
15. `bgSelected` sweep for modals and stack screens as they get converted.

## AUDIT GATE (every step)

- All 5 themes x every accent. Justin's primary is Light + cyan.
- Every coaching mode. Mindful in particular: does the mold/glow/stagger read as pressure?
- Three Gate Rule: works / looks premium / feels right.
- Tooltips, tutorials, and Otto's KB do NOT need updating for this work -- nothing here changes a
  calculation, rule, count, or behavior. It is presentation only. (Re-check if that stops being true.)
