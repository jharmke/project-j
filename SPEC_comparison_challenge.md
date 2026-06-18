# SPEC — Comparison Report (#6) + Challenge System (#7)

Status: DESIGN LOCKED 2026-06-18. No code written yet. This doc is the source of truth for both builds.
Both features were designed together in one session because they share a core engine (metrics, daily-average aggregation, no-buffer tie / closest-to-target logic).

Philosophy line between the two:
- #6 Comparison Report = REFLECT. Just data. No winner, no scoreboard, no coaching.
- #7 Challenge System = COMPETE. Winning is the point. Win/lose, progress, celebration.

---

# PART 1 — COMPARISON REPORT (#6)

## What it is / what it replaces
Replaces `head-to-head.tsx` (deleted) and the You-vs-Yesterday (YvY) home card. Treated as building new, not editing.
NOTE: the YvY home card LAYOUT is repurposed by #7 (the challenge card), so YvY is not deleted in #6 — only `head-to-head.tsx` (the screen) is deleted in #6. YvY card + `pj_vs_streak` are retired in #7 when the layout is converted.

Pick two matched-length durations, side-by-side per metric, the stronger value highlighted, no scoring/coaching, exportable.

## Period model (LOCKED)
- PRESETS (the primary path, one tap each): This week vs Last week | This month vs Last month | Last 7 days vs Previous 7 | Last 30 days vs Previous 30.
- DAY VS DAY: kept (it is the length-1 case). Reuses the existing two-date-picker pattern. PRO-gated (see Free/Pro).
- All comparisons are MATCHED-LENGTH by construction (presets define length; day-vs-day is 1 day each side).
- Custom multi-day/week anchors (two independent free-placed anchors): PINNED to backlog (the expensive two-anchor case).

## Aggregation (LOCKED — honesty critical)
- Each metric on a multi-day side collapses to a DAILY AVERAGE (not total). Reads as habit ("avg 9,200 steps/day"), survives a missing day, stays meaningful at any length.
- MISSING DATA: average over only the days that actually have data FOR THAT METRIC. Per-metric denominator. Counting an unlogged day as 0 would be a lie (says you ate 0 cals / drank 0 oz). HealthKit metrics (steps/active/sleep) usually present even on un-opened days = real data; food metrics (net cals/protein/water) on a no-log day = genuinely absent = excluded from the average.
- EXCLUDED DAYS (`pj_<date>.excluded`): dropped from BOTH numerator and denominator, consistent with Day Score / EvR / streaks.
- Each metric row shows its own day count ("5 of 7 days"). Because denominators are per-metric, steps may span 7 days while protein spans 5 on the same side — that is the honest version; there is intentionally no single period-wide day count.

## Transparency layer (LOCKED — Build Standards)
1. Per-row day count on every metric row.
2. One-line clarity note near top: averages use only days with logged data, excluded days removed, so metrics can span different day counts.
3. Inline micro disclaimer: "For informational purposes only. Not medical advice."
4. ONE (i) tooltip carrying full methodology (averaging over logged days, excluded dropped, how the stronger value is chosen, no-buffer tie). New `tooltipRegistry.ts` entry + matching tutorial step (keep in lockstep).
- NO first-use modal (it re-displays your own logged numbers, does not generate a score/recommendation; inline disclaimer + tooltip is the right weight).

## Weight metric (LOCKED)
- Weight = NET CHANGE across the period (first weigh-in to last within each side), NOT average weigh-in. Answers "did I make progress."
- Stronger side = bigger change in the user's goal direction (lose goal -> bigger drop; gain goal -> bigger gain). Reuses H2H goal-direction logic.
- Needs >= 2 weigh-ins in a period to compute; a side with fewer shows "not enough data" on that row (correct, not a failure).

## No scoreboard (LOCKED)
- KILLED from H2H: the overall win/loss tally, the composite W-L record, and the YvY streak (`pj_vs_streak`).
- KEPT: per-metric highlight only. On each row the STRONGER value gets an accent-color highlight; the other value stays normal text.
- NO red on the lower value, in ANY mode. Not coloring one side "bad." Accent-on-stronger, neutral on the other. This is what makes it factual not judgmental.
- No "Side A led on X of Y" summary line either (that is a soft scoreboard; deliberately omitted; trivial to add later if the report feels flat).

