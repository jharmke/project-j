import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useScrollToTop } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, AppState, Dimensions, Easing, Keyboard, KeyboardAvoidingView, Modal, NativeScrollEvent, NativeSyntheticEvent, Platform, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import ReAnimated, { useAnimatedStyle, useAnimatedProps, useSharedValue, withTiming, withRepeat, withSequence, withDelay, cancelAnimation, Easing as ReAnimEasing } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import PressableButton from '../../components/PressableButton';
import { useToast, ToastRenderer } from '../../components/Toast';
import { showCelebration } from '../../components/CelebrationOverlay';
import { showAchievementToast, showDailyGoalToast } from '../../components/AchievementToast';
import { ACHIEVEMENTS, AchievementsStore, checkAndUnlock, loadAchievements, weightEntryIsPlausible, getWeightMilestonesCrossed, isGoalWeightHit, handleDailyGoalHit, checkMomentumAchievements, checkSleepAchievements, getCelebTier } from '../../achievementData';
import { loadFromFirebase, saveToFirebase } from '../../firebaseConfig';
import { storageSet } from '../../utils/storage';
import { cancelWaterPaceNotification, cancelWeeklySummaryNotification, cancelMonthlySummaryNotification } from '../../services/notifications';
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
import { calcSleepScore, sleepScoreColor } from '../../utils/sleepScore';
import { runDayScoreScan } from '../../utils/dayScoreStore';
import { checkAndGenerateWeeklySummary, getLastClosedWeekStart, loadWeeklySummary, generateWeeklySummary, WeeklySummaryData } from '../../utils/weeklySummary';
import { checkAndGenerateMonthly, getLastClosedMonth, loadMonthlySummary, generateMonthlySummary, MonthlySummaryData } from '../../utils/monthlySummary';
import { DayScore } from '../../utils/dayScore';
import DaySummaryModal from '../../components/DaySummaryModal';
import SummaryReadyModal from '../../components/SummaryReadyModal';
import DayScoreDisclaimerModal from '../../components/DayScoreDisclaimerModal';
import { StatsGraphCard } from '../../components/StatsGraphCard';
import { StatsCardEditModal } from '../../components/StatsCardEditModal';
import { saveStatsCards } from '../../statsCardRegistry';
import { useTutorial, isTutorialSeen } from '../../context/TutorialContext';
import { useTutorialTarget } from '../../hooks/useTutorialTarget';
import { showToolkit } from '../../components/ToolkitSheet';
import ToggleSwitch from '../../components/ToggleSwitch';
import { StoredTip, loadSmartTips, CoachTipCache, loadCoachTipCacheSleep, loadCoachTipCacheRecovery } from '../../utils/smartTipsEngine';
import { refreshCoachTip, resolveTipBody, resolveTipTitle, refreshCoachTipSleep } from '../../utils/coachAI';
import NutrientDrilldownModal, { DrilldownItem, computeNetCarbsForEntry } from '../../components/NutrientDrilldownModal';
import AnimatedNumber from '../../components/AnimatedNumber';
import SleepDonut from '../../components/SleepDonut';
import { recoveryZone, calcRecoveryScore } from '../../utils/recoveryScore';
import GradientCard, { CardWash } from '../../components/GradientCard';
import {
  loadActiveChallenge, saveActiveChallenge, clearActiveChallenge, appendChallengeHistory,
  computeChallengeProgress, challengeStatus, challengeTitle,
  Challenge, ChallengeProgress, ChallengeMetric,
} from '../../utils/challenges';
import { METRIC_META } from '../../utils/comparisonEngine';
import { getVacation, endVacationEarly, vacationTodayKey, addDaysKey, VacationState } from '../../utils/vacationMode';

const RECOVERY_PURPLE = '#9b7adb';
const CAROUSEL_PAGE_W = Dimensions.get('window').width - 32;

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
  { id: 'sleep',          label: 'Sleep & Recovery',   description: 'Sleep score + Recovery Score in one card', defaultVisible: true },
  // fitness_metrics card RETIRED 2026-06-17 -- RHR/Resp/SpO2 duplicated the Recovery card.
  // Kept out of the registry (so it never renders / shows in Edit Layout) but the CardId
  // member + renderFitnessMetricsCard() + render case are intentionally preserved for a
  // fast restore if we rethink it (VO2 Max + Cardio Recovery capacity card). See backlog.
  { id: 'daily_note',       label: 'Daily Note',         description: 'Journal entry for the day',             defaultVisible: true },
  { id: 'gratitude_streak', label: 'Gratitude Streak',  description: 'Daily gratitude habit tracker',          defaultVisible: false },
  { id: 'reading_plans',    label: 'Reading Plans',      description: 'Daily Bible reading plan tracker',       defaultVisible: true },
  { id: 'vs_yesterday',     label: 'Challenge',          description: 'Your active challenge, live', defaultVisible: true },
];

export const DEFAULT_ORDER: CardId[] = [
  'verse', 'smart_tip', 'calories', 'macros', 'water', 'weight', 'workout',
  'steps', 'sleep', 'gratitude_streak', 'reading_plans',
  'daily_note', 'vs_yesterday',
];
export const DEFAULT_VISIBLE: Record<CardId, boolean> = Object.fromEntries(
  CARD_REGISTRY.map(c => [c.id, c.defaultVisible])
) as Record<CardId, boolean>;



