# HANDOFF SPEC: Day Score + Day Summary

Status: PLANNED, NOT STARTED. No code written yet. This doc is the complete handoff for a build session.
Created: 2026-05-29. Spec session thread: Session 61.

---

## 0. READ FIRST (session rules, non-negotiable)

- Read `CLAUDE.md` and `project_j_roadmap.md` before touching anything.
- Confirm with Justin before every file change. Restate the task, wait for explicit go-ahead.
- ONE change at a time, confirmed working before the next. Recommend a git commit after each gate-passing step.
- Update `project_j_roadmap.md` in real time the moment anything ships or a decision is made.
- No double-dash (`--`) anywhere: not in code comments, not in user-facing strings, not in conversation.
- PowerShell only, git commands one at a time.
- Mode-awareness: every feature must define Discipline / Balanced / Mindful behavior. Fully specified below.
- Faith Journey awareness: specified below per feature surface.

ALL DECISIONS BELOW ARE LOCKED unless explicitly marked ON THE FENCE.
Do not re-litigate locked decisions. Justin signed off in the Session 61 spec thread.

---

## 1. WHAT THESE FEATURES ARE

**Day Score:** A single 0-100 composite number summarizing how a user's day went across Nutrition, Activity, and Sleep. Computed once per completed day. Foundational -- feeds Day Summary pop-up, weekly/monthly summaries (future), Smart Tips engine (future), and the Stats Reports archive.

**Day Summary:** Two surfaces for the same data:
1. A morning pop-up modal that fires on first app load after 5am, showing yesterday's score.
2. An archive in Stats > Reports (below Effort vs Results) showing the last 90 days, grouped by week.

**Build order:** Day Score engine first (pure computation, no UI). Day Summary pop-up second. Stats archive third. Smart Tips is a separate spec and separate build -- do not build it here.

---

## 2. DAY SCORE -- FULL SPEC

### 2.1 Computation timing

Day Score is a COMPLETED DAY metric only. It is NEVER computed live or shown for today.

Computed at: midnight (background) OR on first app load of the following day, whichever comes first.
Result stored to: `pj_YYYY-MM-DD` under a new `dayScore` object (see Section 2.8 for storage shape).

Today always shows as in-progress. No score, no partial score, no estimate shown anywhere for the current day.

### 2.2 Three categories

Day Score is a weighted composite of three category scores, each 0-100:

| Category | Composite weight |
|----------|-----------------|
| Nutrition | 40% |
| Activity | 35% |
| Sleep | 25% |

CRITICAL: weights only apply to categories that have data. If a category has no data, it is excluded from the composite entirely and the remaining weights renormalize. See Section 2.5 for missing data rules.

Example: user logged food and slept but had a rest day with no HealthKit. Composite = (Nutrition * 0.40 + Sleep * 0.25) / 0.65, normalized to 100.

### 2.3 Nutrition score (0-100)

Three sub-components. Each uses proximity scoring -- no binary cliffs anywhere except where explicitly noted.

**Sub-component 1: Calorie goal hit (55pts max)**

Uses the locked Way 1 / Way 2 logic from `utils/goalHit.ts` (SPEC_calorie_goal_hit.md). The goal-hit util must be built before Day Score can be built.

Scoring:
- Clean HIT (evaluateCalorieGoalHit returns hit: true) = full 55pts.
- MISS = proximity scoring. Scale from 55pts down to 0 based on how far outside the hit boundary the net landed.
  - For lose goal: miss distance = abs(net - (paceTarget + 150)). Score = max(0, 55 * (1 - missDistance / 500)). Floor at 0.
  - For maintain: miss distance = abs(net) - 150. Same scale.
  - For gain: symmetric to lose.
  - The 500 denominator means a miss of 500+ calories or more = 0pts on this sub-component. Tune this denominator in a real-data pass after launch if needed.

Calorie sub-component mode behavior:
- Discipline / Balanced / Mindful: scoring math is IDENTICAL across all modes (same as goal-hit util -- mode-blind). Mode only affects presentation, never the score computation.

**Sub-component 2: Protein goal hit (28pts max)**

