# HANDOFF SPEC: Smart Tips

Status: IN PROGRESS (scoping session, Session 66). No code written yet.
This doc is built live during the scoping session and will be the complete handoff for a build session.
Created: 2026-05-31

---

## 0. READ FIRST (session rules, non-negotiable)

- Read `CLAUDE.md` and `project_j_roadmap.md` before touching anything.
- Confirm with Justin before every file change. Restate the task, wait for explicit go-ahead.
- ONE change at a time, confirmed working before the next. Recommend a git commit after each gate-passing step.
- Update `project_j_roadmap.md` in real time the moment anything ships or a decision is made.
- No double-dash (`--`) anywhere: not in code comments, not in user-facing strings, not in conversation.
- PowerShell only, git commands one at a time.
- Mode-awareness: every feature must define Discipline / Balanced / Mindful behavior. Fully specified below.
- Faith Journey awareness: specified below per feature surface.

ALL DECISIONS BELOW ARE LOCKED unless explicitly marked ON THE FENCE or OPEN.
Do not re-litigate locked decisions. Justin signed off in the Session 66 scoping thread.

---

## 1. WHAT SMART TIPS IS

Smart Tips is the forward-looking coaching layer of Project J. It reads patterns across the user's logged data and surfaces actionable observations. It is the third layer of a three-part system:

- **Day Score:** daily snapshot. "How was yesterday." A single 0-100 composite. Already shipped.
- **Effort vs Results (EvR):** backward looking. "Here is what your data shows over a 90-day window." Already shipped.
- **Smart Tips:** forward looking. "Here is what to do about the patterns in your data." Coach voice, pattern recognition, cross-referenced signals. Diagnosis plus next action.

These three must never duplicate each other. Each has a correct home for its copy. See Section 7 (Placement Principle).

Smart Tips language is always observational, never preachy or prescriptive.
Good: "We noticed your sleep score drops on nights after low-protein days."
Bad: "You need to eat more protein." / "You should go to bed earlier."

---

## 2. TWO TIP TIERS (LOCKED)

### 2.1 Generic Tips

- Real, useful, surface-level observations.
- Based on single-signal patterns. No cross-referencing required.
- Example: "You've been under your protein goal 4 days this week."
- Always visible to all users, no paywall.
- No quantity limit on free tier.

### 2.2 Smart Tips

- Correlated, specific, multi-signal insights.
- Require cross-referencing two or more data streams.
- Example: "Your sleep score drops an average of 12 points on nights after low-protein days."
- The real differentiator. The "how did it know that" moments.
- Gated by tier (see Section 3).

Generic Tips and Smart Tips are distinct layers. Generic Tips never pretend to be Smart Tips. Smart Tips never get dumbed down for the free tier.

---

## 3. MONETIZATION MODEL (LOCKED)

### 3.1 Free tier

- All Generic Tips: visible, full quality, no limit.
- Smart Tips: exactly 1 per session/surface, full quality, not dumbed down.
- Remaining Smart Tips: visible as blurred cards with a lock icon. User can see that more exist but cannot read them.
- The 1 free Smart Tip is a real, complete, correlated insight -- not a teaser version.

### 3.2 Pro tier

- All Generic Tips: visible.
- All Smart Tips: full access, full quality, unblurred.

### 3.3 Free vs Pro -- the distinction

Free users are not left with nothing. They get the full generic layer plus one real Smart Tip. The blurred cards show them what they are missing without withholding everything. The goal is honest value, not manipulation.

### 3.4 Pricing and subscription (partially locked)

LOCKED:
- Annual plan: yes.
- Lifetime purchase: no.
- RevenueCat for subscription management: yes (iOS + future Android).
- Faith features: 100% free, always, no exceptions. Non-negotiable. Never revisit.
- Themes: NOT paywalled. Earned via achievements only (unlock mapping TBD).
- Free trial: yes. Duration TBD (7-14 days range confirmed, exact length not decided).

OPEN (decide before building monetization layer):
- Exact monthly price point (range discussed: $4.99-$6.99/month).
- Exact free trial duration.
- Annual plan price and framing (e.g. "2 months free").
- Achievement-to-theme unlock mapping (mechanic confirmed, specific assignments TBD).
- Abuse protection cap on EvR and custom reports (free tier: 3/month discussed, open to refinement).

