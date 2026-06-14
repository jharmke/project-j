# Project J -- Active Roadmap
# Read this at the start of every session. Parked/future items live in project_j_backlog.md.
# Tags: [BUG] = confirmed broken | [HIGH] = priority | no tag = SOON/open

---

## BUGS

- Food logging speed sweep -- ALL DIARY PATHS DONE: saveEntry/add (d0873d7), delete-entry + AI estimator log (9f3ba1f). REMAINING (lower priority, NOT the diary hot path): the awaited saveToFirebase in the custom-food / recipe / favorite saves -- add-food.tsx (lines ~541, 1149, 1167, 1187, 1484, 1525) and food-detail.tsx (608 favorites, 1008 my_foods). Same fire-and-forget fix, BUT review each context first -- confirm nothing reads the write result back before making it non-blocking. Less urgent: these are management actions, not the freeze-then-navigate logging moment.

### Fixed
- [FIXED] Weekly Summary push fired Monday, not Sunday -- scheduler gated on now.getDay() === 1 (Monday) while the in-app weekly summary (utils/weeklySummary.ts) closes the week Sunday (Sun-Sat). Changed gate to now.getDay() === 0 so the push matches the data boundary. services/notifications.ts. OPEN: push fires 11am/12pm (dateSeed-seeded), not true morning -- Justin to decide whether to pull earlier. NOT YET device-verified.
- [FIXED] FatSecret search misses branded compound-word items on singular queries -- "mcdonald nugget" returned generic chicken nuggets instead of McDonald's McNuggets; "mcdonald's fries" apostrophe caused brand mismatch. Two fixes in add-food.tsx: (1) normalizeQueryForApi now strips iOS curly apostrophes and straight apostrophes so "McDonald's" becomes "McDonalds"; (2) fetchFatSecretSearch fires a second parallel query with the last word pluralized (when >= 5 chars and not already plural), merges results secondary-first so the plural results (which FatSecret ranks better for compound words like "McNuggets") surface at top. Short words (< 5 chars) skip pluralization to avoid partial-word artifacts like "nugg" pulling Wendy's Nuggs brand.
- [FIXED] Slow food logging (5-10s on add, double-logging on double-tap, GO_BACK error) -- the saveEntry handler in food-detail.tsx AWAITED saveToFirebase (a secondary Firestore write to the days collection) before navigating back; measured 793ms on WiFi, multiples on weak signal. Metro warm-up on the fresh build exaggerated it to 5-10s. Achievement scans were NOT the cause (momentum 35ms, nutrition 1ms -- gated/early-break). Fix: saveToFirebase now fire-and-forget (data still saves; local write + cloud-backup mirror already persisted it instantly); added savingRef in-flight guard (kills double-log); canGoBack guards on the double router.back (kills GO_BACK). Verified fast on device 2026-06-12. food-detail.tsx.
- [FIXED] Add/Edit Exercise modal crash -- openAddExerciseModal set addExerciseAnim / addExerciseKeyboardOffset, dead names left behind by the scale-animation refactor (bc9f7726). ReferenceError when tapping an exercise to edit. Deleted the two dead lines; Modal onShow already resets correctly. workout.tsx.
- [FIXED] Rest day not overridden by Apple Health workout -- type stayed 'rest' on import so exercises were hidden. Now flips type off rest (to cardio) when a workout imports. workout.tsx import effect.
- [FIXED] YvY streak (vsStreak) always 0 -- pj_vs_streak was read but never written. Now snapshots live result and settles into the streak at day rollover (win extends, loss resets, tie holds; Mindful excluded). index.tsx.
- [FIXED] Daily Goals counters undercount + wrong "last hit" dates -- detection only fired on in-session threshold crossings; if app opened after goal already hit, prevRef was null and first HealthKit update silently skipped. Fixed: also fires when prevRef is null and current value is already at/above goal. Daily gate in handleDailyGoalHit prevents double-counting. Historical counts are permanently low (unrecoverable without data). index.tsx.
- [FIXED] Notification water "behind on water" math inverted -- notifications were scheduled once in the morning when water was 0; copy always asserted "behind" regardless of actual intake. Fixed: water notifications cancel and reschedule on every app foreground with live oz data. Skip-if-on-pace logic now uses real numbers. services/notifications.ts + notificationScheduler.ts + _layout.tsx.
- [FIXED] Notification activity check-in ignores cardio -- condition only checked strength checkmarks, completely ignored cardioLogs; also scheduled at morning with stale data. Fixed: condition now checks both active-cal goal AND exercise-mins goal (both must be hit to suppress). Live refresh on foreground cancels the notification if goals are hit after morning schedule. Copy softened to goal language. services/notifications.ts.
- [FIXED] Today's Verse notification opens Bible to Genesis 1 -- deep link was { route: '/bible' } with no params. Fixed: scheduler reads verse reference (e.g. "Philippians 4:13") alongside verse text, passes as params: { verseRef } so bible.tsx navigates directly to the verse. Verifiable tomorrow morning. services/notificationScheduler.ts + notifications.ts.
- [FIXED] YvY net calories comparison wrong + rounds step numbers -- winCondition compared each day's net against calTarget (consumed budget ~1800) instead of paceTarget (signed net deficit -750). Result: -332 beat -738 even though -738 was essentially on goal. Fixed: import GOAL_DEFICITS from utils/goalHit.ts, compare against paceTarget. Also fixed crash (GOAL_DEFICITS was referenced outside its scope -- now properly imported). Steps format changed from 10.3k to 10,300 for full visibility. Confirmed working via screenshot (6/11 -738 now correctly beats 6/10 -332). head-to-head.tsx. NOTE: YvY streak was poisoned by this bug (days that should have been wins were settled as losses). Streak will self-correct going forward.
- [FIXED] Day Detail haptics missing -- no Haptics import at all. Added light haptics to: nav arrows (prev/next day), calendar icon, calendar picker prev/next/select, all section toggles (sleep/workout/meals/advanced nutrition). Handle bar haptic was missing in index.tsx (stats.tsx already had it) -- fixed to match. day-detail.tsx + index.tsx.

