# SPEC: Smart Recovery Coach

Status: DRAFT for review (2026-06-15). No code until the rule set + open decisions are signed off.
Related: SMART_COACH_SPEC.md (coaching engine), SPEC_sleep.md (Recovery tab, Section 13 drill-downs), utils/recoveryScore.ts, utils/smartTipsEngine.ts, utils/coachAI.ts.

## The problem this solves
The Recovery tab coach today (`recoveryCoachTip` in app/sleep.tsx:420) is a LOCAL deterministic template. It only describes TODAY's snapshot ("HRV at baseline, recovery 74, steady zone"). It cannot answer the real user question:

> "My recovery has sat in the 70s for weeks. I think my diet and training are good. What am I missing and how do I improve it?"

That is a PATTERN question across time, not a one-day readout. To answer it the coach has to correlate the user's recovery against their own logged behavior over a window and surface the dominant lever. That is the goal of this build: a genuinely smart recovery coach, not an AI-painted template.

## Philosophy
- Hybrid (same as the rest of Smart Coach): a deterministic BRAIN finds the pattern and decides the verdict; the AI only PHRASES it in the user's coaching mode. The AI never computes or invents a finding.
- Behavioral, never clinical. Tips name behaviors and levers (sleep, training load, deload, bedtime). Never a medical cause, never HRV/RHR jargon unexplained.
- Honest about limits. The coach only sees what is logged. It may find a real lever, OR it may conclude the 70s is the user's normal physiological range, which is also a valid, honest answer. It must be able to say "you are doing the right things; this looks like your baseline."
- Conservative. With 7 to 14 noisy days, correlations are weak. Thresholds are strict and language is hedged ("tends to", "appears to", "the pattern so far"). Better to say nothing than to claim a spurious pattern.

## Data we actually have (grounds every rule below)
Per-day, already in the engine `WindowDay`: consumed, protein, fat, carbs, fiber, sodium, sugar, waterLogged, rawActive (active kcal), steps, weight, sleepScore, sleepHours, sleepBedTimeMin, deepSleepPct, bmr, workoutChecked/workoutTotal/workoutScheduled, IF fields, isLoggedDay, hasFoodData.

NOT in the engine yet:
- `recoveryScore` per day -- it IS stored in pj_<date>.recoveryScore (the freeze write), just not read into WindowDay. Cheap to add.
- HRV / RHR / resp / SpO2 per day -- NOT stored. Currently only computed live for today. Two options (see Open Decisions): persist them daily, or recompute per-day via fetchRecoverySignals(anchorDate) (~14 HealthKit calls per coach run, like the backfill does).

### Shared-infra opportunity (important)
The morning-snapshot freeze already writes pj_<date>.recoveryScore. If we ALSO persist that day's frozen HRV/RHR/resp/SpO2 in the same write (read-then-merge, never overwrite), then:
- the recovery coach reads real daily signal history cheaply (no 14 HealthKit calls), AND
- Slice 2 (the per-metric drill-down mini-graphs) gets its daily signal history for free.
One piece of infra, two features. Strongly recommended.

## The intelligence: two layers
1. PATTERN layer (the smart payoff) -- analyze the window, correlate recovery against behavior, surface the dominant lever. This is what answers "why am I stuck."
2. SNAPSHOT layer (the floor) -- today's dominant dragging signal (HRV/RHR/resp low), i.e. the current recoveryCoachTip logic, used only when no pattern clears its confidence bar, so there is always a useful tip.

## Proposed rule set (the heart -- react to this)
Each rule: trigger (conservative) -> finding -> ONE concrete lever. Listed in rough priority order. v1 column marks what to ship first.

