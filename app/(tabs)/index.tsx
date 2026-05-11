import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, AppState, Modal, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import ReAnimated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import PressableButton from '../../components/PressableButton';
import { useToast } from '../../components/Toast';
import { loadFromFirebase, saveToFirebase } from '../../firebaseConfig';
import { useTheme } from '../../theme';
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
  { id: 'verse',          label: "Today's Message",   description: 'Scripture for the day',                  defaultVisible: true },
  { id: 'if',             label: 'Intermittent Fast',  description: 'Fasting window timer & tracker',         defaultVisible: true },
  { id: 'calories',       label: 'Calories',           description: 'Daily calorie intake & progress',        defaultVisible: true },
  { id: 'macros',         label: 'Macros',             description: 'Protein, carbs & fat breakdown',         defaultVisible: true },
  { id: 'water',          label: 'Water',              description: 'Hydration tracking',                     defaultVisible: true },
  { id: 'weight',         label: 'Weight',             description: 'Daily weigh-in & total progress',        defaultVisible: true },
  { id: 'workout',        label: "Today's Training",   description: "Workout summary and calories burned",     defaultVisible: true },
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
  // Strength & Perseverance
  { text: "I can do all things through Christ which strengtheneth me.", reference: "Philippians 4:13" },
  { text: "But they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint.", reference: "Isaiah 40:31" },
  { text: "Now no chastening for the present seemeth to be joyous, but grievous: nevertheless afterward it yieldeth the peaceable fruit of righteousness unto them which are exercised thereby.", reference: "Hebrews 12:11" },
  { text: "And let us not be weary in well doing: for in due season we shall reap, if we faint not.", reference: "Galatians 6:9" },
  { text: "Let us run with patience the race that is set before us, looking unto Jesus the author and finisher of our faith.", reference: "Hebrews 12:1-2" },
  { text: "Be strong and of a good courage, fear not, nor be afraid of them: for the LORD thy God, he it is that doth go with thee; he will not fail thee, nor forsake thee.", reference: "Deuteronomy 31:6" },
  { text: "Have not I commanded thee? Be strong and of a good courage; be not afraid, neither be thou dismayed: for the LORD thy God is with thee whithersoever thou goest.", reference: "Joshua 1:9" },
  { text: "I have fought a good fight, I have finished my course, I have kept the faith.", reference: "2 Timothy 4:7" },
  { text: "And he said unto me, My grace is sufficient for thee: for my strength is made perfect in weakness.", reference: "2 Corinthians 12:9" },
  { text: "The LORD is my strength and my shield; my heart trusted in him, and I am helped.", reference: "Psalm 28:7" },
  { text: "God is our refuge and strength, a very present help in trouble.", reference: "Psalm 46:1" },
  { text: "He giveth power to the faint; and to them that have no might he increaseth strength.", reference: "Isaiah 40:29" },
  { text: "The LORD is my strength and song, and he is become my salvation: he is my God, and I will prepare him an habitation; my father's God, and I will exalt him.", reference: "Exodus 15:2" },

  // Faith & Trust
  { text: "Trust in the LORD with all thine heart; and lean not unto thine own understanding. In all thy ways acknowledge him, and he shall direct thy paths.", reference: "Proverbs 3:5-6" },
  { text: "Commit thy works unto the LORD, and thy thoughts shall be established.", reference: "Proverbs 16:3" },
  { text: "For we walk by faith, not by sight.", reference: "2 Corinthians 5:7" },
  { text: "Now faith is the substance of things hoped for, the evidence of things not seen.", reference: "Hebrews 11:1" },
  { text: "Jesus said unto him, If thou canst believe, all things are possible to him that believeth.", reference: "Mark 9:23" },
  { text: "But without faith it is impossible to please him: for he that cometh to God must believe that he is, and that he is a rewarder of them that diligently seek him.", reference: "Hebrews 11:6" },
  { text: "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.", reference: "John 3:16" },
  { text: "Jesus saith unto him, I am the way, the truth, and the life: no man cometh unto the Father, but by me.", reference: "John 14:6" },
  { text: "Be careful for nothing; but in every thing by prayer and supplication with thanksgiving let your requests be made known unto God.", reference: "Philippians 4:6" },

  // Body & Discipline
  { text: "What? know ye not that your body is the temple of the Holy Ghost which is in you, which ye have of God, and ye are not your own?", reference: "1 Corinthians 6:19" },
  { text: "Whether therefore ye eat, or drink, or whatsoever ye do, do all to the glory of God.", reference: "1 Corinthians 10:31" },
  { text: "For bodily exercise profiteth little: but godliness is profitable unto all things, having promise of the life that now is, and of that which is to come.", reference: "1 Timothy 4:8" },
  { text: "For God hath not given us the spirit of fear; but of power, and of love, and of a sound mind.", reference: "2 Timothy 1:7" },
  { text: "But I keep under my body, and bring it into subjection: lest that by any means, when I have preached to others, I myself should be a castaway.", reference: "1 Corinthians 9:27" },
  { text: "And whatsoever ye do, do it heartily, as to the Lord, and not unto men.", reference: "Colossians 3:23" },
  { text: "I beseech you therefore, brethren, by the mercies of God, that ye present your bodies a living sacrifice, holy, acceptable unto God, which is your reasonable service.", reference: "Romans 12:1" },

  // Purpose & Identity
  { text: "For we are his workmanship, created in Christ Jesus unto good works, which God hath before ordained that we should walk in them.", reference: "Ephesians 2:10" },
  { text: "Before I formed thee in the belly I knew thee; and before thou camest forth out of the womb I sanctified thee, and I ordained thee a prophet unto the nations.", reference: "Jeremiah 1:5" },
  { text: "For I know the thoughts that I think toward you, saith the LORD, thoughts of peace, and not of evil, to give you an expected end.", reference: "Jeremiah 29:11" },
  { text: "For thou hast possessed my reins: thou hast covered me in my mother's womb. I will praise thee; for I am fearfully and wonderfully made.", reference: "Psalm 139:13-14" },
  { text: "Let your light so shine before men, that they may see your good works, and glorify your Father which is in heaven.", reference: "Matthew 5:16" },
  { text: "But seek ye first the kingdom of God, and his righteousness; and all these things shall be added unto you.", reference: "Matthew 6:33" },

  // Peace & Renewal
  { text: "Create in me a clean heart, O God; and renew a right spirit within me.", reference: "Psalm 51:10" },
  { text: "Peace I leave with you, my peace I give unto you: not as the world giveth, give I unto you. Let not your heart be troubled, neither let it be afraid.", reference: "John 14:27" },
  { text: "And the peace of God, which passeth all understanding, shall keep your hearts and minds through Christ Jesus.", reference: "Philippians 4:7" },
  { text: "Come unto me, all ye that labour and are heavy laden, and I will give you rest.", reference: "Matthew 11:28" },
  { text: "And be not conformed to this world: but be ye transformed by the renewing of your mind, that ye may prove what is that good, and acceptable, and perfect, will of God.", reference: "Romans 12:2" },
  { text: "He restoreth my soul: he leadeth me in the paths of righteousness for his name's sake.", reference: "Psalm 23:3" },
  { text: "The LORD bless thee, and keep thee: The LORD make his face shine upon thee, and be gracious unto thee.", reference: "Numbers 6:24-25" },

  // Love & Grace
  { text: "We love him, because he first loved us.", reference: "1 John 4:19" },
  { text: "But God commendeth his love toward us, in that, while we were yet sinners, Christ died for us.", reference: "Romans 5:8" },
  { text: "For by grace are ye saved through faith; and that not of yourselves: it is the gift of God.", reference: "Ephesians 2:8" },
  { text: "If we confess our sins, he is faithful and just to forgive us our sins, and to cleanse us from all unrighteousness.", reference: "1 John 1:9" },
  { text: "There is therefore now no condemnation to them which are in Christ Jesus, who walk not after the flesh, but after the Spirit.", reference: "Romans 8:1" },
  { text: "For I am persuaded, that neither death, nor life, nor angels, nor principalities, nor powers, nor things present, nor things to come, nor height, nor depth, nor any other creature, shall be able to separate us from the love of God, which is in Christ Jesus our Lord.", reference: "Romans 8:38-39" },
];

// ─── Sub-components ───────────────────────────────────────────────────────────
function MacroDonut({ protein, carbs, fat, calories, theme }: { protein: number; carbs: number; fat: number; calories: number; theme: any }) {
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
          <Text style={{ color: theme.textDim, fontSize: 11, fontFamily: 'DMSans_400Regular' }}>no data</Text>
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
        <Text style={{ color: theme.textPrimary, fontSize: 16, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1 }}>{calories}</Text>
        <Text style={{ color: theme.textMuted, fontSize: 9, fontFamily: 'DMSans_400Regular' }}>kcal</Text>
      </View>
    </View>
  );
}

const AnimCircle = ReAnimated.createAnimatedComponent(Circle);

function calcSleepScore(
  sleepHours: number | null,
  sleepStages: { core: number; deep: number; rem: number; totalMs: number } | null,
  sleepGoal: number
): { score: number; hasStages: boolean } {
  if (!sleepHours || sleepHours <= 0) return { score: 0, hasStages: false };

  const durationPts = Math.min(40, (sleepHours / sleepGoal) * 40);

  if (!sleepStages || sleepStages.totalMs <= 0) {
    return { score: Math.round(Math.min(60, durationPts * 1.5)), hasStages: false };
  }

  const totalMs = sleepStages.totalMs;
  const deepPct = sleepStages.deep / totalMs;
  const remPct = sleepStages.rem / totalMs;

  // Deep: peak at 20%, bell curve. Score falls off on both sides.
  const deepIdeal = 0.20;
  const deepDiff = Math.abs(deepPct - deepIdeal);
  const deepPts = Math.max(0, 30 - (deepDiff / deepIdeal) * 30);

  // REM: peak at 22%, bell curve.
  const remIdeal = 0.22;
  const remDiff = Math.abs(remPct - remIdeal);
  const remPts = Math.max(0, 30 - (remDiff / remIdeal) * 30);

  return { score: Math.round(durationPts + deepPts + remPts), hasStages: true };
}

