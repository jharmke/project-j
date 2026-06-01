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
- Mindful exception (Session 69, LOCKED): default-Mindful users (growth areas OFF) see ZERO blurred cards. Suppression removes corrective tips before gating runs, so there is nothing corrective left to blur, and their surviving positive correlated tips follow B1 (one shown unblurred, the rest hidden entirely, never blurred). This is the one deliberate exception to the do-not-cap rule above. Growth-areas-ON Mindful users gate normally and do see blurred cards. Full logic in Section 15.7.

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

**Protein threshold (LOCKED, starting values -- tune after real-data testing; Session 69: aligned to the global 5/7 windows, protein previously used 4 of 7 for both tiers with no good reason):**
- Pattern tier: below 70% of protein goal on 5 or more of the last 7 days
- Urgent tier: below 50% of protein goal on 3 or more of the last 5 days
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

| Tier | Window | Magnitude (fire) count | Logging completeness required |
|------|--------|------------------------|-------------------------------|
| Urgent | last 5 days | metric off on 3 of 5 | at least 4 of 5 days logged (80%) |
| Pattern | last 7 days | metric off on 5 of 7 | at least 6 of 7 days logged (>=80%) |
| Insight | last 7 days | per rule (often 5 of 7) | at least 6 of 7 days logged (>=80%) |

Logging completeness in practice, stated as concrete counts rather than a recomputed percentage: the Urgent 5-day window requires at least 4 of 5 days logged, and the Pattern/Insight 7-day window requires at least 6 of 7 days logged (5 of 7 is only 71%, below the 80% bar, so it rounds up to 6). A day counts as "logged" if it has at least one food entry OR a workout entry OR a manual sleep entry. HealthKit-only days with no manual interaction do not count as logged for this purpose. This logging gate (was any data entered) is separate from the magnitude count above (how many days the metric was off); both must be met.

Both conditions must be met before any tip fires -- minimum days AND logging completeness. A single bad day never triggers a tip.

**Mindful mode:** Same minimums apply. Urgent tips use the same 5-day window (off on 3 of 5) but copy must never use urgent or alarming language. Same pattern detected, softer delivery. See Section 8.

**Logging dependency note (LOCKED):**
Smart Tips quality is directly tied to logging consistency. This must be communicated to the user at two moments:
1. The official welcome message after onboarding completes, before the first tutorial. Simple and honest: "The more you log, the smarter this gets."
2. The Smart Tips empty state, when no tips have fired yet due to insufficient data.

These are not warnings or nags -- they are honest expectation-setting. The app makes a contract with the user upfront.

**Edge cases:** Starting values only. Flag for tuning after TestFlight real-data testing. Some patterns will surface too early, some too late. Adjust thresholds based on what fires in practice.

### 6.2 Logging consistency and tip confidence (LOCKED)

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

SESSION 68 UPDATE: the replacement is the Day Takeaway engine (Section 15.1), not a rolling Smart Tip. The win line stays retired.

### 7.2 Copy placement rules (LOCKED)

- Context (where does this day rank) lives directly under the score. Nowhere else.
- Coaching (what to do about it) lives in the Smart Tip slot. Nowhere else on this page.
- Data breakdown (actual numbers) lives in the category cards. Nowhere else.
- Never stack two pieces of copy that serve the same emotional purpose.

---

## 8. MODE BEHAVIOR (LOCKED)

### 8.1 Discipline and Balanced (LOCKED)

Identical Smart Tips behavior. Same triggers, same thresholds, same tip types. In v1 they also SHARE one copy pool per rule (the "Discipline/Balanced" pools in TRIGGER_LIBRARY section 11); there is no separate Discipline-only vs Balanced-only copy. The tonal difference once imagined (slightly more direct for Discipline, slightly warmer for Balanced) was judged too subtle to justify maintaining two full copy sets, and can be revisited post-launch if it proves worth it. No tips are suppressed or added based on these two modes.

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

