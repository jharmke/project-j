# TRIGGER LIBRARY: Smart Tips Engine

Status: IN PROGRESS (scoping session, Session 67). No code written yet.
This doc is the complete rulebook for the Smart Tips hardcoded rules engine.
Created: 2026-06-01

---

## 0. READ FIRST

- This document is a companion to SPEC_smart_tips.md. Read that spec before touching anything here.
- All decisions in SPEC_smart_tips.md are locked. Do not re-litigate them.
- This document defines every rule the engine can fire on. The build session cannot start without it.
- ALL DECISIONS BELOW ARE LOCKED unless explicitly marked OPEN or ON THE FENCE.

---

## 1. GLOBAL RULES (apply to every rule in this library)

These are locked in SPEC_smart_tips.md and repeated here for reference. Do not change them.

### 1.1 Tier definitions

| Tier | Description |
|------|-------------|
| Urgent | Actively working against the user's goal right now. Needs attention. |
| Pattern | Consistently off over multiple days. Worth addressing, not alarming. |
| Insight | Editorial. Something the user wouldn't notice themselves. Positive or corrective. |

### 1.2 Fire minimums

| Tier | Minimum days | Logging completeness required |
|------|-------------|-------------------------------|
| Urgent | 3 of last 5 days | 80% of window days logged |
| Pattern | 5 of last 7 days | 80% of window days logged |
| Insight | 5 of last 7 days | 80% of window days logged |

### 1.3 Cooldowns

| Tier | Cooldown |
|------|----------|
| Urgent | 3 days |
| Pattern | 5 days |
| Insight | 5 days |

### 1.4 Incomplete log filter (calorie/net-based rules only)

Days where consumed < 50% of BMR are excluded from the pattern window entirely. These are almost certainly incomplete logs, not real low-intake days. The floor scales with the user's BMR -- it is not a flat number.

BMR gate: if bmr === 0 (incomplete profile), skip all net-based rules entirely. Do not fire any tip that requires net calorie comparison.

### 1.5 Outlier exclusion (calorie/net-based rules only)

Days where net > paceTarget + 900 (extreme outlier -- birthday, holiday, travel) are excluded from the pattern window. One outlier day cannot trigger or suppress a tip.

### 1.6 Goal-awareness

Every rule must define its behavior per goal type. The same data pattern means different things depending on pj_profile.weightGoal.

Goal types: lose_2, lose_1_5, lose_1, lose_0_5, maintain, gain_0_5, gain_1.

For simplicity, rules reference three buckets:
- LOSE: any lose_* goal
- MAINTAIN: maintain goal
- GAIN: any gain_* goal

### 1.7 Mindful behavior

Default Mindful (growthAreas OFF): positive tips only. All corrective tips suppressed silently.
Growth Areas ON: corrective tips fire with Mindful-specific copy. Never alarming, never number-heavy.

Every rule specifies: suppressed in Mindful default / allowed with growth areas ON.

### 1.8 Positive reinforcement rules

Included in every category. Insight tier only, never Urgent or Pattern. High bar to qualify -- requires a genuine streak of good behavior, not a single good day. Naturally crowded out by corrective tips most days. Mindful users see these more frequently because corrective tips are suppressed by default.

### 1.9 Extended nutrition completeness gate

Fiber, sodium, sugar rules require an additional per-rule data completeness check on top of the global 80% gate. If fewer than 60% of logged entries in the window have extended nutrition data for that specific nutrient, the rule does not fire. User is likely logging custom foods with incomplete data.

### 1.10 Copy standard

Every rule has a minimum 3 copy variants per tier per coaching mode. Variants rotate -- never the same variant twice in a row. Data slots into the variant naturally (e.g. {days}, {avg}, {goal}). Copy is always observational, never prescriptive. See Section 9 for full copy pools.

---

## 2. RULE CATEGORIES

Seven categories, domain-organized. Tier noted per rule.

1. Nutrition
2. Sleep
3. Activity
4. Intermittent Fasting
5. Weight Trend
6. Consistency
7. Cross-Signal (Smart Tips tier -- multi-stream correlations)

---

## 3. NUTRITION RULES

### 3.1 Calorie Gap -- Under Target (corrective)

**Rule ID:** cal_under

**What it detects:** User is consistently running less of a deficit (or surplus) than their goal requires, as measured by net calories vs paceTarget.

**Compare:** net calories vs paceTarget. Net = consumed - (activeCalories * burnAccuracyPct / 100) - BMR. Same formula as computeDayNet.

**Incomplete log filter:** Exclude days where consumed < 50% of BMR before evaluating.

**Outlier exclusion:** Exclude days where net > paceTarget + 900.

**Structure:** X of Y days pattern (not rolling average). A day "qualifies" if its net is above the threshold.

**Thresholds:**

| Tier | Threshold | Fire condition | Goal behavior |
|------|-----------|---------------|---------------|
| Pattern | net > paceTarget + 200 | 5 of last 7 qualifying days | LOSE: fires. MAINTAIN: fires. GAIN: escalates to Urgent (being under on a bulk directly opposes goal). |
| Urgent | net > paceTarget + 500 | 3 of last 5 qualifying days | LOSE: fires (rarely -- this means near-maintenance despite cut goal). MAINTAIN: fires. GAIN: always fires (under on bulk = urgent). |

**Mindful behavior:** Suppressed by default. Allowed with Growth Areas ON. Copy never uses specific calorie numbers -- observational framing only.

**Goal-specific copy direction:**
- LOSE: "You've been closer to maintenance than your goal pace this week."
- MAINTAIN: "Your net has been running above target most days this week."
- GAIN: "You've been consistently under your intake goal -- hard to build when you're under-fueling."

---

### 3.2 Calorie Gap -- Over Target (corrective)

**Rule ID:** cal_over

**What it detects:** User is consistently running more calories than their goal allows -- too much surplus on a cut, or surplus when trying to maintain.

**Compare:** net calories vs paceTarget. Same formula as 3.1.

**Incomplete log filter:** Same as 3.1 (50% BMR floor).

**Outlier exclusion:** Same as 3.1 (paceTarget + 900).

**Structure:** X of Y days pattern.

**Thresholds:**

| Tier | Threshold | Fire condition | Goal behavior |
|------|-----------|---------------|---------------|
| Pattern | net < paceTarget - 200 | 5 of last 7 qualifying days | LOSE: fires (surplus on a cut). MAINTAIN: fires. GAIN: Insight tier only -- being slightly over on a bulk is fine. |
| Urgent | net < paceTarget - 500 | 3 of last 5 qualifying days | LOSE: fires. MAINTAIN: fires. GAIN: suppressed -- being well over on a bulk is not urgent. |

**Mindful behavior:** Suppressed by default. Allowed with Growth Areas ON. No numbers in Mindful copy.

**Goal-specific copy direction:**
- LOSE: "Most days this week your net has been above your deficit target."
- MAINTAIN: "You've been running a consistent surplus -- might be worth a look."
- GAIN: (Pattern only, positive framing) "You've been hitting your intake target well this week."

---

### 3.3 Liquid Calories / Unlogged Bites (Smart Tip -- corrective)

**Rule ID:** cal_small_gap

**What it detects:** User is consistently missing their deficit by a small amount -- suggesting liquid calories, sauces, or bites that don't get logged. This is the "how did it know that" tip.

**Tier:** Pattern

**Compare:** net vs paceTarget. Gap is small (between paceTarget + 50 and paceTarget + 250) but consistent.

**Structure:** 5 of last 7 qualifying days with net in the small-gap band.

**Qualifying band:** net > paceTarget + 50 AND net < paceTarget + 250.

**Goal behavior:** LOSE only. On MAINTAIN or GAIN, a small gap is not meaningful enough to flag.

**Mindful behavior:** Suppressed by default. Allowed with Growth Areas ON -- but copy strips the calorie specifics entirely. Focuses on logging behavior only.

**Copy direction:** "You're consistently just a little short of your deficit goal. The most common culprits are liquid calories, cooking oils, sauces, and bites that don't make it into the log."

---

### 3.4 Cheat Meal Acknowledgment (corrective/positive hybrid)

**Rule ID:** cal_outlier_week

**What it detects:** One high outlier net day in an otherwise strong week. Acknowledges the outlier while reinforcing the good pattern.

**Tier:** Insight

**Structure:**
- 1 day in the last 7 has net > paceTarget + 900 (outlier threshold)
- The remaining 6 qualifying days average net <= paceTarget + 100 (otherwise on track)
- 80% logging completeness on the non-outlier days

**Goal behavior:** LOSE and MAINTAIN. Not meaningful for GAIN (surplus is the goal).

**Mindful behavior:** Allowed by default -- this is positive framing. Copy does not mention specific calories.

**Copy direction:** "One higher day this week, but your overall pattern was solid. One meal doesn't make or break progress."

---

### 3.5 Protein Gap -- Under Goal (corrective)

**Rule ID:** protein_under

**LOCKED thresholds from SPEC_smart_tips.md Section 5.3:**
- Pattern tier: below 70% of protein goal on 4 or more of the last 7 days
- Urgent tier: below 50% of protein goal on 4 or more of the last 7 days

**Protein goal source:** ratio-based against calTarget. proteinGoalG = round((macroProteinPct / 100) * calTarget / 4). If macroMode is 'fixed': use macroProteinG directly.

**Goal behavior:**
- LOSE: Urgent fires more readily -- low protein on a cut = muscle loss risk.
- MAINTAIN: Pattern fires normally.
- GAIN: Urgent fires readily -- low protein on a bulk defeats the purpose.

**Mindful behavior:** Suppressed by default. Allowed with Growth Areas ON. Copy never references muscle loss or body composition -- framed as energy and recovery.

**Copy direction (Discipline/Balanced):**
- Pattern: "Protein has been below target most days this week."
- Urgent: "Protein has been well below target for several days running -- worth prioritizing."

**Copy direction (Mindful, growth areas ON):**
- "We noticed protein has been on the lower side this week. It plays a big role in how you feel and recover."

---

### 3.6 Protein Consistently High (positive)

**Rule ID:** protein_high

**LOCKED thresholds from SPEC_smart_tips.md Section 5.3:**
- Positive Insight: above 110% of protein goal on 5 or more of the last 7 days

**Tier:** Insight

**Goal behavior:** All goals -- positive framing regardless.

