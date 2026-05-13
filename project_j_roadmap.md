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

NOW -- active this session
Bugs -- fix these first

Edit Layout Add button -- deferred. Currently redundant with inline toggle. Will become "browse and discover" entry point when card library grows (30+ cards, categories, premium content). Build out properly then.

Custom water modal card transparent background -- should be solid card.
Sleep score label -- poor sleep showing for near-goal durations, review thresholds.
Head to Head opponent date -- should be textPrimary color, currently accent color.


FatSecret integration -- code complete, pending account activation

OAuth 1.0a signing working (CryptoJS), POST request structure correct, search and barcode wired up. Blocked on FatSecret account being upgraded to Premier Free by James (email sent). Test search the moment account is confirmed upgraded -- no code changes needed. OFF stays in code until FatSecret passes all three gate checks.

(i) Tooltip system -- build as infrastructure first

Build tooltip system as foundational infrastructure. Info icon on cards, one-time modal on tap, catalogued in Settings > Help. Every future feature drops tooltips in at build time, never retrofit.

Sleep -- close the loop

Sleep card fixes -- duration math (7h57m showing as 8h0m), poor sleep label threshold, donut on manual entry, manual save validation (toast error if bed/wake not both filled), clear button alignment.
Sleep history persistence -- verify last night's Apple Health sleep saved correctly to AsyncStorage and shows in day-detail and head-to-head.

Verify and close

Macro bars + food log donut animated -- quick verify, either mark done or fix.
Day Detail screen -- needs fade transition wired in _layout.tsx. Currently pops with no animation.
Weight input flicker -- known iOS limitation, acceptable. Close this bug.


SOON -- confirmed next few sessions
Food and barcode

Custom water amount modal -- drag interaction, .5oz increments, 48oz max, live oz display, tappable numpad with .5 key, KAV, fade in/out, centered. (top of SOON)
Save New Food to Library -- full macro fields in proper modal, not just name + calories. (top of SOON)
Favorites bug -- identical food names share favorite state, both toggle together. Reassess after FatSecret.
Barcode scanner cooldown -- SVG arc animation has rendering bug past 180 degrees. Reassess after FatSecret -- remove cooldown entirely if FatSecret covers barcodes well, keep only as OFF fallback.
Barcode override unset -- food detail page Remove button with Alert warning. Reassess after FatSecret.
Barcode-to-My-Food assignment -- link barcode permanently to manually built food. Reassess after FatSecret.
Meal slots fully customizable -- rename, reorder, add custom slots. (HIGH)
Calorie breakdown by meal -- each slot gets a budget.

Workout

Today's Training empty/rest day states -- encouragement on unassigned day, acknowledgment on rest day.
Effort score -- smart nudge on workout completion, visual polish on buttons with proper selected state.
Workout notes -- KAV fix (keyboard covers field), dim/inactive save button, wire to journal as workout category.
My Programs builder -- name it, assign focus/tags/color per day, save, load. (planned, not yet built)
Workout tab nested scroll bug -- DraggableFlatList inside ScrollView warning. (HIGH)
Workout drag handle -- hit target too small + dead zone before drag triggers. (HIGH)

Home and stats

Food log donut -- thicker ring, show macro targets inside when empty instead of "no data".
Weekly calorie bar chart -- 7 day bars macro color stacking, today highlighted, PocketScale style. (HIGH)
Stats page revamp -- dedicated session, consolidation, pagination, sleep detail page, per-metric exclusion UI.
Day detail dedicated polish session -- full feature audit, polish pass, decision on what stays/goes.
Streak card -- Bible, workout, calorie streaks. (HIGH)
Morning briefing card -- first open of day, faith first, yesterday recap, today targets.

Faith and Bible

Bible auto-scroll to verse -- auto-center highlighted verse when opening from Today's Message. (very soon)
Achievement toast improvements -- tappable routes to achievements page, trigger context under name, wording update before App Store launch.

