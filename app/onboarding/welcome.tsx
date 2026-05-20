import { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTheme, THEMES } from '../../theme';
import { storageSet } from '../../utils/storage';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const { theme: _theme } = useTheme();
  const theme = THEMES['light'];

  const logoAnim    = useRef(new Animated.Value(0)).current;
  const taglineAnim = useRef(new Animated.Value(0)).current;
  const buttonAnim  = useRef(new Animated.Value(0)).current;
  const logoY       = useRef(new Animated.Value(24)).current;
  const taglineY    = useRef(new Animated.Value(16)).current;
  const buttonY     = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(300),
      Animated.parallel([
        Animated.timing(logoAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(logoY,    { toValue: 0, duration: 600, useNativeDriver: true }),
      ]),
      Animated.delay(150),
      Animated.parallel([
        Animated.timing(taglineAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(taglineY,    { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
      Animated.delay(150),
      Animated.parallel([
        Animated.timing(buttonAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(buttonY,    { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  return (
    <LinearGradient
      colors={[theme.gradientStart, theme.gradientEnd]}
      style={styles.container}
    >
      {/* Ambient glow */}
      <View style={[styles.glow, { backgroundColor: theme.accentBlueRaw + '18' }]} />

      {/* Logo block */}
      <Animated.View style={[styles.logoBlock, { opacity: logoAnim, transform: [{ translateY: logoY }] }]}>
        <Text style={[styles.logoSub, { color: theme.textMuted }]}>PROJECT</Text>
        <Text style={[styles.logoMain, { color: theme.accentBlueRaw }]}>J</Text>
      </Animated.View>

      {/* Tagline */}
      <Animated.View style={[styles.taglineBlock, { opacity: taglineAnim, transform: [{ translateY: taglineY }] }]}>
        <Text style={[styles.tagline, { color: theme.textSecondary }]}>
          The app that actually cares about you.
        </Text>
      </Animated.View>

      {/* Continue button */}
      <Animated.View style={[styles.buttonBlock, { opacity: buttonAnim, transform: [{ translateY: buttonY }] }]}>
        <TouchableOpacity
          style={[styles.continueBtn, { backgroundColor: theme.accentBlueRaw }]}
          onPress={() => router.push('/onboarding/profile-setup')}
          activeOpacity={0.85}
        >
          <Text style={[styles.continueBtnText, { color: '#ffffff' }]}>GET STARTED</Text>
        </TouchableOpacity>
        <Text style={[styles.signInHint, { color: theme.textDim }]}>
          Already have an account? Sign in
        </Text>
        {__DEV__ && (
          <TouchableOpacity
            style={{ marginTop: 16, padding: 8 }}
            onPress={async () => {
              await storageSet('pj_onboarding_complete', 'true');
              router.replace('/(tabs)');
            }}
          >
            <Text style={{ color: theme.textDim, fontSize: 11, fontFamily: 'DMSans_400Regular' }}>
              [DEV] Skip onboarding
            </Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, alignItems: 'center', justifyContent: 'center' },
  glow:         { position: 'absolute', width: 320, height: 320, borderRadius: 160, top: '20%', alignSelf: 'center' },
  logoBlock:    { alignItems: 'center', marginBottom: 24 },
  logoSub:      { fontSize: 13, fontFamily: 'DMSans_700Bold', letterSpacing: 8, textTransform: 'uppercase', marginBottom: -8 },
  logoMain:     { fontSize: 160, fontFamily: 'BebasNeue_400Regular', letterSpacing: -4, lineHeight: 160 },
  taglineBlock: { alignItems: 'center', paddingHorizontal: 48, marginBottom: 64 },
  tagline:      { fontSize: 16, fontFamily: 'DMSans_400Regular', textAlign: 'center', lineHeight: 24 },
  buttonBlock:  { position: 'absolute', bottom: 60, left: 32, right: 32, alignItems: 'center' },
  continueBtn:  { width: '100%', paddingVertical: 18, borderRadius: 14, alignItems: 'center', marginBottom: 16,
                  shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12 },
  continueBtnText: { fontSize: 18, fontFamily: 'BebasNeue_400Regular', letterSpacing: 3 },
  signInHint:   { fontSize: 13, fontFamily: 'DMSans_400Regular' },
});