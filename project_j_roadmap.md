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
[x] journal.tsx -- journal screen, categories, FAB, filter pills, edit, swipe delete (bugs outstanding)
[x] _layout.tsx -- bible and journal routes added
[x] Reflection banner on Bible screen -- accent colored, routes to journal
[x] pj_bible_reflections -- merged entry format with id, category, title, notes
[x] Journal rewrite -- SwipeableEntry top-level component, animations fixed, swipe delete working
[x] Full KJV Bible -- all 66 books, fetch + cache per book, raw GitHub source (aruljohn/Bible-kjv)
[x] Bible verse tap-to-highlight -- any verse tappable, Reflect/View Reflection button, swaps instantly on verse tap
[x] KJV verse rotation -- all 52 preset verses updated to KJV
[x] Today's Message label -- renamed from Today's Verse throughout (card label + registry)
[x] Sleep score 0-100 in donut center -- replaces moon icon, score-driven color, labels Well Rested/Could Be Better/Poor Sleep
[x] Sleep score algorithm -- Duration 40pts (vs sleep goal), Deep % 30pts (peak 20%), REM % 30pts (peak 22%)
[x] Sleep tips -- contextual daily-rotating tips below stage breakdown, 4 categories, seeded by date
[x] Sleep goal in profile -- scroll-driven wheel picker, auto-positions to current value, saves to pj_profile sleepGoal
[x] Floating save bar on profile -- animates up on change, away on save, never shows on fresh load
[x] Toast on profile save

JOURNAL -- REMAINING FEATURES
Edit entry title (currently only notes and category editable)
Journal icon on Stats tab header -- routes to journal.tsx
Day detail integration -- show journal entries from that day at bottom of day detail screen
Date on entries tappable -- routes to that day's day detail
Long text stress test -- verify 500 word entries format correctly
Multiple entries same day -- verify prayer + gratitude same day display correctly
Search within journal entries (roadmapped, low priority)

NEXT SESSION PRIORITY (in order, do not deviate)
1. Home tab bugs -- IF countdown text color, Slate IF buttons, weight card colors, meal slot + signs, water/food remove toasts, edit layout sheet choppy
2. IF card daily reset bug -- card shows yesterday's start time and data, needs to reset each day like all other cards
3. Workout tag system -- custom tags, color picker, pills on Today's Training card
4. Net calories + calorie color scoring
5. Barcode scanner fix

AFTER NEXT SESSION
Faith Journey + Coaching Modes -- build together, same session, they are connected
Stats tab dedicated session -- full plan before touching code, charts/graphs, premium vs free data tiers
Onboarding flow -- animated, sets coaching mode and faith journey, "skip for now" not X, returnable from profile
Firebase Auth -- Apple and Google sign in, pre-beta milestone, data migration from AsyncStorage to Firestore
TestFlight setup -- when core features stable, internal testing first

HOME TAB
Visual
Background gradient polish -- dark theme could be stronger (LOW)
Progress bar track color pass -- #252535 minimum
Animations
Number counters animating up on load
IF countdown digit roll animation
Water ripple fill animation
Weight odometer tick
Calorie color smooth transition
Goal hit celebrations -- water, steps, calories (HIGH)
Features
Net calories display (HIGH)
Calorie color scoring -- mode aware (HIGH)
You vs Yesterday card
Streak card -- Bible, workout, calorie streaks (HIGH)
Auto date rollover -- AppState listener + midnight timer, both triggers (HIGH) -- currently data does not reset at midnight, user noticed this in real use
Morning briefing card -- first open of day, customizable slots, faith first, yesterday recap, today targets, coaching voice line
Today's Message customization -- scripture rotation manager, personal messages pool, book/chapter/verse picker pulling from bible-web.ts, preview matches card exactly
Weight log button dim/inactive state -- dim when empty, accent when ready (BUG)
Pull weight from Apple Health -- auto-populate if available, manual entry as fallback

THEME POLISH PASS
Warm theme button in settings -- same display bug as light theme tile
Light theme tile goes grey on dark/warm mode in theme selector (BUG)
Warm theme -- still rough, needs lighter caramel overhaul
All themes -- progress bar track color pass
Full theme audit -- all 5 themes x all accent options, every screen, before beta

STATS TAB
Dedicated session required -- full plan before touching code
Journal icon on stats header -- routes to journal.tsx
Stats calendar color logic -- document exactly what drives green/yellow/red
Stats trend chart polish -- axis labels, more data points, tap for tooltip
Trends section -- active calories, steps, weight, sleep, HRV over selectable time range (like Apple Health)
More trend data -- body measurements, sleep trends
Streak numbers animating up on stats load
Premium vs free data tiers -- non-standard charts/graphs as paid features

