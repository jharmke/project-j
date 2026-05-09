import { IconSymbol } from '@/components/ui/icon-symbol';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Keyboard, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHealthKit } from '../../useHealthKit';
import { DayProgram, DEFAULT_PROGRAM, Exercise } from '../../workoutData';


const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];


const makeId = () => Math.random().toString(36).substr(2, 9);

function getTodayDay() {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()];
}
const today = new Date();
const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

export default function WorkoutScreen() {
  const insets = useSafeAreaInsets();
  const [activeDay, setActiveDay] = useState(todayKey);
  const [loaded, setLoaded] = useState(false);
  const [checks, setChecks] = useState<Record<string, Record<string, boolean>>>({});
const [cardioComplete, setCardioComplete] = useState<Record<string, boolean>>({});
const [programs, setPrograms] = useState<Record<string, DayProgram>>({});
const [workoutNotes, setWorkoutNotes] = useState<Record<string, string>>({});
const [weeklyTemplate, setWeeklyTemplate] = useState<Record<string, DayProgram>>(DEFAULT_PROGRAM);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDayEditModal, setShowDayEditModal] = useState(false);
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
const DAY_TYPES = [
  { label: 'Cardio', type: 'cardio' as const, focus: 'Cardio', color: '#f97316', exercises: [] },
  { label: 'Push', type: 'lift' as const, focus: 'Push', muscles: 'Chest · Shoulders · Triceps', color: '#3b82f6', exercises: [
    { id: `p${Date.now()}1`, name: 'Machine Chest Press', sets: '4', reps: '10–12', rest: '60s', note: '' },
    { id: `p${Date.now()}2`, name: 'Cable Fly (Low to High)', sets: '3', reps: '12–15', rest: '45s', note: '' },
    { id: `p${Date.now()}3`, name: 'Machine Shoulder Press', sets: '3', reps: '10–12', rest: '60s', note: '' },
    { id: `p${Date.now()}4`, name: 'Cable Lateral Raise', sets: '3', reps: '15', rest: '30s', note: '' },
    { id: `p${Date.now()}5`, name: 'Tricep Pushdown (Rope)', sets: '3', reps: '12', rest: '45s', note: '' },
  ]},
  { label: 'Pull', type: 'lift' as const, focus: 'Pull', muscles: 'Back · Biceps · Rear Delts', color: '#10b981', exercises: [
    { id: `pl${Date.now()}1`, name: 'Lat Pulldown (Wide Grip)', sets: '4', reps: '10–12', rest: '60s', note: '' },
    { id: `pl${Date.now()}2`, name: 'Seated Cable Row', sets: '3', reps: '10–12', rest: '60s', note: '' },
    { id: `pl${Date.now()}3`, name: 'Machine Row', sets: '3', reps: '12', rest: '45s', note: '' },
    { id: `pl${Date.now()}4`, name: 'Cable Face Pull', sets: '3', reps: '15–20', rest: '30s', note: '' },
    { id: `pl${Date.now()}5`, name: 'Hammer Curl', sets: '3', reps: '12', rest: '45s', note: '' },
  ]},
  { label: 'Legs + Core', type: 'lift' as const, focus: 'Legs + Core', muscles: 'Quads · Hamstrings · Glutes · Core', color: '#f59e0b', exercises: [
    { id: `l${Date.now()}1`, name: 'Leg Press', sets: '4', reps: '10–12', rest: '90s', note: '' },
    { id: `l${Date.now()}2`, name: 'Leg Extension (Machine)', sets: '3', reps: '12–15', rest: '45s', note: '' },
    { id: `l${Date.now()}3`, name: 'Hamstring Curl', sets: '3', reps: '12', rest: '45s', note: '' },
    { id: `l${Date.now()}4`, name: 'Glute Kickback (Cable)', sets: '3', reps: '15 each', rest: '30s', note: '' },
    { id: `l${Date.now()}5`, name: 'Plank', sets: '3', reps: '30–45s hold', rest: '30s', note: '' },
  ]},
  { label: 'Rest', type: 'rest' as const, focus: 'Rest', color: '#6b7280', exercises: [] },
];
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
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#0d0d0f' }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerLabel}>PROJECT J</Text>
            <Text style={styles.headerTitle}>Workout</Text>
            <Text style={{ fontSize: 9, color: '#666680', fontFamily: 'DMSans_700Bold', marginTop: 1, letterSpacing: 2, textTransform: 'uppercase' }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/workout-library')} style={[styles.libraryBtn, { height: 32, alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={styles.libraryBtnText}>Library</Text>
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
        style={[styles.dayTab, isActive && { borderColor: c, backgroundColor: c + '18' }, isToday && !isActive && { borderColor: '#ffffff', borderWidth: 2 }]}
        onPress={() => { setActiveDay(key); setCalBurnedSaved(!!cardioLogs[key]?.caloriesBurned); }}>
        <Text style={[styles.dayTabText, isActive && { color: c }, !isActive && { color: isPast ? '#999999' : '#aaaaaa' }]}>{dayName}</Text>
        <Text style={[styles.dayTabText, isActive && { color: c }, !isActive && { color: isPast ? '#888888' : '#888888' }, { fontSize: 11 }]}>{label}</Text>
        <Text style={[styles.dayTabSub, isActive && { color: c }, !isActive && { color: isPast ? '#444444' : '#999999' }]}>{p?.focus?.split(' ')[0].toUpperCase()}</Text>
      </TouchableOpacity>
    );
  })}
