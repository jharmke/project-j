# Nutrition Facts Panel Scan: Locked Spec

First checkpoint: 2026-07-19. Major serving/unit discussion: 2026-07-20. Full alignment session, everything
below officially locked: 2026-07-21.

Status: LOCKED. Ready to build. No open questions remain -- this is one full build, no v1/v2/v3 phasing.
Anything OCR genuinely can't read confidently falls back to the confidence-flag system (see below); that
fallback IS the completeness plan, not a deferral to a later version.

---

## What this is

Scan the actual Nutrition Facts panel on a real box or package (camera + OCR) and use it to autofill or
correct a food's macro fields, instead of typing every number by hand.

Motivation: a lot of FatSecret's database entries are only about 80% right. Calories are usually correct,
macros are often slightly off. This is a fast way to CORRECT specific fields against the real printed label
instead of retyping or rebuilding the whole food from scratch.

Priority: NEXT UP. Pipeline is light right now, this is being built sooner rather than later.

---

## Core mechanics (locked 2026-07-19, still standing)

**OCR, not AI vision.** A Nutrition Facts panel is a rigid, standardized, FDA-mandated layout. On-device OCR
is a better fit for reading exact printed digits than a general vision model reasoning over a photo. New
native module -> new EAS development build to test on-device (per project build rules), plus parsing logic
that maps raw recognized text lines to specific fields, since OCR returns text, not structure.

**Pull every field the label has**, not just the core macros: calories, total fat, saturated fat, trans fat,
cholesterol, sodium, total carbs, dietary fiber, total sugars, added sugars, protein, and any vitamins or
minerals printed. food-detail.tsx already has expandable sections for all of these (carbsOpen, fatsOpen,
vitaminsOpen, bVitaminsOpen, mineralsOpen).

**Never overwrite a field the label did not print a number for.** "Not printed on this label" must mean
"leave the existing value alone," not "write zero." **The distinguishing test is whether the field's NAME
was found on the label at all, not whether the read value is zero** -- "Cholesterol 0mg" printed on the
label is a real value (write 0); Cholesterol never mentioned anywhere on the label leaves the existing field
untouched. Zero and absent must never be conflated.

**Never auto-save.** Scanned values populate the food's normal editable form. Nothing writes until the user
hits the existing Save action.

**Whole label, one scan.** Not per-field scanning. One photo, one OCR pass, every field extracted at once.

**Entry points:**
- CustomFoodCreator (building a food from scratch)
- food-detail.tsx's copy-to-edit flow (correcting an existing FatSecret entry -- the main daily pain point
  that motivated this feature)
- The barcode-override flow (pj_barcode_overrides) -- when a barcode scan gives a wrong or missing match,
  the user is already holding the physical package, so scanning the label there fixes the food and creates
  the override in one motion

**Scan trigger placement:** a dedicated button near the top of the form (after Food Name/Brand, before the
Calories/macro fields it's about to fill), styled like the app's existing "Interactive button" pattern
(blue pill, `rgba(59,130,246,0.15)` background). Icon must be visually distinct from CustomFoodCreator's
existing camera icon (the 64x64 dashed square next to Brand, which attaches a cosmetic food photo) -- these
are two different actions and must never look like the same one. Use `scan-outline` or
`document-text-outline`, not `camera`. Exact spacing/visual polish confirmed on-device once built, not
from a text description.

**Scan photo is transient.** The photo taken to OCR the label is discarded after the scan completes. It is
never saved as the food's display photo (that's a separate, already-existing field set by CustomFoodCreator's
own camera button).

**Re-scanning is a full fresh overwrite.** If the user taps "scan" again after a bad read, the second pass
overwrites whatever the first pass populated -- including fields the user has since hand-edited. No
partial-preserve logic mixing "some fields are OCR, some are my correction, then OCR ran again."

---

## OCR package: `expo-ocr-kit` (confirmed 2026-07-21)

Verified via real docs, not guessed: `expo-ocr-kit` returns each recognized text block with a `boundingBox`
(x/y/width/height, image-space coordinates) alongside its text, on both iOS (Vision) and Android (ML Kit).
It is image-based (capture/pick a photo, then OCR it) rather than live-camera-frame OCR, matching the
"whole label, one photo, one scan" decision exactly. Actively maintained (April 2026 update at time of
writing).

Ruled out: `expo-text-extractor` -- confirmed via its own README that it returns `Promise<string[]>`, flat
text only, no position data. Without bounding boxes, dual-column column-matching cannot be built on it, no
matter how good the underlying OCR is. `@bear-block/vision-camera-ocr` also ruled out -- requires the full
VisionCamera live-camera-frame library as a dependency, heavier machinery than needed for a single-photo
flow.

Known risk, accepted: `expo-ocr-kit` is a small, newer package, not a huge widely-used library -- real but
acceptable maintenance risk, since it's the only checked option whose actual data shape matches what the
feature needs.

---

## Serving size + dual-column labels (locked 2026-07-21)