## Metrics (LOCKED)
Fixed set of 7, in order: Net Cals (closest-to-pace wins) | Protein (higher) | Steps (higher) | Active Cals (higher) | Water (higher) | Sleep Score (higher; falls back to sleep duration on watch-off nights like H2H) | Weight (net change, goal-direction).
- Fixed (not user-selectable) for v1.
- BACKLOG: user-customizable metric selection + add Carbs + Fat as their own rows (would bring to 9, the point a picker earns its keep).

## Winner direction logic (inherits H2H, LOCKED)
Net cals = closest to pace target (GOAL_DEFICITS), no 25-kcal buffer (exact equality = tie, else closer-to-target wins). Steps/water/protein/active/sleep = higher wins, exact equality = tie. Weight = bigger net change in goal direction. This is the no-buffer rule from the [BUG] roadmap entry, carried forward.

## Placement / entry (LOCKED)
- Lives as a card INSIDE the existing Stats > Reports section (subtitle "Summaries and Effort vs. Results"). NOT a new Reports tab.
- Order within Reports: EvR -> COMPARISON -> Day Summaries -> Weekly -> Monthly. (Group the two interactive launch tools above the three passive archives.)
- COLLAPSE DEFAULT CHANGE: all Reports cards collapse by default EXCEPT EvR. Flip `daySummariesOpen` / `weeklyCardOpen` / `monthlyCardOpen` initial state from true -> false; new comparison card starts false; `evrCardOpen` stays true. (stats.tsx ~262-271.)
- Name: "Comparison Report". Card label `COMPARISON` (uppercase, matches EFFORT VS RESULTS style).
- It is a LAUNCH card like EvR (button -> screen), NOT an archive. Button text: "New Comparison".
- FAB: the currently-disabled "Add Report" item (stats.tsx ~2574, "Coming soon", 0.5 opacity) gets WOKEN -> opens the same comparison screen. No nested-preset FAB.

## Screen layout (LOCKED)
ONE screen (not a setup wizard + separate result). Top = selector (preset chips + a "Day vs Day" option that reveals two inline date pickers for Pro). Below = the live comparison table that updates the instant a preset is tapped. Export button (Pro). Both the launch card and the FAB land here.

## Save model (LOCKED)
- LIVE tool. No saved-report archive. The Comparison Report costs NOTHING to generate (pure local math reading `pj_<date>` keys + averaging — NO AI, unlike EvR which is why EvR has its 3/month cap). So no generation limit and no archive needed for cost reasons.
- Presets are relative ("this week" drifts), so saving them would rot; everything is instantly recomputable.
- LAST-VIEW PERSISTENCE: remember the last comparison config (which preset / which two days — a tiny value, not the computed numbers) so reopening restores it instantly. Solves "took a call, came back" without an archive. Recompute is instant.
- EXPORT is the "save" — keep/share a comparison by exporting it.

## Free / Pro (LOCKED)
- FREE: all 4 presets, view only. NO day-vs-day. NO export.
- PRO: the 4 presets + day-vs-day picker + image export (+ future custom anchors when unpinned).
- NO row gating either tier — everyone sees all 7 metrics.
- (Generation is free local math, so the lever is NOT report count — it is day-vs-day + export.)

## Export (LOCKED)
- A DESIGNED, BRANDED shareable IMAGE (not a screenshot, not a PDF).
- Tech: add `react-native-view-shot` (snapshot a dedicated export view to PNG) + share. NEW NATIVE DEP = needs ONE new EAS dev build (only non-pure-JS piece of either feature).
- Why image not PDF: industry standard for fitness sharing (Strava/Whoop/Oura) is image cards; image is also LESS work (design the card once in RN and snapshot it; PDF would mean a second HTML template kept in sync forever).
- Export card design: FIXED branded look (not theme-inheriting, like Whoop/Oura share cards). Logo lockup at top (we have no app name yet — use the logo; swap wordmark once name lands), the two period labels as header, the 7 metric rows with both values + accent highlight, per-row day counts, micro disclaimer footer, generated date. The on-screen UI is for reading; the export card is a separate layout for sharing. CPP + 5-theme audit at build (the export card itself is fixed-branded, but verify the launch path across themes).

