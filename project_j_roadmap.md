# Project J -- Active Roadmap
# Read this at the start of every session.
# Completed/shipped detail lives in project_j_roadmap_archive.md (reference only when needed).
# Parked/future items live in project_j_backlog.md.
# Tags: [BUG] = confirmed broken | [HIGH] = priority | [ ] = open task | no tag = SOON/open
#
# UPKEEP RULE (this is how the file stopped bloating): when something ships, give it ONE line under
# "RECENTLY SHIPPED" here and move the detailed writeup to project_j_roadmap_archive.md the SAME
# session. Never let completed post-mortems accumulate in this file.

---

## 🆕 RECENTLY SHIPPED (one line each; full detail in project_j_roadmap_archive.md)
- 2026-07-12 MONETIZATION: RevenueCat purchase flow DEVICE-VERIFIED end to end (sandbox sub, tip, restore, and the
  LOCKED state all confirmed; a tip correctly does NOT grant the entitlement) + the THANK-YOU WEBHOOK shipped
  (functions/src/revenueCatWebhook.ts: emails Justin the buyer's name/email on a new Supporter or a tip, token-
  guarded, sandbox-flagged; all three paths verified). Also: EvR locked cards redesigned (WHOLE card frosted, topic
  chip, quiet per-card "Unlock ->"), purchase buttons got spinner/pending states, the Support CTA went premium, the
  Stats card buttons moved off the solid-blue slab onto the house tinted recipe, and the "SUPPORTER" gate CHIP was
  removed app-wide in favor of a lock icon (it read as a status badge you'd earned, not a requirement). REMAINING on
  the track: live priceString on the Support screen + the fuller Supporter-state screen (plan/member-since/renews-on),
  then the LAUNCH-ONLY reverts. Full detail + the pinned tester-entitlement sequence: SPEC_monetization.md.
- 2026-07-10 [BUG FIX, data-cosmetic] Over-precise gram weight in food-entry NAMES (e.g. "Italian Style
  Meatballs (113.33304999999999g)" from logging 1.3333 servings). Two-part fix: (1) DISPLAY: the Log tab meal
  rows now round the parsed gram/oz label via the shared utils/repeatMeal.tidyFoodName (>=3-decimal numbers ->
  1 decimal), which cleans EXISTING ugly entries too; (2) UPSTREAM: food-detail.tsx name-build rounds the
  gram/oz amount to <=1 decimal before storing, so NEW entries are clean (loggedAmount stays precise -> edit
  math unaffected). Pure JS, tsc clean (no new errors). Was the parked Food & Log backlog bug.
- 2026-07-10 WEIGHT HISTORY + STARTING WEIGHT SHIPPED (gear on the home Weight card; all 5 slices; device +
  8-check dev self-test verified; Otto deployed). Editable weigh-in history (edit/delete per day + back-dated
  "add a past weigh-in", today-or-earlier), starting weight = earliest weigh-in (tap to correct; an earlier add
  becomes the new start), read-then-merge on pj_<date>.weight so food/water are never touched, plausibility
  guard, Firebase sync, milestone recompute that GRANTS but never revokes badges, Mindful-neutral. Explainers:
  new 'weight_card' tooltip + card (i) + Otto KB. utils/weightHistory + 32 unit tests (npm run test:weight).
  Dev self-test in Settings is DEV-ONLY (added to REVERT BEFORE LAUNCH). Full post-mortem in archive; spec
  SPEC_weight_history.md.
- 2026-07-10 ONBOARDING training-frequency wording (dad feedback): screen 4 subline now reads "How often you
  actually train these days, not what you're aiming for. You can change it in your Profile anytime." (was "How
  often you do structured workouts"). Kills the aspirational-answer trap that inflated TDEE (training freq adds
  up to +400 cal/day). Copy-only, your-style.tsx. Lifestyle Activity + Profile field left as-is (decided out).
- 2026-07-10 [BUG FIX] Home Weight card "Total Lost" contradicted "vs Yesterday" (commit aea7aec). It computed
  earliestWeight - today, so a GAIN showed a negative number under a static "Total Lost" label (opposite sign
  from the +N vs-Yesterday stat) -- dad gained 187->188 but saw "-1 Total Lost". Now the label flips Total
  Lost/Total Gained by direction + shows the magnitude (agrees with vs Yesterday); Mindful = neutral "Total
  Change". Baseline unchanged (earliest LOGGED weigh-in; the earliest-vs-onboarding-starting-weight baseline is
  a separate open design question, NOT a bug). index.tsx, pure JS, tsc clean.
- 2026-07-10 REPEAT A MEAL + per-meal CLEAR ALL SHIPPED + device-verified (commit 016315d, pure JS). Re-log a
  previous day's meal-slot entries into the viewed day by exact-cloning (no saved object; photos/macros/extended
  nutrition carry verbatim, AI items safe). White-outline pills on empty slots ("Repeat Yesterday · N kcal"
  one-tap + "Pick a Day" picker), live-macro accordion modal w/ crossfade, destination always = launch slot.
  Clear all = quiet red link to wipe a whole meal in one confirm. utils/repeatMeal + 30 tests; explainers +
  Otto KB all updated/deployed. Full post-mortem in archive. Spec: SPEC_repeat_meal.md.
