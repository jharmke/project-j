# Roadmap Audit -- In Progress
# Do not ship. Working doc only. Delete when audit complete.

---

## OPEN (stays in active roadmap)

### Faith
- [ ] Bible translation selector -- translation picker was planned for the Bible settings modal but never added. KJV is the only translation today. Future: translation selector in the gear modal (Bible screen). Dedicated session when ready.
- [ ] Plans hub browsing -- category grouping first (wellness/body, heart/identity, peace/comfort, "Need a Word Right Now" single-day group). Filter chips at ~20 items. Search for large library. app/plans.tsx.
- [ ] Bundle full KJV offline -- today fetches from GitHub (aruljohn/Bible-kjv), breaks offline. Bundle ~4MB public domain text into app. Removes reliability risk from Bible reader + makes Faith AI verse verification truly offline. data/bible-web.ts.
- [ ] Faith AI verse-banner share tap-through -- tapping outside iOS share sheet in Bible reader passes through and highlights a random verse underneath. Cosmetic/low priority. app/bible.tsx.
- [ ] Challenges/Missions layer -- opt-in time-boxed goals, smart triggers based on user patterns, mode-aware duration, progression from short to long. Coach-driven + manual challenges, tiered achievement track, completion celebration. Theme rewards: Slate/Warm/Blush unlock by completing short starter challenges (first win comes early). Custom challenges as sub-feature after base ships. Full spec in SMART_COACH_SPEC.md. Parked behind Faith AI track.
- [ ] Theme unlock starter challenge -- code done (Slate/Warm/Blush unlock together). Specific challenge content/trigger still TBD.

- [ ] Today's Message overhaul -- user-controlled pool: preset KJV verses + custom additions, static vs. cycle toggle, pool management in Settings (not on card face). NRN: card hidden by default, plain text only if manually added via Edit Layout. Rooted/Exploring keep gold border. Custom scripture picker: book > chapter > verse multi-select (up to 4 consecutive). Dedicated session.
- [ ] Achievement toast remaining -- trigger context shown under achievement name in toast, wording update before App Store launch. AchievementToast.tsx.
- [ ] Cycling Bible verses -- fine-print style, centered at bottom of Log tab and Workout tab only (Home excluded intentionally). Thematically relevant per tab: food/stewardship for Log, effort/perseverance for Workout. Rooted: always on. Exploring: optional. NRN: hidden.

### Faith / Support
- [ ] Donate/Support button -- post-TestFlight, no paywall. One-time StoreKit tip jar or Ko-fi link. Entry points TBD. Not urgent.
- [ ] HR Zone Training -- dedicated session. 5-zone system (Zone 1-5), max HR (220-age default, user-settable), optional resting HR for Karvonen formula. Stats: time-in-zone stacked bar per session. Cardio exercises: zone target field. Workout tab: zone badge post-session. Mode-aware.

### Stats / Graphs
- [ ] Fitness Metrics as graphable keys -- VO2 Max, Resting HR, Resp Rate, Blood O2, Body Fat (and Cardio Recovery) as custom graph data keys. Graph infra already exists; add to DATA_KEY_META, statsCardRegistry, and fetchTrendData. Extension of existing system.
- [ ] Trend indicators on stats -- Apple-style up/down arrow next to data values in graphs or At a Glance showing direction of change vs prior period.
- [ ] Stats calendar polish -- remove legacy On Target/Close/Off color grading from day-by-day history tiles. Replace with Day Score tier colors (green >= 80, amber >= 60, red otherwise). Today + future tiles neutral. Mindful: neutral accent. Pulls composite from existing pj_ day record. stats.tsx.
- [ ] Day Summaries archive layout -- collapsible week rows may get clunky at volume. Revisit once 8+ weeks of real history exist. Options: cap visible weeks + "show older," paginate by month, or more compact row design. Low priority.
- [ ] Day Summary card enhancements -- remaining post-ship ideas (not locked): user-configurable surface time (fixed at 5am now), earlier-access home card (e.g. post-workout), richer multi-day context beyond trailing-week average. Design session before building any of these.
- [ ] Exclusions polish -- first-use callout when user first sees a dot on the calendar. Dedicated tooltip/help article: what exclusions are, why to use them, effect on Day Score / summaries / EvR / streaks. Three entry points: calendar dot, toolkit icon, Settings Help. Also: excluded list view (dedicated view of all excluded dates with ability to un-exclude). (Absorbed backlog "Excluded dates" item.)

