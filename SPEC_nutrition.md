# SPEC: Nutrition Expansion
Last updated: 2026-06-08

## Overview

Full expansion of the Advanced Nutrition card (log.tsx) and all food-related surfaces. Two data layers: FatSecret API (limited set, parsed automatically) and Custom Foods/Recipes (full field set, user-entered). The UX -- gear modal, presets, color coding, grouped collapsible layout -- applies to everything regardless of data source.

---

## 1. Nutrient Data Layer

### From FatSecret API (auto-populated for all FatSecret foods)

Fields confirmed present in API response via live testing:

| Nutrient | FatSecret field | Unit | Currently parsed? |
|---|---|---|---|
| Total Carbs | carbohydrate | g | yes |
| Fiber | fiber | g | yes |
| Sugar | sugar | g | yes |
| Added Sugars | added_sugars | g | NO -- add |
| Sugar Alcohols | sugar_alcohols | g | yes |
| Total Fat | fat | g | yes |
| Saturated Fat | saturated_fat | g | yes |
| Trans Fat | trans_fat | g | NO -- add |
| Polyunsaturated Fat | polyunsaturated_fat | g | yes |
| Monounsaturated Fat | monounsaturated_fat | g | yes |
| Cholesterol | cholesterol | mg | yes |
| Sodium | sodium | mg | yes |
| Potassium | potassium | mg | yes |
| Vitamin A | vitamin_a | mcg | yes |
| Vitamin C | vitamin_c | mg | yes |
| Vitamin D | vitamin_d | mcg | NO -- add |
| Calcium | calcium | mg | yes |
| Iron | iron | mg | yes |

Net Carbs is calculated (not a FatSecret field): Total Carbs - Fiber - Sugar Alcohols.

B vitamins, magnesium, zinc, copper, caffeine, vitamin E/K: NOT returned by FatSecret Premier Free at any API version. Confirmed by live test across multiple food types including Red Bull (no caffeine field), fortified cereal, salmon. Custom foods only for those fields.

### Custom Foods / Recipes (user-entered, full set)

All FatSecret fields above PLUS:

| Nutrient | Unit | Notes |
|---|---|---|
| Caffeine | mg | 400mg daily limit (FDA) |
| Vitamin E | mg | |
| Vitamin K | mcg | |
| Vitamin B6 | mg | |
| Folate | mcg | |
| Vitamin B12 | mcg | |
| Biotin | mcg | |
| Magnesium | mg | |
| Zinc | mg | |
| Copper | mg | |

These fields are stored on the food object. They appear in the Advanced Nutrition card when non-zero. For FatSecret foods they will always be zero and won't render.

---

## 2. Nutrient Groups and Display Order

Six collapsible groups. Each renders only if at least one nutrient in the group is non-zero.

### Group 1: Carbs
| Nutrient | Direction | DV |
|---|---|---|
| Total Carbs | neutral | 275g |
| Added Sugars | want-less | 50g |
| Fiber | want-more | 28g |
| Sugar | want-less | 50g |
| Sugar Alcohols | neutral | none |
| Net Carbs | neutral | none (calculated) |

### Group 2: Fats
| Nutrient | Direction | DV |
|---|---|---|
| Total Fat | neutral | 78g |
| Saturated Fat | want-less | 20g |
| Trans Fat | want-less | 2g (minimize) |
| Polyunsaturated Fat | want-more | 22g |
| Monounsaturated Fat | want-more | 44g |

### Group 3: Core
| Nutrient | Direction | DV |
|---|---|---|
| Cholesterol | want-less | 300mg |
| Sodium | want-less | 2300mg |
| Potassium | want-more | 4700mg |
| Caffeine | want-less | 400mg |

### Group 4: Vitamins
| Nutrient | Direction | DV |
|---|---|---|
| Vitamin A | want-more | 900mcg |
| Vitamin C | want-more | 90mg |
| Vitamin D | want-more | 20mcg |
| Vitamin E | want-more | 15mg |
| Vitamin K | want-more | 120mcg |

### Group 5: B Vitamins
| Nutrient | Direction | DV |
|---|---|---|
| B6 | want-more | 1.7mg |
| Folate | want-more | 400mcg |
| B12 | want-more | 2.4mcg |
| Biotin | want-more | 30mcg |

