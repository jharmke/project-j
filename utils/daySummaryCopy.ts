// utils/daySummaryCopy.ts
// Shared narrative copy for the Day Summary surfaces (morning modal + full page):
// the win line, the coach note, and the context line. Centralized so the two
// surfaces can never drift. Pure where possible; the context line and faith
// check read storage and are async.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { DayScore } from './dayScore';
import { loadRecentComposites } from './dayScoreStore';

// ── Win-line / coach-note copy ───────────────────────────────────────────────
const WIN_STD: Record<string, string> = {
  calorie: 'You nailed your calorie target.',
  protein: 'Protein was dialed in.',
  water: 'You crushed your water goal.',
  active: 'You torched your activity goal.',
  workout: 'Every set checked off. Done.',
  movement: 'You moved your body today.',
  sleep: 'You slept like a champ.',
};
const WIN_MINDFUL: Record<string, string> = {
  calorie: 'You showed up for your nutrition.',
  protein: 'You fueled your body well.',
  water: 'You stayed hydrated.',
  active: 'You moved your body today.',
  workout: 'You showed up for your training.',
  movement: 'You moved your body today.',
  sleep: 'You gave your body real rest.',
};
const COACH_STD: Record<string, string> = {
  calorie: 'Calories drifted from target. Reset today.',
  protein: 'Protein was your gap. Aim higher today.',
  water: 'Water came up short. Keep a bottle close today.',
  active: 'Activity was light. A walk today moves the needle.',
  workout: 'A few sets went unchecked.',
  movement: 'Movement was light. A short walk today helps.',
  sleep: 'Sleep ran short. Aim for an earlier night.',
};
const COACH_MINDFUL: Record<string, string> = {
  calorie: "Nutrition's one area to ease back into today.",
  protein: "Protein's one area to explore today.",
  water: 'A little more water today could help.',
  active: 'Some gentle movement today might feel good.',
  workout: 'Training was one area left open.',
  movement: 'Some gentle movement today might feel good.',
  sleep: 'Rest is one area to lean into tonight.',
};
export const FAITH_WIN_LINE = 'Strong day. You took care of your body and your spirit.';

type SubKey = 'calorie' | 'protein' | 'water' | 'active' | 'workout' | 'movement' | 'sleep';
// Tie-break order for the win line: most impressive thing wins a tie.
const WIN_PRIORITY: SubKey[] = ['workout', 'calorie', 'active', 'sleep', 'protein', 'water', 'movement'];

// Build the list of present sub-components with each one's earned/max ratio.
// Only subs that actually scored above zero are gap candidates downstream, so an
// unset goal (water you never configured) can never trigger a false coach note.
export function buildSubs(score: DayScore): { key: SubKey; ratio: number }[] {
  const subs: { key: SubKey; ratio: number }[] = [];
  const nd = score.nutritionDetail;
  if (score.nutritionScore !== null && nd) {
    if (nd.calorieHit || nd.calorieScore > 0) subs.push({ key: 'calorie', ratio: nd.calorieHit ? 1 : nd.calorieScore / 55 });
    if (nd.proteinScore > 0) subs.push({ key: 'protein', ratio: Math.min(1, nd.proteinScore / 28) });
    if (nd.waterScore > 0) subs.push({ key: 'water', ratio: Math.min(1, nd.waterScore / 17) });
  }
  const ad = score.activityDetail;
  if (score.activityScore !== null && ad) {
    if (ad.isMindfulPresence) {
      subs.push({ key: 'movement', ratio: (score.activityScore || 0) / 100 });
    } else if (ad.workoutScore !== null) {
      if (ad.activeCalScore > 0) subs.push({ key: 'active', ratio: Math.min(1, ad.activeCalScore / 60) });
      subs.push({ key: 'workout', ratio: Math.min(1, ad.workoutScore / 40) });
    } else if (ad.activeCalScore > 0) {
      subs.push({ key: 'active', ratio: Math.min(1, ad.activeCalScore / 100) });
    }
  }
  const sd = score.sleepDetail;
  if (score.sleepScore !== null && sd) {
    subs.push({ key: 'sleep', ratio: Math.min(1, sd.rawSleepScore / 100) });
  }
  return subs;
}

// Win line (highest-scoring sub) + coach note (lowest sub under 60% of its max,
// if any). hadFaith forces the faith win line; the caller decides eligibility
// (Rooted journey AND a faith entry that day).
export function winAndCoachLines(score: DayScore, isMindful: boolean, hadFaith: boolean): { winLine: string; coachLine: string } {
  const subs = buildSubs(score);

  let winLine = '';
  if (subs.length) {
    const best = [...subs].sort((a, b) => b.ratio - a.ratio || WIN_PRIORITY.indexOf(a.key) - WIN_PRIORITY.indexOf(b.key))[0];
    winLine = (isMindful ? WIN_MINDFUL : WIN_STD)[best.key];
  }
  if (hadFaith) winLine = FAITH_WIN_LINE;

  let coachLine = '';
  const gaps = subs.filter(s => s.ratio < 0.60).sort((a, b) => a.ratio - b.ratio);
  if (gaps.length) coachLine = (isMindful ? COACH_MINDFUL : COACH_STD)[gaps[0].key];

  return { winLine, coachLine };
}

// Faith categories that count toward the Rooted win-line framing. Personal and
// fitness journal entries are NOT faith. Legacy entries with no category are the
// old daily-verse reflections, so they count.
const FAITH_CATS = ['verse', 'prayer', 'study', 'gratitude'];
export async function hadFaithEntryOn(dateKey: string): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem('pj_bible_reflections');
    if (!raw) return false;
    const entries = JSON.parse(raw);
    if (!Array.isArray(entries)) return false;
    return entries.some((e: any) => e?.date === dateKey && (!e.category || FAITH_CATS.includes(e.category)));
  } catch {
    return false;
  }
}

// Context line under the hero: gives the score a story. Mindful stays neutral
// and comparison-free; other modes compare to the trailing week.
export async function contextLine(dateKey: string, composite: number, isMindful: boolean): Promise<string> {
  if (isMindful) {
    return composite >= 80 ? 'A strong, steady day.' : composite >= 60 ? 'A steady day.' : 'A gentle day.';
  }
  try {
    const prior = await loadRecentComposites(dateKey, 6);
    if (!prior.length) return '';
    if (composite >= Math.max(...prior)) return 'Your best day this week.';
    const avg = prior.reduce((a, b) => a + b, 0) / prior.length;
    const diff = Math.round(composite - avg);
    if (diff >= 1) return `Up ${diff} from your weekly average.`;
    if (diff <= -1) return `Down ${Math.abs(diff)} from your weekly average.`;
    return 'Right on your weekly average.';
  } catch {
    return '';
  }
}
