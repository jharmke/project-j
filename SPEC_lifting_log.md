# SPEC: Lifting Log (Core)

Status: DRAFT for Justin to review + lock before any code.
Decision context: Justin chose the CORE lifting-log experience (Strong-style), not the
full kitchen sink. RPE, supersets, and drop sets are explicitly OUT of this build (easy
to bolt on later). The richer analytics that READ this data (1RM trend graph, volume per
muscle, EvR surfacing) are also OUT of this build -- they need accumulated logged sessions
to be worth anything, and they are their own UI. This build is the foundation: actually
logging what you lift, per set, so PRs become possible.

---

## 1. Goal

Turn the workout screen from a prescription + checkmark into a real per-set lifting log:
each set has weight x reps and a check, last session's numbers ghost behind it, a rest timer
runs when you check a set, and finishing the workout detects PRs. This is exactly how Strong /
Hevy work, trimmed to the core loop: type, type, check, rest, repeat, finish.

## 2. Scope

IN (this build):
- Per-set logging on each lift exercise: weight, reps, done-check, add/remove set rows.
- "Previous" reference: last time's weight x reps for that set, ghosted.
- Rest timer: auto-starts on checking a set, counts down the exercise's rest target, optional
  local "rest's up" notification.
- Finish Workout: saves the dated session's actuals to history, shows a summary (volume,
  duration, PRs hit).
- PR detection at finish: heaviest weight and best estimated 1RM (Epley) per lift, stored.
- Editing: today's logged sets are editable anytime; a session can be re-opened and corrected.

ADDED BACK 2026-06-29 (Justin trains with supersets, so "core only" was too aggressive):
- Supersets: link consecutive lift exercises into a group via a "Superset" pill in the gap;
  renders as one bordered block (accent rail + SUPERSET label) with an UNLINK control on the
  divider between members. Data: optional Exercise.supersetGroup id; consecutive same-id lifts
  group. Cardio cannot be supersetted. Built in workout.tsx (renderExerciseCard + units render).
  The rest timer (increment 4) will rest after a full round of the group, not after each member.

OUT (explicit, later builds):
- RPE / RIR per set.
- Drop sets (can be faked with extra set rows; revisit later).
- 1RM trend graph (graphable stat), volume per muscle group, EvR surfacing of PRs.
- A dedicated PR history / records page (beyond the finish-summary flag). [OPEN, see 11]
- Rest timer running in the background after the app is closed (in-app countdown only for now;
  the local notification covers the "phone in pocket" case).

## 3. Current architecture (what exists, do not break)

- `pj_workout_state` holds: `checks` (Record<dateKey, Record<exerciseId, boolean>>),
  `cardioComplete`, `programs` (Record<dateKey, DayProgram>), `weeklyTemplate`
  (Record<weekdayName, DayProgram>), `workoutNotes`, `workoutNoteNames`, `cardioLogs`
  (Record<dateKey, {...}>), `weeklyTemplate`, `activeProgramName`.
- A day's exercises = `programs[activeDay] || weeklyTemplate[activeDayName] || BLANK_DAY`.
- `Exercise` (workoutData.ts) holds prescription only: name, sets (string), reps (string),
  rest (string), note, isCardio, plus cardio fields. NO weight, NO actuals.
- Exercise `id` is per-instance (assigned when added to a day), NOT a stable per-lift id.
- Completion today = the per-exercise boolean in `checks`. "Today's Effort" 1-10 score and
  `cardioLogs.effortScore` are SEPARATE and stay as-is.

Implication: to track PRs and show "previous," we need a stable LIFT identity across sessions.
We key off the NORMALIZED exercise name (lowercased, trimmed, collapsed whitespace), which
matches the same lift across days whether it came from the library or was free-typed.

## 4. Data model (new, additive -- nothing existing is removed)

New fields on `pj_workout_state` (additive, read-then-merge, never wipe):

```
setLogs: Record<dateKey, Record<exerciseId, SetEntry[]>>
  // The actual logged sets for a given exercise instance on a given date.
  // exerciseId is the per-instance id (matches the DayProgram exercise + checks).

interface SetEntry {
  weight: number | null;   // lbs; null allowed (bodyweight / not entered)
  reps: number | null;
  rest: number | null;     // seconds; the per-set rest target (defaults from exercise.rest)
  done: boolean;           // the green check
}

prs: Record<liftKey, PRRecord>
  // liftKey = normalized exercise name. All-time bests, updated on Finish.

interface PRRecord {
  name: string;            // display name as last seen
  bestWeight:   { value: number; reps: number; dateKey: string } | null;
  bestE1RM:     { value: number; weight: number; reps: number; dateKey: string } | null;
  updatedAt: string;       // local dateKey
}
```

Notes:
- `setLogs` is keyed by the SAME per-instance exerciseId already used by `checks`, so a
  set list always belongs to a specific exercise on a specific date.
- `prs` is keyed by normalized name so "Bench Press" on any date rolls up to one record.
- Estimated 1RM uses Epley: `e1RM = weight * (1 + reps/30)`, only for sets with weight>0 and
  reps>0 and reps<=12 (Epley gets unreliable past ~12 reps -- a working filter, documented).
- All writes go through storageSet (AsyncStorage + Firestore mirror) so the log syncs + survives
  reinstall like every other pj_ key.

## 5. UX: the exercise card + set rows

A LIFT exercise card (cardio unchanged) renders its set rows:

```
BARBELL BENCH PRESS                                   (existing card header / menu)
  SET    PREVIOUS     LBS     REPS
   1     135 x 8     [135]   [ 8 ]   [check]
   2     135 x 8     [135]   [ 7 ]   [check]
   3     135 x 8     [   ]   [   ]   [ ]
   + Add set
```

