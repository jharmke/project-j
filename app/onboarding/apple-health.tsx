import { useEffect, useRef, useState } from 'react';
import {
  Animated, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import { useTheme, THEMES } from '../../theme';
import { isOnboardingPreview } from '../../utils/onboardingPreview';
import { storageSet } from '../../utils/storage';

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

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const rowAnims  = HEALTH_ITEMS.map(() => ({
    fade:  useRef(new Animated.Value(0)).current,
    slide: useRef(new Animated.Value(18)).current,
  }));
  const btnAnim  = useRef(new Animated.Value(0)).current;
  const btnScale = useRef(new Animated.Value(1)).current;

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
    if (isOnboardingPreview()) { router.push('/onboarding/all-set'); return; }
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
    router.push('/onboarding/all-set');
  };

  const handleConnect = async () => {
    if (connecting) return;
    if (isOnboardingPreview()) { triggerHaptic(Haptics.ImpactFeedbackStyle.Medium); router.push('/onboarding/all-set'); return; }
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    Animated.sequence([
      Animated.timing(btnScale, { toValue: 0.97, duration: 80, useNativeDriver: true }),
      Animated.timing(btnScale, { toValue: 1.0,  duration: 80, useNativeDriver: true }),
    ]).start();
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
    <LinearGradient
      colors={[theme.gradientStart, theme.gradientEnd]}
      style={{ flex: 1 }}
    >
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
          <View style={[styles.progressFill, { backgroundColor: theme.accentBlueRaw, width: '85%' }]} />
        </View>
      </View>

      {/* Content -- static, no scroll */}
      <View style={styles.content}>

        {/* Header block */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <Text style={[styles.screenLabel, { color: theme.textMuted }]}>STEP 6 OF 7</Text>

          <View style={[styles.ahIconBox, { backgroundColor: AH_RED + '12', borderColor: AH_RED + '25' }]}>
            <BeatingHeart />
          </View>

          <Text style={[styles.title, { color: theme.accentBlueRaw }]}>
            Better Data.{'\n'}Better Results.
          </Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            Connect Apple Health and Project J gets smarter. Every metric is more accurate, more personal, and more useful.
          </Text>
        </Animated.View>

        {/* Health items card */}
        <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderCard }]}>
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
                <View style={[styles.iconCircle, { backgroundColor: theme.accentBlueRaw + '12' }]}>
                  <Ionicons name={item.icon as any} size={17} color={theme.accentBlueRaw} />
                </View>
                <View style={styles.rowText}>
                  <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>{item.label}</Text>
                  <Text style={[styles.rowDesc,  { color: theme.textMuted }]}>{item.desc}</Text>
                </View>
              </View>
            </Animated.View>
          ))}
        </View>

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
            onPress={handleConnect}
            activeOpacity={1}
            disabled={connecting}
          >
            <Text style={styles.connectBtnText}>
              {connecting ? 'CONNECTING...' : 'CONNECT APPLE HEALTH'}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        <TouchableOpacity onPress={handleSkip} style={styles.skipBtn} activeOpacity={0.6}>
          <Text style={[styles.skipText, { color: theme.textDim }]}>Maybe later</Text>
        </TouchableOpacity>

        <Text style={[styles.readOnly, { color: theme.textDim }]}>
          Read-only access. Project J never modifies your Apple Health data.
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

  ahIconBox:      { width: 56, height: 56, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },

  title:          { fontSize: 40, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1.5, lineHeight: 42, marginBottom: 10 },
  subtitle:       { fontSize: 13, fontFamily: 'DMSans_400Regular', lineHeight: 20, marginBottom: 22 },

  card:           { borderWidth: 0.5, borderRadius: 14, overflow: 'hidden' },
  healthRow:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11, gap: 12 },
  iconCircle:     { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowText:        { flex: 1 },
  rowLabel:       { fontSize: 13, fontFamily: 'DMSans_600SemiBold', marginBottom: 1 },
  rowDesc:        { fontSize: 11, fontFamily: 'DMSans_400Regular', lineHeight: 16 },

  footer:         { paddingHorizontal: 24, paddingTop: 12, borderTopWidth: 0.5, alignItems: 'center' },
  connectBtn:     { width: '100%', borderRadius: 14, paddingVertical: 17,
                    alignItems: 'center', justifyContent: 'center',
                    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 8 },
  connectBtnText: { fontSize: 16, fontFamily: 'BebasNeue_400Regular', letterSpacing: 3, color: '#ffffff' },
  skipBtn:        { paddingVertical: 12 },
  skipText:       { fontSize: 14, fontFamily: 'DMSans_400Regular' },
  readOnly:       { fontSize: 11, fontFamily: 'DMSans_400Regular', marginTop: 2, textAlign: 'center' },
});