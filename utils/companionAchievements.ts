// Conditional ACHIEVEMENTS context for Otto (on-demand dataset #6 -- same pattern as companionBody /
// companionSleep / companionFood). Otto's KB already carries the ACHIEVEMENTS CATALOG (every badge's
// criteria), but until now Otto had NO access to which ones the user has EARNED or how close they are. This
// block fills both: the user's real earned set (from pj_achievements) AND their live progress counters (the
// SAME scan that drives the Achievements screen's progress bars, via the shared loadProgressValues). So Otto
// can answer "what have I earned" AND "how close am I to <badge>" with the exact numbers the user sees.
// Attached only when a message is about achievements / badges / earned milestones / goal-day counts.
//
// Honest-numbers: the progress counters come from utils/achievementProgress.loadProgressValues, which is the
// exact function the Achievements screen uses (one source of truth), so Otto's "23 of 50" equals the screen's
// progress bar. Earned set + dates come from the screen's own loadAchievements.
import {
  ACHIEVEMENTS, loadAchievements,
  type AchievementsStore,
} from '../achievementData';
import { loadProgressValues } from './achievementProgress';

const CHAR_BUDGET = 5000;

// Category display order + labels, mirroring the Achievements screen.
const CATEGORY_ORDER = ['hydration', 'steps', 'weight', 'momentum', 'workout', 'sleep', 'faith', 'nutrition', 'journal'] as const;
const CATEGORY_LABEL: Record<string, string> = {
  hydration: 'Hydration', steps: 'Steps', weight: 'Weight', momentum: 'Momentum', workout: 'Workout',
  sleep: 'Sleep', faith: 'Faith', nutrition: 'Nutrition', journal: 'Journal',
};

// Human labels for each progress counter (keyed by the AchievementDef.progressKey it feeds). Order = output
// order. Weight is handled separately (direction-dependent). Value is a count of days/entries unless noted.
const PROGRESS_ROWS: { key: string; label: string; decimals?: number }[] = [
  { key: 'waterGoalDays',        label: 'Water-goal days (feeds the Hydration badges: 1/10/30/50/75/100/200/365)' },
  { key: 'stepGoalDays',         label: 'Step-goal days (feeds the Steps badges: 1/10/30/50/75/100/200/365)' },
  { key: 'workoutDays',          label: 'Workout days (feeds the Workout badges: 1/10/30/50/75/100/200/365)' },
  { key: 'nutritionGoalDays',    label: 'Calorie-goal days (feeds the Nutrition badges: 1/10/30/50/75/100/200/365)' },
  { key: 'greenSleepDays',       label: 'Green sleep nights, score 85+ (feeds the tiered Sleep badges: 1/10/30/50/100/200/365)' },
  { key: 'sleepAnyDays',         label: 'Nights of sleep logged (feeds Lights Out)' },
  { key: 'logStreak',            label: 'Current logging streak in days (feeds the Momentum badges: 3/7/14/30/60/90/180/365)' },
  { key: 'verseReflections',     label: 'Verse reflections written (feeds the Faith verse badges: 1/10/25/50/100/200/365)' },
  { key: 'prayerEntries',        label: 'Prayers logged (feeds the Faith prayer badges: 1/10/25/50/100/200/365)' },
  { key: 'gratitudeEntries',     label: 'Gratitude entries (feeds the Faith gratitude badges: 7/30/100/200/365)' },
  { key: 'bibleReadingDays',     label: 'Bible reading days (feeds the Faith reading badges: 7/30/50/100/200/365)' },
  { key: 'generalJournalEntries',label: 'Journal entries (feeds the Journal badges: 1/10/25/50/100/200/365)' },
];

const fmtDate = (iso: string): string => {
  try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return iso; }
};
const r1 = (n: number) => Math.round(n * 10) / 10;

// Achievement / badge / earned-milestone words + an ask/possessive, OR a goal-day-count question. The KB
// catalog handles "what IS <badge>" (criteria); this block is for the user's OWN earned + progress data, so
// it leans on personal framing. Generous: a false positive costs a few hundred tokens.
export const messageWantsAchievements = (text: string): boolean => {
  const t = (text || '').toLowerCase();
  const ach = /\b(achievement|achievements|badge|badges|trophy|trophies|medal|medals|milestone|milestones|unlock(?:ed)?|earn(?:ed)?)\b/;
  const goalTally = /\b(?:how many (?:times|days).*(?:goal|hit)|(?:water|step|steps|active|exercise|calorie|workout) goal (?:days|times|hits?)|goal days)\b/;
  const ask = /\b(did|do|does|have|has|had|how many|how much|how close|what|which|my|earned?|unlocked?|got|get|close to|left|remaining|so far|progress)\b/;
  if (ach.test(t) && ask.test(t)) return true;
  if (goalTally.test(t)) return true;
  return false;
};