**Mindful behavior:** Allowed by default (positive tip).

**Copy direction:** "Protein has been consistently strong this week -- that kind of consistency adds up."

---

### 3.7 Water Gap -- Under Goal (corrective)

**Rule ID:** water_under

**What it detects:** User is consistently not hitting their water goal.

**Compare:** waterLogged (oz) vs waterGoal (pj_profile.waterGoal).

**Thresholds:**

| Tier | Threshold | Fire condition |
|------|-----------|---------------|
| Pattern | waterLogged < 70% of waterGoal | 5 of last 7 logged days |
| Urgent | waterLogged < 50% of waterGoal | 3 of last 5 logged days |

**Goal behavior:** Goal-neutral. Water hydration is not goal-type dependent.

**Mindful behavior:** Suppressed by default. Allowed with Growth Areas ON. Copy is warm and observational.

**Copy direction (Discipline/Balanced):**
- Pattern: "Water has been well below goal most days this week."
- Urgent: "Hydration has been pretty low -- worth making a priority."

**Copy direction (Mindful, growth areas ON):**
- "Staying hydrated makes such a difference in how you feel. We noticed it's been on the lower side lately."

---

### 3.8 Water Consistently On Track (positive)

**Rule ID:** water_high

**Tier:** Insight

**Threshold:** waterLogged >= 100% of waterGoal on 6 of the last 7 logged days.

**Goal behavior:** Goal-neutral.

**Mindful behavior:** Allowed by default (positive).

**Copy direction:** "Water goal hit nearly every day this week -- that consistency matters more than most people realize."

---

### 3.9 Fiber Consistently Low (corrective)

**Rule ID:** fiber_low

**What it detects:** User is regularly logging very low fiber, suggesting a diet heavy in processed foods.

**Extended nutrition gate:** At least 60% of logged entries in the 7-day window must have fiber data. If not, rule does not fire.

**Compare:** daily total fiber (g) vs FDA recommended 25g (female) or 38g (male). Gender pulled from pj_profile.sex.

**Thresholds:**

| Tier | Threshold | Fire condition |
|------|-----------|---------------|
| Pattern | daily fiber < 40% of recommended | 5 of last 7 data-complete days |

**Goal behavior:** Goal-neutral. Fiber is a food quality signal, not goal-type dependent.

**Mindful behavior:** Suppressed by default. Allowed with Growth Areas ON.

**Copy direction:** "Fiber has been on the lower side most days this week. It tends to track with food quality and plays a big role in how full you feel."

---

### 3.10 Sodium Consistently High (corrective)

**Rule ID:** sodium_high

**Extended nutrition gate:** At least 60% of logged entries in the 7-day window must have sodium data.

**Compare:** daily total sodium (mg) vs FDA recommended 2300mg.

**Thresholds:**

| Tier | Threshold | Fire condition |
|------|-----------|---------------|
| Pattern | daily sodium > 150% of recommended (>3450mg) | 5 of last 7 data-complete days |
| Urgent | daily sodium > 200% of recommended (>4600mg) | 3 of last 5 data-complete days |

**Goal behavior:** Goal-neutral for the corrective direction.

**Mindful behavior:** Suppressed by default. Allowed with Growth Areas ON. Copy never mentions weight or water retention -- frames around how sodium makes you feel.

**Copy direction (Discipline/Balanced):**
- Pattern: "Sodium has been running high most days this week -- worth keeping an eye on."
- Urgent: "Sodium has been very high for several days. That level can affect energy and how you feel day to day."

**Copy direction (Mindful, growth areas ON):**
- "We noticed sodium has been on the higher side. It can affect how rested and energized you feel."

---

### 3.11 Sugar Consistently High (corrective)

**Rule ID:** sugar_high

**Extended nutrition gate:** At least 60% of logged entries in the 7-day window must have sugar data.

**Compare:** daily total sugar (g) vs FDA recommended added sugar limit of 50g.

**Thresholds:**

| Tier | Threshold | Fire condition |
|------|-----------|---------------|
| Pattern | daily sugar > 150% of recommended (>75g) | 5 of last 7 data-complete days |

**Goal behavior:**
- LOSE: fires. High sugar on a cut often crowds out protein and creates hunger spikes.
- MAINTAIN: fires.
- GAIN: suppressed. On a bulk, sugar is less of a concern.

**Mindful behavior:** Suppressed by default. Allowed with Growth Areas ON. Copy frames around energy and cravings, not weight.

**Copy direction:** "Sugar has been running high most days. It can make hunger harder to manage and energy less consistent."

---

### 3.12 Calorie Goal Consistently Hit (positive)

**Rule ID:** cal_goal_hit

**Tier:** Insight

**Threshold:** evaluateCalorieGoalHit returns hit: true on 6 of the last 7 logged days.

**Goal behavior:** All goals -- positive framing regardless.

**Mindful behavior:** Allowed by default (positive). Copy does not reference specific calorie numbers.

**Copy direction:** "You've been hitting your goal almost every day this week -- that kind of consistency is what drives results."

---

## 4. SLEEP RULES

### 4.1 Sleep Score Consistently Low (corrective)

**Rule ID:** sleep_score_low

**What it detects:** User's sleep quality has been poor over multiple nights.

**Compare:** raw sleep score (0-100) from pj_YYYY-MM-DD.

**Thresholds:**

| Tier | Threshold | Fire condition |
|------|-----------|---------------|
| Pattern | sleep score < 65 | 5 of last 7 nights with sleep data |
| Urgent | sleep score < 50 | 3 of last 5 nights with sleep data |

**A night "has sleep data" if:** sleepHours > 0 OR sleepOverride > 0.

**Goal behavior:** Goal-neutral. Sleep quality is not goal-type dependent.

**Mindful behavior:** Suppressed by default. Allowed with Growth Areas ON. Copy is warm and never alarming. Never references score numbers in Mindful copy.

**Copy direction (Discipline/Balanced):**
- Pattern: "Sleep scores have been lower than usual this week -- worth paying attention to."
- Urgent: "Sleep quality has been pretty poor for several nights running."

**Copy direction (Mindful, growth areas ON):**
- "Sleep hasn't been great lately. Even small changes to your bedtime routine can make a real difference in how you feel."

---

### 4.2 Sleep Duration Consistently Short (corrective)

**Rule ID:** sleep_duration_short

**What it detects:** User is consistently getting less sleep than their goal.

**Compare:** (sleepOverride ?? sleepHours) vs sleepGoal (pj_profile.sleepGoal, default 7).

**Thresholds:**

| Tier | Threshold | Fire condition |
|------|-----------|---------------|
| Pattern | sleep < 80% of sleepGoal | 5 of last 7 nights |
| Urgent | sleep < 65% of sleepGoal | 3 of last 5 nights |

**Example (7hr goal):** Pattern fires if averaging under 5h36m. Urgent if under 4h33m.

**Goal behavior:** Goal-neutral.

**Mindful behavior:** Suppressed by default. Allowed with Growth Areas ON. Copy never references specific hours in Mindful.

**Copy direction (Discipline/Balanced):**
- Pattern: "You've been getting less sleep than your goal most nights this week."
- Urgent: "Sleep has been significantly short for several nights -- that kind of shortfall adds up fast."

**Copy direction (Mindful, growth areas ON):**
- "Rest has been on the shorter side lately. Your body does its best recovery work while you sleep."

---

### 4.3 Bedtime Inconsistency (corrective)

**Rule ID:** sleep_bedtime_inconsistent

**What it detects:** User's bedtime varies significantly night to night, disrupting sleep quality even when total hours are adequate.

**Data required:** sleepBedTime stored on pj_YYYY-MM-DD for at least 5 of the last 7 nights.

**Compare:** Standard deviation of bedtime (in minutes from midnight) across the window.

**Threshold:** Standard deviation > 60 minutes on 5+ nights with bedtime data.

**Tier:** Pattern

**Goal behavior:** Goal-neutral.

**Mindful behavior:** Suppressed by default. Allowed with Growth Areas ON.

**Copy direction:** "Your bedtime has been pretty inconsistent this week -- varying by an hour or more night to night. A consistent bedtime often matters more than total hours."

---

### 4.4 Sleep Score Consistently Strong (positive)

**Rule ID:** sleep_score_high

**Tier:** Insight

**Threshold:** sleep score >= 85 on 5 of the last 7 nights with sleep data.

**Goal behavior:** Goal-neutral.

**Mindful behavior:** Allowed by default (positive).

**Copy direction:** "Sleep has been excellent this week -- consistently strong scores across most nights. That kind of recovery makes everything else easier."

---

### 4.5 Low Deep Sleep (corrective)

**Rule ID:** sleep_deep_low

**What it detects:** User's deep sleep percentage is consistently below the optimal range, even when total sleep score is acceptable.

**Data required:** sleepStages with deep sleep data on at least 5 of the last 7 nights. Only fires for Path 1 HealthKit users (stages available).

**Compare:** deep sleep % vs 15% floor (target is ~20%, floor is 15%).

**Threshold:** deep sleep % < 15% on 5 of last 7 nights with stage data.

**Tier:** Pattern

**Goal behavior:** Goal-neutral.

**Mindful behavior:** Suppressed by default. Allowed with Growth Areas ON.

**Copy direction:** "Deep sleep has been lower than ideal most nights. Alcohol, heavy meals close to bedtime, and screen time are common causes."

---

## 5. ACTIVITY RULES

### 5.1 Active Calories Consistently Low (corrective)

**Rule ID:** active_low

**What it detects:** User's daily burn has been well below their active calorie goal.

**Compare:** (activeCalories || caloriesBurned) * burnAccuracyPct / 100 vs activeCalGoal (pj_profile.activeCalGoal, default 500).

**Thresholds:**

| Tier | Threshold | Fire condition |
|------|-----------|---------------|
| Pattern | adjustedActive < 60% of activeCalGoal | 5 of last 7 days |
| Urgent | adjustedActive < 40% of activeCalGoal | 3 of last 5 days |

**Goal behavior:**
- LOSE: Urgent fires more readily -- low burn on a cut means the deficit is narrower than the user realizes.
- MAINTAIN: Pattern fires normally.
- GAIN: Suppressed -- low activity on a bulk is not necessarily a problem.

**Mindful behavior:** Suppressed by default. Allowed with Growth Areas ON. Copy frames around energy and movement, not calorie burning.