### 8.5 Suppression and gating order (Session 69, LOCKED)

The Mindful suppression filter and the tier gating filter are two separate filters that BOTH run at render time, in a fixed order: suppress first, then gate. Full resolution in Section 15.7. Key points repeated here so the Mindful section is self-contained: suppression is mode-driven and tier-independent (a Pro user in default Mindful still sees positives only; Pro does not unlock corrective tips), and suppression reads each rule's per-rule Mindful disposition, not a blanket corrective-equals-off (note the named exceptions: log_consistency_low is allowed with warm copy, weight_infrequent never fires in Mindful at all).

---

## 9. FAITH JOURNEY BEHAVIOR

### 9.1 Tip copy (LOCKED)

Smart Tips are secular across all three Faith Journey tiers. No faith-framed copy variants in v1. Faith already has strong dedicated homes elsewhere in the app (verse card, journal, morning intention, Bible reader, prayer log). Smart Tips does not need to carry that weight.

### 9.2 Faith integration potential (PARKED -- revisit post-launch)

There is potential for faith-adjacent Smart Tips behavior that hasn't fully crystallized yet. Candidates discussed but not locked:
- Gratitude/journal streak acknowledgment via tip copy
- Faith Journey upgrade nudge triggered by Smart Tips engine
- Rest day framing for Rooted users
- Rooted faith flavor on the Day Takeaway / day summary (the retired win line carried a "body and spirit" touch; the v1 Day Takeaway is secular per 9.1, so this is the candidate to bring a gentle faith touch back for Rooted users)

Do not build any of these in v1. Revisit after launch when real user behavior gives better signal on what would feel natural vs forced.

---

## 10. SURFACES (LOCKED)

### 10.1 Primary home: Effort vs Results (LOCKED)

Smart Tips lives inside the Effort vs Results report as an enhanced, smarter version of the existing "YOUR TOP SUGGESTIONS" section. EvR is the only place where the full Smart Tips experience lives. All other surfaces show a condensed version and route back to EvR for the full picture.

SESSION 68 UPDATE: refined. EvR is the source of truth for the LIVE ROLLING stream only. The Day, Weekly, and Monthly summaries carry their own self-contained period tips that do NOT live in EvR. See Section 15.

EvR structure with Smart Tips integrated:
- Existing data cards (logging consistency, burn accuracy, macro quality, sleep quality, patterns) unchanged
- "YOUR TOP SUGGESTIONS" section replaced by full Smart Tips section
- Free users: 1 Generic tip + 1 Smart Tip visible, remaining Smart Tips blurred with lock icon
- Pro users: all tips visible, full quality, unblurred

SESSION 69 UPDATE: the EvR "full Smart Tips section" is superseded by the finding-driven card architecture in Section 17. Coaching lives on spine cards, domain finding cards, and per-correlation insight cards; the orphan suggestions list is retired. Gating moves to the insight-card stack (free 1 unblurred + blurred rest, capped at 5); spine and domain cards are free.

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

SESSION 68 UPDATE: this slot is the Day Takeaway engine (Section 15.1), not a rolling Smart Tip. It is day-scoped via the standout picker plus a personal-history yardstick.

### 10.4 Weekly Summary (LOCKED -- build when weekly summary ships)

1-2 tips max. Most relevant to that week's patterns.
Two routing options both present:
- Tap the tip card itself: routes to EvR, scrolled to the Smart Tips section
- "See all insights" link below the tip stack: same destination

SESSION 69 UPDATE (resolves Section 16 item 2 for Weekly and Monthly): ungated, no blurred cards. 1-2 tips, same count for free and Pro. The paywall for periods is at the access level (free = last completed period, Pro = any period on demand + history), not at the tip level. Day Summary was already ungated via the Day Takeaway (15.1); this brings Weekly and Monthly in line. The Mindful overlay still applies (default Mindful shows positive period tips only); since these are ungated there is no blur to resolve. The full gated insight-card stack lives only in EvR (Section 17), which these surfaces route to.

