import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import HeaderAvatar from '../../components/HeaderAvatar';
import CompanionFAB from '../../components/CompanionFAB';
import CompanionChat from '../../components/CompanionChat';
import BibleStartGuide from '../../components/BibleStartGuide';
import GratitudeStreakCard from '../../components/GratitudeStreakCard';
import { resolveDailyVerse, VERSES, type DailyVerse } from '../../data/verses';
import { loadPrayers, getActive, type Prayer } from '../../utils/prayers';
import {
  READING_PLANS, getPlanCompletion, getTodayReading, MAX_ACTIVE_PLANS, type ReadingPlansStorage,
} from '../../data/readingPlans';
import {
  DEVOTIONALS, getDevotionalCompletion, MAX_ACTIVE_DEVOTIONALS, type DevotionalsStorage,
} from '../../data/devotionals';
import { loadReadingPlanProgress } from '../../utils/readingPlansProgress';
import { loadDevotionalProgress, getDevotionalProgress, getNextDay } from '../../utils/devotionals';
import { useTheme, type Theme } from '../../theme';

/**
 * Faith tab. Its own card system (mirrors the home tab pattern but with its own
 * faithCardOrder / faithCardVisible keys in pj_settings, kept fully separate from the
 * home tab's cardOrder / cardVisible). The tab uses the standard accent gradient like
 * every other tab; the faith identity lives in the cards (faint gold edges), not a
 * screen-wide warm wash. Halo lives behind the bottom-left FAB.
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
const BUILT_CARDS: FaithCardId[] = ['votd', 'bible_plans', 'gratitude', 'prayer'];

export default function FaithScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { scrollTo, openHalo, haloVerseRef, haloVerseText } = useLocalSearchParams<{ scrollTo?: string; openHalo?: string; haloVerseRef?: string; haloVerseText?: string }>();
  const [chatOpen, setChatOpen] = useState(false);
  const [companionSeed, setCompanionSeed] = useState<{ ref: string; note?: string } | null>(null);
  const [styleMode, setStyleMode] = useState<'discipline' | 'balanced' | 'mindful'>('balanced');
  const scrollRef = useRef<ScrollView>(null);
  const cardOffsets = useRef<Partial<Record<FaithCardId, number>>>({});
  const [cardOrder, setCardOrder] = useState<FaithCardId[]>(DEFAULT_FAITH_ORDER);
  const [cardVisible, setCardVisible] = useState<Record<FaithCardId, boolean>>(DEFAULT_FAITH_VISIBLE);
  const [dailyVerse, setDailyVerse] = useState<DailyVerse | null>(null);
  const now = new Date();

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
          if (parsed.styleMode === 'discipline' || parsed.styleMode === 'balanced' || parsed.styleMode === 'mindful') {
            setStyleMode(parsed.styleMode);
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

  useEffect(() => {
    if (!scrollTo) return;
    setTimeout(() => {
      const offset = cardOffsets.current[scrollTo as FaithCardId] ?? 0;
      scrollRef.current?.scrollTo({ y: offset, animated: true });
    }, 400);
  }, [scrollTo]);

  useEffect(() => {
    if (!openHalo) return;
    setTimeout(() => {
      setCompanionSeed(haloVerseRef ? { ref: haloVerseRef, note: haloVerseText } : null);
      setChatOpen(true);
    }, 600);
  }, [openHalo]);

  const visibleCards = cardOrder.filter(id => cardVisible[id] && BUILT_CARDS.includes(id));

  const renderCard = (id: FaithCardId) => {
    switch (id) {
      case 'votd':
        return <VotdCard key={id} verse={dailyVerse} theme={theme} onReflect={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setCompanionSeed(dailyVerse ? { ref: dailyVerse.reference } : null); setChatOpen(true); }} />;
      case 'bible_plans':
        return <BibleCard key={id} theme={theme} />;
      case 'gratitude':
        return (
          <GratitudeStreakCard
            key={id}
            variant="faith"
            styleMode={styleMode}
            todayKey={getDateKey(now)}
            scrollRef={scrollRef}
            theme={theme}
          />
        );
      case 'prayer':
        return <PrayerCard key={id} theme={theme} />;
      // journal: a header-icon door, not a card (B3 decision).
      default:
        return null;
    }
  };

  return (
    <LinearGradient colors={[theme.gradientStart, theme.gradientEnd]} style={{ flex: 1, paddingTop: insets.top }}>
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
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <TouchableOpacity
            onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); router.push('/journal'); }}
            style={{ backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6, height: 32, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="journal" size={14} color={theme.accentBlue} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: insets.bottom + 96 }}
        showsVerticalScrollIndicator={false}
      >
        {visibleCards.map(id => (
          <View key={id} onLayout={e => { cardOffsets.current[id] = e.nativeEvent.layout.y; }}>
            {renderCard(id)}
          </View>
        ))}
      </ScrollView>

      <CompanionFAB onPress={() => { setCompanionSeed(null); setChatOpen(true); }} />
      <CompanionChat visible={chatOpen} seedContext={companionSeed} onClose={() => { setChatOpen(false); setCompanionSeed(null); }} />
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
function VotdCard({ verse, theme, onReflect }: { verse: DailyVerse | null; theme: Theme; onReflect?: () => void }) {
  if (!verse) return null;
  return (
    <PressCard
      onPress={() => {
        triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
        router.push({ pathname: '/bible', params: { verseRef: verse.reference, verseText: verse.text } });
      }}
      style={[styles.card, {
        backgroundColor: theme.bgCardFaith,
        shadowColor: '#d4860a', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.85, shadowRadius: 8, elevation: 8,
        borderTopWidth: theme.id === 'warm' ? 1.5 : 0.5,
        borderTopColor: theme.id === 'warm' ? 'rgba(212,134,10,0.5)' : 'rgba(212,134,10,0.22)',
      }]}
    >
      <LinearGradient colors={[theme.accentAmber + '2E', theme.accentAmber + '00']} locations={[0, 1]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 64, borderTopLeftRadius: 14, borderTopRightRadius: 14 }} pointerEvents="none" />
      <View style={styles.verseLabelRow}>
        <Ionicons name="sunny-outline" size={11} color={theme.textMuted} />
        <Text style={[styles.verseLabel, { color: theme.textMuted }]}>TODAY'S MESSAGE</Text>
      </View>
      <Text style={[styles.verseText, { color: theme.textSecondary }]}>"{verse.text}"</Text>
      <Text style={[styles.verseRef, { color: theme.textMuted }]}>{verse.reference}</Text>
      {onReflect && (
        <TouchableOpacity
          onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); onReflect!(); }}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(212,134,10,0.10)', borderColor: 'rgba(212,134,10,0.30)', borderWidth: 1, borderRadius: 6, paddingVertical: 9, paddingHorizontal: 12, minHeight: 44, marginTop: 10 }}
        >
          <Ionicons name="sparkles" size={12} color={theme.accentAmber} />
          <Text style={{ fontSize: 12, fontFamily: 'DMSans_600SemiBold', color: theme.accentAmber }}>Reflect with Halo</Text>
        </TouchableOpacity>
      )}
    </PressCard>
  );
}

// The Bible and Plans card. THREE parts in one card:
//  1. The Bible strip on top, keyed on READ HISTORY (not tier): RETURNING (a saved spot exists in
//     pj_bible_last_read) shows "Continue reading: {Book} {Chapter}" and resumes there; FIRST-TIME
//     (no history) offers "Where do I start?" (a curated guide) and "Open the Bible" (lands John 1).
//  2. A horizontal divider.
//  3. Two columns below it: ACTIVE Reading Plans (left) and ACTIVE Devotionals (right), split by a
//     vertical divider. Each column shows up to its cap (3) of compact tiles that resume where you
//     left off, a small "+ Browse" into /plans while under the cap, or a compact empty state with a
//     Browse button when nothing is active. Both lists are capped (MAX_ACTIVE_PLANS /
//     MAX_ACTIVE_DEVOTIONALS), so the card stays bounded and never needs a "+N more" overflow.
// Read-only here: starting/dropping/answering all live on /plans and the day screen. The card just
// reads progress on focus and routes. Visual: gold book icon, warm amber, no "King James Version".
function BibleCard({ theme }: { theme: Theme }) {
  const [lastRead, setLastRead] = useState<{ book: string; chapter: number } | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [planStore, setPlanStore] = useState<ReadingPlansStorage>({});
  const [devStore, setDevStore] = useState<DevotionalsStorage>({});

  // Reload on focus so a spot recorded while reading, or a plan/devotional started or progressed on
  // /plans or the day screen, shows up here on return. All three reads are read-only (no writes).
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
      loadReadingPlanProgress().then(s => { if (alive) setPlanStore(s); }).catch(() => {});
      loadDevotionalProgress().then(s => { if (alive) setDevStore(s); }).catch(() => {});
      return () => { alive = false; };
    }, []),
  );

  const openReader = (params?: Record<string, string>) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    router.push(params ? { pathname: '/bible', params } : '/bible');
  };

  // Resume a reading plan at the day's passage (mirrors the /plans page's openReadingPlan).
  const continuePlan = (planId: string) => {
    const plan = READING_PLANS.find(p => p.id === planId);
    const prog = planStore[planId];
    if (!plan || !prog) return;
    const today = getTodayReading(plan, prog);
    const passage = today === 'complete'
      ? plan.days[plan.totalDays - 1].passages[0]
      : today.day.passages[0];
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: '/bible', params: { planNavBook: passage.book, planNavChapter: String(passage.startChapter) } });
  };

  // Resume a devotional on its next unfinished day (mirrors /plans).
  const continueDevotional = (devId: string) => {
    const dev = DEVOTIONALS.find(d => d.id === devId);
    if (!dev) return;
    const day = getNextDay(dev, getDevotionalProgress(devStore, devId));
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: '/devotional', params: { id: devId, day: String(day) } });
  };

  const browse = (tab: 'reading' | 'devotionals') => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: '/plans', params: { tab } });
  };

  const activePlans = READING_PLANS.filter(p => !!planStore[p.id]);
  const activeDevs = DEVOTIONALS.filter(d => !!devStore[d.id]);

  return (
    <>
      <View style={[styles.card, { backgroundColor: theme.bgCardFaith, overflow: 'hidden', borderTopWidth: theme.id === 'warm' ? 1.5 : 0.5, borderTopColor: theme.id === 'warm' ? 'rgba(212,134,10,0.5)' : 'rgba(212,134,10,0.22)' }]}>
        <LinearGradient colors={[theme.accentAmber + '2E', theme.accentAmber + '00']} locations={[0, 1]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 64, borderTopLeftRadius: 14, borderTopRightRadius: 14 }} pointerEvents="none" />
        <Ionicons name="book" size={130} color={theme.accentAmber} style={styles.cardWatermark} pointerEvents="none" />
        <View style={styles.cardLabelRow}>
          <Ionicons name="book" size={12} color={theme.accentAmber} />
          <Text style={[styles.cardLabel, { color: theme.textMuted }]}>BIBLE AND PLANS</Text>
        </View>

        {/* Part 1: the Bible reading strip. Returning resumes the last spot; first-time offers two doors. */}
        {lastRead ? (
          <>
            <PressButton
              onPress={() => openReader({ openBook: lastRead.book, openChapter: String(lastRead.chapter) })}
              style={[styles.bibleContinueBtn, { backgroundColor: theme.bgTileFaithStrong, borderColor: 'rgba(212,134,10,0.3)' }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.bibleContinueLabel, { color: theme.textMuted }]}>CONTINUE READING</Text>
                <Text style={[styles.bibleContinueRef, { color: theme.accentAmber }]}>{lastRead.book} {lastRead.chapter}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.accentAmber} />
            </PressButton>
            <PressButton
              onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setGuideOpen(true); }}
              style={[styles.bibleFindBtn, { backgroundColor: theme.bgTileFaith, borderColor: 'rgba(212,134,10,0.3)' }]}
            >
              <Ionicons name="compass-outline" size={15} color={theme.accentAmber} />
              <Text style={[styles.bibleFindBtnText, { color: theme.accentAmber }]}>Find something to read</Text>
            </PressButton>
          </>
        ) : (
          <>
            <Text style={[styles.bibleTitle, { color: theme.accentAmber }]}>Read the Bible</Text>
            <Text style={[styles.bibleFirstSub, { color: theme.textSecondary }]}>
              Not sure where to begin? Start with a guided pick, or jump straight in.
            </Text>
            <View style={styles.bibleBtnRow}>
              <PressButton
                wrapperStyle={{ flex: 1 }}
                onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setGuideOpen(true); }}
                style={[styles.bibleBtnPrimary, { backgroundColor: theme.bgTileFaith, borderColor: 'rgba(212,134,10,0.3)' }]}
              >
                <Ionicons name="compass-outline" size={15} color={theme.accentAmber} />
                <Text style={[styles.bibleBtnPrimaryText, { color: theme.accentAmber }]}>Where do I start?</Text>
              </PressButton>
              <PressButton
                wrapperStyle={{ flex: 1 }}
                onPress={() => openReader({ openBook: 'John', openChapter: '1' })}
                style={[styles.bibleBtnSecondary, { backgroundColor: theme.bgTileFaith, borderColor: 'rgba(212,134,10,0.3)' }]}
              >
                <Text style={[styles.bibleBtnSecondaryText, { color: theme.accentAmber }]}>Open the Bible</Text>
              </PressButton>
            </View>
          </>
        )}

        {/* Part 2: divider between Bible reading and your plans. */}
        <View style={[styles.hDivider, { backgroundColor: 'rgba(212,134,10,0.18)' }]} />

        {/* Part 3: two columns, active reading plans (left) | active devotionals (right). */}
        <View style={styles.plansRow}>
          <PlansColumn
            theme={theme}
            label="READING PLANS"
            emptyText="No plans yet"
            items={activePlans.map(p => {
              const prog = planStore[p.id];
              const today = getTodayReading(p, prog);
              const ref = today === 'complete'
                ? 'Done'
                : `${today.day.passages[0].book} ${today.day.passages[0].startChapter}`;
              return {
                id: p.id,
                icon: p.icon,
                name: p.shortName,
                progress: getPlanCompletion(p, prog),
                ref,
                onPress: () => continuePlan(p.id),
              };
            })}
            atCap={activePlans.length >= MAX_ACTIVE_PLANS}
            onBrowse={() => browse('reading')}
          />
          <View style={[styles.vDivider, { backgroundColor: 'rgba(212,134,10,0.18)' }]} />
          <PlansColumn
            theme={theme}
            label="DEVOTIONALS"
            emptyText="None yet"
            items={activeDevs.map(d => {
              const nextDay = getNextDay(d, getDevotionalProgress(devStore, d.id));
              const day = d.days[nextDay - 1];
              const ref = day ? `${day.passage.book} ${day.passage.startChapter}` : '';
              return {
                id: d.id,
                icon: d.icon,
                name: d.shortName,
                progress: getDevotionalCompletion(d, devStore[d.id]),
                ref,
                onPress: () => continueDevotional(d.id),
              };
            })}
            atCap={activeDevs.length >= MAX_ACTIVE_DEVOTIONALS}
            onBrowse={() => browse('devotionals')}
          />
        </View>
      </View>
      <BibleStartGuide visible={guideOpen} onClose={() => setGuideOpen(false)} />
    </>
  );
}