**Copy direction (Discipline/Balanced):**
- Pattern: "Active calorie burn has been below your goal most days this week."
- Urgent: "Burn has been significantly below goal for several days -- worth finding ways to move more."

**Copy direction (Mindful, growth areas ON):**
- "Movement has been lighter than usual lately. Even short walks can make a big difference in how you feel."

---

### 5.2 Consecutive Low Activity Days (corrective)

**Rule ID:** activity_streak_low

**What it detects:** User has had 4 or more consecutive days with very low activity -- the signal explicitly called out in SPEC_day_score_and_summary.md as a Smart Tips trigger (does NOT affect Day Score).

**Compare:** 4+ consecutive days where adjustedActive < 30% of activeCalGoal AND no workout logged.

**Tier:** Pattern (escalates to Urgent if 6+ consecutive days).

**Goal behavior:**
- LOSE: fires. Consecutive inactive days erode the deficit.
- MAINTAIN: fires.
- GAIN: suppressed (rest days are often intentional on a bulk).

**Mindful behavior:** Suppressed by default. Allowed with Growth Areas ON. No numbers in Mindful copy.

**Copy direction:** "You've had {days} quiet days in a row. Even a short walk resets the pattern."

---

### 5.3 Step Goal Consistently Missed (corrective)

**Rule ID:** steps_low

**What it detects:** User is consistently not hitting their step goal.

**Compare:** steps vs stepGoal (pj_profile.stepGoal, default 10000).

**Thresholds:**

| Tier | Threshold | Fire condition |
|------|-----------|---------------|
| Pattern | steps < 60% of stepGoal | 5 of last 7 days |

**Goal behavior:** Goal-neutral for the corrective direction.

**Mindful behavior:** Suppressed by default. Allowed with Growth Areas ON.

**Copy direction:** "Steps have been below goal most days this week. Small habit changes -- parking further away, taking the stairs -- add up fast."

---

### 5.4 Active Calorie Goal Consistently Hit (positive)

**Rule ID:** active_high

**Tier:** Insight

**Threshold:** adjustedActive >= activeCalGoal on 6 of last 7 days.

**Goal behavior:** All goals -- positive framing regardless.

**Mindful behavior:** Allowed by default (positive). Copy frames around movement, not burning calories.

**Copy direction:** "Active calorie goal hit almost every day this week -- that consistency is exactly what drives long-term change."

---

### 5.5 Step Goal Consistently Hit (positive)

**Rule ID:** steps_high

**Tier:** Insight

**Threshold:** steps >= stepGoal on 6 of last 7 days.

**Goal behavior:** Goal-neutral.

**Mindful behavior:** Allowed by default (positive).

**Copy direction:** "Step goal hit nearly every day this week -- your daily movement habits are in a really strong place."

---

### 5.6 Workout Completion Consistently Low (corrective)

**Rule ID:** workout_low

**What it detects:** User is regularly not completing their scheduled workouts.

**Data required:** Day must be a lift or cardio day (not rest or unassigned) in weeklyTemplate.

**Compare:** completedCount / totalCount per scheduled workout day.

**Threshold:** completion rate < 60% on 4 of the last 6 scheduled workout days.

**Tier:** Pattern

**Goal behavior:**
- LOSE: fires.
- MAINTAIN: fires.
- GAIN: fires -- incomplete workouts on a bulk means potential muscle stimulus missed.

**Mindful behavior:** Suppressed by default. Allowed with Growth Areas ON. Copy frames around consistency, not failure.

**Copy direction:** "Workouts have been less complete than usual lately -- finishing what's on the plan is where the real adaptation happens."

---

## 6. INTERMITTENT FASTING RULES

### 6.1 IF Window Consistency Low (corrective)

**Rule ID:** if_inconsistent

**What it detects:** User has IF enabled but frequently breaks the window early or skips starting it.

**Data required:** IF fields present on pj_YYYY-MM-DD -- ifStart, ifEnd, ifMethod. Rule only fires if user has IF active in settings.

**What "broke the window" means:** ifEnd - ifStart < (ifMethod target hours - 1hr). A 16:8 user closing at 14hrs counts as a break.

**Threshold:** Window broken or not started on 4 of the last 7 days with IF enabled.

**Tier:** Pattern

**Goal behavior:** Goal-neutral. IF consistency is a behavioral signal regardless of weight goal.

**Mindful behavior:** Suppressed by default. Allowed with Growth Areas ON.

**Copy direction:** "Your fasting window has been inconsistent this week -- the consistency is where the benefit comes from, more than any single day."

---

### 6.2 IF Window Consistently Closed Late (corrective)

**Rule ID:** if_late_close

**What it detects:** User consistently closes their eating window later than their IF schedule intends, suggesting evening eating is a recurring issue.

**Data required:** ifStart, ifEnd, ifMethod on pj_YYYY-MM-DD.

**Compare:** Actual window duration vs IF method target. Late close = window extended more than 1.5hrs beyond target.

**Threshold:** Window closed 1.5+ hours late on 5 of the last 7 IF days.

**Tier:** Pattern

**Goal behavior:**
- LOSE: fires -- late-window eating often coincides with higher-calorie choices.
- MAINTAIN: fires.
- GAIN: suppressed -- window flexibility on a bulk is fine.

**Mindful behavior:** Suppressed by default. Allowed with Growth Areas ON. No clock times in Mindful copy.

**Copy direction:** "Your eating window has been running longer than intended most days this week -- evening snacking tends to be where extra calories sneak in."

---

### 6.3 IF Window Consistently Hit (positive)

**Rule ID:** if_consistent

**Tier:** Insight

**Threshold:** Window hit within 30 minutes of target on 6 of the last 7 IF days.

**Goal behavior:** Goal-neutral -- positive framing regardless.

**Mindful behavior:** Allowed by default (positive).

**Copy direction:** "Fasting window has been incredibly consistent this week -- that discipline is where the real benefit compounds."

---

## 7. WEIGHT TREND RULES

### 7.1 Weight Plateau Detection (corrective)

**Rule ID:** weight_plateau

**What it detects:** User on a LOSE goal has had no meaningful weight change over a multi-week window despite consistent logging.

**Data required:** At least 5 weigh-in days in the last 14 days.

**Compare:** Difference between the 3-day average of the first 5 days of the window vs the 3-day average of the last 5 days.

**Threshold:** Weight change < 0.5 lbs over a 14-day window with >= 5 weigh-ins.

**Tier:** Urgent (a plateau on a LOSE goal deserves attention).

**Goal behavior:**
- LOSE: Urgent. Plateau is actively working against the goal.
- MAINTAIN: Suppressed -- flat weight IS the goal.
- GAIN: fires as corrective (no gain on a bulk is a problem).

**Mindful behavior:** Suppressed by default. Allowed with Growth Areas ON. Copy never mentions the scale number or specific weight -- focuses on patterns.

**Copy direction (Discipline/Balanced LOSE):**
- "Weight has been flat for about two weeks. That usually means something in the pattern -- calories, logging consistency, or burn accuracy -- needs a closer look."

**Copy direction (Mindful, growth areas ON):**
- "Things have felt pretty steady lately. Sometimes the body needs a little shift in routine -- not a big one, just a small change."

---

### 7.2 Weight Trending Wrong Direction (corrective)

**Rule ID:** weight_wrong_direction

**What it detects:** User's weight is trending in the opposite direction from their goal.

**Data required:** At least 4 weigh-in days in the last 10 days.

**Compare:** Linear trend of weight over the window vs goal direction.

**Threshold:** Weight trending up by 0.5+ lbs/week on a LOSE goal OR trending down by 0.5+ lbs/week on a GAIN goal.

**Tier:** Pattern

**Goal behavior:**
- LOSE: fires (gaining while trying to cut).
- MAINTAIN: suppressed (small fluctuations are normal on maintain).
- GAIN: fires (losing while trying to bulk).

**Mindful behavior:** Suppressed by default. Allowed with Growth Areas ON. Copy never mentions specific numbers or direction of weight change.

**Copy direction (Discipline/Balanced LOSE):**
- "Weight has been trending up this week while you're trying to cut -- worth looking at the net calorie picture."

**Copy direction (Discipline/Balanced GAIN):**
- "Weight has been drifting down while you're trying to build -- you may need to push intake higher."

---

### 7.3 Weight Trending in Right Direction (positive)

**Rule ID:** weight_on_track

**Tier:** Insight

**Data required:** At least 4 weigh-in days in the last 10 days.

**Threshold:** Weight trending in the goal direction at a rate >= 50% of the pace target rate over 10 days.

**Goal behavior:**
- LOSE: fires when losing weight at meaningful pace.
- MAINTAIN: fires when weight is stable within 0.5 lbs over 10 days.
- GAIN: fires when gaining at meaningful pace.

**Mindful behavior:** Allowed by default (positive). Copy never mentions specific numbers or weight values.

**Copy direction (Discipline/Balanced LOSE):**
- "Weight has been trending in the right direction this week -- the pattern is working."

**Copy direction (Mindful):**
- "Things feel like they're moving in a good direction. Keep showing up the same way."

---

### 7.4 Infrequent Weigh-Ins (corrective)

**Rule ID:** weight_infrequent

**What it detects:** User has a weight goal but is not weighing in often enough to track progress.

**Threshold:** Fewer than 3 weigh-in days in the last 14 days, AND weightGoal is set.

**Tier:** Insight

