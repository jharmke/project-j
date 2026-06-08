import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { storageSet } from '../utils/storage';

// ── Types ─────────────────────────────────────────────────────────────────────

export type StyleMode = 'discipline' | 'balanced' | 'mindful';
export type FaithJourney = 'rooted' | 'exploring' | 'notrightnow';

export interface NotificationSettings {
  masterEnabled: boolean;
  permissionAsked: boolean;
  quietStart: string;        // "22:00"
  quietEnd: string;          // "07:00"

  // Standalone P1 toggle (spans fitness + faith, above category pills)
  streakProtection: boolean;

  // P2 daily cap for coaching content
  dailyCap: 3 | 5 | 'all';

  // Category toggles
  categoryFitness: boolean;
  categoryFaith: boolean;
  categoryFasting: boolean;
  categorySummaries: boolean;

  // Water sub-system count (spaced evenly, not competing with P2 cap)
  waterCount: 0 | 1 | 2 | 3 | 4;

  // Advanced controls
  activityTime: string;
  weightFrequency: 'daily' | '3day' | 'weekly';
  prayerTime: string;
  ifLeadMins: 15 | 30 | 60;
  streakOffsetMins: 30 | 45 | 60;

  // Always-on hidden system behavior
  reengagementEnabled: boolean;

  // Copy rotation indices per type (increments on fire, cycles at pool end)
  copyRotation: Record<string, number>;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  masterEnabled: true,
  permissionAsked: false,
  quietStart: '22:00',
  quietEnd: '07:00',
  streakProtection: true,
  dailyCap: 5,
  categoryFitness: true,
  categoryFaith: true,
  categoryFasting: true,
  categorySummaries: true,
  waterCount: 3,
  activityTime: '17:00',
  weightFrequency: '3day',
  prayerTime: '21:00',
  ifLeadMins: 30,
  streakOffsetMins: 45,
  reengagementEnabled: true,
  copyRotation: {},
};

export interface SchedulerContext {
  styleMode: StyleMode;
  mindfulGrowthAreas: boolean;
  faithJourney: FaithJourney;
  todayFoodEntries: number;
  todayWater: number;
  waterGoal: number;
  activeStreaks: Array<{ id: string; name: string; currentStreak: number }>;
  todayWorkoutLogged: boolean;
  todaySteps: number;
  stepGoal: number;
  ifEnabled: boolean;
  ifStarted: boolean;
  weightLoggedToday: boolean;
  hasLoggedWeightBefore: boolean;
  daysSinceLastWeight: number | null;
  faithReadingPending: boolean;
  gratitudeLoggedToday: boolean;
  prayerLoggedToday: boolean;
  todayVerseText: string | null;
}

// ── Storage ───────────────────────────────────────────────────────────────────