type ColItem = {
  id: string;
  icon: string;
  name: string;
  progress: { completed: number; total: number; pct: number };
  ref: string; // the next passage, e.g. "Matthew 1", shown to the right of X/Y
  onPress: () => void;
};

// One column of the Bible and Plans card (Reading Plans or Devotionals). Shows up to the cap of
// compact tiles, a "+ Browse" into /plans while under the cap, or a compact empty state with a
// Browse button when nothing is active. Capped lists mean it never needs a "+N more" overflow.
function PlansColumn({ theme, label, emptyText, items, atCap, onBrowse }: {
  theme: Theme;
  label: string;
  emptyText: string;
  items: ColItem[];
  atCap: boolean;
  onBrowse: () => void;
}) {
  return (
    <View style={styles.plansCol}>
      <Text style={[styles.colLabel, { color: theme.textMuted }]}>{label}</Text>
      {items.length === 0 ? (
        <View style={styles.emptyCol}>
          <Text style={[styles.emptyColText, { color: theme.textSecondary }]}>{emptyText}</Text>
          <PressButton
            onPress={onBrowse}
            style={[styles.emptyBrowseBtn, { backgroundColor: theme.bgTileFaith, borderColor: 'rgba(212,134,10,0.4)' }]}
          >
            <Text style={[styles.emptyBrowseText, { color: theme.accentAmber }]}>Browse</Text>
          </PressButton>
        </View>
      ) : (
        <>
          {items.map(it => (
            <PressCard
              key={it.id}
              onPress={it.onPress}
              style={[styles.tile, { backgroundColor: theme.bgTileFaith, borderColor: theme.borderCard, borderLeftColor: theme.accentAmber }]}
            >
              <View style={styles.tileTop}>
                <Ionicons name={it.icon as any} size={14} color={theme.accentAmber} />
                <Text numberOfLines={1} style={[styles.tileName, { color: theme.accentAmber }]}>{it.name}</Text>
              </View>
              <TileProgress progress={it.progress} refLabel={it.ref} theme={theme} />
            </PressCard>
          ))}
          {!atCap && (
            <PressButton onPress={onBrowse} style={styles.browseLink}>
              <Ionicons name="add" size={14} color={theme.textMuted} />
              <Text style={[styles.browseLinkText, { color: theme.textMuted }]}>Browse</Text>
            </PressButton>
          )}
        </>
      )}
    </View>
  );
}

