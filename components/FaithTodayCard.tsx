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
import { useTheme, faithInk, faithInkBody, faithInkMuted, faithTintBg, faithTintBorder, type Theme } from '../theme';
import ButtonShine from './ButtonShine';
import { LinearGradient } from 'expo-linear-gradient';
import VersePoolModal from './VersePoolModal';
import { Type } from '../typography';

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
function PageHeader({ title, icon, theme, withJournal, onJournal, withGear, onGear }: {
  title: string; icon: ReactNode; theme: Theme;
  withJournal?: boolean; onJournal?: () => void; withGear?: boolean; onGear?: () => void;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        {icon}
        <Text style={[styles.title, { color: faithInkMuted(theme) }]}>{title}</Text>
      </View>
      {(withJournal || withGear) && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          {withJournal && (
            <TouchableOpacity onPress={onJournal} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="journal" size={16} color={theme.accentAmber} />
            </TouchableOpacity>
          )}
          {withGear && (
            <TouchableOpacity onPress={onGear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="settings" size={16} color={theme.accentAmber} />
            </TouchableOpacity>
          )}
        </View>
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
      {item.nextRef ? <Text numberOfLines={1} style={[styles.tileRef, { color: faithInkMuted(theme) }]}>{item.nextRef}</Text> : null}
    </View>
  );
}

// One column of page 2 (Reading Plans or Devotionals).
function Column({ label, items, emptyText, theme }: { label: string; items: RowItem[]; emptyText: string; theme: Theme }) {
  return (
    <View style={styles.col}>
      <Text style={[styles.colLabel, { color: faithInkMuted(theme) }]}>{label}</Text>
      {items.length
        ? items.map(it => <Tile key={it.id} item={it} theme={theme} />)
        : <Text style={[styles.colEmpty, { color: faithInkMuted(theme) }]}>{emptyText}</Text>}
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
        {/* Soft amber wash: starts translucent (no solid first stop) so the warm fade
            stays but there is NO hard amber line at the top edge. Dropped on dark, where the
            amber-over-dark wash muddied the top of the card. */}
        <LinearGradient
          colors={theme.id === 'dark' ? ['transparent', 'transparent'] : [theme.accentAmber + '2E', theme.accentAmber + '00']}
          locations={[0, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 64, borderTopLeftRadius: 14, borderTopRightRadius: 14 }}
          pointerEvents="none"
        />
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
  const [manageOpen, setManageOpen] = useState(false);
  const [localVerse, setLocalVerse] = useState<DailyVerse | null>(null);
  const sv = localVerse ?? verse;

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

  const goVerse = () => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); router.push({ pathname: '/bible', params: { verseRef: sv?.reference ?? '', verseText: sv?.text ?? '' } }); };
  const goFaithPlans = () => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); router.push({ pathname: '/faith', params: { scrollTo: 'bible_plans' } }); };
  const goFaithPrayer = () => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); router.push({ pathname: '/faith', params: { scrollTo: 'prayer' } }); };
  const goJournal = () => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); router.push('/journal'); };
  const goReflectWithHalo = () => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); router.push({ pathname: '/faith', params: { openHalo: String(Date.now()), haloVerseRef: sv?.reference ?? '', haloVerseText: sv?.text ?? '' } }); };
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
    <>
    <View style={styles.glow}>
      {/* AMBER border, not the neutral card border: this is the edge the halo used to (badly) draw, and it
          carries the faith identity crisply. Uses Halo's gold, the source of truth for faith gold. */}
      <View style={[styles.clip, { borderColor: 'rgba(212,134,10,0.45)' }]}>
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
          <Slide width={width} minHeight={maxH} bg={theme.bgCardFaithGlass} onPress={goVerse} onContentLayout={onContentLayout(0)}
            watermark={<Ionicons name="sunny" size={130} color={theme.accentAmber} style={styles.watermark} pointerEvents="none" />}>
            <PageHeader
              title="Today's Message"
              icon={<Ionicons name="sunny-outline" size={14} color={theme.accentAmber} style={{ marginRight: 6 }} />}
              theme={theme}
              withJournal
              onJournal={goJournal}
              withGear
              onGear={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setManageOpen(true); }}
            />
            <Text style={[styles.verseText, { color: faithInkBody(theme) }]}>"{sv?.text}"</Text>
            <Text style={[styles.verseRef, { color: theme.accentAmber }]}>{sv?.reference}</Text>
            {/* The tint was hardcoded rgba(212,134,10,...) = DARK's amber baked in, so this button wore the
                wrong amber on the other four themes while the text beside it used each theme's own.
                faithTintBg/Border derive from theme.accentAmber at the house alphas. Plus the shine. */}
            <TouchableOpacity
              onPress={goReflectWithHalo}
              style={[styles.haloBtn, { backgroundColor: faithTintBg(theme), borderColor: faithTintBorder(theme) }]}
            >
              <ButtonShine radius={6} />
              <Ionicons name="sparkles" size={12} color={theme.accentAmber} />
              <Text style={[styles.haloBtnText, { color: theme.accentAmber }]}>Reflect with Halo</Text>
            </TouchableOpacity>
          </Slide>

          {/* Page 2: active reading plans + devotionals, two columns */}
          <Slide width={width} minHeight={maxH} bg={theme.bgCardFaithGlass} onPress={goFaithPlans} onContentLayout={onContentLayout(1)}
            watermark={<Ionicons name="book" size={130} color={theme.accentAmber} style={styles.watermark} pointerEvents="none" />}>
            <PageHeader
              title="Plans & Devotionals"
              icon={<Ionicons name="calendar-outline" size={14} color={theme.accentAmber} style={{ marginRight: 6 }} />}
              theme={theme}
            />
            {noPlans ? (
              <View style={styles.empty}>
                <Ionicons name="calendar-outline" size={22} color={faithInkMuted(theme)} />
                <Text style={[styles.emptyText, { color: faithInkBody(theme) }]}>Start a reading plan or devotional</Text>
                <Text style={[styles.emptyHint, { color: faithInkMuted(theme) }]}>Tap to browse on the Faith tab</Text>
              </View>
            ) : (
              <View style={styles.cols}>
                {/* Named empty states, matching the Faith tab: "None yet" twice told you nothing about
                    WHICH column was empty when they sit side by side. */}
                <Column label="READING PLANS" items={planItems} emptyText="No plans yet" theme={theme} />
                <View style={[styles.vDivider, { backgroundColor: 'rgba(212,134,10,0.18)' }]} />
                <Column label="DEVOTIONALS" items={devItems} emptyText="No devotionals yet" theme={theme} />
              </View>
            )}
          </Slide>

          {/* Page 3: active prayer preview */}
          <Slide width={width} minHeight={maxH} bg={theme.bgCardFaithGlass} onPress={goFaithPrayer} onContentLayout={onContentLayout(2)}
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
                  <Text style={[styles.moreText, { color: faithInkMuted(theme) }]}>+{activePrayers.length - prayerPreview.length} more</Text>
                )}
              </>
            ) : (
              <View style={styles.empty}>
                <MaterialCommunityIcons name="hand-heart" size={22} color={faithInkMuted(theme)} />
                <Text style={[styles.emptyText, { color: faithInkBody(theme) }]}>Lift up what you're carrying</Text>
                <Text style={[styles.emptyHint, { color: faithInkMuted(theme) }]}>Tap to add a prayer on the Faith tab</Text>
              </View>
            )}
            <TouchableOpacity
              onPress={goAskForPrayer}
              style={[styles.haloBtn, { backgroundColor: faithTintBg(theme), borderColor: faithTintBorder(theme) }]}
            >
              <ButtonShine radius={6} />
              <Ionicons name="people" size={12} color={theme.accentAmber} />
              <Text style={[styles.haloBtnText, { color: theme.accentAmber }]}>Ask for prayer</Text>
            </TouchableOpacity>
          </Slide>
        </ScrollView>

        {/* Amber page dots (bottom-center) */}
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
    <VersePoolModal visible={manageOpen} onClose={() => setManageOpen(false)} onChanged={setLocalVerse} />
    </>
  );
}