</ScrollView>

        <TouchableOpacity
          style={{ alignSelf: 'flex-end', marginBottom: 12, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(59,130,246,0.3)', backgroundColor: 'rgba(59,130,246,0.15)' }}
          onPress={() => setShowDayEditModal(true)}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
  <Text style={{ color: '#3b82f6', fontSize: 12, fontFamily: 'DMSans_600SemiBold' }}>Edit {activeDateObj?.dayName} {activeDateObj?.label}</Text>
  <IconSymbol name="pencil" size={14} color="#3b82f6" />
</View>
        </TouchableOpacity>

        {isRest ? (
  <View style={[styles.card, { alignItems: 'center', paddingVertical: 32 }]}>
    <Text style={{ fontSize: 40 }}>😴</Text>
    <Text style={{ color: '#ffffff', fontSize: 20, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1, marginTop: 12 }}>REST DAY</Text>
    <Text style={{ color: '#888888', fontSize: 13, fontFamily: 'DMSans_400Regular', marginTop: 8, textAlign: 'center' }}>Recovery is part of the program. Rest well.</Text>
  </View>
) : (
  <View>
    <View style={styles.progressRow} key={programs[activeDay]?.customLabel || programs[activeDay]?.focus}>
      <TouchableOpacity style={{ flex: 1 }} onPress={() => {
  setLabelInput(`${program?.customLabel || program?.focus || ''}${program?.muscles ? ' · ' + program.muscles : ''}`);
  setShowLabelModal(true);
}}>
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
    <Text style={[styles.progressLabel, { fontSize: 18, color: '#cccccc', fontFamily: 'DMSans_600SemiBold', flex: 0 }]}>{programs[activeDay]?.customLabel || programs[activeDay]?.focus}{programs[activeDay]?.muscles ? ' · ' + programs[activeDay].muscles : ''}</Text>
    <IconSymbol name="pencil" size={16} color="#888888" />
  </View>
</TouchableOpacity>
      <Text style={[styles.progressCount, { color }]}>{doneCount}/{exercises.length}</Text>
    </View>
    <View style={styles.progressBarBg}>
      <View style={[styles.progressBarFill, { width: `${exercises.length > 0 ? (doneCount / exercises.length) * 100 : 0}%`, backgroundColor: color }]} />
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
        <View style={[styles.exerciseItem, isDone && styles.exerciseDone, { borderLeftColor: isDone ? color : '#2a2a2a', opacity: isActive ? 0.9 : 1 }]}>
          <View style={styles.exerciseRow}>
            <TouchableOpacity onLongPress={drag} style={{ paddingRight: 10, justifyContent: 'center' }}>
              <Text style={{ color: '#444444', fontSize: 18, lineHeight: 14 }}>⠿</Text>
            </TouchableOpacity>
            <View style={styles.exerciseInfo}>
              <View style={styles.exerciseNameRow}>
                <Text style={[styles.exerciseName, isDone && styles.exerciseNameDone]}>{ex.name}</Text>
                {ex.fromAppleHealth && (
                  <View style={[styles.badge, { backgroundColor: 'rgba(13,146,104,0.15)', borderWidth: 1, borderColor: 'rgba(13,146,104,0.3)' }]}>
                    <Text style={[styles.badgeText, { color: '#0d9268' }]}>APPLE HEALTH</Text>
                  </View>
                )}
                {ex.dropset && (
                  <View style={[styles.badge, { backgroundColor: color + '22' }]}>
                    <Text style={[styles.badgeText, { color }]}>DROPSET</Text>
                  </View>
                )}
              </View>
             {ex.isCardio ? (
                <Text style={styles.exerciseMeta}>
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
                <Text style={styles.exerciseMeta}>{ex.sets} sets · {ex.reps} reps · {ex.rest} rest</Text>
              )}
              {ex.note ? <Text style={styles.exerciseNote}>{ex.note}</Text> : null}
            </View>
            <TouchableOpacity
              style={[styles.checkCircle, isDone && { backgroundColor: color, borderColor: color }]}
              onPress={() => toggleExercise(ex.id)}>
              {isDone && <Text style={styles.checkMark}>✓</Text>}
            </TouchableOpacity>
          </View>
          <View style={styles.exActions}>
            <TouchableOpacity style={styles.exActionBtn} onPress={() => openEditModal(activeDay, ex)}>
              <Text style={styles.exActionBtnText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.exActionBtn, { borderColor: '#ef444430' }]} onPress={() => removeExercise(activeDay, ex.id)}>
              <Text style={[styles.exActionBtnText, { color: '#ef4444' }]}>Remove</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScaleDecorator>
    );
  }}