### 10.5 Monthly Summary (LOCKED -- build when monthly summary ships)

Same pattern as weekly. 1-2 tips max, routes to EvR via card tap or "See all insights" link.

### 10.6 Day Summary pop-up / compact modal (LOCKED)

No tips. Too compact, wrong moment. Score and category pills only.

### 10.7 Placement rule (LOCKED)

EvR is the source of truth for Smart Tips. No other surface duplicates the full tip experience. Every condensed surface points back to EvR. A tip that appears in the weekly summary and in EvR is not duplication -- it is a preview routing to the home.

SESSION 68 UPDATE: superseded for period snapshots. EvR is the source of truth for the live rolling stream only. Day, Weekly, and Monthly tips are self-contained and do not appear in EvR. See Section 15.

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

---

## 15. SURFACE TIP ARCHITECTURE (Session 68 resolutions)

This section refines Sections 7.1, 10.1, 10.3, and 10.7. It is the result of the Session 68 scoping pass and supersedes the parts of those sections noted inline. Where this section and an earlier section disagree, this section wins.

### 15.0 Core reframe: two tip worlds, not one source of truth

The earlier "EvR is the single source of truth, every tip that fires anywhere also lives in EvR" model is replaced. There are two distinct tip worlds:

1. LIVE ROLLING STREAM (EvR + Home card): a window that slides up to today. EvR is comprehensive (shows every qualifying rolling tip up to the cap of 5, no diversity filtering). The Home card previews the single highest-priority rolling tip and routes to EvR. This world regenerates fresh on open and rotates copy variants for freshness.
2. FROZEN PERIOD SNAPSHOTS (Day / Weekly / Monthly summaries): each scoped to one completed period. Stored, deterministic, computed against a frozen goal snapshot. Each carries its own tips. These do NOT aggregate into EvR.

The whole point of the split: it kills cross-surface repetition. A day note talks about that day, a weekly about that week, EvR about the rolling trend. Different scopes, different homes.

### 15.1 Day Takeaway engine (the single-day "smart" surface)

A single day cannot satisfy the multi-day windows every rolling rule requires (3 of 5, 5 of 7, and so on), so the Day Summary does NOT use the rolling Smart Tip rules at all. It uses a dedicated Day Takeaway engine.

Naming: it is a Day Takeaway, NOT a "Smart Tip." It replaces BOTH the retired win line and the coach line (this supersedes the "Smart Tip slot" language in 7.1 and 10.3).

Two intelligence sources:
- Standout picker: rank the day's Day Score sub-components (nutrition, activity, sleep, and their sub-parts) and surface the single most notable one, positive or corrective. Examples: "Sleep carried this day." "Strong day, protein was the one gap."
- Personal-history yardstick: layer in record, streak, or first-in-N-days context by ranking today against the user's own recent baseline. Examples: "Your highest protein in two weeks." "First step-goal hit in 8 days." "Five days straight on your calorie goal."

Hard guardrail: today is the noun, history is only the adjective. The Day Takeaway's subject is always that single day. History may be used only as a yardstick to make today's number meaningful. It must never make a multi-day period the subject (no "you have been averaging higher than last week"). That is weekly territory.

Gating: ungated. Every user sees the Day Takeaway regardless of tier. It is the evolved win/coach line and is never paywalled.

Mindful: default shows the positive standout. A corrective standout fires only with growth areas ON (ties to an open item, Section 16).

Faith: secular in v1, consistent with 9.1. The retired win line's "body and spirit" touch is intentionally not carried forward. Bringing a gentle Rooted faith flavor back to the Day Takeaway is a parked candidate (9.2).

Build note: the Day Takeaway needs its own rule set written (the standout ranking logic plus the personal-history comparators). It is NOT in the current trigger library, which is entirely 7-day rolling. See Section 16.

