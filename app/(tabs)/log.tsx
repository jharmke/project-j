import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useScrollToTop } from '@react-navigation/native';
import { triggerHaptic } from '@/utils/haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Animated, Easing, InteractionManager, Keyboard, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import PressableButton from '../../components/PressableButton';
import PrimaryCTA from '../../components/PrimaryCTA';
import { DEFAULT_MEAL_SLOTS, MealSlot, findSlotForMeal, loadMealSlots, saveMealSlots } from '../../utils/mealSlots';
import { getRepeatSummary, logRepeatedItems, SlotRepeatInfo, tidyFoodName } from '../../utils/repeatMeal';
import RepeatMealModal from '../../components/RepeatMealModal';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TAB_SCROLL_PAD, TAB_BAR_HEIGHT } from '../../components/CustomTabBar';
import FabDome from '../../components/FabDome';
import BackgroundLayers from '../../components/BackgroundLayers';
import Svg, { Circle } from 'react-native-svg';
import { loadFromFirebase, saveToFirebase } from '../../firebaseConfig';
import { storageSet } from '../../utils/storage';
import { unitLabel } from '../../utils/unitConversion';
import { barFillGradient } from '../../utils/barGradient';
import { sumWaterEntries, reconcileDayWater } from '../../utils/waterData';
import { cancelWaterPaceNotification } from '../../services/notifications';
import { loadCalorieTargets } from '../../utils/calorieTarget';
import { ACHIEVEMENTS, AchievementsStore, checkAndUnlock, loadAchievements, handleDailyGoalHit, getCelebTier } from '../../achievementData';
import { showAchievementToast, showDailyGoalToast } from '../../components/AchievementToast';
import { showCelebration } from '../../components/CelebrationOverlay';
import TooltipIcon from '../../components/TooltipIcon';
import NutritionGearModal, { NUTRITION_PRESETS, NutritionGoals, NutritionPreset } from '../../components/NutritionGearModal';
import NutrientDrilldownModal, { DrilldownItem, computeNetCarbsForEntry } from '../../components/NutrientDrilldownModal';
import { useTheme } from '../../theme';
import HeaderAvatar from '../../components/HeaderAvatar';
import GradientTitle from '../../components/GradientTitle';
import GradientNumber from '../../components/GradientNumber';
import GradientIcon from '../../components/GradientIcon';
import HeaderIconButton from '../../components/HeaderIconButton';
import ButtonShine from '../../components/ButtonShine';
import { CardWatermark } from '../../components/GradientCard';
import { useToast } from '../../components/Toast';
import { useTutorial } from '../../context/TutorialContext';
import { useTutorialTarget } from '../../hooks/useTutorialTarget';
import { useHealthKit } from '../../useHealthKit';
import ReAnimated, { useAnimatedStyle, useSharedValue, withTiming, useAnimatedProps, withRepeat, cancelAnimation, Easing as ReAnimEasing, FadeInDown } from 'react-native-reanimated';
import { showToolkit } from '../../components/ToolkitSheet';
import { IFCard, IF_METHODS } from '../../components/IFCard';
import AnimatedNumber from '../../components/AnimatedNumber';
import {
  scheduleIFWindowNotifications,
  cancelIFWindowNotifications,
  cancelIfCheckInNotification,
  loadNotificationSettings,
  shouldAskPermission,
  requestNotificationPermission,
} from '../../services/notifications';
import { Type, numLine, DISPLAY_CAPS, DISPLAY_TRACKING, displaySize } from '../../typography';
import ModalHeader from '../../components/ModalHeader';

const WATER_TARGET = 128;

// ── Loading skeleton ───────────────────────────────────────────────────────────
// Stands in for Today's Total, Advanced Nutrition, every meal slot, and the Water card while the initial
// read is still in flight -- same pulsing-gray-bar recipe as the EvR skeleton and the one shipped on
// Workout, so the app has one loading language, not three. Log is genuinely all cards (no odd-shaped
// non-card elements like Workout's Effort grid), so one repeated card shape covers the whole screen.
function LogSkeleton({ theme, pulse }: { theme: any; pulse: Animated.Value }) {
  const bar = (w: any, h: number, mb: number) => (
    <Animated.View style={{ width: w, height: h, borderRadius: 5, marginBottom: mb, backgroundColor: theme.textMuted, opacity: pulse }} />
  );
  const cardStyle = {
    borderWidth: 0.5, borderTopWidth: 1.5, borderRadius: 14, padding: 16, marginBottom: 12,
    backgroundColor: theme.bgCardGlass, shadowColor: theme.cardShadow, shadowOpacity: theme.cardShadowOpacity,
    shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 6,
    borderColor: theme.borderCard, borderTopColor: theme.accentBlueRaw,
  } as const;
  return (
    <>
      <View style={cardStyle}>
        {bar('40%', 12, 14)}
        {bar('60%', 34, 10)}
        {bar('100%', 8, 0)}
      </View>
      <View style={cardStyle}>
        {bar('50%', 12, 14)}
        {bar('100%', 40, 0)}
      </View>
      {[0, 1, 2].map(i => (
        <View key={i} style={[cardStyle, { paddingVertical: 14 }]}>
          {bar('35%', 14, 0)}
        </View>
      ))}
      <View style={cardStyle}>
        {bar('30%', 12, 14)}
        {bar('100%', 30, 0)}
      </View>
    </>
  );
}

// The repeat pill is sized to its WORST CASE: "Repeat Yesterday · 1,248 kcal" (a 4-digit day) must never
// truncate. Measured, that's ~205pt of content, so the cap is 212 with a little slack for wider accents/
// fonts. NOTE this is essentially the pill's natural full-row width already -- the "dead air" that shows up
// next to a 3-digit value IS this 4-digit headroom, not waste. 190 was tried and truncated "848 kcal".
const REPEAT_MAX_W = 212;

interface FoodEntry {
  name: string;
  cal: number;
  meal: string;
  protein?: number;
  carbs?: number;
  fat?: number;
  timestamp?: number;
  calPer100g?: number;
  proteinPer100g?: number;
  carbsPer100g?: number;
  fatPer100g?: number;
  foodNutrients?: any[];
  fsId?: string;
  tutorialEntry?: boolean;
}


const AnimCircle = ReAnimated.createAnimatedComponent(Circle);

function MacroStackedBar({ protein, carbs, fat, proteinGoal, carbsGoal, fatGoal, theme, showNetCarbs, onPressProtein, onPressCarbs, onPressFat }: { protein: number; carbs: number; fat: number; proteinGoal: number; carbsGoal: number; fatGoal: number; theme: any; showNetCarbs?: boolean; onPressProtein?: () => void; onPressCarbs?: () => void; onPressFat?: () => void }) {
  const proteinAnim = useSharedValue(0);
  const carbsAnim   = useSharedValue(0);
  const fatAnim     = useSharedValue(0);

  useEffect(() => {
    proteinAnim.value = 0;
    carbsAnim.value   = 0;
    fatAnim.value     = 0;
    const pPct = proteinGoal > 0 ? Math.min((protein / proteinGoal) * 100, 100) : 0;
    const cPct = carbsGoal   > 0 ? Math.min((carbs   / carbsGoal)   * 100, 100) : 0;
    const fPct = fatGoal     > 0 ? Math.min((fat     / fatGoal)     * 100, 100) : 0;
    setTimeout(() => { proteinAnim.value = withTiming(pPct, { duration: 800 }); }, 200);
    setTimeout(() => { carbsAnim.value   = withTiming(cPct, { duration: 700 }); }, 1150);
    setTimeout(() => { fatAnim.value     = withTiming(fPct, { duration: 600 }); }, 2000);
  }, [protein, carbs, fat, proteinGoal, carbsGoal, fatGoal]);

  const proteinStyle = useAnimatedStyle(() => ({ width: `${proteinAnim.value}%` as any }));
  const carbsStyle   = useAnimatedStyle(() => ({ width: `${carbsAnim.value}%` as any }));
  const fatStyle     = useAnimatedStyle(() => ({ width: `${fatAnim.value}%` as any }));

  return (
    <View style={{ width: 140, paddingLeft: 22, justifyContent: 'center', gap: 12 }}>
      <TouchableOpacity onPress={onPressProtein} activeOpacity={onPressProtein ? 0.75 : 1} hitSlop={{ top: 6, bottom: 6, left: 12, right: 12 }} style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
        <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: theme.bgProgressTrack, overflow: 'hidden' }}>
          <ReAnimated.View style={[{ height: '100%', borderRadius: 3, overflow: 'hidden' }, proteinStyle]}>
            <LinearGradient colors={barFillGradient(theme.macroProtein)} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={{ flex: 1 }} />
          </ReAnimated.View>
        </View>
        <Text style={{ fontSize: 11, color: theme.macroProtein, fontFamily: Type.uiBold, width: 12 }}>P</Text>
        <View style={{ width: 46, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'flex-end' }}>
          <AnimatedNumber
            value={protein}
            style={{ fontSize: 15, color: theme.macroProtein, fontFamily: Type.uiSemibold }}
            duration={500}
            renderValue={(s) => <GradientNumber value={s} color={theme.macroProtein} style={{ fontSize: 15, fontFamily: Type.uiSemibold }} />}
          />
          <Text style={{ fontSize: 10, color: theme.macroProtein }}>g</Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity onPress={onPressCarbs} activeOpacity={onPressCarbs ? 0.75 : 1} hitSlop={{ top: 6, bottom: 6, left: 12, right: 12 }} style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
        <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: theme.bgProgressTrack, overflow: 'hidden' }}>
          <ReAnimated.View style={[{ height: '100%', borderRadius: 3, overflow: 'hidden' }, carbsStyle]}>
            <LinearGradient colors={barFillGradient(theme.macroCarbs)} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={{ flex: 1 }} />
          </ReAnimated.View>
        </View>
        <Text style={{ fontSize: 11, color: theme.macroCarbs, fontFamily: Type.uiBold, width: 12 }}>C</Text>
        <View style={{ width: 46, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'flex-end' }}>
          <AnimatedNumber
            value={carbs}
            style={{ fontSize: 15, color: theme.macroCarbs, fontFamily: Type.uiSemibold }}
            duration={500}
            renderValue={(s) => <GradientNumber value={s} color={theme.macroCarbs} style={{ fontSize: 15, fontFamily: Type.uiSemibold }} />}
          />
          <Text style={{ fontSize: 10, color: theme.macroCarbs }}>g</Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity onPress={onPressFat} activeOpacity={onPressFat ? 0.75 : 1} hitSlop={{ top: 6, bottom: 6, left: 12, right: 12 }} style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
        <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: theme.bgProgressTrack, overflow: 'hidden' }}>
          <ReAnimated.View style={[{ height: '100%', borderRadius: 3, overflow: 'hidden' }, fatStyle]}>
            <LinearGradient colors={barFillGradient(theme.macroFat)} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={{ flex: 1 }} />
          </ReAnimated.View>
        </View>
        <Text style={{ fontSize: 11, color: theme.macroFat, fontFamily: Type.uiBold, width: 12 }}>F</Text>
        <View style={{ width: 46, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'flex-end' }}>
          <AnimatedNumber
            value={fat}
            style={{ fontSize: 15, color: theme.macroFat, fontFamily: Type.uiSemibold }}
            duration={500}
            renderValue={(s) => <GradientNumber value={s} color={theme.macroFat} style={{ fontSize: 15, fontFamily: Type.uiSemibold }} />}
          />
          <Text style={{ fontSize: 10, color: theme.macroFat }}>g</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

function WaterBar({ pct, color, trackColor, refreshKey, overGoal }: { pct: number; color: string; trackColor?: string; refreshKey?: number; overGoal?: boolean }) {
  const width = useSharedValue(0);
  const hasFired = useRef(false);
  const shimmerX = useSharedValue(-80);
  // Latest pct, so the delayed reveal timeouts animate to the CURRENT value, not the one
  // captured in their closure. Matches Home's AnimatedProgressBar exactly.
  const pctRef = useRef(pct);
  pctRef.current = pct;

  useEffect(() => {
    hasFired.current = false;
    width.value = 0;
    setTimeout(() => {
      width.value = withTiming(Math.min(100, pctRef.current), { duration: 1200 });
      hasFired.current = true;
    }, 800);
  }, [refreshKey]);

  useEffect(() => {
    if (!hasFired.current) return;
    width.value = withTiming(Math.min(100, pct), { duration: 600 });
  }, [pct]);

  useEffect(() => {
    if (overGoal) {
      shimmerX.value = -80;
      shimmerX.value = withRepeat(withTiming(420, { duration: 1600, easing: ReAnimEasing.linear }), -1, false);
    } else {
      cancelAnimation(shimmerX);
      shimmerX.value = -80;
    }
  }, [overGoal]);
  const animStyle = useAnimatedStyle(() => ({ width: `${width.value}%` as any }));
  const shimmerStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shimmerX.value }] }));
  return (
    <View style={[{ height: 6, borderRadius: 6, overflow: 'hidden', marginBottom: 12 }, { backgroundColor: trackColor ?? '#1e1e2e' }]}>
      <ReAnimated.View style={[{ height: '100%', borderRadius: 6, overflow: 'hidden' }, animStyle]}>
        <LinearGradient colors={barFillGradient(color)} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={{ flex: 1 }} />
      </ReAnimated.View>
      {overGoal && (
        <ReAnimated.View style={[{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 80 }, shimmerStyle]}>
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.28)', 'transparent']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={{ flex: 1 }}
          />
        </ReAnimated.View>
      )}
    </View>
  );
}

