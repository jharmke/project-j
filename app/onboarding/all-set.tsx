import { useEffect, useRef, useState } from 'react';
import { Text } from '@/components/AppText';
import {
  Animated, ScrollView, StyleSheet, TouchableOpacity, View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@/components/AppIcons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import { THEMES, useTheme } from '../../theme';
import { storageSet } from '../../utils/storage';
import { isOnboardingPreview, setOnboardingPreview } from '../../utils/onboardingPreview';
import { getModeAccent, getSessionStyleMode } from '../../utils/modeAccent';
import BackgroundLayers from '../../components/BackgroundLayers';
import PrimaryCTA from '../../components/PrimaryCTA';
import { BlurView } from 'expo-blur';
import { Type, numLine } from '../../typography';
import GradientNumber from '../../components/GradientNumber';
import GradientTitle from '../../components/GradientTitle';

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
  discipline: "Let's Make It Count.",
  balanced:   "Let's Get To Work",
  mindful:    "Glad You're Here.",
};

// MODE_ICON (barbell / leaf / heart) and its box are GONE 2026-07-16. The leaf was Balanced's badge and read
// as clip art; the box below it cost real height on the one screen that should feel like arriving, not like
// another form. The mode already speaks here through the accent colour and its own headline.

// Quick tips, order locked: Otto -> where the explainers are -> make it yours.
//
// OTTO LEADS. He introduces himself with a one-time callout on Home (AssistantOverlay), but a user who
// never taps him never learns what he is -- naming him here is what makes that callout land.
// Note the copy does NOT promise "anything, anytime": free accounts have an AI cap, and this screen is not
// the place to write a cheque the quota won't cash.
//
// The old tips 1 and 2 ("Stuck on anything?" -> (i)/(?) and "Need a refresher?" -> Settings > Help) were the
// SAME tip wearing two hats -- both are "where to look things up" -- and they ate two of the three rows.
const ALLSET_TIPS = [
  {
    icon: 'sparkles',
    lead: 'Meet Otto',
    body: 'Your companion, bottom left of every screen. Ask him how something works, where a setting lives, or how your week is going.',
  },
  {
    icon: 'information-circle',
    lead: 'Want the details?',
    body: 'Tap the (i) on any card for what its numbers mean, or the (?) in a tab’s header for tips and tutorials. Every guide also lives in Settings > Help.',
  },
  {
    icon: 'grid',
    lead: 'Make it yours',
    body: 'Tap the grid icon up top to rearrange or hide your home cards.',
  },
];

