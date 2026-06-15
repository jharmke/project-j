import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View,
  type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import { type DailyVerse } from '../data/verses';
import { loadPrayers, getActive, type Prayer } from '../utils/prayers';
import { READING_PLANS, getPlanCompletion, getTodayReading, type ReadingPlansStorage } from '../data/readingPlans';
import { DEVOTIONALS, getDevotionalCompletion, type DevotionalsStorage } from '../data/devotionals';
import { loadReadingPlanProgress } from '../utils/readingPlansProgress';
import { loadDevotionalProgress, getDevotionalProgress, getNextDay } from '../utils/devotionals';
import { useTheme, type Theme } from '../theme';
import { CardWash } from './GradientCard';

/**
 * Faith Today: the home tab's faith hub card (same slot 1 as the old Today's Message verse
 * card, upgraded in place). One card, three swipeable pages, under one persistent amber glow
 * + border and one shared warm amber background:
 *   Page 1: the verse of the day (the old Today's Message)
 *   Page 2: active reading plans + devotionals, two columns (Reading Plans | Devotionals)
 *   Page 3: active prayer preview
 * Each page shows the "FAITH TODAY" card label plus its own state title so it is always clear
 * what is on screen. Auto-advances every 8s, pauses while the user is dragging, resumes 10s
 * after they settle. Pages SLIDE (a horizontal pager). Tapping a page routes into the faith
 * experience (page 1 to the reader; pages 2/3 to the Faith tab; the scroll-to-card lands in
 * phase 2). NRN never reaches this: the home 'verse' case returns null before rendering it.
 * Card height is fixed to the tallest page (each page is measured; the card takes the max).
 */

const AUTO_MS = 10000;
const RESUME_MS = 10000;
const PAGES = 3;

type Props = { verse: DailyVerse | null; theme: Theme };
type RowItem = { id: string; icon: string; name: string; pct: number; nextRef: string };

// Each page's own state title is the single card label (no separate "FAITH TODAY" line;
// the card is named Faith Today in the edit-layout list). Page 1 also carries the journal door.
function PageHeader({ title, icon, theme, withJournal, onJournal }: {
  title: string; icon: ReactNode; theme: Theme; withJournal?: boolean; onJournal?: () => void;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        {icon}
        <Text style={[styles.title, { color: theme.textSecondary }]}>{title}</Text>
      </View>
      {withJournal && (
        <TouchableOpacity onPress={onJournal} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="journal" size={16} color={theme.accentAmber} />
        </TouchableOpacity>
      )}
    </View>
  );
}

// One compact tile in a page-2 column: icon + name, then the next chapter. No progress bar and
// no day counts on the home card (kept short on purpose; the full progress lives on the Faith tab).
function Tile({ item, theme }: { item: RowItem; theme: Theme }) {
  return (
    <View style={[styles.tile, { backgroundColor: theme.bgTileFaith, borderColor: theme.borderCard, borderLeftColor: theme.accentAmber }]}>
      <View style={styles.tileTop}>
        <Ionicons name={item.icon as any} size={12} color={theme.accentAmber} />
        <Text numberOfLines={1} style={[styles.tileName, { color: theme.accentAmber }]}>{item.name}</Text>
      </View>
      {item.nextRef ? <Text numberOfLines={1} style={[styles.tileRef, { color: theme.textMuted }]}>{item.nextRef}</Text> : null}
    </View>
  );
}

// One column of page 2 (Reading Plans or Devotionals).
function Column({ label, items, emptyText, theme }: { label: string; items: RowItem[]; emptyText: string; theme: Theme }) {
  return (
    <View style={styles.col}>
      <Text style={[styles.colLabel, { color: theme.textMuted }]}>{label}</Text>
      {items.length
        ? items.map(it => <Tile key={it.id} item={it} theme={theme} />)
        : <Text style={[styles.colEmpty, { color: theme.textMuted }]}>{emptyText}</Text>}
    </View>
  );
}

