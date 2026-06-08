# Notifications: Living Spec

First checkpoint: 2026-06-04
Last updated: 2026-06-08 (full redesign locked with Justin)

Status: REDESIGN LOCKED. This is the source of truth for the notification overhaul. The shipped infrastructure is preserved below; everything from the settings UI down is new. No double dashes anywhere (project rule). No "Session NN" tags.

---

## What exists today (infrastructure, do not rebuild, extend it)

- expo-notifications installed, APNs key generated via EAS, plugin configured in app.json.
- services/notifications.ts: permission handling (one-shot iOS ask, never on cold launch), IF window scheduling (event-driven, cancels on last meal), daily scheduler engine, mode-aware copy (Discipline/Balanced/Mindful), quiet hours enforcement, P1/P2 priority tiers, auto-timing spacing, average bedtime calc from last 7 days of sleepBedTime.
- services/notificationScheduler.ts: reads all data from AsyncStorage, runs once per day (guarded by pj_notif_last_scheduled), triggers permission ask when a streak hits 3+ days.
- Storage keys: pj_notification_settings, pj_notif_last_scheduled.

The redesign replaces the settings UX and coordination logic. The scheduler/service stay and are extended, not rewritten.

---

## What is killed

These types are removed entirely:
- Morning Intention: killed. Feature does not exist.
- Weekly Recap (old daily-scheduler type): killed. Replaced by Weekly Summary Ready below.
- Achievement notification: killed. Achievements are computed in-app only, no background detection.
- IF Window Open: killed. User manually starts the window.
- Calorie goal hit: killed.

---

## Notification types: final list

### Priority system

**P1 - always fires, does NOT count against the daily cap:**
- Streak Protection
- IF Window Closing

**Always fires, bypasses cap entirely:**
- Weekly Summary Ready (fires once a week)
- Monthly Summary Ready (fires once a month)
- Re-engagement (hidden from settings, always-on)

**P2 - competes for daily cap slots, in priority order:**
1. Faith Reading
2. Gratitude / Prayer (treated as a pair, one slot each)
3. Water Pace
4. Food Log Reminder
5. Activity Reminder
6. Daily Verse
7. Weight Log Reminder
8. IF Check-In

With a default cap of 5, users with a full P2 queue will rarely see Weight Log (7) or IF Check-In (8) unless higher-priority conditions are not met. This is acceptable. The most important things surface first.

---

### P1 types

#### Streak Protection
- Fires once per day, bedtime-aware. Default: 9pm until enough sleep history exists (7+ days of sleepBedTime). Then fires average-bedtime minus user-set offset (default 45 min, Advanced control: 30/45/60 min).
- All active streaks that have not been completed today are BATCHED into one notification. Never multiple streak notifications.
- Copy: if 1 streak: "[Name] streak - [X] days. Don't let it end tonight." If 2: "[Name] and [Name] streaks at risk tonight." If 3+: "[N] streaks at risk tonight. Tap to check."
- Mindful default: suppress entirely. Streaks are informational only in Mindful.
- Mindful growth areas ON: fires with "keep going" framing. Never uses "at risk." Example: "Your Gratitude streak continues today. One small action keeps it going."
- Variations: 4-6 per mode. Deterministic rotation.
- Deep link: Home tab.
- Visible in settings: yes, standalone toggle above category pills (not under any category since streaks span fitness and faith).

#### IF Window Closing
- Event-driven. Fires X minutes before the eating window closes.
- Lead time controlled in Advanced: 15 / 30 / 60 min. Default: 30 min.
- Cancels and reschedules whenever the IF window is updated.
- Mindful: fires. Informational, not corrective. Gentle copy variant.
- Variations: 4-6 per mode.
- Deep link: Home tab, IF card.

---

### Always-on bypass types

#### Weekly Summary Ready
- Fires Monday at 11am-12pm.
- Cancel-on-action: when the app is opened on Monday before the notification fires, the scheduler cancels it (user already has access). If the app is not opened, notification fires.
- Simple toggle in Summaries category: on/off only, no time control.
- Deep link: Stats tab, directly to the weekly summary page (not just the tab).