## Mindful (LOCKED)
Full access, no limitations, highlight included. Justification (on record, no backtrack): the report is opt-in / self-sought, purely the user's own numbers, and has zero negative coloring (no red). No "coachable vs non-coachable" tier exists in the system; this is simply "Mindful = full access, no special-casing." The accent-on-stronger / neutral-on-other treatment is identical in all three modes.

## Empty states (LOCKED)
- A preset you lack history for: QUIET disabled-chip-with-a-hint ("Last month · needs more data"), greyed, no jarring modal. Tapping does nothing harsh (maybe a soft haptic). Tells you WHY before you tap. (Chosen over a popup for CPP/calm "it is a report" tone.)
- A metric row with no data inside a valid period: simple "—/no data" on that row.

## #6 build flags / teardown
- Delete `head-to-head.tsx`.
- Winner-direction inherits H2H logic (above).
- YvY card + `pj_vs_streak` teardown happens in #7 (layout reused). Trace every `pj_vs_streak` / YvY reference (home greeting, achievements?) so removal is clean and leaves no dangling read.

---

# PART 2 — CHALLENGE SYSTEM (#7)

## What it is
User-started challenges with a live home card, tappable into a dedicated Challenges page, secondary entry in Stats. DISTINCT from the Challenge Engine in SMART_COACH_SPEC.md — do not conflate.

## Concurrency (LOCKED)
ONE active challenge at a time (v1). Single clean home card. Starting a new one while one is live prompts finish-or-replace. Multiple concurrent = backlog.

## Two types (LOCKED)
1. BEAT A PREVIOUS PERIOD — multi-metric, outperform a past period's daily averages.
2. CUSTOM GOAL — single-metric, a temporary elevated daily target that does NOT touch the base goal.

## Type 1 — Beat a Previous Period (LOCKED)
- MULTI-metric: user picks 1 to 6 of: net cals, steps, water, sleep score, protein, weight.
- Compares this period's DAILY AVERAGE vs the past period's daily average, per metric (matched-length, same as #6 aggregation).
- Which past period: "beat your previous EQUIVALENT period" (default, automatic — a 1-week challenge beats the prior 7 days, etc.) OR "pick a specific past period" (custom past anchor — INCLUDED IN v1 because length is already chosen so it is a SINGLE date anchor, cheap, reuses existing date-picker). Picked past period must be fully in the past; thin/no-data handled by the #6 empty-state pattern.
- WIN CONDITION: must beat the past period on ALL chosen metrics to win (deliberately-set challenge, the bar should mean something).
- Win all -> FULL `CelebrationOverlay` (YOU DID IT, haptics).
- Fall short -> SOFT landing, never a failure screen, celebrates exactly what was beaten ("You beat last week on 2 of 3 — steps and sleep").
- Difficulty is user-controlled: pick 1 metric for a near-sure win, all 6 for a gauntlet.

## Type 2 — Custom Goal (LOCKED)
- SINGLE metric. A temporary ELEVATED daily target overlaid on top of the base goal; base goal in `pj_profile` is NEVER modified (data integrity).
- PER-DAY target (user framing "12k a day"), tracked daily across the duration.
- Easy metrics (set a daily number to hit): Steps, Water, Protein, Sleep Score (controlled indirectly, still valid).
- NET CALS: per-day but DIRECTIONAL — set a tougher daily target (base pace -500 -> challenge -750/day); a day "hits" when net meets-or-beats it in the goal direction (more deficit for lose, more surplus for gain). No-buffer.
- WEIGHT: the one exception to per-day. END-STATE net-change target ("lose X lbs over the challenge"). Progress shows "down 1.2 of 2.0 lbs". SAFETY CAP (non-negotiable): cannot exceed the app's existing safe paces — max LOSS 2 lbs/week, max GAIN 1 lb/week (the app's own pace ceiling: lose_2 / gain_1). UI computes max = rate x weeks and CAPS input, with an encouraging message ("Healthy weight loss tops out around 2 lbs a week, so this challenge maxes at X lbs") — the guardrail teaches the healthy norm. Direction tied to the user's fitness goal: lose-goal -> loss challenge, gain-goal -> gain challenge, MAINTAIN users do NOT see weight as a custom-goal option. Carries the health disclaimer (same category as weight-loss projections).

