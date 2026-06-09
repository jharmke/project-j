import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator, Animated, Keyboard, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { fetchChapter, type Verse } from '../data/bible-web';
import {
  DEVOTIONALS, formatDevotionalPassage, type Devotional, type DevotionalPassage,
} from '../data/devotionals';
import {
  loadDevotionalProgress, saveDevotionalAnswer, saveDevotionalHaloThread, markDevotionalDayComplete,
  unmarkDevotionalDayComplete, getDevotionalEntry, getDevotionalProgress, getNextDay,
} from '../utils/devotionals';
import { useToast } from '../components/Toast';
import CompanionChat, { MiniCross } from '../components/CompanionChat';
import { useTheme } from '../theme';
import type { DevotionalsStorage, DevotionalHaloTurn } from '../data/devotionals';
import { cancelFaithReadingNotification } from '../services/notifications';

/**
 * Devotional day screen. The interactive half of Bucket C (distinct from a pure reading plan).
 * One screen, read top to bottom, no leaving and coming back: the passage is pulled inline
 * (same KJV fetch/cache the reader uses), then our written reflection, then one question the
 * user answers in a text box. Manual reflection is the default; the inline Halo "reflect with
 * this" bonus lands in a later layer. A Stack screen, so the faith-tab modal keyboard bug does
 * not apply here. Progress saves to pj_devotionals via utils/devotionals (read-then-merge).
 */

const GOLD = '#d4860a';
const GOLD_RGB = '212,134,10';
const HALO_GOLD = '#e8a020';  // Halo's own identity color (matches the FAB + chat)
const CROSS_DARK = '#2e1c03';

// Fetch the passage text inline. Handles a verse range within a chapter and a span across
// chapters; trims the first/last chapter to the verse bounds, keeps whole chapters between.
async function loadPassage(passage: DevotionalPassage): Promise<{ chapter: number; verses: Verse[] }[]> {
  const segments: { chapter: number; verses: Verse[] }[] = [];
  for (let ch = passage.startChapter; ch <= passage.endChapter; ch++) {
    let verses = await fetchChapter(passage.book, ch);
    if (ch === passage.startChapter && passage.startVerse != null) {
      verses = verses.filter(v => v.verse >= passage.startVerse!);
    }
    if (ch === passage.endChapter && passage.endVerse != null) {
      verses = verses.filter(v => v.verse <= passage.endVerse!);
    }
    segments.push({ chapter: ch, verses });
  }
  return segments;
}

// Map saved devotional turns <-> Halo's chat vocabulary (stored 'assistant' <-> chat 'halo').
const toChatThread = (turns?: DevotionalHaloTurn[]) =>
  (turns ?? []).map(t => ({ role: t.role === 'assistant' ? ('halo' as const) : ('user' as const), text: t.text }));
const toStoredThread = (turns: { role: 'user' | 'halo'; text: string }[]): DevotionalHaloTurn[] =>
  turns.map(t => ({ role: t.role === 'halo' ? ('assistant' as const) : ('user' as const), text: t.text }));

