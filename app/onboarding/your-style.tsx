import { useEffect, useRef, useState } from 'react';
import {
  Animated, InputAccessoryView, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text,
  TouchableOpacity, View
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { storageSet } from '../../utils/storage';
import { TextInput } from 'react-native';
import { THEMES, mix } from '../../theme';
import Svg, { Path, Line, Circle, Text as SvgText, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import { isOnboardingPreview } from '../../utils/onboardingPreview';
import { MODE_ACCENT, getModeAccentTints, setSessionStyleMode } from '../../utils/modeAccent';
import { Type } from '../../typography';
import BackgroundLayers from '../../components/BackgroundLayers';
import PrimaryCTA from '../../components/PrimaryCTA';
import ButtonShine from '../../components/ButtonShine';
import TargetsDisclaimerModal from '../../components/TargetsDisclaimerModal';
import GradientTitle from '../../components/GradientTitle';
import GradientNumber from '../../components/GradientNumber';
import { BlurView } from 'expo-blur';

// Nine paces on ONE ladder, aggressive -> gradual -> maintain -> build. They used to live in a horizontal
// scroller that showed four with no hint the other five existed. A 3x3 grid shows the whole ladder at once,
// which is the only way to pick a pace: you are choosing a POSITION on it, not reading one label.
// "lb/wk" everywhere (never "lbs/wk") -- at a third of the screen the long labels have no room to spare.
const PACE_PILLS = [
  { key: 'lose_2',   label: '−2 lb/wk',    name: 'Aggressive' },
  { key: 'lose_1_5', label: '−1.5 lb/wk',  name: 'Fast'       },
  { key: 'lose_1',   label: '−1 lb/wk',    name: 'Steady'     },
  { key: 'lose_0_75',label: '−0.75 lb/wk', name: 'Moderate'   },
  { key: 'lose_0_5', label: '−0.5 lb/wk',  name: 'Gradual'    },
  { key: 'lose_0_25',label: '−0.25 lb/wk', name: 'Very Gradual' },
  { key: 'maintain', label: 'Maintain',    name: 'Maintain'   },
  { key: 'gain_0_5', label: '+0.5 lb/wk',  name: 'Slow Build' },
  { key: 'gain_1',   label: '+1 lb/wk',    name: 'Build'      },
];

// The projection is a FLAT deficit: at -1 lb/wk you lose exactly one pound every week, start to finish.
// That is a STRAIGHT LINE. The old chart drew an ease-out bezier -- a plunge that flattened into a plateau
// -- which is a story the engine never told; a user read "I stall out in August" off a shape invented for
// looks. The picture has to equal the number.
//
// The x-axis is pinned to how long the GENTLEST pace would take, so every pace is drawn on the same clock
// and the line's SLOPE is the pace: -2 lb/wk is steep and done early, -0.25 runs to the far edge. (Scaling
// the axis to the selected pace instead would draw every pace as the same corner-to-corner line, and only
// the dates would move.) Past the goal the line runs flat -- you are there, holding.
function niceStep(range: number): number {
  const steps = [1, 2, 2.5, 5, 10, 20, 25, 50];
  const target = range / 3;
  return steps.find(s => s >= target) ?? 100;
}

function buildProjection(cw: number, gw: number, selectedWeekly: number, slowestWeekly: number) {
  const delta        = Math.abs(cw - gw);
  const weeksToGoal  = delta / selectedWeekly;
  const windowWeeks  = Math.min(delta / slowestWeekly, 520);
  return { weeksToGoal, windowWeeks, goalFrac: Math.min(weeksToGoal / windowWeeks, 1) };
}

function monthLabel(weeksFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + Math.round(weeksFromNow * 7));
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function ProjectionGraph({ currentWeight, goalWeight, weightGoal, accent }: {
  currentWeight: string;
  goalWeight: string;
  weightGoal: string;
  accent: string;
}) {
  const cw = parseFloat(currentWeight);
  const gw = parseFloat(goalWeight);
  const dashAnim = useRef(new Animated.Value(0)).current;
  const fillAnim = useRef(new Animated.Value(0)).current;

  const W = 320; const H = 190;
  const padL = 44; const padR = 22; const padT = 14; const padB = 26;
  const graphW = W - padL - padR;
  const graphH = H - padT - padB;

  // Longer than any straight run across this box, so the dash never leaves a gap at full draw.
  const DASH_LENGTH = 600;

  const weeklyChange = cw && gw ? GOAL_DEFICITS[weightGoal] / 500 : 0;

  useEffect(() => {
    if (!cw || !gw || cw === gw || weeklyChange === 0) return;
    dashAnim.setValue(0);
    fillAnim.setValue(0);
    Animated.sequence([
      Animated.timing(dashAnim, { toValue: 1, duration: 700, useNativeDriver: false }),
      Animated.timing(fillAnim, { toValue: 1, duration: 300, useNativeDriver: false }),
    ]).start();
  }, [cw, gw, weightGoal]);

  if (!cw || !gw || cw === gw || weeklyChange === 0) return null;

  const losing = cw > gw;
  // The line has to run the direction the user actually picked. Losing weight on a "gain" pace is not a
  // projection, it is a contradiction -- the pills dim for exactly this, so just draw nothing.
  if (losing !== (weeklyChange < 0)) return null;

  // THE FAN. Every pace you could pick, drawn from the same starting dot to the same goal weight -- they
  // differ only in WHEN they arrive, which is the entire question this screen asks. The alternatives are
  // hairlines, yours is solid. Without them the chart was one line in a mostly empty box and the flat
  // maintenance tail ate a third of the frame; the fan puts the trade-off itself in that space.
  const siblings = PACE_PILLS
    .filter(p => p.key !== 'maintain' && (losing ? p.key.startsWith('lose') : p.key.startsWith('gain')))
    .map(p => ({ key: p.key, weekly: Math.abs(GOAL_DEFICITS[p.key] / 500) }))
    .filter(p => p.weekly > 0);

  const slowestWeekly = Math.min(...siblings.map(s => s.weekly));
  const { weeksToGoal, windowWeeks, goalFrac } = buildProjection(cw, gw, Math.abs(weeklyChange), slowestWeekly);
  if (weeksToGoal <= 0 || weeksToGoal > 520) return null;

  const hi = Math.max(cw, gw); const lo = Math.min(cw, gw);
  const yFor = (w: number) => padT + ((hi - w) / (hi - lo)) * graphH;
  const xFor = (weeks: number) => padL + graphW * Math.min(weeks / windowWeeks, 1);

  const startX = padL;            const startY = yFor(cw);
  const goalX  = xFor(weeksToGoal); const goalY = yFor(gw);
  const endX   = padL + graphW;
  const baseY  = padT + graphH;

  // Straight to the goal and stop. No flat tail -- the ghost lines already own that space, and "holding at
  // goal" is not something this screen is projecting.
  const d     = `M ${startX} ${startY} L ${goalX} ${goalY}`;
  const fillD = `${d} L ${goalX} ${baseY} L ${startX} ${baseY} Z`;

  const ghosts = siblings
    .map(s => ({ key: s.key, x: xFor(Math.abs(cw - gw) / s.weekly) }))
    .filter(g => Math.abs(g.x - goalX) > 1.5);

  // Gridlines give the vertical axis a meaning -- it was 190px carrying nothing.
  const step = niceStep(hi - lo);
  const lines: number[] = [];
  for (let w = Math.ceil(lo / step) * step; w <= hi + 0.001; w += step) lines.push(w);

  // TIME gridlines. Weight had a ruler and time had nothing, so the fan's slopes sat on air -- a date at
  // the end of a line is a number floating in space until there is a grid to read it against.
  const WEEKS_PER_MONTH = 4.345;
  const monthsTotal = windowWeeks / WEEKS_PER_MONTH;
  const monthStep   = [1, 2, 3, 6, 12].find(m => monthsTotal / m <= 4) ?? 12;
  // Ticks are evenly spaced by construction, so they cannot collide with each other -- the only label that
  // ever fought them was the goal date, and that now lives in the corner instead. Just keep the first tick
  // off "Today".
  const ticks: { x: number; label: string; showLabel: boolean }[] = [];
  for (let m = monthStep; m * WEEKS_PER_MONTH <= windowWeeks + 0.001; m += monthStep) {
    const wk = m * WEEKS_PER_MONTH;
    const x  = xFor(wk);
    ticks.push({ x, label: monthLabel(wk), showLabel: x - padL > 40 });
  }

  const strokeDashoffset = dashAnim.interpolate({ inputRange: [0, 1], outputRange: [DASH_LENGTH, 0] });
  const fillOpacity      = fillAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const goalLabel        = monthLabel(weeksToGoal);

  return (
    <View style={{ marginTop: 16, borderWidth: 0.5, borderRadius: 14, backgroundColor: theme.bgCard, borderColor: theme.borderCard, shadowColor: theme.cardShadow, shadowOpacity: theme.cardShadowOpacity, shadowOffset: { width: 0, height: 3 }, shadowRadius: 8, elevation: 2 }}>
        {/* The answer is the card's HEADER, not a note dropped on the drawing. As loose SVG text it had no
            relationship to anything -- it read as floating because it WAS floating. A rule under it makes
            the date the title and the chart the evidence for it. */}
        <View style={styles.projHeader}>
          <Text style={[styles.projHeaderLabel, { color: theme.textMuted }]}>
            {`${Math.round(gw)} LBS BY`}
          </Text>
          <GradientNumber value={goalLabel} color={accent} style={styles.projHeaderDate} />
        </View>
        <View style={{ height: 0.5, backgroundColor: theme.borderCard }} />
        <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
          <Defs>
            <SvgGradient id="graphFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={accent} stopOpacity="0.22" />
              <Stop offset="1" stopColor={accent} stopOpacity="0.02" />
            </SvgGradient>
          </Defs>

          {lines.map(w => (
            <Line key={w} x1={padL} y1={yFor(w)} x2={endX} y2={yFor(w)}
              stroke={theme.borderCard} strokeWidth="0.5" />
          ))}
          {/* DATED LABELS, NO VERTICAL RULES. The dates are the time ruler; the three full-height lines they
              came with only crossed the horizontals into a big sparse cross-hatch that read as chart
              furniture. Weight needs rules because you read a VALUE off them. Time does not -- you read a
              POSITION, and the label under the axis already gives it. */}
          {ticks.filter(t => t.showLabel).map(t => (
            <SvgText key={`tl${t.x}`} x={t.x} y={baseY + 13}
              fontSize="9" fontFamily={Type.ui} fill={theme.textDim} textAnchor="middle">
              {t.label}
            </SvgText>
          ))}
          {lines.map(w => (
            <SvgText key={`l${w}`} x={padL - 8} y={yFor(w) + 3}
              fontSize="9" fontFamily={Type.num} fill={theme.textDim} textAnchor="end">
              {Math.round(w)}
            </SvgText>
          ))}

          {ghosts.map(g => (
            <Line key={g.key} x1={startX} y1={startY} x2={g.x} y2={goalY}
              stroke={accent} strokeWidth="1" strokeOpacity="0.18" />
          ))}
          {ghosts.map(g => (
            <Circle key={`d${g.key}`} cx={g.x} cy={goalY} r="2"
              fill={accent} fillOpacity="0.25" />
          ))}

          <AnimatedPath d={fillD} fill="url(#graphFill)" fillOpacity={fillOpacity} />

          <AnimatedPath
            d={d}
            stroke={accent}
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={`${DASH_LENGTH}`}
            strokeDashoffset={strokeDashoffset}
          />

          <Circle cx={startX} cy={startY} r="5" fill={accent} />
          <Circle cx={goalX}  cy={goalY}  r="5" fill={accent} />

          {/* No floating "180 lbs" / "160 lbs" callouts: the y-axis already labels both, and at a slow pace
              the shallow line ran straight through the goal one and sliced it in half. */}

          <SvgText x={padL} y={baseY + 13} fontSize="9" fontFamily={Type.ui} fill={theme.textMuted}>
            Today
          </SvgText>

          {/* The goal date lives up HERE, not on the axis. Down there it was a 9px label fighting "Today"
              on one side and a grid tick on the other, and every threshold that fixed one broke the other.
              The fan always runs down-left, so the top-right corner is dead space in every pace -- which
              makes it the one place this date can be big, readable, and incapable of colliding. */}
          {/* ONE pre-built string, not `{value} LBS BY`. That form hands react-native-svg TWO text runs, and
              textAnchor="end" anchors EACH of them at the right edge independently -- so "160" and "LBS BY"
              render stacked on each other. Interpolate before it reaches SvgText. */}
        </Svg>
    </View>
  );
}

// Animated SVG path wrapper
const AnimatedPath = Animated.createAnimatedComponent(Path);

const theme = THEMES['light'];

// decimal-pad is the one iOS keyboard with NO return key, so both weight fields were dead ends -- the only
// way out was tapping some random empty pixel. This is the native accessory bar; iOS animates it with the
// keyboard for free, which is why it is not a hand-rolled floating view.
// ONE ID PER FIELD. Both fields pointed at a single shared nativeID and only Current Weight ever got the
// bar -- an accessory view binds to one input, so the second field silently got nothing.
const DONE_ID_CURRENT = 'yourStyleDoneCurrent';
const DONE_ID_GOAL    = 'yourStyleDoneGoal';

const GOAL_DEFICITS: Record<string, number> = {
  lose_2: -1000, lose_1_5: -750, lose_1: -500, lose_0_75: -375, lose_0_5: -250, lose_0_25: -125,
  maintain: 0, gain_0_5: 250, gain_1: 500,
};

const GOAL_LABELS: Record<string, string> = {
  lose_2:   'Lose 2 lbs / week',
  lose_1_5: 'Lose 1.5 lbs / week',
  lose_1:   'Lose 1 lb / week',
  lose_0_75:'Lose 0.75 lbs / week',
  lose_0_5: 'Lose 0.5 lbs / week',
  lose_0_25:'Lose 0.25 lbs / week',
  maintain: 'Maintain weight',
  gain_0_5: 'Gain 0.5 lbs / week',
  gain_1:   'Gain 1 lb / week',
};

const LIFESTYLE_OPTIONS = [
  { key: 'sedentary',   label: 'Sedentary',      sub: 'Desk job, minimal movement outside of workouts',        multiplier: 1.2  },
  { key: 'light',       label: 'Lightly Active', sub: 'Some walking, on your feet occasionally during the day', multiplier: 1.3  },
  { key: 'active',      label: 'Active',         sub: 'On your feet a lot: server, teacher, retail, trades',     multiplier: 1.45 },
  { key: 'very_active', label: 'Very Active',    sub: 'Hard physical labor most of the day',                    multiplier: 1.6  },
];

const TRAINING_OPTIONS = [
  { key: 'none',  label: 'Not currently training',  sub: 'Little to no structured exercise',         dailyBonus: 0   },
  { key: '1x',    label: '1-2x / week',             sub: 'Light or occasional sessions',             dailyBonus: 100 },
  { key: '3x',    label: '3-4x / week',             sub: 'Consistent training most weeks',           dailyBonus: 200 },
  { key: '5x',    label: '5-6x / week',             sub: 'High frequency, serious commitment',       dailyBonus: 300 },
  { key: 'daily', label: 'Daily / twice daily',     sub: 'Elite or professional training volume',    dailyBonus: 400 },
];

const MACRO_PRESETS = {
  high_protein: { label: 'High Protein', p: 35, c: 35, f: 30 },
  balanced:     { label: 'Balanced',     p: 30, c: 40, f: 30 },
  low_carb:     { label: 'Low Carb',     p: 35, c: 25, f: 40 },
  performance:  { label: 'Performance',  p: 25, c: 50, f: 25 },
};

// Colours come from MODE_ACCENT -- the REAL accent each mode grants at the end of the flow. These were
// hand-picked lookalikes (balanced #2563eb vs the actual #1a44c2, mindful #059669 vs #0d9268), so the card
// you tapped was a near-miss of the colour the page and the app then turned.
const MODE_COPY = {
  discipline: {
    title: 'Discipline',
    sub:   'You want results. Full visibility, tight targets, no excuses.',
    color: MODE_ACCENT.discipline,
  },
  balanced: {
    title: 'Balanced',
    sub:   'Structure with flexibility. Progress without perfection.',
    color: MODE_ACCENT.balanced,
  },
  mindful: {
    title: 'Mindful',
    sub:   'Show up, log honestly, and give yourself grace.',
    color: MODE_ACCENT.mindful,
  },
};

const ONELINER: Record<string, string> = {
  discipline: "You're built for results, and you're ready to put in the work.",
  balanced:   "Real habits, real results, without the pressure to be perfect.",
  mindful:    "Show up, be honest, and let progress take its time.",
};

function getOneliner(mode: string, score: number): string {
  return ONELINER[mode] ?? ONELINER.balanced;
}

export default function YourStyleScreen() {
  const insets = useSafeAreaInsets();
  const { mode: recommended, score: scoreStr } = useLocalSearchParams<{ mode: string; score: string }>();
  const score = parseInt(scoreStr || '8');

  const [selectedMode,       setSelectedMode]       = useState(recommended || 'balanced');
  const [macroPreset,        setMacroPreset]        = useState(recommended === 'discipline' ? 'high_protein' : 'balanced');
  const [lifestyleActivity,  setLifestyleActivity]  = useState('sedentary');
  const [trainingFrequency,  setTrainingFrequency]  = useState('none');
  const [currentWeight,      setCurrentWeight]      = useState('');
  const [goalWeight,         setGoalWeight]         = useState('');
  const [weightGoal,    setWeightGoal]    = useState('lose_1');
  const [suggestedCals, setSuggestedCals] = useState<number | null>(null);
  const [profileData,   setProfileData]   = useState<any>(null);
  // null = still reading the key; true/false = decided. Rendering the modal before the read lands would
  // flash it at someone who already acknowledged.
  const [showDisclaimer, setShowDisclaimer] = useState<boolean | null>(null);
  // The footer STAYS DOWN when the keyboard opens. Riding on top of the keyboard put Continue right over
  // the weight field you were typing into -- and the Done bar is already the way out of that keyboard, so
  // the footer has no job while you type.

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  // Load profile biometrics for calorie calc -- never pre-fill weight fields
  useEffect(() => {
    const load = async () => {
      const s = await AsyncStorage.getItem('pj_profile');
      const parsed = s ? JSON.parse(s) : {};
      setProfileData(parsed);
    };
    load();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const load = async () => {
      // Preview always shows it -- it is a screen Justin needs to be able to look at, and preview exists to
      // look at screens. A real user sees it once, ever.
      const show = isOnboardingPreview() || (await AsyncStorage.getItem('pj_targets_disclaimer_seen')) !== 'true';
      if (cancelled) return;
      if (!show) { setShowDisclaimer(false); return; }
      // Let the screen ARRIVE first. Firing on mount threw the modal up while the push transition and the
      // 500ms entrance were still running, so it landed on a screen that had not finished existing.
      timer = setTimeout(() => { if (!cancelled) setShowDisclaimer(true); }, 700);
    };
    load();
    return () => { cancelled = true; clearTimeout(timer); };
  }, []);

  const acknowledgeDisclaimer = async () => {
    setShowDisclaimer(false);
    if (!isOnboardingPreview()) await storageSet('pj_targets_disclaimer_seen', 'true');
  };

  // Live calorie calc -- fires whenever any relevant field changes
  useEffect(() => {
    if (!profileData) return;
    const w  = parseFloat(currentWeight || '0') || 0;
    const h  = parseFloat(profileData.height || '0') || 0;
    const bd = profileData.birthday;
    const sx = profileData.sex || 'male';
    if (!w || !h || !bd) { setSuggestedCals(null); return; }
    const age = Math.floor((Date.now() - new Date(bd).getTime()) / (365.25 * 24 * 3600 * 1000));
    const kg  = w * 0.453592;
    const cm  = h * 2.54;
    const bmr = sx === 'female'
      ? (10 * kg) + (6.25 * cm) - (5 * age) - 161
      : (10 * kg) + (6.25 * cm) - (5 * age) + 5;
    const lifestyleMultiplier = LIFESTYLE_OPTIONS.find(o => o.key === lifestyleActivity)?.multiplier ?? 1.2;
    const trainingDailyBonus  = TRAINING_OPTIONS.find(o => o.key === trainingFrequency)?.dailyBonus ?? 0;
    const tdee    = Math.round((bmr * lifestyleMultiplier) + trainingDailyBonus);
    const deficit = GOAL_DEFICITS[weightGoal] ?? -500;
    setSuggestedCals(Math.max(1200, Math.round(tdee + deficit)));
  }, [profileData, currentWeight, lifestyleActivity, trainingFrequency, weightGoal]);

  // When user switches mode, update macro preset default
  const handleModeSelect = (mode: string) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setSelectedMode(mode);
    if (mode === 'discipline') setMacroPreset('high_protein');
    if (mode === 'balanced')   setMacroPreset('balanced');
  };

  const handleContinue = async () => {
    // Carry the choice forward in memory before anything else. Preview returns below without ever writing
    // pj_settings, so this is the only way the rest of the flow can know what was picked.
    setSessionStyleMode(selectedMode);
    if (isOnboardingPreview()) { triggerHaptic(Haptics.ImpactFeedbackStyle.Medium); router.push('/onboarding/faith-journey'); return; }
    if (!canContinue) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const existing = await AsyncStorage.getItem('pj_settings');
      const current  = existing ? JSON.parse(existing) : {};
      const preset   = MACRO_PRESETS[macroPreset as keyof typeof MACRO_PRESETS];

      await storageSet('pj_settings', JSON.stringify({
        ...current,
        styleMode: selectedMode,
        macroPreset,
      }));

      // Save current weight to today's daily key
      if (currentWeight && parseFloat(currentWeight) > 0) {
        const today = new Date();
        const dk = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
        const dayExisting = await AsyncStorage.getItem(`pj_${dk}`);
        const dayData = dayExisting ? JSON.parse(dayExisting) : {};
        await storageSet(`pj_${dk}`, JSON.stringify({ ...dayData, weight: parseFloat(currentWeight) }));
      }

      // Save goal fields to profile
      const pd = await AsyncStorage.getItem('pj_profile');
      const prof = pd ? JSON.parse(pd) : {};
      await storageSet('pj_profile', JSON.stringify({
        ...prof,
        weightGoal,
        goalWeight:         goalWeight || '',
        lifestyleActivity,
        trainingFrequency,
        calTarget:          suggestedCals ? String(suggestedCals) : prof.calTarget || '',
      }));

      // Save macro ratios to profile if not mindful
      if (selectedMode !== 'mindful' && preset) {
        const profileData = await AsyncStorage.getItem('pj_profile');
        const profile     = profileData ? JSON.parse(profileData) : {};
        await storageSet('pj_profile', JSON.stringify({
          ...profile,
          macroMode:        'ratio',
          macroProteinPct:  String(preset.p),
          macroCarbsPct:    String(preset.c),
          macroFatPct:      String(preset.f),
        }));
      }

      // Every mode goes the same way now. The Discipline-only Commitment screen was CUT 2026-07-16: it was
      // corny (three vows opening "I will", the cadence of a wedding vow), and being mode-conditional it
      // broke the step counter for the other two modes -- Balanced and Mindful went 3 -> 5 and never saw a
      // step 4. Discipline earns its name by what the app DOES the next morning, not by a pledge at signup.
      router.push('/onboarding/faith-journey');
    } catch (e) {
      console.log('Your style save error', e);
    }
  };

  const oneliner = getOneliner(selectedMode, score);

  // THE PAGE RECOLOURS THE MOMENT A MODE IS PICKED. This is not decoration: all-set.tsx ends the flow with
  // setAccent() derived from the same mode, so this colour IS the accent the user keeps. Showing it here
  // makes the choice a live preview of their app rather than a form field. (Faith Journey is exempt -- it
  // keeps its amber; faith identity outranks the mode colour.)
  const { accent, selected: ACCENT_SELECTED, bg: accentBg, border: accentBorder } =
    getModeAccentTints(selectedMode, theme);

  // Current weight is required for net-based modes (Balanced/Discipline): BMR, and
  // therefore the calorie net shown on the home card, needs it. Mindful never shows
  // net, so weight stays optional there.
  const canContinue = isOnboardingPreview() || selectedMode === 'mindful' || parseFloat(currentWeight) > 0;

  return (
    <LinearGradient colors={[theme.gradientEnd, theme.gradientEnd]} style={{ flex: 1 }}>
      <BackgroundLayers glow={accent} />

      {/* Progress bar. Frosted chrome, absolute, glued to the top: it answers "how much more of this is
          there", which is the one thing worth costing permanent screen space on the longest screen in
          onboarding. The title and subtitle are read once and are free to scroll away. */}
      <View style={[styles.progressBar, { paddingTop: insets.top + 12, borderBottomColor: theme.borderCard }]}>
        <BlurView intensity={28} tint="light" style={StyleSheet.absoluteFill} pointerEvents="none" />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.chromeFill }]} pointerEvents="none" />
        <TouchableOpacity
          onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={[styles.backBtn, { backgroundColor: accentBg, borderColor: accentBorder }]}
        >
          <Ionicons name="chevron-back" size={20} color={accent} />
        </TouchableOpacity>
        <View style={[styles.progressTrack, { backgroundColor: theme.bgProgressTrack }]}>
          <View style={[styles.progressFill, { backgroundColor: accent, width: '50%' }]} />
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 72, paddingBottom: insets.bottom + 148 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          <Text style={[styles.screenLabel, { color: theme.textMuted }]}>STEP 3 OF 6</Text>
          <GradientTitle title="Your Style" color={accent} style={styles.title} />
          <Text style={[styles.oneliner, { color: theme.textSecondary }]}>{oneliner}</Text>

          {/* Three style cards */}
          {Object.entries(MODE_COPY).map(([key, copy]) => {
            const isSelected   = selectedMode === key;
            const isRecommended = key === recommended;
            return (
              <TouchableOpacity
                key={key}
                onPress={() => handleModeSelect(key)}
                activeOpacity={0.85}
                style={[
                  styles.modeCard,
                  { backgroundColor: theme.bgCard, borderColor: theme.borderCard,
                    shadowColor: theme.cardShadow, shadowOpacity: theme.cardShadowOpacity },
                  isSelected && { borderColor: copy.color, backgroundColor: mix(copy.color, theme.bgCard, 0.14) },
                ]}
              >
                {isSelected ? <ButtonShine radius={14} /> : null}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <View style={[styles.modeDot, { backgroundColor: isSelected ? copy.color : theme.borderInput }]} />
                  <View style={{ flex: 1 }}>
                    <GradientTitle title={copy.title} color={isSelected ? copy.color : theme.textPrimary} style={styles.modeTitle} />
                  </View>
                  {isRecommended && (
                    <View style={[styles.recommendedBadge, { backgroundColor: `${copy.color}18`, borderColor: `${copy.color}40` }]}>
                      <Text style={[styles.recommendedText, { color: copy.color }]}>RECOMMENDED</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.modeSub, { color: theme.textMuted }]}>{copy.sub}</Text>
              </TouchableOpacity>
            );
          })}

          <Text style={[styles.changeable, { color: theme.textSecondary }]}>
            You can always change this in Settings.
          </Text>

          {/* Current + Goal Weight side by side */}
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 28 }}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionLabel, { color: theme.textSecondary, marginBottom: 8 }]}>CURRENT WEIGHT</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <TextInput
                  style={[{ flex: 1, borderWidth: 0.5, borderRadius: 10, padding: 14, fontSize: 16, fontFamily: Type.ui, backgroundColor: theme.bgInput, borderColor: theme.borderInput, color: theme.textPrimary }]}
                  inputAccessoryViewID={Platform.OS === 'ios' ? DONE_ID_CURRENT : undefined}
                  placeholder="177"
                  placeholderTextColor={theme.textPlaceholder}
                  value={currentWeight}
                  onChangeText={v => {
                    const stripped = v.replace(/[^0-9.]/g, '');
                    const dot = stripped.indexOf('.');
                    if (dot === -1) { setCurrentWeight(stripped); }
                    else { setCurrentWeight(stripped.slice(0, dot) + '.' + stripped.slice(dot + 1).replace(/\./g, '').slice(0, 1)); }
                  }}
                  keyboardType="decimal-pad"
                />
                <View style={{ borderWidth: 0.5, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 14, backgroundColor: theme.bgCard, borderColor: theme.borderCard }}>
                  <Text style={{ fontSize: 13, fontFamily: Type.uiSemibold, color: theme.textMuted }}>lbs</Text>
                </View>
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionLabel, { color: theme.textSecondary, marginBottom: 8 }]}>GOAL WEIGHT <Text style={{ color: theme.textDim, fontSize: 9 }}>(OPT)</Text></Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <TextInput
                  style={[{ flex: 1, borderWidth: 0.5, borderRadius: 10, padding: 14, fontSize: 16, fontFamily: Type.ui, backgroundColor: theme.bgInput, borderColor: theme.borderInput, color: theme.textPrimary }]}
                  inputAccessoryViewID={Platform.OS === 'ios' ? DONE_ID_GOAL : undefined}
                  placeholder="165"
                  placeholderTextColor={theme.textPlaceholder}
                  value={goalWeight}
                  onChangeText={v => {
                    const stripped = v.replace(/[^0-9.]/g, '');
                    const dot = stripped.indexOf('.');
                    if (dot === -1) { setGoalWeight(stripped); }
                    else { setGoalWeight(stripped.slice(0, dot) + '.' + stripped.slice(dot + 1).replace(/\./g, '').slice(0, 1)); }
                  }}
                  keyboardType="decimal-pad"
                />
                <View style={{ borderWidth: 0.5, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 14, backgroundColor: theme.bgCard, borderColor: theme.borderCard }}>
                  <Text style={{ fontSize: 13, fontFamily: Type.uiSemibold, color: theme.textMuted }}>lbs</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Lifestyle Activity -- compact 2-col grid */}
          <Text style={[styles.sectionLabel, { color: theme.textSecondary, marginTop: 28 }]}>LIFESTYLE ACTIVITY</Text>
          <Text style={[styles.sectionSub, { color: theme.textSecondary, marginBottom: 8 }]}>Your day-to-day movement, not counting workouts.</Text>
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {LIFESTYLE_OPTIONS.slice(0, 2).map(o => {
                const isSelected = lifestyleActivity === o.key;
                return (
                  <TouchableOpacity
                    key={o.key}
                    onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setLifestyleActivity(o.key); }}
                  style={{
                    flex: 1,
                    minHeight: 72,
                    borderWidth: 0.5,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    backgroundColor: isSelected ? ACCENT_SELECTED : theme.bgInput,
                    borderColor: isSelected ? accentBorder : theme.borderInput,
                  }}
                >
                  {isSelected ? <ButtonShine radius={10} /> : null}
                  <Text style={{ fontSize: 13, fontFamily: Type.uiSemibold, color: isSelected ? accent : theme.textPrimary, marginBottom: 2 }}>
                    {o.label}
                  </Text>
                  <Text style={{ fontSize: 11, fontFamily: Type.ui, color: theme.textMuted, lineHeight: 15 }}>
                    {o.sub}
                  </Text>
                </TouchableOpacity>
                );
              })}
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {LIFESTYLE_OPTIONS.slice(2, 4).map(o => {
                const isSelected = lifestyleActivity === o.key;
                return (
                  <TouchableOpacity
                    key={o.key}
                    onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setLifestyleActivity(o.key); }}
                    style={{
                      flex: 1,
                      minHeight: 72,
                      borderWidth: 0.5,
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      backgroundColor: isSelected ? ACCENT_SELECTED : theme.bgInput,
                      borderColor: isSelected ? accentBorder : theme.borderInput,
                    }}
                  >
                    {isSelected ? <ButtonShine radius={10} /> : null}
                    <Text style={{ fontSize: 13, fontFamily: Type.uiSemibold, color: isSelected ? accent : theme.textPrimary, marginBottom: 2 }}>{o.label}</Text>
                    <Text style={{ fontSize: 11, fontFamily: Type.ui, color: theme.textMuted, lineHeight: 15 }}>{o.sub}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Training Frequency -- compact 2-col grid */}
          <Text style={[styles.sectionLabel, { color: theme.textSecondary, marginTop: 20 }]}>TRAINING FREQUENCY</Text>
          <Text style={[styles.sectionSub, { color: theme.textSecondary, marginBottom: 8 }]}>How often you actually train these days, not what you're aiming for. You can change it in your Profile anytime.</Text>
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {TRAINING_OPTIONS.slice(0, 2).map(o => {
                const isSelected = trainingFrequency === o.key;
                return (
                  <TouchableOpacity
                    key={o.key}
                    onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setTrainingFrequency(o.key); }}
                    style={{
                      flex: 1,
                      minHeight: 72,
                      borderWidth: 0.5,
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      backgroundColor: isSelected ? ACCENT_SELECTED : theme.bgInput,
                      borderColor: isSelected ? accentBorder : theme.borderInput,
                    }}
                  >
                    {isSelected ? <ButtonShine radius={10} /> : null}
                    <Text style={{ fontSize: 13, fontFamily: Type.uiSemibold, color: isSelected ? accent : theme.textPrimary, marginBottom: 2 }}>{o.label}</Text>
                    <Text style={{ fontSize: 11, fontFamily: Type.ui, color: theme.textMuted, lineHeight: 15 }}>{o.sub}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {TRAINING_OPTIONS.slice(2, 4).map(o => {
                const isSelected = trainingFrequency === o.key;
                return (
                  <TouchableOpacity
                    key={o.key}
                    onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setTrainingFrequency(o.key); }}
                    style={{
                      flex: 1,
                      minHeight: 72,
                      borderWidth: 0.5,
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      backgroundColor: isSelected ? ACCENT_SELECTED : theme.bgInput,
                      borderColor: isSelected ? accentBorder : theme.borderInput,
                    }}
                  >
                    {isSelected ? <ButtonShine radius={10} /> : null}
                    <Text style={{ fontSize: 13, fontFamily: Type.uiSemibold, color: isSelected ? accent : theme.textPrimary, marginBottom: 2 }}>{o.label}</Text>
                    <Text style={{ fontSize: 11, fontFamily: Type.ui, color: theme.textMuted, lineHeight: 15 }}>{o.sub}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
              {TRAINING_OPTIONS.slice(4).map(o => {
                const isSelected = trainingFrequency === o.key;
                return (
                  <TouchableOpacity
                    key={o.key}
                    onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setTrainingFrequency(o.key); }}
                    style={{
                      width: '48.5%',
                      minHeight: 72,
                      borderWidth: 0.5,
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      backgroundColor: isSelected ? ACCENT_SELECTED : theme.bgInput,
                      borderColor: isSelected ? accentBorder : theme.borderInput,
                    }}
                  >
                    {isSelected ? <ButtonShine radius={10} /> : null}
                    <Text style={{ fontSize: 13, fontFamily: Type.uiSemibold, color: isSelected ? accent : theme.textPrimary, marginBottom: 2 }}>{o.label}</Text>
                    <Text style={{ fontSize: 11, fontFamily: Type.ui, color: theme.textMuted, lineHeight: 15 }}>{o.sub}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Live calorie estimate */}
          {suggestedCals && (
            <View style={{ marginTop: 20, borderWidth: 0.5, borderRadius: 14, padding: 16, alignItems: 'center', backgroundColor: theme.bgCard, borderColor: theme.borderCard, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.10, shadowRadius: 8, elevation: 2 }}>
              <GradientNumber value="YOUR DAILY CALORIE TARGET" color={theme.textMuted} style={{ fontSize: 9, fontFamily: Type.uiBold, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8 }} />
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <GradientNumber value={String(suggestedCals)} color={accent} style={{ fontSize: 48, fontFamily: Type.num, letterSpacing: 1 }} />
                <Text style={{ fontSize: 14, color: theme.textMuted, marginLeft: 4 }}>kcal</Text>
              </View>
              <Text style={{ fontSize: 12, fontFamily: Type.ui, textAlign: 'center', marginTop: 4, color: theme.textSecondary }}>
                Based on your stats using Mifflin-St Jeor BMR.
              </Text>
              {/* The Mifflin line above is a METHOD note, not a disclaimer -- this screen was showing a
                  calorie target, a BMR and a weight projection with neither the inline line nor the
                  first-use modal the Disclaimer Standard names for all three. */}
              <Text style={{ fontSize: 11, fontFamily: Type.ui, fontStyle: 'italic', textAlign: 'center', marginTop: 8, color: theme.textSecondary }}>
                For informational purposes only. Not medical advice.
              </Text>
            </View>
          )}

          {/* Weekly Goal + Projection -- Discipline and Balanced only */}
          {selectedMode !== 'mindful' && (
            <View style={{ marginTop: 28 }}>
              <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>WEEKLY GOAL</Text>
              <Text style={[styles.sectionSub, { color: theme.textSecondary }]}>
                This sets your daily calorie target. Choose your pace.
              </Text>

              {/* Pace pills -- rate only, name appears in projection header */}
              <View style={styles.paceGrid}>
                {PACE_PILLS.map(pill => {
                  const cwf = parseFloat(currentWeight);
                  const gwf = parseFloat(goalWeight);
                  const sameWeight = cwf > 0 && gwf > 0 && cwf === gwf;
                  const hasWeights = cwf > 0 && gwf > 0 && cwf !== gwf;
                  const isLosing   = hasWeights && cwf > gwf;
                  const isGaining  = hasWeights && gwf > cwf;
                  const isGainPill = pill.key === 'gain_0_5' || pill.key === 'gain_1';
                  const isLosePill = pill.key.startsWith('lose');
                  const isMaintain = pill.key === 'maintain';
                  const isDimmed =
                    (sameWeight && !isMaintain) ||
                    (isLosing && isGainPill) ||
                    (isGaining && isLosePill);
                  const isSelected = weightGoal === pill.key;
                  return (
                    <TouchableOpacity
                      key={pill.key}
                      onPress={() => { if (!isDimmed) { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setWeightGoal(pill.key); } }}
                      activeOpacity={isDimmed ? 1 : 0.7}
                      style={[
                        styles.pacePill,
                        {
                          backgroundColor: isSelected ? ACCENT_SELECTED : theme.bgInput,
                          borderColor: isSelected ? accentBorder : theme.borderInput,
                          opacity: isDimmed ? 0.3 : 1,
                        },
                      ]}
                    >
                      {isSelected ? <ButtonShine radius={20} /> : null}
                      <Text style={[
                        styles.pacePillText,
                        { color: isSelected ? accent : theme.textSecondary },
                      ]}>
                        {pill.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Projection header with selected pace name */}
              {currentWeight && goalWeight && (() => {
                const selected = PACE_PILLS.find(p => p.key === weightGoal);
                return (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 24, marginBottom: 4 }}>
                    <Text style={[styles.sectionLabel, { color: theme.textSecondary, marginBottom: 0 }]}>YOUR PROJECTION</Text>
                    {selected && (
                      <View style={{ marginLeft: 8, backgroundColor: accentBg, borderWidth: 0.5, borderColor: accentBorder, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 9, fontFamily: Type.uiBold, color: accent, letterSpacing: 1 }}>
                          {selected.name.toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })()}

              {currentWeight && goalWeight ? (
                <ProjectionGraph
                  currentWeight={currentWeight}
                  goalWeight={goalWeight}
                  weightGoal={weightGoal}
                  accent={accent}
                />
              ) : (
                <Text style={[styles.sectionLabel, { color: theme.textSecondary, marginTop: 24, marginBottom: 4 }]}>YOUR PROJECTION</Text>
              )}
              {(!currentWeight || !goalWeight) && (
                <Text style={{ fontSize: 11, fontFamily: Type.ui, color: theme.textDim, marginTop: 8 }}>
                  Enter your current and goal weight above to see your projection.
                </Text>
              )}
            </View>
          )}

          {/* Macro presets -- Discipline and Balanced only */}
          {selectedMode !== 'mindful' && (
            <View style={{ marginTop: 28 }}>
              <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>MACRO PRESET</Text>
              <Text style={[styles.sectionSub, { color: theme.textSecondary }]}>
                Sets your protein, carb, and fat targets automatically.
              </Text>
              <View style={styles.presetGrid}>
                {Object.entries(MACRO_PRESETS).map(([key, preset]) => {
                  const isSelected = macroPreset === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setMacroPreset(key); }}
                      style={[
                        styles.presetBtn,
                        { backgroundColor: theme.bgInput, borderColor: theme.borderInput,
                          shadowColor: theme.cardShadow, shadowOpacity: theme.cardShadowOpacity },
                        isSelected && { backgroundColor: ACCENT_SELECTED, borderColor: accentBorder },
                      ]}
                    >
                      {isSelected ? <ButtonShine radius={10} /> : null}
                      <GradientNumber value={preset.label} color={isSelected ? accent : theme.textPrimary} style={styles.presetLabel} />
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <GradientNumber value={`${preset.p}P`} color={theme.accentGreen} style={styles.presetRatio} />
                        <Text style={[styles.presetRatio, { color: theme.textDim }]}> · </Text>
                        <GradientNumber value={`${preset.c}C`} color={theme.accentAmber} style={styles.presetRatio} />
                        <Text style={[styles.presetRatio, { color: theme.textDim }]}> · </Text>
                        <GradientNumber value={`${preset.f}F`} color={theme.accentRed} style={styles.presetRatio} />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Mindful encouragement */}
          {selectedMode === 'mindful' && (
            <View style={[styles.mindfulCard, { backgroundColor: `${theme.accentGreen}10`, borderColor: `${theme.accentGreen}30` }]}>
              <Text style={[styles.mindfulText, { color: theme.accentGreen }]}>
                You've already taken the first step.
              </Text>
              <Text style={[styles.mindfulSub, { color: theme.textMuted }]}>
                GoodForge will celebrate your effort, not judge your numbers.
              </Text>
            </View>
          )}

        </Animated.View>
      </ScrollView>
      </KeyboardAvoidingView>

      {/* Continue footer. Frosted chrome (blur + chromeFill) like the tab bar, absolute so content scrolls
          under it. When the keyboard is up it rides on top of the keyboard rather than hiding behind it. */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16, borderTopColor: theme.borderCard }]}>
        <BlurView intensity={28} tint="light" style={StyleSheet.absoluteFill} pointerEvents="none" />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.chromeFill }]} pointerEvents="none" />
        {!canContinue && (
          <Text style={[styles.footerHint, { color: theme.textSecondary }]}>
            Enter your current weight to continue.
          </Text>
        )}
        <PrimaryCTA
          label="Continue"
          fill={accent}
          disabled={!canContinue}
          faceStyle={{ borderRadius: 14, paddingVertical: 18 }}
          onPress={handleContinue}
        />
      </View>

      {showDisclaimer === true && (
        <TargetsDisclaimerModal theme={theme} accent={accent} onAcknowledge={acknowledgeDisclaimer} />
      )}

      {Platform.OS === 'ios' && [DONE_ID_CURRENT, DONE_ID_GOAL].map(id => (
        <InputAccessoryView key={id} nativeID={id}>
          <View style={[styles.keyboardBar, { backgroundColor: theme.chromeFill, borderTopColor: theme.borderCard }]}>
            <BlurView intensity={28} tint="light" style={StyleSheet.absoluteFill} pointerEvents="none" />
            <TouchableOpacity
              onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); Keyboard.dismiss(); }}
              hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
            >
              <Text style={[styles.keyboardDone, { color: accent }]}>Done</Text>
            </TouchableOpacity>
          </View>
        </InputAccessoryView>
      ))}

    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  progressBar:       { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, paddingHorizontal: 24, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 0.5, overflow: 'hidden' },
  progressTrack:     { flex: 1, height: 3, borderRadius: 2, overflow: 'hidden' },
  progressFill:      { height: '100%', borderRadius: 2 },
  backBtn:           { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  content:           { padding: 24, paddingTop: 16 },
  screenLabel:       { fontSize: 9,  fontFamily: Type.uiBold,      letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8 },
  // No textShadow -- a drop shadow on a display title is a trick nothing else in the app uses.
  title:             { fontSize: 36, fontFamily: Type.display, letterSpacing: 0.3, marginBottom: 6 },
  // VOICE: this is the app talking, not a label. Matches the subtitle on steps 1 and 2.
  oneliner:          { fontSize: 15, fontFamily: Type.voice, lineHeight: 22, marginBottom: 28 },
  modeCard:          { borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 12,
                       shadowOffset: { width: 0, height: 3 }, shadowRadius: 8, elevation: 2 },
  modeDot:           { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  modeTitle:         { fontSize: 20, fontFamily: Type.display, letterSpacing: 0.3, flex: 1 },
  recommendedBadge:  { borderWidth: 1, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  recommendedText:   { fontSize: 8, fontFamily: Type.uiBold, letterSpacing: 1.5 },
  modeSub:           { fontSize: 12, fontFamily: Type.ui, lineHeight: 18 },
  changeable:        { fontSize: 11, fontFamily: Type.ui, textAlign: 'center', marginTop: 8 },
  // 11, not 9, and letterSpacing 2, not 3: at 9px with 3pt tracking these section names dissolved into the
  // page by the time you scrolled to them. A label you cannot find is not a label.
  sectionLabel:      { fontSize: 11, fontFamily: Type.uiBold, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 },
  sectionSub:        { fontSize: 12, fontFamily: Type.ui, lineHeight: 17, marginBottom: 12 },
  projHeader:        { alignItems: 'center', paddingTop: 10, paddingBottom: 9 },
  projHeaderLabel:   { fontSize: 8, fontFamily: Type.uiBold, letterSpacing: 2, marginBottom: 1 },
  projHeaderDate:    { fontSize: 17, fontFamily: Type.num, letterSpacing: 0.5 },
  paceGrid:          { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  // 3 across. '31.5%' + two 8px gaps is the widest a third can be and still fit "−0.25 lb/wk".
  pacePill:          { width: '31.5%', borderWidth: 0.5, borderRadius: 20, paddingHorizontal: 6, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  pacePillText:      { fontSize: 12, fontFamily: Type.uiSemibold },
  presetGrid:        { gap: 8 },
  presetBtn:         { borderWidth: 0.5, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                       shadowOffset: { width: 0, height: 3 }, shadowRadius: 8, elevation: 2 },
  presetLabel:       { fontSize: 14, fontFamily: Type.uiSemibold },
  // Macros carry the design system's colours, not one dim grey string. Protein green, carbs amber, fat red.
  presetRatio:       { fontSize: 11, fontFamily: Type.uiSemibold },
  mindfulCard:       { marginTop: 28, borderWidth: 1, borderRadius: 14, padding: 20, alignItems: 'center' },
  mindfulText:       { fontSize: 18, fontFamily: Type.display, letterSpacing: 0.3, marginBottom: 6, textAlign: 'center' },
  mindfulSub:        { fontSize: 12, fontFamily: Type.ui, textAlign: 'center', lineHeight: 18 },
  footer:            { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 24, paddingTop: 12, borderTopWidth: 0.5, overflow: 'hidden' },
  footerHint:        { fontSize: 12, fontFamily: Type.voice, textAlign: 'center', marginBottom: 10 },
  keyboardBar:       { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10, borderTopWidth: 0.5, overflow: 'hidden' },
  keyboardDone:      { fontSize: 16, fontFamily: Type.uiSemibold },
});