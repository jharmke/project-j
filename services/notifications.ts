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
  minSpacingMins: number;    // 30 | 60 | 90

  ifWindow: { enabled: boolean; reminders: string[] };         // minutes before close
  ifCheckin: { enabled: boolean; time: string };
  foodLog: { enabled: boolean; time: string };
  waterPace: { enabled: boolean };
  streakProtection: { enabled: boolean; minutesBefore: string };
  activity: { enabled: boolean; time: string };
  weeklyRecap: { enabled: boolean; time: string };
  morningIntention: { enabled: boolean; time: string };
  eveningGratitude: { enabled: boolean; time: string };
  prayerCheckin: { enabled: boolean; time: string };
  reengagement: { enabled: boolean };
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  masterEnabled: true,
  permissionAsked: false,
  quietStart: '22:00',
  quietEnd: '07:00',
  minSpacingMins: 60,
  ifWindow: { enabled: true, reminders: ['60'] },
  ifCheckin: { enabled: true, time: '13:00' },
  foodLog: { enabled: true, time: '19:00' },
  waterPace: { enabled: true },
  streakProtection: { enabled: true, minutesBefore: '45' },
  activity: { enabled: true, time: '17:00' },
  weeklyRecap: { enabled: true, time: '19:00' },
  morningIntention: { enabled: true, time: '07:00' },
  eveningGratitude: { enabled: true, time: '20:00' },
  prayerCheckin: { enabled: true, time: '21:00' },
  reengagement: { enabled: true },
};

// ── Storage ───────────────────────────────────────────────────────────────────

export const loadNotificationSettings = async (): Promise<NotificationSettings> => {
  try {
    const raw = await AsyncStorage.getItem('pj_notification_settings');
    if (!raw) return { ...DEFAULT_NOTIFICATION_SETTINGS };
    const parsed = JSON.parse(raw);
    // Deep merge per-section so new keys always have defaults
    return {
      ...DEFAULT_NOTIFICATION_SETTINGS,
      ...parsed,
      ifWindow: { ...DEFAULT_NOTIFICATION_SETTINGS.ifWindow, ...parsed.ifWindow },
      ifCheckin: { ...DEFAULT_NOTIFICATION_SETTINGS.ifCheckin, ...parsed.ifCheckin },
      foodLog: { ...DEFAULT_NOTIFICATION_SETTINGS.foodLog, ...parsed.foodLog },
      waterPace: { ...DEFAULT_NOTIFICATION_SETTINGS.waterPace, ...parsed.waterPace },
      streakProtection: { ...DEFAULT_NOTIFICATION_SETTINGS.streakProtection, ...parsed.streakProtection },
      activity: { ...DEFAULT_NOTIFICATION_SETTINGS.activity, ...parsed.activity },
      weeklyRecap: { ...DEFAULT_NOTIFICATION_SETTINGS.weeklyRecap, ...parsed.weeklyRecap },
      morningIntention: { ...DEFAULT_NOTIFICATION_SETTINGS.morningIntention, ...parsed.morningIntention },
      eveningGratitude: { ...DEFAULT_NOTIFICATION_SETTINGS.eveningGratitude, ...parsed.eveningGratitude },
      prayerCheckin: { ...DEFAULT_NOTIFICATION_SETTINGS.prayerCheckin, ...parsed.prayerCheckin },
      reengagement: { ...DEFAULT_NOTIFICATION_SETTINGS.reengagement, ...parsed.reengagement },
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

// Returns true if granted. Marks permissionAsked regardless of result.
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'ios') return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  if (existing === 'denied') return false; // one-shot used up
  const { status } = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  });
  const settings = await loadNotificationSettings();
  await saveNotificationSettings({ ...settings, permissionAsked: true });
  return status === 'granted';
};

// Should we present the permission ask right now?
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