### Group 6: Minerals
| Nutrient | Direction | DV |
|---|---|---|
| Calcium | want-more | 1300mg |
| Iron | want-more | 18mg |
| Magnesium | want-more | 420mg |
| Zinc | want-more | 11mg |
| Copper | want-more | 0.9mg |

---

## 3. Color Coding System

Applies to the value text AND the progress bar (where bars exist).

**want-more**: muted green (#0d9268) when value >= goal. Accent when under.
**want-less**: muted red (#cc3333) when value > goal. Accent when under.
**neutral**: always accent color.

No color judgment on nutrients with no DV (sugar alcohols, net carbs, caffeine -- wait caffeine has a limit, so it IS want-less).

For nutrients where user has set a custom override in the gear modal, the custom value is used as the threshold instead of the DV/preset value.

---

## 4. Gear Modal Presets

Accessed via gear icon in the Advanced Nutrition card header. Saved to pj_settings as:
- nutritionPreset: string ('standard' | 'keto' | 'heart' | 'fiber' | 'athletic' | 'custom')
- nutritionGoals: Record<string, number> -- the actual per-nutrient values in effect

Selecting a preset auto-fills nutritionGoals. User can then override individual fields (any field with a DV). 'custom' is set automatically when any field is edited after a preset is applied.

### Preset Values (research-backed)

Sources: FDA 2000 kcal DV, AHA dietary guidelines, Phinney/Volek ketogenic protocol, ISSN position stand on athletic nutrition, Dietary Reference Intakes (DRI).

| Nutrient | Standard | Keto | Heart Health | High Fiber | Athletic |
|---|---|---|---|---|---|
| **Carbs** | | | | | |
| Added Sugars (g) | 50 | 5 | 25 | 25 | 50 |
| Fiber (g) | 28 | 25 | 30 | 40 | 32 |
| Sugar (g) | 50 | 5 | 25 | 30 | 50 |
| **Fats** | | | | | |
| Total Fat (g) | 78 | 156 | 65 | 78 | 78 |
| Saturated Fat (g) | 20 | 50 | 13 | 20 | 20 |
| Trans Fat (g) | 2 | 2 | 0 | 2 | 2 |
| **Core** | | | | | |
| Cholesterol (mg) | 300 | 300 | 300 | 300 | 300 |
| Sodium (mg) | 2300 | 3000 | 1500 | 2300 | 3000 |
| Potassium (mg) | 4700 | 4700 | 4700 | 4700 | 4700 |
| Caffeine (mg) | 400 | 400 | 400 | 400 | 400 |
| **Vitamins** | | | | | |
| Vitamin A (mcg) | 900 | 900 | 900 | 900 | 900 |
| Vitamin C (mg) | 90 | 90 | 90 | 90 | 120 |
| Vitamin D (mcg) | 20 | 20 | 20 | 20 | 25 |
| Vitamin E (mg) | 15 | 15 | 15 | 15 | 15 |
| Vitamin K (mcg) | 120 | 120 | 120 | 120 | 120 |
| **B Vitamins** | | | | | |
| B6 (mg) | 1.7 | 1.7 | 1.7 | 1.7 | 2.0 |
| Folate (mcg) | 400 | 400 | 400 | 400 | 400 |
| B12 (mcg) | 2.4 | 2.4 | 2.4 | 2.4 | 2.4 |
| Biotin (mcg) | 30 | 30 | 30 | 30 | 30 |
| **Minerals** | | | | | |
| Calcium (mg) | 1300 | 1300 | 1300 | 1300 | 1300 |
| Iron (mg) | 18 | 18 | 18 | 18 | 18 |
| Magnesium (mg) | 420 | 420 | 420 | 420 | 500 |
| Zinc (mg) | 11 | 11 | 11 | 11 | 14 |
| Copper (mg) | 0.9 | 0.9 | 0.9 | 0.9 | 0.9 |

**Keto notes (Phinney/Volek):** Fat target is 70% of 2000 kcal = 156g. Sat fat ceiling raised to 50g (keto is fat-dominant and dietary sat fat is less restricted on very low carb diets per current keto research). Sodium raised to 3000mg because glycogen depletion causes kidneys to excrete more sodium. Sugar and added sugars clamped to 5g.

**Heart Health notes (AHA):** Sodium 1500mg is the AHA stricter guideline for those managing blood pressure. Sat fat 13g = <6% of 2000 kcal (AHA recommendation). Trans fat goal 0. Added sugars 25g = AHA women's daily limit (men's is 36g -- using the more conservative value).

**Athletic notes (ISSN):** Sodium raised to 3000mg for sweat replacement. Magnesium 500mg (athletes often deficient, supports muscle function). Zinc 14mg (slightly above standard -- research supports higher intake for athletes). Vitamin C 120mg and Vitamin D 25mcg reflect ISSN guidance for elevated antioxidant and bone/muscle needs.

**Individual overrides:** Any field with a DV can be overridden by tapping it and typing a number directly. No calculator -- just direct input. The preset name changes to 'custom' the moment any value is edited.

### Gear Modal Disclaimer
"Goals are based on general dietary guidelines and research. Individual needs vary. Consult a registered dietitian or healthcare provider before making significant changes to your diet."

---

## 5. Advanced Nutrition Card (log.tsx) -- Full Redesign

### Header row
Left: "Advanced Nutrition" label + existing TooltipIcon
Right: gear icon (opens gear modal) + chevron up/down (expand/collapse)

Both are separate tap targets. Gear icon does NOT expand the card.

### Layout within each group
Two-column grid. No per-item progress bars in the log card. Color on the value IS the progress signal.

```
[ GROUP HEADER ]  [status chip: "3 of 5 on track"]
  Label            Value + unit
  Label            Value + unit
  ...
```

- Group header: existing cardLabel style (uppercase, 9px, letterSpacing 3)
- Status chip: small pill, e.g. "3/5" with accent or muted color. Only shows when group has at least one nutrient with a DV.
- Value: DMSans_600SemiBold, 13px, color per direction logic above
- Label: DMSans_500Medium, 12px, textMuted
- Pairs are evenly split: left column takes first N/2 items, right takes the rest. Odd item goes left.

### Default expanded state
Carbs group open, all others collapsed. User expansion state is NOT persisted -- resets on re-mount. (No need to store collapse state per group.)

### Empty state
If ALL groups have zero data (no logging yet for the day), show a single muted line: "Log food to see advanced nutrition data."

---

## 6. Food Detail (food-detail.tsx) -- Expansion

The existing grouping pattern (Carb Breakdown, Extended Fats, Other Nutrients, Vitamins & Minerals) stays. Add the new fields into the correct groups and add a new group for B Vitamins and expanded Minerals.

Progress bars stay in food-detail (single food context, small count, bars make sense here).

Updated groups:
- **Carb Breakdown**: Total Carbs, Fiber, Added Sugars (new), Sugar, Sugar Alcohols (if > 0), Net Carbs
- **Extended Fats**: Sat Fat, Trans Fat (new), Poly Fat, Mono Fat
- **Other Nutrients**: Cholesterol, Sodium, Potassium, Caffeine (new)
- **Vitamins**: Vitamin A, C, D (new), E (new), K (new)
- **B Vitamins** (new group): B6, Folate, B12, Biotin
- **Minerals**: Calcium, Iron, Magnesium (new), Zinc (new), Copper (new)

Each group only renders if at least one field is non-zero.

---

## 7. Day Detail (day-detail.tsx) -- Expansion

Same group structure as food-detail above. Already has the grouped pattern. Extend each section with the new fields. Aggregate across all entries for the day.

---

## 8. Recipe Builder / Recipe Log -- Expansion

recipe-builder.tsx and recipe-log.tsx aggregate nutrition across ingredients. Extend the aggregate calculation to include all new fields. Display using the same grouped pattern.

---

## 9. Custom Food Creator / Editor -- New Fields

The Edit Food and Create Food modals currently have: Basic Info, Macros, Extended Nutrition (Fiber, Sugar, Sodium, Cholesterol, Sat Fat, Poly Fat, Mono Fat, Potassium, Vitamin A, Vitamin C, Calcium, Iron, Sugar Alcohols).

Add the following new input fields:

**Extended Nutrition section additions:**
- Added Sugars (g)
- Trans Fat (g)
- Vitamin D (mcg)

**New section: Vitamins & B Vitamins**
- Vitamin E (mg), Vitamin K (mcg)
- B6 (mg), Folate (mcg), B12 (mcg), Biotin (mcg)

**New section: Minerals**
- Magnesium (mg), Zinc (mg), Copper (mg)

**New section: Other**
- Caffeine (mg)

All fields optional, 0 if blank. Store on the food object under matching keys. Two-column layout matching the existing modal grid style.

---

## 10. FatSecret Parsing Updates (add-food.tsx)

In fetchFatSecretServings, add to the mapping:
```
addedSugars: parseFloat(s.added_sugars || '0'),
transFat: parseFloat(s.trans_fat || '0'),
vitaminD: parseFloat(s.vitamin_d || '0'),
```

In the foodNutrients augmentation block in food-detail.tsx, add:
```
{ nutrientName: 'Added Sugars', unitName: 'G', key: 'addedSugars' },
{ nutrientName: 'Trans Fat', unitName: 'G', key: 'transFat' },
{ nutrientName: 'Vitamin D', unitName: 'MCG', key: 'vitaminD' },
```

---

## 11. pj_settings Storage

Add to pj_settings:
```typescript
nutritionPreset: 'standard' | 'keto' | 'heart' | 'fiber' | 'athletic' | 'custom'
nutritionGoals: {
  addedSugars?: number; fiber?: number; sugar?: number;
  totalFat?: number; saturatedFat?: number; transFat?: number;
  cholesterol?: number; sodium?: number; potassium?: number; caffeine?: number;
  vitaminA?: number; vitaminC?: number; vitaminD?: number; vitaminE?: number; vitaminK?: number;
  vitaminB6?: number; folate?: number; vitaminB12?: number; biotin?: number;
  calcium?: number; iron?: number; magnesium?: number; zinc?: number; copper?: number;
}
```

Default: preset = 'standard', goals = Standard DV values.

---

## 12. Tooltip Registry Update

Update the EXISTING `advanced_nutrition` key in tooltipRegistry.ts (do NOT create a new key). Add description of what the gear modal presets are and how color coding works.

---

## 13. Mindful Mode Behavior

Advanced Nutrition card: fully visible in all modes. This is data, not coaching. No Mindful suppression.

---

## 14. Build Order

1. FatSecret parsing (add-food.tsx) -- foundational, everything else depends on it
2. pj_settings schema + gear modal (log.tsx) -- the new settings need to exist before color coding can read them
3. Advanced Nutrition card redesign (log.tsx) -- two-column, grouped, color coded, gear icon
4. Custom food fields expansion (food-detail.tsx edit modal) -- standalone, doesn't block others
5. food-detail.tsx nutrient group expansion -- after parsing is in place
6. day-detail.tsx expansion -- same pattern as food-detail
7. recipe-builder.tsx / recipe-log.tsx aggregate expansion -- last, depends on field schema being settled
8. Tooltip registry update -- final pass, same session as log.tsx card ships

---

## 14b. Backward Compatibility

Existing `pj_my_foods` entries were saved before the new fields exist. When reading any food object, treat all new fields as 0 if undefined -- never crash on a missing key. Pattern: `food.transFat ?? 0`, `food.caffeine ?? 0`, etc. Apply this guard everywhere new fields are read: the Advanced Nutrition card aggregate, food-detail display, recipe builder totals, and the gear modal. No migration needed -- fields just default to 0 on old entries and don't render.

---

## 15. Surfaces NOT updated in this build

- Stats graphs: specific nutrients (Vitamin D, sodium, fiber) could be graphable data keys in the future. Not in scope now -- flagged for SOON after this ships.
- Weekly / Monthly summaries: no nutrition expansion planned. Summaries show calorie and macro totals only.
- Diagnostic reports: reads from daily data, will auto-reflect new fields if we add them to the day aggregate. No dedicated UI change needed.
- Supplements section (BACKLOG): the manual-entry approach for My Foods partially addresses the use case. Full Supplements feature remains in Backlog.
