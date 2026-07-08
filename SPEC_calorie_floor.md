# SPEC: Calorie Floor / Low-Target Safeguard

Status: DESIGN LOCKED (core), not yet built. Gym-list item #1.
Last updated 2026-07-08.

## The problem
`utils/calorieTarget.ts` computes `calTarget = TDEE - paceDeficit` with NO floor. A small
and/or sedentary user on an aggressive pace can get a genuinely dangerous recommended
target (real example: a small woman recommended 915 kcal). Today the app shows that number
confidently and silently, like it is fine. That is the failure: not that a low number can
exist, but that it is presented with no warning. This is also an App Store / duty-of-care risk.

## Core philosophy (LOCKED): Option B, warn + consent, NEVER hard-block
The app never clamps or blocks the target. The real number always shows. Friction scales with
risk. An informed adult who deliberately picks an aggressive cut is respected; a naive user is
protected by making the low number impossible to miss instead of silent.

Rejected: Option A (MyFitnessPal-style hard clamp up to a floor). It overrides the informed
user (e.g. a deliberate -2 lb/wk -> 1388 target getting forced up to 1500 feels broken). The
Megan problem was about SILENCE, not the number existing, so a loud warning solves it without
paternalism.

## Three zones, two lines (LOCKED)
Response scales in three tiers, drawn by two thresholds:
- GREEN (target at/above the whisper line): silent. No warning. Most users live here.
- WHISPER (target between the two lines): a small inline caution under the target number on the
  Your Estimates card. No modal, no block. User just proceeds.
- MODAL (target below the modal line): a one-time acknowledgment modal, then a persistent inline
  caution afterward. User can always continue.

## The thresholds (LOCKED)
Sex-based. `profile.sex`; if sex is unset, fall back to the WOMEN'S (stricter) numbers as the
universal safety net.
- MEN:   whisper below 1500 · modal below 1200
- WOMEN: whisper below 1200 · modal below 1000

Whisper line = the classic "recommended minimum." Modal line = "now we should actually talk,"
roughly 300 lower. Sanity check: a man at 1388 whispers (below 1500) but no modal (above 1200);
a woman at 915 gets the modal (below 1000).

Open: the men's 1500 whisper line may feel too eager for a lean cut. Tunable after real use.

## Trigger logic (LOCKED)
- Fires off the COMPUTED recommended target (TDEE - paceDeficit), the same value
  `loadCalorieTargets` produces. Not raw bodyweight, not activity level alone.
- Only applies to LOSS goals. maintain / gain never produce a low target, so the floor simply
  does not apply (no branch needed).
- MANUAL targets (user typed their own via useRecommendedCal = false): warn, do NOT block, and do
  NOT show the "here is your fix" advice (they chose the number themselves). Whisper/modal caution
  still applies on the number.

## The two levers (LOCKED framing)
Only two things a user can change raise a target. Everything else (height, age, sex, body size)
is fixed. The modal must ONLY ever offer a lever that is REAL for that person:
- PACE lever: available when a slower LOSS pace exists below their current one (i.e. they are on
  lose_1 / lose_1_5 / lose_2 and can step down). NOT a lever at the gentlest loss (lose_0_5 today;
  revisit if pace granularity is added).
- ACTIVITY lever: available when `lifestyleActivity === 'sedentary'` AND `trainingFrequency === 'none'`
  (clear room to add movement). Anyone lighter-than-sedentary or with any training counts as
  "already active" -> no activity button. (Edge combos e.g. sedentary-but-trains-3x may need tuning.)

THE AIRTIGHT RULE: never show "Choose a slower pace" to someone already on the gentlest pace, and
never show "Adjust activity level" to someone already active. A button that is not a real fix is a
lie and makes the app look clueless.

## The four modal cases (LOCKED copy; Discipline/Balanced voice)
Numbers below are examples; real copy interpolates the actual target. Every modal carries fine
print: "For informational purposes only. Not medical advice."

### Case 1 - aggressive pace + sedentary (both levers)
Title: Let's give you more to work with
Body: At this pace your target lands at 950 calories. That's low enough it gets genuinely hard to
hit your protein, vitamins, and minerals, and your body has less to recover with. Two easy fixes:
ease the pace, or add a little daily movement so you earn more food. Either one feeds you better
while you still lose.
Buttons: [Choose a slower pace] [Adjust activity level] [I understand, continue]

### Case 2 - aggressive pace + already active (pace only)
Title: Ease off the throttle
Body: You're already active, so it comes down to the pace. 2 lb a week is a steep deficit, and at
1,150 calories it's tough for your body to get the nutrients it needs and bounce back from your
training. Dial it back and you get more food, better recovery, and more muscle protection, and
you'll still lose.
Buttons: [Choose a slower pace] [I understand, continue]

### Case 3 - gentle pace + sedentary (activity only)
Title: Move more, eat more
Body: You're already going gently, so the pace is fine. Your target is 950 because you're not very
active day to day, which keeps your daily burn low, and eating this little makes it harder to get
the nutrients you need and recover. A bit of regular activity raises how much you can eat, and it's
good for you on its own.
Buttons: [Adjust activity level] [I understand, continue]

### Case 4 - gentle pace + already active + STILL low (no lever)
Title: There's not much room to cut here
Body: You've set a gentle pace and you're already active, so you're doing the right things. Going
lower than this would make it harder to get proper nutrients and recover, and it wouldn't really
speed things up anyway. The healthiest move is patience: keep protein high and let the weight come
off slowly, or eat at maintenance for a while. Both work. Forcing it lower doesn't.
Buttons: [Set to maintenance] [I understand, continue]

