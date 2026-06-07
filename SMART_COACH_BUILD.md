# Smart Coach Build State
# Read this file at the start of every session working on this feature.
# Last updated: 2026-06-07

## Status
- [x] Step 1: CoachPacket + computeCoachPacket() in smartTipsEngine.ts -- DONE
- [x] Step 2: coachAI.ts (AI call + cleanup + offline fallback) -- DONE, raw fetch (NOT SDK)
- [x] Step 3: Wire Home tip card (app/(tabs)/index.tsx) -- DONE, has open bug (see below)
- [x] Step 4: Wire Day Summary (app/day-summary.tsx) -- DONE + Coach Insight card standard locked
- [x] Step 5: Wire EvR (app/diagnostic-report-view.tsx) -- DONE, has open bug (see below)
- [x] Step 6: Update public/privacy.html with AI disclosure -- DONE

## OPEN BUGS / NEXT WORK (priority order for next session)

### BUG A: FIXED 2026-06-07
pj_coach_last_rule_home and pj_coach_last_rule_evr are now separate keys. computeCoachPacket computes the surface-specific key at runtime from the surface param.

### BUG B: FIXED 2026-06-07
protein_under pattern threshold changed from 70% to 80% of goal, required days dropped from 5 to 4. Diagnosis builder updated to match. Urgent path unchanged.

### DONE THIS SESSION (2026-06-07):
- [x] Item 6: Dev Tools reset button for pj_coach_tip + all pj_coach_tip_day_* keys (settings.tsx)
- [x] Truncation bug: cleanup pass was splitting on decimal periods (e.g. "1.4" -> "1." end of sentence). Fixed with (?<!\d) lookbehind in sentence detector (coachAI.ts)
- [x] Credit-before-gap tightened: removed "always" mandate, AI must only credit genuinely strong data (coachAI.ts)
- [x] weight_wrong_direction packet: added weighInRate ("X of 14 days") to facts so AI has accurate context
- [x] DASH_PATTERN: replaced literal -- with -{2} to eliminate double-dash in source code (coachAI.ts)
- [x] Scenario rotation: pj_coach_last_rule key added (survives cache resets), selectByPrioritySpine exclusion logic fixed (exclusion now happens before corrective/positive split, not after)
- [x] lbsPerWeek rate bug: both ruleWeightWrongDirection and ruleWeightOnTrack were dividing by weigh-in COUNT instead of actual day SPAN between first and last weigh-in (smartTipsEngine.ts)

### DONE THIS SESSION (continued):
- [x] Swipeable home coach card: faith-card pattern. Horizontal pagingEnabled ScrollView, pages snap natively, dots bottom-right, auto-advances every 22s, pauses on drag resumes 10s after. Chevron button removed. Tap navigates to EvR.
- [x] Home card height tracks content: animated height per page (220ms cubic ease). Re-animates when AI body loads async so "View in EvR" link is never clipped.
- [x] Home card background: restored theme.bgCard + borderColor after paging refactor dropped them.
- [x] EvR coach insight loading state: spinner + "Analyzing your data..." shows immediately while refreshCoachTip is in flight. Swaps to real insight on resolve.
- [x] Protein diagnosis clarity: text now reads "fell short on N of M days, averaging Xg on those days" so users know the number is low-day average, not overall.

### DONE THIS SESSION (continued):
- [x] EvR Level 1 packet: own separate packet per window size (pj_coach_tip_evr_14/30/90), deduped against home card scenario, window-adaptive. Brain always analyzes most recent 14 days regardless of window (actionable coaching is current state). Expandability note: if 30/90-day-specific scenarios are added later (e.g. long-term plateau needing 3 months of weigh-ins), expand loadWindowDays to accept maxDays and pass windowDays into computeCoachPacketEvr.
- [x] Timeframe bug fixed across all 28 diagnosis strings in buildDiagnosisActionFacts: w7 rules now say "Over the last 7 days", w14 rules say "Over the last 14 days". Without this, the AI borrowed the surface window label (14/30/90) as the timeframe even when the brain only analyzed 7 days of data, producing contradictions like "over the last 30 days... 5 of 7 days."