Protein goal = ratio-based. Always computed against `calTarget` (the static fixed target), NOT against actual consumed.
Formula: `proteinGoalG = round((macroProteinPct / 100) * calTarget / 4)`
Source: `pj_profile.macroProteinPct` and `pj_settings.calTarget` (same load path as index.tsx).

If macroMode is 'fixed': use `macroProteinG` directly.

Proximity scoring: `score = min(28, 28 * (actualProteinG / proteinGoalG))`
Capped at 28 -- hitting 150% of protein goal does not score above 28pts.
If no protein data logged (no food entries): sub-component excluded, 28pts redistributed proportionally to calorie and water sub-components.

**Sub-component 3: Water goal hit (17pts max)**

Goal source: `pj_profile.waterGoal` (oz).
Proximity scoring: `score = min(17, 17 * (waterLogged / waterGoal))`
Capped at 17 -- over-drinking does not inflate score.
If water goal not set or no water logged: sub-component excluded, 17pts redistribute proportionally.

**Nutrition total: 55 + 28 + 17 = 100pts before normalization.**

Extended nutrition (fiber, sodium, sugar, etc.) does NOT feed the Nutrition score. It feeds the Smart Tips engine instead. No scoring penalty or bonus for extended nutrition data. This was explicitly decided -- we have no user-set goals for these fields so grading them would be unfair.

### 2.4 Activity score (0-100)

Two sub-components. Composition depends on the day type from the weekly template.

Day types: `'lift'`, `'cardio'`, `'rest'`, `'unassigned'`
- `rest` or `unassigned`: workout completion sub-component is EXCLUDED. Activity = active calories only, renormalized.
- `lift` or `cardio`: both sub-components active.

**Sub-component 1: Active calories (60pts on workout days, 100pts on rest/unassigned days)**

Goal source: `pj_profile.activeCalGoal` (default 500 kcal).
Value source: same as home card -- `(activeCalories || caloriesBurned) * burnAccuracyPct / 100` (accuracy-adjusted, same rule as everywhere else in the app).
Proximity scoring: `score = min(maxPts, maxPts * (adjustedActiveCals / activeCalGoal))`
Capped at max -- over-burning does not inflate score.

**Sub-component 2: Workout completion (40pts, workout days only)**

Binary: did the user complete all scheduled exercises for the day?
- All exercises checked = 40pts.
- Partial completion = proportional. `score = 40 * (completedCount / totalCount)`
- Zero exercises completed on a scheduled workout day = 0pts.
- No exercises scheduled (rest/unassigned) = sub-component excluded.

Exercise minutes goal (30 min default) is NOT a separate sub-component. It is available as a Smart Tips signal but not scored separately. This avoids double-counting with workout completion.

**Activity mode behavior:**
- Discipline / Balanced: active calorie goal, proximity scoring as above.
- Mindful: activity sub-component is presence-based only.
  - Did user move today? Y/N.
  - "Moved" = any logged workout OR steps >= 60% of step goal (not 50% -- Justin confirmed 60-75% range, using 60 as floor).
  - If moved = full Activity score (100pts, category weight applies normally).
  - If did not move = 0pts Activity.
  - No active calorie number surfaced in Mindful mode scoring display.

### 2.5 Sleep score (0-100)

**Direct passthrough from existing sleep score algorithm.** Do not recompute. Read the stored sleep score from `pj_YYYY-MM-DD`.

Sleep score already computed by: Duration (cubic curve, 60pts) + Feel rating (30pts) + Bedtime consistency (10pts). Trustworthy and consistent. See roadmap for full sleep score spec.

**Floor rule:** Any night where sleep was logged (any data present) earns a minimum of 50pts on the sleep category score, regardless of raw sleep score. The upper 50pts scale with the raw score: `sleepCategoryScore = 50 + (rawSleepScore / 100) * 50`

Examples:
- Raw sleep score 87: category score = 50 + 43.5 = 93.5
- Raw sleep score 55: category score = 50 + 27.5 = 77.5
- Raw sleep score 20 (terrible night): category score = 50 + 10 = 60 (still not catastrophic)
- No sleep data: category excluded from composite entirely

