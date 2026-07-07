import AsyncStorage from '@react-native-async-storage/async-storage';
import { storageSet } from './storage';

// ── Custom Reports (Pro feature) : saved report CONFIGS ───────────────────────────────────────────
// A report persists only its CONFIG (name + date range + which blocks, in order). It renders LIVE from
// the app's existing data every time it's opened -- we never snapshot the underlying numbers -- so a
// report always reflects current data. pj_reports is the ONLY key this feature writes: additive,
// read-then-merge, never touches pj_workout_state / daily pj_* keys / any other store. Reports are real
// user-created content, so we write through storageSet (syncs/backs up like other user data).

export type ReportRangePreset = 'week' | 'month' | '3month' | '6month' | 'year' | 'custom';

export interface ReportRange {
  preset: ReportRangePreset;
  // 'custom' only: inclusive local date keys 'YYYY-MM-DD'. Ignored for presets (derived from today).
  startKey?: string;
  endKey?: string;
}

export interface Report {
  id: string;
  name: string;
  range: ReportRange;
  blockIds: string[];   // ordered; each maps to a reportBlockRegistry entry id
  createdAt: number;
  updatedAt: number;
}

const KEY = 'pj_reports';

const PRESET_DAYS: Record<Exclude<ReportRangePreset, 'custom'>, number> = {
  week: 7, month: 30, '3month': 90, '6month': 180, year: 365,
};

export const RANGE_LABELS: Record<ReportRangePreset, string> = {
  week: 'Week', month: 'Month', '3month': '3 Months', '6month': '6 Months', year: '1 Year', custom: 'Custom',
};

// Local YYYY-MM-DD for a Date (matches the daily pj_ key format, which is local).
function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Resolve a range to inclusive local date bounds + an inclusive day count, for querying the data layer.
// Presets end today and look back N-1 days (so 'week' = today + the prior 6 = 7 days inclusive).
export function resolveRange(range: ReportRange): { startKey: string; endKey: string; days: number } {
  if (range.preset === 'custom' && range.startKey && range.endKey) {
    const s = new Date(range.startKey + 'T12:00:00');
    const e = new Date(range.endKey + 'T12:00:00');
    const days = Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000) + 1);
    return { startKey: range.startKey, endKey: range.endKey, days };
  }
  const days = PRESET_DAYS[(range.preset === 'custom' ? 'month' : range.preset)];
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  return { startKey: dateKey(start), endKey: dateKey(end), days };
}

export async function loadReports(): Promise<Report[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Upsert by id (read-then-merge -- never rewrites the store blind). Returns the full updated list.
export async function saveReport(report: Report): Promise<Report[]> {
  const all = await loadReports();
  const exists = all.some(r => r.id === report.id);
  const next = exists ? all.map(r => (r.id === report.id ? report : r)) : [...all, report];
  await storageSet(KEY, JSON.stringify(next));
  return next;
}

export async function deleteReport(id: string): Promise<Report[]> {
  const all = await loadReports();
  const next = all.filter(r => r.id !== id);
  await storageSet(KEY, JSON.stringify(next));
  return next;
}

// Unique-enough id for a local config. (Date.now / Math.random are fine in app code -- the restriction is
// only inside Workflow scripts.)
export function newReportId(): string {
  return 'rpt_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e6).toString(36);
}
