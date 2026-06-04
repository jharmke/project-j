import { useCallback, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import HeaderAvatar from '../../components/HeaderAvatar';
import CompanionFAB from '../../components/CompanionFAB';
import CompanionChat from '../../components/CompanionChat';
import { resolveDailyVerse, VERSES, type DailyVerse } from '../../data/verses';
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
const BUILT_CARDS: FaithCardId[] = ['votd', 'bible_plans'];

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
      // gratitude, prayer, journal: built in later B steps.
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
      </ScrollView>

      <CompanionFAB onPress={() => setChatOpen(true)} />
      <CompanionChat visible={chatOpen} onClose={() => setChatOpen(false)} />
    </LinearGradient>
  );
}

// Today's Message. Shows the SAME daily verse as the Home tab (shared rotation in
// data/verses.ts) so they always match. Tapping opens the Bible reader at the passage.
// The home-only extras (the reflection-prompt subtext Justin flagged, and the journal
// shortcut) are intentionally left off here; the Halo-reflection flow is a later item.
function VotdCard({ verse, theme }: { verse: DailyVerse | null; theme: Theme }) {
  if (!verse) return null;
  return (
    <TouchableOpacity
      activeOpacity={0.9}
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
    </TouchableOpacity>
  );
}

// The Bible card. Option 2 for now: a clean launcher into the existing Bible reader. When
// devotional plans land (Bucket C), the active-plan section slots in above this row and the
// label becomes "Bible and Plans."
function BibleCard({ theme }: { theme: Theme }) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/bible'); }}
      style={[styles.card, { backgroundColor: theme.bgCard }]}
    >
      <View style={styles.cardLabelRow}>
        <Ionicons name="book" size={12} color={theme.accentAmber} />
        <Text style={[styles.cardLabel, { color: theme.textMuted }]}>BIBLE</Text>
      </View>
      <View style={styles.bibleRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.bibleTitle, { color: theme.textPrimary }]}>Read the Bible</Text>
          <Text style={[styles.bibleSub, { color: theme.textSecondary }]}>King James Version</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
      </View>
    </TouchableOpacity>
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
  bibleRow:      { flexDirection: 'row', alignItems: 'center' },
  bibleTitle:    { fontSize: 16, fontFamily: 'DMSans_600SemiBold' },
  bibleSub:      { fontSize: 12, fontFamily: 'DMSans_400Regular', marginTop: 2 },
});