WORKOUT TAB
Workout tag system -- custom tags, color picker, replaces Push/Pull/Legs/Cardio, pills on Today's Training (HIGH, NEXT SESSION)
Workout tab nested scroll bug -- DraggableFlatList inside ScrollView warning (HIGH)
Workout drag handle -- hit target too small (HIGH)
Workout drag handle -- dead zone before drag triggers (HIGH)
HIIT mode -- Tabata, standard intervals, custom
Workout rest timer between sets
Lifting set tracker with progressive overload
Apple Workouts backfill -- last 7 days on first setup
Estimated calories for manual workouts -- MET formula using height/weight/age/sex from profile, intensity selector (light/moderate/vigorous), shown with "estimated" label

FOOD / LOG TAB
Barcode scanner bug fix -- camera session not tearing down (HIGH)
Meal slot + signs to accent color (BUG)
Toast on food remove (BUG)
USDA food API speed -- local cache top 500-1000 common foods
Meal slots fully customizable -- rename, reorder, add custom slots (HIGH)
Calorie breakdown by meal -- each slot gets a budget
Recipe builder polish
Long press food log items -- quick action menu

BUGS OUTSTANDING
IF countdown timer text black across all themes
Slate IF method buttons bright white
Weight card colors off -- varies by theme
Toast on water remove
Edit layout sheet laggy/choppy open and close
Weight log button no dim/inactive state
IF card shows yesterday's start time and data on new day -- needs daily reset

FAITH FEATURES
Bible reader -- SHIPPED
Journal -- SHIPPED
Full KJV Bible -- SHIPPED
Bible verse tap-to-highlight + reflect -- SHIPPED
Scripture rotation picker -- book/chapter/verse navigator, pulls from bible-web.ts, preview matches card, confirm gated on valid selection
Faith Journey setting -- three tiers: Rooted, Exploring, Not right now. Periodic gentle in-app reminder for Exploring/Not right now. Toggleable reminder off in settings.
Faith Journey + Coaching Modes -- build together same session
Morning intention / prayer feature
Custom streaks -- pick Ionicon or emoji, name it, track it
Bible streak -- user creates via custom streak system, no preset
Reading plans -- M'Cheyne, chronological, NT in a year (phase 2)
Long press verse in Bible to create study reflection (roadmapped)
Journal icon on Stats tab header (noted, not done)

HEALTH / FITNESS METRICS
HealthKit expansion -- weight, HRV, resting heart rate, walking HR average, blood oxygen SpO2, respiratory rate, basal calories
Fitness metrics card expansion -- resting HR, HRV, blood oxygen, live heart rate
HRV display -- needs personal baseline, 30-day average, color coded against own baseline, not just raw number
(i) info bubbles -- on every metric that needs explanation. One tap shows inline tooltip (2-3 sentences). Tooltip has "Learn more" link. Tapping learn more opens detail sheet with full explanation, ranges, how to improve. Built at time of feature, never after.
Health glossary -- all metrics defined, searchable, organized by feature area, accessible from (i) bubbles and settings
Personalized health ranges -- age/sex/fitness level context, visual range bar with user's bracket highlighted, demographic data pulled from profile. Accurate ranges only, disclaimer required.

PROFILE / SETTINGS
Settings collapsible categories -- Display, Health, Faith, Notifications, Account
Move relevant profile fields to appropriate settings categories
Faith Journey setting -- lives in profile, returnable from onboarding
Coaching mode selector -- Discipline/Balance/Mindful -- build with Faith Journey
BMR/TDEE calculator polish
Sleep goal field in profile -- SHIPPED

ONBOARDING
Onboarding flow -- animated, sets the tone (HIGH)
Two key questions: Coaching mode + Faith Journey
"Skip for now" button not X on every screen
"You can update this anytime in your profile" shown on every screen
Profile/settings has section to re-run or edit any onboarding answer individually
First use tooltips fire after onboarding completes

HELP SYSTEM
First use tooltips -- unique AsyncStorage key per tooltip, fires once per install, all tooltips catalogued in Help section
Help section in settings -- Tips and Guides (all tooltips by feature area), Health Glossary, FAQ, About
Tooltips come back on reinstall -- correct behavior, no cloud sync needed for tooltip state

BODY / PROGRESS
Body measurements tracking
Progress photos -- pose overlay ghost camera

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
Today's Message management UI -- scripture on/off toggle, personal messages CRUD, rotation preference
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
Categories: verse, prayer, study, personal, gratitude
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
KJV translation in use throughout -- public domain, standard English names, universally recognized
Full 66 books via aruljohn/Bible-kjv on GitHub, fetched at runtime, cached per book in AsyncStorage
Cache key format: pj_bible_{BookName}_{chapterNum}
Entire book cached on first chapter open, subsequent chapters in same book are instant
bible-web.ts contains book/chapter metadata skeletons + fetchChapter async function
52 preset rotation verses updated to KJV to match reader text
Bible verse highlight + reflect decisions:
  Tap any verse to highlight it. Highlighted verse is the active verse for reflection.
  Reflect / View Reflection button visible whenever a verse is highlighted.
  Button state driven by whether highlighted verse already has a reflection saved today.
  Button swaps instantly on verse tap.
  Today's daily verse is default highlight on load, not locked in.
  Whatever verse is highlighted when Reflect is tapped is what gets saved.
  Journal entry category stays 'verse' -- no storage changes needed.
  Amber highlight opacity 0.5 -- strong and visible.

