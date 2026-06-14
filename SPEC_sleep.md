# SPEC_sleep.md
# Sleep Hub + Recovery Score
# Created: gym thread
# Status: IN PROGRESS -- decisions captured, full spec not yet complete

---

## 1. OVERVIEW

The Sleep Hub is a destination screen, not a detail sheet. It owns all sleep data and history the way the Log tab owns food. Tapping the sleep card on the home screen navigates here. It is the single source of truth for everything sleep and recovery in the app.

This spec defines the Sleep Hub screen and the Recovery Score -- a new metric that replaces the existing recovery subscore everywhere it currently appears in the app. The Sleep Score and Recovery Score are distinct metrics with distinct purposes, both surfaced on this screen.

---

## 2. THE TWO SCORES -- DECISIONS LOCKED

### 2.1 Sleep Score (existing, enriched)
- **What it measures:** How well did you sleep last night.
- **Inputs:** Duration, sleep stages (deep %, REM %, core %), awake time, bedtime consistency.
- **Status:** Already exists in utils/sleepScore.ts. Stage weight tuning not a priority -- good as-is. Worth a casual revisit after real usage data exists.
- **Decision:** Keep Sleep Score as its own metric. It feeds into Recovery Score as one input. Do NOT collapse them.

### 2.2 Recovery Score (new)
- **What it measures:** How ready is your body to perform today.
- **Inputs and weights (finalized -- full rationale and sourcing in Section 5):**

| Signal | Weight | Data Status |
|--------|--------|-------------|
| HRV vs personal 7-day baseline | 35% | Authorized, never queried -- needs EAS build |
| Sleep Score (last night) | 22% | Available today |
| RHR vs personal 7-day baseline | 18% | Available today |
| Previous day activity vs norm | 12% | Available today |
| Respiratory rate vs personal baseline | 8% | Available today |
| Activity balance (14-day vs 2-month) | 5% | Available today -- low priority, defer to v2 |
| SpO2 | display only | Available today -- excluded from formula, too noisy |

- **Baseline logic (critical):** Recovery Score is NOT based on population averages. Every signal is compared to the user's own rolling baseline (7-day moving average). A HRV of 45ms for someone whose baseline is 40ms is a good day. Same HRV for someone whose baseline is 70ms is a bad day.
- **Activity logic:** Activity is a full weighted input split into two signals (Oura model), NOT a post-hoc modifier. Both over-training AND under-activity hurt the score. See Section 5.3 for full detail.
- **EAS build dependency:** HRV query must be wired in useHealthKit.ts. This requires a new EAS build. Confirmed acceptable.

### 2.3 Why they are different -- copy for in-app tooltip
Sleep Score = how well you slept. Recovery Score = how ready your body is today.
You can sleep 8 hours and still have a low Recovery if your HRV is suppressed from yesterday's workout. That gap is the signal.

### 2.4 Naming -- DECISION LOCKED
Lean into the distinction, do not rename or collapse. Both scores shown on the Sleep Hub clearly with one-line context labels under each.

---

## 3. SCREEN ARCHITECTURE -- DECISIONS LOCKED

### 3.1 Entry point
- Tap sleep card on home screen → navigates to Sleep Hub (new screen: app/sleep-hub.tsx or app/sleep.tsx -- filename TBD, VS Claude to decide)
- Secondary entry point: Reports section when that ships. Not a Sleep Hub build blocker.

### 3.2 Primary job of the screen
Trend-focused destination screen. Not a modal or detail sheet. Owns all sleep and recovery data the way the Log tab owns food.

### 3.3 Tab structure -- DECISION LOCKED
Two inline tabs at the top of the screen. Pill selector style, consistent with other tab selectors in the app.
- **Tab 1: Sleep** -- default landing tab
- **Tab 2: Recovery** -- second tab

Each tab scrolls independently. Mirrors Oura's Sleep / Readiness tab pattern.

---

### 3.4 SLEEP TAB sections (draft -- layout TBD in design session)

