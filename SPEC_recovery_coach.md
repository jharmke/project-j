# SPEC: Smart Recovery Coach

Status: LOCKED (2026-06-15, Justin signed off on rules + decisions). Build-ready.
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

| # | Rule | Trigger (tune with real data) | The lever it gives | Data | v1? |
|---|------|--------------------------------------|--------------------|------|-----|
| R0 | ACUTE DROP (same-day, Whoop/Oura style) | Today's recovery is down SHARPLY vs the recent norm (single-day delta beyond a strict threshold) | "Big drop from your norm today. Common causes are a rough night, a hard day, alcohol, or coming down with something. Treat today easy and see how you bounce back." | today's recoveryScore vs window norm | YES |
| R1 | Training load drags next-day recovery | Recovery on days AFTER a top-tier load day (rawActive or workout volume in the window's high band) averages meaningfully lower than after easy days | "You recover worse after your hardest days. The fix usually is not training harder, it is protecting an easy/deload day so your body absorbs the work." | recoveryScore[d] vs rawActive/workout[d-1] | YES |
| R2 | Recovery tracks sleep, not training | Low-recovery days line up with short/poor sleep nights more than with hard training | "Your lowest recovery follows your shortest nights, not your hardest workouts. Sleep is your lever here, not the gym." | recoveryScore vs sleepHours/sleepScore | YES |
| R3 | Sustained under-recovery | Recovery (and/or HRV vs baseline) below par across most of the window WITH steady training volume | "Recovery has run below par for most of the window while training stayed steady. That pattern usually means a lighter week, not more effort, is what moves it." | recoveryScore trend (+ persisted HRV) + training volume | YES |
| R4 | Bedtime inconsistency | Bedtime variance high in the window AND recovery suppressed | "Your bedtimes are swinging, and recovery tends to follow. Anchoring one bedtime is often the quietest fix for the score." | sleepBedTimeMin variance vs recovery | YES |
| R7 | Strong & stable (positive) | Recovery consistently strong and steady | "Recovery is holding strong and steady. Whatever the current rhythm is, it is working. Protect the sleep and easy days that got you here." | recoveryScore trend | YES |
| R8 | Snapshot floor (today) | No pattern clears its bar | Today's dominant signal (the existing recoveryCoachTip logic) | recoveryResult | YES |
| R9 | No behavioral cause (honesty) | Recovery is low/stuck but NOTHING in logged data correlates | "Nothing in your logged sleep, training, or routine is clearly dragging this. It may simply be your baseline, or something we do not track like stress, caffeine, or alcohol." NEVER invents a cause. | all of the above failing to clear thresholds | YES |

OMITTED (decided 2026-06-15):
- R5 (too sedentary) -- low confidence, risks contradicting R1's rest message. Revisit only if real data shows it firing cleanly.
- R6 (protein/fuel) -- the existing nutrition coach already surfaces low protein on the home/EvR/weekly/summary surfaces; duplicating it in the recovery coach is just noise.

Selection / priority: R0 (acute, same-day) is HIGHEST when it fires. Then the chronic PATTERN rules (R1 to R4). Then R7 (positive) only when nothing corrective fires. R8 (snapshot) is the floor when there is data but no pattern clears its bar. R9 (honest no-cause) fires when recovery is low/stuck yet nothing correlates -- this is the anti-BS safety net, never an invented reason. ONE tip at a time (no stacking); contradictory rules can never co-fire because only one is selected. Don't-nag: cache once/day + a last-rule cooldown (mirror pj_coach_last_rule_sleep) so the same rule doesn't repeat day after day.

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

## Locked decisions (2026-06-15)
1. Analysis window: 14 days (rolling), framed as a recovery window. BUT a hard two-tier data gate (see Edge cases) so it never claims a pattern it lacks data for.
2. Persist daily signals: YES. Store the frozen OVERNIGHT value per night for HRV/RHR/resp/SpO2 alongside pj_<date>.recoveryScore (read-then-merge, never overwrite). This is the Whoop/Oura model (one overnight value per night, NOT a whole-day average). Feeds both this coach and Slice 2. Slice 2 graphs plot one point per night.
3. v1 rule set: R0, R1, R2, R3, R4, R7, R8, R9. R5 and R6 OMITTED (see rule table).
4. Confidence: STRICT. The coach only speaks a pattern when it is clearly there; faint patterns stay quiet and fall through to R8/R9. Strictness is what protects against BS answers. Loosen later only with real data.

## Edge cases & handling (locked)
- New / sparse user: hard two-tier gate. Under ~10 recovery days -> NO pattern tips; show R8 snapshot + an honest "still building your recovery picture (X of 14 nights)" line. Each pattern rule ALSO needs enough of the right days (e.g. R1 needs several hard-day/next-day pairs) or it stays silent.
- Gappy data (watch some nights): gate on ACTUAL recovery-day count, not calendar days. Disclaim it plainly ("based on the 9 nights you have"). Never imply a full 14-day read off partial data.
- Watchless / manual-sleep user: with the Option B gate there are no recovery scores, so the coach shows an empty state, NOT a pattern. EMPTY-STATE COPY IS DEVICE-AGNOSTIC: "needs overnight heart data synced to Apple Health" (NOT "Apple Watch" specifically -- other brands can sync to Apple Health). FOLLOW-UP: the recovery hero void copy shipped earlier says "from your Apple Watch" -- soften it to match this device-agnostic wording.
- Excluded days: respect the exclude toggle / excluded dates, consistent with the rest of the hub.
- No behavioral cause: R9. When recovery is low/stuck but nothing correlates, say so honestly. NEVER invent a cause. This is the anti-BS net.
- Contradictory tips: impossible by construction -- one tip selected per day by priority; R1 (rest) and the omitted R5 (move) can never co-fire.
- Don't nag: cache once/day + last-rule cooldown so the same rule doesn't repeat daily.
- Acute one-offs (illness/travel/alcohol): handled by R0 as a same-day "big drop, treat today easy" rather than being mistaken for a chronic pattern (strictness + multi-day requirement keep R1 to R4 from reacting to a single anomalous day).

## Future expansion: recovery in summaries / EvR (NOT built, logged 2026-06-15)
The dedicated Recovery Coach card is HUB-ONLY (Recovery tab). The holistic coaches (home / EvR / weekly / monthly) are separate surfaces. Sleep ALREADY feeds them via the general engine's sleep rules; RECOVERY does not yet. Recovery is a headline wellness signal, so the summaries should eventually reference it. Plumbing is now half-done: WindowDay carries recoveryScore. The right approach is to feed recovery as an INPUT to the existing summary/EvR coaches (e.g. "recovery averaged 74 this week, trending flat"), NOT to duplicate the recovery-tab tip onto those screens. Tracked under the Sleep Hub item's "REMAINING RECOVERY TODO" (wire Recovery Score into Day Summary, weekly/monthly, EvR, Stats, dayScore.ts) and as a standalone roadmap line. Decision needed before building (which surfaces, how prominent, Mindful).

## Sleep Coach parity (Justin asked)
The Sleep Coach is ALREADY engine-wired (computeCoachPacketSleep runs sleep rules + cross rules like cross_sleep_intake / cross_protein_sleep), so it is more than a snapshot today -- which is why "good enough for now" is fair. The same cross-correlation philosophy could deepen it later (e.g. "your sleep drops on high-sodium or late-eating days"), but sleep's levers (duration, bedtime) are more self-evident than recovery's, so the payoff is smaller. Recommendation: leave the sleep coach as-is for now; revisit a "deepen sleep coach" pass only after the recovery coach proves the pattern-rule approach on the harder surface.
