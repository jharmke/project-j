# AI Meal Estimator: Spec

Created: 2026-06-10
Last updated: 2026-06-11 (entry points confirmed; voice mic updated to custom in-field icon; food relevance pre-check added; confidence flagging and flagged section locked; multiplier/edit baseline behavior locked; date and slot inheritance locked; image compression strengthened)

Status: SPEC LOCKED. Source of truth for the AI Meal Estimator feature. No double dashes anywhere. No "Session NN" tags.

---

## What this is

A tool for situations where precise logging is impossible or impractical: eating at a restaurant with no posted nutrition info, a home-cooked meal not worth weighing, or a plate someone else made. The user provides a photo, a text description, or both. The AI returns an editable breakdown of estimated macros per food item. User reviews, adjusts, names the meal, and confirms before anything saves to the log.

This is not a precision logging tool. It is a "pretty dang close" tool. Every design decision in this spec reinforces that positioning. Accuracy is never oversold.

---

## Feature tier / paywall

**Free users:** 3 uses per calendar month. Full feature access, no degradation.
**Pro users:** 30 uses per calendar month. Full feature access.
**Quota resets** on the first of each calendar month (not billing cycle date, calendar month for simplicity).

A use is counted only when the AI successfully returns a result the user sees on the results screen. Failed API calls, network errors, unreadable images, and app crashes during a call do not count against quota. This is non-negotiable.

Quota state is stored in AsyncStorage under `pj_ai_estimator_quota`: `{ month: "YYYY-MM", usesThisMonth: number }`. On any call, check month. If month differs from current, reset usesThisMonth to 0 before checking limit.

When a user hits their limit, show a clear modal: "You have used all X AI estimates for this month. Resets on [date]." Free users also see Pro upsell copy. Never silently block.

---

## Entry points (confirmed)

Three confirmed entry points. All three ship.

1. **Add Food screen (primary)** -- listed alongside Search, Barcode Scan, My Foods, Recipes as "AI Estimate." This is the primary and most prominently featured entry point.
2. **Log tab card** -- a small persistent card above or within the meal slot area. Copy: "Eating out? AI can estimate your meal." Dismissable (state stored in `pj_settings` or per-day, TBD). Reappears after dismissal (does not permanently hide, behavior TBD).
3. **FAB** -- confirmed entry point.

---

## Input screen

**File:** `app/ai-meal-estimator.tsx` (new screen). Single screen with two sequential step states: Input and Results. No separate files.

### Photo field

Optional. User can take a new photo (camera) or upload from camera roll. Both options available. Uses `expo-image-picker`. Compress image before sending using expo-image-picker's built-in quality and resize options -- target under 1MB. Large images cost significantly more in Claude vision API token billing; compression at reasonable quality settings does not meaningfully reduce accuracy. Verify compression at build time by testing a handful of real meal photos and confirming the model still reads them correctly. Document the final quality setting in `services/aiMealEstimator.ts` as a named constant (e.g. `IMAGE_QUALITY`). Request camera and photo library permissions via standard Expo flow.

Photo preview shown after selection with an X to remove. If user removes photo and has no text, submit button dims.

### Text description field

**Required.** Submit button stays dim until at least one character is entered. Photo alone is not sufficient to enable submit.

Placeholder text (visible only before typing, standard placeholder styling):
"The more detail you give, the better. Include portion size, cooking method, sauces, sides, oils, and anything you can see or guess."

Multiline TextInput. Apply the multiline iOS select-all bug fix: ref + `onBlur={() => ref.current?.setNativeProps({ selection: { start: 0, end: 0 } })}`.

**Voice input:** Custom mic icon inside the text description field (right side, styled like a clear/action button inside the input). Tapping it triggers iOS speech-to-text dictation. More polished and more discoverable than pointing users to the system keyboard mic, which is buried and not obvious on all keyboards. The one-time tooltip hint is removed entirely. A toolkit is present on the estimator screen per standard app pattern.