### 3.5 Gating UX detail (LOCKED)

Blurred card design:
- Title visible, body blurred. User can see the topic but not the detail. Creates curiosity without giving it away.
- Lock icon + Pro badge on each blurred card. Moderate treatment -- not naggy, not hiding the ball.
- Card is tappable, routes to subscription page.
- All qualifying locked tips show as blurred cards. Do not cap the number of blurred cards. If the engine qualifies 4 locked tips, show all 4 blurred. Seeing multiple blurred cards signals real data patterns being missed, which is more compelling than artificially limiting to 1-2.
- The word "locked" never appears in user-facing copy. The Pro badge does the job without feeling punitive.

TestFlight rule: gate is OFF for all TestFlight builds. All users see full Pro experience. Gate flips ON as a single config change pre-launch.

### 3.5 Gating implementation rule

The gating layer must be a toggle, not baked into every component. Flipping from "all free during TestFlight" to "gated for App Store launch" must require changing a single flag or config value, not touching tip rendering logic. Build this from day one.

During TestFlight: all tips visible to all users. Gate off.
Pre-launch: gate on.

---

## 4. GENERATION ENGINE (LOCKED)

**Decision: Hardcoded rules engine.**

Every tip is driven by explicit trigger logic written in code. The rules detect the pattern, pre-written copy surfaces the tip. No external API calls, no AI generation at runtime.

**Why this approach:**
- Zero per-call cost. No API cost per user.
- Instant display. Tips are computed and cached, not generated on demand.
- Deterministic. The same data always produces the same tip. No drift, no hallucination.
- No App Store friction. No AI-generated health advice review risk.
- Full control over language and tone.

**What "smart" means here:**
The intelligence lives in the trigger logic, not the sentence. Cross-correlating sleep score against protein intake over a 7-day window IS the smart work. The rules engine does that math. The copy just delivers the finding in the right voice.

**Copy standard:**
Tip copy must be polished, varied, and human. Not lazy template strings. Every rule gets a pool of copy variants -- minimum 3 per tip, more for high-frequency tips. When a tip fires, a variant is selected (rotating or randomized, never the same one twice in a row). Data slots into the variant naturally. The result must feel like the app noticed something and wrote it fresh, not like a template with a number plugged in. Copy must match the coaching mode voice (see Section 8).

**Caching rule:**
Tips are computed once when new data warrants a recalculation, stored to AsyncStorage, and displayed instantly. Never recomputed on every render. Storage key: TBD in Section 11.

**Rate limiting:**
Free tier tip generation is subject to a soft rate limit (exact cap TBD). Invisible to real users -- only catches abuse. Transparency: if a user hits the cap, a clear honest message explains it rather than silently failing.

---

## 5. TIP TRIGGERS AND SIGNALS

### 5.1 Urgency tiers (LOCKED)

Every tip belongs to one of three tiers. Tier affects copy tone, priority ranking, and placement.

| Tier | Description | Example |
|------|-------------|---------|
| Urgent | Actively working against the user's goal right now. Needs attention. | Protein at 20% of goal for 4 of last 7 days |
| Pattern | Consistently off over multiple days. Worth addressing, not alarming. | Protein at 68% of goal for 4 of last 7 days |
| Insight | Editorial. Something the user wouldn't notice themselves. Can be positive or corrective. | Sleep score averages 12pts higher on high-protein days |

**Tier assignment is per-rule, not computed dynamically.** Each rule in the trigger library is pre-assigned a tier at write time based on severity. A rule can have different tiers for different threshold bands (e.g. protein at <50% = Urgent, protein at 50-75% = Pattern).

### 5.2 Direction sensitivity (LOCKED)

Tips fire in both directions -- corrective AND positive. The system notices when something is going well, not just when something is wrong. Positive reinforcement tips are first-class citizens with their own copy variant pools.

Direction sensitivity is per-metric, not global:

