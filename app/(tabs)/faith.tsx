import { useCallback, useRef, useState, type ReactNode } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import HeaderAvatar from '../../components/HeaderAvatar';
import CompanionFAB from '../../components/CompanionFAB';
import CompanionChat from '../../components/CompanionChat';
import BibleStartGuide from '../../components/BibleStartGuide';
import { resolveDailyVerse, VERSES, type DailyVerse } from '../../data/verses';
import { loadPrayers, getActive, type Prayer } from '../../utils/prayers';
import { useTheme, type Theme } from '../../theme';

/**
 * Faith tab. Its own card system (mirrors the home tab pattern but with its own
 * faithCardOrder / faithCardVisible keys in pj_settings, kept fully separate from the
 * home tab's cardOrder / cardVisible). A warm amber atmosphere is layered OVER the
 * active theme, never replacing it. Halo lives behind the bottom-left FAB.
 *
 * Cards arrive one build step at a time. B1: the framework + atmosphere + the Bible
 * card. Today's Message, Gratitude, Prayer, and Journal land in the following steps;
 * their renderCard cases return null until then.
 */

type FaithCardId = 'votd' | 'bible_plans' | 'gratitude' | 'prayer' | 'journal';

type FaithCardMeta = { id: FaithCardId; label: string; description: string; defaultVisible: boolean };

const FAITH_CARD_REGISTRY: FaithCardMeta[] = [
  { id: 'votd',        label: "Today's Message", description: 'Scripture for the day',          defaultVisible: true },
  { id: 'bible_plans', label: 'Bible and Plans', description: 'Read the Bible and your plans',   defaultVisible: true },
  { id: 'gratitude',   label: 'Gratitude',       description: 'Daily gratitude habit',           defaultVisible: true },
  { id: 'prayer',      label: 'Prayer',          description: 'Your prayer requests',            defaultVisible: true },
  { id: 'journal',     label: 'Journal',         description: 'Faith reflections',               defaultVisible: true },
];

const DEFAULT_FAITH_ORDER: FaithCardId[] = FAITH_CARD_REGISTRY.map(c => c.id);
const DEFAULT_FAITH_VISIBLE = Object.fromEntries(
  FAITH_CARD_REGISTRY.map(c => [c.id, c.defaultVisible]),
) as Record<FaithCardId, boolean>;

// Local-date key, identical to the Home tab's, so the shared verse rotation never advances
// twice around midnight.
const getDateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Cards that actually have a renderer today. Once every card is built this guard goes away.
const BUILT_CARDS: FaithCardId[] = ['votd', 'bible_plans', 'prayer'];

