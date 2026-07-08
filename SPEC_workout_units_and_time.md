# SPEC: Per-Exercise Weight Unit (lb/kg) + Reps→Time Tracking

Source: Cengiz tester feedback 2026-07-08. Two requests, one build:
1. Let each exercise choose its own weight unit (lb or kg), mixable within a session. Power/Olympic lifters use kg on main lifts, lb on accessories.
2. Let an exercise track a held DURATION instead of reps (planks, dead hangs, loaded carries, wall sits) via a live count-down/count-up timer.

Both features compose: flipping an exercise to Time only swaps the reps column. The weight column and its unit stay live, so a 32 kg loaded carry for 0:40 is expressible.

---

## GUIDING PRINCIPLES

- **Fully additive to the data model.** Existing logged sets are bare `{weight, reps}` with no unit and no type. They must keep working byte-for-byte: missing unit reads as `lb`, missing type reads as `reps`. Nothing in `pj_workout_state` is ever converted, reshaped, or rewritten. Read-then-merge only.
- **Honest numbers.** We only ever DISPLAY the number and unit the user actually entered. The kg↔lb converter runs internally, purely to decide which set is heavier — it never shows the user a converted number they didn't type.
- **No user-facing double dashes.** Colons/periods/reword in all app strings.
- **Mode-aware.** Neither feature has a Mindful-specific behavior (unit + tracking type are neutral, factual). Confirmed no Mindful variant needed. The HOLD timer inherits the same neutrality the rest timer already has.

---

## DATA MODEL (additive)

`workoutData.ts`:

```
interface Exercise {
  ...
  weightUnit?: 'lb' | 'kg';        // NEW. Missing = 'lb'.
  trackingType?: 'reps' | 'time';  // NEW. Missing = 'reps'.
  // (existing `reps: string` doubles as the middle-column TARGET:
  //  reps target when trackingType='reps', hold-seconds target when 'time'.)
}

interface SetEntry {
  weight: number | null;
  reps: number | null;
  rest: number | null;
  done: boolean;
  doneAt?: number;
  durationSec?: number | null;     // NEW. The logged hold length for a time set.
                                    // On a time set, reps stays null; weight stays usable.
}

interface PRRecord {
  ...
  unit?: 'lb' | 'kg';              // NEW. The unit this record was lifted in. Missing = 'lb'.
  bestDuration?: {                 // NEW. Longest logged hold for a time-tracked lift.
    value: number;                 //   seconds held
    weight: number | null;         //   weight at that hold (context; null = bodyweight)
    unit?: 'lb' | 'kg';            //   unit of that weight
    dateKey: string;
  } | null;
}
```

Persistence: both the inline log-row dropdowns and the Add/Edit Exercise modal write the two Exercise fields to the SAME exercise object inside `programs` / `weeklyTemplate` / `routines`, through the existing `saveState` read-then-merge path. Because the choice lives on the exercise, re-adding "Plank" later carries its Time setting with it.

---

## FEATURE 1: PER-EXERCISE WEIGHT UNIT (lb / kg)

### Controls (two entry points, same underlying field)
- **Inline (primary):** the `LBS` column header on the log row becomes a tappable dropdown `LBS ▾` → `LB` / `KG`. Picking one sets that exercise's `weightUnit` and relabels the column header (`LBS`/`KGS`) live.
- **Modal:** the Add/Edit Exercise modal (Lift mode only) gets a `Weight [ LB | KG ]` segmented toggle in a new control row. Cardio mode hides it.

### Display (every "lb" string becomes unit-aware)
All lifting weight displays read the exercise's `weightUnit` (default lb). Known surfaces to update:
- `components/ExerciseSetRows.tsx` line ~92: the hardcoded `Lbs` header cell.
- `app/(tabs)/workout.tsx`:
  - PR recap hit lines (~945–946): `${weightVal} lb × ${reps}` and `Est. 1-rep max ${e1rmVal} lb`.
  - Top-set label (~1599): `${weight} lb × ${reps}`.
  - Finish-summary trophy (~2470–2475): "New heaviest set" / "New estimated 1-rep max".
  - Finish-summary "Lbs Volume" tile (~2352): mixed-unit sessions cannot sum raw — see note below.
- Weekly / monthly / day summaries: any lift weight/volume string.
- Otto: `utils/companionPRs.ts`, `utils/companionWorkouts.ts` PR + top-set strings.

**Volume tile with mixed units (DECIDED): split per unit, no conversion.** Total volume (Σ weight×reps) cannot mix lb and kg. So sum lb sets and kg sets separately and render one tile per unit actually present: "Lbs Volume" and/or "Kg Volume". Single-unit session shows one tile (identical to today); mixed session shows both. No silent conversion anywhere — keeps honest numbers. Time holds have no reps, so they contribute 0 to volume.

