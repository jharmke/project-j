// functions/src/ottoCannedAnswers.ts
//
// PLAN.md 4.8. Every answer here costs ZERO -- no API call is made when one of these fires.
//
// ⚠️ HOUSE RULES, ALL THREE ENFORCED BY THE TEST HARNESS (`_canned_audit.cjs`):
//  1. NO DASHES OF ANY KIND joining two thoughts. No em dash, no en dash, no double hyphen, no spaced
//     hyphen. Hyphens INSIDE a compound word ("7-day", "top-right", "one-time") are fine and stay.
//     Justin, 2026-08-05: "THERE CANNOT BE ANY DASHES OR AI-ISMS ANYWHERE."
//  2. EVERY `route` MUST BE ONE OF THE 26 REAL KEYS. Inventing one renders a button that goes nowhere.
//  3. EVERY NAVIGATION PATH MUST STILL EXIST VERBATIM IN `assistantAppKnowledge.ts`. This is the staleness
//     guard: move a feature, update the KB, and the assertion fails and names the answer that now lies.
//     Written by hand for VOICE (Justin's call: a terse KB index line straight after a warm AI reply reads
//     like a vending machine), so this check is what buys back the single-source-of-truth we gave up.
//
// ⚠️ WHERE TWO QUESTIONS HAVE OVERLAPPING ANSWERS, MERGE THEM INTO ONE ENTRY rather than splitting.
// "How do I build a recipe" and "how do I log a recipe" are the classic pair, and two near-identical
// entries is exactly how the wrong one of ~177 gets returned. One entry that covers both cannot collide.
//
// ⚠️ US SPELLING. The app says "color", not "colour".

import type { CannedAnswer } from './ottoCannedMatcher';

const S = (free: string, sup: string) => (c: { supporter: boolean }) => (c.supporter ? sup : free);

