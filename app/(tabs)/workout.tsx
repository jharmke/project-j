import { Ionicons } from '@expo/vector-icons';
import { IconSymbol } from '@/components/ui/icon-symbol';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useScrollToTop } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Animated, AppState, Dimensions, Keyboard, KeyboardAvoidingView, Modal, PanResponder, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Reanimated, { useAnimatedStyle, useSharedValue, withSpring, withTiming, runOnJS } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ToastRenderer, useToast } from '../../components/Toast';
import { showAchievementToast } from '../../components/AchievementToast';
import { showCelebration } from '../../components/CelebrationOverlay';
import { checkWorkoutAchievements, getCelebTier } from '../../achievementData';
import { storageSet } from '../../utils/storage';
import { cancelActivityNotification } from '../../services/notifications';
import { addNotification, clearNotification } from '../../utils/notifications';
import * as Notifications from 'expo-notifications';
import { useTheme } from '../../theme';
import HeaderAvatar from '../../components/HeaderAvatar';
import { useHealthKit } from '../../useHealthKit';
import { BLANK_DAY, DEFAULT_TAGS, DayProgram, Exercise, PRRecord, Routine, SetEntry, TAG_COLOR_PALETTE, WorkoutTag, PRESET_ROUTINES, weightUnitLabel } from '../../workoutData';
import MuscleMap from '../../components/MuscleMap';
import ExerciseSetRows from '../../components/ExerciseSetRows';
import HRZoneModal, { HRZoneData } from '../../components/HRZoneModal';
import { resolveMaxHR, zoneBounds, timeInZones, ageFromBirthday } from '../../utils/hrZones';
import { recomputeLiftPR, normalizeLiftName } from '../../utils/liftPR';
import { syncedGroupLabel, SPLIT_TYPES, detectCardioPRs, loadSyncedLabels, CardioPRHit } from '../../utils/syncedWorkouts';
import TooltipIcon from '../../components/TooltipIcon';
import { showToolkit } from '../../components/ToolkitSheet';
import { useTutorial } from '../../context/TutorialContext';
import { useTutorialTarget } from '../../hooks/useTutorialTarget';


const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];


const makeId = () => Math.random().toString(36).substr(2, 9);

// Parse a free-text rest value into seconds. Accepts "90", "90s", "1:30", "2 min".
const parseRestSeconds = (raw: any): number | null => {
  if (raw == null) return null;
  const s = String(raw).trim().toLowerCase();
  if (!s) return null;
  if (s.includes(':')) {
    const [m, sec] = s.split(':');
    return ((parseInt(m) || 0) * 60 + (parseInt(sec) || 0)) || null;
  }
  if (s.includes('m')) { const n = parseFloat(s); return n ? Math.round(n * 60) : null; }
  return parseInt(s) || null;
};
const formatRest = (sec: number): string => (sec < 60 ? `${sec}s` : `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`);

// Cardio duration -> seconds. Apple Health imports the duration as "MM:SS"; manual entries are whole
// MINUTES. Used to sum cardio time for the finish recap without rounding.
const parseCardioDurationSec = (ex: any): number => {
  if (ex?.duration == null) return 0;
  const raw = String(ex.duration).trim();
  if (!raw) return 0;
  if (raw.includes(':')) { const [m, s] = raw.split(':'); return (parseInt(m) || 0) * 60 + (parseInt(s) || 0); }
  const mins = parseFloat(raw); return mins ? Math.round(mins * 60) : 0;
};

function getTodayDay() {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()];
}
const getWorkoutDateKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getEffortLabel = (score: number | null | undefined): string => {
  if (!score) return '';
  if (score <= 2) return 'EASY';
  if (score <= 4) return 'LIGHT';
  if (score <= 6) return 'MODERATE';
  if (score <= 8) return 'HARD';
  return 'MAX EFFORT';
};

const filterDecimal = (v: string, set: (s: string) => void) => {
  const stripped = v.replace(/[^0-9.]/g, '');
  const dot = stripped.indexOf('.');
  if (dot === -1) { set(stripped); }
  else {
    const before = stripped.slice(0, dot);
    const after = stripped.slice(dot + 1).replace(/\./g, '').slice(0, 2);
    set(before + '.' + after);
  }
};

export default function WorkoutScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { showToast } = useToast();
  const [todayKey, setTodayKey] = useState(getWorkoutDateKey);
  const [activeDay, setActiveDay] = useState(getWorkoutDateKey);
  const activeDayRef = useRef(getWorkoutDateKey());
  useEffect(() => { activeDayRef.current = activeDay; }, [activeDay]);

  // Midnight rollover: update todayKey + snap activeDay to today when app resumes across midnight
  useEffect(() => {
    const checkRollover = () => {
      const newKey = getWorkoutDateKey();
      setTodayKey(prev => {
        if (prev !== newKey) {
          setActiveDay(newKey);
          return newKey;
        }
        return prev;
      });
    };
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') checkRollover();
    });
    const now = new Date();
    const msUntilMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime();
    const timer = setTimeout(checkRollover, msUntilMidnight);
    return () => { sub.remove(); clearTimeout(timer); };
  }, []);
  const [loaded, setLoaded] = useState(false);
  const [checks, setChecks] = useState<Record<string, Record<string, boolean>>>({});
// Actual logged sets per lift: setLogs[dateKey][exerciseId] = SetEntry[]. Additive on pj_workout_state.
const [setLogs, setSetLogs] = useState<Record<string, Record<string, SetEntry[]>>>({});
// Epoch ms a CARDIO exercise was marked done: exerciseDoneAt[dateKey][exerciseId]. Lifts derive their
// stamp from set doneAt instead; this only covers cardio (no sets). Additive on pj_workout_state.
const [exerciseDoneAt, setExerciseDoneAt] = useState<Record<string, Record<string, number>>>({});
// Aggregated avg/max HR for the active day's Apple Watch strength session(s), fetched from HealthKit
// samples (same source as HR Zones). Null while loading or when no HR data exists.
const [sessionHR, setSessionHR] = useState<{ avgHr: number | null; maxHr: number | null }>({ avgHr: null, maxHr: null });
// Rest timer (auto-starts on checking a set; dismissible; buzzes + notifies at zero, then counts up).
const [restTimer, setRestTimer] = useState<{ secondsLeft: number; overtime: number; label: string } | null>(null);
const restEndRef = useRef(0);
const restIntervalRef = useRef<any>(null);
const restNotifIdRef = useRef<string | null>(null);
const restBuzzedRef = useRef(false);
// All-time PRs per lift (keyed by normalized name). Banked the moment a qualifying set is checked.
const [prs, setPrs] = useState<Record<string, PRRecord>>({});
// PRs actually HIT per day: prHitsByDay[dateKey][normalizedLiftName] = hit. Recorded the instant a
// qualifying set is checked (not gated behind opening the summary), so the recap trophy + Otto
// notification survive even if the user never opens the summary. Additive on pj_workout_state.
const [prHitsByDay, setPrHitsByDay] = useState<Record<string, Record<string, any>>>({});
const [finishSummary, setFinishSummary] = useState<{
  totalVolume: number; volumeLb?: number; volumeKg?: number; doneSets: number; doneExercises: number; prHits: any[]; cardioPrHits: CardioPRHit[]; mindful: boolean;
  hasLifts: boolean; liftDurationSec: number | null;
  liftCalories: number | null; liftAvgHr: number | null; liftMaxHr: number | null;
  liftItems: { name: string; volume: number; sets: { weight: number; reps: number }[]; unit?: 'lb' | 'kg' }[];
  cardio: { count: number; distanceMi: number; durationSec: number; calories: number; avgHr: number | null; maxHr: number | null; items?: { name: string; durationSec: number; distanceMi: number; calories: number; avgHr: number | null; maxHr: number | null }[] } | null;
  totalCalories: number;
} | null>(null);
// Per-day recap snapshot for days already finished THIS SESSION. Drives the Finish -> View Summary
// button swap. In-memory only (resets on reload -> button returns to "Finish Workout"); cleared for a
// day the moment its workout is edited so a stale summary never shows.
const [finishedSummaries, setFinishedSummaries] = useState<Record<string, NonNullable<typeof finishSummary>>>({});
const [cardioComplete, setCardioComplete] = useState<Record<string, boolean>>({});
const [programs, setPrograms] = useState<Record<string, DayProgram>>({});
const [workoutNotes, setWorkoutNotes] = useState<Record<string, string>>({});
const [workoutNoteNames, setWorkoutNoteNames] = useState<Record<string, string>>({}); // editable per-day note title (defaults to "Workout Note")
const [weeklyTemplate, setWeeklyTemplate] = useState<Record<string, DayProgram>>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [modalDay, setModalDay] = useState('');
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [dayLabel, setDayLabel] = useState('');
  const dayScrollRef = useRef<any>(null);
  const mainScrollRef = useRef<any>(null);
  useScrollToTop(mainScrollRef);
  const noteInputRef = useRef<any>(null);

  // Tutorial spotlight targets
  const dayScrollerRef     = useTutorialTarget('workout_day_scroller');
  const progressCountRef   = useTutorialTarget('workout_progress_count');
  const effortCardRef      = useTutorialTarget('workout_effort');
  const firstExerciseRef   = useTutorialTarget('workout_exercise_row');
  const firstSetsRepsRef   = useTutorialTarget('workout_sets_reps');
  const firstCardioRef     = useTutorialTarget('workout_cardio_fields');
  const workoutFabRef      = useTutorialTarget('workout_fab');
  const { registerScrollView, unregisterScrollView, registerTutorialAction, unregisterTutorialAction } = useTutorial();
  const hasScrolled = useRef(false);
const [labelInput, setLabelInput] = useState('');
  const [form, setForm] = useState({ name: '', sets: '', reps: '', rest: '', note: '', isCardio: false, weightUnit: 'lb' as 'lb' | 'kg', duration: '', distance: '', speed: '', incline: '', resistance: '', hr: '', calories: ''});
const [cardioLogs, setCardioLogs] = useState<Record<string, any>>({});
  // Manual workout timer per day. startedAt = epoch ms while running (null when stopped); elapsedSec =
  // banked seconds from prior run segments. Opt-in; only relevant on days WITHOUT an Apple strength
  // banner (Apple duration always wins). Persisted inside pj_workout_state via saveState.
  const [workoutTimers, setWorkoutTimers] = useState<Record<string, { startedAt: number | null; elapsedSec: number }>>({});
  const [timerTick, setTimerTick] = useState(0); // 1s heartbeat to re-render the running clock
  const [durationEditDay, setDurationEditDay] = useState<string | null>(null); // manual duration edit modal
  const [durationEditText, setDurationEditText] = useState('');
  const [calBurnedSaved, setCalBurnedSaved] = useState(false);
  const [savedNoteText, setSavedNoteText] = useState<Record<string, string>>({});
  const [tags, setTags] = useState<WorkoutTag[]>(DEFAULT_TAGS);
  const [showTagModal, setShowTagModal] = useState(false);
  const [showManageTagsModal, setShowManageTagsModal] = useState(false);
  const [tagModalInitialTags, setTagModalInitialTags] = useState<string[]>([]);
  const [activeProgramName, setActiveProgramName] = useState<string | null>(null);
  const [showFabMenu, setShowFabMenu] = useState(false);
  const fabItem1Anim = useRef(new Animated.Value(0)).current;
  const fabItem2Anim = useRef(new Animated.Value(0)).current;
  const [showLoadRoutineModal, setShowLoadRoutineModal] = useState(false);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [selectedRoutine, setSelectedRoutine] = useState<Routine | null>(null);
  const [selectedLoadDays, setSelectedLoadDays] = useState<string[]>([]);
  const [loadPickerWeekOffset, setLoadPickerWeekOffset] = useState(0);
  const loadRoutineOverlay = useSharedValue(0);
  const loadRoutineCardScale = useSharedValue(0.92);
  const loadRoutineOverlayStyle = useAnimatedStyle(() => ({ opacity: loadRoutineOverlay.value }));
  const loadRoutineCardStyle = useAnimatedStyle(() => ({ transform: [{ scale: loadRoutineCardScale.value }] }));
  const [exerciseLibrary, setExerciseLibrary] = useState<any[]>([]);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [infoExercise, setInfoExercise] = useState<any | null>(null);
  const infoOverlay = useSharedValue(0);
  const infoCardScale = useSharedValue(0.92);
  const infoCardOpacity = useSharedValue(1);
  const infoOverlayStyle = useAnimatedStyle(() => ({ opacity: infoOverlay.value }));
  const infoCardStyle = useAnimatedStyle(() => ({ transform: [{ scale: infoCardScale.value }], opacity: infoCardOpacity.value }));
  // Finish-workout recap modal (centered floating card, house standard animation).
  const finishOverlay = useSharedValue(0);
  const finishCardScale = useSharedValue(0.92);
  const finishCardOpacity = useSharedValue(1);
  const finishOverlayStyle = useAnimatedStyle(() => ({ opacity: finishOverlay.value }));
  const finishCardStyle = useAnimatedStyle(() => ({ transform: [{ scale: finishCardScale.value }], opacity: finishCardOpacity.value }));
  const durationOverlay = useSharedValue(0);
  const durationCardScale = useSharedValue(0.85);
  const durationCardOpacity = useSharedValue(0);
  const durationOverlayStyle = useAnimatedStyle(() => ({ opacity: durationOverlay.value }));
  const durationCardStyle = useAnimatedStyle(() => ({ transform: [{ scale: durationCardScale.value }], opacity: durationCardOpacity.value }));
  // Per-exercise weight-unit (lb/kg) picker: opened from a set-row's weight-column header.
  const [unitPickerExId, setUnitPickerExId] = useState<string | null>(null);
  const unitPickerOverlay = useSharedValue(0);
  const unitPickerScale = useSharedValue(0.85);
  const unitPickerOpacity = useSharedValue(0);
  const unitPickerOverlayStyle = useAnimatedStyle(() => ({ opacity: unitPickerOverlay.value }));
  const unitPickerCardStyle = useAnimatedStyle(() => ({ transform: [{ scale: unitPickerScale.value }], opacity: unitPickerOpacity.value }));
  const closeUnitPicker = () => { setUnitPickerExId(null); unitPickerOverlay.value = 0; unitPickerScale.value = 0.85; unitPickerOpacity.value = 0; };
  const fabScale = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const originalForm = useRef<typeof form | null>(null);
  const effortAnims = useRef(Array.from({ length: 10 }, () => new Animated.Value(1))).current;
  const effortLabelAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(fabScale, { toValue: 1, useNativeDriver: true, friction: 6, tension: 120, delay: 300 }).start();
  }, []);

  // Register main ScrollView so tutorial auto-scroll works on this tab
  useEffect(() => {
    registerScrollView('workout', mainScrollRef);
    return () => unregisterScrollView('workout');
  }, []);

  // Tutorial demo actions
  const addTutorialExercise = useCallback(async () => {
    // Scroll to top instantly BEFORE the overlay opens -- avoids off-screen
    // spotlight when the user launched the tutorial while scrolled down.
    mainScrollRef.current?.scrollTo({ y: 0, animated: false });

    const benchEx = {
      id: 'tutorial_demo_bench',
      name: 'Bench Press',
      sets: '3',
      reps: '8',
      rest: '90',
      note: '',
      isCardio: false,
      isTutorialDemo: true,
    };
    const treadEx = {
      id: 'tutorial_demo_treadmill',
      name: 'Treadmill',
      sets: '',
      reps: '',
      rest: '',
      note: '',
      isCardio: true,
      duration: '30',
      distance: '2.5',
      speed: '5.0',
      incline: '',
      resistance: '',
      hr: '',
      calories: '280',
      isTutorialDemo: true,
    };
    try {
      const raw = await AsyncStorage.getItem('pj_workout_state');
      const data = raw ? JSON.parse(raw) : {};
      const dayKey = activeDayRef.current;
      const dayProg = data.programs?.[dayKey] || { type: 'unassigned', exercises: [], tags: [], focus: '' };
      // Strip any stale demo entries, then prepend both demo exercises
      const filtered = (dayProg.exercises || []).filter((e: any) => !e.isTutorialDemo);
      const newExercises = [benchEx, treadEx, ...filtered];
      const newPrograms = { ...(data.programs || {}), [dayKey]: { ...dayProg, exercises: newExercises } };
      await storageSet('pj_workout_state', JSON.stringify({ ...data, programs: newPrograms }));
      setPrograms(newPrograms);
    } catch {}
  }, []);

  const deleteTutorialExercise = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem('pj_workout_state');
      const data = raw ? JSON.parse(raw) : {};
      const newPrograms = Object.fromEntries(
        Object.entries(data.programs || {}).map(([key, prog]: [string, any]) => [
          key,
          { ...prog, exercises: (prog.exercises || []).filter((e: any) => !e.isTutorialDemo) },
        ])
      );
      await storageSet('pj_workout_state', JSON.stringify({ ...data, programs: newPrograms }));
      setPrograms(newPrograms);
    } catch {}
  }, []);

  useFocusEffect(
    useCallback(() => {
      registerTutorialAction('addTutorialExercise', addTutorialExercise);
      registerTutorialAction('deleteTutorialExercise', deleteTutorialExercise);
      return () => {
        unregisterTutorialAction('addTutorialExercise');
        unregisterTutorialAction('deleteTutorialExercise');
      };
    }, [addTutorialExercise, deleteTutorialExercise, registerTutorialAction, unregisterTutorialAction])
  );

  const manageTagsAnim = useSharedValue(600);
  const manageTagsOverlayAnim = useRef(new Animated.Value(0)).current;

  const addExerciseScale = useSharedValue(0.85);
  const addExerciseOpacity = useSharedValue(0);
  const addExerciseOverlayAnim = useRef(new Animated.Value(0)).current;
  const addExerciseKeyboardY = useSharedValue(0);
  // Keyboard height drives the modal's available space: the card is height-capped to fit between the
  // safe-area top and the keyboard, and its internal ScrollView scrolls to reach every field + buttons.
  const [addExerciseKbHeight, setAddExerciseKbHeight] = useState(0);
  const addExerciseKeyboardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: addExerciseScale.value }],
    opacity: addExerciseOpacity.value,
  }));

  const openAddExerciseModal = (day: string, exercise: Exercise | null = null) => {
    addExerciseOverlayAnim.setValue(0);
    setModalDay(day);
    setEditingExercise(exercise);
    if (exercise) {
      const editValues = {
        name: exercise.name,
        sets: exercise.sets,
        reps: exercise.reps,
        rest: exercise.rest,
        note: exercise.note,
        isCardio: exercise.isCardio ?? false,
        weightUnit: (exercise.weightUnit ?? 'lb') as 'lb' | 'kg',
        duration: exercise.duration ?? '',
        distance: exercise.distance ?? '',
        speed: exercise.speed ?? '',
        incline: exercise.incline ?? '',
        resistance: exercise.resistance ?? '',
        hr: exercise.hr ?? '',
        calories: exercise.calories ?? '',
      };
      setForm(editValues);
      originalForm.current = editValues;
    } else {
      setForm({ name: '', sets: '', reps: '', rest: '', note: '', isCardio: false, weightUnit: 'lb', duration: '', distance: '', speed: '', incline: '', resistance: '', hr: '', calories: '' });
      originalForm.current = null;
    }
    setShowAddModal(true);
  };

  const closeAddExerciseModal = () => {
    Keyboard.dismiss();
    addExerciseKeyboardY.value = withTiming(0, { duration: 200 });
    Animated.timing(addExerciseOverlayAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start();
    addExerciseScale.value = withTiming(0.85, { duration: 160 });
    addExerciseOpacity.value = withTiming(0, { duration: 150 }, (finished) => {
      if (finished) runOnJS(setShowAddModal)(false);
    });
  };
  

  const manageTagsKeyboardOffset = useSharedValue(0);
  const manageTagsKeyboardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: manageTagsAnim.value - manageTagsKeyboardOffset.value }],
  }));

  const openManageTags = () => {
    manageTagsOverlayAnim.setValue(0);
    manageTagsAnim.value = 1200;
    manageTagsKeyboardOffset.value = 0;
    setShowManageTagsModal(true);
  };

  const closeManageTags = () => {
    Keyboard.dismiss();
    manageTagsKeyboardOffset.value = withTiming(0, { duration: 250 });
    Animated.timing(manageTagsOverlayAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    manageTagsAnim.value = withTiming(600, { duration: 280 });
    setTimeout(() => setShowManageTagsModal(false), 300);
  };

  useEffect(() => {
    const show = Keyboard.addListener('keyboardWillShow', e => {
      manageTagsKeyboardOffset.value = withTiming(e.endCoordinates.height, { duration: e.duration || 250 });
      setAddExerciseKbHeight(e.endCoordinates.height);
    });
    const hide = Keyboard.addListener('keyboardWillHide', e => {
      manageTagsKeyboardOffset.value = withTiming(0, { duration: e.duration || 250 });
      setAddExerciseKbHeight(0);
    });
    return () => { show.remove(); hide.remove(); };
  }, []);

  useEffect(() => {
    const score = cardioLogs[activeDay]?.effortScore;
    effortLabelAnim.setValue(score ? 1 : 0);
  }, [activeDay]);

  const manageTagsSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: manageTagsAnim.value }],
  }));
  

  const manageTagsPanResponder = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 8,
    onPanResponderRelease: (_, g) => {
      if (g.dy > 60) closeManageTags();
    },
  })).current;
  const [editingTag, setEditingTag] = useState<WorkoutTag | null>(null);
  const [tagLabelInput, setTagLabelInput] = useState('');
  const [tagColorInput, setTagColorInput] = useState(TAG_COLOR_PALETTE[0]);
const { activeCalories, appleWorkouts, fetchTodayData, fetchWorkoutHRByUUID, fetchSyncedWorkouts } = useHealthKit();

// HR Zones per-workout modal
const [hrModalVisible, setHrModalVisible] = useState(false);
const [hrModalLoading, setHrModalLoading] = useState(false);
const [hrModalData, setHrModalData] = useState<HRZoneData | null>(null);

