# Nutrition Facts Panel Scan: Living Spec

First checkpoint: 2026-07-19

Status: DISCUSSION IN PROGRESS. Not being built yet. This captures what is locked so far and what is still
open, so the thread survives between sessions. No double dashes anywhere (project rule). No "Session NN" tags.

---

## What this is

Scan the actual Nutrition Facts panel on a real box or package (camera + OCR) and use it to autofill or
correct a food's macro fields, instead of typing every number by hand.

Motivation: a lot of FatSecret's database entries are only about 80% right. Calories are usually correct,
macros are often slightly off. This is a fast way to CORRECT specific fields against the real printed label
instead of retyping or rebuilding the whole food from scratch.

Priority: going in NEXT UP. Pipeline is light right now, this is being built sooner rather than later.

---

## Locked decisions

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
where to look instead of asking them to distrust everything equally.

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

## Open questions (TBD, needs its own dedicated discussion)

**Serving size handling.** Labels print their own serving size, which may not match the serving size already
on the food entry. When the label includes a weight/volume equivalent (e.g. "1 cup (240g)"), the math to
convert is straightforward linear scaling. When it does not (e.g. "1 cookie" with no gram weight), there is
no reliable way to convert. Leaning toward: let the scanned label define its own serving size rather than
force-fitting onto whatever serving unit already exists on the food, treating serving size + macros as one
matched pair from the scan. Not fully settled. Justin wants to discuss this fully in its own pass, not
folded into a general spec discussion.

**Per-serving vs per-container, and dual-column labels.** Some labels show two columns (per serving, per
container). Two distinct sub-problems live here: (1) parsing a dual-column layout at all, and (2) how the
app's food model would even represent "per container" data, since it is currently built around a single
serving definition. Both genuinely unsolved. TBD.

**Label format variance beyond the above.** Older FDA label formats vs the current one, unusual layouts.
Not yet discussed how much variance v1 needs to handle gracefully versus flag as low-confidence.

---

## Explicitly not decided yet

- Which OCR library/package (Apple Vision wrapper availability for Expo, or a custom native module)
- Exact UI trigger placement for "scan" within the edit form
- Nothing has been built. This is discussion only.
