// Conditional SLEEP + RECOVERY context for Otto (on-demand dataset #4 -- same pattern as companionFood /
// companionWorkouts). The always-on snapshot (companionStats) already carries LAST NIGHT + 7-night
// AVERAGES for sleep score / duration / deep sleep and the latest recovery signals, so this fills the two
// gaps that snapshot can't: (1) a SPECIFIC past night ("how did I sleep Tuesday", "HRV on Monday"), and
// (2) a night-by-night TREND. Attached only when a message is about sleep/recovery or is a whole-day recall.
//
// Numbers come from the app's OWN exclusion-aware loader (loadWindowDays), so they are identical to what the
// app / Sleep + Recovery coaches show. Two tiers:
//   Tier 1  per-night line for the last 30 days: sleep score, duration, deep sleep, + recovery score / HRV /
//           RHR when present. Oldest-first budget trim, [this week] marked.
//   Tier 2  a NAMED night's full stage breakdown (deep / REM / core) + all recovery signals, from the raw
//           day record -- attached only when the user names a specific night.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildEngineContext, loadWindowDays, type WindowDay, type EngineContext } from './smartTipsEngine';
import { isDayRecall } from './companionWorkouts';
import { resolveNamedDays } from './companionFood';

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WINDOW_DAYS = 30;
const CHAR_BUDGET = 7000;
const MAX_NAMED_NIGHTS = 2;