Rationale: sleep is partially outside user control. The floor rewards the behavior (tracking, prioritizing sleep) not just the outcome. This must be explained in the tutorial/toolkit -- users need to understand why a 65 sleep score doesn't kill their Day Score.

**Sleep mode behavior:** Sleep score computation is mode-blind. Same number regardless of mode. Mode only affects how it is displayed (label language in Mindful).

### 2.6 Score labels

| Range | Discipline/Balanced label | Mindful label |
|-------|--------------------------|---------------|
| 95-100 | Elite | Fully Present |
| 90-94 | Excellent | Fully Present |
| 85-89 | Great | Showing Up |
| 80-84 | Good | Showing Up |
| 70-79 | Solid | Making Progress |
| 60-69 | Decent | Making Progress |
| 50-59 | Okay | Keep Going |
| Below 50 | Rough | Light Day |

### 2.7 Excluded days

- Day marked `excluded` in `pj_YYYY-MM-DD.excluded`: NO Day Score computed. No pop-up fires. Score shown as dash in archive.
- Excluded days are NOT counted in weekly or monthly score averages.
- Excluded days still appear as a visual marker in the archive (excluded icon, not a blank gap).
- Incomplete logging days (some data but not full): score IS computed however low it lands. User owns that. No special treatment. Toolkit explains that logging consistency matters and excluded flag exists for legitimate off days.

**Minimum data threshold for pop-up to fire:**
At least 1 of the 3 categories must have data for a score to be computed and pop-up to fire.
- Nutrition counts as having data if any food entries exist for the day.
- Activity counts if any active cal data or workout data exists.
- Sleep counts if sleep hours were logged.
- Literally zero data = no score, no pop-up, dash in archive.

ON THE FENCE: whether a calorie floor (e.g. 400 kcal, same as other places in the app) should gate Nutrition from counting as "has data." Currently leaning toward not gating -- even a small log is valid. Revisit after real-data testing.

### 2.8 Storage shape

Add `dayScore` object to `pj_YYYY-MM-DD`:

```ts
dayScore: {
  composite: number;           // 0-100, rounded to 1 decimal
  label: string;               // e.g. "Great"
  nutritionScore: number | null;   // 0-100 or null if excluded
  activityScore: number | null;    // 0-100 or null if excluded
  sleepScore: number | null;       // 0-100 or null if excluded
  nutritionDetail: {
    calorieHit: boolean;
    calorieScore: number;
    proteinScore: number;
    waterScore: number;
  } | null;
  activityDetail: {
    activeCalScore: number;
    workoutScore: number | null;   // null on rest/unassigned days
    isMindfulPresence: boolean;    // true if scored as Mindful presence Y/N
  } | null;
  sleepDetail: {
    rawSleepScore: number;
    categoryScore: number;         // after floor rule applied
  } | null;
  computedAt: string;              // ISO timestamp
  excludedFromAverages: boolean;   // mirrors day excluded flag
}
```

CRITICAL DATA INTEGRITY: Day Score writes using read-then-merge pattern. NEVER replace the entire `pj_YYYY-MM-DD` object. Always read current value, merge `dayScore` into it, write back.

### 2.9 Mode behavior summary

| Feature | Discipline | Balanced | Mindful |
|---------|-----------|---------|---------|
| Score number shown | Yes, 0-100 | Yes, 0-100 | Yes, 0-100 |
| Score label | Discipline labels | Balanced labels | Mindful labels |
| Calorie sub-component | Proximity, Way1/Way2 | Same | Same (mode-blind) |
| Activity sub-component | Active cal goal, proximity | Same | Presence Y/N (60% step floor) |
| Category breakdown shown | Yes, all three | Yes, all three | Yes, softer language |
| Score color coding | Yes (green/amber/red by label tier) | Same | Neutral, no color judgment |

### 2.10 Faith Journey behavior

Day Score computation is faith-agnostic. Faith actions (journal entries, prayer, Bible reading) do NOT contribute to Day Score. They have their own recognition via streaks and achievements.

Faith Journey only affects one thing: the pop-up copy. See Section 3.4.

---

## 3. DAY SUMMARY POP-UP -- FULL SPEC

### 3.1 What it is

