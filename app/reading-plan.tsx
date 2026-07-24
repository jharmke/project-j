import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { triggerHaptic, triggerHapticNotification } from '@/utils/haptics';
import {
  READING_PLANS, getPlanCompletion, getNextDayIndex, formatDayReading,
  type PlanDay, type PlanProgress,
} from '../data/readingPlans';
import { loadReadingPlanProgress, markReadingPlanDay, unmarkReadingPlanDay } from '../utils/readingPlansProgress';
import { barFillGradient } from '../utils/barGradient';
import { useToast, ToastRenderer } from '../components/Toast';
import { useTheme } from '../theme';
import { Type } from '../typography';
import ScreenHeader from '../components/ScreenHeader';
import BackgroundLayers from '../components/BackgroundLayers';
import ModalHeader from '../components/ModalHeader';
import ButtonShine from '../components/ButtonShine';
import GradientTitle from '../components/GradientTitle';
import GradientIcon from '../components/GradientIcon';
import CompanionFAB from '../components/CompanionFAB';
import CompanionChat from '../components/CompanionChat';

/**
 * Dedicated reading-plan schedule page. The counterpart to the devotional day screen, but a
 * schedule view instead of one-day-at-a-time -- Justin wants to SEE the whole plan, not guess
 * where he stands. A flat scrollable list doesn't work here (plans run 21 to 397 days), so days
 * are grouped into weeks behind a "Week N" picker (same interaction as the Bible reader's own
 * book picker), only the selected week's ~7 rows ever render. This is also where the "read at
 * your own pace" flexibility genuinely lives now: mark any day done, in any order, and see it
 * update in front of you instead of guessing what a strip label means.
 *
 * No Drop/Restart here on purpose -- those stay on the Plans page's cards, same as the devotional
 * day screen doesn't carry them either.
 */

const GOLD_RGB = '212,134,10';
const DAYS_PER_WEEK = 7;