export const buildAchievementsContextIfRelevant = async (message: string): Promise<string | null> => {
  if (!messageWantsAchievements(message || '')) return null;

  let store: AchievementsStore = {};
  let prog: Record<string, number> = {};
  try {
    store = await loadAchievements();
    prog = await loadProgressValues();
  } catch { return null; }

  // Earned achievements, grouped by category, newest-first within each group.
  const earnedCount = Object.keys(store).length;

  const lines: string[] = [];
  let size = 0; const droppedCats: string[] = [];
  for (const cat of CATEGORY_ORDER) {
    const inCat = ACHIEVEMENTS
      .filter(a => a.category === cat && store[a.id])
      .map(a => ({ def: a, u: store[a.id] }))
      .sort((x, y) => (x.u.unlockedAt < y.u.unlockedAt ? 1 : x.u.unlockedAt > y.u.unlockedAt ? -1 : 0));
    if (!inCat.length) continue;
    const header = `${CATEGORY_LABEL[cat]} (${inCat.length}):`;
    const catLines = inCat.map(({ def, u }) => {
      const times = u.count > 1 ? ` (earned ${u.count}x, latest ${fmtDate(u.lastUnlockedAt)})` : '';
      return `    - ${def.name}: ${fmtDate(u.unlockedAt)}${times}`;
    });
    const block = [`  ${header}`, ...catLines].join('\n');
    if (lines.length > 0 && size + block.length > CHAR_BUDGET) { droppedCats.push(CATEGORY_LABEL[cat]); continue; }
    lines.push(block);
    size += block.length + 1;
  }

  // Live progress counters (the SAME numbers as the Achievements screen progress bars).
  const progLines: string[] = [];
  for (const row of PROGRESS_ROWS) {
    const v = prog[row.key];
    if (typeof v !== 'number') continue;
    progLines.push(`  - ${row.label}: ${row.decimals ? r1(v) : Math.round(v)}`);
  }
  // Weight is direction-dependent -- show the counter that matches the user's goal direction (matching how the
  // screen only shows loss OR gain badges).
  const startW = prog['_startWeight'] ?? 0;
  const goalW = prog['_goalWeight'] ?? 0;
  if (startW > 0 && goalW > 0 && goalW !== startW) {
    if (goalW < startW && typeof prog['totalLost'] === 'number') {
      progLines.push(`  - Pounds lost from your starting weight (feeds the Weight-loss badges: 5/10/25/50/75/100): ${r1(prog['totalLost'])}`);
    } else if (goalW > startW && typeof prog['totalGained'] === 'number') {
      progLines.push(`  - Pounds gained from your starting weight (feeds the Weight-gain badges: 5/10/25/50/75/100): ${r1(prog['totalGained'])}`);
    }
  }

  const out: string[] = [
    `ACHIEVEMENTS (the user's ACTUAL earned badges + live progress, straight from their Achievements screen --`,
    `these are exact; quote them, never invent one). The user has earned ${earnedCount} achievement${earnedCount === 1 ? '' : 's'} so far.`,
  ];
  if (earnedCount > 0) {
    out.push('', 'EARNED (by category, most recent first):', ...lines);
    if (droppedCats.length) out.push(`  (Also earned in: ${droppedCats.join(', ')} -- omitted here to save space; they're on the Achievements screen.)`);
  } else {
    out.push('', 'The user has not earned any tiered achievements yet.');
  }
  out.push(
    '',
    'LIVE PROGRESS (current count toward each badge family -- these EXACTLY match the progress bars on the',
    'Achievements screen, so you can tell the user precisely how close they are):',
    ...progLines,
    '',
    'How to answer:',
    '- "What achievements do I have / how many have I earned" -> use the EARNED list + the total above. If it\'s long, give the total + highlights by category rather than reading every one.',
    '- "Have I earned <badge>" -> yes only if it\'s in the EARNED list; otherwise it\'s not earned yet -- say so and give its criteria.',
    '- "How close am I to <badge>" / "how many more until <badge>" -> take that badge\'s target from the catalog you know (e.g. Well Worn = 50 step-goal days), read the matching LIVE PROGRESS count above, and give current-of-target + how many more (e.g. "23 of 50, so 27 more"). These match the screen\'s progress bar exactly.',
    '- "How many times have I hit my water / step goal", "how many workout days", etc. -> read the matching LIVE PROGRESS count.',
    '- Never claim a badge is earned, or state an earned date, unless it\'s in the EARNED list. Never invent a badge name or a progress number that isn\'t above.',
    '- A badge family with no LIVE PROGRESS line means no data for it yet (count 0) -> the user hasn\'t started that one.',
    'To see it all with the badge art + bars: the Achievements screen (Profile or Stats header > trophy icon).',
  );
  return out.join('\n');
};