const openHRZones = async (ex: any) => {
  triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
  setHrModalData(null);
  setHrModalLoading(true);
  setHrModalVisible(true);
  try {
    const approxMs = ex.appleStartDate ? new Date(ex.appleStartDate).getTime() : Date.now();
    const res = await fetchWorkoutHRByUUID(ex.appleHealthUUID, approxMs);
    if (!res.found || res.samples.length === 0) { setHrModalLoading(false); setHrModalData(null); return; }
    // User params: age (Tanaka), manual override + model + stored observed peak (settings),
    // resting HR (latest frozen recovery value). All read-then-merge safe.
    const prof = await AsyncStorage.getItem('pj_profile');
    const age = ageFromBirthday(prof ? JSON.parse(prof).birthday : null);
    const settingsRaw = await AsyncStorage.getItem('pj_settings');
    const sd = settingsRaw ? JSON.parse(settingsRaw) : {};
    const manualOverride = sd.hrMaxOverride ?? null;
    const model: 'hrr' | 'maxhr' = sd.hrZoneModel === 'maxhr' ? 'maxhr' : 'hrr';
    const storedPeak = typeof sd.hrObservedPeak === 'number' ? sd.hrObservedPeak : null;
    // This workout's peak; persist it as the running observed peak if it's a new high (auto-raise).
    const thisPeak = res.samples.reduce((m, s) => (s.v > m ? s.v : m), 0);
    const observedPeak = Math.max(storedPeak ?? 0, thisPeak) || null;
    if (thisPeak > 0 && (storedPeak === null || thisPeak > storedPeak)) {
      try {
        const cur = settingsRaw ? JSON.parse(settingsRaw) : {};
        await storageSet('pj_settings', JSON.stringify({ ...cur, hrObservedPeak: thisPeak }));
      } catch {}
    }
    // Resting HR: latest frozen overnight value from recovery, walking back up to 14 days.
    let restingHR: number | null = null;
    const now = new Date();
    for (let i = 0; i < 14 && restingHR === null; i++) {
      const d = new Date(now); d.setDate(now.getDate() - i);
      const key = `pj_${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      try {
        const raw = await AsyncStorage.getItem(key);
        const rhr = raw ? JSON.parse(raw)?.recoverySignals?.rhr : null;
        if (typeof rhr === 'number' && rhr > 0) restingHR = rhr;
      } catch {}
    }
    const { value: maxHR, source } = resolveMaxHR({ age, manualOverride, observedPeak });
    if (!maxHR) { setHrModalLoading(false); setHrModalData(null); return; }
    const bounds = zoneBounds(maxHR, restingHR, model);
    const r = timeInZones(res.samples, bounds);
    setHrModalData({
      workoutName: ex.name || 'Workout',
      durationSec: res.durationSec,
      maxHR, maxHRSource: source, model, restingHR, bounds,
      secs: r.secs, belowZ1: r.belowZ1, peak: r.peak,
      styleMode: sd.styleMode ?? 'balanced',
    });
    setHrModalLoading(false);
  } catch {
    setHrModalLoading(false);
    setHrModalData(null);
  }
};

useEffect(() => {
  if (activeCalories > 0) {
    setCardioLogs(prev => {
      const updated = { ...prev, [todayKey]: { ...(prev[todayKey] || {}), caloriesBurned: String(activeCalories) } };
      AsyncStorage.getItem('pj_workout_state').then(saved => {
        const current = saved ? JSON.parse(saved) : {};
        storageSet('pj_workout_state', JSON.stringify({ ...current, cardioLogs: updated }));
      });
      AsyncStorage.getItem(`pj_${todayKey}`).then(saved => {
        const current = saved ? JSON.parse(saved) : {};
        storageSet(`pj_${todayKey}`, JSON.stringify({ ...current, caloriesBurned: activeCalories }));
      });
      return updated;
    });
    setCalBurnedSaved(true);
  }
}, [activeCalories]);

const formatDuration = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
};

useEffect(() => {
  if (!appleWorkouts || appleWorkouts.length === 0) return;

  const WORKOUT_TYPE_NAMES: Record<number, string> = {
    1: 'American Football', 2: 'Archery', 3: 'Australian Football', 4: 'Badminton',
    5: 'Baseball', 6: 'Basketball', 7: 'Bowling', 8: 'Boxing',
    9: 'Climbing', 10: 'Cricket', 11: 'Cross Training', 12: 'Curling',
    13: 'Cycling', 14: 'Dance', 16: 'Elliptical', 17: 'Equestrian Sports',
    18: 'Fencing', 19: 'Fishing', 20: 'Functional Strength Training',
    21: 'Golf', 22: 'Gymnastics', 23: 'Handball', 24: 'Hiking',
    25: 'Hockey', 26: 'Hunting', 27: 'Lacrosse', 28: 'Martial Arts',
    29: 'Mind and Body', 30: 'Mixed Metabolic Cardio Training', 31: 'Paddle Sports',
    32: 'Play', 33: 'Preparation and Recovery', 34: 'Racquetball', 35: 'Rowing',
    36: 'Rugby', 37: 'Running', 38: 'Sailing', 39: 'Skating Sports',
    40: 'Snow Sports', 41: 'Soccer', 42: 'Softball', 43: 'Squash',
    44: 'Stair Climbing', 45: 'Surfing Sports', 46: 'Swimming', 47: 'Table Tennis',
    48: 'Tennis', 49: 'Track and Field', 50: 'Traditional Strength Training',
    51: 'Volleyball', 52: 'Walking', 53: 'Water Fitness', 54: 'Water Polo',
    55: 'Water Sports', 56: 'Wrestling', 57: 'Yoga', 58: 'Barre',
    59: 'Core Training', 60: 'Cross Country Skiing', 61: 'Downhill Skiing',
    62: 'Flexibility', 63: 'High Intensity Interval Training', 64: 'Jump Rope',
    65: 'Kickboxing', 66: 'Pilates', 67: 'Snowboarding', 68: 'Stairs',
    69: 'Step Training', 70: 'Wheelchair Walk Pace', 71: 'Wheelchair Run Pace',
    72: 'Tai Chi', 73: 'Mixed Cardio', 74: 'Hand Cycling', 75: 'Disc Sports',
    76: 'Fitness Gaming', 3000: 'Other',
  };

  const APPLE_LIFT_TYPES = new Set([20, 50, 59]); // Functional Strength, Traditional Strength, Core Training

  // Read the indoor/outdoor flag the same way useHealthKit's synced query does (HKIndoorWorkout rides
  // on every sample). null = the device never set it. syncedGroupLabel then splits ONLY the genuine
  // split types (walk/run/cycle/swim/row) into "Indoor X"/"Outdoor X"; everything else stays bare, and
  // a null flag also stays bare -- so this can never invent nonsense like "Outdoor Yoga".
  const indoorOf = (w: any): boolean | null => {
    const raw = w.metadata?.HKIndoorWorkout;
    return typeof raw === 'boolean' ? raw : raw === 1 ? true : raw === 0 ? false : null;
  };
  const labelFor = (w: any): string => {
    const type = w.workoutActivityType;
    return syncedGroupLabel(WORKOUT_TYPE_NAMES[type] ?? 'Workout', indoorOf(w), type);
  };

  setPrograms(prev => {
    const current: DayProgram = prev[todayKey] ? { ...prev[todayKey] } : { type: 'cardio', focus: 'Cardio', exercises: [] };
    const existingUUIDs = new Set(current.exercises.map((e: any) => e.appleHealthUUID).filter(Boolean));

    // Retro-fix: earlier imports saved the bare type name ("Walking") before the indoor/outdoor split
    // existed. Correct an existing Apple entry to the split label, but ONLY when its saved name is still
    // exactly the bare default for a split type AND the live sample carries a real indoor flag -- so a
    // manual rename, a non-split type, or a flag-less session is never touched. Name is display-only for
    // Apple cardio (nothing keys logic off it -- PRs need weighted sets, summaries filter by flag/id),
    // so this is a safe, surgical in-place relabel.
    const wByUuid = new Map<string, any>(appleWorkouts.map((w: any) => [w.uuid, w]));
    let renamed = false;
    const fixedExisting = current.exercises.map((ex: any) => {
      if (!ex.fromAppleHealth || !ex.appleHealthUUID) return ex;
      const w = wByUuid.get(ex.appleHealthUUID);
      if (!w) return ex;
      const type = w.workoutActivityType;
      if (!SPLIT_TYPES.has(type)) return ex;
      const bareDefault = WORKOUT_TYPE_NAMES[type] ?? 'Workout';
      if (ex.name !== bareDefault) return ex;        // user-renamed or already split -> leave it
      const proper = labelFor(w);
      if (proper === ex.name) return ex;             // flag missing -> stays bare, no change
      renamed = true;
      return { ...ex, name: proper };
    });

    const newExercises: any[] = [];
    for (const w of appleWorkouts) {
      if (existingUUIDs.has(w.uuid)) continue;
      const durationMin = formatDuration(w.duration.quantity);
      const calories = Math.round(w.totalEnergyBurned?.quantity ?? 0);
      const distanceMi = w.totalDistance ? Math.round((w.totalDistance.quantity / 1609.34) * 100) / 100 : null;
      const name = labelFor(w);
      newExercises.push({
        id: `apple_${w.uuid}`,
        name,
        sets: '',
        reps: '',
        rest: '',
        note: '',
        isCardio: !APPLE_LIFT_TYPES.has(w.workoutActivityType),
        duration: String(durationMin),
        distance: distanceMi ? String(distanceMi) : '',
        calories: String(calories),
        fromAppleHealth: true,
        appleHealthUUID: w.uuid,
        appleStartDate: w.startDate,
      });
    }

    if (newExercises.length === 0 && !renamed) return prev;
    // An Apple Health workout landing on a rest day means it wasn't really a rest day. Flip off 'rest'
    // so the imported exercises aren't silently hidden by the rest-day view. Only a genuine NEW import
    // should flip the day; a name-only cleanup must not touch the day type.
    const flip = newExercises.length > 0 && current.type === 'rest';
    const flippedType = flip ? 'cardio' : current.type;
    const flippedFocus = flip ? 'Cardio' : current.focus;
    const updated = {
      ...prev,
      [todayKey]: {
        ...current,
        type: flippedType,
        focus: flippedFocus,
        exercises: [...fixedExisting, ...newExercises],
      },
    };
    const newCheckIds = newExercises.map((e: any) => e.id);
    AsyncStorage.getItem('pj_workout_state').then(saved => {
      const current2 = saved ? JSON.parse(saved) : {};
      const updatedChecks = { ...(current2.checks || {}), [todayKey]: { ...(current2.checks?.[todayKey] || {}), ...Object.fromEntries(newCheckIds.map((id: string) => [id, true])) } };
      storageSet('pj_workout_state', JSON.stringify({ ...current2, programs: updated, checks: updatedChecks }));
      if (newCheckIds.length) {
        setChecks(prevChecks => {
          const c = { ...prevChecks };
          c[todayKey] = { ...(c[todayKey] || {}), ...Object.fromEntries(newCheckIds.map((id: string) => [id, true])) };
          return c;
        });
      }
    });
    return updated;
  });
}, [appleWorkouts]);

const generate21Days = () => {
  const days = [];
  for (let i = -30; i <= 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
    const label = `${String(d.getMonth() + 1)}/${String(d.getDate())}`;
    days.push({ key, dayName, label });
  }
  return days;
};

const DATES = generate21Days();
const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const params = useLocalSearchParams<{ pendingExercise?: string; pendingDay?: string }>();

useEffect(() => {
  if (params.pendingExercise && params.pendingDay) {
    const ex = JSON.parse(params.pendingExercise);
    const targetDay = params.pendingDay;
    setActiveDay(targetDay);
    setModalDay(targetDay);
    setEditingExercise(null);
    setForm({
      name: ex.name,
      sets: ex.sets,
      reps: ex.reps,
      rest: ex.rest,
      note: ex.note,
      isCardio: ex.isCardio,
      weightUnit: (ex.weightUnit ?? 'lb') as 'lb' | 'kg',
      duration: '',
      distance: '',
      speed: '',
      incline: '',
      resistance: '',
      hr: '',
      calories: '',
    });
    setShowAddModal(true);
  }
}, [params.pendingExercise]);
  const activeDateObj = DATES.find(d => d.key === activeDay);
const activeDayName = activeDateObj?.dayName || 'Mon';
const program = programs[activeDay] || weeklyTemplate[activeDayName] || BLANK_DAY;
const isLift = program?.type === 'lift';
const isRest = program?.type === 'rest';
const exercises = program?.exercises || [];
// An Apple Watch STRENGTH workout imports as a non-cardio exercise carrying only a session envelope
// (duration/calories/HR, no sets). We surface those as ONE aggregated session banner instead of junk
// cards, so pull them out of the rendered/counted exercise list. Manual lifts + cardio stay as cards.
const isAppleSession = (e: any) => !!(e && e.fromAppleHealth && !e.isCardio && e.appleHealthUUID);
const appleSessions = exercises.filter(isAppleSession);
const displayExercises = exercises.filter((e: any) => !isAppleSession(e));
const dayChecks = checks[activeDay] || {};
const doneCount = displayExercises.filter(ex => dayChecks[ex.id]).length;
const color = theme.accentBlue;
const noteCurrentText = workoutNotes[activeDay]?.trim() || '';
const noteLastSaved = savedNoteText[activeDay]?.trim() || '';
const noteIsDirty = noteCurrentText !== noteLastSaved;
const modalCanSave = editingExercise
  ? JSON.stringify(form) !== JSON.stringify(originalForm.current)
  : !!form.name.trim();

useEffect(() => {
  const pct = displayExercises.length > 0 ? doneCount / displayExercises.length : 0;
  Animated.timing(progressAnim, { toValue: pct, duration: 300, useNativeDriver: false }).start();
}, [doneCount, displayExercises.length]);

// Pool HR samples across the day's Apple strength session(s) -> avg + max for the session banner.
const sessionUUIDKey = appleSessions.map((s: any) => s.appleHealthUUID).join(',');
useEffect(() => {
  let cancelled = false;
  if (!appleSessions.length) { setSessionHR({ avgHr: null, maxHr: null }); return; }
  (async () => {
    const vals: number[] = [];
    for (const s of appleSessions as any[]) {
      try {
        const approxMs = s.appleStartDate ? new Date(s.appleStartDate).getTime() : Date.now();
        const res = await fetchWorkoutHRByUUID(s.appleHealthUUID, approxMs);
        if (res?.found && res.samples?.length) {
          for (const smp of res.samples) if (typeof smp.v === 'number' && smp.v > 0) vals.push(smp.v);
        }
      } catch {}
    }
    if (cancelled) return;
    if (!vals.length) { setSessionHR({ avgHr: null, maxHr: null }); return; }
    let mx = 0; let sum = 0;
    for (const v of vals) { sum += v; if (v > mx) mx = v; }
    setSessionHR({ avgHr: Math.round(sum / vals.length), maxHr: Math.round(mx) });
  })();
  return () => { cancelled = true; };
}, [activeDay, sessionUUIDKey]);

useEffect(() => {
  if (!loaded) return;
  const idx = DATES.findIndex(d => d.key === activeDay);
  const offset = Math.max(0, (idx - 2) * 80 - 8);
  setTimeout(() => {
    dayScrollRef.current?.scrollTo({ x: offset, animated: true });
  }, 100);
}, [loaded, activeDay]);

  useEffect(() => {
    const load = async () => {
      try {
        const saved = await AsyncStorage.getItem('pj_workout_state');
        if (saved) {
          const data = JSON.parse(saved);
          if (data.checks) setChecks(data.checks);
          if (data.cardioComplete) setCardioComplete(data.cardioComplete);
          if (data.programs) setPrograms(data.programs);
          if (data.workoutNotes) { setWorkoutNotes(data.workoutNotes); setSavedNoteText(data.workoutNotes); }
          if (data.workoutNoteNames) setWorkoutNoteNames(data.workoutNoteNames);
          if (data.cardioLogs) setCardioLogs(data.cardioLogs);
          if (data.weeklyTemplate) setWeeklyTemplate(data.weeklyTemplate);
          if (data.setLogs) setSetLogs(data.setLogs);
          if (data.exerciseDoneAt) setExerciseDoneAt(data.exerciseDoneAt);
          if (data.prs) setPrs(data.prs);
          if (data.prHitsByDay) setPrHitsByDay(data.prHitsByDay);
          if (data.activeProgramName) setActiveProgramName(data.activeProgramName);
          if (data.workoutTimers) setWorkoutTimers(data.workoutTimers);
        }
        const settings = await AsyncStorage.getItem('pj_settings');
        const s = settings ? JSON.parse(settings) : {};
        const savedTags: WorkoutTag[] = (s.workoutTags && Array.isArray(s.workoutTags)) ? s.workoutTags : [];

        // Merge -- ensure all locked defaults always exist with correct data
        const mergedTags = [...savedTags];
        for (const def of DEFAULT_TAGS) {
          const existingIdx = mergedTags.findIndex(t => t.id === def.id);
          if (existingIdx === -1) {
            // Missing entirely -- add at the front
            mergedTags.unshift({ ...def });
          } else {
            // Exists -- force locked flag and correct color, preserve label if customized
            mergedTags[existingIdx] = { ...mergedTags[existingIdx], locked: true, color: def.color };
          }
        }

        // Save merged tags back so storage stays clean
        await storageSet('pj_settings', JSON.stringify({ ...s, workoutTags: mergedTags }));
        setTags(mergedTags);

        const libRaw = await AsyncStorage.getItem('pj_exercise_library');
        if (libRaw) setExerciseLibrary(JSON.parse(libRaw));
      } catch (e) {
        console.log('Load error', e);
      } finally {
        setLoaded(true);
      }
    };
    load();
  }, []);

  useFocusEffect(
    useCallback(() => {
      const reload = async () => {
        try {
          const saved = await AsyncStorage.getItem('pj_workout_state');
          if (saved) {
            const data = JSON.parse(saved);
            if (data.checks) setChecks(data.checks);
if (data.cardioComplete) setCardioComplete(data.cardioComplete);
if (data.programs) setPrograms(data.programs);
if (data.workoutNotes) { setWorkoutNotes(data.workoutNotes); setSavedNoteText(data.workoutNotes); }
if (data.workoutNoteNames) setWorkoutNoteNames(data.workoutNoteNames);
if (data.cardioLogs) setCardioLogs(data.cardioLogs);
if (data.weeklyTemplate) setWeeklyTemplate(data.weeklyTemplate);
if (data.setLogs) setSetLogs(data.setLogs);
if (data.exerciseDoneAt) setExerciseDoneAt(data.exerciseDoneAt);
if (data.prs) setPrs(data.prs);
if (data.prHitsByDay) setPrHitsByDay(data.prHitsByDay);
if (data.workoutTimers) setWorkoutTimers(data.workoutTimers);
          }
        } catch (e) {
          console.log('Reload error', e);
        }
      };
      reload();
      fetchTodayData();
    }, [])
  );

  const saveState = async (newChecks = checks, newCardio = cardioComplete, newPrograms = programs, newNotes = workoutNotes, newCardioLogs = cardioLogs, newTemplate = weeklyTemplate, newProgramName = activeProgramName, newNoteNames = workoutNoteNames, newSetLogs = setLogs, newPrs = prs, newExerciseDoneAt = exerciseDoneAt, newTimers = workoutTimers, newPrHitsByDay = prHitsByDay) => {
  try {
    await storageSet('pj_workout_state', JSON.stringify({
      checks: newChecks,
      cardioComplete: newCardio,
      programs: newPrograms,
      workoutNotes: newNotes,
      workoutNoteNames: newNoteNames,
      cardioLogs: newCardioLogs,
      weeklyTemplate: newTemplate,
      activeProgramName: newProgramName,
      setLogs: newSetLogs,
      prs: newPrs,
      exerciseDoneAt: newExerciseDoneAt,
      workoutTimers: newTimers,
      prHitsByDay: newPrHitsByDay,
    }));
  } catch (e) {
    console.log('Save error', e);
  }
};

  // ---- Manual workout timer (no-watch users) ----
  // Live elapsed = banked seconds + current run segment. Apple strength days never use this.
  const getTimerElapsedSec = (day: string): number => {
    const t = workoutTimers[day];
    if (!t) return 0;
    const live = t.startedAt ? (Date.now() - t.startedAt) / 1000 : 0;
    return Math.max(0, Math.round((t.elapsedSec || 0) + live));
  };
  const isTimerRunning = (day: string): boolean => !!workoutTimers[day]?.startedAt;

  // Persist the day's manual workout minutes onto pj_<date> (read-then-merge, never clobber other fields)
  // so Home/Stats/goals/achievements can credit no-watch users. Apple-priority merge lives in the readers.
  const writeManualMinutesToDay = async (day: string, elapsedSec: number) => {
    try {
      const mins = Math.max(0, Math.round(elapsedSec / 60));
      const raw = await AsyncStorage.getItem('pj_' + day);
      const cur = raw ? JSON.parse(raw) : {};
      await storageSet('pj_' + day, JSON.stringify({ ...cur, manualWorkoutMinutes: mins }));
    } catch (e) { console.log('manual minutes write error', e); }
  };
  const persistTimers = (next: Record<string, { startedAt: number | null; elapsedSec: number }>) =>
    saveState(checks, cardioComplete, programs, workoutNotes, cardioLogs, weeklyTemplate, activeProgramName, workoutNoteNames, setLogs, prs, exerciseDoneAt, next);

  const startWorkoutTimer = (day: string) => {
    if (workoutTimers[day]?.startedAt) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    const next = { ...workoutTimers, [day]: { startedAt: Date.now(), elapsedSec: workoutTimers[day]?.elapsedSec || 0 } };
    setWorkoutTimers(next);
    persistTimers(next);
    clearFinished(day); // starting/continuing invalidates any stale recap snapshot
  };
  const stopWorkoutTimer = (day: string) => {
    const t = workoutTimers[day];
    if (!t?.startedAt) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    const elapsedSec = Math.max(0, Math.round((t.elapsedSec || 0) + (Date.now() - t.startedAt) / 1000));
    const next = { ...workoutTimers, [day]: { startedAt: null, elapsedSec } };
    setWorkoutTimers(next);
    persistTimers(next);
    writeManualMinutesToDay(day, elapsedSec);
    clearFinished(day);
    showToast('Workout Timer Stopped', formatDuration(elapsedSec) + ' logged', 'success');
  };
  const openDurationEdit = (day: string) => {
    setDurationEditDay(day);
    const mins = Math.round(getTimerElapsedSec(day) / 60);
    setDurationEditText(mins > 0 ? String(mins) : '');
  };
  const saveDurationEdit = () => {
    if (!durationEditDay) return;
    const mins = Math.max(0, Math.min(1440, parseInt(durationEditText) || 0));
    const elapsedSec = mins * 60;
    const next = { ...workoutTimers, [durationEditDay]: { startedAt: null, elapsedSec } };
    setWorkoutTimers(next);
    persistTimers(next);
    writeManualMinutesToDay(durationEditDay, elapsedSec);
    clearFinished(durationEditDay);
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    showToast('Duration Updated', mins > 0 ? formatDuration(elapsedSec) + ' logged' : 'Duration cleared', 'success');
    setDurationEditDay(null);
    setDurationEditText('');
  };

  // 1s heartbeat so the running clock re-renders; only ticks while the active day's timer runs.
  useEffect(() => {
    if (!workoutTimers[activeDay]?.startedAt) return;
    const id = setInterval(() => setTimerTick(x => x + 1), 1000);
    return () => clearInterval(id);
  }, [workoutTimers, activeDay]);

  // Logged sets for an exercise on the active day. Seeds empty rows from the target sets count
  // (default 3) the first time, so a fresh lift shows rows to fill. Seeded rows are not persisted
  // until the user actually edits/checks one.
  const getSeededSets = (ex: any): SetEntry[] => {
    const stored = setLogs[activeDay]?.[ex.id];
    if (stored && stored.length) return stored;
    const n = Math.max(1, Math.min(10, parseInt(ex.sets) || 3));
    const rest = parseInt(ex.rest) || null;
    const reps = parseInt(ex.reps) || null; // pre-fill target reps so a fresh lift shows its rep target
    return Array.from({ length: n }, () => ({ weight: null, reps, rest, done: false }));
  };

  // PR engine lives in utils/liftPR.ts (pure + unit-tested). This resolver is the only glue: it maps a
  // date to that day's exercise list (from a given programs map, falling back to the weekly template)
  // so the engine can trace a logged set back to a lift name without knowing about app state.
  const makeDayResolver = (progsMap: Record<string, DayProgram>) => (dateKey: string) =>
    (progsMap[dateKey] || weeklyTemplate[dayNameOf(dateKey)])?.exercises || [];

  // Drop / refresh the Otto hub notification for a lift's PR (only for TODAY's workout, never a past
  // edit). Records are 'stack' + category 'record' so the hub groups them ("You set N PRs today").
  // Clear-then-add so a later, heavier same-day PR for the same lift updates the card in place.
  // Wording is identical across all coaching modes (PR = progress, shown to everyone). Each stat gets
  // its own line (title + up to two body lines) so the card reads clean instead of one crammed string.
  const firePRNotification = async (hit: any) => {
    try {
      const parts: string[] = [];
      // "up from" shows the prior best's own unit only when it differs from today's (a mid-lift unit switch).
      const u = weightUnitLabel(hit.unit);
      if (hit.weightPR) {
        const from = hit.prevWeightVal != null ? `, up from ${hit.prevWeightVal}${hit.prevWeightUnit && hit.prevWeightUnit !== hit.unit ? ' ' + weightUnitLabel(hit.prevWeightUnit) : ''}` : '';
        parts.push(`${hit.weightVal} ${u} × ${hit.weightReps}${from}`);
      }
      if (hit.e1rmPR) {
        const from = hit.prevE1rmVal != null ? `, up from ${hit.prevE1rmVal}${hit.prevE1rmUnit && hit.prevE1rmUnit !== hit.unit ? ' ' + weightUnitLabel(hit.prevE1rmUnit) : ''}` : '';
        parts.push(`Est. 1-rep max ${hit.e1rmVal} ${u}${from}`);
      }
      const id = `pr_${activeDay}_${normalizeLiftName(hit.name)}`;
      await clearNotification(id);
      await addNotification({
        id, lifecycle: 'stack', category: 'record',
        title: `New PR: ${hit.name}`,
        body: parts.join('\n'),
        icon: 'trophy', iconColor: '#d4860a',
        route: { pathname: '/workout-library', params: { openPRs: 'true' } }, // taps into the PR home (All PRs)
      });
    } catch {}
  };

  const saveSetsForExercise = (exId: string, sets: SetEntry[]) => {
    clearFinished();
    const next = { ...setLogs, [activeDay]: { ...(setLogs[activeDay] || {}), [exId]: sets } };
    setSetLogs(next);
    // Derive per-exercise completion from set completion so the existing checks boolean (Today's
    // Effort / activity notifications / EvR) stays in sync: an exercise is "done" when it has at
    // least one set and every set is checked.
    const allDone = sets.length > 0 && sets.every(s => s.done);
    const dayChecksNow = checks[activeDay] || {};
    const changed = !!dayChecksNow[exId] !== allDone;
    const newChecks = changed ? { ...checks, [activeDay]: { ...dayChecksNow, [exId]: allDone } } : checks;
    if (changed) setChecks(newChecks);
    if (allDone && !dayChecksNow[exId] && activeDay === todayKey) cancelActivityNotification();
    // Recompute this lift's PR from history right now, so it survives without ever opening the summary
    // AND rolls back if this change (uncheck / edit down / remove a set) no longer earns it. Only touch
    // Otto for TODAY (a past-day edit re-judges silently).
    const ex = (exercises as any[]).find(e => e.id === exId);
    let nextPrs = prs, nextHits = prHitsByDay;
    if (ex && !ex.isCardio) {
      const r = recomputeLiftPR(ex.name, next, makeDayResolver(programs), prs, prHitsByDay, activeDay, Date.now());
      nextPrs = r.prs; nextHits = r.hits;
      setPrs(nextPrs);
      setPrHitsByDay(nextHits);
      if (activeDay === todayKey) {
        if (r.hit) firePRNotification(r.hit);
        else if (r.revoked) clearNotification(`pr_${activeDay}_${normalizeLiftName(ex.name)}`);
      }
    }
    saveState(newChecks, cardioComplete, programs, workoutNotes, cardioLogs, weeklyTemplate, activeProgramName, workoutNoteNames, next, nextPrs, exerciseDoneAt, workoutTimers, nextHits);
  };

  // Set a single exercise's weight unit (lb/kg) from the inline column-header picker. Additive: only the
  // exercise's weightUnit label changes -- logged weight NUMBERS are never rewritten. Materializes the
  // active day into programs[activeDay] (same as the pencil edit), recomputes that lift's PR (unit changes
  // how its logged weights compare), and re-mounts the rows so the header relabels.
  const setExerciseUnit = (exId: string, unit: 'lb' | 'kg') => {
    const base = programs[activeDay] || weeklyTemplate[activeDayName] || BLANK_DAY;
    const ex = (base.exercises || []).find(e => e.id === exId);
    closeUnitPicker();
    if (!ex || (ex.weightUnit || 'lb') === unit) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    clearFinished();
    const newExercises = (base.exercises || []).map(e => e.id === exId ? { ...e, weightUnit: unit } : e);
    const newPrograms = { ...programs, [activeDay]: { ...base, exercises: newExercises } };
    setPrograms(newPrograms);
    let nextPrs = prs, nextHits = prHitsByDay;
    if (!ex.isCardio) {
      const r = recomputeLiftPR(ex.name, setLogs, makeDayResolver(newPrograms), prs, prHitsByDay, activeDay, Date.now());
      nextPrs = r.prs; nextHits = r.hits;
      setPrs(nextPrs); setPrHitsByDay(nextHits);
      if (activeDay === todayKey) {
        if (r.hit) firePRNotification(r.hit);
        else if (r.revoked) clearNotification(`pr_${activeDay}_${normalizeLiftName(ex.name)}`);
      }
    }
    saveState(checks, cardioComplete, newPrograms, workoutNotes, cardioLogs, weeklyTemplate, activeProgramName, workoutNoteNames, setLogs, nextPrs, exerciseDoneAt, workoutTimers, nextHits);
    setSetRowsVersion(v => ({ ...v, [exId]: (v[exId] || 0) + 1 }));
    showToast('Unit updated', unit === 'kg' ? 'Kilograms (kg)' : 'Pounds (lb)', 'success');
  };

  // Big per-exercise checkmark on a LIFT marks every set done / undone at once (filling empties
  // from last session when completing). A version bump re-mounts the set rows so they re-seed from
  // the updated log. Cardio keeps its manual toggleExercise.
  const [setRowsVersion, setSetRowsVersion] = useState<Record<string, number>>({});
  const bulkToggleLift = (ex: any, done: boolean) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    const current = getSeededSets(ex);
    const prev = done ? getPreviousSets(ex) : null;
    const stamp = Date.now();
    const nextSets = current.map((s, i) => done
      ? { ...s, done: true, doneAt: stamp, weight: s.weight == null && prev?.[i] ? prev[i].weight : s.weight, reps: s.reps == null && prev?.[i] ? prev[i].reps : s.reps }
      : { ...s, done: false, doneAt: undefined });
    saveSetsForExercise(ex.id, nextSets);
    setSetRowsVersion(v => ({ ...v, [ex.id]: (v[ex.id] || 0) + 1 }));
  };

  // ── Rest timer ───────────────────────────────────────────────────────────────
  const clearRest = () => {
    if (restIntervalRef.current) { clearInterval(restIntervalRef.current); restIntervalRef.current = null; }
    if (restNotifIdRef.current) { Notifications.cancelScheduledNotificationAsync(restNotifIdRef.current).catch(() => {}); restNotifIdRef.current = null; }
  };
  const scheduleRestNotif = async (seconds: number, label: string) => {
    try {
      if (restNotifIdRef.current) await Notifications.cancelScheduledNotificationAsync(restNotifIdRef.current);
      restNotifIdRef.current = await Notifications.scheduleNotificationAsync({
        content: { title: 'Rest complete', body: `Time for your next set${label ? ` of ${label}` : ''}.`, sound: true },
        trigger: { seconds: Math.max(1, Math.round(seconds)) } as any,
      });
    } catch {}
  };
  const startRest = (seconds: number, label: string) => {
    clearRest();
    restBuzzedRef.current = false;
    restEndRef.current = Date.now() + seconds * 1000;
    setRestTimer({ secondsLeft: seconds, overtime: 0, label });
    scheduleRestNotif(seconds, label);
    restIntervalRef.current = setInterval(() => {
      const secs = Math.round((restEndRef.current - Date.now()) / 1000);
      if (secs > 0) {
        setRestTimer(prev => (prev ? { ...prev, secondsLeft: secs, overtime: 0 } : prev));
      } else {
        // Crossed zero: buzz once + cancel the now-redundant notification (foreground). Then keep
        // counting UP in overtime so the user sees how long they have actually rested.
        if (!restBuzzedRef.current) {
          restBuzzedRef.current = true;
          // Triple buzz so it is felt with the phone down / in a pocket.
          triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
          setTimeout(() => triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy), 140);
          setTimeout(() => triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy), 280);
          if (restNotifIdRef.current) { Notifications.cancelScheduledNotificationAsync(restNotifIdRef.current).catch(() => {}); restNotifIdRef.current = null; }
        }
        setRestTimer(prev => (prev ? { ...prev, secondsLeft: 0, overtime: -secs } : prev));
      }
    }, 500);
  };
  const skipRest = () => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); clearRest(); setRestTimer(null); };
  const adjustRest = (delta: number) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    restEndRef.current = Math.max(Date.now() + 1000, restEndRef.current + delta * 1000);
    const left = Math.max(1, Math.round((restEndRef.current - Date.now()) / 1000));
    restBuzzedRef.current = false; // re-arm the buzz since we are back to counting down
    setRestTimer(prev => (prev ? { ...prev, secondsLeft: left, overtime: 0 } : prev));
    scheduleRestNotif(left, restTimer?.label ?? '');
  };
  // Clean up the interval if the screen unmounts mid-rest (the scheduled notification still fires).
  useEffect(() => () => { if (restIntervalRef.current) clearInterval(restIntervalRef.current); }, []);

  // A set was checked -> start the rest timer. For a superset, only rest after the LAST exercise of
  // the group (you alternate between members, so the rest belongs after a full round).
  const handleSetChecked = (ex: any) => {
    if (ex.supersetGroup) {
      const members = exercises.filter((e: any) => e.supersetGroup === ex.supersetGroup);
      if (members.length && members[members.length - 1].id !== ex.id) return;
    }
    // Always read the exercise's CURRENT rest (not the value frozen onto the set when it was
    // created); default to 90s when none is set so a timer always shows.
    const rest = parseRestSeconds(ex.rest) || 90;
    startRest(rest, ex.name);
  };

  // ── View Summary recap (volume / sets / per-lift breakdown) ──
  // PRs are NOT computed here anymore: they bank + roll back live as each set changes (see the PR
  // engine in utils/liftPR.ts). This just builds the recap and reads the recorded day-hits for the trophy.
  const finishWorkout = async () => {
    const dayLogs = setLogs[activeDay] || {};
    let totalVolume = 0, volumeLb = 0, volumeKg = 0, doneSets = 0, doneExercises = 0;
    // Per-lift breakdown so the recap lists each lift's sets (mirrors the per-cardio HR breakdown).
    const liftItems: { name: string; volume: number; sets: { weight: number; reps: number }[]; unit?: 'lb' | 'kg' }[] = [];
    for (const ex of exercises) {
      if (ex.isCardio) continue;
      const sets = dayLogs[ex.id];
      if (!sets) continue;
      const done = sets.filter(s => s.done);
      if (!done.length) continue;
      doneExercises++;
      doneSets += done.length;
      let exVolume = 0;
      const itemSets: { weight: number; reps: number }[] = [];
      for (const s of done) { exVolume += (s.weight || 0) * (s.reps || 0); itemSets.push({ weight: s.weight || 0, reps: s.reps || 0 }); }
      totalVolume += exVolume;
      // Volume can't sum across units, so accumulate per unit (kg lifts into volumeKg, everything else lb).
      if (ex.weightUnit === 'kg') volumeKg += exVolume; else volumeLb += exVolume;
      liftItems.push({ name: ex.name || 'Lift', volume: exVolume, sets: itemSets, unit: ex.weightUnit || 'lb' });
    }
    // Lift session duration. Priority: Apple Watch strength session (measured, ground truth) > manual
    // workout timer (no-watch users) > nothing. The old first-to-last checked-set span is RETIRED: it
    // counted idle gaps between morning/evening sets as "duration" and could balloon to hours.
    const hmsToSecLift = (str: any) => {
      const p = String(str || '').split(':').map((x: string) => parseInt(x) || 0);
      if (p.length === 3) return p[0] * 3600 + p[1] * 60 + p[2];
      if (p.length === 2) return p[0] * 60 + p[1];
      return p[0] || 0;
    };
    const appleLiftDurSec = appleSessions.reduce((s: number, a: any) => s + hmsToSecLift(a.duration), 0);
    const manualLiftDurSec = getTimerElapsedSec(activeDay);
    const liftDurationSec = appleLiftDurSec > 0 ? appleLiftDurSec : (manualLiftDurSec > 0 ? manualLiftDurSec : null);
    // Apple strength session envelope on the LIFTING side of the recap: calories summed across the day's
    // strength workouts + pooled avg/max HR (same source as the banner). null on manual-only days.
    const liftCalories = appleSessions.length > 0
      ? appleSessions.reduce((s: number, a: any) => s + (parseInt(a.calories || '0') || 0), 0)
      : null;
    const liftAvgHr = appleSessions.length > 0 ? sessionHR.avgHr : null;
    const liftMaxHr = appleSessions.length > 0 ? sessionHR.maxHr : null;

    // Cardio recap: aggregate the day's COMPLETED cardio (also lets a cardio-only day finish).
    const dayChecks2 = checks[activeDay] || {};
    let cardioCount = 0, cardioDistance = 0, cardioDurationSec = 0, cardioCalories = 0, maxHrVal = 0;
    const hrAvgs: number[] = [];
    // Per-cardio breakdown so multi-session days show each walk/run's OWN heart rate instead of one
    // blended average across unlike efforts (easy dog walk vs hard treadmill). Totals still sum.
    const cardioItems: { name: string; durationSec: number; distanceMi: number; calories: number; avgHr: number | null; maxHr: number | null }[] = [];
    for (const ex of exercises as any[]) {
      if (!ex.isCardio || !dayChecks2[ex.id]) continue;
      cardioCount++;
      const dist = parseFloat(ex.distance ?? ''); const distVal = !isNaN(dist) ? dist : 0; cardioDistance += distVal;
      const itemDurSec = parseCardioDurationSec(ex); cardioDurationSec += itemDurSec;
      const cal = parseFloat(ex.calories ?? ''); const calVal = !isNaN(cal) ? cal : 0; cardioCalories += calVal;
      // Heart rate: prefer real HealthKit samples for Apple-synced cardio (same source HR Zones uses);
      // fall back to a manually-typed HR only when there are no samples. avg = mean, max = peak sample.
      // Captured per session (itemAvgHr/itemMaxHr) AND pooled into hrAvgs/maxHrVal for single-session days.
      let itemAvgHr: number | null = null, itemMaxHr: number | null = null;
      let gotSamples = false;
      if (ex.fromAppleHealth && ex.appleHealthUUID) {
        try {
          const approxMs = ex.appleStartDate ? new Date(ex.appleStartDate).getTime() : Date.now();
          const res = await fetchWorkoutHRByUUID(ex.appleHealthUUID, approxMs);
          if (res?.found && res.samples?.length) {
            const vals = res.samples.map((s: any) => s.v).filter((v: any) => typeof v === 'number' && v > 0);
            if (vals.length) {
              itemAvgHr = Math.round(vals.reduce((a: number, b: number) => a + b, 0) / vals.length);
              itemMaxHr = Math.round(vals.reduce((m: number, v: number) => (v > m ? v : m), 0));
              hrAvgs.push(vals.reduce((a: number, b: number) => a + b, 0) / vals.length);
              for (const v of vals) if (v > maxHrVal) maxHrVal = v;
              gotSamples = true;
            }
          }
        } catch {}
      }
      if (!gotSamples) {
        const hr = parseFloat(ex.hr ?? '');
        if (!isNaN(hr) && hr > 0) { itemAvgHr = Math.round(hr); itemMaxHr = Math.round(hr); hrAvgs.push(hr); if (hr > maxHrVal) maxHrVal = hr; }
      }
      cardioItems.push({ name: ex.name || 'Cardio', durationSec: itemDurSec, distanceMi: distVal, calories: Math.round(calVal), avgHr: itemAvgHr, maxHr: itemMaxHr });
    }
    const avgHr = hrAvgs.length ? Math.round(hrAvgs.reduce((a, b) => a + b, 0) / hrAvgs.length) : null;
    const maxHr = maxHrVal > 0 ? Math.round(maxHrVal) : null;

    if (doneSets === 0 && cardioCount === 0) { showToast('Nothing logged yet', 'Check off a set or finish some cardio first', 'error'); return; }
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    let mindful = false;
    try { const sr = await AsyncStorage.getItem('pj_settings'); mindful = sr ? JSON.parse(sr).styleMode === 'mindful' : false; } catch {}
    // Cardio PRs: per-drawer records (distance + duration) from the full Apple-synced history vs prior
    // best. Query is read-only, cached, and only runs on this deliberate Finish tap. Never blocks the
    // recap if HealthKit is slow/denied -- an empty result just means no cardio PR lines.
    let cardioPrHits: CardioPRHit[] = [];
    try {
      const [syncedAll, syncedLabels] = await Promise.all([fetchSyncedWorkouts(365), loadSyncedLabels()]);
      cardioPrHits = detectCardioPRs(syncedAll, activeDay, syncedLabels);
    } catch {}
    const summary = {
      // PRs bank + roll back live as each set changes (see the PR engine), so the recap just reads the
      // RECORDED day-hits rather than re-detecting (which would double-count or resurrect a revoked PR).
      totalVolume, volumeLb, volumeKg, doneSets, doneExercises, prHits: Object.values(prHitsByDay[activeDay] || {}), cardioPrHits, mindful,
      hasLifts: doneSets > 0,
      liftDurationSec,
      liftCalories, liftAvgHr, liftMaxHr, liftItems,
      cardio: cardioCount > 0
        ? { count: cardioCount, distanceMi: cardioDistance, durationSec: cardioDurationSec, calories: Math.round(cardioCalories), avgHr, maxHr, items: cardioItems }
        : null,
      totalCalories: Math.round(cardioCalories),
    };
    // Snapshot the recap for this day so the button becomes "View Summary" and re-opens THIS result
    // (PRs included) without recomputing. Cleared by clearFinished() the moment the day is edited.
    setFinishedSummaries(prev => ({ ...prev, [activeDay]: summary }));
    openFinishSummary(summary);
    // No big celebration overlay for PRs -- new lifters PR almost every session, so the recap's
    // trophy section is the recognition. (A bigger celebration is reserved for lifting GOALS later.)
  };

  // Most recent PRIOR session's logged sets for the same lift (matched by normalized name), so
  // each set row can show last time's weight x reps. Resolves each past day's exercise list from
  // its program override or the weekly template to map the logged exerciseId back to a name.
  // (normalizeLiftName is imported from utils/liftPR so lift-name keys stay identical everywhere.)
  const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayNameOf = (dateKey: string) => WEEKDAY_SHORT[new Date(dateKey + 'T12:00:00').getDay()];
  const getPreviousSets = (ex: any): SetEntry[] | null => {
    const target = normalizeLiftName(ex.name);
    if (!target) return null;
    const dates = Object.keys(setLogs).filter(d => d < activeDay).sort().reverse();
    for (const d of dates) {
      const dayLogs = setLogs[d];
      if (!dayLogs) continue;
      const prog = programs[d] || weeklyTemplate[dayNameOf(d)];
      const exList: any[] = prog?.exercises || [];
      for (const pastEx of exList) {
        if (normalizeLiftName(pastEx.name) === target) {
          const logged = dayLogs[pastEx.id];
          if (logged && logged.some(s => s.weight != null || s.reps != null || s.done)) return logged;
        }
      }
    }
    return null;
  };

  // Tap-to-reorder (replaces drag, which can't work while the list's own scroll is disabled).
  // Swaps an exercise with its neighbor in the active day's program and saves.
  const moveExercise = (exId: string, dir: -1 | 1) => {
    const baseProgram = programs[activeDay] || weeklyTemplate[activeDayName];
    const full = [...(baseProgram?.exercises || [])];
    const target = full.find((e: any) => e.id === exId);
    if (!target) return;
    // With an Apple strength container present, reorder within same-type lanes (lifts among lifts,
    // cardio among cardio) so a lift can't be knocked out of the session. With NO container on the
    // day, reorder is fully free: any card moves past any card.
    const hasContainer = full.some(isAppleSession);
    const isPeer = hasContainer
      ? (e: any) => !isAppleSession(e) && (!!e.isCardio === !!target.isCardio)
      : (e: any) => !isAppleSession(e);
    const peers = full.filter(isPeer);
    const idx = peers.findIndex((e: any) => e.id === exId);
    const newIdx = idx + dir;
    if (idx < 0 || newIdx < 0 || newIdx >= peers.length) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    [peers[idx], peers[newIdx]] = [peers[newIdx], peers[idx]];
    let pi = 0;
    const list = full.map((e: any) => (isPeer(e) ? peers[pi++] : e));
    const newPrograms = { ...programs, [activeDay]: { ...baseProgram, exercises: list } };
    setPrograms(newPrograms);
    saveState(checks, cardioComplete, newPrograms, workoutNotes, cardioLogs, weeklyTemplate);
  };

  // Supersets: link an exercise with the one directly below it into a shared group (reuses an
  // adjacent group id so you can chain 3+). Unlink clears the group id off every member.
  const writeExerciseList = (list: any[]) => {
    const baseProgram = programs[activeDay] || weeklyTemplate[activeDayName];
    const newPrograms = { ...programs, [activeDay]: { ...baseProgram, exercises: list } };
    setPrograms(newPrograms);
    saveState(checks, cardioComplete, newPrograms, workoutNotes, cardioLogs, weeklyTemplate);
  };
  const linkSuperset = (exId: string) => {
    const baseProgram = programs[activeDay] || weeklyTemplate[activeDayName];
    const list = [...(baseProgram?.exercises || [])];
    const i = list.findIndex((e: any) => e.id === exId);
    if (i < 0 || i >= list.length - 1) return;
    const a = list[i], b = list[i + 1];
    if (a.isCardio || b.isCardio) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    const groupId = a.supersetGroup || b.supersetGroup || makeId();
    list[i] = { ...a, supersetGroup: groupId };
    list[i + 1] = { ...b, supersetGroup: groupId };
    writeExerciseList(list);
  };
  const unlinkSuperset = (groupId: string) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    const baseProgram = programs[activeDay] || weeklyTemplate[activeDayName];
    const list = (baseProgram?.exercises || []).map((e: any) => e.supersetGroup === groupId ? { ...e, supersetGroup: undefined } : e);
    writeExerciseList(list);
  };

  const toggleExercise = (id: string) => {
  triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
  clearFinished();
  const dayChecks = checks[activeDay] || {};
  const nowChecked = !dayChecks[id];
  const newDayChecks = { ...dayChecks, [id]: nowChecked };
  const newChecks = { ...checks, [activeDay]: newDayChecks };
  setChecks(newChecks);
  // Stamp / clear the cardio completion time (lifts derive theirs from set doneAt instead).
  const dayTimes = { ...(exerciseDoneAt[activeDay] || {}) };
  if (nowChecked) dayTimes[id] = Date.now(); else delete dayTimes[id];
  const newExerciseDoneAt = { ...exerciseDoneAt, [activeDay]: dayTimes };
  setExerciseDoneAt(newExerciseDoneAt);
  saveState(newChecks, cardioComplete, programs, workoutNotes, cardioLogs, weeklyTemplate, activeProgramName, workoutNoteNames, setLogs, prs, newExerciseDoneAt);
  if (nowChecked && activeDay === todayKey) cancelActivityNotification();
};

  const toggleCardio = (day: string) => {
    const newCardio = { ...cardioComplete, [day]: !cardioComplete[day] };
    setCardioComplete(newCardio);
    saveState(checks, newCardio);
    if (newCardio[day] && day === todayKey) cancelActivityNotification();
  };

  const openAddModal = (day: string) => openAddExerciseModal(day, null);

  const openEditModal = (day: string, exercise: Exercise) => openAddExerciseModal(day, exercise);

  const saveExercise = () => {
  if (!form.name.trim()) return;
  triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
  clearFinished(modalDay);
  const baseProgram = programs[modalDay] || weeklyTemplate[DATES.find(d => d.key === modalDay)?.dayName || 'Mon'] || BLANK_DAY;
  const newPrograms = { ...programs };
  if (editingExercise) {
    newPrograms[modalDay] = {
      ...baseProgram,
      exercises: baseProgram.exercises.map(ex =>
        ex.id === editingExercise.id ? { ...ex, ...form } : ex
      ),
    };
  } else {
    const newEx: Exercise = { id: makeId(), ...form };
    const wasRest = baseProgram.type === 'rest';
    newPrograms[modalDay] = {
      ...baseProgram,
      ...(wasRest ? { type: 'unassigned', focus: '', tags: (baseProgram.tags || []).filter(t => t !== 'tag_rest') } : {}),
      exercises: [...(baseProgram.exercises || []), newEx],
    };
    if (wasRest) {
      showToast('Rest day removed', 'Go get it.', 'success');
    } else {
      showToast('Exercise added', form.name, 'success');
    }
  }
  // Fix A: reflect the edited target sets/reps onto the per-set rows. Reconcile UNLOGGED rows only so
  // real logged data is never lost: pre-fill the target reps on blank rows and grow/shrink the blank-row
  // count toward the new sets target. Rows that are checked or carry a weight are preserved untouched.
  let newSetLogs = setLogs;
  let newChecks = checks;
  if (editingExercise && !form.isCardio) {
    const exId = editingExercise.id;
    const stored = setLogs[modalDay]?.[exId];
    if (stored && stored.length) {
      const targetN = Math.max(1, Math.min(10, parseInt(form.sets) || stored.length));
      const targetReps = parseInt(form.reps) || null;
      const targetRest = parseInt(form.rest) || null;
      const isLogged = (s: SetEntry) => s.done || s.weight != null;
      let rows: SetEntry[] = stored.map(s => isLogged(s) ? s : { ...s, reps: targetReps, rest: targetRest });
      while (rows.length > targetN && !isLogged(rows[rows.length - 1])) rows = rows.slice(0, -1);
      while (rows.length < targetN) rows.push({ weight: null, reps: targetReps, rest: targetRest, done: false });
      newSetLogs = { ...setLogs, [modalDay]: { ...(setLogs[modalDay] || {}), [exId]: rows } };
      const allDone = rows.length > 0 && rows.every(s => s.done);
      const dayChecksNow = checks[modalDay] || {};
      if (!!dayChecksNow[exId] !== allDone) newChecks = { ...checks, [modalDay]: { ...dayChecksNow, [exId]: allDone } };
    }
    setSetRowsVersion(v => ({ ...v, [exId]: (v[exId] || 0) + 1 })); // re-mount rows so they re-seed
  }
  if (newSetLogs !== setLogs) setSetLogs(newSetLogs);
  if (newChecks !== checks) setChecks(newChecks);
  setPrograms(newPrograms);
  setDayLabel(newPrograms[activeDay]?.customLabel || '');
  // Editing a lift can change its weight unit (or set targets), which changes how its logged sets compare,
  // so recompute that lift's PR now -- keeps the record + displayed unit honest, same as the inline picker.
  let nextPrs = prs, nextHits = prHitsByDay;
  if (editingExercise && !form.isCardio) {
    const r = recomputeLiftPR(form.name, newSetLogs, makeDayResolver(newPrograms), prs, prHitsByDay, modalDay, Date.now());
    nextPrs = r.prs; nextHits = r.hits;
    setPrs(nextPrs); setPrHitsByDay(nextHits);
    if (modalDay === todayKey) {
      if (r.hit) firePRNotification(r.hit);
      else if (r.revoked) clearNotification(`pr_${modalDay}_${normalizeLiftName(form.name)}`);
    }
  }
  saveState(newChecks, cardioComplete, newPrograms, workoutNotes, cardioLogs, weeklyTemplate, activeProgramName, workoutNoteNames, newSetLogs, nextPrs, exerciseDoneAt, workoutTimers, nextHits);
  closeAddExerciseModal();
  if (editingExercise) showToast('Exercise updated', form.name, 'success');
  checkWorkoutAchievements(true).then(unlocked => {
    for (const def of unlocked) {
      showCelebration(getCelebTier(def), def.name, def);
      showAchievementToast(def);
    }
  });
};

  const removeExercise = (day: string, id: string) => {
  Alert.alert('Remove Exercise', 'Are you sure?', [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Remove', style: 'destructive',
      onPress: () => {
        triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
        clearFinished(day);
        const baseProgram = programs[day] || weeklyTemplate[DATES.find(d => d.key === day)?.dayName || 'Mon'] || BLANK_DAY;
        const removed = baseProgram.exercises.find(ex => ex.id === id);
        const newPrograms = { ...programs };
        newPrograms[day] = {
          ...baseProgram,
          exercises: baseProgram.exercises.filter(ex => ex.id !== id),
        };
        const newDayChecks = { ...(checks[day] || {}) };
        delete newDayChecks[id];
        const newChecks = { ...checks, [day]: newDayChecks };
        // Removing a lift unmaps its logged sets from this day, so recompute the lift's PR from what's
        // left in history and roll it back if this exercise was holding the record (Otto only for today).
        let nextPrs = prs, nextHits = prHitsByDay;
        if (removed && !(removed as any).isCardio) {
          const r = recomputeLiftPR(removed.name, setLogs, makeDayResolver(newPrograms), prs, prHitsByDay, day, Date.now());
          nextPrs = r.prs; nextHits = r.hits;
          setPrs(nextPrs);
          setPrHitsByDay(nextHits);
          if (day === todayKey) {
            if (r.hit) firePRNotification(r.hit);
            else if (r.revoked) clearNotification(`pr_${day}_${normalizeLiftName(removed.name)}`);
          }
        }
        setPrograms(newPrograms);
        setChecks(newChecks);
        saveState(newChecks, cardioComplete, newPrograms, workoutNotes, cardioLogs, weeklyTemplate, activeProgramName, workoutNoteNames, setLogs, nextPrs, exerciseDoneAt, workoutTimers, nextHits);
      }
    }
  ]);
};

  const saveNote = async () => {
    Keyboard.dismiss();
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    const noteText = workoutNotes[activeDay]?.trim() || '';
    const noteName = workoutNoteNames[activeDay]?.trim() || 'Workout Note';
    const isClearing = !noteText;
    const updatedNotes = { ...workoutNotes, [activeDay]: noteText };
    setWorkoutNotes(updatedNotes);
    saveState(checks, cardioComplete, programs, updatedNotes);
    setSavedNoteText(prev => ({ ...prev, [activeDay]: noteText }));
    try {
      const raw = await AsyncStorage.getItem('pj_bible_reflections');
      const entries: any[] = raw ? JSON.parse(raw) : [];
      const existing = entries.findIndex(e => e.category === 'fitness' && e.date === activeDay);
      if (isClearing) {
        if (existing >= 0) entries.splice(existing, 1);
      } else {
        if (existing >= 0) {
          entries[existing] = { ...entries[existing], title: noteName, notes: noteText };
        } else {
          entries.unshift({ id: makeId(), date: activeDay, category: 'fitness', title: noteName, notes: noteText });
        }
      }
      await storageSet('pj_bible_reflections', JSON.stringify(entries));
    } catch {}
    showToast(isClearing ? 'Note cleared' : 'Note saved to journal', undefined, 'success');
  };

  const saveTags = async (newTags: WorkoutTag[]) => {
    setTags(newTags);
    try {
      const s = await AsyncStorage.getItem('pj_settings');
      const current = s ? JSON.parse(s) : {};
      await storageSet('pj_settings', JSON.stringify({ ...current, workoutTags: newTags }));
    } catch (e) { console.log('Tag save error', e); }
  };

  const toggleDayTag = (tagId: string) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    const baseProgram = programs[activeDay] || weeklyTemplate[activeDayName] || { type: 'unassigned' as const, focus: 'Unassigned', exercises: [] };
    const currentTags = baseProgram.tags || [];
    if (!currentTags.includes(tagId) && currentTags.length >= 6) {
      showToast('Tag limit reached', 'Max 6 tags per day', 'info');
      return;
    }
    const removing = currentTags.includes(tagId);
    const newTags = removing ? currentTags.filter(t => t !== tagId) : [...currentTags, tagId];
    const typeOverride = tagId === 'tag_rest'
      ? { type: removing ? 'unassigned' as const : 'rest' as const, focus: removing ? '' : 'Rest' }
      : {};
    const newPrograms = {
      ...programs,
      [activeDay]: { ...baseProgram, tags: newTags, ...typeOverride },
    };
    setPrograms(newPrograms);
    saveState(checks, cardioComplete, newPrograms, workoutNotes, cardioLogs, weeklyTemplate);
  };

  const getDayTagObjects = (dayKey: string): WorkoutTag[] => {
    const p = programs[dayKey] || weeklyTemplate[DATES.find(d => d.key === dayKey)?.dayName || 'Mon'];
    if (!p?.tags?.length) return [];
    return p.tags.map(id => tags.find(t => t.id === id)).filter(Boolean) as WorkoutTag[];
  };

  const openFabMenu = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    fabItem1Anim.setValue(0);
    fabItem2Anim.setValue(0);
    setShowFabMenu(true);
    Animated.stagger(70, [
      Animated.spring(fabItem1Anim, { toValue: 1, useNativeDriver: true, friction: 7, tension: 120 }),
      Animated.spring(fabItem2Anim, { toValue: 1, useNativeDriver: true, friction: 7, tension: 120 }),
    ]).start();
  };

  const closeFabMenu = () => {
    Animated.parallel([
      Animated.timing(fabItem1Anim, { toValue: 0, duration: 130, useNativeDriver: true }),
      Animated.timing(fabItem2Anim, { toValue: 0, duration: 130, useNativeDriver: true }),
    ]).start(() => setShowFabMenu(false));
  };

  const toggleFabMenu = () => { if (showFabMenu) closeFabMenu(); else openFabMenu(); };

  const getWeekDaysForPicker = (weekOffset: number = 0) => {
    const today = new Date();
    const dow = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1) + weekOffset * 7);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const name = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i];
      return { key, name, label: `${d.getMonth() + 1}/${d.getDate()}` };
    });
  };

  // Editing a finished day's workout invalidates its recap -> drop the snapshot so the button flips
  // back to "Finish Workout" and never re-opens stale numbers.
  const clearFinished = (day: string = activeDay) => {
    setFinishedSummaries(prev => {
      if (!prev[day]) return prev;
      const next = { ...prev };
      delete next[day];
      return next;
    });
  };

  const openLoadRoutineModal = async () => {
    closeFabMenu();
    try {
      const raw = await AsyncStorage.getItem('pj_routines');
      setRoutines(raw ? JSON.parse(raw) : []);
    } catch {}
    setSelectedRoutine(null);
    setSelectedLoadDays([activeDay]);
    setLoadPickerWeekOffset(0);
    loadRoutineOverlay.value = 0;
    loadRoutineCardScale.value = 0.92;
    setShowLoadRoutineModal(true);
    loadRoutineOverlay.value = withTiming(1, { duration: 180 });
    loadRoutineCardScale.value = withSpring(1, { damping: 24, stiffness: 320, overshootClamping: true });
  };

  const closeLoadRoutineModal = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    const done = () => { setShowLoadRoutineModal(false); setSelectedRoutine(null); };
    loadRoutineOverlay.value = withTiming(0, { duration: 140 });
    loadRoutineCardScale.value = withTiming(0.92, { duration: 140 }, (finished) => {
      if (finished) runOnJS(done)();
    });
  };

  const openInfoModal = (exName: string) => {
    const found = exerciseLibrary.find((e: any) => e.name === exName);
    if (!found || (!found.instructions?.length && !found.primaryMuscles?.length)) return;
    setInfoExercise(found);
    infoOverlay.value = 0;
    infoCardScale.value = 0.92;
    infoCardOpacity.value = 1;
    setShowInfoModal(true);
    infoOverlay.value = withTiming(1, { duration: 180 });
    infoCardScale.value = withSpring(1, { damping: 24, stiffness: 320, overshootClamping: true });
  };

  const closeInfoModal = () => {
    const done = () => { setShowInfoModal(false); setInfoExercise(null); };
    infoOverlay.value = withTiming(0, { duration: 160 });
    infoCardScale.value = withTiming(0.88, { duration: 160 });
    infoCardOpacity.value = withTiming(0, { duration: 160 }, (finished) => {
      if (finished) runOnJS(done)();
    });
  };

  const openFinishSummary = (summary: NonNullable<typeof finishSummary>) => {
    finishOverlay.value = 0;
    finishCardScale.value = 0.92;
    finishCardOpacity.value = 1;
    setFinishSummary(summary);
    finishOverlay.value = withTiming(1, { duration: 180 });
    finishCardScale.value = withSpring(1, { damping: 24, stiffness: 320, overshootClamping: true });
  };
  const closeFinishSummary = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    finishOverlay.value = withTiming(0, { duration: 160 });
    finishCardScale.value = withTiming(0.88, { duration: 160 });
    finishCardOpacity.value = withTiming(0, { duration: 160 }, (finished) => {
      if (finished) runOnJS(setFinishSummary)(null);
    });
  };

  // Finish-recap stats as boxed inset tiles, 2 per row, centered content. One accent element per
  // tile (the value); icon + label stay muted so it reads structured, not "all accent." An odd last
  // tile keeps the same half-width and centers in its row instead of stretching full-width.
  const renderTiles = (stats: { icon: any; value: string; label: string }[], accentColor: string = theme.accentBlue) => {
    const rows: { icon: any; value: string; label: string }[][] = [];
    for (let i = 0; i < stats.length; i += 2) rows.push(stats.slice(i, i + 2));
    return (
      <View style={{ gap: 8 }}>
        {rows.map((row, ri) => (
          <View key={ri} style={{ flexDirection: 'row', gap: 8, justifyContent: 'center' }}>
            {row.map((s, i) => (
              <View key={i} style={{ flexBasis: '47%', maxWidth: '47%', flexGrow: row.length === 2 ? 1 : 0, alignItems: 'center', backgroundColor: theme.bgInset, borderWidth: 0.5, borderColor: theme.borderCard, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 10,
                shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3 }}>
                <Ionicons name={s.icon} size={14} color={accentColor} style={{ marginBottom: 3 }} />
                <Text style={{ fontSize: 23, fontFamily: 'BebasNeue_400Regular', letterSpacing: 0.5, color: theme.textSecondary }}>{s.value}</Text>
                <Text style={{ fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: 'DMSans_700Bold', color: theme.textMuted, marginTop: 1 }}>{s.label}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    );
  };

  // Sets summary for a recap lift row: "50 × 10  ·  50 × 10", "10 reps" for bodyweight-with-reps,
  // and "3 sets" when a lift was checked off with no weight/reps entered.
  const formatLiftSets = (sets: { weight: number; reps: number }[], unit?: 'lb' | 'kg'): string => {
    const u = weightUnitLabel(unit);
    const parts = sets.map(s => {
      if (s.weight > 0 && s.reps > 0) return `${s.weight} ${u} × ${s.reps}`;
      if (s.reps > 0) return `${s.reps} reps`;
      return null;
    }).filter(Boolean) as string[];
    if (parts.length) return parts.join('   ·   ');
    return `${sets.length} set${sets.length !== 1 ? 's' : ''}`;
  };

  // Manual workout timer pill. Shown only on days WITHOUT an Apple strength banner (Apple wins).
  const renderWorkoutTimerPill = (day: string) => {
    const running = isTimerRunning(day);
    const elapsed = getTimerElapsedSec(day);
    const hasTime = elapsed > 0;
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.bgCard, borderWidth: 0.5, borderColor: running ? theme.accentBlueBorder : theme.borderCard, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 12,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 2 }}>
        <TouchableOpacity onPress={() => openDurationEdit(day)} activeOpacity={hasTime && !running ? 0.6 : 1} disabled={!hasTime || running} style={{ flexDirection: 'row', alignItems: 'center', gap: 9, flex: 1 }} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
          <Ionicons name={running ? 'stopwatch' : 'stopwatch-outline'} size={18} color={running ? theme.accentBlue : theme.textMuted} />
          <View>
            <Text style={{ fontSize: 9, letterSpacing: 2, color: theme.textMuted, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase' }}>
              {running ? 'Workout Running' : hasTime ? 'Workout Time' : 'Workout Timer'}
            </Text>
            <Text style={{ fontSize: 18, fontFamily: 'BebasNeue_400Regular', letterSpacing: 0.5, color: running ? theme.accentBlueRaw : hasTime ? theme.textSecondary : theme.textMuted, marginTop: 1 }}>
              {hasTime || running ? formatDuration(elapsed) : 'Not started'}
            </Text>
          </View>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {hasTime && !running && (
            <TouchableOpacity onPress={() => openDurationEdit(day)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ padding: 4 }}>
              <Ionicons name="create-outline" size={17} color={theme.textMuted} />
            </TouchableOpacity>
          )}
          {running ? (
            <TouchableOpacity onPress={() => stopWorkoutTimer(day)} activeOpacity={0.8} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: theme.accentRed + '22', borderWidth: 1, borderColor: theme.accentRed + '55', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <Ionicons name="stop" size={13} color={theme.accentRed} />
              <Text style={{ fontSize: 12, fontFamily: 'DMSans_700Bold', color: theme.accentRed }}>Stop</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => startWorkoutTimer(day)} activeOpacity={0.8} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <Ionicons name="play" size={13} color={theme.accentBlue} />
              <Text style={{ fontSize: 12, fontFamily: 'DMSans_700Bold', color: theme.accentBlue }}>{hasTime ? 'Resume' : 'Start'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const handleLoadRoutine = async () => {
    if (!selectedRoutine || selectedLoadDays.length === 0) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const raw = await AsyncStorage.getItem('pj_workout_state');
      const state = raw ? JSON.parse(raw) : {};
      const newPrograms = { ...(state.programs || {}) };
      const routine = selectedRoutine;
      const hasCardioTag = routine.tags.includes('tag_cardio');
      const hasLiftTag = routine.tags.some(id => id !== 'tag_cardio' && id !== 'tag_rest');
      const type = hasLiftTag ? 'lift' : hasCardioTag ? 'cardio' : 'lift';
      for (const dayKey of selectedLoadDays) {
        newPrograms[dayKey] = {
          ...(newPrograms[dayKey] || {}),
          type,
          focus: routine.name,
          tags: routine.tags,
          exercises: routine.exercises.map(ex => ({ ...ex, id: makeId() })),
        };
      }
      await storageSet('pj_workout_state', JSON.stringify({ ...state, programs: newPrograms }));
      setPrograms(newPrograms);
      const dayNames = selectedLoadDays.map(dk => {
        const found = DATES.find(d => d.key === dk);
        return found ? found.dayName : dk;
      }).join(', ');
      showToast(`${routine.name} loaded`, dayNames, 'success');
      closeLoadRoutineModal();
    } catch (e) { console.log('Load routine error', e); }
  };

  // Time-of-day stamp for a finished exercise. Lifts read the newest set's doneAt (when you finished
  // the lift); cardio reads its own exerciseDoneAt map. Pre-existing logs have no stamp -> no line.
  const formatLoggedAt = (ms?: number | null) =>
    ms ? `Logged ${new Date(ms).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` : null;
  // Apple-synced cardio auto-checks on import, so it never gets a manual exerciseDoneAt stamp.
  // Fall back to the real HealthKit workout start time (when the workout actually happened).
  const appleStartMs = (e: any): number | null => {
    const v = e?.appleStartDate;
    if (v == null) return null;
    const t = new Date(v).getTime();
    return Number.isFinite(t) ? t : null;
  };
  const liftLoggedAt = (exId: string): number | null => {
    const s = setLogs[activeDay]?.[exId];
    if (!s || !s.length) return null;
    const times = s.filter(x => x.done && x.doneAt != null).map(x => x.doneAt as number);
    return times.length ? Math.max(...times) : null;
  };

  // One exercise card. `inGroup` renders it borderless inside a superset container (the group
  // provides the border/rail); standalone it gets its own card chrome.
  const renderExerciseCard = (ex: any, opts: { inGroup?: boolean; isLastInGroup?: boolean } = {}) => {
    const { inGroup = false, isLastInGroup = false } = opts;
    const isDone = dayChecks[ex.id];
    const loggedAt = ex.isCardio ? (exerciseDoneAt[activeDay]?.[ex.id] ?? appleStartMs(ex) ?? null) : (isDone ? liftLoggedAt(ex.id) : null);
    // Arrow enable/disable must match moveExercise: same-type lanes when an Apple strength container
    // is present (a lift can't be nudged out of the session), otherwise the full visible list.
    const peers = appleSessions.length > 0
      ? displayExercises.filter((e: any) => !!e.isCardio === !!ex.isCardio)
      : displayExercises;
    const idx = peers.findIndex((e: any) => e.id === ex.id);
    const isFirst = idx <= 0;
    const isLast = idx === peers.length - 1;
    return (
      <View
        key={ex.id}
        ref={ex.id === 'tutorial_demo_bench' ? firstExerciseRef : undefined}
        collapsable={false}
        style={inGroup
          ? [isDone && styles.exerciseDone, { paddingHorizontal: 14, paddingVertical: 12 }]
          : [styles.exerciseItem, isDone && styles.exerciseDone, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderLeftColor: isDone ? theme.accentBlue : theme.textDim }]
        }>
        <View style={styles.exerciseRow}>
          <View style={{ paddingRight: 10, justifyContent: 'center', gap: 1 }}>
            <TouchableOpacity onPress={() => moveExercise(ex.id, -1)} disabled={isFirst} hitSlop={{ top: 4, bottom: 2, left: 6, right: 6 }}>
              <Ionicons name="arrow-up" size={17} color={isFirst ? theme.textDim + '44' : theme.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => moveExercise(ex.id, 1)} disabled={isLast} hitSlop={{ top: 2, bottom: 4, left: 6, right: 6 }}>
              <Ionicons name="arrow-down" size={17} color={isLast ? theme.textDim + '44' : theme.textMuted} />
            </TouchableOpacity>
          </View>
          <View style={styles.exerciseInfo}>
            <TouchableOpacity style={styles.exerciseNameRow} activeOpacity={0.7}
              onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); openInfoModal(ex.name); }}>
              <Text style={[styles.exerciseName, { color: theme.textSecondary }, isDone && [styles.exerciseNameDone, { color: theme.textDim }]]}>{ex.name}</Text>
              {exerciseLibrary.find((e: any) => e.name === ex.name && (e.instructions?.length || e.primaryMuscles?.length)) ? (
                <Ionicons name="information-circle-outline" size={14} color={theme.textDim} style={{ marginLeft: -2 }} />
              ) : null}
            </TouchableOpacity>
            {ex.fromAppleHealth && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, marginBottom: 6 }}>
                <Ionicons name="heart" size={11} color={theme.accentGreen} />
                <Text style={[styles.badgeText, { color: theme.accentGreen }]}>APPLE HEALTH</Text>
              </View>
            )}
            {ex.isCardio ? (
              <View ref={ex.id === 'tutorial_demo_treadmill' ? firstCardioRef : undefined} collapsable={false}>
                <Text style={[styles.exerciseMeta, { color: theme.textMuted }]}>
                  {[
                    ex.duration ? (ex.fromAppleHealth ? ex.duration : `${ex.duration} min`) : null,
                    ex.distance ? `${parseFloat(ex.distance)} mi` : null,
                    ex.speed ? `${ex.speed} mph` : null,
                    ex.incline ? `${ex.incline}% incline` : null,
                    ex.hr ? `${ex.hr} bpm` : null,
                    ex.calories ? `${ex.calories} cal` : null,
                  ].filter(Boolean).join(' · ') || 'Cardio · tap edit to log stats'}
                </Text>
                {ex.fromAppleHealth && ex.appleHealthUUID && (
                  <TouchableOpacity
                    onPress={() => openHRZones(ex)}
                    activeOpacity={0.7}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginTop: 6, backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, gap: 4 }}>
                    <Ionicons name="pulse" size={12} color={theme.accentBlue} />
                    <Text style={{ fontSize: 11, fontFamily: 'DMSans_600SemiBold', color: theme.accentBlue }}>HR Zones</Text>
                    <Ionicons name="chevron-forward" size={11} color={theme.accentBlue} />
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View ref={ex.id === 'tutorial_demo_bench' ? firstSetsRepsRef : undefined} collapsable={false}>
                {(() => {
                  const restSec = parseRestSeconds(ex.rest);
                  return (ex.reps || restSec) ? (
                    <Text style={[styles.exerciseMeta, { color: theme.textMuted }]}>
                      {[ex.reps ? `${ex.reps} reps` : null, restSec ? `Rest ${formatRest(restSec)}` : null].filter(Boolean).join(' · ')}
                    </Text>
                  ) : null;
                })()}
                <ExerciseSetRows
                  key={`${activeDay}_${ex.id}_${setRowsVersion[ex.id] || 0}`}
                  initialSets={getSeededSets(ex)}
                  previousSets={getPreviousSets(ex)}
                  defaultRest={parseRestSeconds(ex.rest)}
                  onPersist={(sets) => saveSetsForExercise(ex.id, sets)}
                  onSetChecked={() => handleSetChecked(ex)}
                  unit={ex.weightUnit}
                  onUnitPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setUnitPickerExId(ex.id); }}
                  theme={theme}
                />
              </View>
            )}
            {ex.note ? <Text style={[styles.exerciseNote, { color: theme.textDim }]}>{ex.note}</Text> : null}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <TouchableOpacity
              style={{ padding: 10 }}
              onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); openEditModal(activeDay, ex); }}
              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}>
              <Ionicons name="pencil" size={15} color={theme.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity
              style={{ padding: 10 }}
              onPress={() => removeExercise(activeDay, ex.id)}
              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}>
              <Ionicons name="trash" size={15} color={theme.accentRed} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.checkCircle, { borderColor: theme.borderCard }, isDone && { backgroundColor: theme.accentBlue, borderColor: theme.accentBlue }]}
              onPress={() => ex.isCardio ? toggleExercise(ex.id) : bulkToggleLift(ex, !isDone)}>
              {isDone && <Text style={[styles.checkMark, { color: theme.bgPrimary }]}>✓</Text>}
            </TouchableOpacity>
          </View>
        </View>
        {loggedAt != null && (
          <Text style={{ alignSelf: 'flex-end', fontSize: 11, fontFamily: 'DMSans_500Medium', color: theme.textDim, marginTop: 2 }}>
            {formatLoggedAt(loggedAt)}
          </Text>
        )}
      </View>
    );
  };

  // Render a list of exercises into cards, grouping consecutive supersets and adding link connectors.
  // Reused for the lifts INSIDE the Apple session container and the cardio cards OUTSIDE it.
  const renderExerciseUnits = (list: any[]) => {
    const units: any[] = [];
    for (let i = 0; i < list.length;) {
      const g = list[i].supersetGroup;
      if (g) {
        const members = [list[i]];
        let j = i + 1;
        while (j < list.length && list[j].supersetGroup === g) { members.push(list[j]); j++; }
        if (members.length >= 2) { units.push({ type: 'group', groupId: g, members }); i = j; continue; }
      }
      units.push({ type: 'single', ex: list[i] });
      i++;
    }
    const out: any[] = [];
    units.forEach((unit, ui) => {
      if (unit.type === 'single') {
        out.push(renderExerciseCard(unit.ex));
      } else {
        const memberRows: any[] = [];
        unit.members.forEach((m: any, mi: number) => {
          memberRows.push(renderExerciseCard(m, { inGroup: true }));
          if (mi < unit.members.length - 1) {
            memberRows.push(
              <View key={`div_${m.id}`} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, marginVertical: 2 }}>
                <View style={{ flex: 1, height: 0.5, backgroundColor: theme.borderCard }} />
                <TouchableOpacity onPress={() => unlinkSuperset(unit.groupId)} style={{ flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 10, paddingVertical: 3 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close" size={11} color={theme.textMuted} />
                  <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: 'DMSans_700Bold', letterSpacing: 1 }}>UNLINK</Text>
                </TouchableOpacity>
                <View style={{ flex: 1, height: 0.5, backgroundColor: theme.borderCard }} />
              </View>
            );
          }
        });
        out.push(
          <View key={`g_${unit.groupId}`} style={[styles.exerciseItem, { backgroundColor: theme.bgCard, borderColor: theme.accentBlue + '55', borderLeftColor: theme.accentBlue, padding: 0, overflow: 'hidden' }]}>
            <View style={{ paddingHorizontal: 14, paddingTop: 10, paddingBottom: 0 }}>
              <Text style={{ fontSize: 9, letterSpacing: 2, color: theme.accentBlue, fontFamily: 'DMSans_700Bold' }}>SUPERSET</Text>
            </View>
            {memberRows}
          </View>
        );
      }
      // Link connector between this unit and the next (lift-to-lift only).
      const lastEx = unit.type === 'group' ? unit.members[unit.members.length - 1] : unit.ex;
      const nextUnit = units[ui + 1];
      const nextFirst = nextUnit ? (nextUnit.type === 'group' ? nextUnit.members[0] : nextUnit.ex) : null;
      if (nextFirst && !lastEx.isCardio && !nextFirst.isCardio) {
        out.push(
          <TouchableOpacity key={`link_${lastEx.id}`} onPress={() => linkSuperset(lastEx.id)}
            style={{ alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: -2, marginBottom: 8, paddingVertical: 4, paddingHorizontal: 12, borderRadius: 12, backgroundColor: theme.bgInset, borderWidth: 1, borderColor: theme.borderCard }}
            hitSlop={{ top: 6, bottom: 6, left: 8, right: 8 }}>
            <Ionicons name="link" size={12} color={theme.textMuted} />
            <Text style={{ fontSize: 10, color: theme.textMuted, fontFamily: 'DMSans_600SemiBold', letterSpacing: 0.5 }}>Superset</Text>
          </TouchableOpacity>
        );
      }
    });
    return out;
  };

  // Delete the day's Apple Watch strength session(s). Caveat: Apple-synced, so it can re-import on the
  // next Health sync (same as any Apple Health entry today) -- a permanent ignore-list is a follow-up.
  const deleteAppleSession = () => {
    Alert.alert('Remove Apple Watch Session', 'This removes the synced session for this day. It may return on the next Apple Health sync.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: () => {
          triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
          const baseProgram = programs[activeDay] || weeklyTemplate[activeDayName] || BLANK_DAY;
          const ids = new Set(appleSessions.map((s: any) => s.id));
          const newExercises = (baseProgram.exercises || []).filter((e: any) => !ids.has(e.id));
          const newPrograms = { ...programs, [activeDay]: { ...baseProgram, exercises: newExercises } };
          setPrograms(newPrograms);
          saveState(checks, cardioComplete, newPrograms, workoutNotes, cardioLogs, weeklyTemplate);
          showToast('Session removed', '', 'success');
        },
      },
    ]);
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <LinearGradient colors={[theme.gradientStart, theme.gradientEnd]} style={[styles.container, { paddingTop: insets.top }]}>
        <View style={[styles.header, { borderBottomColor: theme.borderCard }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
            <HeaderAvatar />
            <View style={{ flex: 1 }}>
              <Text style={[styles.headerTitle, { color: theme.accentBlueRaw }]}>Workout</Text>
              <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: 'DMSans_700Bold', marginTop: 1, letterSpacing: 2, textTransform: 'uppercase' }}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); router.push('/workout-library'); }} style={[styles.libraryBtn, { height: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder }]}>
              <Text style={[styles.libraryBtnText, { color: theme.accentBlue }]}>Library</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); showToolkit('workout'); }} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <Ionicons name="help-circle" size={22} color={theme.accentBlue} />
            </TouchableOpacity>
          </View>
        </View>
      <ScrollView
        ref={mainScrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets={true}>

        <View ref={dayScrollerRef} collapsable={false} style={{ marginBottom: 16 }}>
        <ScrollView
          ref={dayScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          onLayout={() => {}}>
          {DATES.map(({ key, dayName, label }) => {
            const c = theme.accentBlue;
            const isActiveDayTab = key === activeDay;
            const isToday = key === todayKey;
            const isPast = key < todayKey;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.dayTab, { backgroundColor: theme.bgCard, borderColor: theme.borderSubtle },
                  isActiveDayTab && { borderColor: c, backgroundColor: c + '18', borderWidth: 1.5 },
                  isToday && !isActiveDayTab && { borderColor: theme.textSecondary, borderWidth: 1.5 }]}
                onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setActiveDay(key); setCalBurnedSaved(!!cardioLogs[key]?.caloriesBurned); }}>
                {(() => {
                  const dayTagObjs = getDayTagObjects(key);
                  const n = Math.min(dayTagObjs.length, 6);
                  const leftCount = Math.ceil(n / 2);
                  const rightCount = Math.floor(n / 2);
                  const leftDots = dayTagObjs.slice(0, leftCount);
                  const rightDots = dayTagObjs.slice(leftCount, leftCount + rightCount);
                  return (
                    <View style={{ width: '100%', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                      {leftDots.length > 0 && (
                        <View style={{ position: 'absolute', left: 4, top: 0, bottom: 0, justifyContent: 'center', gap: 3 }}>
                          {leftDots.map(t => (
                            <View key={t.id} style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: t.color }} />
                          ))}
                        </View>
                      )}
                      <Text style={[styles.dayTabText, { color: theme.textMuted },
                        isActiveDayTab && { color: c },
                        !isActiveDayTab && { color: isPast ? theme.textMuted : theme.textSecondary }]}>{dayName}</Text>
                      <Text style={[styles.dayTabText, { color: theme.textMuted, fontSize: 11 },
                        isActiveDayTab && { color: c },
                        !isActiveDayTab && { color: isPast ? theme.textMuted : theme.textSecondary }]}>{label}</Text>
                      {rightDots.length > 0 && (
                        <View style={{ position: 'absolute', right: 4, top: 0, bottom: 0, justifyContent: 'center', gap: 3 }}>
                          {rightDots.map(t => (
                            <View key={t.id} style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: t.color }} />
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })()}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        </View>

        <View style={{ marginBottom: 12 }}>
          {(() => {
            const dayTagObjs = getDayTagObjects(activeDay);
            const row1 = dayTagObjs.slice(0, 3);
            const row2 = dayTagObjs.slice(3, 6);
            return (
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                <View style={{ flex: 1, gap: 5 }}>
                  {dayTagObjs.length === 0 ? (
                    <View style={{ flexDirection: 'row' }}>
                      <View style={{ borderWidth: 1, borderColor: theme.borderSubtle, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 }}>
                        <Text style={{ fontSize: 9, fontFamily: 'DMSans_700Bold', letterSpacing: 2, color: theme.textDim }}>UNASSIGNED</Text>
                      </View>
                    </View>
                  ) : (
                    <>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        {row1.map(t => (
                          <View key={t.id} style={{ backgroundColor: t.color + '99', borderWidth: 1, borderColor: t.color, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 }}>
                            <Text style={{ fontSize: 9, fontFamily: 'DMSans_700Bold', letterSpacing: 2, color: '#ffffff' }}>{t.label.toUpperCase()}</Text>
                          </View>
                        ))}
                      </View>
                      {row2.length > 0 && (
                        <View style={{ flexDirection: 'row', gap: 6 }}>
                          {row2.map(t => (
                            <View key={t.id} style={{ backgroundColor: t.color + '99', borderWidth: 1, borderColor: t.color, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 }}>
                              <Text style={{ fontSize: 9, fontFamily: 'DMSans_700Bold', letterSpacing: 2, color: '#ffffff' }}>{t.label.toUpperCase()}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </>
                  )}
                </View>
                <TouchableOpacity
                  style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: theme.accentBlueBorder, backgroundColor: theme.accentBlueBg }}
                  onPress={() => {
                    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                    const currentTags = programs[activeDay]?.tags || weeklyTemplate[activeDayName]?.tags || [];
                    setTagModalInitialTags([...currentTags]);
                    setShowTagModal(true);
                  }}>
                  <Text style={{ color: theme.accentBlue, fontSize: 12, fontFamily: 'DMSans_600SemiBold' }}>Tags</Text>
                </TouchableOpacity>
              </View>
            );
          })()}
        </View>

        {isRest ? (
          <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: theme.accentBlueRaw, alignItems: 'center', paddingVertical: 32, overflow: 'hidden' }]}>
            <Ionicons name="moon" size={36} color={theme.textMuted} />
            <Text style={{ color: theme.textPrimary, fontSize: 20, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1, marginTop: 12 }}>REST DAY</Text>
            <Text style={{ color: theme.textMuted, fontSize: 13, fontFamily: 'DMSans_400Regular', marginTop: 8, textAlign: 'center' }}>Recovery is part of the program. Rest well.</Text>
            <Text style={{ color: theme.textDim, fontSize: 11, fontFamily: 'DMSans_400Regular', marginTop: 12 }}>Tap + to add an exercise anyway</Text>
          </View>
        ) : (
          <>
            <View style={styles.progressRow}>
              <TouchableOpacity style={{ flex: 1 }} onPress={() => {
                triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                setLabelInput(program?.customLabel || '');
                setShowLabelModal(true);
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <IconSymbol name="pencil" size={14} color={theme.textMuted} />
                  <Text style={[styles.progressLabel, { fontSize: 18, color: programs[activeDay]?.customLabel ? theme.textSecondary : theme.textDim, fontFamily: 'DMSans_600SemiBold', flex: 1 }]} numberOfLines={1} ellipsizeMode="tail">{programs[activeDay]?.customLabel || 'Add label...'}</Text>
                </View>
              </TouchableOpacity>
              <View ref={progressCountRef} collapsable={false}>
                <Text style={[styles.progressCount, { color: doneCount === displayExercises.length && displayExercises.length > 0 ? theme.statusGood : color }]}>{doneCount}/{displayExercises.length}</Text>
              </View>
            </View>
            <View style={[styles.progressBarBg, { backgroundColor: theme.bgProgressTrack }]}>
              <Animated.View style={[styles.progressBarFill, { width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }), backgroundColor: theme.accentBlue }]} />
            </View>
          </>
        )}

        {!isRest && (() => {
          const lifts = displayExercises.filter((e: any) => !e.isCardio);
          const cardio = displayExercises.filter((e: any) => e.isCardio);
          // No Apple strength session on this day: render lifts + cardio as normal cards. Lifts get the
          // opt-in manual workout timer above them (no watch = no measured duration otherwise).
          if (appleSessions.length === 0) return (
            <>
              {lifts.length > 0 && renderWorkoutTimerPill(activeDay)}
              {renderExerciseUnits(displayExercises)}
            </>
          );
          // Apple Watch strength session = a CONTAINER wrapping the day's lifts; cardio stays outside.
          const hmsToSec = (str: any) => {
            const p = String(str || '').split(':').map((x: string) => parseInt(x) || 0);
            if (p.length === 3) return p[0] * 3600 + p[1] * 60 + p[2];
            if (p.length === 2) return p[0] * 60 + p[1];
            return p[0] || 0;
          };
          const totalDurSec = appleSessions.reduce((s: number, a: any) => s + hmsToSec(a.duration), 0);
          const totalCals = appleSessions.reduce((s: number, a: any) => s + (parseInt(a.calories || '0') || 0), 0);
          const stats = [
            totalDurSec > 0 ? { value: formatDuration(totalDurSec), label: 'Duration' } : null,
            totalCals > 0 ? { value: String(totalCals), label: 'Cal' } : null,
            sessionHR.avgHr != null ? { value: String(sessionHR.avgHr), label: 'Avg BPM' } : null,
            sessionHR.maxHr != null ? { value: String(sessionHR.maxHr), label: 'Max BPM' } : null,
          ].filter(Boolean) as { value: string; label: string }[];
          return (
            <>
              <View style={{ backgroundColor: theme.bgCard, borderWidth: 0.5, borderColor: theme.borderCard, borderTopWidth: 1.5, borderTopColor: theme.accentBlueRaw, borderRadius: 14, marginBottom: 12, overflow: 'hidden',
                shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 2 }}>
                {/* Session header: the Apple Watch envelope (duration / calories / HR). */}
                <View style={{ padding: 14, borderBottomWidth: 0.5, borderBottomColor: theme.borderCard }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={{ width: 14, alignItems: 'center' }}>
                          <Ionicons name="watch-outline" size={14} color={theme.accentBlue} />
                        </View>
                        <Text style={{ fontSize: 10, letterSpacing: 2, color: theme.accentBlue, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase' }}>Strength Session</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                        <View style={{ width: 14, alignItems: 'center' }}>
                          <Ionicons name="heart" size={11} color={theme.accentGreen} />
                        </View>
                        <Text style={[styles.badgeText, { color: theme.accentGreen }]}>APPLE HEALTH</Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      {appleSessions.length === 1 && (
                        <TouchableOpacity onPress={() => openHRZones(appleSessions[0])} activeOpacity={0.7} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, gap: 4 }}>
                          <Ionicons name="pulse" size={12} color={theme.accentBlue} />
                          <Text style={{ fontSize: 11, fontFamily: 'DMSans_600SemiBold', color: theme.accentBlue }}>HR Zones</Text>
                          <Ionicons name="chevron-forward" size={11} color={theme.accentBlue} />
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity onPress={deleteAppleSession} style={{ padding: 4 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name="trash" size={15} color={theme.accentRed} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  {appleSessions.length > 1 && (
                    <Text style={{ fontSize: 11, color: theme.textMuted, fontFamily: 'DMSans_500Medium', marginBottom: 12 }}>
                      Combined from {appleSessions.length} separate workouts
                    </Text>
                  )}
                  <View style={{ flexDirection: 'row', alignItems: 'stretch' }}>
                    {stats.map((s, i) => (
                      <View key={i} style={{ flex: 1, flexDirection: 'row', alignItems: 'stretch' }}>
                        {i > 0 && <View style={{ width: 0.5, backgroundColor: theme.borderCard, marginVertical: 2 }} />}
                        <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 2 }}>
                          <Text style={{ fontSize: 22, fontFamily: 'BebasNeue_400Regular', letterSpacing: 0.5, color: theme.textSecondary }}>{s.value}</Text>
                          <Text style={{ fontSize: 8, letterSpacing: 1.2, textTransform: 'uppercase', fontFamily: 'DMSans_700Bold', color: theme.textMuted, marginTop: 1, textAlign: 'center' }}>{s.label}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
                {/* Your lifts, nested INSIDE the session as clean borderless rows (no card-on-card). */}
                <View style={{ backgroundColor: theme.bgInset }}>
                  {lifts.length > 0
                    ? lifts.map((lift: any, i: number) => (
                        <View key={lift.id}>
                          {renderExerciseCard(lift, { inGroup: true })}
                          {i < lifts.length - 1 && <View style={{ height: 0.5, backgroundColor: theme.borderCard, marginHorizontal: 14 }} />}
                        </View>
                      ))
                    : <Text style={{ fontSize: 13, color: theme.textMuted, fontFamily: 'DMSans_400Regular', textAlign: 'center', paddingVertical: 18, paddingHorizontal: 14 }}>No lifts logged in this session yet. Tap the + to add one.</Text>}
                </View>
              </View>
              {/* Cardio stays OUTSIDE the session. */}
              {cardio.length > 0 && renderExerciseUnits(cardio)}
            </>
          );
        })()}

        {!isRest && displayExercises.length === 0 && appleSessions.length === 0 && (
          <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: theme.accentBlueRaw, alignItems: 'center', paddingVertical: 28, marginBottom: 12 }]}>
            <Ionicons name="barbell-outline" size={32} color={theme.textDim} />
            <Text style={{ color: theme.textPrimary, fontSize: 16, fontFamily: 'DMSans_600SemiBold', marginTop: 10 }}>No exercises yet</Text>
            <Text style={{ color: theme.textMuted, fontSize: 13, fontFamily: 'DMSans_400Regular', marginTop: 4, textAlign: 'center', paddingHorizontal: 24, marginBottom: 20 }}>
              Load a routine to fill the day, or add exercises manually
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, width: '100%', paddingHorizontal: 8 }}>
              <TouchableOpacity onPress={openLoadRoutineModal}
                style={{ flex: 1, backgroundColor: theme.bgInset, borderWidth: 1, borderColor: theme.borderCard, borderRadius: 10, paddingVertical: 12, alignItems: 'center' }}>
                <Ionicons name="repeat-outline" size={18} color={theme.textMuted} style={{ marginBottom: 4 }} />
                <Text style={{ color: theme.textMuted, fontSize: 13, fontFamily: 'DMSans_600SemiBold' }}>Load Routine</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push({ pathname: '/workout-library', params: { selectMode: 'true', day: activeDay } })}
                style={{ flex: 1, backgroundColor: theme.bgInset, borderWidth: 1, borderColor: theme.borderCard, borderRadius: 10, paddingVertical: 12, alignItems: 'center' }}>
                <Ionicons name="library-outline" size={18} color={theme.textMuted} style={{ marginBottom: 4 }} />
                <Text style={{ color: theme.textMuted, fontSize: 13, fontFamily: 'DMSans_600SemiBold' }}>Browse Library</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {!isRest && displayExercises.length > 0 && (
          // Add Exercise + View Summary share one row to save vertical space (tester wanted an inline
          // Add Exercise; the FAB has it too). Add Exercise is an outlined/solid-card button so it
          // stands off the page background; View Summary stays the wider filled primary CTA. View
          // Summary is a viewer, not a save gate -- sets already persist on every circle-check.
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 4, marginBottom: 4 }}>
            <TouchableOpacity
              onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); router.push({ pathname: '/workout-library', params: { selectMode: 'true', day: activeDay } }); }}
              style={{ flex: 1.3, backgroundColor: theme.bgCard, borderWidth: 1.5, borderColor: theme.accentBlue, borderRadius: 12, paddingVertical: 15, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 5 }}>
              <Ionicons name="add" size={19} color={theme.accentBlue} />
              <Text style={{ fontSize: 14, fontFamily: 'DMSans_700Bold', letterSpacing: 0.3, color: theme.accentBlue }}>Add Exercise</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                if (finishedSummaries[activeDay]) { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); openFinishSummary(finishedSummaries[activeDay]); }
                else finishWorkout();
              }}
              style={{ flex: 1.7, backgroundColor: theme.accentBlue, borderRadius: 12, paddingVertical: 15, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
                shadowColor: theme.accentBlue, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}>
              <Ionicons name="checkmark-circle" size={18} color={theme.bgPrimary} />
              <Text style={{ fontSize: 15, fontFamily: 'DMSans_700Bold', letterSpacing: 0.5, color: theme.bgPrimary }}>View Summary</Text>
            </TouchableOpacity>
          </View>
        )}

        <View ref={effortCardRef} collapsable={false} style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: theme.accentBlueRaw, marginTop: 12 }]}>
          <Text style={[styles.cardLabel, { color: theme.textMuted }]}>Today's Effort</Text>
          <View style={{ flexDirection: 'column', gap: 8, marginTop: 12 }}>
            {[[1,2,3,4,5],[6,7,8,9,10]].map((row, ri) => (
              <View key={ri} style={{ flexDirection: 'row', gap: 8 }}>
                {row.map(n => {
                  const selected = cardioLogs[activeDay]?.effortScore === n;
                  const effortColor = n <= 3 ? theme.statusGood : n <= 6 ? '#ca8a04' : n <= 8 ? '#f97316' : theme.statusBad;
                  const anim = effortAnims[n - 1];
                  return (
                    <Animated.View key={n} style={{ flex: 1, transform: [{ scale: anim }] }}>
                      <TouchableOpacity
                        onPress={() => {
                          triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                          Animated.sequence([
                            Animated.timing(anim, { toValue: 1.08, duration: 70, useNativeDriver: true }),
                            Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 5, tension: 150 }),
                          ]).start();
                          const current = cardioLogs[activeDay]?.effortScore;
                          const newScore = current === n ? null : n;
                          const newLogs = { ...cardioLogs, [activeDay]: { ...(cardioLogs[activeDay] || {}), effortScore: newScore } };
                          setCardioLogs(newLogs);
                          saveState(checks, cardioComplete, programs, workoutNotes, newLogs);
                          Animated.timing(effortLabelAnim, { toValue: newScore ? 1 : 0, duration: 200, useNativeDriver: true }).start();
                        }}
                        style={{
                          height: 52, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
                          backgroundColor: selected ? effortColor : effortColor + '14',
                          borderWidth: 0.5,
                          borderColor: selected ? effortColor : effortColor + '40',
                        }}>
                        <Text style={{ fontSize: 28, fontFamily: 'BebasNeue_400Regular', color: selected ? '#ffffff' : effortColor, opacity: selected ? 1 : 0.55 }}>{n}</Text>
                      </TouchableOpacity>
                    </Animated.View>
                  );
                })}
              </View>
            ))}
          </View>
          <Animated.View style={{ alignItems: 'center', marginTop: 10, opacity: effortLabelAnim }}>
            {(() => {
              const s = cardioLogs[activeDay]?.effortScore;
              const c = !s ? theme.textMuted : s <= 3 ? theme.statusGood : s <= 6 ? theme.statusWarn : s <= 8 ? '#f97316' : theme.statusBad;
              return <Text style={{ fontSize: 10, letterSpacing: 3, color: c, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase' }}>{getEffortLabel(s)}</Text>;
            })()}
          </Animated.View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: theme.accentBlueRaw, marginTop: 12 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <TextInput
              style={{ flex: 1, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: theme.textMuted, fontFamily: 'DMSans_700Bold', padding: 0, marginRight: 8 }}
              value={workoutNoteNames[activeDay] ?? ''}
              onChangeText={v => setWorkoutNoteNames(prev => ({ ...prev, [activeDay]: v }))}
              onBlur={() => saveState()}
              placeholder="WORKOUT NOTE"
              placeholderTextColor={theme.textMuted}
              maxLength={40}
              returnKeyType="done"
            />
            <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); router.push('/journal'); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="journal" size={16} color={theme.accentBlue} />
            </TouchableOpacity>
          </View>
          <TextInput
            ref={noteInputRef}
            style={[styles.notesInput, { backgroundColor: theme.bgInput, borderColor: theme.borderInput, color: theme.textPrimary }]}
            placeholder="How'd it feel?"
            placeholderTextColor={theme.textPlaceholder}
            multiline
            selectTextOnFocus={false}
            value={workoutNotes[activeDay] || ''}
            onChangeText={v => setWorkoutNotes(prev => ({ ...prev, [activeDay]: v }))}
            onFocus={() => setTimeout(() => mainScrollRef.current?.scrollToEnd({ animated: true }), 350)}
            onBlur={() => noteInputRef.current?.setNativeProps({ selection: { start: 0, end: 0 } })}
          />
          <TouchableOpacity
            style={[styles.saveNoteBtn, noteIsDirty && !noteCurrentText
              ? { backgroundColor: theme.accentRedBg, borderColor: theme.accentRedBorder, opacity: 1 }
              : { backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder, opacity: noteIsDirty ? 1 : 0.4 }
            ]}
            onPress={saveNote}
            disabled={!noteIsDirty}
          >
            <Text style={[styles.saveNoteBtnText, { color: noteIsDirty && !noteCurrentText ? theme.accentRed : theme.accentBlue }]}>
              {!noteIsDirty && noteCurrentText ? 'Saved ✓' : noteIsDirty && !noteCurrentText ? 'Clear Note' : 'Save Note'}
            </Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Rest timer bar -- floats above the tab bar while resting */}
      {restTimer && (
        <View style={{ position: 'absolute', left: 12, right: 12, bottom: 64 + insets.bottom + 10, zIndex: 50,
          backgroundColor: theme.bgSheet, borderRadius: 14, borderWidth: 1, borderColor: theme.accentBlueBorder,
          flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, gap: 10,
          shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 }}>
          {(() => {
            const over = restTimer.overtime > 0;
            const secs = over ? restTimer.overtime : restTimer.secondsLeft;
            const num = `${over ? '+' : ''}${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
            return (
              <>
                <Ionicons name="timer-outline" size={20} color={over ? theme.accentRed : theme.accentBlue} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 22, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1, color: over ? theme.accentRed : theme.textPrimary }}>
                    {num}
                  </Text>
                  <Text style={{ fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: 'DMSans_700Bold', color: over ? theme.accentRed : theme.textMuted }} numberOfLines={1}>
                    {over ? 'Over rest' : 'Rest'}{restTimer.label ? ` · ${restTimer.label}` : ''}
                  </Text>
                </View>
              </>
            );
          })()}
          <TouchableOpacity onPress={() => adjustRest(-15)} style={{ backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 7 }} hitSlop={{ top: 6, bottom: 6, left: 2, right: 2 }}>
            <Text style={{ fontSize: 12, fontFamily: 'DMSans_700Bold', color: theme.textSecondary }}>−15s</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => adjustRest(15)} style={{ backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 7 }} hitSlop={{ top: 6, bottom: 6, left: 2, right: 2 }}>
            <Text style={{ fontSize: 12, fontFamily: 'DMSans_700Bold', color: theme.textSecondary }}>+15s</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={skipRest} style={{ backgroundColor: theme.accentBlue, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 }} hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}>
            <Text style={{ fontSize: 12, fontFamily: 'DMSans_700Bold', color: theme.bgPrimary }}>Skip</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Finish Workout summary */}
      <Modal visible={!!finishSummary} transparent animationType="none" statusBarTranslucent onRequestClose={closeFinishSummary}>
        <Reanimated.View style={[StyleSheet.absoluteFill, { backgroundColor: theme.overlayBg }, finishOverlayStyle]} pointerEvents="none" />
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeFinishSummary} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }} pointerEvents="box-none">
          <Reanimated.View pointerEvents="box-none" style={[{ width: '100%', maxWidth: 420, maxHeight: '90%' }, finishCardStyle]}>
            {finishSummary && (() => {
              const fs = finishSummary;
              const showHeaders = fs.hasLifts && !!fs.cardio;
              const liftStats: { icon: any; value: string; label: string }[] = [];
              if (fs.hasLifts) {
                if (fs.liftDurationSec != null) liftStats.push({ icon: 'stopwatch-outline', value: formatDuration(fs.liftDurationSec), label: 'Duration' });
                // Split volume by unit (can't sum lb + kg). Old snapshots lack volumeLb/Kg -> fall back to
                // totalVolume as lb, exactly as before. New snapshots show one tile per unit actually lifted.
                {
                  const volLb = fs.volumeLb ?? fs.totalVolume ?? 0;
                  const volKg = fs.volumeKg ?? 0;
                  if (volLb > 0) liftStats.push({ icon: 'barbell-outline', value: Math.round(volLb).toLocaleString(), label: 'Lbs Volume' });
                  if (volKg > 0) liftStats.push({ icon: 'barbell-outline', value: Math.round(volKg).toLocaleString(), label: 'Kgs Volume' });
                }
                liftStats.push({ icon: 'layers-outline', value: String(fs.doneSets), label: 'Sets' });
                liftStats.push({ icon: 'list-outline', value: String(fs.doneExercises), label: 'Exercises' });
                // Apple Watch strength-session envelope (only present when a strength session is on the day).
                if (fs.liftCalories != null && fs.liftCalories > 0) liftStats.push({ icon: 'flame-outline', value: String(fs.liftCalories), label: 'Cal' });
                if (fs.liftAvgHr != null) liftStats.push({ icon: 'heart-outline', value: String(fs.liftAvgHr), label: 'Avg BPM' });
                if (fs.liftMaxHr != null) liftStats.push({ icon: 'heart', value: String(fs.liftMaxHr), label: 'Max BPM' });
              }
              // Multiple cardios => never blend HR into one misleading average. Top tiles show the
              // summable totals; each session's own avg/max HR renders in the breakdown list below.
              const multiCardio = !!(fs.cardio?.items && fs.cardio.items.length > 1);
              const cardioStats: { icon: any; value: string; label: string }[] = [];
              if (fs.cardio) {
                if (fs.cardio.durationSec > 0) cardioStats.push({ icon: 'stopwatch-outline', value: formatDuration(fs.cardio.durationSec), label: 'Duration' });
                if (fs.cardio.distanceMi > 0) cardioStats.push({ icon: 'navigate-outline', value: fs.cardio.distanceMi.toFixed(2), label: 'Miles' });
                if (fs.cardio.calories > 0) cardioStats.push({ icon: 'flame-outline', value: String(fs.cardio.calories), label: 'Cal' });
                if (multiCardio) cardioStats.push({ icon: 'fitness-outline', value: String(fs.cardio.count), label: 'Sessions' });
                if (!multiCardio && fs.cardio.avgHr != null) cardioStats.push({ icon: 'heart-outline', value: String(fs.cardio.avgHr), label: 'Avg BPM' });
                if (!multiCardio && fs.cardio.maxHr != null) cardioStats.push({ icon: 'heart', value: String(fs.cardio.maxHr), label: 'Max BPM' });
                if (cardioStats.length === 0) cardioStats.push({ icon: 'fitness-outline', value: String(fs.cardio.count), label: fs.cardio.count === 1 ? 'Session' : 'Sessions' });
              }
              const dateLabel = (() => {
                try { return new Date(activeDay + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }); } catch { return ''; }
              })();
              const sectionLabel = (txt: string, color: string = theme.accentBlue) => (
                <Text style={{ fontSize: 10, letterSpacing: 2.5, color, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase', marginBottom: 9 }}>{txt}</Text>
              );
              return (
                <View style={{ backgroundColor: theme.bgSheet, borderRadius: 18, borderWidth: 0.5, borderTopWidth: 1.5, borderColor: theme.borderCard, borderTopColor: theme.accentBlueRaw, overflow: 'hidden',
                  shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 20, elevation: 10 }}>
                  <ScrollView showsVerticalScrollIndicator={false} bounces={false} contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 10, paddingBottom: 22 }}>
                  <TouchableOpacity activeOpacity={0.7} onPress={closeFinishSummary} style={{ alignItems: 'center', paddingBottom: 12 }} hitSlop={{ top: 10, bottom: 10, left: 40, right: 40 }}>
                    <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.borderCard }} />
                  </TouchableOpacity>

                  <View style={{ marginBottom: 18, paddingBottom: 12, borderBottomWidth: 0.5, borderBottomColor: theme.borderCard }}>
                    <Text style={[styles.modalTitle, { color: theme.accentBlue, marginBottom: !!dateLabel ? 2 : 0 }]}>Workout Summary</Text>
                    {!!dateLabel && (
                      <Text style={{ fontSize: 11, fontFamily: 'DMSans_600SemiBold', color: theme.textMuted, letterSpacing: 0.3 }}>{dateLabel}</Text>
                    )}
                  </View>

                  {fs.hasLifts && (
                    <View style={{ marginBottom: (fs.cardio || fs.prHits.length) ? 16 : 6 }}>
                      {showHeaders && sectionLabel('Lifting')}
                      {renderTiles(liftStats)}
                      {fs.liftItems && fs.liftItems.length > 0 && (
                        <View style={{ marginTop: 8, gap: 8 }}>
                          {fs.liftItems.map((it, idx) => (
                            <View key={idx} style={{ backgroundColor: theme.bgInset, borderWidth: 0.5, borderLeftWidth: 2.5, borderColor: theme.borderCard, borderLeftColor: theme.accentBlue, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12 }}>
                              <Text numberOfLines={1} style={{ fontSize: 13, fontFamily: 'DMSans_600SemiBold', color: theme.textSecondary }}>{it.name}</Text>
                              <Text style={{ fontSize: 12, fontFamily: 'DMSans_700Bold', color: theme.textSecondary, marginTop: 6 }}>{formatLiftSets(it.sets, it.unit)}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  )}

                  {fs.cardio && (
                    <View style={{ marginBottom: fs.prHits.length ? 16 : 6 }}>
                      {showHeaders && sectionLabel('Cardio', theme.accentAmber)}
                      {renderTiles(cardioStats, theme.accentAmber)}
                      {multiCardio && (
                        <View style={{ marginTop: 10, gap: 8 }}>
                          {fs.cardio.items!.map((it, idx) => (
                            <View key={idx} style={{ backgroundColor: theme.bgInset, borderWidth: 0.5, borderLeftWidth: 2.5, borderColor: theme.borderCard, borderLeftColor: theme.accentAmber, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Text numberOfLines={1} style={{ flex: 1, fontSize: 13, fontFamily: 'DMSans_600SemiBold', color: theme.textSecondary, marginRight: 8 }}>{it.name}</Text>
                                {it.durationSec > 0 && (
                                  <Text style={{ fontSize: 11, fontFamily: 'DMSans_600SemiBold', color: theme.textMuted }}>{formatDuration(it.durationSec)}</Text>
                                )}
                              </View>
                              {(it.avgHr != null || it.maxHr != null) ? (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 6 }}>
                                  {it.avgHr != null && (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                      <Ionicons name="heart-outline" size={12} color={theme.accentAmber} />
                                      <Text style={{ fontSize: 12, fontFamily: 'DMSans_700Bold', color: theme.textSecondary }}>{it.avgHr}</Text>
                                      <Text style={{ fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', fontFamily: 'DMSans_700Bold', color: theme.textMuted }}>Avg BPM</Text>
                                    </View>
                                  )}
                                  {it.maxHr != null && (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                      <Ionicons name="heart" size={12} color={theme.accentAmber} />
                                      <Text style={{ fontSize: 12, fontFamily: 'DMSans_700Bold', color: theme.textSecondary }}>{it.maxHr}</Text>
                                      <Text style={{ fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', fontFamily: 'DMSans_700Bold', color: theme.textMuted }}>Max BPM</Text>
                                    </View>
                                  )}
                                </View>
                              ) : (
                                <Text style={{ fontSize: 11, fontFamily: 'DMSans_500Medium', color: theme.textMuted, marginTop: 5 }}>No heart rate recorded</Text>
                              )}
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  )}

                  {(() => {
                    const cardioPrs = fs.cardioPrHits || [];
                    const totalPRs = fs.prHits.length + cardioPrs.length;
                    if (totalPRs === 0) return null;
                    return (
                    <View style={{ backgroundColor: theme.accentAmber + '14', borderWidth: 1, borderColor: theme.accentAmber + '40', borderRadius: 12, padding: 14, marginBottom: 16 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                        <Ionicons name="trophy" size={16} color={theme.accentAmber} />
                        <Text style={{ fontSize: 13, fontFamily: 'DMSans_700Bold', color: theme.accentAmber, flex: 1 }}>
                          {`You set ${totalPRs} PR${totalPRs !== 1 ? 's' : ''} today`}
                        </Text>
                        <TooltipIcon tooltipKey="personal_records" hideTour color={theme.accentAmber} />
                      </View>
                      {fs.prHits.map((pr: any, i: number) => (
                        <View key={`l${i}`} style={{ marginBottom: (i < fs.prHits.length - 1 || cardioPrs.length > 0) ? 10 : 0 }}>
                          <Text style={{ fontSize: 14, fontFamily: 'DMSans_700Bold', color: theme.textPrimary, marginBottom: 2 }}>{pr.name}</Text>
                          {pr.weightPR && (
                            <Text style={{ fontSize: 12, fontFamily: 'DMSans_500Medium', color: theme.textSecondary }}>
                              New heaviest set: {pr.weightVal} {weightUnitLabel(pr.unit)} × {pr.weightReps}
                            </Text>
                          )}
                          {pr.e1rmPR && (
                            <Text style={{ fontSize: 12, fontFamily: 'DMSans_500Medium', color: theme.textSecondary }}>
                              New estimated 1-rep max: {pr.e1rmVal} {weightUnitLabel(pr.unit)}
                            </Text>
                          )}
                        </View>
                      ))}
                      {cardioPrs.map((pr, i) => (
                        <View key={`c${i}`} style={{ marginBottom: i < cardioPrs.length - 1 ? 10 : 0 }}>
                          <Text style={{ fontSize: 14, fontFamily: 'DMSans_700Bold', color: theme.textPrimary, marginBottom: 2 }}>{pr.label}</Text>
                          {pr.distancePR && (
                            <Text style={{ fontSize: 12, fontFamily: 'DMSans_500Medium', color: theme.textSecondary }}>
                              New furthest: {pr.distanceMi} mi
                            </Text>
                          )}
                          {pr.durationPR && (
                            <Text style={{ fontSize: 12, fontFamily: 'DMSans_500Medium', color: theme.textSecondary }}>
                              New longest: {formatDuration(pr.durationSec)}
                            </Text>
                          )}
                        </View>
                      ))}
                    </View>
                    );
                  })()}

                  <TouchableOpacity onPress={closeFinishSummary}
                    style={{ backgroundColor: theme.accentBlue, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 10 }}>
                    <Text style={{ fontSize: 15, fontFamily: 'DMSans_700Bold', color: theme.bgPrimary }}>Done</Text>
                  </TouchableOpacity>
                  </ScrollView>
                </View>
              );
            })()}
          </Reanimated.View>
        </View>
      </Modal>

      {/* Manual workout duration edit */}
      <Modal visible={!!durationEditDay} transparent animationType="none" statusBarTranslucent onRequestClose={() => setDurationEditDay(null)}
        onShow={() => {
          durationOverlay.value = withTiming(1, { duration: 150 });
          durationCardScale.value = withSpring(1, { damping: 24, stiffness: 320, overshootClamping: true });
          durationCardOpacity.value = withTiming(1, { duration: 150 });
        }}>
        <Reanimated.View style={[StyleSheet.absoluteFill, { backgroundColor: theme.overlayBg }, durationOverlayStyle]} pointerEvents="none" />
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => { setDurationEditDay(null); durationOverlay.value = 0; durationCardScale.value = 0.85; durationCardOpacity.value = 0; }} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 }} pointerEvents="box-none">
          <Reanimated.View pointerEvents="auto" style={[{ width: '100%', maxWidth: 360, backgroundColor: theme.bgSheet, borderRadius: 18, borderWidth: 0.5, borderTopWidth: 1.5, borderColor: theme.borderCard, borderTopColor: theme.accentBlueRaw, padding: 22, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 20, elevation: 10 }, durationCardStyle]}>
            <View style={{ alignItems: 'center', marginBottom: 14 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.borderCard }} />
            </View>
            <Text style={{ fontSize: 12, letterSpacing: 2.5, color: theme.accentBlue, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase', textAlign: 'center', marginBottom: 6 }}>Workout Duration</Text>
            <Text style={{ fontSize: 13, fontFamily: 'DMSans_500Medium', color: theme.textMuted, textAlign: 'center', marginBottom: 16 }}>How many minutes did you train? Set to 0 to clear it.</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 18 }}>
              <TextInput
                value={durationEditText}
                onChangeText={t => setDurationEditText(t.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={theme.textPlaceholder}
                style={{ backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 18, fontSize: 24, fontFamily: 'DMSans_700Bold', color: theme.textPrimary, textAlign: 'center', minWidth: 120 }}
                autoFocus
                maxLength={4}
              />
              <Text style={{ fontSize: 14, fontFamily: 'DMSans_600SemiBold', color: theme.textMuted }}>min</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity onPress={() => { setDurationEditDay(null); setDurationEditText(''); durationOverlay.value = 0; durationCardScale.value = 0.85; durationCardOpacity.value = 0; }}
                style={{ flex: 1, backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 12, paddingVertical: 13, alignItems: 'center' }}>
                <Text style={{ fontSize: 14, fontFamily: 'DMSans_700Bold', color: theme.textMuted }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { durationOverlay.value = 0; durationCardScale.value = 0.85; durationCardOpacity.value = 0; saveDurationEdit(); }}
                style={{ flex: 1, backgroundColor: theme.accentBlue, borderRadius: 12, paddingVertical: 13, alignItems: 'center' }}>
                <Text style={{ fontSize: 14, fontFamily: 'DMSans_700Bold', color: theme.bgPrimary }}>Save</Text>
              </TouchableOpacity>
            </View>
          </Reanimated.View>
        </KeyboardAvoidingView>
        <ToastRenderer />
      </Modal>

      {/* Weight unit (lb/kg) picker -- opened from a set row's weight-column header */}
      <Modal visible={!!unitPickerExId} transparent animationType="none" statusBarTranslucent onRequestClose={closeUnitPicker}
        onShow={() => {
          unitPickerOverlay.value = withTiming(1, { duration: 150 });
          unitPickerScale.value = withSpring(1, { damping: 24, stiffness: 320, overshootClamping: true });
          unitPickerOpacity.value = withTiming(1, { duration: 150 });
        }}>
        <Reanimated.View style={[StyleSheet.absoluteFill, { backgroundColor: theme.overlayBg }, unitPickerOverlayStyle]} pointerEvents="none" />
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeUnitPicker} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 }} pointerEvents="box-none">
          {(() => {
            const cur = exercises.find(e => e.id === unitPickerExId)?.weightUnit || 'lb';
            const opt = (val: 'lb' | 'kg', label: string, sub: string) => (
              <TouchableOpacity key={val} onPress={() => setExerciseUnit(unitPickerExId!, val)}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: cur === val ? theme.accentBlue + '22' : theme.bgInput, borderWidth: 1, borderColor: cur === val ? theme.accentBlue + '77' : theme.borderInput, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, marginBottom: 10 }}>
                <View>
                  <Text style={{ fontSize: 15, fontFamily: 'DMSans_700Bold', color: cur === val ? theme.accentBlue : theme.textSecondary }}>{label}</Text>
                  <Text style={{ fontSize: 11, fontFamily: 'DMSans_500Medium', color: theme.textMuted, marginTop: 2 }}>{sub}</Text>
                </View>
                {cur === val ? <Ionicons name="checkmark-circle" size={20} color={theme.accentBlue} /> : null}
              </TouchableOpacity>
            );
            return (
              <Reanimated.View pointerEvents="auto" style={[{ width: '100%', maxWidth: 340, backgroundColor: theme.bgSheet, borderRadius: 18, borderWidth: 0.5, borderTopWidth: 1.5, borderColor: theme.borderCard, borderTopColor: theme.accentBlueRaw, padding: 22, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 20, elevation: 10 }, unitPickerCardStyle]}>
                <View style={{ alignItems: 'center', marginBottom: 14 }}>
                  <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.borderCard }} />
                </View>
                <Text style={{ fontSize: 12, letterSpacing: 2.5, color: theme.accentBlue, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase', textAlign: 'center', marginBottom: 6 }}>Weight Unit</Text>
                <Text style={{ fontSize: 13, fontFamily: 'DMSans_500Medium', color: theme.textMuted, textAlign: 'center', marginBottom: 16 }}>Pick the unit for this exercise. Your logged numbers stay exactly as entered.</Text>
                {opt('lb', 'Pounds (lb)', 'Standard for most lifters')}
                {opt('kg', 'Kilograms (kg)', 'Common for main barbell lifts')}
              </Reanimated.View>
            );
          })()}
        </View>
        <ToastRenderer />
      </Modal>

      {/* Add/Edit Modal */}
      <Modal visible={showAddModal} transparent animationType="none" statusBarTranslucent hardwareAccelerated onShow={() => {
        addExerciseScale.value = 0.85;
        addExerciseOpacity.value = 0;
        addExerciseKeyboardY.value = 0;
        Animated.timing(addExerciseOverlayAnim, { toValue: 1, duration: 150, useNativeDriver: true }).start();
        addExerciseScale.value = withSpring(1, { damping: 24, stiffness: 320, overshootClamping: true });
        addExerciseOpacity.value = withTiming(1, { duration: 150 });
      }}>
        <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: theme.overlayBg, opacity: addExerciseOverlayAnim }} pointerEvents="none" />
        <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={closeAddExerciseModal} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16, paddingTop: insets.top + 8, paddingBottom: addExerciseKbHeight + 8 }} pointerEvents="box-none">
          <Reanimated.View style={[{ width: '100%' }, addExerciseKeyboardStyle]} pointerEvents="box-none">
            <View pointerEvents="auto" style={{ maxHeight: Dimensions.get('window').height - insets.top - addExerciseKbHeight - 24, backgroundColor: theme.bgSheet, borderRadius: 16, borderWidth: 0.5, borderTopWidth: 1.5, borderColor: theme.borderCard, borderTopColor: theme.accentBlueRaw, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 20, overflow: 'hidden' }}>
              <TouchableOpacity onPress={closeAddExerciseModal} style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 4 }}>
                <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.borderCard }} />
              </TouchableOpacity>
              <View style={{ paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 0.5, borderBottomColor: theme.borderCard }}>
                <Text style={[styles.modalTitle, { color: theme.accentBlue }]}>{editingExercise ? 'EDIT EXERCISE' : 'ADD EXERCISE'}</Text>
              </View>
              <ScrollView style={{ flexShrink: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <View style={{ padding: 20 }}>
                  <TextInput style={[styles.modalInput, { backgroundColor: theme.bgInput, borderColor: theme.borderInput, color: theme.textPrimary }]} placeholder="Exercise name" placeholderTextColor={theme.textPlaceholder} value={form.name} onChangeText={v => setForm(p => ({ ...p, name: v }))} autoCapitalize="words" autoCorrect={false} spellCheck={false} />
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                    <TouchableOpacity
                      style={[styles.modalCancelBtn, { backgroundColor: theme.bgInput, borderColor: theme.borderInput }, !form.isCardio && { backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder }]}
                      onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setForm(p => ({ ...p, isCardio: false })); }}>
                      <Text style={[styles.modalCancelBtnText, { color: theme.textMuted }, !form.isCardio && { color: theme.accentBlue }]}>Lift</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalCancelBtn, { backgroundColor: theme.bgInput, borderColor: theme.borderInput }, form.isCardio && { backgroundColor: 'rgba(245,158,11,0.15)', borderColor: 'rgba(245,158,11,0.3)' }]}
                      onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setForm(p => ({ ...p, isCardio: true })); }}>
                      <Text style={[styles.modalCancelBtnText, { color: theme.textMuted }, form.isCardio && { color: theme.statusWarn }]}>Cardio</Text>
                    </TouchableOpacity>
                  </View>
                  {form.isCardio ? (
                    <>
                      {[
                        { label: 'Duration (min)', key: 'duration' },
                        { label: 'Distance (miles)', key: 'distance' },
                        { label: 'Speed (mph)', key: 'speed' },
                        { label: 'Avg Incline (%)', key: 'incline' },
                        { label: 'Resistance', key: 'resistance' },
                        { label: 'Avg HR', key: 'hr' },
                      ].map(field => (
                        <View key={field.key} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'DMSans_400Regular' }}>{field.label}</Text>
                          <TextInput
                            style={[styles.modalInput, { backgroundColor: theme.bgInput, borderColor: theme.borderInput, color: theme.textPrimary, width: 100, textAlign: 'right', marginBottom: 0 }]}
                            placeholder="0"
                            placeholderTextColor={theme.textPlaceholder}
                            keyboardType="decimal-pad"
                            value={form[field.key as keyof typeof form] as string || ''}
                            onChangeText={v => filterDecimal(v, s => setForm(p => ({ ...p, [field.key]: s })))}
                          />
                        </View>
                      ))}
                    </>
                  ) : (
                    <>
                    {/* Weight unit for this lift (lb/kg). Mirrors the inline set-row picker; defaults to lb. */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <Text style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: theme.textMuted, fontFamily: 'DMSans_700Bold', width: 56 }}>Weight</Text>
                      <TouchableOpacity
                        style={[styles.modalCancelBtn, { flex: 1, backgroundColor: theme.bgInput, borderColor: theme.borderInput }, form.weightUnit !== 'kg' && { backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder }]}
                        onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setForm(p => ({ ...p, weightUnit: 'lb' })); }}>
                        <Text style={[styles.modalCancelBtnText, { color: theme.textMuted }, form.weightUnit !== 'kg' && { color: theme.accentBlue }]}>LB</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.modalCancelBtn, { flex: 1, backgroundColor: theme.bgInput, borderColor: theme.borderInput }, form.weightUnit === 'kg' && { backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder }]}
                        onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setForm(p => ({ ...p, weightUnit: 'kg' })); }}>
                        <Text style={[styles.modalCancelBtnText, { color: theme.textMuted }, form.weightUnit === 'kg' && { color: theme.accentBlue }]}>KG</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.modalRow}>
                      <TextInput style={[styles.modalInput, { backgroundColor: theme.bgInput, borderColor: theme.borderInput, color: theme.textPrimary, flex: 1 }]} placeholder="Sets" placeholderTextColor={theme.textPlaceholder} keyboardType="number-pad" value={form.sets || ''} onChangeText={v => setForm(p => ({ ...p, sets: v.replace(/[^0-9]/g, '') }))} />
                      <TextInput style={[styles.modalInput, { backgroundColor: theme.bgInput, borderColor: theme.borderInput, color: theme.textPrimary, flex: 1 }]} placeholder="Reps" placeholderTextColor={theme.textPlaceholder} keyboardType="number-pad" value={form.reps || ''} onChangeText={v => setForm(p => ({ ...p, reps: v.replace(/[^0-9]/g, '') }))} />
                      <TextInput style={[styles.modalInput, { backgroundColor: theme.bgInput, borderColor: theme.borderInput, color: theme.textPrimary, flex: 1 }]} placeholder="Rest" placeholderTextColor={theme.textPlaceholder} keyboardType="number-pad" value={form.rest || ''} onChangeText={v => setForm(p => ({ ...p, rest: v.replace(/[^0-9]/g, '') }))} />
                    </View>
                    </>
                  )}
                  <TextInput style={[styles.modalInput, { backgroundColor: theme.bgInput, borderColor: theme.borderInput, color: theme.textPrimary }]} placeholder="Note (optional)" placeholderTextColor={theme.textPlaceholder} value={form.note} onChangeText={v => setForm(p => ({ ...p, note: v }))} />
                  <View style={styles.modalBtns}>
                    <TouchableOpacity style={[styles.modalCancelBtn, { backgroundColor: theme.bgInput, borderColor: theme.borderInput }]} onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); closeAddExerciseModal(); }}>
                      <Text style={[styles.modalCancelBtnText, { color: theme.textMuted }]}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.modalSaveBtn, { backgroundColor: theme.accentBlue, opacity: modalCanSave ? 1 : 0.35 }]} onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Medium); saveExercise(); }} disabled={!modalCanSave}>
                      <Text style={[styles.modalSaveBtnText, { color: '#ffffff' }]}>{editingExercise ? 'Save' : 'Add'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            </View>
          </Reanimated.View>
        </View>
      </Modal>

      {/* Label Modal */}
      {showLabelModal && (
        <Modal transparent animationType="fade" onRequestClose={() => setShowLabelModal(false)}>
          <TouchableOpacity style={{ ...StyleSheet.absoluteFillObject, backgroundColor: theme.overlayBg }} activeOpacity={1} onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setShowLabelModal(false); }} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} pointerEvents="box-none">
            <View style={{ backgroundColor: theme.bgSheet, borderRadius: 16, width: '88%', borderWidth: 0.5, borderColor: theme.borderCard, borderTopWidth: 1.5, borderTopColor: theme.accentBlueRaw, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, overflow: 'hidden' }}>
              <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setShowLabelModal(false); }} style={{ alignSelf: 'center', paddingTop: 12, paddingBottom: 4, paddingHorizontal: 20 }} hitSlop={{ top: 8, bottom: 8, left: 20, right: 20 }}>
                <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: theme.borderCard }} />
              </TouchableOpacity>
              <View style={{ padding: 20, paddingTop: 8 }}>
                <Text style={{ color: theme.accentBlueRaw, fontSize: 16, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2, textAlign: 'center', marginBottom: 14 }}>EDIT DAY LABEL</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: theme.bgInput, borderColor: theme.borderInput, color: theme.textPrimary, marginBottom: 16 }]}
                  value={labelInput}
                  onChangeText={setLabelInput}
                  placeholder="e.g. Push · Chest, Shoulders"
                  placeholderTextColor={theme.textPlaceholder}
                  autoFocus
                />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity style={[styles.modalCancelBtn, { flex: 1, backgroundColor: theme.bgInput, borderColor: theme.borderInput }]} onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setShowLabelModal(false); }}>
                    <Text style={[styles.modalCancelBtnText, { color: theme.textMuted }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalSaveBtn, { flex: 1, backgroundColor: theme.accentBlue }]} onPress={() => {
                    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
                    const parts = labelInput.split('·').map(s => s.trim());
                    const baseProgram = programs[activeDay] || weeklyTemplate[activeDayName];
                    const newPrograms = {
                      ...programs,
                      [activeDay]: { ...baseProgram, customLabel: parts[0] || '', muscles: parts[1] || '' }
                    };
                    setPrograms({...newPrograms});
                    setDayLabel(newPrograms[activeDay]?.customLabel || '');
                    saveState(checks, cardioComplete, {...newPrograms}, workoutNotes, cardioLogs, weeklyTemplate);
                    setShowLabelModal(false);
                  }}>
                    <Text style={[styles.modalSaveBtnText, { color: theme.bgPrimary }]}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      )}

      {/* Tag Assignment Modal */}
      {showTagModal && (
        <Modal transparent animationType="fade" onRequestClose={() => setShowTagModal(false)}>
          <TouchableOpacity style={{ flex: 1, backgroundColor: theme.overlayBg, justifyContent: 'center', alignItems: 'center' }} activeOpacity={1} onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setShowTagModal(false); }}>
            <TouchableOpacity activeOpacity={1} onPress={e => e.stopPropagation()}>
              <View style={{ backgroundColor: theme.bgSheet, borderRadius: 16, padding: 20, width: 320, borderWidth: 1, borderColor: theme.borderCard }}>
                <Text style={{ color: theme.textPrimary, fontSize: 18, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2, marginBottom: 4 }}>ASSIGN TAGS</Text>
                <Text style={{ color: theme.textMuted, fontSize: 11, fontFamily: 'DMSans_400Regular', marginBottom: 16 }}>{activeDateObj?.dayName} {activeDateObj?.label} · tap to toggle</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                  {tags.map(t => {
                    const active = (programs[activeDay]?.tags || weeklyTemplate[activeDayName]?.tags || []).includes(t.id);
                    return (
                      <TouchableOpacity key={t.id} onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); toggleDayTag(t.id); }}
                        style={{ backgroundColor: active ? t.color + '99' : theme.bgInput, borderWidth: 1, borderColor: active ? t.color : theme.borderInput, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 }}>
                        <Text style={{ fontSize: 12, fontFamily: 'DMSans_600SemiBold', color: active ? '#ffffff' : theme.textMuted }}>{t.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {(() => {
                  const currentTags = programs[activeDay]?.tags || weeklyTemplate[activeDayName]?.tags || [];
                  const hasChanged = JSON.stringify(currentTags.slice().sort()) !== JSON.stringify(tagModalInitialTags.slice().sort());
                  return hasChanged ? (
                    <TouchableOpacity
                      onPress={() => {
                        triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
                        setShowTagModal(false);
                        showToast('Tags saved', undefined, 'success');
                      }}
                      style={{ marginBottom: 8, paddingVertical: 12, alignItems: 'center', borderRadius: 8, backgroundColor: theme.accentGreenBg, borderWidth: 1, borderColor: theme.accentGreenBorder }}>
                      <Text style={{ color: theme.accentGreen, fontSize: 13, fontFamily: 'DMSans_700Bold', letterSpacing: 1 }}>CONFIRM</Text>
                    </TouchableOpacity>
                  ) : null;
                })()}
                <TouchableOpacity onPress={() => {
  triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
  setShowTagModal(false);
  setEditingTag(null);
  setTagLabelInput('');
  setTagColorInput(TAG_COLOR_PALETTE[0]);
  openManageTags();
}}
                  style={{ paddingVertical: 10, alignItems: 'center', borderTopWidth: 0.5, borderTopColor: theme.borderSubtle }}>
                  <Text style={{ color: theme.accentBlue, fontSize: 13, fontFamily: 'DMSans_600SemiBold' }}>Manage Tags</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Manage Tags Modal */}
      <Modal visible={showManageTagsModal} transparent animationType="none" onRequestClose={closeManageTags} statusBarTranslucent hardwareAccelerated onShow={() => {
        manageTagsAnim.value = 1200;
        Animated.timing(manageTagsOverlayAnim, { toValue: 1, duration: 150, useNativeDriver: true }).start();
        manageTagsAnim.value = withSpring(0, { damping: 80, stiffness: 600 });
      }}>
          <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: theme.overlayBg, opacity: manageTagsOverlayAnim }}>
            <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); closeManageTags(); }} />
          </Animated.View>
          <ToastRenderer />
          <View style={{ flex: 1, justifyContent: 'flex-end' }} pointerEvents="box-none">
            <Reanimated.View style={[{
              backgroundColor: theme.bgSheet,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              borderTopWidth: 0.5,
              borderColor: theme.borderSheet,
              paddingBottom: 40,
            }, manageTagsKeyboardStyle]}>
              <View style={{ maxHeight: '85%' }}>
              <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); closeManageTags(); }} {...manageTagsPanResponder.panHandlers} style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 8 }}>
                <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.sheetHandle }} />
              </TouchableOpacity>
              <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
              <View style={{ paddingHorizontal: 20 }}>
                <Text style={{ color: theme.textPrimary, fontSize: 18, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2, marginBottom: 16 }}>MANAGE TAGS</Text>

                {/* Existing tags list */}
                <View style={{ maxHeight: 280 }}>
                  <DraggableFlatList
                    data={tags}
                    keyExtractor={t => t.id}
                    onDragEnd={({ data }) => saveTags(data)}
                    showsVerticalScrollIndicator={false}
                    scrollEnabled
                    renderItem={({ item: t, drag, isActive }: RenderItemParams<WorkoutTag>) => {
                      const isBeingEdited = editingTag?.id === t.id;
                      const displayLabel = isBeingEdited ? (tagLabelInput || t.label) : t.label;
                      const displayColor = isBeingEdited ? tagColorInput : t.color;
                      return (
                        <ScaleDecorator>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8, opacity: isActive ? 0.85 : 1 }}>
                            <TouchableOpacity onLongPress={drag} style={{ paddingHorizontal: 4, paddingVertical: 8 }}>
                              <Ionicons name="reorder-three-outline" size={18} color={theme.textDim} />
                            </TouchableOpacity>
                            <View style={{ backgroundColor: displayColor + '99', borderWidth: 1, borderColor: displayColor, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text style={{ fontSize: 12, fontFamily: 'DMSans_700Bold', color: '#ffffff', flex: 1 }}>{displayLabel.toUpperCase()}</Text>
                              {t.locked && <Ionicons name="lock-closed" size={10} color="rgba(255,255,255,0.6)" />}
                            </View>
                            {!t.locked && (
                              <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setEditingTag(t); setTagLabelInput(t.label); setTagColorInput(t.color); }}
                                style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: isBeingEdited ? theme.accentGreenBorder : theme.accentBlueBorder, backgroundColor: isBeingEdited ? theme.accentGreenBg : theme.accentBlueBg }}>
                                <Text style={{ fontSize: 11, color: isBeingEdited ? theme.accentGreen : theme.accentBlue, fontFamily: 'DMSans_600SemiBold' }}>{isBeingEdited ? 'Editing' : 'Edit'}</Text>
                              </TouchableOpacity>
                            )}
                            {!t.locked && (
                              <TouchableOpacity onPress={() => {
                                triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                                Alert.alert('Delete Tag', `Delete "${t.label}"?`, [
                                  { text: 'Cancel', style: 'cancel' },
                                  { text: 'Delete', style: 'destructive', onPress: () => { triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy); saveTags(tags.filter(x => x.id !== t.id)); } },
                                ]);
                              }} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: theme.accentRedBorder, backgroundColor: theme.accentRedBg }}>
                                <Text style={{ fontSize: 11, color: theme.accentRed, fontFamily: 'DMSans_600SemiBold' }}>Delete</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </ScaleDecorator>
                      );
                    }}
                  />
                </View>

                {/* Create / edit form */}
                <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 0.5, borderTopColor: theme.borderSubtle }}>
                  <Text style={{ fontSize: 11, color: theme.textMuted, fontFamily: 'DMSans_700Bold', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>
                    {editingTag ? 'Edit Tag' : 'New Tag'}
                  </Text>
                  <TextInput
                    style={{ backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, color: theme.textPrimary, padding: 10, fontSize: 14, fontFamily: 'DMSans_400Regular', marginBottom: 12 }}
                    placeholder="Tag name (max 20 chars)"
                    placeholderTextColor={theme.textPlaceholder}
                    value={tagLabelInput}
                    onChangeText={v => setTagLabelInput(v.slice(0, 20))}
                    maxLength={20}
                  />
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                    {TAG_COLOR_PALETTE.map(c => (
                      <TouchableOpacity key={c} onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setTagColorInput(c); }}
                        style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c, borderWidth: tagColorInput === c ? 3 : 0, borderColor: theme.textPrimary, alignItems: 'center', justifyContent: 'center' }}>
                        {tagColorInput === c && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.6)' }} />}
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {editingTag && (
                      <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setEditingTag(null); setTagLabelInput(''); setTagColorInput(TAG_COLOR_PALETTE[0]); }}
                        style={{ flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: theme.borderInput, backgroundColor: theme.bgInput, alignItems: 'center' }}>
                        <Text style={{ color: theme.textMuted, fontFamily: 'DMSans_600SemiBold', fontSize: 14 }}>Cancel</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      onPress={() => {
                        if (!tagLabelInput.trim()) return;
                        triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
                        if (editingTag) {
                          saveTags(tags.map(t => t.id === editingTag.id ? { ...t, label: tagLabelInput.trim(), color: tagColorInput } : t));
                          setEditingTag(null);
                        } else {
                          if (tags.length >= 20) {
                            showToast('Tag limit reached', 'Max 20 tags in library', 'info');
                            return;
                          }
                          saveTags([...tags, { id: `tag_${Date.now()}`, label: tagLabelInput.trim(), color: tagColorInput }]);
                        }
                        const msg = editingTag ? 'Tag updated' : 'Tag created';
                        const sub = tagLabelInput.trim();
                        setTagLabelInput('');
                        setTagColorInput(TAG_COLOR_PALETTE[0]);
                        setTimeout(() => showToast(msg, sub, 'success'), 400);
                      }}
                      style={{ flex: 1, padding: 12, borderRadius: 8, backgroundColor: tagColorInput, alignItems: 'center' }}>
                      <Text style={{ color: '#ffffff', fontFamily: 'DMSans_700Bold', fontSize: 14 }}>{editingTag ? 'Save Changes' : 'Create Tag'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
              </TouchableWithoutFeedback>
              </View>
            </Reanimated.View>
          </View>
        </Modal>

      {/* FAB backdrop */}
      {showFabMenu && (
        <TouchableOpacity style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} activeOpacity={1} onPress={closeFabMenu} />
      )}

      {/* FAB speed dial items */}
      {showFabMenu && (
        <View style={{ position: 'absolute', bottom: 86, right: 20, alignItems: 'flex-end', gap: 12 }}>
          {/* Load Routine - top */}
          <Animated.View style={{ opacity: fabItem2Anim, transform: [{ translateY: fabItem2Anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <TouchableOpacity
                onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); openLoadRoutineModal(); }}
                style={{ backgroundColor: theme.accentBlue, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 2, borderColor: theme.bgPrimary, shadowColor: theme.accentBlue, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 6 }}>
                <Text style={{ color: '#ffffff', fontSize: 13, fontFamily: 'DMSans_600SemiBold' }}>Load Routine</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); openLoadRoutineModal(); }}
                style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.accentBlue, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: theme.bgPrimary, shadowColor: theme.accentBlue, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 6 }}>
                <Ionicons name="repeat" size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Add Exercise - bottom, first */}
          <Animated.View style={{ opacity: fabItem1Anim, transform: [{ translateY: fabItem1Anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <TouchableOpacity
                onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); closeFabMenu(); router.push({ pathname: '/workout-library', params: { selectMode: 'true', day: activeDay } }); }}
                style={{ backgroundColor: theme.accentBlue, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 2, borderColor: theme.bgPrimary, shadowColor: theme.accentBlue, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 6 }}>
                <Text style={{ color: '#ffffff', fontSize: 13, fontFamily: 'DMSans_600SemiBold' }}>Add Exercise</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); closeFabMenu(); router.push({ pathname: '/workout-library', params: { selectMode: 'true', day: activeDay } }); }}
                style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.accentBlue, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: theme.bgPrimary, shadowColor: theme.accentBlue, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 6 }}>
                <Ionicons name="barbell-outline" size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      )}

      {/* Main FAB */}
      <View ref={workoutFabRef} collapsable={false} style={{ position: 'absolute', bottom: 16, right: 20 }}>
        <Animated.View style={{ transform: [{ scale: fabScale }] }}>
          <TouchableOpacity
            onPress={toggleFabMenu}
            onPressIn={() => Animated.timing(fabScale, { toValue: 0.85, duration: 80, useNativeDriver: true }).start()}
            onPressOut={() => Animated.timing(fabScale, { toValue: 1, duration: 80, useNativeDriver: true }).start()}
            activeOpacity={1}
            style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: theme.accentBlue, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: theme.bgPrimary, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 }}>
            <Ionicons name={showFabMenu ? 'close' : 'add'} size={28} color={theme.bgPrimary} />
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Load Routine Modal */}
      {showLoadRoutineModal && (() => {
        const weekDays = getWeekDaysForPicker(loadPickerWeekOffset);
        const today = new Date();
        const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        const weekLabel = loadPickerWeekOffset === 0 ? 'THIS WEEK' : loadPickerWeekOffset === 1 ? 'NEXT WEEK' : `WEEK OF ${weekDays[0].label}`;
        return (
          <Modal transparent animationType="none" visible onRequestClose={closeLoadRoutineModal}>
            <ToastRenderer />
            <Reanimated.View style={[StyleSheet.absoluteFill, { backgroundColor: theme.overlayBg }, loadRoutineOverlayStyle]} pointerEvents="none" />
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeLoadRoutineModal} />
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 }} pointerEvents="box-none">
              <Reanimated.View style={[{ width: '100%', maxHeight: '75%', backgroundColor: theme.bgSheet, borderRadius: 16, borderWidth: 0.5, borderTopWidth: 1.5, borderColor: theme.borderCard, borderTopColor: theme.accentBlueRaw, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12, overflow: 'hidden' }, loadRoutineCardStyle]}>
                  <TouchableOpacity onPress={closeLoadRoutineModal} style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }} hitSlop={{ top: 8, bottom: 8, left: 80, right: 80 }}>
                    <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: theme.textDim }} />
                  </TouchableOpacity>
                  <View style={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 14, borderBottomWidth: 0.5, borderBottomColor: theme.borderCard }}>
                    <Text style={{ fontSize: 22, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2, color: theme.accentBlueRaw }}>LOAD ROUTINE</Text>
                  </View>

                  <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 28 }}>
                    {(() => {
                      const renderRoutineRow = (r: Routine) => {
                        const isSelected = selectedRoutine?.id === r.id;
                        return (
                          <TouchableOpacity key={r.id} onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setSelectedRoutine(isSelected ? null : r); }}
                            style={{ backgroundColor: isSelected ? theme.accentBlueBg : theme.bgInset, borderRadius: 10, paddingHorizontal: 14, paddingTop: 12, paddingBottom: isSelected ? 14 : 12, marginBottom: 8, borderWidth: 1, borderColor: isSelected ? theme.accentBlueBorder : theme.borderCard }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <View style={{ flex: 1 }}>
                                <Text style={{ color: isSelected ? theme.accentBlue : theme.textPrimary, fontSize: 14, fontFamily: 'DMSans_600SemiBold' }}>{r.name}</Text>
                                <Text style={{ color: theme.textMuted, fontSize: 11, fontFamily: 'DMSans_400Regular', marginTop: 2 }}>
                                  {r.exercises.length} exercise{r.exercises.length !== 1 ? 's' : ''}
                                  {!isSelected && r.tags.length > 0 ? ` · ${r.tags.map(tid => tags.find(t => t.id === tid)?.label).filter(Boolean).join(', ')}` : ''}
                                </Text>
                              </View>
                              <Ionicons name={isSelected ? 'checkmark-circle' : 'chevron-down'} size={18} color={isSelected ? theme.accentBlue : theme.textDim} />
                            </View>
                            {isSelected && (
                              <View style={{ marginTop: 10, borderTopWidth: 0.5, borderTopColor: theme.borderCard, paddingTop: 10 }}>
                                {r.exercises.map((ex) => (
                                  <View key={ex.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 3 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                                      <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: theme.accentBlue, marginRight: 8 }} />
                                      <Text style={{ color: theme.textPrimary, fontSize: 12, fontFamily: 'DMSans_400Regular', flex: 1 }}>{ex.name}</Text>
                                    </View>
                                    <Text style={{ color: theme.textMuted, fontSize: 11, fontFamily: 'DMSans_400Regular' }}>
                                      {ex.isCardio ? `${ex.duration}min` : `${ex.sets}×${ex.reps}`}
                                    </Text>
                                  </View>
                                ))}
                                {r.tags.length > 0 && (
                                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                                    {r.tags.map(tid => {
                                      const tag = tags.find(t => t.id === tid);
                                      if (!tag) return null;
                                      return (
                                        <View key={tid} style={{ backgroundColor: tag.color + '40', borderWidth: 1, borderColor: tag.color, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 }}>
                                          <Text style={{ color: tag.color, fontSize: 10, fontFamily: 'DMSans_700Bold', letterSpacing: 1 }}>{tag.label.toUpperCase()}</Text>
                                        </View>
                                      );
                                    })}
                                  </View>
                                )}
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      };
                      return (
                        <>
                          <Text style={{ fontSize: 9, letterSpacing: 3, color: theme.textMuted, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase', marginBottom: 10 }}>PRESETS</Text>
                          {PRESET_ROUTINES.map(renderRoutineRow)}
                          {routines.length > 0 && (
                            <>
                              <Text style={{ fontSize: 9, letterSpacing: 3, color: theme.textMuted, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase', marginBottom: 10, marginTop: 8 }}>MY ROUTINES</Text>
                              {routines.map(renderRoutineRow)}
                            </>
                          )}

                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, marginTop: 8 }}>
                            <Text style={{ fontSize: 9, letterSpacing: 3, color: theme.textMuted, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase' }}>{weekLabel}</Text>
                            <View style={{ flexDirection: 'row', gap: 2 }}>
                              <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setLoadPickerWeekOffset(o => o - 1); }} disabled={loadPickerWeekOffset <= 0} style={{ padding: 6, opacity: loadPickerWeekOffset <= 0 ? 0.25 : 1 }}>
                                <Ionicons name="chevron-back" size={18} color={theme.textMuted} />
                              </TouchableOpacity>
                              <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setLoadPickerWeekOffset(o => o + 1); }} style={{ padding: 6 }}>
                                <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
                              </TouchableOpacity>
                            </View>
                          </View>
                          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 20 }}>
                            {weekDays.map(d => {
                              const isSel = selectedLoadDays.includes(d.key);
                              const isToday = d.key === activeDay;
                              const isPast = d.key < todayKey;
                              return (
                                <TouchableOpacity key={d.key}
                                  disabled={isPast}
                                  onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setSelectedLoadDays(prev => prev.includes(d.key) ? prev.filter(k => k !== d.key) : [...prev, d.key]); }}
                                  style={{ flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', backgroundColor: isSel ? theme.accentBlue : theme.bgInset, borderWidth: 1, borderColor: isSel ? theme.accentBlue : isToday ? theme.textSecondary : theme.borderCard, opacity: isPast ? 0.25 : 1 }}>
                                  <Text style={{ fontSize: 10, fontFamily: 'DMSans_700Bold', color: isSel ? '#ffffff' : theme.textMuted, letterSpacing: 0.5 }}>{d.name.toUpperCase()}</Text>
                                  <Text style={{ fontSize: 9, fontFamily: 'DMSans_400Regular', color: isSel ? 'rgba(255,255,255,0.7)' : theme.textDim, marginTop: 2 }}>{d.label}</Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>

                          <TouchableOpacity onPress={handleLoadRoutine}
                            disabled={!selectedRoutine || selectedLoadDays.length === 0}
                            style={{ paddingVertical: 14, borderRadius: 10, alignItems: 'center', backgroundColor: theme.accentBlue, opacity: selectedRoutine && selectedLoadDays.length > 0 ? 1 : 0.4 }}>
                            <Text style={{ color: '#ffffff', fontFamily: 'BebasNeue_400Regular', fontSize: 18, letterSpacing: 2 }}>
                              LOAD TO {selectedLoadDays.length} {selectedLoadDays.length === 1 ? 'DAY' : 'DAYS'}
                            </Text>
                          </TouchableOpacity>
                        </>
                      );
                    })()}
                  </ScrollView>
              </Reanimated.View>
            </View>
          </Modal>
        );
      })()}

      {showInfoModal && infoExercise && (
        <Modal transparent animationType="none" visible onRequestClose={closeInfoModal}>
          <Reanimated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)' }, infoOverlayStyle]} pointerEvents="none" />
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeInfoModal} />
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 }} pointerEvents="box-none">
            <Reanimated.View pointerEvents="box-none" style={[{ width: '100%', maxHeight: '80%' }, infoCardStyle]}>
              <View pointerEvents="auto" style={{ backgroundColor: theme.bgSheet, borderRadius: 16, borderWidth: 0.5, borderTopWidth: 1.5, borderColor: theme.borderCard, borderTopColor: theme.accentBlueRaw, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12, overflow: 'hidden' }}>
                <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                    <Text style={{ flex: 1, fontSize: 22, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1.5, color: theme.accentBlueRaw, paddingRight: 12 }}>{infoExercise.name}</Text>
                    <TouchableOpacity onPress={closeInfoModal} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="close" size={20} color={theme.textMuted} />
                    </TouchableOpacity>
                  </View>

                  {(infoExercise.primaryMuscles?.length || infoExercise.secondaryMuscles?.length) ? (
                    <View style={{ marginBottom: 16 }}>
                      <MuscleMap primaryMuscles={infoExercise.primaryMuscles} secondaryMuscles={infoExercise.secondaryMuscles} scale={0.62} />
                      <Text style={{ fontSize: 9, letterSpacing: 3, color: theme.textMuted, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase', marginBottom: 8, marginTop: 12 }}>MUSCLES</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        {infoExercise.primaryMuscles?.map((m: string) => (
                          <View key={m} style={{ backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 }}>
                            <Text style={{ color: theme.accentBlue, fontSize: 11, fontFamily: 'DMSans_600SemiBold' }}>
                              {m.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                            </Text>
                          </View>
                        ))}
                        {infoExercise.secondaryMuscles?.map((m: string) => (
                          <View key={m} style={{ backgroundColor: theme.bgInset, borderWidth: 1, borderColor: theme.borderCard, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 }}>
                            <Text style={{ color: theme.textMuted, fontSize: 11, fontFamily: 'DMSans_500Medium' }}>
                              {m.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ) : null}

                  {infoExercise.instructions?.length ? (
                    <View>
                      <Text style={{ fontSize: 9, letterSpacing: 3, color: theme.textMuted, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase', marginBottom: 10 }}>HOW TO PERFORM</Text>
                      {infoExercise.instructions.map((step: string, i: number) => (
                        <View key={i} style={{ flexDirection: 'row', marginBottom: 10, gap: 10 }}>
                          <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                            <Text style={{ color: theme.accentBlue, fontSize: 11, fontFamily: 'DMSans_700Bold' }}>{i + 1}</Text>
                          </View>
                          <Text style={{ flex: 1, color: theme.textSecondary, fontSize: 13, fontFamily: 'DMSans_400Regular', lineHeight: 19 }}>{step}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </ScrollView>
              </View>
            </Reanimated.View>
          </View>
        </Modal>
      )}

      <HRZoneModal visible={hrModalVisible} loading={hrModalLoading} data={hrModalData} onClose={() => setHrModalVisible(false)} />

    </LinearGradient>
    </GestureHandlerRootView>
  );
}


const styles = StyleSheet.create({
  container:            { flex: 1 },
  content:              { padding: 16, paddingBottom: 100 },
  header:               { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 0.5, marginBottom: 16 },
  headerLabel:          { fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2, fontFamily: 'DMSans_700Bold' },
  headerTitle:          { fontSize: 32, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2 },
  dayTabsContainer:     { marginBottom: 16 },
  dayTab:               { width: 72, height: 74, paddingVertical: 8, borderRadius: 8, borderWidth: 0.5, marginRight: 8, alignItems: 'center', justifyContent: 'center' },
  dayTabText:           { fontSize: 13, fontWeight: '700', fontFamily: 'DMSans_700Bold' },
  dayTabSub:            { fontSize: 9, letterSpacing: 1, marginTop: 2, fontFamily: 'DMSans_700Bold' },
  cardioCard:           { borderWidth: 0.5, borderTopWidth: 1.5, borderRadius: 14, padding: 28, alignItems: 'center' },
  cardioIcon:           { fontSize: 40, marginBottom: 12 },
  cardioTitle:          { fontSize: 26, letterSpacing: 2, marginBottom: 8, fontFamily: 'BebasNeue_400Regular' },
  cardioDetail:         { fontSize: 10, textAlign: 'center', lineHeight: 20, fontFamily: 'DMSans_700Bold', marginBottom: 16, letterSpacing: 1.5, textTransform: 'uppercase' },
  cardioCompleteBtn:    { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, borderWidth: 0.5 },
  cardioCompleteBtnDone:{ },
  cardioCompleteBtnText:{ fontFamily: 'BebasNeue_400Regular', fontSize: 16, letterSpacing: 2 },
  progressRow:          { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  progressLabel:        { fontSize: 15, flex: 1, fontFamily: 'DMSans_600SemiBold' },
  progressCount:        { fontSize: 24, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1 },
  progressBarBg:        { height: 2, borderRadius: 2, overflow: 'hidden', marginBottom: 16 },
  progressBarFill:      { height: '100%', borderRadius: 2 },
  exerciseItem:         { borderWidth: 0.5, borderLeftWidth: 3, borderRadius: 10, padding: 14, marginBottom: 8, shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6 },
  exerciseDone:         { opacity: 0.87 },
  exerciseRow:          { flexDirection: 'row', alignItems: 'flex-start' },
  exerciseInfo:         { flex: 1 },
  exerciseNameRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 },
  exerciseName:         { fontSize: 14, fontWeight: '600', fontFamily: 'DMSans_600SemiBold' },
  exerciseNameDone:     {},
  exerciseMeta:         { fontSize: 10, marginBottom: 4, fontFamily: 'DMSans_700Bold', letterSpacing: 1, textTransform: 'uppercase' },
  exerciseNote:         { fontSize: 11, fontStyle: 'italic', lineHeight: 16, fontFamily: 'DMSans_400Regular' },
  badge:                { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3 },
  badgeText:            { fontSize: 9, fontWeight: '700', letterSpacing: 1, fontFamily: 'DMSans_700Bold' },
  checkCircle:          { width: 24, height: 24, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  checkMark:            { fontSize: 13, fontWeight: '700' },
  addExBtn:             { marginTop: 12, padding: 14, borderWidth: 0.5, borderRadius: 10, alignItems: 'center' },
  addExBtnText:         { fontFamily: 'BebasNeue_400Regular', fontSize: 16, letterSpacing: 2 },
  completeMsg:          { padding: 16, marginTop: 8, alignItems: 'center' },
  completeMsgText:      { fontSize: 32, letterSpacing: 4, fontFamily: 'BebasNeue_400Regular' },
  card:                 { borderWidth: 0.5, borderTopWidth: 1.5, borderRadius: 14, padding: 16, shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6 },
  cardLabel:            { fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'DMSans_700Bold' },
  notesInput:           { borderWidth: 0.5, borderRadius: 8, padding: 10, fontSize: 13, minHeight: 80, textAlignVertical: 'top', marginTop: 10, fontFamily: 'DMSans_400Regular' },
  saveNoteBtn:          { marginTop: 8, padding: 10, borderWidth: 0.5, borderRadius: 6, alignItems: 'center' },
  saveNoteBtnText:      { fontSize: 12, fontFamily: 'DMSans_600SemiBold' },
  modalOverlay:         { flex: 1, justifyContent: 'flex-end' },
  modal:                { borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 24, borderWidth: 0.5 },
  modalTitle:           { fontSize: 22, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1, marginBottom: 16 },
  modalInput:           { borderWidth: 0.5, borderRadius: 8, padding: 10, fontSize: 14, fontFamily: 'DMSans_400Regular', marginBottom: 10 },
  modalRow:             { flexDirection: 'row', gap: 8 },
  modalBtns:            { flexDirection: 'row', gap: 8, marginTop: 8 },
  modalCancelBtn:       { flex: 1, padding: 12, borderWidth: 0.5, borderRadius: 8, alignItems: 'center' },
  modalCancelBtnText:   { fontFamily: 'DMSans_600SemiBold', fontSize: 14 },
  modalSaveBtn:         { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
  modalSaveBtnText:     { fontFamily: 'BebasNeue_400Regular', fontSize: 16, letterSpacing: 1 },
  libraryBtn:           { borderWidth: 1, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 },
  libraryBtnText:       { fontSize: 14, fontFamily: 'DMSans_700Bold' },
  cardioFieldRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 0.5 },
  cardioFieldLabel:     { fontSize: 13, fontFamily: 'DMSans_400Regular', flex: 1 },
  cardioFieldInput:     { borderWidth: 0.5, borderRadius: 6, padding: 8, fontSize: 14, fontFamily: 'DMSans_400Regular', width: 100, textAlign: 'right' },
});