#### Monthly Summary Ready
- Fires on the 1st of each month at 11am-12pm.
- Same cancel-on-action logic as Weekly.
- Same toggle in Summaries category.
- Deep link: Stats tab, directly to the monthly summary page.

#### Re-engagement
- Hidden from settings. Always-on system behavior. Not user-controllable.
- Fires 48 hours after last app open. If still no open after that, fires once per week.
- Mindful copy: "No pressure. We're here when you're ready."
- Discipline copy: "It has been a couple days. Get back on track."
- Balanced copy: "It has been a couple days. Your streaks and goals are waiting."
- Variations: 4-6 per mode.
- Deep link: Home tab.

---

### P2 types (priority order)

#### 1. Faith Reading
- Covers both devotionals (pj_devotionals) and reading plans (pj_reading_plans) in a single notification.
- Only fires if user has at least one active devotional or reading plan with today's content not yet completed.
- Smart content: if only one item pending, name it and the day. "Walk Through the Psalms - Day 3 is waiting." If multiple, count them. "2 devotionals and 1 reading plan have today's content ready."
- Cancel-on-complete: when user marks a devotional day or reading plan day complete, cancel this notification if nothing else is still pending.
- Faith-gated: Rooted and Exploring only. Does not fire for NRN.
- Mindful: fires unchanged.
- Variations: 4-6 per mode.
- Deep link: Plans screen (app/plans.tsx).

#### 2. Gratitude
- Fires if gratitude has not been logged today.
- Cancel-on-action: when gratitude is logged, cancel immediately.
- Mindful: fires. Very aligned with Mindful philosophy.
- Gentle copy example: "Take a moment to log what you are grateful for today."
- Variations: 4-6 per mode.
- Deep link: Faith tab, auto-scroll to gratitude card.

#### 2. Prayer Check-In
- Fires at user-set time (Advanced). Default: night.
- Skips if prayer has already been logged today.
- Faith-gated: does not fire for NRN.
- Mindful: fires. Gentle framing.
- Variations: 4-6 per mode.
- Deep link: prayer.tsx directly.

#### 3. Water Pace
- Water reminders are their own sub-system. User picks count: Off / 1 / 2 / 3 / 4 per day. Default: 3.
- Water count is separate from and does NOT compete with the P2 daily cap. Water is utility, not coaching content.
- The selected count is spaced evenly across waking hours (defined by quiet hours). Example: 3 reminders with quiet hours 10pm-7am = fires roughly 9am, 1pm, 5pm.
- Each slot only fires if the user is 25% or more behind expected pace at that moment. Expected pace is linear from 6am to 10pm.
- Cancel-on-goal: if water goal is hit, remaining slots are cancelled.
- Mindful: fires. Hydration is not judgmental.
- Variations: 4-6 per mode.
- Deep link: Home tab, auto-scroll to water card. Fallback: Home tab if card not visible.

#### 4. Food Log Reminder
- Fires at 2pm if no food has been logged today. No time picker.
- Mindful default: suppress.
- Mindful growth areas ON: fires. Gentle copy: "Take a moment to check in with what you have eaten today."
- Variations: 4-6 per mode.
- Deep link: Log tab.

#### 5. Activity Reminder
- Fires at user-set time (Advanced time picker). No default bucket, user sets exact time.
- Condition: no workout logged today AND steps below 75% of step goal.
- Rationale for combined condition: some users are highly active at work or running errands without logging a workout. 75% step threshold accounts for this.
- Mindful default: suppress.
- Mindful growth areas ON: fires. Gentle copy: "How has your movement been today?"
- Variations: 4-6 per mode.
- Deep link: Workout tab.

#### 6. Daily Verse
- Fires randomly within 8-11am window each day.
- Notification body: shows first line of today's verse.
- Faith-gated: Rooted and Exploring only. Does not fire for NRN.
- Mindful: fires unchanged.
- Variations: 4-6 (different framing lines, same verse content).
- Deep link: Bible screen, auto-scrolled to today's verse with it highlighted, exactly as if user tapped the Today's Message card on the Faith tab.