const SLEEP_TIPS: Record<string, string[]> = {
  low_deep: [
    "Your deep sleep was lower than ideal. Try avoiding alcohol and heavy meals within 3 hours of bed.",
    "Deep sleep is when your body physically repairs itself. A cooler room temperature can help increase it.",
    "Consistent bedtimes train your body to hit deep sleep faster. Try locking in a set schedule.",
  ],
  low_rem: [
    "REM supports memory and mood. Reducing screens 30-60 minutes before bed may help.",
    "Stress and anxiety are the biggest REM killers. A short wind-down routine can make a real difference.",
    "Caffeine late in the day can suppress REM. Try cutting off by early afternoon.",
  ],
  low_duration: [
    "You fell short of your sleep goal. Try setting a consistent bedtime and sticking to it even on weekends.",
    "Even 30 extra minutes of sleep compounds over time. Consider an earlier wind-down.",
    "Sleep debt builds faster than you think. Prioritizing one early night can reset your rhythm.",
  ],
  good: [
    "Solid night. Your body recovered well -- make the most of it today.",
    "Great sleep. Consistency is the key -- same bedtime tonight.",
    "Your body did its job last night. Fuel it well today.",
  ],
  catch_all: [
    "Your sleep was decent but there's room to improve. Focus on consistency -- same bedtime and wake time every day.",
    "Good effort but not quite there. Even small improvements to your sleep environment can add up.",
    "You're close to a great night. Winding down 30 minutes earlier could push you over the edge.",
  ],
};

function getSleepTip(
  score: number,
  sleepHours: number | null,
  sleepStages: { core: number; deep: number; rem: number; totalMs: number } | null,
  sleepGoal: number,
  dateKey: string
): string | null {
  if (!sleepHours) return null;
  const daySeed = parseInt(dateKey.replace(/-/g, '')) % 3;
  if (score >= 85) return SLEEP_TIPS.good[daySeed];
  if (!sleepStages) {
    if (sleepHours < sleepGoal * 0.85) return SLEEP_TIPS.low_duration[daySeed];
    return null;
  }
  const totalMs = sleepStages.totalMs;
  const deepPct = sleepStages.deep / totalMs;
  const remPct = sleepStages.rem / totalMs;
  if (deepPct < 0.12) return SLEEP_TIPS.low_deep[daySeed];
  if (remPct < 0.15) return SLEEP_TIPS.low_rem[daySeed];
  if (sleepHours < sleepGoal * 0.85) return SLEEP_TIPS.low_duration[daySeed];
  if (score < 85) return SLEEP_TIPS.catch_all[daySeed];
  return null;
}

function SleepDonut({ coreFrac, deepFrac, remFrac, donutCirc, donutSize, donutStroke, donutRadius, coreColor, deepColor, remColor, trackColor, gapFrac, refreshKey, score, scoreColor }: {
  coreFrac: number; deepFrac: number; remFrac: number; donutCirc: number;
  donutSize: number; donutStroke: number; donutRadius: number;
  coreColor: string; deepColor: string; remColor: string; trackColor: string; gapFrac: number; refreshKey?: number;
  score: number; scoreColor: string;
}) {
  const coreAnim = useSharedValue(0);
  const deepAnim = useSharedValue(0);
  const remAnim  = useSharedValue(0);

  useEffect(() => {
    coreAnim.value = 0;
    deepAnim.value = 0;
    remAnim.value  = 0;
    setTimeout(() => {
      coreAnim.value = withTiming(Math.max(0, coreFrac - gapFrac), { duration: 800 });
    }, 200);
    setTimeout(() => {
      deepAnim.value = withTiming(Math.max(0, deepFrac - gapFrac), { duration: 700 });
    }, 900);
    setTimeout(() => {
      remAnim.value = withTiming(Math.max(0, remFrac - gapFrac), { duration: 600 });
    }, 1500);
  }, [coreFrac, deepFrac, remFrac, refreshKey]);

  const coreStyle = useAnimatedStyle(() => ({ strokeDasharray: `${coreAnim.value} ${donutCirc}` } as any));
  const deepStyle = useAnimatedStyle(() => ({ strokeDasharray: `${deepAnim.value} ${donutCirc}` } as any));
  const remStyle  = useAnimatedStyle(() => ({ strokeDasharray: `${remAnim.value} ${donutCirc}`  } as any));

  return (
    <View>
      <Svg width={donutSize} height={donutSize}>
        <Circle cx={donutSize/2} cy={donutSize/2} r={donutRadius} stroke={trackColor} strokeWidth={donutStroke} fill="none" />
        <AnimCircle cx={donutSize/2} cy={donutSize/2} r={donutRadius} stroke={coreColor} strokeWidth={donutStroke} fill="none"
          animatedProps={coreStyle} strokeDashoffset={0} strokeLinecap="butt" rotation="-90" origin={`${donutSize/2},${donutSize/2}`} />
        <AnimCircle cx={donutSize/2} cy={donutSize/2} r={donutRadius} stroke={deepColor} strokeWidth={donutStroke} fill="none"
          animatedProps={deepStyle} strokeDashoffset={-(coreFrac)} strokeLinecap="butt" rotation="-90" origin={`${donutSize/2},${donutSize/2}`} />
        <AnimCircle cx={donutSize/2} cy={donutSize/2} r={donutRadius} stroke={remColor} strokeWidth={donutStroke} fill="none"
          animatedProps={remStyle} strokeDashoffset={-(coreFrac+deepFrac)} strokeLinecap="butt" rotation="-90" origin={`${donutSize/2},${donutSize/2}`} />
      </Svg>
      <View style={{ position:'absolute', top:0, left:0, width:donutSize, height:donutSize, alignItems:'center', justifyContent:'center' }}>
        <Text style={{ fontSize: 36, fontFamily: 'BebasNeue_400Regular', color: scoreColor, letterSpacing: 1, lineHeight: 38 }}>{score}</Text>
        <Text style={{ fontSize: 8, fontFamily: 'DMSans_700Bold', letterSpacing: 2, color: scoreColor, textTransform: 'uppercase', opacity: 0.7 }}>/100</Text>
      </View>
    </View>
  );
}

