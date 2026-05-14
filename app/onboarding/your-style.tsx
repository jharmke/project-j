import { useEffect, useRef, useState } from 'react';
import {
  Animated, ScrollView, StyleSheet, Text,
  TouchableOpacity, View
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TextInput } from 'react-native';
import { THEMES } from '../../theme';

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

const ACTIVITY_OPTIONS = [
  { key: 'sedentary',   label: 'Mostly Sedentary',  sub: 'Desk job, little daily movement, minimal exercise',                    multiplier: 1.2   },
  { key: 'light',       label: 'Lightly Active',    sub: 'Some walking or light activity daily, gym 1–3x / week',               multiplier: 1.375 },
  { key: 'moderate',    label: 'Moderately Active', sub: 'Desk job but active outside work, gym 3–5x / week',                   multiplier: 1.55  },
  { key: 'active',      label: 'Very Active',       sub: 'Physical job or on your feet most of the day',                        multiplier: 1.725 },
  { key: 'very_active', label: 'Extremely Active',  sub: 'Hard physical labor daily, or training twice a day professionally',   multiplier: 1.9   },
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

  const [selectedMode,  setSelectedMode]  = useState(recommended || 'balanced');
  const [macroPreset,   setMacroPreset]   = useState(recommended === 'discipline' ? 'high_protein' : 'balanced');
  const [activity,      setActivity]      = useState('moderate');
  const [goalWeight,    setGoalWeight]    = useState('');
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
      setProfileData({ ...parsed, weight: day.weight || 0 });
    };
    load();
  }, []);

  // Live calorie calc -- fires whenever any relevant field changes
  useEffect(() => {
    if (!profileData) return;
    const w  = parseFloat(profileData.weight || '0') || 0;
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
    const multiplier = ACTIVITY_OPTIONS.find(o => o.key === activity)?.multiplier ?? 1.55;
    const tdee       = bmr * multiplier;
    const deficit    = GOAL_DEFICITS[weightGoal] ?? -500;
    setSuggestedCals(Math.max(1200, Math.round(tdee + deficit)));
  }, [profileData, activity, weightGoal]);

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

      await AsyncStorage.setItem('pj_settings', JSON.stringify({
        ...current,
        styleMode: selectedMode,
        macroPreset,
      }));

      // Save goal fields to profile
      const pd = await AsyncStorage.getItem('pj_profile');
      const prof = pd ? JSON.parse(pd) : {};
      await AsyncStorage.setItem('pj_profile', JSON.stringify({
        ...prof,
        weightGoal,
        goalWeight:    goalWeight || '',
        activityLevel: activity,
        calTarget:     suggestedCals ? String(suggestedCals) : prof.calTarget || '',
      }));

      // Save macro ratios to profile if not mindful
      if (selectedMode !== 'mindful' && preset) {
        const profileData = await AsyncStorage.getItem('pj_profile');
        const profile     = profileData ? JSON.parse(profileData) : {};
        await AsyncStorage.setItem('pj_profile', JSON.stringify({
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

          {/* Activity Level */}
          <Text style={[styles.sectionLabel, { color: theme.textMuted, marginTop: 28 }]}>ACTIVITY LEVEL</Text>
          <View style={{ gap: 8, marginTop: 8 }}>
            {ACTIVITY_OPTIONS.map(o => (
              <TouchableOpacity
                key={o.key}
                onPress={() => setActivity(o.key)}
                style={[
                  styles.presetBtn,
                  { backgroundColor: theme.bgInput, borderColor: theme.borderInput },
                  activity === o.key && { backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[{ fontSize: 13, fontFamily: 'DMSans_500Medium', color: activity === o.key ? theme.accentBlue : theme.textPrimary }]}>
                    {o.label}
                  </Text>
                  <Text style={{ fontSize: 11, fontFamily: 'DMSans_400Regular', color: theme.textMuted, marginTop: 1 }}>{o.sub}</Text>
                </View>
                {activity === o.key && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.accentBlueRaw }} />}
              </TouchableOpacity>
            ))}
          </View>

          {/* Goal Weight + Weekly Pace */}
          <Text style={[styles.sectionLabel, { color: theme.textMuted, marginTop: 28 }]}>GOAL WEIGHT <Text style={{ color: theme.textDim, fontSize: 9 }}>(OPTIONAL)</Text></Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <TextInput
              style={[{ flex: 1, borderWidth: 0.5, borderRadius: 10, padding: 14, fontSize: 16, fontFamily: 'DMSans_400Regular', backgroundColor: theme.bgInput, borderColor: theme.borderInput, color: theme.textPrimary }]}
              placeholder="e.g. 185"
              placeholderTextColor={theme.textPlaceholder}
              value={goalWeight}
              onChangeText={setGoalWeight}
              keyboardType="decimal-pad"
            />
            <View style={{ borderWidth: 0.5, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 14, backgroundColor: theme.bgCard, borderColor: theme.borderCard }}>
              <Text style={{ fontSize: 14, fontFamily: 'DMSans_600SemiBold', color: theme.textMuted }}>lbs</Text>
            </View>
          </View>

          <Text style={[styles.sectionLabel, { color: theme.textMuted, marginTop: 20 }]}>WEEKLY PACE</Text>
          <View style={{ gap: 8, marginTop: 8 }}>
            {Object.entries(GOAL_LABELS).map(([key, label]) => (
              <TouchableOpacity
                key={key}
                onPress={() => setWeightGoal(key)}
                style={[
                  styles.presetBtn,
                  { backgroundColor: theme.bgInput, borderColor: theme.borderInput },
                  weightGoal === key && { backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder },
                ]}
              >
                <Text style={{ fontSize: 13, fontFamily: 'DMSans_500Medium', color: weightGoal === key ? theme.accentBlue : theme.textMuted }}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
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