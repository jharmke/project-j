import AsyncStorage from '@react-native-async-storage/async-storage';

// ─────────────────────────────────────────────────────────────────────────────
// Shared per-metric "has this user EVER had this data" signal.
//
// ONE source of truth that every device-dependent surface (graph picker, home/day
// cards, summaries, Otto) reads, so the absence of a wearable is detected the SAME
// way everywhere instead of each surface guessing (the guessing is what produced the
// dead-flag bug where a never-written setting hid graphs from full-watch users).
//
// SCOPE: this answers ACCESSIBILITY only -- "should this feature be offered at all."
// It does NOT replace each surface's own per-day "is there a value for TODAY" check;
// that stays where it is. Two different questions: availability (here) vs today's value.
//
// GROW-ONLY: once a metric is seen it stays present, so historical data never vanishes
// (a user whose watch broke keeps their sleep/recovery history and its graphs). Persisted
// in pj_metric_presence -- an ADDITIVE key, read-then-merge, never touches any existing
// pj_ data.
// ─────────────────────────────────────────────────────────────────────────────

export type PresenceMetric =
  | 'recovery' | 'hrv' | 'restingHR' | 'respiratoryRate' | 'bloodOxygen'
  | 'vo2Max' | 'cardioRecovery' | 'sleepStages' | 'sleepScore'
  | 'activeCals' | 'exerciseMinutes' | 'steps';

export type PresenceMap = Record<PresenceMetric, boolean>;

const PRESENCE_KEY = 'pj_metric_presence';
const SEEDED_KEY = 'pj_metric_presence_seeded';

const ALL_METRICS: PresenceMetric[] = [
  'recovery', 'hrv', 'restingHR', 'respiratoryRate', 'bloodOxygen',
  'vo2Max', 'cardioRecovery', 'sleepStages', 'sleepScore',
  'activeCals', 'exerciseMinutes', 'steps',
];

export function emptyPresence(): PresenceMap {
  return ALL_METRICS.reduce((m, k) => { m[k] = false; return m; }, {} as PresenceMap);
}

const isNum = (v: any): v is number => typeof v === 'number' && Number.isFinite(v);

function stagesHaveData(stages: any): boolean {
  return !!stages && typeof stages === 'object' &&
    ((isNum(stages.totalMs) && stages.totalMs > 0) ||
     (isNum(stages.deep) && stages.deep > 0) ||
     (isNum(stages.rem) && stages.rem > 0) ||
     (isNum(stages.core) && stages.core > 0));
}

// Which metrics does a single stored day record hold REAL data for? Pure, no I/O.
// A metric counts as present only when its value is genuinely there. For the activity
// metrics whose 0 is ambiguous (rested vs no device) we require > 0; the watch-only
// signals just need to exist.
export function detectDayPresence(day: any): PresenceMetric[] {
  if (!day || typeof day !== 'object') return [];
  const rsig = (day.recoverySignals && typeof day.recoverySignals === 'object') ? day.recoverySignals : {};
  const has: PresenceMetric[] = [];

  if (isNum(day.recoveryScore)) has.push('recovery');
  if (isNum(rsig.hrv) && rsig.hrv > 0) has.push('hrv');
  if (isNum(day.restingHR) || isNum(rsig.rhr)) has.push('restingHR');
  if (isNum(day.respiratoryRate) || isNum(rsig.resp)) has.push('respiratoryRate');
  if (isNum(day.bloodOxygen) || isNum(rsig.spo2)) has.push('bloodOxygen');
  if (isNum(day.vo2Max)) has.push('vo2Max');
  if (isNum(day.cardioRecovery)) has.push('cardioRecovery');
  if (stagesHaveData(day.sleepStages)) has.push('sleepStages');
  // Sleep score is derivable whenever ANY sleep data exists (manual hours OR watch stages),
  // so its availability follows sleep presence, not a wearable.
  if ((isNum(day.sleepHours) && day.sleepHours > 0) || (isNum(day.sleepOverride) && day.sleepOverride > 0) || stagesHaveData(day.sleepStages)) has.push('sleepScore');
  // Activity metrics: 0 is ambiguous (rest day vs no device), so require > 0.
  if ((isNum(day.activeCalories) && day.activeCalories > 0) || (isNum(day.caloriesBurned) && day.caloriesBurned > 0)) has.push('activeCals');
  if (isNum(day.exerciseMinutes) && day.exerciseMinutes > 0) has.push('exerciseMinutes');
  if (isNum(day.steps) && day.steps > 0) has.push('steps');
  return has;
}

// Read the persisted grow-only presence map. Never throws; missing/corrupt -> all false.
export async function loadMetricPresence(): Promise<PresenceMap> {
  const map = emptyPresence();
  try {
    const raw = await AsyncStorage.getItem(PRESENCE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      for (const k of ALL_METRICS) if (saved?.[k] === true) map[k] = true;
    }
  } catch {}
  return map;
}

// Merge freshly-observed metrics into the persisted map (grow-only union) and return the
// updated map. Only writes when something actually turned true, so it never churns storage
// and never un-marks a metric. Read-then-merge, so a stale/smaller in-memory view can never
// shrink what is stored.
export async function recordMetricPresence(observed: PresenceMetric[]): Promise<PresenceMap> {
  const map = await loadMetricPresence();
  let changed = false;
  for (const m of observed) {
    if (map[m] !== true) { map[m] = true; changed = true; }
  }
  if (changed) {
    try { await AsyncStorage.setItem(PRESENCE_KEY, JSON.stringify(map)); } catch {}
  }
  return map;
}

// Fold a batch of day records into the presence map (grow-only). Surfaces that already load
// a window of days can call this so the map self-heals continuously, independent of the seed.
export async function recordPresenceFromDays(days: any[]): Promise<PresenceMap> {
  const seen = new Set<PresenceMetric>();
  for (const d of (days || [])) for (const m of detectDayPresence(d)) seen.add(m);
  return recordMetricPresence(Array.from(seen));
}

// One-time backfill: scan up to `windowDays` of stored pj_YYYY-MM-DD history and seed the
// presence map so existing users are fully marked from first run. Cheap after the first run
// (a seeded flag short-circuits it). SAFE to over-call.
//
// Reinstall safety: the seeded flag is only set once real day-keys are found, so an empty
// pre-restore run does NOT lock in an all-absent state -- it simply seeds nothing and re-runs
// after cloud restore lands. Best called after the sync/restore gate settles.
export async function seedMetricPresenceOnce(windowDays: number = 365): Promise<PresenceMap> {
  try {
    const seeded = await AsyncStorage.getItem(SEEDED_KEY);
    if (seeded) return loadMetricPresence();
  } catch {}
  try {
    const keys = await AsyncStorage.getAllKeys();
    const dayKeys = keys.filter(k => /^pj_\d{4}-\d{2}-\d{2}$/.test(k)).sort().slice(-windowDays);
    if (dayKeys.length === 0) return loadMetricPresence(); // nothing to seed yet; do NOT set the flag

    const seen = new Set<PresenceMetric>();
    const CHUNK = 60;
    for (let i = 0; i < dayKeys.length; i += CHUNK) {
      const pairs = await AsyncStorage.multiGet(dayKeys.slice(i, i + CHUNK));
      for (const [, v] of pairs) {
        if (!v) continue;
        try { for (const m of detectDayPresence(JSON.parse(v))) seen.add(m); } catch {}
      }
    }
    const map = await recordMetricPresence(Array.from(seen));
    try { await AsyncStorage.setItem(SEEDED_KEY, '1'); } catch {}
    return map;
  } catch {
    return loadMetricPresence();
  }
}
