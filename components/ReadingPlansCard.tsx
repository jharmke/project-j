import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useToast } from './Toast';
import {
  READING_PLANS,
  ReadingPlan,
  PlanProgress,
  ReadingPlansStorage,
  formatDayReading,
  getPlanCompletion,
  getTodayReading,
  MAX_ACTIVE_PLANS,
} from '../data/readingPlans';
import { storageSet } from '../utils/storage';

interface Props {
  theme: any;
}

export default function ReadingPlansCard({ theme: t }: Props) {
  const { showToast } = useToast();
  const [planProgress, setPlanProgress] = useState<ReadingPlansStorage>({});
  const [loading, setLoading] = useState(true);

  const loadPlans = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem('pj_reading_plans');
      setPlanProgress(raw ? JSON.parse(raw) : {});
    } catch (e) {}
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { loadPlans(); }, [loadPlans]));

  const markRead = async (planId: string, dayIndex: number) => {
    try {
      const raw = await AsyncStorage.getItem('pj_reading_plans');
      const all: ReadingPlansStorage = raw ? JSON.parse(raw) : {};
      const prog = all[planId];
      if (!prog || prog.completedDays.includes(dayIndex)) return;
      const updated = {
        ...all,
        [planId]: { ...prog, completedDays: [...prog.completedDays, dayIndex] },
      };
      await storageSet('pj_reading_plans', JSON.stringify(updated));
      setPlanProgress(updated);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const plan = READING_PLANS.find(p => p.id === planId);
      showToast(`Day ${dayIndex + 1} marked complete`, plan?.shortName, 'success');
    } catch (e) {}
  };


  const navigateToPlan = (plan: ReadingPlan, prog: PlanProgress) => {
    const reading = getTodayReading(plan, prog);
    if (reading === 'complete') {
      router.push('/bible');
      return;
    }
    const firstPassage = reading.day.passages[0];
    router.push({
      pathname: '/bible',
      params: {
        planNavBook: firstPassage.book,
        planNavChapter: String(firstPassage.startChapter),
      },
    });
  };

  const activePlans = READING_PLANS.filter(p => !!planProgress[p.id]);

  if (loading) return null;

  return (
    <View style={[styles.card, {
      backgroundColor: t.bgCard,
      borderColor: t.borderCard,
      borderTopColor: t.accentBlueRaw,
      shadowColor: '#000',
    }]}>

      {/* Hero watermark */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Ionicons
          name="book"
          size={130}
          color={t.accentBlueRaw}
          style={{ position: 'absolute', right: -24, bottom: -28, opacity: 0.10 }}
        />
      </View>

      {/* Card header */}
      <View style={styles.cardHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="book" size={14} color={t.accentBlueRaw} />
          <Text style={[styles.cardLabel, { color: t.textMuted }]}>READING PLANS</Text>
        </View>
        {activePlans.length > 0 && (
          <Text style={[styles.planCount, { color: t.textDim }]}>
            {activePlans.length}/{MAX_ACTIVE_PLANS} active
          </Text>
        )}
      </View>

      {activePlans.length === 0 ? (
        /* Empty state */
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={28} color={t.textDim} />
          <Text style={[styles.emptyTitle, { color: t.textSecondary }]}>No active plans</Text>
          <Text style={[styles.emptySubtitle, { color: t.textMuted }]}>
            Start a reading plan from the Bible screen
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/bible')}
            style={[styles.browseBtn, { backgroundColor: t.accentBlueBg, borderColor: t.accentBlueBorder }]}
          >
            <Text style={[styles.browseBtnText, { color: t.accentBlue }]}>Browse Plans</Text>
            <Ionicons name="chevron-forward" size={12} color={t.accentBlue} />
          </TouchableOpacity>
        </View>
      ) : (
        activePlans.map((plan, idx) => {
          const prog = planProgress[plan.id];
          const reading = getTodayReading(plan, prog);
          const { completed, total, pct } = getPlanCompletion(plan, prog);

          return (
            <View key={plan.id}>
              {idx > 0 && <View style={[styles.divider, { backgroundColor: t.borderCard }]} />}

              {/* Plan header: name + day count -- tappable to navigate */}
              <TouchableOpacity
                onPress={() => navigateToPlan(plan, prog)}
                activeOpacity={0.7}
                style={styles.planRow}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <Ionicons name={plan.icon as any} size={12} color={t.textDim} />
                  <Text style={[styles.planName, { color: t.textMuted }]} numberOfLines={1}>
                    {plan.name.toUpperCase()}
                  </Text>
                  {reading !== 'complete' && (
                    <Text style={[styles.dayBadge, { color: t.textDim }]}>
                      Day {reading.dayIndex + 1}/{total}
                    </Text>
                  )}
                </View>

                {reading === 'complete' ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Ionicons name="checkmark-circle" size={16} color={t.accentGreen} />
                    <Text style={[styles.completeText, { color: t.accentGreen }]}>Plan Complete!</Text>
                    <Text style={[styles.progressLabel, { color: t.textDim }]}>
                      {total}/{total} days
                    </Text>
                  </View>
                ) : (
                  <>
                    {/* Today's passage */}
                    <Text style={[styles.passageText, { color: t.accentBlueRaw }]} numberOfLines={1}>
                      {formatDayReading(reading.day)}
                    </Text>

                    {/* Progress bar */}
                    <View style={[styles.progressTrack, { backgroundColor: t.bgProgressTrack, marginBottom: 8 }]}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: pct > 0 ? `${Math.round(pct * 100)}%` as any : 2,
                            backgroundColor: t.accentBlueRaw,
                          },
                        ]}
                      />
                    </View>

                    {reading.isRead ? (
                      /* Already read */
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <Ionicons name="checkmark-circle" size={14} color={t.accentGreen} />
                        <Text style={[styles.readLabel, { color: t.accentGreen }]}>
                          Read today · {completed}/{total} done
                        </Text>
                      </View>
                    ) : (
                      /* Not read -- full-width prominent button */
                      <TouchableOpacity
                        onPress={() => markRead(plan.id, reading.dayIndex)}
                        activeOpacity={0.8}
                        style={[styles.markReadBtn, { backgroundColor: t.accentBlueBg, borderColor: t.accentBlueBorder }]}
                      >
                        <Ionicons name="bookmark" size={14} color={t.accentBlue} />
                        <Text style={[styles.markReadText, { color: t.accentBlue }]}>
                          MARK AS READ
                        </Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </TouchableOpacity>
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 0.5,
    borderTopWidth: 1.5,
    padding: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardLabel: {
    fontSize: 9,
    fontFamily: 'DMSans_700Bold',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  planCount: {
    fontSize: 10,
    fontFamily: 'DMSans_400Regular',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 14,
    fontFamily: 'DMSans_700Bold',
    marginTop: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    textAlign: 'center',
    lineHeight: 18,
  },
  browseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 6,
  },
  browseBtnText: {
    fontSize: 12,
    fontFamily: 'DMSans_600SemiBold',
  },
  divider: {
    height: 0.5,
    marginVertical: 12,
  },
  planRow: {
    gap: 2,
  },
  planName: {
    fontSize: 9,
    fontFamily: 'DMSans_700Bold',
    letterSpacing: 2,
    textTransform: 'uppercase',
    flex: 1,
  },
  dayBadge: {
    fontSize: 9,
    fontFamily: 'DMSans_400Regular',
    marginLeft: 'auto',
  },
  passageText: {
    fontSize: 16,
    fontFamily: 'DMSans_700Bold',
    marginBottom: 6,
  },
  completeText: {
    fontSize: 15,
    fontFamily: 'DMSans_700Bold',
  },
  progressLabel: {
    fontSize: 11,
    fontFamily: 'DMSans_400Regular',
  },
  progressTrack: {
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: 3,
    borderRadius: 2,
    minWidth: 2,
  },
  markReadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    marginTop: 2,
  },
  markReadText: {
    fontSize: 13,
    fontFamily: 'DMSans_700Bold',
    letterSpacing: 1,
  },
  readLabel: {
    fontSize: 12,
    fontFamily: 'DMSans_600SemiBold',
  },
  undoText: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    textDecorationLine: 'underline',
  },
});
