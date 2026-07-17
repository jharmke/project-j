# Project J -- Active Roadmap
# Read this at the start of every session.
# Completed/shipped detail lives in project_j_roadmap_archive.md (reference only when needed).
# Parked/future items live in project_j_backlog.md.
# Tags: [BUG] = confirmed broken | [HIGH] = priority | [ ] = open task | no tag = SOON/open
#
# UPKEEP RULE (this is how the file stopped bloating): when something ships, give it ONE line under
# "RECENTLY SHIPPED" here and move the detailed writeup to project_j_roadmap_archive.md the SAME
# session. Never let completed post-mortems accumulate in this file.

---

## 🔴 DO THIS NEXT (time-boxed, do not let it slide)
- [ ] **ROTATE THE ANTHROPIC API KEY. Target: ~2026-07-18 (5 days after the 2026-07-13 TestFlight push).**
  The key was bundled client-side in every build before 2026-07-01. The CODE is fixed (all calls go through the
  aiProxy Cloud Function) but **the exposed key is still live** -- anyone holding an old build can extract it and
  spend Justin's money. Checked 2026-07-13: Anthropic usage shows NO abuse (the spikes line up exactly with
  Justin's own dev sessions), and the $50/mo cap bounds the damage. But it has been open since 2026-07-01.
  WHY IT WASN'T DONE IMMEDIATELY: testers on OLD builds still use that key, so rotating breaks their Otto, Halo,
  and meal estimator. The 2026-07-13 TestFlight build (which routes through the proxy) went out on that date with
  "please install this week, AI stops working on the old build" in the release notes.
  DO NOT WAIT FOR 100% OF TESTERS. Check App Store Connect > TestFlight > the build for the install count, give it
  ~5 days, then rotate regardless. Anyone still on an old build simply loses AI until they update -- which is the
  nudge. Nothing else breaks for them.
  STEPS: regenerate the key in the Anthropic console -> `firebase functions:secrets:set ANTHROPIC_API_KEY` ->
  redeploy the functions that use it (aiProxy, appCompanion, faithCompanion) -> REVOKE the old key.

---