export const loadNotificationSettings = async (): Promise<NotificationSettings> => {
  try {
    const raw = await AsyncStorage.getItem('pj_notification_settings');
    if (!raw) return { ...DEFAULT_NOTIFICATION_SETTINGS };
    const parsed = JSON.parse(raw);

    // Migrate old streakProtection shape { enabled, minutesBefore } -> boolean
    let streakProtection: boolean = DEFAULT_NOTIFICATION_SETTINGS.streakProtection;
    if (typeof parsed.streakProtection === 'boolean') {
      streakProtection = parsed.streakProtection;
    } else if (parsed.streakProtection?.enabled !== undefined) {
      streakProtection = !!parsed.streakProtection.enabled;
    }

    // Migrate old minutesBefore string -> streakOffsetMins number
    let streakOffsetMins: 30 | 45 | 60 = DEFAULT_NOTIFICATION_SETTINGS.streakOffsetMins;
    if (parsed.streakOffsetMins === 30 || parsed.streakOffsetMins === 45 || parsed.streakOffsetMins === 60) {
      streakOffsetMins = parsed.streakOffsetMins;
    } else if (parsed.streakProtection?.minutesBefore) {
      const mb = parseInt(parsed.streakProtection.minutesBefore);
      if (mb === 30 || mb === 45 || mb === 60) streakOffsetMins = mb;
    }

    // Migrate old activity time
    const activityTime: string = parsed.activityTime ?? parsed.activity?.time ?? DEFAULT_NOTIFICATION_SETTINGS.activityTime;
    const prayerTime: string = parsed.prayerTime ?? parsed.prayerCheckin?.time ?? DEFAULT_NOTIFICATION_SETTINGS.prayerTime;

    // Migrate old ifWindow leadMins
    let ifLeadMins: 15 | 30 | 60 = DEFAULT_NOTIFICATION_SETTINGS.ifLeadMins;
    if (parsed.ifLeadMins === 15 || parsed.ifLeadMins === 30 || parsed.ifLeadMins === 60) {
      ifLeadMins = parsed.ifLeadMins;
    } else if (Array.isArray(parsed.ifWindow?.reminders) && parsed.ifWindow.reminders.length > 0) {
      const first = parseInt(parsed.ifWindow.reminders[0]);
      if (first === 15 || first === 30 || first === 60) ifLeadMins = first;
    }

    return {
      ...DEFAULT_NOTIFICATION_SETTINGS,
      masterEnabled: parsed.masterEnabled ?? DEFAULT_NOTIFICATION_SETTINGS.masterEnabled,
      permissionAsked: parsed.permissionAsked ?? DEFAULT_NOTIFICATION_SETTINGS.permissionAsked,
      quietStart: parsed.quietStart ?? DEFAULT_NOTIFICATION_SETTINGS.quietStart,
      quietEnd: parsed.quietEnd ?? DEFAULT_NOTIFICATION_SETTINGS.quietEnd,
      streakProtection,
      dailyCap: ([3, 5, 'all'] as const).includes(parsed.dailyCap) ? parsed.dailyCap : DEFAULT_NOTIFICATION_SETTINGS.dailyCap,
      categoryFitness: parsed.categoryFitness ?? DEFAULT_NOTIFICATION_SETTINGS.categoryFitness,
      categoryFaith: parsed.categoryFaith ?? DEFAULT_NOTIFICATION_SETTINGS.categoryFaith,
      categoryFasting: parsed.categoryFasting ?? DEFAULT_NOTIFICATION_SETTINGS.categoryFasting,
      categorySummaries: parsed.categorySummaries ?? DEFAULT_NOTIFICATION_SETTINGS.categorySummaries,
      waterCount: ([0, 1, 2, 3, 4] as const).includes(parsed.waterCount) ? parsed.waterCount : DEFAULT_NOTIFICATION_SETTINGS.waterCount,
      activityTime,
      weightFrequency: (['daily', '3day', 'weekly'] as const).includes(parsed.weightFrequency) ? parsed.weightFrequency : DEFAULT_NOTIFICATION_SETTINGS.weightFrequency,
      prayerTime,
      ifLeadMins,
      streakOffsetMins,
      reengagementEnabled: parsed.reengagementEnabled ?? DEFAULT_NOTIFICATION_SETTINGS.reengagementEnabled,
      copyRotation: parsed.copyRotation ?? {},
    };
  } catch {
    return { ...DEFAULT_NOTIFICATION_SETTINGS };
  }
};

export const saveNotificationSettings = async (s: NotificationSettings) => {
  await storageSet('pj_notification_settings', JSON.stringify(s));
};

// ── Permission ────────────────────────────────────────────────────────────────

export const setupNotificationHandler = () => {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
};

export const getPermissionStatus = async (): Promise<'granted' | 'denied' | 'undetermined'> => {
  if (Platform.OS !== 'ios') return 'undetermined';
  const { status } = await Notifications.getPermissionsAsync();
  return status as 'granted' | 'denied' | 'undetermined';
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'ios') return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  if (existing === 'denied') return false;
  const { status } = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  });
  const settings = await loadNotificationSettings();
  await saveNotificationSettings({ ...settings, permissionAsked: true });
  return status === 'granted';
};

export const shouldAskPermission = async (): Promise<boolean> => {
  const settings = await loadNotificationSettings();
  if (settings.permissionAsked) return false;
  const status = await getPermissionStatus();
  return status === 'undetermined';
};

