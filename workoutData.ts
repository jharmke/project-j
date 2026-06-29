export interface Exercise {
  id: string;
  name: string;
  sets: string;
  reps: string;
  rest: string;
  note: string;
  dropset?: boolean;
  isCardio?: boolean;
  // Consecutive lift exercises sharing this id render as one superset block. Additive/optional.
  supersetGroup?: string;
  duration?: string;
  distance?: string;
  speed?: string;
  incline?: string;
  resistance?: string;
  hr?: string;
  calories?: string;
}

// One logged set of a lift: actual weight x reps, the per-set rest target, and the done check.
// Stored in pj_workout_state.setLogs[dateKey][exerciseId]. weight/reps null = not entered yet.
export interface SetEntry {
  weight: number | null;
  reps: number | null;
  rest: number | null;
  done: boolean;
}

export interface WorkoutTag {
  id: string;
  label: string;
  color: string;
  locked?: boolean;
}

export interface DayProgram {
  type: 'lift' | 'cardio' | 'rest' | 'unassigned';
  focus: string;
  muscles?: string;
  color?: string;
  customLabel?: string;
  exercises: Exercise[];
  tags?: string[];
}

export interface Routine {
  id: string;
  name: string;
  tags: string[];
  exercises: Exercise[];
  starred: boolean;
  isPreset?: boolean;
}

export const TAG_COLOR_PALETTE = [
  '#3b82f6', '#10b981', '#f59e0b', '#f97316',
  '#ef4444', '#8b5cf6', '#14b8a6', '#ec4899',
  '#6366f1', '#06b6d4', '#f43f5e', '#64748b',
];

export const DEFAULT_TAGS: WorkoutTag[] = [
  { id: 'tag_push',    label: 'Push',    color: '#3b82f6', locked: true },
  { id: 'tag_pull',    label: 'Pull',    color: '#10b981', locked: true },
  { id: 'tag_legs',    label: 'Legs',    color: '#f59e0b', locked: true },
  { id: 'tag_core',    label: 'Core',    color: '#eab308', locked: true },
  { id: 'tag_cardio',  label: 'Cardio',  color: '#f97316', locked: true },
  { id: 'tag_rest',    label: 'Rest',    color: '#64748b', locked: true },
];

export const BLANK_DAY: DayProgram = {
  type: 'unassigned',
  focus: '',
  exercises: [],
};

export const WORKOUT_TYPE_NAMES: Record<number, string> = {
  1: 'American Football', 2: 'Archery', 3: 'Australian Football', 4: 'Badminton',
  5: 'Baseball', 6: 'Basketball', 7: 'Bowling', 8: 'Boxing',
  9: 'Climbing', 10: 'Cricket', 11: 'Cross Training', 12: 'Curling',
  13: 'Cycling', 14: 'Dance', 16: 'Elliptical', 17: 'Equestrian Sports',
  18: 'Fencing', 19: 'Fishing', 20: 'Functional Strength Training',
  21: 'Golf', 22: 'Gymnastics', 23: 'Handball', 24: 'Hiking',
  25: 'Hockey', 26: 'Hunting', 27: 'Lacrosse', 28: 'Martial Arts',
  29: 'Mind and Body', 30: 'Mixed Metabolic Cardio Training', 31: 'Paddle Sports',
  32: 'Play', 33: 'Preparation and Recovery', 34: 'Racquetball', 35: 'Rowing',
  36: 'Rugby', 37: 'Running', 38: 'Sailing', 39: 'Skating Sports',
  40: 'Snow Sports', 41: 'Soccer', 42: 'Softball', 43: 'Squash',
  44: 'Stair Climbing', 45: 'Surfing Sports', 46: 'Swimming', 47: 'Table Tennis',
  48: 'Tennis', 49: 'Track and Field', 50: 'Traditional Strength Training',
  51: 'Volleyball', 52: 'Walking', 53: 'Water Fitness', 54: 'Water Polo',
  55: 'Water Sports', 56: 'Wrestling', 57: 'Yoga', 58: 'Barre',
  59: 'Core Training', 60: 'Cross Country Skiing', 61: 'Downhill Skiing',
  62: 'Flexibility', 63: 'High Intensity Interval Training', 64: 'Jump Rope',
  65: 'Kickboxing', 66: 'Pilates', 67: 'Snowboarding', 68: 'Stairs',
  69: 'Step Training', 70: 'Wheelchair Walk Pace', 71: 'Wheelchair Run Pace',
  72: 'Tai Chi', 73: 'Mixed Cardio', 74: 'Hand Cycling', 75: 'Disc Sports',
  76: 'Fitness Gaming', 3000: 'Other',
};