| # | Rule | Trigger (draft, tune with real data) | The lever it gives | Data | v1? |
|---|------|--------------------------------------|--------------------|------|-----|
| R1 | Training load drags next-day recovery | Recovery on days AFTER a top-tier load day (rawActive or workout volume in the window's high band) averages meaningfully lower than after easy days | "You recover worse after your hardest days. The fix usually is not training harder, it is protecting an easy/deload day so your body absorbs the work." | recoveryScore[d] vs rawActive/workout[d-1] | YES |
| R2 | Recovery tracks sleep, not training | Low-recovery days line up with short/poor sleep nights more than with hard training | "Your lowest recovery follows your shortest nights, not your hardest workouts. Sleep is your lever here, not the gym." | recoveryScore vs sleepHours/sleepScore | YES |
| R3 | Sustained under-recovery | Recovery (and/or HRV vs baseline) below par across most of the window WITH steady training volume | "Recovery has run below par for most of the window while training stayed steady. That pattern usually means a lighter week, not more effort, is what moves it." | recoveryScore trend (+ HRV if persisted) + training volume | YES |
| R4 | Bedtime inconsistency | Bedtime variance high in the window AND recovery suppressed | "Your bedtimes are swinging, and recovery tends to follow. Anchoring one bedtime is often the quietest fix for the score." | sleepBedTimeMin variance vs recovery | YES |
| R5 | Too sedentary | Recovery low while activity is consistently very low (under-recovery is not always overtraining) | "Recovery is low on your least active days too. Some easy daily movement tends to help recovery, not hurt it." | rawActive low + recovery low | maybe |
| R6 | Fuel support (secondary, lower confidence) | Protein consistently low during a high-training stretch with low recovery | "Protein has been light during a heavy training stretch. Recovery tends to suffer first when fuel is short under load." | protein vs workout volume vs recovery | defer |
| R7 | Strong & stable (positive) | Recovery consistently strong and steady | "Recovery is holding strong and steady. Whatever the current rhythm is, it is working. Protect the sleep and easy days that got you here." | recoveryScore trend | YES |
| R8 | Snapshot floor (today) | No pattern clears its bar | Today's dominant signal (the existing recoveryCoachTip logic) | recoveryResult | YES |

Selection: a PATTERN rule (R1 to R6) outranks the snapshot floor (R8); positive (R7) only when nothing corrective fires. One tip at a time (no tip stacking), same as the other surfaces. Each rule needs a minimum-data gate (e.g. >= N recovery days in window) and a confidence threshold (the delta/separation must exceed a floor before we claim the pattern).

## Mindful behavior
Reuse `applyMindfulSuppression`. Corrective pattern tips suppressed in Mindful unless mindfulGrowthAreas is on. Positive/maintenance (R7) and neutral framing always allowed. Language softened in Mindful (observational, no "fix", no scoring push), consistent with the sleep coach.

## Medical guardrails
- Never name or imply a medical condition. No "your HRV suggests [condition]."
- SpO2 stays informational-only (already the rule in the drill-downs).
- Sustained-anomaly language caps at "if this keeps up it may be worth checking with a professional," never alarm.
- No promises ("this will raise your recovery"). Always "tends to / often / appears to."

## Architecture / build plan (Path B+, engine-style, mirrors the Sleep Coach)
1. Persist daily signals: extend the existing pj_<date>.recoveryScore freeze write to also store frozen HRV/RHR/resp/SpO2 (read-then-merge, never overwrite). Shared with Slice 2.
2. `loadWindowDays` / `WindowDay`: read recoveryScore (+ persisted signals) into the per-day shape.
3. Recovery rules: author R1 to R8 in smartTipsEngine.ts as a recovery rule family + a `computeCoachPacketRecovery` that runs them over the window and builds a CoachPacket (mirrors computeCoachPacketSleep).
4. coachAI.ts: add a `recovery` surface label + a "Recovery surface rules" prompt section (morning-snapshot framing, hedged causation, behavioral-not-clinical), plus refreshCoachTipRecovery + loadCoachTipCacheRecovery, cache key pj_coach_tip_recovery.
5. app/sleep.tsx renderRecovery coach card: show the AI-voiced tip via resolveTipBody, keep the deterministic recoveryCoachTip as the instant/offline fallback. Lazy compute on Recovery tab open, one AI call/day.
6. Dev tool: "Replay Recovery Coach" (clears pj_coach_tip_recovery + last-rule key), matching the Sleep one.
7. tooltipRegistry + SMART_COACH_SPEC.md surface list updated; this spec is the source of truth for the rules.

## Open decisions (need Justin)
1. Analysis window: 7 or 14 days? Recovery patterns need more data to be real -- recommend 14-day analysis (more reliable), framed as a rolling recovery window. (Sleep coach uses 7-night framing; these can differ.)
2. Persist daily signals (HRV/RHR/resp/SpO2) with the freeze? Recommend YES (cheap, data-safe, and it unlocks Slice 2 graphs too). The alternative (recompute per day) is ~14 HealthKit calls per coach run.
3. v1 rule set: ship R1, R2, R3, R4, R7, R8 first; defer R5/R6 until real data shows they fire cleanly? (Recommended.)
4. Confidence strictness: how strong must a pattern be before the coach claims it? Start strict (prefer the honest "this looks like your baseline" over a shaky pattern), loosen later with real data.

## Sleep Coach parity (Justin asked)
The Sleep Coach is ALREADY engine-wired (computeCoachPacketSleep runs sleep rules + cross rules like cross_sleep_intake / cross_protein_sleep), so it is more than a snapshot today -- which is why "good enough for now" is fair. The same cross-correlation philosophy could deepen it later (e.g. "your sleep drops on high-sodium or late-eating days"), but sleep's levers (duration, bedtime) are more self-evident than recovery's, so the payoff is smaller. Recommendation: leave the sleep coach as-is for now; revisit a "deepen sleep coach" pass only after the recovery coach proves the pattern-rule approach on the harder surface.