---

## LAUNCH BLOCKERS

- App name + logo -- finalize from shortlist (Prevail, Steadfast, Worthy, Haven, Witness, Sown). Verify App Store + TikTok handle availability. Prevail is strongest.
- App Store Connect setup -- privacy label, age rating, URLs, description, screenshots, review notes. No code. Do after name is locked.
- Verification scan -- production build, device install, all flows confirmed before submitting.

---

## ONBOARDING

- [HIGH] Post-onboarding mode switch Acknowledgement Modal -- switching style in Settings: brief description + "Keep my layout" vs "Apply defaults." Switching TO Discipline re-fires commitment screen. settings.tsx.
- Mindful onboarding -- encouragement language + Mindful-specific Screen 4 copy. Graph/presets already gated off (your-style.tsx lines 672/762). Remaining: copy pass.
- Macro presets -- Screen 4, Discipline/Balanced only, not Mindful. Also settable in Settings post-onboarding.
- Progress bar on onboarding screens -- segmented step indicator at top of screens 2-7 (not Welcome).
- Apple Health home banner for skippers -- one-time dismissable banner for users who tapped "Maybe later."
- Weight projection graph -- profile page post-onboarding. Onboarding version built; profile page version not. profile.tsx.
- Daily Intention card for Not Right Now users -- Today's Message morphs for NRN: no verse, neutral styling, rotating prompts by style. Low priority.

---

## HOME / UX

- Primary button audit -- app-wide: all primary CTAs to full accent fill. Transparent bordered = secondary only (Edit, Cancel, filter pills).
- Day detail BMR row -- add estimated BMR to calorie breakdown alongside Consumed / Burned / Net.
- Exclusions polish -- first-use callout on calendar dot. Tooltip/help article explaining what exclusions are + effect on Day Score/EvR/streaks. Excluded list view (view + un-exclude all excluded dates). Three entry points: calendar dot, toolkit icon, Settings Help.
- Day Summary card enhancements -- configurable surface time (fixed at 5am), earlier-access home card option, richer multi-day context. Design session first.
- Day Summaries archive layout -- collapsible rows may get clunky at volume. Revisit once 8+ weeks of real history exist.
- Water modal edit entries -- pencil icon to edit existing water log entries (time/amount).
- Apple sync last sync time -- surface last HealthKit sync timestamp on steps/active cal cards.
- Greeting area customization -- settings picker for top-left home header slot (greeting text, streak badge, calorie line). Design session first.
- Tab bar scroll-to-top -- tapping active tab icon scrolls screen back to top.
- Physical measurements in profile -- waist, neck, hip. Enables Navy method body fat estimate.
- HealthKit permissions audit -- review full list of HealthKit data types vs currently requested permissions. Add high-value missing metrics before next build.
- Loading + error states audit -- sweep all screens for flashy load behavior and silent failures.

---

## FOOD & LOG

