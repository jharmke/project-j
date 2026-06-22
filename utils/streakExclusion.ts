// Streak exclusion (Option A / HOLD) -- the single source of truth for how an
// excluded day affects an auto-tracked streak. Shared by the live streak engine
// (app/(tabs)/stats.tsx loadStreaks) AND the read-only dev probe below, so the
// tool always tests the exact logic the app runs (no drift).
//
// HOLD rule: an excluded day BRIDGES a streak -- it neither breaks it nor adds
// +1, it is simply skipped. Per-category exclusion holds only that category's
// streaks; a full-day exclusion also holds the sleep streaks (there is no
// standalone sleep exclusion flag). Faith/manual streaks (bible/gratitude/
// journaling/morning intention/prayer/custom) are NEVER auto-held -- you can
// still do them on an off day. `day` is a parsed pj_<date> record.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { offsetToDateKey } from './statsData';

export function streakHeldByExclusion(key: string | undefined, day: any): boolean {
  if (!key) return false; // custom + manual streaks: never auto-held
  const ex = (day?.excluded && typeof day.excluded === 'object') ? day.excluded : {};
  const dietEx = !!ex.diet, waterEx = !!ex.water, exerciseEx = !!ex.exercise;
  const fullyEx = (dietEx && waterEx && exerciseEx) || day?.dayScore?.excludedFromAverages === true;
  switch (key) {
    case 'calories':
    case 'protein':      return dietEx || fullyEx;
    case 'water':        return waterEx || fullyEx;
    case 'workout':
    case 'activecals':
    case 'exercisemins':
    case 'steps':        return exerciseEx || fullyEx;
    case 'sleepduration':
    case 'sleepquality': return fullyEx;
    default:             return false; // faith streaks: bible/gratitude/journaling/morningintention/prayer
  }
}

const PROBE_METRICS: { key: string; label: string }[] = [
  { key: 'calories', label: 'Calories' },
  { key: 'protein', label: 'Protein' },
  { key: 'water', label: 'Water' },
  { key: 'workout', label: 'Workout' },
  { key: 'activecals', label: 'Active Cals' },
  { key: 'exercisemins', label: 'Exercise Mins' },
  { key: 'steps', label: 'Steps' },
  { key: 'sleepduration', label: 'Sleep Duration' },
  { key: 'sleepquality', label: 'Sleep Quality' },
];

// Read-only dev probe. (1) Proves the bridge math on a synthetic 5-day run using
// the real helper. (2) Scans the last `days` of real pj_<date> records and reports
// which streaks each excluded day bridges. Writes nothing, touches no scores.
export async function probeStreakExclusions(days = 120): Promise<string> {
  // (1) Synthetic proof: most-recent-first run [hit, hit, miss, hit, hit].
  const hits = [true, true, false, true, true];
  const runWalk = (excludeIdx: number | null): number => {
    let streak = 0;
    for (let i = 0; i < hits.length; i++) {
      const fakeDay = { excluded: excludeIdx === i ? { water: true } : {} };
      if (streakHeldByExclusion('water', fakeDay)) continue; // bridge
      if (hits[i]) streak++; else break;
    }
    return streak;
  };
  const broken = runWalk(null);   // the miss breaks it
  const bridged = runWalk(2);     // exclude the miss -> bridges

  const out: string[] = [];
  out.push('SANITY CHECK (synthetic Water run hit/hit/MISS/hit/hit):');
  out.push(`  miss breaks streak at ${broken}; excluding that day bridges to ${bridged}.`);
  out.push(`  ${bridged > broken ? 'PASS -- HOLD is bridging.' : 'FAIL -- bridge did not apply.'}`);
  out.push('');

  // (2) Real-data scan.
  out.push(`YOUR EXCLUDED DAYS (last ${days}d) and the streaks each one bridges:`);
  let found = 0;
  for (let i = 0; i <= days; i++) {
    const dateKey = offsetToDateKey(i);
    let raw: string | null = null;
    try { raw = await AsyncStorage.getItem(`pj_${dateKey}`); } catch {}
    if (!raw) continue;
    let day: any;
    try { day = JSON.parse(raw); } catch { continue; }
    const ex = (day.excluded && typeof day.excluded === 'object') ? day.excluded : {};
    const anyExclusion = !!(ex.diet || ex.water || ex.exercise || day.dayScore?.excludedFromAverages === true);
    if (!anyExclusion) continue;
    found++;
    const cats = [ex.diet && 'diet', ex.water && 'water', ex.exercise && 'exercise'].filter(Boolean).join(',') || 'full';
    const bridges = PROBE_METRICS.filter(m => streakHeldByExclusion(m.key, day)).map(m => m.label);
    out.push(`  ${dateKey} [${cats}] -> ${bridges.length ? bridges.join(', ') : '(none)'}`);
  }
  if (found === 0) {
    out.push('  None found. Exclude a day in Day Detail (e.g. Water on a day mid-streak),');
    out.push('  then re-run this -- it will show that day bridging the Water streak.');
  }
  return out.join('\n');
}
