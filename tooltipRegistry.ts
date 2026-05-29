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
        explanation: 'Up to 4 metrics are shown at a time. Net Calories, Steps, Sleep Score, and Water are shown first. Weight, Active Calories, and Sleep Hours fill in when the primary metrics aren\'t available.',
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
        term: 'Remaining',
        explanation: 'Your calorie target minus what you\'ve eaten so far today. Goes red when you\'ve exceeded your target.',
      },
      {
        term: 'Active',
        explanation: 'Calories burned through exercise and movement, pulled live from Apple Health. If these seem high, you can adjust accuracy in Settings → Health.',
      },
      {
        term: 'Net',
        explanation: 'The truest picture of your day: calories consumed minus active burn minus the calories your body has already burned at rest since midnight (running BMR). A lower net means more of a deficit.',
      },
      {
        term: 'Running BMR',
        explanation: 'Your body burns calories around the clock just to stay alive -- breathing, circulation, organ function. Running BMR is the portion of that already earned since midnight. It grows throughout the day so your net gets lower even if you don\'t eat or move.',
      },
      {
        term: 'Color Coding',
        explanation: 'The big calorie number turns green when you\'re on target, yellow when you\'re close to your limit, and red when you\'ve gone over.',
      },
    ],
    example: {
      label: 'Net Calories Example',
      lines: [
        { desc: 'Calories consumed',   value: '1,400 kcal' },
        { desc: 'Active burn',         value: '− 320 kcal' },
        { desc: 'Running BMR (14 hrs)', value: '− 510 kcal' },
      ],
      result: { desc: 'Net Calories', value: '570 kcal' },
    },
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
    key: 'advanced_nutrition',
    category: 'Nutrition',
    title: 'Advanced Nutrition',
    body: 'These numbers show your daily totals for fiber, sugar, sodium, cholesterol, and saturated fat. The progress bars are based on FDA Recommended Daily Values for a 2,000 calorie diet.\n\nThese are general reference points -- not personalized targets. Your actual needs vary based on age, health conditions, and goals. Use this as a guide, not a rulebook.',
    definitions: [
      { term: 'Fiber', explanation: '28g DV. Supports digestion and keeps you full longer. Most people fall short.' },
      { term: 'Sugar', explanation: '50g DV total sugars. Natural sugars (fruit, dairy) and added sugars are both counted here.' },
      { term: 'Sodium', explanation: '2,300mg DV. High sodium is linked to blood pressure -- most people exceed this daily.' },
      { term: 'Cholesterol', explanation: '300mg DV. Dietary cholesterol has less impact than once thought, but moderation is still advised.' },
      { term: 'Saturated Fat', explanation: '20g DV. Linked to heart health when consistently high. Unsaturated fats are the better choice.' },
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
        term: 'More data = better insights',
        explanation: 'A 30-day window gives the report more to work with than 14 days. Trends, correlations, and weight comparisons all become more reliable the longer your logging history.',
      },
      {
        term: 'Not medical advice',
        explanation: 'These findings are based on your self-logged data. They\'re informational starting points, not diagnoses. If something seems off, talk to a doctor or registered dietitian.',
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
    body: 'Net carbs are total carbohydrates minus fiber. The idea: fiber passes through your body undigested and doesn\'t raise blood sugar, so many people -- especially those following low-carb or keto diets -- track net carbs as their real carbohydrate intake rather than total carbs.',
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
        explanation: 'Total carbs minus fiber. When net carbs mode is on, this is the number shown on your macro card, log, and stats -- and the number compared against your carbs goal.',
      },
      {
        term: 'Sugar Alcohols',
        explanation: 'Partially absorbed sweeteners found in some packaged foods. Not yet included in the net carbs calculation -- coming in a future update.',
      },
    ],
    example: {
      label: 'Example',
      lines: [
        { desc: 'Total Carbs', value: '35g' },
        { desc: 'Fiber',       value: '− 8g' },
      ],
      result: { desc: 'Net Carbs', value: '27g' },
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
];