import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator, Alert, Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  READING_PLANS, getPlanCompletion, getTodayReading, type ReadingPlansStorage,
} from '../data/readingPlans';
import {
  DEVOTIONALS, getDevotionalCompletion, type DevotionalsStorage,
} from '../data/devotionals';
import {
  loadReadingPlanProgress, enrollReadingPlan, dropReadingPlan,
} from '../utils/readingPlansProgress';
import {
  loadDevotionalProgress, enrollDevotional, unenrollDevotional, getDevotionalProgress, getNextDay,
} from '../utils/devotionals';
import { useToast } from '../components/Toast';
import { useTheme, type Theme } from '../theme';

/**
 * Plans hub. One Stack screen (so the faith-tab keyboard bug never applies) with two tabs:
 * Reading Plans (pure reading schedules, read in the Bible reader) and Devotionals (shorter,
 * interactive, our written reflection + the inline Halo). Reading plans share pj_reading_plans
 * with the reader; devotionals use pj_devotionals. The two tabs are where the distinction is
 * taught. Card buttons can deep-link in via the ?tab= param.
 */

const GOLD_RGB = '212,134,10';

type Tab = 'reading' | 'devotionals';

export default function PlansScreen() {
  const { theme, themeId } = useTheme();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const params = useLocalSearchParams<{ tab?: string }>();

  const isDarkTheme = themeId === 'dark';
  const [tab, setTab] = useState<Tab>(params.tab === 'reading' ? 'reading' : 'devotionals');
  const [planStore, setPlanStore] = useState<ReadingPlansStorage>({});
  const [devStore, setDevStore] = useState<DevotionalsStorage>({});
  const [loading, setLoading] = useState(true);

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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTab(t);
  };

  // ── Reading plan actions ────────────────────────────────────────────────────
  const openReadingPlan = (planId: string) => {
    const plan = READING_PLANS.find(p => p.id === planId);
    const prog = planStore[planId];
    if (!plan || !prog) return;
    const today = getTodayReading(plan, prog);
    const passage = today === 'complete'
      ? plan.days[plan.totalDays - 1].passages[0]
      : today.day.passages[0];
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: '/bible', params: { planNavBook: passage.book, planNavChapter: String(passage.startChapter) } });
  };

  const startReadingPlan = async (planId: string) => {
    const plan = READING_PLANS.find(p => p.id === planId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            const updated = await dropReadingPlan(planId);
            setPlanStore(updated);
            showToast(`${plan?.shortName} dropped`, undefined, 'info');
          },
        },
      ],
    );
  };

  // ── Devotional actions ──────────────────────────────────────────────────────
  const openDevotional = (devId: string, day: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: '/devotional', params: { id: devId, day: String(day) } });
  };

  const startDevotional = async (devId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            const updated = await unenrollDevotional(devId);
            setDevStore(updated);
            showToast(`${dev?.shortName} dropped`, undefined, 'info');
          },
        },
      ],
    );
  };

  // ── Section splits ──────────────────────────────────────────────────────────
  const activePlans = READING_PLANS.filter(p => !!planStore[p.id]);
  const availablePlans = READING_PLANS.filter(p => !planStore[p.id]);
  const activeDevs = DEVOTIONALS.filter(d => !!devStore[d.id]);
  const availableDevs = DEVOTIONALS.filter(d => !devStore[d.id]);

  const atmosphereColors: [string, string, string] = isDarkTheme
    ? ['rgba(212,134,10,0.20)', 'rgba(212,134,10,0.06)', 'transparent']
    : ['rgba(232,160,32,0.30)', 'rgba(232,160,32,0.10)', 'transparent'];

  return (
    <LinearGradient colors={[theme.gradientStart, theme.gradientEnd]} style={{ flex: 1, paddingTop: insets.top }}>
      <LinearGradient colors={atmosphereColors} style={styles.atmosphere} pointerEvents="none" />

      <View style={[styles.header, { borderBottomColor: theme.borderCard }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.headerBtn, { backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder }]}
        >
          <Ionicons name="chevron-back" size={14} color={theme.accentBlue} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.accentBlueRaw }]}>PLANS</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Segmented toggle: this is where the reading-plan vs devotional distinction is taught. */}
      <View style={styles.segmentRow}>
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
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 48 }}
          showsVerticalScrollIndicator={false}
        >
          {tab === 'reading' ? (
            <>
              <Text style={[styles.intro, { color: theme.textPrimary }]}>
                A reading schedule to move through Scripture at your own pace. Read each day's passage in the Bible.
              </Text>
              {activePlans.length > 0 && (
                <>
                  <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>IN PROGRESS</Text>
                  {activePlans.map(plan => {
                    const c = getPlanCompletion(plan, planStore[plan.id]);
                    return (
                      <PlanRow
                        key={plan.id}
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
                    );
                  })}
                </>
              )}
              <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>
                {activePlans.length > 0 ? 'MORE PLANS' : 'CHOOSE A PLAN'}
              </Text>
              {availablePlans.map(plan => (
                <PlanRow
                  key={plan.id}
                  theme={theme}
                  icon={plan.icon}
                  title={plan.name}
                  lengthLabel={`${plan.totalDays} days`}
                  description={plan.description}
                  progress={null}
                  primaryLabel="Start"
                  onPrimary={() => startReadingPlan(plan.id)}
                />
              ))}
            </>
          ) : (
            <>
              <Text style={[styles.intro, { color: theme.textPrimary }]}>
                Shorter, guided readings with a written reflection, a question, and Halo to think it through with you.
              </Text>
              {activeDevs.length > 0 && (
                <>
                  <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>IN PROGRESS</Text>
                  {activeDevs.map(dev => {
                    const c = getDevotionalCompletion(dev, devStore[dev.id]);
                    const nextDay = getNextDay(dev, getDevotionalProgress(devStore, dev.id));
                    return (
                      <PlanRow
                        key={dev.id}
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
                    );
                  })}
                </>
              )}
              {availableDevs.length > 0 ? (
                <>
                  <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>
                    {activeDevs.length > 0 ? 'MORE DEVOTIONALS' : 'CHOOSE A DEVOTIONAL'}
                  </Text>
                  {availableDevs.map(dev => (
                    <PlanRow
                      key={dev.id}
                      theme={theme}
                      icon={dev.icon}
                      title={dev.name}
                      lengthLabel={`${dev.totalDays} days`}
                      description={dev.description}
                      progress={null}
                      primaryLabel="Start"
                      onPrimary={() => startDevotional(dev.id)}
                    />
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
    </LinearGradient>
  );
}

// One plan/devotional card. Shared between both tabs so the two read consistently. Shows the
// gold icon badge, title, length, description, an animated progress bar when in progress, the
// primary action (Start / Continue), and an optional drop control for active items.
function PlanRow({
  theme, icon, title, lengthLabel, description, progress, primaryLabel, onPrimary, onDrop,
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
}) {
  return (
    <View style={[styles.card, {
      backgroundColor: theme.bgCard,
      borderColor: `rgba(${GOLD_RGB},0.22)`,
      borderTopColor: `rgba(${GOLD_RGB},0.6)`,
    }]}>
      <View style={styles.cardTop}>
        <View style={[styles.iconBadge, { backgroundColor: `rgba(${GOLD_RGB},0.12)` }]}>
          <Ionicons name={icon as any} size={20} color={theme.accentAmber} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>{title}</Text>
          <Text style={[styles.cardLength, { color: theme.textMuted }]}>{lengthLabel}</Text>
        </View>
      </View>

      <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>{description}</Text>

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
        <PressScale onPress={onPrimary} style={[styles.primaryBtn, { backgroundColor: `rgba(${GOLD_RGB},0.14)`, borderColor: `rgba(${GOLD_RGB},0.5)` }]}>
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

const styles = StyleSheet.create({
  atmosphere:   { position: 'absolute', top: 0, left: 0, right: 0, height: 420 },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5 },
  headerBtn:    { borderWidth: 1, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6, height: 32, alignItems: 'center', justifyContent: 'center' },
  headerTitle:  { fontSize: 20, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2 },
  segmentRow:   { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },
  segment:      { flexDirection: 'row', borderRadius: 12, borderWidth: 1, padding: 4, gap: 4 },
  segmentBtn:   { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 9, borderRadius: 9, minHeight: 40 },
  segmentText:  { fontSize: 13, fontFamily: 'DMSans_700Bold', letterSpacing: 0.3 },
  loading:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  intro:        { fontSize: 14, fontFamily: 'DMSans_500Medium', lineHeight: 20, marginTop: 8, marginBottom: 16 },
  sectionLabel: { fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'DMSans_700Bold', marginBottom: 10, marginTop: 8, marginLeft: 2 },
  card:         { borderRadius: 14, borderWidth: 0.5, borderTopWidth: 2.5, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.24, shadowRadius: 11, elevation: 5 },
  cardTop:      { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  iconBadge:    { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  cardTitle:    { fontSize: 16, fontFamily: 'DMSans_600SemiBold' },
  cardLength:   { fontSize: 11, fontFamily: 'DMSans_700Bold', letterSpacing: 1, textTransform: 'uppercase', marginTop: 2 },
  cardDesc:     { fontSize: 13, fontFamily: 'DMSans_400Regular', lineHeight: 19, marginBottom: 12 },
  progressWrap: { marginBottom: 12 },
  barTrack:     { height: 6, borderRadius: 3, overflow: 'hidden' },
  barFill:      { height: 6, borderRadius: 3 },
  dotsRow:      { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  dot:          { width: 14, height: 14, borderRadius: 7, borderWidth: 1.5 },
  progressText: { fontSize: 11, fontFamily: 'DMSans_600SemiBold', marginTop: 6 },
  cardActions:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  primaryBtn:   { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 10, paddingVertical: 12, minHeight: 44 },
  primaryBtnText: { fontSize: 14, fontFamily: 'DMSans_600SemiBold' },
  dropBtn:      { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  emptyState:   { alignItems: 'center', paddingTop: 48, gap: 12 },
  emptyTitle:   { fontSize: 16, fontFamily: 'DMSans_600SemiBold' },
  emptySub:     { fontSize: 13, fontFamily: 'DMSans_400Regular', textAlign: 'center', lineHeight: 19, paddingHorizontal: 28 },
  allInLabel:   { fontSize: 12, fontFamily: 'DMSans_400Regular', fontStyle: 'italic', textAlign: 'center', marginTop: 16 },
});
