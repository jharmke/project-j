import { BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';
import { Bitter_400Regular, Bitter_600SemiBold, Bitter_700Bold } from '@expo-google-fonts/bitter';
import { Fraunces_600SemiBold, Fraunces_700Bold } from '@expo-google-fonts/fraunces';
import { Oswald_600SemiBold, Oswald_700Bold } from '@expo-google-fonts/oswald';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import { Khand_500Medium, Khand_600SemiBold, Khand_700Bold } from '@expo-google-fonts/khand';
import { Lora_400Regular, Lora_500Medium } from '@expo-google-fonts/lora';
import { Onest_400Regular, Onest_500Medium, Onest_600SemiBold, Onest_700Bold } from '@expo-google-fonts/onest';
import { Rajdhani_500Medium, Rajdhani_600SemiBold, Rajdhani_700Bold } from '@expo-google-fonts/rajdhani';
import { DarkTheme, ThemeProvider as NavThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Grain } from '../components/BackgroundLayers';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Alert, AppState, LogBox } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { runRestoreGate, uploadAllLocal, isSyncReady } from '../services/syncService';
import { backfillAllPhotos } from '../utils/foodPhotos';
import { setLaunchSplashShowing } from '../utils/launchSplashGate';
import { applyVacation } from '../utils/vacationMode';
import { ensureRatePromptInitialized } from '../utils/ratingPrompt';
import { checkOttoPrompts } from '../utils/ottoPrompts';
import * as Notifications from 'expo-notifications';
import { setupNotificationHandler } from '../services/notifications';
import { runDailyNotificationScheduler, refreshLiveNotifications } from '../services/notificationScheduler';
import { AchievementToastProvider, AchievementToastRenderer } from '../components/AchievementToast';
import { CelebrationRenderer } from '../components/CelebrationOverlay';
import { ToastProvider } from '../components/Toast';
import TutorialOverlay from '../components/TutorialOverlay';
import { ToolkitRenderer } from '../components/ToolkitSheet';
import LaunchSplash from '../components/LaunchSplash';
import { TutorialProvider } from '../context/TutorialContext';
import { ThemeProvider, useTheme } from '../theme';
import { AuthProvider, useAuth } from '../AuthContext';
import { MembershipProvider } from '../MembershipContext';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import AssistantOverlay from '../components/AssistantOverlay';

LogBox.ignoreLogs(['VirtualizedLists should never be nested']);

SplashScreen.preventAutoHideAsync();
setupNotificationHandler();

