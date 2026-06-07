# SPEC: Monthly Summary
# Status: LOCKED. Spec session 2026-06-07. Build session TBD.
# Read CLAUDE.md and project_j_roadmap.md before touching anything.

---

## 0. READ FIRST

- Confirm with Justin before every file change. Restate task, wait for explicit go-ahead.
- One change at a time, confirmed working before the next.
- Update project_j_roadmap.md in real time the moment anything ships or a decision is made.
- No double-dash anywhere: not in code, comments, or user-facing strings.
- PowerShell only, git commands one at a time.
- Mode-awareness: Mindful behavior is specced below. Do not skip it.
- Cross-reference: SPEC_weekly_summary.md is locked and shares format, design language, and packet builder foundations with this spec.

ALL DECISIONS BELOW ARE LOCKED unless explicitly marked ON THE FENCE.

---

## 1. WHAT THIS IS

Monthly Summary is a completed-month reflection surface. It shows an averaged composite score, per-category stats, a calendar heatmap of daily scores, and a Smart Coach AI insight for that specific month. It lives in Stats > Reports alongside Day Summaries, Weekly Summaries, and Effort vs Results.

This is NOT a live or rolling surface. It is a completed-month archive, generated once and saved forever.

Monthly Summary is Pro-only. The entire surface is gated. Free users cannot view any data. Unlike Weekly (data free, only Coach Insight gated), the Monthly gate applies to everything.

---

## 2. GENERATION TIMING

- Fires on the 1st of each month, first app load after 5am (same pattern as Day Summary and Weekly Summary morning generation).
- Computes the just-closed calendar month.
- Saves result to AsyncStorage. Never regenerated after initial save.
- Current in-progress month is NEVER shown. A month only appears after it closes and generates on the 1st.
- First partial month of data (e.g., user installed March 15): shown as-is with however many days scored. Days before install are gray in the calendar grid.

---

## 3. MONTH BOUNDARIES

- Calendar month: Jan 1 00:00 through Jan 31 23:59, etc.
- windowDays: actual days in the month (28, 29, 30, or 31 depending on month and leap year).
- AsyncStorage key: pj_monthly_summary_{YYYY-MM} (e.g., pj_monthly_summary_2026-06)

---

## 4. LOCATION IN APP

Stats > Reports section. Own collapsible card labeled "MONTHLY SUMMARIES."

**Reports section collapsibility:** Follows the same top-level collapse toggle standard established in the Weekly spec. All cards in Reports (Day Summaries, Weekly Summaries, Monthly Summaries, Effort vs Results) are collapsible via their card header.

**Inside the Monthly Summaries card:**

FREE USERS: Blurred/locked preview row with PRO chip. PRO chip taps to nothing for now. TODO: wire to subscriptions/plans screen when that page ships. No data visible.

PRO USERS: List of month rows, most recent first. No sub-grouping needed (months are the natural unit; year-level grouping unnecessary unless years of history accumulate, which is not an immediate concern).

**Month rows (collapsed state):**
- Left: month name + year (e.g., "June 2026")
- Score: averaged composite out of 100, color-coded
- N A R subscores (matching Day Summary and Weekly row format)
- Chevron on right

Tap any month row to navigate to the Monthly Detail Screen for that month.

---

## 5. FREE VS PRO

| Feature | Free | Pro |
|---|---|---|
| Monthly Summaries card in Reports | Locked preview + PRO chip | Full list of months |
| Monthly Detail Screen | Not accessible | Full access |
| Coach Insight card | Not accessible (behind surface gate) | Full access |
| "Not enough data" message | Not accessible (behind surface gate) | Shown |

The Pro gate lives at the Reports card level. If a user reaches the Monthly Detail Screen, they are Pro. No secondary gating needed inside the detail screen.

---

## 6. MONTHLY DETAIL SCREEN

File: app/monthly-summary.tsx (new file)

Entry: push navigation from Reports. Back button returns to Reports. Full screen, not a modal.

Aesthetic: matches day-summary.tsx and weekly-summary.tsx exactly. Same card style, same color coding, same section structure, same fonts.

