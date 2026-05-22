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
[x] Sleep score algorithm -- Duration 40pts, Deep % 30pts, REM % 30pts. REM scoring one-sided (above 22% ideal = full pts, never penalized for excess). Sleep tips check stage flags before score threshold so low deep still surfaces even on high-score nights.
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
[x] Fitness Metrics (i) wired -- all 6 definitions: VO2 Max, Cardio Recovery, Resting HR, Resp. Rate, Blood O2, Body Fat. Threshold sources cited (ACSM/ACE/AHA). Body Fat source caveat added. No example block.
[x] Macros Today (i) wired -- definitions: Protein/Carbs/Fat, Goals, Color Coding. No example block.
[x] All home screen tooltips complete. Remaining cards (Water, Weight, Today's Training, Steps, Daily Note, Today's Message) confirmed self-explanatory, no (i) needed.
[x] Activity level architecture overhaul -- DONE. All 5 files updated: profile.tsx, your-style.tsx, index.tsx, log.tsx, head-to-head.tsx. New formula: Math.round((bmr * lifestyleMultiplier) + trainingDailyBonus). Birthday parse fix in all calc blocks. Old activityLevel replaced by lifestyleActivity + trainingFrequency throughout.
[x] Onboarding Screen 6 (Apple Health) -- DONE. Light theme, red beating heart (iOS Health red #FF3B30, double-beat pulse loop), 5 health data rows with staggered fade+slide entrance, static layout (no scroll), centered CONNECT APPLE HEALTH button, Maybe later skip, read-only line in footer. requestAuthorization call via require('@kingstinct/react-native-healthkit'). Saves healthKitConnected to pj_settings (merge-safe). Skip saves pj_healthkit_skip = 'true'. Routes to Screen 7. Home banner for skippers -- wired via pj_healthkit_skip flag, banner build pending (next session or Screen 7 thread).
[x] Food library Create Food/Recipe -- + Food and + Recipe buttons removed from log.tsx meal sections and add-food.tsx header. Replaced with FAB speed dial in add-food.tsx (browse mode only): Create Food (restaurant icon, opens CustomFoodCreator) + Create Recipe (book icon, routes to recipe-builder). Same staggered spring pattern as workout library FAB. Log meal sections now Library button only.
[x] Log tab date picker -- tapping the date text opens a month-grid calendar modal (Jump to Date). Pre-selects active date's month. Tap any non-future date to jump. Today outlined, selected filled accent. Arrows remain after date text for quick single-step nav. Modal: manual Animated.Value fade (no RN animationType jank), handle pill on top tappable to close, backdrop dismiss, accent title, standard interactive blue Cancel button. Same fixes applied to day-detail.tsx calendar which had identical issues.
[x] Save New Food to Library inline form killed -- button and 2-field inline form removed entirely from add-food.tsx.
[x] Edit button on My Foods rows -- routes to full edit-food.tsx screen. Old slide-up 2-field modal killed entirely.
[x] Style switcher in settings -- Your Style section added to settings.tsx. Three mode rows, active checkmark, Discipline commitment Alert, saves styleMode to pj_settings. Persists on kill/reopen.
[x] Calorie color coding mode-aware -- Discipline ±50/±51-149/±150+, Balanced ±150/±151-300/±301+, Mindful textSecondary no color ever. calDelta = Math.abs(totalCals - adjustedTarget). index.tsx + log.tsx both updated and consistent.
[x] Mindful calorie card -- textSecondary big number, no color coding, progress bar neutral blue, REMAINING/ACTIVE/NET hidden, evening nudge after 8pm, no redundant goal line.
[x] You vs Yesterday card -- "You & Yesterday" label in Mindful only, "You vs Yesterday" stays for Balanced/Discipline. Mindful reframe -- no score bar, no countdown, no net calories, no tier2 fallback, not tappable, neutral columns, cycling 4th slot (Showing Up / Log a Meal / Worked Out), side bars removed. Balanced/Discipline fully unchanged.
[x] Macro color coding -- macroOver red removed from ALL modes. Macros always show identity colors (protein green, carbs amber, fat red). "X g over" sublabel removed, shows "X g remaining" only.
[x] Macros over-goal sublabel -- was clamped to "0 g remaining" when over goal. Now shows "X g over" in the macro's identity color when val > goal, "X g remaining" otherwise. index.tsx.
[x] Weight card Mindful neutralization -- current weight, vs yesterday, total lost, goal row all textSecondary in Mindful. No green/red color judgment on weight numbers.
[x] Day detail overhaul -- full rebuild. Killed 3-page horizontal scroll summary. New cards: Day at a Glance (consumed/burned/net + macros + weight/water/steps), Sleep (score pill, duration/bedtime/wake/stages/feel), Workout (chevrons, no strikethrough, note removed), Meals (chevrons), Journal (compact tappable rows -- pill + title + chevron, routes to journal with entry auto-expanded and modal closes), Daily Note, Advanced Nutrition (collapsible), Exclude from Stats. All cards: 1.5px accent top border, hero icons, Ionicons chevrons. Header: DAY DETAIL title, Ionicons date nav. calcSleepScore matches index.tsx exactly.
[x] Day detail journal integration -- loads pj_bible_reflections, filters by date, compact tappable rows route to journal with entry expanded.
[x] Stats calendar day-detail black screen -- router.push loaded a null default export. Fixed: stats.tsx now opens DayDetailContent as the same fade overlay modal as home tab (backdrop dismiss, drag handle, same animation). No separate screen.
[x] Exercise library header + back colors -- accentAmber hardcoded on back chevron, back text, screen title, and ADD/EDIT EXERCISE modal title. All four swapped to accentBlueRaw. workout-library.tsx.
[x] Exercise library "Add to 2026-05-17" -- raw date string in header when in select mode. Fixed: fmtLibraryDay helper shows "Today" or weekday name (e.g. "Add to Monday"). workout-library.tsx.
[x] Day detail modal polish -- CLOSE button removed from both modal wrappers (home + stats). Handle tap + backdrop tap = dismiss. Decision: handle is cleaner on a floating centered card, backdrop tap is the safety net. DayDetailContent header restored to clean centered layout (DAY DETAIL label + date nav). "Back to Today" button removed from bottom. Stats handle spacing fixed to match home (marginTop/marginBottom: 12 on handle pill). Both modals now identical.
[x] Day detail date picker -- calendar icon in header (top-right, same row as DAY DETAIL label) opens month-grid modal. Pre-selects current date's month. Tap any non-future date to jump to it. Today outlined, selected date filled. Overlay dismiss + Cancel button. bgSheet background (fully opaque across all themes -- bgCard is semi-transparent on Slate/Warm/Light). day-detail.tsx.
[x] Workout library redesign -- Programs moved from workout.tsx header modal into library as its own tab (All | Favorites | Programs | Routines). Programs tab shows active program row + preset cards + My Programs coming soon. Routines tab is coming soon empty state. +Add button removed from library header. FAB added (expandable speed dial): Create Exercise (active, solid accent fill + white text/icon + colored shadow), Create Program (disabled), Create Routine (disabled). FAB options cascade in with staggered spring animation (Create Exercise first at 0ms, Create Program 70ms, Create Routine 140ms), all close together on dismiss. Search bar always visible on all tabs, placeholder and filter behavior adapt per tab (filters preset program names on Programs tab). workout.tsx Programs modal and Programs button both removed. Programs load/clear now writes to pj_workout_state via read-then-merge. workout tab picks up program changes via useFocusEffect.
[x] Prayer request feature -- SHIPPED. Internal modal (PrayerRequestModal.tsx), two entry points: Bible screen gear modal + Settings > Help section. User writes request, saved directly to Firestore under users/{uid}/prayer_requests/{docId}. Firestore onCreate trigger (onPrayerRequestCreated Cloud Function) sends email to jtharmke@gmail.com via Nodemailer/Gmail App Password (GMAIL_APP_PASSWORD Firebase secret). Privacy policy updated and redeployed. Settings > Help subtitle updated to "Definitions · Guides · Prayer". Verified working end-to-end on device. Modal subtitle updated to "Every request is read and prayed over."
[x] Routine Builder -- SHIPPED + polished. pj_routines AsyncStorage key stores Routine[] (id, name, tags, exercises, starred). RoutineBuilderModal: centered scale-pop, name field, tag pills (excludes tag_rest), inline exercise search (max 5 results) + browse button (full scrollable library in-modal, already-added exercises dimmed with checkmark), inline quick-add form (name + type, adds to routine only). Exercise rows fully editable: lift gets SETS/REPS/REST fields (numeric keypad), cardio gets DURATION/DISTANCE (row 1) + SPEED/INCLINE/RESIST (row 2, decimal-pad with filterDecimal). All fields default empty. Routines tab in workout-library.tsx: DraggableFlatList with star toggle, pencil (edit), trash (delete + Alert confirm), LOAD ROUTINE button opens day picker. workout.tsx FAB converted to speed dial: Add Exercise + Load Routine items with staggered spring animation, backdrop dismiss. Day pickers (both library + workout tab): week navigation arrows, THIS WEEK/NEXT WEEK/WEEK OF label, past days dimmed + non-tappable, forward weeks unlimited, selections persist across week navigation. LoadRoutineModal: routine list + day picker, pre-selects active day. Load operation replaces exercises + tags on selected days via read-then-merge (never touches checks, notes, cardioLogs, or other day data). Auto-converts rest days on load. workoutData.ts Routine interface added.


NOW -- active this session
[x] Day detail sleep bedtime/wake times showing '--' -- fmtTime was trying to parse already-formatted time strings via new Date(). Fixed: return val directly. day-detail.tsx.
[x] Day detail sleepGoal default wrong -- was 8, home screen was 7. Fixed to 7. day-detail.tsx.
[x] Sleep score duration weighting -- linear formula underpenalized short sleep (5h18m scored 84 with decent stages). Fixed: non-linear power curve Math.pow(hours/goal, 3) * 40. 5h18m now scores 71. index.tsx + day-detail.tsx.
[x] Today's Message blank verse bug -- verse logic was unguarded in finally block. JSON.parse failure OR stale/out-of-bounds rotation indices left dailyVerse null. Fixed: wrapped in try-catch, added resolved verse validation, catch nukes pj_verse_rotation and falls back to random verse. index.tsx.
[x] MuscleMap component -- NEW. components/MuscleMap.tsx. Pure-JS SVG muscle diagram using react-native-body-highlighter (no new native modules; react-native-svg already installed). MUSCLE_SLUG_MAP maps internal muscle strings to library slugs + front/back view. Front + back Body SVGs side by side. Primary muscles orange (#f97316), secondary muted orange. defaultFill uses theme.bgProgressTrack.
[x] Exercise instructions + muscle diagrams in library detail modal -- detail modal scrollable (maxHeight 88%). Shows MuscleMap SVG, MUSCLES section (blue primary pills + muted secondary pills), HOW TO PERFORM numbered steps. workout-library.tsx.
[x] Library AsyncStorage enrichment on load -- existing entries missing instructions/primaryMuscles/secondaryMuscles/tags patched from DEFAULT_LIBRARY on load without overwriting user customizations. New DEFAULT_LIBRARY IDs not in storage also appended. workout-library.tsx.
[x] New exercises not appearing in All tab -- else branch only ran when storage was null; existing storage blocked new additions. Fixed: always append new DEFAULT_LIBRARY IDs missing from storage. workout-library.tsx.
[x] Filter button inline with search bar -- was rendering below search bar (missing flexDirection: row on searchRow). Fixed. workout-library.tsx.
[x] Exercise info (i) button on workout tab -- tapping exercise name row opens info modal showing MuscleMap + numbered HOW TO PERFORM steps. Icon only shows when library entry has instructions or primaryMuscles. workout.tsx.
[x] Empty day state on workout tab -- ACTIVE day with zero exercises shows card with Load Routine button and Browse Library button (routes to workout library in select mode). workout.tsx. Bug fixed: button was mislabeled "Add Exercise" and opened the create-new-exercise modal instead of the library -- relabeled "Browse Library" with library icon.
[x] Load Routine modal shows PRESET_ROUTINES -- modal restructured: PRESETS section (always shown) + MY ROUTINES section (conditional). Previously only showed custom routines. workout.tsx.
[x] Modal animation refactor -- all modals in workout-library.tsx and workout.tsx converted from legacy Animated API (JS thread) to Reanimated withTiming/withSpring (UI thread). Covers: detail, add/edit, filter, load routine picker, RoutineBuilderModal + fill picker in library; info modal and load routine modal in workout tab. FAB speed dial intentionally kept on Animated (uses .interpolate()).
[x] Modal exit animation -- close now fades card opacity 0 + scales to 0.88 over 160ms then unmounts. Previously barely-perceptible 0.92 scale then snap off. workout-library.tsx, workout.tsx.

NOW -- active this session
[x] Profile format refactor -- CollapsibleCard (white boxes) replaced with ProfileSection (flat section headers, accent label + divider line, subtitle preview when collapsed). Matches stats page visual style. profile.tsx.
[x] Stats section sublabels -- subtitle prop added to CollapsibleSection, six sections show preview text when collapsed. stats.tsx.
[x] Settings Pass 2 -- Goals migration. All goal settings moved from profile.tsx to new Goals section in settings.tsx (second in order: Appearance > Goals > Faith & Style > Health > ...). Sub-groups: Fitness Goals (Sleep, Steps, Active Cals, Exercise Mins) and Nutrition Goals (Calorie Target, Macros, Water). Floating save bar, saves to pj_profile via read-then-merge. profile.tsx down to 5 sections (Basic Info, Activity Level, Your Estimates, Weight Goal, Water Presets). Profile reloads on focus when no pending changes to pick up goal edits from settings.
[x] NET label rename -- "NET" renamed to "RUNNING NET" on home calories card stat row, day detail, head-to-head, and You vs Yesterday card. + / - sign prefix added to all four locations (+766 surplus, -200 deficit). index.tsx, day-detail.tsx, head-to-head.tsx.
[x] Recents scaling bug -- tapping a food from Recents was pre-filling the previously logged gram amount (e.g. 150g) instead of the default serving size (115g). Root cause: isRecent block in openFoodDetail extracted logged gram amount from description string and passed it as existingAmount. Fix: removed the isRecent extraction block entirely. food-detail now always falls back to defaultFsServing.grams. add-food.tsx.
[x] STREAKS feature pass -- Stats > Streaks section fixed. Workout: uses actual exercise data from pj_workout_state (was using wrong proxy). Calories: uses full dynamic adjusted target (BMR + lifestyle + training + pace + day's active burn), fixes live-recommended users who had calTarget=0 in settings. Water: uses user's waterGoal from profile instead of hardcoded 128oz. Bible: counts consecutive days with any verse reflection in pj_bible_reflections, today counted immediately (discrete action). All streaks skip today except Bible. NRN users: Bible tile hidden. Grace day system, custom streaks, streak end warning visuals still open -- see SOON > Streaks.
[x] CUSTOMIZABLE STREAKS -- Stats > Streaks section fully rebuilt. 14 preset types: Workout/Calories/Protein/Water/Steps/Active Cals/Exercise Mins/Sleep Duration/Sleep Quality (all auto-tracked) + Bible/Gratitude/Journaling (auto, faith-gated where applicable) + Morning Intention/Prayer (manual check-in, Prayer faith-gated) + Custom (name+emoji, manual). Mode defaults fire once on first load: Discipline/Balanced+faith = Workout/Calories/Steps/Water/Bible; Discipline/Balanced+NRN = +Exercise Mins instead of Bible; Mindful+faith = Gratitude/Water/Sleep Duration/Morning Intention/Bible; Mindful+NRN = Water/Sleep Duration/Journaling/Morning Intention/Steps. Tile layout: 3+2 grid, wraps per row of 3. All tiles show "days" at rest -- manual tiles flash "✓ LOGGED" in tile accent color for 1.5s on check-in then fade back to "days". Gear icon on card header opens scale-pop manage modal (maxHeight 72%; ACTIVE list with DraggableFlatList reorder -- long-press drag handle, persists new order to pj_streaks.config; ADD PRESET list; CREATE CUSTOM button). Both modal handle pills tappable to close. Create Custom modal: no KAV -- uses Keyboard.addListener keyboardWillShow/Hide + translateY on card (200/180ms) to slide in sync with keyboard without white box or teleport; TouchableWithoutFeedback for keyboard dismiss inside modal; handle pill tappable; name field + emoji field (single grapheme enforced); dim ADD until both filled. All config in pj_streaks.config (read-then-merge). Manual/custom dates in pj_streaks.customDates. Journaling streak = personal category only. Tooltip (i) wired, Habits category in tooltipRegistry. stats.tsx.
[x] Macro wrap bug -- gram values now rounded to integers and value Text width bumped 34→40. log.tsx MacroStackedBar.
[x] YvY sleep score tie threshold fixed -- removed < 3 pt band, now exact equality only (t === y), same logic as water/steps. Fixed in index.tsx.
[x] YvY active cals tie threshold fixed -- removed < 25 kcal band, now exact equality only. Fixed in index.tsx.
[x] Head to Head sleep score tie threshold fixed -- same fix as YvY, exact equality only. Fixed in head-to-head.tsx.
[x] Head to Head active cals tie threshold fixed -- same fix as YvY, exact equality only. Fixed in head-to-head.tsx.
[x] Head to Head sleep score winCondition missing -- accidentally stripped during debug cleanup, restored. head-to-head.tsx working correctly.
[x] Win/loss/tie logic audit complete -- all 7 metrics verified consistent across index.tsx and head-to-head.tsx. Weight retains 0.3 lb fuzzy threshold (floating point). sleepHours retains 0.25hr (15 min) buffer. Net calories retains closest-to-target logic. All others: exact equality.

NOW -- active this session
[x] Extended nutrition FatSecret fix -- fall back to selectedServing data in food-detail extended nutrition render. Also trigger on-demand fetch for recents (non-edit path). food-detail.tsx.
[x] Stepper buttons CPP -- interactive blue treatment on - / + buttons, accent symbols. food-detail.tsx.
[x] Save as Copy -- ellipsis-horizontal icon in food detail header for FatSecret foods. ActionSheet replaced with measured-position dropdown callout (fades + slides 8px from button, 180ms native driver). Brand parsed from food.description " · " split when food.brand is empty. Clone Food modal title (not Create Food). Optional section auto-expands when prefilling. prefillExpanded ref fixes empty-space bug on first open. Ellipsis + star buttons normalized to 30x30 with explicit centering. food-detail.tsx + CustomFoodCreator.tsx.
[x] Step goal button removed from home step card -- inline edit UI and Goal pill gone. Step Goal added to profile.tsx as CollapsibleCard with TextInput, saves via whole-profile save flow. stepGoal state and progress bar/sub-label unchanged.
[x] Today's Thoughts card -- renamed from Daily Note. Save Note / Saved check / Clear Note button states match workout note exactly (dim accent 0.4 when nothing to do, full accent when dirty, red Clear Note when text erased after saving). Book icon top right routes to journal. Journal delete of personal category entry now syncs back to clear dailyNote in pj_YYYY-MM-DD (matches fitness/workout sync pattern). useFocusEffect now reads dailyNote on tab return so cleared state is picked up immediately.

[x] Home / log aesthetics polish pass -- light + slate border tokens bumped, light bgCard opacity 0.55→0.72, accent top border (accentBlueRaw, 1.5px) on all home cards, hairline divider above stat row in calories card, weight card divider bumped to borderCardTop. Big number text treatment attempted and reverted -- deferred to BACKLOG.
[x] Home card sub-metric color pass -- calories REMAINING/ACTIVE/NET and weight GOAL/TO GO/PROJECTED moved from accentBlue to textPrimary. Reduces visual clash when strong warm accents (burgundy etc.) compete with semantic color coding (red over-goal, green total lost, sleep stage colors). Hero numbers (176.5 lbs, steps count) and progress bars keep accent. index.tsx.
[x] Big number text treatment -- shadow (shadowColor #000, offset 0/2, opacity 0.18, radius 0) + opacity 0.88 on all hero Bebas numbers app-wide. Applied to: calories (index.tsx + log.tsx), sleep duration, sleep score donut, steps. Treatment is for fontSize 36+ hero numbers only -- smaller numbers (28px weight stats, fitness metrics) left alone.
[x] Sleep donut deep color fix -- light theme sleepDeep changed from #6366f1 (indigo, too close to blue core) to #a855f7 (violet). Pink core / violet deep / green REM now clearly distinct across all themes. Warm theme sleepDeep also corrected.
[x] Accent top border -- all tab cards -- accentBlueRaw, 1.5px borderTopWidth added to every card in log.tsx, workout.tsx, stats.tsx, profile.tsx. Meal rows in log.tsx included. overflow:hidden must NOT be used on cards with shadowed children -- clips shadows. DraggableFlatList in workout.tsx gets contentContainerStyle paddingBottom:16 to fix exercise shadow clipping on last item. Tab bar does NOT get accent top border -- navigation element not a card, hairline separator stays as-is.
[x] IF card State 2 polish -- solid green TAP WHEN YOU EAT button with breathing pulse animation (1.025 scale, 1400ms, 800ms pause). OPEN/CLOSED status as pill badge. Countdown hero left, STARTED/CLOSES labels matching ifLabel style top-right with 22px accent times. Divider borderCardTop 1px. Bottom row: Reset window (textSecondary pill) | LAST MEAL (solid red centered) | Cancel fast (textSecondary pill).
[x] IF card State 3 polish -- TARGET/ACTUAL/WINDOW label-over-value layout, all left-aligned. Target + Actual: accentBlueRaw 22px Bebas. Window times: textSecondary 22px Bebas. Divider below stats. Edit start / Edit end (textSecondary pills) / Reset (accentRed pill). Edit start picker bug fixed -- showTimePicker block added to State 3 animated view. IFCard extracted as proper React component above HomeScreen to fix hooks-in-render violation.
[x] IF countdown pulse animation -- HH:MM:SS split into individual PulseSegment components. Each segment bursts scale 1.0→1.18→1.0 (80ms up, 150ms eased out) when its value changes. useNativeDriver: true, zero JS thread cost. Colons static. CLOSED fallback unchanged.
[x] IF countdown pulse threshold -- pulse suppressed above 30 min remaining. Starts pulsing per-second at <=30 min, counts down to 0. shouldPulse prop on PulseSegment, computed from remaining <= 30 * 60 * 1000 ms. index.tsx.
[x] Water log timestamps + detail modal -- gear icon on water card header. WaterDetailModal: Progress section (two-column hero: LOGGED big Bebas accent + EXPECTED NOW big Bebas status-colored + progress bar below), timestamped entry log (newest first, trash to delete + recalculates total), Quick Add Presets section (3 editable fields, saves to pj_profile). On-track pace derived from HealthKit sleepWakeTime > sleepStoredWake > 06:00 default, 22:00 bedtime. waterEntries [{amount, timestamp, sign}] stored in pj_YYYY-MM-DD alongside water total. All water operations route through doWaterUpdate helper. Same waterEntries load/save in log.tsx. index.tsx + log.tsx.

NOW -- next session
[x] Profile screen KAV (partial) -- keyboard covering goal TextInputs fixed via automaticallyAdjustKeyboardInsets={true} on main ScrollView (line 448). 90% resolved.
[x] Profile screen save bar overlap -- fixed. SAVE_BAR_HEIGHT=76 constant, scrollOffset ref tracking via onScroll on main ScrollView. When hasChanges goes true while keyboardHeight > 0, scrollTo(scrollOffset + SAVE_BAR_HEIGHT). No KAV, no scrollToEnd. profile.tsx.
[x] Sleep Goal picker false hasChanges on open -- fixed. Root cause: scrollTo silently failed on display:none view, leaving wheel at position 0 (5h); CollapsibleCard switched from display:none/flex to {visible && children} so SleepGoalPicker mounts fresh when card opens. isInitializing ref (true on mount, false after 100ms scrollTo) blocks spurious onScrollEndDrag during expand animation. CollapsibleCard marginTop: visible ? 12 : 0 prevents phantom spacing on closed cards. profile.tsx.
IF smart notification / auto-start idea -- if food/calories are logged and IF timer has not been started, offer a notification prompt after X minutes: "Looks like you've logged food -- did you mean to start your IF timer?" Option 2: setting to auto-start IF when first calories of the day are logged. Park for dedicated IF session.

NOW -- active this session
[x] Daily goal celebration system -- handleDailyGoalHit() in achievementData.ts. AsyncStorage-backed once-per-day gate (pj_daily_goal_celebrations). Cumulative hit counts with lastEarned date (pj_goal_hit_counts). Fires showCelebration('small') + showDailyGoalToast() on first crossing per day. Four goals wired: water (index.tsx + log.tsx), steps (HealthKit effect, prevStepsRef replaces broken prevSteps=steps-1 logic), active cals, exercise minutes. Active cal goal + exercise mins goal added as CollapsibleCards in profile.tsx. Both load into index.tsx and gate HealthKit triggers. Daily goal toast: new DailyGoalToastCard + DailyGoalHexBadge in AchievementToast.tsx, "GOAL MET" label, goal name, "Nx achieved" sub. AchievementToastRenderer updated to union queue (achievement | daily_goal). achievementData.ts exports DailyGoalId, DailyGoalCounts, DEFAULT_DAILY_GOAL_COUNTS, loadGoalHitCounts, handleDailyGoalHit.
[x] Achievements page Daily Goals section -- 4-card 2-column grid below existing categories. Each card: DailyGoalHexBadge (solid color hex), goal name, Nx achieved count, Last: Today / Yesterday / date / Not yet earned. loadGoalHitCounts added to useFocusEffect. No lock state -- always visible, count starts at 0.
[x] Profile goal TextInput repopulation bug -- iOS auto-select-all on focus + backspace cleared the field, then value={profile.X || 'default'} fallback reverted to default string. Fixed by stripping all || fallbacks from stepGoal, waterGoal, activeCalGoal, exerciseMinsGoal value props. Placeholder handles empty state visually. Scanned app-wide: all other || patterns are || '' (safe) or DateTimePicker/custom pickers (not affected).
[x] Water goal setting + dynamic goal -- waterGoal added to profile.tsx (CollapsibleCard after Step Goal, default 128oz, saves to pj_profile). waterGoal state in index.tsx + log.tsx loads from profile. All Math.min hard caps removed -- water can now exceed goal. Default waterPresets changed from [12,16,22] to [8,12,16] for new users. Shimmer sweep animation (white LinearGradient, withRepeat linear) on progress bar when water > waterGoal.
[x] Water bugs (3 issues) -- (1) Cap removed: water was never supposed to be hard-capped -- Math.min caps removed from all paths, only Math.max(0) floor retained. (2) Achievement trigger missing on log tab: added checkAndUnlock + showAchievementToast to updateWater in log.tsx. (3) Midnight reset: useFocusEffect in index.tsx was using stale todayKey closure ([] deps); fixed by computing getDateKey(new Date()) inline so focus sync always reads today's actual key regardless of React state timing.
[x] Log tab custom water modal -- was using bgCard (transparent in some themes), plain View, no animation, no tap-outside dismiss. Rebuilt to match home tab: bgSheet, Animated.Value fade in/out, tap-outside dismiss, input ref, openWaterCustomModal/closeWaterCustomModal functions. Sign bug fixed (add button was not explicitly setting sign='add').
[x] Log tab water toasts -- updateWater had no showToast calls. Added "+Xoz · Yoz total" on add and "-Xoz · Yoz total" on remove, matching home tab pattern exactly.
[x] Global celebration overlay -- CelebrationOverlay was local to index.tsx (fireCelebration state + local render). Refactored to global emitter pattern (showCelebration export + CelebrationRenderer mounted in _layout.tsx inside ThemeProvider). Particle burst now fires from any tab. fireCelebration local state + render removed from index.tsx.
[x] Stale achievementStore fix -- achievementStore state in index.tsx and log.tsx was only loaded on mount. Dev tools reset cleared AsyncStorage but left in-memory state showing achievements as already unlocked. Fixed by adding loadAchievements reload to useFocusEffect in both tabs -- fresh state on every tab focus.

[x] Stats sections default open fix -- changed all 5 CollapsibleSection defaultOpen from hardcoded true/false to defaultOpen={isFirst}. Whichever system section has lowest order (top of sorted list) opens by default. All others start closed. stats.tsx.
[x] Stats graph color picker -- color?: string + macroColors?: { protein, carbs, fat } added to StatsCard interface (statsCardRegistry.ts). GRAPH_SWATCHES (8 curated hex colors). Color picker in EDIT GRAPH modal (after Timeframe) and creator Step 3 (above preview). Tap swatch to select, tap again to deselect (reset to default). Weight/calories-line/steps/activeCals/sleep: single color row. Macros: 3 separate rows (protein/carbs/fat), blocked swatch when color used by another macro. workoutFreq and calories-bar skip picker (semantic coloring). MacroBarChart updated to accept proteinColor/carbsColor/fatColor props with system constant fallbacks. getChart() uses card.color ?? theme token. Creator color state resets on data type change and modal close. Edit modal scrollable (maxHeight 480) to handle macros 3-picker height.
[x] Gratitude Streak card -- SHIPPED. components/GratitudeStreakCard.tsx. Home screen card, Rooted/Exploring only (faithJourney gate in index.tsx), default ON in CARD_REGISTRY. Two states: empty (inline text input + LOG GRATITUDE button dim until text entered) and logged (entry preview + Edit + View in Journal). Edit state pre-populates input, saves changes without touching streak. Faith strip: 10 KJV gratitude verses rotating by date. Mode-aware: D/B show streak count (DAY STREAK), Mindful shows total days no streak framing. Universal streak saver system: D cap=1, B cap=2 -- savers stored in pj_streaks.savers, earned after 7 consecutive days from earnBaselineStreak, auto-used on 1-day gap (grace covers miss, streak advances +1 for actual log). Toast on grace used, toast on saver earned. Streak data in pj_streaks.gratitude (currentStreak, totalDays, lastLoggedDate). Journal entries saved to pj_bible_reflections under 'gratitude' category (pre-existing, no conflict with 'verse' category for Bible reflections). faithJourney state added to index.tsx, loaded from pj_settings. Week dot grid: S M T W T F S labels above 7 dots, dot state = logged (accent fill) / today not logged (accent outline) / past missed (dim outline 30%) / future (dim outline 20%). Week computed from Sun-Sat containing today. Journal delete revert fix: loadData detects lastLoggedDate===today with no journal entry and reverts streak increment + persists correction to pj_streaks. Theme passed as prop from index.tsx (not useTheme hook in component) to guarantee correct theme context.

Auth and onboarding

[x] Firebase Auth -- Apple + Google sign-in, session persistence, log out all confirmed working on device. Routing bug fixed: _layout.tsx was missing else { router.replace('/(tabs)') } branch for signed-in + onboarding-complete users.
Onboarding flow -- COMPLETE. All 7 screens built and working.

Workout tab facelift

[x] Done. Go Home. removed -- replaced with progress count (2/2) turning statusGood green when all exercises complete.
[x] Exercise library aesthetic pass -- card rows with accent left stripe matching food library pattern, Ionicons star, accent title (accentAmber), back chevron Ionicons, search placeholder fixed, contentContainerStyle padding, bgSheet modal background.
[x] Exercise library gradient removed -- flat bgPrimary, consistent with all other sub-screens. Decision locked: gradient is exclusive to the 5 main tabs only.
[x] Add Exercise modal -- centered scale-pop animation (overlayOpacity + cardScale spring), dim/inactive ADD button when name empty, bgSheet opaque background, close animation. Keyboard offset via paddingBottom so buttons clear keyboard.
[x] Workout tab FAB -- replaces inline Add Exercise button. Fixed bottom right, 16pt above tab bar, accent fill, scale press animation (0.85 on pressIn, spring back), hidden on rest days.
[x] Workout tab CPP pass -- progress bar animated (300ms both directions), Add Exercise blank fields with dimmed placeholders, edit modal Save dimmed until change made, library + button form is name/type/note only (no sets/reps/rest)
  [x] Rest day overhaul -- emoji removed (moon Ionicon), FAB always visible, adding exercise auto-converts rest day to unassigned and strips tag_rest, manually removing Rest tag syncs type bidirectionally. Hint text added.
  [x] Library preset sets/reps/rest cleared -- always blank when added to workout. Subtext removed from library rows and detail modal.
  [x] Exercise library detail modal -- bgSheet opaque background, accent top border, exercise name accent colored, Add to Day = full accent fill primary CTA, Edit = interactive blue pill, Remove = plain red text. Sets/reps/rest subtext gone.
  [x] Library modal animations -- detail modal close/open smooth (animationType none + manual Animated.Value, onShow callback). Edit modal fade-in fixed (onShow callback replaces unreliable setTimeout). All dismiss paths wired through closeDetailModal with callback chaining.
  [x] Effort score redesign -- large satisfying tiles (52px, Bebas 28px), full color fill selected state, spring tap animation, dynamic color-coded label (EASY/LIGHT/MODERATE/HARD/MAX EFFORT), green/gold/orange/red ramp.
[x] Effort score audit + pipeline -- confirmed saves correctly to pj_workout_state.cardioLogs[dateKey].effortScore. Renamed to "Today's Effort" throughout (workout.tsx card label). Piped into fetchTrendData (reads workoutState.cardioLogs param already available). Added effortScore DataKey to statsCardRegistry + DATA_KEY_META. Now fully graphable via graph creator. Decided: session-level rating only, not per-exercise. Long-term feeds Day Score and reporting.
[x] Workout notes overhaul -- KAV fixed (removed double-adjustment), placeholder "How'd it feel?", dim/inactive save button (opacity-based accent), toast "Note saved to journal", fitness category journal sync (read-then-merge, dedup by day). Saved ✓ / Save Note / Clear Note states. Clear Note wipes both workout state and journal entry. Journal delete syncs
   back and clears workout note. Book icon in card header routes to journal.
[x] Edit/Remove button redesign -- inline pencil + trash icons in exercise row, left of checkmark. Bottom button row removed. Pencil textMuted, trash accentRed, alert before delete.
Progress/momentum element -- running tally of exercises completed visible during session.
Visual hierarchy pass -- exercise rows, Apple Health badge, stats line spacing and weight.
Workout library sort + filter -- filter button opens bottom sheet with all existing tag/muscle group chips as selectables. Tap chips filters list live, no confirm needed. Filter resets on library exit. Sort is separate from filter, both can be active simultaneously: A-Z, Z-A, Most Used, Recently Used, Favorites First. Most Used + Recently Used require per-exercise usage tracking data -- audit whether that data exists before building those options. Favorites First is immediately doable. muscleGroup field on exercises, filter chips (Chest/Back/Shoulders/Arms/Legs/Core/Cardio), default library pre-tagged, add modal gets picker. (SOON)
  [x] Journal card animation overhaul -- onLayout-based dual animation. Container height JS thread, content opacity/translateY native thread. Easing.out cubic open, Easing.in cubic close.
  [x] Editable journal entry titles -- all categories including Fitness. Title field editable on edit.
  Editable workout note name -- workout-tab-sourced journal entries default to "Workout Note." Should be editable before or after save. (SOON)
KAV/keyboard behavior in Add Exercise modal and CustomFoodCreator -- keyboard covers buttons in both. Same root issue, parked for dedicated session. (SOON)

Food and search polish

Bugs -- fix first:
Recents math bug -- fsId not passed through from recent entries, caused per-100g scaling instead of correct serving data. FIXED.
[x] Recents math bug -- fsId now stored and passed through loadRecent in add-food.tsx, food-detail uses correct serving data instead of per-100g scaling. DONE.
Macros not persisting to recents/favorites -- DONE. loadRecent now carries full macro payload, showMyFoods and My Foods FlatList tab map all nutrients, favorites tab already correct.
[x] Favorites name-collision bug -- identical food names sharing favorite state. FIXED. toggleFavorite now matches by fsId when available, falls back to name. Star icon check updated to same logic. add-food.tsx.
Food search calorie discrepancy -- search list shows different calories than food detail screen. Root cause: serving selection mismatch. FatSecret search response returns multiple servings; list displays index 0, detail may land on a different serving. Fix: use is_default:1 serving for list display, ensure detail pre-selects same serving. Needs add-food.tsx + food-detail.tsx. DONE. isDefault flag stored in fetchFatSecretServings; food detail pre-selects is_default:1 serving to match FatSecret search display. add-food.tsx + food-detail.tsx updated.
[x] REGRESSION -- Calorie discrepancy fixed (2026-05-20). Root cause: FatSecret foods.search and food.get.v4 use different serving definitions for some foods -- no is_default or cal-matching can bridge that gap. Fix: virtual serving constructed from search result macros (calories/protein/carbs/fat) when no food.get.v4 serving matches the search result calories. Detail screen now always matches the list. fsServingGrams extracted from food_description parenthetical for accurate gram scaling. add-food.tsx + food-detail.tsx.
Recents dedup bug -- same food logged with different gram amounts creates duplicate recent entries. DONE. Dedupes by fsId first, falls back to name-without-amount suffix. Most recent log wins.
Recents label serving bug -- recents showed logged cal total (e.g. 900 for 3 servings) instead of the base serving (300). DONE. Diary entries now store labelCal/labelProtein/labelCarbs/labelFat from defaultFsServing at save time. loadRecent uses labelCal with calPer100g/cal as fallback for old entries.
fsId saved on star from search results list in add-food.tsx -- favorites now open to label serving. DONE.
Favorites fsId fix -- label serving saved on favorite, fetched on tap from favorites tab, on-demand fetch in food-detail when fsServings empty, non-100g sort fix. DONE.
fsId saved on diary entries in saveEntry, passed through edit entry path in log.tsx. DONE.
Food Library title bug -- shows "Add to Morning" when navigating from library button. DONE.
Edit entry scaling bug -- opening entry from log showed macros scaled to 100g instead of logged amount. DONE. amountChanged flag added to food-detail, useExisting gates on isEditing + unchanged amount.
Edit entry 100g bug on amount change -- changing grams on edit entry fell through to per-100g fallback (wrong). DONE. editRates path derives per-gram rate from existingCal/existingAmount, used when isEditing + user changes gram amount.
Recent tap 100g bug -- tapping recent food opened to 100g instead of logged amount. DONE. openFoodDetail extracts amount from description for isRecent items.
Recipe builder 100g bug -- adding ingredient via food search in recipe mode fell through to 100g defaults. DONE. isRecipeMode path in openFoodDetail now calls fetchFatSecretServings and attaches fsServings before routing, same fix as the normal log path.
Favorites serving size bug -- favorites opened to label serving. DONE.
Favorites extended nutrition 0 -- DONE. toggleFav pulls from selectedServing when available, saves full flat macro shape.
FatSecret badge showing mid-type with no results -- DONE. Badge hidden when query has no results.

Search results CPP pass -- DONE. Card-style rows, brand name separated, macro strip, per-theme shadows, accent left border, SET card green border, fixed cal alignment, header accent colored, scan banner plain text, barcode cooldown removed, Save New Food gated to library only.
Macros on search result rows -- DONE. Protein/carbs/fat strip under food name, macro colors match app system.
food.get on search result tap -- DONE. Fetches real servings on text search tap via fetchFatSecretServings helper. Extended nutrition (fiber/sodium/etc) only available after food.get.v4 call -- not available on search list rows by design (20 simultaneous API calls per search not viable). Extended nutrition always present on food detail screen after tap.
Serving size picker on food detail -- DONE. Serving picker modal, grams defaults to real serving grams, per-gram rates locked for accurate manual gram scaling. Picker hidden when fsServings.length <= 1 (no choice to show).
Servings stepper on food detail -- DONE. Tap +/- to multiply serving macros by count. Resets to 1 when user overrides gram field. useServingBased path uses selectedServing.calories * servingCount for new entries, bypasses calPer100g fallback entirely. Edit mode fix: on-demand fsServings fetch when not pre-loaded; servingCountTouched flag breaks useExisting so macros update live on stepper tap.
SET banner tip -- plain icon + text in place but still needs CPP polish pass.
[x] Set Foods tab -- DONE. 5th tab in add-food.tsx food library (Recent / My Foods / Favorites / Recipes / Set Foods). Shows all pj_barcode_overrides entries, each row has UNSET red pill button. Tapping UNSET removes pin from storage + toast. Tapping row opens food detail to log. Tab font 13→11px for 5-tab fit. Empty state: pin icon + "No pinned foods." UNSET on food detail near star still open -- requires barcode context in route params.
[x] UNSET icon fix -- green checkmark on result row now clears after UNSET tapped from Set Foods tab. unsetOverride captures item ref before delete, calls setResults to flip isOverride: false. add-food.tsx.
[x] My Foods in barcode scan results -- myFoodRows injected into all setResults calls in handleBarcodeScan (both override path and FatSecret path, initial + delayed). SET button now available for custom foods during active scan session. add-food.tsx.
[x] Barcode scan My Foods flood fix -- removed myFoodRows auto-injection from all scan setResults calls. Collapsible "USE A SAVED FOOD (N)" section added to ListFooterComponent, appears only when lastScannedBarcode is active, each My Food row has SET button. Typed search still surfaces My Foods inline. add-food.tsx.
[x] Barcode not-found SET fix -- lastScannedBarcode was cleared on no-result path, killing SET button before user could search manually. Fixed: keep barcode alive so scan banner + SET buttons persist after "Product Not Found" alert. User can now search any food and tap SET to link it. Alert copy updated. add-food.tsx.
[x] Save as Copy My Foods refresh fix -- My Foods list was stale after returning from food-detail Save as Copy flow. Added loadMyFoods() to useFocusEffect so list reloads on every focus return. add-food.tsx.
[x] UNSET confirm alert -- UNSET button on Set Foods tab now shows destructive confirm Alert before removing barcode link. "Remove Barcode Link?" with food name, Cancel + Remove (destructive). add-food.tsx.
[x] Barcode override stale snapshot -- pj_barcode_overrides was storing full food snapshots. Editing a custom food after SET showed stale data on next scan. Fixed: My Food overrides now store only a reference { isMyFood, myFoodName, myFoodId }. resolveMyFoodOverride() looks up live data from myFoods at scan time, ID-first then name fallback, graceful fallback if food deleted. Old-format overrides auto-migrate. add-food.tsx.
[x] Barcode My Foods SET row not tappable -- fixed. SET now calls openFoodDetail immediately after saveOverride, navigating to food detail in one tap. add-food.tsx.
[x] Barcode Create & Set -- SHIPPED. "Create Food for this Barcode" prominent button in footer on no-match path. "None match? Create & Set food" secondary link in scan banner when results exist. CustomFoodCreator opens with "CREATE & SET FOOD" title. onSaved auto-pins via pinFoodToBarcode + navigates to food detail. myFoodData passthrough added to openFoodDetail so custom serving/macros load correctly before myFoods state updates. add-food.tsx.
[x] Barcode food detail 100g default fix -- on-demand fsServings fetch now also calls setAmount(def.grams) when def.grams > 0 && !isEditing, so amount field shows real serving size immediately after async load instead of defaulting to 100g. food-detail.tsx.
[x] Extended nutrition scaling fix (barcode items) -- restructured extended nutrition render to prefer effectiveServing[servingKey] * servingCount when food.fsId && effectiveServing loaded, instead of foodNutrients * multiplier. foodNutrients for barcode items are per-serving not per-100g so multiplier path was wrong. Servings rates path also wired for manual gram input. food-detail.tsx.
[x] Recipe builder My Foods 0 macros bug -- addCustomFood only saved { name, cal } to pj_my_foods, dropping protein/carbs/fat. Fixed to include all macros. Added missing saveToFirebase call. recipe-builder.tsx.
[x] Recipe builder dead code removal -- USDA searchFood, OFF handleBarcodeScan, CameraView overlay, and related states (searchQuery, searchResults, scanning, showAddIngredientModal, selectedFood, ingredientAmount, ingredientUnit) removed. Add Ingredient modal and Camera JSX removed. Dead styles removed. FatSecret is now the only search path via add-food route. recipe-builder.tsx.
[x] Recipe builder custom food button -- green "+" wired to shared CustomFoodCreator component (replaces dirty inline modal). onSaved auto-adds food as ingredient at its configured serving size. Food always saves to My Foods library. Dead inline state/modal/styles removed. recipe-builder.tsx.
[x] Serving unit system -- Cronometer-style overhaul. DONE (2026-05-20).
  Amount field label now reflects actual FatSecret metric_serving_unit (ml, fl oz, oz, container, etc.) instead of hardcoded "(g)". unit field added to fetchFatSecretServings in both add-food.tsx and food-detail.tsx. syntheticServing carries unit from food.servingUnitType for custom foods.
  CustomFoodCreator: horizontal unit picker pill row (g, ml, fl oz, oz, container, serving, tbsp, tsp, cup). Serving g label updates dynamically. servingUnitType stored on saved food. Card height bumped to 600.
  Edit food modal: serving amount + label fields + unit picker added. saveEditFood now persists edited serving size, unit, and label instead of ignoring them.
  openFoodDetail: servingUnitType and existingAmount now passed from myFoodMatch for custom My Foods so food-detail shows the correct unit on fresh logging.
  Save as Copy: passes servingUnitType from selected FatSecret serving so cloned foods preserve their unit.
[x] Servings stepper -- text input upgrade. DONE (2026-05-20). Replaced fixed Text display with TextInput (decimal-pad). User can type 1.5, 2.5, etc. directly. - button decrements in 0.5 steps, min 0.5. + button always jumps to next whole number. food-detail.tsx.
Rename food on entry -- editable name field on food detail before logging, custom name stored with entry.
Save New Food to Library -- full macro fields in proper modal, not just name + calories. SUPERSEDED by Custom Food Creator below.
Custom Food Creator -- DONE. components/CustomFoodCreator.tsx, centered modal with scale-in animation, required name + calories with * markers, optional brand/macros/extended nutrition in collapsible section, serving size + serving label, saves to pj_my_foods with custom_XXXXX ID. Entry point: + Food button in log.tsx header. + Recipe also moved to log.tsx header. Custom foods open to correct serving with absolute macros (useExisting extended to isCustom flag). Extended nutrition saves as foodNutrients array. Brand shows under food name in food detail. Photo upload, vitamins/minerals deferred to SOON.
Save as Copy -- "..." menu on food detail header (next to star). Opens Custom Food Creator prefilled with all FatSecret data -- name, brand, every macro, serving. User can edit anything before saving. Solves FatSecret name/data cleanup without touching shared database.
loggedAmount / loggedUnit -- now stored as separate fields on each entry alongside the name string. Enables accurate edit entry serving restoration.
Loading spinner -- DONE. Instant on keypress, ActivityIndicator + Searching... text.
Clear Food History dev tool -- DONE. Wipes entries only, water/steps/sleep/weight untouched.
Recent description strips amount suffix -- DONE. Star matching now works correctly across all paths.
My Foods calPer100g passthrough bug -- openFoodDetail in add-food.tsx wasn't passing calPer100g/proteinPer100g/carbsPer100g/fatPer100g from myFoodMatch for custom foods. Caused wrong calories when gram amount changed on food detail. FIXED.
My Foods serving stepper missing -- stepper only rendered when selectedServing existed (FatSecret foods only). Custom foods have no fsServings so stepper never showed. FIXED. syntheticServing IIFE + effectiveServing = selectedServing ?? syntheticServing pattern. Stepper now shows for all foods.
Edit food modal -- food-detail.tsx header Edit button routed to old edit-food.tsx full-screen push. Replaced with centered scale-pop modal matching app aesthetic. add-food.tsx library Edit button also upgraded to same modal. edit-food.tsx still exists but is no longer the primary edit path.
[x] Edit food modal CPP pass -- 3 labeled sections (Basic Info / Macronutrients / Extended Nutrition), 3-column macro row with identity color dots, 2-column pairs for extended nutrition, correct unit casing (g/mg lowercase). Both add-food.tsx and food-detail.tsx.
[x] Edit food modal -- Brand field added (Basic Info, full-width, between Food Name and Calories). Saturated Fat fixed to half-width via flex:1 spacer sibling. MyFood interface updated. Both add-food.tsx and food-detail.tsx.
Edit entry stepper base serving bug -- stepper on edit entry used logged gram amount as "1 serving" instead of the food's actual serving size. FIXED. resolvedServingGrams state + async My Foods lookup + ratio-based syntheticServing. log.tsx now passes servingGrams from diary entry.
Extended nutrition scaling bug (custom foods, food-detail) -- foodNutrients for custom foods stores per-serving values but multiplier = grams/100 assumed per-100g. FIXED. !food?.fsId gate uses servingCount (stepper path) or grams/effectiveServing.grams (manual gram path) as scale factor.
Daily nutrient totals bug (log.tsx) -- getAdvancedNutrient used same per-100g assumption for custom food foodNutrients. FIXED. fsId gate: FatSecret entries use cal/calPer100g scale, custom entries use cal/(calPer100g*servingGrams/100) = servingCount scale.
Barcode-to-My-Food assignment -- link barcode permanently to manually built food.
Meal slots fully customizable -- rename, reorder, add custom slots. (HIGH)
FatSecret attribution -- "Powered by FatSecret" lockup required by API terms. Display on food search results screen and food detail screen. Pull exact logo/sizing requirements from FatSecret brand guidelines before building. Non-negotiable for App Store. DONE -- badge on both screens, opacity 0.65, tappable to fatsecret.com. App Store description phrase required at submission time.

Food detail polish pass:
- Depth/shadow pass, general CPP treatment
- Title "FOOD DETAIL" to accent color -- DONE (covers Edit Entry header too)
- Back chevron to accent color -- DONE. backBtnText uses accentBlue.
- Serving amount + unit row redesign -- quantity and serving unit visually linked on one row
- Amount field color consistency fix
- Section label "NUTRITION FOR XG" to card label style -- DONE. 11px uppercase, letterSpacing 2, textMuted.
- Macro values lowercase g (6g not 6G) -- DONE.
- Star/favorite -- spring animation on tap, haptic, toast on food-detail. Haptic + toast + confirm Alert on FlatList star rows in add-food. DONE.
- Empty states on all 5 library tabs (Recent / My Foods / Favorites / Recipes / Set Foods) -- icon, title, subtitle per tab. DONE.
- Search no-results empty state -- DONE. Search icon, "No results for X", subtitle.
- Favorites fsId save + fetch real label serving on tap -- DONE via food-detail path. add-food list path still open (see bug above).
- "..." menu on food detail → Save as Copy -- DONE. Ellipsis icon in header for FatSecret foods. Opens Custom Food Creator prefilled. Rename via Save as Copy since FatSecret foods are read-only.
- Search results brand contrast/separation improvement

Food log screen polish pass:
- X delete button on entry rows to muted red
- Macro donut center calorie number -- DONE. Removed from log.tsx (uses MacroStackedBar). Restored to food-detail.tsx donut center -- calories + KCAL label in absolute-positioned View over SVG.
- Macro donut sequential segment animation -- DONE. Timing fixed to truly sequential: protein ends at ~1000ms, 150ms pause, carbs starts at 1150ms, 150ms pause, fat starts at 2000ms. Both log.tsx and food-detail.tsx updated.
- MacroDonut replaced with MacroStackedBar in log.tsx Today's Total -- DONE. Three horizontal animated bars (protein/carbs/fat), proportional widths, gram counts + P/C/F labels to the right. Sequential animation matches donut timing. Redundant bottom P/C/F row removed.
- Macro donut animation on food detail -- DONE. Animated version matching log.tsx MacroDonut.
- Collapsed meal row polish -- DONE. Macro dots left (protein/carbs/fat colored dots + grams). Kcal number right side (Bebas 18px, textPrimary, stacked over muted kcal label). Consistent collapsed height via opacity:0 placeholder when empty.
- Collapsed meal row item count -- show "X items · XXX kcal" on collapsed state
- Food name / brand split on entry rows -- DONE. Brand removed from log entries by design. Amount inline after food name. Entry height fixed at 54px per entry, no clipping.
- Meal header total more visually prominent than individual entry calories
- Empty state big "0" to textMuted until food logged
- Advanced Nutrition split into own card -- DONE. Removed horizontal scroll from Today's Total. Advanced Nutrition is now a separate collapsible card below it, collapsed by default. CPP treatment: accent top border, card depth, per-nutrient colored bars (indigo/pink/purple/teal/orange), FDA recommended daily values as reference with "/ Xg recommended" sublabel, TooltipIcon wired with full definitions for all 5 nutrients. tooltipRegistry.ts updated.
- Log page gap spacing -- DONE. All inter-card gaps unified at 12px (mealRow marginBottom 8→12). Today's Total, inter-meal, and Snacks→Water gaps now all consistent.
- Log header date navigation -- DONE. Swapped unicode ‹ › characters for Ionicons chevron-back/forward. Reordered to date-first, chevrons-right so date aligns flush left under Food Log title. Color behavior unchanged (accent when clickable, textDim when disabled).
- Food entry row visual separation -- DONE. accentBlueBg (rgba accent 0.15 opacity) background on each expanded entry row. borderRadius 8, paddingHorizontal 10, marginBottom 4. Replaces hairline-only dividers.
- Update Entry dim state -- DONE. Button disabled + opacity 0.4 until hasChanges is true in edit mode. Changes tracked via meal picker, time picker, serving picker, and gram field interactions.
- Entry row padding/breathing room
- Favorites fade-on-remove animation -- item should fade out before disappearing when removed from favorites FlatList. DONE.
- Bottom safe area padding on library screen
- Tab bar (Recent/My Foods/Favorites/Recipes) polish pass -- selected state weight, container depth
- Sources of recommendations -- wire as (i) tooltip on calorie target result screen
- [x] Log tab macro bars goal-based fill -- confirmed working on device this session.

Active calorie accuracy:
- Calorie discrepancy bug -- root cause was calorie TARGET mismatch between home (using live recommended) and log (using stale saved value). Fixed via useRecommendedCal toggle in profile -- toggle ON keeps calTarget live and in sync, toggle OFF lets user set custom static value. FIXED.
- [x] Sleep duration display clarified -- duration IS correct (sums Core+Deep+REM only, excludes Awake segments). Root issue was no communication that awake periods are excluded. FIXED. useHealthKit.ts now tracks sleepAwakeMs (value 2 samples). Sleep card shows "Xm awake during night" under bed→wake time when HealthKit data present and awake time > 0.
- Active calorie overestimate disclaimer -- small disclaimer on any screen showing active or net calories. Apple Watch and most wearables overestimate active burn. "Active calorie estimates from Apple Health may vary. Use as a guide, not a guarantee." Exact wording TBD.
- [x] Burn accuracy adjustment setting -- SHIPPED. Settings > Health section (renamed from Health Data). 4 pills: 100/90/80/70%. Live example line when < 100% (e.g. "Apple reports 400 → you use 320"). (i) tooltip with burn_accuracy entry + worked example. burnAccuracyPct persisted to pj_settings (default 100). Modifier applied in: index.tsx (hkCalories, yesterday net, yesterday active cals display, active cal goal trigger), log.tsx (adjustedTarget + burned display text), head-to-head.tsx (loadSnapshot net + activeCals), day-detail.tsx (historical caloriesBurned). Raw HealthKit value always stored in pj_YYYY-MM-DD -- modifier applied at calculation time only. Existing users unaffected (default 100%). calories_today tooltip Active definition updated to mention Settings → Health. Running BMR definition added to calories_today tooltip.
- [x] Active cal goal trigger timing bug -- pre-existing bug fixed. prevActiveCalRef.current was being updated even when loaded=false, causing the crossing check to fail when HealthKit delivered data before AsyncStorage loaded. Fixed by gating both prevActiveCalRef and prevExerciseMinsRef updates inside the if (loaded) block. Same fix applied to exerciseMins trigger. index.tsx.

Bugs and polish -- fix these first

Birthday scroll confirm button -- fixed. Larger tap targets on Cancel/Confirm, overlay bottom tightened to stop intercept. DONE.
Edit exercise input validation -- DONE. Cardio fields use filterDecimal (one decimal max). Sets/reps/rest fixed to number-pad with integer-only validation.
FatSecret logo hit bar -- fixed. alignSelf: 'center' on TouchableOpacity in add-food.tsx and food-detail.tsx. DONE.
"G" to "g" -- grams label showing as uppercase G throughout app. Audit all screens and fix to lowercase g everywhere. DONE (food-detail confirmed, sweep remainder).
Extended nutrition never shows for FatSecret foods -- food-detail reads food.foodNutrients (USDA format) but FatSecret stores fiber/sugar/sodium/cholesterol/saturatedFat on selectedServing directly. Fix: fall back to selectedServing / servingRates when foodNutrients doesn't have the nutrient. Recents also need on-demand fsId fetch (same as isEditing path) since diary entries don't store fsServings.
Stepper buttons CPP pass -- - and + buttons are plain bgInput rectangles. Apply interactive blue treatment (accentBlueBg fill + accentBlueBorder) and accent-colored symbols. food-detail.tsx.
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


Faith and support

Donate / Support button -- pinned for post-TestFlight. No paywall ever. If/when built: one-time StoreKit tip jar or external Ko-fi link. Entry points TBD. Not urgent.

NOW -- next sessions

[x] My Programs builder -- SHIPPED + polished. pj_my_programs key stores unified CustomProgram array (seeded with presets on first load). ProgramBuilderModal slide-up sheet: name + description + 7 DayRow rows (LIFT/CARDIO/REST/OFF type pills + focus field + workout tag pills including inline + Tag creator). Programs tab is a single DraggableFlatList: drag to reorder, pencil (edit), trash (delete with confirm Alert), LOAD PROGRAM / ACTIVE button. FAB "Create Program" active. Edit flow re-uses same modal pre-populated. Active program sync on edit. Live tag color lookup in program card day pills (libTags state, loads from pj_settings on focus). workout-library.tsx.
[x] Programs tab scroll bounce -- fixed. DraggableFlatList style={{ flex:1 }} added. workout-library.tsx.
[x] Create Program sheet animation -- fixed. Spring config overshootClamping:true + damping:26 stiffness:180, both open and close calls. workout-library.tsx ProgramBuilderModal.
[x] Program day builder tag pills -- DayRow replaced. Now shows user's workout tags (Push/Pull/Legs/etc.) as selectable pills. Tapping tag auto-fills color + focus. + Tag button opens inline tag creator overlay (name + color swatch picker). New tags saved to pj_settings.workoutTags and auto-selected in triggering day. workout-library.tsx.
[x] Program builder DayRow simplified -- LIFT/CARDIO type buttons removed. Now ACTIVE/REST/OFF only. Type auto-derives from tags: any non-cardio workout tag = lift, tag_cardio only = cardio. ACTIVE button color updates live (blue=lift, amber=cardio). Rest text auto-clears when switching from REST to ACTIVE. pj_my_programs recovery added: catch block re-seeds from PRESET_PROGRAMS instead of silently failing. Programs tab layout fixed: DraggableFlatList wrapped in View flex:1 (direct style={{ flex:1 }} on DraggableFlatList collapsed it to 0 height, hiding both cards and empty state). workout-library.tsx.
[x] Manage tags scroll indicator -- showsVerticalScrollIndicator={false} on DraggableFlatList. No more scroll bar cutting through tag pills. workout.tsx.
[x] Manage tags keyboard dismiss -- TouchableWithoutFeedback wraps sheet content. Tapping any empty space inside sheet dismisses keyboard without closing modal. workout.tsx.
[x] Edit food modal keyboard white box -- KAV was wrapping the dim overlay, causing a white gap below the card when keyboard appeared. Fixed: overlay is now position:absolute (always full-screen), KAV only manages card position. add-food.tsx.
[x] My Foods library brand not showing -- brand field not included in any of the three My Foods map calls (showMyFoods, searchFood, FlatList tab). Fixed: brand: f.brand || null added to all three. Render updated to prefer item.brand over description split. add-food.tsx.
[x] Edit food modal scroll-dismisses-keyboard -- keyboardDismissMode="on-drag" was closing keyboard on scroll. Removed. ScrollView now scrolls content while keeping keyboard open. add-food.tsx.
[x] Bible reading plans -- SHIPPED + expanded. data/readingPlans.ts: ReadingPlan types, 9 built-in plans (Gospels 28d / Psalms & Proverbs 30d / NT 90d / Epistles 21d / Genesis 25d / John 21d / Acts 28d / Proverbs 31d / Bible in a Year ~396d), helpers (formatDayReading, getTodayReading, getPlanCompletion, buildDays generator). Storage: pj_reading_plans keyed by planId { startDate, completedDays[], enrolledAt }. Max 3 simultaneous active plans. bible.tsx: TODAY'S READING strip below chapter picker -- per-plan row, passage tap navigates to that book/chapter, Mark Read / Undo toggle (green Read button tappable to unmark, light haptic + toast), complete state; plan browser modal from settings gear (enroll/drop with confirm Alert, progress bar, active count). Home card: ReadingPlansCard in CARD_REGISTRY, faith-gated Rooted/Exploring, empty state with Browse Plans, per-plan passage + progress bar + full-width MARK AS READ button (unread state) or compact read confirmation (read state, no undo on home card). Tapping plan row navigates to that plan's specific book/chapter. Mark Read: haptic success + toast. Missed days: no penalty, calendar-based catch-up always accessible.
HR Zone Training -- dedicated session. 5-zone system (Zone 1 recovery through Zone 5 max effort) based on max HR (220-age default; user can set custom max HR in profile; optional resting HR for Karvonen formula). HealthKit already reads per-workout avg/peak HR and resting HR. Features: Stats page time-in-zone breakdown (stacked bar per workout session), zone target field on cardio exercises in routines, zone badge on workout tab after session. Profile: max HR field + optional resting HR. Mode-aware: Discipline shows all zone data with target ranges, Mindful neutral framing. Design questions before building: where does zone data live in stats (workout sub-section vs own card?), does today's training card surface zone info?

TESTFLIGHT AUDIT -- 2026-05-22
Live release build testing. Log all bugs here in real-time. Status: open / fixed.

[x] Log tab crash (CRITICAL) -- editing a past-date food entry passed date: todayKey instead of activeDate to food-detail. Saved entry to wrong date key, created sparse null entries in today's storage, crashed render on entry.name access. Fixed: date bug corrected in log.tsx, null filter + auto-cleanup on load in both log.tsx (initial useEffect + useFocusEffect) and index.tsx. FIXED 2026-05-22.
[x] Home 0/calTarget display bug -- same null entries in today's storage caused entries.reduce to throw before calTarget loaded from profile. calTarget stayed 0, adjustedTarget = 0 + activeCalories only. Fixed by null filter + storage cleanup in index.tsx loadCals (home tab loads first, cleans storage before any other screen reads it). FIXED 2026-05-22.
[x] Day detail crash -- same root cause as log tab crash. Fixed as side effect of index.tsx storage cleanup -- home tab sanitizes data on focus, day-detail reads clean storage. FIXED 2026-05-22.
[x] Add food button passing todayKey instead of activeDate -- same date bug as the edit path. Tapping + on a past-date log view navigated to add-food with date: todayKey, saving new entries to today instead of the viewed date. Fixed: date: activeDate in log.tsx line 693. FIXED 2026-05-22.
[ ] Onboarding height not saving to profile -- height entered during onboarding does not appear in Basic Info on profile tab after setup completes. BMR/TDEE/calorie target all depend on height so this causes incorrect calorie targets for new users. Needs investigation.
[x] Home ScrollView dead zone -- could not reproduce on release build 2026-05-22. Likely resolved as side effect of layout/padding change. Closing.
[ ] Log tab date does not reset on tab return -- if user navigates to a past date on the log tab, leaves the tab, and comes back, the past date stays active instead of snapping back to today. Should reset activeDate to today on every useFocusEffect. log.tsx.
[ ] Bible auto-scroll pause on touch -- finger held on screen should pause scrolling, lift should resume
[ ] Bible auto-scroll choppiness -- random lag on release build, needs investigation
[ ] App-wide haptics audit -- FABs, header icon buttons, and all missing touch feedback (Light: icons/selections, Medium: FABs/saves, Heavy: destructive)
[ ] Water custom amount modal -- tapping inside modal (non-input area) should dismiss keyboard, currently only closes on full modal dismiss
[ ] Water gear settings presets -- tapping outside TextInput fields should dismiss keyboard
[ ] Water gear modal header -- "WATER LOG" label should be accent color matching modal header convention; replace X button with handle pill + accent top border to match all other modals app-wide
[ ] Water gear save presets button -- starts active when it should be dim until a change is made; on save should dismiss keyboard + fire toast but keep modal open (currently only fires toast, keyboard stays)
[ ] Weight card -- no toast on save, violates toast-on-save build standard
[ ] Sleep card -- "Edit" button top-right should be gear icon to match Water/Training card convention
[ ] IF card State 2 -- "Reset window" button label is confusing (implies restart/clear). Rename to "Edit Start" to match State 3 convention and clarify it opens the start time picker
[ ] Today's Training card -- add exercise minutes from HealthKit (pj_YYYY-MM-DD exerciseMinutes field already persisted), card feels empty without it
[ ] Apple Health synced workouts not auto-checking on workout tab -- was marked fixed in DONE but confirmed still broken on release build 2026-05-22. Syncs in but exercises remain unchecked. Needs re-investigation.
[ ] Onboarding birthday scroller KAV -- scroller opens half off screen when triggered near bottom of page, no auto-scroll to bring it into view
[ ] Onboarding default weight values -- current weight defaults to 177, goal weight to 165. Should be empty with placeholder text only so new users don't see someone else's numbers
[x] Default home card order -- DEFAULT_ORDER hardcoded as explicit array: verse → calories → macros → water → weight → workout → steps → sleep → gratitude_streak → reading_plans → fitness_metrics → daily_note → if → vs_yesterday. IF moved from position 2 to near bottom (opt-in feature). Existing users with custom order unaffected. FIXED 2026-05-22.
[ ] Home card order audit -- verify correct default card set and order across all 9 combos (3 coaching modes x 3 faith journey tiers). Rooted/notrightnow should differ on gratitude_streak and reading_plans visibility. Mindful mode should not show IF prominently. Fresh install test required on each combination.
[ ] Default water presets showing 12/16/22 on fresh install -- roadmap says this was changed to 8/12/16 but not reflected on iPad fresh install. Code needs audit.
[ ] Reading Plans home card -- "Browse Plans" button navigates to Bible screen instead of opening the plan browser modal. Should open the plans settings/browser directly.
[x] Fresh install restore bug -- FIXED 2026-05-22. Replaced hasPjData check with local-only gate key (pj_fresh_restore_done, excluded from shouldSync so it never reaches Firestore). restoreIfFresh() now always runs on first cold launch after a fresh install or reinstall, regardless of how many onboarding/config keys exist locally. Gate is set after restore completes (or Firestore confirmed empty). Wiped by account deletion and Force Restore, triggering a fresh restore attempt on next launch. services/syncService.ts.
[ ] Edit entry page missing date -- time picker shows logged time but no date. When editing a past-date entry the date is ambiguous. Should show "May 21 · 8:32 AM" or equivalent so user knows which day they're editing. food-detail.tsx.
[ ] Day detail header calendar icon too close to right arrow -- calendar icon and the right-arrow date nav button are too tight together, easy to mis-tap. Needs more gap or padding between them. day-detail.tsx.
[ ] You vs Yesterday card invisible when data insufficient -- renderVsYesterdayCard() returns null when fewer than 2 metrics have both today + yesterday values, causing the card to disappear entirely from the home screen. Fix: replace null return with an empty state ("Keep tracking to unlock your comparison" or similar) so the card always renders. Root cause in this session: yesterday's Firestore data (restored via Force Restore from dev build) likely missing steps/calories/sleep data needed to qualify 2 metrics. index.tsx line 2643.
[x] My Foods and Set Foods lost in Force Restore -- pj_my_foods and pj_barcode_overrides were not in Firestore at restore time. Root cause: those foods were created before the sync system shipped (old AsyncStorage.setItem, no Firestore mirror). Current code confirmed correct -- all pj_my_foods and pj_barcode_overrides writes use storageSet() and will sync going forward. Data unrecoverable but no code fix needed. Historical loss only.
[x] Achievements screen audit -- PASSED 2026-05-22. Grid layout / locked states / unlocked glow / tier colors / platinum animation / Daily Goals section / progress bars all confirmed correct. Two issues logged below.
[ ] Day One achievement never triggers -- general_first_log is defined in achievementData.ts but handleAchievementUnlock('general_first_log') is never called anywhere in the codebase. Always locked regardless of activity. Needs trigger wired -- most natural place is first food entry save in log.tsx, or onboarding completion. Confirm intended trigger before implementing.
[ ] Achievements audit -- dedicated session needed. Wording and language pass on all 20 achievements, add more/better ones, ensure tiers feel earned and meaningful. Low urgency but needed before public launch.
[x] Workout tab audit -- PASSED 2026-05-22. Day scroller / add exercise / progress count / info modal / load routine / workout notes / journal sync / FAB / effort score / rest day / drag reorder / tag creator -- all confirmed working on release build.
[x] Profile tab audit -- PASSED 2026-05-22. Changes save smoothly, estimates update correctly, water presets good, floating save bar and toasts work. One bug found and fixed: height field validation.
[x] Celebration particles not showing -- root cause: particles were created in useEffect (after render) but stored in a ref (no re-render triggered), so render always saw empty array. Fixed: moved particle creation into useMemo so they exist synchronously before first render. useEffect now just resets values and starts animations. CelebrationOverlay.tsx. FIXED 2026-05-22.
[x] Step goal trigger race condition -- prevStepsRef.current was updated even when loaded=false (same bug previously fixed for activeCals and exerciseMins but missed for steps). HealthKit delivered steps before AsyncStorage loaded, ref got set to real value, crossing check failed when loaded became true. Fixed: steps trigger and prevStepsRef update now both gated inside if (loaded) block. index.tsx. FIXED 2026-05-22.
[x] Height field validation -- feet clamped 1-8, inches clamped 0-11, non-numeric input stripped, maxLength enforced. Was possible to enter 522ft 29in. profile.tsx. FIXED 2026-05-22.
[ ] Stats tab audit -- PASSED 2026-05-22 with two bugs found (see below). At a Glance / Trends / graph creator / period switcher / Records / Streaks / Calendar / Effort vs Results -- all confirmed working on release build.
[ ] Stats graph callout numbers shortened -- net calories callout shows "2.1k kcal" instead of "2,100 kcal". All graph callout values must show full number with commas, no k/M shortening. Same standard already applied to steps. Affects all chart types. diagnostic-report.tsx / StatsGraphCard.tsx.
[ ] Effort vs Results (i) icon misplaced -- TooltipIcon is anchored in the fixed nav header (top right) but the page title is in scroll content below. Disconnected visually. Move (i) inline with the "EFFORT VS RESULTS" title row in scroll content, matching card header convention throughout app. diagnostic-report.tsx.
[ ] External TestFlight review not yet submitted -- build 7 shows "Ready to Submit" in App Store Connect but no external testing group has been assigned. Need to create external testing group, add testers, and submit build 7 for Apple external review before friends/family can install.

SOON -- confirmed next few sessions

Running Plans -- dedicated planning session before building. Structured multi-week training plans for common race distances (5K, 10K, half marathon, full marathon). User inputs current mile/5K/10K PR times + fitness level → app generates personalized day-by-day plan. PR tracking section for all race distances. Daily workout prescriptions integrate with workout tab (just like loading a routine). Diet tips per training phase (carb loading, recovery nutrition, race week). Garmin-inspired intelligent plan generation. Depends on HR Zone Training shipping first (zone targets are core to plan prescriptions). Dedicated running section separate from general workout tab -- may warrant its own tab or sub-screen.
Workout library sort + filter -- dedicated session. Filter button opens bottom sheet: tag chips (Push/Pull/Legs/Core/Cardio), type (Lift/Cardio), muscle group (when field exists). Sort options: A-Z, Z-A, Favorites First, Recently Used. Both active simultaneously. Filter resets on library exit. High priority -- needed alongside routine builder.
Fill Day / Workout Templates -- dedicated session. "Fill Day" button on empty ACTIVE day rows in program builder + routine builder. Tapping shows 2-3 curated template options for that day type (identified by tag: Push/Pull/Legs/Core/Cardio/Full Body). Each template is hand-curated with exercise science logic: compounds first, isolations second, proper muscle group coverage per day type. WORKOUT_TEMPLATES constant in workoutData.ts keyed by tag id, 2-3 named variations each. Quick picker sheet shows exercise list preview per template, one tap applies. "Replace" variant when day already has exercises. Push: Bench + OHP + Cable Fly + Lateral Raise + Tricep Pushdown. Pull: Lat Pulldown + Seated Row + Face Pull + Hammer Curl + Cable Curl. Legs: Squat + Hamstring Curl + Leg Extension + Glute Kickback + Plank. Core, Cardio, Full Body templates also included. No AI, no new storage -- pure curated data.
NEAT definition -- add NEAT (Non-Exercise Activity Thermogenesis) to tooltipRegistry.ts under Nutrition or Fitness category. No UI changes needed, just a definition entry so it shows in Settings > Help. Context: everyday movement (walking, fidgeting, chores) that isn't structured exercise but contributes significantly to total daily burn. Relevant to understanding why two people with identical workouts can have very different TDEE.
Settings Help section aesthetics -- definitions list in Settings > Help is visually rough. Needs a dedicated CPP pass: spacing, typography, section headers, overall polish to match the quality bar of the rest of the app.
Day detail BMR row -- add estimated BMR to the calorie breakdown in day detail alongside Consumed / Burned / Running Net, so user has the full picture: what their body burns at rest + what they burned + what they ate = complete daily calorie story.
Claude Projects GitHub sync -- CLAUDE.md and project_j_roadmap.md are already tracked in the repo. After pushing, add them via the GitHub integration dialog (search icon in the Add content from GitHub modal). Once wired up, every push auto-updates phone context. Blocked on: push current changes first, then select files in dialog.
[x] Cloud data sync -- SHIPPED. services/syncService.ts: syncKey() fire-and-forget Firestore mirror, restoreIfFresh() fresh-device restore gate (only fires when zero local pj_* data -- cannot overwrite existing data), uploadAllLocal() one-time migration. utils/storage.ts: storageSet() wrapper (local write awaited first, Firestore silent mirror). All AsyncStorage.setItem calls across 22 files replaced with storageSet. Firestore path: users/{uid}/store/{key}. pj_bible_* cache keys excluded (re-fetchable, thousands of docs). _layout.tsx wired to call restoreIfFresh() before routing to tabs on login. Dev tools: Upload All Data to Firestore + Check Sync Status (local count vs Firestore doc count with in-sync indicator). Verified 38/38 keys in sync on device.

Stats Phase 3 remaining steps (do in order):
- [x] SHIPPED Phase 3 Step 6 -- Creator modal. 3-step slide-up sheet: data type grid (7 options, DATA_KEY_META icons) → chart type picker (line/bar; macros forced stackedBar, skips to preview) → live StatsGraphCard preview with real 7d data. ADD TO STATS button appends new card (period: 7, auto-label from DATA_KEY_META) to pj_stats_cards. Step dots fixed at sheet bottom (active dot wider pill). Temp "+" header button wired; Step 7 FAB will be primary entry point.
- [x] SHIPPED Step 7 -- FAB. Expandable speed dial bottom-right. "Add Graph" (full accent fill + glow shadow, stagger-springs in first) calls creator modal. "Add Report" (disabled, coming soon) cascades above it. Backdrop tap closes. FAB icon swaps add/close. Temp "+" header button removed.
- [x] SHIPPED Step 8 -- Card edit modal (gear icon). Centered scale-pop modal (not slide-up). Editable label field, chart type pills (hidden for macros), timeframe pills 7D/30D/90D, Delete Graph (accentRed + Alert confirm), SAVE button dim until changes made, toast on save and delete.
- [x] SHIPPED Line/bar chart switching -- getChart() was ignoring card.chartType entirely, hardcoded per dataKey. Fixed. GenericBarChart component added. startFromZero=false for weight + sleep (Y axis spans data range so small changes are visible). startFromZero=true for steps + activeCals (0 is meaningful floor). Calories line mode uses LineChart with cal data mapped to value shape.
- [x] SHIPPED Option B -- Section reordering. Edit sheet sections list replaced with DraggableFlatList (scrollEnabled=false, active drag handles, long-press to reorder). Stats screen sections now render dynamically from sorted system card order -- first={isFirst} passed to first visible section. sectionVisible helper removed. Sections and graphs remain independent drag groups.
- [x] SHIPPED Stats edit sheet animation -- converted from slide-up to centered scale-fade (same pattern as home edit modal). Accent top border 1.5px, all-corners borderRadius, bgSheet, handle tappable to close.
- [x] SHIPPED Home edit modal -- tabbed MY CARDS / ADD CARDS. MY CARDS: existing DraggableFlatList + Pinned Graphs section below (unpin via - badge). ADD CARDS: Home Cards section (hidden standard cards, tap to add + auto-switch to MY CARDS) and Graphs section (all stats graph cards not yet pinned, tap to pin). Slide-up card library sheet removed. editTab state. allStatsCards loaded from pj_stats_cards on focus. MY CARDS/ADD CARDS tabs restyled as proper segmented control (single container, solid active fill, no individual borders). DraggableFlatList wrapped in flex:1 View for correct scroll behavior. ListFooterComponent changed to immediately-invoked expression to always reflect current state.
- [x] SHIPPED Pinned graph cards on home -- full StatsGraphCard rendered (identical to Stats page -- same chart, same period picker, same gear). Replaced summary card approach. handlePinnedCardPeriodChange saves period to pj_stats_cards and reloads trend data. pinnedTrendData loaded per unique period on focus. Pin sets placement='both', unpin sets placement='stats'.
- [x] SHIPPED StatsGraphCard extracted to components/StatsGraphCard.tsx -- shared between Stats tab and Home tab. Exports: StatsGraphCard, GRAPH_SWATCHES, MACRO_PROTEIN, MACRO_CARBS, MACRO_FAT. stats.tsx imports from shared file. Line chart dots (r=3) at every data point. Label pill at end of line removed. stats.tsx reduced ~900 lines.
- [x] SHIPPED StatsCardEditModal extracted to components/StatsCardEditModal.tsx -- shared Edit Graph modal used by both stats.tsx and index.tsx. Gear icon on pinned home cards opens identical edit modal (label, chart type, timeframe, color picker, delete, save). onSave/onDelete callbacks update pj_stats_cards and reload pinned trend data from home.
- [x] SHIPPED utils/statsData.ts -- extracted fetchTrendData, EMPTY_TREND_DATA, TrendData, offsetToDateKey, getPinnedCardSummary. stats.tsx now imports from shared util. index.tsx uses same util for pinned card trend data.
- [x] SHIPPED HealthKit new metrics -- restingHR, respiratoryRate, bloodOxygen, bodyFatPct, exerciseMinutes added to useHealthKit.ts fetchTodayData and returned. All 5 were already in requestAuthorization (no new build needed).
- [x] SHIPPED Fitness Metrics card expanded to 6 metrics -- VO2 Max, Cardio Recovery, Resting HR, Resp. Rate, Blood O2, Body Fat. 3-column flexWrap layout, 22px Bebas values, micro-disclaimer at bottom. exerciseMinutes on Today's Training card (SOON).
- [x] SHIPPED Fitness Metrics semantic color coding -- ACSM VO2 Max (age+sex stratified 5 brackets), AHA Cardio Recovery (>=20 bpm), Resting HR (<=75 green, <=90 amber, >90 red), Resp. Rate clinical normal (12-20), SpO2 (>=95%), ACE Body Fat (male <=17% green, <=24% amber; female <=24% green, <=31% amber). Mindful = textSecondary no color judgment. profileAge + profileSex loaded from pj_profile for personalization.
- [x] SHIPPED Fitness Metrics color thresholds tightened -- Resting HR was 40-100 green (too lenient); now <=75 green, <=90 amber, >90 red. Body Fat male was <=24% green; now <=17% green (ACE fitness), <=24% amber. Female was <=31% green; now <=24% green, <=31% amber. Sources: AHA, ACE.
- [x] SHIPPED fitness_metrics tooltip updated -- all 6 definitions with threshold sources cited (ACSM, ACE, AHA). Body Fat explicitly notes BIA smart scale required; Apple Health does not calculate this itself; +/-3-5% error caveat added.
- [x] SHIPPED: Expanded graph creator data types -- 19 total DataKeys (was 7). Added water, netCalories, sleepScore, restingHR, respiratoryRate, bloodOxygen, bodyFatPct, exerciseMinutes, fiber, sodium, cholesterol, saturatedFat. Creator Step 1 grid now has 4 category headers (Nutrition / Activity / Body / Sleep & Recovery). calcSleepScoreForTrend + getEntryNutrient helpers in statsData.ts. index.tsx persist useEffect now writes restingHR/respiratoryRate/bloodOxygen/bodyFatPct/exerciseMinutes to pj_YYYY-MM-DD daily. sleepGoal param added to fetchTrendData (default 8). HealthKit metrics sparse for historical dates (accumulate going forward). Multi-select extended nutrients deferred -- single select per card is the current pattern.
- [x] SHIPPED Effort vs Results report screen -- app/diagnostic-report.tsx (NEW). Full analysis screen with 14/30/90-day window picker, generate/regenerate button with dim/lock logic, finding cards (Consistency, Deficit, Burn Accuracy, Macros, Sleep), correlations section (9 pattern types), suggestions, report history with archive + delete. Routes from Stats > Reports collapsible section. 'reports' SystemCardKey added to statsCardRegistry.ts. 'Reports' tooltip category + 2 tooltips (effort_vs_results, diagnostic_correlations) in tooltipRegistry.ts.
- [x] SHIPPED utils/diagnosticReport.ts computation engine -- (NEW). minDaysForWindow thresholds: 14-day→7, 30-day→15, 90-day→30. Insufficient data gate uses window-scaled threshold. All finding types exported. 9 correlation patterns. Suggestion ranking. Single source of truth for thresholds -- imported by screen and engine.
- [x] SHIPPED Effort vs Results bug fixes + polish -- needsRegenerate undefined crash fixed. Pre-check logged day counts on load (all 3 windows in parallel via Promise.all). Context-aware empty state: Not Enough Data Yet (with logged count vs window threshold) when blocked, No Analysis Yet when data sufficient. Trash icon on current report Summary card. Date range styled as uppercase accent pill. Window-scaled thresholds consistent across UI and engine.
- [x] Diagnostic report polish -- G→g fix on all Bebas Neue headlines via ReactNode headline + nested DMSans Text for unit character. New user consistency fix: adjustedConsistencyRate uses effectiveWindowDays (windowDays minus days before first logged day) so a 7/7 user in a 14-day window is not penalized for days before they installed. Removed all suggestions.length < 3 caps so all relevant suggestions generate; store full list, show top 3 with "Show X more / Show less" expand toggle. showAllSuggestions resets to false on each new generate.

Primary button audit -- sweep app-wide, upgrade all primary CTAs to full accent fill, demote transparent bordered style to secondary actions only (Edit, Cancel, filter pills). Applies to every screen.

Food and barcode

Log tab FAB -- DONE. FAB lives on the food library screen (Create Food + Create Recipe expandable speed dial). No FAB needed on main log screen. +Food and +Recipe removed from log header. Library is the only header button. Confirmed closed this session.
Log tab date navigation -- tapping the date label opens a calendar picker for easy multi-day jumping, not just arrow-by-arrow. (SOON)
Log tab meal time labels -- Morning / Lunch / Dinner / Snacks label font to textSecondary (quick fix). (SOON)
Exclude day feature -- current implementation needs a revamp and full passthrough audit. (SOON)
Custom water amount modal -- DONE. bgSheet, Animated.Value fade, tap-outside dismiss, sign bug fixed. Confirmed closed this session.
[x] edit-food.tsx deleted -- screen was orphaned after modal system replaced it. Removed from _layout.tsx registration.
[x] food-detail.tsx edit modal serving fields -- openEditFoodModal and saveEditFoodFromDetail now read/write servingGrams, servingUnitType, servingLabel. Serving section (amount, label, unit picker) added to Edit Food modal UI matching add-food.tsx pattern.
[x] food-detail.tsx meal selector -- replaced animationType="slide" Modal with inline expanding dropdown. Fades + slides down from selector, checkmark on active meal, blue active state. No more shadow-riding-up artifact.
[x] food-detail.tsx serving picker -- animationType="slide" replaced with animationType="none" + manual Animated.Value fade + translateY. Green active state fixed to blue.
[x] food-detail.tsx KAV -- automaticallyAdjustKeyboardInsets + keyboardDismissMode="on-drag" added to main ScrollView.
[x] Recipe builder full CPP redo -- dark card-based design, accent-colored header title, dim Save button until name+ingredients valid, toast on save instead of Alert, unit picker as smooth attached dropdown (fade+slide, no Modal), ingredient rows with macro colors + trash icon, per-serving card uses accentBlueBg, all cards have 1.5px accent top border + shadow. recipe-builder.tsx.
[x] add-food.tsx hardcoded #444444 placeholder fixed to theme.textDim.
[x] Recipe builder + Create button -- changed from green + icon to accent-blue "Create" label + icon, matches Search Food button style. recipe-builder.tsx.
[x] Recipe builder ingredient row alignment -- fixed-width columns for amount (56px), kcal (60px), macro labels (38px each). No more flex-wrap misalignment. recipe-builder.tsx.
[x] Recipe builder unit dropdown click-outside dismiss -- converted inline Animated.View to Modal-based dropdown using measureInWindow for position. Tapping anywhere outside closes it smoothly. recipe-builder.tsx.
[x] Recipe builder extended nutrition in totals -- Ingredient interface extended with fiber/sugar/sodium/cholesterol/saturatedFat. Total Nutrition and Per Serving cards now show extended row when any ingredient has extended data. recipe-builder.tsx.
[x] Multiple serving sizes on custom My Foods -- additionalServings: [{label, grams}] saved on MyFood objects. CustomFoodCreator.tsx: Add Serving UI in create flow. Both Edit Food modals (add-food.tsx and food-detail.tsx): manage additional servings inline. food-detail.tsx: builds customServings array from additionalServings + per-gram rates, shows serving picker when >1 serving, bypasses syntheticServing path.
[x] Recipe 0 kcal / no macros in Recipes tab -- getCalories fell through to 0 when foodNutrients was empty. Fixed: falls back to food.cal. getMacros had no recipe branch. Fixed: isRecipe path reads recipeData.totalProtein/Carbs/Fat divided by servingCount. add-food.tsx.
[x] Recipe builder capital G fix -- Bebas Neue renders lowercase as uppercase. Wrapped "g" unit in nested DMSans Text (macroUnit style, fontSize 14) inside each macroVal. Total Nutrition and Per Serving cards fixed. recipe-builder.tsx.
[x] GoogleService-Info.plist gitignored -- added to .gitignore. Run: git rm --cached GoogleService-Info.plist then commit. Rotate the Google API key in Google Cloud Console (was exposed in commit f6b94736 on public repo). Firebase API keys are lower-risk than typical secrets but rotation is still best practice.
[x] eas-build-pre-install.sh not executable -- script existed and was committed but git on Windows does not preserve the executable bit (100644 not 100755). EAS silently skipped the hook. Fix: git update-index --chmod=+x. FIXED 2026-05-22.
[x] GoogleService-Info.plist EAS build failure (root fix) -- EAS pre-flight scanner reads app.json statically, sees googleServicesFile path not in git, hard fails before any hook runs. Hook approach never worked. Fix: created app.config.js that wraps app.json and overrides googleServicesFile with process.env.GOOGLE_SERVICE_INFO_PLIST ?? './GoogleService-Info.plist'. Dynamic evaluation bypasses static pre-flight check. EAS sets env var to decoded secret file path at build time. app.json untouched. FIXED 2026-05-22.
App-wide OZ to oz audit -- index.tsx and log.tsx fixed this session. day-detail and any other screens not yet checked. Complete audit needed. (SOON)

Women's health and HealthKit

HealthKit weight auto-pull -- read Apple Health body mass (scales that sync to Health app). If no manual entry today, show HealthKit read as ghost value (HealthKit icon next to it). Manual entry always wins and locks the day. Design decisions before building: where does HealthKit weight show in YvY + Head-to-Head when source differs day to day? Does HealthKit weight trigger weight milestone achievements? Needs design conversation first. (SOON)
Women's health -- MOVED TO BACKLOG. App is already feature-dense. Full women's health is a dedicated product vertical, not a side feature -- better to do it right in a future update than bolt it on now. HealthKit permissions already requested. When the time comes: menstrual cycle, ovulation, BBT, cervical mucus, spotting, correlation with nutrition patterns. Discuss with Megan before building.
HealthKit permissions audit -- review full list of available HealthKit data types against currently requested permissions in useHealthKit.ts. Add all women's health metrics. Also add any missing high-value metrics (HRV, resting HR, basal body temp, blood oxygen, flights climbed, basal calories) in next build so data is available before features need it. Do not waste a build later on permissions that should have been requested now.
Smart insights and trends layer -- auto-detect patterns automatically and surface them gently. Undereating, irregular meal timing, sleep and nutrition correlation, habit gaps. Specific trigger examples: 4+ days over calories, consistently low protein, persistently high fat. Contextual tip copy must vary -- never repeat within a week. Faith tier: Rooted users get faith-flavored tip language, Exploring users get clean secular tips. Discipline: direct language. Mindful: warm and observational. Never judgmental.

Home screen and cards

[x] Home screen KAV regression -- FIXED. Root cause: scrollToEnd on focus was scrolling to absolute bottom of screen regardless of card position. Removed scrollToEnd from both Today's Thoughts (index.tsx) and GratitudeStreakCard (GratitudeStreakCard.tsx). Replaced with measureLayout + scrollTo targeting card's actual y position minus 16px padding. automaticallyAdjustKeyboardInsets={true} on ScrollView handles keyboard inset. scrollRef removed then restored as prop on GratitudeStreakCard for measureLayout use.

Home screen cards polish -- subtle border pass, slightly darker card backgrounds, Daily Note card specific polish. (SOON)
[x] YvY card score bar removed -- YOU/YESTERDAY/TIED tally + motivational line hidden during live day (which is always, since card always shows today). Per-metric rows + result coloring + countdown remain. index.tsx.
[x] IF fasting button height shrink -- paddingVertical 14→9, horizontal unchanged. Shorter button, still green. index.tsx.
Weight card -- current/1d/2d ago values to textSecondary instead of textPrimary. Softer treatment. (SOON, quick)
Tooltip/toolkit pass -- update wording and info on existing tooltip cards, add tooltips to certain cards missing them. HOLD until stats and profile/settings pages are in fuller state. Then do as one dedicated session.
Loading states audit -- sweep all screens, ensure nothing feels flashy or jumpy on load. (SOON)
Error handling audit -- review what happens when things fail silently across the app. No user should ever be left on a broken state with no feedback. (SOON)
Mindful mode content hiding -- weight graphs, body comp data, and performance-heavy cards should not show for Mindful users. Audit all cards and hide irrelevant content per mode.
Tab bar scroll-to-top -- tapping the active tab icon when already on that tab should scroll the screen back to top.
Big dimmed card icon watermark -- large version of each card's icon sitting behind card content at ~5% opacity. Subtle texture, gives cards more identity. Apply to all home screen cards.
Steps goal button -- remove goal button from steps card top right. Move step goal setting to profile/settings alongside other goals.
Weight projected graph in profile -- add alongside weight goal card in profile.
exerciseMinutes on Today's Training card -- surface Apple Health exercise minutes alongside the workout summary. Pull from pj_YYYY-MM-DD exerciseMinutes field (persisted since this session). Show as a stat row or subtle secondary line. (SOON)
Physical measurements in profile -- waist, neck, hip fields. Enables Navy method body fat estimate and other formulas that require body circumference. Feeds more accurate color coding on Fitness Metrics card. (SOON)
[x] Shimmer effect extension -- steps bar at/over goal: white LinearGradient sweep (same pattern as water bar). Sleep score donut at >= 85: center score does a quick scale pop (1.08x, 200ms out cubic) + white circular flash overlay (opacity 0→0.18→0), repeating every ~3.3s. Ring arc shimmer scrapped (SVG compositing artifacts). Active cals, macros, calories bars intentionally skipped.
Goals consolidation -- move all daily goals (calories, water, steps, sleep, macros, weight goal) into a dedicated Goals section in profile or settings. Two sub-sections: Fitness Goals (steps, sleep, active cals) and Nutrition Goals (calories, water, macros). Removes scatter of goals across home screen cards and profile. Dedicated session.

Sleep

Sleep score reweight -- bump REM weight higher, soften deep sleep penalty. Duration now uses non-linear power curve (N=3): Math.pow(hours/goal, 3) * 40. Deep 30pts, REM 30pts unchanged. Further stage weight tuning deferred. (SOON)
Sleep edit disclaimer -- when user opens manual sleep edit, show disclaimer that manual entry will overwrite Apple Health synced data.

Workout

[x] Workout notes KAV -- fixed. Removed conflicting automaticallyAdjustKeyboardInsets, rely on KAV behavior=padding + scrollToEnd at 350ms. paddingBottom reduced from 300 to 100.
Add exercise numeric keypad -- reps, sets, and rest duration fields should use numeric keypad not full keyboard.
Profile card collapse animation lag -- very laggy on expand/collapse. Likely JS thread issue. Diagnose and fix.
Collapsible card animation fix (stats.tsx + profile.tsx) -- both use wrong pattern (spring on interpolated 0→1 value, JS thread only). Fix: onLayout-based real height measurement, dual animation (container height JS thread + content opacity/translateY native thread), Easing.out(Easing.cubic) open / Easing.in(Easing.cubic) close. Per animation standard in instructions. DONE -- animation lag remains, see BACKLOG.
[x] Workout notes auto-sync to journal -- DONE. See workout notes overhaul above.

Faith and community

Mission statement screen -- merged into Our Mission screen. See Process and infrastructure section.
Prayer request feature -- MOVED TO NOW section above.

Streaks

Streak grace day system -- mode-aware. Discipline: earn grace days by hitting milestones (streak length or cumulative days), cap 1 saved at a time. Balanced: same earn system, cap 3. Mindful: no punishment mechanic, streaks are informational only or default to gentle habit-forming ones.
[x] Custom streaks system -- SHIPPED. See DONE section.
Streak end warning visuals -- color shift to orange/red on streak card when within X hours of midnight and action not yet completed. Optional subtle pulse or warning icon on the card itself. In-app only, no push notification dependency. High motivation impact, low build effort. (SOON)
App-wide drag-and-drop polish pass -- audit every DraggableFlatList usage in the app (edit layout, manage streaks, workout exercise list, etc.) for gesture jank, activation feel, and visual feedback during drag. Dedicated session. (SOON)
Edit Streak Count -- manual override with disclaimer ("Be truthful, this is for you"). Needed because Apple Health historical data only exists in pj_YYYY-MM-DD on days the app was open, so a user returning after a hiatus may know they hit their goal for 30 days but the history scan only shows 0. Dedicated design session before building. (SOON)
Resources & wellness links -- a curated in-app section (Settings > Help or dedicated screen) listing recommended Christian books, health/wellness books, and YouTube channels. Influencer outreach opportunity. Mostly static content, low build effort. Design session needed to determine format and update cadence. (SOON)

New User Experience

Onboarding to home transition plan -- guided first steps post-onboarding, no "good luck" drop-off. First-time users get contextual prompts easing them into core features rather than landing cold. Dedicated planning session before building. (SOON)
In-app feedback mechanism -- bug reports and feature suggestions direct to Justin, frictionless. Simple mailto: entry point in Settings. Quick win, low effort, high value for early TestFlight users. (SOON)
MFP switcher experience -- UX and positioning for power users arriving from MyFitnessPal. First-impression design that instantly communicates superiority: cleaner UI, smarter logging, real serving data. Makes switchers feel "why was I ever there?" without saying a word. (SOON)
Challenge system -- opt-in time-boxed goals, smart triggers based on user patterns ("think you can do it X days?"), mode-aware duration (Mindful gets softer challenges), progression from short to long. Depends on streaks shipping first. Dedicated session needed. (SOON)
Locked theme rewards -- themes unlocked by completing challenges, not purchased. Short durations first (1-3 days) so the first win comes early. Hooks new users, doubles as disguised onboarding. Applies to non-Light/Dark themes. (SOON)
Custom challenges -- user sets duration and picks goal type from presets. Feels personal and owned. Sub-feature of challenge system, build after base challenges ship. (SOON)
"You've grown" message -- app-generated coach message after key thresholds (weight milestones, streak lengths, logging consistency). Mode-aware tone: Mindful gets warm and celebratory, Discipline gets direct and affirming. Ties to faith journey upgrade prompts for Rooted/Exploring. Builds on existing achievement detection infrastructure. (SOON)

Push Notifications

[x] Push notification infrastructure -- SHIPPED. expo-notifications installed + APNs key generated via EAS. app.json: NSUserNotificationUsageDescription + expo-notifications plugin with iosDisplayInForeground. services/notifications.ts: full notification service -- permission handling (one-shot iOS ask, never on cold launch), IF window scheduling (event-driven, cancels on LAST MEAL), daily scheduler engine with all 10 notification types, mode-aware copy (Discipline/Balanced/Mindful) for every notification, quiet hours enforcement, P1 (streak + IF window -- never suppressed) / P2 (everything else -- subject to spacing) priority tiers, auto-timing spacing logic, average bedtime calculation from last 7 days of sleepBedTime data. services/notificationScheduler.ts: reads all data from AsyncStorage (food entries, water, streaks, workout, goals), runs scheduler once per day (guarded by pj_notif_last_scheduled key), triggers permission ask when any streak hits 3+ days. _layout.tsx: notification handler setup on launch, daily scheduler fires post-auth. index.tsx: onStartFast schedules IF window notis + triggers permission ask as first high-intent moment; onLastMeal cancels IF window notis. Storage key: pj_notification_settings.
[x] Push notifications settings UI -- SHIPPED. Settings > Notifications section. Master toggle, quiet hours (from/until time pickers), minimum spacing pills (30/60/90 min). Per-notification blocks with toggles + time pickers: IF Window Closing (text box for minutes before close, default 60, + Add another reminder up to 3, - remove button), IF Check-In (time picker, default 1pm), Food Log (time picker, default 7pm), Water Pace (toggle only, auto midday), Streak Protection (text box for minutes before bedtime, default 45, shows average bedtime label -- "Your average bedtime: X:XX PM" when 3+ nights of data, fallback message when not enough data), Activity (time picker, default 5pm), Weekly Recap (time picker, default Sunday 7pm), Re-engagement (toggle only). Faith-gated: Morning Intention (Rooted/Exploring, time picker, default 7am), Evening Gratitude (Rooted/Exploring, time picker, default 8pm), Prayer Check-In (Rooted only, time picker, default 9pm). Permission denied banner shows when iOS permission was blocked. New build required (expo-notifications has native code). Tested via new EAS build.
[x] Push notifications settings UI polish -- Time pickers moved to bottom sheet Modal (animationType="none" + manual Animated.Value: overlay fades in, sheet slides up independently). Ghost picker bug fixed (master toggle off clears activeTimePicker). textColor token on DateTimePicker for spinner visibility on light themes. Notification types reorganized into 3 NotifGroup accordions (Health & Habits / Fasting / Faith) -- each shows "X of N active" summary when collapsed, chevron rotates on expand/collapse. Quiet Hours + Minimum Spacing pinned above accordions. Dividers upgraded to borderInput 1px. closeTimePicker() animates both overlay and sheet out before unmounting.

Visual polish

[x] Theme audit pass -- COMPLETE. All 5 themes reworked this session. Dark: bgPrimary #1a1a28, bgCard #262638 (visible navy, comfortable brightness). Slate: bgPrimary #bcc8d4, bgCard rgba(228,234,244,0.90) (tinted cards float on steel-blue). Warm: reworked to light warm parchment, all surfaces warm-tinted. Blush: bgPrimary #f5c8d8, bgCard rgba(255,248,252,0.95) (white cards on medium pink). Light: bgCard bumped to rgba(255,255,255,0.85). Shadow pass (component-level) and accent palette pass remain as separate sessions.

Empty state illustrations -- replace icon + text empty states with tasteful SVG illustrations. Consistent style, theme-aware colors. Apply across all lists and cards that can be empty.

Social

Social and accountability -- lightweight accountability partner feature, not a full social feed. One person you share your daily score with. Strava-inspired but scoped way down. (BACKLOG -- not urgent)
Vitamins & minerals fields on Custom Food Creator -- Vitamin D, Calcium, Iron, Potassium. Power users track these, feeds future reporting. (SOON)
My Foods delete warning -- confirm Alert before × delete on library list rows. DONE. Shows food name, "cannot be undone." Destructive style. add-food.tsx.
Custom Food Creator photo upload -- photo field on create/edit. (SOON)
"Adding to" UX from library -- when food detail opened from library, meal selector should be more prominent since user must always pick. Currently defaults to Morning. (SOON)
Calorie breakdown by meal -- each slot gets a budget. Unclear if needed, revisit later.

Workout

[x] Today's Training empty/rest day states (partial) -- unassigned day state shipped: card with Load Routine + Add Exercise buttons. Rest day warm encouragement state still open. workout.tsx.
You vs Yesterday streak (vsStreak) -- state declared and badge renders but never calculated or persisted. Always 0. Needs full implementation: calculate win/loss result at end of day, persist streak count to AsyncStorage, reset on loss.
My Programs builder -- name it, assign focus/tags/color per day, save, load. MOVED TO SOON.
Programs button move to library -- DONE. See workout library redesign in DONE section.
Workout tab visual pass -- assess whether exercises + effort score + notes is enough or if more sections needed. No specific ideas yet, likely resolves as SOON items ship (muscle group breakdown, previous session comparison, streak/consistency). Revisit after those are built.
- [x] SHIPPED: Today's Effort card -- renamed from "Effort Score" to "Today's Effort" (session rating, not per-exercise RPE). Effort score piped into statsData.ts fetchTrendData via workoutState.cardioLogs[date].effortScore. Added effortScore DataKey to statsCardRegistry.ts (Activity category, flame icon, "Daily session effort rating (1-10)"). getChart() + getStats() cases added to StatsGraphCard (orange, startFromZero false, stats: Avg Effort + High Effort Days >=7). Now available in graph creator pool and downstream for Day Score.
Workout tab FAB -- currently functional but visually plain. Needs a visual pass to feel more premium. (SOON)
Workout tab Tags button -- redesign to match current button conventions. Away from standalone buttons not in cards or header corners. (SOON)
Workout tab muscle group breakdown -- visual showing which muscle groups were trained in today's session. Related to muscle group tags + filter on exercise library. Build after tags are on exercises. (SOON)
Workout tab previous session comparison -- show how today stacks up vs the last time this workout was done. Per exercise, not just overall. (SOON)
Workout library FAB -- DONE. See workout library redesign in DONE section. Create Exercise active, Create Program + Create Routine disabled (coming soon).
IF card polish -- green TAP WHEN YOU EAT button needs bgInset+'80' semi-transparent treatment to match other cards. Timer hero icon verify on device. (SOON)
[x] Workout tab nested scroll bug -- DraggableFlatList inside ScrollView warning. Attempted fix broke entire workout tab; reverted. Determined acceptable as-is -- scroll architecture stable, warning does not affect functionality.
[x] Workout drag handle -- hit target and dead zone resolved.
Edit exercise input validation -- decimal/integer restrictions on all numeric fields, same standard as weight input. (SOON)
Apple Health avg HR per workout -- research whether kingstinct library exposes avg HR per workout sample; if yes, auto-populate on workout sync. (SOON)
Last-used dimmed prefill -- when adding an exercise, ghost in last logged sets/reps/weight as placeholder text. Storage lookup by exercise name on modal open. Always blank until user types -- never auto-fills. (workout tab pass item)
  [x] Sessions System -- SHIPPED as Routine Builder. See DONE section.

Home and stats

Food log donut -- thicker ring, show macro targets inside when empty instead of "no data".
Weekly calorie bar chart -- 7 day bars macro color stacking, today highlighted, PocketScale style. (HIGH)
Stats page overhaul -- HIGH PRIORITY, dedicated session. Full spec:
- BUG FIXED: calendar day tap was black screen (now opens same modal as home). Per-metric exclusion UI still open.
- [x] SHIPPED THIS SESSION: Full rewrite of stats.tsx. CollapsibleSection component with label + chevron toggle. Sections: At a Glance (open), Trends (open), Records (closed), Streaks (closed), Calendar (closed). calTarget now loads from pj_settings -- was hardcoded 1750, critical bug fixed. Records section shows all-time bests with date achieved (getAllKeys + multiGet scan). AnimatedRect bars (useNativeDriver: false) and opacity LineChart (useNativeDriver: true). Active cals color fixed to statusWarn (amber). loadTrendData respects 7/30/90 period. Sparse data shows only available points, no phantom gaps.
- [x] SHIPPED: At a Glance section locked. 2-column grid with absolute center divider (position absolute, left: 50%), width: 50% cells, symmetric 12px inner padding. Stats (row order): Calories/Day | Net Cals/Day, Active Cals/Day | Cal Goal/Day, Steps/Day | Workout Days, Sleep/Night | Sleep Score, Water/Day | Weight Change. Net cals uses Mifflin-St Jeor BMR (from profile height/weight/age/sex) + active cals subtracted from consumed. Macros removed from At a Glance. Mindful mode hides all nutrition rows. CollapsibleSection headers: accent color + chevron + center divider line. "Based on X days with food logged" scoping text shown under period selector.
- [x] SHIPPED: Graph system Phase 1 -- all Trends charts rebuilt to CPP quality. LineChart: Y-axis with niceYTicks, horizontal grid lines, gradient area fill, latest-point dot + value badge, goal line shows actual value. CalorieBarChart: same Y-axis/grid treatment, fixed 16px bar width (no more giant slabs on sparse data). New MacroBarChart: stacked P/C/F bars per day, green/amber/red, grams Y-axis, legend row. New WorkoutFrequencyChart: weekly bars 0-7 scale, color-coded by consistency, leading zero-weeks filtered. All animations: shared useChartAnim hook -- opacity + translateY settle, 100% useNativeDriver: true, no more JS thread choppiness. At a Glance period change decoupled from trend chart reload (no more flickering when changing glance period). profileBmr extracted to state. Weight Y-axis: decimal labels (176.5 not 177). Value label anchor: dynamic end/middle/start to prevent right-edge clipping.
- [x] FIXED: niceYTicks clip -- guard after tick loop bumps last tick up one niceStep when < dataMax. No more line clipping at SVG top.
- [x] FIXED: Line chart value label overlap -- opaque bgCard Rect pill rendered behind last-value SvgText on all line charts. Descending lines no longer bleed through the label.
- [x] FIXED: Period switch flicker -- three-part fix. (1) 7 history arrays collapsed into single trendData state object, one setTrendData call. (2) trendPeriodRef + removed trendPeriod from useFocusEffect deps, eliminating double loadTrendData call. (3) hasPlayed ref in useChartAnim -- entry animation fires once on first data arrival, never resets. Period switches now update chart content at full opacity with zero flicker.
- [x] FIXED: Workout frequency data source -- hadWorkout now reads workoutState.programs[dateKey].exercises.length > 0, loaded once before loop. caloriesBurned no longer used for workout detection.
- [x] SHIPPED: Tap callout bubbles on all charts -- all 4 chart types (LineChart, CalorieBarChart, MacroBarChart, WorkoutFrequencyChart). Tap any bar or data point for floating date + value pill. Same tap or empty area tap dismisses. Per-chart callout state. Line chart tap radius bumped from r=12 to r=18 for easier hit target.
- [x] SHIPPED: Chart entry animation -- slide-up only (8px translateY), opacity removed. No more fade flash. Justin confirmed good enough.
- [x] SHIPPED: Calorie goal line removed. Justin confirmed.
- [x] APPLIED: Line chart value label pill v2 -- floats above dot, accentBlueRaw fill 0.65 opacity (semi-transparent), white text, centered. Awaiting Justin confirm on opacity level.
- [x] APPLIED: Grid lines darker -- strokeWidth 0.5→1, opacity 0.7→1.0 on all 4 charts. Awaiting Justin confirm.
- [x] SHIPPED: Steps -- callout + pill show full number with commas ("9,600"). Y-axis stays k-notation. Justin confirmed.
- [x] SHIPPED: Sleep format fixed -- was "7.9hh" double-h bug. Now "7h 53m" via fmtFull. Justin confirmed.
- [x] APPLIED: Macro callout redesigned -- 4-row pill: date (textDim) + P Xg (protein green) + C Xg (carbs amber) + F Xg (fat red). Individual macro colors per row. Awaiting Justin confirm.
- [x] APPLIED: Calorie callout -- full number with commas ("1,234 kcal"), no k-notation. Awaiting Justin confirm.
- [x] APPLIED: Calorie bars -- flat coral #e06840, all bars same color. Removed green/amber/red target-based color coding (target is fluid, coding was misleading). Removed "On target / Close / Off" legend. Awaiting Justin confirm.
- [x] SHIPPED: Trend chart bottom stat labels -- redesigned to two-column grid (3-col for Macros) with hairline divider, uppercase 9px labels, 13px semibold values, centered. GraphCard stat prop replaced with stats array of {label, value} pairs. Weight change bug fixed -- was pulling from mismatched At a Glance period, now derives from first/last points in trendData.weight so it always matches the chart shown.
- [x] FIXED: Sleep score graph showed different values for same date depending on period selected (7d/30d vs 90d) -- root cause: loadAllCardData used sleepGoal from React state (still default 8) while profile loaded async; on-demand period fetches used the now-correct sleepGoal. Fix: loadAllCardData accepts sleepGoalVal param, call site passes sleep directly before state update propagates. stats.tsx.
- [x] FIXED: Callout bubble persisted after switching period (7d/30d/90d) on same card -- callout state is local to chart sub-components, period change did not trigger remount. Fix: wrapped getChart() in View with key={card.period} inside StatsGraphCard -- period change forces chart remount, callout resets to null. StatsGraphCard.tsx.
- [x] FIXED: Apple Health imported workouts now auto-check off on the workout tab -- new exercises from appleWorkouts useEffect write their IDs to checks state and persist to pj_workout_state.checks. Also fixed sync timing: fetchTodayData() now fires in workout tab useFocusEffect so new Apple Watch workouts appear on tab focus without requiring app restart. workout.tsx.
- Custom graph system -- Phase 3 IN PROGRESS. See Phase 3 items below.
- [x] SHIPPED Phase 3 -- statsCardRegistry.ts: StatsCard type (system/graph), SystemCardKey (atAGlance/trends/records/streaks/calendar), DataKey, ChartType, CardPeriod, CardPlacement. DEFAULT_STATS_CARDS (11 cards, period: 30). loadStatsCards (read-then-merge, never removes user cards), saveStatsCards (normalizes order), generateCardId, DATA_KEY_META, availableChartTypes. Storage key: pj_stats_cards.
- [x] SHIPPED Phase 3 -- Per-card period system. trendDataMap replaces single trendData state. Each graph card owns its period (7/30/90d). loadAllCardData loads all unique periods in parallel. Global period pills sync all cards. Per-card pills override individually. trendDataMap caches by period string key.
- [x] SHIPPED Phase 3 -- StatsGraphCard component. Props: card, cardTrendData, theme, calTarget, stepGoal, sleepGoal, onPeriodChange, onEditPress. Per-card 7d/30d/90d pills in header. Gear icon (onEditPress -- wired to {} pending Step 8). Computes own stats from cardTrendData. Registry-driven: all graph cards in Trends section driven by statsCards state.
- [x] SHIPPED Phase 3 Step 5 -- Edit stats sheet. Grid icon in header opens slide-up sheet. Two groups: GRAPH CARDS (DraggableFlatList -- long-press reorder, period badge, trash with Alert confirm, eye toggle) and SECTIONS (static rows -- eye toggle only, dimmed grip, SECTION badge). Changes auto-save to pj_stats_cards. Backdrop + handle dismiss.
- [x] SHIPPED Phase 3 -- sys_trends added to registry. SystemCardKey extended to include 'trends'. All 5 CollapsibleSections (At a Glance, Trends, Records, Streaks, Calendar) now driven by sectionVisible() helper reading statsCards. Sections show/hide actually works now (was broken before -- visibility flag was stored but never read for rendering).
- DEFERRED: Section reordering (Option B) -- make sections reorderable in edit sheet, drive rendering from registry order. Requires dynamic section render via switch on systemKey. Deferred until after creator modal (Step 6). Add to SOON.
- Default cards pre-loaded so page is never empty -- DONE (11 DEFAULT_STATS_CARDS, all period: 30).
- [x] Add edit button to stats page -- DONE. Grid icon in header.
- FAB for stats -- Add Graph and Add Report. (Phase 3 Step 7 -- pending)
- Reports feature -- weekly/monthly summaries with context, shareable/exportable snapshots. (Phase 4)
- Card visual differentiation -- graph cards, report cards, streak/info cards need distinct visual language. (Phase 3)
- PR/best day cards -- steps, active cals, water, sleep score, etc. Exclude incomplete log days from calorie-based PRs.
- Goal hit rate card (maybe -- revisit during session)
- Body measurements as graph data option
- Calendar needs work -- On Target/Close/Off pill system removal planned (replaced by Day Score). Exclusions polish also planned. See Day Score and Exclusions polish entries below.
- Charts on stats page should be placeable on home tab too -- shared card pool, one unified edit sheet across both tabs. Architecture decision for Phase 3. CONFIRMED SOON -- Justin wants this after Gratitude Streak ships. Stats graph cards (user-created) pinnable to home screen alongside standard cards. pj_stats_cards drives both views. Single CARD_REGISTRY-compatible wrapper component for stats graphs on home.
Stats page depth/shadow pass -- same shadow treatment as settings cards (shadowOpacity 0.18). Do during stats overhaul session.
Streak card -- home screen: Bible, workout, calorie streaks. Workout tab version: X workouts this week toward weekly goal, visible on workout tab itself. (HIGH)
Daily exercise minutes goal + active calorie goal -- industry standard (Apple Fitness rings model). User sets both targets in profile/settings. Progress tracked live against HealthKit exerciseMinutes and activeCalories. Celebration animation fires when either goal is hit. Both already pulled from HealthKit. Design question: home screen placement TBD -- options are (1) add progress rings/bars to existing Fitness Metrics card, (2) dedicated Activity Rings card, (3) inline under the Steps card. Mindful mode: show progress neutrally, no countdown language. (HIGH)
Morning briefing card -- first open of day, faith first, yesterday recap, today targets.
Day Score -- score out of 100 generated from logged data for the day. Replaces On Target/Close/Off as the calendar day indicator (green = great, red = rough, earned not arbitrary). User selects a preset rather than cherry-picking individual data points to avoid decision fatigue. Starting presets: Essential (calories, water, steps, sleep), Performance (above + workout logged, protein, active calories), Full Picture (everything including macros, streak, sleep score). Additional presets TBD. Full opt-out available (nothing shows on calendar). Formula and weighting TBD in dedicated thread. (SOON)
Stats calendar polish -- remove On Target/Close/Off pill/color grading system entirely. Replaced by Day Score. Depends on Day Score shipping first. Toolkit icon handles all context/explanation needs. (SOON)
Day summary card -- appears on first app open the morning after. Shows Day Score at minimum. Additional content TBD -- needs dedicated planning. Should feel like a quick affirming or motivating recap, not a wall of data. Depends on Day Score. (SOON)
Exclusions polish -- keep exclusion dots on calendar tiles. Add one-time tooltip/callout the first time a user sees a dot, explaining what it means. Toolkit icon always visible on calendar (not just when exclusions exist) -- tapping opens popup modal explaining exclusion dot logic, Day Score context, and calendar-related info. Replaces static legend at bottom. (SOON)

Health data

HealthKit source detection -- read source identifier on HealthKit samples to show "via Garmin", "via Whoop", "via Oura" labels on sleep/HRV data. Garmin/Whoop/Oura all sync to Apple Health natively -- source passthrough is the right architecture, no direct integrations needed.
Food group pattern detection -- if user logs zero whole foods (fruits, vegetables, lean proteins) for X consecutive days, surface a gentle tip. Discipline: direct. Mindful: warm/observational. Never judgmental.

Faith and Bible

Faith/Bible Settings panel -- Bible page gear icon opens Faith Settings sheet: font size for reading text, translation selector (future), faith-specific Help/definitions (streak, journal categories), reading plan settings placeholder. Faith category in tooltipRegistry.ts as placeholder. Main settings Help stays Nutrition/Fitness/Sleep & Recovery only. Dedicated session.
Today's Message overhaul -- full spec below. Dedicated session.
- Title: "TODAY'S MESSAGE" for ALL faith journey tiers, no exceptions
- All users get a pool of messages that cycles. Pool = preset messages + user custom additions
- User controls their pool -- can delete presets, add custom, reorder. Static vs cycle toggle (static = one message stays up, cycle = rotates)
- Rooted/Exploring presets: KJV scripture verses (52 built-in). NRN presets: motivational/inspirational messages (10-15, mode-aware -- Mindful gets softer, Discipline/Balanced get stronger)
- Custom entries: Rooted/Exploring can add custom verses (book/chapter picker + multi-verse selector up to 4 consecutive verses, auto-formats as "John 3:16-18") OR plain text messages. NRN can add plain text messages only, no verse reference field
- Verses added from Bible screen auto-fill the reference
- Pool management lives in Settings, not on the card face
- Card gets (i) tooltip explaining pool, static vs cycle, custom additions, how to manage in settings
- Card visual: Rooted/Exploring keep gold border + holy glow. NRN gets theme-aware accent/primary/secondary treatment, still distinct from standard cards, no gold
- NRN tap behavior: opens main journal page (not a pre-populated entry)
- Rooted/Exploring tap behavior: opens Bible screen as before
- Custom scripture picker: book selector → chapter selector → verse multi-select (up to 4 from same chapter). Edge case of multi-chapter handled by adding multiple entries to pool
[x] Bible auto-scroll to verse -- auto-center highlighted verse when opening from Today's Message. ScrollView ref + onLayout y-positions, scrolls 350ms after chapter loads.
[x] Bible verse favorites -- star in reflect banner toggles pj_bible_favorites. Centered modal with Book Order / Recent sort (saved to pj_settings). Tap to navigate, trash to remove. Empty state included.
[x] Bible reader settings modal -- gear icon in header, centered popup with live preview (John 3:16), text size (S/M/L/XL), font (DM Sans / Georgia / Palatino), auto-scroll speed (Slow/Med/Fast), Reading Plans coming soon placeholder. Saved to pj_settings.
[x] Bible auto-scroll reader mode -- floating pill bottom-right, play/pause. Speed controlled in settings modal. Stops on chapter change.
[x] Bible header updated -- 3 right-side pill buttons: star (favorites), book/journal, gear (settings). Journal icon fixed to solid "book" matching home/workout tabs.
[x] FIXED: Bible modal titles (Saved Verses, Bible Settings) were textPrimary -- changed to accentBlue to match app-wide modal header convention. bible.tsx.
[x] Verse unhighlight on tap -- tapping a highlighted verse clears it.
[x] Today's Message card -- solid "book" journal icon added to top-right of card header, routes to journal.
[x] Achievement toast tappable -- tap routes to achievements page, cancels auto-dismiss, quick exit animation. Both ToastCard and DailyGoalToastCard. AchievementToast.tsx.
Achievement toast remaining -- trigger context under name, wording update before App Store launch. Still open.
Achievement page trophy hex cards -- inconsistent sizes across cards. All hex badges must be uniform size. CPP bug. (SOON)
Cycling Bible verses -- fine-print / sub-label style text, centered at the bottom of applicable tabs (Food Log, Workout, Home). Unobtrusive ambient faith element, not a card. Different verse per tab, thematically relevant to that tab (food/workout/general). Home verse can rotate freely. Rooted users: always on. Exploring users: optional or off. Faith journey gated. (SOON)

Process and infrastructure

Tooltip audit pass -- sweep all cards app-wide, flag every card that needs a (i) tooltip that doesn't have one yet. Build missing tooltips. Dedicated session. (SOON)
Tooltip wording polish pass -- dedicated pass over all tooltip copy after all cards are wired. Known issues: Active (Apple Health fallback language for non-watch users), Remaining (confirm algorithm accuracy vs what's described), Net (explain running BMR before using the term), Color Coding ("big calorie number" needs rewrite). Do as one session with full context of every card.
Settings > Help section -- two subsections: Definitions (auto-populates from tooltip registry, Show Again per entry) and Tips & Guides (shell built now, placeholder entry, mini help articles filled over time e.g. "How to improve your sleep score", "Understanding your active calorie estimate"). About row planned, not built yet.
[x] Our Mission screen -- SHIPPED. app/mission.tsx. 5 cards: The Foundation, You vs Yesterday, We Do the Math Right (burn accuracy + running BMR combined), The App Adapts to You (coaching modes), Faith is in the Foundation. Hero OUR MISSION title 48px Bebas accent in scroll content. Card headlines accent colored. Vertical free scroll. Entry points: Settings > Help > Tips & Guides row + all-set.tsx hotlink. All 5 cards visible for all Faith Journey tiers including NRN. Hero watermark icons (130pt, 0.10 opacity, overflow:hidden clip) added to all cards. Dedicated copy + visual pass still needed: voice rule = "we" for conviction only (faith card), second person or no subject for functional cards.
[x] Effort vs Results -- SHIPPED. app/diagnostic-report.tsx + utils/diagnosticReport.ts. "Why am I not losing weight?" style analysis. Entry point: Stats > Reports section (sys_reports card). Windows: 14/30/90d default 30. Findings: logging consistency, calorie deficit vs actual weight change (3500 cal = 1 lb), burn accuracy flag (100% + avg > 450 active cal), macro quality (protein vs 0.7-1.0g/lb, fiber as food quality proxy), sleep quality + correlation to next-day intake. 9 correlations: sleep→next-day cals, high burn day→next-day cals, weekend vs weekday, water vs cals, sodium vs scale, steps vs sleep, workout vs rest day cals, sleep vs workout rate, surplus→next-day overage. Each correlation has minimum delta threshold to fire. Mindful mode: neutral language, no status pills, "THINGS TO EXPLORE" instead of suggestions. Archive: up to 10 saved reports, trash to delete. Insufficient data (<7 logged days): report saves, button disabled + note shown, user can try different window. tooltipRegistry: effort_vs_results, diagnostic_correlations. Pending: real data test, polish pass once user has enough data to generate full report.
Coaching style deep-dive page -- dedicated screen explaining all three modes in depth. Who each mode is for, what changes per mode, why certain features are hidden in Mindful, language differences, worked examples. Written warmly, not like a help doc. Findable from settings and from onboarding. NOW -- high value, reduces churn from users who feel they picked wrong.
Style/mode audit -- go through each style's unique features and defaults to see what stands out, what needs to be added or changed. Are there features that shouldn't show in Mindful that currently do? Features that should be Discipline-only but aren't? Defaults that feel wrong per mode? Full pass across all three modes, dedicated session. (SOON)
Settings page overhaul + profile/settings consolidation -- Pass 1 SHIPPED. CollapsibleSection component with subtitle preview when collapsed. Sections: Appearance (Theme/Accent/Haptics, default open) → Faith & Style (Coaching Mode/Faith Journey, default closed) → Health → Help → About → Account → Dev Tools (7-tap hidden). PRO badges removed from themes (no paywall, all themes fully selectable). Faith Journey selector added (rooted/exploring/notrightnow, saves to pj_settings). About section added (version, Privacy, Terms, FatSecret attribution). All Dev Tools consolidated to single 7-tap section. Accent grid fixed to 6-column fixed-width layout (consistent across all themes). Sub-labels Coaching Mode/Faith Journey: accentBlue, 11pt, letterSpacing 2 for clear hierarchy. Pass 2 pending: goals migration from profile to settings, profile cleanup to 4 cards.

[x] App Store readiness scan -- COMPLETE 2026-05-19. Full audit done. See APP_STORE_CHECKLIST.md for all findings, status tracking, and attack order. Do not track individual fix items here -- that file is the source of truth.

App Store code fixes -- work through APP_STORE_CHECKLIST.md in order. Current status:
[x] 1. Account deletion -- DONE. Delete Account in Settings (Account section, below Sign Out), two-step confirmation Alert, Firebase Auth user deleted first (if deleteUser fails for any reason, Firestore and AsyncStorage are never touched), Firestore users/{uid}/store/* wiped with captured uid, all pj_* AsyncStorage keys removed. Routes to sign-in automatically via onAuthStateChanged -- no manual navigation. requires-recent-login handled with specific user message. Apple identity token revocation fully implemented via Firebase Cloud Functions (functions/src/index.ts). exchangeAppleCode called fire-and-forget after Apple sign-in, stores refresh_token in Firestore users/{uid}. deleteAccount Cloud Function handles: revoke Apple token, wipe Firestore store/*, delete users/{uid} doc, delete Firebase Auth user via admin SDK (no requires-recent-login). Firebase Blaze plan enabled, Cloud Build permissions set, deployed to us-central1. settings.tsx + sign-in.tsx + firebaseConfig.ts updated.
[x] 2. Privacy policy + Terms of Service -- DONE. public/privacy.html + public/terms.html written. Firebase Hosting wired in firebase.json. sign-in.tsx links both docs via Linking.openURL. Deploy: firebase deploy --only hosting. URLs: projectj-5d024.web.app/privacy + /terms. Enter both in App Store Connect metadata.
[x] 3. Privacy manifest -- DONE. NSPrivacyAccessedAPICategoryUserDefaults CA92.1 added to app.json under ios.privacyManifests. Requires new EAS build to take effect.
[x] 4. Camera permission string + NSHealthUpdateUsageDescription removed + supportsTablet: false -- DONE. All in app.json. One new EAS build covers all three.
[x] 5. Medical disclaimer pass -- DONE. Sleep card (index.tsx): disclaimer below tip. BMR/TDEE estimates (profile.tsx): disclaimer below existing note. Weight projection (profile.tsx): disclaimer below projection box. All read "For informational purposes only. Not medical advice."
[x] 6. Age gate -- DONE. profile-setup.tsx handleContinue: calculates age from birthday, blocks under-13 with Alert. Alert imported.
[x] 7. Dev tools audit -- DONE. Reset Achievements + Reset Tooltip States both wrapped in confirm Alert with destructive style. Clear Food History, Reset Onboarding, Force Restore already had confirms -- untouched.
[ ] 8. App Store Connect setup -- privacy label, age rating, URLs, description, screenshots, review notes (no code -- do after name is locked)
[ ] 9. Verification scan -- production build, device install, all flows confirmed before submitting

[x] Welcome screen overhaul -- dark bg (#0d0d0f), logo PNG full-width with gradient blend top/bottom (no transparent PNG needed), tagline "The app that actually cares about you" killed, PROJECT J wordmark below crystal, fade-in stagger animation. welcome.tsx.
[x] App icon + native splash -- icon.png replaced with logo PNG (2048x2048). Splash updated to logo.png, imageWidth 280, backgroundColor #0d0d0f both light/dark. app.json.
[x] Sign-in tagline removed -- "Faith · Fitness · Forward" ditched. Wordmark only. sign-in.tsx.
App name + logo -- placeholder logo (chrome crystal, dark bg) in place for TestFlight. Final name TBD from shortlist (Prevail, Steadfast, Worthy, Haven, Witness, Sown). Verify App Store + TikTok handle availability before committing. Prevail is strongest. Bundle ID decision required before App Store submission (com.jharmke.projectj permanent after first release).
[x] TestFlight -- LIVE 2026-05-22. Internal build installed and verified. External review NOT YET submitted -- build 7 is ready in App Store Connect but external testing group not yet created or assigned. App Store Connect record created as "Project J Wellness" (placeholder -- rename before App Store submission). EAS production build 1.0.0 (build 7). Google API key rotated + old key deleted. GoogleService-Info.plist updated with new key. Privacy/terms live at projectj-5d024.web.app. Friends/family invites blocked until external review submitted and approved.
Firebase free tier notes -- Spark plan: 1GB storage, 50K reads/day, 20K writes/day, 1GB network/month. Current usage: 38 docs per user, tiny. Comfortably handles 500+ TestFlight users. Upgrade to Blaze (pay-as-you-go) only when approaching limits -- monitor in Firebase Console > Usage. Each user's data is isolated under users/{uid}/store -- fully visible per-user in Firebase Console. No privacy concern for admin view of own app data.

Visual polish (do together)

[x] Warm theme heavy redo -- reworked to light warm parchment (cream bg, warm-tinted cards/inputs/tracks/text throughout, amber borders, golden gradient). Accent palette darkened for light bg readability. Ships as light warm theme distinct from Light/Slate/Blush.
[x] Accent palette full pass -- All 5 themes audited and rebuilt. Rainbow ordered warm→cool, neutrals last. Light: culled 4 near-duplicates, added Orange/Yellow/Cyan/Pink/Burgundy, Black replaces Silver as default, Amber/Forest/Blue locked (onboarding hardcoded). Dark: Red strengthened, Gold→Amber (#c2621a), added Orange/Yellow/Cyan. Slate: ditched Teal/Gold/White, added Burgundy/Amber/Orange/Navy. Warm: ditched Sage/Sienna, fixed Amber to #c2621a, added Navy/Black. Blush: added Navy/Green/Amber. Amber is #c2621a across all themes.
Greeting area customization -- settings picker for top-left home header slot. Options not fully defined yet. Candidates: greeting text, streak badge, calorie summary line. App name + date always stay. Design options before building.
Shadow pass -- increase shadow opacity and darkness on light themes (Slate, Light, Blush, Warm).
Gradient pass -- more visible gradient range on all light themes.
Full theme audit -- all 5 themes x all accents, every screen, before beta.
Progress bar track color pass across all themes.
Collapsible card tap targets app-wide -- DONE. 44pt minHeight + paddingVertical on header touchable in stats.tsx and profile.tsx.
Stats page streaks card -- reopen-after-close bug fixed. Choppiness tracked in BACKLOG under collapsible card animation performance.
Empty states -- designed placeholders for all lists and cards. (HIGH)
[x] Card background hero icons -- large faded icon (130pt, accentBlueRaw, right: -24, bottom: -28, opacity 0.10, overflow hidden) on all home cards. Assignments: Steps=footsteps, Water=water, Weight=body, Calories=flame, Macros=nutrition, IF=timer, Sleep=moon, Training=barbell, Fitness Metrics=fitness, You vs Yesterday=trophy, Daily Note=create. Verse card skipped. Fitness Metrics boxes, Daily Note input/button, You vs Yesterday score bar all use bgInset+'80' semi-transparent treatment so hero bleeds through.
Card background icon pattern -- large faded icon (80-100pt, 6-10% opacity, filled variant, accent or textMuted color, right-edge slightly clipped by card boundary) behind data in home screen cards. Start with Steps card to establish pattern, then roll to all cards with a clear primary icon. Clips at card edge for depth, never competes with data.

Journal

Edit entry title -- currently only notes and category editable.
Journal icon on Stats tab header -- routes to journal.tsx.
Date on entries tappable -- routes to that day's day detail.


BACKLOG -- parked, good ideas, not imminent
App-wide color customization -- extend color picker beyond stats graphs to home screen bars (water, steps, calorie progress bar). Calorie bar skip (mode-aware semantic coloring). Steps/water bars follow accent color already -- decision to revisit. Macro identity colors (protein green, carbs amber, fat red) are visual language app-wide -- any change requires propagating through log, home, day detail, stats all at once. Build only after stats color picker ships and proves the pattern. Entry point: gear press on each card. Storage: pj_settings colorPrefs key.
Collapsible card animation performance -- DONE. Replaced JS thread height animation with instant height snap + opacity fade (300ms open, 100ms close, useNativeDriver: true). Applied to stats.tsx (CollapsibleCard), profile.tsx (CollapsibleCard), and log.tsx (meal sections). All smooth, no lag.
Social and accountability partner -- lightweight, one person you share daily score with. Not a full social feed. Strava-inspired but scoped. Build after core features stable and onboarding complete.
Tutorial / walkthrough system -- interactive overlay style (live UI underneath, highlighted circles, callout bubbles, tap-to-advance). Mode-aware: each mode gets its own tutorial voice and emphasis. Premium feel -- this should feel like a product moment, not a tooltip tour. In-depth but digestible: covers the why, not just the how. Opt-in from settings and accessible via toolkit icons on screens with a built tutorial. For Mindful users, a meta-tutorial auto-plays on first launch: walks through how the tutorial system works, shows where to find tutorials in settings and toolkits, then releases them into the app. First real tutorial does not auto-play -- user chooses when to start. Immediate skip/close always available. Major UX differentiator especially for Mindful user type. Needs dedicated planning thread before building.
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

Reporting / Report Card -- select a time range (7/30/90d) and get a structured snapshot: avg calories/macros, steps, sleep score, weight change, workouts logged. Trend callouts in plain language (e.g. "sleep score up 8 pts this week"). Goal progress summaries (weight to goal, step goal hit rate, calorie consistency). Shareable via native share sheet as screenshot, not PDF. Vision only -- layout, scope, and feature set all subject to change. No code written, no roadmap slot yet.
Time of day food heat map -- visualized as grid, high differentiation value
Energy level tracking -- correlates with food choices, "you always crash at 3pm on high carb days"
Sleep vs food correlation -- connect sleep data to prior day food choices, unique insight
Hydration timing insights -- not just how much but when
Per-metric sleep exclusion -- exclude sleep without excluding full day data. Revisit during stats revamp.
Nap tracking -- Apple Health tracks naps separately iOS 16+

Workout features

Sessions tab in workout library -- SHIPPED as Routine Builder. See DONE section.
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
Side-by-side screen recordings vs MFP -- same task, no commentary needed, let the product speak. UI, logging flow, serving data, speed. MFP's UI is stuck in 2015, the contrast sells itself.
AI scanner bashing content -- memes, comparison posts, trending audio, confidently wrong format. Scanner apps guess and Project J tracks. High shareability, hits the right audience.
Faith angle content -- verse + workout clip format, subtle and authentic to the product, underserved Christian fitness audience. Should be early content, not saved for later. Never forced.
Micro influencer outreach -- Christian fitness and faith-based wellness creators. Back pocket until product is polished and TestFlight ready. High ROI when the product is tight.
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
- You vs Yesterday: card label is "YOU & YESTERDAY" in Mindful only. "You vs Yesterday" stays for Balanced/Discipline. Mindful behavior: W/L/T hidden. No score bar. No winner declared. Shows deltas only for 3 locked metrics: steps, sleep, water. 4th slot cycles contextually -- "Logged a meal" checkmark once any food logged, "Worked out" checkmark once workout logged, "Journaled" once journal entry saved. Rooted/Exploring faith users get "Read today's verse" or "Reflect" in the 4th slot rotation. Main 3 locked, 4th cycles based on what's most relevant. Card hidden by default in Mindful home layout but available in Edit Layout.
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
[x] Progress bar fills smoothly as exercises checked
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