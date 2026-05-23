import AsyncStorage from '@react-native-async-storage/async-storage';
import { storageSet } from './utils/storage';

export type AchievementCategory = 'hydration' | 'steps' | 'weight' | 'streak' | 'faith' | 'nutrition' | 'general';
export type AchievementTier = 'small' | 'medium' | 'large';
export type AchievementDisplayTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  tier: AchievementTier;
  icon: string;           // Ionicons name
  iconColor: string;      // fixed color for the icon
  bgColor: string;        // badge background
  displayTier?: AchievementDisplayTier; // overrides default tier mapping if set
  // Progress tracking -- optional, for locked display
  progressKey?: string;   // which stat to read for progress bar
  progressTarget?: number;// the number that unlocks it
  // Cooldown -- only for repeatable achievements
  cooldownDays?: number;
}

export interface UnlockedAchievement {
  id: string;
  unlockedAt: string;     // ISO date string
  count: number;          // how many times earned (for cooldown-repeatable ones)
  lastUnlockedAt: string; // ISO date string, same as unlockedAt for first unlock
}

export type AchievementsStore = Record<string, UnlockedAchievement>;

// ─── Achievement Definitions ─────────────────────────────────────────────────

export const ACHIEVEMENTS: AchievementDef[] = [
  // HYDRATION
  {
    id: 'hydration_first',
    name: 'First Sip',
    description: 'The first one always hits different.',
    category: 'hydration',
    tier: 'small',
    icon: 'water-outline',
    iconColor: '#3b82f6',
    bgColor: 'rgba(59,130,246,0.15)',
    progressKey: 'waterGoalDays',
    progressTarget: 1,
  },
  {
    id: 'hydration_10',
    name: 'Hydrated',
    description: 'Ten days. Consider us impressed.',
    category: 'hydration',
    tier: 'small',
    icon: 'water',
    iconColor: '#3b82f6',
    bgColor: 'rgba(59,130,246,0.15)',
    progressKey: 'waterGoalDays',
    progressTarget: 10,
  },
  {
    id: 'hydration_30',
    name: 'Bathtub',
    description: 'Consistency looks good on you.',
    category: 'hydration',
    tier: 'medium',
    icon: 'water',
    iconColor: '#60a5fa',
    bgColor: 'rgba(59,130,246,0.20)',
    progressKey: 'waterGoalDays',
    progressTarget: 30,
  },
  {
    id: 'hydration_50',
    name: 'Half Century',
    description: 'Fifty days. Somewhere between a habit and a superpower.',
    category: 'hydration',
    tier: 'large',
    icon: 'water',
    iconColor: '#7dd3fc',
    bgColor: 'rgba(59,130,246,0.22)',
    progressKey: 'waterGoalDays',
    progressTarget: 50,
  },
  {
    id: 'hydration_75',
    name: 'Relentless',
    description: 'Your kidneys approve.',
    category: 'hydration',
    tier: 'large',
    icon: 'water',
    iconColor: '#93c5fd',
    bgColor: 'rgba(59,130,246,0.23)',
    progressKey: 'waterGoalDays',
    progressTarget: 75,
  },
  {
    id: 'hydration_100',
    name: 'Swimming Pool',
    description: '100 water goal days. We stopped being surprised by you.',
    category: 'hydration',
    tier: 'large',
    displayTier: 'platinum',
    icon: 'water',
    iconColor: '#93c5fd',
    bgColor: 'rgba(59,130,246,0.25)',
    progressKey: 'waterGoalDays',
    progressTarget: 100,
  },
  {
    id: 'hydration_200',
    name: 'High Tide',
    description: "200 days. You've forgotten what it's like to not do this.",
    category: 'hydration',
    tier: 'large',
    displayTier: 'platinum',
    icon: 'water',
    iconColor: '#bae6fd',
    bgColor: 'rgba(59,130,246,0.27)',
    progressKey: 'waterGoalDays',
    progressTarget: 200,
  },
  {
    id: 'hydration_365',
    name: "Ol' Reliable",
    description: "One year of hitting your water goal. Even we're speechless...",
    category: 'hydration',
    tier: 'large',
    displayTier: 'platinum',
    icon: 'water',
    iconColor: '#e0f2fe',
    bgColor: 'rgba(59,130,246,0.30)',
    progressKey: 'waterGoalDays',
    progressTarget: 365,
  },

  // STEPS
  {
    id: 'steps_first',
    name: 'First Step',
    description: 'Hit your daily step goal for the first time.',
    category: 'steps',
    tier: 'small',
    icon: 'footsteps-outline',
    iconColor: '#10b981',
    bgColor: 'rgba(16,185,129,0.15)',
    progressKey: 'stepGoalDays',
    progressTarget: 1,
  },
  {
    id: 'steps_10',
    name: 'Getting Moving',
    description: 'Hit your step goal 10 times.',
    category: 'steps',
    tier: 'small',
    icon: 'footsteps',
    iconColor: '#10b981',
    bgColor: 'rgba(16,185,129,0.15)',
    progressKey: 'stepGoalDays',
    progressTarget: 10,
  },
  {
    id: 'steps_30',
    name: 'Walk the Block',
    description: 'Hit your step goal 30 times.',
    category: 'steps',
    tier: 'medium',
    icon: 'footsteps',
    iconColor: '#34d399',
    bgColor: 'rgba(16,185,129,0.20)',
    progressKey: 'stepGoalDays',
    progressTarget: 30,
  },
  {
    id: 'steps_100',
    name: 'Walked to Texas',
    description: 'Hit your step goal 100 times. You could walk across the state.',
    category: 'steps',
    tier: 'large',
    displayTier: 'platinum',
    icon: 'footsteps',
    iconColor: '#6ee7b7',
    bgColor: 'rgba(16,185,129,0.25)',
    progressKey: 'stepGoalDays',
    progressTarget: 100,
  },

  // WEIGHT
  {
    id: 'weight_5',
    name: 'Down 5',
    description: 'Lost 5 lbs from your starting weight.',
    category: 'weight',
    tier: 'medium',
    icon: 'trending-down-outline',
    iconColor: '#d4860a',
    bgColor: 'rgba(212,134,10,0.15)',
    progressKey: 'totalLost',
    progressTarget: 5,
  },
  {
    id: 'weight_10',
    name: 'Down 10',
    description: 'Lost 10 lbs. That\'s a real number.',
    category: 'weight',
    tier: 'medium',
    icon: 'trending-down',
    iconColor: '#d4860a',
    bgColor: 'rgba(212,134,10,0.18)',
    progressKey: 'totalLost',
    progressTarget: 10,
  },
  {
    id: 'weight_15',
    name: 'Down 15',
    description: 'Lost 15 lbs. Keep going.',
    category: 'weight',
    tier: 'medium',
    icon: 'trending-down',
    iconColor: '#f59e0b',
    bgColor: 'rgba(245,158,11,0.18)',
    progressKey: 'totalLost',
    progressTarget: 15,
  },
  {
    id: 'weight_20',
    name: 'Down 20',
    description: 'Lost 20 lbs. People are noticing.',
    category: 'weight',
    tier: 'large',
    icon: 'trending-down',
    iconColor: '#f59e0b',
    bgColor: 'rgba(245,158,11,0.22)',
    progressKey: 'totalLost',
    progressTarget: 20,
  },
  {
    id: 'weight_25',
    name: 'Down 25',
    description: 'Lost 25 lbs. A quarter century of pounds gone.',
    category: 'weight',
    tier: 'large',
    icon: 'trophy-outline',
    iconColor: '#fbbf24',
    bgColor: 'rgba(251,191,36,0.20)',
    progressKey: 'totalLost',
    progressTarget: 25,
  },
  {
    id: 'weight_goal',
    name: 'Goal Weight',
    description: 'Hit your goal weight. This is what it\'s all for.',
    category: 'weight',
    tier: 'large',
    displayTier: 'platinum',
    icon: 'trophy',
    iconColor: '#fbbf24',
    bgColor: 'rgba(251,191,36,0.25)',
    cooldownDays: 90,
  },

  // STREAKS
  {
    id: 'streak_3',
    name: 'On a Roll',
    description: 'Logged 3 days in a row.',
    category: 'streak',
    tier: 'small',
    icon: 'flame-outline',
    iconColor: '#f97316',
    bgColor: 'rgba(249,115,22,0.15)',
    progressKey: 'logStreak',
    progressTarget: 3,
  },
  {
    id: 'streak_7',
    name: 'Week Warrior',
    description: 'Logged 7 days in a row.',
    category: 'streak',
    tier: 'medium',
    icon: 'flame',
    iconColor: '#f97316',
    bgColor: 'rgba(249,115,22,0.18)',
    progressKey: 'logStreak',
    progressTarget: 7,
  },
  {
    id: 'streak_30',
    name: 'Unstoppable',
    description: 'Logged 30 days in a row. Habit locked in.',
    category: 'streak',
    tier: 'large',
    displayTier: 'platinum',
    icon: 'flame',
    iconColor: '#fb923c',
    bgColor: 'rgba(249,115,22,0.22)',
    progressKey: 'logStreak',
    progressTarget: 30,
  },

  // FAITH
  {
    id: 'faith_first_journal',
    name: 'First Word',
    description: 'Wrote your first journal entry.',
    category: 'faith',
    tier: 'small',
    icon: 'book-outline',
    iconColor: '#a78bfa',
    bgColor: 'rgba(167,139,250,0.15)',
    progressKey: 'journalEntries',
    progressTarget: 1,
  },
  {
    id: 'faith_10_journal',
    name: 'Consistent Voice',
    description: 'Wrote 10 journal entries.',
    category: 'faith',
    tier: 'medium',
    icon: 'book',
    iconColor: '#a78bfa',
    bgColor: 'rgba(167,139,250,0.18)',
    progressKey: 'journalEntries',
    progressTarget: 10,
  },

  // GENERAL
  {
    id: 'general_first_log',
    name: 'Day One',
    description: 'Logged your first day in the app.',
    category: 'general',
    tier: 'small',
    icon: 'star-outline',
    iconColor: '#e8e8f0',
    bgColor: 'rgba(232,232,240,0.10)',
  },
];