// ── Helpers ───────────────────────────────────────────────────────────────────

export const parseTime = (t: string): { hour: number; minute: number } => {
  const [h, m] = (t || '00:00').split(':').map(Number);
  return { hour: isNaN(h) ? 0 : h, minute: isNaN(m) ? 0 : m };
};

export const formatNotifTime = (t: string): string => {
  const { hour, minute } = parseTime(t);
  const h = hour % 12 || 12;
  const m = minute.toString().padStart(2, '0');
  const ampm = hour < 12 ? 'AM' : 'PM';
  return `${h}:${m} ${ampm}`;
};

// "10:30 PM" or 24h string -> total minutes (handles post-midnight as 24h+)
export const toNormalizedMins = (t: string): number | null => {
  const ampmMatch = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (ampmMatch) {
    let h = parseInt(ampmMatch[1]);
    const m = parseInt(ampmMatch[2]);
    const ampm = ampmMatch[3].toUpperCase();
    if (ampm === 'PM' && h !== 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    const mins = h * 60 + m;
    return h < 6 ? mins + 1440 : mins;
  }
  const parts = t.split(':').map(Number);
  if (parts.length >= 2 && !isNaN(parts[0])) {
    const mins = parts[0] * 60 + (parts[1] || 0);
    return parts[0] < 6 ? mins + 1440 : mins;
  }
  return null;
};

const isInQuietHours = (hour: number, minute: number, quietStart: string, quietEnd: string): boolean => {
  const { hour: sh, minute: sm } = parseTime(quietStart);
  const { hour: eh, minute: em } = parseTime(quietEnd);
  const mins = hour * 60 + minute;
  const startMins = sh * 60 + sm;
  const endMins = eh * 60 + em;
  if (startMins > endMins) return mins >= startMins || mins < endMins;
  return mins >= startMins && mins < endMins;
};

// Average bedtime from last 7 days. Returns "10:42 PM" or null.
export const getAverageBedtime = async (): Promise<string | null> => {
  const mins: number[] = [];
  for (let i = 1; i <= 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    try {
      const raw = await AsyncStorage.getItem(`pj_${key}`);
      if (!raw) continue;
      const data = JSON.parse(raw);
      const bt = data.sleepBedTime ?? data.sleepStoredBed;
      if (!bt) continue;
      let m: number | null = null;
      if (typeof bt === 'number') {
        const dt = new Date(bt);
        const h = dt.getHours();
        m = h * 60 + dt.getMinutes();
        if (h < 6) m += 1440;
      } else if (typeof bt === 'string') {
        m = toNormalizedMins(bt);
      }
      if (m !== null) mins.push(m);
    } catch {}
  }
  if (mins.length < 3) return null;
  const avg = Math.round(mins.reduce((a, b) => a + b, 0) / mins.length) % 1440;
  const h = Math.floor(avg / 60);
  const mn = avg % 60;
  const displayH = h % 12 || 12;
  const ampm = h < 12 ? 'AM' : 'PM';
  return `${displayH}:${mn.toString().padStart(2, '0')} ${ampm}`;
};

// ── IF Window (event-driven) ──────────────────────────────────────────────────

export const scheduleIFWindowNotifications = async (
  windowEnd: number,
  settings: NotificationSettings,
  styleMode: StyleMode,
) => {
  if (!settings.masterEnabled || !settings.categoryFasting) return;
  if (Platform.OS !== 'ios') return;
  const status = await getPermissionStatus();
  if (status !== 'granted') return;

  await cancelIFWindowNotifications();

  const now = Date.now();
  const mins = settings.ifLeadMins;
  const fireAt = windowEnd - mins * 60 * 1000;
  if (fireAt <= now) return;

  const fireDate = new Date(fireAt);
  if (isInQuietHours(fireDate.getHours(), fireDate.getMinutes(), settings.quietStart, settings.quietEnd)) return;

  const m = styleMode;
  const title = m === 'discipline' ? 'Eating Window Closing' : m === 'mindful' ? 'Eating Window Closing' : 'Eating Window Closing';
  const body = m === 'discipline'
    ? `${mins} minutes left in your eating window. Finish strong.`
    : m === 'mindful'
    ? `${mins} minutes remaining in your eating window. Take your time.`
    : `${mins} minutes left in your eating window. Anything else you need?`;

  await Notifications.scheduleNotificationAsync({
    identifier: `pj_if_window_${mins}`,
    content: { title, body, sound: true, data: { route: '/', params: { scrollTo: 'if' } } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireDate },
  });
};

export const cancelIFWindowNotifications = async () => {
  const candidates = ['15', '20', '30', '45', '60', '90', '120'];
  await Promise.all(
    candidates.map(m => Notifications.cancelScheduledNotificationAsync(`pj_if_window_${m}`).catch(() => {}))
  );
};

// ── Cancel functions ──────────────────────────────────────────────────────────

export const cancelFoodLogNotification = () =>
  Notifications.cancelScheduledNotificationAsync('pj_food_log').catch(() => {});

export const cancelWaterNotifications = () =>
  Promise.all([1, 2, 3, 4].map(i =>
    Notifications.cancelScheduledNotificationAsync(`pj_water_${i}`).catch(() => {})
  ));

// Backward-compat alias used in index.tsx and log.tsx
export const cancelWaterPaceNotification = cancelWaterNotifications;

export const cancelActivityNotification = () =>
  Notifications.cancelScheduledNotificationAsync('pj_activity').catch(() => {});

export const cancelGratitudeNotification = () =>
  Notifications.cancelScheduledNotificationAsync('pj_gratitude').catch(() => {});

// Backward-compat alias used in GratitudeStreakCard.tsx
export const cancelEveningGratitudeNotification = cancelGratitudeNotification;

export const cancelFaithReadingNotification = () =>
  Notifications.cancelScheduledNotificationAsync('pj_faith_reading').catch(() => {});

export const cancelWeeklySummaryNotification = () =>
  Notifications.cancelScheduledNotificationAsync('pj_weekly_summary').catch(() => {});

export const cancelMonthlySummaryNotification = () =>
  Notifications.cancelScheduledNotificationAsync('pj_monthly_summary').catch(() => {});

// ── Daily Scheduler ───────────────────────────────────────────────────────────

const ALL_DAILY_IDS = [
  'pj_streak',
  'pj_faith_reading',
  'pj_gratitude',
  'pj_prayer',
  'pj_food_log',
  'pj_activity',
  'pj_daily_verse',
  'pj_weight_log',
  'pj_if_checkin',
  'pj_weekly_summary',
  'pj_monthly_summary',
  'pj_reengagement',
  'pj_water_1', 'pj_water_2', 'pj_water_3', 'pj_water_4',
  // old IDs cleanup
  'pj_morning_intention', 'pj_evening_gratitude', 'pj_weekly_recap', 'pj_prayer_checkin', 'pj_water_pace',
];

const cancelAllDailyNotis = async () => {
  await Promise.all(ALL_DAILY_IDS.map(id => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})));
};