// Cold-launch-only gate for the app-open logo splash. Module scope, so it resets on
// every fresh JS load (a true kill + relaunch) and never replays on a warm resume.
let coldSplashConsumed = false;

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
  const [showSplash, setShowSplash] = useState(false);
  // Only route to /sign-in once per app session -- prevents re-navigation when
  // the user signs in while already on the sign-in screen (kills the animation).
  const hasInitialRouted = useRef(false);

  // Flush all local data to Firestore whenever the app backgrounds.
  // Ensures today's data is in the cloud before a build switch wipes local storage.
  // On foreground, refresh water + activity notifications with live data.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'background') {
        uploadAllLocal().catch(() => {});
        // Heal any still-local-only food photos up to the cloud before a possible delete/reinstall.
        // Same function as the dev "Backfill Photos" tool: uploads only local-only photos, skips
        // cloud-safe ones, removes only dead keys (image already gone). Gated on the restore lock so
        // it never runs mid-restore; no-ops when signed out. This is what makes photos self-heal for
        // regular users who never touch dev tools (e.g. a photo whose capture-time upload failed offline).
        if (isSyncReady()) backfillAllPhotos().catch(() => {});
      } else if (nextAppState === 'active') {
        refreshLiveNotifications().catch(() => {});
        // Stamp any newly-arrived in-range vacation days + auto-expire a finished one.
        applyVacation().catch(() => {});
      }
    });
    return () => subscription.remove();
  }, []);

  // Deep link handler: notification tap routes to the destination baked into data.route
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as any;
      if (!data?.route) return;
      try {
        if (data.params) {
          router.push({ pathname: data.route, params: data.params });
        } else {
          router.push({ pathname: data.route });
        }
      } catch {}
    });
    return () => sub.remove();
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
      // Existing install (onboarding already complete locally). The restore gate confirms
      // this, unlocks sync, and returns instantly without overwriting local. (Fresh-install
      // restore happens earlier, in sign-in.tsx, before onboarding can write.)
      runRestoreGate().then((result) => {
        // A real account switch just replaced local data. Already-mounted screens won't
        // know to re-read it, so rather than risk a clever automatic fix, just tell the
        // user to do the one thing already proven safe: close and reopen the app.
        if (result === 'restored') {
          Alert.alert(
            'Account Restored',
            'Your account data has been restored. Please close and reopen the app to see it.',
          );
        }
        // Sync is unlocked now: apply any active vacation (stamp elapsed in-range days,
        // auto-expire a finished one) so the cloud mirror lands too.
        applyVacation().catch(() => {});
        ensureRatePromptInitialized().catch(() => {}); // stamp firstSeenAt once, after any real restore has landed
        checkOttoPrompts().catch(() => {}); // populate/clear the Rate Us fallback + Feedback Otto cards
        // Cold launch into Home: play the condensed logo cinematic over the hand-off. Show
        // the custom splash FIRST and let it hide the native splash itself once it has painted
        // (see LaunchSplash) -- otherwise hiding the native splash here lifts it a frame before
        // the React overlay paints, flashing Home. If the cinematic was already consumed this
        // session, just lift the native splash directly.
        if (!coldSplashConsumed) {
          coldSplashConsumed = true;
          setLaunchSplashShowing(true); // hold launch pop-ups (summary, meta tutorial) until the cinematic ends
          setShowSplash(true);
        } else {
          SplashScreen.hideAsync();
        }
        router.replace('/(tabs)');
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
        <Stack.Screen name="onboarding/notifications" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="onboarding/all-set" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        <Stack.Screen name="workout-library" options={{ headerShown: false }} />
        <Stack.Screen name="add-food" options={{ headerShown: false }} />
        <Stack.Screen name="food-detail" options={{ headerShown: false }} />
        <Stack.Screen name="recipe-builder" options={{ headerShown: false }} />
        <Stack.Screen name="recipe-log" options={{ headerShown: false }} />
        <Stack.Screen name="ai-meal-estimator" options={{ headerShown: false }} />
        <Stack.Screen name="day-detail" options={{ headerShown: false, animation: 'none' }} />
        <Stack.Screen name="body-measurements" options={{ headerShown: false }} />
        <Stack.Screen name="body-measurement-log" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen name="profile-photo-crop" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        <Stack.Screen name="bible" options={{ headerShown: false }} />
        <Stack.Screen name="journal" options={{ headerShown: false }} />
        <Stack.Screen name="prayer" options={{ headerShown: false }} />
        <Stack.Screen name="devotional" options={{ headerShown: false }} />
        <Stack.Screen name="plans" options={{ headerShown: false }} />
        <Stack.Screen name="achievements" options={{ headerShown: false }} />
        <Stack.Screen name="day-summary" options={{ headerShown: false }} />
        <Stack.Screen name="comparison-report" options={{ headerShown: false }} />
        <Stack.Screen name="challenge-create" options={{ headerShown: false }} />
        <Stack.Screen name="challenges" options={{ headerShown: false }} />
        <Stack.Screen name="weekly-summary" options={{ headerShown: false }} />
        <Stack.Screen name="monthly-summary" options={{ headerShown: false }} />
        <Stack.Screen name="mission" options={{ headerShown: false }} />
        <Stack.Screen name="support" options={{ headerShown: false }} />
        <Stack.Screen name="whats-new" options={{ headerShown: false }} />
        <Stack.Screen name="diagnostic-report" options={{ headerShown: false }} />
        <Stack.Screen name="diagnostic-report-view" options={{ headerShown: false }} />
        <Stack.Screen name="reports" options={{ headerShown: false }} />
        <Stack.Screen name="report" options={{ headerShown: false }} />
        <Stack.Screen name="definitions" options={{ headerShown: false }} />
        <Stack.Screen name="tutorials" options={{ headerShown: false }} />
        <Stack.Screen name="sleep" options={{ headerShown: false }} />
        <Stack.Screen name="adaptive-target" options={{ headerShown: false }} />
      </Stack>
      <ThemedStatusBar />
      <AchievementToastRenderer hold={showSplash} />
      <CelebrationRenderer hold={showSplash} />
      <TutorialOverlay />
      <ToolkitRenderer />
      <AssistantOverlay />
      {showSplash && <LaunchSplash onDone={() => { setShowSplash(false); setLaunchSplashShowing(false); }} />}
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    // Legacy: still carrying every screen we have not migrated to the type roles yet. They come out
    // as each screen converts. See typography.ts + SPEC_visual_refresh.md.
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    BebasNeue_400Regular,
    Lora_400Regular,
    Lora_500Medium,

    // The type roles. Display = Clash Display (Fontshare, local .ttf). Num = Rajdhani, with Khand
    // loaded alongside so the A/B is a one-line flip in typography.ts, not a reinstall. UI = Onest.
    // Voice = Bitter, with Ranade likewise loaded for its A/B.
    'ClashDisplay-Semibold': require('../assets/fonts/ClashDisplay-Semibold.ttf'),
    'ClashDisplay-Bold': require('../assets/fonts/ClashDisplay-Bold.ttf'),
    Oswald_600SemiBold,
    Oswald_700Bold,
    Fraunces_600SemiBold,
    Fraunces_700Bold,
    'Ranade-Light': require('../assets/fonts/Ranade-Light.ttf'),
    'Ranade-Regular': require('../assets/fonts/Ranade-Regular.ttf'),
    'Ranade-Medium': require('../assets/fonts/Ranade-Medium.ttf'),
    'Ranade-Bold': require('../assets/fonts/Ranade-Bold.ttf'),
    Rajdhani_500Medium,
    Rajdhani_600SemiBold,
    Rajdhani_700Bold,
    Khand_500Medium,
    Khand_600SemiBold,
    Khand_700Bold,
    Onest_400Regular,
    Onest_500Medium,
    Onest_600SemiBold,
    Onest_700Bold,
    Bitter_400Regular,
    Bitter_600SemiBold,
    Bitter_700Bold,
  });

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
    <AuthProvider>
    <MembershipProvider>
    <ThemeProvider>
    <ToastProvider>
    <AchievementToastProvider>
    <TutorialProvider>
    <NavThemeProvider value={DarkTheme}>
      <RootLayoutNav />
      {/* FILM GRAIN, at the very top of the tree.
          It has to sit over EVERYTHING -- cards, header, tab bar, the FAB -- because that is what fuses
          them into one material. Mounted inside a screen it could never reach the header (higher zIndex)
          or the tab bar and FAB (they live in the navigator, outside any screen). Here it covers the lot.
          pointerEvents:none, so a layer over the whole app never eats a tap. */}
      <Grain />
    </NavThemeProvider>
    </TutorialProvider>
    </AchievementToastProvider>
    </ToastProvider>
    </ThemeProvider>
    </MembershipProvider>
    </AuthProvider>
    </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