export default function ReadingPlanScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = params.id ?? '';
  const plan = READING_PLANS.find(p => p.id === id);

  const [progress, setProgress] = useState<PlanProgress | undefined>(undefined);
  const [loaded, setLoaded] = useState(false);
  const [weekIndex, setWeekIndex] = useState(0);
  const [weekPickerOpen, setWeekPickerOpen] = useState(false);
  const [companionOpen, setCompanionOpen] = useState(false); // Halo faith companion
  const initializedWeekRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      loadReadingPlanProgress().then(store => {
        if (!alive) return;
        setProgress(store[id]);
        setLoaded(true);
      }).catch(() => { if (alive) setLoaded(true); });
      return () => { alive = false; };
    }, [id]),
  );

  // Default to the week containing the next unread day, ONCE -- a background refresh after that
  // must never yank the user back to a different week than the one they're deliberately viewing.
  useEffect(() => {
    if (!loaded || !plan || initializedWeekRef.current) return;
    initializedWeekRef.current = true;
    const nextIdx = getNextDayIndex(plan, progress ?? { startDate: '', completedDays: [], enrolledAt: 0 });
    setWeekIndex(Math.floor(nextIdx / DAYS_PER_WEEK));
  }, [loaded, plan, progress]);

  if (!plan) {
    return (
      <LinearGradient colors={[theme.gradientEnd, theme.gradientEnd]} style={{ flex: 1, paddingTop: insets.top }}>
        <BackgroundLayers glow={theme.accentAmber} />
        <ScreenHeader title="Reading Plan" topInset={false} />
        <View style={styles.loading}>
          <Ionicons name="leaf-outline" size={40} color={theme.iconMuted} />
          <Text style={[styles.emptyTitle, { color: theme.textMuted }]}>This plan could not be found</Text>
        </View>
      </LinearGradient>
    );
  }

  const totalWeeks = Math.ceil(plan.totalDays / DAYS_PER_WEEK);
  const completedDays = progress?.completedDays ?? [];
  const { completed, total, pct } = progress
    ? getPlanCompletion(plan, progress)
    : { completed: 0, total: plan.totalDays, pct: 0 };

  const weekStart = weekIndex * DAYS_PER_WEEK + 1;
  const weekEnd = Math.min(weekStart + DAYS_PER_WEEK - 1, plan.totalDays);
  const weekDays = Array.from({ length: weekEnd - weekStart + 1 }, (_, i) => weekStart + i);

  const weekCompletion = (w: number) => {
    const start = w * DAYS_PER_WEEK;
    const end = Math.min(start + DAYS_PER_WEEK, plan.totalDays);
    let done = 0;
    for (let i = start; i < end; i++) if (completedDays.includes(i)) done++;
    return { done, of: end - start };
  };

  const toggleDay = async (dayNum: number, isRead: boolean) => {
    const dayIdx = dayNum - 1; // 0-indexed
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    const updated = isRead
      ? await unmarkReadingPlanDay(id, dayIdx)
      : await markReadingPlanDay(id, dayIdx);
    const next = updated[id];
    setProgress(next);
    if (isRead) {
      showToast('Marked as unread', undefined, 'info');
      return;
    }
    if (getPlanCompletion(plan, next).completed === plan.totalDays) {
      triggerHapticNotification(Haptics.NotificationFeedbackType.Success);
      showToast('Plan complete!', plan.name, 'success');
    } else {
      triggerHapticNotification(Haptics.NotificationFeedbackType.Success);
      showToast(`Day ${dayNum} marked complete`, plan.shortName, 'success');
    }
  };

  const openPassage = (day: PlanDay) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    const passage = day.passages[0];
    router.push({ pathname: '/bible', params: { planNavBook: passage.book, planNavChapter: String(passage.startChapter) } });
  };

  const pickWeek = (w: number) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setWeekIndex(w);
    setWeekPickerOpen(false);
  };

  return (
    <LinearGradient colors={[theme.gradientEnd, theme.gradientEnd]} style={{ flex: 1, paddingTop: insets.top }}>
      <BackgroundLayers glow={theme.accentAmber} />
      <ToastRenderer />

      <ScreenHeader
        title={plan.shortName}
        color={theme.accentAmber}
        topInset={false}
        right={<Text style={[styles.dayCount, { color: theme.textMuted }]}>{completed}/{total}</Text>}
      />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 48 }} showsVerticalScrollIndicator={false}>
        <Text style={[styles.description, { color: theme.textSecondary }]}>{plan.description}</Text>

        <View style={styles.progressWrap}>
          <ProgressBar pct={pct} theme={theme} />
          <Text style={[styles.progressText, { color: theme.textMuted }]}>{completed} of {total} days</Text>
        </View>

        <TouchableOpacity
          onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setWeekPickerOpen(true); }}
          activeOpacity={0.85}
          style={[styles.weekPicker, { backgroundColor: theme.bgCard, borderColor: `rgba(${GOLD_RGB},0.3)` }]}
        >
          <ButtonShine radius={10} />
          <GradientTitle
            title={`Week ${weekIndex + 1} · Days ${weekStart}-${weekEnd}`}
            color={theme.accentAmber}
            numberOfLines={1}
            style={styles.weekPickerText}
          />
          <Ionicons name="chevron-down" size={16} color={theme.accentAmber} />
        </TouchableOpacity>

        {weekDays.map(dayNum => {
          const day = plan.days[dayNum - 1];
          const isRead = completedDays.includes(dayNum - 1);
          if (!day) return null;
          return (
            <View
              key={dayNum}
              style={[styles.dayRow, {
                backgroundColor: theme.bgCard,
                borderColor: isRead ? 'rgba(13,146,104,0.35)' : `rgba(${GOLD_RGB},0.22)`,
                shadowColor: theme.cardShadow,
                shadowOpacity: theme.cardShadowOpacity,
              }]}
            >
              <TouchableOpacity onPress={() => openPassage(day)} activeOpacity={0.7} style={{ flex: 1 }}>
                <Text style={[styles.dayLabel, { color: theme.textMuted }]}>DAY {dayNum}</Text>
                <GradientTitle title={formatDayReading(day)} color={theme.accentAmber} numberOfLines={1} style={styles.dayPassage} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => toggleDay(dayNum, isRead)}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.dayToggle}
              >
                {isRead
                  ? <GradientIcon name="checkmark-circle" size={26} color={theme.accentGreen} />
                  : <Ionicons name="ellipse-outline" size={26} color={theme.textMuted} />}
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>

      <Modal transparent animationType="fade" visible={weekPickerOpen} onRequestClose={() => setWeekPickerOpen(false)}>
        <TouchableOpacity
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: theme.overlayBg }}
          activeOpacity={1}
          onPress={() => setWeekPickerOpen(false)}
        />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} pointerEvents="box-none">
          <View
            style={{
              width: '86%', maxHeight: '70%',
              backgroundColor: theme.bgSheet,
              borderRadius: 20, borderWidth: 0.5, borderColor: theme.borderCard,
              borderTopWidth: 1.5, borderTopColor: `rgba(${GOLD_RGB},0.7)`,
              overflow: 'hidden',
              shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.4, shadowRadius: 24, elevation: 20,
            }}
          >
            <ModalHeader title="Select a Week" color={theme.accentAmber} onClose={() => setWeekPickerOpen(false)} />
            <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ padding: 12 }}>
              {Array.from({ length: totalWeeks }, (_, w) => {
                const { done, of } = weekCompletion(w);
                const on = w === weekIndex;
                return (
                  <TouchableOpacity
                    key={w}
                    onPress={() => pickWeek(w)}
                    activeOpacity={0.8}
                    style={{
                      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                      minHeight: 48, paddingHorizontal: 14, borderRadius: 10, marginBottom: 6, overflow: 'hidden',
                      backgroundColor: on ? `rgba(${GOLD_RGB},0.14)` : 'transparent',
                      borderWidth: on ? 1 : 0, borderColor: `rgba(${GOLD_RGB},0.4)`,
                    }}
                  >
                    {on && <ButtonShine radius={10} />}
                    <GradientTitle
                      title={`Week ${w + 1}`}
                      color={on ? theme.accentAmber : theme.textSecondary}
                      numberOfLines={1}
                      style={{ fontSize: 14, fontFamily: Type.uiSemibold }}
                    />
                    <Text style={{ fontSize: 12, fontFamily: Type.ui, color: theme.textMuted }}>{done}/{of} done</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <CompanionFAB onPress={() => setCompanionOpen(true)} bottom={32} />
      <CompanionChat visible={companionOpen} onClose={() => setCompanionOpen(false)} />
    </LinearGradient>
  );
}

// Animated progress bar -- same recipe as plans.tsx's PlanRow, kept local since that one isn't exported.
function ProgressBar({ pct, theme }: { pct: number; theme: any }) {
  const w = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(w, { toValue: pct, duration: 600, useNativeDriver: false }).start();
  }, [pct]);
  const width = w.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  return (
    <View style={{ height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: theme.bgProgressTrack }}>
      <Animated.View style={{ width, height: '100%', borderRadius: 3, overflow: 'hidden' }}>
        <LinearGradient colors={barFillGradient(theme.accentAmber)} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={{ flex: 1 }} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 15, fontFamily: Type.uiSemibold, textAlign: 'center' },
  dayCount: { fontSize: 13, fontFamily: Type.uiSemibold },
  description: { fontSize: 15, fontFamily: Type.uiBold, lineHeight: 21, marginBottom: 16 },
  progressWrap: { marginBottom: 14, gap: 6 },
  progressText: { fontSize: 11, fontFamily: Type.ui },
  weekPicker: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    minHeight: 44, borderRadius: 10, borderWidth: 1, marginBottom: 14, overflow: 'hidden',
  },
  weekPickerText: { fontSize: 14, fontFamily: Type.uiSemibold },
  dayRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 8,
    shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 2,
  },
  dayLabel: { fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', fontFamily: Type.uiBold, marginBottom: 2 },
  dayPassage: { fontSize: 15, fontFamily: Type.uiSemibold },
  dayToggle: { padding: 2 },
});
