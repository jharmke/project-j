import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Animated, FlatList, KeyboardAvoidingView, Modal, Platform,
    ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast } from '../components/Toast';
import { BIBLE_BOOKS, Book, Chapter, parseReference } from '../data/bible-web';
import { useTheme } from '../theme';

interface Reflection {
  date: string;
  verseRef: string;
  verseText: string;
  reflection: string;
  acknowledged: boolean;
}

export default function BibleScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { showToast } = useToast();
  const params = useLocalSearchParams();

  // Navigation state
  const [selectedBook, setSelectedBook] = useState<Book>(BIBLE_BOOKS[0]);
  const [selectedChapter, setSelectedChapter] = useState<Chapter>(BIBLE_BOOKS[0].chapters[0]);
  const [showBookPicker, setShowBookPicker] = useState(false);
  const [bookSearch, setBookSearch] = useState('');

  // Highlighted verse from daily card
  const [highlightedVerse, setHighlightedVerse] = useState<number | null>(null);

  // Reflection state
  const [showReflectionModal, setShowReflectionModal] = useState(false);
  const [reflectionText, setReflectionText] = useState('');
  const [todayAcknowledged, setTodayAcknowledged] = useState(false);
  const [dailyVerseRef, setDailyVerseRef] = useState<string | null>(null);
  const [dailyVerseText, setDailyVerseText] = useState<string | null>(null);

  // Sheet animation
  const bookSheetAnim = useRef(new Animated.Value(0)).current;

  const todayKey = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();

  // Re-check acknowledged state whenever screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadTodayAcknowledged();
    }, [])
  );

  // On mount - navigate to today's verse if passed via params
  useEffect(() => {
    const ref = params.verseRef as string | undefined;
    const text = params.verseText as string | undefined;
    if (ref) {
      setDailyVerseRef(ref);
      if (text) setDailyVerseText(text);
      navigateToRef(ref);
    }
    loadTodayAcknowledged();
  }, []);

  const loadTodayAcknowledged = async () => {
    try {
      const raw = await AsyncStorage.getItem('pj_bible_reflections');
      const all = raw ? JSON.parse(raw) : [];
      const todayEntry = all.find((r: any) => r.category === 'verse' && r.date === todayKey);
      if (todayEntry?.acknowledged) {
        setTodayAcknowledged(true);
        if (todayEntry.notes) setReflectionText(todayEntry.notes);
      } else {
        setTodayAcknowledged(false);
        setReflectionText('');
      }
    } catch (e) {
      console.log('Reflection load error', e);
    }
  };

  const navigateToRef = (ref: string) => {
    const parsed = parseReference(ref);
    if (!parsed) return;
    const book = BIBLE_BOOKS.find(b =>
      b.name === parsed.book ||
      b.shortName === parsed.book ||
      b.name.startsWith(parsed.book)
    );
    if (!book) return;
    const chapter = book.chapters.find(c => c.chapter === parsed.chapter);
    if (!chapter) return;
    setSelectedBook(book);
    setSelectedChapter(chapter);
    setHighlightedVerse(parsed.verseStart);
  };

  const openBookPicker = () => {
    setShowBookPicker(true);
    Animated.spring(bookSheetAnim, {
      toValue: 1, useNativeDriver: true, tension: 65, friction: 11,
    }).start();
  };

  const closeBookPicker = () => {
    Animated.timing(bookSheetAnim, {
      toValue: 0, duration: 250, useNativeDriver: true,
    }).start(() => setShowBookPicker(false));
  };

  const selectBook = (book: Book) => {
    setSelectedBook(book);
    setSelectedChapter(book.chapters[0]);
    setHighlightedVerse(null);
    closeBookPicker();
  };

  const selectChapter = (chapter: Chapter) => {
    setSelectedChapter(chapter);
    setHighlightedVerse(null);
  };

  const acknowledge = async () => {
    try {
      const raw = await AsyncStorage.getItem('pj_bible_reflections');
      const all = raw ? JSON.parse(raw) : [];
      const existingIndex = all.findIndex((r: any) => r.category === 'verse' && r.date === todayKey);
      const entry = {
        id: `${todayKey}_verse`,
        date: todayKey,
        category: 'verse',
        title: dailyVerseRef || 'Daily Verse',
        notes: reflectionText.trim(),
        verseRef: dailyVerseRef || '',
        verseText: dailyVerseText || '',
        acknowledged: true,
      };
      if (existingIndex >= 0) {
        all[existingIndex] = entry;
      } else {
        all.unshift(entry);
      }
      await AsyncStorage.setItem('pj_bible_reflections', JSON.stringify(all));
      setTodayAcknowledged(true);
      setShowReflectionModal(false);
      showToast(
        reflectionText.trim() ? 'Reflection saved' : 'Verse marked as read',
        dailyVerseRef || undefined,
        'success'
      );
      router.push({ pathname: '/journal', params: { expandDate: `${todayKey}_verse` } });
    } catch (e) {
      console.log('Reflection save error', e);
    }
  };

  const filteredBooks = BIBLE_BOOKS.filter(b =>
    b.name.toLowerCase().includes(bookSearch.toLowerCase())
  );
  const otBooks = filteredBooks.filter(b => b.testament === 'OT');
  const ntBooks = filteredBooks.filter(b => b.testament === 'NT');

  const bookSheetTranslate = bookSheetAnim.interpolate({
    inputRange: [0, 1], outputRange: [800, 0],
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

        <TouchableOpacity onPress={openBookPicker} style={styles.headerTitle}>
          <Text style={[styles.headerBookName, { color: theme.accentBlueRaw }]}>
            {selectedBook.name}
          </Text>
          <Ionicons name="chevron-down" size={14} color={theme.accentBlueRaw} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/journal')}
          style={[styles.headerBtn, { backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder }]}
        >
          <Ionicons name="journal-outline" size={14} color={theme.accentBlue} />
        </TouchableOpacity>
      </View>

      {/* Chapter picker */}
      <View style={[styles.chapterBar, { borderBottomColor: theme.borderCard }]}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={selectedBook.chapters}
          keyExtractor={ch => String(ch.chapter)}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 10 }}
          renderItem={({ item: ch }) => (
            <TouchableOpacity
              onPress={() => selectChapter(ch)}
              style={[
                styles.chapterPill,
                {
                  backgroundColor: selectedChapter.chapter === ch.chapter
                    ? theme.accentBlueBg : 'transparent',
                  borderColor: selectedChapter.chapter === ch.chapter
                    ? theme.accentBlueBorder : theme.borderCard,
                }
              ]}
            >
              <Text style={[
                styles.chapterPillText,
                { color: selectedChapter.chapter === ch.chapter ? theme.accentBlue : theme.textMuted }
              ]}>
                {ch.chapter}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Today's verse acknowledgment banner */}
      {dailyVerseRef && (
        <TouchableOpacity
          onPress={() => todayAcknowledged ? router.push({ pathname: '/journal', params: { expandDate: `${todayKey}_verse` } }) : setShowReflectionModal(true)}
          style={[styles.acknowledgeBanner, {
            backgroundColor: theme.accentBlueBg,
            borderColor: theme.accentBlueBorder,
          }]}
        >
          <Ionicons
            name={todayAcknowledged ? 'checkmark-circle-outline' : 'book-outline'}
            size={14}
            color={theme.accentBlue}
          />
          <Text style={[styles.acknowledgeText, {
            color: theme.accentBlue,
          }]}>
            {todayAcknowledged
              ? `Reflected · ${dailyVerseRef} · tap to view`
              : `Tap to reflect on today's verse · ${dailyVerseRef}`}
          </Text>
        </TouchableOpacity>
      )}

      {/* Verses */}
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.chapterHeader, { color: theme.textMuted }]}>
          {selectedBook.name} {selectedChapter.chapter}
        </Text>

        {selectedChapter.verses.map(v => {
          const isHighlighted = v.verse === highlightedVerse;
          return (
            <View
              key={v.verse}
              style={[
                styles.verseRow,
                isHighlighted && {
                  backgroundColor: 'rgba(212,134,10,0.12)',
                  borderRadius: 8,
                  marginHorizontal: -8,
                  paddingHorizontal: 8,
                }
              ]}
            >
              <Text style={[styles.verseNum, { color: theme.accentBlue }]}>
                {v.verse}
              </Text>
              <Text style={[styles.verseText, { color: theme.textPrimary }]}>
                {v.text}
              </Text>
            </View>
          );
        })}

        {/* Note about partial chapters */}
        <Text style={[styles.partialNote, { color: theme.textDim }]}>
          Showing key verses from this chapter · World English Bible (WEB)
        </Text>
      </ScrollView>

      {/* Book picker sheet */}
      {showBookPicker && (
        <Modal transparent animationType="none" visible={showBookPicker} onRequestClose={closeBookPicker}>
          <TouchableOpacity
            style={[styles.overlay, { backgroundColor: theme.overlayBg }]}
            activeOpacity={1}
            onPress={closeBookPicker}
          />
          <Animated.View style={[styles.bookSheet, {
            backgroundColor: theme.bgSheet,
            borderColor: theme.borderSheet,
            transform: [{ translateY: bookSheetTranslate }],
          }]}>
            <View style={[styles.sheetHandle, { backgroundColor: theme.sheetHandle }]} />
            <Text style={[styles.sheetTitle, { color: theme.textPrimary }]}>Books</Text>

            {/* Search */}
            <View style={[styles.searchBox, { backgroundColor: theme.bgInput, borderColor: theme.borderInput }]}>
              <Ionicons name="search-outline" size={14} color={theme.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: theme.textPrimary }]}
                placeholder="Search books..."
                placeholderTextColor={theme.textPlaceholder}
                value={bookSearch}
                onChangeText={setBookSearch}
              />
            </View>

            <FlatList
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              data={[
                ...(otBooks.length ? [{ type: 'header', label: 'OLD TESTAMENT' }] : []),
                ...otBooks.map(b => ({ type: 'book', book: b })),
                ...(ntBooks.length ? [{ type: 'header', label: 'NEW TESTAMENT' }] : []),
                ...ntBooks.map(b => ({ type: 'book', book: b })),
              ]}
              keyExtractor={(item, i) => String(i)}
              contentContainerStyle={{ paddingBottom: 60 }}
              renderItem={({ item }: { item: any }) => {
                if (item.type === 'header') {
                  return (
                    <Text style={[styles.testamentHeader, { color: theme.textMuted }]}>
                      {item.label}
                    </Text>
                  );
                }
                const isSelected = selectedBook.name === item.book.name;
                return (
                  <TouchableOpacity
                    onPress={() => selectBook(item.book)}
                    style={[styles.bookRow, {
                      borderBottomColor: theme.borderSubtle,
                      backgroundColor: isSelected ? theme.accentBlueBg : 'transparent',
                    }]}
                  >
                    <Text style={[styles.bookRowText, {
                      color: isSelected ? theme.accentBlue : theme.textPrimary,
                      fontFamily: isSelected ? 'DMSans_700Bold' : 'DMSans_400Regular',
                    }]}>
                      {item.book.name}
                    </Text>
                    <Text style={[styles.bookRowChapters, { color: theme.textDim }]}>
                      {item.book.chapters.length} ch
                    </Text>
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
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[styles.overlay, { backgroundColor: theme.overlayBg, justifyContent: 'center', alignItems: 'center' }]}
          >
            <View style={[styles.reflectionModal, { backgroundColor: theme.bgSheet, borderColor: theme.borderCard, overflow: 'hidden' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <Ionicons name="book-outline" size={14} color={theme.accentAmber} />
                <Text style={[styles.reflectionTitle, { color: theme.textPrimary }]}>Today's Reflection</Text>
              </View>

              {dailyVerseRef && (
                <View style={[styles.reflectionVerse, { backgroundColor: theme.bgSheet, borderColor: theme.borderCardVerse }]}>
                  <Text style={[styles.reflectionVerseText, { color: theme.textSecondary }]}>
                    "{dailyVerseText}"
                  </Text>
                  <Text style={[styles.reflectionVerseRef, { color: theme.textMuted }]}>
                    {dailyVerseRef}
                  </Text>
                </View>
              )}

              <TextInput
                style={[styles.reflectionInput, { backgroundColor: theme.bgInput, borderColor: theme.borderInput, color: theme.textPrimary }]}
                placeholder="Write a reflection... (optional)"
                placeholderTextColor={theme.textPlaceholder}
                multiline
                numberOfLines={4}
                value={reflectionText}
                onChangeText={setReflectionText}
              />

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                <TouchableOpacity
                  onPress={() => setShowReflectionModal(false)}
                  style={[styles.reflectionBtn, { backgroundColor: theme.bgInput, borderColor: theme.borderInput }]}
                >
                  <Text style={[styles.reflectionBtnText, { color: theme.textMuted }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={acknowledge}
                  style={[styles.reflectionBtn, { backgroundColor: theme.accentGreenBg, borderColor: theme.accentGreenBorder, flex: 2 }]}
                >
                  <Ionicons name="checkmark" size={14} color={theme.accentGreen} />
                  <Text style={[styles.reflectionBtnText, { color: theme.accentGreen }]}>
                    {reflectionText.trim() ? 'Save Reflection' : 'Mark as Read'}
                  </Text>
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
  container:          { flex: 1 },
  header:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5 },
  headerBtn:          { borderWidth: 1, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6, height: 32, alignItems: 'center', justifyContent: 'center' },
  headerTitle:        { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerBookName:     { fontSize: 20, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2 },
  chapterBar:         { height: 52, borderBottomWidth: 0.5 },
  chapterPill:        { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  chapterPillText:    { fontSize: 12, fontFamily: 'DMSans_600SemiBold' },
  acknowledgeBanner:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 12, borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  acknowledgeText:    { fontSize: 11, fontFamily: 'DMSans_600SemiBold', flex: 1 },
  chapterHeader:      { fontSize: 11, fontFamily: 'DMSans_700Bold', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 20 },
  verseRow:           { flexDirection: 'row', gap: 12, marginBottom: 16 },
  verseNum:           { fontSize: 11, fontFamily: 'DMSans_700Bold', marginTop: 2, minWidth: 20 },
  verseText:          { fontSize: 16, fontFamily: 'DMSans_400Regular', lineHeight: 26, flex: 1 },
  partialNote:        { fontSize: 10, fontFamily: 'DMSans_400Regular', textAlign: 'center', marginTop: 24, fontStyle: 'italic' },
  overlay:            { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  bookSheet:          { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%', borderTopWidth: 0.5, padding: 20, paddingBottom: 0 },
  sheetHandle:        { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetTitle:         { fontSize: 18, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2, marginBottom: 12 },
  searchBox:          { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12 },
  searchInput:        { flex: 1, fontSize: 14, fontFamily: 'DMSans_400Regular' },
  testamentHeader:    { fontSize: 9, fontFamily: 'DMSans_700Bold', letterSpacing: 3, textTransform: 'uppercase', paddingVertical: 8, paddingHorizontal: 4 },
  bookRow:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 0.5 },
  bookRowText:        { fontSize: 15 },
  bookRowChapters:    { fontSize: 11, fontFamily: 'DMSans_400Regular' },
  reflectionModal:    { width: '90%', borderRadius: 14, borderWidth: 0.5, padding: 20 },
  reflectionTitle:    { fontSize: 15, fontFamily: 'DMSans_700Bold' },
  reflectionVerse:    { borderRadius: 8, borderWidth: 1, padding: 12, marginBottom: 12 },
  reflectionVerseText:{ fontSize: 13, fontFamily: 'DMSans_400Regular', fontStyle: 'italic', lineHeight: 20, marginBottom: 6 },
  reflectionVerseRef: { fontSize: 9, fontFamily: 'DMSans_700Bold', letterSpacing: 2, textTransform: 'uppercase', textAlign: 'right' },
  reflectionInput:    { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 13, fontFamily: 'DMSans_400Regular', minHeight: 80, textAlignVertical: 'top' },
  reflectionBtn:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderRadius: 8, paddingVertical: 12 },
  reflectionBtnText:  { fontSize: 13, fontFamily: 'DMSans_600SemiBold' },
});