A standard modal (same pattern as every other modal in the app) that fires automatically on first app load after 5am, showing yesterday's Day Score.

NOT a push notification. In-app only. Fires once per calendar day maximum.

### 3.2 Timing gate

Fires IF:
- Current time >= 5am (no upper limit -- if user opens app at noon they still get it)
- First load of THIS calendar day (gate stored in `pj_last_summary_shown: YYYY-MM-DD`)
- Yesterday has a computed Day Score (composite is not null)
- Yesterday is not excluded
- Minimum data threshold met (at least 1 category has data)

Does NOT fire if:
- App opened before 5am
- Already fired today (even if dismissed and app closed/reopened)
- Yesterday has no score
- Yesterday is excluded

### 3.3 Visual design

Standard modal pattern. Non-negotiable:
- Accent top border
- Handle pill at top (tap or drag to dismiss)
- No X button in corner
- Same animations as every other modal in the app (scale-in, fade overlay)
- `bgSheet` background
- NOT a bottom sheet -- centered card like Programs modal pattern

Contents top to bottom:
1. Chip label: "YESTERDAY" in card label style (muted, uppercase, letterSpacing 3)
2. Date line: e.g. "Tuesday, May 26" in textSecondary
3. Hero Day Score number: Bebas Neue, large (52-56pt), accent colored, with big-number text treatment (shadow + opacity 0.88)
4. Score label below hero number: e.g. "EXCELLENT" in Bebas, smaller (18pt), accent colored
5. Three category score pills in a horizontal row: Nutrition / Activity / Sleep, each showing the category score (or "--" if no data). Pill style matches app pill aesthetic.
6. One auto-generated win line: e.g. "You crushed your water goal" -- pulled from the highest-scoring sub-component. Accent colored, DMSans_600SemiBold.
7. One coaching note if relevant: e.g. "Protein was your gap -- aim for Xg more today." Only fires if a sub-component scored below 60% of its max. Muted color, smaller text. If nothing scored below 60%, this line is hidden.
8. Divider
9. "VIEW FULL SUMMARY" button -- routes to the Stats archive, auto-scrolled to and expanded for yesterday's entry. Standard interactive blue button style.
10. Small muted text link at bottom: "Exclude this day" -- see Section 3.5.

Mindful mode copy differences:
- Hero label uses Mindful labels (e.g. "SHOWING UP" not "GOOD")
- Win line is observational: "You showed up for your nutrition today" not metric-specific
- Coaching note is softer: "Sleep is one area to explore tomorrow" -- no numbers in coaching text ever in Mindful
- "Exclude this day" still present

Faith Journey copy differences (Rooted and Exploring only, NOT for Not Right Now):
- Rooted: win line can include faith framing if faith habits were logged. e.g. "Strong day -- you took care of your body and spirit." Only fires if journal/prayer/gratitude entry exists for the day.
- Exploring: no faith framing in pop-up. Secular only.
- Not Right Now: no faith framing. Same as Balanced/Discipline copy.

### 3.4 Dismissal

- Drag handle down: dismiss
- Tap handle: dismiss
- Tap "VIEW FULL SUMMARY": navigate and dismiss
- Tap "Exclude this day": see Section 3.5
- NO tap-outside-to-dismiss (prevents accidental dismissal while reading)
- NO auto-dismiss timer

### 3.5 Exclude from pop-up

Small muted text link at bottom of modal: "Exclude this day"
- Tap: fires a quick confirmation (not a full Alert -- an inline confirmation row that replaces the link: "Are you sure? This removes it from your weekly average." with [Cancel] [Exclude] in the same row).
- On confirm: sets excluded flag on that day's storage, dismisses modal, score shows as dash in archive.
- Heavy haptic on confirm.
- This is the fast exclusion path. Full exclusion toggle still exists in Day Detail as always.

### 3.6 Tutorial requirement

An interactive tutorial for the Day Summary pop-up is REQUIRED before App Store launch. It must:
- Explain what the score is and what each category means
- Show where to find it again after dismissal (Stats > Reports)
- Explain that logging consistency affects the score
- Explain the excluded day option
- Mention the sleep floor rule in plain English ("We don't punish you for a bad night -- showing up and tracking still counts")

