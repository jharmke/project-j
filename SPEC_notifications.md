# Notifications: Living Spec (Smart/Manual System)

First checkpoint: 2026-06-04 (organized from Justin's gym notes + the roadmap's notification items)

Status: SCOPING. This is now the source of truth for the notification redesign. The shipped infrastructure is summarized below so the doc stands alone; the forward-looking design (Smart/Manual split, the personality fallback, the in-app page, summary routing) is what gets built next. No double dashes anywhere (project rule). No "Session NN" tags.

This doc consolidates: roadmap "NOTIFICATIONS OVERHAUL" item, the two false-fire bugs, the "too many notifications, on by default" note, notification deep-linking, and "MODE NUDGE NOTIFICATIONS deferred to SOON." Those roadmap items now point here. The shipped [x] history stays in the roadmap as a record.

---

## What exists today (shipped, verified in roadmap)

Real infrastructure is already live, do not rebuild it, extend it:
- expo-notifications installed, APNs key generated via EAS, plugin configured in app.json.
- services/notifications.ts: the notification service. Permission handling (one-shot iOS ask, never on cold launch), IF window scheduling (event-driven, cancels on last meal), the daily scheduler engine with all 10 notification types, mode-aware copy (Discipline/Balanced/Mindful) for every type, quiet hours enforcement, P1 (streak + IF window, never suppressed) / P2 (everything else, subject to spacing) priority tiers, auto-timing spacing, average bedtime calc from the last 7 days of sleepBedTime.
- services/notificationScheduler.ts: reads all data from AsyncStorage, runs once per day (guarded by pj_notif_last_scheduled), triggers the permission ask when a streak hits 3+ days.
- Settings > Notifications UI: master toggle, quiet hours, minimum spacing pills, per-type blocks with toggles + time pickers, faith-gated types (Morning Intention, Evening Gratitude, Prayer Check-In). Currently 3 accordions (Health & Habits / Fasting / Faith) with up to 11 individual toggles.
- Storage keys: pj_notification_settings, pj_notif_last_scheduled.

The redesign below sits ON TOP of this. The scheduler/service stay; the coordination layer and the settings UX change.

---

## The core problem

Up to 11 independent notification types fire separately with no coordination, which feels spammy. Two things have to change: how notifications are CHOSEN (coordination), and how the user CONTROLS them (settings simplification). The Smart/Manual split is the frame for both.

---

## 1. Smart vs Manual: the top-level toggle (gym note 2)

A single top-level control at the top of notification settings: Smart mode or Manual mode.

- MANUAL = the current granular system. All individual toggles, the user picks everything: which types fire, exact times, spacing. Nothing app-decided. This is what exists today, preserved for users who want full control.
- SMART = an app-coordinated system that fires intelligently based on the user's data. The user does NOT pick individual messages. Instead the user sets:
  - a FREQUENCY CEILING (how many notifications per day they are willing to receive),
  - TIME WINDOWS (when they are open to being notified),
  - SUBJECT PREFERENCES (which categories are fair game: nutrition, sleep, activity, faith, etc.).
  - The app decides the actual content within those bounds.

Key correction to the old "one daily digest" framing: SMART IS NOT CAPPED AT ONE PER DAY. The user controls how many they want and when. Smart coordinates and prioritizes; it does not force a single ping.

Smart mode is where the Smart Coach hybrid engine plugs in as the content brain (see Relationship to Smart Coach). The deterministic brain decides WHAT matters today; the frequency ceiling and windows decide HOW MANY and WHEN.

DEFAULTS (from the roadmap "too many notifications, on by default" note): flip the defaults toward fewer/off so a fresh install is not noisy. Decide the exact default state when refining this doc.

MODE-AWARENESS (project hard rule): Smart notification tone and aggressiveness must respect the coaching mode (Discipline / Balanced / Mindful). Mindful especially: no corrective/growth-area pings, gentle framing only. Define fully at build.

---

## 2. Smart message logic: the "we miss you" fallback (gym note 3)

When Smart mode wants to fire but there is nothing data-specific to say (no logs, no activity, early in streak building), it should NOT go silent and it should NOT fire a generic line. It fires a fun, direct, personality-filled message that sounds like the app talking to the user.

Voice target (warm, creative, not generic):
- "Haven't seen you today. Don't let the day slip by."
- "We miss you. Come back."

These fallback messages get a PS BLOCK appended with any urgent / time-sensitive items, for example:
- IF window closing
- streak ending tonight
- water goal untouched by 8pm

So the structure is: [personality line] + [optional PS: urgent items]. The personality line carries the warmth; the PS carries the utility.

This needs full speccing: lots of situations and variable combinations (which urgent items exist, how many to stack in the PS, how the personality line varies by time of day / streak state / how long since last open). The fallback voice should live in the same system as the rest of the app's personality so it reads cohesive.

