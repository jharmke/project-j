# Roadmap Audit -- In Progress
# Do not ship. Working doc only. Delete when audit complete.

---

## OPEN (stays in active roadmap)

### Faith / Support
- [ ] Donate/Support button -- post-TestFlight, no paywall. One-time StoreKit tip jar or Ko-fi link. Entry points TBD. Not urgent.
- [ ] HR Zone Training -- dedicated session. 5-zone system (Zone 1-5), max HR (220-age default, user-settable), optional resting HR for Karvonen formula. Stats: time-in-zone stacked bar per session. Cardio exercises: zone target field. Workout tab: zone badge post-session. Mode-aware.

### Tutorials / Tooltips
- [ ] TUTORIAL POLISH PASS -- dedicated session. Spotlight lag needs TestFlight verify. Launch tab nav must go to correct tab before starting. Stats + profile tutorials not interactive or polished. NOTE: many features have shipped since tutorials were last updated -- full content audit needed.
- [ ] Sign-in logo entrance animation -- logo pops in instead of fading. Verify on TestFlight before investigating.

### Workout
- [ ] Load routine modal polish -- modal cuts off bottom of screen. Add description field to routine builder, show exercise preview + description in load modal and library routines tab. Preset routines should be directly editable/deletable.
- [ ] Editable workout note name -- workout-tab-sourced journal entries default to "Workout Note." Should be editable.
- [ ] Add Exercise modal keyboard bug -- keyboard covers Cancel/Add buttons at bottom of modal. Modal needs to slide up when keyboard opens (same fix pattern as CustomFoodCreator: automaticallyAdjustKeyboardInsets on inner ScrollView). workout-library.tsx.
- [ ] Workout tab FAB > search keyboard dismiss -- tapping search bar opens keyboard, no way to dismiss by tapping outside. Needs Keyboard.dismiss on tap-outside. workout.tsx.

### Food / Search
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

---

## PENDING DECISION