| Metric | Under = tip? | Over = tip? |
|--------|-------------|-------------|
| Protein | Yes (Pattern or Urgent) | Yes (Insight, positive) |
| Calories | Yes (Pattern or Urgent) | Yes (Pattern or Urgent) |
| Sodium | Rarely | Yes (Pattern or Urgent) |
| Sugar | Rarely | Yes (Pattern or Urgent) |
| Fiber | Yes (Pattern) | No |
| Water | Yes (Pattern or Urgent) | No |
| Sleep score | Yes (Pattern or Urgent) | Yes (Insight, positive) |
| Active calories | Yes (Pattern) | Yes (Insight, positive) |

This table is a starting framework. Exact direction rules per metric finalized in the trigger library (Section 5.3).

### 5.3 Trigger threshold framework (LOCKED)

Two values define every trigger:

1. **Magnitude gate:** how far off the metric must be to qualify. Expressed as % of goal or absolute value depending on metric.
2. **Consistency window:** how many days out of a rolling window must meet the magnitude gate before the tip fires.

Both must be met for a tip to fire. A single bad day never triggers a tip.

**Protein threshold (LOCKED, starting values -- tune after real-data testing):**
- Pattern tier: below 70% of protein goal on 4 or more of the last 7 days
- Urgent tier: below 50% of protein goal on 4 or more of the last 7 days
- Positive Insight: above 110% of protein goal on 5 or more of the last 7 days

All other metric thresholds: TO BE DECIDED (remaining trigger library built in dedicated session before build starts).

### 5.4 Signals available to the trigger engine (LOCKED)

The following data streams are confirmed available per day via AsyncStorage:

**Nutrition:**
- Calories consumed vs goal
- Protein / carbs / fat vs goal
- Extended nutrition: fiber, sodium, sugar, saturated fat (from FatSecret foodNutrients)
- Logging consistency (were entries logged at all that day)

**Activity:**
- Active calories vs goal (burn-accuracy adjusted)
- Workout completion (exercises checked vs scheduled)
- Step count vs goal
- Exercise minutes
- Consecutive low-activity days (4+ in a row -- confirmed Smart Tips signal, does NOT affect Day Score)

**Sleep:**
- Sleep score (0-100)
- Sleep duration vs goal
- Sleep stages (deep %, REM %)
- Bedtime consistency
- Feel rating

**Weight:**
- Daily weight entries
- Weight trend over rolling window (plateau detection candidate)

**Cross-signal (Smart Tips only, not Generic):**
- Sleep score vs prior-day protein
- Sleep score vs prior-day calories
- Weight trend vs calorie average
- Any two-stream correlation requiring multi-day data

**Logging consistency itself** is a signal. Low logging consistency reduces tip confidence and affects firing rules (see Section 6).

---

## 6. TIP PRIORITY AND DISPLAY RULES

### 6.0 Goal-awareness principle (LOCKED)

The tip engine is goal-aware. Before assigning a tier or selecting copy, the engine reads `pj_profile.weightGoal` and factors it into both the tier assignment and the copy direction.

The same data pattern means different things depending on the user's goal. Trigger thresholds stay the same across goal types -- what changes is how the tip is classified and how it is worded.

Example: 300 calories over goal for 4 consecutive days.
- `lose_*` user: Pattern tip, corrective language.
- `maintain` user: Pattern tip, neutral language.
- `gain_*` user: Positive Insight, celebratory language.

Every rule in the trigger library must define its tier and copy direction per goal type where relevant. Rules that are goal-neutral (e.g. sodium consistently over recommended) are marked as such and fire identically regardless of `weightGoal`.

Available goal types from `pj_profile.weightGoal`: `lose_2`, `lose_1_5`, `lose_1`, `lose_0_5`, `maintain`, `gain_0_5`, `gain_1`.

### 6.0 Cooldown rules (LOCKED -- tune after real-data testing)

Once a tip fires, the same tip cannot fire again until the cooldown period has passed.

| Tier | Cooldown |
|------|----------|
| Urgent | 3 days |
| Pattern | 5 days |
| Insight | 5 days |

Cooldown is per-tip, not global. A protein Pattern tip cooling down does not block a sodium Pattern tip from firing. Cooldown clock starts the day the tip was last shown to the user, not the day it was computed.

### 6.1 Minimum consistency window (LOCKED -- tune after real-data testing)

Two window tiers based on urgency:

| Tier | Minimum days | Logging completeness required |
|------|-------------|-------------------------------|
| Urgent | 3 days | 80% of window days must have logged data |
| Pattern | 5 days | 80% of window days must have logged data |
| Insight | 5 days | 80% of window days must have logged data |

80% rule in practice: 3-day window requires 3 logged days. 5-day window requires 4 logged days. A day counts as "logged" if it has at least one food entry OR a workout entry OR a manual sleep entry. HealthKit-only days with no manual interaction do not count as logged for this purpose.

Both conditions must be met before any tip fires -- minimum days AND logging completeness. A single bad day never triggers a tip.

**Mindful mode:** Same minimums apply. Urgent tips use the same 3-day trigger but copy must never use urgent or alarming language. Same pattern detected, softer delivery. See Section 8.

**Logging dependency note (LOCKED):**
Smart Tips quality is directly tied to logging consistency. This must be communicated to the user at two moments:
1. The official welcome message after onboarding completes, before the first tutorial. Simple and honest: "The more you log, the smarter this gets."
2. The Smart Tips empty state, when no tips have fired yet due to insufficient data.

These are not warnings or nags -- they are honest expectation-setting. The app makes a contract with the user upfront.

**Edge cases:** Starting values only. Flag for tuning after TestFlight real-data testing. Some patterns will surface too early, some too late. Adjust thresholds based on what fires in practice.

### 6.2 Logging consistency and tip confidence (LOCKED)

### 6.3 Tip priority ranking (LOCKED)

When multiple tips qualify simultaneously, the engine ranks them in this order:

1. Urgent always beats Pattern and Insight
2. Among the same tier, the tip most directly tied to the user's primary goal wins. A `lose_*` user sees a calorie tip before a sodium tip.
3. Pattern beats Insight when no Urgent exists
4. Cooldown as tiebreaker -- the tip that has gone longest without firing wins
5. If still tied, random selection from qualifying tips

### 6.4 Maximum tips in EvR (LOCKED -- tune after real-data testing)

Cap: 5 tips visible in EvR at any one time. Top 5 by priority ranking qualify. The rest wait for their cooldown to expire and cycle in.

Reasoning: 5 feels like a real coaching session, not a lecture. Forces the engine to surface what matters most. Keeps EvR from becoming a wall of text.

Starting value only. Revisit after TestFlight real-data testing -- some users may consistently hit the cap, others may rarely see more than 2. Adjust based on what feels right in practice.

### 6.5 Cross-surface tip behavior (LOCKED)

Same tip engine, same pool, each surface pulls independently based on its own context.

- EvR: all qualifying tips up to the cap of 5. The source of truth. Every tip that fires anywhere also lives here.
- Home card: highest priority tip from the same pool. Intentional preview of what lives in EvR.
- Day Summary full page: day-specific tip pulled from that single day's data. Same topic may appear in EvR but with different copy variant -- never identical copy on two surfaces simultaneously.
- Weekly Summary: top 1-2 tips from that specific week's window. Subset of EvR pool.
- Monthly Summary: same pattern as weekly.

Rule: never show the exact same tip with the exact same copy on two surfaces at the same time. Same insight is fine, different copy variant required per surface.

### 6.6 Tip history and archive (LOCKED)

A "Recent Insights" collapsible section lives at the bottom of EvR, below the active tips. Shows the last 7 days of fired tips with the date each surfaced. Collapsed by default, expandable.

Pro only. Free users see active tips only, no history.

Longer-term history is handled naturally by the weekly and monthly summary structure -- pulling up a past week or month shows what tips fired during that period. No separate archive screen needed. The 7-day Recent Insights section is the short-term quick reference only.

Two confidence tiers based on logging completeness within the window:

| Logging completeness | Tip tier allowed | Behavior |
|---------------------|-----------------|----------|
| 80%+ of window days logged | Urgent / Pattern / Insight | Full Smart Tips fire normally |
| Below 80% of window days logged | Generic only | Smart Tip is downgraded to Generic. Copy acknowledges the data gap honestly. |

**Downgraded tip copy standard:**
When a tip fires below the 80% threshold, the copy must acknowledge the incomplete data without being preachy or naggy. It states the observation and invites more logging as a natural next step.

