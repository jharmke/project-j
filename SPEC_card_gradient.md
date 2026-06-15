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