// ─── Component ───────────────────────────────────────────────────────────────
export default function AllSetScreen() {
  const insets = useSafeAreaInsets();
  const { setTheme, setAccent } = useTheme();
  const [styleMode, setStyleMode]     = useState<string>(getSessionStyleMode() ?? 'balanced');
  const [faithJourney, setFaithJourney] = useState<string>('rooted');
  const [saving, setSaving]           = useState(false);

  // Entrance anims
  const labelAnim   = useRef(new Animated.Value(0)).current;
  const labelSlide  = useRef(new Animated.Value(16)).current;
  const lineAnim    = useRef(new Animated.Value(0)).current;
  const lineSlide   = useRef(new Animated.Value(12)).current;
  const tipsAnim    = useRef(new Animated.Value(0)).current;
  const tipsSlide   = useRef(new Animated.Value(12)).current;
  const btnAnim     = useRef(new Animated.Value(0)).current;
  const btnSlide    = useRef(new Animated.Value(12)).current;
  const secScale    = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Load mode from storage
    AsyncStorage.getItem('pj_settings').then(raw => {
      if (raw) {
        const s = JSON.parse(raw);
        // This run's choice wins over storage -- preview never writes pj_settings.
        if (s.styleMode && !getSessionStyleMode()) setStyleMode(s.styleMode);
        if (s.faithJourney) setFaithJourney(s.faithJourney);
      }
    });

    // Staggered entrance. The label leads now that the mode icon is gone, so it no longer waits 250ms for
    // an icon that never arrives.
    Animated.parallel([
      Animated.timing(labelAnim,  { toValue: 1, duration: 380, useNativeDriver: true }),
      Animated.timing(labelSlide, { toValue: 0, duration: 380, useNativeDriver: true }),
    ]).start();

    Animated.parallel([
      Animated.timing(lineAnim,  { toValue: 1, duration: 360, delay: 400, useNativeDriver: true }),
      Animated.timing(lineSlide, { toValue: 0, duration: 360, delay: 400, useNativeDriver: true }),
    ]).start();

    Animated.parallel([
      Animated.timing(tipsAnim,  { toValue: 1, duration: 360, delay: 520, useNativeDriver: true }),
      Animated.timing(tipsSlide, { toValue: 0, duration: 360, delay: 520, useNativeDriver: true }),
    ]).start();

    Animated.parallel([
      Animated.timing(btnAnim,  { toValue: 1, duration: 340, delay: 700, useNativeDriver: true }),
      Animated.timing(btnSlide, { toValue: 0, duration: 340, delay: 700, useNativeDriver: true }),
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
    applyDefaultLayout(false);
  };

  const handleSetItMyself = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.timing(secScale, { toValue: 0.97, duration: 80, useNativeDriver: true }),
      Animated.timing(secScale, { toValue: 1.0,  duration: 80, useNativeDriver: true }),
    ]).start(() => applyDefaultLayout(true));
  };

  const isDiscipline = styleMode === 'discipline';
  // One source of truth with the rest of the flow. Balanced used to fall back to the base blue here, a
  // near-miss of the #1a44c2 the 'green'-ID accent (labelled "Blue") actually grants three lines below.
  const accentColor  = getModeAccent(styleMode);

  const modeLine = MODE_LINES[styleMode] ?? MODE_LINES.balanced;

  return (
    <LinearGradient colors={[theme.gradientEnd, theme.gradientEnd]} style={{ flex: 1 }}>
      <BackgroundLayers glow={accentColor} />

      {/* Progress bar -- full. Frosted chrome, absolute, glued to the top. */}
      <View style={[styles.progressBar, { paddingTop: insets.top + 12, borderBottomColor: theme.borderCard }]}>
        <BlurView intensity={28} tint="light" style={StyleSheet.absoluteFill} pointerEvents="none" />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.chromeFill }]} pointerEvents="none" />
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
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 72, paddingBottom: 24 }]}
        showsVerticalScrollIndicator={false}
      >

        {/* Label */}
        <Animated.View style={{ opacity: labelAnim, transform: [{ translateY: labelSlide }] }}>
          <Text style={[styles.screenLabel, { color: theme.textMuted }]}>YOU'RE ALL SET</Text>
        </Animated.View>

        {/* Affirming line */}
        <Animated.View style={{ opacity: lineAnim, transform: [{ translateY: lineSlide }] }}>
          <GradientTitle title={modeLine} color={accentColor} style={styles.headline} />
        </Animated.View>

        {/* Quick tips */}
        <Animated.View style={{ opacity: tipsAnim, transform: [{ translateY: tipsSlide }], width: '100%', marginTop: 26 }}>
          <View style={[styles.tipCard, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: accentColor }]}>
            {ALLSET_TIPS.map((tip, i) => (
              <View
                key={tip.lead}
                style={[
                  styles.tipRow,
                  i < ALLSET_TIPS.length - 1 && {
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: theme.borderCard,
                  },
                ]}
              >
                <View style={[styles.tipIconCircle, { backgroundColor: accentColor + '18', borderColor: accentColor + '30' }]}>
                  <Ionicons name={tip.icon as any} size={17} color={accentColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <GradientNumber value={tip.lead} color={theme.textSecondary} style={styles.tipLead} />
                  <Text style={[styles.tipBody, { color: theme.textSecondary }]}>{tip.body}</Text>
                </View>
              </View>
            ))}
          </View>
        </Animated.View>

      </ScrollView>

      {/* Footer */}
      <Animated.View style={[
        styles.footer,
        {
          opacity: btnAnim,
          transform: [{ translateY: btnSlide }],
          paddingBottom: insets.bottom + 20,
          borderTopColor: theme.borderCard,
        },
      ]}>
        <BlurView intensity={28} tint="light" style={StyleSheet.absoluteFill} pointerEvents="none" />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.chromeFill }]} pointerEvents="none" />

        {/* Primary button */}
        <PrimaryCTA
          label={isDiscipline ? "Let's Go" : "We'll Set It Up For You"}
          fill={accentColor}
          disabled={saving}
          wrapperStyle={{ width: '100%' }}
          faceStyle={{ borderRadius: 14, paddingVertical: 17 }}
          onPress={handlePrimary}
        />

        {/* Secondary button -- Balanced and Mindful only. Stays an outline: two molded buttons stacked would
            leave neither reading as THE action. */}
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

      </Animated.View>

    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  progressBar:      { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, paddingHorizontal: 24, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 0.5, overflow: 'hidden' },
  progressTrack:    { flex: 1, height: 3, borderRadius: 2, overflow: 'hidden' },
  progressFill:     { height: '100%', borderRadius: 2 },
  backBtn:          { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginRight: 12 },

  content:          { flexGrow: 1, paddingHorizontal: 28, alignItems: 'flex-start' },

  // marginBottom 8, matches every other step label in the flow (was 12).
  screenLabel:      { fontSize: 9, fontFamily: Type.uiBold, letterSpacing: 3,
                      textTransform: 'uppercase', marginBottom: 8 },

  // No textShadow -- a drop shadow on a display title is a trick nothing else in the app uses.
  headline:         { fontSize: 36, fontFamily: Type.display, letterSpacing: 0.3,
                      lineHeight: numLine(36), marginBottom: 14 },

  // VOICE: this is the app talking, not a label.
  subtext:          { fontSize: 15, fontFamily: Type.voice, lineHeight: 22, maxWidth: 300 },

  // THEMES['light'] directly, not `theme` -- StyleSheet.create runs at module scope.
  tipCard:          { width: '100%', borderWidth: 0.5, borderTopWidth: 1.5, borderRadius: 14,
                      shadowColor: THEMES['light'].cardShadow, shadowOpacity: THEMES['light'].cardShadowOpacity,
                      shadowOffset: { width: 0, height: 3 }, shadowRadius: 8, elevation: 2 },
  tipRow:           { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 13, gap: 12 },
  tipIconCircle:    { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  tipLead:          { fontSize: 13, fontFamily: Type.uiSemibold, marginBottom: 2 },
  tipBody:          { fontSize: 11, fontFamily: Type.ui, lineHeight: 16 },

  footer:           { position: 'absolute', bottom: 0, left: 0, right: 0,
                      paddingHorizontal: 24, paddingTop: 14, borderTopWidth: 0.5,
                      alignItems: 'center', gap: 0, overflow: 'hidden' },

  secondaryBtn:     { width: '100%', borderRadius: 14, paddingVertical: 15,
                      alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  secondaryBtnText: { fontSize: 14, fontFamily: Type.uiSemibold, letterSpacing: 0.3 },

  footnote:         { fontSize: 11, fontFamily: Type.ui, marginTop: 14,
                      textAlign: 'center' },
  missionLink:      { fontSize: 12, fontFamily: Type.uiSemibold, textAlign: 'center',
                      textDecorationLine: 'underline' },
});