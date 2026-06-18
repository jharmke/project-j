export interface TooltipDefinition {
  key: string;
  category: 'Nutrition' | 'Fitness' | 'Sleep & Recovery' | 'Faith' | 'Reports' | 'Habits';
  title: string;
  body: string;
  tutorialId?: string;
  definitions?: { term: string; explanation: string }[];
  example?: {
    label: string;
    lines: { desc: string; value: string }[];
    result: { desc: string; value: string };
  };
}

export const TOOLTIP_REGISTRY: TooltipDefinition[] = [
  {
    key: 'ai_meal_estimator',
    category: 'Nutrition',
    title: 'AI Meal Estimator',
    body: 'For meals you cannot log precisely, like a restaurant plate with no nutrition info, a home-cooked dish, or food someone else made, the AI Meal Estimator gives a close estimate from a photo, a text description, or both. It returns an editable breakdown of calories and macros per item. You review, adjust, and confirm before anything is logged.\n\nThis is a "pretty close" tool, not precise tracking. Portions are assumed when unknown, and accuracy depends on the detail you give. Adding a description gives a sharper result than a photo alone.\n\nFree members get 3 estimates a month, Pro members get 30. A use is only counted when a result is successfully shown to you. Estimates you generate are kept for the rest of the day, so you can reopen one if you lose the screen.',
    definitions: [
      { term: 'Possibly Not Included', explanation: 'Hidden additions the AI flags but does not add to the numbers, like cooking oils, butter, or sauces. They are there to prompt you, not to inflate the estimate. Edit an item up if you think something was missed.' },
      { term: 'Needs Your Review', explanation: 'Items the AI was genuinely unsure about. You confirm, edit, or remove each one before the meal can be added to your log.' },
      { term: 'Portion size', explanation: 'Scale the whole estimate up or down if the serving was larger or smaller than standard. You can also scale a single item from inside its edit panel.' },
    ],
  },
  {
    key: 'day_score',
    tutorialId: 'day_score',
    category: 'Reports',
    title: 'Day Summary',
    body: 'Each morning you get a single 0-100 score for the day before -- a snapshot of how the day went across three areas. It is weighted Nutrition 35%, Recovery 35%, Activity 30%. Any area with no logged data drops out and the rest re-balance, so you are only ever graded on what you actually tracked.\n\nScoring is proximity-based, not pass/fail: getting close to a goal earns most of the points. Today is never scored while it is still in progress -- the score only appears the morning after.',
    definitions: [
      {
        term: 'Nutrition (35%)',
        explanation: 'Calories vs your target, protein vs your goal, and water vs your goal. No calorie goal set yet? Nutrition scores on protein and water until you set one.',
      },
      {
        term: 'Recovery (35%)',
        explanation: 'Your real Recovery Score for the night: overnight HRV, sleep, resting heart rate, the prior day\'s activity, and breathing rate, each compared to your own baseline. It needs overnight heart data from your Apple Watch. On a night the watch was off, Recovery falls back to your sleep score so the day can still be scored. (VO2 Max, Cardio Recovery, and Blood Oxygen are shown for context but do not feed the score.)',
      },
      {
        term: 'Activity (30%)',
        explanation: 'Active calories vs your goal, plus workout completion on training days. Tag a day as Rest and it will not be dinged for having no workout -- your movement still earns credit.',
      },
      {
        term: 'Excluding a day',
        explanation: 'Genuine off days (sick, travel, a planned break) can be excluded so they do not drag down your weekly average. Tap "Exclude this day" on the summary, or use the toggle in Day Detail.',
      },
    ],
  },
  {
    key: 'sleep_score',
    tutorialId: 'sleep_card',
    category: 'Sleep & Recovery',
    title: 'Sleep Score',
    body: 'Your sleep score is a 0-100 rating. The formula depends on what data is available.\n\nWith Apple Health stage data: Duration 40 pts (power curve vs your sleep goal), Deep sleep 30 pts (ideal around 20% of total), REM sleep 30 pts (full credit at 22%+, never penalized for extra).\n\nWithout stage data: Duration 60 pts + Feel rating (1-10) up to 30 pts + Bedtime consistency up to 10 pts. Consistency compares your bedtime to your 7-day rolling average: within 30 min earns full 10 pts, within 60 min earns 7 pts, beyond that earns less.',
    example: {
      label: 'Apple Health Example',
      lines: [
        { desc: 'Duration  (7.5 hrs, goal 8 hrs)', value: '37 / 40 pts' },
        { desc: 'Deep sleep  (19% of total)',       value: '28 / 30 pts' },
        { desc: 'REM sleep  (21% of total)',        value: '28 / 30 pts' },
      ],
      result: { desc: 'Final Score', value: '93: Well Rested' },
    },
  },
  {
    key: 'sleep_hub',
    category: 'Sleep & Recovery',
    title: 'Sleep Hub',
    body: 'This is the home for everything sleep. The Last Night card shows how long you slept, your Sleep Score, and the night laid out as a timeline you can drag across to read each stage. Below it sit your Sleep Score trend, a per night stage history, and your key sleep metrics.\n\nTwo scores live in this app and they answer different questions. Sleep Score is how well you slept last night. Recovery Score, on the Recovery tab, is how ready your body is to perform today. You can sleep well and still have a low Recovery if your body is run down, and that gap is the useful signal.\n\nStage data (Core, Deep, REM) comes from Apple Health. If you log sleep by hand, your duration and score still count toward your trend, but the stage charts need Apple Health.',
    definitions: [
      { term: 'Core sleep', explanation: 'Lighter sleep that makes up most of the night. It still matters: it supports memory and recovery between the deeper stages.' },
      { term: 'Deep sleep', explanation: 'The most physically restorative stage, when your body repairs. A healthy night is roughly 13 to 23 percent of total sleep. Cooler, darker rooms and avoiding late heavy meals help.' },
      { term: 'REM sleep', explanation: 'Dream sleep, important for memory and mood. Roughly 20 to 25 percent of total is healthy. Most of it happens in your later cycles, so a steady wake time protects it.' },
      { term: 'Sleep timeline', explanation: 'The shape of your night from bedtime to wake. Higher bands are lighter stages, lower bands are deeper. Drag a finger across to read the stage and time at any point.' },
      { term: 'Sleep balance', explanation: 'Your total sleep across the range versus your goal. A surplus means you came out above your goal overall; a deficit means below. On goal means right at it.' },
      { term: 'Bedtime consistency', explanation: 'How steady your bedtime is from night to night. A steadier schedule helps you fall into deep sleep faster.' },
      { term: 'Sleep Coach', explanation: 'A short, plain-English read on your recent sleep. It looks across your last several nights, picks the one thing most worth knowing, and explains what it means and what helps. It focuses on sleep only.' },
    ],
  },
  {
    key: 'macros_today',
    tutorialId: 'macros_card',
    category: 'Nutrition',
    title: 'Macros Today',
    body: 'Track your three core macronutrients -- protein, carbs, and fat -- against your daily goals.',
    definitions: [
      {
        term: 'Protein / Carbs / Fat',
        explanation: 'The three macronutrients that make up your calories. Each plays a different role -- protein builds muscle, carbs fuel energy, fat supports hormones and recovery.',
      },
      {
        term: 'Goals',
        explanation: 'Set in your profile as either a ratio (% of total calories) or fixed gram targets. The bars show how close you are to each goal for the day.',
      },
      {
        term: 'Color Coding',
        explanation: 'Each macro has its own color -- green for protein, amber for carbs, red for fat. Any macro that exceeds its goal turns orange as a warning.',
      },
    ],
  },
  {
    key: 'fitness_metrics',
    category: 'Fitness',
    title: 'Fitness Metrics',
    body: 'Advanced health metrics pulled automatically from Apple Health. Most require an Apple Watch.\n\nColor ranges are based on ACSM, ACE, and AHA research guidelines. For informational purposes only. Not medical advice.',
    definitions: [
      {
        term: 'VO2 Max',
        explanation: 'A measure of how efficiently your body uses oxygen during exercise. Higher is better. Ranges are age and sex adjusted using ACSM tables. Apple Watch estimates this during outdoor walks and runs.',
      },
      {
        term: 'Cardio Recovery',
        explanation: 'How many beats per minute your heart drops in the first minute after a workout ends. Per AHA research, a drop of 20+ bpm is healthy. Higher recovery means your cardiovascular system bounces back faster.',
      },
      {
        term: 'Resting HR',
        explanation: 'Your heart rate while at rest. 40-75 bpm is healthy; athletes often sit in the 40s-50s. 76-90 is elevated. Above 90 is high. Below 40 may indicate bradycardia unless you are an elite athlete.',
      },
      {
        term: 'Resp. Rate',
        explanation: 'Breaths per minute while at rest. Normal range is 12-20 breaths/min. Apple Watch measures this during sleep. Elevated rate can be an early signal of illness or stress.',
      },
      {
        term: 'Blood O2',
        explanation: 'Blood oxygen saturation (SpO2): how well your red blood cells are carrying oxygen. 95-100% is normal. Apple Watch measures this during sleep and on demand.',
      },
      {
        term: 'Body Fat',
        explanation: 'Percentage of total body weight that is fat. Requires a connected BIA smart scale (Withings, Garmin Index, etc.). Apple Health syncs from the device; it does not calculate this itself. BIA measurements carry ±3-5% error. Color ranges based on ACE fitness categories by sex.',
      },
    ],
  },
  {
    key: 'vs_yesterday',
    tutorialId: 'yvy_card',
    category: 'Fitness',
    title: 'You vs Yesterday',
    body: 'A daily head-to-head between today you and yesterday you -- across the metrics that matter most.',
    definitions: [
      {
        term: 'Metrics',
        explanation: 'Up to 4 metrics are shown at a time. Net Cals, Steps, Sleep Score, and Water are shown first. Weight, Active Calories, and Sleep Hours fill in when the primary metrics aren\'t available.',
      },
      {
        term: 'Color Coding',
        explanation: 'Metrics where today is ahead light up in your accent color with a highlight bar on the left. Metrics where yesterday was higher appear dimmed with a bar on the right. Ties show both values in the same muted tone.',
      },
    ],
  },
  {
    key: 'if_countdown',
    tutorialId: 'if_card',
    category: 'Nutrition',
    title: 'Intermittent Fast',
    body: 'Track your daily fasting window from first meal to last -- and see how you did against your target.',
    definitions: [
      {
        term: 'Fasting Method',
        explanation: 'The ratio of fasting hours to eating hours. 16:8 means 16 hours fasted, 8 hours to eat. Pick the method that fits your lifestyle.',
      },
      {
        term: 'Starting Your Window',
        explanation: 'Tap "Tap when you eat your first meal" the moment you break your fast. The eating window countdown starts from that point.',
      },
      {
        term: 'Closing Your Window',
        explanation: 'Tap "Last Meal" when you finish eating for the day. This locks in your actual fasting window.',
      },
      {
        term: 'Result',
        explanation: 'Once your window is closed, you\'ll see your target vs your actual eating window -- and whether you hit your goal.',
      },
    ],
  },
  {
    key: 'calories_today',
    tutorialId: 'cal_card',
    category: 'Nutrition',
    title: 'Calories Today',
    body: 'Everything you need to know about how your calories are tracked and what each number means.',
    definitions: [
      {
        term: 'On-Pace Target',
        explanation: 'The number after the slash. It\'s how much you can eat today and still stay on pace: your resting burn (BMR) plus the active calories you\'ve burned today, minus your pace deficit. It\'s floored at your daily target so a dead watch or an early morning never shows a too-low number, and it climbs above that floor once you out-burn a normal day.',
      },
      {
        term: 'Remaining',
        explanation: 'Your on-pace target minus what you\'ve eaten so far today. Goes red when you\'ve exceeded it.',
      },
      {
        term: 'Active',
        explanation: 'Calories burned through exercise and movement, pulled live from Apple Health. If these seem high, you can adjust accuracy in Settings → Health.',
      },
      {
        term: 'Live Net',
        explanation: 'The truest picture of your day: calories consumed minus active burn minus the calories your body has already burned at rest since midnight (running BMR). A lower Live Net means more of a deficit.',
      },
      {
        term: 'Running BMR',
        explanation: 'Your body burns calories around the clock just to stay alive: breathing, circulation, organ function. Running BMR is the portion of that already earned since midnight. It grows throughout the day so your Live Net gets lower even if you don\'t eat or move.',
      },
      {
        term: 'Color Coding',
        explanation: 'The big calorie number is green when you\'re right around your on-pace target, amber as you drift from it, and red when you\'re well off it in either direction.',
      },
    ],
    example: {
      label: 'Live Net Example',
      lines: [
        { desc: 'Calories consumed',   value: '1,400 kcal' },
        { desc: 'Active burn',         value: '− 320 kcal' },
        { desc: 'Running BMR (14 hrs)', value: '− 510 kcal' },
      ],
      result: { desc: 'Live Net', value: '570 kcal' },
    },
  },
  {
    key: 'todays_total',
    category: 'Nutrition',
    title: 'Today\'s Total',
    body: 'Your running calorie and macro totals for the day, using the same on-pace math as your home calorie card.',
    definitions: [
      {
        term: 'On-Pace Target',
        explanation: 'The number after the slash. It\'s how much you can eat today and still stay on pace: your resting burn (BMR) plus the active calories you\'ve burned today, minus your pace deficit. It\'s floored at your daily target so a dead watch or an early morning never shows a too-low number, and it climbs above that floor once you out-burn a normal day.',
      },
      {
        term: 'Protein / Carbs / Fat',
        explanation: 'The mini-bars show each macro\'s total so far against its daily goal: protein green, carbs amber, fat red. The number is grams eaten and the bar fills as you log.',
      },
      {
        term: 'Remaining',
        explanation: 'Your on-pace target minus what you\'ve eaten so far today. Goes red when you\'ve exceeded it.',
      },
      {
        term: 'Active',
        explanation: 'Calories burned through exercise and movement, pulled live from Apple Health. If these seem high, you can adjust accuracy in Settings → Health.',
      },
      {
        term: 'Live Net',
        explanation: 'The truest picture of your day: calories consumed minus active burn minus the calories your body has already burned at rest since midnight (running BMR). A lower Live Net means more of a deficit.',
      },
      {
        term: 'Color Coding',
        explanation: 'The calorie number is green when you\'re right around your on-pace target, amber as you drift from it, and red when you\'re well off it in either direction.',
      },
    ],
  },
  {
    key: 'burn_accuracy',
    category: 'Fitness',
    title: 'Burn Accuracy',
    body: 'Apple Watch and most fitness trackers are known to overestimate active calorie burn -- often by 15-30%. This setting lets you apply a correction factor so your net calorie math reflects what you actually trust.',
    definitions: [
      {
        term: '100% (Default)',
        explanation: 'Uses Apple Health\'s number as-is. Good starting point if you\'re unsure how much your device overestimates.',
      },
      {
        term: '90% / 80% / 70%',
        explanation: 'Applies a reduction before your net calorie calculation. Affects your calorie target, net calories, and You vs Yesterday comparisons.',
      },
    ],
    example: {
      label: 'Example at 80%',
      lines: [
        { desc: 'Apple Health reported', value: '400 kcal' },
        { desc: 'Your adjustment (80%)', value: '× 0.80' },
      ],
      result: { desc: 'Used in net calculation', value: '320 kcal' },
    },
  },
  {
    key: 'neat',
    category: 'Fitness',
    title: 'NEAT',
    body: 'Non-Exercise Activity Thermogenesis: the calories your body burns through all movement that is not a formal workout. Walking to your car, taking the stairs, pacing during a call, household chores, fidgeting. Every bit of non-gym movement adds up here.\n\nNEAT is one of the biggest variables in total daily burn. Two people with the same workout routine can have a 300-500 calorie daily gap purely from how much they move outside the gym. That gap does not show up in your workout log.\n\nYour step count is the best proxy for NEAT. On a cut, the body tends to quietly suppress it (fewer unconscious movements, less fidgeting) to conserve energy. Steps trending down week over week without you noticing is the most common hidden reason a cut stalls.',
    definitions: [
      {
        term: 'Why steps are the proxy',
        explanation: 'You cannot directly measure NEAT without lab equipment, but step count captures most of it. A consistent step goal accounts for the biggest variable in your daily burn that workouts do not cover.',
      },
      {
        term: 'Adaptive suppression',
        explanation: 'During a calorie deficit the body unconsciously reduces non-exercise movement to slow the energy drain. You may not notice it happening. Watching your step trend, not just hitting goal on gym days, is how you catch it.',
      },
    ],
  },
  {
    key: 'advanced_nutrition',
    category: 'Nutrition',
    title: 'Advanced Nutrition',
    body: 'These groups track 23 nutrients across 6 categories: carbs, fats, core, vitamins, B vitamins, and minerals. Each value shows your daily total vs your goal.\n\nTap the gear icon to set goals. Choose from 5 presets (Standard, Keto, Heart Health, High Fiber, Athletic) or fine-tune any field manually.\n\nColor coding tells you what direction matters for each nutrient. Green means you\'re at or above goal for nutrients you want more of (fiber, vitamins, minerals). Red means you\'ve exceeded a limit for nutrients to keep in check (sodium, saturated fat, trans fat). Accent color means you\'re within range on either type.',
    definitions: [
      { term: 'Want More (green at goal)', explanation: 'Fiber, vitamins, minerals, potassium. These are nutrients most people fall short on. Green means you hit or beat your goal. Accent color means you\'re still working toward it.' },
      { term: 'Want Less (red over goal)', explanation: 'Sodium, added sugars, saturated fat, trans fat, cholesterol, caffeine. Green-to-red as you approach or exceed your limit. Accent color means you\'re under the limit.' },
      { term: 'Neutral (accent only)', explanation: 'Total fat, sugar alcohols, net carbs. No directional target. Accent color always, just tracking.' },
      { term: 'Goal Presets', explanation: 'Standard uses FDA Daily Values for a 2,000 calorie diet. Keto raises fat and lowers sugar/carb targets. Heart Health tightens sodium and saturated fat. High Fiber targets 40g. Athletic increases protein-adjacent nutrients and electrolytes.' },
      { term: 'Net Carbs', explanation: 'Total carbs minus fiber and sugar alcohols. The number most relevant if you track low-carb or keto.' },
    ],
  },
  {
    key: 'effort_vs_results',
    tutorialId: 'effort_vs_results',
    category: 'Reports',
    title: 'Effort & Results',
    body: 'This report compares what your logged data predicts against what actually happened. It looks at five areas: calorie deficit vs actual weight change, burn accuracy, logging consistency, macro quality, and sleep. Each section only fires when there\'s enough data to say something real.\n\nThe report can\'t see what you didn\'t log. Inconsistent logging, untracked meals, or excluded days all affect what it can tell you.',
    definitions: [
      {
        term: 'Data quality matters',
        explanation: 'The report works with what you\'ve logged. If food wasn\'t tracked on certain days, weight wasn\'t recorded, or days were excluded, those gaps show up in the analysis. The more consistently you log, the more accurate the findings.',
      },
      {
        term: 'Each pattern has its own timeframe',
        explanation: 'There\'s no window to pick. Every pattern is measured over the span that fits it: recent metrics like protein and sleep over the last couple weeks, behavioral patterns over about a month, and weight trends over up to 90 days. Each card states its own timeframe, so you see the right read for each one without choosing anything.',
      },
      {
        term: 'Not medical advice',
        explanation: 'These findings are based on your self-logged data. They\'re informational starting points, not diagnoses. If something seems off, talk to a doctor or registered dietitian.',
      },
    ],
  },
  {
    key: 'smart_tip',
    category: 'Reports',
    title: 'Smart Tip',
    body: 'Smart Tips are pattern-based coaching observations drawn from your logged data over the past 7 to 14 days. They read your patterns across protein, hydration, sleep, activity, and recovery, then surface the one finding most relevant to you right now.\n\nThe tip here is your highest-priority observation today. Tap the card to open Effort vs Results and see the full picture behind it.\n\nTips update once per day as your data changes. The more consistently you log, the more accurate and specific the tips become.',
    definitions: [
      {
        term: 'Pattern tips',
        explanation: 'Fire when a single metric has been consistently off target across most of the last 7 days. Examples: protein under goal, water goal missed most days, sleep scores low.',
      },
      {
        term: 'Positive tips',
        explanation: 'Appear when something is going consistently well. Hitting your water goal 7 days straight, strong sleep scores, activity streak. The system notices wins, not just gaps.',
      },
      {
        term: 'Cross-signal insights',
        explanation: 'The most valuable tier. These require enough data to detect a correlation between two signals. For example, sleep scores consistently lower after low-protein days. They take more time and logging to unlock.',
      },
    ],
  },
  {
    key: 'streaks_card',
    tutorialId: 'streaks',
    category: 'Habits',
    title: 'Streaks',
    body: 'Streaks track how many consecutive days you hit a goal or complete a habit. Each streak counts backward from today -- a streak ends the moment you miss a day.\n\nTap the gear icon to add, remove, or create custom streaks. Your configuration is saved and never reset automatically.',
    definitions: [
      { term: 'Workout', explanation: 'Counts any day you log at least one exercise. Rest days do not break the streak.' },
      { term: 'Calories', explanation: 'Counts completed days you hit your calorie goal. On days with workout or activity data, it checks your net calories (food minus active burn minus the calories your body burned at rest) against your weight-goal pace target. On days without activity data, it checks your intake against your calorie target. Today is not counted until the day ends.' },
      { term: 'Protein', explanation: 'Counts days your total logged protein meets or exceeds your daily protein goal set in profile.' },
      { term: 'Water', explanation: 'Counts days your total logged water meets or exceeds your water goal.' },
      { term: 'Steps', explanation: 'Counts days your Apple Health step count meets or exceeds your step goal.' },
      { term: 'Active Cals', explanation: 'Counts days your active calorie burn from Apple Health meets or exceeds your active calorie goal, adjusted for your burn accuracy setting.' },
      { term: 'Exercise Mins', explanation: 'Counts days your Apple Health exercise minutes meet or exceed your exercise minutes goal.' },
      { term: 'Sleep Duration', explanation: 'Counts days your total sleep time meets or exceeds your sleep goal.' },
      { term: 'Sleep Quality', explanation: 'Counts days your calculated sleep score is 85 or higher -- the Well Rested threshold. Requires Apple Health stage data or a feel rating.' },
      { term: 'Bible', explanation: 'Counts days you log a reflection on a Bible verse in the Bible reader. Logging today counts immediately -- Bible streaks do not wait for the day to end.' },
      { term: 'Gratitude', explanation: 'Counts days you log a gratitude entry in the journal. Logging today counts immediately.' },
      { term: 'Journaling', explanation: 'Counts days you save a Personal entry in the journal. Bible reflections, gratitude entries, workout notes, and prayer entries do not count toward this streak -- only entries filed under the Personal category.' },
      { term: 'Morning Intention', explanation: 'A manual habit streak. Tap the tile each morning to check in. Tap again to undo if you tapped by mistake.' },
      { term: 'Prayer', explanation: 'A manual habit streak. Tap the tile to check in for the day. Tap again to undo.' },
      { term: 'Custom', explanation: 'Create your own streak with any name and emoji. Custom streaks are always manual -- tap the tile to check in each day.' },
    ],
  },
  {
    key: 'at_a_glance',
    category: 'Reports',
    title: 'At a Glance',
    body: 'A quick summary of your selected period (7 days, 30 days, and so on). Some stats are averages, others are day counts. Two of the counts use different denominators on purpose, which is worth knowing.',
    definitions: [
      {
        term: 'Completed days only',
        explanation: 'Calories, net calories, active calories, water, and steps skip today while it is still in progress. A partial day would drag the averages down and is not a finished result yet.',
      },
      {
        term: 'CAL GOAL / DAY',
        explanation: 'How many of your logged, completed days you hit your calorie goal, out of the days you actually logged food. Example: 4 / 6 means 4 hits across 6 logged days. A day with no food logged cannot be a calorie hit, so it is not in the total.',
      },
      {
        term: 'WORKOUT DAYS',
        explanation: 'How many days you worked out, out of every day in the period (including today). Example: 3 / 7 means 3 workouts across the full week. This is why CAL GOAL and WORKOUT DAYS can show different totals: one counts logged days, the other counts all days.',
      },
      {
        term: 'Sleep, sleep score, and weight',
        explanation: 'These include today. Last night\'s sleep is complete data, and a weigh-in is a finished point-in-time reading, so they count right away.',
      },
    ],
  },
  {
    key: 'net_carbs_explained',
    category: 'Nutrition',
    title: 'Net Carbs',
    body: 'Net carbs are total carbohydrates minus fiber and sugar alcohols. The idea: fiber and sugar alcohols pass through your body largely undigested and have little impact on blood sugar, so many people, especially those following low-carb or keto diets, track net carbs as their real carbohydrate intake rather than total carbs.',
    definitions: [
      {
        term: 'Total Carbs',
        explanation: 'All carbohydrates as listed on the nutrition label, including fiber, sugar, and starch.',
      },
      {
        term: 'Fiber',
        explanation: 'Indigestible carbohydrates that pass through your body without being absorbed. Subtracted from total carbs to get net carbs.',
      },
      {
        term: 'Net Carbs',
        explanation: 'Total carbs minus fiber and sugar alcohols. When net carbs mode is on, this is the number shown on your macro card, log, and stats, and the number compared against your carbs goal.',
      },
      {
        term: 'Sugar Alcohols',
        explanation: 'Partially absorbed sweeteners found in some packaged foods. Subtracted from total carbs along with fiber when net carbs mode is on.',
      },
    ],
    example: {
      label: 'Example',
      lines: [
        { desc: 'Total Carbs',    value: '35g' },
        { desc: 'Fiber',          value: '− 8g' },
        { desc: 'Sugar Alcohols', value: '− 2g' },
      ],
      result: { desc: 'Net Carbs', value: '25g' },
    },
  },
  {
    key: 'diagnostic_correlations',
    category: 'Reports',
    title: 'Patterns in Your Data',
    body: 'Correlations show patterns between two different habits in your data -- and why that pattern matters for your results. Unlike averages, correlations reveal cause-and-effect relationships specific to you.\n\nNot every correlation fires every report. One only surfaces when the pattern is strong enough -- there\'s a minimum delta required for each type.',
    definitions: [
      {
        term: 'For you specifically',
        explanation: 'A generic tip says "poor sleep increases appetite." A correlation says "in your data, the days after poor sleep you ate 220 more calories." That\'s the difference. These are drawn from your logged data, not population averages.',
      },
      {
        term: 'Strength threshold',
        explanation: 'Each correlation has a minimum delta to surface. Sleep-to-calories only fires if the gap is 100+ cal. Sodium-to-scale only fires if the overnight bump is 0.5+ lbs. Below those thresholds the pattern isn\'t strong enough to act on.',
      },
      {
        term: 'Data requirements',
        explanation: 'Correlations need at least 3-7 days of overlapping data for both metrics. If you\'re missing sleep data or haven\'t logged consistently, some correlations won\'t have enough to work with.',
      },
    ],
  },
  {
    key: 'todays_message',
    category: 'Faith',
    title: "Today's Message",
    body: 'A verse for the day, the same one you see on your Home tab so they always match. It rotates through a curated set, one per day. Tap the verse to open it in the Bible reader at that exact passage, where you can read the surrounding chapter.\n\nThis card is read only. It is here for a moment of focus before the rest of your day, not something to track or complete.',
    definitions: [
      { term: 'Same as Home', explanation: 'The verse here and the verse on your Home tab come from one shared rotation, so they are always identical and advance together once per day.' },
      { term: 'Tap to read', explanation: 'Tapping the verse opens the Bible reader at that passage so you can read it in context.' },
      { term: 'Reflect with Halo', explanation: 'Opens Halo, your companion, already aware of the verse so you can talk it through or ask what it means.' },
    ],
  },
  {
    key: 'bible_and_plans',
    tutorialId: 'faith_bible_plans',
    category: 'Faith',
    title: 'Bible and Plans',
    body: 'One card, three ways into Scripture: open the Bible freely, follow a structured Reading Plan, or work through a Devotional. Your reading plans and devotionals are managed on the Plans screen; this card is your quick way back in and a live look at your progress.',
    definitions: [
      { term: 'Continue reading', explanation: 'Once you have read anything, this resumes you at the exact book and chapter where you left off. Before that, you get a guided "Where do I start?" pick and a button to open the Bible at John 1.' },
      { term: 'Reading Plans', explanation: 'A plan walks you through Scripture on a schedule, a set passage each day, so you always know what to read next. The tile shows how far along you are and the next passage due. Tap to jump straight to it.' },
      { term: 'Devotionals', explanation: 'A devotional pairs a short daily reading with reflection, day by day. The tile resumes you on your next unfinished day.' },
      { term: 'Plans vs Devotionals', explanation: 'A plan is mostly reading on a schedule. A devotional adds a written reflection alongside the passage. Use a plan to read through Scripture, a devotional to sit with a theme.' },
      { term: 'Browse and manage', explanation: 'Starting, switching, and dropping plans or devotionals happens on the Plans screen. Tap Browse from either column to get there.' },
    ],
  },
  {
    key: 'gratitude_streak',
    category: 'Habits',
    title: 'Gratitude',
    body: 'A daily habit of naming something you are thankful for. Log one entry a day to keep your streak alive. Research and Scripture both point the same way: a regular practice of gratitude shifts how you see your day.\n\nThe week grid shows which days this week you logged. The journal icon opens your full history of entries.',
    definitions: [
      { term: 'Day streak', explanation: 'Consecutive days with a gratitude entry. Log one each day to grow it. Miss a day and it resets, the count is about the habit, not perfection.' },
      { term: 'Week grid', explanation: 'The seven dots are Sunday through Saturday. A filled dot means you logged gratitude that day.' },
      { term: 'Mindful mode', explanation: 'In Mindful coaching mode this shows your total days logged instead of a streak count, so a missed day never feels like a loss.' },
    ],
  },
  {
    key: 'prayer',
    tutorialId: 'faith_prayer',
    category: 'Faith',
    title: 'Prayer',
    body: 'A place to keep what you are praying for so nothing slips your mind, and a record of what God has done. The card previews your active prayers; the full Prayer screen is where you add, mark answered, and look back.',
    definitions: [
      { term: 'Active prayers', explanation: 'The things you are currently lifting up. The card shows your most recent few; open the screen to see them all and add more.' },
      { term: 'Answered', explanation: 'Mark a prayer answered on the Prayer screen and it moves to your answered list, a running record of answered prayer you can return to.' },
      { term: 'Ask for prayer', explanation: 'Sends a private prayer request from this card. Every request is read and prayed over. It is not posted publicly or shared with other users.' },
    ],
  },
  {
    key: 'halo_companion',
    tutorialId: 'faith_halo',
    category: 'Faith',
    title: 'Meet Halo',
    body: 'Halo is your in-app companion: part faith, part wellness. Tap the button in the bottom corner of the Faith tab to start a conversation. Ask about a verse, talk through what is on your mind, get encouragement, or ask a question about your day.\n\nHalo can pick up context when you start from a verse or a prayer, so you can go straight into talking about it. Your conversations are yours.',
    definitions: [
      { term: 'What to ask', explanation: 'Anything from "what does this verse mean" to "I am discouraged today" to a practical wellness question. Halo meets you where you are.' },
      { term: 'Context aware', explanation: 'Open Halo from Reflect with Halo on a verse, or from a prayer, and the conversation starts already knowing what you tapped.' },
      { term: 'Tone follows your style', explanation: 'Halo speaks in line with your coaching mode, direct in Discipline, gentle in Mindful, so it always sounds like the rest of your app.' },
    ],
  },
];