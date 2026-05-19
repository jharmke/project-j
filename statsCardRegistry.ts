import AsyncStorage from '@react-native-async-storage/async-storage';

export type StatsCardType = 'system' | 'graph';
export type SystemCardKey = 'atAGlance' | 'trends' | 'records' | 'streaks' | 'calendar';
export type DataKey =
  // Nutrition
  'calories' | 'macros' | 'netCalories' | 'water' | 'fiber' | 'sodium' | 'cholesterol' | 'saturatedFat' |
  // Activity
  'steps' | 'activeCals' | 'workoutFreq' | 'exerciseMinutes' | 'effortScore' |
  // Body
  'weight' | 'bodyFatPct' |
  // Sleep & Recovery
  'sleep' | 'sleepScore' | 'restingHR' | 'respiratoryRate' | 'bloodOxygen';
export type ChartType = 'line' | 'bar' | 'stackedBar';
export type CardPeriod = 7 | 30 | 90;
export type CardPlacement = 'stats' | 'home' | 'both'; // 'home' / 'both' reserved for future shared card pool

export interface StatsCard {
  id: string;
  type: StatsCardType;
  // System cards only
  systemKey?: SystemCardKey;
  // Graph cards only
  dataKey?: DataKey;
  chartType?: ChartType;
  color?: string;
  macroColors?: { protein: string; carbs: string; fat: string };
  // Shared
  period: CardPeriod;
  label: string;
  visible: boolean;
  order: number;
  placement: CardPlacement;
}

const STORAGE_KEY = 'pj_stats_cards';

export const DEFAULT_STATS_CARDS: StatsCard[] = [
  // System cards
  { id: 'sys_atAGlance',   type: 'system', systemKey: 'atAGlance', label: 'At a Glance',        visible: true,  order: 0,  period: 30, placement: 'stats' },
  { id: 'sys_trends',      type: 'system', systemKey: 'trends',    label: 'Trends',              visible: true,  order: 1,  period: 30, placement: 'stats' },
  // Default graph cards -- same order as existing Trends section, 30d to match historical default
  { id: 'graph_weight',    type: 'graph',  dataKey: 'weight',      chartType: 'line',       label: 'Weight',             visible: true,  order: 1,  period: 30, placement: 'stats' },
  { id: 'graph_calories',  type: 'graph',  dataKey: 'calories',    chartType: 'bar',        label: 'Calories',           visible: true,  order: 2,  period: 30, placement: 'stats' },
  { id: 'graph_macros',    type: 'graph',  dataKey: 'macros',      chartType: 'stackedBar', label: 'Macros',             visible: true,  order: 3,  period: 30, placement: 'stats' },
  { id: 'graph_steps',     type: 'graph',  dataKey: 'steps',       chartType: 'line',       label: 'Steps',              visible: true,  order: 4,  period: 30, placement: 'stats' },
  { id: 'graph_activeCals',type: 'graph',  dataKey: 'activeCals',  chartType: 'line',       label: 'Active Calories',    visible: true,  order: 5,  period: 30, placement: 'stats' },
  { id: 'graph_sleep',     type: 'graph',  dataKey: 'sleep',       chartType: 'line',       label: 'Sleep',              visible: true,  order: 6,  period: 30, placement: 'stats' },
  { id: 'graph_workoutFreq',type:'graph',  dataKey: 'workoutFreq', chartType: 'bar',        label: 'Workout Frequency',  visible: true,  order: 7,  period: 30, placement: 'stats' },
  // System cards (below graphs)
  { id: 'sys_records',  type: 'system', systemKey: 'records',  label: 'Records',  visible: true, order: 8,  period: 7, placement: 'stats' },
  { id: 'sys_streaks',  type: 'system', systemKey: 'streaks',  label: 'Streaks',  visible: true, order: 9,  period: 7, placement: 'stats' },
  { id: 'sys_calendar', type: 'system', systemKey: 'calendar', label: 'Calendar', visible: true, order: 10, period: 7, placement: 'stats' },
];

// Merges saved cards with defaults -- adds any new defaults missing from saved state.
// Never removes user-created cards. Preserves user order and visibility.
export async function loadStatsCards(): Promise<StatsCard[]> {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (!saved) return DEFAULT_STATS_CARDS;
    const parsed: StatsCard[] = JSON.parse(saved);
    const merged = [...parsed];
    for (const def of DEFAULT_STATS_CARDS) {
      if (!merged.find(c => c.id === def.id)) {
        merged.push({ ...def, order: merged.length });
      }
    }
    return merged.sort((a, b) => a.order - b.order);
  } catch {
    return DEFAULT_STATS_CARDS;
  }
}