export default function FaithScreen() {
  const { theme, themeId } = useTheme();
  const insets = useSafeAreaInsets();
  const [chatOpen, setChatOpen] = useState(false);
  const [cardOrder, setCardOrder] = useState<FaithCardId[]>(DEFAULT_FAITH_ORDER);
  const [cardVisible, setCardVisible] = useState<Record<FaithCardId, boolean>>(DEFAULT_FAITH_VISIBLE);
  const [dailyVerse, setDailyVerse] = useState<DailyVerse | null>(null);
  const now = new Date();

  // Only the Dark theme has a truly dark background; the other four (Light, Slate, Warm,
  // Blush) are light, where a strong amber wash would muddy, so they get a much fainter one.
  const isDarkTheme = themeId === 'dark';

  // Load the faith tab's own layout, read-then-merge so a new card slots in and an unknown
  // saved id is dropped. Never touches the home tab's cardOrder / cardVisible.
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      AsyncStorage.getItem('pj_settings')
        .then(raw => {
          if (!alive || !raw) return;
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed.faithCardOrder)) {
            const saved = parsed.faithCardOrder.filter((id: string) => DEFAULT_FAITH_ORDER.includes(id as FaithCardId));
            const merged = [...saved, ...DEFAULT_FAITH_ORDER.filter(id => !saved.includes(id))];
            setCardOrder(merged as FaithCardId[]);
          }
          if (parsed.faithCardVisible && typeof parsed.faithCardVisible === 'object') {
            setCardVisible({ ...DEFAULT_FAITH_VISIBLE, ...parsed.faithCardVisible });
          }
        })
        .catch(() => {});
      // Same verse as Home (shared rotation in data/verses.ts). Fall back to a random verse
      // on a read error, but do not nuke the rotation here, Home owns that recovery.
      resolveDailyVerse(getDateKey(new Date()))
        .then(v => { if (alive) setDailyVerse(v); })
        .catch(() => { if (alive) setDailyVerse(VERSES[Math.floor(Math.random() * VERSES.length)]); });
      return () => { alive = false; };
    }, []),
  );

  const visibleCards = cardOrder.filter(id => cardVisible[id] && BUILT_CARDS.includes(id));

  const renderCard = (id: FaithCardId) => {
    switch (id) {
      case 'votd':
        return <VotdCard key={id} verse={dailyVerse} theme={theme} />;
      case 'bible_plans':
        return <BibleCard key={id} theme={theme} />;
      case 'prayer':
        return <PrayerCard key={id} theme={theme} />;
      // gratitude, journal: built in later B steps.
      default:
        return null;
    }
  };

  return (
    <LinearGradient colors={[theme.gradientStart, theme.gradientEnd]} style={{ flex: 1, paddingTop: insets.top }}>
      {/* Amber atmosphere: a warm candlelight wash from the top, layered over the theme.
          Dark uses a deeper amber; the light themes need a brighter, warmer gold at higher
          opacity or it vanishes against a near-white background (a faint brown just muddies). */}
      <LinearGradient
        colors={
          isDarkTheme
            ? ['rgba(212,134,10,0.20)', 'rgba(212,134,10,0.06)', 'transparent']
            : ['rgba(232,160,32,0.30)', 'rgba(232,160,32,0.10)', 'transparent']
        }
        style={styles.atmosphere}
        pointerEvents="none"
      />

      <View style={[styles.header, { borderBottomColor: theme.borderCard }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
          <HeaderAvatar />
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: theme.accentBlueRaw }]}>Faith</Text>
            <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: 'DMSans_700Bold', marginTop: 1, letterSpacing: 2, textTransform: 'uppercase' }}>
              {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: insets.bottom + 96 }}
        showsVerticalScrollIndicator={false}
      >
        {visibleCards.map(id => renderCard(id))}

        {/* TEMP dev launcher into the devotional-day screen, so the content is testable before
            the Plans page exists. REMOVE when the Plans page / Bible-and-Plans card sections land. */}
        <TouchableOpacity
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push({ pathname: '/devotional', params: { id: 'rest_recovery_3' } }); }}
          activeOpacity={0.85}
          style={[styles.tempDevotionalBtn, { borderColor: 'rgba(212,134,10,0.4)' }]}
        >
          <Ionicons name="flask-outline" size={15} color={theme.accentAmber} />
          <Text style={[styles.tempDevotionalText, { color: theme.accentAmber }]}>Devotional (test): Rest and Recovery</Text>
        </TouchableOpacity>
      </ScrollView>

      <CompanionFAB onPress={() => setChatOpen(true)} />
      <CompanionChat visible={chatOpen} onClose={() => setChatOpen(false)} />
    </LinearGradient>
  );
}