- Row count seeds from the exercise's target `sets` (e.g. "3" -> 3 empty rows). If `sets` is a
  range or non-numeric, default to 3 rows; user adjusts with Add/remove.
- WEIGHT and REPS are number inputs (decimal allowed on weight for plates like 2.5). Empty =
  not logged. Weight may stay empty (bodyweight) -- reps still count.
- CHECK toggles `done`. Checking a row:
  (a) marks the set done,
  (b) starts the rest timer (section 6),
  (c) if weight/reps are empty when checked, pre-fills them from the PREVIOUS value (so a
      "same as last time" set is one tap). [OPEN: confirm this auto-fill behavior, 11]
- PREVIOUS column = the matching set index from the most recent PRIOR session of this lift
  (section 8). Ghosted text; tap-to-fill optional. If no history, column is blank.
- "+ Add set" appends a row (pre-filled weight from the last row as a guess). Swipe a row to
  delete it.
- Exercise completion (the existing per-exercise check used by Today's Effort / activity
  notifications) DERIVES from sets: an exercise counts as done when it has >=1 set and all its
  set rows are checked. We keep writing the existing `checks[date][exerciseId]` boolean (= all
  sets done) so nothing downstream (completion %, notifications, EvR) breaks. [OPEN: confirm, 11]

## 6. Rest timer

- Auto-starts when a set is checked, seeded from that set's `rest` (defaults from
  `exercise.rest`, e.g. "90" -> 90s). If the exercise has no rest value, no timer starts.
- Shows as a small countdown banner (e.g. pinned above the tab bar) with the running time +
  skip / +15s / -15s controls. Tapping skip clears it.
- When it hits 0: a local notification ("Rest's up -- Bench Press set 3") so the phone can be
  pocketed, plus a light haptic if the app is foreground. (Notification permission already
  requested in onboarding; privacy.html already discloses local notifications -- no new
  disclosure needed. Confirm at build.)
- In-app countdown only; we do NOT keep a precise background timer beyond the scheduled
  notification. Backfilling a past workout: the timer is irrelevant and ignored (unobtrusive).

## 7. Finish Workout + summary

- A "Finish Workout" action on the workout screen for the active day (only meaningful for a day
  with lift exercises). [OPEN: exact placement / whether finishing is required at all vs auto, 11]
- On finish: run PR detection (section 9) over the day's logged sets, update `prs`, then show a
  summary modal (centered card per the modal standard): total volume (sum of weight x reps over
  done working sets), number of sets/exercises done, workout duration if we track it, and any
  PRs hit, each as a line ("New top set: Bench 145 x 5" / "New est. 1RM: Bench 168 lb").
- PRs hit also fire the existing celebration/achievement-toast treatment (reuse
  showCelebration + the achievement toast), tier-scaled. Mindful softens (section 10).

## 8. "Previous" lookup

- For a given lift on the active date, find the most recent PRIOR dateKey (< active date) that
  has a `setLogs` entry for an exercise whose normalized name matches, and use that session's
  set list, index-aligned, as the PREVIOUS reference.
- Cheap: scan `setLogs` keys descending from the day before activeDay. Cache per render.

## 9. PR detection (core)

On Finish, for each lift exercise with done sets:
- `topSet` = the done working set with the highest weight (tie -> most reps at that weight).
- `bestE1RM` = max Epley over done sets with weight>0, reps in [1,12].
- Compare against `prs[liftKey]`: if bestWeight.value or bestE1RM.value exceeds the stored
  record (or no record exists), update it and flag it as a PR hit for the summary.
- First-ever log of a lift: record it silently as the baseline (NOT celebrated as a PR -- a
  first entry is not an achievement; only beating a prior best is). [OPEN: confirm, 11]

## 10. Mindful behavior (required per build standards)

- Logging itself is neutral data entry -- identical in all modes.
- PR celebrations: Discipline/Balanced get the full celebration + "New PR" language. Mindful
  softens to observational, no trophy framing ("Logged. That's a new best for you." quietly),
  and no score/championship language. No PR pressure, no streak framing.
- The finish summary in Mindful drops the leaderboard tone; shows the same numbers plainly.

## 11. Decisions -- LOCKED 2026-06-29

1. PAST-DATE LOGGING: YES. Set rows + Finish work on any selected date in the scroller.
2. AUTO-FILL ON CHECK: YES. Checking an empty row fills weight/reps from PREVIOUS.
3. COMPLETION DERIVATION: YES. Exercise "done" = all its sets checked; we keep writing the
   existing per-exercise `checks` boolean so Today's Effort / notifications / EvR are unchanged.
4. FINISH MODEL: YES, explicit "Finish Workout" button triggers the summary + PR scan.
5. FIRST-LOG NOT A PR: YES. First log sets the baseline silently; only beating a prior best
   celebrates.
6. PR HISTORY PAGE / 1RM GRAPH / VOLUME: OUT of this build (finish-summary flag + stored
   records only). Next build.

## 12. Data safety

- Every new field (`setLogs`, `prs`) is additive on `pj_workout_state` via read-then-merge.
  No existing key/field is removed or overwritten. The existing `checks` boolean keeps being
  written (derived from sets) for backward compatibility.
- All writes via storageSet (AsyncStorage first, Firestore mirror) so the log syncs to cloud and
  survives reinstall like the rest of pj_*.
- No migration of historical workouts (there is no prior actuals data to migrate); "previous"
  and PRs simply start accumulating from the first logged session.
```
