# Nutrition Facts Panel Scan: Living Spec

First checkpoint: 2026-07-19. Major serving/unit discussion: 2026-07-20.

Status: DISCUSSION IN PROGRESS. NOT BEING BUILT YET. Tonight's session (2026-07-20) made real progress on
the serving-size and unit-conversion questions and Justin is aligned in principle on the direction below --
but this is still TBD, not officially locked. Tomorrow is a dedicated session to OFFICIALLY nail everything
down and start building/fixing. Nothing in this doc should be treated as final until that session confirms
it. Double dashes are fine in this doc (project rule only restricts double dashes in user-facing app
strings, not specs/docs). No "Session NN" tags.

---

## What this is

Scan the actual Nutrition Facts panel on a real box or package (camera + OCR) and use it to autofill or
correct a food's macro fields, instead of typing every number by hand.

Motivation: a lot of FatSecret's database entries are only about 80% right. Calories are usually correct,
macros are often slightly off. This is a fast way to CORRECT specific fields against the real printed label
instead of retyping or rebuilding the whole food from scratch.

Priority: going in NEXT UP. Pipeline is light right now, this is being built sooner rather than later.

---

## Locked decisions (from 2026-07-19, still standing)

**OCR, not AI vision.** A Nutrition Facts panel is a rigid, standardized, FDA-mandated layout. On-device OCR
(Apple's Vision text recognition) is a better fit for reading exact printed digits than a general vision
model reasoning over a photo. Real cost of this choice: it is a new native module, which means a new EAS
development build to test on-device (per project build rules, not just a JS reload), plus writing the
parsing logic that maps raw recognized text lines to specific fields, since OCR returns text, not structure.

**Pull every field the label has**, not just the core macros: calories, total fat, saturated fat, trans fat,
cholesterol, sodium, total carbs, dietary fiber, total sugars, added sugars, protein, and any vitamins or
minerals printed. food-detail.tsx already has expandable sections for all of these (carbsOpen, fatsOpen,
vitaminsOpen, bVitaminsOpen, mineralsOpen).

**Never overwrite a field the label did not print a number for.** Labels do not always list every
micronutrient. "Not printed on this label" must mean "leave the existing value alone," not "write zero."
Zeroing an untouched field would silently erase a value that was already correct.

**Never auto-save.** Scanned values populate the food's normal editable form. Nothing writes until the user
hits the existing Save action, matching how the rest of the app already works (Floating Save Bar pattern).

**Per-field confidence flagging**, not a blanket disclaimer. OCR returns a confidence score per recognized
text block. Any field where confidence is low gets a visual flag (soft amber border, small "double-check
this one" note) instead of one generic "AI might be wrong" disclaimer at the top. Tells the user exactly
where to look instead of asking them to distrust everything equally. UPDATE 2026-07-20: with dual-column
labels now in scope (see below), this needs to work PER COLUMN too, not just per row -- a dual-column label
doubles the numbers that could individually be misread (e.g. the "per serving" reading could be clean while
"per container" is blurry, or vice versa). Same underlying design, just more surface area to flag. Not yet
built.

**Whole label, one scan.** Not per-field scanning. A camera cannot cleanly isolate a single line of a label
without other lines bleeding into frame anyway, and nobody would use a per-field scan when they could just
edit the number directly. One photo, one OCR pass, every field extracted at once.

**Review flow: match the existing AI Meal Estimator pattern (Option A).** app/ai-meal-estimator.tsx already
solves this exact "AI/scan fills in fields, user reviews" moment: the estimate populates directly into the
normal editable screen (not a separate flagged review list), then a lightweight centered confirm modal
("Save This Meal") sits before it actually commits. The label scan follows the same shape: scanned values
populate the food's real edit form directly, with the confidence flag sitting right on the uncertain fields,
and the existing Save action is the confirmation. No new dedicated review screen.

**Entry points:**
- CustomFoodCreator (building a food from scratch)
- food-detail.tsx's copy-to-edit flow (correcting an existing FatSecret entry -- the main daily pain point
  that motivated this feature)
- The barcode-override flow (pj_barcode_overrides) -- when a barcode scan gives a wrong or missing match,
  the user is already holding the physical package, so scanning the label there fixes the food and creates
  the override in one motion

---

## Serving size + dual-column labels -- STRONG DIRECTION FROM 2026-07-20, NOT YET OFFICIALLY LOCKED

Everything in this section is where tonight's discussion landed and Justin is aligned in principle, but he
explicitly wants this treated as pending official confirmation in tomorrow's dedicated session, not as
settled fact. Do not build from this section without that confirmation pass first.

**Serving size handling.** Labels print their own serving size, which may not match whatever serving unit
already exists on the food entry. DIRECTION: the scanned label defines its own serving size and macros as
one matched pair -- it REPLACES the food's serving definition with exactly what the label says, rather than
force-converting the label's numbers to fit a pre-existing unit. This works whether or not the label gives a
gram equivalent, because it ties into the universal unit conversion work below: a user who physically weighs
their real portion (e.g. label says "3 oz," they weigh it and get 86g) should be able to directly
correct/refine the serving's true weight using the same unit infrastructure, without needing to force a
conversion themselves. This is DISTINCT from logging a different quantity of the food (e.g. eating 2x the
label's serving) -- that is a separate, already-existing quantity/multiplier mechanism at log time, not
something the scan feature itself needs to handle.

**Per-serving vs per-container, dual-column labels -- real mechanism identified.** Real FDA dual-column
labels literally print "Per serving" / "Per container" as column headers directly above the two columns of
numbers, plus a separate "X servings per container" line elsewhere on the label (e.g. "2.5 servings per
container") -- this is all real printed text, not something to infer or guess. Apple's on-device OCR returns
each recognized text block's position (bounding box), not just its content, so the parser can locate those
header labels' horizontal positions and match every nutrient row's numbers to whichever column they align
with -- the same basic column-matching technique already needed to tell an amount apart from its %DV on a
single-column label, just extended to more columns. Justin confirmed (2026-07-20): full parsing, not
skipping this case, no v1/v2 cut corners.

**HOW TO REPRESENT "PER CONTAINER" DATA -- the previously-open data-model question, now has a real answer.**
food-detail.tsx already has a fully working multi-serving picker for FatSecret-sourced foods
(`fetchFatSecretServings` + the `showServingPicker` modal) -- it holds a LIST of serving options per food,
each with its own complete macro set, and lets the user pick between them. Instead of inventing a new
"per container" concept from scratch, a dual-column scan should produce TWO entries from one scan --
"1 serving" and "1 container" -- and drop them into that SAME existing list structure. The existing picker
UI would then show both as options automatically, no new UI needed. Use the label's own printed
"X servings per container" line to label the container entry accurately (e.g. "Whole container, 2.5
servings, 137.5g") rather than guessing or leaving it unlabeled.

**Label format variance beyond the above.** Older FDA label formats vs the current one, unusual layouts.
Not yet discussed how much variance v1 needs to handle gracefully versus flag as low-confidence.

---

## Universal unit conversion -- TIED FEATURE, surfaced 2026-07-20, NOT YET OFFICIALLY LOCKED

Surfaced while discussing this spec, comparing to Cronometer's serving-size UX (Cronometer's own database is
fuller than FatSecret's, which is a real, separate, unavoidable gap -- this section is about what we CAN do
regardless of database completeness). This is broader than just the label scanner (it should apply to every
food in the app, custom or FatSecret-sourced) but is tightly tied to this spec since the scanner is what
surfaced the need. Also has its own NEXT UP entry since it benefits the app generally.

**CONFIRMED BY READING CODE (2026-07-20):**
- FatSecret-sourced foods already have a real, working serving picker (see above) -- functioning
  infrastructure, not something to build from scratch, just limited by however complete FatSecret's own
  data happens to be for a given food.
- Custom/My Foods have NO such picker. `CustomFoodCreator.tsx`'s "Additional Servings" feature hardcodes
  `grams: string` as its type -- no unit choice at all. Confirmed real gap, not a misunderstanding.

**THE KEY INSIGHT: there are TWO free, universal conversion groups, not just one.**
1. **Weight units** (g, kg, oz, lb) convert to each other via pure fixed math -- an ounce is always 28.35
   grams, for literally any food on earth, no per-food data needed.
2. **Volume units** (mL, L, cup, tbsp, tsp, fl oz) ALSO convert to each other via pure fixed math -- a cup is
   always the same number of mL, regardless of food.
   
   What is NOT free: converting BETWEEN the two groups (grams to cups) needs food-specific density data
   (a cup of flour and a cup of honey weigh very differently) -- that genuinely does need per-food data the
   way Cronometer has, and is not being solved by this effort.

**DECISION DIRECTION:** build universal weight-group and volume-group conversion as a system-wide layer for
every food regardless of source, and fix the Additional Servings unit-lock on custom foods so they get at
least the same flexibility FatSecret-sourced foods already have via the picker.

**GAPS / PITFALLS to guard against when this gets built (all confirmed 2026-07-20, need to be designed for,
not skipped):**

1. **Rounding drift.** Converting back and forth between units (g to oz to back to g) can introduce small
   rounding differences if done carelessly. Guard: always store the real source-of-truth number in ONE
   canonical unit (grams for weight, mL for volume) and convert fresh from that for every display/entry,
   never chain conversions off an already-converted number. Needs to be as accurate as possible -- Justin
   confirmed this matters.
2. **Do not confuse serving-size units with nutrient-amount units.** The food model already has fields like
   sodium/potassium in milligrams -- those are nutrient AMOUNTS, a totally different thing from serving SIZE
   units (g/oz/cup/etc). Needs to be guarded against in the UI/data model so a future builder does not
   conflate the two.
3. **OCR can't confidently find dual-column headers.** If a label IS dual-column but OCR can't confidently
   locate/read the "per serving"/"per container" headers (bad lighting, angle, damage), the app must NEVER
   guess which column is which. Falls back to treating it as single-column with an explicit low-confidence
   flag instead.
4. **Barcode-override flow's data structure.** Unconfirmed whether `pj_barcode_overrides` can currently hold
   multiple servings (per serving + per container) the way this spec now calls for, or only a single value.
   Left as TBD -- check when actually building, not solved yet.
5. **Confidence flagging must work per-column**, covered above in the Locked Decisions update.

---

## Explicitly not decided yet

- Which OCR library/package (Apple Vision wrapper availability for Expo, or a custom native module)
- Exact UI trigger placement for "scan" within the edit form
- Whether `pj_barcode_overrides` supports multiple servings today (item 4 above)
- **Which serving entry defaults into the edit form on a dual-column scan.** The original Option A review
  flow assumed one scan produces one entry that directly populates the form. Now a dual-column scan can
  produce TWO entries (per serving + per container) -- never discussed which one (if either) should be the
  one that actively fills the form immediately after scanning, versus just sitting as a second option in the
  picker. Not decided, not guessed at -- needs an actual answer tomorrow.
- Nothing has been built. This is discussion only. Tomorrow's dedicated session is where the direction above
  gets officially confirmed (or changed) and the actual build flow gets figured out.
