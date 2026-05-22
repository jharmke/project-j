import { useEffect, useRef } from 'react';
import { Animated, Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { storageSet } from '../../utils/storage';

const SCREEN_W = Dimensions.get('window').width;
const BG = '#0d0d0f';

export default function WelcomeScreen() {
  const fadeAnim   = useRef(new Animated.Value(0)).current;
  const nameAnim   = useRef(new Animated.Value(0)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;
  const nameY      = useRef(new Animated.Value(12)).current;
  const buttonY    = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.delay(100),
      Animated.parallel([
        Animated.timing(nameAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(nameY,    { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
      Animated.delay(150),
      Animated.parallel([
        Animated.timing(buttonAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(buttonY,    { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      {/* Logo -- full screen width, square, gradient blends top + bottom edges */}
      <Animated.View style={[styles.logoWrapper, { opacity: fadeAnim }]}>
        <Image
          source={require('../../assets/images/logo.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
        <LinearGradient
          colors={[BG, 'transparent']}
          style={styles.gradTop}
        />
        <LinearGradient
          colors={['transparent', BG]}
          style={styles.gradBottom}
        />
      </Animated.View>

      {/* App name */}
      <Animated.View style={[styles.nameBlock, { opacity: nameAnim, transform: [{ translateY: nameY }] }]}>
        <Text style={styles.appName}>PROJECT J</Text>
      </Animated.View>

      {/* Buttons */}
      <Animated.View style={[styles.buttonBlock, { opacity: buttonAnim, transform: [{ translateY: buttonY }] }]}>
        <TouchableOpacity
          style={styles.continueBtn}
          onPress={() => router.push('/onboarding/profile-setup')}
          activeOpacity={0.85}
        >
          <Text style={styles.continueBtnText}>GET STARTED</Text>
        </TouchableOpacity>
        <Text style={styles.signInHint}>Already have an account? Sign in</Text>
        {__DEV__ && (
          <TouchableOpacity
            style={{ marginTop: 16, padding: 8 }}
            onPress={async () => {
              await storageSet('pj_onboarding_complete', 'true');
              router.replace('/(tabs)');
            }}
          >
            <Text style={styles.devSkip}>[DEV] Skip onboarding</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: BG, alignItems: 'center' },
  logoWrapper:     { width: SCREEN_W, height: SCREEN_W, marginTop: 40 },
  logoImage:       { width: '100%', height: '100%' },
  gradTop:         { position: 'absolute', top: 0, left: 0, right: 0, height: 100 },
  gradBottom:      { position: 'absolute', bottom: 0, left: 0, right: 0, height: 140 },
  nameBlock:       { marginTop: 8, alignItems: 'center' },
  appName:         { fontSize: 24, fontFamily: 'BebasNeue_400Regular', letterSpacing: 10, color: 'rgba(255,255,255,0.28)' },
  buttonBlock:     { position: 'absolute', bottom: 60, left: 32, right: 32, alignItems: 'center' },
  continueBtn:     { width: '100%', paddingVertical: 18, borderRadius: 14, alignItems: 'center', marginBottom: 16,
                     backgroundColor: '#3b82f6',
                     shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 14 },
  continueBtnText: { fontSize: 18, fontFamily: 'BebasNeue_400Regular', letterSpacing: 3, color: '#ffffff' },
  signInHint:      { fontSize: 13, fontFamily: 'DMSans_400Regular', color: 'rgba(255,255,255,0.25)' },
  devSkip:         { color: 'rgba(255,255,255,0.15)', fontSize: 11, fontFamily: 'DMSans_400Regular' },
});