### STILL OPEN:
3. Free vs Pro gating: home all free, EvR/Weekly/Monthly Pro. Blur + chip for free users.
4. Weekly Summary surface: layout not yet specced. Required before coaching placement.
5. Monthly Summary surface: layout not yet specced. Required before coaching placement.
7. Level 2 full build: home slots 2+ (free, eager, 7-day), EvR domain cards (Pro, lazy). Rulebook written and locked in SMART_COACH_SPEC.md.

## Home Card Visual Standard (LOCKED 2026-06-06)
Header row: sparkles icon (size 12, accent) + "COACH INSIGHT" (fontSize 9, letterSpacing 3, accent, DMSans_700Bold, uppercase) + TooltipIcon -- all left side. Chip (INSIGHT/POSITIVE/URGENT) -- right side.
Title: fontSize 15, DMSans_700Bold, textSecondary, lineHeight 21. Inside Animated.View for tip cross-fade.
Body: fontSize 13, DMSans_400Regular, textSecondary, lineHeight 20. Outside Animated.View (avoid native-layer clip).
Footer: "View in Effort vs Results" link left, pagination dots + next chevron right (when multiple tips).
Card bg: bgCard, borderColor: borderCard, borderTopWidth 1.5 in tipBorderColor (tone-coded).

## Coach Insight Card Standard (LOCKED 2026-06-06)
This is the visual standard for ALL AI coaching tip cards app-wide. Use it on every surface.
- backgroundColor: `${accent}12` (7% accent tint)
- borderRadius: 12
- borderWidth: 1, borderColor: `${accent}50`
- padding: 14, alignItems: 'center'
- shadow: shadowOpacity 0.08, shadowRadius 4
- Label row: sparkles icon (size 12, accent color) + "COACH INSIGHT" (fontSize 9, letterSpacing 3, accent color, DMSans_700Bold, uppercase)
- Hairline separator: width 100%, height 0.5, backgroundColor `${accent}40`, marginBottom 10
- Body text: fontSize 14, color theme.textSecondary, DMSans_600SemiBold, italic, centered, lineHeight 22

## Critical Rules (non-negotiable)
- pj_coach_tip AsyncStorage key: ALWAYS read-then-merge, NEVER wholesale overwrite
- pj_coach_tip_day_${dateKey}: per-day Day Summary cache (separate from rolling tip)
- Model: claude-sonnet-4-6 (Justin specified this explicitly)
- API key: EXPO_PUBLIC_ANTHROPIC_API_KEY (env var, personal TestFlight app)
- SDK: raw fetch to api.anthropic.com/v1/messages -- NOT @anthropic-ai/sdk (Metro .mjs incompatibility, SDK removed)
- No streaming: single non-streaming call per tip per day (avoids RN TextDecoder issues)
- No dashes anywhere: not in code comments, not in output
- Family 9 safety override: brain sets the flag, AI never decides suppression
- Mindful suppression: brain enforces before building packet, AI never decides
- Privacy.html updated 2026-06-06 with Anthropic AI coaching disclosure
- 2-attempt max on any bug. Stop and explain if not resolved.

## AsyncStorage Keys
- pj_coach_tip: CoachTipCache for Home + EvR rolling 14-day tip
- pj_coach_tip_day_${YYYY-MM-DD}: CoachTipCache per day, for Day Summary
- pj_smart_tips: existing SmartTipsStore (DO NOT TOUCH)
- All pj_* keys: real irreplaceable user data

## Key Spec References (SMART_COACH_SPEC.md)
- Scenario families overview: lines 74-175
- Family 1 concept depth: lines ~176-300
- RULEBOOK (system prompt): lines 456-606
- Voice examples: lines 607-674
- Surfaces spec: lines 690-710
- Priority spine: confidence gate > Family 9 > Family 1 > Family 3 > Family 2 > Family 6