// App-standard card press: scale to 0.97 on press in, back to 1.0 on release (timing, not spring).
function PressScale({ onPress, style, children }: { onPress: () => void; style: any; children: ReactNode }) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPress}
        onPressIn={() => Animated.timing(scale, { toValue: 0.97, duration: 100, useNativeDriver: true }).start()}
        onPressOut={() => Animated.timing(scale, { toValue: 1, duration: 150, useNativeDriver: true }).start()}
        style={style}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function DevotionalScreen() {
  const { theme, themeId } = useTheme();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const params = useLocalSearchParams<{ id?: string; day?: string }>();

  const id = params.id ?? '';
  const dev: Devotional | undefined = DEVOTIONALS.find(d => d.id === id);

  const [store, setStore] = useState<DevotionalsStorage>({});
  const [storeLoaded, setStoreLoaded] = useState(false);
  const [day, setDay] = useState<number>(params.day ? parseInt(params.day, 10) : 1);
  const [answer, setAnswer] = useState('');
  const [saving, setSaving] = useState(false);
  const [segments, setSegments] = useState<{ chapter: number; verses: Verse[] }[]>([]);
  const [verseLoading, setVerseLoading] = useState(true);
  const [haloOpen, setHaloOpen] = useState(false);

  const seededDayRef = useRef<number | null>(null);
  const didAutoDayRef = useRef(false);
  const answerRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);

  const dayData = dev?.days[day - 1];
  const entry = getDevotionalEntry(store, id, day);
  const completed = !!entry?.completed;
  const dirty = answer.trim() !== (entry?.answer ?? '').trim();
  const canSave = dirty && !saving;

  // Halo reflection saved to this day (only counts once a real user turn exists, so an unsent
  // greeting never shows as a saved conversation).
  const haloThread = entry?.haloThread;
  const hasHaloThread = !!haloThread?.some(t => t.role === 'user');

  // Load progress on focus (cheap, keeps the screen fresh when returning from the reader).
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      loadDevotionalProgress()
        .then(s => { if (alive) { setStore(s); setStoreLoaded(true); } })
        .catch(() => { if (alive) setStoreLoaded(true); });
      return () => { alive = false; };
    }, []),
  );

  // Once progress is loaded, with no explicit day param, resume at the first incomplete day.
  useEffect(() => {
    if (!storeLoaded || !dev || didAutoDayRef.current) return;
    didAutoDayRef.current = true;
    if (!params.day) setDay(getNextDay(dev, getDevotionalProgress(store, id)));
  }, [storeLoaded, dev, id, params.day, store]);

  // Seed the answer box from the saved answer once per day (never clobbers active typing, and a
  // save that returns identical text does not re-seed because the day has not changed).
  useEffect(() => {
    if (!storeLoaded) return;
    if (seededDayRef.current === day) return;
    seededDayRef.current = day;
    setAnswer(getDevotionalEntry(store, id, day)?.answer ?? '');
  }, [storeLoaded, day, store, id]);

  // Fetch the passage text whenever the day changes.
  useEffect(() => {
    if (!dayData) return;
    let alive = true;
    setVerseLoading(true);
    loadPassage(dayData.passage)
      .then(segs => { if (alive) { setSegments(segs); setVerseLoading(false); } })
      .catch(() => { if (alive) { setSegments([]); setVerseLoading(false); } });
    return () => { alive = false; };
  }, [dayData?.passage.book, dayData?.passage.startChapter, dayData?.passage.endChapter, day]);

  const handleSave = async () => {
    if (!canSave) return;
    Keyboard.dismiss();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaving(true);
    const updated = await saveDevotionalAnswer(id, day, answer);
    setStore(updated);
    setSaving(false);
    showToast('Reflection saved', undefined, 'success');
  };

  const handleComplete = async () => {
    Haptics.notificationAsync(
      completed ? Haptics.NotificationFeedbackType.Warning : Haptics.NotificationFeedbackType.Success,
    );
    const updated = completed
      ? await unmarkDevotionalDayComplete(id, day)
      : await markDevotionalDayComplete(id, day);
    setStore(updated);
    showToast(completed ? 'Marked not complete' : 'Day complete', undefined, completed ? 'info' : 'success');
    if (!completed) {
      cancelFaithReadingNotification().catch(() => {});
    }
  };

  const goToDay = (next: number) => {
    if (!dev || next < 1 || next > dev.totalDays) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDay(next);
  };

  const openInReader = () => {
    if (!dayData) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const p = dayData.passage;
    // Pass the verse reference so the reader scrolls to and highlights the passage (the same path
    // Halo's verse links use), not just opens the chapter at the top. Whole-chapter passages with
    // no verse bounds fall back to opening the chapter.
    router.push(
      p.startVerse != null
        ? { pathname: '/bible', params: { verseRef: formatDevotionalPassage(p) } }
        : { pathname: '/bible', params: { openBook: p.book, openChapter: String(p.startChapter) } },
    );
  };

  const openHalo = () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setHaloOpen(true); };

  // Persist the live Halo conversation to this devotional day every time it changes, so it can be
  // reopened and continued. Read-then-merge in the storage layer, never clobbers the typed answer.
  const handleHaloThread = useCallback((turns: { role: 'user' | 'halo'; text: string }[]) => {
    saveDevotionalHaloThread(id, day, toStoredThread(turns)).then(setStore).catch(() => {});
  }, [id, day]);


  // Devotional or day not found: a clean error rather than a blank screen.
  if (!dev || !dayData) {
    return (
      <LinearGradient colors={[theme.gradientStart, theme.gradientEnd]} style={{ flex: 1, paddingTop: insets.top }}>
        <View style={[styles.header, { borderBottomColor: theme.borderCard }]}>
          <TouchableOpacity
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
            style={[styles.headerBtn, { backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder }]}
          >
            <Ionicons name="chevron-back" size={14} color={theme.accentBlue} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.accentBlueRaw }]}>DEVOTIONAL</Text>
          <View style={{ width: 32 }} />
        </View>
        <View style={styles.loading}>
          <Ionicons name="leaf-outline" size={40} color={theme.iconMuted} />
          <Text style={[styles.emptyTitle, { color: theme.textMuted }]}>This devotional could not be found</Text>
        </View>
      </LinearGradient>
    );
  }

  const reflectionParagraphs = dayData.reflection.split('\n\n');

  return (
    <LinearGradient colors={[theme.gradientStart, theme.gradientEnd]} style={{ flex: 1, paddingTop: insets.top }}>

      {/* Header: back, devotional name, day count on the right. */}
      <View style={[styles.header, { borderBottomColor: theme.borderCard }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.headerBtn, { backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder }]}
        >
          <Ionicons name="chevron-back" size={14} color={theme.accentBlue} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.accentBlueRaw }]} numberOfLines={1}>
          {dev.shortName.toUpperCase()}
        </Text>
        <Text style={[styles.dayCount, { color: theme.textMuted }]}>
          {day}/{dev.totalDays}
        </Text>
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 48 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
          {/* Day heading */}
          <Text style={[styles.dayLabel, { color: theme.accentAmber }]}>DAY {day}</Text>
          <Text style={[styles.dayTitle, { color: theme.textPrimary }]}>{dayData.title}</Text>
          <Text style={[styles.passageRef, { color: theme.textSecondary }]}>
            {formatDevotionalPassage(dayData.passage)}
          </Text>

          {/* Passage, shown inline (gold-edged card). */}
          <View
            style={[styles.passageCard, {
              backgroundColor: theme.bgCard,
              borderColor: `rgba(${GOLD_RGB},0.28)`,
              borderTopColor: `rgba(${GOLD_RGB},0.45)`,
            }]}
          >
            {verseLoading ? (
              <ActivityIndicator color={theme.accentAmber} style={{ paddingVertical: 12 }} />
            ) : segments.length === 0 || segments.every(s => s.verses.length === 0) ? (
              <Text style={[styles.passageFallback, { color: theme.textSecondary }]}>
                The passage could not be loaded right now. Tap below to read it in the Bible.
              </Text>
            ) : (
              segments.map(seg => (
                <Text key={seg.chapter} style={[styles.passageText, { color: theme.textPrimary }]}>
                  {seg.verses.map(v => (
                    <Text key={v.verse}>
                      <Text style={[styles.verseNum, { color: theme.accentAmber }]}>{v.verse} </Text>
                      {v.text}{' '}
                    </Text>
                  ))}
                </Text>
              ))
            )}
            <TouchableOpacity onPress={openInReader} style={styles.readerLink} activeOpacity={0.7}>
              <Ionicons name="book-outline" size={13} color={theme.accentBlue} />
              <Text style={[styles.readerLinkText, { color: theme.accentBlue }]}>Read the full chapter</Text>
            </TouchableOpacity>
          </View>

          {/* Our reflection */}
          {reflectionParagraphs.map((para, i) => (
            <Text key={i} style={[styles.reflection, { color: theme.textPrimary }]}>
              {para}
            </Text>
          ))}

          {/* The reflection question + answer box */}
          <View style={styles.reflectBlock}>
            <Text style={[styles.reflectLabel, { color: theme.textMuted }]}>REFLECT</Text>
            <Text style={[styles.question, { color: theme.accentAmber }]}>{dayData.question}</Text>
            <TextInput
              ref={answerRef}
              value={answer}
              onChangeText={setAnswer}
              onBlur={() => answerRef.current?.setNativeProps({ selection: { start: 0, end: 0 } })}
              onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80)}
              placeholder="Write your reflection..."
              placeholderTextColor={theme.textDim}
              multiline
              style={[styles.answerInput, {
                backgroundColor: theme.bgInput ?? '#13131e',
                color: theme.textPrimary,
                borderColor: theme.borderCard,
              }]}
            />
            <TouchableOpacity
              onPress={handleSave}
              disabled={!canSave}
              activeOpacity={0.85}
              style={[styles.saveBtn, {
                backgroundColor: canSave ? GOLD : `rgba(${GOLD_RGB},0.16)`,
                borderColor: canSave ? GOLD : `rgba(${GOLD_RGB},0.22)`,
              }]}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={[styles.saveBtnText, { color: canSave ? '#fff' : theme.textDim }]}>
                  Save reflection
                </Text>
              )}
            </TouchableOpacity>

            {/* Reflect with Halo: opens the companion seeded with this passage + question, saving
                the conversation to this day so it can be reopened and continued. */}
            {hasHaloThread ? (
              <PressScale
                onPress={openHalo}
                style={[styles.haloRow, {
                  backgroundColor: theme.bgCard,
                  borderColor: `rgba(${GOLD_RGB},0.30)`,
                  borderTopColor: `rgba(${GOLD_RGB},0.45)`,
                }]}
              >
                <View style={[styles.haloBadge, { backgroundColor: HALO_GOLD }]}>
                  <MiniCross size={15} color={CROSS_DARK} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.haloRowTitle, { color: theme.accentAmber }]}>Your reflection with Halo</Text>
                  <Text numberOfLines={1} style={[styles.haloRowPreview, { color: theme.textSecondary }]}>Tap to continue your conversation</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
              </PressScale>
            ) : (
              <PressScale
                onPress={openHalo}
                style={[styles.haloBtn, { backgroundColor: 'rgba(232,160,32,0.14)', borderColor: 'rgba(232,160,32,0.5)' }]}
              >
                <View style={[styles.haloBadge, { backgroundColor: HALO_GOLD }]}>
                  <MiniCross size={15} color={CROSS_DARK} />
                </View>
                <Text style={[styles.haloBtnText, { color: theme.textPrimary }]}>Reflect on this with Halo</Text>
              </PressScale>
            )}
          </View>

          {/* Mark complete */}
          <TouchableOpacity
            onPress={handleComplete}
            activeOpacity={0.85}
            style={[styles.completeBtn, {
              backgroundColor: completed ? `rgba(13,146,104,0.12)` : theme.bgCard,
              borderColor: completed ? 'rgba(13,146,104,0.45)' : `rgba(${GOLD_RGB},0.30)`,
            }]}
          >
            <Ionicons
              name={completed ? 'checkmark-circle' : 'ellipse-outline'}
              size={20}
              color={completed ? '#0d9268' : theme.accentAmber}
            />
            <Text style={[styles.completeText, { color: completed ? '#0d9268' : theme.textPrimary }]}>
              {completed ? 'Completed' : 'Mark this day complete'}
            </Text>
          </TouchableOpacity>

          {/* Day navigation */}
          <View style={styles.navRow}>
            <TouchableOpacity
              onPress={() => goToDay(day - 1)}
              disabled={day <= 1}
              activeOpacity={0.7}
              style={[styles.navBtn, { opacity: day <= 1 ? 0.35 : 1 }]}
            >
              <Ionicons name="chevron-back" size={16} color={theme.textSecondary} />
              <Text style={[styles.navText, { color: theme.textSecondary }]}>Previous</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => goToDay(day + 1)}
              disabled={day >= dev.totalDays}
              activeOpacity={0.7}
              style={[styles.navBtn, { opacity: day >= dev.totalDays ? 0.35 : 1 }]}
            >
              <Text style={[styles.navText, { color: theme.textSecondary }]}>Next</Text>
              <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
      </ScrollView>

      <CompanionChat
        visible={haloOpen}
        onClose={() => setHaloOpen(false)}
        threadKey={`${id}:${day}`}
        seedContext={{ ref: formatDevotionalPassage(dayData.passage), note: dayData.question }}
        initialThread={toChatThread(entry?.haloThread)}
        onThreadChange={handleHaloThread}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5 },
  headerBtn:       { borderWidth: 1, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6, height: 32, alignItems: 'center', justifyContent: 'center' },
  headerTitle:     { flex: 1, textAlign: 'center', fontSize: 20, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2, marginHorizontal: 8 },
  dayCount:        { fontSize: 13, fontFamily: 'DMSans_700Bold', minWidth: 32, textAlign: 'right' },
  loading:         { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyTitle:      { fontSize: 15, fontFamily: 'DMSans_600SemiBold', textAlign: 'center', paddingHorizontal: 32 },
  dayLabel:        { fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'DMSans_700Bold', marginBottom: 4 },
  dayTitle:        { fontSize: 24, fontFamily: 'Lora_500Medium', marginBottom: 4, lineHeight: 30 },
  passageRef:      { fontSize: 13, fontFamily: 'DMSans_600SemiBold', marginBottom: 14 },
  passageCard:     { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 22, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.14, shadowRadius: 7, elevation: 3 },
  passageText:     { fontSize: 16, fontFamily: 'Lora_400Regular', lineHeight: 27 },
  verseNum:        { fontSize: 11, fontFamily: 'DMSans_700Bold' },
  passageFallback: { fontSize: 14, fontFamily: 'DMSans_400Regular', lineHeight: 21, fontStyle: 'italic' },
  readerLink:      { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, paddingTop: 12, borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.06)' },
  readerLinkText:  { fontSize: 13, fontFamily: 'DMSans_600SemiBold' },
  reflection:      { fontSize: 16, fontFamily: 'Lora_500Medium', lineHeight: 26, marginBottom: 16 },
  reflectBlock:    { marginTop: 6, marginBottom: 8 },
  reflectLabel:    { fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'DMSans_700Bold', marginBottom: 8 },
  question:        { fontSize: 18, fontFamily: 'Lora_500Medium', lineHeight: 26, marginBottom: 14 },
  answerInput:     { minHeight: 110, borderRadius: 12, borderWidth: 1, padding: 14, fontSize: 15, fontFamily: 'DMSans_400Regular', lineHeight: 22, textAlignVertical: 'top' },
  saveBtn:         { marginTop: 12, height: 48, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  saveBtnText:     { fontSize: 15, fontFamily: 'DMSans_600SemiBold' },
  haloBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 12, height: 52, borderRadius: 12, borderWidth: 1 },
  haloBtnText:     { fontSize: 14, fontFamily: 'DMSans_600SemiBold' },
  haloBadge:       { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  haloRow:         { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, minHeight: 56, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 3 },
  haloRowTitle:    { fontSize: 14, fontFamily: 'DMSans_600SemiBold' },
  haloRowPreview:  { fontSize: 12, fontFamily: 'DMSans_400Regular', marginTop: 2 },
  completeBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 22, height: 52, borderRadius: 14, borderWidth: 1 },
  completeText:    { fontSize: 15, fontFamily: 'DMSans_600SemiBold' },
  navRow:          { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24 },
  navBtn:          { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 10, paddingHorizontal: 4, minHeight: 44 },
  navText:         { fontSize: 14, fontFamily: 'DMSans_600SemiBold' },
});
