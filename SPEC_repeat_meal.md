# SPEC: Repeat a Meal

Status: DESIGN LOCKED 2026-07-10. Ready to build.
Source: Cengiz feedback ("an option to copy/paste from yesterday's breakfast or lunch could be cool for
quick logging... I usually have the same breakfast every morning") + Justin's dad ("maybe have a plus to
the left of these items so they could easily be added"). Both circle the same need: fast re-logging of a
repeated meal.

Related concepts already in the app: Recipes (blend ingredients into ONE food line). This feature is NOT a
recipe -- see "Repeat a Meal vs Recipe vs Save as a Meal" at the bottom.

---

## THE CORE IDEA (one sentence)
Re-log a previous day's meal-slot entries into today with a couple taps, by cloning the stored entries
exactly -- with NO saved object, NO library, and NO naming step.

Why "no saved object" is the whole design: the thing that makes Recipes go undiscovered is that users have
to think to build + name + find a saved thing. "Repeat what I logged before" has no saved thing to
discover, so that failure mode disappears. It's also a much smaller build.

---

## USER FLOW

### 1. Entry point -- a pill on the EMPTY meal slot
On the Log tab, each meal slot (Morning / Lunch / Dinner / custom slots) already shows an empty state
("Nothing logged yet. Tap + to add."). We add a subtle accent PILL beneath it:

- Style: the app's interactive-button recipe (bg rgba(59,130,246,0.15), border rgba(59,130,246,0.3),
  radius 6, accent-blue text, small), with a leading refresh/repeat icon. Clean, quiet, obviously tappable.
  NOT a bare text hotlink (too faint, esp. on Light).
- Only renders when there is actually history to copy for that slot. Brand-new users / a slot never logged
  in the window never see it, so the empty state stays clean.

### 2. One-tap fast path vs modal
- IF yesterday's SAME slot has food -> the pill reads e.g. `Repeat yesterday's morning . 500` and ONE TAP
  logs the whole thing instantly (all items, no picking). A smaller secondary control next to it --
  `Other days >` -- opens the full modal.
- IF yesterday's same slot is empty -> there is no one-tap target, so the single pill reads `Repeat a
  previous morning` and tapping it opens the modal directly.

One-tap = logs ALL items from yesterday (no uncheck step, by design -- it's the speed path). The modal is
where per-item control lives.

### 3. The modal (centered floating card, full aesthetic standard)
```
              REPEAT A MEAL
       [Morning]  Lunch  Dinner  Snacks     <- source-slot chips

   v  Yesterday . Wed, Jul 9 . 500 kcal
        [x] Van's Blueberry Waffles     190
        [x] Dr Pepper Soda Can          170
        [x] 2 Eggs                      140
                      [ Add 3 items . 500 ]

   >  Tuesday . Jul 8 . 420 kcal
        Oatmeal, Banana, Coffee

   >  Monday . Jul 7 . 610 kcal
        Bagel, Cream Cheese, OJ, Yogurt...
