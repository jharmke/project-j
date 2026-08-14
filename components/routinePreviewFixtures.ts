import type { WorkoutDraft } from './RoutinePreviewCard';

// ─── Dev fixtures for the workout preview card ─────────────────────────────────
// 🔴 WHY THIS EXISTS. Iterating on the card by asking Otto for a real workout is a bad loop: every attempt
// is an AI round trip of a few seconds, costs money, spends one of a Supporter's 30 daily messages, and
// comes back DIFFERENT each time -- so when the card looks wrong you cannot tell whether your change did
// that or Otto simply wrote a different workout. These are fixed, instant and free.
//
// ⚠️ DELIBERATELY NOT `__DEV__`-ONLY. The day-row expand animates a MEASURED PIXEL HEIGHT, which is
// `useNativeDriver: false`, and this project's own rule says that kind of animation can only be judged on a
// RELEASE build. A dev-only trigger would be missing from TestFlight, which is exactly where it is needed.
// The gate is simply that nobody types `pj:card` by accident, and the worst case is a preview appearing
// that nothing is saved from.
//
// ⚠️ FIXED, NOT RANDOM. Random content means you might never happen to see the case that is broken.
// Each variant deliberately breaks something different.

const pad = (n: number) => String(n).padStart(2, '0');
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** N days from today, as the real date. ⚠️ Never a bare weekday -- that reads as a recurring template. */
function dayAhead(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return {
    dateKey: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    label: `${DAYS[d.getDay()]} ${MONTHS[d.getMonth()]} ${d.getDate()}`,
  };
}

const PUSH = [
  { name: 'Bench Press', sets: '4', reps: '8–10 reps', rest: '90s' },
  { name: 'Machine Shoulder Press', sets: '3', reps: '10–12 reps', rest: '60s' },
  { name: 'Cable Fly (Low to High)', sets: '3', reps: '12–15 reps', rest: '45s' },
  { name: 'Dumbbell Lateral Raise', sets: '3', reps: '12–15 reps', rest: '45s' },
  { name: 'Tricep Pushdown (Rope)', sets: '3', reps: '12 reps', rest: '45s' },
];

const PULL = [
  { name: 'Lat Pulldown (Wide Grip)', sets: '4', reps: '8–10 reps', rest: '90s' },
  { name: 'Barbell Row (Bent Over)', sets: '4', reps: '8–10 reps', rest: '90s' },
  { name: 'Seated Cable Row', sets: '3', reps: '10–12 reps', rest: '60s' },
  { name: 'Rear Delt Fly (Dumbbell)', sets: '3', reps: '15 reps', rest: '30s' },
  { name: 'Dumbbell Curl', sets: '3', reps: '12 reps', rest: '45s' },
];

const LEGS = [
  { name: 'Barbell Squat', sets: '4', reps: '6–8 reps', rest: '120s' },
  { name: 'Romanian Deadlift (RDL)', sets: '3', reps: '8–10 reps', rest: '90s' },
  { name: 'Leg Press', sets: '3', reps: '10–12 reps', rest: '60s' },
  { name: 'Calf Raise (Standing)', sets: '4', reps: '12–15 reps', rest: '45s' },
  { name: 'Plank', sets: '3', reps: '30–45s hold', rest: '30s' },
];

export const DEV_CARD_VARIANTS = ['normal', 'long', 'week', 'new', 'used', 'none'] as const;
export type DevCardVariant = (typeof DEV_CARD_VARIANTS)[number];

/** Returns null for 'none' -- the case where nothing valid survived and NO card should render at all. */
export function makeDevDraft(variant: string): WorkoutDraft | null {
  const v = (variant || 'normal').trim().toLowerCase();
  const d0 = dayAhead(0);
  const d1 = dayAhead(3);
  const d2 = dayAhead(5);

  if (v === 'none') return null;

  if (v === 'long') {
    // The library's longest names against its longest rep strings -- the worst case for wrapping.
    return {
      id: 'dev-long',
      title: 'Upper Body & Conditioning',
      status: 'live',
      days: [
        {
          ...d0,
          focus: 'Push',
          color: '#3b82f6',
          exercises: [
            { name: 'Overhead Tricep Extension (Cable)', sets: '3', reps: '12–15 reps', rest: '45s' },
            { name: 'Incline Bench Press (Barbell)', sets: '4', reps: '8–10 reps', rest: '90s' },
            { name: 'Dumbbell Row (Single Arm)', sets: '3', reps: '10–12 reps each side', rest: '60s' },
            { name: 'Smith Machine Bench Press', sets: '4', reps: '8–10 reps', rest: '90s' },
            { name: 'Treadmill', reps: '12 min · Zone 2', isCardio: true },
          ],
        },
      ],
    };
  }

  if (v === 'week') {
    return {
      id: 'dev-week',
      title: 'Push / Pull / Legs',
      status: 'live',
      days: [
        { ...d0, focus: 'Push', color: '#3b82f6', exercises: PUSH },
        { ...d1, focus: 'Pull', color: '#8b5cf6', exercises: PULL },
        { ...d2, focus: 'Legs + Core', color: '#22c55e', exercises: LEGS },
      ],
    };
  }

  if (v === 'new') {
    // A movement the user named that is NOT in the library, so it is created on accept. Spec 8.1 says its
    // muscles and instructions must be visible BEFORE it joins their library permanently.
    return {
      id: 'dev-new',
      title: 'Push',
      status: 'live',
      days: [
        {
          ...d0,
          focus: 'Push',
          color: '#3b82f6',
          exercises: [
            ...PUSH.slice(0, 3),
            {
              name: 'Svend Press',
              sets: '3',
              reps: '12–15 reps',
              rest: '45s',
              isNew: true,
              muscles: 'Chest · Front Delts',
              instructions: [
                'Press two plates together at chest height, palms flat.',
                'Push them straight out until your arms are extended.',
                'Squeeze your chest hard and hold for a beat.',
                'Draw them back in without letting the pressure drop.',
              ],
            },
            PUSH[4],
          ],
        },
      ],
    };
  }

  if (v === 'used') {
    return {
      id: 'dev-used',
      title: 'Push A',
      status: 'used',
      usedLabel: `Added to ${d0.label}`,
      days: [{ ...d0, focus: 'Push', color: '#3b82f6', exercises: PUSH }],
    };
  }

  return {
    id: 'dev-normal',
    title: 'Push A',
    status: 'live',
    days: [{ ...d0, focus: 'Push', color: '#3b82f6', exercises: PUSH }],
  };
}
