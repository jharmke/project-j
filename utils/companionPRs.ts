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

  return [
    "LIFT PRs (the user's all-time personal records, from their own logged workouts). State these EXACTLY",
    "as given; never round or invent a number. Estimated 1-rep max is calculated from a real set (Epley).",
    ...lines,
    "If the user asks about a lift that is NOT in this list, tell them you don't see a logged PR for it yet",
    "and point them to the PR home (Exercise Library, the PRs button). Never guess a value.",
  ].join('\n');
};
