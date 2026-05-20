import { useEffect, useRef, useState } from 'react';
import {
  Animated, ScrollView, StyleSheet, Text,
  TouchableOpacity, View
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { storageSet } from '../../utils/storage';
import { TextInput } from 'react-native';
import { THEMES } from '../../theme';
import Svg, { Path, Line, Circle, Text as SvgText, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';

const PACE_PILLS = [
  { key: 'lose_2',   label: '−2 lbs/wk',   name: 'Aggressive' },
  { key: 'lose_1_5', label: '−1.5 lbs/wk', name: 'Fast'       },
  { key: 'lose_1',   label: '−1 lb/wk',    name: 'Steady'     },
  { key: 'lose_0_5', label: '−0.5 lbs/wk', name: 'Gradual'    },
  { key: 'maintain', label: 'Maintain',     name: 'Maintain'   },
  { key: 'gain_0_5', label: '+0.5 lbs/wk', name: 'Slow Build' },
  { key: 'gain_1',   label: '+1 lb/wk',    name: 'Build'      },
];

function buildPath(cw: number, gw: number, weeklyChange: number, W: number, H: number, padL: number, padR: number, padT: number, padB: number) {
  const graphW = W - padL - padR;
  const graphH = H - padT - padB;
  const losing = cw > gw;

  const startX = padL;
  const startY = padT + (losing ? 0 : graphH);
  const endX   = padL + graphW;
  const endY   = padT + (losing ? graphH : 0);

  // magnitude 0 (gentle 0.5/wk) to 1 (aggressive 2/wk)
  const magnitude = Math.min(Math.abs(weeklyChange) / 2, 1);

  // Aggressive: steep early plunge -- cp1 hugs start, cp2 slams to end early
  // Gentle: nearly linear -- both control points near center
  const cp1X = startX + graphW * (magnitude * 0.08 + (1 - magnitude) * 0.38);
  const cp1Y = startY; // always starts flat
  const cp2X = startX + graphW * (magnitude * 0.35 + (1 - magnitude) * 0.62);
  const cp2Y = endY;   // always ends flat

  const d     = `M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`;
  const fillD = `${d} L ${endX} ${padT + graphH} L ${startX} ${padT + graphH} Z`;
  return { d, fillD, startX, startY, endX, endY };
}

function getMidpointLabels(weeksNeeded: number, endLabel: string): string[] {
  const today = new Date();
  if (weeksNeeded < 8) return [];
  if (weeksNeeded < 20) {
    const mid = new Date();
    mid.setDate(today.getDate() + Math.round(weeksNeeded * 7 * 0.5));
    const label = mid.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    if (label === endLabel) return [];
    return [label];
  }
  const m1 = new Date(); m1.setDate(today.getDate() + Math.round(weeksNeeded * 7 * 0.33));
  const m2 = new Date(); m2.setDate(today.getDate() + Math.round(weeksNeeded * 7 * 0.66));
  const l1 = m1.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  const l2 = m2.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  const results: string[] = [];
  if (l1 !== endLabel) results.push(l1);
  if (l2 !== endLabel && l2 !== l1) results.push(l2);
  return results;
}

function ProjectionGraph({ currentWeight, goalWeight, weightGoal }: {
  currentWeight: string;
  goalWeight: string;
  weightGoal: string;
}) {
  const cw = parseFloat(currentWeight);
  const gw = parseFloat(goalWeight);
  const dashAnim   = useRef(new Animated.Value(0)).current;
  const fillAnim   = useRef(new Animated.Value(0)).current;
  const [displayPath, setDisplayPath] = useState({ d: '', fillD: '', startX: 0, startY: 0, endX: 0, endY: 0 });
  const [projLabel,   setProjLabel]   = useState('');
  const [midLabels,   setMidLabels]   = useState<string[]>([]);
  const [weeksTotal,  setWeeksTotal]  = useState(0);

  const W = 320; const H = 190;
  const padL = 48; const padR = 24; const padT = 20; const padB = 44;
  const graphW = W - padL - padR;

  // Estimated path length for dash animation -- close enough for visual purposes
  const DASH_LENGTH = 320;

  useEffect(() => {
    if (!cw || !gw || cw === gw) return;
    const weeklyChange = GOAL_DEFICITS[weightGoal] / 500;
    if (weeklyChange === 0) return;
    const weeksNeeded = Math.abs((gw - cw) / weeklyChange);
    if (weeksNeeded <= 0 || weeksNeeded > 520) return;

    setWeeksTotal(weeksNeeded);
    const projected = new Date();
    projected.setDate(projected.getDate() + Math.round(weeksNeeded * 7));
    const endLabel = projected.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    setProjLabel(endLabel);
    setMidLabels(getMidpointLabels(weeksNeeded, endLabel));

    const paths = buildPath(cw, gw, weeklyChange, W, H, padL, padR, padT, padB);
    setDisplayPath(paths);

    // Reset and animate
    dashAnim.setValue(0);
    fillAnim.setValue(0);
    Animated.sequence([
      Animated.timing(dashAnim, { toValue: 1, duration: 700, useNativeDriver: false }),
      Animated.timing(fillAnim, { toValue: 1, duration: 300, useNativeDriver: false }),
    ]).start();
  }, [cw, gw, weightGoal]);

  if (!cw || !gw || cw === gw) return null;
  const weeklyChange = GOAL_DEFICITS[weightGoal] / 500;
  if (weeklyChange === 0 || !displayPath.d) return null;

  const losing = cw > gw;
  const { d, fillD, startX, startY, endX, endY } = displayPath;

  const strokeDashoffset = dashAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [DASH_LENGTH, 0],
  });
  const fillOpacity = fillAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [0, 1],
  });

  // Midpoint x positions
  const mid1X = padL + graphW * 0.33;
  const mid2X = padL + graphW * 0.66;
  const mid05X = padL + graphW * 0.5;

  return (
    <View style={{ marginTop: 16, borderWidth: 0.5, borderRadius: 14, overflow: 'hidden', backgroundColor: theme.bgCard, borderColor: theme.borderCard }}>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        <Defs>
          <SvgGradient id="graphFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={theme.accentBlueRaw} stopOpacity="0.22" />
            <Stop offset="1" stopColor={theme.accentBlueRaw} stopOpacity="0.02" />
          </SvgGradient>
        </Defs>

        {/* Animated fill -- fades in after line draws */}
        <AnimatedPath d={fillD} fill="url(#graphFill)" fillOpacity={fillOpacity} />

        {/* Animated curve -- draws itself left to right */}
        <AnimatedPath
          d={d}
          stroke={theme.accentBlueRaw}
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${DASH_LENGTH}`}
          strokeDashoffset={strokeDashoffset}
        />

        {/* Dots */}
        <Circle cx={startX} cy={startY} r="5" fill={theme.accentBlueRaw} />
        <Circle cx={endX}   cy={endY}   r="5" fill={theme.accentBlueRaw} />

        {/* Start weight -- right of dot, in open space */}
        <SvgText x={startX + 14} y={startY - 8}
          fontSize="11" fontFamily="DMSans_700Bold" fill={theme.textPrimary}>
          {Math.round(cw)} lbs
        </SvgText>

        {/* Goal weight */}
        <SvgText x={endX - 8} y={losing ? endY - 6 : endY + 14}
          fontSize="11" fontFamily="DMSans_700Bold" fill={theme.accentBlueRaw} textAnchor="end">
          {Math.round(gw)} lbs
        </SvgText>

        {/* Today label */}
        <SvgText x={startX} y={H - 8} fontSize="10" fontFamily="DMSans_400Regular" fill={theme.textMuted}>
          Today
        </SvgText>

        {/* Midpoint labels */}
        {midLabels.length === 1 && (
          <SvgText x={mid05X} y={H - 8} fontSize="10" fontFamily="DMSans_400Regular" fill={theme.textMuted} textAnchor="middle">
            {midLabels[0]}
          </SvgText>
        )}
        {midLabels.length === 2 && (
          <>
            <SvgText x={mid1X} y={H - 8} fontSize="10" fontFamily="DMSans_400Regular" fill={theme.textMuted} textAnchor="middle">
              {midLabels[0]}
            </SvgText>
            <SvgText x={mid2X} y={H - 8} fontSize="10" fontFamily="DMSans_400Regular" fill={theme.textMuted} textAnchor="middle">
              {midLabels[1]}
            </SvgText>
          </>
        )}

        {/* End date */}
        <SvgText x={endX} y={H - 8} fontSize="10" fontFamily="DMSans_400Regular" fill={theme.textMuted} textAnchor="end">
          {projLabel}
        </SvgText>
      </Svg>
    </View>
  );
}

// Animated SVG path wrapper
const AnimatedPath = Animated.createAnimatedComponent(Path);

const theme = THEMES['light'];

const GOAL_DEFICITS: Record<string, number> = {
  lose_2: -1000, lose_1_5: -750, lose_1: -500, lose_0_5: -250,
  maintain: 0, gain_0_5: 250, gain_1: 500,
};

const GOAL_LABELS: Record<string, string> = {
  lose_2:   'Lose 2 lbs / week',
  lose_1_5: 'Lose 1.5 lbs / week',
  lose_1:   'Lose 1 lb / week',
  lose_0_5: 'Lose 0.5 lbs / week',
  maintain: 'Maintain weight',
  gain_0_5: 'Gain 0.5 lbs / week',
  gain_1:   'Gain 1 lb / week',
};

const LIFESTYLE_OPTIONS = [
  { key: 'sedentary',   label: 'Sedentary',      sub: 'Desk job, minimal movement outside of workouts',        multiplier: 1.2  },
  { key: 'light',       label: 'Lightly Active', sub: 'Some walking, on your feet occasionally during the day', multiplier: 1.3  },
  { key: 'active',      label: 'Active',         sub: 'On your feet a lot -- server, teacher, retail, trades',  multiplier: 1.45 },
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

const MODE_COPY = {
  discipline: {
    title: 'Discipline',
    sub:   'You want results. Full visibility, tight targets, no excuses.',
    color: '#c2621a',
  },
  balanced: {
    title: 'Balanced',
    sub:   'Structure with flexibility. Progress without perfection.',
    color: '#2563eb',
  },
  mindful: {
    title: 'Mindful',
    sub:   'Show up, log honestly, and give yourself grace.',
    color: '#059669',
  },
};

const ONELINER: Record<string, Record<string, string>> = {
  discipline: {
    default: "You're built for results. Discipline is exactly where you belong.",
    grace:   "You want results but you analyze and recommit — that's Discipline.",
    numbers: "You want full visibility and you stay consistent. That's Discipline.",
  },
  balanced: {
    default: "You want results but you give yourself grace — that's exactly what Balanced is built for.",
    grace:   "You meet yourself halfway and build real habits. Balanced fits you perfectly.",
    numbers: "General awareness, real habits, real results. Balanced is your match.",
  },
  mindful: {
    default: "You lead with grace. Mindful is built for exactly how you approach this.",
    grace:   "Numbers stress you out and you give yourself grace. Mindful was made for you.",
    numbers: "You're here to feel better, not chase numbers. Mindful is your home.",
  },
};

function getOneliner(mode: string, score: number): string {
  if (mode === 'mindful')    return ONELINER.mindful.grace;
  if (mode === 'discipline') return score >= 11 ? ONELINER.discipline.numbers : ONELINER.discipline.default;
  return score <= 7 ? ONELINER.balanced.grace : ONELINER.balanced.numbers;
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

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  // Load profile biometrics + today's weight
  useEffect(() => {
    const load = async () => {
      const s = await AsyncStorage.getItem('pj_profile');
      const parsed = s ? JSON.parse(s) : {};
      const today = new Date();
      const dk = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
      const dayS = await AsyncStorage.getItem(`pj_${dk}`);
      const day = dayS ? JSON.parse(dayS) : {};
      const savedWeight = day.weight || parsed.weight || 0;
      if (savedWeight) setCurrentWeight(String(savedWeight));
      setProfileData({ ...parsed, weight: savedWeight });
    };
    load();
  }, []);

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
    setSelectedMode(mode);
    if (mode === 'discipline') setMacroPreset('high_protein');
    if (mode === 'balanced')   setMacroPreset('balanced');
  };

  const handleContinue = async () => {
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

      // Discipline gets commitment screen before continuing
      if (selectedMode === 'discipline') {
        router.push('/onboarding/commitment');
      } else {
        router.push('/onboarding/faith-journey');
      }
    } catch (e) {
      console.log('Your style save error', e);
    }
  };

  const oneliner = getOneliner(selectedMode, score);

  return (
    <LinearGradient colors={[theme.gradientStart, theme.gradientEnd]} style={{ flex: 1 }}>

      {/* Progress bar */}
      <View style={[styles.progressBar, { paddingTop: insets.top + 12 }]}>
        <View style={[styles.progressTrack, { backgroundColor: theme.bgProgressTrack }]}>
          <View style={[styles.progressFill, { backgroundColor: theme.accentBlueRaw, width: '42%' }]} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          <Text style={[styles.screenLabel, { color: theme.textMuted }]}>STEP 4 OF 7</Text>
          <Text style={[styles.title, { color: theme.accentBlueRaw }]}>Your Style</Text>
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
                  { backgroundColor: theme.bgCard, borderColor: theme.borderCard },
                  isSelected && { borderColor: copy.color, backgroundColor: `${copy.color}10` },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <View style={[styles.modeDot, { backgroundColor: isSelected ? copy.color : theme.borderInput }]} />
                  <Text style={[styles.modeTitle, { color: isSelected ? copy.color : theme.textPrimary }]}>
                    {copy.title}
                  </Text>
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

          <Text style={[styles.changeable, { color: theme.textDim }]}>
            You can always change this in Settings.
          </Text>

          {/* Current + Goal Weight side by side */}
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 28 }}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionLabel, { color: theme.textMuted, marginBottom: 8 }]}>CURRENT WEIGHT</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <TextInput
                  style={[{ flex: 1, borderWidth: 0.5, borderRadius: 10, padding: 14, fontSize: 16, fontFamily: 'DMSans_400Regular', backgroundColor: theme.bgInput, borderColor: theme.borderInput, color: theme.textPrimary }]}
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
                  <Text style={{ fontSize: 13, fontFamily: 'DMSans_600SemiBold', color: theme.textMuted }}>lbs</Text>
                </View>
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionLabel, { color: theme.textMuted, marginBottom: 8 }]}>GOAL WEIGHT <Text style={{ color: theme.textDim, fontSize: 9 }}>(OPT)</Text></Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <TextInput
                  style={[{ flex: 1, borderWidth: 0.5, borderRadius: 10, padding: 14, fontSize: 16, fontFamily: 'DMSans_400Regular', backgroundColor: theme.bgInput, borderColor: theme.borderInput, color: theme.textPrimary }]}
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
                  <Text style={{ fontSize: 13, fontFamily: 'DMSans_600SemiBold', color: theme.textMuted }}>lbs</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Lifestyle Activity -- compact 2-col grid */}
          <Text style={[styles.sectionLabel, { color: theme.textMuted, marginTop: 28 }]}>LIFESTYLE ACTIVITY</Text>
          <Text style={[styles.sectionSub, { color: theme.textDim, marginBottom: 8 }]}>Your day-to-day movement, not counting workouts.</Text>
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {LIFESTYLE_OPTIONS.slice(0, 2).map(o => {
                const isSelected = lifestyleActivity === o.key;
                return (
                  <TouchableOpacity
                    key={o.key}
                    onPress={() => setLifestyleActivity(o.key)}
                  style={{
                    flex: 1,
                    minHeight: 72,
                    borderWidth: 0.5,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    backgroundColor: isSelected ? theme.accentBlueBg : theme.bgInput,
                    borderColor: isSelected ? theme.accentBlueBorder : theme.borderInput,
                  }}
                >
                  <Text style={{ fontSize: 12, fontFamily: 'DMSans_600SemiBold', color: isSelected ? theme.accentBlue : theme.textPrimary, marginBottom: 2 }}>
                    {o.label}
                  </Text>
                  <Text style={{ fontSize: 10, fontFamily: 'DMSans_400Regular', color: theme.textMuted, lineHeight: 13 }}>
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
                    onPress={() => setLifestyleActivity(o.key)}
                    style={{
                      flex: 1,
                      minHeight: 72,
                      borderWidth: 0.5,
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      backgroundColor: isSelected ? theme.accentBlueBg : theme.bgInput,
                      borderColor: isSelected ? theme.accentBlueBorder : theme.borderInput,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontFamily: 'DMSans_600SemiBold', color: isSelected ? theme.accentBlue : theme.textPrimary, marginBottom: 2 }}>{o.label}</Text>
                    <Text style={{ fontSize: 10, fontFamily: 'DMSans_400Regular', color: theme.textMuted, lineHeight: 13 }}>{o.sub}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Training Frequency -- compact 2-col grid */}
          <Text style={[styles.sectionLabel, { color: theme.textMuted, marginTop: 20 }]}>TRAINING FREQUENCY</Text>
          <Text style={[styles.sectionSub, { color: theme.textDim, marginBottom: 8 }]}>How often you do structured workouts.</Text>
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {TRAINING_OPTIONS.slice(0, 2).map(o => {
                const isSelected = trainingFrequency === o.key;
                return (
                  <TouchableOpacity
                    key={o.key}
                    onPress={() => setTrainingFrequency(o.key)}
                    style={{
                      flex: 1,
                      minHeight: 72,
                      borderWidth: 0.5,
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      backgroundColor: isSelected ? theme.accentBlueBg : theme.bgInput,
                      borderColor: isSelected ? theme.accentBlueBorder : theme.borderInput,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontFamily: 'DMSans_600SemiBold', color: isSelected ? theme.accentBlue : theme.textPrimary, marginBottom: 2 }}>{o.label}</Text>
                    <Text style={{ fontSize: 10, fontFamily: 'DMSans_400Regular', color: theme.textMuted, lineHeight: 13 }}>{o.sub}</Text>
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
                    onPress={() => setTrainingFrequency(o.key)}
                    style={{
                      flex: 1,
                      minHeight: 72,
                      borderWidth: 0.5,
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      backgroundColor: isSelected ? theme.accentBlueBg : theme.bgInput,
                      borderColor: isSelected ? theme.accentBlueBorder : theme.borderInput,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontFamily: 'DMSans_600SemiBold', color: isSelected ? theme.accentBlue : theme.textPrimary, marginBottom: 2 }}>{o.label}</Text>
                    <Text style={{ fontSize: 10, fontFamily: 'DMSans_400Regular', color: theme.textMuted, lineHeight: 13 }}>{o.sub}</Text>
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
                    onPress={() => setTrainingFrequency(o.key)}
                    style={{
                      width: '48.5%',
                      minHeight: 72,
                      borderWidth: 0.5,
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      backgroundColor: isSelected ? theme.accentBlueBg : theme.bgInput,
                      borderColor: isSelected ? theme.accentBlueBorder : theme.borderInput,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontFamily: 'DMSans_600SemiBold', color: isSelected ? theme.accentBlue : theme.textPrimary, marginBottom: 2 }}>{o.label}</Text>
                    <Text style={{ fontSize: 10, fontFamily: 'DMSans_400Regular', color: theme.textMuted, lineHeight: 13 }}>{o.sub}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Live calorie estimate */}
          {suggestedCals && (
            <View style={{ marginTop: 20, borderWidth: 0.5, borderRadius: 14, padding: 16, alignItems: 'center', backgroundColor: theme.bgCard, borderColor: theme.borderCard }}>
              <Text style={{ fontSize: 9, fontFamily: 'DMSans_700Bold', letterSpacing: 3, textTransform: 'uppercase', color: theme.textMuted, marginBottom: 8 }}>YOUR DAILY CALORIE TARGET</Text>
              <Text style={{ fontSize: 48, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1, color: theme.accentBlueRaw }}>
                {suggestedCals} <Text style={{ fontSize: 14, color: theme.textMuted }}>kcal</Text>
              </Text>
              <Text style={{ fontSize: 11, fontFamily: 'DMSans_400Regular', textAlign: 'center', marginTop: 4, color: theme.textDim }}>
                Based on your stats using Mifflin-St Jeor BMR.
              </Text>
            </View>
          )}

          {/* Weekly Goal + Projection -- Discipline and Balanced only */}
          {selectedMode !== 'mindful' && (
            <View style={{ marginTop: 28 }}>
              <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>WEEKLY GOAL</Text>
              <Text style={[styles.sectionSub, { color: theme.textDim }]}>
                This sets your daily calorie target. Choose your pace.
              </Text>

              {/* Pace pills -- rate only, name appears in projection header */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
              >
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
                      onPress={() => { if (!isDimmed) setWeightGoal(pill.key); }}
                      activeOpacity={isDimmed ? 1 : 0.7}
                      style={{
                        borderWidth: 0.5,
                        borderRadius: 20,
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        backgroundColor: isSelected ? theme.accentBlueBg : theme.bgInput,
                        borderColor: isSelected ? theme.accentBlueBorder : theme.borderInput,
                        opacity: isDimmed ? 0.3 : 1,
                      }}
                    >
                      <Text style={{
                        fontSize: 12,
                        fontFamily: 'DMSans_600SemiBold',
                        color: isSelected ? theme.accentBlue : theme.textMuted,
                      }}>
                        {pill.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Projection header with selected pace name */}
              {currentWeight && goalWeight && (() => {
                const selected = PACE_PILLS.find(p => p.key === weightGoal);
                return (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 24, marginBottom: 4 }}>
                    <Text style={[styles.sectionLabel, { color: theme.textMuted, marginBottom: 0 }]}>YOUR PROJECTION</Text>
                    {selected && (
                      <View style={{ marginLeft: 8, backgroundColor: theme.accentBlueBg, borderWidth: 0.5, borderColor: theme.accentBlueBorder, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 9, fontFamily: 'DMSans_700Bold', color: theme.accentBlue, letterSpacing: 1 }}>
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
                />
              ) : (
                <Text style={[styles.sectionLabel, { color: theme.textMuted, marginTop: 24, marginBottom: 4 }]}>YOUR PROJECTION</Text>
              )}
              {(!currentWeight || !goalWeight) && (
                <Text style={{ fontSize: 11, fontFamily: 'DMSans_400Regular', color: theme.textDim, marginTop: 8 }}>
                  Enter your current and goal weight above to see your projection.
                </Text>
              )}
            </View>
          )}

          {/* Macro presets -- Discipline and Balanced only */}
          {selectedMode !== 'mindful' && (
            <View style={{ marginTop: 28 }}>
              <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>MACRO PRESET</Text>
              <Text style={[styles.sectionSub, { color: theme.textDim }]}>
                Sets your protein, carb, and fat targets automatically.
              </Text>
              <View style={styles.presetGrid}>
                {Object.entries(MACRO_PRESETS).map(([key, preset]) => {
                  const isSelected = macroPreset === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      onPress={() => setMacroPreset(key)}
                      style={[
                        styles.presetBtn,
                        { backgroundColor: theme.bgInput, borderColor: theme.borderInput },
                        isSelected && { backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder },
                      ]}
                    >
                      <Text style={[styles.presetLabel, { color: isSelected ? theme.accentBlue : theme.textPrimary }]}>
                        {preset.label}
                      </Text>
                      <Text style={[styles.presetRatio, { color: theme.textMuted }]}>
                        {preset.p}P · {preset.c}C · {preset.f}F
                      </Text>
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
                Project J will celebrate your effort, not judge your numbers.
              </Text>
            </View>
          )}

        </Animated.View>
      </ScrollView>

      {/* Continue footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16, borderTopColor: theme.borderCard, backgroundColor: theme.gradientEnd }]}>
        <TouchableOpacity
          style={[styles.continueBtn, { backgroundColor: theme.accentBlueRaw }]}
          onPress={handleContinue}
        >
          <Text style={[styles.continueBtnText, { color: '#ffffff' }]}>
            {selectedMode === 'discipline' ? "I'M READY" : 'CONTINUE'}
          </Text>
        </TouchableOpacity>
      </View>

    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  progressBar:       { paddingHorizontal: 24, paddingBottom: 8 },
  progressTrack:     { height: 3, borderRadius: 2, overflow: 'hidden' },
  progressFill:      { height: '100%', borderRadius: 2 },
  content:           { padding: 24, paddingTop: 16 },
  screenLabel:       { fontSize: 9,  fontFamily: 'DMSans_700Bold',      letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8 },
  title:             { fontSize: 36, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2, marginBottom: 8 },
  oneliner:          { fontSize: 14, fontFamily: 'DMSans_400Regular',    lineHeight: 22, marginBottom: 24, fontStyle: 'italic' },
  modeCard:          { borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 12 },
  modeDot:           { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  modeTitle:         { fontSize: 20, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2, flex: 1 },
  recommendedBadge:  { borderWidth: 1, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  recommendedText:   { fontSize: 8, fontFamily: 'DMSans_700Bold', letterSpacing: 1.5 },
  modeSub:           { fontSize: 12, fontFamily: 'DMSans_400Regular', lineHeight: 18 },
  changeable:        { fontSize: 11, fontFamily: 'DMSans_400Regular', textAlign: 'center', marginTop: 8 },
  sectionLabel:      { fontSize: 9,  fontFamily: 'DMSans_700Bold', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 4 },
  sectionSub:        { fontSize: 11, fontFamily: 'DMSans_400Regular', marginBottom: 12 },
  presetGrid:        { gap: 8 },
  presetBtn:         { borderWidth: 0.5, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  presetLabel:       { fontSize: 14, fontFamily: 'DMSans_600SemiBold' },
  presetRatio:       { fontSize: 11, fontFamily: 'DMSans_400Regular' },
  mindfulCard:       { marginTop: 28, borderWidth: 1, borderRadius: 14, padding: 20, alignItems: 'center' },
  mindfulText:       { fontSize: 18, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1, marginBottom: 6, textAlign: 'center' },
  mindfulSub:        { fontSize: 12, fontFamily: 'DMSans_400Regular', textAlign: 'center', lineHeight: 18 },
  footer:            { paddingHorizontal: 24, paddingTop: 12, borderTopWidth: 0.5 },
  continueBtn:       { borderRadius: 14, paddingVertical: 18, alignItems: 'center' },
  continueBtnText:   { fontSize: 18, fontFamily: 'BebasNeue_400Regular', letterSpacing: 3 },
});