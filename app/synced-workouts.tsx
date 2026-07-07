import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { useHealthKit } from '../useHealthKit';
import { groupSyncedWorkouts, applySyncedLabels, loadSyncedLabels, saveSyncedLabel, formatDurationShort, SyncedWorkout } from '../utils/syncedWorkouts';

// Phase 1 verification screen (temporary): pulls the user's real Apple workouts, reads the indoor flag,
// and shows them grouped by { type + indoor } so we can confirm the bucketing is correct on real data
// before building the library integration. Reachable from Settings > Dev Tools.
export default function SyncedWorkoutsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { fetchSyncedWorkouts } = useHealthKit();
  const [loading, setLoading] = useState(true);
  const [raw, setRaw] = useState<SyncedWorkout[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [labels, setLabels] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [list, savedLabels] = await Promise.all([fetchSyncedWorkouts(365), loadSyncedLabels()]);
      setRaw(list);
      setLabels(savedLabels);
      setLoading(false);
    })();
  }, []);

  const groups = useMemo(() => applySyncedLabels(groupSyncedWorkouts(raw), labels), [raw, labels]);

  // Rename a group's label (persisted by its stable key). Empty resets to the derived default.
  const renameGroup = (key: string, current: string) => {
    Alert.prompt(
      'Rename',
      'Custom label for this workout group (blank resets to default).',
      async (text: string) => {
        await saveSyncedLabel(key, text ?? '');
        setLabels(prev => {
          const next = { ...prev };
          if (text && text.trim()) next[key] = text.trim();
          else delete next[key];
          return next;
        });
      },
      'plain-text',
      current,
    );
  };
  const missingFlag = useMemo(() => raw.filter(w => w.indoor === null).length, [raw]);

  const fmtDate = (d: string | Date) => {
    const dt = new Date(d);
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <LinearGradient colors={[theme.gradientStart, theme.gradientEnd]} style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { borderBottomColor: theme.borderCard }]}>
        <TouchableOpacity
          onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
          style={[styles.headerBtn, { backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder }]}>
          <Ionicons name="chevron-back" size={14} color={theme.accentBlue} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.accentBlueRaw }]}>SYNCED WORKOUTS</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.accentBlue} />
          <Text style={{ color: theme.textMuted, marginTop: 12, fontFamily: 'DMSans_400Regular' }}>Reading Apple Health workouts...</Text>
        </View>
      ) : raw.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="barbell-outline" size={32} color={theme.textDim} />
          <Text style={{ color: theme.textSecondary, fontSize: 16, fontFamily: 'DMSans_600SemiBold', marginTop: 10 }}>No synced workouts found</Text>
          <Text style={{ color: theme.textMuted, fontSize: 13, fontFamily: 'DMSans_400Regular', marginTop: 4, textAlign: 'center', paddingHorizontal: 32 }}>
            No Apple Health workouts in the last year, or Health access isn't granted.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <Text style={{ color: theme.textMuted, fontSize: 12, fontFamily: 'DMSans_400Regular', marginBottom: 14 }}>
            {raw.length} sessions · {groups.length} groups · {missingFlag} missing the indoor flag
          </Text>

          {groups.map(g => {
            const isOpen = !!expanded[g.key];
            return (
              <View key={g.key} style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: theme.accentBlueRaw }]}>
                <TouchableOpacity
                  onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setExpanded(p => ({ ...p, [g.key]: !p[g.key] })); }}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.textSecondary, fontSize: 16, fontFamily: 'DMSans_700Bold' }}>{g.label}</Text>
                    <Text style={{ color: theme.textMuted, fontSize: 11, fontFamily: 'DMSans_400Regular', marginTop: 2 }}>
                      {g.sessions.length} session{g.sessions.length === 1 ? '' : 's'} · type {g.type}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                    <TouchableOpacity
                      onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); renameGroup(g.key, g.label); }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Ionicons name="pencil" size={15} color={theme.accentBlue} />
                    </TouchableOpacity>
                    <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={theme.textMuted} />
                  </View>
                </TouchableOpacity>

                {isOpen && (
                  <View style={{ marginTop: 12, gap: 8 }}>
                    {g.sessions.map(s => (
                      <View key={s.uuid} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderTopWidth: 0.5, borderTopColor: theme.borderCard }}>
                        <View>
                          <Text style={{ color: theme.textSecondary, fontSize: 13, fontFamily: 'DMSans_600SemiBold' }}>{fmtDate(s.startDate)}</Text>
                          <Text style={{ color: theme.textMuted, fontSize: 11, fontFamily: 'DMSans_400Regular', marginTop: 1 }}>
                            {formatDurationShort(s.durationSec)}{s.distanceMi ? ` · ${s.distanceMi} mi` : ''}{s.calories ? ` · ${s.calories} cal` : ''}
                          </Text>
                        </View>
                        <Text style={{ color: s.indoor === null ? theme.textDim : theme.accentBlue, fontSize: 10, fontFamily: 'DMSans_700Bold', letterSpacing: 1 }}>
                          {s.indoor === null ? '—' : s.indoor ? 'INDOOR' : 'OUTDOOR'}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5 },
  headerBtn: { width: 40, height: 32, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  card: { borderWidth: 0.5, borderTopWidth: 1.5, borderRadius: 14, padding: 16, marginBottom: 12 },
});