Good: "On the days you've logged this week, protein looks low. A few more logged days would give us a sharper picture."
Bad: "You need to log more to see your Smart Tips." / "Log every day to unlock insights."

**Chronic under-loggers:**
Users who consistently log below 80% will only ever see Generic tips. This is acceptable -- the feature still delivers value, just not the full correlated layer. The welcome message and empty state copy (Section 6.1) set this expectation upfront so it never feels like a broken feature.

**Mindful mode:** Same confidence tiers apply. Downgraded copy must use warm, observational language. Never frame incomplete logging as a failure.

---

## 7. PLACEMENT PRINCIPLE (LOCKED)

Every piece of copy has one correct home. The same message never appears in multiple surfaces. When a new surface is added, the first question is always "does this duplicate something that already exists somewhere else?"

### 7.1 Day Summary dilemma (LOCKED)

The full Day Summary page previously showed two lines stacked under the hero score:
1. Context line: "Your best day this week." -- where this day ranks relative to the week.
2. Win line: "Strong day. You took care of your body and your spirit." -- celebration copy.

Decision: the win line is removed and replaced by the Smart Tip slot. The Smart Tip fills the same emotional role on good days (positive, celebratory) and is more honest and useful on bad days (corrective, actionable). The context line stays exactly where it is -- it gives the score number immediate meaning and is not a tip.

Full Day Summary page structure under the hero:
- Score ring + number
- Label (ELITE / EXCELLENT / etc.)
- Context line ("Your best day this week.") -- stays, untouched
- Smart Tip slot (replaces win line -- 1 tip, full quality, goal-aware copy)
- Category breakdown cards (Nutrition / Activity / Recovery)
- Exclude this day

The win line is fully retired. Its job is now done by the Smart Tip. Do not add it back.

### 7.2 Copy placement rules (LOCKED)

- Context (where does this day rank) lives directly under the score. Nowhere else.
- Coaching (what to do about it) lives in the Smart Tip slot. Nowhere else on this page.
- Data breakdown (actual numbers) lives in the category cards. Nowhere else.
- Never stack two pieces of copy that serve the same emotional purpose.

---

## 8. MODE BEHAVIOR (LOCKED)

### 8.1 Discipline and Balanced (LOCKED)

Identical Smart Tips behavior. Same triggers, same thresholds, same tip types. Copy tone is slightly more direct for Discipline, slightly warmer for Balanced -- but this is a copy variant distinction only, not a behavioral one. No tips are suppressed or added based on these two modes.

### 8.2 Mindful (LOCKED)

Mindful users are not a monolith. The app cannot assume why someone chose Mindful -- it may be sensitivity, body image concerns, eating disorder recovery, or simply preferring a gentler experience. Smart Tips must respect this.             

**Default Mindful behavior (Include growth areas OFF):**
- Positive tips only. Corrective tips are silently suppressed, never shown.
- The app notices and celebrates wins. Struggles are handled by the rest of the app's gentle nudges, not Smart Tips.
- Safe for all users regardless of why they chose Mindful.

**Include growth areas ON (opt-in):**
- Positive tips fire normally.
- Corrective tips fire with Mindful-specific copy. Never alarming, never numbers-focused, always framed as an observation not a judgment.
- Good: "Sleep's been a little inconsistent lately. Even small bedtime shifts can make a big difference."
- Never: "Your sleep score dropped 15 points this week."
- User explicitly opted in -- they are telling the app they want the fuller picture.

### 8.3 "Include growth areas" setting (LOCKED -- implementation details PARKED)

A secondary toggle within Mindful mode. OFF by default.

Name: "Include growth areas"
Subtitle: "We'll gently surface patterns worth paying attention to, alongside your wins."
Accompanied by a toolkit/tooltip explaining what changes when toggled on.

Placement: onboarding (when user selects Mindful mode) and Settings. Exact UI placement and onboarding flow to be specced in a dedicated session before build.

Storage: new field on pj_settings -- `mindfulGrowthAreas: boolean`, default false.

**App-wide Mindful audit note:** this toggle adds a new dimension to the existing Mindful audit task in the roadmap. When the dedicated Mindful audit session runs, it must account for both Mindful states (growth areas on vs off) across all features, not just Smart Tips.

