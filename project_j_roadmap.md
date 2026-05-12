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
[x] You vs Yesterday card -- tier/priority metric system (Tier 1: net cals, steps, sleep score, water; Tier 2: weight, active cals, sleep hours), 4 metrics shown always, win/loss/tie per metric, accent bar on winner, score bar with YOU vs YESTERDAY, cycling motivational lines per result, streak badge, cardOrder merge fix for new cards

NEXT PRIORITY (session 13)
1. Sleep history persistence bug -- HealthKit sleep not saving to AsyncStorage. Day detail empty for last 2 days. Head to Head yesterday sleep always blank until fixed. Debug thread -- bring useHealthKit.ts and index.tsx sleep persistence section.
2. CalendarModal transparency bug -- head-to-head.tsx calendar appears transparent on light themes. Must read theme.ts before touching. Do NOT hardcode colors as fix.
3. Sleep card -- fix duration math (7h57m showing as 8h0m), fix poor sleep label threshold (7h57m against 7hr goal should not be poor), add donut on manual entry, confirm manual entry overrides HealthKit, review sleep scoring logic before touching thresholds. Manual save must validate both bed time and wake time filled -- toast error if not. Clear button alignment bug fix.
4. Today's Training empty/rest day states -- encouragement text when no exercises logged on unassigned day, intentional acknowledgment message on planned rest day
5. Food log donut -- thicker ring, show macro targets inside ring when empty instead of "no data"
6. Effort score -- card stays on workout tab, smart nudge fires when workout is completed (last exercise checked off or cardio marked done), visual polish on buttons with proper selected state
7. Workout notes -- keyboard avoiding view fix (keyboard covers field), Save Note button dim/inactive standard, wire to journal on save as workout category
8. Custom water amount -- replace text input with centered fade-in drag modal. Spec: .5oz increments, 48oz max, live oz display updates as you drag, tappable value opens numpad (0-9 plus .5 key only, no free decimal), KAV so card slides up with keyboard, single Add button, fade out on confirm, toast fires. Never leaves home screen.
9. Custom water modal card -- fix transparency on current modal, should be solid card
10. Shadow pass -- increase shadow opacity and darkness on light themes (Slate, Light, Blush, Warm)
11. Gradient pass -- more visible gradient range on all light themes
12. Barcode override system -- scan returns wrong item, show "Wrong item?" fires text search by product name, user picks correct item, saves to pj_barcode_overrides keyed by barcode string. Every future scan checks overrides first. Phase 2: sync to Firestore as community-corrected database. Build local-only first.
13. Stats page revamp -- dedicated session, discuss consolidation, pagination, paginated cards pattern, sleep detail page with nap tracking, per-metric exclusion UI
14. Per-metric sleep exclusion -- exclude sleep data for a day without excluding full day calories/steps/workout data. Note: revisit during stats revamp. Also consider nap tracking (Apple Health tracks naps separately iOS 16+).
15. Notification center -- bell icon in profile header, badge on new notifications, real-time toasts for Health sync events
16. Excluded dates -- design and placement, neutral dim dot on calendar, excluded list view
17. Calorie color scoring -- mode aware, stub default to Balance
18. My Programs builder -- name it, assign focus/tags to each day, save it, load it
19. Sessions tab in workout library -- save a day's exercise list as a named session, load onto any day
20. Daily Note + Workout Note -- wire to journal, workout category added to journal
21. Bug sweep -- toast on water remove
22. Macro bars + food log donut animated -- verify first, may already be done
23. State restoration on launch -- save active tab/scroll position, restore on cold launch
24. Bible auto-scroll to verse -- when opening from Today's Message card, auto-center on highlighted verse
25. (i) tooltip system -- info icon on cards, one-time modal on tap, lives in Settings > Help, HIGH PRIORITY
26. Apple Health badge on imported workouts
27. Bible reading programs / Bible studies
28. Camera progress tracker -- timelapse, program milestone integration
29. TestFlight -- discuss setup, App Store Connect, tester invite flow
30. App name -- finalize from shortlist (Prevail, Steadfast, Worthy, Haven, Witness, Sown), verify App Store availability, verify TikTok handle availability before committing
31. First use onboarding moments -- non-blocking, one time only, fires alongside action not instead of it, subtle celebration. Rules: never halts user flow, never repeats, user missing it is not a loss.
32. Achievement toast improvements -- tappable routes to achievements page, add trigger context under name, tap for details hint text. Achievement wording update before App Store launch.
33. Head to Head polish -- HEAD TO HEAD title accent color
34. TikTok/marketing -- account setup, content plan, meme formats, branding direction

ANIMATION AUDIT -- LIVING DOCUMENT
This list must be updated whenever an animation is built or changed. Reference this before any animation work.

