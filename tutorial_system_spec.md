# Tutorial System Spec
Living document. Update in real-time as decisions are made. Never batch at end of session.

---

## Core Concept

Interactive overlay system. Live UI underneath, highlighted circles/cutouts, callout bubbles, tap-to-advance. Premium feel -- a product moment, not a tooltip tour. Covers the WHY not just the how. Think of the newest, least experienced gym goer or food tracker and build for them.

All tutorials skippable at any time. Skip/close always visible on every single step, no exceptions.

---

## Two Distinct Things: Toolkit vs Tutorial

These are NOT the same thing.

**Toolkit** = the help panel for a card or screen. Contains definitions, explanations, context. Static. "Take a Tour" button lives here ONLY when a tutorial exists for that card/screen.

**Tutorial** = the interactive guided overlay. Live UI underneath, highlighted cutouts, callout bubbles, tap to advance. Only for features complex enough that reading definitions isn't enough -- you need to SEE it or DO it to understand it.

Rules:
- Every card/screen with a tutorial also has a toolkit (Take a Tour lives inside the toolkit)
- Not every card/screen with a toolkit needs a tutorial
- Toolkit is the floor. Tutorial is the ceiling.

---

## Entry Points

### 1. Tab-Level Toolkit Icon
- Universal `?` icon in the **far RIGHT of each tab header** on every tab -- SHIPPED 2026-05-23
- Floating symbol only, no box or border. Size 22. Sits after operational buttons (refresh, library, grid, settings).
- NOTE: Original spec said far left. Changed -- having it boxed on the left felt wrong visually and conflicted with the header hierarchy. Right side, floating, is correct.
- Tapping opens a Toolkit modal for that tab/screen
- Modal is centered fade-in/fade-out (matching TooltipModal pattern) -- NOT a slide-up sheet. Dark overlay, centered card, accent top border (borderTopWidth 2, accentBlueRaw + '55'), handle pill, close X in header.
- Modal contains:
  - Label: "[TAB] TOOLKIT" in muted small caps
  - "Guided Tours" heading + subtitle
  - Tutorial rows: play icon, name, description, chevron
  - "All Tutorials" row at bottom (grid icon) -- routes to /tutorials screen
- Filled/solid Ionicon variant only (build standard)

### 2. Card-Level Toolkit (inside (i) modal)
- Accessed via the existing (i) icon on each card
- "Take a Tour" button appears **near the top** of the (i) modal when a tutorial exists for that card
- Does NOT go at the bottom
- **Animation**: subtle breathing pulse on the Take a Tour button -- slow scale 1.0 → 1.04 → 1.0, same energy as IF green button. Invitation, not a shout.
- Top-left and top-right corners of the toolkit modal are clear -- button has room

### 3. Settings > Help > Tutorials Section -- SHIPPED 2026-05-23
- Settings > Help shows a single "View Tutorials -->" row with subtitle "X guided tours available"
- Taps to dedicated `/tutorials` screen (app/tutorials.tsx)
- Tutorials screen: horizontal filter pills (All / Home / Nutrition / Workout / Stats / Profile), scrollable list of TutorialCard rows
- Each card: play icon, tab label, tutorial name, description, step count, chevron
- Tapping a card: router.back() then 350ms delay then startTutorial(id)
- Empty state: icon + message for tabs with no tutorials yet
- Pattern matches definitions.tsx exactly
- Secondary discoverability path -- users who want to browse all tutorials come here
- This is the exhaustive reference, not the primary entry point

---

## Meta-Tutorial (The Tutorial Tutorial)

**Purpose**: Teaches users WHERE to find tutorials, not the tutorials themselves. Prevents day-one info overload.

**Fires**: Once for ALL users regardless of coaching mode or faith journey. Triggered by a gentle bottom sheet prompt on first home screen load after onboarding complete -- see LOCKED DECISIONS. Does NOT auto-fire the overlay. User opts in.

**Re-trigger**: Currently no way to replay once dismissed (accidentally or intentionally). Dev tool needed -- "Reset Tutorials" in Settings > Dev Tools (7-tap hidden section) calls resetAllTutorials() from TutorialContext. In NOW. Long term: consider "Replay App Orientation" in Settings > Help.

**Skippable**: Yes, immediately, no guilt.

**Length**: 3-4 steps maximum. Brief. Tight.

**Draft steps**:
1. Highlight toolkit icon in tab header → "This icon is your toolkit. Every tab has one. Tap it anytime for help."
2. Highlight a (i) icon on a home card → "Cards with this icon have definitions. Some also have guided tours -- look for the Take a Tour button inside."
3. Reference Settings > Help → "All tutorials live in Settings → Help whenever you need them."
4. Dismiss → "You're set. Everything's there when you need it."

**Dependency**: Meta-tutorial cannot ship until toolkit entry points (tab icons + Take a Tour in (i) modals) are built. Build those first.

---

## Mode-Aware Tutorial Voice

Every tutorial has three content variants. Engine selects based on styleMode at tutorial launch time.

| Mode | Voice |
|------|-------|
| Discipline | Direct, performance-focused. "Your net calories tell you whether you're in a deficit. Here's how to read it." |
| Balanced | Encouraging, middle ground. "This number shows how your day is tracking -- here's what it means." |
| Mindful | Warm, observational, zero judgment. "This shows what you've logged today. However you feel about the number is okay." |

