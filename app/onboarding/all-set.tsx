import { useEffect, useRef, useState } from 'react';
import {
  Animated, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import { THEMES, useTheme } from '../../theme';
import { storageSet } from '../../utils/storage';
import { isOnboardingPreview, setOnboardingPreview } from '../../utils/onboardingPreview';

const theme = THEMES['light'];

// ─── Default card orders per mode ────────────────────────────────────────────
const DISCIPLINE_ORDER = [
  'verse','calories','workout','vs_yesterday','macros',
  'weight','sleep','water','fitness_metrics','if','daily_note',
];
const DISCIPLINE_VISIBLE: Record<string, boolean> = {
  verse: true, calories: true, workout: true, vs_yesterday: true,
  macros: true, weight: true, sleep: true, water: true,
  fitness_metrics: true, if: true, daily_note: true,
};

const BALANCED_ORDER = [
  'verse','calories','workout','macros','water',
  'steps','sleep','weight','vs_yesterday','if','fitness_metrics','daily_note',
];
const BALANCED_VISIBLE: Record<string, boolean> = {
  verse: true, calories: true, workout: true, macros: true, water: true,
  steps: true, sleep: true, weight: true, vs_yesterday: true,
  if: true, fitness_metrics: true, daily_note: true,
};

const MINDFUL_ORDER = [
  'verse','sleep','water','steps','workout',
  'calories','daily_note','fitness_metrics',
  'weight','macros','if','vs_yesterday',
];
const MINDFUL_VISIBLE: Record<string, boolean> = {
  verse: true, sleep: true, water: true, steps: true, workout: true,
  calories: true, daily_note: true, fitness_metrics: true,
  weight: false, macros: false, if: false, vs_yesterday: false,
};

const MODE_LINES: Record<string, string> = {
  discipline: "You came here for a reason. Let's make it count.",
  balanced:   "You've got everything you need. Let's build something real.",
  mindful:    "Every day is a new start. We're glad you're here.",
};

const MODE_ICON: Record<string, string> = {
  discipline: 'barbell',
  balanced:   'leaf',
  mindful:    'heart',
};

// ─── Component ───────────────────────────────────────────────────────────────
export default function AllSetScreen() {
  const insets = useSafeAreaInsets();
  const { setTheme, setAccent } = useTheme();
  const [styleMode, setStyleMode]     = useState<string>('balanced');
  const [faithJourney, setFaithJourney] = useState<string>('rooted');
  const [saving, setSaving]           = useState(false);

  // Entrance anims
  const iconAnim    = useRef(new Animated.Value(0)).current;
  const iconScale   = useRef(new Animated.Value(0.7)).current;
  const labelAnim   = useRef(new Animated.Value(0)).current;
  const labelSlide  = useRef(new Animated.Value(16)).current;
  const lineAnim    = useRef(new Animated.Value(0)).current;
  const lineSlide   = useRef(new Animated.Value(12)).current;
  const btnAnim     = useRef(new Animated.Value(0)).current;
  const btnSlide    = useRef(new Animated.Value(12)).current;
  const btnScale    = useRef(new Animated.Value(1)).current;
  const secScale    = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Load mode from storage
    AsyncStorage.getItem('pj_settings').then(raw => {
      if (raw) {
        const s = JSON.parse(raw);
        if (s.styleMode)    setStyleMode(s.styleMode);
        if (s.faithJourney) setFaithJourney(s.faithJourney);
      }
    });

    // Staggered entrance
    Animated.parallel([
      Animated.timing(iconAnim,  { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(iconScale, { toValue: 1, useNativeDriver: true, damping: 14, stiffness: 160 }),
    ]).start();

    Animated.parallel([
      Animated.timing(labelAnim,  { toValue: 1, duration: 380, delay: 250, useNativeDriver: true }),
      Animated.timing(labelSlide, { toValue: 0, duration: 380, delay: 250, useNativeDriver: true }),
    ]).start();

    Animated.parallel([
      Animated.timing(lineAnim,  { toValue: 1, duration: 360, delay: 400, useNativeDriver: true }),
      Animated.timing(lineSlide, { toValue: 0, duration: 360, delay: 400, useNativeDriver: true }),
    ]).start();

    Animated.parallel([
      Animated.timing(btnAnim,  { toValue: 1, duration: 340, delay: 580, useNativeDriver: true }),
      Animated.timing(btnSlide, { toValue: 0, duration: 340, delay: 580, useNativeDriver: true }),
    ]).start();
  }, []);

  const applyDefaultLayout = async (openEditLayout: boolean) => {
    // Preview mode: write nothing, just exit the preview back to the app.
    if (isOnboardingPreview()) { setOnboardingPreview(false); router.replace('/(tabs)'); return; }
    if (saving) return;
    setSaving(true);

    try {
      const order   = styleMode === 'discipline' ? DISCIPLINE_ORDER
                    : styleMode === 'mindful'    ? MINDFUL_ORDER
                    : BALANCED_ORDER;
      const visible = styleMode === 'discipline' ? DISCIPLINE_VISIBLE
                    : styleMode === 'mindful'    ? MINDFUL_VISIBLE
                    : BALANCED_VISIBLE;

      const raw      = await AsyncStorage.getItem('pj_settings');
      const current  = raw ? JSON.parse(raw) : {};

      const accentId = styleMode === 'discipline' ? 'discipline'
                     : styleMode === 'mindful'    ? 'mindful'
                     : 'green';

      setTheme('light');
      setAccent(accentId as any);

      await storageSet('pj_settings', JSON.stringify({
        ...current,
        cardOrder:      order,
        cardVisible:    visible,
        theme:          'light',
        selectedAccent: accentId,
      }));

      const profileRaw     = await AsyncStorage.getItem('pj_profile');
      const profileCurrent = profileRaw ? JSON.parse(profileRaw) : {};
      await storageSet('pj_profile', JSON.stringify({
        ...profileCurrent,
        waterGoal: profileCurrent.waterGoal ?? '128',
        stepGoal:  profileCurrent.stepGoal  ?? '10000',
        sleepGoal: profileCurrent.sleepGoal ?? '7',
      }));

      await storageSet('pj_onboarding_complete', 'true');

      if (openEditLayout) {
        await storageSet('pj_open_edit_layout', 'true');
      }
    } catch (e) {
      console.log('AllSet save error', e);
    }

    router.replace('/(tabs)');
  };

  const handlePrimary = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    Animated.sequence([
      Animated.timing(btnScale, { toValue: 0.97, duration: 80, useNativeDriver: true }),
      Animated.timing(btnScale, { toValue: 1.0,  duration: 80, useNativeDriver: true }),
    ]).start(() => applyDefaultLayout(false));
  };

  const handleSetItMyself = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.timing(secScale, { toValue: 0.97, duration: 80, useNativeDriver: true }),
      Animated.timing(secScale, { toValue: 1.0,  duration: 80, useNativeDriver: true }),
    ]).start(() => applyDefaultLayout(true));
  };

  const isDiscipline = styleMode === 'discipline';
  const accentColor  = styleMode === 'discipline' ? '#c2621a'
                     : styleMode === 'mindful'    ? '#0d9268'
                     : theme.accentBlueRaw;

  const modeLine = MODE_LINES[styleMode] ?? MODE_LINES.balanced;
  const modeIcon = MODE_ICON[styleMode]  ?? 'leaf';

  return (
    <LinearGradient colors={['#c4c8e8', '#dadcef', '#f0f0f5']} style={{ flex: 1 }}>

      {/* Progress bar -- full */}
      <View style={[styles.progressBar, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={[styles.backBtn, { backgroundColor: `${accentColor}18`, borderColor: `${accentColor}35` }]}
        >
          <Ionicons name="chevron-back" size={20} color={accentColor} />
        </TouchableOpacity>
        <View style={[styles.progressTrack, { backgroundColor: theme.borderCard }]}>
          <View style={[styles.progressFill, { backgroundColor: accentColor, width: '100%' }]} />
        </View>
      </View>

      {/* Content */}
      <View style={[styles.content, { paddingBottom: insets.bottom + 120 }]}>

        {/* Icon */}
        <Animated.View style={[
          styles.iconBox,
          { backgroundColor: accentColor + '14', borderColor: accentColor + '30',
            opacity: iconAnim, transform: [{ scale: iconScale }] },
        ]}>
          <Ionicons name={modeIcon as any} size={32} color={accentColor} />
        </Animated.View>

        {/* Label */}
        <Animated.View style={{ opacity: labelAnim, transform: [{ translateY: labelSlide }] }}>
          <Text style={[styles.screenLabel, { color: theme.textMuted }]}>YOU'RE ALL SET</Text>
        </Animated.View>

        {/* Affirming line */}
        <Animated.View style={{ opacity: lineAnim, transform: [{ translateY: lineSlide }] }}>
          <Text style={[styles.headline, { color: accentColor }]}>{modeLine}</Text>
        </Animated.View>

        {/* Subtext */}
        <Animated.View style={{ opacity: lineAnim, transform: [{ translateY: lineSlide }] }}>
          <Text style={[styles.subtext, { color: theme.textSecondary }]}>
            {isDiscipline
              ? 'Your home screen is ready. You can customize it anytime from the home header.'
              : 'Want to set up your home screen now, or let us handle it?'}
          </Text>
        </Animated.View>

      </View>

      {/* Footer */}
      <Animated.View style={[
        styles.footer,
        {
          opacity: btnAnim,
          transform: [{ translateY: btnSlide }],
          paddingBottom: insets.bottom + 20,
          backgroundColor: theme.gradientEnd,
          borderTopColor: theme.borderCard,
        },
      ]}>

        {/* Primary button */}
        <Animated.View style={{ transform: [{ scale: btnScale }], width: '100%' }}>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: accentColor }]}
            onPress={handlePrimary}
            activeOpacity={1}
            disabled={saving}
          >
            <Text style={styles.primaryBtnText}>
              {isDiscipline ? "LET'S GO" : "WE'LL SET IT UP FOR YOU"}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Secondary button -- Balanced and Mindful only */}
        {!isDiscipline && (
          <Animated.View style={{ transform: [{ scale: secScale }], width: '100%', marginTop: 10 }}>
            <TouchableOpacity
              style={[styles.secondaryBtn, { borderColor: accentColor + '50' }]}
              onPress={handleSetItMyself}
              activeOpacity={0.7}
              disabled={saving}
            >
              <Text style={[styles.secondaryBtnText, { color: accentColor }]}>
                Set it up myself
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        <Text style={[styles.footnote, { color: theme.textDim }]}>
          You can always change your layout from the home screen.
        </Text>
        <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); router.push('/mission'); }} activeOpacity={0.7} style={{ marginTop: 6 }}>
          <Text style={[styles.missionLink, { color: accentColor }]}>What makes this app different</Text>
        </TouchableOpacity>

      </Animated.View>

    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  progressBar:      { paddingHorizontal: 24, paddingBottom: 8, flexDirection: 'row', alignItems: 'center' },
  progressTrack:    { flex: 1, height: 3, borderRadius: 2, overflow: 'hidden' },
  progressFill:     { height: '100%', borderRadius: 2 },
  backBtn:          { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginRight: 12 },

  content:          { flex: 1, paddingHorizontal: 28, paddingTop: 48, alignItems: 'flex-start' },

  iconBox:          { width: 68, height: 68, borderRadius: 20, borderWidth: 1,
                      alignItems: 'center', justifyContent: 'center', marginBottom: 28 },

  screenLabel:      { fontSize: 9, fontFamily: 'DMSans_700Bold', letterSpacing: 3,
                      textTransform: 'uppercase', marginBottom: 12 },

  headline:         { fontSize: 36, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1.5,
                      lineHeight: 40, marginBottom: 14,
                      textShadowColor: 'rgba(0,0,0,0.12)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },

  subtext:          { fontSize: 15, fontFamily: 'DMSans_400Regular', lineHeight: 22, maxWidth: 300 },

  footer:           { paddingHorizontal: 24, paddingTop: 14, borderTopWidth: 0.5,
                      alignItems: 'center', gap: 0 },

  primaryBtn:       { width: '100%', borderRadius: 14, paddingVertical: 17,
                      alignItems: 'center', justifyContent: 'center',
                      shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.12, shadowRadius: 8 },
  primaryBtnText:   { fontSize: 16, fontFamily: 'BebasNeue_400Regular', letterSpacing: 3, color: '#ffffff' },

  secondaryBtn:     { width: '100%', borderRadius: 14, paddingVertical: 15,
                      alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  secondaryBtnText: { fontSize: 14, fontFamily: 'DMSans_600SemiBold', letterSpacing: 0.3 },

  footnote:         { fontSize: 11, fontFamily: 'DMSans_400Regular', marginTop: 14,
                      textAlign: 'center' },
  missionLink:      { fontSize: 12, fontFamily: 'DMSans_600SemiBold', textAlign: 'center',
                      textDecorationLine: 'underline' },
});