### PR CONVERTER (the airtight part)
The PR engine (`utils/liftPR.ts`) currently compares raw weight numbers. It must compare in a single canonical unit so mixed logging never breaks a record.

- Canonical unit: **kg**. `toKg(w, unit) = unit === 'kg' ? w : w / 2.2046226218`.
- `resolveDay` is extended to also return each exercise's `weightUnit`, so every historical set can be normalized (existing sets → lb → converted). This is the only signature change; existing callers default unit to lb.
- `heavier()` / `higherE()` compare on the kg-equivalent float (full precision, no rounding until display). The winning record keeps its ORIGINAL entered value + its unit.
- `computeLiftBest` / `liftSessionHistory` / `recomputeLiftPR` carry `unit` through onto `BestW` / `BestE` / the stored `PRRecord` and onto the Otto `hit` object (so "up from" prints the right unit too).
- e1RM (Epley) is linear in weight, so converting for comparison is exact. Displayed e1RM stays in the record's own unit.
- Existing `PRRecord`s (no `unit`) → treated as lb, re-derived on next recompute, stamped with the exercise's current unit. All existing data is lb, so no record moves.

Result: a user mixes kg and lb on the same lift however they want; the engine always identifies the true heaviest and displays it in the unit it was actually lifted in. The name-keying "drift" edge is fully resolved. No per-lift unit lock needed.

---

## FEATURE 2: REPS → TIME TRACKING

### Controls (two entry points)
- **Inline (primary):** the `REPS` column header becomes `REPS ▾` → `REPS` / `TIME`. Picking Time relabels the column to `TIME` and sets `trackingType`.
- **Modal:** `Track [ Reps | Time ]` segmented toggle in the new control row (Lift mode only). When Time is selected, the middle "Reps" input relabels to "Hold Time".

### The time input (clock-style, unambiguous)
A single field that behaves like the iOS clock/timer entry, always displayed `M:SS`:
- Digits fill from the right: type `4` → `0:04`, `45` → `0:45`, `130` → `1:30`.
- Placeholder `0:45`, tiny `MIN:SEC` caption beneath it (in the modal).
- Same treatment on the log-row Time cell so entry is consistent everywhere.
- Stored as `durationSec` (integer seconds) on the SetEntry; the modal's target lives in the exercise `reps` string as seconds.

### Behavior on the log row (time mode)
- Columns become: `SET | PREV | LBS▾ | TIME▾ | ✓ | ✕`. Weight column stays (blank for bodyweight holds, real for weighted holds/carries).
- `PREV` shows the prior session's logged time (e.g. `0:45`).
- Manual entry always works: tap the Time cell, type, it formats, check the set.
- Or use the timer (below).

### PR impact
Two guarantees:
- **Time sets never touch weight/e1RM PRs.** They have `reps = null` (0), so the existing `computeLiftBest` guard (`r <= 0 continue`) already skips them. Existing lift records are safe by construction.
- **Time sets DO earn a longest-hold PR** (included this build). New record type `PRRecord.bestDuration`:
  - Record = **longest logged `durationSec`** for that lift (done sets only), derived from history like the other records (recomputes/rolls back on edit/uncheck/delete).
  - **One-dimensional on purpose:** for weighted holds / loaded carries (weight AND time), duration is the trophy and weight is shown as context — we do NOT try to rank weight against time. "New longest loaded carry: 0:50 at 32 kg, up from 0:42." Bodyweight: "New longest plank: 1:15, up from 0:58."
  - Weight context carries its own `unit` (respects Feature 1). Surfaced in the recap trophy block, All-PRs home, per-lift Records/History, summaries, and Otto — same places weight/e1RM PRs already show.
  - The engine now scans time sets for `bestDuration` in parallel with scanning rep sets for weight/e1RM; a lift is only ever one type at a time, so the two never collide.

### Presets
Flip the built-in hold presets to `trackingType: 'time'` with a sensible seconds target in `workoutData.ts`: Plank, Side Plank, and any preset whose reps read "…s hold". Additive edit to preset data; existing user data untouched.

---

## THE HOLD TIMER (built on the rest-timer foundation)

The existing rest timer (`app/(tabs)/workout.tsx` ~135–140, render ~2305) is a floating pill above the tab bar: big Bebas number, identity label ("REST · PLANK"), timestamp-based (survives backgrounding), buzzes + notifies at zero, counts into overtime. The HOLD timer is its twin — ONE pill, two modes.

