// utils/bodyMeasurements.ts
// Data foundation for Body Measurements v1. Pure logic + AsyncStorage, no UI.
// See SPEC_body_measurements.md.
//
// Canonical storage unit is INCHES. cm is a display/input convenience converted at the
// edges, so the Navy body-fat formula (which is defined in inches) is always correct and a
// unit-pref change never rewrites stored data.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { storageSet } from './storage';

export type MeasurementUnit = 'in' | 'cm';
export type GoalDirection = 'cutting' | 'bulking' | 'maintaining';

// The 13 circumference fields (all stored in inches, null when not logged).
export type MeasureFieldKey =
  | 'neck' | 'chest' | 'shoulders'
  | 'waist' | 'hips'
  | 'leftBicep' | 'rightBicep' | 'leftForearm' | 'rightForearm'
  | 'leftThigh' | 'rightThigh' | 'leftCalf' | 'rightCalf';

export type MeasureRegion = 'Upper Body' | 'Core' | 'Arms' | 'Legs';

export interface MeasureFieldDef {
  key: MeasureFieldKey;
  label: string;       // display label, capitalized
  short: string;       // compact label for pills / condensed grid
  region: MeasureRegion;
}

// Order matters: drives the form, the how-to index, and default condensed slots.
export const MEASURE_FIELDS: MeasureFieldDef[] = [
  { key: 'neck',         label: 'Neck',          short: 'Neck',     region: 'Upper Body' },
  { key: 'chest',        label: 'Chest',         short: 'Chest',    region: 'Upper Body' },
  { key: 'shoulders',    label: 'Shoulders',     short: 'Shldrs',   region: 'Upper Body' },
  { key: 'waist',        label: 'Waist',         short: 'Waist',    region: 'Core' },
  { key: 'hips',         label: 'Hips',          short: 'Hips',     region: 'Core' },
  { key: 'leftBicep',    label: 'Left Bicep',    short: 'L Bicep',  region: 'Arms' },
  { key: 'rightBicep',   label: 'Right Bicep',   short: 'R Bicep',  region: 'Arms' },
  { key: 'leftForearm',  label: 'Left Forearm',  short: 'L Fore',   region: 'Arms' },
  { key: 'rightForearm', label: 'Right Forearm', short: 'R Fore',   region: 'Arms' },
  { key: 'leftThigh',    label: 'Left Thigh',    short: 'L Thigh',  region: 'Legs' },
  { key: 'rightThigh',   label: 'Right Thigh',   short: 'R Thigh',  region: 'Legs' },
  { key: 'leftCalf',     label: 'Left Calf',     short: 'L Calf',   region: 'Legs' },
  { key: 'rightCalf',    label: 'Right Calf',    short: 'R Calf',   region: 'Legs' },
];

export const MEASURE_REGIONS: MeasureRegion[] = ['Upper Body', 'Core', 'Arms', 'Legs'];

export function fieldsForRegion(region: MeasureRegion): MeasureFieldDef[] {
  return MEASURE_FIELDS.filter(f => f.region === region);
}

// One dated logging session. Circumference values in inches; bodyFat is the Navy % snapshot
// computed from this entry's own values at save time (recomputed on edit).
export interface BodyMeasurementEntry {
  id: string;
  date: string;       // YYYY-MM-DD (local calendar day)
  timestamp: string;  // ISO, exact log time
  values: Partial<Record<MeasureFieldKey, number | null>>; // inches
  bodyFat: number | null; // Navy method %, null when inputs missing
}

const STORAGE_KEY = 'pj_body_measurements';

// ── Unit conversion ───────────────────────────────────────────────────────────
export const inToCm = (v: number): number => v * 2.54;
export const cmToIn = (v: number): number => v / 2.54;

// Stored inches -> display value in the user's unit (rounded to 1 decimal).
export function toDisplay(valueIn: number, unit: MeasurementUnit): number {
  const v = unit === 'cm' ? inToCm(valueIn) : valueIn;
  return Math.round(v * 10) / 10;
}

// A user-typed value in their unit -> canonical inches for storage.
export function fromInput(typed: number, unit: MeasurementUnit): number {
  return unit === 'cm' ? cmToIn(typed) : typed;
}

export const unitLabel = (unit: MeasurementUnit): string => (unit === 'cm' ? 'cm' : 'in');

