# Project J -- Claude Code Instructions

## CRITICAL RULES -- READ FIRST
- Always confirm with Justin before making any file changes, no exceptions
- After Justin states the task, restate it and wait for explicit go-ahead before touching anything
- Before any change, assess impact on other features and flag risks. Never make a change that could damage another feature without explicit confirmation
- One change at a time, confirmed working before moving to the next
- If uncertain about anything, stop and ask. Never guess and proceed
- Remind Justin to commit to git before every session starts
- After every completed feature, recommend a git commit
- Never make multiple related changes at once without confirmation between each
- 2 attempts max on any bug or problem. If not resolved, stop and explain what you know and what you need

## DATA INTEGRITY -- NON NEGOTIABLE
Justin has real logged data in the app. Food entries, workout history, weight logs, journal entries, achievements -- all real and irreplaceable. No code change, migration, or storage operation may ever wipe, reset, or wholesale overwrite any pj_* AsyncStorage key. Always read-then-merge, never replace from scratch. Verify any AsyncStorage change is safe before executing. Losing Justin's data is an unacceptable failure, full stop.

## What This Is
React Native + Expo fitness and faith app. Think MyFitnessPal meets YouVersion meets a personal coach. Faith integration + "you vs yesterday" philosophy. Building to ship on the App Store.

Christian app by default. Faith features on for all users out of the box. Non-faith users can adjust Faith Journey setting but app does not hide or apologize for its faith identity.

Branding: NOT marketed as a "Christian app." Positioned as intentional, encouraging, whole-person wellness. Chick-fil-A model -- user realizes organically.

Read project_j_roadmap.md at the start of every session before touching anything. Parked/future items live in project_j_backlog.md -- read only when planning future sessions.

## Process
- Read project_j_roadmap.md at session start, every session, no exceptions -- but read it TARGETED, not
  whole. The file is ~43KB (~25k tokens) and reading it end to end burns a chunk of the session's usage
  before any work happens. Grep the "⏭️ NEXT UP" and "RECENTLY SHIPPED" headings and read those sections;
  go deeper only when the actual task needs it. Those two sections ARE the session-start read. (Set
  2026-07-16 -- the intent was always "know what's active," never "ingest the whole file.")
  It is the SLIM active roadmap. project_j_roadmap_archive.md is the frozen shipped/fixed history -- read only when you need the story behind a shipped feature. project_j_backlog.md is parked/future items -- read only when planning future sessions
- After Justin states the task, restate it and wait for explicit go-ahead
- "WHAT'S NEXT" = read the "⏭️ NEXT UP" section of project_j_roadmap.md and answer TOP-DOWN from it ([NOW] items first). ALWAYS also offer at least one QUICK WIN from that list, and pull a stale item up from the backlog-by-area / project_j_backlog.md now and then so nothing rots. NEXT UP is the single ranked queue; new small ideas land THERE (ranked), never buried straight into the backlog. When something ships, remove it from NEXT UP and refill from the backlog. (Justin flagged 2026-07-05 that the backlog was where ideas went to die because "what's next" never surfaced them.)
- Update the roadmap in real time the moment anything ships, a bug is found, or a decision is made. Never batch at end of session
- ROADMAP HYGIENE (non-negotiable, this is why it bloated to 368KB before): when something ships, it gets ONE line under "RECENTLY SHIPPED" in project_j_roadmap.md and the detailed post-mortem goes to project_j_roadmap_archive.md the SAME session. NEVER write a long completed-feature writeup into the active roadmap. Keep the active file lean; the archive is where detail accumulates
- After every completed feature, recommend a git commit
- Flag uncertainty explicitly every time -- never state uncertain things as fact

## Communication Style
- Straight talk. Dude/man/brother language fine. Humor encouraged
- No double dash (--) in any user-facing string in the app. Internal docs, roadmap, spec files, code comments, and conversation are all fine. Use a colon, period, or reword in app strings. ~100 existing user-facing instances to clean up eventually.
- No excessive apologies
- Flag uncertainty explicitly every time
- Push back on bad ideas directly -- don't hype something that won't work
- Include the why but keep it tight
- Weave in Biblical perspective where naturally relevant, never forced
- Never assume which theme Justin is on. Primary testing theme is Light with cyan accent

