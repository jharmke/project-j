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
import { useTheme } from '../theme';
import { LogBox } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

LogBox.ignoreLogs(['VirtualizedLists should never be nested']);
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AchievementToastProvider, AchievementToastRenderer } from '../components/AchievementToast';
import { CelebrationRenderer } from '../components/CelebrationOverlay';
import { ToastProvider } from '../components/Toast';
import { ThemeProvider } from '../theme';

SplashScreen.preventAutoHideAsync();

function ThemedStatusBar() {
  const { themeId } = useTheme();
  return <StatusBar style={themeId === 'dark' ? 'light' : 'dark'} />;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    BebasNeue_400Regular,
  });
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const val = await AsyncStorage.getItem('pj_onboarding_complete');
        setOnboardingComplete(val === 'true');
      } catch (e) {
        setOnboardingComplete(false);
      } finally {
        setOnboardingChecked(true);
      }
    };
    checkOnboarding();
  }, []);

  useEffect(() => {
    if (fontsLoaded && onboardingChecked) {
      SplashScreen.hideAsync();
      if (!onboardingComplete) {
        router.replace('/onboarding/welcome');
      }
    }
  }, [fontsLoaded, onboardingChecked, onboardingComplete]);

  if (!fontsLoaded || !onboardingChecked) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <ThemeProvider>
    <ToastProvider>
    <AchievementToastProvider>
    <NavThemeProvider value={DarkTheme}>
      <Stack>
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
        <Stack.Screen name="edit-food" options={{ headerShown: false }} />
        <Stack.Screen name="recipe-builder" options={{ headerShown: false }} />
        <Stack.Screen name="recipe-log" options={{ headerShown: false }} />
        <Stack.Screen name="day-detail" options={{ headerShown: false, animation: 'none' }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen name="bible" options={{ headerShown: false }} />
        <Stack.Screen name="journal" options={{ headerShown: false }} />
        <Stack.Screen name="achievements" options={{ headerShown: false }} />
        <Stack.Screen name="head-to-head" options={{ headerShown: false, animation: 'fade' }} />
      </Stack>
      <ThemedStatusBar />
      <AchievementToastRenderer />
      <CelebrationRenderer />
    </NavThemeProvider>
    </AchievementToastProvider>
    </ToastProvider>
    </ThemeProvider>
    </GestureHandlerRootView>
  );
}