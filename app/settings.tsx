import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Dimensions, Easing, InteractionManager, Keyboard, KeyboardAvoidingView, Linking, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ACCENT_PALETTES, THEME_ORDER, ThemeId, THEMES, useTheme } from '../theme';
import { useHealthKit, restoreAppleWorkoutHistory } from '../useHealthKit';
import { useAuth } from '../AuthContext';
import { BLANK_DAY, WorkoutTag } from '../workoutData';
import CelebrationOverlay from '../components/CelebrationOverlay';
import { showAchievementToast } from '../components/AchievementToast';
import { ACHIEVEMENTS, loadAchievements, checkAndUnlock, loadGoalHitCounts, checkSleepAchievements, checkNutritionAchievements, checkMomentumAchievements, checkWorkoutAchievements, checkFaithAchievements } from '../achievementData';
import { collection, getDocs } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app, auth, db, saveToFirebase } from '../firebaseConfig';
import { shouldSync, uploadAllLocal, resetRestoreGate } from '../services/syncService';
import { storageSet } from '../utils/storage';
import { setOnboardingPreview } from '../utils/onboardingPreview';
import { generateDiagnosticReport, ReportWindow, dumpWindowComparison } from '../utils/diagnosticReport';
import { dumpDayScoreWithRecovery } from '../utils/dayScoreStore';
import { probeStreakExclusions } from '../utils/streakExclusion';
import { startVacation, endVacationEarly, cancelVacationFully, describeVacation, getVacation, vacationTodayKey, addDaysKey, MAX_VACATION_DAYS, VacationState } from '../utils/vacationMode';