#### 7. Weight Log Reminder
- Fires in the morning on user-set frequency (Advanced: Daily / Every 3 days / Weekly).
- Skips if weight has already been logged today.
- Only fires if user has logged weight at least once before (shows intent to track).
- Suppress in Mindful always, regardless of growth areas setting. Weight is de-emphasized in Mindful across the entire app.
- Variations: 4-6 per mode (Discipline/Balanced only, no Mindful pool needed).
- Deep link: Home tab, auto-scroll to weight card. Fallback: Home tab if card not visible.

#### 8. IF Check-In
- Fires if food has been logged today but the IF window has not been started.
- INVESTIGATION NEEDED before building: condition logic may not be working correctly. Justin has not recalled receiving this notification despite meeting conditions. Audit the ifEnabled check in notificationScheduler.ts before building.
- Mindful default: suppress.
- Mindful growth areas ON: fires. Gentle copy.
- Variations: 4-6 per mode.
- Deep link: Home tab, IF card.

---

## Settings UI layout

Screen renders top to bottom:

**Enable Notifications** [master on/off toggle]

**Quiet Hours** [tap to edit row, shows current range, e.g. "10:00 PM to 7:00 AM"]

**Streak Protection** [on/off toggle, standalone, above categories]

**How many per day**
[3]  [5]  [All]  (pill selector, default: 5)
Note: P1 and always-on types are not affected by this cap.

**What can we notify you about?**
[Fitness]  [Faith]  [Fasting]  [Summaries]
Category pill toggles. All on by default.
Faith pill: greyed out (not hidden) for NRN faith journey users. Faith-type notifications suppressed but the control is still visible.

**Water reminders** (only visible when Fitness category is on)
[Off]  [1]  [2]  [3]  [4]  per day  (default: 3)
Note: water count bypasses the daily cap. It is utility, not coaching content.

**Advanced** [collapsed by default, chevron to expand]
- Activity reminder time: [time picker]
- Weight log frequency: [Daily]  [Every 3 days]  [Weekly]
- Prayer check-in time: [time picker]
- IF window reminder: [15 min]  [30 min]  [60 min]  before close
- Streak protection: [30]  [45]  [60]  min before bedtime

---

## Defaults (fresh install)

- Master toggle: on
- Quiet hours: 10pm to 7am
- Daily cap: 5
- All categories: on
- Water count: 3
- Streak protection: on
- Activity reminder time: 5:00 PM
- Weight log frequency: Every 3 days
- Prayer check-in time: 9:00 PM
- IF window reminder: 30 min
- Streak protection offset: 45 min

---

## Deep linking (all types)

Every notification taps into a specific destination. Generic "open to last screen" is not acceptable.

| Type | Destination |
|---|---|
| Streak Protection | Home tab |
| IF Window Closing | Home tab, IF card |
| Weekly Summary Ready | Stats tab, weekly summary page directly |
| Monthly Summary Ready | Stats tab, monthly summary page directly |
| Re-engagement | Home tab |
| Faith Reading | Plans screen (app/plans.tsx) |
| Gratitude | Faith tab, auto-scroll to gratitude card |
| Prayer | prayer.tsx directly |
| Water Pace | Home tab, auto-scroll to water card (fallback: Home tab) |
| Food Log | Log tab |
| Activity | Workout tab |
| Daily Verse | Bible screen, auto-scroll to today's verse (same as tapping Today's Message card) |
| Weight Log | Home tab, auto-scroll to weight card (fallback: Home tab) |
| IF Check-In | Home tab, IF card |

---

## Copy variations

Every notification type must have 4-6 copy variations per coaching mode. Deterministic rotating pool: an index stored per type increments each time that type fires, cycles back to 0 at the end of the pool. No AI generation at runtime. All copy written once, pre-baked.

Each type gets separate pools for Discipline, Balanced, and Mindful (where applicable). Weight log has no Mindful pool since it is suppressed. Types suppressed in default Mindful still need Mindful growth-areas-ON pools.

Copy pass is its own build step. Do not write copy inline while building the scheduler logic.

---

