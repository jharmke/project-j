# SPEC: THE WORKOUT BUILDER (THE PLAN, item E)

**Otto builds a workout and puts it in your Workout tab.** The lead Supporter perk, promised on four
user-facing surfaces, and not built.

Created 2026-08-10. **Status and ranking live in `PLAN.md` item E. This file is the detail.** Where the two
disagree, PLAN.md wins on status and this file wins on design.

⚠️ **NOTHING HERE IS BUILT.** Every decision below was taken in conversation on 2026-08-10 and recorded the
same day, after Justin pointed out that an earlier round of this discussion had been lost. Decisions are
marked ✅ DECIDED, 🟡 DIRECTION (stated but hedged) or 🔴 OPEN.

---

## 0. WHY THIS EXISTS AND WHY IT IS URGENT

The Supporter page's FIRST perk, Otto's own list of what the plan includes, the onboarding all-set screen
and the day-8 step-down modal all promise that Otto **builds workouts into your Workout tab and meals from
food you actually eat**. Neither builder exists.

**That is not a false-advertising problem** (PLAN 4.18): both are shipping before launch, nobody has ever
paid, and the tier is not on sale. It IS a launch dependency, and it makes E the last unbuilt thing standing
between the Supporter tier and delivering what it advertises.

---

## 1. THE THREE LAYERS (read this before anything else)

The app already has the structures this feature needs. Otto is not building new machinery; he is driving
flows that exist.

| Layer | What it is | Where it lives |
|---|---|---|
| **Program** | The SHAPE of a week. Seven weekday slots, each with a type, focus name, muscle text, colour and tags. **`exercises: []` on every day** | `PresetProgram` in `workoutData.ts`; user copies in `pj_workout_state` |
| **Routine** | A named, reusable set of exercises. Not scheduled | `Routine` in `workoutData.ts`, stored in `pj_routines` |
| **Day** | A dated day with real exercises in it | `pj_workout_state.programs['YYYY-MM-DD']` |

⚠️ **`weeklyTemplate[Weekday]` is a fourth thing and is OUT OF SCOPE** (decision 1c). It is the recurring
default for a weekday, and `programs[dateKey]` overrides it. Otto never writes to it: nothing he does should
quietly change every Monday forever.

**An `Exercise` inside a day is self-contained** — name, sets, reps, rest, note, all strings. It carries **no
link to the library** and no muscles or instructions. Those live only on the `LibraryExercise`, which is a
different shape, and are looked up **by name**. That single fact drives most of section 4.

---

## 2. THE CORE LOOP

✅ **DECIDED.** A build request produces, in this order:

1. **Any genuinely new movement becomes a custom exercise in the library** (`LibraryExercise`).
2. **The workout is saved as a custom routine** (`Routine`, into `pj_routines`, appearing in My Routines).
3. **The routine is placed on a specific day the user agrees to** — today or a future date.

✅ **ALL THREE MECHANISMS ALREADY EXIST.** The library creates custom exercises and routines today, and the
Workout tab has a **"Load to N Days"** picker with this-week / next-week navigation and past days disabled.
What Otto produces is an ordinary routine and an ordinary exercise, editable and deletable like anything the
user made by hand.

### 2.1 Preview and accept
✅ **LOCKED BEFORE THIS SPEC EXISTED** (the item E constraint in `SPEC_otto.md`): **routines are previewed
and accepted, never written straight in.** He builds the whole thing including any new movement, shows it,
and **nothing is saved**. Accept and the routine lands AND the exercise joins the library. Decline and
nothing was created.
➡️ Accepting IS the confirmation, which is what solves the mid-build problem (does he stop and ask, or build
then confess?). It also means a wrong exercise, bad set counts or a movement their gym does not have get
caught BEFORE they are in the app. Cost: one extra tap.

✅ **The preview is inline in the chat and revisable by talking.** Add, remove or swap by replying.

### 2.1b What the preview IS: an inline card under the bubble (open item 2, in progress)
✅ **DECIDED 2026-08-10: a structured CARD, rendered inline in the conversation.**
❌ **NOT free text with an Accept pill.** Five exercises with sets and reps is a small table; as prose it
reads like a wall and looks nothing like the rest of the app. A card is also the only version where "swap
the flies" has something visible to point at.
❌ **NOT a modal or a new screen.** Justin: *"not free text, not a pop up modal. pure inline in the
conversation."*