// "10:30 PM" or 24h string → total minutes (handles post-midnight as 24h+)
const toNormalizedMins = (t: string): number | null => {
  const ampmMatch = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (ampmMatch) {
    let h = parseInt(ampmMatch[1]);
    const m = parseInt(ampmMatch[2]);
    const ampm = ampmMatch[3].toUpperCase();
    if (ampm === 'PM' && h !== 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    const mins = h * 60 + m;
    return h < 6 ? mins + 1440 : mins; // 1am = 25h, not 1h
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
  if (startMins > endMins) return mins >= startMins || mins < endMins; // spans midnight
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

// ── Mode-aware copy ───────────────────────────────────────────────────────────

const copy = {
  ifWindow: (mins: number, mode: StyleMode) => ({
    title: 'Eating Window Closing',
    body: mode === 'discipline'
      ? `${mins} minutes left in your eating window. Finish strong.`
      : mode === 'mindful'
      ? `${mins} minutes remaining in your eating window. Take your time.`
      : `${mins} minutes left in your eating window. Anything else you need?`,
  }),
  ifCheckin: (mode: StyleMode) => ({
    title: mode === 'discipline' ? 'IF Window Check' : mode === 'mindful' ? 'Gentle Check-In' : 'Did You Start Eating?',
    body: mode === 'discipline'
      ? 'You have food logged but your IF window hasn\'t started. Log your fast start.'
      : mode === 'mindful'
      ? 'Noticing you have food logged today. Did you want to start your eating window?'
      : 'You have food logged but your IF window isn\'t started. Tap to update.',
  }),
  foodLog: (mode: StyleMode) => ({
    title: mode === 'discipline' ? 'Log Your Meals' : mode === 'mindful' ? 'Check-In Time' : 'Food Log Reminder',
    body: mode === 'discipline'
      ? 'Nothing logged today. Stay accountable.'
      : mode === 'mindful'
      ? 'Take a moment to log what you\'ve eaten today.'
      : 'You haven\'t logged anything today. Tap to add a meal.',
  }),
  waterPace: (behind: number, mode: StyleMode) => ({
    title: mode === 'discipline' ? 'Water Deficit' : mode === 'mindful' ? 'Hydration Nudge' : 'Water Check',
    body: mode === 'discipline'
      ? `You\'re ${behind}oz behind your water goal. Get it done.`
      : mode === 'mindful'
      ? 'A gentle reminder -- your body could use some water right now.'
      : `You\'re about ${behind}oz behind your water pace for today.`,
  }),
  streakProtection: (name: string, mode: StyleMode) => ({
    title: mode === 'discipline' ? 'Streak On The Line' : mode === 'mindful' ? 'Keep Your Streak' : 'Streak At Risk',
    body: mode === 'discipline'
      ? `Your ${name} streak is on the line. Don\'t break the chain.`
      : mode === 'mindful'
      ? `Your ${name} journey continues today. One small action keeps it going.`
      : `Your ${name} streak is at risk. Log before midnight to keep it going.`,
  }),
  activity: (mode: StyleMode) => ({
    title: mode === 'discipline' ? 'No Workout Logged' : mode === 'mindful' ? 'Movement Check' : 'Activity Reminder',
    body: mode === 'discipline'
      ? 'No workout logged today. Movement matters.'
      : mode === 'mindful'
      ? 'How\'s your movement today? Every step counts.'
      : 'You haven\'t hit your activity goals yet today. Time to move.',
  }),
  weeklyRecap: (mode: StyleMode) => ({
    title: mode === 'discipline' ? 'Weekly Report' : mode === 'mindful' ? 'Your Week' : 'Your Week in Review',
    body: mode === 'discipline'
      ? 'Your weekly performance summary is ready. Check your stats.'
      : mode === 'mindful'
      ? 'A moment to reflect on your week. Open to see how it went.'
      : 'See how your week stacked up. Open to review your progress.',
  }),
  morningIntention: (mode: StyleMode) => ({
    title: mode === 'discipline' ? 'Start With Purpose' : mode === 'mindful' ? 'Morning Reflection' : 'Good Morning',
    body: mode === 'discipline'
      ? 'Set your intention for today. Check your verse and start strong.'
      : mode === 'mindful'
      ? 'Begin today with a moment of reflection. Your daily verse is ready.'
      : 'Start your day with intention. Today\'s message is waiting.',
  }),
  eveningGratitude: (mode: StyleMode) => ({
    title: mode === 'discipline' ? 'Gratitude Log' : mode === 'mindful' ? 'Evening Reflection' : 'Evening Gratitude',
    body: mode === 'discipline'
      ? 'Log one thing you\'re grateful for today.'
      : mode === 'mindful'
      ? 'What was good about today? A moment of gratitude goes a long way.'
      : 'Take 60 seconds to log what you\'re grateful for today.',
  }),
  prayerCheckin: (mode: StyleMode) => ({
    title: mode === 'mindful' ? 'Prayer Moment' : 'Prayer Reminder',
    body: mode === 'discipline'
      ? 'Log your prayer for today.'
      : mode === 'mindful'
      ? 'Take a quiet moment for prayer today.'
      : 'Don\'t forget your prayer check-in for today.',
  }),
  reengagement: (mode: StyleMode) => ({
    title: mode === 'discipline' ? 'Where\'d You Go?' : mode === 'mindful' ? 'Come Back When Ready' : 'We Miss You',
    body: mode === 'discipline'
      ? 'It\'s been a couple days. Get back on track today.'
      : mode === 'mindful'
      ? 'No pressure -- just here when you\'re ready to check in.'
      : 'It\'s been a couple days. Your streaks and goals are waiting.',
  }),
};

// ── IF Window (event-driven) ──────────────────────────────────────────────────

export const scheduleIFWindowNotifications = async (
  windowEnd: number,
  settings: NotificationSettings,
  styleMode: StyleMode,
) => {
  if (!settings.masterEnabled || !settings.ifWindow.enabled) return;
  if (Platform.OS !== 'ios') return;
  const status = await getPermissionStatus();
  if (status !== 'granted') return;

  await cancelIFWindowNotifications();

  const now = Date.now();
  for (const reminderStr of settings.ifWindow.reminders) {
    const mins = parseInt(reminderStr) || 60;
    const fireAt = windowEnd - mins * 60 * 1000;
    if (fireAt <= now) continue;

    const fireDate = new Date(fireAt);
    if (isInQuietHours(fireDate.getHours(), fireDate.getMinutes(), settings.quietStart, settings.quietEnd)) continue;

    const { title, body } = copy.ifWindow(mins, styleMode);
    await Notifications.scheduleNotificationAsync({
      identifier: `pj_if_window_${mins}`,
      content: { title, body, sound: true },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireDate },
    });
  }
};

export const cancelIFWindowNotifications = async () => {
  const candidates = ['15', '20', '30', '45', '60', '90', '120'];
  await Promise.all(
    candidates.map(m => Notifications.cancelScheduledNotificationAsync(`pj_if_window_${m}`).catch(() => {}))
  );
};

// ── Daily Scheduler ───────────────────────────────────────────────────────────

export interface SchedulerContext {
  styleMode: StyleMode;
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
}

const DAILY_IDS = [
  'pj_if_checkin', 'pj_food_log', 'pj_water_pace', 'pj_streak',
  'pj_activity', 'pj_weekly_recap', 'pj_morning_intention',
  'pj_evening_gratitude', 'pj_prayer_checkin', 'pj_reengagement',
];

const cancelAllDailyNotis = async () => {
  await Promise.all(DAILY_IDS.map(id => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})));
};