### 6.1 Screen layout (top to bottom)

**Header**
Month name + year. E.g., "June 2026."

**Score circle**
Same large circle as day summary and weekly summary. Averaged composite score (0-100). Color-coded by score.

**Tier label**
"EXCELLENT" / "GOOD" / "DECENT" etc. Same thresholds as Day Score system. Inherited, no new thresholds.

**Coach Insight card**
Positioned above the Month at a Glance card and category cards. See Section 7 for full spec.

**Month at a Glance card**
See Section 6.2.

**Nutrition card**
See Section 6.3.

**Activity card**
See Section 6.4.

**Recovery card**
See Section 6.5.

**Weight card**
Hidden entirely in Mindful mode. Shown in Discipline and Balanced. See Section 6.6.

**Disclaimer**
"For informational purposes only. Not medical advice."
Same small muted text as Day Summary.

---

### 6.2 Month at a Glance card

Standard card with:
- Card header left: "MONTH AT A GLANCE" label (same label style as Nutrition/Activity/Recovery)
- Card header right: "X of Y days logged" (muted text)
- Collapse toggle: tap header to collapse or expand. Expanded by default. State not persisted (resets to expanded on next open).

**Calendar grid inside card body:**
- 7 columns representing days of the week: S M T W T F S
- Day-of-week letters as column headers in small muted uppercase text
- One cell per calendar day of the month, laid out in rows by week
- Empty cells for days outside the current month (before the 1st and after the last day): invisible but occupy grid space to maintain alignment. Never show cells for adjacent months.
- Month boundary days that fall mid-week start from the correct column.

**Each day cell:**
- Rounded square (borderRadius 8)
- Color fill based on Day Score: green (80+), amber (60-79), red (below 60), gray with low opacity for no data or excluded
- Score number inside the cell: white, small (11px), semibold. Shown on all scored days. Not shown on unscored/gray days.
- Subtle border on unscored cells (rgba(255,255,255,0.06)) so the grid structure reads even when empty.

**Interactions:**
- Scored (non-gray) cells: tappable. Opens Day Summary for that date in a read-only modal (open, read, dismiss via Got It button or tap outside). No further navigation from inside that modal.
- Gray/unscored cells: not tappable. No press feedback.

**At build time:** if 40px cells feel cramped or difficult to tap, bump to 44px. Verify comfort on physical device.

---

### 6.3 Nutrition card

Left border accent (green, same as Day Summary and Weekly).
Header: knife-fork icon + "NUTRITION" + N subscore averaged + "40% OF SCORE"

Rows (each: label left, points right, structured sub-label below):

  Calories               XX / 55
  1,832 avg · Goal 2,400 · Net -628

  Protein                XX / 28
  142g avg · Goal 165g

  Water                  XX / 17
  108 oz avg · Goal 100 oz

  Days logged (no points, just stat):
  Logged X of Y days

Mindful: drop "Net -628" from Calories sub-label. Show "1,832 avg · Goal 2,400" only.

---

### 6.4 Activity card

Left border accent (blue).
Header: dumbbell icon + "ACTIVITY" + A subscore averaged + "35% OF SCORE"

Rows:

  Active calories        avg 712 kcal/day
  Steps                  avg 10,217/day
  Workouts               X of Y days
  Exercise               avg 48 min/day

No points breakdown on Activity rows (same as Weekly Summary pattern).

---

### 6.5 Recovery card

Left border accent (purple or theme recovery color).
Header: heart icon + "RECOVERY" + R subscore averaged + "25% OF SCORE"

Rows:

  Sleep duration         avg 7h 22m/night
  Sleep score            avg 88 / 100

No points breakdown on Recovery rows.

---

### 6.6 Weight card

Hidden entirely in Mindful mode. Shown in Discipline and Balanced.
No left border accent. Standalone card.

  Start weight           192.4 lbs  (nearest logged weight to the 1st of the month)
  End weight             190.1 lbs  (nearest logged weight to the last day of the month)
  Change                 -2.3 lbs

If no weight was logged at all during the month: weight card shows "No weight data this month" in muted text. Do not show the card with empty values.