- 2026-07-10 WORKOUT TIMER RELOCATION + polish (Cengiz feedback: the full-width rest banner blocked
  scrolling/tapping between sets). Rest + hold timers now live in a compact TWO-ROW chip docked between the
  Otto and "+" FABs (left/right:90 clears both 56px discs; time+buttons row over a full-width centered
  label; fade in/out via Reanimated; thin 1px accent border -- blue rest / green hold; bigger Done). Also
  fixed: hold Done haptic (was silent -> Medium); double-timer overlap (a live hold owns the single slot so
  checking another set no longer stacks a rest; tapping the holding set's own check circle now acts as Done
  and logs the ACTUAL elapsed hold, so an accidental circle-tap does the right thing); edit-exercise TIME
  sync (option C -- editing a time exercise applies the new duration to un-done sets, silent when uniform,
  prompts "Apply to all?" only when un-done sets differ, finished sets never touched). Cut the hold +15
  (you don't tap mid-hold). Dev-verified (fade/haptics/layout/double-timer/prompt). OPEN TAILS: (a) 5-theme
  x accent audit (tested Light/cyan only); (b) release/TestFlight feel-verify; (c) PARKED optional -- a
  countdown hold could roll into overtime instead of auto-ending at the target (removes any need for +15).
- 2026-07-10 [PERF BUG FIX, dev-verified] Add-exercise cold-remounted the whole Workout tab. Picking a
  library exercise did router.push('/(tabs)/workout', {pendingExercise}) -> a PUSH spawned a brand-new
  Workout screen every time (full cold mount: June-carousel flash, empty exercises, default avatar, 5-10s
  first hydrate on release, and STACKED/leaked instances that slowed the app until a force-kill). router.
  navigate didn't dedupe to the existing tab either (still remounted). Fix = hand the exercise off via a
  pj_pending_exercise storage slot + router.back() (pops the library, reveals the still-mounted workout
  screen -> ZERO remount); the tab reads+clears the slot on focus to open the add modal. Same handoff
  pattern as recipe ingredients. Pure JS. Dev-verified (flash gone, exercises/avatar/carousel all persist).
  STILL OPEN (separate, smaller): the ~1s delay before the library screen itself opens; the focus-reload
  firing 11 setStates on every focus. Test on the next TestFlight build for the real speed feel.
- 2026-07-08 WORKOUT UNITS + TIME TRACKING (Cengiz feedback) SHIPPED, all 8 steps, HEAD 6e15e85. Per-exercise lb/kg (inline LBS-dropdown + Add/Edit modal, PR engine compares in kg / displays the unit lifted, volume tile splits Lbs/Kg) + Reps->Time holds (clock-style M:SS input, SetEntry.durationSec, HOLD-mode timer pill on the rest-timer foundation, hold presets flipped to Time) + longest-hold PR (PRRecord.bestDuration, duration = trophy / weight = context). Fully additive to pj_workout_state (missing unit = lb, missing type = reps, nothing converted). OPEN TAILS: (a) device-eyeball the newest time-box right-fill + blinking-cursor change (6e15e85), (b) explainer freshness for the TIME half (tooltip/tutorials/Otto KB). Full post-mortem in archive; spec SPEC_workout_units_and_time.md.
- 2026-07-08 RECOVERY "Prev. Activity" display fix (device-verified): the Day Summary + weekly/monthly summaries showed the RAW prior-day active calories (e.g. 832) instead of the burn-accuracy-adjusted value (666 at 80%) the recovery SCORE actually uses, so it disagreed with the day's own detail. Now all three multiply by burnAccuracyPct. SCORE was never affected (actScore is a ratio; both sides already adjusted). Sleep hub + home card were already correct (they read the adjusted score-result value). Day Summary is live; existing weekly/monthly snapshots need force-regenerate to update.
- 2026-07-08 NUTRITION under-logged gate (Day Score, item #8): a day with food but implausibly few calories (consumed < 50% BMR, or < 500 when BMR unknown) is under-LOGGED not genuinely low, so Nutrition now DROPS (dash) instead of scoring a fake clean calorie hit (Megan's 350-cal/915-target day scored 55/55). Skipped when diet excluded / no food. Weekly+monthly inherit it free (they null-guard). DAYSCORE_VERSION 4->5 so history recomputes once. Explainer line on both Day Summary surfaces (shared mode-aware copy) + a "This was my full day" override (per-day dietLogComplete flag, read-then-merge, recompute in place) that scores the day honestly if the user asserts it was complete. Dev tool "Seed/Remove under-logged test day" (writes only to an empty in-window date). Device-verified end-to-end. Mirrors Smart Tips' existing 0.5*BMR filter.
- 2026-07-08 AI ESTIMATOR FAVORITES fix (device-verified): favoriting an AI meal saved cal but 0 P/C/F (favorite-save read only FatSecret-shaped data, not the estimator's flat macros) AND re-logging silently name-matched a FatSecret product, snapping serving/macros/micros onto a meal the AI never produced them for (TWO name-search doors: openFoodDetail at nav time + food-detail's own resolveServings effect after mount). Now AI favorites stay pure to their estimate: real cals + big 3, no enrichment, gated on a persisted aiEstimated flag. Recents already excluded AI by design; My Foods save was already fine; non-AI stale-food name-search recovery untouched. ALSO shipped same session: AI foods now render as "1 serving" (not a bogus "Amount (g): 100"/"1g") by riding the existing serving-only recipe path -- one isServingOnly flag gated on aiEstimated feeds the synthetic serving + display/save branches, so non-AI foods are byte-for-byte unchanged; favorites get a 1-serving existing-value basis via mapFav. AND food-detail's save was dropping the aiEstimated flag, so a re-logged AI favorite lost its badge + serving display + name-search immunity -- now preserved on save. All device-verified (edit-entry + favorite re-log + serving stepper math + non-AI regression).
- 2026-07-07 CARDIO PRs in the View Summary recap (parity with lift PRs). Per-DRAWER records (activity type + indoor/outdoor, never lumped): today's best distance + duration vs the prior all-time best for that drawer -> lines in the SAME amber trophy block as lifts ("Outdoor Walking: New furthest 2.10 mi / New longest 42:15"), header counts lift + cardio. Bar = "beats prior best" so it's idempotent + self-healing (delete from Health -> recomputes). Calories excluded (noise). Apple-synced only (manual cardio lacks per-session history). New utils/syncedWorkouts.detectCardioPRs; detection on Finish via cached fetchSyncedWorkouts(365). ALSO: date (with year) added to the library RECORDS tiles ("SET" sub-row mirroring the AVG format). personal_records tooltip + Otto KB taught cardio records (deployed). Best pace + calories-as-PR PARKED with running (SPEC_apple_workout_library.md). Pure JS; device verify pending.
- 2026-07-07 SYNCED WORKOUTS perf + naming: (a) stale-while-revalidate cache (pj_synced_workout_cache, device-local raw sessions) so the Library's Apple entries paint on first frame instead of popping in after each native queryWorkoutSamples; (b) the Workout tab now labels Apple entries via syncedGroupLabel like the Library, so walk/run/cycle/swim/row split Indoor/Outdoor + a guarded retro-cleanup relabels existing bare-default entries in place (name is display-only for Apple cardio -- no PR/summary/dedup keys off it). Pure JS. Committed 4ffe93a.
- 2026-07-07 GYM LIST (Items 1-5 all shipped) + extras. (1) Modal keyboard overrun: Add/Edit Exercise + workout-library Add modals now height-cap the card between the safe-area top and the keyboard (internal ScrollView + flexShrink) so the top never crosses the Dynamic Island and Cancel/Save stay scroll-reachable; name fields got autoCorrect/spellCheck off (kills the autocorrect-highlight bleed); stats streak modal didn't overrun (just handle-to-top + double-dash copy fix). (2) Recipe Edit Entry: extended nutrients now forwarded from the entry's flat fields (food-detail already displayed them; log.tsx wasn't passing them) -- fixes old + new; serving-only recipes (no total weight) drop the bogus "Amount (g):100" for a working Servings stepper (nominal 1-serving unit, rescales nutrition, preserves "(N servings)" name on save), weight recipes still show real grams. (3) Library-food tap loading state (row dim + spinner while openFoodDetail awaits FatSecret). (4) Food library tabs reset scroll to top on switch. (5) Recipe ingredient hand-off: builder clears the shared pj_pending_ingredient slot on first focus so an abandoned add can't leak into the next recipe. EXTRAS: inline Add Exercise button beside View Summary (one row); FAB text-label pills got the 2px bgPrimary ring app-wide (14 pills / 5 files). All device-verified.
- 2026-07-05 Halo knows the reading plans + devotionals (discuss + recommend): Halo can now see the full catalog and (a) discuss any plan/devotional accurately when asked (what it covers, length, fit) and (b) proactively offer ONE when it genuinely fits a conversation, done SPARINGLY, engage-first, once per convo, tier-aware (lighter for Exploring), only real titles, "Need a word right now" set flagged for acute distress. Built the OTTO way (self-syncing, NOT hand-maintained): CompanionChat.tsx builds a compact catalog from the LIVE READING_PLANS + DEVOTIONALS data and sends it with every message; faithCompanion accepts it (6k cap) and buildSystemPrompt appends the static discuss/recommend RULES + the injected catalog (absent-catalog = old behavior, so version skew is safe). Rides in the cached system prompt (identical per app version). Deployed. Client is pure JS (reload). Tier-1 only: recs are verbal, NOT yet tappable pills (possible Tier-2 later). Optional future: include enrolled-state so Halo can say "pick Anxiety and Peace back up."
- 2026-07-05 [BUG FIX] Active-cal goal false pop (burn-accuracy race): the home active-cal goal could fire against UNADJUSTED calories because burnAccuracyPct defaults to 100 and loads async, and the goal-check effect neither waited for it nor depended on it (so an early HealthKit read at the default 100% fired the goal, then the display recalculated to the real 80%-adjusted number, e.g. raw 525 -> shows 420 but the 500 goal already popped). Fix: added a burnAccuracyLoaded flag (a bare value of 100 is ambiguous: real vs not-loaded), gate ONLY the active-cal goal check on it, and add burnAccuracyPct + the flag to the effect deps so it re-evaluates once the real value lands. Steps/water/exercise untouched. Already-banked false hits are NOT auto-reversed (the parked goal-un-cross problem). Possible parallel issue in the historical goal-day scan flagged for a separate look. Pure JS.
- 2026-07-05 Halo chat aesthetic port (matches Otto): Halo's chat now carries the same treatment as Otto's pass: theme gradient wash behind the chat (0.55 opacity, clipped to the rounded panel), MountFade fade+slide-up entrance on every bubble, STAGGERED typing dots (was a unison pulse), and an identity avatar left of Halo's messages (her GOLD CROSS, mirroring her header badge, the faithful translation of Otto's sparkle) with the old redundant gold left-bar dropped. Her bubbles stay gold-tinted (her identity). tsc clean. Pure JS.
- 2026-07-05 Achievement pop-on-action (workout + sleep): workout badges (First Workout, program/routine milestones) and sleep badges now pop the INSTANT you earn them instead of waiting for the next app-open. Added a force bypass to the once-per-day gate on checkWorkoutAchievements / checkSleepAchievements (mirrors the nutrition/momentum pattern), passed ONLY at genuine action sites: add/edit exercise + load program + save routine, and manual sleep save. App-open sleep sync + dev-tool checks stay unforced. Unlock is idempotent so a forced re-run can't double-pop. Food + streak badges already worked this way; this brings the last two in line. Pure JS.
- 2026-07-05 View All Achievements button (Stats): full-width VIEW ALL ACHIEVEMENTS button at the bottom of the Records section (trophy icon, accent-blue style, routes to /achievements) so the page isn't only reachable via the buried header trophy. Pure JS.
- 2026-07-05 Apple Health permissions via Otto: in-app "Manage in Settings" hotlink was KILLED (Linking.openSettings only reaches the app's generic iOS page, which has no Health row; iOS exposes no deep-link into the Health data-access screen). Resolved instead by fixing Otto's KB to give the correct manual route (Settings > Privacy & Security > Health > Project J, then toggle data types) and never point at the app's iOS page or the in-app Health section. Deployed.
- 2026-07-05 DECISION (card gradient wash): rollout stays PAUSED where it is. Gradients are applied where Justin wants them (home + summary surfaces via GradientCard) and the look is approved as-is. Do NOT roll it out further and do NOT touch existing gradient code. Removed from the active high-priority queue so it stops resurfacing as "what's next."
- 2026-07-05 EvR saved-reports list cleanup (quick win): the SAVED REPORTS list on the Effort vs Results screen rendered all up-to-15 reports as full rows (long scroll). Now shows the current + 3 recent loose, then a dropdown ROW ("N older reports" + chevron, styled like a report row for consistency w/ the Summaries dropdowns) that expands/collapses the rest. Chose a dropdown over month/week buckets deliberately: EvR reports are on-demand, deduped 1/day, capped at 15 and recency-matters, so month grouping would fragment into 1-report buckets and bury the newest. Storage was already 15-capped; display-only. Pure JS.
- 2026-07-05 Bedtime "Worth watching" contradiction fixed: the Bedtime metric status was computed on the FULL bedtime stdev (>60 min -> Variable) while the card DISPLAYS a trimmed 10th-90th percentile range, so one 2 AM night (already trimmed out of the shown range) could still flip the status to "Worth watching" -- a tight range with a scary badge. Now consistency is judged on the SAME trimmed span the card shows (bedHi - bedLo): <=60 min Consistent, <=120 Mostly steady, >120 Variable. Aligned the sleep-coach "steadier schedule" nudge to the same trimmed span + >120 threshold (was full stdev >60) so the coach can't contradict the row either. Removed the now-dead full-stdev computes. Tooltip "Bedtime consistency" is conceptual (no threshold cited) so it stayed accurate. Pure JS. (Bonus: no longer nags over a single late night -- a pattern flags, not one slip.)
- 2026-07-05 Summaries producer (Otto hub): when checkAndGenerateWeeklySummary / checkAndGenerateMonthly actually produces a fresh summary, it now drops a 'summary_ready' hub notification deep-linking to it (weekly = calendar/blue -> /weekly-summary; monthly = stats-chart/purple -> /monthly-summary; stable id per period so no dupes; silent on an empty week/month). Category + route-tap already existed in the hub. Dev seed ("Add sample notifications") gains a solo summary card to eyeball it today (real trigger only fires Sunday 5am+ / 1st 5am+). Awaiting real-trigger verify (Sunday/1st).
- 2026-07-05 Notification hub polish (2 quick wins): (1) solo (non-stacked) notification cards now cast the same shadow the collapsed group cards do, so they float instead of sitting flat (nested cards inside an expanded group stay flat on purpose); (2) Day Summaries archive month-grouping -- once past 8 weeks, weeks collapse under Month headers (newest month open, older collapsed); under 8 weeks stays a flat week list. Device-verified 2026-07-05 (shadows + threshold).
- 2026-07-05 Daily Goals card count fix: the card was showing the lossy real-time tally (pj_goal_hit_counts) that misses backfilled/edited days and never decrements, so it disagreed with the badge progress bars (water 34 vs 35, steps 10 vs 23). Now the card's COUNT comes from the shared historical recount (utils/achievementProgress.loadProgressValues, same source as the badge bars + Otto) so they can't diverge; extended that scan to also count active-cal + exercise-min goal-days (Home-screen thresholds; active falls back to caloriesBurned, exercise via effectiveExerciseMinutes). Tally kept only for the "Last earned" date label. Device-verified 2026-07-05. KNOWN MINOR (left on purpose): the transient goal-hit celebration toast still uses the live tally count, so it can flash 1 off the card; not chased (transient, not the persistent display).
- 2026-07-05 Otto chat aesthetic pass: the chat modal was the app's one flat-white surface, now on the theme gradient (rendered at 0.55 opacity over the sheet so it's a gentle wash, not the full page gradient; theme-safe softening). Plus staggered "typing" dots (were fading in unison), a fade+slide-up entrance on every bubble (MountFade), and a small Otto sparkle avatar left of his messages (dropped the redundant teal left-bar). Also fixed Otto refusing workout-ideas questions ("what's a good chest workout" -> "outside my wheelhouse"): training/exercise suggestions are explicitly IN his scope, so the system prompt now tells him to answer with real movements then bridge to building a routine in the Workout Library (deployed). (Markdown-strip on replies shipped earlier w/ dataset #6.) Device-verified 2026-07-05. Gradient is a one-number opacity dial if it needs nudging.
- 2026-07-05 Otto journal + prayer (on-demand dataset #7, LAST in the thread): new utils/companionJournal.ts attaches, ONLY on an explicit journal / reflection / gratitude / prayer question (deliberately NOT hooked to whole-day recall, so private content never leaks into "what did I do on X"), the user's own reflections (pj_bible_reflections: recent ~15 entries = date + category + title + ~240-char excerpt) + prayers (pj_prayers: active + answered w/ dates). PRIVACY-handled: faith-tier gated (a "Not Right Now" user gets prayers + faith journal categories withheld, personal journal only); entries excerpted not dumped; KB tells Otto to treat it gently/warmly, summarize themes not recite, never invent an entry, point to the Journal/Prayer screen for full text, and answered prayers are a tender moment. KB taught, deployed, wired into AssistantChat. Isolated tsc clean. Device-verified 2026-07-05. >>> This COMPLETES the Otto on-demand data thread (PRs, per-lift trend, recent workouts, food, sleep, body, achievements, journal/prayer). Only later-optional add: full per-metric streak tiles (needs the Stats streak engine extracted first).
- 2026-07-05 Otto achievements (on-demand dataset #6): new utils/companionAchievements.ts attaches, on achievement / badge / earned / goal-day messages, the user's ACTUAL earned set (pj_achievements, grouped by category + dates + ×count) AND live progress toward every badge family. Progress comes from the Achievements screen's OWN scan, extracted VERBATIM into new shared utils/achievementProgress.loadProgressValues (screen now imports it too = one source of truth), so Otto's "23 of 50 step-goal days" equals the screen's progress bar exactly. Flips the old KB rule ("you do NOT have their achievement data") -> Otto now answers "what have I earned" AND "how close am I to X" precisely. Device-verified 2026-07-05 (Well Worn "23 of 50, 27 more" correct). Scoped OUT: full per-metric streak tiles (Stats > Streaks = 200+ lines un-exported inline logic; logging streak already in snapshot, KB routes rest there). DELIBERATELY dropped the Daily Goals live-tally from Otto: it's a lossy real-time counter that lags the recount (water 34 vs 35, steps 10 vs 23), so Otto uses the recount everywhere (matches the badge bars); the tally/recount mismatch on the Achievements SCREEN is a separate app bug now in NEXT UP. Also fixed: Otto replies now strip stray markdown (**bold**/`code`) client-side in AssistantChat (Haiku ignored the plain-text instruction). KB rewritten, deployed, wired in. Isolated tsc clean. Remaining on-demand thread: journal/prayer entries (PRIVACY-sensitive)
- 2026-07-05 Otto body measurements (on-demand dataset #5): new utils/companionBody.ts attaches, on measurement / body-part / body-fat messages, the user's actual logged tape measurements from pj_body_measurements. Tier 1 CURRENT = each logged field's most-recent value (in their unit) + how long ago + "may be out of date" >30d + delta since first entry, plus latest Navy BF%. Tier 2 HISTORY = each session newest-first (date + field count + BF%). Uses the Body Measurements screen's OWN helpers so numbers match Stats > BODY exactly. Deliberately NOT weight (snapshot already has weight) and NOT hooked to isDayRecall (measurements are sparse, not daily). Trigger = field/measurement/BF word + ask/possessive. Full history (bounded 24 sessions / 4k chars), not 30-day windowed. KB taught (BODY MEASUREMENTS HISTORY entry under Stats > BODY), deployed, wired into AssistantChat. Isolated tsc clean. Device-verified 2026-07-05. Remaining on-demand thread: achievements/streak detail -> journal/prayer (privacy)
- 2026-07-05 Otto sleep + recovery history (on-demand dataset #4): new utils/companionSleep.ts attaches, on sleep/recovery or whole-day-recall messages, the user's actual logged nights last 30 days. Tier 1 = per-night line (sleep score, duration, deep sleep, + recovery score / HRV / RHR when present) via stitched loadWindowDays (matches app). Tier 2 = full stage breakdown (deep/REM/core) + all recovery signals (HRV/RHR/Resp/SpO2) for a NAMED night, from the raw day record. Reuses shared isDayRecall + resolveNamedDays (now exported from companionFood). Wearable-aware (explains missing watch data warmly). KB taught, deployed, wired into AssistantChat. Snapshot already has last night + 7-night avgs, so this fills a SPECIFIC past night / night-by-night trend. Device-verified 2026-07-05 (specific night, single metric, named-night stages, HRV, week trend all correct); fixed one bug: "last night" wasn't resolved to a date by the shared resolveNamedDays, so stage detail didn't attach for "sleep stages last night" -> now maps last night/tonight to today's wake-day record in the sleep builder. Remaining on-demand thread: body measurements -> achievements/streak -> journal/prayer (privacy)
- 2026-07-05 Otto food log history (on-demand dataset #3): new utils/companionFood.ts attaches, only on food / whole-day-recall messages, the user's ACTUAL logged nutrition. Tier 1 = per-day TOTALS last 30 days (calories, P/C/F, fiber/sugar/sodium, water), pulled via STITCHED loadWindowDays (offsets 0/14/28 -- its internal window is only 14) so numbers are IDENTICAL to the app's exclusion-aware math. Tier 2 = ITEMIZED foods per meal, only for a day the user NAMES (resolveNamedDays parses yesterday/today, weekday, "June 24", "6/24", "the 24th"); the only gated piece b/c food names are unbounded text. Oldest-first char-budget trim, [this week] marked, today partial. Snapshot already has today + 7d avgs, so this is for a SPECIFIC past day / day-by-day trend. Day-recall detector extracted to shared companionWorkouts.isDayRecall (both workouts + food hook into "what did I do on X"). KB teaches the block + routes past-day lookups to the LOG TAB date picker first (Stats/Home calendar backup). Wired into AssistantChat, deployed. ACCURACY FIXES (device-verified 2026-07-05): (1) carbs now shown NET (total - fiber - sugarAlcohols) when the user's showNetCarbs setting is on, so they match the Log tab's Today's Total card (was showing gross e.g. 225 vs card's 219); (2) itemized food list now attaches ONLY on a "what did I eat / foods / for lunch" LIST intent, not on a totals question -- fixes both a token-waste AND a Haiku bug where, given the item list, it re-summed and mis-stated the day total (said 1929 vs real 1899); (3) KB + block tell Otto to QUOTE the daily-line total verbatim, never re-add items, and answer a single-nutrient day question cleanly (no 7d-avg / "no itemized data" clutter). All 4 retests passed. Remaining on-demand thread: sleep history -> body measurements -> achievements/streak -> journal/prayer (privacy)
- 2026-07-05 Otto recent workouts (on-demand dataset #2): when a message is about recent training (what did I do yesterday / on July 2 / last chest day / on Monday, how a session went, "how many squat sets this week", frequency counts), utils/companionWorkouts.ts attaches a compact summary of the user's ACTUAL logged sessions over the last 30 days (newest first): per day = focus label + each lift's completed sets & top set + any cardio/walk/class/custom, days in the current week marked [this week]. Cardio & everything logged included (not lifts-only). Bounded by TIME + a ~7k-char budget trimmed OLDEST-first (no session cap -- 3-4x/day loggers never lose this week / yesterday). Wired into AssistantChat alongside the PR block; KB taught + deployed. INTENT filter is the whole game (took several passes): it now fires on the full "what did I do on [date]" phrasing, verb-less conversational FOLLOW-UPS ("what about July 2", "and July 3?", "how about Monday"), and short/bare date msgs -- earlier misses were all the filter silently dropping the message (never a data/builder bug). Bare whole-day "what did I do on X" answers the TRAINING from the block + points to Calendar for the rest (meals/sleep), and this is the shared day-recall hook future datasets plug into. KNOWN LATENT GAP (not yet fixed): the builder's lift branch needs manual done sets, so an Apple STRENGTH/CORE/FUNCTIONAL session (non-cardio, auto-checked, no manual sets) would be skipped -- fix = include any checked/completed exercise even w/o sets; do when a strength session actually exists to test against. Remaining on-demand thread: food log history -> sleep -> body measurements -> achievements/streak -> journal/prayer (privacy)
- 2026-07-05 AI-estimator mic HIDDEN: voice dictation was cut, so removed the "coming soon" mic button from ai-meal-estimator.tsx (description field now full-width, no dead half-feature shipping to testers)
- 2026-07-05 Otto workout history (on-demand, per-lift trend / meat-on-the-bone dataset #1): when the user NAMES a lift in a lift question, the conditional PR injection also attaches that lift's RECENT SESSIONS (last 8 top sets, newest first, via liftSessionHistory) so Otto can describe how it's trending ("185 -> 195 -> 205 over your last three benches"). Bounded to the named lift(s). KB updated + deployed. Next in this on-demand thread: recent-workouts B ("what did I do last chest day"), then food log / sleep / body / achievements / journal
- 2026-07-05 Otto PR data (conditional injection): Otto can now answer "what's my bench PR" with the real number. New utils/companionPRs.ts detects a PR question (generic PR words OR any of the user's own lift names/typo-tolerant) and, ONLY then, attaches the user's FULL history-backed PR list (heaviest set + est 1-rep max per lift, ghost-filtered) to that one request's data snapshot; costs nothing on unrelated messages. Otto does the fuzzy lift-name matching itself. Also attaches the user's full REAL-exercise list (live UNION of pj_exercise_library + every exercise in their programs/weekly template + PR'd lifts, re-read each message so custom / routine-quick-add / renamed exercises are always current) so Otto distinguishes a real lift with no PR yet ("Cable Press") from a made-up name ("Push Button") instead of implying it exists. KB guard updated. Deployed. Pattern to reuse for the other on-demand datasets
- 2026-07-05 Faith aesthetic pass: dropped the cream/eggshell CARD wash on the Faith tab cards (Gratitude, Bible & Plans, Prayer) + the Plans page card -> theme.bgCard so they match the rest of the app. WARM theme keeps its cream (needed so cards lift off its warm page); dark was already = bgCard (no visible change). Every amber accent stays (borders/icons/buttons/prayer boxes/verse ref). Today's Message + Faith Hub home base color untouched. Prayer page left as-is on purpose (its only cream IS the amber prayer boxes, which stay). Also removed the amber top-gradient on the Faith home card on DARK only (it muddied the top). Warm-theme + full 5-theme device audit still pending
- 2026-07-04 PR home polish: (1) ghost-PR fix: All PRs + per-lift Records now only show records backed by SURVIVING logged history, so a PR from a deleted workout no longer lingers (non-destructive display gate); (2) All-PRs card redesign to two value tiles (heaviest set / est 1-rep max) with date up in the header, tighter cards, taller scroll; same two-tile style mirrored in the detail Records section; (3) Otto route: added pr_home route key + client trigger + prompt so Otto's "where are my PRs" reply now shows a tappable pill to the All PRs list (deployed)
- 2026-07-04 PR HOME (records Piece B): Exercise Library gets a "PRs" button (top-right) opening an ALL PRs modal (per-lift heaviest set + est 1-rep max + date, sort Recent/A-Z/Z-A, tap a card into that lift); each lift's detail modal gets a "Records & History" section (records + session-by-session history, empty state when none). New utils/liftPR.liftSessionHistory + tests (26 total pass). Otto "New PR" card now deep-links here (openPRs param); Otto KB updated + deployed. Modals mirror the existing workout-library modal pattern exactly. Otto still does NOT get the user's actual PR numbers (see follow-up)
- 2026-07-04 PR wording + explainer (records #2): recap + Otto card reworded ("New heaviest set: 140 lb × 5" / "New estimated 1-rep max: 163 lb", identical in ALL modes, Otto card now 3 clean lines); new 'personal_records' tooltipRegistry entry (auto-lands in glossary) + (i) on the recap trophy card; Otto KB taught PRs/1-rep max (deployed). New standing rule in CLAUDE.md: every behavior change updates Otto's KB too
- 2026-07-04 PR revoke + honesty (records follow-up #1): PRs now DERIVE from logged history (new pure engine utils/liftPR.ts, 21 unit tests) instead of ratcheting-and-sticking, so unchecking/editing/deleting a set (or deleting the exercise) recomputes the lift's best and rolls back a record it no longer earns. "up from" now shows the true prior best (not a same-session intermediate). A protected floor keeps records with no surviving logged history (dev seed / deleted-program PRs). "View Summary" no longer computes PRs (one writer). Device smoke-test PASSED
- 2026-07-04 Otto PR producer (records, Piece A): lift PRs now bank the moment a qualifying SET is checked (not gated behind View Summary; partial sessions count) -> real "New PR" hub card (grouped, Mindful-aware) + recap trophy reads recorded day-hits. New pj_workout_state.prHitsByDay field (additive). Dev tool: "Seed lift PR baselines". Tests 1-3 PASSED on device
- 2026-07-04 Nutrition-achievement mis-timing fix: reverted the #2 force on the NUTRITION check (calorie-goal achievements only count COMPLETED days, so a same-day log can never complete one; forcing it popped legit past-day badges mid-meal). Momentum force kept. NOTE: nutrition check always scores history vs your CURRENT calorie/pace target, so changing your weight pace reshuffles the count (by design)
- 2026-07-04 Achievement pop-on-action timing fix: momentum + nutrition checks take a force flag that skips the once/day gate; food-detail AND recipe-log pass it after a log, so a same-day threshold pops now instead of a day late (idempotent, app-open unchanged)
- 2026-07-04 Bug fixes from Adaptive Target entry point work: adaptive-target.tsx bg (theme.bg typo -> theme.bgPrimary) + missing Stack.Screen headerShown:false (was showing double/raw-filename header); black title/header text -> dimmer tokens (matches app-wide header convention); Sleep Goal wheel picker now re-syncs to the saved value on Cancel; Settings > Goals floating save bar padding no longer cut off by home-indicator curve; Otto FAB now animates up to clear any screen's floating save bar (Settings Goals + Profile) instead of sitting under/blocking it -- new utils/floatingBar.ts signal
- 2026-07-04 Adaptive Target permanent entry point: "Check My Target" row in Settings > Goals, next to Auto-Adjust toggle, pushes to /adaptive-target for a live read of current status
- 2026-07-04 Notification-hub explainers: panel (i) tooltip + full interactive tour (modal-scoped spotlight inside Otto); Adaptive TDEE glossary tooltip + (i) on the Your Target screen
- 2026-07-04 Defect F: non-wearer coaching pivot (getWearState/isLikelyWearer + Recovery-tab whole-screen empty state)
- 2026-07-04 Adaptive TDEE (wearable Phase 2): scale-based real-burn estimate + suggested calorie target, weekly-gated, suggest-by-default via Otto hub
- 2026-07-04 Otto notification hub Phase 1: badge + bell + panel, achievement + daily-goal producers
- 2026-07-03 Otto knowledge base v2 FULL (deployed); UTC->local achievement-gate fix; Apple-cardio timestamp fallback; AI-estimator mic interim toast
- 2026-07-01 Security: all direct third-party API calls moved behind Cloud Functions (Anthropic proxy + FatSecret proxy)
- 2026-06-29 HR-zone bar snap-back fix; splash-flash fix; protein-pattern card copy; water delete/edit + bar-length + goal-hit fixes (pending fresh-build verify below)
- 2026-06-17 Recovery home card SHIPPED: two-face Sleep/Recovery carousel on the home screen (auto-cycles, homeRecoveryScore + activeSleepFace, write-once compute that mirrors the recovery freeze). This closes the "Recovery home card" high-priority track. Detail in git/archive.
- 2026-06-15 Metric drill-down system SHIPPED (Recovery first): tap any metric -> focused MetricDrilldownModal (what-it-is / how-calculated / what-affects / how-to-improve + per-metric 7/30d trend mini-graph); metricDrilldowns registry, wired on sleep + home + log. Closes the "Metric drill-down" track for the Recovery/sleep metrics. Detail in git/archive.
- 2026-06 (older shipped work: At a Glance makeover, empty-state audit + presence helper, wearable Phase 0/1, Today's Message overhaul, sleep-stages graph, comparison presets, reinstall auto-restore, etc.) -> see archive

---

## ⏭️ NEXT UP (THE single ranked work queue -- READ THIS TOP-DOWN whenever Justin asks "what's next")
Ranking IS the priority: [NOW] items are committed, do them first. Below them: active tracks, then QUICK
WINS. Items graduate UP here from the backlog sections so good ideas don't rot down there. When something
ships it leaves this list. Always offer at least one QUICK WIN when Justin asks what's next, and pull a
stale backlog item up now and then. The launch gates further down (REVERT BEFORE LAUNCH, LAUNCH BLOCKERS)
are separate pre-submission checklists, NOT part of this menu.

- [TRACK, LAUNCH-CRITICAL, decisions LOCKED 2026-07-11, ready to BUILD] MONETIZATION / "Support the Mission."
  Must be built + functional before public release; NO purchase flow exists yet ("Pro" is faked by the Settings
  dev toggle). LOCKED: name = Supporter; price = $6.99/mo + $69.99/yr (no trial); caps = Otto 10/25, Halo 25/25
  (faith never upcharged), Estimator 5/100, Reports + Day-vs-Day Supporter-only, Smart Coach free-for-all; tip
  jar = $2.99/$4.99/$9.99 + $24.99 (Concept C, first-person humble voice, "why" copy drafted); recognition =
  gold sprout badge + gold-thread cosmetics (app icon/avatar ring/badge) + flat + hand-written thank-you
  (RevenueCat webhook -> email Justin), faith cross skin for Rooted; Patron DEFERRED; payment infra = RevenueCat
  (free to ~$2,500/mo, then 1%); Tier-1 usage monitoring launch-required + Tier-2 cost rollup to build. Resolves
  REVERT #2-#5. STILL OPEN: the COPY pass (final user-facing strings) + the actual BUILD. Full detail, cost math,
  build checklist, monitoring plan: SPEC_monetization.md.
- [TRACK, DESIGN LOCKED 2026-07-08, ready to build in slices] CALORIE FLOOR / low-target safeguard
  (gym #1, the health-safety gap). NEVER hard-blocks -- Option B "warn + consent," the real target
  always shows. Three zones via two sex-based lines (Men whisper<1500 / modal<1200, Women whisper<1200
  / modal<1000): green = silent, whisper = inline caution under the target, modal = one-time
  acknowledgment. The modal only ever offers a fix that's REAL for that person (pace lever + activity
  lever) -> 4 branch cases, copy LOCKED + ED-aware (never references body size). Loss goals only;
  manual targets warn not block. Full spec + the 4 modal scripts: SPEC_calorie_floor.md. Build order in
  the spec. >> SLICES 1-3 BUILT + device-verified 2026-07-08 (pure JS): (1) utils/calorieFloor classifier + 31 unit
  tests, wired into loadCalorieTargets (additive, calTarget unchanged); (2) inline amber caution on profile Your
  Estimates card AND under the Weekly Pace picker (both spots); (3) components/CalorieFloorModal 4-case branched modal
  off the pace picker, buttons wired (slower-pace jumps to fastest safe pace, adjust-activity scrolls, set-maintenance,
  continue = ack), persistence pj_calorie_warning_acknowledged (only re-asks if target drops BELOW what was okayed).
  Core is COMPLETE (no Mindful variant -- decided out, copy is mode-agnostic). Separate follow-ons: pace granularity
  (.25/.75), activity nudge, onboarding activity wording. Full detail: SPEC_calorie_floor.md.
- [TRACK, design LOCKED 2026-07-07] Apple Workouts in the Exercise Library (lean "Synced Workouts"
  history) -- give Apple-synced cardio a home in the library, keyed by activity type + indoor flag,
  auto-created on first sync, rename = editable label (never re-keys), green "Apple Health" badge,
  HIDDEN from the add-exercise picker, backfill existing sessions, additive/display-only (no counting
  changes). Cardio PRs PARKED (see spec). Full spec: SPEC_apple_workout_library.md. Chosen OVER the full
  Sessions rearchitecture (SPEC_workout_sessions.md). Build after the gym list.
- [TRACK, VISION LOCKED + SPECCED 2026-07-07 -> ready to build] Custom Reports (Pro). Model: report =
  date range (week/month/3mo/6mo/1yr/custom) + chapters, each a PICKER into a library of ~55 pre-designed
  blocks the user assembles freely; templates = pre-filled block sets; exportable (PDF/share); Pro-gated
  (free = no access; faith DATA still free elsewhere); Mindful + faith-tier aware; wearable-gated blocks.
  Premium is protected because WE design every block (user picks WHAT, never HOW it looks -- not a build-
  your-own chart tool). Phase 2 = AI prompt that ASSEMBLES blocks from plain language (blocks are the
  foundation it needs). Full detail + tiered block catalog: SPEC_custom_reports.md. Live light-theme/cyan
  mockup built this session. NEXT: rank blocks Core vs Wave 2, pick launch templates, storage + export tech.
  >> SLICE 1 BUILT 2026-07-07 (foundation, testable end-to-end, pure JS no rebuild): utils/reports.ts
     (pj_reports store, additive) + utils/reportBlocks.ts (block registry + 7-chapter taxonomy) + app/
     reports.tsx (hub: list/new/delete, beta-open to all) + app/report.tsx (report screen: range chips +
     block picker + 3 purpose-built renderers -- gradient SVG line trend, stat tiles, macro bar, all live
     from fetchTrendData) + Stats > Reports entry card. 3 starter blocks: Weight trend, Nutrition headline,
     Macro split. REMAINING: more blocks (grow the ~55), custom date range UI, export (PDF/share),
     templates, per-chapter faith-tier/wearable gating in the picker, tooltip + Otto KB. Device-verify pending.
- [FOLLOW-ON TO DISCUSS, from Repeat a Meal which SHIPPED 2026-07-10] "SAVE AS A MEAL" = save a group of
  distinct foods as a named, reusable one-tapper (Justin curious). Differs from a Recipe: a recipe BLENDS
  ingredients into ONE food line (single entry, loses the items); a meal keeps the foods as SEPARATE
  entries logged together. Repeat a Meal already re-logs separate entries from history; this would persist
  a named bundle. Needs its own design pass (look/behavior, where it's saved + surfaced, how it lives
  alongside recipes without confusing the two). Full spec context: SPEC_repeat_meal.md bottom section.
- [x] Otto on-demand data access thread -- COMPLETE 2026-07-05 (one dataset at a time, conditional-injection pattern from utils/companionPRs.ts). SHIPPED: PR values + real-exercise recognition + per-lift TREND + recent-workouts (30-day sessions) + food log (30-day totals + named-day items) + sleep + recovery (30-day nights + named-night detail) + body measurements (per-field value/age/delta + Navy BF% + history) + achievements (earned set + live badge progress via shared achievementProgress scan) + journal/prayer (recent entries + prayers, privacy + faith-tier gated). All device-verified. OPTIONAL later add: full per-metric streak tiles (needs the Stats streak engine extracted into a shared util first). Did NOT build true LLM tool-use (Haiku too flaky); revisit only if Otto moves to a stronger model.
- [x] FAB contrast/border (GLOBAL) -- COMPLETE 2026-07-05. "bg ring" recipe = borderWidth: 3, borderColor: theme.bgPrimary on the FAB circle (invisible moat over the page, visible ring the moment it overlaps a same-accent button). DONE across every real page FAB: Otto FAB (AssistantFAB) + Workout tab (main + 2 subs) + workout-library (main + 3 subs) + stats (main + 3 subs) + add-food (main + 3 subs) + body-measurements + bible + journal + prayer + Halo (CompanionFAB, SVG special case: drawn page-colored Circle ring at r=DISC/2-1.5 instead of a border, now theme-aware). The other roadmap-listed files had NO floating page FAB (settings/profile/AssistantOverlay = the global Otto FAB already done + save bars; ai-meal-estimator/AddPrayerModal = none; CompanionChat/AssistantChat send buttons = in-bar, not overlap-prone, intentionally excluded). Awaiting 5-theme x all-accent device audit before fully closing the visual gate.
- [ ] [FIX, data-integrity, needs reinstall verify] Achievement unlockedAt reinstall hardening. Badges
  stamp unlockedAt = new Date() at award time (achievementData.ts:1420); on a reinstall before the cloud
  restore lands, a check can first-unlock against an empty store and re-stamp the whole earned set to
  "today" (this is the June-22 clump on Justin's test account). Achievements ALREADY sync via storageSet +
  the reinstall auto-restore + checkAndUnlock is idempotent, so a proper restore preserves dates -- the
  residual is a RACE. FIX: gate achievement checks behind the restore-complete flag so no scan runs until
  the restore lands. Optional belt-and-suspenders: backfill unlockedAt from goal-day history for count-
  based badges. Touches the sync/restore/achievement flow -> do deliberately + verify with a device
  reinstall. (Surfaced via the Custom Reports "Achievements earned" block 2026-07-07.)
- [ ] STARTER CHALLENGE -> theme unlocks (Slate / Warm / Blush). The 3 non-default themes are meant to be EARNED
  by completing a short starter challenge (per CLAUDE.md theme system), but the unlock mechanic needs building /
  verifying. FIRST STEP = state-check what already exists (are the themes actually gated? does any challenge
  exist?) before building, so we don't assume. Keep the "no theme is EVER paid" rule intact -- these are earned,
  never bought (distinct from the monetization track). Surfaced 2026-07-11 (Justin flagged it during the
  monetization thread so it would not get forgotten).
- [RESOLVED 2026-07-12] EvR/home Coach Insight was rendering the 1-sentence deterministic FALLBACK instead of
  the AI voice. ROOT CAUSE: the coach tip's client-side timeout (API_TIMEOUT_MS) was 8s, too tight for the
  aiProxy round-trip (frequent Firebase cold starts + the large uncached RULEBOOK system prompt), so the callable
  timed out CLIENT-side and fell back, even though the Anthropic call SUCCEEDED server-side (aiProxy logs showed
  zero errors). The feed voicer survived because it uses a 20s timeout. Fix = raise the coach timeout to 20s
  (utils/coachAI.ts). Device-confirmed: full multi-sentence insights now generate. NOT the model, not a render
  truncation, not the snapshot logic. NOTE for testing: the EvR report SNAPSHOTS its coachInsight at generation
  (frozen forever), so an OLD report never updates; must generate a NEW report + use the "Reset Coach Tip Cache"
  dev tool to force a fresh regen. Also observed + explained (not a bug): after a fresh regen the headline
  rotated sodium -> carbs because selectByPrioritySpine applies a fatigue penalty to the recently-led topic (the
  anti-repeat rotation), which was invisible while the coach was stuck on the sodium fallback every day.
- [PARKED 2026-07-12, known limitation, do not keep prompt-tweaking] EvR ranked diagnostic card INSIGHT (the middle
  "why" sentence) occasionally comes out rambling/circular -- e.g. the sleep->workout card kept landing on "...the
  session you planned simply does not happen," which just restates the claim+proof and reads weird. INVESTIGATED:
  the insight is AI-voiced fresh each report (utils/coachAI.ts voiceDiagnosticCards + FEED_VOICE_RULEBOOK), so
  there is NO fixed string to edit; it varies (good version seen: "your body treats poor sleep as a recovery debt,
  skipped sessions are the first thing it trades away to pay it"). Root of the weird ones: on cards where claim +
  proof already state the outcome, the AI pads the insight by re-stating that outcome. TRIED TWICE (2026-07-12):
  two FEED_VOICE_RULEBOOK nudges (ban mechanisms/filler; then a coherence/no-ramble nudge that even quoted the bad
  sentence) -- BOTH slipped through; prompt-steering can't GUARANTEE an LLM avoids a phrasing. Both reverted; code
  is at the clean baseline. Justin chose to leave as-is (2026-07-12), accept the variance. IF revisited, the only
  RELIABLE (deterministic) fixes are: (a) a post-generation filter in the voicer that rejects insights matching
  bad patterns (whack-a-mole), or (b) DROP the insight sentence on these cards entirely (claim+proof+lever already
  stand strong) -- trade-off is losing the occasional good insight. Not a copy-string audit; it's an AI-output
  problem. Files: utils/coachAI.ts (FEED_VOICE_RULEBOOK, voiceDiagnosticCards, sanitizeVoicedLine).
- [QUICK-ISH WIN, raised 2026-07-13, Justin loved the result] PRIMARY BUTTON ROLLOUT. The Support screen's
  "Become a Supporter" CTA was rebuilt and is now the app's button standard, extracted to components/
  PrimaryCTA.tsx: a MOLDED look (true vertical light->dark gradient overlay, so it works with every accent
  with no color math -- the old "sheen" was a translucent band across the top half, which read as a two-tone
  slab with a seam), an ACCENT-tinted glow instead of a black shadow, Bebas caps type (DMSans bold = the same
  weight as body copy, so labels read as plain text on a colored rectangle), press-scale + a built-in busy
  spinner. RULE: solid fill = the ONE primary action on a screen; secondary actions keep the house tinted
  recipe. TASK = sweep the app for primary CTAs and swap them to <PrimaryCTA> (Justin: "I kind of want to go
  through the app and find buttons to change to this style"). Deliberately NOT swept yet -- do it as its own
  pass so each screen's primary-vs-secondary call is made deliberately, not bulk-replaced.
- [GOLD APP ICON -- ASSET DONE 2026-07-13, WIRING REMAINS] assets/images/icon-gold.png now exists: the shipping
  icon recolored to gold. Made in code, not by hand (a gradient map over the source's luminance, so every facet
  and highlight is preserved exactly -- the geometry is never redrawn). KEY LESSON if it's ever regenerated: do
  NOT try to mask the mark off the background. The background's vignette and the mark's dark facets occupy the
  same brightness range, so every mask leaks or punches holes (Photoshop's wand, flood-fill, and morphological
  closing all failed). Instead keep the ramp NEUTRAL below the vignette's brightness and start the gold above it:
  the background maps to itself, the mark's shadowed facets stay dark (they're dark in the silver original too),
  and only the lit metal turns gold. Ramp needs BROWN shadows + a WARM-WHITE specular -- a ramp of pure yellows
  reads as plastic. Script + variants kept in the session scratchpad. Chose the clean-background version over a
  gold-glow one: the glow looked rich at poster size but went muddy at 60px on a light wallpaper (icons are judged
  on silhouette contrast at thumbnail size).
  >> SHIPPED + DEVICE-VERIFIED 2026-07-13. expo-alternate-app-icons plugin (app.json, name "Gold"); a
  Supporter-ONLY toggle in Settings > Appearance (a locked row there would be a paywall sitting in the middle of
  appearance settings, and gold marks membership, never restriction -- a free user meets it as a perk on the
  Support screen instead); a POINTER row on the Support membership card that routes to it (deliberately not a
  second toggle -- two controls setting one thing is how settings drift apart); the "Custom Badge & Icon" perk now
  shows BOTH marks (gold sprout badge + gold app icon) because the perk promises two things; and the in-app
  LaunchSplash follows the ICON (gold icon -> gold splash), keyed on the icon rather than the entitlement to avoid
  a silver-then-gold flash while RevenueCat resolves. LAPSE GUARD in utils/appIcon.enforceIconEntitlement: a
  non-Supporter wearing the gold icon is reset to the default on next launch, so the perk can't outlive the
  membership. NOTE: iOS's OWN first frame (before any JS runs) is baked into the build and can never be
  personalised; only the second, in-app splash can. iOS also pops its own unavoidable "You have changed the icon"
  alert on switch. The icon is DEVICE-LOCAL (doesn't sync across a user's devices).
  LAPSE GUARD DEVICE-VERIFIED 2026-07-13 (and a real bug fixed in the process): it was originally in the Settings
  screen's effect, so it only fired if the user happened to OPEN Settings -- a lapsed Supporter kept the gold icon
  indefinitely, then had it change under them out of nowhere the moment they wandered in. Moved to
  MembershipContext (app-wide, on launch), gated on RevenueCat having RESOLVED -- during startup isSupporter is
  briefly false while the entitlement loads, and enforcing in that window would have ripped the icon off a valid
  Supporter on every single launch. Verified end to end: sub lapses -> next launch shows the gold splash (correct:
  the icon IS still gold at that instant) -> entitlement resolves -> iOS alert -> icon reverts -> toggle disappears
  -> next launch is fully silver. GOLD ICON TRACK IS COMPLETE.
- [EXPLORE, unspecced -- raised 2026-07-13 from the gym. Do AFTER the monetization/Support track closes.]
  Four raw ideas, ranked by how real they are. NONE are specced; each needs a design pass before any code.
  1. [MOST REAL] GOAL WEIGHT + GOAL DATE ("by when"). Today the user picks a PACE and the app derives the date.
     Invert it: let them pick a TARGET DATE too (e.g. "175 -> 162 by late January, when the baby comes") and the
     app back-solves the weekly pace + calorie target to land on that date. Uses math that already exists (pace <->
     deficit <-> target), just run backwards. CRITICAL SAFETY TIE-IN: an aggressive date can demand a deficit that
     drops the target under the calorie floor -- utils/calorieFloor + CalorieFloorModal ALREADY handle exactly this
     (warn + consent, never hard-block, offer the fastest SAFE pace), so the branch is built. Surfaces: onboarding
     + Profile. Open questions: what happens as the date approaches and they're off-pace (silently re-solve? nudge?),
     and the Mindful variant (a countdown to a weight is the most judgment-heavy thing in the app -- probably neutral
     or off). See SPEC_calorie_floor.md.
  2. COFFEE-SHOP DRINK BUILDER (Starbucks/Dunkin). A little calculator for custom drinks: pick the base + milk +
     syrup/sauce PUMPS, since calories per pump are fairly standard. Justin has hand-built these in Cronometer many
     times -- a real, repeated, personal pain point. Open: where does it live (Add Food? a mini-tool?), and where do
     the per-pump numbers come from (hand-curated table vs FatSecret).
  3. RESEARCH: MENUFIT (restaurant menus). Explore -- big fitness accounts rave about it. Figure out what it
     actually does well and what's worth stealing for restaurant logging.
  4. RESEARCH: TRAINERIZE. Explore/compare -- heard good things, never used it. Understand where it overlaps and
     where Project J is different.
- [ ] QUICK WINS (small, grab-when-convenient): none queued right now -- add here as they come up. (DONE 2026-07-07: FAB text-label rings app-wide · inline Add Exercise button · the whole gym list.)

---

## 🚨🚨🚨 REVERT BEFORE APP STORE LAUNCH 🚨🚨🚨 (TESTFLIGHT-ONLY HACKS - DO NOT SHIP)
>>> ⚠️ 2026-07-13: **LAUNCH_CHECKLIST.md IS NOW THE SINGLE SOURCE OF TRUTH.** It consolidates this banner, the
>>> LAUNCH BLOCKERS section below, and the launch-only notes in SPEC_monetization.md into ONE ORDERED list --
>>> ordered because several of these steps BREAK THE TESTERS if done in the wrong sequence (the beta caps cannot
>>> be reverted until testers are on a RevenueCat build AND have been granted the entitlement). Every item there
>>> was verified against the real source with file:line. Work from that file. The lists below stay for context.
Temporary for Justin's TestFlight testing (added 2026-06-24). EVERY ONE must be undone/replaced before a public release. Check this list at EVERY launch-prep session.
1. [RESOLVED IN CODE 2026-07-01] Anthropic API key was bundled client-side; now routed through the aiProxy Cloud Function (key server-side only, client grep clean). TWO TAILS STILL OPEN: (a) client change reaches testers only on the NEXT TestFlight build; (b) the previously-exposed key must be ROTATED (regenerate + revoke) after testers are on the new build, before public launch.
2. ⚠️ devProUnlocked = FREE UNLIMITED PRO. Settings dev toggle grants Pro with no payment. Before launch: gate Pro on a real subscription (RevenueCat/StoreKit) and REMOVE the override + toggle.
3. ⚠️ AI ESTIMATOR QUOTA RAISED. PRO_LIMIT bumped to effectively unlimited (services/aiMealEstimator.ts). Before launch: restore real caps.
4. ⚠️ BETA CAPS RAISED (2026-07-01). Otto FREE_DAILY_CAP 10->100/day; Halo 5->50/day; AI Meal Estimator FREE_LIMIT 3->100/month. All marked with loud BETA HACK comments. Before launch: revert to 10 / 5 / 3 (or final caps).
5. ⚠️ CUSTOM REPORTS OPEN TO ALL (2026-07-07). Reports is a Pro feature but REPORTS_BETA_OPEN=true in app/reports.tsx grants every TestFlight user full access. Before launch: gate on the real subscription + set false (the Pro-gate architecture is already in place, so it's a one-line flip).
6. [DEV TOOL, not user-facing] "Weight History self-test (dev)" row in app/settings.tsx dev tools (added 2026-07-10). One-tap self-test that seeds/edits/deletes throwaway far-back dates + asserts data-integrity/badge rules, auto-cleans. Same class as the other "(dev)" seed tools -- remove or gate them all behind a dev flag before public launch. Safe (only writes to confirmed-empty dates) but should not ship visible.

---

## 🚧 LAUNCH BLOCKERS
- App name + logo -- finalize from shortlist (Prevail, Steadfast, Worthy, Haven, Witness, Sown). Verify App Store + TikTok handle availability. Prevail is strongest.
- App Store Connect setup -- privacy label, age rating, URLs, description, screenshots, review notes. No code. Do after name is locked.
- Verification scan -- production build, device install, all flows confirmed before submitting.
- Anthropic account spend limit -- hard monthly spend cap in the console so AI cost can never run away (the final "sleep at night" switch on top of per-user daily caps).
- [RESOLVED IN CODE + DEVICE-VERIFIED 2026-07-01] Security #6: move ALL direct third-party API calls behind Cloud Functions. DONE (Anthropic + FatSecret). Same two tails as REVERT #1 (next build + key rotation).

---

## 🔎 POST-TRIP / PENDING FRESH-BUILD VERIFY
- [ ] WATER ENTRY DELETE/EDIT (data-loss fix): confirm deleting/editing a water entry no longer drops other entries. Fixed to re-read + reconcile storage and remove/edit only the targeted entry by timestamp. ⚠️ still live in the trip build until rebuilt.
- [ ] WATER BAR LENGTH: confirm the Home water bar fills correctly on cold launch (was stuck short every kill+reopen; fixed with a live pctRef).
- [ ] WATER GOAL ACHIEVEMENT: confirm hitting the water goal pops the trophy + marks the daily-goals counter today. Also watch whether daily-goal TOASTS actually pop for steps/active/exercise (suspected batch/no-pop).
- [ ] DAILY GOAL ACHIEVEMENTS: warm-app skip/batch still open (needs a goal-hit to verify; wrong-date fixed 2026-06-29). See archive for the 3-part breakdown.
- [ ] FIBER LABEL: EvR "food quality" card now reads "FIBER AVG/DAY" -- confirm.
- [ ] OPTIONAL HR ZONE BAR REDESIGN: one full-width segmented bar vs independent per-zone bars. Numbers honest either way; visual call.

---

## 📌 PARKED SMALL IDEAS (do when convenient)
- [ ] [NEEDS DESIGN] Goal-hit does NOT reverse when you delete the entry that crossed the goal (e.g. quick-add water over goal, then delete it -> still shows "achieved today"). Cosmetic (no data loss) BUT reversing is thorny: crossing a goal increments a LIFETIME count feeding goal achievements + streaks, so un-crossing means decrementing + possibly re-locking an achievement (fights "achievements never revoke"). Do NOT bolt on a naive reversal.
- [ ] Achievement "pop on the action" timing: action-earned achievements don't pop until next app-open (per-category check gated once/day, runs on open before the action). Fix: run the check right after the qualifying action + let a same-day action bypass the once/day gate. BEST DONE with the notification-hub work.
- [KILLED 2026-07-05] "Manage in Settings" in-app hotlink -- NOT VIABLE. Linking.openSettings() only opens the app's generic iOS page (Local Network / Camera / Siri / Cellular), which has NO Apple Health row, and iOS exposes no deep-link into the Health data-access screen. A button there would mislead. RESOLVED INSTEAD via Otto: his KB gives the correct manual route (Settings > Privacy & Security > Health > Project J, then toggle data types) and is told never to point at the app's iOS page or the in-app Health section. Deployed 2026-07-05.
- [ ] "View all achievements" button in the Stats Records or Streaks section (trophy icon in the header is buried).
- [ ] [TS CLEANUP, low] add-food.tsx line ~1526: pre-existing tsc error -- the favorite object built on heart-tap isn't assignable to MyFood[] (MyFood type drifted from the object shape: brand/isMyFood/fsId/type). Runtime-safe (Metro strips types, fields have safe defaults), no crash/data loss. Just makes the file not tsc-clean. Tidy the MyFood type or the object shape eventually.

---

## ⭐ HIGH-PRIORITY OPEN (bigger tracks)
- [HIGH] Onboarding full pass -- functionality sweep AND apply the new gradient/aesthetic treatment across all onboarding screens. Dedicated session. app/onboarding/*.
- [HIGH] Lifting analytics layer (DEEPER stats only -- core PR feature already SHIPPED 2026-07-04: per-lift PR detection + revoke/honesty engine, All-PRs home + per-lift Records, Otto PR data). REMAINING/parked: 1RM trend as a graphable stat, surface PRs in EvR, volume per muscle group. Full spec: SPEC_lifting_log.md. PARKED for now (Justin 2026-07-05, not the next session).
- [HIGH] Tutorial + tooltip full audit -- in progress, tab by tab (batches of 3, device-tested each). REMAINING: spotlight lag (TestFlight verify), hidden-card guard, Log Today's Total interactive tutorial, tooltip audit + wording passes, flag every card missing a (i). data/tutorials.ts + tooltipRegistry.ts.

---

## 🗂️ OPEN BACKLOG BY AREA (open/future only; shipped history is in the archive)

### Onboarding
- Mindful onboarding -- encouragement language + Mindful-specific Screen 4 copy (graph/presets already gated off). Copy pass.
- Macro presets -- Screen 4, Discipline/Balanced only. Also settable in Settings.
- Progress bar on onboarding screens -- segmented step indicator, screens 2-7.
- Apple Health home banner for skippers -- one-time dismissable banner (pairs with the openSettings hotlink above).
- Weight projection graph -- profile page version (onboarding version built; profile.tsx not).
- Daily Intention card for Not Right Now users -- Today's Message morphs for NRN. Low priority.

### Home / UX
- Primary button audit -- all primary CTAs to full accent fill; transparent bordered = secondary only.
- Day detail BMR row -- add estimated BMR to the calorie breakdown (Consumed/Burned/Net).
- Exclusions polish -- first-use callout on calendar dot; help article; excluded-list view (view + un-exclude); three entry points.
- Day Summary card enhancements -- configurable surface time, earlier-access home card option, richer multi-day context. Design session first.
- Day Summaries archive layout -- collapsible rows may get clunky at volume. Revisit at 8+ weeks history.
- Greeting area customization -- settings picker for the top-left home header slot. Design session first.
- Physical measurements in profile -- waist/neck/hip (enables Navy body-fat estimate).
- HealthKit permissions audit -- review requested vs available data types; add high-value metrics before next build.
- Loading + error states audit -- sweep all screens for flashy load behavior + silent failures.
- Custom profile pictures -- user-set avatar via image picker (HeaderAvatar). QoL/aesthetic bump, likely small.

### Food & Log
- Big 3 macro presets -- quick protein/carb/fat picker from the macro gear icon and/or Settings.
- %DV entry in Create Food -- bidirectional amount/%DV fields. Full spec: SPEC_nutrition.md.
- Food search fuzzy matching -- local results use exact substring only; add fuzzy/Levenshtein. add-food.tsx.
- UNSET button on food detail -- unset a barcode-linked food without visiting Set Foods. Needs barcode route context.
- SET banner tip -- "(i) Tap SET on the correct item" after a barcode scan. On the fence.
- Calorie target transparency -- (i) tooltip explaining how the recommendation is calculated (BMR/lifestyle/pace). settings.tsx.

### Workout
- Load routine modal polish -- editable/deletable presets are a bigger dedicated-session item.
- Workout tab muscle group breakdown -- aggregated session-level summary (MuscleMap is per-exercise only).
- Daily exercise + active-calorie goal progress display -- goals settable + celebration fires, but no home progress display. Design decision: Fitness Metrics card vs Activity Rings vs under Steps.
- Onboarding-to-home transition -- guided first steps post-onboarding, no cold drop-off. Planning session.

### Stats & Reports
- Comparison + calendar CPP polish pass -- confirmed-needed ("hideous, very cheaply done"). All 4 presets + day-vs-day work.
- [PARKED] Body Fat as a graphable metric -- the other four (VO2 Max, Resting HR, Resp Rate, Blood O2) ALREADY ship: live in the graph creator + trend engine + At a Glance (registry/roadmap was just never crossed off). Body Fat (bodyFatPct) was retired 2026-06-17; now restorable off Body Measurements (Navy BF%), but SKIPPED for now per Justin 2026-07-05.
- Trend indicators -- Apple-style up/down arrow on graph values / At a Glance vs prior period.
- EvR refinement pass -- correlations need to be genuinely smart. Hard to test without data. Revisit with Smart Tips.

### Faith
- Today's Message overhaul -- CORE COMPLETE 2026-06-23. Remaining: 5-theme audit + the next-up Bible tutorial.
- Cycling Bible verses -- fine-print on Log + Workout tabs. Rooted on / Exploring optional / NRN hidden.
- Plans hub browsing -- category grouping, filter chips, search. app/plans.tsx.
- Bundle full KJV offline -- today fetches from GitHub (breaks offline); bundle ~4MB. data/bible-web.ts.
- Achievement toast remaining -- trigger context under achievement name; wording update before launch.
- Bible translation selector -- picker in the Bible gear modal. KJV only today.
- Faith AI verse-banner share tap-through -- tapping outside the share sheet highlights a random verse. Cosmetic.
- Challenges/Missions layer -- full spec in SMART_COACH_SPEC.md. Parked behind the Faith AI track.
- Donate/Support button -- post-TestFlight. StoreKit tip jar or Ko-fi. Not urgent.

### Sleep & Recovery
- [SHIPPED, verify pending] Recovery Score is wired into weekly + monthly summaries (avgRecoveryScore + HRV/cardio-recovery/prev-activity factors), dayScore.ts (third category), and Stats (graphable key + At a Glance). Left here only to confirm the Day Summary CARD surfaces it visually; the data layer is done. Detail in SPEC_recovery_coach.md.
- Sleep score stage-weight tuning -- bump REM weight, soften deep-sleep penalty (currently equal at 30pts). utils/sleepScore.ts.
- (note) Hypnogram connector lines CUT PERMANENTLY -- too sloppy when transitions are dense; no clean solution.

### Coaching & AI
- Voice (anti-eggshell) standard -- confident + direct, not hedging; encouragement that feels earned. Already fixed in Smart Coach + Halo; hold the line everywhere.
- Smart AI extra nutrients -- decision needed: do sodium/vitamins/micros feed Smart AI tips or stay display-only? Showing values fine; PRESCRIPTIVE advice = medical/legal risk. Discuss before build.
- Caffeine tracking -- daily total, high-amount warnings, first-use disclaimer. Design decisions needed. Duty-of-care item.
- Food group pattern detection -- zero whole foods X days -> gentle mode-aware tip.

### Streaks
- Burn accuracy freeze -- freeze burnAccuracyPct per-day (like goalSnapshot) so changing it doesn't retroactively shift streaks. utils/goalHit.ts / stats.tsx.
- Streak grace day system -- mode-aware grace days (Discipline cap 1 / Balanced cap 3 / Mindful none).
- Streak end warning visuals -- card color shift to orange/red within X hours of midnight, action not done.
- Edit Streak Count -- manual override with disclaimer. Design session first.

### Vacation Mode & Exclusions (ONE design knot -- Justin 2026-06-22; decide exclusion behavior FIRST, then build Vacation Mode)
- [AUDIT NEEDED] Exclusion / Vacation Mode source-of-truth convergence (FULL APP). Confirm every feature that reads daily data routes through the SAME exclusion/vacation check (Day Score, EvR, summaries, streaks, stats...).
- [SHIPPED] Vacation Mode -- one toggle auto-excludes nutrition/water/weight/sleep while still passively capturing HealthKit data; duration in days, auto-off on expiry. Live: utils/vacationMode.ts + Settings > Vacation Mode. Justin has used it multiple times. Spec: SPEC_vacation_mode.md. (The exclusion source-of-truth convergence AUDIT above may still be worth a sweep.)
- Snooze notifications option -- snooze/defer a notification; may pair with Vacation Mode.

### Tutorials & Tooltips
- Tooltip audit pass -- sweep all cards, flag every card missing a (i), build the missing ones. (See also the HIGH audit item above.)

### Animations
- Number transitions -- AnimatedNumber shipped on Home + Log. Remaining: stats tab values, workout tab reps/sets.
- Progress bar/ring/donut animation audit -- calorie bar on load, macro bars on entry, food donut on load, water bar bounce, sleep donut on load.
- Goal-moment animations -- water goal (fill + pulse), step goal (flip green), calorie goal (color transition).

### Settings & Modes
- Settings/Help: Coaching Style + Faith Journey in-depth explainers (quick blurb from the row + full article). UI approach TBD.
- Style/mode audit -- features that shouldn't show in Mindful, Discipline-only features, wrong defaults. Dedicated session.
- Mindful mode full app-wide audit -- inconsistent implementation across every screen/card/copy string. Dedicated session.
- Goals sub-category accordion polish -- FITNESS/NUTRITION GOALS sub-sections collapsible. settings.tsx.
- Resources and wellness links -- curated Settings > Help section (books, channels). Mostly static.
- "You've grown" coach message -- after key thresholds; mode-aware; ties to faith-journey prompts. Design first.

### Journal
- Date on journal entries tappable -- routes to that day's Day Detail.
- Search within journal entries -- low priority.
- Long-text stress test -- verify 500-word entries format correctly. QA.
- Multiple entries same day -- verify prayer + gratitude same day display correctly. QA.

### Notifications (system push -- SPEC_notifications.md is source of truth; separate from the in-app Otto hub)
- Notifications spec build -- 14 types, copy pools, deep linking all specced. Dedicated session.
- Notification center -- bell icon in profile header, badge, real-time toasts for Health sync events.
- Daily summary push notification -- push version of the morning Day Summary. NOT in the 14-type spec yet; add before building.

### Visual Polish
- Full theme audit -- all 5 themes x all accents, every screen, before beta. Dedicated testing session.
- Progress bar track color pass -- across all themes.
- Empty state illustrations -- SVG illustrations replacing icon+text empties. Theme-aware, app-wide.
- MFP switcher experience -- first-impression UX for power users arriving from MyFitnessPal.
- Sign-in logo entrance animation -- logo pops instead of fading. Verify on TestFlight first.

### Infrastructure
- [DRIFT CLEANUP] GOAL_DEFICITS is duplicated across 6 files (calorieTarget, profile, index, goalHit, settings, onboarding/your-style). Centralize into ONE exported source (calorieTarget already exports it) so pace/deficit changes can't drift. Surfaced 2026-07-08 adding pace granularity -- had to hand-edit 5 copies. (Justin flagged drift as a standing concern.)
- Firestore migration -- move primary data from AsyncStorage to Firestore (auth already done). Big item.
- State restoration on launch -- save active tab + scroll position, restore on cold launch.
- HealthKit source detection -- show "via Garmin/Whoop/Oura" labels on sleep/HRV data.
- Offline-first behavior.
- In-app review prompt -- prompt to rate at the right moment.
- Accessibility -- respect system Dynamic Type font sizes.
- Tooltip pulse visibility awareness -- only pulse when the card is visible in the ScrollView viewport. Not blocking.

---

## 📄 SPEC + REFERENCE POINTERS
Every major feature has a SPEC_*.md in the repo root. Active ones tied to open work above:
- Wearable / TDEE: SPEC_wearable_robustness.md | Otto hub: SPEC_otto_notifications.md | Push notifications: SPEC_notifications.md
- Sleep/Recovery: SPEC_sleep.md, SPEC_recovery_coach.md, SPEC_hr_zones.md | Lifting: SPEC_lifting_log.md | Workout sessions: SPEC_workout_sessions.md
- Nutrition: SPEC_nutrition.md, SPEC_calorie_goal_hit.md, SPEC_calorie_floor.md, SPEC_ai_meal_estimator.md | Day/Reports: SPEC_day_score_and_summary.md, SPEC_weekly_summary.md, SPEC_monthly_summary.md, SPEC_evr_redesign.md, SPEC_comparison_challenge.md, SPEC_custom_reports.md
- Faith/Coach: SPEC_faith_ai.md, SPEC_faith_tab.md, SPEC_smart_tips.md, SMART_COACH_SPEC.md, TRIGGER_LIBRARY.md | Cards: SPEC_card_gradient.md | Vacation: SPEC_vacation_mode.md | Tutorials: tutorial_system_spec.md
- Body: SPEC_body_measurements.md, SPEC_body_progress.md, SPEC_weight_history.md
- App Store: APP_STORE_CHECKLIST.md, COMPLIANCE_SCAN_findings.md

## 📎 ARCHIVES
- project_j_roadmap_archive.md -- full shipped/fixed history + detailed post-mortems (this file's completed items live here; grep by section when you need the story behind a shipped feature)
- project_j_backlog.md -- parked/future items (deeper-future than the backlog-by-area above)