### Submit button

Label: "Estimate My Meal"
State: dim/inactive when text field is empty. Full accent when at least one character is entered and quota is not exhausted. Shows remaining uses beneath the button in muted text: "3 estimates remaining this month" (or "Unlimited" for Pro -- actually no, Pro has 30 limit, show "27 remaining this month").

### Loading state

After submit, replace input UI with a centered loading indicator and copy: "Analyzing your meal..." No spinner progress indication, just activity. If call takes over 10 seconds, add secondary copy: "This can take a moment for complex meals."

---

## What the AI does

Uses trained nutritional knowledge from model training data, not live USDA or FatSecret lookups. The model knows macro profiles of common foods. For unusual items (pineapple mango habanero BBQ sauce), it makes a reasonable inference from similar items.

**Model:** Claude claude-sonnet-4-6 (`claude-sonnet-4-6`). Supports vision natively. Good accuracy-to-cost balance for this use case.

**Prompt approach:**
- System prompt establishes role: nutrition estimation assistant with deep food macro knowledge.
- Instructs model to assume standard restaurant portions when size is unknown and flag every assumption it makes.
- Instructs model to list probable hidden additions (cooking oils, butter, seasonings, sauces not visually obvious) as a separate output field rather than inflating line item numbers.
- Instructs model to NOT silently return 0 or a confident-sounding number for items it genuinely cannot estimate. Each line item must include a `confidence` field: `"high"`, `"medium"`, or `"low"`. Items with `"low"` confidence are routed to the flagged section in the UI rather than the main results list -- the user must consciously resolve them before saving.
- **Food relevance pre-check:** Before running the full estimation prompt, the model checks whether the submitted image contains identifiable food. If no food is detected, return `{ "no_food_detected": true }` as the entire response immediately. This call does NOT count against the user's monthly quota. Handle this flag before any estimation logic runs. Prevents hallucination on irrelevant images entirely.
- Low temperature setting (0.2 or lower) for consistent, structured output.

**Output schema (strict JSON, validated before display):**

```
{
  "no_food_detected": boolean,
  "meal_name_suggestion": string,
  "line_items": [
    {
      "id": string (uuid or index string),
      "name": string,
      "portion_description": string,
      "calories": number,
      "protein_g": number,
      "carbs_g": number,
      "fat_g": number,
      "assumption_note": string | null,
      "confidence": "high" | "medium" | "low"
    }
  ],
  "totals": {
    "calories": number,
    "protein_g": number,
    "carbs_g": number,
    "fat_g": number
  },
  "hidden_items": [string],
  "input_quality": "photo_only" | "text_only" | "photo_and_text" | "photo_with_description"
}
```

`no_food_detected` is a top-level field. When `true`, all other fields may be absent -- always check this field first before processing anything else. Items with `"confidence": "low"` are routed to the flagged section (see Section 3 below), not the main results list.

If the model returns malformed JSON or fails validation, show an error state (see Error States below). Never display raw or partially-parsed output.

---

## Results screen

Rendered as a second step on the same screen after a successful AI response. User does not navigate away; the input UI transitions to the results UI.

### Dynamic disclaimer (top of results, always visible)

Copy varies by `input_quality`:
- `photo_only`: "Estimated from photo only. Portions are assumed standard and may be significantly off. Add a description for better accuracy."
- `text_only`: "Estimated from your description. Accuracy depends on the detail you provided."
- `photo_and_text` / `photo_with_description`: "Estimated from your photo and description. Closest result we can give without a nutrition label."

Displayed as a muted amber-toned callout box, not a dismissable toast. Stays on screen. No green/confidence badge. This copy IS the accuracy signal.

### Section 1: What I estimated

