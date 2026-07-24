# SPEC — Rate Us & Feedback Prompts

Status: DESIGN LOCKED 2026-07-23, BUILD IN PROGRESS. This doc is the source of truth. Grew out of the
"starter challenge -> theme unlock" NEXT UP item; that idea was dropped (see project_j_backlog.md,
MOTIVATION / GAMIFICATION), but the "introduce the App Store rating ask + a real feedback channel"
piece survived and became this spec.

BUILD PROGRESS (2026-07-24): Batch 1 (foundation) built and device-confirmed working (native prompt fired
correctly on first test, copy matched spec). Batch 2 built: `fireRatingTrigger()` helper (3s delay so it
never fights an achievement toast/celebration for the screen; skips when a tutorial is active) wired into
water goal (index.tsx), gratitude (journal.tsx), reading plan (bible.tsx's markPlanRead), and devotional
completion (devotional.tsx's handleComplete -- initially missed in batch 2 since it's a separate handler
from reading-plan, fixed same session). Batch 3 built: protein goal (DailyGoalId extended to include
'protein' -- no live hook existed at all before this, now matches the same handleDailyGoalHit pattern as
steps/activeCals/exerciseMins with its own celebration+toast), weight milestone (index.tsx's weight-save
handler, only the newly-unlocked highest-crossed milestone), manual workout completion (workout.tsx's
Finish Workout handler, already gated on real logged work), challenge win (the Home challenge card's
dismiss tap specifically -- NOT the passive background scan that auto-acknowledges on app open, since
that isn't a deliberate action; only fires when won is true). Batches 4-5 (Otto fallback + Feedback
cards, theme audit) NOT STARTED.

⚠️ OPEN BUG, STILL UNRESOLVED as of 2026-07-24 -- READ THIS FIRST NEXT SESSION:
Nothing fires on-device -- not any real trigger and not even the force-fire dev button which bypasses
every guard we control. Diagnostics (`hadAction`/`error` returned from `requestRatingPrompt()`, shown in
the force button's toast) confirm the JS/native call chain is correct: `hasAction: true`, no thrown error,
every time. Ruled out: iOS Settings > App Store > "In-App Ratings & Reviews" toggle (already on). REAL
LEAD FOUND 2026-07-24: a confirmed, Apple-acknowledged bug (Apple Developer Forums thread 821981) where
`requestReview()` runs clean but shows nothing, specifically on iOS 26.5 BETA builds, specifically in
debug/development builds -- already fixed in the iOS 26.5 RC. If Justin's phone is on a beta iOS build,
this is almost certainly the actual explanation, not our code and not permanently broken. STILL NEEDS
CONFIRMING: whether his phone is actually on a beta iOS version (Settings > General > Software Update) --
ask this first before anything else next session. If not on beta, this is still genuinely unresolved and
needs fresh investigation, not a repeat of the same "Apple's opaque pacing" answer -- that framing was
called out as unsatisfying and needs a firmer answer than "not our problem" if it recurs. Batches 3+ can
and do proceed independently of this open item -- the wiring pattern is proven correct, this is
specifically about the native popup's on-demand visual reliability during testing.

Pairs with: the existing `FeedbackModal.tsx` (rebuilt 2026-07-23 to send in-app with an optional photo
instead of mailto — already shipped, not part of this build) and Otto's in-app notification hub
(`utils/notifications.ts` + `components/NotificationPanel.tsx`, already shipped infrastructure this
spec reuses, does not modify).

---

## Philosophy / what it is (LOCKED)

Two independent asks, never confused for one another:

1. **Rate Us** — Apple's native App Store rating prompt (`SKStoreReviewController` / `expo-store-review`),
   fired at genuine positive moments so it never reads as random or naggy.
2. **Feedback** — a periodic invitation to tell us directly (bugs, ideas, what's working), routed to the
   existing in-app Feedback flow. Exists so a bad moment has somewhere to go besides a public 1-star
   review, and so good ideas have somewhere to go besides nowhere.

They are built, timed, and worded completely separately. Sharing a budget or a card was tried in
discussion and rejected: it would silence Feedback the moment Rate Us used up its budget or the user
already reviewed, which defeats Feedback's purpose. See "Compliance" below for why they can't be
merged into a single yes/no gate either.

## Compliance (LOCKED — this shaped every decision below)

Apple prohibits **review gating**: routing only positive-sentiment users to the real review prompt while
diverting negative-sentiment users elsewhere. The fix that keeps this legal: there is no pre-screen at
all. Every Rate Us trigger calls `requestReview()` directly — no "are you enjoying the app, yes/no" gate
in front of it. Verified: Apple's own guidance does NOT require tying the ask to an achievement
specifically — that's best-practice advice, not an enforced rule — so the trigger list and the Otto
fallback are both legitimate as designed.

Also verified and worth remembering: the app **never** learns what rating (or whether) a user gave —
no callback exists, by Apple's deliberate design. Apple's own client-side state suppresses the native
prompt automatically once someone has rated, without telling us. So our own "already asked" tracking is
the only lever we have or need — it is not a substitute for knowing the outcome, and it can't be.

---

## Rate Us

### Triggers (LOCKED)
Fires directly (no pre-screen) the instant one of these completes:
- Water goal hit (confirmed live: `index.tsx`'s water `useEffect`, fires the moment the goal is crossed)
- Gratitude logged (confirmed live: `checkFaithAchievements` runs right after the faith save)
- Reading plan / devotional day completed
- Manual workout completion (HealthKit/Watch-synced workouts do NOT count — not a deliberate in-app action)
- Protein goal hit (**NEW code needed** — unlike water/steps/activeCals/exerciseMins, protein has no
  existing live goal-hit hook; must be built fresh, checked right after a food save)
- A real weight milestone crossed (not "every N logs" — an actual milestone, via the existing
  `getWeightMilestonesCrossed`)
- Challenge win (on the user's own acknowledgment tap, not silently on the backend)

Explicitly dropped, with reasons:
- **PR (personal record) on a lift** — would interrupt mid-workout. Wrong moment.
- **"Great day" / perfect Day Score** — collides with `SummaryReadyModal`, which already claims that
  exact moment on Home. Two modals back to back was rejected.
- **Saving a journal/workout note/daily note** — a save action, but not reliably a *positive* one (a
  journal entry can be about a hard day). Left off the list.

### Guardrails (LOCKED)
- **7-day minimum account age** before ANY ask (trigger or Otto fallback) can fire. Prevents asking a
  brand-new user on day one, which Apple's own guidance specifically warns against.
- **Tutorial/demo-state guard.** The tutorial system deliberately injects fake demo state to simulate
  real actions during a walkthrough. None of that may satisfy a trigger — only real user actions count.
- **Collision delay.** A trigger action can ALSO pop an achievement toast or celebration overlay in the
  same moment (e.g. water goal can unlock a badge at the same time). `requestReview()` fires **3 seconds**
  after the trigger, not synchronously, so it never fights the in-app celebration animation for the
  screen.
- **Same-day duplicate firing is already handled for free** — every ask updates one shared "last asked"
  timestamp, so two triggers firing the same day can't both pass the 30-day check. No separate structure
  needed for this.
- **Dev-tools override** to fire a test ask on demand, matching the existing dev-tools pattern in
  Settings, so testing doesn't mean waiting on a real trigger.

### Budget (LOCKED)
- **30 days minimum** between any two asks — this is OUR rule, not Apple's (Apple's real floor is
  1-2 weeks; we chose to be more conservative since we only get 3 real shots).
- **3 total, for the life of the install.** After the 3rd, never ask again (barring a real reinstall,
  see Storage below).
- Shared across every source — a trigger-fired ask and an Otto-fallback ask draw from the same budget,
  because Apple counts every `requestReview()` call toward the same 3-per-365-days ceiling regardless of
  why we called it.

### Otto fallback (LOCKED)
If 30 days pass with no trigger having fired for a given user, Otto's notification hub surfaces it as an
alternate entry point — same action (`requestReview()`), same shared budget, just a different way for a
user who never happens to hit the trigger list (e.g. a feature-picky or Mindful user) to still get asked.
Not a separate quota. Tapping the Otto card goes straight to the native prompt — no intermediate screen,
the card's own title/subtext already is the context.

### Copy (LOCKED)
- **Otto card title:** "Enjoying GoodForge?" — deliberately matches Apple's own native prompt wording
  (confirmed via real device testing on another app: Apple's "Enjoying [App Name]?" title is
  system-generated and not developer-customizable, so this is an intentional echo, not a coincidence).
- **Otto card subtext:** "If GoodForge has been helping you show up, a quick rating helps more people
  find us and keeps us building."
- Everything after the tap (star prompt, "thanks for your feedback," the optional full review form) is
  100% Apple's system UI — confirmed via real device screenshots. Zero design control over any of it.

---

## Feedback

### Mechanics (LOCKED)
- Its own separate Otto notification card. Completely decoupled from Rate Us — no shared budget, no cap.
- Re-appears roughly every **3 weeks** (a periodic nudge, not a permanent fixture — a permanent
  always-there card was explicitly rejected as passive, not an actual reminder).
- Spacing rule: if a Rate Us ask fired recently, hold the Feedback nudge back a few days so the two don't
  land in the same session and blur together.
- Optional, low-cost addition: a soft "remind me later" option on both Otto cards instead of a hard
  dismiss, so declining isn't permanent.

### Copy (LOCKED)
- **Title:** "Got Feedback for Us?"
- **Subtext:** "Bugs, ideas, something that could be better, what's working, we read every one and it
  shapes what we build next."
- Routes to the existing `FeedbackModal` (already shipped: in-app send, no mail app hand-off, optional
  photo attach).

---

## Storage & sync (LOCKED)

- New tracking state for the shared Rate Us budget: last-asked date + total-ask count. Read-then-merge
  onto whatever settings key it lands in (never a wholesale overwrite, per standing data-integrity rule).
- **Must sync to the cloud**, same as everything else real in this app — a local-only counter would let a
  reinstall silently reset the "3 total, ever" budget, which defeats the whole point of capping it.
- Feedback's own last-shown date is separate, tracked independently (its cadence has nothing to do with
  Rate Us's budget).

## Mode awareness (LOCKED)

Mindful gets identical copy on both cards — explicitly decided NOT to write a softer variant. This isn't
score/judgment language, so the standard mode-variance rule doesn't apply here.

---

## Open items for build (none are design-blocking, just need doing as each trigger is built)

- Protein goal has no existing live goal-hit hook — build it fresh (see Triggers above).
- Spot-check workout completion and weight milestone the same way water/gratitude were verified, to
  confirm they fire live and not on a delayed/batched check, before wiring them in.

## Build order (draft)

1. Shared ask-budget state (last-asked date, total count) + cloud sync/restore wiring, reinstall-verified.
2. 7-day account-age gate + tutorial/demo-state guard (shared by every trigger).
3. Wire the confirmed-live triggers first: water goal, gratitude, reading plan/devotional.
4. Build protein goal's live hook fresh; wire weight milestone and manual workout completion (after
   spot-checking their firing timing); wire challenge win off the acknowledgment tap.
5. Collision delay (3s) + same-day de-dupe (already free via the shared timestamp).
6. Otto fallback card (Rate Us) + Otto Feedback card, both wired into the existing notification hub.
7. Dev-tools test override.
8. 5-theme + Mindful audit (copy is identical across modes, but visuals still need the pass).
