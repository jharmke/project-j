# SPEC: Custom Reports (Pro)

Status: VISION LOCKED 2026-07-07. Not yet built. Discussed + designed with Justin this session; a live
visual mockup exists (light theme, cyan accent) showing the report layout + the block picker.

---

## 1. What it is (one line)
A **Pro-only** feature where the user assembles their own progress report: pick a date range, then pick
which pre-designed data "blocks" go in it. Fully custom in WHAT it contains, always premium in HOW each
piece looks (we design every block; the user never styles raw data).

**The model, in one sentence:**
> Report = a date range + chapters, where each chapter is a picker into a large library of pre-designed
> blocks. Templates are reports that start with certain blocks already added.

## 2. Why it exists / how it is DISTINCT from what we already have
- **Weekly / Monthly summaries** = auto-generated, fixed contents, in-app, self-reflection. The app decides.
- **Day Summary** = single-day 0-100 composite.
- **Effort vs Results (EvR)** = auto diagnostic that hunts correlations.
- **Custom Reports** = the opposite on two axes: the USER picks the contents, and it is EXPORTABLE. That
  word "exportable" is the tell: a report is meant to be able to leave the app and go to a human.

## 3. Audience (decided)
**Self-first.** The report is primarily for the user's own reflection over a custom period, so we design it
to look great IN-APP first. Export (PDF/share) is a button that rides on top of the same report, covering
the "hand it to my doctor / trainer / coach" case. We design around the user's reflection, not a clipboard;
export comes along for free.

## 4. The core interaction
1. New Report -> pick a **date range** (see 7).
2. Chapters are **categories**; each opens a **block picker** (a library grid; tap "+ Add" / "Added").
3. The report renders live as blocks are added.
4. Save / name it. Re-open, edit, duplicate, export.

**Two levels of control:**
- Casual: add a whole chapter's default blocks and go.
- Power: open the chapter's library and hand-pick individual blocks.

**Multiple chapters, NO LIMIT** on how many blocks/chapters a report holds (it is just data rendering,
zero AI/coaching cost per report). A big report is just a longer scroll -- that is fine, it is the user's.

## 5. Design principle (the whole point -- do not violate)
"Fully custom" does NOT mean the user styles raw data or picks chart types (that is the spreadsheet/BI-tool
trap -- user-assembled combos look cheap and uneven, which kills the premium feel). It means: **a rich
library of pre-designed blocks the user assembles.** WE own every block's visual design (the right chart
form per data point, correct colors, labelled axes, gradient fills, callouts). The user owns only which
blocks are in and the order. Premium is protected because every piece was designed by us.

Reference bar: Oura / Whoop reports are curated, not build-your-own. Premium comes from beautiful blocks +
smart defaults, not infinite knobs.

## 6. The block library (tiered)
Target ~55 blocks across 7 chapters, all backed by data the app ALREADY collects. Tier into **Core**
(ships at launch) and **Wave 2** (added after) so we are not shipping 55 at once; every shipped block must
clear the premium bar before it ships. Final list gets validated against real data field-by-field at build.

### Overview
Day Score trend · Day Score breakdown (Nutrition/Activity/Recovery) · Goals-hit calendar · Active streaks
summary (gratitude, savers, logging, etc.) · Best & worst days · Challenge history · Achievements earned

### Nutrition
Calories vs target (trend) · Macro split · Protein trend · Fiber / sugar / sodium averages · Net-carb trend ·
Water intake · Adherence % · Logging streak · Most-logged foods · Meal-timing pattern · Calories by meal ·
Fasting / IF windows

### Workouts (training + cardio -- deliberate workouts)
Volume by muscle group · Records set (lift + cardio) · Exercise frequency · Cardio by activity type · Sets &
reps totals · Workout calendar heatmap · Program adherence · Cardio distance/duration totals · HR-zone
breakdown · 1RM trend (per lift) · PR timeline

### Activity (ambient daily movement)
Steps trend · Active calories · Exercise minutes · Distance covered · Move/stand consistency · Steps
goal-hit rate · VO2 Max trend

### Weight & Body
Weight trend · Weight change vs pace · Body measurements (waist/neck/hip/etc.) · Body-fat % (Navy) ·
Measurement deltas

### Sleep & Recovery (WEARABLE-GATED)
Sleep score trend · Sleep duration · Sleep stages (deep/REM/core) · HRV trend · Resting HR · Respiratory
rate · Blood O2 · Bedtime consistency · Recovery score trend

### Faith (FAITH-TIER AWARE)
Gratitude streak · Journal entries (by category) · Prayers (active/answered) · Bible reading activity ·
Reading-plan progress · Verses favorited · Devotional streak

