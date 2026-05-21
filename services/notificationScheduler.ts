import AsyncStorage from '@react-native-async-storage/async-storage';
import { scheduleDailyNotifications, SchedulerContext, FaithJourney, StyleMode, shouldAskPermission, requestNotificationPermission } from './notifications';

// Reads all needed data from AsyncStorage and runs the daily scheduler.
// Guarded to run at most once per calendar day.
export const runDailyNotificationScheduler = async () => {
  try {
    const todayKey = new Date().toISOString().split('T')[0];

    // Guard: only run once per day
    const lastRun = await AsyncStorage.getItem('pj_notif_last_scheduled');
    if (lastRun === todayKey) return;

    // ── Settings ───────────────────────────────────────────────────────────
    const settingsRaw = await AsyncStorage.getItem('pj_settings');
    const settings = settingsRaw ? JSON.parse(settingsRaw) : {};
    const styleMode: StyleMode = settings.styleMode ?? 'balanced';
    const faithJourney: FaithJourney = settings.faithJourney ?? 'rooted';

    // ── Profile (goals) ────────────────────────────────────────────────────
    const profileRaw = await AsyncStorage.getItem('pj_profile');
    const profile = profileRaw ? JSON.parse(profileRaw) : {};
    const waterGoal = parseFloat(profile.waterGoal) || 128;
    const stepGoal = parseInt(profile.stepGoal) || 10000;

    // ── Today's data ───────────────────────────────────────────────────────
    const todayRaw = await AsyncStorage.getItem(`pj_${todayKey}`);
    const today = todayRaw ? JSON.parse(todayRaw) : {};
    const todayWater = typeof today.water === 'number' ? today.water : 0;

    // Count food entries across all meal slots
    let todayFoodEntries = 0;
    const mealSlots = ['morning', 'lunch', 'dinner', 'snacks'];
    for (const slot of mealSlots) {
      const entries = today[slot];
      if (Array.isArray(entries)) todayFoodEntries += entries.length;
    }

    const todaySteps = today.steps ?? 0;
    const ifStarted = !!today.ifStart;
    const ifEnabled = !!settings.ifMethod || !!today.ifMethod; // IF card was ever configured

    // ── Workout ────────────────────────────────────────────────────────────
    const workoutRaw = await AsyncStorage.getItem('pj_workout_state');
    const workoutState = workoutRaw ? JSON.parse(workoutRaw) : {};
    const todayProgram = workoutState.programs?.[todayKey];
    const todayWorkoutLogged =
      Array.isArray(todayProgram?.exercises) && todayProgram.exercises.length > 0;

    // ── Active streaks at risk ─────────────────────────────────────────────
    const pjStreaksRaw = await AsyncStorage.getItem('pj_streaks');
    const pjStreaks = pjStreaksRaw ? JSON.parse(pjStreaksRaw) : {};
    const streakConfig: any[] = pjStreaks.config ?? [];

    const activeStreaks: SchedulerContext['activeStreaks'] = [];

    // Gratitude streak (top-level key)
    const gratStreak = pjStreaks.gratitude?.currentStreak ?? 0;
    const gratLast = pjStreaks.gratitude?.lastLoggedDate ?? '';
    if (gratStreak > 0 && gratLast !== todayKey) {
      activeStreaks.push({ id: 'gratitude', name: 'Gratitude', currentStreak: gratStreak });
    }

    // Config-based streaks
    for (const item of streakConfig) {
      const current = pjStreaks.streakCounts?.[item.id]?.current ?? 0;
      const lastDate = pjStreaks.streakCounts?.[item.id]?.lastDate ?? '';
      if (current > 0 && lastDate !== todayKey) {
        activeStreaks.push({ id: item.id, name: item.label ?? item.name ?? 'Streak', currentStreak: current });
      }
    }

    // ── Run scheduler ──────────────────────────────────────────────────────
    const ctx: SchedulerContext = {
      styleMode,
      faithJourney,
      todayFoodEntries,
      todayWater,
      waterGoal,
      activeStreaks,
      todayWorkoutLogged,
      todaySteps,
      stepGoal,
      ifEnabled,
      ifStarted,
    };

    await scheduleDailyNotifications(ctx);
    await AsyncStorage.setItem('pj_notif_last_scheduled', todayKey);

    // Second high-intent permission ask moment: any streak reaches 3+ days
    const hasStreakMilestone = activeStreaks.some(s => s.currentStreak >= 3) ||
      (pjStreaks.gratitude?.currentStreak ?? 0) >= 3;
    if (hasStreakMilestone) {
      const ask = await shouldAskPermission();
      if (ask) requestNotificationPermission().catch(() => {});
    }
  } catch (e) {
    console.log('[notificationScheduler] error:', e);
  }
};
