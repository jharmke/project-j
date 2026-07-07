# SPEC: Apple Workouts in the Exercise Library (lean "Synced Workouts" history)

STATUS: DESIGN LOCKED (Justin signed off 2026-07-07). Ready to build after the 5-bug gym list.
Scope owner: workout tab / exercise library / HealthKit.

This is the LEAN path (Path 2) chosen over the full Sessions rearchitecture in SPEC_workout_sessions.md.
We are NOT rebuilding how workouts are stored/counted. We are giving Apple-synced cardio a real HOME to
look back on, integrated into the existing exercise library, with zero change to counting logic.

---

## THE PROBLEM

Apple Health syncs the user's cardio sessions (treadmill, cycling, walks, runs) into the app, but today
each one lands as a one-off "exercise" row on the day it happened (workout.tsx merges `appleWorkouts`
into that day's program). There is no single place to browse "all my treadmill runs over time." The
sessions are scattered, one per day, with no accumulated history.

Justin's ask: whenever Apple syncs a workout type we haven't seen before, auto-create a library entry
for it; every future sync of that same type flows into that entry for history; the entry is linked by
Apple's stable identity, not by a name the user types (so renaming can't fork it into duplicates).

---

## THE MODEL (LOCKED)

### Link key = Apple activity type + indoor flag (NOT the name)
- Apple gives each workout a stable numeric `workoutActivityType` (e.g. Running = 37, Cycling = 13,
  Walking = 52) PLUS a boolean `HKIndoorWorkout` metadata flag (true = treadmill/stationary, false =
  outdoor). Confirmed exposed by our HealthKit lib: `WorkoutSample.metadata` /
  `healthkit.generated.ts` -> `HKIndoorWorkout?: boolean` (line ~1076).
- The FILING KEY for a synced library entry is the pair `{ activityType, indoor }`. This is stable and
  immutable per workout, so it can never duplicate.
  - Running + indoor=true  -> "Indoor Running" drawer (treadmill)
  - Running + indoor=false -> "Outdoor Running" drawer
  - Cycling + indoor=true  -> "Indoor Cycling" (stationary/assault-style)
  - Cycling + indoor=false -> "Outdoor Cycling"
  - Walking + indoor=true / false -> Indoor / Outdoor Walking
- The NAME is a separate editable label sitting ON that key. Rename "Indoor Walking" -> "Incline
  Treadmill" and it just relabels the drawer; the underlying `{ activityType, indoor }` link is
  untouched, so history keeps accumulating in the same place. Renaming can NEVER fork it.

### Auto-create on first sight
- First time we see a `{ activityType, indoor }` combo we don't have a library entry for, create one
  (type: cardio, source: apple, the key stored on it). Only ever creates entries for activities the
  user actually does. All future syncs of that combo attach to the same entry.

