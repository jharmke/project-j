# HANDOFF SPEC: Calorie Goal-Hit Logic Overhaul + Burn-Accuracy Audit

Status: PLANNED, NOT STARTED. No code written yet. This doc is a complete handoff so a fresh session can build it with zero context loss.
Created: 2026-05-29. Author: prior Claude Code session (audit + decisions complete).

---

## 0. READ FIRST (session rules, non-negotiable)

- Read `CLAUDE.md` and `project_j_roadmap.md` before touching anything. Standard start-of-session rule.
- Confirm with Justin before every file change. Restate the task, wait for explicit go-ahead.
- ONE change at a time, confirmed working before the next. Recommend a git commit after each gate-passing step.
- Update `project_j_roadmap.md` in real time the moment anything ships or a decision is made. Claude owns roadmap edits + git commits directly (no paste blocks).
- No double-dash (`--`) anywhere: not in code comments, not in user-facing strings, not in conversation. Use a colon, period, or reword.
- PowerShell only, git commands one at a time (`git add .` then `git commit -m "msg"` then `git push origin master`).
- Mode-awareness: every feature must define Discipline / Balanced / Mindful behavior. See Decision 1 below for how that applies here (it does NOT change the band).

THE DECISIONS BELOW ARE LOCKED. Do not re-litigate them. Justin signed off on all four plus the data caveat on 2026-05-29.

---

## 1. THE TASK

Two paired SOON roadmap items (they touch the same code paths, build together):

1. **Calorie goal-hit logic overhaul** (Way 1 / Way 2 model, approved 2026-05-29).
2. **Burn-accuracy app-wide consistency audit** (no raw HealthKit active-calorie value may appear in any user-facing calculation; the 100/90/80/70 modifier must be applied everywhere).

OUT OF SCOPE this build (parked, do NOT build):
- Deep-deficit floor + coaching nudge (needs dietitian-level threshold research first). Roadmap explicitly says do not build yet.
- NetCalBarChart (depends on this landing first; separate locked spec in roadmap).
- Weekly pace helper text in settings (separate SOON item).

---

## 2. WHY THIS EXISTS (the audit findings)

Goal-hit is currently computed **6 different ways**, all divergent. The roadmap claimed "achievements does it correctly" — IT DOES NOT (it uses raw active cals, an accuracy-rule violation). This is a rewrite to one shared util, not a reconcile.

### Goal-hit call sites (all must move to the shared util)

Line numbers are from 2026-05-29 and WILL drift. Search by pattern, not line number.

