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
import { useTheme, THEMES } from '../../theme';
import BackgroundLayers from '../../components/BackgroundLayers';
import PrimaryCTA from '../../components/PrimaryCTA';
import GradientTitle from '../../components/GradientTitle';
import GradientNumber from '../../components/GradientNumber';
import { BlurView } from 'expo-blur';
import { isOnboardingPreview } from '../../utils/onboardingPreview';
import { getModeAccentTints, getSessionStyleMode } from '../../utils/modeAccent';
import { storageSet } from '../../utils/storage';
import { Type, numLine } from '../../typography';

const AH_RED = '#FF3B30';

const HEALTH_ITEMS = [
  {
    icon:  'footsteps',
    label: 'Steps',
    desc:  'Your movement, tracked all day without lifting a finger.',
  },
  {
    icon:  'moon',
    label: 'Sleep',
    desc:  'Feeds your sleep score, recovery data, and stage breakdown.',
  },
  {
    icon:  'flame',
    label: 'Active Calories',
    desc:  'Captures real calories burned from workouts and daily movement.',
  },
  {
    icon:  'scale',
    label: 'Weight',
    desc:  'Tracks your progress over time so you can see how far you\'ve come.',
  },
  {
    icon:  'heart',
    label: 'Heart Rate',
    desc:  'Helps track your fitness over time and how well your body is recovering.',
  },
] as const;

function BeatingHeart() {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const beat = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.18, duration: 180, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1.0,  duration: 180, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1.12, duration: 140, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1.0,  duration: 200, useNativeDriver: true }),
        Animated.delay(700),
      ])
    );
    beat.start();
    return () => beat.stop();
  }, []);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Ionicons name="heart" size={28} color={AH_RED} />
    </Animated.View>
  );
}

