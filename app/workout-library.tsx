import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { saveToFirebase } from '../firebaseConfig';

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

export default function WorkoutLibraryScreen() {
  const insets = useSafeAreaInsets();
  const [library, setLibrary] = useState<LibraryExercise[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'recent' | 'favorites'>('all');
  const [query, setQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEx, setEditingEx] = useState<LibraryExercise | null>(null);
  const [form, setForm] = useState<Partial<LibraryExercise>>({ type: 'lift', defaultSets: '3', defaultReps: '10–12', defaultRest: '60s' });
  const { selectMode, day } = useLocalSearchParams<{ selectMode: string; day: string }>();
const isSelectMode = selectMode === 'true';
const [selectedEx, setSelectedEx] = useState<LibraryExercise | null>(null);
const [showDetailModal, setShowDetailModal] = useState(false);
const [showDayPicker, setShowDayPicker] = useState(false);
const [calMonth, setCalMonth] = useState(new Date().getMonth());
const [calYear, setCalYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const load = async () => {
      try {
        const saved = await AsyncStorage.getItem('pj_exercise_library');
if (saved) setLibrary(JSON.parse(saved));
else {
  setLibrary(DEFAULT_LIBRARY);
  await AsyncStorage.setItem('pj_exercise_library', JSON.stringify(DEFAULT_LIBRARY));
}
      } catch (e) {
        console.log('Load error', e);
      }
    };
    load();
  }, []);

  const saveLibrary = async (updated: LibraryExercise[]) => {
    setLibrary(updated);
    await AsyncStorage.setItem('pj_exercise_library', JSON.stringify(updated));
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

  const openAdd = () => {
    setEditingEx(null);
    setForm({ type: 'lift', name: '', defaultSets: '3', defaultReps: '10–12', defaultRest: '60s', note: '' });
    setShowAddModal(true);
  };

  const openEdit = (ex: LibraryExercise) => {
    setEditingEx(ex);
    setForm({ ...ex });
    setShowAddModal(true);
  };

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
  };

  const getFilteredList = () => {
    let list = library;
    if (activeTab === 'favorites') list = library.filter(ex => ex.favorite);
    if (activeTab === 'recent') list = [...library].filter(ex => ex.recentlyUsed).sort((a, b) => (b.recentlyUsed || 0) - (a.recentlyUsed || 0)).slice(0, 15);
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
        sets: ex.defaultSets || '3',
        reps: ex.defaultReps || '10–12',
        rest: ex.defaultRest || '60s',
        note: ex.note || '',
        isCardio: ex.type === 'cardio',
      }),
      pendingDay: targetDay || day,
    }
  });
};

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isSelectMode ? `Add to ${day}` : 'Exercise Library'}</Text>
        <TouchableOpacity onPress={openAdd} style={styles.addBtn}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search exercises..."
          placeholderTextColor="#444444"
          value={query}
          onChangeText={setQuery}
        />
      </View>

      <View style={styles.tabRow}>
        {(['all', 'recent', 'favorites'] as const).map(tab => (
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

      <FlatList
        data={filteredList}
        keyExtractor={item => item.id}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
  <TouchableOpacity style={styles.exItem} onPress={() => {
    if (isSelectMode) {
      selectExercise(item);
    } else {
      setSelectedEx(item);
      setShowDetailModal(true);
    }
  }}>
    <View style={styles.exLeft}>
      <View style={styles.exTopRow}>
        <View style={[styles.typeBadge, item.type === 'cardio' && styles.typeBadgeCardio]}>
          <Text style={[styles.typeBadgeText, item.type === 'cardio' && { color: '#f59e0b' }]}>
            {item.type.toUpperCase()}
          </Text>
        </View>
        <Text style={styles.exName}>{item.name}</Text>
      </View>
      {item.type === 'lift' && (
        <Text style={styles.exMeta}>{item.defaultSets} sets · {item.defaultReps} reps · {item.defaultRest} rest</Text>
      )}
      {item.note ? <Text style={styles.exNote}>{item.note}</Text> : null}
    </View>
    <View style={styles.exActions}>
      {isSelectMode ? (
        <TouchableOpacity
          style={{ backgroundColor: 'rgba(16,185,129,0.15)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 }}
          onPress={() => selectExercise(item)}>
          <Text style={{ color: '#10b981', fontFamily: 'DMSans_600SemiBold', fontSize: 13 }}>+ Add</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity onPress={() => toggleFavorite(item.id)}>
          <Text style={{ fontSize: 18, color: item.favorite ? '#f59e0b' : '#333333' }}>★</Text>
        </TouchableOpacity>
      )}
    </View>
  </TouchableOpacity>
)}

        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {activeTab === 'favorites' ? 'No favorites yet. Star exercises to save them here.' :
             activeTab === 'recent' ? 'No recent exercises yet.' :
             'No exercises found.'}
          </Text>
        }
      />
{showDetailModal && selectedEx && (
  <Modal transparent animationType="fade" onRequestClose={() => setShowDetailModal(false)}>
    <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' }} onPress={() => setShowDetailModal(false)}>
      <TouchableOpacity activeOpacity={1} style={{ backgroundColor: '#1a1a1a', borderRadius: 12, padding: 20, width: '85%', borderWidth: 1, borderColor: '#2a2a2a' }}>
        <View style={[styles.typeBadge, selectedEx.type === 'cardio' && styles.typeBadgeCardio, { alignSelf: 'flex-start', marginBottom: 8 }]}>
          <Text style={[styles.typeBadgeText, selectedEx.type === 'cardio' && { color: '#f59e0b' }]}>{selectedEx.type.toUpperCase()}</Text>
        </View>
        <Text style={{ color: '#ffffff', fontSize: 20, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1, marginBottom: 4 }}>{selectedEx.name}</Text>
        {selectedEx.type === 'lift' && (
          <Text style={{ color: '#888888', fontSize: 13, fontFamily: 'DMSans_400Regular', marginBottom: 16 }}>{selectedEx.defaultSets} sets · {selectedEx.defaultReps} reps · {selectedEx.defaultRest} rest</Text>
        )}
        {selectedEx.note ? <Text style={{ color: '#999999', fontSize: 12, fontFamily: 'DMSans_400Regular', marginBottom: 16 }}>{selectedEx.note}</Text> : null}

        <TouchableOpacity
          style={{ backgroundColor: 'rgba(16,185,129,0.15)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)', borderRadius: 8, padding: 12, alignItems: 'center', marginBottom: 8 }}
          onPress={() => { setShowDayPicker(true); }}>
          <Text style={{ color: '#10b981', fontFamily: 'DMSans_600SemiBold', fontSize: 14 }}>+ Add to Day</Text>
        </TouchableOpacity>

        {showDayPicker && (
  <View style={{ marginBottom: 8, backgroundColor: '#111111', borderRadius: 8, padding: 12 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <TouchableOpacity onPress={() => {
        if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
        else setCalMonth(m => m - 1);
      }}>
        <Text style={{ color: '#ffffff', fontSize: 20, paddingHorizontal: 8 }}>‹</Text>
      </TouchableOpacity>
      <Text style={{ color: '#ffffff', fontFamily: 'DMSans_600SemiBold', fontSize: 14 }}>
        {['January','February','March','April','May','June','July','August','September','October','November','December'][calMonth]} {calYear}
      </Text>
      <TouchableOpacity onPress={() => {
        if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
        else setCalMonth(m => m + 1);
      }}>
        <Text style={{ color: '#ffffff', fontSize: 20, paddingHorizontal: 8 }}>›</Text>
      </TouchableOpacity>
    </View>
    <View style={{ flexDirection: 'row', marginBottom: 4 }}>
      {['S','M','T','W','T','F','S'].map((d, i) => (
        <Text key={i} style={{ flex: 1, textAlign: 'center', color: '#999999', fontSize: 11, fontFamily: 'DMSans_500Medium' }}>{d}</Text>
      ))}
    </View>
    {(() => {
      const firstDay = new Date(calYear, calMonth, 1).getDay();
      const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
      const cells = [];
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
                style={{ flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 4, backgroundColor: isToday ? 'rgba(16,185,129,0.2)' : 'transparent' }}
                onPress={() => {
                  setShowDayPicker(false);
                  setShowDetailModal(false);
                  if (selectedEx) selectExercise(selectedEx, dateKey);
                }}>
                <Text style={{ color: isToday ? '#10b981' : '#ffffff', fontSize: 13, fontFamily: 'DMSans_400Regular' }}>{d}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ));
    })()}
  </View>
)}

        <TouchableOpacity
          style={{ backgroundColor: '#1e1e1e', borderWidth: 1, borderColor: '#2a2a2a', borderRadius: 8, padding: 12, alignItems: 'center', marginBottom: 8 }}
          onPress={() => { setShowDetailModal(false); openEdit(selectedEx); }}>
          <Text style={{ color: '#888888', fontFamily: 'DMSans_600SemiBold', fontSize: 14 }}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{ backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', borderRadius: 8, padding: 12, alignItems: 'center' }}
          onPress={() => {
            Alert.alert('Remove Exercise', `Remove "${selectedEx.name}" from library?`, [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Remove', style: 'destructive', onPress: () => { deleteExercise(selectedEx.id); setShowDetailModal(false); } }
            ]);
          }}>
          <Text style={{ color: '#ef4444', fontFamily: 'DMSans_600SemiBold', fontSize: 14 }}>Remove</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </TouchableOpacity>
  </Modal>
)}

      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{editingEx ? 'Edit Exercise' : 'Add Exercise'}</Text>

            <TextInput style={styles.modalInput} placeholder="Exercise name" placeholderTextColor="#444" value={form.name || ''} onChangeText={v => setForm(p => ({ ...p, name: v }))} />

            <Text style={styles.modalLabel}>Type</Text>
            <View style={styles.typeRow}>
              <TouchableOpacity
                style={[styles.typeBtn, form.type === 'lift' && styles.typeBtnActive]}
                onPress={() => setForm(p => ({ ...p, type: 'lift' }))}>
                <Text style={[styles.typeBtnText, form.type === 'lift' && { color: '#3b82f6' }]}>Lift</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeBtn, form.type === 'cardio' && { ...styles.typeBtnActive, borderColor: 'rgba(245,158,11,0.4)', backgroundColor: 'rgba(245,158,11,0.1)' }]}
                onPress={() => setForm(p => ({ ...p, type: 'cardio' }))}>
                <Text style={[styles.typeBtnText, form.type === 'cardio' && { color: '#f59e0b' }]}>Cardio</Text>
              </TouchableOpacity>
            </View>

            {form.type === 'lift' && (
              <View style={styles.modalRow}>
                <TextInput style={[styles.modalInput, { flex: 1 }]} placeholder="Sets" placeholderTextColor="#444" value={form.defaultSets || ''} onChangeText={v => setForm(p => ({ ...p, defaultSets: v }))} />
                <TextInput style={[styles.modalInput, { flex: 1 }]} placeholder="Reps" placeholderTextColor="#444" value={form.defaultReps || ''} onChangeText={v => setForm(p => ({ ...p, defaultReps: v }))} />
                <TextInput style={[styles.modalInput, { flex: 1 }]} placeholder="Rest" placeholderTextColor="#444" value={form.defaultRest || ''} onChangeText={v => setForm(p => ({ ...p, defaultRest: v }))} />
              </View>
            )}

            <TextInput style={styles.modalInput} placeholder="Note (optional)" placeholderTextColor="#444" value={form.note || ''} onChangeText={v => setForm(p => ({ ...p, note: v }))} />

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowAddModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={saveExercise}>
                <Text style={styles.modalSaveText}>{editingEx ? 'Save' : 'Add'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080808' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#222222' },
  backBtn: { width: 60 },
  backBtnText: { color: '#3b82f6', fontSize: 14, fontFamily: 'DMSans_500Medium' },
  headerTitle: { fontSize: 20, color: '#ffffff', fontFamily: 'BebasNeue_400Regular', letterSpacing: 1 },
  addBtn: { width: 60, alignItems: 'flex-end' },
  addBtnText: { color: '#3b82f6', fontSize: 13, fontFamily: 'DMSans_600SemiBold' },
  searchRow: { padding: 12, paddingBottom: 8 },
  searchInput: { backgroundColor: '#161616', borderWidth: 1, borderColor: '#2a2a2a', borderRadius: 8, color: '#ffffff', padding: 12, fontSize: 14, fontFamily: 'DMSans_400Regular' },
  tabRow: { flexDirection: 'row', marginHorizontal: 12, marginBottom: 8, backgroundColor: '#161616', borderRadius: 8, padding: 4 },
  tab: { flex: 1, padding: 8, alignItems: 'center', borderRadius: 6 },
  tabActive: { backgroundColor: '#2a2a2a' },
  tabText: { fontSize: 13, color: '#888888', fontFamily: 'DMSans_500Medium' },
  tabTextActive: { color: '#ffffff' },
  exItem: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', padding: 14, borderBottomWidth: 1, borderBottomColor: '#161616' },
  exLeft: { flex: 1, marginRight: 12 },
  exTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  typeBadge: { backgroundColor: 'rgba(59,130,246,0.15)', borderRadius: 3, paddingHorizontal: 5, paddingVertical: 1 },
  typeBadgeCardio: { backgroundColor: 'rgba(245,158,11,0.15)' },
  typeBadgeText: { fontSize: 8, color: '#3b82f6', fontFamily: 'DMSans_700Bold', letterSpacing: 1 },
  exName: { fontSize: 14, color: '#e8e8e8', fontFamily: 'DMSans_600SemiBold', flex: 1 },
  exMeta: { fontSize: 11, color: '#888888', fontFamily: 'DMSans_400Regular', marginBottom: 2 },
  exNote: { fontSize: 11, color: '#444444', fontStyle: 'italic', fontFamily: 'DMSans_400Regular' },
  exActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  exActionText: { fontSize: 12, color: '#888888', fontFamily: 'DMSans_500Medium' },
  emptyText: { textAlign: 'center', color: '#888888', fontFamily: 'DMSans_400Regular', fontSize: 13, padding: 32, fontStyle: 'italic' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#161616', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 24, borderWidth: 1, borderColor: '#2a2a2a' },
  modalTitle: { fontSize: 22, color: '#ffffff', fontFamily: 'BebasNeue_400Regular', letterSpacing: 1, marginBottom: 16 },
  modalInput: { backgroundColor: '#1e1e1e', borderWidth: 1, borderColor: '#2a2a2a', borderRadius: 6, color: '#ffffff', padding: 10, fontSize: 14, fontFamily: 'DMSans_400Regular', marginBottom: 10 },
  modalLabel: { fontSize: 11, color: '#999999', fontFamily: 'DMSans_500Medium', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  typeBtn: { flex: 1, padding: 10, backgroundColor: '#1e1e1e', borderWidth: 1, borderColor: '#2a2a2a', borderRadius: 6, alignItems: 'center' },
  typeBtnActive: { backgroundColor: 'rgba(59,130,246,0.15)', borderColor: 'rgba(59,130,246,0.4)' },
  typeBtnText: { color: '#888888', fontSize: 14, fontFamily: 'DMSans_500Medium' },
  modalRow: { flexDirection: 'row', gap: 8 },
  modalBtns: { flexDirection: 'row', gap: 8, marginTop: 8 },
  modalCancelBtn: { flex: 1, padding: 12, backgroundColor: '#1e1e1e', borderWidth: 1, borderColor: '#2a2a2a', borderRadius: 6, alignItems: 'center' },
  modalCancelText: { color: '#999999', fontFamily: 'DMSans_500Medium', fontSize: 14 },
  modalSaveBtn: { flex: 1, padding: 12, backgroundColor: '#3b82f6', borderRadius: 6, alignItems: 'center' },
  modalSaveText: { color: '#ffffff', fontFamily: 'BebasNeue_400Regular', fontSize: 16, letterSpacing: 1 },
});