| # | File | Function / locus | Current formula |
|---|------|------------------|-----------------|
| 1 | `achievementData.ts` | `checkNutritionAchievements` (~L1856-1891) | `adjustedTarget = calTarget + (data.activeCalories ?? 0)` then hit if `consumed >= adjustedTarget-300 && consumed <= adjustedTarget+150`. **RAW active = burn-accuracy bug.** Drives nutrition_* achievements (1/10/30/50/75/100/200/365). Scans `pj_` daily keys, excludes today, writes `pj_nutrition_ach_checked = today`. |
| 2 | `app/(tabs)/index.tsx` | home calorie card (~L906-918) | `adjustedTarget = calTarget + hkCalories`; `calDelta = abs(totalCals - adjustedTarget)`; mode color tiers: Discipline good<=50/warn<=149/bad; Balanced good<=150/warn<=300/bad; Mindful textSecondary always. (Verify `hkCalories` already has accuracy applied.) |
| 3 | `app/(tabs)/stats.tsx` | `dayCellStatus` calendar dots (~L1105-1112) | `pct = calEntry.cal / calTarget * 100`; green 80-106, yellow 63-114, red else. |
| 4 | `app/(tabs)/stats.tsx` | At a Glance "CAL GOAL / DAY" = `calGoalDays` (~L398 compute, ~L1218 render). This is Justin's "0/7". | inside `loadPeriodData`: `if (pct >= 80 && pct <= 106) calGoalDays++` where pct is dayCal/calTarget. Displayed as `calGoalDays / loggedDays`. |
| 5 | `app/(tabs)/stats.tsx` | calorie streak in `loadStreaks` (~L544) | `case 'calories': hit = adjustedTarget > 0 && calTotal >= adjustedTarget*0.80 && calTotal <= adjustedTarget*1.06`. Confirm exactly what `adjustedTarget` is built from in that loop (~L530s). |
| 6 | `app/(tabs)/log.tsx` | calorie color coding | mirrors the index.tsx home card logic (roadmap notes index + log kept consistent). Grep `calDelta` / `adjustedTarget` in log.tsx. |
| 7 | `app/achievements.tsx` | `nutritionGoalDays` count (~L685-709) | **MISSED IN THE ORIGINAL 6-SITE AUDIT. Found 2026-05-30 (Session 62) during the calorie card denominator overhaul.** `adjustedTarget = nutritionCalTarget + (day.activeCalories ?? 0)` then hit if `consumed >= adjustedTarget-300 && consumed <= adjustedTarget+150`. Same double issue as site 1: **RAW active (no burn-accuracy modifier)** AND the old `calTarget + active` double-count band. Drives the nutrition-goal-days achievement progress shown on the achievements PAGE, so it can disagree with the engine (site 1, `achievementData.ts`) which already uses the util. FIX: route through `evaluateCalorieGoalHit` with `paceTargetFromWeightGoal` + per-day BMR, identical to site 1. Sites 1, 3, 4, 5 are already wired to the util; 2 reverted to proximity coloring (intentional, Site 2 decision); 6 mirrors 2; 7 is the only unwired goal-hit count left. |

### Net-calorie computation (must all funnel through `computeDayNet`)

- CANONICAL (already correct, reuse it): `utils/statsData.ts`
  - `computeDayNet(consumed, dayData, dayBmr, burnAccuracyPct, isToday, minutesNow)` => `net = consumed - round((activeCalories||caloriesBurned) * acc/100) - BMR`. Running (time-proportional) BMR for today via `minutesNow`, full BMR for past days.
  - `buildDailyBmrMap(dateKeys)` => per-day BMR. Each day uses its own logged weight, else most recent weigh-in within prior 30 days, else 0. Reads `pj_profile`. Uses date-safe split birthday parser.
  - Already used by: graph (`fetchTrendData`), At a Glance net avg (`loadPeriodData`), day-detail.
- DRIFT TO FIX: `app/head-to-head.tsx` `loadSnapshot` (~L78-100) rolls its OWN net: `snap.net = consumed - burned - profileBmr` (with `consumed >= 400` gate), `burned = round((activeCalories||caloriesBurned)*acc/100)`. Repoint at `computeDayNet`.
- VERIFY: index.tsx YvY net (~L2610 uses `abs(t - calTarget)` for the metric winner comparison; confirm the actual net value path matches `computeDayNet` or the shared util).

### Burn-accuracy bugs to fix during the audit pass

