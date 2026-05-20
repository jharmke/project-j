import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Dimensions, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ACCENT_PALETTES, THEME_ORDER, ThemeId, THEMES, useTheme } from '../theme';
import { useHealthKit } from '../useHealthKit';
import { useAuth } from '../AuthContext';
import { BLANK_DAY, WorkoutTag } from '../workoutData';
import CelebrationOverlay from '../components/CelebrationOverlay';
import { showAchievementToast } from '../components/AchievementToast';
import { ACHIEVEMENTS } from '../achievementData';
import { collection, getDocs } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app, auth, db } from '../firebaseConfig';
import { uploadAllLocal } from '../services/syncService';
import { storageSet } from '../utils/storage';
import { TOOLTIP_REGISTRY } from '../tooltipRegistry';
import TooltipModal from '../components/TooltipModal';
import TooltipIcon from '../components/TooltipIcon';
import ToggleSwitch from '../components/ToggleSwitch';

type FaithJourney = 'rooted' | 'exploring' | 'notrightnow';

function CollapsibleSection({
  label,
  subtitle,
  defaultOpen = false,
  children,
  theme,
}: {
  label: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  theme: any;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [visible, setVisible] = useState(defaultOpen);
  const fadeAnim = useRef(new Animated.Value(defaultOpen ? 1 : 0)).current;

  const toggle = () => {
    const opening = !open;
    setOpen(opening);
    if (opening) {
      setVisible(true);
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    } else {
      Animated.timing(fadeAnim, { toValue: 0, duration: 100, useNativeDriver: true }).start(() => setVisible(false));
    }
  };

  return (
    <View style={[styles.section, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: theme.borderCardTop }]}>
      <TouchableOpacity
        onPress={toggle}
        activeOpacity={0.7}
        style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14, minHeight: 44 }}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>{label}</Text>
          {subtitle && !open && (
            <Text style={{ fontSize: 11, fontFamily: 'DMSans_400Regular', color: theme.textMuted, marginTop: 3 }}>
              {subtitle}
            </Text>
          )}
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={theme.textMuted} />
      </TouchableOpacity>
      <Animated.View style={{ opacity: fadeAnim }}>
        {visible && children}
      </Animated.View>
    </View>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { theme, themeId, accentId, setTheme, setAccent } = useTheme();
  const { user, signOut } = useAuth();
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [styleMode, setStyleMode] = useState<'discipline' | 'balanced' | 'mindful'>('balanced');
  const [faithJourney, setFaithJourney] = useState<FaithJourney>('rooted');
  const [burnAccuracyPct, setBurnAccuracyPct] = useState(100);
  const [devCelebVisible, setDevCelebVisible] = useState(false);
  const [devCelebTier, setDevCelebTier] = useState<'small' | 'medium' | 'large'>('small');
  const [devCelebLabel, setDevCelebLabel] = useState<string | undefined>(undefined);
  const [devTapCount, setDevTapCount] = useState(0);
  const [devUnlocked, setDevUnlocked] = useState(false);
  const [importRange, setImportRange] = useState<14 | 30 | 90>(30);
  const [importing, setImporting] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [activeTooltipKey, setActiveTooltipKey] = useState<string | null>(null);
  const scrollViewRef = useRef<any>(null);
  const { fetchHistoricalWorkouts, authorized } = useHealthKit();

  const fixDefaultTags = async () => {
    try {
      const s = await AsyncStorage.getItem('pj_settings');
      const current = s ? JSON.parse(s) : {};
      let tags: WorkoutTag[] = current.workoutTags || [];
      tags = tags.map(t => t.id === 'tag_push' ? { ...t, label: 'Push', locked: true, color: '#3b82f6' } : t);
      tags = tags.map(t => t.id === 'tag_pull' ? { ...t, label: 'Pull', locked: true, color: '#10b981' } : t);
      tags = tags.map(t => t.id === 'tag_legs' ? { ...t, label: 'Legs', locked: true, color: '#f59e0b' } : t);
      if (!tags.find(t => t.id === 'tag_core')) {
        const legsIdx = tags.findIndex(t => t.id === 'tag_legs');
        const coreTag: WorkoutTag = { id: 'tag_core', label: 'Core', color: '#eab308', locked: true };
        if (legsIdx !== -1) { tags.splice(legsIdx + 1, 0, coreTag); } else { tags.unshift(coreTag); }
      }
      tags = tags.map(t => t.id === 'tag_cardio' ? { ...t, label: 'Cardio', locked: true, color: '#f97316' } : t);
      tags = tags.map(t => t.id === 'tag_rest' ? { ...t, label: 'Rest', locked: true, color: '#64748b' } : t);
      await storageSet('pj_settings', JSON.stringify({ ...current, workoutTags: tags }));
      Alert.alert('Done', 'Default tags fixed. Restart the app to see changes.');
    } catch (e) {
      Alert.alert('Error', 'Something went wrong.');
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
      const saved = await AsyncStorage.getItem('pj_workout_state');
      const current = saved ? JSON.parse(saved) : {};
      const programs = current.programs || {};
      let added = 0;
      for (const { dateKey, exercise } of results) {
        const existing = programs[dateKey] || { ...BLANK_DAY, type: 'cardio' as const, focus: 'Cardio' };
        const existingUUIDs = new Set((existing.exercises || []).map((e: any) => e.appleHealthUUID).filter(Boolean));
        if (existingUUIDs.has(exercise.appleHealthUUID)) continue;
        programs[dateKey] = { ...existing, exercises: [...(existing.exercises || []), exercise] };
        added++;
      }
      await storageSet('pj_workout_state', JSON.stringify({ ...current, programs }));
      Alert.alert('Import Complete', `Added ${added} workout${added !== 1 ? 's' : ''} from the last ${importRange} days.`);
    } catch (e) {
      Alert.alert('Import Failed', 'Something went wrong. Please try again.');
    }
    setImporting(false);
  };

  const confirmDeleteAccount = async () => {
    if (!auth.currentUser) return;
    setDeletingAccount(true);
    try {
      const fns = getFunctions(app);
      const deleteAccountFn = httpsCallable(fns, 'deleteAccount');
      await deleteAccountFn({});
      try {
        const allKeys = await AsyncStorage.getAllKeys();
        const pjKeys = allKeys.filter(k => k.startsWith('pj_'));
        if (pjKeys.length > 0) await AsyncStorage.multiRemove(pjKeys);
      } catch { /* non-fatal */ }
    } catch (e: any) {
      setDeletingAccount(false);
      Alert.alert('Error', 'Something went wrong deleting your account. Please try again.');
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all your data -- food logs, workout history, weight logs, journal entries, achievements, and everything else.\n\nThis cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'I Understand, Continue',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are You Absolutely Sure?',
              'Your account and all data will be deleted forever. There is no way to recover it.',
              [
                { text: 'Go Back', style: 'cancel' },
                { text: 'Delete My Account', style: 'destructive', onPress: confirmDeleteAccount },
              ]
            );
          },
        },
      ]
    );
  };

  useEffect(() => {
    const load = async () => {
      try {
        const saved = await AsyncStorage.getItem('pj_settings');
        if (saved) {
          const data = JSON.parse(saved);
          if (data.hapticsEnabled !== undefined) setHapticsEnabled(data.hapticsEnabled);
          if (data.styleMode) setStyleMode(data.styleMode);
          if (data.faithJourney) setFaithJourney(data.faithJourney);
          if (data.burnAccuracyPct !== undefined) setBurnAccuracyPct(data.burnAccuracyPct);
        }
      } catch (e) {}
    };
    load();
  }, []);

  const saveSetting = async (key: string, value: any) => {
    try {
      const saved = await AsyncStorage.getItem('pj_settings');
      const current = saved ? JSON.parse(saved) : {};
      await storageSet('pj_settings', JSON.stringify({ ...current, [key]: value }));
    } catch (e) {}
  };

  const toggleHaptics = (val: boolean) => {
    setHapticsEnabled(val);
    saveSetting('hapticsEnabled', val);
  };

  const appVersion = Constants.expoConfig?.version ?? '1.0';

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

        {/* ── Appearance ── */}
        <CollapsibleSection label="Appearance" subtitle="Theme · Accent · Haptics" defaultOpen={true} theme={theme}>
          <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 10 }}>
            {THEME_ORDER.map((id: ThemeId) => {
              const t = THEMES[id];
              const isActive = themeId === id;
              const previewBg: Record<string, string> = { dark: '#1a1a24', light: '#ffffff', slate: '#d8dde4', warm: '#6b5a48', blush: '#f5e8ec' };
              const previewText: Record<string, string> = { dark: '#e8e8f0', light: '#1a1a2e', slate: '#1c2533', warm: '#f0e8d8', blush: '#3a1a24' };
              const previewAccent: Record<string, string> = { dark: '#3b82f6', light: '#2563eb', slate: '#4a7fa5', warm: '#f0a040', blush: '#d4607a' };
              return (
                <TouchableOpacity
                  key={id}
                  onPress={() => setTheme(id)}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: 'row', alignItems: 'center',
                    backgroundColor: previewBg[id] ?? t.bgCard,
                    borderWidth: isActive ? 1.5 : 1,
                    borderColor: isActive ? previewAccent[id] : 'transparent',
                    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
                  }}>
                  <Text style={{ flex: 1, fontSize: 14, color: previewText[id], fontFamily: 'DMSans_600SemiBold' }}>
                    {t.name}
                  </Text>
                  {isActive && <Ionicons name="checkmark-circle" size={18} color={previewAccent[id]} />}
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
            <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: 'DMSans_700Bold', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 10 }}>Accent Color</Text>
            {(() => {
              const accents = ACCENT_PALETTES[themeId];
              const COLS = 6;
              const itemW = Math.floor((Dimensions.get('window').width - 32) / COLS);
              const spacers = COLS - (accents.length % COLS || COLS);
              return (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {accents.map((accent) => {
                    const isActiveAccent = accentId === accent.id;
                    return (
                      <TouchableOpacity key={accent.id} onPress={() => setAccent(accent.id)} style={{ width: itemW, alignItems: 'center', gap: 4, marginBottom: 10 }}>
                        <View style={{
                          width: 36, height: 36, borderRadius: 18,
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
                  {Array(spacers).fill(null).map((_, i) => <View key={`sp${i}`} style={{ width: itemW }} />)}
                </View>
              );
            })()}
          </View>

          <View style={{ height: 1, backgroundColor: theme.borderCard, marginHorizontal: 16, marginBottom: 4 }} />
          <View style={[styles.row, { borderTopColor: 'transparent' }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: theme.textPrimary }]}>Haptic Feedback</Text>
              <Text style={[styles.rowSub, { color: theme.textMuted }]}>Vibration on button press</Text>
            </View>
            <ToggleSwitch value={hapticsEnabled} onValueChange={toggleHaptics} />
          </View>
          <View style={{ paddingBottom: 4 }} />
        </CollapsibleSection>

        {/* ── Faith & Style ── */}
        <CollapsibleSection label="Faith & Style" subtitle="Coaching Mode · Faith Journey" defaultOpen={false} theme={theme}>
          <Text style={{ fontSize: 11, fontFamily: 'DMSans_700Bold', color: theme.accentBlue, letterSpacing: 2, textTransform: 'uppercase', paddingHorizontal: 16, paddingBottom: 8 }}>Coaching Mode</Text>
          {([
            { key: 'discipline', label: 'Discipline', sub: 'Tight targets. Direct feedback. Commit fully.' },
            { key: 'balanced',   label: 'Balanced',   sub: 'Encouraging. Forgiving. Steady progress.' },
            { key: 'mindful',    label: 'Mindful',    sub: 'Observational. No judgment. Show up.' },
          ] as const).map(({ key, label, sub }) => {
            const isActive = styleMode === key;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.row, { borderTopColor: theme.borderCard }]}
                onPress={() => {
                  if (isActive) return;
                  if (key === 'discipline') {
                    Alert.alert(
                      'Switch to Discipline',
                      'This mode is for people who mean it. Tight calorie targets, direct feedback, and full accountability. Ready to commit?',
                      [
                        { text: 'Not yet', style: 'cancel' },
                        { text: "I'm in", onPress: async () => { setStyleMode('discipline'); await saveSetting('styleMode', 'discipline'); } },
                      ]
                    );
                  } else {
                    const descriptions: Record<string, string> = {
                      balanced: 'Encouraging and forgiving. Wide calorie targets, positive language, steady progress.',
                      mindful: 'No judgment, no color coding. Celebrate showing up. Numbers are just information.',
                    };
                    Alert.alert(
                      `Switch to ${label}`,
                      descriptions[key],
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Switch', onPress: async () => { setStyleMode(key); await saveSetting('styleMode', key); } },
                      ]
                    );
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowTitle, { color: isActive ? theme.accentBlue : theme.textPrimary }]}>{label}</Text>
                  <Text style={[styles.rowSub, { color: theme.textMuted }]}>{sub}</Text>
                </View>
                {isActive && <Ionicons name="checkmark-circle" size={20} color={theme.accentBlue} />}
              </TouchableOpacity>
            );
          })}

          <View style={{ height: 1, backgroundColor: theme.borderCard, marginHorizontal: 16, marginTop: 8, marginBottom: 12 }} />
          <Text style={{ fontSize: 11, fontFamily: 'DMSans_700Bold', color: theme.accentBlue, letterSpacing: 2, textTransform: 'uppercase', paddingHorizontal: 16, paddingBottom: 8 }}>Faith Journey</Text>
          {([
            { key: 'rooted',      label: 'Rooted',        sub: 'Full faith experience. Daily verse, prayer, Bible reader.' },
            { key: 'exploring',   label: 'Exploring',     sub: 'Faith features present but gentle.' },
            { key: 'notrightnow', label: 'Not Right Now', sub: 'Pure fitness experience. No faith content.' },
          ] as const).map(({ key, label, sub }) => {
            const isActive = faithJourney === key;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.row, { borderTopColor: theme.borderCard }]}
                onPress={async () => {
                  if (isActive) return;
                  setFaithJourney(key);
                  await saveSetting('faithJourney', key);
                }}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowTitle, { color: isActive ? theme.accentBlue : theme.textPrimary }]}>{label}</Text>
                  <Text style={[styles.rowSub, { color: theme.textMuted }]}>{sub}</Text>
                </View>
                {isActive && <Ionicons name="checkmark-circle" size={20} color={theme.accentBlue} />}
              </TouchableOpacity>
            );
          })}
          <View style={{ paddingBottom: 8 }} />
        </CollapsibleSection>

        {/* ── Health ── */}
        <CollapsibleSection label="Health" subtitle="Burn Accuracy · Apple Health" defaultOpen={false} theme={theme}>
          <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 13, fontFamily: 'DMSans_600SemiBold', color: theme.textPrimary, flex: 1 }}>Active Calorie Accuracy</Text>
              <TooltipIcon tooltipKey="burn_accuracy" />
            </View>
            <Text style={{ fontSize: 12, fontFamily: 'DMSans_400Regular', color: theme.textMuted, lineHeight: 18 }}>
              Apple Watch often overestimates burn. Apply a correction factor to keep your net calories honest.
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {([100, 90, 80, 70] as const).map(pct => (
                <TouchableOpacity
                  key={pct}
                  onPress={async () => { setBurnAccuracyPct(pct); await saveSetting('burnAccuracyPct', pct); }}
                  style={{
                    flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', borderWidth: 1,
                    borderColor: burnAccuracyPct === pct ? theme.accentBlueBorder : theme.borderInput,
                    backgroundColor: burnAccuracyPct === pct ? theme.accentBlueBg : theme.bgInput,
                  }}>
                  <Text style={{ fontSize: 13, fontFamily: 'DMSans_700Bold', color: burnAccuracyPct === pct ? theme.accentBlue : theme.textMuted }}>
                    {pct}%
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {burnAccuracyPct < 100 && (
              <Text style={{ fontSize: 11, fontFamily: 'DMSans_400Regular', color: theme.textMuted, lineHeight: 16 }}>
                e.g. Apple reports 400 kcal active → you use {Math.round(400 * burnAccuracyPct / 100)} kcal in your net
              </Text>
            )}
          </View>

          <View style={{ height: 1, backgroundColor: theme.borderCard, marginHorizontal: 16, marginBottom: 16 }} />
          <Text style={{ fontSize: 9, fontFamily: 'DMSans_700Bold', color: theme.textMuted, letterSpacing: 3, textTransform: 'uppercase', paddingHorizontal: 16, marginBottom: 12 }}>Workout History Import</Text>
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
        </CollapsibleSection>

        {/* ── Help ── */}
        <CollapsibleSection label="Help" subtitle="Definitions · Guides" defaultOpen={false} theme={theme}>
          <View style={{ paddingBottom: 8 }}>
            <Text style={{ fontSize: 9, letterSpacing: 3, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase', color: theme.textMuted, paddingHorizontal: 16, paddingBottom: 8 }}>
              Definitions
            </Text>
            {TOOLTIP_REGISTRY.map((def) => (
              <View key={def.key} style={[styles.row, { borderTopColor: theme.borderCard, justifyContent: 'space-between' }]}>
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
            <Text style={{ fontSize: 9, letterSpacing: 3, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase', color: theme.textMuted, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
              Tips {'&'} Guides
            </Text>
            <TouchableOpacity style={[styles.row, { borderTopColor: theme.borderCard }]} onPress={() => router.push('/mission')} activeOpacity={0.7}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.textPrimary }]}>Our Mission</Text>
                <Text style={[styles.rowSub, { color: theme.textMuted }]}>What makes this app different</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
            </TouchableOpacity>
          </View>
        </CollapsibleSection>

        {/* ── About ── */}
        <CollapsibleSection label="About" subtitle="Version · Privacy · Legal" defaultOpen={false} theme={theme}>
          <View style={[styles.row, { borderTopColor: theme.borderCard }]}>
            <Text style={[styles.rowTitle, { color: theme.textPrimary, flex: 1 }]}>Version</Text>
            <Text style={[styles.rowSub, { color: theme.textMuted }]}>{appVersion}</Text>
          </View>
          <TouchableOpacity style={[styles.row, { borderTopColor: theme.borderCard }]} onPress={() => Linking.openURL('https://projectj-5d024.web.app/privacy')} activeOpacity={0.7}>
            <Text style={[styles.rowTitle, { color: theme.textPrimary, flex: 1 }]}>Privacy Policy</Text>
            <Ionicons name="open-outline" size={14} color={theme.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.row, { borderTopColor: theme.borderCard }]} onPress={() => Linking.openURL('https://projectj-5d024.web.app/terms')} activeOpacity={0.7}>
            <Text style={[styles.rowTitle, { color: theme.textPrimary, flex: 1 }]}>Terms of Service</Text>
            <Ionicons name="open-outline" size={14} color={theme.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.row, { borderTopColor: theme.borderCard }]} onPress={() => Linking.openURL('https://www.fatsecret.com')} activeOpacity={0.7}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: theme.textPrimary }]}>Food Data</Text>
              <Text style={[styles.rowSub, { color: theme.textMuted }]}>Powered by FatSecret</Text>
            </View>
            <Ionicons name="open-outline" size={14} color={theme.textMuted} />
          </TouchableOpacity>
          <View style={{ paddingBottom: 8 }} />
        </CollapsibleSection>

        {/* ── Account ── */}
        <CollapsibleSection label="Account" defaultOpen={false} theme={theme}>
          {user?.email ? (
            <View style={[styles.row, { borderTopColor: theme.borderCard }]}>
              <Ionicons name="person-circle-outline" size={18} color={theme.textMuted} style={{ marginRight: 10 }} />
              <Text style={[styles.rowTitle, { color: theme.textSecondary, flex: 1 }]} numberOfLines={1}>{user.email}</Text>
            </View>
          ) : null}
          <View style={[styles.row, { borderTopColor: theme.borderCard }]}>
            <TouchableOpacity
              onPress={() => Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign Out', style: 'destructive', onPress: signOut },
              ])}
              style={{ flex: 1 }}
            >
              <Text style={[styles.rowTitle, { color: theme.statusBad }]}>Sign Out</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.row, { borderTopColor: theme.borderCard }]}>
            <TouchableOpacity onPress={handleDeleteAccount} style={{ flex: 1 }} disabled={deletingAccount}>
              {deletingAccount ? (
                <ActivityIndicator size="small" color={theme.statusBad} />
              ) : (
                <>
                  <Text style={[styles.rowTitle, { color: theme.statusBad }]}>Delete Account</Text>
                  <Text style={[styles.rowSub, { color: theme.textMuted }]}>Permanently deletes your account and all data.</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
          <View style={{ paddingBottom: 8 }} />
        </CollapsibleSection>

        {/* ── Dev Tools (7-tap hidden, all items consolidated) ── */}
        {devUnlocked && (
          <View style={[styles.section, { borderColor: theme.borderCard, borderTopColor: theme.borderCardTop, backgroundColor: theme.bgCard }]}>
            <Text style={[styles.sectionLabel, { color: theme.accentRed, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 }]}>Dev Tools</Text>

            <TouchableOpacity style={[styles.row, { borderTopColor: theme.borderCard }]} onPress={() => {
              Alert.alert('Reset Onboarding', 'This will send you back to the welcome screen on next app launch.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Reset', style: 'destructive', onPress: async () => { await AsyncStorage.removeItem('pj_onboarding_complete'); Alert.alert('Done', 'Onboarding reset. Restart the app.'); } },
              ]);
            }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.accentBlue }]}>Reset Onboarding</Text>
                <Text style={[styles.rowSub, { color: theme.textMuted }]}>Returns to welcome screen on next launch.</Text>
              </View>
              <Ionicons name="refresh-outline" size={18} color={theme.accentBlue} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.row, { borderTopColor: theme.borderCard }]} onPress={fixDefaultTags}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.accentAmber }]}>Fix Default Tags</Text>
                <Text style={[styles.rowSub, { color: theme.textMuted }]}>Resets default tag names/colors.</Text>
              </View>
              <Ionicons name="construct-outline" size={18} color={theme.accentAmber} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.row, { borderTopColor: theme.borderCard }]} onPress={() => {
              Alert.alert('Reset Workout State', 'This will clear all workout data including exercises, notes, cardio logs, and weekly template. Your food, profile, and settings data will not be affected.\n\nThis cannot be undone.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Reset', style: 'destructive', onPress: async () => { await AsyncStorage.removeItem('pj_workout_state'); Alert.alert('Done', 'Workout state cleared. Restart the app.'); } },
              ]);
            }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.accentRed }]}>Reset Workout State</Text>
                <Text style={[styles.rowSub, { color: theme.textMuted }]}>Clears exercises, notes, logs, template.</Text>
              </View>
              <Ionicons name="trash-outline" size={18} color={theme.accentRed} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.row, { borderTopColor: theme.borderCard }]} onPress={() => {
              Alert.alert('Reset Achievements', 'Clear all unlocked achievements? This cannot be undone.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Reset', style: 'destructive', onPress: async () => { await AsyncStorage.removeItem('pj_achievements'); Alert.alert('Done', 'Achievements cleared.'); } },
              ]);
            }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.accentRed }]}>Reset Achievements</Text>
                <Text style={[styles.rowSub, { color: theme.textMuted }]}>Clears all unlocked achievements.</Text>
              </View>
              <Ionicons name="trophy-outline" size={18} color={theme.accentRed} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.row, { borderTopColor: theme.borderCard }]} onPress={() => {
              Alert.alert('Clear Food History', 'This will remove all logged food entries from the last 90 days. Water, steps, sleep, and weight data will not be affected.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Clear', style: 'destructive', onPress: async () => {
                  const keys = await AsyncStorage.getAllKeys();
                  const dayKeys = keys.filter(k => k.match(/^pj_\d{4}-\d{2}-\d{2}$/));
                  for (const key of dayKeys) {
                    const s = await AsyncStorage.getItem(key);
                    if (s) { const data = JSON.parse(s); await storageSet(key, JSON.stringify({ ...data, entries: [] })); }
                  }
                  Alert.alert('Done', 'Food history cleared.');
                }},
              ]);
            }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.accentRed }]}>Clear Food History</Text>
                <Text style={[styles.rowSub, { color: theme.textMuted }]}>Wipes logged food entries only. Water, steps, sleep, weight untouched.</Text>
              </View>
              <Ionicons name="fast-food-outline" size={18} color={theme.accentRed} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.row, { borderTopColor: theme.borderCard }]} onPress={() => {
              Alert.alert('Reset Tooltip States', 'Re-enable all (i) pulse animations?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Reset', style: 'destructive', onPress: async () => {
                  const keys = await AsyncStorage.getAllKeys();
                  const tooltipKeys = keys.filter(k => k.startsWith('pj_tooltip_'));
                  await AsyncStorage.multiRemove(tooltipKeys);
                  Alert.alert('Done', 'Tooltip seen states cleared. Restart the app to see pulses.');
                }},
              ]);
            }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.accentRed }]}>Reset Tooltip States</Text>
                <Text style={[styles.rowSub, { color: theme.textMuted }]}>Re-enables pulse animation on all (i) icons.</Text>
              </View>
              <Ionicons name="information-circle-outline" size={18} color={theme.accentRed} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.row, { borderTopColor: theme.borderCard }]} onPress={() => {
              Alert.alert('Force Restore from Firestore', 'This wipes all local pj_* data and pulls everything from your cloud backup. Use only if your data is missing after signing in.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Restore', style: 'destructive', onPress: async () => {
                  const uid = auth.currentUser?.uid;
                  if (!uid) { Alert.alert('Not signed in'); return; }
                  try {
                    const allKeys = await AsyncStorage.getAllKeys();
                    const pjKeys = allKeys.filter(k => k.startsWith('pj_'));
                    if (pjKeys.length > 0) await AsyncStorage.multiRemove(pjKeys);
                    const snap = await getDocs(collection(db, 'users', uid, 'store'));
                    const pairs: [string, string][] = [];
                    snap.forEach(d => { const data = d.data(); if (data.key && data.value) pairs.push([data.key, data.value]); });
                    if (pairs.length > 0) await AsyncStorage.multiSet(pairs);
                    Alert.alert('Done', `Restored ${pairs.length} keys from Firestore. Restart the app.`);
                  } catch (e) { Alert.alert('Error', 'Restore failed: ' + e); }
                }},
              ]);
            }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.accentAmber }]}>Force Restore from Firestore</Text>
                <Text style={[styles.rowSub, { color: theme.textMuted }]}>Wipes local data and pulls everything from cloud.</Text>
              </View>
              <Ionicons name="cloud-download-outline" size={18} color={theme.accentAmber} />
            </TouchableOpacity>

            {(['small', 'medium', 'large'] as const).map(tier => (
              <TouchableOpacity key={tier} style={[styles.row, { borderTopColor: theme.borderCard }]} onPress={() => {
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

            <TouchableOpacity style={[styles.row, { borderTopColor: theme.borderCard }]} onPress={() => {
              const testDef = ACHIEVEMENTS.find(a => a.id === 'weight_goal');
              if (testDef) showAchievementToast(testDef);
            }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.textPrimary }]}>Fire Achievement Toast</Text>
                <Text style={[styles.rowSub, { color: theme.textMuted }]}>Tests the slide-in achievement notification.</Text>
              </View>
              <Ionicons name="trophy-outline" size={18} color={theme.accentBlue} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.row, { borderTopColor: theme.borderCard }]} onPress={() => {
              Alert.alert('Upload All Data to Firestore', 'This uploads all your local app data to the cloud right now. Safe to run any time -- it never deletes local data.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Upload', onPress: async () => { const count = await uploadAllLocal(); Alert.alert('Done', `${count} keys uploaded to Firestore.`); } },
              ]);
            }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.accentBlue }]}>Upload All Data to Firestore</Text>
                <Text style={[styles.rowSub, { color: theme.textMuted }]}>One-time upload of all local data to cloud.</Text>
              </View>
              <Ionicons name="cloud-upload-outline" size={18} color={theme.accentBlue} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.row, { borderTopColor: theme.borderCard }]} onPress={async () => {
              const uid = auth.currentUser?.uid;
              if (!uid) { Alert.alert('Not signed in'); return; }
              const allKeys = await AsyncStorage.getAllKeys();
              const localCount = allKeys.filter(k => k.startsWith('pj_') && !k.startsWith('pj_bible_')).length;
              const snap = await getDocs(collection(db, 'users', uid, 'store'));
              const fsCount = snap.size;
              const status = localCount === fsCount ? '✓ In sync' : '⚠ Mismatch';
              Alert.alert('Sync Check', `Local: ${localCount} keys\nFirestore: ${fsCount} docs\n\n${status}`);
            }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.accentBlue }]}>Check Sync Status</Text>
                <Text style={[styles.rowSub, { color: theme.textMuted }]}>Compares local key count to Firestore doc count.</Text>
              </View>
              <Ionicons name="checkmark-circle-outline" size={18} color={theme.accentBlue} />
            </TouchableOpacity>
          </View>
        )}

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
  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 0.5, marginBottom: 0 },
  headerLabel: { fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2, fontFamily: 'DMSans_700Bold' },
  headerTitle: { fontSize: 32, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2 },
  content:     { padding: 16, paddingBottom: 80 },
  section:     { borderWidth: 0.5, borderTopWidth: 0.5, borderRadius: 14, marginBottom: 12, overflow: 'hidden', shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 12, elevation: 6 },
  sectionLabel:{ fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'DMSans_700Bold' },
  row:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 0.5 },
  rowTitle:    { fontSize: 14, fontFamily: 'DMSans_500Medium', marginBottom: 2 },
  rowSub:      { fontSize: 11, fontFamily: 'DMSans_400Regular' },
});