### 8.4 Urgent tier language in Mindful (LOCKED)

Urgent tips fire in Mindful only when "Include growth areas" is ON. Even then, Urgent copy must never use alarming language. Same trigger, same tier classification internally, but copy is rewritten to Mindful standard before surfacing. The word "urgent" never appears in user-facing copy for Mindful users.

---

## 9. FAITH JOURNEY BEHAVIOR

### 9.1 Tip copy (LOCKED)

Smart Tips are secular across all three Faith Journey tiers. No faith-framed copy variants in v1. Faith already has strong dedicated homes elsewhere in the app (verse card, journal, morning intention, Bible reader, prayer log). Smart Tips does not need to carry that weight.

### 9.2 Faith integration potential (PARKED -- revisit post-launch)

There is potential for faith-adjacent Smart Tips behavior that hasn't fully crystallized yet. Candidates discussed but not locked:
- Gratitude/journal streak acknowledgment via tip copy
- Faith Journey upgrade nudge triggered by Smart Tips engine
- Rest day framing for Rooted users

Do not build any of these in v1. Revisit after launch when real user behavior gives better signal on what would feel natural vs forced.

---

## 10. SURFACES (LOCKED)

### 10.1 Primary home: Effort vs Results (LOCKED)

Smart Tips lives inside the Effort vs Results report as an enhanced, smarter version of the existing "YOUR TOP SUGGESTIONS" section. EvR is the only place where the full Smart Tips experience lives. All other surfaces show a condensed version and route back to EvR for the full picture.

EvR structure with Smart Tips integrated:
- Existing data cards (logging consistency, burn accuracy, macro quality, sleep quality, patterns) unchanged
- "YOUR TOP SUGGESTIONS" section replaced by full Smart Tips section
- Free users: 1 Generic tip + 1 Smart Tip visible, remaining Smart Tips blurred with lock icon
- Pro users: all tips visible, full quality, unblurred

### 10.2 Home card (LOCKED)

One tip slot on the home screen, cycling.
- Free users: 1 tip, does not cycle
- Pro users: top 3 priority tips cycle on a timer
- Urgency tier always wins the top slot
- Tapping the card routes to EvR

### 10.3 Day Summary full page (LOCKED)

1 Smart Tip slot, positioned directly under the context line, above the category breakdown cards.
Replaces the win line entirely (see Section 7.1).
Tip is day-specific -- generated from that day's data, not the rolling window.
Not gated -- all users see this tip regardless of tier.

### 10.4 Weekly Summary (LOCKED -- build when weekly summary ships)

1-2 tips max. Most relevant to that week's patterns.
Two routing options both present:
- Tap the tip card itself: routes to EvR, scrolled to the Smart Tips section
- "See all insights" link below the tip stack: same destination

### 10.5 Monthly Summary (LOCKED -- build when monthly summary ships)

Same pattern as weekly. 1-2 tips max, routes to EvR via card tap or "See all insights" link.

### 10.6 Day Summary pop-up / compact modal (LOCKED)

No tips. Too compact, wrong moment. Score and category pills only.

### 10.7 Placement rule (LOCKED)

EvR is the source of truth for Smart Tips. No other surface duplicates the full tip experience. Every condensed surface points back to EvR. A tip that appears in the weekly summary and in EvR is not duplication -- it is a preview routing to the home.

---

## 11. STORAGE SHAPE (LOCKED)

Single AsyncStorage key: `pj_smart_tips`

Read-then-merge only. Never replace from scratch. Same data integrity rule as all pj_* keys.

```typescript
pj_smart_tips: {
  activeTips: Tip[],        // current qualifying tips, max 5
  recentHistory: Tip[],     // last 7 days of fired tips
  cooldowns: {              // ruleId -> ISO date last fired
    [ruleId: string]: string
  },
  lastComputed: string      // ISO date of last full computation
}

Tip: {
  id: string,               // unique tip instance ID
  ruleId: string,           // which rule fired this tip
  tier: 'urgent' | 'pattern' | 'insight',
  title: string,            // always visible, even on blurred cards
  body: string,             // blurred for free users beyond the 1 tip limit
  firedDate: string,        // ISO date
  goalType: string,         // pj_profile.weightGoal at time of firing
  positive: boolean,        // true = positive reinforcement, false = corrective
  surfacedOn: string[]      // tracks which surfaces have shown this tip
}
```