- `achievementData.ts` ~L1886: raw `data.activeCalories`, no modifier. (Fixed implicitly when site #1 moves to the util.)
- `utils/diagnosticReport.ts`: mixed. Some spots apply accuracy (~L337, ~L346), but ~L285 reads raw `d.activeCalories` with **no `|| d.caloriesBurned` fallback**, and the surplus/deficit pattern detection (~L452, L458, L617) uses raw `activeCalories` / raw `calTarget*1.1` / `calTarget*0.9`. Make every active-cal read `(activeCalories||caloriesBurned)*acc/100`.
- Run the roadmap's full burn-accuracy checklist (head-to-head, home color, calorie streak, statsData fetchTrendData, diagnosticReport) and mark each confirmed.

---

## 3. LOCKED DECISIONS (DO NOT RE-LITIGATE)

### Decision 1 — Way 2 hit band: DIRECTIONAL +/-150, UNIVERSAL across all modes

Way 2 is the PRIMARY check. Compares **true net** (consumed minus accuracy-adjusted active minus BMR) to the **daily pace target**.

Pace target source = `GOAL_DEFICITS[weightGoal]` (see Section 4). It is signed: lose = negative, maintain = 0, gain = positive.

Directional band by goal direction:
- **Lose** (paceTarget < 0): `hit = net <= paceTarget + 150`. No lower bound. A bigger deficit still counts as a hit. (The deep-deficit nudge, parked, will gently flag extreme cases later, but the day still counts.)
- **Maintain** (paceTarget == 0): `hit = abs(net) <= 150`.
- **Gain** (paceTarget > 0): `hit = net >= paceTarget - 150`. No upper bound.

Worked example (lose 1.5 lb/wk, paceTarget = -750, so hit if `net <= -600`, i.e. deficit of 600 or bigger):
| net | deficit | result |
|-----|---------|--------|
| -400 | 400 | MISS (ate too much) |
| -599 | 599 | MISS (one short of the grace line) |
| -600 | 600 | HIT (boundary: -750 + 150) |
| -750 | 750 | HIT (on target) |
| -900 | 900 | HIT (more deficit still counts) |
| -1300 | 1300 | HIT (very low; nudge later, but still a hit) |

UNIVERSAL across modes. The band does NOT vary by Discipline/Balanced/Mindful. Reason: the streak and achievement counts are RECOMPUTED by re-walking history; if the band depended on mode, toggling modes would silently rewrite the user's streak/achievement numbers. Mode changes PRESENTATION only. Mindful is already protected: by default the calorie streak is not in the Mindful streak set, and the home card hides net/color in Mindful. The hit still counts internally toward (mode-blind) achievements, which is fine and invisible.

### Decision 2 — Way 1 window: KEEP the asymmetric -300/+150

Way 1 is the FALLBACK (fires only when adjusted active cals are below the floor, see Decision 3). It does NO net math, NO BMR subtraction, NO active subtraction. It only asks "did you eat close to your calorie goal number," because the static `calTarget` already has the deficit baked into it (`calTarget = tdee + GOAL_DEFICITS[weightGoal]`).

`hit = consumed >= calTarget - 300 && consumed <= calTarget + 150`

Worked example (calTarget = 1450, window 1150 to 1600):
| consumed | result |
|----------|--------|
| 400 | MISS (nowhere near goal) |
| 1200 | HIT |
| 1450 | HIT (on target) |
| 1600 | HIT (top boundary) |
| 1750 | MISS (over) |

Kept as-is (vs symmetric) specifically so historical streak/achievement counts are judged the same way they always were on the Way-1 path. NOT mode-aware (Justin rejected mode-varying windows; the binary hit is one rule).

### Decision 3 — Active-cals floor = 50 (the Way 1 vs Way 2 switch)

`adjustedActive = round((activeCalories || caloriesBurned) * burnAccuracyPct / 100)`
- `adjustedActive < 50` => Way 1 (no/dead/unworn wearable; dead-watch guard so a 0 reading doesn't fall through to a BMR-only net check).
- `adjustedActive >= 50` => Way 2.

"Burn data" includes MANUALLY logged active calories, not just HealthKit. A no-watch user who hand-logs a 300-cal workout lands in Way 2 using that 300. Way 1 is specifically "no active cals logged at all (or under 50)."

### Decision 4 — Home/log card color stays GRADED, green zone = "hit"

Color coding remains a graded signal (good/warn/bad, mode-based). But its GREEN/good zone is redefined to mean exactly "this day is a hit" per Way 1/Way 2. Non-hit days split warn vs bad using the existing mode thresholds, so the "close vs way off" nuance survives. Net effect: green can only ever appear on a real hit; streak + achievement use the same binary; the card and the streak can never contradict. Mindful: no color, unchanged.

### Data caveat — ACCEPTED by Justin

Moving streak / At-a-Glance 0-of-N count / calendar dots / achievement count from their old formulas to Way 1/Way 2 WILL recompute historical numbers and they will change (up or down). This is purely a display recompute: every `pj_YYYY-MM-DD` record is untouched, nothing is deleted or overwritten. Justin signed off: "MY streaks changing is whatever, its fine. As long as the logic is good for future stuff and for users starting from scratch."

---

## 4. SOURCE-OF-TRUTH FACTS

From `app/(tabs)/index.tsx` profile-load block (also duplicated in head-to-head.tsx ~L309 and elsewhere; centralize in the new util):

```
GOAL_DEFICITS = { lose_2:-1000, lose_1_5:-750, lose_1:-500, lose_0_5:-250, maintain:0, gain_0_5:250, gain_1:500 }
LIFESTYLE_MULTIPLIERS = { sedentary:1.2, light:1.3, active:1.45, very_active:1.6 }
TRAINING_BONUSES = { none:0, '1x':100, '3x':200, '5x':300, daily:400 }
tdee = round(bmr * LIFESTYLE_MULTIPLIERS[lifestyleActivity] + TRAINING_BONUSES[trainingFrequency])
calTarget = tdee + GOAL_DEFICITS[weightGoal]
```

- `pj_profile.weightGoal` = e.g. 'lose_1', 'lose_1_5', 'maintain', 'gain_0_5'.
- `calTarget` read from `pj_settings.calTarget` (string), fallback `pj_profile.calTarget`.
- Burn accuracy is the 100/90/80/70 pill in Settings > Health. CONFIRM the exact storage key by reading how `stats.tsx` loads `burnAccuracy` (it is passed around as `burnAccuracyPct`). Use the same load path in the util's callers.
- Daily data keys: `pj_YYYY-MM-DD` with `entries` (each `{ cal, ... }`), `activeCalories`, `caloriesBurned`, `water`, `steps`, etc.

---

## 5. THE SHARED UTIL (single source of truth)

New file: `utils/goalHit.ts`. Pure functions, no side effects. Imports `computeDayNet` + `buildDailyBmrMap` from `utils/statsData.ts` (one-way import, no cycle: statsData does not import achievementData or goalHit).

Proposed API:

```ts
export const GOAL_DEFICITS: Record<string, number> = {
  lose_2: -1000, lose_1_5: -750, lose_1: -500, lose_0_5: -250,
  maintain: 0, gain_0_5: 250, gain_1: 500,
};

export function paceTargetFromWeightGoal(weightGoal: string): number {
  return GOAL_DEFICITS[weightGoal] ?? -500; // mirror existing default
}

export interface GoalHitInput {
  consumed: number;          // sum of entries[].cal
  dayData: any;              // the pj_ daily record (for activeCalories || caloriesBurned)
  dayBmr: number;            // from buildDailyBmrMap, or live BMR for today
  calTarget: number;         // tdee + deficit (static target)
  paceTarget: number;        // GOAL_DEFICITS[weightGoal]
  burnAccuracyPct: number;   // 100/90/80/70
  isToday: boolean;
  minutesNow: number;        // for running BMR on today; ignored when !isToday
}

export interface GoalHitResult {
  hit: boolean;
  way: 1 | 2;
  net: number | null;        // null on Way 1 (no net computed)
  adjustedActive: number;
}

export function evaluateCalorieGoalHit(input: GoalHitInput): GoalHitResult {
  const rawActive = input.dayData?.activeCalories || input.dayData?.caloriesBurned || 0;
  const adjustedActive = Math.round(rawActive * input.burnAccuracyPct / 100);

  if (adjustedActive < 50) {
    // WAY 1: consumed vs static target, -300/+150
    const hit = input.calTarget > 0 &&
      input.consumed >= input.calTarget - 300 &&
      input.consumed <= input.calTarget + 150;
    return { hit, way: 1, net: null, adjustedActive };
  }

  // WAY 2: net vs pace target, directional +/-150
  const net = computeDayNet(
    input.consumed, input.dayData, input.dayBmr,
    input.burnAccuracyPct, input.isToday, input.minutesNow,
  );
  const t = input.paceTarget;
  let hit: boolean;
  if (t < 0)       hit = net <= t + 150;       // lose: bigger deficit still hits
  else if (t > 0)  hit = net >= t - 150;       // gain
  else             hit = Math.abs(net) <= 150; // maintain
  return { hit, way: 2, net, adjustedActive };
}

// Graded color for home/log card. Green iff hit; otherwise split warn/bad by mode delta.
// styleMode: 'Discipline' | 'Balanced' | 'Mindful'. Mindful returns neutral (no color).
export function calorieColorTier(
  result: GoalHitResult, consumed: number, adjustedTarget: number, styleMode: string,
): 'good' | 'warn' | 'bad' | 'neutral' {
  if (styleMode === 'Mindful') return 'neutral';
  if (result.hit) return 'good';
  const delta = Math.abs(consumed - adjustedTarget);
  if (styleMode === 'Discipline') return delta <= 149 ? 'warn' : 'bad';
  return delta <= 300 ? 'warn' : 'bad'; // Balanced
}
```

Notes for the implementer:
- Confirm `computeDayNet`'s exact signature/param order against `utils/statsData.ts` before wiring; the above mirrors the roadmap description but verify.
- For historical scans (achievements site #1, streak site #5, calendar #3, glance #4), build the BMR map once via `buildDailyBmrMap(dateKeys)` and pass each day's BMR + `isToday=false`. Today is the only `isToday=true` day (running BMR).
- `calorieColorTier`'s `adjustedTarget` for the home card = `calTarget + adjustedActive` (the existing home-card concept), used only to grade warn vs bad on a miss. The hit/green decision comes solely from `result.hit`.
- Map each call site's "is this day a hit" question onto `evaluateCalorieGoalHit`. The 80-106% sites (#3, #4, #5) and the +raw-active site (#1) all get replaced by the same call.

---

## 6. BUILD ORDER (one step, confirm, commit, repeat)

0. Log the 4 locked decisions + the audit findings into `project_j_roadmap.md` (decision-made = real-time update). Move the two SOON items toward in-progress.
1. Create `utils/goalHit.ts`. New file, zero risk. Confirm it compiles, walk Justin through the logic before any wiring.
2. Wire `achievementData.ts` `checkNutritionAchievements` to the util (kills the raw-active bug). Confirm + commit.
3. Wire `stats.tsx`: calendar dots (#3), At a Glance `calGoalDays` (#4), calorie streak (#5). Confirm + commit.
4. Wire `index.tsx` home card color to `evaluateCalorieGoalHit` + `calorieColorTier` (green = hit). Confirm + commit.
5. Wire `log.tsx` color (#6) to the same. Confirm + commit.
6. Net consolidation: repoint head-to-head `loadSnapshot` at `computeDayNet`; verify index YvY/home net matches. Confirm + commit.
7. Burn-accuracy audit pass: fix `diagnosticReport.ts` (raw active reads + missing `caloriesBurned` fallback), then walk the roadmap's full checklist and mark each item confirmed. Confirm + commit.

Each step: pass the Three Gate Rule (works / premium / feels right where UI is touched), recommend a git commit, update the roadmap in real time.

---

## 7. MODE + FAITH BEHAVIOR (define before shipping each UI touch)

- Discipline: shows hit/miss, strict green/warn/bad color, surfaces counts.
- Balanced: shows it, softer thresholds (warn band wider).
- Mindful: no calorie color (neutral), no net surfaced on card, calorie streak not in default streak set. The hit still counts internally for achievements (engine is mode-blind) and that is intended and invisible.
- Faith Journey does not gate this feature; calorie logic is faith-agnostic.

---

## 8. OPEN VERIFICATIONS for the implementer (read before editing, do not assume)

1. Exact storage key + load path for burn accuracy (grep `burnAccuracy` in stats.tsx).
2. Whether index.tsx home card `hkCalories` already has the accuracy modifier applied (it must; if not, that is another bug).
3. Exact composition of `adjustedTarget` inside stats.tsx `loadStreaks` calorie case (~L530s).
4. `computeDayNet` exact signature/param order in `utils/statsData.ts`.
5. index.tsx YvY net path (~L2610 region) actual net value source.
6. Confirm log.tsx color logic is a true mirror of index before replacing both identically.

DONE. The decisions are locked. Build it consistent everywhere. Justin's words: it must be "1000000% consistent" across every place these calcs live.
