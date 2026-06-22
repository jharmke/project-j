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
import { THEMES } from '../../theme';
import { isOnboardingPreview } from '../../utils/onboardingPreview';
import { storageSet } from '../../utils/storage';
import { requestNotificationPermission } from '../../services/notifications';

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

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();

  const [faithJourney, setFaithJourney] = useState('rooted');
  const [styleMode,    setStyleMode]    = useState('balanced');
  const [connecting,   setConnecting]   = useState(false);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const cardAnim  = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(18)).current;
  const btnAnim   = useRef(new Animated.Value(0)).current;
  const btnScale  = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    AsyncStorage.getItem('pj_settings').then(raw => {
      if (raw) {
        const s = JSON.parse(raw);
        if (s.faithJourney) setFaithJourney(s.faithJourney);
        if (s.styleMode)    setStyleMode(s.styleMode);
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
    Animated.sequence([
      Animated.timing(btnScale, { toValue: 0.97, duration: 80, useNativeDriver: true }),
      Animated.timing(btnScale, { toValue: 1.0,  duration: 80, useNativeDriver: true }),
    ]).start();
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
    <LinearGradient colors={['#c4c8e8', '#dadcef', '#f0f0f5']} style={{ flex: 1 }}>

      {/* Progress bar */}
      <View style={[styles.progressBar, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={[styles.backBtn, { backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder }]}
        >
          <Ionicons name="chevron-back" size={20} color={theme.accentBlue} />
        </TouchableOpacity>
        <View style={[styles.progressTrack, { backgroundColor: theme.borderCard }]}>
          <View style={[styles.progressFill, { backgroundColor: theme.accentBlueRaw, width: '92%' }]} />
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>

        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <Text style={[styles.screenLabel, { color: theme.textMuted }]}>STEP 7 OF 8</Text>

          <View style={[styles.iconBox, { backgroundColor: theme.accentBlueRaw + '12', borderColor: theme.accentBlueRaw + '25' }]}>
            <Ionicons name="notifications" size={28} color={theme.accentBlueRaw} />
          </View>

          <Text style={[styles.title, { color: theme.accentBlueRaw }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>{subtitle}</Text>
        </Animated.View>

        <Animated.View style={{ opacity: cardAnim, transform: [{ translateY: cardSlide }] }}>
          <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: theme.accentBlueRaw }]}>
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
                <View style={[styles.iconCircle, { backgroundColor: theme.accentBlueRaw + '12' }]}>
                  <Ionicons name={row.icon as any} size={17} color={theme.accentBlueRaw} />
                </View>
                <View style={styles.rowText}>
                  <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>{row.label}</Text>
                  <Text style={[styles.rowDesc,  { color: theme.textMuted }]}>{row.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          <Text style={[styles.reassure, { color: theme.textDim }]}>
            Quiet hours and a daily limit are on by default, so it stays helpful, never noisy.
          </Text>
        </Animated.View>

      </View>

      {/* Footer */}
      <Animated.View style={[
        styles.footer,
        {
          opacity: btnAnim,
          paddingBottom: insets.bottom + 16,
          backgroundColor: theme.gradientEnd,
          borderTopColor: theme.borderCard,
        },
      ]}>
        <Animated.View style={{ transform: [{ scale: btnScale }], width: '100%' }}>
          <TouchableOpacity
            style={[styles.connectBtn, { backgroundColor: theme.accentBlueRaw, opacity: connecting ? 0.7 : 1 }]}
            onPress={handleEnable}
            activeOpacity={1}
            disabled={connecting}
          >
            <Text style={styles.connectBtnText}>
              {connecting ? 'ENABLING...' : 'ENABLE NOTIFICATIONS'}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        <TouchableOpacity onPress={handleSkip} style={styles.skipBtn} activeOpacity={0.6}>
          <Text style={[styles.skipText, { color: theme.textDim }]}>Maybe later</Text>
        </TouchableOpacity>

        <Text style={[styles.pointer, { color: theme.textDim }]}>
          Fine tune exactly what you get anytime in Settings {'>'} Notifications.
        </Text>
      </Animated.View>

    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  progressBar:    { paddingHorizontal: 24, paddingBottom: 8, flexDirection: 'row', alignItems: 'center' },
  progressTrack:  { flex: 1, height: 3, borderRadius: 2, overflow: 'hidden' },
  progressFill:   { height: '100%', borderRadius: 2 },
  backBtn:        { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginRight: 12 },

  content:        { flex: 1, paddingHorizontal: 24, paddingTop: 24 },
  screenLabel:    { fontSize: 9, fontFamily: 'DMSans_700Bold', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 16 },

  iconBox:        { width: 56, height: 56, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },

  title:          { fontSize: 40, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1.5, lineHeight: 42, marginBottom: 10,
                    textShadowColor: 'rgba(0,0,0,0.12)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  subtitle:       { fontSize: 13, fontFamily: 'DMSans_400Regular', lineHeight: 20, marginBottom: 22 },

  card:           { borderWidth: 0.5, borderTopWidth: 1.5, borderRadius: 14,
                    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.10, shadowRadius: 8, elevation: 2 },
  row:            { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11, gap: 12 },
  iconCircle:     { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowText:        { flex: 1 },
  rowLabel:       { fontSize: 13, fontFamily: 'DMSans_600SemiBold', marginBottom: 1 },
  rowDesc:        { fontSize: 11, fontFamily: 'DMSans_400Regular', lineHeight: 16 },

  reassure:       { fontSize: 11, fontFamily: 'DMSans_400Regular', lineHeight: 16, textAlign: 'center', marginTop: 16, paddingHorizontal: 8 },

  footer:         { paddingHorizontal: 24, paddingTop: 12, borderTopWidth: 0.5, alignItems: 'center' },
  connectBtn:     { width: '100%', borderRadius: 14, paddingVertical: 17,
                    alignItems: 'center', justifyContent: 'center',
                    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 8 },
  connectBtnText: { fontSize: 16, fontFamily: 'BebasNeue_400Regular', letterSpacing: 3, color: '#ffffff' },
  skipBtn:        { paddingVertical: 12 },
  skipText:       { fontSize: 14, fontFamily: 'DMSans_400Regular' },
  pointer:        { fontSize: 11, fontFamily: 'DMSans_400Regular', marginTop: 2, textAlign: 'center' },
});
