import AsyncStorage from '@react-native-async-storage/async-storage';
import { storageSet } from './utils/storage';

export type AchievementCategory = 'hydration' | 'steps' | 'weight' | 'momentum' | 'faith' | 'nutrition' | 'journal' | 'workout' | 'sleep';
export type AchievementTier = 'small' | 'medium' | 'large' | 'diamond';
export type AchievementDisplayTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

export interface AchievementDef {
  id: string;
  name: string;
  criteria: string;       // plain factual requirement shown on card always
  description: string;    // fun flavor text shown on card always
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

// ─── Celebration Tier Helper ──────────────────────────────────────────────────
// Use this instead of def.tier when calling showCelebration -- ensures diamond-
// display achievements (displayTier:'diamond') fire the diamond celebration even
// when their underlying tier is 'large'.
export function getCelebTier(def: AchievementDef): AchievementTier {
  if (def.displayTier === 'diamond' || def.tier === 'diamond') return 'diamond';
  return def.tier;
}

// ─── Achievement Definitions ─────────────────────────────────────────────────

export const ACHIEVEMENTS: AchievementDef[] = [
  // HYDRATION
  {
    id: 'hydration_first',
    name: 'First Sip',
    criteria: 'Hit your water goal for the first time.',
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
    criteria: 'Hit your water goal 10 times.',
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
    criteria: 'Hit your water goal 30 times.',
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
    criteria: 'Hit your water goal 50 times.',
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
    criteria: 'Hit your water goal 75 times.',
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
    criteria: 'Hit your water goal 100 times.',
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
    criteria: 'Hit your water goal 200 times.',
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
    criteria: 'Hit your water goal 365 times.',
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
    criteria: 'Hit your step goal for the first time.',
    description: 'The start of something beautiful.',
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
    criteria: 'Hit your step goal 10 times.',
    description: 'Ten days in. Your couch is starting to wonder where you went.',
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
    name: 'Heating Up',
    criteria: 'Hit your step goal 30 times.',
    description: 'Thirty days. A habit is forming whether you like it or not.',
    category: 'steps',
    tier: 'medium',
    icon: 'footsteps',
    iconColor: '#34d399',
    bgColor: 'rgba(16,185,129,0.20)',
    progressKey: 'stepGoalDays',
    progressTarget: 30,
  },
  {
    id: 'steps_50',
    name: 'Well Worn',
    criteria: 'Hit your step goal 50 times.',
    description: 'Fifty days in. Officially a regular.',
    category: 'steps',
    tier: 'large',
    icon: 'footsteps',
    iconColor: '#4ade80',
    bgColor: 'rgba(16,185,129,0.22)',
    progressKey: 'stepGoalDays',
    progressTarget: 50,
  },
  {
    id: 'steps_75',
    name: 'No Quit',
    criteria: 'Hit your step goal 75 times.',
    description: "Seventy-five step goal days. You're kind of a big deal now.",
    category: 'steps',
    tier: 'large',
    icon: 'footsteps',
    iconColor: '#86efac',
    bgColor: 'rgba(16,185,129,0.23)',
    progressKey: 'stepGoalDays',
    progressTarget: 75,
  },
  {
    id: 'steps_100',
    name: 'Triple Digits',
    criteria: 'Hit your step goal 100 times.',
    description: 'Sheeeeeeeeeeeeeeesh',
    category: 'steps',
    tier: 'large',
    displayTier: 'platinum',
    icon: 'footsteps',
    iconColor: '#6ee7b7',
    bgColor: 'rgba(16,185,129,0.25)',
    progressKey: 'stepGoalDays',
    progressTarget: 100,
  },
  {
    id: 'steps_200',
    name: 'Road Warrior',
    criteria: 'Hit your step goal 200 times.',
    description: 'Might be time for some new sneakers?',
    category: 'steps',
    tier: 'large',
    displayTier: 'platinum',
    icon: 'footsteps',
    iconColor: '#bbf7d0',
    bgColor: 'rgba(16,185,129,0.27)',
    progressKey: 'stepGoalDays',
    progressTarget: 200,
  },
  {
    id: 'steps_365',
    name: 'Full Circle',
    criteria: 'Hit your step goal 365 times.',
    description: 'A full year of hitting your step goal. Slightly unhinged. Deeply respected.',
    category: 'steps',
    tier: 'large',
    displayTier: 'platinum',
    icon: 'footsteps',
    iconColor: '#d1fae5',
    bgColor: 'rgba(16,185,129,0.30)',
    progressKey: 'stepGoalDays',
    progressTarget: 365,
  },

  // WEIGHT -- DIRECTION-AGNOSTIC
  {
    id: 'weight_first',
    name: 'Showed Up',
    criteria: 'Log your first weigh-in.',
    description: 'The scale has been waiting.',
    category: 'weight',
    tier: 'small',
    icon: 'body-outline',
    iconColor: '#d4860a',
    bgColor: 'rgba(212,134,10,0.12)',
  },

  // WEIGHT -- LOSS
  {
    id: 'weight_loss_5',
    name: 'Just a Little Off the Top',
    criteria: 'Lose 5 lbs from your starting weight.',
    description: 'Down five. More where that came from.',
    category: 'weight',
    tier: 'small',
    icon: 'trending-down-outline',
    iconColor: '#d4860a',
    bgColor: 'rgba(212,134,10,0.15)',
    progressKey: 'totalLost',
    progressTarget: 5,
  },
  {
    id: 'weight_loss_10',
    name: 'Picking Up Speed',
    criteria: 'Lose 10 lbs from your starting weight.',
    description: 'Ten pounds. Your old jeans called. They miss you.',
    category: 'weight',
    tier: 'medium',
    icon: 'trending-down',
    iconColor: '#d4860a',
    bgColor: 'rgba(212,134,10,0.18)',
    progressKey: 'totalLost',
    progressTarget: 10,
  },
  {
    id: 'weight_loss_25',
    name: 'Not a Fluke',
    criteria: 'Lose 25 lbs from your starting weight.',
    description: 'Twenty-five down. This is no longer a phase.',
    category: 'weight',
    tier: 'medium',
    icon: 'trending-down',
    iconColor: '#f59e0b',
    bgColor: 'rgba(245,158,11,0.18)',
    progressKey: 'totalLost',
    progressTarget: 25,
  },
  {
    id: 'weight_loss_50',
    name: 'The Big Five-Oh',
    criteria: 'Lose 50 lbs from your starting weight.',
    description: 'Somewhere out there, someone is asking what your secret is.',
    category: 'weight',
    tier: 'large',
    icon: 'trending-down',
    iconColor: '#f59e0b',
    bgColor: 'rgba(245,158,11,0.22)',
    progressKey: 'totalLost',
    progressTarget: 50,
  },
  {
    id: 'weight_loss_75',
    name: "Can't Stop Won't Stop",
    criteria: 'Lose 75 lbs from your starting weight.',
    description: "Seventy-five pounds down. At this point you're just showing off.",
    category: 'weight',
    tier: 'large',
    icon: 'trending-down',
    iconColor: '#fbbf24',
    bgColor: 'rgba(251,191,36,0.22)',
    progressKey: 'totalLost',
    progressTarget: 75,
  },
  {
    id: 'weight_loss_100',
    name: 'The Century Mark',
    criteria: 'Lose 100 lbs from your starting weight.',
    description: 'Down 100. We ran out of words somewhere around fifty.',
    category: 'weight',
    tier: 'large',
    displayTier: 'platinum',
    icon: 'trending-down',
    iconColor: '#fcd34d',
    bgColor: 'rgba(251,191,36,0.25)',
    progressKey: 'totalLost',
    progressTarget: 100,
  },

  // WEIGHT -- GAIN
  {
    id: 'weight_gain_5',
    name: 'Loading',
    criteria: 'Gain 5 lbs from your starting weight.',
    description: 'Five pounds. Just getting started.',
    category: 'weight',
    tier: 'small',
    icon: 'trending-up-outline',
    iconColor: '#10b981',
    bgColor: 'rgba(16,185,129,0.15)',
    progressKey: 'totalGained',
    progressTarget: 5,
  },
  {
    id: 'weight_gain_10',
    name: 'Heavy Hitter',
    criteria: 'Gain 10 lbs from your starting weight.',
    description: 'Ten pounds. Your shirts are getting the message.',
    category: 'weight',
    tier: 'medium',
    icon: 'trending-up',
    iconColor: '#10b981',
    bgColor: 'rgba(16,185,129,0.18)',
    progressKey: 'totalGained',
    progressTarget: 10,
  },
  {
    id: 'weight_gain_25',
    name: 'Bulk Season',
    criteria: 'Gain 25 lbs from your starting weight.',
    description: 'Twenty-five pounds. We see you.',
    category: 'weight',
    tier: 'medium',
    icon: 'trending-up',
    iconColor: '#34d399',
    bgColor: 'rgba(16,185,129,0.20)',
    progressKey: 'totalGained',
    progressTarget: 25,
  },
  {
    id: 'weight_gain_50',
    name: 'Built Different',
    criteria: 'Gain 50 lbs from your starting weight.',
    description: 'Fifty up. Point proven.',
    category: 'weight',
    tier: 'large',
    icon: 'trending-up',
    iconColor: '#34d399',
    bgColor: 'rgba(16,185,129,0.22)',
    progressKey: 'totalGained',
    progressTarget: 50,
  },
  {
    id: 'weight_gain_75',
    name: 'Iron Will',
    criteria: 'Gain 75 lbs from your starting weight.',
    description: 'Seventy-five pounds. Message received.',
    category: 'weight',
    tier: 'large',
    icon: 'trending-up',
    iconColor: '#6ee7b7',
    bgColor: 'rgba(16,185,129,0.23)',
    progressKey: 'totalGained',
    progressTarget: 75,
  },
  {
    id: 'weight_gain_100',
    name: 'The Gain Train',
    criteria: 'Gain 100 lbs from your starting weight.',
    description: "A hundred pounds up. We don't know what to say. Actually we do. Respect.",
    category: 'weight',
    tier: 'large',
    displayTier: 'platinum',
    icon: 'trending-up',
    iconColor: '#a7f3d0',
    bgColor: 'rgba(16,185,129,0.25)',
    progressKey: 'totalGained',
    progressTarget: 100,
  },

  // WEIGHT -- GOAL
  {
    id: 'weight_goal',
    name: 'There It Is',
    criteria: 'Reach your goal weight.',
    description: 'Hit your goal weight. This is what all of it was for.',
    category: 'weight',
    tier: 'large',
    displayTier: 'diamond',
    icon: 'trophy',
    iconColor: '#fbbf24',
    bgColor: 'rgba(251,191,36,0.25)',
    cooldownDays: 90,
  },

  // MOMENTUM
  {
    id: 'general_first_log',
    name: 'Day One',
    criteria: 'Log your first day in the app.',
    description: 'Logged your first day in the app.',
    category: 'momentum',
    tier: 'small',
    icon: 'star-outline',
    iconColor: '#e8e8f0',
    bgColor: 'rgba(232,232,240,0.10)',
  },
  {
    id: 'streak_3',
    name: 'On a Roll',
    criteria: 'Log 3 days in a row.',
    description: 'Three days in. The streak is alive.',
    category: 'momentum',
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
    criteria: 'Log 7 days in a row.',
    description: "Seven days in a row. Something big's brewing...",
    category: 'momentum',
    tier: 'small',
    icon: 'flame',
    iconColor: '#f97316',
    bgColor: 'rgba(249,115,22,0.15)',
    progressKey: 'logStreak',
    progressTarget: 7,
  },
  {
    id: 'streak_14',
    name: 'Not a Fluke',
    criteria: 'Log 14 days in a row.',
    description: 'Two weeks in. This is not a coincidence.',
    category: 'momentum',
    tier: 'medium',
    icon: 'flame',
    iconColor: '#fb923c',
    bgColor: 'rgba(249,115,22,0.18)',
    progressKey: 'logStreak',
    progressTarget: 14,
  },
  {
    id: 'streak_30',
    name: 'Unstoppable',
    criteria: 'Log 30 days in a row.',
    description: "Thirty consecutive days. You've officially outrun your excuses.",
    category: 'momentum',
    tier: 'medium',
    icon: 'flame',
    iconColor: '#fb923c',
    bgColor: 'rgba(249,115,22,0.20)',
    progressKey: 'logStreak',
    progressTarget: 30,
  },
  {
    id: 'streak_60',
    name: 'Sixty Strong',
    criteria: 'Log 60 days in a row.',
    description: "Two months in. At this point it'd feel weird to stop.",
    category: 'momentum',
    tier: 'large',
    icon: 'flame',
    iconColor: '#fdba74',
    bgColor: 'rgba(249,115,22,0.22)',
    progressKey: 'logStreak',
    progressTarget: 60,
  },
  {
    id: 'streak_90',
    name: 'All In',
    criteria: 'Log 90 days in a row.',
    description: "Three months straight. You've committed to something bigger than a streak.",
    category: 'momentum',
    tier: 'large',
    icon: 'flame',
    iconColor: '#fdba74',
    bgColor: 'rgba(249,115,22,0.23)',
    progressKey: 'logStreak',
    progressTarget: 90,
  },
  {
    id: 'streak_180',
    name: 'Six Months Strong',
    criteria: 'Log 180 days in a row.',
    description: 'Six months in. The streak has become the standard.',
    category: 'momentum',
    tier: 'large',
    displayTier: 'platinum',
    icon: 'flame',
    iconColor: '#fed7aa',
    bgColor: 'rgba(249,115,22,0.25)',
    progressKey: 'logStreak',
    progressTarget: 180,
  },
  {
    id: 'streak_365',
    name: 'Unbroken',
    criteria: 'Log 365 days in a row.',
    description: "A year straight. Some things you can't explain. This is one of them.",
    category: 'momentum',
    tier: 'large',
    displayTier: 'diamond',
    icon: 'flame',
    iconColor: '#ffedd5',
    bgColor: 'rgba(249,115,22,0.30)',
    progressKey: 'logStreak',
    progressTarget: 365,
  },

  // FAITH -- VERSE REFLECTIONS
  {
    id: 'verse_first',
    name: 'Marked',
    criteria: 'Write your first verse reflection.',
    description: 'One reflection. This is how it starts.',
    category: 'faith',
    tier: 'small',
    icon: 'book-outline',
    iconColor: '#d4860a',
    bgColor: 'rgba(212,134,10,0.12)',
    progressKey: 'verseReflections',
    progressTarget: 1,
  },
  {
    id: 'verse_10',
    name: 'Regular Reader',
    criteria: 'Write 10 verse reflections.',
    description: 'Ten times you went back. Ten times it had something for you.',
    category: 'faith',
    tier: 'small',
    icon: 'book',
    iconColor: '#d4860a',
    bgColor: 'rgba(212,134,10,0.15)',
    progressKey: 'verseReflections',
    progressTarget: 10,
  },
  {
    id: 'verse_25',
    name: 'Saturated',
    criteria: 'Write 25 verse reflections.',
    description: 'Twenty-five reflections. Consistently showing up to the Word.',
    category: 'faith',
    tier: 'medium',
    icon: 'book',
    iconColor: '#e89b20',
    bgColor: 'rgba(212,134,10,0.18)',
    progressKey: 'verseReflections',
    progressTarget: 25,
  },
  {
    id: 'verse_50',
    name: 'Transformed',
    criteria: 'Write 50 verse reflections.',
    description: "Fifty verse reflections. You've been in the Word and the Word's been in you.",
    category: 'faith',
    tier: 'medium',
    icon: 'book',
    iconColor: '#e89b20',
    bgColor: 'rgba(212,134,10,0.20)',
    progressKey: 'verseReflections',
    progressTarget: 50,
  },
  {
    id: 'verse_100',
    name: 'Fearfully and Wonderfully Made',
    criteria: 'Write 100 verse reflections.',
    description: 'A hundred verse reflections. Most people skim. You\'ve been digging.',
    category: 'faith',
    tier: 'large',
    icon: 'book',
    iconColor: '#f0b030',
    bgColor: 'rgba(212,134,10,0.22)',
    progressKey: 'verseReflections',
    progressTarget: 100,
  },
  {
    id: 'verse_200',
    name: 'Dwelling',
    criteria: 'Write 200 verse reflections.',
    description: "200 reflections. You've made a home in the Word.",
    category: 'faith',
    tier: 'large',
    displayTier: 'platinum',
    icon: 'book',
    iconColor: '#f5c842',
    bgColor: 'rgba(212,134,10,0.25)',
    progressKey: 'verseReflections',
    progressTarget: 200,
  },
  {
    id: 'verse_365',
    name: 'Written in Full',
    criteria: 'Write 365 verse reflections.',
    description: 'This is the kind of discipline that shapes a life.',
    category: 'faith',
    tier: 'large',
    displayTier: 'diamond',
    icon: 'book',
    iconColor: '#fad565',
    bgColor: 'rgba(212,134,10,0.30)',
    progressKey: 'verseReflections',
    progressTarget: 365,
  },

  // FAITH -- PRAYER LOG
  {
    id: 'prayer_first',
    name: 'First Words',
    criteria: 'Write your first prayer entry.',
    description: 'First prayer entry. The door was always open.',
    category: 'faith',
    tier: 'small',
    icon: 'chatbubble-ellipses-outline',
    iconColor: '#8b5cf6',
    bgColor: 'rgba(139,92,246,0.12)',
    progressKey: 'prayerEntries',
    progressTarget: 1,
  },
  {
    id: 'prayer_10',
    name: 'Faithful Asker',
    criteria: 'Log 10 prayers.',
    description: 'Ten prayers logged. This is what abiding looks like.',
    category: 'faith',
    tier: 'small',
    icon: 'chatbubble-ellipses',
    iconColor: '#8b5cf6',
    bgColor: 'rgba(139,92,246,0.15)',
    progressKey: 'prayerEntries',
    progressTarget: 10,
  },
  {
    id: 'prayer_25',
    name: 'Steadfast',
    criteria: 'Log 25 prayers.',
    description: "Twenty-five prayers. A posture that's becoming permanent.",
    category: 'faith',
    tier: 'medium',
    icon: 'chatbubble-ellipses',
    iconColor: '#9d71f7',
    bgColor: 'rgba(139,92,246,0.18)',
    progressKey: 'prayerEntries',
    progressTarget: 25,
  },
  {
    id: 'prayer_50',
    name: 'Open Channel',
    criteria: 'Log 50 prayers.',
    description: 'Fifty entries. Prayer is less a practice now and more a reflex.',
    category: 'faith',
    tier: 'medium',
    icon: 'chatbubble-ellipses',
    iconColor: '#a78bfa',
    bgColor: 'rgba(139,92,246,0.20)',
    progressKey: 'prayerEntries',
    progressTarget: 50,
  },
  {
    id: 'prayer_100',
    name: 'Unceasing',
    criteria: 'Log 100 prayers.',
    description: '100 prayers. Most people think about it. You write it down.',
    category: 'faith',
    tier: 'large',
    icon: 'chatbubble-ellipses',
    iconColor: '#b39dfa',
    bgColor: 'rgba(139,92,246,0.22)',
    progressKey: 'prayerEntries',
    progressTarget: 100,
  },
  {
    id: 'prayer_200',
    name: 'Two Hundred Strong',
    criteria: 'Log 200 prayers.',
    description: 'Two hundred prayers. The kind of faithfulness that changes things.',
    category: 'faith',
    tier: 'large',
    displayTier: 'platinum',
    icon: 'chatbubble-ellipses',
    iconColor: '#c4b5fd',
    bgColor: 'rgba(139,92,246,0.25)',
    progressKey: 'prayerEntries',
    progressTarget: 200,
  },
  {
    id: 'prayer_365',
    name: 'A Year of Prayer',
    criteria: 'Log 365 prayers.',
    description: 'Every season, every mood, every need. You kept writing.',
    category: 'faith',
    tier: 'large',
    displayTier: 'diamond',
    icon: 'chatbubble-ellipses',
    iconColor: '#ddd6fe',
    bgColor: 'rgba(139,92,246,0.30)',
    progressKey: 'prayerEntries',
    progressTarget: 365,
  },

  // FAITH -- GRATITUDE
  {
    id: 'gratitude_7',
    name: 'Counting Blessings',
    criteria: 'Write 7 gratitude entries.',
    description: "Seven entries. You've started seeing what was always there.",
    category: 'faith',
    tier: 'small',
    icon: 'heart-outline',
    iconColor: '#ec4899',
    bgColor: 'rgba(236,72,153,0.12)',
    progressKey: 'gratitudeEntries',
    progressTarget: 7,
  },
  {
    id: 'gratitude_30',
    name: 'Overflow',
    criteria: 'Write 30 gratitude entries.',
    description: 'Thirty gratitude entries. The shift in perspective is real now.',
    category: 'faith',
    tier: 'medium',
    icon: 'heart',
    iconColor: '#ec4899',
    bgColor: 'rgba(236,72,153,0.18)',
    progressKey: 'gratitudeEntries',
    progressTarget: 30,
  },
  {
    id: 'gratitude_100',
    name: 'Rooted in Thanks',
    criteria: 'Write 100 gratitude entries.',
    description: 'There is always something. You found it even on hard days.',
    category: 'faith',
    tier: 'large',
    icon: 'heart',
    iconColor: '#f472b6',
    bgColor: 'rgba(236,72,153,0.22)',
    progressKey: 'gratitudeEntries',
    progressTarget: 100,
  },
  {
    id: 'gratitude_200',
    name: 'Deep Well',
    criteria: 'Write 200 gratitude entries.',
    description: "200 entries. You've been drawing from something that doesn't run out.",
    category: 'faith',
    tier: 'large',
    displayTier: 'platinum',
    icon: 'heart',
    iconColor: '#f9a8d4',
    bgColor: 'rgba(236,72,153,0.25)',
    progressKey: 'gratitudeEntries',
    progressTarget: 200,
  },
  {
    id: 'gratitude_365',
    name: 'Year of Thanks',
    criteria: 'Write 365 gratitude entries.',
    description: 'For a full year you looked for the good. It found you back.',
    category: 'faith',
    tier: 'large',
    displayTier: 'diamond',
    icon: 'heart',
    iconColor: '#fce7f3',
    bgColor: 'rgba(236,72,153,0.30)',
    progressKey: 'gratitudeEntries',
    progressTarget: 365,
  },

  // FAITH -- BIBLE READING
  {
    id: 'bible_7',
    name: 'In the Word',
    criteria: 'Read 7 days across any reading plan.',
    description: 'Seven reading days. The best habit you can build.',
    category: 'faith',
    tier: 'small',
    icon: 'bookmark-outline',
    iconColor: '#06b6d4',
    bgColor: 'rgba(6,182,212,0.12)',
    progressKey: 'bibleReadingDays',
    progressTarget: 7,
  },
  {
    id: 'bible_30',
    name: 'Planted',
    criteria: 'Read 30 days across any reading plan.',
    description: 'Thirty reading days. The plan is working because you are.',
    category: 'faith',
    tier: 'medium',
    icon: 'bookmark',
    iconColor: '#06b6d4',
    bgColor: 'rgba(6,182,212,0.18)',
    progressKey: 'bibleReadingDays',
    progressTarget: 30,
  },
  {
    id: 'bible_50',
    name: 'Deep Cut',
    criteria: 'Read 50 days across any reading plan.',
    description: "Fifty reading days. You're in this for real.",
    category: 'faith',
    tier: 'medium',
    icon: 'bookmark',
    iconColor: '#22d3ee',
    bgColor: 'rgba(6,182,212,0.20)',
    progressKey: 'bibleReadingDays',
    progressTarget: 50,
  },
  {
    id: 'bible_100',
    name: 'Through and Through',
    criteria: 'Read 100 days across any reading plan.',
    description: "100 days in the Word. You've read enough to know it reads you back.",
    category: 'faith',
    tier: 'large',
    icon: 'bookmark',
    iconColor: '#67e8f9',
    bgColor: 'rgba(6,182,212,0.22)',
    progressKey: 'bibleReadingDays',
    progressTarget: 100,
  },
  {
    id: 'bible_200',
    name: 'Devoted',
    criteria: 'Read 200 days across any reading plan.',
    description: "Two hundred days. You kept showing up when nobody was watching.",
    category: 'faith',
    tier: 'large',
    displayTier: 'platinum',
    icon: 'bookmark',
    iconColor: '#a5f3fc',
    bgColor: 'rgba(6,182,212,0.25)',
    progressKey: 'bibleReadingDays',
    progressTarget: 200,
  },
  {
    id: 'bible_365',
    name: 'Year in the Word',
    criteria: 'Read 365 days across any reading plan.',
    description: '365 days. And the path keeps getting clearer.',
    category: 'faith',
    tier: 'large',
    displayTier: 'diamond',
    icon: 'bookmark',
    iconColor: '#cffafe',
    bgColor: 'rgba(6,182,212,0.30)',
    progressKey: 'bibleReadingDays',
    progressTarget: 365,
  },

  // GENERAL -- journal milestones (personal/fitness/workout entries only)

  // JOURNAL
  {
    id: 'faith_first_journal',
    name: 'First Word',
    criteria: 'Write your first journal entry.',
    description: 'Wrote your first journal entry.',
    category: 'journal',
    tier: 'small',
    icon: 'book-outline',
    iconColor: '#a78bfa',
    bgColor: 'rgba(167,139,250,0.15)',
    progressKey: 'generalJournalEntries',
    progressTarget: 1,
  },
  {
    id: 'faith_10_journal',
    name: 'Consistent Voice',
    criteria: 'Write 10 journal entries.',
    description: 'Wrote 10 journal entries.',
    category: 'journal',
    tier: 'medium',
    icon: 'book',
    iconColor: '#a78bfa',
    bgColor: 'rgba(167,139,250,0.18)',
    progressKey: 'generalJournalEntries',
    progressTarget: 10,
  },
  {
    id: 'journal_25',
    name: 'Paper Trail',
    criteria: 'Write 25 journal entries.',
    description: "There's no denying it now -- you're a journal person.",
    category: 'journal',
    tier: 'medium',
    icon: 'book',
    iconColor: '#a78bfa',
    bgColor: 'rgba(167,139,250,0.20)',
    progressKey: 'generalJournalEntries',
    progressTarget: 25,
  },
  {
    id: 'journal_50',
    name: 'The Plot Thickens',
    criteria: 'Write 50 journal entries.',
    description: "Fifty down. You said you'd try it. Look at you now.",
    category: 'journal',
    tier: 'medium',
    icon: 'book',
    iconColor: '#b99ffa',
    bgColor: 'rgba(167,139,250,0.22)',
    progressKey: 'generalJournalEntries',
    progressTarget: 50,
  },
  {
    id: 'journal_100',
    name: 'Well Documented',
    criteria: 'Write 100 journal entries.',
    description: "A hundred down. Somewhere out there a blank journal is relieved it's not yours.",
    category: 'journal',
    tier: 'large',
    icon: 'book',
    iconColor: '#c4b5fd',
    bgColor: 'rgba(167,139,250,0.24)',
    progressKey: 'generalJournalEntries',
    progressTarget: 100,
  },
  {
    id: 'journal_200',
    name: 'Chronicled',
    criteria: 'Write 200 journal entries.',
    description: 'Two hundred entries. Most people live it. You wrote it down.',
    category: 'journal',
    tier: 'large',
    displayTier: 'platinum',
    icon: 'book',
    iconColor: '#d8b4fe',
    bgColor: 'rgba(167,139,250,0.27)',
    progressKey: 'generalJournalEntries',
    progressTarget: 200,
  },
  {
    id: 'journal_365',
    name: 'The Book',
    criteria: 'Write 365 journal entries.',
    description: "A full year of entries. That's a book.",
    category: 'journal',
    tier: 'large',
    displayTier: 'diamond',
    icon: 'book',
    iconColor: '#ede9fe',
    bgColor: 'rgba(167,139,250,0.30)',
    progressKey: 'generalJournalEntries',
    progressTarget: 365,
  },

  // WORKOUT
  {
    id: 'workout_first',
    name: 'First Rep',
    criteria: 'Work out your first day.',
    description: 'Every legend started somewhere.',
    category: 'workout',
    tier: 'small',
    icon: 'barbell-outline',
    iconColor: '#ef4444',
    bgColor: 'rgba(239,68,68,0.12)',
    progressKey: 'workoutDays',
    progressTarget: 1,
  },
  {
    id: 'workout_10',
    name: 'Getting After It',
    criteria: 'Work out 10 days.',
    description: "Ten down. You're past the hardest part.",
    category: 'workout',
    tier: 'small',
    icon: 'barbell',
    iconColor: '#ef4444',
    bgColor: 'rgba(239,68,68,0.15)',
    progressKey: 'workoutDays',
    progressTarget: 10,
  },
  {
    id: 'workout_30',
    name: 'Not a Phase',
    criteria: 'Work out 30 days.',
    description: 'Thirty workouts. The excuses had to find someone else.',
    category: 'workout',
    tier: 'medium',
    icon: 'barbell',
    iconColor: '#f87171',
    bgColor: 'rgba(239,68,68,0.18)',
    progressKey: 'workoutDays',
    progressTarget: 30,
  },
  {
    id: 'workout_50',
    name: 'Committed',
    criteria: 'Work out 50 days.',
    description: "Fifty workouts. You're not experimenting anymore.",
    category: 'workout',
    tier: 'medium',
    icon: 'barbell',
    iconColor: '#f87171',
    bgColor: 'rgba(239,68,68,0.20)',
    progressKey: 'workoutDays',
    progressTarget: 50,
  },
  {
    id: 'workout_75',
    name: 'Built for This',
    criteria: 'Work out 75 days.',
    description: "Seventy-five workouts. You've stopped counting and started doing. We're counting, though...",
    category: 'workout',
    tier: 'large',
    icon: 'barbell',
    iconColor: '#fca5a5',
    bgColor: 'rgba(239,68,68,0.22)',
    progressKey: 'workoutDays',
    progressTarget: 75,
  },
  {
    id: 'workout_100',
    name: 'Triple Digits',
    criteria: 'Work out 100 days.',
    description: "A hundred workouts. We're running out of ways to say we're impressed.",
    category: 'workout',
    tier: 'large',
    icon: 'barbell',
    iconColor: '#fca5a5',
    bgColor: 'rgba(239,68,68,0.23)',
    progressKey: 'workoutDays',
    progressTarget: 100,
  },
  {
    id: 'workout_200',
    name: 'Still Standing',
    criteria: 'Work out 200 days.',
    description: 'Two hundred down. You stopped asking if you felt like it a long time ago.',
    category: 'workout',
    tier: 'large',
    displayTier: 'platinum',
    icon: 'barbell',
    iconColor: '#fecaca',
    bgColor: 'rgba(239,68,68,0.25)',
    progressKey: 'workoutDays',
    progressTarget: 200,
  },
  {
    id: 'workout_365',
    name: '365',
    criteria: 'Work out 365 days.',
    description: '365 workouts. Iron sharpens iron.',
    category: 'workout',
    tier: 'large',
    displayTier: 'diamond',
    icon: 'barbell',
    iconColor: '#fff1f2',
    bgColor: 'rgba(239,68,68,0.30)',
    progressKey: 'workoutDays',
    progressTarget: 365,
  },
  {
    id: 'workout_first_program',
    name: 'Following the Plan',
    criteria: 'Load your first training program.',
    description: 'Random workouts had a good run.',
    category: 'workout',
    tier: 'small',
    icon: 'calendar-outline',
    iconColor: '#ef4444',
    bgColor: 'rgba(239,68,68,0.12)',
  },
  {
    id: 'workout_first_routine',
    name: 'The Blueprint',
    criteria: 'Save your first workout routine.',
    description: 'You built something. Now go do it.',
    category: 'workout',
    tier: 'small',
    icon: 'document-text-outline',
    iconColor: '#ef4444',
    bgColor: 'rgba(239,68,68,0.12)',
  },

  // NUTRITION
  {
    id: 'nutrition_1',
    name: 'On Point',
    criteria: 'Hit your calorie goal for the first time.',
    description: 'Day one of hitting your goal. The meal plan era has officially begun.',
    category: 'nutrition',
    tier: 'small',
    icon: 'nutrition-outline',
    iconColor: '#0d9268',
    bgColor: 'rgba(13,146,104,0.15)',
    progressKey: 'nutritionGoalDays',
    progressTarget: 1,
  },
  {
    id: 'nutrition_10',
    name: 'Calibrated',
    criteria: 'Hit your calorie goal 10 times.',
    description: "Ten goal days. The 'I'll start Monday' era is officially over.",
    category: 'nutrition',
    tier: 'small',
    icon: 'nutrition',
    iconColor: '#0f9d76',
    bgColor: 'rgba(13,146,104,0.15)',
    progressKey: 'nutritionGoalDays',
    progressTarget: 10,
  },
  {
    id: 'nutrition_30',
    name: 'By the Numbers',
    criteria: 'Hit your calorie goal 30 times.',
    description: "Thirty goal days. You're that person now. It's a compliment.",
    category: 'nutrition',
    tier: 'medium',
    icon: 'nutrition',
    iconColor: '#12a882',
    bgColor: 'rgba(13,146,104,0.18)',
    progressKey: 'nutritionGoalDays',
    progressTarget: 30,
  },
  {
    id: 'nutrition_50',
    name: 'On the Dot',
    criteria: 'Hit your calorie goal 50 times.',
    description: "Fifty goal days. You've memorized the nutrition info for your 5 go-to foods. Don't pretend you haven't.",
    category: 'nutrition',
    tier: 'medium',
    icon: 'nutrition',
    iconColor: '#15b390',
    bgColor: 'rgba(13,146,104,0.20)',
    progressKey: 'nutritionGoalDays',
    progressTarget: 50,
  },
  {
    id: 'nutrition_75',
    name: 'The Standard',
    criteria: 'Hit your calorie goal 75 times.',
    description: 'Seventy-five days of eating with intention. Your grocery trips are embarrassingly efficient.',
    category: 'nutrition',
    tier: 'large',
    icon: 'nutrition',
    iconColor: '#34c9a8',
    bgColor: 'rgba(13,146,104,0.22)',
    progressKey: 'nutritionGoalDays',
    progressTarget: 75,
  },
  {
    id: 'nutrition_100',
    name: 'Optimized',
    criteria: 'Hit your calorie goal 100 times.',
    description: "100 days of hitting your window. At this point it's not a goal. It's just Tuesday.",
    category: 'nutrition',
    tier: 'large',
    icon: 'nutrition',
    iconColor: '#4ecdb2',
    bgColor: 'rgba(13,146,104,0.22)',
    progressKey: 'nutritionGoalDays',
    progressTarget: 100,
  },
  {
    id: 'nutrition_200',
    name: 'Unrelenting',
    criteria: 'Hit your calorie goal 200 times.',
    description: "Two hundred goal days. People who say tracking doesn't work haven't met you.",
    category: 'nutrition',
    tier: 'large',
    displayTier: 'platinum',
    icon: 'nutrition',
    iconColor: '#7dd9c5',
    bgColor: 'rgba(13,146,104,0.25)',
    progressKey: 'nutritionGoalDays',
    progressTarget: 200,
  },
  {
    id: 'nutrition_365',
    name: 'No Cheat Days',
    criteria: 'Hit your calorie goal 365 times.',
    description: 'The app was built for people like you. We need more people like you...',
    category: 'nutrition',
    tier: 'large',
    displayTier: 'diamond',
    icon: 'nutrition',
    iconColor: '#a8ead8',
    bgColor: 'rgba(13,146,104,0.30)',
    progressKey: 'nutritionGoalDays',
    progressTarget: 365,
  },

  // SLEEP
  {
    id: 'sleep_first',
    name: 'Lights Out',
    criteria: 'Log sleep for the first time.',
    description: 'The journey to better sleep starts here.',
    category: 'sleep',
    tier: 'small',
    icon: 'moon-outline',
    iconColor: '#6366f1',
    bgColor: 'rgba(99,102,241,0.15)',
    progressKey: 'sleepAnyDays',
    progressTarget: 1,
  },
  {
    id: 'sleep_green_1',
    name: 'Green Light',
    criteria: 'Earn your first green sleep score (85+).',
    description: 'One night of real rest. The bar is set.',
    category: 'sleep',
    tier: 'small',
    icon: 'moon',
    iconColor: '#6366f1',
    bgColor: 'rgba(99,102,241,0.15)',
    progressKey: 'greenSleepDays',
    progressTarget: 1,
  },
  {
    id: 'sleep_green_10',
    name: 'Night School',
    criteria: 'Earn 10 green sleep scores.',
    description: 'Ten nights of real rest. Your body noticed.',
    category: 'sleep',
    tier: 'small',
    icon: 'moon',
    iconColor: '#818cf8',
    bgColor: 'rgba(99,102,241,0.18)',
    progressKey: 'greenSleepDays',
    progressTarget: 10,
  },
  {
    id: 'sleep_green_30',
    name: 'Deep Sleeper',
    criteria: 'Earn 30 green sleep scores.',
    description: 'A month of quality sleep. You\'ve figured something out here.',
    category: 'sleep',
    tier: 'medium',
    icon: 'moon',
    iconColor: '#a5b4fc',
    bgColor: 'rgba(99,102,241,0.20)',
    progressKey: 'greenSleepDays',
    progressTarget: 30,
  },
  {
    id: 'sleep_green_50',
    name: 'Sweet Dreams',
    criteria: 'Earn 50 green sleep scores.',
    description: 'Fifty green. At this point, bad sleep would feel weird.',
    category: 'sleep',
    tier: 'medium',
    icon: 'moon',
    iconColor: '#c4b5fd',
    bgColor: 'rgba(139,92,246,0.20)',
    progressKey: 'greenSleepDays',
    progressTarget: 50,
  },
  {
    id: 'sleep_green_100',
    name: 'Sleep Architect',
    criteria: 'Earn 100 green sleep scores.',
    description: '100 nights. The blueprint is set and the results speak for themselves.',
    category: 'sleep',
    tier: 'large',
    icon: 'moon',
    iconColor: '#ddd6fe',
    bgColor: 'rgba(139,92,246,0.22)',
    progressKey: 'greenSleepDays',
    progressTarget: 100,
  },
  {
    id: 'sleep_green_200',
    name: 'Sleep Surgeon',
    criteria: 'Earn 200 green sleep scores.',
    description: 'You must have a reallllly nice pillow.',
    category: 'sleep',
    tier: 'large',
    displayTier: 'platinum',
    icon: 'moon',
    iconColor: '#ede9fe',
    bgColor: 'rgba(139,92,246,0.25)',
    progressKey: 'greenSleepDays',
    progressTarget: 200,
  },
  {
    id: 'sleep_green_365',
    name: 'Sleep Legend',
    criteria: 'Earn 365 green sleep scores.',
    description: 'A year of real rest. Most people dream about this (get it?).',
    category: 'sleep',
    tier: 'diamond',
    icon: 'moon',
    iconColor: '#f5f3ff',
    bgColor: 'rgba(139,92,246,0.30)',
    progressKey: 'greenSleepDays',
    progressTarget: 365,
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
// goalWeight required to determine direction -- pass 0 or equal to startWeight to disable all milestones.
export function getWeightMilestonesCrossed(
  startWeight: number,
  newWeight: number,
  goalWeight: number,
  store: AchievementsStore
): string[] {
  if (goalWeight === startWeight) return [];

  if (goalWeight < startWeight) {
    const totalLost = startWeight - newWeight;
    if (totalLost <= 0) return [];
    const milestones = [
      { id: 'weight_loss_5',   threshold: 5   },
      { id: 'weight_loss_10',  threshold: 10  },
      { id: 'weight_loss_25',  threshold: 25  },
      { id: 'weight_loss_50',  threshold: 50  },
      { id: 'weight_loss_75',  threshold: 75  },
      { id: 'weight_loss_100', threshold: 100 },
    ];
    return milestones
      .filter(m => totalLost >= m.threshold && !store[m.id])
      .map(m => m.id)
      .reverse();
  }

  // Gain goal
  const totalGained = newWeight - startWeight;
  if (totalGained <= 0) return [];
  const milestones = [
    { id: 'weight_gain_5',   threshold: 5   },
    { id: 'weight_gain_10',  threshold: 10  },
    { id: 'weight_gain_25',  threshold: 25  },
    { id: 'weight_gain_50',  threshold: 50  },
    { id: 'weight_gain_75',  threshold: 75  },
    { id: 'weight_gain_100', threshold: 100 },
  ];
  return milestones
    .filter(m => totalGained >= m.threshold && !store[m.id])
    .map(m => m.id)
    .reverse();
}

export function isGoalWeightHit(
  currentWeight: number,
  goalWeight: number,
  startWeight: number,
  store: AchievementsStore
): boolean {
  if (goalWeight === startWeight) return false;
  const hit = goalWeight < startWeight
    ? currentWeight <= goalWeight   // loss goal
    : currentWeight >= goalWeight;  // gain goal
  if (!hit) return false;
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

// ─── Momentum Achievement Check ───────────────────────────────────────────────
// Self-contained -- loads its own store, writes to AsyncStorage, returns newly
// unlocked defs so the caller can fire showCelebration + showAchievementToast.
// Once-per-day gate fires only after today has logged data (streak > 0).

export async function checkMomentumAchievements(): Promise<AchievementDef[]> {
  // Compute consecutive logging day streak first
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 400; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dk = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    try {
      const raw = await AsyncStorage.getItem(`pj_${dk}`);
      if (raw) streak++;
      else break;
    } catch { break; }
  }
  if (streak === 0) return [];

  // Once-per-day gate (only after streak > 0 so journaling before logging doesn't swallow the gate)
  const todayKey = today.toISOString().split('T')[0];
  try {
    const gateRaw = await AsyncStorage.getItem('pj_momentum_checked');
    if (gateRaw === todayKey) return [];
  } catch {}
  try { await storageSet('pj_momentum_checked', todayKey); } catch {}

  const milestones = [
    { id: 'streak_3',   threshold: 3   },
    { id: 'streak_7',   threshold: 7   },
    { id: 'streak_14',  threshold: 14  },
    { id: 'streak_30',  threshold: 30  },
    { id: 'streak_60',  threshold: 60  },
    { id: 'streak_90',  threshold: 90  },
    { id: 'streak_180', threshold: 180 },
    { id: 'streak_365', threshold: 365 },
  ];

  const store = await loadAchievements();
  let updatedStore = store;
  const unlockedDefs: AchievementDef[] = [];

  for (const m of milestones) {
    if (streak >= m.threshold) {
      const { newlyUnlocked: didUnlock, updatedStore: s } = await checkAndUnlock(m.id, updatedStore);
      updatedStore = s;
      if (didUnlock) {
        const def = ACHIEVEMENTS.find(a => a.id === m.id);
        if (def) unlockedDefs.push(def);
      }
    }
  }

  return unlockedDefs;
}

// ─── Faith Achievement Check ──────────────────────────────────────────────────
// Call after any faith journal save. trigger indicates which bucket just changed.
// Loads its own store, writes to AsyncStorage, returns newly unlocked defs.

export async function checkFaithAchievements(
  trigger: 'verse' | 'prayer' | 'gratitude' | 'bible'
): Promise<AchievementDef[]> {
  const store = await loadAchievements();
  let updatedStore = store;
  const unlockedDefs: AchievementDef[] = [];

  const unlock = async (id: string) => {
    const { newlyUnlocked: did, updatedStore: s } = await checkAndUnlock(id, updatedStore);
    updatedStore = s;
    if (did) {
      const def = ACHIEVEMENTS.find(a => a.id === id);
      if (def) unlockedDefs.push(def);
    }
  };

  if (trigger === 'verse' || trigger === 'prayer' || trigger === 'gratitude') {
    const raw = await AsyncStorage.getItem('pj_bible_reflections');
    const entries: Array<{ category?: string }> = raw ? JSON.parse(raw) : [];

    if (trigger === 'verse') {
      const count = entries.filter(e => e.category === 'verse').length;
      if (count >= 1)   await unlock('verse_first');
      if (count >= 10)  await unlock('verse_10');
      if (count >= 25)  await unlock('verse_25');
      if (count >= 50)  await unlock('verse_50');
      if (count >= 100) await unlock('verse_100');
      if (count >= 200) await unlock('verse_200');
      if (count >= 365) await unlock('verse_365');
    }

    if (trigger === 'prayer') {
      const count = entries.filter(e => e.category === 'prayer').length;
      if (count >= 1)   await unlock('prayer_first');
      if (count >= 10)  await unlock('prayer_10');
      if (count >= 25)  await unlock('prayer_25');
      if (count >= 50)  await unlock('prayer_50');
      if (count >= 100) await unlock('prayer_100');
      if (count >= 200) await unlock('prayer_200');
      if (count >= 365) await unlock('prayer_365');
    }

    if (trigger === 'gratitude') {
      const count = entries.filter(e => e.category === 'gratitude').length;
      if (count >= 7)   await unlock('gratitude_7');
      if (count >= 30)  await unlock('gratitude_30');
      if (count >= 100) await unlock('gratitude_100');
      if (count >= 200) await unlock('gratitude_200');
      if (count >= 365) await unlock('gratitude_365');
    }
  }

  if (trigger === 'bible') {
    const raw = await AsyncStorage.getItem('pj_reading_plans');
    const all: Record<string, { completedDays?: number[] }> = raw ? JSON.parse(raw) : {};
    const totalDays = Object.values(all).reduce(
      (acc, prog) => acc + new Set(prog.completedDays ?? []).size,
      0
    );
    if (totalDays >= 7)   await unlock('bible_7');
    if (totalDays >= 30)  await unlock('bible_30');
    if (totalDays >= 50)  await unlock('bible_50');
    if (totalDays >= 100) await unlock('bible_100');
    if (totalDays >= 200) await unlock('bible_200');
    if (totalDays >= 365) await unlock('bible_365');
  }

  return unlockedDefs;
}

// ─── Workout Achievement Check ────────────────────────────────────────────────
// Call after any exercise is logged, program is loaded, or routine is saved.
// Loads its own store, writes to AsyncStorage, returns newly unlocked defs.

export async function checkWorkoutAchievements(): Promise<AchievementDef[]> {
  const store = await loadAchievements();
  let updatedStore = store;
  const unlockedDefs: AchievementDef[] = [];

  const unlock = async (id: string) => {
    const { newlyUnlocked: did, updatedStore: s } = await checkAndUnlock(id, updatedStore);
    updatedStore = s;
    if (did) {
      const def = ACHIEVEMENTS.find(a => a.id === id);
      if (def) unlockedDefs.push(def);
    }
  };

  try {
    const raw = await AsyncStorage.getItem('pj_workout_state');
    const state = raw ? JSON.parse(raw) : {};
    const programs: Record<string, { exercises?: unknown[] }> = state.programs ?? {};

    const workoutDays = Object.keys(programs).filter(
      key => Array.isArray(programs[key]?.exercises) && (programs[key].exercises?.length ?? 0) > 0
    ).length;

    if (workoutDays >= 1)   await unlock('workout_first');
    if (workoutDays >= 10)  await unlock('workout_10');
    if (workoutDays >= 30)  await unlock('workout_30');
    if (workoutDays >= 50)  await unlock('workout_50');
    if (workoutDays >= 75)  await unlock('workout_75');
    if (workoutDays >= 100) await unlock('workout_100');
    if (workoutDays >= 200) await unlock('workout_200');
    if (workoutDays >= 365) await unlock('workout_365');

    if (state.activeProgramName) {
      await unlock('workout_first_program');
    }
  } catch {}

  try {
    const routinesRaw = await AsyncStorage.getItem('pj_routines');
    const routines = routinesRaw ? JSON.parse(routinesRaw) : [];
    if (Array.isArray(routines) && routines.length > 0) {
      await unlock('workout_first_routine');
    }
  } catch {}

  return unlockedDefs;
}

// ─── Sleep Score Helper (internal) ───────────────────────────────────────────

function computeSleepScore(
  hours: number,
  stages: { core: number; deep: number; rem: number; totalMs: number } | null,
  goal: number,
  feel: number | null,
): number | null {
  if (!hours || hours <= 0) return null;
  const FEEL_BONUS: Record<number, number> = { 1: 0, 2: 10, 3: 20, 4: 30, 5: 40 };
  if (stages && stages.totalMs > 0) {
    const durPts  = Math.min(40, Math.pow(hours / goal, 3) * 40);
    const deepPct = stages.deep / stages.totalMs;
    const remPct  = stages.rem  / stages.totalMs;
    const deepPts = Math.min(30, (deepPct / 0.20) * 30);
    const remPts  = Math.min(30, (remPct  / 0.22) * 30);
    return Math.round(Math.min(100, durPts + deepPts + remPts));
  }
  if (!feel) return null;
  const durPts = Math.min(60, (hours / goal) * 60);
  return Math.round(Math.min(100, durPts + (FEEL_BONUS[feel] ?? 0)));
}

// ─── Sleep Achievement Check ──────────────────────────────────────────────────
// Call after any sleep data is saved (manual or HealthKit).
// Loads its own store, writes to AsyncStorage, returns newly unlocked defs.

export async function checkSleepAchievements(): Promise<AchievementDef[]> {
  const store = await loadAchievements();
  let updatedStore = store;
  const unlockedDefs: AchievementDef[] = [];

  const unlock = async (id: string) => {
    const { newlyUnlocked: did, updatedStore: s } = await checkAndUnlock(id, updatedStore);
    updatedStore = s;
    if (did) {
      const def = ACHIEVEMENTS.find(a => a.id === id);
      if (def) unlockedDefs.push(def);
    }
  };

  try {
    const profileRaw = await AsyncStorage.getItem('pj_profile');
    const profile    = profileRaw ? JSON.parse(profileRaw) : {};
    const sleepGoal  = profile.sleepGoal ?? 7;

    const allKeys  = await AsyncStorage.getAllKeys();
    const dailyKeys = (allKeys as string[]).filter(k => /^pj_\d{4}-\d{2}-\d{2}$/.test(k));

    let daysWithSleep  = 0;
    let greenSleepDays = 0;

    for (const key of dailyKeys) {
      try {
        const raw = await AsyncStorage.getItem(key);
        if (!raw) continue;
        const data  = JSON.parse(raw);
        const hours = data.sleepOverride ?? data.sleepHours ?? null;
        if (!hours || hours <= 0) continue;
        daysWithSleep++;
        const score = computeSleepScore(hours, data.sleepStages ?? null, sleepGoal, data.sleepFeelRating ?? null);
        if (score !== null && score >= 85) greenSleepDays++;
      } catch { /* skip corrupted day */ }
    }

    if (daysWithSleep >= 1)   await unlock('sleep_first');
    if (greenSleepDays >= 1)   await unlock('sleep_green_1');
    if (greenSleepDays >= 10)  await unlock('sleep_green_10');
    if (greenSleepDays >= 30)  await unlock('sleep_green_30');
    if (greenSleepDays >= 50)  await unlock('sleep_green_50');
    if (greenSleepDays >= 100) await unlock('sleep_green_100');
    if (greenSleepDays >= 200) await unlock('sleep_green_200');
    if (greenSleepDays >= 365) await unlock('sleep_green_365');
  } catch {}

  return unlockedDefs;
}

// ─── Nutrition Achievement Check ─────────────────────────────────────────────
// Call after any food entry is saved (non-edit path only).
// Evaluates COMPLETED days only (never today -- today's logging is in progress).
// Uses === exact match on count so each achievement fires on exactly one qualifying day.
// Once-per-day gate via pj_nutrition_ach_checked.

export async function checkNutritionAchievements(): Promise<AchievementDef[]> {
  // Once-per-day gate
  const today = new Date().toISOString().split('T')[0];
  try {
    const gateRaw = await AsyncStorage.getItem('pj_nutrition_ach_checked');
    if (gateRaw === today) return [];
  } catch {}
  try { await storageSet('pj_nutrition_ach_checked', today); } catch {}

  // Load calorie target from pj_settings (with pj_profile fallback)
  let calTarget = 0;
  try {
    const settingsRaw = await AsyncStorage.getItem('pj_settings');
    const settings    = settingsRaw ? JSON.parse(settingsRaw) : {};
    calTarget = parseFloat(settings.calTarget) || 0;
    if (!calTarget) {
      const profileRaw = await AsyncStorage.getItem('pj_profile');
      const profile    = profileRaw ? JSON.parse(profileRaw) : {};
      calTarget = parseFloat(profile.calTarget) || 0;
    }
  } catch {}
  if (calTarget <= 0) return []; // no valid target, can't evaluate

  // Scan all completed daily keys (exclude today -- still in progress)
  let nutritionGoalDays = 0;
  try {
    const allKeys   = await AsyncStorage.getAllKeys();
    const dailyKeys = (allKeys as string[]).filter(
      k => /^pj_\d{4}-\d{2}-\d{2}$/.test(k) && k !== `pj_${today}`
    );

    for (const key of dailyKeys) {
      try {
        const raw = await AsyncStorage.getItem(key);
        if (!raw) continue;
        const data    = JSON.parse(raw);
        const entries = Array.isArray(data.entries) ? data.entries.filter(Boolean) : [];
        if (entries.length < 1) continue;
        const consumed       = entries.reduce((sum: number, e: any) => sum + (e.cal || 0), 0);
        const adjustedTarget = calTarget + (data.activeCalories ?? 0);
        if (adjustedTarget <= 0) continue;
        if (consumed >= adjustedTarget - 300 && consumed <= adjustedTarget + 150) {
          nutritionGoalDays++;
        }
      } catch { /* skip corrupted day */ }
    }
  } catch {}

  if (nutritionGoalDays === 0) return [];

  // Exact match -- only the achievement whose threshold equals the current count fires
  const milestones = [
    { id: 'nutrition_1',   threshold: 1   },
    { id: 'nutrition_10',  threshold: 10  },
    { id: 'nutrition_30',  threshold: 30  },
    { id: 'nutrition_50',  threshold: 50  },
    { id: 'nutrition_75',  threshold: 75  },
    { id: 'nutrition_100', threshold: 100 },
    { id: 'nutrition_200', threshold: 200 },
    { id: 'nutrition_365', threshold: 365 },
  ];

  const target = milestones.find(m => m.threshold === nutritionGoalDays);
  if (!target) return [];

  const store = await loadAchievements();
  const { newlyUnlocked, updatedStore: _u } = await checkAndUnlock(target.id, store);
  if (!newlyUnlocked) return [];
  const def = ACHIEVEMENTS.find(a => a.id === target.id);
  return def ? [def] : [];
}