Contextual Achievement Toast Animations (phase 2):
- Water goal -- water filling up inside the toast badge
- Steps goal -- animated footprints or walking figure across the toast
- Weight milestone -- scale needle swinging or numbers ticking down
- Streak milestone -- flame growing or chain link clicking into place
- First workout logged -- dumbbell or barbell animation
- Sleep goal hit -- moon and stars, ZZZ floating up
- Calorie goal hit -- plate clearing or flame extinguishing
- IF fast completion -- clock hands spinning then unlocking
- Bible verse read -- subtle page turn or bookmark placing
- Journal entry saved -- ink spreading or pen stroke
- Morning intention set -- sun rising animation
- Workout fully checked off -- card completion pulse or flash

Number Transitions (HIGH PRIORITY -- affects entire app):
- All big numbers tick/roll to new value like a scoreboard when they update
- Applies to: calories, steps, weight, water, macros, streak counts, any meaningful number
- Should feel like an old scoreboard or odometer, not a snap

Progress Bars and Rings:
- Calorie progress bar animates on every load
- Macro bars animate on log tab entry
- Food log donut ring fills on load
- Water bar bounce when updated
- Sleep donut animates on load

Goal Moments:
- Water goal crossed -- water fill animation on the bar itself
- Step goal crossed -- footprint or walking animation on bar
- Streak milestone -- 7 day and 30 day deserve distinct moments beyond standard toast

Interaction Polish:
- Effort score selection -- punchy scale up with haptic on tap
- Exercise checkoff -- more satisfying checkmark animation
- Weight log confirmed -- number ticks to new value
- Day selector -- active day card subtle pulse or glow
- Water preset buttons -- bar bounces on update

Tab Transitions:
- Log tab -- food item drops in on enter
- Workout tab -- weight plates slide on enter
- Stats tab -- bars grow up on enter
- Subtle, not distracting, fits the tab content

Streak and Milestone Moments:
- 7 day streak -- distinct animation beyond toast
- 30 day streak -- bigger moment, close to achievement toast tier
- Goal weight hit -- biggest non-platinum celebration moment

First Use Moments (non-blocking, one-time only):
- First calorie logged
- First workout checked off
- First verse read
- First water goal hit
- First step goal hit
Rules: never halts user flow, never repeats, subtle enough that missing it is not a loss, fires alongside the action not instead of it

MARKETING / DISTRIBUTION
App name shortlist (verify App Store availability before committing):
Prevail, Steadfast, Worthy, Haven, Witness, Sown
Dropped: Abide (taken by existing Christian meditation app)

Branding direction:
NOT marketed as a "Christian app" -- positioned as intentional, encouraging, whole-person wellness
Faith features are present, unapologetic, and front and center -- but not the marketing lead
Tagline direction: "The app that actually cares about you" -- discipline, intentionality, habits, growth
User realizes organically that these values are Christianity. Chick-fil-A model.
Target: people who want the fitness features, discover the faith layer naturally

TikTok strategy:
- Anonymous account for now, no contacts permission, rebrand to app name when locked
- Personal brand style account, not a logo account -- transition to app account at launch
- Interactive series format, not vloggy, not ad-like
- Crowd-sources decisions to build audience investment before launch
- Meme formats mixed in -- best performing content doesn't feel like an ad

Content series ideas:
- Help me name my wellness app (poll sticker, engagement)
- Help me design my wellness app
- Help me pick the color themes
- What features would you actually use
- Would you download this
- Things fitness apps get wrong -- last second cut to yours doing it right
- "This app knows if you had a good day before you do"
- "I built a fitness app that prays for you"
- "What if your fitness app actually knew your why"
- "I built this entire app with AI and I can't code" -- vibe coding angle
- Day X of building a wellness app series

Distribution path:
First target: 200-300 genuinely engaged users
That gets: word of mouth, real feedback, App Store reviews for launch day velocity
Christian community is the warmest early audience -- churches, small groups, Christian fitness influencers
ProductHunt launch when ready
Reddit: r/Christianity, r/fitness, r/selfimprovement -- genuine participation not spam

JOURNAL -- REMAINING FEATURES
Edit entry title (currently only notes and category editable)
Journal icon on Stats tab header -- routes to journal.tsx
Day detail integration -- show journal entries from that day at bottom of day detail screen
Date on entries tappable -- routes to that day's day detail
Long text stress test -- verify 500 word entries format correctly
Multiple entries same day -- verify prayer + gratitude same day display correctly
Search within journal entries (low priority)

AFTER CURRENT PRIORITIES
Faith Journey + Coaching Modes -- build together, same session, they are deeply connected
Onboarding flow -- animated, sets coaching mode and faith journey, "skip for now" not X, returnable from profile
Firebase Auth -- Apple and Google sign in, pre-beta milestone, data migration from AsyncStorage to Firestore
TestFlight setup -- when core features stable, internal testing first

