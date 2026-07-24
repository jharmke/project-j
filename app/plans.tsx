import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator, Alert, Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { triggerHaptic, triggerHapticNotification } from '@/utils/haptics';
import {
  READING_PLANS, getPlanCompletion, getTodayReading, isReadingPlanComplete, MAX_ACTIVE_PLANS, type ReadingPlansStorage,
} from '../data/readingPlans';
import {
  DEVOTIONALS, getDevotionalCompletion, isDevotionalComplete, MAX_ACTIVE_DEVOTIONALS, type DevotionalsStorage,
} from '../data/devotionals';
import {
  loadReadingPlanProgress, enrollReadingPlan, dropReadingPlan,
} from '../utils/readingPlansProgress';
import {
  loadDevotionalProgress, enrollDevotional, unenrollDevotional, getDevotionalProgress, getNextDay,
} from '../utils/devotionals';
import { useToast } from '../components/Toast';
import CompanionFAB from '../components/CompanionFAB';
import CompanionChat from '../components/CompanionChat';
import { useTheme, type Theme } from '../theme';
import { useTutorial } from '../context/TutorialContext';
import { useTutorialTarget } from '../hooks/useTutorialTarget';
import { Type, PAGE_TITLE } from '../typography';
import ScreenHeader from '../components/ScreenHeader';
import BackgroundLayers from '../components/BackgroundLayers';
import GradientTitle from '../components/GradientTitle';

/**
 * Plans hub. One Stack screen (so the faith-tab keyboard bug never applies) with two tabs:
 * Reading Plans (pure reading schedules, read in the Bible reader) and Devotionals (shorter,
 * interactive, our written reflection + the inline Halo). Reading plans share pj_reading_plans
 * with the reader; devotionals use pj_devotionals. The two tabs are where the distinction is
 * taught. Card buttons can deep-link in via the ?tab= param.
 */

const GOLD_RGB = '212,134,10';

type Tab = 'reading' | 'devotionals';
type SortMode = 'featured' | 'short' | 'az';