### 15.2 Altitude model (same topic, different zoom is not duplication)

The same metric legitimately matters at multiple scopes. It is presented at escalating altitude:
- Day Takeaway: "Protein was the gap today." (one day, today is the subject)
- Weekly: "Protein was under goal 4 of 7 days last week." (a pattern within a week)
- Monthly: "Protein has been your most consistent miss, under goal in 3 of 4 weeks." (a trend across weeks)
- EvR: deepest. "Over 90 days, low protein tracks with your low-energy days. It is your number one lever, here is what to do." (diagnosis plus correlation plus action)

EvR stays comprehensive. Topics are never stripped from it. The hard rule from 6.5 still holds: the identical insight at the same altitude never appears twice; the same insight at a different altitude is allowed and expected.

### 15.3 Diversity rule (prevents topic fatigue across surfaces)

The lightweight surfaces (Day Takeaway, Weekly, Monthly, Home card) actively spread topics so the user does not get hammered with the same topic in one sitting.

- EvR is EXEMPT from diversity. It is the full report; the user went there to see everything.
- Urgency OVERRIDES diversity. Never hide an Urgent tip for the sake of variety. Diversity only breaks ties among equal-priority tips.
- One shared cross-surface ledger. A single "recently surfaced topics" memory is read by all lightweight surfaces, not a per-surface memory, so the weekly and monthly cannot both headline the same topic back to back.
- Topic-ownership priority when surfaces contend for the same topic: Monthly beats Weekly beats Day. A multi-day pattern is most truthfully a higher-altitude observation, and a lower surface can always fall back to a different standout, whereas a week or month cannot manufacture a different period.
- Thin-data caveat: a user whose only issue is one topic will still see that topic across surfaces. The positive layer and the Day Takeaway standout supply variety in that case. Accepted as rare; may be supplemented with positive encouragement messages.

Ledger storage location and memory duration are OPEN, see Section 16.

### 15.4 Pop-up firing rule

This is a SEPARATE mechanism from the topic-ownership priority in 15.3 (which decides who talks about a topic). This decides which morning pop-up actually fires. They share the same Monthly > Weekly > Day order by coincidence of altitude.

- Morning pop-ups never stack. One pop-up per app-open, maximum.
- The highest-altitude pop-up that is due wins: Monthly > Weekly > Day.
- The non-firing summaries are not lost. Each has its persistent full page in Stats > Reports.
- The Monthly page is a hub: it drills into its weeks, and weeks drill into their days. The firing pop-up may carry a one-line pointer to the others in Reports.
- Worst-case pileup is Monday (Day plus Weekly due together) and the 1st of the month (Day plus Weekly plus Monthly). The single-pop-up rule is specifically for those mornings.

### 15.5 Storage, recompute, and the immutable goal snapshot