Process and infrastructure

(i) Tooltip planned coverage: sleep score, VO2 Max, cardio recovery, IF countdown, calorie color scoring.
Help section in Settings -- Tips and Guides, Health Glossary, FAQ, About.

App name -- finalize from shortlist (Prevail, Steadfast, Worthy, Haven, Witness, Sown), verify App Store + TikTok handle availability before committing.
TestFlight -- setup, App Store Connect, tester invite flow.
Firebase Auth -- Apple/Google login, pre-beta requirement, data migration from AsyncStorage.

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
Faith system -- build all together in one session, deeply connected

Faith Journey setting: Rooted / Exploring / Not right now
Coaching Modes: Discipline / Balance / Mindful
Today's Message card behavior forks by Faith Journey setting
Periodic gentle reminder for Exploring/Not right now users (every 30 days, dismissable, toggleable)
Calorie color scoring -- mode aware, stub default to Balance
Coaching mode personality
Gratitude before meals -- one tap give thanks before logging, unapologetically Christian
Faith-based fasting -- intentional spiritual fasting with prayer log, separate from 16:8 IF
Weekly body stewardship reflection -- gentle faith-based weekly prompt, never preachy
Onboarding flow -- animated, sets coaching mode and faith journey, "skip for now" not X, returnable from profile

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
Pull weight from Apple Health -- auto-populate if available, manual entry as fallback
Offline first behavior
Daily summary push notification
In-app review prompt
Accessibility -- respect system font size
Excluded dates -- design and placement, neutral dim dot on calendar, excluded list view. Revisit during stats revamp.
Notification center -- bell icon in profile header, badge on new notifications, real-time toasts for Health sync events

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

Water goal crossed -- water fill animation on the bar itself
Step goal crossed -- footprint or walking animation on bar
Streak milestone -- 7 day and 30 day deserve distinct moments beyond standard toast

Interaction Polish:

Effort score selection -- punchy scale up with haptic on tap
Exercise checkoff -- more satisfying checkmark animation
Weight log confirmed -- number ticks to new value
Day selector -- active day card subtle pulse or glow
Water preset buttons -- bar bounces on update

Tab Transitions:

Log tab -- food item drops in on enter
Workout tab -- weight plates slide on enter
Stats tab -- bars grow up on enter
Subtle, not distracting, fits the tab content

Streak and Milestone Moments:

7 day streak -- distinct animation beyond toast
30 day streak -- bigger moment, close to achievement toast tier
Goal weight hit -- biggest non-platinum celebration moment

First Use Moments (non-blocking, one-time only):

First calorie logged
First workout checked off
First verse read
First water goal hit
First step goal hit
Rules: never halts user flow, never repeats, subtle enough that missing it is not a loss, fires alongside the action not instead of it


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
Food database decisions:
FatSecret Premier Free is primary -- Consumer Key and Secret held by Justin, OAuth 1.0a signing required
USDA dropped permanently -- garbage results for branded foods
OFF stays as fallback only until FatSecret passes all three gate checks, then removed entirely
Barcode override system: pj_barcode_overrides AsyncStorage key, local first, Firebase community database phase 2
You vs Yesterday decisions:
Water and steps: exact integer comparison only, no threshold or buffer
Weight: 0.3 lb fuzzy threshold (floating point rounding)
Net calories: closest-to-target wins
All other metrics: straight greater/less than/equal
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
My Programs tab is "Coming Soon" placeholder -- planned, not yet built
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
Marketing decisions:
App name shortlist: Prevail, Steadfast, Worthy, Haven, Witness, Sown. Dropped: Abide (taken by existing Christian meditation app).
Branding: NOT marketed as a "Christian app" -- positioned as intentional whole-person wellness. Faith present and unapologetic but not the marketing lead. Chick-fil-A model.
Tagline direction: "The app that actually cares about you"
TikTok: anonymous account for now, interactive series format, crowd-sourced decisions, meme formats mixed in