/>

    {doneCount === exercises.length && exercises.length > 0 && (
      <View style={styles.completeMsg}>
        <Text style={[styles.completeMsgText, { color }]}>DONE. GO HOME.</Text>
      </View>
    )}

    <TouchableOpacity style={styles.addExBtn} onPress={() => router.push({ pathname: '/workout-library', params: { selectMode: 'true', day: activeDay } })}>
      <Text style={styles.addExBtnText}>+ ADD EXERCISE</Text>
    </TouchableOpacity>
  </View>
)}
<View style={[styles.card, { marginTop: 12 }]}>
          <Text style={styles.cardLabel}>Calories Burned</Text>
          <View style={{ marginTop: 8 }}>
            {calBurnedSaved ? (
              <TouchableOpacity
                onPress={() => setCalBurnedSaved(false)}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#13131e', borderWidth: 0.5, borderColor: 'rgba(13,146,104,0.3)', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12 }}>
                <Text style={{ color: '#e8e8f0', fontSize: 14, fontFamily: 'DMSans_700Bold', letterSpacing: 1 }}>{cardioLogs[activeDay]?.caloriesBurned} <Text style={{ color: '#666680', fontSize: 10, letterSpacing: 2 }}>KCAL</Text></Text>
                <Text style={{ color: '#444455', fontSize: 10, fontFamily: 'DMSans_600SemiBold', letterSpacing: 1, textTransform: 'uppercase' }}>tap to edit</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TextInput
                  style={[styles.notesInput, { minHeight: 0, flex: 1, textAlignVertical: 'center', paddingVertical: 10, marginTop: 0 }]}
                  placeholder="e.g. 450 kcal"
                  placeholderTextColor="#444455"
                  keyboardType="number-pad"
                  autoFocus={!!cardioLogs[activeDay]?.caloriesBurned}
                  value={cardioLogs[activeDay]?.caloriesBurned || ''}
                  onChangeText={v => {
                    const newLogs = { ...cardioLogs, [activeDay]: { ...(cardioLogs[activeDay] || {}), caloriesBurned: v } };
                    setCardioLogs(newLogs);
                    saveState(checks, cardioComplete, programs, workoutNotes, newLogs);
                    const saveCalsBurned = async () => {
                      try {
                        const saved = await AsyncStorage.getItem(`pj_${activeDay}`);
                        const current = saved ? JSON.parse(saved) : {};
                        await AsyncStorage.setItem(`pj_${activeDay}`, JSON.stringify({ ...current, caloriesBurned: parseInt(v) || 0 }));
                      } catch (e) {}
                    };
                    saveCalsBurned();
                  }}
                />
                {cardioLogs[activeDay]?.caloriesBurned ? (
                  <TouchableOpacity
                    style={{ backgroundColor: 'rgba(13,146,104,0.15)', borderWidth: 0.5, borderColor: 'rgba(13,146,104,0.3)', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 8 }}
                    onPress={() => { Keyboard.dismiss(); setCalBurnedSaved(true); }}>
                    <Text style={{ color: '#0d9268', fontSize: 13, fontFamily: 'DMSans_600SemiBold' }}>Save</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            )}
          </View>
        </View>
              <View style={[styles.card, { marginTop: 12 }]}>
          <Text style={styles.cardLabel}>Effort Score</Text>
          <View style={{ flexDirection: 'column', gap: 6, marginTop: 10 }}>
            {[[1,2,3,4,5],[6,7,8,9,10]].map((row, ri) => (
              <View key={ri} style={{ flexDirection: 'row', gap: 6 }}>
                {row.map(n => {
                  const selected = cardioLogs[activeDay]?.effortScore === n;
                  const effortColor = n <= 3 ? '#10b981' : n <= 6 ? '#f59e0b' : n <= 8 ? '#f97316' : '#ef4444';
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
                        backgroundColor: selected ? effortColor + '33' : '#13131e',
borderWidth: 0.5, borderColor: selected ? effortColor : 'rgba(255,255,255,0.08)' }}>
                      <Text style={{ fontSize: 13, fontFamily: 'DMSans_600SemiBold', color: selected ? effortColor : '#7070a0' }}>{n}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        </View>
        <View style={[styles.card, { marginTop: 12 }]}>
          <Text style={styles.cardLabel}>Workout Notes</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="How'd it feel? Energy, what was heavy..."
            placeholderTextColor="#444455"
            multiline
            value={workoutNotes[activeDay] || ''}
            onChangeText={v => setWorkoutNotes(prev => ({ ...prev, [activeDay]: v }))}
          />
          <TouchableOpacity style={styles.saveNoteBtn} onPress={saveNote}>
            <Text style={styles.saveNoteBtnText}>Save Note</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
  <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
    <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => Keyboard.dismiss()}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }} keyboardShouldPersistTaps="handled">
        <View style={styles.modal}>
            <Text style={styles.modalTitle}>{editingExercise ? 'Edit Exercise' : 'Add Exercise'}</Text>
            <TextInput style={styles.modalInput} placeholder="Exercise name" placeholderTextColor="#444" value={form.name} onChangeText={v => setForm(p => ({ ...p, name: v }))} />
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
  <TouchableOpacity
    style={[styles.modalCancelBtn, !form.isCardio && { backgroundColor: 'rgba(59,130,246,0.15)', borderColor: 'rgba(59,130,246,0.3)' }]}
    onPress={() => setForm(p => ({ ...p, isCardio: false }))}>
    <Text style={[styles.modalCancelBtnText, !form.isCardio && { color: '#3b82f6' }]}>Lift</Text>
  </TouchableOpacity>
  <TouchableOpacity
    style={[styles.modalCancelBtn, form.isCardio && { backgroundColor: 'rgba(245,158,11,0.15)', borderColor: 'rgba(245,158,11,0.3)' }]}
    onPress={() => setForm(p => ({ ...p, isCardio: true }))}>
    <Text style={[styles.modalCancelBtnText, form.isCardio && { color: '#f59e0b' }]}>Cardio</Text>
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
        <Text style={{ fontSize: 12, color: '#888888', fontFamily: 'DMSans_400Regular' }}>{field.label}</Text>
        <TextInput
          style={[styles.modalInput, { width: 100, textAlign: 'right', marginBottom: 0 }]}
          placeholder="--"
          placeholderTextColor="#444"
          keyboardType="decimal-pad"
          value={form[field.key as keyof typeof form] as string || ''}
          onChangeText={v => setForm(p => ({ ...p, [field.key]: v }))}
        />
      </View>
    ))}
  </>
) : (
  <View style={styles.modalRow}>
    <TextInput style={[styles.modalInput, { flex: 1 }]} placeholder="Sets" placeholderTextColor="#444" value={form.sets || ''} onChangeText={v => setForm(p => ({ ...p, sets: v }))} />
    <TextInput style={[styles.modalInput, { flex: 1 }]} placeholder="Reps" placeholderTextColor="#444" value={form.reps || ''} onChangeText={v => setForm(p => ({ ...p, reps: v }))} />
    <TextInput style={[styles.modalInput, { flex: 1 }]} placeholder="Rest" placeholderTextColor="#444" value={form.rest || ''} onChangeText={v => setForm(p => ({ ...p, rest: v }))} />
  </View>
)}
            <TextInput style={styles.modalInput} placeholder="Note (optional)" placeholderTextColor="#444" value={form.note} onChangeText={v => setForm(p => ({ ...p, note: v }))} />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowAddModal(false)}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={saveExercise}>
                <Text style={styles.modalSaveBtnText}>{editingExercise ? 'Save' : 'Add'}</Text>
              </TouchableOpacity>
            </View>
          </View>
      </ScrollView>
    </TouchableOpacity>
  </KeyboardAvoidingView>