### Health Data
- [ ] HealthKit source detection -- read source identifier on HealthKit samples to show "via Garmin," "via Whoop," "via Oura" labels on sleep/HRV data. No direct integrations needed -- all sync to Apple Health natively, source passthrough is the architecture.
- [ ] Food group pattern detection -- if user logs zero whole foods (fruits, veg, lean proteins) for X consecutive days, surface a gentle tip. Discipline: direct, Mindful: warm/observational, never judgmental.

### Calorie / Goal Logic
- [ ] Day Score bedtime backfill bug (low priority) -- backfill-only days (user never opened app) can score up to 10pts low on Recovery because sleepConsistencyPts defaults to 0 instead of being computed. Softened by 50pt floor. Fix: have the backfill scan compute + persist consistency for scored days. utils/dayScore.ts / utils/dayScoreStore.ts.
- [ ] Burn accuracy freeze for streaks -- changing burn accuracy retroactively shifts calorie/net streaks and active-cal streaks (they recompute live using the current accuracy multiplier). Goal side is already frozen per-day via goalSnapshot. Freeze burnAccuracyPct per-day too so historical streaks stay locked to the accuracy in effect then. Justin confirmed this is the right call. utils/goalHit.ts / stats.tsx.

### Coaching / AI
- [ ] Caffeine tracking -- new field. Track caffeine intake, daily total surface, high-amount warnings + first-use disclaimer (including specific guidance for pregnant women per lower safe limit). Design decisions needed: dedicated quick-add vs food field, warning thresholds. Pairs with Advanced Nutrition expansion. Duty-of-care item.
- [ ] Smart Coach Level 2 (Focused Tips) -- single-metric AI-voiced tips for home card slots 2+ and EvR domain cards. Day Summary blocker RESOLVED 2026-06-15 (stays Level 1, no changes -- SMART_COACH_SPEC.md Open Items #1). EvR Level 2 unblocked and fully specced. Only open dependency is Weekly/Monthly summary screen layouts (not EvR). See SMART_COACH_SPEC.md.
- [ ] NEAT definition -- one tooltipRegistry.ts entry for Non-Exercise Activity Thermogenesis. No UI changes, shows up in Settings > Help automatically.

### Sleep
- [ ] Sleep score stage weight tuning -- power curve on duration (Math.pow N=3) is done. Stage reweight still open: bump REM weight higher, soften deep sleep penalty. Deep and REM are currently equal at 30pts each. utils/sleepScore.ts.
- [ ] Sleep edit disclaimer -- when user opens manual sleep edit (bed/wake time pickers), show disclaimer that manual entry will overwrite Apple Health synced data.

### Streaks
- [ ] Streak grace day system -- mode-aware grace days for auto-tracked fitness streaks (water/steps/calories/etc.). Discipline: earn grace days by hitting milestones, cap 1. Balanced: same earn, cap 3. Mindful: no punishment mechanic. Not implemented -- only the data structure exists for the faith gratitude streak, not for fitness streaks.
- [ ] Streak end warning visuals -- color shift on streak card to orange/red when within X hours of midnight and action not yet done. Optional pulse or warning icon. In-app only, no push dependency.
- [ ] Edit Streak Count -- manual override with disclaimer ("Be truthful, this is for you"). Needed for users returning after a hiatus whose history scan shows 0. Design session before building.

### BACKLOG (parked, not imminent)
- [ ] Gratitude before meals -- one-tap give thanks before logging a meal. Unapologetically Christian. No spec yet.
- [ ] Faith-based fasting -- spiritual fasting with prayer log, separate from 16:8 IF tracker. No spec yet.
- [ ] Food health score -- per-item score based on how well it fits current goals at that moment.
- [ ] "Why did you eat" / "How did it feel" / Hunger level -- quick tags on food entries (Hungry/Tired/Cravings/Bored/Social) + post-meal feel tags + 1-5 hunger scale before eating.
- [ ] Protein timing badge -- hit protein within 2 hours post-workout, simple yes/no badge.
- [ ] Time of day food heat map -- when during the day does the user tend to eat, visualized as a grid.
- [ ] Energy level tracking -- user logs energy level, correlates with food choices.
- [ ] Hydration timing insights -- not just how much water, but when. Pairs with existing water timestamps.
- [ ] Per-metric sleep exclusion -- exclude sleep data without excluding the full day. Revisit during stats revamp.
- [ ] Nap tracking -- Apple Health tracks naps separately on iOS 16+.
- [ ] HIIT mode -- Tabata, standard intervals, custom. Workout tab feature.
- [ ] Workout rest timer between sets.
- [ ] Social and accountability partner -- lightweight, one person you share your daily score with. Not a full social feed. Build after core features + onboarding stable. Low priority.
- [ ] Onboarding illustrations -- SVG illustrations, one per onboarding screen, theme-aware. Do after onboarding flow is fully functional.
- [ ] Body progress photos + measurements -- full spec in SPEC_body_progress.md. Pose photos (Front/Side/Back), timelapse, side-by-side comparison, full circumference measurements (neck/chest/waist/hips/etc.), Navy method body fat %, all fields graphable. Blocked on Firebase Storage migration, illustration assets, timelapse tech spike. Parked session 64. (Absorbs backlog duplicates: body measurements tracking, progress photos, camera timelapse.)
- [ ] Sleep detail page -- dedicated screen when Sleep card is tapped, real graph/breakdown instead of just the card. New screen, not a small add.
- [ ] PDF export -- daily/weekly summaries as PDF (Pro feature). expo-print + expo-sharing, light-themed, toggleable sections. Build after Reports section ships.
- [ ] Report templates / Report Card -- time-ranged data snapshot (7/30/90d): avg calories/macros, steps, sleep score, weight change, workouts logged, trend callouts in plain language. Shareable as screenshot via native share sheet. Nutrition/Workout/Sleep template variants. Pairs with PDF export. No code yet, vision only. (Merged from two roadmap entries.)
- [ ] Premium / Pro system -- freemium: free tier good, Pro unlocks PDF, full EvR, full Smart Tips, extended history, non-standard/custom stats charts. $4.99/mo or $39.99/yr, RevenueCat, 7-day trial. Themes stay achievement-unlock only. Needs dedicated design + architecture session before any build.

### Animation
- [ ] Contextual Achievement Toast Animations phase 2 -- 12 badge animations, none built: water (filling badge), steps (footprints across toast), weight (scale needle swing), streak (flame growing), first workout (dumbbell), sleep goal (moon/stars/ZZZ), calorie goal (plate clearing), IF fast completion (clock hands), Bible verse read (page turn), journal saved (ink/pen stroke), morning intention (sun rising), workout checked off (card pulse/flash).
- [ ] Number transitions (HIGH PRIORITY) -- all big numbers tick/roll to new value like a scoreboard on update. App-wide: calories, steps, weight, water, macros, streak counts. Odometer feel, not a snap.
- [ ] Progress bar/ring/donut animation audit -- check which are already animated vs missing. Known targets: calorie bar on every load, macro bars on log entry, food log donut on load, water bar bounce on update, sleep donut on load.
- [ ] Goal moment animations -- water goal hit (bar fills to accent + pulse), step goal hit (steps number flips green), calorie goal hit (number color transition).

### Low Priority / Future
- [ ] Weight trend sparkline -- small inline trend line next to weight number showing recent direction (up/down/flat) over ~7-14 days. No axes or labels, shape of trend only.
- [ ] Language / internationalization -- LOW.
- [ ] Apple Watch companion app -- LOW. V2 or later.
- [ ] iOS home screen widget -- LOW.
- [ ] Animated app icon -- iOS 18 feature. LOW.

### Marketing
- [ ] TikTok strategy -- anonymous account, interactive series format, crowd-sourced decisions, meme formats. Rebrand to app name when locked.
- [ ] Side-by-side screen recordings vs MFP -- same task in both apps, no commentary, let the UI speak. MFP's UI is 2015-era, contrast sells itself.
- [ ] Micro influencer outreach -- Christian fitness + faith-based wellness creators. Back pocket until product is polished and TestFlight-ready.

### Onboarding
- [ ] Weight projection graph -- profile page post-onboarding, near goal weight field. Onboarding version is built; profile page version is not.
- [ ] Macro presets -- onboarding Screen 4 (Discipline/Balanced only, not Mindful). Also settable in Settings post-onboarding. Not yet built.
- [ ] Progress bar on onboarding screens -- segmented step-progress indicator at top of screens 2-7 (not Welcome). Visual momentum. Not built.
- [ ] Apple Health onboarding -- home banner for skippers. One-time dismissable banner on home for users who tapped "Maybe later" on the Apple Health screen. Not built.
- [ ] Mindful onboarding -- projection graph + macro presets already gated off for Mindful (lines 672/762 your-style.tsx). Encouragement language + full Mindful-specific screen 4 copy still open per build status checklist.
- [ ] Post-onboarding mode switch Acknowledgement Modal -- when user switches style in Settings: brief description, "Keep my layout" vs "Apply defaults" choice. Switching TO Discipline re-fires commitment screen. Not built.
- [ ] Daily Intention card for Not Right Now users -- Today's Message morphs to Daily Intention mode for NRN: no verse, neutral styling, rotating prompts by style, user can add custom intentions. Low priority.
- [ ] Firestore migration -- move primary data storage from AsyncStorage to Firestore. Big infrastructure item. Auth (Apple + Google sign-in) is already done.

### App Infrastructure
- [ ] State restoration on launch -- save active tab + scroll position, restore on cold launch. Top of backlog.
- [ ] Tooltip pulse visibility awareness -- only pulse when card is actually visible in ScrollView viewport. Currently pulses on mount regardless. Complex, not blocking.
- [ ] Offline first behavior -- app works fully offline, syncs when connection returns.
- [ ] Daily summary push notification -- push version of the morning Day Summary pop-up (for users who don't open the app). NOT in the 14-type notifications spec yet -- separate item.
- [ ] In-app review prompt -- prompt user to rate the app at the right moment.
- [ ] Accessibility -- respect system Dynamic Type font sizes.
- [ ] Notification center -- bell icon in profile header, badge on new notifications, real-time toasts for Health sync events. Part of notifications redesign.
- [ ] Android -- React Native core reusable. HealthKit is iOS only; Android uses Health Connect. V2 after iOS is solid.

### Visual Polish
- [ ] Full theme audit -- all 5 themes x all accent options, every screen, before beta. Dedicated testing session.
- [ ] Progress bar track color pass -- sweep progress bar track colors across all themes.

### Journal
- [ ] Journal icon on Stats tab header -- not present, routes to journal.tsx.
- [ ] Date on journal entries tappable -- tapping entry date routes to that day's Day Detail. Not implemented.
- [ ] Search within journal entries -- low priority.
- [ ] Long text stress test -- verify 500-word entries format correctly. QA task.
- [ ] Multiple entries same day -- verify prayer + gratitude logged same day display correctly. QA task.

### Settings / Help (cont.)
- [ ] Resources and wellness links -- curated section (Settings > Help or dedicated screen) with recommended Christian books, health/wellness books, YouTube channels. Mostly static. Influencer outreach opportunity. Design session needed.
- [ ] Tooltip audit pass -- sweep all cards app-wide, flag every card missing a (i) tooltip, build missing ones. Part of same dedicated session as tutorials.
- [ ] Tooltip wording polish pass -- full copy pass after audit. Known issues: Active (Apple Health fallback language for non-watch users), Remaining (algorithm vs description), Net (explain running BMR first), Color Coding rewrite, em-dash sweep throughout. Standard: actually helpful, not just technically accurate.
- [ ] Style/mode audit -- full pass across all three coaching modes: features that shouldn't show in Mindful but do, features that should be Discipline-only but aren't, defaults that feel wrong. Dedicated session.

### Mindful Mode
- [ ] Mindful mode full app-wide audit -- inconsistent implementation across the app. Day Summary still needs its pass. Scope is app-wide: every screen, card, and copy string should be checked for correct Mindful behavior (no judgment language, no numbers on weight/score, no countdown, no net calories, no color coding). Dedicated session.

### Settings / Help
- [ ] Settings/Help: Coaching Style + Faith Journey in-depth explainers -- two-tier: (1) quick "what does this mean for me" blurb accessible from the setting row, (2) full article per topic in Settings > Help. Coaching Style covers what changes mode-to-mode. Faith Journey covers what each tier sees vs not. UI approach not decided.

### App Store
- [ ] App Store Connect setup -- privacy label, age rating, URLs, description, screenshots, review notes. No code. Do after app name is locked.
- [ ] Verification scan -- production build, device install, all flows confirmed before submitting.
- [ ] App name + logo -- placeholder chrome crystal logo in place for TestFlight. Final name TBD (shortlist: Prevail, Steadfast, Worthy, Haven, Witness, Sown). Verify App Store + TikTok handle availability before committing. Bundle ID locked at com.jharmke.projectj after first release.

### Home / UX
- [ ] Greeting area customization -- settings picker for top-left home header slot. Candidates: greeting text, streak badge, calorie summary line. App name + date always stay. Design session before building.
- [ ] Apple sync last sync time -- surface last HealthKit sync timestamp on cards showing synced data (steps, active cals) so user knows if watch data is stale. Placement TBD.
- [ ] Water modal edit entries -- pencil icon to edit existing water log entries (time/amount). Verify delete confirmation exists before building.
- [ ] Log tab date picker fade-in -- calendar picker was built and works, but pops in with no animation on open. Fade-out on close works. Needs matching fade-in. log.tsx.
- [ ] Day detail BMR row -- add estimated BMR to calorie breakdown in day detail alongside Consumed / Burned / Running Net. Gives user the full daily calorie picture.
- [ ] Primary button audit -- app-wide sweep: all primary CTAs to full accent fill, transparent bordered style demoted to secondary only (Edit, Cancel, filter pills).
- [ ] Goals sub-category accordion polish -- GOALS card in settings already has FITNESS GOALS and NUTRITION GOALS sub-sections. Make each sub-section collapsible accordion style for cleaner layout. settings.tsx.
- [ ] HealthKit permissions audit -- review full list of available HealthKit data types against currently requested permissions in useHealthKit.ts. Add any missing high-value metrics before next build.
- [ ] Tab bar scroll-to-top -- tapping active tab icon when already on that tab should scroll screen back to top.
- [ ] Physical measurements in profile -- waist, neck, hip fields. Enables Navy method body fat estimate. Feeds more accurate color coding on Fitness Metrics card.
- [ ] Loading + error states audit -- (1) sweep all screens for flashy/jumpy load behavior, (2) review silent failures app-wide so no user lands on a broken state with no feedback.

### Food / Log
- [ ] %DV entry in Create Food -- bidirectional amount/%DV fields in Create Food and Edit Food for all nutrients with an FDA DV. Typing either auto-fills the other. FDA DV lookup in utils/nutrientDV.ts. Likely also belongs in food detail. Full spec in SPEC_nutrition.md.
- [ ] HealthKit weight auto-pull -- read Apple Health body mass (scales that sync to Health). Ghost value with HealthKit icon when no manual entry today; manual entry always wins. Design questions: effect on YvY and Head-to-Head when source differs; whether it triggers weight achievements. Design discussion before building.

### Tutorials / Tooltips
- [ ] TUTORIAL + TOOLTIP FULL AUDIT -- dedicated session required. Covers: spotlight lag (needs TestFlight verify), launch tab routing, stats + profile tutorials not interactive/polished, all content out of date (many features shipped since last audit), faith tab card moves (verse card now Faith Today, gratitude moved, prayer retired), tooltip copy accuracy pass across all screens. Also covers: tutorial return-nav (nearly every tutorial hardcodes its own return tab; launching from Settings > Help dumps user on feature tab instead of back to Settings -- needs framework fix to capture launch origin and restore it, touches ~20 tutorials, real regression risk); tutorial hidden-card guard (if home card is hidden and user starts its tutorial, refs are unregistered -- should detect this and show "Add [Card] from Edit Layout first"); tutorialOverrideState pattern (cards with multiple UI states need a tutorialOverrideState prop for forced-state tutorials without touching real data); 79 double-dash instances in data/tutorials.ts still to fix; interactive tutorial still needed for Log Today's Total card.
- [ ] Sign-in logo entrance animation -- logo pops in instead of fading. Verify on TestFlight before investigating.

### Workout
- [ ] Load routine modal polish -- modal cuts off bottom of screen. Add description field to routine builder, show exercise preview + description in load modal and library routines tab. Preset routines should be directly editable/deletable.
- [ ] Editable workout note name -- workout-tab-sourced journal entries default to "Workout Note." Should be editable.
- [ ] Add Exercise modal keyboard bug -- keyboard covers Cancel/Add buttons at bottom of modal. Modal needs to slide up when keyboard opens (same fix pattern as CustomFoodCreator: automaticallyAdjustKeyboardInsets on inner ScrollView). workout-library.tsx.
- [ ] Workout tab FAB > search keyboard dismiss -- tapping search bar opens keyboard, no way to dismiss by tapping outside. Needs Keyboard.dismiss on tap-outside. workout.tsx.
- [ ] BUG: Rest day not overridden by Apple Health workout -- Apple Health workouts are imported and added to exercises correctly, but program.type stays 'rest', so isRest stays true and DraggableFlatList renders data={isRest ? [] : exercises} -- exercises silently hidden. Fix: flip program type off rest when Apple Health workouts are imported. workout.tsx lines ~366-400, ~996-1027.
- [ ] YvY streak (vsStreak) -- badge renders but never calculated or written. pj_vs_streak is only ever read, never set. Always 0. Needs: calculate win/loss at end of day, persist streak count, reset on loss.
- [ ] Workout tab muscle group breakdown -- session-level summary showing which muscle groups were trained across today's full workout. MuscleMap component exists for individual exercise detail only; aggregated session view on the workout tab itself is not built.
- [ ] PR tracking + lifting stats -- log personal records per lift, track 1RM trend as graphable stat, surface PRs in EvR, volume-per-muscle-group in stats. Required before workout achievement PRs can ship. Also includes full set tracker with progressive overload logging. Planning session needed.
- [ ] Daily exercise goal + active calorie goal progress display -- goals are settable in Settings and celebration fires on hit. Missing: home screen progress display (rings/bars). Design decision open: on Fitness Metrics card, dedicated Activity Rings card, or inline under Steps.
- [ ] Onboarding to home transition -- guided first steps post-onboarding, no cold drop-off. Contextual prompts easing new users into core features. Dedicated planning session before building.
- [ ] Feedback / bug reporting form -- in-app form in Settings: type (Bug/Suggestion/Other), description, optional screenshot. mailto deep link pre-fills subject + body to justin.harmke@gmail.com. Confirmation toast on send.
- [ ] "You've grown" message -- coach message after key thresholds (weight milestones, streak lengths, logging consistency). Mode-aware tone. Ties to faith journey upgrade prompts. Design discussion before building.
- [ ] Empty state illustrations -- replace icon + text empty states with SVG illustrations. Theme-aware colors, consistent style. App-wide. (Merged from visual polish section -- same item.)
- [ ] MFP switcher experience -- first-impression UX for power users arriving from MyFitnessPal. Communicates superiority without saying a word.

### Food / Search
- [ ] Food search fuzzy matching for local results -- FatSecret results already fuzzy-match server-side. My Foods, Recents, Recipes, and Favorites use exact substring match only -- typos like "chiken" don't surface saved foods. Implement fuzzy matching in normalizeForMatch or add Levenshtein distance scoring for local search. add-food.tsx.
- [ ] SET banner tip -- "(i) Tap SET on the correct item" banner after barcode scan. Plain styling, CPP polish pass may be needed. On the fence -- revisit.
- [ ] UNSET button on food detail screen -- UNSET button near the star on food detail, so user can unset a barcode-linked food without navigating to Set Foods tab. Requires barcode context passed in route params.
- [ ] Clone food serving unit bug -- adding an additional serving size on a cloned food only allows grams. Should allow all custom units (ml, fl oz, oz, etc.) same as original CustomFoodCreator serving unit picker. food-detail.tsx or CustomFoodCreator.tsx.
- [ ] Cloned food calorie mismatch -- serving size picker shows wrong calorie value while macro donut shows correct value on cloned My Foods. Picker pulling stale or incorrect calorie data. food-detail.tsx.
- [ ] Calorie target transparency -- (i) tooltip on calorie target screen explaining how the recommendation was calculated (BMR, lifestyle factor, weight pace). Not built. settings.tsx.

---

## CLOSED / ARCHIVE (not in active roadmap)

- [cut] Reports tab + Summaries hub consolidation -- three separate inline cards (Day Summaries, Weekly Summaries, Monthly Summaries) + dedicated pages already live in Stats. Hub was a refactor to consolidate behind one toggle, not a missing feature. Current three-card layout is good enough.

- [closed] Water log timestamps -- done. Each entry stores timestamp ISO string, displayed in water log modal. index.tsx line ~585.
- [cut] Customized tip push notification system -- covered by SPEC_notifications.md (14 notification types specced including habit-based). Not a separate item.
- [cut] App name + tagline finalization (backlog line 1505) -- duplicate of "App name + logo" already tracked in App Store section.
- [closed] Mode recommendation screen -- fully built in your-style.tsx: ONELINER record, getOneliner(), recommended mode pre-selected, "RECOMMENDED" badge on card.
- [closed] "You can always change this in Settings" messaging -- present at line 473 of your-style.tsx.
- [closed] Firebase Auth -- Apple + Google sign-in live in sign-in.tsx. Firestore migration tracked separately as open item.
- [cut] Theme monetization note (backlog line 1579) -- duplicate of "Theme unlock starter challenge" already in OPEN.
- [cut] Stats premium tiers as standalone item -- merged into Premium/Pro system item as "non-standard/custom stats charts."
- [cut] Pull weight from Apple Health (infrastructure line 1568) -- duplicate of "HealthKit weight auto-pull" already in audit under Food/Log.
- [cut] Excluded dates (backlog line 1573) -- absorbed into Exclusions polish item; excluded list view detail preserved there.
- [cut] Daily summary push notification weekly/monthly -- Weekly Summary Ready and Monthly Summary Ready are already in SPEC_notifications.md and built. Daily summary push (new item) tracked separately above.
- [cut] Pastor/coach view -- too early, needs social infrastructure first and isn't well scoped.
- [cut] Bible reading programs / Bible studies -- reading plans are done (app/plans.tsx). Not a separate item.
- [cut] Today's Message management UI (backlog line 1562) -- pool management in Settings is already part of the Today's Message overhaul item tracked in OPEN.
- [cut] Body measurements / progress photos / camera timelapse (backlog lines 1547-1549) -- absorbed into Body progress photos + measurements item in BACKLOG.
- [closed] Apple Health badge on imported workouts -- done. workout.tsx line ~1059 renders "APPLE HEALTH" badge on fromAppleHealth exercises.
- [cut] Sleep vs food correlation -- covered by EvR which already has sleep->next-day-cals and sleep->workout-rate correlations.
- [cut] Weekly body stewardship reflection -- removed, too close to other faith prompts and not well defined enough to track.
- [cut] App-wide color customization -- extending color picker to home progress bars is scope creep; current visual/theme state is good. Stats graph color picker already ships the core value.
- [cut] Card background icon pattern (line 1480) -- pre-build note superseded by the shipped Card background hero icons ([x] line 1479). Same pattern, done.
- [closed] Journal edit entry title -- editTitle state fully wired in journal.tsx, title is editable.
- [closed] Shadow pass -- done, light themes have sufficient shadow depth.
- [closed] Gradient pass -- done, gradient range acceptable on all light themes.
- [cut] Rooted vs Exploring feel too similar -- real distinction already exists. Not tracking separately; if a specific tangible feature gap is identified it gets its own item.
- [closed] Settings page overhaul Pass 2 -- goals in settings, profile cleanup done.
- [closed] Faith/Bible Settings panel -- gear icon modal fully built: font size (S/M/L/XL), font family (DM Sans/Georgia/Palatino), auto-scroll speed, Reading Plans link. Translation selector tracked separately as its own open item.
- [closed] Achievement page trophy hex cards -- sizes are consistent: regular achievement cards use size 72, daily goal cards use size 56. Two intentionally different card types, not a bug.

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
- [closed] Steps goal button move -- already removed from steps card per Justin. Done.
- [closed] Goals consolidation -- GOALS card in settings with FITNESS GOALS and NUTRITION GOALS sub-sections confirmed via screenshot. Done. Accordion polish tracked separately.
- [cut] Weekly calorie bar chart -- graph creator with pinnable calorie bar chart covers this use case well enough. Cut.
- [cut] Morning briefing card -- Day Summary already fires on first load after 5am showing yesterday's recap. A separate morning briefing card would be two pop-ups fighting each other. Cut.

---

## PENDING DECISION