// ─── Storage Helpers ──────────────────────────────────────────────────────────

const STORAGE_KEY = 'pj_achievements';

export async function loadAchievements(): Promise<AchievementsStore> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export async function saveAchievements(store: AchievementsStore): Promise<void> {
  try {
    await storageSet(STORAGE_KEY, JSON.stringify(store));
  } catch (e) {
    console.log('Achievement save error', e);
  }
}

// ─── Unlock Logic ─────────────────────────────────────────────────────────────

// Returns array of achievement IDs that newly unlocked.
// Caller is responsible for showing the celebration.
export async function checkAndUnlock(
  achievementId: string,
  store: AchievementsStore
): Promise<{ newlyUnlocked: boolean; updatedStore: AchievementsStore }> {
  const def = ACHIEVEMENTS.find(a => a.id === achievementId);
  if (!def) return { newlyUnlocked: false, updatedStore: store };

  const existing = store[achievementId];

  if (existing) {
    // Already unlocked -- check cooldown for repeatable ones
    if (!def.cooldownDays) return { newlyUnlocked: false, updatedStore: store };
    const lastDate = new Date(existing.lastUnlockedAt);
    const daysSince = (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince < def.cooldownDays) return { newlyUnlocked: false, updatedStore: store };
    // Cooldown passed -- re-unlock
    const updated: AchievementsStore = {
      ...store,
      [achievementId]: {
        id: achievementId,
        unlockedAt: existing.unlockedAt,
        count: existing.count + 1,
        lastUnlockedAt: new Date().toISOString(),
      },
    };
    await saveAchievements(updated);
    return { newlyUnlocked: true, updatedStore: updated };
  }

  // First time unlock
  const updated: AchievementsStore = {
    ...store,
    [achievementId]: {
      id: achievementId,
      unlockedAt: new Date().toISOString(),
      count: 1,
      lastUnlockedAt: new Date().toISOString(),
    },
  };
  await saveAchievements(updated);
  return { newlyUnlocked: true, updatedStore: updated };
}