Tutorial fires on first ever pop-up appearance (or can be triggered from Settings > Tutorials). Toolkit/Help article also required covering the same content.

---

## 4. DAY SUMMARY ARCHIVE (STATS > REPORTS)

### 4.1 Location

Stats tab > Reports section, below Effort vs Results card. New card: "DAY SUMMARIES" or similar chip label. Same visual treatment as the Effort vs Results report list.

### 4.2 Storage

Last 90 days of Day Score data are retained. Oldest auto-purged when 91st day is added.
90 days chosen specifically because: (a) enough history to feed future monthly summaries, (b) not so much that storage becomes a concern, (c) aligns with the 90-day Effort vs Results window.

Future weekly and monthly summaries will AGGREGATE from the daily records, not store separately. The 90-day daily archive is the foundation for all upstream summaries.

### 4.3 Display -- weekly grouping

The archive is displayed grouped by week. NOT a flat list of 90 rows.

Each week = one collapsible row showing:
- Week date range (e.g. "May 19 - May 25")
- Average composite score for the week (excluding excluded days)
- Average label for the week
- Small indicator showing how many days had scores vs total days

Tap week row to expand and see individual days within that week.
Each day row shows: date, composite score, label, three category score pills in compact form.
Tap individual day row to open that day's full summary (same modal as the morning pop-up, but triggered manually not automatically).

Week rows are sorted most recent first. Max 13 week rows for 90 days.

This grouping also serves as the placeholder structure for weekly summaries -- when that feature is built, the week header row becomes the weekly summary. No structural rebuild needed.

### 4.4 Calendar picker

Calendar picker available to jump to a specific date or week. Same visual pattern as existing date pickers in the app (month grid, today outlined, selected filled accent, non-future dates only).

Tapping a date in the calendar that has a score scrolls to and highlights that week group, then auto-expands it.

### 4.5 Empty state

If fewer than 1 full day of score data exists: empty state card with icon, "No summaries yet," subtitle explaining scores appear the morning after a logged day.

---

## 5. OUT OF SCOPE -- DO NOT BUILD IN THIS SESSION

The following are related but separate specs. Do not build them here even if they seem like natural extensions.

- **Smart Tips engine:** Separate spec required. Smart Tips reads from Day Score data among other sources. Day Score must ship first. Day Score is the foundation; Smart Tips is the layer on top.
- **Weekly summaries:** Separate feature. The archive grouping structure supports it but the weekly summary card itself is a future build.
- **Monthly summaries:** Same -- future build after weekly is done.
- **Deep-deficit nudge / low net detection:** Parked per roadmap. Do not build. Threshold research required first.
- **Faith Journey selector / Coaching Modes full differentiation:** Separate session.

---

## 6. DEPENDENCY MAP

Day Score cannot be built until:
1. `utils/goalHit.ts` exists and is confirmed working (from SPEC_calorie_goal_hit.md). The calorie sub-component of Nutrition depends on `evaluateCalorieGoalHit`.
2. Sleep score is reliably stored to `pj_YYYY-MM-DD` (confirmed fixed per roadmap Session 57/58).

Day Summary pop-up cannot be built until Day Score engine is confirmed working.
Stats archive cannot be built until pop-up is confirmed working.

Build order within this spec:
1. `utils/dayScore.ts` -- pure computation functions, no UI, no side effects.
2. Midnight / first-load compute hook -- reads yesterday's data, calls util, writes to storage.
3. Morning pop-up modal component.
4. Stats archive card and weekly grouping.

---

## 7. DATA AVAILABLE PER DAY (confirmed fields)

All from `pj_YYYY-MM-DD`:
- `entries[]` with `.cal`, `.protein`, `.carbs`, `.fat`, and extended nutrition fields
- `water` (oz)
- `weight` (lbs, manual entry, not always present)
- `steps` (from HealthKit)
- `activeCalories` and/or `caloriesBurned` (from HealthKit, pre-burn-accuracy -- must apply modifier)
- `sleepHours`, `sleepStages`, `sleepFeelRating`, `sleepBedTime`, `sleepWakeTime`
- Sleep score: currently computed on the fly from these fields. For Day Score purposes, read the computed score directly (same formula as index.tsx calcSleepScore -- the centralized version). If sleep score is eventually stored separately, read from storage.
- `workout checks` and exercise list from `pj_workout_state` (keyed by date)
- `excluded` flag
- Day type (lift/cardio/rest/unassigned) from `weeklyTemplate` in `pj_workout_state`

