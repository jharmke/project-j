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

### Tutorials / Tooltips
- [ ] TUTORIAL + TOOLTIP FULL AUDIT -- dedicated session required. Covers: spotlight lag (needs TestFlight verify), launch tab routing, stats + profile tutorials not interactive/polished, all content out of date (many features shipped since last audit), faith tab card moves (verse card now Faith Today, gratitude moved, prayer retired), tooltip copy accuracy pass across all screens.
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

---

## PENDING DECISION
