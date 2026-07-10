# SPEC: Weight History + Starting Weight (home Weight card gear modal)

Status: SHIPPED 2026-07-10 (all 5 slices; commits b7da232 + b11fe03; Otto deployed). Full post-mortem in
project_j_roadmap_archive.md. This spec is kept as the design reference.
Origin: dad flagged the home Weight card's "Total" looked wrong -> the LABEL bug (a gain showing as
"-1 Total Lost") was fixed + shipped (commit aea7aec). This is the follow-on: there is currently NO way
to edit a past weigh-in or correct a wrong starting weight ("poison" risk), so we add an editable weight
history. Related design-Q (baseline choice) is resolved below.

## CONTEXT / WHY (the facts this rests on)
- Body weight is stored as a SCALAR per day: `pj_<YYYY-MM-DD>.weight` = one weigh-in per day. NOT an array
  like water (water is per-entry). So "history" = one row per day that has a `.weight`.
- Onboarding ALREADY seeds the starting weight into the log: your-style.tsx:373-380 writes `currentWeight`
  to `pj_<completion-day>.weight`. So the earliest logged weigh-in already IS the onboarding starting weight.
- The home Weight card's Total Lost/Gained AND the weight achievements/milestones both derive from
  `earliestWeight` (index.tsx: the oldest logged weigh-in, currently found by a 365-day-capped scan).
  => The earliest weigh-in = the "starting weight." One concept, one source.
- THE GAP: past weigh-ins are not editable (day-detail.tsx:423 shows weight read-only; the home card logger
  writes TODAY only). A wrong starting weight can't be easily corrected. This spec closes that gap.

## CORE MODEL (locked decisions)
- "Starting weight" is NOT a new stored field. It is simply the EARLIEST weigh-in in history. Correcting it =
  editing that entry. Adding an earlier back-dated entry = it becomes the new starting weight. No new field,
  no drift, no baseline logic change (card + achievements already key off the earliest weigh-in).
- One weigh-in per day. Edit replaces that day's `.weight`. Delete removes ONLY the `.weight` field from that
  day's record (read-then-merge; that day's food/water/sleep/etc. untouched).
- History source = AsyncStorage.getAllKeys() filtered to `pj_YYYY-MM-DD` keys that have a numeric `.weight`,
  sorted newest-first. This is the TRUE full history (not the 365-day-capped scan the card uses today), which
  also removes the >365-day edge case for "earliest/starting."

## ENTRY POINT
- Gear icon, top-right of the home Weight card (mirrors the nutrition card's gear placement).

## THE MODAL (full modal standard)
Centered floating card; handle pill near the top; accent top border; spring 0.85->1 + opacity fired in
onShow; ToastRenderer rendered INSIDE the modal; Modal + ScrollView dismiss pattern (absolute overlay +
box-none card wrapper). NOT a slide-up bottom sheet. Contents top -> bottom:
1. STARTING WEIGHT block: the earliest weigh-in (value + its date), tap to edit inline. Micro-caption:
   "Your progress (Total) is measured from here." If there are zero weigh-ins yet -> a prompt to log one.
2. Inline micro disclaimer (weight = health metric): "For informational purposes only. Not medical advice."
3. HISTORY list: one row per logged day (date + weight), newest-first. Each row edits inline (pencil/tap) and
   deletes (X/trash, confirm + heavy haptic). Mirror the water-log per-entry edit/delete interaction + look.
4. ADD A PAST WEIGH-IN: a "+ Add a past weigh-in" control -> pick a date (today or earlier, NEVER future) +
   enter a weight -> writes to that date (read-then-merge). If earlier than the current earliest, it becomes
   the new starting weight automatically.
5. GOAL WEIGHT shown READ-ONLY as an info line ("Goal: 179 lbs - change in Profile"). No goal editing here
   (deliberate: avoid a second edit point that drifts from Profile).

## DATA INTEGRITY (NON-NEGOTIABLE)
- Every edit/add and delete = read-then-merge the specific `pj_<date>` key; only touch `weight`; NEVER replace
  the record. Delete = remove the `weight` field, write back everything else on that day.
- Fire saveToFirebase(date, 'weight', val) on edit/add; on delete, sync the removal via the app's convention
  (saveToFirebase(date,'weight',null) or equivalent) so cloud matches local.
- Run every new/edited value through the existing `weightEntryIsPlausible` guard (same as logWeight) before it
  feeds milestone checks, so a typo can't hand out a weight milestone. Reject non-numeric / implausible range.
- Never future-dated.
- After ANY change: recompute the home card's weight / yesterday / earliest / Total in place, and re-run the
  weight milestone check via checkAndUnlock (idempotent). Milestones NEVER revoke (existing app rule): an edit
  can GRANT a newly-legit milestone but must not un-earn one. Do not delete earned badges on a downward edit.
- Toast on every save + delete. Haptics: light on edit/select, medium on save, heavy on delete.

## MODES / FAITH
- Mindful: weight values in textSecondary, neutral copy, zero judgment language (no "great job", no red/green
  verdicts in the modal chrome). The starting-weight caption stays factual. It is a neutral utility.
- Faith tiers: no impact.

## EXPLAINERS (same session as the build -- standing rule, do NOT defer)
- tooltipRegistry.ts: update or create the Weight-card entry. Cover: Starting weight = your earliest weigh-in
  and what Total is measured from; the editable history; how to correct a wrong starting weight; back-dated
  entries. Put a (i) on the card and/or in the modal.
- data/tutorials.ts: add a mention where the weight card / home is taught (you can edit or delete past
  weigh-ins and fix your starting weight from the gear). Light informational step; no demo-state disruption.
- Otto KB (functions/src/assistantAppKnowledge.ts) + REDEPLOY appCompanion: teach "you can edit or delete any
  past weigh-in, correct your starting weight, and add a back-dated weigh-in from the gear on the home Weight
  card; your Total progress is measured from your earliest (starting) weigh-in." Update the log-weight
  quick-reference line too.

## OUT OF SCOPE (this build)
- Goal weight editing (stays in Profile; shown read-only here).
- HealthKit weight auto-pull (separate backlog item).
- kg body-weight units (lb only for now).
- Multiple weigh-ins within a single day (model is one per day).

## BUILD SLICES (proposed order)
1. utils/weightHistory.ts: gather-history (getAllKeys -> dated keys with weight, sorted newest-first) + safe
   edit/add/delete writers (read-then-merge, plausibility guard, Firebase sync). Pure-ish, unit-testable.
2. components/WeightHistoryModal.tsx: full modal standard; starting block + disclaimer + history list +
   add-past control + read-only goal line.
3. Wire the gear onto the home Weight card; on close/change, recompute card state (weight/yesterday/earliest/
   Total) + run the milestone check.
4. Explainers: tooltip + tutorial + Otto KB (+ redeploy).
5. Device verify: edit today; edit a past day; delete a mid-history day; add a back-dated entry EARLIER than
   the current earliest (confirm it becomes the new starting weight + Total recomputes); correct a wrong
   starting weight -> Total updates; milestone recompute is sane + never revokes; read-then-merge safety (food
   / water on an edited day stay intact); 5-theme x accent; Mindful copy neutral.