- Big 3 macro presets -- quick protein/carb/fat preset picker accessible from the macro gear icon (and/or Settings). Overlaps the Onboarding "Macro presets" item; this is the in-app gear-icon access angle. NutritionGearModal.tsx / settings.tsx.
- HealthKit weight auto-pull -- read Apple Health body mass, ghost value with HK icon, manual entry always wins. Design discussion before building. REQUIREMENT (locked): every pulled entry must show a source badge identifying the originating app/device, and each foreign entry must be individually deletable from within Project J. Manual entry always wins. This is the READ direction (reading weight IN from Apple) -- NOT the write-back build, which only pushes weight OUT.
- %DV entry in Create Food -- bidirectional amount/%DV fields for all nutrients with FDA DV. Full spec in SPEC_nutrition.md.
- Food search fuzzy matching -- My Foods, Recents, Recipes, Favorites use exact substring only. Add fuzzy/Levenshtein for local results. add-food.tsx.
- UNSET button on food detail -- unset barcode-linked food without navigating to Set Foods tab. Needs barcode context in route params.
- SET banner tip -- "(i) Tap SET on the correct item" after barcode scan. On the fence, revisit.
- Calorie target transparency -- (i) tooltip explaining how calorie recommendation was calculated (BMR, lifestyle factor, pace). settings.tsx.
- Date targeting on food log entries -- currently no way to log a food entry to a date other than today from the standard add-food flow. Add date field to time/slot dropdowns for all food logging app-wide. Gap exposed by AI Meal Estimator date/slot targeting design. Separate from estimator build. add-food.tsx.

---

## WORKOUT

- [HIGH] PR tracking + lifting stats -- log PRs per lift, 1RM trend as graphable stat, surface in EvR, volume per muscle group. Required before workout achievement PRs can ship. Planning session needed.
- Workout tab FAB search keyboard dismiss -- no way to dismiss keyboard by tapping outside search bar. workout.tsx.
- Load routine modal polish -- maxHeight + scroll fix done, handle pill + no-X standard applied, exercise preview on select done. Editable/deletable presets are bigger design items for a dedicated session.
- Editable workout note name -- workout notes default to "Workout Note." Should be editable.
- Workout tab muscle group breakdown -- aggregated session-level muscle group summary. MuscleMap exists for individual exercises only.
- Daily exercise goal + active calorie goal progress display -- goals settable + celebration fires, but home screen progress display (rings/bars) not built. Design decision needed: Fitness Metrics card, Activity Rings card, or under Steps.
- HR Zone Training -- 5-zone system, max HR (220-age default, user-settable), optional Karvonen. Stats: time-in-zone stacked bar. Dedicated session.
- Onboarding to home transition -- guided first steps post-onboarding, no cold drop-off. Planning session before building.
- Feedback / bug reporting form -- Settings form: Bug/Suggestion/Other, description, screenshot. mailto deep link to justin.harmke@gmail.com.

---

## STATS & REPORTS

- Fitness Metrics as graphable keys -- VO2 Max, Resting HR, Resp Rate, Blood O2, Body Fat as graph data keys. Graph infra exists; add to DATA_KEY_META + statsCardRegistry + fetchTrendData.
- Trend indicators -- Apple-style up/down arrow on graph values or At a Glance showing change vs prior period.
- Day Score bedtime backfill bug -- backfill-only days score up to 10pts low on Recovery (sleepConsistencyPts defaults 0). Softened by 50pt floor. Fix in utils/dayScore.ts.
- EvR refinement pass -- correlations need to be genuinely smart. Hard to test without sufficient data. Revisit alongside Smart Tips.

---

## FAITH

- Home Faith Hub card top border feels off -- either wrap the border around the whole card or drop the top border. Visual polish. components/FaithTodayCard.tsx.
- Today's Message overhaul -- user-controlled pool (preset KJV + custom), static vs cycle toggle, pool management in Settings, NRN card hidden by default, custom scripture picker (book > chapter > verse, up to 4). Dedicated session.
- Cycling Bible verses -- fine-print at bottom of Log tab and Workout tab only. Rooted: on. Exploring: optional. NRN: hidden.
- Plans hub browsing -- category grouping (wellness/body, heart/identity, peace/comfort, "Need a Word Right Now"). Filter chips, search. app/plans.tsx.
- Bundle full KJV offline -- today fetches from GitHub, breaks offline. Bundle ~4MB into app. data/bible-web.ts.
- Achievement toast remaining -- trigger context under achievement name, wording update before App Store launch.
- Theme unlock starter challenge -- code done (Slate/Warm/Blush unlock together). Challenge content/trigger TBD.
- Bible translation selector -- translation picker in Bible gear modal. KJV only today.
- Faith AI verse-banner share tap-through -- tapping outside iOS share sheet highlights random verse underneath. Cosmetic/low priority.
- Challenges/Missions layer -- full spec in SMART_COACH_SPEC.md. Parked behind Faith AI track.
- Donate/Support button -- post-TestFlight. StoreKit tip jar or Ko-fi. Not urgent.

---

## SLEEP