Derived cache only. If lost on reinstall, tips regenerate automatically from underlying pj_YYYY-MM-DD data on next computation cycle. Intentionally excluded from the cloud backup system.

---

## 12. DEPENDENCY MAP

Smart Tips cannot be built until:
1. Day Score is shipped and generating real data (DONE as of Session 65).
2. Effort vs Results is shipped (DONE).
3. Generation engine decision locked (Q1 of scoping session).
4. All trigger threshold values locked (scoping session).

Smart Tips reads from (confirmed available):
- `pj_YYYY-MM-DD`: entries, water, weight, steps, activeCalories, sleep fields, extended nutrition
- `pj_workout_state`: workout completion, day type, exercise logs
- `pj_profile`: goals (calorie, protein, water, step, sleep, activeCalGoal)
- `pj_settings`: styleMode (coaching mode), burnAccuracyPct
- Day Score sub-components per day (dayScore object on pj_YYYY-MM-DD)

---

## 13. REQUIRED PRE-BUILD SESSION (LOCKED)

Before any build session starts, a dedicated trigger library session is required. This session must produce a complete rulebook document covering:

- Every metric the tip engine can fire on (sodium, sugar, fiber, calories, sleep, activity, weight trend, logging consistency, etc.)
- Exact threshold values per metric and direction
- Tier assignment per rule (Urgent / Pattern / Insight)
- Goal-type behavior per rule (lose vs maintain vs gain)
- Mindful behavior per rule (suppressed or allowed, growth areas on vs off)
- Copy variant pool per rule -- minimum 3 variants written in full, mode-aware

Protein thresholds are the only rule currently locked (see Section 5.3). Everything else is undefined. The build session cannot start without this document.

## 13. OUT OF SCOPE -- DO NOT BUILD IN THIS SESSION

- Weekly Summaries (separate track).
- Monthly Summaries (separate track).
- Deep-deficit / very-low-net coaching nudge (parked, needs dietitian-level threshold research).
- Re-opening any locked Day Score decisions.
- Any monetization infrastructure (RevenueCat wiring, paywall UI). That is a dedicated build session.

---

## 14. OPEN ITEMS LOG

Items discussed but not yet locked. Resolved items move to their section above.

| # | Item | Status |
|---|------|--------|
| 1 | Generation engine: rules vs AI vs hybrid | LOCKED -- hardcoded rules engine, see Section 4 |
| 2 | Trigger threshold values (protein gap %, calorie gap %, etc.) | PARTIAL -- protein locked, all others need dedicated trigger library session before build |
| 3 | Minimum consistency window before tip fires | LOCKED -- Urgent 3 days, Pattern/Insight 5 days, 80% logging completeness required |
| 4 | Cooldown: days before same tip repeats | LOCKED -- Urgent 3 days, Pattern/Insight 5 days |
| 5 | Logging consistency effect on tip confidence | LOCKED -- soft gate, below 80% downgrades to Generic only |
| 6 | Goal mode interaction (cut vs bulk vs maintain) | LOCKED -- goal-aware, see Section 6.0 |
| 7 | Tip priority ranking (when multiple qualify) | LOCKED -- see Section 6.3 |
| 8 | Tip history / archive | LOCKED -- see Section 6.6 |
| 9 | Home card tip vs Daily Summary tip: same or different? | LOCKED -- different. Home card uses rolling window, Day Summary tip is day-specific |
| 10 | Faith/Bible tip framing per Faith Journey tier | PARKED -- revisit post-launch, see Section 9.2 |
| 11 | Auto-cycling tip set size and rotation rules | LOCKED -- Pro cycles top 3, free shows 1, see Section 10.2 |
| 12 | Placement principle (Day Summary dilemma) | LOCKED -- see Section 7 |
| 13 | Monetization gating UX detail (blurred card design, copy) | LOCKED -- see Section 3.5 |
| 14 | Exact price point and trial duration | OPEN -- decide before App Store launch, not a build blocker |