---

## Architecture (high level, full spec in dedicated build session)

- `TutorialOverlay.tsx` -- global component, mounts in `_layout.tsx` above all tabs (same pattern as CelebrationRenderer, AchievementToastRenderer)
- Full-screen absolute overlay using `react-native-svg` clipPath with evenodd rule: dark layer covering screen with cutout at target element
- Callout bubble: absolute-positioned View with arrow pointer, auto-positions above/below/left/right of cutout
- `TutorialContext` provides: `startTutorial(id)`, `advanceStep()`, `skipTutorial()`, active state
- Target measurement: components register themselves via context with a `tutorialKey` string. On tutorial start, overlay measures the registered ref via `measure()` for screen coordinates.
- Storage: `pj_tutorials` key -- object keyed by tutorial id, tracks seen/completed state
- `pj_tutorial_meta` -- boolean, meta-tutorial seen state

Full architecture spec to be written in dedicated build session before any code written.

---

## Edge Cases

### Hidden Card + Tutorial Launch
Home tab cards can be hidden or removed by the user via Edit Layout. If a user hides the IF card (for example) and then opens the Home Toolkit and taps the IF tutorial, the tutorial's target refs are unregistered (component not mounted). Current behavior: overlay fires with full-screen dim + centered bubble on every step -- no spotlight anywhere. Tutorial runs as a confusing text-only walkthrough for a feature not even visible on screen.

**Correct behavior**: Guard at `startTutorial()` time for home-tab tutorials whose primary card can be hidden. Check if the tutorial's first step target key is registered in TutorialContext before starting. If unregistered and the tutorial is for a hideable home card, show an inline message instead: *"The [Card Name] card isn't on your home screen right now. Add it from Edit Layout to follow along."* Do not start the tutorial. Other tabs (Log, Workout, Stats, Profile) always have their content visible -- this guard only applies to home tab card tutorials.

Cards this applies to: cal_card, macros_card, sleep_card, if_card, yvy_card -- all can be hidden via Edit Layout.
Cards this does NOT apply to: log tutorials, workout tutorials, stats tutorials, profile tutorials -- those screens always render their content.

**Status**: Not yet implemented. In SOON. Current behavior is graceful fallback (no crash/freeze) but bad UX.

---

## HOME TAB

### Toolkits

| Card | Status | Notes |
|------|--------|-------|
| Calories Today | EXISTS | Remaining, Active, NET, Color Coding, Running BMR formula |
| Macros Today | EXISTS | Macro definitions, goals, identity colors |
| Sleep | EXISTS | Score algorithm, stages, color thresholds, paths |
| IF Countdown | EXISTS | Fasting method, window, result definitions |
| You vs Yesterday | EXISTS | Metrics, win/loss/tie logic, score definitions |
| Fitness Metrics | EXISTS | All 6 metrics with ACSM/ACE/AHA sources |
| Weight card | BUILD | 6 numbers: current, vs yesterday, total lost, goal, to go, projected date |
| Today's Training | BUILD | What shows here, relationship to workout tab, effort score |
| Gratitude Streak | BUILD | Grace day system, saver system, streak mechanics, week dot grid |

No toolkit needed: Today's Message, Water, Steps, Reading Plans, Today's Thoughts

### Tutorials (5)

| Tutorial ID | Name | Covers |
|-------------|------|--------|
| `cal_card` | Calories Card | Running net formula, what Remaining/Active/NET mean in plain language, color coding per mode (Discipline tight thresholds / Balanced forgiving / Mindful no color), what to actually do when numbers are red |
| `macros_card` | Macros Card | What macros are and why they matter (for a complete beginner), reading the bars against goals in context of real logged food, identity colors (protein green / carbs amber / fat red), over-goal behavior |
| `sleep_card` | Sleep Score | Score algorithm explained simply (duration + deep + REM), what the stage colors mean, what "Well Rested" actually requires, Path 2/3 feel-rating requirement, what to change to improve score |
| `if_card` | Intermittent Fasting | What IF is (beginner explanation), the 3 states (idle / active fast / completed), how to start a fast, how to log last meal, how to close the window, editing start/end times. **STATE DEPENDENCY**: Tutorial authored assuming State 1 (fast not started). Steps targeting if_card_active (State 2) and if_card_eating (State 3) are conditionally rendered -- if user runs tutorial from wrong state, those steps show confusing full-screen dim. Fix TBD in NOW (see roadmap). |
| `yvy_card` | You vs Yesterday | What the card is tracking and why, the 7 metrics and how each is measured, win/loss/tie logic in plain language, score bar (Discipline/Balanced only), Mindful neutral framing |

Fitness Metrics, Weight, Today's Training, Gratitude Streak: toolkit only, no tutorial.

---

## LOG TAB

### Tab-Level Toolkit
- Hub toolkit accessed from Log tab header icon (far left)
- Does NOT have a single "Take a Tour" -- instead lists all 5 available tutorials by name
- User picks which tutorial they need from the list

### Toolkits