- Sleep Hub + Recovery Score -- full build specced in SPEC_sleep.md. Two-tab destination screen (Sleep / Recovery), new baseline-relative Recovery Score (6-signal weighted formula), replaces the old recovery subscore app-wide. DESIGN SESSION DONE 2026-06-12 (Decisions Log #11): file app/sleep.tsx, layouts locked, stage colors (Deep #0d9268 / REM #7e6bb3 / Core #3d6e9e / Awake #cc3333), readiness labels PRIMED/STEADY/RECOVER, zones green>=70/amber55-69/red<55 (placeholder), linear baseline scaling (placeholder), Mindful confirmed, v1 drops Activity Balance (prevDayActivity*0.17). HRV WIRING DONE + verified on device 2026-06-12 (62ms, SDNN most-recent; sleep-window scoping still TODO in the formula). EAS build LANDED 2026-06-12. BUILD IN PROGRESS. SLICE 1 SHIPPED 2026-06-12 + device-confirmed: app/sleep.tsx scaffold, "SLEEP & RECOVERY" header, Sleep/Recovery pill tabs, last-night Sleep Score hero (reuses shared components/SleepDonut.tsx extracted from index.tsx; same score math as home; Awake legend row via new sleepAwake token), Recovery tab placeholder. Home sleep card now navigates to the hub on full-card tap (gated off during edit; gear/feel/chevron keep their own taps) plus a corner chevron affordance. SLICE 2 SHIPPED 2026-06-12: fetchSleepHistory(days) in useHealthKit (buckets stage samples into nights by wake-day), animated Sleep Score trend line (7/30 toggle, SVG draw-in), per-night stacked stage-history bars (Core/Deep/REM/Awake, grow-in animation). Home card now has press-scale animation. SLICE 3 SHIPPED 2026-06-12: Sleep Metrics panel (wake events last night, bedtime consistency std-dev label, avg deep %, avg REM % over range) -- fetchSleepHistory extended with awakeCount + bedMin. CHART POLISH SHIPPED: both charts rebuilt as SVG with y-axis ticks, x-axis date labels, and tap-a-point/bar callout pills (matches StatsGraphCard); metric tiles colorized (deep=purple, rem=green, bedtime=consistency color). SLICE 4 SHIPPED 2026-06-12: Sleep Coach tip (mode-aware, suppresses corrective tips in Mindful unless mindfulGrowthAreas on) + exclude-last-night toggle (read-then-merge pj_<date>.excluded, filters both charts/metrics/coach via filteredHistory). POLISH PASS SHIPPED 2026-06-12 (Justin notes): left accent borders on all cards; fixed 7D/30D scroll-to-top (charts stay mounted on range switch); hero now matches the home Sleep card exactly (moon icon, 3-stage donut, awake as text line, no goal-dot line); trend avg moved into header as a real stat (no dot-joined footer); metrics rebuilt as clean rows + Sleep Debt; coach restyled as a tinted insight callout (still a deterministic placeholder, rewire to Smart Coach later); exclude demoted to a quiet footnote row. HYPNOGRAM SHIPPED 2026-06-12: new fetchLastNightSegments() in useHealthKit + Hypnogram component (4 lanes Awake/REM/Core/Deep, bedtime->wake timeline, PanResponder horizontal-drag scrub showing stage + clock time, vertical scroll preserved). Dropped sleep efficiency (Justin: score-creep). DESIGN-REVIEW ITERATIONS (device feedback): hero donut ditched for a compact "93 / Sleep Score" number (no big ring); moon icon removed; Last Night card centered (two hero numbers + stage legend spread across bottom) to kill dead space; hypnogram connectors removed (looked spiky/cheap) + lanes tightened to read connected; metrics show healthy ranges (deep 13-23%, REM 20-25%) with green/amber coloring so values mean something; "Last night" capitalized. MANUAL-SLEEP HANDLING: manual nights (pj_<date>.sleepOverride, feel-based score) now merge into the Sleep Score Trend so watch-less users get a trend; stage cards (Stages bars, Hypnogram, Avg deep/REM) show clear "needs Apple Health" empty states instead of blank. LATER ITERATIONS: /100 dropped from hero score; hypnogram moved INTO the Last Night card (under the two numbers, above bed/wake, own axis hidden) -- no separate Timeline card; Sleep Stages bars are now sleep-only (Awake removed) and tap shows the Core/Deep/REM breakdown (not total); wake-events metric row now shows total awake duration; (i) Sleep Hub tooltip DONE (tooltipRegistry 'sleep_hub' + TooltipIcon in header). RECOVERY TAB SHIPPED 2026-06-13: fetchRecoverySignals() in useHealthKit (sleep-window HRV average per spec Decision #7, 7-day baselines for HRV/RHR/resp/activity, SpO2 display); utils/recoveryScore.ts (new) with full v1 formula (HRV 35%, sleep 22%, RHR 18%, prev-day activity 17%, resp 8%; 3-signal fallback if no HRV: sleep/RHR/resp 40/40/20; both signals normalized when some missing; PRIMED/STEADY/RECOVER zones green>=70/amber55-69/red<55); renderRecovery() in app/sleep.tsx: hero card (large score + label + 5 contributor rows each with left-side status-colored pill, arrow+delta vs baseline, SpO2 display row, Limited data badge when no HRV), recovery trend card (reads pj_<date>.recoveryScore; first-day empty state; score auto-saved on each computation), key signals panel (HRV overnight / RHR / resp / SpO2 / prev-day active cal with 7d baselines as subs), recovery coach tip (mode-aware, same suppression pattern as sleep coach). Mindful: score always shown, corrective tips suppressed unless mindfulGrowthAreas on. REMAINING SLEEP TAB TODO: (1) Sleep Coach still a deterministic placeholder, rewire to Smart Coach engine later; (2) full theme audit (only Light/cyan seen); (3) no Sleep Hub interactive tutorial yet (data/tutorials.ts). REMAINING RECOVERY TODO: (1) wire Recovery Score into Day Summary, weekly/monthly summaries, EvR, Stats, dayScore.ts (spec Decisions #1/#8/#9); (2) Recovery Coach still deterministic placeholder, rewire to Smart Coach later; (3) theme audit; (4) tutorial entry.
- [BUILT 2026-06-13, NEEDS DEVICE VERIFY] Sleep Hub baseline spec + premium metrics rebuild -- SPEC_sleep.md Section 11. Personal 30d baselines (always last 30 synced nights, separate fetchSleepHistory(30) so the range-driven chart fetch is untouched; 7D/30D toggle only changes what charts/values DISPLAY, baseline is always 30d). baseline30 useMemo computes avg deep %, avg REM %, avg bedtime + bedtime SD, avg wake events; >=7 stage nights gate, else healthy-range/range fallback. history30 state + exclude scan extended. Sleep Metrics panel REBUILT (took several device iterations -- first dot-on-zones then plain fill bars both read vague). FINAL: every row a DIVERGING bar with a labeled axis (left/center/right hashes = the "numbers on the bars" ask), except bedtime. Avg deep/Avg REM (label keeps "Avg" -- these are RANGE AVERAGES, not last night; dropping "Avg" earlier made 12% avg deep look contradictory next to a 95 last-night Sleep Score) = diverging bar centered on your baseline %, but COLOR driven by medical healthy range (deep 13-23 / REM 20-25): in range green, too low OR too high amber, with caption "Below/Above healthy range (X to Y%)". Baseline = bar's center reference only, does NOT drive color (fixes the missing upper guardrail: 30% deep would have read green just for being above baseline). Sleep balance (renamed from Sleep debt) = diverging from goal(0), right=surplus/green left=deficit/red, symmetric auto-scaled +-Xh axis, value always real number ("2h 10m surplus"/"3h 15m deficit"/"On goal"). Wake events = diverging from your avg count (good side is LEFT, fewer=better; awake caption centered). Bedtime = neutral track + hash ticks at your early/late ends (10th-90th pct of 30d bedtimes, real clock times) + dot at typical LABELED "Baseline H:MM PM" under it (matches every other row's labeled reference -- the key fix; was an unlabeled solid green bar before). Components: DivergingBar + BedtimeBar + BarTickLabel (replaced MetricBar). No right-column subs; every secondary number is an axis label or one caption. Bars animate on mount. Pure JS, no rebuild. REMAINING after verify: tune placeholder thresholds with real data; full theme audit; tooltipRegistry 'sleep_hub' copy (Sleep debt->Sleep balance, baseline mention). NOTE pre-existing (NOT from this work): tsc flags `score` used-before-declaration in the recoveryResult useMemo (line ~640) -- Babel const->var makes it run fine; flagged for a later cleanup.
- [BUILT 2026-06-13, NEEDS DEVICE VERIFY] Sleep Score Trend y-axis auto-scale -- chart was hardcoded 0-100 so the line hugged the floor and looked flat. Now auto-scales to data min/max via niceYTicks (same nice-number algo as the Stats graph creator), so the line fills the card. app/sleep.tsx ScoreTrendChart. (Recovery trend chart still fixed 0-100 -- follow-up if this lands.)
- Hypnogram connector lines -- CUT PERMANENTLY. Tried twice (gradient step-down). Too sloppy when transitions are dense (short rapid awake slivers early in night create a tangled mess). No clean solution found.
- Card top accent gradient exploration -- replace left border accents on Sleep and Recovery cards with Oura-style top gradient fade (color wash ~40-60px downward, fading to transparent). Test on sleep cards first; evaluate app-wide rollout potential. Fallback: solid top accent border if gradient doesn't land. app/sleep.tsx.
- Sleep Score Trend gradient fill -- add gradient fill between line and X-axis using accent color (full opacity at line, transparent at X-axis). Test on Sleep Score Trend first; evaluate as app-wide line graph standard if it lands. app/sleep.tsx trend chart SVG.
- [DONE 2026-06-13] Sleep Stages Y-axis gridlines equidistant -- rawMaxH rounds up to nearest step multiple. "10h" label gap fixed (template literal). app/sleep.tsx StageHistoryChart.
- [DONE 2026-06-13] Stage bar callout popup -- shows date + total header, Core/Deep/REM/Awake rows, Duration at bottom. Tapping popup dismisses it. app/sleep.tsx StageHistoryChart.
- [DONE 2026-06-13] Manual sleep footnote in Sleep Stages card -- "Apple Health data only. Manual sleep nights not included." app/sleep.tsx.
- [DONE 2026-06-13] Hypnogram Y-axis label color-coding -- Awake/REM/Core/Deep labels now match stage colors. app/sleep.tsx Hypnogram.
- [DONE 2026-06-13] Last Night score font size -- 46->38 to match duration text. app/sleep.tsx renderHero.
- [DONE 2026-06-13] Awake in Last Night stage legend -- added AWAKE Xm to Core/Deep/REM key row. Removed "Xm awake during night" subtitle. app/sleep.tsx renderHero.
- [DONE 2026-06-13] Wake events row -- count + awake time stacked right side, no left sub. app/sleep.tsx renderMetrics.
- [DONE 2026-06-13] Bedtime consistency interim fix -- shows avg bedtime anchored (+-Xm from HH:MM). Proper fix needs baseline spec session. app/sleep.tsx renderMetrics.
- [DONE 2026-06-13] Exclude card -- restored as own card below Coach with "OPTIONS" label. app/sleep.tsx.
- Sleep score stage weight tuning -- bump REM weight higher, soften deep sleep penalty. REM and Deep currently equal at 30pts each. utils/sleepScore.ts.
- Sleep edit disclaimer -- show disclaimer when user opens manual sleep edit: "will overwrite Apple Health synced data."

