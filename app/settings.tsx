import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Dimensions, Easing, Keyboard, KeyboardAvoidingView, Linking, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
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
import { app, auth, db, saveToFirebase } from '../firebaseConfig';
import { uploadAllLocal } from '../services/syncService';
import { storageSet } from '../utils/storage';
import { TOOLTIP_REGISTRY } from '../tooltipRegistry';
import TooltipModal from '../components/TooltipModal';
import TooltipIcon from '../components/TooltipIcon';
import ToggleSwitch from '../components/ToggleSwitch';
import PrayerRequestModal from '../components/PrayerRequestModal';
import { useToast } from '../components/Toast';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  NotificationSettings,
  DEFAULT_NOTIFICATION_SETTINGS,
  loadNotificationSettings,
  saveNotificationSettings,
  formatNotifTime,
  getAverageBedtime,
  parseTime,
  getPermissionStatus,
  requestNotificationPermission,
} from '../services/notifications';

type FaithJourney = 'rooted' | 'exploring' | 'notrightnow';

// ── Goal calculation constants (mirrors profile.tsx) ──────────────────────────
const GOAL_DEFICITS: Record<string, number> = {
  lose_2: -1000, lose_1_5: -750, lose_1: -500, lose_0_5: -250, maintain: 0, gain_0_5: 250, gain_1: 500,
};
const LIFESTYLE_OPTIONS = [
  { key: 'sedentary',   multiplier: 1.2  },
  { key: 'light',       multiplier: 1.3  },
  { key: 'active',      multiplier: 1.45 },
  { key: 'very_active', multiplier: 1.6  },
];
const TRAINING_OPTIONS = [
  { key: 'none',  dailyBonus: 0   },
  { key: '1x',    dailyBonus: 100 },
  { key: '3x',    dailyBonus: 200 },
  { key: '5x',    dailyBonus: 300 },
  { key: 'daily', dailyBonus: 400 },
];
const HOUR_OPTIONS   = ['5', '6', '7', '8', '9', '10'];
const MINUTE_OPTIONS = ['00', '15', '30', '45'];
const ITEM_HEIGHT    = 44;

interface GoalProfile {
  calTarget: string;
  useRecommendedCal: boolean;
  macroMode: 'ratio' | 'fixed';
  macroProteinPct: string;
  macroCarbsPct: string;
  macroFatPct: string;
  macroProteinG: string;
  macroCarbsG: string;
  macroFatG: string;
  sleepGoal: string;
  stepGoal: string;
  waterGoal: string;
  activeCalGoal: string;
  exerciseMinsGoal: string;
  // Calc-only fields loaded from profile but not editable here
  heightFt: string;
  heightIn: string;
  birthday: string;
  sex: 'male' | 'female';
  lifestyleActivity: string;
  trainingFrequency: string;
  weightGoal: string;
}

const DEFAULT_GOAL_PROFILE: GoalProfile = {
  calTarget: '', useRecommendedCal: true,
  macroMode: 'ratio', macroProteinPct: '35', macroCarbsPct: '40', macroFatPct: '25',
  macroProteinG: '', macroCarbsG: '', macroFatG: '',
  sleepGoal: '7', stepGoal: '10000', waterGoal: '128', activeCalGoal: '500', exerciseMinsGoal: '30',
  heightFt: '', heightIn: '', birthday: '', sex: 'male',
  lifestyleActivity: 'sedentary', trainingFrequency: 'none', weightGoal: 'lose_1',
};

