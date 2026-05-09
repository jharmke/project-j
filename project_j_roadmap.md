DONE -- SHIPPED
[x] Home card customization -- drag, reorder, show/hide, edit sheet slides up over home screen, dims behind
[x] Card registry system -- CARD_REGISTRY at top of index.tsx, adding future cards is one line
[x] Macro bars -- stacked horizontal bars replacing donut on home tab, animated, vs goal
[x] Macro colors -- desaturated across home and log tabs (Protein #0d9268, Carbs #c47d1a, Fat #a83232)
[x] GestureHandlerRootView fix in _layout.tsx
[x] Fitness Metrics no-data placeholder
[x] Edit layout sheet -- slides up over home screen, dims behind, stays on tab, Add/Done header
[x] Three header buttons -- refresh, calendar, grid (all matching style)
[x] DraggableFlatList in edit sheet -- same library as workout tab
[x] Card visibility persisted to pj_settings -- survives app restarts
[x] MacroBar component -- extracted to fix hooks-in-map error
[x] Verse card in registry -- default on, fully optional, can be reordered or hidden
[x] GitHub repo connected -- https://github.com/jharmke/project-j
[x] Token/theme system -- theme.tsx, ThemeProvider wired to root layout
[x] All 5 themes built -- Dark, Light, Slate, Warm, Blush
[x] Theme selector UI in settings -- live and working
[x] All main screens tokenized -- index, log, workout, stats, profile, settings
[x] CustomTabBar -- fully themed, responds to theme changes
[x] Tab bar pill fix -- visible on light and blush themes
[x] Background gradient -- all tabs, tokens in theme.tsx, LinearGradient implemented
[x] Card shadows -- depth and elevation on all tabs
[x] Tab fade transition -- replaces default slide
[x] Card icons -- Ionicons on all home screen cards
[x] Today's Training card -- combined workout summary + calories burned, replaces old workout card
[x] Calories burned removed from workout tab
[x] Text contrast bump -- textDim #555570 to #666680
[x] Card label size bump -- fontSize 9 to 10 across all tabs
[x] Blush gradient strengthened -- gradientStart #f0c0cc
[x] Collapsible settings sections -- added to roadmap for future

SESSION PRIORITY -- DO FIRST

 GitHub repo setup -- private repo, push codebase (DONE)
 Claude Project setup -- create project, paste instructions doc, upload roadmap (DONE)
 Token/theme system -- theme.tsx, all colors as tokens (DONE)
 Light theme -- free tier (DONE)
 Dark theme -- current colors formalized as tokens (DONE)
 Midnight, Slate, Warm, Blush preset themes -- paid tier (DONE, Midnight dropped, 4 themes shipped)
 Accent color options per theme -- paid feature


HOME TAB
Visual

 Background gradient polish -- dark theme gradient could be stronger, currently subtle (LOW)
 Card depth/shadows -- iOS shadow properties, cards float above background (DONE)
 Text contrast pass -- muted text bumped, card labels larger (DONE)
 Progress bar track color -- currently too dark, bring to #252535 minimum
 Card icons -- Ionicons next to each card label (DONE)

Animations

 Sleep donut draw-on animation -- fills clockwise on load
 Number counters animating up on load -- calories, steps, water count up from 0
 IF countdown digit roll animation
 Water ripple fill animation
 Weight odometer tick
 Calorie color smooth transition
 Card shimmer/sheen -- subtle light-hitting-glass effect
 Verse card glow -- slow golden breathing glow effect (HIGH)
 Tab bar pulse/bloom on tap
 Goal hit animations -- water, steps, calories celebration moment (HIGH)
 Streak numbers animating up on stats load
 Animation standard -- ALL bars and graphs animate, non-negotiable (DONE)

Features

 Macro goals -- wire protein/carbs/fat targets to pj_profile (HIGH)
 Water bar reset fix -- bar must not reset to 0 when logging mid-day (HIGH)
 Net calories display -- consumed minus burned (HIGH)
 Calories burned -- dedicated display in Today's Training card (DONE)
 Calorie card + Log button -- rethink or replace
 Calorie color scoring -- mode aware (HIGH)
 Weight carry-forward -- show last known weight instead of -- when none logged today
 Sleep goal field in profile
 Sleep quality score -- weighted algorithm, score 0-100 in donut center (HIGH)
 You vs Yesterday card -- live pacing comparison, optional home card
 Streak card on home -- Bible, workout, calorie streaks (HIGH)
 Auto date rollover -- AppState listener, detect midnight (HIGH)
 Home screen date navigator -- editing for select fields
 Pull to refresh -- replace refresh header button (HIGH)
 One-time first-launch pull-to-refresh tooltip


THEME POLISH PASS

 Slate theme -- background should be grey base, blue as accent not base tone. Needs its own identity
 Blush theme -- bgCard needs to be slightly darker, blending too much with background. Water buttons need differentiation, pink on pink doesn't work
 Blush save button on profile -- darker background, shadow, or thicker border
 All themes -- progress bar track color pass
 Accent color options per theme -- paid feature
 Theme selector UI polish
 Collapsible sections in settings page -- accordion pattern


STATS TAB

 Stats calendar color logic -- read and document exactly what drives green/yellow/red
 Stats trend chart polish -- axis labels, more data points, tap for tooltip
 More trend data -- body measurements, sleep trends
 Streak numbers animating up on stats load


WORKOUT TAB

 Workout tab nested scroll bug -- DraggableFlatList inside ScrollView warning, needs refactor (HIGH)
 Workout drag handle -- hit target too small (HIGH)
 Workout drag handle -- dead zone before drag triggers (HIGH)
 Workout tag system -- multiple tags per day, fully custom names and colors, color picker or palette, managed from settings. Replaces hardcoded Push/Pull/Legs/Cardio. Pills wrap naturally, no limit. (HIGH)
 HIIT mode -- Tabata, standard intervals, custom
 Workout rest timer between sets
 Lifting set tracker with progressive overload
 Apple Workouts backfill -- last 7 days on first setup


FOOD / LOG TAB

 Barcode scanner bug fix -- camera session not tearing down properly (HIGH)
 USDA food API speed -- local cache of top 500-1000 common foods
 Meal slots fully customizable -- rename, reorder, add custom slots (HIGH)
 Calorie breakdown by meal -- each slot gets a budget
 Cronometer style nutrition log redesign
 Recipe builder polish
 Long press food log items -- quick action menu


EXERCISE LIBRARY

 Exercise library keyboard blocking (HIGH)
 Exercise library -- custom exercises, favorites, recents


FAITH FEATURES

 Bible reader -- local JSON bundle, WEB or ASV public domain (HIGH)
 Morning intention / prayer feature
 Prayer log
 Bible streak tracking
 Custom streaks


PROFILE / SETTINGS

 Settings page expansion -- font size, notifications, coaching mode, units, theme selector
 Collapsible sections in settings -- accordion pattern
 FAQ / help section (LOW)
 BMR/TDEE calculator polish


ONBOARDING

 Onboarding flow -- animated, sets the tone (HIGH)
 Coaching mode selector -- Discipline / Balance / Mindful


BODY / PROGRESS

 Body measurements tracking
 Progress photos -- pose overlay ghost camera


POLISH / UX

 Toast system -- water logged, food logged, workout saved (HIGH)
 Micro interactions -- card scale press, progress bar bounce
 Page transitions between tabs -- done, fade transition shipped
 Empty states -- designed placeholders not blank cards (HIGH)
 Offline first behavior
 Daily summary push notification
 In-app review prompt
 Accessibility -- respect system font size
 Day detail screen polish (LOW)
 Coaching mode personality


MONETIZATION / FUTURE

 Theme monetization -- Light/Dark free, rest paid
 Weight trend sparkline (LOW)
 Language / internationalization (LOW)
 Apple Watch companion app (LOW)
 iOS home screen widget (LOW)
 Animated app icon -- iOS 18 (LOW)
 App Store optimization (LOW)


NOTES AND DECISIONS
Workout tag system (new):
Multiple tags per day, fully custom names and colors. Color picker or preset palette. Managed from settings. Replaces hardcoded Push/Pull/Legs/Cardio type system. Pills display on Today's Training home card, wrap naturally with no enforced limit. Tag ids stored as array on each day in workout state.
Today's Training card:
Combined workout summary and calories burned. Shows day type pill, exercise list capped at 4 with "+X more" overflow, done/undone state with strikethrough, calories burned from HealthKit or manual fallback. Tapping card navigates to workout tab with smooth fade. Replaces both old workout card and calories burned card.
Coaching modes:

Discipline -- strict both directions
Balance -- forgiving on low end, strict on high
Mindful -- wide green zone, awareness not numbers

Theme presets:

Dark (current) -- free
Light -- free
Slate (cool grey, navy accent) -- paid, needs identity rework
Warm (dark browns, amber) -- paid
Blush (Megan's deep dusty rose) -- paid, needs bgCard darkening and water button fix

Bible translation:
WEB or ASV, both public domain and bundleable locally.
Sleep quality score:
Score 0-100: Duration 0-40pts, Deep % 0-30pts, REM % 0-30pts. Labels: 93-100 Excellent, 75-92 Good, 55-74 Fair, below 55 Poor.
Progress photo pose overlay:
First photo becomes transparent ghost on camera viewfinder for subsequent photos.
Animation standard:
Every bar, progress indicator, chart must animate. Non-negotiable. No static bars ever.
GitHub:
Repo: https://github.com/jharmke/project-j
Branch: master
End of session commit: git add . / git commit -m "description" / git push origin master
Process:

Every change gets a verdict before moving on
Start new threads when current one gets long
New threads always inside the Claude Project
Roadmap updated at end of every session