```

- SOURCE-SLOT CHIP ROW at the top. Defaults to the slot the user launched from. Switching it changes which
  slot's history is shown.
- DAY ACCORDION below. Newest matching day is PRE-EXPANDED. Older days are collapsed.
  - Collapsed row = two lines: (line 1) chevron + relative date + total kcal; (line 2) muted, truncated
    food-name preview so the day is recognizable without expanding.
  - Expanded row = each item with a CHECKBOX (all checked by default) + its calories, then an Add button.
- ADD BUTTON reflects the live selection: `Add N items . <kcal>`. Unchecking an item updates the count +
  calories immediately.

### 4. On Add
The selected items are cloned into today's DESTINATION slot as fresh entries, a toast fires
("Morning added . 3 items"), and the modal closes.

---

## THE ONE LOCKED RULE (do not break)
DESTINATION IS ALWAYS THE SLOT THE USER LAUNCHED FROM.
The source slot is switchable in the modal; the destination is not. Example: tap Repeat on tonight's
DINNER, switch the source chip to Lunch -> the chosen lunch's items are logged into today's DINNER.

---

## IMPLEMENTATION NOTES

### Copy = exact clone, never re-resolve
Deep-copy the stored entry object; change only two fields:
- `timestamp` -> today (see below)
- `meal` -> the destination slot's id
Everything else (cal, protein/carbs/fat, calPer100g, foodNutrients, labelCal/labelProtein/..., loggedAmount,
loggedUnit, servingGrams, fiber/sugar/sodium/micros, fsId, myFoodId, isMyFood, aiEstimated) carries verbatim.
Because it's a byte-for-byte clone, serving/amount, macros, and all extended nutrition are GUARANTEED
identical -- there is no lookup step that could drift.

### Photos come free
Food photos are keyed `pj_food_photo_{foodId}` where foodId = the food's fsId/myFoodId, NOT the entry. A
cloned entry carries the same fsId/myFoodId, so `resolveFoodPhoto` returns the same image automatically.
Nothing to duplicate; no orphaning risk (photo deletion is already a per-food action, unchanged by us).

### AI-estimated items are INCLUDED
AI Meal Estimator entries are hidden from Recents (one-off guesses, not reusable DB foods), but they ARE
offered here. Cloning copies their stored numbers exactly and never re-runs the AI or re-searches, so it's
safe and accurate -- and excluding them would make "repeat breakfast" silently drop an item. An AI item has
no photo (it never had one); that's correct, not a bug.

### Timestamps
Stamp cloned items `now`, `now+1`, `now+2`, ... so original order is preserved AND every entry stays unique
(the app finds/edits/deletes entries by timestamp -- duplicate timestamps would make delete ambiguous).

### Slot matching (id vs name)
Entries tag `meal` as either the slot id (e.g. `ms_lunch`) or the slot's display name; slots are user-
renamable. The Log already matches both (`e.meal === slot.id || e.meal === slot.name`). REUSE that exact
matcher to find source entries; stamp the destination with the current slot's id. Do not invent a new
matcher.

### Window
Scan the last 14 days. Show every day in that window that has >=1 copyable item in the selected source slot,
newest-first. No "show more" needed at this size.

### Empty/edge source
A day whose slot has zero copyable items (e.g. its only item was later deleted) simply does NOT appear -- no
blank row, no "0 items" row. Just skipped.

### Mindful mode
No behavioral variance. Neutral toast copy ("Morning added . 3 items"). This is a neutral utility.

---

## AESTHETICS -- full modal standard, no slacking
- Centered floating card (NOT a slide-up bottom sheet).
- Handle pill near the TOP of the card (not too far down).
- Accent top border.
- Entrance: withSpring scale 0.85 -> 1.0 + opacity 0 -> 1, fired in Modal onShow.
- ToastRenderer rendered INSIDE the modal JSX (so the save toast shows above it).
- Haptics: medium on Add; light on chip switch / checkbox toggle / expand.
- Modal + ScrollView pattern: separate absolute TouchableOpacity overlay for dismiss; card in a plain View
  with pointerEvents="box-none"; never TouchableOpacity as the card wrapper.
- Optional polish: small food-photo thumbnails next to items that have one.

---

## EXPLAINERS TO UPDATE (same session as build, per standing rule)
- tooltipRegistry.ts: new entry (or extend the Log entry) covering Repeat a Meal.
- data/tutorials.ts: mention/route it where meal logging is taught.
- Otto knowledge base (functions/src/assistantAppKnowledge.ts) + redeploy: teach Otto the feature so he can
  point users to it ("you can repeat a previous day's meal from the empty slot").

---

## BUILD SLICES (proposed order)
1. Data + logic: a util that, given a source slot + a source date, reads that day's matching entries and
   returns clone-ready objects; and a "log these into today's destination slot" writer (read-then-merge the
   day record, append clones, incremented timestamps). Pure logic, unit-testable.
2. Modal shell: centered card, handle pill, accent border, spring entrance, dismiss overlay, ToastRenderer.
3. Modal content: source-slot chips (default = launch slot) + day accordion (collapsed 2-line summary /
   expanded checklist) + live Add button.
4. Entry-point pill on the empty meal slot (history-gated) + the one-tap "repeat yesterday" fast path +
   "Other days" -> modal.
5. Explainers: tooltip + tutorial + Otto KB (+ redeploy).
6. Device verify: same-slot repeat, cross-slot (Dinner pulls Lunch), per-item uncheck, AI item, photo
   carries, extended-nutrition exactness, empty-slot gating, 14-day window edge.

---

## FOLLOW-ON TO DISCUSS (Justin curious; NOT part of this build)
### "Save as a Meal"
Save a group of distinct foods as a NAMED, reusable one-tapper.

The real distinction to settle in that discussion:
- RECIPE = ingredients blended into ONE food line, with a total weight/servings. Logs as a SINGLE entry
  ("My Smoothie . 1 serving . 310 cal"). The individual foods disappear in the log.
- MEAL = a bundle of SEPARATE foods logged as individual entries all at once. Waffles + eggs + coffee stay
  THREE lines.

Repeat a Meal is already a "meal" in this sense (it re-logs separate entries) -- just sourced from history
instead of a saved bundle. "Save as a Meal" would let a user persist such a bundle by name for one-tap reuse.
Open questions for its own design pass: how it looks/behaves, where it's saved + surfaced, and how it lives
alongside Recipes without confusing the two.
