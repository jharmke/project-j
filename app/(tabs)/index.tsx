import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import ReAnimated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import PressableButton from '../../components/PressableButton';
import { loadFromFirebase, saveToFirebase } from '../../firebaseConfig';
import { useHealthKit } from '../../useHealthKit';

// ─── Card Registry ────────────────────────────────────────────────────────────
export type CardId =
  | 'verse'
  | 'if'
  | 'calories'
  | 'macros'
  | 'water'
  | 'weight'
  | 'workout'
  | 'steps'
  | 'sleep'
  | 'fitness_metrics'
  | 'daily_note';

interface CardMeta {
  id: CardId;
  label: string;
  description: string;
  defaultVisible: boolean;
}

const CARD_REGISTRY: CardMeta[] = [
  { id: 'verse',          label: 'Daily Verse',       description: 'Scripture for the day',                  defaultVisible: true },
  { id: 'if',             label: 'Intermittent Fast',  description: 'Fasting window timer & tracker',         defaultVisible: true },
  { id: 'calories',       label: 'Calories',           description: 'Daily calorie intake & progress',        defaultVisible: true },
  { id: 'macros',         label: 'Macros',             description: 'Protein, carbs & fat breakdown',         defaultVisible: true },
  { id: 'water',          label: 'Water',              description: 'Hydration tracking',                     defaultVisible: true },
  { id: 'weight',         label: 'Weight',             description: 'Daily weigh-in & total progress',        defaultVisible: true },
  { id: 'workout',        label: "Today's Workout",    description: "Today's scheduled training focus",       defaultVisible: true },
  { id: 'steps',          label: 'Steps',              description: 'Step count from Apple Health',           defaultVisible: true },
  { id: 'sleep',          label: 'Sleep',              description: 'Sleep duration & stages from Apple Health', defaultVisible: true },
  { id: 'fitness_metrics',label: 'Fitness Metrics',    description: 'VO2 Max & cardio recovery score',        defaultVisible: true },
  { id: 'daily_note',     label: 'Daily Note',         description: 'Journal entry for the day',             defaultVisible: true },
];

const DEFAULT_ORDER: CardId[] = CARD_REGISTRY.map(c => c.id);
const DEFAULT_VISIBLE: Record<CardId, boolean> = Object.fromEntries(
  CARD_REGISTRY.map(c => [c.id, c.defaultVisible])
) as Record<CardId, boolean>;

// ─── Constants ────────────────────────────────────────────────────────────────
const WATER_TARGET = 128;
const IF_METHODS: Record<string, { fast: number; eat: number }> = {
  '12:12': { fast: 12, eat: 12 },
  '14:10': { fast: 14, eat: 10 },
  '16:8':  { fast: 16, eat: 8  },
  '18:6':  { fast: 18, eat: 6  },
  '20:4':  { fast: 20, eat: 4  },
  'Custom':{ fast: 16, eat: 8  },
};
const PROGRAM: Record<string, any> = {
  Wed: { focus: 'Push',        muscles: 'Chest · Shoulders · Triceps',            color: '#3b82f6', type: 'lift'   },
  Sat: { focus: 'Pull',        muscles: 'Back · Biceps · Rear Delts',             color: '#10b981', type: 'lift'   },
  Sun: { focus: 'Legs + Core', muscles: 'Quads · Hamstrings · Glutes · Core',    color: '#f59e0b', type: 'lift'   },
  Mon: { focus: 'Cardio',      type: 'cardio' },
  Tue: { focus: 'Cardio',      type: 'cardio' },
  Thu: { focus: 'Cardio',      type: 'cardio' },
  Fri: { focus: 'Cardio',      type: 'cardio' },
};
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const VERSES = [
  { text: "I can do all things through Christ who strengthens me.", reference: "Philippians 4:13" },
  { text: "Do you not know that your body is a temple of the Holy Spirit within you? You are not your own.", reference: "1 Corinthians 6:19" },
  { text: "For God gave us a spirit not of fear but of power and love and self-control.", reference: "2 Timothy 1:7" },
  { text: "Whatever you do, work heartily, as for the Lord and not for men.", reference: "Colossians 3:23" },
  { text: "But they who wait for the Lord shall renew their strength; they shall mount up with wings like eagles.", reference: "Isaiah 40:31" },
  { text: "No discipline seems pleasant at the time, but painful. Later on, however, it produces a harvest of righteousness.", reference: "Hebrews 12:11" },
  { text: "So whether you eat or drink or whatever you do, do it all for the glory of God.", reference: "1 Corinthians 10:31" },
  { text: "Train yourself to be godly. For physical training is of some value, but godliness has value for all things.", reference: "1 Timothy 4:7-8" },
  { text: "Commit your work to the Lord, and your plans will be established.", reference: "Proverbs 16:3" },
  { text: "Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you.", reference: "Joshua 1:9" },
  { text: "Let us not become weary in doing good, for at the proper time we will reap a harvest if we do not give up.", reference: "Galatians 6:9" },
  { text: "And let us run with perseverance the race marked out for us, fixing our eyes on Jesus.", reference: "Hebrews 12:1-2" },
  { text: "The Lord is my strength and my shield; my heart trusts in him, and he helps me.", reference: "Psalm 28:7" },
  { text: "Create in me a clean heart, O God, and renew a right spirit within me.", reference: "Psalm 51:10" },
];

// ─── Sub-components ───────────────────────────────────────────────────────────
function MacroDonut({ protein, carbs, fat, calories }: { protein: number; carbs: number; fat: number; calories: number }) {
  const size = 120;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = protein + carbs + fat;
  if (total === 0) {
    return (
      <View style={{ alignItems: 'center', justifyContent: 'center', width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle cx={size/2} cy={size/2} r={radius} stroke="#2a2a2a" strokeWidth={strokeWidth} fill="none" />
        </Svg>
        <View style={{ position: 'absolute', alignItems: 'center' }}>
          <Text style={{ color: '#333333', fontSize: 11, fontFamily: 'DMSans_400Regular' }}>no data</Text>
        </View>
      </View>
    );
  }
  const proteinPct = protein / total;
  const carbsPct   = carbs   / total;
  const proteinDash = proteinPct * circumference;
  const carbsDash   = carbsPct   * circumference;
  const fatDash     = (fat / total) * circumference;
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: size, height: size }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size/2} cy={size/2} r={radius} stroke="#2a2a2a" strokeWidth={strokeWidth} fill="none" />
        <Circle cx={size/2} cy={size/2} r={radius} stroke="#0d9268" strokeWidth={strokeWidth} fill="none"
          strokeDasharray={`${proteinDash} ${circumference}`} strokeDashoffset={0} strokeLinecap="butt" />
        <Circle cx={size/2} cy={size/2} r={radius} stroke="#c47d1a" strokeWidth={strokeWidth} fill="none"
          strokeDasharray={`${carbsDash} ${circumference}`} strokeDashoffset={-(proteinPct * circumference)} strokeLinecap="butt" />
        <Circle cx={size/2} cy={size/2} r={radius} stroke="#a83232" strokeWidth={strokeWidth} fill="none"
          strokeDasharray={`${fatDash} ${circumference}`} strokeDashoffset={-((proteinPct + carbsPct) * circumference)} strokeLinecap="butt" />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={{ color: '#ffffff', fontSize: 16, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1 }}>{calories}</Text>
        <Text style={{ color: '#888888', fontSize: 9, fontFamily: 'DMSans_400Regular' }}>kcal</Text>
      </View>
    </View>
  );
}