function SleepGoalPicker({ value, onChange, theme }: { value: string; onChange: (v: string) => void; theme: any }) {
  const currentGoal = parseFloat(value || '7');
  const currentHours = Math.floor(currentGoal);
  const currentMins  = Math.round((currentGoal % 1) * 60);
  const currentHourStr = String(currentHours);
  const currentMinStr  = String(currentMins).padStart(2, '0');
  const hourScrollRef  = useRef<ScrollView>(null);
  const minScrollRef   = useRef<ScrollView>(null);
  const isInitializing = useRef(true);
  const hourIndex = HOUR_OPTIONS.indexOf(currentHourStr);
  const minIndex  = MINUTE_OPTIONS.indexOf(currentMinStr);

  useEffect(() => {
    const validHourIndex = hourIndex >= 0 ? hourIndex : 2;
    const validMinIndex  = minIndex  >= 0 ? minIndex  : 0;
    setTimeout(() => {
      hourScrollRef.current?.scrollTo({ y: validHourIndex * ITEM_HEIGHT, animated: false });
      minScrollRef.current?.scrollTo({ y: validMinIndex  * ITEM_HEIGHT, animated: false });
      isInitializing.current = false;
    }, 400);
  }, []);

  const handleHourScroll = (e: any) => {
    if (isInitializing.current) return;
    const index   = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(HOUR_OPTIONS.length - 1, index));
    const mins    = currentMins / 60;
    onChange(String(parseInt(HOUR_OPTIONS[clamped]) + mins));
  };
  const handleMinScroll = (e: any) => {
    if (isInitializing.current) return;
    const index   = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(MINUTE_OPTIONS.length - 1, index));
    const mins    = parseInt(MINUTE_OPTIONS[clamped]) / 60;
    onChange(String(currentHours + mins));
  };

  const displayGoal = `${currentHours}h${currentMins > 0 ? ` ${currentMins}m` : ''}`;

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: 'DMSans_700Bold', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>Hours</Text>
          <View style={{ height: ITEM_HEIGHT * 3, width: 80, overflow: 'hidden' }}>
            <View style={{ position: 'absolute', top: ITEM_HEIGHT, left: 0, right: 0, height: ITEM_HEIGHT, borderTopWidth: 0.5, borderBottomWidth: 0.5, borderColor: theme.accentBlueBorder, zIndex: 1 }} pointerEvents="none" />
            <ScrollView ref={hourScrollRef} style={{ flex: 1 }} showsVerticalScrollIndicator={false} snapToInterval={ITEM_HEIGHT} decelerationRate="fast" contentContainerStyle={{ paddingVertical: ITEM_HEIGHT }} onMomentumScrollEnd={handleHourScroll} onScrollEndDrag={handleHourScroll}>
              {HOUR_OPTIONS.map(h => {
                const isSelected = h === currentHourStr;
                return (
                  <View key={h} style={{ height: ITEM_HEIGHT, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: isSelected ? 30 : 20, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1, color: isSelected ? theme.accentBlue : theme.textMuted, opacity: isSelected ? 1 : 0.4 }}>{h}</Text>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
        <Text style={{ fontSize: 30, color: theme.textMuted, fontFamily: 'BebasNeue_400Regular', marginTop: 20 }}>:</Text>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: 'DMSans_700Bold', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>Minutes</Text>
          <View style={{ height: ITEM_HEIGHT * 3, width: 80, overflow: 'hidden' }}>
            <View style={{ position: 'absolute', top: ITEM_HEIGHT, left: 0, right: 0, height: ITEM_HEIGHT, borderTopWidth: 0.5, borderBottomWidth: 0.5, borderColor: theme.accentBlueBorder, zIndex: 1 }} pointerEvents="none" />
            <ScrollView ref={minScrollRef} style={{ flex: 1 }} showsVerticalScrollIndicator={false} snapToInterval={ITEM_HEIGHT} decelerationRate="fast" contentContainerStyle={{ paddingVertical: ITEM_HEIGHT }} onMomentumScrollEnd={handleMinScroll} onScrollEndDrag={handleMinScroll}>
              {MINUTE_OPTIONS.map(m => {
                const isSelected = m === currentMinStr;
                return (
                  <View key={m} style={{ height: ITEM_HEIGHT, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: isSelected ? 30 : 20, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1, color: isSelected ? theme.accentBlue : theme.textMuted, opacity: isSelected ? 1 : 0.4 }}>{m}</Text>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </View>
      <View style={{ alignItems: 'center', marginTop: 10 }}>
        <Text style={{ fontSize: 13, color: theme.textPrimary, fontFamily: 'DMSans_600SemiBold' }}>Goal: {displayGoal}</Text>
      </View>
    </View>
  );
}

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
  const [measuring, setMeasuring] = useState(false);
  const [heightReady, setHeightReady] = useState(false);
  const [isFullyOpen, setIsFullyOpen] = useState(false);
  const heightAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(defaultOpen ? 1 : 0)).current;
  const translateAnim = useRef(new Animated.Value(defaultOpen ? 0 : -8)).current;
  const contentHeightRef = useRef(0);
  const openRef = useRef(defaultOpen);
  openRef.current = open;

  // For defaultOpen sections: measure natural height on first unconstrained render
  const onUnconstrained = (e: any) => {
    const h = e.nativeEvent.layout.height;
    if (h <= 0 || heightReady) return;
    contentHeightRef.current = h;
    heightAnim.setValue(h);
    setHeightReady(true);
    setIsFullyOpen(true);
  };

  // Ghost view fires for first-open measurement of closed sections
  const onGhostLayout = (h: number) => {
    if (h <= 0) return;
    contentHeightRef.current = h;
    setMeasuring(false);
    if (!openRef.current) return;
    setHeightReady(true);
    setVisible(true);
    Animated.timing(heightAnim, { toValue: h, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(() => setIsFullyOpen(true));
    Animated.parallel([
      Animated.timing(opacityAnim, { toValue: 1, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(translateAnim, { toValue: 0, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  };

  const toggle = () => {
    const opening = !open;
    setOpen(opening);
    openRef.current = opening;
    if (opening) {
      opacityAnim.setValue(0);
      translateAnim.setValue(-8);
      if (contentHeightRef.current > 0) {
        setVisible(true);
        Animated.timing(heightAnim, { toValue: contentHeightRef.current, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(() => setIsFullyOpen(true));
        Animated.parallel([
          Animated.timing(opacityAnim, { toValue: 1, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(translateAnim, { toValue: 0, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]).start();
      } else {
        setMeasuring(true);
      }
    } else {
      setIsFullyOpen(false);
      Animated.timing(heightAnim, { toValue: 0, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: false }).start(() => setVisible(false));
      Animated.parallel([
        Animated.timing(opacityAnim, { toValue: 0, duration: 180, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        Animated.timing(translateAnim, { toValue: -8, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      ]).start();
    }
  };

  return (
    <View style={[styles.section, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: theme.borderCardTop }]}>
      {/* Ghost: renders children off-screen to measure natural height for first open */}
      {measuring && (
        <View
          style={{ position: 'absolute', opacity: 0, left: 0, right: 0, top: 9999 }}
          pointerEvents="none"
          onLayout={e => onGhostLayout(e.nativeEvent.layout.height)}
        >
          {children}
        </View>
      )}
      <TouchableOpacity
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); toggle(); }}
        activeOpacity={0.7}
        style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14, minHeight: 44 }}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.sectionLabel, { color: theme.accentBlue }]}>{label}</Text>
          {subtitle && !open && (
            <Text style={{ fontSize: 11, fontFamily: 'DMSans_400Regular', color: theme.textMuted, marginTop: 3 }}>
              {subtitle}
            </Text>
          )}
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={theme.accentBlue} />
      </TouchableOpacity>
      {heightReady ? (
        <Animated.View style={isFullyOpen ? { overflow: 'visible' } : { height: heightAnim, overflow: 'hidden' }}>
          <Animated.View style={{ opacity: opacityAnim, transform: [{ translateY: translateAnim }] }}>
            {visible && children}
          </Animated.View>
        </Animated.View>
      ) : (
        // Before first measurement: render without height constraint so onLayout gets real height
        <Animated.View
          onLayout={onUnconstrained}
          style={{ opacity: opacityAnim }}
        >
          {visible && children}
        </Animated.View>
      )}
    </View>
  );
}

function NotifGroup({
  label,
  summary,
  children,
  theme,
}: {
  label: string;
  summary: string;
  children: React.ReactNode;
  theme: any;
}) {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const toggle = () => {
    const opening = !open;
    setOpen(opening);
    Animated.timing(rotateAnim, { toValue: opening ? 1 : 0, duration: 200, useNativeDriver: true }).start();
    if (opening) {
      setVisible(true);
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    } else {
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => setVisible(false));
    }
  };

  const chevronRotate = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  return (
    <View style={{ borderWidth: 1, borderColor: theme.borderCard, borderRadius: 10, marginBottom: 10, overflow: 'hidden' }}>
      <TouchableOpacity
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); toggle(); }}
        activeOpacity={0.7}
        style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, backgroundColor: theme.bgInput, minHeight: 44 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontFamily: 'DMSans_700Bold', color: theme.textPrimary }}>{label}</Text>
          <Text style={{ fontSize: 11, fontFamily: 'DMSans_400Regular', color: theme.textMuted, marginTop: 2 }}>{summary}</Text>
        </View>
        <Animated.View style={{ transform: [{ rotate: chevronRotate }] }}>
          <Ionicons name="chevron-down" size={14} color={theme.textMuted} />
        </Animated.View>
      </TouchableOpacity>
      <Animated.View style={{ opacity: fadeAnim }}>
        {visible && <View style={{ paddingHorizontal: 14, paddingTop: 10, paddingBottom: 14 }}>{children}</View>}
      </Animated.View>
    </View>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { theme, themeId, accentId, setTheme, setAccent } = useTheme();
  const { user, signOut } = useAuth();
  const { showToast } = useToast();
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
  const [showPrayerModal, setShowPrayerModal] = useState(false);
  const scrollViewRef = useRef<any>(null);
  const quietHoursRowRef = useRef<any>(null);
  const { fetchHistoricalWorkouts, authorized } = useHealthKit();

  // ── Notification settings state ───────────────────────────────────────────
  const [notifSettings, setNotifSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [notifPermission, setNotifPermission] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const [avgBedtime, setAvgBedtime] = useState<string | null>(null);
  // Time picker state
  const [activeTimePicker, setActiveTimePicker] = useState<string | null>(null);
  const [timePickerValue, setTimePickerValue] = useState(new Date());
  const sheetAnim = useRef(new Animated.Value(300)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  // ── Goal profile state ────────────────────────────────────────────────────
  const [goalProfile, setGoalProfile] = useState<GoalProfile>(DEFAULT_GOAL_PROFILE);
  const [savedGoalProfile, setSavedGoalProfile] = useState<GoalProfile>(DEFAULT_GOAL_PROFILE);
  const [goalCurrentWeight, setGoalCurrentWeight] = useState<number | null>(null);
  const [hasGoalChanges, setHasGoalChanges] = useState(false);
  const [goalSaved, setGoalSaved] = useState(false);
  const goalFloatAnim = useRef(new Animated.Value(0)).current;
  const [goalKeyboardHeight, setGoalKeyboardHeight] = useState(0);
  const goalScrollOffset = useRef(0);
  const GOAL_SAVE_BAR_HEIGHT = 76;
  const hasGoalChangesRef = useRef(false);

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
        // Load notification settings
        const ns = await loadNotificationSettings();
        setNotifSettings(ns);
        const perm = await getPermissionStatus();
        setNotifPermission(perm);
        const bt = await getAverageBedtime();
        setAvgBedtime(bt);
      } catch (e) {}
    };
    load();
  }, []);

  // Keyboard height tracking for goal save bar
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', e => setGoalKeyboardHeight(e.endCoordinates.height));
    const hide  = Keyboard.addListener('keyboardDidHide', () => setGoalKeyboardHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  // Load goal profile fields from pj_profile on focus (skip if unsaved changes)
  useFocusEffect(
    useCallback(() => {
      const loadGoals = async () => {
        try {
          // Load current weight (most recent 30 days)
          for (let i = 0; i < 30; i++) {
            const d = new Date(); d.setDate(d.getDate() - i);
            const dk = d.toISOString().split('T')[0];
            const s = await AsyncStorage.getItem(`pj_${dk}`);
            if (s) { const data = JSON.parse(s); if (data.weight) { setGoalCurrentWeight(data.weight); break; } }
          }
          if (!hasGoalChangesRef.current) {
            const data = await AsyncStorage.getItem('pj_profile');
            if (data) {
              const p = JSON.parse(data);
              const loaded: GoalProfile = {
                calTarget: p.calTarget ?? '',
                useRecommendedCal: p.useRecommendedCal !== false,
                macroMode: p.macroMode ?? 'ratio',
                macroProteinPct: p.macroProteinPct ?? '35',
                macroCarbsPct:   p.macroCarbsPct   ?? '40',
                macroFatPct:     p.macroFatPct     ?? '25',
                macroProteinG:   p.macroProteinG   ?? '',
                macroCarbsG:     p.macroCarbsG     ?? '',
                macroFatG:       p.macroFatG       ?? '',
                sleepGoal:        p.sleepGoal        ?? '7',
                stepGoal:         p.stepGoal         ?? '10000',
                waterGoal:        p.waterGoal        ?? '128',
                activeCalGoal:    p.activeCalGoal    ?? '500',
                exerciseMinsGoal: p.exerciseMinsGoal ?? '30',
                heightFt:         p.heightFt         ?? '',
                heightIn:         p.heightIn         ?? '',
                birthday:         p.birthday         ?? '',
                sex:              p.sex              ?? 'male',
                lifestyleActivity:  p.lifestyleActivity  ?? 'sedentary',
                trainingFrequency:  p.trainingFrequency  ?? 'none',
                weightGoal:         p.weightGoal         ?? 'lose_1',
              };
              setGoalProfile(loaded);
              setSavedGoalProfile(loaded);
            }
          }
        } catch (e) {}
      };
      loadGoals();
    }, [])
  );

  // Calc functions for suggested calorie target (mirrors profile.tsx)
  const calcGoalBMR = () => {
    const weightKg = (goalCurrentWeight || 0) * 0.453592;
    const heightCm = (parseFloat(goalProfile.heightFt) * 30.48) + (parseFloat(goalProfile.heightIn) * 2.54);
    if (!goalProfile.birthday) return 0;
    const parts = goalProfile.birthday.split(/[-\/T]/);
    const isISO = parts[0].length === 4;
    const birthDate = isISO
      ? new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
      : new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
    const age = Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 3600 * 1000));
    if (!weightKg || !heightCm || !age) return 0;
    return goalProfile.sex === 'male'
      ? Math.round((10 * weightKg) + (6.25 * heightCm) - (5 * age) + 5)
      : Math.round((10 * weightKg) + (6.25 * heightCm) - (5 * age) - 161);
  };

  const calcGoalTDEE = () => {
    const bmr = calcGoalBMR();
    if (!bmr) return 0;
    const lifestyleOpt = LIFESTYLE_OPTIONS.find(o => o.key === goalProfile.lifestyleActivity) || LIFESTYLE_OPTIONS[0];
    const trainingOpt  = TRAINING_OPTIONS.find(o => o.key === goalProfile.trainingFrequency)  || TRAINING_OPTIONS[0];
    return Math.round((bmr * lifestyleOpt.multiplier) + trainingOpt.dailyBonus);
  };

  const calcGoalSuggested = () => {
    const tdee = calcGoalTDEE();
    if (!tdee) return 0;
    const deficit = GOAL_DEFICITS[goalProfile.weightGoal] ?? -500;
    return tdee + deficit;
  };

  const goalSuggested = calcGoalSuggested();
  const goalKcalTarget = goalProfile.useRecommendedCal !== false
    ? (goalSuggested > 0 ? goalSuggested : parseFloat(goalProfile.calTarget) || 0)
    : parseFloat(goalProfile.calTarget) || 0;

  const isMacroValid = () => {
    if (goalKcalTarget === 0) return true;
    if (goalProfile.macroMode === 'ratio') {
      const total = (parseFloat(goalProfile.macroProteinPct) || 0) + (parseFloat(goalProfile.macroCarbsPct) || 0) + (parseFloat(goalProfile.macroFatPct) || 0);
      return total === 100;
    } else {
      const totalKcal = ((parseFloat(goalProfile.macroProteinG) || 0) * 4) + ((parseFloat(goalProfile.macroCarbsG) || 0) * 4) + ((parseFloat(goalProfile.macroFatG) || 0) * 9);
      return Math.abs(totalKcal - goalKcalTarget) <= 50;
    }
  };

  const updateGoalField = (field: keyof GoalProfile, value: any) => {
    setGoalProfile(prev => {
      const updated = { ...prev, [field]: value };
      const isDifferent = JSON.stringify(updated) !== JSON.stringify(savedGoalProfile);
      if (isDifferent && !hasGoalChangesRef.current) {
        hasGoalChangesRef.current = true;
        setHasGoalChanges(true);
        Animated.spring(goalFloatAnim, { toValue: 1, useNativeDriver: true, tension: 65, friction: 11 }).start();
        if (goalKeyboardHeight > 0) {
          scrollViewRef.current?.scrollTo({ y: goalScrollOffset.current + GOAL_SAVE_BAR_HEIGHT, animated: true });
        }
      } else if (!isDifferent && hasGoalChangesRef.current) {
        hasGoalChangesRef.current = false;
        setHasGoalChanges(false);
        Animated.timing(goalFloatAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
      }
      return updated;
    });
  };

  const saveGoals = async () => {
    try {
      // Read full current profile so we never lose non-goal fields
      const current = await AsyncStorage.getItem('pj_profile');
      const base = current ? JSON.parse(current) : {};

      // Sync calTarget to recommended value when toggle is on
      let synced = { ...goalProfile };
      if (goalProfile.useRecommendedCal !== false && goalSuggested > 0) {
        synced.calTarget = goalSuggested.toString();
      }

      // Sync macro grams <-> percentages on save
      if (goalProfile.macroMode === 'ratio' && goalKcalTarget > 0) {
        synced.macroProteinG = String(Math.round(((parseFloat(goalProfile.macroProteinPct) || 0) / 100) * goalKcalTarget / 4));
        synced.macroCarbsG   = String(Math.round(((parseFloat(goalProfile.macroCarbsPct)   || 0) / 100) * goalKcalTarget / 4));
        synced.macroFatG     = String(Math.round(((parseFloat(goalProfile.macroFatPct)     || 0) / 100) * goalKcalTarget / 9));
      } else if (goalProfile.macroMode === 'fixed' && goalKcalTarget > 0) {
        const pKcal = (parseFloat(goalProfile.macroProteinG) || 0) * 4;
        const cKcal = (parseFloat(goalProfile.macroCarbsG)   || 0) * 4;
        const fKcal = (parseFloat(goalProfile.macroFatG)     || 0) * 9;
        const totalKcal = pKcal + cKcal + fKcal;
        if (totalKcal > 0) {
          synced.macroProteinPct = String(Math.round((pKcal / totalKcal) * 100));
          synced.macroCarbsPct   = String(Math.round((cKcal / totalKcal) * 100));
          synced.macroFatPct     = String(Math.round((fKcal / totalKcal) * 100));
        }
      }

      const merged = { ...base, ...synced };
      await storageSet('pj_profile', JSON.stringify(merged));
      await saveToFirebase('profile', 'data', merged);

      setGoalProfile(synced);
      setSavedGoalProfile(synced);
      hasGoalChangesRef.current = false;
      setHasGoalChanges(false);
      setGoalSaved(true);
      Animated.timing(goalFloatAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
      setTimeout(() => setGoalSaved(false), 2000);
      Keyboard.dismiss();
      showToast('Goals saved', undefined, 'success');
    } catch (e) {
      console.log('Save goals error', e);
    }
  };

  const saveSetting = async (key: string, value: any) => {
    try {
      const saved = await AsyncStorage.getItem('pj_settings');
      const current = saved ? JSON.parse(saved) : {};
      await storageSet('pj_settings', JSON.stringify({ ...current, [key]: value }));
    } catch (e) {}
  };

  const updateNotifSettings = async (updated: NotificationSettings) => {
    setNotifSettings(updated);
    await saveNotificationSettings(updated);
  };

  const openTimePicker = (key: string, currentTime: string) => {
    const { hour, minute } = parseTime(currentTime);
    const d = new Date();
    d.setHours(hour, minute, 0, 0);
    setTimePickerValue(d);
    setActiveTimePicker(key);
    if (key.startsWith('quiet')) {
      setTimeout(() => {
        quietHoursRowRef.current?.measure((_x: number, _y: number, _w: number, h: number, _pageX: number, pageY: number) => {
          const pickerSheetHeight = 290;
          const screenH = Dimensions.get('window').height;
          const bottomOfRow = pageY + h;
          if (bottomOfRow > screenH - pickerSheetHeight) {
            const overflow = bottomOfRow - (screenH - pickerSheetHeight) + 16;
            scrollViewRef.current?.scrollTo({ y: goalScrollOffset.current + overflow, animated: true });
          }
        });
      }, 0);
    }
  };

  const closeTimePicker = () => {
    Animated.parallel([
      Animated.timing(sheetAnim, { toValue: 300, duration: 220, useNativeDriver: true }),
      Animated.timing(overlayAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => setActiveTimePicker(null));
  };

  const confirmTimePicker = () => {
    if (!activeTimePicker) return;
    const hh = timePickerValue.getHours().toString().padStart(2, '0');
    const mm = timePickerValue.getMinutes().toString().padStart(2, '0');
    const timeStr = `${hh}:${mm}`;
    const key = activeTimePicker;
    Animated.parallel([
      Animated.timing(sheetAnim, { toValue: 300, duration: 220, useNativeDriver: true }),
      Animated.timing(overlayAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      setActiveTimePicker(null);
      const updated: any = { ...notifSettings };
      const [section] = key.split('.');
      if (section === 'quietStart') {
        updateNotifSettings({ ...notifSettings, quietStart: timeStr });
      } else if (section === 'quietEnd') {
        updateNotifSettings({ ...notifSettings, quietEnd: timeStr });
      } else {
        updated[section] = { ...updated[section], time: timeStr };
        updateNotifSettings(updated as NotificationSettings);
      }
    });
  };

  const toggleHaptics = (val: boolean) => {
    setHapticsEnabled(val);
    saveSetting('hapticsEnabled', val);
  };

  const appVersion = Constants.expoConfig?.version ?? '1.0';

  const healthActiveCount = [notifSettings.foodLog.enabled, notifSettings.waterPace.enabled, notifSettings.activity.enabled, notifSettings.streakProtection.enabled, notifSettings.weeklyRecap.enabled, notifSettings.reengagement.enabled].filter(Boolean).length;
  const fastingActiveCount = [notifSettings.ifWindow.enabled, notifSettings.ifCheckin.enabled].filter(Boolean).length;
  const faithActiveCount = [notifSettings.morningIntention.enabled, notifSettings.eveningGratitude.enabled, notifSettings.prayerCheckin.enabled].filter(Boolean).length;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bgPrimary, paddingTop: insets.top }}>
      <View style={[styles.header, { borderBottomColor: theme.borderCard }]}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }} style={{ marginRight: 12 }}>
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

      <ScrollView ref={scrollViewRef} contentContainerStyle={styles.content} automaticallyAdjustKeyboardInsets={true} onScroll={e => { goalScrollOffset.current = e.nativeEvent.contentOffset.y; }} scrollEventThrottle={16}>

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
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setTheme(id); }}
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
                      <TouchableOpacity key={accent.id} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setAccent(accent.id); }} style={{ width: itemW, alignItems: 'center', gap: 4, marginBottom: 10 }}>
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

        {/* ── Goals ── */}
        <CollapsibleSection label="Goals" subtitle="Fitness · Nutrition" defaultOpen={false} theme={theme}>
          <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>

            {/* FITNESS GOALS */}
            <Text style={{ fontSize: 11, fontFamily: 'DMSans_700Bold', color: theme.accentBlue, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16, marginTop: 4 }}>Fitness Goals</Text>

            {/* Steps */}
            <Text style={[styles.goalLabel, { color: theme.textMuted }]}>Steps</Text>
            <TextInput
              style={[styles.goalInput, { backgroundColor: theme.bgInput, borderColor: theme.borderInput, color: theme.textPrimary }]}
              value={goalProfile.stepGoal}
              onChangeText={v => updateGoalField('stepGoal', v.replace(/[^0-9]/g, ''))}
              onBlur={() => { const v = parseInt(goalProfile.stepGoal) || 10000; updateGoalField('stepGoal', String(Math.min(100000, Math.max(1000, v)))); }}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="e.g. 10000"
              placeholderTextColor={theme.textPlaceholder}
            />
            <Text style={[styles.goalHint, { color: theme.textMuted }]}>Daily step target. Shows on home screen progress bar.</Text>

            <View style={{ height: 1, backgroundColor: theme.borderCard, marginVertical: 16 }} />

            {/* Active Calories */}
            <Text style={[styles.goalLabel, { color: theme.textMuted }]}>Active Calories</Text>
            <TextInput
              style={[styles.goalInput, { backgroundColor: theme.bgInput, borderColor: theme.borderInput, color: theme.textPrimary }]}
              value={goalProfile.activeCalGoal}
              onChangeText={v => updateGoalField('activeCalGoal', v.replace(/[^0-9]/g, ''))}
              onBlur={() => { const v = parseInt(goalProfile.activeCalGoal) || 500; updateGoalField('activeCalGoal', String(Math.min(5000, Math.max(100, v)))); }}
              keyboardType="number-pad"
              maxLength={4}
              placeholder="e.g. 500"
              placeholderTextColor={theme.textPlaceholder}
            />
            <Text style={[styles.goalHint, { color: theme.textMuted }]}>Daily active calorie target from Apple Health. Celebrates when you hit it.</Text>

            <View style={{ height: 1, backgroundColor: theme.borderCard, marginVertical: 16 }} />

            {/* Exercise Minutes */}
            <Text style={[styles.goalLabel, { color: theme.textMuted }]}>Exercise Minutes</Text>
            <TextInput
              style={[styles.goalInput, { backgroundColor: theme.bgInput, borderColor: theme.borderInput, color: theme.textPrimary }]}
              value={goalProfile.exerciseMinsGoal}
              onChangeText={v => updateGoalField('exerciseMinsGoal', v.replace(/[^0-9]/g, ''))}
              onBlur={() => { const v = parseInt(goalProfile.exerciseMinsGoal) || 30; updateGoalField('exerciseMinsGoal', String(Math.min(300, Math.max(1, v)))); }}
              keyboardType="number-pad"
              maxLength={3}
              placeholder="e.g. 30"
              placeholderTextColor={theme.textPlaceholder}
            />
            <Text style={[styles.goalHint, { color: theme.textMuted }]}>Daily exercise minutes from Apple Health. Celebrates when you hit it.</Text>

            <View style={{ height: 1, backgroundColor: theme.borderCard, marginVertical: 16 }} />

            {/* Sleep Goal */}
            <Text style={[styles.goalLabel, { color: theme.textMuted }]}>Sleep Goal</Text>
            <Text style={{ fontSize: 11, fontFamily: 'DMSans_400Regular', fontStyle: 'italic', color: theme.textMuted, marginBottom: 12 }}>How many hours of sleep are you aiming for each night?</Text>
            <SleepGoalPicker value={goalProfile.sleepGoal || '7'} onChange={v => updateGoalField('sleepGoal', v)} theme={theme} />

            <View style={{ height: 1, backgroundColor: theme.borderCard, marginTop: 20, marginBottom: 16 }} />

            {/* NUTRITION GOALS */}
            <Text style={{ fontSize: 11, fontFamily: 'DMSans_700Bold', color: theme.accentBlue, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 }}>Nutrition Goals</Text>

            {/* Calorie Target */}
            <Text style={[styles.goalLabel, { color: theme.textMuted }]}>Daily Calorie Target</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <Text style={{ fontSize: 13, color: theme.textMuted, fontFamily: 'DMSans_400Regular' }}>Use recommended value</Text>
              <ToggleSwitch value={goalProfile.useRecommendedCal !== false} onValueChange={v => updateGoalField('useRecommendedCal', v)} />
            </View>
            <Text style={{ fontSize: 11, color: theme.textMuted, fontFamily: 'DMSans_400Regular', fontStyle: 'italic', marginBottom: 10 }}>Based on your BMR, activity level, and weight goal set in Profile.</Text>
            <TextInput
              style={[styles.goalInput, { backgroundColor: goalProfile.useRecommendedCal !== false ? theme.bgProgressTrack : theme.bgInput, borderColor: theme.borderInput, color: goalProfile.useRecommendedCal !== false ? theme.textMuted : theme.textPrimary }]}
              value={goalProfile.useRecommendedCal !== false ? (goalSuggested > 0 ? goalSuggested.toString() : 'Set stats in Profile') : goalProfile.calTarget}
              onChangeText={v => updateGoalField('calTarget', v)}
              onBlur={() => { if (goalProfile.useRecommendedCal !== false) return; const v = parseInt(goalProfile.calTarget) || 1750; updateGoalField('calTarget', String(Math.min(10000, Math.max(500, v)))); }}
              keyboardType="number-pad"
              maxLength={5}
              placeholder="e.g. 1750"
              placeholderTextColor={theme.textPlaceholder}
              editable={goalProfile.useRecommendedCal === false}
            />
            {goalProfile.useRecommendedCal === false && (
              <Text style={[styles.goalHint, { color: theme.textMuted }]}>Enter a custom calorie target.</Text>
            )}

            <View style={{ height: 1, backgroundColor: theme.borderCard, marginVertical: 16 }} />

            {/* Macros */}
            <Text style={[styles.goalLabel, { color: theme.textMuted }]}>Macros</Text>
            <Text style={{ fontSize: 11, fontFamily: 'DMSans_400Regular', fontStyle: 'italic', color: theme.textMuted, marginBottom: 14 }}>
              {goalProfile.macroMode === 'ratio'
                ? 'Set percentages -- grams update automatically when your calorie target changes.'
                : 'Set grams directly. Percentages and kcal update live.'}
            </Text>

            {/* Mode toggle */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              {(['ratio', 'fixed'] as const).map(mode => (
                <TouchableOpacity
                  key={mode}
                  style={[styles.modeBtn, { backgroundColor: theme.bgInput, borderColor: theme.borderInput },
                    goalProfile.macroMode === mode && { backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder }]}
                  onPress={() => updateGoalField('macroMode', mode)}>
                  <Text style={[{ fontSize: 14, fontFamily: 'DMSans_500Medium', color: theme.textMuted },
                    goalProfile.macroMode === mode && { color: theme.accentBlue }]}>
                    {mode === 'ratio' ? 'Ratio' : 'Fixed'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {goalProfile.macroMode === 'ratio' ? (
              <View>
                {[
                  { label: 'Protein', pctKey: 'macroProteinPct' as keyof GoalProfile, color: theme.macroProtein },
                  { label: 'Carbs',   pctKey: 'macroCarbsPct'   as keyof GoalProfile, color: theme.macroCarbs },
                  { label: 'Fat',     pctKey: 'macroFatPct'     as keyof GoalProfile, color: theme.macroFat },
                ].map(({ label, pctKey, color }) => {
                  const pct = parseFloat(goalProfile[pctKey] as string) || 0;
                  const calsPerGram = label === 'Fat' ? 9 : 4;
                  const kcal  = Math.round((pct / 100) * goalKcalTarget);
                  const grams = Math.round(kcal / calsPerGram);
                  return (
                    <View key={label} style={{ marginBottom: 12 }}>
                      <Text style={[styles.goalLabel, { color: theme.textMuted }]}>{label}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <TextInput
                          style={[styles.goalInput, { backgroundColor: theme.bgInput, borderColor: theme.borderInput, color, flex: 1, marginBottom: 0, textAlign: 'center', fontSize: 20, fontFamily: 'BebasNeue_400Regular' }]}
                          value={goalProfile[pctKey] as string}
                          onChangeText={v => updateGoalField(pctKey, v)}
                          keyboardType="number-pad"
                          maxLength={3}
                          placeholder="0"
                          placeholderTextColor={theme.textPlaceholder}
                        />
                        <Text style={{ color: theme.textMuted, fontSize: 16, fontFamily: 'DMSans_400Regular' }}>%</Text>
                        <View style={{ flex: 2, backgroundColor: theme.bgInset, borderRadius: 8, padding: 10, flexDirection: 'row', justifyContent: 'space-between' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
                            <Text style={{ color, fontSize: 18, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1 }}>{grams}</Text>
                            <Text style={{ color, fontSize: 11, fontFamily: 'DMSans_500Medium' }}>g</Text>
                          </View>
                          <Text style={{ color: theme.textMuted, fontSize: 11, fontFamily: 'DMSans_400Regular', alignSelf: 'center' }}>{kcal} kcal</Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
                {(() => {
                  const total = (parseFloat(goalProfile.macroProteinPct) || 0) + (parseFloat(goalProfile.macroCarbsPct) || 0) + (parseFloat(goalProfile.macroFatPct) || 0);
                  const color = total === 100 ? theme.accentGreen : theme.accentRed;
                  return (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, padding: 10, backgroundColor: theme.bgInset, borderRadius: 8 }}>
                      <Text style={{ fontSize: 11, color: theme.textMuted, fontFamily: 'DMSans_400Regular' }}>Total</Text>
                      <Text style={{ fontSize: 16, color, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1 }}>
                        {total}% {total === 100 ? '✓' : '-- needs to equal 100%'}
                      </Text>
                    </View>
                  );
                })()}
              </View>
            ) : (
              <View>
                {[
                  { label: 'Protein', gKey: 'macroProteinG' as keyof GoalProfile, color: theme.macroProtein, calsPerGram: 4 },
                  { label: 'Carbs',   gKey: 'macroCarbsG'   as keyof GoalProfile, color: theme.macroCarbs,   calsPerGram: 4 },
                  { label: 'Fat',     gKey: 'macroFatG'     as keyof GoalProfile, color: theme.macroFat,     calsPerGram: 9 },
                ].map(({ label, gKey, color, calsPerGram }) => {
                  const grams = parseFloat(goalProfile[gKey] as string) || 0;
                  const kcal  = Math.round(grams * calsPerGram);
                  const pct   = goalKcalTarget > 0 ? Math.round((kcal / goalKcalTarget) * 100) : 0;
                  return (
                    <View key={label} style={{ marginBottom: 12 }}>
                      <Text style={[styles.goalLabel, { color: theme.textMuted }]}>{label}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <TextInput
                          style={[styles.goalInput, { backgroundColor: theme.bgInput, borderColor: theme.borderInput, color, flex: 1, marginBottom: 0, textAlign: 'center', fontSize: 20, fontFamily: 'BebasNeue_400Regular' }]}
                          value={goalProfile[gKey] as string}
                          onChangeText={v => updateGoalField(gKey, v)}
                          keyboardType="number-pad"
                          maxLength={4}
                          placeholder="0"
                          placeholderTextColor={theme.textPlaceholder}
                        />
                        <Text style={{ color: theme.textMuted, fontSize: 16, fontFamily: 'DMSans_400Regular' }}>g</Text>
                        <View style={{ flex: 2, backgroundColor: theme.bgInset, borderRadius: 8, padding: 10, flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={{ color, fontSize: 18, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1 }}>{kcal} kcal</Text>
                          <Text style={{ color: theme.textMuted, fontSize: 11, fontFamily: 'DMSans_400Regular', alignSelf: 'center' }}>{pct}%</Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
                {(() => {
                  const totalKcal = ((parseFloat(goalProfile.macroProteinG) || 0) * 4) + ((parseFloat(goalProfile.macroCarbsG) || 0) * 4) + ((parseFloat(goalProfile.macroFatG) || 0) * 9);
                  const diff  = Math.round(totalKcal - goalKcalTarget);
                  const color = Math.abs(diff) <= 50 ? theme.accentGreen : Math.abs(diff) <= 150 ? theme.accentAmber : theme.accentRed;
                  return (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, padding: 10, backgroundColor: theme.bgInset, borderRadius: 8 }}>
                      <Text style={{ fontSize: 11, color: theme.textMuted, fontFamily: 'DMSans_400Regular' }}>Total · {Math.round(totalKcal)} kcal</Text>
                      <Text style={{ fontSize: 13, color, fontFamily: 'DMSans_600SemiBold' }}>
                        {Math.abs(diff) <= 50 ? 'Matches target ✓' : diff > 0 ? `+${diff} kcal over · adjust to save` : `${Math.abs(diff)} kcal under · adjust to save`}
                      </Text>
                    </View>
                  );
                })()}
              </View>
            )}

            <View style={{ height: 1, backgroundColor: theme.borderCard, marginVertical: 16 }} />

            {/* Water Goal */}
            <Text style={[styles.goalLabel, { color: theme.textMuted }]}>Water Goal</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <TextInput
                style={[styles.goalInput, { backgroundColor: theme.bgInput, borderColor: theme.borderInput, color: theme.textPrimary, flex: 1, marginBottom: 0 }]}
                value={goalProfile.waterGoal}
                onChangeText={v => updateGoalField('waterGoal', v.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                placeholder="e.g. 128"
                placeholderTextColor={theme.textPlaceholder}
              />
              <Text style={{ color: theme.textMuted, fontSize: 16, fontFamily: 'DMSans_400Regular' }}>oz</Text>
            </View>
            <Text style={[styles.goalHint, { color: theme.textMuted }]}>Daily hydration target in oz. Progress bar fills to this amount.</Text>

            <View style={{ height: 16 }} />
          </View>
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
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
                  onPress={async () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setBurnAccuracyPct(pct); await saveSetting('burnAccuracyPct', pct); }}
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
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setImportRange(d); }}
                  style={{ flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: importRange === d ? theme.accentBlueBorder : theme.borderInput, backgroundColor: importRange === d ? theme.accentBlueBg : theme.bgInput }}>
                  <Text style={{ fontSize: 11, fontFamily: 'DMSans_700Bold', color: importRange === d ? theme.accentBlue : theme.textMuted }}>
                    {d === 14 ? '2 WEEKS' : d === 30 ? '1 MONTH' : '3 MONTHS'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); importWorkoutHistory(); }}
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

        {/* ── Notifications ── */}
        <CollapsibleSection label="Notifications" subtitle="Reminders · Streaks · IF Window" defaultOpen={false} theme={theme}>
          <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>

            {/* Permission banner */}
            {notifPermission === 'denied' && (
              <View style={{ backgroundColor: theme.accentRedBg ?? 'rgba(204,51,51,0.12)', borderWidth: 1, borderColor: theme.accentRed, borderRadius: 10, padding: 12, marginBottom: 16 }}>
                <Text style={{ color: theme.accentRed, fontSize: 13, fontFamily: 'DMSans_600SemiBold' }}>Notifications Blocked</Text>
                <Text style={{ color: theme.textMuted, fontSize: 12, fontFamily: 'DMSans_400Regular', marginTop: 4 }}>iOS permission was denied. Go to Settings → Project J → Notifications to enable.</Text>
              </View>
            )}

            {/* Master toggle */}
            <View style={[styles.row, { borderTopColor: 'transparent', paddingHorizontal: 0, paddingTop: 0 }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.textPrimary }]}>Enable Notifications</Text>
                <Text style={[styles.rowSub, { color: theme.textMuted }]}>Master on/off for all reminders</Text>
              </View>
              <ToggleSwitch
                value={notifSettings.masterEnabled}
                onValueChange={v => {
                  if (!v) closeTimePicker();
                  if (v && notifPermission === 'undetermined') {
                    requestNotificationPermission().then(granted => {
                      setNotifPermission(granted ? 'granted' : 'denied');
                    });
                  }
                  updateNotifSettings({ ...notifSettings, masterEnabled: v });
                }}
              />
            </View>

            {notifSettings.masterEnabled && (
              <>
                {/* ── Quiet Hours ── */}
                <Text style={{ fontSize: 11, fontFamily: 'DMSans_700Bold', color: theme.accentBlue, letterSpacing: 2, textTransform: 'uppercase', marginTop: 16, marginBottom: 10 }}>Quiet Hours</Text>
                <View ref={quietHoursRowRef} style={{ flexDirection: 'row', gap: 12, marginBottom: 4 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, color: theme.textMuted, fontFamily: 'DMSans_600SemiBold', marginBottom: 6 }}>From</Text>
                    <TouchableOpacity
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); openTimePicker('quietStart.time', notifSettings.quietStart); }}
                      style={{ backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, paddingVertical: 10, alignItems: 'center' }}>
                      <Text style={{ color: theme.textPrimary, fontSize: 15, fontFamily: 'DMSans_600SemiBold' }}>{formatNotifTime(notifSettings.quietStart)}</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, color: theme.textMuted, fontFamily: 'DMSans_600SemiBold', marginBottom: 6 }}>Until</Text>
                    <TouchableOpacity
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); openTimePicker('quietEnd.time', notifSettings.quietEnd); }}
                      style={{ backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, paddingVertical: 10, alignItems: 'center' }}>
                      <Text style={{ color: theme.textPrimary, fontSize: 15, fontFamily: 'DMSans_600SemiBold' }}>{formatNotifTime(notifSettings.quietEnd)}</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* ── Min spacing ── */}
                <View style={{ height: 1, backgroundColor: theme.borderInput, marginTop: 16, marginBottom: 16 }} />
                <Text style={{ fontSize: 11, fontFamily: 'DMSans_700Bold', color: theme.accentBlue, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>Minimum Spacing</Text>
                <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'DMSans_400Regular', marginBottom: 10 }}>Minimum time between auto-scheduled reminders</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                  {[30, 60, 90].map(mins => (
                    <TouchableOpacity
                      key={mins}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); updateNotifSettings({ ...notifSettings, minSpacingMins: mins }); }}
                      style={{ flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', backgroundColor: notifSettings.minSpacingMins === mins ? theme.accentBlueBg : theme.bgInput, borderWidth: 1, borderColor: notifSettings.minSpacingMins === mins ? theme.accentBlueBorder : theme.borderInput }}>
                      <Text style={{ fontSize: 13, fontFamily: 'DMSans_600SemiBold', color: notifSettings.minSpacingMins === mins ? theme.accentBlue : theme.textMuted }}>{mins}m</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* ── Health & Habits accordion ── */}
                <NotifGroup label="Health & Habits" summary={healthActiveCount > 0 ? `${healthActiveCount} of 6 active` : 'All off'} theme={theme}>
                  <Text style={{ fontSize: 11, fontFamily: 'DMSans_700Bold', color: theme.accentBlue, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2 }}>Food Log Reminder</Text>
                  <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'DMSans_400Regular', marginBottom: 8 }}>Fires if nothing has been logged by your chosen time</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={[styles.rowTitle, { color: theme.textPrimary }]}>Enable</Text>
                    <ToggleSwitch value={notifSettings.foodLog.enabled} onValueChange={v => updateNotifSettings({ ...notifSettings, foodLog: { ...notifSettings.foodLog, enabled: v } })} />
                  </View>
                  {notifSettings.foodLog.enabled && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text style={{ color: theme.textMuted, fontSize: 13, fontFamily: 'DMSans_400Regular' }}>Time</Text>
                      <TouchableOpacity onPress={() => openTimePicker('foodLog.time', notifSettings.foodLog.time)} style={{ backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, paddingVertical: 7, paddingHorizontal: 14 }}>
                        <Text style={{ color: theme.textPrimary, fontSize: 14, fontFamily: 'DMSans_600SemiBold' }}>{formatNotifTime(notifSettings.foodLog.time)}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  <View style={{ height: 1, backgroundColor: theme.borderInput, marginVertical: 12 }} />

                  <Text style={{ fontSize: 11, fontFamily: 'DMSans_700Bold', color: theme.accentBlue, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2 }}>Water Pace</Text>
                  <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'DMSans_400Regular', marginBottom: 8 }}>Midday check -- fires if you're 30%+ behind your daily water goal</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={[styles.rowTitle, { color: theme.textPrimary }]}>Enable</Text>
                    <ToggleSwitch value={notifSettings.waterPace.enabled} onValueChange={v => updateNotifSettings({ ...notifSettings, waterPace: { ...notifSettings.waterPace, enabled: v } })} />
                  </View>
                  <View style={{ height: 1, backgroundColor: theme.borderInput, marginVertical: 12 }} />

                  <Text style={{ fontSize: 11, fontFamily: 'DMSans_700Bold', color: theme.accentBlue, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2 }}>Activity Reminder</Text>
                  <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'DMSans_400Regular', marginBottom: 8 }}>Fires if no workout logged and steps are below 80% of your goal</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={[styles.rowTitle, { color: theme.textPrimary }]}>Enable</Text>
                    <ToggleSwitch value={notifSettings.activity.enabled} onValueChange={v => updateNotifSettings({ ...notifSettings, activity: { ...notifSettings.activity, enabled: v } })} />
                  </View>
                  {notifSettings.activity.enabled && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text style={{ color: theme.textMuted, fontSize: 13, fontFamily: 'DMSans_400Regular' }}>Time</Text>
                      <TouchableOpacity onPress={() => openTimePicker('activity.time', notifSettings.activity.time)} style={{ backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, paddingVertical: 7, paddingHorizontal: 14 }}>
                        <Text style={{ color: theme.textPrimary, fontSize: 14, fontFamily: 'DMSans_600SemiBold' }}>{formatNotifTime(notifSettings.activity.time)}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  <View style={{ height: 1, backgroundColor: theme.borderInput, marginVertical: 12 }} />

                  <Text style={{ fontSize: 11, fontFamily: 'DMSans_700Bold', color: theme.accentBlue, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2 }}>Streak Protection</Text>
                  <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'DMSans_400Regular', marginBottom: 8 }}>Always fires when a streak is at risk -- not subject to spacing limits</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={[styles.rowTitle, { color: theme.textPrimary }]}>Enable</Text>
                    <ToggleSwitch value={notifSettings.streakProtection.enabled} onValueChange={v => updateNotifSettings({ ...notifSettings, streakProtection: { ...notifSettings.streakProtection, enabled: v } })} />
                  </View>
                  {notifSettings.streakProtection.enabled && (
                    <View style={{ marginBottom: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <TextInput
                          style={{ width: 64, backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, color: theme.textPrimary, paddingVertical: 9, paddingHorizontal: 12, fontSize: 15, fontFamily: 'DMSans_600SemiBold', textAlign: 'center' }}
                          value={notifSettings.streakProtection.minutesBefore}
                          onChangeText={v => { const filtered = v.replace(/[^0-9]/g, ''); updateNotifSettings({ ...notifSettings, streakProtection: { ...notifSettings.streakProtection, minutesBefore: filtered } }); }}
                          keyboardType="number-pad"
                          placeholder="45"
                          placeholderTextColor={theme.textDim}
                          maxLength={3}
                        />
                        <Text style={{ color: theme.textMuted, fontSize: 13, fontFamily: 'DMSans_400Regular', flex: 1 }}>minutes before your typical bedtime</Text>
                      </View>
                      <Text style={{ fontSize: 12, color: avgBedtime ? theme.accentBlue : theme.textDim, fontFamily: 'DMSans_400Regular', marginTop: 8 }}>
                        {avgBedtime ? `Your average bedtime: ${avgBedtime}` : 'Not enough sleep data yet (needs 3+ nights)'}
                      </Text>
                    </View>
                  )}
                  <View style={{ height: 1, backgroundColor: theme.borderInput, marginVertical: 12 }} />

                  <Text style={{ fontSize: 11, fontFamily: 'DMSans_700Bold', color: theme.accentBlue, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2 }}>Weekly Recap</Text>
                  <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'DMSans_400Regular', marginBottom: 8 }}>Sunday evening summary of your week</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={[styles.rowTitle, { color: theme.textPrimary }]}>Enable</Text>
                    <ToggleSwitch value={notifSettings.weeklyRecap.enabled} onValueChange={v => updateNotifSettings({ ...notifSettings, weeklyRecap: { ...notifSettings.weeklyRecap, enabled: v } })} />
                  </View>
                  {notifSettings.weeklyRecap.enabled && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text style={{ color: theme.textMuted, fontSize: 13, fontFamily: 'DMSans_400Regular' }}>Time (Sundays)</Text>
                      <TouchableOpacity onPress={() => openTimePicker('weeklyRecap.time', notifSettings.weeklyRecap.time)} style={{ backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, paddingVertical: 7, paddingHorizontal: 14 }}>
                        <Text style={{ color: theme.textPrimary, fontSize: 14, fontFamily: 'DMSans_600SemiBold' }}>{formatNotifTime(notifSettings.weeklyRecap.time)}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  <View style={{ height: 1, backgroundColor: theme.borderInput, marginVertical: 12 }} />

                  <Text style={{ fontSize: 11, fontFamily: 'DMSans_700Bold', color: theme.accentBlue, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2 }}>Re-Engagement</Text>
                  <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'DMSans_400Regular', marginBottom: 8 }}>Fires if the app hasn't been opened in 2 days</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={[styles.rowTitle, { color: theme.textPrimary }]}>Enable</Text>
                    <ToggleSwitch value={notifSettings.reengagement.enabled} onValueChange={v => updateNotifSettings({ ...notifSettings, reengagement: { ...notifSettings.reengagement, enabled: v } })} />
                  </View>
                </NotifGroup>

                {/* ── Fasting accordion ── */}
                <NotifGroup label="Fasting" summary={fastingActiveCount > 0 ? `${fastingActiveCount} of 2 active` : 'All off'} theme={theme}>
                  <Text style={{ fontSize: 11, fontFamily: 'DMSans_700Bold', color: theme.accentBlue, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2 }}>IF Window Closing</Text>
                  <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'DMSans_400Regular', marginBottom: 8 }}>Remind me when X minutes remain in my eating window</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={[styles.rowTitle, { color: theme.textPrimary }]}>Enable</Text>
                    <ToggleSwitch value={notifSettings.ifWindow.enabled} onValueChange={v => updateNotifSettings({ ...notifSettings, ifWindow: { ...notifSettings.ifWindow, enabled: v } })} />
                  </View>
                  {notifSettings.ifWindow.enabled && (
                    <>
                      {notifSettings.ifWindow.reminders.map((r, i) => (
                        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <TextInput
                            style={{ flex: 1, backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, color: theme.textPrimary, paddingVertical: 9, paddingHorizontal: 12, fontSize: 15, fontFamily: 'DMSans_600SemiBold' }}
                            value={r}
                            onChangeText={v => {
                              const filtered = v.replace(/[^0-9]/g, '');
                              const updated = [...notifSettings.ifWindow.reminders];
                              updated[i] = filtered;
                              updateNotifSettings({ ...notifSettings, ifWindow: { ...notifSettings.ifWindow, reminders: updated } });
                            }}
                            keyboardType="number-pad"
                            placeholder="60"
                            placeholderTextColor={theme.textDim}
                            maxLength={3}
                          />
                          <Text style={{ color: theme.textMuted, fontSize: 13, fontFamily: 'DMSans_400Regular' }}>min before close</Text>
                          {notifSettings.ifWindow.reminders.length > 1 && (
                            <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); const updated = notifSettings.ifWindow.reminders.filter((_, idx) => idx !== i); updateNotifSettings({ ...notifSettings, ifWindow: { ...notifSettings.ifWindow, reminders: updated } }); }}>
                              <Ionicons name="close-circle" size={20} color={theme.accentRed} />
                            </TouchableOpacity>
                          )}
                        </View>
                      ))}
                      {notifSettings.ifWindow.reminders.length < 3 && (
                        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); updateNotifSettings({ ...notifSettings, ifWindow: { ...notifSettings.ifWindow, reminders: [...notifSettings.ifWindow.reminders, ''] } }); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                          <Ionicons name="add-circle-outline" size={16} color={theme.accentBlue} />
                          <Text style={{ color: theme.accentBlue, fontSize: 13, fontFamily: 'DMSans_600SemiBold' }}>Add another reminder</Text>
                        </TouchableOpacity>
                      )}
                    </>
                  )}
                  <View style={{ height: 1, backgroundColor: theme.borderInput, marginVertical: 12 }} />

                  <Text style={{ fontSize: 11, fontFamily: 'DMSans_700Bold', color: theme.accentBlue, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2 }}>IF Check-In</Text>
                  <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'DMSans_400Regular', marginBottom: 8 }}>Reminds you to start your IF window if food was logged but timer hasn't started</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={[styles.rowTitle, { color: theme.textPrimary }]}>Enable</Text>
                    <ToggleSwitch value={notifSettings.ifCheckin.enabled} onValueChange={v => updateNotifSettings({ ...notifSettings, ifCheckin: { ...notifSettings.ifCheckin, enabled: v } })} />
                  </View>
                  {notifSettings.ifCheckin.enabled && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ color: theme.textMuted, fontSize: 13, fontFamily: 'DMSans_400Regular' }}>Time</Text>
                      <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); openTimePicker('ifCheckin.time', notifSettings.ifCheckin.time); }} style={{ backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, paddingVertical: 7, paddingHorizontal: 14 }}>
                        <Text style={{ color: theme.textPrimary, fontSize: 14, fontFamily: 'DMSans_600SemiBold' }}>{formatNotifTime(notifSettings.ifCheckin.time)}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </NotifGroup>

                {/* ── Faith accordion (gated) ── */}
                {faithJourney !== 'notrightnow' && (
                  <NotifGroup label="Faith" summary={faithActiveCount > 0 ? `${faithActiveCount} of ${faithJourney === 'rooted' ? 3 : 2} active` : 'All off'} theme={theme}>
                    <Text style={{ fontSize: 11, fontFamily: 'DMSans_700Bold', color: theme.accentBlue, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2 }}>Morning Intention</Text>
                    <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'DMSans_400Regular', marginBottom: 8 }}>Opens today's verse to start your day with purpose</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text style={[styles.rowTitle, { color: theme.textPrimary }]}>Enable</Text>
                      <ToggleSwitch value={notifSettings.morningIntention.enabled} onValueChange={v => updateNotifSettings({ ...notifSettings, morningIntention: { ...notifSettings.morningIntention, enabled: v } })} />
                    </View>
                    {notifSettings.morningIntention.enabled && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text style={{ color: theme.textMuted, fontSize: 13, fontFamily: 'DMSans_400Regular' }}>Time</Text>
                        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); openTimePicker('morningIntention.time', notifSettings.morningIntention.time); }} style={{ backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, paddingVertical: 7, paddingHorizontal: 14 }}>
                          <Text style={{ color: theme.textPrimary, fontSize: 14, fontFamily: 'DMSans_600SemiBold' }}>{formatNotifTime(notifSettings.morningIntention.time)}</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    <View style={{ height: 1, backgroundColor: theme.borderInput, marginVertical: 12 }} />

                    <Text style={{ fontSize: 11, fontFamily: 'DMSans_700Bold', color: theme.accentBlue, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2 }}>Evening Gratitude</Text>
                    <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'DMSans_400Regular', marginBottom: 8 }}>Prompt to log your daily gratitude entry</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text style={[styles.rowTitle, { color: theme.textPrimary }]}>Enable</Text>
                      <ToggleSwitch value={notifSettings.eveningGratitude.enabled} onValueChange={v => updateNotifSettings({ ...notifSettings, eveningGratitude: { ...notifSettings.eveningGratitude, enabled: v } })} />
                    </View>
                    {notifSettings.eveningGratitude.enabled && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text style={{ color: theme.textMuted, fontSize: 13, fontFamily: 'DMSans_400Regular' }}>Time</Text>
                        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); openTimePicker('eveningGratitude.time', notifSettings.eveningGratitude.time); }} style={{ backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, paddingVertical: 7, paddingHorizontal: 14 }}>
                          <Text style={{ color: theme.textPrimary, fontSize: 14, fontFamily: 'DMSans_600SemiBold' }}>{formatNotifTime(notifSettings.eveningGratitude.time)}</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {faithJourney === 'rooted' && (
                      <>
                        <View style={{ height: 1, backgroundColor: theme.borderInput, marginVertical: 12 }} />
                        <Text style={{ fontSize: 11, fontFamily: 'DMSans_700Bold', color: theme.accentBlue, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2 }}>Prayer Check-In</Text>
                        <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'DMSans_400Regular', marginBottom: 8 }}>Evening prompt for your prayer streak</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <Text style={[styles.rowTitle, { color: theme.textPrimary }]}>Enable</Text>
                          <ToggleSwitch value={notifSettings.prayerCheckin.enabled} onValueChange={v => updateNotifSettings({ ...notifSettings, prayerCheckin: { ...notifSettings.prayerCheckin, enabled: v } })} />
                        </View>
                        {notifSettings.prayerCheckin.enabled && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Text style={{ color: theme.textMuted, fontSize: 13, fontFamily: 'DMSans_400Regular' }}>Time</Text>
                            <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); openTimePicker('prayerCheckin.time', notifSettings.prayerCheckin.time); }} style={{ backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, paddingVertical: 7, paddingHorizontal: 14 }}>
                              <Text style={{ color: theme.textPrimary, fontSize: 14, fontFamily: 'DMSans_600SemiBold' }}>{formatNotifTime(notifSettings.prayerCheckin.time)}</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </>
                    )}
                  </NotifGroup>
                )}
              </>
            )}
          </View>
        </CollapsibleSection>


        {/* ── Help ── */}
        <CollapsibleSection label="Help" subtitle="Definitions · Guides · Prayer" defaultOpen={false} theme={theme}>
          <View style={{ paddingBottom: 8 }}>
            <Text style={{ fontSize: 9, letterSpacing: 3, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase', color: theme.textMuted, paddingHorizontal: 16, paddingBottom: 8 }}>
              Definitions
            </Text>
            <TouchableOpacity style={[styles.row, { borderTopColor: theme.borderCard }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/definitions'); }} activeOpacity={0.7}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.textPrimary }]}>View Definitions</Text>
                <Text style={[styles.rowSub, { color: theme.textMuted }]}>All metric and feature explanations</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
            </TouchableOpacity>
            <Text style={{ fontSize: 9, letterSpacing: 3, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase', color: theme.textMuted, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
              Tips {'&'} Guides
            </Text>
            <TouchableOpacity style={[styles.row, { borderTopColor: theme.borderCard }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/mission'); }} activeOpacity={0.7}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.textPrimary }]}>Our Mission</Text>
                <Text style={[styles.rowSub, { color: theme.textMuted }]}>What makes this app different</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
            </TouchableOpacity>
            <Text style={{ fontSize: 9, letterSpacing: 3, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase', color: theme.textMuted, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
              Prayer
            </Text>
            <TouchableOpacity style={[styles.row, { borderTopColor: theme.borderCard }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowPrayerModal(true); }} activeOpacity={0.7}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.textPrimary }]}>Send a Prayer Request</Text>
                <Text style={[styles.rowSub, { color: theme.textMuted }]}>Share what's on your heart</Text>
              </View>
              <Ionicons name="heart" size={15} color={theme.textMuted} />
            </TouchableOpacity>
          </View>
        </CollapsibleSection>

        {/* ── About ── */}
        <CollapsibleSection label="About" subtitle="Version · Privacy · Legal" defaultOpen={false} theme={theme}>
          <View style={[styles.row, { borderTopColor: theme.borderCard }]}>
            <Text style={[styles.rowTitle, { color: theme.textPrimary, flex: 1 }]}>Version</Text>
            <Text style={[styles.rowSub, { color: theme.textMuted }]}>{appVersion}</Text>
          </View>
          <TouchableOpacity style={[styles.row, { borderTopColor: theme.borderCard }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); Linking.openURL('https://projectj-5d024.web.app/privacy'); }} activeOpacity={0.7}>
            <Text style={[styles.rowTitle, { color: theme.textPrimary, flex: 1 }]}>Privacy Policy</Text>
            <Ionicons name="open-outline" size={14} color={theme.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.row, { borderTopColor: theme.borderCard }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); Linking.openURL('https://projectj-5d024.web.app/terms'); }} activeOpacity={0.7}>
            <Text style={[styles.rowTitle, { color: theme.textPrimary, flex: 1 }]}>Terms of Service</Text>
            <Ionicons name="open-outline" size={14} color={theme.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.row, { borderTopColor: theme.borderCard }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); Linking.openURL('https://www.fatsecret.com'); }} activeOpacity={0.7}>
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
              {(() => {
                const providerId = user.providerData?.[0]?.providerId;
                const label = providerId === 'apple.com' ? 'Apple' : providerId === 'google.com' ? 'Google' : null;
                if (!label) return null;
                return (
                  <View style={{ backgroundColor: theme.bgInput, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 8 }}>
                    <Text style={{ fontSize: 10, color: theme.textMuted, fontFamily: 'DMSans_600SemiBold' }}>{label}</Text>
                  </View>
                );
              })()}
            </View>
          ) : null}
          <View style={[styles.row, { borderTopColor: theme.borderCard }]}>
            <TouchableOpacity
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign Out', style: 'destructive', onPress: () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); signOut(); } },
              ]); }}
              style={{ flex: 1 }}
            >
              <Text style={[styles.rowTitle, { color: theme.statusBad }]}>Sign Out</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.row, { borderTopColor: theme.borderCard }]}>
            <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); handleDeleteAccount(); }} style={{ flex: 1 }} disabled={deletingAccount}>
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
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              Alert.alert('Reset Onboarding', 'This will send you back to the welcome screen on next app launch.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Reset', style: 'destructive', onPress: async () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); await AsyncStorage.removeItem('pj_onboarding_complete'); Alert.alert('Done', 'Onboarding reset. Restart the app.'); } },
              ]);
            }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.accentBlue }]}>Reset Onboarding</Text>
                <Text style={[styles.rowSub, { color: theme.textMuted }]}>Returns to welcome screen on next launch.</Text>
              </View>
              <Ionicons name="refresh-outline" size={18} color={theme.accentBlue} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.row, { borderTopColor: theme.borderCard }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); fixDefaultTags(); }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.accentAmber }]}>Fix Default Tags</Text>
                <Text style={[styles.rowSub, { color: theme.textMuted }]}>Resets default tag names/colors.</Text>
              </View>
              <Ionicons name="construct-outline" size={18} color={theme.accentAmber} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.row, { borderTopColor: theme.borderCard }]} onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              Alert.alert('Reset Workout State', 'This will clear all workout data including exercises, notes, cardio logs, and weekly template. Your food, profile, and settings data will not be affected.\n\nThis cannot be undone.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Reset', style: 'destructive', onPress: async () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); await AsyncStorage.removeItem('pj_workout_state'); Alert.alert('Done', 'Workout state cleared. Restart the app.'); } },
              ]);
            }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.accentRed }]}>Reset Workout State</Text>
                <Text style={[styles.rowSub, { color: theme.textMuted }]}>Clears exercises, notes, logs, template.</Text>
              </View>
              <Ionicons name="trash-outline" size={18} color={theme.accentRed} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.row, { borderTopColor: theme.borderCard }]} onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              Alert.alert('Reset Achievements', 'Clear all unlocked achievements? This cannot be undone.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Reset', style: 'destructive', onPress: async () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); await AsyncStorage.removeItem('pj_achievements'); await AsyncStorage.removeItem('pj_goal_hit_counts'); await AsyncStorage.removeItem('pj_daily_goal_celebrations'); await AsyncStorage.removeItem('pj_momentum_checked'); Alert.alert('Done', 'Achievements and goal counts cleared.'); } },
              ]);
            }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.accentRed }]}>Reset Achievements</Text>
                <Text style={[styles.rowSub, { color: theme.textMuted }]}>Clears all unlocked achievements.</Text>
              </View>
              <Ionicons name="trophy-outline" size={18} color={theme.accentRed} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.row, { borderTopColor: theme.borderCard }]} onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              Alert.alert('Clear Food History', 'This will remove all logged food entries from the last 90 days. Water, steps, sleep, and weight data will not be affected.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Clear', style: 'destructive', onPress: async () => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
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
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              Alert.alert('Reset Tooltip States', 'Re-enable all (i) pulse animations?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Reset', style: 'destructive', onPress: async () => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
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
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              Alert.alert('Force Restore from Firestore', 'This wipes all local pj_* data and pulls everything from your cloud backup. Use only if your data is missing after signing in.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Restore', style: 'destructive', onPress: async () => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
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
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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

      {/* Floating save bar for goals */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, display: hasGoalChanges ? 'flex' : 'none' }}>
        <Animated.View style={{
          paddingHorizontal: 16, paddingTop: 12, paddingBottom: goalKeyboardHeight > 0 ? 12 : 16,
          backgroundColor: theme.bgSheet, borderTopWidth: 0.5, borderTopColor: theme.borderCard,
          transform: [{ translateY: goalFloatAnim.interpolate({ inputRange: [0, 1], outputRange: [200, 0] }) }],
        }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                Keyboard.dismiss();
                setGoalProfile(savedGoalProfile);
                hasGoalChangesRef.current = false;
                setHasGoalChanges(false);
                Animated.timing(goalFloatAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
              }}
              style={{ backgroundColor: theme.bgInput, borderWidth: 0.5, borderColor: theme.borderInput, borderRadius: 10, padding: 16, alignItems: 'center', width: 90 }}>
              <Text style={{ fontSize: 18, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2, color: theme.textMuted }}>CANCEL</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); saveGoals(); }}
              disabled={!isMacroValid()}
              style={{ flex: 1, backgroundColor: isMacroValid() ? theme.accentBlue : theme.bgInput, borderWidth: isMacroValid() ? 0 : 0.5, borderColor: theme.borderInput, borderRadius: 10, padding: 16, alignItems: 'center' }}>
              <Text style={{ fontSize: 18, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2, color: isMacroValid() ? theme.bgPrimary : theme.textMuted }}>
                {goalSaved ? 'SAVED' : !isMacroValid() ? 'FIX MACROS TO SAVE' : 'SAVE GOALS'}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>

      {/* Time picker modal for notification settings */}
      <Modal
        visible={!!activeTimePicker}
        transparent
        animationType="none"
        onRequestClose={closeTimePicker}
        onShow={() => {
          sheetAnim.setValue(300);
          overlayAnim.setValue(0);
          Animated.parallel([
            Animated.timing(sheetAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
            Animated.timing(overlayAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
          ]).start();
        }}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', opacity: overlayAnim }} pointerEvents="none" />
          <TouchableOpacity style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} activeOpacity={1} onPress={closeTimePicker} />
          <Animated.View style={{ backgroundColor: theme.bgSheet, borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: insets.bottom + 8, transform: [{ translateY: sheetAnim }] }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6 }}>
              <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); closeTimePicker(); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={{ fontSize: 14, fontFamily: 'DMSans_400Regular', color: theme.textMuted }}>Cancel</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 11, fontFamily: 'DMSans_700Bold', letterSpacing: 2, color: theme.accentBlueRaw, textTransform: 'uppercase' }}>Set Time</Text>
              <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); confirmTimePicker(); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={{ fontSize: 14, fontFamily: 'DMSans_600SemiBold', color: theme.accentBlueRaw }}>Done</Text>
              </TouchableOpacity>
            </View>
            <View style={{ width: Dimensions.get('window').width, alignItems: 'center' }}>
              {!!activeTimePicker && (
                <DateTimePicker
                  value={timePickerValue}
                  mode="time"
                  display="spinner"
                  textColor={theme.textPrimary}
                  onChange={(_, date) => { if (date) setTimePickerValue(date); }}
                  style={{ height: 200, width: Dimensions.get('window').width }}
                />
              )}
            </View>
          </Animated.View>
        </View>
      </Modal>

      <PrayerRequestModal visible={showPrayerModal} onClose={() => setShowPrayerModal(false)} />

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
  goalLabel:   { fontSize: 9, fontFamily: 'DMSans_700Bold', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6, marginTop: 2 },
  goalHint:    { fontSize: 11, fontFamily: 'DMSans_400Regular', fontStyle: 'italic', marginTop: 4 },
  goalInput:   { borderWidth: 0.5, borderRadius: 8, padding: 10, fontSize: 15, fontFamily: 'DMSans_400Regular', marginBottom: 4 },
  modeBtn:     { flex: 1, padding: 10, borderWidth: 0.5, borderRadius: 8, alignItems: 'center' },
});
