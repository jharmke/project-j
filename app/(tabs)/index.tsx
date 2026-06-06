import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, AppState, Dimensions, Easing, Keyboard, KeyboardAvoidingView, Modal, Platform, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import ReAnimated, { useAnimatedStyle, useAnimatedProps, useSharedValue, withTiming, withRepeat, withSequence, withDelay, cancelAnimation, Easing as ReAnimEasing } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import PressableButton from '../../components/PressableButton';
import { useToast } from '../../components/Toast';
import { showCelebration } from '../../components/CelebrationOverlay';
import { showAchievementToast, showDailyGoalToast } from '../../components/AchievementToast';
import { ACHIEVEMENTS, AchievementsStore, checkAndUnlock, loadAchievements, weightEntryIsPlausible, getWeightMilestonesCrossed, isGoalWeightHit, handleDailyGoalHit, checkMomentumAchievements, checkSleepAchievements, getCelebTier } from '../../achievementData';
import { loadFromFirebase, saveToFirebase } from '../../firebaseConfig';
import { storageSet } from '../../utils/storage';
import { VERSES, resolveDailyVerse } from '../../data/verses';
import FaithTodayCard from '../../components/FaithTodayCard';
import { loadCalorieTargets } from '../../utils/calorieTarget';
import { useTheme } from '../../theme';
import HeaderAvatar from '../../components/HeaderAvatar';
import { useHealthKit } from '../../useHealthKit';
import { DayDetailContent } from '../day-detail';
import TooltipModal from '../../components/TooltipModal';
import TooltipIcon from '../../components/TooltipIcon';
import { useTooltip } from '../../useTooltip';
import GratitudeStreakCard from '../../components/GratitudeStreakCard';
import ReadingPlansCard from '../../components/ReadingPlansCard';
import { StatsCard, CardPeriod, DATA_KEY_META, DEFAULT_STATS_CARDS } from '../../statsCardRegistry';
import { TrendData, EMPTY_TREND_DATA, fetchTrendData } from '../../utils/statsData';
import { calcSleepScore } from '../../utils/sleepScore';
import { runDayScoreScan } from '../../utils/dayScoreStore';
import { DayScore } from '../../utils/dayScore';
import DaySummaryModal from '../../components/DaySummaryModal';
import DayScoreDisclaimerModal from '../../components/DayScoreDisclaimerModal';
import { archiveNav } from '../../utils/archiveNav';
import { StatsGraphCard } from '../../components/StatsGraphCard';
import { StatsCardEditModal } from '../../components/StatsCardEditModal';
import { saveStatsCards } from '../../statsCardRegistry';
import { useTutorial, isTutorialSeen } from '../../context/TutorialContext';
import { useTutorialTarget } from '../../hooks/useTutorialTarget';
import { showToolkit } from '../../components/ToolkitSheet';
import ToggleSwitch from '../../components/ToggleSwitch';
import { StoredTip, loadSmartTips } from '../../utils/smartTipsEngine';

// ─── Card Registry ────────────────────────────────────────────────────────────
export type CardId =
  | 'verse'
  | 'smart_tip'
  | 'calories'
  | 'macros'
  | 'water'
  | 'weight'
  | 'workout'
  | 'steps'
  | 'sleep'
  | 'fitness_metrics'
  | 'daily_note'
  | 'gratitude_streak'
  | 'reading_plans'
  | 'vs_yesterday';

interface CardMeta {
  id: CardId;
  label: string;
  description: string;
  defaultVisible: boolean;
}

const CARD_REGISTRY: CardMeta[] = [
  { id: 'verse',          label: 'Faith Today',        description: 'Verse, plans, and prayer hub',           defaultVisible: true },
  { id: 'smart_tip',      label: 'Smart Tip',          description: 'Your top coaching insight for today',    defaultVisible: true },
  { id: 'calories',       label: 'Calories',           description: 'Daily calorie intake & progress',        defaultVisible: true },
  { id: 'macros',         label: 'Macros',             description: 'Protein, carbs & fat breakdown',         defaultVisible: true },
  { id: 'water',          label: 'Water',              description: 'Hydration tracking',                     defaultVisible: true },
  { id: 'weight',         label: 'Weight',             description: 'Daily weigh-in & total progress',        defaultVisible: true },
  { id: 'workout',        label: "Today's Training",   description: "Workout summary and calories burned",     defaultVisible: true },
  { id: 'steps',          label: 'Steps',              description: 'Step count from Apple Health',           defaultVisible: true },
  { id: 'sleep',          label: 'Sleep',              description: 'Sleep duration & stages from Apple Health', defaultVisible: true },
  { id: 'fitness_metrics',label: 'Fitness Metrics',    description: 'VO2 Max & cardio recovery score',        defaultVisible: true },
  { id: 'daily_note',       label: 'Daily Note',         description: 'Journal entry for the day',             defaultVisible: true },
  { id: 'gratitude_streak', label: 'Gratitude Streak',  description: 'Daily gratitude habit tracker',          defaultVisible: false },
  { id: 'reading_plans',    label: 'Reading Plans',      description: 'Daily Bible reading plan tracker',       defaultVisible: true },
  { id: 'vs_yesterday',     label: 'You vs Yesterday',   description: 'Daily head-to-head across key metrics', defaultVisible: true },
];

const DEFAULT_ORDER: CardId[] = [
  'verse', 'smart_tip', 'calories', 'macros', 'water', 'weight', 'workout',
  'steps', 'sleep', 'gratitude_streak', 'reading_plans',
  'fitness_metrics', 'daily_note', 'vs_yesterday',
];
const DEFAULT_VISIBLE: Record<CardId, boolean> = Object.fromEntries(
  CARD_REGISTRY.map(c => [c.id, c.defaultVisible])
) as Record<CardId, boolean>;



// Mode-specific default card orders -- only applied on fresh install (no saved cardOrder)
const DISCIPLINE_ORDER: CardId[] = [
  'verse', 'calories', 'workout', 'sleep', 'macros', 'steps', 'water', 'weight',
  'fitness_metrics', 'vs_yesterday', 'gratitude_streak', 'reading_plans', 'daily_note',
];
const MINDFUL_ORDER: CardId[] = [
  'verse', 'gratitude_streak', 'sleep', 'calories', 'workout', 'water', 'steps',
  'weight', 'reading_plans', 'daily_note', 'vs_yesterday',
];
// Mindful hides macros and fitness_metrics by default -- users can add via Edit Layout
const MINDFUL_VISIBLE: Record<CardId, boolean> = {
  ...DEFAULT_VISIBLE,
  macros: false,
  fitness_metrics: false,
};

// ─── Constants ────────────────────────────────────────────────────────────────
const WATER_TARGET = 128;
const PROGRAM: Record<string, any> = {
  Wed: { focus: 'Push',        muscles: 'Chest · Shoulders · Triceps',            color: '#3b82f6', type: 'lift'   },
  Sat: { focus: 'Pull',        muscles: 'Back · Biceps · Rear Delts',             color: '#10b981', type: 'lift'   },
  Sun: { focus: 'Legs + Core', muscles: 'Quads · Hamstrings · Glutes · Core',    color: '#f59e0b', type: 'lift'   },
  Mon: { focus: 'Cardio',      type: 'cardio' },
  Tue: { focus: 'Cardio',      type: 'cardio' },
  Thu: { focus: 'Cardio',      type: 'cardio' },
  Fri: { focus: 'Cardio',      type: 'cardio' },
};
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
// Signed daily calorie delta per pace (negative = deficit, positive = surplus).
// Single source of truth for the calTarget calc (loadData), the on-pace target, and the projected-date calc.
const GOAL_DEFICITS: Record<string, number> = { lose_2: -1000, lose_1_5: -750, lose_1: -500, lose_0_5: -250, maintain: 0, gain_0_5: 250, gain_1: 500 };
// VERSES and the daily rotation picker now live in data/verses.ts, shared with the Faith
// tab so both tabs show the same verse and the no-repeat rotation never double advances.

// ─── Sub-components ───────────────────────────────────────────────────────────
function MacroDonut({ protein, carbs, fat, calories, theme }: { protein: number; carbs: number; fat: number; calories: number; theme: any }) {
  const size = 120;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = protein + carbs + fat;
  if (total === 0) {
    return (
      <View style={{ alignItems: 'center', justifyContent: 'center', width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle cx={size/2} cy={size/2} r={radius} stroke="#2a2a2a" strokeWidth={strokeWidth} fill="none" />
        </Svg>
        <View style={{ position: 'absolute', alignItems: 'center' }}>
          <Text style={{ color: theme.textDim, fontSize: 11, fontFamily: 'DMSans_400Regular' }}>no data</Text>
        </View>
      </View>
    );
  }
  const proteinPct = protein / total;
  const carbsPct   = carbs   / total;
  const proteinDash = proteinPct * circumference;
  const carbsDash   = carbsPct   * circumference;
  const fatDash     = (fat / total) * circumference;
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: size, height: size }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size/2} cy={size/2} r={radius} stroke="#2a2a2a" strokeWidth={strokeWidth} fill="none" />
        <Circle cx={size/2} cy={size/2} r={radius} stroke="#0d9268" strokeWidth={strokeWidth} fill="none"
          strokeDasharray={`${proteinDash} ${circumference}`} strokeDashoffset={0} strokeLinecap="butt" />
        <Circle cx={size/2} cy={size/2} r={radius} stroke="#c47d1a" strokeWidth={strokeWidth} fill="none"
          strokeDasharray={`${carbsDash} ${circumference}`} strokeDashoffset={-(proteinPct * circumference)} strokeLinecap="butt" />
        <Circle cx={size/2} cy={size/2} r={radius} stroke="#a83232" strokeWidth={strokeWidth} fill="none"
          strokeDasharray={`${fatDash} ${circumference}`} strokeDashoffset={-((proteinPct + carbsPct) * circumference)} strokeLinecap="butt" />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={{ color: theme.textPrimary, fontSize: 16, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1 }}>{calories}</Text>
        <Text style={{ color: theme.textMuted, fontSize: 9, fontFamily: 'DMSans_400Regular' }}>kcal</Text>
      </View>
    </View>
  );
}

const AnimCircle = ReAnimated.createAnimatedComponent(Circle);

