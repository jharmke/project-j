import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ACCENT_PALETTES, THEME_ORDER, ThemeId, THEMES, useTheme } from '../theme';
import { useHealthKit } from '../useHealthKit';
import { BLANK_DAY, WorkoutTag } from '../workoutData';
import CelebrationOverlay from '../components/CelebrationOverlay';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { theme, themeId, accentId, setTheme, setAccent } = useTheme();
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [devCelebVisible,  setDevCelebVisible]  = useState(false);
  const [devCelebTier,     setDevCelebTier]     = useState<'small'|'medium'|'large'>('small');
  const [devCelebLabel,    setDevCelebLabel]    = useState<string|undefined>(undefined);
  const [devTapCount,      setDevTapCount]      = useState(0);
  const [devUnlocked,      setDevUnlocked]      = useState(false);
  const [importRange, setImportRange] = useState<14 | 30 | 90>(30);
  const [importing, setImporting] = useState(false);
  const { fetchHistoricalWorkouts, authorized } = useHealthKit();

  const fixDefaultTags = async () => {
    try {
      const s = await AsyncStorage.getItem('pj_settings');
      const current = s ? JSON.parse(s) : {};
      let tags: WorkoutTag[] = current.workoutTags || [];

      // Fix tag_push label
      tags = tags.map(t => t.id === 'tag_push' ? { ...t, label: 'Push', locked: true, color: '#3b82f6' } : t);
      // Fix tag_pull label
      tags = tags.map(t => t.id === 'tag_pull' ? { ...t, label: 'Pull', locked: true, color: '#10b981' } : t);
      // Fix tag_legs -- rename to Legs only
      tags = tags.map(t => t.id === 'tag_legs' ? { ...t, label: 'Legs', locked: true, color: '#f59e0b' } : t);
      // Add tag_core if missing
      if (!tags.find(t => t.id === 'tag_core')) {
        const legsIdx = tags.findIndex(t => t.id === 'tag_legs');
        const coreTag: WorkoutTag = { id: 'tag_core', label: 'Core', color: '#eab308', locked: true };
        if (legsIdx !== -1) {
          tags.splice(legsIdx + 1, 0, coreTag);
        } else {
          tags.unshift(coreTag);
        }
      }
      // Fix tag_cardio
      tags = tags.map(t => t.id === 'tag_cardio' ? { ...t, label: 'Cardio', locked: true, color: '#f97316' } : t);
      // Fix tag_rest
      tags = tags.map(t => t.id === 'tag_rest' ? { ...t, label: 'Rest', locked: true, color: '#64748b' } : t);

      await AsyncStorage.setItem('pj_settings', JSON.stringify({ ...current, workoutTags: tags }));
      Alert.alert('Done', 'Default tags fixed. Restart the app to see changes.');
    } catch (e) {
      Alert.alert('Error', 'Something went wrong.');
      console.log('Fix tags error', e);
    }
  };

  const importWorkoutHistory = async () => {
    if (!authorized) {
      Alert.alert('HealthKit Not Authorized', 'Please allow health data access in your device settings.');
      return;
    }
    setImporting(true);
    try {
      const results = await fetchHistoricalWorkouts(importRange);
      if (results.length === 0) {
        Alert.alert('No Workouts Found', `No Apple Health workouts found in the last ${importRange} days.`);
        setImporting(false);
        return;
      }

      // Load current workout state
      const saved = await AsyncStorage.getItem('pj_workout_state');
      const current = saved ? JSON.parse(saved) : {};
      const programs = current.programs || {};

      // Merge by date, deduplicate by UUID
      let added = 0;
      for (const { dateKey, exercise } of results) {
        const existing = programs[dateKey] || { ...BLANK_DAY, type: 'cardio' as const, focus: 'Cardio' };
        const existingUUIDs = new Set(
          (existing.exercises || []).map((e: any) => e.appleHealthUUID).filter(Boolean)
        );
        if (existingUUIDs.has(exercise.appleHealthUUID)) continue;
        programs[dateKey] = {
          ...existing,
          exercises: [...(existing.exercises || []), exercise],
        };
        added++;
      }

      await AsyncStorage.setItem('pj_workout_state', JSON.stringify({ ...current, programs }));
      Alert.alert('Import Complete', `Added ${added} workout${added !== 1 ? 's' : ''} from the last ${importRange} days.`);
    } catch (e) {
      Alert.alert('Import Failed', 'Something went wrong. Please try again.');
      console.log('Import error', e);
    }
    setImporting(false);
  };

  useEffect(() => {
    const load = async () => {
      try {
        const saved = await AsyncStorage.getItem('pj_settings');
        if (saved) {
          const data = JSON.parse(saved);
          if (data.hapticsEnabled !== undefined) setHapticsEnabled(data.hapticsEnabled);
        }
      } catch (e) {}
    };
    load();
  }, []);

  const saveSetting = async (key: string, value: any) => {
    try {
      const saved = await AsyncStorage.getItem('pj_settings');
      const current = saved ? JSON.parse(saved) : {};
      await AsyncStorage.setItem('pj_settings', JSON.stringify({ ...current, [key]: value }));
    } catch (e) {}
  };

  const toggleHaptics = (val: boolean) => {
    setHapticsEnabled(val);
    saveSetting('hapticsEnabled', val);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bgPrimary, paddingTop: insets.top }}>
      <View style={[styles.header, { borderBottomColor: theme.borderCard }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Ionicons name="arrow-back" size={22} color={theme.accentBlue} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerLabel, { color: theme.textMuted }]}>PROJECT J</Text>
          <TouchableOpacity onPress={() => {
            const next = devTapCount + 1;
            setDevTapCount(next);
            if (next >= 7) { setDevUnlocked(true); setDevTapCount(0); }
          }}>
            <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Settings</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* ── Theme Selector ── */}
        <View style={[styles.section, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: theme.borderCardTop }]}>
          <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>Appearance</Text>
          <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 10 }}>
            {THEME_ORDER.map((id: ThemeId) => {
              const t = THEMES[id];
              const isActive = themeId === id;
              return (
                <TouchableOpacity
                  key={id}
                  onPress={() => setTheme(id)}
                  activeOpacity={t.paid ? 1 : 0.7}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: t.bgCard,
                    borderWidth: isActive ? 1.5 : 1,
                    borderColor: isActive ? t.accentBlue : t.borderCard,
                    borderRadius: 10,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    opacity: 1,
                  }}>
                  {/* Name in theme's own text color */}
                  <Text style={{ flex: 1, fontSize: 14, color: t.textPrimary, fontFamily: 'DMSans_600SemiBold' }}>
                    {t.name}
                  </Text>
                  {/* Badges */}
                  {t.paid && (
                    <View style={{ backgroundColor: `${t.accentAmber}33`, borderWidth: 1, borderColor: `${t.accentAmber}66`, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, marginRight: 8 }}>
                      <Text style={{ fontSize: 9, color: t.accentAmber, fontFamily: 'DMSans_700Bold', letterSpacing: 1 }}>PRO</Text>
                    </View>
                  )}
                  {isActive && (
                    <Ionicons name="checkmark-circle" size={18} color={t.accentBlue} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── Accent Color ── */}
          <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
            <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: 'DMSans_700Bold', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 10 }}>Accent Color</Text>
            <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
              {ACCENT_PALETTES[themeId].map((accent) => {
                const isActiveAccent = accentId === accent.id;
                return (
                  <TouchableOpacity
                    key={accent.id}
                    onPress={() => setAccent(accent.id)}
                    style={{ alignItems: 'center', gap: 4 }}>
                    <View style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: accent.color,
                      borderWidth: isActiveAccent ? 2.5 : 1.5,
                      borderColor: isActiveAccent ? theme.textPrimary : 'transparent',
                      shadowColor: accent.color,
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: isActiveAccent ? 0.6 : 0,
                      shadowRadius: 6,
                    }} />
                    <Text style={{ fontSize: 9, color: isActiveAccent ? theme.textPrimary : theme.textMuted, fontFamily: 'DMSans_600SemiBold', letterSpacing: 0.5 }}>{accent.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* ── Feedback ── */}
        <View style={[styles.section, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: theme.borderCardTop }]}>
          <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>Feedback</Text>
          <View style={[styles.row, { borderTopColor: theme.borderSubtle }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: theme.textPrimary }]}>Haptic Feedback</Text>
              <Text style={[styles.rowSub, { color: theme.textMuted }]}>Vibration on button press</Text>
            </View>
            <Switch
              value={hapticsEnabled}
              onValueChange={toggleHaptics}
              trackColor={{ false: theme.bgProgressTrack, true: theme.accentBlueBg }}
              thumbColor={hapticsEnabled ? theme.accentBlue : theme.textMuted}
            />
          </View>
        </View>

      {/* ── Health Data ── */}
        <View style={[styles.section, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: theme.borderCardTop }]}>
          <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>Health Data</Text>
          <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 12 }}>
            <Text style={{ fontSize: 12, fontFamily: 'DMSans_400Regular', color: theme.textMuted, lineHeight: 18 }}>
              Import your Apple Health workout history into Project J. Existing data and manual entries will not be affected.
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {([14, 30, 90] as const).map(d => (
                <TouchableOpacity
                  key={d}
                  onPress={() => setImportRange(d)}
                  style={{ flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: importRange === d ? theme.accentBlueBorder : theme.borderInput, backgroundColor: importRange === d ? theme.accentBlueBg : theme.bgInput }}>
                  <Text style={{ fontSize: 11, fontFamily: 'DMSans_700Bold', color: importRange === d ? theme.accentBlue : theme.textMuted }}>
                    {d === 14 ? '2 WEEKS' : d === 30 ? '1 MONTH' : '3 MONTHS'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              onPress={importWorkoutHistory}
              disabled={importing}
              style={{ paddingVertical: 12, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: theme.accentBlueBorder, backgroundColor: theme.accentBlueBg, opacity: importing ? 0.6 : 1, flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
              {importing
                ? <ActivityIndicator size="small" color={theme.accentBlue} />
                : <Ionicons name="download-outline" size={16} color={theme.accentBlue} />}
              <Text style={{ fontSize: 13, fontFamily: 'DMSans_700Bold', color: theme.accentBlue, letterSpacing: 1 }}>
                {importing ? 'IMPORTING...' : 'IMPORT WORKOUT HISTORY'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Dev Tools ── */}
        <View style={[styles.section, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: theme.borderCardTop }]}>
          <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>Dev Tools</Text>
          <TouchableOpacity
            style={[styles.row, { borderTopColor: theme.borderCard }]}
            onPress={fixDefaultTags}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: theme.accentAmber }]}>Fix Default Tags</Text>
              <Text style={[styles.rowSub, { color: theme.textMuted }]}>Resets default tag names/colors. Dev use only.</Text>
            </View>
            <Ionicons name="construct-outline" size={18} color={theme.accentAmber} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.row, { borderTopColor: theme.borderCard }]}
            onPress={() => {
              Alert.alert(
                'Reset Workout State',
                'This will clear all workout data including exercises, notes, cardio logs, and weekly template. Your food, profile, and settings data will not be affected.\n\nThis cannot be undone.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Reset', style: 'destructive',
                    onPress: async () => {
                      await AsyncStorage.removeItem('pj_workout_state');
                      Alert.alert('Done', 'Workout state cleared. Restart the app.');
                    }
                  }
                ]
              );
            }}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: theme.accentRed }]}>Reset Workout State</Text>
              <Text style={[styles.rowSub, { color: theme.textMuted }]}>Clears exercises, notes, logs, template. Dev use only.</Text>
            </View>
            <Ionicons name="trash-outline" size={18} color={theme.accentRed} />
          </TouchableOpacity>
        </View>

        {devUnlocked && (
          <View style={[styles.section, { borderColor: theme.borderCard, borderTopColor: theme.borderCardTop, backgroundColor: theme.bgCard, marginTop: 12 }]}>
            <Text style={[styles.sectionLabel, { color: theme.accentRed }]}>Dev Tools</Text>
            <TouchableOpacity
              style={[styles.row, { borderTopColor: theme.borderCard }]}
              onPress={async () => {
                await AsyncStorage.removeItem('pj_achievements');
                Alert.alert('Done', 'Achievements cleared.');
              }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.accentRed }]}>Reset Achievements</Text>
                <Text style={[styles.rowSub, { color: theme.textMuted }]}>Clears all unlocked achievements. Dev use only.</Text>
              </View>
              <Ionicons name="trophy-outline" size={18} color={theme.accentRed} />
            </TouchableOpacity>
            {(['small', 'medium', 'large'] as const).map(tier => (
              <TouchableOpacity
                key={tier}
                style={[styles.row, { borderTopColor: theme.borderCard }]}
                onPress={() => {
                  setDevCelebTier(tier);
                  setDevCelebLabel(tier === 'small' ? 'NICE WORK' : tier === 'medium' ? 'MILESTONE' : 'GOAL WEIGHT');
                  setDevCelebVisible(true);
                }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowTitle, { color: theme.textPrimary }]}>Fire {tier.charAt(0).toUpperCase() + tier.slice(1)} Celebration</Text>
                  <Text style={[styles.rowSub, { color: theme.textMuted }]}>{tier === 'small' ? 'Steps / water goal' : tier === 'medium' ? '5lb milestone' : 'Goal weight hit'}</Text>
                </View>
                <Ionicons name="sparkles-outline" size={18} color={theme.accentBlue} />
              </TouchableOpacity>
            ))}
          </View>
        )}

      </ScrollView>

      <CelebrationOverlay
        visible={devCelebVisible}
        tier={devCelebTier}
        accentColor={theme.accentBlueRaw}
        label={devCelebLabel}
        onDismiss={() => setDevCelebVisible(false)}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  header:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 0.5, marginBottom: 0 },
  headerLabel:  { fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2, fontFamily: 'DMSans_700Bold' },
  headerTitle:  { fontSize: 32, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2 },
  content:      { padding: 16, paddingBottom: 80 },
  section:      { borderWidth: 0.5, borderTopWidth: 0.5, borderRadius: 14, marginBottom: 12, overflow: 'hidden' },
  sectionLabel: { fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'DMSans_700Bold', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  row:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 0.5 },
  rowTitle:     { fontSize: 14, fontFamily: 'DMSans_500Medium', marginBottom: 2 },
  rowSub:       { fontSize: 11, fontFamily: 'DMSans_400Regular' },
});