export default function LogScreen() {
  const insets = useSafeAreaInsets();
  // Measured height of the floating header, so the scroll knows how far to clear it.
  const [headerH, setHeaderH] = useState(104);
  const { theme } = useTheme();
  const { showToast } = useToast();
  const mealAddRef = useTutorialTarget('log_meal_add');
  const dateNavRef = useTutorialTarget('log_date_nav');
  const mealTotalRef = useTutorialTarget('log_meal_total');
  const todayTotalRef = useTutorialTarget('log_today_total');
  const logEditLayoutBtnRef = useTutorialTarget('log_edit_layout_btn');
  const logEditSlotNameRef  = useTutorialTarget('log_edit_slot_name');
  const logEditSlotDragRef  = useTutorialTarget('log_edit_slot_drag');
  const logEditAddBtnRef    = useTutorialTarget('log_edit_add_btn');
  const tutorialEntryRef = useRef<View>(null);
  const tutorialDeleteRef = useRef<View>(null);
  const tutorialEntryRegistered = useRef(false);
  const { registerTarget, unregisterTarget, registerTutorialAction, unregisterTutorialAction, registerScrollView, unregisterScrollView, activeState: tutorialActiveState } = useTutorial();
  const scrollRef = useRef<any>(null);
  useScrollToTop(scrollRef);
  const ifCardOffset = useRef<number>(0);
  const { scrollTo } = useLocalSearchParams<{ scrollTo?: string }>();
  const tutorialIfCardState = (tutorialActiveState?.tutorial.steps[tutorialActiveState.stepIndex] as any)?.ifCardState as
    'idle' | 'active' | 'eating' | undefined;
  const [loaded, setLoaded] = useState(false);
  // Pulsing gray-bar skeleton shown while `loaded` is false -- same recipe as the EvR loading skeleton
  // and the one just shipped on Workout, so the app speaks one "still loading" visual language.
  const skeletonPulse = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    if (loaded) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(skeletonPulse, { toValue: 0.6, duration: 650, useNativeDriver: true }),
      Animated.timing(skeletonPulse, { toValue: 0.22, duration: 650, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [loaded]);
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [water, setWater] = useState(0);
  const [waterEntries, setWaterEntries] = useState<{amount:number;timestamp:string;sign:'add'|'remove'}[]>([]);
  const [calTarget, setCalTarget] = useState(0);
  const [profileBmr, setProfileBmr] = useState(0);
  const [paceDeficit, setPaceDeficit] = useState(-500);
  const [totalProtein, setTotalProtein] = useState(0);
  const [totalCarbs, setTotalCarbs] = useState(0);
  const [totalFat, setTotalFat] = useState(0);
  const [advancedExpanded, setAdvancedExpanded] = useState(false);
  const [advancedVisible, setAdvancedVisible] = useState(false);
  const advancedAnim = useRef(new Animated.Value(0)).current;
  const [advGroupOpen, setAdvGroupOpen] = useState<Record<string, boolean>>({
    carbs: true, fats: false, core: false, vitamins: false, bvitamins: false, minerals: false,
  });
  const [nutritionPreset, setNutritionPreset] = useState<NutritionPreset>('standard');
  const [nutritionGoals, setNutritionGoals] = useState<NutritionGoals>({ ...NUTRITION_PRESETS.standard });
  const [showNutritionGear, setShowNutritionGear] = useState(false);
  const [showDrilldown, setShowDrilldown] = useState(false);
  const [drilldownItem, setDrilldownItem] = useState<DrilldownItem | null>(null);
  const [caloriesBurned, setCaloriesBurned] = useState(0);
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const [expandedMeals, setExpandedMeals] = useState<Record<string, boolean>>({});
  const [visibleMeals, setVisibleMeals] = useState<Record<string, boolean>>({});
  const mealAnimations = useRef<Record<string, Animated.Value>>({});

  const getMealAnim = (meal: string) => {
    if (!mealAnimations.current[meal]) {
      mealAnimations.current[meal] = new Animated.Value(0);
    }
    return mealAnimations.current[meal];
  };
  const [activeDate, setActiveDate] = useState(todayKey);
  // Log tab FAB -- multiple entry points (Create Food, Create Recipe, Barcode, Add to Meal), same
  // speed-dial structure as workout-library.tsx / add-food.tsx's own FABs.
  const [showLogFabMenu, setShowLogFabMenu] = useState(false);
  const logFabScale = useRef(new Animated.Value(1)).current;
  const logFabItem1Anim = useRef(new Animated.Value(0)).current; // Add to Meal -- bottom, animates first
  const logFabItem2Anim = useRef(new Animated.Value(0)).current; // Barcode
  const logFabItem3Anim = useRef(new Animated.Value(0)).current; // Create Recipe
  const logFabItem4Anim = useRef(new Animated.Value(0)).current; // Create Food -- top, animates last
  const openLogFabMenu = () => {
    logFabItem1Anim.setValue(0);
    logFabItem2Anim.setValue(0);
    logFabItem3Anim.setValue(0);
    logFabItem4Anim.setValue(0);
    setShowLogFabMenu(true);
    Animated.stagger(70, [
      Animated.spring(logFabItem1Anim, { toValue: 1, useNativeDriver: true, friction: 7, tension: 120 }),
      Animated.spring(logFabItem2Anim, { toValue: 1, useNativeDriver: true, friction: 7, tension: 120 }),
      Animated.spring(logFabItem3Anim, { toValue: 1, useNativeDriver: true, friction: 7, tension: 120 }),
      Animated.spring(logFabItem4Anim, { toValue: 1, useNativeDriver: true, friction: 7, tension: 120 }),
    ]).start();
  };
  const closeLogFabMenu = () => {
    Animated.parallel([
      Animated.timing(logFabItem1Anim, { toValue: 0, duration: 130, useNativeDriver: true }),
      Animated.timing(logFabItem2Anim, { toValue: 0, duration: 130, useNativeDriver: true }),
      Animated.timing(logFabItem3Anim, { toValue: 0, duration: 130, useNativeDriver: true }),
      Animated.timing(logFabItem4Anim, { toValue: 0, duration: 130, useNativeDriver: true }),
    ]).start(() => setShowLogFabMenu(false));
  };
  const toggleLogFabMenu = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    if (showLogFabMenu) closeLogFabMenu(); else openLogFabMenu();
  };
  const [waterPresets, setWaterPresets] = useState<[number,number,number]>([8,12,16]);
  const [waterGoal, setWaterGoal] = useState(WATER_TARGET);
  const [achievementStore, setAchievementStore] = useState<AchievementsStore>({});
  const waterModalAnim = useRef(new Animated.Value(0)).current;
  const waterCustomInputRef = useRef<any>(null);
  const [showWaterCustomModal, setShowWaterCustomModal] = useState(false);
  const [waterCustomSign, setWaterCustomSign] = useState<'add'|'subtract'>('add');
  const [waterCustomInput, setWaterCustomInput] = useState('');
  const [showWaterDetailModal, setShowWaterDetailModal] = useState(false);
  const waterDetailAnim = useRef(new Animated.Value(0)).current;
  const [waterPresetInputs, setWaterPresetInputs] = useState<[string,string,string]>(['','','']);
  const [waterGoalInput, setWaterGoalInput] = useState('');
  const [mealSlots, setMealSlots] = useState<MealSlot[]>(DEFAULT_MEAL_SLOTS);
  const [slotNameCache, setSlotNameCache] = useState<Record<string, string>>({});
  // Repeat a Meal: per-slot history summary (drives the empty-slot pill + one-tap fast path)
  // and the launch slot for the modal (null = closed).
  const [repeatSummary, setRepeatSummary] = useState<Record<string, SlotRepeatInfo>>({});
  const [repeatModalSlot, setRepeatModalSlot] = useState<MealSlot | null>(null);
  const [showEditMeals, setShowEditMeals] = useState(false);
  const [editMealsTutorialMode, setEditMealsTutorialMode] = useState(false);
  const editMealsAnim = useRef(new Animated.Value(0)).current;
  const editMealsListRef = useRef<any>(null);
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [editingSlotName, setEditingSlotName] = useState('');
  const [logRefreshKey, setLogRefreshKey] = useState(0);
  const { activeCalories } = useHealthKit();
  const [styleMode, setStyleMode] = useState<'discipline' | 'balanced' | 'mindful'>('balanced');
  const [burnAccuracyPct, setBurnAccuracyPct] = useState(100);
  const [showNetCarbs, setShowNetCarbs] = useState(false);
  const [macroGoals, setMacroGoals] = useState({ protein: 0, carbs: 0, fat: 0 });
  const [calPickerVisible, setCalPickerVisible] = useState(false);
  const [pickerYear, setPickerYear] = useState(0);
  const [pickerMonth, setPickerMonth] = useState(0);
  const calFadeAnim = useRef(new Animated.Value(0)).current;
  const skipDateEffect = useRef(false);
  const dateEffectMounted = useRef(false);
  const returningFromChild = useRef(false);
  const activeDateRef = useRef(activeDate);

  // IF state (always today -- IF tracks the current day's fast, not the browsed date)
  const [ifStart,       setIfStart]       = useState<number|null>(null);
  const [ifMethod,      setIfMethod]      = useState<string>('16:8');
  const [ifEnd,         setIfEnd]         = useState<number|null>(null);
  const [ifCustomHours, setIfCustomHours] = useState<string>('16');
  const [showTimePicker,    setShowTimePicker]      = useState(false);
  const [showEndTimePicker, setShowEndTimePicker]   = useState(false);
  const [pickerTime,        setPrickerTime]         = useState<Date|null>(null);
  const [currentTime,       setCurrentTime]         = useState(Date.now());
  const ifLoaded = useRef(false);

  // Past-day IF read state (read-only summary when browsing a past date)
  const [pastIfStart,       setPastIfStart]       = useState<number|null>(null);
  const [pastIfEnd,         setPastIfEnd]         = useState<number|null>(null);
  const [pastIfMethod,      setPastIfMethod]      = useState<string>('16:8');
  const [pastIfCustomHours, setPastIfCustomHours] = useState<string>('16');

  const goToPrevDay = () => {
    const d = new Date(activeDate + 'T12:00:00');
    d.setDate(d.getDate() - 1);
    setActiveDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  };

  const goToNextDay = () => {
    const d = new Date(activeDate + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (next <= todayKey) setActiveDate(next);
  };

  const isToday = activeDate === todayKey;

  // IF computed values -- always based on currentTime (1-second interval)
  const windowHours = ifMethod === 'Custom' ? (parseInt(ifCustomHours) || 16) : (IF_METHODS[ifMethod]?.eat || 8);
  const windowEnd   = ifStart ? ifStart + windowHours * 3600000 : null;
  const remaining   = windowEnd && !ifEnd ? windowEnd - currentTime : null;
  const isOpen      = remaining !== null && remaining > 0;
  const ifActualMs  = ifEnd && ifStart ? ifEnd - ifStart : null;
  const ifTargetMs  = windowHours * 3600000;
  const ifOverUnderMs = ifEnd && windowEnd ? ifEnd - windowEnd : null;
  const ifResultColor = ifOverUnderMs === null ? '#888888' : ifOverUnderMs <= 5*60000 ? '#10b981' : ifOverUnderMs <= 45*60000 ? '#f59e0b' : '#ef4444';
  const ifResultLabel = ifOverUnderMs === null ? '' : ifOverUnderMs <= 5*60000 ? 'COMPLETE' : ifOverUnderMs <= 45*60000 ? `MISSED BY ${Math.round(ifOverUnderMs/60000)}M` : 'FAILED';

  // Past-day IF computed values (read-only, no currentTime dependency)
  const pastWindowHours    = pastIfMethod === 'Custom' ? (parseInt(pastIfCustomHours) || 16) : (IF_METHODS[pastIfMethod]?.eat || 8);
  const pastWindowEnd      = pastIfStart ? pastIfStart + pastWindowHours * 3600000 : null;
  const pastIfActualMs     = pastIfEnd && pastIfStart ? pastIfEnd - pastIfStart : null;
  const pastIfTargetMs     = pastWindowHours * 3600000;
  const pastIfOverUnderMs  = pastIfEnd && pastWindowEnd ? pastIfEnd - pastWindowEnd : null;
  const pastIfResultColor  = pastIfOverUnderMs === null ? '#888888' : pastIfOverUnderMs <= 5*60000 ? '#10b981' : pastIfOverUnderMs <= 45*60000 ? '#f59e0b' : '#ef4444';
  const pastIfResultLabel  = pastIfOverUnderMs === null ? '' : pastIfOverUnderMs <= 5*60000 ? 'COMPLETE' : pastIfOverUnderMs <= 45*60000 ? `MISSED BY ${Math.round(pastIfOverUnderMs/60000)}M` : 'FAILED';

  const openCalPicker = () => {
    const parts = activeDate.split('-');
    setPickerYear(parseInt(parts[0]));
    setPickerMonth(parseInt(parts[1]) - 1);
    calFadeAnim.setValue(0);
    setCalPickerVisible(true);
  };
  const closeCalPicker = () => {
    Animated.timing(calFadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => setCalPickerVisible(false));
  };
  const calPickerSelect = (dk: string) => {
    if (dk <= todayKey) { setActiveDate(dk); closeCalPicker(); }
  };
  const calPickerPrev = () => {
    if (pickerMonth === 0) { setPickerMonth(11); setPickerYear(y => y - 1); }
    else setPickerMonth(m => m - 1);
  };
  const calPickerNext = () => {
    const nm = pickerMonth === 11 ? 0 : pickerMonth + 1;
    const ny = pickerMonth === 11 ? pickerYear + 1 : pickerYear;
    if (`${ny}-${String(nm + 1).padStart(2, '0')}-01` <= todayKey) { setPickerMonth(nm); setPickerYear(ny); }
  };
  const calPickerCanGoNext = () => {
    const nm = pickerMonth === 11 ? 0 : pickerMonth + 1;
    const ny = pickerMonth === 11 ? pickerYear + 1 : pickerYear;
    return `${ny}-${String(nm + 1).padStart(2, '0')}-01` <= todayKey;
  };
  const CAL_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const CAL_DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const renderCalGrid = () => {
    const firstDay = new Date(pickerYear, pickerMonth, 1).getDay();
    const daysInMonth = new Date(pickerYear, pickerMonth + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    const rows: (number | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return (
      <View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); calPickerPrev(); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="chevron-back" size={20} color={theme.accentBlueRaw} />
          </TouchableOpacity>
          {/* textSecondary, not textPrimary: textPrimary is the harsh near-black on Light and this is a
              header, not data. And INTERFACE, not Type.num -- "July 2026" is a month NAME with a year on it,
              not a value; the number face is condensed + tabular and made it read like a readout. */}
          <GradientTitle title={`${CAL_MONTHS[pickerMonth]} ${pickerYear}`} color={theme.textSecondary} style={{ fontSize: 15, fontFamily: Type.uiBold }} />
          <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); calPickerNext(); }} disabled={!calPickerCanGoNext()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="chevron-forward" size={20} color={calPickerCanGoNext() ? theme.accentBlueRaw : theme.textDim} />
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row', marginBottom: 6 }}>
          {CAL_DAYS.map(d => (
            <View key={d} style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontSize: 9, color: theme.textDim, fontFamily: Type.uiBold, letterSpacing: 1 }}>{d}</Text>
            </View>
          ))}
        </View>
        {rows.map((row, ri) => (
          <View key={ri} style={{ flexDirection: 'row', marginBottom: 2 }}>
            {row.map((day, ci) => {
              if (!day) return <View key={ci} style={{ flex: 1 }} />;
              const dk = `${pickerYear}-${String(pickerMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isSel = dk === activeDate;
              const isFut = dk > todayKey;
              const isTod = dk === todayKey;
              return (
                <TouchableOpacity key={ci} style={{ flex: 1, alignItems: 'center', paddingVertical: 5 }} onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); calPickerSelect(dk); }} disabled={isFut} activeOpacity={0.7}>
                  <View style={{
                    width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center',
                    backgroundColor: isSel ? theme.accentBlueRaw : isTod ? `${theme.accentBlueRaw}26` : 'transparent',
                    borderWidth: isTod && !isSel ? 0.5 : 0, borderColor: theme.accentBlueRaw,
                  }}>
                    <Text style={{ fontSize: 13, fontFamily: isSel ? Type.uiBold : Type.ui, color: isSel ? theme.bgPrimary : isFut ? theme.textDim : theme.textSecondary }}>
                      {day}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  const formatActiveDate = () => {
    const d = new Date(activeDate + 'T12:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  };
  
  const totalCals = entries.reduce((s, e) => s + e.cal, 0);
  const activeAdj = Math.round((isToday && activeCalories > 0 ? activeCalories : caloriesBurned) * burnAccuracyPct / 100);
  // On-pace target floored at calTarget. Mirrors the home Calories card (see index.tsx):
  // BMR + measured active - pace deficit, but never below calTarget (TDEE - deficit).
  const onPaceTarget = Math.max(calTarget, profileBmr + activeAdj + paceDeficit);
  const displayTarget = styleMode === 'mindful' ? calTarget : onPaceTarget;
  const calPct = displayTarget > 0 ? (totalCals / displayTarget) * 100 : 0;
  // Hooks must run unconditionally every render -- this used to be an INLINE useAnimatedStyle() call
  // sitting inside the Today's Total card's JSX, which was safe only because that JSX was never
  // conditional. Gating the card behind `!loaded` (2026-07-17) made the hook call itself conditional --
  // "Rendered more hooks than during the previous render" the moment `loaded` flipped true. Moved to the
  // component's top level so it always runs; the JSX below just references the resulting style object.
  const calProgressBarStyle = useAnimatedStyle(() => ({ width: withTiming(`${Math.min(calPct, 100)}%` as any, { duration: 400 }) }));
  // Bottom stat strip (mirrors the home Calories card: REMAINING | ACTIVE | LIVE NET).
  const remainingVal = displayTarget - totalCals;
  const nowMinLog = new Date(currentTime).getHours() * 60 + new Date(currentTime).getMinutes();
  const runningBmrLog = profileBmr > 0 ? Math.round((profileBmr / 1440) * nowMinLog) : 0;
  // Running BMR for today (day still in progress), full BMR for a completed past day.
  const logNet = totalCals - activeAdj - (isToday ? runningBmrLog : profileBmr);
  const calStats = [
    { label: remainingVal >= 0 ? 'REMAINING' : 'OVER', value: `${Math.abs(Math.round(remainingVal))}`, color: remainingVal >= 0 ? theme.textSecondary : theme.statusBad },
    { label: 'ACTIVE', value: `${activeAdj}`, color: theme.textSecondary },
    // Net needs BMR; with no resolvable weight (BMR 0) it would be overstated by the
    // whole missing BMR, so show a dash + hint instead of a wrong number (mirrors home).
    { label: 'LIVE NET', value: profileBmr > 0 ? `${logNet > 0 ? '+' : ''}${Math.round(logNet)}` : '—', color: theme.textSecondary },
  ];
  // Recipe-logged entries store extended nutrients as FLAT fields (e.fiber, e.sodium, ...),
  // already scaled to the logged portion, NOT inside foodNutrients. Map each readable name to
  // its flat key so recipe fiber/sugar/etc. actually count in the day's advanced nutrition.
  const FLAT_NUTRIENT_KEY: Record<string, string> = {
    'Fiber, total dietary': 'fiber',
    'Sugars, total including NLEA': 'sugar',
    'Sodium, Na': 'sodium',
    'Cholesterol': 'cholesterol',
    'Fatty acids, total saturated': 'saturatedFat',
    'Polyunsaturated Fat': 'polyunsaturatedFat',
    'Monounsaturated Fat': 'monounsaturatedFat',
    'Added Sugars': 'addedSugars',
    'Trans Fat': 'transFat',
    'Vitamin A': 'vitaminA',
    'Vitamin C': 'vitaminC',
    'Vitamin D': 'vitaminD',
  };
  const getAdvancedNutrient = (name: string) => {
    return Math.round(entries.reduce((s, e) => {
      const n = e.foodNutrients?.find((fn: any) => fn.nutrientName === name);
      if (!n) {
        // Fallback to the flat field (recipe entries). Already the portion total -- no scaling.
        const flatKey = FLAT_NUTRIENT_KEY[name];
        if (flatKey && typeof (e as any)[flatKey] === 'number') return s + (e as any)[flatKey];
        return s;
      }
      let scale: number;
      if (e.fsId) {
        scale = (e.calPer100g && e.calPer100g > 0) ? (e.cal / e.calPer100g) : 0;
      } else {
        const sg = (e as any).servingGrams;
        const servingCal = sg && (e.calPer100g ?? 0) > 0 ? (e.calPer100g ?? 0) * sg / 100 : 0;
        scale = servingCal > 0 ? e.cal / servingCal : 0;
      }
      return s + (n.value || 0) * scale;
    }, 0) * 10) / 10;
  };
  const totalFiber = getAdvancedNutrient('Fiber, total dietary');
  const totalSugar = getAdvancedNutrient('Sugars, total including NLEA');
  const totalSodium = getAdvancedNutrient('Sodium, Na');
  const totalCholesterol = getAdvancedNutrient('Cholesterol');
  const totalSatFat = getAdvancedNutrient('Fatty acids, total saturated');
  const totalPolyFat = getAdvancedNutrient('Polyunsaturated Fat');
  const totalMonoFat = getAdvancedNutrient('Monounsaturated Fat');
  const totalPotassium = Math.round(getAdvancedNutrient('Potassium, K'));
  const totalSugarAlcohols = getAdvancedNutrient('Sugar Alcohols');
  const totalAddedSugars  = getAdvancedNutrient('Added Sugars');
  const totalTransFat     = getAdvancedNutrient('Trans Fat');
  const totalVitaminA     = Math.round(getAdvancedNutrient('Vitamin A'));
  const totalVitaminC     = Math.round(getAdvancedNutrient('Vitamin C'));
  const totalVitaminD     = getAdvancedNutrient('Vitamin D');
  const totalCalciumAdv   = Math.round(getAdvancedNutrient('Calcium, Ca'));
  const totalIronAdv      = getAdvancedNutrient('Iron, Fe');
  const totalCaffeine     = getAdvancedNutrient('Caffeine');
  const totalVitaminE     = getAdvancedNutrient('Vitamin E');
  const totalVitaminK     = getAdvancedNutrient('Vitamin K');
  const totalVitaminB6    = getAdvancedNutrient('Vitamin B6');
  const totalFolate       = getAdvancedNutrient('Folate');
  const totalVitaminB12   = getAdvancedNutrient('Vitamin B12');
  const totalBiotin       = getAdvancedNutrient('Biotin');
  const totalThiamin      = getAdvancedNutrient('Thiamin');
  const totalRiboflavin   = getAdvancedNutrient('Riboflavin');
  const totalNiacin       = getAdvancedNutrient('Niacin');
  const totalCholine      = getAdvancedNutrient('Choline');
  const totalMagnesium    = getAdvancedNutrient('Magnesium, Mg');
  const totalZinc         = getAdvancedNutrient('Zinc, Zn');
  const totalCopper       = getAdvancedNutrient('Copper, Cu');
  const totalNetCarbs     = Math.max(0, Math.round((totalCarbs - totalFiber - totalSugarAlcohols) * 10) / 10);
  const calDelta = Math.abs(totalCals - displayTarget);
  const calColor = styleMode === 'mindful'
    ? theme.textSecondary
    : styleMode === 'discipline'
      ? calDelta <= 50  ? theme.statusGood
      : calDelta <= 149 ? theme.statusWarn
      : theme.statusBad
    : /* balanced */ calDelta <= 150 ? theme.statusGood
      : calDelta <= 300 ? theme.statusWarn
      : theme.statusBad;
  const waterPct = Math.min(100, (water / waterGoal) * 100);

  const saveField = async (field: string, value: any) => {
    try {
      const existing = await AsyncStorage.getItem(`pj_${activeDate}`);
      const current = existing ? JSON.parse(existing) : {};
      await storageSet(`pj_${activeDate}`, JSON.stringify({ ...current, [field]: value }));
    } catch (e) {
      console.log('Save error', e);
    }
  };

  useEffect(() => { loadAchievements().then(store => setAchievementStore(store)); }, []);

  useEffect(() => {
    loadMealSlots().then(({ mealSlots: slots, slotNameCache: cache }) => {
      setMealSlots(slots);
      setSlotNameCache(cache);
    });
  }, []);

  // Deferred until the tab-switch transition finishes -- same fix shape as Workout's tab-mount stutter.
  // ONE-TIME initial load only; useFocusEffect's reload below stays immediate on every focus/return-from-
  // add-food, since that's what keeps this screen honest after a food gets logged elsewhere.
  useEffect(() => {
    const load = async () => {
    try {
        const saved = await AsyncStorage.getItem(`pj_${activeDate}`);
        if (saved) {
          const data = JSON.parse(saved);
          if (data.entries && Array.isArray(data.entries)) {
  const clean = data.entries.filter((e: any) => e != null);
  setEntries(clean);
  setTotalProtein(Math.round(clean.reduce((s: number, e: any) => s + (e.protein || 0), 0) * 10) / 10);
  setTotalCarbs(Math.round(clean.reduce((s: number, e: any) => s + (e.carbs || 0), 0) * 10) / 10);
  setTotalFat(Math.round(clean.reduce((s: number, e: any) => s + (e.fat || 0), 0) * 10) / 10);
  if (clean.length !== data.entries.length) storageSet(`pj_${activeDate}`, JSON.stringify({ ...data, entries: clean }));
}
          if (typeof data.water === 'number') setWater(Math.max(0, data.water));
          if (Array.isArray(data.waterEntries)) setWaterEntries(data.waterEntries);
        } else {
          const cloudData = await loadFromFirebase(todayKey);
          if (cloudData) {
            if (cloudData.entries && Array.isArray(cloudData.entries)) setEntries(cloudData.entries);
            if (typeof cloudData.water === 'number') setWater(Math.max(0, cloudData.water));
            if (Array.isArray(cloudData.waterEntries)) setWaterEntries(cloudData.waterEntries);
            await storageSet(`pj_${activeDate}`, JSON.stringify(cloudData));
          }
        }
        const profileData = await AsyncStorage.getItem('pj_profile');
        if (profileData) {
          const p = JSON.parse(profileData);
          if (p.waterPresets) setWaterPresets(p.waterPresets);
          if (p.waterGoal && parseInt(p.waterGoal) > 0) setWaterGoal(parseInt(p.waterGoal));
          // Calorie target + BMR via the shared helper (same call home uses, so they match).
          const targets = await loadCalorieTargets(activeDate);
          setCalTarget(targets.calTarget);
          setProfileBmr(targets.bmr);
          setPaceDeficit(targets.paceDeficit);
          // Macro goals -- same logic as home tab
          const kcalForMacros = parseInt(p.calTarget) || 0;
          if (p.macroMode === 'fixed' && p.macroProteinG && p.macroCarbsG && p.macroFatG) {
            setMacroGoals({
              protein: parseFloat(p.macroProteinG) || 0,
              carbs:   parseFloat(p.macroCarbsG)   || 0,
              fat:     parseFloat(p.macroFatG)      || 0,
            });
          } else if (p.macroProteinPct && p.macroCarbsPct && p.macroFatPct && kcalForMacros > 0) {
            setMacroGoals({
              protein: Math.round(((parseFloat(p.macroProteinPct) || 35) / 100) * kcalForMacros / 4),
              carbs:   Math.round(((parseFloat(p.macroCarbsPct)   || 40) / 100) * kcalForMacros / 4),
              fat:     Math.round(((parseFloat(p.macroFatPct)     || 25) / 100) * kcalForMacros / 9),
            });
          } else if (kcalForMacros > 0) {
            setMacroGoals({
              protein: Math.round((0.35 * kcalForMacros) / 4),
              carbs:   Math.round((0.40 * kcalForMacros) / 4),
              fat:     Math.round((0.25 * kcalForMacros) / 9),
            });
          }
        }
      } catch (e) {
        console.log('Load error', e);
      } finally {
        setLoaded(true);
      }
    };
    const handle = InteractionManager.runAfterInteractions(load);
    return () => handle.cancel();
  }, []);

  // ── Register log ScrollView with tutorial system ──────────────────────────
  useEffect(() => {
    registerScrollView('log', scrollRef);
    return () => unregisterScrollView('log');
  }, []);

  useEffect(() => {
    if (scrollTo !== 'if') return;
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, ifCardOffset.current - 16), animated: true });
    }, 400);
  }, [scrollTo]);

  // ── 1-second currentTime tick for IF countdown ────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // ── Load IF data for today on mount ───────────────────────────────────────
  useEffect(() => {
    const loadIF = async () => {
      try {
        const saved = await AsyncStorage.getItem(`pj_${todayKey}`);
        if (saved) {
          const data = JSON.parse(saved);
          if (data.ifMethod)      setIfMethod(data.ifMethod);
          if (data.ifCustomHours) setIfCustomHours(data.ifCustomHours);
          if (data.ifStart) {
            const startDate = new Date(data.ifStart);
            const startKey = `${startDate.getFullYear()}-${String(startDate.getMonth()+1).padStart(2,'0')}-${String(startDate.getDate()).padStart(2,'0')}`;
            if (startKey === todayKey) {
              setIfStart(data.ifStart);
              if (data.ifEnd) setIfEnd(data.ifEnd);
            }
          }
        }
      } catch (e) {
        console.log('IF load error', e);
      } finally {
        ifLoaded.current = true;
      }
    };
    loadIF();
  }, []);

  // ── Auto-save IF state for today whenever it changes ────────────────────
  useEffect(() => {
    if (!ifLoaded.current) return;
    const saveIF = async () => {
      try {
        const existing = await AsyncStorage.getItem(`pj_${todayKey}`);
        const current = existing ? JSON.parse(existing) : {};
        await storageSet(`pj_${todayKey}`, JSON.stringify({
          ...current, ifStart, ifMethod, ifEnd, ifCustomHours,
        }));
      } catch (e) { console.log('IF save error', e); }
    };
    saveIF();
  }, [ifStart, ifEnd, ifMethod, ifCustomHours]);

  useFocusEffect(
    useCallback(() => {
      const reload = async (dateKey: string) => {
        setEntries([]);
        setWater(0);
        setTotalProtein(0);
        setTotalCarbs(0);
        setTotalFat(0);
        try {
          const saved = await AsyncStorage.getItem(`pj_${dateKey}`);
          if (saved) {
            const data = JSON.parse(saved);
            if (data.entries && Array.isArray(data.entries)) {
  const clean = data.entries.filter((e: any) => e != null);
  setEntries(clean);
  setTotalProtein(Math.round(clean.reduce((s: number, e: any) => s + (e.protein || 0), 0) * 10) / 10);
  setTotalCarbs(Math.round(clean.reduce((s: number, e: any) => s + (e.carbs || 0), 0) * 10) / 10);
  setTotalFat(Math.round(clean.reduce((s: number, e: any) => s + (e.fat || 0), 0) * 10) / 10);
  if (clean.length !== data.entries.length) storageSet(`pj_${dateKey}`, JSON.stringify({ ...data, entries: clean }));
  const tutEntry = clean.find((e: any) => e.tutorialEntry);
  if (tutEntry) {
    const tutSlot = findSlotForMeal(tutEntry.meal, mealSlots);
    const tutKey = tutSlot?.id ?? tutEntry.meal;
    getMealAnim(tutKey).setValue(1);
    setExpandedMeals(prev => ({ ...prev, [tutKey]: true }));
    setVisibleMeals(prev => ({ ...prev, [tutKey]: true }));
  }
}
            // Water: load the entries list too (NOT just the number) so this list never
            // goes stale on focus -- a stale list written back is what clobbered a day's
            // real total. Total derives from the list; number is the fallback for legacy days.
            if (Array.isArray(data.waterEntries)) {
              setWaterEntries(data.waterEntries);
              setWater(sumWaterEntries(data.waterEntries));
            } else {
              setWaterEntries([]);
              if (typeof data.water === 'number') setWater(Math.max(0, data.water));
            }
            setCaloriesBurned(parseInt(data.activeCalories || data.caloriesBurned) || 0);
          } else {
            setEntries([]);
            setWater(0);
            setWaterEntries([]);
            setTotalProtein(0);
            setTotalCarbs(0);
            setTotalFat(0);
          }
        const profileData = await AsyncStorage.getItem('pj_profile');
        if (profileData) {
          const p = JSON.parse(profileData);
          if (p.waterPresets) setWaterPresets(p.waterPresets);
          if (p.waterGoal && parseInt(p.waterGoal) > 0) setWaterGoal(parseInt(p.waterGoal));
          // Calorie target + BMR via the shared helper (same call home uses, so they match).
          const targets = await loadCalorieTargets(dateKey);
          setCalTarget(targets.calTarget);
          setProfileBmr(targets.bmr);
          setPaceDeficit(targets.paceDeficit);
        }
        setLogRefreshKey(k => k + 1);
        } catch (e) {
          console.log('Reload error', e);
        }
        skipDateEffect.current = false;
      };
      if (returningFromChild.current) {
        returningFromChild.current = false;
        reload(activeDateRef.current);
        return;
      }
      const t = new Date();
      const focusDateKey = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
      AsyncStorage.getItem('pj_settings').then(s => {
        if (s) {
          const d = JSON.parse(s);
          if (d.styleMode) setStyleMode(d.styleMode);
          if (d.burnAccuracyPct !== undefined) setBurnAccuracyPct(d.burnAccuracyPct);
          if (d.showNetCarbs !== undefined) setShowNetCarbs(d.showNetCarbs);
          if (Array.isArray(d.mealSlots) && d.mealSlots.length > 0) setMealSlots(d.mealSlots);
          if (d.slotNameCache && typeof d.slotNameCache === 'object') setSlotNameCache(d.slotNameCache);
          if (d.nutritionPreset) setNutritionPreset(d.nutritionPreset);
          if (d.nutritionGoals) setNutritionGoals({ ...NUTRITION_PRESETS.standard, ...d.nutritionGoals });
        }
      });
      loadAchievements().then(store => setAchievementStore(store));
      skipDateEffect.current = true;
      setActiveDate(focusDateKey);
      reload(focusDateKey);
    }, [])
  );

  useEffect(() => {
    activeDateRef.current = activeDate;
    if (!dateEffectMounted.current) { dateEffectMounted.current = true; return; }
    if (skipDateEffect.current) { skipDateEffect.current = false; return; }
    const loadDay = async () => {
      setEntries([]);
      setWater(0);
      setWaterEntries([]);
      setCaloriesBurned(0);
      setTotalProtein(0);
      setTotalCarbs(0);
      setTotalFat(0);
      setPastIfStart(null);
      setPastIfEnd(null);
      try {
        const saved = await AsyncStorage.getItem(`pj_${activeDate}`);
        if (saved) {
          const data = JSON.parse(saved);
          if (data.entries && Array.isArray(data.entries)) {
            const clean = data.entries.filter((e: any) => e != null);
            setEntries(clean);
            setTotalProtein(Math.round(clean.reduce((s: number, e: any) => s + (e.protein || 0), 0) * 10) / 10);
            setTotalCarbs(Math.round(clean.reduce((s: number, e: any) => s + (e.carbs || 0), 0) * 10) / 10);
            setTotalFat(Math.round(clean.reduce((s: number, e: any) => s + (e.fat || 0), 0) * 10) / 10);
          }
          if (typeof data.water === 'number') setWater(Math.max(0, data.water));
          if (Array.isArray(data.waterEntries)) setWaterEntries(data.waterEntries);
          setCaloriesBurned(parseInt(data.activeCalories || data.caloriesBurned) || 0);
          // Load past-day IF data for read-only summary
          if (data.ifStart && data.ifEnd) {
            setPastIfStart(data.ifStart);
            setPastIfEnd(data.ifEnd);
            if (data.ifMethod) setPastIfMethod(data.ifMethod);
            if (data.ifCustomHours) setPastIfCustomHours(data.ifCustomHours);
          }
        }
        setLogRefreshKey(k => k + 1);
      } catch (e) {
        console.log('Date nav load error', e);
      }
    };
    loadDay();
  }, [activeDate]);

  const deleteEntry = (idx: number) => {
    const newEntries = entries.filter((_, i) => i !== idx);
    setEntries(newEntries);
    setTotalProtein(Math.round(newEntries.reduce((s, e) => s + (e.protein || 0), 0) * 10) / 10);
    setTotalCarbs(Math.round(newEntries.reduce((s, e) => s + (e.carbs || 0), 0) * 10) / 10);
    setTotalFat(Math.round(newEntries.reduce((s, e) => s + (e.fat || 0), 0) * 10) / 10);
    saveField('entries', newEntries);
    saveToFirebase(activeDate, 'entries', newEntries);
  };

  // Repeat a Meal ────────────────────────────────────────────────────────────────────────────────
  // Scan the 14 days before the viewed day (once, all slots) so each empty slot knows whether to
  // show the Repeat pill and whether a one-tap "repeat yesterday" target exists. Depends only on the
  // viewed day + slot set (it reads PAST records), so today's edits don't need to retrigger it.
  useEffect(() => {
    let alive = true;
    getRepeatSummary(mealSlots, activeDate).then(summary => { if (alive) setRepeatSummary(summary); });
    return () => { alive = false; };
  }, [activeDate, mealSlots]);

  // Shared apply path for both the one-tap fast path and the modal: adopt the merged entries list
  // (already persisted to storage by logRepeatedItems), refresh totals, push to Firebase.
  const applyMergedEntries = (merged: any[]) => {
    setEntries(merged);
    setTotalProtein(Math.round(merged.reduce((s, e) => s + (e.protein || 0), 0) * 10) / 10);
    setTotalCarbs(Math.round(merged.reduce((s, e) => s + (e.carbs || 0), 0) * 10) / 10);
    setTotalFat(Math.round(merged.reduce((s, e) => s + (e.fat || 0), 0) * 10) / 10);
    saveToFirebase(activeDate, 'entries', merged);
  };

  // One-tap fast path: clone yesterday's same-slot items straight into the viewed day.
  const repeatYesterday = async (slot: MealSlot) => {
    const info = repeatSummary[slot.id];
    if (!info || info.yesterdayItems.length === 0) return;
    try {
      const merged = await logRepeatedItems(activeDate, slot.id, info.yesterdayItems);
      applyMergedEntries(merged);
      triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
      showToast(`${slot.name} added`, `${info.yesterdayItems.length} ${info.yesterdayItems.length === 1 ? 'item' : 'items'} · ${info.yesterdayTotal} kcal`, 'success');
    } catch {
      showToast('Could not add', 'Please try again', 'error');
    }
  };

  const openRepeatModal = (slot: MealSlot) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setRepeatModalSlot(slot);
  };

  // Clear every entry logged to one meal slot on the viewed day (one confirm for the whole batch,
  // instead of deleting item-by-item). Read-then-merge: only this slot's entries are removed; other
  // meals and all other day fields are untouched.
  const clearMeal = (slot: MealSlot) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    const mealEntries = entries.filter(e => e.meal === slot.id || e.meal === slot.name);
    const count = mealEntries.length;
    if (count === 0) return;
    Alert.alert(
      `Clear ${slot.name}?`,
      `This removes all ${count} ${count === 1 ? 'item' : 'items'} logged to ${slot.name} on this day. It can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: () => {
          triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
          const remaining = entries.filter(e => !(e.meal === slot.id || e.meal === slot.name));
          setEntries(remaining);
          setTotalProtein(Math.round(remaining.reduce((s, e) => s + (e.protein || 0), 0) * 10) / 10);
          setTotalCarbs(Math.round(remaining.reduce((s, e) => s + (e.carbs || 0), 0) * 10) / 10);
          setTotalFat(Math.round(remaining.reduce((s, e) => s + (e.fat || 0), 0) * 10) / 10);
          saveField('entries', remaining);
          saveToFirebase(activeDate, 'entries', remaining);
          showToast(`${slot.name} cleared`, `${count} ${count === 1 ? 'item' : 'items'} removed`, 'success');
        }},
      ]
    );
  };

  useEffect(() => {
    const hasTutorialEntry = entries.some(e => e.tutorialEntry);
    if (hasTutorialEntry && !tutorialEntryRegistered.current) {
      registerTarget('log_entry_row', tutorialEntryRef);
      registerTarget('log_delete_btn', tutorialDeleteRef);
      tutorialEntryRegistered.current = true;
    } else if (!hasTutorialEntry && tutorialEntryRegistered.current) {
      unregisterTarget('log_entry_row');
      unregisterTarget('log_delete_btn');
      tutorialEntryRegistered.current = false;
    }
  }, [entries]);

  useEffect(() => {
    const deleteTutorialEntry = async () => {
      try {
        const today = new Date();
        const todayKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
        const saved = await AsyncStorage.getItem(`pj_${todayKey}`);
        if (!saved) return;
        const data = JSON.parse(saved);
        const cleaned = (data.entries || []).filter((e: any) => !e.tutorialEntry);
        await AsyncStorage.setItem(`pj_${todayKey}`, JSON.stringify({ ...data, entries: cleaned }));
        setEntries(prev => {
          const next = prev.filter(e => !e.tutorialEntry);
          setTotalProtein(Math.round(next.reduce((s, e) => s + (e.protein || 0), 0) * 10) / 10);
          setTotalCarbs(Math.round(next.reduce((s, e) => s + (e.carbs || 0), 0) * 10) / 10);
          setTotalFat(Math.round(next.reduce((s, e) => s + (e.fat || 0), 0) * 10) / 10);
          return next;
        });
      } catch {}
    };
    registerTutorialAction('deleteTutorialEntry', deleteTutorialEntry);
    return () => unregisterTutorialAction('deleteTutorialEntry');
  }, []);

  useEffect(() => {
    const addTutorialFoodEntries = async () => {
      try {
        const today = new Date();
        const dk = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
        const saved = await AsyncStorage.getItem(`pj_${dk}`);
        const data = saved ? JSON.parse(saved) : { entries: [], water: 0 };
        if ((data.entries || []).some((e: any) => e.tutorialEntry)) return;
        const demo: FoodEntry[] = [
          { name: 'Grilled Chicken Breast', cal: 165, meal: 'ms_lunch', protein: 31, carbs: 0, fat: 3.6, tutorialEntry: true, timestamp: Date.now() },
          { name: 'Brown Rice', cal: 216, meal: 'ms_lunch', protein: 4, carbs: 45, fat: 1.8, tutorialEntry: true, timestamp: Date.now() + 1 },
        ];
        const newEntries = [...(data.entries || []).filter((e: any) => e != null), ...demo];
        await AsyncStorage.setItem(`pj_${dk}`, JSON.stringify({ ...data, entries: newEntries }));
        setEntries(newEntries);
        setTotalProtein(Math.round(newEntries.reduce((s, e) => s + (e.protein || 0), 0) * 10) / 10);
        setTotalCarbs(Math.round(newEntries.reduce((s, e) => s + (e.carbs || 0), 0) * 10) / 10);
        setTotalFat(Math.round(newEntries.reduce((s, e) => s + (e.fat || 0), 0) * 10) / 10);
        getMealAnim('ms_lunch').setValue(1);
        setExpandedMeals(prev => ({ ...prev, 'ms_lunch': true }));
        setVisibleMeals(prev => ({ ...prev, 'ms_lunch': true }));
      } catch {}
    };
    registerTutorialAction('addTutorialFoodEntries', addTutorialFoodEntries);
    return () => unregisterTutorialAction('addTutorialFoodEntries');
  }, []);

  useEffect(() => {
    registerTutorialAction('openEditMealsForTutorial', async () => {
      editMealsAnim.setValue(1);
      setEditMealsTutorialMode(true);
      setShowEditMeals(true);
    });
    registerTutorialAction('scrollEditListToEnd', async () => {
      editMealsListRef.current?.scrollToEnd({ animated: false });
      await new Promise(r => setTimeout(r, 300));
    });
    return () => {
      unregisterTutorialAction('openEditMealsForTutorial');
      unregisterTutorialAction('scrollEditListToEnd');
    };
  }, []);

  // Tear down inline edit sheet when tutorial ends or is skipped
  useEffect(() => {
    if (!tutorialActiveState && editMealsTutorialMode) {
      setEditMealsTutorialMode(false);
      setShowEditMeals(false);
      setEditingSlotId(null);
      editMealsAnim.setValue(0);
    }
  }, [tutorialActiveState]);

  const toggleAdvanced = () => {
    if (!advancedExpanded) {
      setAdvancedVisible(true);
      setAdvancedExpanded(true);
      Animated.timing(advancedAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    } else {
      setAdvancedExpanded(false);
      Animated.timing(advancedAnim, { toValue: 0, duration: 100, useNativeDriver: true }).start(() => setAdvancedVisible(false));
    }
  };

  const toggleMeal = (meal: string) => {
    const isCurrentlyOpen = expandedMeals[meal];
    const anim = getMealAnim(meal);
    if (!isCurrentlyOpen) {
      setVisibleMeals(prev => ({ ...prev, [meal]: true }));
      setExpandedMeals(prev => ({ ...prev, [meal]: true }));
      Animated.timing(anim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      setExpandedMeals(prev => ({ ...prev, [meal]: false }));
      Animated.timing(anim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }).start(() => setVisibleMeals(prev => ({ ...prev, [meal]: false })));
    }
  };

  const openWaterCustomModal = (sign: 'add' | 'subtract') => {
    setWaterCustomSign(sign);
    setWaterCustomInput('');
    setShowWaterCustomModal(true);
    waterModalAnim.setValue(0);
    Animated.timing(waterModalAnim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
  };
  const closeWaterCustomModal = () => {
    waterCustomInputRef.current?.blur();
    Animated.timing(waterModalAnim, { toValue: 0, duration: 140, useNativeDriver: true }).start(() => setShowWaterCustomModal(false));
  };

  const openWaterDetailModal = () => {
    setWaterPresetInputs([String(waterPresets[0]), String(waterPresets[1]), String(waterPresets[2])]);
    setWaterGoalInput(String(waterGoal));
    setShowWaterDetailModal(true);
    waterDetailAnim.setValue(0);
    Animated.timing(waterDetailAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  };
  const closeWaterDetailModal = () => {
    Keyboard.dismiss();
    Animated.timing(waterDetailAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => setShowWaterDetailModal(false));
  };

  const deleteWaterEntry = async (idx: number) => {
    const target = waterEntries[idx];
    if (!target) return;
    // Re-read + reconcile (never-lower) the STORED day so a stale in-memory list can't drop
    // other entries (clobber bug). Remove only the targeted entry, matched by its timestamp.
    const existing = await AsyncStorage.getItem(`pj_${activeDate}`);
    const current = existing ? JSON.parse(existing) : {};
    const base = reconcileDayWater(current, activeDate);
    const matchIdx = base.waterEntries.findIndex(e => e.timestamp === target.timestamp && e.amount === target.amount && e.sign === target.sign);
    const newEntries = base.waterEntries.filter((_, i) => i !== (matchIdx >= 0 ? matchIdx : idx));
    const newWater = sumWaterEntries(newEntries);
    setWater(newWater);
    setWaterEntries(newEntries);
    await storageSet(`pj_${activeDate}`, JSON.stringify({ ...current, water: newWater, waterEntries: newEntries, waterGoal }));
    saveToFirebase(activeDate, 'water', newWater);
    showToast('Entry removed', `${newWater} oz total`, 'info');
  };

  const saveWaterPresets = async () => {
    const p0 = parseInt(waterPresetInputs[0]);
    const p1 = parseInt(waterPresetInputs[1]);
    const p2 = parseInt(waterPresetInputs[2]);
    if (!p0 || !p1 || !p2 || p0 <= 0 || p1 <= 0 || p2 <= 0) return;
    const newPresets: [number, number, number] = [p0, p1, p2];
    setWaterPresets(newPresets);
    Keyboard.dismiss();
    const existing = await AsyncStorage.getItem('pj_profile');
    const current = existing ? JSON.parse(existing) : {};
    await storageSet('pj_profile', JSON.stringify({ ...current, waterPresets: newPresets }));
    showToast('Presets saved', undefined, 'success');
  };

  const saveWaterGoal = async () => {
    const g = parseInt(waterGoalInput);
    if (!g || g <= 0) return;
    setWaterGoal(g);
    Keyboard.dismiss();
    const existing = await AsyncStorage.getItem('pj_profile');
    const current = existing ? JSON.parse(existing) : {};
    await storageSet('pj_profile', JSON.stringify({ ...current, waterGoal: String(g) }));
    showToast('Water goal saved', `${g} oz daily goal`, 'success');
  };

  const openEditMeals = () => {
    editMealsAnim.setValue(0);
    setShowEditMeals(true);
  };
  const closeEditMeals = () => {
    setEditingSlotId(null);
    Keyboard.dismiss();
    Animated.timing(editMealsAnim, { toValue: 0, duration: 160, useNativeDriver: true }).start(() => setShowEditMeals(false));
  };

  const addMealSlot = async () => {
    if (mealSlots.length >= 8) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    const newId = `ms_${Date.now()}`;
    const newName = 'New Meal';
    const newSlots = [...mealSlots, { id: newId, name: newName }];
    const newCache = { ...slotNameCache, [newId]: newName };
    setMealSlots(newSlots);
    setSlotNameCache(newCache);
    await saveMealSlots(newSlots, newCache);
    setEditingSlotId(newId);
    setEditingSlotName(newName);
  };

  const deleteMealSlot = (slotId: string) => {
    const slot = mealSlots.find(s => s.id === slotId);
    if (!slot) return;
    const hasEntriesToday = entries.some(e => e.meal === slotId || e.meal === slot.name);
    Alert.alert(
      `Delete "${slot.name}"?`,
      hasEntriesToday
        ? 'This slot has entries logged today. They won\'t be erased from your history, but they won\'t appear in your log going forward.'
        : 'This meal slot will be removed from your log.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
          const newSlots = mealSlots.filter(s => s.id !== slotId);
          setMealSlots(newSlots);
          await saveMealSlots(newSlots, slotNameCache);
        }},
      ]
    );
  };

  const commitRename = async (slotId: string, newName: string) => {
    const trimmed = newName.trim();
    setEditingSlotId(null);
    if (!trimmed) return;
    const newSlots = mealSlots.map(s => s.id === slotId ? { ...s, name: trimmed } : s);
    const newCache = { ...slotNameCache, [slotId]: trimmed };
    setMealSlots(newSlots);
    setSlotNameCache(newCache);
    await saveMealSlots(newSlots, newCache);
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
  };

  const updateWater = async (oz: number) => {
    // Re-read the stored day and reconcile it (never-lower) as the baseline, so a stale or
    // empty in-memory list can never clobber the day's real total. Append to that, derive
    // the number from the list.
    const existing = await AsyncStorage.getItem(`pj_${activeDate}`);
    const current = existing ? JSON.parse(existing) : {};
    const base = reconcileDayWater(current, activeDate);
    const prev = base.water;
    const sign: 'add' | 'remove' = oz > 0 ? 'add' : 'remove';
    const newEntry = { amount: Math.abs(oz), timestamp: new Date().toISOString(), sign };
    const newEntries = [...base.waterEntries, newEntry];
    const newWater = sumWaterEntries(newEntries);
    setWater(newWater);
    setWaterEntries(newEntries);
    await storageSet(`pj_${activeDate}`, JSON.stringify({ ...current, water: newWater, waterEntries: newEntries, waterGoal }));
    saveToFirebase(activeDate, 'water', newWater);
    if (oz > 0) {
      showToast('Water logged', `+${oz} oz · ${newWater} oz total`, 'info');
    } else if (oz < 0) {
      showToast('Water removed', `-${Math.abs(oz)} oz · ${newWater} oz total`, 'info');
    }
    if (oz > 0 && newWater >= waterGoal && prev < waterGoal && activeDate === todayKey) {
      cancelWaterPaceNotification();
      const { fired, count: hitCount } = await handleDailyGoalHit('water');
      if (fired) {
        showCelebration('small', 'WATER GOAL'); showDailyGoalToast('Water Goal', hitCount, 'water', '#3b82f6');
        let s = achievementStore;
        const hydrationMilestones: { id: string; threshold: number }[] = [
          { id: 'hydration_first', threshold: 1   },
          { id: 'hydration_10',   threshold: 10  },
          { id: 'hydration_30',   threshold: 30  },
          { id: 'hydration_50',   threshold: 50  },
          { id: 'hydration_75',   threshold: 75  },
          { id: 'hydration_100',  threshold: 100 },
          { id: 'hydration_200',  threshold: 200 },
          { id: 'hydration_365',  threshold: 365 },
        ];
        for (const m of hydrationMilestones) {
          if (hitCount >= m.threshold) {
            const r = await checkAndUnlock(m.id, s);
            if (r.newlyUnlocked) {
              setAchievementStore(r.updatedStore);
              const def = ACHIEVEMENTS.find(a => a.id === m.id);
              if (def) { showAchievementToast(def); showCelebration(getCelebTier(def), def.name, def); }
              s = r.updatedStore;
            }
          }
        }
      }
    }
  };

  return (
    <LinearGradient colors={[theme.gradientEnd, theme.gradientEnd]} style={styles.container}>
      <BackgroundLayers />
      <View onLayout={e => setHeaderH(e.nativeEvent.layout.height)} style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: theme.borderCard }]}>
        <BlurView intensity={theme.id === 'dark' ? 34 : 28} tint={theme.id === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} pointerEvents="none" />
        {/* Frosted chrome fill -- matches the tab bar (theme.chromeFill). 'transparent' on pure-blur themes. */}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.chromeFill }]} pointerEvents="none" />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
          <HeaderAvatar />
          <View style={{ flex: 1 }}>
            <GradientTitle title="Food Log" color={theme.accentBlueRaw} style={styles.headerTitle} />
            <View ref={dateNavRef} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 1, height: 12, overflow: 'visible' }}>
              <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); openCalPicker(); }} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
                <Text style={{ fontSize: 9, color: isToday ? theme.textMuted : theme.accentAmber, fontFamily: Type.uiBold, letterSpacing: 2, textTransform: 'uppercase' }}>
                  {formatActiveDate()}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); goToPrevDay(); }} hitSlop={{ top: 14, bottom: 14, left: 8, right: 8 }}>
                <Ionicons name="chevron-back" size={16} color={theme.accentBlue} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); goToNextDay(); }} disabled={isToday} hitSlop={{ top: 14, bottom: 14, left: 8, right: 8 }}>
                <Ionicons name="chevron-forward" size={16} color={isToday ? theme.textDim : theme.accentBlue} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity
              style={[styles.libraryBtn, { height: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder }]}
              onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Medium); returningFromChild.current = true; router.push({ pathname: '/add-food', params: { meal: 'browse', date: activeDate } }); }}>
              <ButtonShine radius={6} />
              <Text style={[styles.libraryBtnText, { color: theme.accentBlue }]}>Library</Text>
          </TouchableOpacity>
          <View ref={logEditLayoutBtnRef as any} collapsable={false}>
            <HeaderIconButton icon="grid" haptic={Haptics.ImpactFeedbackStyle.Medium} onPress={() => { openEditMeals(); }} />
          </View>
          <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); showToolkit('log'); }} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <GradientIcon name="help-circle" size={22} color={theme.accentBlue} />
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.content, { paddingTop: headerH + 16, paddingBottom: insets.bottom + TAB_SCROLL_PAD }]}
        onScrollBeginDrag={() => {}}
      >

      {/* Everything below is gated on `loaded` so it never shows a page of zeroed cards before the initial
          read has actually finished -- same false-flash bug as Workout's, same fix. Skeleton holds the
          shape; real cards cascade in as one wave once `loaded` flips true (once per session -- the
          useFocusEffect reload below stays immediate and does NOT replay this cascade). */}
      {!loaded ? (
        <LogSkeleton theme={theme} pulse={skeletonPulse} />
      ) : (
      <>
      {/* Today's Total Card */}
      <ReAnimated.View entering={FadeInDown.delay(0).springify()} ref={todayTotalRef} style={[styles.card, { backgroundColor: theme.bgCardGlass, shadowColor: theme.cardShadow, shadowOpacity: theme.cardShadowOpacity, borderColor: theme.borderCard, borderTopColor: theme.accentBlueRaw }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <Text style={[styles.cardLabel, { color: theme.textMuted, marginBottom: 0 }]}>Today's Total</Text>
          <TooltipIcon tooltipKey="todays_total" />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <View style={styles.calRow}>
              <View style={{ shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 0 }}>
                <AnimatedNumber
                  value={totalCals}
                  style={[styles.calNumber, { color: calColor, opacity: 0.88 }]}
                  duration={500}
                  renderValue={styleMode === 'mindful' ? undefined : (s) => (
                    <GradientNumber value={s} color={calColor} style={{ ...styles.calNumber, opacity: 0.88 }} />
                  )}
                />
              </View>
              <GradientNumber value={`/ ${displayTarget} kcal`} color={theme.textSecondary} style={styles.calTarget} />
            </View>
            <View style={[styles.progressBarBg, { backgroundColor: theme.bgProgressTrack }]}>
              <ReAnimated.View style={[styles.progressBarFill, calProgressBarStyle, { overflow: 'hidden' }]}>
                <LinearGradient colors={barFillGradient(calColor)} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={{ flex: 1 }} />
              </ReAnimated.View>
            </View>
          </View>
          <MacroStackedBar
            protein={totalProtein}
            carbs={showNetCarbs ? Math.max(0, Math.round((totalCarbs - totalFiber - totalSugarAlcohols) * 10) / 10) : totalCarbs}
            fat={totalFat}
            proteinGoal={macroGoals.protein}
            carbsGoal={macroGoals.carbs}
            fatGoal={macroGoals.fat}
            theme={theme}
            showNetCarbs={showNetCarbs}
            onPressProtein={() => {
              triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
              setDrilldownItem({ label: 'Protein', total: totalProtein, unit: 'g', direction: 'want-more', goal: macroGoals.protein || null, directField: 'protein' });
              setShowDrilldown(true);
            }}
            onPressCarbs={() => {
              triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
              setDrilldownItem({ label: 'Carbohydrates', total: totalCarbs, unit: 'g', direction: 'neutral', goal: macroGoals.carbs || null, directField: 'carbs', hasNetToggle: true, netTotal: totalNetCarbs, netComputeValue: computeNetCarbsForEntry });
              setShowDrilldown(true);
            }}
            onPressFat={() => {
              triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
              setDrilldownItem({ label: 'Fat', total: totalFat, unit: 'g', direction: 'neutral', goal: macroGoals.fat || null, directField: 'fat' });
              setShowDrilldown(true);
            }}
          />
        </View>
        {/* Bottom stat strip -- full width, mirrors home Calories card. Hidden in Mindful. */}
        {styleMode !== 'mindful' && (
          <>
            <View style={{ borderTopWidth: 0.5, borderTopColor: theme.borderCardTop, paddingTop: 10, marginTop: 10, flexDirection: 'row' }}>
              {calStats.map((s, i) => (
                <View key={i} style={{ flex: 1, alignItems: i === 1 ? 'center' : i === 2 ? 'flex-end' : 'flex-start' }}>
                  <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: Type.uiBold, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 2 }}>{s.label}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
                    <GradientNumber value={String(s.value)} color={s.color} style={{ fontSize: 18, fontFamily: Type.num, letterSpacing: 1 }} />
                    <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: Type.uiBold, letterSpacing: 1 }}>kcal</Text>
                  </View>
                </View>
              ))}
            </View>
            {/* No BMR (no resolvable weight): explain the dashed net, point to the fix. */}
            {profileBmr === 0 && (
              <Text style={{ fontSize: 11, color: theme.textMuted, fontFamily: Type.ui, fontStyle: 'italic', marginTop: 6 }}>
                Log your weight to see your calorie net.
              </Text>
            )}
          </>
        )}
      </ReAnimated.View>

      {/* Advanced Nutrition Card */}
      {(() => {
        const MUTED_GREEN = '#0d9268';
        const MUTED_RED   = '#cc3333';
        const getColor = (value: number, direction: string, goal: number | null): string => {
          if (direction === 'neutral' || goal === null) return theme.accentBlue;
          if (direction === 'want-more') return value >= goal ? MUTED_GREEN : theme.accentBlue;
          return value > goal ? MUTED_RED : theme.accentBlue;
        };
        const g = nutritionGoals;
        const advGroups = [
          {
            key: 'carbs', name: 'CARBS',
            items: [
              { label: 'Added Sugars', value: totalAddedSugars,   unit: 'g',  dir: 'want-less', goal: g.addedSugars,         nutrientKey: 'Added Sugars' },
              { label: 'Fiber',        value: totalFiber,         unit: 'g',  dir: 'want-more', goal: g.fiber,               nutrientKey: 'Fiber, total dietary' },
              { label: 'Sugar',        value: totalSugar,         unit: 'g',  dir: 'want-less', goal: g.sugar,               nutrientKey: 'Sugars, total including NLEA' },
              { label: 'Sugar Alc.',   value: totalSugarAlcohols, unit: 'g',  dir: 'neutral',   goal: g.sugarAlcohols, nutrientKey: 'Sugar Alcohols' },
            ],
          },
          {
            key: 'fats', name: 'FATS',
            items: [
              { label: 'Sat. Fat',   value: totalSatFat,   unit: 'g', dir: 'want-less', goal: g.saturatedFat, nutrientKey: 'Fatty acids, total saturated' },
              { label: 'Trans Fat',  value: totalTransFat, unit: 'g', dir: 'want-less', goal: g.transFat,     nutrientKey: 'Trans Fat' },
              { label: 'Poly Fat',   value: totalPolyFat,  unit: 'g', dir: 'neutral',   goal: g.polyunsaturatedFat, nutrientKey: 'Polyunsaturated Fat' },
              { label: 'Mono Fat',   value: totalMonoFat,  unit: 'g', dir: 'neutral',   goal: g.monounsaturatedFat, nutrientKey: 'Monounsaturated Fat' },
            ],
          },
          {
            key: 'core', name: 'CORE',
            items: [
              { label: 'Cholesterol', value: totalCholesterol, unit: 'mg', dir: 'want-less', goal: g.cholesterol, nutrientKey: 'Cholesterol' },
              { label: 'Sodium',      value: totalSodium,      unit: 'mg', dir: 'want-less', goal: g.sodium,      nutrientKey: 'Sodium, Na' },
              { label: 'Potassium',   value: totalPotassium,   unit: 'mg', dir: 'want-more', goal: g.potassium,   nutrientKey: 'Potassium, K' },
              { label: 'Caffeine',    value: totalCaffeine,    unit: 'mg', dir: 'want-less', goal: g.caffeine,    nutrientKey: 'Caffeine' },
            ],
          },
          {
            key: 'vitamins', name: 'VITAMINS',
            items: [
              { label: 'Vitamin A', value: totalVitaminA, unit: 'mcg', dir: 'want-more', goal: g.vitaminA, nutrientKey: 'Vitamin A' },
              { label: 'Vitamin C', value: totalVitaminC, unit: 'mg',  dir: 'want-more', goal: g.vitaminC, nutrientKey: 'Vitamin C' },
              { label: 'Vitamin D', value: totalVitaminD, unit: 'mcg', dir: 'want-more', goal: g.vitaminD, nutrientKey: 'Vitamin D' },
              { label: 'Vitamin E', value: totalVitaminE, unit: 'mg',  dir: 'want-more', goal: g.vitaminE, nutrientKey: 'Vitamin E' },
              { label: 'Vitamin K', value: totalVitaminK, unit: 'mcg', dir: 'want-more', goal: g.vitaminK, nutrientKey: 'Vitamin K' },
            ],
          },
          {
            key: 'bvitamins', name: 'B VITAMINS',
            items: [
              { label: 'B6',     value: totalVitaminB6,  unit: 'mg',  dir: 'want-more', goal: g.vitaminB6,  nutrientKey: 'Vitamin B6' },
              { label: 'Folate', value: totalFolate,     unit: 'mcg', dir: 'want-more', goal: g.folate,     nutrientKey: 'Folate' },
              { label: 'B12',    value: totalVitaminB12, unit: 'mcg', dir: 'want-more', goal: g.vitaminB12, nutrientKey: 'Vitamin B12' },
              { label: 'Biotin', value: totalBiotin,     unit: 'mcg', dir: 'want-more', goal: g.biotin,     nutrientKey: 'Biotin' },
              { label: 'Thiamin',    value: totalThiamin,    unit: 'mg', dir: 'want-more', goal: g.thiamin,    nutrientKey: 'Thiamin' },
              { label: 'Riboflavin', value: totalRiboflavin, unit: 'mg', dir: 'want-more', goal: g.riboflavin, nutrientKey: 'Riboflavin' },
              { label: 'Niacin',     value: totalNiacin,     unit: 'mg', dir: 'want-more', goal: g.niacin,     nutrientKey: 'Niacin' },
              { label: 'Choline',    value: totalCholine,    unit: 'mg', dir: 'want-more', goal: g.choline,    nutrientKey: 'Choline' },
            ],
          },
          {
            key: 'minerals', name: 'MINERALS',
            items: [
              { label: 'Calcium',   value: totalCalciumAdv, unit: 'mg', dir: 'want-more', goal: g.calcium,   nutrientKey: 'Calcium, Ca' },
              { label: 'Iron',      value: totalIronAdv,    unit: 'mg', dir: 'want-more', goal: g.iron,       nutrientKey: 'Iron, Fe' },
              { label: 'Magnesium', value: totalMagnesium,  unit: 'mg', dir: 'want-more', goal: g.magnesium, nutrientKey: 'Magnesium, Mg' },
              { label: 'Zinc',      value: totalZinc,       unit: 'mg', dir: 'want-more', goal: g.zinc,       nutrientKey: 'Zinc, Zn' },
              { label: 'Copper',    value: totalCopper,     unit: 'mg', dir: 'want-more', goal: g.copper,     nutrientKey: 'Copper, Cu' },
            ],
          },
        ];
        const allEmpty = advGroups.every(grp => grp.items.every(item => item.value === 0));
        return (
          <ReAnimated.View entering={FadeInDown.delay(60).springify()} style={[styles.card, { backgroundColor: theme.bgCardGlass, shadowColor: theme.cardShadow, shadowOpacity: theme.cardShadowOpacity, borderColor: theme.borderCard, borderTopColor: theme.accentBlueRaw }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
              <TouchableOpacity
                onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); toggleAdvanced(); }}
                activeOpacity={0.7}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}
              >
                <Text style={[styles.cardLabel, { color: theme.textMuted, marginBottom: 0 }]}>Advanced Nutrition</Text>
                <TooltipIcon tooltipKey="advanced_nutrition" />
              </TouchableOpacity>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity
                  onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setShowNutritionGear(true); }}
                  style={{ width: 36, height: 32, alignItems: 'center', justifyContent: 'center' }}
                  hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                >
                  <GradientIcon name="settings" size={15} color={theme.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); toggleAdvanced(); }}
                  style={{ width: 28, height: 32, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Ionicons name={advancedExpanded ? 'chevron-up' : 'chevron-down'} size={14} color={theme.textMuted} />
                </TouchableOpacity>
              </View>
            </View>
            {advancedVisible && (
              <Animated.View style={{ opacity: advancedAnim }}>
                {allEmpty ? (
                  <Text style={{ color: theme.textDim, fontSize: 12, fontFamily: Type.ui, fontStyle: 'italic', paddingVertical: 6 }}>Log food to see advanced nutrition data.</Text>
                ) : (
                  advGroups.map(grp => {
                    const visible = grp.items.filter(item => item.value > 0);
                    if (visible.length === 0) return null;
                    const dvItems = visible.filter(item => item.goal !== null);
                    const onTrack = dvItems.filter(item =>
                      item.dir === 'want-more' ? item.value >= (item.goal as number) :
                      item.dir === 'want-less' ? item.value <= (item.goal as number) : true
                    ).length;
                    const isOpen = advGroupOpen[grp.key];
                    const half = Math.ceil(visible.length / 2);
                    const leftCol = visible.slice(0, half);
                    const rightCol = visible.slice(half);
                    return (
                      <View key={grp.key}>
                        <TouchableOpacity
                          onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setAdvGroupOpen(prev => ({ ...prev, [grp.key]: !prev[grp.key] })); }}
                          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 7, borderTopWidth: 0.5, borderTopColor: theme.borderSubtle }}
                        >
                          <Text style={[styles.cardLabel, { color: theme.textMuted, marginBottom: 0, fontSize: 9 }]}>{grp.name}</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            {dvItems.length > 0 && (
                              <View style={{ borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: onTrack === dvItems.length ? 'rgba(13,146,104,0.15)' : theme.accentBlueBg }}>
                                <Text style={{ fontSize: 10, fontFamily: Type.uiSemibold, color: onTrack === dvItems.length ? MUTED_GREEN : theme.accentBlue }}>{onTrack}/{dvItems.length}</Text>
                              </View>
                            )}
                            <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={12} color={theme.textDim} />
                          </View>
                        </TouchableOpacity>
                        {isOpen && (
                          <View style={{ flexDirection: 'row', gap: 8, paddingBottom: 8, paddingTop: 4 }}>
                            <View style={{ flex: 1, gap: 10 }}>
                              {leftCol.map(item => (
                                <TouchableOpacity
                                  key={item.label}
                                  onPress={() => {
                                    if (!(item as any).nutrientKey && !(item as any).directField) return;
                                    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                                    setDrilldownItem({ label: item.label, total: item.value, unit: item.unit, direction: item.dir as 'want-more' | 'want-less' | 'neutral', goal: item.goal, nutrientKey: (item as any).nutrientKey, directField: (item as any).directField });
                                    setShowDrilldown(true);
                                  }}
                                  activeOpacity={(item as any).nutrientKey || (item as any).directField ? 0.65 : 1}
                                >
                                  <Text style={{ fontSize: 11, color: theme.textDim, fontFamily: Type.uiMedium, marginBottom: 1 }}>{item.label}</Text>
                                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3, flexWrap: 'wrap' }}>
                                    <GradientNumber value={`${item.value}${item.unit}`} color={getColor(item.value, item.dir, item.goal)} style={{ fontSize: 14, fontFamily: Type.uiBold }} />
                                    {item.goal !== null && (
                                      <Text style={{ fontSize: 13, color: theme.textMuted, fontFamily: Type.uiSemibold }}>/ {item.goal}{item.unit}</Text>
                                    )}
                                  </View>
                                </TouchableOpacity>
                              ))}
                            </View>
                            <View style={{ flex: 1, gap: 10 }}>
                              {rightCol.map(item => (
                                <TouchableOpacity
                                  key={item.label}
                                  onPress={() => {
                                    if (!(item as any).nutrientKey && !(item as any).directField) return;
                                    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                                    setDrilldownItem({ label: item.label, total: item.value, unit: item.unit, direction: item.dir as 'want-more' | 'want-less' | 'neutral', goal: item.goal, nutrientKey: (item as any).nutrientKey, directField: (item as any).directField });
                                    setShowDrilldown(true);
                                  }}
                                  activeOpacity={(item as any).nutrientKey || (item as any).directField ? 0.65 : 1}
                                >
                                  <Text style={{ fontSize: 11, color: theme.textDim, fontFamily: Type.uiMedium, marginBottom: 1 }}>{item.label}</Text>
                                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3, flexWrap: 'wrap' }}>
                                    <GradientNumber value={`${item.value}${item.unit}`} color={getColor(item.value, item.dir, item.goal)} style={{ fontSize: 14, fontFamily: Type.uiBold }} />
                                    {item.goal !== null && (
                                      <Text style={{ fontSize: 13, color: theme.textMuted, fontFamily: Type.uiSemibold }}>/ {item.goal}{item.unit}</Text>
                                    )}
                                  </View>
                                </TouchableOpacity>
                              ))}
                            </View>
                          </View>
                        )}
                      </View>
                    );
                  })
                )}
              </Animated.View>
            )}
          </ReAnimated.View>
        );
      })()}
      <NutritionGearModal
        visible={showNutritionGear}
        onClose={() => setShowNutritionGear(false)}
        preset={nutritionPreset}
        goals={nutritionGoals}
        onSave={(p, g) => { setNutritionPreset(p); setNutritionGoals(g); }}
      />
      <NutrientDrilldownModal
        visible={showDrilldown}
        onClose={() => setShowDrilldown(false)}
        item={drilldownItem}
        entries={entries}
        defaultShowNet={showNetCarbs}
      />
      {repeatModalSlot && (
        <RepeatMealModal
          visible={!!repeatModalSlot}
          onClose={() => setRepeatModalSlot(null)}
          slots={mealSlots}
          launchSlot={repeatModalSlot}
          viewedKey={activeDate}
          onAdded={applyMergedEntries}
        />
      )}

      {/* Meal Sections */}
      {mealSlots.map((slot, mealIdx) => {
        const meal = slot.id;
        const mealEntries = entries.filter(e => e.meal === slot.id || e.meal === slot.name);
        const mealTotal = mealEntries.reduce((s, e) => s + e.cal, 0);
        const mealProtein = Math.round(mealEntries.reduce((s, e) => s + (e.protein || 0), 0));
        const mealCarbs = Math.round(mealEntries.reduce((s, e) => s + (e.carbs || 0), 0));
        const mealFat = Math.round(mealEntries.reduce((s, e) => s + (e.fat || 0), 0));
        const isExpanded = expandedMeals[slot.id];

        return (
          // TWO views, on purpose. On iOS a view can either CLIP its children to its rounded corners or
          // cast a SHADOW -- never both. Meal rows need the clipping (the expanding food list would spill
          // past the corners without it), which is why they have never had a shadow and never floated.
          // So the shadow moves OUT to a wrapper and the clipping stays IN. Outer floats, inner clips.
          <ReAnimated.View key={slot.id} entering={FadeInDown.delay(120 + mealIdx * 60).springify()} style={[styles.mealShadow, { shadowColor: theme.cardShadow, shadowOpacity: theme.cardShadowOpacity }]}>
          <View style={[styles.mealRow, { backgroundColor: theme.bgCardGlass, borderColor: theme.borderCard, borderTopColor: theme.accentBlueRaw }]}>
            {/* + button on left */}
            <TouchableOpacity
              ref={mealIdx === 0 ? (mealAddRef as any) : undefined}
              style={styles.mealAddBtn}
              onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Medium); returningFromChild.current = true; router.push({ pathname: '/add-food', params: { meal: slot.id, date: activeDate } }); }}>
              <Text style={[styles.mealAddBtnText, { color: theme.accentBlue }]}>+</Text>
            </TouchableOpacity>

            {/* Meal info middle */}
            <TouchableOpacity ref={entries.some(e => e.tutorialEntry) ? (slot.id === 'ms_lunch' ? (mealTotalRef as any) : undefined) : (mealIdx === 0 ? (mealTotalRef as any) : undefined)} style={[styles.mealInfo, { flexDirection: 'row', alignItems: 'center' }]} onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); toggleMeal(slot.id); }}>
              <View style={{ flex: 1 }}>
                <GradientNumber value={slot.name} color={theme.textSecondary} style={styles.mealName} />
                {mealTotal > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#0d9268' }} />
                    <Text style={{ fontSize: 10, color: theme.textMuted, fontFamily: Type.ui }}>{mealProtein}g</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#c47d1a' }} />
                    <Text style={{ fontSize: 10, color: theme.textMuted, fontFamily: Type.ui }}>{mealCarbs}g</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#a83232' }} />
                    <Text style={{ fontSize: 10, color: theme.textMuted, fontFamily: Type.ui }}>{mealFat}g</Text>
                  </View>
                </View>
                )}
                {/* REPEAT SCENT. The subtitle slot under the meal name is blank on an empty slot -- exactly the
                    slots that have a repeat waiting in the tray. Without this, the chevron on an empty row
                    promises an empty list, so nobody would ever open it and the repeat pills inside would go
                    undiscovered. Muted TEXT at the macro line's own size/weight, never a button, so 8 of these
                    down a fresh morning stay calm where 10 tinted pills yelled. It needs no tap target of its
                    own -- it sits inside the meal-name TouchableOpacity that toggles the tray, so tapping the
                    hint opens the very thing it hints at.
                    COPY, and the first attempt was WRONG: this line read "Yesterday · 349 kcal" -- a FACT, on the
                    theory that an empty slot's subtitle should state what is AVAILABLE for it the way a logged
                    slot's states what is IN it. Tidy theory, failed the actual job: a fact does not invite an
                    action, and under an empty Dinner it scans as "you ate 349". A discoverability line has to say
                    what you can DO. "Expand" (not "Tap") because the "+" is sitting right there and owns taps --
                    expand maps to the chevron alone. SENTENCE case, not Title Case: this is an instruction, like
                    its neighbour "Nothing logged yet. Tap + to add." -- Title Case is for labels and buttons
                    ("Pick a Day"), and Title-Casing a sentence is what makes UI copy read stiff.
                    "A meal", NOT "yesterday's meal": the tray holds TWO options (Repeat Yesterday AND Pick a
                    Day), so naming yesterday would describe only half of what is in there. Being generic is also
                    what lets the gate below be hasHistory -- a slot whose last dinner was MONDAY still has a real
                    repeat waiting, and the older-history-only case would otherwise never be discoverable. The
                    kcal number lives on the pill one tap away; this line's job is the invitation, not the detail.
                    Gated on mealEntries.length (NOT mealTotal, which the macro line uses): a slot holding only
                    zero-calorie entries has mealTotal 0 but is NOT empty, so the tray would show those entries
                    and no repeat pills -- the hint would be lying. */}
                {mealEntries.length === 0 && repeatSummary[slot.id]?.hasHistory && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <Ionicons name="repeat" size={10} color={theme.textMuted} />
                  <Text style={{ fontSize: 10, color: theme.textMuted, fontFamily: Type.ui }}>
                    Expand to repeat a meal
                  </Text>
                </View>
                )}
              </View>
              {mealTotal > 0 && (
                <View style={{ alignItems: 'flex-end', marginRight: 4 }}>
                  <GradientNumber value={String(mealTotal)} color={theme.textSecondary} style={{ fontSize: 18, fontFamily: Type.num, lineHeight: numLine(18) }} />
                  <Text style={{ color: theme.textDim, fontSize: 9, fontFamily: Type.uiBold, letterSpacing: 1.5, textTransform: 'uppercase' }}>kcal</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Chevron on right */}
            <TouchableOpacity style={styles.mealChevron} onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); toggleMeal(slot.id); }}>
              <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={14} color={theme.textMuted} />
            </TouchableOpacity>

            {/* Expanded food list */}
            {visibleMeals[slot.id] && (
              <Animated.View style={{
                width: '100%',
                opacity: getMealAnim(slot.id),
              }}>
              <View style={[styles.mealExpanded, { borderTopColor: theme.borderCard }]}>
                {mealEntries.length === 0 ? (
                  // EMPTY SLOT. The repeat pills used to live on the COLLAPSED row, which meant a morning with
                  // nothing logged put two tinted pills on every empty slot -- up to 8 slots, so ~10 buttons
                  // shouting at once, and the repeat SHORTCUT out-shouted the "+" that is the row's actual
                  // primary action. They live in the tray now: a collapsed row shows nothing, and the options
                  // appear when you open the slot. Costs Repeat Yesterday one extra tap; buys back a calm
                  // morning and a correct hierarchy. The chevron was already here, so this adds NO new control
                  // competing with the "+".
                  <>
                    <Text style={[styles.emptyMealText, { color: theme.textDim }]}>Nothing logged yet. Tap + to add.</Text>
                    {repeatSummary[slot.id]?.hasHistory && (
                      // LEFT-ALIGNED to the tray's content, sharing an edge with the "Nothing logged yet" line
                      // above. CENTERING WAS TRIED AND REJECTED (2026-07-15): the pills stop short of the right
                      // edge (REPEAT_MAX_W caps the Repeat pill) so left-aligning leaves a bigger gutter on the
                      // right than the left, and centering was meant to even that out -- but it reads WORSE. The
                      // tray already has a left-aligned text line establishing an edge, so centered pills float
                      // against nothing and look disconnected. An uneven gutter beats an arbitrary one.
                      // REPEAT_MAX_W caps the Repeat pill so it never stretches to a silly width: 212 covers the
                      // widest label it ever carries ("Repeat Yesterday · 1,248 kcal"). maxWidth, not width, so a
                      // narrow phone just takes what it has instead of overflowing.
                      // Contents are LEFT-aligned inside each pill so the glyph sits a fixed inset from the pill
                      // edge rather than wandering with the label's length.
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 10, paddingTop: 2, paddingBottom: 6 }}>
                        {repeatSummary[slot.id].yesterdayItems.length > 0 ? (
                          <>
                            <PressableButton
                              flex={1}
                              wrapperStyle={{ maxWidth: REPEAT_MAX_W }}
                              onPress={() => repeatYesterday(slot)}
                              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 5, backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 }}>
                              <ButtonShine radius={10} />
                              <Ionicons name="repeat" size={13} color={theme.accentBlue} />
                              <Text numberOfLines={1} style={{ flexShrink: 1, color: theme.accentBlue, fontSize: 12, fontFamily: Type.uiSemibold }}>
                                Repeat Yesterday · {repeatSummary[slot.id].yesterdayTotal} kcal
                              </Text>
                            </PressableButton>
                            <PressableButton
                              flex={0}
                              onPress={() => openRepeatModal(slot)}
                              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 5, backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 }}>
                              <ButtonShine radius={10} />
                              <Ionicons name="calendar" size={13} color={theme.accentBlue} />
                              <Text style={{ color: theme.accentBlue, fontSize: 12, fontFamily: Type.uiSemibold }}>Pick a Day</Text>
                            </PressableButton>
                          </>
                        ) : (
                          // No yesterday-meal to one-tap, so the single pill opens the picker. It keeps the
                          // flex:1 + maxWidth of its twin above so this row reads the same width as any other.
                          <PressableButton
                            flex={1}
                            wrapperStyle={{ maxWidth: REPEAT_MAX_W }}
                            onPress={() => openRepeatModal(slot)}
                            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 5, backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 }}>
                            <ButtonShine radius={10} />
                            <Ionicons name="repeat" size={13} color={theme.accentBlue} />
                            <Text numberOfLines={1} style={{ flexShrink: 1, color: theme.accentBlue, fontSize: 12, fontFamily: Type.uiSemibold }}>
                              Repeat a Previous Meal
                            </Text>
                          </PressableButton>
                        )}
                      </View>
                    )}
                  </>
                ) : (
                  mealEntries.map((entry, i) => (
                    <TouchableOpacity
                      ref={entry.tutorialEntry ? (tutorialEntryRef as any) : undefined}
                      key={i}
                      style={[styles.foodEntry, { backgroundColor: theme.accentBlueBg }]}
                      onPress={() => {
                        triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                        returningFromChild.current = true;
                        // Serving-only recipe entries (recipe had no total weight) have no gram basis, so
                        // Edit Entry hides the amount box. New logs carry servingOnly; infer it for older
                        // recipe entries via a recipe-specific signature (flat nutrients, no
                        // foodNutrients/fsId/my-food/ai, name not grams/oz) so regular foods are never hit.
                        const e = entry as any;
                        const nameIsGramsOz = /\((\d+\.?\d*)(g|oz)\)\s*$/.test(entry.name);
                        const looksLikeRecipe = !!e.isRecipe || (!e.fsId && !e.isMyFood && !e.myFoodId && !e.aiEstimated && !(e.foodNutrients?.length) && (e.fiber != null || e.sugar != null || e.sodium != null));
                        const servingOnly = e.servingOnly ?? (looksLikeRecipe && !nameIsGramsOz && e.loggedAmount == null);
                        // Serving-only entries read amount/unit from the "(2 servings)" label, not the
                        // grams regex (which fails on serving names and falls back to a bogus 100 g).
                        const labelMatch = entry.name.match(/\(([\d.]+)\s*(.+?)\)\s*$/);
                        const gramMatch = entry.name.match(/\((\d+\.?\d*)(g|oz|serving)\)/);
                        const editAmount = e.loggedAmount != null ? String(e.loggedAmount) : servingOnly ? (labelMatch ? labelMatch[1] : '') : (gramMatch ? gramMatch[1] : '100');
                        const editUnit = e.loggedUnit != null ? e.loggedUnit : servingOnly ? (labelMatch ? labelMatch[2] : 'serving') : (gramMatch ? gramMatch[2] : 'g');
                        router.push({
                        pathname: '/food-detail',
                        params: {
                          foodJson: JSON.stringify({
                            // Forward any flat extended-nutrient fields the entry carries (recipe logs
                            // store fiber/sugar/sodium/micros as flat fields, not a foodNutrients array).
                            // food-detail's computeExtended reads these so Edit Entry can show them.
                            // Filtered so only present fields ride along; harmless for regular foods
                            // (their foodNutrients path takes priority over the flat fallback).
                            ...Object.fromEntries(
                              ['fiber','sugar','sodium','cholesterol','saturatedFat','polyunsaturatedFat','monounsaturatedFat','addedSugars','transFat','sugarAlcohols','potassium','calcium','iron','vitaminA','vitaminC','vitaminD','vitaminE','vitaminK','vitaminB6','folate','vitaminB12','biotin','thiamin','riboflavin','niacin','choline','magnesium','zinc','copper','caffeine']
                                .filter(k => (entry as any)[k] != null)
                                .map(k => [k, (entry as any)[k]])
                            ),
                            description: entry.name.replace(/\s*\(.*?\)\s*$/, ''),
                            calPer100g: entry.calPer100g || 0,
                            proteinPer100g: entry.proteinPer100g || 0,
                            carbsPer100g: entry.carbsPer100g || 0,
                            fatPer100g: entry.fatPer100g || 0,
                            existingCal: entry.cal,
                            existingProtein: entry.protein || 0,
                            existingCarbs: entry.carbs || 0,
                            existingFat: entry.fat || 0,
                            foodNutrients: (entry as any).foodNutrients || [],
                            existingAmount: editAmount,
                            existingUnit: editUnit,
                            existingDisplayUnit: e.displayUnit || undefined,
                            existingDisplayAmount: e.displayAmount != null ? String(e.displayAmount) : undefined,
                            // Carry the entry's real base unit so the edit screen resolves mL/g correctly
                            // (was falling back to grams and colliding with a restored mL display unit).
                            servingUnitType: e.loggedUnit || undefined,
                            timestamp: entry.timestamp || Date.now(),
                            fsId: (entry as any).fsId || null,
                            myFoodId: (entry as any).myFoodId || null,
                            isMyFood: (entry as any).isMyFood || false,
                            brand: (entry as any).brand || null,
                            servingGrams: (entry as any).servingGrams || undefined,
                            servingUnit: (entry as any).servingLabelText || undefined,
                            aiEstimated: (entry as any).aiEstimated || false,
                            servingOnly,
                            isRecipe: looksLikeRecipe,
                            originalName: entry.name,
                          }),
                          meal: entry.meal,
                          date: activeDate,
                          entryIndex: String(entries.indexOf(entry)),
                        }
                      }); }}>
                      <View style={styles.foodEntryLeft}>
                        {(() => {
                          const rawName = entry.name.replace(/\s*\(.*?\)\s*$/, '');
                          const parts = rawName.split(' · ');
                          const foodName = parts[0];
                          const brand = parts.length > 1 ? parts.slice(1).join(' · ') : null;
                          const amountMatch = entry.name.match(/\((\d+\.?\d*(?:g|oz|serving))\)$/);
                          // #9: entries logged in a non-base unit carry displayUnit/displayAmount -- show those
                          // ("6 oz", "240 mL") instead of the grams baked into the name. Older entries fall back
                          // to the name regex. Round any over-precise weight for display; stored entry untouched.
                          const amountLabel = (entry as any).displayUnit != null
                            ? `${tidyFoodName(String((entry as any).displayAmount))} ${unitLabel((entry as any).displayUnit)}`
                            : amountMatch ? tidyFoodName(amountMatch[1]) : null;
                          return (
                            <>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                {(entry as any).aiEstimated && <Ionicons name="sparkles" size={11} color={theme.accentBlueRaw} />}
                                {(entry as any).type === 'supplement' && <Ionicons name="medical" size={11} color={theme.textMuted} />}
                                <Text style={[styles.foodEntryName, { color: theme.textPrimary, flex: 1 }]} numberOfLines={1}>{foodName}{amountLabel ? ` · ${amountLabel}` : ''}</Text>
                              </View>
                              {(entry.protein !== undefined || entry.carbs !== undefined || entry.fat !== undefined) ? (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 }}>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#0d9268' }} />
                                    <Text style={{ fontSize: 10, color: theme.textMuted, fontFamily: Type.ui }}>{entry.protein ?? 0}g</Text>
                                  </View>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#c47d1a' }} />
                                    <Text style={{ fontSize: 10, color: theme.textMuted, fontFamily: Type.ui }}>{entry.carbs ?? 0}g</Text>
                                  </View>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#a83232' }} />
                                    <Text style={{ fontSize: 10, color: theme.textMuted, fontFamily: Type.ui }}>{entry.fat ?? 0}g</Text>
                                  </View>
                                </View>
                              ) : null}
                            </>
                          );
                        })()}
                      </View>
                      <View style={styles.foodEntryRight}>
                        <View style={{ alignItems: 'flex-end' }}>
                          <GradientNumber value={String(entry.cal)} color={theme.macroProtein} style={styles.foodEntryCal} />
                          <Text style={[styles.foodEntryCalLabel, { color: theme.textMuted }]}>kcal</Text>
                        </View>
                        <TouchableOpacity
                          ref={entry.tutorialEntry ? (tutorialDeleteRef as any) : undefined}
                          onPress={() => {
                            triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                            Alert.alert(
                              'Remove Entry',
                              `Remove ${entry.name} from your log?`,
                              [
                                { text: 'Cancel', style: 'cancel', onPress: () => triggerHaptic(Haptics.ImpactFeedbackStyle.Light) },
                                { text: 'Remove', style: 'destructive', onPress: () => {
                                  triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
                                  deleteEntry(entries.indexOf(entry));
                                  showToast('Entry removed', `${entry.cal} kcal · ${entry.meal}`, 'success');
                                }},
                              ]
                            );
                          }}
                          style={styles.foodEntryDelete}>
                          <Text style={[styles.foodEntryDeleteText, { color: theme.accentBlue }]}>×</Text>
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
                {/* Clear all -- quiet link, only when the meal has items; one confirm for the batch */}
                {mealEntries.length >= 1 && (
                  <TouchableOpacity
                    onPress={() => clearMeal(slot)}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, paddingTop: 8, paddingBottom: 2, paddingRight: 2 }}>
                    <Ionicons name="trash-outline" size={13} color={theme.accentRed} />
                    <Text style={{ fontSize: 12, color: theme.accentRed, fontFamily: Type.uiSemibold }}>Clear all</Text>
                  </TouchableOpacity>
                )}
              </View>
              </Animated.View>
            )}
          </View>
          </ReAnimated.View>
        );
      })}

      {/* AI Meal Estimator -- persistent entry point, always shown below the meals */}
      <ReAnimated.View entering={FadeInDown.delay(120 + mealSlots.length * 60).springify()}>
      <TouchableOpacity
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: theme.bgCardGlass, shadowColor: theme.cardShadow, shadowOpacity: theme.cardShadowOpacity, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 6, borderWidth: 0.5, borderColor: theme.borderCard, borderTopColor: theme.accentBlueRaw, borderTopWidth: 1.5, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 10 }}
        onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Medium); returningFromChild.current = true; router.push({ pathname: '/ai-meal-estimator', params: { date: activeDate } }); }}>
        <Ionicons name="sparkles" size={20} color={theme.accentBlueRaw} />
        <View style={{ flex: 1 }}>
          <GradientNumber value="AI Meal Estimate" color={theme.textSecondary} style={{ fontSize: 16, fontFamily: Type.uiSemibold }} />
          <Text style={{ fontSize: 11, color: theme.textMuted, fontFamily: Type.ui, marginTop: 1 }}>Snap a photo or describe your meal, no weighing needed.</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
      </TouchableOpacity>
      </ReAnimated.View>

      {/* Water Card */}
      <ReAnimated.View entering={FadeInDown.delay(180 + mealSlots.length * 60).springify()} style={[styles.card, { backgroundColor: theme.bgCardGlass, shadowColor: theme.cardShadow, shadowOpacity: theme.cardShadowOpacity, borderColor: theme.borderCard, borderTopColor: theme.accentBlueRaw }]}>
        <CardWatermark name="water" color={theme.accentBlueRaw} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="water-outline" size={11} color={theme.textMuted} />
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[styles.cardLabel, { marginBottom: 0, color: theme.textMuted }]}>Water · </Text>
              <AnimatedNumber value={water} style={[styles.cardLabel, { marginBottom: 0, color: theme.textMuted, textTransform: 'none' }]} />
              <Text style={[styles.cardLabel, { marginBottom: 0, color: theme.textMuted, textTransform: 'none' }]}>{`oz / ${waterGoal}oz`}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); openWaterDetailModal(); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <GradientIcon name="settings" size={16} color={theme.textMuted} />
          </TouchableOpacity>
        </View>
        <WaterBar pct={waterPct} color={theme.accentBlue} trackColor={theme.bgProgressTrack} refreshKey={logRefreshKey} overGoal={water > waterGoal} />
        <View style={styles.waterBtns}>
          {waterPresets.map((oz, i) => (
            <PressableButton key={i} style={[styles.waterBtn, { backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder }]} onPress={() => updateWater(oz)}>
              <ButtonShine radius={6} />
              <Text style={[styles.waterBtnText, { color: theme.accentBlue }]}>+{oz} oz</Text>
            </PressableButton>
          ))}
          <PressableButton style={[styles.waterBtn, { backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder }]} onPress={() => openWaterCustomModal('add')}>
            <ButtonShine radius={6} />
            <View style={{ alignItems: 'center', justifyContent: 'center', width: 20, height: 20 }}>
              <Ionicons name="water-outline" size={18} color={theme.accentBlue} />
              <Text style={{ color: theme.accentBlue, fontSize: 9, fontFamily: Type.uiBold, position: 'absolute', bottom: -2, right: -4 }}>+</Text>
            </View>
          </PressableButton>
        </View>
        <View style={[styles.waterBtns, { marginTop: 8 }]}>
          {waterPresets.map((oz, i) => (
            <PressableButton key={i} style={[styles.waterBtnRed, { backgroundColor: theme.accentRedBg, borderColor: theme.accentRedBorder }]} onPress={() => updateWater(-oz)}>
              <ButtonShine radius={6} />
              <Text style={[styles.waterBtnRedText, { color: theme.accentRed }]}>-{oz} oz</Text>
            </PressableButton>
          ))}
          <PressableButton style={[styles.waterBtnRed, { backgroundColor: theme.accentRedBg, borderColor: theme.accentRedBorder }]} onPress={() => openWaterCustomModal('subtract')}>
            <ButtonShine radius={6} />
            <View style={{ alignItems: 'center', justifyContent: 'center', width: 20, height: 20 }}>
              <Ionicons name="water-outline" size={18} color={theme.accentRed} />
              <Text style={{ color: theme.accentRed, fontSize: 9, fontFamily: Type.uiBold, position: 'absolute', bottom: -2, right: -4 }}>-</Text>
            </View>
          </PressableButton>
        </View>
      </ReAnimated.View>

      {/* IF Card -- live today view */}
      {isToday && (
        <ReAnimated.View entering={FadeInDown.delay(240 + mealSlots.length * 60).springify()} onLayout={(e) => { ifCardOffset.current = e.nativeEvent.layout.y; }}>
        <IFCard
          theme={theme}
          ifStart={ifStart}
          ifEnd={ifEnd}
          ifMethod={ifMethod}
          ifCustomHours={ifCustomHours}
          isOpen={isOpen}
          remaining={remaining}
          windowEnd={windowEnd}
          ifResultLabel={ifResultLabel}
          ifResultColor={ifResultColor}
          ifTargetMs={ifTargetMs}
          ifActualMs={ifActualMs}
          showTimePicker={showTimePicker}
          showEndTimePicker={showEndTimePicker}
          pickerTime={pickerTime}
          setIfMethod={(m: string) => { setIfMethod(m); saveToFirebase(todayKey, 'ifMethod', m); }}
          setIfCustomHours={setIfCustomHours}
          setIfStart={setIfStart}
          setIfEnd={setIfEnd}
          setShowTimePicker={setShowTimePicker}
          setShowEndTimePicker={setShowEndTimePicker}
          setPrickerTime={setPrickerTime}
          onStartFast={async () => {
            const now = Date.now();
            setIfStart(now);
            setIfEnd(null);
            const wHours = ifMethod === 'Custom' ? (parseInt(ifCustomHours) || 16) : (IF_METHODS[ifMethod]?.eat || 8);
            const wEnd = now + wHours * 3600000;
            const notifSettings = await loadNotificationSettings();
            const sm: any = styleMode;
            scheduleIFWindowNotifications(wEnd, notifSettings, sm).catch(() => {});
            cancelIfCheckInNotification();
            const ask = await shouldAskPermission();
            if (ask) requestNotificationPermission().catch(() => {});
          }}
          onLastMeal={() => {
            const end = Date.now();
            setIfEnd(end);
            saveToFirebase(todayKey, 'ifEnd', end);
            cancelIFWindowNotifications().catch(() => {});
          }}
          onResetFast={() => { setIfStart(null); setIfEnd(null); saveToFirebase(todayKey, 'ifStart', null); }}
          onCancelFast={() => { setIfStart(null); setIfEnd(null); saveToFirebase(todayKey, 'ifStart', null); }}
          onResetComplete={() => { setIfStart(null); setIfEnd(null); saveToFirebase(todayKey, 'ifStart', null); saveToFirebase(todayKey, 'ifEnd', null); }}
          onConfirmStart={(t: Date) => { const now = new Date(); t.setFullYear(now.getFullYear(), now.getMonth(), now.getDate()); setIfStart(t.getTime()); saveToFirebase(todayKey, 'ifStart', t.getTime()); }}
          onConfirmEnd={(t: Date) => { const now = new Date(); t.setFullYear(now.getFullYear(), now.getMonth(), now.getDate()); const ne = t.getTime(); setIfEnd(ne); saveToFirebase(todayKey, 'ifEnd', ne); }}
          tutorialOverrideState={tutorialIfCardState}
        />
        </ReAnimated.View>
      )}

      {/* IF Card -- read-only past day summary (only when both start + end logged) */}
      {!isToday && pastIfStart && pastIfEnd && (
        <ReAnimated.View entering={FadeInDown.delay(240 + mealSlots.length * 60).springify()}>
        <IFCard
          theme={theme}
          ifStart={pastIfStart}
          ifEnd={pastIfEnd}
          ifMethod={pastIfMethod}
          ifCustomHours={pastIfCustomHours}
          isOpen={false}
          remaining={null}
          windowEnd={pastWindowEnd}
          ifResultLabel={pastIfResultLabel}
          ifResultColor={pastIfResultColor}
          ifTargetMs={pastIfTargetMs}
          ifActualMs={pastIfActualMs}
          showTimePicker={false}
          showEndTimePicker={false}
          pickerTime={null}
          setIfMethod={() => {}}
          setIfCustomHours={() => {}}
          setIfStart={() => {}}
          setIfEnd={() => {}}
          setShowTimePicker={() => {}}
          setShowEndTimePicker={() => {}}
          setPrickerTime={() => {}}
          onStartFast={() => {}}
          onLastMeal={() => {}}
          onResetFast={() => {}}
          onCancelFast={() => {}}
          onResetComplete={() => {}}
          onConfirmStart={() => {}}
          onConfirmEnd={() => {}}
          readOnly
        />
        </ReAnimated.View>
      )}
      </>
      )}

    </ScrollView>

    {showWaterCustomModal && (
      <Animated.View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: theme.overlayBg, justifyContent: 'center', alignItems: 'center', zIndex: 999, opacity: waterModalAnim }}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={closeWaterCustomModal} activeOpacity={1} />
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ backgroundColor: theme.bgSheet, borderRadius: 14, padding: 24, width: '80%', borderWidth: 0.5, borderColor: theme.borderCard }}>
          <GradientTitle
            title={waterCustomSign === 'add' ? 'Add Custom Amount' : 'Remove Custom Amount'}
            color={theme.accentBlue}
            style={{ fontSize: 20, fontFamily: Type.display, marginBottom: 12 }}
          />
          <TextInput
            ref={waterCustomInputRef}
            style={{ backgroundColor: theme.bgInput, borderWidth: 0.5, borderColor: theme.borderInput, borderRadius: 8, color: theme.textPrimary, padding: 12, fontSize: 24, fontFamily: Type.num, textAlign: 'center', marginBottom: 16 }}
            value={waterCustomInput} onChangeText={setWaterCustomInput} keyboardType="number-pad" placeholder="0" placeholderTextColor={theme.textPlaceholder} autoFocus />
          <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: Type.uiBold, letterSpacing: 1, textTransform: 'uppercase', textAlign: 'center', marginBottom: 16 }}>oz</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity style={{ flex: 1, padding: 12, borderRadius: 8, backgroundColor: theme.bgInput, alignItems: 'center' }} onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); closeWaterCustomModal(); }}>
              <Text style={{ color: theme.textMuted, fontFamily: Type.uiSemibold, fontSize: 14 }}>Cancel</Text>
            </TouchableOpacity>
            <PrimaryCTA
              label={waterCustomSign === 'add' ? 'Add' : 'Remove'}
              disabled={!(parseInt(waterCustomInput) > 0)}
              fill={waterCustomSign === 'add' ? undefined : theme.accentRed}
              wrapperStyle={{ flex: 1 }}
              faceStyle={{ paddingVertical: 12, borderRadius: 8 }}
              onPress={async () => {
                const amt = parseInt(waterCustomInput);
                if (amt > 0) { await updateWater(waterCustomSign === 'add' ? amt : -amt); }
                closeWaterCustomModal();
              }}
            />
          </View>
        </View>
        </TouchableWithoutFeedback>
      </Animated.View>
    )}

    {/* Water Detail Modal */}
    {showWaterDetailModal && (() => {
      const goalMet = water >= waterGoal;
      const wakeMs = (() => { const d = new Date(); d.setHours(6, 0, 0, 0); return d.getTime(); })();
      const bedMs  = (() => { const d = new Date(); d.setHours(22, 0, 0, 0); return d.getTime(); })();
      const totalMinutes = Math.max(1, (bedMs - wakeMs) / 60000);
      const elapsedMinutes = Math.min(totalMinutes, Math.max(0, (Date.now() - wakeMs) / 60000));
      const expectedOz = isToday ? Math.round((elapsedMinutes / totalMinutes) * waterGoal) : waterGoal;
      const pct = expectedOz > 0 ? Math.min(1, water / expectedOz) : 1;
      const statusLabel = goalMet ? 'Goal Met!' : pct >= 0.9 ? 'On Track' : pct >= 0.7 ? 'Behind' : 'Falling Behind';
      const statusColor = goalMet || pct >= 0.9 ? theme.statusGood : pct >= 0.7 ? theme.statusWarn : theme.statusBad;
      const cardScale = waterDetailAnim.interpolate({ inputRange: [0, 1], outputRange: [0.93, 1] });
      const presetsValid = waterPresetInputs.every(v => { const n = parseInt(v); return !isNaN(n) && n > 0; });
      const presetsChanged = waterPresetInputs.some((v, i) => { const n = parseInt(v); return !isNaN(n) && n > 0 && n !== waterPresets[i]; });
      const presetsSaveable = presetsValid && presetsChanged;
      const goalInputNum = parseInt(waterGoalInput);
      const goalSaveable = !isNaN(goalInputNum) && goalInputNum > 0 && goalInputNum !== waterGoal;
      return (
        <Animated.View style={{ position:'absolute', top:0, bottom:0, left:0, right:0, backgroundColor: theme.overlayBg, zIndex:999, opacity: waterDetailAnim }}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={closeWaterDetailModal} activeOpacity={1} />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex:1, justifyContent:'center', alignItems:'center' }}
            pointerEvents="box-none">
            <Animated.View style={{ width:'92%', maxHeight:'86%', backgroundColor: theme.bgSheet, borderRadius:16, borderWidth:0.5, borderColor: theme.borderCard, borderTopWidth:1.5, borderTopColor: theme.accentBlueRaw, overflow:'hidden', transform:[{scale: cardScale}] }}>
              {/* ModalHeader. Was a hand-rolled handle pill + a 9px ALL-CAPS LABEL as the title, with no X --
                  a card label doing a title's job. ModalHeader gives the 20px mixed-case title, the pill and
                  the X in one component. */}
              <ModalHeader title="Water Log" onClose={closeWaterDetailModal} />
              <View style={{ height:0.5, backgroundColor: theme.borderCard, marginHorizontal:16 }} />
              {/* Everything below the header is scrollable so Daily Goal is reachable when keyboard is open */}
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
                contentContainerStyle={{ flexGrow:1 }}>
                {/* Progress */}
                <View style={{ paddingHorizontal:16, paddingTop:14, paddingBottom:14 }}>
                  <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                    <Text style={{ fontSize:9, color: theme.textMuted, fontFamily:Type.uiBold, letterSpacing:2, textTransform:'uppercase' }}>Progress</Text>
                    <View style={{ backgroundColor: statusColor+'22', borderRadius:12, paddingHorizontal:8, paddingVertical:3 }}>
                      <Text style={{ fontSize:10, color: statusColor, fontFamily:Type.uiBold, letterSpacing:1 }}>{statusLabel}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection:'row', marginBottom:12 }}>
                    <View style={{ flex:1 }}>
                      <Text style={{ fontSize:9, color: theme.textMuted, fontFamily:Type.uiBold, letterSpacing:2, textTransform:'uppercase', marginBottom:2 }}>Logged</Text>
                      <View style={{ flexDirection:'row', alignItems:'baseline' }}>
                        <GradientNumber value={String(water)} color={theme.accentBlueRaw} style={{ fontSize:28, fontFamily:Type.num, letterSpacing:1 }} />
                        <Text style={{ fontSize:14, color: theme.textMuted, fontFamily:Type.num }}> oz</Text>
                      </View>
                      <Text style={{ fontSize:10, color: theme.textDim, fontFamily:Type.ui }}>of {waterGoal} oz goal</Text>
                    </View>
                    {isToday && !goalMet ? (
                      <View style={{ flex:1, borderLeftWidth:0.5, borderLeftColor: theme.borderCard, paddingLeft:14 }}>
                        <Text style={{ fontSize:9, color: theme.textMuted, fontFamily:Type.uiBold, letterSpacing:2, textTransform:'uppercase', marginBottom:2 }}>Expected Now</Text>
                        <View style={{ flexDirection:'row', alignItems:'baseline' }}>
                          <GradientNumber value={String(expectedOz)} color={statusColor} style={{ fontSize:28, fontFamily:Type.num, letterSpacing:1 }} />
                          <Text style={{ fontSize:14, color: theme.textMuted, fontFamily:Type.num }}> oz</Text>
                        </View>
                        <Text style={{ fontSize:10, color: theme.textDim, fontFamily:Type.ui }}>by this time of day</Text>
                      </View>
                    ) : (
                      // ONE line, ONE size, INTERFACE face. It was "Goal" at 28px above "Complete" at 20px,
                      // both on Type.num -- two sizes of the NUMBER face on a phrase with no number in it.
                      // Green is right here: this genuinely IS a success state.
                      <View style={{ flex:1, borderLeftWidth:0.5, borderLeftColor: theme.borderCard, paddingLeft:14, justifyContent:'center' }}>
                        {goalMet && (
                          <Text style={{ fontSize:18, color: theme.statusGood, fontFamily:Type.uiBold }}>Goal Complete</Text>
                        )}
                      </View>
                    )}
                  </View>
                  <View style={{ height:8, backgroundColor: theme.bgProgressTrack, borderRadius:8, overflow:'hidden' }}>
                    <View style={{ height:'100%', borderRadius:8, backgroundColor: theme.accentBlue, width:`${Math.min(100, (water / waterGoal) * 100)}%` }} />
                  </View>
                </View>
                <View style={{ height:0.5, backgroundColor: theme.borderCard, marginHorizontal:16 }} />
                {/* Entry Log */}
                <View style={{ paddingHorizontal:16, paddingTop:12, paddingBottom:4 }}>
                  <Text style={{ fontSize:9, color: theme.textMuted, fontFamily:Type.uiBold, letterSpacing:2, textTransform:'uppercase' }}>Entries</Text>
                </View>
                <ScrollView style={{ maxHeight:160 }} contentContainerStyle={{ paddingHorizontal:16, paddingBottom:8 }} showsVerticalScrollIndicator={false} nestedScrollEnabled={true} keyboardDismissMode="on-drag">
                  {waterEntries.length === 0 ? (
                    <Text style={{ fontSize:12, color: theme.textDim, fontFamily:Type.ui, textAlign:'center', paddingVertical:14 }}>No entries yet</Text>
                  ) : (
                    [...waterEntries].reverse().map((entry, displayIdx) => {
                      const realIdx = waterEntries.length - 1 - displayIdx;
                      const entryTime = new Date(entry.timestamp).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
                      return (
                        <View key={realIdx} style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingVertical:9, borderBottomWidth:0.5, borderBottomColor: theme.borderCard }}>
                          <Text style={{ fontSize:12, color: theme.textMuted, fontFamily:Type.uiMedium, width:68 }}>{entryTime}</Text>
                          <View style={{ flex:1 }}>
                            <GradientNumber value={`${entry.sign === 'add' ? '+' : '-'}${entry.amount} oz`} color={entry.sign === 'add' ? theme.statusGood : theme.statusBad} style={{ fontSize:14, fontFamily:Type.uiSemibold }} />
                          </View>
                          <TouchableOpacity onPress={() => deleteWaterEntry(realIdx)} hitSlop={{top:8,bottom:8,left:12,right:8}}>
                            <Ionicons name="trash-outline" size={16} color={theme.accentRed} />
                          </TouchableOpacity>
                        </View>
                      );
                    })
                  )}
                </ScrollView>
                <View style={{ height:0.5, backgroundColor: theme.borderCard, marginHorizontal:16 }} />
                {/* Presets */}
                <View style={{ paddingHorizontal:16, paddingTop:14, paddingBottom:10 }}>
                  <Text style={{ fontSize:9, color: theme.textMuted, fontFamily:Type.uiBold, letterSpacing:2, textTransform:'uppercase', marginBottom:10 }}>Quick Add Presets</Text>
                  <View style={{ flexDirection:'row', gap:8, marginBottom:10 }}>
                    {([0,1,2] as const).map(i => (
                      <View key={i} style={{ flex:1, alignItems:'center' }}>
                        <TextInput
                          style={{ backgroundColor: theme.bgInput, borderWidth:0.5, borderColor: theme.borderInput, borderRadius:8, color: theme.textSecondary, padding:10, fontSize:18, fontFamily:Type.num, textAlign:'center', width:'100%' }}
                          value={waterPresetInputs[i]}
                          onChangeText={v => { const cleaned = v.replace(/[^0-9]/g,''); const next = [...waterPresetInputs] as [string,string,string]; next[i] = cleaned; setWaterPresetInputs(next); }}
                          keyboardType="number-pad"
                          placeholder={String(waterPresets[i])}
                          placeholderTextColor={theme.textPlaceholder}
                        />
                        <Text style={{ fontSize:9, color: theme.textDim, fontFamily:Type.uiMedium, marginTop:3 }}>oz</Text>
                      </View>
                    ))}
                  </View>
                  {/* Shine only when ENABLED: a dim/inactive button must not read as a lit surface. */}
                  <TouchableOpacity
                    style={{ backgroundColor: presetsSaveable ? theme.bgSelected : theme.bgInput, borderWidth:1, borderColor: presetsSaveable ? theme.accentBlueBorder : theme.borderInput, borderRadius:8, padding:12, alignItems:'center', opacity: presetsSaveable ? 1 : 0.5 }}
                    onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Medium); saveWaterPresets(); }}
                    disabled={!presetsSaveable}>
                    {presetsSaveable && <ButtonShine radius={8} />}
                    <Text style={{ color: presetsSaveable ? theme.accentBlue : theme.textDim, fontFamily:Type.uiSemibold, fontSize:14 }}>Save Presets</Text>
                  </TouchableOpacity>
                </View>
                <View style={{ height:0.5, backgroundColor: theme.borderCard, marginHorizontal:16 }} />
                {/* Daily Goal */}
                <View style={{ paddingHorizontal:16, paddingTop:14, paddingBottom:20 }}>
                  <Text style={{ fontSize:9, color: theme.textMuted, fontFamily:Type.uiBold, letterSpacing:2, textTransform:'uppercase', marginBottom:10 }}>Daily Goal</Text>
                  <View style={{ flexDirection:'row', gap:8, alignItems:'flex-start' }}>
                    <View style={{ flex:1 }}>
                      <TextInput
                        style={{ backgroundColor: theme.bgInput, borderWidth:0.5, borderColor: theme.borderInput, borderRadius:8, color: theme.textSecondary, padding:10, fontSize:18, fontFamily:Type.num, textAlign:'center' }}
                        value={waterGoalInput}
                        onChangeText={v => setWaterGoalInput(v.replace(/[^0-9]/g,''))}
                        keyboardType="number-pad"
                        placeholder={String(waterGoal)}
                        placeholderTextColor={theme.textPlaceholder}
                      />
                      <Text style={{ fontSize:9, color: theme.textDim, fontFamily:Type.uiMedium, marginTop:3, textAlign:'center' }}>oz</Text>
                    </View>
                    <TouchableOpacity
                      style={{ flex:2, backgroundColor: goalSaveable ? theme.bgSelected : theme.bgInput, borderWidth:1, borderColor: goalSaveable ? theme.accentBlueBorder : theme.borderInput, borderRadius:8, padding:12, alignItems:'center', opacity: goalSaveable ? 1 : 0.5, marginTop:1 }}
                      onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Medium); saveWaterGoal(); }}
                      disabled={!goalSaveable}>
                      {goalSaveable && <ButtonShine radius={8} />}
                      <Text style={{ color: goalSaveable ? theme.accentBlue : theme.textDim, fontFamily:Type.uiSemibold, fontSize:14 }}>Save Goal</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            </Animated.View>
          </KeyboardAvoidingView>
        </Animated.View>
      );
    })()}

    {/* Edit Meal Slots -- shared content, rendered into both Modal and inline tutorialMode view */}
    {(() => {
      const editSheetCardStyle = {
        width: '92%' as const,
        borderRadius: 20,
        maxHeight: '72%' as const,
        borderWidth: 0.5,
        borderTopWidth: 1.5,
        borderColor: theme.borderSheet,
        borderTopColor: theme.accentBlueRaw,
        backgroundColor: theme.bgSheet,
        flex: 1 as const,
        overflow: 'hidden' as const,
      };
      const content = (
        <>
          {/* Title was a 13px uppercase LABEL; DONE is the explicit close, so ModalHeader's own X is
              suppressed to avoid two close controls. */}
          <ModalHeader
            title="Edit Meal Slots"
            subtitle={`${mealSlots.length} of 8 slots`}
            onClose={closeEditMeals}
            showClose={false}
            right={
              /* ACCENT, not green: green is success/goal-hit, and Done is an action. Mixed case + shine. */
              <TouchableOpacity
                onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); closeEditMeals(); }}
                style={{ backgroundColor: theme.accentBlueBg, borderWidth:1, borderColor: theme.accentBlueBorder, borderRadius:6, paddingHorizontal:14, paddingVertical:6, height:32, alignItems:'center', justifyContent:'center' }}>
                <ButtonShine radius={6} />
                <Text style={{ color: theme.accentBlue, fontSize:12, fontFamily:Type.uiBold }}>Done</Text>
              </TouchableOpacity>
            }
          />
          <View style={{ borderBottomWidth:0.5, borderBottomColor: theme.borderSubtle }} />
          {/* Slot list -- flex:1 wrapper constrains FlatList to remaining card height, enabling scroll */}
          <View style={{ flex:1 }}>
          <DraggableFlatList
            ref={editMealsListRef}
            data={mealSlots}
            keyExtractor={s => s.id}
            onDragEnd={({ data }) => { setMealSlots(data); saveMealSlots(data, slotNameCache); }}
            contentContainerStyle={{ paddingHorizontal:16, paddingTop:10 }}
            ListFooterComponent={() => (
              <View style={{ paddingBottom:20 }}>
                <View style={{ height:0.5, backgroundColor: theme.borderCard, marginBottom:12, marginTop:2 }} />
                <View ref={logEditAddBtnRef as any} collapsable={false}>
                  <TouchableOpacity
                    style={{ flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8, paddingVertical:13, borderRadius:8, backgroundColor: mealSlots.length >= 8 ? theme.bgInput : theme.bgSelected, borderWidth:1, borderColor: mealSlots.length >= 8 ? theme.borderInput : theme.accentBlueBorder, opacity: mealSlots.length >= 8 ? 0.5 : 1 }}
                    onPress={addMealSlot}
                    disabled={mealSlots.length >= 8}>
                    {mealSlots.length < 8 && <ButtonShine radius={8} />}
                    <Ionicons name="add" size={16} color={mealSlots.length >= 8 ? theme.textDim : theme.accentBlue} />
                    <Text style={{ fontSize:14, color: mealSlots.length >= 8 ? theme.textDim : theme.accentBlue, fontFamily:Type.uiSemibold }}>
                      {mealSlots.length >= 8 ? 'Maximum 8 slots reached' : 'Add Meal Slot'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            renderItem={({ item: slot, drag, isActive }: RenderItemParams<MealSlot>) => {
              const isEditing = editingSlotId === slot.id;
              const isFirst = mealSlots[0]?.id === slot.id;
              return (
                <ScaleDecorator>
                  <View style={[{ flexDirection:'row', alignItems:'center', gap:10, marginBottom:10 }, isActive && { opacity:0.85 }]}>
                    {/* Delete badge -- matches editBadge size/shape, red colorway */}
                    <TouchableOpacity
                      onPress={() => deleteMealSlot(slot.id)}
                      style={{ width:28, height:28, borderRadius:14, borderWidth:1, alignItems:'center', justifyContent:'center', backgroundColor: theme.accentRedBg, borderColor: theme.accentRedBorder, opacity: mealSlots.length <= 1 ? 0.3 : 1 }}
                      hitSlop={{ top:4, bottom:4, left:4, right:4 }}
                      disabled={mealSlots.length <= 1}>
                      <Ionicons name="remove" size={14} color={theme.accentRed} />
                    </TouchableOpacity>
                    {/* Card -- matches editCardPreview layout */}
                    <View ref={isFirst ? (logEditSlotNameRef as any) : undefined} collapsable={false} style={{ flex:1, borderWidth:0.5, borderRadius:10, paddingHorizontal:14, paddingVertical:10, backgroundColor: theme.bgEditCard, borderColor: theme.borderCard }}>
                      {isEditing ? (
                        <TextInput
                          autoFocus
                          value={editingSlotName}
                          onChangeText={setEditingSlotName}
                          onBlur={() => commitRename(slot.id, editingSlotName)}
                          onSubmitEditing={() => commitRename(slot.id, editingSlotName)}
                          returnKeyType="done"
                          style={{ fontSize:13, color: theme.textPrimary, fontFamily:Type.uiSemibold, padding:0 }}
                        />
                      ) : (
                        <TouchableOpacity
                          onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setEditingSlotId(slot.id); setEditingSlotName(slot.name); }}
                          hitSlop={{ top:4, bottom:4, left:0, right:0 }}>
                          <Text style={{ fontSize:13, color: theme.textPrimary, fontFamily:Type.uiSemibold, marginBottom:2 }}>{slot.name}</Text>
                          <Text style={{ fontSize:11, color: theme.textDim, fontFamily:Type.ui }}>Tap to rename</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    {/* Drag handle -- matches dragHandle size/padding */}
                    <View ref={isFirst ? (logEditSlotDragRef as any) : undefined} collapsable={false}>
                      <TouchableOpacity onLongPress={drag} delayLongPress={0} style={{ padding:8 }}>
                        <Ionicons name="menu-outline" size={20} color={theme.textDim} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </ScaleDecorator>
              );
            }}
          />
          </View>
        </>
      );
      return (
        <>
          {/* Normal Modal -- hidden during tutorial so TutorialOverlay can spotlight elements inside */}
          {showEditMeals && !editMealsTutorialMode && (
            <Modal transparent animationType="none" visible={showEditMeals} onRequestClose={closeEditMeals} statusBarTranslucent hardwareAccelerated
              onShow={() => {
                editMealsAnim.setValue(0);
                Animated.timing(editMealsAnim, { toValue: 1, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
              }}>
              <Animated.View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.6)', opacity: editMealsAnim, justifyContent:'center', alignItems:'center' }}>
                <TouchableOpacity style={{ position:'absolute', top:0, left:0, right:0, bottom:0 }} activeOpacity={1} onPress={closeEditMeals} />
                <Animated.View style={[editSheetCardStyle, { opacity: editMealsAnim }]}>
                  {content}
                </Animated.View>
              </Animated.View>
            </Modal>
          )}
          {/* Inline absoluteFill for tutorial mode -- TutorialOverlay can spotlight inside this */}
          {editMealsTutorialMode && showEditMeals && (
            <View style={[StyleSheet.absoluteFillObject, { backgroundColor:'rgba(0,0,0,0.6)', justifyContent:'center', alignItems:'center' }]}>
              <View style={editSheetCardStyle}>
                {content}
              </View>
            </View>
          )}
        </>
      );
    })()}

      <Modal visible={calPickerVisible} transparent animationType="none" onRequestClose={closeCalPicker} onShow={() => { Animated.timing(calFadeAnim, { toValue: 1, duration: 180, useNativeDriver: true }).start(); }}>
        <Animated.View style={{ flex: 1, opacity: calFadeAnim }}>
          <TouchableOpacity style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)' }} onPress={closeCalPicker} activeOpacity={1} />
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', pointerEvents: 'box-none' }}>
            {/* Was: a hand-rolled handle pill, a 10px CENTRED ALL-CAPS LABEL doing a title's job, and a
                Cancel button at the bottom. ModalHeader gives the mixed-case left title, the pill AND the X
                -- which makes Cancel redundant, so it goes: two close controls on one modal is the exact
                thing Edit Meal Slots' comment warns about. Body padding moves off the card so the header can
                own the top edge. */}
            <View style={{ backgroundColor: theme.bgSheet, borderRadius: 16, paddingBottom: 20, width: 310, borderWidth: 0.5, borderColor: theme.borderCard, borderTopWidth: 1.5, borderTopColor: theme.accentBlueRaw, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 }}>
              <ModalHeader title="Jump to Date" onClose={closeCalPicker} />
              <View style={{ paddingHorizontal: 20, paddingTop: 4 }}>
                {calPickerVisible && renderCalGrid()}
              </View>
            </View>
          </View>
        </Animated.View>
      </Modal>

      {/* Log tab FAB -- multiple entry points into logging, same speed-dial pattern as
          workout-library.tsx / add-food.tsx's own FAB. Positioned above the tab bar. */}
      {showLogFabMenu && (
        <TouchableOpacity
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          activeOpacity={1}
          onPress={closeLogFabMenu}
        />
      )}
      {showLogFabMenu && (
        <View style={{ position: 'absolute', bottom: 90 + TAB_BAR_HEIGHT + insets.bottom, right: 20, alignItems: 'flex-end', gap: 12 }}>
          {/* Create Food - top, animates last */}
          <Animated.View style={{ opacity: logFabItem4Anim, transform: [{ translateY: logFabItem4Anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <TouchableOpacity
                onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Medium); closeLogFabMenu(); returningFromChild.current = true; router.push({ pathname: '/add-food', params: { meal: 'browse', date: activeDate, openCreate: '1' } }); }}
                style={{ backgroundColor: theme.accentBlue, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 2, borderColor: theme.bgPrimary, shadowColor: theme.accentBlue, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 6 }}>
                <ButtonShine radius={8} solid />
                <Text style={{ color: '#ffffff', fontSize: 13, fontFamily: Type.uiSemibold }}>Create Food</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Medium); closeLogFabMenu(); returningFromChild.current = true; router.push({ pathname: '/add-food', params: { meal: 'browse', date: activeDate, openCreate: '1' } }); }}
                style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.accentBlue, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: theme.bgPrimary, shadowColor: theme.accentBlue, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 6 }}>
                <ButtonShine radius={22} solid />
                <Ionicons name="restaurant-outline" size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Create Recipe */}
          <Animated.View style={{ opacity: logFabItem3Anim, transform: [{ translateY: logFabItem3Anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <TouchableOpacity
                onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Medium); closeLogFabMenu(); returningFromChild.current = true; router.push('/recipe-builder'); }}
                style={{ backgroundColor: theme.accentBlue, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 2, borderColor: theme.bgPrimary, shadowColor: theme.accentBlue, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 6 }}>
                <ButtonShine radius={8} solid />
                <Text style={{ color: '#ffffff', fontSize: 13, fontFamily: Type.uiSemibold }}>Create Recipe</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Medium); closeLogFabMenu(); returningFromChild.current = true; router.push('/recipe-builder'); }}
                style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.accentBlue, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: theme.bgPrimary, shadowColor: theme.accentBlue, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 6 }}>
                <ButtonShine radius={22} solid />
                <Ionicons name="book-outline" size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Barcode */}
          <Animated.View style={{ opacity: logFabItem2Anim, transform: [{ translateY: logFabItem2Anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <TouchableOpacity
                onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Medium); closeLogFabMenu(); returningFromChild.current = true; router.push({ pathname: '/add-food', params: { meal: 'browse', date: activeDate, openScanner: '1' } }); }}
                style={{ backgroundColor: theme.accentBlue, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 2, borderColor: theme.bgPrimary, shadowColor: theme.accentBlue, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 6 }}>
                <ButtonShine radius={8} solid />
                <Text style={{ color: '#ffffff', fontSize: 13, fontFamily: Type.uiSemibold }}>Barcode</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Medium); closeLogFabMenu(); returningFromChild.current = true; router.push({ pathname: '/add-food', params: { meal: 'browse', date: activeDate, openScanner: '1' } }); }}
                style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.accentBlue, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: theme.bgPrimary, shadowColor: theme.accentBlue, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 6 }}>
                <ButtonShine radius={22} solid />
                <Ionicons name="barcode-outline" size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Add to Meal - bottom, animates first, closest to the FAB */}
          <Animated.View style={{ opacity: logFabItem1Anim, transform: [{ translateY: logFabItem1Anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <TouchableOpacity
                onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Medium); closeLogFabMenu(); returningFromChild.current = true; router.push({ pathname: '/add-food', params: { meal: 'browse', date: activeDate } }); }}
                style={{ backgroundColor: theme.accentBlue, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 2, borderColor: theme.bgPrimary, shadowColor: theme.accentBlue, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 6 }}>
                <ButtonShine radius={8} solid />
                <Text style={{ color: '#ffffff', fontSize: 13, fontFamily: Type.uiSemibold }}>Add to Meal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Medium); closeLogFabMenu(); returningFromChild.current = true; router.push({ pathname: '/add-food', params: { meal: 'browse', date: activeDate } }); }}
                style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.accentBlue, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: theme.bgPrimary, shadowColor: theme.accentBlue, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 6 }}>
                <ButtonShine radius={22} solid />
                <Ionicons name="search-outline" size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      )}

      <Animated.View style={{ position: 'absolute', bottom: 20 + TAB_BAR_HEIGHT + insets.bottom, right: 20, transform: [{ scale: logFabScale }] }}>
        <TouchableOpacity
          onPress={toggleLogFabMenu}
          onPressIn={() => Animated.timing(logFabScale, { toValue: 0.9, duration: 80, useNativeDriver: true }).start()}
          onPressOut={() => Animated.timing(logFabScale, { toValue: 1, duration: 80, useNativeDriver: true }).start()}
          activeOpacity={1}
          style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: theme.accentBlue, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: theme.bgPrimary, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 }}>
          <FabDome size={56} />
          <Ionicons name={showLogFabMenu ? 'close' : 'add'} size={28} color="#ffffff" />
        </TouchableOpacity>
      </Animated.View>

    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1 },
  content:            { padding: 16 },
  header:             { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 0.5 },
  headerLabel:        { fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2, fontFamily: Type.uiBold },
  headerTitle:        { fontSize: displaySize(27), fontFamily: Type.display, letterSpacing: DISPLAY_TRACKING, ...(DISPLAY_CAPS ? { textTransform: 'uppercase' as const } : {}) },
  libraryBtn:         { borderWidth: 1, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 },
  libraryBtnText:     { fontSize: 14, fontFamily: Type.uiBold },
  card:               { borderWidth: 0.5, borderTopWidth: 1.5, borderRadius: 14, padding: 16, marginBottom: 12, shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6 },
  cardLabel:          { fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8, fontFamily: Type.uiBold },
  calRow:             { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 10 },
  calNumber:          { fontSize: 52, lineHeight: numLine(52), fontFamily: Type.num, letterSpacing: 1 },
  calTarget:          { fontSize: 14, fontFamily: Type.uiBold, letterSpacing: 0.3 },
  progressBarBg:      { height: 6, borderRadius: 6, overflow: 'hidden', marginBottom: 12 },
  progressBarFill:    { height: '100%', borderRadius: 6 },
  calRemaining:       { fontSize: 10, fontFamily: Type.uiBold, letterSpacing: 1.5, textTransform: 'uppercase' },
  // The shadow lives on mealShadow (the wrapper); mealRow keeps the clipping. A view cannot do both.
  mealShadow:         { marginBottom: 12, borderRadius: 14, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 6 },
  mealRow:            { borderWidth: 0.5, borderTopWidth: 1.5, borderRadius: 14, overflow: 'hidden' },
  mealAddBtn:         { position: 'absolute', left: 14, top: 14, zIndex: 1, width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  mealAddBtnText:     { fontSize: 22, fontFamily: Type.ui, lineHeight: 24 },
  mealInfo:           { paddingLeft: 50, paddingRight: 40, paddingVertical: 14 },
  mealName:           { fontSize: 16, fontFamily: Type.uiSemibold },
  mealCals:           { fontSize: 10, fontFamily: Type.uiBold, marginTop: 2, letterSpacing: 1.5, textTransform: 'uppercase' },
  mealChevron:        { position: 'absolute', right: 14, top: 14, width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  mealChevronText:    { fontSize: 14, fontFamily: Type.ui },
  mealExpanded:       { borderTopWidth: 0.5, paddingHorizontal: 16, paddingVertical: 8 },
  foodEntry:          { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 10, borderRadius: 8, marginBottom: 4 },
  foodEntryLeft:      { flex: 1, marginRight: 8 },
  foodEntryName:      { fontSize: 13, fontFamily: Type.uiSemibold },
  foodEntryMacros:    { fontSize: 10, fontFamily: Type.uiBold, marginTop: 2, letterSpacing: 1, textTransform: 'uppercase' },
  foodEntryRight:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  foodEntryCal:       { fontSize: 16, fontFamily: Type.num },
  foodEntryCalLabel:  { fontSize: 10, fontFamily: Type.ui },
  foodEntryDelete:    { marginLeft: 8, padding: 4 },
  foodEntryDeleteText:{ fontSize: 18 },
  emptyMealText:      { fontSize: 11, fontFamily: Type.ui, fontStyle: 'italic', paddingVertical: 8 },
  waterBtns:          { flexDirection: 'row', gap: 8 },
  waterBtn:           { flex: 1, padding: 10, borderWidth: 1, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  // INTERFACE, not the number face: "+12 oz" is a button LABEL. Type.num is Rajdhani (condensed, tabular).
  waterBtnText:       { fontFamily: Type.num, fontSize: 15, letterSpacing: 1 },
  waterBtnRed:        { flex: 1, padding: 10, borderWidth: 1, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  waterBtnRedText:    { fontFamily: Type.num, fontSize: 15, letterSpacing: 1 },
});