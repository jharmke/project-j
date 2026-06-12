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
  todayVerseRef: string | null;
  activeCalGoal: number;
  exerciseMinsGoal: number;
  todayActiveCals: number;
  todayExerciseMins: number;
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

// ── Copy Pools ────────────────────────────────────────────────────────────────

interface CopyVariation { title: string; body: string; }

interface ModePools {
  discipline: CopyVariation[];
  balanced: CopyVariation[];
  mindful?: CopyVariation[];
  mindfulGrowth?: CopyVariation[];
}

const COPY_POOLS: Record<string, ModePools> = {

  // Placeholders: {NAME} streak name, {X} streak count
  streak_single: {
    discipline: [
      { title: 'Streak At Risk', body: '{NAME} streak: {X} days. Don\'t let it end tonight.' },
      { title: 'Protect Your Streak', body: '{X} days on {NAME}. Finish the day strong.' },
      { title: 'Don\'t Break the Chain', body: '{NAME} is at {X} days. One action. Keep it alive.' },
      { title: 'Streak Alert', body: '{NAME}: {X} days and counting. Don\'t stop now.' },
    ],
    balanced: [
      { title: 'Streak At Risk', body: '{NAME} streak: {X} days. Don\'t let it end tonight.' },
      { title: 'Keep It Going', body: '{X} days on {NAME}. You\'ve come this far.' },
      { title: 'Tonight Matters', body: '{NAME} is at {X} days. One small action keeps it alive.' },
      { title: 'Don\'t Lose It', body: '{NAME} streak at {X} days. Tap to check in.' },
    ],
    mindfulGrowth: [
      { title: 'Keep Going', body: 'Your {NAME} streak continues today. One small action keeps it going.' },
      { title: 'A Moment for {NAME}', body: 'Your {NAME} streak is still going. A small step today is enough.' },
      { title: 'Still Going', body: '{X} days of {NAME}. No pressure, just a gentle reminder.' },
      { title: 'One Step Today', body: 'Your {NAME} streak is at {X} days. You get to decide what counts today.' },
    ],
  },

  // Placeholders: {N1} first streak name, {N2} second streak name
  streak_double: {
    discipline: [
      { title: 'Streaks At Risk', body: '{N1} and {N2} streaks at risk tonight.' },
      { title: 'Two Streaks Tonight', body: 'Don\'t drop {N1} or {N2} today.' },
      { title: 'Protect Both', body: '{N1} and {N2}: both on the line tonight.' },
      { title: 'Two to Defend', body: '{N1} and {N2} streaks. Lock them in before bed.' },
    ],
    balanced: [
      { title: 'Two Streaks Tonight', body: '{N1} and {N2} streaks: don\'t let either slip.' },
      { title: 'Keep Both Alive', body: '{N1} and {N2} are both still going. Check in tonight.' },
      { title: 'Two Things Tonight', body: '{N1} and {N2} streaks. You\'ve got this.' },
      { title: 'Streaks At Risk', body: '{N1} and {N2}: one action each keeps them alive.' },
    ],
    mindfulGrowth: [
      { title: 'Two Streaks Today', body: 'Your {N1} and {N2} streaks continue today.' },
      { title: 'Still Going', body: '{N1} and {N2}: both still alive. A small moment for each.' },
      { title: 'Two Small Actions', body: 'Your {N1} and {N2} streaks are still here. No rush.' },
      { title: 'Two Continuing', body: '{N1} and {N2} are both still going. You decide what counts.' },
    ],
  },

  // Placeholder: {N} streak count
  streak_multi: {
    discipline: [
      { title: 'Streaks At Risk Tonight', body: '{N} streaks at risk tonight. Tap to check.' },
      { title: '{N} Streaks on the Line', body: 'Don\'t let tonight be the night they end.' },
      { title: 'Multiple Streaks', body: '{N} active streaks. All at risk. Go.' },
      { title: 'Defend Your Streaks', body: '{N} streaks tonight. Lock them in.' },
    ],
    balanced: [
      { title: '{N} Streaks Tonight', body: '{N} streaks active tonight. Check in before bed.' },
      { title: 'Streaks At Risk', body: '{N} streaks on the line. One action each.' },
      { title: 'Keep Them Going', body: '{N} streaks still running. Don\'t let today be the gap.' },
      { title: 'Multiple Streaks', body: '{N} streaks going. You\'ve kept them all this far.' },
    ],
    mindfulGrowth: [
      { title: 'Your Streaks Continue', body: '{N} streaks going strong. One small action each keeps them alive.' },
      { title: '{N} Things Still Going', body: 'No pressure. Each one just needs a small moment today.' },
      { title: 'Still Here', body: '{N} streaks are still with you. You get to choose what counts.' },
      { title: 'A Few Moments Today', body: '{N} streaks. A little goes a long way.' },
    ],
  },

  // Placeholder: {N} lead-time minutes
  if_window: {
    discipline: [
      { title: 'Eating Window Closing', body: '{N} minutes left in your eating window. Finish strong.' },
      { title: 'Window Closing', body: '{N} min left. Get anything else in now.' },
      { title: 'Last Call', body: 'Eating window closes in {N} minutes. Lock it in.' },
      { title: 'Window Ending', body: '{N} minutes. Make your final call and close strong.' },
      { title: 'Eating Window Alert', body: '{N} minutes until your window closes. Stay disciplined.' },
    ],
    balanced: [
      { title: 'Eating Window Closing', body: '{N} minutes left in your eating window. Anything else you need?' },
      { title: 'Almost Closed', body: '{N} min left in your eating window.' },
      { title: 'Window Ending Soon', body: 'Your eating window closes in {N} minutes.' },
      { title: 'Last {N} Minutes', body: 'Your window is almost closed for the day.' },
      { title: 'Window Closing', body: '{N} minutes left. Wrap up when you are ready.' },
    ],
    mindful: [
      { title: 'Eating Window Closing', body: '{N} minutes remaining in your eating window. Take your time.' },
      { title: 'Window Ending', body: 'Your eating window closes in {N} minutes. No rush.' },
      { title: 'Almost Done', body: '{N} more minutes in your window. Listen to what your body needs.' },
      { title: 'Gentle Reminder', body: 'Your eating window is winding down. {N} minutes remaining.' },
      { title: 'Window Closing Soon', body: '{N} minutes left. Close out when you feel ready.' },
    ],
  },

  weekly_summary: {
    discipline: [
      { title: 'Weekly Summary Ready', body: 'Your weekly performance report is ready.' },
      { title: 'Week in Review', body: 'See how you performed this week. Tap to review.' },
      { title: 'Your Week, Reviewed', body: 'Weekly report is in. Time to assess.' },
      { title: 'Weekly Report', body: 'This week\'s numbers are ready. Know where you stand.' },
    ],
    balanced: [
      { title: 'Weekly Summary Ready', body: 'Your week is wrapped up. See how it went.' },
      { title: 'Your Week Is Ready', body: 'Tap to see your weekly summary.' },
      { title: 'Week Wrapped', body: 'Your weekly summary is ready to review.' },
      { title: 'See Your Week', body: 'This week\'s summary is waiting for you.' },
    ],
    mindful: [
      { title: 'Weekly Summary Ready', body: 'Your week is wrapped up. Tap to reflect on it.' },
      { title: 'Your Week Is Ready', body: 'See what this week looked like. No judgment, just a look.' },
      { title: 'Week in Review', body: 'Your weekly summary is here. A good time to pause and reflect.' },
      { title: 'See Your Week', body: 'Your weekly summary is ready. Take a quiet look.' },
    ],
  },

  monthly_summary: {
    discipline: [
      { title: 'Monthly Summary Ready', body: 'Your monthly performance report is ready.' },
      { title: 'Month in Review', body: 'See how you performed this month. Tap to review.' },
      { title: 'Monthly Report', body: 'This month\'s numbers are in. Know where you stand.' },
      { title: 'Your Month, Reviewed', body: 'Monthly report ready. Assess and adjust.' },
    ],
    balanced: [
      { title: 'Monthly Summary Ready', body: 'Your month is wrapped up. See how it went.' },
      { title: 'Your Month Is Ready', body: 'Tap to see your monthly summary.' },
      { title: 'Month Wrapped', body: 'Your monthly summary is ready to review.' },
      { title: 'See Your Month', body: 'This month\'s summary is waiting for you.' },
    ],
    mindful: [
      { title: 'Monthly Summary Ready', body: 'Your month is wrapped up. Tap to reflect on it.' },
      { title: 'Your Month Is Ready', body: 'See what this month looked like. No judgment, just a look.' },
      { title: 'Month in Review', body: 'Your monthly summary is here. A good moment to pause.' },
      { title: 'See Your Month', body: 'Your monthly summary is ready. Take a quiet look.' },
    ],
  },

  reengagement: {
    discipline: [
      { title: 'Where\'d You Go?', body: 'It\'s been a couple days. Get back on track today.' },
      { title: 'Time to Return', body: 'You have been away for a few days. Let\'s get back at it.' },
      { title: 'Pick It Back Up', body: 'A few days off. Today is the day to restart.' },
      { title: 'Don\'t Fall Off', body: 'It\'s been a couple days. Don\'t let the gap get wider.' },
      { title: 'Back to Work', body: 'A few days away. Your goals are still there. So are you.' },
    ],
    balanced: [
      { title: 'We Miss You', body: 'It\'s been a couple days. Your streaks and goals are waiting.' },
      { title: 'Come Back', body: 'It\'s been a few days. We saved your spot.' },
      { title: 'Still Here', body: 'Your streaks and goals are ready when you are.' },
      { title: 'Pick Up Where You Left Off', body: 'It\'s been a couple days. Everything is right where you left it.' },
      { title: 'Check In', body: 'A few days off. Come back and see where you stand.' },
    ],
    mindful: [
      { title: 'Come Back When Ready', body: 'No pressure. We are here when you are ready.' },
      { title: 'Still Here', body: 'No rush. Your goals and streaks are waiting whenever you return.' },
      { title: 'Whenever You Are Ready', body: 'We haven\'t seen you in a few days. No pressure at all.' },
      { title: 'We Are Here', body: 'Take your time. We will be here when you want to check in.' },
      { title: 'Just Checking In', body: 'It\'s been a few days. Come back whenever feels right.' },
    ],
  },

  faith_reading: {
    discipline: [
      { title: 'Faith Content Ready', body: 'Your devotional or reading plan content is ready. Get in the Word.' },
      { title: 'Reading Plan Waiting', body: 'Today\'s faith content is ready. Don\'t skip it.' },
      { title: 'Get in the Word', body: 'You have devotional content waiting. Make time today.' },
      { title: 'Daily Reading', body: 'Your reading plan content for today is ready.' },
      { title: 'Faith Content', body: 'Devotional or reading plan content ready. Open and read.' },
    ],
    balanced: [
      { title: 'Today\'s Reading Is Waiting', body: 'You have devotional or reading plan content for today. Take a few minutes.' },
      { title: 'Reading Plan Ready', body: 'Your faith content for today is waiting.' },
      { title: 'A Few Minutes in the Word', body: 'Today\'s devotional content is ready when you are.' },
      { title: 'Faith Reading', body: 'Your reading plan has today\'s content ready.' },
      { title: 'Today\'s Content', body: 'Devotional or reading plan content is waiting for you today.' },
    ],
    mindful: [
      { title: 'Today\'s Reading', body: 'Your faith reading for today is here whenever you want it.' },
      { title: 'A Quiet Moment', body: 'Your devotional content is ready. A good time to pause and read.' },
      { title: 'Reading Plan', body: 'Today\'s reading is waiting. No rush.' },
      { title: 'Faith Content Ready', body: 'Your reading plan content is here. Take it at your own pace.' },
      { title: 'In the Word Today', body: 'Your devotional content is ready whenever you have a quiet moment.' },
    ],
  },

  gratitude: {
    discipline: [
      { title: 'Log Your Gratitude', body: 'Log one thing you are grateful for today.' },
      { title: 'Gratitude Check', body: 'You haven\'t logged gratitude yet. Do it now.' },
      { title: 'Daily Gratitude', body: 'One gratitude entry. Make it count.' },
      { title: 'Log Gratitude', body: 'Gratitude not logged today. Keep the streak alive.' },
      { title: 'Gratitude: Logged?', body: 'You haven\'t logged today\'s gratitude. Tap to add it.' },
    ],
    balanced: [
      { title: 'Gratitude Moment', body: 'Take a moment to log what you are grateful for today.' },
      { title: 'Log Your Gratitude', body: 'A quick moment for gratitude today.' },
      { title: 'Daily Gratitude', body: 'Your gratitude for today hasn\'t been logged yet.' },
      { title: 'Grateful Today?', body: 'Tap to log what you are grateful for.' },
      { title: 'Gratitude Check-In', body: 'A moment to reflect. What are you grateful for today?' },
    ],
    mindful: [
      { title: 'Gratitude Moment', body: 'Take a quiet moment to notice what you are grateful for today.' },
      { title: 'A Grateful Pause', body: 'Whenever you are ready, log one thing you are grateful for.' },
      { title: 'Log Gratitude', body: 'A small moment of gratitude makes a difference. Tap when ready.' },
      { title: 'What Are You Grateful For?', body: 'Take a moment to reflect. Log it when you are ready.' },
      { title: 'Gratitude Today', body: 'A small pause to notice what is good. Tap to log it.' },
    ],
  },

  prayer: {
    discipline: [
      { title: 'Prayer Check-In', body: 'Log your prayer for today.' },
      { title: 'Prayer Log', body: 'You haven\'t logged your prayer today. Take a minute.' },
      { title: 'Daily Prayer', body: 'Log your prayer before the day ends.' },
      { title: 'Prayer Time', body: 'Your prayer hasn\'t been logged today. Keep the rhythm.' },
      { title: 'Pray and Log', body: 'Take a moment to pray and log it for today.' },
    ],
    balanced: [
      { title: 'Prayer Check-In', body: 'Don\'t forget your prayer check-in for today.' },
      { title: 'Prayer Moment', body: 'A few minutes for prayer today.' },
      { title: 'Daily Prayer', body: 'Your prayer check-in for today is waiting.' },
      { title: 'Check In', body: 'Tap to log your prayer for today.' },
      { title: 'Prayer Log', body: 'Your prayer for today hasn\'t been logged yet.' },
    ],
    mindful: [
      { title: 'Prayer Moment', body: 'Take a quiet moment for prayer today.' },
      { title: 'A Moment to Pray', body: 'Whenever you are ready, take a breath and pray.' },
      { title: 'Prayer Time', body: 'A gentle reminder to spend a moment in prayer today.' },
      { title: 'Quiet Prayer', body: 'Take a quiet moment whenever it feels right.' },
      { title: 'A Moment with God', body: 'No agenda. Just a quiet moment to pray when you are ready.' },
    ],
  },

  water: {
    discipline: [
      { title: 'Water Check', body: 'Stay on top of your hydration.' },
      { title: 'Hydration Alert', body: 'You are behind on water. Drink now.' },
      { title: 'Drink Water', body: 'You are falling behind your water pace. Catch up.' },
      { title: 'Water Pace', body: 'Behind on hydration. Get a glass in.' },
      { title: 'Hydration Check', body: 'Water pace is behind. Stay disciplined.' },
    ],
    balanced: [
      { title: 'Hydration Reminder', body: 'Time for some water.' },
      { title: 'Water Check', body: 'You are a bit behind on water today. Time to catch up.' },
      { title: 'Drink Up', body: 'Your water pace is a little behind. Grab a glass.' },
      { title: 'Hydration', body: 'Behind on water today. A glass or two will help.' },
      { title: 'Water Reminder', body: 'You are behind on your water goal. Drink up.' },
    ],
    mindful: [
      { title: 'Hydration Reminder', body: 'A good time to drink some water.' },
      { title: 'Drink Some Water', body: 'Your body could use some hydration right now.' },
      { title: 'Water Time', body: 'A gentle reminder to drink some water.' },
      { title: 'Stay Hydrated', body: 'How is your water today? A glass would do you good.' },
      { title: 'Hydration Check', body: 'Take a moment to drink some water. Your body will thank you.' },
    ],
  },

  // No default mindful pool: suppressed unless growth areas ON
  food_log: {
    discipline: [
      { title: 'Log Your Meals', body: 'Nothing logged today. Stay accountable.' },
      { title: 'Food Log Empty', body: 'Nothing in your log yet. Tap to add a meal.' },
      { title: 'Log Today\'s Food', body: 'No food logged today. Don\'t let the day slip.' },
      { title: 'Meals Not Logged', body: 'Today\'s log is empty. Track your meals.' },
    ],
    balanced: [
      { title: 'Food Log Reminder', body: 'You haven\'t logged anything today. Tap to add a meal.' },
      { title: 'Nothing Logged Yet', body: 'Your food log is empty today. Tap to add a meal.' },
      { title: 'Log Your Food', body: 'No meals logged yet today. A quick tap to add one.' },
      { title: 'Food Log', body: 'Your log is empty. Tap to add what you\'ve eaten today.' },
    ],
    mindfulGrowth: [
      { title: 'Check-In Time', body: 'Take a moment to check in with what you have eaten today.' },
      { title: 'Food Check-In', body: 'A gentle reminder to log what you have eaten today.' },
      { title: 'Mindful Logging', body: 'Whenever you are ready, take a moment to log your meals.' },
      { title: 'A Moment to Log', body: 'How has your eating been today? Log it when you are ready.' },
    ],
  },

  // No default mindful pool: suppressed unless growth areas ON
  activity: {
    discipline: [
      { title: 'Activity Goals Open', body: 'Activity goals not hit yet. Make it happen today.' },
      { title: 'Get Moving', body: 'Your activity goals are still open. Move today.' },
      { title: 'Activity Check', body: 'Active cals and exercise goals still open. Finish strong.' },
      { title: 'Move Today', body: 'Activity goals not closed yet. Get it done.' },
    ],
    balanced: [
      { title: 'Activity Reminder', body: 'Your activity goals aren\'t there yet. Time to move.' },
      { title: 'Move Today', body: 'Still some room to hit your activity goals today.' },
      { title: 'Activity Check-In', body: 'Activity goals still open. Even a short session counts.' },
      { title: 'Get Moving', body: 'Your active cal and exercise goals are still open today.' },
    ],
    mindfulGrowth: [
      { title: 'Movement Check', body: 'How has your movement been today?' },
      { title: 'A Moment to Move', body: 'How has your body felt today? Any movement is worth something.' },
      { title: 'Movement Today', body: 'A gentle nudge to move your body today. Whatever feels right.' },
      { title: 'Check In with Movement', body: 'How has movement felt today? Even a short walk counts.' },
    ],
  },

  // Placeholder: {VERSE} for verse text (body is always verse, title rotates)
  daily_verse: {
    discipline: [
      { title: 'Today\'s Verse', body: '{VERSE}' },
      { title: 'Word for Today', body: '{VERSE}' },
      { title: 'Scripture Today', body: '{VERSE}' },
      { title: 'Daily Verse', body: '{VERSE}' },
    ],
    balanced: [
      { title: 'Today\'s Message', body: '{VERSE}' },
      { title: 'A Word for Today', body: '{VERSE}' },
      { title: 'Today\'s Verse', body: '{VERSE}' },
      { title: 'Scripture', body: '{VERSE}' },
    ],
    mindful: [
      { title: 'A Word for Today', body: '{VERSE}' },
      { title: 'Today\'s Verse', body: '{VERSE}' },
      { title: 'A Quiet Word', body: '{VERSE}' },
      { title: 'Scripture Today', body: '{VERSE}' },
    ],
  },

  // No mindful pool: suppressed in Mindful always
  weight_log: {
    discipline: [
      { title: 'Log Your Weight', body: 'Track your weight to stay on top of your progress.' },
      { title: 'Weight Check', body: 'Log your weight today. The data matters.' },
      { title: 'Weight Log', body: 'Don\'t skip your weigh-in today.' },
      { title: 'Weigh In', body: 'Log your weight to keep your trend accurate.' },
    ],
    balanced: [
      { title: 'Weight Check', body: 'Don\'t forget to log your weight today.' },
      { title: 'Weigh In', body: 'A quick weigh-in today keeps your data current.' },
      { title: 'Weight Log', body: 'Your weight hasn\'t been logged today. Tap to add it.' },
      { title: 'Log Your Weight', body: 'A moment to log your weight. Keeps your trends on track.' },
    ],
  },

  // No default mindful pool: suppressed unless growth areas ON
  if_checkin: {
    discipline: [
      { title: 'Did You Start Eating?', body: 'You have food logged but your IF window isn\'t started. Tap to update.' },
      { title: 'IF Window Not Started', body: 'Food is logged but fasting window is open. Tap to start it.' },
      { title: 'Start Your Window', body: 'You have calories logged. Did you mean to start your eating window?' },
      { title: 'IF Check', body: 'Food logged, window not started. Tap to begin.' },
    ],
    balanced: [
      { title: 'IF Check-In', body: 'You have food logged but your IF window isn\'t started. Tap to update.' },
      { title: 'Eating Window', body: 'Looks like you\'ve eaten today but haven\'t started your window.' },
      { title: 'Start Your IF Window', body: 'Food is logged for today. Tap to start your eating window.' },
      { title: 'Window Not Started', body: 'You have food logged today. Want to open your eating window?' },
    ],
    mindfulGrowth: [
      { title: 'Gentle Check-In', body: 'Noticing you have food logged today. Did you want to start your eating window?' },
      { title: 'Eating Window', body: 'You have food logged. A good moment to check in on your eating window.' },
      { title: 'IF Window', body: 'Food is logged today. Tap to start your window when it feels right.' },
      { title: 'Check In', body: 'You\'ve eaten today. Want to open your fasting window when you are ready?' },
    ],
  },
};