## 7. Time ranges
Presets: **week · month · 3 months · 6 months · 1 year · custom (start–end)**. A row of chips + a custom
escape hatch.
- **Auto-density:** the report adjusts point density to the range -- daily points for a week, weekly/monthly
  roll-ups for a year, so a 1-year line is never 365 cramped dots.
- Gracefully handle "your data only goes back to X" for long ranges on a newer account.

## 8. Export
A Share/Export button on the report -> PDF and/or share sheet (image/PDF). Same report, exported. This is
what serves the doctor/trainer/coach case. Feasible via expo-print / RN html-to-pdf; mechanics TBD at build.

## 9. Pro-gating (decided)
**Free users get NO access to Custom Reports.** It is a paid-tier feature and must earn the paywall
(premium-polished, data-rich, easy to digest). NO conflict with the faith-never-paywalled rule: the reports
FEATURE is Pro, but all the underlying faith DATA stays fully free in the Faith tab -- we are gating a
data-viz tool, not gating faith features.

## 10. Mindful behavior (define before build)
Mindful softens judgment language app-wide. For reports: no score/grade framing, no "you failed X" copy,
neutral phrasing on adherence/records blocks. Each block must declare its Mindful variant at build time
(same standard as every feature). Data is fine to show; the framing softens.

## 11. Faith-tier behavior
The **Faith chapter** respects Faith Journey: full for Rooted, gentle for Exploring, and HIDDEN for "Not
Right Now" (no faith blocks offered in the picker at all). Never force faith content into a NRN user's report.

## 12. Data-availability rules
- **Wearable-gated blocks** (sleep stages, HRV, RHR, resp rate, blood O2, recovery, VO2 Max) only appear /
  populate when the data exists; empty-state or hide when no wearable data.
- Blocks obey the app's exclusion / Vacation Mode rules so a report matches the rest of the app's math.

## 13. Picker UX (from the mockup)
Each chapter shows a "Build your [Chapter]" panel: a library grid of block cards (icon + name + one-line
descriptor + Add/Added pill). Added blocks render in the report above; available ones sit in the library.
Same picker pattern for every chapter. (Mockup shows this on the Workouts chapter.)

## 14. PARKED / later (explicitly out of launch)
Fence items Justin ruled OUT for now (keep the log so they are not lost):
- **Correlation block (EvR-style)** -- duplicates EvR + honest correlations are hard; a wrong-looking one
  reads as the app lying. Revisit as a single curated correlation, not open-ended.
- **Weight projection / goal ETA** -- forward-looking in a backward-looking report + trips the weight-loss
  projection disclaimer rule. Maybe later, with a disclaimer, non-core.
- **AI-written narrative summary** -- most premium idea on the list but it is the AI question (cost). Safe
  non-AI version = a "Highlights" block that auto-surfaces notable stats as callouts (no AI). Prose version
  = Phase 2 with the prompt (below).
- **Micronutrients (vitamins/minerals)** -- FatSecret micro data is spotty; a "vitamin C over 90 days" block
  would look full of holes. Revisit if data quality holds.
- **Adaptive TDEE / real-burn** -- too in-the-weeds for most; nice-to-have.
- **Volume/workouts by tag** -- only valuable if the user leans on workout tags.
- **Cardio pace/speed** -- parked WITH the running-features work (app lacks reliable per-mile data). See
  SPEC_apple_workout_library.md PARKED section.

**Needs new data first (become blocks only if those features ship):** caffeine, structured mood, body/progress
photos, whole-food/food-group patterns.

## 15. Phase 2: AI prompt (not a shame -- the payoff of building blocks first)
A natural-language prompt ("show me my protein vs workout days over 3 months") where the **AI assembles the
existing blocks** rather than generating charts from scratch (which would be expensive, unreliable, ugly).
The block library is the foundation the AI needs anyway, so building blocks first sets up BOTH the manual
picker and the future prompt. Deliberately Phase 2 -- ship the manual picker first.

## 16. Open questions / decisions still to make (at spec-to-build time)
- Which blocks are **Core** vs **Wave 2** (rank the ~55).
- Report storage model (new pj_* key; additive; how many saved reports; snapshot vs live re-render on open).
- Export tech (expo-print vs alternative) + how charts render to PDF.
- Template set to launch with (e.g. "Nutrition Deep-Dive," "Training Recap," "Full Body Check," "Doctor
  Visit") -- templates are just pre-filled block sets.
- Block reordering UX (drag to reorder within/across chapters?).
- Does export need a cover page / branding / date stamp for the doctor case?

## 17. Reference
Live visual mockup (this session): a light-theme / cyan report showing Overview + Nutrition + Workouts +
Sleep & Recovery over 90 days, real charts (gradient line trends, target line, macro bar, muscle-volume
bars, exercise-frequency bars, PR callouts) + the Workouts block picker. Rebuild-able from the scratchpad
HTML if needed.
