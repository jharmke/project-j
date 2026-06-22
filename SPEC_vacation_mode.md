# SPEC — Vacation Mode

Status: DESIGN IN PROGRESS 2026-06-22. Unblocked by the Exclusion-behavior decision (Option A / HOLD) + the Step 1-3 exclusion-contract work, all shipped 2026-06-22. This doc is the source of truth; nothing is built yet. Sections marked LOCKED are decided with Justin; OPEN sections still need a call.

Pairs with: Snooze notifications (separate item, designed alongside but not built here). Built on: the per-day exclusion model (`pj_<date>.excluded = {diet,water,exercise}`), the canonical `isDayExcluded` contract, and the streak HOLD helper `streakHeldByExclusion` (utils/streakExclusion.ts).

---

## Philosophy / what it is (LOCKED)

One toggle: the user sets a number of days, and the app treats that whole stretch as planned off days. Nothing gets counted against them and nothing they miss hurts them, but the app keeps quietly capturing data in the background so it is all there when they come back.

It is a bulk-exclude wrapper over a thing the app already sanctions (excluding a sick/travel/off day). It is NOT a new moral hazard: it automates an existing, accepted action.

Core promise: "I am off. Nothing counts. Nothing I miss breaks. When I come back I pick up exactly where I left off."

## The three guardrails (LOCKED — these keep it honest, not a cheat)

1. **Honest data.** A vacation day is marked EXCLUDED, never faked into a win. Nothing displayed becomes a lie. Streaks HOLD; they never pretend the user showed up. (Consistent with the standing honest-numbers principle.)
2. **Framed as intentional rest, not an escape hatch.** Copy is "you are taking time off," never "erase these days." Mindful leans into it warmly; Discipline keeps it sober (the user opted into accountability, so it is rest, not a dodge). This guards against Vacation Mode degrading into a retroactive bad-week eraser.
3. **Visible, not hidden.** Vacation days show on the Stats calendar (the same exclusion bubbles already there) and via an active-state banner. The user can always see exactly what they paused.

---

## Scope: what "on vacation" does (LOCKED)

Vacation Mode applies a FULL-DAY exclusion to every day in the range. Concretely, per day it sets `excluded = {diet:true, water:true, exercise:true}` (the existing full-day exclusion the pop-up already uses). Consequences, all inherited for free from the shipped exclusion work:

- **Day Score:** no composite for that day (drops out, renormalizes to nothing — the day simply has no score).
- **Weekly / Monthly summaries + Comparison + EvR:** the day is dropped from all averages and counts.
- **Streaks:** TOTAL BLACKOUT — EVERY streak HOLDS (freezes) across the range, fitness AND faith/manual (gratitude, prayer, custom check-ins) — no break, no +1. The user returns to the exact streak length they left with. This protects faith streaks too: a trip never breaks a 100-day gratitude run (on-brand: faith is never punitive). (Decided 2026-06-22; overrides the earlier "faith streaks stay active" default.)
  - BUILD NOTE: `streakHeldByExclusion` deliberately never holds faith/manual keys on a NORMAL excluded day (you can still pray on a sick day). Vacation needs a SEPARATE path so faith/manual freeze ONLY during an active vacation, leaving regular-exclusion behavior unchanged. Likely: pass an `inVacation` flag into the streak walk-back that, when set, holds every key for in-range days.
- **Stats graphs:** per-category gating already drops the day's calories/macros/water/active-cals/exercise-mins/steps.

### The sleep & recovery exception (LOCKED — Justin's call)

Exclusion means "do not COUNT it," not "do not CAPTURE it." So if the watch is on:

- Sleep score and Recovery score STILL generate and freeze onto the day record (the morning snapshot writes `recoveryScore` / `recoverySignals` / sleep fields regardless of exclusion — this already happens).
- Those scores remain fully VIEWABLE in the Sleep hub, the Recovery card, and Day Detail.
- They are NOT counted toward Day Score / averages, and the sleep streaks still HOLD (do not advance).
- Vacation Mode sets ONLY the averaging exclusion (`excluded`), NOT `sleepTrendExcluded`. So vacation nights still appear in the Sleep + Recovery TREND charts (the user wants to see them).