**Serving size handling.** A scanned label defines its own serving size and macros as one matched pair --
it REPLACES the food's serving definition with exactly what the label says, rather than force-converting the
label's numbers to fit a pre-existing unit. Works whether or not the label gives a gram equivalent, since it
ties into the universal unit conversion work (own NEXT UP entry): a user who physically weighs their real
portion (e.g. label says "3 oz," they weigh it and get 86g) can directly correct/refine the serving's true
weight using the same unit infrastructure, without forcing a conversion themselves. Distinct from logging a
different quantity of the food (e.g. eating 2x the label's serving) -- that's the existing quantity/multiplier
mechanism at log time, not something this feature handles.

**Per-serving vs per-container, dual-column labels.** Real FDA dual-column labels print "Per serving" /
"Per container" as literal column headers, plus a separate "X servings per container" line. OCR's per-block
bounding-box position data lets the parser locate those headers and match every nutrient row's numbers to
whichever column they align under -- same basic technique as telling an amount apart from its %DV on a
single-column label, just extended to more columns. Full parsing, no cut corners.

**Data model for "per container."** food-detail.tsx already has a working multi-serving picker
(`fetchFatSecretServings` + the `showServingPicker` modal) that holds a LIST of serving options per food. A
dual-column scan produces TWO entries from one scan -- "1 serving" and "1 container" -- dropped into that
SAME existing list structure. Use the label's own printed "X servings per container" line to label the
container entry accurately (e.g. "Whole container, 2.5 servings, 137.5g").

**Which entry defaults into the form: "1 serving."** Reasoning -- per-serving numbers are what every other
food in the database is already keyed to (FatSecret's own multi-serving entries default to a normal
single-serving size, not "whole package"), and it's the more common logging unit. "1 container" sits as an
alternate option in the same picker, one tap away.

**Scanning onto a food that already has its own serving list (FatSecret-sourced foods).** The scanned
entry/entries get APPENDED to the food's existing serving list, never replacing or deleting FatSecret's own
options. The scanned entry becomes the one actively selected/populating the form (that's the point of
scanning), but FatSecret's other serving options stay in the list untouched. Nothing gets blended or
averaged -- the picker already tolerates multiple discrete options of varying accuracy today (FatSecret's own
multi-serving data isn't uniformly reliable across options either), so this isn't new risk, just one more
option in an already-multi-option list.

---

## Review flow: compact editable modal (locked 2026-07-21)

Scanned values populate the food's real edit form directly (matches the existing AI Meal Estimator "Option
A" pattern: no new dedicated review screen). BEFORE that, a compact centered modal (matching the app's
existing Modal + ScrollView pattern -- handle pill, scale+opacity animation) shows every field OCR read, in
a flat list (not spread across the form's collapsible sections), so the user can catch problems in one
glance instead of scrolling through 15+ fields across several expandable sections.

**The modal fields are editable** (real text inputs, not read-only text) -- if a bad OCR read is obvious
right there, fix it on the spot instead of accepting-into-form and correcting a second time in the real
form. "Looks Good" commits whatever's currently in the boxes (edited or not) into the real edit form fields,
confidence-flag styling carries over onto the corresponding fields there too.

**Per-field confidence flagging**, not a blanket disclaimer. OCR returns a confidence score per recognized
text block; low-confidence fields get a visual flag (soft amber border, small "double-check this one" note).
Works per-column on dual-column labels too, not just per-row (a dual-column label doubles the numbers that
could individually be misread).

**A confidence flag on a linked value/%DV pair covers BOTH sides**, not just whichever side OCR happened to
print. Example: label prints only "Iron 20%" (no raw mg), so the app calculates the mg amount from that %
using the DV reference. If OCR wasn't fully sure it read "20%" correctly, that uncertainty taints the
calculated mg value too, since it was derived from the shaky %. Flag both together.

**Value/%DV printed-numbers mismatch also gets flagged.** If a label prints BOTH a raw value and a %DV for
the same nutrient and they don't reasonably agree with the app's own DV-reference math (allowing for normal
label rounding), that field gets the same amber flag, reason "the label's own numbers didn't agree with each
other." The printed VALUE stays canonical (everything else in the app -- Day Score, totals -- works off raw
amounts, not percentages); the mismatch is just flagged so the user can eyeball the box themselves.

**Incomplete-scan warning banner**, single line, condensed version of the AI Estimate screen's existing amber
disclaimer treatment (same amber color/icon language as the per-field flags, roughly 60% the height, since
this is one component competing for space against 12+ real fields in a modal, not a full screen). Shows ONE
shared, deliberately vague message -- "Some of this scan is unclear, double-check before saving" -- the
per-field flags already do the job of pointing at specifics, the banner's only job is "pay closer attention
here." Non-blocking: does not gate Save, does not force a retake, just a heads-up above the form.

Triggered by EITHER of two independent checks (only one banner ever shown, never stacked):
1. **A core field is missing.** Calories, Total Fat, Total Carbs, and Protein are printed on literally every
   real Nutrition Facts panel with zero exceptions -- if the parser can't find one of those four, that's a
   reliable "the photo itself was bad" signal (cut off, bad angle), unlike raw field count which varies
   legitimately by product (a short, simple label isn't a bad scan).
2. **3 or more fields flagged low-confidence.** Absolute count, not a percentage of fields found -- simpler
   to reason about than an arbitrary fraction, and the downside of a fixed count (slightly over-triggering
   on info-dense labels with lots of vitamins/minerals) is harmless, just an extra nudge. 1 flag is normal
   (a single smudge on any real scan); 2 is still not alarming; 3+ starts indicating an actual lighting/glare
   problem worth flagging before the banner risks becoming noise people ignore.

---

## Universal unit conversion (own NEXT UP entry, tied to this spec)

Surfaced comparing to Cronometer's serving-size UX. CONFIRMED BY READING CODE: FatSecret-sourced foods
already have a real working serving picker (functioning infrastructure, limited only by FatSecret's own data
completeness). Custom/My Foods have NO such picker -- `CustomFoodCreator.tsx`'s "Additional Servings" feature
hardcodes `grams: string`, no unit choice at all.

**Two free, universal conversion groups:** weight (g/kg/oz/lb) and volume (mL/L/cup/tbsp/tsp/fl oz) each
convert within their own group via pure fixed math, for any food on earth, no per-food data needed. What is
NOT free: converting BETWEEN the two groups (grams to cups) needs food-specific density data Cronometer has
and this effort is not solving.

Build universal weight-group and volume-group conversion as a system-wide layer for every food regardless of
source, and fix the Additional Servings unit-lock on custom foods.

**Guardrails:**
1. **Rounding drift** -- always store the real source-of-truth number in ONE canonical unit (grams for
   weight, mL for volume) and convert fresh from that for every display/entry, never chain conversions off
   an already-converted number.
2. **Don't confuse serving-size units with nutrient-amount units** -- sodium/potassium in milligrams are
   nutrient AMOUNTS, a different thing from serving SIZE units (g/oz/cup/etc).
3. **OCR can't confidently find dual-column headers** -- if a label IS dual-column but OCR can't confidently
   locate/read the "per serving"/"per container" headers (bad lighting, angle, damage), never guess which
   column is which. Falls back to single-column treatment with an explicit low-confidence flag instead.
4. **`pj_barcode_overrides` data structure -- resolved 2026-07-21.** It stores one food snapshot per
   barcode, generic passthrough (nothing strips fields). As long as the scanned food object is shaped the
   same way food-detail.tsx's existing serving-picker item already is (a single object internally holding a
   list of serving options), it rides through the override storage fine. Not a storage limitation, just a
   build-time detail: make sure the scanner's output object matches the shape the serving picker expects.

---

## Label format variance (locked 2026-07-21)

Real printed labels vary: older vs. current FDA format (pre/post the 2016-2020 revision), Supplement Facts
panels (different header, proprietary-blend formatting), bilingual English/French labels, and real-world
photo conditions (glare, crease, curve on cylindrical containers, bad angle, partial framing).

**One parser, no phased handling.** The parser matches field NAMES ("Total Fat," "Sodium," "Cholesterol,"
etc.) and their adjacent numbers/bounding boxes, regardless of which visual layout they sit in -- inherently
format-agnostic since it's matching text and position, not a rigid grid template. This is not extra work
avoided for the niche cases, it's the same mechanism as the main case, so there's no real "cut corners vs.
huge pain" tradeoff being made. Whatever it genuinely can't confidently locate or read (severe glare, an
unfamiliar bilingual layout, a mangled Supplement Facts panel) falls into the same low-confidence flagging
system already locked above -- that fallback IS the completeness plan, not a deferral.