**A. Sleep Score hero**
- Large score number (0-100) + grade label
- Stage breakdown: Deep, REM, Core, Awake -- segmented bar and/or donut
- Bedtime + wake time
- Total duration vs goal

**B. Sleep trend graph**
- 7-day default, 30-day available via toggle
- Primary line: Sleep Score
- Secondary data: duration bars underneath or overlaid
- Animated per animation standard

**C. Sleep stage history**
- Per-night stacked bar chart for the selected range
- One bar per night, Deep/REM/Core/Awake stacked in color segments
- Shows total duration and stage split simultaneously

**D. Sleep metrics panel**
- Wake event count (discrete awake periods, derived from raw sleep samples -- not just total awake ms)
- Bedtime consistency (std deviation of bed times over selected range)
- Avg deep % over range
- Avg REM % over range

**E. Sleep Coach tip**
- Smart Coach Family 4 delivery surface (per SMART_COACH_SPEC.md)
- More detailed than the home card tip -- full observation + consequence copy
- References user's actual numbers (specific deep sleep duration, personal averages, actual bedtime vs best nights)
- Mode-aware: Mindful suppresses corrective tips unless "Include growth areas" is enabled

**F. Exclude day toggle**
- Same exclude mechanic as Day Detail
- Toggle lives here on Sleep tab only
- Excluded days drop out of trend calculations on BOTH tabs -- Sleep and Recovery. VS Claude: exclusion state must be shared across both tabs, not scoped to Sleep tab only.

---

### 3.5 RECOVERY TAB sections (draft -- layout TBD in design session)

**A. Recovery Score hero**
- Large score number (0-100), color-coded zone (green/yellow/red)
- One-line readiness label ("Ready to perform" / "Moderate readiness" / "Prioritize rest")
- Score component breakdown -- all 6 formula contributors shown as rows with value + up/down indicator vs baseline
- SpO2 shown as a display row below contributors, clearly labeled as informational only

**B. Recovery trend graph**
- 7-day default, 30-day available via toggle
- Primary line: Recovery Score over time
- Animated per animation standard

**C. Key signals panel**
- HRV (nightly, vs baseline, trend arrow)
- RHR (vs baseline, trend arrow)
- Respiratory rate (vs baseline, trend arrow)
- SpO2 (display only, no baseline comparison)
- Previous day active calories vs norm

**D. Recovery Coach tip**
- Distinct from Sleep tab coach tip -- focused on readiness signals, not sleep quality
- Same Smart Coach Family 4 sourcing, different angle
- Mode-aware: same Mindful rules apply

---

## 4. DATA REQUIREMENTS

### 4.1 Currently available from HealthKit (useHealthKit.ts)
- Sleep stages: core (value 3), deep (value 4), REM (value 5), awake (value 2) -- in ms
- Bedtime + wake time (derived from earliest/latest sleep sample timestamps)
- Resting HR (getMostRecentQuantitySample)
- Respiratory rate (getMostRecentQuantitySample)
- SpO2 / blood oxygen (getMostRecentQuantitySample)
- VO2 Max (getMostRecentQuantitySample)
- Cardio recovery / HRR (getMostRecentQuantitySample)

### 4.2 Needs to be wired (new EAS build required)
- HRV (HKQuantityTypeIdentifierHeartRateVariabilitySDNN) -- permission already requested, never queried
- Heart rate during sleep window -- need to scope the existing HR query to the sleep window timestamps, not just "today"
- Wake event count -- raw sleep samples already fetched, just need to count discrete value=2 events instead of summing ms

### 4.3 Historical data for trends
- Current useHealthKit only pulls last night's sleep. Sleep Hub needs multi-night history.
- New function needed: fetchSleepHistory(days: number) -- queryCategorySamples over a rolling window
- Same for RHR, resp rate, SpO2, active calories historical -- need per-day history not just most recent
- Baseline calculation: 7-day rolling average stored or computed on fetch for each signal

### 4.4 Data we cannot get (no hardware)
- Skin/body temperature -- requires dedicated sensor (Oura ring, Whoop). Not available from HealthKit on most iPhones. Sleep Score weighted slightly higher in formula to compensate.

