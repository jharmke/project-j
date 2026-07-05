// Conditional PR context for Otto. The full lift-PR list is NOT baked into every request (that would
// cost tokens on every message and grow unbounded). Instead the client detects when a message is about
// PRs and, only then, attaches the user's complete (history-backed) PR list to that one request's data
// snapshot. Otto then does the fuzzy lift-name matching itself ("bench" -> "Bench Press", typos and all).
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PRRecord, SetEntry, DayProgram } from '../workoutData';
import { liftSessionHistory, type ResolveDay } from './liftPR';

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const fmtDate = (dk: string) => {
  try { return new Date(dk + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return dk; }
};

// Coarse, GENEROUS intent check: does this message look like a PR question? Fires on generic PR words
// OR any of the user's actual lift names (or a distinctive word from one). Errs toward including; a
// false positive just wastes a few tokens on that message, never a wrong answer. Not case-sensitive.
export const messageWantsPRs = (text: string, liftNames: string[]): boolean => {
  const t = (text || '').toLowerCase();
  if (/\b(prs?|records?|1\s?rm|1[ -]?rep[ -]?max|one[ -]?rep[ -]?max|rep max|heaviest|max (?:lift|weight)|personal (?:best|record)|strongest|best (?:lift|set))\b/.test(t)) return true;
  for (const name of liftNames) {
    const n = (name || '').toLowerCase().trim();
    if (!n) continue;
    if (t.includes(n)) return true;
    for (const w of n.split(/\s+/)) if (w.length >= 4 && t.includes(w)) return true;
  }
  return false;
};

// If the message is about lift PRs, return a snapshot block of ALL the user's history-backed PRs for
// Otto's context; otherwise null (nothing attached). Reuses the PR home's ghost filter so a record from
// a deleted workout is never cited.
export const buildPRContextIfRelevant = async (message: string): Promise<string | null> => {
  let state: any = null;
  try { const raw = await AsyncStorage.getItem('pj_workout_state'); state = raw ? JSON.parse(raw) : null; } catch { return null; }
  if (!state) return null;

  const prs: Record<string, PRRecord> = state.prs || {};
  const setLogs: Record<string, Record<string, SetEntry[]>> = state.setLogs || {};
  const programs: Record<string, DayProgram> = state.programs || {};
  const template: Record<string, DayProgram> = state.weeklyTemplate || {};
  const resolveDay: ResolveDay = (dk) => (programs[dk] || template[WEEKDAY[new Date(dk + 'T12:00:00').getDay()]])?.exercises || [];

  // Backed PRs only (surviving logged history), most-recently-hit first. ALL of them (not a shortlist).
  const backed = Object.values(prs)
    .filter(p => p && (p.bestWeight || p.bestE1RM) && liftSessionHistory(p.name, setLogs, resolveDay).length > 0)
    .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  if (!backed.length) return null;

  if (!messageWantsPRs(message, backed.map(p => p.name))) return null;

  const lines = backed.map(p => {
    const parts: string[] = [];
    if (p.bestWeight) parts.push(`heaviest set ${p.bestWeight.value} lb x ${p.bestWeight.reps}`);
    if (p.bestE1RM) parts.push(`estimated 1-rep max ${p.bestE1RM.value} lb`);
    const dateKey = p.bestWeight?.dateKey || p.bestE1RM?.dateKey || p.updatedAt;
    return `- ${p.name}: ${parts.join('; ')}${dateKey ? ` (set ${fmtDate(dateKey)})` : ''}`;
  });

  // The full set of REAL exercise names for THIS user, so Otto can tell a real lift with no PR yet
  // ("Cable Press") from a made-up one ("Push Button") instead of implying it exists. Unioned live from
  // every source so nothing is missed: the Library catalog, everything scheduled/logged in their programs
  // + weekly template (catches routine "quick add" customs that never hit the Library), and their PRs.
  let libraryNames: string[] = [];
  try {
    const rawLib = await AsyncStorage.getItem('pj_exercise_library');
    const lib = rawLib ? JSON.parse(rawLib) : [];
    if (Array.isArray(lib)) libraryNames = lib.map((e: any) => e?.name).filter((n: any): n is string => typeof n === 'string' && !!n.trim());
  } catch {}
  const scheduledNames: string[] = [];
  for (const map of [programs, template]) {
    for (const day of Object.values(map || {})) {
      for (const ex of ((day as any)?.exercises || [])) {
        if (ex?.name && typeof ex.name === 'string' && ex.name.trim()) scheduledNames.push(ex.name);
      }
    }
  }
  const known = Array.from(new Set([...libraryNames, ...scheduledNames, ...backed.map(p => p.name)]));

  // Recent per-lift history for any lift the user actually NAMED, so Otto can talk trends ("how's my
  // bench trending"). Bounded: only the mentioned lift(s), last 8 sessions each.
  const lc = (message || '').toLowerCase();
  const historyLines: string[] = [];
  for (const p of backed) {
    const n = p.name.toLowerCase();
    const named = lc.includes(n) || n.split(/\s+/).some(w => w.length >= 4 && lc.includes(w));
    if (!named) continue;
    const sessions = liftSessionHistory(p.name, setLogs, resolveDay).slice(0, 8);
    if (!sessions.length) continue;
    historyLines.push(`- ${p.name} (newest first): ${sessions.map(h => `${fmtDate(h.dateKey)} ${h.topWeight} lb x ${h.topReps}`).join(', ')}`);
  }

  const out: string[] = [
    "LIFT PRs (the user's all-time personal records, from their own logged workouts). State these EXACTLY",
    "as given; never round or invent a number. Estimated 1-rep max is calculated from a real set (Epley).",
    ...lines,
    "",
    "REAL EXERCISES FOR THIS USER (their full library plus everything they have logged or scheduled; this",
    "is the complete list of exercises that actually exist for them):",
    known.join(', '),
  ];
  if (historyLines.length) {
    out.push(
      "",
      "RECENT SESSIONS for the lift(s) the user named (newest first; each entry is that day's top set). Use",
      "these to describe how a lift is trending or progressing if they ask. Do not invent sessions.",
      ...historyLines,
    );
  }
  out.push(
    "",
    "How to answer:",
    "- Exercise is in the LIFT PRs list -> give its exact numbers, matching the user's wording to the right lift.",
    "- Exercise is in the real-exercises list but NOT in the PRs list -> they have not logged a PR for it yet; point them to the PR home (Exercise Library, PRs button).",
    "- Exercise is NOT in the real-exercises list at all -> tell them you don't recognize it as one of their exercises. Do NOT imply it exists or that they might have logged it, and do NOT tell them to go check the library for it.",
    "Never guess or invent a value.",
  );
  return out.join('\n');
};
