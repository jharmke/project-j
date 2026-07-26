import { useEffect, useRef, useState } from 'react';
import { Text } from '@/components/AppText';
import {
  Animated, StyleSheet, TouchableOpacity, View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@/components/AppIcons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import { THEMES } from '../../theme';
import { isOnboardingPreview } from '../../utils/onboardingPreview';
import { getModeAccentTints, getSessionStyleMode } from '../../utils/modeAccent';
import BackgroundLayers from '../../components/BackgroundLayers';
import PrimaryCTA from '../../components/PrimaryCTA';
import GradientTitle from '../../components/GradientTitle';
import GradientNumber from '../../components/GradientNumber';
import { BlurView } from 'expo-blur';
import { storageSet } from '../../utils/storage';
import { requestNotificationPermission } from '../../services/notifications';
import { Type, numLine } from '../../typography';

const theme = THEMES['light'];

type BenefitRow = { icon: string; label: string; desc: string; faith?: boolean };

// Discipline / Balanced framing
const ROWS_DEFAULT: BenefitRow[] = [
  { icon: 'flame',       label: 'Protect your streaks',     desc: 'A heads up before a streak is about to slip.' },
  { icon: 'water',       label: 'Stay on pace',             desc: 'Light nudges for water, logging, and movement when you fall behind.' },
  { icon: 'book',        label: 'Faith reminders',          desc: 'Your daily verse and reading plans, right on time.', faith: true },
  { icon: 'stats-chart', label: 'Weekly and monthly recaps', desc: 'Know the moment a new summary is ready.' },
];

// Mindful framing: no streak pressure, lead with reflection (mirrors what actually fires in Mindful)
const ROWS_MINDFUL: BenefitRow[] = [
  { icon: 'heart',       label: 'Moments to reflect',       desc: 'A gentle nudge to pause for gratitude or prayer.' },
  { icon: 'water',       label: 'Stay hydrated',            desc: 'A light reminder if you are falling behind on water.' },
  { icon: 'book',        label: 'Faith reminders',          desc: 'Your daily verse and reading plans, right on time.', faith: true },
  { icon: 'stats-chart', label: 'Weekly and monthly recaps', desc: 'Know the moment a new summary is ready.' },
];

// Same idea as Apple Health's BeatingHeart, but a bell swings rather than pulses: a quick shake that decays,
// then a long rest. The rest is what keeps it subtle -- a bell ringing nonstop is a fire alarm.
function RingingBell({ color }: { color: string }) {
  const swing = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const t = (toValue: number, duration: number) =>
      Animated.timing(swing, { toValue, duration, useNativeDriver: true });
    const ring = Animated.loop(
      Animated.sequence([
        t(1, 90), t(-1, 130), t(0.7, 120), t(-0.5, 110), t(0.25, 100), t(0, 90),
        Animated.delay(2400),
      ])
    );
    ring.start();
    return () => ring.stop();
  }, []);

  // Small arc. A bell pivots at its crown, but RN rotates about centre, so a wide swing reads as the whole
  // bell sliding rather than swinging -- 9 degrees is where it still looks hinged.
  const rotate = swing.interpolate({ inputRange: [-1, 1], outputRange: ['-9deg', '9deg'] });

  return (
    <Animated.View style={{ transform: [{ rotate }] }}>
      <Ionicons name="notifications" size={26} color={color} />
    </Animated.View>
  );
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();

  const [faithJourney, setFaithJourney] = useState('rooted');
  // This run's choice wins over storage -- preview never writes pj_settings. Drives the COPY as well as the
  // colour here, so in preview the Mindful wording was wrong too, not just the blue.
  const [styleMode,    setStyleMode]    = useState(getSessionStyleMode() ?? 'balanced');
  const [connecting,   setConnecting]   = useState(false);
  // styleMode was already read here (it drives the copy) -- it just was not driving the COLOUR. The mode a
  // user picks IS the accent they keep (all-set.tsx calls setAccent from it), so this screen wears it.
  const { accent, bg: accentBg, border: accentBorder } = getModeAccentTints(styleMode, theme);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const cardAnim  = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(18)).current;
  const btnAnim   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    AsyncStorage.getItem('pj_settings').then(raw => {
      if (raw) {
        const s = JSON.parse(raw);
        if (s.faithJourney) setFaithJourney(s.faithJourney);
        if (s.styleMode && !getSessionStyleMode()) setStyleMode(s.styleMode);
      }
    });

    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();

    Animated.parallel([
      Animated.timing(cardAnim,  { toValue: 1, duration: 420, delay: 300, useNativeDriver: true }),
      Animated.timing(cardSlide, { toValue: 0, duration: 420, delay: 300, useNativeDriver: true }),
    ]).start();

    Animated.timing(btnAnim, { toValue: 1, duration: 400, delay: 620, useNativeDriver: true }).start();
  }, []);

  const isMindful = styleMode === 'mindful';
  const rows = (isMindful ? ROWS_MINDFUL : ROWS_DEFAULT)
    .filter(r => !r.faith || faithJourney !== 'notrightnow');

  const title = isMindful ? 'Gentle Reminders' : 'Stay On Track';
  const subtitle = isMindful
    ? 'A few gentle check ins, only if you want them. No pressure, ever.'
    : 'A few well timed nudges to keep your momentum going. You are always in control.';

  const saveAndContinue = async (enabled: boolean) => {
    if (isOnboardingPreview()) { router.push('/onboarding/all-set'); return; }
    try {
      if (!enabled) await storageSet('pj_notifications_skip', 'true');
    } catch (e) {
      console.log('Notifications skip save error', e);
    }
    router.push('/onboarding/all-set');
  };

  const handleEnable = async () => {
    if (connecting) return;
    if (isOnboardingPreview()) { triggerHaptic(Haptics.ImpactFeedbackStyle.Medium); router.push('/onboarding/all-set'); return; }
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    setConnecting(true);
    try {
      await requestNotificationPermission();
    } catch (e) {
      console.log('Notification permission error', e);
    } finally {
      setConnecting(false);
    }
    await saveAndContinue(true);
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
          <View style={[styles.progressFill, { backgroundColor: accent, width: '100%' }]} />
        </View>
      </View>

      {/* Content */}
      <View style={[styles.content, { paddingTop: insets.top + 66 }]}>

        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <Text style={[styles.screenLabel, { color: theme.textMuted }]}>STEP 6 OF 6</Text>

          {/* Icon FLOATS top-right, same as Apple Health. Stacked above the title it cost ~75px of height
              for one decoration; in a row with the title it would steal width and force the title smaller,
              breaking the one thing every screen in this flow shares -- the title's size and left edge. */}
          <View>
            <View style={[styles.iconBox, { backgroundColor: accent + '12', borderColor: accent + '25' }]}>
              <RingingBell color={accent} />
            </View>
            <GradientTitle title={title} color={accent} style={styles.title} />
          </View>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{subtitle}</Text>
        </Animated.View>

        <Animated.View style={{ opacity: cardAnim, transform: [{ translateY: cardSlide }] }}>
          <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: accent }]}>
            {rows.map((row, i) => (
              <View
                key={row.label}
                style={[
                  styles.row,
                  i < rows.length - 1 && {
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: theme.borderCard,
                  },
                ]}
              >
                <View style={[styles.iconCircle, { backgroundColor: accent + '12' }]}>
                  <Ionicons name={row.icon as any} size={17} color={accent} />
                </View>
                <View style={styles.rowText}>
                  <GradientNumber value={row.label} color={theme.textSecondary} style={styles.rowLabel} />
                  <Text style={[styles.rowDesc,  { color: theme.textMuted }]}>{row.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* ONE line, not two. This was two centred paragraphs at two different sizes saying two halves of
              the same thought ("we won't spam you" / "you can change it") -- a wall of small print under a
              clean card. Also off textDim: the reassurance is what earns the permission. */}
          <Text style={[styles.reassure, { color: theme.textSecondary }]}>
            Quiet hours and a daily limit are on by default. Change anything anytime in{' '}
            <Text style={{ color: accent, fontFamily: Type.uiSemibold }}>Settings {'>'} Notifications</Text>.
          </Text>
        </Animated.View>

      </View>

      {/* Footer. Frosted chrome (blur + chromeFill), absolute, like every other screen in the flow. */}
      <Animated.View style={[
        styles.footer,
        { opacity: btnAnim, paddingBottom: insets.bottom + 16, borderTopColor: theme.borderCard },
      ]}>
        <BlurView intensity={28} tint="light" style={StyleSheet.absoluteFill} pointerEvents="none" />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.chromeFill }]} pointerEvents="none" />
        <PrimaryCTA
          label={connecting ? 'Enabling...' : 'Enable Notifications'}
          fill={accent}
          disabled={connecting}
          wrapperStyle={{ width: '100%' }}
          faceStyle={{ borderRadius: 14, paddingVertical: 17 }}
          onPress={handleEnable}
        />

        {/* "Maybe later" is one of only two ways off this screen -- it was on textDim, the dimmest token. */}
        <TouchableOpacity onPress={handleSkip} style={styles.skipBtn} activeOpacity={0.6}>
          <Text style={[styles.skipText, { color: theme.textSecondary }]}>Maybe later</Text>
        </TouchableOpacity>
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
  // marginBottom 8, matches every other step label in the flow (was 16, same leftover as Apple Health).
  screenLabel:    { fontSize: 9, fontFamily: Type.uiBold, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8 },

  iconBox:        { position: 'absolute', right: 0, top: 2, width: 48, height: 48, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },

  // 36, matching every other step's title (was 40).
  // No textShadow -- a drop shadow on a display title is a trick nothing else in the app uses.
  title:          { fontSize: 36, fontFamily: Type.display, letterSpacing: 0.3, lineHeight: numLine(36), marginBottom: 10 },
  // VOICE: this is the app talking, not a label.
  subtitle:       { fontSize: 15, fontFamily: Type.voice, lineHeight: 22, marginBottom: 22 },

  // THEMES['light'] directly, not `theme` -- StyleSheet.create runs at module scope.
  card:           { borderWidth: 0.5, borderTopWidth: 1.5, borderRadius: 14,
                    shadowColor: THEMES['light'].cardShadow, shadowOpacity: THEMES['light'].cardShadowOpacity,
                    shadowOffset: { width: 0, height: 3 }, shadowRadius: 8, elevation: 2 },
  row:            { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11, gap: 12 },
  iconCircle:     { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowText:        { flex: 1 },
  rowLabel:       { fontSize: 13, fontFamily: Type.uiSemibold, marginBottom: 1 },
  rowDesc:        { fontSize: 11, fontFamily: Type.ui, lineHeight: 16 },

  reassure:       { fontSize: 12, fontFamily: Type.ui, lineHeight: 17, textAlign: 'center', marginTop: 16, paddingHorizontal: 8 },

  footer:         { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 24, paddingTop: 12, borderTopWidth: 0.5, alignItems: 'center', overflow: 'hidden' },
  skipBtn:        { paddingVertical: 12 },
  skipText:       { fontSize: 14, fontFamily: Type.uiSemibold },
});