---

## COACHING & AI

- Smart AI extra nutrients -- decision needed: should sodium / vitamins / micros feed into Smart AI tips, or stay display-only? Working line: showing micro values is fine, but PRESCRIPTIVE advice on them is the medical/legal risk. Discuss before any build.
- AI Estimator label reading -- when the user photographs an actual labeled package (tub/box/bag) and gives a gram amount, the estimator should read the printed nutrition label instead of guessing. Justin shot his preworkout tub + stated grams and it still estimated. Ties to the unverified photo path. services/aiMealEstimator.ts.
- AI Meal Estimator -- BUILT & SHIPPING (app/ai-meal-estimator.tsx + services/aiMealEstimator.ts). Photo+text input, editable breakdown, universal + per-item portion multipliers, low-confidence flagging with hard-gate, today's-estimates failsafe (pj_ai_estimator_today), quota (free 3 / Pro 30, counts when result shown). AI badge on log rows + Edit Entry, hidden from Recents. Entry points ALL DONE: Food Library FAB, add-food header AI icon (slot-aware), log tab card (persistent, shown below the meals). tooltipRegistry + privacy.html done. Pro tier (isPro) hardcoded false until monetization ships (single swap point in ai-meal-estimator.tsx). REMAINING: interactive tutorial (deferred to tutorial audit session per spec); Edit Entry "1g" cosmetic (separate item below); voice mic in the description field is a placeholder (focuses the field/raises keyboard only) -- true in-app dictation: expo-speech-recognition (New-Arch-safe, chosen over @react-native-voice/voice which fails silently on New Arch) INSTALLED in the 2026-06-12 build with mic + speech permission strings; just needs JS wiring now (no rebuild). Meal Templates CUT (revisit later as "Save as Recipe"). Fast follow-on: Restaurant save concept.
- AI estimate Edit Entry display -- aiEstimated composite entries show "Servings 1 / 1g / Amount (g)" oddly in food-detail (it treats them as gram-based foods). Cosmetic only: macros log correctly and Update Entry preserves them. Fix: food-detail should render aiEstimated entries as a fixed "1 serving = whole meal" with no serving-size selector. Deferred, do not forget.
- AI Meal Estimator NOT YET VERIFIED ON DEVICE -- all testing so far was TEXT-ONLY. The entire PHOTO path is unexercised: camera capture, photo-library upload, image compression, the vision model actually reading a meal photo, the no-food detection (only fires with an image), and the photo_only / photo_and_text disclaimer variants. Also unverified: error states (network/malformed), quota-exhausted limit modal, Mindful-mode behavior (de-emphasized calories, "Record this meal", warmer disclaimer), and the full theme audit (only Light/cyan tested -- CLAUDE.md requires all 5 themes x accents before "done"). Verify these before TestFlight.
- AI Meal Estimator deferred-but-undocumented bits (now captured): (1) Toolkit/help launcher on the estimator screen -- spec wanted one per standard app pattern, not added; tooltip exists in Settings>Help but no on-screen toolkit. (2) Image compression is expo-image-picker quality-only (IMAGE_QUALITY 0.4); no hard max-dimension resize, so the under-1MB target is best-effort -- a guaranteed cap needs expo-image-manipulator -- now INSTALLED in the 2026-06-12 build, just needs JS wiring (no rebuild). (3) Offline handling relies on the fetch failing (lands in the network error state); there is no pre-flight connectivity check -- @react-native-community/netinfo now INSTALLED in the 2026-06-12 build, just needs JS wiring (no rebuild).
- Smart Coach Level 2 (Focused Tips) -- single-metric AI-voiced tips for home card slots 2+. Blocker: Day Summary surface assignment conflicts between spec and gym notes. Explicit call before any build. SMART_COACH_SPEC.md.
- Caffeine tracking -- daily total, high-amount warnings, first-use disclaimer (includes pregnant women guidance). Design decisions needed: quick-add vs food field, thresholds. Duty-of-care item.
- Food group pattern detection -- if user logs zero whole foods X consecutive days, surface gentle tip. Mode-aware.
- NEAT definition -- one tooltipRegistry.ts entry only. No UI changes. Shows in Settings > Help automatically.