export default function AppleHealthScreen() {
  const { theme: _theme } = useTheme();
  const theme  = THEMES['light'];
  const insets = useSafeAreaInsets();

  const [connecting, setConnecting] = useState(false);
  // The coaching mode picked on Your Style is saved to pj_settings and IS the accent this user keeps
  // (all-set.tsx calls setAccent from it), so the rest of the flow wears it from the moment they choose.
  // This run's choice wins over storage: preview never writes pj_settings, so storage still holds the OLD
  // mode there and this screen came up the wrong colour.
  const [styleMode, setStyleMode] = useState<string | null>(getSessionStyleMode());
  const { accent, bg: accentBg, border: accentBorder } = getModeAccentTints(styleMode, theme);

  useEffect(() => {
    if (getSessionStyleMode()) return;
    AsyncStorage.getItem('pj_settings').then(raw => {
      setStyleMode(raw ? (JSON.parse(raw).styleMode ?? 'balanced') : 'balanced');
    });
  }, []);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const rowAnims  = HEALTH_ITEMS.map(() => ({
    fade:  useRef(new Animated.Value(0)).current,
    slide: useRef(new Animated.Value(18)).current,
  }));
  const btnAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();

    rowAnims.forEach((a, i) => {
      Animated.parallel([
        Animated.timing(a.fade,  { toValue: 1, duration: 400, delay: 350 + i * 110, useNativeDriver: true }),
        Animated.timing(a.slide, { toValue: 0, duration: 400, delay: 350 + i * 110, useNativeDriver: true }),
      ]).start();
    });

    Animated.timing(btnAnim, { toValue: 1, duration: 400, delay: 950, useNativeDriver: true }).start();
  }, []);

  const saveAndContinue = async (connected: boolean) => {
    if (isOnboardingPreview()) { router.push('/onboarding/notifications'); return; }
    try {
      const existing = await AsyncStorage.getItem('pj_settings');
      const current  = existing ? JSON.parse(existing) : {};
      await storageSet('pj_settings', JSON.stringify({
        ...current,
        healthKitConnected: connected,
      }));
      if (!connected) {
        await storageSet('pj_healthkit_skip', 'true');
      }
    } catch (e) {
      console.log('Apple Health save error', e);
    }
    router.push('/onboarding/notifications');
  };

  const handleConnect = async () => {
    if (connecting) return;
    if (isOnboardingPreview()) { triggerHaptic(Haptics.ImpactFeedbackStyle.Medium); router.push('/onboarding/notifications'); return; }
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    setConnecting(true);
    try {
      const { requestAuthorization } = require('@kingstinct/react-native-healthkit');
      await requestAuthorization(
        [],
        [
          'HKQuantityTypeIdentifierStepCount',
          'HKCategoryTypeIdentifierSleepAnalysis',
          'HKQuantityTypeIdentifierActiveEnergyBurned',
          'HKQuantityTypeIdentifierBodyMass',
          'HKQuantityTypeIdentifierHeartRate',
          'HKQuantityTypeIdentifierVO2Max',
          'HKQuantityTypeIdentifierRestingHeartRate',
        ]
      );
      await saveAndContinue(true);
    } catch (e) {
      console.log('HealthKit auth error', e);
      await saveAndContinue(true);
    } finally {
      setConnecting(false);
    }
  };

  const handleSkip = async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    await saveAndContinue(false);
  };

  return (
    <LinearGradient colors={[theme.gradientEnd, theme.gradientEnd]} style={{ flex: 1 }}>
      <BackgroundLayers glow={accent} />

      {/* Progress bar. Frosted chrome, absolute, glued to the top -- content scrolls under it. */}
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
        <View style={[styles.progressTrack, { backgroundColor: theme.borderCard }]}>
          <View style={[styles.progressFill, { backgroundColor: accent, width: '83%' }]} />
        </View>
      </View>

      {/* Scrolls. Was a static frame, which is a bet that the content can never grow -- and it can:
          with iOS Dynamic Type turned up, onboarding content ran off the bottom with no way to reach
          it (SPEC_accessibility.md). Onboarding runs BEFORE the user can reach any setting of ours, so
          these screens have to survive on their own. The footer is absolute and stays put; the bottom
          padding is what keeps the last row from hiding under it. */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingTop: insets.top + 66, paddingBottom: insets.bottom + 104 }}
        showsVerticalScrollIndicator={false}
      >

        {/* Header block */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <Text style={[styles.screenLabel, { color: theme.textMuted }]}>STEP 5 OF 6</Text>

          {/* Heart FLOATS in the top-right corner. Stacked above the title it cost ~75px of height for one
              decoration and pushed the card onto the footer; in a ROW with the title it stole width and
              forced the title down to 34, which broke the one thing every screen in this flow shares -- the
              title's size and left edge. "Better Data." is short, so the corner is dead space and the icon
              rides there for free. The title is untouched. */}
          <View>
            <View style={[styles.ahIconBox, { backgroundColor: AH_RED + '12', borderColor: AH_RED + '25' }]}>
              <BeatingHeart />
            </View>
            <GradientTitle
              title="Smarter Tracking"
              color={accent}
              style={styles.title}
            />
          </View>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Connect Apple Health and GoodForge gets smarter. Every metric is more accurate, more personal, and more useful.
          </Text>
        </Animated.View>

        {/* Health items card */}
        <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: accent }]}>
          {HEALTH_ITEMS.map((item, i) => (
            <Animated.View
              key={item.label}
              style={{
                opacity: rowAnims[i].fade,
                transform: [{ translateY: rowAnims[i].slide }],
              }}
            >
              <View style={[
                styles.healthRow,
                i < HEALTH_ITEMS.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: theme.borderCard,
                },
              ]}>
                <View style={[styles.iconCircle, { backgroundColor: accent + '12' }]}>
                  <Ionicons name={item.icon as any} size={17} color={accent} />
                </View>
                <View style={styles.rowText}>
                  <GradientNumber value={item.label} color={theme.textSecondary} style={styles.rowLabel} />
                  <Text style={[styles.rowDesc,  { color: theme.textMuted }]}>{item.desc}</Text>
                </View>
              </View>
            </Animated.View>
          ))}
        </View>

      </ScrollView>

      {/* Footer. Frosted chrome (blur + chromeFill), absolute, like every other screen in the flow. */}
      <Animated.View style={[
        styles.footer,
        { opacity: btnAnim, paddingBottom: insets.bottom + 16, borderTopColor: theme.borderCard },
      ]}>
        <BlurView intensity={28} tint="light" style={StyleSheet.absoluteFill} pointerEvents="none" />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.chromeFill }]} pointerEvents="none" />
        <PrimaryCTA
          label={connecting ? 'Connecting...' : 'Connect Apple Health'}
          fill={accent}
          disabled={connecting}
          wrapperStyle={{ width: '100%' }}
          faceStyle={{ borderRadius: 14, paddingVertical: 17 }}
          onPress={handleConnect}
        />

        <TouchableOpacity onPress={handleSkip} style={styles.skipBtn} activeOpacity={0.6}>
          <Text style={[styles.skipText, { color: theme.textSecondary }]}>Maybe later</Text>
        </TouchableOpacity>

        {/* Both of these were on textDim -- the dimmest token in the app. "Maybe later" is one of only two
            ways off this screen, and the read-only line is the reassurance that earns the permission. */}
        <Text style={[styles.readOnly, { color: theme.textSecondary }]}>
          Read-only access. GoodForge never modifies your Apple Health data.
        </Text>
      </Animated.View>

    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  progressBar:    { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, paddingHorizontal: 24, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 0.5, overflow: 'hidden' },
  progressTrack:  { flex: 1, height: 3, borderRadius: 2, overflow: 'hidden' },
  progressFill:   { height: '100%', borderRadius: 2 },
  backBtn:        { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginRight: 12 },

  content:        { flex: 1, paddingHorizontal: 24 },
  // 9/ls3, marginBottom 8 -- matches every other step label in the flow. Was 16, which is what pushed
  // this title down relative to the others once the sizes got unified.
  screenLabel:    { fontSize: 9, fontFamily: Type.uiBold, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8 },

  ahIconBox:      { position: 'absolute', right: 0, top: 2, width: 48, height: 48, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },

  // 36, matching every other step's title (was 40 -- the flow's titles were never actually one
  // consistent size, which is why this one read as jarring the moment it got shrunk to fit).
  title:          { fontSize: 36, fontFamily: Type.display, letterSpacing: 0.3, lineHeight: numLine(36), marginBottom: 10 },
  // VOICE: this is the app talking, not a label.
  subtitle:       { fontSize: 15, fontFamily: Type.voice, lineHeight: 22, marginBottom: 22 },

  // THEMES['light'] directly, not `theme`: that const lives INSIDE the component, and StyleSheet.create
  // runs at module scope.
  card:           { borderWidth: 0.5, borderTopWidth: 1.5, borderRadius: 14,
                    shadowColor: THEMES['light'].cardShadow, shadowOpacity: THEMES['light'].cardShadowOpacity,
                    shadowOffset: { width: 0, height: 3 }, shadowRadius: 8, elevation: 2 },
  healthRow:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11, gap: 12 },
  iconCircle:     { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowText:        { flex: 1 },
  rowLabel:       { fontSize: 13, fontFamily: Type.uiSemibold, marginBottom: 1 },
  rowDesc:        { fontSize: 11, fontFamily: Type.ui, lineHeight: 16 },

  footer:         { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 24, paddingTop: 12, borderTopWidth: 0.5, alignItems: 'center', overflow: 'hidden' },
  skipBtn:        { paddingVertical: 12 },
  skipText:       { fontSize: 14, fontFamily: Type.uiSemibold },
  readOnly:       { fontSize: 11, fontFamily: Type.ui, marginTop: 2, textAlign: 'center' },
});