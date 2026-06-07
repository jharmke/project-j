# SPEC: Weekly Summary
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

ALL DECISIONS BELOW ARE LOCKED unless explicitly marked ON THE FENCE.

---

## 1. WHAT THIS IS

Weekly Summary is a completed-week reflection surface. It shows an averaged composite score, per-category stats, a day-by-day score strip, and a Smart Coach AI insight for that specific week. It lives in Stats > Reports alongside Day Summaries and Effort vs Results.

This is NOT a live or rolling surface. It is a completed-week archive, generated once and saved forever.

---

## 2. GENERATION TIMING

- Fires automatically Sunday morning on first app load after 5am (same pattern as Day Summary morning pop-up).
- Computes the just-closed Sun-Sat week.
- Saves result to AsyncStorage. Never regenerated after initial save.
- Current in-progress week is NEVER shown. A week only appears after it closes Saturday night and generates Sunday morning.
- First partial week of data (e.g., user installed mid-week): shown as-is with however many days scored.

---

## 3. WEEK BOUNDARIES

- Sunday through Saturday. Calendar weeks, not rolling 7-day windows.
- Week start = Sunday 00:00. Week end = Saturday 23:59.
- AsyncStorage key: pj_weekly_summary_{YYYY-MM-DD} where the date is the Sunday (week start).

---

## 4. LOCATION IN APP

Stats > Reports section. Own collapsible card labeled "WEEKLY SUMMARIES."

**Reports section collapsibility (applies to ALL cards in Reports):**
All top-level cards in the Reports section (Day Summaries, Weekly Summaries, Effort vs Results) must have a top-level collapse toggle. Tap the card header to collapse or expand the entire section. This is a change required on the existing Day Summaries card as well. Build this in the same session.

**Inside the Weekly Summaries card:**
Weeks grouped by month. Month name is the collapsible sub-header (e.g., "June 2026"). Tap month header to expand or collapse that month's week rows.

**Week rows (collapsed state):**
- Left: date range (e.g., "Jun 1 - Jun 7")
- Score: averaged composite out of 100, color-coded
- N A R subscores (e.g., N 88 A 100 R 95) matching Day Summary row format
- Chevron on right

Tap any week row to navigate to the Weekly Detail Screen for that week.

---

## 5. WEEKLY DETAIL SCREEN

File: app/weekly-summary.tsx (new file)

Entry: push navigation from Reports. Back button returns to Reports. Full screen, not a modal.

Aesthetic: matches day-summary.tsx exactly. Same card style, same color coding, same section structure, same fonts.

### 5.1 Screen layout (top to bottom)

**Header**
Week date range. E.g., "Jun 1 - Jun 7, 2026."

**Score circle**
Same large circle as day summary. Averaged composite score (0-100). Color-coded by score.

**Tier label**
"EXCELLENT" / "GOOD" / "DECENT" etc. Same thresholds as Day Score system. Inherited, no new thresholds.

**Day strip**
7 items, one per day, labeled S M T W T F S.
Each item shows:
- Day letter (S, M, T, W, T, F, S)
- Actual date below it (e.g., "Jun 1", "Jun 2")
- Color-coded bar: green (80+), amber (60-79), red (below 60), gray (no data or excluded)
- Score number inside or below the bar

Tapping a day bar: opens the Day Summary modal for that date. Modal is read-only: open, read, dismiss (Got It button or tap outside). No links, no further navigation from inside that modal.

Days with no score (unlogged or excluded): gray bar, no number, not tappable.

**Days scored line**
Small muted text, not in a prime location. E.g., "7 of 7 days scored." Placed below day strip or above disclaimer. Not under the score circle.

**Coach Insight card**
Positioned above the Nutrition / Activity / Recovery category cards. Same as Day Summary.
See Section 6 for full spec.

**Nutrition card**
Left border accent (green, same as Day Summary).
Header: knife-fork icon + "NUTRITION" + N subscore averaged + "40% OF SCORE"
Rows (each: label left, points right, structured sub-label below):

  Calories               41 / 55
  1,832 avg · Goal 2,400 · Net -628

  Protein                22 / 28
  142g avg · Goal 165g

  Water                  14 / 17
  108 oz avg · Goal 100 oz

  Days logged (no points, just stat):
  Logged 6 of 7 days

Mindful: drop "Net -628" from Calories sub-label. Show "1,832 avg · Goal 2,400" only.

**Activity card**
Left border accent (blue).
Header: dumbbell icon + "ACTIVITY" + A subscore averaged + "35% OF SCORE"
Rows:

  Active calories        avg 712 kcal/day
  Steps                  avg 10,217/day
  Workouts               5 of 7 days
  Exercise               avg 48 min/day

No points breakdown on Activity rows (same as Day Summary pattern).

**Recovery card**
Left border accent (purple or theme recovery color).
Header: heart icon + "RECOVERY" + R subscore averaged + "25% OF SCORE"
Rows:

  Sleep duration         avg 7h 22m/night
  Sleep score            avg 88 / 100

No points breakdown on Recovery rows.

**Weight card**
Hidden entirely in Mindful mode. Shown in Discipline and Balanced.
No left border accent. Standalone card.

  Start weight           192.4 lbs  (Sunday)
  End weight             190.1 lbs  (Saturday)
  Change                 -2.3 lbs

Color-code the delta: green for loss (lose goal), green for gain (gain goal), amber for no change (maintain), red for wrong direction.

**Disclaimer**
"For informational purposes only. Not medical advice."
Same small muted text as Day Summary.

---

## 6. COACH INSIGHT CARD

