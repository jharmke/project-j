# SPEC: Workout Sessions Model (Workout tab architecture reset)

STATUS: DESIGN IN PROGRESS (skeleton close, several open questions). Do NOT build until this is
finished and Justin signs off. This is the "workout architecture step-back" from the 2026-07-03 gym
list. Nothing in the parked #4/#5/#6 cluster gets built until this lands.

Related: parks/absorbs Batch 3 (Manage include/exclude modal), the Class/Session type idea (#4), the
manual-exercise tag picker (#5), and smart Apple session matching (#6). Overlaps the "PR tracking +
lifting stats" HIGH item (lift history/PRs live inside a session's activities).

---

## THE PROBLEM (root cause of all the mess)

One mismatch drives everything:

> Apple Health gives you a SESSION (an envelope: duration, calories, HR, no per-exercise detail).
> The app models everything as a flat list of EXERCISES per day. So we keep hacking a session into
> an exercise list.

That mismatch is why: we built a fake "container" that wraps exercises; auto-linking is fragile
(guessing which flat exercises belong to a session that isn't a real object); two same-day sessions
break it (weights-then-core); and every downstream consumer (Day Score, summaries, achievements,
stats, EvR) re-derives "is this a lift / cardio / Apple thing" from isCardio + fromAppleHealth +
checks, and each re-derivation is a bug (the LIFT-count inflation fixed 2026-07-02 was exactly this).

Justin's real day is often 5+ logged workouts (e.g. morning: treadmill + strength + core, all
watch-tracked; plus a couple of 9-minute dog walks). The current flat list literally cannot represent
that correctly. The session model is built for it.

---

## THE MODEL (LOCKED skeleton)

Shape: **Day -> (roll-up) + a list of Sessions -> each Session has an envelope + optional Activities.**

- A **Day** contains one or more **Sessions** (chronological).
- A **Session** = one workout. It has:
  - `source`: manual | apple (later: other HealthKit-writing devices)
  - `type`: strength | cardio | class (or a cleaner enum; TBD)
  - `envelope` (optional): duration, calories, avg/max HR, HR samples/zones, distance where relevant.
    Comes from the watch when Apple-sourced, or from manual input (the workout timer / typed values).
  - `activities` (optional list): the exercises/moves logged INTO the session (lifts with sets/reps,
    pilates moves, etc.). Can be empty.
- **Every session is a container; you can log activities into ANY of them, you just don't have to.**
  - Dog walk -> envelope only (nothing added).
  - Strength -> envelope + lifts.
  - Pilates -> envelope + the instructor's moves (SAME "add exercise" flow as strength). This is the
    fix for the pilates-instructor tester's confusion: no special "class bucket," one mechanism
    everywhere. "Envelope-only" is just "a session with no activities logged in it," not a hard type.

### Two levels (this is the whole payoff — it kills the counting mess)

- **Level 1 - Sessions = workouts.** What stats / achievements / "workouts this week" count.
  2 dog walks + 1 strength session = **3 workouts.** One number, computed one way, everywhere.
- **Level 2 - Activities inside a session = detail.** A strength session *contains* 5 lifts; that "5"
  is a within-session detail shown in that session's card. It is NOT a workout count and never touches
  "how many workouts."

The messy feeling today is because the flat model has no session object, so every screen squints at
the exercise list and confuses these two levels. Sessions separate them cleanly.

### Counting rule (LOCKED)

**Every session = 1 workout, no asterisks** (a 9-minute dog walk counts the same as a full strength
session — Justin's call: it was a logged workout). Exercise-minutes / calories still aggregate
separately, but "workout count" = session count.

---

## DAY VIEW (LOCKED direction)

- **Collapsible session cards.** Collapsed = a slim one-line summary (name, time, key stat). Tap to
  expand = envelope + the activities inside. Keeps a 5-session day from becoming a wall of cards.
  (Use the house expand/collapse standard: measured height, no maxHeight.)
- **Day roll-up strip at top** (optional but recommended): a small summary that sums the day's
  sessions, e.g. "Today · 3 workouts · 68 min · 1,240 cal", with the session cards underneath. Gives
  the "what did I do today" answer in one look. (Justin wasn't sure what a roll-up was; confirmed the
  concept, layout to be designed.)

---

## APPLE / MULTI-DEVICE AUTO-LINK (direction, needs the tag picker first)

Worked example (Justin's normal morning): treadmill + strength + core, all watch-tracked, then he
fills in the lifts.

- Each watch workout imports as its OWN session (treadmill = cardio session; strength = strength
  session; core = core session). No more merging strength+core into one blended blob (today's bug).
- **Assigning logged activities to the right session:**
  - **Real-time logging** -> timestamp is the primary signal: a lift logged at 8:15 while the strength
    watch workout ran 8:10-8:40 drops into that session automatically. This is where auto-link is
    trustworthy.
  - **After-the-fact logging** -> no reliable timestamps; fall back to CATEGORY/TAG match (strength
    moves -> strength session, ab moves -> core session) + a one-tap "which session?" chip when
    ambiguous. Never a modal.
- This is what #5 (tags so the app knows bench = strength, plank = core) and #6 (timestamp-then-tag
  matching + inline override) become — natural parts of assignment, not bolt-ons.

---

## OPEN QUESTIONS (Justin, 2026-07-03 — MORE TO DISCUSS)

1. **Do non-watch / manual users get sessions?** (Justin: "manual workouts still scare me greatly.")
   INITIAL READ (reassuring): YES, and this is a strength of the model, not a risk. A session does not
   require a watch. `source: 'manual'` sessions are created directly by the user: envelope comes from
   the manual workout timer or typed duration/cals, and they log activities in exactly like a watch
   session. One session model, two envelope sources (watch vs manual). No separate "manual path." NEEDS
   a clean create-a-manual-session flow spec'd.

2. **Can users move workouts/activities between sessions smoothly?** (Justin: "feels confusing to
   users.") INITIAL READ: yes, required. Two moves: (a) reassign an ACTIVITY from one session to
   another (a lift that auto-linked wrong); (b) re-type or split/merge a SESSION. Must be a clean,
   obvious, non-modal interaction (tap-to-reassign chip / drag). OPEN: design the exact UX so it's not
   confusing. This is the humane replacement for the parked Batch 3 "Manage" modal.

3. **Data blast radius — reports / summaries / stats / achievements.** (Justin: "nervous we are going
   to have data issues somewhere.") THIS IS THE #1 RISK. Mitigation principles (LOCKED as requirements):
   - Migration is ADDITIVE and NEVER wipes pj_workout_state (DATA INTEGRITY rule).
   - The new model must represent ALL existing flat data losslessly (old days migrate into sessions;
     an old flat day with lifts+cardio becomes sessions without losing a single logged set/PR).
   - ONE derivation/counting helper that every downstream consumer calls (kills the re-derivation bug
     class). No screen computes "workout count" on its own again.
   - Write-once summaries (weekly/monthly) keep their snapshots; the new model only changes NEW
     computations unless a summary is force-regenerated.
   - A data-integrity test plan + a read-only audit tool BEFORE any migration writes.

4. **Manual duration plumbing.** (Justin: "we have the manual duration stuff... are we documenting it
   correctly in reports/cards/stats/summaries there too?") INITIAL READ: under sessions, the manual
   workout timer / pj_<date>.manualWorkoutMinutes becomes a manual session's ENVELOPE duration, and
   effectiveExerciseMinutes + all consumers read from sessions. We already did the app-wide manual-
   duration audit 2026-07-02 (Issue 1 fixed: summaries/graph now use effectiveExerciseMinutes; Issue 2
   / mixed-day override left by design). OPEN: re-map that plumbing onto session envelopes and RE-RUN
   the full audit under the new model so nothing regresses.

5. **Garmin / other devices.** (Justin: "they use different names... different data formats? are we
   covered?") INITIAL READ (needs verification, do NOT overclaim): the app reads Apple HealthKit, which
   NORMALIZES workouts from any device that writes to it (Garmin, Whoop, etc.) into HKWorkout with a
   numeric HKWorkoutActivityType (see WORKOUT_TYPE_NAMES in workoutData.ts). So a Garmin run synced to
   Apple Health arrives as type 37 "Running" just like an Apple Watch run — we read Apple's normalized
   type, NOT the device's own name/format. So multi-device is MOSTLY covered IF the device writes to
   Apple Health. CAVEATS to verify: (a) envelope-field completeness varies by device (some may not
   populate calories/HR the same way); (b) we intentionally do NOT read/display the source device name
   (roadmap: "APPLE HEALTH" label is deliberate); (c) devices that don't sync to Apple Health at all
   are out of scope (iOS reads HealthKit only). ACTION: verify envelope completeness across a couple of
   device sources + document the "we trust HealthKit's normalized type" assumption.

---

## DIRECTIONS CONSIDERED (for the record)

- **A - keep flat, just clean up:** replace isCardio/day-type with one activity-kind, formalize the
  Apple fields, and route all consumers through one derivation helper. Low risk, kills the bug class,
  but does NOT fix the session-envelope mismatch or the two-sessions-a-day case.
- **B - first-class Sessions (THIS SPEC):** the model above. Matches reality (Apple gives sessions, you
  log activities into them), makes #4/#5/#6 fall out naturally, cleanly separates the two counting
  levels. Cost: a careful, additive data migration.
- **C - radical simplify:** kill the day-level type entirely, day = activities only. Fewer concepts;
  folded into B (B already drops the muddled day-type in favor of sessions).

LEAN: B, with A's "one derivation helper" as a REQUIREMENT inside it (not a separate effort). Justin's
normal training (multiple watch + manual workouts per day) is the case the flat list cannot represent,
which is the argument for B over A.

---

## STILL TO DISCUSS / NOT YET DECIDED

- Exact session `type` enum + whether "class" is a type or just "a session with logged activities."
- The move/reassign + split/merge session UX (open question 2).
- The full migration plan + data-integrity test plan (open question 3) — the scariest part, spec it
  carefully before any code.
- How programs / weekly templates / routines map onto sessions (the DayProgram/PRESET_PROGRAMS/Routine
  layer isn't addressed yet — planning vs logging).
- Where lift PR history lives (per-lift, across sessions) — ties to the "PR tracking + lifting stats"
  item.
- Rest days in a session world (a rest day = a day with zero sessions? or an explicit marker?).
- Mindful-mode behavior for sessions / roll-up / counts.
