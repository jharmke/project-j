// ── Lift PR engine (single source of truth, pure + testable) ──────────────────────────────────────
// PRs are DERIVED from real logged history (setLogs), never ratcheted-and-stuck. Any set change
// (check / uncheck / edit / add / remove / delete-exercise) recomputes the lift's all-time best from
// scratch, so an unchecked or lowered set correctly ROLLS BACK a record it no longer earns. "up from"
// numbers read the true prior best (not a same-session intermediate), so they stay honest.
//
// This module holds ZERO app/React state: the caller injects a `resolveDay` that maps a date to that
// day's exercise list, so the same code powers the live workout screen and the unit tests.
import type { SetEntry, PRRecord } from '../workoutData';

export type BestW = PRRecord['bestWeight'];
export type BestE = PRRecord['bestE1RM'];
export type SetLogs = Record<string, Record<string, SetEntry[]>>;
export type PRMap = Record<string, PRRecord>;
export type HitMap = Record<string, Record<string, any>>;

// Maps a date key to the exercises logged/programmed that day, so a set (keyed by exerciseId) can be
// traced back to a lift name. A day that has been deleted from the program simply resolves to [].
export type ResolveDay = (dateKey: string) => { id: string; name: string; isCardio?: boolean; weightUnit?: 'lb' | 'kg' }[];

export const normalizeLiftName = (name: string) => (name || '').trim().toLowerCase().replace(/\s+/g, ' ');
export const epley = (w: number, r: number) => w * (1 + r / 30);

// Canonical comparison unit is kg. Every weight is converted to kg ONLY to decide which set is heavier
// / has the higher est-1RM, so a user who mixes lb and kg on one lift never breaks a record. The value
// the user actually entered (plus its unit) is what gets stored and displayed -- a converted number is
// never shown. Missing unit = 'lb', so all pre-existing lb-only history compares exactly as before.
export const LB_PER_KG = 2.2046226218;
export const toKg = (w: number, unit?: 'lb' | 'kg') => (unit === 'kg' ? w : w / LB_PER_KG);

// Pick the heavier of two best-weight records (compared in kg; tie broken by reps); null-safe.
export const heavier = (a: BestW, b: BestW): BestW => {
  if (!a) return b; if (!b) return a;
  const ak = toKg(a.value, a.unit), bk = toKg(b.value, b.unit);
  return (bk > ak || (bk === ak && (b.reps || 0) > (a.reps || 0))) ? b : a;
};
// Pick the higher of two est-1RM records (compared in kg); null-safe.
export const higherE = (a: BestE, b: BestE): BestE => {
  if (!a) return b; if (!b) return a;
  return toKg(b.value, b.unit) > toKg(a.value, a.unit) ? b : a;
};

// Scan logged history for one lift and return its best weight + best est. 1RM. `opts.beforeDate`
// restricts to days strictly before a cutoff (the "prior best"); `opts.onlyDay` restricts to one day.
export const computeLiftBest = (
  name: string,
  logs: SetLogs,
  resolveDay: ResolveDay,
  opts?: { beforeDate?: string; onlyDay?: string },
): { bestWeight: BestW; bestE1RM: BestE } => {
  const target = normalizeLiftName(name);
  if (!target) return { bestWeight: null, bestE1RM: null };
  let bw: BestW = null, be: BestE = null;
  for (const d of Object.keys(logs)) {
    if (opts?.beforeDate && !(d < opts.beforeDate)) continue;
    if (opts?.onlyDay && d !== opts.onlyDay) continue;
    const dayLogs = logs[d];
    if (!dayLogs) continue;
    for (const ex of resolveDay(d)) {
      if (normalizeLiftName(ex.name) !== target) continue;
      const sets = dayLogs[ex.id];
      if (!sets) continue;
      const u = ex.weightUnit || 'lb';
      for (const s of sets) {
        const w = s.weight || 0, r = s.reps || 0;
        if (!s.done || w <= 0 || r <= 0) continue;
        bw = heavier(bw, { value: w, reps: r, dateKey: d, unit: u });
        if (r <= 12) be = higherE(be, { value: Math.round(epley(w, r)), weight: w, reps: r, dateKey: d, unit: u });
      }
    }
  }
  return { bestWeight: bw, bestE1RM: be };
};

// Does a given day actually hold a logged (mapped) set for this lift? If NOT, a stored PR pointing at
// that day is "unbacked" (a dev-seeded baseline, or a record whose program was later deleted) and must
// be preserved as a floor rather than wiped -- but only when it predates the day being judged, so
// deleting today's own exercise still revokes today's PR.
//
// KNOWN EDGE (real users are unaffected -- their prior best is always in the logs): if an UNBACKED
// record is BEATEN and then fully undone in the SAME session, the floor is lost (the record was
// rewritten to today's value, which then rolls back to nothing). This only touches a dev seed or a
// deleted-program record beaten-then-uncrossed the same day -- vanishingly rare, no real logged data
// at stake. Not worth a persistent-baseline field to solve.
export const dayHasLoggedLift = (target: string, dateKey: string, logs: SetLogs, resolveDay: ResolveDay) => {
  const dayLogs = logs[dateKey];
  if (!dayLogs) return false;
  for (const ex of resolveDay(dateKey)) {
    if (normalizeLiftName(ex.name) === target && dayLogs[ex.id] && dayLogs[ex.id].length) return true;
  }
  return false;
};

// One past session for a lift: the day's top (heaviest) done+weighted set, plus that day's best est.
// 1RM. Used by the PR home's per-lift "History" list. Sorted newest-first by the caller.
export interface LiftSession {
  dateKey: string;
  topWeight: number;
  topReps: number;
  e1rm: number | null;
  unit?: 'lb' | 'kg'; // the unit topWeight / e1rm were lifted in (missing = 'lb')
}