---

## 5. RECOVERY SCORE FORMULA

### 5.1 Design source
The formula architecture is directly modeled on Oura's Readiness Score system, documented in Oura's public support articles and developer documentation (support.ouraring.com/hc/en-us/articles/360057791533). Key principles taken from Oura:
- Every signal is compared to the user's personal rolling baseline, not population averages
- Activity is a full weighted input (not a post-hoc modifier), split into two signals: previous day activity and longer-term activity balance -- both can hurt the score in either direction (too much OR too little)
- Short-term and long-term windows are used together to catch both acute strain and chronic overtraining/undertraining
- Whoop's published research (developer.whoop.com, WHOOP Podcast episodes 040 and 084) confirmed HRV as the dominant signal carrying the most predictive weight, with respiratory rate added after analyzing millions of data points where it caught performance differences the older model missed

### 5.2 Formula

```
recoveryScore = (
  hrvScore        * 0.35 +
  sleepScore      * 0.22 +
  rhrScore        * 0.18 +
  prevDayActivity * 0.12 +
  respRateScore   * 0.08 +
  activityBalance * 0.05
)
```

### 5.3 Signal definitions and weights

**HRV -- 35%**
Heart rate variability (HKQuantityTypeIdentifierHeartRateVariabilitySDNN), measured overnight during sleep window.
Dominant signal per Whoop's published algorithm research. Carries the most predictive value for next-day readiness. Compared to user's personal 7-day rolling baseline. Higher than baseline = better recovered. Lower than baseline = suppressed autonomic function.
Source: Whoop Podcast ep. 040 -- Capodilupo states HRV carries most of the predictive value; RHR and sleep contribute but overlap significantly with what HRV already captures.

**Sleep Score -- 22%**
The app's existing Sleep Score (utils/sleepScore.ts), which already factors in duration, deep %, REM %, core %, awake time, and bedtime consistency.
Bedtime consistency is NOT added separately here -- it is already baked into Sleep Score. Adding it again would be double-counting.
Sleep Score is used as the sleep input rather than raw duration vs goal because it captures richer signal (stages, consistency) not just hours.
Weighted slightly higher than in a full Oura/Whoop setup to compensate for the absence of body temperature data, which we cannot obtain from HealthKit (requires dedicated hardware sensor).

**RHR -- 18%**
Resting heart rate (HKQuantityTypeIdentifierRestingHeartRate), lowest reading from overnight sleep window.
Compared to user's 7-day rolling baseline. Elevated RHR relative to baseline signals physiological stress, illness, or inadequate recovery.
Source: Oura uses lowest overnight RHR as a direct Readiness contributor.

**Previous Day Activity -- 12%**
Yesterday's active calories (HKQuantityTypeIdentifierActiveEnergyBurned) compared to user's 7-day average.
This is a two-sided signal -- both over-training AND under-activity hurt the score.
- Significantly above norm = body under strain, recovery score pulled down
- Significantly below norm = deconditioning signal, recovery score also pulled down
- Near norm = neutral, no meaningful impact
Source: Oura "Previous Day Activity" contributor, directly documented: "Your Readiness Score will decrease if you were inactive during the previous day... This contributor will also decrease if heavy activity places too much strain on your body."

**Respiratory Rate -- 8%**
Overnight respiratory rate (HKQuantityTypeIdentifierRespiratoryRate) compared to user's 7-day baseline.
Elevated respiratory rate is an early warning signal for illness onset, overtraining, and systemic stress.
Source: Whoop added respiratory rate after analyzing several million days of data and finding it explained performance differences the HRV + RHR model missed (Whoop Podcast ep. 084).

**Activity Balance -- 5%**
14-day rolling average of active calories compared to user's 2-month baseline. Catches chronic overtraining or undertraining that single-day previous activity misses.
Source: Oura "Activity Balance" contributor -- uses 14-day weighted average vs long-term average, with past 2-5 days weighted more heavily.
Build note: This is the lowest-priority signal to implement. Version 1 of Recovery Score can ship with Previous Day Activity carrying the full 17% activity weight (prevDayActivity * 0.17, activityBalance dropped) until historical baseline data is sufficient to calculate Activity Balance reliably.