export async function saveStatsCards(cards: StatsCard[]): Promise<void> {
  try {
    // Normalize order to sequential integers before saving
    const ordered = cards.map((c, i) => ({ ...c, order: i }));
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(ordered));
  } catch {}
}

// Generates a unique ID for a user-created graph card
export function generateCardId(dataKey: DataKey): string {
  return `graph_${dataKey}_${Date.now()}`;
}

// Returns the default period for a given data key -- used by creator to pre-select
export function defaultPeriodForDataKey(_dataKey: DataKey): CardPeriod {
  return 7;
}

export const DATA_KEY_CATEGORIES = ['Nutrition', 'Activity', 'Body', 'Sleep & Recovery'] as const;
export type DataKeyCategory = typeof DATA_KEY_CATEGORIES[number];

// Icon name for each data key -- used in creator grid and card headers
export const DATA_KEY_META: Record<DataKey, { icon: string; label: string; description: string; category: DataKeyCategory }> = {
  // Nutrition
  calories:      { icon: 'flame-outline',          label: 'Calories',          description: 'Daily calorie intake',                  category: 'Nutrition' },
  macros:        { icon: 'nutrition-outline',       label: 'Macros',            description: 'Protein, carbs, fat breakdown',         category: 'Nutrition' },
  netCalories:   { icon: 'swap-vertical-outline',   label: 'Net Calories',      description: 'Consumed minus active calories',        category: 'Nutrition' },
  water:         { icon: 'water-outline',           label: 'Water',             description: 'Daily water intake (oz)',               category: 'Nutrition' },
  fiber:         { icon: 'leaf-outline',            label: 'Fiber',             description: 'Daily fiber intake (g)',                category: 'Nutrition' },
  sodium:        { icon: 'flask-outline',           label: 'Sodium',            description: 'Daily sodium intake (mg)',              category: 'Nutrition' },
  cholesterol:   { icon: 'analytics-outline',       label: 'Cholesterol',       description: 'Daily cholesterol intake (mg)',         category: 'Nutrition' },
  saturatedFat:  { icon: 'restaurant-outline',      label: 'Saturated Fat',     description: 'Daily saturated fat intake (g)',        category: 'Nutrition' },
  // Activity
  steps:         { icon: 'footsteps-outline',       label: 'Steps',             description: 'Daily step count',                     category: 'Activity' },
  activeCals:    { icon: 'heart-outline',           label: 'Active Calories',   description: 'Active calories burned',               category: 'Activity' },
  workoutFreq:   { icon: 'barbell-outline',         label: 'Workout Frequency', description: 'Days worked out per week',             category: 'Activity' },
  exerciseMinutes:{ icon: 'stopwatch-outline',      label: 'Exercise Minutes',  description: 'Minutes of exercise per day',          category: 'Activity' },
  effortScore:   { icon: 'flame-outline',            label: 'Today\'s Effort',   description: 'Daily session effort rating (1-10)',    category: 'Activity' },
  // Body
  weight:        { icon: 'body-outline',            label: 'Weight',            description: 'Daily logged weight',                  category: 'Body' },
  bodyFatPct:    { icon: 'pie-chart-outline',       label: 'Body Fat %',        description: 'Body fat % from Apple Health',         category: 'Body' },
  // Sleep & Recovery
  sleep:         { icon: 'moon-outline',            label: 'Sleep',             description: 'Hours slept per night',                category: 'Sleep & Recovery' },
  sleepScore:    { icon: 'star-outline',            label: 'Sleep Score',       description: 'Nightly sleep quality score (0-100)',  category: 'Sleep & Recovery' },
  restingHR:     { icon: 'heart-circle-outline',    label: 'Resting HR',        description: 'Resting heart rate (bpm)',             category: 'Sleep & Recovery' },
  respiratoryRate:{ icon: 'pulse-outline',          label: 'Respiratory Rate',  description: 'Breaths per minute',                  category: 'Sleep & Recovery' },
  bloodOxygen:   { icon: 'medical-outline',         label: 'Blood Oxygen',      description: 'Blood oxygen % from Apple Health',    category: 'Sleep & Recovery' },
};

// Chart types available per data key. Macros only supports stackedBar.
// All others support line and bar.
export function availableChartTypes(dataKey: DataKey): ChartType[] {
  if (dataKey === 'macros') return ['stackedBar'];
  return ['line', 'bar'];
}