export const scheduleDailyNotifications = async (ctx: SchedulerContext) => {
  const settings = await loadNotificationSettings();
  if (!settings.masterEnabled) { await cancelAllDailyNotis(); return; }

  const status = await getPermissionStatus();
  if (status !== 'granted') return;

  await cancelAllDailyNotis();

  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const m = ctx.styleMode;

  // Track auto-timed times for spacing (user-set times never blocked)
  const autoTimes: number[] = [];

  const schedule = async (
    id: string,
    timeStr: string,
    title: string,
    body: string,
    opts: { isP1?: boolean; isAutoTimed?: boolean } = {},
  ) => {
    const { hour, minute } = parseTime(timeStr);
    const fireMins = hour * 60 + minute;
    if (fireMins <= nowMins) return; // already passed

    // P1: never blocked by quiet hours or spacing
    if (!opts.isP1) {
      if (isInQuietHours(hour, minute, settings.quietStart, settings.quietEnd)) return;
      if (opts.isAutoTimed) {
        const tooClose = autoTimes.some(t => Math.abs(t - fireMins) < settings.minSpacingMins);
        if (tooClose) return;
        autoTimes.push(fireMins);
      }
    }

    const fireDate = new Date();
    fireDate.setHours(hour, minute, 0, 0);
    await Notifications.scheduleNotificationAsync({
      identifier: id,
      content: { title, body, sound: true },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireDate },
    });
  };

  // 1. IF check-in -- fires if IF enabled, not started, but food already logged
  if (settings.ifCheckin.enabled && ctx.ifEnabled && !ctx.ifStarted && ctx.todayFoodEntries > 0) {
    const { title, body } = copy.ifCheckin(m);
    await schedule('pj_if_checkin', settings.ifCheckin.time, title, body);
  }

  // 2. Food log reminder -- fires if nothing logged yet
  if (settings.foodLog.enabled && ctx.todayFoodEntries === 0) {
    const { title, body } = copy.foodLog(m);
    await schedule('pj_food_log', settings.foodLog.time, title, body);
  }

  // 3. Water pace -- auto-timed (noon), fires if 30%+ behind expected pace
  if (settings.waterPace.enabled && ctx.waterGoal > 0) {
    const hoursElapsed = Math.max(0, now.getHours() - 6);
    const expectedPct = Math.min(1, hoursElapsed / 16);
    const actualPct = ctx.todayWater / ctx.waterGoal;
    const behind = Math.round((expectedPct - actualPct) * ctx.waterGoal);
    if (behind >= Math.round(ctx.waterGoal * 0.3)) {
      const { title, body } = copy.waterPace(behind, m);
      await schedule('pj_water_pace', '12:00', title, body, { isAutoTimed: true });
    }
  }

  // 4. Streak protection -- P1, bedtime-aware
  if (settings.streakProtection.enabled) {
    const atRisk = ctx.activeStreaks.filter(s => s.currentStreak > 0);
    if (atRisk.length > 0) {
      const avgBedtime = await getAverageBedtime();
      let fireTimeStr = '21:30';

      if (avgBedtime) {
        const n = toNormalizedMins(avgBedtime);
        if (n !== null) {
          const offset = parseInt(settings.streakProtection.minutesBefore) || 45;
          const adjusted = ((n - offset) % 1440 + 1440) % 1440;
          const fh = Math.floor(adjusted / 60);
          const fm = adjusted % 60;
          fireTimeStr = `${fh.toString().padStart(2, '0')}:${fm.toString().padStart(2, '0')}`;
        }
      }

      const streakName = atRisk.length === 1 ? atRisk[0].name : `${atRisk.length} streaks`;
      const { title, body } = copy.streakProtection(streakName, m);
      await schedule('pj_streak', fireTimeStr, title, body, { isP1: true });
    }
  }

  // 5. Activity reminder -- fires if no workout and steps below 80% of goal
  if (settings.activity.enabled) {
    const needsActivity = !ctx.todayWorkoutLogged || ctx.todaySteps < ctx.stepGoal * 0.8;
    if (needsActivity) {
      const { title, body } = copy.activity(m);
      await schedule('pj_activity', settings.activity.time, title, body);
    }
  }

  // 6. Weekly recap -- Sunday only
  if (settings.weeklyRecap.enabled && now.getDay() === 0) {
    const { title, body } = copy.weeklyRecap(m);
    await schedule('pj_weekly_recap', settings.weeklyRecap.time, title, body);
  }

  // 7. Morning intention -- faith-gated
  if (settings.morningIntention.enabled && ctx.faithJourney !== 'notrightnow') {
    const { title, body } = copy.morningIntention(m);
    await schedule('pj_morning_intention', settings.morningIntention.time, title, body);
  }

  // 8. Evening gratitude -- faith-gated
  if (settings.eveningGratitude.enabled && ctx.faithJourney !== 'notrightnow') {
    const { title, body } = copy.eveningGratitude(m);
    await schedule('pj_evening_gratitude', settings.eveningGratitude.time, title, body);
  }

  // 9. Prayer check-in -- Rooted only
  if (settings.prayerCheckin.enabled && ctx.faithJourney === 'rooted') {
    const { title, body } = copy.prayerCheckin(m);
    await schedule('pj_prayer_checkin', settings.prayerCheckin.time, title, body);
  }

  // 10. Re-engagement -- always cancel + reschedule 48h from now (fires if app not opened)
  if (settings.reengagement.enabled) {
    const { title, body } = copy.reengagement(m);
    const fireDate = new Date(Date.now() + 48 * 60 * 60 * 1000);
    await Notifications.scheduleNotificationAsync({
      identifier: 'pj_reengagement',
      content: { title, body, sound: true },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireDate },
    });
  }
};
