export interface Exercise {
  id: string;
  name: string;
  sets: string;
  reps: string;
  rest: string;
  note: string;
  dropset?: boolean;
  isCardio?: boolean;
}

export interface WorkoutTag {
  id: string;
  label: string;
  color: string;
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

export const TAG_COLOR_PALETTE = [
  '#3b82f6', '#10b981', '#f59e0b', '#f97316',
  '#ef4444', '#8b5cf6', '#14b8a6', '#ec4899',
  '#6366f1', '#06b6d4', '#f43f5e', '#64748b',
];

export const DEFAULT_TAGS: WorkoutTag[] = [
  { id: 'tag_push',    label: 'Push',         color: '#3b82f6' },
  { id: 'tag_pull',    label: 'Pull',         color: '#10b981' },
  { id: 'tag_legs',    label: 'Legs + Core',  color: '#f59e0b' },
  { id: 'tag_cardio',  label: 'Cardio',       color: '#f97316' },
  { id: 'tag_rest',    label: 'Rest',         color: '#64748b' },
];

export const BLANK_DAY: DayProgram = {
  type: 'unassigned',
  focus: '',
  exercises: [],
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
      Fri: { type: 'lift', focus: 'Legs + Core', muscles: 'Quads · Hamstrings · Glutes · Core', color: '#f59e0b', exercises: [], tags: ['tag_legs'] },
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
      Tue: { type: 'lift', focus: 'Lower', muscles: 'Quads · Hamstrings · Glutes · Core', color: '#f59e0b', exercises: [], tags: ['tag_legs'] },
      Wed: { type: 'rest', focus: 'Rest', color: '#64748b', exercises: [], tags: ['tag_rest'] },
      Thu: { type: 'lift', focus: 'Upper', muscles: 'Chest · Back · Shoulders · Arms', color: '#3b82f6', exercises: [], tags: ['tag_push', 'tag_pull'] },
      Fri: { type: 'lift', focus: 'Lower', muscles: 'Quads · Hamstrings · Glutes · Core', color: '#f59e0b', exercises: [], tags: ['tag_legs'] },
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
      Wed: { type: 'lift', focus: 'Legs + Core', muscles: 'Quads · Hamstrings · Glutes · Core', color: '#f59e0b', exercises: [], tags: ['tag_legs'] },
      Thu: { type: 'rest', focus: 'Rest', color: '#64748b', exercises: [], tags: ['tag_rest'] },
      Fri: { type: 'lift', focus: 'Upper', muscles: 'Chest · Back · Shoulders · Arms', color: '#3b82f6', exercises: [], tags: ['tag_push', 'tag_pull'] },
      Sat: { type: 'lift', focus: 'Lower', muscles: 'Quads · Hamstrings · Glutes · Core', color: '#f59e0b', exercises: [], tags: ['tag_legs'] },
      Sun: { type: 'rest', focus: 'Rest', color: '#64748b', exercises: [], tags: ['tag_rest'] },
    },
  },
];