---

## STREAKS

- Burn accuracy freeze -- changing burn accuracy retroactively shifts streaks. Freeze burnAccuracyPct per-day same as goalSnapshot. utils/goalHit.ts / stats.tsx.
- Streak grace day system -- mode-aware grace days for fitness streaks (water/steps/calories/etc.). Discipline: earn, cap 1. Balanced: earn, cap 3. Mindful: no punishment.
- Streak end warning visuals -- color shift on streak card to orange/red when within X hours of midnight, action not done.
- Edit Streak Count -- manual override with disclaimer. Design session before building.

---

## TUTORIALS & TOOLTIPS

- [HIGH] TUTORIAL + TOOLTIP FULL AUDIT -- in progress, tab by tab (batches of 3, device-tested each).
  - DONE: return-nav framework fix (engine now auto-captures launch route, returns there on end/skip only if a step navigated away; explicit returnRoute still wins). GO_BACK error fixed (canGoBack guards on tutorial-action router.back calls in add-food/recipe-builder/workout-library).
  - DONE: LOG TAB content audit -- all 7 tutorials (log_food, manage_log, barcode, create_food, recipes, log_edit_layout, if_card). Fixed: log_food steps 7/8 dead spotlight (food-detail ScrollView now registered), manage_log step 4 (scrollToTop), create_food macros step (noDimOverlay + scroll), recents count 20->15, ~43 double-dashes across all mode variants.
  - DONE: WORKOUT TAB content audit -- all 4 tutorials (workout_basics, programs, routines, exercise_library). Fixed: programs + routines rebuilt from static info-walls into real interactive tours (deep-link via new tutorialTab param to workout-library Programs/Routines tabs; new spotlight targets: tab row, first program card + LOAD PROGRAM btn, My Routines header, first preset routine card; registered routines ScrollView for scroll-to). Dropped stale STARRED ROUTINES step (no star UI exists). Stale fact Rest Heavy->Rest Day Heavy. ~20 double-dashes across all mode variants. Device-tested all 4. Committed 9078056.
  - DONE: HOME TAB content audit -- all 8 tutorials (meta, meta_mindful, edit_layout, cal_card, macros_card, sleep_card, sleep_card_manual, yvy_card). Copy-only pass: 26 double-dashes across all mode variants (sleep/yvy were already clean). Wiring verified green (all targets register in index.tsx, both edit-layout actions register, home ScrollView registered). Stale facts verified accurate, no changes: cal thresholds (+/-50/149/150), edit-layout badge colors (red=showing/green=hidden), sleep point splits (40/30/30 staged, 60/30/10 feel-based). User device-tested the 5 visible tutorials.
  - DONE: STATS TAB content audit -- all 4 tutorials (graph_creator, streaks, effort_vs_results, day_score). BUG FIX: graph_creator empty preview (demo graph + creator preview read trendDataMap['7'] which was never loaded when active period != 7; injectTutorialGraph now loads the 7-day series, mirrors openCreatorModal). BUG FIX: EvR patterns dead-spotlight (section returns null when no cross-signal insightTips; added skipIfTargetMissing to evr_correlations + evr_suggestions so they skip gracefully; NO structural EvR changes, Smart Coach L2 overhaul coming). Stale facts: graph 19->17 data types (grid renders all of DATA_KEY_META = 17), EvR "9 correlation patterns" reworded (engine has 7 cross-signal rules, shows max 5; dropped brittle number). Verified accurate: 8 colors, 14 streak presets, Day Score 40/35/25 weights. ~24 double-dashes cleaned across all mode variants. User device-tested all 4 + both bug fixes.
  - REMAINING: faith_and_style (1, tab=profile -- the "Your Style & Faith Journey" tour; NOTE the Faith tab itself has zero tutorials, possible backlog item). Spotlight lag (TestFlight verify). Hidden-card guard (home tab hideable cards). Log Today's Total interactive tutorial (separate build). Tooltip audit + wording passes. data/tutorials.ts + tooltipRegistry.ts.
