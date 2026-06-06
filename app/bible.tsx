import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Alert, Animated, FlatList, KeyboardAvoidingView, Modal, Platform,
    ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import Reanimated, {
  useAnimatedRef, useSharedValue, useAnimatedReaction, withTiming,
  cancelAnimation, scrollTo as reanimatedScrollTo, Easing as ReanimatedEasing,
} from 'react-native-reanimated';
import {
  READING_PLANS, ReadingPlansStorage, formatDayReading,
  getPlanCompletion, getTodayReading,
} from '../data/readingPlans';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ToastRenderer, useToast } from '../components/Toast';
import { storageSet } from '../utils/storage';
import { BIBLE_BOOKS, Book, Chapter, Verse, fetchChapter, parseReference } from '../data/bible-web';
import { useTheme } from '../theme';
import CompanionFAB from '../components/CompanionFAB';
import CompanionChat from '../components/CompanionChat';
import { checkFaithAchievements, getCelebTier } from '../achievementData';
import { showAchievementToast } from '../components/AchievementToast';
import { showCelebration } from '../components/CelebrationOverlay';

interface BibleFavorite {
  ref: string;
  text: string;
  book: string;
  chapter: number;
  verse: number;
  savedAt: number;
}

type ScrollSpeed = 'slow' | 'medium' | 'fast';

const TEXT_SIZES = [
  { label: 'S', size: 14, lineHeight: 22 },
  { label: 'M', size: 16, lineHeight: 26 },
  { label: 'L', size: 19, lineHeight: 30 },
  { label: 'XL', size: 22, lineHeight: 35 },
];

const FONT_OPTIONS = [
  { label: 'DM Sans', family: 'DMSans_400Regular' },
  { label: 'Georgia', family: 'Georgia' },
  { label: 'Palatino', family: 'Palatino' },
];

// px per millisecond -- delta-time based so speed is frame-rate independent
const SPEED_PX_PER_MS: Record<ScrollSpeed, number> = { slow: 0.015, medium: 0.04, fast: 0.09 };

const PREVIEW_TEXT = '"For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life."';
const PREVIEW_REF = 'John 3:16';

const HALO_GOLD = '#e8a020'; // Halo's identity gold (matches the companion FAB)

// A small Latin cross in Halo's gold, used on the verse banner to mean "bring this to Halo."
function HaloCross({ size = 16, color = HALO_GOLD }: { size?: number; color?: string }) {
  const bar = Math.max(2, Math.round(size * 0.2));
  const vH  = Math.round(size * 0.82);
  const hW  = Math.round(size * 0.56);
  return (
    <Svg width={size} height={size}>
      <Rect x={(size - bar) / 2} y={Math.round(size * 0.09)} width={bar} height={vH} rx={1} fill={color} />
      <Rect x={(size - hW) / 2}  y={Math.round(size * 0.30)} width={hW}  height={bar} rx={1} fill={color} />
    </Svg>
  );
}

