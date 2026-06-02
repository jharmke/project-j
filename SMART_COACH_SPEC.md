# Smart Coach: Living Spec (Hybrid AI)

Last checkpoint: 2026-06-01 (scenario library v1)

This is the living source of truth for rebuilding Smart Tips into a true hybrid AI coach. Updated at every checkpoint so no idea or decision gets lost. No double dashes anywhere (project rule). No "Session NN" tags.

---

## What this is
A hybrid system:
- Deterministic code is the BRAIN. It computes every fact, detects the situation, and decides the verdict.
- AI is the VOICE. It phrases the verdict in the user's coaching mode and faith tier. It never computes a number, never picks the conclusion.
- A deterministic CLEANUP pass guarantees accuracy and house style before anything reaches the user.

---

## Why we are rebuilding (what fell short before)
The shipped engine has 40 rules, but:
- Every rule watches a SINGLE signal ("protein low", "water low") and stamps a canned fill-in-the-blank line ("protein below goal 6 of 7 days").
- That is literally the weak example the original spec warned against. It counts. It does not coach.
- It never built the synthesis layer that connects multiple signals into one conclusion (the North Star).
- It is also nearly invisible: domain tips only show on the home card (top 3 of about 5). EvR renders ONLY cross-signal tips, which do not fire for a consistent logger, so EvR looks unchanged. Day Summary shows only the separate Day Takeaway line, no smart tip.

Lesson: the old library was not wrong to exist, it was too shallow (one signal each) with templated copy bolted on. The fix is multi-signal scenarios that carry real reasoning, voiced by AI.

---

## Architecture
1. BRAIN (deterministic code): loads the data window, computes every number, runs scenario detection, decides the headline diagnosis and verdict, assembles a structured packet (named scenario + verdict + supporting facts + mode + faith tier).
2. VOICE (AI at runtime): receives the packet, writes 2 to 3 coach sentences in the right voice. Never computes, never decides truth. Only phrases what the brain decided.
3. CLEANUP (deterministic): before display or save, verify every number in the output matches a number we sent; strip double dashes; enforce length cap and banned words. If anything is off, fall back to a safe templated line. The AI's raw output is never blindly trusted.

Runs once per day per user, cached (engine already computes once per day). Cost is a fraction of a cent per tip, pennies per month per user. Offline or API failure falls back to a template.

---

## Foundational principles (the AI's thinking rests on these)
1. EFFORT VS RESULTS IS THE FOUNDATION. Before deciding the story, the brain always cross-checks logged effort (net deficit or surplus) against the body's actual response (weight trend). Agreement means move to the next real gap. Disagreement IS the tip (under-logging, burn overestimate, water retention).
2. ACCURACY IS NON-NEGOTIABLE. Code computes all numbers and picks all conclusions. AI only phrases. Cleanup verifies. A wrong number cannot reach the screen.
3. GIVE CREDIT BEFORE NAMING THE GAP. Earn trust first.
4. CONNECT TWO OR MORE SIGNALS. Never a bare stat without a conclusion the user could not easily reach alone.
5. OBSERVATIONAL VOICE. "We noticed", specific, never preachy, no fluff. Real reasoning that actually helps.
6. MODE AND FAITH AWARE. Discipline / Balanced / Mindful, and Rooted / Exploring / Not Right Now.
7. SAFETY OVER ENGAGEMENT. Never praise dangerous behavior. Never play doctor. Care tone when the data suggests harm.

---

## The two lists

### List 1: Scenario Library (the brain). Big and growing. (defined below)
Every situation the code can recognize. The more we define, the smarter and safer it gets. The AI never figures out the situation on its own; the code hands it a named scenario + verdict + facts.

### List 2: Voice Examples (the style). Organized by mode and tone, grown over time.
Gold-standard tips that teach the AI HOW to talk. Each generation call shows the AI only the relevant subset (for a Mindful tip, show Mindful examples), so the full library can be large without bloating any single call or running up cost. Target a dozen plus across modes and tones, expanded as we watch real output. NOT one example per scenario.

---

# SCENARIO LIBRARY (List 1)