## CoachPacket Interface
```typescript
export interface CoachPacket {
  scenario: string;          // ruleId mapped to scenario (e.g. "1.1")
  ruleId: string;            // original ruleId from engine
  familyNum: number;         // 1-9 for priority spine
  diagnosis: string;         // what the brain determined (plain English)
  action: string;            // what to suggest (plain English)
  facts: Record<string, string | number>;  // exact numbers for AI to use
  tone: 'positive' | 'corrective' | 'care' | 'educational';
  careSeverity?: 'mild' | 'moderate' | 'strong';
  mode: string;              // 'discipline' | 'balanced' | 'mindful'
  goal: string;              // 'lose' | 'maintain' | 'gain'
  surface: 'home' | 'day_summary' | 'evr';
  windowDays: number;        // 14 | 1 | 30 | 90
  ifActive: boolean;
  previousTip: string;       // last AI tip body or 'none'
  faithTier: string;         // 'rooted' | 'exploring' | 'not_right_now'
  computedDate: string;      // YYYY-MM-DD
  fallbackTitle: string;     // from existing engine (for offline fallback display)
  fallbackBody: string;      // from existing engine (for offline fallback display)
}

export interface CoachTipCache {
  packet: CoachPacket;
  aiBody: string | null;       // AI-generated tip body (null until AI call completes)
  aiGeneratedDate: string | null;  // ISO date of AI generation
  fallbackUsed: boolean;       // true if offline fallback was used
}
```

## Rule to Family Mapping
Family 1 (Effort vs Results - highest corrective priority):
  net_above_pace, net_below_pace, weight_plateau, weight_wrong_direction, weight_on_track

Family 2 (Single gap - fires when rest is strong):
  protein_under, water_under, fiber_low, sodium_high, sugar_high,
  active_low (suppressed Mindful no-growth), steps_low, workout_low

Family 3 (Multi-signal patterns):
  cross_protein_sleep, cross_sodium_scale, cross_high_burn_overeating,
  cross_sleep_intake, cross_workout_intake, cross_steps_sleep, cross_fiber_calorie,
  weekend_spike (suppressed Mindful no-growth), cal_outlier_week

Family 4 (Sleep-driven):
  sleep_score_low, sleep_duration_short, sleep_bedtime_inconsistent, sleep_deep_low

Family 5 (Consistency/data quality):
  log_consistency_low, weight_infrequent, activity_streak_low, cal_small_gap

Family 6 (Positive / crushing it):
  protein_high, water_high, active_high, steps_high, cal_goal_hit,
  log_streak_strong, if_consistent, sleep_score_high

Family 7 (IF):
  if_inconsistent, if_late_close

Family 9 (Safety override - ALWAYS surfaces, overrides everything):
  New logic: dangerous under-eating OR rapid weight loss (>1% bodyweight/week)

## Priority Spine Logic (in computeCoachPacket)
1. Check confidence gate: need >= 4 logged days in window
2. Check Family 9 safety (new logic, runs independently of rules)
3. If Family 9 fires: build packet with tone=care, return immediately
4. Otherwise pick from candidates by family order: 1 > 3 > 2 > 6 > 4 > 5 > 7
5. Within same family: urgent > pattern > insight

## Mindful Suppression in computeCoachPacket
These ruleIds are suppressed when isMindful && !mindfulGrowthAreas:
- active_low (Family 2, scenario 2.6)
- weekend_spike (Family 3, scenario 3.8)
- All negative corrective scenarios except log_consistency_low
(This mirrors existing applyMindfulSuppression but applied to headline selection)

## System Prompt Location
Full rulebook text is in SMART_COACH_SPEC.md lines 456-606.
Voice examples are in SMART_COACH_SPEC.md lines 607-674.
The system prompt function in coachAI.ts reads these at runtime via the constants defined in the file (not by reading the spec file).

