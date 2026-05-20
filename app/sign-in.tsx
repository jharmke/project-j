import * as AppleAuthentication from 'expo-apple-authentication';
import { AntDesign } from '@expo/vector-icons';
import CryptoJS from 'crypto-js';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { GoogleAuthProvider, OAuthProvider, signInWithCredential } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { app, auth } from '../firebaseConfig';

const IOS_CLIENT_ID = '841973180275-obscsfo4ad9ibir9dtpcago5fuptojlg.apps.googleusercontent.com';

const generateNonce = (): string =>
  Array.from({ length: 32 }, () =>
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[
      Math.floor(Math.random() * 62)
    ]
  ).join('');

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
    GoogleSignin.configure({ iosClientId: IOS_CLIENT_ID });
  }, []);

  const handleAppleSignIn = async () => {
    try {
      setLoading(true);
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
      // Exchange authorizationCode for refresh_token immediately -- it expires in 5 min.
      // Fire-and-forget: failure here must never block sign-in.
      if (appleCredential.authorizationCode) {
        const fns = getFunctions(app);
        const exchangeFn = httpsCallable(fns, 'exchangeAppleCode');
        exchangeFn({ authorizationCode: appleCredential.authorizationCode }).catch(() => {});
      }
      // AuthContext onAuthStateChanged fires -> _layout.tsx handles routing
    } catch (e: any) {
      if (e.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('Sign In Failed', 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const idToken = (userInfo as any)?.data?.idToken ?? (userInfo as any)?.idToken;
      if (!idToken) throw new Error('No ID token from Google');

      const credential = GoogleAuthProvider.credential(idToken);
      await signInWithCredential(auth, credential);
      // AuthContext onAuthStateChanged fires -> _layout.tsx handles routing
    } catch (e: any) {
      const cancelled = e.code === 'SIGN_IN_CANCELLED' || e.code === '-5' || e.code === '12501';
      if (!cancelled) {
        Alert.alert('Sign In Failed', 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.hero}>
        <Text style={styles.wordmark}>PROJECT J</Text>
        <Text style={styles.tagline}>Faith · Fitness · Forward</Text>
      </View>

      <View style={styles.buttons}>
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
          style={styles.googleButton}
          onPress={handleGoogleSignIn}
          activeOpacity={0.85}
          disabled={loading}
        >
          <AntDesign name="google" size={18} color="#4285F4" style={{ marginRight: 10 }} />
          <Text style={styles.googleButtonText}>Continue with Google</Text>
        </TouchableOpacity>

        <Text style={styles.legal}>
          By signing in you agree to our Terms of Service and Privacy Policy.
        </Text>
      </View>

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
    backgroundColor: '#0d0d0f',
    paddingHorizontal: 32,
  },
  hero: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wordmark: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 64,
    color: '#e8e8f0',
    letterSpacing: 4,
  },
  tagline: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: '#666680',
    marginTop: 8,
    letterSpacing: 1,
  },
  buttons: {
    gap: 12,
    paddingBottom: 8,
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
    fontSize: 15,
    color: '#1a1a1a',
  },
  legal: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    color: '#444460',
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 4,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(13,13,15,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