// ─── Weight Sanity Gate ───────────────────────────────────────────────────────

export const WEIGHT_SANITY_MAX_DELTA = 20; // lbs

export function weightEntryIsPlausible(newWeight: number, lastKnownWeight: number | null): boolean {
  if (!lastKnownWeight) return true; // no baseline, let it through
  return Math.abs(newWeight - lastKnownWeight) <= WEIGHT_SANITY_MAX_DELTA;
}

// ─── Weight Milestone Checker ─────────────────────────────────────────────────

// Returns IDs of milestones newly crossed, highest first.
// Caller fires celebration for [0] and silently unlocks the rest.
export function getWeightMilestonesCrossed(
  startWeight: number,
  newWeight: number,
  store: AchievementsStore
): string[] {
  const totalLost = startWeight - newWeight;
  const milestones = [
    { id: 'weight_5',  threshold: 5  },
    { id: 'weight_10', threshold: 10 },
    { id: 'weight_15', threshold: 15 },
    { id: 'weight_20', threshold: 20 },
    { id: 'weight_25', threshold: 25 },
  ];

  const crossed = milestones
    .filter(m => totalLost >= m.threshold && !store[m.id])
    .map(m => m.id)
    .reverse(); // highest first

  return crossed;
}

export function isGoalWeightHit(
  currentWeight: number,
  goalWeight: number,
  store: AchievementsStore
): boolean {
  if (currentWeight > goalWeight) return false;
  const existing = store['weight_goal'];
  if (!existing) return true;
  const daysSince = (Date.now() - new Date(existing.lastUnlockedAt).getTime()) / (1000 * 60 * 60 * 24);
  return daysSince >= 90;
}