**SpO2 -- display only, not in formula**
Blood oxygen (HKQuantityTypeIdentifierOxygenSaturation) shown on the Sleep Hub metrics panel but excluded from the Recovery Score calculation.
Rationale: SpO2 from Apple Watch/iPhone is noisy and sits at 97-99% for most healthy users with minimal day-to-day variance. It provides almost no signal in the recovery formula for healthy individuals and could introduce noise. It is a useful illness/apnea detection signal when it drops meaningfully (below ~95%) but that edge case does not justify weighting it in the daily formula. Surfaced as a display metric so users can see it and flag anomalies manually.

### 5.4 Baseline comparison model
Each signal produces a component score (0-100) based on deviation from the user's personal rolling baseline:
- At baseline = 75 points (neutral, healthy variance expected)
- Meaningfully better than baseline = scales toward 100
- Meaningfully worse than baseline = scales toward 0
- Exact scaling curves (linear vs sigmoid) TBD in dedicated formula refinement session before build

### 5.5 Minimum data gate
If HRV data is unavailable (new user, no Apple Watch, insufficient history):
- Fall back to 3-signal formula: RHR 40%, Sleep Score 40%, Resp Rate 20%
- Surface a "Limited data" label on the Recovery Score so the user understands the score is partial
- Do not silently produce a full-looking score on incomplete data

