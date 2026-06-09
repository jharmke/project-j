import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Animated, Easing, Keyboard, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import PressableButton from '../../components/PressableButton';
import { DEFAULT_MEAL_SLOTS, MealSlot, findSlotForMeal, loadMealSlots, saveMealSlots } from '../../utils/mealSlots';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { loadFromFirebase, saveToFirebase } from '../../firebaseConfig';
import { storageSet } from '../../utils/storage';
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
import { useToast } from '../../components/Toast';
import { useTutorial } from '../../context/TutorialContext';
import { useTutorialTarget } from '../../hooks/useTutorialTarget';
import { useHealthKit } from '../../useHealthKit';
import ReAnimated, { useAnimatedStyle, useSharedValue, withTiming, useAnimatedProps, withRepeat, cancelAnimation, Easing as ReAnimEasing } from 'react-native-reanimated';
import { showToolkit } from '../../components/ToolkitSheet';
import { IFCard, IF_METHODS } from '../../components/IFCard';
import {
  scheduleIFWindowNotifications,
  cancelIFWindowNotifications,
  loadNotificationSettings,
  shouldAskPermission,
  requestNotificationPermission,
} from '../../services/notifications';

const WATER_TARGET = 128;

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
          <ReAnimated.View style={[{ height: '100%', borderRadius: 3, backgroundColor: theme.macroProtein }, proteinStyle]} />
        </View>
        <Text style={{ fontSize: 11, color: theme.macroProtein, fontFamily: 'DMSans_700Bold', width: 12 }}>P</Text>
        <Text style={{ fontSize: 15, color: theme.macroProtein, fontFamily: 'DMSans_600SemiBold', width: 46, textAlign: 'right' }}>{Math.round(protein)}<Text style={{ fontSize: 10, color: theme.macroProtein }}>g</Text></Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onPressCarbs} activeOpacity={onPressCarbs ? 0.75 : 1} hitSlop={{ top: 6, bottom: 6, left: 12, right: 12 }} style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
        <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: theme.bgProgressTrack, overflow: 'hidden' }}>
          <ReAnimated.View style={[{ height: '100%', borderRadius: 3, backgroundColor: theme.macroCarbs }, carbsStyle]} />
        </View>
        <Text style={{ fontSize: 11, color: theme.macroCarbs, fontFamily: 'DMSans_700Bold', width: 12 }}>C</Text>
        <Text style={{ fontSize: 15, color: theme.macroCarbs, fontFamily: 'DMSans_600SemiBold', width: 46, textAlign: 'right' }}>{Math.round(carbs)}<Text style={{ fontSize: 10, color: theme.macroCarbs }}>g</Text></Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onPressFat} activeOpacity={onPressFat ? 0.75 : 1} hitSlop={{ top: 6, bottom: 6, left: 12, right: 12 }} style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
        <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: theme.bgProgressTrack, overflow: 'hidden' }}>
          <ReAnimated.View style={[{ height: '100%', borderRadius: 3, backgroundColor: theme.macroFat }, fatStyle]} />
        </View>
        <Text style={{ fontSize: 11, color: theme.macroFat, fontFamily: 'DMSans_700Bold', width: 12 }}>F</Text>
        <Text style={{ fontSize: 15, color: theme.macroFat, fontFamily: 'DMSans_600SemiBold', width: 46, textAlign: 'right' }}>{Math.round(fat)}<Text style={{ fontSize: 10, color: theme.macroFat }}>g</Text></Text>
      </TouchableOpacity>
    </View>
  );
}

