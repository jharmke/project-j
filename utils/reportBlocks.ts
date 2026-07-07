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
  | 'calendar';     // heatmap / goals-hit calendar

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
export const REPORT_BLOCKS: ReportBlock[] = [
  { id: 'weight_trend',      chapter: 'body',      title: 'Weight trend',      desc: 'Your weight over the period',              form: 'lineTrend',  dataKey: 'weight',   tier: 'core' },
  { id: 'nutrition_headline', chapter: 'nutrition', title: 'Nutrition headline', desc: 'Avg calories, protein, and goal adherence', form: 'statTiles',              tier: 'core' },
  { id: 'macro_split',       chapter: 'nutrition', title: 'Macro split',       desc: 'Average protein / carbs / fat',            form: 'macroSplit',             tier: 'core' },
];

export const getReportBlock = (id: string): ReportBlock | undefined => REPORT_BLOCKS.find(b => b.id === id);
export const blocksForChapter = (c: ReportChapter): ReportBlock[] => REPORT_BLOCKS.filter(b => b.chapter === c);
export const getChapterMeta = (c: ReportChapter): ReportChapterMeta | undefined => REPORT_CHAPTERS.find(x => x.key === c);