- Store-and-lock: each period's selected tip(s) are stored on that period's record. The Day Takeaway stores on pj_YYYY-MM-DD alongside the dayScore object; Weekly and Monthly aggregate from the stored daily records. Stored fields include the tip/rule id, the chosen copy variant, and the data values at fire time.
- Deterministic variant selection for frozen snapshots: the variant is chosen by a deterministic seed (for example a hash of date plus ruleId), never random and never rotate-on-read. A frozen period therefore never rerolls its wording on reopen or on recompute. The "rotate, never the same twice in a row" rule applies ONLY to the live rolling stream in 15.0.
- Anti-abuse: because viewing never recomputes and frozen variants are deterministic, a free user cannot reroll the single free tip by reopening a summary. The only thing that changes a stored tip is a real underlying-data edit.
- Recompute-on-edit principle: a report reflects the data. It recomputes ONLY when the user edits that period's real logged data (backfilling a forgotten entry, excluding or un-excluding a day). It never recomputes on view.
- Immutable goal snapshot: when a day's report is first computed, the goals then in effect (calTarget, proteinGoalG, waterGoal, activeCalGoal, stepGoal, sleepGoal, weightGoal, and any others a rule reads) are stored alongside it and are immutable. Recompute-on-edit uses the frozen snapshot. Forward goal or setting changes NEVER retroactively rewrite history. Your June report does not change because you moved a target in August.
- Cascade: editing one day recomputes that day, then the week and the month that contain it (weekly and monthly aggregate from daily). The goal snapshot lives at the day level only; higher altitudes roll up from there.
- No manual regenerate for Day, Weekly, or Monthly. Completed-period reports self-maintain via recompute-on-edit. EvR is the only surface with live, fresh-on-open behavior, and a regenerate action makes sense there because EvR is explicitly "as of now."
- Tier gating happens at RENDER time, not store time, so a stored tip re-blurs correctly if a Pro user lapses to free.
- In-progress periods (today, the current mid-week, the current month) get NO stored tip. Summaries are completed-period only, consistent with Day Score.
- VERIFY IN CODE before build: whether the current Day Score (utils/dayScoreStore.ts) already stores goal context and whether it recomputes when a past day's data is edited. Justin's forgotten-water example (a backfilled 22 oz that did not move the already-generated score) suggests it does not. This may require adding goal-snapshot fields plus a recompute-on-edit trigger, and may be its own Day Score item independent of Smart Tips.

### 15.6 What this section supersedes

- 7.1 and 10.3: the Day Summary "Smart Tip slot" is the Day Takeaway engine (15.1), ungated. The win line stays retired.
- 10.1 and 10.7: EvR is the source of truth for the LIVE ROLLING stream only, not for period snapshots. Period snapshots are self-contained and do not live in EvR.

### 15.7 Mindful suppression vs gating order (Session 69 resolution)

This resolves Section 16 open item 1. It refines Sections 3.1, 3.5, and 8.2. Where it disagrees with an earlier section, this wins.

**The problem.** Two independent filters act on a tip before it reaches the user: the Mindful suppression filter (8.2: default Mindful hides corrective tips) and the tier gating filter (3.1: free users get one Smart Tip unblurred, the rest render as blurred cards with the title still visible). Blurred cards leak their title. If gating ran first, a default-Mindful free user could see a blurred card whose title names a corrective topic, which breaks the Mindful safety promise the doc ties to ED recovery and body image.

**Resolution, locked:**

1. Suppress before gate. The Mindful suppression filter runs first on the full candidate pool, removing every tip its mode forbids. Only the survivors are handed to the gating filter. A corrective tip therefore never reaches the gate for a default-Mindful user; there is nothing corrective left to blur.

2. Both filters run at RENDER time, in that order (suppress, then gate), against the user's CURRENT mode and tier. This matches 15.5, which already puts gating at render time so a lapsed Pro user re-blurs correctly. Suppression rides alongside it.

3. Suppression is mode-driven and tier-independent. A Pro user in default Mindful still sees positives only. Being Pro does not unlock corrective tips; tier controls blur, mode controls existence.

4. Suppression reads each rule's per-rule Mindful disposition, not a blanket corrective-equals-off. Most corrective rules are suppressed in default Mindful, but the trigger library names exceptions: log_consistency_low is allowed with warm copy, and weight_infrequent never fires in Mindful even with growth areas ON. The filter keys off the rule's Mindful flag, not its positive/corrective bit.

5. B1, the free count for default Mindful. Default-Mindful free users (growth areas OFF) see zero blurred cards. Of the surviving positive correlated Smart Tips, one shows unblurred and the rest are hidden entirely (not blurred, no lock, no paywall nudge). This keeps the same one-free economy as every other mode; we delete the teases instead of blurring them. Generic positive tips remain unlimited and unblurred for everyone as always (2.1), so this only ever touches the correlated layer. Count of one is a starting value, tunable after TestFlight; one was chosen over two to avoid feeling like coddling.

