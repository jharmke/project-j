🚨🚨🚨 REAL-TIME DOC UPDATES -- NON NEGOTIABLE 🚨🚨🚨
Claude must generate a find/replace doc update THE MOMENT anything happens that belongs here -- feature ships, bug found, bug fixed, decision made, something deferred, new standard added. Hand it to Justin immediately. He pastes it in VS Code before the next task starts. NOT at end of thread. NOT in a summary. RIGHT THEN.
Before adding ANY item to this roadmap, state the item and proposed bucket (NOW/SOON/BACKLOG) with a one-line reason and wait for Justin to confirm. No autonomous edits.
Every thread that skips real-time updates makes the next thread dumber. No exceptions.

DONE -- SHIPPED
[x] Home card customization -- drag, reorder, show/hide
[x] Card registry system -- CARD_REGISTRY at top of index.tsx
[x] Macro bars -- animated, vs goal
[x] Macro colors -- desaturated (Protein #0d9268, Carbs #c47d1a, Fat #a83232)
[x] GestureHandlerRootView fix in _layout.tsx
[x] Fitness Metrics no-data placeholder
[x] Edit layout sheet -- slides up over home screen
[x] Three header buttons -- refresh, calendar, grid
[x] DraggableFlatList in edit sheet
[x] Card visibility persisted to pj_settings
[x] MacroBar component -- extracted to fix hooks-in-map error
[x] Verse card in registry
[x] GitHub repo connected -- https://github.com/jharmke/project-j
[x] Token/theme system -- theme.tsx, ThemeProvider wired to root layout
[x] All 5 themes built -- Dark, Light, Slate, Warm, Blush
[x] Theme selector UI in settings
[x] All screens fully themed
[x] CustomTabBar -- fully themed
[x] Tab bar pill fix
[x] Background gradient -- all tabs
[x] Card shadows -- depth and elevation
[x] Tab fade transition
[x] Card icons -- Ionicons on all home screen cards
[x] Today's Training card -- combined workout summary + calories burned
[x] Text contrast bump
[x] Blush gradient strengthened
[x] Macro goals -- ratio and fixed modes
[x] Water bar animation fix
[x] Sleep donut draw-on animation
[x] Toast system -- slide in from bottom, swipe to dismiss, themed
[x] Weight carry-forward
[x] IF time picker light theme fix
[x] Food Library header title fix
[x] Log tab MacroDonut light theme fix
[x] All screens themed -- no hardcoded colors remaining
[x] Pull to refresh -- swipe down on home screen
[x] Accent color system -- per theme palettes, persisted
[x] Home button follows accent -- accentBlueRaw token
[x] Workout checkmarks, progress bar, left border, Done Go Home follow accent
[x] Slate theme overhaul
[x] Card transparency -- light 0.55, slate 0.65, blush 0.85
[x] Gradient linked to accent
[x] Per-theme accent palettes
[x] accentBlueRaw token
[x] Yellow accent buttonColor system
[x] Verse card static amber glow
[x] Tab header titles accent colored
[x] Exercise library keyboard blocking
[x] Verse card clickable -- routes to bible.tsx with press animation
[x] Shuffled verse rotation -- no repeats until all verses used
[x] Expanded VERSES array -- 52 verses, now KJV translation
[x] bible-web.ts -- full KJV Bible, all 66 books, fetch + cache per book from raw GitHub
[x] bible.tsx -- Bible reader, book picker, chapter nav, highlighted verse, reflection modal
[x] journal.tsx -- journal screen, categories, FAB, filter pills, edit, swipe delete
[x] _layout.tsx -- bible and journal routes added
[x] Reflection banner on Bible screen -- accent colored, routes to journal
[x] pj_bible_reflections -- merged entry format with id, category, title, notes
[x] Journal rewrite -- SwipeableEntry top-level component, animations fixed, swipe delete working
[x] Full KJV Bible -- all 66 books, fetch + cache per book, raw GitHub source (aruljohn/Bible-kjv)
[x] Bible verse tap-to-highlight -- any verse tappable, Reflect/View Reflection button, swaps instantly on verse tap
[x] KJV verse rotation -- all 52 preset verses updated to KJV
[x] Today's Message label -- renamed from Today's Verse throughout
[x] Sleep score 0-100 in donut center -- score-driven color, labels Well Rested/Could Be Better/Poor Sleep
[x] Sleep score algorithm -- Duration 40pts, Deep % 30pts, REM % 30pts
[x] Sleep tips -- contextual daily-rotating tips, 4 categories, seeded by date
[x] Sleep goal in profile -- scroll-driven wheel picker, auto-positions to current value
[x] Floating save bar on profile -- animates up on change, away on save
[x] Toast on profile save
[x] Home tab bug pass -- IF countdown color, IF method buttons Slate, IF daily reset, water remove toasts, toast render bug, toast solid background, weight persistence, weight auto-save fix, weight comparison fields, edit layout sheet Modal above tab bar
[x] Workout tag system -- custom tags, color picker, 6/day limit, 20 library limit, pills on Today's Training card, day scroller dot grid, manage tags sheet, assign tags modal
[x] Manage tags slide-up animation -- fixed using react-native-reanimated useSharedValue + withSpring, onShow callback pattern
[x] Toast above Modal -- fixed using ToastRenderer exported from Toast.tsx, rendered inside Modal JSX
[x] Program system -- preset programs (PPL, Upper/Lower, Full Body 3x, Cardio Focus, Rest Heavy), Programs button in header, load with override warning, weeklyTemplate replaces DEFAULT_PROGRAM
[x] Blank day default -- all days unassigned by default, no DEFAULT_PROGRAM
[x] Tag pill contrast -- backgroundColor t.color+'99', borderColor t.color, text #ffffff across workout tab, home tab, assign tags modal, manage tags
[x] Day scroller polish -- focus labels removed, dots only, borders visible, active day uses accent color
[x] Clear Program -- ACTIVE status row in Programs modal, persists across restarts
[x] Workout label field -- placeholder text, pencil anchored left, truncates cleanly
[x] Count color fix -- uses accent color not tag/program color
[x] Locked default tags -- Push, Pull, Legs, Core, Cardio, Rest -- locked=true, no edit/delete
[x] Tag drag to reorder -- DraggableFlatList in manage tags sheet
[x] DEFAULT_TAGS merge on load -- locked defaults always present, survives storage conflicts
[x] Apple Health workout history import -- Settings > Health Data, range picker, UUID dedup
[x] activeProgramName persisted to pj_workout_state
[x] Goal weight + projected date -- profile Weight Goal card, home weight card second row
[x] Profile floating save bar -- Cancel reverts changes, Save dismisses keyboard
[x] Celebration overlay system -- particle burst, 3 tiers, accent-aware colors, auto-dismiss
[x] Achievement engine -- achievementData.ts, 20 achievements, pj_achievements storage, unlock/cooldown logic
[x] Achievement triggers -- water goal, step goal, weight milestones, goal weight
[x] Dev tools -- 7-tap unlock on Settings title, fire celebrations, reset achievements. KEEP CODE TOGGLE FOR FUTURE USE.
[x] Water card sync -- home and log tab share water value, persists on reload
[x] Step goal cancel button
[x] Achievement page -- app/achievements.tsx, hex badge system, 4 tiers, categorized grid, locked with progress bars, unlocked with glow + date, trophy icon in profile header
[x] Platinum tier -- dark navy card, icy blue hex, rotating animated border, breathing glow, always-on effects
[x] Achievement toast -- components/AchievementToast.tsx, slides in from right, hex badge, staggered text, double shimmer, tier-colored left border, global emitter pattern, AchievementToastRenderer in _layout.tsx
[x] Theme preview rows -- hardcoded opaque bg + text + border per theme so rows always look correct regardless of active theme
[x] Default theme changed to Light -- Light/Dark order swapped in settings list
[x] Header icon buttons -- all swapped to filled/solid variants, permanent build standard going forward
[x] You vs Yesterday card -- tier/priority metric system (Tier 1: net cals, steps, sleep score, water; Tier 2: weight, active cals, sleep hours), 4 metrics shown always, win/loss/tie per metric, accent bar on winner, score bar with YOU vs YESTERDAY, cycling motivational lines per result, streak badge, cardOrder merge fix for new cards
[x] Running BMR -- NET formula app-wide updated to consumed minus active burn minus running BMR
[x] Sleep HealthKit persistence -- sleepHours, sleepStages, sleepTimes now written to pj_YYYY-MM-DD in HealthKit persist useEffect. sleepBedTime/sleepWakeTime use same keys as manual entry path.
[x] Calendar modal transparency -- CalendarModal in head-to-head.tsx swapped bgCard to bgSheet, fully opaque on all themes
[x] Food search overhaul -- debounce 400ms, race condition fixed via searchIdRef, OFF search_simple=1 removed, page size 20, USDA removed entirely
[x] Barcode override system -- pj_barcode_overrides storage key, SET button on result rows during active scan session, green checkmark on confirmed items, persistent scan banner, Search for more button, override pins confirmed item at top of results
[x] Head to Head screen -- app/head-to-head.tsx, fade transition, any two dates, all 7 metric cards, score bar, delta lines, win/loss/tie badges
[x] Edit layout sheet -- bottom padding fixed, handle tap to close, centered fade modal, smooth in/out animation, overflow contained
[x] Day Detail modal conversion -- DayDetailContent component with date+onClose props, wired into index.tsx as fade modal, prev/next day navigation via ‹ › arrows, CLOSE button, bgSheet background, calendar button in home header opens modal
[x] ThemedStatusBar -- switches light/dark based on themeId, wired into _layout.tsx
[x] Head to Head polish -- HEAD TO HEAD title, date text, calendar icon, EDIT LAYOUT title all accent color
[x] Day detail card polish -- stronger borders, per-theme shadow opacity, food/exercise entry names bumped to DMSans_600SemiBold + textSecondary token
[x] Day detail net cal -- profileBmr calculation added, todayBurned prop passed from index.tsx, history days use stored activeCalories fallback
[x] You vs Yesterday yesterday net cal race condition -- inline BMR calculation instead of relying on profileBmr state, now consistent with Head to Head
[x] _layout.tsx day-detail animation reverted to 'none'
[x] You vs Yesterday water + steps tie bug fixed -- exact integer comparison, no buffer, same fix in head-to-head.tsx
[x] Edit exercise modal -- transparent background fixed (bgSheet), Reanimated slide-up refactor, handle + tap-outside-to-close, accent colored title, withTiming both directions for consistent speed
[x] Exercise interface cardio fields -- duration, distance, speed, incline, resistance, hr, calories added to workoutData.ts Exercise type
[x] Exercise name color in workout tab -- textPrimary swapped to textSecondary to match theme
[x] Calorie bar stutter on full reload -- AnimatedProgressBar now accepts ready prop, calorie bar gates on calTarget > 0 with 300ms HealthKit settle delay, water/steps use original 800ms path unchanged
[x] MacroDonut draw-on animation -- protein/carbs/fat animate in sequence, same pattern as SleepDonut. PENDING FATSECRET TESTING -- cannot verify until API is live
[x] Today's Message chevron removed -- whole card already tappable, chevron was redundant
[x] TooltipIcon refactored -- self-contained component, manages own modal + markSeen, callers pass tooltipKey only
[x] Calories Today (i) wired -- definitions array: Remaining, Active, Net, Color Coding. Example block for NET formula. tooltipRegistry category field added to all entries.
[x] (i) Tooltip system -- full infrastructure shipped: useTooltip hook (pj_tooltip_* AsyncStorage keys), TooltipModal component, TooltipIcon component (pulse animation, 3 pulses, 1500ms delay, fires once per cold launch until seen), tooltipRegistry.ts, Settings > Help section (collapsible, Definitions + Tips & Guides shell, Show Again per entry, auto-scroll on expand), sleep score (i) wired as first live card, Reset Tooltip States in dev tools
[x] ToggleSwitch component -- custom sliding pill toggle, replaces RN Switch. Full theme control, accent thumb when ON, muted when OFF. Use everywhere going forward.
[x] Settings SETTINGS header -- accent colored
[x] Settings card depth/shadow pass -- shadowOpacity 0.18 on section StyleSheet
[x] IF countdown (i) wired -- definitions: Fasting Method, Starting Your Window, Closing Your Window, Result. No example block.
[x] You vs Yesterday (i) wired -- definitions: Metrics, Win/Loss/Tie, Score. No example block.
[x] Fitness Metrics (i) wired -- definitions: VO2 Max, Cardio Recovery. No example block.
[x] Macros Today (i) wired -- definitions: Protein/Carbs/Fat, Goals, Color Coding. No example block.
[x] All home screen tooltips complete. Remaining cards (Water, Weight, Today's Training, Steps, Daily Note, Today's Message) confirmed self-explanatory, no (i) needed.
[x] Activity level architecture overhaul -- DONE. All 5 files updated: profile.tsx, your-style.tsx, index.tsx, log.tsx, head-to-head.tsx. New formula: Math.round((bmr * lifestyleMultiplier) + trainingDailyBonus). Birthday parse fix in all calc blocks. Old activityLevel replaced by lifestyleActivity + trainingFrequency throughout.
[x] Onboarding Screen 6 (Apple Health) -- DONE. Light theme, red beating heart (iOS Health red #FF3B30, double-beat pulse loop), 5 health data rows with staggered fade+slide entrance, static layout (no scroll), centered CONNECT APPLE HEALTH button, Maybe later skip, read-only line in footer. requestAuthorization call via require('@kingstinct/react-native-healthkit'). Saves healthKitConnected to pj_settings (merge-safe). Skip saves pj_healthkit_skip = 'true'. Routes to Screen 7. Home banner for skippers -- wired via pj_healthkit_skip flag, banner build pending (next session or Screen 7 thread).
[x] Food library + Food and + Recipe buttons -- copied from log.tsx header to add-food.tsx library header. Both screens retain the buttons. Order: + Food | + Recipe | barcode. + Food opens CustomFoodCreator (wired into add-food.tsx). + Recipe routes to recipe-builder.
[x] Save New Food to Library inline form killed -- button and 2-field inline form removed entirely from add-food.tsx.
[x] Edit button on My Foods rows -- routes to full edit-food.tsx screen. Old slide-up 2-field modal killed entirely.
[x] Style switcher in settings -- Your Style section added to settings.tsx. Three mode rows, active checkmark, Discipline commitment Alert, saves styleMode to pj_settings. Persists on kill/reopen.
[x] Calorie color coding mode-aware -- Discipline ±50/±51-149/±150+, Balanced ±150/±151-300/±301+, Mindful textSecondary no color ever. calDelta = Math.abs(totalCals - adjustedTarget). index.tsx + log.tsx both updated and consistent.
[x] Mindful calorie card -- textSecondary big number, no color coding, progress bar neutral blue, REMAINING/ACTIVE/NET hidden, evening nudge after 8pm, no redundant goal line.
[x] You & Yesterday renamed app-wide. Mindful reframe -- no score bar, no countdown, no net calories, no tier2 fallback, not tappable, neutral columns, cycling 4th slot (Showing Up / Log a Meal / Worked Out), side bars removed. Balanced/Discipline unchanged.
[x] Macro color coding -- macroOver red removed from ALL modes. Macros always show identity colors (protein green, carbs amber, fat red). "X g over" sublabel removed, shows "X g remaining" only.
[x] Weight card Mindful neutralization -- current weight, vs yesterday, total lost, goal row all textSecondary in Mindful. No green/red color judgment on weight numbers.


NOW -- active this session
Auth and onboarding

Firebase Auth -- Apple/Google login, both required (App Store rules mandate Apple login if any third party login offered). Firestore setup, data migration from AsyncStorage. Pre-TestFlight requirement.
Onboarding flow -- COMPLETE. All 7 screens built and working.

Workout tab facelift

Effort score redesign -- large satisfying tiles, proper selected state with accent fill, replaces flat grid survey feel.
Workout notes overhaul -- KAV fix, dim/inactive save button, toast on save, wire to journal as workout category entry.
Done. Go Home. -- remove entirely or replace with smarter completion state that surfaces effort + notes naturally when all exercises checked.
Add Exercise button -- fix visibility on light themes, redesign so it reads as a clear primary action.
Edit/Remove button redesign -- style to match app design system, not plain unstyled web buttons.
Progress/momentum element -- running tally of exercises completed visible during session.
Visual hierarchy pass -- exercise rows, Apple Health badge, stats line spacing and weight.

Food and search polish

Bugs -- fix first:
Recents math bug -- fsId not passed through from recent entries, caused per-100g scaling instead of correct serving data. FIXED.
[x] Recents math bug -- fsId now stored and passed through loadRecent in add-food.tsx, food-detail uses correct serving data instead of per-100g scaling. DONE.
Macros not persisting to recents/favorites -- DONE. loadRecent now carries full macro payload, showMyFoods and My Foods FlatList tab map all nutrients, favorites tab already correct.
Favorites bug -- identical food names share favorite state, both toggle together. (still open)
fsId saved on star from search results list in add-food.tsx -- favorites now open to label serving. DONE.
Favorites fsId fix -- label serving saved on favorite, fetched on tap from favorites tab, on-demand fetch in food-detail when fsServings empty, non-100g sort fix. DONE.
fsId saved on diary entries in saveEntry, passed through edit entry path in log.tsx. DONE.
Food Library title bug -- shows "Add to Morning" when navigating from library button. DONE.
Edit entry scaling bug -- opening entry from log showed macros scaled to 100g instead of logged amount. DONE. amountChanged flag added to food-detail, useExisting gates on isEditing + unchanged amount.
Recent tap 100g bug -- tapping recent food opened to 100g instead of logged amount. DONE. openFoodDetail extracts amount from description for isRecent items.
Favorites serving size bug -- favorites opened to label serving. DONE.
Favorites extended nutrition 0 -- DONE. toggleFav pulls from selectedServing when available, saves full flat macro shape.
FatSecret badge showing mid-type with no results -- DONE. Badge hidden when query has no results.

Search results CPP pass -- DONE. Card-style rows, brand name separated, macro strip, per-theme shadows, accent left border, SET card green border, fixed cal alignment, header accent colored, scan banner plain text, barcode cooldown removed, Save New Food gated to library only.
Macros on search result rows -- DONE. Protein/carbs/fat strip under food name, macro colors match app system.
food.get on search result tap -- DONE. Fetches real servings on text search tap via fetchFatSecretServings helper. Extended nutrition (fiber/sodium/etc) only available after food.get.v4 call -- not available on search list rows by design (20 simultaneous API calls per search not viable). Extended nutrition always present on food detail screen after tap.
Serving size picker on food detail -- DONE. Serving picker modal, grams defaults to real serving grams, per-gram rates locked for accurate manual gram scaling.
SET banner tip -- plain icon + text in place but still needs CPP polish pass.
UNSET feature -- SET button toggle on search results page, unset on food detail near star.
Rename food on entry -- editable name field on food detail before logging, custom name stored with entry.
Save New Food to Library -- full macro fields in proper modal, not just name + calories. SUPERSEDED by Custom Food Creator below.
Custom Food Creator -- DONE. components/CustomFoodCreator.tsx, centered modal with scale-in animation, required name + calories with * markers, optional brand/macros/extended nutrition in collapsible section, serving size + serving label, saves to pj_my_foods with custom_XXXXX ID. Entry point: + Food button in log.tsx header. + Recipe also moved to log.tsx header. Custom foods open to correct serving with absolute macros (useExisting extended to isCustom flag). Extended nutrition saves as foodNutrients array. Brand shows under food name in food detail. Photo upload, vitamins/minerals deferred to SOON.
Save as Copy -- "..." menu on food detail header (next to star). Opens Custom Food Creator prefilled with all FatSecret data -- name, brand, every macro, serving. User can edit anything before saving. Solves FatSecret name/data cleanup without touching shared database.
loggedAmount / loggedUnit -- now stored as separate fields on each entry alongside the name string. Enables accurate edit entry serving restoration.
Loading spinner -- DONE. Instant on keypress, ActivityIndicator + Searching... text.
Clear Food History dev tool -- DONE. Wipes entries only, water/steps/sleep/weight untouched.
Recent description strips amount suffix -- DONE. Star matching now works correctly across all paths.
Barcode-to-My-Food assignment -- link barcode permanently to manually built food.
Meal slots fully customizable -- rename, reorder, add custom slots. (HIGH)
FatSecret attribution -- "Powered by FatSecret" lockup required by API terms. Display on food search results screen and food detail screen. Pull exact logo/sizing requirements from FatSecret brand guidelines before building. Non-negotiable for App Store. DONE -- badge on both screens, opacity 0.65, tappable to fatsecret.com. App Store description phrase required at submission time.

Food detail polish pass:
- Depth/shadow pass, general CPP treatment
- Title "FOOD DETAIL" to accent color -- DONE (covers Edit Entry header too)
- Back chevron to accent color
- Serving amount + unit row redesign -- quantity and serving unit visually linked on one row
- Amount field color consistency fix
- Section label "NUTRITION FOR XG" to card label style (9px, uppercase, 3 letter-spacing, textMuted)
- Macro values lowercase g (6g not 6G)
- Star/favorite -- spring animation on tap, haptic, toast on food-detail. Haptic + toast + confirm Alert on FlatList star rows in add-food. DONE.
- Empty states on all 4 library tabs (Recent / My Foods / Favorites / Recipes) -- icon, title, subtitle per tab. DONE.
- Search no-results empty state -- DONE. Search icon, "No results for X", subtitle.
- Favorites fsId save + fetch real label serving on tap -- DONE via food-detail path. add-food list path still open (see bug above).
- "..." menu on food detail → Save as Copy, opens Custom Food Creator prefilled (NEXT BATCH)
- Search results brand contrast/separation improvement

Food log screen polish pass:
- X delete button on entry rows to muted red
- Macro donut center calorie number -- remove, redundant with number displayed outside donut (NOW)
- Macro donut sequential segment animation with pauses -- each macro fills then brief pause before next, same pattern as sleep donut (NOW)
- Macro donut animation on food detail -- DONE. Animated version matching log.tsx MacroDonut.
- Macro dots on collapsed meal rows (protein/carbs/fat colored dots + grams) -- DONE. Colored circles, always shows all 3 even at 0, lowercase g.
- Collapsed meal row item count -- show "X items · XXX kcal" on collapsed state
- Food name / brand split on entry rows -- DONE. Brand removed from log entries by design. Amount inline after food name. Entry height fixed at 54px per entry, no clipping.
- Meal header total more visually prominent than individual entry calories
- Empty state big "0" to textMuted until food logged
- Advanced nutrition page 2 visual polish -- card label style header, accent/textPrimary values when data exists, textMuted when empty
- Entry row padding/breathing room
- Favorites fade-on-remove animation -- item should fade out before disappearing when removed from favorites FlatList. DONE.
- Bottom safe area padding on library screen
- Tab bar (Recent/My Foods/Favorites/Recipes) polish pass -- selected state weight, container depth
- Sources of recommendations -- wire as (i) tooltip on calorie target result screen

Active calorie accuracy:
- Calorie discrepancy bug -- root cause was calorie TARGET mismatch between home (using live recommended) and log (using stale saved value). Fixed via useRecommendedCal toggle in profile -- toggle ON keeps calTarget live and in sync, toggle OFF lets user set custom static value. FIXED.
- Sleep duration bug -- HealthKit bed/wake times correct but displayed hours off (11:08pm-5:12am showing 6h 0m). Diagnose in index.tsx. (NOW)
- Active calorie overestimate disclaimer -- small disclaimer on any screen showing active or net calories. Apple Watch and most wearables overestimate active burn. "Active calorie estimates from Apple Health may vary. Use as a guide, not a guarantee." Exact wording TBD.
- Burn accuracy adjustment setting -- optional user-controlled percentage modifier on active calories (e.g. apply 80% of reported burn). Fully explained with worked example. (i) tooltip on setting. Linked Tips & Guides help article. Surfaces in settings under Health. Differentiator -- no other app does this honestly. NOW -- Justin flagged as high priority, do not lose. First-use tooltip on home screen when active calories first appear: "These numbers come from Apple Health -- tap to adjust if they seem off." Build after onboarding complete.

Bugs and polish -- fix these first

Birthday scroll confirm button -- fixed. Larger tap targets on Cancel/Confirm, overlay bottom tightened to stop intercept. DONE.
Edit exercise input validation -- DONE. Cardio fields use filterDecimal (one decimal max). Sets/reps/rest fixed to number-pad with integer-only validation.
FatSecret logo hit bar -- fixed. alignSelf: 'center' on TouchableOpacity in add-food.tsx and food-detail.tsx. DONE.
"G" to "g" -- grams label showing as uppercase G throughout app. Audit all screens and fix to lowercase g everywhere.
Daily note card KAV -- fixed. onFocus scrollToEnd brings card into view above keyboard. DONE.
Macros Today refresh animation -- fixed. refreshKey prop added to MacroBar, 800ms delay matches other bars. DONE.

Edit Layout Add button -- deferred. Currently redundant with inline toggle. Will become "browse and discover" entry point when card library grows (30+ cards, categories, premium content). Build out properly then.
Today's Message chevron -- removed. DONE.

Custom water modal transparent background -- fixed (bgSheet). DONE.
Custom water modal fade in/out -- wired with Animated.Value, blur on close, tap outside to dismiss. DONE.
Sleep score label -- fixed as byproduct of sleep overhaul. DONE.
Head to Head opponent date -- fixed (textSecondary). DONE.
Head to Head back chevron -- fixed (accentRaw). DONE.
Sleep edit picker -- single activeSleepPicker instance, no flicker, Cancel button added, Clear wipes sleepFeelRating. DONE.
Edit exercise modal -- transparent background bug fixed (bgSheet), Reanimated slide-up refactor complete, handle + tap-outside-to-close added, accent title, withTiming both directions for consistent speed. DONE.
Exercise name color in workout tab -- textPrimary swapped to textSecondary to match theme. DONE.
Exercise type cardio fields -- duration, distance, speed, incline, resistance, hr, calories added to Exercise interface in workoutData.ts. DONE.


FatSecret integration -- passes initial gate check, extended testing in progress

OAuth 1.0a signing working (CryptoJS), search and barcode both returning real data, barcode override system working. FS_SECRET updated to 659c1da30b4e48eaab5788534cb2b77a. Extended testing still needed: food detail via text search, end-to-end log entry with real macros, edge cases (no brand, missing nutrients). OFF stays in code until fully confirmed.

(i) Tooltip system -- DONE. See DONE section above.
TooltipIcon refactored -- self-contained, manages its own modal state and markSeen. Callers pass tooltipKey only, no onPress or external modal needed. All future tooltips follow this pattern. DONE.
Calories Today (i) wired -- covers Remaining, Active, Net formula + worked example, Color Coding. tooltipRegistry category field added to all entries. DONE.
Tooltip modal template locked -- required sections: icon circle, Bebas title all caps, body intro, definitions array (bold term + explanation), conditional example block, Got it button, footer. Definitions render as bold textPrimary term + textSecondary explanation, no dividers, vertical gap between each. DONE.
tooltipRegistry category field + Settings Help grouping -- category field shipped. Settings Help rendering needs update to group by Nutrition / Fitness / Sleep & Recovery with section headers. Replaces current flat DEFINITIONS list.

Sleep overhaul -- DONE. Three scoring paths shipped. Path 1 HealthKit full (score always shows). Path 2 HealthKit hours only + Path 3 manual -- feel rating 1-5 required, no score until answered. Feel bonus 1→+0 through 5→+40, max score 100. Score labels 85+ Well Rested / 70-84 Could Be Better / below 70 Poor Sleep. You vs Yesterday and Head to Head gate sleep score on feel rating for Path 2/3, fall back to sleepHours. sleepFeelRating stored in pj_YYYY-MM-DD.
Sleep score label bug -- fixed as byproduct of sleep overhaul. DONE.

Verify and close

Macro bars confirmed animated. Calorie bar stutter fixed. MacroDonut draw-on animation built -- pending FatSecret testing.
Log.tsx calorie progress bar animates on entry add/delete. DONE.
Log.tsx deleteEntry immediately recalculates totalProtein/totalCarbs/totalFat. DONE.
Today's Total macro row lowercase g, DMSans font. DONE.
fsId saved on diary entries in saveEntry, passed through edit entry path in log.tsx. DONE.


SOON -- confirmed next few sessions
Primary button audit -- sweep app-wide, upgrade all primary CTAs to full accent fill, demote transparent bordered style to secondary actions only (Edit, Cancel, filter pills). Applies to every screen.

Food and barcode

Custom water amount modal -- drag interaction, .5oz increments, 48oz max, live oz display, tappable numpad with .5 key, KAV, fade in/out, centered. (top of SOON)
Edit Food screen (edit-food.tsx) full CPP polish pass -- currently a raw unstyled form. Needs card styling, field grouping, accent title, floating save bar, depth. Dedicated polish session.
Recipe builder screen polish -- needs accent title and floating save bar at minimum. Full CPP pass needed. (SOON)
App-wide OZ to oz audit -- index.tsx and log.tsx fixed this session. day-detail and any other screens not yet checked. Complete audit needed. (SOON)

Women's health and HealthKit

Women's health -- TOP OF SOON. Discuss exact feature needs with Megan before building. HealthKit exposes menstrual cycle data, ovulation test results, basal body temperature, cervical mucus quality, spotting, cycle start/end dates. Smart correlation with nutrition patterns (undereating flagged alongside irregular cycle) is the goal. Do not release without this -- huge differentiator for female users.
HealthKit permissions audit -- review full list of available HealthKit data types against currently requested permissions in useHealthKit.ts. Add all women's health metrics. Also add any missing high-value metrics (HRV, resting HR, basal body temp, blood oxygen, flights climbed, basal calories) in next build so data is available before features need it. Do not waste a build later on permissions that should have been requested now.
Smart insights and trends layer -- auto-detect patterns automatically and surface them gently. Undereating, irregular meal timing, sleep and nutrition correlation, habit gaps. Discipline: direct language. Mindful: warm and observational. Never judgmental.

Home screen and cards

Mindful mode content hiding -- weight graphs, body comp data, and performance-heavy cards should not show for Mindful users. Audit all cards and hide irrelevant content per mode.
Tab bar scroll-to-top -- tapping the active tab icon when already on that tab should scroll the screen back to top.
Big dimmed card icon watermark -- large version of each card's icon sitting behind card content at ~5% opacity. Subtle texture, gives cards more identity. Apply to all home screen cards.
Steps goal button -- remove goal button from steps card top right. Move step goal setting to profile/settings alongside other goals.
Weight projected graph in profile -- add alongside weight goal card in profile.

Sleep

Sleep edit disclaimer -- when user opens manual sleep edit, show disclaimer that manual entry will overwrite Apple Health synced data.

Workout

Workout notes KAV -- keyboard covers notes input. Fix.
Add exercise numeric keypad -- reps, sets, and rest duration fields should use numeric keypad not full keyboard.
Profile card collapse animation lag -- very laggy on expand/collapse. Likely JS thread issue. Diagnose and fix.
Collapsible card animation fix (stats.tsx + profile.tsx) -- both use wrong pattern (spring on interpolated 0→1 value, JS thread only). Fix: onLayout-based real height measurement, dual animation (container height JS thread + content opacity/translateY native thread), Easing.out(Easing.cubic) open / Easing.in(Easing.cubic) close. Per animation standard in instructions. NOW.
Workout notes auto-sync to journal -- new Fitness category added to journal categories. When workout notes saved in workout tab, silently create journal entry tagged Fitness with that day's date. Subtle toast: "Note saved to journal." User views it in journal tab. No navigation from workout card needed.

Faith and community

Mission statement screen -- dedicated screen written in Justin's voice. Covers faith integration philosophy, TDEE accuracy differentiator, You vs Yesterday concept, what makes this app different from MFP and Cronometer. Findable via hotlink on splash screen and in profile/settings. Written warmly, not corporate.
Prayer request feature -- user can submit a prayer request via email. Two entry points minimum: verse/Today's Message card and profile/settings. Do not bury. Requires email collection at signup or onboarding.

Streaks

Streak grace day system -- mode-aware. Discipline: earn grace days by hitting milestones (streak length or cumulative days), cap 1 saved at a time. Balanced: same earn system, cap 3. Mindful: no punishment mechanic, streaks are informational only or default to gentle habit-forming ones.
Custom streaks system -- all three modes get full access to all streak options. User can create custom streaks with name and emoji, check in manually. Defaults differ per mode: Discipline/Balanced default to performance metrics (calories, steps, workout). Mindful defaults to gentle habit-forming ones (gratitude entry, hydration, morning intention). Architecture is the same across all modes.

Visual polish

Empty state illustrations -- replace icon + text empty states with tasteful SVG illustrations. Consistent style, theme-aware colors. Apply across all lists and cards that can be empty.

Social

Social and accountability -- lightweight accountability partner feature, not a full social feed. One person you share your daily score with. Strava-inspired but scoped way down. (BACKLOG -- not urgent)
Vitamins & minerals fields on Custom Food Creator -- Vitamin D, Calcium, Iron, Potassium. Power users track these, feeds future reporting. (SOON)
My Foods delete warning -- confirm Alert before × delete on library list rows. (SOON)
Custom Food Creator photo upload -- photo field on create/edit. (SOON)
"Adding to" UX from library -- when food detail opened from library, meal selector should be more prominent since user must always pick. Currently defaults to Morning. (SOON)
Calorie breakdown by meal -- each slot gets a budget. Unclear if needed, revisit later.

Workout

Today's Training empty/rest day states -- encouragement on unassigned day, acknowledgment on rest day.
You vs Yesterday streak (vsStreak) -- state declared and badge renders but never calculated or persisted. Always 0. Needs full implementation: calculate win/loss result at end of day, persist streak count to AsyncStorage, reset on loss.
My Programs builder -- name it, assign focus/tags/color per day, save, load. (planned, not yet built)
Workout tab nested scroll bug -- DraggableFlatList inside ScrollView warning. (HIGH)
Workout drag handle -- hit target too small + dead zone before drag triggers. (HIGH)
Edit exercise input validation -- decimal/integer restrictions on all numeric fields, same standard as weight input. (SOON)
Apple Health avg HR per workout -- research whether kingstinct library exposes avg HR per workout sample; if yes, auto-populate on workout sync. (SOON)

Home and stats

Food log donut -- thicker ring, show macro targets inside when empty instead of "no data".
Weekly calorie bar chart -- 7 day bars macro color stacking, today highlighted, PocketScale style. (HIGH)
Stats page revamp -- dedicated session, consolidation, pagination, sleep detail page, per-metric exclusion UI.
Stats page depth/shadow pass -- same shadow treatment as settings cards (shadowOpacity 0.18). Do during stats overhaul session.
Day detail dedicated polish session -- full feature audit, heavy polish pass, decision on what stays/goes. HIGH PRIORITY NOW.
Streak card -- Bible, workout, calorie streaks. (HIGH)
Morning briefing card -- first open of day, faith first, yesterday recap, today targets.

Health data

HealthKit source detection -- read source identifier on HealthKit samples to show "via Garmin", "via Whoop", "via Oura" labels on sleep/HRV data. Garmin/Whoop/Oura all sync to Apple Health natively -- source passthrough is the right architecture, no direct integrations needed.
Food group pattern detection -- if user logs zero whole foods (fruits, vegetables, lean proteins) for X consecutive days, surface a gentle tip. Discipline: direct. Mindful: warm/observational. Never judgmental.

Faith and Bible

Faith/Bible Settings panel -- Bible page gear icon opens Faith Settings sheet: font size for reading text, translation selector (future), faith-specific Help/definitions (streak, journal categories), reading plan settings placeholder. Faith category in tooltipRegistry.ts as placeholder. Main settings Help stays Nutrition/Fitness/Sleep & Recovery only. Dedicated session.
Bible auto-scroll to verse -- auto-center highlighted verse when opening from Today's Message. (very soon)
Achievement toast improvements -- tappable routes to achievements page, trigger context under name, wording update before App Store launch.

Process and infrastructure

Tooltip wording polish pass -- dedicated pass over all tooltip copy after all cards are wired. Known issues: Active (Apple Health fallback language for non-watch users), Remaining (confirm algorithm accuracy vs what's described), Net (explain running BMR before using the term), Color Coding ("big calorie number" needs rewrite). Do as one session with full context of every card.
Settings > Help section -- two subsections: Definitions (auto-populates from tooltip registry, Show Again per entry) and Tips & Guides (shell built now, placeholder entry, mini help articles filled over time e.g. "How to improve your sleep score", "Understanding your active calorie estimate"). About row planned, not built yet.
Coaching style deep-dive page -- dedicated screen explaining all three modes in depth. Who each mode is for, what changes per mode, why certain features are hidden in Mindful, language differences, worked examples. Written warmly, not like a help doc. Findable from settings and from onboarding. NOW -- high value, reduces churn from users who feel they picked wrong.
Settings page overhaul -- collapsible card sections, CPP. Planned sections: Account, Appearance, Health, Notifications, Faith, Help, About/Legal. Profile/settings boundary cleanup included. Dedicated future session.

App name -- finalize from shortlist (Prevail, Steadfast, Worthy, Haven, Witness, Sown), verify App Store + TikTok handle availability before committing. Prevail is strongest -- punchy, fitness-forward, faith-adjacent without screaming it.
TestFlight -- setup, App Store Connect, tester invite flow. Friends and family first, not wide beta.

Visual polish (do together)

Shadow pass -- increase shadow opacity and darkness on light themes (Slate, Light, Blush, Warm).
Gradient pass -- more visible gradient range on all light themes.
Full theme audit -- all 5 themes x all accents, every screen, before beta.
Progress bar track color pass across all themes.
Collapsible card tap targets app-wide -- entire header row should trigger expand/collapse.
Stats page streaks card -- choppy open animation, fails to reopen after first close.
Empty states -- designed placeholders for all lists and cards. (HIGH)

Journal

Edit entry title -- currently only notes and category editable.
Journal icon on Stats tab header -- routes to journal.tsx.
Day detail integration -- show journal entries from that day at bottom of screen.
Date on entries tappable -- routes to that day's day detail.


BACKLOG -- parked, good ideas, not imminent
Social and accountability partner -- lightweight, one person you share daily score with. Not a full social feed. Strava-inspired but scoped. Build after core features stable and onboarding complete.
App name and tagline finalization -- finalize from shortlist (Prevail, Steadfast, Worthy, Haven, Witness, Sown). Verify App Store + TikTok handle availability. Prevail is strongest. Current tagline "the app that actually cares" needs replacing -- doesn't land. Prevail direction has a tagline waiting in it.
Onboarding illustrations -- tasteful SVG illustrations, one per screen, consistent style, theme-aware. High return on effort, do after onboarding flow is fully functional.
Water log timestamps -- store timestamp with each water entry, enables habit reporting and distribution analysis.
Customized tip push notification system -- personalized notis based on habit patterns: late bedtimes, bad sleep scores, under/over calories, water distribution gaps (e.g. only drinking in AM). Requires notification infrastructure + habit tracking logic. Build after core features stable.

Faith system -- see MODES & ONBOARDING section for full spec

Gratitude before meals -- one tap give thanks before logging, unapologetically Christian
Faith-based fasting -- intentional spiritual fasting with prayer log, separate from 16:8 IF
Weekly body stewardship reflection -- gentle faith-based weekly prompt, never preachy

Food intelligence -- post coaching modes

Food health score -- per item score based on how well it fits current goals at that moment
Coach insight -- one line explanation under food item, contextual not generic
Why did you eat -- quick tag (Hungry, Tired, Cravings, Bored, Social, Why not?)
How did it feel -- post meal tag (Satisfied, Happy, Unsatisfied, Stuffed, Nostalgic)
Hunger level logging -- 1-5 scale one tap before eating
Calorie periodization -- higher calories on workout days, automated suggestion
Restaurant menu lookup -- scan/search restaurant, pull nutrition from FatSecret. Post-FatSecret feature.
Protein timing badge -- hit protein within 2 hours post workout, simple yes/no badge

Stats and insights -- dedicated session

Time of day food heat map -- visualized as grid, high differentiation value
Energy level tracking -- correlates with food choices, "you always crash at 3pm on high carb days"
Sleep vs food correlation -- connect sleep data to prior day food choices, unique insight
Hydration timing insights -- not just how much but when
Per-metric sleep exclusion -- exclude sleep without excluding full day data. Revisit during stats revamp.
Nap tracking -- Apple Health tracks naps separately iOS 16+

Workout features

Sessions tab in workout library -- save day's exercise list as named session, load onto any day. Depends on My Programs.
HIIT mode -- Tabata, standard intervals, custom
Workout rest timer between sets
Lifting set tracker with progressive overload
Apple Health badge on imported workouts

Body and progress

Body measurements tracking
Progress photos -- pose overlay ghost camera
Camera progress tracker -- timelapse, 30/60/90 day anchors

Social and sharing

Accountability partner -- share streaks with one person only, private and intentional
Pastor/coach view -- share week summary, read-only, no account needed on their end ideally

Bible and faith content

Bible reading programs / Bible studies
Search within journal entries (low priority)
Long text stress test -- verify 500 word entries format correctly
Multiple entries same day -- verify prayer + gratitude same day display correctly
Today's Message management UI -- scripture rotation manager, personal messages CRUD

App infrastructure

State restoration on launch -- save active tab/scroll position, restore on cold launch. (top of backlog)
Tooltip pulse visibility awareness -- only fire pulse animation when card is actually visible in ScrollView viewport. Currently pulses on mount regardless of scroll position; user may miss it if card is off-screen. Options: intersection observer pattern or scroll position tracking. Complex, not blocking.
Pull weight from Apple Health -- auto-populate if available, manual entry as fallback
Offline first behavior
Daily summary push notification
In-app review prompt
Accessibility -- respect system font size
Excluded dates -- design and placement, neutral dim dot on calendar, excluded list view. Revisit during stats revamp.
Notification center -- bell icon in profile header, badge on new notifications, real-time toasts for Health sync events
Android -- React Native core code is largely reusable. HealthKit is iOS only; Android equivalent is Health Connect (Google API). Android is v2 launch after iOS is solid. UI, food logging, workout tracking, Firebase all work cross-platform already.

Monetization and launch

Theme monetization -- Light/Dark free, rest paid
Accent color monetization -- TBD
Stats premium tiers -- non-standard charts paid
App Store optimization
Weight trend sparkline (LOW)
Language / internationalization (LOW)
Apple Watch companion app (LOW)
iOS home screen widget (LOW)
Animated app icon -- iOS 18 (LOW)

Marketing

TikTok strategy -- anonymous account for now, rebrand to app name when locked, interactive series format, crowd-sourced decisions, meme formats
App name content series -- "help me name my app" poll sticker, "help me design my app", etc
Photo logging anti-gimmick angle -- decided against photo logging because it's inaccurate (can't see oil, portion weight, prep method). "We don't guess, we track" is a potential marketing hook.
Distribution path: 200-300 genuinely engaged users first, Christian community warmest early audience, ProductHunt, Reddit (r/Christianity, r/fitness, r/selfimprovement)


MODES & ONBOARDING -- FULL SPEC
This section is the authoritative reference for Your Style, Faith Journey, and the onboarding flow. All build decisions live here.

STORAGE
styleMode stored in pj_settings -- values: 'discipline' | 'balanced' | 'mindful'. Default: 'balanced'
faithJourney stored in pj_settings -- values: 'rooted' | 'exploring' | 'notrightnow'. Default: 'rooted'
fitnessGoal stored in pj_settings -- values: 'lose_weight' | 'build_muscle' | 'improve_endurance' | 'feel_better' | 'healthier_relationship' | 'move_more'. Default: 'feel_better'
macroPreset stored in pj_settings -- values: 'high_protein' | 'balanced' | 'low_carb' | 'performance'. Default: 'balanced'
onboardingComplete stored as pj_onboarding_complete -- value: 'true'. Gate key. If present, skip onboarding entirely. Zero other keys touched by onboarding logic.
Dev tools: "Reset Onboarding" button added to 7-tap dev tools. Clears pj_onboarding_complete only. All other data preserved.

ONBOARDING FLOW -- 7 SCREENS
Progress bar chrome shown on all screens except Welcome. Simple segmented bar top of screen, fills as user advances. Not a step counter, just visual momentum.

Screen 1: Welcome
PROJECT J in Bebas Neue, large, centered. Tagline placeholder underneath. Background is dark with subtle animated gradient. Elite smooth entrance animation -- staggered fade+translateY on logo, tagline, continue button. CPP level, no excuses. Continue button at bottom. No progress bar on this screen.

Screen 2: Profile Setup
Name, current weight, goal weight, goal pace. Calorie target calculated and shown live at bottom as fields are filled. Clean card layout, KAV, floating continue button.

Screen 3: Style Survey
Title: "Let's find your style" in Bebas Neue accent color.
4 questions, each with 3 answer options worth 1, 2, or 3 points. Higher = more Discipline-leaning.
Questions:
1. What's your biggest challenge? (Stress eating → 1, Portion control → 2, Staying consistent → 3)
2. What's your primary goal? (Feel better overall → 1, Build healthy habits → 2, Hit specific targets → 3)
3. How do you handle setbacks? (I give myself grace → 1, Somewhere in between → 2, I analyze and recommit → 3)
4. How important is tracking numbers? (Numbers stress me out → 1, General awareness is fine → 2, I want full visibility → 3)
Scoring: 4-6 → Mindful, 7-9 → Balanced, 10-12 → Discipline.
No skip -- answers required to generate recommendation.

Screen 4: Your Style (Recommendation)
Shows recommended mode based on survey score with personalized one-liner referencing their answers. Example: "You want results but you give yourself grace -- that's exactly what Balanced is built for."
Three style cards shown, recommended card pre-selected with accent border. User can override recommendation.
"You can always change this in Settings" as small muted text below cards.
Current weight + goal weight: side by side inputs at top of data section. Current weight pre-populated from storage. Both feed the projection graph.
Lifestyle activity + training frequency: compact 2-col grids below weight fields. 4 lifestyle options (2x2), 5 training options (2x2 + 1 centered). All boxes minHeight 72. Both update calorie target live.
WEEKLY GOAL section: pace pills set the actual daily calorie target -- not a graph filter, a real commitment. Pills dim based on goal direction (losing dims gain pills, gaining dims lose pills, same weight dims all but Maintain). Selected pace name badge appears next to YOUR PROJECTION label.
YOUR PROJECTION graph: SVG bezier curve, draw-on animation, fill fades in after line. Curve steepness reflects pace magnitude. Midpoint date labels (0, 1, or 2 depending on projection length). Discipline and Balanced only -- not shown to Mindful.
Mindful gets warm encouragement language instead of graph and presets: "You've already taken the first step."
Macro presets shown for Discipline and Balanced only -- not shown to Mindful. Discipline defaults to High Protein pre-selected. Balanced defaults to Balanced pre-selected.
Discipline gets commitment screen before Continue fires.

Screen 5: Faith Journey
Title: "Your Faith Journey" in Bebas Neue warm amber color.
Background vibe: warm embers. Animated amber/gold particles drift upward slowly like embers. Soft ambient glow. Warm, not intense -- hearth/candle energy, not fire.
Three cards, same tappable pattern. Warm, inviting copy per option (see FAITH JOURNEY COPY below).
No skip option -- "Not Right Now" card is the graceful exit. Continue button dims until a card is selected.
Animated verse block below cards -- fades in on first selection, swaps gracefully on each tap. Verse and "You can change this anytime in Settings" ride together in the animation.

Screen 6: Apple Health -- BUILT
Title: "Better Data. Better Results." in Bebas Neue, textPrimary.
Subtitle: "Connect Apple Health and Project J gets smarter. Every metric is more accurate, more personal, and more useful."
Red beating heart icon box at top (#FF3B30, iOS Health red, double-beat pulse animation).
5 health data rows in a card -- Steps, Sleep, Active Calories, Weight, Heart Rate. Each has blue Ionicon, bold label, muted one-liner description.
No scroll -- static layout, everything fits on screen.
Footer: CONNECT APPLE HEALTH button (full width, accent color, centered Bebas text), Maybe later muted text, read-only disclaimer line.
Connect: calls requestAuthorization, saves healthKitConnected:true to pj_settings (merge), routes to Screen 7.
Skip: saves pj_healthkit_skip:'true' (new key, no existing keys touched), routes to Screen 7.
Home banner for skippers triggered by pj_healthkit_skip -- one-time dismissable, build pending.

Screen 7: You're All Set
Clean, celebratory, brief. Accent icon, short affirming one-liner (varies by mode -- see below). Mode-aware affirming line before options.
Mindful and Balanced users: two options for home screen setup. "Set it up myself" (opens card picker, secondary style button) and "We'll set it up for you" (applies curated default for their mode silently, primary accent button). No third option -- two choices only, clean and unambiguous.
Discipline users: no card picker prompt. Their layout is set. That is part of the commitment. One button: "Let's go." Full accent, centered.
All options save pj_onboarding_complete and navigate to home.
Affirming one-liner by mode:
  Discipline: "You came here for a reason. Let's make it count."
  Balanced: "You've got everything you need. Let's build something real."
  Mindful: "Every day is a new start. We're glad you're here."
Card picker: tapping "Set it up myself" opens the Edit Layout sheet directly on the home screen after navigation. Do not block navigation -- navigate first, then trigger sheet open via a flag or param.

DISCIPLINE COMMITMENT SCREEN
Fires between style selection and Continue on Screen 4 when Discipline is picked.
Also fires when switching TO Discipline post-onboarding from settings.
Does NOT re-fire on subsequent opens if already onboarded as Discipline.
Three short commitments in clean centered typography -- exact copy TBD during build, tone: direct, resolute, no fluff.
Single button: "I'm in." Cannot continue without tapping it.

YOUR STYLE -- WHAT EACH MODE CHANGES

Discipline:
- Calorie color coding: tight thresholds, symmetric both directions. Green: within ±50 kcal of NET target. Amber: ±51-149 kcal. Red: ±150+ kcal. Applies to the final NET number (consumed minus active burn minus running BMR). Same calc as built, thresholds change per mode.
- Macro color coding: strict tolerances.
- Calorie card: full REMAINING / ACTIVE / NET display with running BMR. All data shown.
- You vs Yesterday: full W/L/T framing. Motivational lines are firm ("Push harder tomorrow", "Don't let up", "Finish what you started").
- You vs Yesterday default card position: high (position 3 in default order).
- Language throughout: direct. "You're 200 over" not "You're close."
- Effort score: present, prompted on workout completion. If effort score is consistently under 3 for 5+ days, morning briefing card surfaces a callout ("Your effort scores have been low this week. Is something getting in the way?"). Never a push notification, never a modal -- morning card only.
- Streak card: default higher in card order.
- Default card order: verse → calories → workout → vs_yesterday → macros → weight → sleep → water → fitness_metrics → IF → daily_note. All cards visible by default.
- Daily summary language: hard truth + challenge. Leads with calorie/goal delta.
- Streak break: Acknowledgement Modal fires on next app open. Requires button press, cannot be dismissed by tapping outside. Direct but not shaming.
- Mode nudge notifications: "Still committed?" check-in if inconsistent 2+ weeks. Single fire, dismissable.

Balanced:
- Calorie color coding: forgiving thresholds, symmetric both directions. Green: within ±150 kcal of NET target. Amber: ±151-300 kcal. Red: ±301+ kcal.
- Macro color coding: forgiving tolerances.
- Calorie card: full display same as Discipline.
- You vs Yesterday: full W/L/T framing. Motivational lines are encouraging, middle of road.
- Language: encouraging. "A little over today, you'll find it tomorrow."
- Default card order: verse → calories → workout → macros → water → steps → sleep → weight → vs_yesterday → IF → fitness_metrics → daily_note. All cards visible by default.
- Daily summary language: genuine recap, leads with biggest win of the day. Order: win → delta → encouragement.
- Mode nudge notifications: "Feeling ready to level up? Your Style can change anytime." 60 day cooldown, dismissable, toggleable.
- Differentiator from Discipline: no commitment screen, no streak break modal, no effort score callout, forgiving language, forgiveness moments in daily summary.

Mindful:
- Calorie color coding: OFF. No color judgment on calories ever.
- Macro color coding: OFF. Note: macroOver red removed from ALL modes app-wide -- identity colors always used regardless of mode.
- Calorie card: simplified. Big number textSecondary (softer than textPrimary, no color coding ever). Progress bar stays neutral blue. REMAINING/ACTIVE/NET row hidden. No goal line (redundant with target shown next to number). Soft warm nudge text shown after 8pm -- rotates through 4 messages, no numbers, no over/under language. Active/Remaining opt-in via card settings affordance -- spec locked, build deferred to SOON.
- You vs Yesterday: card renamed "YOU & YESTERDAY" app-wide (all modes). Mindful behavior: W/L/T hidden. No score bar. No winner declared. Shows deltas only for 3 locked metrics: steps, sleep, water. 4th slot cycles contextually -- "Logged a meal" checkmark once any food logged, "Worked out" checkmark once workout logged, "Journaled" once journal entry saved. Rooted/Exploring faith users get "Read today's verse" or "Reflect" in the 4th slot rotation. Main 3 locked, 4th cycles based on what's most relevant. Card hidden by default in Mindful home layout but available in Edit Layout.
- Language: observational, never judgmental. "You logged today" is celebrated regardless of number. "You showed up" energy.
- Logging encouragement: the fact they logged anything is celebrated. No "you're over" framing ever.
- Default card order: Today's Message → Water → Sleep → Steps → Today's Training → Calories → everything else. You vs Yesterday hidden.
- Daily summary language: leads with what they DID (not what they didn't). Numbers present but not in bold accent colors. Emphasis on encouragement. Specific data included but framed neutrally.
- Mode nudge notifications: gentle, warm, 30 day cooldown. "You've been showing up. Whenever you're ready, there's more here for you." Dismissable, toggleable.
- Home card setup: "You're All Set" screen gives three options (set it up myself / let app decide / later). "Let the app decide" is visually prominent.
- Macro presets: NOT shown to Mindful users. Numbers-focused, contradicts the philosophy.
- Weight projection graph: NOT shown to Mindful users. Showing a weight loss curve to Mindful users is the wrong energy.
- Burn accuracy adjustment: shown but framed as "calibrate your data" not "fix your numbers." Neutral language only.

MODE-AWARENESS RULE -- NON-NEGOTIABLE
Every new feature must define its Mindful behavior at build time, not retroactively. Before shipping any feature, ask: "Does this behave differently in Mindful?" If yes, build both versions. If no, document why. No backtracking later to add Mindful versions to shipped features. This is a build gate, same as disclaimer standard and dim/inactive button states.

FITNESS GOAL OPTIONS PER MODE
Discipline and Balanced:
- Lose weight
- Build muscle
- Improve endurance
- Feel better overall

Mindful:
- Feel more energized
- Build a healthier relationship with food
- Move my body more
- Feel better overall
No weight loss language in Mindful goal options. Designed for users with eating disorders, diet fatigue, or anyone who needs a safe non-judgmental experience.

FAITH JOURNEY -- WHAT EACH TIER CHANGES

TODAY'S MESSAGE CARD -- UNIVERSAL RULE
Today's Message (verse id: 'verse') is default slot 1 for ALL users regardless of Style or Faith Journey combination. It is moveable and hideable by the user after onboarding like any other card -- but always starts at position 1. The card content morphs based on Faith Journey setting, not its position.

Rooted:
- Full Today's Message experience. KJV verse, amber glow, routes to Bible screen, full reflection flow.
- Verse rotation weighted toward theme matching Style (perseverance/strength for Discipline, grace/rest for Mindful, balanced for Balanced). Not 100% -- healthy skew, still full range.
- All faith features on and visible.

Exploring:
- Full Today's Message experience same as Rooted.
- Faith features present but no prompts or nudges beyond the card itself.
- User engages at their own pace.

Not right now:
- Today's Message card stays in slot 1 but content switches to Daily Intention mode. No verse, no amber glow. Neutral styling, same card shape. Card is never removed -- only the content changes.
- Daily Intention prompt varies by Style:
  Discipline: "What will you commit to today?"
  Balanced: "What does a good day look like for you today?"
  Mindful: "What's one kind thing you can do for yourself today?"
- Motivational/intentional messages rotate in place of scripture. Tone matches Style.
- User can add custom intentions. No Bible routing.
- Faith features quietly hidden. No journal verse category surfaced. Bible tab still accessible via navigation.

FAITH JOURNEY COPY (ONBOARDING SCREEN 5)
Rooted title: "Rooted" -- copy: "Faith woven into every day. Verses, reflection, prayer. All front and center."
Exploring title: "Exploring" -- copy: "Come as you are. Faith at your own pace. There's no wrong way to start."
Not Right Now title: "Not Right Now" -- copy: "We're glad you're here. These features are available whenever you need them, and this door never locks."
Tone: warm, inviting, zero judgment. User never feels pressured or evaluated.
Verse mapping (animates in on card selection): Rooted -- Colossians 2:7. Exploring -- Jeremiah 29:13. Not Right Now -- 2 Corinthians 5:17.
Skip option removed -- "Not Right Now" card IS the graceful exit. No separate skip needed.

POST-ONBOARDING MODE SWITCHING
Accessing from: Settings (both style and faith journey changeable post-onboarding).
When user taps a new Style in settings, Acknowledgement Modal fires before saving:
- Top half: brief warm description of what they're switching to (2 sentences max).
- Bottom half: two buttons -- "Keep my layout" (behavior changes, card order stays) and "Apply [Mode] defaults" (behavior changes + card order resets).
- Switching TO Discipline: commitment screen fires again. They are recommitting. Intentional.
- Switching FROM Discipline: simple confirmation modal, no drama.
Faith Journey switch: brief descriptor of what changes, single confirm button. No layout choice (faith journey does not control card order).
After any mode change: toast fires -- "[Mode] style applied."
"You can always change this in Settings" -- messaging present on mode recommendation screen (Screen 4) and visible in settings header for Style and Faith Journey sections.

ACKNOWLEDGEMENT MODAL -- REUSABLE PATTERN
Established pattern for moments requiring explicit user acknowledgement before proceeding.
Use cases confirmed: Discipline commitment screen, streak break on Discipline, mode switch confirmation.
Behavior: cannot be dismissed by tapping outside. Requires button press. Used sparingly -- only for genuinely significant moments.

MODE NUDGE NOTIFICATIONS -- DEFERRED TO SOON
All three tiers have mode nudge notifications in spec above. Deferred -- needs notification infrastructure first. Add to SOON when notification system is built.

WEIGHT PROJECTION GRAPH
Shown on Style recommendation screen (Screen 4) for Discipline and Balanced users only. Not shown to Mindful.
Uses current weight, goal weight, and goal pace to draw a smooth SVG curve from today to projected goal date.
Shows start weight, goal weight, and projected month/year at endpoint.
Also shown on profile page near goal weight field post-onboarding.
Built using existing SVG library.

MACRO PRESETS
Shown on Style recommendation screen (Screen 4) for Discipline and Balanced users only. Not shown to Mindful.
4 named presets:
- High Protein: 35p / 35c / 30f
- Balanced: 30p / 40c / 30f
- Low Carb: 35p / 25c / 40f
- Performance: 25p / 50c / 25f
User selects one, sets macro targets automatically. Can be changed in settings post-onboarding.
Discipline defaults to High Protein pre-selected. Balanced defaults to Balanced pre-selected.

WHAT IS DEFERRED (build in future sessions)

- Daily summary / morning card (mode-aware language) -- SOON
- Scripture weighting by mode + verse tagging system -- SOON
- Streak break Acknowledgement Modal -- needs streak system built first, SOON
- Contextual first-open setup for Log tab (calorie/macro goal prompt) and Workout tab (fitness focus prompt) -- SOON
- Effort score callout logic in morning briefing -- SOON
- Mode nudge notifications -- SOON, needs notification infrastructure
- Mood check-in card (Mindful-first, available to all) -- SOON
- Gratitude prompt card -- SOON

BUILD STATUS
[x] Onboarding flow -- in progress (screens 1-6 built, screen 7 remaining)
[x] Onboarding Screen 6 (Apple Health) -- BUILT. See spec above.
[x] pj_settings styleMode + faithJourney + fitnessGoal + macroPreset fields -- wired in Screen 4
[x] App boot logic -- pj_onboarding_complete gate
[x] Dev tools reset onboarding button
[x] Style survey -- 4 questions, 1-2-3 scoring, buckets: 4-6 Mindful / 7-9 Balanced / 10-12 Discipline
[ ] Mode recommendation screen -- personalized one-liner, pre-selected card, override allowed
[x] Weight projection graph -- Screen 4 onboarding. SVG bezier curve, animated draw-on, fill fades in after line. Pace pills (WEEKLY GOAL section) set calorie target and drive curve shape. Lifestyle/training compact 2-col grids. Curve steepness reflects pace magnitude. Midpoint date logic (skip if too close to end date). Incompatible pace pills dimmed based on losing/gaining direction. Same weight = only Maintain active. Selected pace name badge next to YOUR PROJECTION label.
[ ] Weight projection graph -- profile page post-onboarding. Build when profile polish session comes.
[x] Verify currentWeight save on Screen 4 persists correctly to pj_YYYY-MM-DD -- confirmed working. Weight entered in onboarding reflects correctly in profile and daily log.
[x] Screen 2 (Profile Setup) fixes -- weight field removed (moves to Screen 4), KAV footer rides keyboard flush with no dead space, birthday picker tap-outside-to-dismiss, keyboardDismissMode removed so scroll doesn't kill keyboard.
[x] Style survey rebalance -- 5 questions, new scoring thresholds (5-8 Mindful / 9-12 Balanced / 13-15 Discipline). All questions rewritten for clear mode separation. Q1: end of day feeling. Q2: how progress is measured. Q3: handling setbacks. Q4: tracking numbers (unchanged). Q5: missing a day behavior. scaleAnims auto-handles 5 questions via QUESTIONS.map().
[ ] Macro presets -- onboarding + settings, Discipline/Balanced only, not shown to Mindful
[ ] Progress bar chrome on onboarding screens 2-7
[ ] Apple Health onboarding screen -- permissions prompt, skip option, home banner for skippers
[x] Mindful calorie card simplification -- big number textSecondary no color coding, progress bar neutral blue, REMAINING/ACTIVE/NET row hidden, soft warm nudge after 8pm, redundant goal line removed. Consistent across index.tsx and log.tsx.
[x] You & Yesterday renamed app-wide (all modes). Mindful reframe -- no score bar, no countdown, no net calories, no tier2 fallback, no tap-to-head-to-head, neutral columns, cycling 4th slot (Showing Up / Log a Meal / Worked Out), side bars removed.
[x] Calorie color coding mode-aware -- Discipline ±50/±51-149/±150+, Balanced ±150/±151-300/±301+, Mindful textSecondary no color. calDelta = Math.abs(totalCals - adjustedTarget). Consistent across index.tsx and log.tsx.
[ ] Mindful onboarding -- encouragement language, no projection graph, no macro presets
[x] Discipline commitment screen -- tappable rows, spring checkmark animation, bg deepen, button unlocks when all three confirmed, Bebas throughout
[x] Faith Journey onboarding screen -- dark charcoal/navy background, multi-color ember particles (26, warm palette), three tappable cards with breathing amber border, animated verse fade-swap per selection (Colossians 2:7 / Jeremiah 29:13 / 2 Corinthians 5:17), diamond icons, finalized copy, change note animates in with verse, routes to apple-health
[x] Default card orders per mode applied on first onboarding complete -- Screen 7 applies correct order + visibility per styleMode on any button tap. pj_open_edit_layout flag triggers Edit Layout sheet on home for "Set it up myself" path.
[x] Default accent + theme per mode on onboarding complete -- Discipline → Amber, Mindful → Forest, Balanced → Blue. discipline + mindful AccentIds added to Light palette in theme file. setTheme/setAccent called live in all-set.tsx so no cold restart needed. Steps missing from Discipline order fixed.
[ ] Post-onboarding mode switch Acknowledgement Modal
[ ] Daily Intention card for Not right now users
[x] Settings exposure for Style and Faith Journey post-onboarding -- Style switcher built in settings.tsx. Three rows (Discipline/Balanced/Mindful), active selection checkmarked in accent, Discipline shows commitment Alert, others show description + Switch confirm. Reads/writes styleMode to pj_settings. Full Acknowledgement Modal with layout choice deferred to SOON.
[ ] "You can always change this in Settings" messaging on mode recommendation screen
[ ] Firebase Auth -- Apple + Google login, Firestore migration
[ ] FatSecret attribution -- "Powered by FatSecret" on search + food detail screens


ANIMATION AUDIT -- LIVING DOCUMENT
This list must be updated whenever an animation is built or changed. Reference this before any animation work.
Contextual Achievement Toast Animations (phase 2):

Water goal -- water filling up inside the toast badge
Steps goal -- animated footprints or walking figure across the toast
Weight milestone -- scale needle swinging or numbers ticking down
Streak milestone -- flame growing or chain link clicking into place
First workout logged -- dumbbell or barbell animation
Sleep goal hit -- moon and stars, ZZZ floating up
Calorie goal hit -- plate clearing or flame extinguishing
IF fast completion -- clock hands spinning then unlocking
Bible verse read -- subtle page turn or bookmark placing
Journal entry saved -- ink spreading or pen stroke
Morning intention set -- sun rising animation
Workout fully checked off -- card completion pulse or flash

Number Transitions (HIGH PRIORITY -- affects entire app):

All big numbers tick/roll to new value like a scoreboard when they update
Applies to: calories, steps, weight, water, macros, streak counts, any meaningful number
Should feel like an old scoreboard or odometer, not a snap

Progress Bars and Rings:

Calorie progress bar animates on every load
Macro bars animate on log tab entry
Food log donut ring fills on load
Water bar bounce when updated
Sleep donut animates on load

Goal Moments:

Water goal hit -- bar fills to accent, pulse animation
Step goal hit -- steps number flips green
Calorie goal hit -- number color transition

Onboarding:

Weight projection graph (Screen 4) -- SVG curve draws itself left to right via strokeDasharray animation (700ms), fill gradient fades in after line completes (300ms). Fires on first render and on every pace pill change.

Workout:

Exercise checkmark -- spring scale on check
Progress bar fills smoothly as exercises checked
Day scroller dots -- color transition on active day change


NOTES AND DECISIONS
Journal entry format:
Storage key: pj_bible_reflections
Entry shape: { id, date, category, title, notes, verseRef?, verseText?, acknowledged?, bookRef? }
Categories: verse, prayer, study, personal, gratitude, workout (planned)
Verse entries only via Bible screen reflect button
FAB creates: prayer, study, personal, gratitude only
id format -- verse: YYYY-MM-DD_verse, others: YYYY-MM-DD_timestamp
Faith system decisions:
Christian app by default, faith features on for all users out of the box
Faith Journey is opt-out not opt-in
"Not right now" not "Not for me" -- leaves door open
Faith Journey and Coaching Modes built together same session
Today's Message card behavior forks based on Faith Journey setting
Bible decisions:
KJV translation in use throughout
Full 66 books via aruljohn/Bible-kjv on GitHub, fetched at runtime, cached per book in AsyncStorage
Cache key format: pj_bible_{BookName}_{chapterNum}
52 preset rotation verses updated to KJV
Sleep score decisions:
Score 0-100 displayed in donut center
Algorithm: Duration 40pts (sleepHours/sleepGoal * 40, capped at 40) + Deep % 30pts (peak at 20%) + REM % 30pts (peak at 22%)
No stages case: Path 2 (HealthKit hours only) or Path 3 (manual) -- feel rating required, score gated until answered. Feel bonus 1→+0 through 5→+40, max 100.
Color thresholds: 85-100 green "Well Rested", 70-84 amber "Could Be Better", 0-69 red "Poor Sleep"
Sleep goal pulls from pj_profile sleepGoal field, defaults to 7 if not set
Manual entry vs HealthKit entry scored differently -- review thresholds carefully before changing
Nap tracking: Apple Health tracks naps separately iOS 16+, worth exploring for stats page
Food database decisions:
FatSecret Premier Free is primary -- Consumer Key and Secret held by Justin, OAuth 1.0a signing required
USDA dropped permanently -- garbage results for branded foods
OFF stays as fallback only until FatSecret passes all three gate checks, then removed entirely
Barcode override system: pj_barcode_overrides AsyncStorage key, local first, Firebase community database phase 2
FatSecret attribution: "Powered by FatSecret" required on food search and food detail screens per API terms. Non-negotiable for App Store. Pull exact brand guidelines from FatSecret before building.
Screen 4 (Your Style) decisions:
Pace pills (WEEKLY GOAL section) set the actual calorie target -- not a graph filter. Framed as a commitment, not a hypothetical.
Pill dimming logic: if goal < current weight, gain pills dimmed and unclickable. If goal > current weight, lose pills dimmed. If goal === current weight, all pills dimmed except Maintain. If no goal weight entered, all pills active.
Selected pace name appears as accent badge next to YOUR PROJECTION label (e.g. "YOUR PROJECTION · STEADY").
Lifestyle and training frequency rendered as compact 2-col grids. Training has 5 options -- last one (Daily) centered alone on bottom row at same width as others.
All grid boxes use minHeight: 72 for consistent sizing across both sections.
Current weight pre-populated from pj_YYYY-MM-DD or pj_profile on load. Saved back to pj_YYYY-MM-DD on continue (merge-safe).

You vs Yesterday decisions:
Water and steps: exact integer comparison only, no threshold or buffer
Weight: 0.3 lb fuzzy threshold (floating point rounding)
Net calories: closest-to-target wins
All other metrics: straight greater/less than/equal
Button design standard:
Primary CTA buttons (Save, Log, Confirm, any submit action) get full accent fill always. Transparent bordered style is secondary only -- Edit, Cancel, filter pills, destructive actions. Using transparent bordered on a primary CTA reads as cheap. This applies to all new builds and will be audited app-wide in a dedicated SOON session.
CPP -- Clean, Professional, Premium:
Core product principle. Every visual, interaction, and feature is tested against CPP before passing gate 2. If it doesn't feel CPP it doesn't ship.
Premium and monetization principles:
No carrot dangling -- locked/premium content is discoverable but never pushed in user's face
Trial system planned -- build properly when monetization session comes, not before
Tips & Guides content direction: mini help articles ("How to improve your sleep score", "Hitting your calorie goal", "Understanding your active calorie estimate") -- shell built, content filled over time
Tooltip system decisions:
Footer wording: "More definitions and guides in Settings → Help"
Pulse: 3 pulses, 1500ms delay on mount, fires once per cold launch while seen === false, permanently stops after user taps (i) and Got it
Tooltip scope rule: (i) explains the whole card. Definitions are sections within the card tooltip, never a standalone tooltip for a single stat. One (i) per card, full picture of everything non-obvious on that card.
Tooltip categories: Nutrition, Fitness, Sleep & Recovery. Faith category reserved as placeholder for Faith/Bible Settings panel (future session). Settings Help renders grouped by category with section headers.
ToggleSwitch replaces RN Switch everywhere in app -- RN Switch thumb color unreliable on iOS
Settings > Help auto-scrolls to reveal expanded content after animation completes
Build standards (all non-negotiable, built at time of feature):
Three gate rule -- works, looks premium, feels right
Dim/inactive button states on all submittable buttons
44x44pt minimum touch targets
Disclaimer on all health features
Haptics standard -- light/medium/heavy
Animation standard -- expand/collapse uses off-screen measure + dual animation pattern. Never use maxHeight.
Card press scale -- down to 0.97 on pressIn, back to 1.0 on pressOut
Empty states on all lists and cards
Loading states on async operations
Error states on fallible operations
First use tooltips catalogued in help section
Input validation before storage
Toast on save -- any screen with a save action fires a toast. No silent saves.
Floating save bar -- any settings/profile screen with editable fields
Tab header icon buttons -- always use filled/solid Ionicons variants, never outline. Applies to all tabs, all new features.
Animation audit -- any new feature with meaningful state changes gets added to the animation audit list
Mode-awareness -- every new feature must define its Mindful behavior at build time, not retroactively. Ask "does this behave differently in Mindful?" before shipping. If yes, build both versions. Same gate as disclaimer standard.
Testing standard:
Primary theme: Slate with yellow accent
Onboarding screens always force Light theme (THEMES['light'] direct import, never useTheme()). Apply this pattern to every onboarding screen.

Onboarding files built so far:
- app/onboarding/welcome.tsx -- Screen 1, animated entrance, GET STARTED button, DEV skip button
- app/onboarding/profile-setup.tsx -- Screen 2, name/weight/height/birthday/sex only
- app/onboarding/style-survey.tsx -- Screen 3, 4 questions, 1-2-3 scoring
- app/onboarding/your-style.tsx -- Screen 4, recommendation, activity level, goal weight, pace, calorie target, macro presets
- app/onboarding/faith-journey.tsx -- Screen 5, BUILT
- app/onboarding/apple-health.tsx -- Screen 6, BUILT
- app/onboarding/all-set.tsx -- Screen 7, BUILT
- app/onboarding/commitment.tsx -- Discipline commitment screen, BUILT
Boot gate lives in app/_layout.tsx -- checks pj_onboarding_complete on launch, redirects to welcome if missing.

🚨 ONBOARDING DATA SAFETY -- NON-NEGOTIABLE 🚨
Completing onboarding must NEVER wipe, overwrite, reset, or replace any existing pj_* AsyncStorage data under any circumstances. Justin has real logged data -- food entries, workout history, journal entries, achievements, daily logs, weight history -- and losing it is an unacceptable failure.
Rules that apply to every single onboarding screen without exception:
- Only WRITE new keys or MERGE into existing ones. Never wholesale replace.
- pj_profile saves: always read existing profile first, spread it, then write only the new fields on top. Never write a fresh object from scratch.
- pj_settings saves: same -- read existing, spread, write new fields on top only.
- pj_onboarding_complete: the only key onboarding is allowed to SET fresh without reading first.
- Never call AsyncStorage.clear() anywhere in the onboarding flow. Ever.
- Never overwrite pj_YYYY-MM-DD daily log keys.
- Never touch pj_achievements, pj_bible_reflections, pj_workout_state, pj_my_foods, pj_favorites, pj_recipes, pj_exercise_library, pj_barcode_overrides.
- Dev "Reset Onboarding" button clears pj_onboarding_complete ONLY. Nothing else. This is already implemented correctly -- do not change it.
Before writing any AsyncStorage save in any onboarding screen, Claude must explicitly verify the save is a merge, not a replace. If uncertain, read the key first, spread the result, then write.
Onboarding screen layout decisions:
- Screen 2 collects: name, height, birthday, sex ONLY (current weight moved to Screen 4)
- Screen 4 collects: current weight, activity level (lifestyle + training frequency, compact 2-col grids), goal weight, weekly pace (WEEKLY GOAL section -- sets calorie target, not just a graph filter), live calorie target, style selection, macro presets
- Calorie estimate uses real Mifflin-St Jeor BMR, reads biometrics from pj_profile + today's weight from pj_YYYY-MM-DD
- Activity level defaults: lifestyleActivity = 'sedentary', trainingFrequency = 'none' -- both conservative by design
- Discipline color: #c2621a (amber/orange). Balanced: #2563eb (blue). Mindful: #059669 (green).
Build on Slate yellow, audit all 5 themes x all accents before marking visual features done
Never assume a bug is theme-specific without confirming on multiple themes
Data/storage decisions:
AsyncStorage keys all defined in instructions
pj_profile now includes sleepGoal field
pj_profile activity fields: activityLevel (old, being replaced) → lifestyleActivity + trainingFrequency. Both string fields. Defaults: lifestyleActivity = 'sedentary', trainingFrequency = 'none'. All other tabs and cards read calTarget directly -- they do NOT need changes when this ships. Only profile.tsx, your-style.tsx, and head-to-head.tsx touch the activity fields directly.
Firebase Auth planned pre-beta -- Apple + Google login, Firestore migration from AsyncStorage
Dev reset/export -- pin, build only if needed before TestFlight
Macro goals system:
Two modes - Ratio and Fixed. Cross-mode sync on save.
Workout tag system (shipped):
Tags stored in pj_settings under workoutTags key as WorkoutTag[]
WorkoutTag shape: { id: string, label: string, color: string }
DayProgram shape includes tags?: string[]
Default tags: Push/Pull/Legs/Core/Cardio/Rest -- 6 locked defaults, undeletable
Tag pill style: backgroundColor t.color+'99', borderColor t.color, text #ffffff -- everywhere pills render
Program system (shipped):
BLANK_DAY is the default for all unassigned days -- no DEFAULT_PROGRAM
PRESET_PROGRAMS in workoutData.ts -- 5 presets
Programs modal uses animationType="fade"
Loading a preset shows Alert warning then sets weeklyTemplate
My Programs tab is "Coming Soon" placeholder -- planned, not yet built
Sessions system (planned):
Save a day's exercise list as a named Session
Sessions tab in workout library alongside exercises
Star/favorite system for most-used sessions
Load a session onto any day in one tap
Coaching modes (Your Style):
Full spec in MODES & ONBOARDING section above.
Mode name confirmed: "Your Style" -- over "Coaching Mode" or "Your Rhythm"
Three modes: Discipline / Balanced / Mindful
Default: Balanced
Built same session as Faith Journey -- onboarding flow is the delivery vehicle for both
HealthKit currently pulling:
activeCalories, steps, distance, sleepHours, sleepStages, sleepTimes, vo2Max, cardioRecovery
Not yet pulling: weight, HRV, resting HR, blood oxygen, respiratory rate, basal calories
HealthKit source detection: HealthKit metadata includes source identifier on every sample. Can display "via Garmin", "via Whoop", "via Oura" labels. Garmin/Whoop/Oura sync to Apple Health natively -- no direct integrations needed. Same pattern as existing Apple Health badge on exercises.
GitHub:
Repo: https://github.com/jharmke/project-j
Branch: master
End of session: git add . / git commit -m "description" / git push origin master
Process:
Commit after every gate-passing feature not just end of session
Three gate rule before marking anything done
One feature at a time, no parallel half-builds
Start new threads when current one gets long
New threads always inside the Claude Project
Roadmap updated in real time -- find/replace format, never raw paste, never end-of-thread reconstruction
Instructions updated at end of every session
Any feature, decision, or design direction discussed gets captured before cutting thread
Pin mid-thread ideas and decisions throughout -- do not wait to be asked
Animation audit must be updated whenever an animation is built or changed
Navigation transition standards:
Slide from right -- navigating to a dedicated screen (Bible, Day Detail, Achievements, Head to Head)
Fade -- overlays, sheets, contextual panels on current screen (Edit Layout, modals)
Today's Training tap -- fade, not slide left (slide left = "back" in iOS convention)
Consistent within each pattern matters more than strict rules
Edit Layout sheet -- centered fade modal card, NOT a bottom sheet. Width 92%, maxHeight 72%, borderRadius 20, dim overlay behind it. Never rebuild as slide-up.
Modal + ScrollView pattern (CRITICAL):
Never wrap card in TouchableOpacity to stop propagation -- steals scroll gestures
Correct pattern: separate absolute-positioned TouchableOpacity for overlay, plain View with pointerEvents="box-none" for card layout
Reference: Programs modal in workout.tsx
Manage tags animation (CRITICAL):
Standard Animated.Value translateY does NOT work inside iOS Modals
Fix: use react-native-reanimated useSharedValue + useAnimatedStyle + withSpring
Sheet must be in View with flex:1 justifyContent:flex-end, fire animation in onShow callback
Keyboard: use Keyboard.addListener, never KeyboardAvoidingView wrapping the sheet
Toast above Modal (CRITICAL):
RN Modals create a new native window layer -- normal toast tree is invisible behind Modal
Fix: export ToastRenderer from Toast.tsx, render <ToastRenderer /> inside Modal JSX
Reference: any modal that fires toasts
ACTIVITY LEVEL ARCHITECTURE -- FULL SPEC

Formula: TDEE = (BMR × lifestyle_multiplier) + (weekly_training_bonus ÷ 7)
BMR formula: unchanged -- Mifflin-St Jeor
  Male:   (10 × kg) + (6.25 × cm) - (5 × age) + 5
  Female: (10 × kg) + (6.25 × cm) - (5 × age) - 161

LIFESTYLE ACTIVITY options (replaces old activityLevel, sets base multiplier):
  sedentary   | Sedentary       | Desk job, minimal movement outside of workouts        | 1.2
  light       | Lightly Active  | Some walking, on your feet occasionally during the day | 1.3
  active      | Active          | On your feet a lot -- server, teacher, retail, trades  | 1.45
  very_active | Very Active     | Hard physical labor most of the day                   | 1.6

TRAINING FREQUENCY options (adds flat daily bonus on top of TDEE):
  none   | Not currently training      | Little to no structured exercise          | +0 kcal/day
  1x     | 1-2x / week                 | Light or occasional sessions              | +100 kcal/day
  3x     | 3-4x / week                 | Consistent training most weeks            | +200 kcal/day
  5x     | 5-6x / week                 | High frequency, serious commitment        | +300 kcal/day
  daily  | Daily / twice daily         | Elite or professional training volume     | +400 kcal/day
(weekly bonus = daily × 7: 0 / 700 / 1400 / 2100 / 2800)

Defaults: lifestyleActivity = 'sedentary', trainingFrequency = 'none'

FILES TO UPDATE -- in order:
1. profile.tsx
   - Profile interface: remove activityLevel, add lifestyleActivity: string + trainingFrequency: string
   - Remove ACTIVITY_MULTIPLIERS and ACTIVITY_LABELS constants entirely
   - Add LIFESTYLE_OPTIONS array (key, label, sub, multiplier) and TRAINING_OPTIONS array (key, label, sub, dailyBonus)
   - Fix birthday date parsing bug: replace new Date(profile.birthday) with date-safe parser that splits string manually to avoid iOS UTC midnight issue
   - calcTDEE: new formula = Math.round((bmr * lifestyleMultiplier) + trainingDailyBonus)
   - Activity Level collapsible card UI: two sections -- Lifestyle Activity (4 options) and Training Frequency (5 options), same button style as existing
   - Default state: activityLevel: 'moderate' removed, lifestyleActivity: 'sedentary' + trainingFrequency: 'none' added

2. your-style.tsx (Screen 4)
   - Remove ACTIVITY_OPTIONS array and single activity selector
   - Add LIFESTYLE_OPTIONS and TRAINING_OPTIONS arrays (same values as profile.tsx)
   - Replace single activity state with lifestyleActivity + trainingFrequency state, both defaulting to 'sedentary'/'none'
   - Update calorie calculation to use new formula
   - Update AsyncStorage save to write lifestyleActivity + trainingFrequency instead of activityLevel
   - UI: two labeled sections replacing one, same card style

3. index.tsx
   - Lines ~934-961: inline ACTIVITY_MULTIPLIERS and TDEE calc block, gated on p.activityLevel && p.weightGoal
   - Update gate condition to: p.lifestyleActivity && p.trainingFrequency && p.weightGoal
   - Replace inline ACTIVITY_MULTIPLIERS with LIFESTYLE_OPTIONS lookup and training daily bonus
   - New formula: tdee = Math.round((bmr * lifestyleMultiplier) + trainingDailyBonus)
   - Fix birthday date parsing bug here too -- same fix as profile.tsx
   - setCalTarget and setProfileBmr calls remain, just fed correct numbers

4. log.tsx
   - TWO separate inline TDEE calc blocks (lines ~234-247 and ~299-312), both gated on p.activityLevel
   - Update both blocks identically -- same formula change as index.tsx
   - Fix birthday date parsing in both blocks

5. head-to-head.tsx
   - Read lifestyleActivity + trainingFrequency from pj_profile instead of activityLevel
   - Update TDEE calc to use new formula matching profile.tsx

MARKETING ANGLE (locked):
"Most calorie calculators blend your lifestyle and your workouts into one number -- and consistently overshoot for desk workers who train. We separate them. Your office job is your office job. Your gym time is your gym time."
Short in-app tooltip version: "Most apps overestimate for desk workers who train. We don't."
Potential tagline/marketing hook -- this is a real known flaw in standard TDEE calculators, positioning is factual not arrogant.

Marketing decisions:
App name shortlist: Prevail, Steadfast, Worthy, Haven, Witness, Sown. Dropped: Abide (taken by existing Christian meditation app). Prevail is strongest -- punchy, fitness-forward, faith-adjacent without screaming it.
Branding: NOT marketed as a "Christian app" -- positioned as intentional whole-person wellness. Faith present and unapologetic but not the marketing lead. Chick-fil-A model.
Tagline direction: "The app that actually cares about you"
TikTok: anonymous account for now, interactive series format, crowd-sourced decisions, meme formats mixed in