export const formatWorkoutDuration = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
};

export interface PresetProgram {
  id: string;
  name: string;
  description: string;
  days: Record<string, DayProgram>;
}

export const PRESET_PROGRAMS: PresetProgram[] = [
  {
    id: 'ppl',
    name: 'Push / Pull / Legs',
    description: 'Classic 3-day split. Push Mon, Pull Wed, Legs Fri. Rest the other days.',
    days: {
      Mon: { type: 'lift', focus: 'Push', muscles: 'Chest · Shoulders · Triceps', color: '#3b82f6', exercises: [], tags: ['tag_push'] },
      Tue: { type: 'unassigned', focus: '', exercises: [] },
      Wed: { type: 'lift', focus: 'Pull', muscles: 'Back · Biceps · Rear Delts', color: '#10b981', exercises: [], tags: ['tag_pull'] },
      Thu: { type: 'unassigned', focus: '', exercises: [] },
      Fri: { type: 'lift', focus: 'Legs + Core', muscles: 'Quads · Hamstrings · Glutes · Core', color: '#f59e0b', exercises: [], tags: ['tag_legs', 'tag_core'] },
      Sat: { type: 'rest', focus: 'Rest', color: '#64748b', exercises: [], tags: ['tag_rest'] },
      Sun: { type: 'rest', focus: 'Rest', color: '#64748b', exercises: [], tags: ['tag_rest'] },
    },
  },
  {
    id: 'upper_lower',
    name: 'Upper / Lower',
    description: '4-day split. Upper body twice, lower body twice per week.',
    days: {
      Mon: { type: 'lift', focus: 'Upper', muscles: 'Chest · Back · Shoulders · Arms', color: '#3b82f6', exercises: [], tags: ['tag_push', 'tag_pull'] },
      Tue: { type: 'lift', focus: 'Lower', muscles: 'Quads · Hamstrings · Glutes · Core', color: '#f59e0b', exercises: [], tags: ['tag_legs', 'tag_core'] },
      Wed: { type: 'rest', focus: 'Rest', color: '#64748b', exercises: [], tags: ['tag_rest'] },
      Thu: { type: 'lift', focus: 'Upper', muscles: 'Chest · Back · Shoulders · Arms', color: '#3b82f6', exercises: [], tags: ['tag_push', 'tag_pull'] },
      Fri: { type: 'lift', focus: 'Lower', muscles: 'Quads · Hamstrings · Glutes · Core', color: '#f59e0b', exercises: [], tags: ['tag_legs', 'tag_core'] },
      Sat: { type: 'rest', focus: 'Rest', color: '#64748b', exercises: [], tags: ['tag_rest'] },
      Sun: { type: 'rest', focus: 'Rest', color: '#64748b', exercises: [], tags: ['tag_rest'] },
    },
  },
  {
    id: 'full_body',
    name: 'Full Body 3x',
    description: 'Full body lifts Mon, Wed, Fri. Active recovery or cardio on off days.',
    days: {
      Mon: { type: 'lift', focus: 'Full Body', muscles: 'Total Body', color: '#8b5cf6', exercises: [] },
      Tue: { type: 'cardio', focus: 'Cardio', color: '#f97316', exercises: [], tags: ['tag_cardio'] },
      Wed: { type: 'lift', focus: 'Full Body', muscles: 'Total Body', color: '#8b5cf6', exercises: [] },
      Thu: { type: 'cardio', focus: 'Cardio', color: '#f97316', exercises: [], tags: ['tag_cardio'] },
      Fri: { type: 'lift', focus: 'Full Body', muscles: 'Total Body', color: '#8b5cf6', exercises: [] },
      Sat: { type: 'rest', focus: 'Rest', color: '#64748b', exercises: [], tags: ['tag_rest'] },
      Sun: { type: 'rest', focus: 'Rest', color: '#64748b', exercises: [], tags: ['tag_rest'] },
    },
  },
  {
    id: 'cardio_focus',
    name: 'Cardio Focus',
    description: 'Daily cardio with 2 lift days. Great for weight loss or conditioning.',
    days: {
      Mon: { type: 'cardio', focus: 'Cardio', color: '#f97316', exercises: [], tags: ['tag_cardio'] },
      Tue: { type: 'lift', focus: 'Upper', muscles: 'Chest · Back · Shoulders · Arms', color: '#3b82f6', exercises: [], tags: ['tag_push', 'tag_pull'] },
      Wed: { type: 'cardio', focus: 'Cardio', color: '#f97316', exercises: [], tags: ['tag_cardio'] },
      Thu: { type: 'cardio', focus: 'Cardio', color: '#f97316', exercises: [], tags: ['tag_cardio'] },
      Fri: { type: 'lift', focus: 'Lower', muscles: 'Quads · Hamstrings · Glutes · Core', color: '#f59e0b', exercises: [], tags: ['tag_legs'] },
      Sat: { type: 'cardio', focus: 'Cardio', color: '#f97316', exercises: [], tags: ['tag_cardio'] },
      Sun: { type: 'rest', focus: 'Rest', color: '#64748b', exercises: [], tags: ['tag_rest'] },
    },
  },
  {
    id: 'rest_heavy',
    name: 'Rest Day Heavy',
    description: 'Lift 5 days, rest 2. For serious volume.',
    days: {
      Mon: { type: 'lift', focus: 'Push', muscles: 'Chest · Shoulders · Triceps', color: '#3b82f6', exercises: [], tags: ['tag_push'] },
      Tue: { type: 'lift', focus: 'Pull', muscles: 'Back · Biceps · Rear Delts', color: '#10b981', exercises: [], tags: ['tag_pull'] },
      Wed: { type: 'lift', focus: 'Legs + Core', muscles: 'Quads · Hamstrings · Glutes · Core', color: '#f59e0b', exercises: [], tags: ['tag_legs', 'tag_core'] },
      Thu: { type: 'rest', focus: 'Rest', color: '#64748b', exercises: [], tags: ['tag_rest'] },
      Fri: { type: 'lift', focus: 'Upper', muscles: 'Chest · Back · Shoulders · Arms', color: '#3b82f6', exercises: [], tags: ['tag_push', 'tag_pull'] },
      Sat: { type: 'lift', focus: 'Lower', muscles: 'Quads · Hamstrings · Glutes · Core', color: '#f59e0b', exercises: [], tags: ['tag_legs', 'tag_core'] },
      Sun: { type: 'rest', focus: 'Rest', color: '#64748b', exercises: [], tags: ['tag_rest'] },
    },
  },
];