// ─── Daily Goal Hit Counts ────────────────────────────────────────────────────

export type DailyGoalId = 'water' | 'steps' | 'activeCals' | 'exerciseMins';

export interface DailyGoalEntry {
  count: number;
  lastEarned: string; // YYYY-MM-DD
}

export type DailyGoalCounts = Record<DailyGoalId, DailyGoalEntry>;

const GOAL_COUNTS_KEY = 'pj_goal_hit_counts';
const GOAL_CELEB_KEY  = 'pj_daily_goal_celebrations';

export const DEFAULT_DAILY_GOAL_COUNTS: DailyGoalCounts = {
  water:        { count: 0, lastEarned: '' },
  steps:        { count: 0, lastEarned: '' },
  activeCals:   { count: 0, lastEarned: '' },
  exerciseMins: { count: 0, lastEarned: '' },
};

export async function loadGoalHitCounts(): Promise<DailyGoalCounts> {
  try {
    const raw = await AsyncStorage.getItem(GOAL_COUNTS_KEY);
    if (!raw) return { ...DEFAULT_DAILY_GOAL_COUNTS };
    return { ...DEFAULT_DAILY_GOAL_COUNTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_DAILY_GOAL_COUNTS };
  }
}

// Checks the once-per-day gate, increments count, fires both storage keys.
// Returns { fired: false } if already celebrated today.
export async function handleDailyGoalHit(
  goalId: DailyGoalId
): Promise<{ fired: boolean; count: number; lastEarned: string }> {
  const today = new Date().toISOString().split('T')[0];

  try {
    const celebRaw = await AsyncStorage.getItem(GOAL_CELEB_KEY);
    const celeb = celebRaw ? JSON.parse(celebRaw) : { date: '', goals: [] };
    if (celeb.date === today && Array.isArray(celeb.goals) && celeb.goals.includes(goalId)) {
      return { fired: false, count: 0, lastEarned: '' };
    }
  } catch {}

  const counts = await loadGoalHitCounts();
  const prev   = counts[goalId] ?? { count: 0, lastEarned: '' };
  const newCount = prev.count + 1;
  const updated: DailyGoalCounts = {
    ...counts,
    [goalId]: { count: newCount, lastEarned: today },
  };

  try { await storageSet(GOAL_COUNTS_KEY, JSON.stringify(updated)); } catch {}

  try {
    const celebRaw = await AsyncStorage.getItem(GOAL_CELEB_KEY);
    const celeb    = celebRaw ? JSON.parse(celebRaw) : { date: '', goals: [] };
    const newCeleb = {
      date:  today,
      goals: celeb.date === today && Array.isArray(celeb.goals)
        ? [...celeb.goals, goalId]
        : [goalId],
    };
    await storageSet(GOAL_CELEB_KEY, JSON.stringify(newCeleb));
  } catch {}

  return { fired: true, count: newCount, lastEarned: today };
}