const styles = StyleSheet.create({
  // The gold shadow. THREE jobs were tangled here, and it only does one now:
  //  - say "faith"      -> still this shadow's job (it stays amber, not the theme's neutral cardShadow).
  //  - draw the EDGE    -> now the amber border below. Was the halo, which was bad at it: at opacity 0.85
  //                        with offset 0,0 it radiated evenly on all four sides and the card's edge
  //                        dissolved into haze rather than ending (a fog on Dark, where this card is a
  //                        dark translucent fill; that is the "fuzzy" Justin caught).
  //  - LIFT the card    -> needs a DOWNWARD offset. 0,0 was a ring, and a ring lifts nothing, which is why
  //                        the card still read flat even after the fog was dialled out. Now 0,4.
  // Opacity 0.35 is in line with the real card shadows (0.30); it reads as lift, not weather.
  glow: { borderRadius: 14, marginBottom: 12, shadowColor: '#d4860a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 8 },
  clip: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  page: { width: '100%', overflow: 'hidden' },
  watermark: { position: 'absolute', right: -24, bottom: -28, opacity: 0.10 },
  pageContent: { padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  eyebrow: { fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', fontFamily: Type.uiBold, marginBottom: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  // The SAME recipe as the Faith tab's cardLabel/verseLabel (9 / tracking 3 / caps / uiBold). "TODAY'S
  // MESSAGE" is a card LABEL, not a title -- it names the card, it is not the content. It was 14px bold
  // with no tracking, which is why the two surfaces disagreed. Colour is faithInkMuted for the same reason:
  // I first put it on faithInk (the dark HEADLINE rung) and it read "super dark". Labels are muted.
  title: { fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', fontFamily: Type.uiBold },
  verseText: { fontSize: 17, lineHeight: 27, marginBottom: 12, fontFamily: 'Lora_500Medium', textAlign: 'center' },
  verseRef: { fontSize: 9, fontFamily: Type.uiBold, textAlign: 'center', letterSpacing: 2, textTransform: 'uppercase' },
  haloBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderRadius: 6, paddingVertical: 9, paddingHorizontal: 12, minHeight: 44, marginTop: 10, marginBottom: 8 },
  haloBtnText: { fontSize: 12, fontFamily: Type.uiSemibold },
  cols: { flexDirection: 'row' },
  col: { flex: 1 },
  colLabel: { fontSize: 8, letterSpacing: 2, textTransform: 'uppercase', fontFamily: Type.uiBold, marginBottom: 8 },
  colEmpty: { fontSize: 11, fontFamily: Type.ui, fontStyle: 'italic' },
  vDivider: { width: 1, marginHorizontal: 10 },
  tile: { borderRadius: 10, borderWidth: 1, borderLeftWidth: 3, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 8 },
  tileTop: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  tileName: { flex: 1, fontSize: 12, fontFamily: 'Lora_500Medium' },
  tileRef: { fontSize: 10, fontFamily: Type.ui },
  barTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  barFill: { height: 4, borderRadius: 2 },
  prayerBox: { borderRadius: 10, borderWidth: 1, borderLeftWidth: 3, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 7 },
  prayerText: { fontSize: 13, fontFamily: 'Lora_500Medium' },
  moreText: { fontSize: 11, fontFamily: Type.uiSemibold, marginTop: 2 },
  empty: { alignItems: 'center', paddingVertical: 14, gap: 6 },
  emptyText: { fontSize: 13, fontFamily: Type.uiSemibold, textAlign: 'center' },
  emptyHint: { fontSize: 11, fontFamily: Type.ui, textAlign: 'center' },
  dots: { position: 'absolute', bottom: 10, left: 0, right: 0, justifyContent: 'center', flexDirection: 'row', alignItems: 'center', gap: 5 },
});
