import { IconSymbol } from '@/components/ui/icon-symbol';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Animated, Keyboard, KeyboardAvoidingView, Modal, PanResponder, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Reanimated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ToastRenderer, useToast } from '../../components/Toast';
import { useTheme } from '../../theme';
import { useHealthKit } from '../../useHealthKit';
import { DEFAULT_PROGRAM, DEFAULT_TAGS, DayProgram, Exercise, TAG_COLOR_PALETTE, WorkoutTag } from '../../workoutData';


const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];


const makeId = () => Math.random().toString(36).substr(2, 9);

function getTodayDay() {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()];
}
const today = new Date();
const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

export default function WorkoutScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { showToast } = useToast();
  const [activeDay, setActiveDay] = useState(todayKey);
  const [loaded, setLoaded] = useState(false);
  const [checks, setChecks] = useState<Record<string, Record<string, boolean>>>({});
const [cardioComplete, setCardioComplete] = useState<Record<string, boolean>>({});
const [programs, setPrograms] = useState<Record<string, DayProgram>>({});
const [workoutNotes, setWorkoutNotes] = useState<Record<string, string>>({});
const [weeklyTemplate, setWeeklyTemplate] = useState<Record<string, DayProgram>>(DEFAULT_PROGRAM);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [modalDay, setModalDay] = useState('');
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [dayLabel, setDayLabel] = useState('');
  const dayScrollRef = useRef<any>(null);
  const hasScrolled = useRef(false);
const [labelInput, setLabelInput] = useState('');
  const [form, setForm] = useState({ name: '', sets: '3', reps: '10–12', rest: '60s', note: '', isCardio: false, duration: '', distance: '', speed: '', incline: '', resistance: '', hr: '', calories: ''});
const [cardioLogs, setCardioLogs] = useState<Record<string, any>>({});
  const [calBurnedSaved, setCalBurnedSaved] = useState(false);
  const [tags, setTags] = useState<WorkoutTag[]>(DEFAULT_TAGS);
  const [showTagModal, setShowTagModal] = useState(false);
  const [showManageTagsModal, setShowManageTagsModal] = useState(false);
  const [tagModalInitialTags, setTagModalInitialTags] = useState<string[]>([]);
  const manageTagsAnim = useSharedValue(600);
  const manageTagsOverlayAnim = useRef(new Animated.Value(0)).current;
  

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
    });
    const hide = Keyboard.addListener('keyboardWillHide', e => {
      manageTagsKeyboardOffset.value = withTiming(0, { duration: e.duration || 250 });
    });
    return () => { show.remove(); hide.remove(); };
  }, []);

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
const { activeCalories, appleWorkouts } = useHealthKit();

useEffect(() => {
  if (activeCalories > 0) {
    setCardioLogs(prev => {
      const updated = { ...prev, [todayKey]: { ...(prev[todayKey] || {}), caloriesBurned: String(activeCalories) } };
      AsyncStorage.getItem('pj_workout_state').then(saved => {
        const current = saved ? JSON.parse(saved) : {};
        AsyncStorage.setItem('pj_workout_state', JSON.stringify({ ...current, cardioLogs: updated }));
      });
      AsyncStorage.getItem(`pj_${todayKey}`).then(saved => {
        const current = saved ? JSON.parse(saved) : {};
        AsyncStorage.setItem(`pj_${todayKey}`, JSON.stringify({ ...current, caloriesBurned: activeCalories }));
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
        isCardio: true,
        duration: String(durationMin),
        distance: distanceMi ? String(distanceMi) : '',
        calories: String(calories),
        fromAppleHealth: true,
        appleHealthUUID: w.uuid,
        appleStartDate: w.startDate,
      });
    }

    if (newExercises.length === 0) return prev;
    const updated = {
      ...prev,
      [todayKey]: {
        ...current,
        exercises: [...current.exercises, ...newExercises],
      },
    };
    AsyncStorage.getItem('pj_workout_state').then(saved => {
      const current2 = saved ? JSON.parse(saved) : {};
      AsyncStorage.setItem('pj_workout_state', JSON.stringify({ ...current2, programs: updated }));
    });
    return updated;
  });
}, [appleWorkouts]);

