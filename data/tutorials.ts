export interface TutorialStep {
  targetKey: string;
  title: string;
  body: { discipline: string; balanced: string; mindful: string };
  highlightPadding?: number;
  skipIfTargetMissing?: boolean;
  skipForModes?: ('discipline' | 'balanced' | 'mindful')[];
  navigateTo?: string;
  navigateDelay?: number;
  tutorialAction?: string;
  /** Set true for steps on screens that have no bottom tab bar (e.g. add-food, workout-library).
   *  Removes the TAB_H offset from isOffScreen so elements near the bottom of
   *  those screens are not falsely flagged as off-screen. */
  noTabBarOffset?: boolean;
  /** Skip the 4-panel scrim so underlying UI is fully visible. Use for steps that want
   *  the user to see screen content (e.g. edit layout card rows, add cards tab). */
  noDimOverlay?: boolean;
  /** Pin the tutorial bubble to the bottom of the screen (above the tab bar).
   *  Use alongside noDimOverlay so the bubble doesn't block the visible content. */
  bubbleAtBottom?: boolean;
  /** Scroll all registered scroll views to y=0 before measuring this step's target.
   *  Use when the target is always at the top of the scroll view but the user may
   *  have scrolled past it -- measureInWindow returns 0x0 for above-viewport elements. */
  scrollToTop?: boolean;
  // Card-specific visual override: forces a card to render a particular demo state
  // without touching any real data. Clear on tutorial end/skip to restore real state.
  ifCardState?: 'idle' | 'active' | 'eating';
  // When true, YvY card renders hardcoded demo values instead of real data.
  yvyDemo?: boolean;
}

export interface Tutorial {
  id: string;
  name: string;
  description: string;
  tab: 'home' | 'log' | 'workout' | 'stats' | 'profile' | 'settings' | 'faith';
  steps: TutorialStep[];
  // Optional action key fired before step 0 opens (inject demo data before overlay appears)
  preAction?: string;
  // Route to navigate to when the tutorial ends or is skipped (for tutorials that navigate away)
  returnRoute?: string;
}

