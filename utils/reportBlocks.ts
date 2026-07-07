// ── Custom Reports : block registry ──────────────────────────────────────────────────────────────
// The catalog of blocks a user can add to a report, grouped into chapters. A block is pure METADATA
// here (what it is + which visual FORM draws it + which data it needs); the report view owns the actual
// rendering per form. Growth rule: a block only appears in this registry once its form actually renders,
// so the picker can never show a dead block. Reuse-first -- most data-driven blocks bind to a dataKey the
// Stats data layer already computes.

export type ReportChapter = 'overview' | 'nutrition' | 'workouts' | 'activity' | 'body' | 'sleep' | 'faith';

export interface ReportChapterMeta {
  key: ReportChapter;
  label: string;
  icon: string;          // Ionicons name (filled variants per house rule)
  faithTier?: boolean;   // chapter respects Faith Journey (hidden for "Not Right Now")
  wearableNote?: boolean; // chapter's blocks may need a wearable
}

export const REPORT_CHAPTERS: ReportChapterMeta[] = [
  { key: 'overview',  label: 'Overview',         icon: 'speedometer' },
  { key: 'nutrition', label: 'Nutrition',        icon: 'restaurant' },
  { key: 'workouts',  label: 'Workouts',         icon: 'barbell' },
  { key: 'activity',  label: 'Activity',         icon: 'walk' },
  { key: 'body',      label: 'Weight & Body',    icon: 'body' },
  { key: 'sleep',     label: 'Sleep & Recovery', icon: 'moon', wearableNote: true },
  { key: 'faith',     label: 'Faith',            icon: 'book', faithTier: true },
];

// Visual forms a block can take. The report view has one renderer per form.
export type BlockForm =
  | 'lineTrend'     // a metric over the range, as a gradient-filled line
  | 'barTrend'      // a metric over the range, as bars
  | 'statTiles'     // a KPI row of headline numbers
  | 'macroSplit'    // the protein/carbs/fat stacked bar + legend
  | 'hbars'         // horizontal category bars (volume by muscle, exercise frequency)
  | 'stackedTrend'  // stacked composition over time (sleep stages)
  | 'calloutList'   // highlight rows (records / PRs)
  | 'calendar'      // heatmap / goals-hit calendar
  | 'topFoods'      // ranked list of most-logged foods (drill-down)
  | 'foodLog'       // itemized food log, day by day (drill-down)
  | 'workoutHistory' // every workout, day by day (drill-down)
  | 'records'       // all-time lift PRs (drill-down)
  | 'caloriesByMeal' // calorie share per meal (drill-down)
  | 'dayExtremes'   // biggest & lightest calorie days (drill-down)
  | 'exerciseFrequency' // most-performed exercises, ranked (drill-down)
  | 'sleepStages'   // avg deep/REM/core breakdown
  | 'bodyMeasurements'; // tape measurements, session by session (drill-down)

export interface ReportBlock {
  id: string;
  chapter: ReportChapter;
  title: string;
  desc: string;            // one-line descriptor shown in the picker
  form: BlockForm;
  dataKey?: string;        // for data-driven forms: the metric key the view fetches
  wearableGated?: boolean; // only offered/populated when the wearable data exists
  tier: 'core' | 'wave2';  // launch vs later wave
}