// A single swipeable page. Press-scales on tap (the card-press standard); minHeight is the
// shared max so every page fills the same card height. Content is measured via the inner view.
function Slide({ width, minHeight, bg, onPress, onContentLayout, watermark, children }: {
  width: number; minHeight: number | undefined; bg: string; onPress: () => void;
  onContentLayout: (e: LayoutChangeEvent) => void; watermark?: ReactNode; children: ReactNode;
}) {
  const s = useRef(new Animated.Value(1)).current;
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      activeOpacity={0.99}
      onPress={onPress}
      onPressIn={() => Animated.timing(s, { toValue: 0.97, duration: 100, useNativeDriver: true }).start()}
      onPressOut={() => Animated.timing(s, { toValue: 1, duration: 150, useNativeDriver: true }).start()}
      style={{ width: width || undefined }}
    >
      <Animated.View style={[styles.page, { minHeight, backgroundColor: bg, transform: [{ scale: s }] }]}>
        <CardWash color={theme.accentAmber} radius={14} scored />
        {watermark}
        <View onLayout={onContentLayout} style={styles.pageContent}>{children}</View>
      </Animated.View>
    </TouchableOpacity>
  );
}

export default function FaithTodayCard({ verse, theme }: Props) {
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(0);
  const [maxH, setMaxH] = useState<number | undefined>(undefined);
  const heights = useRef<number[]>([0, 0, 0]);

  const [planStore, setPlanStore] = useState<ReadingPlansStorage>({});
  const [devStore, setDevStore] = useState<DevotionalsStorage>({});
  const [prayers, setPrayers] = useState<Prayer[]>([]);

  const scrollRef = useRef<ScrollView>(null);
  const autoRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resumeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pageRef = useRef(0);
  const widthRef = useRef(0);
  const draggingRef = useRef(false);

  // Page 2 + 3 data, refreshed on focus (read-only, never writes).
  useFocusEffect(useCallback(() => {
    let alive = true;
    loadReadingPlanProgress().then(s => { if (alive) setPlanStore(s); }).catch(() => {});
    loadDevotionalProgress().then(s => { if (alive) setDevStore(s); }).catch(() => {});
    loadPrayers().then(list => { if (alive) setPrayers(list); }).catch(() => {});
    return () => { alive = false; };
  }, []));

  const stopAuto = () => { if (autoRef.current) { clearInterval(autoRef.current); autoRef.current = null; } };
  const startAuto = useCallback(() => {
    stopAuto();
    autoRef.current = setInterval(() => {
      const w = widthRef.current;
      if (!w) return;
      const next = (pageRef.current + 1) % PAGES;
      scrollRef.current?.scrollTo({ x: next * w, animated: true });
    }, AUTO_MS);
  }, []);

  useEffect(() => {
    startAuto();
    return () => { stopAuto(); if (resumeRef.current) clearTimeout(resumeRef.current); };
  }, [startAuto]);

  const onLayoutContainer = (e: LayoutChangeEvent) => { const w = e.nativeEvent.layout.width; widthRef.current = w; setWidth(w); };
  const onContentLayout = (i: number) => (e: LayoutChangeEvent) => {
    heights.current[i] = e.nativeEvent.layout.height;
    const m = Math.max(...heights.current);
    if (m > 0 && m !== maxH) setMaxH(m);
  };

  // Pause auto-advance only while the USER is dragging; programmatic auto scrolls do not.
  const onScrollBeginDrag = () => { draggingRef.current = true; stopAuto(); if (resumeRef.current) clearTimeout(resumeRef.current); };
  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const w = widthRef.current; if (!w) return;
    const p = Math.round(e.nativeEvent.contentOffset.x / w);
    setPage(p); pageRef.current = p;
    if (draggingRef.current) {
      draggingRef.current = false;
      if (resumeRef.current) clearTimeout(resumeRef.current);
      resumeRef.current = setTimeout(startAuto, RESUME_MS);
    }
  };

  const goVerse = () => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); router.push({ pathname: '/bible', params: { verseRef: verse?.reference ?? '', verseText: verse?.text ?? '' } }); };
  const goFaithPlans = () => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); router.push({ pathname: '/faith', params: { scrollTo: 'bible_plans' } }); };
  const goFaithPrayer = () => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); router.push({ pathname: '/faith', params: { scrollTo: 'prayer' } }); };
  const goJournal = () => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); router.push('/journal'); };
  const goReflectWithHalo = () => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); router.push({ pathname: '/faith', params: { openHalo: String(Date.now()), haloVerseRef: verse?.reference ?? '', haloVerseText: verse?.text ?? '' } }); };
  const goAskForPrayer = () => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); router.push({ pathname: '/prayer', params: { autoOpenRequest: '1' } }); };

  const activePlans = READING_PLANS.filter(p => !!planStore[p.id]);
  const activeDevs = DEVOTIONALS.filter(d => !!devStore[d.id]);
  const activePrayers = getActive(prayers);
  const prayerPreview = activePrayers.slice(0, 3);

  const planItems: RowItem[] = activePlans.map(p => {
    const prog = planStore[p.id];
    const today = getTodayReading(p, prog);
    const nextRef = today === 'complete' ? 'Done' : `${today.day.passages[0].book} ${today.day.passages[0].startChapter}`;
    return { id: p.id, icon: p.icon, name: p.shortName, pct: getPlanCompletion(p, prog).pct, nextRef };
  });
  const devItems: RowItem[] = activeDevs.map(d => {
    const nextDay = getNextDay(d, getDevotionalProgress(devStore, d.id));
    const day = d.days[nextDay - 1];
    const nextRef = day ? `${day.passage.book} ${day.passage.startChapter}` : '';
    return { id: d.id, icon: d.icon, name: d.shortName, pct: getDevotionalCompletion(d, devStore[d.id]).pct, nextRef };
  });
  const noPlans = planItems.length === 0 && devItems.length === 0;

  return (
    <View style={styles.glow}>
      <View style={[styles.clip, { borderColor: theme.borderCard, borderTopColor: 'rgba(212,134,10,0.38)' }]}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onLayout={onLayoutContainer}
          onScrollBeginDrag={onScrollBeginDrag}
          onMomentumScrollEnd={onMomentumEnd}
        >
          {/* Page 1: the verse (Today's Message) */}
          <Slide width={width} minHeight={maxH} bg={theme.bgCardFaith} onPress={goVerse} onContentLayout={onContentLayout(0)}
            watermark={<Ionicons name="sunny" size={130} color={theme.accentAmber} style={styles.watermark} pointerEvents="none" />}>
            <PageHeader
              title="Today's Message"
              icon={<Ionicons name="sunny-outline" size={14} color={theme.accentAmber} style={{ marginRight: 6 }} />}
              theme={theme}
              withJournal
              onJournal={goJournal}
            />
            <Text style={[styles.verseText, { color: theme.textSecondary }]}>"{verse?.text}"</Text>
            <Text style={[styles.verseRef, { color: theme.textMuted }]}>{verse?.reference}</Text>
            <TouchableOpacity
              onPress={goReflectWithHalo}
              style={[styles.haloBtn, { backgroundColor: 'rgba(212,134,10,0.10)', borderColor: 'rgba(212,134,10,0.30)' }]}
            >
              <Ionicons name="sparkles" size={12} color={theme.accentAmber} />
              <Text style={[styles.haloBtnText, { color: theme.accentAmber }]}>Reflect with Halo</Text>
            </TouchableOpacity>
          </Slide>

          {/* Page 2: active reading plans + devotionals, two columns */}
          <Slide width={width} minHeight={maxH} bg={theme.bgCardFaith} onPress={goFaithPlans} onContentLayout={onContentLayout(1)}
            watermark={<Ionicons name="book" size={130} color={theme.accentAmber} style={styles.watermark} pointerEvents="none" />}>
            <PageHeader
              title="Plans & Devotionals"
              icon={<Ionicons name="calendar-outline" size={14} color={theme.accentAmber} style={{ marginRight: 6 }} />}
              theme={theme}
            />
            {noPlans ? (
              <View style={styles.empty}>
                <Ionicons name="calendar-outline" size={22} color={theme.textMuted} />
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Start a reading plan or devotional</Text>
                <Text style={[styles.emptyHint, { color: theme.textMuted }]}>Tap to browse on the Faith tab</Text>
              </View>
            ) : (
              <View style={styles.cols}>
                <Column label="READING PLANS" items={planItems} emptyText="None yet" theme={theme} />
                <View style={[styles.vDivider, { backgroundColor: 'rgba(212,134,10,0.18)' }]} />
                <Column label="DEVOTIONALS" items={devItems} emptyText="None yet" theme={theme} />
              </View>
            )}
          </Slide>

          {/* Page 3: active prayer preview */}
          <Slide width={width} minHeight={maxH} bg={theme.bgCardFaith} onPress={goFaithPrayer} onContentLayout={onContentLayout(2)}
            watermark={<MaterialCommunityIcons name="hand-heart" size={130} color={theme.accentAmber} style={styles.watermark} pointerEvents="none" />}>
            <PageHeader
              title="Prayer"
              icon={<MaterialCommunityIcons name="hand-heart" size={14} color={theme.accentAmber} style={{ marginRight: 6 }} />}
              theme={theme}
            />
            {prayerPreview.length ? (
              <>
                {prayerPreview.map(p => (
                  <View key={p.id} style={[styles.prayerBox, { backgroundColor: theme.bgTileFaith, borderColor: theme.borderCard, borderLeftColor: theme.accentAmber }]}>
                    <Text numberOfLines={1} style={[styles.prayerText, { color: theme.accentAmber }]}>{p.text}</Text>
                  </View>
                ))}
                {activePrayers.length > prayerPreview.length && (
                  <Text style={[styles.moreText, { color: theme.textMuted }]}>+{activePrayers.length - prayerPreview.length} more</Text>
                )}
              </>
            ) : (
              <View style={styles.empty}>
                <MaterialCommunityIcons name="hand-heart" size={22} color={theme.textMuted} />
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Lift up what you're carrying</Text>
                <Text style={[styles.emptyHint, { color: theme.textMuted }]}>Tap to add a prayer on the Faith tab</Text>
              </View>
            )}
            <TouchableOpacity
              onPress={goAskForPrayer}
              style={[styles.haloBtn, { backgroundColor: 'rgba(212,134,10,0.10)', borderColor: 'rgba(212,134,10,0.30)' }]}
            >
              <Ionicons name="people" size={12} color={theme.accentAmber} />
              <Text style={[styles.haloBtnText, { color: theme.accentAmber }]}>Ask for prayer</Text>
            </TouchableOpacity>
          </Slide>
        </ScrollView>

        {/* Amber page dots (bottom-right) */}
        <View style={styles.dots} pointerEvents="none">
          {[0, 1, 2].map(i => (
            <View
              key={i}
              style={{
                width: i === page ? 7 : 6, height: i === page ? 7 : 6, borderRadius: i === page ? 3.5 : 3,
                backgroundColor: i === page ? theme.accentAmber : theme.accentAmber + '40',
              }}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  glow: { borderRadius: 14, marginBottom: 12, shadowColor: '#d4860a', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.85, shadowRadius: 8, elevation: 8 },
  clip: { borderRadius: 14, borderWidth: 0.5, borderTopWidth: 1.5, overflow: 'hidden' },
  page: { width: '100%', overflow: 'hidden' },
  watermark: { position: 'absolute', right: -24, bottom: -28, opacity: 0.10 },
  pageContent: { padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  eyebrow: { fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'DMSans_700Bold', marginBottom: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 14, fontFamily: 'DMSans_700Bold' },
  verseText: { fontSize: 17, lineHeight: 27, marginBottom: 12, fontFamily: 'Lora_500Medium', textAlign: 'center' },
  verseRef: { fontSize: 9, fontFamily: 'DMSans_700Bold', textAlign: 'center', letterSpacing: 2, textTransform: 'uppercase' },
  haloBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderRadius: 6, paddingVertical: 9, paddingHorizontal: 12, minHeight: 44, marginTop: 10, marginBottom: 8 },
  haloBtnText: { fontSize: 12, fontFamily: 'DMSans_600SemiBold' },
  cols: { flexDirection: 'row' },
  col: { flex: 1 },
  colLabel: { fontSize: 8, letterSpacing: 2, textTransform: 'uppercase', fontFamily: 'DMSans_700Bold', marginBottom: 8 },
  colEmpty: { fontSize: 11, fontFamily: 'DMSans_400Regular', fontStyle: 'italic' },
  vDivider: { width: 1, marginHorizontal: 10 },
  tile: { borderRadius: 10, borderWidth: 1, borderLeftWidth: 3, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 8 },
  tileTop: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  tileName: { flex: 1, fontSize: 12, fontFamily: 'Lora_500Medium' },
  tileRef: { fontSize: 10, fontFamily: 'DMSans_400Regular' },
  barTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  barFill: { height: 4, borderRadius: 2 },
  prayerBox: { borderRadius: 10, borderWidth: 1, borderLeftWidth: 3, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 7 },
  prayerText: { fontSize: 13, fontFamily: 'Lora_500Medium' },
  moreText: { fontSize: 11, fontFamily: 'DMSans_600SemiBold', marginTop: 2 },
  empty: { alignItems: 'center', paddingVertical: 14, gap: 6 },
  emptyText: { fontSize: 13, fontFamily: 'DMSans_600SemiBold', textAlign: 'center' },
  emptyHint: { fontSize: 11, fontFamily: 'DMSans_400Regular', textAlign: 'center' },
  dots: { position: 'absolute', bottom: 10, right: 12, flexDirection: 'row', alignItems: 'center', gap: 5 },
});