## Surface Specs
Home (surface: 'home', windowDays: 14):
  - File: app/(tabs)/index.tsx
  - Currently: loads loadSmartTips(), renders homeTip.title + homeTip.body
  - After: loads loadCoachTipCache(), renders packet.fallbackTitle + aiBody (or fallbackBody)
  - The tip card is case 'smart_tip' in the card registry
  - Slot 1: Level 1, 14-day window, free
  - Slots 2+: Level 2, eager compute alongside Level 1 at app open, free
  - "View in EvR" link: auto-generates 14-day report on tap, no setup page

Day Summary (surface: 'day_summary', windowDays: 1):
  - File: app/day-summary.tsx (393 lines)
  - Currently: no coaching line exists
  - After: add coaching line at bottom, single-day window subset of scenarios
  - Single-day eligible: protein_under, water_under, sodium_high, active_low,
    log_consistency_low, positive scenarios when day is strong
  - NOT single-day: anything requiring multi-day trends (weight_plateau, cross_*, etc.)

EvR (surface: 'evr', windowDays: 14 | 30 | 90):
  - File: app/diagnostic-report-view.tsx
  - Currently: renders SmartTipCard with tip.title + tip.body
  - After: uses AI tip body when available, exposes window selector (14/30/90)
  - Level 1 insight: own separate packet, window-adaptive (14/30/90 per user selection), Pro
  - Level 1 dedup rule: brain receives home card scenario name as exclusion parameter, skips it, selects next highest-priority finding
  - Level 2 domain card tips: per-card packets, lazy compute, Pro
  - Free user treatment: Level 1 insight box full blur with Pro chip; Level 2 tips show subtle locked indicator with lock chip

## File Change List
1. utils/smartTipsEngine.ts: Add CoachPacket, CoachTipCache interfaces,
   COACH_TIP_KEY, computeCoachPacket(), loadCoachTipCache()
2. utils/coachAI.ts: NEW FILE. AI call, cleanup pass, offline fallback.
3. app/(tabs)/index.tsx: Update smart_tip card to use AI body
4. app/day-summary.tsx: Add coaching line at bottom
5. app/diagnostic-report-view.tsx: Update SmartTipCard to use AI body
6. public/privacy.html: Add AI data disclosure

## AI Call Spec (coachAI.ts)
- SDK: @anthropic-ai/sdk (install: npx expo install @anthropic-ai/sdk)
- Model: claude-sonnet-4-6
- No streaming (non-streaming single call)
- API key: process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY
- Max tokens: 300 (2-3 sentences is ~60-100 tokens, 300 is safe ceiling)
- System prompt: full RULEBOOK text + matching voice examples (mode-filtered)
- User message: formatted packet fields
- Cache: save aiBody + aiGeneratedDate to CoachTipCache
- Once per day: if aiGeneratedDate matches today, skip API call, return cached

## Cleanup Pass Rules (in coachAI.ts)
1. Strip all dashes (em dash, en dash, hyphen in mid-sentence) -- replace with comma or period
2. Sentence count: 2-3 sentences. If >3, truncate at third period.
3. No banned words: "journey", "empower", "transformation", "unlock", "thrive",
   "holistic", "game-changer", "leverage", "optimize", "incredible", "amazing"
4. Numbers in output must match Facts field numbers (spot-check key ones)
5. If any check fails: fall back to fallbackBody from packet

## Offline Fallback
If API call throws OR times out (5 second timeout):
- Use packet.fallbackBody as the tip body
- Set fallbackUsed = true in CoachTipCache
- Save to pj_coach_tip
- Never show a blank tip card

## Diagnosis/Action/Facts Per Rule (for packet builder)
net_above_pace:
  diagnosis: "Net calories above target on {days} of 7 logged days"
  action: "Trim 100-200 calories from highest-calorie days to close the gap"
  facts: { days, paceTarget: ctx.paceTarget, goal: ctx.weightGoal }

net_below_pace:
  diagnosis: "Net calories below target on {days} of 7 logged days"
  action: "Increase daily intake to meet surplus target"
  facts: { days, paceTarget: ctx.paceTarget, goal: ctx.weightGoal }