### Trigger + representation
- Log-row Time cell shows the value + a `▷` start button when idle.
- Tapping `▷` starts the hold and raises the pill in **HOLD mode**. The row shows an active state (`▷` becomes `⏸`, row highlights) but shows **no ticking number in the cell** — the pill is the only live clock, so there are never two competing numbers.
- Pill shows: big number + identity label `HOLD · PLANK · SET 2`.

### Count direction (Justin's rule)
- **Target present** (field had a time, e.g. 1:00): count **DOWN** from the target. At zero: buzz, auto-log the target to `durationSec`, auto-check the set, then the pill **flips to REST mode** and the existing rest handoff runs.
- **Field empty:** count **UP** from 0:00. User taps Stop → logs the reached time, checks the set, flips to REST.
- Controls: Stop, Reset (and +15s for count-down targets, mirroring rest).

### Implementation notes
- Reuse the rest timer's timestamp-anchored elapsed pattern (`restEndRef`-style start-time ref) so a locked phone / backgrounded app keeps correct time.
- HOLD and REST are mutually exclusive in time (you hold, then you rest), so one pill component with a `mode` is correct — no overlap.
- Leave the existing rest timer's placement/behavior UNCHANGED this build. If the HOLD pill validates the treatment on device, restyling/repositioning the rest timer becomes a separate follow-on.

---

## ADD / EDIT EXERCISE MODAL

Same modal powers Add and pencil-Edit (shared form state), so both get the controls.

Lift-mode layout (new control row between the Lift/Cardio toggle and the Sets/Reps/Rest row):
```
[ Name..................... ]
[    Lift    ] [   Cardio   ]
Weight [ LB | KG ]   Track [ Reps | Time ]     ← NEW
[ Sets ] [ Reps|Hold Time ] [ Rest ]
[ Note (optional).......... ]
[ Cancel ]  [ Add ]
```
- Defaults: LB + Reps → existing/new exercises look identical to today until a toggle is flipped.
- Track = Time relabels the middle field "Reps" → "Hold Time" (clock-style input, `MIN:SEC` caption).
- Cardio mode hides both toggles; cardio flow untouched.

---

## EXPLAINERS (same session, per CLAUDE.md)
- `tooltipRegistry.ts`: update/add the workout-logging + `personal_records` entries to note lifting weight now has a per-exercise unit and holds can be tracked as time.
- `data/tutorials.ts`: workout logging tutorial mentions the LBS▾ / REPS▾ dropdowns + the hold timer.
- Otto KB `functions/src/assistantAppKnowledge.ts`: teach per-exercise units + time tracking + that time holds do not produce weight PRs. Redeploy same session.

---

## BUILD ORDER (all in this one flow, each step device-verified before the next)

Feature 1 — per-exercise lb/kg:
1. Add `weightUnit` + `unit` fields + `toKg` helper + extend `resolveDay`; teach the PR engine to compare in kg and carry unit through (with unit tests in the existing liftPR test file). No display change yet.
2. Make every lifting weight display unit-aware (ExerciseSetRows header, recap, top-set, summaries, Otto). Decide the mixed-unit volume-tile rule.
3. Inline `LBS ▾` dropdown on the log row.
4. `Weight [LB|KG]` toggle in the modal.

Feature 2 — reps→time:
5. Add `trackingType` + `SetEntry.durationSec`; log-row renders the clock-style Time cell + `TIME ▾` dropdown when time; prev-label/recap/summary display for time sets.
6. `Track [Reps|Time]` toggle + clock-style "Hold Time" field in the modal; flip the hold presets to Time.
7. The HOLD-mode timer pill (count down from target / up from empty, buzz + log + check + hand off to rest).
8. Longest-hold PRs: `PRRecord.bestDuration`, engine scans time sets for max duration (with unit tests), surfaced in recap / All-PRs / per-lift Records / summaries / Otto. Weight shown as context for weighted holds.

Then: explainers (tooltips + tutorials + Otto KB) + full 5-theme × accent audit + recommend git commit.

---

## DATA INTEGRITY CHECKLIST
- [ ] Existing sets with no `weightUnit` render + PR exactly as before (lb).
- [ ] Existing sets with no `trackingType` render + PR exactly as before (reps).
- [ ] No `pj_workout_state` key is ever wiped or wholesale rewritten; all writes read-then-merge.
- [ ] PR converter never displays a converted number; only the entered value + its unit.
- [ ] Time sets never enter the weight/e1RM PR math.
- [ ] Longest-hold PRs derive from history and roll back on edit/uncheck/delete like weight PRs.
- [ ] Existing `PRRecord`s (no `unit`/no `bestDuration`) recompute unchanged and stamp as lb.