// ── Navy body fat ─────────────────────────────────────────────────────────────
// Inputs in inches. Male needs neck + waist; female needs neck + waist + hips. Returns a
// clamped %, or null when required inputs are missing or the math is out of range.
export function navyBodyFat(
  sex: 'male' | 'female',
  heightIn: number | null,
  v: Partial<Record<MeasureFieldKey, number | null>>,
): number | null {
  if (!heightIn || heightIn <= 0) return null;
  const neck = v.neck ?? null;
  const waist = v.waist ?? null;
  const hips = v.hips ?? null;
  if (!neck || !waist || neck <= 0 || waist <= 0) return null;
  let bf: number;
  if (sex === 'female') {
    if (!hips || hips <= 0) return null;
    const inner = waist + hips - neck;
    if (inner <= 0) return null;
    bf = 163.205 * Math.log10(inner) - 97.684 * Math.log10(heightIn) - 78.387;
  } else {
    const inner = waist - neck;
    if (inner <= 0) return null; // waist must exceed neck for the male formula
    bf = 86.010 * Math.log10(inner) - 70.041 * Math.log10(heightIn) + 36.76;
  }
  if (!Number.isFinite(bf)) return null;
  const clamped = Math.max(2, Math.min(60, bf));
  return Math.round(clamped * 10) / 10;
}

// ── Storage ───────────────────────────────────────────────────────────────────
export async function loadMeasurements(): Promise<BodyMeasurementEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Newest first for history; callers that need oldest-first reverse it.
    return parsed
      .filter((e: any) => e && e.id && e.date && e.values)
      .sort((a: BodyMeasurementEntry, b: BodyMeasurementEntry) => (a.timestamp < b.timestamp ? 1 : -1));
  } catch {
    return [];
  }
}

async function persist(entries: BodyMeasurementEntry[]): Promise<void> {
  await storageSet(STORAGE_KEY, JSON.stringify(entries));
}

function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Strip empty/zero fields to null so "not logged" is honest (never saved as 0).
function cleanValues(values: Partial<Record<MeasureFieldKey, number | null>>): Partial<Record<MeasureFieldKey, number | null>> {
  const out: Partial<Record<MeasureFieldKey, number | null>> = {};
  for (const f of MEASURE_FIELDS) {
    const v = values[f.key];
    out[f.key] = typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null;
  }
  return out;
}

// True when at least one field has a value (don't save a fully empty session).
export function hasAnyValue(values: Partial<Record<MeasureFieldKey, number | null>>): boolean {
  return MEASURE_FIELDS.some(f => {
    const v = values[f.key];
    return typeof v === 'number' && Number.isFinite(v) && v > 0;
  });
}

// Add a NEW dated entry for today. Read-then-merge: never rewrites other entries.
export async function addMeasurement(
  values: Partial<Record<MeasureFieldKey, number | null>>,
  bodyFat: number | null,
): Promise<BodyMeasurementEntry> {
  const entries = await loadMeasurements();
  const now = new Date();
  const entry: BodyMeasurementEntry = {
    id: `bm_${now.getTime()}_${Math.floor(Math.random() * 100000)}`,
    date: localDateKey(now),
    timestamp: now.toISOString(),
    values: cleanValues(values),
    bodyFat,
  };
  await persist([entry, ...entries]);
  return entry;
}

// Edit any existing entry (by id). Recomputes nothing here -- caller passes the fresh bodyFat.
export async function updateMeasurement(
  id: string,
  values: Partial<Record<MeasureFieldKey, number | null>>,
  bodyFat: number | null,
): Promise<void> {
  const entries = await loadMeasurements();
  const next = entries.map(e => (e.id === id ? { ...e, values: cleanValues(values), bodyFat } : e));
  await persist(next);
}

export async function deleteMeasurement(id: string): Promise<void> {
  const entries = await loadMeasurements();
  await persist(entries.filter(e => e.id !== id));
}

// ── Derived views ─────────────────────────────────────────────────────────────
export interface LastKnown { value: number; date: string; entryId: string; } // value in inches

// Most recent logged value for a field (each field tracked independently), with its date.
export function lastKnownFor(entries: BodyMeasurementEntry[], key: MeasureFieldKey): LastKnown | null {
  // entries are newest-first from loadMeasurements
  for (const e of entries) {
    const v = e.values[key];
    if (typeof v === 'number' && v > 0) return { value: v, date: e.date, entryId: e.id };
  }
  return null;
}

// Oldest logged value for a field -- the baseline for "delta from start".
export function firstKnownFor(entries: BodyMeasurementEntry[], key: MeasureFieldKey): LastKnown | null {
  for (let i = entries.length - 1; i >= 0; i--) {
    const e = entries[i];
    const v = e.values[key];
    if (typeof v === 'number' && v > 0) return { value: v, date: e.date, entryId: e.id };
  }
  return null;
}

// Delta (inches) from the first logged value to the latest for a field. null if <2 points.
export function deltaFromStart(entries: BodyMeasurementEntry[], key: MeasureFieldKey): number | null {
  const first = firstKnownFor(entries, key);
  const last = lastKnownFor(entries, key);
  if (!first || !last || first.entryId === last.entryId) return null;
  return Math.round((last.value - first.value) * 10) / 10;
}

// Most recent body-fat snapshot + its date.
export function lastKnownBodyFat(entries: BodyMeasurementEntry[]): { value: number; date: string } | null {
  for (const e of entries) {
    if (typeof e.bodyFat === 'number') return { value: e.bodyFat, date: e.date };
  }
  return null;
}

