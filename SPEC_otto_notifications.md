# SPEC: Otto Notification Hub (in-app notification system)

STATUS: DESIGN LOCKED for v1 build (2026-07-04, from the gym-notes design thread). Some items are
DECIDED, some are OPEN and flagged as such. Do NOT treat OPEN items as settled.

## PHASE 1 CORE: BUILT + device-verified 2026-07-04 (pure JS)
Files: utils/notifications.ts (store + hook), components/NotificationPanel.tsx (the panel),
components/AssistantFAB.tsx (badge dot), components/AssistantOverlay.tsx (wires the badge),
components/AssistantChat.tsx (bell in header), components/AchievementToast.tsx (producers),
app/settings.tsx (dev tool). What shipped:
- Store: Type A (replace-by-id) / Type B (stack, deduped by stable id), 100 cap, read-then-merge,
  subscribe + useNotifications hook, markReadIds.
- Panel: centered card ANCHORED inside Otto (topOffset prop, so it doesn't poke above his header);
  opaque bgSheet; accent top border + accent title; tap-to-close handle; fixed uniform size (~60%);
  uniform-height cards; iOS-style collapsible grouped stacks (max 2 peeks, 1 for a 2-item group,
  count in the pill); unread = accent dot + rail; Reanimated animations; per-item clear + Clear-all
  with confirm; Done = accent button; relTime caps at weeks.
- Badge dot on the FAB (breathes with it). Bell in Otto's chat header (+ keyboard dismiss).
- Producers: achievements (route + highlightId -> scrolls to it) and daily-goal hits (INFORMATIONAL,
  no route, grouped under Daily Goals). Dev tool "Add sample notifications" in Settings > Dev Tools.
- READ MODEL LOCKED (was OPEN): "seen = actually VIEWED." On close, mark read ONLY singles + groups
  you EXPANDED; a collapsed group you never opened keeps its unread dots + badge.
- Display component decided: a bespoke centered panel (not literally TooltipModal), matching the
  centered-modal house standard. Swipe-to-delete: SKIPPED (the per-card X suffices).
Two implementation gotchas for future-me: (1) bgCard is rgba(...,0.85) = translucent on light themes
-> use bgSheet for opaque modal surfaces. (2) LayoutAnimation does NOT fire inside this
GestureHandler/Reanimated tree -> use Reanimated layout animations. (3) the collapsed-stack peeks must
render DEEPEST-first or the z-order inverts and the stack looks scrambled.

STILL DEFERRED (intentional): the TDEE Type-A producer (needs adaptive TDEE built, Phase 3), real
records/summaries producers (the "New PR" dev sample is a placeholder), the achievement pop-on-action
timing fix, the Mindful copy pass, and a release-build smoothness check on the animations.

Origin: grew out of "where does the adaptive TDEE suggestion live?" Justin didn't want TDEE floating
with no home, and had wanted an in-app notification system for a while, so the two merged: route
in-app notifications through Otto (the general companion), which is always reachable.

This is a SEPARATE surface from SPEC_notifications.md (that spec = system PUSH notifications). See
"Relation to the push spec" below. They are not the same system and must not duplicate each other.

---

## THE ONE-LINE IDEA
Otto is the home for in-app "here's something worth seeing" notifications (wins + results, and the
adaptive-TDEE suggestion). A badge dot on Otto's ever-present FAB signals something is pending; a bell
in Otto's chat header opens the list. Reminders/nudges stay as push notifications, not here.

---

## WHY OTTO (the anchor decision) -- DECIDED
- Otto's FAB (CompanionFAB.tsx / the sparkle button) is present on EVERY non-faith screen regardless
  of the user's home-card order/visibility. That makes it a reliable anchor.
- REJECTED: a dedicated home-screen card (can be reordered or hidden -> notifications could get
  buried). REJECTED: folding into the existing Smart Tip card (same problem). REJECTED: bells on
  Profile/Settings as a fallback (low-traffic screens, fragments the "Otto is the hub" model, and the
  FAB badge is already more visible than a Profile-only bell). Discoverability is solved by making the
  FAB badge prominent, not by scattering entry points.

---

## DELIVERY SURFACES -- DECIDED (visual details OPEN)
- BADGE DOT on the corner of Otto's FAB disc when anything is pending. (Same visual language intended
  as the spec-locked-but-unbuilt theme-unlock cascading dot; note that pattern is NOT built yet, so
  this establishes it fresh.)
- BELL ICON inside Otto's chat header. AssistantChat.tsx header currently has a headerActions row with
  refresh (new chat) + close (X). Bell sits in that row with the pending dot on it -> [bell][refresh][X].
  OPEN CONCERN: three icons may feel tight on small screens; needs a real layout pass.

