// utils/companionTutorials.ts
//
// Otto's "Show me how" tutorial launcher table. When a reply names a feature that has a guided
// tutorial, the client (AssistantChat) attaches a tappable pill that closes the chat and launches
// that tutorial via TutorialContext.startTutorial; the tutorial then self-navigates to its own
// screen through its steps' navigateTo. Keyword-driven, the same reliable approach as
// companionRoutes' ROUTE_TRIGGERS, because Haiku is inconsistent about emitting tokens.
//
// Each `id` MUST be a real tutorial id in data/tutorials.ts (see TAB_TUTORIALS). Phrases are
// DISTINCTIVE only (no generic single words) so a pill appears solely when the reply is genuinely
// about that how-to. Ordered most-specific first; AssistantChat caps how many render.
//
// KEEP IN SYNC: if a tutorial id is renamed/removed in data/tutorials.ts, update it here too.

export type CompanionTutorial = { id: string; label: string; phrases: string[] };

export const TUTORIAL_TRIGGERS: CompanionTutorial[] = [
  { id: 'barcode',           label: 'Show me: Scanning a Barcode', phrases: ['scan a barcode', 'scan the barcode', 'barcode scan', 'scanning a barcode'] },
  { id: 'create_food',       label: 'Show me: Custom Foods',       phrases: ['custom food', 'create a food', 'make a custom food', 'add a custom food', 'creating a food'] },
  { id: 'recipes',           label: 'Show me: Building a Recipe',   phrases: ['build a recipe', 'create a recipe', 'recipe builder', 'make a recipe', 'building a recipe'] },
  { id: 'log_food',          label: 'Show me: Logging Food',        phrases: ['log food', 'logging food', 'log a meal', 'add a meal', 'track your food', 'log your food'] },
  { id: 'manage_log',        label: 'Show me: Managing Your Log',   phrases: ['manage your log', 'edit an entry', 'delete an entry', 'edit a food entry', 'edit your log', 'remove an entry'] },
  { id: 'log_edit_layout',   label: 'Show me: Log Layout',          phrases: ['log layout', 'meal sections', 'rearrange your meals', 'log tab layout', 'meal slots'] },
  { id: 'edit_layout',       label: 'Show me: Home Layout',         phrases: ['home layout', 'rearrange your cards', 'rearrange cards', 'hide a card', 'edit your layout', 'customize your home', 'reorder your cards'] },
  { id: 'workout_basics',    label: 'Show me: Logging a Workout',   phrases: ['log a workout', 'start a workout', 'track a workout', 'logging a workout'] },
  { id: 'exercise_library',  label: 'Show me: Exercise Library',    phrases: ['exercise library'] },
  { id: 'effort_vs_results', label: 'Show me: Effort vs Results',   phrases: ['effort vs results', 'effort vs. results', 'evr report'] },
  { id: 'day_score',         label: 'Show me: Day Score',           phrases: ['day score'] },
  { id: 'streaks',           label: 'Show me: Streaks',             phrases: ['your streak', 'streaks work', 'streak works', 'streaks'] },
  { id: 'goals',             label: 'Show me: Setting Goals',       phrases: ['set your goals', 'change your goals', 'adjust your goals', 'goal settings', 'update your goals'] },
  { id: 'vacation_mode',     label: 'Show me: Vacation Mode',       phrases: ['vacation mode', 'exclude days', 'exclude a day'] },
  { id: 'cal_card',          label: 'Show me: Calories Card',       phrases: ['calorie card', 'calories card'] },
];

// A tutorial and a route pill can point at the SAME feature (e.g. Effort vs Results has both a
// screen and a walkthrough). When the tutorial pill shows, the overlapping route pill is dropped so
// the user never sees "Go to X" and "Show me X" for one thing. Map: tutorial id -> route key.
export const TUTORIAL_ROUTE_OVERLAP: Record<string, string> = {
  effort_vs_results: 'evr',
  goals: 'goals',
  vacation_mode: 'vacation',
};