// ── Profile + settings helpers ────────────────────────────────────────────────
export interface BodyProfile {
  sex: 'male' | 'female';
  heightIn: number | null;
  weight: number | null; // lbs, latest known
}

export async function loadBodyProfile(): Promise<BodyProfile> {
  try {
    const raw = await AsyncStorage.getItem('pj_profile');
    const p = raw ? JSON.parse(raw) : {};
    const ft = parseFloat(p.heightFt);
    const inch = parseFloat(p.heightIn);
    const heightIn = Number.isFinite(ft) || Number.isFinite(inch)
      ? (Number.isFinite(ft) ? ft : 0) * 12 + (Number.isFinite(inch) ? inch : 0)
      : null;
    // Latest logged weight wins (daily records), falling back to the profile value, so the
    // snapshot/card never show a stale onboarding weight. Walk back up to ~13 months.
    let weight: number | null = null;
    const now = new Date();
    for (let i = 0; i < 400 && weight === null; i++) {
      const d = new Date(now); d.setDate(now.getDate() - i);
      const key = `pj_${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      try {
        const dayRaw = await AsyncStorage.getItem(key);
        const w = dayRaw ? parseFloat(JSON.parse(dayRaw)?.weight) : NaN;
        if (Number.isFinite(w) && w > 0) weight = w;
      } catch {}
    }
    if (weight === null) {
      const pw = parseFloat(p.weight);
      if (Number.isFinite(pw) && pw > 0) weight = pw;
    }
    return {
      sex: p.sex === 'female' ? 'female' : 'male',
      heightIn: heightIn && heightIn > 0 ? heightIn : null,
      weight,
    };
  } catch {
    return { sex: 'male', heightIn: null, weight: null };
  }
}

const SETTINGS_KEY = 'pj_settings';

export interface BodyMeasureSettings {
  unit: MeasurementUnit;
  goal: GoalDirection | null;
  slots: MeasureFieldKey[]; // 4-6 condensed-card slots
}

// Default condensed slots, biased by goal direction (smart default; user can override).
export function defaultSlotsForGoal(goal: GoalDirection | null): MeasureFieldKey[] {
  if (goal === 'cutting')    return ['waist', 'hips', 'chest', 'leftThigh'];
  if (goal === 'bulking')    return ['chest', 'shoulders', 'leftBicep', 'leftThigh'];
  // maintaining or unset: a balanced full-body glance
  return ['chest', 'waist', 'leftBicep', 'leftThigh'];
}

export async function loadBodyMeasureSettings(): Promise<BodyMeasureSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    const s = raw ? JSON.parse(raw) : {};
    const unit: MeasurementUnit = s.measurementUnit === 'cm' ? 'cm' : 'in';
    const goal: GoalDirection | null =
      s.bodyGoalDirection === 'cutting' || s.bodyGoalDirection === 'bulking' || s.bodyGoalDirection === 'maintaining'
        ? s.bodyGoalDirection : null;
    const savedSlots: MeasureFieldKey[] = Array.isArray(s.bodyCardSlots)
      ? s.bodyCardSlots.filter((k: any) => MEASURE_FIELDS.some(f => f.key === k))
      : [];
    const slots = savedSlots.length >= 1 ? savedSlots.slice(0, 6) : defaultSlotsForGoal(goal);
    return { unit, goal, slots };
  } catch {
    return { unit: 'in', goal: null, slots: defaultSlotsForGoal(null) };
  }
}

// Read-then-merge into pj_settings -- never clobbers other settings keys.
export async function saveBodyMeasureSettings(patch: Partial<{ unit: MeasurementUnit; goal: GoalDirection | null; slots: MeasureFieldKey[] }>): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    const cur = raw ? JSON.parse(raw) : {};
    const next = { ...cur };
    if (patch.unit !== undefined) next.measurementUnit = patch.unit;
    if (patch.goal !== undefined) next.bodyGoalDirection = patch.goal;
    if (patch.slots !== undefined) next.bodyCardSlots = patch.slots;
    await storageSet(SETTINGS_KEY, JSON.stringify(next));
  } catch {}
}

// Days since a YYYY-MM-DD date (local). Used for honest staleness labeling.
export function daysSince(dateKey: string): number {
  const [y, m, d] = dateKey.split('-').map(Number);
  if (!y || !m || !d) return 0;
  const then = new Date(y, m - 1, d).getTime();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.max(0, Math.round((today - then) / 86400000));
}

// "Today" / "3d ago" / "3mo ago" style relative label.
export function relativeAge(dateKey: string): string {
  const d = daysSince(dateKey);
  if (d <= 0) return 'Today';
  if (d === 1) return 'Yesterday';
  if (d < 30) return `${d}d ago`;
  if (d < 365) return `${Math.round(d / 30)}mo ago`;
  return `${Math.round(d / 365)}y ago`;
}

// Values older than this render muted ("stale") in the snapshot.
export const STALE_DAYS = 30;