| Screen/Card | Status | Notes |
|-------------|--------|-------|
| Advanced Nutrition card | EXISTS | Fiber/sodium/cholesterol/saturated fat/sugar definitions, FDA daily values, why they matter |
| Food detail screen | BUILD | Serving sizes explained, what each macro means in context, where extended nutrition lives, stepper explained, gram input vs servings, edit mode behavior |
| Recipe builder | BUILD | Total weight, per-serving calculation, what servings count means, ingredient macro totals |

No other toolkits needed on log tab.

### Tutorials (5)

| Tutorial ID | Name | Covers |
|-------------|------|--------|
| `log_food` | Logging Food | **INTERACTIVE TUTORIAL -- navigates across 3 screens with real spotlights on every step.** Uses tutorialFood (hardcoded Grilled Chicken Breast) so tutorial food is always available and consistent. Step flow: (1) log.tsx spotlight on + button, (2) navigate to add-food, spotlight search bar, (3) spotlight tutorial food result row, (4) navigate to food-detail, spotlight amount field, (5) spotlight stepper, (6) spotlight serving picker (4 options), (7) spotlight meal selector, (8) spotlight LOG IT button + tutorialAction fires saveTutorialEntry (writes with tutorialEntry:true, skips all achievements/Firestore), (9) navigate back to log.tsx, spotlight logged entry row, (10) spotlight X delete button, (11) tutorialAction fires deleteTutorialEntry, final tips copy. Total: 11 steps. Food is actually saved and actually deleted -- zero data footprint. |
| `manage_log` | Managing Your Log | Covers: editing a logged entry (tap to reopen), removing an entry, date navigation, meal slot totals, Today's Total. If log is empty when tutorial starts, auto-logs tutorial chicken breast first (same tutorialMode/tutorialEntry isolation), runs tutorial, auto-deletes at end. No skipping steps due to empty state. |
| `barcode` | Barcode Scanner | Opening the scanner, what happens on a match, what happens on no match, the SET system (what it is and why), pinning a food to a barcode, unset a food, Create & Set for new foods, saved overrides persist |
| `create_food` | Creating Your Own Food | Opening CustomFoodCreator, required fields (name + calories), optional fields (brand, macros, extended nutrition), serving size + unit, saving to My Foods library, how to edit a saved food later, Save as Copy for FatSecret foods |
| `recipes` | Recipes | **INTERACTIVE -- SHIPPED 2026-05-25.** 10-step tour. Step 0 spotlights + FAB in food library. Step 1 navigates to recipe-builder, spotlights name input (demo ingredients auto-injected: Chicken Breast + Brown Rice + Olive Oil). Steps 2-6 spotlight add ingredient row, ingredients card, single ingredient row, total nutrition card, servings card. Step 7 spotlights Save button -- saveTutorialRecipe action saves with tutorialRecipe:true marker then router.back() pops recipe-builder cleanly. Step 8 navigates to Recipes tab, spotlights tab pills bar (orientation). Step 9 spotlights recipe row, deleteTutorialRecipe fires on DONE. No data footprint. |

**Note on log_food length**: Target 10-12 steps maximum. If step count exceeds this during build, split into `log_food_1` (find + log) and `log_food_2` (edit + remove + navigate). Decision at build time. Easy to digest is non-negotiable.

---

## WORKOUT TAB

### Tab-Level Toolkit
- Hub toolkit accessed from Workout tab header icon (far left)
- Covers: general workout tab overview, day scroller dots explained (what each dot state means, day types), links to all 4 tutorials

### Toolkits

| Feature | Status | Notes |
|---------|--------|-------|
| Tab-level (hub) | BUILD | Day scroller dots, day types, overview, tutorial links |
| Today's Effort | BUILD | 1-10 scale explained, what it tracks, how it feeds into Stats graphs |
| Tags | BUILD | What tags are for, 6 locked defaults (Push/Pull/Legs/Core/Cardio/Rest), creating custom tags, color assignment, relationship to programs |

No toolkit needed: exercise list/checkoff, sets/reps fields, cardio fields, FAB, edit/delete icons, exercise info modal (has own (i) icon), workout notes, progress count

### Tutorials (4)