// Mode-specific default card orders. Applied on fresh install, and on demand when
// the user picks "Use defaults" in the Settings coaching-mode switch modal.
export const DISCIPLINE_ORDER: CardId[] = [
  'verse', 'calories', 'workout', 'sleep', 'macros', 'steps', 'water', 'weight',
  'vs_yesterday', 'gratitude_streak', 'reading_plans', 'daily_note',
];
export const MINDFUL_ORDER: CardId[] = [
  'verse', 'gratitude_streak', 'sleep', 'calories', 'workout', 'water', 'steps',
  'weight', 'reading_plans', 'daily_note', 'vs_yesterday',
];
// Mindful hides macros by default -- users can add via Edit Layout
export const MINDFUL_VISIBLE: Record<CardId, boolean> = {
  ...DEFAULT_VISIBLE,
  macros: false,
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

// SleepDonut extracted to components/SleepDonut.tsx (shared with the Sleep Hub hero).

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
  const editLayoutBtnRef  = useTutorialTarget('edit_layout_btn');
  const editLayoutDragRef = useTutorialTarget('edit_layout_drag');
  const editLayoutEyeRef  = useTutorialTarget('edit_layout_eye');
  const editLayoutTabsRef = useTutorialTarget('edit_layout_tabs');
  // showAchievementToast is now a direct import

  // Vacation Mode banner
  const [vacationBanner, setVacationBanner] = useState<VacationState | null>(null);

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

  // Single source of truth for the water total: sum the entries (add = +, remove = -).
  // The "Logged" number always derives from this so it can never disagree with the entries shown.
  const waterTotalFromEntries = (entries: { amount: number; sign: 'add'|'remove' }[]): number =>
    Math.max(0, entries.reduce((sum, e) => sum + (e.sign === 'add' ? e.amount : -e.amount), 0));

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
      cancelWaterPaceNotification();
      const { fired, count: hitCount } = await handleDailyGoalHit('water');
      if (fired) {
        showCelebration('small', 'WATER GOAL'); showDailyGoalToast('Water Goal', hitCount, 'water', '#3b82f6');
        let s = achievementStore;
        const hydrationMilestones = [
          { id: 'hydration_first', threshold: 1   },
          { id: 'hydration_10',   threshold: 10  },
          { id: 'hydration_30',   threshold: 30  },
          { id: 'hydration_50',   threshold: 50  },
          { id: 'hydration_75',   threshold: 75  },
          { id: 'hydration_100',  threshold: 100 },
          { id: 'hydration_200',  threshold: 200 },
          { id: 'hydration_365',  threshold: 365 },
        ];
        for (const m of hydrationMilestones) {
          if (hitCount >= m.threshold) s = await handleAchievementUnlock(m.id, s);
        }
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

  const openWaterEntryEdit = (idx: number) => {
    const entry = waterEntries[idx];
    if (!entry) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setEditWaterAmount(String(entry.amount));
    setEditWaterSign(entry.sign);
    setEditingWaterIdx(idx);
    editWaterAnim.setValue(0);
    Animated.timing(editWaterAnim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
  };

  const closeWaterEntryEdit = () => {
    Animated.timing(editWaterAnim, { toValue: 0, duration: 140, useNativeDriver: true }).start(() => setEditingWaterIdx(null));
  };

  // Edit one water entry's amount/sign, recompute the day total, read-then-merge into pj_<date>.
  // Never overwrites other day fields; mirrors doWaterUpdate/deleteWaterEntry. No goal celebration
  // on edit (correction, not a fresh log) -- matches deleteWaterEntry's behavior.
  const saveWaterEntryEdit = async () => {
    if (editingWaterIdx === null) return;
    const amt = parseInt(editWaterAmount);
    if (isNaN(amt) || amt <= 0) return;
    const newEntries = waterEntries.map((e, i) =>
      i === editingWaterIdx ? { ...e, amount: amt, sign: editWaterSign } : e
    );
    const newWater = Math.max(0, newEntries.reduce(
      (sum, e) => sum + (e.sign === 'add' ? e.amount : -e.amount), 0
    ));
    setWater(newWater);
    setWaterEntries(newEntries);
    const existing = await AsyncStorage.getItem(`pj_${todayKey}`);
    const current = existing ? JSON.parse(existing) : {};
    await storageSet(`pj_${todayKey}`, JSON.stringify({ ...current, water: newWater, waterEntries: newEntries, waterGoal }));
    saveToFirebase(todayKey, 'water', newWater);
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    showToast('Entry updated', `${newWater} oz total`, 'success');
    closeWaterEntryEdit();
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
  // Edit-entry state for the water log (amount + sign). Index into waterEntries; null = closed.
  const [editingWaterIdx, setEditingWaterIdx] = useState<number | null>(null);
  const [editWaterAmount, setEditWaterAmount] = useState('');
  const [editWaterSign, setEditWaterSign]     = useState<'add'|'remove'>('add');
  const editWaterAnim = useRef(new Animated.Value(0)).current;
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
  const [todayEntries,   setTodayEntries]   = useState<any[]>([]);
  const [showMacroDrilldown, setShowMacroDrilldown] = useState(false);
  const [macroDrilldownItem, setMacroDrilldownItem] = useState<DrilldownItem | null>(null);
  const [showMacroGearSheet, setShowMacroGearSheet] = useState(false);
  const macroScaleAnim   = useRef(new Animated.Value(0.92)).current;
  const macroOpacityAnim = useRef(new Animated.Value(0)).current;
  const [macroPreset, setMacroPreset] = useState<string | null>(null);
  const MACRO_PRESETS: Record<string, { label: string; p: number; c: number; f: number; icon: any }> = {
    high_protein: { label: 'High Protein', p: 35, c: 35, f: 30, icon: 'barbell' },
    balanced:     { label: 'Balanced',     p: 30, c: 40, f: 30, icon: 'pie-chart' },
    low_carb:     { label: 'Low Carb',     p: 35, c: 25, f: 40, icon: 'leaf' },
    performance:  { label: 'Performance',  p: 25, c: 50, f: 25, icon: 'flash' },
  };
  const openMacroSheet = () => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setShowMacroGearSheet(true); };
  const openMacroSheetAnim = () => {
    macroScaleAnim.setValue(0.92);
    macroOpacityAnim.setValue(0);
    Animated.parallel([
      Animated.spring(macroScaleAnim,   { toValue: 1, useNativeDriver: true, damping: 22, stiffness: 300 }),
      Animated.timing(macroOpacityAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  };
  const closeMacroSheet = () => {
    Animated.parallel([
      Animated.timing(macroScaleAnim,   { toValue: 0.94, duration: 160, useNativeDriver: true }),
      Animated.timing(macroOpacityAnim, { toValue: 0,    duration: 140, useNativeDriver: true }),
    ]).start(() => setShowMacroGearSheet(false));
  };
  const closeMacroSheetWithHaptic = () => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); closeMacroSheet(); };
  const applyMacroPreset = async (key: string) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    const preset = MACRO_PRESETS[key];
    if (!preset) return;
    setMacroPreset(key);
    // Recompute the on-screen gram goals immediately from the current calorie target.
    if (calTarget > 0) {
      setMacroGoals({
        protein: Math.round((preset.p / 100) * calTarget / 4),
        carbs:   Math.round((preset.c / 100) * calTarget / 4),
        fat:     Math.round((preset.f / 100) * calTarget / 9),
      });
    }
    // Persist the ratio to the profile (read-then-merge, never wipe) + the chosen
    // preset key to settings, mirroring onboarding.
    try {
      const rawP = await AsyncStorage.getItem('pj_profile');
      const prof = rawP ? JSON.parse(rawP) : {};
      await storageSet('pj_profile', JSON.stringify({ ...prof, macroMode: 'ratio', macroProteinPct: String(preset.p), macroCarbsPct: String(preset.c), macroFatPct: String(preset.f) }));
      const rawS = await AsyncStorage.getItem('pj_settings');
      const sett = rawS ? JSON.parse(rawS) : {};
      await storageSet('pj_settings', JSON.stringify({ ...sett, macroPreset: key }));
      showToast('Macro goals updated', preset.label, 'success');
    } catch {
      showToast('Save failed', 'Please try again', 'error');
    }
  };
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
  useScrollToTop(scrollRef);
  const cardOffsets = useRef<Record<string, number>>({});
  const dailyNoteRef = useRef<any>(null);
  const { scrollTo } = useLocalSearchParams<{ scrollTo?: string }>();
  useEffect(() => {
    if (!scrollTo) return;
    setTimeout(() => {
      const offset = cardOffsets.current[scrollTo] ?? 0;
      scrollRef.current?.scrollTo({ y: Math.max(0, offset - 16), animated: true });
    }, 400);
  }, [scrollTo]);
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
  const sleepCardScale = useRef(new Animated.Value(1)).current;
  const [sleepManualCore,   setSleepManualCore]     = useState<string>('');
  const [sleepManualDeep,   setSleepManualDeep]     = useState<string>('');
  const [sleepManualRem,    setSleepManualRem]      = useState<string>('');

  // Recovery home card state
  const [homeRecoveryScore,   setHomeRecoveryScore]   = useState<number | null>(null);
  const [homeRecoverySignals, setHomeRecoverySignals] = useState<{ hrv: number|null; rhr: number|null; resp: number|null; spo2: number|null } | null>(null);
  // Guards the home-side Recovery auto-compute: an in-flight flag (prevents
  // overlapping wearable fetches) plus a "storage checked" gate so we only compute
  // once the day-load has confirmed there's no stored score yet. The gate avoids a
  // wasted fetch on every launch when a score already exists, and (unlike a
  // once-per-day flag) lets a dev-tool reset re-trigger the compute when the score
  // is cleared, since the day-load flips homeRecoveryScore back to null on refocus.
  const recoveryComputeInFlightRef = useRef(false);
  const [recoveryStorageChecked, setRecoveryStorageChecked] = useState(false);
  const [recoveryCoachCache,  setRecoveryCoachCache]  = useState<CoachTipCache | null>(null);
  const [activeSleepFace, setActiveSleepFace] = useState(0); // 0=recovery, 1=sleep
  // Measured height of the Sleep/Recovery carousel (driven by the taller, populated
  // face). An empty face stretches its centered empty-state to this so the card never
  // shows dead space below stranded text. Guard avoids sub-pixel layout thrash.
  const [carouselHeight, setCarouselHeight] = useState(0);
  const carouselRef = useRef<ScrollView>(null);
  const activeSleepFaceRef = useRef(0);
  const autoScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Challenge card state (the home slot the YvY card vacated). Loaded on focus.
  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null);
  const [challengeProg,   setChallengeProg]   = useState<ChallengeProgress | null>(null);

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

  const { activeCalories, steps, distance, sleepHours, sleepStages, sleepTimes, sleepAwakeMs, sleepAwakeCount, vo2Max, cardioRecovery, restingHR, respiratoryRate, bloodOxygen, exerciseMinutes, fetchTodayData, hasHealthData, lastSyncedAt, fetchRecoverySignals } = useHealthKit();

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

  // Auto-compute today's Recovery Score on the HOME screen so the Recovery card
  // populates without needing a Sleep Hub visit. Mirrors the hub's morning-snapshot
  // freeze exactly (same fetchRecoverySignals(7) -> burn-accuracy adjust -> sleep
  // score -> calcRecoveryScore -> write-once to pj_<date>): whichever surface computes
  // first that day wins, and a score already in storage is never recomputed. A null
  // result (watch off / no overnight signals) writes nothing and leaves the empty state.
  useEffect(() => {
    if (!recoveryStorageChecked) return;            // wait until the day-load confirms what's in storage
    if (homeRecoveryScore !== null) return;         // already have a score
    if (!hasHealthData) return;                     // no wearable data available yet
    if (recoveryComputeInFlightRef.current) return; // a compute is already running
    recoveryComputeInFlightRef.current = true;
    let cancelled = false;
    (async () => {
      try {
        const sig = await fetchRecoverySignals(7);
        if (cancelled || !sig) return;
        const k = burnAccuracyPct / 100;
        const adj = {
          ...sig,
          yesterdayActiveCal: sig.yesterdayActiveCal !== null ? Math.round(sig.yesterdayActiveCal * k) : null,
          activCalBaseline:   sig.activCalBaseline   !== null ? Math.round(sig.activCalBaseline   * k) : null,
        };
        const displaySleep = sleepOverride ?? sleepHours;
        const isManual = !!sleepOverride;
        const { score: sleepScoreVal } = calcSleepScore(displaySleep, sleepStages, sleepGoal, sleepFeelRating, isManual, sleepConsistencyPts);
        const res = calcRecoveryScore({
          sleepScore: sleepScoreVal,
          todayHRV: adj.todayHRV, hrvBaseline: adj.hrvBaseline,
          todayRHR: adj.todayRHR, rhrBaseline: adj.rhrBaseline,
          yesterdayActiveCal: adj.yesterdayActiveCal, activCalBaseline: adj.activCalBaseline,
          todayResp: adj.todayResp, respBaseline: adj.respBaseline,
        });
        if (cancelled || res.score === null) return;
        const dk = `pj_${getDateKey(new Date())}`;
        const raw = await AsyncStorage.getItem(dk);
        const cur = raw ? JSON.parse(raw) : {};
        // Race guard: if the hub froze a score between our fetch and now, use that
        // frozen value instead of overwriting it (read-then-merge, never replace).
        if (typeof cur.recoveryScore === 'number') {
          if (!cancelled) {
            setHomeRecoveryScore(cur.recoveryScore);
            if (cur.recoverySignals && typeof cur.recoverySignals === 'object') setHomeRecoverySignals(cur.recoverySignals);
          }
          return;
        }
        const recoverySignals = { hrv: adj.todayHRV, rhr: adj.todayRHR, resp: adj.todayResp, spo2: adj.todaySpO2 };
        await storageSet(dk, JSON.stringify({ ...cur, recoveryScore: res.score, recoverySignals }));
        if (!cancelled) {
          setHomeRecoveryScore(res.score);
          setHomeRecoverySignals(recoverySignals);
        }
      } catch {} finally { recoveryComputeInFlightRef.current = false; }
    })();
    return () => { cancelled = true; };
  }, [recoveryStorageChecked, hasHealthData, homeRecoveryScore, sleepHours, sleepStages, burnAccuracyPct, todayKey]);
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
          setWaterEntries([]); // must clear too -- else yesterday's entries leak into the new day
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
  // Weekly / monthly "summary ready" pop-ups (last closed period). Precedence in runScan.
  const [weekSummary, setWeekSummary] = useState<WeeklySummaryData | null>(null);
  const [monthSummary, setMonthSummary] = useState<MonthlySummaryData | null>(null);
  const [homeTips, setHomeTips] = useState<StoredTip[]>([]);
  const [tipIndex, setTipIndex] = useState(0);
  const [coachCache, setCoachCache] = useState<CoachTipCache | null>(null);
  // Sleep Coach tip for the home sleep card (condensed; full read on the Sleep Hub).
  const [sleepCoachCache, setSleepCoachCache] = useState<CoachTipCache | null>(null);
  const tipScrollRef = useRef<ScrollView>(null);
  const tipCardWidthRef = useRef(0);
  const tipDraggingRef = useRef(false);
  const tipAutoRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tipResumeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const homeTipsLengthRef = useRef(0);
  const tipIndexRef = useRef(0);
  const pageHeightsRef = useRef<number[]>([]);
  const cardHeightAnim = useRef(new Animated.Value(0)).current;
  const [tipCardWidth, setTipCardWidth] = useState(0);
  const [tipHeightReady, setTipHeightReady] = useState(false);
  const summaryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const runScan = async () => {
      try {
        const now = new Date();
        const todayKey = getDateKey(now);

        // ── Challenge completion (fires once on open after the end date, independent
        //    of the summary once-per-day gate). Marks acknowledged so it won't repeat;
        //    the Complete card state stays until the user taps Done. ──
        try {
          const ch = await loadActiveChallenge();
          if (ch && challengeStatus(ch) === 'ended' && !ch.acknowledged) {
            const cp = await computeChallengeProgress(ch);
            const settingsRaw = await AsyncStorage.getItem('pj_settings');
            const mindful = settingsRaw ? JSON.parse(settingsRaw).styleMode === 'mindful' : false;
            if (cp.won) {
              showCelebration(cp.tier === 'perfect' ? 'large' : 'medium', mindful ? 'CHALLENGE COMPLETE' : (cp.tier === 'perfect' ? 'PERFECT' : 'CHALLENGE WON'));
            } else {
              showCelebration('small', mindful ? 'NICE WORK' : 'CHALLENGE DONE');
            }
            const acked: Challenge = { ...ch, acknowledged: true };
            await saveActiveChallenge(acked);
            await appendChallengeHistory(acked);
            setActiveChallenge(acked);
            setChallengeProg(cp);
          }
        } catch {}

        const score = await runDayScoreScan(todayKey, new Date().toISOString());
        // Generate weekly/monthly summaries (each self-gated to Sunday / the 1st).
        await checkAndGenerateWeeklySummary().catch(() => {});
        await checkAndGenerateMonthly().catch(() => {});

        // Dev: forced summary replay (Settings > dev tools). Bypasses the
        // day/date + time + once-per-day gates so a tester can see the pop-up on
        // any day; generates the period on demand if it was not built yet.
        const forced = await AsyncStorage.getItem('pj_dev_force_summary');
        if (forced === 'week' || forced === 'month') {
          await AsyncStorage.removeItem('pj_dev_force_summary');
          if (forced === 'month') {
            const mk = getLastClosedMonth();
            const md = (await loadMonthlySummary(mk)) ?? (await generateMonthlySummary(mk));
            if (md) setMonthSummary(md);
          } else {
            const ws = getLastClosedWeekStart();
            const wd = (await loadWeeklySummary(ws)) ?? (await generateWeeklySummary(ws));
            if (wd) setWeekSummary(wd);
          }
          return;
        }

        // Gate: only after 5am, and at most ONE summary pop-up per calendar day.
        if (now.getHours() < 5) return;
        const lastShown = await AsyncStorage.getItem('pj_last_summary_shown');
        if (lastShown === todayKey) return;
        if (summaryTimerRef.current) return;      // a show is already pending

        // Tier precedence: 1st of month -> Monthly, else Sunday -> Weekly, else Day.
        // Only the highest tier fires; stamping the shared once-per-day gate keeps
        // the lower tiers suppressed for the rest of the day (the "overtake" rule).
        type Pending =
          | { kind: 'day'; score: DayScore; dateKey: string }
          | { kind: 'week'; data: WeeklySummaryData }
          | { kind: 'month'; data: MonthlySummaryData };
        let pending: Pending | null = null;

        if (now.getDate() === 1) {
          const m = await loadMonthlySummary(getLastClosedMonth());
          if (m && m.avgComposite !== null && m.daysScored > 0) pending = { kind: 'month', data: m };
        }
        if (!pending && now.getDay() === 0) {
          const w = await loadWeeklySummary(getLastClosedWeekStart());
          if (w && w.avgComposite !== null && w.daysScored > 0) pending = { kind: 'week', data: w };
        }
        if (!pending) {
          if (!score) return;                     // day: excluded / no data, no pop-up
          const y = new Date(); y.setDate(y.getDate() - 1);
          pending = { kind: 'day', score, dateKey: getDateKey(y) };
        }
        const p = pending!;

        // Brief delay so the home screen paints first; stamp the gate only when
        // a modal actually shows (a kill during the delay won't burn the day).
        summaryTimerRef.current = setTimeout(async () => {
          summaryTimerRef.current = null;
          await storageSet('pj_last_summary_shown', todayKey);
          if (p.kind === 'month') {
            cancelMonthlySummaryNotification().catch(() => {}); // saw it in-app -> no redundant push
            setMonthSummary(p.data);
          } else if (p.kind === 'week') {
            cancelWeeklySummaryNotification().catch(() => {});
            setWeekSummary(p.data);
          } else {
            // First ever score: show the one-time disclaimer gate first.
            const seen = await AsyncStorage.getItem('pj_dayscore_disclaimer_seen');
            if (seen === 'true') setDaySummary({ score: p.score, dateKey: p.dateKey });
            else setDayScoreDisclaimer({ score: p.score, dateKey: p.dateKey });
          }
        }, 800);
      } catch (e) { console.log('[DayScore] scan error', e); }
    };
    runScan();
    const sub = AppState.addEventListener('change', s => { if (s === 'active') runScan(); });
    return () => { sub.remove(); if (summaryTimerRef.current) clearTimeout(summaryTimerRef.current); };
  }, []);

  // ── Vacation Mode banner: refresh on every focus so Settings changes land ───
  useFocusEffect(useCallback(() => {
    getVacation().then(v => {
      const today = vacationTodayKey();
      if (v && v.active && today <= v.endKey) setVacationBanner(v);
      else setVacationBanner(null);
    });
  }, []));

  // ── Load Smart Tips + AI coach tip for home card ────────────────────────────
  useFocusEffect(useCallback(() => {
    loadSmartTips().then(store => {
      const tips = store?.activeTips?.slice(0, 3) ?? [];
      setHomeTips(tips);
      setTipIndex(i => (i >= tips.length ? 0 : i));
    });
    // AI coach tip runs in parallel. Renders fallback from cache immediately,
    // updates to AI body once the async generation completes.
    refreshCoachTip('home', 14).then(cache => {
      setCoachCache(cache);
    }).catch(() => {});
    // Sleep Coach for the home sleep card: cached body instantly, AI body when ready.
    loadCoachTipCacheSleep().then(c => { if (c) setSleepCoachCache(c); }).catch(() => {});
    refreshCoachTipSleep(14).then(c => setSleepCoachCache(c)).catch(() => {});
    loadCoachTipCacheRecovery().then(c => { if (c) setRecoveryCoachCache(c); }).catch(() => {});
  }, []));

  // ── Load the active challenge + live progress for the home challenge card ──
  useFocusEffect(useCallback(() => {
    let cancelled = false;
    (async () => {
      const ch = await loadActiveChallenge();
      const cp = ch ? await computeChallengeProgress(ch) : null;
      if (cancelled) return;
      setActiveChallenge(ch);
      setChallengeProg(cp);
    })();
    return () => { cancelled = true; };
  }, []));

  // ── Keep refs in sync for auto-advance closure ──────────────────────────────
  useEffect(() => { homeTipsLengthRef.current = homeTips.length; }, [homeTips.length]);
  useEffect(() => { tipIndexRef.current = tipIndex; }, [tipIndex]);

  // ── Sleep/Recovery carousel auto-scroll (6s cadence, 12s cooldown after a
  //    manual swipe/tap so it doesn't move out from under you while reading) ──
  function scheduleCarouselTick(delay = 6000) {
    if (autoScrollTimerRef.current) clearTimeout(autoScrollTimerRef.current);
    autoScrollTimerRef.current = setTimeout(() => {
      const next = activeSleepFaceRef.current === 0 ? 1 : 0;
      carouselRef.current?.scrollTo({ x: next * CAROUSEL_PAGE_W, animated: true });
      activeSleepFaceRef.current = next;
      setActiveSleepFace(next);
      scheduleCarouselTick();
    }, delay);
  }
  useEffect(() => {
    scheduleCarouselTick();
    return () => { if (autoScrollTimerRef.current) clearTimeout(autoScrollTimerRef.current); };
  }, []);

  const stopTipAuto = () => { if (tipAutoRef.current) { clearInterval(tipAutoRef.current); tipAutoRef.current = null; } };
  const startTipAuto = useCallback(() => {
    stopTipAuto();
    tipAutoRef.current = setInterval(() => {
      const w = tipCardWidthRef.current;
      const len = homeTipsLengthRef.current;
      if (!w || len <= 1) return;
      const next = (tipIndexRef.current + 1) % len;
      tipScrollRef.current?.scrollTo({ x: next * w, animated: true });
    }, 22000);
  }, []);

  useEffect(() => {
    startTipAuto();
    return () => { stopTipAuto(); if (tipResumeRef.current) clearTimeout(tipResumeRef.current); };
  }, [startTipAuto]);

  const onTipScrollBeginDrag = () => {
    tipDraggingRef.current = true;
    stopTipAuto();
    if (tipResumeRef.current) clearTimeout(tipResumeRef.current);
  };
  const onTipMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const w = tipCardWidthRef.current;
    if (!w) return;
    const p = Math.round(e.nativeEvent.contentOffset.x / w);
    setTipIndex(p);
    tipIndexRef.current = p;
    const h = pageHeightsRef.current[p];
    if (h) Animated.timing(cardHeightAnim, { toValue: h, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    if (tipDraggingRef.current) {
      tipDraggingRef.current = false;
      if (tipResumeRef.current) clearTimeout(tipResumeRef.current);
      tipResumeRef.current = setTimeout(startTipAuto, 10000);
    }
  };

  // ── Persist HealthKit to storage ────────────────────────────────────────────
  useEffect(() => {
    if (activeCalories > 0 || steps > 0 || sleepHours !== null || restingHR !== null || respiratoryRate !== null || bloodOxygen !== null || exerciseMinutes !== null || vo2Max !== null || cardioRecovery !== null) {
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
          ...(exerciseMinutes !== null ? { exerciseMinutes } : {}),
          ...(vo2Max !== null ? { vo2Max } : {}),
          ...(cardioRecovery !== null ? { cardioRecovery } : {}),
        }));
      });
    }
    if (loaded) {
      const stepsCrossed = prevStepsRef.current !== null && prevStepsRef.current < stepGoal;
      const stepsFirstAboveGoal = prevStepsRef.current === null && steps >= stepGoal;
      if (steps > 0 && stepGoal > 0 && steps >= stepGoal && (stepsCrossed || stepsFirstAboveGoal)) {
        handleDailyGoalHit('steps').then(({ fired, count: hitCount }) => {
          if (fired) {
            showCelebration('small', 'STEP GOAL'); showDailyGoalToast('Step Goal', hitCount, 'footsteps', '#10b981');
            loadAchievements().then(async store => {
              let s = store;
              const stepsMilestones = [
                { id: 'steps_first', threshold: 1   },
                { id: 'steps_10',   threshold: 10  },
                { id: 'steps_30',   threshold: 30  },
                { id: 'steps_50',   threshold: 50  },
                { id: 'steps_75',   threshold: 75  },
                { id: 'steps_100',  threshold: 100 },
                { id: 'steps_200',  threshold: 200 },
                { id: 'steps_365',  threshold: 365 },
              ];
              for (const m of stepsMilestones) {
                if (hitCount >= m.threshold) s = await handleAchievementUnlock(m.id, s);
              }
              setAchievementStore(s);
            });
          }
        });
      }
      prevStepsRef.current = steps;
      const adjustedActiveCals = Math.round(activeCalories * burnAccuracyPct / 100);
      const prevAdjustedActiveCals = prevActiveCalRef.current !== null ? Math.round(prevActiveCalRef.current * burnAccuracyPct / 100) : null;
      const calsCrossed = prevAdjustedActiveCals !== null && prevAdjustedActiveCals < activeCalGoal;
      const calsFirstAboveGoal = prevActiveCalRef.current === null && adjustedActiveCals >= activeCalGoal;
      if (adjustedActiveCals > 0 && activeCalGoal > 0 && adjustedActiveCals >= activeCalGoal && (calsCrossed || calsFirstAboveGoal)) {
        handleDailyGoalHit('activeCals').then(({ fired, count: hitCount }) => {
          if (fired) { showCelebration('small', 'ACTIVE CALS'); showDailyGoalToast('Active Cal Goal', hitCount, 'flame', '#f97316'); }
        });
      }
      prevActiveCalRef.current = activeCalories;
      const exerciseCrossed = prevExerciseMinsRef.current !== null && prevExerciseMinsRef.current < exerciseMinsGoal;
      const exerciseFirstAboveGoal = prevExerciseMinsRef.current === null && exerciseMinutes !== null && exerciseMinutes >= exerciseMinsGoal;
      if (exerciseMinutes !== null && exerciseMinsGoal > 0 && exerciseMinutes >= exerciseMinsGoal && (exerciseCrossed || exerciseFirstAboveGoal)) {
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
  }, [activeCalories, steps, sleepHours, sleepStages, restingHR, respiratoryRate, bloodOxygen, exerciseMinutes, loaded, stepGoal, activeCalGoal, exerciseMinsGoal]);

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
            // Drop any retired card ids (e.g. fitness_metrics) lingering in saved order so
            // the registry .find()! in Edit Layout never hits a dangling id.
            const merged = [...parsed.cardOrder, ...defaultOrder.filter(id => !parsed.cardOrder.includes(id))]
              .filter((id: CardId) => CARD_REGISTRY.some(c => c.id === id));
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
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
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
          // Water: entries are the source of truth; total derives from them. Always set both
          // together (else-clear) so a day with no entries never shows a prior day's list.
          if (Array.isArray(data.waterEntries)) {
            setWaterEntries(data.waterEntries);
            setWater(waterTotalFromEntries(data.waterEntries));
            waterLoaded.current = true;
          } else {
            setWaterEntries([]);
            if (typeof data.water === 'number') { setWater(Math.max(0, data.water)); waterLoaded.current = true; }
            else setWater(0);
          }
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
            if (Array.isArray(cloudData.waterEntries)) {
              setWaterEntries(cloudData.waterEntries);
              setWater(waterTotalFromEntries(cloudData.waterEntries));
            } else {
              setWaterEntries([]);
              if (typeof cloudData.water === 'number') setWater(Math.max(0, cloudData.water));
            }
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
            setTodayEntries(clean);
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
          setHomeRecoveryScore(typeof data.recoveryScore === 'number' && Number.isFinite(data.recoveryScore) ? data.recoveryScore : null);
          setHomeRecoverySignals(data.recoverySignals && typeof data.recoverySignals === 'object' ? data.recoverySignals : null);
          if (Array.isArray(data.waterEntries)) {
            setWaterEntries(data.waterEntries);
            setWater(waterTotalFromEntries(data.waterEntries));
            waterLoaded.current = true;
          } else {
            setWaterEntries([]);
            if (typeof data.water === 'number') { setWater(Math.max(0, data.water)); waterLoaded.current = true; }
            else setWater(0);
          }
          if (data.weight) setWeight(data.weight);
          if ('dailyNote' in data) { setDailyNote(data.dailyNote ?? ''); setSavedDailyNoteText(data.dailyNote ?? ''); }
        }
        // The day-load has now confirmed whether a stored Recovery Score exists
        // (set above when a record exists; absent on a brand-new day). This unblocks
        // the home-side Recovery auto-compute effect.
        setRecoveryStorageChecked(true);
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
          // Refresh card layout on focus too (mirrors the mount-time loadLayout), so a
          // "Use defaults" layout change made in Settings shows when returning to Home.
          {
            const fMode = sd.styleMode || 'balanced';
            const fDefOrder = fMode === 'discipline' ? DISCIPLINE_ORDER : fMode === 'mindful' ? MINDFUL_ORDER : DEFAULT_ORDER;
            const fDefVisible = fMode === 'mindful' ? MINDFUL_VISIBLE : DEFAULT_VISIBLE;
            if (sd.cardOrder && Array.isArray(sd.cardOrder)) {
              setCardOrder([...sd.cardOrder, ...fDefOrder.filter(id => !sd.cardOrder.includes(id))]
                .filter((id: CardId) => CARD_REGISTRY.some(c => c.id === id)));
            } else {
              setCardOrder(fDefOrder);
            }
            if (sd.cardVisible && typeof sd.cardVisible === 'object') {
              setCardVisible({ ...fDefVisible, ...sd.cardVisible });
            } else {
              setCardVisible(fDefVisible);
            }
          }
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
          // Highlight the active preset in the macro modal: a ratio profile whose
          // pcts match a preset shows it selected; anything else reads as Custom.
          if (p.macroMode !== 'fixed' && p.macroProteinPct && p.macroCarbsPct && p.macroFatPct) {
            const match = Object.entries(MACRO_PRESETS).find(([, pr]) =>
              String(pr.p) === String(p.macroProteinPct) &&
              String(pr.c) === String(p.macroCarbsPct) &&
              String(pr.f) === String(p.macroFatPct));
            setMacroPreset(match ? match[0] : null);
          } else {
            setMacroPreset(null);
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
          <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); router.push('/(tabs)/log'); }} activeOpacity={0.6}
            style={{ backgroundColor: theme.accentBlueBg, borderWidth:1, borderColor: theme.accentBlueBorder, borderRadius:6, paddingHorizontal:10, paddingVertical:4 }}>
            <Text style={{ color: theme.accentBlue, fontSize:12, fontFamily:'DMSans_600SemiBold' }}>+ Log</Text>
          </TouchableOpacity>
        </View>

        {/* Big number row */}
        <View style={styles.calRow}>
          <View style={{ shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 0 }}>
            <AnimatedNumber value={totalCals} style={[styles.calNumber, { color: styleMode === 'mindful' ? theme.textSecondary : calColor, opacity: 0.88 }]} />
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
    const openMacroDrilldown = (i: number) => {
      triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
      if (i === 0) {
        setMacroDrilldownItem({ label: 'Protein', total: totalProtein, unit: 'g', direction: 'want-more', goal: macroGoals.protein || null, directField: 'protein' });
      } else if (i === 2) {
        setMacroDrilldownItem({ label: 'Fat', total: totalFat, unit: 'g', direction: 'neutral', goal: macroGoals.fat || null, directField: 'fat' });
      } else {
        setMacroDrilldownItem({ label: 'Carbohydrates', total: totalCarbs, unit: 'g', direction: 'neutral', goal: macroGoals.carbs || null, directField: 'carbs', hasNetToggle: true, netTotal: netCarbs, netComputeValue: computeNetCarbsForEntry });
      }
      setShowMacroDrilldown(true);
    };
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
            <TouchableOpacity onPress={() => openMacroSheet()} hitSlop={{ top:8, bottom:8, left:8, right:8 }}>
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
                <TouchableOpacity onPress={() => openMacroDrilldown(i)} activeOpacity={0.75} hitSlop={{ top: 4, bottom: 4 }}>
                  <View style={{ flexDirection:'row', alignItems:'baseline', justifyContent:'space-between', marginBottom:4 }}>
                    <Text style={{ fontSize:11, color: theme.textMuted, fontFamily:'DMSans_700Bold', letterSpacing:2, textTransform:'uppercase', flex:1 }}>{m.label}</Text>
                    <View style={{ flexDirection:'row', alignItems:'baseline', gap:4, width:120, justifyContent:'flex-end' }}>
                      <AnimatedNumber value={m.val} style={{ fontSize:20, color: over ? theme.macroOver : m.color, fontFamily:'BebasNeue_400Regular', letterSpacing:1, textAlign:'right' }} decimals={0} />
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
                </TouchableOpacity>
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
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[styles.cardLabel, { marginBottom: 0, color: theme.textMuted }]}>Water · </Text>
            <AnimatedNumber value={water} style={[styles.cardLabel, { marginBottom: 0, color: theme.textMuted, textTransform: 'none' }]} />
            <Text style={[styles.cardLabel, { marginBottom: 0, color: theme.textMuted, textTransform: 'none' }]}>{`oz / ${waterGoal}oz`}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); openWaterDetailModal(); }} hitSlop={{ top:8, bottom:8, left:8, right:8 }}>
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
          {weight ? (
            <AnimatedNumber value={weight} style={[styles.weightVal, { color: styleMode === 'mindful' ? theme.textSecondary : theme.accentBlue }]} decimals={1} formatter={(n) => `${n.toFixed(1)} lbs`} />
          ) : (
            <Text style={[styles.weightVal, { color: styleMode === 'mindful' ? theme.textSecondary : theme.textDim }]}>
              {lastKnownWeight ? `${lastKnownWeight.val} lbs` : '--'}
            </Text>
          )}
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
        onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); router.push('/(tabs)/workout'); }}
        style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: theme.accentBlueRaw, padding: 16, overflow: 'hidden' }]}>
        <Ionicons name="barbell" size={130} color={theme.accentBlueRaw} style={{ position: 'absolute', right: -24, bottom: -28, opacity: 0.10 }} />
        <View style={{ marginBottom: 12 }}>
          <View style={{ flexDirection:'row', alignItems:'center', gap:6, marginBottom:8 }}>
            <Ionicons name="barbell-outline" size={11} color={theme.textMuted} />
            <Text style={[styles.cardLabel, { marginBottom:0, color: theme.textMuted }]}>Today's Training</Text>
            {hasHealthData && lastSyncedAt ? (
              <Text style={{ marginLeft:'auto', fontSize:9, color: theme.textDim, fontFamily:'DMSans_400Regular' }}>Synced {syncAgo(lastSyncedAt)}</Text>
            ) : null}
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

  // Relative "last synced" label for HealthKit-sourced cards. Computed at render, so it
  // refreshes whenever the card re-renders (pull-to-refresh resets lastSyncedAt to now).
  const syncAgo = (ms: number) => {
    const s = Math.floor((Date.now() - ms) / 1000);
    if (s < 60) return 'just now';
    const m = Math.floor(s / 60);
    if (m < 60) return `${m} min ago`;
    const h = Math.floor(m / 60);
    return `${h} hr ago`;
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
            <AnimatedNumber value={steps} style={{ fontSize:36, color:stepColor, fontFamily:'BebasNeue_400Regular', letterSpacing:1, opacity: 0.88 }} formatter={(n) => n.toLocaleString()} />
          </View>
          <Text style={{ fontSize:13, color: theme.textMuted, fontFamily:'DMSans_400Regular' }}>/ {stepGoal.toLocaleString()} steps</Text>
        </View>
        <View style={{ marginBottom:8 }}>
          <AnimatedProgressBar pct={Math.min(pct*100,100)} color={stepColor} trackColor={theme.bgProgressTrack} refreshKey={refreshKey} overGoal={pct >= 1} />
        </View>
        <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
          <Text style={{ fontSize:9, color: theme.textMuted, fontFamily:'DMSans_700Bold', letterSpacing:2, textTransform:'uppercase' }}>{distance} mi walked today</Text>
          {hasHealthData && lastSyncedAt ? (
            <Text style={{ fontSize:9, color: theme.textDim, fontFamily:'DMSans_400Regular' }}>Synced {syncAgo(lastSyncedAt)}</Text>
          ) : null}
        </View>
      </View>
    );
  };

  const renderSleepRecoveryCard = () => {
    const displaySleep = sleepOverride ?? sleepHours;
    const recZone = homeRecoveryScore !== null ? recoveryZone(homeRecoveryScore) : null;
    const recColor = recZone ? (recZone.zoneColor === 'good' ? theme.statusGood : recZone.zoneColor === 'warn' ? theme.statusWarn : theme.statusBad) : theme.textDim;
    const recDonutSize = 120, recDonutStroke = 14, recDonutRadius = (recDonutSize - recDonutStroke) / 2, recDonutCirc = 2 * Math.PI * recDonutRadius;
    // Shared empty-state for both carousel faces (recovery + sleep) so they read
    // identically. Centered icon-in-circle + title + subtitle, stretched to the
    // measured carousel height (minus header/padding) so the card fills, never
    // leaving dead space under the text.
    const renderCardEmptyState = (icon: any, color: string, title: string, subtitle: string) => (
      <View style={{ minHeight: Math.max(200, carouselHeight - 64), alignItems: 'center', justifyContent: 'center', paddingVertical: 16 }}>
        <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: color + '1A', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
          <Ionicons name={icon} size={28} color={color} />
        </View>
        <Text style={{ fontSize: 15, color: theme.textSecondary, fontFamily: 'DMSans_700Bold', marginBottom: 6, textAlign: 'center' }}>{title}</Text>
        <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'DMSans_400Regular', lineHeight: 17, textAlign: 'center', paddingHorizontal: 24 }}>{subtitle}</Text>
      </View>
    );
    return (
      <Animated.View ref={sleepCardRef} collapsable={false} style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: activeSleepFace === 0 ? RECOVERY_PURPLE : theme.accentBlueRaw, borderTopWidth: 1.5, overflow: 'hidden', padding: 0, transform: [{ scale: sleepCardScale }] }]}>
        <ScrollView
          ref={carouselRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScrollBeginDrag={() => { if (autoScrollTimerRef.current) clearTimeout(autoScrollTimerRef.current); }}
          onMomentumScrollEnd={(e) => {
            const page = Math.round(e.nativeEvent.contentOffset.x / CAROUSEL_PAGE_W);
            activeSleepFaceRef.current = page;
            setActiveSleepFace(page);
            scheduleCarouselTick(12000);
          }}
          style={{ width: CAROUSEL_PAGE_W }}
          onLayout={(e) => { const h = e.nativeEvent.layout.height; setCarouselHeight(prev => Math.abs(prev - h) > 1 ? h : prev); }}
        >
          {/* ── Page 0: Recovery ── */}
          <TouchableOpacity
            activeOpacity={1}
            style={{ width: CAROUSEL_PAGE_W, padding: 16 }}
            onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); router.push({ pathname: '/sleep', params: { tab: 'recovery' } }); }}
            onPressIn={() => { Animated.timing(sleepCardScale, { toValue: 0.97, duration: 100, useNativeDriver: true }).start(); }}
            onPressOut={() => { Animated.timing(sleepCardScale, { toValue: 1, duration: 100, useNativeDriver: true }).start(); }}
          >
            <Ionicons name="pulse" size={130} color={RECOVERY_PURPLE} style={{ position: 'absolute', right: -24, bottom: -28, opacity: 0.08 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="pulse-outline" size={11} color={theme.textMuted} />
                <Text style={[styles.cardLabel, { marginBottom: 0, color: theme.textMuted }]}>Recovery Today</Text>
                <TooltipIcon tooltipKey="recovery_score_home" />
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
            </View>
            {homeRecoveryScore === null ? (
              renderCardEmptyState('pulse', RECOVERY_PURPLE, 'No recovery data yet', 'Wear a smartwatch or fitness tracker to sleep to see your Recovery Score.')
            ) : (() => {
              const recTip = recoveryCoachCache ? resolveTipBody(recoveryCoachCache) : null;
              // Each signal carries its own identity color + icon (not a good/bad
              // judgment, same as the sleep stage colors). Recovery is baseline-
              // relative, so we don't threshold-color these here.
              const recSignals: { label: string; value: string; unit: string; color: string; icon: any }[] = [];
              if (homeRecoverySignals?.hrv != null)  recSignals.push({ label: 'HRV',        value: `${(Math.round((homeRecoverySignals.hrv as number) * 10) / 10).toFixed(1)}`, unit: 'ms',   color: '#9b7adb', icon: 'pulse' });
              if (homeRecoverySignals?.rhr != null)  recSignals.push({ label: 'Resting HR', value: `${Math.round(homeRecoverySignals.rhr as number)}`,                              unit: 'bpm',  color: '#d65d7a', icon: 'heart' });
              if (homeRecoverySignals?.resp != null) recSignals.push({ label: 'Resp Rate',  value: `${(Math.round((homeRecoverySignals.resp as number) * 10) / 10).toFixed(1)}`, unit: '/min', color: '#3a9bc1', icon: 'cloud-outline' });
              if (homeRecoverySignals?.spo2 != null) recSignals.push({ label: 'Blood O2',   value: `${Math.round(homeRecoverySignals.spo2 as number)}`,                            unit: '%',    color: '#2a9d6e', icon: 'water' });
              const readinessLine = styleMode === 'mindful'
                ? (recZone?.zoneColor === 'good' ? 'Your body is showing strong readiness.' : recZone?.zoneColor === 'warn' ? 'Your body is in a steady place today.' : 'Your body is asking for a gentler day.')
                : (recZone?.zoneColor === 'good' ? 'Your body is ready to perform.' : recZone?.zoneColor === 'warn' ? 'You are in the ready zone today.' : 'Signals point to taking it easier today.');
              return (
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <View style={{ shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 0 }}>
                        <Text style={{ fontSize: 40, color: recColor, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1, opacity: 0.88, lineHeight: 42 }}>{recZone?.label}</Text>
                      </View>
                      <Text style={{ fontSize: 11, color: theme.textMuted, fontFamily: 'DMSans_500Medium', lineHeight: 16, marginTop: 4 }}>{readinessLine}</Text>
                    </View>
                    <View style={{ flex: 1, alignItems: 'center' }}>
                      <ScoreRing
                        score={homeRecoveryScore} scoreColor={recColor} trackColor={theme.sleepTrack}
                        donutSize={recDonutSize} donutStroke={recDonutStroke} donutRadius={recDonutRadius} donutCirc={recDonutCirc}
                        shimmer={homeRecoveryScore >= 80} refreshKey={refreshKey}
                      />
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {recSignals.map(s => (
                      <View key={s.label} style={{ flex: 1, minWidth: '46%', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: s.color + '12', borderWidth: 0.5, borderColor: s.color + '33', borderRadius: 10, paddingVertical: 9, paddingHorizontal: 11 }}>
                        <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: s.color + '22', alignItems: 'center', justifyContent: 'center' }}>
                          <Ionicons name={s.icon} size={13} color={s.color} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: 'DMSans_700Bold', letterSpacing: 1, textTransform: 'uppercase' }}>{s.label}</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
                            <Text style={{ fontSize: 19, color: s.color, fontFamily: 'BebasNeue_400Regular', letterSpacing: 0.5 }}>{s.value}</Text>
                            <Text style={{ fontSize: 9, color: theme.textDim, fontFamily: 'DMSans_400Regular' }}>{s.unit}</Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                  {recTip && (
                    <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 0.5, borderTopColor: theme.borderSubtle }}>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
                        <Ionicons name="bulb-outline" size={11} color={theme.textMuted} style={{ marginTop: 2 }} />
                        <Text numberOfLines={2} style={{ fontSize: 11, color: theme.textMuted, fontFamily: 'DMSans_400Regular', fontStyle: 'italic', flex: 1, lineHeight: 17 }}>{recTip}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 6 }}>
                        <Text style={{ fontSize: 10, color: RECOVERY_PURPLE, fontFamily: 'DMSans_600SemiBold' }}>Recovery Hub</Text>
                        <Ionicons name="chevron-forward" size={11} color={RECOVERY_PURPLE} style={{ marginLeft: 1 }} />
                      </View>
                    </View>
                  )}
                  <Text style={{ fontSize: 10, color: theme.textDim, fontFamily: 'DMSans_400Regular', textAlign: 'center', marginTop: 8, fontStyle: 'italic' }}>For informational purposes only. Not medical advice.</Text>
                </View>
              );
            })()}
          </TouchableOpacity>

          {/* ── Page 1: Sleep ── */}
          <TouchableOpacity
            activeOpacity={1}
            style={{ width: CAROUSEL_PAGE_W, padding: 16 }}
            onPress={() => { if (editingSleep) return; triggerHaptic(Haptics.ImpactFeedbackStyle.Light); router.push('/sleep'); }}
            onPressIn={() => { if (editingSleep) return; Animated.timing(sleepCardScale, { toValue: 0.97, duration: 100, useNativeDriver: true }).start(); }}
            onPressOut={() => { Animated.timing(sleepCardScale, { toValue: 1, duration: 100, useNativeDriver: true }).start(); }}
          >
          <Ionicons name="moon" size={130} color={theme.accentBlueRaw} style={{ position: 'absolute', right: -24, bottom: -28, opacity: 0.10 }} />

        <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
          <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
            <Ionicons name="moon-outline" size={11} color={theme.textMuted} />
            <Text style={[styles.cardLabel, { marginBottom:0, color: theme.textMuted }]}>Sleep Last Night</Text>
            <TooltipIcon tooltipKey="sleep_score" />
          </View>
          <View style={{ flexDirection:'row', alignItems:'center', gap:14 }}>
            <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setEditingSleep(!editingSleep); }} hitSlop={{ top:8, bottom:8, left:8, right:8 }}>
              <Ionicons name="settings" size={16} color={theme.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); router.push('/sleep'); }} hitSlop={{ top:8, bottom:8, left:8, right:8 }}>
              <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
        
        {editingSleep && (
          <View style={{ marginBottom:10 }}>
            {sleepHours != null && (
              <View style={{ flexDirection:'row', alignItems:'flex-start', gap:6, backgroundColor: theme.statusWarn + '14', borderRadius:8, borderLeftWidth:3, borderLeftColor: theme.statusWarn, padding:10, marginBottom:10 }}>
                <Ionicons name="information-circle-outline" size={14} color={theme.statusWarn} style={{ marginTop:1 }} />
                <Text style={{ flex:1, fontSize:11, color: theme.textSecondary, fontFamily:'DMSans_400Regular', lineHeight:16 }}>
                  A manual time overrides your Apple Health sleep for today. Tap Clear to restore it.
                </Text>
              </View>
            )}
            <View style={{ flexDirection:'row', gap:8, marginBottom:8 }}>
              <TouchableOpacity
                onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setActiveSleepPicker(activeSleepPicker === 'bed' ? null : 'bed'); }}
                style={{ flex:1, backgroundColor: activeSleepPicker === 'bed' ? theme.accentBlueBg : theme.bgInput, borderWidth:1, borderColor: activeSleepPicker === 'bed' ? theme.accentBlueBorder : theme.borderInput, borderRadius:6, padding:10, alignItems:'center' }}>
                <Text style={{ fontSize:10, color: theme.textMuted, fontFamily:'DMSans_400Regular', marginBottom:2 }}>Bed Time</Text>
                <Text style={{ fontSize:16, color: sleepBedTime ? theme.textPrimary : theme.textPlaceholder, fontFamily:'DMSans_600SemiBold' }}>
                  {sleepBedTime ? sleepBedTime.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : 'Tap to set'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setActiveSleepPicker(activeSleepPicker === 'wake' ? null : 'wake'); }}
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
              <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setEditingSleep(false); setActiveSleepPicker(null); }}
                style={{ flex:1, backgroundColor: theme.bgInput, borderWidth:1, borderColor: theme.borderInput, borderRadius:6, padding:10, alignItems:'center' }}>
                <Text style={{ color: theme.textMuted, fontSize:13, fontFamily:'DMSans_600SemiBold' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={async () => {
                triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
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
                  triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
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
          editingSleep ? null : renderCardEmptyState('moon', theme.accentBlueRaw, 'No sleep logged yet', 'Wear a smartwatch or fitness tracker to sleep, or tap the gear to log it manually.')
        ) : (() => {
          const isManual = !!sleepOverride;
          const { score, hasStages, path } = calcSleepScore(displaySleep, sleepStages, sleepGoal, sleepFeelRating, isManual, sleepConsistencyPts);
          const scoreColor = score !== null ? sleepScoreColor(score, theme) : theme.textDim;
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
          const fmtMs   = (ms: number) => { let h=Math.floor(ms/3600000); let m=Math.round((ms%3600000)/60000); if(m===60){h+=1;m=0;} return h>0?`${h}h ${m}m`:`${m}m`; };
          const donutSize=120, donutStroke=14, donutRadius=(donutSize-donutStroke)/2;
          const donutCirc=2*Math.PI*donutRadius;
          const coreFrac=corePct*donutCirc, deepFrac=deepPct*donutCirc, remFrac=remPct*donutCirc;
          const gapFrac=0.03*donutCirc;
          // AI Sleep Coach headline (clamped to 2 lines below, full read in the Sleep
          // Hub); falls back to the static tip before the coach loads or when offline.
          const aiSleepTip = sleepCoachCache ? resolveTipBody(sleepCoachCache) : null;
          const tip = aiSleepTip ?? (score !== null ? getSleepTip(score, displaySleep, sleepStages, sleepGoal, todayKey) : null);

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
                <View>
                  <View style={{ flexDirection:'row', alignItems:'center', marginBottom:14 }}>
                    <View style={{ flex:1, paddingRight:12 }}>
                      <View style={{ shadowColor:'#000000', shadowOffset:{width:0,height:2}, shadowOpacity:0.18, shadowRadius:0 }}>
                        <Text style={{ fontSize:42, color:scoreColor, fontFamily:'BebasNeue_400Regular', letterSpacing:1, opacity:0.88 }}>{hrs}h {mins}m</Text>
                      </View>
                      {scoreLabel ? (
                        <Text style={{ fontSize:9, color:scoreColor, fontFamily:'DMSans_700Bold', letterSpacing:2, textTransform:'uppercase', marginTop:2 }}>{scoreLabel}</Text>
                      ) : (
                        <Text style={{ fontSize:9, color:theme.textDim, fontFamily:'DMSans_700Bold', letterSpacing:2, textTransform:'uppercase', marginTop:2 }}>HEALTHKIT</Text>
                      )}
                      {sleepTimes && (
                        <Text style={{ fontSize:12, color:theme.textMuted, fontFamily:'DMSans_500Medium', marginTop:6 }}>
                          {sleepTimes.bed} → {sleepTimes.wake}
                        </Text>
                      )}
                    </View>
                    <View ref={sleepDonutRef} collapsable={false} style={{ flex:1, alignItems:'center' }}>
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
                  {/* Stage stat boxes: identical layout to the recovery signal boxes
                      (chip + stacked label/value-unit). Core/Deep/REM show duration +
                      % of sleep (donut denominator); Awake shows duration + wake-event
                      count (it is interruptions, not a sleep-stage share). */}
                  <View ref={sleepStagesRef} collapsable={false} style={{ flexDirection:'row', flexWrap:'wrap', gap:8 }}>
                    {[
                      { label:'Core',  color:theme.sleepCore,  value:fmtMs(coreMs), unit:`${Math.round(corePct*100)}% of sleep` },
                      { label:'Deep',  color:theme.sleepDeep,  value:fmtMs(deepMs), unit:`${Math.round(deepPct*100)}% of sleep` },
                      { label:'REM',   color:theme.sleepRem,   value:fmtMs(remMs),  unit:`${Math.round(remPct*100)}% of sleep` },
                      { label:'Awake', color:theme.sleepAwake, value:fmtMs(sleepAwakeMs), unit:`${sleepAwakeCount} ${sleepAwakeCount === 1 ? 'wake' : 'wakes'}` },
                    ].map(s => (
                      <View key={s.label} style={{ flex:1, minWidth:'46%', flexDirection:'row', alignItems:'center', gap:8, backgroundColor:s.color+'12', borderWidth:0.5, borderColor:s.color+'33', borderRadius:10, paddingVertical:9, paddingHorizontal:11 }}>
                        <View style={{ width:26, height:26, borderRadius:13, backgroundColor:s.color+'22', alignItems:'center', justifyContent:'center' }}>
                          <View style={{ width:10, height:10, borderRadius:5, backgroundColor:s.color }} />
                        </View>
                        <View style={{ flex:1 }}>
                          <Text style={{ fontSize:9, color:theme.textMuted, fontFamily:'DMSans_700Bold', letterSpacing:1, textTransform:'uppercase' }}>{s.label}</Text>
                          <View style={{ flexDirection:'row', alignItems:'baseline', gap:3 }}>
                            <Text style={{ fontSize:19, color:s.color, fontFamily:'BebasNeue_400Regular', letterSpacing:0.5 }}>{s.value}</Text>
                            <Text style={{ fontSize:9, color:theme.textDim, fontFamily:'DMSans_400Regular' }}>{s.unit}</Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              ) : (
                <View style={{ flexDirection:'row', alignItems:'center' }}>
                  <View style={{ flex:1, paddingRight:12 }}>
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
                    <View style={{ flex:1, alignItems:'center' }}>
                      <ScoreRing
                        score={score} scoreColor={scoreColor} trackColor={theme.sleepTrack}
                        donutSize={donutSize} donutStroke={donutStroke} donutRadius={donutRadius} donutCirc={donutCirc}
                        shimmer={score >= 85} refreshKey={refreshKey}
                      />
                    </View>
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
                              triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
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
                    <Text numberOfLines={aiSleepTip ? 2 : undefined} style={{ fontSize:11, color:theme.textMuted, fontFamily:'DMSans_400Regular', fontStyle:'italic', flex:1, lineHeight:17 }}>{tip}</Text>
                  </View>
                  {aiSleepTip && (
                    <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'flex-end', marginTop:6 }}>
                      <Text style={{ fontSize:10, color:theme.accentBlue, fontFamily:'DMSans_600SemiBold' }}>Sleep Hub</Text>
                      <Ionicons name="chevron-forward" size={11} color={theme.accentBlue} style={{ marginLeft:1 }} />
                    </View>
                  )}
                </View>
              )}
              <Text style={{ fontSize:10, color:theme.textDim, fontFamily:'DMSans_400Regular', textAlign:'center', marginTop:8, fontStyle:'italic' }}>For informational purposes only. Not medical advice.</Text>
            </View>
          );
        })()}
          </TouchableOpacity>
        </ScrollView>

        {/* Dot indicators */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5, paddingBottom: 10 }}>
          <View style={{ width: activeSleepFace === 0 ? 16 : 6, height: 5, borderRadius: 3, backgroundColor: activeSleepFace === 0 ? RECOVERY_PURPLE : theme.textDim, opacity: activeSleepFace === 0 ? 1 : 0.35 }} />
          <View style={{ width: activeSleepFace === 1 ? 16 : 6, height: 5, borderRadius: 3, backgroundColor: activeSleepFace === 1 ? theme.accentBlueRaw : theme.textDim, opacity: activeSleepFace === 1 ? 1 : 0.35 }} />
        </View>
      </Animated.View>
    );
  };

  const renderFitnessMetricsCard = () => {
    const hasAny = vo2Max !== null || cardioRecovery !== null || restingHR !== null || respiratoryRate !== null || bloodOxygen !== null;

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

    const metricBoxes: { key: string; label: string; value: string; unit: string; icon: any; color: string }[] = [];
    if (vo2Max !== null)          metricBoxes.push({ key: 'vo2max',    label: 'VO2 Max',    value: `${vo2Max}`,                              unit: 'ml/kg/min', icon: 'speedometer', color: fitnessColor('vo2max', vo2Max) });
    if (cardioRecovery !== null)  metricBoxes.push({ key: 'cardio',    label: 'Cardio Recovery', value: `${cardioRecovery}`,                 unit: 'bpm/min',   icon: 'pulse',       color: fitnessColor('cardio', cardioRecovery) });
    if (restingHR !== null)       metricBoxes.push({ key: 'restingHR', label: 'Resting HR', value: `${restingHR}`,                           unit: 'bpm',       icon: 'heart',       color: fitnessColor('restingHR', restingHR) });
    if (respiratoryRate !== null) metricBoxes.push({ key: 'respRate',  label: 'Resp. Rate', value: `${Math.round(respiratoryRate * 10) / 10}`, unit: 'br/min',  icon: 'cloud-outline', color: fitnessColor('respRate', respiratoryRate) });
    if (bloodOxygen !== null)     metricBoxes.push({ key: 'bloodO2',   label: 'Blood O2',   value: `${Math.round(bloodOxygen * 10) / 10}`,   unit: '% SpO2',    icon: 'water',       color: fitnessColor('bloodO2', bloodOxygen) });

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
            <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8, justifyContent: 'center' }}>
              {metricBoxes.map(m => (
                <View key={m.key} style={{ width: '48%', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: m.color + '12', borderWidth: 0.5, borderColor: m.color + '33', borderRadius: 10, paddingVertical: 9, paddingHorizontal: 11 }}>
                  <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: m.color + '22', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name={m.icon} size={13} color={m.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: 'DMSans_700Bold', letterSpacing: 1, textTransform: 'uppercase' }}>{m.label}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
                      <Text style={{ fontSize: 19, color: m.color, fontFamily: 'BebasNeue_400Regular', letterSpacing: 0.5 }}>{m.value}</Text>
                      <Text style={{ fontSize: 9, color: theme.textDim, fontFamily: 'DMSans_400Regular' }}>{m.unit}</Text>
                    </View>
                  </View>
                </View>
              ))}
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
          <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); router.push('/journal'); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
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
            triggerHaptic(isClearing ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Medium);
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

  // Format a challenge metric value for the home card (matches the YvY formats it replaced).
  const fmtChallengeVal = (metric: ChallengeMetric, v: number | null): string => {
    if (v === null) return '--';
    if (metric === 'steps') return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : Math.round(v).toString();
    if (metric === 'net')   return `${v > 0 ? '+' : ''}${Math.round(v).toLocaleString()}`;
    if (metric === 'weight') return v.toFixed(1);
    return Math.round(v).toString();
  };

  // ── Challenge home card (repurposes the retired YvY two-column layout) ──
  // States: empty (CTA) | pending (starts tomorrow) | active (beat = two columns,
  // custom = single-metric hero) | complete (gradient wash + outcome). Tappable
  // into /challenges; the empty CTA routes to /challenge-create.
  const renderChallengeCard = () => {
    const isMindful = styleMode === 'mindful';
    const accentRaw = theme.accentBlueRaw;
    const ch = activeChallenge;
    const prog = challengeProg;

    // ── Empty: no active challenge ──
    if (!ch || !prog) {
      return (
        <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: accentRaw, overflow: 'hidden' }]}>
          <Ionicons name="trophy" size={130} color={accentRaw} style={{ position: 'absolute', right: -24, bottom: -28, opacity: 0.10 }} />
          <View style={{ flexDirection:'row', alignItems:'center', gap:6, marginBottom:14 }}>
            <Ionicons name="trophy" size={11} color={theme.textMuted} />
            <Text style={[styles.cardLabel, { marginBottom:0, color: theme.textMuted }]}>Challenge</Text>
            <TooltipIcon tooltipKey="challenge_system" />
          </View>
          <View style={{ alignItems:'center', paddingVertical:6, gap:8 }}>
            <Text style={{ color: accentRaw, fontSize:20, fontFamily:'BebasNeue_400Regular', letterSpacing:1, textAlign:'center' }}>
              {isMindful ? 'Set a Personal Challenge' : 'Start a Challenge'}
            </Text>
            <Text style={{ color: theme.textSecondary, fontSize:12, fontFamily:'DMSans_400Regular', textAlign:'center', lineHeight:18, marginBottom:8 }}>
              {isMindful
                ? 'Grow past a previous week, or set a higher daily target for a stretch. Track it gently right here.'
                : 'Beat a previous week, or set a higher daily target for a stretch. Track it live, right here.'}
            </Text>
            <TouchableOpacity
              onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Medium); router.push('/challenge-create'); }}
              style={{ backgroundColor: accentRaw, borderRadius: 8, paddingVertical: 12, alignSelf: 'stretch', alignItems: 'center' }}>
              <Text style={{ fontSize:13, fontFamily:'DMSans_600SemiBold', color:'#fff' }}>
                {isMindful ? 'Set a Challenge' : 'Start a Challenge'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    const status = prog.status;
    const ended = status === 'ended';
    const pending = status === 'pending';
    const title = challengeTitle(ch, isMindful);
    const won = prog.won;
    const perfect = prog.tier === 'perfect';

    // Top-left label per state.
    const cardLabel = pending ? 'Starts Tomorrow'
      : ended ? 'Complete'
      : `Day ${prog.dayNumber} of ${prog.totalDays}`;

    // Header right chip (countdown) -- active only.
    const daysLeftChip = prog.daysRemaining <= 0 ? 'Final day'
      : `${prog.daysRemaining} ${prog.daysRemaining === 1 ? 'day' : 'days'} left`;

    // ── Complete: gradient wash (won = amber, partial = gentler accent) ──
    if (ended) {
      const washColor = won ? theme.accentAmber : accentRaw;
      const outcomeLine = ch.type === 'beat'
        ? (won
            ? (isMindful ? 'You grew past your previous period on every metric.' : 'You beat your previous period on every metric.')
            : `${isMindful ? 'Ahead on' : 'You came out ahead on'} ${prog.metricsBeaten ?? 0} of ${prog.metricsTotal ?? 0} metrics.`)
        : prog.isWeight
          ? (prog.weightChangeSoFar == null ? 'Not enough weigh-ins to call it.' : `${prog.weightChangeSoFar < 0 ? 'Down' : 'Up'} ${Math.abs(prog.weightChangeSoFar).toFixed(1)} of ${Math.abs(ch.target ?? 0).toFixed(1)} lbs.`)
          : `You hit it ${prog.daysHit ?? 0} of ${prog.totalDays} days.`;
      return (
        <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: washColor, overflow: 'hidden' }]}>
          <CardWash color={washColor} scored />
          <Ionicons name={won ? 'trophy' : 'ribbon'} size={130} color={washColor} style={{ position: 'absolute', right: -24, bottom: -28, opacity: 0.12 }} />
          <View style={{ flexDirection:'row', alignItems:'center', gap:6, marginBottom:10 }}>
            <Ionicons name={won ? 'trophy' : 'ribbon'} size={12} color={washColor} />
            <Text style={[styles.cardLabel, { marginBottom:0, color: washColor }]}>{perfect && won ? 'Perfect' : 'Complete'}</Text>
          </View>
          <Text style={{ fontSize:18, fontFamily:'DMSans_700Bold', color: theme.textPrimary, marginBottom:4 }}>{title}</Text>
          <Text style={{ fontSize:13, fontFamily:'DMSans_400Regular', color: theme.textSecondary, lineHeight:19, marginBottom:14 }}>{outcomeLine}</Text>
          <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
            <Text style={{ fontSize:13, fontFamily:'DMSans_600SemiBold', color: washColor }}>See how you did ›</Text>
            <TouchableOpacity
              onPress={async (e: any) => { e?.stopPropagation?.(); triggerHaptic(Haptics.ImpactFeedbackStyle.Light); await clearActiveChallenge(); setActiveChallenge(null); setChallengeProg(null); }}
              hitSlop={{ top:8, bottom:8, left:8, right:8 }}
              style={{ paddingVertical:4, paddingHorizontal:10, borderRadius:6, borderWidth:1, borderColor: theme.borderCard }}>
              <Text style={{ fontSize:12, fontFamily:'DMSans_600SemiBold', color: theme.textMuted }}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    // ── Pending: bounded < 24h, summary only (no elapsed data to show yet) ──
    if (pending) {
      const summary = ch.type === 'beat'
        ? (prog.rows ?? []).map(r => r.label).join(', ')
        : title;
      return (
        <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: accentRaw, overflow: 'hidden' }]}>
          <Ionicons name="trophy" size={130} color={accentRaw} style={{ position: 'absolute', right: -24, bottom: -28, opacity: 0.10 }} />
          <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
              <Ionicons name="trophy" size={11} color={theme.textMuted} />
              <Text style={[styles.cardLabel, { marginBottom:0, color: theme.textMuted }]}>{cardLabel}</Text>
              <TooltipIcon tooltipKey="challenge_system" />
            </View>
          </View>
          <Text style={{ fontSize:18, fontFamily:'DMSans_700Bold', color: theme.textSecondary, marginBottom:4 }}>{title}</Text>
          {ch.type === 'beat' && !!summary && (
            <Text style={{ fontSize:12, fontFamily:'DMSans_400Regular', color: theme.textMuted, marginBottom:10 }}>{summary}</Text>
          )}
          <View style={{ flexDirection:'row', alignItems:'center', gap:5, marginTop:6 }}>
            <Ionicons name="time-outline" size={13} color={accentRaw} />
            <Text style={{ fontSize:12, fontFamily:'DMSans_600SemiBold', color: accentRaw }}>
              Kicks off tomorrow, {prog.totalDays} {prog.totalDays === 1 ? 'day' : 'days'}
            </Text>
          </View>
        </View>
      );
    }

    // ── Active ──
    return (
      <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: accentRaw, overflow: 'hidden' }]}>
        <Ionicons name="trophy" size={130} color={accentRaw} style={{ position: 'absolute', right: -24, bottom: -28, opacity: 0.10 }} />
        {/* Header */}
        <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
          <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
            <Ionicons name="trophy" size={11} color={theme.textMuted} />
            <Text style={[styles.cardLabel, { marginBottom:0, color: theme.textMuted }]}>{cardLabel}</Text>
            <TooltipIcon tooltipKey="challenge_system" />
          </View>
          <View style={{ flexDirection:'row', alignItems:'center', gap:4, backgroundColor: `${accentRaw}18`, borderWidth:1, borderColor:`${accentRaw}40`, borderRadius:6, paddingHorizontal:8, paddingVertical:3 }}>
            <Ionicons name="timer-outline" size={10} color={accentRaw} />
            <Text style={{ fontSize:10, fontFamily:'DMSans_700Bold', letterSpacing:0.5, color: accentRaw }}>{daysLeftChip}</Text>
          </View>
        </View>
        <Text style={{ fontSize:16, fontFamily:'DMSans_700Bold', color: theme.textSecondary, marginBottom: ch.type === 'beat' ? 2 : 12 }}>{title}</Text>

        {ch.type === 'beat' ? (
          <>
            <Text style={{ fontSize:12, fontFamily:'DMSans_600SemiBold', color: accentRaw, marginBottom:10 }}>
              {isMindful ? 'Ahead on' : 'Leading on'} {prog.metricsBeaten ?? 0} of {prog.metricsTotal ?? 0}
            </Text>
            {/* Column headers */}
            <View style={{ flexDirection:'row', marginBottom:4 }}>
              <View style={{ flex:1 }} />
              <View style={{ width:80, alignItems:'center' }}>
                <Text style={{ fontSize:9, fontFamily:'DMSans_700Bold', letterSpacing:1.5, textTransform:'uppercase', color: accentRaw }}>You so far</Text>
              </View>
              <View style={{ width:80, alignItems:'center' }}>
                <Text style={{ fontSize:9, fontFamily:'DMSans_700Bold', letterSpacing:1.5, textTransform:'uppercase', color: theme.textDim }}>{isMindful ? 'Previous' : 'To Beat'}</Text>
              </View>
            </View>
            {/* Metric rows */}
            {(prog.rows ?? []).map((r, i, arr) => {
              const youLead = r.beating;
              const youColor = isMindful ? theme.textSecondary : (youLead ? accentRaw : theme.textDim);
              const benchColor = isMindful ? theme.textDim : (!youLead && r.enoughData ? theme.textSecondary : theme.textDim);
              return (
                <View key={r.metric} style={{ flexDirection:'row', alignItems:'center', paddingVertical:9,
                  borderBottomWidth: i < arr.length - 1 ? 0.5 : 0, borderBottomColor: theme.borderSubtle }}>
                  <View style={{ flex:1 }}>
                    <Text style={{ fontSize:10, fontFamily:'DMSans_700Bold', letterSpacing:2, textTransform:'uppercase', color: theme.textPrimary }}>{r.label}</Text>
                  </View>
                  <View style={{ width:80, alignItems:'center' }}>
                    {!isMindful && youLead && (
                      <View style={{ position:'absolute', left:2, top:'10%', width:3, height:'80%', backgroundColor: accentRaw, borderRadius:2 }} />
                    )}
                    <Text style={{ fontSize:20, fontFamily:'BebasNeue_400Regular', letterSpacing:1, color: youColor }}>{fmtChallengeVal(r.metric, r.youAvg)}</Text>
                    <Text style={{ fontSize:8, fontFamily:'DMSans_700Bold', letterSpacing:1, textTransform:'uppercase', color: youColor, opacity:0.6 }}>{r.unit}</Text>
                  </View>
                  <View style={{ width:80, alignItems:'center' }}>
                    <Text style={{ fontSize:20, fontFamily:'BebasNeue_400Regular', letterSpacing:1, color: benchColor }}>{fmtChallengeVal(r.metric, r.benchmarkAvg)}</Text>
                    <Text style={{ fontSize:8, fontFamily:'DMSans_700Bold', letterSpacing:1, textTransform:'uppercase', color: benchColor, opacity:0.6 }}>{r.unit}</Text>
                  </View>
                </View>
              );
            })}
          </>
        ) : (() => {
          // ── Custom: single-metric hero ──
          const metric = prog.metric as ChallengeMetric;
          if (prog.isWeight) {
            const change = prog.weightChangeSoFar ?? null;
            const target = Math.abs(ch.target ?? 0);
            const lose = !ch.weightGoal.startsWith('gain');
            const doneAbs = change === null ? 0 : Math.abs(change);
            const pct = target > 0 ? Math.min((doneAbs / target) * 100, 100) : 0;
            return (
              <>
                <Text style={{ fontSize:26, fontFamily:'BebasNeue_400Regular', letterSpacing:1, color: theme.textPrimary, marginBottom:8 }}>
                  {change === null ? 'Need 2 weigh-ins' : `${lose ? 'Down' : 'Up'} ${Math.abs(change).toFixed(1)} `}
                  {change !== null && <Text style={{ color: theme.textMuted }}>of {target.toFixed(1)} lbs</Text>}
                </Text>
                <AnimatedProgressBar pct={pct} color={accentRaw} trackColor={theme.bgProgressTrack} refreshKey={refreshKey} />
                <Text style={{ fontSize:12, fontFamily:'DMSans_500Medium', color: theme.textMuted, marginTop:8 }}>
                  {prog.daysRemaining} {prog.daysRemaining === 1 ? 'day' : 'days'} left
                </Text>
              </>
            );
          }
          const target = ch.target ?? 0;
          const today = prog.todayValue ?? null;
          // Bar reflects today's actual value vs target (not days-hit ratio which is 0% on day 1).
          // Hide bar entirely if today has no data yet (would show a meaningless empty track).
          const todayBarPct = (today !== null && target !== 0) ? Math.min((today / target) * 100, 100) : null;
          const unitLabel = metric === 'sleepScore' ? '' : METRIC_META[metric].unit;
          const daysHit = prog.daysHit ?? 0;
          const daysElapsed = prog.daysElapsed ?? 0;
          const daysRemaining = prog.daysRemaining ?? 0;
          return (
            <>
              <View style={{ flexDirection:'row', alignItems:'baseline', gap:6, marginBottom:8 }}>
                <Text style={{ fontSize:26, fontFamily:'BebasNeue_400Regular', letterSpacing:1, color: theme.textPrimary }}>{fmtChallengeVal(metric, today)}</Text>
                <Text style={{ fontSize:16, fontFamily:'BebasNeue_400Regular', letterSpacing:1, color: theme.textMuted }}>/ {fmtChallengeVal(metric, target)}{unitLabel ? ` ${unitLabel}` : ''}</Text>
                <Text style={{ fontSize:10, fontFamily:'DMSans_500Medium', color: theme.textDim, marginLeft:'auto' }}>today</Text>
              </View>
              {todayBarPct !== null && (
                <AnimatedProgressBar pct={todayBarPct} color={accentRaw} trackColor={theme.bgProgressTrack} refreshKey={refreshKey} />
              )}
              <Text style={{ fontSize:12, fontFamily:'DMSans_500Medium', color: theme.textMuted, marginTop:8 }}>
                Hit {daysHit} of {daysElapsed} days, {daysRemaining} left
              </Text>
            </>
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
        const pageCount = homeTips.length > 0 ? homeTips.length : (coachCache ? 1 : 0);
        if (pageCount === 0) return null;
        const page0Tip = homeTips[0] ?? null;
        const page0Positive = coachCache ? coachCache.packet.tone === 'positive' : (page0Tip?.positive ?? false);
        const page0Tier = coachCache ? (coachCache.packet.tone === 'care' ? 'urgent' : 'pattern') : (page0Tip?.tier ?? 'insight');
        const page0BorderColor = page0Positive ? theme.statusGood : page0Tier === 'urgent' ? theme.statusBad : theme.statusWarn;
        const tipShadow = { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 3 };
        return (
          <Animated.View
            style={[styles.card, { padding: 0, overflow: 'hidden', backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopWidth: 1.5, borderTopColor: page0BorderColor, ...tipShadow, ...(tipHeightReady ? { height: cardHeightAnim } : {}) }]}
            onLayout={e => { const w = e.nativeEvent.layout.width; tipCardWidthRef.current = w; setTipCardWidth(w); }}
          >
            <ScrollView
              ref={tipScrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScrollBeginDrag={onTipScrollBeginDrag}
              onMomentumScrollEnd={onTipMomentumEnd}
            >
              {Array.from({ length: pageCount }, (_, idx) => {
                const homeTip = homeTips[idx] ?? null;
                const isFirst = idx === 0;
                const displayTitle = isFirst && coachCache ? resolveTipTitle(coachCache) : (homeTip?.title ?? '');
                const displayBody = isFirst && coachCache ? resolveTipBody(coachCache) : (homeTip?.body ?? '');
                const isPositive = isFirst && coachCache ? coachCache.packet.tone === 'positive' : (homeTip?.positive ?? false);
                const tierStr = isFirst && coachCache ? (coachCache.packet.tone === 'care' ? 'urgent' : 'pattern') : (homeTip?.tier ?? 'insight');
                const chipLabel = isPositive ? 'POSITIVE' : tierStr === 'urgent' ? 'URGENT' : 'INSIGHT';
                const chipColor = isPositive ? theme.statusGood : tierStr === 'urgent' ? theme.statusBad : theme.statusWarn;
                return (
                  <TouchableOpacity
                    key={idx}
                    activeOpacity={0.92}
                    style={{ width: tipCardWidth || undefined }}
                    onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); router.push('/diagnostic-report'); }}
                  >
                    <View
                      style={{ padding: 16 }}
                      onLayout={e => {
                        const h = Math.ceil(e.nativeEvent.layout.height);
                        pageHeightsRef.current[idx] = h;
                        if (!tipHeightReady && idx === 0) {
                          cardHeightAnim.setValue(h);
                          setTipHeightReady(true);
                        } else if (tipHeightReady && idx === tipIndexRef.current) {
                          Animated.timing(cardHeightAnim, { toValue: h, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
                        }
                      }}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Ionicons name="sparkles" size={12} color={theme.accentBlueRaw} />
                          <Text style={{ fontSize: 9, fontFamily: 'DMSans_700Bold', letterSpacing: 3, color: theme.accentBlueRaw, textTransform: 'uppercase' }}>Coach Insight</Text>
                          <TooltipIcon tooltipKey="smart_tip" size={14} />
                        </View>
                        <View style={{ backgroundColor: chipColor + '22', borderWidth: 1, borderColor: chipColor + '55', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                          <Text style={{ fontSize: 9, fontFamily: 'DMSans_700Bold', letterSpacing: 2, color: chipColor }}>{chipLabel}</Text>
                        </View>
                      </View>
                      <Text style={{ fontSize: 15, fontFamily: 'DMSans_700Bold', color: theme.textSecondary, lineHeight: 21, marginBottom: 6 }}>{displayTitle}</Text>
                      <Text numberOfLines={3} ellipsizeMode="tail" style={{ fontSize: 13, fontFamily: 'DMSans_400Regular', color: theme.textSecondary, lineHeight: 20, marginBottom: 12 }}>{displayBody}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={{ fontSize: 11, fontFamily: 'DMSans_600SemiBold', color: theme.accentBlueRaw }}>View in Effort vs Results</Text>
                        <Ionicons name="chevron-forward" size={12} color={theme.accentBlueRaw} />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            {pageCount > 1 && (
              <View style={{ position: 'absolute', bottom: 10, right: 12, flexDirection: 'row', alignItems: 'center', gap: 5 }} pointerEvents="none">
                {Array.from({ length: pageCount }, (_, i) => (
                  <View key={i} style={{ width: i === tipIndex ? 7 : 6, height: i === tipIndex ? 7 : 6, borderRadius: i === tipIndex ? 3.5 : 3, backgroundColor: i === tipIndex ? theme.accentBlueRaw : theme.textMuted + '40' }} />
                ))}
              </View>
            )}
          </Animated.View>
        );
      }
      case 'calories':        return renderCaloriesCard();
      case 'macros':          return renderMacrosCard();
      case 'water':           return renderWaterCard();
      case 'weight':          return renderWeightCard();
      case 'workout':         return renderWorkoutCard();
      case 'steps':           return renderStepsCard();
      case 'sleep':           return renderSleepRecoveryCard();
      case 'fitness_metrics': return renderFitnessMetricsCard();
      case 'daily_note':      return renderDailyNoteCard();
      case 'gratitude_streak':
        if (faithJourney === 'notrightnow') return null;
        return <GratitudeStreakCard styleMode={styleMode} todayKey={todayKey} scrollRef={scrollRef} theme={theme} />;
      case 'reading_plans':
        if (faithJourney === 'notrightnow') return null;
        return <ReadingPlansCard theme={theme} />;
      case 'vs_yesterday': {
        const cardContent = renderChallengeCard();
        // Empty state owns its own CTA button -> don't make the whole card navigate.
        if (!activeChallenge) return cardContent;
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
              onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); router.push('/challenges'); }}
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
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={[styles.headerTitle, { color: theme.accentBlueRaw, fontSize: 28 }]}>
              {(() => { const h=new Date().getHours(); return h<12?'Good morning':h<17?'Good afternoon':'Good evening'; })()}
            </Text>
            <Text style={{ fontSize:9, color: theme.textMuted, fontFamily:'DMSans_700Bold', marginTop:1, letterSpacing:2, textTransform:'uppercase' }}>
              {new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection:'row', gap:8, alignItems:'center' }}>
            <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); fetchTodayData(); setRefreshKey(k=>k+1); showToast('Health data refreshed', undefined, 'info'); }}
              style={[styles.headerBtn, { backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder }]}>
              <Ionicons name="refresh" size={14} color={theme.accentBlue} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); dayDetailAnim.setValue(0); setDayDetailDate(todayKey); }}
              style={[styles.headerBtn, { backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder }]}>
              <Ionicons name="calendar" size={14} color={theme.accentBlue} />
            </TouchableOpacity>
            <View ref={editLayoutBtnRef} collapsable={false}>
              <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); enterEditMode(); }} style={[styles.headerBtn, { backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder }]}>
                <Ionicons name="grid" size={14} color={theme.accentBlue} />
              </TouchableOpacity>
            </View>
            <View ref={toolkitRef} collapsable={false}>
              <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); showToolkit('home'); }} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
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
          <>
          <Animated.View style={{ position:'absolute', top:0, bottom:0, left:0, right:0, backgroundColor: theme.overlayBg, zIndex:999, opacity: waterDetailAnim }}>
            <TouchableOpacity style={StyleSheet.absoluteFill} onPress={closeWaterDetailModal} activeOpacity={1} />
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={{ flex:1, justifyContent:'center', alignItems:'center' }}
              pointerEvents="box-none">
            <Animated.View style={{ width:'92%', maxHeight:'82%', backgroundColor: theme.bgSheet, borderRadius:16, borderWidth:0.5, borderColor: theme.borderCard, borderTopWidth:1.5, borderTopColor: theme.accentBlueRaw, overflow:'hidden', transform:[{scale: cardScale}] }}>
              {/* Handle + header always visible above scroll */}
              <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); closeWaterDetailModal(); }} style={{ alignItems:'center', paddingTop:12, paddingBottom:8 }}>
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
                        <View style={{ flexDirection:'row', alignItems:'center', gap:16 }}>
                          <TouchableOpacity onPress={() => openWaterEntryEdit(realIdx)} hitSlop={{top:8,bottom:8,left:8,right:8}}>
                            <Ionicons name="pencil" size={15} color={theme.accentBlue} />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => deleteWaterEntry(realIdx)} hitSlop={{top:8,bottom:8,left:8,right:8}}>
                            <Ionicons name="trash-outline" size={16} color={theme.accentRed} />
                          </TouchableOpacity>
                        </View>
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
                  onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Medium); saveWaterPresets(); }}
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
                        onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Medium); saveWaterGoal(); }}
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

          {/* Edit Entry overlay (amount + sign) -- layered above the water modal */}
          {editingWaterIdx !== null && (
            <Animated.View style={{ position:'absolute', top:0, bottom:0, left:0, right:0, backgroundColor: theme.overlayBg, zIndex:1000, opacity: editWaterAnim }}>
              <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeWaterEntryEdit} />
              <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex:1, justifyContent:'center', alignItems:'center' }} pointerEvents="box-none">
                <Animated.View style={{ width:'82%', backgroundColor: theme.bgSheet, borderRadius:16, borderWidth:0.5, borderColor: theme.borderCard, borderTopWidth:1.5, borderTopColor: theme.accentBlueRaw, padding:18, transform:[{ scale: editWaterAnim.interpolate({ inputRange:[0,1], outputRange:[0.9,1] }) }] }}>
                  <View style={{ alignItems:'center', marginBottom:6 }}>
                    <View style={{ width:36, height:4, borderRadius:2, backgroundColor: theme.sheetHandle }} />
                  </View>
                  <Text style={{ fontSize:9, color: theme.accentBlueRaw, fontFamily:'DMSans_700Bold', letterSpacing:3, textTransform:'uppercase', marginBottom:16, textAlign:'center' }}>Edit Entry</Text>
                  {/* Sign toggle */}
                  <View style={{ flexDirection:'row', gap:8, marginBottom:14 }}>
                    <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setEditWaterSign('add'); }}
                      style={{ flex:1, paddingVertical:10, borderRadius:8, borderWidth:1, alignItems:'center', backgroundColor: editWaterSign==='add' ? theme.statusGood+'22' : 'transparent', borderColor: editWaterSign==='add' ? theme.statusGood : theme.borderInput }}>
                      <Text style={{ fontSize:13, fontFamily:'DMSans_600SemiBold', color: editWaterSign==='add' ? theme.statusGood : theme.textMuted }}>Add</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setEditWaterSign('remove'); }}
                      style={{ flex:1, paddingVertical:10, borderRadius:8, borderWidth:1, alignItems:'center', backgroundColor: editWaterSign==='remove' ? theme.statusBad+'22' : 'transparent', borderColor: editWaterSign==='remove' ? theme.statusBad : theme.borderInput }}>
                      <Text style={{ fontSize:13, fontFamily:'DMSans_600SemiBold', color: editWaterSign==='remove' ? theme.statusBad : theme.textMuted }}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                  {/* Amount */}
                  <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'center', marginBottom:18 }}>
                    <TextInput
                      style={{ backgroundColor: theme.bgInput, borderWidth:0.5, borderColor: theme.borderInput, borderRadius:8, color: theme.textSecondary, paddingVertical:10, paddingHorizontal:16, fontSize:26, fontFamily:'BebasNeue_400Regular', textAlign:'center', minWidth:130 }}
                      value={editWaterAmount}
                      onChangeText={v => setEditWaterAmount(v.replace(/[^0-9]/g,''))}
                      keyboardType="number-pad"
                      autoFocus
                      placeholder="0"
                      placeholderTextColor={theme.textPlaceholder}
                    />
                    <Text style={{ fontSize:16, color: theme.textMuted, fontFamily:'BebasNeue_400Regular', marginLeft:8 }}>oz</Text>
                  </View>
                  {/* Actions */}
                  <View style={{ flexDirection:'row', gap:8 }}>
                    <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); closeWaterEntryEdit(); }} style={{ flex:1, paddingVertical:12, borderRadius:8, borderWidth:1, borderColor: theme.borderInput, alignItems:'center' }}>
                      <Text style={{ fontSize:14, fontFamily:'DMSans_600SemiBold', color: theme.textMuted }}>Cancel</Text>
                    </TouchableOpacity>
                    {(() => {
                      const amt = parseInt(editWaterAmount);
                      const saveable = !isNaN(amt) && amt > 0;
                      return (
                        <TouchableOpacity onPress={saveWaterEntryEdit} disabled={!saveable}
                          style={{ flex:1, paddingVertical:12, borderRadius:8, borderWidth:1, alignItems:'center', backgroundColor: saveable ? theme.accentBlueBg : theme.bgInput, borderColor: saveable ? theme.accentBlueBorder : theme.borderInput, opacity: saveable ? 1 : 0.5 }}>
                          <Text style={{ fontSize:14, fontFamily:'DMSans_600SemiBold', color: saveable ? theme.accentBlue : theme.textDim }}>Save</Text>
                        </TouchableOpacity>
                      );
                    })()}
                  </View>
                </Animated.View>
              </KeyboardAvoidingView>
            </Animated.View>
          )}
          </>
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
              <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); closeDayDetail(); }} style={{ alignSelf: 'center', paddingVertical: 6, paddingHorizontal: 40 }}>
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
        {/* ── Vacation Mode banner ── */}
        {vacationBanner && (() => {
          const today = vacationTodayKey();
          const isScheduled = today < vacationBanner.startKey;
          const rd = new Date(addDaysKey(vacationBanner.endKey, 1) + 'T00:00:00');
          const VAC_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
          const VAC_DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
          const resumeStr = `${VAC_DOW[rd.getDay()]} ${VAC_MONTHS[rd.getMonth()]} ${rd.getDate()}`;
          return (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueRaw + '44', borderRadius: 12, padding: 12, marginBottom: 12, gap: 10 }}>
              <Ionicons name="airplane" size={18} color={theme.accentBlueRaw} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontFamily: 'DMSans_700Bold', color: theme.accentBlueRaw }}>
                  {isScheduled ? 'Vacation Scheduled' : 'On Vacation'}
                </Text>
                <Text style={{ fontSize: 11, fontFamily: 'DMSans_400Regular', color: theme.textMuted }}>
                  Back {resumeStr}
                </Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={async () => {
                  triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
                  await endVacationEarly();
                  setVacationBanner(null);
                  showToast('Vacation ended early', undefined, 'success');
                }}
                style={{ backgroundColor: theme.accentRedBg, borderWidth: 1, borderColor: theme.accentRedBorder, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 }}
              >
                <Text style={{ fontSize: 11, fontFamily: 'DMSans_700Bold', color: theme.accentRed, letterSpacing: 1 }}>END EARLY</Text>
              </TouchableOpacity>
            </View>
          );
        })()}

        {visibleCards.map((id) => (
          <View key={id} onLayout={(e) => { cardOffsets.current[id] = e.nativeEvent.layout.y; }}>
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
                          onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); toggleCardVisible(id); }}
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
            <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); exitEditMode(); }} style={{ alignSelf:'center', paddingVertical:10, paddingHorizontal:40 }}>
              <View style={[styles.editSheetHandle, { backgroundColor: theme.sheetHandle }]} />
            </TouchableOpacity>
            {/* Header row */}
            <View style={[styles.editSheetHeader, { borderBottomColor: theme.borderSubtle }]}>
              <Text style={{ fontSize:13, color: theme.accentBlueRaw, fontFamily:'DMSans_700Bold', letterSpacing:2, textTransform:'uppercase' }}>Edit Layout</Text>
              <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); exitEditMode(); }}
                style={{ backgroundColor: theme.accentGreenBg, borderWidth:1, borderColor: theme.accentGreenBorder, borderRadius:6, paddingHorizontal:14, paddingVertical:6, height:32, alignItems:'center', justifyContent:'center' }}>
                <Text style={{ color: theme.accentGreen, fontSize:12, fontFamily:'DMSans_700Bold', letterSpacing:1 }}>DONE</Text>
              </TouchableOpacity>
            </View>

            {/* Segmented control tabs */}
            <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10 }}>
              <View style={{ flex: 1, flexDirection: 'row', backgroundColor: theme.bgInput, borderRadius: 10, padding: 3 }}>
                {(['my', 'add'] as const).map(tab => (
                  <TouchableOpacity key={tab} onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setEditTab(tab); }}
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
                          <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); toggleCardVisible(id); }}
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
                            <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); unpinGraphCard(card.id); }}
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
                      onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); toggleCardVisible(meta.id); setEditTab('my'); }}
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
                        onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); pinGraphCard(card); }}
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
      <Modal visible={showMacroGearSheet} transparent animationType="none" onShow={openMacroSheetAnim} onRequestClose={closeMacroSheetWithHaptic}>
        <ToastRenderer />
        <View style={{ flex:1, justifyContent:'center', alignItems:'center' }}>
          <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor:'rgba(0,0,0,0.55)', opacity: macroOpacityAnim }]} pointerEvents="none" />
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={closeMacroSheetWithHaptic} />
          <Animated.View style={{
            width:'86%', maxHeight:'78%',
            backgroundColor: theme.bgSheet,
            borderRadius:20, borderWidth:0.5, borderColor: theme.borderCard,
            borderTopWidth:4, borderTopColor: theme.accentBlueRaw,
            shadowColor:'#000', shadowOffset:{ width:0, height:10 }, shadowOpacity:0.45, shadowRadius:28, elevation:24,
            overflow:'hidden',
            transform:[{ scale: macroScaleAnim }], opacity: macroOpacityAnim,
          }}>
            {/* Handle */}
            <TouchableOpacity onPress={closeMacroSheetWithHaptic} style={{ alignItems:'center', paddingTop:12, paddingBottom:6 }} hitSlop={{ top:12, bottom:12, left:60, right:60 }}>
              <View style={{ width:36, height:4, borderRadius:2, backgroundColor: theme.borderCard }} />
            </TouchableOpacity>
            {/* Header */}
            <View style={{ paddingHorizontal:20, paddingBottom:14, paddingTop:6, borderBottomWidth:0.5, borderBottomColor: theme.borderCard }}>
              <Text style={{ fontSize:18, color: theme.accentBlue, fontFamily:'BebasNeue_400Regular', letterSpacing:2 }}>MACROS</Text>
            </View>
            <ScrollView contentContainerStyle={{ padding:20, paddingBottom:26 }} showsVerticalScrollIndicator={false}>
              {/* Macro goal presets -- hidden in Mindful */}
              {styleMode !== 'mindful' && (
                <>
                  <Text style={{ fontSize:9, letterSpacing:3, textTransform:'uppercase', color: theme.textMuted, fontFamily:'DMSans_700Bold', marginBottom:4 }}>Macro Goals</Text>
                  <Text style={{ fontSize:11, color: theme.textDim, fontFamily:'DMSans_400Regular', marginBottom:12, lineHeight:16 }}>Sets your protein, carb, and fat targets automatically.</Text>
                  <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8 }}>
                    {Object.entries(MACRO_PRESETS).map(([key, pr]) => {
                      const active = macroPreset === key;
                      return (
                        <TouchableOpacity key={key} onPress={() => applyMacroPreset(key)} activeOpacity={0.85}
                          style={{ width:'47%', paddingVertical:14, paddingHorizontal:10, borderRadius:12,
                            borderWidth: active ? 1.5 : 1,
                            backgroundColor: active ? theme.accentBlueBg : theme.bgCard,
                            borderColor: active ? theme.accentBlueBorder : theme.borderCard, alignItems:'center', gap:4 }}>
                          <Ionicons name={pr.icon} size={22} color={active ? theme.accentBlue : theme.textMuted} />
                          <Text style={{ fontSize:14, fontFamily:'DMSans_700Bold', color: active ? theme.accentBlue : theme.textSecondary }}>{pr.label}</Text>
                          <Text style={{ fontSize:11, fontFamily:'DMSans_400Regular', color: theme.textDim }}>{pr.p}P · {pr.c}C · {pr.f}F</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  {macroPreset === null && (
                    <Text style={{ fontSize:11, color: theme.textDim, fontFamily:'DMSans_400Regular', marginTop:10 }}>Custom goals set. Pick a preset to replace them.</Text>
                  )}
                  <TouchableOpacity
                    onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); closeMacroSheet(); router.push({ pathname: '/settings', params: { section: 'goals' } }); }}
                    hitSlop={{ top:8, bottom:8, left:8, right:8 }}
                    style={{ flexDirection:'row', alignItems:'center', gap:5, marginTop:12 }}>
                    <Ionicons name="options" size={13} color={theme.accentBlue} />
                    <Text style={{ fontSize:12, color: theme.accentBlue, fontFamily:'DMSans_600SemiBold' }}>Need exact numbers? Fine-tune in Settings {'>'} Goals</Text>
                  </TouchableOpacity>
                  <View style={{ height:0.5, backgroundColor: theme.borderCard, marginTop:16, marginBottom:16 }} />
                </>
              )}
              {/* Net Carbs display */}
              <Text style={{ fontSize:9, color: theme.textMuted, fontFamily:'DMSans_700Bold', letterSpacing:3, textTransform:'uppercase', marginBottom:14 }}>Macro Display</Text>
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
            </ScrollView>
          </Animated.View>
        </View>
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

      <NutrientDrilldownModal
        visible={showMacroDrilldown}
        onClose={() => setShowMacroDrilldown(false)}
        item={macroDrilldownItem}
        entries={todayEntries}
        defaultShowNet={showNetCarbs}
      />

      {/* Morning Day Summary pop-up (yesterday's Day Score) */}
      {daySummary && (
        <DaySummaryModal
          score={daySummary.score}
          dateKey={daySummary.dateKey}
          theme={theme}
          styleMode={styleMode}
          faithJourney={faithJourney}
          onClose={() => setDaySummary(null)}
          onViewSummary={() => { setDaySummary(null); router.push({ pathname: '/day-summary', params: { date: daySummary.dateKey } }); }}
        />
      )}

      {/* Weekly summary pop-up (last closed week, Sunday) */}
      {weekSummary && (
        <SummaryReadyModal
          tier="week"
          avgComposite={weekSummary.avgComposite}
          avgNutritionScore={weekSummary.avgNutritionScore}
          avgActivityScore={weekSummary.avgActivityScore}
          avgSleepScore={weekSummary.avgSleepScore}
          avgRecoveryScore={weekSummary.avgRecoveryScore}
          daysScored={weekSummary.daysScored}
          totalDays={7}
          rangeStart={weekSummary.weekStart}
          rangeEnd={weekSummary.weekEnd}
          theme={theme}
          styleMode={styleMode}
          onClose={() => setWeekSummary(null)}
          onViewBreakdown={() => { const ws = weekSummary.weekStart; setWeekSummary(null); router.push({ pathname: '/weekly-summary', params: { weekStart: ws } }); }}
        />
      )}

      {/* Monthly summary pop-up (last closed month, 1st) */}
      {monthSummary && (
        <SummaryReadyModal
          tier="month"
          avgComposite={monthSummary.avgComposite}
          avgNutritionScore={monthSummary.avgNutritionScore}
          avgActivityScore={monthSummary.avgActivityScore}
          avgSleepScore={monthSummary.avgSleepScore}
          avgRecoveryScore={monthSummary.avgRecoveryScore}
          daysScored={monthSummary.daysScored}
          totalDays={Number(monthSummary.monthEnd.split('-')[2])}
          rangeStart={monthSummary.monthStart}
          rangeEnd={monthSummary.monthEnd}
          theme={theme}
          styleMode={styleMode}
          onClose={() => setMonthSummary(null)}
          onViewBreakdown={() => { const mk = monthSummary.monthStart.slice(0, 7); setMonthSummary(null); router.push({ pathname: '/monthly-summary', params: { monthKey: mk } }); }}
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