// Conditional RECENT-WORKOUT context for Otto (on-demand data, dataset #2 -- same pattern as
// utils/companionPRs.ts). The user's training history is NOT baked into every request; instead the client
// detects when a message is about recent workouts / training days / set counts and, only then, attaches a
// compact summary of the user's actual logged sessions to that one request's data snapshot.
//
// Bounding is by TIME + a character budget, never a session count: some users log 3-4 activities a day
// (lift + core + a couple dog walks). We include the full last 30 days, keep entries compact, and if a
// heavy logger would blow the budget we trim from the OLDEST end only -- so this week / yesterday / the
// last chest day are always intact, and only the tail of the month is ever dropped.
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SetEntry, DayProgram, Exercise } from '../workoutData';
import { weightUnitLabel } from '../workoutData';

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WINDOW_DAYS = 30;
const CHAR_BUDGET = 7000; // ceiling on the whole block; oldest days trimmed first if a mega-logger exceeds it

const pad = (n: number) => String(n).padStart(2, '0');
const keyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fmtDate = (dk: string) => {
  try { return new Date(dk + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
  catch { return dk; }
};

// Generic DAY-RECALL detector, SHARED across on-demand datasets. Fires on a broad past-day question with
// NO explicit dimension word ("what did I do on June 24 / yesterday / Monday / the 24th / this week"). It's
// really a whole-day ask, so every dataset (workouts, food, sleep, ...) hooks into it: each attaches its
// own slice, and Otto answers what it has + points to the Calendar for the rest. Errs toward attaching --
// a false positive is a few tokens; a false negative is Otto claiming it can't see a day it actually can.
export const isDayRecall = (text: string): boolean => {
  const t = (text || '').toLowerCase();
  const dayRef = /\b(yesterday|today|tonight|last night|this morning|monday|tuesday|wednesday|thursday|friday|saturday|sunday|weekend)\b/.test(t)
    || /\b(this|last|past)\s+(week|weekend|month)\b/.test(t)
    || /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s*\d{0,2}\b/.test(t)
    || /\b\d{1,2}(?:st|nd|rd|th)\b/.test(t)
    || /\b\d{1,2}\/\d{1,2}\b/.test(t);
  if (!dayRef) return false;
  // Full phrasing ("what did I do on June 24"), a verb-less conversational follow-up ("what about July 2",
  // "how about Monday", "and July 3?"), or a short / bare date reference ("July 2?"). Follow-ups carry the
  // intent from the prior turn but drop the verb, so requiring one silently dropped them.
  const followUpLead = /\b(what about|how about|whatabout|and (?:on\s+)?|about|what'?s|how'?s|hows|show me|tell me about)\b/.test(t);
  const shortMsg = t.trim().split(/\s+/).length <= 5;
  // ⚠️ "HOW WAS MY DAY ON TUESDAY" USED TO FALL THROUGH ALL THREE: six words, no "what", and "how was" is
  // not "how's". Found on device 2026-08-01. It matters well beyond the jump button -- this same detector
  // decides whether a SUPPORTER gets that day's data attached, so the phrasing was silently costing paying
  // users their answer.
  const howWas = /\bhow (was|were|did|has)\b/.test(t);
  return (/\bwhat\b/.test(t) && /\b(did|do|done|was|were|happen)\b/.test(t)) || followUpLead || shortMsg || howWas;
};

// Coarse, GENEROUS intent check: does this message look like it's asking about recent workouts / training
// days / set counts? Errs toward including (a false positive just wastes a few tokens on that message).
export const messageWantsRecentWorkouts = (text: string): boolean => {
  const t = (text || '').toLowerCase();
  const activity = /\b(workouts?|train(?:ed|ing)?|sessions?|gym|lift(?:ed|ing|s)?|exercises?d?|cardio|ran|run(?:ning)?|walk(?:ed|ing|s)?|jog(?:ged|ging)?|swim|swam|cycl(?:e|ed|ing)|class|routines?)\b/;
  const timeOrAsk = /\b(did|do(?:ing)?|done|last|recent(?:ly)?|this week|past week|yesterday|today|log(?:ged)?|how many|how much|sets?|reps?|volume|been|lately|week|days?|when|what)\b/;
  if (activity.test(t) && timeOrAsk.test(t)) return true;
  // "last chest day" / "how many leg days" style: a body part + a training/day word.
  const bodyPart = /\b(chest|back|legs?|shoulders?|arms?|biceps?|triceps?|glutes?|abs|core|quads?|hamstrings?|calves|push|pull)\b/;
  if (bodyPart.test(t) && /\b(day|last|recent|when|did|do|workout|train|session|sets?|hit)\b/.test(t)) return true;
  // "how many X sets / times this week"
  if (/how many\b.*\b(sets?|reps?|times|workouts?|sessions?)\b/.test(t)) return true;
  // a weekday reference paired with an activity word
  if (/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/.test(t)
      && /\b(workout|train|did|do|gym|lift|cardio|run|walk|exercise)\b/.test(t)) return true;
  // Shared whole-day recall ("what did I do on June 24") -> attach the training slice too.
  if (isDayRecall(t)) return true;
  return false;
};

// If the message is about recent workouts, return a compact block of the user's actual logged sessions over
// the last 30 days (newest first) for Otto's context; otherwise null (nothing attached).
export const buildWorkoutContextIfRelevant = async (message: string): Promise<string | null> => {
  if (!messageWantsRecentWorkouts(message || '')) return null;

  let state: any = null;
  try { const raw = await AsyncStorage.getItem('pj_workout_state'); state = raw ? JSON.parse(raw) : null; } catch { return null; }
  if (!state) return null;

  const setLogs: Record<string, Record<string, SetEntry[]>> = state.setLogs || {};
  const checks: Record<string, Record<string, boolean>> = state.checks || {};
  const programs: Record<string, DayProgram> = state.programs || {};
  const template: Record<string, DayProgram> = state.weeklyTemplate || {};
  const notes: Record<string, string> = state.workoutNotes || {};

  const today = new Date();
  const todayKey = keyOf(today);
  // Start of the current week = most recent Sunday (matches the app's Sun-indexed weekday convention), so
  // "this week" counting is unambiguous. Stated explicitly in the block for Otto.
  const weekStart = new Date(today); weekStart.setDate(today.getDate() - today.getDay());
  const weekStartKey = keyOf(weekStart);

  // Walk today -> 30 days back, newest first. A day is included only if something was actually completed
  // (a done lift set or a checked-off cardio); planned-but-not-done exercises are omitted.
  const entries: { text: string }[] = [];
  for (let i = 0; i < WINDOW_DAYS; i++) {
    const d = new Date(today); d.setDate(today.getDate() - i);
    const dk = keyOf(d);
    const prog = programs[dk] || template[WEEKDAY[d.getDay()]];
    const exercises: Exercise[] = prog?.exercises || [];
    if (!exercises.length) continue;
    const dayLogs = setLogs[dk] || {};
    const dayChecks = checks[dk] || {};

    const lines: string[] = [];
    for (const ex of exercises) {
      if (ex.isCardio) {
        if (!dayChecks[ex.id]) continue; // only completed cardio/walks/classes
        const parts: string[] = [];
        if (ex.duration) parts.push(String(ex.duration));
        if (ex.distance) parts.push(`${ex.distance} mi`);
        if (ex.calories) parts.push(`${ex.calories} cal`);
        if (ex.hr) parts.push(`${ex.hr} bpm`);
        lines.push(`  - ${ex.name || 'Cardio'}${parts.length ? `: ${parts.join(', ')}` : ' (done)'}`);
      } else {
        const done = (dayLogs[ex.id] || []).filter(s => s.done && (s.reps || 0) > 0);
        if (!done.length) continue;
        let top: SetEntry | null = null;
        for (const s of done) {
          const w = s.weight || 0, r = s.reps || 0;
          if (!top || w > (top.weight || 0) || (w === (top.weight || 0) && r > (top.reps || 0))) top = s;
        }
        const topStr = top ? ((top.weight || 0) > 0 ? `${top.weight} ${weightUnitLabel(ex.weightUnit)} x ${top.reps}` : `${top.reps} reps`) : '';
        lines.push(`  - ${ex.name || 'Lift'}: ${done.length} set${done.length === 1 ? '' : 's'}${topStr ? `, top ${topStr}` : ''}`);
      }
    }
    if (!lines.length) continue;

    const focus = (prog?.customLabel || prog?.focus || prog?.muscles || '').trim();
    const noteRaw = (notes[dk] || '').trim();
    const dayLabel = `${WEEKDAY_LONG[d.getDay()]} ${fmtDate(dk)}`
      + (dk === todayKey ? ' (today)' : '')
      + (dk >= weekStartKey ? ' [this week]' : '');
    const head = `${dayLabel}${focus ? ` - ${focus}` : ''}:`;
    const noteLine = noteRaw ? `\n  note: ${noteRaw.length > 160 ? noteRaw.slice(0, 160) + '…' : noteRaw}` : '';
    entries.push({ text: `${head}\n${lines.join('\n')}${noteLine}` });
  }

  if (!entries.length) return null;

  // Budget trim: entries are newest-first, so keep from the front and drop the OLDEST that overflow.
  const kept: string[] = [];
  let size = 0;
  for (const e of entries) {
    if (kept.length > 0 && size + e.text.length > CHAR_BUDGET) break;
    kept.push(e.text);
    size += e.text.length + 1;
  }
  const dropped = entries.length - kept.length;

  const out: string[] = [
    `RECENT WORKOUTS (the user's actual logged training over the last ${WINDOW_DAYS} days, newest first).`,
    `Today is ${WEEKDAY_LONG[today.getDay()]} ${fmtDate(todayKey)}. "This week" means on or after ${fmtDate(weekStartKey)} (days marked [this week]).`,
    `Each lift line = sets completed that day + that day's top (heaviest) set. Cardio / walks / classes / other`,
    `= what was logged. Only completed activity is listed. State these EXACTLY; never invent a day, set, or number.`,
    ...kept.map(k => `\n${k}`),
  ];
  if (dropped > 0) {
    out.push(`\n(${dropped} older session-day${dropped === 1 ? '' : 's'} within the 30-day window omitted to save space.)`);
  }
  out.push(
    '',
    'How to answer:',
    '- "What did I do [yesterday / last chest day / on Monday]" -> read the matching day above and list it. "Last chest day" = the most recent day whose focus label or exercises match that muscle.',
    '- "How many [lift] sets this week" -> add up the set counts for that lift across the days marked [this week].',
    '- If nothing above matches what they asked, say you don\'t see it in their last 30 days of logs. Do NOT invent it.',
  );
  return out.join('\n');
};
