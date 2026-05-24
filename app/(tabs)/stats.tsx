import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Animated, Dimensions, Easing, Keyboard, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { DayDetailContent } from '../day-detail';
import { useTheme } from '../../theme';
import { CardPeriod, ChartType, DATA_KEY_CATEGORIES, DATA_KEY_META, DataKey, DEFAULT_STATS_CARDS, StatsCard, availableChartTypes, generateCardId, loadStatsCards, saveStatsCards } from '../../statsCardRegistry';
import { ToastRenderer, useToast } from '../../components/Toast';
import { EMPTY_TREND_DATA, TrendData, fetchTrendData as fetchTrendDataUtil, offsetToDateKey } from '../../utils/statsData';
import { StatsGraphCard, GRAPH_SWATCHES, MACRO_PROTEIN, MACRO_CARBS, MACRO_FAT } from '../../components/StatsGraphCard';
import { StatsCardEditModal } from '../../components/StatsCardEditModal';
import TooltipIcon from '../../components/TooltipIcon';
import { storageSet } from '../../utils/storage';
import { showToolkit } from '../../components/ToolkitSheet';
import { useTutorial } from '../../context/TutorialContext';
import { useTutorialTarget } from '../../hooks/useTutorialTarget';

// ── Streak types and constants ────────────────────────────────────────────────

type BuiltinStreakKey =
  | 'workout' | 'calories' | 'protein' | 'water' | 'steps'
  | 'activecals' | 'exercisemins' | 'sleepduration' | 'sleepquality'
  | 'bible' | 'gratitude' | 'journaling' | 'morningintention' | 'prayer';

interface StreakConfigItem {
  id: string;
  type: 'builtin' | 'custom';
  key?: BuiltinStreakKey;
  label: string;
  emoji: string;
}

interface LiveStreakData extends StreakConfigItem {
  value: number;
  loggedToday: boolean;
  isManual: boolean;
}

const BUILTIN_STREAK_META: Record<BuiltinStreakKey, { label: string; emoji: string; isManual: boolean; faithGated: boolean }> = {
  workout:          { label: 'Workout',          emoji: '🏋️', isManual: false, faithGated: false },
  calories:         { label: 'Calories',          emoji: '🔥', isManual: false, faithGated: false },
  protein:          { label: 'Protein',           emoji: '💪', isManual: false, faithGated: false },
  water:            { label: 'Water',             emoji: '💧', isManual: false, faithGated: false },
  steps:            { label: 'Steps',             emoji: '👟', isManual: false, faithGated: false },
  activecals:       { label: 'Active Cals',       emoji: '⚡', isManual: false, faithGated: false },
  exercisemins:     { label: 'Exercise Mins',     emoji: '⏱️', isManual: false, faithGated: false },
  sleepduration:    { label: 'Sleep Duration',    emoji: '😴', isManual: false, faithGated: false },
  sleepquality:     { label: 'Sleep Quality',     emoji: '🌙', isManual: false, faithGated: false },
  bible:            { label: 'Bible',             emoji: '📖', isManual: false, faithGated: true  },
  gratitude:        { label: 'Gratitude',         emoji: '🙏', isManual: false, faithGated: true  },
  journaling:       { label: 'Journaling',        emoji: '✍️', isManual: false, faithGated: false },
  morningintention: { label: 'Morning Intention', emoji: '🌅', isManual: true,  faithGated: false },
  prayer:           { label: 'Prayer',            emoji: '🕊️', isManual: true,  faithGated: true  },
};

function getDefaultStreakConfig(styleMode: string, faithJourney: string): StreakConfigItem[] {
  const isNRN = faithJourney === 'notrightnow';
  const isMindful = styleMode === 'Mindful';
  let keys: BuiltinStreakKey[];
  if (isMindful) {
    keys = isNRN
      ? ['water', 'sleepduration', 'journaling', 'morningintention', 'steps']
      : ['gratitude', 'water', 'sleepduration', 'morningintention', 'bible'];
  } else {
    keys = isNRN
      ? ['workout', 'calories', 'steps', 'water', 'exercisemins']
      : ['workout', 'calories', 'steps', 'water', 'bible'];
  }
  return keys.map(key => ({
    id: `builtin_${key}`,
    type: 'builtin' as const,
    key,
    label: BUILTIN_STREAK_META[key].label,
    emoji: BUILTIN_STREAK_META[key].emoji,
  }));
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const RECORD_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const SCREEN_WIDTH = Dimensions.get('window').width;

type DayStatus = 'green' | 'yellow' | 'red' | 'future' | 'none';

const fmtRecordDate = (dk: string | null) => {
  if (!dk) return null;
  const [y, m, d] = dk.split('-');
  return `${RECORD_MONTHS[parseInt(m) - 1]} ${parseInt(d)}, ${y}`;
};


// ── Collapsible section header ─────────────────────────────────────────────────

function CollapsibleSection({ label, subtitle, children, defaultOpen = true, theme, first = false }: {
  label: string, subtitle?: string, children: React.ReactNode, defaultOpen?: boolean, theme: any, first?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [visible, setVisible] = useState(defaultOpen);
  const fadeAnim = useRef(new Animated.Value(defaultOpen ? 1 : 0)).current;

  const toggle = () => {
    const opening = !open;
    setOpen(opening);
    if (opening) {
      setVisible(true);
      Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: true }).start();
    } else {
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => setVisible(false));
    }
  };

  return (
    <View style={{ marginTop: first ? 4 : 20 }}>
      <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); toggle(); }} activeOpacity={0.7}
        style={{ paddingVertical: 6, marginBottom: 10, minHeight: 44, justifyContent: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'DMSans_700Bold', color: theme.accentBlueRaw }}>
            {label}
          </Text>
          <View style={{ flex: 1, height: 1, backgroundColor: theme.accentBlueBorder }} />
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={theme.accentBlueRaw} />
        </View>
        {!open && subtitle && (
          <Text style={{ fontSize: 11, fontFamily: 'DMSans_400Regular', color: theme.textMuted, marginTop: 4 }}>
            {subtitle}
          </Text>
        )}
      </TouchableOpacity>
      {visible && (
        <Animated.View style={{ opacity: fadeAnim }}>
          {children}
        </Animated.View>
      )}
    </View>
  );
}

// ── Collapsible card (for calendar) ───────────────────────────────────────────

function CollapsibleCard({ label, defaultOpen = false, children, theme }: {
  label: string, defaultOpen?: boolean, children: React.ReactNode, theme: any
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [visible, setVisible] = useState(defaultOpen);
  const fadeAnim = useRef(new Animated.Value(defaultOpen ? 1 : 0)).current;

  const toggle = () => {
    const opening = !open;
    setOpen(opening);
    if (opening) {
      setVisible(true);
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    } else {
      Animated.timing(fadeAnim, { toValue: 0, duration: 100, useNativeDriver: true }).start(() => setVisible(false));
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: theme.accentBlueRaw }]}>
      <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, paddingVertical: 12, marginVertical: -12 }} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); toggle(); }}>
        <Text style={[styles.cardLabel, { color: theme.textMuted }]}>{label}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={theme.textMuted} />
      </TouchableOpacity>
      {visible && (
        <Animated.View style={{ marginTop: 12, opacity: fadeAnim }}>
          {children}
        </Animated.View>
      )}
    </View>
  );
}

// ── Sleep score (mirrors index.tsx) ──────────────────────────────────────────

const FEEL_BONUS: Record<number, number> = { 1: 0, 2: 10, 3: 20, 4: 30, 5: 40 };