// Parses "10:30 PM" or "2:45 AM" to minutes from midnight
function parseBedTimeToMins(str: string): number | null {
  const match = str.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return null;
  let h = parseInt(match[1]);
  const m = parseInt(match[2]);
  const ampm = match[3].toUpperCase();
  if (ampm === 'PM' && h < 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  return h * 60 + m;
}

async function calcBedtimeConsistencyPts(todayBedStr: string | null, todayKey: string): Promise<number> {
  if (!todayBedStr) return 0;
  const todayMins = parseBedTimeToMins(todayBedStr);
  if (todayMins === null) return 0;
  const today = new Date();
  const keys: string[] = [];
  for (let i = 1; i <= 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    keys.push(`pj_${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);
  }
  const results = await AsyncStorage.multiGet(keys);
  const priorMins: number[] = [];
  for (const [, val] of results) {
    if (!val) continue;
    try {
      const data = JSON.parse(val);
      const bt = data.sleepBedTime;
      if (bt) {
        const mins = parseBedTimeToMins(bt);
        if (mins !== null) priorMins.push(mins);
      }
    } catch {}
  }
  if (priorMins.length < 3) return 5; // neutral -- not enough history
  // Normalize prior times to within ±12h of today to handle midnight wrap
  const normalized = priorMins.map(m => {
    let diff = m - todayMins;
    if (diff > 720) diff -= 1440;
    if (diff < -720) diff += 1440;
    return todayMins + diff;
  });
  const avg = normalized.reduce((a, b) => a + b, 0) / normalized.length;
  const dev = Math.abs(todayMins - avg);
  const wrappedDev = Math.min(dev, 1440 - dev);
  if (wrappedDev <= 30) return 10;
  if (wrappedDev <= 60) return 7;
  if (wrappedDev <= 90) return 3;
  return 0;
}

const SLEEP_TIPS: Record<string, string[]> = {
  low_deep: [
    "Your deep sleep was lower than ideal. Try avoiding alcohol and heavy meals within 3 hours of bed.",
    "Deep sleep is when your body physically repairs itself. A cooler room temperature can help increase it.",
    "Consistent bedtimes train your body to hit deep sleep faster. Try locking in a set schedule.",
  ],
  low_rem: [
    "REM supports memory and mood. Reducing screens 30-60 minutes before bed may help.",
    "Stress and anxiety are the biggest REM killers. A short wind-down routine can make a real difference.",
    "Caffeine late in the day can suppress REM. Try cutting off by early afternoon.",
  ],
  low_duration: [
    "You fell short of your sleep goal. Try setting a consistent bedtime and sticking to it even on weekends.",
    "Even 30 extra minutes of sleep compounds over time. Consider an earlier wind-down.",
    "Sleep debt builds faster than you think. Prioritizing one early night can reset your rhythm.",
  ],
  good: [
    "Solid night. Your body recovered well. Make the most of it today.",
    "Great sleep. Consistency is the key: same bedtime tonight.",
    "Your body did its job last night. Fuel it well today.",
  ],
  catch_all: [
    "Your sleep was decent but there's room to improve. Focus on consistency: same bedtime and wake time every day.",
    "Good effort but not quite there. Even small improvements to your sleep environment can add up.",
    "You're close to a great night. Winding down 30 minutes earlier could push you over the edge.",
  ],
};

function getSleepTip(
  score: number,
  sleepHours: number | null,
  sleepStages: { core: number; deep: number; rem: number; totalMs: number } | null,
  sleepGoal: number,
  dateKey: string
): string | null {
  if (!sleepHours) return null;
  const daySeed = parseInt(dateKey.replace(/-/g, '')) % 3;
  if (!sleepStages) {
    if (score >= 85) return SLEEP_TIPS.good[daySeed];
    if (sleepHours < sleepGoal * 0.85) return SLEEP_TIPS.low_duration[daySeed];
    return null;
  }
  const totalMs = sleepStages.totalMs;
  const deepPct = sleepStages.deep / totalMs;
  const remPct = sleepStages.rem / totalMs;
  if (deepPct < 0.12) return SLEEP_TIPS.low_deep[daySeed];
  if (remPct < 0.15) return SLEEP_TIPS.low_rem[daySeed];
  if (sleepHours < sleepGoal * 0.85) return SLEEP_TIPS.low_duration[daySeed];
  if (score >= 85) return SLEEP_TIPS.good[daySeed];
  return SLEEP_TIPS.catch_all[daySeed];
}

function ScoreRing({ score, scoreColor, trackColor, donutSize, donutStroke, donutRadius, donutCirc, shimmer, refreshKey }: {
  score: number; scoreColor: string; trackColor: string;
  donutSize: number; donutStroke: number; donutRadius: number; donutCirc: number;
  shimmer?: boolean; refreshKey?: number;
}) {
  const arcAnim = useSharedValue(0);
  const shimmerScale = useSharedValue(1);

  useEffect(() => {
    cancelAnimation(arcAnim);
    arcAnim.value = 0;
    setTimeout(() => {
      arcAnim.value = withTiming((score / 100) * donutCirc, { duration: 1000, easing: ReAnimEasing.out(ReAnimEasing.cubic) });
    }, 200);
  }, [score, refreshKey]);

  useEffect(() => {
    if (shimmer) {
      shimmerScale.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 200, easing: ReAnimEasing.out(ReAnimEasing.cubic) }),
          withTiming(1.0,  { duration: 350, easing: ReAnimEasing.in(ReAnimEasing.cubic) }),
          withDelay(2800, withTiming(1.0, { duration: 1 })),
        ), -1, false,
      );
    } else {
      cancelAnimation(shimmerScale);
      shimmerScale.value = 1;
    }
  }, [shimmer]);

  const arcStyle = useAnimatedStyle(() => ({ strokeDasharray: `${arcAnim.value} ${donutCirc}` } as any));
  const shimmerCenterStyle = useAnimatedStyle(() => ({ transform: [{ scale: shimmerScale.value }] }));

  return (
    <View>
      <Svg width={donutSize} height={donutSize}>
        <Circle cx={donutSize/2} cy={donutSize/2} r={donutRadius} stroke={trackColor} strokeWidth={donutStroke} fill="none" />
        <AnimCircle cx={donutSize/2} cy={donutSize/2} r={donutRadius} stroke={scoreColor} strokeWidth={donutStroke} fill="none"
          animatedProps={arcStyle} strokeLinecap="round" rotation="-90" origin={`${donutSize/2},${donutSize/2}`} />
      </Svg>
      <View style={{ position:'absolute', top:0, left:0, width:donutSize, height:donutSize, alignItems:'center', justifyContent:'center' }}>
        <ReAnimated.View style={[{ alignItems:'center' }, shimmerCenterStyle]}>
          <View style={{ shadowColor:'#000000', shadowOffset:{width:0,height:2}, shadowOpacity:0.18, shadowRadius:0 }}>
            <Text style={{ fontSize:36, fontFamily:'BebasNeue_400Regular', color:scoreColor, letterSpacing:1, lineHeight:38, opacity:0.88 }}>{score}</Text>
          </View>
          <Text style={{ fontSize:8, fontFamily:'DMSans_700Bold', letterSpacing:2, color:scoreColor, textTransform:'uppercase', opacity:0.7 }}>/100</Text>
        </ReAnimated.View>
      </View>
    </View>
  );
}

function SleepDonut({ coreFrac, deepFrac, remFrac, donutCirc, donutSize, donutStroke, donutRadius, coreColor, deepColor, remColor, trackColor, gapFrac, refreshKey, score, scoreColor, shimmer }: {
  coreFrac: number; deepFrac: number; remFrac: number; donutCirc: number;
  donutSize: number; donutStroke: number; donutRadius: number;
  coreColor: string; deepColor: string; remColor: string; trackColor: string; gapFrac: number; refreshKey?: number;
  score: number; scoreColor: string; shimmer?: boolean;
}) {
  const coreAnim = useSharedValue(0);
  const deepAnim = useSharedValue(0);
  const remAnim  = useSharedValue(0);
  const shimmerScale = useSharedValue(1);

  useEffect(() => {
    coreAnim.value = 0;
    deepAnim.value = 0;
    remAnim.value  = 0;
    setTimeout(() => {
      coreAnim.value = withTiming(Math.max(0, coreFrac - gapFrac), { duration: 800 });
    }, 200);
    setTimeout(() => {
      deepAnim.value = withTiming(Math.max(0, deepFrac - gapFrac), { duration: 700 });
    }, 900);
    setTimeout(() => {
      remAnim.value = withTiming(Math.max(0, remFrac - gapFrac), { duration: 600 });
    }, 1500);
  }, [coreFrac, deepFrac, remFrac, refreshKey]);

  useEffect(() => {
    if (shimmer) {
      shimmerScale.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 200, easing: ReAnimEasing.out(ReAnimEasing.cubic) }),
          withTiming(1.0,  { duration: 350, easing: ReAnimEasing.in(ReAnimEasing.cubic) }),
          withDelay(2800, withTiming(1.0, { duration: 1 })),
        ),
        -1,
        false,
      );
    } else {
      cancelAnimation(shimmerScale);
      shimmerScale.value = 1;
    }
  }, [shimmer]);

  const coreStyle = useAnimatedStyle(() => ({ strokeDasharray: `${coreAnim.value} ${donutCirc}` } as any));
  const deepStyle = useAnimatedStyle(() => ({ strokeDasharray: `${deepAnim.value} ${donutCirc}` } as any));
  const remStyle  = useAnimatedStyle(() => ({ strokeDasharray: `${remAnim.value} ${donutCirc}`  } as any));
  const shimmerCenterStyle = useAnimatedStyle(() => ({ transform: [{ scale: shimmerScale.value }] }));

  return (
    <View>
      <Svg width={donutSize} height={donutSize}>
        <Circle cx={donutSize/2} cy={donutSize/2} r={donutRadius} stroke={trackColor} strokeWidth={donutStroke} fill="none" />
        <AnimCircle cx={donutSize/2} cy={donutSize/2} r={donutRadius} stroke={coreColor} strokeWidth={donutStroke} fill="none"
          animatedProps={coreStyle} strokeDashoffset={0} strokeLinecap="butt" rotation="-90" origin={`${donutSize/2},${donutSize/2}`} />
        <AnimCircle cx={donutSize/2} cy={donutSize/2} r={donutRadius} stroke={deepColor} strokeWidth={donutStroke} fill="none"
          animatedProps={deepStyle} strokeDashoffset={-(coreFrac)} strokeLinecap="butt" rotation="-90" origin={`${donutSize/2},${donutSize/2}`} />
        <AnimCircle cx={donutSize/2} cy={donutSize/2} r={donutRadius} stroke={remColor} strokeWidth={donutStroke} fill="none"
          animatedProps={remStyle} strokeDashoffset={-(coreFrac+deepFrac)} strokeLinecap="butt" rotation="-90" origin={`${donutSize/2},${donutSize/2}`} />
      </Svg>
      <View style={{ position:'absolute', top:0, left:0, width:donutSize, height:donutSize, alignItems:'center', justifyContent:'center' }}>
        <ReAnimated.View style={[{ alignItems: 'center' }, shimmerCenterStyle]}>
          <View style={{ shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 0 }}>
            <Text style={{ fontSize: 36, fontFamily: 'BebasNeue_400Regular', color: scoreColor, letterSpacing: 1, lineHeight: 38, opacity: 0.88 }}>{score}</Text>
          </View>
          <Text style={{ fontSize: 8, fontFamily: 'DMSans_700Bold', letterSpacing: 2, color: scoreColor, textTransform: 'uppercase', opacity: 0.7 }}>/100</Text>
        </ReAnimated.View>
      </View>
    </View>
  );
}

function AnimatedProgressBar({ pct, color, trackColor, refreshKey, ready, overGoal }: { pct: number; color: string; trackColor?: string; refreshKey?: number; ready?: boolean; overGoal?: boolean }) {
  const width = useSharedValue(0);
  const hasFired = useRef(false);
  const shimmerX = useSharedValue(-80);

  useEffect(() => {
    hasFired.current = false;
    width.value = 0;
    if (ready === undefined) {
      setTimeout(() => {
        width.value = withTiming(Math.min(100, pct), { duration: 1200 });
        hasFired.current = true;
      }, 800);
    } else if (ready) {
      setTimeout(() => {
        width.value = withTiming(Math.min(100, pct), { duration: 1200 });
        hasFired.current = true;
      }, 300);
    }
  }, [refreshKey]);

  useEffect(() => {
    if (ready === undefined) {
      if (!hasFired.current) return;
      width.value = withTiming(Math.min(100, pct), { duration: 600 });
      return;
    }
    if (!ready) return;
    setTimeout(() => {
      width.value = withTiming(Math.min(100, pct), { duration: 1200 });
      hasFired.current = true;
    }, 300);
  }, [pct, ready]);

  useEffect(() => {
    if (overGoal) {
      shimmerX.value = -80;
      shimmerX.value = withRepeat(withTiming(420, { duration: 1600, easing: ReAnimEasing.linear }), -1, false);
    } else {
      cancelAnimation(shimmerX);
      shimmerX.value = -80;
    }
  }, [overGoal]);

  const animStyle = useAnimatedStyle(() => ({ width: `${width.value}%` as any }));
  const shimmerStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shimmerX.value }] }));

  return (
    <View style={[styles.progressBarBg, { backgroundColor: trackColor ?? '#1e1e2e' }]}>
      <ReAnimated.View style={[styles.progressBarFill, { backgroundColor: color }, animStyle]} />
      {overGoal && (
        <ReAnimated.View style={[{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 80 }, shimmerStyle]}>
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.28)', 'transparent']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={{ flex: 1 }}
          />
        </ReAnimated.View>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
function MacroBar({ val, goal, color, trackColor, refreshKey }: { val: number; goal: number; color: string; trackColor?: string; refreshKey?: number }) {
  const pct = goal > 0 ? Math.min((val / goal) * 100, 100) : 0;
  const width = useSharedValue(0);
  useEffect(() => {
    width.value = 0;
    setTimeout(() => {
      width.value = withTiming(pct, { duration: 1000 });
    }, 800);
  }, [pct, refreshKey]);
  const animStyle = useAnimatedStyle(() => ({ width: `${width.value}%` as any }));
  return (
    <View style={{ height:6, backgroundColor: trackColor ?? '#1e1e2e', borderRadius:6, overflow:'hidden' }}>
      <ReAnimated.View style={[{ height:'100%', borderRadius:6, backgroundColor: color }, animStyle]} />
    </View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { showToast } = useToast();
  const { startTutorial, registerScrollView, unregisterScrollView, activeState: tutorialActiveState, registerIdResolver, unregisterIdResolver, registerTutorialAction, unregisterTutorialAction } = useTutorial();
  // Derive YvY demo flag -- true when the active tutorial step has yvyDemo: true.
  const yvyTutorialDemo = !!(tutorialActiveState?.tutorial.steps[tutorialActiveState.stepIndex] as any)?.yvyDemo;
  const toolkitRef = useTutorialTarget('meta_toolkit_icon');
  // ── Tutorial spotlight targets ────────────────────────────────────────────────
  const calCardRef       = useTutorialTarget('cal_card_main');
  const calRemainingRef  = useTutorialTarget('cal_card_remaining');
  const calActiveRef     = useTutorialTarget('cal_card_active');
  const calNetRef        = useTutorialTarget('cal_card_net');
  const macrosCardRef    = useTutorialTarget('macros_card_main');
  const macrosProteinRef = useTutorialTarget('macros_protein');
  const macroCarbsRef    = useTutorialTarget('macros_carbs');
  const macroFatRef      = useTutorialTarget('macros_fat');
  const sleepCardRef     = useTutorialTarget('sleep_card_main');
  const sleepDonutRef    = useTutorialTarget('sleep_donut');
  const sleepStagesRef   = useTutorialTarget('sleep_stages');
  const sleepFeelRef     = useTutorialTarget('sleep_feel');
  const yvyCardRef        = useTutorialTarget('yvy_card_main');
  const yvyMetricsRef     = useTutorialTarget('yvy_metrics');
  const editLayoutBtnRef  = useTutorialTarget('edit_layout_btn');
  const editLayoutDragRef = useTutorialTarget('edit_layout_drag');
  const editLayoutEyeRef  = useTutorialTarget('edit_layout_eye');
  const editLayoutTabsRef = useTutorialTarget('edit_layout_tabs');
  // showAchievementToast is now a direct import

  // Layout state
  const [cardOrder,   setCardOrder]   = useState<CardId[]>(DEFAULT_ORDER);
  const [cardVisible, setCardVisible] = useState<Record<CardId, boolean>>(DEFAULT_VISIBLE);
  const [editMode,         setEditMode]         = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editTab,          setEditTab]          = useState<'my' | 'add'>('my');
  const [editTutorialMode, setEditTutorialMode] = useState(false);
  const [allStatsCards, setAllStatsCards] = useState<StatsCard[]>(DEFAULT_STATS_CARDS);
  const [pinnedTrendData, setPinnedTrendData] = useState<Record<string, TrendData>>({});
  const [homeEditCard, setHomeEditCard] = useState<StatsCard | null>(null);
  const [dayDetailDate, setDayDetailDate] = useState<string | null>(null);
  const editSheetAnim = useRef(new Animated.Value(0)).current;
  const dayDetailAnim = useRef(new Animated.Value(0)).current;
  const closeDayDetail = () => {
    Animated.timing(dayDetailAnim, {
      toValue: 0,
      duration: 180,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(() => setDayDetailDate(null));
  };

  const openWaterCustomModal = (sign: 'add' | 'subtract') => {
    setWaterCustomSign(sign);
    setWaterCustomInput('');
    setShowWaterCustomModal(true);
    waterModalAnim.setValue(0);
    Animated.timing(waterModalAnim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
  };
  const closeWaterCustomModal = () => {
    waterCustomInputRef.current?.blur();
    Animated.timing(waterModalAnim, { toValue: 0, duration: 140, useNativeDriver: true }).start(() => setShowWaterCustomModal(false));
  };

  const saveWaterGoal = async () => {
    const g = parseInt(waterGoalInput);
    if (!g || g <= 0) return;
    setWaterGoal(g);
    Keyboard.dismiss();
    const existing = await AsyncStorage.getItem('pj_profile');
    const current = existing ? JSON.parse(existing) : {};
    await storageSet('pj_profile', JSON.stringify({ ...current, waterGoal: String(g) }));
    showToast('Water goal saved', `${g} oz daily goal`, 'success');
  };

  const openWaterDetailModal = () => {
    setWaterPresetInputs([String(waterPresets[0]), String(waterPresets[1]), String(waterPresets[2])]);
    setWaterGoalInput(String(waterGoal));
    setShowWaterDetailModal(true);
    waterDetailAnim.setValue(0);
    Animated.timing(waterDetailAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  };
  const closeWaterDetailModal = () => {
    Animated.timing(waterDetailAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => setShowWaterDetailModal(false));
  };

  const doWaterUpdate = async (deltaOz: number) => {
    const prev = water;
    const newWater = Math.max(0, water + deltaOz);
    const sign: 'add' | 'remove' = deltaOz > 0 ? 'add' : 'remove';
    const newEntry = { amount: Math.abs(deltaOz), timestamp: new Date().toISOString(), sign };
    const newEntries = [...waterEntries, newEntry];
    setWater(newWater);
    setWaterEntries(newEntries);
    const existing = await AsyncStorage.getItem(`pj_${todayKey}`);
    const current = existing ? JSON.parse(existing) : {};
    await storageSet(`pj_${todayKey}`, JSON.stringify({ ...current, water: newWater, waterEntries: newEntries, waterGoal }));
    saveToFirebase(todayKey, 'water', newWater);
    if (deltaOz > 0) {
      showToast('Water logged', `+${Math.abs(deltaOz)} oz · ${newWater} oz total`, 'info');
    } else if (deltaOz < 0) {
      showToast('Water removed', `-${Math.abs(deltaOz)} oz · ${newWater} oz total`, 'info');
    }
    if (deltaOz > 0 && newWater >= waterGoal && prev < waterGoal) {
      const { fired, count: hitCount } = await handleDailyGoalHit('water');
      if (fired) {
        showCelebration('small', 'WATER GOAL'); showDailyGoalToast('Water Goal', hitCount, 'water', '#3b82f6');
        let s = achievementStore;
        if (hitCount === 1)   s = await handleAchievementUnlock('hydration_first', s);
        if (hitCount === 10)  s = await handleAchievementUnlock('hydration_10', s);
        if (hitCount === 30)  s = await handleAchievementUnlock('hydration_30', s);
        if (hitCount === 50)  s = await handleAchievementUnlock('hydration_50', s);
        if (hitCount === 75)  s = await handleAchievementUnlock('hydration_75', s);
        if (hitCount === 100) s = await handleAchievementUnlock('hydration_100', s);
        if (hitCount === 200) s = await handleAchievementUnlock('hydration_200', s);
        if (hitCount === 365) await handleAchievementUnlock('hydration_365', s);
      }
    }
  };

  const deleteWaterEntry = async (idx: number) => {
    const newEntries = waterEntries.filter((_, i) => i !== idx);
    const newWater = Math.max(0, newEntries.reduce(
      (sum, e) => sum + (e.sign === 'add' ? e.amount : -e.amount), 0
    ));
    setWater(newWater);
    setWaterEntries(newEntries);
    const existing = await AsyncStorage.getItem(`pj_${todayKey}`);
    const current = existing ? JSON.parse(existing) : {};
    await storageSet(`pj_${todayKey}`, JSON.stringify({ ...current, water: newWater, waterEntries: newEntries, waterGoal }));
    saveToFirebase(todayKey, 'water', newWater);
    showToast('Entry removed', `${newWater} oz total`, 'info');
  };

  const saveWaterPresets = async () => {
    const p0 = parseInt(waterPresetInputs[0]);
    const p1 = parseInt(waterPresetInputs[1]);
    const p2 = parseInt(waterPresetInputs[2]);
    if (!p0 || !p1 || !p2 || p0 <= 0 || p1 <= 0 || p2 <= 0) return;
    const newPresets: [number,number,number] = [p0, p1, p2];
    setWaterPresets(newPresets);
    Keyboard.dismiss();
    const existing = await AsyncStorage.getItem('pj_profile');
    const current = existing ? JSON.parse(existing) : {};
    await storageSet('pj_profile', JSON.stringify({ ...current, waterPresets: newPresets }));
    showToast('Presets saved', undefined, 'success');
  };

  // App state
  const [loaded,          setLoaded]          = useState(false);
  const [refreshKey,      setRefreshKey]       = useState(0);
  const [waterPresets,    setWaterPresets]     = useState<[number,number,number]>([8,12,16]);
  const [waterGoal,       setWaterGoal]        = useState(WATER_TARGET);
  const [showWaterCustomModal, setShowWaterCustomModal] = useState(false);
  const [waterCustomInput,     setWaterCustomInput]     = useState('');
  const [waterCustomSign,      setWaterCustomSign]      = useState<'add'|'subtract'>('add');
  const waterModalAnim = useRef(new Animated.Value(0)).current;
  const waterCustomInputRef = useRef<any>(null);
  const [waterEntries, setWaterEntries] = useState<{amount:number;timestamp:string;sign:'add'|'remove'}[]>([]);
  const [showWaterDetailModal, setShowWaterDetailModal] = useState(false);
  const waterDetailAnim = useRef(new Animated.Value(0)).current;
  const [waterPresetInputs, setWaterPresetInputs] = useState<[string,string,string]>(['','','']);
  const [waterGoalInput, setWaterGoalInput] = useState('');

  const [currentTime, setCurrentTime] = useState(Date.now());

  // Health / daily state
  const [water,          setWater]          = useState(0);
  const [weight,          setWeight]          = useState<number|null>(null);
  const [yesterdayWeight, setYesterdayWeight] = useState<number|null>(null);
  const [earliestWeight,  setEarliestWeight]  = useState<number|null>(null);
  const [lastKnownWeight, setLastKnownWeight] = useState<{ val: number; daysAgo: number } | null>(null);
  const [weightInput,    setWeightInput]    = useState('');
  const [dailyNote,      setDailyNote]      = useState('');
  const [savedDailyNoteText, setSavedDailyNoteText] = useState('');
  const [totalCals,      setTotalCals]      = useState(0);
  const [calTarget,      setCalTarget]      = useState(0);
  const [caloriesBurned, setCaloriesBurned] = useState(0);
  const [totalProtein,   setTotalProtein]   = useState(0);
  const [totalCarbs,     setTotalCarbs]     = useState(0);
  const [totalFat,       setTotalFat]       = useState(0);
  const [totalFiber,        setTotalFiber]        = useState(0);
  const [totalSugarAlcohols, setTotalSugarAlcohols] = useState(0);
  const [showNetCarbs,   setShowNetCarbs]   = useState(false);
  const [showMacroGearSheet, setShowMacroGearSheet] = useState(false);
  const [stepGoal,       setStepGoal]       = useState(10000);
  const [sleepGoal,      setSleepGoal]      = useState(7);
  const [activeCalGoal,  setActiveCalGoal]  = useState(500);
  const [exerciseMinsGoal, setExerciseMinsGoal] = useState(30);
  const prevStepsRef        = useRef<number | null>(null);
  const prevActiveCalRef    = useRef<number | null>(null);
  const prevExerciseMinsRef = useRef<number | null>(null);
  const prevSleepHoursRef   = useRef<number | null>(null);
  const [macroGoals,     setMacroGoals]     = useState({ protein: 0, carbs: 0, fat: 0 });
  const [goalWeight,     setGoalWeight]     = useState<number|null>(null);
  const [weightGoalPace, setWeightGoalPace] = useState<string>('lose_1');
  const scrollRef = useRef<any>(null);
  const dailyNoteRef = useRef<any>(null);
  const dailyNoteCardRef = useRef<any>(null);

  // ── Register home ScrollView with tutorial system so off-screen targets can be scrolled into view ──
  useEffect(() => {
    registerScrollView('home', scrollRef);
    return () => unregisterScrollView('home');
  }, []);
  const editSheetHeight = useRef<number>(Dimensions.get('window').height);
  const waterLoaded = useRef(false);
  const [dailyVerse,     setDailyVerse]     = useState<{text:string;reference:string}|null>(null);
  const [workoutPrograms,setWorkoutPrograms]= useState<Record<string,any>>({});
  const [workoutChecks,  setWorkoutChecks]  = useState<Record<string,any>>({});
  const [workoutTemplate,setWorkoutTemplate]= useState<Record<string,any>>({});
  const [workoutTags,    setWorkoutTags]    = useState<any[]>([]);

  // Sleep state
  const [sleepOverride,   setSleepOverride]   = useState<number|null>(null);
  const [sleepStoredBed,  setSleepStoredBed]  = useState<string|null>(null);
  const [sleepStoredWake, setSleepStoredWake] = useState<string|null>(null);
  const [editingSleep,    setEditingSleep]    = useState(false);
  
  const [sleepBedTime,    setSleepBedTime]    = useState<Date|null>(null);
  const [sleepWakeTime,   setSleepWakeTime]   = useState<Date|null>(null);
  const [showBedTimePicker, setShowBedTimePicker]   = useState(false);
  const [showWakeTimePicker,setShowWakeTimePicker]  = useState(false);
  const [activeSleepPicker, setActiveSleepPicker]   = useState<'bed'|'wake'|null>(null);
  const [sleepFeelRating,   setSleepFeelRating]     = useState<number|null>(null);
  const [sleepConsistencyPts, setSleepConsistencyPts] = useState(0);
  const sleepFeelAnims = useRef([...Array(10)].map(() => new Animated.Value(1))).current;
  const [sleepManualCore,   setSleepManualCore]     = useState<string>('');
  const [sleepManualDeep,   setSleepManualDeep]     = useState<string>('');
  const [sleepManualRem,    setSleepManualRem]      = useState<string>('');

  // Style mode + faith journey
  const [styleMode, setStyleMode] = useState<'discipline' | 'balanced' | 'mindful'>('balanced');
  const [faithJourney, setFaithJourney] = useState<'rooted' | 'exploring' | 'notrightnow'>('rooted');
  const [burnAccuracyPct, setBurnAccuracyPct] = useState(100);
  const [devForceSleepManual, setDevForceSleepManual] = useState(false);

  // BMR + profile biometrics
  const [profileBmr,      setProfileBmr]      = useState(0);
  const [profileSex,      setProfileSex]      = useState<'male' | 'female' | null>(null);
  const [profileAge,      setProfileAge]      = useState<number | null>(null);
  const nowMinutes = (() => {
    const now = new Date(currentTime);
    return now.getHours() * 60 + now.getMinutes();
  })();
  const runningBmr = profileBmr > 0
    ? Math.round((profileBmr / 1440) * nowMinutes)
    : 0;

  // You vs Yesterday state
  const [ydCals,          setYdCals]          = useState<number|null>(null);
  const [ydSteps,         setYdSteps]         = useState<number|null>(null);
  const [ydSleepScore,    setYdSleepScore]    = useState<number|null>(null);
  const [ydSleepHours,    setYdSleepHours]    = useState<number|null>(null);
  const [ydWater,         setYdWater]         = useState<number|null>(null);
  const [ydActiveCalories,setYdActiveCalories]= useState<number|null>(null);
  const [vsStreak,        setVsStreak]        = useState(0);

  // Celebration state
  const [achievementStore,setAchievementStore]= useState<AchievementsStore>({});

  // Load achievements on mount
  useEffect(() => {
    loadAchievements().then(store => setAchievementStore(store));
  }, []);

  const handleAchievementUnlock = async (id: string, store: AchievementsStore) => {
    const { newlyUnlocked, updatedStore } = await checkAndUnlock(id, store);
    if (newlyUnlocked) {
      setAchievementStore(updatedStore);
      const def = ACHIEVEMENTS.find(a => a.id === id);
      showCelebration(def ? getCelebTier(def) : 'small', def?.name, def ?? undefined);
      if (def) showAchievementToast(def);
      return updatedStore;
    }
    return store;
  };

  const { activeCalories, steps, distance, sleepHours, sleepStages, sleepTimes, sleepAwakeMs, vo2Max, cardioRecovery, restingHR, respiratoryRate, bloodOxygen, bodyFatPct, exerciseMinutes, fetchTodayData } = useHealthKit();

  // ── Sleep tutorial resolver: routes sleep_card to the manual-path tutorial when
  //    no Apple Health sleep data is present, or when dev override is active. ──
  useEffect(() => {
    registerIdResolver('sleep_card', () =>
      (sleepHours && sleepHours > 0 && !devForceSleepManual) ? 'sleep_card' : 'sleep_card_manual'
    );
    return () => unregisterIdResolver('sleep_card');
  }, [sleepHours, devForceSleepManual, registerIdResolver, unregisterIdResolver]);

  // ── Meta tutorial resolver: routes to mindful variant for Mindful mode users ──
  useEffect(() => {
    registerIdResolver('meta', () => styleMode === 'mindful' ? 'meta_mindful' : 'meta');
    return () => unregisterIdResolver('meta');
  }, [styleMode, registerIdResolver, unregisterIdResolver]);

  // ── Edit Layout tutorial: opens inline (non-Modal) edit layout so
  //    TutorialOverlay can spotlight elements inside it. editSheetAnim set to 1
  //    immediately -- the overlay handles its own fade-in, no sheet animation needed.
  useEffect(() => {
    registerTutorialAction('openEditLayoutForTutorial', async () => {
      editSheetAnim.setValue(1);
      setEditTab('my');
      setEditTutorialMode(true);
      setEditModalVisible(true);
      setEditMode(true);
    });
    registerTutorialAction('switchToAddCardsForTutorial', async () => {
      setEditTab('add');
    });
    return () => {
      unregisterTutorialAction('openEditLayoutForTutorial');
      unregisterTutorialAction('switchToAddCardsForTutorial');
    };
  }, [registerTutorialAction, unregisterTutorialAction]);

  // ── When tutorial ends (done or skip), tear down inline edit layout ──
  useEffect(() => {
    if (!tutorialActiveState && editTutorialMode) {
      setEditTutorialMode(false);
      setEditMode(false);
      setEditModalVisible(false);
      setEditTab('my');
    }
  }, [tutorialActiveState]);

  const getDateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const [todayKey, setTodayKey] = useState(() => getDateKey(new Date()));
  const [todayDay, setTodayDay] = useState(() => DAY_NAMES[new Date().getDay()]);
  const rawHkCalories = activeCalories > 0 ? activeCalories : caloriesBurned;
  const hkCalories    = Math.round(rawHkCalories * burnAccuracyPct / 100);
  const displayedBurned = hkCalories;
  // On-pace target = the calories you can eat today to stay on your weekly pace.
  // = BMR + measured active burn - pace deficit (no TDEE double-count of activity),
  // floored at calTarget (TDEE - deficit) so a dead/charging watch or a non-tracker
  // never sees a too-low target. Rises above the floor only when real active burn
  // exceeds the activity TDEE already estimated. See roadmap: calorie card overhaul.
  const paceDeficit  = GOAL_DEFICITS[weightGoalPace] ?? -500;
  const onPaceTarget = Math.max(calTarget, profileBmr + hkCalories + paceDeficit);
  const calPct   = onPaceTarget > 0 ? (totalCals / onPaceTarget) * 100 : 0;
  const net = totalCals - displayedBurned - runningBmr;
  // Today's live card uses intuitive proximity coloring (how close consumed is to
  // the adjusted target), NOT the Way 1/Way 2 hit. Reason: today's net uses
  // running BMR, so a weight-loss net is already a big deficit by midday and the
  // hit rule would flash green before you've finished eating. The shared hit
  // logic stays on completed-day surfaces (streak, achievements, At-a-Glance),
  // and today is never in the streak so nothing contradicts. A smart time-aware
  // color (green early when under is fine, flag a deep deficit late in the day)
  // is the parked deep-deficit / late-day nudge feature. See roadmap.
  const calDelta = Math.abs(totalCals - onPaceTarget);
  const calColor = styleMode === 'mindful'
    ? theme.textSecondary
    : styleMode === 'discipline'
      ? calDelta <= 50  ? theme.statusGood
      : calDelta <= 149 ? theme.statusWarn
      : theme.statusBad
    : /* balanced */ calDelta <= 150 ? theme.statusGood
      : calDelta <= 300 ? theme.statusWarn
      : theme.statusBad;
  const todayProgram = PROGRAM[todayDay];
  const isLift   = todayProgram?.type === 'lift';
  const dayColor = isLift ? todayProgram.color : '#888888';
  // ── Timers ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // ── Date rollover -- AppState + midnight timer ───────────────────────────────
  useEffect(() => {
    const checkDateRollover = () => {
      const newKey = getDateKey(new Date());
      const newDay = DAY_NAMES[new Date().getDay()];
      setTodayKey(prev => {
        if (prev !== newKey) {
          setTodayDay(newDay);
          // Reset daily state
          setWater(0);
          setWeight(null);
          setDailyNote('');
          setTotalCals(0);
          setTotalProtein(0);
          setTotalCarbs(0);
          setTotalFat(0);
          setTotalFiber(0);
          setTotalSugarAlcohols(0);
          setCaloriesBurned(0);
          setSleepOverride(null);
          setSleepStoredBed(null);
          setSleepStoredWake(null);
          return newKey;
        }
        return prev;
      });
    };

    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') checkDateRollover();
    });

    // Midnight timer
    const now = new Date();
    const msUntilMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime();
    const midnightTimer = setTimeout(() => {
      checkDateRollover();
    }, msUntilMidnight);

    return () => {
      subscription.remove();
      clearTimeout(midnightTimer);
    };
  }, []);

  // ── Day Score: compute yesterday + backfill recent days, once per calendar day
  // Fires on mount and on app foreground (the real "first load after 5am" moment).
  // runDayScoreScan is self-gated, so multiple triggers are safe. The returned
  // yesterday score is stashed for the morning pop-up (step 3).
  // Yesterday's score + date for the morning Day Summary pop-up (null = hidden).
  // dayScoreDisclaimer holds the pending summary while the first-use disclaimer
  // shows; on acknowledge it hands off to daySummary.
  const [daySummary, setDaySummary] = useState<{ score: DayScore; dateKey: string } | null>(null);
  const [dayScoreDisclaimer, setDayScoreDisclaimer] = useState<{ score: DayScore; dateKey: string } | null>(null);
  const [homeTips, setHomeTips] = useState<StoredTip[]>([]);
  const [tipIndex, setTipIndex] = useState(0);
  const tipOpacity = useRef(new Animated.Value(1)).current;
  const summaryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const runScan = async () => {
      try {
        const todayKey = getDateKey(new Date());
        const score = await runDayScoreScan(todayKey, new Date().toISOString());
        if (!score) return;                       // excluded / no data: no pop-up
        // Gate: only after 5am, and at most once per calendar day.
        if (new Date().getHours() < 5) return;
        const lastShown = await AsyncStorage.getItem('pj_last_summary_shown');
        if (lastShown === todayKey) return;
        if (summaryTimerRef.current) return;      // a show is already pending
        const y = new Date(); y.setDate(y.getDate() - 1);
        const yKey = getDateKey(y);
        // Brief delay so the home screen paints first; stamp the gate only when
        // the modal actually shows (a kill during the delay won't burn the day).
        summaryTimerRef.current = setTimeout(async () => {
          summaryTimerRef.current = null;
          await storageSet('pj_last_summary_shown', todayKey);
          // First ever score: show the one-time disclaimer gate first.
          const seen = await AsyncStorage.getItem('pj_dayscore_disclaimer_seen');
          if (seen === 'true') setDaySummary({ score, dateKey: yKey });
          else setDayScoreDisclaimer({ score, dateKey: yKey });
        }, 800);
      } catch (e) { console.log('[DayScore] scan error', e); }
    };
    runScan();
    const sub = AppState.addEventListener('change', s => { if (s === 'active') runScan(); });
    return () => { sub.remove(); if (summaryTimerRef.current) clearTimeout(summaryTimerRef.current); };
  }, []);

  // ── Load Smart Tips for home card ───────────────────────────────────────────
  useFocusEffect(useCallback(() => {
    loadSmartTips().then(store => {
      const tips = store?.activeTips?.slice(0, 3) ?? [];
      setHomeTips(tips);
      // Only reset index if current index is out of bounds for the new set
      setTipIndex(i => (i >= tips.length ? 0 : i));
    }).catch(() => {});
  }, []));

  // ── Advance tip with fade animation ─────────────────────────────────────────
  const advanceTip = useCallback(() => {
    if (homeTips.length <= 1) return;
    Animated.timing(tipOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setTipIndex(i => (i + 1) % homeTips.length);
      Animated.timing(tipOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    });
  }, [homeTips.length, tipOpacity]);

  // ── Cycle tips on a timer ────────────────────────────────────────────────────
  useEffect(() => {
    if (homeTips.length <= 1) return;
    const timer = setInterval(advanceTip, 22000);
    return () => clearInterval(timer);
  }, [homeTips.length, advanceTip]);

  // ── Persist HealthKit to storage ────────────────────────────────────────────
  useEffect(() => {
    if (activeCalories > 0 || steps > 0 || sleepHours !== null || restingHR !== null || respiratoryRate !== null || bloodOxygen !== null || bodyFatPct !== null || exerciseMinutes !== null) {
      AsyncStorage.getItem(`pj_${todayKey}`).then(saved => {
        const current = saved ? JSON.parse(saved) : {};
        storageSet(`pj_${todayKey}`, JSON.stringify({
          ...current,
          ...(activeCalories > 0 ? { activeCalories } : {}),
          ...(steps > 0 ? { steps, stepGoal } : {}),
          ...(sleepHours !== null ? { sleepHours, sleepGoal } : {}),
          ...(sleepStages !== null ? { sleepStages } : {}),
          ...(sleepTimes !== null ? { sleepBedTime: sleepTimes.bed, sleepWakeTime: sleepTimes.wake } : {}),
          ...(restingHR !== null ? { restingHR } : {}),
          ...(respiratoryRate !== null ? { respiratoryRate } : {}),
          ...(bloodOxygen !== null ? { bloodOxygen } : {}),
          ...(bodyFatPct !== null ? { bodyFatPct } : {}),
          ...(exerciseMinutes !== null ? { exerciseMinutes } : {}),
        }));
      });
    }
    if (loaded) {
      if (prevStepsRef.current !== null && steps > 0 && steps >= stepGoal && stepGoal > 0 && prevStepsRef.current < stepGoal) {
        handleDailyGoalHit('steps').then(({ fired, count: hitCount }) => {
          if (fired) {
            showCelebration('small', 'STEP GOAL'); showDailyGoalToast('Step Goal', hitCount, 'footsteps', '#10b981');
            loadAchievements().then(async store => {
              let s = store;
              if (hitCount === 1)   s = await handleAchievementUnlock('steps_first', s);
              if (hitCount === 10)  s = await handleAchievementUnlock('steps_10', s);
              if (hitCount === 30)  s = await handleAchievementUnlock('steps_30', s);
              if (hitCount === 50)  s = await handleAchievementUnlock('steps_50', s);
              if (hitCount === 75)  s = await handleAchievementUnlock('steps_75', s);
              if (hitCount === 100) s = await handleAchievementUnlock('steps_100', s);
              if (hitCount === 200) s = await handleAchievementUnlock('steps_200', s);
              if (hitCount === 365) s = await handleAchievementUnlock('steps_365', s);
              setAchievementStore(s);
            });
          }
        });
      }
      prevStepsRef.current = steps;
      const adjustedActiveCals = Math.round(activeCalories * burnAccuracyPct / 100);
      const prevAdjustedActiveCals = prevActiveCalRef.current !== null ? Math.round(prevActiveCalRef.current * burnAccuracyPct / 100) : null;
      if (prevAdjustedActiveCals !== null && adjustedActiveCals > 0 && activeCalGoal > 0 && adjustedActiveCals >= activeCalGoal && prevAdjustedActiveCals < activeCalGoal) {
        handleDailyGoalHit('activeCals').then(({ fired, count: hitCount }) => {
          if (fired) { showCelebration('small', 'ACTIVE CALS'); showDailyGoalToast('Active Cal Goal', hitCount, 'flame', '#f97316'); }
        });
      }
      prevActiveCalRef.current = activeCalories;
      if (prevExerciseMinsRef.current !== null && exerciseMinutes !== null && exerciseMinsGoal > 0 && exerciseMinutes >= exerciseMinsGoal && prevExerciseMinsRef.current < exerciseMinsGoal) {
        handleDailyGoalHit('exerciseMins').then(({ fired, count: hitCount }) => {
          if (fired) { showCelebration('small', 'EXERCISE GOAL'); showDailyGoalToast('Exercise Goal', hitCount, 'bicycle', '#8b5cf6'); }
        });
      }
      prevExerciseMinsRef.current = exerciseMinutes;
      if (sleepHours !== null && prevSleepHoursRef.current === null) {
        checkSleepAchievements().then(unlocked => {
          unlocked.forEach(def => {
            showCelebration(getCelebTier(def), def.name, def);
            showAchievementToast(def);
          });
        });
      }
      prevSleepHoursRef.current = sleepHours;
    }
  }, [activeCalories, steps, sleepHours, sleepStages, restingHR, respiratoryRate, bloodOxygen, bodyFatPct, exerciseMinutes, loaded, stepGoal, activeCalGoal, exerciseMinsGoal]);

  // ── Load layout from settings ────────────────────────────────────────────────
  useEffect(() => {
    const loadLayout = async () => {
      try {
        const s = await AsyncStorage.getItem('pj_settings');
        if (s) {
          const parsed = JSON.parse(s);
          const mode = parsed.styleMode || 'balanced';
          const defaultOrder = mode === 'discipline' ? DISCIPLINE_ORDER : mode === 'mindful' ? MINDFUL_ORDER : DEFAULT_ORDER;
          const defaultVisible = mode === 'mindful' ? MINDFUL_VISIBLE : DEFAULT_VISIBLE;
          if (parsed.cardOrder && Array.isArray(parsed.cardOrder)) {
            const merged = [...parsed.cardOrder, ...defaultOrder.filter(id => !parsed.cardOrder.includes(id))];
            setCardOrder(merged);
          } else {
            setCardOrder(defaultOrder);
          }
          if (parsed.cardVisible && typeof parsed.cardVisible === 'object') {
            setCardVisible({ ...defaultVisible, ...parsed.cardVisible });
          } else {
            setCardVisible(defaultVisible);
          }
        }
      } catch (e) {
        console.log('Layout load error', e);
      }
    };
    loadLayout();
  }, []);

  // ── Net carbs setting toggle ──────────────────────────────────────────────────
  const toggleNetCarbs = async (val: boolean) => {
    setShowNetCarbs(val);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const s = await AsyncStorage.getItem('pj_settings');
      const current = s ? JSON.parse(s) : {};
      await storageSet('pj_settings', JSON.stringify({ ...current, showNetCarbs: val }));
    } catch (e) {}
  };

  // ── Save layout ──────────────────────────────────────────────────────────────
  const saveLayout = async (order: CardId[], visible: Record<CardId, boolean>) => {
    try {
      const s = await AsyncStorage.getItem('pj_settings');
      const current = s ? JSON.parse(s) : {};
      await storageSet('pj_settings', JSON.stringify({ ...current, cardOrder: order, cardVisible: visible }));
    } catch (e) {
      console.log('Layout save error', e);
    }
  };

  const toggleCardVisible = (id: CardId) => {
    const updated = { ...cardVisible, [id]: !cardVisible[id] };
    setCardVisible(updated);
    saveLayout(cardOrder, updated);
  };

  // ── Load daily data ──────────────────────────────────────────────────────────
  useEffect(() => {
    const loadData = async () => {
      try {
        const saved = await AsyncStorage.getItem(`pj_${todayKey}`);
        if (saved) {
          const data = JSON.parse(saved);
          if (typeof data.water === 'number') { setWater(Math.max(0, data.water)); waterLoaded.current = true; }
          if (Array.isArray(data.waterEntries)) setWaterEntries(data.waterEntries);
          if (data.weight)        setWeight(data.weight);
          if ('dailyNote' in data) { setDailyNote(data.dailyNote ?? ''); setSavedDailyNoteText(data.dailyNote ?? ''); }
          const yesterday = new Date(); yesterday.setDate(yesterday.getDate()-1);
          const yk = `${yesterday.getFullYear()}-${String(yesterday.getMonth()+1).padStart(2,'0')}-${String(yesterday.getDate()).padStart(2,'0')}`;
          const yd = await AsyncStorage.getItem(`pj_${yk}`);
          if (yd) { const ydp = JSON.parse(yd); if (ydp.weight) setYesterdayWeight(ydp.weight); }
          for (let i = 1; i <= 30; i++) {
            const d = new Date(); d.setDate(d.getDate()-i);
            const dk = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
            const ld = await AsyncStorage.getItem(`pj_${dk}`);
            if (ld) { const ldp = JSON.parse(ld); if (ldp.weight) { setLastKnownWeight({ val: ldp.weight, daysAgo: i }); break; } }
          }
          for (let i = 365; i >= 1; i--) {
            const d = new Date(); d.setDate(d.getDate()-i);
            const dk = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
            const ed = await AsyncStorage.getItem(`pj_${dk}`);
            if (ed) { const edp = JSON.parse(ed); if (edp.weight) { setEarliestWeight(edp.weight); break; } }
          }
        } else {
          const cloudData = await loadFromFirebase(todayKey);
          if (cloudData) {
            if (typeof cloudData.water === 'number') setWater(Math.max(0, cloudData.water));
            if (cloudData.weight)   setWeight(cloudData.weight);
            if ('dailyNote' in cloudData) { setDailyNote(cloudData.dailyNote ?? ''); setSavedDailyNoteText(cloudData.dailyNote ?? ''); }
            await storageSet(`pj_${todayKey}`, JSON.stringify(cloudData));
          }
        }
      } catch (e) {
        console.log('Load error', e);
      } finally {
        setLoaded(true);
        try {
          const todayStr = todayKey;
          const resolved = await resolveDailyVerse(todayStr);
          setDailyVerse(resolved);
          setRefreshKey(k => k + 1);
        } catch {
          // Corrupted or stale rotation data -- nuke and fall back to random
          await AsyncStorage.removeItem('pj_verse_rotation');
          setDailyVerse(VERSES[Math.floor(Math.random() * VERSES.length)]);
        }
      }
    };
    loadData();
  }, []);

  // ── Meta-tutorial: fires once on first real home focus ───────────────────────
  // Checks both 'meta' and 'meta_mindful' so Mindful users who completed meta_mindful
  // are not re-prompted after the id resolver routes 'meta' to 'meta_mindful'.
  // useFocusEffect cleanup cancels the timer if auth/onboarding redirects away before
  // 1500ms -- prevents the tutorial firing on the sign-in or onboarding screens.
  // metaTutorialFiredRef gates re-runs after the tutorial has actually been confirmed
  // seen or launched, but stays false if the timer was cancelled mid-redirect so the
  // next real focus (user landing on home after onboarding) tries again.
  const metaTutorialFiredRef = useRef(false);
  useFocusEffect(useCallback(() => {
    if (metaTutorialFiredRef.current) return;
    let timerId: ReturnType<typeof setTimeout>;
    Promise.all([isTutorialSeen('meta'), isTutorialSeen('meta_mindful')]).then(([metaSeen, mindfulSeen]) => {
      if (metaSeen || mindfulSeen) { metaTutorialFiredRef.current = true; return; }
      timerId = setTimeout(() => { metaTutorialFiredRef.current = true; startTutorial('meta'); }, 1500);
    });
    return () => clearTimeout(timerId);
  }, []));

  // ── Auto-save daily ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!loaded) return;
    const save = async () => {
      try {
        const existing = await AsyncStorage.getItem(`pj_${todayKey}`);
        const current  = existing ? JSON.parse(existing) : {};
        await storageSet(`pj_${todayKey}`, JSON.stringify({
          ...current, dailyNote, weight, water, waterEntries,
        }));
      } catch (e) { console.log('Save error', e); }
    };
    save();
  }, [water, waterEntries, weight, dailyNote, loaded]);

  // ── Focus sync ───────────────────────────────────────────────────────────────
  useFocusEffect(useCallback(() => {
    const loadCals = async () => {
      try {
        const settingsRawEarly = await AsyncStorage.getItem('pj_settings');
        const localAccuracyPct: number = settingsRawEarly
          ? (JSON.parse(settingsRawEarly).burnAccuracyPct ?? 100)
          : burnAccuracyPct;
        const saved = await AsyncStorage.getItem(`pj_${getDateKey(new Date())}`);
        if (saved) {
          const data = JSON.parse(saved);
          if (data.entries && Array.isArray(data.entries)) {
            const clean = data.entries.filter((e: any) => e != null);
            if (clean.length !== data.entries.length) {
              storageSet(`pj_${getDateKey(new Date())}`, JSON.stringify({ ...data, entries: clean }));
            }
            setTotalCals(clean.reduce((s: number, e: any) => s + (e.cal || 0), 0));
            setTotalProtein(Math.round(clean.reduce((s: number, e: any) => s + (e.protein||0), 0) * 10) / 10);
            setTotalCarbs(  Math.round(clean.reduce((s: number, e: any) => s + (e.carbs  ||0), 0) * 10) / 10);
            setTotalFat(    Math.round(clean.reduce((s: number, e: any) => s + (e.fat    ||0), 0) * 10) / 10);
            setTotalFiber(  Math.round(clean.reduce((s: number, e: any) => {
              const n = e.foodNutrients?.find((fn: any) => fn.nutrientName === 'Fiber, total dietary');
              if (!n) return s;
              const scale = e.fsId
                ? ((e.calPer100g && e.calPer100g > 0) ? (e.cal / e.calPer100g) : 0)
                : (() => { const sc = e.servingGrams && (e.calPer100g ?? 0) > 0 ? (e.calPer100g ?? 0) * e.servingGrams / 100 : 0; return sc > 0 ? e.cal / sc : 0; })();
              return s + (n.value || 0) * scale;
            }, 0) * 10) / 10);
            setTotalSugarAlcohols(Math.round(clean.reduce((s: number, e: any) => {
              const n = e.foodNutrients?.find((fn: any) => fn.nutrientName === 'Sugar Alcohols');
              if (!n) return s;
              const scale = e.fsId
                ? ((e.calPer100g && e.calPer100g > 0) ? (e.cal / e.calPer100g) : 0)
                : (() => { const sc = e.servingGrams && (e.calPer100g ?? 0) > 0 ? (e.calPer100g ?? 0) * e.servingGrams / 100 : 0; return sc > 0 ? e.cal / sc : 0; })();
              return s + (n.value || 0) * scale;
            }, 0) * 10) / 10);
          }
          setCaloriesBurned(parseInt(data.caloriesBurned)||0);
          if (data.sleepOverride) setSleepOverride(data.sleepOverride);
          if (data.sleepBedTime) {
            setSleepStoredBed(data.sleepBedTime);
            calcBedtimeConsistencyPts(data.sleepBedTime, todayKey).then(async (pts) => {
              setSleepConsistencyPts(pts);
              if (pts !== (data.sleepConsistencyPts ?? -1)) {
                const raw = await AsyncStorage.getItem(`pj_${todayKey}`);
                const cur = raw ? JSON.parse(raw) : {};
                await storageSet(`pj_${todayKey}`, JSON.stringify({ ...cur, sleepConsistencyPts: pts }));
              }
            });
          }
          if (data.sleepWakeTime) setSleepStoredWake(data.sleepWakeTime);
          if (data.sleepFeelRating) setSleepFeelRating(data.sleepFeelRating);
          if (data.sleepManualCore) setSleepManualCore(String(data.sleepManualCore));
          if (data.sleepManualDeep) setSleepManualDeep(String(data.sleepManualDeep));
          if (data.sleepManualRem)  setSleepManualRem(String(data.sleepManualRem));
          if (typeof data.water === 'number') { setWater(Math.max(0, data.water)); waterLoaded.current = true; }
          if (Array.isArray(data.waterEntries)) setWaterEntries(data.waterEntries);
          if (data.weight) setWeight(data.weight);
          if ('dailyNote' in data) { setDailyNote(data.dailyNote ?? ''); setSavedDailyNoteText(data.dailyNote ?? ''); }
        }
        // Weight comparison loading
        const yesterday = new Date(); yesterday.setDate(yesterday.getDate()-1);
        const yk = `${yesterday.getFullYear()}-${String(yesterday.getMonth()+1).padStart(2,'0')}-${String(yesterday.getDate()).padStart(2,'0')}`;
        const yd = await AsyncStorage.getItem(`pj_${yk}`);
        if (yd) { const ydp = JSON.parse(yd); if (ydp.weight) setYesterdayWeight(ydp.weight); else setYesterdayWeight(null); }
        for (let i = 365; i >= 1; i--) {
          const d = new Date(); d.setDate(d.getDate()-i);
          const dk = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
          const ed = await AsyncStorage.getItem(`pj_${dk}`);
          if (ed) { const edp = JSON.parse(ed); if (edp.weight) { setEarliestWeight(edp.weight); break; } }
        }
        for (let i = 1; i <= 30; i++) {
          const d = new Date(); d.setDate(d.getDate()-i);
          const dk = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
          const ld = await AsyncStorage.getItem(`pj_${dk}`);
          if (ld) { const ldp = JSON.parse(ld); if (ldp.weight) { setLastKnownWeight({ val: ldp.weight, daysAgo: i }); break; } }
        }
        // Load yesterday's metrics for You vs Yesterday card
        const ydRaw = await AsyncStorage.getItem(`pj_${yk}`);
        if (ydRaw) {
          const yd2 = JSON.parse(ydRaw);
          // Yesterday calories
          if (yd2.entries && Array.isArray(yd2.entries)) {
            const ydClean = yd2.entries.filter((e: any) => e != null);
            const ydConsumed = ydClean.reduce((s: number, e: any) => s + (e.cal || 0), 0);
            const ydBurned = Math.round((yd2.activeCalories || yd2.caloriesBurned || 0) * localAccuracyPct / 100);
            const profileRaw2 = await AsyncStorage.getItem('pj_profile');
            let ydBmr = 0;
            if (profileRaw2) {
              const p2 = JSON.parse(profileRaw2);
              let w: number | null = null;
              for (let i = 0; i <= 30; i++) {
                const dd = new Date(); dd.setDate(dd.getDate() - i);
                const dk = `${dd.getFullYear()}-${String(dd.getMonth()+1).padStart(2,'0')}-${String(dd.getDate()).padStart(2,'0')}`;
                const ld = await AsyncStorage.getItem(`pj_${dk}`);
                if (ld) { const ldp = JSON.parse(ld); if (ldp.weight) { w = ldp.weight; break; } }
              }
              if (w && p2.birthday && p2.heightFt && p2.heightIn) {
                const wKg = w * 0.453592;
                const hCm = (parseFloat(p2.heightFt) * 30.48) + (parseFloat(p2.heightIn) * 2.54);
                const age = Math.floor((Date.now() - new Date(p2.birthday).getTime()) / (365.25 * 24 * 3600 * 1000));
                ydBmr = p2.sex === 'male' ? Math.round((10*wKg)+(6.25*hCm)-(5*age)+5) : Math.round((10*wKg)+(6.25*hCm)-(5*age)-161);
              }
            }
            if (ydConsumed > 0) setYdCals(ydConsumed - ydBurned - ydBmr);
            else setYdCals(null);
          }
          // Yesterday steps
          if (yd2.steps) setYdSteps(yd2.steps);
          // Yesterday water
          if (typeof yd2.water === 'number') setYdWater(yd2.water);
          // Yesterday active calories
          if (yd2.activeCalories) setYdActiveCalories(Math.round(yd2.activeCalories * localAccuracyPct / 100));
          // Yesterday sleep score
          if (yd2.sleepOverride || yd2.sleepHours) {
            const ydHours = yd2.sleepOverride || yd2.sleepHours;
            setYdSleepHours(ydHours);
            const ydStages = yd2.sleepStages || null;
            const ydFeel = yd2.sleepFeelRating ?? null;
            const ydIsManual = !!yd2.sleepOverride;
            const ydConsistencyPts = yd2.sleepConsistencyPts ?? 0;
            const { score: ydScore, path: ydPath } = calcSleepScore(ydHours, ydStages, sleepGoal, ydFeel, ydIsManual, ydConsistencyPts);
            if (ydPath === 1 || ydFeel) setYdSleepScore(ydScore);
            else setYdSleepScore(null);
          }
        }

        // Load vs streak
        const streakRaw = await AsyncStorage.getItem('pj_vs_streak');
        if (streakRaw) {
          const streakData = JSON.parse(streakRaw);
          setVsStreak(streakData.streak || 0);
        }

        const workoutData = await AsyncStorage.getItem('pj_workout_state');
        if (workoutData) {
          const wd = JSON.parse(workoutData);
          if (wd.programs) setWorkoutPrograms(wd.programs);
          if (wd.checks) setWorkoutChecks(wd.checks);
          if (wd.weeklyTemplate) setWorkoutTemplate(wd.weeklyTemplate);
        }
        const settingsData = await AsyncStorage.getItem('pj_settings');
        if (settingsData) {
          const sd = JSON.parse(settingsData);
          if (sd.workoutTags && Array.isArray(sd.workoutTags)) setWorkoutTags(sd.workoutTags);
          if (sd.styleMode) setStyleMode(sd.styleMode);
          if (sd.faithJourney) setFaithJourney(sd.faithJourney);
          if (sd.burnAccuracyPct !== undefined) setBurnAccuracyPct(sd.burnAccuracyPct);
          if (sd.devForceSleepManual !== undefined) setDevForceSleepManual(sd.devForceSleepManual);
          if (sd.showNetCarbs !== undefined) setShowNetCarbs(sd.showNetCarbs);
        }

        // Onboarding -- open Edit Layout sheet if flagged from Screen 7
        const openEditFlag = await AsyncStorage.getItem('pj_open_edit_layout');
        if (openEditFlag === 'true') {
          await AsyncStorage.removeItem('pj_open_edit_layout');
          setEditModalVisible(true);
        }
        const profileData = await AsyncStorage.getItem('pj_profile');
        if (profileData) {
          const p = JSON.parse(profileData);
          if (p.waterPresets)                    setWaterPresets(p.waterPresets);
          if (p.stepGoal && parseInt(p.stepGoal) > 0) setStepGoal(parseInt(p.stepGoal));
          if (p.sleepGoal && parseFloat(p.sleepGoal) > 0) setSleepGoal(parseFloat(p.sleepGoal));
          if (p.waterGoal && parseInt(p.waterGoal) > 0) setWaterGoal(parseInt(p.waterGoal));
          if (p.activeCalGoal && parseInt(p.activeCalGoal) > 0) setActiveCalGoal(parseInt(p.activeCalGoal));
          if (p.exerciseMinsGoal && parseInt(p.exerciseMinsGoal) > 0) setExerciseMinsGoal(parseInt(p.exerciseMinsGoal));
          if (p.goalWeight && parseFloat(p.goalWeight) > 0) setGoalWeight(parseFloat(p.goalWeight));
          if (p.weightGoal) setWeightGoalPace(p.weightGoal);

          // Load macro goals
          const kcalTarget = parseInt(p.calTarget) || 0;
          if (p.macroMode === 'fixed' && p.macroProteinG && p.macroCarbsG && p.macroFatG) {
            setMacroGoals({
              protein: parseFloat(p.macroProteinG) || 0,
              carbs:   parseFloat(p.macroCarbsG)   || 0,
              fat:     parseFloat(p.macroFatG)      || 0,
            });
          } else if (p.macroProteinPct && p.macroCarbsPct && p.macroFatPct && kcalTarget > 0) {
            setMacroGoals({
              protein: Math.round(((parseFloat(p.macroProteinPct) || 35) / 100) * kcalTarget / 4),
              carbs:   Math.round(((parseFloat(p.macroCarbsPct)   || 40) / 100) * kcalTarget / 4),
              fat:     Math.round(((parseFloat(p.macroFatPct)     || 25) / 100) * kcalTarget / 9),
            });
          } else if (kcalTarget > 0) {
            // Fallback - derive from calTarget using default 35/40/25 split
            setMacroGoals({
              protein: Math.round((0.35 * kcalTarget) / 4),
              carbs:   Math.round((0.40 * kcalTarget) / 4),
              fat:     Math.round((0.25 * kcalTarget) / 9),
            });
          }

          if (p.sex) setProfileSex(p.sex === 'male' ? 'male' : 'female');
          if (p.birthday) {
            const parts = p.birthday.split('-');
            setProfileAge(Math.floor((Date.now() - new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2])).getTime()) / (365.25*24*3600*1000)));
          }
          // Calorie target + BMR via the shared helper: honors the recommended/manual
          // toggle and always computes BMR for live net. Same call log uses, so the two match.
          const targets = await loadCalorieTargets(todayKey);
          setProfileBmr(targets.bmr);
          setCalTarget(targets.calTarget);
        }
        // Momentum achievement check -- consecutive logging days
        const momentumUnlocked = await checkMomentumAchievements();
        momentumUnlocked.forEach(def => {
          showCelebration(getCelebTier(def), def.name, def);
          showAchievementToast(def);
        });
      } catch (e) { console.log('Cal sync error', e); }
    };
    loadCals();
    loadAchievements().then(store => setAchievementStore(store));
    AsyncStorage.getItem('pj_stats_cards').then(raw => {
      const cards: StatsCard[] = raw ? JSON.parse(raw) : DEFAULT_STATS_CARDS;
      setAllStatsCards(cards);
      loadPinnedTrendData(cards);
    }).catch(() => {});
  }, []));

  // ── Weight log ───────────────────────────────────────────────────────────────
  const logWeight = async () => {
    const val = parseFloat(weightInput);
    if (!val || val <= 0) return;
    setWeight(val);
    setWeightInput('');
    saveToFirebase(todayKey, 'weight', val);
    try {
      const existing = await AsyncStorage.getItem(`pj_${todayKey}`);
      const current = existing ? JSON.parse(existing) : {};
      await storageSet(`pj_${todayKey}`, JSON.stringify({ ...current, weight: val }));
    } catch (e) { console.log('Weight save error', e); }

    showToast('Weight saved', undefined, 'success');

    // Achievement checks
    const lastKnown = lastKnownWeight?.val ?? null;
    if (!weightEntryIsPlausible(val, lastKnown)) return;

    let store = achievementStore;

    // First weigh-in ever
    if (!store['weight_first']) {
      const { newlyUnlocked, updatedStore } = await checkAndUnlock('weight_first', store);
      if (newlyUnlocked) {
        store = updatedStore;
        setAchievementStore(store);
        const firstDef = ACHIEVEMENTS.find(a => a.id === 'weight_first');
        if (firstDef) showAchievementToast(firstDef);
      }
    }

    // 5lb increment milestones
    if (earliestWeight) {
      const crossed = getWeightMilestonesCrossed(earliestWeight, val, goalWeight ?? 0, store);
      if (crossed.length > 0) {
        // Celebrate highest only, silently unlock the rest
        const { newlyUnlocked, updatedStore } = await checkAndUnlock(crossed[0], store);
        if (newlyUnlocked) {
          store = updatedStore;
          setAchievementStore(store);
          const def = ACHIEVEMENTS.find(a => a.id === crossed[0]);
          showCelebration(def ? getCelebTier(def) : 'medium', def?.name, def ?? undefined);
        }
        // Silently unlock remaining
        for (let i = 1; i < crossed.length; i++) {
          const { updatedStore: s } = await checkAndUnlock(crossed[i], store);
          store = s;
        }
        setAchievementStore(store);
      }
    }

    // Goal weight hit
    if (goalWeight && isGoalWeightHit(val, goalWeight, earliestWeight ?? 0, store)) {
      const { newlyUnlocked, updatedStore } = await checkAndUnlock('weight_goal', store);
      if (newlyUnlocked) {
        store = updatedStore;
        setAchievementStore(store);
        const isFirstEarn = updatedStore['weight_goal'].count === 1;
        const weightGoalDef = ACHIEVEMENTS.find(a => a.id === 'weight_goal');
        showCelebration(isFirstEarn ? 'diamond' : 'large', weightGoalDef?.name ?? 'GOAL WEIGHT', isFirstEarn ? weightGoalDef : undefined);
      }
    }
  };

  // ── Edit mode ────────────────────────────────────────────────────────────────
  const enterEditMode = () => {
    editSheetAnim.setValue(0);
    setEditTab('my');
    setEditModalVisible(true);
    setEditMode(true);
  };

  const exitEditMode = () => {
    Animated.timing(editSheetAnim, {
      toValue: 0,
      duration: 180,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(() => {
      setEditMode(false);
      setTimeout(() => setEditModalVisible(false), 100);
    });
  };

  const pinGraphCard = async (card: StatsCard) => {
    const updated = allStatsCards.map(c => c.id === card.id ? { ...c, placement: 'both' as const } : c);
    setAllStatsCards(updated);
    await storageSet('pj_stats_cards', JSON.stringify(updated));
    await loadPinnedTrendData(updated);
    setEditTab('my');
  };

  const unpinGraphCard = async (cardId: string) => {
    const updated = allStatsCards.map(c => c.id === cardId ? { ...c, placement: 'stats' as const } : c);
    setAllStatsCards(updated);
    await storageSet('pj_stats_cards', JSON.stringify(updated));
    setPinnedTrendData(prev => { const next = { ...prev }; delete next[cardId]; return next; });
  };

  const handlePinnedCardPeriodChange = async (cardId: string, period: CardPeriod) => {
    const updated = allStatsCards.map(c => c.id === cardId ? { ...c, period } : c);
    setAllStatsCards(updated);
    await storageSet('pj_stats_cards', JSON.stringify(updated));
    await loadPinnedTrendData(updated);
  };

  const handleHomeCardSave = async (updated: StatsCard) => {
    const newCards = allStatsCards.map(c => c.id === updated.id ? updated : c);
    setAllStatsCards(newCards);
    await saveStatsCards(newCards);
    await loadPinnedTrendData(newCards);
  };

  const handleHomeCardDelete = async (cardId: string) => {
    const newCards = allStatsCards.filter(c => c.id !== cardId);
    setAllStatsCards(newCards);
    await saveStatsCards(newCards);
    setPinnedTrendData(prev => { const next = { ...prev }; delete next[cardId]; return next; });
  };

  const loadPinnedTrendData = async (cards: StatsCard[]) => {
    const pinned = cards.filter(c => c.type === 'graph' && c.placement === 'both');
    if (pinned.length === 0) { setPinnedTrendData({}); return; }
    let workoutState: any = {};
    try { const ws = await AsyncStorage.getItem('pj_workout_state'); if (ws) workoutState = JSON.parse(ws); } catch {}
    const uniquePeriods = [...new Set(pinned.map(c => c.period))];
    const byPeriod: Record<number, TrendData> = {};
    await Promise.all(uniquePeriods.map(async p => { byPeriod[p] = await fetchTrendData(p, workoutState); }));
    const map: Record<string, TrendData> = {};
    for (const c of pinned) map[c.id] = byPeriod[c.period] ?? EMPTY_TREND_DATA;
    setPinnedTrendData(map);
  };

  // ─── Card Renderers ───────────────────────────────────────────────────────────
  const renderCaloriesCard = () => {
    const remaining = onPaceTarget - totalCals;
    const stats = [
      { label: remaining >= 0 ? 'REMAINING' : 'OVER', value: Math.abs(remaining), color: remaining >= 0 ? theme.textSecondary : theme.statusBad },
      { label: 'ACTIVE', value: displayedBurned, color: theme.textSecondary },
      // Net needs BMR. With no resolvable weight (BMR 0), net would be overstated by
      // the whole missing BMR, so show a dash + hint instead of a wrong number.
      { label: 'LIVE NET', value: profileBmr > 0 ? `${net > 0 ? '+' : ''}${Math.round(net)}` : '—', color: theme.textSecondary },
    ];

    // Mindful: check if it's after 8pm for potential nudge
    const nowHour = new Date(currentTime).getHours();
    const showMindfulNudge = styleMode === 'mindful' && nowHour >= 20 && totalCals > 0;
    const MINDFUL_NUDGES = [
      "You showed up today.",
      "Every day you log is a win.",
      "You're doing great. Keep going.",
      "Progress isn't always a number.",
    ];
    const nudgeText = MINDFUL_NUDGES[new Date().getDate() % MINDFUL_NUDGES.length];

    return (
      <View ref={calCardRef} collapsable={false} style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: theme.accentBlueRaw, borderTopWidth: 1.5, overflow: 'hidden' }]}>
        <Ionicons name="flame" size={130} color={theme.accentBlueRaw} style={{ position: 'absolute', right: -24, bottom: -28, opacity: 0.10 }} />
        <View style={{ flexDirection:'row', alignItems:'flex-start', justifyContent:'space-between', marginBottom:4 }}>
          <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
            <Ionicons name="flame-outline" size={11} color={theme.textMuted} />
            <Text style={[styles.cardLabel, { marginBottom:0, color: theme.textMuted }]}>Calories Today</Text>
            {styleMode !== 'mindful' && <TooltipIcon tooltipKey="calories_today" />}
          </View>
          <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/(tabs)/log'); }} activeOpacity={0.6}
            style={{ backgroundColor: theme.accentBlueBg, borderWidth:1, borderColor: theme.accentBlueBorder, borderRadius:6, paddingHorizontal:10, paddingVertical:4 }}>
            <Text style={{ color: theme.accentBlue, fontSize:12, fontFamily:'DMSans_600SemiBold' }}>+ Log</Text>
          </TouchableOpacity>
        </View>

        {/* Big number row */}
        <View style={styles.calRow}>
          <View style={{ shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 0 }}>
            <Text style={[styles.calNumber, { color: styleMode === 'mindful' ? theme.textSecondary : calColor, opacity: 0.88 }]}>{totalCals}</Text>
          </View>
          <Text style={[styles.calTarget, { color: theme.textSecondary }]}>/ {styleMode === 'mindful' ? calTarget : onPaceTarget} kcal</Text>
        </View>

        {/* Progress bar -- neutral color in Mindful */}
        <AnimatedProgressBar
          pct={styleMode === 'mindful' ? Math.min((totalCals / calTarget) * 100, 100) : calPct}
          color={styleMode === 'mindful' ? theme.accentBlue : calColor}
          trackColor={theme.bgProgressTrack}
          refreshKey={refreshKey}
          ready={calTarget > 0}
        />

        {/* Stat row -- hidden in Mindful */}
        {styleMode !== 'mindful' && (
          <View style={{ borderTopWidth: 0.5, borderTopColor: theme.borderCardTop, paddingTop:10, flexDirection:'row', marginTop:10 }}>
            {stats.map((s, i) => {
              const statRef = [calRemainingRef, calActiveRef, calNetRef][i];
              return (
                <View key={i} ref={statRef} collapsable={false} style={{ flex:1, alignItems: i === 1 ? 'center' : i === 2 ? 'flex-end' : 'flex-start' }}>
                  <Text style={{ fontSize:9, color: theme.textMuted, fontFamily:'DMSans_700Bold', letterSpacing:1.5, textTransform:'uppercase', marginBottom:2 }}>{s.label}</Text>
                  <View style={{ flexDirection:'row', alignItems:'baseline', gap:2 }}>
                    <Text style={{ fontSize:18, color: s.color, fontFamily:'BebasNeue_400Regular', letterSpacing:1 }}>{s.value}</Text>
                    <Text style={{ fontSize:9, color: theme.textMuted, fontFamily:'DMSans_700Bold', letterSpacing:1 }}>kcal</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        

        {/* No BMR (no resolvable weight): explain the dashed net, point to the fix. */}
        {styleMode !== 'mindful' && profileBmr === 0 && (
          <Text style={{ fontSize:11, color: theme.textMuted, fontFamily:'DMSans_400Regular', fontStyle:'italic', marginTop:6 }}>
            Log your weight to see your calorie net.
          </Text>
        )}

        {/* Mindful evening nudge */}
        {showMindfulNudge && (
          <Text style={{ fontSize:11, color: theme.textMuted, fontFamily:'DMSans_400Regular', fontStyle:'italic', marginTop:6 }}>
            {nudgeText}
          </Text>
        )}
      </View>
    );
  };

  const renderMacrosCard = () => {
    const netCarbs = Math.max(0, Math.round((totalCarbs - totalFiber - totalSugarAlcohols) * 10) / 10);
    const macros = [
      { label: 'Protein',                            val: totalProtein,              goal: macroGoals.protein, color: theme.macroProtein },
      { label: showNetCarbs ? 'Net Carbs' : 'Carbs', val: showNetCarbs ? netCarbs : totalCarbs, goal: macroGoals.carbs, color: theme.macroCarbs },
      { label: 'Fat',                                val: totalFat,                  goal: macroGoals.fat,     color: theme.macroFat },
    ];
    return (
      <View ref={macrosCardRef} collapsable={false} style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: theme.accentBlueRaw, overflow: 'hidden' }]}>
        <Ionicons name="nutrition" size={130} color={theme.accentBlueRaw} style={{ position: 'absolute', right: -24, bottom: -28, opacity: 0.10 }} />
        <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
            <Ionicons name="pie-chart-outline" size={11} color={theme.textMuted} />
            <Text style={[styles.cardLabel, { marginBottom:0, color: theme.textMuted }]}>Macros Today</Text>
            <TooltipIcon tooltipKey="macros_today" />
          </View>
          <View style={{ flexDirection:'row', alignItems:'center', gap:10 }}>
            <Text style={{ fontSize:9, color: theme.textDim, fontFamily:'DMSans_700Bold', letterSpacing:1.5, textTransform:'uppercase' }}>vs goal</Text>
            <TouchableOpacity onPress={() => setShowMacroGearSheet(true)} hitSlop={{ top:8, bottom:8, left:8, right:8 }}>
              <Ionicons name="settings" size={16} color={theme.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={{ gap:7 }}>
          {macros.map((m, i) => {
            const pct = m.goal > 0 ? Math.min((m.val / m.goal) * 100, 100) : 0;
            const over = false; // macro over-threshold color removed -- always use identity colors
            const macroRef = [macrosProteinRef, macroCarbsRef, macroFatRef][i];
            return (
              <View key={m.label} ref={macroRef} collapsable={false}>
                <View style={{ flexDirection:'row', alignItems:'baseline', justifyContent:'space-between', marginBottom:4 }}>
                  <Text style={{ fontSize:11, color: theme.textMuted, fontFamily:'DMSans_700Bold', letterSpacing:2, textTransform:'uppercase', flex:1 }}>{m.label}</Text>
                  <View style={{ flexDirection:'row', alignItems:'baseline', gap:4, width:120, justifyContent:'flex-end' }}>
                    <Text style={{ fontSize:20, color: over ? theme.macroOver : m.color, fontFamily:'BebasNeue_400Regular', letterSpacing:1, textAlign:'right' }}>{m.val}</Text>
                    <Text style={{ fontSize:11, color: over ? theme.macroOver : m.color, fontFamily:'DMSans_500Medium' }}>g</Text>
                    <Text style={{ fontSize:11, color: theme.textDim, fontFamily:'DMSans_500Medium' }}>/ {m.goal} g</Text>
                  </View>
                </View>
                <MacroBar val={m.val} goal={m.goal} color={over ? theme.macroOver : m.color} trackColor={theme.bgProgressTrack} refreshKey={refreshKey} />
                <Text style={{ fontSize:9, color: m.color, fontFamily:'DMSans_500Medium', letterSpacing:0.5, marginTop:3, opacity:0.7 }}>
                  {m.val > m.goal
                    ? `${Math.round(m.val - m.goal)} g over`
                    : `${Math.round(m.goal - m.val)} g remaining`}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderWaterCard = () => (
    <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: theme.accentBlueRaw, overflow: 'hidden' }]}>
        <Ionicons name="water" size={130} color={theme.accentBlueRaw} style={{ position: 'absolute', right: -24, bottom: -28, opacity: 0.10 }} />
      <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
        <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
          <Ionicons name="water-outline" size={11} color={theme.textMuted} />
          <Text style={[styles.cardLabel, { marginBottom:0, color: theme.textMuted }]}>
            {'Water · '}
            <Text style={{ textTransform: 'none' }}>{water}oz / {waterGoal}oz</Text>
          </Text>
        </View>
        <TouchableOpacity onPress={openWaterDetailModal} hitSlop={{ top:8, bottom:8, left:8, right:8 }}>
          <Ionicons name="settings" size={16} color={theme.textMuted} />
        </TouchableOpacity>
      </View>
      <AnimatedProgressBar pct={Math.min(100,(water/waterGoal)*100)} color={theme.accentBlue} trackColor={theme.bgProgressTrack} refreshKey={refreshKey} overGoal={water > waterGoal} />
      <View style={styles.waterBtns}>
        {waterPresets.map((oz,i) => (
          <PressableButton key={i} style={[styles.waterBtn, { backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder }]} onPress={() => doWaterUpdate(oz)}>
            <Text style={[styles.waterBtnText, { color: theme.accentBlue }]}>+{oz} oz</Text>
          </PressableButton>
        ))}
        <PressableButton style={[styles.waterBtn, { backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder }]} onPress={() => openWaterCustomModal('add')}>
          <View style={{ alignItems:'center', justifyContent:'center', width:20, height:20 }}>
            <Ionicons name="water-outline" size={18} color={theme.accentBlue} />
            <Text style={{ color: theme.accentBlue, fontSize:9, fontFamily:'DMSans_700Bold', position:'absolute', bottom:-2, right:-4 }}>+</Text>
          </View>
        </PressableButton>
      </View>
      <View style={[styles.waterBtns, { marginTop:8 }]}>
        {waterPresets.map((oz,i) => (
          <PressableButton key={i} style={[styles.waterBtnRed, { backgroundColor: theme.accentRedBg, borderColor: theme.accentRedBorder }]} onPress={() => doWaterUpdate(-oz)}>
            <Text style={[styles.waterBtnRedText, { color: theme.accentRed }]}>-{oz} oz</Text>
          </PressableButton>
        ))}
        <PressableButton style={[styles.waterBtnRed, { backgroundColor: theme.accentRedBg, borderColor: theme.accentRedBorder }]} onPress={() => openWaterCustomModal('subtract')}>
          <View style={{ alignItems:'center', justifyContent:'center', width:20, height:20 }}>
            <Ionicons name="water-outline" size={18} color={theme.accentRed} />
            <Text style={{ color: theme.accentRed, fontSize:9, fontFamily:'DMSans_700Bold', position:'absolute', bottom:-2, right:-4 }}>-</Text>
          </View>
        </PressableButton>
      </View>
    </View>
  );

  const renderWeightCard = () => (
    <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: theme.accentBlueRaw, borderTopWidth: 1.5, overflow: 'hidden' }]}>
        <Ionicons name="body" size={130} color={theme.accentBlueRaw} style={{ position: 'absolute', right: -24, bottom: -28, opacity: 0.10 }} />
      <View style={{ flexDirection:'row', alignItems:'center', gap:6, marginBottom:10 }}>
        <Ionicons name="trending-down-outline" size={11} color={theme.textMuted} />
        <Text style={[styles.cardLabel, { marginBottom:0, color: theme.textMuted }]}>Weight</Text>
      </View>
      <View style={styles.weightRow}>
        <View style={styles.weightStat}>
          <Text style={[styles.weightVal, { color: styleMode === 'mindful' ? theme.textSecondary : weight ? theme.accentBlue : theme.textDim }]}>
            {weight ? `${weight} lbs` : lastKnownWeight ? `${lastKnownWeight.val} lbs` : '--'}
          </Text>
          <Text style={[styles.weightLbl, { color: theme.textMuted }]}>
            {weight ? 'Today' : lastKnownWeight ? `${lastKnownWeight.daysAgo}d ago` : 'Today'}
          </Text>
        </View>
        <View style={styles.weightStat}>
          <Text style={[styles.weightVal, { color: styleMode === 'mindful' ? theme.textSecondary : weight&&yesterdayWeight ? weight<yesterdayWeight ? theme.statusGood : weight>yesterdayWeight ? theme.statusBad : theme.textPrimary : theme.accentBlue }]}>
            {weight&&yesterdayWeight ? `${weight>yesterdayWeight?'+':''}${Math.round((weight-yesterdayWeight)*10)/10} lbs` : '--'}
          </Text>
          <Text style={[styles.weightLbl, { color: theme.textMuted }]}>vs Yesterday</Text>
        </View>
        <View style={styles.weightStat}>
          <Text style={[styles.weightVal, { color: styleMode === 'mindful' ? theme.textSecondary : (weight||lastKnownWeight?.val)&&earliestWeight ? earliestWeight-(weight||lastKnownWeight!.val)>0 ? theme.statusGood : earliestWeight-(weight||lastKnownWeight!.val)<0 ? theme.statusBad : theme.textPrimary : theme.textPrimary }]}>
            {(weight||lastKnownWeight?.val)&&earliestWeight ? `${Math.round((earliestWeight-(weight||lastKnownWeight!.val))*10)/10} lbs` : '--'}
          </Text>
          <Text style={[styles.weightLbl, { color: theme.textMuted }]}>Total Lost</Text>
        </View>
      </View>
      {goalWeight && (() => {
        const currentW = weight || lastKnownWeight?.val || null;
        const deficit = GOAL_DEFICITS[weightGoalPace];
        let projectedDate: string | null = null;
        if (currentW && deficit && deficit !== 0) {
          const lbsPerWeek = Math.abs(deficit) / 500;
          const lbsToGo = currentW - goalWeight;
          if ((deficit < 0 && lbsToGo > 0) || (deficit > 0 && lbsToGo < 0)) {
            const projDate = new Date();
            projDate.setDate(projDate.getDate() + Math.round((Math.abs(lbsToGo) / lbsPerWeek) * 7));
            projectedDate = projDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          }
        }
        const lbsToGo = currentW ? Math.abs(currentW - goalWeight) : null;
        return (
          <View style={[styles.weightRow, { paddingTop: 10, borderTopWidth: 0.5, borderTopColor: theme.borderCardTop }]}>
            <View style={styles.weightStat}>
              <Text style={[styles.weightVal, { color: theme.textSecondary }]}>{goalWeight} lbs</Text>
              <Text style={[styles.weightLbl, { color: theme.textMuted }]}>Goal</Text>
            </View>
            <View style={styles.weightStat}>
              <Text style={[styles.weightVal, { color: theme.textSecondary }]}>{lbsToGo !== null ? `${Math.round(lbsToGo * 10) / 10} lbs` : '--'}</Text>
              <Text style={[styles.weightLbl, { color: theme.textMuted }]}>To Go</Text>
            </View>
            <View style={styles.weightStat}>
              <Text style={[styles.weightVal, { color: theme.textSecondary }]}>{projectedDate || '--'}</Text>
              <Text style={[styles.weightLbl, { color: theme.textMuted }]}>Projected</Text>
            </View>
          </View>
        );
      })()}
      <View style={styles.weightAdd}>
        <TextInput style={[styles.weightInput, { backgroundColor: theme.bgInput, borderColor: theme.borderInput, color: theme.textPrimary }]} placeholder="Enter weight (lbs)" placeholderTextColor={theme.textPlaceholder}
          keyboardType="decimal-pad" value={weightInput} onChangeText={v => {
            const stripped = v.replace(/[^0-9.]/g, '');
            const dot = stripped.indexOf('.');
            if (dot === -1) {
              if (stripped.length <= 3) setWeightInput(stripped);
            } else {
              const before = stripped.slice(0, dot);
              const after = stripped.slice(dot + 1).replace(/\./g, '').slice(0, 1);
              if (before.length <= 3) setWeightInput(before + '.' + after);
            }
          }} />
        <PressableButton style={[styles.logBtn, { backgroundColor: weightInput.trim() ? theme.accentBlueBg : theme.bgInput, borderColor: weightInput.trim() ? theme.accentBlueBorder : theme.borderInput, opacity: weightInput.trim() ? 1 : 0.5 }]} onPress={logWeight}>
          <Text style={[styles.logBtnText, { color: weightInput.trim() ? theme.accentBlue : theme.textDim }]}>LOG</Text>
        </PressableButton>
      </View>
    </View>
  );

  const renderWorkoutCard = () => {
    const todayProgram = workoutPrograms[todayKey] || workoutTemplate[todayDay] || { type: 'cardio', focus: 'Cardio', color: '#888888', exercises: [] };
    const exercises = todayProgram?.exercises || [];
    const dayChecks = workoutChecks[todayKey] || {};
    const doneCount = exercises.filter((ex: any) => dayChecks[ex.id]).length;
    const pillColor = todayProgram?.color || '#888888';
    const MAX_DISPLAY = 4;
    const displayExercises = exercises.slice(0, MAX_DISPLAY);
    const overflow = exercises.length - MAX_DISPLAY;
    const burnedDisplay = hkCalories > 0 ? hkCalories : caloriesBurned;
    const cardScale = new Animated.Value(1);

    const onPressIn = () => Animated.timing(cardScale, { toValue: 0.97, duration: 100, useNativeDriver: true }).start();
    const onPressOut = () => Animated.timing(cardScale, { toValue: 1, duration: 150, useNativeDriver: true }).start();

    return (
      <Animated.View style={{ transform: [{ scale: cardScale }] }}>
      <TouchableOpacity
        activeOpacity={0.99}
        delayPressIn={0}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/(tabs)/workout'); }}
        style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: theme.accentBlueRaw, padding: 16, overflow: 'hidden' }]}>
        <Ionicons name="barbell" size={130} color={theme.accentBlueRaw} style={{ position: 'absolute', right: -24, bottom: -28, opacity: 0.10 }} />
        <View style={{ marginBottom: 12 }}>
          <View style={{ flexDirection:'row', alignItems:'center', gap:6, marginBottom:8 }}>
            <Ionicons name="barbell-outline" size={11} color={theme.textMuted} />
            <Text style={[styles.cardLabel, { marginBottom:0, color: theme.textMuted }]}>Today's Training</Text>
          </View>
          {(() => {
            const programTags = todayProgram?.tags || [];
            const kcalBadge = burnedDisplay > 0 ? (
              <View style={{ flexDirection:'row', alignItems:'baseline', gap:3, marginLeft:'auto' }}>
                <Ionicons name="flame-outline" size={11} color={theme.accentBlue} style={{ marginBottom:2 }} />
                <Text style={{ fontSize:20, color: theme.accentBlue, fontFamily:'BebasNeue_400Regular', letterSpacing:1 }}>{burnedDisplay}</Text>
                <Text style={{ fontSize:9, color: theme.textMuted, fontFamily:'DMSans_700Bold', letterSpacing:1.5, textTransform:'uppercase' }}>kcal</Text>
              </View>
            ) : null;

            if (programTags.length === 0) {
              return (
                <View style={{ flexDirection: 'row', alignItems:'center' }}>
                  <View style={{ borderWidth: 1, borderColor: theme.borderSubtle, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 }}>
                    <Text style={{ fontSize: 9, fontFamily: 'DMSans_700Bold', letterSpacing: 2, color: theme.textDim }}>
                      {todayProgram?.customLabel || 'UNASSIGNED'}
                    </Text>
                  </View>
                  {kcalBadge}
                </View>
              );
            }
            const row1 = programTags.slice(0, 3);
            const row2 = programTags.slice(3, 6);
            const extra = programTags.length > 6 ? programTags.length - 6 : 0;
            const renderPill = (tagId: string) => {
              const tag = workoutTags.find((t: any) => t.id === tagId);
              if (!tag) return null;
              return (
                <View key={tagId} style={{ backgroundColor: tag.color + '99', borderWidth: 1, borderColor: tag.color, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 }}>
                  <Text style={{ fontSize: 9, fontFamily: 'DMSans_700Bold', letterSpacing: 2, color: '#ffffff' }}>{tag.label.toUpperCase()}</Text>
                </View>
              );
            };
            return (
              <View style={{ gap: 5 }}>
                <View style={{ flexDirection: 'row', gap: 6, alignItems:'center' }}>
                  {row1.map(renderPill)}
                  {row2.length === 0 && kcalBadge}
                </View>
                {row2.length > 0 && (
                  <View style={{ flexDirection: 'row', gap: 6, alignItems:'center' }}>
                    {row2.map(renderPill)}
                    {extra > 0 && (
                      <View style={{ borderWidth: 1, borderColor: theme.borderSubtle, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 }}>
                        <Text style={{ fontSize: 9, fontFamily: 'DMSans_700Bold', letterSpacing: 2, color: theme.textDim }}>+{extra}</Text>
                      </View>
                    )}
                    {kcalBadge}
                  </View>
                )}
              </View>
            );
          })()}
        </View>

        {exercises.length === 0 ? (
          <Text style={{ fontSize: 12, color: theme.textDim, fontFamily: 'DMSans_400Regular', fontStyle: 'italic' }}>No exercises logged yet</Text>
        ) : (
          <View style={{ gap: 6, marginBottom: 10 }}>
            {displayExercises.map((ex: any) => {
              const done = dayChecks[ex.id];
              return (
                <View key={ex.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: done ? theme.textDim : pillColor }} />
                  <Text style={{ fontSize: 12, fontFamily: 'DMSans_500Medium', color: theme.textMuted, textDecorationLine: done ? 'line-through' : 'none', flex: 1 }}>
                    {ex.name}
                  </Text>
                  {!ex.isCardio && (
                    <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'DMSans_400Regular' }}>{ex.sets}x{ex.reps}</Text>
                  )}
                  {ex.isCardio && ex.duration && (
                    <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'DMSans_400Regular' }}>{ex.duration}</Text>
                  )}
                </View>
              );
            })}
            {overflow > 0 && (
              <Text style={{ fontSize: 11, color: theme.accentBlue, fontFamily: 'DMSans_600SemiBold', marginTop: 2 }}>+{overflow} more exercises</Text>
            )}
          </View>
        )}

        {exerciseMinutes !== null && exerciseMinutes > 0 && (
          <Text style={{ fontSize:9, color: theme.textMuted, fontFamily:'DMSans_700Bold', letterSpacing:2, textTransform:'uppercase', marginTop:6 }}>
            {exerciseMinutes < 60
              ? `${exerciseMinutes} min active today`
              : exerciseMinutes % 60 > 0
                ? `${Math.floor(exerciseMinutes / 60)}h ${exerciseMinutes % 60}m active today`
                : `${Math.floor(exerciseMinutes / 60)}h active today`}
          </Text>
        )}
      </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderStepsCard = () => {
    const pct = stepGoal > 0 ? steps / stepGoal : 0;
    const stepColor = pct >= 1 ? theme.statusGood : theme.accentBlue;
    return (
      <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: theme.accentBlueRaw, overflow: 'hidden' }]}>
        {/* Background accent icon */}
        <Ionicons
          name="footsteps"
          size={130}
          color={theme.accentBlueRaw}
          style={{ position: 'absolute', right: -24, bottom: -28, opacity: 0.10 }}
        />
        <View style={{ flexDirection:'row', alignItems:'center', gap:6, marginBottom:8 }}>
          <Ionicons name="footsteps-outline" size={11} color={theme.textMuted} />
          <Text style={[styles.cardLabel, { marginBottom:0, color: theme.textMuted }]}>Steps Today</Text>
        </View>
        <View style={{ flexDirection:'row', alignItems:'baseline', gap:6, marginBottom:6 }}>
          <View style={{ shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 0 }}>
            <Text style={{ fontSize:36, color:stepColor, fontFamily:'BebasNeue_400Regular', letterSpacing:1, opacity: 0.88 }}>{steps.toLocaleString()}</Text>
          </View>
          <Text style={{ fontSize:13, color: theme.textMuted, fontFamily:'DMSans_400Regular' }}>/ {stepGoal.toLocaleString()} steps</Text>
        </View>
        <View style={{ marginBottom:8 }}>
          <AnimatedProgressBar pct={Math.min(pct*100,100)} color={stepColor} trackColor={theme.bgProgressTrack} refreshKey={refreshKey} overGoal={pct >= 1} />
        </View>
        <Text style={{ fontSize:9, color: theme.textMuted, fontFamily:'DMSans_700Bold', letterSpacing:2, textTransform:'uppercase' }}>{distance} mi walked today</Text>
      </View>
    );
  };

  const renderSleepCard = () => {
    const displaySleep = sleepOverride ?? sleepHours;
    return (
      <View ref={sleepCardRef} collapsable={false} style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: theme.accentBlueRaw, borderTopWidth: 1.5, overflow: 'hidden' }]}>
        <Ionicons name="moon" size={130} color={theme.accentBlueRaw} style={{ position: 'absolute', right: -24, bottom: -28, opacity: 0.10 }} />
        
        <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
          <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
            <Ionicons name="moon-outline" size={11} color={theme.textMuted} />
            <Text style={[styles.cardLabel, { marginBottom:0, color: theme.textMuted }]}>Sleep Last Night</Text>
            <TooltipIcon tooltipKey="sleep_score" />
          </View>
          <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setEditingSleep(!editingSleep); }} hitSlop={{ top:8, bottom:8, left:8, right:8 }}>
            <Ionicons name="settings" size={16} color={theme.textMuted} />
          </TouchableOpacity>
        </View>
        
        {editingSleep && (
          <View style={{ marginBottom:10 }}>
            <View style={{ flexDirection:'row', gap:8, marginBottom:8 }}>
              <TouchableOpacity
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveSleepPicker(activeSleepPicker === 'bed' ? null : 'bed'); }}
                style={{ flex:1, backgroundColor: activeSleepPicker === 'bed' ? theme.accentBlueBg : theme.bgInput, borderWidth:1, borderColor: activeSleepPicker === 'bed' ? theme.accentBlueBorder : theme.borderInput, borderRadius:6, padding:10, alignItems:'center' }}>
                <Text style={{ fontSize:10, color: theme.textMuted, fontFamily:'DMSans_400Regular', marginBottom:2 }}>Bed Time</Text>
                <Text style={{ fontSize:16, color: sleepBedTime ? theme.textPrimary : theme.textPlaceholder, fontFamily:'DMSans_600SemiBold' }}>
                  {sleepBedTime ? sleepBedTime.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : 'Tap to set'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveSleepPicker(activeSleepPicker === 'wake' ? null : 'wake'); }}
                style={{ flex:1, backgroundColor: activeSleepPicker === 'wake' ? theme.accentBlueBg : theme.bgInput, borderWidth:1, borderColor: activeSleepPicker === 'wake' ? theme.accentBlueBorder : theme.borderInput, borderRadius:6, padding:10, alignItems:'center' }}>
                <Text style={{ fontSize:10, color: theme.textMuted, fontFamily:'DMSans_400Regular', marginBottom:2 }}>Wake Time</Text>
                <Text style={{ fontSize:16, color: sleepWakeTime ? theme.textPrimary : theme.textPlaceholder, fontFamily:'DMSans_600SemiBold' }}>
                  {sleepWakeTime ? sleepWakeTime.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : 'Tap to set'}
                </Text>
              </TouchableOpacity>
            </View>
            {sleepBedTime && sleepWakeTime && (
              <Text style={{ fontSize:12, color: theme.textMuted, fontFamily:'DMSans_400Regular', textAlign:'center', marginBottom:8 }}>
                {(() => { let diff=sleepWakeTime.getTime()-sleepBedTime.getTime(); if(diff<0) diff+=24*3600000; const h=Math.floor(diff/3600000); const m=Math.round((diff%3600000)/60000); return m>0?`${h}h ${m}m of sleep`:`${h}h of sleep`; })()}
              </Text>
            )}
            {activeSleepPicker !== null && (
              <View style={{ marginBottom:8 }}>
                <DateTimePicker
                  mode="time"
                  value={activeSleepPicker === 'bed' ? (sleepBedTime || new Date()) : (sleepWakeTime || new Date())}
                  display="spinner"
                  textColor={theme.textPrimary}
                  onChange={(_, d) => {
                    if (!d) return;
                    if (activeSleepPicker === 'bed') setSleepBedTime(d);
                    else setSleepWakeTime(d);
                  }}
                />
              </View>
            )}
            <View style={{ flexDirection:'row', gap:8 }}>
              <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setEditingSleep(false); setActiveSleepPicker(null); }}
                style={{ flex:1, backgroundColor: theme.bgInput, borderWidth:1, borderColor: theme.borderInput, borderRadius:6, padding:10, alignItems:'center' }}>
                <Text style={{ color: theme.textMuted, fontSize:13, fontFamily:'DMSans_600SemiBold' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={async () => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                if(!sleepBedTime||!sleepWakeTime) return;
                let diff=sleepWakeTime.getTime()-sleepBedTime.getTime();
                if(diff<0) diff+=24*3600000;
                const val=Math.round(diff/60000)/60;
                setSleepOverride(val);
                const saved=await AsyncStorage.getItem(`pj_${todayKey}`);
                const current=saved?JSON.parse(saved):{};
                const bedStr=sleepBedTime.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
                const wakeStr=sleepWakeTime.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
                await storageSet(`pj_${todayKey}`,JSON.stringify({...current,sleepOverride:val,sleepBedTime:bedStr,sleepWakeTime:wakeStr}));
                calcBedtimeConsistencyPts(bedStr, todayKey).then(async (pts) => {
                  setSleepConsistencyPts(pts);
                  const raw2 = await AsyncStorage.getItem(`pj_${todayKey}`);
                  const cur2 = raw2 ? JSON.parse(raw2) : {};
                  await storageSet(`pj_${todayKey}`, JSON.stringify({ ...cur2, sleepConsistencyPts: pts }));
                });
                await saveToFirebase(todayKey,'sleepOverride',val);
                checkSleepAchievements().then(unlocked => {
                  unlocked.forEach(def => {
                    showCelebration(getCelebTier(def), def.name, def);
                    showAchievementToast(def);
                  });
                });
                setSleepStoredBed(bedStr); setSleepStoredWake(wakeStr); setEditingSleep(false); setActiveSleepPicker(null);
              }} style={{ flex:1, backgroundColor: theme.accentGreen, borderRadius:6, padding:10, alignItems:'center' }}>
                <Text style={{ color: theme.bgPrimary, fontSize:13, fontFamily:'DMSans_600SemiBold' }}>Save</Text>
              </TouchableOpacity>
              {sleepOverride && (
                <TouchableOpacity onPress={async () => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                  setSleepOverride(null);
                  setSleepFeelRating(null);
                  const saved=await AsyncStorage.getItem(`pj_${todayKey}`);
                  const current=saved?JSON.parse(saved):{};
                  delete current.sleepOverride;
                  delete current.sleepFeelRating;
                  await storageSet(`pj_${todayKey}`,JSON.stringify(current));
                  setEditingSleep(false); setActiveSleepPicker(null);
                }} style={{ backgroundColor: theme.accentRedBg, borderWidth:1, borderColor: theme.accentRedBorder, borderRadius:6, paddingVertical:10, paddingHorizontal:16, alignItems:'center' }}>
                  <Text style={{ color: theme.accentRed, fontSize:13, fontFamily:'DMSans_500Medium' }}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
        {displaySleep === null ? (
          <Text style={{ fontSize:13, color: theme.textDim, fontFamily:'DMSans_400Regular', fontStyle:'italic' }}>No sleep data for last night</Text>
        ) : (() => {
          const isManual = !!sleepOverride;
          const { score, hasStages, path } = calcSleepScore(displaySleep, sleepStages, sleepGoal, sleepFeelRating, isManual, sleepConsistencyPts);
          const scoreColor = score !== null ? (score >= 85 ? theme.statusGood : score >= 70 ? theme.statusWarn : theme.statusBad) : theme.textDim;
          const scoreLabel = score !== null ? (score >= 85 ? 'Well Rested' : score >= 70 ? 'Could Be Better' : 'Poor Sleep') : null;
          const totalMs = sleepStages?.totalMs||(displaySleep*3600000);
          const coreMs  = sleepStages?.core||0;
          const deepMs  = sleepStages?.deep||0;
          const remMs   = sleepStages?.rem||0;
          const hrs     = Math.floor(displaySleep);
          const mins    = Math.round((displaySleep-hrs)*60);
          const corePct = totalMs>0?coreMs/totalMs:0;
          const deepPct = totalMs>0?deepMs/totalMs:0;
          const remPct  = totalMs>0?remMs/totalMs:0;
          const fmtMs   = (ms: number) => { const h=Math.floor(ms/3600000); const m=Math.round((ms%3600000)/60000); return h>0?`${h}h ${m}m`:`${m}m`; };
          const donutSize=140, donutStroke=16, donutRadius=(donutSize-donutStroke)/2;
          const donutCirc=2*Math.PI*donutRadius;
          const coreFrac=corePct*donutCirc, deepFrac=deepPct*donutCirc, remFrac=remPct*donutCirc;
          const gapFrac=0.03*donutCirc;
          const tip = score !== null ? getSleepTip(score, displaySleep, sleepStages, sleepGoal, todayKey) : null;

          const FEEL_DESCRIPTORS: Record<number, string> = {
            1: 'Rough night', 2: 'Very poor', 3: 'Poor sleep', 4: 'Below average',
            5: 'Okay', 6: 'Decent', 7: 'Pretty good', 8: 'Good night',
            9: 'Great sleep', 10: 'Slept amazing',
          };

          const saveFeel = async (rating: number) => {
            setSleepFeelRating(rating);
            const saved = await AsyncStorage.getItem(`pj_${todayKey}`);
            const current = saved ? JSON.parse(saved) : {};
            await storageSet(`pj_${todayKey}`, JSON.stringify({ ...current, sleepFeelRating: rating }));
          };

          const consistencyLabel = sleepConsistencyPts === 10 ? 'Consistent bedtime' :
            sleepConsistencyPts === 7 ? 'Mostly consistent' :
            sleepConsistencyPts === 3 ? 'Irregular bedtime' :
            sleepConsistencyPts === 0 ? 'Inconsistent bedtime' : null;
          const consistencyColor = sleepConsistencyPts >= 7 ? theme.statusGood :
            sleepConsistencyPts >= 3 ? '#ca8a04' : theme.statusBad;
          const feelColor = (r: number) => r <= 3 ? theme.statusBad : r <= 6 ? '#ca8a04' : theme.statusGood;

          return (
            <View>
              {sleepStages ? (
                <View style={{ flexDirection:'row', alignItems:'flex-start' }}>
                  <View style={{ width:160, paddingRight:12 }}>
                    <View style={{ shadowColor:'#000000', shadowOffset:{width:0,height:2}, shadowOpacity:0.18, shadowRadius:0 }}>
                      <Text style={{ fontSize:42, color:scoreColor, fontFamily:'BebasNeue_400Regular', letterSpacing:1, opacity:0.88 }}>{hrs}h {mins}m</Text>
                    </View>
                    {scoreLabel ? (
                      <Text style={{ fontSize:9, color:scoreColor, fontFamily:'DMSans_700Bold', letterSpacing:2, textTransform:'uppercase', marginBottom:10 }}>{scoreLabel}</Text>
                    ) : (
                      <Text style={{ fontSize:9, color:theme.textDim, fontFamily:'DMSans_700Bold', letterSpacing:2, textTransform:'uppercase', marginBottom:10 }}>HEALTHKIT</Text>
                    )}
                    {sleepTimes && (
                      <Text style={{ fontSize:12, color:theme.textMuted, fontFamily:'DMSans_500Medium', marginBottom: sleepAwakeMs > 0 ? 4 : 10 }}>
                        {sleepTimes.bed} → {sleepTimes.wake}
                      </Text>
                    )}
                    {sleepAwakeMs > 0 && (
                      <Text style={{ fontSize:11, color:theme.textDim, fontFamily:'DMSans_400Regular', marginBottom:10 }}>{fmtMs(sleepAwakeMs)} awake during night</Text>
                    )}
                    <View ref={sleepStagesRef} collapsable={false} style={{ gap:6 }}>
                      {[{label:'Core',color:theme.sleepCore,val:coreMs},{label:'Deep',color:theme.sleepDeep,val:deepMs},{label:'REM',color:theme.sleepRem,val:remMs}].map(s => (
                        <View key={s.label} style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
                          <View style={{ width:8, height:8, borderRadius:4, backgroundColor:s.color }} />
                          <Text style={{ fontSize:9, color:theme.textMuted, fontFamily:'DMSans_700Bold', letterSpacing:1, textTransform:'uppercase' }}>{s.label}</Text>
                          <Text style={{ fontSize:11, color:s.color, fontFamily:'DMSans_600SemiBold' }}>{fmtMs(s.val)}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                  <View ref={sleepDonutRef} collapsable={false}>
                    <SleepDonut
                      coreFrac={coreFrac} deepFrac={deepFrac} remFrac={remFrac}
                      donutCirc={donutCirc} donutSize={donutSize} donutStroke={donutStroke} donutRadius={donutRadius}
                      coreColor={theme.sleepCore} deepColor={theme.sleepDeep} remColor={theme.sleepRem}
                      trackColor={theme.sleepTrack} gapFrac={gapFrac} refreshKey={refreshKey}
                      score={score ?? 0} scoreColor={scoreColor}
                      shimmer={score !== null && score >= 85}
                    />
                  </View>
                </View>
              ) : (
                <View style={{ flexDirection:'row', alignItems:'center' }}>
                  <View style={{ width:160, paddingRight:12 }}>
                    <View style={{ shadowColor:'#000000', shadowOffset:{width:0,height:2}, shadowOpacity:0.18, shadowRadius:0 }}>
                      <Text style={{ fontSize:42, color: score !== null ? scoreColor : theme.textPrimary, fontFamily:'BebasNeue_400Regular', letterSpacing:1, opacity:0.88 }}>{hrs}h {mins}m</Text>
                    </View>
                    {scoreLabel ? (
                      <Text style={{ fontSize:9, color:scoreColor, fontFamily:'DMSans_700Bold', letterSpacing:2, textTransform:'uppercase', marginBottom:6 }}>
                        {scoreLabel}{isManual ? ' · manual' : ''}
                      </Text>
                    ) : (
                      <Text style={{ fontSize:9, color:theme.textDim, fontFamily:'DMSans_700Bold', letterSpacing:2, textTransform:'uppercase', marginBottom:6 }}>
                        {isManual ? 'MANUAL' : 'HEALTHKIT'}
                      </Text>
                    )}
                    {((sleepStoredBed&&sleepStoredWake)||sleepTimes) ? (
                      <Text style={{ fontSize:12, color:theme.textMuted, fontFamily:'DMSans_500Medium', marginBottom:6 }}>
                        {sleepStoredBed||sleepTimes?.bed} → {sleepStoredWake||sleepTimes?.wake}
                      </Text>
                    ) : null}
                    {consistencyLabel && (
                      <View style={{ flexDirection:'row', alignItems:'center', gap:5 }}>
                        <View style={{ width:6, height:6, borderRadius:3, backgroundColor:consistencyColor }} />
                        <Text style={{ fontSize:10, color:consistencyColor, fontFamily:'DMSans_500Medium' }}>{consistencyLabel}</Text>
                      </View>
                    )}
                  </View>
                  {score !== null && (
                    <ScoreRing
                      score={score} scoreColor={scoreColor} trackColor={theme.sleepTrack}
                      donutSize={donutSize} donutStroke={donutStroke} donutRadius={donutRadius} donutCirc={donutCirc}
                      shimmer={score >= 85} refreshKey={refreshKey}
                    />
                  )}
                </View>
              )}

              {/* Feel rating prompt: Path 2/3 only */}
              {path !== 1 && (
                <View ref={sleepFeelRef} collapsable={false} style={{ marginTop:12, paddingTop:12, borderTopWidth:0.5, borderTopColor:theme.borderSubtle }}>
                  <Text style={{ fontSize:9, color:theme.textMuted, fontFamily:'DMSans_700Bold', letterSpacing:2, textTransform:'uppercase', marginBottom:10 }}>
                    {sleepFeelRating ? 'HOW DID YOU SLEEP?' : 'HOW DID YOU SLEEP? · REQUIRED FOR SCORE'}
                  </Text>
                  {[[1,2,3,4,5],[6,7,8,9,10]].map((row, ri) => (
                    <View key={ri} style={{ flexDirection:'row', gap:6, marginBottom: ri === 0 ? 6 : 0 }}>
                      {row.map(r => {
                        const fc = feelColor(r);
                        const selected = sleepFeelRating === r;
                        const anim = sleepFeelAnims[r - 1];
                        return (
                          <Animated.View key={r} style={{ flex:1, transform:[{ scale: anim }] }}>
                            <TouchableOpacity onPress={() => {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              Animated.sequence([
                                Animated.timing(anim, { toValue:1.08, duration:70, useNativeDriver:true }),
                                Animated.spring(anim, { toValue:1, useNativeDriver:true, friction:5, tension:150 }),
                              ]).start();
                              saveFeel(r);
                            }} style={{
                              paddingVertical:8, borderRadius:8, alignItems:'center',
                              backgroundColor: selected ? fc : fc + '14',
                              borderWidth: 0.5,
                              borderColor: selected ? fc : fc + '40',
                            }}>
                              <Text style={{ fontSize:16, fontFamily:'BebasNeue_400Regular', color: selected ? '#ffffff' : fc }}>{r}</Text>
                            </TouchableOpacity>
                          </Animated.View>
                        );
                      })}
                    </View>
                  ))}
                  {sleepFeelRating && (
                    <Text style={{ fontSize:10, color: feelColor(sleepFeelRating), fontFamily:'DMSans_600SemiBold', marginTop:6, textAlign:'center' }}>
                      {FEEL_DESCRIPTORS[sleepFeelRating]}
                    </Text>
                  )}
                </View>
              )}

              {tip && (
                <View style={{ marginTop:10, paddingTop:10, borderTopWidth:0.5, borderTopColor:theme.borderSubtle }}>
                  <View style={{ flexDirection:'row', alignItems:'flex-start', gap:6 }}>
                    <Ionicons name="bulb-outline" size={11} color={theme.textMuted} style={{ marginTop:2 }} />
                    <Text style={{ fontSize:11, color:theme.textMuted, fontFamily:'DMSans_400Regular', fontStyle:'italic', flex:1, lineHeight:17 }}>{tip}</Text>
                  </View>
                </View>
              )}
              <Text style={{ fontSize:10, color:theme.textDim, fontFamily:'DMSans_400Regular', textAlign:'center', marginTop:8, fontStyle:'italic' }}>For informational purposes only. Not medical advice.</Text>
            </View>
          );
        })()}
      </View>
    );
  };

  const renderFitnessMetricsCard = () => {
    const hasAny = vo2Max !== null || cardioRecovery !== null || restingHR !== null || respiratoryRate !== null || bloodOxygen !== null || bodyFatPct !== null;

    const good = theme.statusGood;
    const warn = theme.statusWarn;
    const bad  = theme.statusBad;
    const neutral = theme.textSecondary;

    const fitnessColor = (metric: string, value: number): string => {
      if (styleMode === 'mindful') return neutral;

      switch (metric) {
        case 'vo2max': {
          if (profileAge === null || profileSex === null) return neutral;
          const age = profileAge;
          const male = profileSex === 'male';
          // ACSM tables: [good_floor, amber_floor] -- above good = green, between = amber, below amber = red
          const thresholds: [number, number] =
            male
              ? age < 30 ? [38, 35]
              : age < 40 ? [35, 31]
              : age < 50 ? [31, 27]
              : age < 60 ? [27, 23]
              :            [21, 18]
              : age < 30 ? [29, 25]
              : age < 40 ? [27, 24]
              : age < 50 ? [25, 21]
              : age < 60 ? [21, 19]
              :            [17, 15];
          return value >= thresholds[0] ? good : value >= thresholds[1] ? warn : bad;
        }
        case 'cardio': {
          return value >= 20 ? good : value >= 12 ? warn : bad;
        }
        case 'restingHR': {
          // AHA: <40 bradycardia risk; 40-75 healthy; 76-90 elevated; >90 high
          if (value < 40) return warn;
          if (value <= 75) return good;
          if (value <= 90) return warn;
          return bad;
        }
        case 'respRate': {
          if (value >= 12 && value <= 20) return good;
          if ((value >= 8 && value < 12) || (value > 20 && value <= 25)) return warn;
          return bad;
        }
        case 'bloodO2': {
          return value >= 95 ? good : value >= 90 ? warn : bad;
        }
        case 'bodyFat': {
          if (profileSex === null) return neutral;
          const male = profileSex === 'male';
          // ACE categories: male fitness ≤17%, acceptable ≤24%, obese >24%
          // female fitness ≤24%, acceptable ≤31%, obese >31%
          if (male) return value <= 17 ? good : value <= 24 ? warn : bad;
          return value <= 24 ? good : value <= 31 ? warn : bad;
        }
        default: return neutral;
      }
    };

    const boxStyle = { width: '31%' as const, backgroundColor: theme.bgInset + '80', borderWidth: 0.5, borderColor: theme.borderCard, borderRadius: 8, padding: 10, alignItems: 'center' as const };
    const valStyle = (color: string) => ({ fontSize: 22, color, fontFamily: 'BebasNeue_400Regular' as const, letterSpacing: 1 });
    const labelStyle = { fontSize: 9, color: theme.textMuted, fontFamily: 'DMSans_500Medium' as const, textTransform: 'uppercase' as const, letterSpacing: 1, marginTop: 2, textAlign: 'center' as const };
    const unitStyle = { fontSize: 8, color: theme.textDim, fontFamily: 'DMSans_400Regular' as const, marginTop: 1, textAlign: 'center' as const };

    return (
      <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: theme.accentBlueRaw, overflow: 'hidden' }]}>
        <Ionicons name="fitness" size={130} color={theme.accentBlueRaw} style={{ position: 'absolute', right: -24, bottom: -28, opacity: 0.10 }} />
        <View style={{ flexDirection:'row', alignItems:'center', gap:6, marginBottom:10 }}>
          <Ionicons name="heart-outline" size={11} color={theme.textMuted} />
          <Text style={[styles.cardLabel, { marginBottom:0, color: theme.textMuted }]}>Fitness Metrics</Text>
          <TooltipIcon tooltipKey="fitness_metrics" />
        </View>
        {!hasAny ? (
          <View style={{ alignItems:'center', paddingVertical:16, gap:6 }}>
            <Ionicons name="fitness-outline" size={28} color={theme.iconMuted} />
            <Text style={{ fontSize:12, color: theme.textDim, fontFamily:'DMSans_400Regular', fontStyle:'italic' }}>No fitness data available</Text>
            <Text style={{ fontSize:10, color: theme.textDim, fontFamily:'DMSans_400Regular', textAlign:'center' }}>Metrics sync automatically from Apple Health</Text>
          </View>
        ) : (
          <>
            <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8 }}>
              {vo2Max !== null && (
                <View style={boxStyle}>
                  <Text style={valStyle(fitnessColor('vo2max', vo2Max))}>{vo2Max}</Text>
                  <Text style={labelStyle}>VO2 Max</Text>
                  <Text style={unitStyle}>ml/kg/min</Text>
                </View>
              )}
              {cardioRecovery !== null && (
                <View style={boxStyle}>
                  <Text style={valStyle(fitnessColor('cardio', cardioRecovery))}>{cardioRecovery}</Text>
                  <Text style={labelStyle}>Cardio Recovery</Text>
                  <Text style={unitStyle}>bpm / 1 min</Text>
                </View>
              )}
              {restingHR !== null && (
                <View style={boxStyle}>
                  <Text style={valStyle(fitnessColor('restingHR', restingHR))}>{restingHR}</Text>
                  <Text style={labelStyle}>Resting HR</Text>
                  <Text style={unitStyle}>bpm</Text>
                </View>
              )}
              {respiratoryRate !== null && (
                <View style={boxStyle}>
                  <Text style={valStyle(fitnessColor('respRate', respiratoryRate))}>{Math.round(respiratoryRate * 10) / 10}</Text>
                  <Text style={labelStyle}>Resp. Rate</Text>
                  <Text style={unitStyle}>br / min</Text>
                </View>
              )}
              {bloodOxygen !== null && (
                <View style={boxStyle}>
                  <Text style={valStyle(fitnessColor('bloodO2', bloodOxygen))}>{Math.round(bloodOxygen * 10) / 10}%</Text>
                  <Text style={labelStyle}>Blood O2</Text>
                  <Text style={unitStyle}>% SpO2</Text>
                </View>
              )}
              {bodyFatPct !== null && (
                <View style={boxStyle}>
                  <Text style={valStyle(fitnessColor('bodyFat', bodyFatPct))}>{Math.round(bodyFatPct * 10) / 10}%</Text>
                  <Text style={labelStyle}>Body Fat</Text>
                  <Text style={unitStyle}>% body fat</Text>
                </View>
              )}
            </View>
            <Text style={{ fontSize: 9, color: theme.textDim, fontFamily: 'DMSans_400Regular', marginTop: 10, textAlign: 'center' }}>
              For informational purposes only. Not medical advice.
            </Text>
          </>
        )}
      </View>
    );
  };

  const renderDailyNoteCard = () => {
    const noteCurrentText = dailyNote.trim();
    const noteLastSaved = savedDailyNoteText.trim();
    const noteIsDirty = noteCurrentText !== noteLastSaved;
    const isClearing = noteIsDirty && !noteCurrentText && !!noteLastSaved;
    return (
      <View ref={dailyNoteCardRef} style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: theme.accentBlueRaw, overflow: 'hidden' }]}>
        <Ionicons name="create" size={130} color={theme.accentBlueRaw} style={{ position: 'absolute', right: -24, bottom: -28, opacity: 0.10 }} />
        <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
          <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
            <Ionicons name="journal-outline" size={11} color={theme.textMuted} />
            <Text style={[styles.cardLabel, { marginBottom:0, color: theme.textMuted }]}>Today's Thoughts</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/journal')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="journal" size={16} color={theme.accentBlue} />
          </TouchableOpacity>
        </View>
        <TextInput ref={dailyNoteRef} style={[styles.notesInput, { backgroundColor: theme.bgInput, borderColor: theme.borderInput, color: theme.textPrimary }]} placeholder="How did today go? Energy, mood, wins..." placeholderTextColor={theme.textPlaceholder}
          multiline numberOfLines={4} value={dailyNote} onChangeText={setDailyNote}
          onFocus={() => {
            setTimeout(() => {
              if (dailyNoteCardRef.current && scrollRef.current) {
                dailyNoteCardRef.current.measureLayout(scrollRef.current, (_x: number, y: number) => {
                  scrollRef.current?.scrollTo({ y: Math.max(0, y - 16), animated: true });
                }, () => {});
              }
            }, 150);
          }}
          onBlur={() => dailyNoteRef.current?.setNativeProps({ selection: { start: 0, end: 0 } })} />
        <TouchableOpacity
          style={[styles.saveBtn, isClearing
            ? { backgroundColor: theme.accentRedBg, borderColor: theme.accentRedBorder, opacity: 1 }
            : { backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder, opacity: noteIsDirty && noteCurrentText ? 1 : 0.4 }
          ]}
          disabled={!noteIsDirty}
          onPress={async () => {
            if (!noteIsDirty) return;
            Haptics.impactAsync(isClearing ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Medium);
            try {
              const raw = await AsyncStorage.getItem('pj_bible_reflections');
              const entries: any[] = raw ? JSON.parse(raw) : [];
              const existing = entries.findIndex(e => e.category === 'personal' && e.date === todayKey);
              if (isClearing) {
                if (existing >= 0) entries.splice(existing, 1);
              } else if (existing >= 0) {
                entries[existing] = { ...entries[existing], notes: noteCurrentText };
              } else {
                entries.unshift({ id: `${todayKey}_${Date.now()}`, date: todayKey, category: 'personal', title: "Today's Thoughts", notes: noteCurrentText });
              }
              await storageSet('pj_bible_reflections', JSON.stringify(entries));
            } catch {}
            setSavedDailyNoteText(noteCurrentText);
            showToast(isClearing ? 'Note cleared' : 'Note saved to journal', undefined, 'success');
          }}>
          <Text style={[styles.saveBtnText, { color: isClearing ? theme.accentRed : theme.accentBlue }]}>
            {!noteIsDirty && noteCurrentText ? 'Saved ✓' : isClearing ? 'Clear Note' : 'Save Note'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderVsYesterdayCard = () => {
    // ── Today's values ──
    const todayNet = totalCals - displayedBurned - runningBmr;
    const todaySleepScore = sleepHours ? calcSleepScore(sleepHours, sleepStages, sleepGoal, sleepFeelRating, !!sleepOverride, sleepConsistencyPts) : null;
    const todaySleepHours = sleepOverride ?? sleepHours ?? null;
    const todayHasSleepScore = todaySleepScore !== null &&
        todaySleepScore.score !== null &&
        (todaySleepScore.path === 1 || sleepFeelRating !== null);

    // ── Metric definitions ──
    type MetricId = 'net' | 'steps' | 'sleepScore' | 'water' | 'weight' | 'activeCals' | 'sleepHours';
    interface Metric {
      id: MetricId;
      label: string;
      sub: string;
      todayVal: number | null;
      ydVal: number | null;
      format: (v: number) => string;
      unit: string;
      winCondition: (today: number, yd: number) => 'win' | 'lose' | 'tie';
    }

    const sleepFmt = (h: number) => {
      const hrs = Math.floor(h);
      const mins = Math.round((h - hrs) * 60);
      return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
    };

    const allMetrics: Metric[] = [
      {
        id: 'net',
        label: 'Net Cals',
        sub: (() => {
          const paceLabels: Record<string, string> = {
            lose_2:   'Lose 2 lbs / wk pace',
            lose_1_5: 'Lose 1.5 lbs / wk pace',
            lose_1:   'Lose 1 lb / wk pace',
            lose_0_5: 'Lose 0.5 lbs / wk pace',
            maintain: 'Maintain weight pace',
            gain_0_5: 'Gain 0.5 lbs / wk pace',
            gain_1:   'Gain 1 lb / wk pace',
          };
          return paceLabels[weightGoalPace] ?? 'Calorie target pace';
        })(),
        // Net needs BMR; with no resolvable weight (BMR 0) it would be wrong, so treat
        // it as no-data and let another metric take the slot rather than show a lie.
        todayVal: profileBmr > 0 && (totalCals > 0 || displayedBurned > 0) ? todayNet : null,
        ydVal: ydCals,
        format: v => `${v > 0 ? '+' : ''}${Math.round(v).toLocaleString()}`,
        unit: 'kcal',
        winCondition: (t, y) => {
          const tDiff = Math.abs(t - calTarget);
          const yDiff = Math.abs(y - calTarget);
          if (Math.abs(tDiff - yDiff) < 25) return 'tie';
          return tDiff < yDiff ? 'win' : 'lose';
        },
      },
      {
        id: 'steps',
        label: 'Steps',
        sub: `${stepGoal.toLocaleString()} Goal`,
        todayVal: steps > 0 ? steps : null,
        ydVal: ydSteps,
        format: v => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : Math.round(v).toString(),
        unit: 'steps',
        winCondition: (t, y) => t === y ? 'tie' : t > y ? 'win' : 'lose',
      },
      {
        id: 'sleepScore',
        label: 'Sleep Score',
        sub: `${sleepGoal}h Goal`,
        todayVal: todayHasSleepScore ? (todaySleepScore?.score ?? null) : null,
        ydVal: ydSleepScore,
        format: v => Math.round(v).toString(),
        unit: '/100',
        winCondition: (t, y) => t === y ? 'tie' : t > y ? 'win' : 'lose',
      },
      {
        id: 'water',
        label: 'Water',
        sub: `${WATER_TARGET} Oz Goal`,
        todayVal: water > 0 ? water : null,
        ydVal: ydWater,
        format: v => Math.round(v).toString(),
        unit: 'oz',
        winCondition: (t, y) => t === y ? 'tie' : t > y ? 'win' : 'lose',
      },
      {
        id: 'weight',
        label: 'Weight',
        sub: goalWeight ? `${goalWeight} Lb Goal` : 'Trending',
        todayVal: weight,
        ydVal: yesterdayWeight,
        format: v => v.toFixed(1),
        unit: 'lbs',
        winCondition: (t, y) => {
          if (Math.round(Math.abs(t - y) * 10) / 10 <= 0.3) return 'tie';
          const losing = weightGoalPace.startsWith('lose');
          const gaining = weightGoalPace.startsWith('gain');
          if (losing) return t < y ? 'win' : 'lose';
          if (gaining) return t > y ? 'win' : 'lose';
          return 'tie';
        },
      },
      {
        id: 'activeCals',
        label: 'Active Cals',
        sub: 'Burned Today',
        todayVal: displayedBurned > 0 ? displayedBurned : null,
        ydVal: ydActiveCalories,
        format: v => Math.round(v).toLocaleString(),
        unit: 'kcal',
        winCondition: (t, y) => t === y ? 'tie' : t > y ? 'win' : 'lose',
      },
      {
        id: 'sleepHours',
        label: 'Sleep',
        sub: `${sleepGoal}h Goal`,
        todayVal: !todayHasSleepScore && todaySleepHours ? todaySleepHours : null,
        ydVal: !ydSleepScore ? ydSleepHours : null,
        format: sleepFmt,
        unit: 'hrs',
        winCondition: (t, y) => Math.abs(t - y) < 0.25 ? 'tie' : t > y ? 'win' : 'lose',
      },
    ];

    // ── Tier priority ──
    const isMindful = styleMode === 'mindful';
    const tier1Ids: MetricId[] = isMindful ? ['steps', 'sleepScore', 'water'] : ['net', 'steps', 'sleepScore', 'water'];
    const tier2Ids: MetricId[] = ['weight', 'activeCals', 'sleepHours'];

    const metricMap = Object.fromEntries(allMetrics.map(m => [m.id, m])) as Record<MetricId, Metric>;

    const isEligible = (m: Metric) =>
      m.todayVal !== null && m.ydVal !== null;

    let selected: Metric[] = [];
    for (const id of tier1Ids) {
      if (selected.length >= 4) break;
      const m = metricMap[id];
      if (isEligible(m)) selected.push(m);
    }
    if (!isMindful) {
      for (const id of tier2Ids) {
        if (selected.length >= 4) break;
        const m = metricMap[id];
        if (isEligible(m)) selected.push(m);
      }
    }

    // ── Tutorial demo override: show hardcoded 3-1 demo so all 4 Tier 1 metrics are guaranteed ──
    if (yvyTutorialDemo) {
      selected = [
        { id: 'net' as MetricId, label: 'Net Cals', sub: 'Calorie target pace', todayVal: -220, ydVal: 180,
          format: (v: number) => `${v > 0 ? '+' : ''}${Math.round(v).toLocaleString()}`, unit: 'kcal',
          winCondition: () => 'win' as 'win' | 'lose' | 'tie' },
        { id: 'steps' as MetricId, label: 'Steps', sub: '10,000 Goal', todayVal: 8420, ydVal: 7100,
          format: (v: number) => `${(v / 1000).toFixed(1)}k`, unit: 'steps',
          winCondition: () => 'win' as 'win' | 'lose' | 'tie' },
        { id: 'sleepScore' as MetricId, label: 'Sleep Score', sub: `${sleepGoal}h Goal`, todayVal: 78, ydVal: 71,
          format: (v: number) => Math.round(v).toString(), unit: '/100',
          winCondition: () => 'win' as 'win' | 'lose' | 'tie' },
        { id: 'water' as MetricId, label: 'Water', sub: `${waterGoal} Oz Goal`, todayVal: 60, ydVal: 72,
          format: (v: number) => Math.round(v).toString(), unit: 'oz',
          winCondition: () => 'lose' as 'win' | 'lose' | 'tie' },
      ];
    }

    // ── Not enough data ──
    if (!yvyTutorialDemo && selected.length < 2) return null;

    // ── Score ──
    type Result = 'win' | 'lose' | 'tie';
    let results: Result[] = selected.map(m => {
      if (m.todayVal === null || m.ydVal === null) return 'tie';
      return m.winCondition(m.todayVal, m.ydVal);
    });
    if (yvyTutorialDemo) results = ['win', 'win', 'win', 'lose'];
    const wins   = results.filter(r => r === 'win').length;
    const losses = results.filter(r => r === 'lose').length;
    const ties   = results.filter(r => r === 'tie').length;
    const overallResult: Result = wins > losses ? 'win' : losses > wins ? 'lose' : 'tie';

    const motivationalLines: Record<Result, string[]> = {
      win:  ['You just raised the bar.', 'Today beats yesterday. Keep going.', "Standard's rising. Keep the intensity.", 'Better than yesterday. Build on it.'],
      lose: ['Yesterday set the bar high. Chase it.', 'Strong day. Yesterday was stronger.', 'Good effort. Yesterday had more.', 'Yesterday was built different. Match it.'],
      tie:  ['Dead even. Tomorrow breaks it.', 'Matched yesterday exactly. Push past it.', 'Too close to call. Break the tie tomorrow.', 'Even match. Make tomorrow count.'],
    };
    const motLine = motivationalLines[overallResult][Math.floor(new Date().getDate() % motivationalLines[overallResult].length)];

    const accentRaw = theme.accentBlueRaw;
    const winColor  = accentRaw;
    const loseColor = theme.textDim;
    const tieColor  = theme.textDim;

    // ── Mindful 4th slot cycling ──
    let mindfulSelected = [...selected];
    if (isMindful && mindfulSelected.length <= 3) {
      const todayDate = new Date().getDate();
      const hasFood = totalCals > 0;
      const hasWorkout = Object.values(workoutChecks[todayKey] || {}).some(Boolean);
      const cycleOptions = [
        !hasFood   ? { id: 'log_meal',   label: 'Log a Meal',    sub: 'Tap + Log to add food',   done: false } : null,
        !hasWorkout? { id: 'workout_check', label: 'Worked Out', sub: 'Log a workout today',      done: false } : null,
        { id: 'showing_up', label: 'Showing Up',  sub: 'You logged today',          done: hasFood },
      ].filter(Boolean) as { id: string; label: string; sub: string; done: boolean }[];
      const slot4 = cycleOptions[todayDate % cycleOptions.length];
      if (slot4) mindfulSelected = [...mindfulSelected, slot4 as any];
    }
    const displayMetrics = yvyTutorialDemo ? selected : (isMindful ? mindfulSelected : selected);

    return (
      <View ref={yvyCardRef} collapsable={false} style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: theme.accentBlueRaw, overflow: 'hidden' }]}>
        <Ionicons name="trophy" size={130} color={theme.accentBlueRaw} style={{ position: 'absolute', right: -24, bottom: -28, opacity: 0.10 }} />
        {/* Header */}
        <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
            <Ionicons name="trophy" size={11} color={theme.textMuted} />
            <Text style={[styles.cardLabel, { marginBottom:0, color: theme.textMuted }]}>
              {isMindful ? 'You & Yesterday' : 'You vs Yesterday'}
            </Text>
            {!isMindful && <TooltipIcon tooltipKey="vs_yesterday" />}
          </View>
          {!isMindful && vsStreak > 0 && (
            <View style={{ flexDirection:'row', alignItems:'center', gap:5, backgroundColor: `${accentRaw}18`, borderWidth:1, borderColor:`${accentRaw}40`, borderRadius:6, paddingHorizontal:8, paddingVertical:3 }}>
              <Text style={{ fontSize:11, color: accentRaw, fontFamily:'DMSans_700Bold' }}>🔥</Text>
              <Text style={{ fontSize:13, color: accentRaw, fontFamily:'BebasNeue_400Regular', letterSpacing:1 }}>{vsStreak}</Text>
              <Text style={{ fontSize:9, color: accentRaw, fontFamily:'DMSans_700Bold', letterSpacing:1.5, textTransform:'uppercase' }}>day streak</Text>
            </View>
          )}
        </View>

        {/* Column headers */}
        <View style={{ flexDirection:'row', marginBottom:6 }}>
          <View style={{ flex:1 }} />
          <View style={{ width:80, alignItems:'center' }}>
            <Text style={{ fontSize:9, fontFamily:'DMSans_700Bold', letterSpacing:2, textTransform:'uppercase', color: isMindful ? theme.textMuted : accentRaw }}>Today</Text>
          </View>
          <View style={{ width:80, alignItems:'center' }}>
            <Text style={{ fontSize:9, fontFamily:'DMSans_700Bold', letterSpacing:2, textTransform:'uppercase', color: theme.textDim }}>Yesterday</Text>
          </View>
        </View>

        {/* Metric rows */}
        <View ref={yvyMetricsRef} collapsable={false}>
        {displayMetrics.map((m: any, i: number) => {
          const result = (yvyTutorialDemo || !isMindful) ? results[i] : 'tie';
          const isSlot4 = isMindful && m.id && !['steps','sleepScore','water','net'].includes(m.id);
          const rowColor = theme.textSecondary;
          const todayColor = isMindful ? rowColor : (result === 'win' ? winColor : theme.textDim);
          const ydColor    = isMindful ? theme.textDim : (result === 'lose' ? theme.textSecondary : theme.textDim);
          const showWinBar = !isMindful && result === 'win';
          const showYdBar  = !isMindful && result === 'lose';
          return (
            <View key={m.id || i} style={{ flexDirection:'row', alignItems:'center', paddingVertical:9,
              borderBottomWidth: i < displayMetrics.length - 1 ? 0.5 : 0,
              borderBottomColor: theme.borderSubtle }}>
              <View style={{ flex:1 }}>
                <Text style={{ fontSize:10, fontFamily:'DMSans_700Bold', letterSpacing:2, textTransform:'uppercase', color: theme.textPrimary }}>{m.label}</Text>
                <Text style={{ fontSize:10, fontFamily:'DMSans_400Regular', color: theme.textDim, marginTop:1 }}>{m.sub}</Text>
              </View>
              {isSlot4 ? (
                <>
                  <View style={{ width:80, alignItems:'center' }}>
                    <Ionicons name={m.done ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={m.done ? theme.statusGood : theme.textDim} />
                  </View>
                  <View style={{ width:80 }} />
                </>
              ) : (
                <>
                  <View style={{ width:80, alignItems:'center' }}>
                    {showWinBar && (
                      <View style={{ position:'absolute', left:2, top:'10%', width:3, height:'80%', backgroundColor: accentRaw, borderRadius:2 }} />
                    )}
                    <Text style={{ fontSize:20, fontFamily:'BebasNeue_400Regular', letterSpacing:1, color: todayColor }}>
                      {m.todayVal !== null ? m.format(m.todayVal) : '--'}
                    </Text>
                    <Text style={{ fontSize:8, fontFamily:'DMSans_700Bold', letterSpacing:1, textTransform:'uppercase', color: todayColor, opacity: result === 'tie' ? 0.3 : 0.6 }}>{m.unit}</Text>
                  </View>
                  <View style={{ width:80, alignItems:'center' }}>
                    {showYdBar && (
                      <View style={{ position:'absolute', right:2, top:'10%', width:3, height:'80%', backgroundColor: theme.textSecondary, borderRadius:2 }} />
                    )}
                    <Text style={{ fontSize:20, fontFamily:'BebasNeue_400Regular', letterSpacing:1, color: ydColor }}>
                      {m.ydVal !== null ? m.format(m.ydVal) : '--'}
                    </Text>
                    <Text style={{ fontSize:8, fontFamily:'DMSans_700Bold', letterSpacing:1, textTransform:'uppercase', color: ydColor, opacity: result === 'tie' ? 0.3 : 0.6 }}>{m.unit}</Text>
                  </View>
                </>
              )}
            </View>
          );
        })}
        </View>

        {/* Results countdown -- hidden in Mindful */}
        {!isMindful && (() => {
          const now = new Date();
          const msLeft = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime();
          const h = Math.floor(msLeft / 3600000);
          const m = Math.floor((msLeft % 3600000) / 60000);
          const s = Math.floor((msLeft % 60000) / 1000);
          const fmt = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
          return (
            <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'center', gap:4, marginTop:12, marginBottom:-4 }}>
              <Ionicons name="timer-outline" size={10} color={theme.textDim} />
              <Text style={{ fontSize:10, fontFamily:'DMSans_500Medium', color: theme.textDim, letterSpacing:0.5 }}>Results in {fmt}</Text>
            </View>
          );
        })()}
      </View>
    );
  };

  const renderCardById = (id: CardId) => {
    switch (id) {
      case 'verse': {
        if (faithJourney === 'notrightnow') return null;
        const [vy, vm, vd] = todayKey.split('-').map(Number);
        return <FaithTodayCard verse={dailyVerse} theme={theme} />;
      }
      case 'smart_tip': {
        const homeTip = homeTips[tipIndex] ?? null;
        if (!homeTip) return null;
        const tipBorderColor = homeTip.positive ? theme.statusGood : homeTip.tier === 'urgent' ? theme.statusBad : theme.statusWarn;
        const chipLabel = homeTip.positive ? 'POSITIVE' : homeTip.tier.toUpperCase();
        const chipColor = homeTip.positive ? theme.statusGood : homeTip.tier === 'urgent' ? theme.statusBad : theme.statusWarn;
        const tipShadow = { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 3 };
        const tipScale = new Animated.Value(1);
        return (
          <Animated.View style={{ transform: [{ scale: tipScale }] }}>
            <TouchableOpacity
              activeOpacity={0.99}
              onPressIn={() => Animated.timing(tipScale, { toValue: 0.97, duration: 100, useNativeDriver: true }).start()}
              onPressOut={() => Animated.timing(tipScale, { toValue: 1, duration: 150, useNativeDriver: true }).start()}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/diagnostic-report'); }}
            >
              <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopWidth: 1.5, borderTopColor: tipBorderColor, ...tipShadow }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <View style={{ backgroundColor: chipColor + '22', borderWidth: 1, borderColor: chipColor + '55', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={{ fontSize: 9, fontFamily: 'DMSans_700Bold', letterSpacing: 2, color: chipColor }}>{chipLabel}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={[styles.cardLabel, { color: theme.textMuted, marginBottom: 0 }]}>SMART TIPS</Text>
                    <TooltipIcon tooltipKey="smart_tip" size={14} />
                  </View>
                </View>
                <Animated.View style={{ opacity: tipOpacity }}>
                  <Text style={{ fontSize: 15, fontFamily: 'DMSans_600SemiBold', color: theme.textSecondary, lineHeight: 21, marginBottom: 6 }}>{homeTip.title}</Text>
                  <Text style={{ fontSize: 12, fontFamily: 'DMSans_400Regular', color: theme.textSecondary, lineHeight: 18, marginBottom: 12 }} numberOfLines={3}>{homeTip.body}</Text>
                </Animated.View>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={{ fontSize: 11, fontFamily: 'DMSans_600SemiBold', color: theme.accentBlueRaw }}>View in Effort vs Results</Text>
                    <Ionicons name="chevron-forward" size={12} color={theme.accentBlueRaw} />
                  </View>
                  {homeTips.length > 1 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      {homeTips.map((_, i) => (
                        <View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: i === tipIndex ? theme.accentBlueRaw : theme.textMuted + '40' }} />
                      ))}
                      <TouchableOpacity
                        onPress={(e) => { e.stopPropagation(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); advanceTip(); }}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        style={{ padding: 4, marginLeft: 2 }}
                      >
                        <Ionicons name="chevron-forward" size={14} color={theme.accentBlueRaw} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          </Animated.View>
        );
      }
      case 'calories':        return renderCaloriesCard();
      case 'macros':          return renderMacrosCard();
      case 'water':           return renderWaterCard();
      case 'weight':          return renderWeightCard();
      case 'workout':         return renderWorkoutCard();
      case 'steps':           return renderStepsCard();
      case 'sleep':           return renderSleepCard();
      case 'fitness_metrics': return renderFitnessMetricsCard();
      case 'daily_note':      return renderDailyNoteCard();
      case 'gratitude_streak':
        if (faithJourney === 'notrightnow') return null;
        return <GratitudeStreakCard styleMode={styleMode} todayKey={todayKey} scrollRef={scrollRef} theme={theme} />;
      case 'reading_plans':
        if (faithJourney === 'notrightnow') return null;
        return <ReadingPlansCard theme={theme} />;
      case 'vs_yesterday': {
        const cardContent = renderVsYesterdayCard();
        if (!cardContent) return (
          <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopWidth: 1.5, borderTopColor: theme.accentBlueRaw, overflow: 'hidden' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 }}>
              <Ionicons name="git-compare-outline" size={11} color={theme.textMuted} />
              <Text style={[styles.cardLabel, { marginBottom: 0, color: theme.textMuted }]}>You vs Yesterday</Text>
            </View>
            <View style={{ alignItems: 'center', paddingVertical: 16, gap: 8 }}>
              <Ionicons name="bar-chart-outline" size={32} color={theme.textDim} />
              <Text style={{ color: theme.textPrimary, fontSize: 15, fontFamily: 'DMSans_600SemiBold' }}>Keep tracking to compare</Text>
              <Text style={{ color: theme.textMuted, fontSize: 12, fontFamily: 'DMSans_400Regular', textAlign: 'center', lineHeight: 18 }}>Log food, water, or steps today and yesterday to unlock your daily comparison.</Text>
            </View>
          </View>
        );
        if (styleMode === 'mindful') return cardContent;
        const today = new Date();
        const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
        const fmtD = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        const vsCardScale = new Animated.Value(1);
        const onPressIn = () => Animated.timing(vsCardScale, { toValue: 0.97, duration: 100, useNativeDriver: true }).start();
        const onPressOut = () => Animated.timing(vsCardScale, { toValue: 1, duration: 150, useNativeDriver: true }).start();
        return (
          <Animated.View style={{ transform: [{ scale: vsCardScale }] }}>
            <TouchableOpacity
              activeOpacity={0.99}
              delayPressIn={0}
              onPressIn={onPressIn}
              onPressOut={onPressOut}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push({ pathname: '/head-to-head', params: { dateA: fmtD(today), dateB: fmtD(yesterday) } }); }}
            >
              {cardContent}
            </TouchableOpacity>
          </Animated.View>
        );
      }
      default:                return null;
    }
  };

  // ── Visible ordered cards for normal mode ────────────────────────────────────
  const visibleCards = cardOrder.filter(id => cardVisible[id]);

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1 }}>
    <LinearGradient
      colors={[theme.gradientStart, theme.gradientEnd]}
      style={[styles.container, { paddingTop: insets.top }]}
    >

      {/* ── Header ── */}
      <View style={[styles.header, { borderBottomColor: theme.borderCard }]}>
        <View style={{ flexDirection:'row', alignItems:'center', gap:12, flex:1 }}>
          <HeaderAvatar />
          <View style={{ flex:1 }}>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={[styles.headerTitle, { color: theme.accentBlueRaw }]}>
              {(() => { const h=new Date().getHours(); return h<12?'Good morning':h<17?'Good afternoon':'Good evening'; })()}
            </Text>
            <Text style={{ fontSize:9, color: theme.textMuted, fontFamily:'DMSans_700Bold', marginTop:1, letterSpacing:2, textTransform:'uppercase' }}>
              {new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection:'row', gap:8, alignItems:'center' }}>
            <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); fetchTodayData(); setRefreshKey(k=>k+1); showToast('Health data refreshed', undefined, 'info'); }}
              style={[styles.headerBtn, { backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder }]}>
              <Ionicons name="refresh" size={14} color={theme.accentBlue} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); dayDetailAnim.setValue(0); setDayDetailDate(todayKey); }}
              style={[styles.headerBtn, { backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder }]}>
              <Ionicons name="calendar" size={14} color={theme.accentBlue} />
            </TouchableOpacity>
            <View ref={editLayoutBtnRef} collapsable={false}>
              <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); enterEditMode(); }} style={[styles.headerBtn, { backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder }]}>
                <Ionicons name="grid" size={14} color={theme.accentBlue} />
              </TouchableOpacity>
            </View>
            <View ref={toolkitRef} collapsable={false}>
              <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); showToolkit('home'); }} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                <Ionicons name="help-circle" size={22} color={theme.accentBlue} />
              </TouchableOpacity>
            </View>
          </View>
      </View>

      {/* ── Water custom modal ── */}
      {showWaterCustomModal && (
        <Animated.View style={{ position:'absolute', top:0, bottom:0, left:0, right:0, backgroundColor: theme.overlayBg, justifyContent:'center', alignItems:'center', zIndex:999, opacity: waterModalAnim }}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={closeWaterCustomModal} activeOpacity={1} />
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={{ backgroundColor: theme.bgSheet, borderRadius:14, padding:24, width:'80%', borderWidth:0.5, borderColor: theme.borderCard }}>
            <Text style={{ fontSize:9, color: theme.textMuted, fontFamily:'DMSans_700Bold', letterSpacing:2, textTransform:'uppercase', marginBottom:12 }}>
              {waterCustomSign==='add' ? 'Add Custom Amount' : 'Remove Custom Amount'}
            </Text>
            <TextInput ref={waterCustomInputRef} style={{ backgroundColor: theme.bgInput, borderWidth:0.5, borderColor: theme.borderInput, borderRadius:8, color: theme.textPrimary, padding:12, fontSize:24, fontFamily:'BebasNeue_400Regular', textAlign:'center', marginBottom:16 }}
              value={waterCustomInput} onChangeText={setWaterCustomInput} keyboardType="number-pad" placeholder="0" placeholderTextColor={theme.textPlaceholder} autoFocus />
            <Text style={{ fontSize:9, color: theme.textMuted, fontFamily:'DMSans_700Bold', letterSpacing:1, textTransform:'uppercase', textAlign:'center', marginBottom:16 }}>oz</Text>
            <View style={{ flexDirection:'row', gap:10 }}>
              <TouchableOpacity style={{ flex:1, padding:12, borderRadius:8, backgroundColor: theme.bgInput, alignItems:'center' }} onPress={() => closeWaterCustomModal()}>
                <Text style={{ color: theme.textMuted, fontFamily:'DMSans_600SemiBold', fontSize:14 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flex:1, padding:12, borderRadius:8, backgroundColor: waterCustomSign==='add' ? theme.accentBlueBg : theme.accentRedBg, alignItems:'center' }}
                onPress={async () => {
                  const amt = parseInt(waterCustomInput);
                  if (amt > 0) { await doWaterUpdate(waterCustomSign === 'add' ? amt : -amt); }
                  closeWaterCustomModal();
                }}>
                <Text style={{ color: waterCustomSign==='add' ? theme.accentBlue : theme.accentRed, fontFamily:'DMSans_600SemiBold', fontSize:14 }}>
                  {waterCustomSign==='add'?'Add':'Remove'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          </TouchableWithoutFeedback>
        </Animated.View>
      )}

      {/* ── Water Detail Modal ── */}
      {showWaterDetailModal && (() => {
        let wakeMs: number;
        if (sleepWakeTime) {
          wakeMs = sleepWakeTime.getTime();
        } else if (sleepStoredWake) {
          const match = sleepStoredWake.match(/(\d+):(\d+)\s*(AM|PM)/i);
          if (match) {
            let h = parseInt(match[1]);
            const m = parseInt(match[2]);
            const ampm = match[3].toUpperCase();
            if (ampm === 'PM' && h !== 12) h += 12;
            if (ampm === 'AM' && h === 12) h = 0;
            const d = new Date(); d.setHours(h, m, 0, 0);
            wakeMs = d.getTime();
          } else {
            const d = new Date(); d.setHours(6, 0, 0, 0); wakeMs = d.getTime();
          }
        } else {
          const d = new Date(); d.setHours(6, 0, 0, 0); wakeMs = d.getTime();
        }
        const bedD = new Date(); bedD.setHours(22, 0, 0, 0);
        const totalMinutes = Math.max(1, (bedD.getTime() - wakeMs) / 60000);
        const elapsedMinutes = Math.min(totalMinutes, Math.max(0, (Date.now() - wakeMs) / 60000));
        const expectedOz = Math.round((elapsedMinutes / totalMinutes) * waterGoal);
        const goalMet = water >= waterGoal;
        const pct = expectedOz > 0 ? Math.min(1, water / expectedOz) : 1;
        const statusLabel = goalMet ? 'Goal Met!' : pct >= 0.9 ? 'On Track' : pct >= 0.7 ? 'Behind' : 'Falling Behind';
        const statusColor = goalMet || pct >= 0.9 ? theme.statusGood : pct >= 0.7 ? theme.statusWarn : theme.statusBad;
        const cardScale = waterDetailAnim.interpolate({ inputRange: [0, 1], outputRange: [0.93, 1] });
        const presetsValid = waterPresetInputs.every(v => { const n = parseInt(v); return !isNaN(n) && n > 0; });
        const presetsChanged = waterPresetInputs.some((v, i) => { const n = parseInt(v); return !isNaN(n) && n > 0 && n !== waterPresets[i]; });
        const presetsSaveable = presetsValid && presetsChanged;
        const wakeLabel = sleepWakeTime
          ? sleepWakeTime.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })
          : sleepStoredWake ?? '6:00 AM';
        return (
          <Animated.View style={{ position:'absolute', top:0, bottom:0, left:0, right:0, backgroundColor: theme.overlayBg, zIndex:999, opacity: waterDetailAnim }}>
            <TouchableOpacity style={StyleSheet.absoluteFill} onPress={closeWaterDetailModal} activeOpacity={1} />
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={{ flex:1, justifyContent:'center', alignItems:'center' }}
              pointerEvents="box-none">
            <Animated.View style={{ width:'92%', maxHeight:'82%', backgroundColor: theme.bgSheet, borderRadius:16, borderWidth:0.5, borderColor: theme.borderCard, borderTopWidth:1.5, borderTopColor: theme.accentBlueRaw, overflow:'hidden', transform:[{scale: cardScale}] }}>
              {/* Handle + header always visible above scroll */}
              <TouchableOpacity onPress={closeWaterDetailModal} style={{ alignItems:'center', paddingTop:12, paddingBottom:8 }}>
                <View style={{ width:36, height:4, borderRadius:2, backgroundColor: theme.sheetHandle }} />
              </TouchableOpacity>
              <View style={{ paddingHorizontal:16, paddingBottom:12 }}>
                <Text style={{ fontSize:9, color: theme.accentBlueRaw, fontFamily:'DMSans_700Bold', letterSpacing:3, textTransform:'uppercase' }}>Water Log</Text>
              </View>
              <View style={{ height:0.5, backgroundColor: theme.borderCard, marginHorizontal:16 }} />
              {/* All sections scrollable so Daily Goal is reachable with keyboard open */}
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} nestedScrollEnabled={true} contentContainerStyle={{ flexGrow:1 }}>
              {/* Progress */}
              <View style={{ paddingHorizontal:16, paddingTop:14, paddingBottom:14 }}>
                <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                  <Text style={{ fontSize:9, color: theme.textMuted, fontFamily:'DMSans_700Bold', letterSpacing:2, textTransform:'uppercase' }}>Progress</Text>
                  <View style={{ backgroundColor: statusColor+'22', borderRadius:12, paddingHorizontal:8, paddingVertical:3 }}>
                    <Text style={{ fontSize:10, color: statusColor, fontFamily:'DMSans_700Bold', letterSpacing:1 }}>{statusLabel}</Text>
                  </View>
                </View>
                <View style={{ flexDirection:'row', marginBottom:12 }}>
                  <View style={{ flex:1 }}>
                    <Text style={{ fontSize:9, color: theme.textMuted, fontFamily:'DMSans_700Bold', letterSpacing:2, textTransform:'uppercase', marginBottom:2 }}>Logged</Text>
                    <Text style={{ fontSize:28, color: theme.accentBlueRaw, fontFamily:'BebasNeue_400Regular', letterSpacing:1 }}>
                      {water}<Text style={{ fontSize:14, color: theme.textMuted, fontFamily:'BebasNeue_400Regular' }}> oz</Text>
                    </Text>
                    <Text style={{ fontSize:10, color: theme.textDim, fontFamily:'DMSans_400Regular' }}>of {waterGoal} oz goal</Text>
                  </View>
                  {!goalMet ? (
                    <View style={{ flex:1, borderLeftWidth:0.5, borderLeftColor: theme.borderCard, paddingLeft:14 }}>
                      <Text style={{ fontSize:9, color: theme.textMuted, fontFamily:'DMSans_700Bold', letterSpacing:2, textTransform:'uppercase', marginBottom:2 }}>Expected Now</Text>
                      <Text style={{ fontSize:28, color: statusColor, fontFamily:'BebasNeue_400Regular', letterSpacing:1 }}>
                        {expectedOz}<Text style={{ fontSize:14, color: theme.textMuted, fontFamily:'BebasNeue_400Regular' }}> oz</Text>
                      </Text>
                      <Text style={{ fontSize:10, color: theme.textDim, fontFamily:'DMSans_400Regular' }}>by this time of day</Text>
                    </View>
                  ) : (
                    <View style={{ flex:1, borderLeftWidth:0.5, borderLeftColor: theme.borderCard, paddingLeft:14, justifyContent:'center' }}>
                      <Text style={{ fontSize:28, color: theme.statusGood, fontFamily:'BebasNeue_400Regular', letterSpacing:1 }}>Goal</Text>
                      <Text style={{ fontSize:20, color: theme.statusGood, fontFamily:'BebasNeue_400Regular', letterSpacing:1 }}>Complete</Text>
                    </View>
                  )}
                </View>
                <View style={{ height:8, backgroundColor: theme.bgProgressTrack, borderRadius:8, overflow:'hidden' }}>
                  <View style={{ height:'100%', borderRadius:8, backgroundColor: theme.accentBlue, width:`${Math.min(100, (water / waterGoal) * 100)}%` }} />
                </View>
              </View>
              <View style={{ height:0.5, backgroundColor: theme.borderCard, marginHorizontal:16 }} />
              {/* Entry Log */}
              <View style={{ paddingHorizontal:16, paddingTop:12, paddingBottom:4 }}>
                <Text style={{ fontSize:9, color: theme.textMuted, fontFamily:'DMSans_700Bold', letterSpacing:2, textTransform:'uppercase' }}>Entries</Text>
              </View>
              <ScrollView style={{ maxHeight:180 }} contentContainerStyle={{ paddingHorizontal:16, paddingBottom:8 }} showsVerticalScrollIndicator={false} nestedScrollEnabled={true} keyboardDismissMode="on-drag">
                {waterEntries.length === 0 ? (
                  <Text style={{ fontSize:12, color: theme.textDim, fontFamily:'DMSans_400Regular', textAlign:'center', paddingVertical:14 }}>No entries yet today</Text>
                ) : (
                  [...waterEntries].reverse().map((entry, displayIdx) => {
                    const realIdx = waterEntries.length - 1 - displayIdx;
                    const entryTime = new Date(entry.timestamp).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
                    return (
                      <View key={realIdx} style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingVertical:9, borderBottomWidth:0.5, borderBottomColor: theme.borderCard }}>
                        <Text style={{ fontSize:12, color: theme.textMuted, fontFamily:'DMSans_500Medium', width:68 }}>{entryTime}</Text>
                        <Text style={{ fontSize:14, color: entry.sign === 'add' ? theme.statusGood : theme.statusBad, fontFamily:'DMSans_600SemiBold', flex:1 }}>
                          {entry.sign === 'add' ? '+' : '-'}{entry.amount} oz
                        </Text>
                        <TouchableOpacity onPress={() => deleteWaterEntry(realIdx)} hitSlop={{top:8,bottom:8,left:12,right:8}}>
                          <Ionicons name="trash-outline" size={16} color={theme.accentRed} />
                        </TouchableOpacity>
                      </View>
                    );
                  })
                )}
              </ScrollView>
              <View style={{ height:0.5, backgroundColor: theme.borderCard, marginHorizontal:16 }} />
              {/* Presets */}
              <View style={{ paddingHorizontal:16, paddingTop:14, paddingBottom:16 }}>
                <Text style={{ fontSize:9, color: theme.textMuted, fontFamily:'DMSans_700Bold', letterSpacing:2, textTransform:'uppercase', marginBottom:10 }}>Quick Add Presets</Text>
                <View style={{ flexDirection:'row', gap:8, marginBottom:10 }}>
                  {([0,1,2] as const).map(i => (
                    <View key={i} style={{ flex:1, alignItems:'center' }}>
                      <TextInput
                        style={{ backgroundColor: theme.bgInput, borderWidth:0.5, borderColor: theme.borderInput, borderRadius:8, color: theme.textSecondary, padding:10, fontSize:18, fontFamily:'BebasNeue_400Regular', textAlign:'center', width:'100%' }}
                        value={waterPresetInputs[i]}
                        onChangeText={v => {
                          const cleaned = v.replace(/[^0-9]/g,'');
                          const next = [...waterPresetInputs] as [string,string,string];
                          next[i] = cleaned;
                          setWaterPresetInputs(next);
                        }}
                        keyboardType="number-pad"
                        placeholder={String(waterPresets[i])}
                        placeholderTextColor={theme.textPlaceholder}
                      />
                      <Text style={{ fontSize:9, color: theme.textDim, fontFamily:'DMSans_500Medium', marginTop:3 }}>oz</Text>
                    </View>
                  ))}
                </View>
                <TouchableOpacity
                  style={{ backgroundColor: presetsSaveable ? theme.accentBlueBg : theme.bgInput, borderWidth:1, borderColor: presetsSaveable ? theme.accentBlueBorder : theme.borderInput, borderRadius:8, padding:12, alignItems:'center', opacity: presetsSaveable ? 1 : 0.5 }}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); saveWaterPresets(); }}
                  disabled={!presetsSaveable}
                >
                  <Text style={{ color: presetsSaveable ? theme.accentBlue : theme.textDim, fontFamily:'DMSans_600SemiBold', fontSize:14 }}>Save Presets</Text>
                </TouchableOpacity>
              </View>
              <View style={{ height:0.5, backgroundColor: theme.borderCard, marginHorizontal:0, marginBottom:0, marginTop:0 }} />
              {/* Daily Goal */}
              <View style={{ paddingHorizontal:16, paddingTop:14, paddingBottom:20 }}>
                <Text style={{ fontSize:9, color: theme.textMuted, fontFamily:'DMSans_700Bold', letterSpacing:2, textTransform:'uppercase', marginBottom:10 }}>Daily Goal</Text>
                <View style={{ flexDirection:'row', gap:8, alignItems:'flex-start' }}>
                  <View style={{ flex:1 }}>
                    <TextInput
                      style={{ backgroundColor: theme.bgInput, borderWidth:0.5, borderColor: theme.borderInput, borderRadius:8, color: theme.textSecondary, padding:10, fontSize:18, fontFamily:'BebasNeue_400Regular', textAlign:'center', width:'100%' }}
                      value={waterGoalInput}
                      onChangeText={v => setWaterGoalInput(v.replace(/[^0-9]/g,''))}
                      keyboardType="number-pad"
                      placeholder={String(waterGoal)}
                      placeholderTextColor={theme.textPlaceholder}
                    />
                    <Text style={{ fontSize:9, color: theme.textDim, fontFamily:'DMSans_500Medium', marginTop:3, textAlign:'center' }}>oz</Text>
                  </View>
                  {(() => {
                    const goalInputNum = parseInt(waterGoalInput);
                    const goalSaveable = !isNaN(goalInputNum) && goalInputNum > 0 && goalInputNum !== waterGoal;
                    return (
                      <TouchableOpacity
                        style={{ flex:2, backgroundColor: goalSaveable ? theme.accentBlueBg : theme.bgInput, borderWidth:1, borderColor: goalSaveable ? theme.accentBlueBorder : theme.borderInput, borderRadius:8, padding:12, alignItems:'center', opacity: goalSaveable ? 1 : 0.5, marginTop:1 }}
                        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); saveWaterGoal(); }}
                        disabled={!goalSaveable}>
                        <Text style={{ color: goalSaveable ? theme.accentBlue : theme.textDim, fontFamily:'DMSans_600SemiBold', fontSize:14 }}>Save Goal</Text>
                      </TouchableOpacity>
                    );
                  })()}
                </View>
              </View>
              </ScrollView>
            </Animated.View>
            </KeyboardAvoidingView>
          </Animated.View>
        );
      })()}

      {/* ── Day Detail Modal ── */}
      {dayDetailDate !== null && (
        <Modal transparent animationType="none" visible={dayDetailDate !== null} onRequestClose={() => setDayDetailDate(null)} statusBarTranslucent hardwareAccelerated
          onShow={() => {
            dayDetailAnim.setValue(0);
            Animated.timing(dayDetailAnim, {
              toValue: 1,
              duration: 220,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }).start();
          }}>
          <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', opacity: dayDetailAnim, justifyContent: 'center', alignItems: 'center' }}>
            <TouchableOpacity style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} activeOpacity={1} onPress={closeDayDetail} />
            <Animated.View style={{
              width: '92%',
              height: '75%',
              borderRadius: 20,
              backgroundColor: theme.bgSheet,
              borderWidth: 0.5,
              borderColor: theme.borderSheet,
              overflow: 'hidden',
              opacity: dayDetailAnim,
            }}>
              <TouchableOpacity onPress={closeDayDetail} style={{ alignSelf: 'center', paddingVertical: 6, paddingHorizontal: 40 }}>
                <View style={[styles.editSheetHandle, { backgroundColor: theme.sheetHandle }]} />
              </TouchableOpacity>
              <DayDetailContent date={dayDetailDate} onClose={closeDayDetail} todayBurned={displayedBurned} />
            </Animated.View>
          </Animated.View>
        </Modal>
      )}

      {/* ── Main content ── */}
      <ScrollView
        ref={scrollRef}
        automaticallyAdjustKeyboardInsets={true}
        contentContainerStyle={{ padding:16, paddingBottom:80 }}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => { fetchTodayData(); setRefreshKey(k => k + 1); showToast('Health data refreshed', undefined, 'info'); }}
            tintColor={theme.accentBlue}
          />
        }
      >
        {visibleCards.map((id) => (
          <View key={id}>
            {renderCardById(id)}
          </View>
        ))}

        {/* Pinned graph cards */}
        {allStatsCards
          .filter(c => c.type === 'graph' && c.placement === 'both' && c.dataKey)
          .sort((a, b) => a.order - b.order)
          .map(card => (
            <StatsGraphCard
              key={card.id}
              card={card}
              cardTrendData={pinnedTrendData[card.id] ?? EMPTY_TREND_DATA}
              theme={theme}
              calTarget={calTarget}
              stepGoal={stepGoal}
              sleepGoal={sleepGoal}
              onPeriodChange={handlePinnedCardPeriodChange}
              onEditPress={(c) => setHomeEditCard(c)}
              showNetCarbs={showNetCarbs}
            />
          ))}
      </ScrollView>

      </LinearGradient>
      {/* ── Edit Layout tutorial: inline preview so TutorialOverlay can spotlight
           the drag handle and eye toggle without being behind the Modal layer ── */}
      {editTutorialMode && cardOrder.length > 0 && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }]}>
          <View style={[styles.editSheet, { backgroundColor: theme.bgSheet, borderColor: theme.borderSheet, borderWidth: 0.5, borderTopWidth: 1.5, borderTopColor: theme.accentBlueRaw }]}>
            {/* Handle bar */}
            <View style={{ alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 40 }}>
              <View style={[styles.editSheetHandle, { backgroundColor: theme.sheetHandle }]} />
            </View>
            {/* Header */}
            <View style={[styles.editSheetHeader, { borderBottomColor: theme.borderSubtle }]}>
              <Text style={{ fontSize: 13, color: theme.accentBlueRaw, fontFamily: 'DMSans_700Bold', letterSpacing: 2, textTransform: 'uppercase' }}>Edit Layout</Text>
              <View style={{ backgroundColor: theme.accentGreenBg, borderWidth: 1, borderColor: theme.accentGreenBorder, borderRadius: 6, paddingHorizontal: 14, paddingVertical: 6, height: 32, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: theme.accentGreen, fontSize: 12, fontFamily: 'DMSans_700Bold', letterSpacing: 1 }}>DONE</Text>
              </View>
            </View>
            {/* Segmented tabs -- dynamic, reflects editTab state */}
            <View ref={editLayoutTabsRef} collapsable={false} style={{ flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10 }}>
              <View style={{ flex: 1, flexDirection: 'row', backgroundColor: theme.bgInput, borderRadius: 10, padding: 3 }}>
                <View style={{ flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', backgroundColor: editTab === 'my' ? theme.accentBlueRaw : 'transparent' }}>
                  <Text style={{ fontSize: 11, fontFamily: 'DMSans_700Bold', letterSpacing: 1.5, textTransform: 'uppercase', color: editTab === 'my' ? '#ffffff' : theme.textMuted }}>My Cards</Text>
                </View>
                <View style={{ flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', backgroundColor: editTab === 'add' ? theme.accentBlueRaw : 'transparent' }}>
                  <Text style={{ fontSize: 11, fontFamily: 'DMSans_700Bold', letterSpacing: 1.5, textTransform: 'uppercase', color: editTab === 'add' ? '#ffffff' : theme.textMuted }}>Add Cards</Text>
                </View>
              </View>
            </View>
            {/* MY CARDS tab */}
            {editTab === 'my' && (
              <ScrollView showsVerticalScrollIndicator={false} scrollEnabled={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}>
                {cardOrder.slice(0, 4).map((id, idx) => {
                  const cardMeta = CARD_REGISTRY.find(c => c.id === id);
                  if (!cardMeta) return null;
                  const isVisible = cardVisible[id];
                  const isFirst = idx === 0;
                  return (
                    <View key={id} style={styles.editCardRow}>
                      <View ref={isFirst ? editLayoutEyeRef : undefined} collapsable={false}>
                        <TouchableOpacity
                          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); toggleCardVisible(id); }}
                          style={[styles.editBadge, { backgroundColor: isVisible ? theme.accentRedBg : theme.accentGreenBg, borderColor: isVisible ? theme.accentRedBorder : theme.accentGreenBorder }]}
                        >
                          <Ionicons name={isVisible ? 'remove' : 'add'} size={14} color={isVisible ? theme.accentRed : theme.accentGreen} />
                        </TouchableOpacity>
                      </View>
                      <View style={[styles.editCardPreview, { backgroundColor: theme.bgEditCard, borderColor: theme.borderCard }, !isVisible && { opacity: 0.35 }]}>
                        <Text style={[styles.editCardLabel, { color: theme.textPrimary }]}>{cardMeta.label}</Text>
                        <Text style={[styles.editCardDesc, { color: theme.textDim }]}>{cardMeta.description}</Text>
                      </View>
                      <View ref={isFirst ? editLayoutDragRef : undefined} collapsable={false}>
                        <View style={styles.dragHandle}>
                          <Ionicons name="menu-outline" size={20} color={theme.textDim} />
                        </View>
                      </View>
                    </View>
                  );
                })}
                {cardOrder.length > 4 && (
                  <Text style={{ fontSize: 11, color: theme.textDim, fontFamily: 'DMSans_400Regular', marginTop: 8, textAlign: 'center' }}>
                    + {cardOrder.length - 4} more card{cardOrder.length - 4 !== 1 ? 's' : ''}
                  </Text>
                )}
              </ScrollView>
            )}
            {/* ADD CARDS tab */}
            {editTab === 'add' && (
              <ScrollView showsVerticalScrollIndicator={false} scrollEnabled={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}>
                <Text style={{ fontSize: 9, letterSpacing: 2, color: theme.textMuted, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase', marginBottom: 8, marginTop: 4 }}>Home Cards</Text>
                {CARD_REGISTRY.filter(m => !cardVisible[m.id]).length === 0 ? (
                  <Text style={{ fontSize: 12, color: theme.textDim, fontFamily: 'DMSans_400Regular', marginBottom: 12 }}>All cards are currently visible.</Text>
                ) : (
                  CARD_REGISTRY.filter(m => !cardVisible[m.id]).map(m => (
                    <View key={m.id} style={styles.editCardRow}>
                      <View style={[styles.editBadge, { backgroundColor: theme.accentGreenBg, borderColor: theme.accentGreenBorder }]}>
                        <Ionicons name="add" size={14} color={theme.accentGreen} />
                      </View>
                      <View style={[styles.editCardPreview, { backgroundColor: theme.bgEditCard, borderColor: theme.borderCard }]}>
                        <Text style={[styles.editCardLabel, { color: theme.textPrimary }]}>{m.label}</Text>
                        <Text style={[styles.editCardDesc, { color: theme.textDim }]}>{m.description}</Text>
                      </View>
                      <View style={[styles.dragHandle, { opacity: 0 }]}>
                        <Ionicons name="menu-outline" size={20} color={theme.textDim} />
                      </View>
                    </View>
                  ))
                )}
                <Text style={{ fontSize: 9, letterSpacing: 2, color: theme.textMuted, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase', marginBottom: 8, marginTop: 12 }}>Custom Stats Graphs</Text>
                {allStatsCards.filter(c => c.type === 'graph' && c.placement !== 'both').length === 0 ? (
                  <Text style={{ fontSize: 12, color: theme.textDim, fontFamily: 'DMSans_400Regular' }}>Build a graph in the Stats tab to pin it here for a quick home screen view.</Text>
                ) : (
                  allStatsCards.filter(c => c.type === 'graph' && c.placement !== 'both').slice(0, 3).map(card => (
                    <View key={card.id} style={styles.editCardRow}>
                      <View style={[styles.editBadge, { backgroundColor: theme.accentGreenBg, borderColor: theme.accentGreenBorder }]}>
                        <Ionicons name="add" size={14} color={theme.accentGreen} />
                      </View>
                      <View style={[styles.editCardPreview, { backgroundColor: theme.bgEditCard, borderColor: theme.borderCard }]}>
                        <Text style={[styles.editCardLabel, { color: theme.textPrimary }]}>{card.label}</Text>
                        <Text style={[styles.editCardDesc, { color: theme.textDim }]}>{card.period}D graph</Text>
                      </View>
                      <View style={[styles.dragHandle, { opacity: 0 }]}>
                        <Ionicons name="menu-outline" size={20} color={theme.textDim} />
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>
            )}
          </View>
        </View>
      )}

      {/* ── Edit Layout: normal Modal ── */}
      {editModalVisible && !editTutorialMode && (
        <Modal transparent animationType="none" visible={editModalVisible} onRequestClose={exitEditMode} statusBarTranslucent hardwareAccelerated
          onShow={() => {
            editSheetAnim.setValue(0);
            Animated.timing(editSheetAnim, {
              toValue: 1,
              duration: 220,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }).start();
          }}>
          <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', opacity: editSheetAnim, justifyContent: 'center', alignItems: 'center' }}>
            <TouchableOpacity style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} activeOpacity={1} onPress={exitEditMode} />
            <Animated.View style={[styles.editSheet, {
              backgroundColor: theme.bgSheet,
              borderColor: theme.borderSheet,
              borderTopWidth: 1.5,
              borderTopColor: theme.accentBlueRaw,
              opacity: editSheetAnim,
            }]}>
            <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); exitEditMode(); }} style={{ alignSelf:'center', paddingVertical:10, paddingHorizontal:40 }}>
              <View style={[styles.editSheetHandle, { backgroundColor: theme.sheetHandle }]} />
            </TouchableOpacity>
            {/* Header row */}
            <View style={[styles.editSheetHeader, { borderBottomColor: theme.borderSubtle }]}>
              <Text style={{ fontSize:13, color: theme.accentBlueRaw, fontFamily:'DMSans_700Bold', letterSpacing:2, textTransform:'uppercase' }}>Edit Layout</Text>
              <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); exitEditMode(); }}
                style={{ backgroundColor: theme.accentGreenBg, borderWidth:1, borderColor: theme.accentGreenBorder, borderRadius:6, paddingHorizontal:14, paddingVertical:6, height:32, alignItems:'center', justifyContent:'center' }}>
                <Text style={{ color: theme.accentGreen, fontSize:12, fontFamily:'DMSans_700Bold', letterSpacing:1 }}>DONE</Text>
              </TouchableOpacity>
            </View>

            {/* Segmented control tabs */}
            <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10 }}>
              <View style={{ flex: 1, flexDirection: 'row', backgroundColor: theme.bgInput, borderRadius: 10, padding: 3 }}>
                {(['my', 'add'] as const).map(tab => (
                  <TouchableOpacity key={tab} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setEditTab(tab); }}
                    style={{ flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center',
                      backgroundColor: editTab === tab ? theme.accentBlueRaw : 'transparent',
                    }}>
                    <Text style={{ fontSize: 11, fontFamily: 'DMSans_700Bold', letterSpacing: 1.5, textTransform: 'uppercase',
                      color: editTab === tab ? '#ffffff' : theme.textMuted }}>
                      {tab === 'my' ? 'My Cards' : 'Add Cards'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* MY CARDS tab */}
            {editTab === 'my' && (
              <View style={{ flex: 1 }}>
              <DraggableFlatList
                data={cardOrder}
                keyExtractor={(item) => item}
                contentContainerStyle={{ paddingHorizontal:16, paddingBottom: 20 }}
                onDragEnd={({ data }) => {
                  setCardOrder(data);
                  saveLayout(data, cardVisible);
                }}
                renderItem={({ item: id, drag, isActive }: RenderItemParams<CardId>) => {
                  const meta = CARD_REGISTRY.find(c => c.id === id)!;
                  const visible = cardVisible[id];
                  const isFirstCard = id === cardOrder[0];
                  return (
                    <ScaleDecorator>
                      <View style={[styles.editCardRow, isActive && { opacity: 0.85 }]}>
                        <View ref={isFirstCard ? editLayoutEyeRef : undefined} collapsable={false}>
                          <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); toggleCardVisible(id); }}
                            style={[styles.editBadge, { backgroundColor: visible ? theme.accentRedBg : theme.accentGreenBg, borderColor: visible ? theme.accentRedBorder : theme.accentGreenBorder }]}>
                            <Ionicons name={visible ? 'remove' : 'add'} size={14} color={visible ? theme.accentRed : theme.accentGreen} />
                          </TouchableOpacity>
                        </View>
                        <View style={[styles.editCardPreview, { backgroundColor: theme.bgEditCard, borderColor: theme.borderCard }, !visible && { opacity:0.35 }]}>
                          <Text style={[styles.editCardLabel, { color: theme.textPrimary }]}>{meta.label}</Text>
                          <Text style={[styles.editCardDesc, { color: theme.textDim }]}>{meta.description}</Text>
                        </View>
                        <View ref={isFirstCard ? editLayoutDragRef : undefined} collapsable={false}>
                          <TouchableOpacity onLongPress={drag} delayLongPress={0} style={styles.dragHandle}>
                            <Ionicons name="menu-outline" size={20} color={theme.textDim} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </ScaleDecorator>
                  );
                }}
                ListFooterComponent={(() => {
                  const pinned = allStatsCards.filter(c => c.type === 'graph' && c.placement === 'both');
                  if (pinned.length === 0) return <View style={{ height: 20 }} />;
                  return (
                    <>
                      <View style={{ paddingTop: 16, paddingBottom: 8, borderTopWidth: 0.5, borderTopColor: theme.borderSubtle, marginTop: 8, paddingHorizontal: 0 }}>
                        <Text style={{ fontSize: 9, letterSpacing: 2, color: theme.textMuted, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase' }}>Pinned Graphs</Text>
                      </View>
                      {pinned.map(card => {
                        const graphMeta = card.dataKey ? DATA_KEY_META[card.dataKey as keyof typeof DATA_KEY_META] : null;
                        return (
                          <View key={card.id} style={styles.editCardRow}>
                            <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); unpinGraphCard(card.id); }}
                              style={[styles.editBadge, { backgroundColor: theme.accentRedBg, borderColor: theme.accentRedBorder }]}>
                              <Ionicons name="remove" size={14} color={theme.accentRed} />
                            </TouchableOpacity>
                            <View style={[styles.editCardPreview, { backgroundColor: theme.bgEditCard, borderColor: theme.borderCard }]}>
                              <Text style={[styles.editCardLabel, { color: theme.textPrimary }]}>{card.label}</Text>
                              <Text style={[styles.editCardDesc, { color: theme.textDim }]}>{graphMeta?.description ?? 'Graph card'} · {card.period}D</Text>
                            </View>
                            <View style={[styles.dragHandle, { opacity: 0 }]}>
                              <Ionicons name="menu-outline" size={20} color={theme.textDim} />
                            </View>
                          </View>
                        );
                      })}
                      <View style={{ height: 20 }} />
                    </>
                  );
                })()}
              />
              </View>
            )}

            {/* ADD CARDS tab */}
            {editTab === 'add' && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}>
                <Text style={{ fontSize: 9, letterSpacing: 2, color: theme.textMuted, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase', marginBottom: 8, marginTop: 4 }}>Home Cards</Text>
                {CARD_REGISTRY.filter(meta => !cardVisible[meta.id]).length === 0 ? (
                  <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, color: theme.textDim, fontFamily: 'DMSans_400Regular' }}>All home cards are active</Text>
                  </View>
                ) : (
                  CARD_REGISTRY.filter(meta => !cardVisible[meta.id]).map(meta => (
                    <TouchableOpacity key={meta.id}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); toggleCardVisible(meta.id); setEditTab('my'); }}
                      style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: theme.borderSubtle, gap: 12 }}>
                      <View style={[styles.editBadge, { backgroundColor: theme.accentGreenBg, borderColor: theme.accentGreenBorder }]}>
                        <Ionicons name="add" size={14} color={theme.accentGreen} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontFamily: 'DMSans_600SemiBold', color: theme.textPrimary, marginBottom: 2 }}>{meta.label}</Text>
                        <Text style={{ fontSize: 11, fontFamily: 'DMSans_400Regular', color: theme.textDim }}>{meta.description}</Text>
                      </View>
                    </TouchableOpacity>
                  ))
                )}

                <View style={{ marginTop: 20, marginBottom: 8, borderTopWidth: 0.5, borderTopColor: theme.borderSubtle, paddingTop: 16 }}>
                  <Text style={{ fontSize: 9, letterSpacing: 2, color: theme.textMuted, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase', marginBottom: 8 }}>Graphs</Text>
                </View>
                {allStatsCards.filter(c => c.type === 'graph' && c.placement !== 'both').length === 0 ? (
                  <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, color: theme.textDim, fontFamily: 'DMSans_400Regular' }}>All graphs are pinned to home</Text>
                  </View>
                ) : (
                  allStatsCards.filter(c => c.type === 'graph' && c.placement !== 'both').map(card => {
                    const graphMeta = card.dataKey ? DATA_KEY_META[card.dataKey as keyof typeof DATA_KEY_META] : null;
                    return (
                      <TouchableOpacity key={card.id}
                        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); pinGraphCard(card); }}
                        style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: theme.borderSubtle, gap: 12 }}>
                        <View style={[styles.editBadge, { backgroundColor: theme.accentGreenBg, borderColor: theme.accentGreenBorder }]}>
                          <Ionicons name="add" size={14} color={theme.accentGreen} />
                        </View>
                        {graphMeta && <Ionicons name={graphMeta.icon as any} size={18} color={theme.textMuted} />}
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 14, fontFamily: 'DMSans_600SemiBold', color: theme.textPrimary, marginBottom: 2 }}>{card.label}</Text>
                          <Text style={{ fontSize: 11, fontFamily: 'DMSans_400Regular', color: theme.textDim }}>
                            {graphMeta?.description ?? 'Graph'} · {card.period}D
                          </Text>
                        </View>
                        <View style={{ backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 9, fontFamily: 'DMSans_700Bold', color: theme.accentBlue, letterSpacing: 1 }}>{card.period}D</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>
            )}

            </Animated.View>
          </Animated.View>
        </Modal>
      )}

      <StatsCardEditModal
        card={homeEditCard}
        onClose={() => setHomeEditCard(null)}
        onSave={handleHomeCardSave}
        onDelete={handleHomeCardDelete}
        theme={theme}
      />

      {/* ── Macro gear modal ── */}
      <Modal visible={showMacroGearSheet} transparent animationType="slide" onRequestClose={() => setShowMacroGearSheet(false)}>
        <TouchableOpacity style={{ flex:1, backgroundColor:'rgba(0,0,0,0.55)', justifyContent:'flex-end' }} activeOpacity={1} onPress={() => setShowMacroGearSheet(false)}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={{ backgroundColor: theme.bgSheet, borderTopLeftRadius:18, borderTopRightRadius:18, borderTopWidth:1.5, borderTopColor: theme.accentBlueRaw, borderLeftWidth:0.5, borderRightWidth:0.5, borderColor: theme.borderCard, paddingTop:12, paddingHorizontal:20, paddingBottom: insets.bottom + 20 }}>
              <View style={{ width:36, height:4, borderRadius:2, backgroundColor: theme.sheetHandle, alignSelf:'center', marginBottom:18 }} />
              <Text style={{ fontSize:9, color: theme.textMuted, fontFamily:'DMSans_700Bold', letterSpacing:3, textTransform:'uppercase', marginBottom:16 }}>Macro Display</Text>
              <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
                <View style={{ flex:1, paddingRight:12 }}>
                  <Text style={{ fontSize:15, color: theme.textPrimary, fontFamily:'DMSans_600SemiBold', marginBottom:3 }}>Net Carbs</Text>
                  <Text style={{ fontSize:12, color: theme.textMuted, fontFamily:'DMSans_400Regular', lineHeight:17 }}>
                    Show carbs as total minus fiber and sugar alcohols everywhere in the app.
                  </Text>
                </View>
                <ToggleSwitch value={showNetCarbs} onValueChange={toggleNetCarbs} />
              </View>
              {showNetCarbs && (
                <Text style={{ fontSize:11, color: theme.textDim, fontFamily:'DMSans_400Regular', lineHeight:16, marginTop:12 }}>
                  Tip: you can set a specific net carbs goal in Settings {'>'} Goals.
                </Text>
              )}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* First-use disclaimer gate, shown before the very first Day Summary */}
      {dayScoreDisclaimer && (
        <DayScoreDisclaimerModal
          theme={theme}
          onAcknowledge={() => {
            storageSet('pj_dayscore_disclaimer_seen', 'true');
            setDaySummary(dayScoreDisclaimer);
            setDayScoreDisclaimer(null);
          }}
        />
      )}

      {/* Morning Day Summary pop-up (yesterday's Day Score) */}
      {daySummary && (
        <DaySummaryModal
          score={daySummary.score}
          dateKey={daySummary.dateKey}
          theme={theme}
          styleMode={styleMode}
          faithJourney={faithJourney}
          onClose={() => setDaySummary(null)}
          onViewSummary={() => { setDaySummary(null); archiveNav.pending = true; router.push('/(tabs)/stats'); }}
        />
      )}

    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:        { flex:1 },
  header:           { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:20, paddingVertical:16, borderBottomWidth:0.5, marginBottom:16 },
  headerLabel:      { fontSize:9, letterSpacing:2, textTransform:'uppercase', marginBottom:2, fontFamily:'DMSans_700Bold' },
  headerTitle:      { fontSize:32, fontWeight:'700', fontFamily:'BebasNeue_400Regular', letterSpacing:2 },
  headerBtn:        { borderWidth:1, borderRadius:6, paddingHorizontal:12, paddingVertical:6, height:32, alignItems:'center', justifyContent:'center' },
  card:             { borderWidth:0.5, borderRadius:14, padding:16, marginBottom:12, borderTopWidth:1.5, shadowColor: '#000000', shadowOffset: { width:0, height:4 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6 },
  cardLabel:        { fontSize:10, letterSpacing:3, textTransform:'uppercase', fontFamily:'DMSans_700Bold', marginBottom:10 },
  verseCard:        { borderWidth:2, borderRadius:14, padding:16, marginBottom:12, shadowColor: '#000000', shadowOffset: { width:0, height:4 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6 },
  verseLabel:       { fontSize:9, letterSpacing:3, textTransform:'uppercase', marginBottom:8, fontFamily:'DMSans_700Bold' },
  verseText:        { fontSize:14, fontStyle:'italic', lineHeight:24, marginBottom:10, fontFamily:'DMSans_400Regular', textAlign:'center' },
  verseRef:         { fontSize:9, fontFamily:'DMSans_700Bold', textAlign:'center', letterSpacing:2, textTransform:'uppercase' },
  calRow:           { flexDirection:'row', alignItems:'baseline', gap:6, marginBottom:10 },
  calNumber:        { fontSize:52, lineHeight:56, fontFamily:'BebasNeue_400Regular', letterSpacing:1 },
  calTarget:        { fontSize:14, fontFamily:'DMSans_700Bold', letterSpacing: 0.3 },
  calRemaining:     { fontSize:12, fontFamily:'DMSans_400Regular' },
  progressBarBg:    { height:6, borderRadius:6, overflow:'hidden', marginBottom:12 },
  progressBarFill:  { height:'100%', borderRadius:6 },
  waterBtns:        { flexDirection:'row', gap:8 },
  waterBtn:         { flex:1, padding:10, borderWidth:1, borderRadius:6, alignItems:'center', justifyContent:'center' },
  waterBtnText:     { fontFamily:'BebasNeue_400Regular', fontSize:15, letterSpacing:1 },
  waterBtnRed:      { flex:1, padding:10, borderWidth:1, borderRadius:6, alignItems:'center', justifyContent:'center' },
  waterBtnRedText:  { fontFamily:'BebasNeue_400Regular', fontSize:15, letterSpacing:1 },
  weightRow:        { flexDirection:'row', gap:12, marginBottom:10 },
  weightStat:       { flex:1 },
  weightVal:        { fontSize:28, lineHeight:32, fontFamily:'BebasNeue_400Regular', letterSpacing:1 },
  weightLbl:        { fontSize:10, letterSpacing:2, textTransform:'uppercase', marginTop:2, fontFamily:'DMSans_500Medium' },
  weightAdd:        { flexDirection:'row', gap:8 },
  weightInput:      { flex:1, borderWidth:1, borderRadius:6, padding:10, fontSize:14, fontFamily:'DMSans_400Regular' },
  logBtn:           { borderWidth:1, borderRadius:6, paddingHorizontal:16, justifyContent:'center' },
  logBtnText:       { fontFamily:'BebasNeue_400Regular', fontSize:16, letterSpacing:1 },
  workoutRow:       { flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  workoutDay:       { fontSize:22, letterSpacing:1, fontFamily:'BebasNeue_400Regular' },
  workoutMuscles:   { fontSize:12, marginTop:2, fontFamily:'DMSans_400Regular' },
  workoutPill:      { paddingHorizontal:12, paddingVertical:4, borderRadius:20, borderWidth:1 },
  workoutPillText:  { fontSize:10, letterSpacing:2, fontFamily:'DMSans_600SemiBold' },
  notesInput:       { borderWidth:1, borderRadius:6, padding:10, fontSize:13, minHeight:80, textAlignVertical:'top', marginTop:8, fontFamily:'DMSans_400Regular' },
  saveBtn:          { marginTop:8, padding:10, borderWidth:1, borderRadius:6, alignItems:'center' },
  saveBtnText:      { fontSize:12, fontFamily:'DMSans_500Medium' },
  // Edit sheet
  editSheet:        { width:'92%', borderRadius:20, maxHeight:'72%', borderWidth:0.5, paddingBottom:20, flex:1 },
  editSheetHandle:  { width:36, height:4, borderRadius:2, alignSelf:'center', marginTop:12, marginBottom:12 },
  editSheetHeader:  { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingBottom:16, borderBottomWidth:0.5, marginBottom:8 },
  // Edit mode
  editCardRow:      { flexDirection:'row', alignItems:'center', gap:10, marginBottom:10 },
  editBadge:        { width:28, height:28, borderRadius:14, borderWidth:1, alignItems:'center', justifyContent:'center' },
  editCardPreview:  { flex:1, borderWidth:0.5, borderRadius:10, paddingHorizontal:14, paddingVertical:10 },
  editCardLabel:    { fontSize:13, fontFamily:'DMSans_600SemiBold', marginBottom:2 },
  editCardDesc:     { fontSize:11, fontFamily:'DMSans_400Regular' },
  dragHandle:       { padding:8 },
});