// Starter slice: the three blocks that prove the three core forms (line, stat tiles, macro bar). The
// registry grows as more forms/blocks come online.
// Curated so the report reads as a REPORT, not a graph dump: number-forward "headline" blocks (stat
// tiles + trend arrows vs the prior period) lead each chapter; a few trend lines support. Categorical
// breakdowns + records blocks come next. Deliberately NOT one-line-graph-per-metric (that would just
// duplicate the Stats Trends section) -- metrics that aren't a standalone trend live inside a headline.
export const REPORT_BLOCKS: ReportBlock[] = [
  // Nutrition -- drill-down lists lead (the stuff you can't get anywhere else in the app)
  { id: 'top_foods',         chapter: 'nutrition', title: 'Most-logged foods',  desc: 'Your most frequent foods, ranked',     form: 'topFoods',              tier: 'core' },
  { id: 'food_log',          chapter: 'nutrition', title: 'Food log',           desc: 'Every food you logged, day by day',    form: 'foodLog',               tier: 'core' },
  { id: 'calories_by_meal',  chapter: 'nutrition', title: 'Calories by meal',   desc: 'Where your calories come from',        form: 'caloriesByMeal',        tier: 'core' },
  { id: 'day_extremes',      chapter: 'nutrition', title: 'Biggest & lightest days', desc: 'Your highest and lowest calorie days', form: 'dayExtremes',       tier: 'core' },
  { id: 'nutrition_headline', chapter: 'nutrition', title: 'Nutrition headline', desc: 'Avg calories, protein, carbs, fat + trend vs prior', form: 'statTiles',             tier: 'core' },
  { id: 'macro_split',       chapter: 'nutrition', title: 'Macro split',        desc: 'Average protein / carbs / fat breakdown', form: 'macroSplit',            tier: 'core' },
  { id: 'calories_trend',    chapter: 'nutrition', title: 'Calories trend',     desc: 'Daily calories as a line',             form: 'lineTrend', dataKey: 'calories', tier: 'core' },

  // Activity
  { id: 'activity_headline', chapter: 'activity',  title: 'Activity headline',  desc: 'Avg steps, active cal, exercise + trend vs prior', form: 'statTiles',             tier: 'core' },
  { id: 'steps_trend',       chapter: 'activity',  title: 'Steps trend',        desc: 'Daily steps as a line',                form: 'lineTrend', dataKey: 'steps',    tier: 'core' },

  // Workouts -- drill-down lists lead (the Strong-style history + records)
  { id: 'workout_history',   chapter: 'workouts',  title: 'Workout history',    desc: 'Every workout, day by day',            form: 'workoutHistory',        tier: 'core' },
  { id: 'lift_records',      chapter: 'workouts',  title: 'Records',            desc: 'Your all-time lift PRs',               form: 'records',               tier: 'core' },
  { id: 'exercise_frequency', chapter: 'workouts', title: 'Exercise frequency', desc: 'Your most-performed exercises, ranked', form: 'exerciseFrequency',     tier: 'core' },
  { id: 'effort_trend',      chapter: 'workouts',  title: 'Effort',             desc: 'Effort score over the period',         form: 'lineTrend', dataKey: 'effortScore', tier: 'core' },

  // Weight & Body
  { id: 'body_measurements', chapter: 'body',      title: 'Body measurements',  desc: 'Your tape measurements, session by session', form: 'bodyMeasurements',  tier: 'core' },
  { id: 'weight_trend',      chapter: 'body',      title: 'Weight trend',       desc: 'Your weight as a line',                form: 'lineTrend', dataKey: 'weight',   tier: 'core' },

  // Sleep & Recovery
  { id: 'sleep_headline',    chapter: 'sleep',     title: 'Sleep headline',     desc: 'Avg sleep, score, HRV, resting HR + trend vs prior', form: 'statTiles',             tier: 'core' },
  { id: 'sleep_stages',      chapter: 'sleep',     title: 'Sleep stages',       desc: 'Average deep, REM, and core sleep',    form: 'sleepStages',           wearableGated: true, tier: 'core' },
  { id: 'sleepscore_trend',  chapter: 'sleep',     title: 'Sleep score trend',  desc: 'Nightly sleep score as a line',        form: 'lineTrend', dataKey: 'sleepScore', tier: 'core' },
  { id: 'hrv_trend',         chapter: 'sleep',     title: 'HRV trend',          desc: 'Heart rate variability as a line',     form: 'lineTrend', dataKey: 'hrv',      wearableGated: true, tier: 'wave2' },
];

// ── Templates ────────────────────────────────────────────────────────────────────────────────────
// Ready-made block sets shown when creating a new report, so most users never face the full picker.
// A template is just a pre-filled blockIds list; "Build your own" opens the empty picker.
export interface ReportTemplate { id: string; name: string; icon: string; desc: string; blockIds: string[]; }
export const REPORT_TEMPLATES: ReportTemplate[] = [
  { id: 'nutrition', name: 'Nutrition Deep-Dive', icon: 'restaurant', desc: 'Foods, meals, macros, and calorie patterns',
    blockIds: ['top_foods', 'calories_by_meal', 'food_log', 'macro_split', 'day_extremes', 'nutrition_headline'] },
  { id: 'training', name: 'Training Log', icon: 'barbell', desc: 'Workout history, records, and exercise frequency',
    blockIds: ['workout_history', 'lift_records', 'exercise_frequency', 'effort_trend'] },
  { id: 'checkup', name: 'Health Check-Up', icon: 'medkit', desc: 'Weight, sleep, activity, and nutrition at a glance',
    blockIds: ['weight_trend', 'sleep_headline', 'activity_headline', 'nutrition_headline'] },
  { id: 'recap', name: 'Weekly Recap', icon: 'calendar', desc: 'A quick cross-section of your week',
    blockIds: ['nutrition_headline', 'activity_headline', 'sleep_headline', 'workout_history'] },
];

export const getReportBlock = (id: string): ReportBlock | undefined => REPORT_BLOCKS.find(b => b.id === id);
export const blocksForChapter = (c: ReportChapter): ReportBlock[] => REPORT_BLOCKS.filter(b => b.chapter === c);
export const getChapterMeta = (c: ReportChapter): ReportChapterMeta | undefined => REPORT_CHAPTERS.find(x => x.key === c);