6. Growth-areas-ON Mindful users gate normally and do see blurred cards, including corrective ones rendered in Mindful-safe copy. They opted into the fuller picture.

**Frozen-snapshot interaction (the mode-switch case).** Frozen period snapshots (Day Takeaway, Weekly, Monthly) store their chosen tip and never recompute on view (15.5). A user can store a corrective tip while in Discipline, then switch to default Mindful and reopen that period. The stored tip is never destroyed or recomputed on a mode switch; the render-time suppression filter simply hides it. Switching back to Discipline restores it, deterministically and identically, because it was filtered, not deleted. A mode switch is a render-time filter change, not a data edit, so it does not violate 15.5's recompute-only-on-edit rule.

**Warm fallback (covers the empty case).** When suppression, or simply a rough data week, leaves a surface with no positive tip to show, the surface falls back to a warm encouragement / empty state rather than rendering blank. This is the catch-all across every surface (home card, EvR, and the frozen Day/Weekly/Monthly snapshots) whenever a default-Mindful user has nothing positive to surface. It is the one safe fallback that is never a blurred card.

**Spawned follow-ons (not blocking):**
- The exact warm fallback / empty-state copy for Mindful surfaces still needs writing.
- The Day Takeaway rule set (open item 6) and the Weekly/Monthly rule set (open item 7) must each be able to surface a positive fallback, since render-time suppression can hide their stored standout. The Day Takeaway standout-picker model (positive by default, corrective only with growth ON) is the template for all three.

---

## 16. SESSION 68 OPEN ITEMS (carry forward, not yet resolved)

These remain to be decided in upcoming sessions. None blocked the Session 68 architecture above.

1. RESOLVED (Session 69): suppress-before-gate is locked, both filters run at render time, default-Mindful free users (growth areas OFF) see zero blurred cards (B1: one positive shown, the rest hidden not blurred), and growth-areas-ON Mindful gates normally. Full resolution in Section 15.7. Spawned a small non-blocking follow-on: the warm fallback / empty-state copy for Mindful surfaces with no positive to show still needs writing, and the Day Takeaway and Weekly/Monthly rule sets (items 6 and 7) must each be able to surface a positive fallback.
2. RESOLVED (Session 69): EvR via Section 17 (finding-driven domain cards free, insight-card stack capped at 5 and gated 1 free + blurred rest, suggestions list retired). Day Takeaway ungated (15.1); Home card 1 free / 3 Pro cycling (10.2). Weekly and Monthly: ungated, 1-2 tips, same count for both tiers, paywall at the access level (free = last completed period, Pro = any period + history), route to EvR for the gated depth (see 10.4). All surfaces now walked.
3. RESOLVED (Session 69): cal_under renamed to net_above_pace (fires when net runs ABOVE paceTarget, ate more than plan) and cal_over to net_below_pace (net BELOW paceTarget, ate less than plan); threshold math is the source of truth. Goal behavior corrected: net_above_pace fires for LOSE/MAINTAIN (GAIN parked, excessive-surplus needs a dietitian-level threshold); net_below_pace fires for GAIN/MAINTAIN (LOSE parked, over-aggressive-deficit is the same parked research). Rule definitions fixed in TRIGGER_LIBRARY 3.1 and 3.2 plus the summary table. The copy variant pools (TRIGGER_LIBRARY section 11) were written around the old names and carry a re-sort / wording flag for build time.
4. RESOLVED (Session 69): canonical windows locked as Urgent = last 5 days (off on 3 of 5), Pattern/Insight = last 7 days (off on 5 of 7); Section 6.1 aligned to TRIGGER_LIBRARY 1.2. The 80% logging gate is now stated as concrete counts (Urgent 4 of 5, Pattern/Insight 6 of 7) and kept distinct from the magnitude count. Protein was the lone outlier (4 of 7 for both tiers) and was brought in line: Pattern 5 of 7, Urgent 3 of 5 (SPEC 5.3 + TRIGGER 3.5), which also matches its already-written copy.
5. MOSTLY RESOLVED (Session 69): the stranded "two confidence tiers" table was moved under its 6.2 header; Discipline and Balanced confirmed to SHARE one copy pool in v1 (8.1 reworded to match); the Day Takeaway is documented secular by design (15.1) with "Rooted faith flavor on the Day Takeaway" added to the parked faith candidates (9.2). The trigger library had NO duplicate section numbers, that part of the original item was inaccurate. LEFT BY CHOICE: the spec's duplicate section numbers (two 3.5, two 6.0, two 13) stay as-is; fixing the 6.0 pair cleanly requires renumbering the whole 6.x chain and breaking cross-references for a purely cosmetic gain, so it is deferred to a dedicated renumber pass if ever worth it.
6. NEW (Session 68): the Day Takeaway engine rule set must be written before build, the standout ranking plus the personal-history comparators. It is not in the current trigger library.
7. NEW (Session 68): Weekly and Monthly tip rules (windows, thresholds, aggregation from daily) must be written. The trigger library currently covers only the 7-day rolling stream.
8. Cross-surface topic ledger: storage location and memory duration are undefined.
9. VERIFY: current Day Score recompute-on-edit and goal-snapshot behavior in code (see 15.5). May spin off as its own Day Score item.