// Every day this lift was logged (done + weighted), newest first, with that day's heaviest set.
export const liftSessionHistory = (name: string, logs: SetLogs, resolveDay: ResolveDay): LiftSession[] => {
  const target = normalizeLiftName(name);
  if (!target) return [];
  const out: LiftSession[] = [];
  for (const d of Object.keys(logs)) {
    const dayLogs = logs[d];
    if (!dayLogs) continue;
    let top: { w: number; r: number; u: 'lb' | 'kg' } | null = null;
    let bestE: number | null = null, bestEk = -1;
    for (const ex of resolveDay(d)) {
      if (normalizeLiftName(ex.name) !== target) continue;
      const sets = dayLogs[ex.id];
      if (!sets) continue;
      const u = ex.weightUnit || 'lb';
      for (const s of sets) {
        const w = s.weight || 0, r = s.reps || 0;
        if (!s.done || w <= 0 || r <= 0) continue;
        const wk = toKg(w, u);
        if (!top || wk > toKg(top.w, top.u) || (wk === toKg(top.w, top.u) && r > top.r)) top = { w, r, u };
        if (r <= 12) { const e = Math.round(epley(w, r)); const ek = toKg(e, u); if (bestE === null || ek > bestEk) { bestE = e; bestEk = ek; } }
      }
    }
    if (top) out.push({ dateKey: d, topWeight: top.w, topReps: top.r, e1rm: bestE, unit: top.u });
  }
  return out.sort((a, b) => (a.dateKey < b.dateKey ? 1 : a.dateKey > b.dateKey ? -1 : 0));
};

export interface RecomputeResult {
  prs: PRMap;      // updated all-time records (the lift's entry may be raised, lowered, or dropped)
  hits: HitMap;    // updated prHitsByDay (judgeDay's entry may be set or revoked)
  hit: any | null; // the PR to surface via Otto for judgeDay, or null
  revoked: boolean;// true when judgeDay HAD a hit that this recompute removed (clear the Otto card)
}

// Recompute one lift's PR from history + protected floor, and re-judge whether `judgeDay` earned a hit.
// Pure: returns updated maps + what to do with the Otto card. `now` is injected for deterministic tests.
export const recomputeLiftPR = (
  name: string,
  logs: SetLogs,
  resolveDay: ResolveDay,
  currentPrs: PRMap,
  currentHits: HitMap,
  judgeDay: string,
  now: number,
): RecomputeResult => {
  const key = normalizeLiftName(name);
  if (!key) return { prs: currentPrs, hits: currentHits, hit: null, revoked: false };
  const stored = currentPrs[key];
  // Protected floor: keep a stored best the logs can't explain, but only if it predates judgeDay.
  const floorW: BestW = (stored?.bestWeight && stored.bestWeight.dateKey < judgeDay && !dayHasLoggedLift(key, stored.bestWeight.dateKey, logs, resolveDay)) ? stored.bestWeight : null;
  const floorE: BestE = (stored?.bestE1RM && stored.bestE1RM.dateKey < judgeDay && !dayHasLoggedLift(key, stored.bestE1RM.dateKey, logs, resolveDay)) ? stored.bestE1RM : null;

  const all = computeLiftBest(name, logs, resolveDay);
  const before = computeLiftBest(name, logs, resolveDay, { beforeDate: judgeDay });
  const today = computeLiftBest(name, logs, resolveDay, { onlyDay: judgeDay });

  const finalW = heavier(all.bestWeight, floorW);
  const finalE = higherE(all.bestE1RM, floorE);
  const priorW = heavier(before.bestWeight, floorW); // true best BEFORE judgeDay -> honest "up from"
  const priorE = higherE(before.bestE1RM, floorE);

  let nextPrs = currentPrs;
  if (finalW || finalE) {
    nextPrs = { ...currentPrs, [key]: { name, bestWeight: finalW, bestE1RM: finalE, updatedAt: judgeDay } };
  } else if (stored) {
    nextPrs = { ...currentPrs }; delete nextPrs[key]; // nothing supports a record anymore -> drop it
  }

  // Compare today vs the prior best in kg so a unit switch between sessions is judged honestly.
  const weightPR = !!(today.bestWeight && (!priorW || toKg(today.bestWeight.value, today.bestWeight.unit) > toKg(priorW.value, priorW.unit)));
  const e1rmPR = !!(today.bestE1RM && (!priorE || toKg(today.bestE1RM.value, today.bestE1RM.unit) > toKg(priorE.value, priorE.unit)));
  const hadHit = !!currentHits[judgeDay]?.[key];
  let hit: any = null, nextHits = currentHits;
  if (weightPR || e1rmPR) {
    hit = {
      name, weightPR, e1rmPR,
      weightVal: today.bestWeight?.value, weightReps: today.bestWeight?.reps,
      e1rmVal: today.bestE1RM?.value,
      unit: today.bestWeight?.unit || today.bestE1RM?.unit || 'lb', // unit of today's weightVal / e1rmVal
      prevWeightVal: priorW?.value, prevE1rmVal: priorE?.value,
      prevWeightUnit: priorW?.unit, prevE1rmUnit: priorE?.unit,   // prior best may be in a different unit
      at: now,
    };
    nextHits = { ...currentHits, [judgeDay]: { ...(currentHits[judgeDay] || {}), [key]: hit } };
  } else if (hadHit) {
    const dayHits = { ...currentHits[judgeDay] }; delete dayHits[key];
    nextHits = { ...currentHits, [judgeDay]: dayHits };
  }
  return { prs: nextPrs, hits: nextHits, hit, revoked: hadHit && !hit };
};