## Terminal
Justin uses PowerShell only. One command at a time, never chained. Always send git commands explicitly one at a time (git add, git commit, git push).

## DON'T BURN JUSTIN'S USAGE -- NON NEGOTIABLE
Every command and file read costs Justin real money. He is on a usage plan and a wasteful session is a
failure, same as a bug. Flagged hard 2026-07-16 after a FAB styling task burned 23% of a session's usage.
- NO full-project `tsc` to check a visual/JSX/styling change. It takes ~40s, costs thousands of tokens, and
  finds nothing Metro doesn't surface the instant Justin reloads. THE RELOAD IS THE CHECK. (A syntax error
  shipped that session anyway; tsc had been run three times and Justin's reload is what caught it.)
- NEVER run tsc twice to "prove" an error was pre-existing. If an error is in code you didn't touch, say so
  and move on. Stash-and-rerun to compare error lists is the single most expensive thing done that session.
- tsc is fine for: real logic/type changes, new utils, anything with actual type surface. Not for styling.
- Grep with a tight window. `-A 14` / `-C 10` on a multi-hit search dumps hundreds of lines into context.
  Default to no context, then read the ONE hit that matters.
- Read the part of a big file you need (offset/limit or Grep), not the whole thing.

## EAS Build
Three profiles in eas.json. Do not mix them up -- this caused a real mistake on 2026-07-18 (submitted the
wrong profile, it doesn't produce a store-type artifact, `eas submit` couldn't find it).
- **development**: `eas build --profile development --platform ios` -- dev-client build for Justin's OWN
  device only. Installed via QR/direct link (internal distribution), connects to Metro for live JS reload.
  Use this to test code changes on-device during a session. Cannot be submitted to TestFlight.
- **production**: `eas build --profile production --platform ios` -- store-distributable build (no dev
  client, no Metro dependency). This is the ONLY profile `eas submit` can upload to App Store Connect.
  Use this specifically when pushing a build to the TestFlight test group.
- **preview**: exists in eas.json (internal distribution, no dev client) but isn't part of the normal
  workflow above -- confirm with Justin before using it for anything.

PUSHING TO TESTFLIGHT = two commands, in this order:
1. `eas build --profile production --platform ios`
2. `eas submit --platform ios` (matches the `submit.production` profile already in eas.json)

If git errors on a build: run $env:EAS_NO_VCS=1 first, then retry the build command.
New native packages or new HealthKit permissions require a new DEVELOPMENT build to test on-device.
Pure JS changes never need a rebuild -- Metro/live reload picks them up on the existing dev-client build.

## Tech Stack
React Native + Expo (EAS dev build, NOT Expo Go)
Firebase Firestore + AsyncStorage
HealthKit via @kingstinct/react-native-healthkit + react-native-nitro-modules
react-native-reanimated for animations
react-native-draggable-flatlist for drag and drop
expo-haptics for haptic feedback
react-native-svg for charts and donuts
crypto-js + @types/crypto-js for HMAC-SHA1 OAuth 1.0a signing (FatSecret API)
DM Sans + Bebas Neue fonts
Ionicons throughout (@expo/vector-icons)
EAS bundle ID: com.jharmke.projectj, Team: 8A8F5933RX