## HARD CONSTRAINTS -- DECIDED (non-negotiable)
- NO banners (Justin dislikes the app's existing banner look).
- NO bottom sheets (violates the centered-modals-only house rule).
- NEVER an Otto chat bubble. A notification delivered as a chat message hijacks the conversation and
  blocks the user from asking anything else until they deal with it. The notification list is its own
  surface, not part of the chat transcript.

## DISPLAY FORMAT -- LEANING (needs final confirm)
Tapping the bell opens the notification list. Given the constraints (no banner, no sheet), the
recommended path is to REUSE TooltipModal (centered fade-in card + handle pill, already CPP-approved,
matches the centered-modals-only standard). Candidates considered: anchored popover from the bell
(Justin: "too simple"), TooltipModal reuse (recommended), inline header accordion (novel, risks jank
on the JS thread). RECOMMEND TooltipModal for consistency. CONFIRM before building.

---

## PUSH vs HUB: WHAT GOES WHERE -- DECIDED
The dividing line is CONTENT: push = "do this" (reminders/nudges); hub = "see this" (wins/results).
- PUSH ONLY (system notifications, per SPEC_notifications.md): reminders + nudges. Log water,
  gratitude prompt, "you haven't logged today," etc.
- HUB ONLY (this spec): the adaptive-TDEE suggestion, achievements, record days / PRs, daily goal
  hits, "your weekly/monthly summary is ready." (Achievements + goals also keep their existing LIVE
  in-app toast at the moment they happen; the hub is the reviewable record of them.)
- BOTH: NOTHING right now. Explicitly: achievements are NOT push notifications (they already toast
  live; a push per achievement would be spam).
- FUTURE-PROOFING ONLY: if any single event ever needs both surfaces (e.g. a future "summary ready"
  push), it must fire from ONE trigger that fans out to hub + push, never two independent detectors.
  Do NOT build any overlap in v1; just keep event triggers single-sourced so it's cheap later.

---

## EVENT TYPE SYSTEM: Replace vs Stack -- DECIDED (concept), classification is CRITICAL
Every hub notification is exactly one of two types. Getting the bucket wrong is the main risk:
miscategorizing a STATE as Stack -> stale junk piles up; miscategorizing an EVENT as Replace ->
real wins get silently buried. Classify every type deliberately, never by assumption.

- TYPE A (REPLACE): represents a single CURRENT STATE, not a discrete event. A new one overwrites the
  old; it never stacks. Keyed by type, so only one exists at a time.
- TYPE B (STACK): represents discrete EVENTS, each individually worth seeing. They stack (like iOS
  notifications) until opened or cleared one by one. Keyed by unique id + timestamp.

### v1 classification table (extend this deliberately whenever a new type is added)
| Event | Type | Surface | Notes |
|-------|------|---------|-------|
| Adaptive TDEE suggestion | A (Replace) | Hub only | New weekly recalc replaces the old number. Mindful: suppressed (see below). |
| Achievement earned | B (Stack) | Hub only | Also fires the existing live AchievementToast. |
| Daily goal hit (steps/active/exercise/water/etc.) | B (Stack) | Hub only | Also fires the existing live goal toast. |
| Record day / PR | B (Stack) | Hub only | |
| Weekly / Monthly summary ready | B (Stack) | Hub only | Future candidate for ALSO pushing (single trigger if so). |
| Reminders (water, gratitude, log nudge) | n/a | PUSH only | Never enters the hub. |

---

## DATA MODEL -- DECIDED (schema details OPEN)
- New AsyncStorage key (e.g. `pj_notifications`) holding the live list. Local/device-scoped
  (notifications are ephemeral; probably NOT synced across devices via Firebase -- CONFIRM).
- Type A entries: stored keyed by their type string, so writing a new one REPLACES the prior of that
  type. Type B entries: appended with a unique id, timestamp, and read/unread state.
- SINGLE WRITER per event type (the one place that detects "achievement earned" also writes the hub
  entry). No duplicate detection logic.
- Read-then-merge on every write (DATA INTEGRITY rule -- never wholesale-overwrite the list).
- "Clear" removes an entry for good (no archive -- see below).
- LAUNCH-SPLASH GATE: anything that posts a badge/entry at launch must respect
  utils/launchSplashGate.ts so it doesn't fight the splash / summary / confetti on cold start.

## ARCHIVE / HISTORY PAGE -- DECIDED: NO (leaning-strong, revisitable)
Match iOS Notification Center: a live feed only, no persistent archive. Type A replaces, Type B
stacks, clear removes for good. iOS itself has no archive, so we mirror that simpler pattern. Keep
this open for a final call but the lean is a firm no.

---

## NOTIFICATION TAP BEHAVIOR -- OPEN (needs its own mapping)
Each type maps to an action when tapped. Rough intent:
- TDEE suggestion -> inline accept/dismiss (accept writes the new calorie target; the ONLY thing it
  ever writes, same as a user editing the target by hand).
- Achievement -> route to the Achievements screen.
- Summary ready -> open that summary.
This ties into Otto's existing route-token system (COMPANION_ROUTES / ROUTE_TRIGGERS in
utils/companionRoutes.ts) and the pre-launch deep-link / whitelist work. OPEN: the exact per-type
tap map. Design it alongside the deep-link routing, not in isolation.