NOT always present: weight (only on weigh-in days), sleep (only if logged/synced), workout (only if exercises were logged), extended nutrition (only if FatSecret data was tracked).

---

## 8. VERIFIED SCENARIO -- TUESDAY MAY 26 2026

Justin's real data. Used to validate scoring math in spec session.

Inputs:
- Consumed: 1,822 kcal | calTarget: 1,642 | weightGoal: lose_1_5 (paceTarget: -750)
- Active cals (accuracy-adjusted at 80%): 763 kcal | activeCalGoal: 500
- BMR: 1,743 | Net: 1,822 - 763 - 1,743 = -684
- Way 2 hit condition: net <= -600 (paceTarget + 150). -684 <= -600 = HIT
- Protein: 78g | proteinGoal: 164g (40% of 1,642 / 4) | ratio: 47.6%
- Water: 128 oz | waterGoal: 100 oz | ratio: 128%
- Sleep score: 87 (Well Rested)
- Workout: 2/2 Cardio complete | burnAccuracy: 80%
- Day type: Cardio (workout day)

Nutrition score:
- Calorie: HIT = 55/55
- Protein: 28 * 0.476 = 13.3/28
- Water: capped at 17/17
- Nutrition total: 85.3/100

Activity score:
- Active cals: 763/500 = capped at 60/60
- Workout: 2/2 = 40/40
- Activity total: 100/100

Sleep score:
- Raw: 87 | Category: 50 + (87/100 * 50) = 93.5/100

Composite:
- Nutrition: 85.3 * 0.40 = 34.1
- Activity: 100 * 0.35 = 35.0
- Sleep: 93.5 * 0.25 = 23.4
- Total: 92.5 -- Label: EXCELLENT

Justin's gut check on this result: felt right. Strong day held back only by protein miss. Elite would require protein near target.

---

## 9. OPEN / ON THE FENCE ITEMS

These were discussed but not fully locked. Flag for design review before building:

1. **Calorie proximity miss denominator (500 kcal):** used in scenario math but not stress-tested. A miss of 500+ kcal = 0 calorie sub-component pts. May need tuning after real data.

2. **Calorie floor for Nutrition "has data" gate:** currently leaning toward any food entry = Nutrition has data. Could add 400 kcal floor (consistent with other app logic). Revisit after real-data testing.

3. **Archive limit (90 days):** chosen as reasonable starting point. Revisit once weekly/monthly summary scope is clearer. May want to align with whatever window those features need.

4. **Consecutive low-activity day flagging:** discussed but deferred to Smart Tips. Four rest days in a row does NOT tank Day Score -- it is a Smart Tips signal only. This is locked behavior for Day Score. Smart Tips spec must address it.

5. **Faith in score:** explicitly decided NO. Faith actions recognized via streaks/achievements only, not Day Score. Do not revisit.

6. **Video game cumulative XP number:** discussed and rejected for Day Score. Parked as potential future feature -- running lifetime total of all Day Score composites shown in profile or achievements. Not part of this spec.

---

## 10. SMART TIPS RELATIONSHIP (preview only, not spec)

Day Score is the foundation Smart Tips reads from. Specifically:

- Smart Tips can fire based on sub-component patterns (e.g. protein consistently below 50% for 5 days)
- Extended nutrition data (fiber, sodium, etc.) feeds Smart Tips not Day Score
- Consecutive low-activity days (4+ in a row) are a Smart Tips trigger, not a score component
- Effort vs Results = backward looking (here is what your data shows over a window)
- Day Score = daily snapshot (how was yesterday)
- Smart Tips = forward looking (here is what to do about the patterns in your scores)

Full Smart Tips spec is a separate thread. Day Score must be shipped and generating real data before Smart Tips can be meaningfully spec'd or built.
