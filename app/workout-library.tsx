import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Animated, FlatList, Keyboard, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { saveToFirebase } from '../firebaseConfig';
import { storageSet } from '../utils/storage';
import { ToastRenderer, useToast } from '../components/Toast';
import { PRESET_PROGRAMS, PresetProgram } from '../workoutData';
import { useTheme } from '../theme';

interface LibraryExercise {
  id: string;
  name: string;
  type: 'lift' | 'cardio';
  defaultSets?: string;
  defaultReps?: string;
  defaultRest?: string;
  note?: string;
  favorite?: boolean;
  recentlyUsed?: number;
}

const makeId = () => Math.random().toString(36).substr(2, 9);

const DEFAULT_LIBRARY: LibraryExercise[] = [
  { id: 'l1', name: 'Barbell Squat', type: 'lift', defaultSets: '4', defaultReps: '8–10', defaultRest: '90s' },
  { id: 'l2', name: 'Bench Press', type: 'lift', defaultSets: '4', defaultReps: '8–10', defaultRest: '90s' },
  { id: 'l3', name: 'Cable Curl', type: 'lift', defaultSets: '3', defaultReps: '12', defaultRest: '45s' },
  { id: 'l4', name: 'Cable Face Pull', type: 'lift', defaultSets: '3', defaultReps: '15–20', defaultRest: '30s' },
  { id: 'l5', name: 'Cable Fly (Low to High)', type: 'lift', defaultSets: '3', defaultReps: '12–15', defaultRest: '45s' },
  { id: 'l6', name: 'Cable Lateral Raise', type: 'lift', defaultSets: '3', defaultReps: '15', defaultRest: '30s' },
  { id: 'l7', name: 'Cable Crunch', type: 'lift', defaultSets: '3', defaultReps: '15', defaultRest: '30s' },
  { id: 'l8', name: 'Dead Bug', type: 'lift', defaultSets: '3', defaultReps: '10 each side', defaultRest: '30s' },
  { id: 'l9', name: 'Glute Kickback (Cable)', type: 'lift', defaultSets: '3', defaultReps: '15 each', defaultRest: '30s' },
  { id: 'l10', name: 'Hammer Curl', type: 'lift', defaultSets: '3', defaultReps: '12', defaultRest: '45s' },
  { id: 'l11', name: 'Hamstring Curl', type: 'lift', defaultSets: '3', defaultReps: '12', defaultRest: '45s' },
  { id: 'l12', name: 'Lat Pulldown (Wide Grip)', type: 'lift', defaultSets: '4', defaultReps: '10–12', defaultRest: '60s' },
  { id: 'l13', name: 'Leg Extension (Machine)', type: 'lift', defaultSets: '3', defaultReps: '12–15', defaultRest: '45s' },
  { id: 'l14', name: 'Leg Press', type: 'lift', defaultSets: '4', defaultReps: '10–12', defaultRest: '90s' },
  { id: 'l15', name: 'Machine Chest Press', type: 'lift', defaultSets: '4', defaultReps: '10–12', defaultRest: '60s' },
  { id: 'l16', name: 'Machine Row', type: 'lift', defaultSets: '3', defaultReps: '12', defaultRest: '45s' },
  { id: 'l17', name: 'Machine Shoulder Press', type: 'lift', defaultSets: '3', defaultReps: '10–12', defaultRest: '60s' },
  { id: 'l18', name: 'Overhead Tricep Extension (Cable)', type: 'lift', defaultSets: '3', defaultReps: '12', defaultRest: '60s' },
  { id: 'l19', name: 'Plank', type: 'lift', defaultSets: '3', defaultReps: '30–45s hold', defaultRest: '30s' },
  { id: 'l20', name: 'Seated Cable Row', type: 'lift', defaultSets: '3', defaultReps: '10–12', defaultRest: '60s' },
  { id: 'l21', name: 'Tricep Pushdown (Rope)', type: 'lift', defaultSets: '3', defaultReps: '12', defaultRest: '45s' },
  { id: 'c1', name: 'Treadmill', type: 'cardio' },
  { id: 'c2', name: 'Elliptical', type: 'cardio' },
  { id: 'c3', name: 'Stationary Bike', type: 'cardio' },
  { id: 'c4', name: 'Stairmaster', type: 'cardio' },
  { id: 'c5', name: 'Running (Outdoor)', type: 'cardio' },
  { id: 'c6', name: 'HIIT', type: 'cardio' },
];

