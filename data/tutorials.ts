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
  tab: 'home' | 'log' | 'workout' | 'stats' | 'profile';
  steps: TutorialStep[];
  // Optional action key fired before step 0 opens (inject demo data before overlay appears)
  preAction?: string;
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
          mindful: 'That ? icon is always there when you need it. No pressure -- tap it whenever you\'re curious about something.',
        },
      },
      {
        targetKey: 'none',
        title: 'CARD HELP',
        body: {
          discipline: 'Cards with an (i) icon have detailed definitions. Some also have guided tours -- look for the "Take a Tour" button inside the (i) modal.',
          balanced: 'Cards with a small (i) icon can explain themselves. Tap it for definitions and explanations. Some also offer a guided tour.',
          mindful: 'Some cards have a small (i) icon. Tap it whenever a card feels confusing -- it explains what everything means at your own pace.',
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

  // ─── HOME TAB ─────────────────────────────────────────────────────────────────

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
          discipline: 'Your calorie card is mission control. Everything you eat and burn flows through here. Master this number and you master your progress.',
          balanced: 'Your calories card shows your complete daily picture -- what you ate, what you burned, and where you stand.',
          mindful: 'This card shows what you\'ve logged today. It\'s just information -- use it however feels right for you.',
        },
      },
      {
        targetKey: 'cal_card_remaining',
        title: 'REMAINING',
        skipForModes: ['mindful'],
        body: {
          discipline: 'Remaining = your target minus what you\'ve eaten. Stay positive to hit your deficit. Go negative and you\'re in surplus.',
          balanced: 'Remaining shows how many calories you have left before hitting your daily goal. It updates every time you log food.',
          mindful: 'Remaining shows the gap between your goal and what you\'ve logged. There\'s no right answer -- it\'s just where you are.',
        },
      },
      {
        targetKey: 'cal_card_active',
        title: 'ACTIVE',
        skipForModes: ['mindful'],
        body: {
          discipline: 'Active calories come straight from Apple Health -- exercise, workouts, movement. These earn you more room in your daily budget.',
          balanced: 'Active calories are what you\'ve burned through movement today. They\'re pulled automatically from Apple Health.',
          mindful: 'Active shows movement tracked by your device. It\'s part of your day\'s picture, no more or less important than anything else.',
        },
      },
      {
        targetKey: 'cal_card_net',
        title: 'RUNNING NET',
        skipForModes: ['mindful'],
        body: {
          discipline: 'Running Net = consumed minus active burn minus running BMR. It\'s your live deficit or surplus. Negative means you\'re in deficit -- that\'s the goal if you\'re cutting.',
          balanced: 'Running Net puts everything together -- food eaten, calories burned, and your resting metabolism. It\'s the most complete number on the card.',
          mindful: 'Running Net combines what you ate, what you burned, and what your body uses at rest. It\'s your complete daily picture so far.',
        },
      },
      {
        targetKey: 'cal_card_main',
        title: 'COLOR CODING',
        body: {
          discipline: 'Green = on track (within ±50 cal). Amber = watch it (±51-149 cal). Red = off track (±150+ cal). Hit green consistently -- that\'s the standard.',
          balanced: 'The color tells you how your day is trending. Green is great, amber is close, red means a bigger gap to close. It resets tomorrow.',
          mindful: 'This card doesn\'t use color judgment for you. Numbers are just numbers -- what matters is how you feel and what works for your body.',
        },
      },
    ],
  },

  {
    id: 'macros_card',
    name: 'Macros Card',
    description: 'What protein, carbs, and fat mean and how to read your bars.',
    tab: 'home',
    steps: [
      {
        targetKey: 'macros_card_main',
        title: 'MACROS TODAY',
        body: {
          discipline: 'Macros are the three fuels your body runs on. Calories tell you how much. Macros tell you what. Both matter.',
          balanced: 'Your macros card breaks your food down into the three key nutrients: protein, carbs, and fat.',
          mindful: 'This card shows your three main nutrients. It\'s informational -- no target you have to hit perfectly.',
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
          discipline: 'Carbs are your primary fuel. Time them around training for performance. Cut them to accelerate fat loss -- but don\'t eliminate them.',
          balanced: 'Carbs give you energy throughout the day. Your goal is set based on how you split your macros in settings.',
          mindful: 'Carbs provide energy for your body and brain. Your bar fills as you log foods containing carbohydrates.',
        },
      },
      {
        targetKey: 'macros_fat',
        title: 'FAT',
        body: {
          discipline: 'Fat supports hormones, brain function, and recovery. Don\'t slash it below 20% of total calories -- it will cost you long term.',
          balanced: 'Dietary fat plays important roles in your body. Your goal sets a healthy daily target based on your calorie budget.',
          mindful: 'Fat is essential -- your body needs it. Your bar tracks how much you\'ve logged today. Over or under is just information.',
        },
      },
      {
        targetKey: 'macros_card_main',
        title: 'READING THE BARS',
        body: {
          discipline: 'Bar fills toward your goal. Over goal shows "Xg over" -- track it, it adds up. Log food accurately and let the bars guide you daily.',
          balanced: 'Each bar fills as you log food. Colors are fixed -- green/amber/red represent protein/carbs/fat, not a grade on how you\'re doing.',
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
          discipline: 'Core sleep is your base. Deep sleep (purple) is recovery and growth -- target 15-20% of total. REM (green) is brain recovery and memory -- target 20-25%.',
          balanced: 'The colored sections show your sleep stages. Core is the foundation, deep sleep is physical recovery, REM is mental recovery.',
          mindful: 'The colors show different types of sleep your body cycles through. Each plays a different role -- all are valuable.',
        },
      },
      {
        targetKey: 'sleep_card_main',
        title: 'IMPROVING YOUR SCORE',
        body: {
          discipline: 'Consistent bedtime matters more than any supplement or hack. Cut screens 30 min before bed. Keep the room cold. Same wake time every day -- even weekends.',
          balanced: 'Consistent sleep and wake times are the biggest driver of better scores. Small changes add up -- earlier bedtime, darker room, no screens before sleep.',
          mindful: 'If you want to improve your sleep, consistency usually helps more than anything else. Same bedtime, same wake time. The rest follows naturally.',
        },
      },
      {
        targetKey: 'sleep_feel',
        title: 'FEEL RATING',
        skipIfTargetMissing: true,
        body: {
          discipline: 'No Apple Health stage data? Rate how you feel 1-5. This unlocks the score calculation and feeds the feel-bonus (up to +40 pts). Log it accurately.',
          balanced: 'If your Apple Health doesn\'t have detailed sleep stages, you can rate how you felt when you woke up. This still gives you a score.',
          mindful: 'The feel rating (1-5) is your chance to check in with yourself in the morning. How you feel matters, regardless of what the data says.',
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
          discipline: 'Tap 1 to 5 to rate how you felt this morning. 1 is rough, 5 is great. This unlocks your score and feeds the feel bonus, up to +40 points on top of duration.',
          balanced: 'Tap 1 to 5 to rate how you felt when you woke up. This activates your sleep score. You can update it anytime during the day.',
          mindful: 'Rate how rested you feel this morning, 1 to 5. There is no right answer. This is just a check-in, and it unlocks your sleep score for the day.',
        },
      },
      {
        targetKey: 'sleep_card_main',
        title: 'YOUR SCORE',
        body: {
          discipline: '85 or above is Well Rested. 70 to 84 is Could Be Better. Below 70 is Poor Sleep. Duration earns up to 60 points and the feel rating earns up to 40.',
          balanced: 'Once you rate, your score appears out of 100. Well Rested is 85 and above. Could Be Better is 70 to 84. Below 70 is Poor Sleep.',
          mindful: 'Your score appears after you rate. Well Rested, Could Be Better, and Poor Sleep are gentle labels, not verdicts. The number is just a reference point.',
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
    tab: 'home',
    steps: [
      {
        targetKey: 'if_card_main',
        ifCardState: 'idle',
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
          mindful: 'The card tracks two moments each day -- when your eating window opens and when it closes. Tap the green button at your first meal. Tap LAST MEAL when you are done.',
        },
      },
      {
        targetKey: 'if_card_active',
        ifCardState: 'active',
        title: 'YOUR EATING WINDOW',
        body: {
          discipline: 'Once you tap the green button, your eating window opens and the countdown starts. Eat your meals. The window closes when the timer hits zero or when you tap LAST MEAL -- whichever comes first.',
          balanced: 'Once your eating window is open, the countdown shows how much time remains. Eat normally during this window. Tap LAST MEAL when you are done eating for the day.',
          mindful: 'Once your window opens, eat at your own pace. The countdown shows time remaining. Tap LAST MEAL when you are done -- no pressure to finish before the timer.',
        },
      },
      {
        targetKey: 'if_card_active',
        ifCardState: 'active',
        title: 'LAST MEAL',
        body: {
          discipline: 'When you are done eating for the day, tap LAST MEAL. It logs the exact time your window closed and starts your next fast. Tap it at the right moment -- your window analytics depend on accuracy.',
          balanced: 'When you are done with your last meal, tap LAST MEAL to close your eating window. The card records your window duration and resets for tomorrow.',
          mindful: 'Tap LAST MEAL when eating feels complete for the day. There is no wrong answer -- you know your body. The card simply records when you said you were done.',
        },
      },
      {
        targetKey: 'if_card_main',
        ifCardState: 'eating',
        title: 'EDITING TIMES',
        body: {
          discipline: 'Forgot to tap at the exact moment? Edit Start and Edit End let you correct your times after the fact. Accuracy here matters -- your window analytics depend on it.',
          balanced: 'If you forgot to tap at the right moment, use Edit Start or Edit End to correct your times. The card updates your window duration automatically.',
          mindful: 'Tapped at the wrong time? Edit Start and Edit End let you adjust anytime. No judgment -- just update it when you get a chance.',
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
          discipline: '4 metrics shown: Running Net, Steps, Sleep Score, and Water. These are your core daily performance indicators. The demo shows today winning 3 of 4. If any of these are missing (no sleep data yet, steps not tracked), backup metrics like weight, active calories, or sleep hours fill the slots automatically.',
          balanced: 'The card tracks 4 key metrics: Running Net, Steps, Sleep Score, and Water. Each shows your result for today vs yesterday. This demo shows today winning 3 of 4. If a primary metric has no data yet, a backup like weight, active calories, or sleep hours steps in so the card always has something to show.',
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
    id: 'log_food',
    name: 'Logging Food',
    description: 'Walk through the full logging flow -- search, detail, log, and delete a real example entry.',
    tab: 'log',
    steps: [
      {
        targetKey: 'log_meal_add',
        title: 'ADDING TO YOUR LOG',
        body: {
          discipline: 'Tap the + next to any meal section to open the food library. Every food you log starts here. We will walk through the full flow now.',
          balanced: 'Tap the + next to a meal to open the food library. We will walk through a live example so you can see the full flow.',
          mindful: 'Tap the + on any meal to open the food library. We will walk through a real example together -- no pressure, just exploring.',
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
          mindful: 'You can type in how much you ate by weight. Everything recalculates as you adjust -- no pressure to be exact.',
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
          discipline: 'Tap the serving name to switch units. Match the label on your food. This example has 100g, 1 breast (172g), and 1 oz -- three real options.',
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
          mindful: 'Assign the food to whatever meal fits. This is just for your own organization -- no right or wrong answer.',
        },
      },
      {
        targetKey: 'log_save_btn',
        title: 'LOG IT',
        tutorialAction: 'saveTutorialEntry',
        body: {
          discipline: 'Tap NEXT and we will log this entry for you as a live demo. It will appear in your log immediately -- and we will clean it up right after.',
          balanced: 'Tap NEXT and we will add this example entry to your log so you can see how it looks. We will remove it at the end of the tour.',
          mindful: 'Tap NEXT and we will add this example food to your log. Do not worry -- we will remove it once the tour is done.',
        },
      },
      {
        targetKey: 'log_today_total',
        title: 'YOUR LOGGED ENTRY',
        navigateTo: 'back_twice',
        navigateDelay: 600,
        body: {
          discipline: 'Entry saved -- see how Today\'s Total updated instantly. Expand the Lunch section below to see the entry. Tap any entry to reopen and edit it.',
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
          mindful: 'Tap the X to remove an entry. Tap NEXT and we will remove this example -- no trace left behind.',
        },
      },
      {
        targetKey: 'none',
        title: 'QUICK TIPS',
        body: {
          discipline: 'Demo entry removed. Recents tab: your last 20 logged foods, fastest re-log. Favorites tab: star any food for instant access.',
          balanced: 'Done -- the demo entry has been removed. The Recents tab shows your last 20 logged foods. Star any food to save it in Favorites.',
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
          discipline: 'Tap the X on an entry row to delete it. The macro totals recalculate immediately. No confirmation -- undo via re-logging.',
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
          mindful: 'You can log food for any day -- past or future. Tap the date to jump, or use the arrows to step one day at a time.',
        },
      },
      {
        targetKey: 'log_meal_total',
        title: 'MEAL TOTALS',
        body: {
          discipline: 'Each meal slot shows its total calories when collapsed. Expand to see individual entries. Use this to balance meals strategically.',
          balanced: 'Each meal section shows its calorie total. Tap the header to expand or collapse the list of entries within it.',
          mindful: 'Meal sections show their totals. Expand or collapse them by tapping the header -- whatever view makes sense to you.',
        },
      },
      {
        targetKey: 'log_today_total',
        title: 'TODAY\'S TOTAL',
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
    description: 'Scan a product barcode and log it -- including the SET system for linking custom foods.',
    tab: 'log',
    steps: [
      {
        targetKey: 'none',
        title: 'OPENING THE SCANNER',
        body: {
          discipline: 'Tap the barcode icon in the food search bar. Point at any product barcode. The result pulls from FatSecret\'s database instantly.',
          balanced: 'Tap the barcode icon to open the camera scanner. Point it at any product barcode and it searches for a match automatically.',
          mindful: 'Tap the barcode icon and point your camera at a product. It searches for the food automatically.',
        },
      },
      {
        targetKey: 'none',
        title: 'ON A MATCH',
        body: {
          discipline: 'Match found: the food appears at the top of results. Tap it to open detail and log it. Green checkmark = confirmed match.',
          balanced: 'When a barcode matches, the food appears at the top of the results list. Tap it to log it just like any other food.',
          mindful: 'When a barcode finds a match, it shows up at the top. Tap to log it at whatever serving size feels right.',
        },
      },
      {
        targetKey: 'none',
        title: 'NO MATCH FOUND',
        body: {
          discipline: 'No match? Search for the food manually and tap SET to link it to that barcode permanently. Next scan goes straight to your linked food.',
          balanced: 'If no result comes up, search for the food manually. Tap the SET button on any result to link it to that barcode forever.',
          mindful: 'Not every barcode is in the database. Search manually and tap SET to link a food to that barcode so you only have to do it once.',
        },
      },
      {
        targetKey: 'none',
        title: 'THE SET SYSTEM',
        body: {
          discipline: 'SET pins any food to a barcode in your app. Next time you scan that product, it goes straight to your pinned food. Zero lookup time.',
          balanced: 'The SET system links a food to a specific barcode on your device. Scan the same product next week and it\'ll open the right food instantly.',
          mindful: 'SET links a food to a barcode so future scans are instant. It\'s saved to your device -- just yours, not shared.',
        },
      },
      {
        targetKey: 'none',
        title: 'CREATE AND SET',
        body: {
          discipline: 'Product not in the database at all? Tap "Create Food for this Barcode." Build the food with exact macros and it auto-links to that barcode.',
          balanced: 'If nothing matches, tap "Create Food for this Barcode" to build a custom entry. It saves to your library and links to the barcode automatically.',
          mindful: 'For products that aren\'t in the database, you can create your own food entry and link it to the barcode. One time only -- then scanning is instant.',
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
        targetKey: 'none',
        title: 'CUSTOM FOOD CREATOR',
        body: {
          discipline: 'Open the food library, tap the + FAB, and choose Create Food. Name and calories are required. Everything else is optional but adds accuracy.',
          balanced: 'To create a custom food, open the Library, tap the + button, and choose Create Food. Fill in the name and calories at minimum.',
          mindful: 'Creating a custom food is straightforward. Open the Library, tap +, and choose Create Food. Add as much or as little as you want.',
        },
      },
      {
        targetKey: 'none',
        title: 'REQUIRED FIELDS',
        body: {
          discipline: 'Name and calories are required -- marked with *. Everything else is optional. But if you leave out macros, protein/carbs/fat will all show as 0.',
          balanced: 'Name and calories are the only required fields. You can add macros and other details too for a more complete picture.',
          mindful: 'Just name and calories are required. Add macros if you have the label -- if not, the food will still save and log correctly.',
        },
      },
      {
        targetKey: 'none',
        title: 'OPTIONAL DETAILS',
        body: {
          discipline: 'Brand, macros, extended nutrition (fiber/sodium/saturated fat/cholesterol/sugar) all available. Pull from the nutrition label if you have it.',
          balanced: 'The optional section adds macros, brand, and extended nutrition. Tap to expand it if you have the nutrition label handy.',
          mindful: 'More details are available if you want them -- brand, macros, and extended nutrition. Only fill in what feels useful to you.',
        },
      },
      {
        targetKey: 'none',
        title: 'SERVING SIZE',
        body: {
          discipline: 'Set the serving size and unit (g, ml, oz, cups, etc.) to match the nutrition label. This is what the food detail screen will default to.',
          balanced: 'Set a serving size and unit so the food always opens with the right default amount. Choose whatever unit is on the label.',
          mindful: 'The serving size sets the default amount when you log this food later. Choose whatever makes sense for how you use it.',
        },
      },
      {
        targetKey: 'none',
        title: 'SAVE AS COPY',
        body: {
          discipline: 'For FatSecret foods with wrong data, use "..." → Save as Copy. Creates your own editable version with the correct macros.',
          balanced: 'Found a food with slightly wrong data? Tap "..." on the food detail screen and choose Save as Copy. Edit whatever needs fixing.',
          mindful: 'The "..." menu on any FatSecret food lets you save your own copy with the data you actually need. No database editing required.',
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
        targetKey: 'none',
        title: 'THE RECIPE BUILDER',
        body: {
          discipline: 'Open the Library → + FAB → Create Recipe. Add every ingredient. The builder calculates total and per-serving nutrition automatically.',
          balanced: 'Tap + in the food library and choose Create Recipe to build a meal. Add your ingredients and the nutrition calculates itself.',
          mindful: 'The recipe builder lets you log home-cooked meals accurately. Add each ingredient once and log portions as needed.',
        },
      },
      {
        targetKey: 'none',
        title: 'ADDING INGREDIENTS',
        body: {
          discipline: 'Search for each ingredient via the food search bar. Set the gram amount per ingredient accurately. Every gram affects the final per-serving number.',
          balanced: 'Search and add each ingredient. Set the gram amount for each one. The total nutrition updates as you add ingredients.',
          mindful: 'Add your ingredients one at a time through the search bar. Set whatever amount you used -- it doesn\'t need to be exact.',
        },
      },
      {
        targetKey: 'none',
        title: 'TOTAL WEIGHT',
        body: {
          discipline: 'Enter the total cooked weight of the recipe. This is the denominator for all per-serving calculations. Weigh it -- don\'t guess.',
          balanced: 'Enter the total weight of the finished recipe. This helps the app calculate how much nutrition is in each serving.',
          mindful: 'The total weight field helps calculate portions. Enter an approximate weight if you don\'t have a scale -- it\'s still useful.',
        },
      },
      {
        targetKey: 'none',
        title: 'SERVINGS COUNT',
        body: {
          discipline: 'Set how many servings the recipe makes. All per-serving nutrition divides by this number. Review the per-serving card before saving.',
          balanced: 'Enter how many servings the recipe makes. The app divides the total nutrition by this number to show per-serving values.',
          mindful: 'How many portions does this recipe make? Enter that number and the per-serving nutrition figures itself out.',
        },
      },
      {
        targetKey: 'none',
        title: 'LOGGING A RECIPE',
        body: {
          discipline: 'Saved recipes appear in the Recipes tab of the food library. Tap to log. Use servings or grams to log your exact portion.',
          balanced: 'Your saved recipes are in the Recipes tab. Tap one to log it -- choose how many servings you had or enter a gram amount.',
          mindful: 'Find your recipes in the Recipes tab. Tap one and log however much you had. The math is already done for you.',
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
          discipline: 'Dots across the top represent your week. Active day is accented. We added demo exercises -- Bench Press and Treadmill -- at the top of today\'s list to walk through the full screen.',
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
          mindful: 'Tap any exercise circle to mark it done. You can check and uncheck anytime -- do what works for your session.',
        },
      },
      {
        targetKey: 'workout_sets_reps',
        title: 'SETS, REPS, REST',
        body: {
          discipline: 'Tap the set/rep/rest fields on any exercise to enter your working weights and reps. This data feeds your progress tracking over time.',
          balanced: 'Tap the sets, reps, or rest fields on any exercise to fill in your working numbers. They save automatically.',
          mindful: 'Tap any field to add your sets, reps, or rest time. Fill in what you want -- nothing is required.',
        },
      },
      {
        targetKey: 'workout_cardio_fields',
        title: 'CARDIO EXERCISES',
        body: {
          discipline: 'Cardio exercises log duration, distance, speed, incline, HR, and calories. This Treadmill demo shows what a filled-in cardio row looks like. Tap the pencil to edit any cardio exercise and fill in what you tracked.',
          balanced: 'Cardio exercises have their own set of fields -- duration, distance, speed, and more. This demo Treadmill shows what a logged cardio exercise looks like. Tap the pencil to edit.',
          mindful: 'This demo Treadmill shows what a cardio exercise looks like when logged. Tap the pencil on any cardio exercise to fill in whatever you tracked -- no minimum required.',
        },
      },
      {
        targetKey: 'workout_exercise_row',
        title: 'EDITING AND REMOVING',
        body: {
          discipline: 'Pencil icon edits the exercise -- update sets, reps, rest, or name. Trash icon removes it permanently. Long-press the left grip to drag and reorder the list. All changes save automatically.',
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
          mindful: 'The counter shows how many exercises you\'ve checked off. Green means you\'ve gotten to everything -- no pressure if you don\'t.',
        },
      },
      {
        targetKey: 'workout_effort',
        tutorialAction: 'deleteTutorialExercise',
        title: 'TODAY\'S EFFORT',
        body: {
          discipline: 'Rate your session 1-10 at the end. This feeds your Effort vs Results analysis in Stats. Honest ratings only -- the analytics depend on it. Tap DONE and the two demo exercises will be removed.',
          balanced: 'After your workout, rate how hard you pushed on a scale of 1-10. This data feeds your performance analysis in Stats. Tap DONE and we will clean up the demo exercises.',
          mindful: 'At the end of your session, rate how it felt on a scale of 1-10. There\'s no right answer -- just your honest read. Tap DONE and we will remove the demo exercises.',
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
          discipline: 'A program is a weekly training template. It assigns exercises to each day of the week. Load one and your workout tab is pre-built.',
          balanced: 'A program is a weekly training plan. It fills in your workout days automatically so you don\'t have to build each one from scratch.',
          mindful: 'A program is a weekly schedule of workouts. Once loaded, each day is pre-filled with exercises -- just show up and check off.',
        },
      },
      {
        targetKey: 'none',
        title: 'PRESET PROGRAMS',
        body: {
          discipline: 'Go to Library → Programs tab. Preset programs: PPL, Upper/Lower, Full Body 3x, Cardio Focus, Rest Heavy. Each is built around proven principles.',
          balanced: 'The Library → Programs tab has several ready-made programs. PPL, Upper/Lower, Full Body -- each designed for different training goals.',
          mindful: 'Ready-made programs are in the Library. Browse them and load whichever feels like a good fit for where you are.',
        },
      },
      {
        targetKey: 'none',
        title: 'LOADING A PROGRAM',
        body: {
          discipline: 'Tap LOAD PROGRAM on any preset. It replaces your current week template. Existing logs and notes are never touched -- only the template changes.',
          balanced: 'Tap LOAD PROGRAM to activate a program. Your previous exercise logs are kept -- only the template for each day changes.',
          mindful: 'Tap LOAD PROGRAM when you\'ve found one that fits. It sets up your week but doesn\'t delete anything you\'ve already logged.',
        },
      },
      {
        targetKey: 'none',
        title: 'MY PROGRAMS',
        body: {
          discipline: 'Need something custom? Build your own in Library → Programs → Create Program. Assign tags and exercises to each day. Save and load it.',
          balanced: 'You can build your own program in the Library. Set what you want each day of the week and save it for future use.',
          mindful: 'If none of the presets feel right, build your own. Set each day however works for your schedule and body.',
        },
      },
      {
        targetKey: 'none',
        title: 'CLEARING A PROGRAM',
        body: {
          discipline: 'Tap ACTIVE (shows in the Programs tab) to clear a running program. Days revert to unassigned. Your logs are untouched.',
          balanced: 'To remove a program, go to the Programs tab in the Library and tap the ACTIVE row to clear it. Logs and notes stay intact.',
          mindful: 'If you want to go without a program, tap the ACTIVE row in the Programs tab to clear it. Nothing logged is lost.',
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
          discipline: 'Routine = one day\'s exercise list saved for reuse. Program = full week template. Use routines when you want flexibility day-to-day.',
          balanced: 'A routine is a saved workout for one day. A program covers the whole week. Routines are more flexible -- load them on demand.',
          mindful: 'Routines are single-day saved workouts. Think of them as building blocks you can pull out whenever you want.',
        },
      },
      {
        targetKey: 'none',
        title: 'BUILDING A ROUTINE',
        body: {
          discipline: 'Library → Routines tab → FAB → Create Routine. Name it, add exercises via search or browse. Set sets/reps/rest per exercise.',
          balanced: 'Go to Library → Routines tab, then tap the + FAB to build a routine. Give it a name and add exercises from the library.',
          mindful: 'In the Library, go to the Routines tab and tap + to create a routine. Add exercises at whatever detail level feels right.',
        },
      },
      {
        targetKey: 'none',
        title: 'ADDING EXERCISES',
        body: {
          discipline: 'Search inline or tap Browse to open the full exercise library. Already-added exercises are dimmed. Sets/reps/rest default blank -- fill them in.',
          balanced: 'Search for exercises directly or tap Browse Library to pick from the full list. Set any fields you want per exercise.',
          mindful: 'Add exercises by searching or browsing. You can fill in sets and reps or leave them blank -- whatever matches how you train.',
        },
      },
      {
        targetKey: 'none',
        title: 'LOADING A ROUTINE',
        body: {
          discipline: 'Workout tab FAB → Load Routine. Pick the routine and target day. Loads in one tap. Existing exercises on that day are replaced.',
          balanced: 'To load a routine, tap the FAB on the Workout tab and choose Load Routine. Pick which day you want to load it onto.',
          mindful: 'Tap the FAB on the Workout tab and choose Load Routine. Pick any day of the week -- it fills in the exercises for you.',
        },
      },
      {
        targetKey: 'none',
        title: 'STARRED ROUTINES',
        body: {
          discipline: 'Star your most-used routines in the Routines tab for quick access. Drag to reorder the list. Keep your best work at the top.',
          balanced: 'Star a routine to keep it at the top of your list. Drag to reorder them however makes sense for your training.',
          mindful: 'Star routines you use often so they\'re easy to find. Drag to arrange them in whatever order feels natural.',
        },
      },
    ],
  },

  {
    id: 'exercise_library',
    name: 'Exercise Library',
    description: 'Search exercises, filter by muscle group, and create custom ones.',
    tab: 'workout',
    steps: [
      {
        targetKey: 'none',
        title: 'SEARCHING EXERCISES',
        body: {
          discipline: 'Open the Library from the workout tab header. Search bar is always visible. Find any exercise by name -- database covers all major lifts and machines.',
          balanced: 'Open the Library from the Workout header. Search by name to find any exercise. Results update as you type.',
          mindful: 'The library is opened from the Workout header. Search by name or browse the full list.',
        },
      },
      {
        targetKey: 'none',
        title: 'FILTERING',
        body: {
          discipline: 'Tap the Filter button to narrow by muscle group, exercise type, or tag. Stack filters for precise selection. Filter resets on library exit.',
          balanced: 'Tap Filter to narrow results by muscle group, type, or tag. Multiple filters can be active at once.',
          mindful: 'The Filter button lets you narrow results by body part or exercise type. Useful when you know what you want to train but not the name.',
        },
      },
      {
        targetKey: 'none',
        title: 'EXERCISE DETAIL',
        body: {
          discipline: 'Tap any exercise row to open its detail modal. Shows muscle map, HOW TO PERFORM steps, primary and secondary muscles. Study it.',
          balanced: 'Tap any exercise to see its detail -- a muscle map showing what it works and step-by-step instructions for how to do it.',
          mindful: 'Tap any exercise for its detail page. There\'s a muscle diagram and step-by-step instructions if you want them.',
        },
      },
      {
        targetKey: 'none',
        title: 'MUSCLE MAP',
        body: {
          discipline: 'Orange = primary muscles worked. Muted orange = secondary. Front and back views. Use this to ensure balanced training across all muscle groups.',
          balanced: 'The muscle diagram shows what the exercise works. Orange is primary, lighter is secondary. Front and back views are shown.',
          mindful: 'The muscle map is just a visual of what the exercise engages. It\'s a helpful reference, not a prescription.',
        },
      },
      {
        targetKey: 'none',
        title: 'CREATING AN EXERCISE',
        body: {
          discipline: 'Tap the FAB → Create Exercise. Name, type (lift/cardio), muscles, and instructions. Saved to your library permanently.',
          balanced: 'Tap the + FAB and choose Create Exercise to add your own. Fill in the name, type, and any details you want to track.',
          mindful: 'To add a custom exercise, tap the + FAB and choose Create Exercise. Name it and add as much detail as you want.',
        },
      },
    ],
  },

  // ─── STATS TAB ────────────────────────────────────────────────────────────────

  {
    id: 'graph_creator',
    name: 'Graph Creator',
    description: 'Add custom graphs to your Stats page and pin them to your home screen.',
    tab: 'stats',
    steps: [
      {
        targetKey: 'stats_fab',
        title: 'ADDING A GRAPH',
        body: {
          discipline: 'Tap the + FAB in the bottom-right of Stats. Choose "Add Graph." 19 data types across 4 categories. Build exactly what you want to track.',
          balanced: 'Tap the + FAB in Stats and choose "Add Graph." You\'ll walk through picking a data type, chart style, and timeframe.',
          mindful: 'Tap the + button in Stats and choose "Add Graph." Pick what you want to see and the app builds the chart for you.',
        },
      },
      {
        targetKey: 'none',
        title: 'PICKING DATA',
        body: {
          discipline: 'Choose from 19 data types: Nutrition (calories, macros, fiber, sodium), Activity (steps, active cals, exercise mins, effort), Body (weight, body fat), Sleep & Recovery (score, hours).',
          balanced: 'Pick what you want to graph. Options include calories, macros, steps, weight, sleep, and more -- organized by category.',
          mindful: 'Choose from the available data types. Pick whatever feels interesting or useful to see over time.',
        },
      },
      {
        targetKey: 'none',
        title: 'CHART TYPE',
        body: {
          discipline: 'Line or bar. Line = trends and rates of change. Bar = daily volumes. Macros force stacked bar (protein/carbs/fat per day). Choose based on the story you want to tell.',
          balanced: 'Choose line or bar chart. Line charts are good for trends, bar charts for daily amounts. Macros use stacked bars automatically.',
          mindful: 'Line or bar -- either works. Pick whichever looks clearer to you. You can always change it later.',
        },
      },
      {
        targetKey: 'none',
        title: 'TIMEFRAME AND COLOR',
        body: {
          discipline: '7, 30, or 90 days. 7d shows recent daily detail. 90d shows trends. Color picker lets you own the visual. 8 curated options.',
          balanced: 'Pick 7, 30, or 90 days for the chart window. Then choose a color from the swatches to personalize the graph.',
          mindful: 'Choose how many days to show and a color that resonates. 7 days shows recent detail, 90 days shows the bigger picture.',
        },
      },
      {
        targetKey: 'none',
        title: 'EDITING AND PINNING',
        body: {
          discipline: 'Tap the gear icon on any graph card to edit label, chart type, timeframe, or color. Pin it to your home screen via the Edit Layout → Add Cards panel.',
          balanced: 'Tap the gear on any graph to edit it. To put a graph on your home screen, open Edit Layout → Add Cards and pin it.',
          mindful: 'Tap the gear icon to change any graph. You can also pin your favorite graphs to the home screen from the Edit Layout panel.',
        },
      },
    ],
  },

  {
    id: 'streaks',
    name: 'Streaks',
    description: 'Set up streak tiles, earn grace days, and understand the saver system.',
    tab: 'stats',
    steps: [
      {
        targetKey: 'stats_streaks_section',
        title: 'YOUR STREAKS',
        body: {
          discipline: 'Streaks track consecutive days of a specific habit. Auto-tracked habits check themselves daily. Manual tiles require a check-in tap.',
          balanced: 'Streaks show how many consecutive days you\'ve hit a specific goal. Some track automatically, some require a daily tap.',
          mindful: 'Streaks count consecutive days of a habit. They\'re a gentle way to see momentum build -- not a pressure system.',
        },
      },
      {
        targetKey: 'stats_streaks_section',
        title: 'STREAK TILES',
        body: {
          discipline: 'Up to 5 active streak tiles. Each shows your current streak and last 7 days. Manual tiles flash "LOGGED" for 1.5s when checked. Long-press to drag reorder.',
          balanced: 'Each tile shows your current streak and a 7-day dot grid. Manual tiles have a tap-to-check-in button. Drag to reorder.',
          mindful: 'Streak tiles show your day count and a week view. Tap to check in on manual habits. Arrange them however you like.',
        },
      },
      {
        targetKey: 'none',
        title: 'MANAGING STREAKS',
        body: {
          discipline: 'Tap the gear on the Streaks card to manage. Add presets (14 types), remove tiles, create custom streaks (name + emoji), reorder.',
          balanced: 'Tap the gear icon to add new streaks, remove ones you don\'t need, or create a custom one with your own name and emoji.',
          mindful: 'The gear icon opens streak management. Add what matters to you, remove what doesn\'t. This is your setup.',
        },
      },
      {
        targetKey: 'none',
        title: 'GRACE DAYS',
        body: {
          discipline: 'Miss one day? Grace days let you cover it without losing your streak. Balanced mode earns more grace days than Discipline. Spend them wisely.',
          balanced: 'Grace days automatically cover a missed day so you don\'t lose your streak. You earn them by maintaining streaks consistently.',
          mindful: 'In Mindful mode, streaks don\'t penalize you. Grace days exist for Balanced and Discipline modes as a buffer for real life.',
        },
      },
      {
        targetKey: 'none',
        title: 'SAVER SYSTEM',
        body: {
          discipline: 'After 7 consecutive days, earn a Streak Saver. Auto-applies on the next missed day. Cap: 1 (Discipline) or 2 (Balanced). Earn them, don\'t waste them.',
          balanced: 'After 7 straight days on a streak, you earn a Saver. It automatically protects you the next time you miss a day.',
          mindful: 'Savers are earned after a week of consistency. They apply automatically if you miss a day -- no action needed.',
        },
      },
      {
        targetKey: 'none',
        title: 'CUSTOM STREAKS',
        body: {
          discipline: 'Tap Create Custom in the manage sheet. Name it, pick an emoji, and check it in manually each day. Track any habit not covered by the 14 presets.',
          balanced: 'Create Custom lets you build a streak for any habit you want to track -- just give it a name and an emoji.',
          mindful: 'Custom streaks are for whatever habit matters to you personally. Name it, pick an emoji, and check in when you want.',
        },
      },
    ],
  },

  {
    id: 'effort_vs_results',
    name: 'Effort vs Results',
    description: 'Generate a data analysis of why your results look the way they do.',
    tab: 'stats',
    steps: [
      {
        targetKey: 'none',
        title: 'WHAT IT DOES',
        body: {
          discipline: 'Effort vs Results is a backward-looking analysis engine. You tell it the window, it finds patterns in your data and explains what\'s driving your outcomes.',
          balanced: 'Effort vs Results analyzes your logged data and surfaces patterns that explain your results. It needs enough data to find real signals.',
          mindful: 'Effort vs Results is an analysis tool. It looks at your data and surfaces observations -- not conclusions, just patterns to consider.',
        },
      },
      {
        targetKey: 'none',
        title: 'PICKING A WINDOW',
        body: {
          discipline: 'Choose 14, 30, or 90 days. More data = more reliable findings. 90-day reports need 30+ logged days. Shorter windows need fewer.',
          balanced: 'Choose how many days to analyze: 14, 30, or 90. Longer windows give more reliable results but need more data.',
          mindful: 'Pick a time window for the analysis. Longer windows give a broader picture, shorter ones are more recent.',
        },
      },
      {
        targetKey: 'none',
        title: 'GENERATING A REPORT',
        body: {
          discipline: 'Tap GENERATE. The engine scans all logged days in the window. If there\'s insufficient data, it tells you exactly how many days are needed.',
          balanced: 'Tap GENERATE to run the analysis. If you don\'t have enough logged days, it\'ll tell you what\'s missing.',
          mindful: 'Tap GENERATE when you\'re ready. If there\'s not enough data yet, the app will let you know without any pressure.',
        },
      },
      {
        targetKey: 'none',
        title: 'READING FINDINGS',
        body: {
          discipline: 'Findings cover: Logging Consistency, Calorie Deficit Accuracy, Burn Accuracy, Macro Quality, Sleep Quality. Each is graded against your actual data.',
          balanced: 'Finding cards explain what the data shows for each key area: consistency, calories, macros, sleep, and burn accuracy.',
          mindful: 'Finding cards share what the data shows. Read them as observations -- not verdicts. Take what\'s useful and leave the rest.',
        },
      },
      {
        targetKey: 'none',
        title: 'CORRELATIONS',
        body: {
          discipline: '9 correlation patterns analyzed: sleep-to-intake, burn days, weekday/weekend, water-to-cals, and more. These are the patterns that explain plateaus.',
          balanced: 'The correlations section shows connections between different habits. Things like sleep affecting next-day eating, or high burn days affecting appetite.',
          mindful: 'Correlations show how different habits connect. These are just patterns -- interesting to notice, not rules to follow.',
        },
      },
    ],
  },

  // ─── PROFILE / SETTINGS ───────────────────────────────────────────────────────

  {
    id: 'faith_and_style',
    name: 'Your Style & Faith Journey',
    description: 'What each coaching mode and faith journey tier changes across the app.',
    tab: 'profile',
    steps: [
      {
        targetKey: 'none',
        title: 'COACHING MODES',
        body: {
          discipline: 'Three modes. Discipline: tight thresholds, direct language, full metrics. Balanced: encouraging, forgiving thresholds. Mindful: no color coding, no judgment, simplified.',
          balanced: 'Three coaching modes shape how the app communicates with you. Discipline is direct, Balanced is encouraging, Mindful is judgment-free.',
          mindful: 'The three modes change how the app talks to you. Discipline is performance-focused, Balanced is in the middle, Mindful removes all judgment framing.',
        },
      },
      {
        targetKey: 'none',
        title: 'DISCIPLINE MODE',
        body: {
          discipline: 'Tight color thresholds (±50 cal is green). Direct language throughout. Streak breaks surface a specific modal. Built for people who want accountability.',
          balanced: 'Discipline mode uses tighter color thresholds and direct language. Best for people who want clear, performance-focused feedback.',
          mindful: 'Discipline mode is for people who want direct feedback with tight standards. It\'s an option -- not the default or the goal.',
        },
      },
      {
        targetKey: 'none',
        title: 'BALANCED MODE',
        body: {
          discipline: 'Balanced is the default. Forgiving thresholds (±150 cal is green). Encouraging language. Full metrics visible. Good middle ground.',
          balanced: 'Balanced is the default mode. It keeps full data visibility with encouraging language and forgiving color thresholds.',
          mindful: 'Balanced is the default. It gives you all the data with language that supports rather than judges.',
        },
      },
      {
        targetKey: 'none',
        title: 'MINDFUL MODE',
        body: {
          discipline: 'Mindful removes color coding, judgment language, net calories, score bars, and IF countdown. All data still present -- just framed neutrally.',
          balanced: 'Mindful mode removes color coding and performance framing. Weight and calories appear without judgment. Built for people who find numbers stressful.',
          mindful: 'Mindful mode is designed for you. No color coding. No win/loss framing. Everything simplified and neutral. You still have access to your data.',
        },
      },
      {
        targetKey: 'none',
        title: 'FAITH JOURNEY',
        body: {
          discipline: 'Rooted: full faith experience -- verse, morning intention, prayer, Bible, gratitude streak. Exploring: faith present but gentle. Not Right Now: faith features hidden.',
          balanced: 'Rooted shows all faith features. Exploring keeps them available without prompts. Not Right Now is a pure fitness experience.',
          mindful: 'Your Faith Journey setting is entirely yours. Rooted, Exploring, or Not Right Now -- no judgment on any choice.',
        },
      },
      {
        targetKey: 'none',
        title: 'SWITCHING ANYTIME',
        body: {
          discipline: 'Mode and Faith Journey are in Settings → Faith & Style. Switch anytime. Switching never deletes data. Find what works.',
          balanced: 'You can change both settings anytime in Settings → Faith & Style. Switching never deletes any of your logged data.',
          mindful: 'Both settings can be changed whenever you want, as many times as you want. Nothing is locked in, and nothing is ever deleted.',
        },
      },
    ],
  },
];

// ─── Tab → Tutorial Mapping ───────────────────────────────────────────────────

export const TAB_TUTORIALS: Record<string, string[]> = {
  home: ['cal_card', 'macros_card', 'sleep_card', 'if_card', 'yvy_card'],
  log: ['log_food', 'manage_log', 'barcode', 'create_food', 'recipes'],
  workout: ['workout_basics', 'programs', 'routines', 'exercise_library'],
  stats: ['graph_creator', 'streaks', 'effort_vs_results'],
  profile: ['faith_and_style'],
};

export function getTutorialById(id: string): Tutorial | undefined {
  return TUTORIALS.find(t => t.id === id);
}

export function getTutorialsForTab(tab: keyof typeof TAB_TUTORIALS): Tutorial[] {
  const ids = TAB_TUTORIALS[tab] ?? [];
  return ids.map(id => TUTORIALS.find(t => t.id === id)).filter(Boolean) as Tutorial[];
}