</Modal>

{showLabelModal && (
  <Modal transparent animationType="fade" onRequestClose={() => setShowLabelModal(false)}>
    <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' }} onPress={() => setShowLabelModal(false)}>
      <View style={{ backgroundColor: '#1a1a1a', borderRadius: 12, padding: 20, width: '85%', borderWidth: 1, borderColor: '#2a2a2a' }}>
        <Text style={{ color: '#ffffff', fontSize: 16, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1, marginBottom: 12 }}>EDIT DAY LABEL</Text>
        <TextInput
          style={[styles.modalInput, { marginBottom: 16 }]}
          value={labelInput}
          onChangeText={setLabelInput}
          placeholder="e.g. Push · Chest, Shoulders"
          placeholderTextColor="#444"
          autoFocus
        />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={[styles.modalCancelBtn, { flex: 1 }]} onPress={() => setShowLabelModal(false)}>
            <Text style={styles.modalCancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.modalSaveBtn, { flex: 1 }]} onPress={() => {
            const parts = labelInput.split('·').map(s => s.trim());
const baseProgram = programs[activeDay] || weeklyTemplate[activeDayName];
const newPrograms = {
  ...programs,
  [activeDay]: {
    ...baseProgram,
    customLabel: parts[0] || '',
    muscles: parts[1] || '',
  }
};
setPrograms({...newPrograms});
setDayLabel(newPrograms[activeDay]?.customLabel || '');
saveState(checks, cardioComplete, {...newPrograms}, workoutNotes, cardioLogs, weeklyTemplate);
setShowLabelModal(false);
          }}>
            <Text style={styles.modalSaveBtnText}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  </Modal>
)}
    {showDayEditModal && (
  <Modal transparent animationType="fade" onRequestClose={() => setShowDayEditModal(false)}>
    <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' }} onPress={() => setShowDayEditModal(false)}>
      <View style={{ backgroundColor: '#1a1a1a', borderRadius: 12, padding: 20, width: '80%', borderWidth: 1, borderColor: '#2a2a2a' }}>
        <Text style={{ color: '#ffffff', fontSize: 16, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1, marginBottom: 16 }}>CHANGE {activeDay.toUpperCase()} TO...</Text>
        {DAY_TYPES.map(dt => (
          <TouchableOpacity
            key={dt.label}
            style={{ paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: dt.color + '50', backgroundColor: dt.color + '15' }}
            onPress={() => {
              const updated = {
  ...programs,
  [activeDay]: {
    type: dt.type,
    focus: dt.focus,
    muscles: dt.muscles || '',
    color: dt.color,
    exercises: dt.exercises.map(e => ({ ...e, id: e.id + Date.now() })),
  }
};
setPrograms(updated);
saveState(checks, cardioComplete, updated, workoutNotes, cardioLogs, weeklyTemplate);
              setShowDayEditModal(false);
            }}>
            <Text style={{ color: dt.color, fontSize: 14, fontFamily: 'DMSans_600SemiBold' }}>{dt.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </TouchableOpacity>
  </Modal>
)}
    </View>
    </KeyboardAvoidingView>
    </GestureHandlerRootView>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0f' },
  content: { padding: 16, paddingBottom: 300 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.06)', marginBottom: 16 },
  headerLabel: { fontSize: 9, letterSpacing: 2, color: '#666680', textTransform: 'uppercase', marginBottom: 2, fontFamily: 'DMSans_700Bold' },
  headerTitle: { fontSize: 32, color: '#e8e8f0', fontFamily: 'BebasNeue_400Regular', letterSpacing: 2 },
  dayTabsContainer: { marginBottom: 16 },
  dayTab: { width: 72, paddingVertical: 8, borderRadius: 8, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.06)', marginRight: 8, alignItems: 'center', backgroundColor: '#1a1a24' },
  dayTabText: { fontSize: 13, fontWeight: '700', color: '#666680', fontFamily: 'DMSans_700Bold' },
  dayTabSub: { fontSize: 9, letterSpacing: 1, color: '#666680', marginTop: 2, fontFamily: 'DMSans_700Bold' },
  cardioCard: { backgroundColor: '#1a1a24', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.06)', borderTopColor: 'rgba(255,255,255,0.1)', borderTopWidth: 0.5, borderRadius: 14, padding: 28, alignItems: 'center' },
  cardioIcon: { fontSize: 40, marginBottom: 12 },
  cardioTitle: { fontSize: 26, color: '#e8e8f0', letterSpacing: 2, marginBottom: 8, fontFamily: 'BebasNeue_400Regular' },
  cardioDetail: { fontSize: 10, color: '#666680', textAlign: 'center', lineHeight: 20, fontFamily: 'DMSans_700Bold', marginBottom: 16, letterSpacing: 1.5, textTransform: 'uppercase' },
  cardioCompleteBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, borderWidth: 0.5, borderColor: 'rgba(13,146,104,0.4)', backgroundColor: 'rgba(13,146,104,0.1)' },
  cardioCompleteBtnDone: { backgroundColor: '#0d9268', borderColor: '#0d9268' },
  cardioCompleteBtnText: { color: '#0d9268', fontFamily: 'BebasNeue_400Regular', fontSize: 16, letterSpacing: 2 },
  progressRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  progressLabel: { fontSize: 15, color: '#e8e8f0', flex: 1, fontFamily: 'DMSans_600SemiBold' },
  progressCount: { fontSize: 24, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1 },
  progressBarBg: { height: 2, backgroundColor: '#12121a', borderRadius: 2, overflow: 'hidden', marginBottom: 16 },
  progressBarFill: { height: '100%', borderRadius: 2 },
  exerciseItem: { backgroundColor: '#1a1a24', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.06)', borderLeftWidth: 3, borderRadius: 10, padding: 14, marginBottom: 8 },
  exerciseDone: { opacity: 0.87 },
  exerciseRow: { flexDirection: 'row', alignItems: 'flex-start' },
  exerciseInfo: { flex: 1 },
  exerciseNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 },
  exerciseName: { fontSize: 14, fontWeight: '600', color: '#e8e8f0', fontFamily: 'DMSans_600SemiBold' },
  exerciseNameDone: { textDecorationLine: 'line-through', color: '#444455' },
  exerciseMeta: { fontSize: 10, color: '#666680', marginBottom: 4, fontFamily: 'DMSans_700Bold', letterSpacing: 1, textTransform: 'uppercase' },
  exerciseNote: { fontSize: 11, color: '#444455', fontStyle: 'italic', lineHeight: 16, fontFamily: 'DMSans_400Regular' },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3 },
  badgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 1, fontFamily: 'DMSans_700Bold' },
  checkCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  checkMark: { color: '#000000', fontSize: 13, fontWeight: '700' },
  exActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  exActionBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 6, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: '#13131e' },
  exActionBtnText: { fontSize: 11, color: '#7070a0', fontFamily: 'DMSans_600SemiBold' },
  addExBtn: { marginTop: 12, padding: 14, backgroundColor: 'rgba(59,130,246,0.1)', borderWidth: 0.5, borderColor: 'rgba(59,130,246,0.25)', borderRadius: 10, alignItems: 'center' },
  addExBtnText: { color: '#3b82f6', fontFamily: 'BebasNeue_400Regular', fontSize: 16, letterSpacing: 2 },
  completeMsg: { padding: 16, marginTop: 8, alignItems: 'center' },
  completeMsgText: { fontSize: 32, letterSpacing: 4, fontFamily: 'BebasNeue_400Regular' },
  card: { backgroundColor: '#1a1a24', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.06)', borderTopColor: 'rgba(255,255,255,0.1)', borderTopWidth: 0.5, borderRadius: 14, padding: 16 },
  cardLabel: { fontSize: 9, letterSpacing: 3, color: '#666680', textTransform: 'uppercase', fontFamily: 'DMSans_700Bold' },
  notesInput: { backgroundColor: '#13131e', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.06)', borderRadius: 8, color: '#e8e8f0', padding: 10, fontSize: 13, minHeight: 80, textAlignVertical: 'top', marginTop: 10, fontFamily: 'DMSans_400Regular' },
  saveNoteBtn: { marginTop: 8, padding: 10, backgroundColor: '#13131e', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 6, alignItems: 'center' },
  saveNoteBtnText: { color: '#7070a0', fontSize: 12, fontFamily: 'DMSans_600SemiBold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#1a1a24', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 24, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.06)' },
  modalTitle: { fontSize: 22, color: '#e8e8f0', fontFamily: 'BebasNeue_400Regular', letterSpacing: 1, marginBottom: 16 },
  modalInput: { backgroundColor: '#13131e', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 8, color: '#e8e8f0', padding: 10, fontSize: 14, fontFamily: 'DMSans_400Regular', marginBottom: 10 },
  modalRow: { flexDirection: 'row', gap: 8 },
  modalBtns: { flexDirection: 'row', gap: 8, marginTop: 8 },
  modalCancelBtn: { flex: 1, padding: 12, backgroundColor: '#13131e', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 8, alignItems: 'center' },
  modalCancelBtnText: { color: '#7070a0', fontFamily: 'DMSans_600SemiBold', fontSize: 14 },
  modalSaveBtn: { flex: 1, padding: 12, backgroundColor: '#3b82f6', borderRadius: 8, alignItems: 'center' },
  modalSaveBtnText: { color: '#ffffff', fontFamily: 'BebasNeue_400Regular', fontSize: 16, letterSpacing: 1 },
  libraryBtn: { backgroundColor: 'rgba(59,130,246,0.15)', borderWidth: 1, borderColor: 'rgba(59,130,246,0.3)', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 },
  libraryBtnText: { color: '#3b82f6', fontSize: 14, fontFamily: 'DMSans_700Bold' },
  cardioFieldRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.04)' },
  cardioFieldLabel: { fontSize: 13, color: '#7070a0', fontFamily: 'DMSans_400Regular', flex: 1 },
  cardioFieldInput: { backgroundColor: '#13131e', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 6, color: '#e8e8f0', padding: 8, fontSize: 14, fontFamily: 'DMSans_400Regular', width: 100, textAlign: 'right' },
});