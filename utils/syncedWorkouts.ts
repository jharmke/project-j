// Synced Workouts (Apple Health) grouping -- Phase 1 foundation for the "Workout History" feature.
// Groups raw Apple workout sessions by { activity type + indoor flag } into labeled drawers. This is
// the stable KEY the real feature will file entries under (a rename only changes the label, never the
// key), so getting the grouping right on real data is the whole point of the Phase 1 verification view.

export interface SyncedWorkout {
  uuid: string;
  type: number;              // HKWorkoutActivityType numeric code
  name: string;              // base type name (e.g. "Running")
  indoor: boolean | null;    // true = indoor/treadmill, false = outdoor, null = device never set the flag
  durationSec: number;
  distanceMi: number | null;
  calories: number;
  startDate: string | Date;
}

export interface SyncedGroup {
  key: string;               // stable filing key: `${type}_${in|out|x}`
  label: string;             // display label: "Indoor Running", "Outdoor Cycling", or bare name when flag missing
  type: number;
  indoor: boolean | null;
  sessions: SyncedWorkout[]; // newest first
}

// Activity types (numeric HKWorkoutActivityType) where indoor vs outdoor is a GENUINE, meaningful split
// -- you do them both ways and it changes the workout. Everything else ignores the flag and groups by
// type alone, so we never get nonsense like "Outdoor Traditional Strength Training" or a bogus "Outdoor
// Elliptical" (the flag is set on every workout even where it's meaningless). Small + stable set; Apple's
// codes rarely change. A split type whose flag is MISSING falls into the plain, unprefixed bucket.
export const SPLIT_TYPES = new Set<number>([
  52, // Walking
  37, // Running
  13, // Cycling
  46, // Swimming
  35, // Rowing
]);

export function syncedGroupKey(type: number, indoor: boolean | null): string {
  if (!SPLIT_TYPES.has(type) || indoor === null) return `${type}`;
  return `${type}_${indoor ? 'in' : 'out'}`;
}

export function syncedGroupLabel(name: string, indoor: boolean | null, type: number): string {
  if (!SPLIT_TYPES.has(type) || indoor === null) return name;
  return (indoor ? 'Indoor ' : 'Outdoor ') + name;
}

export function groupSyncedWorkouts(list: SyncedWorkout[]): SyncedGroup[] {
  const map = new Map<string, SyncedGroup>();
  for (const w of list) {
    const key = syncedGroupKey(w.type, w.indoor);
    if (!map.has(key)) {
      map.set(key, { key, label: syncedGroupLabel(w.name, w.indoor, w.type), type: w.type, indoor: w.indoor, sessions: [] });
    }
    map.get(key)!.sessions.push(w);
  }
  const groups = Array.from(map.values());
  // Newest session first within each drawer; drawers ordered by how many sessions they hold.
  groups.forEach(g => g.sessions.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()));
  groups.sort((a, b) => b.sessions.length - a.sessions.length);
  return groups;
}

export function formatDurationShort(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
