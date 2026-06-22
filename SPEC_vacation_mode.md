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
- **Streaks:** ALL auto-tracked streaks HOLD (freeze) across the range — no break, no +1 — via the full-day branch of `streakHeldByExclusion`. The user returns to the exact streak length they left with.
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

- **Duration:** a day-count stepper (e.g. 1-30 days). [OPEN: max cap? suggest 30, with a note that longer = re-toggle.]
- **Start:** today by default, or pick a future date. [OPEN: allow a PAST start date / mark a past trip? See Open Questions — touches guardrail 2.]
- **Active banner:** while a vacation is live, a home-screen banner reads "On vacation · back [date]" with an "End early" action.
- **End early:** stops the vacation immediately; un-excludes the remaining FUTURE days in the range (days already passed stay excluded — they really were off days). [LOCKED: ending early never un-excludes a day that has already elapsed.]
- **Auto-expiry:** on the first app open after the end date, vacation auto-clears (no user action). Past vacation days keep their excluded flag permanently (honest record of the trip).
- **Edit active vacation:** [OPEN: can the user extend/shorten a running vacation, or must they end + restart?]

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

## Notifications during vacation (LOCKED intent; specifics pair with Snooze)

- Suppress streak-risk and "you are behind" nudges for the duration (they directly contradict "you are off"). 
- [OPEN: keep faith/verse + sleep/recovery informational notifications? Lean yes for Rooted/Exploring — they are not performance nudges.]
- Implementation pairs with the Snooze item; the vacation window acts as a blanket snooze on performance notifications.

---

## Open questions (need Justin)

1. **Past-range support.** Allow starting a vacation in the PAST to mark a trip already taken? Legit (you really were away) but it is the closest thing to the "retroactive eraser" guardrail 2 warns about. Options: (a) forward/today only — cleanest, most honest; (b) allow past with the same intentional framing. LEAN (a) for v1; a real past trip can still be excluded day-by-day the old way.
2. **Exact home(s).** Confirmed: Settings (setup) + active home banner. Still deciding the SECOND discoverable entry — Toolkit sheet is the lead candidate. Also consider an entry near the Stats calendar/exclusions area.
3. **Max duration cap** (suggest 30) and **edit-while-active** (extend/shorten vs end+restart).
4. **Notification carve-outs** (faith + informational kept on?).
5. **Weight during vacation:** weight has no exclusion category and the weight graph is intentionally ungated. Likely Vacation Mode just does not prompt for weight; weight you do log still shows. Confirm no special handling needed.
6. **Manual / faith streaks** (gratitude, prayer, custom check-ins): these are NEVER auto-held by exclusion (you can still do them on an off day). Confirm Vacation Mode should likewise leave them fully active — you can keep your prayer streak alive on vacation if you want.

---

## Build order (draft, after design lock)

1. `pj_vacation` model + sync/restore wiring (services/syncService.ts) + reinstall verify.
2. Apply/auto-expiry engine: stamp excluded onto in-range days (read-then-merge) on app open / rollover; auto-clear past end date.
3. Settings setup UI (stepper, start date, start/confirm) + mode-aware copy.
4. Active home banner ("back [date]" + End early).
5. Toolkit entry + (revisit) Stats calendar entry.
6. Notification suppression (with Snooze).
7. Mindful + 5-theme audit; tooltip + tutorial (exclusion explainers already mention the hold — add a Vacation Mode line).
