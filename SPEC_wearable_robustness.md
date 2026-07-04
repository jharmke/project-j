# SPEC: Wearable Robustness (no-watch / partial-watch users + adaptive TDEE)

STATUS: DESIGN IN PROGRESS (from the deep 2026-07-03 session). Do NOT build until finished + signed
off. This is a SEPARATE subsystem from SPEC_workout_sessions.md, it's about the calorie/coaching
engine and how the app behaves for users who don't wear a wearable 24/7. Kept in its own spec on
purpose so the two big pain points don't tangle.

Origin: Justin's concern that the app was designed ~99% for full-time watch wearers (like him) and
that non-watch / inconsistent-watch / multi-device users get incomplete or misleading data.

---

## THE CONCERN

The app is watch-FIRST (a valid, strong focus, same as Whoop/Oura). But a large share of real users
won't wear a watch 24/7. The fear: their smart features are irrelevant or actively inaccurate, and the
coaching tells them negative things ("you're way under on burn") purely because they aren't wearing a
device. This spec separates what's actually true from what feels true, and defines the additive fixes.

---

## VERIFIED FINDINGS (code-grounded 2026-07-03 -- so future-me doesn't re-panic)

- **Calorie TARGET is watch-INDEPENDENT.** `loadCalorieTargets` (utils/calorieTarget.ts) = BMR (Mifflin)
  x lifestyle multiplier + training bonus - goal deficit, ALL from pj_profile (lifestyleActivity,
  trainingFrequency, weightGoal). Active calories from the watch are NOWHERE in it. So the number users
  look at most (calories to eat) is accurate for everyone, watch or not. The app also does NOT do the
  MyFitnessPal "eat back your exercise" thing -- the target is fixed, daily burn is never added to the
  eating budget. (Confirmed by Justin's own device: burning 900 doesn't change his 1638 target.)
- **`net` stat DOES include burn.** index.tsx ~line 990: net = eaten - active burn - BMR. For a
  non-wearer, burn ~0 so net understates the deficit. It's a SECONDARY stat, and Mindful mode hides it.
- **Coaching HAS partial coverage-awareness.** smartTipsEngine computes daysWithNutritionData /
  daysWithActivityData / daysWithSleepData (~line 536) and attaches them to the EvR/weekly/monthly
  packets; coachAI.ts rulebook softens to "in the days you logged" when coverage <50% and won't praise
  a deficit when nutrition coverage <60%. NOTE: "activity data" counts STEPS, so a phone-carrying
  no-watch user reads as having activity data and gets legit step-based coaching -- rarely truly blind.
  GAP: there is NO deliberate "this user has no wearable -> pivot to nutrition-first" mode. It softens,
  it doesn't pivot.
- **EvR "predicted vs actual"** uses active cals in the prediction, so for a non-wearer predicted burn
  is understated -> predicted deficit smaller than the real scale change -> the gap widens.
- **Recovery / HRV / RHR / sleep stages / HR zones / VO2 / SpO2 / resp rate** void HONESTLY without a
  watch (no data shown, never fabricated). Impossible without a wearable in ANY app -- not a Project J
  flaw, it's physics.
- **No adaptive TDEE exists.** calTarget never reads the weight trend to adjust; EvR merely SHOWS the
  predicted-vs-actual gap and never feeds it back into the target.

### Honest verdict
Non-watch users are NOT screwed -- they get an accurate nutrition + weight + calorie-target + faith
app. The wearable-only layer is honestly absent, not faked. The real, ADDITIVE work is below. Nothing
here is a rewrite, and the calorie target (the scariest assumption) is already clean.

### The real limitation
The fixed target is a crude average of assumed activity; it doesn't track real burn/variance and only
self-corrects if the user manually edits their activity level/goal. That's what adaptive TDEE fixes,
for everyone (see addition 2).

---

## DEFECT INVENTORY + PHASED ACTION PLAN (locked 2026-07-03)

### The defects (everything identified)
- **A.** Coaching may surface active-cal or recovery insights to a user with little/no watch data (a
  tip computed off ~0 data). Extent = TBD by the Phase 0 audit.
- **B.** The `net` stat understates burn for non-wearers (smaller apparent deficit). Secondary stat;
  Mindful already hides it.
- **C.** EvR "predicted vs actual" leans on active calories, so a non-wearer's predicted deficit is
  understated vs the real scale change -> the card can mislead.
