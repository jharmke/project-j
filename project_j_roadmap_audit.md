# Roadmap Audit -- In Progress
# Do not ship. Working doc only. Delete when audit complete.

---

## OPEN (stays in active roadmap)

### Faith
- [ ] Plans hub browsing -- category grouping first (wellness/body, heart/identity, peace/comfort, "Need a Word Right Now" single-day group). Filter chips at ~20 items. Search for large library. app/plans.tsx.
- [ ] Bundle full KJV offline -- today fetches from GitHub (aruljohn/Bible-kjv), breaks offline. Bundle ~4MB public domain text into app. Removes reliability risk from Bible reader + makes Faith AI verse verification truly offline. data/bible-web.ts.
- [ ] Faith AI verse-banner share tap-through -- tapping outside iOS share sheet in Bible reader passes through and highlights a random verse underneath. Cosmetic/low priority. app/bible.tsx.
- [ ] Challenges/Missions layer -- parked behind Faith AI track. Coach-driven + manual challenges, tiered achievement track, completion celebration. Full spec in SMART_COACH_SPEC.md.
- [ ] Theme unlock starter challenge -- code done (Slate/Warm/Blush unlock together). Specific challenge content/trigger still TBD.

### Faith / Support
- [ ] Donate/Support button -- post-TestFlight, no paywall. One-time StoreKit tip jar or Ko-fi link. Entry points TBD. Not urgent.
- [ ] HR Zone Training -- dedicated session. 5-zone system (Zone 1-5), max HR (220-age default, user-settable), optional resting HR for Karvonen formula. Stats: time-in-zone stacked bar per session. Cardio exercises: zone target field. Workout tab: zone badge post-session. Mode-aware.

### Stats / Graphs
- [ ] Fitness Metrics as graphable keys -- VO2 Max, Resting HR, Resp Rate, Blood O2, Body Fat (and Cardio Recovery) as custom graph data keys. Graph infra already exists; add to DATA_KEY_META, statsCardRegistry, and fetchTrendData. Extension of existing system.
- [ ] Trend indicators on stats -- Apple-style up/down arrow next to data values in graphs or At a Glance showing direction of change vs prior period.

### Calorie / Goal Logic
- [ ] Day Score bedtime backfill bug (low priority) -- backfill-only days (user never opened app) can score up to 10pts low on Recovery because sleepConsistencyPts defaults to 0 instead of being computed. Softened by 50pt floor. Fix: have the backfill scan compute + persist consistency for scored days. utils/dayScore.ts / utils/dayScoreStore.ts.
- [ ] Burn accuracy freeze for streaks -- changing burn accuracy retroactively shifts calorie/net streaks and active-cal streaks (they recompute live using the current accuracy multiplier). Goal side is already frozen per-day via goalSnapshot. Freeze burnAccuracyPct per-day too so historical streaks stay locked to the accuracy in effect then. Justin confirmed this is the right call. utils/goalHit.ts / stats.tsx.

### Coaching / AI
- [ ] Caffeine tracking -- new field. Track caffeine intake, daily total surface, high-amount warnings + first-use disclaimer (including specific guidance for pregnant women per lower safe limit). Design decisions needed: dedicated quick-add vs food field, warning thresholds. Pairs with Advanced Nutrition expansion. Duty-of-care item.
- [ ] Smart Coach Level 2 (Focused Tips) -- single-metric AI-voiced tips for home card slots 2+ and EvR domain cards. Open blocker: Day Summary surface assignment (spec and gym notes conflict on Level 1 vs Level 2). Explicit call needed before any build. See SMART_COACH_SPEC.md.
- [ ] NEAT definition -- one tooltipRegistry.ts entry for Non-Exercise Activity Thermogenesis. No UI changes, shows up in Settings > Help automatically.

### Mindful Mode
- [ ] Mindful mode full app-wide audit -- inconsistent implementation across the app. Day Summary still needs its pass. Scope is app-wide: every screen, card, and copy string should be checked for correct Mindful behavior (no judgment language, no numbers on weight/score, no countdown, no net calories, no color coding). Dedicated session.

### Settings / Help
- [ ] Settings/Help: Coaching Style + Faith Journey in-depth explainers -- two-tier: (1) quick "what does this mean for me" blurb accessible from the setting row, (2) full article per topic in Settings > Help. Coaching Style covers what changes mode-to-mode. Faith Journey covers what each tier sees vs not. UI approach not decided.

### Home / UX
- [ ] Apple sync last sync time -- surface last HealthKit sync timestamp on cards showing synced data (steps, active cals) so user knows if watch data is stale. Placement TBD.
- [ ] Water modal edit entries -- pencil icon to edit existing water log entries (time/amount). Verify delete confirmation exists before building.
- [ ] Log tab date picker fade-in -- calendar picker was built and works, but pops in with no animation on open. Fade-out on close works. Needs matching fade-in. log.tsx.
- [ ] Day detail BMR row -- add estimated BMR to calorie breakdown in day detail alongside Consumed / Burned / Running Net. Gives user the full daily calorie picture.
- [ ] Primary button audit -- app-wide sweep: all primary CTAs to full accent fill, transparent bordered style demoted to secondary only (Edit, Cancel, filter pills).

### Food / Log
- [ ] %DV entry in Create Food -- bidirectional amount/%DV fields in Create Food and Edit Food for all nutrients that have an FDA DV. Typing either field auto-fills the other. FDA DV lookup table in utils/nutrientDV.ts. Nutrients without a DV show amount only. Likely also belongs in food detail screen. Full spec in SPEC_nutrition.md.
- [ ] HealthKit weight auto-pull -- read Apple Health body mass (scales that sync to Health). Ghost value with HealthKit icon when no manual entry today; manual entry always wins. Design questions: effect on YvY and Head-to-Head when source differs day to day; whether it triggers weight achievements. Design discussion before building.