Plain English summary of every assumption made, generated from the `line_items` array. Format: a readable sentence built from the line items and their portion descriptions. Example: "I estimated 5oz of pulled pork, 2 tablespoons of sweet BBQ sauce, 1 cup of mac and cheese with bacon bits, and a small side of pinto beans."

This section is read-only. It is not the editable breakdown. It gives the user a plain-English read before they look at numbers.

### Section 2: What might be missing

Rendered only if `hidden_items` array is non-empty (it almost always will be). A separate labeled section below "What I estimated."

Label: "POSSIBLY NOT INCLUDED" (card label style: 9px, uppercase, letter-spacing 3).

Each hidden item as a bullet or row. Examples: "Cooking oil or butter used in preparation", "Seasoning rubs or dry spices", "Sauce not visible in the photo", "Dressings or toppings added at the table."

These are plain text callouts only, no macro numbers assigned to them. They exist to prompt the user's awareness, not to inflate estimates. User can choose to manually edit line items upward if they think something significant was missed.

### Section 3: Low-confidence items (flagged)

Rendered only when any `line_items` have `"confidence": "low"`. This section is distinct from "Possibly Not Included" -- hidden items are additions the user may want to add; this section is for items the model attempted to estimate but had genuinely low confidence on.

Label: "NEEDS YOUR REVIEW" (or similar -- exact copy TBD at build time, card label style: 9px, uppercase, letter-spacing 3).

Each flagged item appears as a row the user must consciously interact with before the estimate can be saved. Per item, the user can:
- **Confirm** -- accept the model's best guess as-is and move it to the main results list
- **Edit** -- manually adjust the values, then confirm
- **Remove** -- exclude the item from the estimate entirely

The user cannot tap "Add to Log" until every flagged item has been resolved (confirmed, edited, or removed). "Add to Log" stays dim while any unresolved flagged items remain. This is a hard gate with no workaround.

Once resolved, confirmed/edited items join the main line items list. Removed items disappear. The flagged section disappears entirely when all items are resolved.

Exact row UI design TBD at build time. The interaction requirement (three options per item, hard gate) is locked.

### Portion multiplier

A scrollable horizontal row of pill buttons above the line items. Values: 0.5x, 0.75x, 1x, 1.25x, 1.5x, 1.75x, 2x, 2.25x, 2.5x. Default selection: 1x (highlighted in accent color). Tapping any pill immediately recalculates all line item macros and the running total in real time.

**Scaling behavior (locked):**
- The multiplier always scales from the original AI-generated values for untouched rows.
- If a user manually edits a line item, that edited value becomes the new 1x baseline for that row. The multiplier then scales from the edited value, not the original AI value. Example: AI estimates pulled pork at 300 cal. User edits to 450 cal. At 1.5x the value shown is 675 cal (450 x 1.5), not 900 cal. This behavior is never explained to the user -- they just see consistent numbers.
- **Untouched AI rows with a non-1x multiplier active:** show a small multiplier indicator (e.g. "1.5x") in textMuted color beneath or beside the calorie value on that row. Purely informational.
- **Manually edited rows:** show a small "CUSTOM" label in card label style (9px, uppercase, letter-spacing 3, textMuted) beneath or beside the calorie value instead of the multiplier indicator. This distinguishes user-set values from AI-generated-but-scaled values at a glance. Exact CUSTOM label placement TBD at build time. The visual distinction between edited and scaled rows is locked.

Label above the row: "PORTION SIZE" in card label style. Tooltip TBD: "(i) Scale the whole estimate up or down if the restaurant serves larger or smaller than standard portions."

### Editable line items

Each line item displayed as a tappable row. Tapping opens an inline edit state or a small focused edit modal (design TBD at build time). Editable fields per item: name, portion description, calories, protein, fat, carbs. Running total at the bottom updates live as user edits. When a user manually edits a line item, that edited value becomes the new 1x baseline for that row -- the multiplier then scales from the corrected value, not the original AI value (see Portion multiplier scaling behavior above).

### Meal name field

