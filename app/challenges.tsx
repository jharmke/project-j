// app/challenges.tsx
// The Challenges page (#7). Reached from the home card and the Stats entry.
// Shows the one active challenge in full detail, plus Past Challenges (Run It Back).

import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import { useTheme } from '../theme';
import { useToast } from '../components/Toast';
import TooltipIcon from '../components/TooltipIcon';
import { METRIC_META, MetricId } from '../utils/comparisonEngine';
import {
  Challenge, ChallengeProgress, ChallengeMetric,
  loadActiveChallenge, loadChallengeHistory, clearActiveChallenge, appendChallengeHistory,
  computeChallengeProgress, createChallenge, challengeTitle,
} from '../utils/challenges';

function fmtMetricValue(id: MetricId, v: number | null): string {
  if (v === null) return '—';
  switch (id) {
    case 'net': return `${v > 0 ? '+' : ''}${Math.round(v).toLocaleString()}`;
    case 'protein': return `${Math.round(v)}g`;
    case 'steps': return Math.round(v).toLocaleString();
    case 'water': return `${Math.round(v)} oz`;
    case 'sleepScore': return `${Math.round(v)}`;
    case 'weight': return `${v > 0 ? '+' : ''}${v.toFixed(1)}`;
    default: return `${v}`;
  }
}