## Mindful behavior (two states)

Mindful has two states driven by mindfulGrowthAreas boolean in pj_settings (default false).

| Type | Mindful default (growth areas OFF) | Mindful + growth areas ON |
|---|---|---|
| Food Log | Suppress | Fires, gentle copy |
| Activity | Suppress | Fires, gentle copy |
| Water | Fires | Fires |
| Weight Log | Suppress always | Suppress always |
| Streak Protection | Suppress | Fires, keep-going framing, never "at risk" |
| IF Window Closing | Fires | Fires |
| IF Check-In | Suppress | Fires, gentle copy |
| Daily Verse | Fires | Fires |
| Faith Reading | Fires | Fires |
| Gratitude | Fires | Fires |
| Prayer | Fires | Fires |
| Summaries | Fires | Fires |
| Re-engagement | Fires, gentlest copy | Fires |

Confirmed gentle copy anchors (starting points for copy pass):
- Food log (growth areas ON): "Take a moment to check in with what you have eaten today."
- Activity (growth areas ON): "How has your movement been today?"
- Streak protection (growth areas ON): "Your [name] streak continues today. One small action keeps it going."
- Re-engagement (default): "No pressure. We are here when you are ready."

---

## Smart coaching scenarios (NOT this build, details NOT agreed on)

A future layer where the notification content is cross-data-aware rather than single-signal. Examples discussed but not locked:
- Big workout logged + calories significantly below target midday: refuel nudge
- Calories already near daily target before dinner: watch-it nudge
- Yesterday significantly over calories + today trending very low: compensation pattern warning
- Protein tracking well below target despite calories being on track: macro nudge
- Multi-day streak of hitting calorie goal: momentum acknowledgment

Architecture intent: same deterministic brain as the Smart Coach (SMART_COACH_SPEC.md). Scenarios computed at app open, scheduled if condition met, fired within smart time windows baked into each scenario. No live AI call at notification fire time.

This layer is NOT part of the current overhaul. Do not build piecemeal. Needs a dedicated design session before any code.

---

## Open items

1. [x] IF Check-In investigation RESOLVED 2026-06-08: root cause was ifEnabled only checked today's key, but ifMethod is set only on the day the user taps a method pill, not carried forward. Fix: scheduler now looks back 7 days for any pj_${date} key that has ifMethod set.
2. Copy variations pass: 4-6 variations per type per coaching mode, pre-baked, deterministic rotation. This is a dedicated pass AFTER logic is confirmed working. Do not write inline.
3. [x] Deep linking BUILT 2026-06-08: app/_layout.tsx has a Notifications.addNotificationResponseReceivedListener that reads data.route / data.params and calls router.push. Every notification type in services/notifications.ts has the data payload baked in per the deep-link table above.
4. [x] Cancel-on-action BUILT 2026-06-08: weekly-summary.tsx calls cancelWeeklySummaryNotification on mount; monthly-summary.tsx calls cancelMonthlySummaryNotification on mount; devotional.tsx calls cancelFaithReadingNotification on mark-complete (not on unmark); bible.tsx calls cancelFaithReadingNotification in markPlanRead.

---

## Checkpoint log

- 2026-06-04: Doc created from Justin's gym notes (Smart/Manual split, personality fallback, in-app page, summary routing) and roadmap notification items.
- 2026-06-08: Full redesign locked with Justin. Smart/Manual split replaced with category-based settings + daily cap + priority system. 14 types finalized (2 killed, 4 new added). Settings UI fully specced. Deep linking table complete. Mindful two-state pass complete. Copy variation approach locked (deterministic rotation, 4-6 per type per mode). Smart coaching scenarios preserved as future layer, not this build, details not agreed on.
- 2026-06-08: Core build complete. services/notifications.ts and services/notificationScheduler.ts fully rewritten. Settings UI replaced (old 3-accordion/11-toggle structure gone, new spec-compliant design). Deep linking wired. Cancel-on-view (weekly/monthly) and cancel-on-complete (faith reading) hooked up. IF Check-In bug root-caused and fixed. REMAINING: copy variations pass only.