function AnimatedProgressBar({ pct, color, trackColor, refreshKey }: { pct: number; color: string; trackColor?: string; refreshKey?: number }) {
  const width = useSharedValue(0);
  useEffect(() => {
    width.value = 0;
    setTimeout(() => {
      width.value = withTiming(Math.min(100, pct), { duration: 1200 });
    }, 350);
  }, [refreshKey]);

  useEffect(() => {
    width.value = withTiming(Math.min(100, pct), { duration: 600 });
  }, [pct]);
  const animStyle = useAnimatedStyle(() => ({ width: `${width.value}%` as any }));
  return (
    <View style={[styles.progressBarBg, { backgroundColor: trackColor ?? '#1e1e2e' }]}>
      <ReAnimated.View style={[styles.progressBarFill, { backgroundColor: color }, animStyle]} />
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
function MacroBar({ val, goal, color, trackColor }: { val: number; goal: number; color: string; trackColor?: string }) {
  const pct = goal > 0 ? Math.min((val / goal) * 100, 100) : 0;
  const width = useSharedValue(0);
  useEffect(() => {
    width.value = withTiming(pct, { duration: 1000 });
  }, [pct]);
  const animStyle = useAnimatedStyle(() => ({ width: `${width.value}%` as any }));
  return (
    <View style={{ height:6, backgroundColor: trackColor ?? '#1e1e2e', borderRadius:6, overflow:'hidden' }}>
      <ReAnimated.View style={[{ height:'100%', borderRadius:6, backgroundColor: color }, animStyle]} />
    </View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { showToast } = useToast();

  // Layout state
  const [cardOrder,   setCardOrder]   = useState<CardId[]>(DEFAULT_ORDER);
  const [cardVisible, setCardVisible] = useState<Record<CardId, boolean>>(DEFAULT_VISIBLE);
  const [editMode,    setEditMode]    = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [showCardSheet, setShowCardSheet] = useState(false);
  const sheetAnim = useRef(new Animated.Value(0)).current;
  const editSheetAnim = useRef(new Animated.Value(0)).current;

  // App state
  const [loaded,          setLoaded]          = useState(false);
  const [refreshKey,      setRefreshKey]       = useState(0);
  const [waterPresets,    setWaterPresets]     = useState<[number,number,number]>([12,16,22]);
  const [showWaterCustomModal, setShowWaterCustomModal] = useState(false);
  const [waterCustomInput,     setWaterCustomInput]     = useState('');
  const [waterCustomSign,      setWaterCustomSign]      = useState<'add'|'subtract'>('add');

  // IF state
  const [ifStart,       setIfStart]       = useState<number|null>(null);
  const [ifMethod,      setIfMethod]      = useState<string>('16:8');
  const [ifEnd,         setIfEnd]         = useState<number|null>(null);
  const [ifCustomHours, setIfCustomHours] = useState<string>('16');
  const [currentTime,   setCurrentTime]   = useState(Date.now());

  // Health / daily state
  const [water,          setWater]          = useState(0);
  const [weight,          setWeight]          = useState<number|null>(null);
  const [yesterdayWeight, setYesterdayWeight] = useState<number|null>(null);
  const [earliestWeight,  setEarliestWeight]  = useState<number|null>(null);
  const [lastKnownWeight, setLastKnownWeight] = useState<{ val: number; daysAgo: number } | null>(null);
  const [weightInput,    setWeightInput]    = useState('');
  const [dailyNote,      setDailyNote]      = useState('');
  const [totalCals,      setTotalCals]      = useState(0);
  const [calTarget,      setCalTarget]      = useState(0);
  const [caloriesBurned, setCaloriesBurned] = useState(0);
  const [totalProtein,   setTotalProtein]   = useState(0);
  const [totalCarbs,     setTotalCarbs]     = useState(0);
  const [totalFat,       setTotalFat]       = useState(0);
  const [stepGoal,       setStepGoal]       = useState(10000);
  const [sleepGoal,      setSleepGoal]      = useState(7);
  const [macroGoals,     setMacroGoals]     = useState({ protein: 0, carbs: 0, fat: 0 });
  const [editingStepGoal,setEditingStepGoal]= useState(false);
  const [dailyVerse,     setDailyVerse]     = useState<{text:string;reference:string}|null>(null);
  const [workoutPrograms,setWorkoutPrograms]= useState<Record<string,any>>({});
  const [workoutChecks,  setWorkoutChecks]  = useState<Record<string,any>>({});
  const [workoutTemplate,setWorkoutTemplate]= useState<Record<string,any>>({});
  const [workoutTags,    setWorkoutTags]    = useState<any[]>([]);

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

  const getDateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const [todayKey, setTodayKey] = useState(() => getDateKey(new Date()));
  const [todayDay, setTodayDay] = useState(() => DAY_NAMES[new Date().getDay()]);
  const hkCalories    = activeCalories > 0 ? activeCalories : caloriesBurned;
  const adjustedTarget= calTarget + hkCalories;
  const displayedBurned = hkCalories;
  const calPct   = adjustedTarget > 0 ? (totalCals / adjustedTarget) * 100 : 0;
  const calColor = calPct > 114 ? '#ef4444' : calPct > 106 ? '#f59e0b' : calPct >= 80 ? '#10b981' : calPct >= 63 ? '#f59e0b' : '#ef4444';
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

  // ── Date rollover -- AppState + midnight timer ───────────────────────────────
  useEffect(() => {
    const checkDateRollover = () => {
      const newKey = getDateKey(new Date());
      const newDay = DAY_NAMES[new Date().getDay()];
      setTodayKey(prev => {
        if (prev !== newKey) {
          setTodayDay(newDay);
          // Reset daily state
          setWater(0);
          setWeight(null);
          setIfStart(null);
          setIfEnd(null);
          setDailyNote('');
          setTotalCals(0);
          setTotalProtein(0);
          setTotalCarbs(0);
          setTotalFat(0);
          setCaloriesBurned(0);
          setSleepOverride(null);
          setSleepStoredBed(null);
          setSleepStoredWake(null);
          return newKey;
        }
        return prev;
      });
    };

    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') checkDateRollover();
    });

    // Midnight timer
    const now = new Date();
    const msUntilMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime();
    const midnightTimer = setTimeout(() => {
      checkDateRollover();
    }, msUntilMidnight);

    return () => {
      subscription.remove();
      clearTimeout(midnightTimer);
    };
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
          if (data.ifMethod)      setIfMethod(data.ifMethod);
          if (data.ifCustomHours) setIfCustomHours(data.ifCustomHours);
          if (data.dailyNote)     setDailyNote(data.dailyNote);
          // Only load IF start/end if they belong to today
          if (data.ifStart) {
            const startDate = new Date(data.ifStart);
            const startKey = `${startDate.getFullYear()}-${String(startDate.getMonth()+1).padStart(2,'0')}-${String(startDate.getDate()).padStart(2,'0')}`;
            if (startKey === todayKey) {
              setIfStart(data.ifStart);
              if (data.ifEnd) setIfEnd(data.ifEnd);
            }
          }
          const yesterday = new Date(); yesterday.setDate(yesterday.getDate()-1);
          const yk = `${yesterday.getFullYear()}-${String(yesterday.getMonth()+1).padStart(2,'0')}-${String(yesterday.getDate()).padStart(2,'0')}`;
          const yd = await AsyncStorage.getItem(`pj_${yk}`);
          if (yd) { const ydp = JSON.parse(yd); if (ydp.weight) setYesterdayWeight(ydp.weight); }
          for (let i = 1; i <= 30; i++) {
            const d = new Date(); d.setDate(d.getDate()-i);
            const dk = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
            const ld = await AsyncStorage.getItem(`pj_${dk}`);
            if (ld) { const ldp = JSON.parse(ld); if (ldp.weight) { setLastKnownWeight({ val: ldp.weight, daysAgo: i }); break; } }
          }
          for (let i = 365; i >= 1; i--) {
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
        // Shuffled verse rotation -- no repeats until all verses used
        const todayStr = todayKey;
        const rotationRaw = await AsyncStorage.getItem('pj_verse_rotation');
        let rotation: { order: number[]; index: number; lastDate: string } = rotationRaw
          ? JSON.parse(rotationRaw)
          : { order: [], index: 0, lastDate: '' };

        const shuffle = (arr: number[]) => {
          const a = [...arr];
          for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
          }
          return a;
        };

        // If rotation is empty or exhausted, reshuffle
        if (!rotation.order.length || rotation.index >= rotation.order.length) {
          rotation = { order: shuffle(VERSES.map((_, i) => i)), index: 0, lastDate: todayStr };
          await AsyncStorage.setItem('pj_verse_rotation', JSON.stringify(rotation));
        }

        // If it's a new day, advance the index
        if (rotation.lastDate !== todayStr) {
          rotation.index = rotation.lastDate === '' ? 0 : rotation.index + 1;
          // Check again after advancing in case we just exhausted the list
          if (rotation.index >= rotation.order.length) {
            rotation = { order: shuffle(VERSES.map((_, i) => i)), index: 0, lastDate: todayStr };
          } else {
            rotation.lastDate = todayStr;
          }
          await AsyncStorage.setItem('pj_verse_rotation', JSON.stringify(rotation));
        }

        setDailyVerse(VERSES[rotation.order[rotation.index]]);
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
          ...current, ifStart, ifMethod, ifEnd, ifCustomHours, dailyNote, weight,
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
        if (data.weight) setWeight(data.weight);
        }
        // Weight comparison loading
        const yesterday = new Date(); yesterday.setDate(yesterday.getDate()-1);
        const yk = `${yesterday.getFullYear()}-${String(yesterday.getMonth()+1).padStart(2,'0')}-${String(yesterday.getDate()).padStart(2,'0')}`;
        const yd = await AsyncStorage.getItem(`pj_${yk}`);
        if (yd) { const ydp = JSON.parse(yd); if (ydp.weight) setYesterdayWeight(ydp.weight); else setYesterdayWeight(null); }
        for (let i = 365; i >= 1; i--) {
          const d = new Date(); d.setDate(d.getDate()-i);
          const dk = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
          const ed = await AsyncStorage.getItem(`pj_${dk}`);
          if (ed) { const edp = JSON.parse(ed); if (edp.weight) { setEarliestWeight(edp.weight); break; } }
        }
        for (let i = 1; i <= 30; i++) {
          const d = new Date(); d.setDate(d.getDate()-i);
          const dk = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
          const ld = await AsyncStorage.getItem(`pj_${dk}`);
          if (ld) { const ldp = JSON.parse(ld); if (ldp.weight) { setLastKnownWeight({ val: ldp.weight, daysAgo: i }); break; } }
        }
        const workoutData = await AsyncStorage.getItem('pj_workout_state');
        if (workoutData) {
          const wd = JSON.parse(workoutData);
          if (wd.programs) setWorkoutPrograms(wd.programs);
          if (wd.checks) setWorkoutChecks(wd.checks);
          if (wd.weeklyTemplate) setWorkoutTemplate(wd.weeklyTemplate);
        }
        const settingsData = await AsyncStorage.getItem('pj_settings');
        if (settingsData) {
          const sd = JSON.parse(settingsData);
          if (sd.workoutTags && Array.isArray(sd.workoutTags)) setWorkoutTags(sd.workoutTags);
        }
        const profileData = await AsyncStorage.getItem('pj_profile');
        if (profileData) {
          const p = JSON.parse(profileData);
          if (p.waterPresets)                    setWaterPresets(p.waterPresets);
          if (p.stepGoal && parseInt(p.stepGoal) > 0) setStepGoal(parseInt(p.stepGoal));
          if (p.sleepGoal && parseFloat(p.sleepGoal) > 0) setSleepGoal(parseFloat(p.sleepGoal));
          if (p.calTarget && parseInt(p.calTarget) > 0) {
            setCalTarget(parseInt(p.calTarget));
          }

          // Load macro goals
          const kcalTarget = parseInt(p.calTarget) || 0;
          if (p.macroMode === 'fixed' && p.macroProteinG && p.macroCarbsG && p.macroFatG) {
            setMacroGoals({
              protein: parseFloat(p.macroProteinG) || 0,
              carbs:   parseFloat(p.macroCarbsG)   || 0,
              fat:     parseFloat(p.macroFatG)      || 0,
            });
          } else if (p.macroProteinPct && p.macroCarbsPct && p.macroFatPct && kcalTarget > 0) {
            setMacroGoals({
              protein: Math.round(((parseFloat(p.macroProteinPct) || 35) / 100) * kcalTarget / 4),
              carbs:   Math.round(((parseFloat(p.macroCarbsPct)   || 40) / 100) * kcalTarget / 4),
              fat:     Math.round(((parseFloat(p.macroFatPct)     || 25) / 100) * kcalTarget / 9),
            });
          } else if (kcalTarget > 0) {
            // Fallback - derive from calTarget using default 35/40/25 split
            setMacroGoals({
              protein: Math.round((0.35 * kcalTarget) / 4),
              carbs:   Math.round((0.40 * kcalTarget) / 4),
              fat:     Math.round((0.25 * kcalTarget) / 9),
            });
          }

          if (p.activityLevel && p.weightGoal) {
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
  const logWeight = async () => {
    const val = parseFloat(weightInput);
    if (!val || val <= 0) return;
    setWeight(val);
    setWeightInput('');
    saveToFirebase(todayKey, 'weight', val);
    try {
      const existing = await AsyncStorage.getItem(`pj_${todayKey}`);
      const current = existing ? JSON.parse(existing) : {};
      await AsyncStorage.setItem(`pj_${todayKey}`, JSON.stringify({ ...current, weight: val }));
    } catch (e) { console.log('Weight save error', e); }
  };

  // ── Edit mode ────────────────────────────────────────────────────────────────
  const enterEditMode = () => {
    setEditModalVisible(true);
    setEditMode(true);
    editSheetAnim.setValue(0);
    Animated.timing(editSheetAnim, {
      toValue: 1,
      duration: 380,
      useNativeDriver: true,
    }).start();
  };

  const exitEditMode = () => {
    Animated.timing(editSheetAnim, {
      toValue: 0,
      duration: 350,
      useNativeDriver: true,
    }).start(() => {
      setEditMode(false);
      setShowCardSheet(false);
      setTimeout(() => setEditModalVisible(false), 100);
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

  // ─── Card Renderers ───────────────────────────────────────────────────────────
  const renderVerseCard = () => {
    const cardScale = new Animated.Value(1);
    const onPressIn = () => Animated.timing(cardScale, { toValue: 0.97, duration: 100, useNativeDriver: true }).start();
    const onPressOut = () => Animated.timing(cardScale, { toValue: 1, duration: 150, useNativeDriver: true }).start();

    return (
      <Animated.View style={{ transform: [{ scale: cardScale }] }}>
        <TouchableOpacity
          activeOpacity={0.99}
          delayPressIn={0}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          onPress={() => router.push({
            pathname: '/bible',
            params: {
              verseRef: dailyVerse?.reference ?? '',
              verseText: dailyVerse?.text ?? '',
            },
          })}
          style={[styles.verseCard, { backgroundColor: theme.bgCardVerse, borderColor: theme.borderCardVerse,
            shadowColor: '#d4860a', shadowOffset: { width: 0, height: 0 }, shadowOpacity: .85, shadowRadius: 8, elevation: 8 }]}
        >
          <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
            <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
              <Ionicons name="book-outline" size={11} color={theme.textMuted} />
              <Text style={[styles.verseLabel, { marginBottom:0, color: theme.textMuted }]}>TODAY'S MESSAGE</Text>
            </View>
            <Ionicons name="chevron-forward" size={12} color={theme.textDim} />
          </View>
          <Text style={[styles.verseText, { color: theme.textSecondary }]}>"{dailyVerse?.text}"</Text>
          <Text style={[styles.verseRef, { color: theme.textMuted }]}>{dailyVerse?.reference}</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderIFCard = () => (
    <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: theme.borderCardTop }]}>
      <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
        <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
          <Ionicons name="timer-outline" size={11} color={theme.textMuted} />
          <Text style={[styles.cardLabel, { marginBottom:0, color: theme.textMuted }]}>Intermittent Fast · {ifMethod}</Text>
        </View>
        {ifStart && (
          <View style={{ backgroundColor: ifEnd ? `${ifResultColor}22` : isOpen ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', borderWidth:1, borderColor: ifEnd ? `${ifResultColor}55` : isOpen ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)', borderRadius:5, paddingHorizontal:8, paddingVertical:3 }}>
            <Text style={{ fontSize:10, fontFamily:'DMSans_700Bold', letterSpacing:2, color: ifEnd ? ifResultColor : isOpen ? theme.accentGreen : theme.accentRed }}>
              {ifEnd ? ifResultLabel : isOpen ? 'OPEN' : 'CLOSED'}
            </Text>
          </View>
        )}
      </View>
      <View style={{ flexDirection:'row', gap:5, marginBottom:12, flexWrap:'wrap' }}>
        {Object.keys(IF_METHODS).map(m => (
          <TouchableOpacity key={m} onPress={() => { setIfMethod(m); saveToFirebase(todayKey,'ifMethod',m); }}
            style={{ paddingHorizontal:10, paddingVertical:5, borderRadius:6, backgroundColor: ifMethod===m ? theme.accentBlueBg : theme.ifMethodBg, borderWidth:1, borderColor: ifMethod===m ? theme.accentBlueBorder : theme.ifMethodBorder }}>
            <Text style={{ fontSize:11, fontFamily:'DMSans_600SemiBold', color: ifMethod===m ? theme.accentBlue : theme.ifMethodText }}>{m}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {ifMethod === 'Custom' && (
        <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginBottom:12 }}>
          <Text style={{ fontSize:12, color: theme.textMuted, fontFamily:'DMSans_400Regular' }}>Eating window:</Text>
          <TextInput style={{ backgroundColor: theme.bgInput, borderWidth:1, borderColor: theme.borderInput, borderRadius:6, color: theme.textPrimary, padding:6, fontSize:14, fontFamily:'DMSans_600SemiBold', width:50, textAlign:'center' }}
            value={ifCustomHours} onChangeText={v => setIfCustomHours(v)} keyboardType="number-pad" maxLength={2} />
          <Text style={{ fontSize:12, color: theme.textMuted, fontFamily:'DMSans_400Regular' }}>hrs</Text>
        </View>
      )}
      {!ifStart ? (
        <PressableButton style={[styles.ifStartBtn, { backgroundColor: theme.accentGreenBg, borderColor: theme.accentGreenBorder }]} onPress={() => { setIfStart(Date.now()); setIfEnd(null); }} flex={0}>
          <Text style={[styles.ifStartBtnText, { color: theme.accentGreen }]}>TAP WHEN YOU EAT YOUR FIRST MEAL</Text>
        </PressableButton>
      ) : ifEnd ? (
        <View>
          <View style={{ backgroundColor:`${ifResultColor}11`, borderWidth:1, borderColor:`${ifResultColor}33`, borderRadius:8, padding:12, marginBottom:10 }}>
            <View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:6 }}>
              <Text style={{ fontSize:11, color: theme.textMuted, fontFamily:'DMSans_400Regular' }}>Target</Text>
              <Text style={{ fontSize:13, color:ifResultColor, fontFamily:'DMSans_600SemiBold' }}>{formatHrMin(ifTargetMs)}</Text>
            </View>
            <View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:6 }}>
              <Text style={{ fontSize:11, color: theme.textMuted, fontFamily:'DMSans_400Regular' }}>Actual</Text>
              <Text style={{ fontSize:13, color: theme.textPrimary, fontFamily:'DMSans_600SemiBold' }}>{ifActualMs ? formatHrMin(ifActualMs) : '--'}</Text>
            </View>
            <View style={{ flexDirection:'row', justifyContent:'space-between' }}>
              <Text style={{ fontSize:11, color: theme.textMuted, fontFamily:'DMSans_400Regular' }}>Window</Text>
              <Text style={{ fontSize:11, color: theme.textMuted, fontFamily:'DMSans_400Regular' }}>
                {new Date(ifStart).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})} → {new Date(ifEnd).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection:'row', gap:16, marginTop:4 }}>
            <TouchableOpacity onPress={() => setShowTimePicker(true)}><Text style={[styles.ifReset, { color: theme.textSecondary }]}>Edit start</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setShowEndTimePicker(true)}><Text style={[styles.ifReset, { color: theme.textSecondary }]}>Edit end</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => { setIfStart(null); setIfEnd(null); saveToFirebase(todayKey,'ifStart',null); saveToFirebase(todayKey,'ifEnd',null); }}>
              <Text style={[styles.ifReset, { color: theme.accentRed }]}>Reset</Text>
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
              <DateTimePicker mode="time" value={pickerTime||(ifEnd ? new Date(ifEnd) : new Date())} display="spinner" textColor={theme.textPrimary} onChange={(_,d)=>{ if(d) setPrickerTime(d); }} />
            </View>
          )}
        </View>
      ) : (
        <View>
          <View style={styles.ifRow}>
            <View style={{ flex:1 }}>
              <Text style={[styles.ifLabel,{marginBottom:4, color: theme.textMuted}]}>{isOpen ? 'Window closes in' : 'Window closed'}</Text>
              <Text style={[styles.ifCountdown, { color: theme.accentBlueRaw }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
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
            <TouchableOpacity onPress={() => setShowTimePicker(true)}><Text style={[styles.ifReset, { color: theme.textSecondary }]}>Reset window</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => { setIfStart(null); setIfEnd(null); saveToFirebase(todayKey,'ifStart',null); }}>
              <Text style={[styles.ifReset,{ color: theme.accentRed }]}>Cancel fast</Text>
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
              <DateTimePicker mode="time" value={pickerTime||(ifStart ? new Date(ifStart) : new Date())} display="spinner" textColor={theme.textPrimary} onChange={(_,d)=>{ if(d) setPrickerTime(d); }} />
            </View>
          )}
        </View>
      )}
    </View>
  );

  const renderCaloriesCard = () => (
    <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: theme.borderCardTop }]}>
      <View style={{ flexDirection:'row', alignItems:'flex-start', justifyContent:'space-between', marginBottom:4 }}>
        <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
          <Ionicons name="flame-outline" size={11} color={theme.textMuted} />
          <Text style={[styles.cardLabel, { marginBottom:0, color: theme.textMuted }]}>Calories Today</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/(tabs)/log')} activeOpacity={0.6}
          style={{ backgroundColor: theme.accentBlueBg, borderWidth:1, borderColor: theme.accentBlueBorder, borderRadius:6, paddingHorizontal:10, paddingVertical:4 }}>
          <Text style={{ color: theme.accentBlue, fontSize:12, fontFamily:'DMSans_600SemiBold' }}>+ Log</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.calRow}>
        <Text style={[styles.calNumber, { color:calColor }]}>{totalCals}</Text>
        <Text style={[styles.calTarget, { color: theme.textSecondary }]}>/ {adjustedTarget} kcal</Text>
      </View>
      <AnimatedProgressBar pct={calPct} color={calColor} trackColor={theme.bgProgressTrack} refreshKey={refreshKey} />
      <Text style={[styles.calRemaining, { color: theme.textMuted, fontFamily:'DMSans_700Bold', fontSize:10, letterSpacing:1.5, textTransform:'uppercase' }]}>
        {(() => { const diff = adjustedTarget - totalCals; return diff > 0 ? `${diff} kcal remaining · ${displayedBurned} burned` : `${Math.abs(diff)} kcal over · ${displayedBurned} burned`; })()}
      </Text>
    </View>
  );

  const renderMacrosCard = () => {
    const macros = [
      { label: 'Protein', val: totalProtein, goal: macroGoals.protein, color: theme.macroProtein },
      { label: 'Carbs',   val: totalCarbs,   goal: macroGoals.carbs,   color: theme.macroCarbs },
      { label: 'Fat',     val: totalFat,     goal: macroGoals.fat,     color: theme.macroFat },
    ];
    return (
      <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: theme.borderCardTop }]}>
        <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
            <Ionicons name="pie-chart-outline" size={11} color={theme.textMuted} />
            <Text style={[styles.cardLabel, { marginBottom:0, color: theme.textMuted }]}>Macros Today</Text>
          </View>
          <Text style={{ fontSize:9, color: theme.textDim, fontFamily:'DMSans_700Bold', letterSpacing:1.5, textTransform:'uppercase' }}>vs goal</Text>
        </View>
        <View style={{ gap:7 }}>
          {macros.map(m => {
            const pct = m.goal > 0 ? Math.min((m.val / m.goal) * 100, 100) : 0;
            const over = m.goal > 0 && m.val > m.goal;
            return (
              <View key={m.label}>
                <View style={{ flexDirection:'row', alignItems:'baseline', justifyContent:'space-between', marginBottom:4 }}>
                  <Text style={{ fontSize:11, color: theme.textMuted, fontFamily:'DMSans_700Bold', letterSpacing:2, textTransform:'uppercase', flex:1 }}>{m.label}</Text>
                  <View style={{ flexDirection:'row', alignItems:'baseline', gap:4, width:120, justifyContent:'flex-end' }}>
                    <Text style={{ fontSize:20, color: over ? theme.macroOver : m.color, fontFamily:'BebasNeue_400Regular', letterSpacing:1, textAlign:'right' }}>{m.val}</Text>
                    <Text style={{ fontSize:11, color: over ? theme.macroOver : m.color, fontFamily:'DMSans_500Medium' }}>g</Text>
                    <Text style={{ fontSize:11, color: theme.textDim, fontFamily:'DMSans_500Medium' }}>/ {m.goal} g</Text>
                  </View>
                </View>
                <MacroBar val={m.val} goal={m.goal} color={over ? theme.macroOver : m.color} trackColor={theme.bgProgressTrack} />
                <Text style={{ fontSize:9, color: over ? theme.macroOver : m.color, fontFamily:'DMSans_500Medium', letterSpacing:0.5, marginTop:3, opacity:0.7 }}>
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
    <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: theme.borderCardTop }]}>
      <View style={{ flexDirection:'row', alignItems:'center', gap:6, marginBottom:10 }}>
        <Ionicons name="water-outline" size={11} color={theme.textMuted} />
        <Text style={[styles.cardLabel, { marginBottom:0, color: theme.textMuted }]}>Water · {water}oz / {WATER_TARGET}oz</Text>
      </View>
      <AnimatedProgressBar pct={Math.min(100,(water/WATER_TARGET)*100)} color={theme.accentBlue} trackColor={theme.bgProgressTrack} refreshKey={refreshKey} />
      <View style={styles.waterBtns}>
        {waterPresets.map((oz,i) => (
          <PressableButton key={i} style={[styles.waterBtn, { backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder }]} onPress={() => { const n=Math.min(WATER_TARGET,water+oz); setWater(n); saveToFirebase(todayKey,'water',n); showToast('Water logged', `+${oz} oz · ${n} oz total`, 'info'); }}>
            <Text style={[styles.waterBtnText, { color: theme.accentBlue }]}>+{oz} oz</Text>
          </PressableButton>
        ))}
        <PressableButton style={[styles.waterBtn, { backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder }]} onPress={() => { setWaterCustomSign('add'); setWaterCustomInput(''); setShowWaterCustomModal(true); }}>
          <View style={{ alignItems:'center', justifyContent:'center', width:20, height:20 }}>
            <Ionicons name="water-outline" size={18} color={theme.accentBlue} />
            <Text style={{ color: theme.accentBlue, fontSize:9, fontFamily:'DMSans_700Bold', position:'absolute', bottom:-2, right:-4 }}>+</Text>
          </View>
        </PressableButton>
      </View>
      <View style={[styles.waterBtns, { marginTop:8 }]}>
        {waterPresets.map((oz,i) => (
          <PressableButton key={i} style={[styles.waterBtnRed, { backgroundColor: theme.accentRedBg, borderColor: theme.accentRedBorder }]} onPress={() => { const n=Math.max(0,water-oz); setWater(n); saveToFirebase(todayKey,'water',n); showToast('Water removed', `-${oz} oz · ${n} oz total`, 'info'); }}>
            <Text style={[styles.waterBtnRedText, { color: theme.accentRed }]}>-{oz} oz</Text>
          </PressableButton>
        ))}
        <PressableButton style={[styles.waterBtnRed, { backgroundColor: theme.accentRedBg, borderColor: theme.accentRedBorder }]} onPress={() => { setWaterCustomSign('subtract'); setWaterCustomInput(''); setShowWaterCustomModal(true); }}>
          <View style={{ alignItems:'center', justifyContent:'center', width:20, height:20 }}>
            <Ionicons name="water-outline" size={18} color={theme.accentRed} />
            <Text style={{ color: theme.accentRed, fontSize:9, fontFamily:'DMSans_700Bold', position:'absolute', bottom:-2, right:-4 }}>-</Text>
          </View>
        </PressableButton>
      </View>
    </View>
  );

  const renderWeightCard = () => (
    <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: theme.borderCardTop }]}>
      <View style={{ flexDirection:'row', alignItems:'center', gap:6, marginBottom:10 }}>
        <Ionicons name="trending-down-outline" size={11} color={theme.textMuted} />
        <Text style={[styles.cardLabel, { marginBottom:0, color: theme.textMuted }]}>Weight</Text>
      </View>
      <View style={styles.weightRow}>
        <View style={styles.weightStat}>
          <Text style={[styles.weightVal, { color: weight ? theme.textPrimary : theme.textDim }]}>
            {weight ? `${weight} lbs` : lastKnownWeight ? `${lastKnownWeight.val} lbs` : '--'}
          </Text>
          <Text style={[styles.weightLbl, { color: theme.textMuted }]}>
            {weight ? 'Today' : lastKnownWeight ? `${lastKnownWeight.daysAgo}d ago` : 'Today'}
          </Text>
        </View>
        <View style={styles.weightStat}>
          <Text style={[styles.weightVal, { color: weight&&yesterdayWeight ? weight<yesterdayWeight ? theme.statusGood : weight>yesterdayWeight ? theme.statusBad : theme.textPrimary : theme.textPrimary }]}>
            {weight&&yesterdayWeight ? `${weight>yesterdayWeight?'+':''}${Math.round((weight-yesterdayWeight)*10)/10}` : '--'}
          </Text>
          <Text style={[styles.weightLbl, { color: theme.textMuted }]}>vs Yesterday</Text>
        </View>
        <View style={styles.weightStat}>
          <Text style={[styles.weightVal, { color: weight&&earliestWeight ? earliestWeight-weight>0 ? theme.statusGood : earliestWeight-weight<0 ? theme.statusBad : theme.textPrimary : theme.textPrimary }]}>
            {weight&&earliestWeight ? `${Math.round((earliestWeight-weight)*10)/10} lbs` : '--'}
          </Text>
          <Text style={[styles.weightLbl, { color: theme.textMuted }]}>Total Lost</Text>
        </View>
      </View>
      <View style={styles.weightAdd}>
        <TextInput style={[styles.weightInput, { backgroundColor: theme.bgInput, borderColor: theme.borderInput, color: theme.textPrimary }]} placeholder="Enter weight (lbs)" placeholderTextColor={theme.textPlaceholder}
          keyboardType="decimal-pad" value={weightInput} onChangeText={setWeightInput} />
        <PressableButton style={[styles.logBtn, { backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder }]} onPress={logWeight}>
          <Text style={[styles.logBtnText, { color: theme.accentBlue }]}>LOG</Text>
        </PressableButton>
      </View>
    </View>
  );

  const renderWorkoutCard = () => {
    const todayProgram = workoutPrograms[todayKey] || workoutTemplate[todayDay] || { type: 'cardio', focus: 'Cardio', color: '#888888', exercises: [] };
    const exercises = todayProgram?.exercises || [];
    const dayChecks = workoutChecks[todayKey] || {};
    const doneCount = exercises.filter((ex: any) => dayChecks[ex.id]).length;
    const pillColor = todayProgram?.color || '#888888';
    const MAX_DISPLAY = 4;
    const displayExercises = exercises.slice(0, MAX_DISPLAY);
    const overflow = exercises.length - MAX_DISPLAY;
    const burnedDisplay = hkCalories > 0 ? hkCalories : caloriesBurned;
    const cardScale = new Animated.Value(1);

    const onPressIn = () => Animated.timing(cardScale, { toValue: 0.97, duration: 100, useNativeDriver: true }).start();
    const onPressOut = () => Animated.timing(cardScale, { toValue: 1, duration: 150, useNativeDriver: true }).start();

    return (
      <Animated.View style={{ transform: [{ scale: cardScale }] }}>
      <TouchableOpacity
        activeOpacity={0.99}
        delayPressIn={0}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={() => router.push('/(tabs)/workout')}
        style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: theme.borderCardTop, padding: 16 }]}>
        <View style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
              <Ionicons name="barbell-outline" size={11} color={theme.textMuted} />
              <Text style={[styles.cardLabel, { marginBottom:0, color: theme.textMuted }]}>Today's Training</Text>
            </View>
          </View>
          {(() => {
            const programTags = todayProgram?.tags || [];
            if (programTags.length === 0) {
              return (
                <View style={{ flexDirection: 'row' }}>
                  <View style={{ borderWidth: 1, borderColor: theme.borderSubtle, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 }}>
                    <Text style={{ fontSize: 9, fontFamily: 'DMSans_700Bold', letterSpacing: 2, color: theme.textDim }}>
                      {todayProgram?.customLabel || todayProgram?.focus || 'UNASSIGNED'}
                    </Text>
                  </View>
                </View>
              );
            }
            const row1 = programTags.slice(0, 3);
            const row2 = programTags.slice(3, 6);
            const extra = programTags.length > 6 ? programTags.length - 6 : 0;
            const renderPill = (tagId: string) => {
              const tag = workoutTags.find((t: any) => t.id === tagId);
              if (!tag) return null;
              return (
                <View key={tagId} style={{ backgroundColor: tag.color + '99', borderWidth: 1, borderColor: tag.color, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 }}>
                  <Text style={{ fontSize: 9, fontFamily: 'DMSans_700Bold', letterSpacing: 2, color: '#ffffff' }}>{tag.label.toUpperCase()}</Text>
                </View>
              );
            };
            return (
              <View style={{ gap: 5 }}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {row1.map(renderPill)}
                </View>
                {row2.length > 0 && (
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {row2.map(renderPill)}
                    {extra > 0 && (
                      <View style={{ borderWidth: 1, borderColor: theme.borderSubtle, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 }}>
                        <Text style={{ fontSize: 9, fontFamily: 'DMSans_700Bold', letterSpacing: 2, color: theme.textDim }}>+{extra}</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })()}
        </View>

        {exercises.length === 0 ? (
          <Text style={{ fontSize: 12, color: theme.textDim, fontFamily: 'DMSans_400Regular', fontStyle: 'italic' }}>No exercises logged yet</Text>
        ) : (
          <View style={{ gap: 6, marginBottom: 10 }}>
            {displayExercises.map((ex: any) => {
              const done = dayChecks[ex.id];
              return (
                <View key={ex.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: done ? theme.textDim : pillColor }} />
                  <Text style={{ fontSize: 12, fontFamily: done ? 'DMSans_400Regular' : 'DMSans_600SemiBold', color: done ? theme.textDim : theme.textPrimary, textDecorationLine: done ? 'line-through' : 'none', flex: 1 }}>
                    {ex.name}
                  </Text>
                  {!ex.isCardio && (
                    <Text style={{ fontSize: 10, color: theme.textDim, fontFamily: 'DMSans_400Regular' }}>{ex.sets}x{ex.reps}</Text>
                  )}
                  {ex.isCardio && ex.duration && (
                    <Text style={{ fontSize: 10, color: theme.textDim, fontFamily: 'DMSans_400Regular' }}>{ex.duration}min</Text>
                  )}
                </View>
              );
            })}
            {overflow > 0 && (
              <Text style={{ fontSize: 11, color: theme.textDim, fontFamily: 'DMSans_400Regular', fontStyle: 'italic', marginTop: 2 }}>+{overflow} more · tap to view</Text>
            )}
          </View>
        )}

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTopWidth: 0.5, borderTopColor: theme.borderSubtle }}>
          <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: 'DMSans_700Bold', letterSpacing: 2, textTransform: 'uppercase' }}>
            {doneCount}/{exercises.length} complete
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
            {burnedDisplay > 0 ? (
              <>
                <Text style={{ fontSize: 22, color: theme.accentAmber, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1 }}>{burnedDisplay}</Text>
                <Text style={{ fontSize: 10, color: theme.textMuted, fontFamily: 'DMSans_400Regular' }}>kcal burned</Text>
              </>
            ) : (
              <Text style={{ fontSize: 11, color: theme.textDim, fontFamily: 'DMSans_400Regular', fontStyle: 'italic' }}>no burn data</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderStepsCard = () => {
    const pct = stepGoal > 0 ? steps / stepGoal : 0;
    const stepColor = pct >= 1 ? theme.statusGood : pct >= 0.7 ? theme.statusWarn : theme.statusBad;
    return (
      <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: theme.borderCardTop }]}>
        <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
          <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
            <Ionicons name="footsteps-outline" size={11} color={theme.textMuted} />
            <Text style={[styles.cardLabel, { marginBottom:0, color: theme.textMuted }]}>Steps Today</Text>
          </View>
          <TouchableOpacity onPress={() => setEditingStepGoal(true)}
            style={{ backgroundColor: theme.accentBlueBg, borderWidth:1, borderColor: theme.accentBlueBorder, borderRadius:6, paddingHorizontal:10, paddingVertical:4 }}>
            <Text style={{ color: theme.accentBlue, fontSize:12, fontFamily:'DMSans_600SemiBold' }}>Goal: {stepGoal.toLocaleString()}</Text>
          </TouchableOpacity>
        </View>
        {editingStepGoal && (
          <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginBottom:10 }}>
            <TextInput style={{ flex:1, backgroundColor: theme.bgInput, borderWidth:1, borderColor: theme.borderInput, borderRadius:6, color: theme.textPrimary, padding:8, fontSize:14, fontFamily:'DMSans_400Regular' }}
              value={String(stepGoal)} onChangeText={v => setStepGoal(parseInt(v)||0)} keyboardType="number-pad" autoFocus />
            <TouchableOpacity onPress={async () => {
              setEditingStepGoal(false);
              const saved = await AsyncStorage.getItem('pj_profile');
              const p = saved ? JSON.parse(saved) : {};
              await AsyncStorage.setItem('pj_profile', JSON.stringify({...p, stepGoal: String(stepGoal)}));
              await saveToFirebase('profile','data',{...p, stepGoal: String(stepGoal)});
            }} style={{ backgroundColor: theme.accentGreen, borderRadius:6, paddingHorizontal:12, paddingVertical:8 }}>
              <Text style={{ color: theme.bgPrimary, fontSize:13, fontFamily:'DMSans_600SemiBold' }}>Save</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={{ flexDirection:'row', alignItems:'baseline', gap:6, marginBottom:6 }}>
          <Text style={{ fontSize:36, color:stepColor, fontFamily:'BebasNeue_400Regular', letterSpacing:1 }}>{steps.toLocaleString()}</Text>
          <Text style={{ fontSize:13, color: theme.textMuted, fontFamily:'DMSans_400Regular' }}>/ {stepGoal.toLocaleString()} steps</Text>
        </View>
        <View style={{ marginBottom:8 }}>
          <AnimatedProgressBar pct={Math.min(pct*100,100)} color={stepColor} trackColor={theme.bgProgressTrack} refreshKey={refreshKey} />
        </View>
        <Text style={{ fontSize:9, color: theme.textMuted, fontFamily:'DMSans_700Bold', letterSpacing:2, textTransform:'uppercase' }}>{distance} mi walked today</Text>
      </View>
    );
  };

  const renderSleepCard = () => {
    const displaySleep = sleepOverride ?? sleepHours;
    return (
      <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: theme.borderCardTop }]}>
        <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
          <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
            <Ionicons name="moon-outline" size={11} color={theme.textMuted} />
            <Text style={[styles.cardLabel, { marginBottom:0, color: theme.textMuted }]}>Sleep Last Night</Text>
          </View>
          <TouchableOpacity onPress={() => setEditingSleep(!editingSleep)}
            style={{ backgroundColor: theme.accentBlueBg, borderWidth:1, borderColor: theme.accentBlueBorder, borderRadius:6, paddingHorizontal:10, paddingVertical:4 }}>
            <Text style={{ color: theme.accentBlue, fontSize:12, fontFamily:'DMSans_600SemiBold' }}>{sleepOverride ? 'Manual' : 'Edit'}</Text>
          </TouchableOpacity>
        </View>
        {editingSleep && (
          <View style={{ marginBottom:10 }}>
            <View style={{ flexDirection:'row', gap:8, marginBottom:8 }}>
              <TouchableOpacity onPress={() => setShowBedTimePicker(true)} style={{ flex:1, backgroundColor: theme.bgInput, borderWidth:1, borderColor: theme.borderInput, borderRadius:6, padding:10, alignItems:'center' }}>
                <Text style={{ fontSize:10, color: theme.textMuted, fontFamily:'DMSans_400Regular', marginBottom:2 }}>Bed Time</Text>
                <Text style={{ fontSize:16, color: sleepBedTime ? theme.textPrimary : theme.textPlaceholder, fontFamily:'DMSans_600SemiBold' }}>
                  {sleepBedTime ? sleepBedTime.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : 'Tap to set'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowWakeTimePicker(true)} style={{ flex:1, backgroundColor: theme.bgInput, borderWidth:1, borderColor: theme.borderInput, borderRadius:6, padding:10, alignItems:'center' }}>
                <Text style={{ fontSize:10, color: theme.textMuted, fontFamily:'DMSans_400Regular', marginBottom:2 }}>Wake Time</Text>
                <Text style={{ fontSize:16, color: sleepWakeTime ? theme.textPrimary : theme.textPlaceholder, fontFamily:'DMSans_600SemiBold' }}>
                  {sleepWakeTime ? sleepWakeTime.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : 'Tap to set'}
                </Text>
              </TouchableOpacity>
            </View>
            {sleepBedTime && sleepWakeTime && (
              <Text style={{ fontSize:12, color: theme.textMuted, fontFamily:'DMSans_400Regular', textAlign:'center', marginBottom:8 }}>
                {(() => { let diff=sleepWakeTime.getTime()-sleepBedTime.getTime(); if(diff<0) diff+=24*3600000; return `${Math.round(diff/3600000*10)/10} hrs of sleep`; })()}
              </Text>
            )}
            {showBedTimePicker && (
              <View>
                <View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:8 }}>
                  <TouchableOpacity onPress={() => setShowBedTimePicker(false)}><Text style={{ color: theme.textSecondary, fontSize:12, fontFamily:'DMSans_500Medium' }}>Cancel</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => setShowBedTimePicker(false)}><Text style={{ color: theme.accentGreen, fontSize:12, fontFamily:'DMSans_600SemiBold' }}>Confirm</Text></TouchableOpacity>
                </View>
                <DateTimePicker mode="time" value={sleepBedTime||new Date()} display="spinner" textColor={theme.textPrimary} onChange={(_,d)=>{ if(d) setSleepBedTime(d); }} />
              </View>
            )}
            {showWakeTimePicker && (
              <View>
                <View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:8 }}>
                  <TouchableOpacity onPress={() => setShowWakeTimePicker(false)}><Text style={{ color: theme.textSecondary, fontSize:12, fontFamily:'DMSans_500Medium' }}>Cancel</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => setShowWakeTimePicker(false)}><Text style={{ color: theme.accentGreen, fontSize:12, fontFamily:'DMSans_600SemiBold' }}>Confirm</Text></TouchableOpacity>
                </View>
                <DateTimePicker mode="time" value={sleepWakeTime||new Date()} display="spinner" textColor={theme.textPrimary} onChange={(_,d)=>{ if(d) setSleepWakeTime(d); }} />
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
              }} style={{ flex:1, backgroundColor: theme.accentGreen, borderRadius:6, padding:10, alignItems:'center' }}>
                <Text style={{ color: theme.bgPrimary, fontSize:13, fontFamily:'DMSans_600SemiBold' }}>Save</Text>
              </TouchableOpacity>
              {sleepOverride && (
                <TouchableOpacity onPress={async () => {
                  setSleepOverride(null);
                  const saved=await AsyncStorage.getItem(`pj_${todayKey}`);
                  const current=saved?JSON.parse(saved):{};
                  delete current.sleepOverride;
                  await AsyncStorage.setItem(`pj_${todayKey}`,JSON.stringify(current));
                  setEditingSleep(false);
                }} style={{ backgroundColor: theme.accentRedBg, borderWidth:1, borderColor: theme.accentRedBorder, borderRadius:6, paddingHorizontal:16, alignItems:'center' }}>
                  <Text style={{ color: theme.accentRed, fontSize:13, fontFamily:'DMSans_500Medium' }}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
        {displaySleep === null ? (
          <Text style={{ fontSize:13, color: theme.textDim, fontFamily:'DMSans_400Regular', fontStyle:'italic' }}>No sleep data for last night</Text>
        ) : (() => {
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
          const { score, hasStages } = calcSleepScore(displaySleep, sleepStages, sleepGoal);
          const scoreColor = score >= 85 ? theme.statusGood : score >= 70 ? theme.statusWarn : theme.statusBad;
          const scoreLabel = score >= 85 ? 'Well Rested' : score >= 70 ? 'Could Be Better' : 'Poor Sleep';
          const tip = getSleepTip(score, displaySleep, sleepStages, sleepGoal, todayKey);
          return (
            <View>
              <View style={{ flexDirection:'row', alignItems:'flex-start' }}>
                <View style={{ width:160, paddingRight:12 }}>
                  <Text style={{ fontSize:42, color:scoreColor, fontFamily:'BebasNeue_400Regular', letterSpacing:1 }}>{hrs}h {mins}m</Text>
                  <Text style={{ fontSize:9, color:scoreColor, fontFamily:'DMSans_700Bold', letterSpacing:2, textTransform:'uppercase', marginBottom:10 }}>
                    {scoreLabel}{sleepOverride?' · manual':''}{!hasStages?' · duration only':''}
                  </Text>
                  {((sleepStoredBed&&sleepStoredWake)||sleepTimes) ? (
                    <Text style={{ fontSize:12, color: theme.textMuted, fontFamily:'DMSans_500Medium', marginBottom:10 }}>
                      {sleepStoredBed||sleepTimes?.bed} → {sleepStoredWake||sleepTimes?.wake}
                    </Text>
                  ) : null}
                  {sleepStages && (
                    <View style={{ gap:6 }}>
                      {[{label:'Core',color:theme.sleepCore,val:coreMs},{label:'Deep',color:theme.sleepDeep,val:deepMs},{label:'REM',color:theme.sleepRem,val:remMs}].map(s => (
                        <View key={s.label} style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
                          <View style={{ width:8, height:8, borderRadius:4, backgroundColor:s.color }} />
                          <Text style={{ fontSize:9, color: theme.textMuted, fontFamily:'DMSans_700Bold', letterSpacing:1, textTransform:'uppercase' }}>{s.label}</Text>
                          <Text style={{ fontSize:11, color:s.color, fontFamily:'DMSans_600SemiBold' }}>{fmtMs(s.val)}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
                {sleepStages && (
                  <SleepDonut
                    coreFrac={coreFrac} deepFrac={deepFrac} remFrac={remFrac}
                    donutCirc={donutCirc} donutSize={donutSize} donutStroke={donutStroke} donutRadius={donutRadius}
                    coreColor={theme.sleepCore} deepColor={theme.sleepDeep} remColor={theme.sleepRem}
                    trackColor={theme.sleepTrack} gapFrac={gapFrac} refreshKey={refreshKey}
                    score={score} scoreColor={scoreColor}
                  />
                )}
              </View>
              {tip && (
                <View style={{ marginTop:10, paddingTop:10, borderTopWidth:0.5, borderTopColor:theme.borderSubtle }}>
                  <View style={{ flexDirection:'row', alignItems:'flex-start', gap:6 }}>
                    <Ionicons name="bulb-outline" size={11} color={theme.textMuted} style={{ marginTop:2 }} />
                    <Text style={{ fontSize:11, color:theme.textMuted, fontFamily:'DMSans_400Regular', fontStyle:'italic', flex:1, lineHeight:17 }}>{tip}</Text>
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
    <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: theme.borderCardTop }]}>
      <View style={{ flexDirection:'row', alignItems:'center', gap:6, marginBottom:10 }}>
        <Ionicons name="heart-outline" size={11} color={theme.textMuted} />
        <Text style={[styles.cardLabel, { marginBottom:0, color: theme.textMuted }]}>Fitness Metrics</Text>
      </View>
      {(vo2Max === null && cardioRecovery === null) ? (
        <View style={{ alignItems:'center', paddingVertical:16, gap:6 }}>
          <Ionicons name="fitness-outline" size={28} color={theme.iconMuted} />
          <Text style={{ fontSize:12, color: theme.textDim, fontFamily:'DMSans_400Regular', fontStyle:'italic' }}>No fitness data available</Text>
          <Text style={{ fontSize:10, color: theme.textDim, fontFamily:'DMSans_400Regular', textAlign:'center' }}>VO2 Max & Cardio Recovery sync from Apple Health</Text>
        </View>
      ) : (
        <View style={{ flexDirection:'row', gap:8 }}>
          {vo2Max !== null && (
            <View style={{ flex:1, backgroundColor: theme.bgInset, borderRadius:8, padding:12, alignItems:'center' }}>
              <Text style={{ fontSize:28, color: theme.accentBlue, fontFamily:'BebasNeue_400Regular', letterSpacing:1 }}>{vo2Max}</Text>
              <Text style={{ fontSize:10, color: theme.textMuted, fontFamily:'DMSans_500Medium', textTransform:'uppercase', letterSpacing:1, marginTop:2 }}>VO2 Max</Text>
              <Text style={{ fontSize:9, color: theme.textDim, fontFamily:'DMSans_400Regular', marginTop:2 }}>ml/kg/min</Text>
            </View>
          )}
          {cardioRecovery !== null && (
            <View style={{ flex:1, backgroundColor: theme.bgInset, borderRadius:8, padding:12, alignItems:'center' }}>
              <Text style={{ fontSize:28, color: theme.accentGreen, fontFamily:'BebasNeue_400Regular', letterSpacing:1 }}>{cardioRecovery}</Text>
              <Text style={{ fontSize:10, color: theme.textMuted, fontFamily:'DMSans_500Medium', textTransform:'uppercase', letterSpacing:1, marginTop:2 }}>Cardio Recovery</Text>
              <Text style={{ fontSize:9, color: theme.textDim, fontFamily:'DMSans_400Regular', marginTop:2 }}>bpm drop / 1min</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );

  const renderDailyNoteCard = () => (
    <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: theme.borderCardTop }]}>
      <View style={{ flexDirection:'row', alignItems:'center', gap:6, marginBottom:10 }}>
        <Ionicons name="journal-outline" size={11} color={theme.textMuted} />
        <Text style={[styles.cardLabel, { marginBottom:0, color: theme.textMuted }]}>Daily Note</Text>
      </View>
      <TextInput style={[styles.notesInput, { backgroundColor: theme.bgInput, borderColor: theme.borderInput, color: theme.textPrimary }]} placeholder="How did today go? Workout, diet, energy..." placeholderTextColor={theme.textPlaceholder}
        multiline numberOfLines={4} value={dailyNote} onChangeText={setDailyNote} />
      <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.bgInset, borderColor: theme.borderInset }]} onPress={() => {}}>
        <Text style={[styles.saveBtnText, { color: theme.textSecondary }]}>Save Note</Text>
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
    <View style={{ flex: 1 }}>
    <LinearGradient
      colors={[theme.gradientStart, theme.gradientEnd]}
      style={[styles.container, { paddingTop: insets.top }]}
    >

      {/* ── Header ── */}
      <View style={[styles.header, { borderBottomColor: theme.borderCard }]}>
        <View style={{ flex:1 }}>
          <Text style={[styles.headerLabel, { color: theme.textMuted }]}>PROJECT J</Text>
          <Text style={[styles.headerTitle, { color: theme.accentBlueRaw }]}>
            {(() => { const h=new Date().getHours(); return h<12?'Good morning':h<17?'Good afternoon':'Good evening'; })()}
          </Text>
          <Text style={{ fontSize:9, color: theme.textMuted, fontFamily:'DMSans_700Bold', marginTop:1, letterSpacing:2, textTransform:'uppercase' }}>
            {new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}
          </Text>
        </View>

        <View style={{ flexDirection:'row', gap:8 }}>
            <TouchableOpacity onPress={() => { fetchTodayData(); setRefreshKey(k=>k+1); showToast('Health data refreshed', undefined, 'info'); }}
              style={[styles.headerBtn, { backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder }]}>
              <Ionicons name="refresh-outline" size={14} color={theme.accentBlue} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push({ pathname:'/day-detail', params:{ date:todayKey } })}
              style={[styles.headerBtn, { backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder }]}>
              <Ionicons name="calendar-outline" size={14} color={theme.accentBlue} />
            </TouchableOpacity>
            <TouchableOpacity onPress={enterEditMode} style={[styles.headerBtn, { backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder }]}>
              <Ionicons name="grid-outline" size={14} color={theme.accentBlue} />
            </TouchableOpacity>
          </View>
      </View>

      {/* ── Water custom modal ── */}
      {showWaterCustomModal && (
        <View style={{ position:'absolute', top:0, bottom:0, left:0, right:0, backgroundColor: theme.overlayBg, justifyContent:'center', alignItems:'center', zIndex:999 }}>
          <View style={{ backgroundColor: theme.bgCard, borderRadius:14, padding:24, width:'80%', borderWidth:0.5, borderColor: theme.borderCard }}>
            <Text style={{ fontSize:9, color: theme.textMuted, fontFamily:'DMSans_700Bold', letterSpacing:2, textTransform:'uppercase', marginBottom:12 }}>
              {waterCustomSign==='add' ? 'Add Custom Amount' : 'Remove Custom Amount'}
            </Text>
            <TextInput style={{ backgroundColor: theme.bgInput, borderWidth:0.5, borderColor: theme.borderInput, borderRadius:8, color: theme.textPrimary, padding:12, fontSize:24, fontFamily:'BebasNeue_400Regular', textAlign:'center', marginBottom:16 }}
              value={waterCustomInput} onChangeText={setWaterCustomInput} keyboardType="number-pad" placeholder="0" placeholderTextColor={theme.textPlaceholder} autoFocus />
            <Text style={{ fontSize:9, color: theme.textMuted, fontFamily:'DMSans_700Bold', letterSpacing:1, textTransform:'uppercase', textAlign:'center', marginBottom:16 }}>oz</Text>
            <View style={{ flexDirection:'row', gap:10 }}>
              <TouchableOpacity style={{ flex:1, padding:12, borderRadius:8, backgroundColor: theme.bgInput, alignItems:'center' }} onPress={() => setShowWaterCustomModal(false)}>
                <Text style={{ color: theme.textMuted, fontFamily:'DMSans_600SemiBold', fontSize:14 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flex:1, padding:12, borderRadius:8, backgroundColor: waterCustomSign==='add' ? theme.accentBlueBg : theme.accentRedBg, alignItems:'center' }}
                onPress={() => {
                  const amt=parseInt(waterCustomInput);
                  if(amt>0){ const n=waterCustomSign==='add'?Math.min(WATER_TARGET,water+amt):Math.max(0,water-amt); setWater(n); saveToFirebase(todayKey,'water',n); showToast('Water logged', `${waterCustomSign==='add'?'+':'-'}${amt} oz · ${n} oz total`, 'info'); }
                  setShowWaterCustomModal(false);
                }}>
                <Text style={{ color: waterCustomSign==='add' ? theme.accentBlue : theme.accentRed, fontFamily:'DMSans_600SemiBold', fontSize:14 }}>
                  {waterCustomSign==='add'?'Add':'Remove'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* ── Main content ── */}
      <ScrollView
        contentContainerStyle={{ padding:16, paddingBottom:80 }}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => { fetchTodayData(); setRefreshKey(k => k + 1); showToast('Health data refreshed', undefined, 'info'); }}
            tintColor={theme.accentBlue}
          />
        }
      >
        {visibleCards.map((id) => (
          <View key={id}>
            {renderCardById(id)}
          </View>
        ))}
      </ScrollView>

      </LinearGradient>
      {editModalVisible && (
        <Modal transparent animationType="none" visible={editModalVisible} onRequestClose={exitEditMode} statusBarTranslucent hardwareAccelerated>
          <Animated.View style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            opacity: editSheetAnim,
          }}>
            <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={exitEditMode} />
          </Animated.View>
          <Animated.View style={[styles.editSheet, {
            backgroundColor: theme.bgSheet,
            borderColor: theme.borderSheet,
            transform: [{ translateY: editSheetAnim.interpolate({ inputRange: [0,1], outputRange: [900, 0] }) }],
          }]}>
            <View style={[styles.editSheetHandle, { backgroundColor: theme.sheetHandle }]} />
            <View style={[styles.editSheetHeader, { borderBottomColor: theme.borderSubtle }]}>
              <TouchableOpacity onPress={openCardSheet}
                style={{ backgroundColor: theme.accentBlueBg, borderWidth:1, borderColor: theme.accentBlueBorder, borderRadius:6, paddingHorizontal:12, paddingVertical:6, height:32, alignItems:'center', justifyContent:'center', flexDirection:'row', gap:4 }}>
                <Ionicons name="add" size={14} color={theme.accentBlue} />
                <Text style={{ color: theme.accentBlue, fontSize:12, fontFamily:'DMSans_600SemiBold' }}>Add</Text>
              </TouchableOpacity>
              <Text style={{ fontSize:13, color: theme.textMuted, fontFamily:'DMSans_700Bold', letterSpacing:2, textTransform:'uppercase' }}>Edit Layout</Text>
              <TouchableOpacity onPress={exitEditMode}
                style={{ backgroundColor: theme.accentGreenBg, borderWidth:1, borderColor: theme.accentGreenBorder, borderRadius:6, paddingHorizontal:14, paddingVertical:6, height:32, alignItems:'center', justifyContent:'center' }}>
                <Text style={{ color: theme.accentGreen, fontSize:12, fontFamily:'DMSans_700Bold', letterSpacing:1 }}>DONE</Text>
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
                        style={[styles.editBadge, { backgroundColor: visible ? theme.accentRedBg : theme.accentGreenBg, borderColor: visible ? theme.accentRedBorder : theme.accentGreenBorder }]}>
                        <Ionicons name={visible ? 'remove' : 'add'} size={14} color={visible ? theme.accentRed : theme.accentGreen} />
                      </TouchableOpacity>
                      <View style={[styles.editCardPreview, { backgroundColor: theme.bgEditCard, borderColor: theme.borderCard }, !visible && { opacity:0.35 }]}>
                        <Text style={[styles.editCardLabel, { color: theme.textPrimary }]}>{meta.label}</Text>
                        <Text style={[styles.editCardDesc, { color: theme.textDim }]}>{meta.description}</Text>
                      </View>
                      <TouchableOpacity onLongPress={drag} delayLongPress={0} style={styles.dragHandle}>
                        <Ionicons name="menu-outline" size={20} color={theme.textDim} />
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
          <TouchableOpacity style={[styles.sheetOverlay, { backgroundColor: theme.overlayBg }]} activeOpacity={1} onPress={closeCardSheet} />
          <Animated.View style={[styles.sheet, { backgroundColor: theme.bgSheet, borderColor: theme.borderSheet, transform:[{ translateY: sheetTranslate }] }]}>
            <View style={[styles.sheetHandle, { backgroundColor: theme.sheetHandle }]} />
            <Text style={[styles.sheetTitle, { color: theme.textPrimary }]}>Add Cards</Text>
            <Text style={[styles.sheetSubtitle, { color: theme.textDim }]}>Toggle cards to show or hide on your home screen</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop:8 }}>
              {CARD_REGISTRY.map(meta => {
                const visible = cardVisible[meta.id];
                return (
                  <TouchableOpacity key={meta.id} onPress={() => toggleCardVisible(meta.id)}
                    style={[styles.sheetRow, { borderBottomColor: theme.borderSubtle }]}>
                    <View style={{ flex:1 }}>
                      <Text style={[styles.sheetRowLabel, { color: visible ? theme.textPrimary : theme.textMuted }]}>{meta.label}</Text>
                      <Text style={[styles.sheetRowDesc, { color: theme.textDim }]}>{meta.description}</Text>
                    </View>
                    <View style={[styles.sheetToggle, { borderColor: theme.borderSubtle, backgroundColor: theme.bgCard }, visible && { borderColor: theme.accentGreenBorder, backgroundColor: theme.accentGreenBg }]}>
                      {visible && <Ionicons name="checkmark" size={14} color={theme.accentGreen} />}
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
  container:        { flex:1 },
  header:           { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:20, paddingVertical:16, borderBottomWidth:0.5, marginBottom:16 },
  headerLabel:      { fontSize:9, letterSpacing:2, textTransform:'uppercase', marginBottom:2, fontFamily:'DMSans_700Bold' },
  headerTitle:      { fontSize:32, fontWeight:'700', fontFamily:'BebasNeue_400Regular', letterSpacing:2 },
  headerBtn:        { borderWidth:1, borderRadius:6, paddingHorizontal:12, paddingVertical:6, height:32, alignItems:'center', justifyContent:'center' },
  card:             { borderWidth:0.5, borderRadius:14, padding:16, marginBottom:12, borderTopWidth:0.5, shadowColor: '#000000', shadowOffset: { width:0, height:4 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6 },
  cardLabel:        { fontSize:10, letterSpacing:3, textTransform:'uppercase', fontFamily:'DMSans_700Bold', marginBottom:10 },
  verseCard:        { borderWidth:2, borderRadius:14, padding:16, marginBottom:12, shadowColor: '#000000', shadowOffset: { width:0, height:4 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6 },
  verseLabel:       { fontSize:9, letterSpacing:3, textTransform:'uppercase', marginBottom:8, fontFamily:'DMSans_700Bold' },
  verseText:        { fontSize:14, fontStyle:'italic', lineHeight:24, marginBottom:10, fontFamily:'DMSans_400Regular', textAlign:'center' },
  verseRef:         { fontSize:9, fontFamily:'DMSans_700Bold', textAlign:'center', letterSpacing:2, textTransform:'uppercase' },
  ifStartBtn:       { borderWidth:1, borderRadius:6, padding:14, alignItems:'center' },
  ifStartBtnText:   { fontFamily:'BebasNeue_400Regular', letterSpacing:2, fontSize:16 },
  ifRow:            { flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  ifLabel:          { fontSize:11, letterSpacing:2, textTransform:'uppercase', fontFamily:'DMSans_500Medium' },
  ifCountdown:      { fontSize:48, lineHeight:52, fontFamily:'BebasNeue_400Regular', letterSpacing:2 },
  ifReset:          { fontSize:11, textDecorationLine:'underline', marginTop:8, fontFamily:'DMSans_400Regular' },
  calRow:           { flexDirection:'row', alignItems:'baseline', gap:6, marginBottom:10 },
  calNumber:        { fontSize:52, lineHeight:56, fontFamily:'BebasNeue_400Regular', letterSpacing:1 },
  calTarget:        { fontSize:14, fontFamily:'DMSans_400Regular' },
  calRemaining:     { fontSize:12, fontFamily:'DMSans_400Regular' },
  progressBarBg:    { height:6, borderRadius:6, overflow:'hidden', marginBottom:12 },
  progressBarFill:  { height:'100%', borderRadius:6 },
  waterBtns:        { flexDirection:'row', gap:8 },
  waterBtn:         { flex:1, padding:10, borderWidth:1, borderRadius:6, alignItems:'center', justifyContent:'center' },
  waterBtnText:     { fontFamily:'BebasNeue_400Regular', fontSize:15, letterSpacing:1 },
  waterBtnRed:      { flex:1, padding:10, borderWidth:1, borderRadius:6, alignItems:'center', justifyContent:'center' },
  waterBtnRedText:  { fontFamily:'BebasNeue_400Regular', fontSize:15, letterSpacing:1 },
  weightRow:        { flexDirection:'row', gap:12, marginBottom:14 },
  weightStat:       { flex:1 },
  weightVal:        { fontSize:28, lineHeight:32, fontFamily:'BebasNeue_400Regular', letterSpacing:1 },
  weightLbl:        { fontSize:10, letterSpacing:2, textTransform:'uppercase', marginTop:2, fontFamily:'DMSans_500Medium' },
  weightAdd:        { flexDirection:'row', gap:8 },
  weightInput:      { flex:1, borderWidth:1, borderRadius:6, padding:10, fontSize:14, fontFamily:'DMSans_400Regular' },
  logBtn:           { borderWidth:1, borderRadius:6, paddingHorizontal:16, justifyContent:'center' },
  logBtnText:       { fontFamily:'BebasNeue_400Regular', fontSize:16, letterSpacing:1 },
  workoutRow:       { flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  workoutDay:       { fontSize:22, letterSpacing:1, fontFamily:'BebasNeue_400Regular' },
  workoutMuscles:   { fontSize:12, marginTop:2, fontFamily:'DMSans_400Regular' },
  workoutPill:      { paddingHorizontal:12, paddingVertical:4, borderRadius:20, borderWidth:1 },
  workoutPillText:  { fontSize:10, letterSpacing:2, fontFamily:'DMSans_600SemiBold' },
  notesInput:       { borderWidth:1, borderRadius:6, padding:10, fontSize:13, minHeight:80, textAlignVertical:'top', marginTop:8, fontFamily:'DMSans_400Regular' },
  saveBtn:          { marginTop:8, padding:10, borderWidth:1, borderRadius:6, alignItems:'center' },
  saveBtnText:      { fontSize:12, fontFamily:'DMSans_500Medium' },
  // Edit sheet
  editSheet:        { position:'absolute', bottom:0, left:0, right:0, borderTopLeftRadius:20, borderTopRightRadius:20, maxHeight:'85%', borderTopWidth:0.5, paddingBottom:40 },
  editSheetHandle:  { width:36, height:4, borderRadius:2, alignSelf:'center', marginTop:12, marginBottom:12 },
  editSheetHeader:  { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingBottom:16, borderBottomWidth:0.5, marginBottom:8 },
  // Edit mode
  editCardRow:      { flexDirection:'row', alignItems:'center', gap:10, marginBottom:10 },
  editBadge:        { width:28, height:28, borderRadius:14, borderWidth:1, alignItems:'center', justifyContent:'center' },
  editCardPreview:  { flex:1, borderWidth:0.5, borderRadius:10, paddingHorizontal:14, paddingVertical:10 },
  editCardLabel:    { fontSize:13, fontFamily:'DMSans_600SemiBold', marginBottom:2 },
  editCardDesc:     { fontSize:11, fontFamily:'DMSans_400Regular' },
  dragHandle:       { padding:8 },
  // Bottom sheet
  sheetOverlay:     { position:'absolute', top:0, left:0, right:0, bottom:0 },
  sheet:            { position:'absolute', bottom:0, left:0, right:0, borderTopLeftRadius:20, borderTopRightRadius:20, padding:20, paddingBottom:40, maxHeight:'75%', borderTopWidth:0.5 },
  sheetHandle:      { width:36, height:4, borderRadius:2, alignSelf:'center', marginBottom:16 },
  sheetTitle:       { fontSize:18, fontFamily:'BebasNeue_400Regular', letterSpacing:2, marginBottom:4 },
  sheetSubtitle:    { fontSize:11, fontFamily:'DMSans_400Regular', marginBottom:8 },
  sheetRow:         { flexDirection:'row', alignItems:'center', paddingVertical:12, borderBottomWidth:0.5, gap:12 },
  sheetRowActive:   { },
  sheetRowLabel:    { fontSize:14, fontFamily:'DMSans_600SemiBold', marginBottom:2 },
  sheetRowDesc:     { fontSize:11, fontFamily:'DMSans_400Regular' },
  sheetToggle:      { width:24, height:24, borderRadius:12, borderWidth:1, alignItems:'center', justifyContent:'center' },
  sheetToggleOn:    { },
});