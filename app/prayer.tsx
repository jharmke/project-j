import { useCallback, useEffect, useRef, useState } from 'react';
import { Text } from '@/components/AppText';
import {
  ActivityIndicator, Alert, Animated, Easing, LayoutAnimation, Platform, ScrollView, StyleSheet, TouchableOpacity, UIManager, View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@/components/AppIcons';
import * as Haptics from 'expo-haptics';
import { triggerHaptic, triggerHapticNotification } from '@/utils/haptics';
import AddPrayerModal from '../components/AddPrayerModal';
import PrayerActionModal from '../components/PrayerActionModal';
import PrayerRequestModal from '../components/PrayerRequestModal';
import CompanionFAB, { GOLD as HALO_GOLD } from '../components/CompanionFAB';
import CompanionChat from '../components/CompanionChat';
import { useToast } from '../components/Toast';
import {
  loadPrayers, markAnswered, unanswerPrayer, deletePrayer,
  getActive, getAnswered, answeredCount, type Prayer,
} from '../utils/prayers';
import { useTheme, type Theme } from '../theme';
import { useTutorial } from '../context/TutorialContext';
import { useTutorialTarget } from '../hooks/useTutorialTarget';
import { Type, numLine, PAGE_TITLE } from '../typography';
import GradientTitle from '../components/GradientTitle';
import ScreenHeader from '../components/ScreenHeader';
import FabDome from '../components/FabDome';
import BackgroundLayers from '../components/BackgroundLayers';
import HeaderIconButton from '../components/HeaderIconButton';

// Static demo prayers for the faith_prayer tutorial (?tutorial=1). Rendered without ever touching
// pj_prayers, so a brand-new user with zero prayers still sees a full screen to learn on, and no
// tutorial data is ever written. Zero footprint.
const TUTORIAL_PRAYERS: Prayer[] = [
  { id: 'tut_p1', text: 'Wisdom for a big decision at work', status: 'active', createdAt: 3, answeredAt: null },
  { id: 'tut_p2', text: "Strength for a friend who is hurting", status: 'active', createdAt: 2, answeredAt: null },
  { id: 'tut_p3', text: 'A clear answer on the apartment', status: 'answered', createdAt: 1, answeredAt: 1717200000000 },
];

/**
 * Dedicated prayer screen. Warm "carrying before God" framing, NOT a todo list: ongoing prayers
 * are supposed to persist, there is no day/duration counter, and the answered list is a quiet
 * record of God's faithfulness (the Ebenezer stone). Answering is a DELIBERATE moment, not a
 * checkbox tick: tap a prayer to open its action card, choose "God answered this," and the prayer
 * row quietly crossfades to a gold "Praise God" in place before tucking into the Answered section.
 * Reversible (move back to active) and fully optional. pj_prayers via utils/prayers.
 */

// LayoutAnimation drives the gentle reflow when a prayer moves between sections and when the
// Answered list expands. Android needs this opt-in; iOS (the target) is already on.
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const GOLD = '#d4860a';
const GOLD_RGB = '212,134,10';

const formatAnsweredDate = (ms: number) =>
  new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export default function PrayerScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const params = useLocalSearchParams();
  const isTutorial = params.tutorial === '1';
  const scrollRef = useRef<ScrollView>(null);
  const fabScale = useRef(new Animated.Value(1)).current;
  const { registerScrollView, unregisterScrollView } = useTutorial();
  const heroRef = useTutorialTarget('faith_prayer_hero');
  const rowRef = useTutorialTarget('faith_prayer_row');
  const addRef = useTutorialTarget('faith_prayer_add');
  const askUsRef = useTutorialTarget('faith_prayer_ask_us');

  useEffect(() => {
    registerScrollView('prayer', scrollRef);
    return () => unregisterScrollView('prayer');
  }, []);

  const [prayers, setPrayers] = useState<Prayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [answeredOpen, setAnsweredOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [actionFor, setActionFor] = useState<Prayer | null>(null);
  const [editPrayer, setEditPrayer] = useState<Prayer | null>(null);
  const [celebratingId, setCelebratingId] = useState<string | null>(null);
  const [companionOpen, setCompanionOpen] = useState(false); // Halo faith companion
  const heroPop = useRef(new Animated.Value(1)).current;

  // Auto-open the prayer request modal when navigated here with autoOpenRequest=1
  // (from the faith-tab Prayer card "Ask for prayer" button).
  useEffect(() => {
    if (isTutorial) return; // tutorial never fires the email request modal
    if (params.autoOpenRequest === '1') {
      setTimeout(() => setRequestOpen(true), 350);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Tutorial mode shows static demo prayers and never reads or writes real data.
      if (isTutorial) { setPrayers(TUTORIAL_PRAYERS); setLoading(false); return; }
      let alive = true;
      loadPrayers()
        .then(list => { if (alive) { setPrayers(list); setLoading(false); } })
        .catch(() => { if (alive) setLoading(false); });
      return () => { alive = false; };
    }, [isTutorial]),
  );

  const active = getActive(prayers);
  const answered = getAnswered(prayers);
  const answeredN = answeredCount(prayers);
  const nothing = prayers.length === 0;

  // "God answered this" plays IN the prayer row: its text crossfades to a quiet gold "Praise God."
  // When that finishes (onCelebrationDone), the prayer actually moves to Answered and reflows away.
  const handleAnswer = (p: Prayer) => {
    setActionFor(null);
    triggerHapticNotification(Haptics.NotificationFeedbackType.Success);
    setCelebratingId(p.id);
  };

  const finishAnswer = async (p: Prayer) => {
    const updated = await markAnswered(p.id);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setPrayers(updated);
    setCelebratingId(null);
    Animated.sequence([
      Animated.timing(heroPop, { toValue: 1.25, duration: 160, useNativeDriver: true }),
      Animated.spring(heroPop, { toValue: 1, useNativeDriver: true, damping: 8, stiffness: 180 }),
    ]).start();
  };

  const handleUnanswer = async (p: Prayer) => {
    setActionFor(null);
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    const updated = await unanswerPrayer(p.id);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setPrayers(updated);
    showToast('Moved back to active', undefined, 'info');
  };

  const handleDelete = (p: Prayer) => {
    Alert.alert(
      'Remove this prayer?',
      'This permanently removes it from your list. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setActionFor(null);
            triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
            const updated = await deletePrayer(p.id);
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setPrayers(updated);
            showToast('Prayer removed', undefined, 'info');
          },
        },
      ],
    );
  };

  const toggleAnswered = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setAnsweredOpen(o => !o);
  };

  return (
    <LinearGradient colors={[theme.gradientEnd, theme.gradientEnd]} style={{ flex: 1, paddingTop: insets.top }}>
      <BackgroundLayers glow={theme.accentAmber} />

      {/* The answered count only appears once a prayer IS answered, so a list of all-ongoing prayers
          never reads as "0". */}
      {/* AMBER: this screen's body is already 100% amber (zero accent refs) -- the title was the only cyan
          thing on it. Matches the Faith tab header and ScreenHeader's own "Faith screens go amber" note. */}
      <ScreenHeader
        title="Prayer"
        color={theme.accentAmber}
        topInset={false}
        right={
          <>
            {answeredN > 0 && (
              <View ref={heroRef} collapsable={false}>
                <Animated.View style={[styles.heroBox, { transform: [{ scale: heroPop }] }]}>
                  <Text style={[styles.heroNum, { color: theme.accentAmber }]}>{answeredN}</Text>
                  <Text style={[styles.heroLabel, { color: theme.textMuted }]}>ANSWERED</Text>
                </Animated.View>
              </View>
            )}
            {/* Another local headerBtn copy that predates HeaderIconButton -- same recipe exactly (radius 6,
                height 32, 1px border, 12px padding), so it is a straight swap onto the shared component.
                AMBER, same as the Faith tab's journal square: a faith page's chrome is amber. */}
            <HeaderIconButton
              icon="people"
              onPress={() => setRequestOpen(true)}
              color={theme.accentAmber}
              bg={theme.accentAmber + '1A'}
              border={theme.accentAmber + '4D'}
            />
          </>
        }
      />

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={theme.accentAmber} />
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 120 }}
          showsVerticalScrollIndicator={false}
        >
          {nothing ? (
            <View style={styles.emptyState}>
              <Ionicons name="hand-left-outline" size={40} color={theme.iconMuted} />
              <Text style={[styles.emptyTitle, { color: theme.textMuted }]}>Nothing here yet</Text>
              <Text style={[styles.emptySubtitle, { color: theme.textDim }]}>
                Lift up what you're carrying. Tap the + to add a prayer, then tap it to mark it answered whenever God shows up.
              </Text>
            </View>
          ) : (
            <>
              {active.length > 0 && (
                <>
                  <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>ON MY HEART</Text>
                  {active.map((p, i) => (
                    <View key={p.id} ref={i === 0 ? rowRef : undefined} collapsable={false}>
                      <PrayerRow
                        prayer={p}
                        theme={theme}
                        celebrating={celebratingId === p.id}
                        onCelebrationDone={() => finishAnswer(p)}
                        onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setActionFor(p); }}
                      />
                    </View>
                  ))}
                </>
              )}

              {answered.length > 0 && (
                <>
                  <TouchableOpacity onPress={toggleAnswered} style={styles.sectionHeaderRow} activeOpacity={0.7}>
                    <Text style={[styles.sectionLabel, { color: theme.textMuted, marginBottom: 0 }]}>ANSWERED</Text>
                    <Ionicons name={answeredOpen ? 'chevron-up' : 'chevron-down'} size={14} color={theme.textMuted} />
                  </TouchableOpacity>
                  {answeredOpen && (
                    <>
                      <Text style={[styles.ebenezer, { color: theme.textDim }]}>A record of answered prayer.</Text>
                      {answered.map(p => (
                        <PrayerRow
                          key={p.id}
                          prayer={p}
                          theme={theme}
                          onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setActionFor(p); }}
                        />
                      ))}
                    </>
                  )}
                </>
              )}
            </>
          )}

          {/* Ask us: opens the existing email PrayerRequestModal (a separate feature). */}
          <TouchableOpacity
            ref={askUsRef as any}
            onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setRequestOpen(true); }}
            activeOpacity={0.85}
            style={[styles.askRow, {
              backgroundColor: theme.bgCardFaith,
              borderColor: `rgba(${GOLD_RGB},0.22)`,
              borderTopColor: `rgba(${GOLD_RGB},0.38)`,
              marginTop: nothing ? 24 : 8,
              shadowColor: theme.cardShadow,
              shadowOpacity: theme.cardShadowOpacity,
            }]}
          >
            <View style={[styles.askIcon, { backgroundColor: `rgba(${GOLD_RGB},0.12)` }]}>
              <Ionicons name="people" size={18} color={theme.accentAmber} />
            </View>
            <View style={{ flex: 1 }}>
              <GradientTitle title="Need prayer? Ask us" color={theme.accentAmber} numberOfLines={1} style={styles.askTitle} />
              <Text style={[styles.askSub, { color: theme.textSecondary }]}>
                Send a request to the team. Every one is read and prayed over.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Add FAB (bottom-right; the faith Halo FAB lives bottom-left on the faith tab, no clash).
          Wears HALO_GOLD, not this page's GOLD: the two discs sit side by side, so the FAB matches Halo.
          Same rule bible.tsx follows -- Halo's gold is the one source of truth for a faith FAB. */}
      <View ref={addRef} collapsable={false} style={[styles.fab, { bottom: insets.bottom + 24 }]}>
        <Animated.View style={{ transform: [{ scale: fabScale }] }}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPressIn={() => Animated.timing(fabScale, { toValue: 0.9, duration: 100, useNativeDriver: true }).start()}
            onPressOut={() => Animated.timing(fabScale, { toValue: 1, duration: 150, useNativeDriver: true }).start()}
            onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Medium); setAddOpen(true); }}
            style={[styles.fabBtn, { backgroundColor: HALO_GOLD, borderWidth: 3, borderColor: theme.bgPrimary }]}
          >
            <FabDome size={56} />
            <Ionicons name="add" size={28} color="#fff" />
          </TouchableOpacity>
        </Animated.View>
      </View>

      <AddPrayerModal
        visible={addOpen || editPrayer !== null}
        editPrayer={editPrayer}
        onClose={() => { setAddOpen(false); setEditPrayer(null); }}
        onAdded={setPrayers}
      />
      <PrayerActionModal
        prayer={actionFor}
        onClose={() => setActionFor(null)}
        onAnswer={handleAnswer}
        onUnanswer={handleUnanswer}
        onEdit={(p) => { setActionFor(null); setEditPrayer(p); }}
        onDelete={handleDelete}
      />
      <PrayerRequestModal visible={requestOpen} onClose={() => setRequestOpen(false)} variant="faith" />

      {/* Halo, bottom-left (the gold Add FAB owns bottom-right), bottom-aligned with it. */}
      <CompanionFAB onPress={() => setCompanionOpen(true)} bottom={insets.bottom + 24} />
      <CompanionChat visible={companionOpen} onClose={() => setCompanionOpen(false)} />
    </LinearGradient>
  );
}