## Duration (LOCKED)
- Presets: 1 week, 2 weeks, 1 month. PLUS a simple custom-length stepper (N days/weeks — cheap because it is a count, not a date range).
- START selector: `Today` / `Tomorrow`, defaults to TOMORROW (a "1 week" challenge started Wed evening runs as full days from Thu; avoids a dead partial day 1). `Today` is for the early-bird case (5am gym morning, whole day should count) — opt-in so the user knowingly chooses a partial first day.
- Challenge days are real calendar days (midnight-midnight), aligned to `pj_<date>` keys.
- END auto-fills from length, EDITABLE (extend/shorten freely).
- Pending state ("Starts Tomorrow") is bounded < 24h; flips live at midnight. NOT a real scheduler.
- Backdated / arbitrary-future start: PINNED to backlog.

## Win conditions — duration-scaled (LOCKED)
- SHORT challenges (<= 7 days): EVERY day, no slack, single tier. Hit all N days = win. A sprint; its whole point is to nail every day. Miss any -> soft landing (celebrate days hit), but the WIN is every-day.
- LONG challenges (> 7 days — 2 weeks, month, long custom): TWO tiers.
  - COMPLETE (achievable win, fires celebration): hit the target on a strong majority of days. Definition = "one slip per week" (7d would be n/a here; 14d = miss <= 2; 30d = miss <= ~4). Reads forgiving in copy; never shown as a percentage.
  - PERFECT (every single day): same celebration leveled up (bigger/gold, special badge/flair).
  - Below Complete -> soft landing, "you hit it on X of N days", no failure.
- Type 2 weight (end-state): win = reached the target change by end; partial = "down 1.2 of 2".
- Copy adapts per length: a 1-week card says "hit every day"; a monthly card shows Complete/Perfect progress.

## Live home card (LOCKED — repurpose the YvY card)
- Takes the home slot YvY vacated. One card (one active challenge).
- REPURPOSE the YvY card layout (`renderVsYesterdayCard` in index.tsx). The YvY two-column "you vs the other guy" comparison + metric rows + accent highlight + win-condition logic are near-perfect for Type 1. Cuts build risk (adapt working code, not net-new).
- TYPE 1 body: two columns "You (so far)" vs "Last Week" (the benchmark) instead of Today vs Yesterday. Each chosen metric = a row (your period's daily avg vs benchmark avg, leader accent-highlighted). Header: challenge title + DAYS REMAINING + "leading on X of N". Show all chosen metric rows (user chose them deliberately, so it is honest, unlike YvY's auto-pick-4).
- TYPE 2 body: single-metric HERO progress in the SAME card shell (header/border/trophy): "Steps · 11.2k / 12k" + progress bar + "hit 4 of 6 days · 3 left".
- STATES: Pending ("Starts Tomorrow" + setup summary + countdown) | Active (live) | Complete.
- COMPLETE state: distinct GRADIENT treatment (reuse `CardWash`/`GradientCard` from the weekly/monthly cards) so it GRABS you on open even with notifications deferred — win = celebratory wash (gold/accent), partial = gentler — trophy/check + "See how you did". Pop-up still fires on open too.
- Tappable -> Challenges page.

## Completion (LOCKED)
- On next app open after end date, a pop-up fires scaled to outcome — reuse the EXACT weekly/monthly summary tier/pop-up machinery.
- Full win -> loud `CelebrationOverlay`; Perfect tier -> bigger version. Short of it -> soft encouraging summary, never a failure screen.
- Home card shows the Complete (gradient) state until acknowledged, then the slot clears for a new challenge.

## History (LOCKED)
- Completed challenges saved to a `pj_challenges` history key (what it was, dates, outcome).
- Surfaces as a "Past Challenges" list on the Challenges page. Each entry offers one-tap "Run It Back".

## Notifications (LOCKED for v1)
- DEFERRED. No challenge push in v1. Acceptable BECAUSE the Complete card state is visually distinct (gradient). Wiring challenge start/end into the notification system (SPEC_notifications.md, locked 14-type spec) is a later follow-up = a new notification type, not part of this build.