✅ **AND IT SITS OUTSIDE THE BUBBLE, LIKE AN ATTACHMENT IN A TEXT THREAD** (Justin's framing).
🔴 **THE LAYOUT ALREADY WORKS THIS WAY, VERIFIED IN `components/AssistantChat.tsx`.** An Otto reply is not
one bubble, it is a COLUMN (`styles.replyCol`) beside the avatar:
```
[avatar]  ┌──────────────────────┐
          │ bubble: his text     │   <- styles.bubble
          └──────────────────────┘
            ▸ route / tutorial pills   <- styles.pillRow, ALREADY outside the bubble
            share  thumbs up  down     <- styles.actionRow, ALREADY outside the bubble
```
➡️ **The card becomes one more sibling in that column**, so this needs no fight with the existing layout.
✅ **ORDER: bubble, then the routine card, then any pills, then the action row.** The card is the substance
of the reply, pills are navigation AWAY from it, and share/thumbs stays last where it is everywhere else.
🟡 **PROVISIONAL ON SEEING IT.** Justin, 2026-08-10: *"hard to say yes without seeing it but yes i think that
is right."* **The order and the card's visual design get a real pass on device before they are locked.**
This project's standard is that Justin's eyes decide visual questions and that dev-build judgement is about
correctness, not feel.

### 2.2 🔴 THE ONE-SCREEN RULE (Justin, 2026-08-10)
> *"i just want to be sure user isnt being asked 50 questions when trying to build a workout or meal."*

**The preview is one screen with one primary action. It is not a questionnaire.** Three separate
"ask in the preview" moments had accumulated across the decisions below; stacked as a sequence they would be
exactly that interrogation.

➡️ **They are OPTIONS VISIBLE ON THE PREVIEW, not questions asked in turn.** In the ordinary case the user is
asked **nothing**: request a workout, look at it, tap Accept.
- Merge is the DEFAULT, so it is never a question.
- The superset is a tappable suggestion, not a prompt.
- The duplicate-name check appears only when the user personally named a movement resembling one they own.

⚠️ **BINDING ON THE MEAL BUILDER (item F) TOO.** Any future addition must justify itself against this rule.

---

## 3. WHAT OTTO MAY PUT IN A WORKOUT

### 3.1 Exercise selection
✅ **DECIDED.** Unprompted, he picks **only from the existing library**. He may go outside it **only when the
user names a movement themselves** ("include decline bench press and low cable flies").

🔴 **WHY THIS IS THE RIGHT RULE AND NOT MERELY A CONSERVATIVE ONE:** Otto never invents a movement on his own
initiative, so a near-duplicate can only ever appear when the USER typed the name, which is exactly the
moment they know what they meant. It makes the duplicate problem rare and self-limiting instead of systemic.

### 3.2 Equipment
✅ **DECIDED. Seven ticks, filled by a location preset, editable:**

**Dumbbells · Barbell · Squat rack · Bench · Cables · Machines · Pull-up / dip bar**, plus one
**cardio equipment** tick.

Presets: Full gym ticks everything · Apartment/hotel gym ticks dumbbells, machines, cardio · Home gym is
whatever they own · Bodyweight only ticks nothing.

🔴 **HISTORY-BASED INFERENCE WAS PROPOSED AND REJECTED.** The suggestion was that Otto infer available kit
from what the user has logged. **Justin killed it with two cases:** a brand-new user has nothing logged, and
somebody who only does cardio has a history saying "no lifts", which is silence rather than information.
**History says what someone HAS done; it cannot say what they CAN do.**

🔢 **The tick list was COUNTED, not guessed** (MEASURED 2026-08-10 against `DEFAULT_LIBRARY`, 78 entries):
| Tick | Exercises it gates |
|---|---:|
| Cables | 10 |
| Machines | 8 |
| Squat rack | **3** (bench press, incline bench, barbell squat) |
| Barbell without a rack | 6 more |
| Pull-up bar | 3 |
| Dip station | 2 |

➡️ Rack and barbell are SEPARATE because a barbell with no rack is a real home setup; pull-up and dip share
one tick because they are usually the same frame.
❌ **NO PER-MACHINE TICKS.** Only 8 exercises hang off the whole Machines tick, so a wrong suggestion is a
one-tap swap in the preview, not a data problem. Twenty checkboxes to avoid that is a bad trade.
❌ **NO SEVEN CARDIO TICKS.** One cardio tick. When Otto needs to name a machine he uses one the user has
actually logged; otherwise he names none and says "cardio, your pick".

✅ **The tags ride the EXISTING enrich-on-load migration** (`app/workout-library.tsx` ~line 2145), which
patches library entries with new fields using `e.field ?? def.field` and therefore never overwrites a user's
own edit. **No new migration to invent.**
⚠️ **TAG WHILE ITEM J HAS THE FILE OPEN.** J adds ~64 entries to the same file.

### 3.2b The Workout Preferences profile section
✅ **DECIDED 2026-08-10.** A new **third** `ProfileSection`, directly under Membership.

🔴 **THE PRINCIPLE THAT PRODUCED IT, and it is the answer to "does Otto ask questions every time":**
> **Anything Otto would ask on EVERY build is a setting, not a question.**
If it varies per request, the user volunteers it or the preview fixes it. That is how this gets to **zero
back-and-forth without a form**, which was Justin's requirement.

**Contents:**
| Setting | Why |
|---|---|
| **Equipment** (7 ticks + location preset) | Section 3.2 |
| **Preferred cardio** | Lets Otto NAME a machine instead of "cardio, your pick" (3.3) |
| **Session length** | Default is 5 (section 3.7); this is for someone who always wants 4 or 7 |
| **Exercises to avoid** | Replaces an injuries field. See below |

❌ **NOT IN IT: training days per week.** `trainingFrequency` already exists under Activity Level and feeds
the calorie floor. **Duplicating it is exactly how two copies of a fact drift apart.**
❌ **NOT IN IT: experience level.** Fuzzy, and Otto can hedge sensibly without it. Add only on request.

✅ **"EXERCISES TO AVOID" REPLACES AN INJURIES FIELD, and that is a deliberate privacy call.** It handles
both *"my knee is bad"* and *"I hate burpees"* with one control, and it is a PREFERENCE rather than a medical
disclosure, so **no health data is collected and `privacy.html` needs no change.**
⚠️ **Honest caveat:** an avoid list says WHAT to skip, not WHY, so Otto cannot be careful in adjacent ways
(he will skip the squat but not know to go easy on the knee generally). Accepted for v1.
✅ **UI: never show a list.** Empty by default, an "Add" that opens a **search over the library**, each pick
becomes a chip. Same visual language as Food & Allergies directly above it, and it scales to ~143 exercises
without ever rendering 143 of anything. Most users will have zero or two.

⚠️ **THIS WILL BE THE CHIP-HEAVIEST SECTION ON THE TAB** (seven ticks, cardio, an avoid list), which makes it
the worst-looking one under the existing complaint that Profile sections are not cards
(`project_j_roadmap.md`, 2026-08-04). **It inherits the fix for free** -- one change to the shared
`ProfileSection` component -- but it is an argument for doing the card pass at the same time.
⚠️ **IT NEEDS ITS OWN (i)** (Justin: *"yes on the (i) wherever it is needed"*). The roadmap currently calls
the Food & Allergies tooltip "the ONLY tooltip on the Profile tab" and carries a note to give the carded
header a right-hand slot for it. **This makes it two.**

### 3.3 Cardio
✅ **DECIDED.** Lifts only unless asked. When asked, he can put a cardio piece at the start or end. **He never
invents a machine**: he names one the user has logged, or says "cardio session before or after, your call".
Rest days stay out; he is not deciding your rest.

### 3.4 Bodyweight
✅ **DECIDED: write no rule at all.** Pull-ups, chin-ups and dips are among the best movements available and
belong in a gym back or arm day. The only odd outcome is push-ups on a full-gym chest day, which is a one-tap
swap.
🔴 **DO NOT WRITE OTTO AN INSTRUCTION FOR THIS.** Every nuanced judgement rule given to the model on this
project has eventually been ignored, silently. Add a constraint only with evidence from a device.
See [[feedback_harnesses_cannot_see_the_model]].

### 3.5 Supersets
✅ **DECIDED: never unprompted; offered in the preview.** Supported by the data model (`supersetGroup`;
consecutive lifts sharing the id render as one block) and grouping is two taps and fully reversible.
⚠️ **Zero preset routines or programs use supersets** — nothing the app ships demonstrates one.
❌ **REJECTED: "a narrow rule, accessories only, never main compounds."** It sounds tidy and is the weakest
option available: it depends on the model applying a nuanced judgement every time, and it fails silently.
⏳ **LATER: mirror the user's own history.** If their routines already use supersets he may; if they never
have, he does not. Better long-term answer because it is a FACT the app hands him rather than a judgement.

### 3.6 A "home workout" request
✅ **DECIDED.** The equipment profile is a DEFAULT, not a lock. *"Make me a home workout"* means bodyweight
only, and **asks nothing**. If they have kit at home they say so in the request or fix it in the preview.
⚠️ **BLOCKED ON ITEM J.** See section 8.

---

### 3.7 Session shape
✅ **DECIDED 2026-08-10: five exercises for a lift session.** Three or four for a core-only session, one for
a cardio piece. **Whatever the user explicitly asks for wins.**
🔢 **NOT AN INVENTED NUMBER. MEASURED against `PRESET_ROUTINES`:** every single lift routine the app ships is
exactly **5** — Push Standard / Chest Focus / Shoulder Focus, Pull Standard / Back Focus / Bicep Focus, Legs
Standard / Glute Focus / Quad Focus, Full Body Standard / Compound. Core Standard is 3, Core Intense 4, each
cardio preset 1.
➡️ **So Otto's routines sit next to the presets looking native rather than foreign**, and it sidesteps
duration entirely: the app thinks in exercise count, not minutes, and Otto cannot know how long anyone rests.
❌ **REJECTED: dropping to 4 to pre-empt "make it shorter".** That guesses at something that varies per
person and per day, and shortening is already a one-line revision in the preview.
⏳ **LATER, NOT NOW: match the length of the user's OWN routines.** Someone whose routines are all seven
exercises gets seven, cold start falls back to 5. Same fact-not-judgement pattern as the superset idea.

### 3.8 Warm-ups
✅ **DECIDED 2026-08-10: Otto does NOT put warm-ups in the routine.** He may mention warming up in his reply.
🔴 **THE REASON IS THE PR SYSTEM, NOT TASTE.** A warm-up added as an exercise becomes a real entry with
logged sets, so an empty-bar set is treated as a lift attempt, and a name like "Warm-up" is not in the
library so its info panel is dead (section 4). **It would quietly pollute the thing the app is built on.**
⚠️ Also: none of the presets include warm-ups. All five entries in every preset are working movements.

## 4. NAMES: THE MOST DANGEROUS PART OF THIS FEATURE

🔴 **THERE ARE TWO DIFFERENT NAME-MATCHING RULES IN THE APP AND OTTO MUST SATISFY THE STRICTER ONE.**

| Consumer | Match | Failure if the name is off |
|---|---|---|
| **PR history** (`normalizeLiftName`, `utils/liftPR.ts`) | trim + lowercase + collapse spaces, **nothing else** | "Decline Bench" and "Decline Bench Press" become **two separate PR records**. So do "Low Cable Fly" and "Low Cable Flies" — there is no plural handling. **History splits in two, silently.** |
| **Muscle map + instructions panel** (`app/(tabs)/workout.tsx` ~2090, ~3704) | `e.name === ex.name`, **exact, case and space sensitive** | The info button shows **no muscle map and no instructions**. The workout looks fine; the panel is just dead. **Invisible.** |

✅ **THE RULE: when Otto means an existing movement, he writes the library's EXACT name, never his own
phrasing.** Not "decline bench" when the library says "Decline Bench Press".

✅ **ENFORCED THE WAY THE MUSCLE KEYS ALREADY ARE: the app hands him the actual library names and treats
anything off-list as a NEW exercise rather than a guess.** Checkable in code, not a rule he has to remember.

✅ **NEAR-DUPLICATES ARE SETTLED AT THE PREVIEW.** When a user-named movement resembles an existing entry,
the preview asks once ("this looks like your Incline Bench Press, use that?"). No new UI, and the judgement
sits with the person who knows what they meant. **This is the practical stand-in for item K (lift-name
aliases), which is unbuilt.**

---

## 5. WHAT OTTO FILLS IN WHEN HE CREATES AN EXERCISE

✅ **DECIDED BEFORE THIS SPEC** (carried over from `SPEC_otto.md`, kept here as the detailed home):

- **Muscles.** ⚠️ The app hands him the exact valid keys and **DROPS anything not on the list before saving**,
  or a hallucinated "pecs" silently breaks the diagram. **The complete list is the 22 keys in
  `components/MuscleMap.tsx`:** chest, upper_chest, lower_chest, front_delt, side_delt, rear_delt, triceps,
  biceps, forearms, lats, rhomboids, traps, lower_back, abs, obliques, hip_flexors, quads, hamstrings,
  glutes, hip_abductors, hip_adductors, calves.
  ℹ️ Several collapse onto the same drawing, so ~14 regions actually light up and small precision errors are
  invisible.
- **Instructions.** ~4 short steps, matching the built-ins' format.
- **Tags.** ⚠️ The manual add form will not save without at least one tag, so tags are not optional in the
  data. Otto assigns them **from the user's own tag list**, never invented, which means he needs
  `workoutTags` in context.
- **Default sets / reps / rest.** Every built-in has these. Omit them and his exercise behaves worse than the
  ones that shipped.
- **Equipment.** From the seven-tick vocabulary, same supplied-list pattern as the muscle keys.
- ❌ **NO WEIGHT.** A pre-filled number invites someone to load it without thinking, and he has no idea how
  the last session went or how they feel today. **Weight is the one field where being wrong hurts someone.**
  When ASKED, he answers from real history instead.

---

## 6. WHERE IT LANDS

### 6.1 Merge, never replace
✅ **DECIDED.**
🔴 **THE EXISTING "LOAD TO N DAYS" FLOW REPLACES THE DAY'S EXERCISE LIST WHOLESALE AND ASSIGNS FRESH IDS.
OTTO MUST NOT REUSE THOSE SEMANTICS.** That flow means "make this day BE this routine", a different verb from
"add this workout".

✅ **Merging is already the app's own convention:** when Apple Health imports a workout it MERGES into the day
and dedupes by UUID.

🔴 **REPLACING HAS A CONCRETE COST, NOT AN AESTHETIC ONE:**
- An imported Apple session **lives as an exercise in the day**, carrying `fromAppleHealth` and
  `appleHealthUUID`. Wiping the list **deletes the session, loses its heart-rate link** (fetched by UUID) and
  **drops it out of the dedupe set** that stops it being re-imported.
- **Logged sets are keyed by exercise id**, so fresh ids **orphan them**.

➡️ **Merge by default, always.** Replace only if the user explicitly asks, offered in the preview, never the
default. See CLAUDE.md's data-integrity rule: read-then-merge, never replace from scratch.

### 6.2 Apple Watch
✅ **VERIFIED, NOT ASSUMED.** An Apple strength session lands as its own entry in the day alongside whatever
Otto put there, and the app pulls its HR by UUID. Otto's routine is ordinary exercises in an ordinary day, so
nothing changes. **The only thing that would break it is replacing the day's exercises, which 6.1 rules out.
The two decisions protect each other.**

### 6.3 Weeks and months
✅ **DECIDED.** He can build a week or a month. **A month is one 7-day shape, a DISTINCT routine per training
day, repeating for four weeks.** What changes week to week is the weight on the bar, which the user supplies.
✅ **SHORTCUT: the app already ships Push/Pull/Legs and Upper/Lower as `PRESET_PROGRAMS`.** "Decide together
on a split" can mean Otto recommends an existing shape and only generates the routines to fill it.
❌ **REJECTED: four weeks that progress on their own** (volume creeping, a week-4 deload). Otto would be making
progression calls without knowing how the sessions actually went.
⚠️ **THE REVIEW BURDEN IS THE REAL COST, NOT THE BUILD.** A 4-day split is four routines to read before
anything can be accepted. **Section 2.2 has to survive this.** Design the single-routine preview first.

### 6.4 🔬 The research behind repeating (do not restate without the sources)
Justin asked for this to be checked rather than trusted, and the first answer here was too absolute.
**The evidence says systematic variation beats BOTH extremes.**
- **Random weekly rotation HINDERS adaptation** — constant relearning of motor patterns, redundant stimulus.
  The option that sounds smarter is the harmful one.
- **Never changing anything indefinitely is also suboptimal.** Common structure: emphasise a set of exercises
  for **2-3 mesocycles (a mesocycle is 4-8 weeks)**, then rotate.
- Running identical exercises and adding ~2% to the bar is enough on its own to drive new adaptation.

✅ **A four-week repeat sits comfortably in the middle of the evidence.**
✅ **And it is right for this app specifically:** PRs key off the exercise name and "you vs yesterday"
compares a lift to the last time it was done. Weekly rotation would scatter history across dozens of
movements and quietly starve the app's core mechanic.

📚 Sources: systematic review, [PubMed 35438660](https://pubmed.ncbi.nlm.nih.gov/35438660/) /
[J Strength Cond Res 2022;36(6)](https://journals.lww.com/nsca-jscr/fulltext/2022/06000/does_varying_resistance_exercises_promote_superior.40.aspx);
[mesocycle periodization](https://mesostrength.com/blog/mesocycles-and-periodization-for-hypertrophy).
⚠️ **It is a health claim in a health app. Cite them if it is ever restated.**

🆕 **FUTURE FEATURE FALLING OUT OF THE RESEARCH, NOT FOR NOW:** after 2-3 months on the same block a change is
warranted, so the app could notice a program has gone stale and offer to refresh it.

### 6.5 Explaining and varying
✅ **DECIDED.** *"Why are my workouts the same every week?"* is a GENERAL FITNESS question, so it belongs in
the **137-answer general library** (PLAN 4.13): free, instant, zero AI cost. The answer is that you repeat
movements so you can add weight to them, and if the exercises change every week there is nothing to beat.
⚠️ **It must not be phrased as a limitation of the app.** See [[feedback_premium_copy_voice]].
✅ **If a user says they do not want the same thing every time, he varies it. No argument.** The research
objects to random weekly churn, not to variety. The preview already supports swapping.

---

## 7. FREE VS SUPPORTER

✅ **DECIDED 2026-08-10: a free build request gets a CANNED reply, zero AI.** The relevant general answer if
one fits, plus the line that building sessions into the Workout tab is part of the Supporter plan, carrying
the Support button every pitch already has. Justin: *"canned reply cut it."*

🔴 **THIS CLOSES A HOLE THAT EXISTS TODAY. See PLAN 4.18 item 19 for the full finding.** The coach gate only
runs when nothing rides on the message, and `buildWorkoutCapBlock` **is** a rider — so a free user asking for
exercises bypasses the gate entirely and reaches the AI. **"A free user's coaching question never reaches the
AI" has not been fully true since 4.13 shipped.**

⚠️ **THIS IS A REMOVAL, AND REMOVALS CANNOT BE WALKED BACK** — so it happens BEFORE launch, exactly like
Otto's 10 -> 5 cap. There are no free users and nobody has ever paid, so it costs nothing today.
See [[feedback_add_after_launch_not_remove]].

⚠️ **The 2-exercise cap becomes moot for free users** once they no longer get an AI answer to a training
question. **Do NOT simply delete it** — confirm first that no free path still reaches the model with an
exercise request, because the cap is the only thing bounding it.

⚠️ **Supporters are unlimited on the creation caps** (free: 5 routines, 3 programs, 15 custom exercises), so a
Supporter-only builder never collides with them. **The 2-exercise cap is already tier-aware** and enforced
server-side from its own membership record, so a modified client cannot switch it off.

---

## 8. DEPENDENCIES AND SEQUENCING

🔴 **ITEM J NOW BLOCKS ITEM E.** J was always "the cheapest way to make the workout builder safe"; it turns
out to GATE it. **The library has no bodyweight exercises at all** — J's own justification says *"there is no
PUSH-UP... nothing bodyweight at all, so anyone training at home has almost nothing to pick from."* Otto
cannot build a home workout today. **Build J first.**

✅ J's instruction-writing is visible work, verified: `instructions` render in two places.

**J's contents change as a result of this spec** (decided 2026-08-10):
- ❌ **CUT:** sled push, battle ropes, medicine ball slam, Turkish get-up. Each needs equipment almost nobody
  has, and cutting them avoids a tick per exercise. Users can still create them by hand.
- ✅ **KEPT:** burpee and thruster (no equipment); **kettlebell swing** (Justin: *"common enough i see people
  use those like daily"*), tagged **"dumbbell or kettlebell"** rather than earning an eighth tick;
  **Smith Machine Bench Press**, folded under the **Machines** tick.
- ✅ Trap bar and landmine tag as **barbell**.

**Item K (lift-name aliases) is unbuilt** and section 4's preview check is the practical stand-in.

---

## 9. 🔴 OPEN — RANKED. WORK TOP DOWN.

🔴 **THIS LIST IS ORDERED AND THE ORDER IS THE POINT.** It was first written as an unranked bullet list and
Justin caught it immediately: *"why give me a list of 9 that isnt in order of what we should do them in?
thats how things get lost."* He is right, and it is the same discipline that makes `PLAN.md` a ranked queue
rather than a pile. **Ranking is by DEPENDENCY, not by size:** anything that constrains another item comes
first, so no decision has to be taken twice.

**J = needs Justin's call. M = mechanics, I bring a proposal rather than a question.**

| # | Item | Who | Why here |
|---|---|---|---|
| ~~1~~ | ~~SESSION SHAPE~~ | -- | ✅ **CLOSED 2026-08-10. Five exercises, see section 3.7.** |
| **2** | **THE PREVIEW AND THE WHOLE INLINE ADD FLOW** | **J** | **The big one.** Everything from #3 to #5 hangs off what the preview actually IS. |
| **3** | **Where the preview renders** | M | Falls straight out of #2 and is really its second half. |
| **4** | **The draft surviving revision across turns** | M | Only answerable once #2 defines what "revising" means. |
| **5** | **Validation before save, and what the user sees when something is dropped** | M | Needs a preview to show it in. |
| **6** | **How the library reaches Otto, and the token cost** | M | Independent of the preview, so it can run in parallel, but it must land before any build. |
| **7** | **Naming the routine** | **J** | Nearly settled already, just needs confirming. Small and independent. |
| **8** | **`DayProgram.muscles`** | **J** | Small, independent, and the easiest thing in this document to forget. Numbered so it cannot be. |

**1. SESSION SHAPE.** When Otto builds a chest day, is he aiming at a number of exercises, a rough duration,
or whatever the request implies? Without a rule, "build me a chest workout" could come back as three
movements or eleven.

**2. THE PREVIEW AND THE WHOLE INLINE ADD FLOW.** What it looks like, how revision by talking actually reads,
what Accept looks like, what happens on Decline, and how the day picker appears inside a chat.
**Constrained by section 2.2 (one screen, one action) and by 6.3 (a 4-day split is four routines).**

**3. WHERE THE PREVIEW RENDERS.** A chat-embedded card, and every modal rule in this project applies
(centred, never a bottom sheet, `ToastRenderer` inside the modal).

**4. THE DRAFT SURVIVING REVISION ACROSS TURNS.** Otto's history is capped at 12 turns (PLAN 4.5, measured,
deliberately left there). A routine revised over several messages has to survive that.

**5. VALIDATION BEFORE SAVE.** Dropping off-list muscle keys, off-list equipment, invalid tags and unknown
exercise names, and what the user sees when something is dropped.

**6. HOW THE LIBRARY REACHES OTTO**, and what it costs in tokens. Names are mandatory (section 4); muscles,
equipment and tags may also be needed. A cached-prompt question as much as a design one.

**7. NAMING THE ROUTINE.** 🟡 DIRECTION: Otto names it from generic templates ("Push A", "Chest & Triceps")
and the user can rename it whenever. Recorded as direction rather than locked because Justin hedged.

**8. `DayProgram.muscles`.** A day carries its own display string ("Chest · Shoulders · Triceps") separate
from per-exercise muscle data. **Who fills it in when Otto builds a day?** Raised by Justin 2026-08-10.

✅ **NOT OPEN, LISTED SO NOBODY RE-OPENS IT: Mindful.** Identical in Mindful — sets, reps and exercise order
are none of the three modes' business. Decided before this spec existed.

⚠️ **THIS LIST WILL GROW WHEN THE BUILD STARTS, AND THAT IS EXPECTED.** Justin, 2026-08-10: *"need to double
check after its built for more questions/open items too cause there is just no way thats it."* He has been
right every time he has said that so far. **New items get RANKED INTO this table, never appended to the
bottom.**

---

## 10. TRAPS FOUND WHILE SPECCING (each cost a real check)

1. **`saveExercise` does `{ ...ex, ...form }`.** Safe today ONLY because the Create/Edit form has no
   instructions or muscles field. **Add those naively and an empty input wipes a built-in's curated
   instructions.** See PLAN 4.18 item 15, the form upgrade.
2. **The info panel matches names exactly** while PRs normalise. Two rules, one of which fails invisibly.
3. **The workout cap rider bypasses the coach gate** (section 7).
4. **`_free_user_stocktake.cjs` does not simulate riders**, so it reported these very messages as "gated"
   when they are not. **A header warning is not a substitute for reading the call site.**
   See [[feedback_verify_the_call_site]].
5. **One phrasing still leaks:** *"can you put a leg day in my workout tab"* routes as `app-term`, not
   coaching, so it reaches the AI. Fails open, fractions of a cent, logged not fixed.