// Shared press feel for the faith cards: scale to 0.97 on press in, back to 1.0 on release
// (timing, per the project card-press standard). Each card fires its own haptic in onPress.
function PressCard({ onPress, style, children }: { onPress: () => void; style: any; children: ReactNode }) {
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

// Same press feel as PressCard. Pass wrapperStyle={{ flex: 1 }} for side-by-side row buttons, or
// omit it for full-width stacked buttons.
function PressButton({ onPress, style, wrapperStyle, children }: { onPress: () => void; style: any; wrapperStyle?: any; children: ReactNode }) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Animated.View style={[wrapperStyle, { transform: [{ scale }] }]}>
      <TouchableOpacity
        activeOpacity={0.85}
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

// Today's Message. Shows the SAME daily verse as the Home tab (shared rotation in
// data/verses.ts) so they always match. Tapping opens the Bible reader at the passage.
// The home-only extras (the reflection-prompt subtext Justin flagged, and the journal
// shortcut) are intentionally left off here; the Halo-reflection flow is a later item.
function VotdCard({ verse, theme }: { verse: DailyVerse | null; theme: Theme }) {
  if (!verse) return null;
  return (
    <PressCard
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push({ pathname: '/bible', params: { verseRef: verse.reference, verseText: verse.text } });
      }}
      style={[styles.verseCard, {
        backgroundColor: theme.bgCardVerse,
        borderColor: theme.borderCardVerse,
        shadowColor: '#d4860a', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.85, shadowRadius: 8, elevation: 8,
      }]}
    >
      <View style={styles.verseLabelRow}>
        <Ionicons name="book-outline" size={11} color={theme.textMuted} />
        <Text style={[styles.verseLabel, { color: theme.textMuted }]}>TODAY'S MESSAGE</Text>
      </View>
      <Text style={[styles.verseText, { color: theme.textSecondary }]}>"{verse.text}"</Text>
      <Text style={[styles.verseRef, { color: theme.textMuted }]}>{verse.reference}</Text>
    </PressCard>
  );
}

// The Bible card. Two states keyed on READ HISTORY (not tier): RETURNING (a saved spot exists in
// pj_bible_last_read) shows "Continue reading: {Book} {Chapter}" and resumes there; FIRST-TIME (no
// history) offers "Where do I start?" (a curated guide) and "Open the Bible" (jumps in, lands John
// 1). Visual: gold book icon, warm amber title, no "King James Version" line. When devotional plans
// land (Bucket C) the active-plan section slots in above and the label becomes "Bible and Plans."
function BibleCard({ theme }: { theme: Theme }) {
  const [lastRead, setLastRead] = useState<{ book: string; chapter: number } | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);

  // Reload on focus so a spot recorded while reading shows up as "Continue reading" on return.
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      AsyncStorage.getItem('pj_bible_last_read')
        .then(raw => {
          if (!alive || !raw) return;
          const p = JSON.parse(raw);
          if (p && typeof p.book === 'string' && typeof p.chapter === 'number') setLastRead({ book: p.book, chapter: p.chapter });
        })
        .catch(() => {});
      return () => { alive = false; };
    }, []),
  );

  const openReader = (params?: Record<string, string>) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(params ? { pathname: '/bible', params } : '/bible');
  };

  // Returning: the whole card resumes the saved spot (the reader's own picker covers going elsewhere).
  if (lastRead) {
    return (
      <>
        <View style={[styles.card, { backgroundColor: theme.bgCard }]}>
          <View style={styles.cardLabelRow}>
            <Ionicons name="book" size={12} color={theme.accentAmber} />
            <Text style={[styles.cardLabel, { color: theme.textMuted }]}>BIBLE</Text>
          </View>

          {/* Primary: pick up where you left off. John 1 lives inside the button, not floating. */}
          <PressButton
            onPress={() => openReader({ openBook: lastRead.book, openChapter: String(lastRead.chapter) })}
            style={[styles.bibleContinueBtn, { backgroundColor: 'rgba(212,134,10,0.1)', borderColor: 'rgba(212,134,10,0.4)' }]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.bibleContinueLabel, { color: theme.textMuted }]}>CONTINUE READING</Text>
              <Text style={[styles.bibleContinueRef, { color: theme.accentAmber }]}>{lastRead.book} {lastRead.chapter}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.accentAmber} />
          </PressButton>

          {/* Secondary: the curated guide, a full-width button so nothing reads as loose text. */}
          <PressButton
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setGuideOpen(true); }}
            style={[styles.bibleFindBtn, { backgroundColor: 'rgba(212,134,10,0.08)', borderColor: 'rgba(212,134,10,0.4)' }]}
          >
            <Ionicons name="compass-outline" size={15} color={theme.accentAmber} />
            <Text style={[styles.bibleFindBtnText, { color: theme.accentAmber }]}>Find something to read</Text>
          </PressButton>
        </View>
        <BibleStartGuide visible={guideOpen} onClose={() => setGuideOpen(false)} />
      </>
    );
  }

  // First-time: no saved spot yet. Two clear doors, no presumption of beginner-ness.
  return (
    <>
      <View style={[styles.card, { backgroundColor: theme.bgCard }]}>
        <View style={styles.cardLabelRow}>
          <Ionicons name="book" size={12} color={theme.accentAmber} />
          <Text style={[styles.cardLabel, { color: theme.textMuted }]}>BIBLE</Text>
        </View>
        <Text style={[styles.bibleTitle, { color: theme.accentAmber }]}>Read the Bible</Text>
        <Text style={[styles.bibleFirstSub, { color: theme.textSecondary }]}>
          Not sure where to begin? Start with a guided pick, or jump straight in.
        </Text>
        <View style={styles.bibleBtnRow}>
          <PressButton
            wrapperStyle={{ flex: 1 }}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setGuideOpen(true); }}
            style={[styles.bibleBtnPrimary, { backgroundColor: 'rgba(212,134,10,0.08)', borderColor: 'rgba(212,134,10,0.4)' }]}
          >
            <Ionicons name="compass-outline" size={15} color={theme.accentAmber} />
            <Text style={[styles.bibleBtnPrimaryText, { color: theme.accentAmber }]}>Where do I start?</Text>
          </PressButton>
          <PressButton
            wrapperStyle={{ flex: 1 }}
            onPress={() => openReader({ openBook: 'John', openChapter: '1' })}
            style={[styles.bibleBtnSecondary, { backgroundColor: 'rgba(212,134,10,0.08)', borderColor: 'rgba(212,134,10,0.4)' }]}
          >
            <Text style={[styles.bibleBtnSecondaryText, { color: theme.accentAmber }]}>Open the Bible</Text>
          </PressButton>
        </View>
      </View>
      <BibleStartGuide visible={guideOpen} onClose={() => setGuideOpen(false)} />
    </>
  );
}