- **D.** No adaptive TDEE: the target never self-corrects from weight trend (the "I burn more than my
  pace and the app never knows" gap). Affects everyone.
- **E.** Wearable-gated cards (recovery/HR/sleep) render empty/broken for non-wearers instead of
  explaining they need a device.
- **F.** No deliberate wear-level detection -> coaching softens but doesn't PIVOT for confirmed
  non-wearers.
- **G.** Multi-device users can get duplicate workouts.

### The phases
- **Phase 0 - FULL data-flow audit (read-only, changes nothing).** Inventory EVERY surface where
  watch-dependent data (active cals, exercise min, HRV/recovery, HR, sleep stages, VO2/SpO2/resp) flows
  into something a user sees -- smart tips, sleep coach, recovery coach, EvR cards, Day Score
  activity+recovery, the net stat, weekly/monthly summaries, stats graphs, home cards, notifications,
  achievements, streaks. For each: what happens when that data is ABSENT / SPARSE / from MULTIPLE
  sources. Output = the exact bounded defect list. Fixes nothing; removes the guessing. Scopes A/B/C.
- **Phase 1 - Guards + honest states (additive, low-risk, per-finding).** data-presence guards so no
  insight fires off missing data (A, simple parts of B/C), device-gated empty states (E), wear-level
  detection + coaching pivot (F).
- **Phase 2 - Adaptive TDEE (the one real build on this track).** weight-trend-based, suggest-not-auto,
  staleness handling (D, and the deep half of C).
- **Phase 3 - Workout sessions migration (the OTHER problem, separate track, SPEC_workout_sessions.md).**
  Multi-device dedup (G) rides along here.

### Defect -> phase map (nothing orphaned)
A -> scoped P0, fixed P1. B -> scoped P0, fixed P1 (guard/framing). C -> P1 guard + P2 anchor.
D -> P2. E -> P1. F -> P1. G -> P3.

### Still unknown
Only the exact contents of the Phase 0 findings (which specific rules/surfaces misfire, how badly).
Phase 1's true size is an estimate until Phase 0 runs.

---

## PHASE 0 AUDIT FINDINGS (read-only sweep, 2026-07-03)

### THE ROOT CAUSE (one bug, many faces)
Across the app, code treats **`activeCalories === 0` as "the user barely moved"** instead of "no
wearable is measuring burn." `rawActive = day.activeCalories || day.caloriesBurned || 0`, so a no-watch
user is 0 every day, and every "is activity low?" check reads that 0 as genuine inactivity. Nutrition,
sleep, and recovery are all correctly guarded (they void/skip on missing data); ACTIVITY is the hole.
THE PHASE 1 FIX is one concept applied everywhere: a `hasActivityData` signal (device detected / any
active-cal or exercise-minute data present) that GUARDS every "activity is low" rule, notification, and
score portion, so absence of a wearable never reads as laziness.

### CONFIRMED DEFECTS (fire misleading/negative output off missing watch data)
1. **[HIGH] `ruleActiveLow`** (smartTipsEngine.ts ~1023). Filters days where `rawActive < goal*0.4`;
   a no-watch user's rawActive is 0, so EVERY day qualifies. Gated only by `meetsLoggingGate` (= any
   logging; FOOD satisfies it). Net: a no-watch user who logs food gets "your active calories have been
   critically low (avg 0)". This is exactly the "told negative things for not wearing a watch" fear.
2. **[HIGH] `ruleActivityStreakLow`** (smartTipsEngine.ts ~1041). Counts a streak of days where
   `adjActive < goal*0.3 && workoutChecked === 0` -> fires "you've been inactive N days" off rawActive=0
   for any non-watch user who isn't logging manual workouts.
3. **[MED-HIGH] Activity Reminder notification** (notifications.ts ~1029). Fires when NOT
   `(todayActiveCals >= activeCalGoal && todayExerciseMins >= exerciseMinsGoal)`. activeCals is 0 for a
   non-wearer, so the AND is never satisfied and the "push your activity / more movement" nudge can fire
   DAILY. exerciseMins has a manual fallback but activeCals does not, so even a manual-timer user gets
   nagged.
4. **[MED] Day Score activity understated on workout days (was defect H, now folded in).** dayScore.ts
   activityScore(): on a completed-workout day the score = active-cals(/60) + completion(/40). A no-watch
   user who logs a full workout gets 0/60 + 40/40 = ~40/100, vs a watch user's ~90 for the identical
   workout. Since Activity is 30% of Day Score, that's ~15 Day Score points lost for the SAME behavior,
   purely for lacking watch-measured calories. (The NO-workout no-data path is fine -- it returns null
   and drops out, not penalized.)