### Indoor-flag-missing fallback
- If a synced workout has no `HKIndoorWorkout` flag (some third-party machines/apps don't set it), file
  it under the plain-type bucket for that activity (e.g. "Running", indoor unknown) rather than guessing.
  Apple Watch sets the flag reliably; third-party is verify-per-source.

---

## UI / UX (LOCKED)

### In the library
- Synced entries show a GREEN "Apple Health" badge next to the CARDIO tag, so it's obvious they're a
  different, watch-fed thing vs a manual entry.
- Subtitle / helper text on a synced entry: "Logs automatically from your watch."
- Tap a synced entry -> its history (every session of that type+flag, newest first) + (later) records.

### Manual vs Apple coexist as SEPARATE drawers (by design)
- The user's existing manual "Treadmill" / "Assault Bike" entries stay exactly as they are, hand-loggable.
- Apple "Indoor Running" etc. live alongside them as their own entries. They are NOT merged.
- Consequence (accepted): a dead-watch manual treadmill goes into the MANUAL Treadmill history; a
  watch-tracked treadmill goes into the APPLE bucket. Two separate drawers. Accepted because measured
  data != hand-typed estimate, and it keeps Apple history pure. The green badge makes the distinction
  visible so it's never a surprise.

### CRITICAL: Apple entries are HIDDEN from the "add exercise" picker
- Synced entries appear in the library for BROWSING history only. They must NOT appear in the manual
  add-exercise-to-a-workout flow.
- Why: if the user logs a manual treadmill (watch dead) into the Apple "Indoor Walking" entry, it would
  pollute watch-measured history/PRs with hand-typed estimates and skew the data.
- This also solves the "how do we explain it to the user" problem: you can't pick what isn't on the
  menu. No warning modal needed. Dead-watch case -> user grabs their MANUAL Treadmill entry as normal.

---

## HISTORY / PR LINKAGE

- The library entry is an ANCHOR. The actual synced sessions must be stored/associated with that entry's
  key so its history view can render them (the build work: reconcile with the existing per-day Apple
  import in workout.tsx so sessions are both shown on their day AND queryable by type+flag for the
  library view). One source of truth, no double storage.
- Cardio PRs: see PARKED below. v1 ships HISTORY only (list of past sessions per drawer). No records yet.

---

## BACKFILL (LOCKED: yes, backfill)

- On build, retroactively pull the user's EXISTING synced Apple sessions into the new drawers so history
  isn't empty on day one.
- Extend the existing `restoreAppleWorkoutHistory` (useHealthKit.ts) to READ the `HKIndoorWorkout` flag
  during backfill (today it only reads type/duration/calories/distance). The flag is immutable per
  historical workout, so past indoor vs outdoor walks split correctly IF the recording device set it
  (Apple Watch does; third-party -> generic bucket via the fallback rule above).
- ADDITIVE ONLY. Read-then-merge. NEVER wipes or overwrites pj_workout_state or any pj_* key
  (DATA INTEGRITY rule). Deduped by Apple's workout UUID (the existing import already dedupes this way).

---

## DATA BLAST RADIUS (LOCKED requirement)

- This feature is PURELY ADDITIVE / DISPLAY. It is a new way to BROWSE sessions the app already has.
- It must NOT change how workouts are counted anywhere (Day Score, weekly/monthly summaries,
  achievements, stats, EvR, "workouts this week"). No counting logic is touched. Apple sessions already
  count today as day-program exercises; that stays exactly as-is.
- Verify after build: workout counts / Day Score unchanged before vs after on a day with synced cardio.

---

## MINDFUL MODE

- Cardio history is fine to show in Mindful (it's neutral recall, not judgment).
- When cardio PRs eventually ship, record/PR language softens in Mindful (no "new record!" fanfare;
  neutral phrasing), consistent with the rest of the app. Spec the exact copy when PRs are built.

---

## DELETE BEHAVIOR

- If the user deletes an auto-created synced entry: default = it stays gone until the next sync of that
  type+flag, which re-creates it (can't permanently suppress a workout type the user keeps doing without
  a dedicated hide/archive concept). Revisit if it's annoying in practice. Minor edge; sane default only.

---

## PARKED (do NOT lose — log lives here) : CARDIO PRs + RUNNING SPLITS

Parked by Justin 2026-07-07 (not worth the time right now). Pick this up with any future running-features
work (no dedicated running spec exists yet as of 2026-07-07 -- start one there and back-reference this).

- Simple envelope-level cardio records (FREE from every sync, low effort): longest duration, longest
  distance, most calories, best average pace (distance / time). These need no extra data.
  >> SHIPPED 2026-07-07: furthest distance + longest duration now fire as real PRs in the View Summary
     recap (per drawer, parity with lift PRs) AND show with dates on the library RECORDS tiles. STILL
     PARKED here: BEST AVERAGE PACE (per-sport unit mess -- min/mi for foot sports vs mph for cycling vs
     /500m row vs /100m swim; do it with running work) and CALORIES-as-a-PR (deliberately excluded as
     noise; stays a passive tile only).
- HARDER / needs its own investigation: "fastest mile" and per-split records require PER-MILE split data,
  which the basic workout envelope does NOT carry. Might be derivable from the workout route / distance
  samples (WorkoutRoute type exists in our HealthKit lib), but that is a separate, heavier running-
  features effort and must be verified (is the split data reliably present?) before promising it.

---

## BUILD CHECKLIST (when we start)

1. Extend the workout query + serialization to READ `HKIndoorWorkout` (live sync AND backfill).
2. Define the `{ activityType, indoor }` -> library entry mapping + registry of known keys.
3. Auto-create synced library entry on first-seen key (type: cardio, source: apple).
4. Store/associate synced sessions to their entry key for the history view (reconcile with the existing
   per-day import; one source of truth, no double count).
5. Editable label on the key (rename = relabel, never re-key).
6. Green "Apple Health" badge + "logs automatically" subtitle in the library row/detail.
7. EXCLUDE synced entries from the add-exercise picker.
8. History view per synced entry (sessions newest-first). PRs parked.
9. Backfill existing sessions (additive, dedup by UUID, read the indoor flag).
10. Indoor-flag-missing fallback bucket.
11. Verify counting/Day Score unchanged (data blast radius).
12. Mindful pass (history OK; PR copy only when PRs ship).

---

## RELATION TO SPEC_workout_sessions.md

That spec describes the FULL Sessions rearchitecture (Path 1) -- a first-class Session object with a
migration of all existing flat workout data. That remains the "someday, if we still need it" direction.
This spec is the LEAN near-term win chosen instead: solve "where do I see my Apple cardio history"
without the scary migration. If the full Sessions model is ever built, this library view folds into it
(SPEC_workout_sessions #5 "smart Apple session matching" + #6 tag/timestamp assignment).