export default function ChallengesScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const accent = theme.accentBlueRaw;

  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Challenge | null>(null);
  const [progress, setProgress] = useState<ChallengeProgress | null>(null);
  const [history, setHistory] = useState<Challenge[]>([]);
  const [isMindful, setIsMindful] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const s = await AsyncStorage.getItem('pj_settings');
      setIsMindful(!!s && String(JSON.parse(s).styleMode).toLowerCase() === 'mindful');
    } catch {}
    const ch = await loadActiveChallenge();
    setActive(ch);
    setProgress(ch ? await computeChallengeProgress(ch) : null);
    setHistory(await loadChallengeHistory());
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const endChallenge = async () => {
    if (!active) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
    await appendChallengeHistory(active);
    await clearActiveChallenge();
    showToast('Challenge ended', undefined, 'info');
    load();
  };

  const runItBack = async (past: Challenge) => {
    if (active) { showToast('Finish your current challenge first', undefined, 'info'); return; }
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    await createChallenge({
      type: past.type,
      startMode: 'tomorrow',
      durationDays: Math.max(2, (new Date(past.endKey).getTime() - new Date(past.startKey).getTime()) / 86400000 + 1),
      metrics: past.metrics,
      metric: past.metric,
      target: past.target,
    });
    showToast('Challenge started', undefined, 'success');
    load();
  };

  const Header = (
    <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 0.5, borderBottomColor: theme.borderCard, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); router.back(); }} style={{ padding: 4 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="chevron-back" size={24} color={accent} />
      </TouchableOpacity>
      <Text style={{ fontSize: 24, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2, color: accent, flex: 1 }}>CHALLENGES</Text>
      <View style={{ transform: [{ translateY: -1 }] }}>
        <TooltipIcon tooltipKey="challenge_system" size={18} />
      </View>
    </View>
  );

  if (loading) {
    return <View style={{ flex: 1, backgroundColor: theme.bgPrimary }}>{Header}<View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={accent} /></View></View>;
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.bgPrimary }}>
      {Header}
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}>

        {/* ── Active challenge ── */}
        {active && progress ? (
          <View style={{ backgroundColor: theme.bgCard, borderWidth: 0.5, borderColor: theme.borderCard, borderTopColor: accent, borderRadius: 14, padding: 16, overflow: 'hidden' }}>
            <Ionicons name="trophy" size={130} color={accent} style={{ position: 'absolute', right: -24, bottom: -28, opacity: 0.08 }} />
            {/* Header row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="trophy" size={11} color={theme.textMuted} />
                <Text style={{ fontSize: 9, letterSpacing: 3, color: theme.textMuted, textTransform: 'uppercase', fontFamily: 'DMSans_700Bold' }}>
                  {progress.status === 'pending' ? 'Starts Tomorrow' : progress.status === 'ended' ? 'Complete' : `Day ${progress.dayNumber} of ${progress.totalDays}`}
                </Text>
              </View>
              {progress.status === 'active' && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: `${accent}18`, borderWidth: 1, borderColor: `${accent}40`, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                  <Ionicons name="timer-outline" size={10} color={accent} />
                  <Text style={{ fontSize: 10, fontFamily: 'DMSans_700Bold', letterSpacing: 0.5, color: accent }}>
                    {progress.daysRemaining} {progress.daysRemaining === 1 ? 'day' : 'days'} left
                  </Text>
                </View>
              )}
            </View>
            <Text style={{ fontSize: 18, fontFamily: 'DMSans_700Bold', color: theme.textSecondary, marginBottom: 12 }}>{challengeTitle(active, isMindful)}</Text>

            {/* Type 1 beat */}
            {active.type === 'beat' && progress.rows && (
              <>
                {progress.status !== 'pending' && (
                  <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                    <View style={{ flex: 1 }} />
                    <View style={{ width: 88, alignItems: 'center' }}>
                      <Text style={{ fontSize: 9, fontFamily: 'DMSans_700Bold', letterSpacing: 1.5, textTransform: 'uppercase', color: accent }}>You so far</Text>
                    </View>
                    <View style={{ width: 88, alignItems: 'center' }}>
                      <Text style={{ fontSize: 9, fontFamily: 'DMSans_700Bold', letterSpacing: 1.5, textTransform: 'uppercase', color: theme.textDim }}>{isMindful ? 'Previous' : 'To Beat'}</Text>
                    </View>
                  </View>
                )}
                {progress.rows.map((r, i) => {
                  const youColor = r.beating ? accent : theme.textDim;
                  const benchColor = theme.textDim;
                  return (
                    <View key={r.metric} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderBottomWidth: i < progress.rows!.length - 1 ? 0.5 : 0, borderBottomColor: theme.borderSubtle ?? theme.borderCard }}>
                      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name={(r.beating ? 'checkmark-circle' : 'ellipse-outline') as any} size={14} color={r.beating ? accent : theme.textDim} />
                        <Text style={{ fontSize: 10, fontFamily: 'DMSans_700Bold', letterSpacing: 1, textTransform: 'uppercase', color: theme.textSecondary }}>{r.label}</Text>
                      </View>
                      <View style={{ width: 88, alignItems: 'center' }}>
                        {r.beating && <View style={{ position: 'absolute', left: 4, top: '15%', width: 2, height: '70%', backgroundColor: accent, borderRadius: 1 }} />}
                        <Text style={{ fontSize: 20, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1, color: youColor }}>{fmtMetricValue(r.metric, r.youAvg)}</Text>
                        <Text style={{ fontSize: 8, fontFamily: 'DMSans_700Bold', letterSpacing: 1, textTransform: 'uppercase', color: youColor, opacity: 0.6 }}>{r.unit}</Text>
                      </View>
                      <View style={{ width: 88, alignItems: 'center' }}>
                        <Text style={{ fontSize: 20, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1, color: benchColor }}>{fmtMetricValue(r.metric, r.benchmarkAvg)}</Text>
                        <Text style={{ fontSize: 8, fontFamily: 'DMSans_700Bold', letterSpacing: 1, textTransform: 'uppercase', color: benchColor, opacity: 0.6 }}>{r.unit}</Text>
                      </View>
                    </View>
                  );
                })}
                {progress.status !== 'pending' && (
                  <Text style={{ fontSize: 12, color: progress.won ? accent : theme.textSecondary, fontFamily: 'DMSans_600SemiBold', marginTop: 10 }}>
                    {progress.won ? (isMindful ? 'Ahead on every metric' : 'Beating it on all metrics') : `Ahead on ${progress.metricsBeaten} of ${progress.metricsTotal}`}
                  </Text>
                )}
              </>
            )}

            {/* Type 2 custom weight */}
            {active.type === 'custom' && progress.isWeight && (
              <View style={{ alignItems: 'center', paddingVertical: 12 }}>
                <Text style={{ fontSize: 44, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1, color: progress.won ? accent : theme.textPrimary }}>
                  {progress.weightChangeSoFar == null ? '—' : `${progress.weightChangeSoFar > 0 ? '+' : ''}${progress.weightChangeSoFar.toFixed(1)}`}
                </Text>
                <Text style={{ fontSize: 12, color: theme.textSecondary, fontFamily: 'DMSans_500Medium' }}>
                  of {Math.abs(active.target ?? 0)} lbs {(active.target ?? 0) < 0 ? 'to lose' : 'to gain'}
                </Text>
                {progress.status === 'active' && (
                  <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'DMSans_400Regular', marginTop: 8 }}>
                    {progress.daysRemaining} {progress.daysRemaining === 1 ? 'day' : 'days'} remaining
                  </Text>
                )}
              </View>
            )}

            {/* Type 2 custom per-day */}
            {active.type === 'custom' && !progress.isWeight && progress.metric && (
              <View style={{ alignItems: 'center', paddingVertical: 12 }}>
                <Text style={{ fontSize: 10, fontFamily: 'DMSans_700Bold', letterSpacing: 2, textTransform: 'uppercase', color: theme.textDim, marginBottom: 6 }}>
                  {progress.status === 'pending' ? 'Target' : 'Today'}
                </Text>
                <Text style={{ fontSize: 38, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1, color: theme.textPrimary }}>
                  {progress.status === 'pending'
                    ? fmtMetricValue(progress.metric, progress.target ?? null)
                    : `${fmtMetricValue(progress.metric, progress.todayValue ?? null)} / ${fmtMetricValue(progress.metric, progress.target ?? null)}`}
                </Text>
                {progress.status !== 'pending' && (
                  <Text style={{ fontSize: 13, color: accent, fontFamily: 'DMSans_600SemiBold', marginTop: 8 }}>
                    Hit {progress.daysHit} of {progress.daysElapsed} days, {progress.daysRemaining > 0 ? `${progress.daysRemaining} left` : 'final day'}
                  </Text>
                )}
              </View>
            )}

            {/* End / replace */}
            <TouchableOpacity onPress={endChallenge} style={{ marginTop: 12, alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 16 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={{ fontSize: 12, color: theme.textDim, fontFamily: 'DMSans_500Medium' }}>{progress.status === 'ended' ? 'Clear and start new' : 'End challenge'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          // Empty state: no active challenge
          <View style={{ backgroundColor: theme.bgCard, borderWidth: 0.5, borderColor: theme.borderCard, borderTopColor: accent, borderRadius: 14, paddingVertical: 40, paddingHorizontal: 24, alignItems: 'center' }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: `${accent}1A`, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              <Ionicons name="trophy-outline" size={26} color={accent} />
            </View>
            <Text style={{ fontSize: 16, fontFamily: 'DMSans_700Bold', color: theme.textSecondary }}>No active challenge</Text>
            <Text style={{ fontSize: 13, fontFamily: 'DMSans_400Regular', color: theme.textDim, marginTop: 6, textAlign: 'center', lineHeight: 19 }}>{isMindful ? 'Grow past a previous period or set a goal, and track it right here.' : 'Beat a past period or set a custom goal, and track it right here.'}</Text>
          </View>
        )}

        {/* ── New Challenge button (when none active) ── */}
        {!active && (
          <TouchableOpacity activeOpacity={0.85} onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Medium); router.push('/challenge-create'); }}
            style={{ backgroundColor: accent, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 14 }}>
            <Text style={{ fontSize: 15, fontFamily: 'DMSans_700Bold', color: '#fff' }}>New Challenge</Text>
          </TouchableOpacity>
        )}

        {/* ── Past Challenges ── */}
        {history.length > 0 && (
          <>
            <Text style={{ fontSize: 9, letterSpacing: 3, color: theme.textMuted, textTransform: 'uppercase', fontFamily: 'DMSans_700Bold', marginTop: 28, marginBottom: 10 }}>Past Challenges</Text>
            {history.map(past => (
              <View key={past.id} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.bgCard, borderWidth: 0.5, borderColor: theme.borderCard, borderRadius: 12, padding: 14, marginBottom: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontFamily: 'DMSans_600SemiBold', color: theme.textPrimary }}>{challengeTitle(past, isMindful)}</Text>
                  <Text style={{ fontSize: 11, color: theme.textDim, fontFamily: 'DMSans_400Regular', marginTop: 2 }}>{past.startKey} → {past.endKey}</Text>
                </View>
                <TouchableOpacity onPress={() => runItBack(past)} style={{ backgroundColor: `${accent}1F`, borderWidth: 1, borderColor: `${accent}50`, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12 }} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                  <Text style={{ fontSize: 12, color: accent, fontFamily: 'DMSans_600SemiBold' }}>Run It Back</Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}