const pad = (n: number) => String(n).padStart(2, '0');
const keyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const r0 = (n: number) => Math.round(n);
const r1 = (n: number) => Math.round(n * 10) / 10;
const fmtShort = (dk: string) => {
  try { return new Date(dk + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
  catch { return dk; }
};
// hours (float) -> "7h 20m"
const fmtHours = (h: number): string => {
  const total = Math.round(h * 60); const hh = Math.floor(total / 60); const mm = total % 60;
  return mm === 0 ? `${hh}h` : `${hh}h ${mm}m`;
};
// milliseconds -> "1h 30m" (sleep-stage durations are stored in ms)
const fmtMs = (ms: number): string => {
  const total = Math.round(ms / 60000); const hh = Math.floor(total / 60); const mm = total % 60;
  return hh > 0 ? (mm === 0 ? `${hh}h` : `${hh}h ${mm}m`) : `${mm}m`;
};

// Sleep / recovery words, OR the shared whole-day recall ("what did I do on June 24"). Generous: a false
// positive costs a few tokens, a false negative reads as "I don't have that."
export const messageWantsSleep = (text: string): boolean => {
  const t = (text || '').toLowerCase();
  const sleep = /\b(sleep|slept|sleeping|asleep|rest(?:ed|ing)?|rem|deep sleep|core sleep|nap(?:ped|s)?|bed|bedtime|wake|woke|awake|recovery|recover(?:ed|ing)?|hrv|heart rate variability|resting (?:heart|hr)|rhr|respirat|breathing rate|blood oxygen|spo2|readiness)\b/;
  const ask = /\b(did|do|had|have|how|what|when|last night|yesterday|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday|this week|last week|score|hours?|average|avg|been|trend|quality)\b/;
  if (sleep.test(t) && ask.test(t)) return true;
  return isDayRecall(t);
};

const loadThirtyNights = async (todayKey: string, ctx: EngineContext, ws: any, cutoffKey: string): Promise<WindowDay[]> => {
  const seen = new Set<string>();
  const all: WindowDay[] = [];
  for (const off of [0, 14, 28]) {
    let chunk: WindowDay[] = [];
    try { chunk = await loadWindowDays(todayKey, ctx, ws, off); } catch { chunk = []; }
    for (const d of chunk) {
      if (seen.has(d.dateKey)) continue;
      seen.add(d.dateKey);
      // A night "counts" if it has a sleep score OR any recovery data.
      const hasSleep = d.sleepScore !== null || d.sleepHours !== null || d.recoveryScore !== null;
      if (d.dateKey >= cutoffKey && hasSleep) all.push(d);
    }
  }
  return all.sort((a, b) => (a.dateKey < b.dateKey ? 1 : a.dateKey > b.dateKey ? -1 : 0)); // newest first
};

// Full stage + recovery-signal detail for one named night, from the raw day record.
const detailNight = async (dayKey: string): Promise<string | null> => {
  let day: any = null;
  try { const raw = await AsyncStorage.getItem(`pj_${dayKey}`); day = raw ? JSON.parse(raw) : null; } catch { return null; }
  if (!day) return null;
  const parts: string[] = [];
  const st = day.sleepStages;
  if (st && (st.deep || st.rem || st.core)) {
    const stageStrs: string[] = [];
    if (st.deep) stageStrs.push(`deep ${fmtMs(st.deep)}`);
    if (st.rem) stageStrs.push(`REM ${fmtMs(st.rem)}`);
    if (st.core) stageStrs.push(`core ${fmtMs(st.core)}`);
    const totalStr = st.totalMs ? ` (total ${fmtMs(st.totalMs)})` : '';
    parts.push(`stages: ${stageStrs.join(', ')}${totalStr}`);
  }
  const sig = day.recoverySignals;
  if (sig) {
    const sigStrs: string[] = [];
    if (sig.hrv != null) sigStrs.push(`HRV ${r1(sig.hrv)} ms`);
    if (sig.rhr != null) sigStrs.push(`RHR ${r0(sig.rhr)} bpm`);
    if (sig.resp != null) sigStrs.push(`respiratory ${r1(sig.resp)} brpm`);
    if (sig.spo2 != null) sigStrs.push(`blood oxygen ${r0(sig.spo2)}%`);
    if (sigStrs.length) parts.push(`recovery signals: ${sigStrs.join(', ')}`);
  }
  if (!parts.length) return null;
  const dow = WEEKDAY_LONG[new Date(dayKey + 'T12:00:00').getDay()];
  return `${dow} ${fmtShort(dayKey)}: ${parts.join(' | ')}`;
};

export const buildSleepContextIfRelevant = async (message: string): Promise<string | null> => {
  if (!messageWantsSleep(message || '')) return null;

  const today = new Date();
  const todayKey = keyOf(today);
  const cutoff = new Date(today); cutoff.setDate(today.getDate() - (WINDOW_DAYS - 1));
  const cutoffKey = keyOf(cutoff);
  const weekStart = new Date(today); weekStart.setDate(today.getDate() - today.getDay());
  const weekStartKey = keyOf(weekStart);

  let ctx: EngineContext;
  try { ctx = await buildEngineContext(todayKey); } catch { return null; }
  let ws: any = null;
  try { const raw = await AsyncStorage.getItem('pj_workout_state'); ws = raw ? JSON.parse(raw) : null; } catch {}

  const nights = await loadThirtyNights(todayKey, ctx, ws, cutoffKey);
  if (!nights.length) return null;

  // Tier 1: per-night line, newest first, oldest trimmed to fit the budget.
  const lines: string[] = [];
  let size = 0, dropped = 0;
  for (const d of nights) {
    const label = `${WEEKDAY[new Date(d.dateKey + 'T12:00:00').getDay()]} ${fmtShort(d.dateKey)}`
      + (d.dateKey === todayKey ? ' (last night)' : '')
      + (d.dateKey >= weekStartKey ? ' [this week]' : '');
    const sleepParts: string[] = [];
    if (d.sleepScore !== null) sleepParts.push(`sleep score ${r0(d.sleepScore)}`);
    if (d.sleepHours !== null) sleepParts.push(fmtHours(d.sleepHours));
    if (d.deepSleepPct !== null) sleepParts.push(`deep ${fmtMs(d.deepSleepPct)}`);
    const recParts: string[] = [];
    if (d.recoveryScore !== null) recParts.push(`recovery ${r0(d.recoveryScore)}`);
    if (d.recoverySignals?.hrv != null) recParts.push(`HRV ${r1(d.recoverySignals.hrv)} ms`);
    if (d.recoverySignals?.rhr != null) recParts.push(`RHR ${r0(d.recoverySignals.rhr)} bpm`);
    const segs = [sleepParts.join(', '), recParts.join(', ')].filter(Boolean).join(' | ');
    const line = `- ${label}: ${segs || 'no detail'}`;
    if (lines.length > 0 && size + line.length > CHAR_BUDGET) { dropped = nights.length - lines.length; break; }
    lines.push(line);
    size += line.length + 1;
  }

  // Tier 2: full stage + signal detail for any night the user named. "Last night" / "tonight" isn't a date
  // the shared resolver knows, but for SLEEP it means today's wake-day record, so map it here.
  const lc = (message || '').toLowerCase();
  const namedRaw = resolveNamedDays(lc, today);
  if (/\b(last night|last nite|tonight)\b/.test(lc)) namedRaw.unshift(todayKey);
  const named = Array.from(new Set(namedRaw)).filter(k => k >= cutoffKey && k <= todayKey).slice(0, MAX_NAMED_NIGHTS);
  const detailBlocks: string[] = [];
  for (const k of named) {
    const block = await detailNight(k);
    if (block) detailBlocks.push(block);
  }

  const out: string[] = [
    `SLEEP + RECOVERY (the user's actual logged nights, last ${WINDOW_DAYS} days, newest first). Each line is`,
    `one night; today's row is last night. "This week" = on or after ${fmtShort(weekStartKey)} (marked [this`,
    `week]). Deep sleep is a duration. These match the app's Sleep + Recovery screens exactly; quote them`,
    `verbatim. The always-on snapshot already has last night + 7-night averages, so use THIS for a SPECIFIC`,
    `past night or a night-by-night trend. Never invent a night or a value.`,
    '',
    ...lines,
  ];
  if (dropped > 0) out.push(`(${dropped} older night${dropped === 1 ? '' : 's'} within 30 days omitted to save space.)`);
  if (detailBlocks.length) {
    out.push('', 'NIGHT DETAIL for the night(s) the user named (full stages + recovery signals):', ...detailBlocks.map(b => `  ${b}`));
  }
  out.push(
    '',
    'How to answer:',
    '- One night ("how did I sleep Tuesday", "HRV on Monday") -> read that night\'s line; if a NIGHT DETAIL block is present for it, use those stages/signals. State the number cleanly, do not volunteer the 7-night average unless asked.',
    '- Trend / aggregate ("how has my sleep been this week", "average recovery") -> compute from the lines / [this week] nights.',
    '- A night NOT shown is older than 30 days or had no sleep/recovery data -> say so plainly; a night with no watch data means recovery/stages were not recorded (needs a wearable worn overnight). Never invent it.',
    'Sleep + recovery scores, stages, HRV/RHR come from a wearable worn overnight; if the user has none logged, explain that warmly rather than implying the app is broken.',
  );
  return out.join('\n');
};