- Tooltip audit pass -- sweep all cards, flag every card missing a (i) tooltip, build missing ones.
- Tooltip wording polish pass -- copy quality pass. Known issues: Active (Apple Health fallback language), Remaining (algorithm vs description), Net (explain BMR first), Color Coding rewrite, em-dash sweep.

---

## ANIMATIONS

- Number transitions -- AnimatedNumber component shipped. Home: calories, macros, steps, water, weight. Log tab: Today's Total calories + macro bars. Remaining: stats tab values, workout tab reps/sets.
- Progress bar/ring/donut animation audit -- check which are already animated vs missing. Targets: calorie bar on load, macro bars on log entry, food log donut on load, water bar bounce on update, sleep donut on load.
- Goal moment animations -- water goal hit (bar fills + pulse), step goal hit (steps flip green), calorie goal hit (color transition).
- Achievement Toast phase 2 -- 12 badge animations: water (filling), steps (footprints), weight (scale needle), streak (flame), first workout (dumbbell), sleep (moon/ZZZ), calorie (plate clearing), IF (clock hands), Bible verse (page turn), journal saved (pen stroke), morning intention (sun rising), workout checked off (card pulse).

---

## SETTINGS & MODES

- Settings/Help: Coaching Style + Faith Journey in-depth explainers -- two-tier: quick blurb from setting row + full article in Settings > Help. UI approach TBD.
- Style/mode audit -- full pass: features that shouldn't show in Mindful, features that should be Discipline-only, wrong defaults. Dedicated session.
- Mindful mode full app-wide audit -- inconsistent implementation. Day Summary, every screen, card, and copy string. Dedicated session.
- Goals sub-category accordion polish -- FITNESS GOALS + NUTRITION GOALS sub-sections collapsible. settings.tsx.
- Resources and wellness links -- curated section in Settings > Help. Christian/health/wellness books, YouTube channels. Mostly static. Design session.
- "You've grown" coach message -- after key thresholds (weight milestones, streak lengths, logging consistency). Mode-aware. Ties to faith journey prompts. Design discussion first.