const generate21Days = () => {
  const days = [];
  for (let i = -7; i <= 30; i++) {
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
const program = programs[activeDay] || weeklyTemplate[activeDayName] || { type: 'cardio' as const, focus: 'Cardio', color: '#f97316', exercises: [] };
const isLift = program?.type === 'lift';
const isRest = program?.type === 'rest';
const exercises = program?.exercises || [];
const dayChecks = checks[activeDay] || {};
const doneCount = exercises.filter(ex => dayChecks[ex.id]).length;
const color = program?.color || '#f97316';

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
          if (data.workoutNotes) setWorkoutNotes(data.workoutNotes);
          if (data.cardioLogs) setCardioLogs(data.cardioLogs);
          if (data.weeklyTemplate) setWeeklyTemplate(data.weeklyTemplate);
        }
        const settings = await AsyncStorage.getItem('pj_settings');
        if (settings) {
          const s = JSON.parse(settings);
          if (s.workoutTags && Array.isArray(s.workoutTags)) setTags(s.workoutTags);
        }
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
if (data.workoutNotes) setWorkoutNotes(data.workoutNotes);
if (data.cardioLogs) setCardioLogs(data.cardioLogs);
if (data.weeklyTemplate) setWeeklyTemplate(data.weeklyTemplate);
          }
        } catch (e) {
          console.log('Reload error', e);
        }
      };
      reload();
    }, [])
  );

  const saveState = async (newChecks = checks, newCardio = cardioComplete, newPrograms = programs, newNotes = workoutNotes, newCardioLogs = cardioLogs, newTemplate = weeklyTemplate) => {
  try {
    await AsyncStorage.setItem('pj_workout_state', JSON.stringify({
      checks: newChecks,
      cardioComplete: newCardio,
      programs: newPrograms,
      workoutNotes: newNotes,
      cardioLogs: newCardioLogs,
      weeklyTemplate: newTemplate,
    }));
  } catch (e) {
    console.log('Save error', e);
  }
};

  const toggleExercise = (id: string) => {
  const dayChecks = checks[activeDay] || {};
  const newDayChecks = { ...dayChecks, [id]: !dayChecks[id] };
  const newChecks = { ...checks, [activeDay]: newDayChecks };
  setChecks(newChecks);
  saveState(newChecks);
};

  const toggleCardio = (day: string) => {
    const newCardio = { ...cardioComplete, [day]: !cardioComplete[day] };
    setCardioComplete(newCardio);
    saveState(checks, newCardio);
  };

  const openAddModal = (day: string) => {
    setModalDay(day);
    setEditingExercise(null);
    setForm({ name: '', sets: '3', reps: '10–12', rest: '60s', note: '', isCardio: false, duration: '', distance: '', speed: '', incline: '', resistance: '', hr: '', calories: '' });
    setShowAddModal(true);
  };

  const openEditModal = (day: string, exercise: Exercise) => {
    setModalDay(day);
    setEditingExercise(exercise);
    setForm({ 
      name: exercise.name, 
      sets: exercise.sets, 
      reps: exercise.reps, 
      rest: exercise.rest, 
      note: exercise.note,
      isCardio: exercise.isCardio || false,
      duration: (exercise as any).duration || '',
      distance: (exercise as any).distance || '',
      speed: (exercise as any).speed || '',
      incline: (exercise as any).incline || '',
      resistance: (exercise as any).resistance || '',
      hr: (exercise as any).hr || '',
      calories: (exercise as any).calories || '',
    });
    setShowAddModal(true);
  };

  const saveExercise = () => {
  if (!form.name.trim()) return;
  const baseProgram = programs[modalDay] || weeklyTemplate[DATES.find(d => d.key === modalDay)?.dayName || 'Mon'] || { type: 'cardio' as const, focus: 'Cardio', color: '#f97316', exercises: [] };
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
    newPrograms[modalDay] = {
      ...baseProgram,
      exercises: [...(baseProgram.exercises || []), newEx],
    };
  }
  setPrograms(newPrograms);
  setDayLabel(newPrograms[activeDay]?.customLabel || '');
  saveState(checks, cardioComplete, newPrograms, workoutNotes, cardioLogs, weeklyTemplate);
  setShowAddModal(false);
  showToast(editingExercise ? 'Exercise updated' : 'Exercise added', form.name, 'success');
};

  const removeExercise = (day: string, id: string) => {
  Alert.alert('Remove Exercise', 'Are you sure?', [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Remove', style: 'destructive',
      onPress: () => {
        const baseProgram = programs[day] || weeklyTemplate[DATES.find(d => d.key === day)?.dayName || 'Mon'];
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

  const saveNote = () => {
    saveState(checks, cardioComplete, programs, workoutNotes);
    showToast('Note saved', undefined, 'success');
  };

  const saveTags = async (newTags: WorkoutTag[]) => {
    setTags(newTags);
    try {
      const s = await AsyncStorage.getItem('pj_settings');
      const current = s ? JSON.parse(s) : {};
      await AsyncStorage.setItem('pj_settings', JSON.stringify({ ...current, workoutTags: newTags }));
    } catch (e) { console.log('Tag save error', e); }
  };

  const toggleDayTag = (tagId: string) => {
    const baseProgram = programs[activeDay] || weeklyTemplate[activeDayName] || { type: 'unassigned' as const, focus: 'Unassigned', exercises: [] };
    const currentTags = baseProgram.tags || [];
    if (!currentTags.includes(tagId) && currentTags.length >= 6) {
      showToast('Tag limit reached', 'Max 6 tags per day', 'info');
      return;
    }
    const newTags = currentTags.includes(tagId)
      ? currentTags.filter(t => t !== tagId)
      : [...currentTags, tagId];
    const newPrograms = {
      ...programs,
      [activeDay]: { ...baseProgram, tags: newTags },
    };
    setPrograms(newPrograms);
    saveState(checks, cardioComplete, newPrograms, workoutNotes, cardioLogs, weeklyTemplate);
  };

  const getDayTagObjects = (dayKey: string): WorkoutTag[] => {
    const p = programs[dayKey] || weeklyTemplate[DATES.find(d => d.key === dayKey)?.dayName || 'Mon'];
    if (!p?.tags?.length) return [];
    return p.tags.map(id => tags.find(t => t.id === id)).filter(Boolean) as WorkoutTag[];
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <LinearGradient colors={[theme.gradientStart, theme.gradientEnd]} style={[styles.container, { paddingTop: insets.top }]}>
        <View style={[styles.header, { borderBottomColor: theme.borderCard }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerLabel, { color: theme.textMuted }]}>PROJECT J</Text>
            <Text style={[styles.headerTitle, { color: theme.accentBlueRaw }]}>Workout</Text>
            <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: 'DMSans_700Bold', marginTop: 1, letterSpacing: 2, textTransform: 'uppercase' }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/workout-library')} style={[styles.libraryBtn, { height: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder }]}>
            <Text style={[styles.libraryBtnText, { color: theme.accentBlue }]}>Library</Text>
          </TouchableOpacity>
        </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">

        <ScrollView
          ref={dayScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.dayTabsContainer}
          onLayout={() => {}}>
          {DATES.map(({ key, dayName, label }) => {
            const p = programs[key] || weeklyTemplate[dayName];
            const c = p?.color || '#f97316';
            const isActive = key === activeDay;
            const isToday = key === todayKey;
            const isPast = key < todayKey;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.dayTab, { backgroundColor: theme.bgCard, borderColor: theme.borderCard },
                  isActive && { borderColor: c, backgroundColor: c + '18' },
                  isToday && !isActive && { borderColor: theme.textPrimary, borderWidth: 2 }]}
                onPress={() => { setActiveDay(key); setCalBurnedSaved(!!cardioLogs[key]?.caloriesBurned); }}>
                {(() => {
                  const dayTagObjs = getDayTagObjects(key);
                  const n = Math.min(dayTagObjs.length, 6);
                  const leftCount = Math.ceil(n / 2);
                  const rightCount = Math.floor(n / 2);
                  const leftDots = dayTagObjs.slice(0, leftCount);
                  const rightDots = dayTagObjs.slice(leftCount, leftCount + rightCount);
                  return (
                    <View style={{ width: '100%', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                      {/* Left dots */}
                      {leftDots.length > 0 && (
                        <View style={{ position: 'absolute', left: 4, top: 0, bottom: 0, justifyContent: 'center', gap: 3 }}>
                          {leftDots.map(t => (
                            <View key={t.id} style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: t.color }} />
                          ))}
                        </View>
                      )}
                      {/* Center text */}
                      <Text style={[styles.dayTabText, { color: theme.textMuted },
                        isActive && { color: c },
                        !isActive && { color: isPast ? theme.textSecondary : theme.textMuted }]}>{dayName}</Text>
                      <Text style={[styles.dayTabText, { color: theme.textMuted, fontSize: 11 },
                        isActive && { color: c },
                        !isActive && { color: isPast ? theme.textMuted : theme.textMuted }]}>{label}</Text>
                      {dayTagObjs.length === 0 && (
                        <Text style={[styles.dayTabSub, { color: theme.textDim }, isActive && { color: c }]}>{p?.focus?.split(' ')[0].toUpperCase()}</Text>
                      )}
                      {/* Right dots */}
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
                          <View key={t.id} style={{ backgroundColor: t.color + '22', borderWidth: 1, borderColor: t.color + '55', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 }}>
                            <Text style={{ fontSize: 9, fontFamily: 'DMSans_700Bold', letterSpacing: 2, color: t.color }}>{t.label.toUpperCase()}</Text>
                          </View>
                        ))}
                      </View>
                      {row2.length > 0 && (
                        <View style={{ flexDirection: 'row', gap: 6 }}>
                          {row2.map(t => (
                            <View key={t.id} style={{ backgroundColor: t.color + '22', borderWidth: 1, borderColor: t.color + '55', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 }}>
                              <Text style={{ fontSize: 9, fontFamily: 'DMSans_700Bold', letterSpacing: 2, color: t.color }}>{t.label.toUpperCase()}</Text>
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
          <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: theme.borderCardTop, alignItems: 'center', paddingVertical: 32 }]}>
            <Text style={{ fontSize: 40 }}>😴</Text>
            <Text style={{ color: theme.textPrimary, fontSize: 20, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1, marginTop: 12 }}>REST DAY</Text>
            <Text style={{ color: theme.textMuted, fontSize: 13, fontFamily: 'DMSans_400Regular', marginTop: 8, textAlign: 'center' }}>Recovery is part of the program. Rest well.</Text>
          </View>
        ) : (
          <View>
            <View style={styles.progressRow} key={programs[activeDay]?.customLabel || programs[activeDay]?.focus}>
              <TouchableOpacity style={{ flex: 1 }} onPress={() => {
                setLabelInput(`${program?.customLabel || program?.focus || ''}${program?.muscles ? ' · ' + program.muscles : ''}`);
                setShowLabelModal(true);
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.progressLabel, { fontSize: 18, color: theme.textSecondary, fontFamily: 'DMSans_600SemiBold', flex: 0 }]}>{programs[activeDay]?.customLabel || programs[activeDay]?.focus}{programs[activeDay]?.muscles ? ' · ' + programs[activeDay].muscles : ''}</Text>
                  <IconSymbol name="pencil" size={16} color={theme.textMuted} />
                </View>
              </TouchableOpacity>
              <Text style={[styles.progressCount, { color }]}>{doneCount}/{exercises.length}</Text>
            </View>
            <View style={[styles.progressBarBg, { backgroundColor: theme.bgProgressTrack }]}>
              <View style={[styles.progressBarFill, { width: `${exercises.length > 0 ? (doneCount / exercises.length) * 100 : 0}%`, backgroundColor: theme.accentBlue }]} />
            </View>

            <DraggableFlatList
              data={exercises}
              keyExtractor={ex => ex.id}
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
                    <View style={[styles.exerciseItem, isDone && styles.exerciseDone, {
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
                          <View style={styles.exerciseNameRow}>
                            <Text style={[styles.exerciseName, { color: theme.textPrimary }, isDone && [styles.exerciseNameDone, { color: theme.textDim }]]}>{ex.name}</Text>
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
                          </View>
                          {ex.isCardio ? (
                            <Text style={[styles.exerciseMeta, { color: theme.textMuted }]}>
                              {[
                                ex.duration ? (ex.fromAppleHealth ? ex.duration : `${ex.duration} min`) : null,
                                ex.distance ? `${ex.distance} mi` : null,
                                ex.speed ? `${ex.speed} mph` : null,
                                ex.incline ? `${ex.incline}% incline` : null,
                                ex.hr ? `${ex.hr} bpm` : null,
                                ex.calories ? `${ex.calories} cal` : null,
                              ].filter(Boolean).join(' · ') || 'Cardio · tap edit to log stats'}
                            </Text>
                          ) : (
                            <Text style={[styles.exerciseMeta, { color: theme.textMuted }]}>{ex.sets} sets · {ex.reps} reps · {ex.rest} rest</Text>
                          )}
                          {ex.note ? <Text style={[styles.exerciseNote, { color: theme.textDim }]}>{ex.note}</Text> : null}
                        </View>
                        <TouchableOpacity
                          style={[styles.checkCircle, { borderColor: theme.borderCard }, isDone && { backgroundColor: theme.accentBlue, borderColor: theme.accentBlue }]}
                          onPress={() => toggleExercise(ex.id)}>
                          {isDone && <Text style={[styles.checkMark, { color: theme.bgPrimary }]}>✓</Text>}
                        </TouchableOpacity>
                      </View>
                      <View style={styles.exActions}>
                        <TouchableOpacity style={[styles.exActionBtn, { backgroundColor: theme.bgInput, borderColor: theme.borderInput }]} onPress={() => openEditModal(activeDay, ex)}>
                          <Text style={[styles.exActionBtnText, { color: theme.textMuted }]}>Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.exActionBtn, { backgroundColor: theme.bgInput, borderColor: theme.accentRedBorder }]} onPress={() => removeExercise(activeDay, ex.id)}>
                          <Text style={[styles.exActionBtnText, { color: theme.accentRed }]}>Remove</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </ScaleDecorator>
                );
              }}
            />

            {doneCount === exercises.length && exercises.length > 0 && (
              <View style={styles.completeMsg}>
                <Text style={[styles.completeMsgText, { color: theme.accentBlue }]}>DONE. GO HOME.</Text>
              </View>
            )}

            <TouchableOpacity style={[styles.addExBtn, { backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder }]} onPress={() => router.push({ pathname: '/workout-library', params: { selectMode: 'true', day: activeDay } })}>
              <Text style={[styles.addExBtnText, { color: theme.accentBlue }]}>+ ADD EXERCISE</Text>
            </TouchableOpacity>
          </View>
        )}

        

        {/* Effort Score Card */}
        <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: theme.borderCardTop, marginTop: 12 }]}>
          <Text style={[styles.cardLabel, { color: theme.textMuted }]}>Effort Score</Text>
          <View style={{ flexDirection: 'column', gap: 6, marginTop: 10 }}>
            {[[1,2,3,4,5],[6,7,8,9,10]].map((row, ri) => (
              <View key={ri} style={{ flexDirection: 'row', gap: 6 }}>
                {row.map(n => {
                  const selected = cardioLogs[activeDay]?.effortScore === n;
                  const effortColor = n <= 3 ? theme.statusGood : n <= 6 ? theme.statusWarn : n <= 8 ? '#f97316' : theme.statusBad;
                  return (
                    <TouchableOpacity
                      key={n}
                      onPress={() => {
                        const current = cardioLogs[activeDay]?.effortScore;
                        const newScore = current === n ? null : n;
                        const newLogs = { ...cardioLogs, [activeDay]: { ...(cardioLogs[activeDay] || {}), effortScore: newScore } };
                        setCardioLogs(newLogs);
                        saveState(checks, cardioComplete, programs, workoutNotes, newLogs);
                      }}
                      style={{ flex: 1, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
                        backgroundColor: selected ? effortColor + '33' : theme.bgInput,
                        borderWidth: 0.5, borderColor: selected ? effortColor : theme.borderInput }}>
                      <Text style={{ fontSize: 13, fontFamily: 'DMSans_600SemiBold', color: selected ? effortColor : theme.textMuted }}>{n}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        </View>

        {/* Workout Notes Card */}
        <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: theme.borderCardTop, marginTop: 12 }]}>
          <Text style={[styles.cardLabel, { color: theme.textMuted }]}>Workout Notes</Text>
          <TextInput
            style={[styles.notesInput, { backgroundColor: theme.bgInput, borderColor: theme.borderInput, color: theme.textPrimary }]}
            placeholder="How'd it feel? Energy, what was heavy..."
            placeholderTextColor={theme.textPlaceholder}
            multiline
            value={workoutNotes[activeDay] || ''}
            onChangeText={v => setWorkoutNotes(prev => ({ ...prev, [activeDay]: v }))}
          />
          <TouchableOpacity style={[styles.saveNoteBtn, { backgroundColor: theme.bgInput, borderColor: theme.borderInput }]} onPress={saveNote}>
            <Text style={[styles.saveNoteBtnText, { color: theme.textMuted }]}>Save Note</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <TouchableOpacity style={[styles.modalOverlay, { backgroundColor: theme.overlayBg }]} activeOpacity={1} onPress={() => Keyboard.dismiss()}>
            <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }} keyboardShouldPersistTaps="handled">
              <View style={[styles.modal, { backgroundColor: theme.bgCard, borderColor: theme.borderCard }]}>
                <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>{editingExercise ? 'Edit Exercise' : 'Add Exercise'}</Text>
                <TextInput style={[styles.modalInput, { backgroundColor: theme.bgInput, borderColor: theme.borderInput, color: theme.textPrimary }]} placeholder="Exercise name" placeholderTextColor={theme.textPlaceholder} value={form.name} onChangeText={v => setForm(p => ({ ...p, name: v }))} />
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                  <TouchableOpacity
                    style={[styles.modalCancelBtn, { backgroundColor: theme.bgInput, borderColor: theme.borderInput }, !form.isCardio && { backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder }]}
                    onPress={() => setForm(p => ({ ...p, isCardio: false }))}>
                    <Text style={[styles.modalCancelBtnText, { color: theme.textMuted }, !form.isCardio && { color: theme.accentBlue }]}>Lift</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalCancelBtn, { backgroundColor: theme.bgInput, borderColor: theme.borderInput }, form.isCardio && { backgroundColor: 'rgba(245,158,11,0.15)', borderColor: 'rgba(245,158,11,0.3)' }]}
                    onPress={() => setForm(p => ({ ...p, isCardio: true }))}>
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
                          placeholder="--"
                          placeholderTextColor={theme.textPlaceholder}
                          keyboardType="decimal-pad"
                          value={form[field.key as keyof typeof form] as string || ''}
                          onChangeText={v => setForm(p => ({ ...p, [field.key]: v }))}
                        />
                      </View>
                    ))}
                  </>
                ) : (
                  <View style={styles.modalRow}>
                    <TextInput style={[styles.modalInput, { backgroundColor: theme.bgInput, borderColor: theme.borderInput, color: theme.textPrimary, flex: 1 }]} placeholder="Sets" placeholderTextColor={theme.textPlaceholder} value={form.sets || ''} onChangeText={v => setForm(p => ({ ...p, sets: v }))} />
                    <TextInput style={[styles.modalInput, { backgroundColor: theme.bgInput, borderColor: theme.borderInput, color: theme.textPrimary, flex: 1 }]} placeholder="Reps" placeholderTextColor={theme.textPlaceholder} value={form.reps || ''} onChangeText={v => setForm(p => ({ ...p, reps: v }))} />
                    <TextInput style={[styles.modalInput, { backgroundColor: theme.bgInput, borderColor: theme.borderInput, color: theme.textPrimary, flex: 1 }]} placeholder="Rest" placeholderTextColor={theme.textPlaceholder} value={form.rest || ''} onChangeText={v => setForm(p => ({ ...p, rest: v }))} />
                  </View>
                )}
                <TextInput style={[styles.modalInput, { backgroundColor: theme.bgInput, borderColor: theme.borderInput, color: theme.textPrimary }]} placeholder="Note (optional)" placeholderTextColor={theme.textPlaceholder} value={form.note} onChangeText={v => setForm(p => ({ ...p, note: v }))} />
                <View style={styles.modalBtns}>
                  <TouchableOpacity style={[styles.modalCancelBtn, { backgroundColor: theme.bgInput, borderColor: theme.borderInput }]} onPress={() => setShowAddModal(false)}>
                    <Text style={[styles.modalCancelBtnText, { color: theme.textMuted }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalSaveBtn, { backgroundColor: theme.accentBlue }]} onPress={saveExercise}>
                    <Text style={[styles.modalSaveBtnText, { color: theme.bgPrimary }]}>{editingExercise ? 'Save' : 'Add'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* Label Modal */}
      {showLabelModal && (
        <Modal transparent animationType="fade" onRequestClose={() => setShowLabelModal(false)}>
          <TouchableOpacity style={{ flex: 1, backgroundColor: theme.overlayBg, justifyContent: 'center', alignItems: 'center' }} onPress={() => setShowLabelModal(false)}>
            <View style={{ backgroundColor: theme.bgCard, borderRadius: 12, padding: 20, width: '85%', borderWidth: 1, borderColor: theme.borderCard }}>
              <Text style={{ color: theme.textPrimary, fontSize: 16, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1, marginBottom: 12 }}>EDIT DAY LABEL</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: theme.bgInput, borderColor: theme.borderInput, color: theme.textPrimary, marginBottom: 16 }]}
                value={labelInput}
                onChangeText={setLabelInput}
                placeholder="e.g. Push · Chest, Shoulders"
                placeholderTextColor={theme.textPlaceholder}
                autoFocus
              />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity style={[styles.modalCancelBtn, { flex: 1, backgroundColor: theme.bgInput, borderColor: theme.borderInput }]} onPress={() => setShowLabelModal(false)}>
                  <Text style={[styles.modalCancelBtnText, { color: theme.textMuted }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalSaveBtn, { flex: 1, backgroundColor: theme.accentBlue }]} onPress={() => {
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
          </TouchableOpacity>
        </Modal>
      )}

      {/* Tag Assignment Modal */}
      {showTagModal && (
        <Modal transparent animationType="fade" onRequestClose={() => setShowTagModal(false)}>
          <TouchableOpacity style={{ flex: 1, backgroundColor: theme.overlayBg, justifyContent: 'center', alignItems: 'center' }} activeOpacity={1} onPress={() => setShowTagModal(false)}>
            <TouchableOpacity activeOpacity={1} onPress={e => e.stopPropagation()}>
              <View style={{ backgroundColor: theme.bgSheet, borderRadius: 16, padding: 20, width: 320, borderWidth: 1, borderColor: theme.borderCard }}>
                <Text style={{ color: theme.textPrimary, fontSize: 18, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2, marginBottom: 4 }}>ASSIGN TAGS</Text>
                <Text style={{ color: theme.textMuted, fontSize: 11, fontFamily: 'DMSans_400Regular', marginBottom: 16 }}>{activeDateObj?.dayName} {activeDateObj?.label} · tap to toggle</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                  {tags.map(t => {
                    const active = (programs[activeDay]?.tags || weeklyTemplate[activeDayName]?.tags || []).includes(t.id);
                    return (
                      <TouchableOpacity key={t.id} onPress={() => toggleDayTag(t.id)}
                        style={{ backgroundColor: active ? t.color + '33' : theme.bgInput, borderWidth: 1, borderColor: active ? t.color : theme.borderInput, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 }}>
                        <Text style={{ fontSize: 12, fontFamily: 'DMSans_600SemiBold', color: active ? t.color : theme.textMuted }}>{t.label}</Text>
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
                        setShowTagModal(false);
                        showToast('Tags saved', undefined, 'success');
                      }}
                      style={{ marginBottom: 8, paddingVertical: 12, alignItems: 'center', borderRadius: 8, backgroundColor: theme.accentGreenBg, borderWidth: 1, borderColor: theme.accentGreenBorder }}>
                      <Text style={{ color: theme.accentGreen, fontSize: 13, fontFamily: 'DMSans_700Bold', letterSpacing: 1 }}>CONFIRM</Text>
                    </TouchableOpacity>
                  ) : null;
                })()}
                <TouchableOpacity onPress={() => {
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
          <ToastRenderer />
          <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: theme.overlayBg, opacity: manageTagsOverlayAnim }}>
            <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={closeManageTags} />
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
              <TouchableOpacity onPress={closeManageTags} {...manageTagsPanResponder.panHandlers} style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 8 }}>
                <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.sheetHandle }} />
              </TouchableOpacity>
              <View style={{ paddingHorizontal: 20 }}>
                <Text style={{ color: theme.textPrimary, fontSize: 18, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2, marginBottom: 16 }}>MANAGE TAGS</Text>

                {/* Existing tags list */}
                <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false} nestedScrollEnabled>
                  {tags.map(t => {
                    const isBeingEdited = editingTag?.id === t.id;
                    const displayLabel = isBeingEdited ? (tagLabelInput || t.label) : t.label;
                    const displayColor = isBeingEdited ? tagColorInput : t.color;
                    return (
                      <View key={t.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 }}>
                        <View style={{ backgroundColor: displayColor + '22', borderWidth: 1, borderColor: displayColor + '55', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, flex: 1 }}>
                          <Text style={{ fontSize: 12, fontFamily: 'DMSans_700Bold', color: displayColor }}>{displayLabel.toUpperCase()}</Text>
                        </View>
                        <TouchableOpacity onPress={() => { setEditingTag(t); setTagLabelInput(t.label); setTagColorInput(t.color); }}
                          style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: isBeingEdited ? theme.accentGreenBorder : theme.accentBlueBorder, backgroundColor: isBeingEdited ? theme.accentGreenBg : theme.accentBlueBg }}>
                          <Text style={{ fontSize: 11, color: isBeingEdited ? theme.accentGreen : theme.accentBlue, fontFamily: 'DMSans_600SemiBold' }}>{isBeingEdited ? 'Editing' : 'Edit'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => {
                          Alert.alert('Delete Tag', `Delete "${t.label}"?`, [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Delete', style: 'destructive', onPress: () => saveTags(tags.filter(x => x.id !== t.id)) },
                          ]);
                        }} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: theme.accentRedBorder, backgroundColor: theme.accentRedBg }}>
                          <Text style={{ fontSize: 11, color: theme.accentRed, fontFamily: 'DMSans_600SemiBold' }}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </ScrollView>

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
                      <TouchableOpacity key={c} onPress={() => setTagColorInput(c)}
                        style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c, borderWidth: tagColorInput === c ? 3 : 0, borderColor: theme.textPrimary, alignItems: 'center', justifyContent: 'center' }}>
                        {tagColorInput === c && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.6)' }} />}
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {editingTag && (
                      <TouchableOpacity onPress={() => { setEditingTag(null); setTagLabelInput(''); setTagColorInput(TAG_COLOR_PALETTE[0]); }}
                        style={{ flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: theme.borderInput, backgroundColor: theme.bgInput, alignItems: 'center' }}>
                        <Text style={{ color: theme.textMuted, fontFamily: 'DMSans_600SemiBold', fontSize: 14 }}>Cancel</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      onPress={() => {
                        if (!tagLabelInput.trim()) return;
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
              </View>
            </Reanimated.View>
          </View>
        </Modal>

    </LinearGradient>
    </KeyboardAvoidingView>
    </GestureHandlerRootView>
  );
}


const styles = StyleSheet.create({
  container:            { flex: 1 },
  content:              { padding: 16, paddingBottom: 300 },
  header:               { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 0.5, marginBottom: 16 },
  headerLabel:          { fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2, fontFamily: 'DMSans_700Bold' },
  headerTitle:          { fontSize: 32, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2 },
  dayTabsContainer:     { marginBottom: 16 },
  dayTab:               { width: 72, height: 74, paddingVertical: 8, borderRadius: 8, borderWidth: 0.5, marginRight: 8, alignItems: 'center', justifyContent: 'center' },
  dayTabText:           { fontSize: 13, fontWeight: '700', fontFamily: 'DMSans_700Bold' },
  dayTabSub:            { fontSize: 9, letterSpacing: 1, marginTop: 2, fontFamily: 'DMSans_700Bold' },
  cardioCard:           { borderWidth: 0.5, borderTopWidth: 0.5, borderRadius: 14, padding: 28, alignItems: 'center' },
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
  exActions:            { flexDirection: 'row', gap: 8, marginTop: 10 },
  exActionBtn:          { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 6, borderWidth: 0.5 },
  exActionBtnText:      { fontSize: 11, fontFamily: 'DMSans_600SemiBold' },
  addExBtn:             { marginTop: 12, padding: 14, borderWidth: 0.5, borderRadius: 10, alignItems: 'center' },
  addExBtnText:         { fontFamily: 'BebasNeue_400Regular', fontSize: 16, letterSpacing: 2 },
  completeMsg:          { padding: 16, marginTop: 8, alignItems: 'center' },
  completeMsgText:      { fontSize: 32, letterSpacing: 4, fontFamily: 'BebasNeue_400Regular' },
  card:                 { borderWidth: 0.5, borderTopWidth: 0.5, borderRadius: 14, padding: 16, shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6 },
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