## 🆕 RECENTLY SHIPPED (one line each; full detail in project_j_roadmap_archive.md)
- 2026-07-16 **THE COACHING MODE NOW COLOURS THE FLOW, LIVE + Commitment CUT + the step count made honest.**
  Tap Discipline on Your Style and the page repaints orange on the spot (glow, title, bar, pills, graph,
  calorie number, disclaimer modal, CTA); Mindful -> green; and Apple Health, Notifications and All Set
  carry it. FAITH JOURNEY IS EXEMPT BY JUSTIN'S CALL -- it keeps its amber; faith identity outranks mode.
  >> I PUSHED BACK ON THIS AND WAS WRONG. I argued a mode-coloured flow "teaches a lie the app doesn't
  keep" -- from memory of CLAUDE.md, without opening the code. all-set.tsx ALREADY ends the flow with
  setAccent() derived from styleMode, so the mode colour IS the accent the user walks away with. The
  recolour is a live preview of their app, not a costume. **Justin's instinct beat my reasoning-from-memory
  twice in one hour** (see the 'green' trap below). Read the code first.
  >> THE 'green' TRAP, DO NOT "FIX" IT: in the light theme the accent whose ID is `'green'` is LABELLED
  "Blue" (#1a44c2). all-set granting Balanced accentId 'green' is CORRECT. I called it a bug off the ID.
  Colours now live in `utils/modeAccent.ts` with this documented. Fixed on the way: the mode cards and
  all-set were painting hand-picked LOOKALIKES (balanced #2563eb vs the real #1a44c2, mindful #059669 vs
  #0d9268) -- the colour you tapped was a near-miss of the colour you got.
  >> PREVIEW COULD NOT SHOW IT: Your Style's preview branch returns before the pj_settings write, so
  downstream screens read the OLD stored mode and stayed blue. Fixed with an in-memory sessionStyleMode set
  on Continue in both modes and preferred over storage downstream (preview still writes NOTHING). Also
  fixed the Mindful COPY on Notifications, wrong in preview for the same reason.
  >> **COMMITMENT SCREEN CUT.** Corny (three vows all opening "I will" -- a wedding-vow cadence) and, being
  Discipline-ONLY, it broke the counter: Balanced/Mindful went step 3 -> 5 and never saw a 4. Flow is now a
  uniform 6 steps. Faith Journey and Apple Health were ALSO still saying "of 8" with bars on a different
  scale (faith: "5 of 8" at 70%) -- neither number was true. All six now honest: 17/33/50/67/83/100%.
  >> Your Style also got: the targets disclaimer (inline line + first-use modal on a 700ms delay so it
  stops landing mid-transition), bottom padding over the CTA, and "I'm Ready" killed for plain "Continue".
- 2026-07-16 **Onboarding screen 3 (Your Style) + the frosted top bar on steps 1-3.** Ground + glow, frosted
  footer, PrimaryCTA mixed case, opaque+shine selected states (the 3 mode cards keep their OWN colours),
  9 lifestyle/training boxes bumped 12/10 -> 13/11, macro ratios colour-coded P/C/F, pace pills out of a
  hidden horizontal scroller into a 3x3 grid, step relabeled 4-of-8 -> 3-of-7, every dim label off textDim,
  section names 9px/ls3 -> 11px/ls2 (they dissolved into the page when scrolled).
  >> **THE PROJECTION GRAPH WAS LYING.** The engine is a flat deficit -- a STRAIGHT line -- and the chart
  drew an ease-out bezier: a plunge flattening into a plateau the math never predicted. Rebuilt as THE FAN:
  every pace drawn from the same origin to the same goal weight, alternatives as hairlines, yours solid, so
  slope = pace and the x-axis is pinned to the gentlest pace's clock. Dead space became the trade-off itself.
  Weight gridlines + dated x labels; NO vertical rules (you read a VALUE off a weight rule, only a POSITION
  off a time one -- the label already gives it, the rules were furniture). Goal date is now the card's
  HEADER with a rule under it: as loose SVG text it read as floating because it WAS floating, and every
  in-plot position collided with either a gridline, "Today", or a tick.
  >> Also: Done bar over the decimal-pad (the one iOS keyboard with no return key -- both weight fields were
  dead ends). Footer stays DOWN when the keyboard opens; riding it put Continue over the field being typed.
  >> GOTCHAS BANKED: an InputAccessoryView binds to ONE input -- two fields sharing a nativeID means the
  second silently gets nothing, so one ID per field. `{value} LBS BY` inside SvgText is TWO text runs and
  textAnchor="end" anchors each independently -> glyphs stack into mush; interpolate before it reaches
  SvgText. letterSpacing was NOT the cause (a wasted fix).
- 2026-07-16 **THE PAGE SWEEP -- EVERY PAGE IN THE APP.** Tab by tab, Justin's order, pages only (modals
  excluded by his call). Each screen got the glow + real per-theme card shadows. LOG: add-food, food-detail
  (incl. Edit Entry), recipe-builder, recipe-log, ai-meal-estimator. WORKOUT: workout-library (which IS
  "Add to Today" -- same file, different title in select mode; the tab pushes nowhere else). STATS: day/
  weekly/monthly summary, the EvR pair, the reports pair, challenges, challenge-create, comparison-report.
  FAITH: prayer, devotional (bible + plans already had the amber glow). SETTINGS: support, whats-new,
  adaptive-target, mission, tutorials, definitions.
  >> STRUCTURAL FIXES FOUND ON THE WAY (not paint):
  - **The REPORT is now a document.** Its blocks were cards floating on a mystery slab; the slab was an
    EXPORT ARTIFACT (a `bgPrimary` wrapper painted so the share-image had a solid background) that was
    invisible only because the page used to be the same colour. Justin: "why are achievements earned and
    challenge history their own separate cards? this is disgusting." Now ONE white document card, blocks are
    SECTIONS with hairline rules, disclaimer inside. The export gets a real document instead of a screenshot
    of boxes.
  - **Two pinned "save bars" that were not save bars.** Reports' New Report and Challenge Create's Start
    Challenge both wore the floating-save-bar chrome (opaque block + top border) permanently -- that pattern
    is for a contextual save that animates in when there are unsaved changes. Both are create actions with
    nothing pending. Moved INTO the scroll; the glued block and the Otto collision died together. (Justin
    on the FAB alternative: "stupid to have a fab for literally one thing. 2 clicks for no reason.")
  - **AI estimator: "Possibly not included" onto a card.** It was the only naked content on a page made of
    cards -- and it is the AI telling you what it MISSED, i.e. the thing you most need to read before
    logging. Darkening the text would have treated the symptom.
  - **Recipe Log:** ingredients onto a card; the amount input MERGED into the nutrition card (they were one
    interaction split across two surfaces -- you type an amount, the thing below tells you what it IS, and
    the answer's own title just echoes the question back). Macro row was top-aligned with Calories at 32px
    and the macros at 22, so the small numbers floated high -> bottom-aligned, shared baseline.
  - **Sleep gear Save** was a flat green slab with NO dim state -- and its handler's first line is
    `if(!bed||!wake) return`, so with a time missing it looked live, took the tap, fired a haptic and did
    nothing. Molded + disabled.
  - **"End challenge" was unfindable** (Justin: "took me forever how to see how to cancel a challenge") --
    the only way to cancel, rendered in textDim, the dimmest token in the app, unstyled. Now red + semibold.
  - **Otto clearance** on recipe-log, weekly, monthly, comparison, report (content clears the FAB, never the
    reverse -- Otto is bottom-left on EVERY screen, so moving him on one page breaks the other thirty).
  >> Also: opaque selected states wherever a control sits on the page (challenge-create's 9 pills, the
  estimator's portion chips, recipe-log's toggle, report's Done Adding Blocks); red trash cans; molded
  Got it buttons; Recovery purple + the recovery coach sparkle off the GREEN status colour (green means
  "good" -- a neutral AI marker wearing it implied your recovery was fine regardless of what the coach said).
  >> SYNCED-WORKOUTS DID NOT NEED ANY OF THIS -- it is a dev tool behind the 7-tap Dev Tools section, and I
  polished it because it showed up in a grep and I never asked what it was. Anything under Dev Tools is out
  of scope; Settings' whole dev section got the same wasted treatment.
- 2026-07-16 **THE CARD SHADOWS WERE NEVER RENDERING. APP-WIDE. HALF-FIXED -- SEE NEXT UP.** Root cause:
  a shadow and `overflow:'hidden'` on the SAME view. iOS masksToBounds clips the view's own shadow, so the
  shadow silently does not exist at any opacity. `components/GradientCard.tsx` ALREADY carried the rule in
  its header ("Never put overflow:'hidden' on the card (kills the shadow)") and it had been violated
  everywhere. Consequence: since the visual refresh, NO Home/Log/Workout/Stats card has had a shadow, while
  the whole design leans on "cards float on SHADOW not value-contrast" -- Justin spent weeks tuning ground,
  glow, halftone and grain to buy depth that was being deleted. Also means every cardShadow/cardShadowOpacity
  token was NEVER visually validated. FIXED: Settings (shadow -> a `sectionShadow` wrapper; the face keeps
  overflow for the collapse clip) + all 13 HOME cards. 11 of those needed no wrapper at all -- their only
  reason for overflow was the 130px corner watermark, so a new self-clipping `CardWatermark` (in
  GradientCard, same trick as ButtonShine/FabDome) clips the icon and the card keeps its shadow. The 2
  carousels (Sleep, Coach Insight tips) got the wrapper -- Justin's call, and correct: the shadow rides the
  static parent, the carousel clips inside it. Coach tips card was ALSO on a hardcoded black @0.12 -> theme
  token. Device-verified 5 themes: Light/Slate/Warm/Blush all read right. DARK CANNOT: its shadow is black
  on a near-black page -- unfixable by any number, and unnecessary (its cards have real value contrast). If
  Dark ever wants depth the tool is a light TOP rim, not a shadow. Warm/Blush cardShadowOpacity 0.18/0.16 ->
  0.30 (cream-on-cream had no value edge). ALSO FIXED, same session: Log's water card, Stats' 4 cards,
  Workout's REST DAY + SUPERSET group, Faith's Bible-and-Plans + Prayer cards, GratitudeStreakCard,
  MembershipCard (Profile + Settings). NOT DONE: the modals + the stack screens, see NEXT UP.
  >> **FIVE WAYS A SHADOW GOES INVISIBLE. All five found on 2026-07-16.** (1) overflow:'hidden' on the same
  view. (2) overflow:'hidden' on a PARENT (journal) -- a clip eats its children's shadows too. (3) shadowColor
  + shadowOpacity set but NO shadowOffset/shadowRadius (log's AI-estimator card) -- iOS then draws a
  zero-radius shadow at zero offset, hidden exactly behind the card. (4) offset 0,0 (the faith cards) -- a
  HALO, not a lift; it rings the card and elevates nothing. (5) **the shadow was simply never written**
  (synced-workouts, body-measurement-log, food-detail's nutritionCard, ai-meal-estimator's 4 cards). #5 is
  the one that matters most: nothing is broken, so NOTHING finds it -- not a grep for overflow, not a grep
  for '#000'. Those cards read fine for months because Light's OLD grey ground (#e3e6ee) gave a white card
  enough value contrast to survive without one; brightening the ground to #f2f3f7 took that away.
  >> SO: **there is no search that proves this work is done.** The only reliable check is opening a screen
  and asking "does every card here have a theme shadow?". Justin has caught several after I called it
  complete (Gratitude, the earned badges, the log-measurements cards, the Promise card). Expect more.
  >> TWO MORE WAYS A SHADOW GOES INVISIBLE, both found the same session: (a) Log's AI-estimator card set
  shadowColor + shadowOpacity but NO shadowOffset/shadowRadius/elevation -- iOS then draws a zero-radius
  shadow at zero offset, i.e. hidden exactly behind the card. It was styled fully inline and never inherited
  those from styles.card. (b) A shadow with offset 0,0 (Faith's cards) is a HALO, not a lift -- it rings the
  card and elevates nothing, which is why Today's Message still read flat after the fog was dialled out.
  >> ROOT PATTERN -- and the reason this will happen again: EVERY card hand-rolls its own shadow (5 props,
  copied per card, dozens of times). That is why we found FOUR different failure modes in one session:
  hardcoded black, wrong opacity, missing offset/radius, clipped away. `components/GradientCard.tsx` is
  the canonical card and even STATES the no-overflow rule in its header -- but of the 12 files that touch
  it, nearly all import only `CardWash` and hand-roll the body. GradientCard's OWN shadow is hardcoded
  '#000' @0.12, so migrating to it today would make cards WORSE. `components/IFCard.tsx` had already
  diagnosed and correctly fixed this bug on its own (its comment: "rounded corners or cast a shadow, never
  both"). The knowledge existed in the codebase twice and cards kept getting built broken anyway. Backlog
  item filed: centralize the card shadow.
- 2026-07-16 LIGHT: THE BRIGHT-GROUND FALLOUT. Brightening Light's ground (#e3e6ee -> #f2f3f7, see the
  SURFACE PASS entry) fixed the pages and quietly erased everything sitting ON them, because the app leaned
  on value contrast it no longer had. Two fixes: (1) `bgInput`/`bgInset` #f5f5fa -> **#e9ecf3**. Those are
  ONE shared paint behind every text field, option row, stat tile and pace pill -- and #f5f5fa vs the
  #f2f3f7 ground is the same colour to the eye, so all of them dissolved (worst at the TOP of a page, where
  the bottom glow has faded and the ground is brightest). It was also BACKWARDS: an input is a WELL and must
  read as carved INTO the page (darker); #f5f5fa was LIGHTER, which is what a raised object does. Every
  other theme already had its inset darker than its ground -- Light was the outlier. (2) `borderInput`
  0.12 -> **0.20**: with almost no fill difference left, the outline was carrying these boxes alone and at
  12% black it could not. Profile's 3 estimate tiles + the Projected box had NO border at all (fill only) ->
  given the standard 0.5 outline. Light only; the other 4 themes untouched.
  >> THE FILL WAS REVERTED the same day (#e9ecf3 -> back to #f5f5fa) and the round-trip IS the lesson: the
  deepening was only ever compensating for a border too weak to be seen. Once the border was fixed, the dark
  fill was redundant AND wrong -- on a page made of white cards, "slightly darker than the ground" also reads
  as "obviously darker than every card around it", so an input became a grey HOLE punched in the page
  (Justin, on the AI estimator's Meal Name field). **If these ever go faint again, reach for the BORDER, not
  the fill.** The borderInput 0.20 bump stayed.
- 2026-07-16 **THE RULE THAT MAKES THE GLOW SAFE** (earned the hard way, ~6 separate failures). Every single
  "the glow broke this" report today -- the faith sort chips, Profile's fields, the achievements disclaimer,
  the estimator's portion pills + its "Possibly not included" list -- was NOT a glow problem. Each was
  CONTENT SITTING NAKED ON THE PAGE, or a control that was see-through. The glow only exposed what was
  already the weakest thing on the screen. Two rules, and no screen needs a glow exception:
    1. **Text content goes on a CARD.** The page is atmosphere, not a reading surface.
    2. **Controls get an OPAQUE fill** (accentBlueBgOpaque / accentAmberBgOpaque / bgCard). A control has to
       be a solid object you can press, not a tint over a glow.
  Corollary Justin tested directly: the glow looked FINE on add-food / food-detail / recipe-builder, which
  are forms too -- because they are covered in cards, so the glow only shows in the gutters. It failed on the
  AI estimator, which had naked content low on the page. It is not "forms vs not"; it is naked vs carded.
  When a screen fights the glow, the screen is telling you something is naked that should not be.
- 2026-07-16 Home weight card "LOG" button touched up (Justin gym-find): the NUMBER face (Type.num, built
  for data values) was doing button-label duty in shouty caps with letterSpacing -- same straggler class as
  Profile's save bar -> Interface bold, mixed-case "Log". Fill moved off `theme.bgSelected` (the SELECTION
  token -- theme.tsx's own note says a button is not selected) onto the house tinted recipe + ButtonShine.
  Dim/disabled state kept. Workout's inline "Add Exercise" got a NEUTRAL card shadow (0.7x opacity, tight
  2/6 blur): tier-2 tinted buttons carry no shadow app-wide, but beside the molded View Summary at equal
  height "one floats, one is glued down" read as inconsistency, not hierarchy (Justin). Deliberate exception
  -- the ranking now comes from solid+accent-glow vs tinted+quiet-shadow, not depth vs none.
- 2026-07-16 FAITH CARD FOG (Dark). Both faith cards (Home's FaithTodayCard + the Faith tab's Today's
  Message) wore an amber halo at shadowOpacity **0.85** with offset 0,0 -- radiating evenly on all four
  sides, so the card's edge dissolved instead of ending. Invisible-ish on the pale themes; on Dark a fog.
  Worst on the Faith tab's card, which SKIPS the warm wash on Dark and so had only the halo to define it.
  Diagnosis: the halo was doing two jobs (say "faith", draw the edge) and was bad at the second. Now 0.32
  (in line with real card shadows) + a 1px amber border (rgba(212,134,10,0.45)) draws the edge on both.
  Also fixed: ReadingPlansCard's 130px book watermark sat in a bare absoluteFill box with NO overflow and
  NO radius -- it spilled straight past the rounded corner -> CardWatermark; its hardcoded black shadow ->
  theme token.
- 2026-07-16 SURFACE PASS (partial) + LIGHT GROUND BUG. Prayer/Bible/Plans/Devotional (amber glow) +
  Settings (accent) converted off the old top-down gradient to the flat ground + BackgroundLayers. FOUND ON
  THE WAY: **Light's `gradientEnd` was still the PRE-refresh grey #e3e6ee** while bgPrimary had been
  brightened to #f2f3f7 -- and gradientEnd is the token the flat ground actually paints, so every Light
  screen (all 6 tabs included) was painting the old grey. The two are meant to match. Card-dense screens hid
  it; the sparse faith pages exposed it. Light `glowStrength` 0.60 -> 0.45 (tuned against the old grey; on
  the brighter ground it drowned anything sitting on the page, not on a card). New `accentAmberBgOpaque`
  token (the amber twin of accentBlueBgOpaque) for faith controls that sit ON the page inside the amber
  glow: the Plans sort chips (selected was a 14% amber wash over amber = mud; unselected were literally
  'transparent') and Devotional's "Reflect with Halo".
- 2026-07-16 COACH VOICE PASS. The voice face was on HOME ONLY (6 lines). Now every surface where the coach
  SPEAKS wears it: Sleep + Recovery coaches, Day/Weekly/Monthly Coach Insight, the EvR report (insight box +
  each card's claim/insight/lever -- but NOT the proof, which is a number and stays on the data face), and
  Otto + Halo's reply bubbles (the USER's bubbles stay interface -- that contrast is the point). All four
  Coach Insight boxes dropped their italic to match Home's (and a fake italic on a face with no italic cut is
  how the Fontshare bug bites).
- 2026-07-16 ROUND FAB DOMES + fixes. All 10 circle FABs got the home-button dome (crown gloss -> soft dark
  foot) via a new self-clipping `components/FabDome.tsx`; Halo's is hand-built in SVG from the same 4 stops
  (keep in sync BY EYE). The "+" FAB accent DISAGREED app-wide: stats/journal/body-measurements were on
  accentBlueRaw (near-fluorescent on Blush+Yellow, swallowing the white "+") vs accentBlue elsewhere -> all
  accentBlue; body-measurements' 58px disc -> 56. Prayer's "+" wore the PAGE gold (#d4860a) next to Halo's
  #e8a020 -> now imports HALO_GOLD like bible.tsx. Warm + Blush `tabBarInactive` were a light tan / pale rose
  on their own pale bars (unreadable) -> each theme's textMuted, same root as the Slate hidden-icons fix.
  Water custom-amount modal: 9px muted caps label -> a real 20px Clash accent title; flat tinted Add -> molded
  PrimaryCTA with a dim/disabled state (it had none).
- 2026-07-16 ROUND FAB DOME PASS -- all 10 circle FABs. New `components/FabDome.tsx` carries the home tab-bar
  button's recipe (crown gloss -> neutral middle -> soft dark foot) to the 8 "+" discs (Workout, Stats, Add
  Food, Workout Library, Bible auto-scroll, Prayer add, Journal new-entry, Body Measurements) + Otto. Halo is
  drawn in SVG so her dome is hand-built from the SAME 4 stops (keep in sync BY EYE -- noted in both files).
  SELF-CLIPPING, not overflow:'hidden': these FABs wear their shadow on the disc itself and masksToBounds
  would kill it (the home button can only clip because its glow sits on a wrapper). Fixed on the way: the "+"
  FAB accent DISAGREED across the app -- stats/journal/body-measurements were on accentBlueRaw (near-
  fluorescent on Blush+Yellow, swallowing the white "+") while workout/add-food/library/Otto were on the
  button-safe accentBlue; all now accentBlue. Body Measurements' disc was 58px, the lone odd size -> 56.
  Deliberately untouched: the FAB expand-menu pills (stay flat) + empty-state tinted icon circles (not
  buttons). Also: Prayer's "+" wore the PAGE gold (#d4860a) next to Halo's #e8a020 and the two never matched
  side by side -> now imports HALO_GOLD like bible.tsx (Halo's gold = the one source of truth for a faith
  FAB). Prayer's black drop shadow LEFT ALONE (Halo has a breath-glow instead, so they still differ there --
  Justin's call, revisit if it reads heavy). Device-verified on Light/cyan: all 10 domes look right.
  STILL PENDING: the other 4 themes x accents.
- 2026-07-16 FLAT-BUTTON MOLD SWEEP (round 1) + fixes. Molded the flat solid-accent buttons found by reading
  (not grep-guessing): Stats "Add to Stats" (both spots), Workout tab "Load to N Days" (the TWIN of the
  library one), Day Score "I Understand". "Add Food modal Save" turned out a DEAD unused style (no live
  button). Also this session: the (i) TooltipModal title moved off the number font to Clash; Otto Notifications
  "Done" -> molded; Log Measurements page: "How to measure" restyled to the tinted View-All-Achievements button
  + added top padding + registered the save bar so Otto lifts above it, then bumped bottom padding so Otto
  clears the Body Fat card. HONEST GAP (see NEXT UP): the flat-button sweep only covered the main tabs +
  Add Food + Day Score; the deeper stack screens were NOT exhaustively scanned yet.
- 2026-07-16 GUIDED TOURS (Toolkit) popup converted to the standard ModalHeader: dropped the redundant
  "___ TOOLKIT" eyebrow, killed the top dead space, title now on Clash (was the number face), gained the
  standard handle + X. Faith tab's copy now wears AMBER (title, play icons, top edge) like the rest of Faith;
  other tabs stay accent. Removed dead TAB_LABELS + old header styles. (ToolkitSheet.tsx.) This closes one of
  the hand-rolled modals from the modal-header scan.
- 2026-07-16 STYLE/SETTINGS/PRAYER button + font sweep (Justin gym-pass findings). Coaching-mode switch popup:
  title moved off the number face to Clash + "I'm In"/"Switch" is now molded PrimaryCTA. Settings Goals save
  bar: background now the frosted chrome (Light; other themes unchanged, no blur yet -- flag), "Save Goals" ->
  molded PrimaryCTA, "Cancel" off the shouty caps to mixed-case interface. Vacation "Start Vacation" -> molded.
  Prayer Request "Send" + Add Prayer "Add/Save" -> molded amber. Prayer Action popup: added a Prayer/Answered
  Prayer header, boxed the floating prayer quote, "God answered this" -> molded (warmer/lighter gold #d4860a not
  the dark brown accentAmber, slightly shorter -- Justin's pushback).
- 2026-07-16 FAITH "BIBLE AND PLANS" CARD -- Browse buttons unified. The two columns showed different
  affordances side by side (empty column = boxed shined amber button; under-cap column = flat "+ Browse" text
  link), which read sloppy. Now BOTH render the same boxed + shined amber pill with a "+" icon (PlansColumn in
  faith.tsx), matching the "Find something to read" button above. Dead browseLink/browseLinkText styles removed.
  DECISION (same review): Coach Insight "INSIGHT" pill stays FLAT -- it's a status label (tone-colored:
  INSIGHT/POSITIVE/URGENT/PATTERN), not independently tappable (the whole card opens EvR), so shining it would
  break "shine = tappable" and compete with the card's real CTA. Justin agreed.
- 2026-07-16 GYM AUDIT, button touchups (2 items). (5) Assign Tags modal (workout.tsx) CONFIRM was still a
  GREEN tinted button -> molded PrimaryCTA "Confirm" (green now means success/goal only). (6) Load Routine
  day-picker (workout-library.tsx) "LOAD TO N DAYS" was a flat painted solid-accent slab -> molded PrimaryCTA
  "Load to N Day(s)", mixed case like every other button. Both keep their disabled/conditional logic + toast.
  NOTE flagged, not touched: the Assign Tags modal is still a hand-rolled centered card w/ fade animation (not
  the ModalHeader + spring standard) -- belongs to the separate ModalHeader sweep.
- 2026-07-16 GYM AUDIT, FAB batch (4 items). (1+2) Otto FAB padding: sleep.tsx + achievements.tsx scroll
  paddingBottom -> `insets.bottom + 96` so the bottom-left disc stops covering the last card (achievements was
  a flat 40 with no inset). (3+4) Halo FAB added to the faith pages that lacked it: plans.tsx + prayer.tsx get
  the standard CompanionFAB + CompanionChat (general Halo; on prayer it sits bottom-left, bottom-aligned with
  the gold Add FAB on the right); devotional.tsx already had a MANAGED per-day Halo thread but no floating FAB,
  so a CompanionFAB now reopens that same thread (option A, Justin's call). Otto is already hidden on all three
  via AssistantOverlay's HIDE_SEGMENTS, so no double-FAB. Halo's tier gate still hides it for Not Right Now.
- 2026-07-15 [DATA-LOSS BUG, FIXED] **Edit Food from the Edit Entry route zeroed 26 nutrients.** Log > a
  logged entry > Edit Entry > Edit opened the Edit Food modal with every extended field BLANK, and Save
  wrote `parseFloat('') || 0` into all of them -- fiber, sodium, cholesterol, vitamins, minerals, silently
  wiped on a real saved food. CAUSE: the Edit button shows on `food.isMyFood`, but the modal fills from
  `food.myFoodData`, and those DISAGREE -- only add-food.tsx attaches myFoodData (via a myFoods.find
  lookup). Cals + the 3 macros survived because they alone have an `|| src.existingCal` fallback; the 26
  extended fields have none. The SAVE had the same fault (`_source.myFoodData || _source` fell through to
  the entry, so the row match ran against the wrong id). FIX: food-detail resolves the My Food itself
  (`resolvedMyFood`, same lookup add-food does) and both the load and the save use it. Read-only, no writes
  added. Justin found it with two screenshots after I told him it was "not a bug, just a scroll" -- I had
  read the field list in code and never checked whether it gets FILLED.
  >> ROOT PATTERN: DUPLICATED MODALS. There are TWO Edit Food modals (add-food + food-detail), TWO Add
  Exercise (workout tab + workout-library), TWO Jump to Date (log + day-detail), TWO Create Custom Streak
  (real + tutorial replica). Every one cost a round tonight, and this one cost real data: one copy got
  myFoodData wired, the other did not. Cross-reference comments are now on each pair. The REAL fix is to
  de-duplicate -- Justin asked "cant we just delete the broken one and point to the correct one?" and that
  is the right question; it needs a proper diff of the two, not a guess.
- 2026-07-15 FAITH IS AMBER, END TO END. Faith tab header + Prayer + Plans + Devotional + BIBLE (all 49 of
  its accent refs) now wear amber; faith MODALS already did. `ScreenHeader`'s `color` prop now drives the
  BACK CHEVRON as well as the title (it was title-only, which is why amber titles sat over cyan chevrons);
  6 screens were passing `color={accentBlueRaw}` = the DEFAULT, i.e. no-ops, and those props were removed
  so their chevrons keep the button-safe accentBlue (on Blush+Yellow the raw value is #ffe600 -- invisible).
  `HeaderIconButton` gained optional color/bg/border (defaults unchanged). Bible's scroll FAB now imports
  Halo's GOLD instead of theme.accentAmber (they disagreed side by side; bible.tsx had its own hand-copied
  '#e8a020' too). SKIPPED: Journal (has non-faith content, Justin's call) + Mission (opened from Settings/
  Sign-in, it is the APP's mission page; amber would flag it as the religious page).
- 2026-07-15 THE FAITH TAB WAS PURPLE. The whole tab read "so many fonts/colours" and it was ONE wrong HUE:
  all three cool text tokens are purple on Light (textMuted #6666aa, textDim #9999bb, textSecondary
  #4a4a6a), and every label on a warm amber card used them. Fixed with a 3-rung WARM INK LADDER in
  faith.tsx (`faithInk` / `faithInkBody` / `faithInkMuted`), mirrored + `faith`-gated in
  GratitudeStreakCard so HOME IS UNTOUCHED. The middle rung is the point: with only ink+muted, body text
  had to pick a headline colour (prayers -> dark, read heavy) or a label colour (the verse -> cool navy).
  Also: Faith CARDS now match normal cards on Light/Slate (bgCardFaithGlass was cream @0.62 while normal
  cards went opaque 0.82 in the Light refresh -- Dark/Warm/Blush already matched, which is exactly the 3
  themes Justin liked); Browse buttons off a near-white fill (the one case gloss truly cannot show);
  "None yet" -> "No devotionals yet"; both verse REFS now amber (one was purple); Lora rule settled =
  SCRIPTURE ONLY, and a Bible book name ("Proverbs 16") counts, a plan name ("The Gospels") does not.
- 2026-07-15 BODY-BUTTON SHINE, group 2 first pass: workout-library (Fill from Preset, Load Program, Load
  Routine, USE) + add-food/food-detail (Retry, Use a Saved Food, Create Food for this Barcode, Add x2, Edit,
  -/+ serving steppers, Replace). Skipped-with-reasons list + the honest re-run of the catalog (~23 real
  candidates left, NOT the 92 I first quoted) live in the NEXT UP item. Also KILLED a rule I had written the
  same morning: "shine scales with area" predicted full-width buttons would go plastic; workout-library's
  full-width Load Program/Load Routine took the default gloss and Justin liked them. Plastic comes from
  REPETITION, not width -- it was DON'T-OVER-GLAZE in disguise.
- 2026-07-15 STACK-SCREEN HEADER SQUARES -> HeaderIconButton (catalog sweep group 1). Bible's hand-rolled
  header (star/book/gear) + Add Food's two (sparkles/barcode) now use the shared component, so stack screens
  stop disagreeing with the tabs. Bible's back chevron DE-BOXED (ScreenHeader's rule: a tinted box reads as
  an ACTION, Back is the way out) and its "?" pulled out of its box (bare icon, not a tappable square). Add
  Food's were hand-built 38x38 w/ 22-24px icons -> now the standard 32 box. Also shined: Bible's Mark Read
  pill, the Achievements EARNED badge (a non-tappable badge -- "shine = tappable" knowingly bent, Justin's
  call). Barcode is the ONE deliberate exception to filled-only + 14px: filled bars merge to a grate at 14,
  so it stays `barcode-outline` at 18 (box still 32). Verified: Bible + Add Food tutorials still land (refs
  moved onto wrapper Views).
- 2026-07-15 REPEAT-A-MEAL MOVED INTO THE TRAY (started as "shine + DE-NEON", became a placement fix). The
  Repeat/Pick-a-Day pills got the house tinted recipe + ButtonShine, but the real problem was that a fresh
  morning put 2 pills on every empty slot (~10 buttons yelling) and the repeat SHORTCUT out-shouted the `+`
  that is the row's actual primary action. Pills now live in the EXPANDED slot; the collapsed row carries a
  muted "Expand to repeat a meal" scent line in the blank subtitle slot. Tooltip + tutorial (3 modes) + Otto
  KB updated & redeployed; What's New left alone (historical note, Justin's call). Full detail in archive.
- 2026-07-15 WORKOUT-TAB SURFACES. HR Zones (x2) + Tags got ButtonShine. Day-scroller shadow REGRESSION fixed
  (those tiles borrow card shadow tokens; our Light cardShadowOpacity 0.20->0.30 bump + a 0-radius hard shadow
  made them look harshly outlined -> now cardShadowOpacity*0.5 + shadowRadius 5 + offset y2 = soft float).
  Effort tiles (1-10): subtle gloss on the SELECTED (solid-fill) tile only. Added `solid` flag to ButtonShine
  -- solid-colour fills (same in both themes) carry a real reflection on Dark (0.40) instead of the tinted-
  button softening (0.14) that was starving them. OPEN on workout tab: day-scroller selected/unselected STATE
  redesign held for Justin's eyes (shadow fix may be enough).
- 2026-07-15 BUTTON TOP-SHINE (tier-2 tinted buttons). New `ButtonShine` primitive (white crown gloss, inset
  1px self-clipping so NO overflow:hidden -> no clipped top corners; softer on Dark unless `solid`) +
  `HeaderIconButton` component. Rolled to: all 5 tab-header icon-squares, Library pills (Log/Workout), `+ Log`,
  the 8 water quick-add buttons, and (this session) HR Zones/Tags + the selected effort tile. Established the
  3-TIER button system: MOLDED (solid PrimaryCTA) / SHINED tinted (tier-2, ButtonShine) / FLAT (passive).
  Learned: white BEVEL top-border vanishes on light bg (reads "cut off") -> border stays accent on all 4
  sides, shine does the top-light; shine near its width limit on very wide buttons (watch for "glass strip");
  gloss is invisible on white/near-white FILLS (selectors' unselected states) -- but NOT on a 10% accent tint:
  that mis-read cost a round on 07-15 (the header squares use the tint recipe and shine fine). OPEN rollout:
  the nuanced IF selector + tappable at-a-glance tiles (design as SELECTORS not buttons),
  the day-scroller/effort SELECTOR-TILE state pass, and a catalog sweep for scattered tinted buttons (bible,
  food library, reports, achievements, stack headers).
- 2026-07-15 HOME-CIRCLE REDESIGN. Tab bar home button: ACTIVE = accent circle + white house icon; INACTIVE
  = white (bgCard) circle + accent-coloured house icon (the colour-swap, reads clean on the frosted-white
  bar -- no dark-scrim dim). BOTH states get a GENTLE dome: one full-width crown-gloss -> soft dark-foot
  gradient (NOT a clipped specular oval, which read as a "pill"). Rejected on the way: glossy orb (strong
  mould + 0.60 specular + lift = out of place in a flat app). This dome/top-shine recipe is the template for
  the CHIP / ICON-BUTTON TOP SHINE pass next.
- 2026-07-15 SLATE CHROME + STATS HIERARCHY + TEXTURE TUNING. Slate got the frosted chrome (chromeFill
  rgba(233,239,248,0.45), kept low/glassy so it reads steel not white) + readable inactive tab icons
  (tabBarInactive #5a7088, fixes the "navy icons hidden" complaint). Stats collapsible sections: subtitle
  bumped to textSecondary + uiMedium (was faint textMuted/regular), section headers 11->13 bold-caps to
  restore hierarchy, hairline divider 55->88 alpha. Background texture: halftone dots 0.14->0.20 and now
  ACCENT-COLOURED (was textPrimary ink -- experiment, Justin approved; revert to textPrimary if ever gaudy
  on Dark/bold accents), film grain eased 0.03->0.02 light / 0.022->0.015 dark. OPEN still: Profile subtexts
  (same faint-muted pattern as Stats had), broader Slate text-contrast audit.
- 2026-07-15 LIGHT THEME REFRESH + UNIFIED FROSTED CHROME. Light stopped looking grey: brighter neutral ground
  (#e3e6ee -> #f2f3f7), pure-white opaque cards, stronger navy card shadow (0.20 -> 0.30) so cards float on
  SHADOW not value-contrast. New per-theme `glowStrength` token (Light 0.60, others 0.40) uncorks the shared-
  constant compromise. New per-theme `chromeFill` token applied to the tab bar AND all 6 tab headers so top +
  bottom chrome read as one frosted-glass surface (Light rgba(255,255,255,0.65); others 'transparent' =
  unchanged). `tabBarInactive` token fixes faint inactive tab icons (Light #9999bb -> #6666aa) -- same root as
  the Slate hidden-icon complaint. Day Detail HISTORY badge now a small centered pill. Light-only; other 4
  themes untouched. OPEN: home-circle restyle + extend frosted chrome/icon-contrast to Slate.
- 2026-07-13 MONETIZATION / "SUPPORT THE MISSION" **COMPLETE + DEVICE-VERIFIED.** The whole track: RevenueCat
  purchases (subscribe monthly/annual, monthly->annual upgrade, tips, restore), Supporter gates, the membership
  card with REAL dates (and "Ends on" not "Renews on" once cancelled), the gold system (SupporterFoil = the one
  source of gold), the gold app icon + gold splash + lapse guard, the thank-you webhook, Otto's free-user nudge,
  and SERVER-SIDE Supporter truth (Firestore as a cache, RevenueCat as the truth, so the AI caps can't be
  spoofed by a modified client). All 11 testers granted a free year. Three real bugs caught on the way: an
  out-of-order webhook that could have killed a paying subscriber's access; a lapse guard that only ran if the
  user happened to open Settings; and a promotional grant that emailed a fake $0 tip AND would have silently
  given granted testers free-tier AI caps. Detail: SPEC_monetization.md. Launch steps: LAUNCH_CHECKLIST.md.
- 2026-07-13 WHAT'S NEW Patch 3 written (Supporter, Repeat a Meal, weight history, fixes) + the page's patches
  are now COLLAPSIBLE (newest open, older collapsed) + the Supporter card wears the real gold foil hallmark.
- 2026-07-13 CALORIE FLOOR **TRACK CLOSED.** Core shipped 2026-07-08; the two remaining follow-ons turned out to
  be already done (pace granularity 0.25/0.75 shipped in Patch 2; the onboarding activity/training-frequency
  wording shipped 2026-07-10). The third ("activity nudge") was never specified and is redundant: the modal
  already has an adjust-activity button. Nothing left.
- 2026-07-13 GOLD APP ICON shipped: alternate iOS icon (Supporter-only toggle in Settings > Appearance), a
  pointer row on the Support membership card, the perk row now shows BOTH marks (badge + icon), the in-app launch
  splash follows the icon, and a lapse guard puts a lapsed Supporter back on the default. Made in CODE (a gradient
  map over the source's luminance), not by hand.
- 2026-07-12 [BUG FIX] EvR/home Coach Insight was rendering the deterministic FALLBACK instead of the AI voice.
  ROOT CAUSE: the coach tip's client-side timeout was 8s, too tight for the aiProxy round trip (Firebase cold
  starts + a large uncached rulebook prompt), so it timed out CLIENT-side and fell back even though the Anthropic
  call SUCCEEDED server-side. Fixed by raising it to 20s (utils/coachAI.ts), matching the feed voicer. NOTE: an
  EvR report SNAPSHOTS its insight at generation, so an old report never updates -- generate a new one to test.
- 2026-07-13 APPLE WORKOUTS IN THE EXERCISE LIBRARY **CONFIRMED BUILT** (the roadmap still said "build after the
  gym list" -- it was already done). workout-library.tsx groups Apple-synced sessions into browse entries with
  editable labels, per-key history, and sorting (utils/syncedWorkouts).
- 2026-07-12 MONETIZATION: RevenueCat purchase flow DEVICE-VERIFIED end to end (sandbox sub, tip, restore, and the
  LOCKED state all confirmed; a tip correctly does NOT grant the entitlement) + the THANK-YOU WEBHOOK shipped
  (functions/src/revenueCatWebhook.ts: emails Justin the buyer's name/email on a new Supporter or a tip, token-
  guarded, sandbox-flagged; all three paths verified). Also: EvR locked cards redesigned (WHOLE card frosted, topic
  chip, quiet per-card "Unlock ->"), purchase buttons got spinner/pending states, the Support CTA went premium, the
  Stats card buttons moved off the solid-blue slab onto the house tinted recipe, and the "SUPPORTER" gate CHIP was
  removed app-wide in favor of a lock icon (it read as a status badge you'd earned, not a requirement). REMAINING on
  the track: live priceString on the Support screen + the fuller Supporter-state screen (plan/member-since/renews-on),
  then the LAUNCH-ONLY reverts. Full detail + the pinned tester-entitlement sequence: SPEC_monetization.md.
- 2026-07-10 [BUG FIX, data-cosmetic] Over-precise gram weight in food-entry NAMES (e.g. "Italian Style
  Meatballs (113.33304999999999g)" from logging 1.3333 servings). Two-part fix: (1) DISPLAY: the Log tab meal
  rows now round the parsed gram/oz label via the shared utils/repeatMeal.tidyFoodName (>=3-decimal numbers ->
  1 decimal), which cleans EXISTING ugly entries too; (2) UPSTREAM: food-detail.tsx name-build rounds the
  gram/oz amount to <=1 decimal before storing, so NEW entries are clean (loggedAmount stays precise -> edit
  math unaffected). Pure JS, tsc clean (no new errors). Was the parked Food & Log backlog bug.
- 2026-07-10 WEIGHT HISTORY + STARTING WEIGHT SHIPPED (gear on the home Weight card; all 5 slices; device +
  8-check dev self-test verified; Otto deployed). Editable weigh-in history (edit/delete per day + back-dated
  "add a past weigh-in", today-or-earlier), starting weight = earliest weigh-in (tap to correct; an earlier add
  becomes the new start), read-then-merge on pj_<date>.weight so food/water are never touched, plausibility
  guard, Firebase sync, milestone recompute that GRANTS but never revokes badges, Mindful-neutral. Explainers:
  new 'weight_card' tooltip + card (i) + Otto KB. utils/weightHistory + 32 unit tests (npm run test:weight).
  Dev self-test in Settings is DEV-ONLY (added to REVERT BEFORE LAUNCH). Full post-mortem in archive; spec
  SPEC_weight_history.md.
- 2026-07-10 ONBOARDING training-frequency wording (dad feedback): screen 4 subline now reads "How often you
  actually train these days, not what you're aiming for. You can change it in your Profile anytime." (was "How
  often you do structured workouts"). Kills the aspirational-answer trap that inflated TDEE (training freq adds
  up to +400 cal/day). Copy-only, your-style.tsx. Lifestyle Activity + Profile field left as-is (decided out).
- 2026-07-10 [BUG FIX] Home Weight card "Total Lost" contradicted "vs Yesterday" (commit aea7aec). It computed
  earliestWeight - today, so a GAIN showed a negative number under a static "Total Lost" label (opposite sign
  from the +N vs-Yesterday stat) -- dad gained 187->188 but saw "-1 Total Lost". Now the label flips Total
  Lost/Total Gained by direction + shows the magnitude (agrees with vs Yesterday); Mindful = neutral "Total
  Change". Baseline unchanged (earliest LOGGED weigh-in; the earliest-vs-onboarding-starting-weight baseline is
  a separate open design question, NOT a bug). index.tsx, pure JS, tsc clean.
- 2026-07-10 REPEAT A MEAL + per-meal CLEAR ALL SHIPPED + device-verified (commit 016315d, pure JS). Re-log a
  previous day's meal-slot entries into the viewed day by exact-cloning (no saved object; photos/macros/extended
  nutrition carry verbatim, AI items safe). White-outline pills on empty slots ("Repeat Yesterday · N kcal"
  one-tap + "Pick a Day" picker), live-macro accordion modal w/ crossfade, destination always = launch slot.
  Clear all = quiet red link to wipe a whole meal in one confirm. utils/repeatMeal + 30 tests; explainers +
  Otto KB all updated/deployed. Full post-mortem in archive. Spec: SPEC_repeat_meal.md.
- 2026-07-10 WORKOUT TIMER RELOCATION + polish (Cengiz feedback: the full-width rest banner blocked
  scrolling/tapping between sets). Rest + hold timers now live in a compact TWO-ROW chip docked between the
  Otto and "+" FABs (left/right:90 clears both 56px discs; time+buttons row over a full-width centered
  label; fade in/out via Reanimated; thin 1px accent border -- blue rest / green hold; bigger Done). Also
  fixed: hold Done haptic (was silent -> Medium); double-timer overlap (a live hold owns the single slot so
  checking another set no longer stacks a rest; tapping the holding set's own check circle now acts as Done
  and logs the ACTUAL elapsed hold, so an accidental circle-tap does the right thing); edit-exercise TIME
  sync (option C -- editing a time exercise applies the new duration to un-done sets, silent when uniform,
  prompts "Apply to all?" only when un-done sets differ, finished sets never touched). Cut the hold +15
  (you don't tap mid-hold). Dev-verified (fade/haptics/layout/double-timer/prompt). OPEN TAILS: (a) 5-theme
  x accent audit (tested Light/cyan only); (b) release/TestFlight feel-verify; (c) PARKED optional -- a
  countdown hold could roll into overtime instead of auto-ending at the target (removes any need for +15).
- 2026-07-10 [PERF BUG FIX, dev-verified] Add-exercise cold-remounted the whole Workout tab. Picking a
  library exercise did router.push('/(tabs)/workout', {pendingExercise}) -> a PUSH spawned a brand-new
  Workout screen every time (full cold mount: June-carousel flash, empty exercises, default avatar, 5-10s
  first hydrate on release, and STACKED/leaked instances that slowed the app until a force-kill). router.
  navigate didn't dedupe to the existing tab either (still remounted). Fix = hand the exercise off via a
  pj_pending_exercise storage slot + router.back() (pops the library, reveals the still-mounted workout
  screen -> ZERO remount); the tab reads+clears the slot on focus to open the add modal. Same handoff
  pattern as recipe ingredients. Pure JS. Dev-verified (flash gone, exercises/avatar/carousel all persist).
  STILL OPEN (separate, smaller): the ~1s delay before the library screen itself opens; the focus-reload
  firing 11 setStates on every focus. Test on the next TestFlight build for the real speed feel.
- 2026-07-08 WORKOUT UNITS + TIME TRACKING (Cengiz feedback) SHIPPED, all 8 steps, HEAD 6e15e85. Per-exercise lb/kg (inline LBS-dropdown + Add/Edit modal, PR engine compares in kg / displays the unit lifted, volume tile splits Lbs/Kg) + Reps->Time holds (clock-style M:SS input, SetEntry.durationSec, HOLD-mode timer pill on the rest-timer foundation, hold presets flipped to Time) + longest-hold PR (PRRecord.bestDuration, duration = trophy / weight = context). Fully additive to pj_workout_state (missing unit = lb, missing type = reps, nothing converted). OPEN TAILS: (a) device-eyeball the newest time-box right-fill + blinking-cursor change (6e15e85), (b) explainer freshness for the TIME half (tooltip/tutorials/Otto KB). Full post-mortem in archive; spec SPEC_workout_units_and_time.md.
- 2026-07-08 RECOVERY "Prev. Activity" display fix (device-verified): the Day Summary + weekly/monthly summaries showed the RAW prior-day active calories (e.g. 832) instead of the burn-accuracy-adjusted value (666 at 80%) the recovery SCORE actually uses, so it disagreed with the day's own detail. Now all three multiply by burnAccuracyPct. SCORE was never affected (actScore is a ratio; both sides already adjusted). Sleep hub + home card were already correct (they read the adjusted score-result value). Day Summary is live; existing weekly/monthly snapshots need force-regenerate to update.
- 2026-07-08 NUTRITION under-logged gate (Day Score, item #8): a day with food but implausibly few calories (consumed < 50% BMR, or < 500 when BMR unknown) is under-LOGGED not genuinely low, so Nutrition now DROPS (dash) instead of scoring a fake clean calorie hit (Megan's 350-cal/915-target day scored 55/55). Skipped when diet excluded / no food. Weekly+monthly inherit it free (they null-guard). DAYSCORE_VERSION 4->5 so history recomputes once. Explainer line on both Day Summary surfaces (shared mode-aware copy) + a "This was my full day" override (per-day dietLogComplete flag, read-then-merge, recompute in place) that scores the day honestly if the user asserts it was complete. Dev tool "Seed/Remove under-logged test day" (writes only to an empty in-window date). Device-verified end-to-end. Mirrors Smart Tips' existing 0.5*BMR filter.
- 2026-07-08 AI ESTIMATOR FAVORITES fix (device-verified): favoriting an AI meal saved cal but 0 P/C/F (favorite-save read only FatSecret-shaped data, not the estimator's flat macros) AND re-logging silently name-matched a FatSecret product, snapping serving/macros/micros onto a meal the AI never produced them for (TWO name-search doors: openFoodDetail at nav time + food-detail's own resolveServings effect after mount). Now AI favorites stay pure to their estimate: real cals + big 3, no enrichment, gated on a persisted aiEstimated flag. Recents already excluded AI by design; My Foods save was already fine; non-AI stale-food name-search recovery untouched. ALSO shipped same session: AI foods now render as "1 serving" (not a bogus "Amount (g): 100"/"1g") by riding the existing serving-only recipe path -- one isServingOnly flag gated on aiEstimated feeds the synthetic serving + display/save branches, so non-AI foods are byte-for-byte unchanged; favorites get a 1-serving existing-value basis via mapFav. AND food-detail's save was dropping the aiEstimated flag, so a re-logged AI favorite lost its badge + serving display + name-search immunity -- now preserved on save. All device-verified (edit-entry + favorite re-log + serving stepper math + non-AI regression).
- 2026-07-07 CARDIO PRs in the View Summary recap (parity with lift PRs). Per-DRAWER records (activity type + indoor/outdoor, never lumped): today's best distance + duration vs the prior all-time best for that drawer -> lines in the SAME amber trophy block as lifts ("Outdoor Walking: New furthest 2.10 mi / New longest 42:15"), header counts lift + cardio. Bar = "beats prior best" so it's idempotent + self-healing (delete from Health -> recomputes). Calories excluded (noise). Apple-synced only (manual cardio lacks per-session history). New utils/syncedWorkouts.detectCardioPRs; detection on Finish via cached fetchSyncedWorkouts(365). ALSO: date (with year) added to the library RECORDS tiles ("SET" sub-row mirroring the AVG format). personal_records tooltip + Otto KB taught cardio records (deployed). Best pace + calories-as-PR PARKED with running (SPEC_apple_workout_library.md). Pure JS; device verify pending.
- 2026-07-07 SYNCED WORKOUTS perf + naming: (a) stale-while-revalidate cache (pj_synced_workout_cache, device-local raw sessions) so the Library's Apple entries paint on first frame instead of popping in after each native queryWorkoutSamples; (b) the Workout tab now labels Apple entries via syncedGroupLabel like the Library, so walk/run/cycle/swim/row split Indoor/Outdoor + a guarded retro-cleanup relabels existing bare-default entries in place (name is display-only for Apple cardio -- no PR/summary/dedup keys off it). Pure JS. Committed 4ffe93a.
- 2026-07-07 GYM LIST (Items 1-5 all shipped) + extras. (1) Modal keyboard overrun: Add/Edit Exercise + workout-library Add modals now height-cap the card between the safe-area top and the keyboard (internal ScrollView + flexShrink) so the top never crosses the Dynamic Island and Cancel/Save stay scroll-reachable; name fields got autoCorrect/spellCheck off (kills the autocorrect-highlight bleed); stats streak modal didn't overrun (just handle-to-top + double-dash copy fix). (2) Recipe Edit Entry: extended nutrients now forwarded from the entry's flat fields (food-detail already displayed them; log.tsx wasn't passing them) -- fixes old + new; serving-only recipes (no total weight) drop the bogus "Amount (g):100" for a working Servings stepper (nominal 1-serving unit, rescales nutrition, preserves "(N servings)" name on save), weight recipes still show real grams. (3) Library-food tap loading state (row dim + spinner while openFoodDetail awaits FatSecret). (4) Food library tabs reset scroll to top on switch. (5) Recipe ingredient hand-off: builder clears the shared pj_pending_ingredient slot on first focus so an abandoned add can't leak into the next recipe. EXTRAS: inline Add Exercise button beside View Summary (one row); FAB text-label pills got the 2px bgPrimary ring app-wide (14 pills / 5 files). All device-verified.
- 2026-07-05 Halo knows the reading plans + devotionals (discuss + recommend): Halo can now see the full catalog and (a) discuss any plan/devotional accurately when asked (what it covers, length, fit) and (b) proactively offer ONE when it genuinely fits a conversation, done SPARINGLY, engage-first, once per convo, tier-aware (lighter for Exploring), only real titles, "Need a word right now" set flagged for acute distress. Built the OTTO way (self-syncing, NOT hand-maintained): CompanionChat.tsx builds a compact catalog from the LIVE READING_PLANS + DEVOTIONALS data and sends it with every message; faithCompanion accepts it (6k cap) and buildSystemPrompt appends the static discuss/recommend RULES + the injected catalog (absent-catalog = old behavior, so version skew is safe). Rides in the cached system prompt (identical per app version). Deployed. Client is pure JS (reload). Tier-1 only: recs are verbal, NOT yet tappable pills (possible Tier-2 later). Optional future: include enrolled-state so Halo can say "pick Anxiety and Peace back up."
- 2026-07-05 [BUG FIX] Active-cal goal false pop (burn-accuracy race): the home active-cal goal could fire against UNADJUSTED calories because burnAccuracyPct defaults to 100 and loads async, and the goal-check effect neither waited for it nor depended on it (so an early HealthKit read at the default 100% fired the goal, then the display recalculated to the real 80%-adjusted number, e.g. raw 525 -> shows 420 but the 500 goal already popped). Fix: added a burnAccuracyLoaded flag (a bare value of 100 is ambiguous: real vs not-loaded), gate ONLY the active-cal goal check on it, and add burnAccuracyPct + the flag to the effect deps so it re-evaluates once the real value lands. Steps/water/exercise untouched. Already-banked false hits are NOT auto-reversed (the parked goal-un-cross problem). Possible parallel issue in the historical goal-day scan flagged for a separate look. Pure JS.
- 2026-07-05 Halo chat aesthetic port (matches Otto): Halo's chat now carries the same treatment as Otto's pass: theme gradient wash behind the chat (0.55 opacity, clipped to the rounded panel), MountFade fade+slide-up entrance on every bubble, STAGGERED typing dots (was a unison pulse), and an identity avatar left of Halo's messages (her GOLD CROSS, mirroring her header badge, the faithful translation of Otto's sparkle) with the old redundant gold left-bar dropped. Her bubbles stay gold-tinted (her identity). tsc clean. Pure JS.
- 2026-07-05 Achievement pop-on-action (workout + sleep): workout badges (First Workout, program/routine milestones) and sleep badges now pop the INSTANT you earn them instead of waiting for the next app-open. Added a force bypass to the once-per-day gate on checkWorkoutAchievements / checkSleepAchievements (mirrors the nutrition/momentum pattern), passed ONLY at genuine action sites: add/edit exercise + load program + save routine, and manual sleep save. App-open sleep sync + dev-tool checks stay unforced. Unlock is idempotent so a forced re-run can't double-pop. Food + streak badges already worked this way; this brings the last two in line. Pure JS.
- 2026-07-05 View All Achievements button (Stats): full-width VIEW ALL ACHIEVEMENTS button at the bottom of the Records section (trophy icon, accent-blue style, routes to /achievements) so the page isn't only reachable via the buried header trophy. Pure JS.
- 2026-07-05 Apple Health permissions via Otto: in-app "Manage in Settings" hotlink was KILLED (Linking.openSettings only reaches the app's generic iOS page, which has no Health row; iOS exposes no deep-link into the Health data-access screen). Resolved instead by fixing Otto's KB to give the correct manual route (Settings > Privacy & Security > Health > Project J, then toggle data types) and never point at the app's iOS page or the in-app Health section. Deployed.
- 2026-07-05 DECISION (card gradient wash): rollout stays PAUSED where it is. Gradients are applied where Justin wants them (home + summary surfaces via GradientCard) and the look is approved as-is. Do NOT roll it out further and do NOT touch existing gradient code. Removed from the active high-priority queue so it stops resurfacing as "what's next."
- 2026-07-05 EvR saved-reports list cleanup (quick win): the SAVED REPORTS list on the Effort vs Results screen rendered all up-to-15 reports as full rows (long scroll). Now shows the current + 3 recent loose, then a dropdown ROW ("N older reports" + chevron, styled like a report row for consistency w/ the Summaries dropdowns) that expands/collapses the rest. Chose a dropdown over month/week buckets deliberately: EvR reports are on-demand, deduped 1/day, capped at 15 and recency-matters, so month grouping would fragment into 1-report buckets and bury the newest. Storage was already 15-capped; display-only. Pure JS.
- 2026-07-05 Bedtime "Worth watching" contradiction fixed: the Bedtime metric status was computed on the FULL bedtime stdev (>60 min -> Variable) while the card DISPLAYS a trimmed 10th-90th percentile range, so one 2 AM night (already trimmed out of the shown range) could still flip the status to "Worth watching" -- a tight range with a scary badge. Now consistency is judged on the SAME trimmed span the card shows (bedHi - bedLo): <=60 min Consistent, <=120 Mostly steady, >120 Variable. Aligned the sleep-coach "steadier schedule" nudge to the same trimmed span + >120 threshold (was full stdev >60) so the coach can't contradict the row either. Removed the now-dead full-stdev computes. Tooltip "Bedtime consistency" is conceptual (no threshold cited) so it stayed accurate. Pure JS. (Bonus: no longer nags over a single late night -- a pattern flags, not one slip.)
- 2026-07-05 Summaries producer (Otto hub): when checkAndGenerateWeeklySummary / checkAndGenerateMonthly actually produces a fresh summary, it now drops a 'summary_ready' hub notification deep-linking to it (weekly = calendar/blue -> /weekly-summary; monthly = stats-chart/purple -> /monthly-summary; stable id per period so no dupes; silent on an empty week/month). Category + route-tap already existed in the hub. Dev seed ("Add sample notifications") gains a solo summary card to eyeball it today (real trigger only fires Sunday 5am+ / 1st 5am+). Awaiting real-trigger verify (Sunday/1st).
- 2026-07-05 Notification hub polish (2 quick wins): (1) solo (non-stacked) notification cards now cast the same shadow the collapsed group cards do, so they float instead of sitting flat (nested cards inside an expanded group stay flat on purpose); (2) Day Summaries archive month-grouping -- once past 8 weeks, weeks collapse under Month headers (newest month open, older collapsed); under 8 weeks stays a flat week list. Device-verified 2026-07-05 (shadows + threshold).
- 2026-07-05 Daily Goals card count fix: the card was showing the lossy real-time tally (pj_goal_hit_counts) that misses backfilled/edited days and never decrements, so it disagreed with the badge progress bars (water 34 vs 35, steps 10 vs 23). Now the card's COUNT comes from the shared historical recount (utils/achievementProgress.loadProgressValues, same source as the badge bars + Otto) so they can't diverge; extended that scan to also count active-cal + exercise-min goal-days (Home-screen thresholds; active falls back to caloriesBurned, exercise via effectiveExerciseMinutes). Tally kept only for the "Last earned" date label. Device-verified 2026-07-05. KNOWN MINOR (left on purpose): the transient goal-hit celebration toast still uses the live tally count, so it can flash 1 off the card; not chased (transient, not the persistent display).
- 2026-07-05 Otto chat aesthetic pass: the chat modal was the app's one flat-white surface, now on the theme gradient (rendered at 0.55 opacity over the sheet so it's a gentle wash, not the full page gradient; theme-safe softening). Plus staggered "typing" dots (were fading in unison), a fade+slide-up entrance on every bubble (MountFade), and a small Otto sparkle avatar left of his messages (dropped the redundant teal left-bar). Also fixed Otto refusing workout-ideas questions ("what's a good chest workout" -> "outside my wheelhouse"): training/exercise suggestions are explicitly IN his scope, so the system prompt now tells him to answer with real movements then bridge to building a routine in the Workout Library (deployed). (Markdown-strip on replies shipped earlier w/ dataset #6.) Device-verified 2026-07-05. Gradient is a one-number opacity dial if it needs nudging.
- 2026-07-05 Otto journal + prayer (on-demand dataset #7, LAST in the thread): new utils/companionJournal.ts attaches, ONLY on an explicit journal / reflection / gratitude / prayer question (deliberately NOT hooked to whole-day recall, so private content never leaks into "what did I do on X"), the user's own reflections (pj_bible_reflections: recent ~15 entries = date + category + title + ~240-char excerpt) + prayers (pj_prayers: active + answered w/ dates). PRIVACY-handled: faith-tier gated (a "Not Right Now" user gets prayers + faith journal categories withheld, personal journal only); entries excerpted not dumped; KB tells Otto to treat it gently/warmly, summarize themes not recite, never invent an entry, point to the Journal/Prayer screen for full text, and answered prayers are a tender moment. KB taught, deployed, wired into AssistantChat. Isolated tsc clean. Device-verified 2026-07-05. >>> This COMPLETES the Otto on-demand data thread (PRs, per-lift trend, recent workouts, food, sleep, body, achievements, journal/prayer). Only later-optional add: full per-metric streak tiles (needs the Stats streak engine extracted first).
- 2026-07-05 Otto achievements (on-demand dataset #6): new utils/companionAchievements.ts attaches, on achievement / badge / earned / goal-day messages, the user's ACTUAL earned set (pj_achievements, grouped by category + dates + ×count) AND live progress toward every badge family. Progress comes from the Achievements screen's OWN scan, extracted VERBATIM into new shared utils/achievementProgress.loadProgressValues (screen now imports it too = one source of truth), so Otto's "23 of 50 step-goal days" equals the screen's progress bar exactly. Flips the old KB rule ("you do NOT have their achievement data") -> Otto now answers "what have I earned" AND "how close am I to X" precisely. Device-verified 2026-07-05 (Well Worn "23 of 50, 27 more" correct). Scoped OUT: full per-metric streak tiles (Stats > Streaks = 200+ lines un-exported inline logic; logging streak already in snapshot, KB routes rest there). DELIBERATELY dropped the Daily Goals live-tally from Otto: it's a lossy real-time counter that lags the recount (water 34 vs 35, steps 10 vs 23), so Otto uses the recount everywhere (matches the badge bars); the tally/recount mismatch on the Achievements SCREEN is a separate app bug now in NEXT UP. Also fixed: Otto replies now strip stray markdown (**bold**/`code`) client-side in AssistantChat (Haiku ignored the plain-text instruction). KB rewritten, deployed, wired in. Isolated tsc clean. Remaining on-demand thread: journal/prayer entries (PRIVACY-sensitive)
- 2026-07-05 Otto body measurements (on-demand dataset #5): new utils/companionBody.ts attaches, on measurement / body-part / body-fat messages, the user's actual logged tape measurements from pj_body_measurements. Tier 1 CURRENT = each logged field's most-recent value (in their unit) + how long ago + "may be out of date" >30d + delta since first entry, plus latest Navy BF%. Tier 2 HISTORY = each session newest-first (date + field count + BF%). Uses the Body Measurements screen's OWN helpers so numbers match Stats > BODY exactly. Deliberately NOT weight (snapshot already has weight) and NOT hooked to isDayRecall (measurements are sparse, not daily). Trigger = field/measurement/BF word + ask/possessive. Full history (bounded 24 sessions / 4k chars), not 30-day windowed. KB taught (BODY MEASUREMENTS HISTORY entry under Stats > BODY), deployed, wired into AssistantChat. Isolated tsc clean. Device-verified 2026-07-05. Remaining on-demand thread: achievements/streak detail -> journal/prayer (privacy)
- 2026-07-05 Otto sleep + recovery history (on-demand dataset #4): new utils/companionSleep.ts attaches, on sleep/recovery or whole-day-recall messages, the user's actual logged nights last 30 days. Tier 1 = per-night line (sleep score, duration, deep sleep, + recovery score / HRV / RHR when present) via stitched loadWindowDays (matches app). Tier 2 = full stage breakdown (deep/REM/core) + all recovery signals (HRV/RHR/Resp/SpO2) for a NAMED night, from the raw day record. Reuses shared isDayRecall + resolveNamedDays (now exported from companionFood). Wearable-aware (explains missing watch data warmly). KB taught, deployed, wired into AssistantChat. Snapshot already has last night + 7-night avgs, so this fills a SPECIFIC past night / night-by-night trend. Device-verified 2026-07-05 (specific night, single metric, named-night stages, HRV, week trend all correct); fixed one bug: "last night" wasn't resolved to a date by the shared resolveNamedDays, so stage detail didn't attach for "sleep stages last night" -> now maps last night/tonight to today's wake-day record in the sleep builder. Remaining on-demand thread: body measurements -> achievements/streak -> journal/prayer (privacy)
- 2026-07-05 Otto food log history (on-demand dataset #3): new utils/companionFood.ts attaches, only on food / whole-day-recall messages, the user's ACTUAL logged nutrition. Tier 1 = per-day TOTALS last 30 days (calories, P/C/F, fiber/sugar/sodium, water), pulled via STITCHED loadWindowDays (offsets 0/14/28 -- its internal window is only 14) so numbers are IDENTICAL to the app's exclusion-aware math. Tier 2 = ITEMIZED foods per meal, only for a day the user NAMES (resolveNamedDays parses yesterday/today, weekday, "June 24", "6/24", "the 24th"); the only gated piece b/c food names are unbounded text. Oldest-first char-budget trim, [this week] marked, today partial. Snapshot already has today + 7d avgs, so this is for a SPECIFIC past day / day-by-day trend. Day-recall detector extracted to shared companionWorkouts.isDayRecall (both workouts + food hook into "what did I do on X"). KB teaches the block + routes past-day lookups to the LOG TAB date picker first (Stats/Home calendar backup). Wired into AssistantChat, deployed. ACCURACY FIXES (device-verified 2026-07-05): (1) carbs now shown NET (total - fiber - sugarAlcohols) when the user's showNetCarbs setting is on, so they match the Log tab's Today's Total card (was showing gross e.g. 225 vs card's 219); (2) itemized food list now attaches ONLY on a "what did I eat / foods / for lunch" LIST intent, not on a totals question -- fixes both a token-waste AND a Haiku bug where, given the item list, it re-summed and mis-stated the day total (said 1929 vs real 1899); (3) KB + block tell Otto to QUOTE the daily-line total verbatim, never re-add items, and answer a single-nutrient day question cleanly (no 7d-avg / "no itemized data" clutter). All 4 retests passed. Remaining on-demand thread: sleep history -> body measurements -> achievements/streak -> journal/prayer (privacy)
- 2026-07-05 Otto recent workouts (on-demand dataset #2): when a message is about recent training (what did I do yesterday / on July 2 / last chest day / on Monday, how a session went, "how many squat sets this week", frequency counts), utils/companionWorkouts.ts attaches a compact summary of the user's ACTUAL logged sessions over the last 30 days (newest first): per day = focus label + each lift's completed sets & top set + any cardio/walk/class/custom, days in the current week marked [this week]. Cardio & everything logged included (not lifts-only). Bounded by TIME + a ~7k-char budget trimmed OLDEST-first (no session cap -- 3-4x/day loggers never lose this week / yesterday). Wired into AssistantChat alongside the PR block; KB taught + deployed. INTENT filter is the whole game (took several passes): it now fires on the full "what did I do on [date]" phrasing, verb-less conversational FOLLOW-UPS ("what about July 2", "and July 3?", "how about Monday"), and short/bare date msgs -- earlier misses were all the filter silently dropping the message (never a data/builder bug). Bare whole-day "what did I do on X" answers the TRAINING from the block + points to Calendar for the rest (meals/sleep), and this is the shared day-recall hook future datasets plug into. KNOWN LATENT GAP (not yet fixed): the builder's lift branch needs manual done sets, so an Apple STRENGTH/CORE/FUNCTIONAL session (non-cardio, auto-checked, no manual sets) would be skipped -- fix = include any checked/completed exercise even w/o sets; do when a strength session actually exists to test against. Remaining on-demand thread: food log history -> sleep -> body measurements -> achievements/streak -> journal/prayer (privacy)
- 2026-07-05 AI-estimator mic HIDDEN: voice dictation was cut, so removed the "coming soon" mic button from ai-meal-estimator.tsx (description field now full-width, no dead half-feature shipping to testers)
- 2026-07-05 Otto workout history (on-demand, per-lift trend / meat-on-the-bone dataset #1): when the user NAMES a lift in a lift question, the conditional PR injection also attaches that lift's RECENT SESSIONS (last 8 top sets, newest first, via liftSessionHistory) so Otto can describe how it's trending ("185 -> 195 -> 205 over your last three benches"). Bounded to the named lift(s). KB updated + deployed. Next in this on-demand thread: recent-workouts B ("what did I do last chest day"), then food log / sleep / body / achievements / journal
- 2026-07-05 Otto PR data (conditional injection): Otto can now answer "what's my bench PR" with the real number. New utils/companionPRs.ts detects a PR question (generic PR words OR any of the user's own lift names/typo-tolerant) and, ONLY then, attaches the user's FULL history-backed PR list (heaviest set + est 1-rep max per lift, ghost-filtered) to that one request's data snapshot; costs nothing on unrelated messages. Otto does the fuzzy lift-name matching itself. Also attaches the user's full REAL-exercise list (live UNION of pj_exercise_library + every exercise in their programs/weekly template + PR'd lifts, re-read each message so custom / routine-quick-add / renamed exercises are always current) so Otto distinguishes a real lift with no PR yet ("Cable Press") from a made-up name ("Push Button") instead of implying it exists. KB guard updated. Deployed. Pattern to reuse for the other on-demand datasets
- 2026-07-05 Faith aesthetic pass: dropped the cream/eggshell CARD wash on the Faith tab cards (Gratitude, Bible & Plans, Prayer) + the Plans page card -> theme.bgCard so they match the rest of the app. WARM theme keeps its cream (needed so cards lift off its warm page); dark was already = bgCard (no visible change). Every amber accent stays (borders/icons/buttons/prayer boxes/verse ref). Today's Message + Faith Hub home base color untouched. Prayer page left as-is on purpose (its only cream IS the amber prayer boxes, which stay). Also removed the amber top-gradient on the Faith home card on DARK only (it muddied the top). Warm-theme + full 5-theme device audit still pending
- 2026-07-04 PR home polish: (1) ghost-PR fix: All PRs + per-lift Records now only show records backed by SURVIVING logged history, so a PR from a deleted workout no longer lingers (non-destructive display gate); (2) All-PRs card redesign to two value tiles (heaviest set / est 1-rep max) with date up in the header, tighter cards, taller scroll; same two-tile style mirrored in the detail Records section; (3) Otto route: added pr_home route key + client trigger + prompt so Otto's "where are my PRs" reply now shows a tappable pill to the All PRs list (deployed)
- 2026-07-04 PR HOME (records Piece B): Exercise Library gets a "PRs" button (top-right) opening an ALL PRs modal (per-lift heaviest set + est 1-rep max + date, sort Recent/A-Z/Z-A, tap a card into that lift); each lift's detail modal gets a "Records & History" section (records + session-by-session history, empty state when none). New utils/liftPR.liftSessionHistory + tests (26 total pass). Otto "New PR" card now deep-links here (openPRs param); Otto KB updated + deployed. Modals mirror the existing workout-library modal pattern exactly. Otto still does NOT get the user's actual PR numbers (see follow-up)
- 2026-07-04 PR wording + explainer (records #2): recap + Otto card reworded ("New heaviest set: 140 lb × 5" / "New estimated 1-rep max: 163 lb", identical in ALL modes, Otto card now 3 clean lines); new 'personal_records' tooltipRegistry entry (auto-lands in glossary) + (i) on the recap trophy card; Otto KB taught PRs/1-rep max (deployed). New standing rule in CLAUDE.md: every behavior change updates Otto's KB too
- 2026-07-04 PR revoke + honesty (records follow-up #1): PRs now DERIVE from logged history (new pure engine utils/liftPR.ts, 21 unit tests) instead of ratcheting-and-sticking, so unchecking/editing/deleting a set (or deleting the exercise) recomputes the lift's best and rolls back a record it no longer earns. "up from" now shows the true prior best (not a same-session intermediate). A protected floor keeps records with no surviving logged history (dev seed / deleted-program PRs). "View Summary" no longer computes PRs (one writer). Device smoke-test PASSED
- 2026-07-04 Otto PR producer (records, Piece A): lift PRs now bank the moment a qualifying SET is checked (not gated behind View Summary; partial sessions count) -> real "New PR" hub card (grouped, Mindful-aware) + recap trophy reads recorded day-hits. New pj_workout_state.prHitsByDay field (additive). Dev tool: "Seed lift PR baselines". Tests 1-3 PASSED on device
- 2026-07-04 Nutrition-achievement mis-timing fix: reverted the #2 force on the NUTRITION check (calorie-goal achievements only count COMPLETED days, so a same-day log can never complete one; forcing it popped legit past-day badges mid-meal). Momentum force kept. NOTE: nutrition check always scores history vs your CURRENT calorie/pace target, so changing your weight pace reshuffles the count (by design)
- 2026-07-04 Achievement pop-on-action timing fix: momentum + nutrition checks take a force flag that skips the once/day gate; food-detail AND recipe-log pass it after a log, so a same-day threshold pops now instead of a day late (idempotent, app-open unchanged)
- 2026-07-04 Bug fixes from Adaptive Target entry point work: adaptive-target.tsx bg (theme.bg typo -> theme.bgPrimary) + missing Stack.Screen headerShown:false (was showing double/raw-filename header); black title/header text -> dimmer tokens (matches app-wide header convention); Sleep Goal wheel picker now re-syncs to the saved value on Cancel; Settings > Goals floating save bar padding no longer cut off by home-indicator curve; Otto FAB now animates up to clear any screen's floating save bar (Settings Goals + Profile) instead of sitting under/blocking it -- new utils/floatingBar.ts signal
- 2026-07-04 Adaptive Target permanent entry point: "Check My Target" row in Settings > Goals, next to Auto-Adjust toggle, pushes to /adaptive-target for a live read of current status
- 2026-07-04 Notification-hub explainers: panel (i) tooltip + full interactive tour (modal-scoped spotlight inside Otto); Adaptive TDEE glossary tooltip + (i) on the Your Target screen
- 2026-07-04 Defect F: non-wearer coaching pivot (getWearState/isLikelyWearer + Recovery-tab whole-screen empty state)
- 2026-07-04 Adaptive TDEE (wearable Phase 2): scale-based real-burn estimate + suggested calorie target, weekly-gated, suggest-by-default via Otto hub
- 2026-07-04 Otto notification hub Phase 1: badge + bell + panel, achievement + daily-goal producers
- 2026-07-03 Otto knowledge base v2 FULL (deployed); UTC->local achievement-gate fix; Apple-cardio timestamp fallback; AI-estimator mic interim toast
- 2026-07-01 Security: all direct third-party API calls moved behind Cloud Functions (Anthropic proxy + FatSecret proxy)
- 2026-06-29 HR-zone bar snap-back fix; splash-flash fix; protein-pattern card copy; water delete/edit + bar-length + goal-hit fixes (pending fresh-build verify below)
- 2026-06-17 Recovery home card SHIPPED: two-face Sleep/Recovery carousel on the home screen (auto-cycles, homeRecoveryScore + activeSleepFace, write-once compute that mirrors the recovery freeze). This closes the "Recovery home card" high-priority track. Detail in git/archive.
- 2026-06-15 Metric drill-down system SHIPPED (Recovery first): tap any metric -> focused MetricDrilldownModal (what-it-is / how-calculated / what-affects / how-to-improve + per-metric 7/30d trend mini-graph); metricDrilldowns registry, wired on sleep + home + log. Closes the "Metric drill-down" track for the Recovery/sleep metrics. Detail in git/archive.
- 2026-06 (older shipped work: At a Glance makeover, empty-state audit + presence helper, wearable Phase 0/1, Today's Message overhaul, sleep-stages graph, comparison presets, reinstall auto-restore, etc.) -> see archive

---

## ⏭️ NEXT UP (THE single ranked work queue -- READ THIS TOP-DOWN whenever Justin asks "what's next")
Ranking IS the priority: [NOW] items are committed, do them first. Below them: active tracks, then QUICK
WINS. Items graduate UP here from the backlog sections so good ideas don't rot down there. When something
ships it leaves this list. Always offer at least one QUICK WIN when Justin asks what's next, and pull a
stale backlog item up now and then. The launch gates further down (REVERT BEFORE LAUNCH, LAUNCH BLOCKERS)
are separate pre-submission checklists, NOT part of this menu.

- [NOW] [TRACK, DECIDED + SPECCED 2026-07-14 -> building] **VISUAL REFRESH.** Justin: the app "still looks
  like a Claude/AI generated app -- a blank form page with data slapped on it." Diagnosis was NOT the headers
  he first pointed at: (1) every card is the same width/weight so nothing leads, (2) every button is FLAT
  PAINTED accent (the #1 machine-designed tell -- and `components/PrimaryCTA.tsx` already solves this and is
  used in only 2 files), (3) the type has no voice (Bebas does every job at every size; DM Sans is the
  AI-app default; Lora is loaded and only ever appears on scripture).
  THE LOOK, one idea -- *light rising from below, dissolving as it climbs*: four-role type system
  (Clash Display titles / Rajdhani numbers / Onest interface / Bitter voice), accent-GRADIENT title fill +
  press, gradient-filled numbers, molded buttons everywhere, glass cards keeping the accent top edge,
  bottom glow (medium, NEVER strong) + halftone rising from the bottom + subtle grain, frosted tab bar,
  accent active tab icons, staggered card entrance.
  Full detail, the ledger of every face tried + verdict, and the DO-NOT-RESURRECT list (topographic, mesh,
  aurora, vignette, line/dot grid, deep-ink titles, a user-facing background picker) live in
  **SPEC_visual_refresh.md**. Build order + status is in the spec.
  >> SHIPPED 2026-07-14: the SURFACE (flat ground + bottom glow + halftone + grain via mixBlendMode,
  glass cards, ABSOLUTE glass tab bar + header so content scrolls under both ends, per-theme card shadows,
  new opaque bgSelected token), the four-role TYPE SYSTEM (typography.ts -- Clash Display / Rajdhani Bold /
  Onest / Ranade, each a one-line swap), gradient hero numbers, molded PrimaryCTA on 4 CTAs, and the type
  sweep across all 6 tabs + 42 components (406 font refs).
  >> ⚠️ THE FONT BUG, 2026-07-14 (top of the spec, read it before touching any weight): Fontshare ships
  Ranade and Clash as ONE FAMILY PER WEIGHT, iOS resolves fontFamily against a font's internal names, and a
  miss falls back SILENTLY -- so every Ranade cut collapsed onto one face. THREE weight changes produced
  zero pixels of difference and I burned an afternoon treating it as a taste problem. **A weight change
  with no visible response is a BUG, not a design failure.** Six .ttf name tables patched (glyphs
  untouched); an on-device 4-cut specimen with an Onest 400/700 CONTROL proved the ladder. Any future
  Fontshare weight must be patched the same way. Google-Fonts-packaged faces (Onest, Rajdhani) were never
  affected -- prefer them.
  >> STACK SCREENS: type sweep DONE (43 files, 1408 refs).
  >> HEADERS DONE 2026-07-14: two components now own EVERY header. **ScreenHeader** (pages: 28px Clash
  accent mixed-case, LEFT, bare chevron, no eyebrow) on all 34 pushed screens. **ModalHeader** (modals:
  20px Clash accent mixed-case, LEFT, centred handle pill + top-right X, optional subtitle/subRow/faith
  amber) on every titled modal -- ~15 standalone components + the inline modals across workout-library and
  all four tabs, plus the tag modals, drilldowns, prayer/faith modals, Otto Notifications, and Day Detail
  (which is always a sheet, so it uses ModalHeader at 20px not the 28px page title). Rules in the spec.
  >> STILL OPEN, see the dedicated items below: the SURFACE pass, the JOURNAL slide-up sheet, the VOICE
  pass, the molded-button rollout, and a short list of non-modal number-face stragglers.
- [BUG, app-wide. **ALL PAGES DONE 2026-07-16.** MODALS + ONBOARDING OPEN] **Card shadows.** Full root
  cause + all five failure modes are in the RECENTLY SHIPPED entry.
  **DONE: every card on every PAGE in the app** -- 6 tabs + ~30 stack screens, plus the component-file
  cards they render (GratitudeStreakCard, MembershipCard, ReadingPlansCard, FaithTodayCard).
  **STILL OPEN:**
    1. MODALS -- excluded by Justin's call ("day detail is a modal, no? we arent touching modals right now.
       way too messy. just full pages"). A modal floats over a dim overlay where a shadow does almost
       nothing, so this is the lowest-value corner. Known sites with a shadow + overflow on the same view:
       log.tsx jump-to-date (2293); workout.tsx Add/Edit Exercise + tag + Load Routine (2923 / 3034 / 3349 /
       3462); workout-library.tsx x5 (3054 / 3273 / 3579 / 3753 / 3806); day-detail.tsx (385);
       ai-meal-estimator.tsx (973); components/BodyMeasurementsCard.tsx picker (186).
       Component-file modals never checked: AchievementToast, CustomFoodCreator, DaySummaryModal,
       FeedbackModal, HRZoneModal, MeasureHowToModal, MetricDrilldownModal, NotificationPanel,
       NutritionGearModal, NutrientDrilldownModal, RepeatMealModal, SummaryReadyModal, ToolkitSheet,
       TooltipModal, VersePoolModal, WeightHistoryModal.
    2. ONBOARDING (7 screens) -- see the surface-pass item; needs a plan first, not a sweep.
       Steps 1 (profile-setup), 2 (style-survey) and 3 (your-style) DONE 2026-07-16, incl. the frosted top
       bar. Remaining: faith-journey (=4), apple-health (=5), notifications (=6), all-set (full bar, no
       label). Each still needs the frosted top bar + the per-screen recipe.
       >> **COMMITMENT WAS CUT 2026-07-16.** Justin: "really corny" -- three vows all opening "I will",
       which is the cadence of a wedding vow. It was also Discipline-ONLY, so Balanced and Mindful users
       went step 3 -> 5 and never saw a step 4; the counter had been lying for two of three modes and
       nobody caught it because the screen it belonged to was the weak one. Cutting it bought a uniform
       6-step flow. The pre-commitment lever is real behavioural science and a one-line version was on the
       table (a checkbox under the Discipline card) -- REJECTED: same theatre, less room to earn it, and
       Discipline already means something via strict colour coding, full metrics and direct language. If
       Discipline users drop off, revisit WITH DATA.
  >> **THERE IS NO SEARCH THAT PROVES THIS IS FINISHED.** Failure mode #5 (the shadow was never written) is
  invisible to every grep -- nothing is broken, so nothing matches. Justin caught Gratitude, the earned
  badges, the log-measurements cards and Support's Promise card AFTER I called it done each time. Expect
  more. The only check that works is opening a screen and asking "does every card here have a theme shadow?"
  ALSO FIXED 2026-07-16 (2nd sweep): plans (hardcoded black), synced-workouts (NO shadow), support +
  whats-new (right wrapper pattern, but 0.12 black = a third of a card), add-food's result rows (a PRIVATE
  per-theme opacity map duplicating cardShadowOpacity, next to a hardcoded '#000'), recipe-builder (0.12),
  food-detail's nutritionCard (NO shadow), ai-meal-estimator (4 inline cards, NO shadow), achievements
  (locked badges on black; EARNED badges could not lift because their shadow is their TIER colour and a
  light colour darkens nothing -- the lift moved to the pulse wrapper they already had), body-measurement-log
  (NO shadow), journal (see below), sleep (0.12 = a third strength).
  STILL BROKEN, KNOWN: support.tsx's `missionCard` (The Promise) -- overflow:'hidden' + NO shadow, needs the
  wrapper like its neighbours. Named `missionCard`, so the `card:` search never saw it.
  CHECKED AND INNOCENT (do not re-litigate): profile.tsx (its only overflow is the save bar's blur clip, no
  shadow); HRZonesStatsCard (progress track); IFCard (already correctly wrappered); log.tsx mealRow (has no
  shadow at all -- a separate design question, not this bug).
  >> ⚠️ THAT "INNOCENT" LIST IS WEAKER THAN IT LOOKS. It was built by checking whether the overflow view had
  a shadow ON IT. Journal proved that is not enough: its card's shadow was one level BELOW the clip (the
  clip hides the swipe-to-delete button), and **a parent that clips also clips its children's shadows**. No
  "shadow + overflow on the same line" search can find that. Re-check the innocent list for the child case.
  METHOD (proven): for each hit ask WHY the overflow is there. Only clipping a corner watermark -> use
  `CardWatermark` and DELETE the overflow (no wrapper, no closing-tag surgery -- this covered 11 of Home's
  13). Clipping something structural (carousel, collapse animation, a tint layer, a 2.5px edge strip that
  cannot self-clip) -> move the shadow to a plain wrapper (`styles.sectionShadow` in settings.tsx, or
  IFCard's `s.cardShadow`) and leave overflow on the face.
  >> SEARCH PROPERLY. A single-line regex (shadow + overflow on the same line) MISSES the StyleSheet cases
  and multi-line style objects -- it missed GratitudeStreakCard and Faith entirely, and Justin caught both.
  Also: grepping a SCREEN is not enough; cards live in component files that the screen only renders
  (Gratitude was the miss). List every `overflow: 'hidden'` (137 hits / 66 files) and check each for a shadow.
  >> DARK IS NOT FIXABLE and does not need to be -- black shadow on a near-black page. Do not "fix" it by
  raising cardShadowOpacity; nothing will happen. If Dark ever wants depth the tool is a light TOP rim.
- [NOW] [VISUAL REFRESH -> SURFACE PASS] The last structural piece of the refresh. **22 stack screens
  still paint the OLD top-down gradient** while the 6 tabs are lit from BELOW (flat ground + bottom glow +
  halftone), so the app changes its lighting every time you leave a tab. Swap each screen's LinearGradient
  wrapper for the flat ground + BackgroundLayers, exactly as the tabs got. Mechanical + low-risk (proven 6x
  on the tabs); do it in batches. ALSO in this pass: the Profile **Supporter card** is translucent so the
  page glow/halftone shows straight through it -- needs an opaque fill like the other cards.
  >> ✅ **DONE 2026-07-16. Every page in the app is lit from below** -- all 6 tabs + ~30 stack screens. The
  app no longer changes its lighting when you leave a tab. Verified: zero screens use `gradientStart` (it
  survives ONLY as the wash behind Otto's + Halo's chat panels -- it no longer means "the top of a page"),
  and every `flex: 1, backgroundColor: bgPrimary` screen now has a `<BackgroundLayers />`.
  >> ⚠️ THE FINISH LINE WAS WRONG THE FIRST TIME, and the lesson generalises: I converted the 11 screens
  using the OLD gradient, found `gradientStart = 0`, and called the pass complete. But **17 more screens
  painted a flat `bgPrimary` and stopped** -- right ground colour, NO glow, NO halftone. A screen that never
  had a gradient does not show up in a search for gradients. Justin caught it by asking "are you not adding
  the gradient to any of these?". SEARCHING FOR THE BROKEN VERSION OF A THING NEVER FINDS THE MISSING
  VERSION OF IT. (Two of them -- diagnostic-report + diagnostic-report-view -- also aliased the theme as
  `t.bgPrimary`, so even the corrected search missed them.)
  >> ONBOARDING (7 screens) is the ONLY thing left, deliberately: it is a separate flow and Justin wants a
  plan before it is touched -- it may be a chance to change more than the surface.
  >> The conversion is 2 lines: a `<BackgroundLayers />` under the container + the import. (On a screen that
  still had the old gradient it was also `gradientStart` -> `gradientEnd`, i.e. the same colour twice = the
  flat ground.)
  >> FAITH SCREENS PASS AMBER (confirmed 2026-07-15): the Faith TAB already does
  `<BackgroundLayers glow={theme.accentAmber} />`, and prayer/plans/devotional/bible/journal are ALL still
  on the old LinearGradient -- they have no glow to be the wrong colour yet. When this pass reaches them,
  faith screens pass accentAmber, everything else passes the accent. Justin asked about this directly; it
  is not a separate decision, just a note for whoever runs the pass.
  >> WATCH: cards are NOT opaque. bgCardGlass runs 0.62-0.82 (Light is the MOST opaque at 0.82; Dark/Slate/
  Warm/Blush sit ~0.62-0.66), so a third more glow bleeds through their cards. Every tinted button shined
  on 2026-07-15 was judged on LIGHT, the friendliest case. If they wash out on Slate/Dark, the fix is the
  new `accentBlueBgOpaque` token (added for Stats' VIEW ALL ACHIEVEMENTS, which sits on the PAGE not a card
  and vanished into the accent-coloured bottom glow).
- [NOW] [VISUAL REFRESH -> VOICE PASS] Ranade (the voice face) is on ~6 lines, all on Home (Coach Insight,
  the readiness line, the Recovery/Sleep AI tips, one Weight line). The judgement calls a script can't
  make: Otto's chat bubbles (HIS = voice, YOURS = interface -- that contrast is the point), Effort vs
  Results insight copy, verses, devotionals. Weight ladder is locked (Regular body / Medium / Bold title).
- [NOW] [BUG, found 2026-07-14] **THE SLIDE-UP BOTTOM SHEETS.** Both violate the standing centered-modals-
  only rule and both are STRUCTURAL conversions (bottom sheet -> centered card), not header swaps -- which
  is why they were parked through the whole modal-header sweep. Grouped because they are the same job:
    1. **Journal "New Entry"** (journal.tsx). Slide-up sheet (translateY + handle); the handle pill is
       decorative. "New Entry" copy is fine; the SHEET is the problem.
    2. **Stats graph creator, the "Choose data type" step** (found 2026-07-16). Same slide-up sheet, and
       Justin's note on top of the conversion: that step is "all white and needs some oooomph somehow" --
       i.e. it needs a real design pass, not just a container swap. Do the structure first, then the look.
  >> Both are MODALS, so they sit outside the 2026-07-16 glow/shadow sweep (which is pages only, by
  Justin's call -- modals float over a dim overlay where a shadow does almost nothing).
- [QUICK WIN] [found 2026-07-14] **Non-modal number-face stragglers.** The modal + page header sweeps are
  done, but a scan still finds Type.num (the NUMBER face) on a few NON-modal things: Profile's save-bar
  buttons (CANCEL / SAVE PROFILE), a "REST DAY" workout-tab heading, and some IFCard / cardio button labels.
  Same class as the PrimaryCTA fix -> button labels go to Interface, the REST DAY heading to Clash. Also
  optional: two info-modal titles (CalorieFloor, MeasureHowTo) sit on bold INTERFACE rather than Clash --
  not a bug (no number-face, no caps, no black), Justin's call whether to unify them.
- [found 2026-07-16] **Centralize the card shadow (stop the drift at its source).** Purely preventive --
  ZERO visual change -- so it is ranked below anything a user can see. But it is the thing that ends the
  bug class: every card hand-rolls 5 shadow props, and that produced FOUR different failures in one day
  (hardcoded black x3, wrong opacity, missing offset/radius, clipped by overflow). Smallest useful version:
  export ONE `cardShadow(theme)` from GradientCard and have every hand-rolled card spread it -- then "make
  cards deeper" is one number, not a 40-site hunt. The FULL fix is migrating cards to `<GradientCard>`, but
  that needs GradientCard's OWN hardcoded '#000' @0.12 shadow fixed first or every card gets worse, and
  each card passes different props, so it is a real refactor. NOTE: this does NOT prevent someone re-adding
  overflow:'hidden'; what helps there is that `CardWatermark` now removes the reason anyone did.
- [QUICK WIN] [found 2026-07-16] **`bgInset` tiles with no border.** Profile's estimate tiles + Projected
  box were fill-only (no outline) and vanished once Light's ground brightened; both fixed. The same
  "bgInset fill, no border" pattern almost certainly exists on other screens -- sweep for it.
- [QUICK WIN] [found 2026-07-15] **Progress-bar treatment pass.** The bars (calories, water, steps, macros,
  etc.) are flat solid-fill on a flat track -- plain. Give the fill a subtle gradient and/or a soft top sheen
  (Whoop/Oura style), maybe a faint glow at the leading edge. Own mini-treatment, part of the visual refresh
  button/surface family. Every bar animates already, so just the fill styling. Justin flagged 2026-07-15.
- [QUICK WIN] [found 2026-07-16] **Flat-button mold sweep, ROUND 2 (finish the honest gap).** Round 1
  (2026-07-16) molded the flat solid-accent buttons on the main tabs + Add Food + Day Score. NOT yet scanned
  for the same flat-button pattern: the deeper stack screens -- recipe-builder, recipe-log, day-detail,
  challenge-create, comparison-report, adaptive-target, ai-meal-estimator, food-detail, index (home), faith,
  sleep, achievements, bible, journal, settings, reports, diagnostic-report(-view), body-measurements,
  support, mission, onboarding. Method that works: grep `backgroundColor: theme.accentBlue(Raw)?/accentAmber`
  then READ each hit -- skip progress bars, dots, check circles, round FABs, and the labeled pills in the "+"
  expand menus (those are FAB affordances, leave them). Only mold real primary buttons. Left on purpose:
  the IF card "Last Meal" red button (Justin's call, leave), workout rest-timer Skip/Done pills.
- [QUICK WIN] [found 2026-07-15] **Otto (+ Halo?) FAB placement audit.** The floating companion FAB sits
  bottom-left on many stack screens and OVERLAPS the last card's content when the page has no bottom padding
  (confirmed on Sleep & Recovery > Recovery: the FAB covers the Recovery Coach text). Sweep every screen that
  renders the FAB, confirm each scroll view has enough bottom contentInset/padding so nothing sits under the
  FAB, and decide whether Halo needs the same pass. Systematic, low-risk padding fix.
  >> PARTIAL 2026-07-16: the two Justin flagged from the gym are FIXED -- sleep.tsx + achievements.tsx scroll
  paddingBottom bumped to `insets.bottom + 96` (clears the 56px disc sitting at bottom+20..bottom+76).
  achievements was worse: a flat `40` that never even added the safe-area inset. STILL OPEN: the FULL sweep of
  every other Otto-FAB screen (day-detail, day-summary, settings, add-food, etc.) for the same clearance.
- [NOW] [VISUAL REFRESH -> CHIP / ICON-BUTTON TOP SHINE] The SECOND button-texture thread (distinct from
  the molded PrimaryCTA, which is the solid primary buttons). DONE so far: all 5 tab-header icon-squares,
  Library pills, "+ Log", the 8 water buttons, HR Zones/Tags, the selected effort tile, Repeat/Pick-a-Day,
  and (catalog GROUP 1) the stack-screen header squares -- Bible + Add Food -> HeaderIconButton, Bible's
  Mark Read pill, the Achievements EARNED badge.
  CATALOG, run 2026-07-15: 92 tappable tinted buttons across 22 files, and they are NOT one animal:
    (1) header squares -- DONE.
    (2) BODY tinted buttons. HONEST CATALOG re-run 2026-07-15 (filter = UNCONDITIONAL accent tint on a
        tappable; a `active ? tint : grey` fill is a SELECTOR, not a button): ~23 real candidates in 14
        files, down from the 410 raw hits / 92 "tappable-looking" I first quoted -- BOTH of those numbers
        were mine and both oversized the job. Caveat: the filter misses real buttons whose tint is
        CONDITIONAL (Load Program was one: blue normally, green when active), so the true count is ~23 + a
        few. Expect some of the 23 to turn out to be badges/selectors on reading -- that was today's hit rate.
        >> DONE 2026-07-15: workout-library (Fill from Preset, Load Program, Load Routine, USE) and
        add-food + food-detail (Retry, Use a Saved Food, Create Food for this Barcode, Add x2, Edit, the
        -/+ serving steppers, Replace).
        >> REMAINING: stats (3 body buttons), ai-meal-estimator, journal, prayer, day-detail, day-summary,
        settings (1 each).
        >> ONBOARDING (6, one each in your-style/style-survey/commitment/apple-health/notifications/
        profile-setup) is OUT of the shine pass -- a flow you see once, and they are CTAs (the molded
        PrimaryCTA thread) or selectors. Justin agreed 2026-07-15.
        >> DELIBERATELY SKIPPED, with reasons (do not "fix" these later without reading why):
           - Duplicate (workout-library) + the library filter icon: bgInset/NEUTRAL, not tinted. Duplicate
             is the quiet half of a pair next to USE -- shining it flattens a hierarchy that is working; the
             filter icon would change TEXTURE between states, and bgInset IS the near-white fill where gloss
             genuinely does not show.
           - Remove (food-detail photo) + the EvR trash: DESTRUCTIVE. Shine says "press me", the last thing
             a delete should say. Same call both times.
           - The two SET buttons (add-food barcode override): ~18px tall AND they repeat down a list -- the
             exact repetition that made the Repeat pills read plastic.
           - AI ESTIMATE badge, unit selector (food-detail): a View and a selector.
        >> WATCH: add-food's "Use a Saved Food" + "Create Food for this Barcode" already had a hand-rolled
        top-light (a 1.5px BRIGHT accentBlueRaw top border) and now carry TWO top treatments. If they read
        doubled-up, drop the BORDER (the rule: shine owns the top-light, border stays even on 4 sides).
        >> DEAD CODE found: add-food's `addNewBtn` + `addNewBtnText` styles are defined and never used.
        >> GROUP 2 IS DONE 2026-07-15. Also swept: stats (6) + BodyMeasurementsCard's Log Measurements +
        StatsGraphCard's Select Nutrient, the 5 component MODALS (Got it / Full Breakdown x2 / Macros
        expander / Add / CalorieFloor), the last 6 screens (journal sort, prayer's people icon -> another
        HeaderIconButton, day-detail Cancel, ai-estimator Confirm+Edit, day-summary, settings Import), and
        the whole FAITH tab (8 amber buttons incl. the reading tiles) + GratitudeStreakCard's 4.
        >> THE CATALOG WAS WRONG THREE TIMES, all mine, all the same mistake -- quoting a grep instead of
        reading code: (1) 410 raw hits -> (2) 92 "tappable-looking" -> (3) ~23 real. Then Justin found the
        Log Measurements button, because I only ever grepped `app/` and never `components/` (+7). Then he
        found the whole FAITH TAB, because every grep searched for the BLUE recipe and faith is AMBER.
        LESSON: a tab file is not a screen (it renders components), and accentBlueBg is not "the tinted
        button" (faith has a parallel amber system, half of it hardcoded).
        >> STILL OPEN (hygiene, no visible payoff -- do not do it first): 25 hardcoded `rgba(212,134,10,..)`
        across 10 files. That hex is DARK's amber baked in, so faith FILLS wear Dark's amber on every theme
        while the text beside them uses each theme's own. Subtle at 10% alpha. bible.tsx's share was cleaned
        as part of its sweep.
    (3) SELECTORS -- SKIP: bible chapter pills / book rows / sort toggles, onboarding style-survey +
        your-style. Same tint, but they are selected/unselected STATES. Design the states, don't gloss them.
    (4) BARE icons -- NOT this pass: the TooltipIcon "?" on ~12 screens, day-detail's calendar, the EvR
        trash. These belong to the title accent-GRADIENT fill pass.
  Do NOT mass-apply; "if everything shines it looks cheap". Spec OPEN list + build order step 12.
- [VISUAL REFRESH -> OWN DESIGN PASS] **Bible's Reflect bar does DOUBLE DUTY.** One tinted strip is
  simultaneously (a) a BUTTON -- the left flex:1 region is a tap target opening the reflection modal, or the
  journal once reflected -- and (b) a TOOLBAR holding four unrelated icon buttons (sun / star / share /
  Halo). The tint says "I am one thing you press" while four parts of it do four different things and only
  the left half does what the label says. That is why it reads off, and why it was REFUSED shine on 07-15:
  a gloss across the whole strip doubles down on the lie, and it is the widest surface in the app so it
  would go plastic anyway (see shine-scales-with-area). Flat is correct FOR NOW (tier-3 passive) but it is
  treating the symptom. FIX = split the double duty: "Reflect" becomes a real tinted pill that shines like
  any other action button, the four icons go on a flat strip or the page itself. Needs its own screenshots.
  NOT free: the sun + star icons are TUTORIAL TARGETS.
  >> RULE CORRECTED 2026-07-15, same day it was written: I logged "SHINE SCALES WITH AREA" off Justin's
  "plastic-y" on the 190px Repeat pills, and predicted full-width buttons would need a weaker gloss. WRONG --
  workout-library's FULL-WIDTH Load Program/Load Routine took the default 0.52 unchanged and Justin liked
  them. "Plastic" came from REPETITION (2 pills x 8 slots), not width; it was DON'T-OVER-GLAZE in disguise.
  A wide button alone is fine. Count how many are on screen before blaming the gloss. Detail in the spec.
- [PARKED -> molded-button rollout] The molded PrimaryCTA is on ~4 CTAs; ~13 more primary CTAs, the
  circular FAB variant, and the PrimaryCTA row-height bug remain. Full detail in SPEC_visual_refresh.md
  PARKED section. Also still open from the OPEN list: title accent-GRADIENT fill (INCLUDE the header "?"
  help icon in this pass -- it's a bare icon, so it gets the SAME masked accent-gradient FILL as the titles,
  not the square-shine the other header icon-buttons got), card stagger on mount, Warm + Blush getting the
  Light treatment.
- [TRACK, VISION LOCKED + SPECCED 2026-07-07 -> ready to build] Custom Reports (Pro). Model: report =
  date range (week/month/3mo/6mo/1yr/custom) + chapters, each a PICKER into a library of ~55 pre-designed
  blocks the user assembles freely; templates = pre-filled block sets; exportable (PDF/share); Pro-gated
  (free = no access; faith DATA still free elsewhere); Mindful + faith-tier aware; wearable-gated blocks.
  Premium is protected because WE design every block (user picks WHAT, never HOW it looks -- not a build-
  your-own chart tool). Phase 2 = AI prompt that ASSEMBLES blocks from plain language (blocks are the
  foundation it needs). Full detail + tiered block catalog: SPEC_custom_reports.md. Live light-theme/cyan
  mockup built this session. NEXT: rank blocks Core vs Wave 2, pick launch templates, storage + export tech.
  >> SLICE 1 BUILT 2026-07-07 (foundation, testable end-to-end, pure JS no rebuild): utils/reports.ts
     (pj_reports store, additive) + utils/reportBlocks.ts (block registry + 7-chapter taxonomy) + app/
     reports.tsx (hub: list/new/delete, beta-open to all) + app/report.tsx (report screen: range chips +
     block picker + 3 purpose-built renderers -- gradient SVG line trend, stat tiles, macro bar, all live
     from fetchTrendData) + Stats > Reports entry card. 3 starter blocks: Weight trend, Nutrition headline,
     Macro split. REMAINING: more blocks (grow the ~55), custom date range UI, export (PDF/share),
     templates, per-chapter faith-tier/wearable gating in the picker, tooltip + Otto KB. Device-verify pending.
- [FOLLOW-ON TO DISCUSS, from Repeat a Meal which SHIPPED 2026-07-10] "SAVE AS A MEAL" = save a group of
  distinct foods as a named, reusable one-tapper (Justin curious). Differs from a Recipe: a recipe BLENDS
  ingredients into ONE food line (single entry, loses the items); a meal keeps the foods as SEPARATE
  entries logged together. Repeat a Meal already re-logs separate entries from history; this would persist
  a named bundle. Needs its own design pass (look/behavior, where it's saved + surfaced, how it lives
  alongside recipes without confusing the two). Full spec context: SPEC_repeat_meal.md bottom section.
- [ ] [FIX, data-integrity, needs reinstall verify] Achievement unlockedAt reinstall hardening. Badges
  stamp unlockedAt = new Date() at award time (achievementData.ts:1420); on a reinstall before the cloud
  restore lands, a check can first-unlock against an empty store and re-stamp the whole earned set to
  "today" (this is the June-22 clump on Justin's test account). Achievements ALREADY sync via storageSet +
  the reinstall auto-restore + checkAndUnlock is idempotent, so a proper restore preserves dates -- the
  residual is a RACE. FIX: gate achievement checks behind the restore-complete flag so no scan runs until
  the restore lands. Optional belt-and-suspenders: backfill unlockedAt from goal-day history for count-
  based badges. Touches the sync/restore/achievement flow -> do deliberately + verify with a device
  reinstall. (Surfaced via the Custom Reports "Achievements earned" block 2026-07-07.)
- [ ] STARTER CHALLENGE -> theme unlocks (Slate / Warm / Blush). The 3 non-default themes are meant to be EARNED
  by completing a short starter challenge (per CLAUDE.md theme system), but the unlock mechanic needs building /
  verifying. FIRST STEP = state-check what already exists (are the themes actually gated? does any challenge
  exist?) before building, so we don't assume. Keep the "no theme is EVER paid" rule intact -- these are earned,
  never bought (distinct from the monetization track). Surfaced 2026-07-11 (Justin flagged it during the
  monetization thread so it would not get forgotten).
- [PARKED 2026-07-12, known limitation, do not keep prompt-tweaking] EvR ranked diagnostic card INSIGHT (the middle
  "why" sentence) occasionally comes out rambling/circular -- e.g. the sleep->workout card kept landing on "...the
  session you planned simply does not happen," which just restates the claim+proof and reads weird. INVESTIGATED:
  the insight is AI-voiced fresh each report (utils/coachAI.ts voiceDiagnosticCards + FEED_VOICE_RULEBOOK), so
  there is NO fixed string to edit; it varies (good version seen: "your body treats poor sleep as a recovery debt,
  skipped sessions are the first thing it trades away to pay it"). Root of the weird ones: on cards where claim +
  proof already state the outcome, the AI pads the insight by re-stating that outcome. TRIED TWICE (2026-07-12):
  two FEED_VOICE_RULEBOOK nudges (ban mechanisms/filler; then a coherence/no-ramble nudge that even quoted the bad
  sentence) -- BOTH slipped through; prompt-steering can't GUARANTEE an LLM avoids a phrasing. Both reverted; code
  is at the clean baseline. Justin chose to leave as-is (2026-07-12), accept the variance. IF revisited, the only
  RELIABLE (deterministic) fixes are: (a) a post-generation filter in the voicer that rejects insights matching
  bad patterns (whack-a-mole), or (b) DROP the insight sentence on these cards entirely (claim+proof+lever already
  stand strong) -- trade-off is losing the occasional good insight. Not a copy-string audit; it's an AI-output
  problem. Files: utils/coachAI.ts (FEED_VOICE_RULEBOOK, voiceDiagnosticCards, sanitizeVoicedLine).
- [QUICK-ISH WIN, raised 2026-07-13, Justin loved the result] PRIMARY BUTTON ROLLOUT. The Support screen's
  "Become a Supporter" CTA was rebuilt and is now the app's button standard, extracted to components/
  PrimaryCTA.tsx: a MOLDED look (true vertical light->dark gradient overlay, so it works with every accent
  with no color math -- the old "sheen" was a translucent band across the top half, which read as a two-tone
  slab with a seam), an ACCENT-tinted glow instead of a black shadow, Bebas caps type (DMSans bold = the same
  weight as body copy, so labels read as plain text on a colored rectangle), press-scale + a built-in busy
  spinner. RULE: solid fill = the ONE primary action on a screen; secondary actions keep the house tinted
  recipe. TASK = sweep the app for primary CTAs and swap them to <PrimaryCTA> (Justin: "I kind of want to go
  through the app and find buttons to change to this style"). Deliberately NOT swept yet -- do it as its own
  pass so each screen's primary-vs-secondary call is made deliberately, not bulk-replaced.
- [EXPLORE, unspecced -- raised 2026-07-13 from the gym. Do AFTER the monetization/Support track closes.]
  Four raw ideas, ranked by how real they are. NONE are specced; each needs a design pass before any code.
  1. [MOST REAL] GOAL WEIGHT + GOAL DATE ("by when"). Today the user picks a PACE and the app derives the date.
     Invert it: let them pick a TARGET DATE too (e.g. "175 -> 162 by late January, when the baby comes") and the
     app back-solves the weekly pace + calorie target to land on that date. Uses math that already exists (pace <->
     deficit <-> target), just run backwards. CRITICAL SAFETY TIE-IN: an aggressive date can demand a deficit that
     drops the target under the calorie floor -- utils/calorieFloor + CalorieFloorModal ALREADY handle exactly this
     (warn + consent, never hard-block, offer the fastest SAFE pace), so the branch is built. Surfaces: onboarding
     + Profile. Open questions: what happens as the date approaches and they're off-pace (silently re-solve? nudge?),
     and the Mindful variant (a countdown to a weight is the most judgment-heavy thing in the app -- probably neutral
     or off). See SPEC_calorie_floor.md.
  2. [DESIGNED 2026-07-13 -> SPEC_drink_builder.md. The BEST of these four ideas.] COFFEE DRINK BUILDER
     (Starbucks/Dunkin). You cannot log a real coffee order anywhere -- every app has ONE fixed "Grande Latte"
     entry and nobody drinks that. This builds the drink from components: shop -> drink -> size -> milk -> syrup
     pumps -> extras. It is ARITHMETIC, not guesswork (a pump of syrup, an ounce of oat milk, a shot of espresso
     are all published, stable numbers), so it satisfies the honest-numbers rule BY CONSTRUCTION -- unlike the
     restaurant-database idea, which never can. Offline, no API, no AI. Days, not months.
     DESIGN TRAP already caught: milk volume depends on the DRINK, not the size (a grande latte is ~12oz of milk;
     a grande iced coffee is a ~2oz splash), so each drink+size carries milkOz + shots + standardPumps.
     SHOWS sugar (for coffee, sugar IS the story) and captures caffeine in the table even before it's surfaced.
     ⚠️ GATING ITEM = the DATA AUDIT (Phase 1 in the spec): enumerate BOTH menus fully before any code. Starbucks
     SYRUPS vs SAUCES differ; Dunkin FLAVOR SHOTS (unsweetened, ~0 cal) vs FLAVOR SWIRLS (sweetened) is the
     single easiest thing to get backwards, and it would make every Dunkin number wrong.
  3. [RESEARCHED 2026-07-13 -> SPEC_restaurant_mode.md. NOT approved to build.] RESTAURANT MODE ("what should I
     order"). MenuFit teardown DONE, do not redo it. Findings: it's a DECIDER not a logger; its good part is
     composing + scoring a full order at CHAINS with a one-line insight; it works only because chains PUBLISH
     nutrition data. At LOCAL restaurants it is HOLLOW -- Justin looked up BurgerUp and every item showed `0 cal`
     (scraped menu text, no nutrition). FatSecret's chain data is ACCURATE (verified vs official: Big Mac,
     McDouble, CFA nuggets all within ~10 kcal or exact), and `food_brands.get?brand_type=restaurant` gives a
     restaurant list -- but there is NO endpoint to enumerate a brand's foods (workaround: paginated brand search,
     completeness not guaranteed). THE EDGE WE'D HAVE: MenuFit only knows your GOALS; we know your REMAINING
     macros today, and we can log the order in one tap (their own users beg for MFP integration). Real feature,
     not a weekend. Full teardown, data feasibility, v1 shape, risks + the "don't build this from FOMO" warning:
     SPEC_restaurant_mode.md.
  4. [RESEARCHED 2026-07-13 -> DEAD END as a competitor, but ONE idea worth keeping.] TRAINERIZE is B2B software
     for personal TRAINERS (build a program -> assign it to a client -> message them -> take payment). 400k
     trainers, 1.6M clients. The trainer is the customer; the client just receives what they're given. That is the
     OPPOSITE of Project J (a consumer app for someone coaching themselves, "you vs yesterday"). Nothing to copy
     at the product level. Do not revisit as a competitor.
     >> THE ONE THING WORTH STEALING: **OTTO AS A WORKOUT/ROUTINE BUILDER.** Trainerize's AI workout builder lets
     a trainer describe goals + preferences and generates the workout. WE ARE ALREADY MOST OF THE WAY THERE: Otto
     already knows the user's REAL exercise library (live union of pj_exercise_library + programs + weekly template
     + PR'd lifts), their PRs, per-lift trends, recent sessions, and training frequency -- and he can already
     DISCUSS training ("what's a good chest workout"). The missing step is small: let him BUILD one. "Otto, make me
     a push day" -> he generates a routine using exercises the user ACTUALLY HAS -> one tap saves it into the
     Workout Library as a program/routine. Turns Otto from knowledgeable into useful.
     OPEN QUESTIONS before build: does he propose sets/reps/weight (and from what -- their PRs? their last
     session?); what happens when he suggests an exercise they DON'T have (offer to add it to the library?); does
     it respect the weekly template; Mindful behavior (a prescriptive "here's your workout" is judgment-heavy);
     and the honest-numbers rule (never invent a weight that looks like a recommendation from their data if it
     isn't). Reuses the conditional-injection pattern from utils/companionPRs + companionWorkouts.
- [ ] QUICK WINS (small, grab-when-convenient): none queued right now -- add here as they come up. (DONE 2026-07-07: FAB text-label rings app-wide · inline Add Exercise button · the whole gym list.)

---

## 🚨🚨🚨 REVERT BEFORE APP STORE LAUNCH 🚨🚨🚨 (TESTFLIGHT-ONLY HACKS - DO NOT SHIP)
>>> ⚠️ 2026-07-13: **LAUNCH_CHECKLIST.md IS NOW THE SINGLE SOURCE OF TRUTH.** It consolidates this banner, the
>>> LAUNCH BLOCKERS section below, and the launch-only notes in SPEC_monetization.md into ONE ORDERED list --
>>> ordered because several of these steps BREAK THE TESTERS if done in the wrong sequence (the beta caps cannot
>>> be reverted until testers are on a RevenueCat build AND have been granted the entitlement). Every item there
>>> was verified against the real source with file:line. Work from that file. The lists below stay for context.
Temporary for Justin's TestFlight testing (added 2026-06-24). EVERY ONE must be undone/replaced before a public release. Check this list at EVERY launch-prep session.
1. [RESOLVED IN CODE 2026-07-01] Anthropic API key was bundled client-side; now routed through the aiProxy Cloud Function (key server-side only, client grep clean). TWO TAILS STILL OPEN: (a) client change reaches testers only on the NEXT TestFlight build; (b) the previously-exposed key must be ROTATED (regenerate + revoke) after testers are on the new build, before public launch.
2. ⚠️ devProUnlocked = FREE UNLIMITED PRO. Settings dev toggle grants Pro with no payment. Before launch: gate Pro on a real subscription (RevenueCat/StoreKit) and REMOVE the override + toggle.
3. ⚠️ AI ESTIMATOR QUOTA RAISED. PRO_LIMIT bumped to effectively unlimited (services/aiMealEstimator.ts). Before launch: restore real caps.
4. ⚠️ BETA CAPS RAISED (2026-07-01). Otto FREE_DAILY_CAP 10->100/day; Halo 5->50/day; AI Meal Estimator FREE_LIMIT 3->100/month. All marked with loud BETA HACK comments. Before launch: revert to 10 / 5 / 3 (or final caps).
5. ⚠️ CUSTOM REPORTS OPEN TO ALL (2026-07-07). Reports is a Pro feature but REPORTS_BETA_OPEN=true in app/reports.tsx grants every TestFlight user full access. Before launch: gate on the real subscription + set false (the Pro-gate architecture is already in place, so it's a one-line flip).
6. [DEV TOOL, not user-facing] "Weight History self-test (dev)" row in app/settings.tsx dev tools (added 2026-07-10). One-tap self-test that seeds/edits/deletes throwaway far-back dates + asserts data-integrity/badge rules, auto-cleans. Same class as the other "(dev)" seed tools -- remove or gate them all behind a dev flag before public launch. Safe (only writes to confirmed-empty dates) but should not ship visible.

---

## 🚧 LAUNCH BLOCKERS
- App name -- ⚠️ OLD SHORTLIST KILLED 2026-07-13 (Prevail/Steadfast/Worthy/Haven/Witness/Sown -- Justin: "those
  aren't good"). Do NOT resurrect it. Starting fresh. Check App Store + TikTok/IG handle + domain availability on
  any candidate. THIS BLOCKS the whole App Store listing (description, screenshots, URLs). Logo already exists
  (assets/images/icon.png + the gold variant).
- App Store Connect setup -- privacy label, age rating, URLs, description, screenshots, review notes. No code. Do after name is locked.
- Verification scan -- production build, device install, all flows confirmed before submitting.
- Anthropic account spend limit -- hard monthly spend cap in the console so AI cost can never run away (the final "sleep at night" switch on top of per-user daily caps).
- [RESOLVED IN CODE + DEVICE-VERIFIED 2026-07-01] Security #6: move ALL direct third-party API calls behind Cloud Functions. DONE (Anthropic + FatSecret). Same two tails as REVERT #1 (next build + key rotation).

---

## 🔎 POST-TRIP / PENDING FRESH-BUILD VERIFY
- [ ] WATER ENTRY DELETE/EDIT (data-loss fix): confirm deleting/editing a water entry no longer drops other entries. Fixed to re-read + reconcile storage and remove/edit only the targeted entry by timestamp. ⚠️ still live in the trip build until rebuilt.
- [ ] WATER BAR LENGTH: confirm the Home water bar fills correctly on cold launch (was stuck short every kill+reopen; fixed with a live pctRef).
- [ ] WATER GOAL ACHIEVEMENT: confirm hitting the water goal pops the trophy + marks the daily-goals counter today. Also watch whether daily-goal TOASTS actually pop for steps/active/exercise (suspected batch/no-pop).
- [ ] DAILY GOAL ACHIEVEMENTS: warm-app skip/batch still open (needs a goal-hit to verify; wrong-date fixed 2026-06-29). See archive for the 3-part breakdown.
- [ ] FIBER LABEL: EvR "food quality" card now reads "FIBER AVG/DAY" -- confirm.
- [ ] OPTIONAL HR ZONE BAR REDESIGN: one full-width segmented bar vs independent per-zone bars. Numbers honest either way; visual call.

---

## 📌 PARKED SMALL IDEAS (do when convenient)
- [ ] [NEEDS DESIGN] Goal-hit does NOT reverse when you delete the entry that crossed the goal (e.g. quick-add water over goal, then delete it -> still shows "achieved today"). Cosmetic (no data loss) BUT reversing is thorny: crossing a goal increments a LIFETIME count feeding goal achievements + streaks, so un-crossing means decrementing + possibly re-locking an achievement (fights "achievements never revoke"). Do NOT bolt on a naive reversal.
- [ ] Achievement "pop on the action" timing: action-earned achievements don't pop until next app-open (per-category check gated once/day, runs on open before the action). Fix: run the check right after the qualifying action + let a same-day action bypass the once/day gate. BEST DONE with the notification-hub work.
- [KILLED 2026-07-05] "Manage in Settings" in-app hotlink -- NOT VIABLE. Linking.openSettings() only opens the app's generic iOS page (Local Network / Camera / Siri / Cellular), which has NO Apple Health row, and iOS exposes no deep-link into the Health data-access screen. A button there would mislead. RESOLVED INSTEAD via Otto: his KB gives the correct manual route (Settings > Privacy & Security > Health > Project J, then toggle data types) and is told never to point at the app's iOS page or the in-app Health section. Deployed 2026-07-05.
- [ ] "View all achievements" button in the Stats Records or Streaks section (trophy icon in the header is buried).
- [ ] [TS CLEANUP, low] add-food.tsx line ~1526: pre-existing tsc error -- the favorite object built on heart-tap isn't assignable to MyFood[] (MyFood type drifted from the object shape: brand/isMyFood/fsId/type). Runtime-safe (Metro strips types, fields have safe defaults), no crash/data loss. Just makes the file not tsc-clean. Tidy the MyFood type or the object shape eventually.

---

## ⭐ HIGH-PRIORITY OPEN (bigger tracks)
- [HIGH] Onboarding full pass -- functionality sweep AND apply the new gradient/aesthetic treatment across all onboarding screens. Dedicated session. app/onboarding/*.
- [HIGH] Lifting analytics layer (DEEPER stats only -- core PR feature already SHIPPED 2026-07-04: per-lift PR detection + revoke/honesty engine, All-PRs home + per-lift Records, Otto PR data). REMAINING/parked: 1RM trend as a graphable stat, surface PRs in EvR, volume per muscle group. Full spec: SPEC_lifting_log.md. PARKED for now (Justin 2026-07-05, not the next session).
- [HIGH] Tutorial + tooltip full audit -- in progress, tab by tab (batches of 3, device-tested each). REMAINING: spotlight lag (TestFlight verify), hidden-card guard, Log Today's Total interactive tutorial, tooltip audit + wording passes, flag every card missing a (i). data/tutorials.ts + tooltipRegistry.ts.

---

## 🗂️ OPEN BACKLOG BY AREA (open/future only; shipped history is in the archive)

### Onboarding
- Mindful onboarding -- encouragement language + Mindful-specific Screen 4 copy (graph/presets already gated off). Copy pass.
- Macro presets -- Screen 4, Discipline/Balanced only. Also settable in Settings.
- Progress bar on onboarding screens -- segmented step indicator, screens 2-7.
- Apple Health home banner for skippers -- one-time dismissable banner (pairs with the openSettings hotlink above).
- Weight projection graph -- profile page version (onboarding version built; profile.tsx not).
- Daily Intention card for Not Right Now users -- Today's Message morphs for NRN. Low priority.

### Home / UX
- Primary button audit -- all primary CTAs to full accent fill; transparent bordered = secondary only.
- Day detail BMR row -- add estimated BMR to the calorie breakdown (Consumed/Burned/Net).
- Exclusions polish -- first-use callout on calendar dot; help article; excluded-list view (view + un-exclude); three entry points.
- Day Summary card enhancements -- configurable surface time, earlier-access home card option, richer multi-day context. Design session first.
- Day Summaries archive layout -- collapsible rows may get clunky at volume. Revisit at 8+ weeks history.
- Greeting area customization -- settings picker for the top-left home header slot. Design session first.
- Physical measurements in profile -- waist/neck/hip (enables Navy body-fat estimate).
- HealthKit permissions audit -- review requested vs available data types; add high-value metrics before next build.
- Loading + error states audit -- sweep all screens for flashy load behavior + silent failures.
- Custom profile pictures -- user-set avatar via image picker (HeaderAvatar). QoL/aesthetic bump, likely small.

### Food & Log
- Big 3 macro presets -- quick protein/carb/fat picker from the macro gear icon and/or Settings.
- %DV entry in Create Food -- bidirectional amount/%DV fields. Full spec: SPEC_nutrition.md.
- Food search fuzzy matching -- local results use exact substring only; add fuzzy/Levenshtein. add-food.tsx.
- UNSET button on food detail -- unset a barcode-linked food without visiting Set Foods. Needs barcode route context.
- SET banner tip -- "(i) Tap SET on the correct item" after a barcode scan. On the fence.
- Calorie target transparency -- (i) tooltip explaining how the recommendation is calculated (BMR/lifestyle/pace). settings.tsx.

### Workout
- Load routine modal polish -- editable/deletable presets are a bigger dedicated-session item.
- Workout tab muscle group breakdown -- aggregated session-level summary (MuscleMap is per-exercise only).
- Daily exercise + active-calorie goal progress display -- goals settable + celebration fires, but no home progress display. Design decision: Fitness Metrics card vs Activity Rings vs under Steps.
- Onboarding-to-home transition -- guided first steps post-onboarding, no cold drop-off. Planning session.

### Stats & Reports
- Comparison + calendar CPP polish pass -- confirmed-needed ("hideous, very cheaply done"). All 4 presets + day-vs-day work.
- [PARKED] Body Fat as a graphable metric -- the other four (VO2 Max, Resting HR, Resp Rate, Blood O2) ALREADY ship: live in the graph creator + trend engine + At a Glance (registry/roadmap was just never crossed off). Body Fat (bodyFatPct) was retired 2026-06-17; now restorable off Body Measurements (Navy BF%), but SKIPPED for now per Justin 2026-07-05.
- Trend indicators -- Apple-style up/down arrow on graph values / At a Glance vs prior period.
- EvR refinement pass -- correlations need to be genuinely smart. Hard to test without data. Revisit with Smart Tips.

### Faith
- Today's Message overhaul -- CORE COMPLETE 2026-06-23. Remaining: 5-theme audit + the next-up Bible tutorial.
- Cycling Bible verses -- fine-print on Log + Workout tabs. Rooted on / Exploring optional / NRN hidden.
- Plans hub browsing -- category grouping, filter chips, search. app/plans.tsx.
- Bundle full KJV offline -- today fetches from GitHub (breaks offline); bundle ~4MB. data/bible-web.ts.
- Achievement toast remaining -- trigger context under achievement name; wording update before launch.
- Bible translation selector -- picker in the Bible gear modal. KJV only today.
- Faith AI verse-banner share tap-through -- tapping outside the share sheet highlights a random verse. Cosmetic.
- Challenges/Missions layer -- full spec in SMART_COACH_SPEC.md. Parked behind the Faith AI track.
- Donate/Support button -- post-TestFlight. StoreKit tip jar or Ko-fi. Not urgent.

### Sleep & Recovery
- [SHIPPED, verify pending] Recovery Score is wired into weekly + monthly summaries (avgRecoveryScore + HRV/cardio-recovery/prev-activity factors), dayScore.ts (third category), and Stats (graphable key + At a Glance). Left here only to confirm the Day Summary CARD surfaces it visually; the data layer is done. Detail in SPEC_recovery_coach.md.
- Sleep score stage-weight tuning -- bump REM weight, soften deep-sleep penalty (currently equal at 30pts). utils/sleepScore.ts.
- (note) Hypnogram connector lines CUT PERMANENTLY -- too sloppy when transitions are dense; no clean solution.

### Coaching & AI
- Voice (anti-eggshell) standard -- confident + direct, not hedging; encouragement that feels earned. Already fixed in Smart Coach + Halo; hold the line everywhere.
- Smart AI extra nutrients -- decision needed: do sodium/vitamins/micros feed Smart AI tips or stay display-only? Showing values fine; PRESCRIPTIVE advice = medical/legal risk. Discuss before build.
- Caffeine tracking -- daily total, high-amount warnings, first-use disclaimer. Design decisions needed. Duty-of-care item.
- Food group pattern detection -- zero whole foods X days -> gentle mode-aware tip.

### Streaks
- Burn accuracy freeze -- freeze burnAccuracyPct per-day (like goalSnapshot) so changing it doesn't retroactively shift streaks. utils/goalHit.ts / stats.tsx.
- Streak grace day system -- mode-aware grace days (Discipline cap 1 / Balanced cap 3 / Mindful none).
- Streak end warning visuals -- card color shift to orange/red within X hours of midnight, action not done.
- Edit Streak Count -- manual override with disclaimer. Design session first.

### Vacation Mode & Exclusions (ONE design knot -- Justin 2026-06-22; decide exclusion behavior FIRST, then build Vacation Mode)
- [AUDIT NEEDED] Exclusion / Vacation Mode source-of-truth convergence (FULL APP). Confirm every feature that reads daily data routes through the SAME exclusion/vacation check (Day Score, EvR, summaries, streaks, stats...).
- [SHIPPED] Vacation Mode -- one toggle auto-excludes nutrition/water/weight/sleep while still passively capturing HealthKit data; duration in days, auto-off on expiry. Live: utils/vacationMode.ts + Settings > Vacation Mode. Justin has used it multiple times. Spec: SPEC_vacation_mode.md. (The exclusion source-of-truth convergence AUDIT above may still be worth a sweep.)
- Snooze notifications option -- snooze/defer a notification; may pair with Vacation Mode.

### Tutorials & Tooltips
- Tooltip audit pass -- sweep all cards, flag every card missing a (i), build the missing ones. (See also the HIGH audit item above.)

### Animations
- Number transitions -- AnimatedNumber shipped on Home + Log. Remaining: stats tab values, workout tab reps/sets.
- Progress bar/ring/donut animation audit -- calorie bar on load, macro bars on entry, food donut on load, water bar bounce, sleep donut on load.
- Goal-moment animations -- water goal (fill + pulse), step goal (flip green), calorie goal (color transition).

### Settings & Modes
- Settings/Help: Coaching Style + Faith Journey in-depth explainers (quick blurb from the row + full article). UI approach TBD.
- Style/mode audit -- features that shouldn't show in Mindful, Discipline-only features, wrong defaults. Dedicated session.
- Mindful mode full app-wide audit -- inconsistent implementation across every screen/card/copy string. Dedicated session.
- Goals sub-category accordion polish -- FITNESS/NUTRITION GOALS sub-sections collapsible. settings.tsx.
- Resources and wellness links -- curated Settings > Help section (books, channels). Mostly static.
- "You've grown" coach message -- after key thresholds; mode-aware; ties to faith-journey prompts. Design first.

### Journal
- Date on journal entries tappable -- routes to that day's Day Detail.
- Search within journal entries -- low priority.
- Long-text stress test -- verify 500-word entries format correctly. QA.
- Multiple entries same day -- verify prayer + gratitude same day display correctly. QA.

### Notifications (system push -- SPEC_notifications.md is source of truth; separate from the in-app Otto hub)
- Notifications spec build -- 14 types, copy pools, deep linking all specced. Dedicated session.
- Notification center -- bell icon in profile header, badge, real-time toasts for Health sync events.
- Daily summary push notification -- push version of the morning Day Summary. NOT in the 14-type spec yet; add before building.

### Visual Polish
- Full theme audit -- all 5 themes x all accents, every screen, before beta. Dedicated testing session.
- Progress bar track color pass -- across all themes.
- Empty state illustrations -- SVG illustrations replacing icon+text empties. Theme-aware, app-wide.
- MFP switcher experience -- first-impression UX for power users arriving from MyFitnessPal.
- Sign-in logo entrance animation -- logo pops instead of fading. Verify on TestFlight first.

### Infrastructure
- [DRIFT CLEANUP] GOAL_DEFICITS is duplicated across 6 files (calorieTarget, profile, index, goalHit, settings, onboarding/your-style). Centralize into ONE exported source (calorieTarget already exports it) so pace/deficit changes can't drift. Surfaced 2026-07-08 adding pace granularity -- had to hand-edit 5 copies. (Justin flagged drift as a standing concern.)
- Firestore migration -- move primary data from AsyncStorage to Firestore (auth already done). Big item.
- State restoration on launch -- save active tab + scroll position, restore on cold launch.
- HealthKit source detection -- show "via Garmin/Whoop/Oura" labels on sleep/HRV data.
- Offline-first behavior.
- In-app review prompt -- prompt to rate at the right moment.
- Accessibility -- respect system Dynamic Type font sizes.
- Tooltip pulse visibility awareness -- only pulse when the card is visible in the ScrollView viewport. Not blocking.

---

## 📄 SPEC + REFERENCE POINTERS
Every major feature has a SPEC_*.md in the repo root. Active ones tied to open work above:
- Wearable / TDEE: SPEC_wearable_robustness.md | Otto hub: SPEC_otto_notifications.md | Push notifications: SPEC_notifications.md
- Sleep/Recovery: SPEC_sleep.md, SPEC_recovery_coach.md, SPEC_hr_zones.md | Lifting: SPEC_lifting_log.md | Workout sessions: SPEC_workout_sessions.md
- Nutrition: SPEC_nutrition.md, SPEC_calorie_goal_hit.md, SPEC_calorie_floor.md, SPEC_ai_meal_estimator.md | Day/Reports: SPEC_day_score_and_summary.md, SPEC_weekly_summary.md, SPEC_monthly_summary.md, SPEC_evr_redesign.md, SPEC_comparison_challenge.md, SPEC_custom_reports.md
- Faith/Coach: SPEC_faith_ai.md, SPEC_faith_tab.md, SPEC_smart_tips.md, SMART_COACH_SPEC.md, TRIGGER_LIBRARY.md | Cards: SPEC_card_gradient.md | Vacation: SPEC_vacation_mode.md | Tutorials: tutorial_system_spec.md
- Body: SPEC_body_measurements.md, SPEC_body_progress.md, SPEC_weight_history.md
- Look & feel: **SPEC_visual_refresh.md** (type system, molded buttons, glass cards, background layers, grain,
  stagger -- plus the open device A/Bs and the do-not-resurrect list)
- App Store: APP_STORE_CHECKLIST.md, COMPLIANCE_SCAN_findings.md | Launch: **LAUNCH_CHECKLIST.md** (the single
  ordered launch list; supersedes the REVERT + LAUNCH BLOCKERS sections above)
- Monetization: SPEC_monetization.md | Restaurant Mode (researched, unbuilt): SPEC_restaurant_mode.md
- Coffee Drink Builder (designed, unbuilt; data audit gates the build): SPEC_drink_builder.md

## 📎 ARCHIVES
- project_j_roadmap_archive.md -- full shipped/fixed history + detailed post-mortems (this file's completed items live here; grep by section when you need the story behind a shipped feature)
- project_j_backlog.md -- parked/future items (deeper-future than the backlog-by-area above)