weight_plateau:
  diagnosis: "Scale flat (less than 0.5 lb change) over {days} weigh-ins despite logged deficit"
  action: "Break plateau by adjusting deficit slightly or checking calorie accuracy"
  facts: { days }

protein_under:
  diagnosis: "Protein averaging below {goal}g goal on {days} of 7 food-logged days"
  action: "Add one high-protein meal or snack on training days"
  facts: { goal: ctx.proteinGoalG, days }

water_under:
  diagnosis: "Water intake below {goal} oz on {days} of 7 logged days"
  action: "Add one extra glass at morning, lunch, and dinner"
  facts: { goal: ctx.waterGoal, days }

sodium_high:
  diagnosis: "Sodium consistently above recommended on {days} of 7 food-logged days"
  action: "Identify the highest-sodium meal and find a lower-sodium swap"
  facts: { days }

active_low:
  diagnosis: "Active calories averaging {avg} against a {goal} goal on {days} of 7 days"
  action: "Add 20 minutes of walking on the lowest-activity days"
  facts: { avg, goal: ctx.activeCalGoal, days }

sleep_score_low:
  diagnosis: "Sleep score averaging {avg} over {days} nights, below 65 threshold"
  action: "Prioritize consistent bedtime to improve sleep quality"
  facts: { avg, days }

cross_sodium_scale:
  diagnosis: "Weight spikes correlate with high-sodium days in the 14-day window"
  action: "Expect the spike to resolve within 24-48 hours after sodium returns to normal"
  facts: { sodiumAvg, scaleJump }

weight_on_track:
  diagnosis: "Weight moving at a healthy pace toward goal"
  action: "Maintain current approach"
  facts: { weeklyRate, goal: ctx.weightGoal }

cal_goal_hit:
  diagnosis: "Calorie target hit on {days} of 7 logged days"
  action: "Maintain the consistency"
  facts: { days }

(All other rules: derive similar diagnosis/action/facts from the slots the existing engine already computes)

## Family 9 Safety Check Logic
Triggers (both are care tone):
1. Calorie intake < 70% of BMR on 3+ of last 7 food-logged days
   -> careSeverity: 3 days = mild, 4-5 = moderate, 6-7 = strong
2. Weight loss rate > 1% bodyweight/week (need 2+ weigh-ins in 7 days)
   -> careSeverity: 1-1.5% = mild, 1.5-2% = moderate, >2% = strong

Safety packet fields:
  scenario: "9.1" (intake) or "9.2" (rapid loss)
  tone: "care"
  diagnosis: (computed from check above)
  action: (computed from check above)

## Voice Examples Summary (for system prompt in coachAI.ts)
DISCIPLINE Positive: weight dropping at pace, protein above floor, high logging consistency
DISCIPLINE Corrective: workouts on track but scale flat, math shows deficit but no loss, two likely causes
DISCIPLINE Care: weight dropping at 2.1 lbs/week on 195 lb frame, past safe pace
DISCIPLINE Educational: weight jumped 1.8 lbs after 4900mg sodium day, then dropped 1.6 lbs next morning
BALANCED Positive: everything clicking, weight dropping, protein above floor
BALANCED Corrective: weekday deficit on track, weekend is the drag
BALANCED Care: deficit deeper than it looks, intake averaged 1190 over 11 days
BALANCED Educational: pattern 3 times in 2 weeks, rough sleep night leads to more food next day
MINDFUL Positive: logged 11 of 14 days, meals spread through day, sleep averaging 7h20m
MINDFUL Corrective: protein averaging 74g over 2 weeks, recovery would feel stronger with more
MINDFUL Care: intake averaged 1200 over 7 days, body burning considerably more, flag gently
MINDFUL Educational: 3 nights under 6 hours led to more food next day, not discipline issue

## Install Command
npx expo install @anthropic-ai/sdk
(Pure JS, no native rebuild needed)