export default function PlansScreen() {
  const { theme, themeId } = useTheme();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const params = useLocalSearchParams<{ tab?: string; focus?: string }>();

  const [tab, setTab] = useState<Tab>(params.tab === 'reading' ? 'reading' : 'devotionals');
  const [planStore, setPlanStore] = useState<ReadingPlansStorage>({});
  const [devStore, setDevStore] = useState<DevotionalsStorage>({});
  const [loading, setLoading] = useState(true);
  const [sortMode, setSortMode] = useState<SortMode>('featured'); // sorts the browse lists only
  const [companionOpen, setCompanionOpen] = useState(false); // Halo faith companion
  const scrollRef = useRef<ScrollView>(null);
  const cardOffsets = useRef<Record<string, number>>({}); // plan/devotional id -> y offset, for deep-link scroll-to
  const { registerScrollView, unregisterScrollView } = useTutorial();
  const segmentRef = useTutorialTarget('faith_plans_segment');
  const planCardRef = useTutorialTarget('faith_plans_card');

  useEffect(() => {
    registerScrollView('plans', scrollRef);
    return () => unregisterScrollView('plans');
  }, []);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      Promise.all([loadReadingPlanProgress(), loadDevotionalProgress()])
        .then(([p, d]) => { if (alive) { setPlanStore(p); setDevStore(d); setLoading(false); } })
        .catch(() => { if (alive) setLoading(false); });
      return () => { alive = false; };
    }, []),
  );

  const switchTab = (t: Tab) => {
    if (t === tab) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setTab(t);
  };

  // Both tabs share one ScrollView, so switching would otherwise carry the other tab's scroll
  // position (scroll Reading to the bottom, tap Devotionals, it opens at the bottom). Reset to the
  // top whenever the tab changes so each opens fresh. Fires after the new tab's content commits.
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [tab]);

  // Deep-link focus: when Halo (or any caller) links to a specific plan/devotional, switch to its tab
  // and scroll to it (mirrors the Faith tab's scroll-to-card). The delay lets the tab content and rows
  // lay out and register their offsets first. Never enrolls: it only takes the user to the item.
  useEffect(() => {
    const focus = params.focus;
    if (!focus) return;
    if (DEVOTIONALS.some(d => d.id === focus)) setTab('devotionals');
    else if (READING_PLANS.some(p => p.id === focus)) setTab('reading');
    const t = setTimeout(() => {
      const y = cardOffsets.current[focus];
      if (typeof y === 'number') scrollRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: true });
    }, 500);
    return () => clearTimeout(t);
  }, [params.focus]);

  // ── Reading plan actions ────────────────────────────────────────────────────
  const openReadingPlan = (planId: string) => {
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

  const startReadingPlan = async (planId: string) => {
    // Cap guard: block a new enrollment past MAX_ACTIVE_PLANS of things actually IN PROGRESS --
    // a completed-but-kept plan must not keep blocking a new one.
    if (inProgressPlans.length >= MAX_ACTIVE_PLANS) {
      triggerHapticNotification(Haptics.NotificationFeedbackType.Warning);
      showToast(`Max ${MAX_ACTIVE_PLANS} active plans. Drop one to add another.`, undefined, 'info');
      return;
    }
    const plan = READING_PLANS.find(p => p.id === planId);
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    const updated = await enrollReadingPlan(planId);
    setPlanStore(updated);
    showToast(`Started: ${plan?.shortName}`, undefined, 'success');
  };

  const confirmDropPlan = (planId: string) => {
    const plan = READING_PLANS.find(p => p.id === planId);
    Alert.alert(
      'Drop this plan?',
      `Remove "${plan?.name}"? Your progress on it will be lost.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Drop Plan', style: 'destructive',
          onPress: async () => {
            triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
            const updated = await dropReadingPlan(planId);
            setPlanStore(updated);
            showToast(`${plan?.shortName} dropped`, undefined, 'info');
          },
        },
      ],
    );
  };

  // Restart = drop then re-enroll, same wipe-and-fresh-start logic as devotional Restart.
  const confirmRestartPlan = (planId: string) => {
    const plan = READING_PLANS.find(p => p.id === planId);
    Alert.alert(
      'Restart this plan?',
      `This clears your progress on "${plan?.name}" so you can start fresh. This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restart', style: 'destructive',
          onPress: async () => {
            triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
            await dropReadingPlan(planId);
            const updated = await enrollReadingPlan(planId);
            setPlanStore(updated);
            showToast(`${plan?.shortName} restarted`, undefined, 'success');
          },
        },
      ],
    );
  };

  // ── Devotional actions ──────────────────────────────────────────────────────
  const openDevotional = (devId: string, day: number) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: '/devotional', params: { id: devId, day: String(day) } });
  };

  const startDevotional = async (devId: string) => {
    // Cap guard: block a new enrollment past MAX_ACTIVE_DEVOTIONALS of things actually IN
    // PROGRESS -- a completed-but-kept devotional must not keep blocking a new one.
    if (inProgressDevs.length >= MAX_ACTIVE_DEVOTIONALS) {
      triggerHapticNotification(Haptics.NotificationFeedbackType.Warning);
      showToast(`Max ${MAX_ACTIVE_DEVOTIONALS} active devotionals. Drop one to add another.`, undefined, 'info');
      return;
    }
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    const updated = await enrollDevotional(devId);
    setDevStore(updated);
    openDevotional(devId, 1);
  };

  const confirmDropDevotional = (devId: string) => {
    const dev = DEVOTIONALS.find(d => d.id === devId);
    Alert.alert(
      'Drop this devotional?',
      `Remove "${dev?.name}"? Your saved answers and Halo reflections on it will be lost.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Drop', style: 'destructive',
          onPress: async () => {
            triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
            const updated = await unenrollDevotional(devId);
            setDevStore(updated);
            showToast(`${dev?.shortName} dropped`, undefined, 'info');
          },
        },
      ],
    );
  };

  // Restart = drop then re-enroll, same as Drop Devotional under the hood. A deliberate full wipe,
  // not a soft reset: the point of redoing a devotional is usually a different season wanting a
  // fresh reflection, not your old typed answer sitting there pre-filled.
  const confirmRestartDevotional = (devId: string) => {
    const dev = DEVOTIONALS.find(d => d.id === devId);
    Alert.alert(
      'Restart this devotional?',
      `This clears your previous answers and Halo reflections on "${dev?.name}" so you can start fresh. This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restart', style: 'destructive',
          onPress: async () => {
            triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
            await unenrollDevotional(devId);
            const updated = await enrollDevotional(devId);
            setDevStore(updated);
            showToast(`${dev?.shortName} restarted`, undefined, 'success');
          },
        },
      ],
    );
  };

  // ── Section splits ──────────────────────────────────────────────────────────
  const activePlans = READING_PLANS.filter(p => !!planStore[p.id]);
  const inProgressPlans = activePlans.filter(p => !isReadingPlanComplete(p, planStore[p.id]));
  const completedPlans = activePlans.filter(p => isReadingPlanComplete(p, planStore[p.id]));
  const availablePlans = READING_PLANS.filter(p => !planStore[p.id]);
  const inProgressDevs = DEVOTIONALS.filter(d => !!devStore[d.id] && !isDevotionalComplete(d, devStore[d.id]));
  const completedDevs = DEVOTIONALS.filter(d => !!devStore[d.id] && isDevotionalComplete(d, devStore[d.id]));
  const activeDevs = DEVOTIONALS.filter(d => !!devStore[d.id]);
  const availableDevs = DEVOTIONALS.filter(d => !devStore[d.id]);
  // The cap is about how many things you're actively juggling, not a permanent storage limit --
  // a completed-but-kept plan/devotional must NOT keep blocking a new enrollment. Real bug caught
  // by Justin: capped at 3 total enrolled (2 in progress + 1 completed) with no way to start a 4th
  // even though only 2 were genuinely active.
  const plansAtLimit = inProgressPlans.length >= MAX_ACTIVE_PLANS;
  const devsAtLimit = inProgressDevs.length >= MAX_ACTIVE_DEVOTIONALS;

  // Sort the BROWSE lists only (in-progress items stay in their own order). 'featured' keeps the
  // curated data order; 'short' is shortest-first (good for "I want a quick one"); 'az' by title.
  const sortBrowse = <T extends { name: string; totalDays: number }>(items: T[]): T[] => {
    if (sortMode === 'short') return [...items].sort((a, b) => a.totalDays - b.totalDays);
    if (sortMode === 'az') return [...items].sort((a, b) => a.name.localeCompare(b.name));
    return items;
  };
  const browsePlans = sortBrowse(availablePlans);
  const browseDevs = sortBrowse(availableDevs);

  return (
    <LinearGradient colors={[theme.gradientEnd, theme.gradientEnd]} style={{ flex: 1, paddingTop: insets.top }}>
      <BackgroundLayers glow={theme.accentAmber} />

      {/* AMBER -- body is already 100% amber (zero accent refs). See the Faith tab header note. */}
      <ScreenHeader title="Plans" color={theme.accentAmber} topInset={false} />

      {/* Segmented toggle: this is where the reading-plan vs devotional distinction is taught. */}
      <View ref={segmentRef} collapsable={false} style={styles.segmentRow}>
        <View style={[styles.segment, { backgroundColor: theme.bgInput, borderColor: theme.borderCard }]}>
          {(['reading', 'devotionals'] as const).map(t => {
            const on = tab === t;
            return (
              <TouchableOpacity
                key={t}
                onPress={() => switchTab(t)}
                activeOpacity={0.8}
                style={[styles.segmentBtn, on && { backgroundColor: `rgba(${GOLD_RGB},0.18)` }]}
              >
                <Text style={[styles.segmentText, { color: on ? theme.accentAmber : theme.textMuted }]}>
                  {t === 'reading' ? 'Reading Plans' : 'Devotionals'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {loading ? (
        <View style={styles.loading}><ActivityIndicator color={theme.accentAmber} /></View>
      ) : (
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 48 }}
          showsVerticalScrollIndicator={false}
        >
          {tab === 'reading' ? (
            <>
              <Text style={[styles.intro, { color: theme.textPrimary }]}>
                A reading schedule to move through Scripture at your own pace. Read each day's passage in the Bible.
              </Text>
              {inProgressPlans.length > 0 && (
                <>
                  <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>IN PROGRESS</Text>
                  {inProgressPlans.map(plan => {
                    const c = getPlanCompletion(plan, planStore[plan.id]);
                    return (
                      <View key={plan.id} onLayout={e => { cardOffsets.current[plan.id] = e.nativeEvent.layout.y; }}>
                      <PlanRow
                        theme={theme}
                        icon={plan.icon}
                        title={plan.name}
                        lengthLabel={`${plan.totalDays} days`}
                        description={plan.description}
                        progress={c}
                        primaryLabel="Continue"
                        onPrimary={() => openReadingPlan(plan.id)}
                        onDrop={() => confirmDropPlan(plan.id)}
                      />
                      </View>
                    );
                  })}
                </>
              )}
              {completedPlans.length > 0 && (
                <>
                  <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>COMPLETED</Text>
                  {completedPlans.map(plan => {
                    const c = getPlanCompletion(plan, planStore[plan.id]);
                    return (
                      <View key={plan.id} onLayout={e => { cardOffsets.current[plan.id] = e.nativeEvent.layout.y; }}>
                      <PlanRow
                        theme={theme}
                        icon="checkmark-circle"
                        accentColor="#0d9268"
                        title={plan.name}
                        lengthLabel={`${plan.totalDays} days`}
                        description={plan.description}
                        progress={c}
                        primaryLabel="Restart"
                        onPrimary={() => confirmRestartPlan(plan.id)}
                        onDrop={() => confirmDropPlan(plan.id)}
                      />
                      </View>
                    );
                  })}
                </>
              )}
              <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>
                {activePlans.length > 0 ? 'MORE PLANS' : 'CHOOSE A PLAN'}
              </Text>
              {availablePlans.length > 1 && <SortControl theme={theme} mode={sortMode} onChange={setSortMode} />}
              {plansAtLimit && (
                <Text style={[styles.capNote, { color: theme.textMuted }]}>
                  Max {MAX_ACTIVE_PLANS} active plans. Drop one to add another.
                </Text>
              )}
              {browsePlans.map((plan, i) => (
                <View key={plan.id} ref={i === 0 ? planCardRef : undefined} collapsable={false} onLayout={e => { cardOffsets.current[plan.id] = e.nativeEvent.layout.y; }}>
                  <PlanRow
                    theme={theme}
                    icon={plan.icon}
                    title={plan.name}
                    lengthLabel={`${plan.totalDays} days`}
                    description={plan.description}
                    progress={null}
                    primaryLabel="Start"
                    onPrimary={() => startReadingPlan(plan.id)}
                    disabled={plansAtLimit}
                  />
                </View>
              ))}
            </>
          ) : (
            <>
              <Text style={[styles.intro, { color: theme.textPrimary }]}>
                Shorter, guided readings with a written reflection, a question, and Halo to think it through with you.
              </Text>
              {inProgressDevs.length > 0 && (
                <>
                  <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>IN PROGRESS</Text>
                  {inProgressDevs.map(dev => {
                    const c = getDevotionalCompletion(dev, devStore[dev.id]);
                    const nextDay = getNextDay(dev, getDevotionalProgress(devStore, dev.id));
                    return (
                      <View key={dev.id} onLayout={e => { cardOffsets.current[dev.id] = e.nativeEvent.layout.y; }}>
                      <PlanRow
                        theme={theme}
                        icon={dev.icon}
                        title={dev.name}
                        lengthLabel={`${dev.totalDays} days`}
                        description={dev.description}
                        progress={c}
                        primaryLabel="Continue"
                        onPrimary={() => openDevotional(dev.id, nextDay)}
                        onDrop={() => confirmDropDevotional(dev.id)}
                      />
                      </View>
                    );
                  })}
                </>
              )}
              {completedDevs.length > 0 && (
                <>
                  <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>COMPLETED</Text>
                  {completedDevs.map(dev => {
                    const c = getDevotionalCompletion(dev, devStore[dev.id]);
                    return (
                      <View key={dev.id} onLayout={e => { cardOffsets.current[dev.id] = e.nativeEvent.layout.y; }}>
                      <PlanRow
                        theme={theme}
                        icon="checkmark-circle"
                        accentColor="#0d9268"
                        title={dev.name}
                        lengthLabel={`${dev.totalDays} days`}
                        description={dev.description}
                        progress={c}
                        primaryLabel="Restart"
                        onPrimary={() => confirmRestartDevotional(dev.id)}
                        onDrop={() => confirmDropDevotional(dev.id)}
                      />
                      </View>
                    );
                  })}
                </>
              )}
              {availableDevs.length > 0 ? (
                <>
                  <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>
                    {inProgressDevs.length > 0 || completedDevs.length > 0 ? 'MORE DEVOTIONALS' : 'CHOOSE A DEVOTIONAL'}
                  </Text>
                  {availableDevs.length > 1 && <SortControl theme={theme} mode={sortMode} onChange={setSortMode} />}
                  {devsAtLimit && (
                    <Text style={[styles.capNote, { color: theme.textMuted }]}>
                      Max {MAX_ACTIVE_DEVOTIONALS} active devotionals. Drop one to add another.
                    </Text>
                  )}
                  {browseDevs.map(dev => (
                    <View key={dev.id} onLayout={e => { cardOffsets.current[dev.id] = e.nativeEvent.layout.y; }}>
                    <PlanRow
                      theme={theme}
                      icon={dev.icon}
                      title={dev.name}
                      lengthLabel={`${dev.totalDays} days`}
                      description={dev.description}
                      progress={null}
                      primaryLabel="Start"
                      onPrimary={() => startDevotional(dev.id)}
                      disabled={devsAtLimit}
                    />
                    </View>
                  ))}
                </>
              ) : activeDevs.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="leaf-outline" size={40} color={theme.iconMuted} />
                  <Text style={[styles.emptyTitle, { color: theme.textMuted }]}>More devotionals on the way</Text>
                  <Text style={[styles.emptySub, { color: theme.textDim }]}>New guided devotionals are being written. Check back soon.</Text>
                </View>
              ) : (
                <Text style={[styles.allInLabel, { color: theme.textDim }]}>More devotionals are on the way.</Text>
              )}
            </>
          )}
        </ScrollView>
      )}

      <CompanionFAB onPress={() => setCompanionOpen(true)} bottom={32} />
      <CompanionChat visible={companionOpen} onClose={() => setCompanionOpen(false)} />
    </LinearGradient>
  );
}

// Compact sort control for the browse lists. Three chips (Featured keeps the curated order, Shortest
// by length, A-Z by title); the active one carries the faith gold. Shown only when a list has more
// than one item to sort.
function SortControl({ theme, mode, onChange }: { theme: Theme; mode: SortMode; onChange: (m: SortMode) => void }) {
  const opts: { key: SortMode; label: string }[] = [
    { key: 'featured', label: 'Featured' },
    { key: 'short',    label: 'Shortest' },
    { key: 'az',       label: 'A-Z' },
  ];
  return (
    <View style={styles.sortRow}>
      {opts.map(o => {
        const on = mode === o.key;
        return (
          <TouchableOpacity
            key={o.key}
            onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); onChange(o.key); }}
            activeOpacity={0.8}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            /* Both states are OPAQUE. These chips sit straight on the page, and the page here is the amber
               glow: the selected chip was a 14% amber wash over amber (mud) and the unselected ones were
               literally 'transparent' (the glow, wearing a border). A control has to read as a solid thing
               you can press. */
            style={[styles.sortChip, {
              borderColor: on ? `rgba(${GOLD_RGB},0.5)` : theme.borderCard,
              backgroundColor: on ? theme.accentAmberBgOpaque : theme.bgCard,
            }]}
          >
            <Text style={[styles.sortChipText, { color: on ? theme.accentAmber : theme.textMuted }]}>{o.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// One plan/devotional card. Shared between both tabs so the two read consistently. Shows the
// gold icon badge, title, length, description, an animated progress bar when in progress, the
// primary action (Start / Continue), and an optional drop control for active items.
function PlanRow({
  theme, icon, title, lengthLabel, description, progress, primaryLabel, onPrimary, onDrop, disabled, accentColor,
}: {
  theme: Theme;
  icon: string;
  title: string;
  lengthLabel: string;
  description: string;
  progress: { completed: number; total: number; pct: number } | null;
  primaryLabel: string;
  onPrimary: () => void;
  onDrop?: () => void;
  disabled?: boolean;
  accentColor?: string; // COMPLETED rows pass the house "done" green instead of the page's gold
}) {
  // Calm warm card to match the faith tab: eggshell on the light family (warm theme brightens so it
  // lifts off its warm page), dark keeps its card color.
  const isDark = theme.id === 'dark';
  const accent = accentColor ?? theme.accentAmber;
  return (
    <View style={[styles.card, {
      backgroundColor: theme.id === 'warm' ? 'rgba(255,253,248,0.96)' : theme.bgCard,
      borderColor: `rgba(${GOLD_RGB},0.22)`,
      borderTopColor: `rgba(${GOLD_RGB},0.6)`,
      shadowColor: theme.cardShadow,
      shadowOpacity: theme.cardShadowOpacity,
    }]}>
      <View style={styles.cardTop}>
        <View style={[styles.iconBadge, { backgroundColor: accent + '1f' }]}>
          <Ionicons name={icon as any} size={20} color={accent} />
        </View>
        <View style={{ flex: 1 }}>
          <GradientTitle title={title} color={theme.accentAmber} numberOfLines={1} style={styles.cardTitle} />
          <Text style={[styles.cardLength, { color: theme.textMuted }]}>{lengthLabel}</Text>
        </View>
      </View>

      <Text style={[styles.cardDesc, { color: isDark ? theme.textSecondary : '#4a3214' }]}>{description}</Text>

      {progress && (
        <View style={styles.progressWrap}>
          {progress.total <= 10
            ? <ProgressDots completed={progress.completed} total={progress.total} theme={theme} />
            : <ProgressBar pct={progress.pct} theme={theme} />}
          <Text style={[styles.progressText, { color: theme.textMuted }]}>
            {progress.completed} of {progress.total} days
          </Text>
        </View>
      )}

      <View style={styles.cardActions}>
        <PressScale onPress={onPrimary} style={[styles.primaryBtn, { backgroundColor: `rgba(${GOLD_RGB},0.14)`, borderColor: `rgba(${GOLD_RGB},0.5)`, opacity: disabled ? 0.4 : 1 }]}>
          <Text style={[styles.primaryBtnText, { color: theme.accentAmber }]}>{primaryLabel}</Text>
        </PressScale>
        {onDrop && (
          <TouchableOpacity onPress={onDrop} style={styles.dropBtn} hitSlop={8} activeOpacity={0.7}>
            <Ionicons name="trash-outline" size={18} color={theme.textMuted} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// Animated progress bar (width animates on mount / when pct changes, per the project animation
// standard, no static bars). Width is a layout prop, so useNativeDriver is false.
function ProgressBar({ pct, theme }: { pct: number; theme: Theme }) {
  const w = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(w, { toValue: pct, duration: 600, useNativeDriver: false }).start();
  }, [pct]);
  const width = w.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  return (
    <View style={[styles.barTrack, { backgroundColor: theme.bgInput }]}>
      <Animated.View style={[styles.barFill, { width, backgroundColor: theme.accentAmber }]} />
    </View>
  );
}

// Fill-in dots for SHORT plans/devotionals (<= 10 days), the gratitude-tracker feel. Longer plans
// use the bar instead, since a row of 30+ dots gets messy. The first `completed` dots fill gold.
function ProgressDots({ completed, total, theme }: { completed: number; total: number; theme: Theme }) {
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[styles.dot, {
            backgroundColor: i < completed ? theme.accentAmber : 'transparent',
            borderColor: i < completed ? theme.accentAmber : `rgba(${GOLD_RGB},0.35)`,
          }]}
        />
      ))}
    </View>
  );
}

// App-standard card press: scale to 0.97 on press in, back to 1.0 on release (timing, not spring).
function PressScale({ onPress, style, children }: { onPress: () => void; style: any; children: ReactNode }) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Animated.View style={[{ flex: 1 }, { transform: [{ scale }] }]}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
        onPressIn={() => Animated.timing(scale, { toValue: 0.97, duration: 100, useNativeDriver: true }).start()}
        onPressOut={() => Animated.timing(scale, { toValue: 1, duration: 150, useNativeDriver: true }).start()}
        style={style}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5 },
  headerBtn:    { borderWidth: 1, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6, height: 32, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...PAGE_TITLE },
  segmentRow:   { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },
  segment:      { flexDirection: 'row', borderRadius: 12, borderWidth: 1, padding: 4, gap: 4 },
  segmentBtn:   { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 9, borderRadius: 9, minHeight: 40 },
  segmentText:  { fontSize: 13, fontFamily: Type.uiBold, letterSpacing: 0.3 },
  loading:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  intro:        { fontSize: 14, fontFamily: Type.uiMedium, lineHeight: 20, marginTop: 8, marginBottom: 16 },
  sectionLabel: { fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', fontFamily: Type.uiBold, marginBottom: 10, marginTop: 8, marginLeft: 2 },
  capNote:      { fontSize: 12, fontFamily: Type.uiMedium, fontStyle: 'italic', marginBottom: 10, marginLeft: 2 },
  sortRow:      { flexDirection: 'row', gap: 6, marginBottom: 12, marginTop: 2 },
  sortChip:     { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14, borderWidth: 1, minHeight: 32, justifyContent: 'center' },
  sortChipText: { fontSize: 12, fontFamily: Type.uiSemibold, letterSpacing: 0.3 },
  // shadowColor/shadowOpacity come from the theme inline at the render site (was hardcoded '#000' @0.24 --
  // the wrong hue on Light, whose shadow is navy, and invisible on Dark's near-black page).
  card:         { borderRadius: 14, borderWidth: 0.5, borderTopWidth: 2.5, padding: 16, marginBottom: 12, shadowOffset: { width: 0, height: 4 }, shadowRadius: 11, elevation: 5 },
  cardTop:      { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  iconBadge:    { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  cardTitle:    { fontSize: 16, fontFamily: Type.uiSemibold },
  cardLength:   { fontSize: 11, fontFamily: Type.uiBold, letterSpacing: 1, textTransform: 'uppercase', marginTop: 2 },
  cardDesc:     { fontSize: 13, fontFamily: Type.ui, lineHeight: 19, marginBottom: 12 },
  progressWrap: { marginBottom: 12 },
  barTrack:     { height: 6, borderRadius: 3, overflow: 'hidden' },
  barFill:      { height: 6, borderRadius: 3 },
  dotsRow:      { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  dot:          { width: 14, height: 14, borderRadius: 7, borderWidth: 1.5 },
  progressText: { fontSize: 11, fontFamily: Type.uiSemibold, marginTop: 6 },
  cardActions:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  primaryBtn:   { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 10, paddingVertical: 12, minHeight: 44 },
  primaryBtnText: { fontSize: 14, fontFamily: Type.uiSemibold },
  dropBtn:      { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  emptyState:   { alignItems: 'center', paddingTop: 48, gap: 12 },
  emptyTitle:   { fontSize: 16, fontFamily: Type.uiSemibold },
  emptySub:     { fontSize: 13, fontFamily: Type.ui, textAlign: 'center', lineHeight: 19, paddingHorizontal: 28 },
  allInLabel:   { fontSize: 12, fontFamily: Type.ui, fontStyle: 'italic', textAlign: 'center', marginTop: 16 },
});
