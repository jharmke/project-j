export interface TooltipDefinition {
  key: string;
  category: 'Nutrition' | 'Fitness' | 'Sleep & Recovery' | 'Faith';
  title: string;
  body: string;
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
    category: 'Sleep & Recovery',
    title: 'Sleep Score',
    body: 'Your sleep score is a 0–100 rating calculated from three factors: how long you slept, how much Deep sleep you got, and how much REM sleep you got.\n\nDuration accounts for 40 points — scored against your sleep goal. Deep sleep accounts for 30 points, peaking at around 20% of total sleep. REM accounts for 30 points, peaking at around 22% of total sleep.\n\nIf Apple Health can\'t provide stage data, your score is calculated using your feel rating (1–5) instead of stages.',
    example: {
      label: 'Example',
      lines: [
        { desc: 'Duration  (7.5 hrs, goal 8 hrs)', value: '37 / 40 pts' },
        { desc: 'Deep sleep  (19% of total)',       value: '28 / 30 pts' },
        { desc: 'REM sleep  (21% of total)',        value: '28 / 30 pts' },
      ],
      result: { desc: 'Final Score', value: '93 — Well Rested' },
    },
  },
  {
    key: 'macros_today',
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
    body: 'Advanced cardiovascular metrics pulled automatically from Apple Health. Requires an Apple Watch.',
    definitions: [
      {
        term: 'VO2 Max',
        explanation: 'A measure of how efficiently your body uses oxygen during exercise. Higher is better. Average for an active adult is 35–50 ml/kg/min. Elite athletes can exceed 60. Apple Watch estimates this during outdoor walks and runs.',
      },
      {
        term: 'Cardio Recovery',
        explanation: 'How many beats per minute your heart drops in the first minute after a workout ends. A drop of 20+ bpm is healthy. Higher recovery means your cardiovascular system bounces back faster -- a strong indicator of overall heart fitness.',
      },
    ],
  },
  {
    key: 'vs_yesterday',
    category: 'Fitness',
    title: 'You vs Yesterday',
    body: 'A daily head-to-head between today you and yesterday you -- across the metrics that matter most.',
    definitions: [
      {
        term: 'Metrics',
        explanation: 'Up to 4 metrics are shown at a time. Net Calories, Steps, Sleep Score, and Water are shown first. Weight, Active Calories, and Sleep Hours fill in when the primary metrics aren\'t available.',
      },
      {
        term: 'Win / Loss / Tie',
        explanation: 'Each metric compares today vs yesterday. More steps is a win. Closer to your calorie target is a win. Higher sleep score is a win. Small differences count as a tie.',
      },
      {
        term: 'Score',
        explanation: 'The YOU · YESTERDAY · TIED tally at the bottom shows how many metrics you won, lost, or tied for the day.',
      },
    ],
  },
  {
    key: 'if_countdown',
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
        explanation: 'Calories burned through exercise and movement, pulled live from Apple Health.',
      },
      {
        term: 'Net',
        explanation: 'The truest picture of your day: calories consumed minus active burn minus the calories your body has already burned at rest since midnight (running BMR). A lower net means more of a deficit.',
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
];