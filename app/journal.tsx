import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Animated, Keyboard,
    KeyboardAvoidingView, Modal,
    PanResponder, Platform, ScrollView, StyleSheet,
    Text, TextInput, TouchableOpacity, View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast } from '../components/Toast';
import { storageSet } from '../utils/storage';
import { useTheme } from '../theme';
import { ACHIEVEMENTS, checkAndUnlock, loadAchievements, checkMomentumAchievements } from '../achievementData';
import { showAchievementToast } from '../components/AchievementToast';
import { showCelebration } from '../components/CelebrationOverlay';

type Category = 'verse' | 'prayer' | 'study' | 'personal' | 'gratitude' | 'fitness';

interface JournalEntry {
  id: string;
  date: string;
  category: Category;
  title: string;
  notes: string;
  verseRef?: string;
  verseText?: string;
  acknowledged?: boolean;
  bookRef?: string;
}

const CATEGORY_META: Record<Category, { label: string; icon: string; color: string }> = {
  verse:     { label: 'Verse',     icon: 'book-outline',       color: '#d4860a' },
  prayer:    { label: 'Prayer',    icon: 'hand-left-outline',  color: '#8b5cf6' },
  study:     { label: 'Study',     icon: 'school-outline',     color: '#3b82f6' },
  personal:  { label: 'Personal',  icon: 'person-outline',     color: '#10b981' },
  gratitude: { label: 'Gratitude', icon: 'heart-outline',      color: '#ec4899' },
  fitness:   { label: 'Fitness',   icon: 'barbell-outline',    color: '#06b6d4' },
};

const STORAGE_KEY = 'pj_bible_reflections';

function migrateEntry(raw: any): JournalEntry {
  if (raw.category) return raw as JournalEntry;
  return {
    id: raw.date,
    date: raw.date,
    category: 'verse',
    title: raw.verseRef || 'Daily Verse',
    notes: raw.reflection || '',
    verseRef: raw.verseRef,
    verseText: raw.verseText,
    acknowledged: raw.acknowledged,
  };
}

// ─── SwipeableEntry lives here, above JournalScreen, never inside it ──────────

interface SwipeableEntryProps {
  entry: JournalEntry;
  isExpanded: boolean;
  onToggle: () => void;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  editTitle: string;
  setEditTitle: (s: string) => void;
  editNotes: string;
  setEditNotes: (s: string) => void;
  editCategory: Category;
  setEditCategory: (c: Category) => void;
  onSaveEdit: () => void;
  onDelete: (id: string) => void;
  onResetOtherSwipes: (id: string) => void;
  registerSwipeReset: (id: string, fn: () => void) => void;
  theme: any;
  formatDate: (s: string) => string;
}