export const TUTORIALS: Tutorial[] = [

  // ─── META-TUTORIAL ────────────────────────────────────────────────────────────
  {
    id: 'meta',
    name: 'App Orientation',
    description: 'Learn where to find help, tutorials, and definitions across the app.',
    tab: 'home',
    steps: [
      {
        targetKey: 'meta_toolkit_icon',
        title: 'YOUR TOOLKIT',
        body: {
          discipline: 'Every tab has a ? icon in the top-right. That\'s your toolkit. Tap it for definitions, context, and guided tours specific to that tab.',
          balanced: 'See the ? icon up here? Every tab has one. Tap it anytime you want help with what you\'re looking at.',
          mindful: 'That ? icon is always there when you need it. No pressure. Tap it whenever you\'re curious about something.',
        },
      },
      {
        targetKey: 'none',
        title: 'CARD HELP',
        body: {
          discipline: 'Cards with an (i) icon have detailed definitions. Some also have guided tours: look for the "Take a Tour" button inside the (i) modal.',
          balanced: 'Cards with a small (i) icon can explain themselves. Tap it for definitions and explanations. Some also offer a guided tour.',
          mindful: 'Some cards have a small (i) icon. Tap it whenever a card feels confusing. It explains what everything means at your own pace.',
        },
      },
      {
        targetKey: 'none',
        title: 'ALL TUTORIALS',
        body: {
          discipline: 'Every tutorial lives in Settings → Help → Tutorials. Go there to launch any tutorial again or explore ones you haven\'t tried.',
          balanced: 'All tutorials are in Settings → Help whenever you want them. You can replay any tutorial anytime.',
          mindful: 'Settings → Help has every tutorial, available whenever you\'re ready. You\'re in control of how and when you learn.',
        },
      },
    ],
  },

  // meta_mindful is not in TAB_TUTORIALS -- auto-selected via id resolver in index.tsx
  // when styleMode === 'mindful'. All body text is warm/neutral across all three modes
  // since only Mindful users ever reach this tutorial.
  {
    id: 'meta_mindful',
    name: 'App Orientation',
    description: 'A gentle introduction to your space and how the app works.',
    tab: 'home',
    steps: [
      {
        targetKey: 'none',
        title: 'YOUR SPACE',
        body: {
          discipline: 'This is your space. No scores, no judgment, just showing up. This app works for you, not the other way around.',
          balanced: 'This is your space. No scores, no judgment, just showing up. This app works for you, not the other way around.',
          mindful: 'This is your space. No scores, no judgment, just showing up. This app works for you, not the other way around.',
        },
      },
      {
        targetKey: 'none',
        title: 'YOUR CARDS',
        body: {
          discipline: 'These cards give you a gentle picture of your day. You don\'t have to track everything, just what feels right for you.',
          balanced: 'These cards give you a gentle picture of your day. You don\'t have to track everything, just what feels right for you.',
          mindful: 'These cards give you a gentle picture of your day. You don\'t have to track everything, just what feels right for you.',
        },
      },
      {
        targetKey: 'meta_toolkit_icon',
        skipIfTargetMissing: true,
        title: 'WHEN YOU\'RE CURIOUS',
        body: {
          discipline: 'The ? in each tab has guided tours for every feature. A good place to start is the Edit Layout tour. It shows you how to remove any card you don\'t want.',
          balanced: 'The ? in each tab has guided tours for every feature. A good place to start is the Edit Layout tour. It shows you how to remove any card you don\'t want.',
          mindful: 'The ? in each tab has guided tours for every feature. A good place to start is the Edit Layout tour. It shows you how to remove any card you don\'t want.',
        },
      },
      {
        targetKey: 'none',
        title: 'YOUR PACE',
        body: {
          discipline: 'There\'s no perfect way to use this app. Go at your own pace, and let it meet you where you are.',
          balanced: 'There\'s no perfect way to use this app. Go at your own pace, and let it meet you where you are.',
          mindful: 'There\'s no perfect way to use this app. Go at your own pace, and let it meet you where you are.',
        },
      },
    ],
  },

  // ─── HOME TAB ─────────────────────────────────────────────────────────────────

  {
    id: 'edit_layout',
    name: 'Edit Layout',
    description: 'Customize which cards appear on your home screen and in what order.',
    tab: 'home',
    steps: [
      {
        targetKey: 'edit_layout_btn',
        tutorialAction: 'openEditLayoutForTutorial',
        title: 'YOUR HOME LAYOUT',
        body: {
          discipline: 'That grid icon opens Edit Layout. Tap NEXT and we\'ll open it to walk through what\'s inside.',
          balanced: 'That grid icon opens Edit Layout. Tap NEXT and we\'ll open it together.',
          mindful: 'That grid icon opens Edit Layout. Tap NEXT and we\'ll walk through it whenever you\'re ready.',
        },
      },
      {
        targetKey: 'none',
        noDimOverlay: true,
        bubbleAtBottom: true,
        title: 'CARD ROWS',
        body: {
          discipline: 'Each row is one home screen card: name, description, and two controls. The badge on the left toggles visibility. The grip on the right reorders.',
          balanced: 'Each row here is a home screen card. It shows the name, a short description, and two controls. We\'ll walk through both.',
          mindful: 'Take a look. Each row is one of your home screen cards: a name, a description, and a couple of controls. We\'ll go through them together.',
        },
      },
      {
        targetKey: 'edit_layout_drag',
        skipIfTargetMissing: true,
        title: 'DRAG TO REORDER',
        body: {
          discipline: 'Long-press this grip icon and drag the row up or down to reorder that card on your home screen. Changes save the moment you lift.',
          balanced: 'Long-press this grip icon and drag to reorder the card. Changes save instantly.',
          mindful: 'Long-press this grip and drag to move the card wherever feels right. Rearrange freely.',
        },
      },
      {
        targetKey: 'edit_layout_eye',
        skipIfTargetMissing: true,
        tutorialAction: 'switchToAddCardsForTutorial',
        title: 'SHOW AND HIDE',
        body: {
          discipline: 'Tap this badge to toggle the card on or off. Red means it\'s showing, green means it\'s hidden. Zero effect on your data.',
          balanced: 'Tap this badge to hide or show the card. Hidden cards stay in the list but disappear from your home screen. Data is never affected.',
          mindful: 'Tap this badge to hide or show the card. Nothing is deleted. It steps back until you want it again.',
        },
      },
      {
        targetKey: 'none',
        noDimOverlay: true,
        bubbleAtBottom: true,
        title: 'ADD CARDS',
        body: {
          discipline: 'Add Cards shows your custom Stats graphs: pin any to the home screen. Hidden home cards also appear here so you can restore them.',
          balanced: 'Add Cards shows hidden home cards you can restore, plus custom Stats graphs you can pin to your home screen.',
          mindful: 'Add Cards is where hidden cards live and where you can pin Stats graphs to your home screen. Everything\'s here when you want it.',
        },
      },
    ],
  },

  {
    id: 'cal_card',
    name: 'Calories Card',
    description: 'How your daily calorie numbers work and what to do with them.',
    tab: 'home',
    steps: [
      {
        targetKey: 'cal_card_main',
        title: 'CALORIES TODAY',
        body: {
          discipline: 'Your calorie card is mission control. The big number is what you\'ve eaten; the number after the slash is your on-pace target for today. Master this and you master your progress.',
          balanced: 'Your calories card shows your complete daily picture: what you ate, what you burned, and where you stand. The number after the slash is your on-pace target for today.',
          mindful: 'This card shows what you\'ve logged today against your on-pace target. It\'s just information, use it however feels right for you.',
        },
      },
      {
        targetKey: 'cal_card_remaining',
        title: 'REMAINING',
        skipForModes: ['mindful'],
        body: {
          discipline: 'Remaining = your on-pace target minus what you\'ve eaten. Stay positive to hit your deficit. Go negative and you\'re in surplus.',
          balanced: 'Remaining shows how many calories you have left to reach your on-pace target. It updates every time you log food.',
          mindful: 'Remaining shows the gap between your on-pace target and what you\'ve logged. There\'s no right answer here, just where you are.',
        },
      },
      {
        targetKey: 'cal_card_active',
        title: 'ACTIVE',
        skipForModes: ['mindful'],
        body: {
          discipline: 'Active calories come straight from Apple Health: exercise, workouts, movement. These earn you more room in your daily budget.',
          balanced: 'Active calories are what you\'ve burned through movement today. They\'re pulled automatically from Apple Health.',
          mindful: 'Active shows movement tracked by your device. It\'s part of your day\'s picture, no more or less important than anything else.',
        },
      },
      {
        targetKey: 'cal_card_net',
        title: 'LIVE NET',
        skipForModes: ['mindful'],
        body: {
          discipline: 'Live Net = consumed minus active burn minus running BMR. It\'s your live deficit or surplus. Negative means you\'re in a deficit, the goal if you\'re cutting.',
          balanced: 'Live Net puts everything together: food eaten, calories burned, and your resting metabolism. It\'s the most complete number on the card.',
          mindful: 'Live Net combines what you ate, what you burned, and what your body uses at rest. It\'s your complete daily picture so far.',
        },
      },
      {
        targetKey: 'cal_card_main',
        title: 'COLOR CODING',
        body: {
          discipline: 'Green = on track (within ±50 cal). Amber = watch it (±51-149 cal). Red = off track (±150+ cal). Hit green consistently. That\'s the standard.',
          balanced: 'The color tells you how your day is trending. Green is great, amber is close, red means a bigger gap to close. It resets tomorrow.',
          mindful: 'This card doesn\'t use color judgment for you. Numbers are just numbers. What matters is how you feel and what works for your body.',
        },
      },
    ],
  },

  {
    id: 'macros_card',
    name: 'Macros Card',
    description: 'What protein, carbs, and fat mean, how to read your bars, and what net carbs means.',
    tab: 'home',
    steps: [
      {
        targetKey: 'macros_card_main',
        title: 'MACROS TODAY',
        body: {
          discipline: 'Macros are the three fuels your body runs on. Calories tell you how much. Macros tell you what. Both matter.',
          balanced: 'Your macros card breaks your food down into the three key nutrients: protein, carbs, and fat.',
          mindful: 'This card shows your three main nutrients. It\'s informational. No target you have to hit perfectly.',
        },
      },
      {
        targetKey: 'macros_protein',
        title: 'PROTEIN',
        body: {
          discipline: 'Protein builds and repairs muscle. Most active people need 0.7-1g per pound of bodyweight daily. Make it a non-negotiable.',
          balanced: 'Protein supports muscle, keeps you full, and helps your body recover. Your bar shows how close you are to your goal.',
          mindful: 'Protein is one of three nutrients your body uses to function. Your bar fills as you log foods that contain it.',
        },
      },
      {
        targetKey: 'macros_carbs',
        title: 'CARBS',
        body: {
          discipline: 'Carbs are your primary fuel. Time them around training for performance. If you\'ve enabled Net Carbs in Settings, this bar shows total carbs minus fiber and sugar alcohols: the carbs that actually impact blood sugar.',
          balanced: 'Carbs give you energy throughout the day. If you\'ve enabled Net Carbs in Settings, this bar shows net carbs (total carbs minus fiber and sugar alcohols) instead of total carbs.',
          mindful: 'Carbs provide energy for your body and brain. If you\'ve turned on Net Carbs in Settings, your bar shows net carbs: total carbs minus fiber and sugar alcohols.',
        },
      },
      {
        targetKey: 'macros_fat',
        title: 'FAT',
        body: {
          discipline: 'Fat supports hormones, brain function, and recovery. Don\'t slash it below 20% of total calories. It will cost you long term.',
          balanced: 'Dietary fat plays important roles in your body. Your goal sets a healthy daily target based on your calorie budget.',
          mindful: 'Fat is essential. Your body needs it. Your bar tracks how much you\'ve logged today. Over or under is just information.',
        },
      },
      {
        targetKey: 'macros_card_main',
        title: 'READING THE BARS',
        body: {
          discipline: 'Bar fills toward your goal. Over goal shows "Xg over": track it, it adds up. Log food accurately and let the bars guide you daily.',
          balanced: 'Each bar fills as you log food. Colors are fixed: green/amber/red represent protein/carbs/fat, not a grade on how you\'re doing.',
          mindful: 'The bars just show what you\'ve eaten. Whether you\'re over or under your goal is data, not a judgment on your day.',
        },
      },
    ],
  },

  {
    id: 'sleep_card',
    name: 'Sleep Score',
    description: 'How your sleep score is calculated and what to do to improve it.',
    tab: 'home',
    steps: [
      {
        targetKey: 'sleep_card_main',
        title: 'YOUR SLEEP SCORE',
        body: {
          discipline: 'Your sleep is scored 0-100 based on duration, deep sleep, and REM. Apple Health fills this in automatically each morning. The better your sleep quality, the higher your score.',
          balanced: 'Your sleep card shows a score based on how long you slept and the quality of your sleep stages. Apple Health fills this in automatically each morning.',
          mindful: 'This card shows a gentle reading of your sleep. Duration and quality combine into a score that Apple Health fills in automatically each morning.',
        },
      },
      {
        targetKey: 'sleep_donut',
        title: 'THE SCORE',
        skipIfTargetMissing: true,
        body: {
          discipline: '85+ = Well Rested. 70-84 = Could Be Better. Below 70 = Poor Sleep. Duration earns 40 points. Deep sleep 30. REM 30. Hit all three.',
          balanced: 'The number in the center is your score out of 100. 85 or above is Well Rested. Below 70 is Poor Sleep. The colored ring shows your stages.',
          mindful: 'The number is just a reference point, not a report card. Well Rested, Could Be Better, and Poor Sleep are gentle labels to orient your day.',
        },
      },
      {
        targetKey: 'sleep_stages',
        title: 'SLEEP STAGES',
        skipIfTargetMissing: true,
        body: {
          discipline: 'Core sleep is your base. Deep sleep (purple) is recovery and growth: target 15-20% of total. REM (green) is brain recovery and memory: target 20-25%.',
          balanced: 'The colored sections show your sleep stages. Core is the foundation, deep sleep is physical recovery, REM is mental recovery.',
          mindful: 'The colors show different types of sleep your body cycles through. Each plays a different role and all are valuable.',
        },
      },
      {
        targetKey: 'sleep_card_main',
        title: 'IMPROVING YOUR SCORE',
        body: {
          discipline: 'Consistent bedtime matters more than any supplement or hack. Cut screens 30 min before bed. Keep the room cold. Same wake time every day, even weekends.',
          balanced: 'Consistent sleep and wake times are the biggest driver of better scores. Small changes add up: earlier bedtime, darker room, no screens before sleep.',
          mindful: 'If you want to improve your sleep, consistency usually helps more than anything else. Same bedtime, same wake time. The rest follows naturally.',
        },
      },
      {
        targetKey: 'sleep_feel',
        title: 'FEEL RATING',
        skipIfTargetMissing: true,
        body: {
          discipline: 'No Apple Health stage data? Rate how you felt 1-10. This unlocks your score: duration up to 60 pts, feel up to 30 pts, and bedtime consistency up to 10 pts. Log it accurately.',
          balanced: 'If your Apple Health does not have detailed sleep stages, rate how you felt when you woke up on a scale of 1-10. Consistent bedtime also adds bonus points to your score.',
          mindful: 'The feel rating (1-10) is your morning check-in. How you feel matters regardless of what the data says. Keeping a consistent bedtime is also factored in.',
        },
      },
      {
        targetKey: 'sleep_card_main',
        title: 'EXPLORE YOUR SLEEP',
        body: {
          discipline: 'Tap the card to open your full Sleep page: stage breakdown, trend history, HRV, resting heart rate, and recovery signals all in one place.',
          balanced: 'Tap anywhere on this card to open your full Sleep page, where you can see your stage breakdown, trends, and recovery data over time.',
          mindful: 'Tap anywhere on this card to explore your sleep in more depth whenever you feel like it. Everything is there when you want it.',
        },
      },
    ],
  },

  // sleep_card_manual is not listed in TAB_TUTORIALS -- it is auto-selected
  // by the sleep resolver in index.tsx when sleepHours === 0 (no Apple Health data).
  {
    id: 'sleep_card_manual',
    name: 'Sleep Score',
    description: 'How to unlock your sleep score using the feel rating when Apple Health is not connected.',
    tab: 'home',
    steps: [
      {
        targetKey: 'sleep_card_main',
        title: 'YOUR SLEEP SCORE',
        body: {
          discipline: 'Your sleep card tracks rest quality. Apple Health fills it in when connected. Until then, rate how you felt when you woke up each morning to unlock your score.',
          balanced: 'Your sleep card shows a score based on your rest quality. When Apple Health is connected it fills in automatically. Without it, the feel rating below unlocks your score.',
          mindful: 'This card tracks how your sleep felt. If Apple Health is connected it fills in automatically. The feel rating below is how you get started without it.',
        },
      },
      {
        targetKey: 'sleep_feel',
        title: 'RATE HOW YOU SLEPT',
        skipIfTargetMissing: true,
        body: {
          discipline: 'Tap 1 to 10 to rate how you felt this morning. 1 is rough, 10 is amazing. This unlocks your score: duration up to 60 pts, feel up to 30 pts, bedtime consistency up to 10 pts.',
          balanced: 'Tap 1 to 10 to rate how you felt when you woke up. This activates your sleep score. Keeping a consistent bedtime also adds bonus points. You can update it anytime during the day.',
          mindful: 'Rate how rested you feel this morning, 1 to 10. There is no right answer. This is just a check-in, and it unlocks your sleep score for the day.',
        },
      },
      {
        targetKey: 'sleep_card_main',
        title: 'YOUR SCORE',
        body: {
          discipline: '85 or above is Well Rested. 70 to 84 is Could Be Better. Below 70 is Poor Sleep. Duration earns up to 60 pts, feel rating up to 30 pts, and consistent bedtime up to 10 pts.',
          balanced: 'Once you rate, your score appears out of 100. Well Rested is 85 and above. Could Be Better is 70 to 84. Below 70 is Poor Sleep. A consistent bedtime adds up to 10 bonus points.',
          mindful: 'Your score appears after you rate. Well Rested, Could Be Better, and Poor Sleep are gentle labels, not verdicts. Keeping a consistent bedtime also helps your score.',
        },
      },
      {
        targetKey: 'sleep_card_main',
        title: 'IMPROVING YOUR SCORE',
        body: {
          discipline: 'Consistent bedtime matters more than any supplement or hack. Cut screens 30 min before bed. Keep the room cold. Same wake time every day, even weekends.',
          balanced: 'Consistent sleep and wake times are the biggest driver of better scores. Small changes add up: earlier bedtime, darker room, no screens before sleep.',
          mindful: 'If you want to improve your sleep, consistency usually helps more than anything else. Same bedtime, same wake time. The rest follows naturally.',
        },
      },
    ],
  },

  {
    id: 'if_card',
    name: 'Intermittent Fasting',
    description: 'What IF is, how the three states work, and how to use the card.',
    tab: 'log',
    steps: [
      {
        targetKey: 'if_card_main',
        ifCardState: 'idle',
        navigateTo: '/(tabs)/log',
        title: 'INTERMITTENT FASTING',
        body: {
          discipline: 'IF is a time-restricted eating protocol. You eat within a defined window each day and fast outside it. 16:8 is the standard: 16 hours fasting, 8-hour eating window.',
          balanced: 'Intermittent fasting means eating within a set window each day and fasting outside it. This card tracks your window so you do not have to think about it.',
          mindful: 'This card tracks when you eat, not how much. It is a simple tool for creating a gentle rhythm around meals. Use it only if it feels right for you.',
        },
      },
      {
        targetKey: 'if_card_main',
        ifCardState: 'idle',
        title: 'THE CYCLE',
        body: {
          discipline: 'Two taps, one daily cycle. The green button marks when you ate your first meal and opens your eating window. LAST MEAL closes it when you are done for the day. Everything in between is your window.',
          balanced: 'The cycle is two taps. Tap the green button when you eat your first meal to open your eating window. Tap LAST MEAL when you are done eating for the day to close it.',
          mindful: 'The card tracks two moments each day: when your eating window opens and when it closes. Tap the green button at your first meal. Tap LAST MEAL when you are done.',
        },
      },
      {
        targetKey: 'if_card_active',
        ifCardState: 'active',
        title: 'YOUR EATING WINDOW',
        body: {
          discipline: 'Once you tap the green button, your eating window opens and the countdown starts. Eat your meals. The window closes when the timer hits zero or when you tap LAST MEAL, whichever comes first.',
          balanced: 'Once your eating window is open, the countdown shows how much time remains. Eat normally during this window. Tap LAST MEAL when you are done eating for the day.',
          mindful: 'Once your window opens, eat at your own pace. The countdown shows time remaining. Tap LAST MEAL when you are done. No pressure to finish before the timer.',
        },
      },
      {
        targetKey: 'if_card_active',
        ifCardState: 'active',
        title: 'LAST MEAL',
        body: {
          discipline: 'When you are done eating for the day, tap LAST MEAL. It logs the exact time your window closed and starts your next fast. Tap it at the right moment. Your window analytics depend on accuracy.',
          balanced: 'When you are done with your last meal, tap LAST MEAL to close your eating window. The card records your window duration and resets for tomorrow.',
          mindful: 'Tap LAST MEAL when eating feels complete for the day. There is no wrong answer. You know your body. The card simply records when you said you were done.',
        },
      },
      {
        targetKey: 'if_card_main',
        ifCardState: 'eating',
        title: 'EDITING TIMES',
        body: {
          discipline: 'Forgot to tap at the exact moment? Edit Start and Edit End let you correct your times after the fact. Accuracy here matters. Your window analytics depend on it.',
          balanced: 'If you forgot to tap at the right moment, use Edit Start or Edit End to correct your times. The card updates your window duration automatically.',
          mindful: 'Tapped at the wrong time? Edit Start and Edit End let you adjust anytime. No judgment. Just update it when you get a chance.',
        },
      },
    ],
  },

  {
    id: 'yvy_card',
    name: 'You vs Yesterday',
    description: 'What you\'re being compared against and how wins and losses are scored.',
    tab: 'home',
    steps: [
      {
        targetKey: 'yvy_card_main',
        yvyDemo: true,
        title: 'YOU VS YESTERDAY',
        body: {
          discipline: 'This card compares today\'s metrics to yesterday\'s. Not to some ideal standard, to yourself. The only competition worth having.',
          balanced: 'You vs Yesterday compares today\'s stats to yesterday\'s. It\'s about consistency and forward momentum, one day at a time.',
          mindful: 'This card shows today and yesterday side by side. It\'s a gentle way to notice patterns, not to win or lose.',
        },
      },
      {
        targetKey: 'yvy_metrics',
        yvyDemo: true,
        title: 'THE METRICS',
        body: {
          discipline: '4 metrics shown: Net Cals, Steps, Sleep Score, and Water. These are your core daily performance indicators. The demo shows today winning 3 of 4. If any of these are missing (no sleep data yet, steps not tracked), backup metrics like weight, active calories, or sleep hours fill the slots automatically.',
          balanced: 'The card tracks 4 key metrics: Net Cals, Steps, Sleep Score, and Water. Each shows your result for today vs yesterday. This demo shows today winning 3 of 4. If a primary metric has no data yet, a backup like weight, active calories, or sleep hours steps in so the card always has something to show.',
          mindful: 'Steps, Sleep Score, and Water are compared in this mode. Each is just one piece of your day. This demo shows a sample comparison. If any metric has no data, a backup fills in so the card stays useful from day one.',
        },
      },
      {
        targetKey: 'yvy_metrics',
        yvyDemo: true,
        title: 'COLOR CODING',
        body: {
          discipline: 'Accent color with a left bar: you\'re ahead today. Dimmed with a right bar: yesterday was stronger. No bar: dead even. Net calories uses closest-to-target logic, not raw number.',
          balanced: 'Metrics where you\'re ahead show in your accent color with a highlight bar on the left. Metrics where yesterday was higher appear dimmed. Ties show both values in the same muted tone.',
          mindful: 'Today and yesterday are shown side by side. Neither side is highlighted, just numbers. Notice the patterns that feel meaningful to you.',
        },
      },
      {
        targetKey: 'yvy_card_main',
        yvyDemo: true,
        title: 'KEEP TRACKING',
        body: {
          discipline: 'The card needs data to work. Log food, water, and let Apple Health do its job. The more consistent your logging, the better this card gets.',
          balanced: 'Log consistently and this card becomes more meaningful over time. The more data you have, the clearer your patterns become.',
          mindful: 'The card fills in as you log. You don\'t have to log everything perfectly, just what feels useful and sustainable for you.',
        },
      },
      {
        targetKey: 'yvy_card_main',
        yvyDemo: true,
        title: 'HEAD TO HEAD',
        body: {
          discipline: 'Tap anywhere on this card to open Head to Head, a deeper breakdown where you can compare any two specific days side by side with full metric detail.',
          balanced: 'Tap anywhere on this card to open Head to Head, where you can pick any two days and compare every metric in detail.',
          mindful: 'Tap anywhere on this card to open Head to Head, where you can look at any two days side by side without any win or loss framing.',
        },
      },
    ],
  },

  // ─── LOG TAB ──────────────────────────────────────────────────────────────────

  {
    id: 'log_edit_layout',
    name: 'Edit Meal Slots',
    description: 'Add your own meal categories, rename the defaults, and rearrange your food log.',
    tab: 'log',
    steps: [
      {
        targetKey: 'log_edit_layout_btn',
        tutorialAction: 'openEditMealsForTutorial',
        title: 'YOUR MEAL SLOTS',
        body: {
          discipline: 'That grid icon opens your meal slot editor. Tap NEXT and we\'ll open it.',
          balanced: 'That grid icon opens the meal slot editor. Tap NEXT and we\'ll walk through it.',
          mindful: 'That grid icon lets you customize your meal layout. Tap NEXT whenever you\'re ready.',
        },
      },
      {
        targetKey: 'none',
        noDimOverlay: true,
        bubbleAtBottom: true,
        title: 'MEAL SLOTS',
        body: {
          discipline: 'Each row is one meal bucket: Morning, Lunch, Dinner, Snacks by default. You can have up to 8. Rename, reorder, or delete any of them.',
          balanced: 'Each row is one of your meal categories. You start with 4 but can add up to 8. Rename, reorder, or remove them however you like.',
          mindful: 'These are your meal categories. Start with the 4 defaults or customize however feels right. Up to 8 total.',
        },
      },
      {
        targetKey: 'log_edit_slot_name',
        skipIfTargetMissing: true,
        title: 'RENAME A SLOT',
        body: {
          discipline: 'Tap any meal name to rename it inline. Changes apply immediately across your full log history.',
          balanced: 'Tap any meal name to rename it. The name updates everywhere: your log, history, all of it.',
          mindful: 'Tap any meal name to rename it to whatever fits your life. "Breakfast," "Pre-Workout," whatever works for you.',
        },
      },
      {
        targetKey: 'log_edit_slot_drag',
        skipIfTargetMissing: true,
        tutorialAction: 'scrollEditListToEnd',
        title: 'DRAG TO REORDER',
        body: {
          discipline: 'Long-press this grip and drag to reorder the slot. Order saves instantly.',
          balanced: 'Long-press this grip to drag the slot wherever you want it. Changes save automatically.',
          mindful: 'Long-press and drag to rearrange. Put things in whatever order feels natural.',
        },
      },
      {
        targetKey: 'log_edit_add_btn',
        title: 'ADD A SLOT',
        body: {
          discipline: 'This is your Add Meal Slot button. You can have up to 8 total. If it reads "Maximum 8 slots reached," remove a slot first to make room.',
          balanced: 'Tap this to add a new meal category. You can have up to 8 total. If you\'re at the limit, remove one first.',
          mindful: 'This adds new categories whenever you need them. Up to 8 total. If it\'s greyed out, you\'ve hit the limit. Remove one to open a spot.',
        },
      },
    ],
  },

  {
    id: 'log_food',
    name: 'Logging Food',
    description: 'Walk through the full logging flow: search, detail, log, and delete a real example entry.',
    tab: 'log',
    steps: [
      {
        targetKey: 'log_meal_add',
        title: 'ADDING TO YOUR LOG',
        body: {
          discipline: 'Tap the + next to any meal section to open the food library. Every food you log starts here. We will walk through the full flow now.',
          balanced: 'Tap the + next to a meal to open the food library. We will walk through a live example so you can see the full flow.',
          mindful: 'Tap the + on any meal to open the food library. We will walk through a real example together. No pressure, just exploring.',
        },
      },
      {
        targetKey: 'log_search_bar',
        title: 'SEARCHING FOR FOOD',
        navigateTo: '/add-food?tutorialMode=true',
        navigateDelay: 400,
        body: {
          discipline: 'Type the food name to search FatSecret\'s database of millions of foods. We have pre-loaded an example below so you can see what results look like.',
          balanced: 'Type what you ate to search the food database. An example food is already shown below so you can see how results appear.',
          mindful: 'Search for any food by typing its name. We have loaded an example below so you can explore without typing anything.',
        },
      },
      {
        targetKey: 'log_result_row',
        title: 'READING RESULTS',
        body: {
          discipline: 'Each row: food name, calories, and a P/C/F macro strip. Brand foods show the brand. Tap any row to open full detail and set your serving.',
          balanced: 'Results show the food name, calorie count, and a quick macro breakdown. Tap a row to open the full detail screen and choose your serving.',
          mindful: 'Each result shows the food with its calorie count and macros. Tap one to open it and choose how much you had.',
        },
      },
      {
        targetKey: 'log_food_detail_amount',
        title: 'SERVING SIZE',
        navigateTo: '/food-detail?tutorialMode=true&tutorialFood=chicken_breast&meal=Lunch',
        navigateDelay: 400,
        body: {
          discipline: 'Amount field defaults to 100g. Type your actual gram weight for precision. Macros recalculate live. Accuracy here compounds over time.',
          balanced: 'The amount field lets you enter exactly how much you had. Macros update in real time as you type.',
          mindful: 'You can type in how much you ate by weight. Everything recalculates as you adjust. No pressure to be exact.',
        },
      },
      {
        targetKey: 'log_food_detail_stepper',
        title: 'SERVINGS STEPPER',
        body: {
          discipline: 'Tap + to multiply servings in 0.5 increments (1, 1.5, 2...). Faster than calculating grams when you know you had "2 servings".',
          balanced: 'The + and - buttons adjust the number of servings. Handy when you had a labeled amount like "2 cups" instead of a gram weight.',
          mindful: 'Use + or - to add or remove servings without typing. Tap + if you had more than one serving.',
        },
      },
      {
        targetKey: 'log_food_detail_serving',
        title: 'SERVING PICKER',
        body: {
          discipline: 'Tap the serving name to switch units. Match the label on your food. This example has 100g, 1 breast (172g), and 1 oz: three real options.',
          balanced: 'Tap the serving name to switch between different serving options. This food shows 100g, 1 breast, and 1 oz as examples.',
          mindful: 'Different serving sizes are available here. Pick whichever option matches what you actually had.',
        },
      },
      {
        targetKey: 'log_food_detail_meal',
        title: 'CHOOSE YOUR MEAL',
        body: {
          discipline: 'Assign this food to a meal slot. Meal-level totals only work when entries are correctly assigned. Lunch is selected by default.',
          balanced: 'Tap the meal selector to assign this to Morning, Lunch, Dinner, or Snacks. Keeps your log organized.',
          mindful: 'Assign the food to whatever meal fits. This is just for your own organization. No right or wrong answer.',
        },
      },
      {
        targetKey: 'log_save_btn',
        title: 'LOG IT',
        tutorialAction: 'saveTutorialEntry',
        body: {
          discipline: 'Tap NEXT and we will log this entry for you as a live demo. It will appear in your log immediately, and we will clean it up right after.',
          balanced: 'Tap NEXT and we will add this example entry to your log so you can see how it looks. We will remove it at the end of the tour.',
          mindful: 'Tap NEXT and we will add this example food to your log. Do not worry, we will remove it once the tour is done.',
        },
      },
      {
        targetKey: 'log_today_total',
        title: 'YOUR LOGGED ENTRY',
        navigateTo: 'back_twice',
        navigateDelay: 600,
        body: {
          discipline: 'Entry saved. See how Today\'s Total updated instantly. Expand the Lunch section below to see the entry. Tap any entry to reopen and edit it.',
          balanced: 'Your food is in the log and Today\'s Total updated right away. Expand the Lunch section to see the entry. Tap it anytime to edit.',
          mindful: 'Your food is logged and your totals have updated. Expand the Lunch section to see it. You can tap any entry to make changes.',
        },
      },
      {
        targetKey: 'log_delete_btn',
        title: 'REMOVING AN ENTRY',
        tutorialAction: 'deleteTutorialEntry',
        body: {
          discipline: 'Tap the X on any entry to remove it. Totals recalculate immediately. Tap NEXT and we will remove this example entry now.',
          balanced: 'Tap the X on any food entry to remove it from your log. Tap NEXT and we will clean up this demo entry.',
          mindful: 'Tap the X to remove an entry. Tap NEXT and we will remove this example. No trace left behind.',
        },
      },
      {
        targetKey: 'none',
        title: 'QUICK TIPS',
        body: {
          discipline: 'Demo entry removed. Recents tab: your last 15 logged foods, fastest re-log. Favorites tab: star any food for instant access.',
          balanced: 'Done. The demo entry has been removed. The Recents tab shows your last 15 logged foods. Star any food to save it in Favorites.',
          mindful: 'All cleaned up. The Recents and Favorites tabs make re-logging easier over time. Use whichever feels right.',
        },
      },
    ],
  },

  {
    id: 'manage_log',
    name: 'Managing Your Log',
    description: 'Edit entries, remove food, navigate dates, and understand totals.',
    tab: 'log',
    preAction: 'addTutorialFoodEntries',
    steps: [
      {
        targetKey: 'log_entry_row',
        title: 'EDITING AN ENTRY',
        body: {
          discipline: 'Tap any logged entry to reopen its detail screen. Change the grams, serving, or meal. Every field is editable.',
          balanced: 'To change a logged entry, just tap it. The food detail screen reopens and you can adjust the amount, serving size, or meal.',
          mindful: 'Tap any entry to open it back up. You can change how much you logged or which meal it belongs to.',
        },
      },
      {
        targetKey: 'log_delete_btn',
        title: 'REMOVING AN ENTRY',
        body: {
          discipline: 'Tap the X on an entry row to delete it. The macro totals recalculate immediately. No confirmation needed; undo by re-logging.',
          balanced: 'Tap the X on any food entry to remove it from your log. Your totals update instantly.',
          mindful: 'Tap the X to remove an entry. If you change your mind, just log the food again.',
        },
      },
      {
        targetKey: 'log_date_nav',
        title: 'DATE NAVIGATION',
        body: {
          discipline: 'Tap the date to jump to a specific day via the calendar. Arrow buttons step one day at a time. Log past days you forgot or plan meals ahead.',
          balanced: 'Use the date area at the top to navigate to different days. Tap the date to open a calendar and jump anywhere.',
          mindful: 'You can log food for any day, past or future. Tap the date to jump, or use the arrows to step one day at a time.',
        },
      },
      {
        targetKey: 'log_meal_total',
        scrollToTop: true,
        title: 'MEAL TOTALS',
        body: {
          discipline: 'Each meal slot shows its total calories when collapsed. Expand to see individual entries. Use this to balance meals strategically.',
          balanced: 'Each meal section shows its calorie total. Tap the header to expand or collapse the list of entries within it.',
          mindful: 'Meal sections show their totals. Expand or collapse them by tapping the header, whatever view makes sense to you.',
        },
      },
      {
        targetKey: 'log_today_total',
        title: 'TODAY\'S TOTAL',
        scrollToTop: true,
        tutorialAction: 'deleteTutorialEntry',
        body: {
          discipline: 'Today\'s Total at the top shows your full day: calories, protein, carbs, fat bars against goals. This matches your home screen calorie card.',
          balanced: 'The Today\'s Total card summarizes everything you\'ve logged: total calories and your macro progress bars.',
          mindful: 'The summary at the top shows all of today\'s logged nutrition together. It updates in real time as you log.',
        },
      },
    ],
  },

  {
    id: 'barcode',
    name: 'Barcode Scanner',
    description: 'Scan a product barcode and log it, including the SET system for linking custom foods.',
    tab: 'log',
    steps: [
      {
        targetKey: 'add_food_barcode_icon',
        navigateTo: '/add-food?meal=browse',
        navigateDelay: 600,
        tutorialAction: 'showTutorialScanResults',
        title: 'THE BARCODE ICON',
        body: {
          discipline: 'The barcode icon sits in the header of the Food Library and Add to Meal screens. Tap it to open the camera. Results pull from FatSecret\'s database instantly.',
          balanced: 'The barcode icon lives in the header here and on any Add to Meal screen. Tap it to open the camera scanner and point it at any product barcode.',
          mindful: 'The barcode icon opens the camera. Point it at any product barcode and it searches automatically.',
        },
      },
      {
        targetKey: 'add_food_top_result',
        title: 'WHEN A MATCH IS FOUND',
        body: {
          discipline: 'Results load instantly. Best match lands at the top. Tap any result to open the detail screen and log it. Not the right food? Tap SET to permanently link a different one.',
          balanced: 'When a barcode finds results, the best match lands at the top. Tap it to open the detail screen and log it like any search result. The SET button lets you permanently link a food to that barcode.',
          mindful: 'When a barcode finds results, the closest match lands at the top. Tap it to log it at whatever serving size feels right.',
        },
      },
      {
        targetKey: 'add_food_set_button',
        skipIfTargetMissing: true,
        tutorialAction: 'switchToSetFoodsTab',
        title: 'THE SET BUTTON',
        body: {
          discipline: 'Not the right match? Search manually or browse results. Tap SET to link any food to this barcode permanently. Future scans skip straight to your pinned food.',
          balanced: 'Not the right one? Search for the food manually. Tap SET on any result to link it to that barcode. From then on, scanning that product opens this food instantly.',
          mindful: 'Not the right match? Search for the food yourself. Tap SET to link it to this barcode. You only have to do it once.',
        },
      },
      {
        targetKey: 'add_food_unset_button',
        skipIfTargetMissing: true,
        tutorialAction: 'showTutorialNoMatchState',
        title: 'YOUR PINNED FOODS',
        body: {
          discipline: 'The Set Foods tab shows every barcode you have linked. Tap UNSET to remove a link if the food changed or you pinned the wrong one. No cap on how many you can pin.',
          balanced: 'The Set Foods tab keeps all your linked barcodes in one place. Tap UNSET to remove a link if the food changed or you chose the wrong one.',
          mindful: 'Set Foods shows everything you have linked. If a food changes or you want to start over, tap UNSET to remove the link.',
        },
      },
      {
        targetKey: 'add_food_create_barcode',
        skipIfTargetMissing: true,
        tutorialAction: 'clearTutorialScanState',
        title: 'NO MATCH AT ALL',
        body: {
          discipline: 'Nothing in the database? Tap Create Food for this Barcode. Build a custom entry with exact macros and it links to that barcode automatically. One scan, always your food.',
          balanced: 'If nothing in the database matches, tap Create Food for this Barcode. Build a custom entry and it links automatically. Next scan opens your custom food instantly.',
          mindful: 'If nothing matches, tap Create Food for this Barcode. Add a name and whatever nutrition info you have. It links to the barcode so future scans are instant.',
        },
      },
    ],
  },

  {
    id: 'create_food',
    name: 'Creating Your Own Food',
    description: 'Build a custom food entry and save it to your personal library.',
    tab: 'log',
    steps: [
      {
        // Step 0: spotlights the + FAB. noTabBarOffset=true because add-food
        // has no tab bar -- without it, isOffScreen falsely clips the FAB.
        // tutorialAction fires on NEXT, opening the creator inline.
        targetKey: 'create_food_fab',
        noTabBarOffset: true,
        navigateTo: '/add-food?meal=browse',
        navigateDelay: 900,
        tutorialAction: 'openCreatorForTutorial',
        title: 'THE + BUTTON',
        body: {
          discipline: 'The + button opens a speed dial: Create Food for a custom entry, Create Recipe for a multi-ingredient meal. Tap NEXT and we will open the creator and walk through each field.',
          balanced: 'The + button at the bottom of the library opens Create Food and Create Recipe. Tap NEXT and we will walk through the creator together.',
          mindful: 'The + button is where custom foods live. Tap NEXT and we will open the creator and explore each section.',
        },
      },
      {
        // Step 1: spotlights the full card for an undimmed overview of the form.
        targetKey: 'create_food_card',
        title: 'THE CREATE FOOD FORM',
        body: {
          discipline: 'Two required fields: name and calories. Everything else (serving size, macros, extended nutrition) is optional but recommended. This demo has Protein Shake pre-filled so the Save button is already active.',
          balanced: 'Name and calories are the only required fields. Everything else is optional. We pre-filled a demo food so you can see the whole flow.',
          mindful: 'Only name and calories are required. Fill in whatever feels useful and skip the rest. The food saves either way.',
        },
      },
      {
        // Step 2: spotlights the name input.
        targetKey: 'create_food_name',
        title: 'FOOD NAME',
        body: {
          discipline: 'Required. This is how the food shows in search and your log. Be specific: "Protein Shake, Chocolate" beats "Shake." Demo has it pre-filled.',
          balanced: 'The food name is searchable later, so be as descriptive as you want. Demo already has "Protein Shake" filled in.',
          mindful: 'Use whatever name makes sense to you. There is no wrong answer here.',
        },
      },
      {
        // Step 3: spotlights calories + serving size + unit pills as one section.
        // tutorialAction fires on NEXT and expands the macros section so step 4
        // shows the full expanded area already open.
        targetKey: 'create_food_calories_section',
        tutorialAction: 'expandOptionalSection',
        title: 'CALORIES & SERVING SIZE',
        body: {
          discipline: 'Required. Pull calories from the label. Serving size (right field) + unit pill sets what one serving weighs, which makes per-gram math accurate when you adjust amounts later.',
          balanced: 'Enter calories from the label, then set the serving size to the right. Together they let the app scale correctly when you log a different amount.',
          mindful: 'Calories from the label, serving size to the right. If you do not have the label, no stress. Just enter what you know.',
        },
      },
      {
        // Step 4: the macros + extended section is taller than the viewport, so a
        // spotlight cutout gets flagged off-screen and drops. noDimOverlay keeps every
        // field bright (the tip copy references them, so they must stay visible). Anchor
        // the bubble to the compact "Macros & Extended Nutrition" toggle so it auto-
        // positions above the fields instead of covering them.
        targetKey: 'create_food_optional',
        noDimOverlay: true,
        title: 'MACROS & EXTENDED',
        body: {
          discipline: 'Protein, carbs, fat, fiber, sodium, cholesterol, saturated fat, all from the label. Skip any and they show as 0 in your log. Your macro bars will not reflect foods with missing macros.',
          balanced: 'These fields are all optional. Fill in what you have from the label. The more you enter, the more accurate your macro tracking.',
          mindful: 'Add whatever macro info you have. If the label is not handy, skip it and save. The food still logs correctly without them.',
        },
      },
      {
        // Step 5: spotlights save button. tutorialAction closes creator and
        // navigates back to the tab the user came from.
        targetKey: 'create_food_save',
        tutorialAction: 'closeCreatorAfterTutorial',
        title: 'SAVE FOOD',
        body: {
          discipline: 'Hit SAVE FOOD and it goes straight to My Foods, no sync delay. Tap DONE to close this demo. In real use the food writes to your personal library permanently.',
          balanced: 'Tap SAVE FOOD when ready. It shows up in My Foods right away. Tap DONE to close this demo. Nothing is actually saved since this is a walkthrough.',
          mindful: 'When you are ready, tap SAVE FOOD. It goes straight to My Foods. Tap DONE to close. We did not save anything real here.',
        },
      },
    ],
  },

  {
    id: 'recipes',
    name: 'Recipes',
    description: 'Build a recipe from ingredients and log portions of it easily.',
    tab: 'log',
    steps: [
      {
        // Step 0: Start in the food library, spotlight the + FAB
        targetKey: 'create_food_fab',
        navigateTo: '/add-food?meal=browse',
        noTabBarOffset: true,
        title: 'THE + BUTTON',
        body: {
          discipline: 'This is your food creator. Tap + to access Create Food for single items or Create Recipe for full dishes. We are going to the recipe builder now.',
          balanced: 'Tap + here in the food library to access the creator options. Create Recipe is where full meals get built. Let\'s go there.',
          mindful: 'This + button opens your creation options. Create Food is for single items, Create Recipe is for full meals. We will explore the recipe builder together.',
        },
      },
      {
        // Step 1: Inside recipe-builder, spotlight the recipe name input
        targetKey: 'recipe_name_input',
        navigateTo: '/recipe-builder',
        noTabBarOffset: true,
        title: 'NAME YOUR RECIPE',
        body: {
          discipline: 'Name your recipe specifically. "Meal Prep Chicken Bowl" is findable. "Chicken" is not. We pre-loaded Chicken Breast, Brown Rice, and Olive Oil as demo ingredients.',
          balanced: 'Give your recipe a name you will recognize later. We added three demo ingredients so you can see the full builder in action.',
          mindful: 'Start with a name that means something to you. We added a few demo ingredients so you can see how the builder works.',
        },
      },
      {
        // Step 2: Spotlight the Search Food + Create buttons row
        targetKey: 'recipe_add_ingredient_row',
        noTabBarOffset: true,
        title: 'ADDING INGREDIENTS',
        body: {
          discipline: 'Two ways to add: Search Food pulls from the full FatSecret database by name or barcode. Create builds a custom item on the spot if it is not in the database.',
          balanced: 'Tap Search Food to find any ingredient by name. Or tap Create to build a custom item if something is not in the database.',
          mindful: 'Use Search Food to find ingredients by name. Create is there if you need to add something custom. Both options are always available.',
        },
      },
      {
        // Step 3: Spotlight the ingredients list card
        targetKey: 'recipe_ingredients_card',
        noTabBarOffset: true,
        title: 'INGREDIENT LIST',
        body: {
          discipline: 'The list tracks everything added. Each item shows its macros auto-calculated from the amount you set. Trash icon removes it. Accuracy here drives accuracy everywhere.',
          balanced: 'Your ingredients list shows each item with its nutrition contribution. Tap the trash icon to remove anything. What you put in here flows into your log.',
          mindful: 'This is your ingredient list. Each item shows what it contributes. Nothing is permanent. The trash icon removes any ingredient.',
        },
      },
      {
        // Step 4: Spotlight a single ingredient row
        targetKey: 'recipe_ingredient_row',
        noTabBarOffset: true,
        title: 'INGREDIENT ROW',
        body: {
          discipline: 'Each row shows the amount, calories, and P/C/F split. If the macros look wrong, remove and re-add with the correct gram weight.',
          balanced: 'Each ingredient shows its amount and nutrition contribution at a glance. The more accurate your amounts, the more accurate your log.',
          mindful: 'Each ingredient row shows what it contributes. Do your best with amounts. A reasonable estimate is always better than skipping the log.',
        },
      },
      {
        // Step 5: Spotlight the total nutrition card
        targetKey: 'recipe_totals_card',
        noTabBarOffset: true,
        title: 'TOTAL NUTRITION',
        body: {
          discipline: 'This is the running total for the full batch. Every ingredient summed automatically. This number divided by your serving count gives you the per-serving values.',
          balanced: 'Total Nutrition sums every ingredient automatically. You never calculate anything manually. Just add accurate ingredients and the math is done.',
          mindful: 'This adds up everything in your recipe automatically. You do not have to do any math. It all updates as you add ingredients.',
        },
      },
      {
        // Step 6: Spotlight the servings card
        targetKey: 'recipe_servings_card',
        noTabBarOffset: true,
        title: 'SERVINGS',
        body: {
          discipline: 'Set the number of servings the batch makes. Per-serving nutrition divides automatically. This is what gets logged each time you pull this recipe.',
          balanced: 'Enter how many servings the recipe makes. The per-serving breakdown updates instantly. This is what gets logged when you use the recipe.',
          mindful: 'Set how many portions this recipe makes. The per-serving numbers update right away. No pressure to be exact. A good estimate is fine.',
        },
      },
      {
        // Step 7: Spotlight the save button -- action saves the demo recipe then step 8 navigates to Recipes tab
        targetKey: 'recipe_save_btn',
        noTabBarOffset: true,
        tutorialAction: 'saveTutorialRecipe',
        title: 'SAVE THE RECIPE',
        body: {
          discipline: 'Tap DONE to save this demo recipe and see where it lives in your library. The real Save button works identically: one tap, saved permanently.',
          balanced: 'Tap DONE and we will save this demo recipe so you can see where it shows up. In real use, tap Save and the recipe goes straight to your library.',
          mindful: 'Tap DONE and we will save this demo so you can see where recipes live. In real use, tap Save whenever it feels ready.',
        },
      },
      {
        // Step 8: Navigate to Recipes tab -- spotlight the tab pills so user sees exactly where they landed
        targetKey: 'add_food_tab_pills',
        navigateTo: '/add-food?meal=browse&tutorialTab=recipes',
        noTabBarOffset: true,
        title: 'THE RECIPES TAB',
        body: {
          discipline: 'You are inside your food library, the same screen you use to search foods. Recipes is one of five tabs here. Every recipe you save lands in this tab, always one tap from your log.',
          balanced: 'This is your food library. Recipes is one of the tabs across the top, where every saved recipe lives. The same place you come to search for foods when logging a meal.',
          mindful: 'You are in your food library. See the tabs across the top. Recipes is where all your saved recipes live. It is always here when you want to log a meal you have built.',
        },
      },
      {
        // Step 9: Spotlight the demo recipe row -- shows the saved recipe and how to delete
        targetKey: 'recipe_library_row',
        noTabBarOffset: true,
        tutorialAction: 'deleteTutorialRecipe',
        title: 'YOUR SAVED RECIPE',
        body: {
          discipline: 'There is the demo recipe. Tap it to log a portion. The × removes a recipe permanently, and it will confirm before deleting. Tap DONE and we will clean this one up.',
          balanced: 'Here is the recipe we just saved. Tap to log a portion anytime. Tap the × to delete a recipe. It will ask first. Tap DONE and we will remove the demo.',
          mindful: 'Here is the recipe we made together. Tap it to log whenever you are ready. The × removes a recipe if you need to. Tap DONE and we will clean this up.',
        },
      },
    ],
  },

  // ─── WORKOUT TAB ──────────────────────────────────────────────────────────────

  {
    id: 'workout_basics',
    name: 'Workout Basics',
    description: 'Check off exercises, log sets and reps, and rate your session.',
    tab: 'workout',
    preAction: 'addTutorialExercise',
    steps: [
      {
        targetKey: 'workout_day_scroller',
        title: 'DAY SCROLLER',
        body: {
          discipline: 'Dots across the top represent your week. Active day is accented. We added demo exercises, Bench Press and Treadmill, at the top of today\'s list to walk through the full screen.',
          balanced: 'The dots show each day of your week. The highlighted dot is today. We added a Bench Press and Treadmill demo below to walk you through the workout screen.',
          mindful: 'The dots show the days of your week. The highlighted one is today. We added two demo exercises below so we can explore the screen together.',
        },
      },
      {
        targetKey: 'workout_fab',
        title: 'ADDING EXERCISES',
        body: {
          discipline: 'Tap this + FAB to add exercises. Choose Add Exercise to search or browse the full library. Choose Load Routine to load a saved workout block. Programs (Library → Programs) fill your whole week automatically.',
          balanced: 'Tap + to add exercises. Add Exercise opens the library where you can search by name or browse by muscle group. Load Routine fills the day from a saved workout.',
          mindful: 'Tap + whenever you want to add an exercise. Search or browse the library and tap any exercise to add it. You can also load a saved routine if you have one.',
        },
      },
      {
        targetKey: 'workout_exercise_row',
        title: 'CHECKING OFF',
        body: {
          discipline: 'Tap the circle on any exercise to check it off. Progress bar at the top tracks your completion. Get to 100%.',
          balanced: 'Tap the circle next to an exercise to mark it complete. The progress bar at the top updates as you check things off.',
          mindful: 'Tap any exercise circle to mark it done. You can check and uncheck anytime. Do what works for your session.',
        },
      },
      {
        targetKey: 'workout_sets_reps',
        title: 'SETS, REPS, REST',
        body: {
          discipline: 'Tap the set/rep/rest fields on any exercise to enter your working weights and reps. This data feeds your progress tracking over time.',
          balanced: 'Tap the sets, reps, or rest fields on any exercise to fill in your working numbers. They save automatically.',
          mindful: 'Tap any field to add your sets, reps, or rest time. Fill in what you want. Nothing is required.',
        },
      },
      {
        targetKey: 'workout_cardio_fields',
        title: 'CARDIO EXERCISES',
        body: {
          discipline: 'Cardio exercises log duration, distance, speed, incline, HR, and calories. This Treadmill demo shows what a filled-in cardio row looks like. Tap the pencil to edit any cardio exercise and fill in what you tracked.',
          balanced: 'Cardio exercises have their own set of fields: duration, distance, speed, and more. This demo Treadmill shows what a logged cardio exercise looks like. Tap the pencil to edit.',
          mindful: 'This demo Treadmill shows what a cardio exercise looks like when logged. Tap the pencil on any cardio exercise to fill in whatever you tracked. No minimum required.',
        },
      },
      {
        targetKey: 'workout_exercise_row',
        title: 'EDITING AND REMOVING',
        body: {
          discipline: 'Pencil icon edits the exercise: update sets, reps, rest, or name. Trash icon removes it permanently. Long-press the left grip to drag and reorder the list. All changes save automatically.',
          balanced: 'Tap the pencil to edit an exercise, the trash to remove it, or long-press the left handle to drag it to a different position. Everything saves instantly.',
          mindful: 'Tap the pencil to adjust any exercise. Tap the trash to remove one that doesn\'t fit your session. Long-press the left grip to rearrange the order.',
        },
      },
      {
        targetKey: 'workout_progress_count',
        title: 'PROGRESS COUNT',
        body: {
          discipline: 'The X/Y counter shows exercises checked vs total. Green when complete. This is your session completion indicator.',
          balanced: 'The counter in the header shows how many exercises you\'ve checked off out of the total. Turns green when you\'re done.',
          mindful: 'The counter shows how many exercises you\'ve checked off. Green means you\'ve gotten to everything. No pressure if you don\'t.',
        },
      },
      {
        targetKey: 'workout_effort',
        tutorialAction: 'deleteTutorialExercise',
        title: 'TODAY\'S EFFORT',
        body: {
          discipline: 'Rate your session 1-10 at the end. This feeds your Effort vs Results analysis in Stats. Honest ratings only. The analytics depend on it. Tap DONE and the two demo exercises will be removed.',
          balanced: 'After your workout, rate how hard you pushed on a scale of 1-10. This data feeds your performance analysis in Stats. Tap DONE and we will clean up the demo exercises.',
          mindful: 'At the end of your session, rate how it felt on a scale of 1-10. There\'s no right answer, just your honest read. Tap DONE and we will remove the demo exercises.',
        },
      },
    ],
  },

  {
    id: 'programs',
    name: 'Programs',
    description: 'Load a weekly training template and have exercises auto-assigned to each day.',
    tab: 'workout',
    steps: [
      {
        targetKey: 'none',
        title: 'WHAT IS A PROGRAM',
        body: {
          discipline: 'A program is a weekly training template. It assigns exercises to each day of the week. Load one and your workout tab is pre-built. Tap NEXT and we will open your library.',
          balanced: 'A program is a weekly training plan. It fills in your workout days automatically so you do not build each one from scratch. Tap NEXT and we will open your library.',
          mindful: 'A program is a weekly schedule of workouts. Once loaded, each day is pre-filled with exercises. Tap NEXT and we will take a look together.',
        },
      },
      {
        targetKey: 'workout_lib_tabs',
        navigateTo: '/workout-library?tutorialTab=programs',
        navigateDelay: 700,
        noTabBarOffset: true,
        title: 'THE PROGRAMS TAB',
        body: {
          discipline: 'This is your exercise library. Programs is one of the tabs up here, and you are on it now. Every preset and custom program lives in this tab.',
          balanced: 'You are in your exercise library. Programs is one of the tabs across the top. This is where every program lives, ready to load.',
          mindful: 'This is your library. Programs is one of the tabs up top. Everything here is optional, browse whenever you are curious.',
        },
      },
      {
        targetKey: 'workout_lib_program_card',
        noTabBarOffset: true,
        skipIfTargetMissing: true,
        title: 'A PROGRAM CARD',
        body: {
          discipline: 'Each card is a full week. The day chips show the split: which muscle groups train on which day, and which days are rest. Presets are built on proven training principles.',
          balanced: 'Each card is a full week of training. The day chips show what each day focuses on, including rest days. Browse them and pick what fits your goal.',
          mindful: 'Each card lays out a full week. The day chips show what each day holds, including rest. No wrong choice here, just what fits you.',
        },
      },
      {
        targetKey: 'workout_lib_load_program',
        noTabBarOffset: true,
        skipIfTargetMissing: true,
        title: 'LOAD A PROGRAM',
        body: {
          discipline: 'Tap LOAD PROGRAM to activate it. It replaces your current week template only. Your logged workouts and notes are never touched. To clear an active program later, tap CLEAR on the banner at the top of this tab.',
          balanced: 'Tap LOAD PROGRAM to set up your week. Only the day templates change, your previous logs are kept. To remove it later, tap CLEAR on the active banner at the top of this tab.',
          mindful: 'Tap LOAD PROGRAM when one fits. It sets up your week and never deletes anything you have logged. You can clear it anytime from the banner at the top.',
        },
      },
      {
        targetKey: 'workout_lib_fab',
        noTabBarOffset: true,
        title: 'BUILD YOUR OWN',
        body: {
          discipline: 'Want something custom? Tap the + and choose Create Program. Assign tags and exercises to each day, save it, and it loads just like a preset.',
          balanced: 'You can build your own too. Tap the + and choose Create Program to set each day of the week however you want, then save it for later.',
          mindful: 'If none of the presets feel right, tap the + and choose Create Program to build your own at your own pace.',
        },
      },
    ],
  },

  {
    id: 'routines',
    name: 'Routines',
    description: 'Save a single day\'s workout as a reusable block and load it onto any day.',
    tab: 'workout',
    steps: [
      {
        targetKey: 'none',
        title: 'ROUTINES VS PROGRAMS',
        body: {
          discipline: 'A routine is one day\'s exercise list saved for reuse. A program is a full week. Use routines when you want flexibility day to day. Tap NEXT and we will open your library.',
          balanced: 'A routine is a saved workout for a single day. A program covers the whole week. Routines are more flexible. Tap NEXT and we will open your library.',
          mindful: 'Routines are single-day saved workouts, building blocks you pull out whenever you want. Tap NEXT and we will take a look.',
        },
      },
      {
        targetKey: 'workout_lib_tabs',
        navigateTo: '/workout-library?tutorialTab=routines',
        navigateDelay: 700,
        noTabBarOffset: true,
        title: 'THE ROUTINES TAB',
        body: {
          discipline: 'You are in your library. Routines is one of the tabs up here, and you are on it now. Your saved routines and ready-made presets both live in this tab.',
          balanced: 'This is your library. Routines is one of the tabs across the top. Saved routines and presets both live here.',
          mindful: 'This is your library. Routines is one of the tabs up top. Everything here is here when you want it.',
        },
      },
      {
        targetKey: 'workout_lib_my_routines',
        noTabBarOffset: true,
        skipIfTargetMissing: true,
        title: 'MY ROUTINES',
        body: {
          discipline: 'Your own saved routines live in this section. To load one onto a day, use the + on the Workout tab and choose Load Routine, then pick the target day.',
          balanced: 'This section holds the routines you have saved. To use one, tap the + on the Workout tab, choose Load Routine, and pick a day.',
          mindful: 'Your saved routines gather here. Load one onto any day from the + on the Workout tab whenever it feels right.',
        },
      },
      {
        targetKey: 'workout_lib_routine_preset_card',
        noTabBarOffset: true,
        skipIfTargetMissing: true,
        title: 'PRESET ROUTINES',
        body: {
          discipline: 'Below your routines are ready-made presets. USE loads the preset straight onto a day. Duplicate makes an editable copy in My Routines so you can tweak it to your liking.',
          balanced: 'Under your own routines are ready-made presets. Tap USE to load one onto a day, or Duplicate to make your own editable copy.',
          mindful: 'There are ready-made presets here too. USE loads one as is, or Duplicate makes a copy you can adjust however you like.',
        },
      },
      {
        targetKey: 'workout_lib_fab',
        noTabBarOffset: true,
        title: 'BUILD YOUR OWN',
        body: {
          discipline: 'Tap the + and choose Create Routine to build your own from scratch. Name it, add exercises, set sets, reps, and rest, then save it to My Routines.',
          balanced: 'Tap the + and choose Create Routine to build your own. Add exercises and save it to My Routines for whenever you need it.',
          mindful: 'Tap the + and choose Create Routine to make your own. Add what you want at whatever detail feels right.',
        },
      },
    ],
  },

  {
    id: 'exercise_library',
    name: 'Exercise Library',
    description: 'Search exercises, view muscle maps and instructions, and create custom ones.',
    tab: 'workout',
    steps: [
      {
        // Step 0: Navigate to the library and spotlight the search bar.
        targetKey: 'workout_lib_search',
        noTabBarOffset: true,
        navigateTo: '/workout-library',
        navigateDelay: 700,
        title: 'SEARCHING EXERCISES',
        body: {
          discipline: 'Every exercise in your library is searchable. Type to filter instantly. Default sort is A-Z. The library covers all major lifts, machines, and cardio, plus anything you add.',
          balanced: 'Search by name to find any exercise. The list filters instantly as you type. You can also filter by muscle group or exercise type using the button to the right.',
          mindful: 'Search by name to find what you are looking for. The list narrows as you type. Nothing complicated.',
        },
      },
      {
        // Step 1: Spotlight the first exercise row -- explain row anatomy.
        targetKey: 'workout_lib_exercise_row',
        noTabBarOffset: true,
        skipIfTargetMissing: true,
        title: 'EXERCISE ROWS',
        body: {
          discipline: 'Each row shows the exercise type (LIFT or CARDIO) and name. Tap the star to save it to your Favorites tab for quick access. Tap the row to open full detail.',
          balanced: 'Each row shows the exercise type and name. Tap the star to save it to your Favorites tab. Tap any row to open its full detail screen.',
          mindful: 'Each row shows the exercise type and name. Star the ones you do regularly so they are easy to find. Tap any row for more detail.',
        },
      },
      {
        // Step 2: Spotlight the filter button. NEXT fires tutorialAction to open inline detail.
        targetKey: 'workout_lib_filter_btn',
        noTabBarOffset: true,
        skipIfTargetMissing: true,
        tutorialAction: 'openTutorialExerciseDetail',
        title: 'FILTERING',
        body: {
          discipline: 'Tap Filter to narrow by muscle group (Chest/Back/Legs etc.) or type (lift or cardio). Multiple filters can stack. The badge shows how many are active. Filter resets when you leave.',
          balanced: 'Tap Filter to narrow results by muscle group or exercise type. Active filters show a badge count on the button. Filter resets when you leave the library.',
          mindful: 'The filter button narrows the list by body part or exercise type. Useful when you know what you want to train but not the specific exercise name.',
        },
      },
      {
        // Step 3: Spotlight the muscle map in the inline detail view (opened by step 2's action).
        // NEXT fires tutorialAction to close the inline detail before step 4.
        targetKey: 'workout_lib_muscle_map',
        noTabBarOffset: true,
        tutorialAction: 'closeTutorialExerciseDetail',
        title: 'MUSCLE MAP AND INSTRUCTIONS',
        body: {
          discipline: 'Tap any exercise row to open this detail view. Primary muscles shown in orange (front and back). Secondary muscles muted. Below the map: numbered HOW TO PERFORM steps. Build form before you ever touch a weight.',
          balanced: 'Tap any exercise row to see this detail view. The muscle diagram shows exactly what the exercise trains. Step-by-step instructions are listed below for exercises you are still learning.',
          mindful: 'Tap any exercise row to see this. The muscle diagram shows what gets worked. Instructions are there if you want them. No obligation to read everything.',
        },
      },
      {
        // Step 4: Spotlight the FAB -- explain creating custom exercises. DONE fires nav-back.
        targetKey: 'workout_lib_fab',
        noTabBarOffset: true,
        tutorialAction: 'closeExerciseLibraryTutorial',
        title: 'CREATING AN EXERCISE',
        body: {
          discipline: 'Tap the + FAB to open the speed dial. Choose Create Exercise to add a custom entry. Fill in name, type, muscles, and instructions. Saves to your library permanently alongside the defaults.',
          balanced: 'Tap the + button to open your options. Create Exercise lets you add anything not in the default library. Fill in as much detail as you want.',
          mindful: 'Tap + to add a custom exercise. Give it a name, pick a type, and add any details you want to track. It saves to your library.',
        },
      },
    ],
  },

  // ─── STATS TAB ────────────────────────────────────────────────────────────────

  {
    id: 'graph_creator',
    name: 'Graph Creator',
    description: 'Build custom graphs for 17 data types, choose your chart style and color, and add them to your Stats page or pin them to your home screen.',
    tab: 'stats',
    preAction: 'injectTutorialGraph',
    steps: [
      {
        targetKey: 'stats_fab',
        tutorialAction: 'openGraphCreatorTutorial',
        title: 'ADDING A GRAPH',
        body: {
          discipline: 'Tap the + FAB to open the Graph Creator. 17 data types across 4 categories. Build exactly what you want to track.',
          balanced: 'Tap the + FAB and choose "Add Graph." You\'ll pick a data type, chart style, and color.',
          mindful: 'Tap the + button and choose "Add Graph." Pick what you want to see and the app builds the chart for you.',
        },
      },
      {
        targetKey: 'graph_creator_data_grid',
        tutorialAction: 'creatorAutoToStep2',
        noDimOverlay: true,
        bubbleAtBottom: true,
        title: 'CHOOSE YOUR DATA',
        body: {
          discipline: '17 data types across 4 categories: Nutrition (calories, macros, fiber, sodium), Activity (steps, active cals, effort), Body (weight, body fat), Sleep & Recovery (score, hours).',
          balanced: 'Pick what you want to graph. Options include calories, macros, steps, weight, sleep, and more, organized by category.',
          mindful: 'Choose from the available data types. Pick whatever feels interesting or useful to see over time.',
        },
      },
      {
        targetKey: 'graph_creator_chart_type',
        tutorialAction: 'creatorAutoToStep3',
        title: 'CHART TYPE',
        body: {
          discipline: 'Line charts show trend and direction over time. Bar charts show daily volume at a glance. Line for weight trend, bar for calorie adherence.',
          balanced: 'Pick the chart style that helps you read your data most clearly. Line for trend direction, bar for daily totals.',
          mindful: 'Line or bar: pick whichever helps you digest the information best. You can always change it later.',
        },
      },
      {
        targetKey: 'graph_creator_color',
        title: 'PICK A COLOR',
        body: {
          discipline: 'Color is visual separation. Use different colors for different metrics so you can scan your stats page instantly.',
          balanced: 'Color-code your graphs to tell them apart at a glance. 8 curated options to choose from.',
          mindful: 'Pick a color that resonates with you. This is your space. Make it feel right.',
        },
      },
      {
        targetKey: 'graph_creator_preview_card',
        title: 'LIVE PREVIEW',
        body: {
          discipline: 'This is a live preview using your real data. What you see is exactly what will appear on your Stats page.',
          balanced: 'The preview below shows exactly what your graph will look like with your actual data before you commit.',
          mindful: 'Take a look at the preview below. If it feels right, add it. If you want to adjust the color or style, go back.',
        },
      },
      {
        targetKey: 'graph_creator_save_btn',
        tutorialAction: 'closeGraphCreatorTutorial',
        title: 'ADD TO STATS',
        body: {
          discipline: 'Tap ADD TO STATS and your graph appears in the Trends section immediately. Pin it to your home screen via Edit Layout.',
          balanced: 'Tap ADD TO STATS and your graph shows up in the Trends section. You can pin any graph to your home screen from Edit Layout.',
          mindful: 'Tap ADD TO STATS and the graph appears. It\'s there when you want it. No pressure to check it daily.',
        },
      },
      {
        targetKey: 'graph_creator_graph_card',
        title: 'YOUR GRAPH',
        body: {
          discipline: 'Your graph lives in the Trends section. Use the period buttons to change the time window. Tap the settings icon to edit it anytime.',
          balanced: 'Your new graph is right here in Trends. Tap the period buttons to change the time window, or tap the settings icon to edit or rename it.',
          mindful: 'Your graph is here whenever you want to look at it. Adjust the time window or settings whenever you like.',
        },
      },
      {
        targetKey: 'graph_creator_edit_btn',
        tutorialAction: 'deleteTutorialGraph',
        title: 'EDIT OR REMOVE',
        body: {
          discipline: 'Tap the settings icon on any graph card to rename it, change chart type, adjust timeframe, recolor, or delete it permanently.',
          balanced: 'Tap the settings icon to open graph options: rename, recolor, change chart type, or delete. The demo graph will be removed now.',
          mindful: 'The settings icon lets you adjust or remove any graph. The demo graph we used for this tour will be removed when you tap DONE.',
        },
      },
    ],
  },

  {
    id: 'streaks',
    name: 'Streaks',
    description: 'Set up streak tiles, track habits daily, and create your own custom streaks.',
    tab: 'stats',
    preAction: 'openStreaksSectionForTutorial',
    steps: [
      {
        targetKey: 'stats_streaks_section',
        title: 'YOUR STREAKS',
        body: {
          discipline: 'Streaks track consecutive days of a specific habit. Auto-tracked habits check themselves daily. Manual tiles require a check-in tap.',
          balanced: 'Streaks show how many consecutive days you\'ve hit a specific goal. Some track automatically, some require a daily tap.',
          mindful: 'Streaks count consecutive days of a habit. They\'re a gentle way to see momentum build, not a pressure system.',
        },
      },
      {
        targetKey: 'stats_streak_tile',
        title: 'STREAK TILES',
        body: {
          discipline: 'Each tile shows your current streak count and a 7-day dot grid. Manual tiles flash "LOGGED" when checked. Long-press to drag and reorder.',
          balanced: 'Each tile shows your current streak and a 7-day dot grid. Manual tiles have a tap-to-check-in button. Drag to reorder.',
          mindful: 'Streak tiles show your day count and a week view. Tap to check in on manual habits. Arrange them however you like.',
        },
      },
      {
        targetKey: 'stats_streak_gear',
        tutorialAction: 'openStreaksManage',
        title: 'THE GEAR ICON',
        body: {
          discipline: 'Tap the gear to open streak management. Add from 14 preset habits, remove tiles you don\'t need, or create your own.',
          balanced: 'Tap the gear icon to manage your streaks. Add new ones, remove ones you don\'t need, or create a custom streak.',
          mindful: 'The gear icon opens streak management. Add what matters to you, remove what doesn\'t.',
        },
      },
      {
        targetKey: 'stats_streak_manage_panel',
        title: 'MANAGE PANEL',
        body: {
          discipline: 'Active streaks are at the top. Below are 14 preset habits ready to add: nutrition, fitness, sleep, and faith. Tap any to activate it.',
          balanced: 'Your active streaks appear at the top. Below that are preset streaks you can add with a tap. Drag to reorder active ones.',
          mindful: 'This panel shows what\'s active and what\'s available. Add the ones that fit your life and leave the rest.',
        },
      },
      {
        targetKey: 'stats_streak_create_custom_btn',
        tutorialAction: 'closeStreaksManage',
        title: 'CUSTOM STREAKS',
        body: {
          discipline: 'Create any habit not in the presets. Name it, pick an emoji, and check it in manually each day. Track whatever drives you.',
          balanced: 'Create Custom lets you track any habit with your own name and emoji. Check it in manually each day.',
          mindful: 'Custom streaks are for whatever habit matters to you personally. Name it, pick an emoji, and check in when you want.',
        },
      },
    ],
  },

  {
    id: 'effort_vs_results',
    name: 'Effort vs Results',
    description: 'Generate a data-driven analysis of why your results look the way they do across consistency, deficit, macros, sleep, and more.',
    tab: 'stats',
    returnRoute: '/(tabs)/stats',
    steps: [
      {
        targetKey: 'none',
        navigateTo: '/diagnostic-report?tutorial=1',
        navigateDelay: 900,
        title: 'EFFORT VS RESULTS',
        body: {
          discipline: 'This is a backward-looking analysis engine. It scans your logged data and finds patterns that explain your actual outcomes. Not averages, real patterns.',
          balanced: 'Effort vs Results analyzes your logged data and surfaces what\'s actually affecting your results. It needs enough logged days to find real signals.',
          mindful: 'Effort vs Results is an analysis tool. It looks at your data and surfaces observations, not conclusions, just patterns to consider.',
        },
      },
      {
        targetKey: 'evr_generate_btn',
        title: 'GENERATE',
        noTabBarOffset: true,
        body: {
          discipline: 'Tap GENERATE. There\'s no window to pick: each pattern is measured over the timeframe that fits it (recent metrics over a couple weeks, weight trends over months). If you don\'t have enough data yet, it tells you what you need.',
          balanced: 'Tap GENERATE to run the analysis. There\'s no window to choose: every pattern uses its own timeframe automatically. If you don\'t have enough logged days, it\'ll tell you what\'s missing.',
          mindful: 'Tap GENERATE when you\'re ready. Each pattern looks back over the timeframe that suits it, so there\'s nothing to set. If there\'s not enough data yet, the app will let you know without any pressure.',
        },
      },
      {
        targetKey: 'none',
        navigateTo: '/diagnostic-report-view?tutorial=1',
        navigateDelay: 1200,
        noDimOverlay: true,
        bubbleAtBottom: true,
        noTabBarOffset: true,
        title: 'YOUR FINDINGS',
        body: {
          discipline: 'These are your findings: one card per pattern the engine detected in your data. Each one has a claim, a number, and an action. Scroll to see all of them.',
          balanced: 'These cards are your findings. Each one covers a pattern the analysis found in your logged data. Scroll down to see all of them.',
          mindful: 'These cards share what the data noticed. Each one is a pattern worth knowing about. Scroll to see all of them.',
        },
      },
      {
        targetKey: 'evr_coach_insight',
        noTabBarOffset: true,
        title: 'COACH INSIGHT',
        body: {
          discipline: 'This AI headline synthesizes your top finding into one prioritized call to action. It reads your actual data, not a template. Shows up once the engine has enough to say something real.',
          balanced: 'The Coach Insight box is an AI headline that ties your top finding into a single clear takeaway. It appears once the engine has enough logged data to make a meaningful read.',
          mindful: 'This box offers one observation drawn from your data. It shows up once the engine has enough to say something real. Take it as a starting point.',
        },
      },
      {
        targetKey: 'evr_card_0',
        noTabBarOffset: true,
        title: 'HOW TO READ A CARD',
        body: {
          discipline: 'Every card has three parts. The claim is what the data found. The proof is the number behind it. The arrow is your lever: the one action most likely to move the needle. Start there.',
          balanced: 'Each card tells a story in three parts: what the data found (claim), the number behind it (proof), and a suggested next step (the arrow at the bottom).',
          mindful: 'Each card has three parts: what the data noticed, the number behind it, and a gentle next step if you want one. Take what feels useful.',
        },
      },
      {
        targetKey: 'none',
        noDimOverlay: true,
        bubbleAtBottom: true,
        scrollToTop: true,
        noTabBarOffset: true,
        title: 'CARD TYPES',
        body: {
          discipline: 'Cards come in three types. KEY FACTOR (red) is your strongest signal: the biggest lever. WORKING (green) is what is already going right. WORTH ATTENTION (amber) is secondary. Start with KEY FACTOR.',
          balanced: 'Cards are color-coded by type. KEY FACTOR (red) is your strongest signal. WORKING (green) shows what is already going well. WORTH ATTENTION (amber) is worth a look.',
          mindful: 'The card colors are just categories: KEY FACTOR is a big pattern, WORKING is something going right, WORTH ATTENTION is secondary. No pressure on any of them.',
        },
      },
    ],
  },

  // ─── SETTINGS ─────────────────────────────────────────────────────────────────

  {
    id: 'faith_and_style',
    name: 'Your Style & Faith Journey',
    description: 'What each coaching mode and faith journey tier changes across the app.',
    tab: 'settings',
    preAction: 'openFaithStyleSection',
    steps: [
      {
        targetKey: 'none',
        title: 'YOUR STYLE & FAITH JOURNEY',
        body: {
          discipline: 'Two settings, one place. Coaching Mode controls language, color thresholds, and intensity across the whole app. Faith Journey controls which faith features are active.',
          balanced: 'Two settings, one place. Coaching Mode shapes how the app talks to you. Faith Journey controls which faith features appear.',
          mindful: 'Two settings that make this app yours. Coaching Mode sets the tone. Faith Journey is entirely your choice.',
        },
      },
      {
        targetKey: 'fs_coaching_section',
        noTabBarOffset: true,
        title: 'COACHING MODES',
        body: {
          discipline: 'Three modes. Each changes color thresholds, language, and how your progress is framed. Switching is instant and never touches your data.',
          balanced: 'Three coaching modes shape how the app communicates with you. Discipline is direct, Balanced is encouraging, Mindful is judgment-free.',
          mindful: 'The three modes change how the app talks to you. Discipline is performance-focused, Balanced is in the middle, Mindful removes all judgment framing.',
        },
      },
      {
        targetKey: 'fs_discipline_btn',
        noTabBarOffset: true,
        title: 'DISCIPLINE MODE',
        body: {
          discipline: 'Tight color thresholds (±50 cal is green). Direct language throughout. Streak breaks surface a specific modal. Built for people who want accountability.',
          balanced: 'Discipline mode uses tighter color thresholds and direct language. Best for people who want clear, performance-focused feedback.',
          mindful: 'Discipline mode is for people who want direct feedback with tight standards. An option, not the default or the goal.',
        },
      },
      {
        targetKey: 'fs_balanced_btn',
        noTabBarOffset: true,
        title: 'BALANCED MODE',
        body: {
          discipline: 'Balanced is the default. Forgiving thresholds (±150 cal is green). Encouraging language. Full metrics visible. Good middle ground.',
          balanced: 'Balanced is the default mode. It keeps full data visibility with encouraging language and forgiving color thresholds.',
          mindful: 'Balanced is the default. It gives you all the data with language that supports rather than judges.',
        },
      },
      {
        targetKey: 'fs_mindful_btn',
        noTabBarOffset: true,
        title: 'MINDFUL MODE',
        body: {
          discipline: 'Mindful removes color coding, judgment language, net calories, score bars, and IF countdown. All data still present, just framed neutrally.',
          balanced: 'Mindful mode removes color coding and performance framing. Weight and calories appear without judgment. Built for people who find numbers stressful.',
          mindful: 'Mindful mode is designed for you. No color coding. No win/loss framing. Everything simplified and neutral. You still have access to your data.',
        },
      },
      {
        targetKey: 'fs_faith_section',
        noTabBarOffset: true,
        title: 'FAITH JOURNEY',
        body: {
          discipline: 'Three tiers. Each one controls which faith features are active across the app. Switching never deletes data.',
          balanced: 'Faith Journey is a personal setting with three tiers. Pick the one that matches where you are right now.',
          mindful: 'Your Faith Journey setting is entirely yours. Three tiers, no judgment on any of them.',
        },
      },
      {
        targetKey: 'fs_rooted_btn',
        noTabBarOffset: true,
        title: 'ROOTED',
        body: {
          discipline: 'Full faith experience. Daily verse, morning intention, prayer log, Bible reader, and gratitude streak all active. Built for people who want faith woven into their day.',
          balanced: 'Rooted turns on all faith features: daily verse, prayer, Bible reader, gratitude streak, and morning intention.',
          mindful: 'Rooted brings faith into every part of the app: verse, prayer, Bible, gratitude. Everything available, nothing hidden.',
        },
      },
      {
        targetKey: 'fs_exploring_btn',
        noTabBarOffset: true,
        title: 'EXPLORING',
        body: {
          discipline: 'Faith features present but low-pressure. Verse is shown, no morning intention prompt. Good for people who want exposure without commitment.',
          balanced: 'Exploring keeps faith features available without prompting. The verse shows up, but the app does not push prayer or intention routines.',
          mindful: 'Exploring is gentle. Faith features are there if you want them, quiet if you do not. No prompts, no pressure.',
        },
      },
      {
        targetKey: 'fs_notrightnow_btn',
        noTabBarOffset: true,
        title: 'NOT RIGHT NOW',
        body: {
          discipline: 'Faith features hidden. Pure fitness experience. No verse, no prayer, no Bible. Everything else works identically.',
          balanced: 'Not Right Now hides all faith content and gives you a pure fitness app experience. Nothing else changes.',
          mindful: 'Not Right Now removes all faith features. The app becomes purely about wellness. You can always come back to this setting.',
        },
      },
      {
        targetKey: 'none',
        title: 'SWITCHING ANYTIME',
        body: {
          discipline: 'Both settings live right here in Settings. Switch anytime. Switching never deletes data. Find what works.',
          balanced: 'You can change both settings anytime right here. Switching never deletes any of your logged data.',
          mindful: 'Both settings can be changed whenever you want, as many times as you want. Nothing is locked in, and nothing is ever deleted.',
        },
      },
    ],
  },

  {
    id: 'goals',
    name: 'Setting Your Goals',
    description: 'Set your daily targets for steps, movement, sleep, calories, macros, and water, and learn how the recommended calorie value is calculated.',
    tab: 'settings',
    preAction: 'openGoalsSection',
    steps: [
      {
        targetKey: 'none',
        title: 'YOUR GOALS',
        body: {
          discipline: 'This is where every daily target lives. Fitness goals up top, nutrition goals below. These numbers drive your home screen progress bars, your celebrations, and your Day Score. Dial them in.',
          balanced: 'This section holds all your daily targets, fitness goals first and nutrition goals after. They power your home screen progress bars and feed your Day Score.',
          mindful: 'These are your daily targets. Set them wherever feels right for you. They quietly shape your progress bars and your daily picture, nothing more.',
        },
      },
      {
        targetKey: 'goals_steps',
        noTabBarOffset: true,
        title: 'STEP GOAL',
        body: {
          discipline: 'Your daily step target. The home screen step bar fills toward this number and you earn a goal hit when you cross it. Set it where it actually challenges you.',
          balanced: 'Your daily step target. The step progress bar on your home screen fills toward this number, and hitting it counts as a goal for the day.',
          mindful: 'Your daily step target. The step bar on your home screen fills toward it. A gentle marker, not a demand.',
        },
      },
      {
        targetKey: 'goals_movement',
        noTabBarOffset: true,
        title: 'ACTIVE CALORIES & EXERCISE',
        body: {
          discipline: 'Two Apple Health targets: active calories burned and exercise minutes. Each fills its own home screen bar and triggers a celebration the moment you hit it. Pulled automatically, no manual logging.',
          balanced: 'These two targets, active calories and exercise minutes, come straight from Apple Health. Each has its own progress bar and celebrates when you reach it.',
          mindful: 'Active calories and exercise minutes come from Apple Health automatically. They each have a bar that fills through the day. No pressure to hit either.',
        },
      },
      {
        targetKey: 'goals_sleep',
        noTabBarOffset: true,
        title: 'SLEEP GOAL',
        body: {
          discipline: 'How many hours you are aiming for each night. This is the target your sleep score measures duration against, so set it honestly to what your body needs.',
          balanced: 'Set how many hours of sleep you are aiming for. Your sleep score uses this as the target when it scores how long you slept.',
          mindful: 'How many hours of sleep feels right for you. Your sleep score gently compares your rest to this number. Adjust it anytime.',
        },
      },
      {
        targetKey: 'goals_calories',
        noTabBarOffset: true,
        title: 'DAILY CALORIE TARGET',
        body: {
          discipline: 'With Use Recommended Value on, the app calculates your target from your BMR, activity level, and weight goal set in Profile. Turn it off to type your own number. This target drives your calorie card and net calories.',
          balanced: 'Leave Use Recommended Value on and the app sets your target from your BMR, activity, and weight goal in Profile. Switch it off to enter a custom number. This is the target your calorie card counts against.',
          mindful: 'Use Recommended Value lets the app suggest a calorie target from your Profile details. Or turn it off and set your own. Either way, it simply informs your calorie card.',
        },
      },
      {
        targetKey: 'goals_netcarbs',
        noTabBarOffset: true,
        title: 'NET CARBS MODE',
        body: {
          discipline: 'Flip this on and the entire app counts carbs as total carbs minus fiber. Your carb goal below becomes a net carb target. Useful if you track keto or low carb. Off by default.',
          balanced: 'Turn this on to show net carbs (total carbs minus fiber) everywhere in the app instead of total carbs. Your carb goal then represents net carbs.',
          mindful: 'Net Carbs mode shows carbs as total minus fiber across the app. Helpful for some eating styles. Entirely optional.',
        },
      },
      {
        targetKey: 'goals_macros',
        noTabBarOffset: true,
        title: 'MACROS',
        body: {
          discipline: 'Set protein, carbs, and fat two ways. Ratio mode splits your calories by percentage and must total 100%. Fixed mode sets grams directly and should match your calorie target. Grams and percentages stay in sync automatically.',
          balanced: 'Choose how to set your macros. Ratio mode uses percentages that add up to 100%. Fixed mode lets you set grams directly. The app keeps grams and percentages in sync as your calories change.',
          mindful: 'Macros can be set by percentage (Ratio) or by grams (Fixed). The app handles the math either way. Set them loosely or precisely, your call.',
        },
      },
      {
        targetKey: 'goals_water',
        noTabBarOffset: true,
        title: 'WATER GOAL',
        body: {
          discipline: 'Your daily hydration target in ounces. The water bar on your home screen fills to this amount and counts as a goal hit when you reach it.',
          balanced: 'Your daily water target in ounces. The hydration bar on your home screen fills toward this number as you log water.',
          mindful: 'Your daily water target in ounces. The hydration bar fills as you log. A simple reminder to drink, nothing more.',
        },
      },
    ],
  },

  {
    id: 'notifications',
    name: 'Notifications',
    description: 'Set quiet hours, a daily cap, which categories can reach you, water reminders, and streak protection.',
    tab: 'settings',
    preAction: 'openNotificationsSection',
    steps: [
      {
        targetKey: 'none',
        title: 'NOTIFICATIONS',
        body: {
          discipline: 'Reminders that keep you accountable without spamming you. Everything here is tunable: when they can fire, how many, and what they cover. Set it up once and forget it.',
          balanced: 'This is where you control every reminder the app can send: when, how often, and about what. Let us walk through the key controls.',
          mindful: 'These are gentle reminders, fully in your control. You decide when they can reach you, how many, and what they cover. Turn any of it off anytime.',
        },
      },
      {
        targetKey: 'notif_master',
        noTabBarOffset: true,
        title: 'MASTER SWITCH',
        body: {
          discipline: 'The on and off for every reminder. Off means total silence, no matter what else is set below. The first time you turn it on, iOS asks permission to send notifications.',
          balanced: 'This master switch turns all reminders on or off at once. When you first enable it, iOS will ask for permission to send notifications.',
          mindful: 'One switch for everything. Off means complete quiet. Turning it on asks iOS for permission first. You are always in control.',
        },
      },
      {
        targetKey: 'notif_quiet',
        noTabBarOffset: true,
        title: 'QUIET HOURS',
        body: {
          discipline: 'No notification fires inside this window, period. Set it to your sleep hours so nothing wakes you. The one exception is streak protection, covered next.',
          balanced: 'During quiet hours, the app holds all notifications. Set this to your sleep window so reminders never wake you up.',
          mindful: 'Quiet hours are a window where nothing reaches you. Set it around your sleep so your rest stays undisturbed.',
        },
      },
      {
        targetKey: 'notif_streak',
        noTabBarOffset: true,
        title: 'STREAK PROTECTION',
        body: {
          discipline: 'A safety net. When a streak is about to break tonight, this fires even during quiet hours and even past your daily cap. It is the one reminder that always gets through. Leave it on.',
          balanced: 'This always fires when one of your streaks is at risk of breaking that night, even during quiet hours and beyond the daily cap. A safety net so you never lose a streak by forgetting.',
          mindful: 'If a streak is about to slip, this gentle nudge comes through even during quiet hours. It is here to help, and you can turn it off if you prefer.',
        },
      },
      {
        targetKey: 'notif_cap',
        noTabBarOffset: true,
        title: 'DAILY CAP',
        body: {
          discipline: 'The ceiling on how many reminders you get per day. Streak protection, your IF window, summaries, and water reminders do not count against it, so the cap only limits the optional nudges.',
          balanced: 'This limits how many notifications you receive in a day. Streaks, your IF window, summaries, and water reminders are exempt, so the cap only applies to the rest.',
          mindful: 'Set how many reminders feel right per day. Streaks, fasting, summaries, and water are not counted, so you stay in control of the rest.',
        },
      },
      {
        targetKey: 'notif_categories',
        noTabBarOffset: true,
        title: 'CATEGORIES',
        body: {
          discipline: 'Toggle entire topics on or off: Fitness, Faith, Fasting, and Summaries. Turn off what you do not care about and that whole category goes silent. Faith is hidden if your Faith Journey is set to Not Right Now.',
          balanced: 'These pills control which topics can reach you: Fitness, Faith, Fasting, and Summaries. Tap any to mute that whole category. Faith only appears if your Faith Journey allows it.',
          mindful: 'Choose which topics you want to hear about: Fitness, Faith, Fasting, and Summaries. Tap any to quiet it. Faith stays hidden if your Faith Journey is set to Not Right Now.',
        },
      },
      {
        targetKey: 'notif_water',
        noTabBarOffset: true,
        title: 'WATER REMINDERS',
        body: {
          discipline: 'Pick how many water nudges you want, spaced evenly across your waking hours. They live under the Fitness category and do not count toward your daily cap. Set to Off if you do not want them.',
          balanced: 'Choose how many water reminders you get, spread evenly through your day. They are part of the Fitness category and do not count toward the daily cap.',
          mindful: 'A few optional water nudges, spaced through your day. They do not count toward your cap. Set to Off whenever you like.',
        },
      },
      {
        targetKey: 'notif_advanced',
        noTabBarOffset: true,
        tutorialAction: 'closeNotificationsTutorial',
        title: 'ADVANCED',
        body: {
          discipline: 'Open Advanced to fine-tune timing: your activity reminder time, weight log frequency, prayer check-in time, IF window lead time, and streak protection timing. Dial in exactly when each one fires.',
          balanced: 'Tap Advanced for finer control: activity reminder time, weight log frequency, prayer check-in, IF window lead time, and streak protection timing. Everything here is optional.',
          mindful: 'Advanced holds the finer timing settings: activity, weight, prayer, fasting, and streak reminders. Open it only if you want to adjust the details.',
        },
      },
    ],
  },

  // ─── DAY SCORE ────────────────────────────────────────────────────────────────
  {
    id: 'day_score',
    name: 'Day Summary',
    description: 'How your morning 0-100 Day Score works across Nutrition, Activity, and Recovery, and why a bad night never tanks it.',
    tab: 'stats',
    // Opens the full Day Summary page on your most recent full day so the tour
    // can point at the real ring and cards. Aborts with a toast if you have no
    // scored day yet. Registered in app/(tabs)/stats.tsx.
    preAction: 'openDaySummaryForTour',
    // The tour opens the Day Summary page (a pushed route); 'back' pops it so the
    // user lands back where they launched from. See TutorialContext returnRoute.
    returnRoute: 'back',
    steps: [
      {
        targetKey: 'ds_ring',
        title: 'YOUR DAY SCORE',
        highlightPadding: 6,
        noTabBarOffset: true,
        body: {
          discipline: 'This is your Day Score: a 0-100 grade for the day before, built from three weighted areas: Nutrition 35%, Recovery 35%, Activity 30%. Today is never scored while it is still in progress.',
          balanced: 'This is your Day Score: a score out of 100 for the day before. It comes from three areas: Nutrition (35%), Recovery (35%), and Activity (30%).',
          mindful: 'This is your Day Score: a gentle read on the day before, drawn from nutrition, recovery, and activity. A reflection, not a verdict.',
        },
      },
      {
        targetKey: 'ds_nutrition',
        title: 'NUTRITION',
        noTabBarOffset: true,
        body: {
          discipline: 'Calories, protein, and water. Scoring is proximity-based: get close to a goal and you earn most of the points, no all-or-nothing cliffs. Skip an area and it drops out so the rest rebalance.',
          balanced: 'Calories, protein, and water. You do not have to be perfect. Getting close to a goal earns most of the points. Anything you did not log simply drops out and the rest adjust.',
          mindful: 'Calories, protein, and water. Getting close counts. There is no pass or fail. Anything you did not track steps aside, so you are never measured against blanks.',
        },
      },
      {
        targetKey: 'ds_recovery',
        title: 'RECOVERY',
        noTabBarOffset: true,
        bubbleAtBottom: true,
        body: {
          discipline: 'Your real Recovery Score for the night: overnight HRV, sleep, resting heart rate, the prior day\'s activity, and breathing, each vs your own baseline. It needs overnight heart data from your watch; on a watch-off night it falls back to your sleep score.',
          balanced: 'Your Recovery Score for the night, built from overnight HRV, sleep, resting heart rate, the day before\'s activity, and breathing, each compared to your own baseline. It needs overnight heart data from your watch; on a night the watch was off, it uses your sleep score instead.',
          mindful: 'A gentle read on how rested you are, drawn from your overnight heart data and sleep. On a night without watch data, it leans on your sleep. Resting still matters.',
        },
      },
      {
        targetKey: 'ds_activity',
        title: 'ACTIVITY',
        noTabBarOffset: true,
        body: {
          discipline: 'Active calories plus your workout. On a rest day, tag it as Rest so it is not dinged for having no workout. Your movement still earns credit.',
          balanced: 'Active calories and your workout. Taking a rest day? Tag it as Rest so the score does not expect a workout. Your movement that day still counts.',
          mindful: 'Active calories and movement. A rest day is good. Tag it as Rest so the day is not measured against a workout you intentionally set aside.',
        },
      },
      {
        targetKey: 'ds_exclude',
        title: 'OFF DAYS',
        highlightPadding: 10,
        noTabBarOffset: true,
        body: {
          discipline: 'Sick, traveling, or a planned off day? Exclude it here so it does not drag your weekly average. Past scores live in Stats > Reports.',
          balanced: 'For a genuine off day, exclude it here so it does not affect your averages. You can revisit any day from Stats > Reports.',
          mindful: 'For an off day, you can quietly exclude it so it does not weigh on your averages. Past days are always there in Stats > Reports when you want them.',
        },
      },
      {
        targetKey: 'none',
        noTabBarOffset: true,
        title: 'WEEKLY AND MONTHLY',
        body: {
          discipline: 'Weekly and monthly summaries work the same way: same three categories, bigger window. They pop up automatically at the start of each week and month, and live in Stats > Reports any time.',
          balanced: 'Weekly and monthly summaries follow the same format. They appear automatically at the start of each period and are always available in Stats > Reports.',
          mindful: 'There are also weekly and monthly summaries in the same format. They show up at the start of each period, or you can find them in Stats > Reports whenever you want.',
        },
      },
    ],
  },

  // ─── FAITH ──────────────────────────────────────────────────────────────────

  {
    id: 'faith_prayer',
    name: 'Prayer',
    description: 'Keep what you are praying for, mark answered, and ask for prayer.',
    tab: 'faith',
    returnRoute: '/(tabs)/faith',
    steps: [
      {
        targetKey: 'faith_prayer_card',
        title: 'PRAYER',
        body: {
          discipline: 'This is your prayer list. Keep what you are praying for in one place so nothing slips, and build a record of what God has done. The card previews your active prayers.',
          balanced: 'This card holds your prayers. It keeps what you are carrying in one place and previews your most recent active ones. The full screen is where you manage them.',
          mindful: 'This is a quiet place for your prayers. It holds what is on your heart and shows your most recent ones. However much or little you add is okay.',
        },
      },
      {
        targetKey: 'faith_prayer_ask',
        title: 'ASK FOR PRAYER',
        body: {
          discipline: 'Need someone in your corner? This sends a private prayer request. Every one is read and prayed over. It is never posted publicly or shared with other users.',
          balanced: 'When you want others praying with you, this sends a private request. Every request is read and prayed over, and it stays private, never public.',
          mindful: 'If you would like prayer from someone else, this sends a private request that is read and prayed over. It is never shared publicly. Only if you want it.',
        },
      },
      {
        targetKey: 'faith_prayer_hero',
        navigateTo: '/prayer?tutorial=1',
        navigateDelay: 700,
        noTabBarOffset: true,
        title: 'ANSWERED',
        body: {
          discipline: 'This is the full Prayer screen. Up top, your answered count: a running tally of prayers God has answered. It only shows once you have one.',
          balanced: 'Here is the full Prayer screen. The number up top counts your answered prayers, a quiet record of God showing up. It appears once you have answered one.',
          mindful: 'This is the full Prayer screen. The count up top simply marks the prayers you have seen answered. It is there as encouragement, nothing more.',
        },
      },
      {
        targetKey: 'faith_prayer_row',
        noTabBarOffset: true,
        title: 'ON YOUR HEART',
        body: {
          discipline: 'Each active prayer sits here. Tap one to open its options: mark it answered, edit the wording, or remove it.',
          balanced: 'These are your active prayers. Tap any one to open it, where you can mark it answered, edit it, or remove it.',
          mindful: 'These are the prayers you are carrying. Tap one whenever you want to mark it answered, reword it, or let it go.',
        },
      },
      {
        targetKey: 'faith_prayer_add',
        noTabBarOffset: true,
        title: 'ADD A PRAYER',
        body: {
          discipline: 'Tap the plus to add a new prayer. Keep it short or write it all out, whatever helps you pray.',
          balanced: 'Tap the plus button to add a new prayer to your list. Write as much or as little as you like.',
          mindful: 'Tap the plus to add a prayer whenever something comes to mind. There is no right way to word it.',
        },
      },
      {
        targetKey: 'faith_prayer_ask_us',
        noTabBarOffset: true,
        title: 'NEED PRAYER? ASK US',
        body: {
          discipline: 'Same private request, reachable from here too. Send what you are carrying and the team prays over every one.',
          balanced: 'You can also ask for prayer from down here. Send a request and the team reads and prays over every one.',
          mindful: 'If you would like prayer, you can reach out from here too. Every request is read and prayed over, in private.',
        },
      },
    ],
  },

  {
    id: 'faith_bible_plans',
    name: 'Bible and Plans',
    description: 'Read the Bible freely, or follow a reading plan or devotional.',
    tab: 'faith',
    returnRoute: '/(tabs)/faith',
    steps: [
      {
        targetKey: 'faith_bible_card',
        title: 'BIBLE AND PLANS',
        body: {
          discipline: 'One card, three ways into Scripture: open the Bible freely, follow a structured Reading Plan, or work through a Devotional. Here is how each one works.',
          balanced: 'This card is your way into Scripture. It offers three things: free Bible reading, Reading Plans, and Devotionals. Let me show you each.',
          mindful: 'This card is your doorway into Scripture, in whatever way suits you: open reading, a plan, or a devotional. No pressure to use all three.',
        },
      },
      {
        targetKey: 'faith_bible_strip',
        title: 'READ THE BIBLE',
        body: {
          discipline: 'Open the Bible directly here. Once you have read anything, this resumes you exactly where you left off. Before that, it offers a guided pick or drops you at John 1.',
          balanced: 'This is for open Bible reading. It picks up right where you left off, and if you are new, it helps you find a place to start.',
          mindful: 'This opens the Bible whenever you want to read. It remembers where you were, and if you are unsure where to begin, it offers a gentle starting point.',
        },
      },
      {
        targetKey: 'faith_bible_plans_col',
        title: 'READING PLANS',
        body: {
          discipline: 'A Reading Plan walks you through Scripture on a schedule: a set passage each day, so you always know what is next. The tile shows your progress and resumes you at the next reading.',
          balanced: 'A Reading Plan gives you a passage a day on a schedule, so you always know what to read next. The tile tracks how far along you are.',
          mindful: 'A Reading Plan offers a passage a day, so there is never a question of what to read next. Move through it at whatever pace feels right.',
        },
      },
      {
        targetKey: 'faith_bible_devos_col',
        title: 'DEVOTIONALS',
        body: {
          discipline: 'A Devotional pairs a short daily reading with a written reflection, day by day. Use a plan to read through Scripture, a devotional to sit with a theme. The tile resumes your next day.',
          balanced: 'A Devotional adds a short reflection alongside each day passage. Reading Plans are mostly reading; devotionals give you something to think on too.',
          mindful: 'A Devotional pairs a short reading with a gentle reflection. Where a plan is reading, a devotional invites you to sit with it. Take what speaks to you.',
        },
      },
      {
        targetKey: 'faith_plans_segment',
        navigateTo: '/plans?tab=reading',
        navigateDelay: 700,
        noTabBarOffset: true,
        title: 'PLANS VS DEVOTIONALS',
        body: {
          discipline: 'This is the Plans screen. Switch between Reading Plans and Devotionals up here. This is where you start, continue, and drop them.',
          balanced: 'Here is the Plans screen. This toggle flips between Reading Plans and Devotionals. Everything you start or stop happens here.',
          mindful: 'This is the Plans screen. The toggle moves between Reading Plans and Devotionals, so you can browse either whenever you like.',
        },
      },
      {
        targetKey: 'faith_plans_card',
        noTabBarOffset: true,
        title: 'START ONE',
        body: {
          discipline: 'Each card describes a plan and its length. Tap Start to begin one. Once active, it shows up on your faith tab so you can jump back in fast.',
          balanced: 'Each card shows a plan and how long it runs. Tap Start to begin, and it will appear on your faith tab to continue any time.',
          mindful: 'Each card tells you what a plan is and how long it takes. Start one whenever you feel ready, and it will be waiting on your faith tab.',
        },
      },
    ],
  },

  {
    id: 'faith_halo',
    name: 'Meet Halo',
    description: 'Your faith and wellness companion, ready to talk any time.',
    tab: 'faith',
    returnRoute: '/(tabs)/faith',
    steps: [
      {
        targetKey: 'faith_halo_fab',
        title: 'MEET HALO',
        noTabBarOffset: true,
        body: {
          discipline: 'Hi, I am Halo, your companion in this app. Part faith, part wellness. I live right here on your faith tab, one tap away whenever you need me.',
          balanced: 'Hi, I am Halo. I am your companion here, part faith and part wellness. You will find me in this corner of your faith tab any time.',
          mindful: 'Hi, I am Halo. Think of me as a companion for the faith and wellness side of things. I am always right here, only when you want me.',
        },
      },
      {
        targetKey: 'faith_halo_fab',
        title: 'WHAT I CAN DO',
        noTabBarOffset: true,
        body: {
          discipline: 'Ask me what a verse means, talk through what is on your mind, or get a straight word of encouragement. Open me from a verse or a prayer and I already know the context.',
          balanced: 'You can ask me about a verse, talk through your day, or just look for some encouragement. Start me from a verse or prayer and I pick up where you are.',
          mindful: 'You can ask me about a verse, share what is on your heart, or simply sit with a thought. There are no wrong questions, and I meet you where you are.',
        },
      },
      {
        targetKey: 'faith_halo_fab',
        tutorialAction: 'openHaloSample',
        noTabBarOffset: true,
        title: "LET'S TALK",
        body: {
          discipline: 'That is the whole tour. Tap Done and I will open up so you can try it for real. Your conversations stay yours.',
          balanced: 'That is everything. Tap Done and I will open right up so you can say hello. Your conversations are private to you.',
          mindful: 'That is all there is to it. Tap Done and I will open so you can try, whenever you feel ready. Whatever you share stays with you.',
        },
      },
    ],
  },
];

// ─── Tab → Tutorial Mapping ───────────────────────────────────────────────────

export const TAB_TUTORIALS: Record<string, string[]> = {
  home: ['cal_card', 'macros_card', 'sleep_card', 'yvy_card', 'edit_layout'],
  log: ['log_food', 'manage_log', 'barcode', 'log_edit_layout', 'create_food', 'recipes', 'if_card'],
  workout: ['workout_basics', 'programs', 'routines', 'exercise_library'],
  stats: ['graph_creator', 'streaks', 'effort_vs_results', 'day_score'],
  profile: [],
  settings: ['goals', 'notifications', 'faith_and_style'],
  faith: ['faith_prayer', 'faith_bible_plans', 'faith_halo'],
};

export function getTutorialById(id: string): Tutorial | undefined {
  return TUTORIALS.find(t => t.id === id);
}

export function getTutorialsForTab(tab: keyof typeof TAB_TUTORIALS): Tutorial[] {
  const ids = TAB_TUTORIALS[tab] ?? [];
  return ids.map(id => TUTORIALS.find(t => t.id === id)).filter(Boolean) as Tutorial[];
}