## File Structure
app/(tabs)/index.tsx -- Home screen
app/(tabs)/workout.tsx -- Workout tab
app/(tabs)/log.tsx -- Food log tab
app/(tabs)/stats.tsx -- Stats tab
app/(tabs)/profile.tsx -- Profile tab
app/(tabs)/faith.tsx -- Faith tab
app/(tabs)/_layout.tsx -- Tab layout (Tabs navigator + CustomTabBar)
app/_layout.tsx -- Root layout (fonts, providers, Stack)
app/sign-in.tsx -- Sign in / auth screen
app/settings.tsx -- Settings screen
app/add-food.tsx -- Add food screen
app/food-detail.tsx -- Food detail screen
app/recipe-builder.tsx -- Recipe builder
app/recipe-log.tsx -- Recipe log
app/workout-library.tsx -- Workout library
app/day-detail.tsx -- Day detail screen
app/day-summary.tsx -- Day summary screen
app/weekly-summary.tsx -- Weekly summary screen
app/monthly-summary.tsx -- Monthly summary screen
app/diagnostic-report.tsx -- Effort vs Results diagnostic report
app/diagnostic-report-view.tsx -- EvR report viewer
app/bible.tsx -- Bible reader screen
app/journal.tsx -- Journal/reflections screen
app/achievements.tsx -- Achievement page
app/head-to-head.tsx -- Head to Head drill-down screen
app/prayer.tsx -- Prayer screen
app/plans.tsx -- Reading plans hub
app/devotional.tsx -- Devotional screen
app/mission.tsx -- Mission screen
app/tutorials.tsx -- Tutorials screen
app/onboarding/profile-setup.tsx -- Onboarding step 1 of 6: profile basics
app/onboarding/style-survey.tsx -- Onboarding step 2 of 6: style survey
app/onboarding/your-style.tsx -- Onboarding step 3 of 6: coaching mode + weight/activity/pace/macros
app/onboarding/faith-journey.tsx -- Onboarding step 4 of 6: faith journey tier
app/onboarding/apple-health.tsx -- Onboarding step 5 of 6: HealthKit opt-in
app/onboarding/notifications.tsx -- Onboarding step 6 of 6: notification opt-in
app/onboarding/all-set.tsx -- Onboarding final screen (the payoff: full bar, no step label)
(commitment.tsx CUT 2026-07-16 -- corny, and being Discipline-only it broke the step count for the
 other two modes. Do not resurrect without a real reason; the mode proves itself by app behavior.)
components/AchievementToast.tsx -- Video game style achievement notification, global emitter pattern
components/CustomTabBar.tsx -- Full custom animated tab bar (TAB_BAR_HEIGHT = 64)
components/PressableButton.tsx -- Animated spring button with haptics
components/Toast.tsx -- Toast system (ToastProvider, ToastItem, ToastRenderer, useToast)
components/TooltipModal.tsx -- Reusable (i) tooltip modal
components/TooltipIcon.tsx -- Reusable (i) icon with pulse animation
components/ToggleSwitch.tsx -- Custom sliding pill toggle, replaces RN Switch everywhere
components/DaySummaryModal.tsx -- Modal version of day summary card
components/DayScoreDisclaimerModal.tsx -- First-use Day Score disclaimer modal
components/ToolkitSheet.tsx -- Toolkit and tutorial launcher sheet
components/TutorialOverlay.tsx -- Tutorial spotlight overlay engine
components/CustomFoodCreator.tsx -- Inline custom food creator component
components/StatsGraphCard.tsx -- Stats tab graph card (add/edit/remove)
components/StatsCardEditModal.tsx -- Stats card edit modal
components/MuscleMap.tsx -- SVG muscle group visualization
components/NutrientDrilldownModal.tsx -- Nutrient detail drill-down modal
components/NutritionGearModal.tsx -- Nutrition display settings gear modal
components/FaithTodayCard.tsx -- Faith Today home card
components/GratitudeStreakCard.tsx -- Gratitude streak card
components/PrayerRequestModal.tsx -- Prayer request submission modal (variant="faith" for amber scheme)
components/PrayerActionModal.tsx -- Prayer action modal
components/AddPrayerModal.tsx -- Add prayer entry modal
components/CompanionFAB.tsx -- AI companion floating action button
components/CompanionChat.tsx -- AI companion chat interface
components/IFCard.tsx -- Intermittent fasting card
components/HeaderAvatar.tsx -- Profile header avatar
components/CelebrationOverlay.tsx -- Goal celebration overlay
components/ReadingPlansCard.tsx -- Bible reading plans card
components/EditSheetContext.tsx -- Edit sheet context provider
data/bible-web.ts -- Full KJV Bible, all 66 books
useHealthKit.ts -- HealthKit hook
(KNOWN LIMITATION, accepted 2026-07-20, not fixable -- do not chase: HealthKit data is scoped to the DEVICE,
 not to any GoodForge account, since Apple Health has no concept of "which app account" a workout/step/etc.
 belongs to. If multiple real GoodForge accounts ever share one physical device, achievements can fire
 based on whichever account happens to be signed in when real Health data syncs, even attributing another
 account's workout to the wrong one. A cooldown/grace-period on account-switch was considered and rejected
 -- it only delays the same collision, it doesn't resolve the underlying ambiguity. Impact is minor and
 self-correcting (never a security/data-loss issue, resolves itself once each account is back on its own
 device) and only relevant when a device is genuinely shared, which is not the normal single-user pattern.)