OPEN: deterministic micro-copy vs AI-phrased. Lean deterministic for the personality lines (a curated rotating set keyed by state) to avoid cost and keep them tight, same reasoning as the contextual-card-copy decision in the roadmap. Decide when refining.

---

## 3. In-app notifications page (gym note 4)

A dedicated in-app screen. iOS gives no native notification history, so we build our own. The page holds:
- NOTIFICATION HISTORY: what fired and when (a scrollable log).
- THE FULL NOTIFICATION SETTINGS: this is where the simplified Smart/Manual settings UX lives, moved/duplicated out of the buried Settings location.

The settings UI gets simplified as part of the Smart/Manual split: today's 3 accordions with 11 toggles collapse to a small number of high-level controls (Smart mode: ceiling + windows + subjects; Manual mode: the granular toggles, shown only when Manual is selected).

OPEN: history persistence (how many entries, how long retained, storage key). Decide at build. Likely a new pj_notification_log key, append-only, capped at N entries, read-then-merge.

---

## 4. Summary-ready routing notifications (gym notes 5 + 13)

A simple, non-intrusive push when a weekly or monthly summary is ready: "Your weekly summary is ready." Tapping it opens directly INTO that summary. Same for monthly. This is a ROUTING notification, not a digest, it carries no content, it just gets the user to the summary screen.

Notes 5 and 13 are the same feature: the notification experience and the summary screen must be DESIGNED TOGETHER so the tap-to-open flow is seamless. This pairs with the weekly/monthly summary work in the roadmap (Reports section, Day Summary / Weekly Summary / Effort vs Results) and the day-summary spec. Build the routing when the summaries exist.

Depends on: notification deep linking (below) working, and the weekly/monthly summary screens existing.

---

## 5. Notification deep linking (from roadmap, folded in)

Today all notifications open the app to whatever was last open. Minimum bar: tap a notification, land on the correct tab. Bonus: auto-scroll/center to the relevant card within that tab. Applies to every notification type (streak protection, IF window closing, food log reminder, water pace, activity reminder, summary-ready, etc.). This is the mechanism the summary-routing notifications (section 4) depend on, so build it as the shared routing layer.

---

## 6. Known bugs to fix in the overhaul (from roadmap)

- FALSE FIRES (delete-the-app territory, worth a standalone fix before the full overhaul):
  - 7pm "Food log reminder, you haven't logged anything today" fired after 3 meals + snacks were logged since 7:40am.
  - 8pm "log gratitude" fired after gratitude was logged that morning.
  - Root cause: trigger conditions are not reading current-day state. The Smart coordination layer must read live state before firing anything, which fixes this class of bug structurally, but the two specific false fires deserve a quick patch first.

---

## 7. Mode nudge notifications (from roadmap, folded in)

All three coaching tiers have mode nudge notifications specced in the onboarding/mode docs, deferred because they needed notification infrastructure first. The infrastructure now exists, so these can be scheduled as a notification subject under the Smart system. Fold them into the subject preferences (section 1) rather than as standalone toggles.

---

## Relationship to the Smart Coach

The Smart notification system is a DELIVERY SURFACE for the Smart Coach hybrid engine, the same way EvR, Day Summary, and the home card are surfaces. The roadmap is explicit: "Notification delivery is a second surface for the same coaching logic, so design it with the coach, not separately." The coach brain decides what is worth saying; this doc decides how it reaches the user (frequency, windows, subjects, routing, the personality fallback when the brain has nothing). Do not build a parallel content engine.

The faith-gated notification types (Morning Intention, Evening Gratitude, Prayer Check-In) stay faith-tier-aware and are NOT routed through Halo or the Smart Coach; they remain their own gentle scheduled pings, surfaced as a "faith" subject in Smart mode.

---

## Open questions (refine when Justin is back)

1. Smart mode default state on a fresh install: how many per day, which subjects on, which windows? (Roadmap says lean fewer/off.)
2. The personality fallback line set: deterministic rotating copy vs AI-phrased. Lean deterministic.
3. How many urgent items stack in the PS block, and their priority order.
4. In-app notification history: retention, cap, storage shape.
5. Where the simplified settings live: only on the new in-app page, or mirrored in Settings.
6. Exact Mindful-mode behavior for Smart notifications (corrective pings suppressed, gentle framing).

---

## Checkpoint log
- 2026-06-04: Doc created from Justin's gym notes (Smart/Manual split, the we-miss-you fallback + PS block, the in-app notifications page, summary-ready routing) plus the roadmap's notification items (overhaul, false-fire bugs, defaults-to-fewer, deep linking, mode nudge notifications). Corrected the old "one daily digest" assumption: Smart is NOT capped at one per day, the user sets a frequency ceiling. Shipped infrastructure summarized so the doc stands alone. Roadmap items now point here. Next: refine the open questions with Justin.