Rationale (Justin's real scenario): he excluded everything over a weekend but was still interested in his sleep and recovery scores. The data should be there to look at; it just should not move his numbers.

Net: "as if the app stops existing" for scoring/streaks, but passive data (sleep, recovery, steps, active cals, HRV) is still captured and viewable — the user is simply not judged on it.

---

## Controls & lifecycle (LOCKED unless noted)

- **Duration:** a day-count stepper, **max 30 days** (LOCKED; longer = re-toggle).
- **Start:** today by default, or pick a future date. [OPEN: allow a PAST start date / mark a past trip? Lean forward-only v1 — see Open Questions, touches guardrail 2.]
- **Active banner:** while a vacation is live, a home-screen banner reads "On vacation · back [date]" with an "End early" action.
- **End early:** stops the vacation immediately; un-excludes the remaining FUTURE days in the range (days already passed stay excluded — they really were off days). [LOCKED: ending early never un-excludes a day that has already elapsed.]
- **Auto-expiry:** on the first app open after the end date, vacation auto-clears (no user action). Past vacation days keep their excluded flag permanently (honest record of the trip).
- **Edit active vacation:** END + RESTART (LOCKED) — no in-place extend/shorten in v1. Keeps it simple.

## No settings panel (LOCKED — Justin 2026-06-22)

Vacation Mode has NO sub-options / configuration. The whole value is not having to think — a restful feature should not ship with a control panel. ONE decision: how many days. Behavior is total and predictable (everything off). If users later need granularity, add it then; v1 stays dead simple.

---

## Storage & sync (LOCKED — Justin's hard requirement: survives reinstall)

- New key `pj_vacation`: the single source for vacation state, e.g.
  `{ active: boolean, startKey: 'YYYY-MM-DD', endKey: 'YYYY-MM-DD', startedAt: ISO }`.
  (Single active/scheduled vacation at a time, mirroring the single-challenge model.)
- **How the exclusion is applied:** as each day in range is encountered (app open / day rollover), the excluded flag is MERGED onto that day's `pj_<date>` record (read-then-merge, additive, never overwrites other fields). This means every shipped reader already honors vacation days with zero new code paths.
  - [OPEN/DECISION FOR BUILD: for a forward-scheduled range, future days have no `pj_<date>` record yet. Two options: (a) lazily stamp each day's record when that day arrives / is opened; (b) have `isDayExcluded`-style readers also consult `pj_vacation` for any date in an active range. Lean (a) for past/current days + a light range-check fallback for any day a reader touches inside the window. Resolve at build time; both keep data honest.]
- **Cloud durability:** `pj_vacation` MUST be added to the synced key set in services/syncService.ts (and the restore gate) so it round-trips on reinstall exactly like logged data. The per-day excluded flags already ride on the synced `pj_<date>` records. Verify both restore on a real reinstall before marking done (per the reinstall-data-loss history).

---

## Mode awareness (LOCKED that it is mode-aware; copy OPEN)

- **Discipline:** sober framing. "Planned time off. Your streaks hold; nothing counts while you are away." No guilt, no celebration, just a clear statement. Optionally a one-line "you are choosing this" confirm.
- **Balanced:** neutral, friendly. "Enjoy your time off. We will keep everything paused and pick back up when you are back."
- **Mindful:** warm, rest-affirming. "Rest is part of the work. Take the time, we will be right here when you return." No streak-pressure language.
- Faith tie-in [OPEN, optional]: a gentle rest/Sabbath note for Rooted/Exploring (rest without guilt), hidden for Not Right Now. Keep it optional and unforced.

## Notifications during vacation (LOCKED — total silence)

- ALL notifications are silenced for the duration. Total blackout, including the daily verse and all informational pushes — not just performance nudges. (Justin 2026-06-22: "vacation should be everything off." The verse-as-sole-exception was offered and declined; everything means everything.)
- Implementation: the active vacation window acts as a blanket mute over the whole notification scheduler. Pairs with the Snooze item (vacation = a full-window snooze).

---

## Open questions

1. **[OPEN] Past-range support.** Allow starting a vacation in the PAST to mark a trip already taken? Legit (you really were away) but it is the closest thing to the "retroactive eraser" guardrail 2 warns about. Options: (a) forward/today only — cleanest, most honest; (b) allow past with the same intentional framing. LEAN (a) for v1; a real past trip can still be excluded day-by-day the old way. AWAITING JUSTIN.
2. **[MINOR] Exact second home.** Confirmed: Settings (setup) + active home banner + Toolkit entry (lead). Could also add an entry near the Stats calendar/exclusions area. Finalize during build.

### Resolved 2026-06-22
- **Max duration:** 30-day cap. **Edit-while-active:** end + restart (no in-place edit).
- **Notifications:** ALL off during vacation (incl. verse). No carve-outs.
- **Weight:** no special handling — Vacation Mode does not prompt for weight; logged weight still shows.
- **Faith / manual streaks:** FREEZE during vacation (total blackout), unlike a normal exclusion which leaves them active. Needs the `inVacation` streak path (see Scope build note).
- **Settings panel:** none. One decision (days); behavior is total.

---

## Build order (draft, after design lock)

1. `pj_vacation` model + sync/restore wiring (services/syncService.ts) + reinstall verify.
2. Apply/auto-expiry engine: stamp excluded onto in-range days (read-then-merge) on app open / rollover; auto-clear past end date.
3. Settings setup UI (stepper, start date, start/confirm) + mode-aware copy.
4. Active home banner ("back [date]" + End early).
5. Toolkit entry + (revisit) Stats calendar entry.
6. Notification suppression (with Snooze).
7. Mindful + 5-theme audit; tooltip + tutorial (exclusion explainers already mention the hold — add a Vacation Mode line).