// One prayer, used in both sections. Each prayer is its OWN gold-tinted box (so they read as
// distinct, never blending into a wall of text), with the Lora serif in warm amber to match the
// faith-tab card. The whole box is a tappable target that opens the action card (the ellipsis
// hints "tap for options"). Answered prayers are muted and stamped with the date. When a prayer
// is being answered, its text quietly crossfades to a gold "Praise God" in place, holds a beat,
// then the whole box fades away before the parent (onCelebrationDone) moves it to Answered.
function PrayerRow({
  prayer, theme, onPress, celebrating = false, onCelebrationDone,
}: {
  prayer: Prayer;
  theme: Theme;
  onPress: () => void;
  celebrating?: boolean;
  onCelebrationDone?: () => void;
}) {
  const answered = prayer.status === 'answered';
  const scale = useRef(new Animated.Value(1)).current;
  const celebText = useRef(new Animated.Value(0)).current; // prayer-text -> "Praise God" crossfade
  const rowFade = useRef(new Animated.Value(1)).current;   // whole-box opacity for the gentle exit

  // Crossfade to "Praise God" (slow), hold a beat, then fade the whole box away. Only once it
  // has faded out do we hand back to the parent to move it to Answered, so nothing snaps.
  useEffect(() => {
    if (!celebrating) return;
    celebText.setValue(0);
    rowFade.setValue(1);
    Animated.sequence([
      Animated.timing(celebText, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.delay(850),
      Animated.timing(rowFade, { toValue: 0, duration: 500, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      Animated.delay(250),
    ]).start(({ finished }) => { if (finished) onCelebrationDone?.(); });
  }, [celebrating]);

  const textOpacity = celebrating ? celebText.interpolate({ inputRange: [0, 0.5], outputRange: [1, 0], extrapolate: 'clamp' }) : 1;
  const praiseOpacity = celebText.interpolate({ inputRange: [0.3, 1], outputRange: [0, 1], extrapolate: 'clamp' });
  const praiseTranslate = celebText.interpolate({ inputRange: [0.3, 1], outputRange: [8, 0], extrapolate: 'clamp' });

  return (
    <Animated.View style={{ transform: [{ scale }], opacity: rowFade, marginBottom: 10 }}>
      <TouchableOpacity
        activeOpacity={0.85}
        disabled={celebrating}
        onPress={onPress}
        onPressIn={() => Animated.timing(scale, { toValue: 0.98, duration: 100, useNativeDriver: true }).start()}
        onPressOut={() => Animated.timing(scale, { toValue: 1, duration: 150, useNativeDriver: true }).start()}
        style={[styles.pageBox, { backgroundColor: theme.bgCardFaith, borderColor: `rgba(${GOLD_RGB},0.28)`, borderTopColor: `rgba(${GOLD_RGB},0.45)`, shadowColor: theme.cardShadow, shadowOpacity: theme.cardShadowOpacity }]}
      >
        <View style={{ flex: 1 }}>
          <Animated.Text allowFontScaling={false} style={[styles.pageText, { color: answered ? theme.textMuted : theme.accentAmber, opacity: textOpacity }]}>
            {prayer.text}
          </Animated.Text>
          {answered && prayer.answeredAt != null && (
            <Text style={[styles.answeredDate, { color: theme.textDim }]}>
              Answered {formatAnsweredDate(prayer.answeredAt)}
            </Text>
          )}
          {celebrating && (
            <Animated.Text
              allowFontScaling={false}
              style={[styles.praiseInline, { color: theme.accentAmber, opacity: praiseOpacity, transform: [{ translateY: praiseTranslate }] }]}
            >
              Praise God
            </Animated.Text>
          )}
        </View>
        {!celebrating && <Ionicons name="ellipsis-horizontal" size={16} color={theme.textDim} style={{ marginLeft: 10 }} />}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5 },
  headerBtn:     { borderWidth: 1, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6, height: 32, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...PAGE_TITLE },
  heroBox:       { alignItems: 'flex-end' },
  heroNum:       { fontSize: 26, fontFamily: Type.num, letterSpacing: 1, lineHeight: numLine(26) },
  heroLabel:     { fontSize: 8, letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: Type.uiBold, marginTop: -1 },
  loading:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyState:    { alignItems: 'center', paddingTop: 72, paddingBottom: 8, gap: 12 },
  emptyTitle:    { fontSize: 16, fontFamily: Type.uiSemibold },
  emptySubtitle: { fontSize: 13, fontFamily: Type.ui, textAlign: 'center', lineHeight: 20, paddingHorizontal: 28 },
  sectionLabel:  { fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', fontFamily: Type.uiBold, marginBottom: 8, marginLeft: 4 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 4, paddingVertical: 6, marginTop: 4 },
  ebenezer:      { fontSize: 11, fontFamily: Type.ui, fontStyle: 'italic', marginLeft: 4, marginBottom: 8 },
  // shadowColor/shadowOpacity come from the THEME inline at the render site (this StyleSheet is static and
  // cannot read it). Was '#000' @0.12 on a tight 2/6 blur -- a third of a normal card, the wrong hue on
  // Light (navy) and invisible on Dark.
  pageBox:       { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, minHeight: 44, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 6 },
  pageText:      { fontSize: 15, fontFamily: 'Lora_500Medium', lineHeight: 22 },
  answeredDate:  { fontSize: 10, fontFamily: Type.uiBold, letterSpacing: 1, textTransform: 'uppercase', marginTop: 4 },
  praiseInline:  { position: 'absolute', left: 0, top: 0, fontSize: 16, fontFamily: 'Lora_500Medium', letterSpacing: 0.3 },
  askRow:        { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 0.5, padding: 14, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 6 },
  askIcon:       { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  askTitle:      { fontSize: 15, fontFamily: Type.uiSemibold },
  askSub:        { fontSize: 12, fontFamily: Type.ui, marginTop: 2, lineHeight: 17 },
  fab:           { position: 'absolute', right: 24 },
  fabBtn:        { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
});