function WaterBar({ pct, color, trackColor, refreshKey, overGoal }: { pct: number; color: string; trackColor?: string; refreshKey?: number; overGoal?: boolean }) {
  const width = useSharedValue(pct);
  const shimmerX = useSharedValue(-80);
  useEffect(() => {
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
      <ReAnimated.View style={[{ height: '100%', borderRadius: 6, backgroundColor: color }, animStyle]} />
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
  const tutorialIfCardState = (tutorialActiveState?.tutorial.steps[tutorialActiveState.stepIndex] as any)?.ifCardState as
    'idle' | 'active' | 'eating' | undefined;
  const [loaded, setLoaded] = useState(false);
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
    Animated.timing(calFadeAnim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
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
          <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); calPickerPrev(); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="chevron-back" size={20} color={theme.accentBlueRaw} />
          </TouchableOpacity>
          <Text style={{ fontSize: 15, color: theme.textPrimary, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1 }}>
            {CAL_MONTHS[pickerMonth]} {pickerYear}
          </Text>
          <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); calPickerNext(); }} disabled={!calPickerCanGoNext()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="chevron-forward" size={20} color={calPickerCanGoNext() ? theme.accentBlueRaw : theme.textDim} />
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row', marginBottom: 6 }}>
          {CAL_DAYS.map(d => (
            <View key={d} style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontSize: 9, color: theme.textDim, fontFamily: 'DMSans_700Bold', letterSpacing: 1 }}>{d}</Text>
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
                <TouchableOpacity key={ci} style={{ flex: 1, alignItems: 'center', paddingVertical: 5 }} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); calPickerSelect(dk); }} disabled={isFut} activeOpacity={0.7}>
                  <View style={{
                    width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center',
                    backgroundColor: isSel ? theme.accentBlueRaw : isTod ? `${theme.accentBlueRaw}26` : 'transparent',
                    borderWidth: isTod && !isSel ? 0.5 : 0, borderColor: theme.accentBlueRaw,
                  }}>
                    <Text style={{ fontSize: 13, fontFamily: isSel ? 'DMSans_700Bold' : 'DMSans_400Regular', color: isSel ? theme.bgPrimary : isFut ? theme.textDim : theme.textSecondary }}>
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
  const getAdvancedNutrient = (name: string) => {
    return Math.round(entries.reduce((s, e) => {
      const n = e.foodNutrients?.find((fn: any) => fn.nutrientName === name);
      if (!n) return s;
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
    load();
  }, []);

  // ── Register log ScrollView with tutorial system ──────────────────────────
  useEffect(() => {
    registerScrollView('log', scrollRef);
    return () => unregisterScrollView('log');
  }, []);

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
            if (typeof data.water === 'number') setWater(Math.max(0, data.water));
            setCaloriesBurned(parseInt(data.activeCalories || data.caloriesBurned) || 0);
          } else {
            setEntries([]);
            setWater(0);
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
    const newEntries = waterEntries.filter((_, i) => i !== idx);
    const newWater = Math.max(0, newEntries.reduce((sum, e) => sum + (e.sign === 'add' ? e.amount : -e.amount), 0));
    setWater(newWater);
    setWaterEntries(newEntries);
    const existing = await AsyncStorage.getItem(`pj_${activeDate}`);
    const current = existing ? JSON.parse(existing) : {};
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const updateWater = async (oz: number) => {
    const prev = water;
    const newWater = Math.max(0, water + oz);
    const sign: 'add' | 'remove' = oz > 0 ? 'add' : 'remove';
    const newEntry = { amount: Math.abs(oz), timestamp: new Date().toISOString(), sign };
    const newEntries = [...waterEntries, newEntry];
    setWater(newWater);
    setWaterEntries(newEntries);
    const existing = await AsyncStorage.getItem(`pj_${activeDate}`);
    const current = existing ? JSON.parse(existing) : {};
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
          if (hitCount === m.threshold) {
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
    <LinearGradient colors={[theme.gradientStart, theme.gradientEnd]} style={[styles.container, { paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: theme.borderCard }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
          <HeaderAvatar />
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: theme.accentBlueRaw }]}>Food Log</Text>
            <View ref={dateNavRef} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 1, height: 12, overflow: 'visible' }}>
              <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); openCalPicker(); }} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
                <Text style={{ fontSize: 9, color: isToday ? theme.textMuted : theme.accentAmber, fontFamily: 'DMSans_700Bold', letterSpacing: 2, textTransform: 'uppercase' }}>
                  {formatActiveDate()}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); goToPrevDay(); }} hitSlop={{ top: 14, bottom: 14, left: 8, right: 8 }}>
                <Ionicons name="chevron-back" size={16} color={theme.accentBlue} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); goToNextDay(); }} disabled={isToday} hitSlop={{ top: 14, bottom: 14, left: 8, right: 8 }}>
                <Ionicons name="chevron-forward" size={16} color={isToday ? theme.textDim : theme.accentBlue} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity
              style={[styles.libraryBtn, { height: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); returningFromChild.current = true; router.push({ pathname: '/add-food', params: { meal: 'browse', date: activeDate } }); }}>
              <Text style={[styles.libraryBtnText, { color: theme.accentBlue }]}>Library</Text>
          </TouchableOpacity>
          <View ref={logEditLayoutBtnRef as any} collapsable={false}>
            <TouchableOpacity
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); openEditMeals(); }}
              style={{ borderWidth:1, borderRadius:6, paddingHorizontal:12, paddingVertical:6, height:32, alignItems:'center', justifyContent:'center', backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder }}>
              <Ionicons name="grid" size={14} color={theme.accentBlue} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); showToolkit('log'); }} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <Ionicons name="help-circle" size={22} color={theme.accentBlue} />
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        onScrollBeginDrag={() => {}}
      >

      {/* Today's Total Card */}
      <View ref={todayTotalRef} style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: theme.accentBlueRaw }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <Text style={[styles.cardLabel, { color: theme.textMuted, marginBottom: 0 }]}>Today's Total</Text>
          <TooltipIcon tooltipKey="todays_total" />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <View style={styles.calRow}>
              <View style={{ shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 0 }}>
                <Text style={[styles.calNumber, { color: calColor, opacity: 0.88 }]}>{totalCals}</Text>
              </View>
              <Text style={[styles.calTarget, { color: theme.textSecondary }]}>/ {displayTarget} kcal</Text>
            </View>
            <View style={[styles.progressBarBg, { backgroundColor: theme.bgProgressTrack }]}>
              <ReAnimated.View style={[styles.progressBarFill, useAnimatedStyle(() => ({ width: withTiming(`${Math.min(calPct, 100)}%` as any, { duration: 400 }) })), { backgroundColor: calColor }]} />
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
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setDrilldownItem({ label: 'Protein', total: totalProtein, unit: 'g', direction: 'want-more', goal: macroGoals.protein || null, directField: 'protein' });
              setShowDrilldown(true);
            }}
            onPressCarbs={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setDrilldownItem({ label: 'Carbohydrates', total: totalCarbs, unit: 'g', direction: 'neutral', goal: macroGoals.carbs || null, directField: 'carbs', hasNetToggle: true, netTotal: totalNetCarbs, netComputeValue: computeNetCarbsForEntry });
              setShowDrilldown(true);
            }}
            onPressFat={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
                  <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: 'DMSans_700Bold', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 2 }}>{s.label}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
                    <Text style={{ fontSize: 18, color: s.color, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1 }}>{s.value}</Text>
                    <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: 'DMSans_700Bold', letterSpacing: 1 }}>kcal</Text>
                  </View>
                </View>
              ))}
            </View>
            {/* No BMR (no resolvable weight): explain the dashed net, point to the fix. */}
            {profileBmr === 0 && (
              <Text style={{ fontSize: 11, color: theme.textMuted, fontFamily: 'DMSans_400Regular', fontStyle: 'italic', marginTop: 6 }}>
                Log your weight to see your calorie net.
              </Text>
            )}
          </>
        )}
      </View>

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
              { label: 'Sugar Alc.',   value: totalSugarAlcohols, unit: 'g',  dir: 'neutral',   goal: null as number | null, nutrientKey: 'Sugar Alcohols' },
            ],
          },
          {
            key: 'fats', name: 'FATS',
            items: [
              { label: 'Sat. Fat',   value: totalSatFat,   unit: 'g', dir: 'want-less', goal: g.saturatedFat, nutrientKey: 'Fatty acids, total saturated' },
              { label: 'Trans Fat',  value: totalTransFat, unit: 'g', dir: 'want-less', goal: g.transFat,     nutrientKey: 'Trans Fat' },
              { label: 'Poly Fat',   value: totalPolyFat,  unit: 'g', dir: 'neutral',   goal: null as number | null, nutrientKey: 'Polyunsaturated Fat' },
              { label: 'Mono Fat',   value: totalMonoFat,  unit: 'g', dir: 'neutral',   goal: null as number | null, nutrientKey: 'Monounsaturated Fat' },
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
          <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: theme.accentBlueRaw }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
              <TouchableOpacity
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); toggleAdvanced(); }}
                activeOpacity={0.7}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}
              >
                <Text style={[styles.cardLabel, { color: theme.textMuted, marginBottom: 0 }]}>Advanced Nutrition</Text>
                <TooltipIcon tooltipKey="advanced_nutrition" />
              </TouchableOpacity>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowNutritionGear(true); }}
                  style={{ width: 36, height: 32, alignItems: 'center', justifyContent: 'center' }}
                  hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                >
                  <Ionicons name="settings" size={15} color={theme.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); toggleAdvanced(); }}
                  style={{ width: 28, height: 32, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Ionicons name={advancedExpanded ? 'chevron-up' : 'chevron-down'} size={14} color={theme.textMuted} />
                </TouchableOpacity>
              </View>
            </View>
            {advancedVisible && (
              <Animated.View style={{ opacity: advancedAnim }}>
                {allEmpty ? (
                  <Text style={{ color: theme.textDim, fontSize: 12, fontFamily: 'DMSans_400Regular', fontStyle: 'italic', paddingVertical: 6 }}>Log food to see advanced nutrition data.</Text>
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
                          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setAdvGroupOpen(prev => ({ ...prev, [grp.key]: !prev[grp.key] })); }}
                          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 7, borderTopWidth: 0.5, borderTopColor: theme.borderSubtle }}
                        >
                          <Text style={[styles.cardLabel, { color: theme.textMuted, marginBottom: 0, fontSize: 9 }]}>{grp.name}</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            {dvItems.length > 0 && (
                              <View style={{ borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: onTrack === dvItems.length ? 'rgba(13,146,104,0.15)' : theme.accentBlueBg }}>
                                <Text style={{ fontSize: 10, fontFamily: 'DMSans_600SemiBold', color: onTrack === dvItems.length ? MUTED_GREEN : theme.accentBlue }}>{onTrack}/{dvItems.length}</Text>
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
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setDrilldownItem({ label: item.label, total: item.value, unit: item.unit, direction: item.dir as 'want-more' | 'want-less' | 'neutral', goal: item.goal, nutrientKey: (item as any).nutrientKey, directField: (item as any).directField });
                                    setShowDrilldown(true);
                                  }}
                                  activeOpacity={(item as any).nutrientKey || (item as any).directField ? 0.65 : 1}
                                >
                                  <Text style={{ fontSize: 11, color: theme.textDim, fontFamily: 'DMSans_500Medium', marginBottom: 1 }}>{item.label}</Text>
                                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3, flexWrap: 'wrap' }}>
                                    <Text style={{ fontSize: 14, color: getColor(item.value, item.dir, item.goal), fontFamily: 'DMSans_700Bold' }}>{item.value}{item.unit}</Text>
                                    {item.goal !== null && (
                                      <Text style={{ fontSize: 13, color: theme.textMuted, fontFamily: 'DMSans_600SemiBold' }}>/ {item.goal}{item.unit}</Text>
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
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setDrilldownItem({ label: item.label, total: item.value, unit: item.unit, direction: item.dir as 'want-more' | 'want-less' | 'neutral', goal: item.goal, nutrientKey: (item as any).nutrientKey, directField: (item as any).directField });
                                    setShowDrilldown(true);
                                  }}
                                  activeOpacity={(item as any).nutrientKey || (item as any).directField ? 0.65 : 1}
                                >
                                  <Text style={{ fontSize: 11, color: theme.textDim, fontFamily: 'DMSans_500Medium', marginBottom: 1 }}>{item.label}</Text>
                                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3, flexWrap: 'wrap' }}>
                                    <Text style={{ fontSize: 14, color: getColor(item.value, item.dir, item.goal), fontFamily: 'DMSans_700Bold' }}>{item.value}{item.unit}</Text>
                                    {item.goal !== null && (
                                      <Text style={{ fontSize: 13, color: theme.textMuted, fontFamily: 'DMSans_600SemiBold' }}>/ {item.goal}{item.unit}</Text>
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
          </View>
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
          <View key={slot.id} style={[styles.mealRow, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: theme.accentBlueRaw }]}>
            {/* + button on left */}
            <TouchableOpacity
              ref={mealIdx === 0 ? (mealAddRef as any) : undefined}
              style={styles.mealAddBtn}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); returningFromChild.current = true; router.push({ pathname: '/add-food', params: { meal: slot.id, date: activeDate } }); }}>
              <Text style={[styles.mealAddBtnText, { color: theme.accentBlue }]}>+</Text>
            </TouchableOpacity>

            {/* Meal info middle */}
            <TouchableOpacity ref={entries.some(e => e.tutorialEntry) ? (slot.id === 'ms_lunch' ? (mealTotalRef as any) : undefined) : (mealIdx === 0 ? (mealTotalRef as any) : undefined)} style={[styles.mealInfo, { flexDirection: 'row', alignItems: 'center' }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); toggleMeal(slot.id); }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.mealName, { color: theme.textSecondary }]}>{slot.name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2, opacity: mealTotal > 0 ? 1 : 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#0d9268' }} />
                    <Text style={{ fontSize: 10, color: theme.textMuted, fontFamily: 'DMSans_400Regular' }}>{mealProtein}g</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#c47d1a' }} />
                    <Text style={{ fontSize: 10, color: theme.textMuted, fontFamily: 'DMSans_400Regular' }}>{mealCarbs}g</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#a83232' }} />
                    <Text style={{ fontSize: 10, color: theme.textMuted, fontFamily: 'DMSans_400Regular' }}>{mealFat}g</Text>
                  </View>
                </View>
              </View>
              {mealTotal > 0 && (
                <View style={{ alignItems: 'flex-end', marginRight: 4 }}>
                  <Text style={{ color: theme.textSecondary, fontSize: 18, fontFamily: 'BebasNeue_400Regular', lineHeight: 20 }}>{mealTotal}</Text>
                  <Text style={{ color: theme.textDim, fontSize: 9, fontFamily: 'DMSans_700Bold', letterSpacing: 1.5, textTransform: 'uppercase' }}>kcal</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Chevron on right */}
            <TouchableOpacity style={styles.mealChevron} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); toggleMeal(slot.id); }}>
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
                  <Text style={[styles.emptyMealText, { color: theme.textDim }]}>Nothing logged yet. Tap + to add.</Text>
                ) : (
                  mealEntries.map((entry, i) => (
                    <TouchableOpacity
                      ref={entry.tutorialEntry ? (tutorialEntryRef as any) : undefined}
                      key={i}
                      style={[styles.foodEntry, { backgroundColor: theme.accentBlueBg }]}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); returningFromChild.current = true; router.push({
                        pathname: '/food-detail',
                        params: {
                          foodJson: JSON.stringify({
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
                            existingAmount: (entry as any).loggedAmount || (() => { const m = entry.name.match(/\((\d+\.?\d*)(g|oz|serving)\)/); return m ? m[1] : '100'; })(),
                            existingUnit: (entry as any).loggedUnit || (() => { const m = entry.name.match(/\((\d+\.?\d*)(g|oz|serving)\)/); return m ? m[2] : 'g'; })(),
                            timestamp: entry.timestamp || Date.now(),
                            fsId: (entry as any).fsId || null,
                            servingGrams: (entry as any).servingGrams || undefined,
                            servingUnit: (entry as any).loggedUnit || undefined,
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
                          const amountLabel = amountMatch ? amountMatch[1] : null;
                          return (
                            <>
                              <Text style={[styles.foodEntryName, { color: theme.textPrimary }]} numberOfLines={1}>{foodName}{amountLabel ? ` · ${amountLabel}` : ''}</Text>
                              {(entry.protein !== undefined || entry.carbs !== undefined || entry.fat !== undefined) ? (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 }}>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#0d9268' }} />
                                    <Text style={{ fontSize: 10, color: theme.textMuted, fontFamily: 'DMSans_400Regular' }}>{entry.protein ?? 0}g</Text>
                                  </View>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#c47d1a' }} />
                                    <Text style={{ fontSize: 10, color: theme.textMuted, fontFamily: 'DMSans_400Regular' }}>{entry.carbs ?? 0}g</Text>
                                  </View>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#a83232' }} />
                                    <Text style={{ fontSize: 10, color: theme.textMuted, fontFamily: 'DMSans_400Regular' }}>{entry.fat ?? 0}g</Text>
                                  </View>
                                </View>
                              ) : null}
                            </>
                          );
                        })()}
                      </View>
                      <View style={styles.foodEntryRight}>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={[styles.foodEntryCal, { color: theme.macroProtein }]}>{entry.cal}</Text>
                          <Text style={[styles.foodEntryCalLabel, { color: theme.textMuted }]}>kcal</Text>
                        </View>
                        <TouchableOpacity
                          ref={entry.tutorialEntry ? (tutorialDeleteRef as any) : undefined}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            Alert.alert(
                              'Remove Entry',
                              `Remove ${entry.name} from your log?`,
                              [
                                { text: 'Cancel', style: 'cancel', onPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) },
                                { text: 'Remove', style: 'destructive', onPress: () => {
                                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
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
              </View>
              </Animated.View>
            )}
          </View>
        );
      })}

      {/* Water Card */}
      <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: theme.accentBlueRaw, overflow: 'hidden' }]}>
        <Ionicons name="water" size={130} color={theme.accentBlueRaw} style={{ position: 'absolute', right: -24, bottom: -28, opacity: 0.10 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="water-outline" size={11} color={theme.textMuted} />
            <Text style={[styles.cardLabel, { marginBottom: 0, color: theme.textMuted }]}>
              {'Water · '}
              <Text style={{ textTransform: 'none' }}>{water}oz / {waterGoal}oz</Text>
            </Text>
          </View>
          <TouchableOpacity onPress={openWaterDetailModal} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="settings" size={16} color={theme.textMuted} />
          </TouchableOpacity>
        </View>
        <WaterBar pct={waterPct} color={theme.accentBlue} trackColor={theme.bgProgressTrack} refreshKey={logRefreshKey} overGoal={water > waterGoal} />
        <View style={styles.waterBtns}>
          {waterPresets.map((oz, i) => (
            <PressableButton key={i} style={[styles.waterBtn, { backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder }]} onPress={() => updateWater(oz)}>
              <Text style={[styles.waterBtnText, { color: theme.accentBlue }]}>+{oz} oz</Text>
            </PressableButton>
          ))}
          <PressableButton style={[styles.waterBtn, { backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder }]} onPress={() => openWaterCustomModal('add')}>
            <View style={{ alignItems: 'center', justifyContent: 'center', width: 20, height: 20 }}>
              <Ionicons name="water-outline" size={18} color={theme.accentBlue} />
              <Text style={{ color: theme.accentBlue, fontSize: 9, fontFamily: 'DMSans_700Bold', position: 'absolute', bottom: -2, right: -4 }}>+</Text>
            </View>
          </PressableButton>
        </View>
        <View style={[styles.waterBtns, { marginTop: 8 }]}>
          {waterPresets.map((oz, i) => (
            <PressableButton key={i} style={[styles.waterBtnRed, { backgroundColor: theme.accentRedBg, borderColor: theme.accentRedBorder }]} onPress={() => updateWater(-oz)}>
              <Text style={[styles.waterBtnRedText, { color: theme.accentRed }]}>-{oz} oz</Text>
            </PressableButton>
          ))}
          <PressableButton style={[styles.waterBtnRed, { backgroundColor: theme.accentRedBg, borderColor: theme.accentRedBorder }]} onPress={() => openWaterCustomModal('subtract')}>
            <View style={{ alignItems: 'center', justifyContent: 'center', width: 20, height: 20 }}>
              <Ionicons name="water-outline" size={18} color={theme.accentRed} />
              <Text style={{ color: theme.accentRed, fontSize: 9, fontFamily: 'DMSans_700Bold', position: 'absolute', bottom: -2, right: -4 }}>-</Text>
            </View>
          </PressableButton>
        </View>
      </View>

      {/* IF Card -- live today view */}
      {isToday && (
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
      )}

      {/* IF Card -- read-only past day summary (only when both start + end logged) */}
      {!isToday && pastIfStart && pastIfEnd && (
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
      )}

    </ScrollView>

    {showWaterCustomModal && (
      <Animated.View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: theme.overlayBg, justifyContent: 'center', alignItems: 'center', zIndex: 999, opacity: waterModalAnim }}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={closeWaterCustomModal} activeOpacity={1} />
        <View style={{ backgroundColor: theme.bgSheet, borderRadius: 14, padding: 24, width: '80%', borderWidth: 0.5, borderColor: theme.borderCard }}>
          <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: 'DMSans_700Bold', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>
            {waterCustomSign === 'add' ? 'Add Custom Amount' : 'Remove Custom Amount'}
          </Text>
          <TextInput
            ref={waterCustomInputRef}
            style={{ backgroundColor: theme.bgInput, borderWidth: 0.5, borderColor: theme.borderInput, borderRadius: 8, color: theme.textPrimary, padding: 12, fontSize: 24, fontFamily: 'BebasNeue_400Regular', textAlign: 'center', marginBottom: 16 }}
            value={waterCustomInput} onChangeText={setWaterCustomInput} keyboardType="number-pad" placeholder="0" placeholderTextColor={theme.textPlaceholder} autoFocus />
          <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: 'DMSans_700Bold', letterSpacing: 1, textTransform: 'uppercase', textAlign: 'center', marginBottom: 16 }}>oz</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity style={{ flex: 1, padding: 12, borderRadius: 8, backgroundColor: theme.bgInput, alignItems: 'center' }} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); closeWaterCustomModal(); }}>
              <Text style={{ color: theme.textMuted, fontFamily: 'DMSans_600SemiBold', fontSize: 14 }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flex: 1, padding: 12, borderRadius: 8, backgroundColor: waterCustomSign === 'add' ? theme.accentBlueBg : theme.accentRedBg, alignItems: 'center' }}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                const amt = parseInt(waterCustomInput);
                if (amt > 0) { updateWater(waterCustomSign === 'add' ? amt : -amt); }
                closeWaterCustomModal();
              }}>
              <Text style={{ color: waterCustomSign === 'add' ? theme.accentBlue : theme.accentRed, fontFamily: 'DMSans_600SemiBold', fontSize: 14 }}>
                {waterCustomSign === 'add' ? 'Add' : 'Remove'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
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
              {/* Handle + header always visible above scroll */}
              <TouchableOpacity onPress={closeWaterDetailModal} style={{ alignItems:'center', paddingTop:12, paddingBottom:8 }}>
                <View style={{ width:36, height:4, borderRadius:2, backgroundColor: theme.sheetHandle }} />
              </TouchableOpacity>
              <View style={{ paddingHorizontal:16, paddingBottom:12 }}>
                <Text style={{ fontSize:9, color: theme.accentBlueRaw, fontFamily:'DMSans_700Bold', letterSpacing:3, textTransform:'uppercase' }}>Water Log</Text>
              </View>
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
                    <Text style={{ fontSize:9, color: theme.textMuted, fontFamily:'DMSans_700Bold', letterSpacing:2, textTransform:'uppercase' }}>Progress</Text>
                    <View style={{ backgroundColor: statusColor+'22', borderRadius:12, paddingHorizontal:8, paddingVertical:3 }}>
                      <Text style={{ fontSize:10, color: statusColor, fontFamily:'DMSans_700Bold', letterSpacing:1 }}>{statusLabel}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection:'row', marginBottom:12 }}>
                    <View style={{ flex:1 }}>
                      <Text style={{ fontSize:9, color: theme.textMuted, fontFamily:'DMSans_700Bold', letterSpacing:2, textTransform:'uppercase', marginBottom:2 }}>Logged</Text>
                      <Text style={{ fontSize:28, color: theme.accentBlueRaw, fontFamily:'BebasNeue_400Regular', letterSpacing:1 }}>
                        {water}<Text style={{ fontSize:14, color: theme.textMuted, fontFamily:'BebasNeue_400Regular' }}> oz</Text>
                      </Text>
                      <Text style={{ fontSize:10, color: theme.textDim, fontFamily:'DMSans_400Regular' }}>of {waterGoal} oz goal</Text>
                    </View>
                    {isToday && !goalMet ? (
                      <View style={{ flex:1, borderLeftWidth:0.5, borderLeftColor: theme.borderCard, paddingLeft:14 }}>
                        <Text style={{ fontSize:9, color: theme.textMuted, fontFamily:'DMSans_700Bold', letterSpacing:2, textTransform:'uppercase', marginBottom:2 }}>Expected Now</Text>
                        <Text style={{ fontSize:28, color: statusColor, fontFamily:'BebasNeue_400Regular', letterSpacing:1 }}>
                          {expectedOz}<Text style={{ fontSize:14, color: theme.textMuted, fontFamily:'BebasNeue_400Regular' }}> oz</Text>
                        </Text>
                        <Text style={{ fontSize:10, color: theme.textDim, fontFamily:'DMSans_400Regular' }}>by this time of day</Text>
                      </View>
                    ) : (
                      <View style={{ flex:1, borderLeftWidth:0.5, borderLeftColor: theme.borderCard, paddingLeft:14, justifyContent:'center' }}>
                        <Text style={{ fontSize:28, color: theme.statusGood, fontFamily:'BebasNeue_400Regular', letterSpacing:1 }}>{goalMet ? 'Goal' : ''}</Text>
                        <Text style={{ fontSize:20, color: theme.statusGood, fontFamily:'BebasNeue_400Regular', letterSpacing:1 }}>{goalMet ? 'Complete' : ''}</Text>
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
                  <Text style={{ fontSize:9, color: theme.textMuted, fontFamily:'DMSans_700Bold', letterSpacing:2, textTransform:'uppercase' }}>Entries</Text>
                </View>
                <ScrollView style={{ maxHeight:160 }} contentContainerStyle={{ paddingHorizontal:16, paddingBottom:8 }} showsVerticalScrollIndicator={false} nestedScrollEnabled={true} keyboardDismissMode="on-drag">
                  {waterEntries.length === 0 ? (
                    <Text style={{ fontSize:12, color: theme.textDim, fontFamily:'DMSans_400Regular', textAlign:'center', paddingVertical:14 }}>No entries yet</Text>
                  ) : (
                    [...waterEntries].reverse().map((entry, displayIdx) => {
                      const realIdx = waterEntries.length - 1 - displayIdx;
                      const entryTime = new Date(entry.timestamp).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
                      return (
                        <View key={realIdx} style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingVertical:9, borderBottomWidth:0.5, borderBottomColor: theme.borderCard }}>
                          <Text style={{ fontSize:12, color: theme.textMuted, fontFamily:'DMSans_500Medium', width:68 }}>{entryTime}</Text>
                          <Text style={{ fontSize:14, color: entry.sign === 'add' ? theme.statusGood : theme.statusBad, fontFamily:'DMSans_600SemiBold', flex:1 }}>
                            {entry.sign === 'add' ? '+' : '-'}{entry.amount} oz
                          </Text>
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
                  <Text style={{ fontSize:9, color: theme.textMuted, fontFamily:'DMSans_700Bold', letterSpacing:2, textTransform:'uppercase', marginBottom:10 }}>Quick Add Presets</Text>
                  <View style={{ flexDirection:'row', gap:8, marginBottom:10 }}>
                    {([0,1,2] as const).map(i => (
                      <View key={i} style={{ flex:1, alignItems:'center' }}>
                        <TextInput
                          style={{ backgroundColor: theme.bgInput, borderWidth:0.5, borderColor: theme.borderInput, borderRadius:8, color: theme.textSecondary, padding:10, fontSize:18, fontFamily:'BebasNeue_400Regular', textAlign:'center', width:'100%' }}
                          value={waterPresetInputs[i]}
                          onChangeText={v => { const cleaned = v.replace(/[^0-9]/g,''); const next = [...waterPresetInputs] as [string,string,string]; next[i] = cleaned; setWaterPresetInputs(next); }}
                          keyboardType="number-pad"
                          placeholder={String(waterPresets[i])}
                          placeholderTextColor={theme.textPlaceholder}
                        />
                        <Text style={{ fontSize:9, color: theme.textDim, fontFamily:'DMSans_500Medium', marginTop:3 }}>oz</Text>
                      </View>
                    ))}
                  </View>
                  <TouchableOpacity
                    style={{ backgroundColor: presetsSaveable ? theme.accentBlueBg : theme.bgInput, borderWidth:1, borderColor: presetsSaveable ? theme.accentBlueBorder : theme.borderInput, borderRadius:8, padding:12, alignItems:'center', opacity: presetsSaveable ? 1 : 0.5 }}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); saveWaterPresets(); }}
                    disabled={!presetsSaveable}>
                    <Text style={{ color: presetsSaveable ? theme.accentBlue : theme.textDim, fontFamily:'DMSans_600SemiBold', fontSize:14 }}>Save Presets</Text>
                  </TouchableOpacity>
                </View>
                <View style={{ height:0.5, backgroundColor: theme.borderCard, marginHorizontal:16 }} />
                {/* Daily Goal */}
                <View style={{ paddingHorizontal:16, paddingTop:14, paddingBottom:20 }}>
                  <Text style={{ fontSize:9, color: theme.textMuted, fontFamily:'DMSans_700Bold', letterSpacing:2, textTransform:'uppercase', marginBottom:10 }}>Daily Goal</Text>
                  <View style={{ flexDirection:'row', gap:8, alignItems:'flex-start' }}>
                    <View style={{ flex:1 }}>
                      <TextInput
                        style={{ backgroundColor: theme.bgInput, borderWidth:0.5, borderColor: theme.borderInput, borderRadius:8, color: theme.textSecondary, padding:10, fontSize:18, fontFamily:'BebasNeue_400Regular', textAlign:'center' }}
                        value={waterGoalInput}
                        onChangeText={v => setWaterGoalInput(v.replace(/[^0-9]/g,''))}
                        keyboardType="number-pad"
                        placeholder={String(waterGoal)}
                        placeholderTextColor={theme.textPlaceholder}
                      />
                      <Text style={{ fontSize:9, color: theme.textDim, fontFamily:'DMSans_500Medium', marginTop:3, textAlign:'center' }}>oz</Text>
                    </View>
                    <TouchableOpacity
                      style={{ flex:2, backgroundColor: goalSaveable ? theme.accentBlueBg : theme.bgInput, borderWidth:1, borderColor: goalSaveable ? theme.accentBlueBorder : theme.borderInput, borderRadius:8, padding:12, alignItems:'center', opacity: goalSaveable ? 1 : 0.5, marginTop:1 }}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); saveWaterGoal(); }}
                      disabled={!goalSaveable}>
                      <Text style={{ color: goalSaveable ? theme.accentBlue : theme.textDim, fontFamily:'DMSans_600SemiBold', fontSize:14 }}>Save Goal</Text>
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
          {/* Handle -- marginTop/Bottom 12 on pill matches editSheetHandle from home tab */}
          <TouchableOpacity
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); closeEditMeals(); }}
            style={{ alignSelf:'center', paddingVertical:10, paddingHorizontal:40 }}>
            <View style={{ width:36, height:4, borderRadius:2, backgroundColor: theme.sheetHandle, marginTop:12, marginBottom:12 }} />
          </TouchableOpacity>
          {/* Header -- matches editSheetHeader from home tab */}
          <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingBottom:16, borderBottomWidth:0.5, borderBottomColor: theme.borderSubtle }}>
            <View>
              <Text style={{ fontSize:13, color: theme.accentBlueRaw, fontFamily:'DMSans_700Bold', letterSpacing:2, textTransform:'uppercase' }}>Edit Meal Slots</Text>
              <Text style={{ fontSize:10, color: theme.textDim, fontFamily:'DMSans_400Regular', marginTop:2 }}>{mealSlots.length} of 8 slots</Text>
            </View>
            <TouchableOpacity
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); closeEditMeals(); }}
              style={{ backgroundColor: theme.accentGreenBg, borderWidth:1, borderColor: theme.accentGreenBorder, borderRadius:6, paddingHorizontal:14, paddingVertical:6, height:32, alignItems:'center', justifyContent:'center' }}>
              <Text style={{ color: theme.accentGreen, fontSize:12, fontFamily:'DMSans_700Bold', letterSpacing:1 }}>DONE</Text>
            </TouchableOpacity>
          </View>
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
                    style={{ flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8, paddingVertical:13, borderRadius:8, backgroundColor: mealSlots.length >= 8 ? theme.bgInput : theme.accentBlueBg, borderWidth:1, borderColor: mealSlots.length >= 8 ? theme.borderInput : theme.accentBlueBorder, opacity: mealSlots.length >= 8 ? 0.5 : 1 }}
                    onPress={addMealSlot}
                    disabled={mealSlots.length >= 8}>
                    <Ionicons name="add" size={16} color={mealSlots.length >= 8 ? theme.textDim : theme.accentBlue} />
                    <Text style={{ fontSize:14, color: mealSlots.length >= 8 ? theme.textDim : theme.accentBlue, fontFamily:'DMSans_600SemiBold' }}>
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
                          style={{ fontSize:13, color: theme.textPrimary, fontFamily:'DMSans_600SemiBold', padding:0 }}
                        />
                      ) : (
                        <TouchableOpacity
                          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setEditingSlotId(slot.id); setEditingSlotName(slot.name); }}
                          hitSlop={{ top:4, bottom:4, left:0, right:0 }}>
                          <Text style={{ fontSize:13, color: theme.textPrimary, fontFamily:'DMSans_600SemiBold', marginBottom:2 }}>{slot.name}</Text>
                          <Text style={{ fontSize:11, color: theme.textDim, fontFamily:'DMSans_400Regular' }}>Tap to rename</Text>
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

      <Modal visible={calPickerVisible} transparent animationType="none" onRequestClose={closeCalPicker}>
        <Animated.View style={{ flex: 1, opacity: calFadeAnim }}>
          <TouchableOpacity style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)' }} onPress={closeCalPicker} activeOpacity={1} />
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', pointerEvents: 'box-none' }}>
            <View style={{ backgroundColor: theme.bgSheet, borderRadius: 16, paddingHorizontal: 20, paddingBottom: 20, width: 310, borderWidth: 0.5, borderColor: theme.borderCard, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 }}>
              <TouchableOpacity onPress={closeCalPicker} style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 16 }}>
                <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.sheetHandle }} />
              </TouchableOpacity>
              <Text style={{ fontSize: 10, color: theme.accentBlueRaw, fontFamily: 'DMSans_700Bold', letterSpacing: 3, textTransform: 'uppercase', textAlign: 'center', marginBottom: 16 }}>Jump to Date</Text>
              {calPickerVisible && renderCalGrid()}
              <TouchableOpacity
                onPress={closeCalPicker}
                style={{ marginTop: 16, alignItems: 'center', paddingVertical: 8, paddingHorizontal: 16, backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder, borderRadius: 8 }}>
                <Text style={{ fontSize: 14, color: theme.accentBlue, fontFamily: 'DMSans_600SemiBold' }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </Modal>

    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1 },
  content:            { padding: 16, paddingBottom: 80 },
  header:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 0.5, marginBottom: 16 },
  headerLabel:        { fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2, fontFamily: 'DMSans_700Bold' },
  headerTitle:        { fontSize: 32, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2 },
  libraryBtn:         { borderWidth: 1, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 },
  libraryBtnText:     { fontSize: 14, fontFamily: 'DMSans_700Bold' },
  card:               { borderWidth: 0.5, borderTopWidth: 1.5, borderRadius: 14, padding: 16, marginBottom: 12, shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6 },
  cardLabel:          { fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8, fontFamily: 'DMSans_700Bold' },
  calRow:             { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 10 },
  calNumber:          { fontSize: 52, lineHeight: 56, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1 },
  calTarget:          { fontSize: 14, fontFamily: 'DMSans_700Bold', letterSpacing: 0.3 },
  progressBarBg:      { height: 6, borderRadius: 6, overflow: 'hidden', marginBottom: 12 },
  progressBarFill:    { height: '100%', borderRadius: 6 },
  calRemaining:       { fontSize: 10, fontFamily: 'DMSans_700Bold', letterSpacing: 1.5, textTransform: 'uppercase' },
  mealRow:            { borderWidth: 0.5, borderTopWidth: 1.5, borderRadius: 14, marginBottom: 12, overflow: 'hidden', shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6 },
  mealAddBtn:         { position: 'absolute', left: 14, top: 14, zIndex: 1, width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  mealAddBtnText:     { fontSize: 22, fontFamily: 'DMSans_400Regular', lineHeight: 24 },
  mealInfo:           { paddingLeft: 50, paddingRight: 40, paddingVertical: 14 },
  mealName:           { fontSize: 16, fontFamily: 'DMSans_600SemiBold' },
  mealCals:           { fontSize: 10, fontFamily: 'DMSans_700Bold', marginTop: 2, letterSpacing: 1.5, textTransform: 'uppercase' },
  mealChevron:        { position: 'absolute', right: 14, top: 14, width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  mealChevronText:    { fontSize: 14, fontFamily: 'DMSans_400Regular' },
  mealExpanded:       { borderTopWidth: 0.5, paddingHorizontal: 16, paddingVertical: 8 },
  foodEntry:          { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 10, borderRadius: 8, marginBottom: 4 },
  foodEntryLeft:      { flex: 1, marginRight: 8 },
  foodEntryName:      { fontSize: 13, fontFamily: 'DMSans_600SemiBold' },
  foodEntryMacros:    { fontSize: 10, fontFamily: 'DMSans_700Bold', marginTop: 2, letterSpacing: 1, textTransform: 'uppercase' },
  foodEntryRight:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  foodEntryCal:       { fontSize: 16, fontFamily: 'BebasNeue_400Regular' },
  foodEntryCalLabel:  { fontSize: 10, fontFamily: 'DMSans_400Regular' },
  foodEntryDelete:    { marginLeft: 8, padding: 4 },
  foodEntryDeleteText:{ fontSize: 18 },
  emptyMealText:      { fontSize: 11, fontFamily: 'DMSans_400Regular', fontStyle: 'italic', paddingVertical: 8 },
  waterBtns:          { flexDirection: 'row', gap: 8 },
  waterBtn:           { flex: 1, padding: 10, borderWidth: 0.5, borderRadius: 8, alignItems: 'center' },
  waterBtnText:       { fontFamily: 'BebasNeue_400Regular', fontSize: 15, letterSpacing: 1 },
  waterBtnRed:        { flex: 1, padding: 10, borderWidth: 0.5, borderRadius: 8, alignItems: 'center' },
  waterBtnRedText:    { fontFamily: 'BebasNeue_400Regular', fontSize: 15, letterSpacing: 1 },
});