Thresholds below are directional starting values, flagged for post-launch tuning. Detection is plain English; exact numbers get set in code.

## How the brain chooses when several scenarios match
The coach surfaces ONE headline per surface. Decision order:
1. CONFIDENCE GATE first. If there is not enough trustworthy data, drop to Family 5 (data quality) or onboarding. Never fake a diagnosis.
2. SAFETY override. If the care signals fire (Family 9), they outrank everything. Never buried under a cheerful tip.
3. EFFORT VS RESULTS calibration (Family 1). If effort and results disagree, that mismatch is almost always the most valuable thing to say, so it ranks high.
4. THE GAP. If calibration is clean, find the most impactful gap: a multi-signal pattern (Family 3) outranks a single one-gap (Family 2), which outranks a minor trend note.
5. POSITIVE. If nothing is wrong, Family 6 (crushing it) with one stretch goal. Never hollow praise.
Higher altitude wins: if "processed-diet pattern" and "protein low" both match, fire the pattern, not the single stat. Do not stack two tips that are the same story.

## Family 1: Effort vs Results (the foundation)
Requires a logged net over the window AND a real weight trend (enough weigh-ins, smoothed, not single readings). Gate all of these on bmr greater than 0.

- 1.1 ALIGNED AND ON PACE. Logged deficit predicts roughly the loss actually happening. Verdict: the data is trustworthy and the plan is working; hand off to find the next real gap. (Justin's current case.)
- 1.2 STUCK DESPITE A LOGGED DEFICIT. Clear deficit 7 plus days, weight flat or up. Brain narrows the cause before speaking: low logging consistency (untracked bites and liquids), recent high-sodium days (water retention, transient), burn accuracy at 100% with high active calories (deficit overestimated), too few or erratic weigh-ins (cannot trust the trend yet), or everything tight and still stuck (genuine stall and adaptation, consider a refeed or diet break or a TDEE recalc).
- 1.3 DROPPING FASTER THAN THE MATH PREDICTS. Loss rate outruns the logged deficit. Likely under-logging food (loss is real but the data has holes that poison future tips), or an early-cut water and glycogen whoosh that will slow. If loss exceeds about 1% of bodyweight per week, flag the pace itself, especially with low protein (see Family 9).
- 1.4 BULK, NOT GAINING. Goal is gain, logged surplus but weight flat. Verdict: the surplus is not actually there or is being burned off; intake needs to go up.
- 1.5 BULK, GAINING TOO FAST. Goal is gain, weight climbing faster than a lean-gain pace. Verdict: likely adding more fat than needed; tighten the surplus.
- 1.6 MAINTAIN, DRIFTING. Goal is maintain, weight trending out of a tight band. Verdict: gentle drift flag, small correction, no alarm.

## Family 2: The One Gap (everything good except one thing)
Fires only when the rest is genuinely strong and exactly one signal is meaningfully short. Big credit, one lever.
- 2.1 PROTEIN the only gap (riskier on a cut and while training: muscle retention).
- 2.2 SLEEP the only gap (recovery, hunger, performance downstream).
- 2.3 STEPS or ACTIVITY the only gap (NEAT drives the deficit more than people think).
- 2.4 HYDRATION the only gap.
- 2.5 FIBER the only gap (best proxy for food quality and satiety).
- 2.6 CONSISTENCY the only gap (great ON logged days, gaps between them).

## Family 3: Multi-Signal Patterns (the smartest tier)
Combinations that mean something neither signal does alone.
- 3.1 PROCESSED-DIET PATTERN. Protein low AND fiber low AND sodium high. Diet skews packaged and processed; explains hunger even in a deficit. (The spec's strong example.)
- 3.2 UNDER-FUELING PATTERN. Very low intake AND low protein AND high activity AND poor or declining sleep. Body is under-resourced; can explain bad sleep and a stall via adaptation. Care tone (see Family 9).
- 3.3 WEEKEND BLOWOUT. Weekday deficit solid, weekend surplus erases it; the week nets near maintenance despite "good" weekdays.
- 3.4 SMALL CONSISTENT GAP. Always just barely over target with the rest fine and low fiber; usually untracked liquids, oils, sauces, and bites.
- 3.5 UNDER-RECOVERY. High workout volume and high activity with sleep declining and maybe a stall; recovery debt, not a willpower problem.
- 3.6 SODIUM AND THE SCALE. Weight spikes the morning after high-sodium days; water, not fat. Do not panic on those weigh-ins. (Cross-signal, needs sodium logged on most entries.)

## Family 4: Sleep-Driven
- 4.1 POOR SLEEP TO NEXT-DAY OVEREATING. Intake climbs after rough nights (ghrelin up, leptin down). Cross-signal, needs contrast in sleep data.
- 4.2 INCONSISTENT BEDTIME. Bedtime varies widely; body clock disruption even when total hours are fine.
- 4.3 SLEEP TRENDING DOWN. Not just low, getting worse across the window. Catch the slide early.
- 4.4 LOW DEEP SLEEP. Adequate hours but low deep percentage; alcohol, late meals, screens.
- 4.5 SLEEP CARRYING EVERYTHING (positive). Strong sleep lining up with better adherence and recovery.

## Family 5: Consistency, Data Quality, Confidence
- 5.1 TOO SPARSE TO TRUST. Below the minimum logged days; the coach lowers its own confidence and says so honestly instead of faking a read.
- 5.2 PARTIAL-DAY LOGGING. Days logged but suspiciously low calories (only breakfast); skews the deficit math. Flag the data gap, not the person.
- 5.3 WEEKDAY-ONLY LOGGER. Logs Monday to Friday, drops weekends; blind spot exactly where the damage tends to happen.
- 5.4 STRONG LOGGING STREAK (positive). Reinforce; also unlocks higher-confidence tips.
- 5.5 BRAND NEW. Not enough history yet; encourage, set expectations, no hard diagnoses.

## Family 6: Genuinely Crushing It (positive, never hollow)
- 6.1 EVERYTHING ALIGNED AND ON PACE. Name specifically what is working, then exactly one stretch goal so the praise is not empty.
- 6.2 BIG IMPROVEMENT VS LAST PERIOD. This window clearly better than the prior one; momentum (needs personal-history comparison).
- 6.3 THE COMEBACK. Fell off, returned. Acknowledge the return; powerful for retention and a natural faith and grace moment.

## Family 7: Trend and Trajectory (time-aware, not just averages)
- 7.1 PLATEAU AFTER A GOOD RUN. Was losing, now flat 10 plus days; adaptation, consider refeed, diet break, or TDEE recalc.
- 7.2 SLIPPING. Adherence was strong, last few days declining; catch it before it becomes a pattern.
- 7.3 STALE TARGETS. Weight changed enough that BMR and TDEE targets are likely off; suggest updating them.
- 7.4 NEARING GOAL. Approaching goal weight; start the transition-to-maintenance conversation.

## Family 8: Intermittent Fasting (only when enabled)
- 8.1 WINDOW INCONSISTENT.
- 8.2 EATING WINDOW CREEPING LATER (late-night eating, where extra calories hide).
- 8.3 WINDOW CONSISTENT (positive).

## Goal modifier (applies across all families)
Cut: emphasize protein, deficit size, muscle retention, not losing too fast. Bulk: emphasize hitting the surplus, protein for growth, not gaining too fast. Maintain: a stability band, no judgment on small fluctuations, no score pressure.

---

## ACCURACY GUARDS AND EDGE CASES (cross-cutting, mandatory)
- INSUFFICIENT WEIGH-INS: never claim a weight trend with fewer than about 3 to 4 weigh-ins in the window. Weight is noisy.
- SINGLE-READING NOISE: one low or high weigh-in (post-gym, post-meal, post-salt) is not a trend. Use a smoothed trend, not endpoints. (Example: a 172.3 empty-stomach reading after the gym is noise, not progress.)
- WINDOW TOO SHORT: new user or few logged days, do not fire confident diagnoses; switch to Family 5.
- BMR ZERO OR INCOMPLETE PROFILE: every net-based scenario gates on bmr greater than 0 (ties to the Null BMR audit already in progress). If bmr is unknown, skip net-based tips entirely.
- BURN ACCURACY SUSPECT: high active calories with burn accuracy at default 100% means the deficit is probably smaller than logged; factor into Family 1 before blaming the user.
- EXCLUDED DAYS: days the user marked excluded (sick, refeed, travel) must not poison averages or trigger a "you blew it" tip.
- GOAL CHANGED MID-WINDOW: use the immutable per-day goal snapshot. Never judge old days against today's goal.
- INTENTIONAL OUTLIER: one high day in an otherwise strong week is normal, often a planned refeed; treat it positively, do not fire a failure tip on a single outlier.
- NUTRIENT DATA SPARSITY: only diagnose sodium, fiber, or sugar when most logged entries actually carry that nutrient (the engine already gates on the entry ratio). Two of twenty foods having sodium data is not "high sodium."
- MISSING IS NOT ZERO: HealthKit steps or sleep not synced is unknown, not "you did not move or sleep." Never scold a data gap.
- PARTIAL CURRENT DAY: today is in progress and is excluded from the window; never judge an incomplete day.
- NO DOUBLE-COUNTING: one headline per surface; do not fire two tips that are the same underlying story (altitude rule).

## SAFETY AND CARE (Family 9, overrides everything)
- DANGEROUS UNDER-EATING: very low intake plus losing very fast plus heavy activity is a concern, not an achievement. NEVER celebrate it. Care tone, gentle, suggest fueling more. Mindful mode especially.
- LOSING TOO FAST: above roughly 1% of bodyweight per week sustained, flag the pace even if the user is happy, because muscle and health suffer.
- STAY IN THE BEHAVIOR LANE: never diagnose a medical condition (thyroid, PCOS, etc). At most: "if this persists, it is worth talking to a professional."
- NO FEAR, NO SHAME: never use fear or guilt to drive behavior. Concern is expressed as care, not alarm.

---

## Reference example (gold standard, Justin's real 14-day data)
Data: lose 1.5 lb per week; 174.4 lb; protein 106g avg vs 122 to 174g target; about 1785 cal per day, BMR 1751, active about 808, net about -773; sleep 7h42m avg, score 86; weight 180 on 5/7 to 174.4 on 5/31 (about 1.6 lb per week); steps about 10k; 7 of 7 workouts; water 110oz vs 100 goal; fiber 29.4g.

Scenario detected: Family 1.1 (effort matches results, deficit confirmed by weight trend on pace) then Family 2.1 (protein the one gap, on an aggressive cut while training daily, muscle-loss risk).

Tip (Balanced voice):
"You're crushing the hard parts. Weight's tracking right at your 1.5-a-week pace, sleep's sitting at 86, and you hit all 7 workouts. The one real gap is protein, averaging 106g against a 122g floor. Cutting this hard while training every single day, protein is the thing that decides whether the weight coming off is fat or muscle. Get it over 122 for now, toward 150 if you can, and you protect everything you're building."

Note on accuracy: the placeholder version claimed the scale was stalled. That line was deleted because Justin's scale is dropping on pace. The tip bends to real data; it cannot parrot a fake stall.

---

## Open and next
- [ ] Justin review and expand the Scenario Library (add, cut, sharpen)
- [ ] Write the Voice Examples (List 2) organized by mode and tone
- [ ] Lock the rulebook (system prompt) text
- [ ] Build the structured-packet handoff in the engine
- [ ] Build the AI call, cleanup tool, and offline fallback
- [ ] Wire into EvR and Day Summary
- [ ] App Store: privacy disclosure for sending logged data to an AI service (update privacy.html before this ships)

---

## Checkpoint log
- 2026-06-01: Decision locked, true hybrid AI coach. Captured architecture, foundational principles, two-list model.
- 2026-06-01: Scenario Library v1 drafted: 9 families (Effort vs Results, One Gap, Multi-Signal Patterns, Sleep-Driven, Data Quality, Crushing It, Trend, IF, Safety) plus a "how the brain chooses" priority spine, a cross-cutting accuracy-guards list, and a Safety and Care override family. Reference gold-standard tip retained. Next: Justin reacts and expands, then we write Voice Examples.
