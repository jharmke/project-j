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

export const DEFAULT_PROGRAM: Record<string, DayProgram> = {
  Wed: { type: 'lift', focus: 'Push', muscles: 'Chest · Shoulders · Triceps', color: '#3b82f6', exercises: [
    { id: 'w1', name: 'Machine Chest Press', sets: '4', reps: '10–12', rest: '60s', note: '' },
    { id: 'w2', name: 'Cable Fly (Low to High)', sets: '3', reps: '12–15', rest: '45s', note: '' },
    { id: 'w3', name: 'Machine Shoulder Press', sets: '3', reps: '10–12', rest: '60s', note: '' },
    { id: 'w4', name: 'Cable Lateral Raise', sets: '3', reps: '15', rest: '30s', note: '' },
    { id: 'w5', name: 'Tricep Pushdown (Rope)', sets: '3', reps: '12', rest: '45s', note: '' },
    { id: 'w6', name: 'Overhead Tricep Extension (Cable)', sets: '2', reps: '12 → drop → failure', rest: '60s', note: '', dropset: true },
  ]},
  Sat: { type: 'lift', focus: 'Pull', muscles: 'Back · Biceps · Rear Delts', color: '#10b981', exercises: [
    { id: 's1', name: 'Lat Pulldown (Wide Grip)', sets: '4', reps: '10–12', rest: '60s', note: '' },
    { id: 's2', name: 'Seated Cable Row', sets: '3', reps: '10–12', rest: '60s', note: '' },
    { id: 's3', name: 'Machine Row', sets: '3', reps: '12', rest: '45s', note: '' },
    { id: 's4', name: 'Cable Face Pull', sets: '3', reps: '15–20', rest: '30s', note: '' },
    { id: 's5', name: 'Hammer Curl', sets: '3', reps: '12', rest: '45s', note: '' },
    { id: 's6', name: 'Cable Curl', sets: '2', reps: '10 → drop → failure', rest: '60s', note: '', dropset: true },
  ]},
  Sun: { type: 'lift', focus: 'Legs + Core', muscles: 'Quads · Hamstrings · Glutes · Core', color: '#f59e0b', exercises: [
    { id: 'su1', name: 'Leg Press', sets: '4', reps: '10–12', rest: '90s', note: '' },
    { id: 'su2', name: 'Leg Extension (Machine)', sets: '3', reps: '12–15', rest: '45s', note: '' },
    { id: 'su3', name: 'Hamstring Curl', sets: '3', reps: '12', rest: '45s', note: '' },
    { id: 'su4', name: 'Glute Kickback (Cable)', sets: '3', reps: '15 each', rest: '30s', note: '' },
    { id: 'su5', name: 'Plank', sets: '3', reps: '30–45s hold', rest: '30s', note: '' },
    { id: 'su6', name: 'Dead Bug', sets: '3', reps: '10 each side', rest: '30s', note: '' },
    { id: 'su7', name: 'Cable Crunch', sets: '3', reps: '15', rest: '30s', note: '' },
  ]},
  Mon: { type: 'cardio', focus: 'Cardio', exercises: [] },
  Tue: { type: 'cardio', focus: 'Cardio', exercises: [] },
  Thu: { type: 'cardio', focus: 'Cardio', exercises: [] },
  Fri: { type: 'cardio', focus: 'Cardio', exercises: [] },
};