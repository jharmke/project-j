import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ACCENT_PALETTES, THEME_ORDER, ThemeId, THEMES, useTheme } from '../theme';
import { useHealthKit } from '../useHealthKit';
import { BLANK_DAY, WorkoutTag } from '../workoutData';
import CelebrationOverlay from '../components/CelebrationOverlay';
import { showAchievementToast } from '../components/AchievementToast';
import { ACHIEVEMENTS } from '../achievementData';
import { TOOLTIP_REGISTRY } from '../tooltipRegistry';
import { useTooltip } from '../useTooltip';
import TooltipModal from '../components/TooltipModal';
import ToggleSwitch from '../components/ToggleSwitch';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { theme, themeId, accentId, setTheme, setAccent } = useTheme();
  // showAchievementToast is now a direct import
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [devCelebVisible,  setDevCelebVisible]  = useState(false);
  const [devCelebTier,     setDevCelebTier]     = useState<'small'|'medium'|'large'>('small');
  const [devCelebLabel,    setDevCelebLabel]    = useState<string|undefined>(undefined);
  const [devTapCount,      setDevTapCount]      = useState(0);
  const [devUnlocked,      setDevUnlocked]      = useState(false);
  const [importRange, setImportRange] = useState<14 | 30 | 90>(30);
  const [importing, setImporting] = useState(false);
  const [helpExpanded, setHelpExpanded] = useState(false);
  const [activeTooltipKey, setActiveTooltipKey] = useState<string | null>(null);
  const helpHeight = useRef(new Animated.Value(0)).current;
  const helpOpacity = useRef(new Animated.Value(0)).current;
  const helpContentHeight = useRef(0);
  const [helpMeasured, setHelpMeasured] = useState(false);
  const scrollViewRef = useRef<any>(null);
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
            <Text style={[styles.headerTitle, { color: theme.accentBlue }]}>Settings</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView ref={scrollViewRef} contentContainerStyle={styles.content}>

        {/* ── Theme Selector ── */}
        <View style={[styles.section, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: theme.borderCardTop }]}>
          <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>Appearance</Text>
          <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 10 }}>
            {THEME_ORDER.map((id: ThemeId) => {
              const t = THEMES[id];
              const isActive = themeId === id;
              const previewBg: Record<string, string> = {
                dark: '#1a1a24',
                light: '#ffffff',
                slate: '#d8dde4',
                warm: '#6b5a48',
                blush: '#f5e8ec',
              };
              const previewText:   Record<string, string> = { dark: '#e8e8f0', light: '#1a1a2e', slate: '#1c2533', warm: '#f0e8d8', blush: '#3a1a24' };
              const previewAccent: Record<string, string> = { dark: '#3b82f6', light: '#2563eb', slate: '#4a7fa5', warm: '#f0a040', blush: '#d4607a' };
              const previewAmber:  Record<string, string> = { dark: '#d4860a', light: '#b45309', slate: '#a07820', warm: '#f0a040', blush: '#c07840' };
              return (
                <TouchableOpacity
                  key={id}
                  onPress={() => setTheme(id)}
                  activeOpacity={t.paid ? 1 : 0.7}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: previewBg[id] ?? t.bgCard,
                    borderWidth: isActive ? 1.5 : 1,
                    borderColor: isActive ? previewAccent[id] : 'transparent',
                    borderRadius: 10,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    opacity: 1,
                  }}>
                  <Text style={{ flex: 1, fontSize: 14, color: previewText[id], fontFamily: 'DMSans_600SemiBold' }}>
                    {t.name}
                  </Text>
                  {t.paid && (
                    <View style={{ backgroundColor: `${previewAmber[id]}33`, borderWidth: 1, borderColor: `${previewAmber[id]}66`, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, marginRight: 8 }}>
                      <Text style={{ fontSize: 9, color: previewAmber[id], fontFamily: 'DMSans_700Bold', letterSpacing: 1 }}>PRO</Text>
                    </View>
                  )}
                  {isActive && (
                    <Ionicons name="checkmark-circle" size={18} color={previewAccent[id]} />
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
            <ToggleSwitch value={hapticsEnabled} onValueChange={toggleHaptics} />
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
            <TouchableOpacity
              style={[styles.row, { borderTopColor: theme.borderCard }]}
              onPress={() => {
                Alert.alert(
                  'Clear Food History',
                  'This will remove all logged food entries from the last 90 days. Water, steps, sleep, and weight data will not be affected.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Clear', style: 'destructive', onPress: async () => {
                      const keys = await AsyncStorage.getAllKeys();
                      const dayKeys = keys.filter(k => k.match(/^pj_\d{4}-\d{2}-\d{2}$/));
                      for (const key of dayKeys) {
                        const saved = await AsyncStorage.getItem(key);
                        if (saved) {
                          const data = JSON.parse(saved);
                          await AsyncStorage.setItem(key, JSON.stringify({ ...data, entries: [] }));
                        }
                      }
                      Alert.alert('Done', 'Food history cleared.');
                    }},
                  ]
                );
              }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.accentRed }]}>Clear Food History</Text>
                <Text style={[styles.rowSub, { color: theme.textMuted }]}>Wipes logged food entries only. Water, steps, sleep, weight untouched. Dev use only.</Text>
              </View>
              <Ionicons name="fast-food-outline" size={18} color={theme.accentRed} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.row, { borderTopColor: theme.borderCard }]}
              onPress={async () => {
                const keys = await AsyncStorage.getAllKeys();
                const tooltipKeys = keys.filter(k => k.startsWith('pj_tooltip_'));
                await AsyncStorage.multiRemove(tooltipKeys);
                Alert.alert('Done', 'Tooltip seen states cleared. Restart the app to see pulses.');
              }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.accentRed }]}>Reset Tooltip States</Text>
                <Text style={[styles.rowSub, { color: theme.textMuted }]}>Re-enables pulse animation on all (i) icons. Dev use only.</Text>
              </View>
              <Ionicons name="information-circle-outline" size={18} color={theme.accentRed} />
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
            <TouchableOpacity
              style={[styles.row, { borderTopColor: theme.borderCard }]}
              onPress={() => {
                console.log('button pressed');
                const testDef = ACHIEVEMENTS.find(a => a.id === 'weight_goal');
                console.log('testDef', testDef?.name);
                if (testDef) showAchievementToast(testDef);
              }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.textPrimary }]}>Fire Achievement Toast</Text>
                <Text style={[styles.rowSub, { color: theme.textMuted }]}>Tests the slide-in achievement notification.</Text>
              </View>
              <Ionicons name="trophy-outline" size={18} color={theme.accentBlue} />
            </TouchableOpacity>
          </View>
        )}

      {/* ── Help ── */}
        <View style={[styles.section, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: theme.borderCardTop }]}>
          <TouchableOpacity
            onPress={() => {
              if (!helpMeasured) return;
              const opening = !helpExpanded;
              setHelpExpanded(opening);
              Animated.parallel([
                Animated.timing(helpHeight,  { toValue: opening ? helpContentHeight.current : 0, duration: 260, useNativeDriver: false }),
                Animated.timing(helpOpacity, { toValue: opening ? 1 : 0, duration: 200, useNativeDriver: false }),
              ]).start(() => {
                if (opening) {
                  setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 50);
                }
              });
            }}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14 }}
            activeOpacity={0.7}
          >
            <Text style={[styles.sectionLabel, { color: theme.textMuted, paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0 }]}>Help</Text>
            <Ionicons name={helpExpanded ? 'chevron-up' : 'chevron-down'} size={14} color={theme.textMuted} />
          </TouchableOpacity>

          {/* Off-screen measure -- renders once at full size, invisible, just to get height */}
          {!helpMeasured && (
            <View
              style={{ position: 'absolute', top: 10000, left: 0, right: 0, opacity: 0 }}
              onLayout={e => {
                const h = e.nativeEvent.layout.height;
                if (h > 0) {
                  helpContentHeight.current = h;
                  setHelpMeasured(true);
                }
              }}
            >
              <View style={{ paddingBottom: 8 }}>
                <Text style={{ fontSize: 9, letterSpacing: 3, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase', color: theme.textMuted, paddingHorizontal: 16, paddingBottom: 8 }}>
                  Definitions
                </Text>
                {TOOLTIP_REGISTRY.map((def) => (
                  <View key={def.key} style={[styles.row, { borderTopColor: theme.borderCard, justifyContent: 'space-between' }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.rowTitle, { color: theme.textPrimary }]}>{def.title}</Text>
                    </View>
                    <View style={{ borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 }}>
                      <Text style={{ fontSize: 12, fontFamily: 'DMSans_600SemiBold' }}>Show Again</Text>
                    </View>
                  </View>
                ))}
                <Text style={{ fontSize: 9, letterSpacing: 3, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase', color: theme.textMuted, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
                  Tips {'&'} Guides
                </Text>
                <View style={[styles.row, { borderTopColor: theme.borderCard }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowTitle, { color: theme.textPrimary }]}>Coming Soon</Text>
                    <Text style={[styles.rowSub, { color: theme.textMuted }]}>Guides and tips will appear here.</Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Animated container */}
          <Animated.View style={{ height: helpHeight, opacity: helpOpacity, overflow: 'hidden' }}>
            <View style={{ paddingBottom: 8 }}>
              {/* Definitions */}
              <Text style={{ fontSize: 9, letterSpacing: 3, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase', color: theme.textMuted, paddingHorizontal: 16, paddingBottom: 8 }}>
                Definitions
              </Text>
              {TOOLTIP_REGISTRY.map((def) => (
                <View
                  key={def.key}
                  style={[styles.row, { borderTopColor: theme.borderCard, justifyContent: 'space-between' }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowTitle, { color: theme.textPrimary }]}>{def.title}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setActiveTooltipKey(def.key)}
                    style={{ backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 }}
                  >
                    <Text style={{ color: theme.accentBlue, fontSize: 12, fontFamily: 'DMSans_600SemiBold' }}>Show Again</Text>
                  </TouchableOpacity>
                </View>
              ))}

              {/* Tips & Guides */}
              <Text style={{ fontSize: 9, letterSpacing: 3, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase', color: theme.textMuted, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
                Tips {'&'} Guides
              </Text>
              <View style={[styles.row, { borderTopColor: theme.borderCard }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowTitle, { color: theme.textPrimary }]}>Coming Soon</Text>
                  <Text style={[styles.rowSub, { color: theme.textMuted }]}>Guides and tips will appear here.</Text>
                </View>
              </View>
            </View>
          </Animated.View>
        </View>

      </ScrollView>

      {activeTooltipKey && (
        <TooltipModal
          tooltipKey={activeTooltipKey}
          visible={!!activeTooltipKey}
          onClose={() => setActiveTooltipKey(null)}
        />
      )}

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
  section:      { borderWidth: 0.5, borderTopWidth: 0.5, borderRadius: 14, marginBottom: 12, overflow: 'hidden', shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 12, elevation: 6 },
  sectionLabel: { fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'DMSans_700Bold', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  row:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 0.5 },
  rowTitle:     { fontSize: 14, fontFamily: 'DMSans_500Medium', marginBottom: 2 },
  rowSub:       { fontSize: 11, fontFamily: 'DMSans_400Regular' },
});