Color-code the delta: green for loss (lose goal), green for gain (gain goal), amber for no change (maintain), red for wrong direction.

---

## 7. COACH INSIGHT CARD

### 7.1 Surface spec
- Level 1 only. No Level 2 domain cards on monthly (same as Weekly).
- One insight per month, generated on the 1st alongside the monthly summary.
- No secondary Pro gate needed inside this screen (surface-level gate handles it).
- Includes "View in Effort vs Results" link, same as Day Summary and Weekly coach cards.

### 7.2 Confidence gate
Minimum 14 logged days in the month required to generate an AI insight.

If fewer than 14 logged days:
- Show the Coach Insight card with a deterministic hardcoded message. No AI call.
- Message: "Not enough logged days this month to generate a coaching insight. Log consistently and your monthly summary will have more to work with."
- No tone chip.

If 14+ logged days: normal AI call flow. Fallback to fallbackBody if API fails, same as existing pattern.

### 7.3 Packet spec
- surface: 'monthly'
- windowDays: actual days in the month (28, 29, 30, or 31)
- startDate: first day of the month (e.g., 2026-06-01)
- endDate: last day of the month (e.g., 2026-06-30)
- Uses fixed startDate/endDate params from the packet builder (same architecture as Weekly spec Section 6.2)
- Cache key: pj_coach_tip_monthly_{YYYY-MM} (e.g., pj_coach_tip_monthly_2026-06)
- Generated once on the 1st. Never regenerated.
- Dedup: receives home card's current scenario as exclusion parameter, same as EvR and Weekly.
- Must include all Packet Standard data density fields from Section 8.

### 7.4 Rules for monthly window
Same rulebook applies. The existing timeframe strings handle longer windows naturally via the surface field and windowDays value. No new scenario rules needed specifically for monthly.

---

## 8. AI DATA DENSITY -- SHARED PACKET STANDARD

This is a new requirement applying to all multi-day AI coaching surfaces. It solves the problem of the AI speaking with false confidence when data is sparse, including the safety case where low-calorie averages on sparse data must not be praised as a deficit achievement.

### 8.1 New packet fields

Add to the coaching packet payload for EvR, Weekly, and Monthly surfaces:

```
daysLogged: number            // days where user actively logged (food entries > 0 OR manual weight OR logged workout)
                              // uses the same scored-day definition as the Day Score engine
windowDays: number            // total calendar days in the window (7, 28-31, or EvR window days)
daysWithNutritionData: number // days with at least one food log entry
daysWithActivityData: number  // days with active calories > 0 or steps > 0
daysWithSleepData: number     // days with sleep duration > 0
```

These fields are computed from the same daily data already loaded by the packet builder. No additional storage reads needed.

### 8.2 Prompt template addition

Add this block to the AI prompt template immediately before the metrics section, for all multi-day surfaces:

"Data coverage: [daysLogged] of [windowDays] days logged. Nutrition: [daysWithNutritionData] days. Activity: [daysWithActivityData] days. Sleep: [daysWithSleepData] days."

### 8.3 Coaching rulebook additions

Add to the coaching instructions (system prompt / rulebook) for all multi-day surfaces:

1. "When data coverage (daysLogged) is below 50% of windowDays, frame insights as 'in the days you logged' rather than 'this week' or 'this month.' Avoid strong trend claims. Acknowledge the partial picture."
2. "When a specific category (nutrition, activity, or sleep) has fewer than 3 days of data, do not make confident claims about that category's trends or patterns."
3. "Never praise a calorie deficit or low-intake pattern when daysWithNutritionData is below 60% of windowDays. Sparse nutrition data makes it impossible to distinguish a genuine deficit from an untracked binge pattern."

### 8.4 Build application

| Surface | Action |
|---|---|
| Weekly Summary | Bake in from day one during Weekly build session |
| Monthly Summary | Bake in from day one during Monthly build session |
| EvR (Effort vs Results) | Retrofit in the same build session as Weekly (packet builder is already open for startDate/endDate changes; add density fields and update prompt template in the same pass) |
| Home card | No change. Rolling window from today has no sparse-data problem. |
| Day Summary | No change. Single-day surface; density is trivially known. |