useTooltip.ts -- AsyncStorage-backed hook, returns seen + markSeen + reset per tooltip key
tooltipRegistry.ts -- Central tooltip definitions. Settings > Help auto-populates from this.
utils/mealSlots.ts -- Meal slot system (MealSlot interface, DEFAULT_MEAL_SLOTS, loadMealSlots, saveMealSlots, getMealDisplayName, findSlotForMeal)
utils/dayScore.ts -- Day Score calculation (composite 0-100, three categories: Nutrition/Activity/Recovery)
utils/sleepScore.ts -- Sleep score calculation
utils/goalHit.ts -- Goal hit detection utilities
utils/weeklySummary.ts -- Weekly summary computation
utils/monthlySummary.ts -- Monthly summary computation
firebaseConfig.ts, workoutData.ts, config.ts

## AsyncStorage Keys
pj_YYYY-MM-DD -- daily data (entries, water, weight, steps, activeCalories, caloriesBurned, sleep fields, IF fields, excluded {diet,water,exercise} = averaging exclusion, sleepTrendExcluded = sleep/recovery-trend-only exclusion)
pj_workout_state -- workout (checks, cardioComplete, programs, workoutNotes, cardioLogs, weeklyTemplate)
pj_my_foods, pj_favorites, pj_recipes, pj_exercise_library
pj_profile -- profile + waterPresets + waterGoal + stepGoal + sleepGoal
pj_settings -- app settings: hapticsEnabled, cardOrder, cardVisible, theme, selectedAccent, workoutTags, styleMode (coaching mode: Discipline/Balanced/Mindful), faithJourney (Rooted/Exploring/NotRightNow), fitnessGoal, macroPreset, healthkitConnected, bibleFontFamily, bibleTextSize, bibleScrollSpeed, mealSlots (MealSlot[] up to 8), slotNameCache (never shrinks)
pj_bible_reflections -- all journal entries
pj_verse_rotation -- shuffled verse rotation order and current index
pj_bible_{BookName}_{chapterNum} -- cached KJV chapter verses
pj_tooltip_{key} -- seen state per tooltip ('true' when dismissed). Reset via dev tools.
pj_streaks -- universal streak data: { gratitude: { currentStreak, totalDays, lastLoggedDate }, savers: { count, earnBaselineStreak, earnBaselineIsActive } }
pj_bible_favorites -- favorited Bible verses
pj_barcode_overrides -- custom barcode-to-food mappings
pj_onboarding_complete -- set after onboarding finishes
pj_healthkit_skip -- set when user taps "Maybe later" on HealthKit opt-in
pj_challenge -- the single active/pending challenge | pj_challenges -- completed challenge history (Past Challenges + Run It Back)
(pj_vs_streak RETIRED 2026-06-18 with the YvY card; replaced by the Challenge home card)
pj_dayscore_disclaimer_seen -- first-use Day Score disclaimer seen state

## Design System
Background: #0d0d0f
Cards: #1a1a24, borderWidth: 0.5, borderColor: rgba(255,255,255,0.06), borderTopColor: rgba(255,255,255,0.1), borderRadius: 14, padding: 16
Card labels: fontSize: 9, letterSpacing: 3, color: #666680, textTransform: uppercase, fontFamily: DMSans_700Bold
Primary text: #e8e8f0
Muted label color: #666680
Muted green: #0d9268
Muted amber: #d4860a
Muted red: #cc3333
Blue interactive: #3b82f6
Input backgrounds: #13131e
Progress bar backgrounds: #12121a
Interactive buttons: backgroundColor: rgba(59,130,246,0.15), borderWidth: 1, borderColor: rgba(59,130,246,0.3), borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, color: #3b82f6, fontSize: 12, fontFamily: DMSans_600SemiBold
Verse card: backgroundColor: #16162a, borderWidth: 1, borderColor: rgba(212,134,10,0.4)
Macro colors: Protein #0d9268, Carbs #c47d1a, Fat #a83232
Tag pills: backgroundColor t.color+'99', borderColor t.color, text color #ffffff -- applies everywhere pills render