function calcSleepScore(
  sleepHours: number | null,
  sleepStages: { core: number; deep: number; rem: number; totalMs: number } | null,
  sleepGoal: number,
  feelRating?: number | null,
  isManual?: boolean,
): { score: number | null; path: 1 | 2 | 3 } {
  if (!sleepHours || sleepHours <= 0) return { score: null, path: 3 };
  if (sleepStages && sleepStages.totalMs > 0) {
    const durationPts = Math.min(40, (sleepHours / sleepGoal) * 40);
    const totalMs = sleepStages.totalMs;
    const deepPts = Math.max(0, 30 - (Math.abs(sleepStages.deep / totalMs - 0.20) / 0.20) * 30);
    const remPts  = Math.min(30, Math.max(0, (sleepStages.rem / totalMs / 0.22) * 30));
    return { score: Math.round(durationPts + deepPts + remPts), path: 1 };
  }
  const path = isManual ? 3 : 2;
  if (!feelRating) return { score: null, path };
  const durationPts = Math.min(60, (sleepHours / sleepGoal) * 60);
  return { score: Math.round(Math.min(100, durationPts + (FEEL_BONUS[feelRating] ?? 0))), path };
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  // Tutorial spotlight targets
  const fabRef            = useTutorialTarget('stats_fab');
  const streaksSectionRef = useTutorialTarget('stats_streaks_section');
  const statsScrollRef    = useRef<any>(null);
  const { registerScrollView, unregisterScrollView } = useTutorial();

  const [trendPeriod, setTrendPeriod] = useState<'7' | '30' | '90'>('30');
  const [activePeriod, setActivePeriod] = useState<'7' | '30' | '90' | '180' | 'ytd'>('7');

  const [trendDataMap, setTrendDataMap] = useState<Record<string, TrendData>>({});

  const [calTarget, setCalTarget] = useState(0);
  const [stepGoal, setStepGoal] = useState(10000);
  const [sleepGoal, setSleepGoal] = useState(8);

  const [records, setRecords] = useState<{
    steps: number | null, stepsDate: string | null,
    activeCals: number | null, activeCalsDate: string | null,
    water: number | null, waterDate: string | null,
    sleepHours: number | null, sleepHoursDate: string | null,
  }>({ steps: null, stepsDate: null, activeCals: null, activeCalsDate: null, water: null, waterDate: null, sleepHours: null, sleepHoursDate: null });

  const [profileBmr, setProfileBmr] = useState(0);
  const hasLoadedProfile = useRef(false);
  const [styleMode, setStyleMode] = useState<'Discipline' | 'Balanced' | 'Mindful'>('Balanced');
  const [faithJourney, setFaithJourney] = useState<'rooted' | 'exploring' | 'notrightnow'>('rooted');
  const [periodData, setPeriodData] = useState({
    avgCal: 0, avgProtein: 0, avgCarbs: 0, avgFat: 0,
    avgWater: 0, avgSteps: 0, avgActiveCals: 0, avgSleep: 0, avgNetCals: 0,
    avgSleepScore: null as number | null, calGoalDays: 0,
    workoutDays: 0, totalDays: 0, loggedDays: 0,
    startWeight: null as number | null, endWeight: null as number | null,
  });
  const [liveStreaks, setLiveStreaks] = useState<LiveStreakData[]>([]);
  const [streakConfig, setStreakConfig] = useState<StreakConfigItem[]>([]);
  const [activeCalGoal, setActiveCalGoal] = useState(500);
  const [exerciseMinsGoal, setExerciseMinsGoal] = useState(30);
  const [waterGoal, setWaterGoal] = useState(128);
  const [proteinGoal, setProteinGoal] = useState(0);
  const [streakBaseTarget, setStreakBaseTarget] = useState(0);
  const [burnAccuracy, setBurnAccuracy] = useState(100);

  // Manage streaks modal
  const [showManageStreaks, setShowManageStreaks] = useState(false);
  const manageStreaksAnim = useRef(new Animated.Value(0)).current;
  const [showCreateCustom, setShowCreateCustom] = useState(false);
  const createCustomAnim = useRef(new Animated.Value(0)).current;
  const [customName, setCustomName] = useState('');
  const [customEmoji, setCustomEmoji] = useState('');
  const [flashId, setFlashId] = useState<string | null>(null);
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const modalKeyboardOffset = useRef(new Animated.Value(0)).current;
  const [excludedDays, setExcludedDays] = useState<{ date: string, diet: boolean, water: boolean, exercise: boolean }[]>([]);

  const [statsCards, setStatsCards] = useState<StatsCard[]>(DEFAULT_STATS_CARDS);
  const [editSheetVisible, setEditSheetVisible] = useState(false);
  const [editCards, setEditCards] = useState<StatsCard[]>([]);
  const editSheetAnim = useRef(new Animated.Value(0)).current;

  const [dayDetailDate, setDayDetailDate] = useState<string | null>(null);
  const dayDetailAnim = useRef(new Animated.Value(0)).current;

  const [creatorVisible, setCreatorVisible] = useState(false);
  const [creatorStep, setCreatorStep] = useState<1 | 2 | 3>(1);
  const [creatorDataKey, setCreatorDataKey] = useState<DataKey | null>(null);
  const [creatorChartType, setCreatorChartType] = useState<ChartType | null>(null);
  const creatorSheetAnim = useRef(new Animated.Value(0)).current;
  const creatorOverlayAnim = useRef(new Animated.Value(0)).current;

  // FAB speed dial
  const [showFabMenu, setShowFabMenu] = useState(false);
  const fabScale = useRef(new Animated.Value(1)).current;
  const fabItem1Anim = useRef(new Animated.Value(0)).current; // Add Report (top, last)
  const fabItem2Anim = useRef(new Animated.Value(0)).current; // Add Graph (bottom, first)

  // Card edit modal
  const [editCard, setEditCard] = useState<StatsCard | null>(null);
  const [creatorColor, setCreatorColor] = useState<string | undefined>(undefined);
  const [creatorMacroColors, setCreatorMacroColors] = useState({ protein: MACRO_PROTEIN, carbs: MACRO_CARBS, fat: MACRO_FAT });

  const { showToast } = useToast();

  const now = new Date();
  const [calendarYear, setCalendarYear] = useState(now.getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(now.getMonth());
  const year = calendarYear;
  const month = calendarMonth;
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const closeDayDetail = () => {
    Animated.timing(dayDetailAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => setDayDetailDate(null));
  };

  const fetchTrendData = fetchTrendDataUtil;

  const loadAllCardData = async (cards: StatsCard[], globalPeriod: CardPeriod = 30, sleepGoalVal?: number) => {
    let workoutState: any = {};
    try {
      const ws = await AsyncStorage.getItem('pj_workout_state');
      if (ws) workoutState = JSON.parse(ws);
    } catch {}

    const uniquePeriods = [...new Set([
      globalPeriod,
      ...cards.filter(c => c.type === 'graph' && c.visible).map(c => c.period),
    ])];

    const results = await Promise.all(uniquePeriods.map(async p => [p, await fetchTrendData(p, workoutState, sleepGoalVal ?? sleepGoal)] as const));
    const newMap: Record<string, TrendData> = {};
    for (const [period, data] of results) newMap[period.toString()] = data;
    setTrendDataMap(newMap);
  };

  const loadRecords = async () => {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const dayKeys = allKeys.filter(k => /^pj_\d{4}-\d{2}-\d{2}$/.test(k));
      if (dayKeys.length === 0) return;
      const pairs = await AsyncStorage.multiGet(dayKeys);
      let maxSteps = 0, maxActiveCals = 0, maxWater = 0, maxSleepH = 0;
      let maxStepsDate = '', maxActiveCalsDate = '', maxWaterDate = '', maxSleepHDate = '';
      for (const [key, val] of pairs) {
        if (!val) continue;
        try {
          const data = JSON.parse(val);
          const dateKey = key.replace('pj_', '');
          if ((data.steps || 0) > maxSteps) { maxSteps = data.steps; maxStepsDate = dateKey; }
          if ((data.activeCalories || 0) > maxActiveCals) { maxActiveCals = data.activeCalories; maxActiveCalsDate = dateKey; }
          if ((data.water || 0) > maxWater) { maxWater = data.water; maxWaterDate = dateKey; }
          const sh = data.sleepOverride || data.sleepHours;
          if (sh && sh > maxSleepH) { maxSleepH = sh; maxSleepHDate = dateKey; }
        } catch {}
      }
      setRecords({
        steps: maxSteps || null, stepsDate: maxStepsDate || null,
        activeCals: maxActiveCals || null, activeCalsDate: maxActiveCalsDate || null,
        water: maxWater || null, waterDate: maxWaterDate || null,
        sleepHours: maxSleepH || null, sleepHoursDate: maxSleepHDate || null,
      });
    } catch {}
  };

  const loadPeriodData = async (period: '7' | '30' | '90' | '180' | 'ytd', calTgt: number, sleepGoalVal: number, bmr = 0) => {
    let dates: string[] = [];
    const nowD = new Date();
    if (period === 'ytd') {
      const start = new Date(nowD.getFullYear(), 0, 1);
      const diff = Math.floor((nowD.getTime() - start.getTime()) / 86400000);
      for (let i = diff; i >= 0; i--) dates.push(offsetToDateKey(i));
    } else {
      const days = parseInt(period);
      for (let i = days - 1; i >= 0; i--) dates.push(offsetToDateKey(i));
    }
    let totalCal = 0, totalProtein = 0, totalCarbs = 0, totalFat = 0, totalWater = 0, totalNetCal = 0;
    let totalSteps = 0, stepsDays = 0, totalActiveCals = 0, activeDays = 0, totalSleep = 0, sleepDays = 0;
    let totalSleepScore = 0, sleepScoreDays = 0, calGoalDays = 0;
    let dietDays = 0, waterDays = 0, workoutDays = 0;
    let startWeight: number | null = null, endWeight: number | null = null;
    for (const dateKey of dates) {
      try {
        const saved = await AsyncStorage.getItem(`pj_${dateKey}`);
        if (saved) {
          const data = JSON.parse(saved);
          const excl = data.excluded || {};
          if (!excl.diet && data.entries?.length > 0) {
            const dayCal = data.entries.reduce((s: number, e: any) => s + e.cal, 0);
            totalCal += dayCal;
            totalNetCal += dayCal - (data.activeCalories || 0) - bmr;
            totalProtein += data.entries.reduce((s: number, e: any) => s + (e.protein || 0), 0);
            totalCarbs += data.entries.reduce((s: number, e: any) => s + (e.carbs || 0), 0);
            totalFat += data.entries.reduce((s: number, e: any) => s + (e.fat || 0), 0);
            if (calTgt > 0) {
              const pct = (dayCal / calTgt) * 100;
              if (pct >= 80 && pct <= 106) calGoalDays++;
            }
            dietDays++;
          }
          if (!excl.water && data.water) { totalWater += data.water; waterDays++; }
          if (data.weight) { if (startWeight === null) startWeight = data.weight; endWeight = data.weight; }
          if (!excl.exercise && (data.caloriesBurned || data.entries?.length > 0)) workoutDays++;
          if (data.steps) { totalSteps += data.steps; stepsDays++; }
          if (data.activeCalories) { totalActiveCals += data.activeCalories; activeDays++; }
          const sleepH = data.sleepOverride || data.sleepHours;
          if (sleepH) {
            totalSleep += sleepH; sleepDays++;
            const { score, path } = calcSleepScore(sleepH, data.sleepStages || null, sleepGoalVal, data.sleepFeelRating ?? null, !!data.sleepOverride);
            if (score !== null && (path === 1 || data.sleepFeelRating)) { totalSleepScore += score; sleepScoreDays++; }
          }
        }
      } catch {}
    }
    setPeriodData({
      avgCal: dietDays > 0 ? Math.round(totalCal / dietDays) : 0,
      avgProtein: dietDays > 0 ? Math.round(totalProtein / dietDays * 10) / 10 : 0,
      avgCarbs: dietDays > 0 ? Math.round(totalCarbs / dietDays * 10) / 10 : 0,
      avgFat: dietDays > 0 ? Math.round(totalFat / dietDays * 10) / 10 : 0,
      avgNetCals: dietDays > 0 ? Math.round(totalNetCal / dietDays) : 0,
      avgWater: waterDays > 0 ? Math.round(totalWater / waterDays) : 0,
      avgSteps: stepsDays > 0 ? Math.round(totalSteps / stepsDays) : 0,
      avgActiveCals: activeDays > 0 ? Math.round(totalActiveCals / activeDays) : 0,
      avgSleep: sleepDays > 0 ? Math.round(totalSleep / sleepDays * 10) / 10 : 0,
      avgSleepScore: sleepScoreDays > 0 ? Math.round(totalSleepScore / sleepScoreDays) : null,
      calGoalDays,
      workoutDays, totalDays: dates.length, loggedDays: dietDays, startWeight, endWeight,
    });
  };

  const loadStreaks = async (
    config: StreakConfigItem[],
    target: number, streakBaseTarget: number, burnAccuracy: number,
    wGoal: number, aCalGoal: number, exMinsGoal: number, pGoal: number,
    sGoal: number, currentFaithJourney: string,
  ) => {
    if (config.length === 0) return;
    const workoutRaw = await AsyncStorage.getItem('pj_workout_state');
    const workoutState = workoutRaw ? JSON.parse(workoutRaw) : {};
    const reflRaw = await AsyncStorage.getItem('pj_bible_reflections');
    const reflections: any[] = reflRaw ? JSON.parse(reflRaw) : [];
    const pjStreaksRaw = await AsyncStorage.getItem('pj_streaks');
    const pjStreaksData = pjStreaksRaw ? JSON.parse(pjStreaksRaw) : {};
    const customDates: Record<string, string[]> = pjStreaksData.customDates || {};

    const bibleDates = new Set(reflections.filter((r: any) => r.category === 'verse').map((r: any) => (r.date || '').slice(0, 10)).filter(Boolean));
    const gratitudeDates = new Set(reflections.filter((r: any) => r.category === 'gratitude').map((r: any) => (r.date || '').slice(0, 10)).filter(Boolean));
    const journalDates = new Set(reflections.filter((r: any) => r.category === 'personal').map((r: any) => (r.date || '').slice(0, 10)).filter(Boolean));
    const effectiveTarget = target > 0 ? target : streakBaseTarget;
    const todayKey = offsetToDateKey(0);

    // For each active streak, compute its value
    const streakCounters: Record<string, number> = {};
    const streakDone: Record<string, boolean> = {};
    const todayLogged: Record<string, boolean> = {};

    // Seed today-is-logged for faith streaks (count immediately)
    for (const item of config) {
      if (item.type === 'builtin' && item.key === 'bible') {
        todayLogged[item.id] = bibleDates.has(todayKey);
        streakCounters[item.id] = todayLogged[item.id] ? 1 : 0;
      } else if (item.type === 'builtin' && item.key === 'gratitude') {
        todayLogged[item.id] = gratitudeDates.has(todayKey);
        streakCounters[item.id] = todayLogged[item.id] ? 1 : 0;
      } else if (item.type === 'builtin' && item.key === 'journaling') {
        todayLogged[item.id] = journalDates.has(todayKey);
        streakCounters[item.id] = todayLogged[item.id] ? 1 : 0;
      } else if ((item.type === 'builtin' && (item.key === 'morningintention' || item.key === 'prayer')) || item.type === 'custom') {
        const dates = customDates[item.id] || [];
        todayLogged[item.id] = dates.includes(todayKey);
        streakCounters[item.id] = todayLogged[item.id] ? 1 : 0;
      } else {
        todayLogged[item.id] = false;
        streakCounters[item.id] = 0;
      }
      streakDone[item.id] = false;
    }

    // Walk back from yesterday
    let i = 1;
    while (true) {
      const dateKey = offsetToDateKey(i);
      const allDone = config.every(item => streakDone[item.id]);
      if (allDone) break;
      try {
        const saved = await AsyncStorage.getItem(`pj_${dateKey}`);
        if (!saved) {
          // If no daily data, all auto-tracked streaks that aren't done yet end here
          for (const item of config) {
            if (!streakDone[item.id]) {
              const isManual = item.type === 'custom' || (item.type === 'builtin' && (item.key === 'morningintention' || item.key === 'prayer'));
              const isFaithAuto = item.type === 'builtin' && (item.key === 'bible' || item.key === 'gratitude' || item.key === 'journaling');
              if (!isManual && !isFaithAuto) streakDone[item.id] = true;
            }
          }
          // Faith/manual streaks continue looking back -- but no daily data means we keep looking
          // Actually if no pj_ data for this day, faith might still have entries. Keep going up to 365.
          i++; if (i > 365) break;
          continue;
        }
        const data = JSON.parse(saved);
        const calTotal = data.entries?.reduce((s: number, e: any) => s + e.cal, 0) || 0;
        const dayActive = Math.round((data.activeCalories || data.caloriesBurned || 0) * burnAccuracy / 100);
        const adjustedTarget = effectiveTarget + dayActive;
        const totalProtein = data.entries?.reduce((s: number, e: any) => s + (e.protein || 0), 0) || 0;
        const { score: sleepScore } = calcSleepScore(data.sleepHours || null, data.sleepStages || null, sGoal, data.sleepFeelRating || null, !data.sleepStages);

        for (const item of config) {
          if (streakDone[item.id]) continue;
          let hit = false;
          if (item.type === 'builtin') {
            switch (item.key) {
              case 'workout':     hit = (workoutState?.programs?.[dateKey]?.exercises || []).length > 0; break;
              case 'calories':    hit = adjustedTarget > 0 && calTotal >= adjustedTarget * 0.80 && calTotal <= adjustedTarget * 1.06; break;
              case 'protein':     hit = pGoal > 0 && totalProtein >= pGoal; break;
              case 'water':       hit = (data.water || 0) >= wGoal; break;
              case 'steps':       hit = (data.steps || 0) >= stepGoal; break;
              case 'activecals':  hit = aCalGoal > 0 && dayActive >= aCalGoal; break;
              case 'exercisemins':hit = exMinsGoal > 0 && (data.exerciseMinutes || 0) >= exMinsGoal; break;
              case 'sleepduration': hit = (data.sleepHours || 0) >= sGoal; break;
              case 'sleepquality':  hit = sleepScore !== null && sleepScore >= 85; break;
              case 'bible':       hit = bibleDates.has(dateKey); break;
              case 'gratitude':   hit = gratitudeDates.has(dateKey); break;
              case 'journaling':  hit = journalDates.has(dateKey); break;
              case 'morningintention':
              case 'prayer':      hit = (customDates[item.id] || []).includes(dateKey); break;
            }
          } else {
            hit = (customDates[item.id] || []).includes(dateKey);
          }
          if (hit) { streakCounters[item.id]++; } else { streakDone[item.id] = true; }
        }
        i++; if (i > 365) break;
      } catch { i++; if (i > 365) break; }
    }

    const isNRN = currentFaithJourney === 'notrightnow';
    const result: LiveStreakData[] = config
      .filter(item => {
        if (item.type !== 'builtin' || !item.key) return true;
        return !BUILTIN_STREAK_META[item.key].faithGated || !isNRN;
      })
      .map(item => {
        const meta = item.type === 'builtin' && item.key ? BUILTIN_STREAK_META[item.key] : null;
        return {
          ...item,
          value: streakCounters[item.id] ?? 0,
          loggedToday: todayLogged[item.id] ?? false,
          isManual: item.type === 'custom' || (meta?.isManual ?? false),
        };
      });
    setLiveStreaks(result);
  };

  const toggleManualCheckIn = async (item: LiveStreakData) => {
    const todayKey = offsetToDateKey(0);
    const pjStreaksRaw = await AsyncStorage.getItem('pj_streaks');
    const pjStreaksData = pjStreaksRaw ? JSON.parse(pjStreaksRaw) : {};
    const customDates: Record<string, string[]> = { ...(pjStreaksData.customDates || {}) };
    const existing: string[] = customDates[item.id] ? [...customDates[item.id]] : [];
    const checkingIn = !existing.includes(todayKey);
    if (!checkingIn) {
      customDates[item.id] = existing.filter(d => d !== todayKey);
    } else {
      customDates[item.id] = [...existing, todayKey];
    }
    await storageSet('pj_streaks', JSON.stringify({ ...pjStreaksData, customDates }));
    setLiveStreaks(prev => prev.map(s =>
      s.id === item.id
        ? { ...s, loggedToday: checkingIn, value: checkingIn ? s.value + 1 : Math.max(0, s.value - 1) }
        : s
    ));
    if (checkingIn) {
      setFlashId(item.id);
      flashOpacity.setValue(1);
      Animated.timing(flashOpacity, { toValue: 0, duration: 400, delay: 1200, useNativeDriver: true }).start(() => setFlashId(null));
    }
  };

  const openManageStreaks = () => {
    setShowManageStreaks(true);
    manageStreaksAnim.setValue(0);
    Animated.spring(manageStreaksAnim, { toValue: 1, useNativeDriver: true, tension: 65, friction: 11 }).start();
  };

  const closeManageStreaks = () => {
    Animated.timing(manageStreaksAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => setShowManageStreaks(false));
  };

  const openCreateCustom = () => {
    setCustomName('');
    setCustomEmoji('');
    setShowCreateCustom(true);
    createCustomAnim.setValue(0);
    Animated.timing(createCustomAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  };

  const closeCreateCustom = () => {
    Animated.timing(createCustomAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => setShowCreateCustom(false));
  };

  const saveCustomStreak = async () => {
    if (!customName.trim() || !customEmoji.trim()) return;
    const newItem: StreakConfigItem = {
      id: `custom_${Date.now()}`,
      type: 'custom',
      label: customName.trim(),
      emoji: customEmoji.trim(),
    };
    const newConfig = [...streakConfig, newItem];
    const pjStreaksRaw = await AsyncStorage.getItem('pj_streaks');
    const pjStreaksData = pjStreaksRaw ? JSON.parse(pjStreaksRaw) : {};
    await storageSet('pj_streaks', JSON.stringify({ ...pjStreaksData, config: newConfig }));
    setStreakConfig(newConfig);
    // Custom streaks are always manual -- value 0 is correct, no history to calculate
    setLiveStreaks(prev => [...prev, { ...newItem, value: 0, loggedToday: false, isManual: true }]);
    closeCreateCustom();
    showToast('Streak added', undefined, 'success');
  };

  const removeStreak = async (id: string) => {
    const newConfig = streakConfig.filter(s => s.id !== id);
    const pjStreaksRaw = await AsyncStorage.getItem('pj_streaks');
    const pjStreaksData = pjStreaksRaw ? JSON.parse(pjStreaksRaw) : {};
    await storageSet('pj_streaks', JSON.stringify({ ...pjStreaksData, config: newConfig }));
    setStreakConfig(newConfig);
    setLiveStreaks(prev => prev.filter(s => s.id !== id));
  };

  const reorderStreaks = async (newConfig: StreakConfigItem[]) => {
    setStreakConfig(newConfig);
    setLiveStreaks(prev => newConfig.map(cfg => prev.find(l => l.id === cfg.id)).filter(Boolean) as LiveStreakData[]);
    const pjStreaksRaw = await AsyncStorage.getItem('pj_streaks');
    const pjStreaksData = pjStreaksRaw ? JSON.parse(pjStreaksRaw) : {};
    await storageSet('pj_streaks', JSON.stringify({ ...pjStreaksData, config: newConfig }));
  };

  const addBuiltinStreak = async (key: BuiltinStreakKey) => {
    const meta = BUILTIN_STREAK_META[key];
    const newItem: StreakConfigItem = { id: `builtin_${key}`, type: 'builtin', key, label: meta.label, emoji: meta.emoji };
    const newConfig = [...streakConfig, newItem];
    const pjStreaksRaw = await AsyncStorage.getItem('pj_streaks');
    const pjStreaksData = pjStreaksRaw ? JSON.parse(pjStreaksRaw) : {};
    await storageSet('pj_streaks', JSON.stringify({ ...pjStreaksData, config: newConfig }));
    setStreakConfig(newConfig);
    // Re-run full calculation so history is reflected immediately
    await loadStreaks(newConfig, calTarget, streakBaseTarget, burnAccuracy, waterGoal, activeCalGoal, exerciseMinsGoal, proteinGoal, sleepGoal, faithJourney);
  };

  useFocusEffect(
    useCallback(() => {
      const loadAll = async () => {
        const exDays: { date: string, diet: boolean, water: boolean, exercise: boolean }[] = [];
        for (let d = 1; d <= daysInMonth; d++) {
          const dateKey = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          try {
            const saved = await AsyncStorage.getItem(`pj_${dateKey}`);
            if (saved) {
              const data = JSON.parse(saved);
              if (data.excluded && Object.values(data.excluded).some(v => v === true)) {
                exDays.push({ date: dateKey, diet: !!data.excluded.diet, water: !!data.excluded.water, exercise: !!data.excluded.exercise });
              }
            }
          } catch {}
        }
        setExcludedDays(exDays);

        let target = 0, step = 10000, sleep = 8, bmr = 0, streakBaseTarget = 0, burnAccuracy = 100;
        let wGoal = 128, aCalGoal = 500, exMinsGoal = 30, pGoal = 0;
        let currentStyleMode = 'Balanced', currentFaithJourney = 'rooted';
        try {
          const p = await AsyncStorage.getItem('pj_profile');
          if (p) {
            const d = JSON.parse(p);
            if (d.stepGoal) step = parseInt(d.stepGoal);
            if (d.sleepGoal) sleep = parseFloat(d.sleepGoal);
            if (d.waterGoal) wGoal = parseFloat(d.waterGoal);
            if (d.activeCalGoal) aCalGoal = parseInt(d.activeCalGoal);
            if (d.exerciseMinsGoal) exMinsGoal = parseInt(d.exerciseMinsGoal);
            // Protein goal: fixed grams or ratio-based
            if (d.macroMode === 'fixed' && d.macroProteinG) {
              pGoal = parseInt(d.macroProteinG);
            } else if (d.macroProteinPct) {
              // Ratio mode: estimate from calorie target
              const estCal = target > 0 ? target : streakBaseTarget;
              if (estCal > 0) pGoal = Math.round((estCal * (parseFloat(d.macroProteinPct) / 100)) / 4);
            }
            if (d.heightFt && d.heightIn !== undefined && d.sex && d.birthday) {
              let w = 0;
              for (let i = 0; i <= 30 && w === 0; i++) {
                try { const dd = await AsyncStorage.getItem(`pj_${offsetToDateKey(i)}`); if (dd) { const x = JSON.parse(dd); if (x.weight) w = x.weight; } } catch {}
              }
              if (w > 0) {
                const wKg = w * 0.453592;
                const hCm = (parseFloat(d.heightFt) * 30.48) + (parseFloat(d.heightIn) * 2.54);
                const parts = d.birthday.split('-');
                const age = Math.floor((Date.now() - new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2])).getTime()) / (365.25*24*3600*1000));
                bmr = d.sex === 'male' ? Math.round((10*wKg)+(6.25*hCm)-(5*age)+5) : Math.round((10*wKg)+(6.25*hCm)-(5*age)-161);
              }
              if (bmr > 0 && d.lifestyleActivity && d.trainingFrequency) {
                const LM: Record<string,number> = { sedentary:1.2, light:1.3, active:1.45, very_active:1.6 };
                const TB: Record<string,number> = { none:0, '1x':100, '3x':200, '5x':300, daily:400 };
                const GD: Record<string,number> = { lose_2:-1000, lose_1_5:-750, lose_1:-500, lose_0_5:-250, maintain:0, gain_0_5:250, gain_1:500 };
                const tdee = Math.round((bmr * (LM[d.lifestyleActivity] ?? 1.2)) + (TB[d.trainingFrequency] ?? 0));
                streakBaseTarget = tdee + (GD[d.weightGoal] ?? -500);
              }
            }
          }
          const s = await AsyncStorage.getItem('pj_settings');
          if (s) {
            const d = JSON.parse(s);
            if (d.calTarget) target = parseInt(d.calTarget);
            if (d.styleMode) { setStyleMode(d.styleMode); currentStyleMode = d.styleMode; }
            if (d.faithJourney) { setFaithJourney(d.faithJourney); currentFaithJourney = d.faithJourney; }
            if (d.burnAccuracyPct !== undefined) burnAccuracy = d.burnAccuracyPct;
          }
        } catch {}
        setCalTarget(target);
        setStepGoal(step);
        setSleepGoal(sleep);
        setProfileBmr(bmr);
        setWaterGoal(wGoal);
        setActiveCalGoal(aCalGoal);
        setExerciseMinsGoal(exMinsGoal);
        setProteinGoal(pGoal);
        setStreakBaseTarget(streakBaseTarget);
        setBurnAccuracy(burnAccuracy);
        hasLoadedProfile.current = true;

        // Load streak config -- apply defaults on first load
        let config: StreakConfigItem[] = [];
        try {
          const pjStreaksRaw = await AsyncStorage.getItem('pj_streaks');
          const pjStreaksData = pjStreaksRaw ? JSON.parse(pjStreaksRaw) : {};
          config = pjStreaksData.config || [];
          if (config.length === 0) {
            config = getDefaultStreakConfig(currentStyleMode, currentFaithJourney);
            await storageSet('pj_streaks', JSON.stringify({ ...pjStreaksData, config }));
          }
        } catch {}
        setStreakConfig(config);

        const cards = await loadStatsCards();
        setStatsCards(cards);

        await Promise.all([
          loadAllCardData(cards, 30, sleep),
          loadRecords(),
          loadPeriodData(activePeriod, target, sleep, bmr),
          loadStreaks(config, target, streakBaseTarget, burnAccuracy, wGoal, aCalGoal, exMinsGoal, pGoal, sleep, currentFaithJourney),
        ]);
      };
      loadAll();
    }, [calendarMonth, calendarYear])
  );

  // Register stats ScrollView so tutorial auto-scroll works on this tab
  useEffect(() => {
    registerScrollView('stats', statsScrollRef);
    return () => unregisterScrollView('stats');
  }, []);

  useEffect(() => {
    if (hasLoadedProfile.current) {
      loadPeriodData(activePeriod, calTarget, sleepGoal, profileBmr);
    }
  }, [activePeriod]);

  useEffect(() => {
    if (!showCreateCustom) {
      modalKeyboardOffset.setValue(0);
      return;
    }
    const showSub = Keyboard.addListener('keyboardWillShow', e => {
      Animated.timing(modalKeyboardOffset, {
        toValue: -(e.endCoordinates.height / 2),
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
    const hideSub = Keyboard.addListener('keyboardWillHide', () => {
      Animated.timing(modalKeyboardOffset, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start();
    });
    return () => { showSub.remove(); hideSub.remove(); };
  }, [showCreateCustom]);

  const handleGlobalPeriodSync = (p: '7' | '30' | '90') => {
    const days = parseInt(p) as CardPeriod;
    setTrendPeriod(p);
    const updated = statsCards.map(c => c.type === 'graph' ? { ...c, period: days } : c);
    setStatsCards(updated);
    saveStatsCards(updated);
    loadAllCardData(updated, days);
  };

  const handleCardPeriodChange = async (cardId: string, period: CardPeriod) => {
    const updated = statsCards.map(c => c.id === cardId ? { ...c, period } : c);
    setStatsCards(updated);
    saveStatsCards(updated);
    if (!trendDataMap[period.toString()]) {
      let workoutState: any = {};
      try { const ws = await AsyncStorage.getItem('pj_workout_state'); if (ws) workoutState = JSON.parse(ws); } catch {}
      const data = await fetchTrendData(period, workoutState, sleepGoal);
      setTrendDataMap(prev => ({ ...prev, [period.toString()]: data }));
    }
  };

  const openEditSheet = () => {
    setEditCards([...statsCards]);
    setEditSheetVisible(true);
  };

  const closeEditSheet = () => {
    Animated.timing(editSheetAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => setEditSheetVisible(false));
  };

  const handleToggleCard = (id: string) => {
    setEditCards(prev => {
      const updated = prev.map(c => c.id === id ? { ...c, visible: !c.visible } : c);
      setStatsCards(updated);
      saveStatsCards(updated);
      return updated;
    });
  };

  const handleDeleteCard = (id: string) => {
    Alert.alert(
      'Remove Card',
      'Remove this graph card from your stats?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove', style: 'destructive',
          onPress: () => {
            setEditCards(prev => {
              const updated = prev.filter(c => c.id !== id);
              setStatsCards(updated);
              saveStatsCards(updated);
              return updated;
            });
          },
        },
      ]
    );
  };

  const openCreatorModal = async () => {
    setCreatorStep(1);
    setCreatorDataKey(null);
    setCreatorChartType(null);
    creatorSheetAnim.setValue(0);
    creatorOverlayAnim.setValue(0);
    setCreatorVisible(true);
    if (!trendDataMap['7']) {
      let workoutState: any = {};
      try { const ws = await AsyncStorage.getItem('pj_workout_state'); if (ws) workoutState = JSON.parse(ws); } catch {}
      const data = await fetchTrendData(7, workoutState, sleepGoal);
      setTrendDataMap(prev => ({ ...prev, '7': data }));
    }
  };

  const closeCreatorModal = () => {
    Animated.parallel([
      Animated.timing(creatorSheetAnim, { toValue: 0, duration: 260, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(creatorOverlayAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => {
      setCreatorVisible(false);
      setCreatorColor(undefined);
      setCreatorMacroColors({ protein: MACRO_PROTEIN, carbs: MACRO_CARBS, fat: MACRO_FAT });
    });
  };

  const handleCreatorSelectDataKey = (dk: DataKey) => {
    setCreatorColor(undefined);
    setCreatorMacroColors({ protein: MACRO_PROTEIN, carbs: MACRO_CARBS, fat: MACRO_FAT });
    setCreatorDataKey(dk);
    if (dk === 'macros') {
      setCreatorChartType('stackedBar');
      setCreatorStep(3);
    } else {
      setCreatorChartType(null);
      setCreatorStep(2);
    }
  };

  const handleCreatorBack = () => {
    if (creatorStep === 3 && creatorDataKey === 'macros') {
      setCreatorDataKey(null);
      setCreatorChartType(null);
      setCreatorStep(1);
      setCreatorColor(undefined);
      setCreatorMacroColors({ protein: MACRO_PROTEIN, carbs: MACRO_CARBS, fat: MACRO_FAT });
    } else if (creatorStep === 3) {
      setCreatorStep(2);
    } else if (creatorStep === 2) {
      setCreatorStep(1);
      setCreatorColor(undefined);
    }
  };

  // FAB speed dial
  const openFabMenu = () => {
    fabItem1Anim.setValue(0);
    fabItem2Anim.setValue(0);
    setShowFabMenu(true);
    Animated.stagger(70, [
      Animated.spring(fabItem2Anim, { toValue: 1, useNativeDriver: true, friction: 7, tension: 120 }),
      Animated.spring(fabItem1Anim, { toValue: 1, useNativeDriver: true, friction: 7, tension: 120 }),
    ]).start();
  };

  const closeFabMenu = () => {
    Animated.parallel([
      Animated.timing(fabItem1Anim, { toValue: 0, duration: 130, useNativeDriver: true }),
      Animated.timing(fabItem2Anim, { toValue: 0, duration: 130, useNativeDriver: true }),
    ]).start(() => setShowFabMenu(false));
  };

  const toggleFabMenu = () => {
    if (showFabMenu) closeFabMenu();
    else openFabMenu();
  };

  const handleSaveEditCard = (updated: StatsCard) => {
    const newCards = statsCards.map(c => c.id === updated.id ? updated : c);
    setStatsCards(newCards);
    saveStatsCards(newCards);
  };

  const handleDeleteEditCard = (cardId: string) => {
    const newCards = statsCards.filter(c => c.id !== cardId);
    setStatsCards(newCards);
    saveStatsCards(newCards);
  };

  const handleAddCard = () => {
    if (!creatorDataKey || !creatorChartType) return;
    const isMacros = creatorDataKey === 'macros';
    const hasMacroCustom = isMacros && (
      creatorMacroColors.protein !== MACRO_PROTEIN ||
      creatorMacroColors.carbs !== MACRO_CARBS ||
      creatorMacroColors.fat !== MACRO_FAT
    );
    const newCard: StatsCard = {
      id: generateCardId(creatorDataKey),
      type: 'graph',
      dataKey: creatorDataKey,
      chartType: creatorChartType,
      period: 7,
      label: DATA_KEY_META[creatorDataKey].label,
      visible: true,
      order: statsCards.length,
      placement: 'stats',
      color: isMacros ? undefined : creatorColor,
      macroColors: isMacros && hasMacroCustom ? { ...creatorMacroColors } : undefined,
    };
    const updated = [...statsCards, newCard];
    setStatsCards(updated);
    saveStatsCards(updated);
    closeCreatorModal();
    setTimeout(() => showToast('Graph added', undefined, 'success'), 300);
  };

  // Derived from trendDataMap -- used for At a Glance weight change display
  const trendData = trendDataMap[trendPeriod] ?? EMPTY_TREND_DATA;

  const getDayStatus = (day: number): DayStatus => {
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (dateKey > today) return 'future';
    const calEntry = trendData.cal.find(c => c.date === dateKey);
    if (!calEntry || !calTarget) return 'none';
    const pct = (calEntry.cal / calTarget) * 100;
    if (pct >= 80 && pct <= 106) return 'green';
    if (pct >= 63 && pct <= 114) return 'yellow';
    return 'red';
  };

  const dayStatusColor = (status: DayStatus) => {
    if (status === 'green') return { bg: 'rgba(16,185,129,0.25)', text: theme.statusGood };
    if (status === 'yellow') return { bg: 'rgba(245,158,11,0.25)', text: theme.statusWarn };
    if (status === 'red') return { bg: 'rgba(239,68,68,0.2)', text: theme.statusBad };
    return { bg: 'transparent', text: theme.textDim };
  };

  const shadowStyle = { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 12, elevation: 6 };

  const RecordTile = ({ icon, label, value, unit, color, date, fmt }: {
    icon: string, label: string, value: number | null, unit: string,
    color: string, date: string | null, fmt: (v: number) => string,
  }) => (
    <View style={[{ flex: 1, backgroundColor: theme.bgCard, borderWidth: 0.5, borderColor: theme.borderCard, borderTopWidth: 1.5, borderTopColor: theme.accentBlueRaw, borderRadius: 14, padding: 14, alignItems: 'center' }, shadowStyle]}>
      <Ionicons name={icon as any} size={18} color={color} style={{ marginBottom: 4 }} />
      <Text style={{ fontSize: 26, color, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 0, opacity: 0.88 }}>
        {value !== null ? fmt(value) : '--'}
      </Text>
      <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: 'DMSans_700Bold', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 2, textAlign: 'center' }}>{unit}</Text>
      <Text style={{ fontSize: 9, color: theme.textDim, fontFamily: 'DMSans_400Regular', marginTop: 2 }}>{label}</Text>
      {date && value !== null && (
        <Text style={{ fontSize: 9, color: theme.textDim, fontFamily: 'DMSans_400Regular', marginTop: 4, textAlign: 'center' }}>
          {fmtRecordDate(date)}
        </Text>
      )}
    </View>
  );

  const weightChange = trendData.weight.length >= 2
    ? Math.round((trendData.weight[trendData.weight.length - 1].value - trendData.weight[0].value) * 10) / 10 : null;


  return (
    <LinearGradient colors={[theme.gradientStart, theme.gradientEnd]} style={{ flex: 1, paddingTop: insets.top }}>
      <View style={[styles.header, { borderBottomColor: theme.borderCard }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerLabel, { color: theme.textMuted }]}>PROJECT J</Text>
          <Text style={[styles.headerTitle, { color: theme.accentBlueRaw }]}>Stats</Text>
          <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: 'DMSans_700Bold', marginTop: 1, letterSpacing: 2, textTransform: 'uppercase' }}>
            {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <TouchableOpacity
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/journal'); }}
            style={{ backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6, height: 32, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="journal" size={14} color={theme.accentBlue} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); openEditSheet(); }}
            style={{ backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6, height: 32, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="grid" size={14} color={theme.accentBlue} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); showToolkit('stats'); }} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <Ionicons name="help-circle" size={22} color={theme.accentBlue} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView ref={statsScrollRef} style={styles.container} contentContainerStyle={styles.content}>

        {statsCards
          .filter(c => c.type === 'system')
          .sort((a, b) => a.order - b.order)
          .filter(c => c.visible)
          .map((section, idx) => {
            const isFirst = idx === 0;
            if (section.systemKey === 'atAGlance') return (
              <CollapsibleSection key={section.id} label={section.label} subtitle="Averages across your logged days" defaultOpen={isFirst} theme={theme} first={isFirst}>
          <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: theme.accentBlueRaw, ...shadowStyle }]}>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 14 }}>
              {(['7', '30', '90', '180', 'ytd'] as const).map(p => (
                <TouchableOpacity key={p} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActivePeriod(p); }}
                  style={{ flex: 1, paddingVertical: 6, borderRadius: 6, alignItems: 'center',
                    backgroundColor: activePeriod === p ? theme.accentBlueBg : theme.bgInput,
                    borderWidth: 1, borderColor: activePeriod === p ? theme.accentBlueBorder : theme.borderInput }}>
                  <Text style={{ fontSize: 11, fontFamily: 'DMSans_600SemiBold', color: activePeriod === p ? theme.accentBlue : theme.textMuted }}>
                    {p === 'ytd' ? 'YTD' : p === '7' ? '7D' : p === '30' ? '30D' : p === '90' ? '3M' : '6M'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {periodData.loggedDays > 0 && (
              <Text style={{ fontSize: 10, color: theme.textDim, fontFamily: 'DMSans_400Regular', marginBottom: 10 }}>
                Based on {periodData.loggedDays} day{periodData.loggedDays !== 1 ? 's' : ''} with food logged
              </Text>
            )}
            <View style={{ position: 'relative' }}>
              <View style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 0.5, backgroundColor: theme.borderSubtle }} />
              {styleMode !== 'Mindful' && (
                <>
                  <View style={[styles.glanceRow, { borderBottomColor: theme.borderSubtle }]}>
                    <View style={styles.glanceCellL}>
                      <Text style={[styles.glanceLabel, { color: theme.textMuted }]}>CALORIES / DAY</Text>
                      <Text style={[styles.glanceVal, { color: theme.textPrimary }]}>{periodData.avgCal > 0 ? `${periodData.avgCal} kcal` : '--'}</Text>
                    </View>
                    <View style={styles.glanceCellR}>
                      <Text style={[styles.glanceLabel, { color: theme.textMuted }]}>NET CALS / DAY</Text>
                      <Text style={[styles.glanceVal, { color: theme.textPrimary }]}>{periodData.avgNetCals !== 0 ? `${periodData.avgNetCals} kcal` : '--'}</Text>
                    </View>
                  </View>
                  <View style={[styles.glanceRow, { borderBottomColor: theme.borderSubtle }]}>
                    <View style={styles.glanceCellL}>
                      <Text style={[styles.glanceLabel, { color: theme.textMuted }]}>ACTIVE CALS / DAY</Text>
                      <Text style={[styles.glanceVal, { color: theme.textPrimary }]}>{periodData.avgActiveCals > 0 ? `${periodData.avgActiveCals} kcal` : '--'}</Text>
                    </View>
                    <View style={styles.glanceCellR}>
                      <Text style={[styles.glanceLabel, { color: theme.textMuted }]}>CAL GOAL / DAY</Text>
                      <Text style={[styles.glanceVal, { color: theme.textPrimary }]}>{periodData.loggedDays > 0 ? `${periodData.calGoalDays} / ${periodData.loggedDays}` : '--'}</Text>
                    </View>
                  </View>
                </>
              )}
              <View style={[styles.glanceRow, { borderBottomColor: theme.borderSubtle }]}>
                <View style={styles.glanceCellL}>
                  <Text style={[styles.glanceLabel, { color: theme.textMuted }]}>STEPS / DAY</Text>
                  <Text style={[styles.glanceVal, { color: theme.textPrimary }]}>{periodData.avgSteps > 0 ? periodData.avgSteps.toLocaleString() : '--'}</Text>
                </View>
                <View style={styles.glanceCellR}>
                  <Text style={[styles.glanceLabel, { color: theme.textMuted }]}>WORKOUT DAYS</Text>
                  <Text style={[styles.glanceVal, { color: theme.textPrimary }]}>{`${periodData.workoutDays} / ${periodData.totalDays}`}</Text>
                </View>
              </View>
              {styleMode === 'Mindful' && (
                <View style={[styles.glanceRow, { borderBottomColor: theme.borderSubtle }]}>
                  <View style={styles.glanceCellL}>
                    <Text style={[styles.glanceLabel, { color: theme.textMuted }]}>WORKOUT DAYS</Text>
                    <Text style={[styles.glanceVal, { color: theme.textPrimary }]}>{`${periodData.workoutDays} / ${periodData.totalDays}`}</Text>
                  </View>
                  <View style={styles.glanceCellR}>
                    <Text style={[styles.glanceLabel, { color: theme.textMuted }]}>SLEEP / NIGHT</Text>
                    <Text style={[styles.glanceVal, { color: theme.textPrimary }]}>{periodData.avgSleep > 0 ? `${Math.floor(periodData.avgSleep)}h ${Math.round((periodData.avgSleep % 1) * 60)}m` : '--'}</Text>
                  </View>
                </View>
              )}
              {styleMode !== 'Mindful' && (
                <View style={[styles.glanceRow, { borderBottomColor: theme.borderSubtle }]}>
                  <View style={styles.glanceCellL}>
                    <Text style={[styles.glanceLabel, { color: theme.textMuted }]}>SLEEP / NIGHT</Text>
                    <Text style={[styles.glanceVal, { color: theme.textPrimary }]}>{periodData.avgSleep > 0 ? `${Math.floor(periodData.avgSleep)}h ${Math.round((periodData.avgSleep % 1) * 60)}m` : '--'}</Text>
                  </View>
                  <View style={styles.glanceCellR}>
                    <Text style={[styles.glanceLabel, { color: theme.textMuted }]}>SLEEP SCORE</Text>
                    <Text style={[styles.glanceVal, { color: theme.textPrimary }]}>{periodData.avgSleepScore !== null ? periodData.avgSleepScore.toString() : '--'}</Text>
                  </View>
                </View>
              )}
              <View style={[styles.glanceRow, { borderBottomColor: 'transparent' }]}>
                <View style={styles.glanceCellL}>
                  <Text style={[styles.glanceLabel, { color: theme.textMuted }]}>WATER / DAY</Text>
                  <Text style={[styles.glanceVal, { color: theme.textPrimary }]}>{periodData.avgWater > 0 ? `${periodData.avgWater} oz` : '--'}</Text>
                </View>
                <View style={styles.glanceCellR}>
                  <Text style={[styles.glanceLabel, { color: theme.textMuted }]}>WEIGHT CHANGE</Text>
                  <Text style={[styles.glanceVal, { color: weightChange !== null ? (weightChange < 0 ? theme.statusGood : weightChange > 0 ? theme.statusBad : theme.textPrimary) : theme.textPrimary }]}>
                    {weightChange !== null ? `${weightChange > 0 ? '+' : ''}${weightChange} lbs` : '--'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
            </CollapsibleSection>
            );
            if (section.systemKey === 'trends') return (
              <CollapsibleSection key={section.id} label={section.label} subtitle="Charts and graphs over time" defaultOpen={isFirst} theme={theme} first={isFirst}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {(['7', '30', '90'] as const).map(p => (
                <TouchableOpacity key={p} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); handleGlobalPeriodSync(p); }}
                  style={{ paddingVertical: 7, paddingHorizontal: 18, borderRadius: 8,
                    backgroundColor: trendPeriod === p ? theme.accentBlueBg : theme.bgInput,
                    borderWidth: 1, borderColor: trendPeriod === p ? theme.accentBlueBorder : theme.borderInput }}>
                  <Text style={{ fontSize: 12, fontFamily: 'DMSans_600SemiBold', color: trendPeriod === p ? theme.accentBlue : theme.textMuted }}>
                    {p}D
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={{ fontSize: 9, color: theme.textDim, fontFamily: 'DMSans_400Regular' }}>syncs all</Text>
          </View>

          {statsCards
            .filter(c => c.type === 'graph' && c.visible)
            .sort((a, b) => a.order - b.order)
            .map(card => (
              <StatsGraphCard
                key={card.id}
                card={card}
                cardTrendData={trendDataMap[card.period.toString()] ?? EMPTY_TREND_DATA}
                theme={theme}
                calTarget={calTarget}
                stepGoal={stepGoal}
                sleepGoal={sleepGoal}
                onPeriodChange={handleCardPeriodChange}
                onEditPress={(card) => setEditCard(card)}
              />
            ))}
            </CollapsibleSection>
            );
            if (section.systemKey === 'records') return (
              <CollapsibleSection key={section.id} label={section.label} subtitle="All-time bests with dates" defaultOpen={isFirst} theme={theme} first={isFirst}>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
            <RecordTile icon="footsteps" label="Best Steps" value={records.steps} unit="steps"
              color={theme.accentBlue} date={records.stepsDate}
              fmt={(v) => Math.round(v).toLocaleString()} />
            <RecordTile icon="flame" label="Best Active" value={records.activeCals} unit="kcal burned"
              color={theme.statusWarn} date={records.activeCalsDate}
              fmt={(v) => Math.round(v).toLocaleString()} />
          </View>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
            <RecordTile icon="water" label="Best Water" value={records.water} unit="oz"
              color={'#06b6d4'} date={records.waterDate}
              fmt={(v) => Math.round(v).toLocaleString()} />
            <RecordTile icon="moon" label="Best Sleep" value={records.sleepHours} unit="hrs"
              color={theme.sleepRem} date={records.sleepHoursDate}
              fmt={(v) => `${Math.floor(v)}h ${Math.round((v % 1) * 60)}m`} />
          </View>
            </CollapsibleSection>
            );
            if (section.systemKey === 'streaks') return (
              <CollapsibleSection key={section.id} label={section.label} subtitle="Consistency tracking" defaultOpen={isFirst} theme={theme} first={isFirst}>
          <View ref={streaksSectionRef} collapsable={false} style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: theme.accentBlueRaw, ...shadowStyle }]}>
            {/* Card header row -- (i) inline with label, gear on right */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: liveStreaks.length > 0 ? 16 : 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.cardLabel, { color: theme.textMuted }]}>STREAKS</Text>
                <TooltipIcon tooltipKey="streaks_card" />
              </View>
              <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); openManageStreaks(); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="settings" size={16} color={theme.textMuted} />
              </TouchableOpacity>
            </View>
            {liveStreaks.length === 0 ? (
              <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); openManageStreaks(); }} style={{ alignItems: 'center', paddingVertical: 20 }}>
                <Ionicons name="flame-outline" size={32} color={theme.textDim} />
                <Text style={{ fontSize: 13, fontFamily: 'DMSans_600SemiBold', color: theme.textMuted, marginTop: 8 }}>No streaks added</Text>
                <Text style={{ fontSize: 11, fontFamily: 'DMSans_400Regular', color: theme.textDim, marginTop: 4 }}>Tap to set up your streaks</Text>
              </TouchableOpacity>
            ) : (
              (() => {
                const rows: LiveStreakData[][] = [];
                for (let r = 0; r < liveStreaks.length; r += 3) {
                  rows.push(liveStreaks.slice(r, r + 3));
                }
                const STREAK_COLORS = [theme.statusGood, theme.accentBlue, '#06b6d4', theme.accentAmber, '#a855f7', '#f97316'];
                return rows.map((row, rowIdx) => {
                  const isLastRow = rowIdx === rows.length - 1 && row.length < 3;
                  return (
                    <View key={rowIdx} style={{ flexDirection: 'row', justifyContent: isLastRow ? 'center' : 'space-between', marginBottom: rowIdx < rows.length - 1 ? 16 : 0 }}>
                      {row.map((s, colIdx) => {
                        const colorIdx = (rowIdx * 3 + colIdx) % STREAK_COLORS.length;
                        const tileColor = STREAK_COLORS[colorIdx];
                        const isTappable = s.isManual;
                        return (
                          <TouchableOpacity
                            key={s.id}
                            onPress={isTappable ? () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); toggleManualCheckIn(s); } : undefined}
                            activeOpacity={isTappable ? 0.7 : 1}
                            style={{ alignItems: 'center', width: '33%' }}>
                            <Text style={{ fontSize: 28, marginBottom: 4 }}>{s.emoji}</Text>
                            <Text style={{ fontSize: 32, fontFamily: 'BebasNeue_400Regular', color: tileColor, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 0, opacity: 0.88, lineHeight: 34 }}>
                              {s.value}
                            </Text>
                            <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: 'DMSans_700Bold', letterSpacing: 1.5, textTransform: 'uppercase', textAlign: 'center' }} numberOfLines={1}>
                              {s.label}
                            </Text>
                            <View style={{ height: 14, justifyContent: 'center', alignItems: 'center', marginTop: 1 }}>
                              <Text style={{ fontSize: 9, color: theme.textDim, fontFamily: 'DMSans_400Regular', position: 'absolute' }}>days</Text>
                              {flashId === s.id && (
                                <Animated.Text style={{ fontSize: 9, color: tileColor, fontFamily: 'DMSans_600SemiBold', position: 'absolute', opacity: flashOpacity }}>
                                  {'✓ LOGGED'}
                                </Animated.Text>
                              )}
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  );
                });
              })()
            )}
          </View>
            </CollapsibleSection>
            );
            if (section.systemKey === 'calendar') return (
              <CollapsibleSection key={section.id} label={section.label} subtitle="Day-by-day history" defaultOpen={isFirst} theme={theme} first={isFirst}>
          <CollapsibleCard label="Monthly View" defaultOpen={true} theme={theme}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); if (calendarMonth === 0) { setCalendarMonth(11); setCalendarYear(y => y - 1); } else setCalendarMonth(m => m - 1); }} style={{ padding: 8 }}>
                <Ionicons name="chevron-back" size={18} color={theme.accentBlue} />
              </TouchableOpacity>
              <Text style={[styles.cardLabel, { marginBottom: 0, color: theme.textMuted }]}>{MONTH_NAMES[month]} {year}</Text>
              <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); if (calendarMonth === 11) { setCalendarMonth(0); setCalendarYear(y => y + 1); } else setCalendarMonth(m => m + 1); }} style={{ padding: 8 }}>
                <Ionicons name="chevron-forward" size={18} color={theme.accentBlue} />
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
              {[
                { label: 'On Target', bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.3)', color: theme.statusGood },
                { label: 'Close', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)', color: theme.statusWarn },
                { label: 'Off', bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.3)', color: theme.statusBad },
              ].map(l => (
                <View key={l.label} style={{ backgroundColor: l.bg, borderWidth: 1, borderColor: l.border, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 }}>
                  <Text style={{ color: l.color, fontSize: 10, fontFamily: 'DMSans_600SemiBold' }}>{l.label}</Text>
                </View>
              ))}
            </View>
            <View style={styles.calGrid}>
              {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
                <Text key={d} style={[styles.calDayHeader, { color: theme.textMuted }]}>{d}</Text>
              ))}
              {Array.from({ length: firstDay }).map((_, i) => (
                <View key={`empty-${i}`} style={{ width: '14.28%' }} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const status = getDayStatus(day);
                const colors = dayStatusColor(status);
                const isToday = day === now.getDate() && month === now.getMonth() && year === now.getFullYear();
                const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const exDay = excludedDays.find(e => e.date === dateKey);
                return (
                  <TouchableOpacity key={day}
                    style={[styles.calDay, { backgroundColor: colors.bg }, isToday && [styles.calDayToday, { borderColor: theme.accentBlueBorder }]]}
                    onPress={() => { if (dateKey <= today) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setDayDetailDate(dateKey); } }}>
                    <Text style={[styles.calDayText, { color: colors.text }]}>{day}</Text>
                    {exDay && (
                      <View style={{ position: 'absolute', bottom: 2, left: 0, right: 0, flexDirection: 'row', gap: 2, justifyContent: 'center' }}>
                        {exDay.diet && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(245,158,11,0.6)' }} />}
                        {exDay.water && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(59,130,246,0.6)' }} />}
                        {exDay.exercise && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(239,68,68,0.6)' }} />}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
              {[
                { color: 'rgba(245,158,11,0.6)', label: 'Diet excluded' },
                { color: 'rgba(59,130,246,0.6)', label: 'Water excluded' },
                { color: 'rgba(239,68,68,0.6)', label: 'Exercise excluded' },
              ].map(l => (
                <View key={l.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: l.color }} />
                  <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: 'DMSans_700Bold', letterSpacing: 1, textTransform: 'uppercase' }}>{l.label}</Text>
                </View>
              ))}
            </View>
          </CollapsibleCard>
              </CollapsibleSection>
            );
            if (section.systemKey === 'reports') return (
              <CollapsibleSection key={section.id} label={section.label} subtitle="Effort vs. results analysis" defaultOpen={isFirst} theme={theme} first={isFirst}>
                <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: theme.accentBlueRaw, ...shadowStyle, overflow: 'hidden' }]}>
                  <Ionicons name="analytics" size={130} color={theme.accentBlueRaw} style={{ position: 'absolute', right: -24, bottom: -28, opacity: 0.10 }} />
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={[styles.cardLabel, { color: theme.textMuted }]}>EFFORT VS RESULTS</Text>
                    <TooltipIcon tooltipKey="effort_vs_results" />
                  </View>
                  <Text style={{ fontSize: 13, fontFamily: 'DMSans_400Regular', color: theme.textSecondary, lineHeight: 20, marginBottom: 14 }}>
                    Compare your logged data against your actual results. See what's working, what's not, and get specific suggestions.
                  </Text>
                  <TouchableOpacity
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/diagnostic-report'); }}
                    style={{ backgroundColor: theme.accentBlueRaw, borderRadius: 8, paddingVertical: 12, alignItems: 'center' }}
                  >
                    <Text style={{ fontSize: 13, fontFamily: 'DMSans_600SemiBold', color: '#fff' }}>Open Analysis</Text>
                  </TouchableOpacity>
                </View>
              </CollapsibleSection>
            );
            return null;
          })}

      </ScrollView>

      {/* ── EDIT STATS SHEET ── */}
      <Modal transparent animationType="none" visible={editSheetVisible} onRequestClose={closeEditSheet} statusBarTranslucent hardwareAccelerated
        onShow={() => {
          editSheetAnim.setValue(0);
          Animated.timing(editSheetAnim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
        }}>
        <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', opacity: editSheetAnim, justifyContent: 'center', alignItems: 'center' }}>
          <TouchableOpacity style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} activeOpacity={1} onPress={closeEditSheet} />

          {/* Floating card */}
          <Animated.View style={{
            width: '92%',
            maxHeight: Dimensions.get('window').height * 0.80,
            backgroundColor: theme.bgSheet,
            borderRadius: 20,
            borderTopWidth: 1.5,
            borderTopColor: theme.accentBlueRaw,
            borderWidth: 0.5,
            borderColor: theme.borderSheet,
            overflow: 'hidden',
            flex: 1,
          }}>
            {/* Handle */}
            <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); closeEditSheet(); }} style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4, paddingHorizontal: 40 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.sheetHandle }} />
            </TouchableOpacity>

            {/* Title */}
            <Text style={{ fontFamily: 'BebasNeue_400Regular', fontSize: 22, letterSpacing: 3, color: theme.accentBlueRaw, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 }}>
              EDIT STATS
            </Text>

            <GestureHandlerRootView style={{ flexShrink: 1 }}>
              <DraggableFlatList
                data={editCards.filter(c => c.type === 'graph')}
                keyExtractor={item => item.id}
                onDragEnd={({ data }) => {
                  const sysCards = editCards.filter(c => c.type === 'system');
                  const updatedGraphCards = data.map((c, i) => ({ ...c, order: i }));
                  const updated = [...sysCards, ...updatedGraphCards];
                  setEditCards(updated);
                  setStatsCards(updated);
                  saveStatsCards(updated);
                }}
                ListHeaderComponent={() => (
                  <View style={{ paddingHorizontal: 20, paddingBottom: 8, borderBottomWidth: 0.5, borderBottomColor: theme.borderSubtle }}>
                    <Text style={{ fontSize: 9, letterSpacing: 2, color: theme.textMuted, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase' }}>Graph Cards</Text>
                    <Text style={{ fontSize: 10, color: theme.textDim, fontFamily: 'DMSans_400Regular', marginTop: 2 }}>Long-press to reorder</Text>
                  </View>
                )}
                ListFooterComponent={() => (
                  <>
                    <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8, borderTopWidth: 0.5, borderTopColor: theme.borderSubtle, marginTop: 8 }}>
                      <Text style={{ fontSize: 9, letterSpacing: 2, color: theme.textMuted, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase' }}>Sections</Text>
                      <Text style={{ fontSize: 10, color: theme.textDim, fontFamily: 'DMSans_400Regular', marginTop: 2 }}>Long-press to reorder</Text>
                    </View>
                    <DraggableFlatList
                      data={editCards.filter(c => c.type === 'system').sort((a, b) => a.order - b.order)}
                      keyExtractor={item => item.id}
                      scrollEnabled={false}
                      onDragEnd={({ data }) => {
                        const graphCards = editCards.filter(c => c.type === 'graph');
                        const updatedSysCards = data.map((c, i) => ({ ...c, order: i }));
                        const updated = [...updatedSysCards, ...graphCards];
                        setEditCards(updated);
                        setStatsCards(updated);
                        saveStatsCards(updated);
                      }}
                      renderItem={({ item, drag, isActive }) => (
                        <ScaleDecorator>
                          <TouchableOpacity
                            onLongPress={drag}
                            disabled={isActive}
                            activeOpacity={0.85}
                            style={{
                              flexDirection: 'row', alignItems: 'center', gap: 12,
                              paddingHorizontal: 20, paddingVertical: 13,
                              backgroundColor: isActive ? theme.bgCard : 'transparent',
                              borderBottomWidth: 0.5, borderBottomColor: theme.borderSubtle,
                            }}>
                            <Ionicons name="reorder-three-outline" size={22} color={theme.textDim} />
                            <Text style={{ flex: 1, fontSize: 14, fontFamily: 'DMSans_600SemiBold', color: item.visible ? theme.textPrimary : item.visible === false ? theme.textDim : theme.textDim }}>
                              {item.label}
                            </Text>
                            <View style={{ backgroundColor: 'rgba(102,102,128,0.12)', borderWidth: 1, borderColor: 'rgba(102,102,128,0.2)', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                              <Text style={{ fontSize: 9, fontFamily: 'DMSans_700Bold', color: theme.textMuted, letterSpacing: 1 }}>SECTION</Text>
                            </View>
                            <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); handleToggleCard(item.id); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                              <Ionicons name={item.visible ? 'eye' : 'eye-off-outline'} size={18} color={item.visible ? theme.accentBlue : theme.textDim} />
                            </TouchableOpacity>
                          </TouchableOpacity>
                        </ScaleDecorator>
                      )}
                    />
                    <View style={{ height: insets.bottom + 20 }} />
                  </>
                )}
                renderItem={({ item, drag, isActive }) => (
                  <ScaleDecorator>
                    <TouchableOpacity
                      onLongPress={drag}
                      disabled={isActive}
                      activeOpacity={0.85}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 12,
                        paddingHorizontal: 20, paddingVertical: 13,
                        backgroundColor: isActive ? theme.bgCard : 'transparent',
                        borderBottomWidth: 0.5, borderBottomColor: theme.borderSubtle,
                      }}>
                      <Ionicons name="reorder-three-outline" size={22} color={theme.textDim} />
                      <Text style={{ flex: 1, fontSize: 14, fontFamily: 'DMSans_600SemiBold', color: item.visible ? theme.textPrimary : theme.textDim }}>
                        {item.label}
                      </Text>
                      <View style={{ backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 9, fontFamily: 'DMSans_700Bold', color: theme.accentBlue, letterSpacing: 1 }}>{item.period}D</Text>
                      </View>
                      <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); handleDeleteCard(item.id); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Ionicons name="trash-outline" size={17} color={theme.statusBad} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); handleToggleCard(item.id); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Ionicons name={item.visible ? 'eye' : 'eye-off-outline'} size={18} color={item.visible ? theme.accentBlue : theme.textDim} />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  </ScaleDecorator>
                )}
              />
            </GestureHandlerRootView>
          </Animated.View>
        </Animated.View>
      </Modal>

      {/* ── CREATOR MODAL ── */}
      <Modal transparent animationType="none" visible={creatorVisible} onRequestClose={closeCreatorModal} statusBarTranslucent hardwareAccelerated
        onShow={() => {
          Animated.parallel([
            Animated.timing(creatorSheetAnim, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
            Animated.timing(creatorOverlayAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
          ]).start();
        }}>
        <ToastRenderer />
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <TouchableOpacity style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} activeOpacity={1} onPress={closeCreatorModal}>
            <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', opacity: creatorOverlayAnim }} />
          </TouchableOpacity>

          <Animated.View style={{
            transform: [{ translateY: creatorSheetAnim.interpolate({ inputRange: [0, 1], outputRange: [700, 0] }) }],
            backgroundColor: theme.bgSheet,
            borderTopLeftRadius: 20, borderTopRightRadius: 20,
            borderWidth: 0.5, borderBottomWidth: 0, borderColor: theme.borderSheet,
            maxHeight: Dimensions.get('window').height * 0.85,
          }}>
            {/* Handle */}
            <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); closeCreatorModal(); }} style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.sheetHandle }} />
            </TouchableOpacity>

            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
              {/* Header row */}
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 12, paddingBottom: 20 }}>
                {creatorStep > 1 && (
                  <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); handleCreatorBack(); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ marginRight: 12 }}>
                    <Ionicons name="chevron-back" size={20} color={theme.accentBlueRaw} />
                  </TouchableOpacity>
                )}
                <Text style={{ fontFamily: 'BebasNeue_400Regular', fontSize: 22, letterSpacing: 3, color: theme.accentBlueRaw, flex: 1 }}>
                  {creatorStep === 1 ? 'CHOOSE DATA TYPE' : creatorStep === 2 ? 'CHOOSE CHART TYPE' : 'PREVIEW'}
                </Text>
              </View>

              {/* Step 1: Data type grid -- grouped by category */}
              {creatorStep === 1 && (
                <View style={{ gap: 16 }}>
                  {DATA_KEY_CATEGORIES.map(cat => {
                    const keys = (Object.keys(DATA_KEY_META) as DataKey[]).filter(dk => DATA_KEY_META[dk].category === cat);
                    return (
                      <View key={cat}>
                        <Text style={{ fontSize: 9, letterSpacing: 2.5, textTransform: 'uppercase', fontFamily: 'DMSans_700Bold', color: theme.textMuted, marginBottom: 10 }}>
                          {cat}
                        </Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                          {keys.map(dk => {
                            const meta = DATA_KEY_META[dk];
                            const sel = creatorDataKey === dk;
                            return (
                              <TouchableOpacity key={dk} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); handleCreatorSelectDataKey(dk); }}
                                style={{ width: '47%', backgroundColor: sel ? theme.accentBlueBg : theme.bgCard,
                                  borderWidth: 1, borderColor: sel ? theme.accentBlueRaw : theme.borderCard,
                                  borderRadius: 12, padding: 14, alignItems: 'center', gap: 6 }}>
                                <Ionicons name={meta.icon as any} size={22} color={sel ? theme.accentBlue : theme.textMuted} />
                                <Text style={{ fontSize: 12, fontFamily: 'DMSans_700Bold', color: sel ? theme.accentBlue : theme.textPrimary, textAlign: 'center' }}>
                                  {meta.label}
                                </Text>
                                <Text style={{ fontSize: 10, fontFamily: 'DMSans_400Regular', color: theme.textDim, textAlign: 'center', lineHeight: 13 }}>
                                  {meta.description}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Step 2: Chart type picker */}
              {creatorStep === 2 && creatorDataKey && (
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  {availableChartTypes(creatorDataKey).map(ct => {
                    const sel = creatorChartType === ct;
                    return (
                      <TouchableOpacity key={ct} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setCreatorChartType(ct); setCreatorStep(3); }}
                        style={{ flex: 1, backgroundColor: sel ? theme.accentBlueBg : theme.bgCard,
                          borderWidth: 1.5, borderColor: sel ? theme.accentBlueRaw : theme.borderCard,
                          borderRadius: 14, padding: 24, alignItems: 'center', gap: 10 }}>
                        <Ionicons name={ct === 'line' ? 'analytics-outline' : 'bar-chart-outline'} size={32}
                          color={sel ? theme.accentBlue : theme.textMuted} />
                        <Text style={{ fontSize: 16, fontFamily: 'DMSans_700Bold', color: sel ? theme.accentBlue : theme.textPrimary }}>
                          {ct === 'line' ? 'Line' : 'Bar'}
                        </Text>
                        <Text style={{ fontSize: 11, fontFamily: 'DMSans_400Regular', color: theme.textDim, textAlign: 'center' }}>
                          {ct === 'line' ? 'Trend line with area fill' : 'Daily bar chart'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Step 3: Preview */}
              {creatorStep === 3 && creatorDataKey && creatorChartType && (
                <>
                  {/* Color picker */}
                  {creatorDataKey !== 'workoutFreq' && (
                    <>
                      <Text style={{ fontSize: 9, fontFamily: 'DMSans_700Bold', letterSpacing: 3, textTransform: 'uppercase', color: theme.textMuted, marginBottom: 10 }}>
                        {creatorDataKey === 'macros' ? 'Macro Colors' : 'Color'}
                      </Text>
                      {creatorDataKey === 'macros' ? (
                        <>
                          {([
                            { key: 'protein' as const, label: 'Protein' },
                            { key: 'carbs' as const, label: 'Carbs' },
                            { key: 'fat' as const, label: 'Fat' },
                          ]).map(({ key, label }) => {
                            const usedColors = Object.entries(creatorMacroColors)
                              .filter(([k]) => k !== key)
                              .map(([, v]) => v);
                            return (
                              <View key={key} style={{ marginBottom: 10 }}>
                                <Text style={{ fontSize: 9, fontFamily: 'DMSans_600SemiBold', letterSpacing: 1.5, textTransform: 'uppercase', color: theme.textDim, marginBottom: 6 }}>{label}</Text>
                                <View style={{ flexDirection: 'row', gap: 8 }}>
                                  {GRAPH_SWATCHES.map(sw => {
                                    const selected = creatorMacroColors[key] === sw;
                                    const blocked = usedColors.includes(sw);
                                    return (
                                      <TouchableOpacity key={sw} disabled={blocked}
                                        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setCreatorMacroColors(prev => ({ ...prev, [key]: sw })); }}
                                        style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: sw,
                                          opacity: blocked ? 0.2 : 1,
                                          borderWidth: selected ? 2 : 0, borderColor: '#ffffff',
                                          alignItems: 'center', justifyContent: 'center' }}>
                                        {selected && <Ionicons name="checkmark" size={13} color="#ffffff" />}
                                      </TouchableOpacity>
                                    );
                                  })}
                                </View>
                              </View>
                            );
                          })}
                          <View style={{ height: 4 }} />
                        </>
                      ) : (
                        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                          {GRAPH_SWATCHES.map(sw => {
                            const selected = creatorColor === sw;
                            return (
                              <TouchableOpacity key={sw}
                                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setCreatorColor(selected ? undefined : sw); }}
                                style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: sw,
                                  borderWidth: selected ? 2 : 0, borderColor: '#ffffff',
                                  alignItems: 'center', justifyContent: 'center' }}>
                                {selected && <Ionicons name="checkmark" size={13} color="#ffffff" />}
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      )}
                    </>
                  )}

                  <StatsGraphCard
                    card={{ id: 'creator_preview', type: 'graph', dataKey: creatorDataKey, chartType: creatorChartType, period: 7, label: DATA_KEY_META[creatorDataKey].label, visible: true, order: 0, placement: 'stats',
                      color: creatorColor,
                      macroColors: (creatorMacroColors.protein !== MACRO_PROTEIN || creatorMacroColors.carbs !== MACRO_CARBS || creatorMacroColors.fat !== MACRO_FAT) ? creatorMacroColors : undefined,
                    }}
                    cardTrendData={trendDataMap['7'] ?? EMPTY_TREND_DATA}
                    theme={theme}
                    calTarget={calTarget}
                    stepGoal={stepGoal}
                    sleepGoal={sleepGoal}
                    onPeriodChange={() => {}}
                    onEditPress={() => {}}
                  />
                  <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); handleAddCard(); }}
                    style={{ backgroundColor: theme.accentBlueRaw, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 4 }}>
                    <Text style={{ fontSize: 15, fontFamily: 'DMSans_700Bold', color: '#fff', letterSpacing: 1.5 }}>ADD TO STATS</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>

            {/* Step indicator -- fixed at sheet bottom */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 7, paddingTop: 10, paddingBottom: insets.bottom + 16 }}>
              {[1, 2, 3].map(s => (
                <View key={s} style={{ width: s === creatorStep ? 16 : 6, height: 6, borderRadius: 3,
                  backgroundColor: s <= creatorStep ? theme.accentBlueRaw : theme.borderSubtle }} />
              ))}
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* ── CARD EDIT MODAL ── */}
      <StatsCardEditModal
        card={editCard}
        onClose={() => setEditCard(null)}
        onSave={handleSaveEditCard}
        onDelete={handleDeleteEditCard}
        theme={theme}
      />

      {/* ── FAB backdrop ── */}
      {showFabMenu && (
        <TouchableOpacity
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          activeOpacity={1}
          onPress={closeFabMenu}
        />
      )}

      {/* ── FAB speed dial items ── */}
      {showFabMenu && (
        <View style={{ position: 'absolute', bottom: 86, right: 20, alignItems: 'flex-end', gap: 12 }}>
          {/* Add Report -- disabled, coming soon */}
          <Animated.View style={{ opacity: fabItem1Anim, transform: [{ translateY: fabItem1Anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ backgroundColor: theme.bgCard, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 0.5, borderColor: theme.borderCard, opacity: 0.5 }}>
                <Text style={{ color: theme.textMuted, fontSize: 13, fontFamily: 'DMSans_500Medium' }}>Add Report</Text>
                <Text style={{ color: theme.textDim, fontSize: 10, fontFamily: 'DMSans_400Regular' }}>Coming soon</Text>
              </View>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.bgCard, borderWidth: 0.5, borderColor: theme.borderCard, alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
                <Ionicons name="bar-chart-outline" size={20} color={theme.textDim} />
              </View>
            </View>
          </Animated.View>

          {/* Add Graph -- active, accent fill */}
          <Animated.View style={{ opacity: fabItem2Anim, transform: [{ translateY: fabItem2Anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <TouchableOpacity
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); closeFabMenu(); setTimeout(() => openCreatorModal(), 150); }}
                style={{ backgroundColor: theme.accentBlueRaw, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, shadowColor: theme.accentBlueRaw, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 6 }}>
                <Text style={{ color: '#ffffff', fontSize: 13, fontFamily: 'DMSans_600SemiBold' }}>Add Graph</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); closeFabMenu(); setTimeout(() => openCreatorModal(), 150); }}
                style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.accentBlueRaw, alignItems: 'center', justifyContent: 'center', shadowColor: theme.accentBlueRaw, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 6 }}>
                <Ionicons name="analytics-outline" size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      )}

      {/* ── Main FAB ── */}
      <View ref={fabRef} collapsable={false} style={{ position: 'absolute', bottom: 16, right: 20 }}>
      <Animated.View style={{ transform: [{ scale: fabScale }] }}>
        <TouchableOpacity
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); toggleFabMenu(); }}
          onPressIn={() => Animated.timing(fabScale, { toValue: 0.9, duration: 80, useNativeDriver: true }).start()}
          onPressOut={() => Animated.timing(fabScale, { toValue: 1, duration: 80, useNativeDriver: true }).start()}
          activeOpacity={1}
          style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: theme.accentBlueRaw, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 }}>
          <Ionicons name={showFabMenu ? 'close' : 'add'} size={28} color="#ffffff" />
        </TouchableOpacity>
      </Animated.View>
      </View>

      {dayDetailDate !== null && (
        <Modal transparent animationType="none" visible={dayDetailDate !== null} onRequestClose={closeDayDetail} statusBarTranslucent hardwareAccelerated
          onShow={() => {
            dayDetailAnim.setValue(0);
            Animated.timing(dayDetailAnim, { toValue: 1, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
          }}>
          <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', opacity: dayDetailAnim, justifyContent: 'center', alignItems: 'center' }}>
            <TouchableOpacity style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} activeOpacity={1} onPress={closeDayDetail} />
            <Animated.View style={{ width: '92%', height: '75%', borderRadius: 20, backgroundColor: theme.bgSheet, borderWidth: 0.5, borderColor: theme.borderSheet, overflow: 'hidden', opacity: dayDetailAnim }}>
              <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); closeDayDetail(); }} style={{ alignSelf: 'center', paddingVertical: 6, paddingHorizontal: 40 }}>
                <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.sheetHandle, marginTop: 12, marginBottom: 12 }} />
              </TouchableOpacity>
              <DayDetailContent date={dayDetailDate} onClose={closeDayDetail} />
            </Animated.View>
          </Animated.View>
        </Modal>
      )}

      {/* Manage Streaks Modal */}
      <Modal transparent animationType="none" visible={showManageStreaks} onRequestClose={closeManageStreaks} statusBarTranslucent>
        <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', opacity: manageStreaksAnim }}>
          <TouchableOpacity style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} activeOpacity={1} onPress={closeManageStreaks} />
          <Animated.View style={{
            width: '92%', maxHeight: '72%', borderRadius: 16, backgroundColor: theme.bgSheet,
            borderWidth: 0.5, borderTopWidth: 1.5, borderColor: theme.borderSheet, borderTopColor: theme.accentBlueRaw,
            padding: 20,
            transform: [{ scale: manageStreaksAnim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }],
          }}>
            <TouchableOpacity style={{ alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: theme.textMuted, opacity: 0.5, marginBottom: 16 }} activeOpacity={0.6} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); closeManageStreaks(); }} />
            <Text style={{ fontSize: 20, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2, color: theme.accentBlueRaw, marginBottom: 16 }}>MANAGE STREAKS</Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Active streaks -- drag to reorder */}
              {streakConfig.length > 0 && (
                <>
                  <Text style={{ fontSize: 9, fontFamily: 'DMSans_700Bold', letterSpacing: 2, textTransform: 'uppercase', color: theme.textMuted, marginBottom: 10 }}>ACTIVE</Text>
                  <DraggableFlatList
                    data={streakConfig}
                    keyExtractor={item => item.id}
                    scrollEnabled={false}
                    onDragEnd={({ data }) => reorderStreaks(data)}
                    renderItem={({ item, drag, isActive }: RenderItemParams<StreakConfigItem>) => {
                      const live = liveStreaks.find(l => l.id === item.id);
                      const meta = item.key ? BUILTIN_STREAK_META[item.key] : null;
                      const isManual = meta ? meta.isManual : true;
                      return (
                        <ScaleDecorator>
                          <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: theme.borderCard, backgroundColor: isActive ? theme.bgInput : 'transparent' }}>
                            <TouchableOpacity onLongPress={drag} delayLongPress={100} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ paddingRight: 10 }}>
                              <Ionicons name="reorder-three-outline" size={22} color={theme.textMuted} />
                            </TouchableOpacity>
                            <Text style={{ fontSize: 20, marginRight: 10 }}>{item.emoji}</Text>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 14, fontFamily: 'DMSans_600SemiBold', color: theme.textPrimary }}>{item.label}</Text>
                              <Text style={{ fontSize: 11, fontFamily: 'DMSans_400Regular', color: theme.textDim }}>{live ? `${live.value} day streak · ` : ''}{isManual ? 'Manual check-in' : 'Auto-tracked'}</Text>
                            </View>
                            <TouchableOpacity
                              onPress={() => Alert.alert('Remove Streak', `Remove "${item.label}" from your active streaks?`, [
                                { text: 'Cancel', style: 'cancel' },
                                { text: 'Remove', style: 'destructive', onPress: () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); removeStreak(item.id); } },
                              ])}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                              <Ionicons name="close-circle" size={20} color={theme.accentRed} />
                            </TouchableOpacity>
                          </View>
                        </ScaleDecorator>
                      );
                    }}
                  />
                  <View style={{ height: 20 }} />
                </>
              )}

              {/* Available presets */}
              {(() => {
                const activeIds = new Set(streakConfig.map(s => s.id));
                const isNRN = faithJourney === 'notrightnow';
                const available = (Object.keys(BUILTIN_STREAK_META) as BuiltinStreakKey[]).filter(key => {
                  if (BUILTIN_STREAK_META[key].faithGated && isNRN) return false;
                  return !activeIds.has(`builtin_${key}`);
                });
                if (available.length === 0) return null;
                return (
                  <>
                    <Text style={{ fontSize: 9, fontFamily: 'DMSans_700Bold', letterSpacing: 2, textTransform: 'uppercase', color: theme.textMuted, marginBottom: 10 }}>ADD PRESET</Text>
                    {available.map(key => {
                      const meta = BUILTIN_STREAK_META[key];
                      return (
                        <TouchableOpacity key={key} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); addBuiltinStreak(key); }}
                          style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: theme.borderCard }}>
                          <Text style={{ fontSize: 20, marginRight: 10 }}>{meta.emoji}</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 14, fontFamily: 'DMSans_600SemiBold', color: theme.textPrimary }}>{meta.label}</Text>
                            <Text style={{ fontSize: 11, fontFamily: 'DMSans_400Regular', color: theme.textDim }}>{meta.isManual ? 'Manual check-in' : 'Auto-tracked'}</Text>
                          </View>
                          <Ionicons name="add-circle-outline" size={20} color={theme.accentBlue} />
                        </TouchableOpacity>
                      );
                    })}
                    <View style={{ height: 20 }} />
                  </>
                );
              })()}

              {/* Create custom */}
              <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); closeManageStreaks(); setTimeout(openCreateCustom, 220); }}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                  backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder,
                  borderRadius: 10, paddingVertical: 12, marginTop: 4, marginBottom: 8 }}>
                <Ionicons name="add" size={18} color={theme.accentBlue} />
                <Text style={{ fontSize: 14, fontFamily: 'DMSans_600SemiBold', color: theme.accentBlue }}>Create Custom Streak</Text>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </Animated.View>
      </Modal>

      {/* Create Custom Streak Modal */}
      <Modal transparent animationType="none" visible={showCreateCustom} onRequestClose={closeCreateCustom} statusBarTranslucent>
        <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', opacity: createCustomAnim }}>
          <TouchableOpacity style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} activeOpacity={1} onPress={closeCreateCustom} />
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <Animated.View style={{
              width: '88%', borderRadius: 16, backgroundColor: theme.bgSheet,
              borderWidth: 0.5, borderTopWidth: 1.5, borderColor: theme.borderSheet, borderTopColor: theme.accentBlueRaw,
              padding: 20,
              transform: [{ translateY: modalKeyboardOffset }],
            }}>
                <TouchableOpacity style={{ alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: theme.textMuted, opacity: 0.5, marginBottom: 16 }} activeOpacity={0.6} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); closeCreateCustom(); }} />
                <Text style={{ fontSize: 20, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2, color: theme.accentBlueRaw, marginBottom: 4 }}>CREATE CUSTOM STREAK</Text>
              <Text style={{ fontSize: 11, fontFamily: 'DMSans_400Regular', color: theme.textDim, marginBottom: 20 }}>Manual check-in -- tap the tile each day to log it.</Text>

              <Text style={{ fontSize: 9, fontFamily: 'DMSans_700Bold', letterSpacing: 2, textTransform: 'uppercase', color: theme.textMuted, marginBottom: 6 }}>STREAK NAME</Text>
              <TextInput
                style={{ backgroundColor: theme.bgInput, borderWidth: 0.5, borderColor: theme.borderInput, borderRadius: 8, padding: 12, fontSize: 15, fontFamily: 'DMSans_400Regular', color: theme.textPrimary, marginBottom: 16 }}
                value={customName}
                onChangeText={setCustomName}
                placeholder="e.g. Cold Shower, No Alcohol..."
                placeholderTextColor={theme.textPlaceholder}
                maxLength={30}
              />

              <Text style={{ fontSize: 9, fontFamily: 'DMSans_700Bold', letterSpacing: 2, textTransform: 'uppercase', color: theme.textMuted, marginBottom: 6 }}>EMOJI</Text>
              <TextInput
                style={{ backgroundColor: theme.bgInput, borderWidth: 0.5, borderColor: theme.borderInput, borderRadius: 8, padding: 12, fontSize: 28, textAlign: 'center', color: theme.textPrimary, marginBottom: 24 }}
                value={customEmoji}
                onChangeText={v => setCustomEmoji([...v].slice(0, 1).join(''))}
                placeholder="🎯"
                placeholderTextColor={theme.textPlaceholder}
                maxLength={2}
              />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); closeCreateCustom(); }}
                  style={{ backgroundColor: theme.bgInput, borderWidth: 0.5, borderColor: theme.borderInput, borderRadius: 10, padding: 14, width: 90, alignItems: 'center' }}>
                  <Text style={{ fontSize: 16, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2, color: theme.textMuted }}>CANCEL</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); saveCustomStreak(); }}
                  disabled={!customName.trim() || !customEmoji.trim()}
                  style={{ flex: 1, backgroundColor: customName.trim() && customEmoji.trim() ? theme.accentBlue : theme.bgInput, borderRadius: 10, padding: 14, alignItems: 'center',
                    borderWidth: customName.trim() && customEmoji.trim() ? 0 : 0.5, borderColor: theme.borderInput }}>
                  <Text style={{ fontSize: 16, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2, color: customName.trim() && customEmoji.trim() ? theme.bgPrimary : theme.textDim }}>ADD STREAK</Text>
                </TouchableOpacity>
            </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </Modal>

    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1 },
  content:      { padding: 16, paddingBottom: 100 },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 0.5, marginBottom: 4 },
  headerLabel:  { fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2, fontFamily: 'DMSans_700Bold' },
  headerTitle:  { fontSize: 32, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2 },
  card:         { borderWidth: 0.5, borderTopWidth: 1.5, borderRadius: 14, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 12, elevation: 6 },
  cardLabel:    { fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 0, fontFamily: 'DMSans_700Bold' },
  calGrid:      { flexDirection: 'row', flexWrap: 'wrap' },
  calDayHeader: { width: '14.28%', textAlign: 'center', fontSize: 9, letterSpacing: 1, paddingVertical: 4, fontFamily: 'DMSans_700Bold' },
  calDay:       { width: '14.28%', height: 36, borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  calDayToday:  { borderWidth: 1 },
  calDayText:   { fontSize: 14, fontFamily: 'DMSans_600SemiBold' },
  historyRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 0.5 },
  historyDate:  { fontSize: 12, fontFamily: 'DMSans_400Regular' },
  historyVal:   { fontSize: 13, fontFamily: 'DMSans_600SemiBold' },
  glanceRow:    { flexDirection: 'row', borderBottomWidth: 0.5 },
  glanceCellL:  { width: '50%', paddingVertical: 10, paddingRight: 12 },
  glanceCellR:  { width: '50%', paddingVertical: 10, paddingLeft: 12 },
  glanceLabel:  { fontSize: 9, fontFamily: 'DMSans_700Bold', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 3 },
  glanceVal:    { fontSize: 15, fontFamily: 'DMSans_700Bold' },
});
