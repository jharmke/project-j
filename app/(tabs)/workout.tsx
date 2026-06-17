import { Ionicons } from '@expo/vector-icons';
import { IconSymbol } from '@/components/ui/icon-symbol';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Animated, AppState, Keyboard, KeyboardAvoidingView, Modal, PanResponder, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
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
import { useTheme } from '../../theme';
import HeaderAvatar from '../../components/HeaderAvatar';
import { useHealthKit } from '../../useHealthKit';
import { BLANK_DAY, DEFAULT_TAGS, DayProgram, Exercise, Routine, TAG_COLOR_PALETTE, WorkoutTag, PRESET_ROUTINES } from '../../workoutData';
import MuscleMap from '../../components/MuscleMap';
import { showToolkit } from '../../components/ToolkitSheet';
import { useTutorial } from '../../context/TutorialContext';
import { useTutorialTarget } from '../../hooks/useTutorialTarget';


const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];


const makeId = () => Math.random().toString(36).substr(2, 9);

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
  const [form, setForm] = useState({ name: '', sets: '', reps: '', rest: '', note: '', isCardio: false, duration: '', distance: '', speed: '', incline: '', resistance: '', hr: '', calories: ''});
const [cardioLogs, setCardioLogs] = useState<Record<string, any>>({});
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
  const addExerciseKeyboardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: addExerciseScale.value }, { translateY: addExerciseKeyboardY.value }],
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
      setForm({ name: '', sets: '', reps: '', rest: '', note: '', isCardio: false, duration: '', distance: '', speed: '', incline: '', resistance: '', hr: '', calories: '' });
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
      addExerciseKeyboardY.value = withTiming(-e.endCoordinates.height / 2, { duration: e.duration || 250 });
    });
    const hide = Keyboard.addListener('keyboardWillHide', e => {
      manageTagsKeyboardOffset.value = withTiming(0, { duration: e.duration || 250 });
      addExerciseKeyboardY.value = withTiming(0, { duration: e.duration || 250 });
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
const { activeCalories, appleWorkouts, fetchTodayData } = useHealthKit();

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

  setPrograms(prev => {
    const current: DayProgram = prev[todayKey] ? { ...prev[todayKey] } : { type: 'cardio', focus: 'Cardio', exercises: [] };
    const existingUUIDs = new Set(current.exercises.map((e: any) => e.appleHealthUUID).filter(Boolean));
    const newExercises: any[] = [];

    for (const w of appleWorkouts) {
      if (existingUUIDs.has(w.uuid)) continue;
      const durationMin = formatDuration(w.duration.quantity);
      const calories = Math.round(w.totalEnergyBurned?.quantity ?? 0);
      const distanceMi = w.totalDistance ? Math.round((w.totalDistance.quantity / 1609.34) * 100) / 100 : null;
      const name = WORKOUT_TYPE_NAMES[w.workoutActivityType] ?? 'Workout';
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

    if (newExercises.length === 0) return prev;
    // An Apple Health workout landing on a rest day means it wasn't really a rest day.
    // Flip off 'rest' so the imported exercises aren't silently hidden by the rest-day view.
    const flippedType = current.type === 'rest' ? 'cardio' : current.type;
    const flippedFocus = current.type === 'rest' ? 'Cardio' : current.focus;
    const updated = {
      ...prev,
      [todayKey]: {
        ...current,
        type: flippedType,
        focus: flippedFocus,
        exercises: [...current.exercises, ...newExercises],
      },
    };
    const newCheckIds = newExercises.map((e: any) => e.id);
    AsyncStorage.getItem('pj_workout_state').then(saved => {
      const current2 = saved ? JSON.parse(saved) : {};
      const updatedChecks = { ...(current2.checks || {}), [todayKey]: { ...(current2.checks?.[todayKey] || {}), ...Object.fromEntries(newCheckIds.map((id: string) => [id, true])) } };
      storageSet('pj_workout_state', JSON.stringify({ ...current2, programs: updated, checks: updatedChecks }));
      setChecks(prevChecks => {
        const c = { ...prevChecks };
        c[todayKey] = { ...(c[todayKey] || {}), ...Object.fromEntries(newCheckIds.map((id: string) => [id, true])) };
        return c;
      });
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
const dayChecks = checks[activeDay] || {};
const doneCount = exercises.filter(ex => dayChecks[ex.id]).length;
const color = theme.accentBlue;
const noteCurrentText = workoutNotes[activeDay]?.trim() || '';
const noteLastSaved = savedNoteText[activeDay]?.trim() || '';
const noteIsDirty = noteCurrentText !== noteLastSaved;
const modalCanSave = editingExercise
  ? JSON.stringify(form) !== JSON.stringify(originalForm.current)
  : !!form.name.trim();

useEffect(() => {
  const pct = exercises.length > 0 ? doneCount / exercises.length : 0;
  Animated.timing(progressAnim, { toValue: pct, duration: 300, useNativeDriver: false }).start();
}, [doneCount, exercises.length]);

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
          if (data.activeProgramName) setActiveProgramName(data.activeProgramName);
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
          }
        } catch (e) {
          console.log('Reload error', e);
        }
      };
      reload();
      fetchTodayData();
    }, [])
  );

  const saveState = async (newChecks = checks, newCardio = cardioComplete, newPrograms = programs, newNotes = workoutNotes, newCardioLogs = cardioLogs, newTemplate = weeklyTemplate, newProgramName = activeProgramName, newNoteNames = workoutNoteNames) => {
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
    }));
  } catch (e) {
    console.log('Save error', e);
  }
};

  const toggleExercise = (id: string) => {
  triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
  const dayChecks = checks[activeDay] || {};
  const nowChecked = !dayChecks[id];
  const newDayChecks = { ...dayChecks, [id]: nowChecked };
  const newChecks = { ...checks, [activeDay]: newDayChecks };
  setChecks(newChecks);
  saveState(newChecks);
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
  setPrograms(newPrograms);
  setDayLabel(newPrograms[activeDay]?.customLabel || '');
  saveState(checks, cardioComplete, newPrograms, workoutNotes, cardioLogs, weeklyTemplate);
  closeAddExerciseModal();
  if (editingExercise) showToast('Exercise updated', form.name, 'success');
  checkWorkoutAchievements().then(unlocked => {
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
        const baseProgram = programs[day] || weeklyTemplate[DATES.find(d => d.key === day)?.dayName || 'Mon'] || BLANK_DAY;
        const newPrograms = { ...programs };
        newPrograms[day] = {
          ...baseProgram,
          exercises: baseProgram.exercises.filter(ex => ex.id !== id),
        };
        const newDayChecks = { ...(checks[day] || {}) };
        delete newDayChecks[id];
        const newChecks = { ...checks, [day]: newDayChecks };
        setPrograms(newPrograms);
        setChecks(newChecks);
        saveState(newChecks, cardioComplete, newPrograms, workoutNotes, cardioLogs, weeklyTemplate);
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
                <Text style={[styles.progressCount, { color: doneCount === exercises.length && exercises.length > 0 ? theme.statusGood : color }]}>{doneCount}/{exercises.length}</Text>
              </View>
            </View>
            <View style={[styles.progressBarBg, { backgroundColor: theme.bgProgressTrack }]}>
              <Animated.View style={[styles.progressBarFill, { width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }), backgroundColor: theme.accentBlue }]} />
            </View>
          </>
        )}

        <DraggableFlatList
          data={isRest ? [] : exercises}
          keyExtractor={(ex: any) => ex.id}
          onDragEnd={({ data }) => {
            const baseProgram = programs[activeDay] || weeklyTemplate[activeDayName];
            const newPrograms = { ...programs, [activeDay]: { ...baseProgram, exercises: data } };
            setPrograms(newPrograms);
            saveState(checks, cardioComplete, newPrograms, workoutNotes, cardioLogs, weeklyTemplate);
          }}
          renderItem={({ item: ex, drag, isActive }: RenderItemParams<any>) => {
            const isDone = dayChecks[ex.id];
            return (
              <ScaleDecorator>
                <View
                  ref={ex.id === 'tutorial_demo_bench' ? firstExerciseRef : undefined}
                  collapsable={false}
                  style={[styles.exerciseItem, isDone && styles.exerciseDone, {
                  backgroundColor: theme.bgCard,
                  borderColor: theme.borderCard,
                  borderLeftColor: isDone ? theme.accentBlue : theme.textDim,
                  opacity: isActive ? 0.9 : 1
                }]}>
                  <View style={styles.exerciseRow}>
                    <TouchableOpacity onLongPress={drag} style={{ paddingRight: 10, justifyContent: 'center' }}>
                      <Text style={{ color: theme.textDim, fontSize: 18, lineHeight: 14 }}>⠿</Text>
                    </TouchableOpacity>
                    <View style={styles.exerciseInfo}>
                      <TouchableOpacity style={styles.exerciseNameRow} activeOpacity={0.7}
                        onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); openInfoModal(ex.name); }}>
                        <Text style={[styles.exerciseName, { color: theme.textSecondary }, isDone && [styles.exerciseNameDone, { color: theme.textDim }]]}>{ex.name}</Text>
                        {exerciseLibrary.find((e: any) => e.name === ex.name && (e.instructions?.length || e.primaryMuscles?.length)) ? (
                          <Ionicons name="information-circle-outline" size={14} color={theme.textDim} style={{ marginLeft: 4, marginTop: 1 }} />
                        ) : null}
                        {ex.fromAppleHealth && (
                          <View style={[styles.badge, { backgroundColor: theme.accentGreenBg, borderWidth: 1, borderColor: theme.accentGreenBorder }]}>
                            <Text style={[styles.badgeText, { color: theme.accentGreen }]}>APPLE HEALTH</Text>
                          </View>
                        )}
                        {ex.dropset && (
                          <View style={[styles.badge, { backgroundColor: color + '22' }]}>
                            <Text style={[styles.badgeText, { color }]}>DROPSET</Text>
                          </View>
                        )}
                      </TouchableOpacity>
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
                        </View>
                      ) : (
                        <View ref={ex.id === 'tutorial_demo_bench' ? firstSetsRepsRef : undefined} collapsable={false}>
                          <Text style={[styles.exerciseMeta, { color: theme.textMuted }]}>{ex.sets} sets · {ex.reps} reps · {ex.rest} rest</Text>
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
                        onPress={() => toggleExercise(ex.id)}>
                        {isDone && <Text style={[styles.checkMark, { color: theme.bgPrimary }]}>✓</Text>}
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </ScaleDecorator>
            );
          }}
        />

        {!isRest && exercises.length === 0 && (
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
              style={{ flex: 1, fontSize: 13, color: theme.textPrimary, fontFamily: 'DMSans_600SemiBold', padding: 0, marginRight: 8 }}
              value={workoutNoteNames[activeDay] ?? ''}
              onChangeText={v => setWorkoutNoteNames(prev => ({ ...prev, [activeDay]: v }))}
              onBlur={() => saveState()}
              placeholder="Workout Note"
              placeholderTextColor={theme.textMuted}
              maxLength={40}
              returnKeyType="done"
            />
            <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); router.push('/journal'); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="book" size={16} color={theme.accentBlue} />
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
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 }} pointerEvents="box-none">
          <Reanimated.View style={[{ width: '100%' }, addExerciseKeyboardStyle]} pointerEvents="box-none">
            <View pointerEvents="auto" style={{ backgroundColor: theme.bgSheet, borderRadius: 16, borderWidth: 0.5, borderTopWidth: 1.5, borderColor: theme.borderCard, borderTopColor: theme.accentBlueRaw, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 20, overflow: 'hidden' }}>
              <TouchableOpacity onPress={closeAddExerciseModal} style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 4 }}>
                <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.borderCard }} />
              </TouchableOpacity>
              <View style={{ paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 0.5, borderBottomColor: theme.borderCard }}>
                <Text style={[styles.modalTitle, { color: theme.accentBlue }]}>{editingExercise ? 'EDIT EXERCISE' : 'ADD EXERCISE'}</Text>
              </View>
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <View style={{ padding: 20 }}>
                  <TextInput style={[styles.modalInput, { backgroundColor: theme.bgInput, borderColor: theme.borderInput, color: theme.textPrimary }]} placeholder="Exercise name" placeholderTextColor={theme.textPlaceholder} value={form.name} onChangeText={v => setForm(p => ({ ...p, name: v }))} autoCapitalize="words" />
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
                    <View style={styles.modalRow}>
                      <TextInput style={[styles.modalInput, { backgroundColor: theme.bgInput, borderColor: theme.borderInput, color: theme.textPrimary, flex: 1 }]} placeholder="Sets" placeholderTextColor={theme.textPlaceholder} keyboardType="number-pad" value={form.sets || ''} onChangeText={v => setForm(p => ({ ...p, sets: v.replace(/[^0-9]/g, '') }))} />
                      <TextInput style={[styles.modalInput, { backgroundColor: theme.bgInput, borderColor: theme.borderInput, color: theme.textPrimary, flex: 1 }]} placeholder="Reps" placeholderTextColor={theme.textPlaceholder} keyboardType="number-pad" value={form.reps || ''} onChangeText={v => setForm(p => ({ ...p, reps: v.replace(/[^0-9]/g, '') }))} />
                      <TextInput style={[styles.modalInput, { backgroundColor: theme.bgInput, borderColor: theme.borderInput, color: theme.textPrimary, flex: 1 }]} placeholder="Rest" placeholderTextColor={theme.textPlaceholder} keyboardType="number-pad" value={form.rest || ''} onChangeText={v => setForm(p => ({ ...p, rest: v.replace(/[^0-9]/g, '') }))} />
                    </View>
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
                style={{ backgroundColor: theme.accentBlue, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, shadowColor: theme.accentBlue, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 6 }}>
                <Text style={{ color: '#ffffff', fontSize: 13, fontFamily: 'DMSans_600SemiBold' }}>Load Routine</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); openLoadRoutineModal(); }}
                style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.accentBlue, alignItems: 'center', justifyContent: 'center', shadowColor: theme.accentBlue, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 6 }}>
                <Ionicons name="repeat" size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Add Exercise - bottom, first */}
          <Animated.View style={{ opacity: fabItem1Anim, transform: [{ translateY: fabItem1Anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <TouchableOpacity
                onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); closeFabMenu(); router.push({ pathname: '/workout-library', params: { selectMode: 'true', day: activeDay } }); }}
                style={{ backgroundColor: theme.accentBlue, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, shadowColor: theme.accentBlue, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 6 }}>
                <Text style={{ color: '#ffffff', fontSize: 13, fontFamily: 'DMSans_600SemiBold' }}>Add Exercise</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); closeFabMenu(); router.push({ pathname: '/workout-library', params: { selectMode: 'true', day: activeDay } }); }}
                style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.accentBlue, alignItems: 'center', justifyContent: 'center', shadowColor: theme.accentBlue, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 6 }}>
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
            style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: theme.accentBlue, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 }}>
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
  exerciseNameDone:     { textDecorationLine: 'line-through' },
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