Note: if Weekly is built before Monthly, the Packet Standard implementation from steps 8.1-8.3 should be completed during the Weekly build session so Monthly inherits it. If built in the same session, implement once and wire to both.

---

## 9. MINDFUL MODE

| Element | Mindful behavior |
|---|---|
| Score circle | Shown |
| Tier label | Shown |
| Coach Insight card | AI handles tone per mode. Card shown. |
| Month at a Glance card | Shown |
| Nutrition: Net sub-label | Hidden. Show "avg · Goal" only. |
| Activity card | Shown |
| Recovery card | Shown |
| Weight card | Hidden entirely |

---

## 10. EXCLUSIONS

- Day-level excluded flag inherited from pj_YYYY-MM-DD (field: excluded: boolean).
- Excluded days AND unlogged days are both skipped from the denominator and from all averages.
- "X of Y days logged" counts only non-excluded, scored days.
- Category averaging: if a day has no sleep data, it is skipped from the Recovery subscore average (renormalization inherited from Day Score engine).
- Calendar grid: excluded days render the same as unlogged days (gray, not tappable). No distinction needed visually.

### Edge cases to test manually:

| Case | Expected |
|---|---|
| All days excluded or unlogged | Month row appears in list, "0 of Y scored," no score circle, no detail drill-in |
| 1-13 days scored | Normal stats display, Coach Insight shows hardcoded message (below confidence gate) |
| 14+ days scored | Normal AI flow |
| Current in-progress month | Not shown anywhere |
| First month of data (partial install mid-month) | Shown as-is, "X of Y scored," gray cells for pre-install days |
| Mix of excluded and unlogged | Both treated identically: skipped from denominator |
| Category data missing some days | That category averages only days with data present |
| No weight logged entire month | Weight card shows "No weight data this month," not empty value rows |
| Month with 28 days (Feb non-leap) | windowDays = 28, grid renders correctly with 28 cells |
| Month with 29 days (Feb leap year) | windowDays = 29, grid renders correctly |

---

## 11. GOALS REFERENCE

Monthly averages use the goals in effect at the 1st of the following month (generation time). Snapshotted at generation. Mid-month goal changes are not retroactively applied. Same reasoning as Weekly: rarity of mid-month goal changes makes this acceptable.

---

## 12. ASYNCSTORAGE KEYS

- pj_monthly_summary_{YYYY-MM}: monthly summary data (keyed to calendar month)
- pj_coach_tip_monthly_{YYYY-MM}: Coach Insight cache for that month
- No existing keys are touched or overwritten.

---

## 13. BUILD ORDER (within this feature)

1. Packet Standard: add daysLogged, windowDays, daysWithNutritionData, daysWithActivityData, daysWithSleepData to packet builder. Update prompt template with data coverage preamble. Add three rulebook rules to coaching instructions. (Do this during Weekly build session if Weekly ships first; if Monthly and Weekly build together, implement once.)
2. EvR retrofit: apply Packet Standard fields and prompt template update to EvR surface (packet builder already open).
3. Monthly summary generation logic: fires on 1st of month alongside existing morning generation checks.
4. Monthly Summaries card in Reports: locked preview row + PRO chip for free users; month rows with navigation for Pro users. (stats.tsx)
5. Monthly Detail Screen: score circle, tier label, Month at a Glance card with calendar grid, category cards, weight card, disclaimer. (app/monthly-summary.tsx)
6. Coach Insight integration on monthly surface: packet with density fields, confidence gate at 14 days, cache key, dedup. (coachAI.ts + monthly-summary.tsx)

---

## 14. NOT IN THIS SPEC

- Subscriptions/plans screen: PRO chip wires to nothing until that screen ships. TODO: wire when ready.
- Level 2 domain cards: not planned for monthly. Level 2 stays in EvR only.
- Year-level grouping in the Monthly Summaries Reports card: not needed. Revisit only if years of history accumulate.
- Mindful broader audit: roadmap item, not this build.
- Shareable/exportable monthly snapshots: Phase 4 roadmap item, not scoped here.
