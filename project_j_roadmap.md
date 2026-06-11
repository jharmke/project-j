# Project J -- Active Roadmap
# Read this at the start of every session. Parked/future items live in project_j_backlog.md.
# Tags: [BUG] = confirmed broken | [HIGH] = priority | no tag = SOON/open

---

## BUGS

- [BUG] Rest day not overridden by Apple Health workout -- program.type stays 'rest' when Apple Health workouts import, so exercises are silently hidden. Fix: flip type off rest on import. workout.tsx ~366-400, ~996-1027.
- [BUG] YvY streak (vsStreak) always 0 -- badge renders but pj_vs_streak is never written. Needs: calculate win/loss at end of day, persist count, reset on loss.

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

- HealthKit weight auto-pull -- read Apple Health body mass, ghost value with HK icon, manual entry always wins. Design discussion before building.
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

- Sleep score stage weight tuning -- bump REM weight higher, soften deep sleep penalty. REM and Deep currently equal at 30pts each. utils/sleepScore.ts.
- Sleep edit disclaimer -- show disclaimer when user opens manual sleep edit: "will overwrite Apple Health synced data."

---

## COACHING & AI

- AI Meal Estimator -- BUILT & SHIPPING (app/ai-meal-estimator.tsx + services/aiMealEstimator.ts). Photo+text input, editable breakdown, universal + per-item portion multipliers, low-confidence flagging with hard-gate, today's-estimates failsafe (pj_ai_estimator_today), quota (free 3 / Pro 30, counts when result shown). AI badge on log rows + Edit Entry, hidden from Recents. Entry points ALL DONE: Food Library FAB, add-food header AI icon (slot-aware), log tab card (persistent, shown below the meals). tooltipRegistry + privacy.html done. Pro tier (isPro) hardcoded false until monetization ships (single swap point in ai-meal-estimator.tsx). REMAINING: interactive tutorial (deferred to tutorial audit session per spec); Edit Entry "1g" cosmetic (separate item below); voice mic in the description field is a placeholder (focuses the field/raises keyboard only) -- true in-app dictation needs @react-native-voice/voice (native module, requires a rebuild), deferred. Meal Templates CUT (revisit later as "Save as Recipe"). Fast follow-on: Restaurant save concept.
- AI estimate Edit Entry display -- aiEstimated composite entries show "Servings 1 / 1g / Amount (g)" oddly in food-detail (it treats them as gram-based foods). Cosmetic only: macros log correctly and Update Entry preserves them. Fix: food-detail should render aiEstimated entries as a fixed "1 serving = whole meal" with no serving-size selector. Deferred, do not forget.
- AI Meal Estimator NOT YET VERIFIED ON DEVICE -- all testing so far was TEXT-ONLY. The entire PHOTO path is unexercised: camera capture, photo-library upload, image compression, the vision model actually reading a meal photo, the no-food detection (only fires with an image), and the photo_only / photo_and_text disclaimer variants. Also unverified: error states (network/malformed), quota-exhausted limit modal, Mindful-mode behavior (de-emphasized calories, "Record this meal", warmer disclaimer), and the full theme audit (only Light/cyan tested -- CLAUDE.md requires all 5 themes x accents before "done"). Verify these before TestFlight.
- AI Meal Estimator deferred-but-undocumented bits (now captured): (1) Toolkit/help launcher on the estimator screen -- spec wanted one per standard app pattern, not added; tooltip exists in Settings>Help but no on-screen toolkit. (2) Image compression is expo-image-picker quality-only (IMAGE_QUALITY 0.4); no hard max-dimension resize, so the under-1MB target is best-effort -- a guaranteed cap needs expo-image-manipulator (native, rebuild). (3) Offline handling relies on the fetch failing (lands in the network error state); there is no pre-flight connectivity check -- a true one needs @react-native-community/netinfo (native, rebuild).
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

- [HIGH] TUTORIAL + TOOLTIP FULL AUDIT -- dedicated session. Spotlight lag (TestFlight verify), return-nav framework fix (~20 tutorials hardcode return tab), hidden-card guard, tutorialOverrideState pattern, 79 double-dash instances in tutorials.ts, Log Today's Total interactive tutorial, all content out of date. data/tutorials.ts + tooltipRegistry.ts.
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