const pe = (id: string, name: string, sets: string, reps: string, rest: string, isCardio?: boolean, duration?: string): Exercise => ({
  id, name, sets, reps, rest, note: '', ...(isCardio ? { isCardio: true } : {}), ...(duration ? { duration } : {}),
});

export const PRESET_ROUTINES: Routine[] = [
  {
    id: 'pr_push_std',
    name: 'Push — Standard',
    tags: ['tag_push'],
    starred: false,
    isPreset: true,
    exercises: [
      pe('pr_push_std_1', 'Bench Press', '4', '8–10', '90s'),
      pe('pr_push_std_2', 'Machine Shoulder Press', '3', '10–12', '60s'),
      pe('pr_push_std_3', 'Cable Fly (Low to High)', '3', '12–15', '45s'),
      pe('pr_push_std_4', 'Cable Lateral Raise', '3', '15', '30s'),
      pe('pr_push_std_5', 'Tricep Pushdown (Rope)', '3', '12', '45s'),
    ],
  },
  {
    id: 'pr_push_chest',
    name: 'Push — Chest Focus',
    tags: ['tag_push'],
    starred: false,
    isPreset: true,
    exercises: [
      pe('pr_push_ch_1', 'Incline Bench Press (Barbell)', '4', '8–10', '90s'),
      pe('pr_push_ch_2', 'Bench Press', '4', '8–10', '90s'),
      pe('pr_push_ch_3', 'Pec Deck Machine', '3', '12–15', '45s'),
      pe('pr_push_ch_4', 'Cable Fly (High to Low)', '3', '12–15', '45s'),
      pe('pr_push_ch_5', 'Overhead Tricep Extension (Cable)', '3', '12', '60s'),
    ],
  },
  {
    id: 'pr_push_shoulder',
    name: 'Push — Shoulder Focus',
    tags: ['tag_push'],
    starred: false,
    isPreset: true,
    exercises: [
      pe('pr_push_sh_1', 'Barbell Overhead Press', '4', '6–10', '90s'),
      pe('pr_push_sh_2', 'Dumbbell Shoulder Press', '3', '10–12', '60s'),
      pe('pr_push_sh_3', 'Cable Lateral Raise', '3', '15', '30s'),
      pe('pr_push_sh_4', 'Rear Delt Fly (Dumbbell)', '3', '15', '30s'),
      pe('pr_push_sh_5', 'Skull Crushers (EZ Bar)', '3', '10–12', '60s'),
    ],
  },
  {
    id: 'pr_pull_std',
    name: 'Pull — Standard',
    tags: ['tag_pull'],
    starred: false,
    isPreset: true,
    exercises: [
      pe('pr_pull_std_1', 'Lat Pulldown (Wide Grip)', '4', '10–12', '60s'),
      pe('pr_pull_std_2', 'Seated Cable Row', '3', '10–12', '60s'),
      pe('pr_pull_std_3', 'Cable Face Pull', '3', '15–20', '30s'),
      pe('pr_pull_std_4', 'Hammer Curl', '3', '12', '45s'),
      pe('pr_pull_std_5', 'Cable Curl', '3', '12', '45s'),
    ],
  },
  {
    id: 'pr_pull_back',
    name: 'Pull — Back Focus',
    tags: ['tag_pull'],
    starred: false,
    isPreset: true,
    exercises: [
      pe('pr_pull_bk_1', 'Pull-Up', '4', '6–10', '90s'),
      pe('pr_pull_bk_2', 'Barbell Row (Bent Over)', '4', '8–10', '90s'),
      pe('pr_pull_bk_3', 'T-Bar Row', '3', '10–12', '60s'),
      pe('pr_pull_bk_4', 'Dumbbell Row (Single Arm)', '3', '10–12', '60s'),
      pe('pr_pull_bk_5', 'Cable Face Pull', '3', '15–20', '30s'),
    ],
  },
  {
    id: 'pr_pull_bicep',
    name: 'Pull — Bicep Focus',
    tags: ['tag_pull'],
    starred: false,
    isPreset: true,
    exercises: [
      pe('pr_pull_bi_1', 'Lat Pulldown (Wide Grip)', '4', '10–12', '60s'),
      pe('pr_pull_bi_2', 'Seated Cable Row', '3', '10–12', '60s'),
      pe('pr_pull_bi_3', 'EZ Bar Curl', '3', '10–12', '60s'),
      pe('pr_pull_bi_4', 'Preacher Curl', '3', '12', '45s'),
      pe('pr_pull_bi_5', 'Concentration Curl', '3', '12 each', '30s'),
    ],
  },
  {
    id: 'pr_legs_std',
    name: 'Legs — Standard',
    tags: ['tag_legs'],
    starred: false,
    isPreset: true,
    exercises: [
      pe('pr_legs_std_1', 'Barbell Squat', '4', '8–10', '90s'),
      pe('pr_legs_std_2', 'Hamstring Curl', '3', '12', '45s'),
      pe('pr_legs_std_3', 'Leg Extension (Machine)', '3', '12–15', '45s'),
      pe('pr_legs_std_4', 'Glute Kickback (Cable)', '3', '15 each', '30s'),
      pe('pr_legs_std_5', 'Plank', '3', '30–45s hold', '30s'),
    ],
  },
  {
    id: 'pr_legs_glute',
    name: 'Legs — Glute Focus',
    tags: ['tag_legs'],
    starred: false,
    isPreset: true,
    exercises: [
      pe('pr_legs_gl_1', 'Hip Thrust (Barbell)', '4', '10–12', '60s'),
      pe('pr_legs_gl_2', 'Romanian Deadlift (RDL)', '3', '10–12', '60s'),
      pe('pr_legs_gl_3', 'Bulgarian Split Squat', '3', '10–12 each', '60s'),
      pe('pr_legs_gl_4', 'Hip Abduction Machine', '3', '15–20', '30s'),
      pe('pr_legs_gl_5', 'Calf Raise (Standing)', '4', '15', '30s'),
    ],
  },
  {
    id: 'pr_legs_quad',
    name: 'Legs — Quad Focus',
    tags: ['tag_legs'],
    starred: false,
    isPreset: true,
    exercises: [
      pe('pr_legs_qu_1', 'Barbell Squat', '4', '8–10', '90s'),
      pe('pr_legs_qu_2', 'Leg Press', '4', '10–12', '90s'),
      pe('pr_legs_qu_3', 'Bulgarian Split Squat', '3', '10–12 each', '60s'),
      pe('pr_legs_qu_4', 'Leg Extension (Machine)', '3', '12–15', '45s'),
      pe('pr_legs_qu_5', 'Walking Lunges', '3', '12 each', '45s'),
    ],
  },
  {
    id: 'pr_core_std',
    name: 'Core — Standard',
    tags: ['tag_core'],
    starred: false,
    isPreset: true,
    exercises: [
      pe('pr_core_std_1', 'Dead Bug', '3', '10 each side', '30s'),
      pe('pr_core_std_2', 'Cable Crunch', '3', '15', '30s'),
      pe('pr_core_std_3', 'Plank', '3', '30–45s hold', '30s'),
    ],
  },
  {
    id: 'pr_core_intense',
    name: 'Core — Intense',
    tags: ['tag_core'],
    starred: false,
    isPreset: true,
    exercises: [
      pe('pr_core_int_1', 'Ab Wheel Rollout', '3', '10–12', '45s'),
      pe('pr_core_int_2', 'Hanging Leg Raise', '3', '12–15', '45s'),
      pe('pr_core_int_3', 'Russian Twist', '3', '20 total', '30s'),
      pe('pr_core_int_4', 'Side Plank', '3', '30s each side', '30s'),
    ],
  },
  {
    id: 'pr_cardio_tread',
    name: 'Cardio — Treadmill',
    tags: ['tag_cardio'],
    starred: false,
    isPreset: true,
    exercises: [pe('pr_cardio_t_1', 'Treadmill', '', '', '', true, '30')],
  },
  {
    id: 'pr_cardio_bike',
    name: 'Cardio — Bike',
    tags: ['tag_cardio'],
    starred: false,
    isPreset: true,
    exercises: [pe('pr_cardio_b_1', 'Stationary Bike', '', '', '', true, '30')],
  },
  {
    id: 'pr_cardio_run',
    name: 'Cardio — Run',
    tags: ['tag_cardio'],
    starred: false,
    isPreset: true,
    exercises: [pe('pr_cardio_r_1', 'Running (Outdoor)', '', '', '', true, '30')],
  },
  {
    id: 'pr_fullbody_std',
    name: 'Full Body — Standard',
    tags: ['tag_push', 'tag_pull', 'tag_legs'],
    starred: false,
    isPreset: true,
    exercises: [
      pe('pr_fb_std_1', 'Barbell Squat', '4', '8–10', '90s'),
      pe('pr_fb_std_2', 'Bench Press', '4', '8–10', '90s'),
      pe('pr_fb_std_3', 'Lat Pulldown (Wide Grip)', '3', '10–12', '60s'),
      pe('pr_fb_std_4', 'Machine Shoulder Press', '3', '10–12', '60s'),
      pe('pr_fb_std_5', 'Plank', '3', '30–45s hold', '30s'),
    ],
  },
  {
    id: 'pr_fullbody_compound',
    name: 'Full Body — Compound',
    tags: ['tag_push', 'tag_pull', 'tag_legs'],
    starred: false,
    isPreset: true,
    exercises: [
      pe('pr_fb_cmp_1', 'Conventional Deadlift', '4', '5', '2–3 min'),
      pe('pr_fb_cmp_2', 'Bench Press', '4', '8–10', '90s'),
      pe('pr_fb_cmp_3', 'Barbell Row (Bent Over)', '4', '8–10', '90s'),
      pe('pr_fb_cmp_4', 'Barbell Overhead Press', '3', '6–10', '90s'),
      pe('pr_fb_cmp_5', 'Plank', '3', '30–45s hold', '30s'),
    ],
  },
];