import * as AppleAuthentication from 'expo-apple-authentication';
import { AntDesign } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CryptoJS from 'crypto-js';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { GoogleAuthProvider, OAuthProvider, signInWithCredential } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { app, auth } from '../firebaseConfig';
import { useAuth } from '../AuthContext';
import { runRestoreGate } from '../services/syncService';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';

const IOS_CLIENT_ID = '841973180275-obscsfo4ad9ibir9dtpcago5fuptojlg.apps.googleusercontent.com';

const TERMS_URL = 'https://projectj-5d024.web.app/terms';
const PRIVACY_URL = 'https://projectj-5d024.web.app/privacy';
const BG = '#0d0d0f';
const SCREEN_W = Dimensions.get('window').width;

const generateNonce = (): string =>
  Array.from({ length: 32 }, () =>
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[
      Math.floor(Math.random() * 62)
    ]
  ).join('');

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [stage, setStage] = useState<'auth' | 'onboarding'>('auth');

  const authOpacity = useRef(new Animated.Value(1)).current;
  const onboardingOpacity = useRef(new Animated.Value(0)).current;
  // true when user just tapped sign-in -- triggers animated transition vs instant jump
  const justSignedIn = useRef(false);

  // Entrance animation values
  const fadeAnim   = useRef(new Animated.Value(0)).current;
  const nameAnim   = useRef(new Animated.Value(0)).current;
  const nameY      = useRef(new Animated.Value(12)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;
  const buttonY    = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
    GoogleSignin.configure({ iosClientId: IOS_CLIENT_ID });
  }, []);

  // Staggered entrance: logo → wordmark → buttons
  useEffect(() => {
    Animated.sequence([
      Animated.delay(50),
      Animated.timing(fadeAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.delay(100),
      Animated.parallel([
        Animated.timing(nameAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(nameY,     { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
      Animated.delay(150),
      Animated.parallel([
        Animated.timing(buttonAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(buttonY,    { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  // Fires when user appears -- either fresh sign-in or app relaunch mid-onboarding.
  // DATA SAFETY: before showing onboarding on a not-yet-onboarded device, run the restore
  // gate. On a REINSTALL the account already has cloud data, so the gate pulls it down
  // (restoring pj_onboarding_complete) and we go straight into the app instead of running
  // onboarding and letting its writes clobber the cloud. Sync stays LOCKED until the gate
  // runs, so nothing can upload over the cloud in the meantime.
  useEffect(() => {
    if (!user) return;
    (async () => {
      let obc = await AsyncStorage.getItem('pj_onboarding_complete');

      if (obc !== 'true') {
        const result = await runRestoreGate();
        if (result === 'error') {
          // Cloud unreachable: do NOT run onboarding (a fresh start would sit over real
          // data) and do NOT unlock sync. Ask the user to reconnect and relaunch.
          Alert.alert(
            'Connection needed',
            'We could not reach your account to restore your data. Check your internet connection and reopen the app.',
          );
          return;
        }
        obc = await AsyncStorage.getItem('pj_onboarding_complete'); // restore may have set it
      }

      if (obc === 'true') {
        // Existing or just-restored account: straight into the app. _layout would also
        // route here, but doing it explicitly avoids a flash of the onboarding stage.
        router.replace('/(tabs)');
        return;
      }

      // Genuine brand-new user (cloud confirmed empty): run onboarding as before.
      if (justSignedIn.current) {
        justSignedIn.current = false;
        Animated.sequence([
          Animated.timing(authOpacity, { toValue: 0, duration: 500, useNativeDriver: true }),
          Animated.timing(onboardingOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        ]).start(() => setStage('onboarding'));
      } else {
        authOpacity.setValue(0);
        onboardingOpacity.setValue(1);
        setStage('onboarding');
      }
    })();
  }, [user]);

  const handleAppleSignIn = async () => {
    try {
      setLoading(true);
      justSignedIn.current = true;
      const rawNonce = generateNonce();
      const hashedNonce = CryptoJS.SHA256(rawNonce).toString(CryptoJS.enc.Hex);

      const appleCredential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });

      if (!appleCredential.identityToken) throw new Error('No identity token');

      const provider = new OAuthProvider('apple.com');
      const credential = provider.credential({
        idToken: appleCredential.identityToken,
        rawNonce,
      });

      await signInWithCredential(auth, credential);
      // Exchange authorizationCode for refresh_token immediately -- expires in 5 min.
      if (appleCredential.authorizationCode) {
        const fns = getFunctions(app);
        const exchangeFn = httpsCallable(fns, 'exchangeAppleCode');
        exchangeFn({ authorizationCode: appleCredential.authorizationCode }).catch(() => {});
      }
      // useEffect([user]) fires next and handles the transition
    } catch (e: any) {
      justSignedIn.current = false;
      if (e.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('Sign In Failed', 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    try {
      setLoading(true);
      justSignedIn.current = true;
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const idToken = (userInfo as any)?.data?.idToken ?? (userInfo as any)?.idToken;
      if (!idToken) throw new Error('No ID token from Google');

      const credential = GoogleAuthProvider.credential(idToken);
      await signInWithCredential(auth, credential);
      // useEffect([user]) fires next and handles the transition
    } catch (e: any) {
      justSignedIn.current = false;
      const cancelled = e.code === 'SIGN_IN_CANCELLED' || e.code === '-5' || e.code === '12501';
      if (!cancelled) {
        Alert.alert('Sign In Failed', 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Logo */}
      <Animated.View style={[styles.logoWrapper, { opacity: fadeAnim }]}>
        <Image
          source={require('../assets/images/logo.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
        <LinearGradient colors={[BG, 'transparent']} style={styles.gradTop} />
        <LinearGradient colors={['transparent', BG]} style={styles.gradBottom} />
      </Animated.View>

      {/* Wordmark */}
      <Animated.Text style={[styles.wordmark, { opacity: nameAnim, transform: [{ translateY: nameY }] }]}>
        PROJECT J
      </Animated.Text>

      {/* Button area -- Stage 1 and Stage 2 overlap in the same space */}
      <Animated.View style={[styles.buttonsContainer, { bottom: insets.bottom + 16, opacity: buttonAnim, transform: [{ translateY: buttonY }] }]}>

        {/* Stage 1: Sign-in buttons (sets the container height) */}
        <Animated.View
          style={{ opacity: authOpacity }}
          pointerEvents={stage === 'auth' ? 'auto' : 'none'}
        >
          {appleAvailable && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
              cornerRadius={14}
              style={styles.appleButton}
              onPress={handleAppleSignIn}
            />
          )}
          <TouchableOpacity
            style={[styles.googleButton, appleAvailable && { marginTop: 12 }]}
            onPress={handleGoogleSignIn}
            activeOpacity={0.85}
            disabled={loading}
          >
            <AntDesign name="google" size={22} color="#4285F4" style={{ marginRight: 10 }} />
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); router.push('/mission'); }}
            activeOpacity={0.7}
            style={styles.missionLinkWrap}
          >
            <Text style={styles.missionLink}>What makes this app different</Text>
          </TouchableOpacity>
          <Text style={styles.legal}>
            {'By signing in you agree to our '}
            <Text style={styles.legalLink} onPress={() => Linking.openURL(TERMS_URL)}>
              Terms of Service
            </Text>
            {' and '}
            <Text style={styles.legalLink} onPress={() => Linking.openURL(PRIVACY_URL)}>
              Privacy Policy
            </Text>
            {'.'}
          </Text>
        </Animated.View>

        {/* Stage 2: Get Started (overlays stage 1, same top position) */}
        <Animated.View
          style={[StyleSheet.absoluteFill, { opacity: onboardingOpacity }]}
          pointerEvents={stage === 'onboarding' ? 'auto' : 'none'}
        >
          <TouchableOpacity
            style={styles.getStartedButton}
            onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Medium); router.push('/onboarding/profile-setup'); }}
            activeOpacity={0.85}
          >
            <Text style={styles.getStartedText}>GET STARTED</Text>
          </TouchableOpacity>
          {__DEV__ && (
            <TouchableOpacity
              style={{ marginTop: 12, alignItems: 'center', padding: 8 }}
              onPress={async () => {
                await AsyncStorage.setItem('pj_onboarding_complete', 'true');
                router.replace('/(tabs)');
              }}
            >
              <Text style={styles.devSkip}>[DEV] Skip onboarding</Text>
            </TouchableOpacity>
          )}
        </Animated.View>

      </Animated.View>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#e8e8f0" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
    alignItems: 'center',
  },
  logoWrapper: {
    width: SCREEN_W,
    height: SCREEN_W,
    marginTop: 40,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  gradTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  gradBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 140,
  },
  wordmark: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 24,
    letterSpacing: 10,
    color: 'rgba(255,255,255,0.28)',
    marginTop: 8,
  },
  buttonsContainer: {
    position: 'absolute',
    left: 32,
    right: 32,
  },
  appleButton: {
    height: 54,
    width: '100%',
  },
  googleButton: {
    height: 54,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleButtonText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 17,
    color: '#1a1a1a',
  },
  missionLinkWrap: {
    marginTop: 18,
    alignItems: 'center',
    paddingVertical: 4,
  },
  missionLink: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: '#8a8ad8',
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
  legal: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    color: '#444460',
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 12,
  },
  legalLink: {
    color: '#7777bb',
    textDecorationLine: 'underline',
  },
  getStartedButton: {
    height: 54,
    backgroundColor: '#3b82f6',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
  },
  getStartedText: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 18,
    letterSpacing: 3,
    color: '#ffffff',
  },
  devSkip: {
    color: 'rgba(255,255,255,0.15)',
    fontSize: 11,
    fontFamily: 'DMSans_400Regular',
    textAlign: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(13,13,15,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
