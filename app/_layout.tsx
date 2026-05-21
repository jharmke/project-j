import { BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import { DarkTheme, ThemeProvider as NavThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { LogBox } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { restoreIfFresh } from '../services/syncService';
import { setupNotificationHandler } from '../services/notifications';
import { runDailyNotificationScheduler } from '../services/notificationScheduler';
import { AchievementToastProvider, AchievementToastRenderer } from '../components/AchievementToast';
import { CelebrationRenderer } from '../components/CelebrationOverlay';
import { ToastProvider } from '../components/Toast';
import { ThemeProvider, useTheme } from '../theme';
import { AuthProvider, useAuth } from '../AuthContext';

LogBox.ignoreLogs(['VirtualizedLists should never be nested']);

SplashScreen.preventAutoHideAsync();
setupNotificationHandler();

function ThemedStatusBar() {
  const { themeId } = useTheme();
  return <StatusBar style={themeId === 'dark' ? 'light' : 'dark'} />;
}

function RootLayoutNav() {
  const { user, loading: authLoading } = useAuth();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('pj_onboarding_complete')
      .then(val => {
        setOnboardingComplete(val === 'true');
        setOnboardingChecked(true);
      })
      .catch(() => setOnboardingChecked(true));
  }, []);

  useEffect(() => {
    if (!onboardingChecked || authLoading) return;

    if (!user) {
      router.replace('/sign-in');
      SplashScreen.hideAsync();
    } else if (!onboardingComplete) {
      router.replace('/onboarding/welcome');
      SplashScreen.hideAsync();
    } else {
      // On a fresh device, restore from Firestore before showing the app.
      // On an existing device hasPjData is true so this returns instantly.
      restoreIfFresh().finally(() => {
        router.replace('/(tabs)');
        SplashScreen.hideAsync();
        // Fire-and-forget: schedule today's notis after tabs load
        runDailyNotificationScheduler().catch(() => {});
      });
    }
  }, [onboardingChecked, authLoading, user, onboardingComplete]);

  return (
    <>
      <Stack>
        <Stack.Screen name="sign-in" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding/welcome" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="onboarding/profile-setup" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="onboarding/style-survey" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="onboarding/your-style" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="onboarding/commitment" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="onboarding/faith-journey" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="onboarding/apple-health" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="onboarding/all-set" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        <Stack.Screen name="workout-library" options={{ headerShown: false }} />
        <Stack.Screen name="add-food" options={{ headerShown: false }} />
        <Stack.Screen name="food-detail" options={{ headerShown: false }} />
        <Stack.Screen name="recipe-builder" options={{ headerShown: false }} />
        <Stack.Screen name="recipe-log" options={{ headerShown: false }} />
        <Stack.Screen name="day-detail" options={{ headerShown: false, animation: 'none' }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen name="bible" options={{ headerShown: false }} />
        <Stack.Screen name="journal" options={{ headerShown: false }} />
        <Stack.Screen name="achievements" options={{ headerShown: false }} />
        <Stack.Screen name="head-to-head" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="mission" options={{ headerShown: false }} />
        <Stack.Screen name="diagnostic-report" options={{ headerShown: false }} />
      </Stack>
      <ThemedStatusBar />
      <AchievementToastRenderer />
      <CelebrationRenderer />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    BebasNeue_400Regular,
  });

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <AuthProvider>
    <ThemeProvider>
    <ToastProvider>
    <AchievementToastProvider>
    <NavThemeProvider value={DarkTheme}>
      <RootLayoutNav />
    </NavThemeProvider>
    </AchievementToastProvider>
    </ToastProvider>
    </ThemeProvider>
    </AuthProvider>
    </GestureHandlerRootView>
  );
}