function fmtLibraryDay(dk: string | undefined): string {
  if (!dk) return '';
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  if (dk === todayKey) return 'Today';
  return new Date(dk + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' });
}

export default function WorkoutLibraryScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { showToast } = useToast();

  const [library, setLibrary] = useState<LibraryExercise[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'favorites' | 'programs' | 'routines'>('all');
  const [query, setQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEx, setEditingEx] = useState<LibraryExercise | null>(null);
  const [form, setForm] = useState<Partial<LibraryExercise>>({ type: 'lift', defaultSets: '', defaultReps: '', defaultRest: '' });
  const [activeProgramName, setActiveProgramName] = useState<string | null>(null);
  const [showFabMenu, setShowFabMenu] = useState(false);

  const { selectMode, day } = useLocalSearchParams<{ selectMode: string; day: string }>();
  const isSelectMode = selectMode === 'true';
  const [selectedEx, setSelectedEx] = useState<LibraryExercise | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());

  const addOverlayOpacity = useRef(new Animated.Value(0)).current;
  const addCardScale = useRef(new Animated.Value(0.95)).current;
  const detailOverlayOpacity = useRef(new Animated.Value(0)).current;
  const fabScale = useRef(new Animated.Value(1)).current;
  const fabItem1Anim = useRef(new Animated.Value(0)).current; // Create Exercise - bottom, first
  const fabItem2Anim = useRef(new Animated.Value(0)).current; // Create Program - middle
  const fabItem3Anim = useRef(new Animated.Value(0)).current; // Create Routine - top, last

  useEffect(() => {
    const load = async () => {
      try {
        const saved = await AsyncStorage.getItem('pj_exercise_library');
        if (saved) setLibrary(JSON.parse(saved));
        else {
          setLibrary(DEFAULT_LIBRARY);
          await storageSet('pj_exercise_library', JSON.stringify(DEFAULT_LIBRARY));
        }
      } catch (e) {
        console.log('Load error', e);
      }
    };
    load();
  }, []);

  useFocusEffect(useCallback(() => {
    const loadProgramState = async () => {
      try {
        const raw = await AsyncStorage.getItem('pj_workout_state');
        if (raw) {
          const state = JSON.parse(raw);
          setActiveProgramName(state.activeProgramName || null);
        }
      } catch (e) {}
    };
    loadProgramState();
  }, []));

  const saveLibrary = async (updated: LibraryExercise[]) => {
    setLibrary(updated);
    await storageSet('pj_exercise_library', JSON.stringify(updated));
    await saveToFirebase('exercise_library', 'exercises', updated);
  };

  const toggleFavorite = async (id: string) => {
    const updated = library.map(ex => ex.id === id ? { ...ex, favorite: !ex.favorite } : ex);
    await saveLibrary(updated);
  };

  const deleteExercise = async (id: string) => {
    const updated = library.filter(ex => ex.id !== id);
    await saveLibrary(updated);
  };

  const handleLoadProgram = (preset: PresetProgram) => {
    Alert.alert(
      'Load Program',
      `This will replace your current weekly template with "${preset.name}". Days you've already logged won't be affected.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Load', onPress: async () => {
            try {
              const raw = await AsyncStorage.getItem('pj_workout_state');
              const state = raw ? JSON.parse(raw) : {};
              const updated = { ...state, weeklyTemplate: preset.days, activeProgramName: preset.name };
              await storageSet('pj_workout_state', JSON.stringify(updated));
              setActiveProgramName(preset.name);
              showToast('Program loaded', preset.name, 'success');
            } catch (e) {}
          }
        },
      ]
    );
  };

  const handleClearProgram = () => {
    Alert.alert(
      'Clear Program',
      "This will clear your weekly template. Days you've already logged won't be affected.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear', style: 'destructive', onPress: async () => {
            try {
              const raw = await AsyncStorage.getItem('pj_workout_state');
              const state = raw ? JSON.parse(raw) : {};
              const updated = { ...state, weeklyTemplate: {}, activeProgramName: null };
              await storageSet('pj_workout_state', JSON.stringify(updated));
              setActiveProgramName(null);
              showToast('Program cleared', undefined, 'success');
            } catch (e) {}
          }
        },
      ]
    );
  };

  const closeDetailModal = (onDone?: () => void) => {
    Animated.timing(detailOverlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setShowDetailModal(false);
      setShowDayPicker(false);
      onDone?.();
    });
  };

  const openAdd = () => openAddModal(null);
  const openEdit = (ex: LibraryExercise) => openAddModal(ex);

  const saveExercise = async () => {
    if (!form.name?.trim()) return;
    let updated;
    if (editingEx) {
      updated = library.map(ex => ex.id === editingEx.id ? { ...ex, ...form } as LibraryExercise : ex);
    } else {
      const newEx: LibraryExercise = { id: makeId(), name: form.name!, type: form.type || 'lift', ...form };
      updated = [...library, newEx].sort((a, b) => a.name.localeCompare(b.name));
    }
    await saveLibrary(updated);
    setShowAddModal(false);
    showToast(editingEx ? 'Exercise saved' : 'Exercise added', undefined, 'success');
  };

  const getFilteredList = () => {
    let list = library;
    if (activeTab === 'favorites') list = library.filter(ex => ex.favorite);
    if (query.trim()) list = list.filter(ex => ex.name.toLowerCase().includes(query.toLowerCase()));
    return list;
  };

  const filteredList = getFilteredList();

  const selectExercise = async (ex: LibraryExercise, targetDay?: string) => {
    const updated = library.map(e => e.id === ex.id ? { ...e, recentlyUsed: Date.now() } : e);
    await saveLibrary(updated);
    router.push({
      pathname: '/(tabs)/workout',
      params: {
        pendingExercise: JSON.stringify({
          id: Math.random().toString(36).substr(2, 9),
          name: ex.name,
          sets: '',
          reps: '',
          rest: '',
          note: ex.note || '',
          isCardio: ex.type === 'cardio',
        }),
        pendingDay: targetDay || day,
      }
    });
  };

  const openAddModal = (ex: LibraryExercise | null = null) => {
    addOverlayOpacity.setValue(0);
    addCardScale.setValue(0.95);
    if (ex) { setEditingEx(ex); setForm({ ...ex }); }
    else { setEditingEx(null); setForm({ type: 'lift', name: '', defaultSets: '', defaultReps: '', defaultRest: '', note: '' }); }
    setShowAddModal(true);
  };

  const closeAddModal = () => {
    Animated.parallel([
      Animated.timing(addOverlayOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(addCardScale, { toValue: 0.95, duration: 150, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  const onClose = () => {
    Keyboard.dismiss();
    setShowAddModal(false);
  };

  const openFabMenu = () => {
    fabItem1Anim.setValue(0);
    fabItem2Anim.setValue(0);
    fabItem3Anim.setValue(0);
    setShowFabMenu(true);
    Animated.stagger(70, [
      Animated.spring(fabItem1Anim, { toValue: 1, useNativeDriver: true, friction: 7, tension: 120 }),
      Animated.spring(fabItem2Anim, { toValue: 1, useNativeDriver: true, friction: 7, tension: 120 }),
      Animated.spring(fabItem3Anim, { toValue: 1, useNativeDriver: true, friction: 7, tension: 120 }),
    ]).start();
  };

  const closeFabMenu = () => {
    Animated.parallel([
      Animated.timing(fabItem1Anim, { toValue: 0, duration: 130, useNativeDriver: true }),
      Animated.timing(fabItem2Anim, { toValue: 0, duration: 130, useNativeDriver: true }),
      Animated.timing(fabItem3Anim, { toValue: 0, duration: 130, useNativeDriver: true }),
    ]).start(() => setShowFabMenu(false));
  };

  const toggleFabMenu = () => {
    if (showFabMenu) closeFabMenu();
    else openFabMenu();
  };

  const styles = useStyles(theme);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="chevron-back" size={18} color={theme.accentBlueRaw} />
            <Text style={styles.backBtnText}>Back</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isSelectMode ? `Add to ${fmtLibraryDay(day)}` : 'Exercise Library'}</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder={activeTab === 'programs' ? 'Search programs...' : activeTab === 'routines' ? 'Search routines...' : 'Search exercises...'}
          placeholderTextColor={theme.textPlaceholder}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      <View style={styles.tabRow}>
        {(['all', 'favorites', 'programs', 'routines'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}>
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'all' || activeTab === 'favorites' ? (
        <FlatList
          data={filteredList}
          keyExtractor={item => item.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 120 }}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.exItem} onPress={() => {
              if (isSelectMode) {
                selectExercise(item);
              } else {
                setSelectedEx(item);
                detailOverlayOpacity.setValue(0);
                setShowDetailModal(true);
              }
            }}>
              <View style={styles.exLeft}>
                <View style={styles.exTopRow}>
                  <View style={[styles.typeBadge, item.type === 'cardio' && styles.typeBadgeCardio]}>
                    <Text style={[styles.typeBadgeText, item.type === 'cardio' && { color: theme.accentAmber }]}>
                      {item.type.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.exName}>{item.name}</Text>
                </View>
                {item.note ? <Text style={styles.exNote}>{item.note}</Text> : null}
              </View>
              <View style={styles.exActions}>
                {isSelectMode ? (
                  <TouchableOpacity
                    style={{ backgroundColor: theme.accentGreenBg, borderWidth: 1, borderColor: theme.accentGreenBorder, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 }}
                    onPress={() => selectExercise(item)}>
                    <Text style={{ color: theme.accentGreen, fontFamily: 'DMSans_600SemiBold', fontSize: 13 }}>+ Add</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={() => toggleFavorite(item.id)} style={{ padding: 4 }}>
                    <Ionicons name={item.favorite ? 'star' : 'star-outline'} size={18} color={item.favorite ? theme.accentAmber : theme.textDim} />
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: 60 }}>
              <Ionicons name="barbell-outline" size={40} color={theme.textDim} />
              <Text style={{ color: theme.textPrimary, fontSize: 16, fontFamily: 'DMSans_600SemiBold', marginTop: 12 }}>
                {activeTab === 'favorites' ? 'No favorites yet' : 'No exercises found'}
              </Text>
              <Text style={{ color: theme.textMuted, fontSize: 13, fontFamily: 'DMSans_400Regular', marginTop: 6, textAlign: 'center', paddingHorizontal: 32 }}>
                {activeTab === 'favorites' ? 'Star exercises to save them here.' : 'Try a different search term.'}
              </Text>
            </View>
          }
        />
      ) : activeTab === 'programs' ? (
        <ScrollView contentContainerStyle={{ paddingTop: 8, paddingBottom: 120 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {activeProgramName && (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.bgInset, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, marginHorizontal: 12, marginBottom: 16, borderWidth: 0.5, borderColor: theme.accentBlueBorder }}>
              <View>
                <Text style={{ fontSize: 9, letterSpacing: 2, color: theme.textMuted, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase', marginBottom: 2 }}>ACTIVE PROGRAM</Text>
                <Text style={{ fontSize: 15, color: theme.textPrimary, fontFamily: 'DMSans_600SemiBold' }}>{activeProgramName}</Text>
              </View>
              <TouchableOpacity
                onPress={handleClearProgram}
                style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: theme.accentRedBorder, backgroundColor: theme.accentRedBg }}>
                <Text style={{ color: theme.accentRed, fontSize: 11, fontFamily: 'DMSans_700Bold', letterSpacing: 0.5 }}>CLEAR</Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.sectionLabel}>PRESET PROGRAMS</Text>
          {PRESET_PROGRAMS.filter(p => !query.trim() || p.name.toLowerCase().includes(query.toLowerCase())).map(preset => (
            <View key={preset.id} style={{ backgroundColor: theme.bgCard, borderWidth: 0.5, borderColor: theme.borderCard, borderRadius: 12, padding: 16, marginHorizontal: 12, marginBottom: 12 }}>
              <Text style={{ color: theme.textPrimary, fontSize: 16, fontFamily: 'DMSans_700Bold', marginBottom: 4 }}>{preset.name}</Text>
              <Text style={{ color: theme.textMuted, fontSize: 12, fontFamily: 'DMSans_400Regular', marginBottom: 12, lineHeight: 18 }}>{preset.description}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                {(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const).map(d => {
                  const dp = preset.days[d];
                  const col = dp?.color || theme.borderSubtle;
                  return (
                    <View key={d} style={{ backgroundColor: col + '22', borderWidth: 1, borderColor: col + '55', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Text style={{ fontSize: 10, fontFamily: 'DMSans_700Bold', color: col }}>{d.toUpperCase()} · {dp?.focus?.toUpperCase() || 'REST'}</Text>
                    </View>
                  );
                })}
              </View>
              <TouchableOpacity
                onPress={() => handleLoadProgram(preset)}
                style={{ paddingVertical: 10, borderRadius: 8, alignItems: 'center', backgroundColor: activeProgramName === preset.name ? theme.accentGreenBg : theme.accentBlueBg, borderWidth: 1, borderColor: activeProgramName === preset.name ? theme.accentGreenBorder : theme.accentBlueBorder }}>
                <Text style={{ color: activeProgramName === preset.name ? theme.accentGreen : theme.accentBlue, fontSize: 13, fontFamily: 'DMSans_700Bold', letterSpacing: 1 }}>
                  {activeProgramName === preset.name ? 'ACTIVE' : 'LOAD PROGRAM'}
                </Text>
              </TouchableOpacity>
            </View>
          ))}

          <Text style={[styles.sectionLabel, { marginTop: 8 }]}>MY PROGRAMS</Text>
          <View style={{ backgroundColor: theme.bgCard, borderWidth: 0.5, borderColor: theme.borderCard, borderRadius: 12, padding: 24, marginHorizontal: 12, alignItems: 'center' }}>
            <Ionicons name="construct-outline" size={32} color={theme.textDim} />
            <Text style={{ color: theme.textPrimary, fontSize: 16, fontFamily: 'DMSans_600SemiBold', marginTop: 10 }}>Coming Soon</Text>
            <Text style={{ color: theme.textMuted, fontSize: 13, fontFamily: 'DMSans_400Regular', marginTop: 6, textAlign: 'center' }}>Build and save your own custom programs.</Text>
          </View>
        </ScrollView>
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 100 }}>
          <Ionicons name="repeat-outline" size={48} color={theme.textDim} />
          <Text style={{ color: theme.textPrimary, fontSize: 22, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2, marginTop: 16 }}>ROUTINES</Text>
          <Text style={{ color: theme.textMuted, fontSize: 14, fontFamily: 'DMSans_400Regular', marginTop: 8, textAlign: 'center', paddingHorizontal: 48, lineHeight: 20 }}>Save and reuse your go-to workouts. Coming soon.</Text>
        </View>
      )}

      <Modal visible={showDetailModal} transparent animationType="none" onRequestClose={() => closeDetailModal()} onShow={() => {
        Animated.timing(detailOverlayOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      }}>
        <ToastRenderer />
        <Animated.View style={{ flex: 1, backgroundColor: theme.overlayBg, justifyContent: 'center', alignItems: 'center', opacity: detailOverlayOpacity }}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => closeDetailModal()} />
          {selectedEx ? (
            <TouchableOpacity activeOpacity={1} style={{ backgroundColor: theme.bgSheet, borderRadius: 14, padding: 20, width: '85%', borderWidth: 0.5, borderTopWidth: 1.5, borderColor: theme.borderCard, borderTopColor: theme.accentBlueRaw, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12 }}>
              <View style={[styles.typeBadge, selectedEx.type === 'cardio' && styles.typeBadgeCardio, { alignSelf: 'flex-start', marginBottom: 8 }]}>
                <Text style={[styles.typeBadgeText, selectedEx.type === 'cardio' && { color: theme.accentAmber }]}>{selectedEx.type.toUpperCase()}</Text>
              </View>
              <Text style={{ color: selectedEx.type === 'cardio' ? theme.accentAmber : theme.accentBlue, fontSize: 22, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1, marginBottom: selectedEx.note ? 4 : 16 }}>{selectedEx.name}</Text>
              {selectedEx.note ? <Text style={{ color: theme.textMuted, fontSize: 12, fontFamily: 'DMSans_400Regular', marginBottom: 16 }}>{selectedEx.note}</Text> : null}

              <TouchableOpacity
                style={{ backgroundColor: theme.accentBlue, borderRadius: 8, padding: 12, alignItems: 'center', marginBottom: 8 }}
                onPress={() => { setShowDayPicker(true); }}>
                <Text style={{ color: '#ffffff', fontFamily: 'BebasNeue_400Regular', fontSize: 16, letterSpacing: 1 }}>+ ADD TO DAY</Text>
              </TouchableOpacity>

              {showDayPicker && (
                <View style={{ marginBottom: 8, backgroundColor: theme.bgInset, borderRadius: 8, padding: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <TouchableOpacity onPress={() => {
                      if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
                      else setCalMonth(m => m - 1);
                    }}>
                      <Text style={{ color: theme.textPrimary, fontSize: 20, paddingHorizontal: 8 }}>‹</Text>
                    </TouchableOpacity>
                    <Text style={{ color: theme.textPrimary, fontFamily: 'DMSans_600SemiBold', fontSize: 14 }}>
                      {['January','February','March','April','May','June','July','August','September','October','November','December'][calMonth]} {calYear}
                    </Text>
                    <TouchableOpacity onPress={() => {
                      if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
                      else setCalMonth(m => m + 1);
                    }}>
                      <Text style={{ color: theme.textPrimary, fontSize: 20, paddingHorizontal: 8 }}>›</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                    {['S','M','T','W','T','F','S'].map((d, i) => (
                      <Text key={i} style={{ flex: 1, textAlign: 'center', color: theme.textMuted, fontSize: 11, fontFamily: 'DMSans_500Medium' }}>{d}</Text>
                    ))}
                  </View>
                  {(() => {
                    const firstDay = new Date(calYear, calMonth, 1).getDay();
                    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
                    const cells: (number | null)[] = [];
                    for (let i = 0; i < firstDay; i++) cells.push(null);
                    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
                    const rows = [];
                    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
                    return rows.map((row, ri) => (
                      <View key={ri} style={{ flexDirection: 'row', marginBottom: 4 }}>
                        {row.map((d, ci) => {
                          if (!d) return <View key={ci} style={{ flex: 1 }} />;
                          const dateKey = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                          const isToday = dateKey === `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
                          return (
                            <TouchableOpacity
                              key={ci}
                              style={{ flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 4, backgroundColor: isToday ? theme.accentGreenBg : 'transparent' }}
                              onPress={() => {
                                if (selectedEx) closeDetailModal(() => selectExercise(selectedEx, dateKey));
                              }}>
                              <Text style={{ color: isToday ? theme.accentGreen : theme.textPrimary, fontSize: 13, fontFamily: 'DMSans_400Regular' }}>{d}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    ));
                  })()}
                </View>
              )}

              <TouchableOpacity
                style={{ backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder, borderRadius: 8, padding: 12, alignItems: 'center', marginBottom: 8 }}
                onPress={() => closeDetailModal(() => openEdit(selectedEx!))}>
                <Text style={{ color: theme.accentBlue, fontFamily: 'DMSans_600SemiBold', fontSize: 14 }}>Edit</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{ padding: 12, alignItems: 'center' }}
                onPress={() => {
                  Alert.alert('Remove Exercise', `Remove "${selectedEx.name}" from library?`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Remove', style: 'destructive', onPress: () => { deleteExercise(selectedEx!.id); closeDetailModal(); } }
                  ]);
                }}>
                <Text style={{ color: theme.accentRed, fontFamily: 'DMSans_600SemiBold', fontSize: 13 }}>Remove from Library</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ) : null}
        </Animated.View>
      </Modal>

      <Modal visible={showAddModal} transparent animationType="none" onRequestClose={onClose} onShow={() => {
        Animated.parallel([
          Animated.timing(addOverlayOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
          Animated.spring(addCardScale, { toValue: 1, useNativeDriver: true, friction: 8, tension: 100 }),
        ]).start();
      }}>
        <ToastRenderer />
        <Animated.View style={{ flex: 1, backgroundColor: theme.overlayBg, justifyContent: 'flex-end', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 340, opacity: addOverlayOpacity }}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={closeAddModal} />
          <Animated.View style={{ backgroundColor: theme.bgSheet, borderRadius: 20, borderWidth: 0.5, borderColor: theme.borderCard, borderTopColor: theme.borderCardTop, width: '100%', height: 420, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 20, transform: [{ scale: addCardScale }] }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 14, borderBottomWidth: 0.5, borderBottomColor: theme.borderCard }}>
              <Text style={styles.modalTitle}>{editingEx ? 'EDIT EXERCISE' : 'ADD EXERCISE'}</Text>
              <TouchableOpacity onPress={closeAddModal} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={20} color={theme.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              <View style={{ padding: 20 }}>
                <TextInput style={styles.modalInput} placeholder="Exercise name" placeholderTextColor={theme.textPlaceholder} value={form.name || ''} onChangeText={v => setForm(p => ({ ...p, name: v }))} autoCapitalize="words" />
                <Text style={styles.modalLabel}>Type</Text>
                <View style={styles.typeRow}>
                  <TouchableOpacity style={[styles.typeBtn, form.type === 'lift' && styles.typeBtnActive]} onPress={() => setForm(p => ({ ...p, type: 'lift' }))}>
                    <Text style={[styles.typeBtnText, form.type === 'lift' && { color: theme.accentBlue }]}>Lift</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.typeBtn, form.type === 'cardio' && { borderColor: `${theme.accentAmber}66`, backgroundColor: `${theme.accentAmber}1a` }]} onPress={() => setForm(p => ({ ...p, type: 'cardio' }))}>
                    <Text style={[styles.typeBtnText, form.type === 'cardio' && { color: theme.accentAmber }]}>Cardio</Text>
                  </TouchableOpacity>
                </View>
                <TextInput style={styles.modalInput} placeholder="Note (optional)" placeholderTextColor={theme.textPlaceholder} value={form.note || ''} onChangeText={v => setForm(p => ({ ...p, note: v }))} />
                <View style={styles.modalBtns}>
                  <TouchableOpacity style={styles.modalCancelBtn} onPress={closeAddModal}>
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalSaveBtn, !form.name?.trim() && { opacity: 0.4 }]} onPress={saveExercise} disabled={!form.name?.trim()}>
                    <Text style={styles.modalSaveText}>{editingEx ? 'SAVE' : 'ADD'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </Animated.View>
        </Animated.View>
      </Modal>

      {/* FAB backdrop */}
      {showFabMenu && (
        <TouchableOpacity
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          activeOpacity={1}
          onPress={closeFabMenu}
        />
      )}

      {/* FAB speed dial menu - each item cascades in independently */}
      {showFabMenu && (
        <View style={{ position: 'absolute', bottom: 90 + insets.bottom, right: 20, alignItems: 'flex-end', gap: 12 }}>
          {/* Create Routine - disabled, animates last */}
          <Animated.View style={{ opacity: fabItem3Anim, transform: [{ translateY: fabItem3Anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ backgroundColor: theme.bgCard, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 0.5, borderColor: theme.borderCard, opacity: 0.5 }}>
                <Text style={{ color: theme.textMuted, fontSize: 13, fontFamily: 'DMSans_500Medium' }}>Create Routine</Text>
              </View>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.bgCard, borderWidth: 0.5, borderColor: theme.borderCard, alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
                <Ionicons name="repeat-outline" size={20} color={theme.textDim} />
              </View>
            </View>
          </Animated.View>

          {/* Create Program - disabled */}
          <Animated.View style={{ opacity: fabItem2Anim, transform: [{ translateY: fabItem2Anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ backgroundColor: theme.bgCard, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 0.5, borderColor: theme.borderCard, opacity: 0.5 }}>
                <Text style={{ color: theme.textMuted, fontSize: 13, fontFamily: 'DMSans_500Medium' }}>Create Program</Text>
              </View>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.bgCard, borderWidth: 0.5, borderColor: theme.borderCard, alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
                <Ionicons name="calendar-outline" size={20} color={theme.textDim} />
              </View>
            </View>
          </Animated.View>

          {/* Create Exercise - active, animates first */}
          <Animated.View style={{ opacity: fabItem1Anim, transform: [{ translateY: fabItem1Anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <TouchableOpacity
                onPress={() => { closeFabMenu(); openAdd(); }}
                style={{ backgroundColor: theme.accentBlue, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, shadowColor: theme.accentBlue, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 6 }}>
                <Text style={{ color: '#ffffff', fontSize: 13, fontFamily: 'DMSans_600SemiBold' }}>Create Exercise</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { closeFabMenu(); openAdd(); }}
                style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.accentBlue, alignItems: 'center', justifyContent: 'center', shadowColor: theme.accentBlue, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 6 }}>
                <Ionicons name="barbell-outline" size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      )}

      {/* Main FAB */}
      <Animated.View style={{ position: 'absolute', bottom: 20 + insets.bottom, right: 20, transform: [{ scale: fabScale }] }}>
        <TouchableOpacity
          onPress={toggleFabMenu}
          onPressIn={() => Animated.timing(fabScale, { toValue: 0.9, duration: 80, useNativeDriver: true }).start()}
          onPressOut={() => Animated.timing(fabScale, { toValue: 1, duration: 80, useNativeDriver: true }).start()}
          activeOpacity={1}
          style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: theme.accentBlue, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 }}>
          <Ionicons name={showFabMenu ? 'close' : 'add'} size={28} color="#ffffff" />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const useStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bgPrimary },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: theme.borderCard },
  backBtn: { width: 60 },
  backBtnText: { color: theme.accentBlueRaw, fontSize: 14, fontFamily: 'DMSans_500Medium' },
  headerTitle: { fontSize: 22, color: theme.accentBlueRaw, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1 },
  searchRow: { padding: 12, paddingBottom: 8 },
  searchInput: { backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, color: theme.textPrimary, padding: 12, fontSize: 14, fontFamily: 'DMSans_400Regular' },
  tabRow: { flexDirection: 'row', marginHorizontal: 12, marginBottom: 8, backgroundColor: theme.bgProgressTrack, borderRadius: 8, padding: 4 },
  tab: { flex: 1, padding: 8, alignItems: 'center', borderRadius: 6 },
  tabActive: { backgroundColor: theme.bgCard },
  tabText: { fontSize: 12, color: theme.textMuted, fontFamily: 'DMSans_500Medium' },
  tabTextActive: { color: theme.textPrimary },
  sectionLabel: { fontSize: 9, letterSpacing: 3, color: theme.textMuted, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase', marginHorizontal: 16, marginBottom: 10 },
  exItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, marginHorizontal: 12, marginVertical: 4, borderRadius: 10, borderWidth: 0.5, borderLeftWidth: 3, borderColor: theme.borderCard, borderTopColor: 'rgba(255,255,255,0.1)', borderLeftColor: theme.accentBlueRaw, backgroundColor: theme.bgCard, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 3 },
  exLeft: { flex: 1, marginRight: 12 },
  exTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  typeBadge: { backgroundColor: theme.accentBlueBg, borderRadius: 3, paddingHorizontal: 5, paddingVertical: 1 },
  typeBadgeCardio: { backgroundColor: `${theme.accentAmber}26` },
  typeBadgeText: { fontSize: 8, color: theme.accentBlue, fontFamily: 'DMSans_700Bold', letterSpacing: 1 },
  exName: { fontSize: 14, color: theme.textPrimary, fontFamily: 'DMSans_600SemiBold', flex: 1 },
  exNote: { fontSize: 11, color: theme.textDim, fontStyle: 'italic', fontFamily: 'DMSans_400Regular' },
  exActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  modalTitle: { fontSize: 22, color: theme.accentBlueRaw, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1 },
  modalInput: { backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 6, color: theme.textPrimary, padding: 10, fontSize: 14, fontFamily: 'DMSans_400Regular', marginBottom: 10 },
  modalLabel: { fontSize: 11, color: theme.textMuted, fontFamily: 'DMSans_500Medium', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  typeBtn: { flex: 1, padding: 10, backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 6, alignItems: 'center' },
  typeBtnActive: { backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder },
  typeBtnText: { color: theme.textMuted, fontSize: 14, fontFamily: 'DMSans_500Medium' },
  modalBtns: { flexDirection: 'row', gap: 8, marginTop: 8 },
  modalCancelBtn: { flex: 1, padding: 12, backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 6, alignItems: 'center' },
  modalCancelText: { color: theme.textMuted, fontFamily: 'DMSans_500Medium', fontSize: 14 },
  modalSaveBtn: { flex: 1, padding: 12, backgroundColor: theme.accentBlue, borderRadius: 6, alignItems: 'center' },
  modalSaveText: { color: '#ffffff', fontFamily: 'BebasNeue_400Regular', fontSize: 16, letterSpacing: 1 },
});