export default function BibleScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { showToast } = useToast();
  const params = useLocalSearchParams();

  const [companionOpen, setCompanionOpen] = useState(false);
  const [companionSeed, setCompanionSeed] = useState<{ ref: string } | null>(null);
  const [selectedBook, setSelectedBook] = useState<Book>(BIBLE_BOOKS[0]);
  const [selectedChapter, setSelectedChapter] = useState<Chapter>(BIBLE_BOOKS[0].chapters[0]);
  const [chapterVerses, setChapterVerses] = useState<Verse[]>([]);
  const [chapterLoading, setChapterLoading] = useState(false);
  const [showBookPicker, setShowBookPicker] = useState(false);
  const [bookSearch, setBookSearch] = useState('');

  const [highlightedVerse, setHighlightedVerse] = useState<number | null>(null);
  const [highlightedVerseRef, setHighlightedVerseRef] = useState<string | null>(null);
  const [highlightedVerseText, setHighlightedVerseText] = useState<string | null>(null);

  const [showReflectionModal, setShowReflectionModal] = useState(false);
  const [reflectionText, setReflectionText] = useState('');
  const [highlightedVerseAcknowledged, setHighlightedVerseAcknowledged] = useState(false);
  const [dailyVerseRef, setDailyVerseRef] = useState<string | null>(null);

  const [favorites, setFavorites] = useState<BibleFavorite[]>([]);
  const [showFavoritesModal, setShowFavoritesModal] = useState(false);
  const [favoritesSort, setFavoritesSort] = useState<'book' | 'recent'>('book');

  const [bibleTextSize, setBibleTextSize] = useState(16);
  const [bibleFontFamily, setBibleFontFamily] = useState('DMSans_400Regular');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [draftTextSize, setDraftTextSize] = useState(16);
  const [draftFontFamily, setDraftFontFamily] = useState('DMSans_400Regular');

  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  const [showSpeedPicker, setShowSpeedPicker] = useState(false);
  const [autoScrollSpeed, setAutoScrollSpeed] = useState<ScrollSpeed>('medium');
  const [planProgress, setPlanProgress] = useState<ReadingPlansStorage>({});

  const animScrollRef = useAnimatedRef<ScrollView>();
  const verseYPositions = useRef<Record<number, number>>({});
  const shouldScrollOnLoad = useRef(false);
  const lastReadInit = useRef(false); // skip the first commit so the Genesis-1 default never clobbers a saved spot
  const currentScrollYRef = useRef(0);
  const scrollYShared = useSharedValue(0);
  const contentHeightRef = useRef(0);
  const isPausedByTouchRef = useRef(false);
  const bookSheetAnim = useRef(new Animated.Value(0)).current;
  const fabScale = useRef(new Animated.Value(1)).current;
  const fabItem1Anim = useRef(new Animated.Value(0)).current; // Slow -- animates first
  const fabItem2Anim = useRef(new Animated.Value(0)).current; // Medium
  const fabItem3Anim = useRef(new Animated.Value(0)).current; // Fast -- animates last
  const reflectionInputRef = useRef<TextInput>(null);

  const todayKey = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();

  const stopAutoScroll = useCallback(() => {
    setIsAutoScrolling(false);
    cancelAnimation(scrollYShared);
    isPausedByTouchRef.current = false;
  }, [scrollYShared]);

  const openSpeedPicker = () => {
    fabItem1Anim.setValue(0); fabItem2Anim.setValue(0); fabItem3Anim.setValue(0);
    setShowSpeedPicker(true);
    Animated.stagger(60, [
      Animated.spring(fabItem1Anim, { toValue: 1, useNativeDriver: true, friction: 7, tension: 120 }),
      Animated.spring(fabItem2Anim, { toValue: 1, useNativeDriver: true, friction: 7, tension: 120 }),
      Animated.spring(fabItem3Anim, { toValue: 1, useNativeDriver: true, friction: 7, tension: 120 }),
    ]).start();
  };

  const closeSpeedPicker = (cb?: () => void) => {
    Animated.parallel([
      Animated.timing(fabItem1Anim, { toValue: 0, duration: 130, useNativeDriver: true }),
      Animated.timing(fabItem2Anim, { toValue: 0, duration: 130, useNativeDriver: true }),
      Animated.timing(fabItem3Anim, { toValue: 0, duration: 130, useNativeDriver: true }),
    ]).start(() => { setShowSpeedPicker(false); cb?.(); });
  };

  const startAutoScroll = (speed: ScrollSpeed) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAutoScrollSpeed(speed);
    setIsAutoScrolling(true);
    closeSpeedPicker();
    const currentY = currentScrollYRef.current;
    const pxPerMs = SPEED_PX_PER_MS[speed];
    const remaining = contentHeightRef.current - currentY;
    if (remaining <= 0) return;
    scrollYShared.value = currentY;
    scrollYShared.value = withTiming(contentHeightRef.current, {
      duration: remaining / pxPerMs,
      easing: ReanimatedEasing.linear,
    });
  };

  // Load settings + favorites on mount
  useEffect(() => {
    AsyncStorage.getItem('pj_settings').then(raw => {
      if (!raw) return;
      const s = JSON.parse(raw);
      if (s.bibleTextSize)     { setBibleTextSize(s.bibleTextSize); setDraftTextSize(s.bibleTextSize); }
      if (s.bibleFontFamily)   { setBibleFontFamily(s.bibleFontFamily); setDraftFontFamily(s.bibleFontFamily); }
      if (s.autoScrollSpeed)   setAutoScrollSpeed(s.autoScrollSpeed);
      if (s.bibleFavoritesSort) setFavoritesSort(s.bibleFavoritesSort);
    });
    AsyncStorage.getItem('pj_bible_favorites').then(raw => {
      setFavorites(raw ? JSON.parse(raw) : []);
    });
  }, []);

  // Load chapter
  useEffect(() => {
    let cancelled = false;
    setChapterLoading(true);
    setChapterVerses([]);
    verseYPositions.current = {};
    fetchChapter(selectedBook.name, selectedChapter.chapter).then(verses => {
      if (!cancelled) { setChapterVerses(verses); setChapterLoading(false); }
    });
    return () => { cancelled = true; };
  }, [selectedBook.name, selectedChapter.chapter]);

  // Auto-center after chapter loads
  useEffect(() => {
    if (!shouldScrollOnLoad.current || !highlightedVerse || chapterVerses.length === 0) return;
    const t = setTimeout(() => {
      const y = verseYPositions.current[highlightedVerse];
      if (y !== undefined) animScrollRef.current?.scrollTo({ y: Math.max(0, y - 120), animated: true });
      shouldScrollOnLoad.current = false;
    }, 350);
    return () => clearTimeout(t);
  }, [chapterVerses, highlightedVerse]);

  // Stop auto-scroll on chapter change
  useEffect(() => {
    stopAutoScroll();
    currentScrollYRef.current = 0;
    scrollYShared.value = 0;
  }, [selectedBook.name, selectedChapter.chapter, stopAutoScroll, scrollYShared]);

  useEffect(() => () => { stopAutoScroll(); }, [stopAutoScroll]);

  // Drive scroll on UI thread -- zero bridge overhead per frame
  useAnimatedReaction(
    () => scrollYShared.value,
    (y) => { reanimatedScrollTo(animScrollRef, 0, y, false); }
  );


  useFocusEffect(
    useCallback(() => {
      if (highlightedVerseRef) loadTodayAcknowledged(highlightedVerseRef);
    }, [highlightedVerseRef])
  );

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem('pj_reading_plans').then(raw => {
        setPlanProgress(raw ? JSON.parse(raw) : {});
      }).catch(() => {});
    }, [])
  );

  useEffect(() => {
    const ref = params.verseRef as string | undefined;
    const text = params.verseText as string | undefined;
    const planBook = params.planNavBook as string | undefined;
    const planChapter = params.planNavChapter as string | undefined;
    const openBook = params.openBook as string | undefined;
    const openChapter = params.openChapter as string | undefined;
    if (ref) {
      setDailyVerseRef(ref);
      shouldScrollOnLoad.current = true;
      navigateToRef(ref, text);
    } else if (planBook && planChapter) {
      const bk = BIBLE_BOOKS.find(b => b.name === planBook);
      if (bk) {
        const chNum = parseInt(planChapter, 10);
        const ch = bk.chapters[chNum - 1];
        if (ch) { setSelectedBook(bk); setSelectedChapter(ch); }
      }
    } else if (openBook && openChapter) {
      // "Continue reading" / "Where do I start" from the faith Bible card: open at a book + chapter.
      navigateToPlanPassage(openBook, parseInt(openChapter, 10));
    }
  }, []);

  // Persist the reading position so the faith Bible card can offer "Continue reading." Written via
  // storageSet so it rides the cloud backup; touches no other key. The first commit is skipped so a
  // bare Genesis-1 open (the default) never overwrites a real saved spot; only genuine navigation
  // or a targeted open records a position.
  useEffect(() => {
    if (!lastReadInit.current) { lastReadInit.current = true; return; }
    storageSet('pj_bible_last_read', JSON.stringify({ book: selectedBook.name, chapter: selectedChapter.chapter })).catch(() => {});
  }, [selectedBook.name, selectedChapter.chapter]);

  const loadTodayAcknowledged = async (verseRef: string) => {
    try {
      const raw = await AsyncStorage.getItem('pj_bible_reflections');
      const all = raw ? JSON.parse(raw) : [];
      const entry = all.find((r: any) => r.category === 'verse' && r.date === todayKey && r.verseRef === verseRef);
      if (entry?.acknowledged) {
        setHighlightedVerseAcknowledged(true);
        if (entry.notes) setReflectionText(entry.notes);
      } else {
        setHighlightedVerseAcknowledged(false);
        setReflectionText('');
      }
    } catch (e) {}
  };

  const navigateToRef = (ref: string, verseText?: string) => {
    const parsed = parseReference(ref);
    if (!parsed) return;
    const book = BIBLE_BOOKS.find(b => b.name === parsed.book || b.shortName === parsed.book || b.name.startsWith(parsed.book));
    if (!book) return;
    const chapter = book.chapters.find(c => c.chapter === parsed.chapter);
    if (!chapter) return;
    setSelectedBook(book);
    setSelectedChapter(chapter);
    setHighlightedVerse(parsed.verseStart);
    setHighlightedVerseRef(ref);
    setHighlightedVerseText(verseText || null);
    loadTodayAcknowledged(ref);
  };

  const handleVerseTap = (verseNum: number, verseText: string) => {
    if (highlightedVerse === verseNum) {
      setHighlightedVerse(null); setHighlightedVerseRef(null);
      setHighlightedVerseText(null); setHighlightedVerseAcknowledged(false);
      return;
    }
    const ref = `${selectedBook.name} ${selectedChapter.chapter}:${verseNum}`;
    setHighlightedVerse(verseNum); setHighlightedVerseRef(ref);
    setHighlightedVerseText(verseText); setReflectionText('');
    loadTodayAcknowledged(ref);
  };

  // Share the highlighted verse via the native sheet (which includes Copy on iOS).
  const shareVerse = () => {
    if (!highlightedVerseRef || !highlightedVerseText) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Share.share({ message: `"${highlightedVerseText}" ${highlightedVerseRef} (KJV)` }).catch(() => {});
  };

  // Bring the highlighted verse to Halo: open the companion with the verse attached as context.
  const discussVerseWithHalo = () => {
    if (!highlightedVerseRef) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCompanionSeed({ ref: highlightedVerseRef });
    setCompanionOpen(true);
  };

  const toggleFavorite = async () => {
    if (!highlightedVerseRef || !highlightedVerseText || highlightedVerse === null) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const raw = await AsyncStorage.getItem('pj_bible_favorites');
      const all: BibleFavorite[] = raw ? JSON.parse(raw) : [];
      const idx = all.findIndex(f => f.ref === highlightedVerseRef);
      if (idx >= 0) {
        all.splice(idx, 1);
        showToast('Removed from favorites', undefined, 'success');
      } else {
        all.push({ ref: highlightedVerseRef, text: highlightedVerseText, book: selectedBook.name, chapter: selectedChapter.chapter, verse: highlightedVerse, savedAt: Date.now() });
        showToast('Verse saved', undefined, 'success');
      }
      await storageSet('pj_bible_favorites', JSON.stringify(all));
      setFavorites(all);
    } catch (e) {}
  };

  const removeFavorite = async (ref: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      const raw = await AsyncStorage.getItem('pj_bible_favorites');
      const all: BibleFavorite[] = raw ? JSON.parse(raw) : [];
      const updated = all.filter(f => f.ref !== ref);
      await storageSet('pj_bible_favorites', JSON.stringify(updated));
      setFavorites(updated); showToast('Removed from favorites', undefined, 'success');
    } catch (e) {}
  };

  const navigateToFavorite = (fav: BibleFavorite) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    shouldScrollOnLoad.current = true;
    navigateToRef(fav.ref, fav.text);
    setShowFavoritesModal(false);
  };

  const toggleFavoritesSort = async (sort: 'book' | 'recent') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFavoritesSort(sort);
    try {
      const raw = await AsyncStorage.getItem('pj_settings');
      const s = raw ? JSON.parse(raw) : {};
      await storageSet('pj_settings', JSON.stringify({ ...s, bibleFavoritesSort: sort }));
    } catch (e) {}
  };

  const isCurrentFavorited = highlightedVerseRef ? favorites.some(f => f.ref === highlightedVerseRef) : false;

  const sortedFavorites = [...favorites].sort((a, b) => {
    if (favoritesSort === 'recent') return b.savedAt - a.savedAt;
    const ai = BIBLE_BOOKS.findIndex(bk => bk.name === a.book);
    const bi = BIBLE_BOOKS.findIndex(bk => bk.name === b.book);
    if (ai !== bi) return ai - bi;
    if (a.chapter !== b.chapter) return a.chapter - b.chapter;
    return a.verse - b.verse;
  });

  const openSettingsModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDraftTextSize(bibleTextSize);
    setDraftFontFamily(bibleFontFamily);
    setShowSettingsModal(true);
  };

  const saveSettings = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setBibleTextSize(draftTextSize);
    setBibleFontFamily(draftFontFamily);
    try {
      const raw = await AsyncStorage.getItem('pj_settings');
      const s = raw ? JSON.parse(raw) : {};
      await storageSet('pj_settings', JSON.stringify({ ...s, bibleTextSize: draftTextSize, bibleFontFamily: draftFontFamily }));
    } catch (e) {}
    setShowSettingsModal(false);
    showToast('Reading settings saved', undefined, 'success');
  };

  const acknowledge = async () => {
    if (!highlightedVerseRef) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const raw = await AsyncStorage.getItem('pj_bible_reflections');
      const all = raw ? JSON.parse(raw) : [];
      const isDailyVerse = highlightedVerseRef === dailyVerseRef;
      const entryId = isDailyVerse ? `${todayKey}_verse` : `${todayKey}_${Date.now()}`;
      const existingIndex = all.findIndex((r: any) => r.category === 'verse' && r.date === todayKey && r.verseRef === highlightedVerseRef);
      const entry = { id: entryId, date: todayKey, category: 'verse', title: highlightedVerseRef, notes: reflectionText.trim(), verseRef: highlightedVerseRef, verseText: highlightedVerseText || '', acknowledged: true };
      if (existingIndex >= 0) { all[existingIndex] = entry; } else { all.unshift(entry); }
      await storageSet('pj_bible_reflections', JSON.stringify(all));
      setHighlightedVerseAcknowledged(true);
      setShowReflectionModal(false);
      showToast(reflectionText.trim() ? 'Reflection saved' : 'Verse marked as read', highlightedVerseRef, 'success');
      // Faith achievement check for verse reflections
      checkFaithAchievements('verse').then(unlocked => {
        unlocked.forEach(def => { showCelebration(getCelebTier(def), def.name, def); showAchievementToast(def); });
      }).catch(() => {});
      router.push({ pathname: '/journal', params: { expandDate: entry.id } });
    } catch (e) {}
  };

  const navigateToPlanPassage = (book: string, startChapter: number) => {
    const bk = BIBLE_BOOKS.find(b => b.name === book);
    if (!bk) return;
    const ch = bk.chapters[startChapter - 1];
    if (!ch) return;
    setSelectedBook(bk);
    setSelectedChapter(ch);
    setHighlightedVerse(null);
    setHighlightedVerseRef(null);
    setHighlightedVerseText(null);
    setHighlightedVerseAcknowledged(false);
    animScrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  const markPlanRead = async (planId: string, dayIndex: number) => {
    try {
      const raw = await AsyncStorage.getItem('pj_reading_plans');
      const all: ReadingPlansStorage = raw ? JSON.parse(raw) : {};
      const prog = all[planId];
      if (!prog || prog.completedDays.includes(dayIndex)) return;
      const updated = { ...all, [planId]: { ...prog, completedDays: [...prog.completedDays, dayIndex] } };
      await storageSet('pj_reading_plans', JSON.stringify(updated));
      setPlanProgress(updated);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const plan = READING_PLANS.find(p => p.id === planId);
      showToast(`Day ${dayIndex + 1} marked complete`, plan?.shortName, 'success');
      // Faith achievement check for bible reading days
      checkFaithAchievements('bible').then(unlocked => {
        unlocked.forEach(def => { showCelebration(getCelebTier(def), def.name, def); showAchievementToast(def); });
      }).catch(() => {});
    } catch (e) {}
  };

  const unmarkPlanRead = async (planId: string, dayIndex: number) => {
    try {
      const raw = await AsyncStorage.getItem('pj_reading_plans');
      const all: ReadingPlansStorage = raw ? JSON.parse(raw) : {};
      const prog = all[planId];
      if (!prog) return;
      const updated = { ...all, [planId]: { ...prog, completedDays: prog.completedDays.filter(d => d !== dayIndex) } };
      await storageSet('pj_reading_plans', JSON.stringify(updated));
      setPlanProgress(updated);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      showToast('Marked as unread', undefined, 'info');
    } catch (e) {}
  };

  const openBookPicker = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowBookPicker(true);
    Animated.spring(bookSheetAnim, { toValue: 1, useNativeDriver: true, tension: 65, friction: 11 }).start();
  };

  const closeBookPicker = () => {
    Animated.timing(bookSheetAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => setShowBookPicker(false));
  };

  const selectBook = (book: Book) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedBook(book); setSelectedChapter(book.chapters[0]);
    setHighlightedVerse(null); setHighlightedVerseRef(null); setHighlightedVerseText(null); setHighlightedVerseAcknowledged(false);
    closeBookPicker();
  };

  const selectChapter = (chapter: Chapter) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedChapter(chapter);
    setHighlightedVerse(null); setHighlightedVerseRef(null); setHighlightedVerseText(null); setHighlightedVerseAcknowledged(false);
  };

  const filteredBooks = BIBLE_BOOKS.filter(b => b.name.toLowerCase().includes(bookSearch.toLowerCase()));
  const otBooks = filteredBooks.filter(b => b.testament === 'OT');
  const ntBooks = filteredBooks.filter(b => b.testament === 'NT');

  const bookSheetTranslate = bookSheetAnim.interpolate({ inputRange: [0, 1], outputRange: [800, 0] });
  const verseLineHeight = TEXT_SIZES.find(s => s.size === bibleTextSize)?.lineHeight ?? 26;
  const draftLineHeight = TEXT_SIZES.find(s => s.size === draftTextSize)?.lineHeight ?? 26;

  return (
    <LinearGradient colors={[theme.gradientStart, theme.gradientEnd]} style={[styles.container, { paddingTop: insets.top }]}>

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.borderCard }]}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }} style={[styles.headerBtn, { backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder }]}>
          <Ionicons name="chevron-back" size={14} color={theme.accentBlue} />
        </TouchableOpacity>
        <TouchableOpacity onPress={openBookPicker} style={styles.headerTitle}>
          <Text style={[styles.headerBookName, { color: theme.accentBlueRaw }]}>{selectedBook.name}</Text>
          <Ionicons name="chevron-down" size={14} color={theme.accentBlueRaw} />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowFavoritesModal(true); }} style={[styles.headerBtn, { backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder }]}>
            <Ionicons name="star" size={14} color={theme.accentBlue} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/journal'); }} style={[styles.headerBtn, { backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder }]}>
            <Ionicons name="book" size={14} color={theme.accentBlue} />
          </TouchableOpacity>
          <TouchableOpacity onPress={openSettingsModal} style={[styles.headerBtn, { backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder }]}>
            <Ionicons name="settings-outline" size={14} color={theme.accentBlue} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Chapter picker */}
      <View style={[styles.chapterBar, { borderBottomColor: theme.borderCard }]}>
        <FlatList
          horizontal showsHorizontalScrollIndicator={false}
          data={selectedBook.chapters}
          keyExtractor={ch => String(ch.chapter)}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 10 }}
          renderItem={({ item: ch }) => (
            <TouchableOpacity
              onPress={() => selectChapter(ch)}
              style={[styles.chapterPill, {
                backgroundColor: selectedChapter.chapter === ch.chapter ? theme.accentBlueBg : 'transparent',
                borderColor: selectedChapter.chapter === ch.chapter ? theme.accentBlueBorder : theme.borderCard,
              }]}
            >
              <Text style={[styles.chapterPillText, { color: selectedChapter.chapter === ch.chapter ? theme.accentBlue : theme.textMuted }]}>
                {ch.chapter}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Reading plan strip */}
      {READING_PLANS.filter(p => !!planProgress[p.id]).length > 0 && (
        <View style={{ borderBottomWidth: 0.5, borderBottomColor: theme.borderCard }}>
          <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 2 }}>
            <Text style={{ fontSize: 8, fontFamily: 'DMSans_700Bold', letterSpacing: 3, color: theme.textDim, textTransform: 'uppercase', marginBottom: 6 }}>
              TODAY'S READING
            </Text>
          </View>
          {READING_PLANS.filter(p => !!planProgress[p.id]).map(plan => {
            const prog = planProgress[plan.id];
            const reading = getTodayReading(plan, prog);
            const { total } = getPlanCompletion(plan, prog);
            return (
              <View key={plan.id} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8, gap: 8 }}>
                <Ionicons name={plan.icon as any} size={12} color={theme.textDim} />
                {reading === 'complete' ? (
                  <>
                    <Text style={{ flex: 1, fontSize: 11, fontFamily: 'DMSans_600SemiBold', color: theme.textMuted }} numberOfLines={1}>
                      {plan.shortName}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons name="checkmark-circle" size={13} color={theme.accentGreen} />
                      <Text style={{ fontSize: 11, fontFamily: 'DMSans_600SemiBold', color: theme.accentGreen }}>
                        Complete
                      </Text>
                    </View>
                  </>
                ) : (
                  <>
                    <TouchableOpacity
                      style={{ flex: 1 }}
                      onPress={() => navigateToPlanPassage(reading.day.passages[0].book, reading.day.passages[0].startChapter)}
                    >
                      <Text style={{ fontSize: 11, fontFamily: 'DMSans_600SemiBold', color: theme.accentBlueRaw }} numberOfLines={1}>
                        {formatDayReading(reading.day)}
                      </Text>
                      <Text style={{ fontSize: 9, fontFamily: 'DMSans_400Regular', color: theme.textDim }}>
                        Day {reading.dayIndex + 1}/{total} · {plan.shortName}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => reading.isRead
                        ? unmarkPlanRead(plan.id, reading.dayIndex)
                        : markPlanRead(plan.id, reading.dayIndex)
                      }
                      activeOpacity={0.7}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 4,
                        borderWidth: 1, borderRadius: 5,
                        paddingHorizontal: 8, paddingVertical: 4,
                        backgroundColor: reading.isRead ? theme.accentGreenBg : theme.accentBlueBg,
                        borderColor: reading.isRead ? theme.accentGreenBorder : theme.accentBlueBorder,
                      }}
                    >
                      <Ionicons
                        name={reading.isRead ? 'checkmark-circle' : 'bookmark-outline'}
                        size={11}
                        color={reading.isRead ? theme.accentGreen : theme.accentBlue}
                      />
                      <Text style={{ fontSize: 10, fontFamily: 'DMSans_600SemiBold', color: reading.isRead ? theme.accentGreen : theme.accentBlue }}>
                        {reading.isRead ? 'Read' : 'Mark Read'}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* Reflect banner + favorite star */}
      {highlightedVerse !== null && highlightedVerseRef && (
        <View style={[styles.acknowledgeBanner, {
          backgroundColor: highlightedVerseAcknowledged ? theme.accentGreenBg : theme.accentBlueBg,
          borderColor: highlightedVerseAcknowledged ? theme.accentGreenBorder : theme.accentBlueBorder,
        }]}>
          <TouchableOpacity
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); highlightedVerseAcknowledged ? router.push({ pathname: '/journal', params: { expandDate: `${todayKey}_verse` } }) : setShowReflectionModal(true); }}
          >
            <Ionicons
              name={highlightedVerseAcknowledged ? 'checkmark-circle-outline' : 'book-outline'}
              size={14}
              color={highlightedVerseAcknowledged ? theme.accentGreen : theme.accentBlue}
            />
            <Text style={[styles.acknowledgeText, { color: highlightedVerseAcknowledged ? theme.accentGreen : theme.accentBlue }]}>
              {highlightedVerseAcknowledged ? `Reflected · ${highlightedVerseRef}` : `Reflect · ${highlightedVerseRef}`}
            </Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <TouchableOpacity onPress={toggleFavorite} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name={isCurrentFavorited ? 'star' : 'star-outline'} size={16} color={isCurrentFavorited ? theme.accentAmber : theme.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity onPress={shareVerse} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="share-outline" size={16} color={theme.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity onPress={discussVerseWithHalo} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <HaloCross size={16} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Verses */}
      <Reanimated.ScrollView
        ref={animScrollRef}
        contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={e => { currentScrollYRef.current = e.nativeEvent.contentOffset.y; }}
        onContentSizeChange={(_, h) => { contentHeightRef.current = h; }}
        onScrollBeginDrag={() => {
          if (isAutoScrolling) {
            isPausedByTouchRef.current = true;
            cancelAnimation(scrollYShared);
          }
        }}
        onScrollEndDrag={e => {
          if (isPausedByTouchRef.current) {
            isPausedByTouchRef.current = false;
            const y = e.nativeEvent.contentOffset.y;
            currentScrollYRef.current = y;
            scrollYShared.value = y;
            const pxPerMs = SPEED_PX_PER_MS[autoScrollSpeed];
            const remaining = contentHeightRef.current - y;
            if (remaining > 0) {
              scrollYShared.value = withTiming(contentHeightRef.current, {
                duration: remaining / pxPerMs,
                easing: ReanimatedEasing.linear,
              });
            } else {
              stopAutoScroll();
            }
          }
        }}
      >
        <Text style={[styles.chapterHeader, { color: theme.textMuted }]}>{selectedBook.name} {selectedChapter.chapter}</Text>
        {chapterLoading && <View style={{ paddingTop: 60, alignItems: 'center' }}><Text style={[styles.partialNote, { color: theme.textMuted }]}>Loading...</Text></View>}
        {!chapterLoading && chapterVerses.length === 0 && <View style={{ paddingTop: 60, alignItems: 'center' }}><Text style={[styles.partialNote, { color: theme.textMuted }]}>Could not load chapter. Check your connection.</Text></View>}
        {!chapterLoading && chapterVerses.map(v => {
          const isHighlighted = v.verse === highlightedVerse;
          return (
            <TouchableOpacity
              key={v.verse} activeOpacity={0.7}
              onPress={() => handleVerseTap(v.verse, v.text)}
              onLayout={e => { verseYPositions.current[v.verse] = e.nativeEvent.layout.y; }}
              style={[styles.verseRow, isHighlighted && { backgroundColor: 'rgba(212,134,10,0.5)', borderRadius: 8, marginHorizontal: -8, paddingHorizontal: 8 }]}
            >
              <Text style={[styles.verseNum, { color: isHighlighted ? theme.accentAmber : theme.accentBlue }]}>{v.verse}</Text>
              <Text style={[styles.verseText, { color: theme.textPrimary, fontSize: bibleTextSize, lineHeight: verseLineHeight, fontFamily: bibleFontFamily }]}>{v.text}</Text>
            </TouchableOpacity>
          );
        })}
        <Text style={[styles.partialNote, { color: theme.textDim }]}>King James Version (KJV)</Text>
      </Reanimated.ScrollView>

      {/* FAB backdrop */}
      {showSpeedPicker && (
        <TouchableOpacity style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} activeOpacity={1} onPress={() => closeSpeedPicker()} />
      )}

      {/* Speed dial items */}
      {showSpeedPicker && (
        <View style={{ position: 'absolute', bottom: 90 + insets.bottom, right: 20, alignItems: 'flex-end', gap: 12 }}>
          {/* Fast -- top, animates last */}
          <Animated.View style={{ opacity: fabItem3Anim, transform: [{ translateY: fabItem3Anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <TouchableOpacity onPress={() => startAutoScroll('fast')} style={{ backgroundColor: theme.accentBlue, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, shadowColor: theme.accentBlue, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 6 }}>
                <Text style={{ color: '#ffffff', fontSize: 13, fontFamily: 'DMSans_600SemiBold' }}>Fast</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => startAutoScroll('fast')} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.accentBlue, alignItems: 'center', justifyContent: 'center', shadowColor: theme.accentBlue, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 6 }}>
                <Ionicons name="flash-outline" size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Medium */}
          <Animated.View style={{ opacity: fabItem2Anim, transform: [{ translateY: fabItem2Anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <TouchableOpacity onPress={() => startAutoScroll('medium')} style={{ backgroundColor: theme.accentBlue, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, shadowColor: theme.accentBlue, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 6 }}>
                <Text style={{ color: '#ffffff', fontSize: 13, fontFamily: 'DMSans_600SemiBold' }}>Medium</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => startAutoScroll('medium')} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.accentBlue, alignItems: 'center', justifyContent: 'center', shadowColor: theme.accentBlue, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 6 }}>
                <Ionicons name="play-outline" size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Slow -- bottom, animates first */}
          <Animated.View style={{ opacity: fabItem1Anim, transform: [{ translateY: fabItem1Anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <TouchableOpacity onPress={() => startAutoScroll('slow')} style={{ backgroundColor: theme.accentBlue, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, shadowColor: theme.accentBlue, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 6 }}>
                <Text style={{ color: '#ffffff', fontSize: 13, fontFamily: 'DMSans_600SemiBold' }}>Slow</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => startAutoScroll('slow')} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.accentBlue, alignItems: 'center', justifyContent: 'center', shadowColor: theme.accentBlue, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 6 }}>
                <Ionicons name="leaf-outline" size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      )}

      {/* Auto-scroll FAB */}
      <Animated.View style={{ position: 'absolute', bottom: 20 + insets.bottom, right: 20, transform: [{ scale: fabScale }] }}>
        <TouchableOpacity
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); if (isAutoScrolling) { stopAutoScroll(); } else if (showSpeedPicker) { closeSpeedPicker(); } else { openSpeedPicker(); } }}
          onPressIn={() => Animated.timing(fabScale, { toValue: 0.9, duration: 80, useNativeDriver: true }).start()}
          onPressOut={() => Animated.timing(fabScale, { toValue: 1, duration: 80, useNativeDriver: true }).start()}
          activeOpacity={1}
          style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: theme.accentBlue, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 }}
        >
          <Ionicons name={isAutoScrolling ? 'square' : showSpeedPicker ? 'close' : 'play'} size={isAutoScrolling ? 22 : showSpeedPicker ? 26 : 22} color="#ffffff" />
        </TouchableOpacity>
      </Animated.View>

      {/* Book picker sheet */}
      {showBookPicker && (
        <Modal transparent animationType="none" visible={showBookPicker} onRequestClose={closeBookPicker}>
          <TouchableOpacity style={[styles.overlay, { backgroundColor: theme.overlayBg }]} activeOpacity={1} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); closeBookPicker(); }} />
          <Animated.View style={[styles.bookSheet, { backgroundColor: theme.bgSheet, borderColor: theme.borderSheet, transform: [{ translateY: bookSheetTranslate }] }]}>
            <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); closeBookPicker(); }} style={{ alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 24, marginBottom: 8 }}>
              <View style={[styles.sheetHandle, { backgroundColor: theme.sheetHandle }]} />
            </TouchableOpacity>
            <Text style={[styles.sheetTitle, { color: theme.textPrimary }]}>Books</Text>
            <View style={[styles.searchBox, { backgroundColor: theme.bgInput, borderColor: theme.borderInput }]}>
              <Ionicons name="search-outline" size={14} color={theme.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: theme.textPrimary }]}
                placeholder="Search books..." placeholderTextColor={theme.textPlaceholder}
                value={bookSearch} onChangeText={setBookSearch}
              />
            </View>
            <FlatList
              keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
              data={[
                ...(otBooks.length ? [{ type: 'header', label: 'OLD TESTAMENT' }] : []),
                ...otBooks.map(b => ({ type: 'book', book: b })),
                ...(ntBooks.length ? [{ type: 'header', label: 'NEW TESTAMENT' }] : []),
                ...ntBooks.map(b => ({ type: 'book', book: b })),
              ]}
              keyExtractor={(_, i) => String(i)}
              contentContainerStyle={{ paddingBottom: 60 }}
              renderItem={({ item }: { item: any }) => {
                if (item.type === 'header') return <Text style={[styles.testamentHeader, { color: theme.textMuted }]}>{item.label}</Text>;
                const isSelected = selectedBook.name === item.book.name;
                return (
                  <TouchableOpacity onPress={() => selectBook(item.book)} style={[styles.bookRow, { borderBottomColor: theme.borderSubtle, backgroundColor: isSelected ? theme.accentBlueBg : 'transparent' }]}>
                    <Text style={[styles.bookRowText, { color: isSelected ? theme.accentBlue : theme.textPrimary, fontFamily: isSelected ? 'DMSans_700Bold' : 'DMSans_400Regular' }]}>{item.book.name}</Text>
                    <Text style={[styles.bookRowChapters, { color: theme.textDim }]}>{item.book.chapters.length} ch</Text>
                  </TouchableOpacity>
                );
              }}
            />
          </Animated.View>
        </Modal>
      )}

      {/* Reflection modal */}
      {showReflectionModal && (
        <Modal transparent animationType="fade" visible={showReflectionModal} onRequestClose={() => setShowReflectionModal(false)}>
          <ToastRenderer />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.overlay, { backgroundColor: theme.overlayBg, justifyContent: 'center', alignItems: 'center' }]}>
            <View style={[styles.centeredModal, { backgroundColor: theme.bgSheet, borderColor: theme.borderCard }]}>
              <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowReflectionModal(false); }} style={{ alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 24, marginBottom: 4 }}>
                <View style={[styles.sheetHandle, { backgroundColor: theme.sheetHandle }]} />
              </TouchableOpacity>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <Ionicons name="book-outline" size={14} color={theme.accentAmber} />
                <Text style={[styles.reflectionTitle, { color: theme.textPrimary }]}>Today's Reflection</Text>
              </View>
              {highlightedVerseRef && (
                <View style={[styles.reflectionVerse, { backgroundColor: theme.bgSheet, borderColor: theme.borderCardVerse }]}>
                  <Text style={[styles.reflectionVerseText, { color: theme.textSecondary }]}>"{highlightedVerseText}"</Text>
                  <Text style={[styles.reflectionVerseRef, { color: theme.textMuted }]}>{highlightedVerseRef}</Text>
                </View>
              )}
              <TextInput
                ref={reflectionInputRef}
                style={[styles.reflectionInput, { backgroundColor: theme.bgInput, borderColor: theme.borderInput, color: theme.textPrimary }]}
                placeholder="Write a reflection... (optional)" placeholderTextColor={theme.textPlaceholder}
                multiline numberOfLines={4} value={reflectionText} onChangeText={setReflectionText}
                onBlur={() => reflectionInputRef.current?.setNativeProps({ selection: { start: 0, end: 0 } })}
              />
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowReflectionModal(false); }} style={[styles.modalBtn, { backgroundColor: theme.bgInput, borderColor: theme.borderInput }]}>
                  <Text style={[styles.modalBtnText, { color: theme.textMuted }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={acknowledge} style={[styles.modalBtn, { backgroundColor: theme.accentGreenBg, borderColor: theme.accentGreenBorder, flex: 2 }]}>
                  <Ionicons name="checkmark" size={14} color={theme.accentGreen} />
                  <Text style={[styles.modalBtnText, { color: theme.accentGreen }]}>{reflectionText.trim() ? 'Save Reflection' : 'Mark as Read'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      )}

      {/* Favorites modal */}
      {showFavoritesModal && (
        <Modal transparent animationType="fade" visible={showFavoritesModal} onRequestClose={() => setShowFavoritesModal(false)}>
          <ToastRenderer />
          <TouchableOpacity style={[styles.overlay, { backgroundColor: theme.overlayBg }]} activeOpacity={1} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowFavoritesModal(false); }} />
          <View style={[styles.overlay, { justifyContent: 'center', alignItems: 'center' }]} pointerEvents="box-none">
            <View style={[styles.centeredModal, { backgroundColor: theme.bgSheet, borderColor: theme.borderCard }]}>
              <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowFavoritesModal(false); }} style={{ alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 24, marginBottom: 4 }}>
                <View style={[styles.sheetHandle, { backgroundColor: theme.sheetHandle }]} />
              </TouchableOpacity>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <Text style={[styles.sheetTitle, { color: theme.accentBlue, marginBottom: 0 }]}>Saved Verses</Text>
                <View style={{ flexDirection: 'row', backgroundColor: theme.bgInput, borderRadius: 8, borderWidth: 1, borderColor: theme.borderInput, overflow: 'hidden' }}>
                  {(['book', 'recent'] as const).map(s => (
                    <TouchableOpacity key={s} onPress={() => toggleFavoritesSort(s)} style={{ paddingHorizontal: 10, paddingVertical: 6, backgroundColor: favoritesSort === s ? theme.accentBlueBg : 'transparent' }}>
                      <Text style={{ fontSize: 11, fontFamily: 'DMSans_600SemiBold', color: favoritesSort === s ? theme.accentBlue : theme.textMuted }}>
                        {s === 'book' ? 'Book Order' : 'Recent'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              {sortedFavorites.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 32, gap: 8 }}>
                  <Ionicons name="star-outline" size={32} color={theme.textDim} />
                  <Text style={{ fontSize: 14, fontFamily: 'DMSans_700Bold', color: theme.textSecondary }}>No saved verses yet</Text>
                  <Text style={{ fontSize: 12, fontFamily: 'DMSans_400Regular', color: theme.textMuted, textAlign: 'center' }}>Tap a verse, then tap the star to save it here.</Text>
                </View>
              ) : (
                <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
                  {sortedFavorites.map(fav => (
                    <TouchableOpacity key={fav.ref} onPress={() => navigateToFavorite(fav)} style={[styles.favRow, { borderBottomColor: theme.borderSubtle }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 12, fontFamily: 'DMSans_700Bold', color: theme.accentBlue, marginBottom: 2 }}>{fav.ref}</Text>
                        <Text style={{ fontSize: 12, fontFamily: 'DMSans_400Regular', color: theme.textSecondary }} numberOfLines={2}>{fav.text}</Text>
                      </View>
                      <TouchableOpacity onPress={() => removeFavorite(fav.ref)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name="trash-outline" size={16} color={theme.statusBad} />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>
      )}

      {/* Settings modal */}
      {showSettingsModal && (
        <Modal transparent animationType="fade" visible={showSettingsModal} onRequestClose={() => setShowSettingsModal(false)}>
          <ToastRenderer />
          <TouchableOpacity style={[styles.overlay, { backgroundColor: theme.overlayBg }]} activeOpacity={1} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowSettingsModal(false); }} />
          <View style={[styles.overlay, { justifyContent: 'center', alignItems: 'center' }]} pointerEvents="box-none">
            <View style={[styles.centeredModal, { backgroundColor: theme.bgSheet, borderColor: theme.borderCard }]}>
              <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowSettingsModal(false); }} style={{ alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 24, marginBottom: 4 }}>
                <View style={[styles.sheetHandle, { backgroundColor: theme.sheetHandle }]} />
              </TouchableOpacity>
              <Text style={[styles.sheetTitle, { color: theme.accentBlue }]}>Bible Settings</Text>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {/* Live preview -- fixed height so modal doesn't resize */}
                <View style={{ backgroundColor: theme.bgInput, borderRadius: 8, borderWidth: 1, borderColor: theme.borderInput, padding: 14, marginBottom: 20, height: 130, overflow: 'hidden' }}>
                  <Text style={{ fontFamily: draftFontFamily, fontSize: draftTextSize, lineHeight: draftLineHeight, color: theme.textPrimary, marginBottom: 6 }} numberOfLines={4}>
                    {PREVIEW_TEXT}
                  </Text>
                  <Text style={{ fontSize: 9, fontFamily: 'DMSans_700Bold', letterSpacing: 2, color: theme.textMuted, textTransform: 'uppercase' }}>{PREVIEW_REF}</Text>
                </View>

                {/* Text size */}
                <Text style={[styles.settingLabel, { color: theme.textMuted }]}>TEXT SIZE</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                  {TEXT_SIZES.map(opt => (
                    <TouchableOpacity key={opt.label} onPress={() => setDraftTextSize(opt.size)}
                      style={[styles.settingPill, { flex: 1, backgroundColor: draftTextSize === opt.size ? theme.accentBlueBg : theme.bgInput, borderColor: draftTextSize === opt.size ? theme.accentBlueBorder : theme.borderInput }]}
                    >
                      <Text style={{ fontSize: 13, fontFamily: 'DMSans_600SemiBold', color: draftTextSize === opt.size ? theme.accentBlue : theme.textMuted }}>{opt.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Font */}
                <Text style={[styles.settingLabel, { color: theme.textMuted }]}>FONT</Text>
                <View style={{ gap: 8, marginBottom: 20 }}>
                  {FONT_OPTIONS.map(opt => (
                    <TouchableOpacity key={opt.family} onPress={() => setDraftFontFamily(opt.family)}
                      style={[styles.settingPill, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: draftFontFamily === opt.family ? theme.accentBlueBg : theme.bgInput, borderColor: draftFontFamily === opt.family ? theme.accentBlueBorder : theme.borderInput }]}
                    >
                      <Text style={{ fontFamily: opt.family, fontSize: 15, color: draftFontFamily === opt.family ? theme.accentBlue : theme.textPrimary }}>{opt.label}</Text>
                      {draftFontFamily === opt.family && <Ionicons name="checkmark" size={14} color={theme.accentBlue} />}
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Plans */}
                <TouchableOpacity
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowSettingsModal(false); router.push({ pathname: '/plans', params: { tab: 'reading' } }); }}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderTopWidth: 0.5, borderTopColor: theme.borderSubtle, marginBottom: 16 }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="calendar-outline" size={16} color={theme.accentBlue} />
                    <View>
                      <Text style={{ fontSize: 14, fontFamily: 'DMSans_600SemiBold', color: theme.textPrimary }}>Plans</Text>
                      {Object.keys(planProgress).length > 0 && (
                        <Text style={{ fontSize: 11, fontFamily: 'DMSans_400Regular', color: theme.textMuted }}>
                          {Object.keys(planProgress).length} active plan{Object.keys(planProgress).length !== 1 ? 's' : ''}
                        </Text>
                      )}
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={15} color={theme.textMuted} />
                </TouchableOpacity>

                {/* Buttons */}
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowSettingsModal(false); }} style={[styles.modalBtn, { backgroundColor: theme.bgInput, borderColor: theme.borderInput }]}>
                    <Text style={[styles.modalBtnText, { color: theme.textMuted }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={saveSettings} style={[styles.modalBtn, { backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder, flex: 2 }]}>
                    <Ionicons name="checkmark" size={14} color={theme.accentBlue} />
                    <Text style={[styles.modalBtnText, { color: theme.accentBlue }]}>Save</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* Halo, the faith companion: bottom-left so it never collides with the bottom-right
          auto-scroll FAB. Tier-gated inside the component (hidden for Not Right Now). */}
      <CompanionFAB onPress={() => { setCompanionSeed(null); setCompanionOpen(true); }} bottom={20 + insets.bottom} />
      <CompanionChat visible={companionOpen} seedContext={companionSeed} onClose={() => setCompanionOpen(false)} />

    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container:           { flex: 1 },
  header:              { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5 },
  headerBtn:           { borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, height: 32, alignItems: 'center', justifyContent: 'center' },
  headerTitle:         { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerBookName:      { fontSize: 20, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2 },
  chapterBar:          { height: 52, borderBottomWidth: 0.5 },
  chapterPill:         { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  chapterPillText:     { fontSize: 12, fontFamily: 'DMSans_600SemiBold' },
  acknowledgeBanner:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 12, borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  acknowledgeText:     { fontSize: 11, fontFamily: 'DMSans_600SemiBold', flex: 1 },
  chapterHeader:       { fontSize: 11, fontFamily: 'DMSans_700Bold', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 20 },
  verseRow:            { flexDirection: 'row', gap: 12, marginBottom: 16 },
  verseNum:            { fontSize: 11, fontFamily: 'DMSans_700Bold', marginTop: 2, minWidth: 20 },
  verseText:           { flex: 1 },
  partialNote:         { fontSize: 10, fontFamily: 'DMSans_400Regular', textAlign: 'center', marginTop: 24, fontStyle: 'italic' },
  overlay:             { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  bookSheet:           { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%', borderTopWidth: 0.5, padding: 20, paddingBottom: 0 },
  centeredModal:       { width: '90%', borderRadius: 14, borderWidth: 0.5, padding: 20, maxHeight: '88%' },
  sheetHandle:         { width: 36, height: 4, borderRadius: 2 },
  sheetTitle:          { fontSize: 18, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2, marginBottom: 12 },
  searchBox:           { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12 },
  searchInput:         { flex: 1, fontSize: 14, fontFamily: 'DMSans_400Regular' },
  testamentHeader:     { fontSize: 9, fontFamily: 'DMSans_700Bold', letterSpacing: 3, textTransform: 'uppercase', paddingVertical: 8, paddingHorizontal: 4 },
  bookRow:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 0.5 },
  bookRowText:         { fontSize: 15 },
  bookRowChapters:     { fontSize: 11, fontFamily: 'DMSans_400Regular' },
  favRow:              { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 0.5 },
  settingLabel:        { fontSize: 9, fontFamily: 'DMSans_700Bold', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8 },
  settingPill:         { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, alignItems: 'center' },
  reflectionTitle:     { fontSize: 15, fontFamily: 'DMSans_700Bold' },
  reflectionVerse:     { borderRadius: 8, borderWidth: 1, padding: 12, marginBottom: 12 },
  reflectionVerseText: { fontSize: 13, fontFamily: 'DMSans_400Regular', fontStyle: 'italic', lineHeight: 20, marginBottom: 6 },
  reflectionVerseRef:  { fontSize: 9, fontFamily: 'DMSans_700Bold', letterSpacing: 2, textTransform: 'uppercase', textAlign: 'right' },
  reflectionInput:     { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 13, fontFamily: 'DMSans_400Regular', minHeight: 80, textAlignVertical: 'top' },
  modalBtn:            { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderRadius: 8, paddingVertical: 12 },
  modalBtnText:        { fontSize: 13, fontFamily: 'DMSans_600SemiBold' },
});