---

## JOURNAL

- Journal icon on Stats tab header -- not present. Routes to journal.tsx.
- Date on journal entries tappable -- routes to that day's Day Detail. Not implemented.
- Search within journal entries -- low priority.
- Long text stress test -- verify 500-word entries format correctly. QA task.
- Multiple entries same day -- verify prayer + gratitude same day display correctly. QA task.

---

## NOTIFICATIONS

- Notifications spec build -- SPEC_notifications.md is the source of truth. 14 types, copy pools, deep linking all specced. Build in dedicated session. Deep linking bugs fixed 2026-06-10 (water/weight scroll, activity routing, IF tab mismatch).
- Notification center -- bell icon in profile header, badge, real-time toasts for Health sync events.
- Daily summary push notification -- push version of morning Day Summary pop-up. NOT in the 14-type spec yet; add before building.

---

## VISUAL POLISH

- Full theme audit -- all 5 themes x all accent options, every screen, before beta. Dedicated testing session.
- Progress bar track color pass -- sweep track colors across all themes.
- Empty state illustrations -- SVG illustrations replacing icon + text empty states. Theme-aware, consistent style. App-wide.
- MFP switcher experience -- first-impression UX for power users arriving from MyFitnessPal.
- Sign-in logo entrance animation -- logo pops instead of fading. Verify on TestFlight before investigating.

---

## INFRASTRUCTURE

- Firestore migration -- move primary data from AsyncStorage to Firestore. Auth (Apple + Google) already done. Big infrastructure item.
- State restoration on launch -- save active tab + scroll position, restore on cold launch.
- HealthKit source detection -- read source identifier to show "via Garmin/Whoop/Oura" labels on sleep/HRV data.
- Offline first behavior.
- In-app review prompt -- prompt to rate at the right moment.
- Accessibility -- respect system Dynamic Type font sizes.
- Tooltip pulse visibility awareness -- only pulse when card is visible in ScrollView viewport. Complex, not blocking.