Text input above the confirm button. Pre-populated with `meal_name_suggestion` from AI response. Editable. User can rename. This name appears on the log entry. Required (same as text field: at least one character).

### Resubmit option

A secondary text link or muted button below the results: "Not right? Add more detail and resubmit." Tapping returns to input step with: photo retained (still attached), text field pre-populated with previous description. User adds or changes detail and resubmits. Counts as a new use if the new call succeeds.

### Running totals

Sticky or clearly visible total row showing combined cal / P / C / F across all line items. Updates live with multiplier changes and individual edits. Uses standard macro colors (Protein #0d9268, Carbs #c47d1a, Fat #a83232).

---

## Confirm and save flow

"Add to Log" button (full accent, active only when meal name is non-empty AND all low-confidence flagged items have been resolved). Tapping it:
1. Shows a brief confirm state displaying the target date and meal slot clearly (e.g., "Save to Lunch on Tuesday, June 10?"). The estimator inherits the date and meal slot context from whichever entry point launched it -- if the user entered from a specific date and slot (e.g., tapped Add to Lunch on yesterday's date), those are pre-selected. Same pre-selection behavior as the current add-food flow. If launched from a general entry point (FAB, log tab card without slot context), show pickers for both date and slot. Uses `getMealDisplayName` from `utils/mealSlots.ts`.
2. On confirm, writes to the daily `pj_YYYY-MM-DD` key under the appropriate meal slot, following the standard food entry format.
3. Marks the entry as AI-estimated (see Log Entry Indicator below).
4. Fires a toast: "[Meal name] added to [Meal Slot]" (success type).
5. Increments `pj_ai_estimator_quota` usesThisMonth by 1.
6. Navigates back to the log tab.

Nothing saves silently. The confirm tap is the explicit save action.

---

## Log entry indicator

Any log entry created via the AI Meal Estimator gets a small visual tag. **LOCKED at build time: the `sparkles` Ionicon**, tinted in the accent color, rendered on the log entry row. Chosen over the "AI" text badge and the wand icon because it matches the Coach Insight sparkle branding already used elsewhere in the app and reads as "smart/estimated" without looking like a system label. The indicator is visible on the log entry row so the user knows at a glance which entries are estimates. It does not affect any downstream calculations (Day Score, EvR, etc.) -- entries are treated identically to manual entries in all math.

The entry's macro data is stored identically to a manual entry in `pj_YYYY-MM-DD`. The AI-estimated flag is an additional field on the entry object: `aiEstimated: true`.

---

## Meal template save

On the results screen, a secondary option (below or alongside "Add to Log"): "Save as Meal Template." Tapping opens a small modal: meal name field (pre-populated from the current meal name), confirm button.

Saved templates stored in `pj_ai_meal_templates`: array of `{ id, name, createdAt, lineItems[], totals }`.

Templates accessible from the Add Food screen under a "Meal Templates" section (or "Saved Meals" -- copy TBD). Loading a template drops the user into the results step with all line items pre-populated. They can edit, adjust multiplier, and save normally. Does not count as a new AI use (template load is free).

---

## Restaurant save (fast follow-on, NOT MVP)

A "My Restaurants" concept where meal estimates (and eventually any manual entries) can be tagged to a named restaurant. Saves the meal to a restaurant-specific list. On a return visit, user opens the restaurant, sees past meals, loads one as a starting point.

This is scoped OUT of the MVP. Plan and spec separately after the estimator ships. Do not block the estimator on this.

---

## Error states

Every failure communicates clearly to the user. No silent errors.

**API call fails (network error, timeout, 5xx):** Full-screen or prominent error state with copy: "We couldn't reach the estimation service. Check your connection and try again." Retry button. Does not count as a use.

**Model returns malformed JSON:** Error state: "Something went wrong processing your meal. Try adding more description and resubmitting." Retry option (returns to input with data retained). Does not count as a use.

**No food detected (pre-check):** Before the full estimation prompt runs, the model checks for identifiable food in the image. If the model returns `no_food_detected: true`, show: "We couldn't find any food in that photo. Try a clearer photo or describe your meal in the text field." Does not count against quota. This fires before any estimation logic runs -- not a fallback from a failed estimation.

**Quota exhausted:** Modal before the call is made (check quota before sending): "You've used all [X] estimates this month. Resets on [date]." Free users see Pro upsell. No call is made.

**No internet connection:** Check before initiating. Inform user this feature requires a connection.

---

## Coaching mode behavior

**Discipline:** Full detail. All macro numbers displayed prominently. No language softening.

**Balanced:** Standard presentation. No changes.

**Mindful:** Calorie count de-emphasized (smaller, textSecondary color). Macro breakdown still shown. Disclaimer copy uses warmer language ("This is a rough sense of what you ate" rather than "estimated portions may be off"). No judgment language anywhere in the flow. "Add to Log" becomes "Record this meal."

---

## Faith integration

No direct faith interaction. Feature is available on all Faith Journey tiers (Rooted, Exploring, Not Right Now) without modification.

---

## AsyncStorage keys (new)

- `pj_ai_estimator_quota` -- `{ month: "YYYY-MM", usesThisMonth: number }`. Checked before every call, incremented on confirmed save, reset when month changes.
- `pj_ai_meal_templates` -- array of saved meal templates: `{ id: string, name: string, createdAt: string, lineItems: LineItem[], totals: MacroTotals }`.

Existing keys touched: `pj_YYYY-MM-DD` daily data (adds `aiEstimated: true` field to affected food entries). No other existing keys modified.

---

## File structure (new files)

- `app/ai-meal-estimator.tsx` -- full estimator screen. Input step and results step as internal state.
- `services/aiMealEstimator.ts` -- API call logic, prompt construction, response validation, quota check/increment helpers.

No other new files required. Existing `utils/mealSlots.ts` used for meal slot targeting. Existing `components/Toast.tsx` used for save confirmation.

---

## Tooltips and tutorials

- Add `ai_meal_estimator` entry to `tooltipRegistry.ts` once screen ships.
- Tutorial for the estimator feature: TBD in dedicated tutorial audit session.

---

## Open questions (not blocking spec, decide before build)

- Pro upsell copy: TBD.
- "Add to Log" vs "Confirm" vs "Save to Log": exact CTA copy TBD (current build: "Add to Log", "Record this meal" in Mindful).
- Restaurant save fast follow-on: spec separately after MVP ships.

Resolved (build-time decisions, locked):
- Entry point priority: Add Food screen is primary. The **FAB entry point is the existing Food Library expanding FAB** (in add-food.tsx browse mode) -- a third action item "AI Estimate" with the `sparkles` icon, alongside Create Recipe and Create Food. Launching from the FAB has no slot context, so it shows the date + slot picker. The log tab card is the slot-context-aware entry. All three entry points ship.
- Meal slot targeting: estimator inherits date and slot context from entry point. Show pickers only when context is ambiguous (general entry point with no slot context).
- Multiplier interaction with manual edits: edited values become new 1x baseline for that row. Original AI values are baseline for untouched rows.
- Image compression: use expo-image-picker quality/resize options, target under 1MB, document final quality setting as named constant `IMAGE_QUALITY` in `services/aiMealEstimator.ts`.
- Log tab card dismiss behavior: re-shows once daily (per-day dismissed flag).
- Individual line item edit UI: inline expand on the row (no modal-in-modal).
- Log entry indicator icon: `sparkles` Ionicon, accent-tinted. LOCKED.
- CUSTOM label placement on edited rows: beneath the calorie value.
- Low-confidence flagged row UI: estimate shown in muted text with three pill buttons (Confirm / Edit / Remove). Hard gate on Add to Log until all resolved. LOCKED.