## Theme System
Token-based. One theme.ts file. Every component references tokens, never hardcoded hex values.
Themes: Light (free, DEFAULT for new users), Dark (free), Slate, Warm, Blush. Light and Dark are unlocked by default; Slate, Warm, and Blush are earned by completing a short starter challenge. No theme is ever paid.
Default theme is Light. Order in settings: Light, Dark, Slate, Warm, Blush.
Each theme has accent color options. Accents are free: unlocking a theme grants full access to all of its accents.
Testing standard: Justin's primary is Light with cyan accent (he switches accents occasionally). Audit all 5 themes x all accent options before marking any visual feature done.
Theme preview rows in settings: hardcoded opaque bg/text/accent per theme row. NEVER use t.* tokens inside the theme preview loop -- use hardcoded previewBg/previewText/previewAccent/previewAmber maps.

## Visual Philosophy
Goal is premium dark fitness app -- think Whoop, Oura Ring, high end finance app. Should feel like something people pay $15/month for.
- Background gradient must be actually visible. "It's subtle" is never acceptable
- Cards float above background. shadowColor, shadowOffset, shadowOpacity, shadowRadius always. Light themes need stronger shadow opacity
- Data values obviously more prominent than labels
- Text contrast readable at 40% screen brightness. Muted text minimum #8888aa
- Trust Justin's instincts -- when he says something looks off, he is right. Don't defend choices, fix them
- Tab bar must have visible top border (borderTopWidth: 0.5)

## Coaching Modes -- CRITICAL, affects almost every feature
Three modes stored in pj_settings as styleMode:
- Discipline: direct, performance-focused language. Strict color coding, full metrics shown
- Balanced: default middle ground
- Mindful: warm, observational. No judgment language. Weight values textSecondary. Calorie card simplified. You vs Yesterday reframed as neutral. No score bar, no countdown, no net calories

Every new feature must define its Mindful behavior at build time. Ask "does this behave differently in Mindful?" before shipping anything. No backtracking post-ship.

## Faith System
Three Faith Journey tiers stored in profile/settings:
- Rooted: full faith experience. Daily verse, morning intention, prayer log, Bible reader, all features on
- Exploring: faith features present but gentle. Verse shown, no prompts
- Not right now: faith features hidden. Pure fitness experience. No judgment

Faith Journey and Coaching Modes are deeply connected -- build them together.

## Food Database
FatSecret Premier Free is the primary database. OAuth 1.0a signing required per request (crypto-js).
OFF (Open Food Facts) remains in code as fallback only until FatSecret fully confirmed, then removed.
USDA dropped permanently -- garbage results for branded foods.
Barcode override system: pj_barcode_overrides AsyncStorage key.

## Build Standards -- NON NEGOTIABLE

**Three Gate Rule**
No feature is done until it passes all three:
1. Works correctly -- no bugs
2. Looks premium -- CPP (Clean, Professional, Premium)
3. Feels right -- animations, states, interactions solid

**Dim/Inactive Button States**
Every input+submit pair must have dim/inactive state when nothing valid to submit, full accent when ready. No exceptions.

**44x44pt Minimum Touch Targets**
Every tappable element. Use padding to increase hit area without changing visual size.

**Toast on Save**
Every save action fires a toast. No silent saves. Pattern: '[Thing] saved' with success type.

**Floating Save Bar**
All settings/profile screens with editable fields. Animates up when hasChanges true, away on save. Never visible on fresh load. Position: absolute, bottom: 0. Tab bar height 64 + insets.bottom.