export const scheduleDailyNotifications = async (ctx: SchedulerContext) => {
  const s = await loadNotificationSettings();
  if (!s.masterEnabled) { await cancelAllDailyNotis(); return; }

  const status = await getPermissionStatus();
  if (status !== 'granted') return;

  await cancelAllDailyNotis();

  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const m = ctx.styleMode;
  const isMindful = m === 'mindful';
  const growthOn = ctx.mindfulGrowthAreas;

  const scheduleOne = async (
    id: string,
    timeStr: string,
    title: string,
    body: string,
    data: Record<string, any>,
    isP1 = false,
  ) => {
    const { hour, minute } = parseTime(timeStr);
    const fireMins = hour * 60 + minute;
    if (fireMins <= nowMins) return false;
    if (!isP1 && isInQuietHours(hour, minute, s.quietStart, s.quietEnd)) return false;
    const fireDate = new Date();
    fireDate.setHours(hour, minute, 0, 0);
    await Notifications.scheduleNotificationAsync({
      identifier: id,
      content: { title, body, sound: true, data },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireDate },
    });
    return true;
  };

  // ── P1: Streak Protection ─────────────────────────────────────────────────
  if (s.streakProtection) {
    const atRisk = ctx.activeStreaks.filter(streak => streak.currentStreak > 0);
    const suppress = isMindful && !growthOn;
    if (atRisk.length > 0 && !suppress) {
      const avgBedtime = await getAverageBedtime();
      let fireTimeStr = '21:00';
      if (avgBedtime) {
        const n = toNormalizedMins(avgBedtime);
        if (n !== null) {
          const offset = s.streakOffsetMins;
          const adjusted = ((n - offset) % 1440 + 1440) % 1440;
          const fh = Math.floor(adjusted / 60);
          const fm = adjusted % 60;
          fireTimeStr = `${fh.toString().padStart(2, '0')}:${fm.toString().padStart(2, '0')}`;
        }
      }

      let title: string;
      let body: string;
      if (atRisk.length === 1) {
        const { name, currentStreak } = atRisk[0];
        title = isMindful ? 'Keep Going' : 'Streak At Risk';
        body = isMindful
          ? `Your ${name} streak continues today. One small action keeps it going.`
          : `${name} streak: ${currentStreak} days. Don't let it end tonight.`;
      } else if (atRisk.length === 2) {
        title = isMindful ? 'Two Streaks Today' : 'Streaks At Risk';
        body = isMindful
          ? `Your ${atRisk[0].name} and ${atRisk[1].name} streaks continue today.`
          : `${atRisk[0].name} and ${atRisk[1].name} streaks at risk tonight.`;
      } else {
        title = isMindful ? 'Your Streaks Continue' : 'Streaks At Risk Tonight';
        body = isMindful
          ? `${atRisk.length} streaks going strong. One small action each keeps them alive.`
          : `${atRisk.length} streaks at risk tonight. Tap to check.`;
      }
      await scheduleOne('pj_streak', fireTimeStr, title, body, { route: '/' }, true);
    }
  }

  // ── P2: Build candidates in priority order ────────────────────────────────
  type P2Item = { id: string; time: string; title: string; body: string; data: Record<string, any> };
  const candidates: P2Item[] = [];

  // 1. Faith Reading
  if (s.categoryFaith && ctx.faithJourney !== 'notrightnow' && ctx.faithReadingPending) {
    candidates.push({
      id: 'pj_faith_reading',
      time: '08:30',
      title: m === 'discipline' ? 'Faith Content Ready' : "Today's Reading Is Waiting",
      body: m === 'discipline'
        ? 'Your devotional or reading plan content is ready. Get in the Word.'
        : "You have devotional or reading plan content for today. Take a few minutes.",
      data: { route: '/plans' },
    });
  }

  // 2a. Gratitude (fires in both Mindful states)
  if (s.categoryFaith && ctx.faithJourney !== 'notrightnow' && !ctx.gratitudeLoggedToday) {
    candidates.push({
      id: 'pj_gratitude',
      time: '19:00',
      title: m === 'discipline' ? 'Log Your Gratitude' : 'Gratitude Moment',
      body: m === 'discipline'
        ? 'Log one thing you are grateful for today.'
        : 'Take a moment to log what you are grateful for today.',
      data: { route: '/(tabs)/faith', params: { scrollTo: 'gratitude' } },
    });
  }

  // 2b. Prayer (fires in both Mindful states, Rooted only)
  if (s.categoryFaith && ctx.faithJourney === 'rooted' && !ctx.prayerLoggedToday) {
    candidates.push({
      id: 'pj_prayer',
      time: s.prayerTime,
      title: m === 'mindful' ? 'Prayer Moment' : 'Prayer Check-In',
      body: m === 'discipline'
        ? 'Log your prayer for today.'
        : m === 'mindful'
        ? 'Take a quiet moment for prayer today.'
        : "Don't forget your prayer check-in for today.",
      data: { route: '/prayer' },
    });
  }

  // 4. Food Log Reminder (fixed 2pm, suppressed in default Mindful)
  if (s.categoryFitness && ctx.todayFoodEntries === 0 && (!isMindful || growthOn)) {
    candidates.push({
      id: 'pj_food_log',
      time: '14:00',
      title: m === 'discipline' ? 'Log Your Meals' : m === 'mindful' ? 'Check-In Time' : 'Food Log Reminder',
      body: m === 'discipline'
        ? 'Nothing logged today. Stay accountable.'
        : m === 'mindful'
        ? 'Take a moment to check in with what you have eaten today.'
        : "You haven't logged anything today. Tap to add a meal.",
      data: { route: '/(tabs)/log' },
    });
  }

  // 5. Activity Reminder (no workout AND steps below 75% of goal)
  if (s.categoryFitness && !ctx.todayWorkoutLogged && ctx.todaySteps < ctx.stepGoal * 0.75 && (!isMindful || growthOn)) {
    candidates.push({
      id: 'pj_activity',
      time: s.activityTime,
      title: m === 'discipline' ? 'No Workout Logged' : m === 'mindful' ? 'Movement Check' : 'Activity Reminder',
      body: m === 'discipline'
        ? 'No workout logged today. Movement matters.'
        : m === 'mindful'
        ? 'How has your movement been today?'
        : "You haven't hit your activity goals today. Time to move.",
      data: { route: '/(tabs)/workout' },
    });
  }

  // 6. Daily Verse (random 8-11am window, date-seeded for determinism)
  if (s.categoryFaith && ctx.faithJourney !== 'notrightnow') {
    const dateSeed = parseInt(now.toISOString().split('T')[0].replace(/-/g, '').slice(-4));
    const verseOffsetMins = (dateSeed * 37) % 180;
    const verseHour = 8 + Math.floor(verseOffsetMins / 60);
    const verseMin = verseOffsetMins % 60;
    const verseTime = `${verseHour.toString().padStart(2, '0')}:${verseMin.toString().padStart(2, '0')}`;
    candidates.push({
      id: 'pj_daily_verse',
      time: verseTime,
      title: m === 'discipline' ? "Today's Verse" : m === 'mindful' ? 'A Word for Today' : "Today's Message",
      body: ctx.todayVerseText ? ctx.todayVerseText.slice(0, 120) : "Today's verse is ready. Open to read.",
      data: { route: '/bible', params: { openTodayVerse: '1' } },
    });
  }

  // 7. Weight Log Reminder (suppressed in Mindful always)
  if (s.categoryFitness && !ctx.weightLoggedToday && ctx.hasLoggedWeightBefore && !isMindful) {
    const shouldFire = (() => {
      if (s.weightFrequency === 'daily') return true;
      if (ctx.daysSinceLastWeight === null) return true;
      if (s.weightFrequency === '3day') return ctx.daysSinceLastWeight >= 3;
      if (s.weightFrequency === 'weekly') return ctx.daysSinceLastWeight >= 7;
      return false;
    })();
    if (shouldFire) {
      candidates.push({
        id: 'pj_weight_log',
        time: '07:30',
        title: m === 'discipline' ? 'Log Your Weight' : 'Weight Check',
        body: m === 'discipline'
          ? 'Track your weight to stay on top of your progress.'
          : "Don't forget to log your weight today.",
        data: { route: '/', params: { scrollTo: 'weight' } },
      });
    }
  }

  // 8. IF Check-In (food logged, IF enabled but not started, suppressed default Mindful)
  if (s.categoryFasting && ctx.ifEnabled && !ctx.ifStarted && ctx.todayFoodEntries > 0 && (!isMindful || growthOn)) {
    candidates.push({
      id: 'pj_if_checkin',
      time: '13:00',
      title: isMindful ? 'Gentle Check-In' : 'Did You Start Eating?',
      body: isMindful
        ? 'Noticing you have food logged today. Did you want to start your eating window?'
        : "You have food logged but your IF window isn't started. Tap to update.",
      data: { route: '/', params: { scrollTo: 'if' } },
    });
  }

  // Apply daily cap and schedule P2
  const capNum = s.dailyCap === 'all' ? candidates.length : s.dailyCap;
  const toSchedule = candidates.slice(0, capNum);
  for (const item of toSchedule) {
    await scheduleOne(item.id, item.time, item.title, item.body, item.data);
  }

  // ── Water sub-system (not in P2 cap, spaced evenly across waking hours) ───
  if (s.categoryFitness && s.waterCount > 0) {
    const { hour: quietEndH, minute: quietEndM } = parseTime(s.quietEnd);
    const { hour: quietStartH, minute: quietStartM } = parseTime(s.quietStart);
    const wakingStartMins = quietEndH * 60 + quietEndM;
    const wakingEndMins = quietStartH * 60 + quietStartM;
    const wakingTotal = wakingEndMins > wakingStartMins
      ? wakingEndMins - wakingStartMins
      : 1440 - wakingStartMins + wakingEndMins;

    for (let i = 1; i <= s.waterCount; i++) {
      const offsetMins = Math.round((i / (s.waterCount + 1)) * wakingTotal);
      const fireTotalMins = (wakingStartMins + offsetMins) % 1440;
      const fh = Math.floor(fireTotalMins / 60);
      const fm = fireTotalMins % 60;
      if (fh * 60 + fm <= nowMins) continue;
      const fireDate = new Date();
      fireDate.setHours(fh, fm, 0, 0);
      await Notifications.scheduleNotificationAsync({
        identifier: `pj_water_${i}`,
        content: {
          title: m === 'discipline' ? 'Water Check' : 'Hydration Reminder',
          body: m === 'discipline' ? 'Stay on top of your hydration.' : 'Time for some water.',
          sound: true,
          data: { route: '/', params: { scrollTo: 'water' } },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireDate },
      });
    }
  }

  // ── Always-on bypass: Weekly Summary (Monday) ─────────────────────────────
  if (s.categorySummaries && now.getDay() === 1) {
    const dateSeed = parseInt(now.toISOString().split('T')[0].replace(/-/g, '').slice(-4));
    const fireMin = dateSeed % 60;
    const fireHour = 11 + (dateSeed % 2);
    const fireDate = new Date();
    fireDate.setHours(fireHour, fireMin, 0, 0);
    if (fireDate > now) {
      await Notifications.scheduleNotificationAsync({
        identifier: 'pj_weekly_summary',
        content: {
          title: 'Weekly Summary Ready',
          body: m === 'discipline' ? 'Your weekly performance report is ready.' : 'Your week is wrapped up. See how it went.',
          sound: true,
          data: { route: '/weekly-summary' },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireDate },
      });
    }
  }

  // ── Always-on bypass: Monthly Summary (1st of month) ─────────────────────
  if (s.categorySummaries && now.getDate() === 1) {
    const dateSeed = parseInt(now.toISOString().split('T')[0].replace(/-/g, '').slice(-4));
    const fireMin = (dateSeed + 17) % 60;
    const fireHour = 11 + ((dateSeed + 1) % 2);
    const fireDate = new Date();
    fireDate.setHours(fireHour, fireMin, 0, 0);
    if (fireDate > now) {
      await Notifications.scheduleNotificationAsync({
        identifier: 'pj_monthly_summary',
        content: {
          title: 'Monthly Summary Ready',
          body: m === 'discipline' ? 'Your monthly performance report is ready.' : 'Your month is wrapped up. See how it went.',
          sound: true,
          data: { route: '/monthly-summary' },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireDate },
      });
    }
  }

  // ── Always-on: Re-engagement (48h from now, resets each app open) ─────────
  if (s.reengagementEnabled) {
    const fireDate = new Date(Date.now() + 48 * 60 * 60 * 1000);
    await Notifications.scheduleNotificationAsync({
      identifier: 'pj_reengagement',
      content: {
        title: m === 'discipline' ? "Where'd You Go?" : m === 'mindful' ? 'Come Back When Ready' : 'We Miss You',
        body: m === 'discipline'
          ? "It's been a couple days. Get back on track today."
          : m === 'mindful'
          ? 'No pressure. We are here when you are ready.'
          : "It's been a couple days. Your streaks and goals are waiting.",
        sound: true,
        data: { route: '/' },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireDate },
    });
  }
};