HOME TAB
Features
Net calories display (HIGH) -- rename AFTER BURN to NET, formula: consumed minus active burn
Calorie color scoring -- mode aware (HIGH)
You vs Yesterday card
Streak card -- Bible, workout, calorie streaks (HIGH)
Morning briefing card -- first open of day, customizable slots, faith first, yesterday recap, today targets
Today's Message customization -- scripture rotation manager, personal messages pool, book/chapter/verse picker
Weight log button dim/inactive state -- dim when empty, accent when ready (BUG)
Pull weight from Apple Health -- auto-populate if available, manual entry as fallback

THEME POLISH PASS
Theme preview rows in settings -- SHIPPED. Hardcoded opaque colors per row so they always look correct regardless of active theme.
All themes -- progress bar track color pass
Full theme audit -- all 5 themes x all accent options, every screen, before beta
Shadow pass -- light themes need stronger shadow opacity
Gradient pass -- light themes need more visible gradient range
Tab bar top border -- needs borderTopWidth 0.5 for clear separation from content

STATS TAB
Dedicated session required -- full plan before touching code
Journal icon on stats header -- routes to journal.tsx
Stats calendar color logic -- document exactly what drives green/yellow/red
Stats trend chart polish -- axis labels, more data points, tap for tooltip
Trends section -- active calories, steps, weight, sleep, HRV over selectable time range
Sleep detail page -- full night breakdown, stages, nap logged, HRV, all in one place
Per-metric exclusion UI -- exclude sleep/steps/etc for a day without excluding the full day
Premium vs free data tiers -- non-standard charts as paid features

WORKOUT TAB
Workout tab nested scroll bug -- DraggableFlatList inside ScrollView warning (HIGH)
Workout drag handle -- hit target too small (HIGH)
Workout drag handle -- dead zone before drag triggers (HIGH)
My Programs builder -- name it, assign focus/tags/color per day, save, load (HIGH)
Sessions tab in workout library -- save day's exercise list as named session, load onto any day (HIGH)
Effort score -- smart nudge fires on workout completion, not passive static card
HIIT mode -- Tabata, standard intervals, custom
Workout rest timer between sets
Lifting set tracker with progressive overload

FOOD / LOG TAB
Barcode scanner -- SHIPPED
Meal slot +/- signs to accent color (BUG)
Toast on food remove (BUG)
Food log donut -- thicker ring, macro targets inside when empty
USDA food API speed -- local cache top 500-1000 common foods
Meal slots fully customizable -- rename, reorder, add custom slots (HIGH)
Calorie breakdown by meal -- each slot gets a budget
Recipe builder polish
Long press food log items -- quick action menu

WATER
Custom water amount modal -- drag interaction, .5oz increments, 48oz max, live oz display, tappable numpad with .5 key, KAV, fade in/out, centered
Custom water modal card transparency -- fix to solid card (BUG)
Preset buttons (4) -- keep exactly as is, they are perfect

BUGS OUTSTANDING
Weight log button no dim/inactive state
Sleep score label -- poor sleep showing for near-goal durations, review thresholds
Stats page streaks card -- choppy open animation, fails to reopen after first close
Collapsible card tap targets app-wide -- entire header row should trigger expand/collapse
Custom water modal card transparent background
Weight input flicker -- flickers on 4th consecutive integer and 2nd decimal attempt, known iOS onChangeText limitation, acceptable for now
You vs Yesterday (i) tooltip needed -- weight tie threshold (<=0.3 lbs), net calories win condition (closest to calorie target wins), pace sublabel context

PROFILE TAB
Current weight value -- should use accent color
Water presets -- SHIPPED, saved to profile
Body measurements tracking
Progress photos -- pose overlay ghost camera

SETTINGS
Theme preview rows -- SHIPPED
Default theme -- change to Light, swap Light/Dark order in list
Header icon buttons -- swap outline to filled variants (build standard going forward)

FAITH SYSTEM (planned)
Faith Journey setting: Rooted / Exploring / Not right now
Built together with Coaching Modes in same session
Today's Message card behavior forks by Faith Journey setting
Periodic gentle in-app reminder for Exploring/Not right now users (every 30 days, dismissable, toggleable)

(i) TOOLTIP SYSTEM (HIGH PRIORITY)
Info icon on cards with non-obvious metrics or color coding
One-time modal on tap explaining the metric
Tooltips catalogued in Settings > Help section
Built at time of feature, not after

TOOLTIPS PLANNED
Sleep score -- what the number means, how it's calculated
VO2 Max -- classification ranges by age/sex
Cardio Recovery -- what bpm drop/min means
IF countdown -- how the window is calculated
Calorie color scoring -- what colors mean when built

HELP SECTION IN SETTINGS
Tips and Guides (all tooltips by feature area)
Health Glossary
FAQ
About