---

## Nutrient value <-> %DV live-link (locked 2026-07-21, tied to this spec)

Real labels sometimes only print a %DV column and no raw value (common in the vitamins/minerals section, but
also happens on fat/carbs/etc.). RDA/DV reference constants already exist in the app
(`components/NutritionGearModal.tsx`, e.g. vitaminA: 900mcg, vitaminC: 90mg, broken out by profile) -- this
is a conversion-logic problem, not a new-data problem.

**Whichever side the label prints (value OR %), show both, live-linked.** Change either one, the other
recalculates off the fixed FDA Daily Value reference -- same rounding-drift rule as the unit-conversion work
above: always derive fresh from the canonical source, never chain off an already-derived number.

**Applies to every field with a real FDA DV reference**: vitamins, minerals, fat, saturated fat,
cholesterol, sodium, total carbs, fiber, added sugars. **Does not apply to calories** -- no FDA label ever
prints a %DV for calories, there's no number to parse or derive. This is important to keep separate from a
DIFFERENT percentage that already exists elsewhere in the app: the user's own dynamic daily goal % (Log/Home
calorie ring and macro bars, personalized and for calories specifically adjusted by active calories burned
that day). The label's %DV is a fixed reference fact about the food itself; the personal goal % is about the
user's day. This feature only ever touches the fixed FDA reference version, never the personal dynamic goal.

---

## Explicitly not decided yet

Nothing remains open. All prior open items (OCR package, scan-trigger placement, `pj_barcode_overrides`
capability, dual-column default entry, label format variance handling) are resolved above.
