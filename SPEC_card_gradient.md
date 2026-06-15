# SPEC: App-Wide Card Gradient Wash (Oura-style top accent)

## STATUS
- DECISION LOCKED 2026-06-14: adopt the top gradient wash on cards app-wide, replacing the old left-accent-border card treatment.
- REFERENCE IMPLEMENTATION SHIPPED: the 4 Recovery-tab cards in `app/sleep.tsx` (hero, trend, key signals, coach). This is the proven, Justin-approved look. Copy this recipe exactly.
- This doc is the strict instruction set for the REMAINING app-wide rollout. A fresh thread/account can execute it cold.

## THE LOOK (what we are building)
Every card gets a soft color wash fading down from its top edge (~the top 64px), with a crisp full-color top edge baked INTO the gradient (not a separate border). Replaces the old 3px left accent border. Cards otherwise keep their normal background + a uniform faint neutral border + shadow.

Why a baked-in gradient edge and NOT a real top border: iOS renders a rounded corner unevenly whenever `borderTopWidth` differs from the side border widths (one corner's color descends farther than the other). There is no clean fix. So the crisp top edge MUST be the first color stop of the gradient, never a `borderTopWidth`. Do not reintroduce a top border.

## THE EXACT RECIPE (from the shipped reference)
Each card is a plain `View` with the shared card style, `borderLeftWidth: 0.5` + `borderLeftColor: <neutral border>` (kill the old accent left border), and a `LinearGradient` as the FIRST child:

```
<View style={[cardStyle, { borderLeftWidth: 0.5, borderLeftColor: theme.borderCard }]}>
  <LinearGradient
    colors={[WASH, WASH + '40', WASH + '00']}
    locations={[0, 0.04, 1]}
    start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
    style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 64, borderTopLeftRadius: 14, borderTopRightRadius: 14 }}
    pointerEvents="none"
  />
  {/* ...card content... */}
</View>
```

Notes:
- `WASH` is a 6-digit hex color string. `WASH + '40'` = ~25% alpha (the wash body), `WASH + '00'` = transparent. `LinearGradient` is from `expo-linear-gradient` (already a dependency).
- `borderTopLeftRadius`/`borderTopRightRadius` MUST equal the card's `borderRadius` (14 in the hub; match whatever each card uses) so the wash follows the rounded top corners. Do NOT use `overflow: 'hidden'` on the card to clip it -- that kills the iOS shadow. The matched corner radii on the gradient handle clipping with the shadow intact.
- `pointerEvents="none"` so the wash never blocks taps on the card's content/rows.
- Gradient height 64 is fixed regardless of card height (it is a top accent, not a full fill).

### Two opacity variants (intentional)
- SCORED cards (have a status color: recovery hero, day score, sleep score, etc.): WASH = the card's status color (green/amber/red). Use the GENTLER stop: `colors={[WASH, WASH + '2E', WASH + '00']}` `locations={[0, 0.06, 1]}`. Status colors are saturated and contrast the bg already, so they do not need the bolder wash.
- PLAIN cards (no status, just the theme accent -- most of the app): WASH = the theme accent. Use the BOLDER stop: `colors={[WASH, WASH + '40', WASH + '00']}` `locations={[0, 0.04, 1]}`. The accent shares the background's color family, so it needs the bolder wash to read.

## COLOR RULES (per Justin, locked)
- DEFAULT WASH = the theme ACCENT color (`theme.accentBlueRaw` in the hub; whatever the per-theme accent token is). This is what makes the rollout theme-aware automatically.
- FAITH TAB = its amber/gold color, NOT the accent. (The faith tab has its own warm identity; use the faith amber token, not the blue accent.)
- SCORED CARDS = the card's live STATUS color (green/amber/red), case-by-case, on cards that actually have a score/zone (recovery, day score, sleep score, etc.). These get the gentler variant above.
- IMPORTANT REALITY: on each theme the accent wash is SUBTLE by nature, because the app's background gradient is accent-tinted (accent ≈ bg). This is expected and accepted -- the wash gives quiet premium depth; the real "pop" comes from scored cards' status colors. Do not chase more pop by changing the background gradient (explicitly ruled out -- it is a core brand element CLAUDE mandates stay visible).

## THE ROLLOUT (do it RIGHT, not 20 inline copies)
Cards are currently styled inline per-screen (`cardStyle` objects in ~20 files; no shared card component). The rollout is a REFACTOR:
1. Build a shared `components/GradientCard.tsx`: a `View` with the canonical card base style + the `LinearGradient` wash baked in. Props: `children`, `style?` (per-card overrides), `washColor?` (defaults to theme accent; pass a status color for scored cards; Faith passes its amber). Internally it picks the bolder vs gentler variant (e.g., a `scored?` boolean prop, or infer from whether washColor was passed explicitly).
2. Centralize the card base style into a theme-aware shared style (so padding/radius/border/shadow live in ONE place).
3. Swap every screen's `<View style={cardStyle}>` to `<GradientCard>`. Screens: index, log, stats, workout, faith, profile/settings, add-food, food-detail, recipe-builder, recipe-log, day-detail, day-summary, weekly/monthly-summary, achievements, journal, bible/plans/devotional/mission, head-to-head, diagnostic-report(-view), ai-meal-estimator. (Audit `cardStyle` usages app-wide first; ~89 occurrences across ~20 files.)
4. Sleep tab cards in `app/sleep.tsx` still use the OLD left-border style -- swap them to GradientCard too so the whole hub is consistent (the Recovery tab is already on the new look).

## SHADOW (separate tuning item, TestFlight ONLY)
Card elevation/shadow was tried bumped (offset 4 / opacity 0.18 / radius 10 / elevation 6) then REVERTED -- dev-build shadows are unreliable and unjudgeable (CLAUDE rule). A stronger shadow likely helps cards lift off the accent-tinted bg (especially light themes). DECIDE the final shadow on the FIRST TestFlight build, not in dev. Bake the chosen shadow into the shared card base style.

## TESTING REQUIREMENTS (non-negotiable before "done")
- All 5 themes x all accent options (Light/Dark/Slate/Warm/Blush). The wash is accent-driven, so each theme must be checked: the accent wash reads as depth (not muddy), text contrast holds at the top of each card, and the bg gradient stays visible (not fought by the washes).
- Faith tab uses amber, not accent.
- Scored cards show status-color wash.
- Light themes especially: watch text contrast near the top wash, and check the shadow/float on TestFlight.

## REFERENCE: exact shipped values (copy these)
- Card border: `borderWidth: 0.5`, `borderColor: theme.borderCard`, `borderLeftWidth: 0.5`, `borderLeftColor: theme.borderCard` (the shared `cardStyle` ships with `borderLeftWidth: 3` + `borderLeftColor: theme.accentBlueRaw` -- the OLD accent left border -- which MUST be overridden/removed).
- Card radius: 14. Shadow (current, pre-TestFlight-tuning): `shadowOffset {0,2}`, `shadowOpacity 0.12`, `shadowRadius 6`, `elevation 3`.
- Plain/accent wash: `[accent, accent+'40', accent+'00']`, `locations [0, 0.04, 1]`, height 64.
- Scored/status wash: `[status, status+'2E', status+'00']`, `locations [0, 0.06, 1]`, height 64.

## ROLLOUT PROGRESS (2026-06-14, mid-rollout, PAUSED)
Approach taken: `components/GradientCard.tsx` holds `CardWash` (the single source of truth for the gradient recipe) + `GradientCard`. Cards are converted by INJECTING `<CardWash />` as a direct child (CardWash is position:absolute so order doesn't matter) rather than swapping wrappers -- safest, zero layout drift, and any future visual tuning is a one-file fix in CardWash. Old colored card edges (accent left border AND accent top border `borderTopColor: theme.accentBlueRaw` + `borderTopWidth: 1.5`) are neutralized to `theme.borderCardTop` as each file is converted. `overflow:'hidden'` and per-card shadows are left alone.

### DONE (compiles clean, zero new type errors vs the 16 pre-existing baseline)
- `components/GradientCard.tsx` (new): `CardWash` + `GradientCard`.
- `app/sleep.tsx` -- Sleep AND Recovery hubs. Recovery refactored from inline gradients to `CardWash`. Sleep Score hero = scored (accent fallback when no score).
- `app/(tabs)/index.tsx` -- all Home feed cards. The special animated/paged smart-tip card was LEFT AS-IS (semantic per-page colored top border + animated height).
- `app/(tabs)/stats.tsx` -- all content cards (streaks, calendar, EvR, graph cards).
- `app/(tabs)/log.tsx` -- Today's Total, Advanced Nutrition, meal rows, Water. (NOTE: meal rows + collapsed Advanced Nutrition flagged bad below -- to be reverted/fixed.)
- `app/(tabs)/workout.tsx` -- 4 content cards (2 empty states, Today's Effort, Workout Notes).
- `app/(tabs)/faith.tsx` -- all 3 cards AMBER (incl. the verse/Today's Message card). Baked 1.5px gold top border removed from `styles.card`.
- `app/day-detail.tsx` -- all 8 `styles.card` cards.
- `app/day-summary.tsx` -- category `SectionCard`s, scored by category color (composite is a ring, no card).
- `components/DaySummaryModal.tsx` -- scored by composite color (radius 18).
- `app/(tabs)/profile.tsx` -- no content cards, nothing to do.

### NOT DONE (pick up here)
- `app/weekly-summary.tsx`, `app/monthly-summary.tsx` -- SummaryCard (category, scored) + 4 coach-card states. Read but NOT edited.
- Remaining screens: settings, add-food, food-detail, recipe-builder, recipe-log, achievements, journal, bible, plans, devotional, mission, head-to-head, diagnostic-report(-view), ai-meal-estimator, prayer, definitions, tutorials.
- Remaining components: FaithTodayCard, GratitudeStreakCard, ReadingPlansCard, IFCard, StatsGraphCard, CustomFoodCreator, BibleStartGuide, CompanionChat, and any others rendering content cards.

## JUSTIN CHANGE REQUESTS (2026-06-14 device review) -- ACTION NEXT SESSION

1. **SMALL / COLLAPSED CARDS LOOK BAD -- TOP PRIORITY, AUDIT ALL.** The fixed 64px wash overwhelms short cards: on a collapsed/short card the wash is most or all of the card height, so it reads as a full color FILL instead of a subtle top accent. Confirmed bad on: collapsed Advanced Nutrition (log), collapsed day-detail sections. AUDIT every collapsible/small card app-wide. Pick a fix that keeps the crisp top edge (gradient first color stop -- never reintroduce `borderTopWidth`) but makes the fade proportional or suppressed on short cards. Options to weigh: (a) scale `CardWash` height to a fraction of the card's measured height, (b) cap/shrink height under a threshold, (c) suppress the wash entirely while collapsed / below a height threshold. This is the gating issue before finishing the rollout.

2. **LOG meal-time cards: REMOVE the gradient.** All mealtime / meal-slot cards (Morning/Lunch/Dinner/Snacks/Supplements). They're small list rows; the wash looks bad. Revert the `CardWash` added to `styles.mealRow` in `app/(tabs)/log.tsx`.

3. **Advanced Nutrition card (log) collapsed looks bad** -- instance of #1.

4. **Coach Insight HOME card: make it STATUS/SCORE colored, not amber.** It's currently amber because of its content. Confirm the capability to drive its wash by a score/status color and wire it. (This is the home Coach Insight card; verify which component/file renders it.)

5. **STATS: Records cards should get the wash; Trends graph cards should too.** Confirm these were covered by the stats.tsx pass or add them (graph cards may render via `components/StatsGraphCard.tsx`).

6. **HOME: Faith hub card (`FaithTodayCard`) should get the wash.**

7. **FAITH: Gratitude card (`GratitudeStreakCard`) needs the wash.** ALSO: unify the "Today's Message" (verse) card with the other faith tab cards -- give it the SAME background as the rest of the faith cards and the same format, with the gradient like the others (drop its distinct verse-card treatment so it matches).

8. **DAY DETAIL: collapsed small cards look bad** -- instance of #1.

### Design note for the small-card fix (root cause)
`CardWash` height is a fixed 64px regardless of card height. Tall card = top accent (good). Short/collapsed card = near-full fill (bad). The fix lives in ONE place (`components/GradientCard.tsx` -> `CardWash`), so once we settle the approach it propagates everywhere automatically.