function AnimatedProgressBar({ pct, color, refreshKey }: { pct: number; color: string; refreshKey?: number }) {
  const width = useSharedValue(0);
  useEffect(() => {
    width.value = 0;
    if (pct > 0) {
      setTimeout(() => {
        width.value = withTiming(Math.min(100, pct), { duration: 1200 });
      }, 350);
    }
  }, [pct, refreshKey]);
  const animStyle = useAnimatedStyle(() => ({ width: `${width.value}%` as any }));
  return (
    <View style={styles.progressBarBg}>
      <ReAnimated.View style={[styles.progressBarFill, { backgroundColor: color }, animStyle]} />
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
function MacroBar({ val, goal, color }: { val: number; goal: number; color: string }) {
  const pct = goal > 0 ? Math.min((val / goal) * 100, 100) : 0;
  const width = useSharedValue(0);
  useEffect(() => {
    width.value = withTiming(pct, { duration: 1000 });
  }, [pct]);
  const animStyle = useAnimatedStyle(() => ({ width: `${width.value}%` as any }));
  return (
    <View style={{ height:6, backgroundColor:'#12121a', borderRadius:6, overflow:'hidden' }}>
      <ReAnimated.View style={[{ height:'100%', borderRadius:6, backgroundColor: color }, animStyle]} />
    </View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();

  // Layout state
  const [cardOrder,   setCardOrder]   = useState<CardId[]>(DEFAULT_ORDER);
  const [cardVisible, setCardVisible] = useState<Record<CardId, boolean>>(DEFAULT_VISIBLE);
  const [editMode,    setEditMode]    = useState(false);
  const [showCardSheet, setShowCardSheet] = useState(false);
  const sheetAnim = useRef(new Animated.Value(0)).current;
  const editSheetAnim = useRef(new Animated.Value(0)).current;

  // App state
  const [loaded,          setLoaded]          = useState(false);
  const [showRefreshToast,setShowRefreshToast] = useState(false);
  const [refreshKey,      setRefreshKey]       = useState(0);
  const [waterPresets,    setWaterPresets]     = useState<[number,number,number]>([12,16,22]);
  const [showWaterCustomModal, setShowWaterCustomModal] = useState(false);
  const [waterCustomInput,     setWaterCustomInput]     = useState('');
  const [waterCustomSign,      setWaterCustomSign]      = useState<'add'|'subtract'>('add');
  const toastOpacity = useRef(new Animated.Value(0)).current;

  // IF state
  const [ifStart,       setIfStart]       = useState<number|null>(null);
  const [ifMethod,      setIfMethod]      = useState<string>('16:8');
  const [ifEnd,         setIfEnd]         = useState<number|null>(null);
  const [ifCustomHours, setIfCustomHours] = useState<string>('16');
  const [currentTime,   setCurrentTime]   = useState(Date.now());

  // Health / daily state
  const [water,          setWater]          = useState(0);
  const [weight,         setWeight]         = useState<number|null>(null);
  const [yesterdayWeight,setYesterdayWeight]= useState<number|null>(null);
  const [earliestWeight, setEarliestWeight] = useState<number|null>(null);
  const [weightInput,    setWeightInput]    = useState('');
  const [dailyNote,      setDailyNote]      = useState('');
  const [totalCals,      setTotalCals]      = useState(0);
  const [calTarget,      setCalTarget]      = useState(0);
  const [caloriesBurned, setCaloriesBurned] = useState(0);
  const [totalProtein,   setTotalProtein]   = useState(0);
  const [totalCarbs,     setTotalCarbs]     = useState(0);
  const [totalFat,       setTotalFat]       = useState(0);
  const [stepGoal,       setStepGoal]       = useState(10000);
  const [editingStepGoal,setEditingStepGoal]= useState(false);
  const [dailyVerse,     setDailyVerse]     = useState<{text:string;reference:string}|null>(null);

  // Sleep state
  const [sleepOverride,   setSleepOverride]   = useState<number|null>(null);
  const [sleepStoredBed,  setSleepStoredBed]  = useState<string|null>(null);
  const [sleepStoredWake, setSleepStoredWake] = useState<string|null>(null);
  const [editingSleep,    setEditingSleep]    = useState(false);
  const [sleepBedTime,    setSleepBedTime]    = useState<Date|null>(null);
  const [sleepWakeTime,   setSleepWakeTime]   = useState<Date|null>(null);
  const [showBedTimePicker, setShowBedTimePicker]   = useState(false);
  const [showWakeTimePicker,setShowWakeTimePicker]  = useState(false);
  const [showTimePicker,    setShowTimePicker]      = useState(false);
  const [showEndTimePicker, setShowEndTimePicker]   = useState(false);
  const [pickerTime,        setPrickerTime]         = useState<Date|null>(null);

  const { activeCalories, steps, distance, sleepHours, sleepStages, sleepTimes, vo2Max, cardioRecovery, fetchTodayData } = useHealthKit();

  const today    = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  const hkCalories    = activeCalories > 0 ? activeCalories : caloriesBurned;
  const adjustedTarget= calTarget + hkCalories;
  const displayedBurned = hkCalories;
  const calPct   = adjustedTarget > 0 ? (totalCals / adjustedTarget) * 100 : 0;
  const calColor = calPct > 114 ? '#ef4444' : calPct > 106 ? '#f59e0b' : calPct >= 80 ? '#10b981' : calPct >= 63 ? '#f59e0b' : '#ef4444';
  const todayDay = DAY_NAMES[new Date().getDay()];
  const todayProgram = PROGRAM[todayDay];
  const isLift   = todayProgram?.type === 'lift';
  const dayColor = isLift ? todayProgram.color : '#888888';
  const windowHours = ifMethod === 'Custom' ? (parseInt(ifCustomHours)||16) : (IF_METHODS[ifMethod]?.eat||8);
  const windowEnd   = ifStart ? ifStart + windowHours * 3600000 : null;
  const remaining   = windowEnd && !ifEnd ? windowEnd - currentTime : null;
  const isOpen      = remaining !== null && remaining > 0;
  const ifActualMs  = ifEnd && ifStart ? ifEnd - ifStart : null;
  const ifTargetMs  = windowHours * 3600000;
  const ifOverUnderMs = ifEnd && windowEnd ? ifEnd - windowEnd : null;
  const ifResultColor = ifOverUnderMs === null ? '#888888' : ifOverUnderMs <= 5*60000 ? '#10b981' : ifOverUnderMs <= 45*60000 ? '#f59e0b' : '#ef4444';
  const ifResultLabel = ifOverUnderMs === null ? '' : ifOverUnderMs <= 5*60000 ? 'COMPLETE' : ifOverUnderMs <= 45*60000 ? `MISSED BY ${Math.round(ifOverUnderMs/60000)}M` : 'FAILED';

  const formatTime = (ms: number) => {
    if (ms <= 0) return '00:00:00';
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  };
  const formatHrMin = (ms: number) => {
    const h = Math.floor(Math.abs(ms) / 3600000);
    const m = Math.floor((Math.abs(ms) % 3600000) / 60000);
    return `${h}:${String(m).padStart(2,'0')} hrs`;
  };

  // ── Timers ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // ── Persist HealthKit to storage ────────────────────────────────────────────
  useEffect(() => {
    if (activeCalories > 0 || steps > 0) {
      AsyncStorage.getItem(`pj_${todayKey}`).then(saved => {
        const current = saved ? JSON.parse(saved) : {};
        AsyncStorage.setItem(`pj_${todayKey}`, JSON.stringify({
          ...current,
          ...(activeCalories > 0 ? { activeCalories } : {}),
          ...(steps > 0 ? { steps } : {}),
        }));
      });
    }
  }, [activeCalories, steps]);

  // ── Load layout from settings ────────────────────────────────────────────────
  useEffect(() => {
    const loadLayout = async () => {
      try {
        const s = await AsyncStorage.getItem('pj_settings');
        if (s) {
          const parsed = JSON.parse(s);
          if (parsed.cardOrder   && Array.isArray(parsed.cardOrder))   setCardOrder(parsed.cardOrder);
          if (parsed.cardVisible && typeof parsed.cardVisible === 'object') setCardVisible({ ...DEFAULT_VISIBLE, ...parsed.cardVisible });
        }
      } catch (e) {
        console.log('Layout load error', e);
      }
    };
    loadLayout();
  }, []);

  // ── Save layout ──────────────────────────────────────────────────────────────
  const saveLayout = async (order: CardId[], visible: Record<CardId, boolean>) => {
    try {
      const s = await AsyncStorage.getItem('pj_settings');
      const current = s ? JSON.parse(s) : {};
      await AsyncStorage.setItem('pj_settings', JSON.stringify({ ...current, cardOrder: order, cardVisible: visible }));
    } catch (e) {
      console.log('Layout save error', e);
    }
  };

  const toggleCardVisible = (id: CardId) => {
    const updated = { ...cardVisible, [id]: !cardVisible[id] };
    setCardVisible(updated);
    saveLayout(cardOrder, updated);
  };

  // ── Load daily data ──────────────────────────────────────────────────────────
  useEffect(() => {
    const loadData = async () => {
      try {
        const saved = await AsyncStorage.getItem(`pj_${todayKey}`);
        if (saved) {
          const data = JSON.parse(saved);
          if (data.water)         setWater(data.water);
          if (data.weight)        setWeight(data.weight);
          if (data.ifStart)       setIfStart(data.ifStart);
          if (data.ifMethod)      setIfMethod(data.ifMethod);
          if (data.ifEnd)         setIfEnd(data.ifEnd);
          if (data.ifCustomHours) setIfCustomHours(data.ifCustomHours);
          if (data.dailyNote)     setDailyNote(data.dailyNote);
          const yesterday = new Date(); yesterday.setDate(yesterday.getDate()-1);
          const yk = `${yesterday.getFullYear()}-${String(yesterday.getMonth()+1).padStart(2,'0')}-${String(yesterday.getDate()).padStart(2,'0')}`;
          const yd = await AsyncStorage.getItem(`pj_${yk}`);
          if (yd) { const ydp = JSON.parse(yd); if (ydp.weight) setYesterdayWeight(ydp.weight); }
          for (let i = 365; i >= 0; i--) {
            const d = new Date(); d.setDate(d.getDate()-i);
            const dk = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
            const ed = await AsyncStorage.getItem(`pj_${dk}`);
            if (ed) { const edp = JSON.parse(ed); if (edp.weight) { setEarliestWeight(edp.weight); break; } }
          }
        } else {
          const cloudData = await loadFromFirebase(todayKey);
          if (cloudData) {
            if (cloudData.water)    setWater(cloudData.water);
            if (cloudData.weight)   setWeight(cloudData.weight);
            if (cloudData.ifStart)  setIfStart(cloudData.ifStart);
            if (cloudData.dailyNote)setDailyNote(cloudData.dailyNote);
            await AsyncStorage.setItem(`pj_${todayKey}`, JSON.stringify(cloudData));
          }
        }
      } catch (e) {
        console.log('Load error', e);
      } finally {
        setLoaded(true);
        const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(),0,0).getTime()) / 86400000);
        setDailyVerse(VERSES[dayOfYear % VERSES.length]);
      }
    };
    loadData();
  }, []);

  // ── Auto-save daily ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!loaded) return;
    const save = async () => {
      try {
        const existing = await AsyncStorage.getItem(`pj_${todayKey}`);
        const current  = existing ? JSON.parse(existing) : {};
        await AsyncStorage.setItem(`pj_${todayKey}`, JSON.stringify({
          ...current, water, weight, ifStart, ifMethod, ifEnd, ifCustomHours, dailyNote,
        }));
      } catch (e) { console.log('Save error', e); }
    };
    save();
  }, [water, weight, ifStart, dailyNote, loaded]);

  // ── Focus sync ───────────────────────────────────────────────────────────────
  useFocusEffect(useCallback(() => {
    const loadCals = async () => {
      try {
        const saved = await AsyncStorage.getItem(`pj_${todayKey}`);
        if (saved) {
          const data = JSON.parse(saved);
          if (data.entries && Array.isArray(data.entries)) {
            setTotalCals(data.entries.reduce((s: number, e: any) => s + e.cal, 0));
            setTotalProtein(Math.round(data.entries.reduce((s: number, e: any) => s + (e.protein||0), 0) * 10) / 10);
            setTotalCarbs(  Math.round(data.entries.reduce((s: number, e: any) => s + (e.carbs  ||0), 0) * 10) / 10);
            setTotalFat(    Math.round(data.entries.reduce((s: number, e: any) => s + (e.fat    ||0), 0) * 10) / 10);
          }
          setCaloriesBurned(parseInt(data.caloriesBurned)||0);
          if (data.sleepOverride) setSleepOverride(data.sleepOverride);
          if (data.sleepBedTime)  setSleepStoredBed(data.sleepBedTime);
          if (data.sleepWakeTime) setSleepStoredWake(data.sleepWakeTime);
          if (typeof data.water === 'number') setWater(data.water);
        }
        const profileData = await AsyncStorage.getItem('pj_profile');
        if (profileData) {
          const p = JSON.parse(profileData);
          if (p.waterPresets)                    setWaterPresets(p.waterPresets);
          if (p.stepGoal && parseInt(p.stepGoal) > 0) setStepGoal(parseInt(p.stepGoal));
          if (p.calTarget && parseInt(p.calTarget) > 0) {
            setCalTarget(parseInt(p.calTarget));
          } else if (p.activityLevel && p.weightGoal) {
            const ACTIVITY_MULTIPLIERS: Record<string,number> = {
              sedentary:1.2, light:1.375, moderate:1.55, active:1.725, very_active:1.9,
            };
            const GOAL_DEFICITS: Record<string,number> = {
              lose_2:-1000, lose_1_5:-750, lose_1:-500, lose_0_5:-250, maintain:0, gain_0_5:250, gain_1:500,
            };
            const dayData = await AsyncStorage.getItem(`pj_${todayKey}`);
            const w = dayData ? JSON.parse(dayData)?.weight : null;
            if (w && p.birthday && p.heightFt && p.heightIn) {
              const wKg  = w * 0.453592;
              const hCm  = (parseFloat(p.heightFt)*30.48) + (parseFloat(p.heightIn)*2.54);
              const age  = Math.floor((Date.now() - new Date(p.birthday).getTime()) / (365.25*24*3600*1000));
              const bmr  = p.sex === 'male' ? Math.round((10*wKg)+(6.25*hCm)-(5*age)+5) : Math.round((10*wKg)+(6.25*hCm)-(5*age)-161);
              const tdee = Math.round(bmr * (ACTIVITY_MULTIPLIERS[p.activityLevel]||1.55));
              setCalTarget(tdee + (GOAL_DEFICITS[p.weightGoal]??-500));
            }
          }
        }
      } catch (e) { console.log('Cal sync error', e); }
    };
    loadCals();
  }, []));

  // ── Weight log ───────────────────────────────────────────────────────────────
  const logWeight = () => {
    const val = parseFloat(weightInput);
    if (!val || val <= 0) return;
    setWeight(val);
    setWeightInput('');
    saveToFirebase(todayKey, 'weight', val);
  };

  // ── Edit mode ────────────────────────────────────────────────────────────────
  const enterEditMode = () => {
    setEditMode(true);
    editSheetAnim.setValue(0);
    Animated.spring(editSheetAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 65,
      friction: 14,
    }).start();
  };

  const exitEditMode = () => {
    Animated.timing(editSheetAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setEditMode(false);
      setShowCardSheet(false);
    });
  };

  const openCardSheet = () => {
    setShowCardSheet(true);
    Animated.spring(sheetAnim, { toValue: 1, useNativeDriver: true, tension: 65, friction: 11 }).start();
  };
  const closeCardSheet = () => {
    Animated.timing(sheetAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => setShowCardSheet(false));
  };

  const sheetTranslate = sheetAnim.interpolate({ inputRange: [0,1], outputRange: [600, 0] });

  // ── Toast helper ─────────────────────────────────────────────────────────────
  const showToast = () => {
    setShowRefreshToast(true);
    toastOpacity.setValue(1);
    Animated.sequence([
      Animated.delay(1500),
      Animated.timing(toastOpacity, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start(() => setShowRefreshToast(false));
  };

  // ─── Card Renderers ───────────────────────────────────────────────────────────
  const renderVerseCard = () => (
    <View style={styles.verseCard}>
      <Text style={styles.verseLabel}>TODAY'S VERSE</Text>
      <Text style={styles.verseText}>"{dailyVerse?.text}"</Text>
      <Text style={styles.verseRef}>{dailyVerse?.reference}</Text>
    </View>
  );

  const renderIFCard = () => (
    <View style={styles.card}>
      <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
        <Text style={[styles.cardLabel,{marginBottom:0}]}>Intermittent Fast · {ifMethod}</Text>
        {ifStart && (
          <View style={{ backgroundColor: ifEnd ? `${ifResultColor}22` : isOpen ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', borderWidth:1, borderColor: ifEnd ? `${ifResultColor}55` : isOpen ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)', borderRadius:5, paddingHorizontal:8, paddingVertical:3 }}>
            <Text style={{ fontSize:10, fontFamily:'DMSans_700Bold', letterSpacing:2, color: ifEnd ? ifResultColor : isOpen ? '#10b981' : '#ef4444' }}>
              {ifEnd ? ifResultLabel : isOpen ? 'OPEN' : 'CLOSED'}
            </Text>
          </View>
        )}
      </View>
      <View style={{ flexDirection:'row', gap:5, marginBottom:12, flexWrap:'wrap' }}>
        {Object.keys(IF_METHODS).map(m => (
          <TouchableOpacity key={m} onPress={() => { setIfMethod(m); saveToFirebase(todayKey,'ifMethod',m); }}
            style={{ paddingHorizontal:10, paddingVertical:5, borderRadius:6, backgroundColor: ifMethod===m ? 'rgba(59,130,246,0.2)' : '#13131e', borderWidth:1, borderColor: ifMethod===m ? 'rgba(59,130,246,0.5)' : 'rgba(255,255,255,0.1)' }}>
            <Text style={{ fontSize:11, fontFamily:'DMSans_600SemiBold', color: ifMethod===m ? '#3b82f6' : '#7070a0' }}>{m}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {ifMethod === 'Custom' && (
        <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginBottom:12 }}>
          <Text style={{ fontSize:12, color:'#888888', fontFamily:'DMSans_400Regular' }}>Eating window:</Text>
          <TextInput style={{ backgroundColor:'#1e1e1e', borderWidth:1, borderColor:'#2a2a2a', borderRadius:6, color:'#ffffff', padding:6, fontSize:14, fontFamily:'DMSans_600SemiBold', width:50, textAlign:'center' }}
            value={ifCustomHours} onChangeText={v => setIfCustomHours(v)} keyboardType="number-pad" maxLength={2} />
          <Text style={{ fontSize:12, color:'#888888', fontFamily:'DMSans_400Regular' }}>hrs</Text>
        </View>
      )}
      {!ifStart ? (
        <PressableButton style={styles.ifStartBtn} onPress={() => { setIfStart(Date.now()); setIfEnd(null); }} flex={0}>
          <Text style={styles.ifStartBtnText}>TAP WHEN YOU EAT YOUR FIRST MEAL</Text>
        </PressableButton>
      ) : ifEnd ? (
        <View>
          <View style={{ backgroundColor:`${ifResultColor}11`, borderWidth:1, borderColor:`${ifResultColor}33`, borderRadius:8, padding:12, marginBottom:10 }}>
            <View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:6 }}>
              <Text style={{ fontSize:11, color:'#888888', fontFamily:'DMSans_400Regular' }}>Target</Text>
              <Text style={{ fontSize:13, color:ifResultColor, fontFamily:'DMSans_600SemiBold' }}>{formatHrMin(ifTargetMs)}</Text>
            </View>
            <View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:6 }}>
              <Text style={{ fontSize:11, color:'#888888', fontFamily:'DMSans_400Regular' }}>Actual</Text>
              <Text style={{ fontSize:13, color:'#e8e8f0', fontFamily:'DMSans_600SemiBold' }}>{ifActualMs ? formatHrMin(ifActualMs) : '--'}</Text>
            </View>
            <View style={{ flexDirection:'row', justifyContent:'space-between' }}>
              <Text style={{ fontSize:11, color:'#888888', fontFamily:'DMSans_400Regular' }}>Window</Text>
              <Text style={{ fontSize:11, color:'#888888', fontFamily:'DMSans_400Regular' }}>
                {new Date(ifStart).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})} → {new Date(ifEnd).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection:'row', gap:16, marginTop:4 }}>
            <TouchableOpacity onPress={() => setShowTimePicker(true)}><Text style={styles.ifReset}>Edit start</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setShowEndTimePicker(true)}><Text style={styles.ifReset}>Edit end</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => { setIfStart(null); setIfEnd(null); saveToFirebase(todayKey,'ifStart',null); saveToFirebase(todayKey,'ifEnd',null); }}>
              <Text style={[styles.ifReset,{color:'#ef4444'}]}>Reset</Text>
            </TouchableOpacity>
          </View>
          {showEndTimePicker && (
            <View>
              <View style={{ flexDirection:'row', justifyContent:'space-between', marginTop:8 }}>
                <TouchableOpacity onPress={() => setShowEndTimePicker(false)}><Text style={{ color:'#999999', fontSize:12, fontFamily:'DMSans_500Medium' }}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => { setShowEndTimePicker(false); if (pickerTime) { const now=new Date(); pickerTime.setFullYear(now.getFullYear(),now.getMonth(),now.getDate()); const ne=pickerTime.getTime(); setIfEnd(ne); saveToFirebase(todayKey,'ifEnd',ne); } }}>
                  <Text style={{ color:'#10b981', fontSize:12, fontFamily:'DMSans_600SemiBold' }}>Confirm</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker mode="time" value={pickerTime||(ifEnd ? new Date(ifEnd) : new Date())} display="spinner" textColor="#ffffff" onChange={(_,d)=>{ if(d) setPrickerTime(d); }} />
            </View>
          )}
        </View>
      ) : (
        <View>
          <View style={styles.ifRow}>
            <View style={{ flex:1 }}>
              <Text style={[styles.ifLabel,{marginBottom:4}]}>{isOpen ? 'Window closes in' : 'Window closed'}</Text>
              <Text style={styles.ifCountdown} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                {remaining ? formatTime(remaining) : 'CLOSED'}
              </Text>
            </View>
            <View style={{ alignItems:'flex-end', justifyContent:'flex-end', paddingLeft:12 }}>
              <View style={{ alignItems:'flex-end', gap:6 }}>
                <View style={{ alignItems:'flex-end' }}>
                  <Text style={{ fontSize:9, color:'#999999', fontFamily:'DMSans_500Medium', letterSpacing:1, textTransform:'uppercase' }}>Started</Text>
                  <Text style={{ fontSize:16, color:'#a0a0b8', fontFamily:'BebasNeue_400Regular', letterSpacing:1 }}>
                    {new Date(ifStart).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}
                  </Text>
                </View>
                {windowEnd && (
                  <View style={{ alignItems:'flex-end' }}>
                    <Text style={{ fontSize:9, color:'#999999', fontFamily:'DMSans_500Medium', letterSpacing:1, textTransform:'uppercase' }}>Closes</Text>
                    <Text style={{ fontSize:16, color:'#a0a0b8', fontFamily:'BebasNeue_400Regular', letterSpacing:1 }}>
                      {new Date(windowEnd).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}
                    </Text>
                  </View>
                )}
                <TouchableOpacity onPress={() => { const end=Date.now(); setIfEnd(end); saveToFirebase(todayKey,'ifEnd',end); }}
                  style={{ backgroundColor:'rgba(239,68,68,0.15)', borderWidth:1, borderColor:'rgba(239,68,68,0.3)', borderRadius:6, paddingHorizontal:10, paddingVertical:5 }}>
                  <Text style={{ color:'#ef4444', fontSize:12, fontFamily:'DMSans_600SemiBold' }}>Last Meal</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
          <View style={{ flexDirection:'row', gap:16, marginTop:8 }}>
            <TouchableOpacity onPress={() => setShowTimePicker(true)}><Text style={styles.ifReset}>Reset window</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => { setIfStart(null); setIfEnd(null); saveToFirebase(todayKey,'ifStart',null); }}>
              <Text style={[styles.ifReset,{color:'#ef4444'}]}>Cancel fast</Text>
            </TouchableOpacity>
          </View>
          {showTimePicker && (
            <View>
              <View style={{ flexDirection:'row', justifyContent:'space-between', marginTop:8 }}>
                <TouchableOpacity onPress={() => setShowTimePicker(false)}><Text style={{ color:'#999999', fontSize:12, fontFamily:'DMSans_500Medium' }}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => { setShowTimePicker(false); if(pickerTime){ const now=new Date(); pickerTime.setFullYear(now.getFullYear(),now.getMonth(),now.getDate()); setIfStart(pickerTime.getTime()); saveToFirebase(todayKey,'ifStart',pickerTime.getTime()); } }}>
                  <Text style={{ color:'#10b981', fontSize:12, fontFamily:'DMSans_600SemiBold' }}>Confirm</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker mode="time" value={pickerTime||(ifStart ? new Date(ifStart) : new Date())} display="spinner" textColor="#ffffff" onChange={(_,d)=>{ if(d) setPrickerTime(d); }} />
            </View>
          )}
        </View>
      )}
    </View>
  );

  const renderCaloriesCard = () => (
    <View style={styles.card}>
      <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
        <Text style={styles.cardLabel}>Calories Today</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/log')} activeOpacity={0.6}
          style={{ backgroundColor:'rgba(59,130,246,0.15)', borderWidth:1, borderColor:'rgba(59,130,246,0.3)', borderRadius:6, paddingHorizontal:10, paddingVertical:4 }}>
          <Text style={{ color:'#3b82f6', fontSize:12, fontFamily:'DMSans_600SemiBold' }}>+ Log</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.calRow}>
        <Text style={[styles.calNumber,{color:calColor}]}>{totalCals}</Text>
        <Text style={styles.calTarget}>/ {adjustedTarget} kcal</Text>
      </View>
      <AnimatedProgressBar pct={calPct} color={calColor} refreshKey={refreshKey} />
      <Text style={[styles.calRemaining,{color:'#666680',fontFamily:'DMSans_700Bold',fontSize:10,letterSpacing:1.5,textTransform:'uppercase'}]}>
        {(() => { const diff = adjustedTarget - totalCals; return diff > 0 ? `${diff} kcal remaining · ${displayedBurned} burned` : `${Math.abs(diff)} kcal over · ${displayedBurned} burned`; })()}
      </Text>
    </View>
  );

  const renderMacrosCard = () => {
    const macroGoals = { protein: 150, carbs: 200, fat: 65 }; // TODO: wire to pj_profile macro goals
    const macros = [
      { label: 'Protein', val: totalProtein, goal: macroGoals.protein, color: '#0d9268' },
      { label: 'Carbs',   val: totalCarbs,   goal: macroGoals.carbs,   color: '#c47d1a' },
      { label: 'Fat',     val: totalFat,     goal: macroGoals.fat,     color: '#a83232' },
    ];
    return (
      <View style={styles.card}>
        <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <Text style={[styles.cardLabel, { marginBottom:0 }]}>Macros Today</Text>
          <Text style={{ fontSize:9, color:'#444466', fontFamily:'DMSans_700Bold', letterSpacing:1.5, textTransform:'uppercase' }}>vs goal</Text>
        </View>
        <View style={{ gap:7 }}>
          {macros.map(m => {
            const pct = m.goal > 0 ? Math.min((m.val / m.goal) * 100, 100) : 0;
            const over = m.goal > 0 && m.val > m.goal;
            return (
              <View key={m.label}>
                <View style={{ flexDirection:'row', alignItems:'baseline', justifyContent:'space-between', marginBottom:4 }}>
                  <Text style={{ fontSize:11, color:'#666680', fontFamily:'DMSans_700Bold', letterSpacing:2, textTransform:'uppercase', flex:1 }}>{m.label}</Text>
                  <View style={{ flexDirection:'row', alignItems:'baseline', gap:4, width:120, justifyContent:'flex-end' }}>
                    <Text style={{ fontSize:20, color: over ? '#a83232' : m.color, fontFamily:'BebasNeue_400Regular', letterSpacing:1, textAlign:'right' }}>{m.val}</Text>
                    <Text style={{ fontSize:11, color: over ? '#a83232' : m.color, fontFamily:'DMSans_500Medium' }}>g</Text>
                    <Text style={{ fontSize:11, color:'#555570', fontFamily:'DMSans_500Medium' }}>/ {m.goal} g</Text>
                  </View>
                </View>
                <MacroBar val={m.val} goal={m.goal} color={over ? '#a83232' : m.color} />
                <Text style={{ fontSize:9, color: over ? '#a83232' : m.color, fontFamily:'DMSans_500Medium', letterSpacing:0.5, marginTop:3, opacity:0.7 }}>
                  {over ? `${Math.round(m.val - m.goal)} g over` : `${Math.round(m.goal - m.val)} g remaining`}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderWaterCard = () => (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>Water · {water}oz / {WATER_TARGET}oz</Text>
      <AnimatedProgressBar pct={Math.min(100,(water/WATER_TARGET)*100)} color="#3b82f6" refreshKey={refreshKey} />
      <View style={styles.waterBtns}>
        {waterPresets.map((oz,i) => (
          <PressableButton key={i} style={styles.waterBtn} onPress={() => { const n=Math.min(WATER_TARGET,water+oz); setWater(n); saveToFirebase(todayKey,'water',n); }}>
            <Text style={styles.waterBtnText}>+{oz} oz</Text>
          </PressableButton>
        ))}
        <PressableButton style={styles.waterBtn} onPress={() => { setWaterCustomSign('add'); setWaterCustomInput(''); setShowWaterCustomModal(true); }}>
          <View style={{ alignItems:'center', justifyContent:'center', width:20, height:20 }}>
            <Ionicons name="water-outline" size={18} color="#3b82f6" />
            <Text style={{ color:'#3b82f6', fontSize:9, fontFamily:'DMSans_700Bold', position:'absolute', bottom:-2, right:-4 }}>+</Text>
          </View>
        </PressableButton>
      </View>
      <View style={[styles.waterBtns,{marginTop:8}]}>
        {waterPresets.map((oz,i) => (
          <PressableButton key={i} style={styles.waterBtnRed} onPress={() => { const n=Math.max(0,water-oz); setWater(n); saveToFirebase(todayKey,'water',n); }}>
            <Text style={styles.waterBtnRedText}>-{oz} oz</Text>
          </PressableButton>
        ))}
        <PressableButton style={styles.waterBtnRed} onPress={() => { setWaterCustomSign('subtract'); setWaterCustomInput(''); setShowWaterCustomModal(true); }}>
          <View style={{ alignItems:'center', justifyContent:'center', width:20, height:20 }}>
            <Ionicons name="water-outline" size={18} color="#cc3333" />
            <Text style={{ color:'#cc3333', fontSize:9, fontFamily:'DMSans_700Bold', position:'absolute', bottom:-2, right:-4 }}>-</Text>
          </View>
        </PressableButton>
      </View>
    </View>
  );

  const renderWeightCard = () => (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>Weight</Text>
      <View style={styles.weightRow}>
        <View style={styles.weightStat}>
          <Text style={styles.weightVal}>{weight ? `${weight} lbs` : '--'}</Text>
          <Text style={styles.weightLbl}>Today</Text>
        </View>
        <View style={styles.weightStat}>
          <Text style={[styles.weightVal,{color: weight&&yesterdayWeight ? weight<yesterdayWeight?'#10b981':weight>yesterdayWeight?'#cc3333':'#e8e8f0' : '#e8e8f0'}]}>
            {weight&&yesterdayWeight ? `${weight>yesterdayWeight?'+':''}${Math.round((weight-yesterdayWeight)*10)/10}` : '--'}
          </Text>
          <Text style={styles.weightLbl}>vs Yesterday</Text>
        </View>
        <View style={styles.weightStat}>
          <Text style={[styles.weightVal,{color: weight&&earliestWeight ? earliestWeight-weight>0?'#10b981':earliestWeight-weight<0?'#cc3333':'#e8e8f0' : '#e8e8f0'}]}>
            {weight&&earliestWeight ? `${Math.round((earliestWeight-weight)*10)/10} lbs` : '--'}
          </Text>
          <Text style={styles.weightLbl}>Total Lost</Text>
        </View>
      </View>
      <View style={styles.weightAdd}>
        <TextInput style={styles.weightInput} placeholder="Enter weight (lbs)" placeholderTextColor="#555555"
          keyboardType="decimal-pad" value={weightInput} onChangeText={setWeightInput} />
        <PressableButton style={styles.logBtn} onPress={logWeight}>
          <Text style={styles.logBtnText}>LOG</Text>
        </PressableButton>
      </View>
    </View>
  );

  const renderWorkoutCard = () => (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>Today's Workout</Text>
      <View style={styles.workoutRow}>
        <View>
          <Text style={styles.workoutDay}>{todayDay} — {todayProgram?.focus || 'Rest'}</Text>
          <Text style={[styles.workoutMuscles,{color:'#666680',fontFamily:'DMSans_700Bold',fontSize:9,letterSpacing:2,textTransform:'uppercase'}]}>
            {isLift ? todayProgram.muscles : '60 min · 3.5mph · 5-6% incline'}
          </Text>
        </View>
        <View style={[styles.workoutPill,{backgroundColor:dayColor+'22',borderColor:dayColor+'44'}]}>
          <Text style={[styles.workoutPillText,{color:dayColor}]}>{todayProgram?.type?.toUpperCase()||'REST'}</Text>
        </View>
      </View>
    </View>
  );

  const renderStepsCard = () => {
    const pct = stepGoal > 0 ? steps / stepGoal : 0;
    const stepColor = pct >= 1 ? '#10b981' : pct >= 0.7 ? '#f59e0b' : '#ef4444';
    return (
      <View style={styles.card}>
        <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
          <Text style={[styles.cardLabel,{marginBottom:0}]}>Steps Today</Text>
          <TouchableOpacity onPress={() => setEditingStepGoal(true)}
            style={{ backgroundColor:'rgba(59,130,246,0.15)', borderWidth:1, borderColor:'rgba(59,130,246,0.3)', borderRadius:6, paddingHorizontal:10, paddingVertical:4 }}>
            <Text style={{ color:'#3b82f6', fontSize:12, fontFamily:'DMSans_600SemiBold' }}>Goal: {stepGoal.toLocaleString()}</Text>
          </TouchableOpacity>
        </View>
        {editingStepGoal && (
          <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginBottom:10 }}>
            <TextInput style={{ flex:1, backgroundColor:'#1e1e1e', borderWidth:1, borderColor:'#2a2a2a', borderRadius:6, color:'#ffffff', padding:8, fontSize:14, fontFamily:'DMSans_400Regular' }}
              value={String(stepGoal)} onChangeText={v => setStepGoal(parseInt(v)||0)} keyboardType="number-pad" autoFocus />
            <TouchableOpacity onPress={async () => {
              setEditingStepGoal(false);
              const saved = await AsyncStorage.getItem('pj_profile');
              const p = saved ? JSON.parse(saved) : {};
              await AsyncStorage.setItem('pj_profile', JSON.stringify({...p, stepGoal: String(stepGoal)}));
              await saveToFirebase('profile','data',{...p, stepGoal: String(stepGoal)});
            }} style={{ backgroundColor:'#10b981', borderRadius:6, paddingHorizontal:12, paddingVertical:8 }}>
              <Text style={{ color:'#000000', fontSize:13, fontFamily:'DMSans_600SemiBold' }}>Save</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={{ flexDirection:'row', alignItems:'baseline', gap:6, marginBottom:6 }}>
          <Text style={{ fontSize:36, color:stepColor, fontFamily:'BebasNeue_400Regular', letterSpacing:1 }}>{steps.toLocaleString()}</Text>
          <Text style={{ fontSize:13, color:'#888888', fontFamily:'DMSans_400Regular' }}>/ {stepGoal.toLocaleString()} steps</Text>
        </View>
        <View style={{ marginBottom:8 }}>
          <AnimatedProgressBar pct={Math.min(pct*100,100)} color={stepColor} refreshKey={refreshKey} />
        </View>
        <Text style={{ fontSize:9, color:'#666680', fontFamily:'DMSans_700Bold', letterSpacing:2, textTransform:'uppercase' }}>{distance} mi walked today</Text>
      </View>
    );
  };

  const renderSleepCard = () => {
    const displaySleep = sleepOverride ?? sleepHours;
    return (
      <View style={styles.card}>
        <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
          <Text style={[styles.cardLabel,{marginBottom:0}]}>Sleep Last Night</Text>
          <TouchableOpacity onPress={() => setEditingSleep(!editingSleep)}
            style={{ backgroundColor:'rgba(59,130,246,0.15)', borderWidth:1, borderColor:'rgba(59,130,246,0.3)', borderRadius:6, paddingHorizontal:10, paddingVertical:4 }}>
            <Text style={{ color:'#3b82f6', fontSize:12, fontFamily:'DMSans_600SemiBold' }}>{sleepOverride ? 'Edited' : 'Edit'}</Text>
          </TouchableOpacity>
        </View>
        {editingSleep && (
          <View style={{ marginBottom:10 }}>
            <View style={{ flexDirection:'row', gap:8, marginBottom:8 }}>
              <TouchableOpacity onPress={() => setShowBedTimePicker(true)} style={{ flex:1, backgroundColor:'#1e1e1e', borderWidth:1, borderColor:'#2a2a2a', borderRadius:6, padding:10, alignItems:'center' }}>
                <Text style={{ fontSize:10, color:'#888888', fontFamily:'DMSans_400Regular', marginBottom:2 }}>Bed Time</Text>
                <Text style={{ fontSize:16, color: sleepBedTime ? '#ffffff' : '#444444', fontFamily:'DMSans_600SemiBold' }}>
                  {sleepBedTime ? sleepBedTime.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : 'Tap to set'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowWakeTimePicker(true)} style={{ flex:1, backgroundColor:'#1e1e1e', borderWidth:1, borderColor:'#2a2a2a', borderRadius:6, padding:10, alignItems:'center' }}>
                <Text style={{ fontSize:10, color:'#888888', fontFamily:'DMSans_400Regular', marginBottom:2 }}>Wake Time</Text>
                <Text style={{ fontSize:16, color: sleepWakeTime ? '#ffffff' : '#444444', fontFamily:'DMSans_600SemiBold' }}>
                  {sleepWakeTime ? sleepWakeTime.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : 'Tap to set'}
                </Text>
              </TouchableOpacity>
            </View>
            {sleepBedTime && sleepWakeTime && (
              <Text style={{ fontSize:12, color:'#888888', fontFamily:'DMSans_400Regular', textAlign:'center', marginBottom:8 }}>
                {(() => { let diff=sleepWakeTime.getTime()-sleepBedTime.getTime(); if(diff<0) diff+=24*3600000; return `${Math.round(diff/3600000*10)/10} hrs of sleep`; })()}
              </Text>
            )}
            {showBedTimePicker && (
              <View>
                <View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:8 }}>
                  <TouchableOpacity onPress={() => setShowBedTimePicker(false)}><Text style={{ color:'#999999', fontSize:12, fontFamily:'DMSans_500Medium' }}>Cancel</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => setShowBedTimePicker(false)}><Text style={{ color:'#10b981', fontSize:12, fontFamily:'DMSans_600SemiBold' }}>Confirm</Text></TouchableOpacity>
                </View>
                <DateTimePicker mode="time" value={sleepBedTime||new Date()} display="spinner" textColor="#ffffff" onChange={(_,d)=>{ if(d) setSleepBedTime(d); }} />
              </View>
            )}
            {showWakeTimePicker && (
              <View>
                <View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:8 }}>
                  <TouchableOpacity onPress={() => setShowWakeTimePicker(false)}><Text style={{ color:'#999999', fontSize:12, fontFamily:'DMSans_500Medium' }}>Cancel</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => setShowWakeTimePicker(false)}><Text style={{ color:'#10b981', fontSize:12, fontFamily:'DMSans_600SemiBold' }}>Confirm</Text></TouchableOpacity>
                </View>
                <DateTimePicker mode="time" value={sleepWakeTime||new Date()} display="spinner" textColor="#ffffff" onChange={(_,d)=>{ if(d) setSleepWakeTime(d); }} />
              </View>
            )}
            <View style={{ flexDirection:'row', gap:8 }}>
              <TouchableOpacity onPress={async () => {
                if(!sleepBedTime||!sleepWakeTime) return;
                let diff=sleepWakeTime.getTime()-sleepBedTime.getTime();
                if(diff<0) diff+=24*3600000;
                const val=Math.round(diff/3600000*10)/10;
                setSleepOverride(val);
                const saved=await AsyncStorage.getItem(`pj_${todayKey}`);
                const current=saved?JSON.parse(saved):{};
                const bedStr=sleepBedTime.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
                const wakeStr=sleepWakeTime.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
                await AsyncStorage.setItem(`pj_${todayKey}`,JSON.stringify({...current,sleepOverride:val,sleepBedTime:bedStr,sleepWakeTime:wakeStr}));
                await saveToFirebase(todayKey,'sleepOverride',val);
                setSleepStoredBed(bedStr); setSleepStoredWake(wakeStr); setEditingSleep(false);
              }} style={{ flex:1, backgroundColor:'#10b981', borderRadius:6, padding:10, alignItems:'center' }}>
                <Text style={{ color:'#000000', fontSize:13, fontFamily:'DMSans_600SemiBold' }}>Save</Text>
              </TouchableOpacity>
              {sleepOverride && (
                <TouchableOpacity onPress={async () => {
                  setSleepOverride(null);
                  const saved=await AsyncStorage.getItem(`pj_${todayKey}`);
                  const current=saved?JSON.parse(saved):{};
                  delete current.sleepOverride;
                  await AsyncStorage.setItem(`pj_${todayKey}`,JSON.stringify(current));
                  setEditingSleep(false);
                }} style={{ backgroundColor:'rgba(239,68,68,0.15)', borderWidth:1, borderColor:'rgba(239,68,68,0.3)', borderRadius:6, paddingHorizontal:16, alignItems:'center' }}>
                  <Text style={{ color:'#ef4444', fontSize:13, fontFamily:'DMSans_500Medium' }}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
        {displaySleep === null ? (
          <Text style={{ fontSize:13, color:'#444444', fontFamily:'DMSans_400Regular', fontStyle:'italic' }}>No sleep data for last night</Text>
        ) : (() => {
          const sleepColor = displaySleep>=7?'#10b981':displaySleep>=6?'#f59e0b':'#ef4444';
          const sleepLabel = displaySleep>=7?'Well rested':displaySleep>=6?'Could be better':'Need more sleep';
          const totalMs = sleepStages?.totalMs||(displaySleep*3600000);
          const coreMs  = sleepStages?.core||0;
          const deepMs  = sleepStages?.deep||0;
          const remMs   = sleepStages?.rem||0;
          const hrs     = Math.floor(displaySleep);
          const mins    = Math.round((displaySleep-hrs)*60);
          const corePct = totalMs>0?coreMs/totalMs:0;
          const deepPct = totalMs>0?deepMs/totalMs:0;
          const remPct  = totalMs>0?remMs/totalMs:0;
          const fmtMs   = (ms: number) => { const h=Math.floor(ms/3600000); const m=Math.round((ms%3600000)/60000); return h>0?`${h}h ${m}m`:`${m}m`; };
          const donutSize=140, donutStroke=16, donutRadius=(donutSize-donutStroke)/2;
          const donutCirc=2*Math.PI*donutRadius;
          const coreFrac=corePct*donutCirc, deepFrac=deepPct*donutCirc, remFrac=remPct*donutCirc;
          const gapFrac=0.03*donutCirc;
          return (
            <View style={{ flexDirection:'row', alignItems:'center' }}>
              <View style={{ width:160, paddingRight:12 }}>
                <Text style={{ fontSize:42, color:sleepColor, fontFamily:'BebasNeue_400Regular', letterSpacing:1 }}>{hrs}h {mins}m</Text>
                <Text style={{ fontSize:9, color:sleepColor, fontFamily:'DMSans_700Bold', letterSpacing:2, textTransform:'uppercase', marginBottom:10 }}>
                  {sleepLabel}{sleepOverride?' · manual':''}
                </Text>
                {((sleepStoredBed&&sleepStoredWake)||sleepTimes) ? (
                  <Text style={{ fontSize:12, color:'#666680', fontFamily:'DMSans_500Medium', marginBottom:10 }}>
                    {sleepStoredBed||sleepTimes?.bed} → {sleepStoredWake||sleepTimes?.wake}
                  </Text>
                ) : null}
                {sleepStages && (
                  <View style={{ gap:6 }}>
                    {[{label:'Core',color:'#60a5fa',val:coreMs},{label:'Deep',color:'#818cf8',val:deepMs},{label:'REM',color:'#34d399',val:remMs}].map(s => (
                      <View key={s.label} style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
                        <View style={{ width:8, height:8, borderRadius:4, backgroundColor:s.color }} />
                        <Text style={{ fontSize:9, color:'#666680', fontFamily:'DMSans_700Bold', letterSpacing:1, textTransform:'uppercase' }}>{s.label}</Text>
                        <Text style={{ fontSize:11, color:s.color, fontFamily:'DMSans_600SemiBold' }}>{fmtMs(s.val)}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
              {sleepStages && (
                <View>
                  <Svg width={donutSize} height={donutSize}>
                    <Circle cx={donutSize/2} cy={donutSize/2} r={donutRadius} stroke="#12121a" strokeWidth={donutStroke} fill="none" />
                    <Circle cx={donutSize/2} cy={donutSize/2} r={donutRadius} stroke="#60a5fa" strokeWidth={donutStroke} fill="none" strokeDasharray={`${Math.max(0,coreFrac-gapFrac)} ${donutCirc}`} strokeDashoffset={0} strokeLinecap="butt" rotation="-90" origin={`${donutSize/2},${donutSize/2}`} />
                    <Circle cx={donutSize/2} cy={donutSize/2} r={donutRadius} stroke="#818cf8" strokeWidth={donutStroke} fill="none" strokeDasharray={`${Math.max(0,deepFrac-gapFrac)} ${donutCirc}`} strokeDashoffset={-(coreFrac)} strokeLinecap="butt" rotation="-90" origin={`${donutSize/2},${donutSize/2}`} />
                    <Circle cx={donutSize/2} cy={donutSize/2} r={donutRadius} stroke="#34d399" strokeWidth={donutStroke} fill="none" strokeDasharray={`${Math.max(0,remFrac-gapFrac)} ${donutCirc}`} strokeDashoffset={-(coreFrac+deepFrac)} strokeLinecap="butt" rotation="-90" origin={`${donutSize/2},${donutSize/2}`} />
                  </Svg>
                  <View style={{ position:'absolute', top:0, left:0, width:donutSize, height:donutSize, alignItems:'center', justifyContent:'center' }}>
                    <Ionicons name="moon" size={24} color="#666680" />
                  </View>
                </View>
              )}
            </View>
          );
        })()}
      </View>
    );
  };

  const renderFitnessMetricsCard = () => (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>Fitness Metrics</Text>
      {(vo2Max === null && cardioRecovery === null) ? (
        <View style={{ alignItems:'center', paddingVertical:16, gap:6 }}>
          <Ionicons name="fitness-outline" size={28} color="#2a2a3a" />
          <Text style={{ fontSize:12, color:'#444466', fontFamily:'DMSans_400Regular', fontStyle:'italic' }}>No fitness data available</Text>
          <Text style={{ fontSize:10, color:'#333355', fontFamily:'DMSans_400Regular', textAlign:'center' }}>VO2 Max & Cardio Recovery sync from Apple Health</Text>
        </View>
      ) : (
        <View style={{ flexDirection:'row', gap:8 }}>
          {vo2Max !== null && (
            <View style={{ flex:1, backgroundColor:'#1e1e1e', borderRadius:8, padding:12, alignItems:'center' }}>
              <Text style={{ fontSize:28, color:'#3b82f6', fontFamily:'BebasNeue_400Regular', letterSpacing:1 }}>{vo2Max}</Text>
              <Text style={{ fontSize:10, color:'#888888', fontFamily:'DMSans_500Medium', textTransform:'uppercase', letterSpacing:1, marginTop:2 }}>VO2 Max</Text>
              <Text style={{ fontSize:9, color:'#555555', fontFamily:'DMSans_400Regular', marginTop:2 }}>ml/kg/min</Text>
            </View>
          )}
          {cardioRecovery !== null && (
            <View style={{ flex:1, backgroundColor:'#1e1e1e', borderRadius:8, padding:12, alignItems:'center' }}>
              <Text style={{ fontSize:28, color:'#10b981', fontFamily:'BebasNeue_400Regular', letterSpacing:1 }}>{cardioRecovery}</Text>
              <Text style={{ fontSize:10, color:'#888888', fontFamily:'DMSans_500Medium', textTransform:'uppercase', letterSpacing:1, marginTop:2 }}>Cardio Recovery</Text>
              <Text style={{ fontSize:9, color:'#555555', fontFamily:'DMSans_400Regular', marginTop:2 }}>bpm drop / 1min</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );

  const renderDailyNoteCard = () => (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>Daily Note</Text>
      <TextInput style={styles.notesInput} placeholder="How did today go? Workout, diet, energy..." placeholderTextColor="#333333"
        multiline numberOfLines={4} value={dailyNote} onChangeText={setDailyNote} />
      <TouchableOpacity style={styles.saveBtn} onPress={() => {}}>
        <Text style={styles.saveBtnText}>Save Note</Text>
      </TouchableOpacity>
    </View>
  );

  const renderCardById = (id: CardId) => {
    switch (id) {
      case 'verse':           return renderVerseCard();
      case 'if':              return renderIFCard();
      case 'calories':        return renderCaloriesCard();
      case 'macros':          return renderMacrosCard();
      case 'water':           return renderWaterCard();
      case 'weight':          return renderWeightCard();
      case 'workout':         return renderWorkoutCard();
      case 'steps':           return renderStepsCard();
      case 'sleep':           return renderSleepCard();
      case 'fitness_metrics': return renderFitnessMetricsCard();
      case 'daily_note':      return renderDailyNoteCard();
      default:                return null;
    }
  };

  // ── Visible ordered cards for normal mode ────────────────────────────────────
  const visibleCards = cardOrder.filter(id => cardVisible[id]);

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={{ flex:1 }}>
          <Text style={styles.headerLabel}>PROJECT J</Text>
          <Text style={styles.headerTitle}>
            {(() => { const h=new Date().getHours(); return h<12?'Good morning':h<17?'Good afternoon':'Good evening'; })()}
          </Text>
          <Text style={{ fontSize:9, color:'#666680', fontFamily:'DMSans_700Bold', marginTop:1, letterSpacing:2, textTransform:'uppercase' }}>
            {new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}
          </Text>
        </View>

        <View style={{ flexDirection:'row', gap:8 }}>
            <TouchableOpacity onPress={() => { fetchTodayData(); setRefreshKey(k=>k+1); showToast(); }}
              style={styles.headerBtn}>
              <Ionicons name="refresh-outline" size={14} color="#3b82f6" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push({ pathname:'/day-detail', params:{ date:todayKey } })}
              style={styles.headerBtn}>
              <Ionicons name="calendar-outline" size={14} color="#3b82f6" />
            </TouchableOpacity>
            <TouchableOpacity onPress={enterEditMode} style={styles.headerBtn}>
              <Ionicons name="grid-outline" size={14} color="#3b82f6" />
            </TouchableOpacity>
          </View>
      </View>

      {/* ── Water custom modal ── */}
      {showWaterCustomModal && (
        <View style={{ position:'absolute', top:0, bottom:0, left:0, right:0, backgroundColor:'rgba(0,0,0,0.6)', justifyContent:'center', alignItems:'center', zIndex:999 }}>
          <View style={{ backgroundColor:'#1a1a24', borderRadius:14, padding:24, width:'80%', borderWidth:0.5, borderColor:'rgba(255,255,255,0.1)' }}>
            <Text style={{ fontSize:9, color:'#666680', fontFamily:'DMSans_700Bold', letterSpacing:2, textTransform:'uppercase', marginBottom:12 }}>
              {waterCustomSign==='add' ? 'Add Custom Amount' : 'Remove Custom Amount'}
            </Text>
            <TextInput style={{ backgroundColor:'#13131e', borderWidth:0.5, borderColor:'rgba(255,255,255,0.08)', borderRadius:8, color:'#e8e8f0', padding:12, fontSize:24, fontFamily:'BebasNeue_400Regular', textAlign:'center', marginBottom:16 }}
              value={waterCustomInput} onChangeText={setWaterCustomInput} keyboardType="number-pad" placeholder="0" placeholderTextColor="#444" autoFocus />
            <Text style={{ fontSize:9, color:'#666680', fontFamily:'DMSans_700Bold', letterSpacing:1, textTransform:'uppercase', textAlign:'center', marginBottom:16 }}>oz</Text>
            <View style={{ flexDirection:'row', gap:10 }}>
              <TouchableOpacity style={{ flex:1, padding:12, borderRadius:8, backgroundColor:'#13131e', alignItems:'center' }} onPress={() => setShowWaterCustomModal(false)}>
                <Text style={{ color:'#666680', fontFamily:'DMSans_600SemiBold', fontSize:14 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flex:1, padding:12, borderRadius:8, backgroundColor: waterCustomSign==='add'?'rgba(59,130,246,0.2)':'rgba(204,51,51,0.2)', alignItems:'center' }}
                onPress={() => {
                  const amt=parseInt(waterCustomInput);
                  if(amt>0){ const n=waterCustomSign==='add'?Math.min(WATER_TARGET,water+amt):Math.max(0,water-amt); setWater(n); saveToFirebase(todayKey,'water',n); }
                  setShowWaterCustomModal(false);
                }}>
                <Text style={{ color: waterCustomSign==='add'?'#3b82f6':'#cc3333', fontFamily:'DMSans_600SemiBold', fontSize:14 }}>
                  {waterCustomSign==='add'?'Add':'Remove'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* ── Refresh toast ── */}
      {showRefreshToast && (
        <Animated.View style={{ position:'absolute', bottom:100, left:0, right:0, alignItems:'center', zIndex:999, opacity:toastOpacity }}>
          <View style={{ backgroundColor:'#1a1a24', borderWidth:0.5, borderColor:'rgba(255,255,255,0.12)', borderRadius:8, paddingHorizontal:16, paddingVertical:10, flexDirection:'row', alignItems:'center', gap:10 }}>
            <Text style={{ color:'#e8e8f0', fontSize:12, fontFamily:'DMSans_600SemiBold', letterSpacing:1 }}>Apple Health Refreshed</Text>
            <TouchableOpacity onPress={() => { toastOpacity.setValue(0); setShowRefreshToast(false); }}>
              <Ionicons name="close" size={14} color="#666680" />
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* ── Main content ── */}
      <ScrollView contentContainerStyle={{ padding:16, paddingBottom:80 }}>
        {visibleCards.map((id) => (
          <View key={id}>
            {renderCardById(id)}
          </View>
        ))}
      </ScrollView>

      {editMode && (
        <Modal transparent animationType="none" visible={editMode} onRequestClose={exitEditMode}>
          <Animated.View style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            opacity: editSheetAnim,
          }}>
            <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={exitEditMode} />
          </Animated.View>
          <Animated.View style={[styles.editSheet, {
            transform: [{ translateY: editSheetAnim.interpolate({ inputRange: [0,1], outputRange: [700, 0] }) }],
          }]}>
            <View style={styles.editSheetHandle} />
            <View style={styles.editSheetHeader}>
              <TouchableOpacity onPress={openCardSheet}
                style={{ backgroundColor:'rgba(59,130,246,0.15)', borderWidth:1, borderColor:'rgba(59,130,246,0.3)', borderRadius:6, paddingHorizontal:12, paddingVertical:6, height:32, alignItems:'center', justifyContent:'center', flexDirection:'row', gap:4 }}>
                <Ionicons name="add" size={14} color="#3b82f6" />
                <Text style={{ color:'#3b82f6', fontSize:12, fontFamily:'DMSans_600SemiBold' }}>Add</Text>
              </TouchableOpacity>
              <Text style={{ fontSize:13, color:'#666680', fontFamily:'DMSans_700Bold', letterSpacing:2, textTransform:'uppercase' }}>Edit Layout</Text>
              <TouchableOpacity onPress={exitEditMode}
                style={{ backgroundColor:'rgba(16,185,129,0.15)', borderWidth:1, borderColor:'rgba(16,185,129,0.3)', borderRadius:6, paddingHorizontal:14, paddingVertical:6, height:32, alignItems:'center', justifyContent:'center' }}>
                <Text style={{ color:'#10b981', fontSize:12, fontFamily:'DMSans_700Bold', letterSpacing:1 }}>DONE</Text>
              </TouchableOpacity>
            </View>
            <DraggableFlatList
              data={cardOrder}
              keyExtractor={(item) => item}
              contentContainerStyle={{ paddingHorizontal:16, paddingBottom:40 }}
              onDragEnd={({ data }) => {
                setCardOrder(data);
                saveLayout(data, cardVisible);
              }}
              renderItem={({ item: id, drag, isActive }: RenderItemParams<CardId>) => {
                const meta = CARD_REGISTRY.find(c => c.id === id)!;
                const visible = cardVisible[id];
                return (
                  <ScaleDecorator>
                    <View style={[styles.editCardRow, isActive && { opacity: 0.85 }]}>
                      <TouchableOpacity onPress={() => toggleCardVisible(id)}
                        style={[styles.editBadge, { backgroundColor: visible ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)', borderColor: visible ? 'rgba(239,68,68,0.4)' : 'rgba(16,185,129,0.4)' }]}>
                        <Ionicons name={visible ? 'remove' : 'add'} size={14} color={visible ? '#ef4444' : '#10b981'} />
                      </TouchableOpacity>
                      <View style={[styles.editCardPreview, !visible && { opacity:0.35 }]}>
                        <Text style={styles.editCardLabel}>{meta.label}</Text>
                        <Text style={styles.editCardDesc}>{meta.description}</Text>
                      </View>
                      <TouchableOpacity onLongPress={drag} delayLongPress={0} style={styles.dragHandle}>
                        <Ionicons name="menu-outline" size={20} color="#444466" />
                      </TouchableOpacity>
                    </View>
                  </ScaleDecorator>
                );
              }}
            />
          </Animated.View>
        </Modal>
      )}

      {/* ── Card library bottom sheet ── */}
      {showCardSheet && (
        <Modal transparent animationType="none" visible={showCardSheet} onRequestClose={closeCardSheet}>
          <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={closeCardSheet} />
          <Animated.View style={[styles.sheet, { transform:[{ translateY: sheetTranslate }] }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Add Cards</Text>
            <Text style={styles.sheetSubtitle}>Toggle cards to show or hide on your home screen</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop:8 }}>
              {CARD_REGISTRY.map(meta => {
                const visible = cardVisible[meta.id];
                return (
                  <TouchableOpacity key={meta.id} onPress={() => toggleCardVisible(meta.id)}
                    style={[styles.sheetRow, visible && styles.sheetRowActive]}>
                    <View style={{ flex:1 }}>
                      <Text style={[styles.sheetRowLabel, visible && { color:'#e8e8f0' }]}>{meta.label}</Text>
                      <Text style={styles.sheetRowDesc}>{meta.description}</Text>
                    </View>
                    <View style={[styles.sheetToggle, visible && styles.sheetToggleOn]}>
                      {visible && <Ionicons name="checkmark" size={14} color="#10b981" />}
                    </View>
                  </TouchableOpacity>
                );
              })}
              <View style={{ height:32 }} />
            </ScrollView>
          </Animated.View>
        </Modal>
      )}

    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:        { flex:1, backgroundColor:'#0d0d0f' },
  header:           { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:20, paddingVertical:16, borderBottomWidth:0.5, borderBottomColor:'rgba(255,255,255,0.06)', marginBottom:16 },
  headerLabel:      { fontSize:9, letterSpacing:2, color:'#666680', textTransform:'uppercase', marginBottom:2, fontFamily:'DMSans_700Bold' },
  headerTitle:      { fontSize:32, fontWeight:'700', color:'#e8e8f0', fontFamily:'BebasNeue_400Regular', letterSpacing:2 },
  headerBtn:        { backgroundColor:'rgba(59,130,246,0.15)', borderWidth:1, borderColor:'rgba(59,130,246,0.3)', borderRadius:6, paddingHorizontal:12, paddingVertical:6, height:32, alignItems:'center', justifyContent:'center' },
  card:             { backgroundColor:'#1a1a24', borderWidth:0.5, borderColor:'rgba(255,255,255,0.06)', borderRadius:14, padding:16, marginBottom:12, borderTopColor:'rgba(255,255,255,0.1)', borderTopWidth:0.5 },
  cardLabel:        { fontSize:9, letterSpacing:3, color:'#7070a0', textTransform:'uppercase', fontFamily:'DMSans_700Bold', marginBottom:10 },
  verseCard:        { backgroundColor:'#16162a', borderWidth:1, borderColor:'rgba(212,134,10,0.4)', borderRadius:14, padding:16, marginBottom:12 },
  verseLabel:       { fontSize:9, letterSpacing:3, color:'#666680', textTransform:'uppercase', marginBottom:8, fontFamily:'DMSans_700Bold' },
  verseText:        { fontSize:14, color:'#aaaacc', fontStyle:'italic', lineHeight:24, marginBottom:10, fontFamily:'DMSans_400Regular', textAlign:'center' },
  verseRef:         { fontSize:9, color:'#666680', fontFamily:'DMSans_700Bold', textAlign:'center', letterSpacing:2, textTransform:'uppercase' },
  ifStartBtn:       { backgroundColor:'rgba(16,185,129,0.12)', borderWidth:1, borderColor:'rgba(16,185,129,0.3)', borderRadius:6, padding:14, alignItems:'center' },
  ifStartBtnText:   { color:'#10b981', fontFamily:'BebasNeue_400Regular', letterSpacing:2, fontSize:16 },
  ifRow:            { flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  ifLabel:          { fontSize:11, letterSpacing:2, color:'#999999', textTransform:'uppercase', fontFamily:'DMSans_500Medium' },
  ifCountdown:      { fontSize:48, color:'#a0a0b8', lineHeight:52, fontFamily:'BebasNeue_400Regular', letterSpacing:2 },
  ifReset:          { color:'#999999', fontSize:11, textDecorationLine:'underline', marginTop:8, fontFamily:'DMSans_400Regular' },
  calRow:           { flexDirection:'row', alignItems:'baseline', gap:6, marginBottom:10 },
  calNumber:        { fontSize:52, lineHeight:56, fontFamily:'BebasNeue_400Regular', letterSpacing:1 },
  calTarget:        { fontSize:14, color:'#999999', fontFamily:'DMSans_400Regular' },
  calRemaining:     { fontSize:12, color:'#999999', fontFamily:'DMSans_400Regular' },
  progressBarBg:    { height:6, backgroundColor:'#2a2a2a', borderRadius:6, overflow:'hidden', marginBottom:12 },
  progressBarFill:  { height:'100%', borderRadius:6 },
  waterBtns:        { flexDirection:'row', gap:8 },
  waterBtn:         { flex:1, padding:10, backgroundColor:'rgba(59,130,246,0.1)', borderWidth:1, borderColor:'rgba(59,130,246,0.25)', borderRadius:6, alignItems:'center', justifyContent:'center' },
  waterBtnText:     { color:'#3b82f6', fontFamily:'BebasNeue_400Regular', fontSize:15, letterSpacing:1 },
  waterBtnRed:      { flex:1, padding:10, backgroundColor:'rgba(239,68,68,0.1)', borderWidth:1, borderColor:'rgba(239,68,68,0.25)', borderRadius:6, alignItems:'center', justifyContent:'center' },
  waterBtnRedText:  { color:'#ef4444', fontFamily:'BebasNeue_400Regular', fontSize:15, letterSpacing:1 },
  weightRow:        { flexDirection:'row', gap:12, marginBottom:14 },
  weightStat:       { flex:1 },
  weightVal:        { fontSize:28, color:'#ffffff', lineHeight:32, fontFamily:'BebasNeue_400Regular', letterSpacing:1 },
  weightLbl:        { fontSize:10, color:'#999999', letterSpacing:2, textTransform:'uppercase', marginTop:2, fontFamily:'DMSans_500Medium' },
  weightAdd:        { flexDirection:'row', gap:8 },
  weightInput:      { flex:1, backgroundColor:'#1e1e1e', borderWidth:1, borderColor:'#2a2a2a', borderRadius:6, color:'#ffffff', padding:10, fontSize:14, fontFamily:'DMSans_400Regular' },
  logBtn:           { backgroundColor:'rgba(59,130,246,0.15)', borderWidth:1, borderColor:'rgba(59,130,246,0.3)', borderRadius:6, paddingHorizontal:16, justifyContent:'center' },
  logBtnText:       { color:'#3b82f6', fontFamily:'BebasNeue_400Regular', fontSize:16, letterSpacing:1 },
  workoutRow:       { flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  workoutDay:       { fontSize:22, color:'#ffffff', letterSpacing:1, fontFamily:'BebasNeue_400Regular' },
  workoutMuscles:   { fontSize:12, color:'#999999', marginTop:2, fontFamily:'DMSans_400Regular' },
  workoutPill:      { paddingHorizontal:12, paddingVertical:4, borderRadius:20, borderWidth:1 },
  workoutPillText:  { fontSize:10, letterSpacing:2, fontFamily:'DMSans_600SemiBold' },
  notesInput:       { backgroundColor:'#1e1e1e', borderWidth:1, borderColor:'#2a2a2a', borderRadius:6, color:'#ffffff', padding:10, fontSize:13, minHeight:80, textAlignVertical:'top', marginTop:8, fontFamily:'DMSans_400Regular' },
  saveBtn:          { marginTop:8, padding:10, backgroundColor:'#1e1e1e', borderWidth:1, borderColor:'#3a3a3a', borderRadius:6, alignItems:'center' },
  saveBtnText:      { color:'#cccccc', fontSize:12, fontFamily:'DMSans_500Medium' },
  // Edit sheet
  editSheet:        { position:'absolute', bottom:0, left:0, right:0, backgroundColor:'#13131e', borderTopLeftRadius:20, borderTopRightRadius:20, maxHeight:'85%', borderTopWidth:0.5, borderColor:'rgba(255,255,255,0.1)', paddingBottom:40 },
  editSheetHandle:  { width:36, height:4, backgroundColor:'rgba(255,255,255,0.15)', borderRadius:2, alignSelf:'center', marginTop:12, marginBottom:12 },
  editSheetHeader:  { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingBottom:16, borderBottomWidth:0.5, borderBottomColor:'rgba(255,255,255,0.06)', marginBottom:8 },
  // Edit mode
  editCardRow:      { flexDirection:'row', alignItems:'center', gap:10, marginBottom:10 },
  editBadge:        { width:28, height:28, borderRadius:14, borderWidth:1, alignItems:'center', justifyContent:'center' },
  editCardPreview:  { flex:1, backgroundColor:'#1a1a24', borderWidth:0.5, borderColor:'rgba(255,255,255,0.08)', borderRadius:10, paddingHorizontal:14, paddingVertical:10 },
  editCardLabel:    { fontSize:13, color:'#e8e8f0', fontFamily:'DMSans_600SemiBold', marginBottom:2 },
  editCardDesc:     { fontSize:11, color:'#444466', fontFamily:'DMSans_400Regular' },
  dragHandle:       { padding:8 },
  // Bottom sheet
  sheetOverlay:     { position:'absolute', top:0, left:0, right:0, bottom:0, backgroundColor:'rgba(0,0,0,0.6)' },
  sheet:            { position:'absolute', bottom:0, left:0, right:0, backgroundColor:'#13131e', borderTopLeftRadius:20, borderTopRightRadius:20, padding:20, paddingBottom:40, maxHeight:'75%', borderTopWidth:0.5, borderColor:'rgba(255,255,255,0.1)' },
  sheetHandle:      { width:36, height:4, backgroundColor:'rgba(255,255,255,0.15)', borderRadius:2, alignSelf:'center', marginBottom:16 },
  sheetTitle:       { fontSize:18, color:'#e8e8f0', fontFamily:'BebasNeue_400Regular', letterSpacing:2, marginBottom:4 },
  sheetSubtitle:    { fontSize:11, color:'#444466', fontFamily:'DMSans_400Regular', marginBottom:8 },
  sheetRow:         { flexDirection:'row', alignItems:'center', paddingVertical:12, borderBottomWidth:0.5, borderBottomColor:'rgba(255,255,255,0.05)', gap:12 },
  sheetRowActive:   { },
  sheetRowLabel:    { fontSize:14, color:'#666680', fontFamily:'DMSans_600SemiBold', marginBottom:2 },
  sheetRowDesc:     { fontSize:11, color:'#333355', fontFamily:'DMSans_400Regular' },
  sheetToggle:      { width:24, height:24, borderRadius:12, borderWidth:1, borderColor:'rgba(255,255,255,0.1)', backgroundColor:'#1a1a24', alignItems:'center', justifyContent:'center' },
  sheetToggleOn:    { borderColor:'rgba(16,185,129,0.4)', backgroundColor:'rgba(16,185,129,0.1)' },
});