**Goal behavior:** LOSE and GAIN only. MAINTAIN: suppressed (some maintain users don't weigh in by design).

**Mindful behavior:** Suppressed by default -- this tip could be triggering for Mindful users. Never fires in Mindful regardless of growth areas setting.

**Copy direction:** "Only a couple weigh-ins this week -- consistent weigh-ins at the same time of day give a much clearer picture of what's actually happening."

---

## 8. CONSISTENCY RULES

### 8.1 Logging Consistency Low (corrective)

**Rule ID:** log_consistency_low

**What it detects:** User is not logging consistently enough for the app's data to be reliable -- and more importantly, inconsistent logging often correlates with less mindful eating.

**Compare:** Logged days (any food entry) in the last 7 days.

**Threshold:**

| Tier | Threshold | Fire condition |
|------|-----------|---------------|
| Pattern | fewer than 4 logged days in last 7 | fires |
| Urgent | fewer than 2 logged days in last 7 | fires |

**Note:** When below 80% logging completeness, Smart Tips downgrade to Generic automatically (per SPEC_smart_tips.md Section 6.2). This rule fires AS the Generic downgraded tip on low-logging days -- it is the honest acknowledgment of incomplete data.

**Copy standard for downgraded tips (per spec):**
"On the days you've logged this week, {observation}. A few more logged days would give us a sharper picture."

**Goal behavior:** Goal-neutral.

**Mindful behavior:** Allowed in Mindful by default -- this is an observational tip about behavior, not a judgment. Copy is warm and inviting, never shaming.

**Copy direction (Discipline/Balanced):**
- Pattern: "Logging has been pretty sparse this week -- the more complete the picture, the more useful the patterns we can surface."
- Urgent: "Very few logged days this week. The data gets hard to read without consistent entries."

**Copy direction (Mindful):**
- "Logging has been lighter this week -- no worries. Even a partial log helps us understand your patterns better."

---

### 8.2 Weekend Calorie Spike Pattern (corrective)

**Rule ID:** weekend_spike

**What it detects:** User's weekday pattern is solid but weekends consistently spike -- erasing the weekday deficit. A pattern the user would never notice themselves.

**Tier:** Insight (this is the editorial, "how did it know that" observation).

**Data required:** At least 2 full weekends (Sat + Sun) of data in the last 14 days.

**Compare:** Average net calories on Saturday + Sunday vs average net calories Monday-Friday over the same window.

**Threshold:** Weekend average net is 400+ calories higher than weekday average.

**Goal behavior:** LOSE and MAINTAIN. Suppressed for GAIN.

**Mindful behavior:** Suppressed by default. Allowed with Growth Areas ON. No specific numbers in Mindful copy.

**Copy direction (Discipline/Balanced):**
- "Weekdays have been strong, but weekends have been running about {gap} kcal higher on average. That difference tends to offset a lot of the weekday work."

**Copy direction (Mindful, growth areas ON):**
- "There's a pattern where weekdays look different from weekends. That kind of rhythm is really common -- just worth being aware of."

---

### 8.3 Logging Streak Strong (positive)

**Rule ID:** log_streak_strong

**Tier:** Insight

**Threshold:** Food logged on 7 consecutive days including today.

**Goal behavior:** Goal-neutral.

**Mindful behavior:** Allowed by default (positive).

**Copy direction:** "Seven days of logging in a row -- that consistency is exactly what makes the patterns meaningful."

---

## 9. CROSS-SIGNAL RULES (Smart Tips tier)

These rules require cross-referencing two or more data streams. They are the true Smart Tips -- the "how did it know that" moments. All are gated behind the Pro tier (1 free, rest blurred per monetization spec).

### 9.1 Low Protein + Sleep Score Correlation

**Rule ID:** cross_protein_sleep

**What it detects:** User's sleep score drops consistently on nights following low-protein days.

**Data required:** At least 7 days with both food logs and sleep data.

**Algorithm:**
1. For each night in the window, look at prior day's protein intake.
2. Split days into "low protein days" (< 70% of goal) and "adequate protein days" (>= 70%).
3. Compare average sleep score on nights following low-protein days vs adequate-protein days.
4. Threshold: average sleep score on low-protein follow nights is 8+ points lower than adequate-protein follow nights, with at least 3 nights in each bucket.

**Tier:** Insight

**Goal behavior:** Goal-neutral. Sleep quality is not goal-type dependent.

**Mindful behavior:** Allowed by default (observational, not corrective). Copy does not reference specific numbers in Mindful.

**Copy direction (Discipline/Balanced):**
- "Sleep scores average about {delta} points lower on nights after days when protein was below target. There's a real connection between protein intake and sleep quality."

**Copy direction (Mindful):**
- "We noticed sleep tends to be better on days when protein is higher. Interesting pattern worth paying attention to."

---

### 9.2 High Sodium + Scale Spike Correlation

**Rule ID:** cross_sodium_scale

**What it detects:** User's weight spikes on days following high-sodium days -- likely water retention, not fat gain. This prevents unnecessary panic at the scale.

**Data required:** At least 5 days with both sodium data and weigh-ins in the last 14 days.

**Algorithm:**
1. Split days into "high sodium days" (> 3000mg) and "normal sodium days" (<= 3000mg).
2. Compare next-morning weight on high-sodium vs normal-sodium days.
3. Threshold: next-morning weight averages 1.0+ lbs higher after high-sodium days vs normal days, with at least 3 pairs in each bucket.

**Tier:** Insight

**Goal behavior:** LOSE and MAINTAIN. Suppressed for GAIN (weight fluctuation on a bulk is expected).

**Mindful behavior:** Suppressed by default. Allowed with Growth Areas ON -- but copy never mentions specific weight numbers.

**Copy direction (Discipline/Balanced):**
- "Weight tends to read about {delta} lbs higher the morning after high-sodium days. That's water retention, not fat -- the scale is lying to you on those mornings."

**Copy direction (Mindful, growth areas ON):**
- "There's a pattern where the scale reads differently after higher-sodium days. That's just how the body handles salt -- it's not the full picture."

---

### 9.3 High Burn Day + Next Day Overage

**Rule ID:** cross_high_burn_overeating

**What it detects:** User consistently overcorrects after high-burn days -- eating significantly more the following day, often erasing the prior day's deficit.

**Data required:** At least 5 days with active calorie and food data in the last 14 days.

**Algorithm:**
1. Identify "high burn days": adjustedActive > 150% of activeCalGoal.
2. For each high burn day, look at next-day net calories.
3. Compare next-day net after high-burn days vs next-day net after normal days.
4. Threshold: next-day net is 400+ kcal higher after high-burn days vs normal days, with at least 3 high-burn days in the window.

**Tier:** Pattern

**Goal behavior:** LOSE and MAINTAIN. Suppressed for GAIN (eating more after training is appropriate on a bulk).

**Mindful behavior:** Suppressed by default. Allowed with Growth Areas ON. No numbers in Mindful copy.

**Copy direction (Discipline/Balanced):**
- "On days after a big burn, intake tends to run about {delta} kcal higher than usual. The deficit from the hard workout ends up mostly offset. Worth being intentional about it."

**Copy direction (Mindful, growth areas ON):**
- "We noticed that after big movement days, the next day tends to feel hungrier. That's really normal -- just something to be aware of."

---

### 9.4 Sleep + Next Day Calorie Intake Correlation

**Rule ID:** cross_sleep_intake

**What it detects:** User eats significantly more on days following poor sleep nights -- a well-documented pattern the user is unlikely to notice themselves.

**Data required:** At least 7 days with both sleep data and food logs.

**Algorithm:**
1. Split nights into "poor sleep" (score < 65 or hours < 80% of goal) and "good sleep."
2. Compare next-day consumed calories on poor-sleep follow days vs good-sleep follow days.
3. Threshold: consumed is 300+ kcal higher on days following poor sleep vs good sleep, with at least 3 nights in each bucket.

**Tier:** Insight

**Goal behavior:** LOSE and MAINTAIN. Suppressed for GAIN (eating more is the goal on a bulk).

**Mindful behavior:** Allowed by default -- this is a fascinating and validating observation for Mindful users. Copy is warm and non-judgmental. No numbers in Mindful copy.

**Copy direction (Discipline/Balanced):**
- "On days after a rough night, intake runs about {delta} kcal higher than after good sleep. Poor sleep drives hunger -- it's biology, not willpower."

**Copy direction (Mindful):**
- "There's a beautiful pattern here: days after better sleep tend to feel more balanced overall. Sleep is doing more work than most people realize."

---

### 9.5 Workout Completion + Net Calorie Correlation

**Rule ID:** cross_workout_intake

**What it detects:** User eats significantly more on non-workout days vs workout days, running a smaller deficit precisely when they should be in a bigger one.

**Data required:** At least 10 days with workout data and food logs -- enough to have meaningful samples of both day types.

**Algorithm:**
1. Split days into workout days (any exercises logged) vs non-workout days.
2. Compare net calories on workout days vs non-workout days.
3. Threshold: net is 400+ kcal higher (less deficit) on non-workout days vs workout days, with at least 4 days in each bucket.

**Tier:** Pattern

**Goal behavior:** LOSE. Suppressed for MAINTAIN and GAIN.

**Mindful behavior:** Suppressed by default. Allowed with Growth Areas ON.

**Copy direction (Discipline/Balanced):**
- "Net calories tend to run about {delta} kcal higher on non-workout days vs workout days. Rest days often become eating days without realizing it."

---

### 9.6 Steps + Sleep Quality Correlation

**Rule ID:** cross_steps_sleep

**What it detects:** User's sleep score is meaningfully better on days when they hit their step goal vs days when they don't.

**Data required:** At least 7 days with both step data and sleep data.

**Algorithm:**
1. Split days into "step goal days" (steps >= stepGoal) and "low step days" (steps < 60% of stepGoal).
2. Compare sleep score on nights following step goal days vs low-step days.
3. Threshold: sleep score is 8+ points higher after step goal days vs low-step days, with at least 3 nights in each bucket.

**Tier:** Insight

**Goal behavior:** Goal-neutral. This is a positive, actionable observation.

**Mindful behavior:** Allowed by default -- this is a positive and motivating insight for Mindful users.

**Copy direction (Discipline/Balanced):**
- "Sleep scores average {delta} points higher on nights after days you hit your step goal. Movement during the day has a direct impact on sleep quality."

**Copy direction (Mindful):**
- "There's a lovely pattern here: days with more movement tend to be followed by better sleep. Your body knows."

---

### 9.7 Low Fiber + Hunger Pattern (inferred)

**Rule ID:** cross_fiber_calorie

**What it detects:** On low-fiber days, calorie intake runs significantly higher -- suggesting hunger is harder to manage without fiber, leading to more eating. User likely doesn't know why some days feel hungrier than others.

**Data required:** At least 7 days with fiber data and food logs.

**Extended nutrition gate:** At least 60% of logged entries must have fiber data.

**Algorithm:**
1. Split days into "low fiber" (< 15g) and "adequate fiber" (>= 25g).
2. Compare consumed calories on low-fiber vs adequate-fiber days.
3. Threshold: consumed is 300+ kcal higher on low-fiber days vs adequate-fiber days, with at least 3 days in each bucket.

**Tier:** Insight

**Goal behavior:** LOSE and MAINTAIN. Suppressed for GAIN.

**Mindful behavior:** Allowed by default -- this is a fascinating, validating insight. Copy frames around how food makes you feel, not calorie counts.

**Copy direction (Discipline/Balanced):**
- "Intake runs about {delta} kcal higher on days when fiber is low. Fiber is one of the most underrated tools for managing hunger -- it's not just about nutrition."

**Copy direction (Mindful):**
- "Days with more fiber in the diet tend to feel more satisfying overall. It's one of those quiet factors that makes a big difference in how full and energized you feel."

---

## 10. RULE SUMMARY TABLE

| Rule ID | Category | Tier | Goal behavior | Mindful default |
|---------|----------|------|---------------|-----------------|
| cal_under | Nutrition | Pattern / Urgent | Goal-sensitive | Suppressed |
| cal_over | Nutrition | Pattern / Urgent | Goal-sensitive | Suppressed |
| cal_small_gap | Nutrition | Pattern | LOSE only | Suppressed |
| cal_outlier_week | Nutrition | Insight | LOSE / MAINTAIN | Allowed |
| protein_under | Nutrition | Pattern / Urgent | Goal-sensitive | Suppressed |
| protein_high | Nutrition | Insight | All goals | Allowed |
| water_under | Nutrition | Pattern / Urgent | Goal-neutral | Suppressed |
| water_high | Nutrition | Insight | Goal-neutral | Allowed |
| fiber_low | Nutrition | Pattern | Goal-neutral | Suppressed |
| sodium_high | Nutrition | Pattern / Urgent | Goal-neutral | Suppressed |
| sugar_high | Nutrition | Pattern | Goal-sensitive | Suppressed |
| cal_goal_hit | Nutrition | Insight | All goals | Allowed |
| sleep_score_low | Sleep | Pattern / Urgent | Goal-neutral | Suppressed |
| sleep_duration_short | Sleep | Pattern / Urgent | Goal-neutral | Suppressed |
| sleep_bedtime_inconsistent | Sleep | Pattern | Goal-neutral | Suppressed |
| sleep_score_high | Sleep | Insight | Goal-neutral | Allowed |
| sleep_deep_low | Sleep | Pattern | Goal-neutral | Suppressed |
| active_low | Activity | Pattern / Urgent | Goal-sensitive | Suppressed |
| activity_streak_low | Activity | Pattern / Urgent | Goal-sensitive | Suppressed |
| steps_low | Activity | Pattern | Goal-neutral | Suppressed |
| active_high | Activity | Insight | All goals | Allowed |
| steps_high | Activity | Insight | Goal-neutral | Allowed |
| workout_low | Activity | Pattern | All goals | Suppressed |
| if_inconsistent | IF | Pattern | Goal-neutral | Suppressed |
| if_late_close | IF | Pattern | Goal-sensitive | Suppressed |
| if_consistent | IF | Insight | Goal-neutral | Allowed |
| weight_plateau | Weight Trend | Urgent | Goal-sensitive | Suppressed |
| weight_wrong_direction | Weight Trend | Pattern | Goal-sensitive | Suppressed |
| weight_on_track | Weight Trend | Insight | All goals | Allowed |
| weight_infrequent | Weight Trend | Insight | Goal-sensitive | NEVER in Mindful |
| log_consistency_low | Consistency | Pattern / Urgent | Goal-neutral | Allowed (warm) |
| weekend_spike | Consistency | Insight | Goal-sensitive | Suppressed |
| log_streak_strong | Consistency | Insight | Goal-neutral | Allowed |
| cross_protein_sleep | Cross-Signal | Insight | Goal-neutral | Allowed |
| cross_sodium_scale | Cross-Signal | Insight | Goal-sensitive | Suppressed |
| cross_high_burn_overeating | Cross-Signal | Pattern | Goal-sensitive | Suppressed |
| cross_sleep_intake | Cross-Signal | Insight | Goal-sensitive | Allowed |
| cross_workout_intake | Cross-Signal | Pattern | LOSE only | Suppressed |
| cross_steps_sleep | Cross-Signal | Insight | Goal-neutral | Allowed |
| cross_fiber_calorie | Cross-Signal | Insight | Goal-sensitive | Allowed |

---

## 11. COPY VARIANT POOLS

Every rule must have minimum 3 variants per tier per applicable coaching mode. This section defines the full copy pools. Data slots use {variable} notation.

Rules: variants rotate. Never the same variant twice in a row. The engine tracks last-used variant index per rule in pj_smart_tips.cooldowns.

---

### cal_under -- Pattern (Discipline/Balanced, LOSE)

Variant 1: "Net calories have been closer to maintenance than your {paceLabel} goal most days this week. The deficit is smaller than it looks."
Variant 2: "You've been running about {gap} kcal/day short of your deficit target over the last {days} days. Small gap, real impact over time."
Variant 3: "Most days this week have landed above your deficit target. The progress is there -- it just needs a little more push."

### cal_under -- Pattern (Discipline/Balanced, MAINTAIN)

Variant 1: "Net has been running above your maintenance target most days this week."
Variant 2: "You've been in a small surplus on most days lately -- worth a look if maintenance is the goal."
Variant 3: "Intake has been creeping above target this week. Nothing dramatic, but the pattern is consistent."

### cal_under -- Urgent (Discipline/Balanced, GAIN)

Variant 1: "You've been under your intake goal for {days} of the last 5 days. Hard to build when you're consistently under-fueling."
Variant 2: "Intake has been below target most days this week -- that shortfall makes it significantly harder to add mass."
Variant 3: "Most days this week have been under your intake goal. On a bulk, that's the one thing you really can't afford to miss."

### cal_under -- Growth Areas ON (Mindful, any goal)

Variant 1: "We noticed food intake has been on the lighter side this week. Making sure you're eating enough is just as important as what you eat."
Variant 2: "Intake has been a bit lower than your target most days. Your body does its best work when it's well-fueled."
Variant 3: "Things have been a little lighter this week in terms of eating. Worth checking in with yourself -- are you getting what you need?"

---

### cal_over -- Pattern (Discipline/Balanced, LOSE)

Variant 1: "Net has been above your deficit target most days this week -- closer to maintenance than a cut."
Variant 2: "Most days this week have landed above your deficit goal. The math on weight loss needs a consistent gap."
Variant 3: "You've been running a smaller deficit than intended on most days this week. Worth tightening up."

### cal_over -- Pattern (Discipline/Balanced, MAINTAIN)

Variant 1: "You've been in a consistent surplus this week while trying to maintain. Worth pulling things back a touch."
Variant 2: "Net has been above your maintenance target most days -- a small but consistent surplus."
Variant 3: "Most days this week have run above target. Not by a lot, but consistently."

---

### cal_small_gap -- Pattern (Discipline/Balanced, LOSE)

Variant 1: "You've been consistently just a little short of your deficit goal -- about {gap} kcal/day on average. The most common culprits are liquid calories, cooking oils, sauces, and bites that don't make it into the log."
Variant 2: "The deficit has been close but not quite there most days. Small unlogged things add up fast: coffee drinks, tastes while cooking, condiments."
Variant 3: "Most days this week have been just slightly above your target -- a really small gap, but consistent. Liquid calories and unlogged bites are usually where it hides."

---

### cal_outlier_week -- Insight (all goals)

Variant 1: "One higher day this week, but {days} days were right on track. One meal doesn't make or break progress -- the pattern is what matters."
Variant 2: "The week overall was solid with one outlier day. That's normal. What you do consistently is what counts."
Variant 3: "Strong week overall with one day that ran high. One data point doesn't define a pattern."

---

### protein_under -- Pattern (Discipline/Balanced)

Variant 1: "Protein has been below your {goal}g target on {days} of the last 7 days."
Variant 2: "Most days this week came in under your protein goal. At a deficit, that gap matters more than people realize."
Variant 3: "Protein has been consistently below target this week. It's one of those things that compounds quietly."

### protein_under -- Urgent (Discipline/Balanced)

Variant 1: "Protein has been significantly below your {goal}g goal for {days} of the last 5 days. At a deficit with low protein, fat loss and muscle loss start to look the same."
Variant 2: "Well under your protein target for most of the last week. That level of shortfall makes it hard to hold onto muscle while cutting."
Variant 3: "Protein has been very low for several days running. This is the one macro that really can't slide on a cut."

### protein_under -- Growth Areas ON (Mindful)

Variant 1: "Protein has been on the lower side this week. It plays a bigger role than most people realize in how you feel and recover day to day."
Variant 2: "We noticed protein intake has been lighter this week. It's one of those quiet things that affects energy and how satisfied you feel after eating."
Variant 3: "Protein has been below where it could be most days. It's worth thinking about -- not for numbers, just for how you feel."

---

### protein_high -- Insight (all modes)

Variant 1: "Protein has been consistently strong this week -- above goal on {days} of the last 7 days. That kind of consistency adds up."
Variant 2: "Solid protein intake across most of the week. One of the best things you can do for your body regardless of your goal."
Variant 3: "Protein above target most days this week. That's exactly the pattern that supports recovery and keeps hunger in check."

---

### water_under -- Pattern (Discipline/Balanced)

Variant 1: "Water intake has been below your {goal}oz goal on most days this week."
Variant 2: "Hydration has been well below target most days -- easy one to let slide but it affects everything."
Variant 3: "Water has been consistently short this week. Even a little dehydration makes a surprising difference in energy and hunger."

### water_under -- Urgent (Discipline/Balanced)

Variant 1: "Water has been very low for several days -- well under half your goal on most days. Dehydration at this level affects focus, energy, and appetite."
Variant 2: "Hydration has been significantly short for most of the last week. Worth making it a priority."
Variant 3: "Water intake has been really low for several days running. The body needs consistent hydration to function well."

### water_under -- Growth Areas ON (Mindful)

Variant 1: "Staying hydrated makes such a difference in how you feel. We noticed it's been on the lower side lately -- small sips throughout the day add up."
Variant 2: "Water has been lighter this week. Hydration affects energy, mood, and hunger more than most people realize."
Variant 3: "We noticed hydration has been below where it could be. Even small increases throughout the day can make a real difference in how you feel."

---

### water_high -- Insight (all modes)

Variant 1: "Water goal hit on {days} of the last 7 days -- that consistency is doing more for you than you probably realize."
Variant 2: "Hydration has been excellent this week. Consistently hitting your water goal is one of the highest-leverage habits you can build."
Variant 3: "Nearly perfect hydration this week. That consistency shows up in energy, focus, and recovery."

---

### fiber_low -- Pattern (Discipline/Balanced)

Variant 1: "Fiber has been well below the recommended {goal}g on most days this week. Low fiber tends to go hand in hand with a more processed diet."
Variant 2: "Fiber intake has been consistently low this week. It plays a bigger role in hunger management and food quality than most people give it credit for."
Variant 3: "Fiber has been running low most days. Worth looking at where it comes in -- or doesn't."

### fiber_low -- Growth Areas ON (Mindful)

Variant 1: "Fiber has been on the lower side this week. Foods high in fiber tend to be the ones that keep you feeling satisfied longer."
Variant 2: "We noticed fiber has been lighter this week. It's one of those quiet factors that affects how full and energized you feel."
Variant 3: "Fiber intake has been low most days. It tends to track with how processed the diet is -- something to pay attention to."

---

### sodium_high -- Pattern (Discipline/Balanced)

Variant 1: "Sodium has been running high on most days this week -- above {threshold}mg on {days} of the last 7 days."
Variant 2: "Consistently high sodium this week. At these levels it can affect how you feel day to day, especially energy and bloating."
Variant 3: "Sodium has been well above recommended most days. Worth looking at where it's coming from -- it hides in a lot of unexpected places."

### sodium_high -- Urgent (Discipline/Balanced)

Variant 1: "Sodium has been very high for most of the last week -- significantly above recommended levels. That level of intake affects blood pressure, energy, and how the body handles water."
Variant 2: "Several days of very high sodium in a row. At this level it's worth paying attention to where it's coming from."
Variant 3: "Sodium has been running very high for {days} days. The kinds of foods that carry that much sodium tend to be the ones that crowd out everything else."

### sodium_high -- Growth Areas ON (Mindful)

Variant 1: "Sodium has been on the higher side this week. High sodium can affect how rested and energized you feel -- worth being aware of."
Variant 2: "We noticed sodium has been elevated lately. It can affect how your body feels in ways that aren't always obvious."
Variant 3: "Sodium intake has been a bit high this week. It's one of those things that quietly affects energy levels and how you feel overall."

---

### sugar_high -- Pattern (Discipline/Balanced)

Variant 1: "Sugar has been running high on most days this week. At these levels it can make hunger harder to manage and energy less consistent."
Variant 2: "Consistently high sugar intake this week. Blood sugar spikes and crashes are the main way this shows up in how you feel day to day."
Variant 3: "Sugar has been above recommended most days. Worth looking at where it's coming from -- drinks and sauces are often the hidden source."

### sugar_high -- Growth Areas ON (Mindful)

Variant 1: "Sugar has been a bit high this week. It can affect how steady your energy feels throughout the day."
Variant 2: "We noticed sugar intake has been elevated. High sugar days sometimes make hunger feel harder to manage."
Variant 3: "Sugar has been running high most days. Energy tends to feel less consistent when sugar is elevated -- just something to be aware of."

---

### cal_goal_hit -- Insight (all modes)

Variant 1: "Calorie goal hit {days} of the last 7 days. That kind of consistency is exactly what produces results over time."
Variant 2: "Nearly perfect on your calorie goal this week. Building this as a daily habit is more valuable than any single perfect day."
Variant 3: "You've been hitting your goal almost every day this week. Consistency like this is where the real change happens."

### cal_goal_hit -- Insight (Mindful)

Variant 1: "You've been showing up for yourself this week -- consistently staying close to your goal. That takes real intention."
Variant 2: "Most days this week you've been right on track. That kind of steady effort is worth acknowledging."
Variant 3: "Seven days of staying close to your goal. That's not luck -- that's a habit forming."

---

### sleep_score_low -- Pattern (Discipline/Balanced)

Variant 1: "Sleep scores have averaged {avg} this week -- below the Well Rested threshold for {days} of the last 7 nights."
Variant 2: "Sleep quality has been lower than usual most nights this week. Recovery happens during sleep -- it's worth prioritizing."
Variant 3: "Consistently lower sleep scores this week. Poor sleep affects hunger, energy, and workout performance more than most people expect."

### sleep_score_low -- Urgent (Discipline/Balanced)

Variant 1: "Sleep has been poor for {days} nights in a row -- significantly below a healthy threshold. At this level, recovery, hunger, and performance are all affected."
Variant 2: "Several nights of really low sleep scores. This kind of consistent poor sleep has real downstream effects."
Variant 3: "Sleep quality has been poor for most of the last week. It's worth looking at what might be disrupting it."

### sleep_score_low -- Growth Areas ON (Mindful)

Variant 1: "Sleep hasn't been great lately. Rest is where your body does its best work -- even small changes to your routine before bed can make a difference."
Variant 2: "We noticed sleep has been a little rough this week. Your body is telling you something -- it might be worth listening."
Variant 3: "Sleep has been lighter on quality lately. Rest matters so much for how you feel. Even a small improvement in your bedtime routine can shift things."

---

### sleep_duration_short -- Pattern (Discipline/Balanced)

Variant 1: "You've been getting about {avg} hours of sleep most nights -- below your {goal}h goal on {days} of the last 7 nights."
Variant 2: "Sleep has been consistently short this week. Chronic mild sleep debt builds up faster than most people realize."
Variant 3: "Most nights this week have come in under your sleep goal. Recovery and appetite regulation both take a hit when sleep is consistently short."

### sleep_duration_short -- Urgent (Discipline/Balanced)

Variant 1: "Sleep has been significantly short for {days} of the last 5 nights. At {avg} hours average, recovery is being seriously compromised."
Variant 2: "Several nights of significantly short sleep in a row. That level of shortfall compounds quickly in terms of how you feel and perform."
Variant 3: "Well under your sleep goal for most of the last week. Consistent sleep debt has real effects on hunger, energy, and muscle recovery."

### sleep_duration_short -- Growth Areas ON (Mindful)

Variant 1: "Rest has been on the shorter side lately. Your body does its best recovery work while you sleep -- even small improvements in sleep time make a real difference."
Variant 2: "Sleep has been a bit shorter than ideal this week. How are you feeling? It's worth finding ways to protect that rest time."
Variant 3: "We noticed sleep has been lighter this week in terms of hours. Rest is one of the most powerful things you can do for yourself."

---

### sleep_bedtime_inconsistent -- Pattern (all modes)

Discipline/Balanced Variant 1: "Your bedtime has been varying by over an hour most nights this week. Inconsistent sleep timing disrupts your body clock even when total hours are adequate."
Discipline/Balanced Variant 2: "Bedtime has been all over the place this week. A consistent bedtime often matters more than total hours for sleep quality."
Discipline/Balanced Variant 3: "Sleep timing has been inconsistent most nights. Your body clock runs on regularity -- the variance is likely affecting sleep quality."

Mindful (growth areas ON) Variant 1: "Sleep timing has been a bit different each night this week. A consistent bedtime is one of the simplest things you can do for sleep quality."
Mindful Variant 2: "We noticed bedtime has varied a lot lately. The body thrives on rhythm -- even a loose consistent window makes a difference."
Mindful Variant 3: "Sleep has been at different times each night. Consistency in when you sleep often matters as much as how long."

---

### sleep_score_high -- Insight (all modes)

Discipline/Balanced Variant 1: "Sleep scores have averaged {avg} this week -- Well Rested on {days} of the last 7 nights. Strong recovery like this compounds over time."
Discipline/Balanced Variant 2: "Consistently excellent sleep this week. Recovery is where adaptation happens -- you're doing this right."
Discipline/Balanced Variant 3: "Sleep has been strong across most of the week. That kind of recovery makes every other part of the app work better."

Mindful Variant 1: "Sleep has been really good this week -- restful nights most of the time. Rest well done."
Mindful Variant 2: "What a good week for sleep. Your body is getting the recovery it needs."
Mindful Variant 3: "Sleep has been excellent this week. You're giving yourself something really valuable."

---

### sleep_deep_low -- Pattern (all modes)

Discipline/Balanced Variant 1: "Deep sleep has been below 15% most nights this week. Alcohol, heavy meals close to bedtime, and screen time are the most common causes."
Discipline/Balanced Variant 2: "Deep sleep percentage has been consistently lower than ideal. It's the most restorative sleep stage -- worth protecting."
Discipline/Balanced Variant 3: "Most nights this week have had lower than ideal deep sleep. The usual culprits: alcohol within 3 hours of bed, eating late, and blue light exposure."

Mindful (growth areas ON) Variant 1: "Deep sleep has been lighter this week. Small changes to your wind-down routine can make a real difference in how rested you feel."
Mindful Variant 2: "We noticed deep sleep has been on the lower side. A calmer evening routine tends to help -- whatever that looks like for you."
Mindful Variant 3: "Sleep has been less restorative this week in terms of deep rest. It might be worth thinking about what your evenings look like before bed."

---

### active_low -- Pattern (Discipline/Balanced)

Variant 1: "Active calorie burn has averaged {avg} kcal this week -- below your {goal} kcal goal on {days} of the last 7 days."
Variant 2: "Burn has been below your active calorie goal most days this week. The gap between your eat and burn numbers is tighter than it looks."
Variant 3: "Active calories have been consistently below goal this week. On a cut, every bit of that gap matters."

### active_low -- Urgent (Discipline/Balanced, LOSE)

Variant 1: "Active burn has been significantly below your goal for {days} of the last 5 days. With low burn and a cut, the deficit is probably much smaller than it appears."
Variant 2: "Burn has been very low for most of the last week. That changes the math on your deficit more than most people realize."
Variant 3: "Several days of very low active burn. On a cut, this means you're probably closer to maintenance than your numbers suggest."

### active_low -- Growth Areas ON (Mindful)

Variant 1: "Movement has been lighter than usual lately. Even short walks can make a big difference in how you feel throughout the day."
Variant 2: "We noticed activity has been lower this week. Any movement is good movement -- it doesn't have to be a full workout."
Variant 3: "Things have been a bit more sedentary this week. How are you feeling? Sometimes the body just needs to move a little."

---

### activity_streak_low -- Pattern (all applicable modes)

Discipline/Balanced Variant 1: "You've had {days} consecutive low-activity days. Even a short walk resets the pattern -- momentum matters."
Discipline/Balanced Variant 2: "{days} days in a row with minimal activity. That kind of extended rest can make it harder to get back into it."
Discipline/Balanced Variant 3: "Low activity for {days} days running. One session, even a short one, breaks the streak."

Mindful (growth areas ON) Variant 1: "Things have been pretty still for {days} days. How are you doing? Even a gentle walk can shift how you feel."
Mindful Variant 2: "We noticed movement has been lighter for a stretch. There's no pressure -- just checking in."
Mindful Variant 3: "A few quiet days in a row. When you feel ready, even a little movement can make a real difference in your energy."

---

### steps_low -- Pattern (Discipline/Balanced)

Variant 1: "Steps have been below your {goal} goal on {days} of the last 7 days. Daily step count is one of the most underrated variables in the whole system."
Variant 2: "Step goal missed most days this week. Small habit changes -- parking further away, taking the stairs -- add up more than a single workout."
Variant 3: "Steps have been consistently below goal this week. NEAT (movement outside of formal exercise) has a big impact on total daily burn."

### steps_low -- Growth Areas ON (Mindful)

Variant 1: "Steps have been lighter this week. Moving throughout the day -- not just in workouts -- makes a real difference in how you feel."
Variant 2: "We noticed steps have been below goal most days. Small bits of movement throughout the day add up in ways that are easy to underestimate."
Variant 3: "Daily steps have been lower this week. Even short walks during the day can shift your energy and mood significantly."

---

### active_high -- Insight (all modes)

Discipline/Balanced Variant 1: "Active calorie goal hit {days} of the last 7 days -- consistently above {goal} kcal. That kind of sustained burn adds up significantly over a week."
Discipline/Balanced Variant 2: "Nearly every day this week has hit the active calorie goal. Strong work -- this is what creates a meaningful gap between eat and burn."
Discipline/Balanced Variant 3: "Active burn above goal almost every day this week. Consistency here compounds in a way that no single workout ever will."

Mindful Variant 1: "You've been moving consistently this week -- hitting your activity goal most days. That's worth celebrating."
Mindful Variant 2: "Activity has been really strong this week. You're showing up for your body in a real way."
Mindful Variant 3: "Most days this week you've been active and moving. That consistency is doing more for you than you probably realize."

---

### steps_high -- Insight (all modes)

Discipline/Balanced Variant 1: "Step goal hit {days} of the last 7 days. Your daily movement habits are in a genuinely strong place."
Discipline/Balanced Variant 2: "Nearly perfect steps this week. Daily movement at this level makes everything else -- sleep, hunger, mood -- work better."
Discipline/Balanced Variant 3: "Consistent step goal achievement all week. This is the kind of habit that silently does a lot of heavy lifting."

Mindful Variant 1: "You've been moving a lot this week -- hitting your step goal most days. That's a beautiful habit."
Mindful Variant 2: "Step goal hit almost every day this week. Your body is getting so much good movement."
Mindful Variant 3: "Really strong week for steps. Moving through your day like this has ripple effects on how you feel in every way."

---

### workout_low -- Pattern (Discipline/Balanced)

Variant 1: "Workout completion has been below 60% on most scheduled days this week. Finishing what's on the plan is where the adaptation actually happens."
Variant 2: "Most scheduled workouts this week were partially completed. The reps you leave in the tank are the ones that matter most."
Variant 3: "Workout sessions have been cut short more often than not this week. Something to look at -- are the sessions too long, too hard, or is something else getting in the way?"

Mindful (growth areas ON) Variant 1: "Workouts have been a bit shorter or less complete than usual this week. That's okay -- just checking in. Is there anything making it harder to show up?"
Mindful Variant 2: "We noticed workouts have been a little less complete lately. How are you feeling? Sometimes the plan needs adjusting."
Mindful Variant 3: "Workouts have been a bit lighter this week. There's no judgment here -- just noticing."

---

### if_inconsistent -- Pattern (Discipline/Balanced)

Variant 1: "Your fasting window has been inconsistent on {days} of the last 7 IF days. The consistency is where the benefit comes from -- more than any single day."
Variant 2: "IF window has been broken or skipped most days this week. A consistent window -- even a shorter one -- is more effective than a perfect window most days."
Variant 3: "Fasting consistency has been lower this week. The regularity of the pattern matters more than the exact hours."

### if_inconsistent -- Growth Areas ON (Mindful)

Variant 1: "The fasting window has been a bit irregular this week. That's okay -- sometimes life gets in the way. The consistency is what matters over time."
Variant 2: "We noticed the fasting window has been less consistent. How is it feeling? Sometimes adjusting the window itself helps more than pushing through."
Variant 3: "IF has been a bit sporadic this week. No pressure -- even a looser consistent window is better than inconsistency."

---

### if_late_close -- Pattern (Discipline/Balanced, LOSE/MAINTAIN)

Variant 1: "The eating window has been running about {avg} hours longer than intended on most days this week. Evening eating tends to be where extra calories sneak in."
Variant 2: "Window has been closing later than planned on {days} of the last 7 IF days. Late-night eating is one of the most consistent patterns in exceeding calorie goals."
Variant 3: "Most days this week the eating window ran significantly longer than the {method} target. Worth looking at what's driving the late extension."

---

### if_consistent -- Insight (all modes)

Discipline/Balanced Variant 1: "Fasting window hit within 30 minutes of target on {days} of the last 7 days. That discipline is where IF actually delivers its benefit."
Discipline/Balanced Variant 2: "Incredibly consistent fasting window this week. This level of adherence is what separates IF as a real tool from a loose concept."
Discipline/Balanced Variant 3: "Window consistency has been excellent this week. The metabolic benefit of IF comes from exactly this kind of regularity."

Mindful Variant 1: "Your fasting rhythm has been really consistent this week. That kind of routine can feel grounding."
Mindful Variant 2: "The fasting window has been steady and consistent all week. Building a rhythm like this is meaningful."
Mindful Variant 3: "Really consistent with the fasting window this week. Routines like this tend to make everything feel more manageable."

---

### weight_plateau -- Urgent (LOSE/GAIN)

LOSE Variant 1: "Weight has been flat for about {days} days despite consistent logging. A plateau usually means one of three things: calories are closer to maintenance than they appear, burn is being overestimated, or logging has some gaps. Worth looking at each one."
LOSE Variant 2: "No meaningful weight change in two weeks. Plateaus almost always have a cause -- the most common are logging gaps, liquid calories, and burn accuracy."
LOSE Variant 3: "Weight has been flat for {days} days while targeting a cut. That usually means the actual deficit is smaller than the numbers suggest."

GAIN Variant 1: "Weight hasn't moved in about {days} days while targeting a gain. On a bulk, a plateau means intake probably needs to go up."
GAIN Variant 2: "Flat weight for {days} days on a gaining goal. The body needs a consistent surplus to build -- intake may need to increase."
GAIN Variant 3: "No weight change over the last two weeks while bulking. Worth checking intake -- the surplus may have closed."

Mindful (growth areas ON) Variant 1: "Things have felt pretty steady on the scale lately. Sometimes the body needs a little shift in routine -- not a big one. Just something small."
Mindful Variant 2: "We noticed things have been stable for a little while. Plateaus are really normal. If you want, we can look at what might be contributing."
Mindful Variant 3: "The body has been in a holding pattern lately. That's so common. Sometimes a small change is all it takes to shift things."

---

### weight_wrong_direction -- Pattern (LOSE)

Variant 1: "Weight has been trending up this week while you're targeting a cut. The net calorie picture is worth a closer look."
Variant 2: "Moving in the wrong direction on the scale this week. Something in the pattern -- logging, burn, or intake -- isn't matching the goal."
Variant 3: "Weight has been climbing while you're trying to cut. That usually means the actual deficit isn't as large as it appears."

### weight_wrong_direction -- Pattern (GAIN)

Variant 1: "Weight has been drifting down this week while you're trying to build. Intake probably needs to go higher."
Variant 2: "Moving in the wrong direction while bulking. The surplus may have closed -- worth pushing intake up."
Variant 3: "Weight trending down on a gaining goal. The body needs a consistent surplus to build -- intake needs to be higher."

---

### weight_on_track -- Insight (LOSE)

Variant 1: "Weight has been trending in the right direction this week -- moving at a pace consistent with your {paceLabel} goal. The pattern is working."
Variant 2: "Solid weight trend this week -- moving toward your goal at a healthy rate. Keep doing what you're doing."
Variant 3: "Weight is moving in the right direction and at a meaningful pace. This is what consistent effort looks like."

### weight_on_track -- Insight (MAINTAIN)

Variant 1: "Weight has been remarkably stable this week -- within a very tight range. That's exactly what maintaining looks like when the pattern is right."
Variant 2: "Extremely consistent weight this week. Maintenance is harder than most people realize -- you're doing it well."
Variant 3: "Weight has barely moved all week while targeting maintenance. Solid execution."

### weight_on_track -- Insight (GAIN)

Variant 1: "Weight has been trending up at a healthy pace this week -- consistent with your gaining goal. The surplus is working."
Variant 2: "Good weight trend this week on a gaining goal. Moving in the right direction at a rate that suggests quality gain."
Variant 3: "Weight is climbing at a solid pace this week. Stay the course."

### weight_on_track -- Insight (Mindful, any goal)

Variant 1: "Things feel like they're moving in a good direction. Keep showing up the same way."
Variant 2: "We noticed things are trending well. Whatever you've been doing is working."
Variant 3: "Progress is happening. You're doing something right."

---

### weight_infrequent -- Insight (LOSE/GAIN)

Variant 1: "Only {count} weigh-ins in the last two weeks. Consistent weigh-ins at the same time of day give a much clearer picture of what's actually happening."
Variant 2: "Sparse weigh-in data this week -- hard to spot a trend with only {count} data points. Daily weigh-ins at the same time dramatically improve the signal."
Variant 3: "Few weigh-ins this week. The trend is hard to read without consistent data. Same time of morning before eating gives the most accurate picture."

---

### log_consistency_low -- Pattern (Discipline/Balanced)

Variant 1: "Only {days} logged days this week. The patterns we can surface are only as good as the data we have to work with."
Variant 2: "Logging has been sparse this week -- {days} out of 7 days. Consistent logging is what makes the insights useful."
Variant 3: "Light logging week -- {days} days with entries. The more complete the picture, the more meaningful what we surface."

### log_consistency_low -- Urgent (Discipline/Balanced)

Variant 1: "Very few logged days this week -- just {days}. Without consistent data, it's hard to know what's actually happening."
Variant 2: "Almost no logging this week. The app can't give you useful patterns without consistent input."
Variant 3: "Only {days} logged days this week. Even partial logs are better than none -- they help us understand the picture."

### log_consistency_low -- (Mindful, any urgency)

Variant 1: "Logging has been lighter this week -- no worries at all. Even a partial log helps us understand your patterns better."
Variant 2: "We noticed fewer logged days this week. Whatever you're able to log is helpful -- there's no pressure to be perfect."
Variant 3: "Logging has been a bit sparse. That's okay. We work with whatever you give us, and every entry adds to the picture."

---

### weekend_spike -- Insight (LOSE/MAINTAIN)

Discipline/Balanced Variant 1: "Weekdays have been on track, but weekends have averaged about {gap} kcal higher. Over a month, that difference offsets a significant portion of the weekday work."
Discipline/Balanced Variant 2: "There's a clear weekday vs weekend pattern in the data. The weekend surplus tends to close the weekday deficit more than most people realize."
Discipline/Balanced Variant 3: "Strong weekdays, higher weekends -- a {gap} kcal average gap. It's one of the most common patterns and one of the hardest to see without the data."

Mindful (growth areas ON) Variant 1: "There's a pattern where weekdays look different from weekends. That kind of rhythm is really common -- just worth being aware of."
Mindful Variant 2: "We noticed things tend to shift between weekdays and weekends. That's incredibly normal. Just something worth holding in mind."
Mindful Variant 3: "Weekday patterns and weekend patterns look a bit different in the data. Super common. Something to gently be aware of."

---

### log_streak_strong -- Insight (all modes)

Discipline/Balanced Variant 1: "Seven consecutive days of logging. That's the kind of consistency that makes every other insight more reliable and actionable."
Discipline/Balanced Variant 2: "A full week of logging -- every day. The data is the most complete it's been. Patterns this clear are rare and valuable."
Discipline/Balanced Variant 3: "Seven days in a row. Logging streaks like this are where the real signal starts to emerge."

Mindful Variant 1: "You've logged every day this week -- seven days in a row. That kind of showing up for yourself matters."
Mindful Variant 2: "A whole week of logging. Not because you have to -- because you chose to. That's real commitment."
Mindful Variant 3: "Seven consecutive logged days. You've been showing up consistently. That's worth acknowledging."

---

### cross_protein_sleep -- Insight

Discipline/Balanced Variant 1: "Sleep scores average {delta} points lower on nights after days when protein is below your goal. Low protein days and poor sleep nights are showing up together more often than chance."
Discipline/Balanced Variant 2: "There's a real pattern in your data: sleep quality drops on nights following low-protein days -- about {delta} points on average. Protein affects sleep in ways most people don't expect."
Discipline/Balanced Variant 3: "Your data shows sleep scores are about {delta} points lower after low-protein days. That's not a coincidence -- protein plays a real role in sleep quality."

Mindful Variant 1: "We noticed sleep tends to be better on days when protein is higher. Interesting pattern worth paying attention to."
Mindful Variant 2: "There's something in your data: higher protein days seem to be followed by better nights. Worth noticing."
Mindful Variant 3: "Sleep quality and protein intake seem to be connected in your data. When protein is higher, rest tends to be better."

---

### cross_sodium_scale -- Insight

Discipline/Balanced Variant 1: "Weight reads about {delta} lbs higher the morning after high-sodium days. That's water retention -- sodium pulls water into your cells. The scale is lying to you on those mornings."
Discipline/Balanced Variant 2: "High sodium days consistently show up before higher scale readings the next morning. It's {delta} lbs on average -- and it's water, not fat. Don't let it derail you."
Discipline/Balanced Variant 3: "There's a {delta} lb average spike on the scale after high-sodium days. Worth knowing: that reading is water retention, not progress lost. It clears in 24-48 hours."

Mindful (growth areas ON) Variant 1: "There's a pattern where the scale reads differently after higher-sodium days. That's just how the body handles salt -- it's not the full picture."
Mindful Variant 2: "We noticed scale readings tend to be higher after saltier days. That's a water thing, not a fat thing. The body is just doing what bodies do."
Mindful Variant 3: "Scale readings and sodium intake seem to be connected in your data. After higher-sodium days, the scale tends to read higher. It's just water fluctuation."

---

### cross_high_burn_overeating -- Pattern

Discipline/Balanced Variant 1: "On days after a big burn, intake tends to run about {delta} kcal higher than usual. The deficit from the hard workout ends up mostly offset by the next day's eating. Worth being intentional about it."
Discipline/Balanced Variant 2: "High-burn days are consistently followed by higher-intake days -- about {delta} kcal higher on average. The body asks for it back. Whether you give it is the question."
Discipline/Balanced Variant 3: "There's a clear pattern: big burn days lead to bigger eating days. {delta} kcal higher on average the day after. Anticipating it makes it easier to manage."

Mindful (growth areas ON) Variant 1: "We noticed that after big movement days, the next day tends to feel hungrier. That's really normal -- just something to be aware of."
Mindful Variant 2: "After active days, there's a pattern of eating a bit more the following day. The body is asking for what it used. That's completely natural."
Mindful Variant 3: "There's something in your data: days after big activity tend to bring bigger hunger. Your body is communicating -- it's worth listening to."

---

### cross_sleep_intake -- Insight

Discipline/Balanced Variant 1: "On days after a rough night, intake runs about {delta} kcal higher than after good sleep. Poor sleep drives hunger -- ghrelin goes up, leptin goes down. It's biology, not willpower."
Discipline/Balanced Variant 2: "There's a {delta} kcal difference in intake between days following poor sleep vs good sleep. You eat more after bad nights. Understanding that pattern is the first step to managing it."
Discipline/Balanced Variant 3: "Your data shows a clear connection: rough nights consistently lead to higher intake the next day -- about {delta} kcal on average. Sleep and eating are more connected than most people realize."

Mindful Variant 1: "There's a beautiful pattern here: days after better sleep tend to feel more balanced overall. Sleep is doing more work than most people realize."
Mindful Variant 2: "We noticed something: after good nights of sleep, days tend to feel more settled -- including around food. Rest really does matter."
Mindful Variant 3: "Sleep and how you eat the next day seem to be connected in your data. Better sleep, more ease. It's worth paying attention to."

---

### cross_workout_intake -- Pattern

Discipline/Balanced Variant 1: "Net calories run about {delta} kcal higher on non-workout days vs workout days. Rest days are quietly becoming eating days. Worth being as intentional on rest days as training days."
Discipline/Balanced Variant 2: "On days without a workout, intake tends to be about {delta} kcal higher. The discipline from training days doesn't always carry over -- and that gap matters on a cut."
Discipline/Balanced Variant 3: "Workout days and rest days are showing very different net calorie numbers -- about {delta} kcal apart. Rest days are where the deficit tends to close."

---

### cross_steps_sleep -- Insight

Discipline/Balanced Variant 1: "Sleep scores average {delta} points higher on nights after days you hit your step goal. Daily movement -- not just formal exercise -- has a real impact on sleep quality."
Discipline/Balanced Variant 2: "There's a {delta} point sleep score difference between high-step days and low-step days. Movement during the day is one of the most underrated sleep interventions."
Discipline/Balanced Variant 3: "Your data shows a clear link: hitting your step goal is followed by better sleep -- about {delta} points better. Move more during the day, sleep better at night."

Mindful Variant 1: "There's a lovely pattern here: days with more movement tend to be followed by better sleep. Your body knows."
Mindful Variant 2: "We noticed something beautiful: step-goal days tend to be followed by better nights. Movement and rest are connected in a real way."
Mindful Variant 3: "Days when you move more seem to lead to better sleep. Your data shows it clearly. Movement during the day is a gift to your nighttime self."

---

### cross_fiber_calorie -- Insight

Discipline/Balanced Variant 1: "Intake runs about {delta} kcal higher on days when fiber is low. Fiber is one of the most underrated tools for hunger management -- it's not just a nutrition metric."
Discipline/Balanced Variant 2: "There's a {delta} kcal difference in intake between high-fiber and low-fiber days. Fiber makes you feel fuller longer -- the data backs it up."
Discipline/Balanced Variant 3: "Low-fiber days consistently lead to higher intake -- about {delta} kcal more. Fiber slows digestion and manages hunger in ways that most people underestimate."

Mindful Variant 1: "Days with more fiber in the diet tend to feel more satisfying overall. It's one of those quiet factors that makes a big difference in how full and energized you feel."
Mindful Variant 2: "We noticed something in your data: higher-fiber days seem to feel more balanced around food. Fiber is doing quiet, important work."
Mindful Variant 3: "There's a pattern: days with more fiber feel more settled around hunger. Your data reflects something nutritionists have known for a long time."

---

## 12. OPEN ITEMS

Items still to be decided before build session starts.

| # | Item | Status |
|---|------|--------|
| 1 | Exact copy for downgraded Generic tips (below 80% logging) -- template locked in spec, specific variants per rule needed | OPEN -- write at build time, pattern established |
| 2 | Rate limiting exact cap for free tier abuse protection | OPEN -- decide before build |
| 3 | Storage key for last-used variant index (tracking rotation) | OPEN -- add to pj_smart_tips shape at build time |
| 4 | Day Summary tip -- same pool or separate pool from EvR? | LOCKED -- different copy variant required per spec Section 6.5 |
| 5 | cross_protein_sleep minimum delta calibration (8 pts) -- may need real-data tuning | OPEN -- starting value, tune after TestFlight |
| 6 | cross_high_burn_overeating (400 kcal threshold) -- tune after real data | OPEN -- starting value |
| 7 | Exact paceLabel display strings for copy slots ({paceLabel}) | OPEN -- define at build time (e.g. "Lose 1.5 lb/week") |
| 8 | All numeric thresholds marked as starting values -- flag for post-launch tuning pass | OPEN -- accept all as starting values, tune after real data |