## Entry points + creation (LOCKED)
- THREE entry points feeding ONE place: (1) Home card — empty-state "Start a Challenge" CTA when none active (never a blank slot); live card when active. (2) Challenges page — "New Challenge" button + Past Challenges list. (3) Stats secondary entry — a "Challenges" row/card opening the same Challenges page.
- CREATION = a DEDICATED SCREEN (not a modal — there are real number inputs + multiple steps; modal standard is centered-card-only, which fights a multi-step form; model on the onboarding screens).
- Flow: Step 1 Type (Beat a Previous Period | Custom Goal). Type 1: pick metrics (1-6) -> duration (preset/custom length) -> past period (previous equivalent default | custom anchor) -> Start Today/Tomorrow. Type 2: pick the one metric -> set target (weight enforces the safe cap) -> duration -> Start Today/Tomorrow. Final: Confirm summary card ("Beat last week on Steps, Protein & Sleep · 7 days · starts tomorrow") before launch — nothing starts by accident.

## Mindful (LOCKED)
Available, OPT-IN, with SOFTENED non-competitive language. (Consistent with #6: self-sought, the user chose it.) Reframe pass: "Beat last week" -> neutral ("Grow past last week" / "reached / not yet"), no "beat/win/lose" words, no red. Much is already Mindful-friendly by design (no red, soft landing never a failure, partial always celebrated, the YvY card already has a working Mindful variant). Mainly a language pass. NO backtrack post-ship.

## Storage keys (#7)
- `pj_challenge` — the single active (or pending) challenge: type, metrics/target, duration, start/end dates, start-mode, benchmark (Type 1), per-day progress, status.
- `pj_challenges` — past challenges history (for the Past Challenges list + Run It Back).
- Base goals in `pj_profile` are NEVER written by a challenge.

---

# PART 3 — SHARED ENGINE
A comparison util both features call: given a metric + date range, compute the per-metric daily average over only logged days (per-metric denominator), drop excluded days, weight = net change, net cals = closest-to-pace, no-buffer tie / closest-to-target. #6 uses it for the table; #7 Type 1 uses it for the benchmark + live "you so far"; #7 Type 2 uses the per-day side for daily hit checks.

---

# PART 4 — BUILD ORDER
Shared core first, then each feature, sequenced so nothing working breaks. One confirmed step at a time.

Foundation:
1. Comparison engine util (shared).

#6 Comparison Report:
2. Comparison screen (presets + day-vs-day Pro + live table + accent highlight + transparency layer).
3. Reports-section integration (launch card after EvR; collapse archives except EvR; "New Comparison" button; wake FAB).
4. Empty states (disabled-chip presets).
5. Delete `head-to-head.tsx` (YvY card stays for #7).
6. Export (add `react-native-view-shot`, branded export card, Pro gate). ONE new EAS build.
7. Tooltip + tutorial sync.

#7 Challenge System:
8. Data model + storage (`pj_challenge`, `pj_challenges`).
9. Creation screen (dedicated): type -> metrics/target -> duration -> past-period -> start toggle -> confirm; weight cap enforced.
10. Home card: convert the YvY card (Type 1 two-col + countdown, Type 2 hero, pending/active/complete states, gradient complete). Retire YvY card + `pj_vs_streak` cleanly here.
11. Challenges page (active detail + Past Challenges + Run It Back).
12. Completion (tiered celebration on open, reuse summary pop-up machinery + `CelebrationOverlay`).
13. Stats secondary entry; Mindful softened variant; tooltip + tutorial; weight disclaimer.

Pure JS throughout except step 6 (view-shot = one rebuild).

---

# PART 5 — BACKLOG (custom date-flexibility family + others)
- #6: user-customizable metric selection + add Carbs + Fat as their own rows (-> 9 metrics, where a picker earns its keep).
- #6: custom multi-day/week comparison anchors (TWO independent free-placed anchors — the expensive case).
- #7: hand-pick an arbitrary past period via custom anchor is IN v1 (single anchor, cheap) — but the broader arbitrary range flexibility stays here if it grows.
- #7: backdated / arbitrary-future challenge start (beyond Today/Tomorrow).
- #7: multiple concurrent challenges.
- #7: challenge start/end push notifications (wire into SPEC_notifications.md as a new type).
- #6: optional "Side A led on X of Y" soft summary line (only if the report feels flat in testing).