**Disclaimer Standard**
Any screen showing health data, metrics, scores, or recommendations needs:
- Inline micro disclaimer: "For informational purposes only. Not medical advice."
- First-use modal before: calorie targets, BMR/TDEE, sleep scoring, HRV, VO2 Max, health ranges, weight loss projections

**Haptics**
- Light: toggles, selections, minor interactions
- Medium: confirms, saves, FAB tap
- Heavy: destructive actions like delete

**Keyboard Avoiding**
- Every screen/modal with text input wraps in KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}.

**Multiline TextInput -- iOS select-all bug**
- Every multiline TextInput with a value prop must have a ref and onBlur={() => ref.current?.setNativeProps({ selection: { start: 0, end: 0 } })}. Without this, iOS triggers select-all on every other focus. No exceptions for multiline inputs.

**Animation Standard**
- Every bar and graph animates. No static bars ever
- Expand/collapse: never use maxHeight. Render off-screen, measure via onLayout, animate to exact pixel height. Two coordinated animations -- container height JS thread (useNativeDriver: false), content opacity/translateY native thread (useNativeDriver: true)
- Easing.out(Easing.cubic) opening, Easing.in(Easing.cubic) closing
- Card press: scale 0.97 pressIn, 1.0 pressOut, timing not spring
- Modals: NO slide-up bottom sheets ever. All modals are centered floating cards. Animation: withSpring scale 0.85 to 1.0 + opacity 0 to 1, fired in Modal onShow callback. Include handle pill at top of card. See Modal + ScrollView Pattern below.

**Dev Build Performance -- DO NOT CHASE**
JS thread drops to ~20 FPS during navigation in dev build -- confirmed Metro overhead, not a code problem. UI thread holds 60 FPS consistently. Rules:
- Never judge animation smoothness in dev. Only judge correctness: fires at right time, reaches right end state, reverses correctly.
- useNativeDriver: true or Reanimated -- trust it will be smooth in release, no action needed.
- useNativeDriver: false (width, height, layout props) -- will look rough in dev, verify smoothness at release build time only.
- Never suggest performance fixes based on dev build lag alone. Always ask: "is this also broken in release?" before touching anything.
- First TestFlight build is the real performance benchmark. Dev lag is expected and normal.

**Header Icon Buttons**
All tab header icon buttons: filled/solid Ionicons variants only. Never outline -- too faint on light themes.

**Empty States**
Every list or card that can be empty needs: icon, title, subtitle, how to add. Never a blank card.

**Loading States**
Every async operation needs a visual indicator.

**Error States**
Every operation that can fail must communicate it to the user.

**(i) Tooltip System**
- Use TooltipIcon component (handles pulse animation)
- Use TooltipModal component -- pass tooltipKey, reads from tooltipRegistry.ts
- Every tooltip entry must be added to tooltipRegistry.ts
- One (i) per card, one modal, full picture. Never a standalone tooltip for a single stat
- Categories: Nutrition, Fitness, Sleep & Recovery
- Keep in sync: whenever a change alters user-facing behavior (a calculation, rule, count, color, or layout), update the matching tooltipRegistry.ts entry AND data/tutorials.ts AND Otto's knowledge base (functions/src/assistantAppKnowledge.ts) + redeploy, all in the SAME session. Otto must know everything we add to the app. Stale explainers mislead users. Never batch to later. Grep the registry, tutorials, and Otto's KB for the touched feature/terms after every behavior change.

**Modal + ScrollView Pattern**
When Modal contains ScrollView + overlay dismiss:
- Separate absolute-positioned TouchableOpacity for overlay (position: absolute, top/left/right/bottom: 0)
- Card container in plain View with pointerEvents="box-none"
- Never TouchableOpacity as card wrapper

**Toast Above Modal**
RN Modals create new native window layer. Render <ToastRenderer /> directly inside Modal JSX above all other content. Every modal that fires toasts needs this.

## VS Code
Justin's .vscode/settings.json has "source.organizeImports": "never" -- stops VS Code dropping imports on save. If imports disappear on save, check this setting first.

## GitHub
Repo: https://github.com/jharmke/project-j, branch: master
Commit after every gate-passing feature, not just end of session