// ── Copy Helpers ──────────────────────────────────────────────────────────────

const getPool = (pools: ModePools, mode: StyleMode, growthOn: boolean): CopyVariation[] => {
  if (mode === 'mindful') {
    if (growthOn && pools.mindfulGrowth) return pools.mindfulGrowth;
    if (pools.mindful) return pools.mindful;
    return pools.balanced;
  }
  return mode === 'balanced' ? pools.balanced : pools.discipline;
};

// Picks from pool using rotation index, advances index in-place.
const pickCopy = (
  key: string,
  pools: ModePools,
  mode: StyleMode,
  growthOn: boolean,
  rotation: Record<string, number>,
): CopyVariation => {
  const pool = getPool(pools, mode, growthOn);
  const idx = (rotation[key] ?? 0) % pool.length;
  rotation[key] = (idx + 1) % pool.length;
  return pool[idx];
};

const applyPlaceholders = (text: string, replacements: Record<string, string>): string => {
  let result = text;
  for (const [key, val] of Object.entries(replacements)) {
    result = result.split(`{${key}}`).join(val);
  }
  return result;
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

  const rotation = { ...settings.copyRotation };
  const v = pickCopy('if_window', COPY_POOLS.if_window, styleMode, false, rotation);
  const N = String(mins);

  await Notifications.scheduleNotificationAsync({
    identifier: `pj_if_window_${mins}`,
    content: {
      title: applyPlaceholders(v.title, { N }),
      body: applyPlaceholders(v.body, { N }),
      sound: true,
      data: { route: '/(tabs)/log', params: { scrollTo: 'if' } },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireDate },
  });

  await saveNotificationSettings({ ...settings, copyRotation: rotation });
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

export const cancelPrayerNotification = () =>
  Notifications.cancelScheduledNotificationAsync('pj_prayer').catch(() => {});

export const cancelIfCheckInNotification = () =>
  Notifications.cancelScheduledNotificationAsync('pj_if_checkin').catch(() => {});

export const rescheduleStreakProtection = async (): Promise<void> => {
  try {
    const s = await loadNotificationSettings();
    await Notifications.cancelScheduledNotificationAsync('pj_streak').catch(() => {});
    if (!s.masterEnabled || !s.streakProtection) return;

    const status = await getPermissionStatus();
    if (status !== 'granted') return;

    const settingsRaw = await AsyncStorage.getItem('pj_settings');
    const appSettings = settingsRaw ? JSON.parse(settingsRaw) : {};
    const m: StyleMode = appSettings.styleMode ?? 'balanced';
    const growthOn: boolean = appSettings.mindfulGrowthAreas === true;
    if (m === 'mindful' && !growthOn) return;

    const now = new Date();
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const nowMins = now.getHours() * 60 + now.getMinutes();

    const pjStreaksRaw = await AsyncStorage.getItem('pj_streaks');
    const pjStreaks = pjStreaksRaw ? JSON.parse(pjStreaksRaw) : {};

    const atRisk: { id: string; name: string; currentStreak: number }[] = [];
    const gratStreak = pjStreaks.gratitude?.currentStreak ?? 0;
    const gratLast = pjStreaks.gratitude?.lastLoggedDate ?? '';
    if (gratStreak > 0 && gratLast !== todayKey) {
      atRisk.push({ id: 'gratitude', name: 'Gratitude', currentStreak: gratStreak });
    }
    const streakConfig: any[] = pjStreaks.config ?? [];
    for (const item of streakConfig) {
      const current = pjStreaks.streakCounts?.[item.id]?.current ?? 0;
      const lastDate = pjStreaks.streakCounts?.[item.id]?.lastDate ?? '';
      if (current > 0 && lastDate !== todayKey) {
        atRisk.push({ id: item.id, name: item.label ?? item.name ?? 'Streak', currentStreak: current });
      }
    }
    if (atRisk.length === 0) return;

    const avgBedtime = await getAverageBedtime();
    let fireTimeStr = '21:00';
    if (avgBedtime) {
      const n = toNormalizedMins(avgBedtime);
      if (n !== null) {
        const offset = s.streakOffsetMins;
        const adjusted = ((n - offset) % 1440 + 1440) % 1440;
        fireTimeStr = `${Math.floor(adjusted / 60).toString().padStart(2, '0')}:${(adjusted % 60).toString().padStart(2, '0')}`;
      }
    }

    const { hour, minute } = parseTime(fireTimeStr);
    if (hour * 60 + minute <= nowMins) return;

    const rotation = { ...s.copyRotation };
    let title: string;
    let body: string;

    if (atRisk.length === 1) {
      const { name, currentStreak } = atRisk[0];
      const v = pickCopy('streak_single', COPY_POOLS.streak_single, m, growthOn, rotation);
      title = applyPlaceholders(v.title, { NAME: name, X: String(currentStreak) });
      body = applyPlaceholders(v.body, { NAME: name, X: String(currentStreak) });
    } else if (atRisk.length === 2) {
      const v = pickCopy('streak_double', COPY_POOLS.streak_double, m, growthOn, rotation);
      title = applyPlaceholders(v.title, { N1: atRisk[0].name, N2: atRisk[1].name });
      body = applyPlaceholders(v.body, { N1: atRisk[0].name, N2: atRisk[1].name });
    } else {
      const v = pickCopy('streak_multi', COPY_POOLS.streak_multi, m, growthOn, rotation);
      title = applyPlaceholders(v.title, { N: String(atRisk.length) });
      body = applyPlaceholders(v.body, { N: String(atRisk.length) });
    }

    const fireDate = new Date();
    fireDate.setHours(hour, minute, 0, 0);
    const streakRoute = atRisk.length === 1 && atRisk[0].id === 'gratitude'
      ? { route: '/(tabs)/faith', params: { scrollTo: 'gratitude' } }
      : { route: '/' };
    await Notifications.scheduleNotificationAsync({
      identifier: 'pj_streak',
      content: { title, body, sound: true, data: streakRoute },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireDate },
    });
    await saveNotificationSettings({ ...s, copyRotation: rotation });
  } catch {}
};

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
  // re-engagement chain (old single ID kept for backward compat cleanup)
  'pj_reengagement',
  'pj_reengagement_1',
  'pj_reengagement_2',
  'pj_reengagement_3',
  'pj_reengagement_w1',
  'pj_reengagement_w2',
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

  // Mutable rotation object — saved back to settings at the end.
  const rotation = { ...s.copyRotation };

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
        const v = pickCopy('streak_single', COPY_POOLS.streak_single, m, growthOn, rotation);
        title = applyPlaceholders(v.title, { NAME: name, X: String(currentStreak) });
        body = applyPlaceholders(v.body, { NAME: name, X: String(currentStreak) });
      } else if (atRisk.length === 2) {
        const v = pickCopy('streak_double', COPY_POOLS.streak_double, m, growthOn, rotation);
        title = applyPlaceholders(v.title, { N1: atRisk[0].name, N2: atRisk[1].name });
        body = applyPlaceholders(v.body, { N1: atRisk[0].name, N2: atRisk[1].name });
      } else {
        const v = pickCopy('streak_multi', COPY_POOLS.streak_multi, m, growthOn, rotation);
        title = applyPlaceholders(v.title, { N: String(atRisk.length) });
        body = applyPlaceholders(v.body, { N: String(atRisk.length) });
      }

      const streakRoute = atRisk.length === 1 && atRisk[0].id === 'gratitude'
        ? { route: '/(tabs)/faith', params: { scrollTo: 'gratitude' } }
        : { route: '/' };
      await scheduleOne('pj_streak', fireTimeStr, title, body, streakRoute, true);
    }
  }

  // ── P2: Build candidates in priority order ────────────────────────────────
  type P2Item = { id: string; time: string; title: string; body: string; data: Record<string, any> };
  const candidates: P2Item[] = [];

  // 1. Faith Reading
  if (s.categoryFaith && ctx.faithJourney !== 'notrightnow' && ctx.faithReadingPending) {
    const v = pickCopy('faith_reading', COPY_POOLS.faith_reading, m, growthOn, rotation);
    candidates.push({
      id: 'pj_faith_reading',
      time: '08:30',
      title: v.title,
      body: v.body,
      data: { route: '/plans' },
    });
  }

  // 2a. Gratitude (fires in both Mindful states)
  if (s.categoryFaith && ctx.faithJourney !== 'notrightnow' && !ctx.gratitudeLoggedToday) {
    const v = pickCopy('gratitude', COPY_POOLS.gratitude, m, growthOn, rotation);
    candidates.push({
      id: 'pj_gratitude',
      time: '19:00',
      title: v.title,
      body: v.body,
      data: { route: '/(tabs)/faith', params: { scrollTo: 'gratitude' } },
    });
  }

  // 2b. Prayer (fires in both Mindful states, Rooted only)
  if (s.categoryFaith && ctx.faithJourney === 'rooted' && !ctx.prayerLoggedToday) {
    const v = pickCopy('prayer', COPY_POOLS.prayer, m, growthOn, rotation);
    candidates.push({
      id: 'pj_prayer',
      time: s.prayerTime,
      title: v.title,
      body: v.body,
      data: { route: '/prayer' },
    });
  }

  // 4. Food Log Reminder (fixed 2pm, suppressed in default Mindful)
  if (s.categoryFitness && ctx.todayFoodEntries === 0 && (!isMindful || growthOn)) {
    const v = pickCopy('food_log', COPY_POOLS.food_log, m, growthOn, rotation);
    candidates.push({
      id: 'pj_food_log',
      time: '14:00',
      title: v.title,
      body: v.body,
      data: { route: '/(tabs)/log' },
    });
  }

  // 5. Activity Reminder (both active-cal goal and exercise-mins goal not yet hit)
  if (s.categoryFitness && !(ctx.todayActiveCals >= ctx.activeCalGoal && ctx.todayExerciseMins >= ctx.exerciseMinsGoal) && (!isMindful || growthOn)) {
    const v = pickCopy('activity', COPY_POOLS.activity, m, growthOn, rotation);
    candidates.push({
      id: 'pj_activity',
      time: s.activityTime,
      title: v.title,
      body: v.body,
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
    const verseBody = ctx.todayVerseText ? ctx.todayVerseText.slice(0, 120) : "Today's verse is ready. Open to read.";
    const v = pickCopy('daily_verse', COPY_POOLS.daily_verse, m, growthOn, rotation);
    candidates.push({
      id: 'pj_daily_verse',
      time: verseTime,
      title: v.title,
      body: applyPlaceholders(v.body, { VERSE: verseBody }),
      data: ctx.todayVerseRef ? { route: '/bible', params: { verseRef: ctx.todayVerseRef } } : { route: '/bible' },
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
      const v = pickCopy('weight_log', COPY_POOLS.weight_log, m, growthOn, rotation);
      candidates.push({
        id: 'pj_weight_log',
        time: '07:30',
        title: v.title,
        body: v.body,
        data: { route: '/', params: { scrollTo: 'weight' } },
      });
    }
  }

  // 8. IF Check-In (food logged, IF enabled but not started, suppressed default Mindful)
  if (s.categoryFasting && ctx.ifEnabled && !ctx.ifStarted && ctx.todayFoodEntries > 0 && (!isMindful || growthOn)) {
    const v = pickCopy('if_checkin', COPY_POOLS.if_checkin, m, growthOn, rotation);
    candidates.push({
      id: 'pj_if_checkin',
      time: '13:00',
      title: v.title,
      body: v.body,
      data: { route: '/(tabs)/log', params: { scrollTo: 'if' } },
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

      // Skip this slot if the user is already on pace (within 25% of expected at fire time).
      // Expected pace is linear from wake to bedtime. Check is at schedule time using current water.
      if (ctx.waterGoal > 0) {
        const slotProgress = offsetMins / wakingTotal;
        const expectedAtSlot = ctx.waterGoal * slotProgress;
        if (ctx.todayWater >= expectedAtSlot * 0.75) continue;
      }

      const fireDate = new Date();
      fireDate.setHours(fh, fm, 0, 0);
      const v = pickCopy('water', COPY_POOLS.water, m, growthOn, rotation);
      await Notifications.scheduleNotificationAsync({
        identifier: `pj_water_${i}`,
        content: {
          title: v.title,
          body: v.body,
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
      const v = pickCopy('weekly_summary', COPY_POOLS.weekly_summary, m, growthOn, rotation);
      await Notifications.scheduleNotificationAsync({
        identifier: 'pj_weekly_summary',
        content: {
          title: v.title,
          body: v.body,
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
      const v = pickCopy('monthly_summary', COPY_POOLS.monthly_summary, m, growthOn, rotation);
      await Notifications.scheduleNotificationAsync({
        identifier: 'pj_monthly_summary',
        content: {
          title: v.title,
          body: v.body,
          sound: true,
          data: { route: '/monthly-summary' },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireDate },
      });
    }
  }

  // ── Always-on: Re-engagement chain ───────────────────────────────────────
  // First 3 fires at 48h / 96h / 144h from last app open.
  // After that, weekly indefinitely (pre-scheduled 2 weeks out).
  // All cancelled and rescheduled fresh on every app open.
  if (s.reengagementEnabled) {
    const HOUR = 60 * 60 * 1000;
    const reengagementFires = [
      { id: 'pj_reengagement_1', delay: 48 * HOUR },
      { id: 'pj_reengagement_2', delay: 96 * HOUR },
      { id: 'pj_reengagement_3', delay: 144 * HOUR },
      { id: 'pj_reengagement_w1', delay: 144 * HOUR + 7 * 24 * HOUR },
      { id: 'pj_reengagement_w2', delay: 144 * HOUR + 14 * 24 * HOUR },
    ];

    for (const fire of reengagementFires) {
      const v = pickCopy('reengagement', COPY_POOLS.reengagement, m, growthOn, rotation);
      await Notifications.scheduleNotificationAsync({
        identifier: fire.id,
        content: {
          title: v.title,
          body: v.body,
          sound: true,
          data: { route: '/' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(Date.now() + fire.delay),
        },
      });
    }
  }

  // Persist updated rotation indices so pools advance on next schedule run.
  await saveNotificationSettings({ ...s, copyRotation: rotation });
};

// ── Live-refresh helpers (called on every app foreground) ─────────────────────

export const scheduleWaterNotificationsNow = async (
  todayWater: number,
  waterGoal: number,
  styleMode: StyleMode,
  mindfulGrowthAreas: boolean,
) => {
  await cancelWaterNotifications();
  const s = await loadNotificationSettings();
  if (!s.masterEnabled || !s.categoryFitness || s.waterCount <= 0) return;
  const status = await getPermissionStatus();
  if (status !== 'granted') return;

  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const rotation = { ...s.copyRotation };

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

    if (waterGoal > 0) {
      const slotProgress = offsetMins / wakingTotal;
      const expectedAtSlot = waterGoal * slotProgress;
      if (todayWater >= expectedAtSlot * 0.75) continue;
    }

    const fireDate = new Date();
    fireDate.setHours(fh, fm, 0, 0);
    const v = pickCopy('water', COPY_POOLS.water, styleMode, mindfulGrowthAreas, rotation);
    await Notifications.scheduleNotificationAsync({
      identifier: `pj_water_${i}`,
      content: { title: v.title, body: v.body, sound: true, data: { route: '/', params: { scrollTo: 'water' } } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireDate },
    });
  }

  await saveNotificationSettings({ ...s, copyRotation: rotation });
};

export const scheduleActivityNotificationNow = async (
  todayActiveCals: number,
  activeCalGoal: number,
  todayExerciseMins: number,
  exerciseMinsGoal: number,
  styleMode: StyleMode,
  mindfulGrowthAreas: boolean,
) => {
  await cancelActivityNotification();
  const s = await loadNotificationSettings();
  if (!s.masterEnabled || !s.categoryFitness) return;
  const isMindful = styleMode === 'mindful';
  if (isMindful && !mindfulGrowthAreas) return;
  const status = await getPermissionStatus();
  if (status !== 'granted') return;

  const bothGoalsHit = todayActiveCals >= activeCalGoal && todayExerciseMins >= exerciseMinsGoal;
  if (bothGoalsHit) return;

  const now = new Date();
  const { hour: actH, minute: actM } = parseTime(s.activityTime);
  if (actH * 60 + actM <= now.getHours() * 60 + now.getMinutes()) return;

  const fireDate = new Date();
  fireDate.setHours(actH, actM, 0, 0);
  const rotation = { ...s.copyRotation };
  const v = pickCopy('activity', COPY_POOLS.activity, styleMode, mindfulGrowthAreas, rotation);

  await Notifications.scheduleNotificationAsync({
    identifier: 'pj_activity',
    content: { title: v.title, body: v.body, sound: true, data: { route: '/(tabs)/workout' } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireDate },
  });

  await saveNotificationSettings({ ...s, copyRotation: rotation });
};