// Tile progress on the CARD: a uniform animated bar plus a caption row, "X/Y" on the left and the
// next passage on the right, for BOTH columns so the tiles read as one consistent size (the /plans
// page keeps its dots-for-short / bar-for-long treatment; this unified bar+X/Y is card-only).
function TileProgress({ progress, refLabel, theme }: {
  progress: { completed: number; total: number; pct: number };
  refLabel: string;
  theme: Theme;
}) {
  return (
    <View>
      <TileBar pct={progress.pct} theme={theme} />
      <View style={styles.tileCaptionRow}>
        <Text style={[styles.tileCaption, { color: theme.textMuted }]}>{progress.completed}/{progress.total}</Text>
        {refLabel ? (
          <Text numberOfLines={1} style={[styles.tileRef, { color: theme.textSecondary }]}>{refLabel}</Text>
        ) : null}
      </View>
    </View>
  );
}

// Animated progress bar (width animates on mount / when pct changes, per the animation standard).
// Width is a layout prop, so useNativeDriver is false.
function TileBar({ pct, theme }: { pct: number; theme: Theme }) {
  const w = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(w, { toValue: pct, duration: 600, useNativeDriver: false }).start();
  }, [pct]);
  const width = w.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  return (
    <View style={[styles.tileBarTrack, { backgroundColor: theme.bgInput }]}>
      <Animated.View style={[styles.tileBarFill, { width, backgroundColor: theme.accentAmber }]} />
    </View>
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

  const openScreen = () => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); router.push('/prayer'); };

  // The card body scales on press (project card-press standard) and navigates to the full
  // screen. Preview rows are read-only here: answering/managing happens on the screen. The
  // answered count is NOT shown on the card; it lives as a hero on the prayer screen instead.
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <View style={[styles.card, { backgroundColor: theme.bgCardFaith, overflow: 'hidden', borderTopWidth: theme.id === 'warm' ? 1.5 : 0.5, borderTopColor: theme.id === 'warm' ? 'rgba(212,134,10,0.5)' : 'rgba(212,134,10,0.22)' }]}>
        <LinearGradient colors={[theme.accentAmber + '2E', theme.accentAmber + '00']} locations={[0, 1]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 64, borderTopLeftRadius: 14, borderTopRightRadius: 14 }} pointerEvents="none" />
        <MaterialCommunityIcons name="hand-heart" size={130} color={theme.accentAmber} style={styles.cardWatermark} pointerEvents="none" />
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={openScreen}
          onPressIn={() => Animated.timing(scale, { toValue: 0.97, duration: 100, useNativeDriver: true }).start()}
          onPressOut={() => Animated.timing(scale, { toValue: 1, duration: 150, useNativeDriver: true }).start()}
        >
          <View style={[styles.cardLabelRow, { justifyContent: 'space-between' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <MaterialCommunityIcons name="hand-heart" size={13} color={theme.accentAmber} />
              <Text style={[styles.cardLabel, { color: theme.textMuted }]}>PRAYER</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.accentAmber} />
          </View>

          {nothing ? (
            <Text style={[styles.prayerEmpty, { color: theme.textSecondary }]}>
              Lift up what you're carrying. Add your first prayer.
            </Text>
          ) : preview.length > 0 ? (
            <View style={{ marginTop: 6 }}>
              {preview.map(p => (
                <View key={p.id} style={[styles.prayerPreviewBox, { backgroundColor: theme.bgTileFaith, borderColor: theme.borderCard, borderLeftColor: theme.accentAmber }]}>
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
        <TouchableOpacity
          onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); router.push({ pathname: '/prayer', params: { autoOpenRequest: '1' } }); }}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(212,134,10,0.10)', borderColor: 'rgba(212,134,10,0.30)', borderWidth: 1, borderRadius: 6, paddingVertical: 9, paddingHorizontal: 12, minHeight: 44, marginTop: 8 }}
        >
          <Ionicons name="people" size={12} color={theme.accentAmber} />
          <Text style={{ fontSize: 12, fontFamily: 'DMSans_600SemiBold', color: theme.accentAmber }}>Ask for prayer</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Today's Message verse card (matches the Home tab's verse card look).
  verseCard:     { borderWidth: 2, borderRadius: 14, padding: 16, marginBottom: 12 },
  verseLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  verseLabel:    { fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'DMSans_700Bold' },
  verseText:     { fontSize: 14, lineHeight: 22, marginBottom: 10, fontFamily: 'Lora_500Medium', textAlign: 'center' },
  verseRef:      { fontSize: 9, fontFamily: 'DMSans_700Bold', textAlign: 'center', letterSpacing: 2, textTransform: 'uppercase' },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 0.5, marginBottom: 16 },
  headerTitle: { fontSize: 32, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2 },
  // Faith cards carry a faint warm gold edge (a softer cousin of the verse card) instead of
  // the standard cool top border; this is now the faith identity, since the screen wash is gone.
  card:          { borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 0.5, borderColor: 'rgba(212,134,10,0.22)', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.18, shadowRadius: 8, elevation: 4 },
  cardWatermark: { position: 'absolute', right: -24, bottom: -28, opacity: 0.10 },
  cardLabelRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  cardLabel:     { fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'DMSans_700Bold' },
  bibleTitle:           { fontSize: 16, fontFamily: 'DMSans_600SemiBold' },
  bibleFirstSub:        { fontSize: 12, fontFamily: 'DMSans_400Regular', lineHeight: 18, marginTop: 4, marginBottom: 14 },
  bibleContinueLabel:   { fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', fontFamily: 'DMSans_700Bold', marginBottom: 3 },
  bibleContinueRef:     { fontSize: 20, fontFamily: 'Lora_500Medium', letterSpacing: 0.3 },
  bibleContinueBtn:     { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.14, shadowRadius: 5, elevation: 3 },
  bibleFindBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderRadius: 10, paddingVertical: 12, minHeight: 44, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 2 },
  bibleFindBtnText:     { fontSize: 13, fontFamily: 'DMSans_600SemiBold' },
  bibleBtnRow:          { flexDirection: 'row', gap: 10 },
  bibleBtnPrimary:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderRadius: 8, paddingVertical: 12, minHeight: 44, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 2 },
  bibleBtnPrimaryText:  { fontSize: 13, fontFamily: 'DMSans_600SemiBold' },
  bibleBtnSecondary:    { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 8, paddingVertical: 12, minHeight: 44, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 2 },
  bibleBtnSecondaryText:{ fontSize: 13, fontFamily: 'DMSans_600SemiBold' },
  // Prayer preview card.
  prayerEmpty:        { fontSize: 13, fontFamily: 'DMSans_400Regular', lineHeight: 20, marginTop: 2, fontStyle: 'italic' },
  prayerPreviewBox:   { borderRadius: 10, borderWidth: 1, borderLeftWidth: 3, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 7, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 2 },
  prayerPreviewText:  { fontSize: 15, fontFamily: 'Lora_500Medium', lineHeight: 22 },
  prayerPreviewMore:  { fontSize: 11, fontFamily: 'DMSans_600SemiBold', marginTop: 2, marginLeft: 2 },
  // Bible and Plans card: the divider + the two active-plan / active-devotional columns.
  hDivider:        { height: 1, marginVertical: 14 },
  plansRow:        { flexDirection: 'row', alignItems: 'stretch' },
  plansCol:        { flex: 1 },
  vDivider:        { width: 1, marginHorizontal: 10 },
  colLabel:        { fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', fontFamily: 'DMSans_700Bold', marginBottom: 10 },
  // Clean surface tile with a 3px amber left accent bar (the settings pattern), so amber reads as an
  // accent instead of a fill. Name is Lora serif (the "set apart" font, matching prayers + the
  // Continue Reading ref). Background / borders come from theme tokens (set inline per card).
  tile:            { borderRadius: 10, borderWidth: 1, borderLeftWidth: 3, padding: 10, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 2 },
  tileTop:         { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  tileName:        { flex: 1, fontSize: 14, fontFamily: 'Lora_500Medium', lineHeight: 18 },
  tileBarTrack:    { height: 5, borderRadius: 3, overflow: 'hidden' },
  tileBarFill:     { height: 5, borderRadius: 3 },
  tileCaptionRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 5, gap: 6 },
  tileCaption:     { fontSize: 10, fontFamily: 'DMSans_700Bold' },
  tileRef:         { flexShrink: 1, fontSize: 10, fontFamily: 'DMSans_600SemiBold' },
  browseLink:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, minHeight: 44 },
  browseLinkText:  { fontSize: 12, fontFamily: 'DMSans_600SemiBold' },
  emptyCol:        { alignItems: 'center', gap: 10, paddingVertical: 6 },
  emptyColText:    { fontSize: 12, fontFamily: 'DMSans_400Regular', fontStyle: 'italic', textAlign: 'center' },
  emptyBrowseBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 8, paddingHorizontal: 16, minHeight: 44 },
  emptyBrowseText: { fontSize: 12, fontFamily: 'DMSans_600SemiBold' },
});