| Tutorial ID | Name | Covers |
|-------------|------|--------|
| `workout_basics` | Workout Basics | Day scroller and what dots mean (assigned/unassigned/rest/active), checking off exercises, sets/reps/rest fields, cardio fields (duration/distance/speed/incline etc.), progress count (2/2), Today's Effort score, workout notes. Brief mention of tags: "tap the Tags area to label your workout type." |
| `programs` | Programs | What a program is (weekly template for your training), difference between program and routine, loading a preset program, creating your own in the library, how the loaded program maps exercises to each day of the week, clearing a program |
| `routines` | Routines | Routines vs programs (key distinction -- routine = one day's exercises saved as a reusable block, program = full week template), building a routine in the library, adding exercises to it, saving it, loading it onto a specific day from the workout tab or library |
| `exercise_library` | Exercise Library | Searching exercises, filter by muscle group/type/tag, exercise detail modal (muscle map + HOW TO PERFORM steps), adding an exercise to today's workout, creating a brand new exercise (name, type, muscles, instructions) |

---

## STATS TAB

### Tab-Level Toolkit
- Hub toolkit accessed from Stats tab header icon (far left)
- Overview of all 5 sections, links to 3 tutorials

### Toolkits

| Feature | Status | Notes |
|---------|--------|-------|
| Tab-level (hub) | BUILD | Overview, section guide, tutorial links |
| At a Glance | BUILD | Stat pairs explained, period switcher, net cals formula, what each number represents, BMR in context |
| Trends | BUILD | How to read the charts, period pills, callout bubbles (tap a bar/point), what sparse data means |
| Streaks | BUILD | Grace days, saver system, all 14 streak types, manual vs auto-tracked distinction |
| Calendar | BUILD | What the dots mean, color states, exclusion dots, how to exclude a day |
| Effort vs Results | BUILD | What it analyzes, how findings are generated, correlation logic, what insufficient data means |

No toolkit needed: Records (self-explanatory -- all-time bests with dates)

### Tutorials (3) -- ALL SHIPPED 2026-05-27

| Tutorial ID | Name | Steps | Status |
|-------------|------|-------|--------|
| `graph_creator` | Graph Creator | 8 | SHIPPED -- fully interactive |
| `streaks` | Streaks | 5 | SHIPPED -- fully interactive |
| `effort_vs_results` | Effort vs Results | 6 | SHIPPED -- fully interactive with demo report |

**graph_creator** (8 steps): preAction `injectTutorialGraph` injects a demo calories bar graph + force-opens Trends CollapsibleSection. Step 1 spotlights FAB, NEXT opens creator as inline absoluteFill View (tutorialMode pattern -- not a Modal, so TutorialOverlay can measure refs inside it). Step 2 noDimOverlay + bubbleAtBottom so full data grid visible, NEXT auto-selects Calories. Step 3 spotlights chart type row ("CHART TYPE"), NEXT auto-selects Bar. Step 4 spotlights color swatches. Step 5 "LIVE PREVIEW" spotlights preview StatsGraphCard (graph_creator_preview_card ref on wrapper View). Step 6 spotlights ADD TO STATS button, NEXT closes creator. Step 7 spotlights injected graph card in Trends. Step 8 "EDIT OR REMOVE" spotlights settings icon (editBtnRef prop on StatsGraphCard passed for tutorial card only), DONE fires deleteTutorialGraph removing demo graph.

**streaks** (5 steps): preAction `openStreaksSectionForTutorial` force-opens the Streaks CollapsibleSection (CollapsibleSection has forceOpen prop). Step 1 spotlights streaks card. Step 2 spotlights first streak tile. Step 3 spotlights gear icon, NEXT fires `openStreaksManage` -- opens Manage Streaks as inline absoluteFill View (tutorialMode pattern). Step 4 spotlights manage panel. Step 5 spotlights Create Custom button, DONE fires `closeStreaksManage`. Note: grace days/savers steps intentionally omitted -- feature not implemented in app.

**effort_vs_results** (6 steps): `returnRoute: '/(tabs)/stats'` so tutorial always returns to Stats on end/skip. Step 1 no spotlight, `navigateTo: '/diagnostic-report?tutorial=1'` -- screen detects tutorial param and pre-loads TUTORIAL_DEMO_REPORT (static realistic 30-day DiagnosticReport, bypasses all AsyncStorage loads, generate button shows "Generate Analysis" in tutorial mode not "Regenerate"). Steps 2-6 spotlight: window picker, generate button, ConsistencyCard only (evr_findings_section wraps first card only -- wrapping all 5 was too tall for viewport), correlations, suggestions. All steps noTabBarOffset. ToolkitSheet passes `t.returnRoute` to startTutorial so returnRoute works from the toolkit.

### tutorialMode inline pattern (for spotlighting inside Modals)
RN Modals create a new native window layer. measureInWindow inside a Modal returns coordinates relative to that Modal's window, not the app window -- TutorialOverlay cannot draw spotlights correctly. Solution: gate the real Modal with `{!tutorialMode && <Modal...>}` and render an identical inline absoluteFill View when `tutorialMode` is true. Refs inside the inline View are measurable normally by TutorialOverlay. Implemented for: Manage Streaks modal (streaksManageTutorialMode), Graph Creator modal (creatorTutorialMode).

### CollapsibleSection forceOpen pattern
Stats CollapsibleSections default to closed when not the first section. `CollapsibleSection` accepts `forceOpen?: boolean` -- when it flips to true, a useEffect opens the section with the normal fade animation. Used by: Streaks section (streaksSectionForceOpen, set by openStreaksSectionForTutorial preAction), Trends section (trendsSectionForceOpen, set by injectTutorialGraph, cleared by deleteTutorialGraph).

---

## PROFILE TAB + SETTINGS SCREEN

### Tab-Level Toolkit (Profile tab)
- Hub toolkit accessed from Profile tab header icon (far left)
- Overview of profile sections and what each controls
- Links to relevant tutorials and help articles
- Settings screen also gets its own toolkit icon in the Settings header

### Toolkits

| Feature | Status | Notes |
|---------|--------|-------|
| Profile tab-level (hub) | BUILD | Overview of all profile sections, what each one affects |
| Activity Level | BUILD | Lifestyle activity vs training frequency distinction, why they're separated, what each multiplier means, how it affects calorie target |
| Your Estimates (BMR/TDEE) | BUILD | What BMR is (what your body burns at rest), what TDEE is, Mifflin-St Jeor formula in plain language, why the app separates lifestyle from training, what the estimated calorie target means |
| Settings screen-level (hub) | BUILD | Overview of all settings sections, links to Faith & Style tutorial and help article |
| Faith & Style | BUILD | Quick definitions: what Discipline/Balanced/Mindful each change at a high level, what Rooted/Exploring/Not Right Now each change, how to switch post-onboarding |
| Health (burn accuracy) | BUILD | What the burn accuracy adjustment does, why wearables overestimate, how the modifier is applied (calculation time only, raw value stored), when to use 90% vs 80% etc. |

No toolkit needed: Basic Info, Weight Goal, Water Presets, Appearance (themes/accents), Goals, Notifications, Help section itself

### Tutorials (1)

| Tutorial ID | Name | Covers |
|-------------|------|--------|
| `faith_and_style` | Your Style & Faith Journey | What each coaching mode actually changes in the app (Discipline -- tight thresholds, direct language, streak break modal; Balanced -- forgiving thresholds, encouraging; Mindful -- no color coding, no judgment, simplified cards). Who each mode is for. Faith Journey tiers (Rooted / Exploring / Not Right Now) -- what features change per tier. How to switch either setting post-onboarding. "You can always change this" reassurance. Mode-aware tutorial voice: Discipline version is direct, Mindful version is warm. |

### Help Article (1)

| Article | Name | Covers |
|---------|------|--------|
| `understanding_your_style` | Understanding Your Style | Long-form article in Settings > Help > Tips & Guides. Every single thing each coaching mode changes: calorie color coding thresholds, language throughout app, You vs Yesterday behavior, weight card treatment, Mindful card simplifications, IF card visibility, default card order per mode. Side-by-side comparison format. Who each mode is for with real examples ("if you have a history of diet stress, Mindful is for you"). Faith Journey tier differences: what Rooted gets that Exploring doesn't, what NRN hides. How to switch. Reassurance that switching never deletes data. Written warmly, not like a help doc. |

---

## FULL AUDIT TOTALS

### Toolkits to build (new, across all tabs)
Home: Weight card, Today's Training, Gratitude Streak (3 new -- 6 already exist)
Log: Food detail screen + Recipe builder (2 new -- Advanced Nutrition already exists)
Workout: Tab hub, Today's Effort, Tags (3 new)
Stats: Tab hub, At a Glance, Trends, Streaks, Calendar, Effort vs Results (6 new)
Profile/Settings: Profile tab hub, Activity Level, Your Estimates, Settings hub, Faith & Style, Health/Burn Accuracy (6 new)
Total new toolkits to build: ~20

### Tutorials (all tabs)
Home: Calories card, Macros card, Sleep card, IF card, You vs Yesterday (5)
Log: Logging Food, Managing Your Log, Barcode Scanner, Creating Your Own Food, Recipes (5)
Workout: Workout Basics, Programs, Routines, Exercise Library (4)
Stats: Graph Creator, Streaks, Effort vs Results (3)
Profile/Settings: Your Style & Faith Journey (1)
Meta-tutorial: (1)
Total tutorials: 19 (including meta)

### Help Articles
Understanding Your Style (1 -- first article for Tips & Guides section)

---

## ARCHITECTURE

### New files
- `components/TutorialOverlay.tsx` -- overlay, spotlight/cutout, callout bubble, animations
- `context/TutorialContext.tsx` -- `startTutorial(id)`, `advanceStep()`, `skipTutorial()`, ref registration
- `data/tutorials.ts` -- all tutorial content (all 18 tutorials, mode-aware copy per step)
- `hooks/useTutorialTarget.ts` -- hook components use to register themselves as highlightable (`const ref = useTutorialTarget('key')`)

### Files modified
- `app/_layout.tsx` -- mount `<TutorialOverlay />` globally (same pattern as CelebrationRenderer)
- `components/TooltipModal.tsx` -- add "Take a Tour" button when tutorial exists for that card
- `app/(tabs)/_layout.tsx` -- add `?` toolkit icon to each tab header (far left)
- `app/settings.tsx` -- add Tutorials section under Help
- Two new AsyncStorage keys: `pj_tutorials` + `pj_tutorial_meta`

### Step data structure
```ts
interface TutorialStep {
  targetKey: string          // matches registered ref key; 'none' = no spotlight, full-screen dim
  title: string              // Bebas heading
  body: { discipline: string; balanced: string; mindful: string }
  highlightPadding?: number  // default 8
  skipIfTargetMissing?: boolean  // skip step silently if ref not mounted -- use sparingly, only for genuinely optional UI (e.g. HealthKit sleep donut that can't exist without data)
  skipForModes?: string[]    // skip step for specific coaching modes
  navigateTo?: string        // router path to navigate BEFORE this step renders (interactive tutorial system)
  navigateDelay?: number     // ms to wait after navigation for refs to register (default 600ms)
  tutorialAction?: string    // named action to fire when NEXT is tapped on this step, before advancing
  noTabBarOffset?: boolean   // set true for screens without a tab bar (diagnostic-report, add-food, workout-library) so isOffScreen() doesn't add TAB_H to bottom clip check
  noDimOverlay?: boolean     // skip the 4-panel scrim -- fully visible UI behind overlay. Use when user needs to SEE the content (e.g. data grid in graph creator step 2)
  bubbleAtBottom?: boolean   // pin callout bubble above tab bar instead of auto-positioning above/below spotlight. Use alongside noDimOverlay so bubble doesn't block visible content
  scrollToTop?: boolean      // scroll all registered ScrollViews to y=0 before measuring. Use when target is at top of scroll view but user may have scrolled past it
  ifCardState?: 'idle' | 'active' | 'eating'  // forces IFCard to render a specific visual state without touching real data
  yvyDemo?: boolean          // forces YvY card to render hardcoded demo values instead of real data
}

interface Tutorial {
  id: string
  name: string
  description: string        // shown in ToolkitSheet and tutorials.tsx -- no truncation, full wrap
  tab: 'home' | 'log' | 'workout' | 'stats' | 'profile'
  steps: TutorialStep[]
  preAction?: string         // action key fired before step 0 opens -- use to inject demo data so it's on-screen when overlay fades in (no "it just appeared" surprise)
  returnRoute?: string       // route to navigate to on tutorial end/skip -- use for tutorials that navigate away from the launch screen (e.g. effort_vs_results navigates to /diagnostic-report, returns to /(tabs)/stats)
}
```

### Target measurement
`ref.current?.measureInWindow()` -- returns screen-absolute coordinates. Cutout drawn at `{ x - padding, y - padding, width + padding*2, height + padding*2 }`.

---

## INTERACTIVE TUTORIAL PATTERN

For tutorials that cross screens (log_food is the first example), the engine supports full navigation with real spotlights on every step. No powerpoints. No text-only steps. Every step spotlights a real live UI element.

### navigateTo
When a TutorialStep has `navigateTo`, TutorialOverlay fires `router.push(navigateTo)` before rendering the step. Then it retries `measureTarget` up to 5 times with 150ms between attempts, waiting for the destination screen's ref to register. Once found, spotlights normally. If ref never appears within ~750ms total, falls back to full-screen dim (should not happen for properly wired refs).

### tutorialAction
When a TutorialStep has `tutorialAction`, tapping NEXT fires that named action BEFORE advancing to the next step. Target screens register their action callbacks via `registerTutorialAction(key, callback)` and clean up via `unregisterTutorialAction(key)` on unmount. Engine awaits the callback, then advances.

Defined actions:
- `saveTutorialEntry` -- registered by food-detail.tsx. Programmatically saves the tutorial food entry with full data isolation (see below). Fires when NEXT is tapped on the log_save_btn step.
- `deleteTutorialEntry` -- registered by log.tsx. Finds and removes any entry with `tutorialEntry: true` from today's log, recalculates totals. Fires on the final cleanup step.

### Policy: skipIfTargetMissing is NOT the answer to missing refs
`skipIfTargetMissing` is reserved for elements that are genuinely optional and cannot exist regardless of tutorial design -- for example, the HealthKit sleep donut that simply cannot be mounted if Apple Health has no sleep data. It is NOT an acceptable workaround for "the screen isn't open yet." If a step needs a ref that isn't mounted, use `navigateTo` to get to the right screen first.

---

## SPOTLIGHTING INSIDE A MODAL -- INLINE RENDER PATTERN

**Problem:** React Native Modals create a new native window layer above everything, including TutorialOverlay (which lives in `_layout.tsx`). Any `useTutorialTarget` ref registered inside a component rendered as a `<Modal>` is measured in a different coordinate space -- the spotlight cutout never lines up with the actual element. You cannot spotlight individual fields inside a Modal.

**Solution:** When the tutorial needs to spotlight elements inside a component that normally renders as a Modal, pass a `tutorialMode` boolean prop. In that mode the component renders as an absolute-positioned `Animated.View` (`StyleSheet.absoluteFillObject`) instead of a `<Modal>`. TutorialOverlay in `_layout.tsx` sits above the Stack, which sits above the screen View, which sits above the inline component -- so the spotlight measures and spotlights refs inside the inline component correctly.

**Pattern (applied in CustomFoodCreator.tsx):**

```tsx
// tutorialMode=false (default): renders as Modal
<Modal visible={visible} transparent ...>
  {cardContent}
</Modal>

// tutorialMode=true: renders as inline absoluteFill View
<Animated.View style={[StyleSheet.absoluteFillObject, { opacity: overlayOpacity, ... }]}>
  {cardContent}
</Animated.View>
```

**Key details:**
- `inlineMounted` state controls whether the inline view is in the tree. Set true on `visible=true`, stays true through the close animation (so we don't unmount mid-fade), then false after animation completes.
- The component's internal scroll view is registered with `registerScrollView(key, ref)` so `scrollToTarget` can scroll to deep refs (like the save button at the bottom of the form).
- Card `ref={cardRef}` on the outer card Animated.View spotlights the ENTIRE card undimmed -- use this for a "full form overview" step before zooming into individual fields.
- Wrapper Views around groups of related fields (e.g., `create_food_calories_section`, `create_food_macros_section`) let a single spotlight cover multiple inputs at once.
- `handleSave` must be guarded: `if (tutorialMode) { handleClose(); return; }` -- never write to storage during a tutorial.
- The component's `skipTutorial` cleanup should close it: `TutorialContext.skipTutorial()` calls `actions.current['closeCreatorAfterTutorial']?.()` which sets state to unmount the inline view.

**Do NOT use this pattern for:**
- Components where only ONE field needs spotlighting -- just wire a ref on that field directly, no `tutorialMode` prop needed.
- Components you cannot modify (e.g., system sheets). Use `targetKey: 'none'` or spotlight a surrounding element.

---

## noTabBarOffset -- SPOTLIGHTING NEAR THE SCREEN BOTTOM ON NON-TAB SCREENS

**Problem:** `isOffScreen()` in TutorialOverlay uses `TAB_H = 64` in its bottom-clip threshold. This is correct for tab screens (elements near the bottom are hidden behind the tab bar). But on screens with no tab bar (e.g., `add-food`, `food-detail`, `recipe-builder`), this 64px buffer falsely flags elements near the screen bottom as off-screen, preventing the spotlight from rendering.

**Example:** The + FAB on `add-food` sits at `bottom: 20 + insets.bottom (~34px)`. FAB top y ≈ SH - 110. Threshold: `SH - TAB_H - 50 = SH - 114`. FAB y (SH-110) > threshold (SH-114) by just 4px -- falsely off-screen.

**Solution:** Add `noTabBarOffset: true` to any TutorialStep targeting an element on a screen with no tab bar. TutorialOverlay reads this flag and passes `noTabBar=true` to `isOffScreen()`, which uses `tabH = 0` instead of `TAB_H = 64`.

```ts
// In tutorials.ts
{ targetKey: 'create_food_fab', noTabBarOffset: true, navigateTo: '/add-food?meal=browse', ... }

// isOffScreen signature
function isOffScreen(l: TargetRect | null, noTabBar = false): boolean {
  const tabH = noTabBar ? 0 : TAB_H;
  if (l.y > SH - tabH - 50) return true;
  if (l.y + l.h > SH - tabH - 24) return true;
  ...
}
```

**Screens that need `noTabBarOffset: true`** on steps targeting bottom-of-screen elements:
- `add-food` -- FAB, scan banner elements
- `food-detail`, `recipe-builder`, `recipe-log`, etc.

Tab screens (log, workout, stats, home, profile) do NOT need this flag -- their tab bar is real and the offset is correct.

---

## TUTORIAL DATA ISOLATION

Any data written during a tutorial must leave zero permanent footprint. The contract: tutorial data never reaches Firestore, never fires achievements, never affects streaks, never appears in stats, graphs, or any reporting. Not ever.

### Implementation
1. **Save path flag:** `tutorialMode: true` passed through saveEntry in food-detail.tsx. Bypasses: `checkAndUnlock`, `checkMomentumAchievements`, `checkNutritionAchievements`, `handleDailyGoalHit`, `showAchievementToast`, `showCelebration`, and `storageSet` Firestore mirror. Uses direct `AsyncStorage.setItem` instead to stay local only.
2. **Entry marker:** `tutorialEntry: true` on the diary entry object itself. Permanent identifier even if the app crashes.
3. **Programmatic cleanup:** `deleteTutorialEntry` tutorialAction at tutorial end. Removes entry from AsyncStorage, recalculates log totals.
4. **Crash recovery:** On app launch (after auth resolves), scan `pj_YYYY-MM-DD` for today, filter out any entries with `tutorialEntry: true`, write back silently if any found. Runs before any stats, calorie card, or log tab loads. Guards against app being killed mid-tutorial leaving orphaned data.

### Why crash recovery matters
If the app is force-killed while a tutorial is running, the tutorial entry sits in AsyncStorage with no one to clean it up. Without the launch-time scan, that ghost entry could affect the calorie card, stats, or streak counts the next time the user opens the app. The scan is cheap (reads one key, writes back only if dirty) and completely silent.

---

## TUTORIAL FOOD: data/tutorialFood.ts

Static hardcoded food. No API calls, no network dependency, always available. Used when food-detail.tsx receives `tutorialFood=chicken_breast` route param.

**Grilled Chicken Breast (Generic):**
- Per 100g (default): 165 kcal, 31g protein, 0g carbs, 3.6g fat
- Extended nutrition: 74mg sodium, 85mg cholesterol, 1g saturated fat, 0g fiber, 0g sugar
- Serving options: 1 oz (28g, 46 kcal) / 3 oz serving (85g, 140 kcal) / 100g default (165 kcal) / 1 breast half (172g, 284 kcal)

Values are standard USDA figures for grilled chicken breast, no skin. Justin verified accurate.

### Storage
- `pj_tutorials`: `{ [tutorialId]: { seen: boolean, completedAt?: string } }`
- `pj_tutorial_meta`: `{ seen: boolean }`

---

## BUILD ORDER

1. **Architecture + Design** -- DONE 2026-05-23.
2. **Engine** -- DONE 2026-05-23. TutorialContext, useTutorialTarget, TutorialOverlay (4-panel scrim, callout bubble, NEXT/SKIP/DONE, progress dots/count), data/tutorials.ts (19 tutorials, all mode-aware copy), pj_tutorials AsyncStorage key.
3. **Tab-level toolkit icons + ToolkitSheet modal** -- DONE 2026-05-23. ? icon far right all 5 headers. Centered fade modal (not slide-up). Per-tab tutorial lists. "All Tutorials" routes to /tutorials screen.
4. **Take a Tour button + /tutorials screen** -- DONE 2026-05-23. 7 TooltipModals wired with breathing pulse. Dedicated app/tutorials.tsx with filter pills. Settings > Help has single row routing to it.
5. **Meta-tutorial** -- DONE 2026-05-23. Auto-fires 1500ms after first home load, once ever.
6. **Spotlight target wiring + Interactive Tutorial Engine** -- IN PROGRESS. Home tab DONE (2026-05-23/24). Log tab is the active work. Log tab requires the interactive tutorial engine (navigateTo, tutorialAction, tutorial data isolation) to be built alongside the ref wiring -- the two are inseparable for log_food. Build order within log tab: (a) engine upgrades to TutorialContext + TutorialOverlay, (b) data/tutorialFood.ts, (c) add-food.tsx tutorialMode support, (d) food-detail.tsx tutorialMode + tutorialAction, (e) log.tsx refs + deleteTutorialEntry callback, (f) _layout.tsx crash cleanup, (g) tutorials.ts log_food rewrite. Workout/stats/profile wiring follows -- those tabs are single-screen so no interactive engine needed, just ref wiring.
7. **Individual tutorials -- priority order:**
   - Logging Food (most critical -- food logging is the core habit and biggest drop-off risk)
   - Managing Your Log
   - Barcode Scanner
   - Workout Basics
   - IF card
   - Calories card
   - You vs Yesterday
   - Programs
   - Routines
   - Exercise Library
   - Sleep card
   - Macros card
   - Graph Creator
   - Streaks
   - Effort vs Results
   - Recipes
   - Create Your Own Food
   - Your Style & Faith Journey
7. **Help article** -- Understanding Your Style (written content, no overlay, lives in Tips & Guides)

---

## OPEN DECISIONS (resolve before build)

- Log_food tutorial: one tutorial or split 1A/1B? Decide at step-count time during build. Target max 10-12 steps.

---

## LOCKED DECISIONS

**Meta-tutorial trigger**: Gentle bottom sheet prompt on first home screen load after onboarding complete. Fires exactly once. Non-blocking, opt-in. Copy: "New to Project J? / Take 30 seconds to learn where everything lives." Two buttons: "Show me around" (primary accent, starts meta-tutorial) + "I'm good" (secondary, dismisses permanently). If dismissed, gone forever -- tutorials always findable in Settings > Help. Does NOT auto-fire the overlay -- user chooses.

**Recipe builder toolkit**: YES. Add it. Rule: if on the fence, add it.

**Tab toolkit icon**: `help-circle` filled Ionicon. Distinct from card-level `information-circle` filled (`i`). Hierarchy: `?` = whole screen, `i` = this card specifically. Visually consistent family, functionally distinct.

**Tab toolkit icon placement**: Far RIGHT of header, floating (no box, no border, no background). Size 22. Sits after operational buttons. CHANGED from original far-left spec -- left felt wrong visually in practice.

**Tab toolkit icon pulse**: YES -- same exact behavior as existing (i) card icons. 3 pulses, 1500ms delay on mount, fires once per cold launch until seen, permanently stops after first tap. Same infrastructure, same pattern.

**ToolkitSheet animation**: Centered fade-in/fade-out modal. NOT a slide-up. Matches TooltipModal exactly. CHANGED from original slide-up spec -- slide-up feels inconsistent with every other modal in the app.

**Take a Tour button pulse**: Same breathing pulse as described (slow 1.0 → 1.04 scale). Stops after first tap, same seen-state pattern as (i) icons.

**Navigation model**: NEXT button only to advance. No tap-dark-area shortcut. Final step shows DONE (full accent fill) instead of NEXT. X/SKIP always visible in callout bubble header row on every single step, no exceptions.

**Progress indicators**: Dots (●●○○○) for tutorials with 6 or fewer steps. "X of Y" text for tutorials with 7 or more steps. Auto-driven at render time based on step count.

**Overlay visual**: Scrim `rgba(2,6,20,0.88)`. Spotlight cutout has 1.5px accentBlueRaw ring at 60% opacity around the edge. Callout bubble: bgCard `#1a1a24`, 1.5px accent top border, 14px borderRadius, SVG arrow pointer toward spotlight element.

**Bubble auto-positioning**: Space above vs below spotlight determines placement. Bubble goes below if >= 160px available, above otherwise. Minimum 16pt margin from screen edges. Tab bar (64pt) treated as off-limits -- never render bubble over it.

**Transitions**: Entry: scrim fades in 250ms, bubble slides up + fades in 300ms spring (100ms delay). Between steps: bubble fades out 150ms, cutout animates to new position via Reanimated withSpring, bubble fades in 150ms after cutout settles. Exit: bubble fades + scales to 0.88 (180ms), scrim fades out (200ms). All on UI thread via Reanimated.

---

## WHAT DOES NOT GET A TUTORIAL

Explicitly confirmed no tutorial needed:
- Today's Message card
- Water card
- Steps card
- Reading Plans card
- Today's Thoughts card
- My Foods tab (self-explanatory)
- Favorites tab (self-explanatory -- covered in Logging Food tutorial)
- Bible reader
- Journal screen
- Weight card (toolkit only)
- Today's Training card (toolkit only)
- Fitness Metrics card (toolkit only)
- Gratitude Streak card (toolkit only)