// Prayer preview card. A compact launcher into app/prayer.tsx (mirrors the Journal card
// pattern): the answered count as a hero stat ONLY once a prayer is answered, the most recent
// active prayers as read-only rows, a quick-add pop-up, and View all. The answer/manage actions
// deliberately live on the full screen; the preview stays read-only plus quick-add. Reloads on
// focus so adds/answers made on the full screen show up here when the user comes back.
function PrayerCard({ theme }: { theme: Theme }) {
  const [prayers, setPrayers] = useState<Prayer[]>([]);
  const scale = useRef(new Animated.Value(1)).current;

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      loadPrayers().then(list => { if (alive) setPrayers(list); }).catch(() => {});
      return () => { alive = false; };
    }, []),
  );

  const active = getActive(prayers);
  const preview = active.slice(0, 3);
  const nothing = prayers.length === 0;

  const openScreen = () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/prayer'); };

  // The card body scales on press (project card-press standard) and navigates to the full
  // screen. Preview rows are read-only here: answering/managing happens on the screen. The
  // answered count is NOT shown on the card; it lives as a hero on the prayer screen instead.
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <View style={[styles.card, { backgroundColor: theme.bgCard }]}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={openScreen}
          onPressIn={() => Animated.timing(scale, { toValue: 0.97, duration: 100, useNativeDriver: true }).start()}
          onPressOut={() => Animated.timing(scale, { toValue: 1, duration: 150, useNativeDriver: true }).start()}
        >
          <View style={[styles.cardLabelRow, { justifyContent: 'space-between' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="hand-left" size={12} color={theme.accentAmber} />
              <Text style={[styles.cardLabel, { color: theme.textMuted }]}>PRAYER</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
          </View>

          {nothing ? (
            <Text style={[styles.prayerEmpty, { color: theme.textSecondary }]}>
              Lift up what you're carrying. Add your first prayer.
            </Text>
          ) : preview.length > 0 ? (
            <View style={{ marginTop: 6 }}>
              {preview.map(p => (
                <View key={p.id} style={[styles.prayerPreviewBox, { backgroundColor: 'rgba(212,134,10,0.08)', borderColor: 'rgba(212,134,10,0.16)' }]}>
                  <Text numberOfLines={1} style={[styles.prayerPreviewText, { color: theme.accentAmber }]}>{p.text}</Text>
                </View>
              ))}
              {active.length > preview.length && (
                <Text style={[styles.prayerPreviewMore, { color: theme.textMuted }]}>+{active.length - preview.length} more</Text>
              )}
            </View>
          ) : (
            <Text style={[styles.prayerEmpty, { color: theme.textSecondary }]}>
              Nothing on your heart right now. Praise God for the prayers He has answered.
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  atmosphere:  { position: 'absolute', top: 0, left: 0, right: 0, height: 420 },
  // Today's Message verse card (matches the Home tab's verse card look).
  verseCard:     { borderWidth: 2, borderRadius: 14, padding: 16, marginBottom: 12 },
  verseLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  verseLabel:    { fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'DMSans_700Bold' },
  verseText:     { fontSize: 14, fontStyle: 'italic', lineHeight: 24, marginBottom: 10, fontFamily: 'DMSans_400Regular', textAlign: 'center' },
  verseRef:      { fontSize: 9, fontFamily: 'DMSans_700Bold', textAlign: 'center', letterSpacing: 2, textTransform: 'uppercase' },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 0.5, marginBottom: 16 },
  headerTitle: { fontSize: 32, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2 },
  // Faith cards carry a faint warm gold edge (a softer cousin of the verse card) instead of
  // the standard cool top border, so they belong to the amber atmosphere.
  card:          { borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 0.5, borderColor: 'rgba(212,134,10,0.22)', borderTopColor: 'rgba(212,134,10,0.38)', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.18, shadowRadius: 8, elevation: 4 },
  cardLabelRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  cardLabel:     { fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'DMSans_700Bold' },
  bibleTitle:           { fontSize: 16, fontFamily: 'DMSans_600SemiBold' },
  bibleFirstSub:        { fontSize: 12, fontFamily: 'DMSans_400Regular', lineHeight: 18, marginTop: 4, marginBottom: 14 },
  bibleContinueLabel:   { fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', fontFamily: 'DMSans_700Bold', marginBottom: 3 },
  bibleContinueRef:     { fontSize: 20, fontFamily: 'Lora_500Medium', letterSpacing: 0.3 },
  bibleContinueBtn:     { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 10 },
  bibleFindBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderRadius: 10, paddingVertical: 12, minHeight: 44 },
  bibleFindBtnText:     { fontSize: 13, fontFamily: 'DMSans_600SemiBold' },
  bibleBtnRow:          { flexDirection: 'row', gap: 10 },
  bibleBtnPrimary:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderRadius: 8, paddingVertical: 12, minHeight: 44 },
  bibleBtnPrimaryText:  { fontSize: 13, fontFamily: 'DMSans_600SemiBold' },
  bibleBtnSecondary:    { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 8, paddingVertical: 12, minHeight: 44 },
  bibleBtnSecondaryText:{ fontSize: 13, fontFamily: 'DMSans_600SemiBold' },
  // Prayer preview card.
  prayerEmpty:        { fontSize: 13, fontFamily: 'DMSans_400Regular', lineHeight: 20, marginTop: 2, fontStyle: 'italic' },
  prayerPreviewBox:   { borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 7 },
  prayerPreviewText:  { fontSize: 15, fontFamily: 'Lora_500Medium', lineHeight: 22 },
  prayerPreviewMore:  { fontSize: 11, fontFamily: 'DMSans_600SemiBold', marginTop: 2, marginLeft: 2 },
  // TEMP dev launcher styles (remove with the button above when the Plans page lands).
  tempDevotionalBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderStyle: 'dashed', borderRadius: 10, paddingVertical: 14, marginTop: 8, minHeight: 44 },
  tempDevotionalText: { fontSize: 13, fontFamily: 'DMSans_600SemiBold' },
});
