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
import { useEffect, useRef, useState } from 'react';
import { AppState, LogBox } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { restoreIfFresh, uploadAllLocal } from '../services/syncService';
import { setupNotificationHandler } from '../services/notifications';
import { runDailyNotificationScheduler } from '../services/notificationScheduler';
import { AchievementToastProvider, AchievementToastRenderer } from '../components/AchievementToast';
import { CelebrationRenderer } from '../components/CelebrationOverlay';
import { ToastProvider } from '../components/Toast';
import TutorialOverlay from '../components/TutorialOverlay';
import { ToolkitRenderer } from '../components/ToolkitSheet';
import { TutorialProvider } from '../context/TutorialContext';
import { ThemeProvider, useTheme } from '../theme';
import { AuthProvider, useAuth } from '../AuthContext';

LogBox.ignoreLogs(['VirtualizedLists should never be nested']);

SplashScreen.preventAutoHideAsync();
setupNotificationHandler();

function ThemedStatusBar() {
  const { themeId } = useTheme();
  return <StatusBar style={themeId === 'dark' ? 'light' : 'dark'} />;
}

async function removeTutorialEntries() {
  try {
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    const saved = await AsyncStorage.getItem(`pj_${todayKey}`);
    if (!saved) return;
    const data = JSON.parse(saved);
    if (!data.entries || !Array.isArray(data.entries)) return;
    const hasOrphans = data.entries.some((e: any) => e?.tutorialEntry);
    if (!hasOrphans) return;
    const cleaned = data.entries.filter((e: any) => !e?.tutorialEntry);
    await AsyncStorage.setItem(`pj_${todayKey}`, JSON.stringify({ ...data, entries: cleaned }));
  } catch {}
}

function RootLayoutNav() {
  const { user, loading: authLoading } = useAuth();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  // Only route to /sign-in once per app session -- prevents re-navigation when
  // the user signs in while already on the sign-in screen (kills the animation).
  const hasInitialRouted = useRef(false);

  // Flush all local data to Firestore whenever the app backgrounds.
  // Ensures today's data is in the cloud before a build switch wipes local storage.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'background') {
        uploadAllLocal().catch(() => {});
      }
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    removeTutorialEntries();
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
      hasInitialRouted.current = true;
    } else if (!onboardingComplete) {
      // Only navigate on first fire (app launch). If user just signed in while
      // already on /sign-in, skip -- sign-in.tsx handles the stage transition.
      if (!hasInitialRouted.current) {
        router.replace('/sign-in');
      }
      SplashScreen.hideAsync();
      hasInitialRouted.current = true;
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
        <Stack.Screen name="day-summary" options={{ headerShown: false }} />
        <Stack.Screen name="mission" options={{ headerShown: false }} />
        <Stack.Screen name="diagnostic-report" options={{ headerShown: false }} />
        <Stack.Screen name="diagnostic-report-view" options={{ headerShown: false }} />
        <Stack.Screen name="definitions" options={{ headerShown: false }} />
        <Stack.Screen name="tutorials" options={{ headerShown: false }} />
      </Stack>
      <ThemedStatusBar />
      <AchievementToastRenderer />
      <CelebrationRenderer />
      <TutorialOverlay />
      <ToolkitRenderer />
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
    <TutorialProvider>
    <NavThemeProvider value={DarkTheme}>
      <RootLayoutNav />
    </NavThemeProvider>
    </TutorialProvider>
    </AchievementToastProvider>
    </ToastProvider>
    </ThemeProvider>
    </AuthProvider>
    </GestureHandlerRootView>
  );
}