// ─────────────────────────────────────────────────────────────────────────────
// NAVIGATION. The KB's own "COMMON HOW DO I" index, voiced.
// ─────────────────────────────────────────────────────────────────────────────
const NAV: CannedAnswer[] = [
  {
    id: 'nav.theme',
    requires: [['theme', 'color', 'appearance', 'dark mode']],
    covers: ['change', 'switch', 'accent', 'light', 'colors', 'set'],
    excludes: ['font', 'text size'],
    route: 'appearance',
    answer:
      "Open Profile from your avatar in the top-left, tap the settings icon top-right, then Appearance. There are five themes (Light, Dark, Slate, Warm and Blush) and each one has its own color options.",
  },
  {
    id: 'nav.goals',
    requires: [['goal', 'target'], ['calorie', 'macro', 'water', 'step', 'sleep', 'change', 'set', 'edit']],
    covers: ['daily', 'update', 'protein', 'carbs', 'fat', 'nutrition'],
    excludes: ['weight goal', 'goal weight', 'pace'],
    route: 'goals',
    // ⚠️ MODE BRANCH: the Home Macros card is hidden in Mindful, so pointing at it would send a Mindful
    // user to something that is not on their screen. See PLAN.md 4.8 hole 4.
    answer: (c) =>
      c.styleMode === 'mindful'
        ? "Profile > Settings > Goals. Your calorie target, macro goals, water, step and sleep goals all live there."
        : "Profile > Settings > Goals. Your calorie target, macro goals, water, step and sleep goals all live there. Macros can also be reached from the gear on the Home Macros card.",
  },
  {
    id: 'nav.netcarbs',
    // ⚠️ NEEDS AN ACTION WORD. Without one, 'what counts as a net carb' tied with the DEFINITION answer
    // and both were sent to Otto. The nav answer is only right when they want to switch it on or off.
    requires: [['net carb', 'net carbs'], ['turn', 'switch', 'enable', 'disable', 'where', 'change', 'set']],
    covers: ['mode', 'on', 'off'],
    excludes: ['mean', 'difference', 'what is', 'whats a', 'counts'],
    route: 'goals',
    // ⚠️ MODE BRANCH: Macros card hidden in Mindful.
    answer: (c) =>
      c.styleMode === 'mindful'
        ? "Profile > Settings > Goals has a Net Carbs Mode switch. With it on, your carb goal becomes a net carb target and the labels read Net Carbs."
        : "Profile > Settings > Goals has a Net Carbs Mode switch, and the gear on the Home Macros card has the same one. With it on, your carb goal becomes a net carb target and the labels read Net Carbs.",
  },
  {
    id: 'nav.coachingmode',
    requires: [['coaching', 'discipline', 'mindful', 'balanced', 'style']],
    covers: ['mode', 'change', 'switch', 'tone'],
    excludes: ['what is', 'whats', 'mean'],
    route: 'faith_style',
    answer:
      "Profile > Settings > Faith & Style. That is where you switch between Discipline, Balanced and Mindful.",
  },
  {
    id: 'nav.faithtoggle',
    requires: [['faith'], ['turn', 'hide', 'disable', 'enable', 'off', 'on', 'remove']],
    covers: ['features', 'stuff', 'journey', 'rooted', 'exploring'],
    route: 'faith_style',
    answer:
      "Profile > Settings > Faith & Style. Your Faith Journey setting is there, and switching it to Not Right Now hides the faith features entirely.",
  },
  {
    id: 'nav.applehealth',
    requires: [['apple health', 'healthkit', 'health permission']],
    covers: ['connect', 'disconnect', 'turn', 'change', 'access', 'permissions', 'allow', 'sync'],
    answer:
      "That one is Apple's, not ours, so it cannot be changed inside GoodForge. Open the iPhone Settings app, then Privacy & Security > Health > GoodForge, and switch the data types on or off there.",
  },
  {
    id: 'nav.weightgoal',
    requires: [['weight goal', 'goal weight', 'pace']],
    covers: ['set', 'change', 'weekly', 'target', 'projected'],
    route: 'profile',
    answer:
      "Your goal weight and weekly pace are in the Weight Goal section on your Profile.",
  },
  {
    id: 'nav.logweight',
    requires: [['weight'], ['log', 'record', 'enter', 'add', 'track', 'weigh']],
    covers: ['in', 'today', 'card'],
    excludes: ['goal', 'history', 'edit', 'delete', 'past', 'starting'],
    route: 'home',
    answer:
      "The Weight card on your Home tab is where weight gets logged. If you do not see it, add it from the grid icon in the Home header under Edit Layout. Profile only displays your latest weight, it does not log it.",
  },
  {
    id: 'nav.weighthistory',
    requires: [['weigh', 'weight'], ['edit', 'delete', 'fix', 'correct', 'history', 'past', 'starting', 'back']],
    covers: ['in', 'change', 'wrong', 'date', 'entry', 'old'],
    route: 'home',
    answer:
      "Open the Weight card on Home and tap its gear to get Weight History. You can edit or delete any past weigh-in there, correct your starting weight, or add a back-dated one. Your starting weight is simply your earliest entry.",
  },
  {
    id: 'nav.logfood',
    requires: [['food', 'meal', 'eat', 'breakfast', 'lunch', 'dinner'], ['log', 'add', 'track', 'record', 'enter']],
    covers: ['diary', 'today', 'slot'],
    excludes: ['recipe', 'water', 'weight', 'custom', 'photo', 'clear', 'repeat', 'past', 'yesterday', 'slot', 'how many', 'limit'],
    route: 'log',
    answer:
      "On the Log tab, tap the plus sign to the left of a mealtime card. That opens Add Food, where you can search, scan a barcode, or use the AI estimator. You can also go through the Library button and add a food to a meal from there.",
  },
  {
    id: 'nav.barcode',
    requires: [['barcode', 'scan', 'scanner']],
    covers: ['food', 'product', 'package'],
    excludes: ['label', 'nutrition label'],
    route: 'log',
    answer:
      "Open Add Food from the plus sign next to a meal on your Log tab, then tap the barcode icon in the header.",
  },
  {
    id: 'nav.estimator',
    requires: [['estimator', 'ai estimate', 'photo of my', 'estimate my meal', 'ai meal']],
    covers: ['use', 'food', 'photo', 'picture', 'meal'],
    route: 'log',
    answer:
      "Three ways in: the AI icon in the Add Food header, the estimator card on your Log tab, or the plus button in the Food Library. Snap a photo or describe the meal and you get an editable breakdown before anything is logged.",
  },
  {
    id: 'nav.repeatmeal',
    requires: [['repeat', 'find a meal', 'same meal', 'save as meal', 'meal catalog']],
    covers: ['yesterday', 'again', 'previous', 'past', 'day', 'meal', 'log', 're'],
    route: 'log',
    answer:
      "Expand the meal slot on your Log tab by tapping its name, and the controls appear inside. Repeat Yesterday re-logs yesterday's version of that meal in one tap. Find a Meal opens a picker with your last 14 days on one tab and your saved meals on the other, so you can pick and choose items. Save as Meal, on a slot that already has food in it, is how you build that saved list.",
  },
  {
    id: 'nav.clearmeal',
    requires: [['clear'], ['meal', 'slot', 'everything', 'all']],
    covers: ['remove', 'delete', 'whole', 'once', 'entries'],
    route: 'log',
    answer:
      "Expand that meal on your Log tab and tap Clear all at the bottom of its item list. It confirms first, then removes only that meal's entries for the day. It never touches the meal's photo or anything in your saved meals.",
  },
  {
    id: 'nav.recipe',
    requires: [['recipe']],
    covers: ['build', 'create', 'make', 'log', 'add', 'save', 'ingredients', 'new'],
    excludes: ['photo', 'unit', 'portion', 'weight', 'how many', 'limit', 'can i save', 'can i have'],
    route: 'log',
    answer:
      "Go to your Log tab, tap Library, then the plus in the bottom corner and choose Create Recipe. Add your ingredients, adjust the amounts, and save it with a name. After that you can log it any time from the Recipes tab when you add food to a meal.",
  },
  {
    id: 'nav.customfood',
    requires: [['custom food', 'own food', 'create food', 'my foods']],
    covers: ['make', 'add', 'build', 'new', 'save'],
    excludes: ['how many', 'limit'],
    route: 'log',
    answer:
      "Log tab > Library, then the plus button, then Create Food. The serving amount has a unit dropdown covering weight and volume, and there is a Scan Nutrition Label button in there if you would rather photograph the panel than type it.",
  },
  {
    id: 'nav.logwater',
    requires: [['water'], ['log', 'add', 'track', 'record', 'drink']],
    covers: ['intake', 'oz', 'today'],
    excludes: ['goal', 'edit', 'delete', 'preset'],
    route: 'home',
    answer:
      "The Water card has quick-add buttons, and it sits on both your Home tab and your Log tab. They are the same card, so use whichever you are already on.",
  },
  {
    id: 'nav.editwater',
    requires: [['water'], ['edit', 'delete', 'remove', 'wrong', 'fix', 'preset']],
    covers: ['entry', 'log', 'amount', 'change'],
    route: 'home',
    answer:
      "Open the water log from the Water card and tap the pencil on the entry to edit or delete it. The quick-add amounts themselves are edited from the gear on that same card.",
  },
  {
    id: 'nav.loglift',
    requires: [['lift', 'set', 'exercise', 'workout'], ['log', 'record', 'enter', 'track', 'add']],
    covers: ['reps', 'weight', 'today', 'session'],
    excludes: ['routine', 'program', 'library', 'custom', 'past', 'yesterday', 'history'],
    route: 'workout',
    answer:
      "The lifting log on your Workout tab. Enter the weight and reps for a set and tap the check. Your sets save the moment you check them, so there is nothing else to press.",
  },
  {
    id: 'nav.homecards',
    requires: [['home'], ['card', 'layout', 'rearrange', 'reorder', 'hide', 'add']],
    covers: ['screen', 'tab', 'move', 'edit', 'remove', 'customize'],
    route: 'home',
    answer:
      "Tap the grid icon in the Home header to open Edit Layout. My Cards reorders and hides what you already have, and Add Cards brings in the hidden ones like Macros, Weight, Daily Note, Challenge and Gratitude Streak.",
  },
  {
    id: 'nav.mealslots',
    requires: [['meal slot', 'meal name', 'rename meal', 'edit meals']],
    covers: ['add', 'change', 'reorder', 'customize', 'breakfast', 'lunch', 'dinner'],
    excludes: ['how many', 'limit', 'photo'],
    route: 'log',
    answer:
      "Tap the grid icon in the Log tab header to open Edit Meals. You can rename, reorder and add slots there.",
  },
  {
    id: 'nav.statsgraph',
    requires: [['graph', 'chart', 'trend']],
    covers: ['add', 'edit', 'remove', 'change', 'stats', 'metric', 'new'],
    excludes: ['how many', 'limit'],
    route: 'stats',
    answer:
      "On the Stats tab, use the grid icon for Edit Layout or the plus button in the corner. Each graph card gets its own metric, period and chart type.",
  },
  {
    id: 'nav.fasting',
    requires: [['fasting', 'fast', 'intermittent']],
    covers: ['track', 'start', 'end', 'window', 'if', 'log'],
    route: 'log',
    answer:
      "The IF card on your Log tab. Start and end your fast there and set your target window. It keeps its state per day.",
  },
  {
    id: 'nav.achievements',
    requires: [['achievement', 'badge', 'trophy']],
    covers: ['see', 'view', 'earned', 'where', 'my', 'progress', 'list'],
    excludes: ['what is', 'how do i get'],
    route: 'achievements',
    answer:
      "The trophy icon in either your Profile header or your Stats header opens Achievements, with everything you have earned and your progress toward the rest.",
  },
  {
    id: 'nav.otto',
    requires: [['otto', 'you'], ['open', 'reach', 'find', 'talk', 'where', 'called', 'name']],
    covers: ['assistant', 'companion', 'chat', 'sparkle'],
    answer:
      "I am Otto, and I open from the sparkle button that floats on the main tabs.",
  },
  {
    id: 'nav.pastday',
    requires: [['past', 'previous', 'yesterday', 'last week', 'old', 'back'], ['day', 'date', 'data', 'meal', 'ate', 'food', 'history']],
    covers: ['see', 'view', 'look', 'check', 'review', 'calendar'],
    excludes: ['workout', 'weight', 'weigh'],
    route: 'home',
    answer:
      "Tap the calendar icon in the Home header to open Day Detail, then use the arrows or the calendar inside it to pick the date. That gives you the whole day: meals, sleep, recovery and the rest. The Log tab itself only ever shows today.",
  },
  {
    id: 'nav.sleephub',
    requires: [['sleep', 'recovery'], ['detail', 'hub', 'stage', 'see', 'view', 'where', 'trend', 'hypnogram']],
    covers: ['score', 'hrv', 'more', 'open'],
    excludes: ['goal', 'achievement', 'badge', 'streak'],
    route: 'sleep_hub',
    answer:
      "Tap the Sleep & Recovery card on Home to open the hub. It has a Sleep side and a Recovery side, and any metric row opens a drill-down.",
  },
  {
    id: 'nav.challenge',
    requires: [['challenge']],
    covers: ['start', 'new', 'create', 'begin', 'set'],
    route: 'challenges',
    answer:
      "Stats > Challenges > New Challenge, or the plus button in the corner of the Stats tab.",
  },
  {
    id: 'nav.comparison',
    requires: [['compare', 'comparison']],
    covers: ['period', 'week', 'month', 'two', 'report', 'side'],
    route: 'comparison',
    answer:
      "Stats > Reports > New Comparison. It puts two equal-length periods side by side. The comparison report is part of the Supporter plan.",
  },
  {
    id: 'nav.evr',
    requires: [['effort vs results', 'evr', 'why my results', 'diagnostic']],
    covers: ['report', 'analysis', 'generate', 'run', 'open'],
    route: 'evr',
    answer:
      "Stats > Reports > Effort vs Results, then Generate Analysis. It is the deep read on why your results look the way they do.",
  },
  {
    id: 'nav.vacation',
    requires: [['vacation', 'trip', 'holiday', 'away']],
    covers: ['mode', 'pause', 'set', 'streak', 'scoring'],
    route: 'vacation',
    answer:
      "Profile > Settings > Vacation Mode. Set the date range and it pauses scoring, streaks and notifications while still capturing your data.",
  },
  {
    id: 'nav.notifications',
    requires: [['notification', 'reminder', 'alert', 'nudge']],
    covers: ['change', 'turn', 'off', 'on', 'settings', 'customize', 'stop', 'manage'],
    excludes: ['quiet', 'night', 'fewer', 'limit', 'blocked', 'denied', 'permission', 'not getting'],
    route: 'notifications',
    answer:
      "Profile > Settings > Notifications > Customize Notifications. Tapping an area like Nutrition, Fitness or Faith expands it so you can switch off a single reminder and keep the rest.",
  },
  {
    id: 'nav.quiethours',
    requires: [['quiet hours', 'at night', 'waking me', 'while i sleep', 'overnight']],
    covers: ['notification', 'stop', 'reminder', 'turn'],
    route: 'notifications',
    answer:
      "Profile > Settings > Notifications > Customize Notifications, then Quiet Hours. Nothing fires between the times you set.",
  },
  {
    id: 'nav.dailylimit',
    requires: [['fewer', 'too many', 'daily limit', 'less'], ['notification', 'reminder', 'nudge', 'alert']],
    covers: ['get', 'cut', 'reduce', 'overall'],
    route: 'notifications',
    answer:
      "Profile > Settings > Notifications > Customize Notifications, then Daily Limit. It caps the optional nudges. Streak protection, summaries and water still come through, because those are the ones worth keeping.",
  },
  {
    // 🔴 ADDED 2026-08-09. It was written and approved in `SPEC_otto_general_answers.md`, flagged there as
    // belonging in THIS library rather than the general one, and then never moved. The reconciliation
    // harness (`_general_reconcile.cjs`) found it: 147 of 148 approved answers were reachable and this was
    // the one nobody could get. ⚠️ An approved answer living only in a spec is invisible from every side.
    id: 'con.eatbackcalories',
    requires: [['eat back', 'eat them back', 'earn back', 'add back', 'exercise calories', 'burned calories',
                'calories i burned', 'active calories'],
               ['eat', 'back', 'count', 'add', 'should i', 'do i']],
    covers: ['exercise', 'workout', 'burn', 'burned', 'net', 'calories', 'calorie', 'my', 'them', 'again',
             'target', 'goal', 'does', 'how'],
    route: 'health',
    // ⚠️ MINDFUL BRANCH IS MANDATORY HERE, not stylistic: net calories are HIDDEN in Mindful, and the
    // canned-answer harness asserts that no answer names them without one.
    // ✅ Every fact below was verified in code 2026-08-09, not taken from a comment: the net-calorie rule
    // from `tooltipRegistry.ts`, the active-half-only rule from the KB, and the 100/90/80/70 options from
    // `settings.tsx`. The setting's on-screen heading is "Active Calorie Accuracy"; the section's collapsed
    // subtitle calls it "Burn Accuracy", which is why the heading is the wording used here.
    answer: (c) =>
      c.styleMode === 'mindful'
        ? 'On days with activity data, GoodForge already accounts for what you burned when it looks at your day, so your training is counted rather than something you add back by hand. If you think your watch overstates the burn, Active Calorie Accuracy at Profile > Settings > Health lets you scale it to 90, 80 or 70 percent. That correction applies to the active half only, since your resting burn is a formula off your own weight, age and sex and there is nothing there to correct.'
        : 'On days with activity data, GoodForge judges your day on net calories: your food minus your active burn minus the resting burn your body has earned. So your training is already counted rather than something you add back by hand. If you think your watch overstates the burn, Active Calorie Accuracy at Profile > Settings > Health lets you scale it to 90, 80 or 70 percent. That correction applies to the active half only, since your resting burn is a formula off your own weight, age and sex and there is nothing there to correct.',
  },
  {
    id: 'nav.membership',
    requires: [['membership', 'support the mission', 'subscribe', 'upgrade', 'tip jar']],
    covers: ['where', 'how', 'support', 'plan', 'become', 'join', 'manage'],
    excludes: ['cost', 'price', 'cancel', 'refund', 'tip', 'how much'],
    route: 'profile',
    answer:
      "Profile > Membership, or Settings > Membership, opens the Support the Mission screen. Both the Supporter plan and the one-time tip jar live there, along with Restore Purchases if you are on a new device.",
  },
  {
    id: 'nav.versrotation',
    requires: [['verse'], ['rotation', 'daily message', 'add', 'todays message']],
    covers: ['my', 'own', 'set', 'sun'],
    excludes: ['favorite', 'favourite', 'star', 'save'],
    route: 'bible',
    answer:
      "In the Bible reader, highlight a verse and tap the sun icon on the action bar. That adds it to your daily rotation.",
  },
  {
    id: 'nav.favoriteverse',
    requires: [['verse'], ['favorite', 'favourite', 'star', 'save', 'bookmark']],
    covers: ['add', 'keep'],
    route: 'bible',
    answer:
      "Highlight the verse in the Bible reader and tap the star icon. Star saves it to Favorites, sun adds it to your daily rotation, and they are two different things.",
  },
  {
    id: 'nav.prayer',
    requires: [['prayer', 'pray']],
    covers: ['add', 'log', 'request', 'new', 'submit', 'record'],
    excludes: ['achievement', 'badge', 'notification', 'reminder'],
    route: 'prayer',
    answer:
      "Faith tab > Prayer, then the plus button. A modal opens where you write it, and it saves to your active prayers as soon as you submit.",
  },
  {
    id: 'nav.feedback',
    requires: [['feedback', 'report a bug', 'bug', 'suggestion', 'contact']],
    covers: ['send', 'submit', 'give', 'leave', 'how'],
    route: 'settings',
    answer:
      "Profile > Settings > Help > Feedback. It sends from inside the app, you can attach a photo, and there is no email needed.",
  },
  {
    id: 'nav.textsize',
    // ⚠️ TWO GROUPS, not one phrase. Nobody types 'text size'; they type 'the text is too small'.
    requires: [['text', 'font'], ['size', 'small', 'big', 'large', 'tiny', 'read', 'change']],
    covers: ['too', 'accessibility', 'bigger', 'smaller', 'larger'],
    route: 'settings',
    answer:
      "Profile > Settings, then Accessibility > Text Size, with Default and Large to choose from. GoodForge deliberately does not follow your iPhone's system text size, because following it without limit broke layouts, so this control is the only way to change it here.",
  },
  {
    id: 'nav.body',
    requires: [['body measurement', 'waist', 'tape measure', 'body fat', 'measurements']],
    covers: ['log', 'add', 'record', 'track', 'where', 'see', 'navy'],
    route: 'body',
    answer:
      "Stats tab > Body section, then the Body Measurements card. The card opens the full screen, and the Log button on it jumps straight to logging.",
  },
  {
    id: 'nav.journal',
    requires: [['journal', 'reflection']],
    covers: ['see', 'where', 'read', 'find', 'entries', 'my'],
    excludes: ['achievement', 'badge'],
    route: 'journal',
    answer:
      "The journal icon in the Stats or Faith header opens your reflections and gratitude entries.",
  },
  {
    id: 'nav.plans',
    requires: [['reading plan', 'devotional']],
    covers: ['start', 'add', 'find', 'where', 'open', 'new'],
    route: 'plans',
    answer:
      "The Plans hub, reachable from the Faith tab. Reading plans and devotionals both live there, and there is no daily lock on either, so you can mark a day read whenever you actually read it.",
  },
  {
    id: 'nav.halo',
    requires: [['halo']],
    covers: ['who', 'what', 'talk', 'open', 'where', 'reach', 'faith', 'companion'],
    route: 'faith',
    answer:
      "Halo is the faith companion, and she opens from the gold cross button on the Faith tab. Faith conversation, scripture and prayer are hers rather than mine.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// CONCEPTUAL. "What is / how does this work", one true answer.
// ─────────────────────────────────────────────────────────────────────────────
const CONCEPT: CannedAnswer[] = [
  {
    id: 'con.programroutine',
    requires: [['program'], ['routine']],
    covers: ['difference', 'between', 'vs', 'versus', 'same'],
    route: 'workout',
    answer:
      "A program is a saved 7-day schedule. It sets what each day is (lift, cardio or rest) and what it is called, like Push or Pull, but it holds no exercises at all. Loading one changes the day labels along the top of your Workout tab. A routine is a saved set of exercises, and that is what actually puts lifts on your screen. So the program is the shape of your week, the routine is what you lift.",
  },
  {
    id: 'con.pr',
    requires: [['pr', 'personal record', '1rm', 'one rep max', 'rep max']],
    covers: ['what', 'lift', 'record', 'best', 'estimated', 'where', 'see', 'find', 'heaviest'],
    excludes: ['step', 'water', 'sleep', 'active'],
    route: 'pr_home',
    answer:
      "A PR is a new best on a lift, tracked automatically the moment you check a qualifying set. Two things count: your heaviest set for a given rep count, and your estimated 1-rep max, which is what you could lift for one all-out rep worked out from a set you actually did. To see them, open the Exercise Library from your Workout tab and tap the PRs button. Stats > Records is a different thing, that one is steps, water, sleep and active calories only.",
  },
  {
    id: 'con.statsrecords',
    requires: [['records'], ['stats']],
    covers: ['what', 'section', 'best', 'where'],
    excludes: ['lift', 'pr', 'bench', 'squat'],
    route: 'stats',
    answer:
      "The Records section on Stats holds your all-time single-day bests for steps, active calories, water and sleep hours, each with the date it was set. Lift PRs are separate and live in the Exercise Library.",
  },
  {
    id: 'con.netcarbsmeaning',
    requires: [['net carb', 'net carbs'], ['what', 'mean', 'difference', 'calculated']],
    covers: ['is', 'total', 'fiber', 'fibre'],
    answer:
      "Net carbs are total carbs minus fiber and sugar alcohols. Both come off, not just fiber.",
  },
  {
    id: 'con.burned',
    requires: [['burned', 'burn'], ['high', 'why', 'already', 'without', 'sitting', 'nothing']],
    covers: ['calories', 'so', 'much', 'active'],
    answer:
      "Most of it is your resting burn rather than exercise. Burned is your active calories plus the resting burn you have earned since midnight, prorated by the time of day, so it climbs all day even sitting still.",
  },
  {
    id: 'con.sleepnight',
    requires: [['night'], ['filed', 'which day', 'wrong day', 'shows up', 'counted', 'missing']],
    covers: ['sleep', 'tuesday', 'last', 'under'],
    answer:
      "A night is filed under the day you woke up, everywhere in the app. So Tuesday night, the night you go to bed on Tuesday, lives under Wednesday, and last night lives under today.",
  },
  {
    id: 'con.nutrientdrilldown',
    requires: [['nutrient', 'vitamin', 'mineral', 'magnesium', 'iron', 'sodium'], ['detail', 'drilldown', 'more', 'about', 'read', 'tap', 'where']],
    covers: ['info', 'sources', 'matters', 'what'],
    route: 'log',
    // ⚠️ MODE BRANCH: Macros card hidden in Mindful, so only the Log tab route is offered there.
    answer: (c) =>
      c.styleMode === 'mindful'
        ? "Tap a macro ring or any Advanced Nutrition row on your Log tab. The drill-down shows which of your foods contributed, then what that nutrient does and where to get it. It is written up for all 33 tracked nutrients. The Stats tab graphs nutrients over time but carries none of that written content."
        : "Tap a macro ring or any Advanced Nutrition row on your Log tab, or a macro ring on the Home Macros card. The drill-down shows which of your foods contributed, then what that nutrient does and where to get it. It is written up for all 33 tracked nutrients. The Stats tab graphs nutrients over time but carries none of that written content.",
  },
  {
    id: 'con.bibletranslation',
    requires: [['translation', 'kjv', 'web', 'version'], ['bible']],
    covers: ['change', 'switch', 'which', 'read'],
    route: 'bible',
    answer:
      "The Bible reader has the World English Bible, which is the default, and the King James Version. Switch between them from the reading settings gear in the header.",
  },
  {
    id: 'con.sunstar',
    requires: [['sun'], ['star']],
    covers: ['icon', 'difference', 'verse', 'between', 'vs'],
    route: 'bible',
    answer:
      "Sun adds a verse to your daily rotation. Star saves it to Favorites. Two different features that sit next to each other on the same action bar.",
  },
  {
    id: 'con.notifpermission',
    requires: [['notification'], ['blocked', 'denied', 'not getting', 'never got', 'not working', 'permission']],
    covers: ['any', 'receive', 'prompt', 'ask', 'fix'],
    answer:
      "That is iOS holding the permission rather than anything in the app. Open the iPhone Settings app, then Notifications > GoodForge, and switch Allow Notifications on. iOS only ever asks once, so toggling the switch inside GoodForge will not re-prompt you. This has nothing to do with the Health permissions under Privacy & Security.",
  },
  {
    id: 'con.rateprompt',
    requires: [['rate', 'rating', 'review'], ['ask', 'asking', 'why', 'prompt', 'keep']],
    covers: ['app', 'store', 'me'],
    answer:
      "That is Apple's own rating prompt, and the app asks only occasionally, tied to genuinely good moments like hitting a goal. GoodForge cannot see what rating you gave, or even whether you gave one, and Apple caps how often it can appear regardless.",
  },
  {
    id: 'con.navybf',
    requires: [['body fat'], ['accurate', 'how', 'calculated', 'navy', 'work', 'estimate']],
    covers: ['percentage', 'measured', 'what'],
    route: 'body',
    answer:
      "It is the Navy method, worked out from your tape measurements rather than a scan. That makes it useful for tracking a direction over time, but it can be off by a few points and it is not a clinical measurement like a DEXA.",
  },
  {
    id: 'con.labelscan',
    requires: [['nutrition label', 'scan label', 'label scan']],
    covers: ['scan', 'photo', 'read', 'how', 'use', 'work'],
    route: 'log',
    answer:
      "Inside Create Food or Edit Food, tap Scan Nutrition Label and photograph the panel. It reads on-device with no internet needed and opens a review card before anything saves, with an amber border on anything it wants you to check. Get close but keep the whole panel in frame, and flat boxes read better than shiny or curved packages.",
  },
  {
    id: 'con.percentdv',
    requires: [['%dv', 'percent daily value', 'daily value', 'percentage on the label']],
    covers: ['enter', 'type', 'only', 'label', 'vitamin'],
    answer:
      "Every nutrient with an official daily value has one box split in two in Create Food and Edit Food: the amount on the left, the percent on the right. Type either one and the other fills itself in. The amount is what gets stored.",
  },
  {
    id: 'con.weeklytemplate',
    requires: [['weekly template']],
    covers: ['what', 'is', 'change', 'edit', 'program'],
    route: 'workout',
    answer:
      "The weekly template is the one schedule currently live on your Workout tab. Loading a program replaces it, and you can also edit it directly. There is only ever one.",
  },
  {
    id: 'con.hrzones',
    requires: [['hr zone', 'heart rate zone', 'zones']],
    covers: ['see', 'where', 'what', 'workout', 'view'],
    route: 'workout',
    answer:
      "Tap a completed Apple Health cardio row on your Workout tab to open the HR Zones view for that session, with time-in-zone bars and a written debrief. The aggregate across sessions sits in the Body section on Stats.",
  },
  {
    id: 'con.dayscore',
    requires: [['day score', 'dayscore']],
    covers: ['what', 'is', 'made', 'calculated', 'mean', 'composed'],
    answer:
      "Your Day Score is a single number out of 100 built from three areas: Nutrition, Recovery and Activity.",
  },
  {
    id: 'con.mealphoto',
    requires: [['photo'], ['meal', 'slot']],
    covers: ['add', 'take', 'where', 'one', 'per', 'day', 'remove'],
    excludes: ['recipe', 'profile', 'food photo'],
    route: 'log',
    answer:
      "Each meal slot holds one photo per day, separate from any individual food's photo. Expand the meal on your Log tab and the photo control is in the tray. Clearing the meal's food never removes the photo, and removing the photo never touches the food.",
  },
  {
    id: 'con.barcodeset',
    requires: [['barcode'], ['set', 'link', 'unset', 'wrong food', 'assign']],
    covers: ['always', 'opens', 'change', 'own'],
    route: 'log',
    answer:
      "Open the food you want it to point at and use the button in the Food Detail header. It reads Set when nothing is linked and Unset when something is. After that, scanning that barcode always opens that food.",
  },
  {
    id: 'con.offlinefood',
    requires: [['offline', 'no internet', 'no connection', 'no wifi']],
    covers: ['food', 'search', 'log', 'work', 'database'],
    answer:
      "Food search needs a connection, so offline you get a message saying the food database cannot be reached. The rest of the app keeps working, and label scanning reads entirely on-device.",
  },
  {
    id: 'con.allergies',
    requires: [['allerg', 'food to avoid', 'dietary', 'diet setting']],
    covers: ['what', 'does', 'where', 'set', 'add', 'record', 'section', 'profile'],
    route: 'profile',
    answer:
      "Food & Allergies is a section on your Profile, just under Basic Info. It is not in Settings. What it does is exactly one thing: it tells me, so I never suggest something you cannot eat. It does not filter the food database, flag anything in search, check barcodes, or change the Log tab in any way.",
  },
  {
    id: 'con.mindfulmode',
    requires: [['mindful'], ['what', 'mean', 'does', 'different', 'changes']],
    covers: ['mode', 'coaching', 'style'],
    route: 'faith_style',
    answer:
      "Mindful is one of the three coaching modes. It is warm and observational, with no judgment language, no score bars or countdowns, and no calorie deficit maths or weight-loss prescriptions. Scores and metrics stay as neutral information rather than a grade.",
  },
  {
    id: 'con.faithtiers',
    requires: [['faith journey', 'rooted', 'exploring', 'not right now']],
    covers: ['what', 'mean', 'difference', 'tier', 'setting'],
    route: 'faith_style',
    answer:
      "Three settings. Rooted gives you the full faith experience. Exploring keeps faith present but gentle, with the verse shown and no prompts. Not Right Now hides the faith features entirely, no Faith tab and no Halo, with no judgment either way.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// MONEY AND POLICY. ⚠️ Every naming rule from the KB applies: always "the Supporter plan", never bare
// "Supporter"; the faith promise stands on its own sentence and is NEVER joined to the allowance with "but".
// ─────────────────────────────────────────────────────────────────────────────
const MONEY: CannedAnswer[] = [
  {
    id: 'money.price',
    requires: [['cost', 'price', 'how much', 'expensive', 'pay']],
    covers: ['supporter', 'plan', 'subscription', 'month', 'year', 'is', 'it'],
    excludes: ['tip', 'cancel', 'refund'],
    route: 'profile',
    answer:
      "The Supporter plan is $9.99 a month or $89.99 a year. It is a recurring subscription with no free trial, and you can manage it from Profile > Membership. There is also a one-time tip jar on that same screen, anywhere from $2.99 to $49.99, if you would rather support that way.",
  },
  {
    id: 'money.tipjar',
    requires: [['tip', 'donate', 'donation', 'one time']],
    covers: ['jar', 'amount', 'how much', 'give', 'support', 'once'],
    route: 'profile',
    answer:
      "The tip jar is on Profile > Membership, under Support the Mission. Five amounts: $2.99, $4.99, $9.99, $24.99 and $49.99. No features are attached, it is purely a thank you, and you get the Supporter badge for it. You can tip without subscribing.",
  },
  {
    id: 'money.restore',
    requires: [['restore', 'new phone', 'reinstall', 'new device'], ['purchase', 'subscription', 'supporter', 'paid']],
    covers: ['back', 'lost', 'my', 'get'],
    route: 'profile',
    answer:
      "Restore Purchases is on the Support the Mission screen, reached from Profile > Membership.",
  },
  {
    id: 'money.cancel',
    requires: [['cancel', 'unsubscribe', 'stop paying', 'lapse']],
    covers: ['what', 'happens', 'lose', 'keep', 'if', 'when'],
    answer:
      "Nothing you have made is ever deleted. If you are over a free limit you keep everything, you just cannot add more until you are back under it. The only two things that change are extra meal slots and extra Stats graphs, which go dormant. Even those come straight back if you subscribe again, and anything logged into them stays in your history.",
  },
  {
    id: 'money.whatsfree',
    requires: [['free'], ['what', 'which', 'included', 'get', 'anything', 'is']],
    covers: ['plan', 'app', 'features', 'cost'],
    excludes: ['trial', 'messages', 'limit'],
    route: 'profile',
    answer:
      // ⚠️ "including their coaching" IS STILL TRUE AND IS DELIBERATE (PLAN.md 1.9). Free users get every
      // coaching insight on every surface. What the Supporter plan changes is that the coach reads their
      // ACTUAL numbers rather than describing the pattern in general terms, which is why it is listed below
      // as something the plan adds and NOT removed from the free list above.
      "Most of it. Barcode scanning, food logging and macro tracking, workouts, stats, sleep and recovery scores, every faith feature, Smart Coach tips, and all the Day, Weekly and Monthly summaries including their coaching. The Supporter plan adds coaching written from your own numbers, custom reports, comparisons, the deeper Effort vs Results cards, bigger AI allowances, and it lifts the limits on how much you can create.",
  },
  {
    id: 'money.faithfree',
    requires: [['faith', 'halo', 'bible', 'prayer'], ['pay', 'paid', 'free', 'cost', 'paywall', 'locked']],
    covers: ['is', 'do', 'have', 'to', 'anything'],
    answer:
      "Faith is never paywalled. Halo and every faith feature are free for everyone, always, and nothing faith-related is ever locked. Supporters simply get a larger daily allowance with Halo, 30 instead of 10, the same as with me.",
  },
  {
    id: 'money.aiallowance',
    requires: [['message', 'allowance', 'quota'], ['how many', 'limit', 'day', 'get', 'left', 'cap']],
    covers: ['otto', 'halo', 'you', 'per', 'daily', 'reset'],
    answer: S(
      "5 a day with me, and 10 a day with Halo. They reset each day. The Supporter plan raises both to 30.",
      "30 a day with me, and 30 a day with Halo. They reset each day.",
    ),
  },
  {
    id: 'money.estimatorcap',
    requires: [['estimator', 'ai estimate', 'meal estimate', 'photo estimate'], ['how many', 'limit', 'month', 'get', 'cap', 'left']],
    covers: ['ai', 'meal', 'per', 'monthly'],
    answer: S(
      "5 a month on the free plan. The Supporter plan takes that to 100.",
      "100 a month on the Supporter plan.",
    ),
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// CREATION LIMITS. Eight of them. ⚠️ The KB is explicit: asked about ONE, answer that one and STOP.
// Otto listed five when Justin asked about custom foods on 2026-08-05; the canned answer does not.
// ─────────────────────────────────────────────────────────────────────────────
const LIMIT_ROWS: { id: string; terms: string[]; free: string; label: string }[] = [
  { id: 'customfoods', terms: ['custom food', 'my foods', 'own food'], free: '20', label: 'custom foods' },
  { id: 'savedmeals', terms: ['saved meal', 'meal catalog', 'save a meal'], free: '5', label: 'saved meals' },
  { id: 'recipes', terms: ['recipe'], free: '5', label: 'recipes' },
  { id: 'routines', terms: ['routine'], free: '5', label: 'routines of your own' },
  { id: 'programs', terms: ['program'], free: '3', label: 'programs of your own' },
  { id: 'exercises', terms: ['custom exercise', 'exercise library', 'own exercise'], free: '15', label: 'custom exercises' },
];

const LIMITS: CannedAnswer[] = [
  ...LIMIT_ROWS.map(
    (r): CannedAnswer => ({
      id: `limit.${r.id}`,
      requires: [r.terms, ['how many', 'limit', 'max', 'cap', 'allowed', 'can i']],
      covers: ['get', 'have', 'make', 'create', 'save', 'store', 'do', 'i', 'many', 'plan', 'free'],
      answer: S(
        `${r.free} on the free plan. The Supporter plan makes ${r.label} unlimited.`,
        `Unlimited on the Supporter plan.`,
      ),
    }),
  ),
  {
    id: 'limit.mealslots',
    requires: [['meal slot'], ['how many', 'limit', 'max', 'cap', 'allowed', 'can i']],
    covers: ['get', 'have', 'add', 'do', 'i', 'many', 'plan', 'free'],
    answer: S(
      "5 on the free plan, which is the four the app starts you with plus one of your own. The Supporter plan takes that to 8. Meal slots are the one limit that does not go unlimited.",
      "8 on the Supporter plan.",
    ),
  },
  {
    id: 'limit.statsgraphs',
    requires: [['graph', 'chart'], ['how many', 'limit', 'max', 'cap', 'allowed', 'can i']],
    covers: ['get', 'have', 'add', 'stats', 'do', 'i', 'many', 'plan', 'free'],
    answer: S(
      "8 on the free plan, which is the seven the Stats tab ships with plus one of your own. The Supporter plan makes them unlimited.",
      "Unlimited on the Supporter plan.",
    ),
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// ACHIEVEMENTS. ⚠️ GENERATED FROM A TABLE, NOT WRITTEN OUT 99 TIMES. That is the single-source-of-truth
// principle applied where it actually fits: the criteria live in one place and the phrasing in another.
// ─────────────────────────────────────────────────────────────────────────────
type Fam = { unit: string; verb: string; badges: [string, number | null][] };
const ACHIEVEMENT_FAMILIES: Fam[] = [
  { unit: 'water', verb: 'hitting your water goal', badges: [['first sip', 1], ['hydrated', 10], ['bathtub', 30], ['half century', 50], ['relentless', 75], ['swimming pool', 100], ['high tide', 200], ["ol' reliable", 365]] },
  { unit: 'steps', verb: 'hitting your step goal', badges: [['first step', 1], ['getting moving', 10], ['heating up', 30], ['well worn', 50], ['no quit', 75], ['triple digits', 100], ['road warrior', 200], ['full circle', 365]] },
  { unit: 'weight lost', verb: 'losing', badges: [['showed up', null], ['just a little off the top', 5], ['picking up speed', 10], ['undeniable', 25], ['the big five-oh', 50], ["can't stop won't stop", 75], ['the century mark', 100], ['the summit', null]] },
  { unit: 'weight gained', verb: 'gaining', badges: [['loading', 5], ['heavy hitter', 10], ['bulk season', 25], ['built different', 50], ['iron will', 75], ['the gain train', 100]] },
  { unit: 'days in a row', verb: 'logging', badges: [['day one', 1], ['on a roll', 3], ['week warrior', 7], ['not a fluke', 14], ['unstoppable', 30], ['sixty strong', 60], ['all in', 90], ['six months strong', 180], ['unbroken', 365]] },
  { unit: 'workout days', verb: 'working out on', badges: [['first rep', 1], ['getting after it', 10], ['not a phase', 30], ['committed', 50], ['built for this', 75], ['proven', 100], ['still standing', 200]] },
  { unit: 'calorie-goal days', verb: 'hitting your calorie goal', badges: [['on point', 1], ['calibrated', 10], ['by the numbers', 30], ['on the dot', 50], ['the standard', 75], ['optimized', 100], ['unrelenting', 200], ['no cheat days', 365]] },
  { unit: 'green nights', verb: 'logging a sleep score of 85 or higher on', badges: [['green light', 1], ['night school', 10], ['deep sleeper', 30], ['sweet dreams', 50], ['sleep architect', 100], ['sleep surgeon', 200], ['sleep legend', 365]] },
  { unit: 'verse reflections', verb: 'writing', badges: [['marked', 1], ['regular reader', 10], ['saturated', 25], ['transformed', 50], ['fearfully and wonderfully made', 100], ['dwelling', 200], ['written in full', 365]] },
  { unit: 'prayers', verb: 'logging', badges: [['first words', 1], ['faithful asker', 10], ['steadfast', 25], ['open channel', 50], ['unceasing', 100], ['two hundred strong', 200], ['a year of prayer', 365]] },
  { unit: 'gratitude entries', verb: 'writing', badges: [['counting blessings', 7], ['overflow', 30], ['rooted in thanks', 100], ['deep well', 200], ['year of thanks', 365]] },
  { unit: 'reading plan days', verb: 'reading', badges: [['in the word', 7], ['planted', 30], ['deep cut', 50], ['through and through', 100], ['devoted', 200], ['year in the word', 365]] },
  { unit: 'journal entries', verb: 'writing', badges: [['first word', 1], ['consistent voice', 10], ['paper trail', 25], ['the plot thickens', 50], ['well documented', 100], ['chronicled', 200], ['the book', 365]] },
];

const SPECIAL_BADGES: Record<string, string> = {
  'showed up': 'Showed Up is the weight badge you earn for your very first weigh-in.',
  'the summit': 'The Summit is the weight badge for reaching your goal weight.',
  'lights out': 'Lights Out is the sleep badge for logging sleep for the first time.',
  'following the plan': 'Following the Plan is the workout badge for loading your first program.',
  'the blueprint': 'The Blueprint is the workout badge for saving your first routine.',
  '365': '"365" is the workout badge for working out on 365 days.',
};

function titleCase(s: string): string {
  return s.replace(/\b[a-z]/g, (m) => m.toUpperCase());
}

const ACHIEVEMENTS: CannedAnswer[] = [
  ...ACHIEVEMENT_FAMILIES.flatMap((fam) =>
    fam.badges
      .filter(([, n]) => n !== null)
      .map(([name, n]): CannedAnswer => ({
        id: `ach.${name.replace(/[^a-z0-9]+/g, '')}`,
        requires: [[name]],
        covers: ['what', 'is', 'how', 'get', 'earn', 'unlock', 'achievement', 'badge', 'mean', 'need', 'do'],
        route: 'achievements',
        answer:
          fam.unit === 'weight lost' || fam.unit === 'weight gained'
            ? `${titleCase(name)} is the achievement for ${fam.verb} ${n} lbs from where you started.`
            : `${titleCase(name)} is the achievement for ${fam.verb} on ${n} separate days.`,
      })),
  ),
  ...Object.entries(SPECIAL_BADGES).map(([name, text]): CannedAnswer => ({
    id: `ach.${name.replace(/[^a-z0-9]+/g, '')}`,
    requires: [[name]],
    covers: ['what', 'is', 'how', 'get', 'earn', 'unlock', 'achievement', 'badge', 'mean', 'do'],
    route: 'achievements',
    answer: text,
  })),
];

// ─────────────────────────────────────────────────────────────────────────────
// PLEASANTRIES. ⚠️ Each of these costs a full Support-route message today. Nobody had counted them and
// they are probably more frequent than any single how-to (PLAN 4.8).
// ─────────────────────────────────────────────────────────────────────────────
const PLEASANTRIES: CannedAnswer[] = [
  {
    id: 'plea.thanks',
    requires: [['thanks', 'thank you', 'thx', 'cheers', 'appreciate it', 'much appreciated']],
    covers: ['a lot', 'so', 'man', 'dude', 'bro', 'again', 'really'],
    answer: "Any time. Shout if you need anything else.",
  },
  {
    id: 'plea.greeting',
    requires: [['hi', 'hey', 'hello', 'yo', 'sup', 'good morning', 'good evening', 'good afternoon']],
    covers: ['there', 'otto', 'man', 'dude'],
    answer: "Hey. What can I help you with?",
  },
  {
    id: 'plea.ack',
    requires: [['got it', 'sounds good', 'will do', 'makes sense', 'perfect', 'awesome', 'nice one', 'cool']],
    covers: ['that', 'ok', 'okay', 'thanks'],
    answer: "Good stuff. I am here when you need me.",
  },
];

export const CANNED_ANSWERS: CannedAnswer[] = [
  ...NAV, ...CONCEPT, ...MONEY, ...LIMITS, ...ACHIEVEMENTS, ...PLEASANTRIES,
];