### 6.1 Surface spec
- Level 1 only. No Level 2 domain cards on weekly. Level 2 stays in EvR only.
- One insight per week, generated Sunday morning alongside the weekly summary.
- Pro-gated: free users see the blurred card with PRO chip (same treatment as EvR).
- Includes "View in Effort vs Results" link, same as Day Summary coach card.

### 6.2 Packet spec
- surface: 'weekly'
- windowDays: 7
- Date range: FIXED to that specific Sun-Sat week. NOT rolling from today.
- The packet builder must accept a weekStart and weekEnd date, not just windowDays from today.
  This is a change to the packet builder: add optional startDate / endDate params.
  When provided, load data for that fixed range instead of today minus windowDays.
- Cache key: pj_coach_tip_weekly_{weekStartDate} (e.g., pj_coach_tip_weekly_2026-06-01)
- Generated once Sunday morning. Never regenerated.
- Dedup: receives home card's current scenario as exclusion parameter, same as EvR.

### 6.3 Confidence gate
Minimum 4 logged days in the week required to generate an AI insight.

If fewer than 4 logged days:
- Show the Coach Insight card but with a deterministic hardcoded message. No AI call.
- Message: "Not enough logged days this week to generate a coaching insight. Log consistently and your weekly summary will have more to work with."
- No tone chip, no Pro blur (this is informational, not a coaching insight).
- Free users see this message too (it is not a Pro feature).

If 4+ logged days: normal AI call flow. Fallback to fallbackBody if API fails, same as existing pattern.

### 6.4 Rules for weekly window
Same rulebook applies. No new rules needed. The 7-day window naturally limits which scenarios fire (scenarios requiring multi-week trends will not have enough data and will fall below the confidence gate). The existing timeframe strings ("Over the last 7 days") already handle windowDays=7 correctly from the 2026-06-07 fix.

---

## 7. FREE VS PRO

| Feature | Free | Pro |
|---|---|---|
| Weekly summary history | All weeks | All weeks |
| Week data (scores, stats, day strip) | Full access | Full access |
| Coach Insight card | Blurred, PRO chip | Full access |
| "Not enough data" message | Shown | Shown |

No history depth limitations for free users. The only gate is the Coach Insight card.

---

## 8. MINDFUL MODE

| Element | Mindful behavior |
|---|---|
| Score circle | Shown (mode-blind computation) |
| Day strip | Shown |
| Tier label | Shown |
| Nutrition: Net sub-label | Hidden. Show "avg · Goal" only |
| Activity card | Shown |
| Recovery card | Shown |
| Weight card | Hidden entirely |
| Coach Insight | AI handles tone per mode. Card still Pro-gated. |

FLAG: A broader Mindful audit across all Smart Coach surfaces is needed. The weekly spec above is the minimum. Add to roadmap.

---

## 9. EXCLUSIONS

- Day-level excluded flag inherited from pj_YYYY-MM-DD (field: excluded: boolean).
- Excluded days AND unlogged days are both skipped from the denominator and from all averages.
- "X of 7 days scored" counts only non-excluded, scored days.
- Category averaging: if a day has no sleep data, it is skipped from the Recovery subscore average (renormalization inherited from Day Score engine).

### Edge cases to test manually:

| Case | Expected |
|---|---|
| All 7 days excluded or unlogged | Week row appears in list, "0 of 7 scored," no score circle, no detail drill-in |
| 1-3 days scored | Week row appears, "X of 7 scored," Coach Insight shows hardcoded message (below confidence gate) |
| 4-7 days scored | Normal AI flow |
| Current in-progress week | Not shown anywhere |
| First week of data (partial) | Shown as-is, "X of 7 scored" |
| Mix of excluded and unlogged | Both treated identically: skipped from denominator |
| Category data missing some days | That category averages only days with data present |

---

## 10. GOALS REFERENCE

Weekly averages use the goals in effect at Sunday morning when the summary generates. These are snapshotted at generation time. Mid-week goal changes are not retroactively applied to the weekly display. This is acceptable given rarity of mid-week goal changes.

---

## 11. ASYNCSTORAGE KEYS

- pj_weekly_summary_{YYYY-MM-DD}: weekly summary data (keyed to Sunday week start)
- pj_coach_tip_weekly_{YYYY-MM-DD}: Coach Insight cache for that week (keyed to Sunday week start)
- No existing keys are touched or overwritten.

---

## 12. DAY SUMMARY CARD UPDATE (same build session)

The Day Summary sub-label format must be updated to match the new structured data format before or alongside the weekly build. The current sentence format is being replaced app-wide.

Current (bad): "Net -596 kcal vs -750 pace"
New: "1,832 avg · Goal 2,400 · Net -628"

Apply to all three stat rows in the Day Summary Nutrition card (Calories, Protein, Water).
Monthly Summary will inherit this same format when built.

File: app/day-summary.tsx

---

## 13. BUILD ORDER (within this feature)

1. Reports section: add top-level collapse toggle to Day Summaries card (stats.tsx)
2. Day Summary sub-label format update (day-summary.tsx)
3. Packet builder: add startDate / endDate params for fixed date range (smartTipsEngine.ts)
4. Weekly summary generation logic: fires Sunday morning alongside day summary generation
5. Weekly Summaries card in Reports: month grouping, week rows, navigation (stats.tsx)
6. Weekly Detail Screen (app/weekly-summary.tsx)
7. Coach Insight integration on weekly surface (coachAI.ts + weekly-summary.tsx)

---

## 14. NOT IN THIS SPEC

- Monthly Summary: separate spec session. Will inherit same format.
- Level 2 domain cards on weekly: not planned. Level 2 stays in EvR.
- Week picker for Pro: not needed. Full history is free, list is the navigation.
- Mindful broader audit: roadmap item, not this build.