---

## 17. EvR CARD ARCHITECTURE (Session 69 resolution)

This resolves the EvR portion of Section 16 open item 2 and supersedes the Smart Tips placement language in Section 10.1. EvR moves from "a fixed set of data cards plus an orphan suggestions list" to a finding-driven card system. Where this disagrees with 10.1, this wins.

### 17.0 Why (grounded in the shipped code)

The shipped EvR (utils/diagnosticReport.ts + app/diagnostic-report-view.tsx) already renders cards conditionally: every card except Logging Consistency renders only when its data exists, and cross-signal correlations are already bundled into a single "Patterns in your data" card holding an array. So this is an extension of the existing pattern, not a rewrite from scratch. The orphan "YOUR TOP SUGGESTIONS" numbered list at the bottom is retired.

### 17.1 Three card classes

1. Spine cards (always-on): a minimal foundation that always renders so the report is never empty and is always grounded.
   - Logging Consistency: always. It is the data-quality meta-card and frames the reliability of everything else.
   - Calorie / Deficit headline: always when the user has a weight goal. It is the spine of the whole report. Hidden only when no goal is set or there is not enough logged data, consistent with today's conditional behavior.
   Spine cards are never gated and never capped.

2. Domain finding cards (finding-driven): one card per domain (Macro Quality, Extended Nutrition, Hydration, Sleep, Activity, Weight Trend, Intermittent Fasting, plus the existing Burn Accuracy data-quality card). A domain card appears ONLY when that domain produced a finding this period (a corrective Pattern or Urgent, or a noteworthy positive Insight). A quiet, unremarkable domain renders no card. When a card does appear it shows its data rows, a status badge, and the domain's coaching line. The report's length therefore equals how much the data actually has to say.
   - One card per domain. The highest-priority finding for that domain headlines the card and supplies its coaching line. Additional same-domain findings may appear as secondary lines, but the card stays one unit so it cannot balloon.
   - Domain finding cards carry mostly single-signal Generic and Pattern coaching, which is free per Section 2.1. They are not gated.

3. Insight cards (dynamic, the premium layer): the cross-signal correlations. Each correlation is its OWN card. This replaces the bundled "Patterns in your data" card. Insight cards are the "how did it know that" moments and the layer that can proliferate, so this is where the cap and the gating live:
   - Ranked by priority, capped at 5 (the cap from Section 6.4 lives here).
   - Gated: free sees 1 unblurred and the rest as blurred insight cards; Pro sees all unblurred. EvR is exempt from the diversity rule (15.3), so all qualifying insight cards up to the cap show.