BODY / PROGRESS
Body measurements tracking
Progress photos -- pose overlay ghost camera
Camera progress tracker -- timelapse, program milestone integration (30/60/90 day anchors)

POLISH / UX
Micro interactions -- card scale press, progress bar bounce
Empty states -- designed placeholders (HIGH)
Offline first behavior
Daily summary push notification
In-app review prompt
Accessibility -- respect system font size
Day detail screen polish (LOW)
Coaching mode personality

MONETIZATION / FUTURE
Theme monetization -- Light/Dark free, rest paid
Accent color monetization -- TBD
Stats premium tiers -- non-standard charts paid
TestFlight -- internal beta when core features stable
Firebase Auth -- Apple/Google login, pre-beta, data migration from AsyncStorage
Today's Message management UI -- scripture on/off toggle, personal messages CRUD
Weight trend sparkline (LOW)
Language / internationalization (LOW)
Apple Watch companion app (LOW)
iOS home screen widget (LOW)
Animated app icon -- iOS 18 (LOW)
App Store optimization (LOW)

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
No stages case: duration only, capped at 60, shows "duration only" label
Color thresholds: 85-100 green "Well Rested", 70-84 amber "Could Be Better", 0-69 red "Poor Sleep"
Sleep goal pulls from pj_profile sleepGoal field, defaults to 7 if not set
Manual entry vs HealthKit entry scored differently -- review thresholds carefully before changing
Nap tracking: Apple Health tracks naps separately iOS 16+, worth exploring for stats page

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

Testing standard:
Primary theme: Slate with yellow accent
Build on Slate yellow, audit all 5 themes x all accents before marking visual features done
Never assume a bug is theme-specific without confirming on multiple themes

Data/storage decisions:
AsyncStorage keys all defined in instructions
pj_profile now includes sleepGoal field
Firebase Auth planned pre-beta
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
My Programs tab is "Coming Soon" placeholder -- builder coming next session

Sessions system (planned):
Save a day's exercise list as a named Session
Sessions tab in workout library alongside exercises
Star/favorite system for most-used sessions
Load a session onto any day in one tap

Coaching modes:
Discipline -- strict both directions
Balance -- forgiving on low end, strict on high
Mindful -- wide green zone, awareness not numbers
Build with Faith Journey same session

HealthKit currently pulling:
activeCalories, steps, distance, sleepHours, sleepStages, sleepTimes, vo2Max, cardioRecovery
Not yet pulling: weight, HRV, resting HR, blood oxygen, respiratory rate, basal calories

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
Roadmap updated at end of every session -- find/replace format or full rewrite, never raw paste
Instructions updated at end of every session
Any feature, decision, or design direction discussed gets captured before cutting thread
Pin mid-thread ideas and decisions for end-of-session doc updates -- do not wait to be asked
Animation audit must be updated whenever an animation is built or changed

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

Updated after session May 12 2026 (session 11). Running BMR shipped -- profileBmr state loaded from last known weight fallback, runningBmr derived from currentTime (ticks every second), NET formula app-wide updated to consumed - active burn - running BMR. Yesterday net gates at 400 kcal minimum to avoid garbage test data. You vs Yesterday scorebug updated to 0 · 3 · 1 format with TIED column. Tie color matches losing side (textDim, full opacity). Weight tie threshold fixed -- floating point issue resolved with Math.round before compare, threshold set to <= 0.3 lbs. Score bar top line always accent color at 0.7 opacity. Results in countdown below score bar. Net calories sublabel shows weight goal pace (Lose 1 lb / wk pace etc). Weight input validation -- 3 digits max before decimal, 1 decimal place max, flicker on edge cases is known iOS limitation acceptable for now. Active calories intentionally not polled -- tab focus refresh is sufficient, battery concern outweighs benefit.

Updated after session May 12 2026 (session 8). Settings theme preview rows fixed -- hardcoded opaque bg/text/accent per theme row so preview always looks correct regardless of active theme. Extensive review and planning session: full app screenshot audit across all themes, identified shadow/gradient/tab bar border needs, sleep card bugs documented, animation audit list created as living document, number transitions flagged as high priority full-app improvement, contextual achievement toast animations specced (water fill, footprints, etc), first use onboarding moments designed with non-blocking rules, custom water drag modal fully specced (.5oz increments, 48oz max, numpad with .5 key, KAV), AFTER BURN renamed to NET, effort score redesigned as smart contextual nudge on workout completion, marketing and distribution strategy discussed in depth, app name shortlist finalized (Prevail/Steadfast/Worthy/Haven/Witness/Sown, Abide dropped -- already taken), TikTok content strategy mapped out (anonymous account, interactive series, meme formats, crowd-sourced decisions), branding direction locked (Chick-fil-A model -- faith present and unapologetic but not the marketing lead, positions as intentional whole-person wellness app).