## MODE-AWARENESS (Mindful) -- OPEN, must be defined before ship
Every feature must define its Mindful behavior. For the hub:
- TDEE suggestion: Mindful gets NO visible suggestion (already locked in the adaptive-TDEE spec:
  Mindful hides net calories / weight framing). So in Mindful the Type A TDEE entry is suppressed (or
  the engine may still quietly keep an opted-in auto-adjust user's target honest with no hub entry).
- Achievements / goals / summaries in Mindful: Mindful softens copy but these still exist as neutral
  info, not grades. Define per-type copy. FLAG: do a Mindful pass on every hub entry's wording.

## FAITH TIER note
Otto's FAB is hidden on the Faith tab (Halo's territory). So the badge isn't visible there; that's
fine (FAB present on all non-faith screens). No faith-gated notifications belong in Otto's hub (faith
lives with Halo).

---

## FOLDED-IN FIX: achievement "pop on the action" timing
Currently achievements earned by an action don't pop until the next app-open (the per-category check
is gated once/day and runs on open, often before the action -- this is why Sixty Strong popped the
morning after and dated a day late). Because achievements become hub events here, fix it as part of
wiring the achievement -> hub trigger: run the relevant check right after the qualifying action (food
log -> momentum + nutrition checks, mirroring how sleep already fires after a sleep save), and let a
same-day qualifying action bypass the once/day gate. Small perf angle (full-history rescan) -- scope
deliberately. Verified: streak = consecutive FOOD-logged days through yesterday; an unlogged today
doesn't break it (smartTipsEngine.computeLoggingStreak).

---

## RELATION TO THE PUSH SPEC (SPEC_notifications.md)
- The push spec stays the system for REMINDERS/NUDGES. This hub is a SEPARATE in-app surface for
  WINS/RESULTS + the TDEE suggestion.
- No events currently live in both. If one ever should, it fires from ONE single-sourced trigger that
  fans out. The two models stay coherent; neither duplicates the other's triggers.

---

## SEQUENCED FUTURE CAPABILITIES (NOT v1 -- scope after the hub is functional)
1. OTTO NOTIFICATION SECRETARY: natural-language access to the hub -- "Otto, what notifications do I
   have?" / "Otto, clear my notifications." Uses the SAME whitelisted-action + explicit-confirmation
   framework as the settings-change capability below (not a separate mechanism).
2. OTTO SETTINGS-CHANGE: a whitelist of specific, individually-validated actions Otto can trigger
   (NOT open-ended AI write access), always requiring explicit user confirmation before writing.
   First candidates: water goal, step goal, theme/accent. Sequenced RIGHT AFTER the hub, because the
   secretary (item 1) establishes the shared confirm-framework that this extends. Order: hub ->
   secretary -> settings-change.

---

## DECIDED vs OPEN summary
DECIDED: Otto FAB anchor; badge dot + chat-header bell; no banners / no sheets / no chat-bubble;
push=reminders / hub=wins+TDEE / no forced overlap; Type A vs B concept + the v1 classification table;
data model shape (per-type Replace key, appended Stack entries, single writer, read-then-merge,
splash-gate); NO archive (leaning-firm); secretary + settings-change are post-v1 and share the
confirm-framework.

OPEN (needs a call before/at build): final display component (TooltipModal recommended); the
three-icon header layout; per-type tap->route/action map (design with the deep-link work); Mindful
behavior per event type; badge visual spec + does "clear all" drop the dot; whether the notification
list syncs across devices or stays local; whether "summary ready" ever also pushes (future).

---

## v1 BUILD ORDER (suggested)
1. Data model + storage helpers (`pj_notifications`: Type A replace-by-type, Type B append; read-then-
   merge; clear).
2. Badge dot on the FAB (reads "any pending").
3. Bell in the chat header + the list display (TooltipModal).
4. Wire the FIRST real producers: TDEE suggestion (Type A) once adaptive TDEE exists, and achievements
   (Type B) -- folding in the pop-on-action timing fix.
5. Tap->action for those first types.
6. Mindful pass on copy.
Everything else (records, summaries-ready, secretary, settings-change) layers on after the core works.
