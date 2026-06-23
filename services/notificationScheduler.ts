import AsyncStorage from '@react-native-async-storage/async-storage';
import { scheduleDailyNotifications, SchedulerContext, FaithJourney, StyleMode, shouldAskPermission, requestNotificationPermission, scheduleWaterNotificationsNow, scheduleActivityNotificationNow } from './notifications';
import { getVacation, vacationTodayKey } from '../utils/vacationMode';

export const runDailyNotificationScheduler = async () => {
  try {
    const _now = new Date();
    const todayKey = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, '0')}-${String(_now.getDate()).padStart(2, '0')}`;

    const lastRun = await AsyncStorage.getItem('pj_notif_last_scheduled');
    if (lastRun === todayKey) return;

    // ── Settings ───────────────────────────────────────────────────────────
    const settingsRaw = await AsyncStorage.getItem('pj_settings');
    const settings = settingsRaw ? JSON.parse(settingsRaw) : {};
    const styleMode: StyleMode = settings.styleMode ?? 'balanced';
    const faithJourney: FaithJourney = settings.faithJourney ?? 'rooted';
    const mindfulGrowthAreas: boolean = settings.mindfulGrowthAreas === true;

    // ── Profile (goals) ────────────────────────────────────────────────────
    const profileRaw = await AsyncStorage.getItem('pj_profile');
    const profile = profileRaw ? JSON.parse(profileRaw) : {};
    const waterGoal = parseFloat(profile.waterGoal) || 128;
    const stepGoal = parseInt(profile.stepGoal) || 10000;
    const activeCalGoal = parseInt(profile.activeCalGoal) || 500;
    const exerciseMinsGoal = parseInt(profile.exerciseMinsGoal) || 30;

    // ── Today's data ───────────────────────────────────────────────────────
    const todayRaw = await AsyncStorage.getItem(`pj_${todayKey}`);
    const today = todayRaw ? JSON.parse(todayRaw) : {};
    const todayWater = typeof today.water === 'number' ? today.water : 0;
    const todayActiveCals = typeof today.activeCalories === 'number' ? today.activeCalories : 0;
    const todayExerciseMins = typeof today.exerciseMinutes === 'number' ? today.exerciseMinutes : 0;

    // Count food entries across all stored meal keys
    let todayFoodEntries = 0;
    const allKeys = Object.keys(today);
    for (const key of allKeys) {
      if (key === 'entries' || (!key.includes('_') && key !== 'water' && key !== 'weight' && key !== 'steps' && key !== 'activeCalories' && key !== 'caloriesBurned' && key !== 'sleep' && key !== 'if' && !key.startsWith('if') && !key.startsWith('sleep'))) {
        if (Array.isArray(today[key])) todayFoodEntries += today[key].length;
      }
    }
    // Fallback: also check legacy slot names
    for (const slot of ['morning', 'lunch', 'dinner', 'snacks', 'breakfast', 'entries']) {
      if (Array.isArray(today[slot]) && !allKeys.includes(slot)) {
        todayFoodEntries += today[slot].length;
      }
    }

    const todaySteps = today.steps ?? 0;
    const ifStarted = !!today.ifStart;

    // Fix: ifEnabled by looking back 7 days for any configured ifMethod
    let ifEnabled = !!today.ifMethod;
    if (!ifEnabled) {
      for (let i = 1; i <= 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0];
        try {
          const raw = await AsyncStorage.getItem(`pj_${key}`);
          if (raw) {
            const data = JSON.parse(raw);
            if (data.ifMethod) { ifEnabled = true; break; }
          }
        } catch {}
      }
    }

    // ── Weight ─────────────────────────────────────────────────────────────
    const weightLoggedToday = typeof today.weight === 'number' && today.weight > 0;
    let hasLoggedWeightBefore = false;
    let daysSinceLastWeight: number | null = null;

    for (let i = 1; i <= 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      try {
        const raw = await AsyncStorage.getItem(`pj_${key}`);
        if (raw) {
          const data = JSON.parse(raw);
          if (typeof data.weight === 'number' && data.weight > 0) {
            hasLoggedWeightBefore = true;
            if (daysSinceLastWeight === null) daysSinceLastWeight = i;
            break;
          }
        }
      } catch {}
    }

    // ── Workout ────────────────────────────────────────────────────────────
    const workoutRaw = await AsyncStorage.getItem('pj_workout_state');
    const workoutState = workoutRaw ? JSON.parse(workoutRaw) : {};
    const todayProgram = workoutState.programs?.[todayKey];
    const todayWorkoutLogged = Array.isArray(todayProgram?.exercises)
      ? todayProgram.exercises.some((ex: any) =>
          Array.isArray(ex.checks) ? ex.checks.some(Boolean) : false
        )
      : false;

    // ── Streaks at risk ────────────────────────────────────────────────────
    const pjStreaksRaw = await AsyncStorage.getItem('pj_streaks');
    const pjStreaks = pjStreaksRaw ? JSON.parse(pjStreaksRaw) : {};
    const streakConfig: any[] = pjStreaks.config ?? [];

    const activeStreaks: SchedulerContext['activeStreaks'] = [];

    const gratStreak = pjStreaks.gratitude?.currentStreak ?? 0;
    const gratLast = pjStreaks.gratitude?.lastLoggedDate ?? '';
    if (gratStreak > 0 && gratLast !== todayKey) {
      activeStreaks.push({ id: 'gratitude', name: 'Gratitude', currentStreak: gratStreak });
    }

    for (const item of streakConfig) {
      const current = pjStreaks.streakCounts?.[item.id]?.current ?? 0;
      const lastDate = pjStreaks.streakCounts?.[item.id]?.lastDate ?? '';
      if (current > 0 && lastDate !== todayKey) {
        activeStreaks.push({ id: item.id, name: item.label ?? item.name ?? 'Streak', currentStreak: current });
      }
    }

    // ── Gratitude logged today ─────────────────────────────────────────────
    const gratitudeLoggedToday = gratLast === todayKey;

    // ── Prayer logged today ────────────────────────────────────────────────
    let prayerLoggedToday = false;
    try {
      const prayersRaw = await AsyncStorage.getItem('pj_prayers');
      if (prayersRaw) {
        const prayers: any[] = JSON.parse(prayersRaw);
        prayerLoggedToday = prayers.some((p: any) => {
          const toLocal = (ms: number | null) => {
            if (!ms) return '';
            const d = new Date(ms);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          };
          return toLocal(p.createdAt) === todayKey || toLocal(p.answeredAt) === todayKey;
        });
      }
    } catch {}

    // ── Faith Reading pending ──────────────────────────────────────────────
    let faithReadingPending = false;
    try {
      const plansRaw = await AsyncStorage.getItem('pj_reading_plans');
      if (plansRaw) {
        const plans: any[] = JSON.parse(plansRaw);
        for (const plan of plans) {
          if (plan.status !== 'active') continue;
          const currentDay = plan.currentDay ?? 1;
          const completed = Array.isArray(plan.completedDays) ? plan.completedDays : [];
          if (!completed.includes(currentDay)) {
            faithReadingPending = true;
            break;
          }
        }
      }
    } catch {}

    if (!faithReadingPending) {
      try {
        const devotionalsRaw = await AsyncStorage.getItem('pj_devotionals');
        if (devotionalsRaw) {
          const devProgress: Record<string, any> = JSON.parse(devotionalsRaw);
          for (const id of Object.keys(devProgress)) {
            const prog = devProgress[id];
            if (prog.status !== 'active') continue;
            const currentDay = prog.currentDay ?? 1;
            const completed = Array.isArray(prog.completedDays) ? prog.completedDays : [];
            if (!completed.includes(currentDay)) {
              faithReadingPending = true;
              break;
            }
          }
        }
      } catch {}
    }

    // ── Today's verse text ─────────────────────────────────────────────────
    let todayVerseText: string | null = null;
    let todayVerseRef: string | null = null;
    try {
      const versesRaw = await AsyncStorage.getItem('pj_verse_rotation');
      if (versesRaw) {
        const rotation = JSON.parse(versesRaw);
        const idx = rotation.currentIndex ?? 0;
        const order: number[] = rotation.order ?? [];
        if (order.length > 0) {
          const { VERSES } = require('../data/verses');
          const verse = VERSES[order[idx % order.length]];
          if (verse?.text) { todayVerseText = verse.text; todayVerseRef = verse.reference ?? null; }
        }
      }
    } catch {}

    // ── Run scheduler ──────────────────────────────────────────────────────
    const ctx: SchedulerContext = {
      styleMode,
      mindfulGrowthAreas,
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
      weightLoggedToday,
      hasLoggedWeightBefore,
      daysSinceLastWeight,
      faithReadingPending,
      gratitudeLoggedToday,
      prayerLoggedToday,
      todayVerseText,
      todayVerseRef,
      activeCalGoal,
      exerciseMinsGoal,
      todayActiveCals,
      todayExerciseMins,
    };

    await scheduleDailyNotifications(ctx);
    await AsyncStorage.setItem('pj_notif_last_scheduled', todayKey);

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

export const refreshLiveNotifications = async () => {
  try {
    // Vacation Mode: bail during active window (no live reschedule)
    const vacation = await getVacation();
    const todayVac = vacationTodayKey();
    if (vacation && vacation.active && todayVac >= vacation.startKey && todayVac <= vacation.endKey) return;

    const _now = new Date();
    const todayKey = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, '0')}-${String(_now.getDate()).padStart(2, '0')}`;

    const settingsRaw = await AsyncStorage.getItem('pj_settings');
    const settings = settingsRaw ? JSON.parse(settingsRaw) : {};
    const styleMode: StyleMode = settings.styleMode ?? 'balanced';
    const mindfulGrowthAreas: boolean = settings.mindfulGrowthAreas === true;

    const profileRaw = await AsyncStorage.getItem('pj_profile');
    const profile = profileRaw ? JSON.parse(profileRaw) : {};
    const waterGoal = parseFloat(profile.waterGoal) || 128;
    const activeCalGoal = parseInt(profile.activeCalGoal) || 500;
    const exerciseMinsGoal = parseInt(profile.exerciseMinsGoal) || 30;

    const todayRaw = await AsyncStorage.getItem(`pj_${todayKey}`);
    const today = todayRaw ? JSON.parse(todayRaw) : {};
    const todayWater = typeof today.water === 'number' ? today.water : 0;
    const todayActiveCals = typeof today.activeCalories === 'number' ? today.activeCalories : 0;
    const todayExerciseMins = typeof today.exerciseMinutes === 'number' ? today.exerciseMinutes : 0;

    await scheduleWaterNotificationsNow(todayWater, waterGoal, styleMode, mindfulGrowthAreas);
    await scheduleActivityNotificationNow(todayActiveCals, activeCalGoal, todayExerciseMins, exerciseMinsGoal, styleMode, mindfulGrowthAreas);
  } catch (e) {
    console.log('[notificationScheduler] refresh error:', e);
  }
};