## Copy rules (LOCKED)
- ED-AWARE, NON-NEGOTIABLE: copy NEVER references body size or shape. It talks only about fueling
  (nutrients, recovery, muscle) and behaviors (pace, activity) - things you DO, not things you ARE.
  ("You're on the smaller side" and "your body doesn't burn much" are both banned - the second also
  risks pushing an active person to train harder, the opposite of the goal.) Cases 1-3 reference only
  pace + activity; Case 4 deliberately drops the "why" rather than name body size.
- Educate gently, don't just wag a finger: each modal gives a little of the "why low fuel is hard on
  your body" (nutrients / recovery / muscle), not just "watch it."
- No double-dash in the user-facing strings (app-wide rule). Internal docs like this are fine.
- Warm, direct, not scolding. Proper capitalization.

## Buttons (behavior) -- LOCKED 2026-07-08
- "Choose a slower pace" (cases 1 & 2): sets weightGoal to the GENTLEST pace that clears the modal
  zone in ONE tap (flavor a: jump-to-safe, not step-down). If even the gentlest loss can't clear it,
  lands on the gentlest available.
- "Adjust activity level" (cases 1 & 3): closes the modal, jumps/scrolls to the activity-level setting.
  (Confirm at build time where that control lives -- if on the profile screen, just scroll to it.)
- "Set to maintenance" (case 4): sets weightGoal to maintain.
- "I understand, continue" (all): keeps the real target, records the acknowledgment (see persistence),
  dismisses.
MODAL TRIGGER: fires when a pace selection lands the target in the MODAL zone AND that target has not
already been acknowledged.

## Inline caution (WHISPER + MODAL zones) -- BUILT (Slice 2)
Small amber (theme.statusWarn) line shown whenever the target zone is not green. Copy (LOCKED,
ED-safe, generic, one line for both low zones):
  "This target is on the low side. Prioritize protein and nutrient-dense foods to fuel and recover well."
Placement: shown in BOTH spots so it can't be missed regardless of which collapsible section is open:
  1. Under the BMR/TDEE/Target row on the Your Estimates card (the official readout).
  2. Under the Weekly Pace picker in the Weight Goal section (the POINT OF ACTION -- this is the fix
     for the original "warning orphaned in a collapsed section" bug; the modal will also fire from here).
Lives in app/(tabs)/profile.tsx, classified via computeCalorieFloor on the shown target.

## Acknowledgment persistence
"I understand, continue" is remembered so the modal does not nag every time. Proposed store:
`pj_calorie_warning_acknowledged` = { date, targetAtAck }. Re-fire the modal only when weight /
activity / pace inputs CHANGE and produce a NEW target still below the modal line. Exact re-fire
rule + AsyncStorage shape: TBD (confirm before building).

## Mindful (LOCKED 2026-07-08: NO separate variant)
The modal + inline caution SHOW in every coaching mode (a safety heads-up about under-fueling is
CARE, not judgment). Justin decided to LEAVE OUT a Mindful-specific tone pass, so the copy is
identical in all modes. There is no Slice 4.

## Related but SEPARATE items (do not fold into this spec)
- Pace granularity: DONE 2026-07-08. Added lose_0_75 (-375) and lose_0_25 (-125) to the loss ladder
  (loss only, Justin's call). New floor: lose_0_25 is the gentlest (not a pace lever), lose_0_5 is now
  adjustable. Updated GOAL_DEFICITS in calorieTarget/profile/index/goalHit/settings, GOAL_LABELS +
  slower-pace jump list in profile, PACE_LEVER/LOSS sets in calorieFloor (+tests), PACE_LABELS in
  smartTips, and onboarding your-style (PACE_PILLS "Moderate"/"Very Gradual" + its deficit/label maps).
  Profile's Weekly Pace is now a wrapping PILL GRID (was a 9-row column). NOTE: GOAL_DEFICITS is
  DUPLICATED across 6 files (all now consistent) -- centralization cleanup flagged (roadmap Infrastructure).
- Activity nudge near the Activity Level control (small copy, only when target <= floor AND activity
  sedentary/unset). May be redundant with Case 1/3's modal advice - decide when building.
- ONBOARDING activity-level wording: the field should clearly mean "what you do NOW," not aspirational
  ("I'll go to the gym every day from now on"). A wrong guess is not fatal (adaptive TDEE + real weight
  trend self-corrects over weeks), but the copy should set the honest expectation. Backlog item, its own
  thing. (Raised by Justin's dad during onboarding.)

## Implementation notes (when we build)
- The floor/zone logic belongs at the SINGLE source of truth so nothing drifts: `utils/calorieTarget.ts`
  (`loadCalorieTargets`) should return the zone + which levers apply, alongside calTarget. The suggested-
  target calc mirrored in `settings.tsx` MUST route through the same logic (or share it) so the settings
  preview and the home card can never show different warning states.
- Surfaces: Settings > Goals (where pace/activity are set and the target updates), the Your Estimates
  card (inline caution), profile weight-goal UI.
- No pj_* key is wiped; the ack key is additive.

## Build order (proposed, slice by slice)
1. Zone computation in calorieTarget.ts (whisper/modal/green + lever flags). No UI yet.
2. Inline whisper caution on Your Estimates.
3. The modal (4 lever-branched cases + buttons + persistence). >> SLICES 1-3 DONE 2026-07-08.
4. (No Mindful pass -- decided out; copy is mode-agnostic.)
5. (Separate) pace granularity, activity nudge, onboarding wording.