5. **[MED] EvR "predicted vs actual" deficit** (diagnosticReport.ts ~289). Predicted change uses active
   cals; for a non-wearer active=0 so predicted loss is understated, while actual (scale) is real ->
   the gap widens. Direction is usually falsely-POSITIVE / mis-attributed ("your effort is outpacing
   your logged deficit") rather than negative, and it needs weigh-ins to fire at all, but it's still
   wrong attribution. Adaptive TDEE (Phase 2) is the real fix; a data guard is the Phase 1 stopgap.
6. **[LOW-MED] `net` stat** (index.tsx ~990). eaten - burn - BMR; burn=0 for non-wearers understates the
   deficit. Secondary stat; Mindful hides it.

### VERIFIED GOOD (honest already -- do NOT touch)
- **Calorie TARGET** -- fully watch-independent (profile-based). The most-viewed number is accurate.
- **Day Score, non-workout no-data day** -- activityScore returns null and drops out (weightTotal
  excludes it), so a no-watch rest/quiet day is NOT penalized.
- **All nutrition rules** (net/protein/carbs/fat/water/fiber/sodium/sugar/cal-goal) -- guarded on
  `hasFoodData` + logging gates + min-day counts. Never fire off missing data.
- **All sleep rules** -- guarded on sleep-day counts; recovery voids honestly without a watch.
- **daySummaryCopy** -- activity subs gated on `activityScore !== null` and `activeCalScore > 0`, so it
  won't emit a "you were lazy" line off 0 active cals (worst case a lukewarm summary from defect 4).
- **`ruleActiveHigh` / `ruleStepsHigh`** -- positive tips requiring goals HIT, so 0-data users never
  trigger them.
- **Coverage-awareness exists** -- daysWithNutrition/Activity/SleepData computed + handed to the AI;
  rulebook softens when coverage is low. Partial protection (but note: it SOFTENS, the rules above
  still FIRE; softening the wording of a wrong tip is not the same as not firing it).

### SECOND-PASS CLOSURES (chased the flagged stones)
- **Recovery coach** -- CONFIRMED GRACEFUL. buildRecoveryFinding returns null when recDays (days with a
  recoveryScore) is empty; a no-watch user has zero recovery scores -> the public fn falls back to
  `rec_no_data` ("wear a watch overnight to build your recovery picture"). No negative output. GOOD.
- **Cross-signal rules** (workout-intake, steps-sleep, fiber-calorie, etc.) -- CONFIRMED GUARDED. They
  split by `workoutChecked` (manual-loggable) or require `steps > 0 && sleepScore !== null`, and gate on
  min day counts with data. None fire a negative "you're inactive" read off active=0. GOOD.
- **Sleep coach `sleep_data_low`** -- gentle PROMPT ("log a few more nights"), not a misleading negative.
  Acceptable; manual sleep entry feeds it for no-watch users. Low concern.
- **Otto stat pack (companionStats.ts)** -- VERIFIED ALREADY SAFE (re-read 2026-07-03). It converts a
  0-active-cal day to null BEFORE averaging (`d.rawActive > 0 ? burnAdj(d.rawActive) : null`) and only
  adds today's active-cals `if (today.rawActive > 0)`. So a non-wearer's pack OMITS the active-cal
  stats entirely rather than reporting 0. No fix needed. (The `calories_net_*` stats do subtract burn,
  so net = eaten for a non-wearer -- same low-concern class as the `net` display stat, labeled
  transparently; left as-is.)
- **`ruleStepsLow`** -- phone-tracked steps are usually real; genuine edge is a no-phone-carry user.
  Lower risk, same class; apply the guard for consistency.
- **Averaged display surfaces** (EvR / weekly / monthly activity averages) -- 0-data days drag averages
  down; this is display UNDERSTATEMENT (same class as `net`), not a coaching accusation. Minor.
- **HR zones** -- absent without a watch, like recovery. Honest, no fix.
- **Multi-device dupes (G)** -- belongs to the sessions track (SPEC_workout_sessions.md), not re-verified.

### COMPLETENESS STATEMENT (honest)
The coaching / scoring / notification / summary surfaces were swept and all trace to ONE root cause
(active-cals 0 read as "inactive" instead of "no device"). The confirmed defects (1-6) plus the Otto
pack all fold into the single hasActivityData guard. No audit can claim literal 100%, but the surfaces
that could TELL a user something wrong are accounted for; residual risk is small and same-class. If a
new firing spot turns up, it will be the same pattern and the same fix.

### PHASE 1 SCOPE (now concrete)
Add a `hasActivityData` guard and apply it to: ruleActiveLow, ruleActivityStreakLow (skip when no
activity data); the Activity Reminder notification (don't nag when no device is measuring burn); the
Day Score workout-day branch (don't cap at 40 -- score completion fairly when active data is absent);
and as a stopgap on the EvR deficit card (until Phase 2 adaptive TDEE lands). Plus device-gated empty
states (E) and the wear-level detection/pivot (F). Everything in "VERIFIED GOOD" is left alone.

---

## PHASE 1 STATUS (BUILT 2026-07-03, dev-verified via the sim)

The unifying fix: a `hasActivityData` signal (device measured burn that day = active cals or exercise
minutes present) that guards every "activity is low" surface. It is a PURE NO-OP for watch users
(hasActivityData always true -> `true && X` === `X`), so it can only change behavior on a no-device /
partial-device day. Verified on-device: the No-Watch Sim's ">> activity/recovery rules" line went from
`active_low` + `sleep_deep_low` to `(none)`, while the REAL-data list stayed byte-identical.

- [DONE] `hasActivityData` added at the source (both WindowDay loaders in smartTipsEngine.ts).
- [DONE] Guarded `ruleActiveLow`, `ruleActivityStreakLow`, and `ruleStepsLow` (defects 1, 2, and the
  steps edge). ruleStepsLow now also requires real step DATA (steps > 0) so a 0-step/no-device day
  isn't read as "low steps."
- [DONE] Activity Reminder notification (notifications.ts) now requires an activity signal today
  (active cals or exercise minutes > 0) before nagging -> no daily "push your activity" for a
  no-device user. Watch users still get it (they have data by the time it fires). (Defect 3.)
- [DONE] Day Score workout-day cap (defect 4): a logged workout on a no-device day now scores on
  completion (up to 100) instead of being capped at ~40 by the missing active-cal /60. No-op for watch
  users. NOTE: changes the score number for no-watch users' workout days + triggers historical
  recompute for them (Justin OK'd; his own scores unchanged since he wears a watch 24/7).
- [ALREADY SAFE] Otto stat pack (defect: none) -- see closures above.
- [DEV TOOL] "No-Watch Sim (read-only)" added to Settings dev tools (smartTipsEngine.dumpWearableSim):
  strips activity + recovery + sleep-stage data from an in-memory copy of the real window, runs the
  rules, reports what fires. Writes nothing. This is the repeatable way to observe/verify the
  non-wearer experience without being a non-wearer (Justin wears his watch 24/7 + testers won't hunt
  these), and to catch regressions.

STILL OPEN on this track:
- Defect 5 (EvR predicted-vs-actual) real fix = Phase 2 adaptive TDEE (not built). Defect 6 (`net`
  stat) is low-concern/secondary, deferred.
- E (device-gated empty states) and F (deliberate wear-level pivot beyond per-rule guards) not built.
- Phase 2 (adaptive TDEE, weight-trend, suggest-not-auto) not started; research pass recommended first.
- Follow-up read still owed: the ~15 EvR cards + summary COPY for any same-class stragglers (the sim +
  the unified guard mean any straggler is the same pattern/fix).

---

## WEAR-LEVEL INFERENCE (the enabler)

We are NOT blind to who wears a device. We already track, per day, whether HealthKit sent HRV /
exercise minutes / sleep / active cals. Over a rolling window we can infer:
- **None** = no HRV + no exercise minutes + no sleep data, ever.
- **Partial** = sporadic presence.
- **Full** = consistent presence.
It's an inference from existing data, NOT a setting we have to ask for. This inference is the trigger
for addition 1. (Exact thresholds = open question.)

---

## THE 3 ADDITIONS

### 1. No/low-wearable coaching pivot
- WHAT: when wear-inference says none/low, the coaching leans confidently on food + weight + steps and
  SUPPRESSES active-cal / recovery insights instead of merely softening them.
- FIXES: a non-wearer getting a thin or misleading activity insight (e.g. "your active calories
  dropped" computed off ~0 data), or an inapplicable recovery tip.
- FULL-WATCH USERS AFFECTED? NO. Gated on data ABSENCE, so it never triggers for wearers. Pure
  protection for non-wearers.

### 2. Adaptive TDEE (highest leverage -- helps EVERYONE)
- WHAT: track a "real" TDEE estimate from the weight trend vs logged intake, and use it to refine the
  calorie target. Watch-INDEPENDENT (runs on weight + food).
- FIXES: (a) the fixed-target limitation -- if real burn differs from the assumed activity level, the
  target self-corrects from the scale; (b) Justin's exact "I burn more than my -750 pace and the app
  doesn't know" concern -- solved by the weight trend, NOT by chasing noisy daily watch burn; (c) makes
  non-wearers' targets accurate too.
- FULL-WATCH USERS AFFECTED? YES, beneficially -- tightens the crude flat multiplier for everyone.
- WEIGH-IN DEPENDENCE (Justin's key concern): it relies on weigh-ins. Behavior:
  - Not enough weight history yet -> do nothing; fall back to the profile-based target (no regression).
  - Recent regular weigh-ins -> refine the target from the trend.
  - Stale weigh-ins (e.g. Justin's current 11 days) -> HOLD the last good target, do NOT drift, show a
    gentle "step on the scale to keep your target accurate" nudge. NEVER show stale auto-changes.
    REUSE the existing EvR staleness pattern (deficit card reframes once newest weigh-in is >=10 days
    old). Same threshold, same honest-when-stale behavior.
  - Net: purely ADDITIVE. Helps consistent weighers, neutral (= today's behavior) for non-weighers,
    never punishes, never shows garbage.
- DELIVERY (Justin's call -- do NOT overstep): **SUGGEST, never silently change.** Track the estimate
  in the background; when the trend clearly diverges from goal pace, SURFACE a suggestion ("your real
  burn looks higher, raise target to ~X?") that only applies on the user's tap. Optional opt-in
  "auto-adjust" toggle (OFF by default) for the set-and-forget crowd.
- COST: a real build (trend-smoothing algorithm, staleness handling, "here's why your target changed"
  UI). Worth it; not a quick toggle. Research MacroFactor-style trend smoothing + adjustment cadence
  before designing for real.

### 3. Device-gated empty states + tutorial/tooltip references
- WHAT: wearable-gated cards become honest explainers, not blank/broken cards. A non-wearer's Recovery
  card reads "Recovery needs a watch worn overnight" (icon + title + subtitle + how-to = the app's
  Empty States standard). Tutorials/tooltips note which features are device-gated.
- FIXES: a non-wearer opening the app to empty recovery/HR cards that feel like "this app isn't for me."
- FULL-WATCH USERS AFFECTED? NO. Gated on data presence; their cards show as always.

### Who each affects, summary
- #1 and #3: non-wearers only (gated on data absence), zero change to full-watch users.
- #2 (adaptive TDEE): everyone, beneficially, and it directly answers Justin's 1638 concern.

---

## MULTI-DEVICE (edge case, from the same session)

- Real dupe risk is NARROW: two devices only duplicate when they log the SAME activity type. Oura + a
  smartwatch is common but COMPLEMENTARY (Oura = sleep/recovery, watch = workouts) -> low dupe risk.
  Two workout-trackers (Garmin + Apple Watch, Whoop + Garmin) is the genuine dupe case, and rarer.
- For the genuine case: auto-detect (same type + overlapping time window + different source) and
  collapse to ONE session by default, with a "2 sources detected, tap to switch" cue. (Ties into
  SPEC_workout_sessions.md session model.)
- Day-level calorie totals are HealthKit's job (it has source-priority dedup the user sets in Health).

---

## OPEN QUESTIONS / TO DISCUSS

- [DECIDED 2026-07-03] Trend smoothing = EMA (~10-day half-life recommended); weekly cadence; suggest-
  only; Mindful = no visible nudge; first-use disclaimer required. Full design in "PHASE 2 DESIGN"
  above. REMAINING tuning: exact EMA constant, min weigh-in count, divergence threshold, per-step cap.
- Exact wear-inference thresholds (what counts as none/partial/full, over what window).
- Interaction with the existing "burn accuracy %" setting (that handles OVER-estimation; adaptive TDEE
  is a different lever) -- confirm they don't fight.
- How this coexists with EvR's existing predicted-vs-actual: unify via ONE shared trend engine (rec) or
  keep walled off (Justin's call).
- Where the suggestion surfaces (home Calories card? settings? dedicated coach card?).
- The per-rule coaching audit (walk every smart-tip rule, confirm it guards on data presence) -- the
  read-only methodical scan to turn "probably fine" into "verified fine."

---

## PHASE 2: ADAPTIVE TDEE -- BUILT 2026-07-04, device-validated on Justin's real data

Files: utils/adaptiveTdee.ts (engine + weekly trigger + apply), app/adaptive-target.tsx (accept
screen), Home mount trigger (index.tsx), auto-adjust toggle (settings.tsx Goals), dev tools
(preview + demo). HOW IT WORKS:
- Engine: realTDEE = avgDailyIntake - (weight-trend lbs/day x 3500). Weight trend = least-squares
  slope over the window's weigh-ins (robust to sparse/irregular weigh-ins; replaces the EMA for
  sparsity). suggestedTarget = realTDEE + the profile's goal-pace deficit.
- Locked constants (all tunable, Justin OK'd defaults): 35-day read window; needs >= 5 weigh-ins AND
  >= 14 logged-food days (consistent logging bar -- scale-based TDEE trusts logged intake at face
  value); STALE_WEIGH_DAYS = 10 (>= 10 days since last weigh-in -> HOLD, never drift); surface only
  when |suggested - current| >= 150 kcal; each move capped at 120 kcal.
- Cadence: a weekly-gated check on Home mount (pj_adaptive_tdee_lastrun). SUGGEST by default -> posts
  a Type-A hub notification (Otto) routing to /adaptive-target. Auto-adjust toggle (pj_settings
  .adaptiveTdeeAuto, OFF default) applies silently instead. MINDFUL = no visible nudge.
- Accept screen: plain-language explanation, current->suggested, first-use disclaimer + inline micro
  disclaimer + a persistent "accuracy depends on consistent/complete logging" caveat. Accept is the
  ONLY write: sets profile.calTarget + useRecommendedCal=false (same as editing the target by hand),
  read-then-merge, then clears the notification. ?demo=1 shows sample numbers and writes nothing.
- VALIDATED on Justin's data: intake 1826 - realTDEE 2202 = ~376/day deficit = ~0.75 lb/wk, matching
  his measured -0.8 lb/wk trend (internally consistent). Correctly held (stale, 12-day-old weigh-in).
STILL OPEN: unify with EvR predicted-vs-actual (walled off for v1 -- follow-up); release-build check.

### (Original design draft below, kept for reference)
## PHASE 2 DESIGN: ADAPTIVE TDEE (DRAFT 2026-07-03)

Framed deliberately as a walled-off, optional, suggestion-only box so it is a SMALL, reversible change
to data/app even though it is a BIG feature to design. Justin's core anxiety was "this touches
everything" -- it does not. See "Blast radius" below.

### The one-sentence idea
If you ate ~X per day and the SCALE trend moved more (or less) than that intake should have caused,
your real burn differs from the formula's guess. Work backwards to the real burn, and SUGGEST a target
that matches it. Runs on FOOD + WEIGHT only. It does NOT read watch active-calories (too noisy); the
scale is the honest referee, and it still catches "you burn more than assumed" because you can't burn
extra without the weight moving.

### The math (honest, simple, defensible)
- Energy per lb of body-weight change ~= 3,500 kcal.
- Over a rolling window: realTDEE = avgDailyIntake - (smoothedWeightChangeLbs x 3500) / windowDays.
- Worked example (Justin): avg intake 1,638, smoothed trend -2 lbs over 14 days ->
  (-2 x 3500)/14 = -500/day -> realTDEE = 1638 - (-500) = ~2,138. The formula target never knew this.
- Weight change MUST come from a SMOOTHED trend (EMA, ~10-day half-life recommended -- honest + cheap;
  a Kalman filter is overkill), never raw scale jumps, so water/glycogen spikes can't move the target.

### Cadence + hedging (from MacroFactor research)
- Re-evaluate on a weekly rhythm; first ~14 days just watch/build confidence before suggesting.
- Do NOT react 1:1 to a single week's swing. Only surface when the divergence is MEANINGFUL
  (realTDEE differs from the assumed TDEE by >= ~150 kcal) AND persists. Cap each suggested step
  (e.g. +/-100-150 kcal) so it eases toward truth instead of lurching ("no caloric roller coaster").

### Guards / weigh-in dependence (the safety rails)
- Thin history / <~4-5 weigh-ins in the window -> do NOTHING; fall back to the profile target. No
  regression, ever. A user who never weighs in never sees this feature.
- Newest weigh-in >= 10 days old -> HOLD the last good estimate, do NOT drift, show the gentle
  "step on the scale to keep your target accurate" nudge. REUSE STALE_WEIGH_DAYS = 10 and the exact
  honest-when-stale pattern EvR's deficit card already uses (diagnosticReport.ts ~311), so the two
  behave identically. Never show a stale auto-change.

### Delivery (LOCKED with Justin 2026-07-03): SUGGEST, never silently change
- Track the estimate in the background; when the trend clearly diverges, SURFACE a suggestion
  ("Your real burn looks higher, raise target to ~X?") that only applies on the user's TAP.
- Optional opt-in AUTO-ADJUST toggle, OFF by default, for the set-and-forget crowd.
- The ONLY thing the feature ever WRITES is the calorie target number -- and only on accept. This is
  the SAME operation a user can already do by hand in settings (type a new target). It invents no new
  write path.

### Mindful-mode behavior (LOCKED with Justin 2026-07-03)
- Mindful users do NOT get the visible suggestion nudge (Mindful already hides net calories / score bar
  / weight emphasis; a "raise your target" callout would violate the mode contract).
- If a Mindful user has deliberately enabled auto-adjust, the engine may quietly keep their target
  honest in the background with NO callout. Discipline/Balanced get the visible suggestion.

### Blast radius (the anxiety answer -- honest, not just soothing)
- WRITES exactly one thing: the calorie target, only on accept. That's an operation the app already
  supports, so Day Score / summaries / stats / EvR / logs need NO surgery -- they read the target like
  always.
- READS food + weight only; writes nothing to logged data. No migration, no data rewrite, no reset.
- Ships behind a toggle. Toggle OFF (default) = the feature does not exist; the app is byte-identical
  to today. The "undo" at every step is simply "don't tap accept."
- The one CONNECTION point is EvR: it already computes the honest weight span, daysSinceLastWeighIn,
  and predicted-vs-actual (diagnosticReport.ts ~289, ~780-800). STRONG REC: ONE shared weight-trend
  engine feeds both EvR and the target suggestion (a wire, not a rewrite), so they can't drift and
  defect 5/C folds in cleanly. Open: keep it fully walled off from EvR instead, if Justin prefers.

### First-use + disclaimer (health-data standard)
- Surfaces a recommendation/metric, so it needs the first-use modal + inline micro disclaimer per the
  Disclaimer Standard, before it ever suggests a target change.

### Base stays clean
- loadCalorieTargets (utils/calorieTarget.ts) is the untouched base. Adaptive TDEE is a LAYER that
  produces a suggestion against that base; the base number only changes if the user accepts.

### Still open before build
- Exact EMA half-life / smoothing constants + minimum weigh-in count for the window.
- Meaningful-divergence threshold (~150 kcal?) and per-suggestion cap (~100-150 kcal?) -- tune.
- Unify with EvR predicted-vs-actual vs keep walled off (Justin's call).
- Where the suggestion surfaces (home Calories card? settings? a dedicated coach card?).
- Interaction with the existing "burn accuracy %" setting (that handles watch OVER-estimation; this is
  a different lever -- confirm they don't fight).

---

## DEFECT F: NON-WEARER COACHING PIVOT -- BUILT 2026-07-04 (design + build below)

BUILT: metricPresence.ts now exports getWearState() (3 states: wearer/nonwearer/unknown, computed
on-demand, never stored) + isLikelyWearer() + hasEverHadWearable(); derived from ever-had-wearable-
data + pj_healthkit_skip fast-path + a >=14-day-history lookback; fail-safe = only 'nonwearer' is
treated confidently (a new real wearer whose data hasn't synced is never walled off). Skip-flag
hygiene: recordMetricPresence auto-clears pj_healthkit_skip the moment any wearable metric turns true
(data always wins). SURFACE: the Recovery TAB of the Sleep & Recovery hub (sleep.tsx renderRecovery)
shows ONE whole-screen "needs a wearable" state for a confirmed non-wearer instead of a wall of empty
cards. Item 7 (report framing) verified a no-op: the weekly/monthly summaries don't do a binary
activity-vs-food framing, so nothing to make consistent. DEV TOOL "Force wear-state (Defect F)"
(pj_dev_force_wearstate, checked first in getWearState; no-op in prod) lets a 24/7 wearer preview it.
NOTE: only the Recovery TAB got the new whole-screen treatment -- Home card + summaries were already
handled by the earlier empty-state audit; cards stay per-metric by design. STILL OPEN: none required;
optional future = wire isLikelyWearer into more coarse surfaces if any turn up.

--- (design, kept for reference) ---
## DEFECT F: NON-WEARER COACHING PIVOT -- DESIGN 2026-07-04

This SUPERSEDES the earlier "WEAR-LEVEL INFERENCE (none/partial/full)" section above. We are NOT
storing a persistent none/partial/full wear-level label on the user. Reason: a stored classification
can go stale, can be wrong, and forces a global yes/no where a per-metric answer is more accurate.
Instead every feature asks, per-metric and per-moment, "is real data present right now for the thing I
need?" (the same pattern as the existing hasActivityData guard + utils/metricPresence.ts). NOTE: the
none/partial/full CONCEPT survives only as a derived, computed-on-demand helper (see isLikelyWearer
below), never as a stored flag.

### Core model: per-metric, per-moment presence (no stored label)
Each card/feature checks its OWN metric ("do I have recovery right now?") and shows data or an empty
state accordingly. ~99% of surfaces only ever need this per-metric check.

### The 3 states every watch-dependent surface resolves to
1. HAS-NOW (data present in the current view) -> show the data.
2. EVER-HAD (grow-only metricPresence is true, they've had this metric before) -> soft "no recent
   data" state. NEVER "you need a watch" (they clearly own one). Data resumes when they wear it again.
3. NEVER-HAD + CONFIRMED NON-WEARER -> honest factual explainer ("Recovery is measured overnight by a
   smartwatch or fitness tracker"). Descriptive, tells them what unlocks it, never a "go buy one" nag.

Two questions drive it: HAS-NOW decides data-vs-empty; EVER-HAD decides soft-empty-vs-explainer.

### The 4 non-negotiable rules (the contract that makes it airtight)
1. REAL DATA ALWAYS WINS over any flag or label.
2. THE LOOKBACK EXISTS (load-bearing, not optional -- see detection below).
3. CLEAR pj_healthkit_skip THE MOMENT they connect Apple Health (else the flag lies).
4. A NEUTRAL "no data yet / syncing" MIDDLE STATE for the brief pre-lookback window, so a brand-new
   real wearer whose data hasn't synced is never falsely told "needs a watch."

### Confirmed-non-wearer detection (two paths)
- FAST PATH: pj_healthkit_skip (set when the user taps "Maybe later" on the Apple Health onboarding
  screen) = instant day-one non-wearer signal. It has a real writer (not a dead flag like
  healthkitConnected). MUST be cleared on connect; real data always overrides it.
- FALLBACK (LOAD-BEARING): never-had this metric AND ~N days (recommend 14) of active app use with no
  data for it -> confirmed non-wearer for that metric. This catches users who CONNECTED Apple Health
  for phone steps but own NO watch (no skip flag, but never any recovery/HRV/etc.). Without this
  fallback, those users would sit in the neutral middle state forever. The skip flag is just an
  accelerator; the lookback is what actually confirms non-wearer for everyone else.

### Coaching voice rules (items 1-4)
- CONFIDENT, NEVER APOLOGETIC. Proactive coaching (smart tips, summaries, Otto) talks only about
  what's real (food, weight, steps) with full confidence, never hedges with "since we don't have your
  activity data." Applies to PROACTIVE coaching only; if the user DIRECTLY asks about recovery/HRV,
  Otto can honestly say it needs a wearable (that's the device-awareness already shipped).
- NO WEARABLE NUDGING, EVER, from the coaching voice. Otto / smart tips / summaries never suggest
  buying or wearing a device. A wearable is only ever mentioned in a device-gated empty state
  (explaining honestly why that card is empty) or a direct answer when the user explicitly asks.
- NO TONE/PERSONALITY SHIFT wearer vs non-wearer. Same Otto, same voice, same directness. Only the
  underlying data referenced changes, not the personality.
- EMPTY-STATE COPY IS FACTUAL ("Recovery is measured overnight by a smartwatch or fitness tracker"),
  never imperative ("wear your watch"). Factual info that happens to say what unlocks it = fine; an
  active prompt to go wear it = the nudge we ruled out.

### The derived isLikelyWearer() helper (the "fallback" -- computed live, never stored)
Used only for the ~2 HOLISTIC decisions a single metric can't answer:
1. Whether a whole SCREEN should be one clean empty state (the Recovery TAB of the Sleep & Recovery
   hub -- the only genuine "wall" for a non-wearer).
2. Whether a REPORT leads with activity or food framing (item 7).
Everywhere else uses the per-metric check. This helper is computed on demand from metricPresence +
the detection above; it is NOT a persisted flag. It exists so features answer the coarse question
CONSISTENTLY (no single source of truth otherwise = features could disagree and feel schizophrenic).

### Reports (item 7) -- narrative consistency
Use the existing daysWithActivityData / coverage-% signal (already computed in coachAI) to decide
what a report leads with, so summaries don't randomly bounce between activity-focused and
food-focused between periods. GUARD against threshold flip-flop: either apply hysteresis (switch TO
activity-led only above ~60% coverage, away only below ~40%, stay put in between) OR simply don't make
framing a hard binary at all (just include what's present). The simplest fix is the latter.

### Cards / empty states (item 10) -- keep them, it's not a wall
- The watch-dependent surfaces are FEW and mostly already handled: the Stats graph picker already
  hides watch-only graphs for non-wearers (built), At a Glance already drops watch-only rows (built).
- The Home Sleep & Recovery card STAYS: its Sleep face works via manual entry (fully usable); only
  the Recovery face is empty for a non-wearer. Card is never dead. Users can hide it via Edit Layout.
- The ONLY genuine "wall" is the RECOVERY TAB of the Sleep & Recovery hub (all-empty screen for a
  non-wearer) -> give it ONE clean full-screen empty state, not a stack of empty rows.
- Do NOT hide watch cards wholesale; a few factual empty states spread out is fine and honest.

### Achievements (item 8) -- confirmed non-issue
No reframing of any achievement. CONFIRMED by reading achievementData.ts: there is NO watch-REQUIRED
achievement family (steps come from the phone, sleep works with manual entry, there is no active-cals
achievement family). So non-wearers can already earn most things. NOTE: the daily GOALS (active cals,
exercise minutes) effectively need a watch, but those are goals, not achievements, and Phase 1 already
stops the app from nagging a non-wearer about missing them.

### HR Zones (item 9) -- already correct
Verified in code: the HR Zones button only renders for Apple Health cardio with a real UUID; manual
exercises never show it; a session with no recorded HR shows an honest "No heart rate recorded" state.
No fix needed.

### Accepted tradeoffs (deliberate choices, NOT holes)
- GROW-ONLY NEVER FORGETS: a user who wore a watch then quit for good keeps their watch cards + soft
  empty states forever (metricPresence can't distinguish "off day" from "quit 3 months ago"). This is
  the SAFE direction -- it never wrongly tells someone to buy a watch they already own.
- NARROW SELF-HEALING EDGE: a brand-new real wearer who doesn't wear the watch for the first ~14 days
  AND opens the app in that window could see the factual "measured by a wearable" message early. It's
  TRUE for them anyway (they own one, weren't wearing it), it's factual not naggy, and it corrects
  PERMANENTLY the instant any watch data ever appears. Make N generous (14) and it's a non-issue.

### Still open / to tune
- Exact lookback N (recommend ~14 days).
- Report framing: hysteresis vs simply not making it a hard binary (lean: not a binary).
- Audit the actual empty-state STRINGS to confirm they're all factual/descriptive, never imperative.
- "What makes a no-watch user feel this app is FOR them" is largely answered by the voice rules +
  not over-empty-stating, but worth a final gut-check once F is built.

---

## RELATION TO OTHER WORK

Independent of SPEC_workout_sessions.md (different subsystem). Shares only the multi-device dedup edge
case. Can be built on its own track, any time. The adaptive-TDEE SUGGESTION (Phase 2 above) is
DELIVERED through the Otto notification hub (SPEC_otto_notifications.md) as a Type A / Replace entry.