const VAC_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const VAC_DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const VAC_DOW3 = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const VAC_INTRO: Record<string, string> = {
  discipline: 'Planned time off. Your streaks hold and nothing counts while you are away. Sleep and recovery still show, just for your eyes.',
  balanced: 'Taking a trip? Pause everything and pick back up right where you left off when you are back.',
  mindful: 'Rest is part of the work. Take the time you need, we will be right here when you return.',
};
function vacFmtNice(key: string): string {
  const d = new Date(key + 'T00:00:00');
  return `${VAC_DOW3[d.getDay()]} ${VAC_MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
}
import { voiceDiagnosticCards, getLastVoiceDebug } from '../utils/coachAI';
import { dumpHomeCoachCandidates, dumpEvrRecoveryDebug } from '../utils/smartTipsEngine';
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
import { TUTORIALS } from '../data/tutorials';
import { resetAllTutorials, useTutorial } from '../context/TutorialContext';
import { showToolkit } from '../components/ToolkitSheet';
import { generateWeeklySummary } from '../utils/weeklySummary';
import { generateMonthlySummary } from '../utils/monthlySummary';

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
  forceOpen,
  children,
  theme,
  rootRef,
}: {
  label: string;
  subtitle?: string;
  defaultOpen?: boolean;
  forceOpen?: boolean;
  children: React.ReactNode;
  theme: any;
  rootRef?: any;
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

  useEffect(() => {
    if (forceOpen && !openRef.current) toggle();
  }, [forceOpen]);

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
    <View ref={rootRef} style={[styles.section, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: theme.borderCardTop }]}>
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
        onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); toggle(); }}
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
        onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); toggle(); }}
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
  const [showNetCarbs, setShowNetCarbs] = useState(false);
  const [styleMode, setStyleMode] = useState<'discipline' | 'balanced' | 'mindful'>('balanced');
  const [mindfulGrowthAreas, setMindfulGrowthAreas] = useState(false);
  const [faithStyleForceOpen, setFaithStyleForceOpen] = useState(false);
  const [goalsForceOpen, setGoalsForceOpen] = useState(false);
  const [notifForceOpen, setNotifForceOpen] = useState(false);
  // Tutorial-only visual flag: forces the master-gated and Fitness-gated notification
  // content to render during the Notifications tour even if the user has those toggled
  // off. Never touches real settings or triggers a permission prompt. Reset on tour end.
  const [notifTutorialActive, setNotifTutorialActive] = useState(false);
  const [faithJourney, setFaithJourney] = useState<FaithJourney>('rooted');
  const [burnAccuracyPct, setBurnAccuracyPct] = useState(100);
  // Vacation Mode (own Settings section)
  const [vacationForceOpen, setVacationForceOpen] = useState(false);
  const vacCardRef = useRef<any>(null);
  const [vacation, setVacation] = useState<VacationState | null>(null);
  const [vacStartKey, setVacStartKey] = useState<string>(() => vacationTodayKey());
  const [vacDays, setVacDays] = useState(7);
  const [vacCalMonth, setVacCalMonth] = useState(() => new Date().getMonth());
  const [vacCalYear, setVacCalYear] = useState(() => new Date().getFullYear());
  const [vacBusy, setVacBusy] = useState(false);
  const [devCelebVisible, setDevCelebVisible] = useState(false);
  const [devCelebTier, setDevCelebTier] = useState<'small' | 'medium' | 'large' | 'diamond'>('small');
  const [devCelebLabel, setDevCelebLabel] = useState<string | undefined>(undefined);
  const [devTapCount, setDevTapCount] = useState(0);
  const [devUnlocked, setDevUnlocked] = useState(false);
  const [devForceSleepManual, setDevForceSleepManual] = useState(false);
  const [devProUnlocked, setDevProUnlocked] = useState(false);
  const [importRange, setImportRange] = useState<14 | 30 | 90>(30);
  const [importing, setImporting] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [activeTooltipKey, setActiveTooltipKey] = useState<string | null>(null);
  const [showPrayerModal, setShowPrayerModal] = useState(false);
  const scrollViewRef = useRef<any>(null);
  const quietHoursRowRef = useRef<any>(null);
  const { section: deepLinkSection } = useLocalSearchParams<{ section?: string }>();
  const fsCoachingSectionRef = useRef<any>(null);
  const fsDisciplineRef = useRef<any>(null);
  const fsBalancedRef = useRef<any>(null);
  const fsMindfulRef = useRef<any>(null);
  const fsFaithSectionRef = useRef<any>(null);
  const fsRootedRef = useRef<any>(null);
  const fsExploringRef = useRef<any>(null);
  const fsNotRightNowRef = useRef<any>(null);
  // Goals tutorial targets
  const goalsStepsRef = useRef<any>(null);
  const goalsMovementRef = useRef<any>(null);
  const goalsSleepRef = useRef<any>(null);
  const goalsCaloriesRef = useRef<any>(null);
  const goalsNetCarbsRef = useRef<any>(null);
  const goalsMacrosRef = useRef<any>(null);
  const goalsWaterRef = useRef<any>(null);
  // Notifications tutorial targets
  const notifMasterRef = useRef<any>(null);
  const notifStreakRef = useRef<any>(null);
  const notifCapRef = useRef<any>(null);
  const notifCategoriesRef = useRef<any>(null);
  const notifWaterRef = useRef<any>(null);
  const notifAdvancedRef = useRef<any>(null);
  const { startTutorial, registerTarget, unregisterTarget, registerScrollView, unregisterScrollView, registerTutorialAction, unregisterTutorialAction } = useTutorial();
  const macrosRef = useRef<any>(null);
  // Deep link from the macro modal's "Fine-tune in Settings > Goals" pointer: open the
  // Goals section (via defaultOpen below) and scroll straight to the Macros block. Wait
  // for the nav transition to finish, then measure the Macros row's real position
  // relative to the scroll view (measureLayout is reliable regardless of timing).
  useEffect(() => {
    if (deepLinkSection !== 'goals') return;
    const task = InteractionManager.runAfterInteractions(() => {
      setTimeout(() => {
        macrosRef.current?.measureLayout?.(
          scrollViewRef.current,
          (_x: number, y: number) => scrollViewRef.current?.scrollTo({ y: Math.max(0, y - 16), animated: true }),
          () => {},
        );
      }, 150);
    });
    return () => task.cancel();
  }, [deepLinkSection]);

  useEffect(() => {
    registerTarget('fs_coaching_section', fsCoachingSectionRef);
    registerTarget('fs_discipline_btn', fsDisciplineRef);
    registerTarget('fs_balanced_btn', fsBalancedRef);
    registerTarget('fs_mindful_btn', fsMindfulRef);
    registerTarget('fs_faith_section', fsFaithSectionRef);
    registerTarget('fs_rooted_btn', fsRootedRef);
    registerTarget('fs_exploring_btn', fsExploringRef);
    registerTarget('fs_notrightnow_btn', fsNotRightNowRef);
    registerTarget('goals_steps', goalsStepsRef);
    registerTarget('goals_movement', goalsMovementRef);
    registerTarget('goals_sleep', goalsSleepRef);
    registerTarget('goals_calories', goalsCaloriesRef);
    registerTarget('goals_netcarbs', goalsNetCarbsRef);
    registerTarget('goals_macros', goalsMacrosRef);
    registerTarget('goals_water', goalsWaterRef);
    registerTarget('notif_master', notifMasterRef);
    registerTarget('notif_quiet', quietHoursRowRef);
    registerTarget('notif_streak', notifStreakRef);
    registerTarget('notif_cap', notifCapRef);
    registerTarget('notif_categories', notifCategoriesRef);
    registerTarget('notif_water', notifWaterRef);
    registerTarget('notif_advanced', notifAdvancedRef);
    registerScrollView('settings_main', scrollViewRef);
    registerTutorialAction('openFaithStyleSection', async () => {
      setFaithStyleForceOpen(true);
      await new Promise(r => setTimeout(r, 350));
    });
    registerTutorialAction('openGoalsSection', async () => {
      setGoalsForceOpen(true);
      await new Promise(r => setTimeout(r, 400));
    });
    registerTutorialAction('openNotificationsSection', async () => {
      setNotifTutorialActive(true);
      setNotifForceOpen(true);
      await new Promise(r => setTimeout(r, 450));
    });
    registerTutorialAction('closeNotificationsTutorial', async () => {
      setNotifTutorialActive(false);
    });
    registerTutorialAction('openVacationSection', async () => {
      setVacationForceOpen(true);
      await new Promise(r => setTimeout(r, 400));
      registerTarget('vac_card', vacCardRef);
    });
    return () => {
      unregisterTarget('fs_coaching_section');
      unregisterTarget('fs_discipline_btn');
      unregisterTarget('fs_balanced_btn');
      unregisterTarget('fs_mindful_btn');
      unregisterTarget('fs_faith_section');
      unregisterTarget('fs_rooted_btn');
      unregisterTarget('fs_exploring_btn');
      unregisterTarget('fs_notrightnow_btn');
      unregisterTarget('goals_steps');
      unregisterTarget('goals_movement');
      unregisterTarget('goals_sleep');
      unregisterTarget('goals_calories');
      unregisterTarget('goals_netcarbs');
      unregisterTarget('goals_macros');
      unregisterTarget('goals_water');
      unregisterTarget('notif_master');
      unregisterTarget('notif_quiet');
      unregisterTarget('notif_streak');
      unregisterTarget('notif_cap');
      unregisterTarget('notif_categories');
      unregisterTarget('notif_water');
      unregisterTarget('notif_advanced');
      unregisterScrollView('settings_main');
      unregisterTutorialAction('openFaithStyleSection');
      unregisterTutorialAction('openGoalsSection');
      unregisterTutorialAction('openNotificationsSection');
      unregisterTutorialAction('closeNotificationsTutorial');
      unregisterTutorialAction('openVacationSection');
      unregisterTarget('vac_card');
    };
  }, []);

  const { fetchHistoricalWorkouts, authorized, fetchOvernightRHR, dumpHRV } = useHealthKit();

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

  useEffect(() => { getVacation().then(setVacation).catch(() => {}); }, []);

  const handleStartVacation = async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    setVacBusy(true);
    try {
      await startVacation(vacStartKey, vacDays);
      setVacation(await getVacation());
      showToast('Vacation set', `Back ${vacFmtNice(addDaysKey(vacStartKey, vacDays))}`, 'success');
    } catch { showToast('Could not set vacation', undefined, 'error'); }
    setVacBusy(false);
  };

  const handleEndVacation = async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    setVacBusy(true);
    try {
      await endVacationEarly();
      setVacation(await getVacation());
      showToast('Vacation ended', undefined, 'success');
    } catch { showToast('Could not end vacation', undefined, 'error'); }
    setVacBusy(false);
  };

  const renderVacCalGrid = () => {
    const firstDay = new Date(vacCalYear, vacCalMonth, 1).getDay();
    const daysInMonth = new Date(vacCalYear, vacCalMonth + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    const rows: (number | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    const hit = { top: 10, bottom: 10, left: 10, right: 10 };
    return (
      <View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <TouchableOpacity hitSlop={hit} onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); if (vacCalMonth === 0) { setVacCalMonth(11); setVacCalYear(y => y - 1); } else setVacCalMonth(m => m - 1); }}>
            <Ionicons name="chevron-back" size={20} color={theme.accentBlue} />
          </TouchableOpacity>
          <Text style={{ fontSize: 15, color: theme.accentBlue, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1 }}>{VAC_MONTHS[vacCalMonth]} {vacCalYear}</Text>
          <TouchableOpacity hitSlop={hit} onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); if (vacCalMonth === 11) { setVacCalMonth(0); setVacCalYear(y => y + 1); } else setVacCalMonth(m => m + 1); }}>
            <Ionicons name="chevron-forward" size={20} color={theme.accentBlue} />
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row', marginBottom: 6 }}>
          {VAC_DAYS_OF_WEEK.map(d => (
            <View key={d} style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontSize: 9, color: theme.textDim, fontFamily: 'DMSans_700Bold', letterSpacing: 1 }}>{d}</Text>
            </View>
          ))}
        </View>
        {rows.map((row, ri) => (
          <View key={ri} style={{ flexDirection: 'row', marginBottom: 2 }}>
            {row.map((day, ci) => {
              if (!day) return <View key={ci} style={{ flex: 1 }} />;
              const dk = `${vacCalYear}-${String(vacCalMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isSel = dk === vacStartKey;
              return (
                <TouchableOpacity key={ci} style={{ flex: 1, alignItems: 'center', paddingVertical: 5 }} activeOpacity={0.7}
                  onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setVacStartKey(dk); }}>
                  <View style={{ width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: isSel ? theme.accentBlueRaw : 'transparent' }}>
                    <Text style={{ fontSize: 13, fontFamily: isSel ? 'DMSans_700Bold' : 'DMSans_400Regular', color: isSel ? '#fff' : theme.textSecondary }}>{day}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  useEffect(() => {
    const load = async () => {
      try {
        const saved = await AsyncStorage.getItem('pj_settings');
        if (saved) {
          const data = JSON.parse(saved);
          if (data.hapticsEnabled !== undefined) setHapticsEnabled(data.hapticsEnabled);
          if (data.showNetCarbs !== undefined) setShowNetCarbs(data.showNetCarbs);
          if (data.styleMode) setStyleMode(data.styleMode);
          if (data.mindfulGrowthAreas !== undefined) setMindfulGrowthAreas(data.mindfulGrowthAreas);
          if (data.faithJourney) setFaithJourney(data.faithJourney);
          if (data.burnAccuracyPct !== undefined) setBurnAccuracyPct(data.burnAccuracyPct);
          if (data.devForceSleepManual !== undefined) setDevForceSleepManual(data.devForceSleepManual);
          if (data.devProUnlocked !== undefined) setDevProUnlocked(data.devProUnlocked);
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

  // When a goal changes, retroactively stamp the OLD goal onto any historical daily
  // records that predate the snapshot system (no waterGoal/stepGoal/sleepGoal field yet).
  // This prevents goal increases from retroactively breaking streak history.
  const stampGoalsOnHistoricalDays = async (
    oldWater: number | null, newWater: number | null,
    oldStep: number | null, newStep: number | null,
    oldSleep: number | null, newSleep: number | null,
  ) => {
    const waterChanged = oldWater !== null && newWater !== null && oldWater !== newWater;
    const stepChanged  = oldStep  !== null && newStep  !== null && oldStep  !== newStep;
    const sleepChanged = oldSleep !== null && newSleep !== null && oldSleep !== newSleep;
    if (!waterChanged && !stepChanged && !sleepChanged) return;
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const dayKeys = allKeys.filter((k: string) => /^pj_\d{4}-\d{2}-\d{2}$/.test(k));
      if (dayKeys.length === 0) return;
      const pairs = await AsyncStorage.multiGet(dayKeys);
      const updates: [string, string][] = [];
      for (const [key, val] of pairs) {
        if (!val) continue;
        try {
          const data = JSON.parse(val);
          const patch: Record<string, number> = {};
          if (waterChanged && (data.water || 0) > 0 && data.waterGoal === undefined) patch.waterGoal = oldWater!;
          if (stepChanged  && (data.steps  || 0) > 0 && data.stepGoal  === undefined) patch.stepGoal  = oldStep!;
          if (sleepChanged && (data.sleepHours || 0) > 0 && data.sleepGoal === undefined) patch.sleepGoal = oldSleep!;
          if (Object.keys(patch).length > 0) updates.push([key, JSON.stringify({ ...data, ...patch })]);
        } catch {}
      }
      for (const [k, v] of updates) await storageSet(k, v);
    } catch {}
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

      // Stamp old goals onto historical days before saving new goals
      const oldWater = base.waterGoal ? parseFloat(base.waterGoal) : null;
      const newWater = synced.waterGoal ? parseFloat(synced.waterGoal) : null;
      const oldStep  = base.stepGoal  ? parseFloat(base.stepGoal)  : null;
      const newStep  = synced.stepGoal  ? parseFloat(synced.stepGoal)  : null;
      const oldSleep = base.sleepGoal ? parseFloat(base.sleepGoal) : null;
      const newSleep = synced.sleepGoal ? parseFloat(synced.sleepGoal) : null;
      await stampGoalsOnHistoricalDays(oldWater, newWater, oldStep, newStep, oldSleep, newSleep);

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
      if (key === 'quietStart') {
        updateNotifSettings({ ...notifSettings, quietStart: timeStr });
      } else if (key === 'quietEnd') {
        updateNotifSettings({ ...notifSettings, quietEnd: timeStr });
      } else {
        updateNotifSettings({ ...notifSettings, [key]: timeStr } as NotificationSettings);
      }
    });
  };

  const toggleHaptics = (val: boolean) => {
    setHapticsEnabled(val);
    saveSetting('hapticsEnabled', val);
  };

  const appVersion = Constants.expoConfig?.version ?? '1.0';


  return (
    <LinearGradient colors={[theme.gradientStart, theme.gradientEnd]} style={{ flex: 1, paddingTop: insets.top }}>
      <View style={[styles.header, { borderBottomColor: theme.borderCard }]}>
        <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); router.back(); }} style={{ marginRight: 12 }}>
          <Ionicons name="arrow-back" size={22} color={theme.accentBlue} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <TouchableOpacity onPress={() => {
            const next = devTapCount + 1;
            setDevTapCount(next);
            if (next >= 7) { setDevUnlocked(true); setDevTapCount(0); }
          }}>
            <Text style={[styles.headerTitle, { color: theme.accentBlue }]}>Settings</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); showToolkit('settings'); }} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <Ionicons name="help-circle" size={22} color={theme.accentBlue} />
        </TouchableOpacity>
      </View>

      <ScrollView ref={scrollViewRef} contentContainerStyle={styles.content} automaticallyAdjustKeyboardInsets={true} onScroll={e => { goalScrollOffset.current = e.nativeEvent.contentOffset.y; }} scrollEventThrottle={16}>

        {/* ── Appearance ── */}
        <CollapsibleSection label="Appearance" subtitle="Theme · Accent · Haptics" defaultOpen={false} theme={theme}>
          <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 10 }}>
            {THEME_ORDER.map((id: ThemeId) => {
              const t = THEMES[id];
              const isActive = themeId === id;
              const previewBg: Record<string, string> = { dark: '#1a1a24', light: '#ffffff', slate: '#d8dde4', warm: '#6b5a48', blush: '#f5e8ec' };
              const previewText: Record<string, string> = { dark: '#e8e8f0', light: '#1a1a2e', slate: '#1c2533', warm: '#f0e8d8', blush: '#3a1a24' };
              const previewAccent: Record<string, string> = { dark: '#3b82f6', light: '#2563eb', slate: '#4a7fa5', warm: '#f0a040', blush: '#cc1144' };
              return (
                <TouchableOpacity
                  key={id}
                  onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setTheme(id); }}
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
                      <TouchableOpacity key={accent.id} onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setAccent(accent.id); }} style={{ width: itemW, alignItems: 'center', gap: 4, marginBottom: 10 }}>
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
        <CollapsibleSection label="Goals" subtitle="Fitness · Nutrition" defaultOpen={deepLinkSection === 'goals'} forceOpen={goalsForceOpen} theme={theme}>
          <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>

            {/* FITNESS GOALS */}
            <View style={{ borderLeftWidth: 3, borderLeftColor: theme.accentBlueRaw, paddingLeft: 10, marginBottom: 16, marginTop: 4 }}>
              <Text style={{ fontSize: 11, fontFamily: 'DMSans_700Bold', color: theme.accentBlue, letterSpacing: 2, textTransform: 'uppercase' }}>Fitness Goals</Text>
            </View>

            {/* Steps */}
            <View ref={goalsStepsRef}>
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
            </View>

            <View style={{ height: 1, backgroundColor: theme.borderCard, marginVertical: 16 }} />

            {/* Active Calories + Exercise Minutes */}
            <View ref={goalsMovementRef}>
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
            </View>

            <View style={{ height: 1, backgroundColor: theme.borderCard, marginVertical: 16 }} />

            {/* Sleep Goal */}
            <View ref={goalsSleepRef}>
              <Text style={[styles.goalLabel, { color: theme.textMuted }]}>Sleep Goal</Text>
              <Text style={{ fontSize: 11, fontFamily: 'DMSans_400Regular', fontStyle: 'italic', color: theme.textMuted, marginBottom: 12 }}>How many hours of sleep are you aiming for each night?</Text>
              <View style={{ backgroundColor: theme.bgInset, borderRadius: 10, paddingVertical: 16, paddingHorizontal: 8 }}>
                <SleepGoalPicker value={goalProfile.sleepGoal || '7'} onChange={v => updateGoalField('sleepGoal', v)} theme={theme} />
              </View>
            </View>

            <View style={{ height: 1, backgroundColor: theme.borderCard, marginTop: 20, marginBottom: 16 }} />

            {/* NUTRITION GOALS */}
            <View style={{ borderLeftWidth: 3, borderLeftColor: theme.accentBlueRaw, paddingLeft: 10, marginBottom: 16 }}>
              <Text style={{ fontSize: 11, fontFamily: 'DMSans_700Bold', color: theme.accentBlue, letterSpacing: 2, textTransform: 'uppercase' }}>Nutrition Goals</Text>
            </View>

            {/* Calorie Target */}
            <View ref={goalsCaloriesRef}>
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
            </View>

            <View style={{ height: 1, backgroundColor: theme.borderCard, marginVertical: 16 }} />

            {/* Net Carbs toggle */}
            <View ref={goalsNetCarbsRef}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={[styles.goalLabel, { color: theme.textMuted, marginBottom: 2 }]}>Net Carbs Mode</Text>
                  <Text style={{ fontSize: 11, color: theme.textDim, fontFamily: 'DMSans_400Regular', lineHeight: 15 }}>
                    Shows total carbs minus fiber everywhere in the app.
                  </Text>
                </View>
                <ToggleSwitch value={showNetCarbs} onValueChange={v => { setShowNetCarbs(v); saveSetting('showNetCarbs', v); triggerHaptic(Haptics.ImpactFeedbackStyle.Light); }} />
              </View>
              {showNetCarbs && (
                <View style={{ backgroundColor: theme.bgInset, borderRadius: 8, padding: 10, marginBottom: 8 }}>
                  <Text style={{ fontSize: 11, color: theme.textMuted, fontFamily: 'DMSans_400Regular', lineHeight: 16 }}>
                    Net carbs mode is on. Your Carbs goal below now represents your net carbs target. Update it if you'd like a more specific number.
                  </Text>
                </View>
              )}
            </View>

            <View ref={macrosRef} style={{ height: 1, backgroundColor: theme.borderCard, marginVertical: 16 }} />

            {/* Macros */}
            <View ref={goalsMacrosRef}>
              <Text style={[styles.goalLabel, { color: theme.textMuted }]}>Macros</Text>
              <Text style={{ fontSize: 11, fontFamily: 'DMSans_400Regular', fontStyle: 'italic', color: theme.textMuted, marginBottom: 14 }}>
                {goalProfile.macroMode === 'ratio'
                  ? 'Set percentages. Grams update automatically when your calorie target changes.'
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
            </View>

            {goalProfile.macroMode === 'ratio' ? (
              <View>
                {[
                  { label: 'Protein',                         pctKey: 'macroProteinPct' as keyof GoalProfile, color: theme.macroProtein },
                  { label: showNetCarbs ? 'Net Carbs' : 'Carbs', pctKey: 'macroCarbsPct'   as keyof GoalProfile, color: theme.macroCarbs },
                  { label: 'Fat',                             pctKey: 'macroFatPct'     as keyof GoalProfile, color: theme.macroFat },
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
                          style={[styles.goalInput, { backgroundColor: theme.bgInput, borderColor: theme.borderInput, borderLeftColor: color, borderLeftWidth: 3, color, flex: 1, marginBottom: 0, textAlign: 'center', fontSize: 20, fontFamily: 'BebasNeue_400Regular' }]}
                          value={goalProfile[pctKey] as string}
                          onChangeText={v => updateGoalField(pctKey, v)}
                          keyboardType="number-pad"
                          maxLength={3}
                          placeholder="0"
                          placeholderTextColor={theme.textPlaceholder}
                        />
                        <Text style={{ color: theme.textMuted, fontSize: 16, fontFamily: 'DMSans_400Regular' }}>%</Text>
                        <View style={{ flex: 2, backgroundColor: theme.bgInset, borderRadius: 8, borderWidth: 0.5, borderColor: color + '50', padding: 10, flexDirection: 'row', justifyContent: 'space-between' }}>
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
                  { label: 'Protein',                            gKey: 'macroProteinG' as keyof GoalProfile, color: theme.macroProtein, calsPerGram: 4 },
                  { label: showNetCarbs ? 'Net Carbs' : 'Carbs', gKey: 'macroCarbsG'   as keyof GoalProfile, color: theme.macroCarbs,   calsPerGram: 4 },
                  { label: 'Fat',                                gKey: 'macroFatG'     as keyof GoalProfile, color: theme.macroFat,     calsPerGram: 9 },
                ].map(({ label, gKey, color, calsPerGram }) => {
                  const grams = parseFloat(goalProfile[gKey] as string) || 0;
                  const kcal  = Math.round(grams * calsPerGram);
                  const pct   = goalKcalTarget > 0 ? Math.round((kcal / goalKcalTarget) * 100) : 0;
                  return (
                    <View key={label} style={{ marginBottom: 12 }}>
                      <Text style={[styles.goalLabel, { color: theme.textMuted }]}>{label}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <TextInput
                          style={[styles.goalInput, { backgroundColor: theme.bgInput, borderColor: theme.borderInput, borderLeftColor: color, borderLeftWidth: 3, color, flex: 1, marginBottom: 0, textAlign: 'center', fontSize: 20, fontFamily: 'BebasNeue_400Regular' }]}
                          value={goalProfile[gKey] as string}
                          onChangeText={v => updateGoalField(gKey, v)}
                          keyboardType="number-pad"
                          maxLength={4}
                          placeholder="0"
                          placeholderTextColor={theme.textPlaceholder}
                        />
                        <Text style={{ color: theme.textMuted, fontSize: 16, fontFamily: 'DMSans_400Regular' }}>g</Text>
                        <View style={{ flex: 2, backgroundColor: theme.bgInset, borderRadius: 8, borderWidth: 0.5, borderColor: color + '50', padding: 10, flexDirection: 'row', justifyContent: 'space-between' }}>
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
            <View ref={goalsWaterRef}>
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
            </View>

            <View style={{ height: 16 }} />
          </View>
        </CollapsibleSection>

        {/* ── Faith & Style ── */}
        <CollapsibleSection label="Faith & Style" subtitle="Coaching Mode · Faith Journey" defaultOpen={deepLinkSection === 'faith_style'} forceOpen={faithStyleForceOpen} theme={theme}>
          <View ref={fsCoachingSectionRef} style={{ borderLeftWidth: 3, borderLeftColor: theme.accentBlueRaw, paddingLeft: 10, marginHorizontal: 16, marginBottom: 8 }}>
            <Text style={{ fontSize: 11, fontFamily: 'DMSans_700Bold', color: theme.accentBlue, letterSpacing: 2, textTransform: 'uppercase' }}>Coaching Mode</Text>
          </View>
          {([
            { key: 'discipline', label: 'Discipline', sub: 'Tight targets. Direct feedback. Commit fully.' },
            { key: 'balanced',   label: 'Balanced',   sub: 'Encouraging. Forgiving. Steady progress.' },
            { key: 'mindful',    label: 'Mindful',    sub: 'Observational. No judgment. Show up.' },
          ] as const).map(({ key, label, sub }) => {
            const isActive = styleMode === key;
            const modeRef = key === 'discipline' ? fsDisciplineRef : key === 'balanced' ? fsBalancedRef : fsMindfulRef;
            return (
              <View key={key} ref={modeRef}>
                <TouchableOpacity
                  style={[styles.row, { borderTopColor: theme.borderCard }]}
                  onPress={() => {
                    if (isActive) return;
                    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
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
              </View>
            );
          })}

          {styleMode === 'mindful' && (
            <View style={[styles.row, { borderTopColor: theme.borderCard, justifyContent: 'space-between' }]}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={[styles.rowTitle, { color: theme.textPrimary }]}>Allow gentle coaching</Text>
                <Text style={[styles.rowSub, { color: theme.textMuted }]}>Show growth areas and soft nudges</Text>
              </View>
              <ToggleSwitch
                value={mindfulGrowthAreas}
                onValueChange={val => { setMindfulGrowthAreas(val); saveSetting('mindfulGrowthAreas', val); }}
              />
            </View>
          )}

          <View ref={fsFaithSectionRef} style={{ borderLeftWidth: 3, borderLeftColor: theme.accentBlueRaw, paddingLeft: 10, marginHorizontal: 16, marginTop: 16, marginBottom: 8 }}>
            <Text style={{ fontSize: 11, fontFamily: 'DMSans_700Bold', color: theme.accentBlue, letterSpacing: 2, textTransform: 'uppercase' }}>Faith Journey</Text>
          </View>
          {([
            { key: 'rooted',      label: 'Rooted',        sub: 'Full faith experience. Daily verse, prayer, Bible reader.' },
            { key: 'exploring',   label: 'Exploring',     sub: 'Faith features present but gentle.' },
            { key: 'notrightnow', label: 'Not Right Now', sub: 'Pure fitness experience. No faith content.' },
          ] as const).map(({ key, label, sub }) => {
            const isActive = faithJourney === key;
            const fjRef = key === 'rooted' ? fsRootedRef : key === 'exploring' ? fsExploringRef : fsNotRightNowRef;
            return (
              <View key={key} ref={fjRef}>
                <TouchableOpacity
                  style={[styles.row, { borderTopColor: theme.borderCard }]}
                  onPress={async () => {
                    if (isActive) return;
                    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
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
              </View>
            );
          })}
          <View style={{ paddingBottom: 8 }} />
        </CollapsibleSection>

        {/* ── Health ── */}
        <CollapsibleSection label="Health" subtitle="Burn Accuracy · Apple Health" defaultOpen={false} theme={theme}>
          <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 10 }}>
            <View style={{ borderLeftWidth: 3, borderLeftColor: theme.accentBlueRaw, paddingLeft: 10, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 11, fontFamily: 'DMSans_700Bold', color: theme.accentBlue, letterSpacing: 2, textTransform: 'uppercase', flex: 1 }}>Active Calorie Accuracy</Text>
              <TooltipIcon tooltipKey="burn_accuracy" />
            </View>
            <Text style={{ fontSize: 12, fontFamily: 'DMSans_400Regular', color: theme.textMuted, lineHeight: 18 }}>
              Smartwatches often overestimate burn. Apply a correction factor to keep your net calories honest.
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {([100, 90, 80, 70] as const).map(pct => (
                <TouchableOpacity
                  key={pct}
                  onPress={async () => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setBurnAccuracyPct(pct); await saveSetting('burnAccuracyPct', pct); }}
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

          <View style={{ borderLeftWidth: 3, borderLeftColor: theme.accentBlueRaw, paddingLeft: 10, marginHorizontal: 16, marginTop: 4, marginBottom: 12 }}>
            <Text style={{ fontSize: 11, fontFamily: 'DMSans_700Bold', color: theme.accentBlue, letterSpacing: 2, textTransform: 'uppercase' }}>Workout History Import</Text>
          </View>
          <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 12 }}>
            <Text style={{ fontSize: 12, fontFamily: 'DMSans_400Regular', color: theme.textMuted, lineHeight: 18 }}>
              Import your Apple Health workout history into Project J. Existing data and manual entries will not be affected.
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {([14, 30, 90] as const).map(d => (
                <TouchableOpacity
                  key={d}
                  onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setImportRange(d); }}
                  style={{ flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: importRange === d ? theme.accentBlueBorder : theme.borderInput, backgroundColor: importRange === d ? theme.accentBlueBg : theme.bgInput }}>
                  <Text style={{ fontSize: 11, fontFamily: 'DMSans_700Bold', color: importRange === d ? theme.accentBlue : theme.textMuted }}>
                    {d === 14 ? '2 WEEKS' : d === 30 ? '1 MONTH' : '3 MONTHS'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Medium); importWorkoutHistory(); }}
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

        {/* ── Vacation Mode ── */}
        <CollapsibleSection label="Vacation Mode" subtitle="Pause everything for a trip" defaultOpen={deepLinkSection === 'vacation'} forceOpen={vacationForceOpen} theme={theme}>
          <View ref={vacCardRef} collapsable={false} style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
            <Text style={{ fontSize: 13, fontFamily: 'DMSans_400Regular', color: theme.textMuted, lineHeight: 20, marginBottom: 16 }}>
              {VAC_INTRO[styleMode]}
            </Text>

            {vacation && vacation.active ? (
              <View>
                <View style={{ backgroundColor: theme.bgInput, borderRadius: 12, borderWidth: 1, borderColor: theme.borderInput, padding: 16, marginBottom: 14, alignItems: 'center' }}>
                  <Ionicons name="airplane" size={26} color={theme.accentBlue} style={{ marginBottom: 8 }} />
                  <Text style={{ fontSize: 11, fontFamily: 'DMSans_700Bold', letterSpacing: 2, color: theme.textMuted, textTransform: 'uppercase', marginBottom: 4 }}>
                    {vacationTodayKey() < vacation.startKey ? 'Scheduled' : 'On vacation'}
                  </Text>
                  <Text style={{ fontSize: 24, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1, color: theme.accentBlue, textAlign: 'center' }}>
                    {vacFmtNice(vacation.startKey)}  to  {vacFmtNice(vacation.endKey)}
                  </Text>
                  <Text style={{ fontSize: 12, fontFamily: 'DMSans_400Regular', color: theme.textMuted, marginTop: 4 }}>
                    Resumes {vacFmtNice(addDaysKey(vacation.endKey, 1))}
                  </Text>
                </View>
                <TouchableOpacity disabled={vacBusy} activeOpacity={0.7} onPress={handleEndVacation}
                  style={{ borderWidth: 1, borderColor: theme.accentRedBorder, backgroundColor: theme.accentRedBg, borderRadius: 8, paddingVertical: 12, alignItems: 'center', opacity: vacBusy ? 0.5 : 1 }}>
                  <Text style={{ fontSize: 13, fontFamily: 'DMSans_700Bold', color: theme.accentRed, letterSpacing: 1 }}>END EARLY</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <Text style={[styles.sectionLabel, { color: theme.textMuted, paddingHorizontal: 0, paddingBottom: 10 }]}>START DATE</Text>
                {renderVacCalGrid()}

                <Text style={[styles.sectionLabel, { color: theme.textMuted, paddingHorizontal: 0, paddingTop: 18, paddingBottom: 6 }]}>LENGTH</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 28, marginBottom: 8 }}>
                  <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} disabled={vacDays <= 1}
                    onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setVacDays(d => Math.max(1, d - 1)); }}>
                    <Ionicons name="remove-circle" size={34} color={vacDays <= 1 ? theme.textDim : theme.accentBlue} />
                  </TouchableOpacity>
                  <View style={{ alignItems: 'center', minWidth: 80 }}>
                    <Text style={{ fontSize: 34, fontFamily: 'BebasNeue_400Regular', color: theme.accentBlue }}>{vacDays}</Text>
                    <Text style={{ fontSize: 10, fontFamily: 'DMSans_700Bold', letterSpacing: 1, color: theme.textMuted, textTransform: 'uppercase' }}>{vacDays === 1 ? 'day' : 'days'}</Text>
                  </View>
                  <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} disabled={vacDays >= MAX_VACATION_DAYS}
                    onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setVacDays(d => Math.min(MAX_VACATION_DAYS, d + 1)); }}>
                    <Ionicons name="add-circle" size={34} color={vacDays >= MAX_VACATION_DAYS ? theme.textDim : theme.accentBlue} />
                  </TouchableOpacity>
                </View>
                <View style={{ alignItems: 'center', marginBottom: 16 }}>
                  <Text style={{ fontSize: 14, fontFamily: 'DMSans_700Bold', color: theme.accentBlue, letterSpacing: 0.3 }}>
                    {vacFmtNice(vacStartKey)}  to  {vacFmtNice(addDaysKey(vacStartKey, vacDays - 1))}
                  </Text>
                  <Text style={{ fontSize: 12, fontFamily: 'DMSans_400Regular', color: theme.textMuted, marginTop: 3 }}>
                    {vacDays} {vacDays === 1 ? 'Day Off' : 'Days Off'} · Resumes {vacFmtNice(addDaysKey(vacStartKey, vacDays))}
                  </Text>
                </View>
                <TouchableOpacity disabled={vacBusy} activeOpacity={0.85} onPress={handleStartVacation}
                  style={{ backgroundColor: theme.accentBlueRaw, borderRadius: 8, paddingVertical: 13, alignItems: 'center', opacity: vacBusy ? 0.5 : 1 }}>
                  <Text style={{ fontSize: 14, fontFamily: 'DMSans_700Bold', color: '#fff', letterSpacing: 1 }}>START VACATION</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </CollapsibleSection>

        {/* ── Notifications ── */}
        <CollapsibleSection label="Notifications" subtitle="Reminders · Daily Cap · Categories" defaultOpen={false} forceOpen={notifForceOpen} theme={theme}>
          <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>

            {/* Permission banner */}
            {notifPermission === 'denied' && (
              <View style={{ backgroundColor: theme.accentRedBg ?? 'rgba(204,51,51,0.12)', borderWidth: 1, borderColor: theme.accentRed, borderRadius: 10, padding: 12, marginBottom: 16 }}>
                <Text style={{ color: theme.accentRed, fontSize: 13, fontFamily: 'DMSans_600SemiBold' }}>Notifications Blocked</Text>
                <Text style={{ color: theme.textMuted, fontSize: 12, fontFamily: 'DMSans_400Regular', marginTop: 4 }}>iOS permission was denied. Go to Settings then Project J then Notifications to enable.</Text>
              </View>
            )}

            {/* Master toggle */}
            <View ref={notifMasterRef} style={[styles.row, { borderTopColor: 'transparent', paddingHorizontal: 0, paddingTop: 0 }]}>
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

            {(notifSettings.masterEnabled || notifTutorialActive) && (
              <>
                {/* ── Quiet Hours ── */}
                <Text style={{ fontSize: 11, fontFamily: 'DMSans_700Bold', color: theme.accentBlue, letterSpacing: 2, textTransform: 'uppercase', marginTop: 16, marginBottom: 10 }}>Quiet Hours</Text>
                <View ref={quietHoursRowRef} style={{ flexDirection: 'row', gap: 12, marginBottom: 4 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, color: theme.textMuted, fontFamily: 'DMSans_600SemiBold', marginBottom: 6 }}>From</Text>
                    <TouchableOpacity
                      onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); openTimePicker('quietStart', notifSettings.quietStart); }}
                      style={{ backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, paddingVertical: 10, alignItems: 'center' }}>
                      <Text style={{ color: theme.textPrimary, fontSize: 15, fontFamily: 'DMSans_600SemiBold' }}>{formatNotifTime(notifSettings.quietStart)}</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, color: theme.textMuted, fontFamily: 'DMSans_600SemiBold', marginBottom: 6 }}>Until</Text>
                    <TouchableOpacity
                      onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); openTimePicker('quietEnd', notifSettings.quietEnd); }}
                      style={{ backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, paddingVertical: 10, alignItems: 'center' }}>
                      <Text style={{ color: theme.textPrimary, fontSize: 15, fontFamily: 'DMSans_600SemiBold' }}>{formatNotifTime(notifSettings.quietEnd)}</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* ── Streak Protection ── */}
                <View style={{ height: 1, backgroundColor: theme.borderInput, marginTop: 16, marginBottom: 12 }} />
                <View ref={notifStreakRef} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={[styles.rowTitle, { color: theme.textPrimary }]}>Streak Protection</Text>
                    <Text style={[styles.rowSub, { color: theme.textMuted }]}>Always fires when streaks are at risk tonight. Not subject to the daily cap.</Text>
                  </View>
                  <ToggleSwitch
                    value={notifSettings.streakProtection}
                    onValueChange={v => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); updateNotifSettings({ ...notifSettings, streakProtection: v }); }}
                  />
                </View>

                {/* ── Daily cap ── */}
                <View style={{ height: 1, backgroundColor: theme.borderInput, marginTop: 16, marginBottom: 12 }} />
                <View ref={notifCapRef}>
                  <Text style={{ fontSize: 11, fontFamily: 'DMSans_700Bold', color: theme.accentBlue, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>How Many Per Day</Text>
                  <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'DMSans_400Regular', marginBottom: 10 }}>Streaks, IF window, summaries, and water reminders are not counted toward this.</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {([3, 5, 'all'] as const).map(cap => (
                      <TouchableOpacity
                        key={String(cap)}
                        onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); updateNotifSettings({ ...notifSettings, dailyCap: cap }); }}
                        style={{ flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', backgroundColor: notifSettings.dailyCap === cap ? theme.accentBlueBg : theme.bgInput, borderWidth: 1, borderColor: notifSettings.dailyCap === cap ? theme.accentBlueBorder : theme.borderInput }}>
                        <Text style={{ fontSize: 14, fontFamily: 'DMSans_700Bold', color: notifSettings.dailyCap === cap ? theme.accentBlue : theme.textMuted }}>{cap === 'all' ? 'All' : String(cap)}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* ── Category pills ── */}
                <View style={{ height: 1, backgroundColor: theme.borderInput, marginTop: 16, marginBottom: 12 }} />
                <View ref={notifCategoriesRef}>
                <Text style={{ fontSize: 11, fontFamily: 'DMSans_700Bold', color: theme.accentBlue, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>What Can We Notify You About</Text>
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                  {([
                    { key: 'categoryFitness' as const, label: 'Fitness' },
                    { key: 'categoryFaith' as const, label: 'Faith' },
                    { key: 'categoryFasting' as const, label: 'Fasting' },
                    { key: 'categorySummaries' as const, label: 'Summaries' },
                  ]).map(({ key, label }) => {
                    const isNRN = key === 'categoryFaith' && faithJourney === 'notrightnow';
                    const isOn = notifSettings[key] && !isNRN;
                    return (
                      <TouchableOpacity
                        key={key}
                        onPress={() => {
                          if (isNRN) return;
                          triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                          updateNotifSettings({ ...notifSettings, [key]: !notifSettings[key] });
                        }}
                        activeOpacity={isNRN ? 1 : 0.7}
                        style={{ paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: isOn ? theme.accentBlueBg : theme.bgInput, borderWidth: 1, borderColor: isOn ? theme.accentBlueBorder : theme.borderInput, opacity: isNRN ? 0.4 : 1 }}>
                        <Text style={{ fontSize: 13, fontFamily: 'DMSans_600SemiBold', color: isOn ? theme.accentBlue : theme.textMuted }}>{label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                </View>

                {/* ── Water reminders (Fitness category only) ── */}
                {(notifSettings.categoryFitness || notifTutorialActive) && (
                  <View ref={notifWaterRef}>
                    <View style={{ height: 1, backgroundColor: theme.borderInput, marginTop: 16, marginBottom: 12 }} />
                    <Text style={{ fontSize: 11, fontFamily: 'DMSans_700Bold', color: theme.accentBlue, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>Water Reminders</Text>
                    <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'DMSans_400Regular', marginBottom: 10 }}>Spaced evenly through your waking hours. Does not count toward the daily cap.</Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {([0, 1, 2, 3, 4] as const).map(count => (
                        <TouchableOpacity
                          key={count}
                          onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); updateNotifSettings({ ...notifSettings, waterCount: count }); }}
                          style={{ flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', backgroundColor: notifSettings.waterCount === count ? theme.accentBlueBg : theme.bgInput, borderWidth: 1, borderColor: notifSettings.waterCount === count ? theme.accentBlueBorder : theme.borderInput }}>
                          <Text style={{ fontSize: 13, fontFamily: 'DMSans_700Bold', color: notifSettings.waterCount === count ? theme.accentBlue : theme.textMuted }}>{count === 0 ? 'Off' : String(count)}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* ── Advanced ── */}
                <View style={{ marginTop: 12 }} />
                <View ref={notifAdvancedRef}>
                <NotifGroup label="Advanced" summary="Activity time, weight frequency, and more" theme={theme}>

                  {/* Activity reminder time */}
                  <Text style={{ fontSize: 11, fontFamily: 'DMSans_700Bold', color: theme.accentBlue, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2 }}>Activity Reminder Time</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <Text style={{ color: theme.textMuted, fontSize: 13, fontFamily: 'DMSans_400Regular', flex: 1, paddingRight: 10 }}>Fires if no workout and steps below 75% of goal</Text>
                    <TouchableOpacity
                      onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); openTimePicker('activityTime', notifSettings.activityTime); }}
                      style={{ backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, paddingVertical: 7, paddingHorizontal: 14, marginLeft: 12 }}>
                      <Text style={{ color: theme.textPrimary, fontSize: 14, fontFamily: 'DMSans_600SemiBold' }}>{formatNotifTime(notifSettings.activityTime)}</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Weight log frequency */}
                  <View style={{ height: 1, backgroundColor: theme.borderInput, marginBottom: 12 }} />
                  <Text style={{ fontSize: 11, fontFamily: 'DMSans_700Bold', color: theme.accentBlue, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>Weight Log Frequency</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                    {([
                      { value: 'daily' as const, label: 'Daily' },
                      { value: '3day' as const, label: 'Every 3 Days' },
                      { value: 'weekly' as const, label: 'Weekly' },
                    ]).map(({ value, label }) => (
                      <TouchableOpacity
                        key={value}
                        onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); updateNotifSettings({ ...notifSettings, weightFrequency: value }); }}
                        style={{ flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', backgroundColor: notifSettings.weightFrequency === value ? theme.accentBlueBg : theme.bgInput, borderWidth: 1, borderColor: notifSettings.weightFrequency === value ? theme.accentBlueBorder : theme.borderInput }}>
                        <Text style={{ fontSize: 11, fontFamily: 'DMSans_600SemiBold', color: notifSettings.weightFrequency === value ? theme.accentBlue : theme.textMuted, textAlign: 'center' }}>{label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Prayer check-in time */}
                  {faithJourney === 'rooted' && (
                    <>
                      <View style={{ height: 1, backgroundColor: theme.borderInput, marginBottom: 12 }} />
                      <Text style={{ fontSize: 11, fontFamily: 'DMSans_700Bold', color: theme.accentBlue, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2 }}>Prayer Check-In Time</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                        <Text style={{ color: theme.textMuted, fontSize: 13, fontFamily: 'DMSans_400Regular' }}>Fires if no prayer logged today</Text>
                        <TouchableOpacity
                          onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); openTimePicker('prayerTime', notifSettings.prayerTime); }}
                          style={{ backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, paddingVertical: 7, paddingHorizontal: 14, marginLeft: 12 }}>
                          <Text style={{ color: theme.textPrimary, fontSize: 14, fontFamily: 'DMSans_600SemiBold' }}>{formatNotifTime(notifSettings.prayerTime)}</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}

                  {/* IF window reminder lead time */}
                  <View style={{ height: 1, backgroundColor: theme.borderInput, marginBottom: 12 }} />
                  <Text style={{ fontSize: 11, fontFamily: 'DMSans_700Bold', color: theme.accentBlue, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>IF Window Reminder</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                    {([15, 30, 60] as const).map(mins => (
                      <TouchableOpacity
                        key={mins}
                        onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); updateNotifSettings({ ...notifSettings, ifLeadMins: mins }); }}
                        style={{ flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', backgroundColor: notifSettings.ifLeadMins === mins ? theme.accentBlueBg : theme.bgInput, borderWidth: 1, borderColor: notifSettings.ifLeadMins === mins ? theme.accentBlueBorder : theme.borderInput }}>
                        <Text style={{ fontSize: 13, fontFamily: 'DMSans_600SemiBold', color: notifSettings.ifLeadMins === mins ? theme.accentBlue : theme.textMuted }}>{mins} min</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={{ fontSize: 11, color: theme.textMuted, fontFamily: 'DMSans_400Regular', marginBottom: 4 }}>Minutes before eating window closes</Text>

                  {/* Streak protection offset */}
                  <View style={{ height: 1, backgroundColor: theme.borderInput, marginTop: 8, marginBottom: 12 }} />
                  <Text style={{ fontSize: 11, fontFamily: 'DMSans_700Bold', color: theme.accentBlue, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>Streak Protection Timing</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                    {([30, 45, 60] as const).map(mins => (
                      <TouchableOpacity
                        key={mins}
                        onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); updateNotifSettings({ ...notifSettings, streakOffsetMins: mins }); }}
                        style={{ flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', backgroundColor: notifSettings.streakOffsetMins === mins ? theme.accentBlueBg : theme.bgInput, borderWidth: 1, borderColor: notifSettings.streakOffsetMins === mins ? theme.accentBlueBorder : theme.borderInput }}>
                        <Text style={{ fontSize: 13, fontFamily: 'DMSans_600SemiBold', color: notifSettings.streakOffsetMins === mins ? theme.accentBlue : theme.textMuted }}>{mins} min</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={{ fontSize: 11, color: avgBedtime ? theme.accentBlue : theme.textDim, fontFamily: 'DMSans_400Regular' }}>
                    {avgBedtime ? `Minutes before your avg bedtime of ${avgBedtime}` : 'Not enough sleep data yet (needs 3+ nights). Defaults to 9:00 PM.'}
                  </Text>

                </NotifGroup>
                </View>
              </>
            )}
          </View>
        </CollapsibleSection>


        {/* ── Help ── */}
        <CollapsibleSection label="Help" subtitle="Definitions · Guides · Prayer" defaultOpen={false} theme={theme}>
          <View style={{ paddingBottom: 8 }}>
            <View style={{ borderLeftWidth: 3, borderLeftColor: theme.accentBlueRaw, paddingLeft: 10, marginHorizontal: 16, marginTop: 8, marginBottom: 8 }}>
              <Text style={{ fontSize: 11, fontFamily: 'DMSans_700Bold', color: theme.accentBlue, letterSpacing: 2, textTransform: 'uppercase' }}>Definitions</Text>
            </View>
            <TouchableOpacity style={[styles.row, { borderTopColor: theme.borderCard }]} onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); router.push('/definitions'); }} activeOpacity={0.7}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.textPrimary }]}>View Definitions</Text>
                <Text style={[styles.rowSub, { color: theme.textMuted }]}>All metric and feature explanations</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
            </TouchableOpacity>
            <View style={{ borderLeftWidth: 3, borderLeftColor: theme.accentBlueRaw, paddingLeft: 10, marginHorizontal: 16, marginTop: 16, marginBottom: 8 }}>
              <Text style={{ fontSize: 11, fontFamily: 'DMSans_700Bold', color: theme.accentBlue, letterSpacing: 2, textTransform: 'uppercase' }}>Tips {'&'} Guides</Text>
            </View>
            <TouchableOpacity style={[styles.row, { borderTopColor: theme.borderCard }]} onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); router.push('/mission'); }} activeOpacity={0.7}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.textPrimary }]}>Our Mission</Text>
                <Text style={[styles.rowSub, { color: theme.textMuted }]}>What makes this app different</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
            </TouchableOpacity>
            <View style={{ borderLeftWidth: 3, borderLeftColor: theme.accentBlueRaw, paddingLeft: 10, marginHorizontal: 16, marginTop: 16, marginBottom: 8 }}>
              <Text style={{ fontSize: 11, fontFamily: 'DMSans_700Bold', color: theme.accentBlue, letterSpacing: 2, textTransform: 'uppercase' }}>Tutorials</Text>
            </View>
            <TouchableOpacity
              style={[styles.row, { borderTopColor: theme.borderCard }]}
              onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); router.push('/tutorials' as any); }}
              activeOpacity={0.7}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.textPrimary }]}>View Tutorials</Text>
                <Text style={[styles.rowSub, { color: theme.textMuted }]}>{TUTORIALS.filter(t => t.id !== 'meta').length} guided tours available</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
            </TouchableOpacity>
            <View style={{ borderLeftWidth: 3, borderLeftColor: theme.accentBlueRaw, paddingLeft: 10, marginHorizontal: 16, marginTop: 16, marginBottom: 8 }}>
              <Text style={{ fontSize: 11, fontFamily: 'DMSans_700Bold', color: theme.accentBlue, letterSpacing: 2, textTransform: 'uppercase' }}>Prayer</Text>
            </View>
            <TouchableOpacity style={[styles.row, { borderTopColor: theme.borderCard }]} onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setShowPrayerModal(true); }} activeOpacity={0.7}>
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
          <TouchableOpacity style={[styles.row, { borderTopColor: theme.borderCard }]} onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); Linking.openURL('https://projectj-5d024.web.app/privacy'); }} activeOpacity={0.7}>
            <Text style={[styles.rowTitle, { color: theme.textPrimary, flex: 1 }]}>Privacy Policy</Text>
            <Ionicons name="open-outline" size={14} color={theme.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.row, { borderTopColor: theme.borderCard }]} onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); Linking.openURL('https://projectj-5d024.web.app/terms'); }} activeOpacity={0.7}>
            <Text style={[styles.rowTitle, { color: theme.textPrimary, flex: 1 }]}>Terms of Service</Text>
            <Ionicons name="open-outline" size={14} color={theme.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.row, { borderTopColor: theme.borderCard }]} onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); Linking.openURL('https://www.fatsecret.com'); }} activeOpacity={0.7}>
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
              onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign Out', style: 'destructive', onPress: () => { triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy); signOut(); } },
              ]); }}
              style={{ flex: 1 }}
            >
              <Text style={[styles.rowTitle, { color: theme.statusBad }]}>Sign Out</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.row, { borderTopColor: theme.borderCard }]}>
            <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); handleDeleteAccount(); }} style={{ flex: 1 }} disabled={deletingAccount}>
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
              triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
              Alert.alert('Reset Onboarding', 'This will send you back to the welcome screen on next app launch.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Reset', style: 'destructive', onPress: async () => { triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy); await AsyncStorage.removeItem('pj_onboarding_complete'); Alert.alert('Done', 'Onboarding reset. Restart the app.'); } },
              ]);
            }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.accentBlue }]}>Reset Onboarding</Text>
                <Text style={[styles.rowSub, { color: theme.textMuted }]}>Returns to welcome screen on next launch.</Text>
              </View>
              <Ionicons name="refresh-outline" size={18} color={theme.accentBlue} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.row, { borderTopColor: theme.borderCard }]} onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); fixDefaultTags(); }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.accentAmber }]}>Fix Default Tags</Text>
                <Text style={[styles.rowSub, { color: theme.textMuted }]}>Resets default tag names/colors.</Text>
              </View>
              <Ionicons name="construct-outline" size={18} color={theme.accentAmber} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.row, { borderTopColor: theme.borderCard }]} onPress={() => {
              triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
              Alert.alert('Reset Workout State', 'This will clear all workout data including exercises, notes, cardio logs, and weekly template. Your food, profile, and settings data will not be affected.\n\nThis cannot be undone.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Reset', style: 'destructive', onPress: async () => { triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy); await AsyncStorage.removeItem('pj_workout_state'); Alert.alert('Done', 'Workout state cleared. Restart the app.'); } },
              ]);
            }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.accentRed }]}>Reset Workout State</Text>
                <Text style={[styles.rowSub, { color: theme.textMuted }]}>Clears exercises, notes, logs, template.</Text>
              </View>
              <Ionicons name="trash-outline" size={18} color={theme.accentRed} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.row, { borderTopColor: theme.borderCard }]} onPress={() => {
              triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
              Alert.alert('Reset Achievements', 'Clear all unlocked achievements? This cannot be undone.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Reset', style: 'destructive', onPress: async () => { triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy); await AsyncStorage.removeItem('pj_achievements'); await AsyncStorage.removeItem('pj_goal_hit_counts'); await AsyncStorage.removeItem('pj_daily_goal_celebrations'); await AsyncStorage.removeItem('pj_momentum_checked'); await AsyncStorage.removeItem('pj_nutrition_ach_checked'); await AsyncStorage.removeItem('pj_sleep_ach_checked'); await AsyncStorage.removeItem('pj_workout_ach_checked'); Alert.alert('Done', 'Achievements and goal counts cleared.'); } },
              ]);
            }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.accentRed }]}>Reset Achievements</Text>
                <Text style={[styles.rowSub, { color: theme.textMuted }]}>Clears all unlocked achievements.</Text>
              </View>
              <Ionicons name="trophy-outline" size={18} color={theme.accentRed} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.row, { borderTopColor: theme.borderCard }]} onPress={() => {
              triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
              Alert.alert('Clear Yesterday\'s Day Score', 'Removes only the derived score fields (dayScore + goalSnapshot) from yesterday\'s record so it re-scores fresh, with a recompute fingerprint, next time you open its summary. Your logged food, water, workout, and sleep are NOT touched.\n\nUse this to test recompute-on-edit: clear, open the summary to re-score, then edit and reopen to watch the score move.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Clear Score', style: 'destructive', onPress: async () => {
                  triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
                  const d = new Date(); d.setDate(d.getDate() - 1);
                  const key = `pj_${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                  try {
                    const raw = await AsyncStorage.getItem(key);
                    if (!raw) { Alert.alert('No data', 'No record exists for yesterday.'); return; }
                    const day = JSON.parse(raw);
                    delete day.dayScore; delete day.goalSnapshot;   // derived only; logged data untouched
                    await AsyncStorage.setItem(key, JSON.stringify(day));
                    Alert.alert('Done', 'Yesterday\'s Day Score cleared. Open its summary to re-score fresh, then edit its water and reopen to confirm the score recomputes.');
                  } catch { Alert.alert('Error', 'Could not clear the score.'); }
                } },
              ]);
            }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.accentRed }]}>Clear Yesterday's Day Score</Text>
                <Text style={[styles.rowSub, { color: theme.textMuted }]}>Re-scores yesterday fresh (recompute-on-edit test). Logged data untouched.</Text>
              </View>
              <Ionicons name="refresh-outline" size={18} color={theme.accentRed} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.row, { borderTopColor: theme.borderCard }]} onPress={() => {
              triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
              Alert.alert('Reset Smart Tips Cache', 'Clears the stored tips and all cooldowns so the engine recomputes fresh on next EvR open. Use this to test tip rendering. Your logged data is not affected.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Reset', style: 'destructive', onPress: async () => {
                  triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
                  await AsyncStorage.removeItem('pj_smart_tips');
                  Alert.alert('Done', 'Smart Tips cache cleared. Open Effort vs Results to recompute.');
                }},
              ]);
            }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.accentRed }]}>Reset Smart Tips Cache</Text>
                <Text style={[styles.rowSub, { color: theme.textMuted }]}>Clears tips and cooldowns. Forces fresh recompute on next EvR open.</Text>
              </View>
              <Ionicons name="bulb-outline" size={18} color={theme.accentRed} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.row, { borderTopColor: theme.borderCard }]} onPress={() => {
              triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
              Alert.alert('Seed Topic Fatigue', 'Writes a fake "weight, weight, weight" recent-topic history into all four coach surfaces (home, EvR, weekly, monthly) so the anti-repeat rotation triggers immediately. After seeding: Reset Coach Tip Cache (NOT Smart Tips Cache), then open each surface. The headline should lead with a NON-weight finding if one exists. Only touches coach history keys, never your logged data.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Seed', style: 'destructive', onPress: async () => {
                  triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
                  const weightHist = JSON.stringify(['weight', 'weight', 'weight']);
                  await Promise.all([
                    AsyncStorage.setItem('pj_coach_topic_hist_home', weightHist),
                    AsyncStorage.setItem('pj_coach_topic_hist_evr', weightHist),
                    AsyncStorage.setItem('pj_coach_topic_hist_weekly', weightHist),
                    AsyncStorage.setItem('pj_coach_topic_hist_monthly', weightHist),
                  ]);
                  Alert.alert('Seeded', 'All four surfaces now have weight x3 history. Next: Reset Coach Tip Cache (NOT Smart Tips Cache), then open Home / Effort vs Results / Weekly / Monthly. Each headline should lead with a non-weight finding.');
                }},
              ]);
            }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.accentRed }]}>Seed Topic Fatigue</Text>
                <Text style={[styles.rowSub, { color: theme.textMuted }]}>Forces weight x3 recent-topic history on all surfaces to test anti-repeat rotation.</Text>
              </View>
              <Ionicons name="flask-outline" size={18} color={theme.accentRed} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.row, { borderTopColor: theme.borderCard }]} onPress={async () => {
              triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
              try {
                const report = await generateDiagnosticReport();
                if (report.insufficientData) {
                  Alert.alert('EvR Cards', `Not enough data: only ${report.minLoggedDays} logged days. Log more.`);
                  return;
                }
                const rawCards = report.cards ?? [];
                if (rawCards.length === 0) {
                  Alert.alert('EvR Cards', 'No cards cleared their floors and no positive whys fired. If this looks wrong, flag it.');
                  return;
                }
                let mode = 'balanced';
                try { const s = await AsyncStorage.getItem('pj_settings'); if (s) { const d = JSON.parse(s); if (d.styleMode) mode = d.styleMode; } } catch {}
                const cards = await voiceDiagnosticCards(rawCards, mode);
                const voicedAny = cards.some(c => !!c.insight);
                const debug = getLastVoiceDebug();
                const body = cards.map((c, i) =>
                  `${i + 1}. [${c.strength} ${c.positive ? 'POS' : c.tone.toUpperCase()}] ${c.claim}\n   ${c.proof}\n${c.insight ? `   ${c.insight}\n` : ''}   → ${c.lever}\n   (${c.window})`
                ).join('\n\n');
                const header = voicedAny ? '(AI voiced)' : `(fallback: ${debug ?? 'unknown'})`;
                const rec = await dumpEvrRecoveryDebug();
                const recFooter =
                  `\n\nRECOVERY CHECK (14d window, fixed):\n` +
                  `recovery days: ${rec.recDaysInWindow}/${rec.minNeeded} needed${rec.recDaysInWindow < rec.minNeeded ? ' -> rules CANNOT fire' : ' -> rules can evaluate'}\n` +
                  `mean recovery: ${rec.meanRecovery ?? 'none'} (sustained_low fires only if <${rec.sustainedLowFloor})\n` +
                  `findings fired: ${rec.findings.length ? rec.findings.map(f => f.id).join(', ') : 'none (no pattern present)'}`;
                const m = report.momentumDebug;
                const momFooter = m
                  ? `\n\nMOMENTUM CHECK (big-day snowball, 30d, vs per-day goal incl. active cal):\n` +
                    `over-target days w/ a logged next day: ${m.overDays} (need 5)\n` +
                    `of those, next day ran high: ${m.ranHigh}${m.ratio !== null ? ` (${Math.round(m.ratio * 100)}%, need 60%)` : ''}\n` +
                    `trimmed avg overage next day: ${m.overage !== null ? `${m.overage >= 0 ? '+' : ''}${m.overage} cal` : 'n/a'}\n` +
                    `card: ${m.fired ? 'FIRES' : 'does not fire'}`
                  : `\n\nMOMENTUM CHECK: no calorie target set.`;
                Alert.alert(`EvR — ${cards.length} cards ${header}`, body + recFooter + momFooter);
              } catch (e) {
                Alert.alert('Error', 'Could not generate the card feed. Check the logs.');
              }
            }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.accentRed }]}>Dump EvR Cards</Text>
                <Text style={[styles.rowSub, { color: theme.textMuted }]}>Runs the new diagnostic feed on your real data. Shows ranked claim/proof/lever as plain text.</Text>
              </View>
              <Ionicons name="list-outline" size={18} color={theme.accentRed} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.row, { borderTopColor: theme.borderCard }]} onPress={async () => {
              triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
              try {
                const body = await dumpWindowComparison();
                Alert.alert('Window Comparison', body);
              } catch (e) {
                Alert.alert('Error', 'Could not run the window comparison. Check the logs.');
              }
            }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.accentRed }]}>Dump Window Comparison</Text>
                <Text style={[styles.rowSub, { color: theme.textMuted }]}>Read-only. Shows each metric at 7d/14d/30d (avg + day count) so we can see whether the windows actually diverge on your data.</Text>
              </View>
              <Ionicons name="resize-outline" size={18} color={theme.accentRed} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.row, { borderTopColor: theme.borderCard }]} onPress={async () => {
              triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
              try {
                const d = await dumpHomeCoachCandidates();
                const fmt = (n: number) => n.toFixed(2);
                const lines = d.rows.map(r =>
                  `${r.positive ? '[P]' : '[C]'} ${r.ruleId} (${r.scenario || '-'}) topic=${r.topic} fam${r.family} ${r.tier.slice(0, 4)} fat${fmt(r.fatigue)} = ${fmt(r.score)}${r.ruleId === d.selectedRuleId ? '  <-- SELECTED' : ''}${r.excluded ? ' (prev, excluded)' : ''}`
                );
                const p = d.proteinDebug;
                const proteinBlock =
                  `\n\nPROTEIN CHECK (goal ${p.goal}g):\n` +
                  `last7 (g, newest first): [${p.last7.map(v => v === null ? '-' : v).join(', ')}]\n` +
                  `days <80% goal (${Math.round(p.goal * 0.8)}g): ${p.under80Count}/7 food days (need 4 -> pattern ${p.patternFires ? 'FIRES' : 'no'})\n` +
                  `days <50% goal (${Math.round(p.goal * 0.5)}g) in last 5: ${p.under50CountW5} (need 3 -> urgent ${p.urgentFires ? 'FIRES' : 'no'})\n` +
                  `logged food days: ${p.loggedFoodDaysW7}/7, ${p.loggedFoodDaysW5}/5`;
                const head =
                  `recentTopics: [${d.recentTopics.join(', ') || 'empty'}]\n` +
                  `logged: ${d.loggedCount}/7   override: ${d.override ?? 'none'}\n` +
                  `pool: ${d.poolUsed} (corrective ${d.correctiveCount} / positive ${d.positiveCount})\n` +
                  `SELECTED -> ${d.selectedRuleId ?? 'none'}${d.override ? `  (BUT override=${d.override} wins live)` : ''}\n\n` +
                  `RANKED (lower score wins):`;
                Alert.alert('Home Coach Candidates', `${head}\n${lines.join('\n') || '(none)'}${proteinBlock}`);
              } catch (e) {
                Alert.alert('Error', 'Could not dump home coach candidates. Check the logs.');
              }
            }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.accentRed }]}>Dump Home Coach Candidates</Text>
                <Text style={[styles.rowSub, { color: theme.textMuted }]}>Shows every home tip candidate with family, tier, fatigue penalty, and final score. Read-only.</Text>
              </View>
              <Ionicons name="analytics-outline" size={18} color={theme.accentRed} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.row, { borderTopColor: theme.borderCard }]} onPress={async () => {
              triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
              try {
                const r = await fetchOvernightRHR();
                const body =
                  `Overnight RHR (robust low): ${r.rhr ?? 'none'} bpm\n` +
                  `Apple RHR (current): ${r.appleRHR ?? 'none'} bpm\n` +
                  `   ^ ours should land right around Apple's\n\n` +
                  `Reference:\n` +
                  `  asleep 5th percentile: ${r.asleepP5 ?? '-'} bpm\n` +
                  `  deep-only avg (old method): ${r.deepMean ?? '-'} bpm\n` +
                  `  raw lowest beat all night: ${r.nightMin ?? '-'} bpm (artifact check)\n\n` +
                  `Asleep samples: ${r.asleepCount} (of ${r.nightSampleCount} all night)\n` +
                  `RHR from lowest ${r.rhrCount} asleep beats\n` +
                  `Asleep minutes: ${r.asleepMinutes}\n` +
                  `Source: ${r.fallbackUsed}`;
                Alert.alert('Last Night RHR', body);
              } catch {
                Alert.alert('Error', 'Could not read heart-rate data. Check the logs.');
              }
            }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.accentRed }]}>Dump RHR (deep sleep vs Apple)</Text>
                <Text style={[styles.rowSub, { color: theme.textMuted }]}>Last night: our overnight deep-sleep RHR vs Apple's daytime value. Read-only, nothing saved.</Text>
              </View>
              <Ionicons name="heart-outline" size={18} color={theme.accentRed} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.row, { borderTopColor: theme.borderCard }]} onPress={async () => {
              triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
              try {
                const h = await dumpHRV();
                const fmt = (t: number | null) => t != null ? new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-';
                const line = (label: string, avg: number | null, count: number) => `  ${label}: ${avg ?? '-'} ms (${count} reading${count === 1 ? '' : 's'})`;
                const sampleList = h.rows.length
                  ? h.rows.slice(0, 16).map(r => `  ${r.time}  ${r.v}ms  [${r.stage}]`).join('\n') + (h.rows.length > 16 ? `\n  ...+${h.rows.length - 16} more` : '')
                  : '  (none)';
                const body =
                  `Sleep window: ${fmt(h.windowStart)} -> ${fmt(h.windowEnd)} (${h.asleepMinutes} min asleep)\n` +
                  `Total SDNN readings (6pm-noon): ${h.total}\n\n` +
                  `AVERAGES BY METHOD:\n` +
                  line('bed->wake bracket (SHIPPING NOW)', h.bracketAvg, h.bracketCount) + '\n' +
                  line('all asleep stages (proposed)', h.asleepAvg, h.asleepCount) + '\n' +
                  line('deep only (Whoop-style)', h.deepAvg, h.deepCount) + '\n\n' +
                  `PER STAGE:\n` +
                  line('deep', h.deepAvg, h.deepCount) + '\n' +
                  line('core', h.coreAvg, h.coreCount) + '\n' +
                  line('rem', h.remAvg, h.remCount) + '\n' +
                  line('awake', h.awakeAvg, h.awakeCount) + '\n' +
                  line('daytime (outside window)', h.daytimeAvg, h.daytimeCount) + '\n\n' +
                  `READINGS:\n${sampleList}`;
                Alert.alert('Last Night HRV (SDNN)', body);
              } catch {
                Alert.alert('Error', 'Could not read HRV data. Check the logs.');
              }
            }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.accentRed }]}>Dump HRV (samples + per stage)</Text>
                <Text style={[styles.rowSub, { color: theme.textMuted }]}>Last night: how many SDNN readings, and the average per sleep stage vs each method. Read-only, nothing saved.</Text>
              </View>
              <Ionicons name="pulse-outline" size={18} color={theme.accentRed} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.row, { borderTopColor: theme.borderCard }]} onPress={() => {
              triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
              Alert.alert('Dump Day Score w/ Recovery', 'Recomputes your recent days BOTH ways: the current sleep-driven third category vs the real Recovery Score. Read-only, nothing is saved and live scoring is untouched. Pick a window.', [
                { text: 'Cancel', style: 'cancel' },
                ...[7, 14, 30].map(w => ({
                  text: `${w}d`,
                  onPress: async () => {
                    try {
                      const t = new Date();
                      const todayKey = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
                      const res = await dumpDayScoreWithRecovery(todayKey, w);
                      if (res.scoredCount === 0) {
                        Alert.alert(`Day Score + Recovery (${w}d)`, 'No scored days in this window.');
                        return;
                      }
                      const sgn = (n: number) => `${n > 0 ? '+' : ''}${n}`;
                      const md = (k: string | null) => (k ? k.slice(5) : '-');
                      const head = [
                        `${res.scoredCount} scored | ${res.recoveryCount} w/ recovery | ${res.changedCount} moved`,
                        res.avgDelta !== null
                          ? `Avg Δ ${sgn(res.avgDelta)} | Max Δ ${res.maxAbsDelta} on ${md(res.maxAbsDeltaDate)}`
                          : 'No recovery-equipped days in this window.',
                      ].join('\n');
                      const recRows = res.rows.filter(r => r.hasRecovery);
                      const lines = recRows.map(r =>
                        `${r.dayName} ${md(r.dateKey)}  ${r.oldComposite}→${r.newComposite}  Δ${sgn(r.delta)}   3rd ${r.oldThird ?? '-'}→${r.newThird ?? '-'}` +
                        `\n   hrv ${r.hrv ?? 'NONE'} | rhr ${r.rhr ?? 'NONE'}${r.sleepManual ? ' | manual sleep' : ''}`
                      ).join('\n');
                      const fallback = res.scoredCount - res.recoveryCount;
                      const tail = fallback > 0 ? `\n\n+ ${fallback} sleep-fallback day${fallback === 1 ? '' : 's'} (unchanged)` : '';
                      const body = head + '\n\n' + (lines.length ? lines : 'No day in this window had a stored Recovery Score.') + tail;
                      Alert.alert(`Day Score + Recovery (${w}d)`, body);
                    } catch (e) {
                      Alert.alert('Error', 'Could not compute the dump. Check the logs.');
                    }
                  },
                })),
              ]);
            }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.accentRed }]}>Dump Day Score w/ Recovery</Text>
                <Text style={[styles.rowSub, { color: theme.textMuted }]}>Recomputes recent days sleep-driven vs real Recovery Score. Shows old/new composite + delta. Read-only.</Text>
              </View>
              <Ionicons name="pulse-outline" size={18} color={theme.accentRed} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.row, { borderTopColor: theme.borderCard }]} onPress={async () => {
              triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
              try {
                const text = await probeStreakExclusions(120);
                Alert.alert('Streak Exclusion Probe', text);
              } catch (e) {
                Alert.alert('Error', 'Could not run the streak probe. Check the logs.');
              }
            }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.accentRed }]}>Probe Streak Exclusions</Text>
                <Text style={[styles.rowSub, { color: theme.textMuted }]}>Proves the HOLD bridge math, then lists which streaks each of your excluded days (last 120d) bridges. Read-only.</Text>
              </View>
              <Ionicons name="git-merge-outline" size={18} color={theme.accentRed} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.row, { borderTopColor: theme.borderCard }]} onPress={async () => {
              triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
              const state = await describeVacation();
              Alert.alert('Vacation Mode (dev)', `${state}\n\nWrites the full-day exclusion onto each in-range day (read-then-merge, reversible). Use a TODAY start to test fully reversibly; use Full reset to wipe all trace.`, [
                { text: 'Close', style: 'cancel' },
                { text: 'Start 3d (today)', onPress: async () => { await startVacation(vacationTodayKey(), 3); Alert.alert('Vacation started', 'Today + next 2 days are excluded. Now check Stats: streaks should HOLD (freeze), and the weekly summary should drop these days. Sleep/recovery scores still show.'); } },
                { text: 'Start 3d (ending yesterday)', onPress: async () => { await startVacation(addDaysKey(vacationTodayKey(), -3), 3); Alert.alert('Vacation set (past)', 'The last 3 days (NOT today) are marked as a vacation: yesterday and the two days before. Today is untouched. Check the calendar + Sleep page.'); } },
                { text: 'End early', onPress: async () => { await endVacationEarly(); Alert.alert('Ended early', 'Today + any future days un-excluded (prior manual exclusions restored). Past vacation days kept.'); } },
                { text: 'Full reset (dev)', style: 'destructive', onPress: async () => { await cancelVacationFully(); Alert.alert('Fully reset', 'Every vacation stamp removed and the record deleted. Zero trace left.'); } },
              ]);
            }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.accentRed }]}>Vacation Mode (dev)</Text>
                <Text style={[styles.rowSub, { color: theme.textMuted }]}>Start/end a test vacation to verify the engine: streak freeze, summary drop, sleep still visible. Reversible (Full reset wipes all trace).</Text>
              </View>
              <Ionicons name="airplane-outline" size={18} color={theme.accentRed} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.row, { borderTopColor: theme.borderCard }]} onPress={() => {
              triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
              Alert.alert('Reset Coach Tip Cache', 'Clears all AI coaching tips (home card, Day Summary, and all EvR window tips) so they regenerate fresh. Your logged data is not affected.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Reset', style: 'destructive', onPress: async () => {
                  triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
                  const allKeys = await AsyncStorage.getAllKeys();
                  const coachKeys = allKeys.filter(k =>
                    k === 'pj_coach_tip' ||
                    k.startsWith('pj_coach_tip_day_') ||
                    k.startsWith('pj_coach_tip_evr_') ||
                    k.startsWith('pj_coach_tip_weekly_') ||
                    k.startsWith('pj_coach_last_rule_')
                  );
                  if (coachKeys.length > 0) await AsyncStorage.multiRemove(coachKeys);
                  Alert.alert('Done', `Coach tip cache cleared (${coachKeys.length} entries). Tips will regenerate on next open.`);
                }},
              ]);
            }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.accentRed }]}>Reset Coach Tip Cache</Text>
                <Text style={[styles.rowSub, { color: theme.textMuted }]}>Clears home card, Day Summary, EvR, and Weekly tip caches. Forces fresh regeneration.</Text>
              </View>
              <Ionicons name="sparkles-outline" size={18} color={theme.accentRed} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.row, { borderTopColor: theme.borderCard }]} onPress={() => {
              triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
              Alert.alert('Regenerate Weekly Summaries', 'Clears all cached weekly summaries and rebuilds them from your logged data. Your logged data is not affected.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Regenerate', style: 'destructive', onPress: async () => {
                  triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
                  const allKeys = await AsyncStorage.getAllKeys();
                  // Clear existing summaries, gate key, and weekly coach tips
                  const toRemove = allKeys.filter(k =>
                    k.startsWith('pj_weekly_summary_') ||
                    k.startsWith('pj_coach_tip_weekly_') ||
                    k === 'pj_last_weekly_generated'
                  );
                  if (toRemove.length > 0) await AsyncStorage.multiRemove(toRemove);

                  // Find all past Sun-Sat weeks that have day data
                  const dayKeys = allKeys.filter(k => k.match(/^pj_\d{4}-\d{2}-\d{2}$/));
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const weekStarts = new Set<string>();
                  for (const key of dayKeys) {
                    const dk = key.slice(3);
                    const [y, m, d] = dk.split('-').map(Number);
                    const dt = new Date(y, m - 1, d);
                    if (dt >= today) continue;
                    const dow = dt.getDay();
                    const sun = new Date(dt);
                    sun.setDate(dt.getDate() - dow);
                    const weekEnd = new Date(sun);
                    weekEnd.setDate(sun.getDate() + 6);
                    if (weekEnd >= today) continue; // skip current open week
                    const ws = `${sun.getFullYear()}-${String(sun.getMonth() + 1).padStart(2, '0')}-${String(sun.getDate()).padStart(2, '0')}`;
                    weekStarts.add(ws);
                  }

                  const wsArray = Array.from(weekStarts).sort();
                  let count = 0;
                  for (const ws of wsArray) {
                    await generateWeeklySummary(ws);
                    count++;
                  }
                  Alert.alert('Done', `Rebuilt ${count} weekly ${count === 1 ? 'summary' : 'summaries'} from your data.`);
                }},
              ]);
            }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.accentRed }]}>Regenerate Weekly Summaries</Text>
                <Text style={[styles.rowSub, { color: theme.textMuted }]}>Clears and rebuilds all weekly summary snapshots. Use if a week shows wrong or missing data.</Text>
              </View>
              <Ionicons name="calendar-outline" size={18} color={theme.accentRed} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.row, { borderTopColor: theme.borderCard }]} onPress={() => {
              triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
              Alert.alert('Regenerate Monthly Summaries', 'Clears all cached monthly summaries and rebuilds them from your logged data. Your logged data is not affected.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Regenerate', style: 'destructive', onPress: async () => {
                  triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
                  const allKeys = await AsyncStorage.getAllKeys();
                  const toRemove = allKeys.filter(k =>
                    k.startsWith('pj_monthly_summary_') ||
                    k.startsWith('pj_coach_tip_monthly_') ||
                    k === 'pj_last_monthly_generated'
                  );
                  if (toRemove.length > 0) await AsyncStorage.multiRemove(toRemove);

                  // Find all past calendar months that have day data
                  const dayKeys = allKeys.filter(k => k.match(/^pj_\d{4}-\d{2}-\d{2}$/));
                  const today = new Date();
                  today.setDate(1); today.setHours(0, 0, 0, 0); // start of current month
                  const monthKeys = new Set<string>();
                  for (const key of dayKeys) {
                    const dk = key.slice(3);
                    const [y, m] = dk.split('-').map(Number);
                    const monthStart = new Date(y, m - 1, 1);
                    if (monthStart >= today) continue; // skip current open month
                    monthKeys.add(`${y}-${String(m).padStart(2, '0')}`);
                  }

                  const mkArray = Array.from(monthKeys).sort();
                  let count = 0;
                  for (const mk of mkArray) {
                    await generateMonthlySummary(mk);
                    count++;
                  }
                  Alert.alert('Done', `Rebuilt ${count} monthly ${count === 1 ? 'summary' : 'summaries'} from your data.`);
                }},
              ]);
            }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.accentRed }]}>Regenerate Monthly Summaries</Text>
                <Text style={[styles.rowSub, { color: theme.textMuted }]}>Clears and rebuilds all monthly summary snapshots. Use if a month shows wrong or missing data.</Text>
              </View>
              <Ionicons name="calendar-outline" size={18} color={theme.accentRed} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.row, { borderTopColor: theme.borderCard }]} onPress={() => {
              triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
              Alert.alert('Fix Apple Workout Types', 'Scans all stored workouts and corrects isCardio flag for strength exercises (Traditional Strength Training, Functional Strength Training, Core Training). Run once, then regenerate monthly summaries.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Fix', style: 'destructive', onPress: async () => {
                  triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
                  const LIFT_NAMES = new Set(['Traditional Strength Training', 'Functional Strength Training', 'Core Training']);
                  const raw = await AsyncStorage.getItem('pj_workout_state');
                  if (!raw) { Alert.alert('Done', 'No workout data found.'); return; }
                  const state = JSON.parse(raw);
                  let fixed = 0;
                  const programs = state.programs || {};
                  for (const dateKey of Object.keys(programs)) {
                    const exercises = programs[dateKey]?.exercises;
                    if (!Array.isArray(exercises)) continue;
                    for (const ex of exercises) {
                      if (ex.fromAppleHealth && LIFT_NAMES.has(ex.name) && ex.isCardio !== false) {
                        ex.isCardio = false;
                        fixed++;
                      }
                    }
                  }
                  await AsyncStorage.setItem('pj_workout_state', JSON.stringify(state));
                  Alert.alert('Done', `Fixed ${fixed} exercise${fixed !== 1 ? 's' : ''}. Now run Regenerate Monthly Summaries to update counts.`);
                }},
              ]);
            }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.accentRed }]}>Fix Apple Workout Types</Text>
                <Text style={[styles.rowSub, { color: theme.textMuted }]}>One-time fix: corrects isCardio flag on Apple-synced strength exercises. Run before regenerating summaries.</Text>
              </View>
              <Ionicons name="barbell-outline" size={18} color={theme.accentRed} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.row, { borderTopColor: theme.borderCard }]} onPress={() => {
              triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
              Alert.alert('Clear Food History', 'This will remove all logged food entries from the last 90 days. Water, steps, sleep, and weight data will not be affected.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Clear', style: 'destructive', onPress: async () => {
                  triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
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
              triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
              Alert.alert('Reset Tooltip States', 'Re-enable all (i) pulse animations?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Reset', style: 'destructive', onPress: async () => {
                  triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
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
              triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
              Alert.alert('Replay Day Summary', "Clear today's gate so the morning pop-up fires again? (Also resets the first-use disclaimer.)", [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Replay', onPress: async () => {
                  triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
                  await AsyncStorage.multiRemove(['pj_last_summary_shown', 'pj_dayscore_disclaimer_seen']);
                  Alert.alert('Done', 'Gate cleared. Close the app fully and reopen it to see the disclaimer, then the pop-up.');
                }},
              ]);
            }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.accentRed }]}>Replay Day Summary</Text>
                <Text style={[styles.rowSub, { color: theme.textMuted }]}>Re-fires the morning Day Score pop-up on next app open.</Text>
              </View>
              <Ionicons name="sunny-outline" size={18} color={theme.accentRed} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.row, { borderTopColor: theme.borderCard }]} onPress={() => {
              triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
              Alert.alert('Replay Weekly Summary', 'Force the weekly summary pop-up to fire on next app open (any day, last closed week)?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Replay', onPress: async () => {
                  triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
                  await AsyncStorage.setItem('pj_dev_force_summary', 'week');
                  Alert.alert('Done', 'Close the app fully and reopen it to see the weekly pop-up.');
                }},
              ]);
            }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.accentRed }]}>Replay Weekly Summary</Text>
                <Text style={[styles.rowSub, { color: theme.textMuted }]}>Forces the weekly pop-up on next app open (any day).</Text>
              </View>
              <Ionicons name="calendar-outline" size={18} color={theme.accentRed} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.row, { borderTopColor: theme.borderCard }]} onPress={() => {
              triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
              Alert.alert('Replay Monthly Summary', 'Force the monthly summary pop-up to fire on next app open (any day, last closed month)?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Replay', onPress: async () => {
                  triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
                  await AsyncStorage.setItem('pj_dev_force_summary', 'month');
                  Alert.alert('Done', 'Close the app fully and reopen it to see the monthly pop-up.');
                }},
              ]);
            }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.accentRed }]}>Replay Monthly Summary</Text>
                <Text style={[styles.rowSub, { color: theme.textMuted }]}>Forces the monthly pop-up on next app open (any day).</Text>
              </View>
              <Ionicons name="calendar-number-outline" size={18} color={theme.accentRed} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.row, { borderTopColor: theme.borderCard }]} onPress={() => {
              triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
              Alert.alert('Replay Challenge Completion', "Backdates the active challenge into the past (same length, ending yesterday) and clears the acknowledged flag, so the completion celebration + Complete card fire again on next app open, scored against your real data from that window. Only touches pj_challenge.", [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Force-End', onPress: async () => {
                  try {
                    const raw = await AsyncStorage.getItem('pj_challenge');
                    if (!raw) { Alert.alert('No active challenge', 'Create a challenge first, then use this to replay its completion.'); return; }
                    triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
                    const ch = JSON.parse(raw);
                    const parseKey = (k: string) => { const [yy, mm, dd] = k.split('-').map(Number); return new Date(yy, mm - 1, dd); };
                    const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    const totalDays = Math.max(1, Math.round((parseKey(ch.endKey).getTime() - parseKey(ch.startKey).getTime()) / 86400000) + 1);
                    // Read-then-merge: shift the whole window back so it ends yesterday and keeps its length.
                    const end = new Date(); end.setDate(end.getDate() - 1);
                    const start = new Date(end); start.setDate(start.getDate() - (totalDays - 1));
                    ch.startKey = fmt(start);
                    ch.endKey = fmt(end);
                    ch.acknowledged = false;
                    await AsyncStorage.setItem('pj_challenge', JSON.stringify(ch));
                    Alert.alert('Done', `Challenge backdated to ${ch.startKey} - ${ch.endKey}. Close the app fully and reopen it to see the celebration, then the Complete card.`);
                  } catch { Alert.alert('Error', 'Could not read the active challenge.'); }
                }},
              ]);
            }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.accentRed }]}>Replay Challenge Completion</Text>
                <Text style={[styles.rowSub, { color: theme.textMuted }]}>Force-ends the active challenge so the win pop-up fires on next open.</Text>
              </View>
              <Ionicons name="trophy-outline" size={18} color={theme.accentRed} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.row, { borderTopColor: theme.borderCard }]} onPress={() => {
              triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
              Alert.alert('Replay Sleep Coach', "Clear today's Sleep Coach tip so it recomputes with fresh data the next time you open the Sleep Hub?", [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Replay', onPress: async () => {
                  triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
                  await AsyncStorage.multiRemove(['pj_coach_tip_sleep', 'pj_coach_last_rule_sleep']);
                  Alert.alert('Done', 'Open the Sleep Hub to regenerate the Sleep Coach tip.');
                }},
              ]);
            }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.accentRed }]}>Replay Sleep Coach</Text>
                <Text style={[styles.rowSub, { color: theme.textMuted }]}>Regenerates the Sleep Hub coach tip on next open.</Text>
              </View>
              <Ionicons name="moon-outline" size={18} color={theme.accentRed} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.row, { borderTopColor: theme.borderCard }]} onPress={() => {
              triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
              Alert.alert('Replay Recovery Coach', "Clear today's Recovery Coach tip so it recomputes with fresh data the next time you open the Recovery tab?", [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Replay', onPress: async () => {
                  triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
                  await AsyncStorage.multiRemove(['pj_coach_tip_recovery', 'pj_coach_last_rule_recovery']);
                  Alert.alert('Done', 'Open the Recovery tab to regenerate the Recovery Coach tip.');
                }},
              ]);
            }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.accentRed }]}>Replay Recovery Coach</Text>
                <Text style={[styles.rowSub, { color: theme.textMuted }]}>Regenerates the Recovery tab coach tip on next open.</Text>
              </View>
              <Ionicons name="pulse-outline" size={18} color={theme.accentRed} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.row, { borderTopColor: theme.borderCard }]} onPress={() => {
              triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
              Alert.alert('Backfill Recovery History', 'Recompute your real Recovery Score for the last 30 days from your Apple Health history (HRV, sleep, resting HR, resp rate, activity) and fill in the Recovery trend. Read-then-merges into each day, never overwrites. Days with no watch data are skipped.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Backfill', onPress: async () => {
                  triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
                  await AsyncStorage.setItem('pj_dev_backfill_recovery', '1');
                  Alert.alert('Ready', 'Open Sleep & Recovery, then the Recovery tab, to run the backfill. It takes a few seconds.');
                }},
              ]);
            }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.accentRed }]}>Backfill Recovery History</Text>
                <Text style={[styles.rowSub, { color: theme.textMuted }]}>Recomputes 30 days of real Recovery Scores from Apple Health on next Recovery tab open.</Text>
              </View>
              <Ionicons name="pulse-outline" size={18} color={theme.accentRed} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.row, { borderTopColor: theme.borderCard }]} onPress={() => {
              triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
              Alert.alert("Reset Today's Recovery Score", "Clears only today's locked Recovery Score so it recomputes fresh on next Recovery tab open. Use this to test the morning-snapshot freeze. Nothing else in today's data is touched.", [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Reset', style: 'destructive', onPress: async () => {
                  triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
                  try {
                    const d = new Date();
                    const k = `pj_${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    const raw = await AsyncStorage.getItem(k);
                    if (raw) {
                      const cur = JSON.parse(raw);
                      delete cur.recoveryScore;
                      await AsyncStorage.setItem(k, JSON.stringify(cur));
                    }
                    Alert.alert('Done', "Today's Recovery Score cleared. Open Sleep & Recovery, then the Recovery tab, and it will recompute and lock fresh.");
                  } catch {
                    Alert.alert('Error', "Could not reset today's Recovery Score.");
                  }
                }},
              ]);
            }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.accentRed }]}>Reset Today's Recovery Score</Text>
                <Text style={[styles.rowSub, { color: theme.textMuted }]}>Clears today's locked score so it recomputes fresh on next Recovery tab open.</Text>
              </View>
              <Ionicons name="refresh-outline" size={18} color={theme.accentRed} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.row, { borderTopColor: theme.borderCard }]} onPress={() => {
              triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
              Alert.alert('Restore from Firestore', 'Pulls your cloud backup down and overwrites the local copy of those keys. It does NOT wipe local-only data and does NOT upload first, so it can never overwrite your cloud with empty data. Use if data is missing after signing in.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Restore', onPress: async () => {
                  triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
                  const uid = auth.currentUser?.uid;
                  if (!uid) { Alert.alert('Not signed in'); return; }
                  try {
                    // Non-destructive merge: pull cloud down and overwrite local copies of
                    // those keys. NO pre-upload (that was the clobber vector) and NO wipe, so
                    // local-only data survives and an empty local can never overwrite cloud.
                    const snap = await getDocs(collection(db, 'users', uid, 'store'));
                    const pairs: [string, string][] = [];
                    snap.forEach(d => { const data = d.data(); if (data.key && data.value) pairs.push([data.key, data.value]); });
                    if (pairs.length === 0) { Alert.alert('Nothing to restore', 'Your cloud backup is empty for this account.'); return; }
                    await AsyncStorage.multiSet(pairs);
                    Alert.alert('Done', `Restored ${pairs.length} keys from Firestore. Restart the app.`);
                  } catch (e) { Alert.alert('Error', 'Restore failed: ' + e); }
                }},
              ]);
            }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.accentAmber }]}>Restore from Firestore</Text>
                <Text style={[styles.rowSub, { color: theme.textMuted }]}>Pulls cloud backup into local. Never wipes local-only data.</Text>
              </View>
              <Ionicons name="cloud-download-outline" size={18} color={theme.accentAmber} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.row, { borderTopColor: theme.borderCard }]} onPress={() => {
              triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
              Alert.alert(
                'Restore Apple Workout History',
                'Re-imports your Apple Health workouts from the last 90 days and marks them completed. Additive only: it adds workouts you are missing, deduped by Apple ID, and never deletes or overwrites anything. Touches only your workout data. Safe to run more than once.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Restore', onPress: async () => {
                    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
                    try {
                      const r = await restoreAppleWorkoutHistory(90);
                      if (r.total === 0) {
                        Alert.alert('No workouts found', 'Found 0 Apple workouts in the last 90 days. Make sure Apple Health is connected (iOS Settings > Privacy > Health > Project J) with Workouts permission on, then try again.');
                      } else {
                        Alert.alert('Done', `Found ${r.total} Apple workouts in the last ${r.days} days.\n\nImported ${r.imported} new, marked ${r.markedComplete} completed.\n\nOpen the Workout tab to check.`);
                      }
                    } catch (e) { Alert.alert('Error', 'Restore failed: ' + e); }
                  } },
                ],
              );
            }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.accentBlue }]}>Restore Apple Workout History</Text>
                <Text style={[styles.rowSub, { color: theme.textMuted }]}>Re-imports last 90 days of Apple workouts, marked completed. Additive, never deletes.</Text>
              </View>
              <Ionicons name="barbell-outline" size={18} color={theme.accentBlue} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.row, { borderTopColor: theme.borderCard }]} onPress={() => {
              triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
              Alert.alert(
                'Rebuild Gratitude Streak',
                'Recomputes your gratitude streak from your journal gratitude entries. Reads your entries only and updates the streak count. Never deletes anything.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Rebuild', onPress: async () => {
                    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
                    try {
                      const refRaw = await AsyncStorage.getItem('pj_bible_reflections');
                      const entries = refRaw ? JSON.parse(refRaw) : [];
                      const dates = Array.from(new Set(
                        entries
                          .filter((e: any) => e && e.category === 'gratitude' && typeof e.date === 'string')
                          .map((e: any) => e.date),
                      )).sort() as string[]; // ascending YYYY-MM-DD
                      if (dates.length === 0) { Alert.alert('No gratitude entries', 'Found no gratitude entries in your journal to rebuild from.'); return; }
                      const totalDays = dates.length;
                      const lastLoggedDate = dates[dates.length - 1];
                      // Current streak = consecutive days ending at the most recent gratitude date.
                      let currentStreak = 1;
                      for (let i = dates.length - 1; i > 0; i--) {
                        const cur = new Date(dates[i] + 'T00:00:00');
                        const prev = new Date(dates[i - 1] + 'T00:00:00');
                        if (Math.round((cur.getTime() - prev.getTime()) / 86400000) === 1) currentStreak++;
                        else break;
                      }
                      const streaksRaw = await AsyncStorage.getItem('pj_streaks');
                      const existing = streaksRaw ? JSON.parse(streaksRaw) : {};
                      const merged = { ...existing, gratitude: { ...(existing.gratitude || {}), currentStreak, totalDays, lastLoggedDate } };
                      await storageSet('pj_streaks', JSON.stringify(merged));
                      Alert.alert('Done', `Gratitude streak rebuilt:\n\nCurrent streak: ${currentStreak} day(s)\nTotal days logged: ${totalDays}\nLast logged: ${lastLoggedDate}\n\nReopen the Faith tab to see it.`);
                    } catch (e) { Alert.alert('Error', 'Rebuild failed: ' + e); }
                  } },
                ],
              );
            }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.accentBlue }]}>Rebuild Gratitude Streak</Text>
                <Text style={[styles.rowSub, { color: theme.textMuted }]}>Recomputes the streak from your journal gratitude entries.</Text>
              </View>
              <Ionicons name="flame-outline" size={18} color={theme.accentBlue} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.row, { borderTopColor: theme.borderCard }]} onPress={() => {
              triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
              Alert.prompt('Set Gratitude Streak', 'Current streak (days):', (streakStr) => {
                const cs = parseInt((streakStr || '').trim(), 10);
                if (isNaN(cs) || cs < 0) { Alert.alert('Invalid', 'Enter a whole number.'); return; }
                Alert.prompt('Set Streak Savers', 'Savers remaining:', async (saverStr) => {
                  const sv = parseInt((saverStr || '').trim(), 10);
                  if (isNaN(sv) || sv < 0) { Alert.alert('Invalid', 'Enter a whole number.'); return; }
                  try {
                    const d = new Date();
                    const todayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    const streaksRaw = await AsyncStorage.getItem('pj_streaks');
                    const existing = streaksRaw ? JSON.parse(streaksRaw) : {};
                    const merged = {
                      ...existing,
                      gratitude: { ...(existing.gratitude || {}), currentStreak: cs, lastLoggedDate: todayKey },
                      // Set savers count and reset the earn baseline to the current streak so the
                      // user does not instantly earn savers from the corrected number.
                      savers: { ...(existing.savers || {}), count: sv, earnBaselineStreak: cs, earnBaselineIsActive: true },
                    };
                    await storageSet('pj_streaks', JSON.stringify(merged));
                    Alert.alert('Done', `Gratitude streak set to ${cs} day(s), ${sv} saver(s). Reopen the Faith tab to see it.`);
                  } catch (e) { Alert.alert('Error', 'Set failed: ' + e); }
                }, 'plain-text');
              }, 'plain-text');
            }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.accentBlue }]}>Set Gratitude Streak Manually</Text>
                <Text style={[styles.rowSub, { color: theme.textMuted }]}>Type the exact streak + saver count. Use when a rebuild cannot reconstruct savers.</Text>
              </View>
              <Ionicons name="create-outline" size={18} color={theme.accentBlue} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.row, { borderTopColor: theme.borderCard }]} onPress={async () => {
              triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
              try {
                const uid = auth.currentUser?.uid;
                const email = auth.currentUser?.email || '(none)';
                if (!uid) { Alert.alert('Cloud Audit', 'Not signed in.'); return; }
                const snap = await getDocs(collection(db, 'users', uid, 'store'));
                const cloud: Record<string, string> = {};
                snap.forEach(d => { const data = d.data() as any; if (data.key) cloud[data.key] = data.value; });
                const keys = Object.keys(cloud);
                const dayKeys = keys.filter(k => /^pj_\d{4}-\d{2}-\d{2}$/.test(k)).sort();
                const oldest = dayKeys[0]?.replace('pj_', '') || 'none';
                const newest = dayKeys[dayKeys.length - 1]?.replace('pj_', '') || 'none';
                let profileName = '(no profile)';
                try { const p = cloud['pj_profile'] ? JSON.parse(cloud['pj_profile']) : null; if (p) profileName = p.name || '(unnamed)'; } catch {}
                const has = (k: string) => keys.includes(k) ? 'YES' : 'no';
                const recipes = (() => { try { return cloud['pj_recipes'] ? JSON.parse(cloud['pj_recipes']).length : 0; } catch { return '?'; } })();
                const myFoods = (() => { try { return cloud['pj_my_foods'] ? JSON.parse(cloud['pj_my_foods']).length : 0; } catch { return '?'; } })();
                const reflections = (() => { try { return cloud['pj_bible_reflections'] ? JSON.parse(cloud['pj_bible_reflections']).length : 0; } catch { return '?'; } })();
                Alert.alert(
                  'Cloud Audit (read-only)',
                  `Account: ${email}\nUID: ${uid.slice(0, 8)}...\n\n` +
                  `Total cloud docs: ${keys.length}\n` +
                  `Profile name: ${profileName}\n\n` +
                  `Daily entries: ${dayKeys.length}\n` +
                  `  range: ${oldest} -> ${newest}\n\n` +
                  `pj_workout_state: ${has('pj_workout_state')}\n` +
                  `pj_recipes: ${has('pj_recipes')} (${recipes})\n` +
                  `pj_my_foods: ${has('pj_my_foods')} (${myFoods})\n` +
                  `pj_favorites: ${has('pj_favorites')}\n` +
                  `pj_exercise_library: ${has('pj_exercise_library')}\n` +
                  `pj_bible_reflections: ${has('pj_bible_reflections')} (${reflections})\n` +
                  `pj_streaks: ${has('pj_streaks')}\n` +
                  `pj_settings: ${has('pj_settings')}`,
                );
              } catch (e) { Alert.alert('Cloud Audit failed', String(e)); }
            }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.accentBlue }]}>Cloud Audit (read-only)</Text>
                <Text style={[styles.rowSub, { color: theme.textMuted }]}>Counts what is actually in this account's cloud. Writes nothing.</Text>
              </View>
              <Ionicons name="cloud-outline" size={18} color={theme.accentBlue} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.row, { borderTopColor: theme.borderCard }]} onPress={() => {
              triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
              setOnboardingPreview(true);
              router.push('/onboarding/profile-setup');
            }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.accentBlue }]}>Preview Onboarding (safe)</Text>
                <Text style={[styles.rowSub, { color: theme.textMuted }]}>Walk the whole onboarding flow to review it. Writes nothing, syncs nothing, never touches your data. Continue advances without saving; back out or finish to exit.</Text>
              </View>
              <Ionicons name="eye-outline" size={18} color={theme.accentBlue} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.row, { borderTopColor: theme.borderCard }]} onPress={() => {
              triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
              Alert.alert(
                'Rebuild Achievements from Logs',
                'Recomputes your goal-hit counters from your daily logs and re-grants every badge your data has earned (hydration, steps, sleep, nutrition, workouts, faith). Reads your logs; writes only achievement keys. Does not touch any logged data. Safe.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Rebuild', onPress: async () => {
                    triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
                    try {
                      // 1. Recompute water + step goal-hit counts from daily logs (same logic
                      //    the achievements page uses for its progress bars).
                      const profileRaw = await AsyncStorage.getItem('pj_profile');
                      const profile = profileRaw ? JSON.parse(profileRaw) : {};
                      const profileWaterGoal = profile.waterGoal ? parseInt(profile.waterGoal) : 128;
                      const stepGoal = profile.stepGoal ? parseInt(profile.stepGoal) : 10000;
                      const activeCalGoal = profile.activeCalGoal ? parseInt(profile.activeCalGoal) : 500;
                      const exerciseMinsGoal = profile.exerciseMinsGoal ? parseInt(profile.exerciseMinsGoal) : 30;
                      const settingsRaw = await AsyncStorage.getItem('pj_settings');
                      const burnAccuracyPct = settingsRaw ? (JSON.parse(settingsRaw).burnAccuracyPct ?? 100) : 100;
                      let waterDays = 0, stepDays = 0, calDays = 0, exDays = 0;
                      let waterLast = '', stepLast = '', calLast = '', exLast = '';
                      const today = new Date();
                      for (let i = 0; i < 365; i++) {
                        const d = new Date(today); d.setDate(d.getDate() - i);
                        const dk = d.toISOString().split('T')[0];
                        const raw = await AsyncStorage.getItem(`pj_${dk}`);
                        if (!raw) continue;
                        const day = JSON.parse(raw);
                        const dayWaterGoal = day.waterGoal ? parseInt(day.waterGoal) : profileWaterGoal;
                        if ((day.water ?? 0) >= dayWaterGoal) { waterDays++; if (!waterLast) waterLast = dk; }
                        if ((day.steps ?? 0) >= stepGoal)     { stepDays++;  if (!stepLast)  stepLast  = dk; }
                        const adjCals = Math.round((day.activeCalories ?? 0) * burnAccuracyPct / 100);
                        if (adjCals >= activeCalGoal && adjCals > 0)               { calDays++; if (!calLast) calLast = dk; }
                        if ((day.exerciseMinutes ?? 0) >= exerciseMinsGoal && (day.exerciseMinutes ?? 0) > 0) { exDays++; if (!exLast) exLast = dk; }
                      }
                      // 2. Write counters back, preserving activeCals/exerciseMins.
                      const counts = await loadGoalHitCounts();
                      await storageSet('pj_goal_hit_counts', JSON.stringify({
                        ...counts,
                        water:        { count: waterDays, lastEarned: waterLast || counts.water.lastEarned },
                        steps:        { count: stepDays,  lastEarned: stepLast  || counts.steps.lastEarned },
                        activeCals:   { count: calDays,   lastEarned: calLast   || counts.activeCals.lastEarned },
                        exerciseMins: { count: exDays,    lastEarned: exLast    || counts.exerciseMins.lastEarned },
                      }));
                      // 3. Unlock every hydration/steps tier at or below the true counts.
                      let store = await loadAchievements();
                      const waterTiers: [string, number][] = [['hydration_first',1],['hydration_10',10],['hydration_30',30],['hydration_50',50],['hydration_75',75],['hydration_100',100],['hydration_200',200],['hydration_365',365]];
                      const stepTiers:  [string, number][] = [['steps_first',1],['steps_10',10],['steps_30',30],['steps_50',50],['steps_75',75],['steps_100',100],['steps_200',200],['steps_365',365]];
                      for (const [id, th] of waterTiers) if (waterDays >= th) { store = (await checkAndUnlock(id, store)).updatedStore; }
                      for (const [id, th] of stepTiers)  if (stepDays  >= th) { store = (await checkAndUnlock(id, store)).updatedStore; }
                      // 4. Clear the once-per-day gates and run the app's own backfills for the
                      //    remaining categories (these unlock only what the data earns).
                      await AsyncStorage.multiRemove(['pj_momentum_checked','pj_workout_ach_checked','pj_sleep_ach_checked','pj_nutrition_ach_checked']);
                      await checkSleepAchievements();
                      await checkNutritionAchievements();
                      await checkMomentumAchievements();
                      await checkWorkoutAchievements();
                      for (const t of ['verse','prayer','gratitude','bible'] as const) await checkFaithAchievements(t);
                      Alert.alert('Done', `Rebuilt from your logs:\nWater: ${waterDays}\nSteps: ${stepDays}\nActive Cals: ${calDays}\nExercise: ${exDays}\n\nBadges re-granted. Reopen the Achievements page to see them.`);
                    } catch (e) { Alert.alert('Error', 'Rebuild failed: ' + e); }
                  } },
                ],
              );
            }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.accentBlue }]}>Rebuild Achievements from Logs</Text>
                <Text style={[styles.rowSub, { color: theme.textMuted }]}>Recomputes counters + re-grants earned badges from your daily data. Safe.</Text>
              </View>
              <Ionicons name="trophy-outline" size={18} color={theme.accentBlue} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.row, { borderTopColor: theme.borderCard }]} onPress={() => {
              triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
              Alert.alert(
                'Simulate Fresh Install',
                'Clears all local app data on this phone to mimic a fresh install. Your cloud backup is NOT touched. After it clears, fully reload the app and it should auto-restore everything from the cloud, no onboarding, no dev tools. This tests the reinstall flow without reinstalling.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Clear & Test', style: 'destructive', onPress: async () => {
                    triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
                    try {
                      const allKeys = await AsyncStorage.getAllKeys();
                      const pjKeys = allKeys.filter(k => k.startsWith('pj_'));
                      if (pjKeys.length > 0) await AsyncStorage.multiRemove(pjKeys);
                      resetRestoreGate(); // re-lock sync + clear the gate so the reload runs it fresh
                      Alert.alert('Local data cleared', `Removed ${pjKeys.length} local keys (cloud untouched). Now FULLY reload the app: press R in your Metro terminal, or kill and reopen the app. It should auto-restore from the cloud and land you on Home.`);
                    } catch (e) { Alert.alert('Error', 'Clear failed: ' + e); }
                  } },
                ],
              );
            }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.accentRed }]}>Simulate Fresh Install</Text>
                <Text style={[styles.rowSub, { color: theme.textMuted }]}>Clears local data (cloud is safe) to test auto-restore on next reload.</Text>
              </View>
              <Ionicons name="refresh-circle-outline" size={18} color={theme.accentRed} />
            </TouchableOpacity>

            {(['small', 'medium', 'large', 'diamond'] as const).map(tier => (
              <TouchableOpacity key={tier} style={[styles.row, { borderTopColor: theme.borderCard }]} onPress={() => {
                triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                setDevCelebTier(tier);
                setDevCelebLabel(tier === 'small' ? 'NICE WORK' : tier === 'medium' ? 'MILESTONE' : tier === 'diamond' ? undefined : 'GOAL WEIGHT');
                setDevCelebVisible(true);
              }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowTitle, { color: tier === 'diamond' ? '#7dd3fc' : theme.textPrimary }]}>Fire {tier.charAt(0).toUpperCase() + tier.slice(1)} Celebration</Text>
                  <Text style={[styles.rowSub, { color: theme.textMuted }]}>{tier === 'small' ? 'Steps / water goal' : tier === 'medium' ? '5lb milestone' : tier === 'diamond' ? 'Diamond achievement overlay' : 'Goal weight hit'}</Text>
                </View>
                <Ionicons name="sparkles-outline" size={18} color={tier === 'diamond' ? '#7dd3fc' : theme.accentBlue} />
              </TouchableOpacity>
            ))}

            <TouchableOpacity style={[styles.row, { borderTopColor: theme.borderCard }]} onPress={() => {
              triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
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
              triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
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
              triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
              const uid = auth.currentUser?.uid;
              if (!uid) { Alert.alert('Not signed in'); return; }
              const allKeys = await AsyncStorage.getAllKeys();
              const shouldBe = allKeys.filter(k => shouldSync(k));
              const snap = await getDocs(collection(db, 'users', uid, 'store'));
              const cloudIds = new Set<string>();
              snap.forEach(d => cloudIds.add(d.id));
              const safeId = (k: string) => k.replace(/\//g, '_');
              const missing = shouldBe.filter(k => !cloudIds.has(safeId(k)));
              const journalUp = cloudIds.has('pj_bible_reflections');
              if (missing.length === 0) {
                const extra = snap.size - shouldBe.length;
                Alert.alert('Backup Check', `All ${shouldBe.length} keys that should back up are in the cloud.\n\nJournal: ${journalUp ? 'backed up' : 'NOT in cloud'}\n\nThe cloud also holds ${extra} extra doc(s) for things removed locally. Harmless.`);
              } else {
                const list = missing.slice(0, 10).join('\n');
                const more = missing.length > 10 ? `\n...and ${missing.length - 10} more` : '';
                Alert.alert('Backup Check', `${missing.length} key(s) NOT backed up yet:\n${list}${more}\n\nTap Upload All Data to back them up.`);
              }
            }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.accentBlue }]}>Check Sync Status</Text>
                <Text style={[styles.rowSub, { color: theme.textMuted }]}>Compares local key count to Firestore doc count.</Text>
              </View>
              <Ionicons name="checkmark-circle-outline" size={18} color={theme.accentBlue} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.row, { borderTopColor: theme.borderCard }]} onPress={() => {
              triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
              Alert.alert('Reset Tutorials', 'Clear all tutorial seen states? All tutorials will fire again as if seen for the first time, including the app orientation.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Reset', style: 'destructive', onPress: async () => {
                  triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
                  await resetAllTutorials();
                  Alert.alert('Done', 'Tutorial states cleared. Restart the app to see the app orientation again.');
                }},
              ]);
            }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.accentRed }]}>Reset Tutorials</Text>
                <Text style={[styles.rowSub, { color: theme.textMuted }]}>Re-enables all tutorials including app orientation.</Text>
              </View>
              <Ionicons name="school-outline" size={18} color={theme.accentRed} />
            </TouchableOpacity>

            <View style={[styles.row, { borderTopColor: theme.borderCard }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.accentRed }]}>Force Sleep: Manual Path</Text>
                <Text style={[styles.rowSub, { color: theme.textMuted }]}>Sleep tutorial uses feel-rating path regardless of Apple Health data.</Text>
              </View>
              <ToggleSwitch
                value={devForceSleepManual}
                onValueChange={(val) => {
                  setDevForceSleepManual(val);
                  saveSetting('devForceSleepManual', val);
                  triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                }}
              />
            </View>

            <View style={[styles.row, { borderTopColor: theme.borderCard }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.accentAmber }]}>Unlock Pro Features</Text>
                <Text style={[styles.rowSub, { color: theme.textMuted }]}>Grants full Pro access: Halo unlimited, AI estimator 30/mo, Comparison Day vs Day.</Text>
              </View>
              <ToggleSwitch
                value={devProUnlocked}
                onValueChange={(val) => {
                  setDevProUnlocked(val);
                  saveSetting('devProUnlocked', val);
                  triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                }}
              />
            </View>
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
                triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
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
              onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Medium); saveGoals(); }}
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
              <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); closeTimePicker(); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={{ fontSize: 14, fontFamily: 'DMSans_400Regular', color: theme.textMuted }}>Cancel</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 11, fontFamily: 'DMSans_700Bold', letterSpacing: 2, color: theme.accentBlueRaw, textTransform: 'uppercase' }}>Set Time</Text>
              <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); confirmTimePicker(); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
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
        def={devCelebTier === 'diamond' ? ACHIEVEMENTS.find(a => a.id === 'weight_goal') : undefined}
        onDismiss={() => setDevCelebVisible(false)}
      />

    </LinearGradient>
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
  goalLabel:   { fontSize: 9, fontFamily: 'DMSans_600SemiBold', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4, marginTop: 2 },
  goalHint:    { fontSize: 11, fontFamily: 'DMSans_400Regular', fontStyle: 'italic', marginTop: 4 },
  goalInput:   { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 15, fontFamily: 'DMSans_400Regular', marginBottom: 4 },
  modeBtn:     { flex: 1, padding: 10, borderWidth: 0.5, borderRadius: 8, alignItems: 'center' },
});