function SwipeableEntry({
  entry, isExpanded, onToggle,
  editingId, setEditingId,
  editTitle, setEditTitle,
  editNotes, setEditNotes,
  editCategory, setEditCategory, onSaveEdit, onDelete,
  onResetOtherSwipes, registerSwipeReset,
  theme, formatDate,
}: SwipeableEntryProps) {
  const meta = CATEGORY_META[entry.category];
  const isEditing = editingId === entry.id;
  const notesInputRef = useRef<any>(null);

  // Expand animation -- simple opacity fade, same pattern as stats/profile/log
  const fadeAnim = useRef(new Animated.Value(isExpanded ? 1 : 0)).current;
  const [visible, setVisible] = useState(isExpanded);

  useEffect(() => {
    if (isExpanded) {
      setVisible(true);
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    } else {
      Animated.timing(fadeAnim, { toValue: 0, duration: 100, useNativeDriver: true }).start(({ finished }) => {
        if (finished) setVisible(false);
      });
    }
  }, [isExpanded]);

  // Swipe -- panResponder in useRef so it never recreates
  const swipeX = useRef(new Animated.Value(0)).current;
  const swipeOpen = useRef(false);

  const resetSwipe = useCallback(() => {
    swipeOpen.current = false;
    Animated.spring(swipeX, {
      toValue: 0, useNativeDriver: true, tension: 80, friction: 12,
    }).start();
  }, [swipeX]);

  useEffect(() => {
    registerSwipeReset(entry.id, resetSwipe);
  }, [entry.id, resetSwipe, registerSwipeReset]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > 12 && Math.abs(gs.dx) > Math.abs(gs.dy) * 1.8,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        onResetOtherSwipes(entry.id);
      },
      onPanResponderMove: (_, gs) => {
        if (gs.dx < 0) {
          const clamped = Math.max(gs.dx, -80);
          swipeX.setValue(clamped);
        } else if (swipeOpen.current) {
          const base = -80;
          swipeX.setValue(Math.min(base + gs.dx, 0));
        }
      },
      onPanResponderRelease: (_, gs) => {
        const shouldOpen = gs.dx < -35 || gs.vx < -0.4;
        const shouldClose = gs.dx > 20 || gs.vx > 0.3;
        if (swipeOpen.current) {
          if (shouldClose) {
            swipeOpen.current = false;
            Animated.spring(swipeX, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }).start();
          } else {
            Animated.spring(swipeX, { toValue: -80, useNativeDriver: true, tension: 80, friction: 12 }).start();
          }
        } else {
          if (shouldOpen) {
            swipeOpen.current = true;
            Animated.spring(swipeX, { toValue: -80, useNativeDriver: true, tension: 80, friction: 12 }).start();
          } else {
            Animated.spring(swipeX, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }).start();
          }
        }
      },
      onPanResponderTerminate: () => {
        swipeOpen.current = false;
        Animated.spring(swipeX, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }).start();
      },
    })
  ).current;

  const handleCardPress = () => {
    if (swipeOpen.current) {
      resetSwipe();
      return;
    }
    onToggle();
  };

  return (
    <View style={{ marginBottom: 12, borderRadius: 14, overflow: 'hidden' }}>
      {/* Delete button -- sits behind the card */}
      <View style={[styles.deleteBtn, { backgroundColor: '#cc3333' }]}>
        <TouchableOpacity
          onPress={() => {
            resetSwipe();
            setTimeout(() => onDelete(entry.id), 150);
          }}
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="trash-outline" size={20} color="#ffffff" />
          <Text style={{ color: '#ffffff', fontSize: 10, fontFamily: 'DMSans_700Bold', marginTop: 2 }}>Delete</Text>
        </TouchableOpacity>
      </View>

      {/* Swipeable card */}
      <Animated.View
        style={[{ transform: [{ translateX: swipeX }], backgroundColor: theme.bgPrimary, borderRadius: 14 }]}
        {...panResponder.panHandlers}
      >
        <View style={[styles.card, {
          backgroundColor: theme.bgCard,
          borderColor: theme.borderCard,
          borderTopColor: theme.borderCardTop,
        }]}>
          {/* Header row -- tappable */}
          <TouchableOpacity onPress={handleCardPress} activeOpacity={0.8}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={[styles.dateText, { color: theme.textMuted }]}>{formatDate(entry.date)}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={[styles.categoryPill, { backgroundColor: meta.color + '22', borderColor: meta.color + '55' }]}>
                  <Ionicons name={meta.icon as any} size={10} color={meta.color} />
                  <Text style={[styles.categoryPillText, { color: meta.color }]}>{meta.label}</Text>
                </View>
                <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={14} color={theme.textDim} />
              </View>
            </View>
            <Text style={[styles.entryTitle, { color: theme.textPrimary }]}>{entry.title}</Text>
            {entry.verseRef && (
              <Text style={[styles.verseRef, { color: meta.color }]}>{entry.verseRef}</Text>
            )}
            {entry.bookRef && (
              <Text style={[styles.verseRef, { color: meta.color }]}>{entry.bookRef}</Text>
            )}
          </TouchableOpacity>

          {/* Expand body */}
          <Animated.View style={{ opacity: fadeAnim, display: visible ? 'flex' : 'none' }}>
            <View style={{ marginTop: 12, paddingBottom: 4 }}>
              {entry.verseText ? (
                <View style={[styles.verseBox, { backgroundColor: theme.bgCardVerse, borderColor: theme.borderCardVerse }]}>
                  <Text style={[styles.verseText, { color: theme.textSecondary }]}>"{entry.verseText}"</Text>
                </View>
              ) : null}

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, marginBottom: 6 }}>
                <Text style={[styles.reflectionLabel, { color: theme.textMuted }]}>
                  {(isEditing ? editCategory : entry.category) === 'verse'     ? 'YOUR REFLECTION' :
                   (isEditing ? editCategory : entry.category) === 'prayer'    ? 'YOUR PRAYER'     :
                   (isEditing ? editCategory : entry.category) === 'study'     ? 'STUDY NOTES'     :
                   (isEditing ? editCategory : entry.category) === 'gratitude' ? 'GRATITUDE'       : 'YOUR NOTE'}
                </Text>
                {!isEditing && (
                  <TouchableOpacity
                    onPress={() => {
                      setEditingId(entry.id);
                      setEditTitle(entry.title);
                      setEditNotes(entry.notes);
                      setEditCategory(entry.category);
                    }}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="pencil-outline" size={12} color={theme.accentBlue} />
                    <Text style={{ fontSize: 11, color: theme.accentBlue, fontFamily: 'DMSans_600SemiBold' }}>Edit</Text>
                  </TouchableOpacity>
                )}
              </View>

              {isEditing ? (
                <View>
                  <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>TITLE</Text>
                  <TextInput
                    style={[styles.fieldInput, {
                      backgroundColor: theme.bgInput,
                      borderColor: theme.borderInput,
                      color: theme.textPrimary,
                      marginBottom: 10,
                    }]}
                    value={editTitle}
                    onChangeText={setEditTitle}
                    autoFocus
                    placeholder="Entry title..."
                    placeholderTextColor={theme.textPlaceholder}
                  />
                  {/* Category picker -- only for non-verse entries */}
                  {entry.category !== 'verse' && (
                    <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                      {(Object.keys(CATEGORY_META) as Category[])
                        .filter(c => c !== 'verse')
                        .map(cat => {
                          const m = CATEGORY_META[cat];
                          const active = editCategory === cat;
                          return (
                            <TouchableOpacity
                              key={cat}
                              onPress={() => setEditCategory(cat)}
                              style={[styles.categoryPill, {
                                backgroundColor: active ? m.color + '33' : 'transparent',
                                borderColor: active ? m.color : theme.borderCard,
                              }]}
                            >
                              <Ionicons name={m.icon as any} size={10} color={active ? m.color : theme.textMuted} />
                              <Text style={[styles.categoryPillText, { color: active ? m.color : theme.textMuted }]}>
                                {m.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                    </View>
                  )}
                  <TextInput
                    ref={notesInputRef}
                    style={[styles.editInput, {
                      backgroundColor: theme.bgInput,
                      borderColor: theme.borderInput,
                      color: theme.textPrimary,
                    }]}
                    value={editNotes}
                    onChangeText={setEditNotes}
                    multiline
                    numberOfLines={4}
                    placeholder="Write here..."
                    placeholderTextColor={theme.textPlaceholder}
                    onBlur={() => notesInputRef.current?.setNativeProps({ selection: { start: 0, end: 0 } })}
                  />
                </View>
              ) : (
                entry.notes ? (
                  <Text style={[styles.reflectionText, { color: theme.textPrimary }]}>{entry.notes}</Text>
                ) : (
                  <Text style={[styles.noReflection, { color: theme.textDim }]}>Nothing written. Tap edit to add.</Text>
                )
              )}
            </View>
          </Animated.View>
        </View>
      </Animated.View>
    </View>
  );
}

// ─── JournalScreen ─────────────────────────────────────────────────────────────

export default function JournalScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { showToast } = useToast();
  const params = useLocalSearchParams();

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [filterCategory, setFilterCategory] = useState<Category | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editCategory, setEditCategory] = useState<Category>('personal');

  const [showCategorySheet, setShowCategorySheet] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createCategory, setCreateCategory] = useState<Category>('personal');
  const [createTitle, setCreateTitle] = useState('');
  const [createNotes, setCreateNotes] = useState('');
  const [createBookRef, setCreateBookRef] = useState('');

  const fabScale = useRef(new Animated.Value(1)).current;
  const categorySheetAnim = useRef(new Animated.Value(0)).current;
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollViewRef = useRef<any>(null);
  const entryYPositions = useRef<Record<string, number>>({});

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardWillShow', e => {
      const h = e.endCoordinates.height;
      setKeyboardHeight(h);
      if (editingId && entryYPositions.current[editingId] !== undefined) {
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({
            y: Math.max(0, entryYPositions.current[editingId] - 80),
            animated: true,
          });
        }, 50);
      }
    });
    const hideSub = Keyboard.addListener('keyboardWillHide', () => {
      setKeyboardHeight(0);
    });
    return () => { showSub.remove(); hideSub.remove(); };
  }, [editingId]);

  // Registry of swipe-reset functions keyed by entry id
  const swipeResetRegistry = useRef<Record<string, () => void>>({});

  const registerSwipeReset = useCallback((id: string, fn: () => void) => {
    swipeResetRegistry.current[id] = fn;
  }, []);

  const resetOtherSwipes = useCallback((exceptId: string) => {
    Object.entries(swipeResetRegistry.current).forEach(([id, fn]) => {
      if (id !== exceptId) fn();
    });
  }, []);

  const todayKey = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();

  useEffect(() => { loadEntries(); }, []);

  const autoExpandFired = useRef(false);

  useEffect(() => {
    const expandId = params.expandDate as string | undefined;
    if (expandId && entries.length > 0 && !autoExpandFired.current) {
      const found = entries.find(e => e.id === expandId);
      if (found) {
        autoExpandFired.current = true;
        const t = setTimeout(() => {
          setExpandedIds(prev => { const next = new Set(prev); next.add(found.id); return next; });
        }, 300);
        return () => clearTimeout(t);
      }
    }
  }, [params.expandDate, entries]);

  const loadEntries = async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const migrated = parsed.map(migrateEntry);
        setEntries(migrated);
        await storageSet(STORAGE_KEY, JSON.stringify(migrated));
      }
    } catch (e) { console.log('Journal load error', e); }
  };

  const saveEntries = async (updated: JournalEntry[]) => {
    await storageSet(STORAGE_KEY, JSON.stringify(updated));
    setEntries(updated);
  };

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        setEditingId(prev2 => {
          if (prev2 === id) {
            Keyboard.dismiss();
            return null;
          }
          return prev2;
        });
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const deleteEntry = async (id: string) => {
    const entry = entries.find(e => e.id === id);
    const updated = entries.filter(e => e.id !== id);
    await saveEntries(updated);
    if (entry?.category === 'fitness') {
      try {
        const raw = await AsyncStorage.getItem('pj_workout_state');
        if (raw) {
          const data = JSON.parse(raw);
          if (data.workoutNotes?.[entry.date] !== undefined) {
            data.workoutNotes[entry.date] = '';
            await storageSet('pj_workout_state', JSON.stringify(data));
          }
        }
      } catch {}
    }
    if (entry?.category === 'personal') {
      try {
        const raw = await AsyncStorage.getItem(`pj_${entry.date}`);
        const data = raw ? JSON.parse(raw) : {};
        await storageSet(`pj_${entry.date}`, JSON.stringify({ ...data, dailyNote: '' }));
      } catch {}
    }
    setExpandedIds(prev => { const next = new Set(prev); next.delete(id); return next; });
    showToast('Entry deleted', undefined, 'info');
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const updated = entries.map(e =>
      e.id === editingId ? { ...e, title: editTitle.trim() || e.title, notes: editNotes.trim(), category: editCategory } : e
    );
    await saveEntries(updated);
    showToast('Entry updated', undefined, 'success');
    setEditingId(null);
    setEditTitle('');
    setEditNotes('');
  };

  const createEntry = async () => {
    if (!createTitle.trim() && !createNotes.trim()) return;
    const id = `${todayKey}_${Date.now()}`;
    const entry: JournalEntry = {
      id,
      date: todayKey,
      category: createCategory,
      title: createTitle.trim() || CATEGORY_META[createCategory].label,
      notes: createNotes.trim(),
      bookRef: createCategory === 'study' ? createBookRef.trim() : undefined,
    };
    const updated = [entry, ...entries];
    await saveEntries(updated);
    showToast('Entry saved', undefined, 'success');

    // Journal achievement check (personal/fitness/gratitude/workout only)
    const GENERAL_JOURNAL_CATS: Category[] = ['personal', 'fitness', 'gratitude', 'workout'];
    if (GENERAL_JOURNAL_CATS.includes(entry.category)) {
      const generalCount = updated.filter(e => GENERAL_JOURNAL_CATS.includes(e.category)).length;
      const store = await loadAchievements();
      let s = store;
      const journalMilestones = [
        { id: 'faith_first_journal', threshold: 1  },
        { id: 'faith_10_journal',    threshold: 10 },
      ];
      for (const m of journalMilestones) {
        if (generalCount >= m.threshold) {
          const { newlyUnlocked, updatedStore } = await checkAndUnlock(m.id, s);
          s = updatedStore;
          if (newlyUnlocked) {
            const def = ACHIEVEMENTS.find(a => a.id === m.id);
            if (def) { showAchievementToast(def); showCelebration(def.tier, def.name); }
          }
        }
      }
    }

    // Momentum check -- fires from anywhere, once-per-day gate handles dedup
    const momentumUnlocked = await checkMomentumAchievements();
    momentumUnlocked.forEach(def => {
      showCelebration(def.tier, def.name);
      showAchievementToast(def);
    });

    setShowCreateModal(false);
    setCreateTitle('');
    setCreateNotes('');
    setCreateBookRef('');
  };

  const openCategorySheet = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowCategorySheet(true);
    Animated.spring(categorySheetAnim, {
      toValue: 1, useNativeDriver: true, tension: 65, friction: 11,
    }).start();
  };

  const closeCategorySheet = () => {
    Animated.timing(categorySheetAnim, {
      toValue: 0, duration: 250, useNativeDriver: true,
    }).start(() => setShowCategorySheet(false));
  };

  const selectCategory = (cat: Category) => {
    setCreateCategory(cat);
    closeCategorySheet();
    setTimeout(() => setShowCreateModal(true), 300);
  };

  const fabPressIn = () =>
    Animated.timing(fabScale, { toValue: 0.93, duration: 100, useNativeDriver: true }).start();
  const fabPressOut = () =>
    Animated.timing(fabScale, { toValue: 1, duration: 150, useNativeDriver: true }).start();

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  };

  const filtered = filterCategory
    ? entries.filter(e => e.category === filterCategory)
    : entries;

  const categorySheetTranslate = categorySheetAnim.interpolate({
    inputRange: [0, 1], outputRange: [600, 0],
  });

  return (
    <LinearGradient
      colors={[theme.gradientStart, theme.gradientEnd]}
      style={[styles.container, { paddingTop: insets.top }]}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.borderCard }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.headerBtn, { backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder }]}
        >
          <Ionicons name="chevron-back" size={14} color={theme.accentBlue} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.accentBlueRaw }]}>JOURNAL</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Filter pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ maxHeight: 44, borderBottomWidth: 0.5, borderBottomColor: theme.borderCard }}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8, alignItems: 'center', paddingVertical: 8 }}
      >
        <TouchableOpacity
          onPress={() => setFilterCategory(null)}
          style={[styles.filterPill, {
            backgroundColor: !filterCategory ? theme.accentBlueBg : 'transparent',
            borderColor: !filterCategory ? theme.accentBlueBorder : theme.borderCard,
          }]}
        >
          <Text style={[styles.filterPillText, { color: !filterCategory ? theme.accentBlue : theme.textMuted }]}>All</Text>
        </TouchableOpacity>
        {(Object.keys(CATEGORY_META) as Category[]).map(cat => {
          const meta = CATEGORY_META[cat];
          const active = filterCategory === cat;
          return (
            <TouchableOpacity
              key={cat}
              onPress={() => setFilterCategory(active ? null : cat)}
              style={[styles.filterPill, {
                backgroundColor: active ? meta.color + '22' : 'transparent',
                borderColor: active ? meta.color + '55' : theme.borderCard,
              }]}
            >
              <Ionicons name={meta.icon as any} size={10} color={active ? meta.color : theme.textMuted} />
              <Text style={[styles.filterPillText, { color: active ? meta.color : theme.textMuted }]}>{meta.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Entry list */}
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        onScrollBeginDrag={() => {
          Object.values(swipeResetRegistry.current).forEach(fn => fn());
        }}
        onTouchStart={() => {
          Object.values(swipeResetRegistry.current).forEach(fn => fn());
        }}
      >
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="journal-outline" size={40} color={theme.iconMuted} />
            <Text style={[styles.emptyTitle, { color: theme.textMuted }]}>
              {filterCategory ? `No ${CATEGORY_META[filterCategory].label} entries yet` : 'No entries yet'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.textDim }]}>
              {filterCategory
                ? 'Try a different filter or tap + to create one.'
                : 'Tap the + button to create your first entry.'}
            </Text>
          </View>
        ) : (
          filtered.map(entry => (
            <View
              key={entry.id}
              onLayout={e => {
                entryYPositions.current[entry.id] = e.nativeEvent.layout.y;
              }}
            >
            <SwipeableEntry
              entry={entry}
              isExpanded={expandedIds.has(entry.id)}
              onToggle={() => toggleExpand(entry.id)}
              editingId={editingId}
              setEditingId={setEditingId}
              editTitle={editTitle}
              setEditTitle={setEditTitle}
              editNotes={editNotes}
              setEditNotes={setEditNotes}
              editCategory={editCategory}
              setEditCategory={setEditCategory}
              onSaveEdit={saveEdit}
              onDelete={deleteEntry}
              onResetOtherSwipes={resetOtherSwipes}
              registerSwipeReset={registerSwipeReset}
              theme={theme}
              formatDate={formatDate}
            />
            </View>
          ))
        )}
      </ScrollView>

      {/* FAB */}
      <Animated.View style={[styles.fab, { transform: [{ scale: fabScale }] }]}>
        <TouchableOpacity
          onPressIn={fabPressIn}
          onPressOut={fabPressOut}
          onPress={openCategorySheet}
          activeOpacity={0.99}
          style={[styles.fabBtn, { backgroundColor: theme.accentBlueRaw }]}
        >
          <Ionicons name="add" size={28} color="#ffffff" />
        </TouchableOpacity>
      </Animated.View>

      {/* Category picker sheet */}
      {showCategorySheet && (
        <Modal transparent animationType="none" visible={showCategorySheet} onRequestClose={closeCategorySheet}>
          <TouchableOpacity
            style={[styles.overlay, { backgroundColor: theme.overlayBg }]}
            activeOpacity={1}
            onPress={closeCategorySheet}
          />
          <Animated.View style={[styles.sheet, {
            backgroundColor: theme.bgSheet,
            borderColor: theme.borderSheet,
            transform: [{ translateY: categorySheetTranslate }],
          }]}>
            <View style={[styles.sheetHandle, { backgroundColor: theme.sheetHandle }]} />
            <Text style={[styles.sheetTitle, { color: theme.textPrimary }]}>New Entry</Text>
            <Text style={[styles.sheetSubtitle, { color: theme.textDim }]}>What would you like to write about?</Text>
            <View style={{ gap: 10, marginTop: 8 }}>
              {(Object.keys(CATEGORY_META) as Category[]).filter(c => c !== 'verse').map(cat => {
                const meta = CATEGORY_META[cat];
                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => selectCategory(cat)}
                    style={[styles.categoryRow, { borderColor: theme.borderCard, backgroundColor: theme.bgCard }]}
                  >
                    <View style={[styles.categoryIcon, { backgroundColor: meta.color + '22' }]}>
                      <Ionicons name={meta.icon as any} size={20} color={meta.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.categoryRowLabel, { color: theme.textPrimary }]}>{meta.label}</Text>
                      <Text style={[styles.categoryRowDesc, { color: theme.textDim }]}>
                        {cat === 'prayer'    ? 'A prayer or conversation with God' :
                         cat === 'study'     ? 'Bible study notes with scripture reference' :
                         cat === 'personal'  ? 'Personal thoughts and reflections' :
                         cat === 'fitness'   ? 'Workout notes and fitness reflections' :
                                              'What are you grateful for today?'}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={14} color={theme.textDim} />
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>
        </Modal>
      )}

      {/* Floating edit save bar -- sits just above keyboard */}
      {editingId && keyboardHeight > 0 && (
        <View style={[styles.floatingEditBar, {
          bottom: keyboardHeight,
          backgroundColor: theme.bgSheet,
          borderColor: theme.borderCard,
        }]}>
          <TouchableOpacity
            onPress={() => { setEditingId(null); setEditTitle(''); setEditNotes(''); Keyboard.dismiss(); }}
            style={[styles.floatingEditBtn, { backgroundColor: theme.bgInput, borderColor: theme.borderInput }]}
          >
            <Text style={{ fontSize: 13, color: theme.textMuted, fontFamily: 'DMSans_600SemiBold' }}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { saveEdit(); Keyboard.dismiss(); }}
            style={[styles.floatingEditBtn, { flex: 2, backgroundColor: theme.accentGreenBg, borderColor: theme.accentGreenBorder }]}
          >
            <Ionicons name="checkmark" size={14} color={theme.accentGreen} />
            <Text style={{ fontSize: 13, color: theme.accentGreen, fontFamily: 'DMSans_600SemiBold' }}>Save</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Create entry modal */}
      {showCreateModal && (
        <Modal transparent animationType="fade" visible={showCreateModal} onRequestClose={() => setShowCreateModal(false)}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[styles.overlay, { backgroundColor: theme.overlayBg, justifyContent: 'center', alignItems: 'center' }]}
          >
            <View style={[styles.createModal, { backgroundColor: theme.bgSheet, borderColor: theme.borderCard }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <View style={[styles.categoryIcon, { backgroundColor: CATEGORY_META[createCategory].color + '22' }]}>
                  <Ionicons name={CATEGORY_META[createCategory].icon as any} size={18} color={CATEGORY_META[createCategory].color} />
                </View>
                <Text style={[styles.createModalTitle, { color: theme.textPrimary }]}>
                  New {CATEGORY_META[createCategory].label}
                </Text>
              </View>

              <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>TITLE</Text>
              <TextInput
                style={[styles.fieldInput, {
                  backgroundColor: theme.bgInput,
                  borderColor: theme.borderInput,
                  color: theme.textPrimary,
                  marginBottom: 12,
                }]}
                placeholder={
                  createCategory === 'prayer'    ? 'Prayer for...' :
                  createCategory === 'study'     ? 'Study topic...' :
                  createCategory === 'gratitude' ? 'Grateful for...' :
                  createCategory === 'fitness'   ? 'Workout note...' : 'Title...'
                }
                placeholderTextColor={theme.textPlaceholder}
                value={createTitle}
                onChangeText={setCreateTitle}
                autoFocus
              />

              {createCategory === 'study' && (
                <>
                  <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>SCRIPTURE REFERENCE</Text>
                  <TextInput
                    style={[styles.fieldInput, {
                      backgroundColor: theme.bgInput,
                      borderColor: theme.borderInput,
                      color: theme.textPrimary,
                      marginBottom: 12,
                    }]}
                    placeholder="e.g. John 3:16"
                    placeholderTextColor={theme.textPlaceholder}
                    value={createBookRef}
                    onChangeText={setCreateBookRef}
                  />
                </>
              )}

              <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>
                {createCategory === 'prayer'    ? 'YOUR PRAYER' :
                 createCategory === 'study'     ? 'NOTES'       :
                 createCategory === 'gratitude' ? 'DETAILS'     : 'YOUR THOUGHTS'}
              </Text>
              <TextInput
                style={[styles.notesInput, {
                  backgroundColor: theme.bgInput,
                  borderColor: theme.borderInput,
                  color: theme.textPrimary,
                }]}
                placeholder="Write here..."
                placeholderTextColor={theme.textPlaceholder}
                multiline
                numberOfLines={5}
                value={createNotes}
                onChangeText={setCreateNotes}
              />

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                <TouchableOpacity
                  onPress={() => setShowCreateModal(false)}
                  style={[styles.modalBtn, { backgroundColor: theme.bgInput, borderColor: theme.borderInput }]}
                >
                  <Text style={{ fontSize: 13, color: theme.textMuted, fontFamily: 'DMSans_600SemiBold' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={createEntry}
                  style={[styles.modalBtn, { flex: 2, backgroundColor: theme.accentGreenBg, borderColor: theme.accentGreenBorder }]}
                >
                  <Ionicons name="checkmark" size={14} color={theme.accentGreen} />
                  <Text style={{ fontSize: 13, color: theme.accentGreen, fontFamily: 'DMSans_600SemiBold' }}>Save Entry</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container:         { flex: 1 },
  header:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5 },
  headerBtn:         { borderWidth: 1, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6, height: 32, alignItems: 'center', justifyContent: 'center' },
  headerTitle:       { fontSize: 20, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2 },
  emptyState:        { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyTitle:        { fontSize: 16, fontFamily: 'DMSans_600SemiBold' },
  emptySubtitle:     { fontSize: 13, fontFamily: 'DMSans_400Regular', textAlign: 'center', lineHeight: 20, paddingHorizontal: 24 },
  card:              { borderWidth: 0.5, borderRadius: 14, padding: 16, borderTopWidth: 0.5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6 },
  dateText:          { fontSize: 11, fontFamily: 'DMSans_700Bold', letterSpacing: 1, textTransform: 'uppercase' },
  entryTitle:        { fontSize: 15, fontFamily: 'DMSans_600SemiBold', marginBottom: 2 },
  categoryPill:      { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3 },
  categoryPillText:  { fontSize: 9, fontFamily: 'DMSans_700Bold' },
  filterPill:        { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  filterPillText:    { fontSize: 11, fontFamily: 'DMSans_600SemiBold' },
  verseRef:          { fontSize: 11, fontFamily: 'DMSans_700Bold', letterSpacing: 2, textTransform: 'uppercase', marginTop: 2 },
  verseBox:          { borderWidth: 1, borderRadius: 8, padding: 12 },
  verseText:         { fontSize: 13, fontFamily: 'DMSans_400Regular', fontStyle: 'italic', lineHeight: 20 },
  reflectionLabel:   { fontSize: 9, fontFamily: 'DMSans_700Bold', letterSpacing: 2, textTransform: 'uppercase' },
  reflectionText:    { fontSize: 14, fontFamily: 'DMSans_400Regular', lineHeight: 22 },
  noReflection:      { fontSize: 12, fontFamily: 'DMSans_400Regular', fontStyle: 'italic', marginTop: 4 },
  editInput:         { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 13, fontFamily: 'DMSans_400Regular', minHeight: 80, textAlignVertical: 'top' },
  editBtn:           { flex: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 8, paddingVertical: 10 },
  deleteBtn:         { position: 'absolute', right: 0, top: 0, bottom: 0, width: 80, alignItems: 'center', justifyContent: 'center', borderRadius: 14, overflow: 'hidden' },
  fab:               { position: 'absolute', bottom: 32, right: 24 },
  fabBtn:            { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  overlay:           { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  sheet:             { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 48, borderTopWidth: 0.5 },
  sheetHandle:       { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetTitle:        { fontSize: 20, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2, marginBottom: 4 },
  sheetSubtitle:     { fontSize: 12, fontFamily: 'DMSans_400Regular', marginBottom: 8 },
  categoryRow:       { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 0.5, borderRadius: 12, padding: 14 },
  categoryIcon:      { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  categoryRowLabel:  { fontSize: 14, fontFamily: 'DMSans_600SemiBold', marginBottom: 2 },
  categoryRowDesc:   { fontSize: 11, fontFamily: 'DMSans_400Regular' },
  createModal:       { width: '92%', borderRadius: 14, borderWidth: 0.5, padding: 20 },
  createModalTitle:  { fontSize: 16, fontFamily: 'DMSans_700Bold' },
  fieldLabel:        { fontSize: 9, fontFamily: 'DMSans_700Bold', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 },
  fieldInput:        { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14, fontFamily: 'DMSans_400Regular' },
  notesInput:        { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 13, fontFamily: 'DMSans_400Regular', minHeight: 100, textAlignVertical: 'top' },
  modalBtn:          { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderRadius: 8, paddingVertical: 12 },
  floatingEditBar:   { position: 'absolute', left: 0, right: 0, flexDirection: 'row', gap: 10, padding: 12, borderTopWidth: 0.5, zIndex: 100 },
  floatingEditBtn:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderRadius: 8, paddingVertical: 12 },
});