### 5.6 Activity overlap with Day Score -- DECISION NOTED
Recovery Score includes previous day activity as a weighted input (12%). The Day Score already has a separate Activity subscore. This means activity influences both the Activity subscore and the Recovery subscore of the same Day Score.
This is intentional and correct. The Activity subscore grades performance (did you hit your goals). Recovery Score uses activity as physiological context (did yesterday's load affect your readiness today). They're answering different questions with the same underlying data -- not double-counting.
Real-world behavior: a brutal workout day scores high on Activity AND may drag Recovery down. That's the right and honest story -- your body performed well and now needs rest.
Justin's call: leave it as is. The overlap is acceptable and actually more accurate than before.

---

## 6. VISUAL DIRECTION (TBD -- design session required before build)

General feel: data-dense but digestible. Clinical precision, not wellness-soft. Every number has a home, whitespace is intentional. Must feel like a natural extension of the app -- all colors via theme tokens, accent color drives interactive elements. No hardcoded dark colors.

**Recovery Score hero (TBD)**
- Large Bebas Neue score number, same treatment as Day Score
- Number color reflects zone status (green/amber/red using existing muted system colors)
- One-line readiness label in small uppercase DMSans -- LOCKED: three tiers, PRIMED (green) / STEADY (amber) / RECOVER (red), tied to the color zones below
- No radial glow or tinted background -- skip the effect, score number is strong enough on its own and glow doesn't work across all themes

**Signal component rows (TBD)**
- Compact rows: signal name left, value center, trend arrow + vs-baseline delta right
- Subtle left border per row colored to signal status (green/amber/red)
- Lets the eye triage without reading every number

**Tab selector (TBD)**
- Pill style, accent color on active tab
- Same pattern as other selectors in the app, nothing new to invent

**Trend graph (TBD)**
- Accent-colored primary line, subtle grid, minimal chart junk
- Duration bars underneath in muted fill
- Fully token-based, no hardcoded colors

**Sleep stage stacked bars (LOCKED 2026-06-12 -- CORRECTED)**
- Stage colors REUSE the existing per-theme theme tokens the home SleepDonut already uses: sleepCore / sleepDeep / sleepRem. Do NOT invent fixed hexes -- the earlier "soft purple / muted blue" values in this spec were placeholder TBD guesses written before the theme system was checked; they conflicted with the live donut (Core=blue, Deep=purple, REM=green) and are dropped.
- Awake: new per-theme token sleepAwake added to theme.tsx (muted red, tuned per theme). The donut never showed Awake; the Sleep Hub stage bars do.
- Net rule: whatever colors the home donut shows, the Sleep Hub shows. Consistency by construction, theme-correct automatically.

**General (TBD)**
- All colors via theme tokens, never hardcoded hex
- Card spec applies throughout: bgCard background, 0.5 border, borderRadius 14, padding 16
- Full theme audit required before ship: all 5 themes x all accent options

---

## 7. MINDFUL MODE BEHAVIOR -- DECISION REQUIRED AT BUILD TIME

Sleep and recovery are less emotionally charged than weight or calories but the coach tip on this screen still needs a Mindful behavior defined before shipping.

Proposed: Same pattern as rest of app.
- Default Mindful: Sleep Coach tip shown but corrective observations suppressed. Positive observations and factual summaries always shown.
- Mindful with "Include growth areas" enabled: full tip copy shown.
- Recovery Score number always shown in all modes (it is data, not a judgment).

---

## 8. RESOLVED DECISIONS LOG

1. Recovery Score replaces existing recovery subscore app-wide -- Day Summary, weekly summary, monthly summary, EvR, Stats, all future surfaces. No coexistence. One number, one source of truth. VS Claude: audit every screen that currently surfaces a recovery metric and wire it to Recovery Score. Day Summary Recovery card headline becomes the Recovery Score (0-100) with a "View in Sleep Hub" link.

2. Trend default view: 7-day default, 30-day available via toggle. Matches Oura and Whoop. Right view for morning use.

3. Sleep stage history: stacked bar chart. One bar per night, Deep/REM/Core/Awake stacked in color segments. Shows total duration and stage split simultaneously.

4. Stats tab access: primary entry point is home sleep card. Secondary entry point to be added in Reports section when that ships. Not a Sleep Hub build blocker.

5. Recovery Score color zones: define our own -- do NOT use Whoop thresholds (green 67-100 / yellow 34-66 / red 0-33). Whoop thresholds don't map to our formula's distribution. With baseline neutral at 75, most days will cluster 60-85 and red at 33 would almost never fire. Thresholds TBD after first build and real data testing. VS Claude: ship with placeholder zones, tune after.

6. Sleep Score stage weight tuning: not a priority. Good as-is. Worth a casual revisit after real usage data exists but not a blocker for anything.

7. HRV canonical daily value (LOCKED 2026-06-12): one number per night = the average of all HRV (SDNN) samples inside the sleep window (Oura whole-night model). Computed once, stored per-day, reused on every surface so they always agree. Whoop's deep-sleep-weighted variant is a possible v2 refinement. Recovery Score compares last night's value to the user's 7-day rolling baseline. HRV query is wired + verified on device 2026-06-12 (currently a most-recent placeholder returning a single daytime/overnight sample; sleep-window averaging still to build).

8. Where HRV surfaces (LOCKED 2026-06-12): (a) Recovery Score calculation (primary use); (b) Sleep Hub Recovery tab Key Signals panel (value + baseline delta + trend arrow); (c) Stats graph creator as a new "Sleep & Recovery" data key (joins the existing restingHR / respiratoryRate / bloodOxygen keys -- HRV and VO2 Max are the current gaps). On the Day / Weekly / Monthly summary Recovery cards, HRV DOES appear as a supporting row beneath the Recovery Score headline, alongside the other relevant contributors (Sleep, Resting HR, Resp Rate, etc.) -- consistent with how those cards already list supporting metrics today. Anything relevant to the score is shown as a supporting row. The summaries show the Recovery Score as the headline plus these key supporting numbers; the FULL breakdown (per-signal baseline deltas, trend arrows, all six contributors) lives in the Sleep Hub, not the summaries.

9. Summary-card transformation (LOCKED 2026-06-12): the current "Recovery" subscore is literally just the Sleep Score (dayScore.ts weights sleep: 0.25; the RHR/RespRate/VO2 shown on the cards are decoration, not scored). When Recovery Score ships, the 25% category becomes the new 6-signal Recovery Score, with Sleep Score demoted to one 22% input. Update Day Summary, Weekly Summary, Monthly Summary, EvR, and dayScore.ts. Recovery card headline becomes the Recovery Score plus a "View in Sleep Hub" link.

10. Historical handling (LOCKED 2026-06-12: FREEZE + GOING FORWARD): Recovery Score applies only from when its data (especially HRV) is available, going forward. Historical Day Scores keep their existing sleep-based recovery subscore -- no retroactive recompute. Mirrors the burnAccuracy / goalSnapshot freeze pattern; protects historical consistency.

11. DESIGN SESSION LOCKS (LOCKED 2026-06-12): the remaining Section 6 TBDs closed so build can start.
    - **Filename / route:** app/sleep.tsx (clean /sleep route). Home sleep card navigates here.
    - **Sleep tab layout (top->bottom):** Sleep Score hero (score + grade, stage breakdown bar, bedtime/wake, duration vs goal) -> Sleep trend graph (7d default, 30d toggle) -> Sleep stage history stacked bars -> Sleep metrics panel (wake events, bedtime consistency, avg deep %, avg REM %) -> Sleep Coach tip -> Exclude day toggle (bottom).
    - **Recovery tab layout (top->bottom):** Recovery Score hero (score + readiness label + 6 contributor rows w/ baseline deltas, SpO2 display row below) -> Recovery trend graph -> Key signals panel (HRV, RHR, resp rate, SpO2, prev-day active cal) -> Recovery Coach tip.
    - **Stage colors:** REUSE existing per-theme tokens sleepCore/sleepDeep/sleepRem (same as home donut: Core=blue, Deep=purple, REM=green). Added new per-theme sleepAwake token (muted red) to theme.tsx. No fixed hexes -- the earlier fixed values were bogus placeholder TBDs and are dropped.
    - **Readiness labels:** PRIMED / STEADY / RECOVER (3 tiers, tied to zones).
    - **Baseline scaling curve (placeholder):** linear + clamped. Baseline = 75 pts, scales to 100 at a meaningful positive deviation, 0 at a meaningful negative one, per-signal window. Sigmoid is a post-data refinement.
    - **Recovery color zones (placeholder):** green >= 70, amber 55-69, red < 55. Tune after first real data.
    - **Mindful:** Section 7 confirmed as written. Tip shown, corrective observations suppressed unless "Include growth areas" on; score number always shown.
    - **v1 scope:** Activity Balance (5%) dropped for v1; its weight folds into Previous Day Activity -> prevDayActivity * 0.17.
    - **Build order:** Sleep tab first (data available today), Recovery tab second.

---

## 9. DEPENDENCIES

- HRV HealthKit query -- new code in useHealthKit.ts + new EAS build
- fetchSleepHistory() function -- new HealthKit query function
- Historical per-day data for RHR, resp rate, SpO2, active calories
- utils/recoveryScore.ts -- new file
- Rolling baseline storage -- either computed fresh on fetch or persisted in AsyncStorage
- Smart Coach Family 4 tip delivery wired to both tabs (per SMART_COACH_SPEC.md)
- Recovery Score wired into Day Summary, weekly summary, monthly summary, EvR, Stats -- full audit pass required

---

## 10. ROADMAP STATUS

- Promoted from Backlog to SOON during the gym thread
- Design session DONE 2026-06-12 (see Decisions Log #11). All Section 6 TBDs closed.
- HRV wiring DONE + verified on device; EAS build LANDED.
- BUILD IN PROGRESS: Sleep tab first, then Recovery tab.

---

## 11. SLEEP METRICS BASELINES + PREMIUM CARD (LOCKED 2026-06-13)

Design session for the Sleep Metrics panel rebuild. Replaces the static "Healthy 13 to 23%" population reference subs with the user's own rolling baselines, and rebuilds the panel as a premium Oura/Whoop-style card with per-row indicator bars.

### 11.1 Baseline model -- DECISIONS LOCKED
- **Baseline window = the user's last 30 synced HealthKit nights, always.** The 7D / 30D toggle is a VIEWING window for the charts and the displayed metric values only. It does NOT change the baseline. The baseline is always your last 30 days. (Justin: "still be able to see 7d or 30d or whatever window, but the baseline we compare it to is 30 days. The 7d option isn't for comparing, it's for seeing the data visually.")
- Three baselines computed from those 30 nights (excluded nights removed first): avg deep %, avg REM %, avg bedtime (minutes-of-day), plus avg wake events.
- **Data gate:** baselines require >= 7 stage nights in the 30d window. Below that, rows fall back to the old static healthy-range reference ("Healthy 13 to 23%", "Healthy 20 to 25%") so nothing is ever blank or misleading.
- Computed fresh on load from a dedicated 30-night fetch. No AsyncStorage writes, no second source of truth. Pure JS, no rebuild.
- Implementation note: a separate `fetchSleepHistory(30)` call backs the baseline so the existing range-driven chart fetch is left untouched (no risk to the trend/stage charts). Excludes are loaded for the 30d set too.

### 11.2 The word "baseline" is shown
Each Deep/REM row sub reads `baseline 20%` so the user knows exactly what the comparison is. Not a hidden mechanic.

### 11.3 Premium card -- DIVERGING BARS (LOCKED 2026-06-13, after device iteration)
The first attempt (dot-on-zone tracks, then plain left-fill bars) read as vague pastel sliders -- a marker on a track with no axis means nothing. Final design, locked after several device passes: **every bar is a DIVERGING bar with a labeled axis**, except bedtime which is a clock-window bar. One consistent visual language across the whole card.

Each row: small Ionicon left, value right (colored by status), the bar under it, then `left / center / right` axis labels under the bar (this is the "more hashes / numbers on the bar" Justin asked for -- a real axis, not a lone unlabeled tick).

**Diverging bar** (deep, REM, sleep balance, wake events): a center reference hash (your baseline / your goal / your average). The fill grows OUT from the center -- right when you're above the reference, left when below. Color carries good/bad. Axis labeled at both ends + the center.

| Row | Center reference | Right side | Left side | Window |
|-----|-----------------|-----------|-----------|--------|
| Avg deep sleep | your baseline deep % | above baseline | below baseline | fixed +/-10pp, pegs past it |
| Avg REM sleep | your baseline REM % | above | below | fixed +/-10pp |
| Sleep balance | goal (0) | surplus (green) | deficit (red) | symmetric +/-X h, auto-scaled to the gap |
| Wake events | your avg wake count | more wakes (worse) | fewer (better) | base +/- max(base,4). NOTE: good side is LEFT here (fewer is better) -- color still carries meaning |

NOTE on deep/REM: the bar POSITION shows you vs your baseline, but the COLOR is driven by the healthy range (see 11.4), not the baseline direction. So you can sit a touch left of your baseline tick and still be green (in healthy range), or right of it and amber (too high). Position and color answer different questions and that's intentional.

NOTE on timeframe: the deep/REM rows are **averages over the viewed range**, hence the "Avg" label -- NOT last night. The Sleep Score hero at the top of the screen is LAST NIGHT. They can legitimately disagree (last night 95 / 16% deep, while your weekly avg deep is 12% and low). Dropping "Avg" in an earlier build made this look like a bug; the label is load-bearing, keep it.

**Bedtime** = range bar: the bar spans your **actual bedtime range, 10th-90th percentile** of your last 30 nights (percentile, not raw min/max, so one 2 AM night doesn't blow it open). Left end = your early bedtime, right end = your late one (both labeled with real clock times), dot = your typical (median) -- the dot's offset shows whether you skew early or late within your range. Colored by consistency (SD). Value = typical bedtime; caption = `Consistent` / `Mostly steady` / `Variable`. Tradeoff accepted: when the ends ARE your real times, the bar reads "full," so consistency comes through the colored word + how close the two end-times are, not bar width. Always uses 30d data, independent of the 7/30 toggle.

### 11.4 Color logic (placeholder thresholds, tune after real data)
- **Deep / REM:** driven by the MEDICAL healthy range (deep 13-23%, REM 20-25%). In range = green; below range (too little) OR above range (too much) = amber, with a caption saying which (`Below healthy 13 to 23%` / `Above healthy 13 to 23%`). The personal baseline is the bar's center reference only -- it does NOT drive color. (The earlier baseline-direction coloring had no upper guardrail, so an abnormally high 30% deep would have read green just for being above baseline -- wrong.)
- **Bedtime:** green if spread (SD) <= 30m; amber <= 60m; red above.
- **Sleep balance:** green if surplus or on goal; deficit amber if avg nightly shortfall < half the goal, red above.
- **Wake events:** green if count <= avg + 1; amber <= avg + 3; red above. Fallback (no baseline): centered on ~3, 0-2 green / 3-4 amber / 5+ red.

### 11.5 Copy / layout cleanups
- Killed jargon `±14m from 9:33 PM` -- the clock-window band carries consistency visually.
- Sleep debt -> renamed **Sleep balance**; value always a real number, both directions: `2h 10m surplus` (green) / `3h 15m deficit` (red) / `On goal`. No more bare "Caught up"/"On track".
- No right-column sub-values: every secondary number lives UNDER its bar (axis labels) or as one small left caption. The right side of each row is the single headline value only.
- Capitalization rule: standalone labels capitalized (`Baseline`, `Consistent`, `On goal`, `Avg 3`, `Goal`); trailing descriptors after a number stay lowercase (`2h 10m surplus`, `8m awake`).

### 11.6 Bars animate
Per the animation standard, each bar's marker/fill/band animates into position on screen entry (Reanimated, keyed to focus refresh).

### 11.7 Related: Sleep Score Trend y-axis auto-scale (LOCKED 2026-06-13)
Separate but shipped in the same pass. The Sleep Score Trend chart currently hardcodes a 0-100 y-axis, so the line looks flat. Match the Stats graph-creator behavior: auto-scale the y-axis to the data's min/max (via the same `niceYTicks` nice-number algorithm), so the line fills the card and variation is readable. Sleep Score Trend first; Recovery trend chart can follow if it lands.

### 11.8 Mindful
Metrics panel is factual data, shown in all modes. No corrective language lives here (the coach tip owns that). No Mindful-specific changes needed.

## 12. RECOVERY HOME CARD (PROPOSED 2026-06-14 -- design not yet locked)

Idea raised by Justin: the home screen has a Sleep card but no Recovery presence. Add a Recovery home card so the daily Recovery Score surfaces without opening the hub, and keep it visually/conceptually paired with the Sleep card.

### 12.1 Core concept
- Same card chrome/treatment as the home Sleep card (so they read as a matched pair).
- Single card SLOT that cycles between a Sleep face and a Recovery face on a timed auto-scroll (e.g. every N seconds), so both are always represented without taking two card slots. The two stay "linked up" -- one home tile, two faces.
- Manual swipe between faces should also work; auto-cycle pauses on manual interaction (standard carousel behavior).
- Tapping either face routes into the Sleep & Recovery hub on the matching tab (Sleep face -> Sleep tab, Recovery face -> Recovery tab).

### 12.2 Open decisions (NOT locked -- design session needed)
- Auto-cycle interval + whether it's user-configurable.
- Whether it's one combined tile (carousel) or two separate stacked cards the user can reorder. Justin's lean: one linked tile that scrolls.
- Recovery face contents: score + label + 1-2 top drivers? Or just score + readiness word to stay light?
- Card-order / visibility integration with the existing home edit-layout system (pj_settings cardOrder / cardVisible).
- Empty/limited states: no HRV yet, no recovery score yet (first day), manual-only sleep users.
- Mindful behavior: Recovery Score still shown (per Decision in Section 7), but readiness framing/coach language softened; confirm at build time.
- Accessibility: an auto-scrolling tile must not trap focus or fight the page scroll (mirror the hypnogram pan-vs-scroll lesson).

### 12.3 Status
Parked at top of roadmap as a [HIGH] follow-up. Build only after the Recovery tab itself is polished (trend auto-scale, baseline-labeled deltas + universal range toggle, burn-accuracy fix).