Sleep score decisions:
Score 0-100 displayed in donut center replacing moon icon
Algorithm: Duration 40pts (sleepHours/sleepGoal * 40, capped at 40) + Deep % 30pts (peak at 20%, bell curve) + REM % 30pts (peak at 22%, bell curve)
No stages case: duration only, capped at 60, shows "duration only" label
Color thresholds: 85-100 green "Well Rested", 70-84 amber "Could Be Better", 0-69 red "Poor Sleep"
Sleep goal pulls from pj_profile sleepGoal field, defaults to 7 if not set
Tips: 4 categories (low_deep, low_rem, low_duration, catch_all, good), 3 tips each, seeded by date so consistent within a day
Sleep goal in profile uses scroll-driven wheel picker, 15-minute increments, auto-scrolls to current value on open

Build standards (all non-negotiable, built at time of feature):
Three gate rule -- works, looks premium, feels right
Dim/inactive button states on all submittable buttons
44x44pt minimum touch targets
Disclaimer on all health features
Haptics standard -- light/medium/heavy
Animation standard -- expand/collapse uses off-screen measure + dual animation pattern (see journal.tsx SwipeableEntry). Never use maxHeight. Container height on JS thread (useNativeDriver: false), content opacity/translateY on native thread (useNativeDriver: true).
Card press scale -- down to 0.97 on pressIn, back to 1.0 on pressOut
Empty states on all lists and cards
Loading states on async operations
Error states on fallible operations
First use tooltips catalogued in help section
Input validation before storage
Toast on save -- any screen with a save action fires a toast confirmation on successful save. No silent saves. Toast text: '[Thing] saved' with success type. Built at time of feature, never after.
Floating save bar -- any settings or profile screen with editable fields uses floating save bar instead of static button. Animates up when hasChanges is true, away on save or when all fields reverted. Never visible on fresh load. Sits above custom tab bar (bottom: 0, tab bar renders on top via navigator z-order). Reference implementation: profile.tsx.

Testing standard:
Primary theme: Slate with yellow accent
Build on Slate yellow, audit all 5 themes x all accents before marking visual features done
Never assume a bug is theme-specific without confirming on multiple themes

Data/storage decisions:
AsyncStorage keys all defined above
pj_profile now includes sleepGoal field (string, hours as decimal e.g. "7.5")
Firebase Auth planned pre-beta -- Apple and Google sign in
Data migration from AsyncStorage to Firestore per user when Auth is built
Dev reset/export -- pin, build only if needed before TestFlight

Macro goals system:
Two modes - Ratio and Fixed. Cross-mode sync on save.

Workout tag system (planned):
Custom names, colors, multiple per day. Color picker or preset palette. Settings managed. Replaces Push/Pull/Legs/Cardio. Pills on Today's Training card.

Coaching modes:
Discipline -- strict both directions
Balance -- forgiving on low end, strict on high
Mindful -- wide green zone, awareness not numbers
Build with Faith Journey same session

Morning briefing card:
First open of day only
Customizable slots -- faith first, yesterday recap, today targets, coaching voice
Coaching voice line varies by mode
Faith Journey setting affects what faith slots show

HealthKit currently pulling:
activeCalories, steps, distance, sleepHours, sleepStages, sleepTimes, vo2Max, cardioRecovery
Not yet pulling: weight, HRV, resting HR, blood oxygen, respiratory rate, basal calories

Estimated workout calories:
MET formula: Calories = MET x weight kg x duration hours
Intensity selector adjusts MET value
Shown with "estimated" label, not from heart rate monitor

Today's Message card:
Renamed from "Today's Verse" -- done. Card label shows "TODAY'S MESSAGE", registry label "Today's Message".

GitHub:
Repo: https://github.com/jharmke/project-j
Branch: master
End of session: git add . / git commit -m "description" / git push origin master

Process:
Commit after every gate-passing feature not just end of session
Three gate rule before marking anything done
One feature at a time, no parallel half-builds
Polish pass rule -- no new major feature until last one has zero open bugs
Start new threads when current one gets long
New threads always inside the Claude Project
Roadmap updated at end of every session
Screenshot before and after every visual change
If a find/replace is wrong or needs to be walked back mid-response, mark it with a large visible warning header before continuing. Format: # ⚠️ STOP — DO NOT APPLY THE CHANGE ABOVE
Mid-response correction standard: if a find/replace is written and then recognized as wrong before the response ends, the warning header goes on IMMEDIATELY before any further text -- even if the correction immediately follows. No exceptions. Hard to miss is the requirement.