### Tutorials / Tooltips
- [ ] TUTORIAL + TOOLTIP FULL AUDIT -- dedicated session required. Covers: spotlight lag (needs TestFlight verify), launch tab routing, stats + profile tutorials not interactive/polished, all content out of date (many features shipped since last audit), faith tab card moves (verse card now Faith Today, gratitude moved, prayer retired), tooltip copy accuracy pass across all screens. Also covers: tutorial return-nav (nearly every tutorial hardcodes its own return tab; launching from Settings > Help dumps user on feature tab instead of back to Settings -- needs framework fix to capture launch origin and restore it, touches ~20 tutorials, real regression risk); tutorial hidden-card guard (if home card is hidden and user starts its tutorial, refs are unregistered -- should detect this and show "Add [Card] from Edit Layout first"); tutorialOverrideState pattern (cards with multiple UI states need a tutorialOverrideState prop for forced-state tutorials without touching real data); 79 double-dash instances in data/tutorials.ts still to fix; interactive tutorial still needed for Log Today's Total card.
- [ ] Sign-in logo entrance animation -- logo pops in instead of fading. Verify on TestFlight before investigating.

### Workout
- [ ] Load routine modal polish -- modal cuts off bottom of screen. Add description field to routine builder, show exercise preview + description in load modal and library routines tab. Preset routines should be directly editable/deletable.
- [ ] Editable workout note name -- workout-tab-sourced journal entries default to "Workout Note." Should be editable.
- [ ] Add Exercise modal keyboard bug -- keyboard covers Cancel/Add buttons at bottom of modal. Modal needs to slide up when keyboard opens (same fix pattern as CustomFoodCreator: automaticallyAdjustKeyboardInsets on inner ScrollView). workout-library.tsx.
- [ ] Workout tab FAB > search keyboard dismiss -- tapping search bar opens keyboard, no way to dismiss by tapping outside. Needs Keyboard.dismiss on tap-outside. workout.tsx.

### Food / Search
- [ ] Food search fuzzy matching for local results -- FatSecret results already fuzzy-match server-side. My Foods, Recents, Recipes, and Favorites use exact substring match only -- typos like "chiken" don't surface saved foods. Implement fuzzy matching in normalizeForMatch or add Levenshtein distance scoring for local search. add-food.tsx.
- [ ] SET banner tip -- "(i) Tap SET on the correct item" banner after barcode scan. Plain styling, CPP polish pass may be needed. On the fence -- revisit.
- [ ] UNSET button on food detail screen -- UNSET button near the star on food detail, so user can unset a barcode-linked food without navigating to Set Foods tab. Requires barcode context passed in route params.
- [ ] Clone food serving unit bug -- adding an additional serving size on a cloned food only allows grams. Should allow all custom units (ml, fl oz, oz, etc.) same as original CustomFoodCreator serving unit picker. food-detail.tsx or CustomFoodCreator.tsx.
- [ ] Cloned food calorie mismatch -- serving size picker shows wrong calorie value while macro donut shows correct value on cloned My Foods. Picker pulling stale or incorrect calorie data. food-detail.tsx.
- [ ] Calorie target transparency -- (i) tooltip on calorie target screen explaining how the recommendation was calculated (BMR, lifestyle factor, weight pace). Not built. settings.tsx.

---

## CLOSED / ARCHIVE (not in active roadmap)

### Confirmed done this audit:
- [archived] All [x] items lines 1-172 -- shipped features, all archived
- [cut] Visual hierarchy pass (workout tab) -- tab looks good in current state
- [cut] Progress/momentum element -- 2/2 counter already exists, cutting
- [cut] Visual hierarchy pass (workout tab) -- tab looks good in current state, cutting
- [closed] Workout library sort + filter -- Sort (A-Z, Z-A, Favorites First, Recently Used) + Type + Tag filters all present. Tag (Push/Pull/Legs/Core/Cardio) covers muscle group use case. Done.
- [closed] Meal slots fully customizable -- done.
- [closed] Food detail polish pass -- done.
- [closed] Food log polish pass (collapsed meal row, meal header, entry row padding, empty state 0, brand contrast, safe area, tab bar) -- all done.
- [closed] Settings Help grouping -- definitions screen has category filter pills (All/Nutrition/Fitness/Sleep & Recovery/Faith/Reports/Habits). Done.
- [cut] Rename food on entry -- solved by Save as Copy. Cut.
- [cut] Active calorie overestimate disclaimer -- covered by burn accuracy setting + tooltip. Cut.
- [closed] EvR logging-consistency denominator -- fixed. diagnosticReport.ts lines 287-288 adjust window from first-ever logged day.
- [closed] Muscle Milk oz/mL potassium bug -- not reproducible in screenshots, extended nutrition fixes likely resolved it. Clone food serving unit bug tracked separately.
- [closed] VOTD Reflect with Halo -- Reflect with Halo button already on Faith Today card page 1. Done.
- [closed] Bible reader plan browser modal -- consolidated to /plans hub. Done.
- [closed] Net carbs copy audit -- advanced_nutrition tooltip, day-detail formula, and daySummaryCopy.ts all verified correct (fiber + sugar alcohols everywhere). Done.
- [closed] Faith AI + Devotional Plans -- app/devotional.tsx, app/plans.tsx, CompanionChat component, reading plans, and inline Halo all exist in code. Roadmap entry was just never marked. Done.
- [closed] Settings Help aesthetics -- screenshot confirms clean section headers, accent left borders, clear hierarchy, good spacing. Done.

---

## PENDING DECISION