### 17.2 No orphans: rule-to-card mapping (build-gate)

Retiring the suggestions list is only safe if every rule has a card home. This is a hard build-gate: no rule ships without a mapped home. If a rule does not map cleanly, that is a flag to resolve at build, never a junk-drawer fallback.

| Card | Class | Rules that surface here |
|------|-------|-------------------------|
| Logging Consistency | Spine | log_consistency_low, log_streak_strong |
| Calorie / Deficit | Spine (when goal set) | net_above_pace, net_below_pace, cal_small_gap, cal_outlier_week, cal_goal_hit, weekend_spike |
| Burn Accuracy | Domain (data-quality, no trigger rule) | calibration card only; surfaces when active-calorie data exists |
| Macro Quality | Domain | protein_under, protein_high |
| Extended Nutrition | Domain | fiber_low, sodium_high, sugar_high |
| Hydration | Domain | water_under, water_high |
| Sleep | Domain | sleep_score_low, sleep_duration_short, sleep_bedtime_inconsistent, sleep_score_high, sleep_deep_low |
| Activity | Domain | active_low, active_high, activity_streak_low, steps_low, steps_high, workout_low |
| Weight Trend | Domain | weight_plateau, weight_wrong_direction, weight_on_track, weight_infrequent |
| Intermittent Fasting | Domain (only for IF users) | if_inconsistent, if_late_close, if_consistent |
| Insight cards (one per correlation) | Insight | cross_protein_sleep, cross_sodium_scale, cross_high_burn_overeating, cross_sleep_intake, cross_workout_intake, cross_steps_sleep, cross_fiber_calorie |

New cards this requires building (do not exist today): Extended Nutrition (fiber, sodium, sugar are currently crammed into Macro), Hydration, Activity, Weight Trend (weight is currently only a row inside the Deficit card), Intermittent Fasting, and the per-correlation insight cards (currently one bundled "Patterns" card).

### 17.3 Digestibility guardrails

- Finding-driven rendering self-limits the report: a clean week shows the spine plus a couple of green positives; a messy week shows more, but every card earned its place. Nothing renders just to say "normal."
- The full numeric dashboard is the Stats tab's job. EvR is the coaching report and shows what is worth coaching, not every metric.
- Status badges (good / attention) let the eye triage fast: green is skippable, amber is "look here."
- The cap of 5 on insight cards prevents the one layer that can proliferate from walling the report. If real-data testing shows reports still running long, add a total report ceiling; finding-driven plus the insight cap should self-regulate first.

### 17.4 Mindful overlay (ties to 15.7)

Render-time, suppress before gate, per Section 15.7.
- Default Mindful (growth areas OFF): corrective domain findings are suppressed, so those cards do not appear at all. Positive findings still surface their cards. Insight cards are positive-only and follow B1 (one shown, the rest hidden, never blurred). If suppression leaves the report with only the spine, the spine still renders (it is foundational and neutral) and the warm fallback applies to any surface left with nothing positive.
- Growth areas ON: corrective domain cards appear with Mindful-safe copy; insight cards gate normally, including blurred ones.

### 17.5 What this supersedes

- 10.1: the "YOUR TOP SUGGESTIONS section replaced by one Smart Tips section" model is replaced by this three-class card system. The suggestions list is retired; coaching lives on domain cards and insight cards.
- The bundled "Patterns in your data" card is replaced by per-correlation insight cards.

### 17.6 Spawned build notes (not blocking scoping)

- Six new card types to build (Extended Nutrition, Hydration, Activity, Weight Trend, IF, per-correlation insight cards).
- The DiagnosticReport shape (utils/diagnosticReport.ts) currently has fixed fields (deficit, burnAccuracy, consistency, macros, sleep, correlations[], suggestions[]). It will need new finding types and the suggestions[] field retired. A build-session concern, flagged here so it is not a surprise.
