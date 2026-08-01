# SPEC: Otto (the general companion) -- free vs Supporter

Status: **DIRECTION LOCKED 2026-07-29, NOTHING BUILT.** Otto today is fully free with no tiering.
Last updated 2026-07-30. **ALL SIX OPEN ITEMS RESOLVED that day** (the hard gate is LOCKED; artifacts survive
a downgrade; Otto may create exercises only when asked; the full pitch ruleset; meal-builder food matching;
and neither backlog item becomes an Otto capability)
and **THE UNDEREATING SAFEGUARD** (app-side detection, Otto is the only voice, he never speaks first).
Question 3 also spawned three new items in THE PLAN: I (exercise editor), J (expand the pool), K (lift-name
aliases). ⚠️ OPEN ITEM 4 supersedes the HOW OTTO SELLS section on any conflict.

⚠️ THIS IS THE FIRST SPEC OTTO HAS EVER HAD. `SPEC_otto_notifications.md` is the notification HUB,
not the companion. Halo has had `SPEC_faith_ai.md` since June; Otto, the bigger feature, had nothing.
Everything below came out of one long session on 2026-07-29 and had been living only in chat.

---

## WHY THIS EXISTS (the money problem that forced it)

The unit economics pass on 2026-07-28 (see the COST MODEL section of SPEC_monetization.md) found every
install scenario losing money. Two days of work moved break-even conversion from ~8-9% of active users
(impossible) to ~4.7% (top edge of achievable) via the price raise and the Apple Small Business Program.

Cost is now squeezed about as far as it goes. **Conversion is the only lever left**, and Otto had
nothing to sell: a Supporter's only Otto perk was a higher message cap, which nobody notices.

⚠️ Do NOT read this spec as a cost-cutting exercise. Gating Otto saves almost nothing directly (the
user data snapshot is ~1,200 tokens). **This is a conversion play.** The cost work is separate and
lives in the OPTIMISATION section at the bottom.

---

## THE CORE PRINCIPLE (LOCKED)

**Advice is free. Artifacts are paid.**

Free Otto answers real questions with real knowledge. Supporter Otto makes *things* -- a routine sitting
in your Workout tab, meals in your log, an answer built from your own numbers.

Rationale: general wellness knowledge is a commodity. ChatGPT gives away a good chest workout. Gating
the commodity while giving away the unique thing is backwards and makes the app look small. What no
other AI on earth can do is act *inside* GoodForge against *this user's* data.

---

## THE SPLIT (LOCKED)

### FREE OTTO
| Capability | Status |
|---|---|
| App how-to, navigation, where anything lives | Built |
| Jump buttons + tutorial launches from his answers | Built |
| What a feature does / how a calculation works | Built |
| Nutrient education ("what does magnesium do") | Built |
| General nutrition guidance ("more protein at breakfast") | Built |
| General training guidance, **max 2 exercises** | ✅ BUILT + device-verified 2026-08-01 -- see THE 2-EXERCISE CAP, IN FULL (one known leak, logged there and in NEXT UP) |
| General sleep/recovery guidance ("why am I tired") | Built |
| Coaching mode + faith tier awareness | Built, stays free |
| Crisis screening | Built, stays free |
| 10 messages/day | Built |

### SUPPORTER OTTO
| Capability | Status |
|---|---|
| Reads their actual numbers in answers (`[[stat:key]]` tokens) | Built, needs gating |
| Food log history, PRs, sleep, body measurements, achievements, journal | Built, needs gating |
| Structured routines (sets, reps, ordering) rather than loose recs | Built, needs splitting. Line agreed 2026-08-01: he can EXPLAIN general ranges free, he cannot PRESCRIBE them onto his two movements -- see SETS AND REPS |
| **Builds a workout into the Workout tab** | NOT BUILT |
| **Meal suggestions / meal builder** | NOT BUILT |
| 30 messages/day | Built |

⚠️ Three of these are capabilities free users have TODAY. Gating them is a REMOVAL, which is why all of
it must ship before launch (see SEQUENCING).

**MAX 2 EXERCISES, NEVER 3.** Three reads as a routine and gives away the thing being sold.

### THE 2-EXERCISE CAP, IN FULL (agreed + ✅ **BUILT AND DEVICE-VERIFIED 2026-08-01**, commits d29d9f9 + cd4105b)

> **WHERE IT LIVES, AND WHY -- READ BEFORE MOVING ANYTHING.**
> The cap instruction is **appended to the USER'S MESSAGE** (`buildWorkoutCapBlock`), not to the system
> prompt, and only on messages the app flagged as a request for exercises (`messageAsksForExercises` in
> `utils/companionPitch.ts`). It lived in the system prompt first, in **six different wordings**, and leaked
> every time -- extra movements for skipped groups, sets and reps creeping back, and "list 10 leg exercises"
> answered with ten. One rewrite made it actively worse. **The wording was never the variable; position was**,
> exactly as with the pitch (0/10 in the system prompt vs 10/10 on the message). Moving it back will quietly
> loosen the cap with no error and no log line.
> **One flag, two jobs:** the same detector decides whether the cap attaches AND whether the message counts
> as a wall. Gating on it is also why the cap costs nothing on the other nine messages of someone's day.
> **The limit line is added by CODE, not judged by Otto** (`buildWorkoutCapBlock(cutSomething)`). Asking him
> to decide whether the limit "actually bit" failed 3 for 3 -- he said it even when they asked for exactly
> two. The app already knows (`workoutAskWantsMoreThanTwo`), so it decides. Measured after the move: **21/21**
> correct on the line, present and absent.

**WHEN IT APPLIES:** only when he is asked to PRESCRIBE a session, i.e. build a workout or list off exercises
to go and do. It does NOT apply to teaching or comparing movements the user already named ("how do I do a
Romanian deadlift", "incline or flat press") -- those are coaching, not the thing being sold.

**THE RULES:**
- **Two movements per REPLY. Never three.** The cap is per answer, not per muscle group, or "give me 3 chest,
  3 back and 3 legs" hands over a full routine in one message.
- **Multi-group asks: one movement from each of the FIRST TWO groups they named, in the order they named
  them.** Their order, not his judgement -- people lead with what they care about, and it is predictable
  rather than arbitrary. He names plainly which groups he did not get to. The movement must genuinely train
  that group -- ⚠️ he shipped a **Barbell Back Squat labelled as covering "back"** on the first device test,
  so the prompt now says outright that a back squat is a LEG exercise whatever its name sounds like.
  ⚠️ **CORRECTED 2026-08-01 (same day): CARDIO DOES NOT CONSUME ONE OF THE TWO SLOTS.** It was written as
  "a group like any other" in the morning. See WHAT COUNTS below -- cardio duration guidance is not a named
  exercise, so "back, bis, core and cardio" spends its two slots on BACK and BIS.
- **Asking again is a NEW question and gets two more.** This is the accepted rephrasing loophole, and it
  costs them one of their 10 daily messages. The ONLY thing to enforce is never more than two in a single
  reply. ⚠️ Note the interaction: "give me more" is also pitch trigger 1, so a user who pushes gets their two
  more AND, once per conversation, a mention of the plan. That is intended.
- **A same-slot SWAP does not count as a third.** Count what they would PERFORM, not what he names.
  ✅ "Barbell row, or a dumbbell row if you have no bar. Then an incline dumbbell curl." = two things to do.
  ❌ "Barbell row, lat pulldown and an incline dumbbell curl." = three. Over.
- **WHAT COUNTS vs WHAT DOES NOT** ⚠️ **REWRITTEN 2026-08-01 after measurement. This replaces the earlier
  "warmups stay general, he names no movements at all" rule, which failed 0 for 4 and then 0 for 3 across
  several wordings -- he named arm circles and band pull-aparts every single time.**
  • **COUNTS: a named exercise for a MUSCLE GROUP, and that includes CORE.** Planks, dead bugs, hollow holds,
    pallof presses and carries are core movements and they spend one of the two. Justin's call: "core is
    still a key muscle group, some people literally just have core days."
  • **DOES NOT COUNT, and he may give it freely: warmups, mobility, stretching, and general cardio duration
    guidance** ("finish with 15 to 20 minutes steady"). Justin's call, same day: "warmup/mobility/cardio fine
    I guess we can let up."
  ⚠️ **WHY THE CHANGE, so nobody re-tightens it:** he resisted because those things genuinely are not the
  product. A warmup answer is light cardio, arm circles and a ramp-up set -- that is the generic advice in
  every training article, not a session in disguise. Nobody subscribes for "do some planks". The thing worth
  protecting is the structured LIFT prescription, and that part holds. Fighting for the stricter rule cost
  six rounds and made Otto worse at something that was always free.
  ⚠️ **A warmup QUESTION also no longer trips the cap at all** -- `messageAsksForExercises` excludes it, so
  "give me a warmup for chest day" gets no limit line. It used to match on "chest day" and end a complete
  warmup answer with a limit that had withheld nothing. "Give me a warmup AND a chest workout" still caps.
- **THE LINE HE SAYS: "Two movements per question is what the free plan covers."** Deliberately a flat fact
  about the plan, NOT "I keep it to two" -- anything that sounds like his choice invites haggling. Attribution
  once per reply, no apology, no price, no pitch.

**FULL EXAMPLE** (asked for back, biceps, core and cardio):
> Barbell row for back, incline dumbbell curl for biceps. Those two will carry most of the session. Two
> movements per question is what the free plan covers, so core and cardio aren't in this one.

⚠️ **HE MUST NOT INVITE THE FOLLOW-UP.** He names what he covered and stops. Saying "ask me about core and
I'll cover it" teaches the workaround -- the loophole is accepted, but accepting it quietly and advertising
it are different things.

**THE REPLY SHAPE, LOCKED 2026-08-01: ANSWER, REASON, LIMIT, STOP.** Nothing goes around it. This is the
same three-sentence shape as the DATA declines already shipped, which is the point -- free Otto sounds
consistent whether he is hitting a data wall or a capability one. Specifically kept OUT:
- **No apology.** "Sorry I can't give you more" makes the plan sound like a punishment.
- **No naming what he is withholding.** "I can't build you the full session" describes the paid product in
  the middle of a free answer. That is a pitch wearing a disguise.
- **No offer to continue** (see above).
- **No hedging the two he gave.** "This is just a start, obviously not a full workout" undercuts the answer
  he did give. The two movements must read as a confident, complete answer to what was asked.
**Why nothing extra:** every additional sentence is another chance to sound apologetic or salesy. The one
factual clause already does the whole job. Limited, not broken, and not a trailer.

**MODE VARIANTS: NONE.** The cap involves no deficit maths, no weight-loss framing and no prescribed numbers,
which are the only things Mindful actually forbids. It reads identically in all three modes.

### SETS AND REPS: HE CAN EXPLAIN, HE CANNOT PRESCRIBE (agreed 2026-08-01)

**The governing principle for the whole cap, and deliberately ONE principle rather than a list of rules --
a list gets picked apart in a prompt, a principle survives.** It is the same line piece 1 drew (teaching a
movement vs building a session), one level down.

- **GENERAL training knowledge is FREE and answered in full.** "How many sets should I do for muscle growth"
  gets a real answer: three to four working sets, 8 to 12 reps, a couple of minutes rest. **No wall, no
  attribution, no limit** -- he answered the question completely, so nothing was withheld.
- **APPLYING it to the two movements he just gave is the PRODUCT.** "Give me sets and reps for those two",
  "what order do I do them in" = assembling the routine. Wall + attribution.
- Supporter gets the numbers and the ordering attached to the movements as a structured routine (and
  eventually built into the Workout tab, item E). This is exactly the SUPPORTER OTTO table's "structured
  routines (sets, reps, ordering) rather than loose recs".

⚠️ **DO NOT WALL THE GENERAL QUESTION.** Two reasons, both concrete:
1. It contradicts what FREE_TIER_BLOCK already promises out loud -- "being on the free plan does not make you
   a worse coach, it means you cannot see their numbers" -- and set/rep ranges are in every training article
   on the internet. Refusing them protects nothing and makes free Otto read as THIN, which is the exact
   failure the attribution rule exists to prevent.
2. It would fire a pitch trigger on a trivial question, spending one of the three weekly mentions on a bad
   moment.

**THE LOOPHOLE, ACCEPTED AGAIN:** ask for two movements, then ask about sets, then apply it yourself. Same
bargain already settled for rephrasing -- that is three of their ten daily messages and they still assemble
it by hand. What they do not get is Otto building and loading it for them, which is the actual product.

**TWO BUILD NOTES THAT MUST LAND WITH IT (found 2026-08-01 checking this rule against the live prompt):**
1. ⚠️ **Otto's prompt currently tells him the OPPOSITE.** `companionSystemPrompt.ts` says to give "a real,
   useful answer with actual movements" on workout questions and explicitly not to hold back. That
   instruction has to go when the cap goes in, or it is the same contradiction that broke the pitch.
2. ⚠️ **FREE_TIER_BLOCK would classify a workout question as NOT A WALL.** It says a question he can answer
   fully without their data is not a wall and gets no attribution. A general workout question fits that
   description exactly, so as things stand he would skip the attribution and the app would not count it.
   It needs a carve-out for CAPABILITY walls. **Do not ship this prompt edit on its own** -- if he starts
   treating workout questions as walls before the cap exists, he is attributing a limit he is not enforcing.
3. ⚠️ **A capped answer IS a wall** (see ATTRIBUTION IS NOT A PITCH below: the 2-exercise cap is listed as a
   capability wall), so it must count toward the three walls that trigger a pitch. `messageHitsWall` in
   `utils/companionPitch.ts` cannot currently see a workout ask at all. Real work, not a nice-to-have.
   **The rule for what counts is below.**

### WHAT COUNTS AS A WORKOUT WALL (piece 4, agreed 2026-08-01)

**THE TEST: did he actually have to leave something out?** Not "did the cap apply" -- the cap applies to
every workout question, but it only BITES when they asked for more than two. Those are different, and
conflating them is what produced a wrong first draft of this rule.

| They asked for | He gives | Wall? | Limit line? |
|---|---|---|---|
| A workout / routine / session / "what should I train today" | 2 | **YES** | Yes |
| Several muscle groups (3+ movements' worth) | 2 | **YES** | Yes |
| "Give me 3 chest exercises" | 2 | **YES** | Yes |
| "Give me 2 chest exercises" | 2 | **NO** | **No** |
| "What's a good exercise for lower back" | 1-2 | **NO** | **No** |
| "Should I do incline or flat" | n/a | **NO** | **No** |
| "How do I do a Romanian deadlift" | n/a | **NO** | **No** |

⚠️ **NO LIMIT LINE WHEN THE CAP DID NOT BITE.** Someone who asks for two and gets two was not limited.
Adding "two movements per question is what the free plan covers" there points at a rule they did not hit --
that is attribution as a tagline, which the spec forbids, and it reads passive-aggressive.

**VAGUE QUANTITIES:** "a couple" means two, so no wall. "A few", "some", "a bunch" mean more than two, so he
leaves something out and it IS a wall.

**WHEN GENUINELY UNSURE WHETHER IT WAS A WORKOUT ASK AT ALL, DO NOT COUNT IT.** The two errors cost very
different amounts: a wall counted wrongly nudges someone toward a pitch they did not earn, and there are only
three of those a week. A missed wall costs nothing -- the mention just arrives a message later.

⚠️ **THE ONE THAT IS EASY TO MISS: "what should I train today."** No exercise words in it at all. Must be on
the list deliberately.

⚠️ **"GIVE ME 2 MORE" IS A PITCH BUT NOT A WALL, AND THAT IS CORRECT.** They asked for two and got two, so
nothing was withheld -- no wall, no limit line. But it matches "asks for more", which is pitch trigger 1.
The wall counter and the pitch triggers are independent systems. Do not "fix" this.

**ACCEPTED:** a user who works out that the limit is two can ask for two at a time forever and never trip a
wall, so never get pitched. Fine -- they already know the plan has a ceiling, a mention teaches them nothing,
and each ask costs one of their ten daily messages. The pitch is for people hitting the ceiling unexpectedly.

**BUILD NOTE:** the app must notice an explicit small number ("give me 2") and not count it. One check, and
it stops us counting a wall that never happened.

**NOT A PROBLEM, CHECKED:** "what should I train today" could read as both a data wall and a capability wall,
but `wallCountRef` increments at most once per message, so it cannot double-count.

**THIS CAP IS A REMOVAL** (free users have full routines today), which is normally a real risk. Checked: all
eleven TestFlight testers are locked Supporters, so the only account that will ever see the downgrade is
Justin's own free test account. No fallout, nothing to announce.

**ENFORCEMENT IS PROMPT-ONLY.** There is no reliable way for the app to count exercises in his reply, so
unlike the pitch there is no deterministic backstop. Measure it before shipping: rebuild the real prompt from
`functions/lib/` and run adversarial phrasings against the real model (see open item 4 for the method).

#### 🟡 KNOWN LEAK, ACCEPTED FOR NOW (2026-08-01) -- NOT swept, it is also ranked in NEXT UP

**The shape "back, bis, core and cardio" still names a third movement roughly 2 times in 3.** You get the two
prescribed lifts, then a passing "planks or carries for core" with no sets, reps or ordering. Sometimes he
also spends both slots on the FIRST group (row + pull-ups) instead of taking the first two.

**Measured, not impressionistic:** three groups is clean 3/3 ("chest, legs and shoulders" -> bench + squat).
"Back and biceps" is clean 3/3. It is specifically the four-group shape where one group is uncapped cardio
and another is core -- he appears to treat core as leftover once cardio is off the count.

**Why it was accepted rather than fixed:** the structured routine is still withheld, which is the actual
product; the leak adds a bare movement name. Justin's call, after six rounds of prompt wording had already
hit diminishing returns: accept for now, log it, revisit if it grates in real use.

**If it IS revisited, do NOT start with more prompt wording -- that is the path already exhausted.** The next
honest step is a deterministic counter: match the reply against the exercise library (79 movements today,
~143 after plan item J) and count the names. That is reliable enough to MEASURE how often this happens for
real users. Enforcing on top of it (regenerating an over-limit reply) costs a second model call and risks a
stitched-together answer that reads worse than the leak, so measure first and decide with numbers.

---

## HOW OTTO SELLS (LOCKED -- this one is easy to get wrong)

**He does not.** He never volunteers Supporter. Ever.

The primary trigger is the user asking for more: "can you give me more", "what about the rest", "build me
the full thing". That is the user saying they want it, and it is the only moment a price may be named.

⚠️ **UPDATED 2026-07-30 (see OPEN ITEM 4, which is now the full ruleset and supersedes this section on any
conflict).** A SECOND trigger was added: **their third wall in one conversation.** Justin was on the fence
that "asks for more" alone means most users never hear a pitch at all. Also added there: attribution in
every decline (which is NOT a pitch), caps of one per conversation and three per rolling 7 days, never
pitching an entitled user, and the crisis / safeguard / faith exclusions.

❌ NEVER: "For chest I'd go incline press, flat press and a fly. If you want the full session with sets
and reps built into your Workout tab, that's part of Supporter."
That is Otto selling unprompted. Justin's exact reaction to this phrasing was that it was terrible and
that there was no reason to throw the paid plan at someone who had not asked.

✅ SIGNAL WITHOUT SELLING. Deliver the 2 exercises confidently, then state the limit as a flat fact:
"Two movements per question is what the free plan covers." No price, no pitch, no call to action.

⚠️ **CORRECTED 2026-08-01.** This line used to read "Here's a couple to start with. No price, no pitch, no
footnote" -- a deliberately vague hint. That predates the attribution rule in open item 4, which requires a
factual reason clause in EVERY wall and explicitly names the 2-exercise cap as a capability wall. The vague
version is now wrong: it leaves Otto sounding like he only had two ideas rather than like the plan covers
two. Do not restore it. (Full rule: THE 2-EXERCISE CAP, IN FULL, above.)

Why the hint at all: a silent limit reads as Otto being weak rather than Otto being limited. The user
concludes the AI is thin instead of concluding there is a better version. The hint costs nothing and
prevents that read. It must stay genuinely neutral -- anything that sounds like a trailer for the paid
version is back to selling.

Once per conversation, maximum. If they ask again, do not repeat it.

---

## MINDFUL MODE (LOCKED)

⚠️ EARLIER DRAFTING OF THIS SPEC TREATED MINDFUL AS A NO-GO ZONE FOR BOTH BUILDERS. That was wrong and
Justin rejected it flatly. Mindful users are not fragile. Read what Mindful actually forbids:

> "Do NOT give calorie deficit math, weight loss framing, or a prescribed calorie or macro number."

That is the entire list. Three things, all about calories and weight loss.

- **Workout builder: IDENTICAL in Mindful.** Sets, reps and exercise order are none of the three
  forbidden things. No change, no softening, no special case.
- **Meal builder: same meals, same foods, one framing difference.** Balanced/Discipline may say "this
  gets you to about 150g protein, which covers your target." Mindful says "this is a solid
  protein-heavy meal with what you've got." State the food, not the target.

**Supporter buys the same thing in all three modes.**

⚠️ **PLAN LIMITS AND MODE BEHAVIOUR ARE TWO INDEPENDENT AXES. Do not read this section as contradicting the
free tier** (added 2026-07-30 with the OPEN ITEM 1 resolution). Mindful withholds PRESCRIPTIONS and deficit
math; it never withheld someone's own logged number, which is a fact. The free wall is not a mode decision
and applies identically to all three modes. So: a PAID Mindful user asking "how many calories did I eat
today" gets a straight answer with no Balanced redirect, and a FREE Mindful user hits the same wall a free
Balanced user hits. The Balanced redirect below exists ONLY for prescription questions.

More Mindful detail will be needed once the two builders are actually specced; this is the vibe, not
the final word.

### When a Mindful user pushes for numbers Mindful withholds
Precedent already exists in code: the Not Right Now faith tier tells users how to turn faith features
back on rather than cold-refusing. Same pattern.

- Otto NEVER caves. The moment he hands over deficit math, Mindful mode is decorative.
- Otto ALWAYS offers the door.
- No judgment, no "you picked this setting" (judgey -- rejected), no lecture.
- Navigation needs real descriptors, and per Otto's own KB rule it is "the settings icon", NOT "the gear".

✅ "Mindful mode keeps me off targets and deficit math. If you'd rather I get into the numbers, you can
switch to Balanced: open your Profile page, tap the settings icon in the top right, then Faith and Style."

If they keep pushing: state the path once more, plainly, move on. No escalation, no moralising.

### The line in Mindful: Otto states facts, he does not hand down verdicts or targets
- "How many calories did I eat today?" -> ANSWER IT. Their own logged data. Withholding someone's own
  number from them is indefensible.
- "How many should I eat?" -> prescription. Redirect + offer the path.
- "Am I eating too much?" -> asking for a VERDICT. Give them the facts to judge for themselves:
  "You've averaged around 1,850 a day this past week. The two weeks before were closer to 1,700."
  They draw their own conclusion. That is the whole point of Mindful, and it is more useful than a
  yes/no because it carries context.
- ⚠️ Do NOT falsely reassure either. Otto's prompt already forbids calling a below-average number
  "solid" or "a good rhythm". "No, you're fine!" is as much a verdict as "yes, too much."

---

## THE UNDEREATING SAFEGUARD -- ✅ RESOLVED 2026-07-30 (was the open decision at the top of this spec)

**THE ANSWER: BOTH, split by job.** The DETECTION is app-side, deterministic, no model involved. The VOICE
is Otto and Otto only -- there is no card, no notification, no other surface. **He never speaks first.**

⚠️ It is NOT "just Otto knowing the thresholds". Since OPEN ITEM 1, free Otto cannot see a single day of
food, so a knowledge-only version would protect paying users and nobody else. Unacceptable for a safety
feature. The app detects and hands Otto **ONE LINE** (a flag: this user's logged intake has been under the
line on 4+ of the last 7 qualifying days, plus the two numbers the copy needs). That is a flag, not their
food history -- it does NOT reopen the gated pipes, and it works identically on both tiers.

### THE GAP (why this exists at all)
`SPEC_calorie_floor.md` guards the target the app RECOMMENDS. Someone whose target comes out at a perfectly
healthy 1,800 and who then logs 900, 850, 1,000, 900, 780 across a week trips **nothing**. The app watches
the entire week happen and says nothing. That hole is the whole reason for this.

### ⚠️ THE TWO WOMEN PROBLEM (the thing that nearly sinks it -- Justin raised this, it is the core risk)
- **Woman A** logs everything and genuinely eats 900 a day.
- **Woman B** logs breakfast and lunch, cooks dinner, eats it, never reopens the app. She eats 2,200 and is
  completely fine.

**In the totals they are the SAME PERSON.** Any rule that looks only at calories per day warns them both,
and warning Woman B is worse than saying nothing -- she gets an eating-disorder message for being bad at
homework.

**FOUR SIGNALS ALREADY IN THE DATA that separate them** (verified: every food entry stores its `meal` slot
and usually a `timestamp`):
1. **Meal coverage -- the big one.** Woman B has ZERO dinner entries 6 days out of 7. Woman A still logs
   something at night, because the reason she is logging at all is that she cares about the number. A blank
   dinner slot every single day is a LOGGING pattern, not an EATING pattern.
2. **Time of the last entry.** Woman B's day stops at 1pm like a switch. Woman A's entries run into the evening.
3. **Weight -- the one that cannot be argued with.** 900 against an 1,800 target is a huge deficit and drops
   roughly 1.5-2 lb/week. A flat scale across 3-4 weeks means the log is wrong. Physics settles it. Use as
   CONFIRMATION, not as a trigger: not everyone logs weight and it is noisy week to week.
4. **Logging density.** Two entries a day vs five.

**BUT THE REAL ANSWER IS SIMPLER: THE APP NEVER ASSERTS THAT ANYONE IS UNDEREATING.** It cannot know that.
It knows what the log says. So the message is a QUESTION, not a warning. The four signals decide whether to
speak at all and which way the follow-up leans -- they are not needed to make the question safe.

### TRIGGER (decided)
- Fires on the **MODAL line** from `utils/calorieFloor.ts` (read from code 2026-07-30, matches the spec):
  **male whisper 1500 / modal 1200 · female whisper 1200 / modal 1000.** Sex unset -> female (stricter).
- **4+ of the last 7 QUALIFYING days.**
- ⚠️ **GROSS intake, NOT net.** The original proposal said net (food minus exercise) and that is WRONG:
  someone eating 2,500 and burning 1,200 has a net of 1,300 and would trip the female whisper line while
  eating plenty. Heavy exercisers would be flagged constantly.
- **A day does NOT qualify if:** it has NO food logged at all (⚠️ biggest false-positive source by far --
  counting an empty day as zero would flag every user who forgets to log for four days), it is marked
  EXCLUDED from averaging, or Vacation Mode covers it. The app already has those mechanisms; reuse them.
- **MINIMUM HISTORY:** at least 5 to 7 fully logged days in the window before the check may fire at all, so
  a user three days into the app never trips it.
- **NO INTERMITTENT-FASTING EXEMPTION.** Considered and rejected. 16:8 users eat normal totals inside their
  window and never trip it anyway; the ones who would trip it are doing genuinely long fasts, and asking
  that person once is fair. Exempting on a settings toggle would silently switch the safeguard off for a
  group who may need it. The conversation handles it (see branch 4).

### HOW IT SURFACES (decided -- Justin was firm: Otto never says anything unprompted)
**He does NOT speak first.** The flag sits there quietly and he raises it only when the conversation has
ALREADY gone near food, energy or the scale.
- ✅ SURFACES: "how am I doing on calories this week", "why am I so tired lately" (undereating is a real
  answer to that question, so raising it is not a swerve), "why isn't the scale moving", "what should I eat
  tonight".
- ❌ DOES NOT SURFACE: "how do I change my step goal", "how's my bench trending", or literally anything
  else. Ask him about the Bible reader and he says nothing about her food, ever.
- ⚠️ ACCEPTED CONSEQUENCE, stated once and settled: **somebody who never talks to Otto never hears
  anything.** That is the price of him never speaking unprompted, and Justin took that trade knowingly.
- 👍 This also removes a build: Otto has NO way to speak first today, and now he does not need one.

### THE WORDING (decided: fixed core, improvised lead-in)
Improvising the whole thing produces the normal range of model output, and on this subject one in ten being
wrong is too many. Real examples of what improvisation gives you: *"you should probably eat more"* (a
prescription, which Mindful bans outright), *"that's really low, are you okay?"* (alarm), *"you're probably
fine"* (false reassurance, which this spec explicitly forbids).

**THE FIXED SENTENCE (app-supplied, word for word, numbers already filled in by the app):**
> "Your log's been coming in around [N] a day this past week. Is that close to what you're actually eating,
> or are some meals not making it in?"

Otto writes the LEAD-IN so it fits whatever they asked; the moment he is on the subject, the words are the
app's. He may not shorten, soften or add to the fixed half. Examples of the lead-in doing its job:
- "Before I get into that, one thing. *[fixed sentence]*"
- "There's a version of this where the answer isn't what you'd expect, so let me ask first. *[fixed]*"
- "Could be a few things, and one of them's worth ruling out first. *[fixed]*"

✅ **NO MODE VARIANTS NEEDED.** The fixed sentence deliberately mentions no target and no comparison, so it
reads identically in Discipline, Balanced and Mindful. One sentence, three modes.

⚠️ **HOW THE NUMBERS GET IN, and this matters:** free Otto has no snapshot and no `[[stat:key]]` system, so
he cannot put a real number in a sentence. The APP renders the numbers into the copy before Otto ever sees
it. He receives a finished sentence and repeats it. Nothing about the OPEN ITEM 1 wall changes and no
tokens come back for free users.

### THE EIGHT BRANCHES (what actually comes back)
**FIXED COPY (app-supplied) -- only these two, because they carry medical-adjacent content:**
1. **"No, that's real."**
   > "Thanks for telling me. For context, your body runs through around [BMR] a day just keeping the lights
   > on, before you move at all. Eating under that for a stretch usually means coming up short on nutrients,
   > not only calories. Nothing to fix this second, it's just worth knowing."
   Then it STOPS. It does not ask why. It does not tell her to eat more. It does not circle back tomorrow.
5. **"Is that bad? Should I be worried?"** (the most dangerous branch -- she is asking for a VERDICT)
   > "Honestly, that's not mine to call. What I can tell you is the plain number. Your body runs through
   > about [BMR] a day before you move at all, and your log's been closer to [N]. A stretch like that
   > usually means falling short on nutrients as much as calories. If that's accurate and it keeps going,
   > it's worth a conversation with a doctor or a dietitian."
   ⚠️ Cannot diagnose her, and cannot falsely reassure her either -- "no, you're fine!" is as much a verdict
   as "yes, too much."

**RULES, NOT SCRIPTS (a scripted "got it, thanks for telling me" would sound worse than something he writes):**
2. **"I don't log dinner."** Back off. ONE line, framed as what SHE loses, never as what the app wants:
   missing meals drag her averages, Day Score, weekly/monthly summaries and EvR report down with them, so
   the app ends up telling her a story about a week she did not have. Direction: *"Good to know. Worth
   mentioning that missing dinners will drag your averages and your Day Score down with them, so the app
   ends up telling you a story about a week you didn't actually have. No pressure either way."* No follow-up,
   no reminder to log tonight, no asking again tomorrow.
3. **"I'm cutting on purpose."** She is an informed adult and `SPEC_calorie_floor.md` explicitly respects
   that ("warn + consent, NEVER hard-block"). State the floor fact ONCE, no argument, no talking her out of
   it, done.
4. **"I've been sick / traveling / fasting."** Back off completely. No cleverness, no follow-up.
   ⚠️ A FASTING answer buys a MUCH longer quiet period than the others -- her answer is not going to change
   next month.
6. **"Why do you care?"** Drop it instantly. Do not defend the question, do not explain why he asked.
7. **She ignores it and asks her original question.** Answer her question. Never mention it again.
8. **Anything that trips CRISIS SCREENING.** The existing crisis path takes over completely and this whole
   thing stops. ⚠️ Note explicitly: the safeguard NEVER escalates on its own. Someone saying "yes that's
   real" is not a crisis, it is an adult describing her week. Only her own words may trigger the crisis path.

### COOLDOWN (decided)
- **Spent when SHOWN, not when answered.** She sees it once, the cooldown starts either way, and he never
  repeats it in that conversation or the next.
- **Re-arms once the cooldown expires IF the pattern is still there.** Ignoring it is not an answer, so it
  should not buy permanent silence -- but it is not permission to nag either.
- A safeguard that asks again next Tuesday is nagging, and nagging is how someone starts hiding their
  logging from the app.

### DISCLAIMER -- ✅ ALREADY SATISFIED, no work needed (checked 2026-07-30)
Otto's chat already carries a permanent inline disclaimer under every message: *"Otto is AI and can make
mistakes. Not a substitute for a doctor or professional."* The build standard's inline requirement is met,
and a first-use MODAL is not appropriate in a chat. Do not add one.

### ✅ WHERE THIS LIVES: THE PLAN ITEM **L** (assigned 2026-07-30)
The detection is app-side code, so this is no longer purely an Otto item. It is NOT part of G (that guards
the recommended TARGET; this guards actual INTAKE), though it inherits G's thresholds from
`utils/calorieFloor.ts`. Sequenced next to G, since they share thresholds and philosophy.

### DOC SYNC (standing rule, do not batch)
This is exactly the kind of quiet feature that gets missed. When it ships, `tooltipRegistry.ts`,
`data/tutorials.ts` and Otto's knowledge base (`functions/src/assistantAppKnowledge.ts`, redeployed) all
need to know about it in the SAME session.

⚠️ STILL OPEN, inherited from the original draft: the exact threshold and wording deserve a dietitian's
eyes. This is an App Store consideration as well as an ethical one -- Apple's guidelines have provisions
about apps that could encourage disordered eating, and a calorie tracker with an AI coach sits squarely in
that territory.

### RELATIONSHIP TO `SPEC_calorie_floor.md` (separate feature, shared numbers)
That spec (DESIGN LOCKED 2026-07-08) guards the **target the app RECOMMENDS** -- it fires when the
calculation would suggest e.g. 915 kcal to a small woman on an aggressive pace. It does NOT cover what
someone actually EATS. This safeguard is that gap: logging ~900/day for a week regardless of target.

⚠️ **G IS MOSTLY BUILT** (discovered 2026-07-30): `utils/calorieFloor.ts` + tests + `CalorieFloorModal.tsx`
exist and the Profile tab is wired. Only ONBOARDING is missing, and it currently SILENTLY CLAMPS at 1,200
instead. See THE PLAN item G in the roadmap. The thresholds below were read from that working code, not
from a spec.

**Reuse its thresholds. Do not invent new ones.** Consistency matters more than precision:
- MEN: whisper below 1500 · modal below 1200
- WOMEN: whisper below 1200 · modal below 1000
- Sex unset -> fall back to the WOMEN'S (stricter) numbers.

Independently corroborated 2026-07-29: these are the NIH figures, and MyFitnessPal enforces 1200/1500 as
a goal floor and warns at 1000/1200 NET. See sources at the bottom.
⚠️ We deliberately do NOT copy MFP's use of NET here -- see the TRIGGER section above for why.

**Inherit its philosophy too, which also settles the "is Otto too soft" argument:**
> "warn + consent, NEVER hard-block. The real number always shows. An informed adult who deliberately
> picks an aggressive cut is respected."
It explicitly rejects MyFitnessPal's hard clamp as paternalistic. Otto inherits that stance: inform,
never withhold, never lecture.

### Two different things, do not conflate them (this caused real confusion in session)
1. **Someone ASKS "am I eating enough?"** -> a normal question. Answer it plainly with their real
   numbers, no eggshells, no swerve, in any mode. Usually the most genuine "I want to do better"
   question there is. ⚠️ Note this is a SUPPORTER answer now -- a free user asking it hits the OPEN ITEM 1
   wall and gets pointed at the Stats tab.
2. **A sustained PATTERN nobody asked about** -> the rare case warranting care, and the subject of
   everything above.

Only #2 needs the careful treatment. Making Otto precious about #1 is the failure mode.

⚠️ WORTH SITTING WITH: Mindful is exactly the mode someone with a difficult relationship to food would
choose. The users most likely to need Otto to say something are the ones whose mode tells him not to.
That is why the safeguard overrides the mode, the same way crisis detection does. (In practice the fixed
sentence needs no mode variant at all, because it mentions no target and no comparison.)

---

## SEQUENCING (LOCKED, and Justin was emphatic)

**ALL OF IT SHIPS BEFORE LAUNCH. There is no v1/v2, no phase 2, no "add it later".**

Two reasons, and the first is the one that matters:
1. **Adding capability later is fine. Taking it away is a betrayal.** Three of the Supporter items are
   free today. Gating them post-launch punishes existing users.
2. If a Supporter tier exists at launch it must be worth paying for AT LAUNCH. Shipping a thin version
   and filling it in later means the first wave sees an empty perk and decides Supporter is not worth it.
   You do not get that first impression back.

Do not put version numbers or timelines in front of Justin on this. He will decide what waits.

---

## HOW THIS RESCUES THE 7-DAY TASTE

`SPEC_monetization.md` (agreed 2026-07-28) has new accounts running on FULL SUPPORTER limits for 7 days,
then stepping down. **Specced, NOT built** -- no trial code exists anywhere, and Otto's KB currently
still tells users "no free trial."

That spec carries this warning:
> "IT IS AN ESTIMATOR TASTE. Free Otto is 10/day and most people send one or two, so for the vast
> majority the taste gives them nothing they notice and the step-down takes nothing away."

**That warning is now obsolete, in a good way.** It was true when Otto's only perk was message count.
Under this spec the taste becomes: for seven days Otto knows your numbers, builds your workouts, builds
your meals. Then it stops. A real before-and-after -- which is exactly the conversion mechanic Justin was
counting on when he said users "get a 1 week taste of the whole thing."

TO UPDATE IN SPEC_monetization.md: that warning block, and the step-down copy, which currently only
mentions estimates dropping to 5/month and Otto to 10/day.

---

## SCOPE: OTTO ONLY (LOCKED)

Justin, explicitly: **"we are only discussing otto right now. arent we keeping the limits and walls as is
on all the other AI?"** Yes. Halo, the AI Meal Estimator and Smart Coach limits are UNCHANGED by this spec.
Halo's caps moved on 2026-07-29 for unrelated reasons (see the roadmap) and are settled.

**Otto's own caps stay 10 free / 30 Supporter.** Deliberately NOT cut when Halo's were, because Otto
carries onboarding -- he is better than the tutorials, and a first-week user genuinely may ask 8-9
questions in a sitting. Hitting a wall there loses the user at the worst possible moment.

---

## ⚠️ THE 7-DAY TASTE IS LOAD-BEARING FOR THIS WHOLE SPEC

Asked directly whether free Otto is still good enough that a free user LIKES him, Justin's answer was:
*"i mean he is still useful free. they get a 1 week taste of the whole thing when they finish onboarding
so they will hopefully see the differnce."*

**So the acceptability of the free tier rests on the taste existing.** The taste is specced but NOT BUILT.
If it does not ship, free Otto being thinner than today stops being a considered trade and becomes a
straight downgrade with nothing to offset it.

**Treat the taste as a hard dependency of this spec, not a nice-to-have alongside it.**

---

## PROMPT / KB CHANGES THIS FORCES (do not miss these)

1. **Otto's KB rule on the paid tier directly contradicts this spec.** It currently reads: *"NEVER nag,
   pressure, or bring it up unprompted -- only discuss it when the user asks."* That was correct when
   nothing was gated. Now he hits walls and must say something. Rewrite it to the HOW OTTO SELLS rule
   above -- which is still "never unprompted", just with "the user asked for more" as the one trigger.

2. **The data-honesty block needs a free-user variant.** Otto's prompt carries extensive rules about
   writing `[[stat:key]]` tokens, only referencing keys present in the snapshot, and never inventing a
   number. If free users get no snapshot, telling him to use tokens he does not have invites exactly the
   confabulation those rules exist to prevent. Free Otto needs his own version of that block: no tokens,
   no personal numbers, point at the app instead.

3. **"No free trial" is currently in the KB** (`SUPPORTER ... A recurring subscription, no free trial`).
   That becomes false the moment the 7-day taste ships. Update both together.

4. Both KB copies must move in step -- `functions/src/assistantAppKnowledge.ts` (the bundled one the
   function actually uses) and `ASSISTANT_APP_KNOWLEDGE.md` at the repo root. ⚠️ They have ALREADY drifted
   badly: the root copy has no monetization section at all despite a header comment insisting they match.

---

## OPEN ITEMS -- ✅ ALL SIX RESOLVED 2026-07-30 (kept in place as the record of what was decided and why)

### 1. ✅ RESOLVED 2026-07-30 -- HARD GATE, LOCKED. ✅ **BUILT + DEVICE-VERIFIED 2026-07-31.**

> **BUILD RECORD (batch 2 of THE PLAN item B).** Verified on device in BOTH directions, which is the part
> that actually needed proving: free users lose the right things and Supporters lose nothing.
> - **ENFORCED TWICE.** `components/AssistantChat.tsx` does not BUILD the snapshot or the five gated
>   attachments for a non-Supporter, and `functions/src/appCompanion.ts` discards `dataSnapshot` again using
>   the SERVER's own membership record. Trusting the client here would hand out a paid feature.
> - ⚠️ **THE FREE EXTRAS TRAVEL IN THEIR OWN FIELD (`freeContext`), NOT INSIDE `dataSnapshot`.** The first
>   attempt had the server discarding the whole data block for free users, which also stripped ACHIEVEMENTS
>   and JOURNAL -- the two things this item deliberately keeps free. Caught before deploy. Anything that must
>   survive for free users cannot be smuggled inside the gated field.
> - **The exercise-name list is now decoupled from PRs** (`buildExerciseNamesIfRelevant` in
>   utils/companionPRs.ts). It used to vanish for anyone with no logged PRs -- brand-new users and
>   cardio-only users, exactly the people most likely to ask about a half-remembered exercise. This item had
>   already flagged that as needed; it is done.
> - **`statValueMap` is deliberately EMPTY for free users**, so `substituteStats` strips any stray
>   `[[stat:key]]` rather than rendering a wrong number. Belt and braces behind the prompt rules.
> - ⚠️ **TRAP 2 HAPPENED, EXACTLY AS PREDICTED, AND THE FIX IS AN INSTRUCTION NOT MACHINERY.** Otto wrote
>   "Your target is per day" and "Your target is," -- a placeholder with nothing to substitute, deleted,
>   leaving a hole. Cause: goals stay FREE (they live in the CONTEXT block), but Otto applied the snapshot's
>   placeholder rule to them. Fix: the free-tier block now says the placeholder rule applies ONLY to the
>   snapshot, that goals are plain text to be read straight out, and shows him the failure so he knows what
>   he is avoiding. **DO NOT wire the placeholder system up for free users** -- this item removed it on
>   purpose so there is nothing for him to reach for.
> - **The free-tier block lives in the VOLATILE half** and is written as the second BRANCH of the data rules,
>   not as an override of them. A block that contradicts an earlier instruction is a coin flip; a block the
>   earlier instruction explicitly hands off to is not. It also keeps ONE cached copy for all users
>   (SPEC_otto_routing.md).
> - ⚠️ **`DEV_UNLIMITED_UIDS` temporarily holds Justin's uid** so free-tier testing is not capped at 10
>   messages. It lifts the CAP only, not entitlement. **MUST BE EMPTY AT LAUNCH** (already on the checklist).

**Free users are never sent their logged data.**

**THE DECISION:** structural gating, not instructions. Free users are not sent the data snapshot or the
gated on-demand attachments at all. "Know but don't say" was rejected: models cave when pushed, and a wall
made of willpower is not a wall. If the numbers were never sent there is nothing to leak, and no prompt
trick, roleplay or rephrasing can extract them.

⚠️ **This is a CONVERSION move, not a cost move.** The snapshot is ~1,200 tokens. The real cost lever is
item H (routing), where the 18k app map is ~38% of the entire AI bill. Do not expect savings here.

**✅ THE SPEC'S OLD CAVEAT IS NOW CLOSED.** "Not verified that removing it breaks anything else" -- verified
2026-07-30. Only TWO things build the snapshot: `components/AssistantChat.tsx` (Otto) and a dev-tools row in
`app/settings.tsx` that dumps it for inspection. Halo does not use it. Smart Coach does not use it. Nothing
else consumes it. Removing it for free users breaks nothing anywhere.

#### There are THREE pipes carrying user data to Otto, not one
1. **The always-on snapshot** (`utils/companionStats.ts`) -- today's nutrition vs goals, 7-day averages,
   sodium/sugar, last night's sleep, weight, steps, and HealthKit recovery signals.
2. **Profile + goals** (built in `AssistantChat.loadUserContext`) -- name, calorie target, macro goals,
   water/step/sleep goals, goal weight, pace, PLUS coaching mode and faith tier.
3. **Seven on-demand attachments** that only fire when the message looks relevant.

#### FREE OTTO KEEPS
- **Pipe 2 in full.** Rule: **"Otto knows what you SET. He doesn't know what you DID."** Targets and goals
  sit on the user's own Profile screen; selling someone their own settings back is petty, and free Otto's
  main job (app help) is much better when he knows what their target actually is.
  ⚠️ Coaching mode + faith tier must ALWAYS be sent or he behaves wrong for Mindful / Not Right Now users.
- **The exercise-name list** (currently bundled inside the PR attachment). It is what stops Otto implying a
  made-up exercise is real. Not a perk, a guardrail.
- **Achievements** (#6) -- earned badges AND progress counters.
- **Journal + prayers** (#7) -- in full.
- All app knowledge, and all general nutrition / training / sleep guidance.

#### FREE OTTO LOSES
The snapshot, plus attachments #1-#5: lift PRs, recent workouts, food log history, sleep + recovery, body
measurements. (Current weight goes with the snapshot; goal weight stays, see the oddity note below.)

#### The seven attachments, decided one at a time
| # | Attachment | Call | Why |
|---|---|---|---|
| 1 | Lift PRs + session history | **CUT** (keep the exercise-name list) | Numbers are the perk; the name list is a guardrail |
| 2 | Recent workouts, 30 days | **CUT** | Biggest attachment (7,000-char budget), the clearest "your logged behaviour" |
| 3 | Food log history (+ water) | **CUT** | This is what the paid meal builder (F) runs on. Structural, not just tidy |
| 4 | Sleep + recovery | **CUT** | Value is uneven: users without Apple Health have almost nothing in this pipe |
| 5 | Body measurements | **CUT** | Smallest pipe, saves almost nothing, but consistency beats a carve-out |
| 6 | Achievements | **FREE** | The retention engine, and it points at new (i.e. free) users |
| 7 | Journal + prayers | **FREE** | Faith is never paywalled |

**Water was considered for a carve-out and CUT.** One exception makes the rule fuzzy for almost no gain,
and water sits on the Home card anyway.

**#6 is NOT a workaround for the workout wall (verified).** `messageWantsAchievements` requires badge /
milestone language or a very specific goal-day tally phrasing. "How many days have I worked out" does NOT
reach it -- that pulls the (cut) workout pipe and walls correctly. The only leak left is the phrasing "how
many workout goal days do I have", which is narrow enough to ignore.
➡️ RULE FOR B: Otto STATES a counter, he never INTERPRETS it. "62 workout days, the 100 badge is next" is
fine. "62 days, you've been really consistent" is a verdict about behaviour he cannot see (62 days could be
four straight months or two scattered years).

**#7 was NOT split by category.** Keeping the faith categories free and gating Personal/Study/Fitness was
rejected: same journal, same week, half of it remembered is arbitrary and the user would have to learn a
rule about their own diary. Note this pipe is ALREADY faith-tier gated for "Not Right Now" users; that gate
is unrelated to membership and stays.

#### NO DEPTH CAP on free Otto's general answers
Considered (mirroring the max-2-exercises rule) and rejected. The gap is already enormous without one, the
model complies unreliably with length limits so it would fire on some answers and not others (reads as
broken, not tiered), and the saving is a couple hundred output tokens.
⚠️ Free Otto must NEVER interrogate the user for data he cannot see ("what's been going on lately?"). That
burns one of their 10 daily messages to collect something he still cannot verify.

#### THE FOUR TRAPS
**Trap 1 -- THE HALF PICTURE (the important one).** Free Otto knows the target and not the behaviour, and
the danger is he reasons across the gap. "You're set to 150g, so you're in good shape" treats a target as
an intake. **A setting is NEVER evidence of behaviour.** Fix is three parts:
1. **The APP states what it withheld, in every request.** A fact in front of him on every message beats a
   policy he must remember 30 turns in. Same principle as the app supplying real numbers.
2. **ONE general principle in his instructions, not a per-subject list.** A list teaches him the list is
   the whole job. (A rule like this half-exists already: his prompt tells him to say he doesn't have a
   metric rather than guess when it is absent from the snapshot. This extends it.)
3. **A test list, written BEFORE the change** (see TESTING below).
   FALLBACKS if testing fails: narrow the free side further (cut goal weight), or take the wording out of
   his hands for the failing question shapes -- the crisis pattern, where the model detects and the APP
   supplies fixed copy.

**Trap 2 -- THE [[stat:key]] PLACEHOLDER. VERIFIED SAFE, no decision needed.** `substituteStats()` in
AssistantChat.tsx STRIPS unknown keys; raw bracket code can never render. Worst case is a hole in a
sentence ("Your protein has averaged, a bit under target"). Unknown keys are logged to
`pj_companion_stat_flags` (last 100).
➡️ BUILD NOTE: free Otto's instructions OMIT the placeholder rules entirely. Not "don't use it" -- absent.
A "don't do X" rule keeps X in his head.
➡️ TESTING WIN: that flags log is the OBJECTIVE measure. Run the test list as a free user, then read the
log. Empty means he never once reached for a number he didn't have. Beats eyeballing 20 answers.
⚠️ UNVERIFIED: whether an in-app dev row exists to READ that log. If not, it is a small tool worth building
before testing.

**Trap 3 -- MINDFUL vs THE FREE WALL. Resolved: NO CARVE-OUT (option A).**
The confusion here is that plan limits and mode behaviour are **two independent axes**. Mindful never
withheld someone's own logged number (that is a FACT); it withholds prescriptions and deficit math. A PAID
Mindful user asking "how many calories did I eat today" gets a straight answer with NO Balanced redirect.
A FREE Mindful user hits the same wall a free Balanced user hits, for a reason that has nothing to do with
their mode.
⚠️ Option B (today's numbers free, history paid) was genuinely defensible -- "he sees what's on your Home
screen, not your history" is a clean line, not a slope. REJECTED because it forces the placeholder system
to stay ON for free users, keeping the leak surface and creating a second partial data-honesty variant to
maintain. Trap 2 gets messier, not simpler.
❌ Option C (Mindful-only carve-out) rejected on sight: data access varying by coaching style is strange
and anyone could switch modes to unlock it.

**Trap 4 -- DAY 8 OF THE TASTE.** Separate from open item 2 (do ARTIFACTS survive); this is about Otto
still KNOWING them. He has no memory between messages, so without help day 8 reads as "Otto broke", not
"my week ended". The APP knows the taste ended, so the app supplies the flag.
- **Fires on the first WALL after the step-down, not the first message.** An app-help question on day 8
  gets answered normally with no mention of anything.
- **Fires ONCE, ever.** After that, walls get the normal short decline.
- **NO pre-check on whether they used the data side during their week.** Justin's call: for someone who
  never noticed, finding out they had the full version reads as intrigue and is a fair sales moment.
- Copy direction (final wording lands in B):
  > "Your first week came with the Supporter plan on us, and reading your log was part of that. I'm on the
  > free version now, but Tuesday's meals are still sitting on your Log tab whenever you want them."
  Both jump buttons: Log tab + Support the Mission.

**⚠️ TRAP 4b -- THE LAPSED SUPPORTER (found while walking the timeline).** A Supporter who cancels hits the
identical wall, and the day-8 message would tell a four-month paying customer about a free week from March.
**Two separate one-time messages, tracked separately**: "taste ended" and "plan ended".
- Lapsed copy direction: *"Reading your log came with the Supporter plan, and yours has ended. Tuesday's
  meals are still on your Log tab whenever you need them."* No re-explaining what the plan is (they bought
  it once), no "we miss you", no pitch.
- ⚠️ **Fire on ENTITLEMENT actually ending, NOT on the cancel event.** Apple subscriptions run to the end of
  the paid period, and billing retry / grace periods make someone look cancelled while still entitled.
  Keying off real entitlement state also means a cancel-then-resubscribe before expiry correctly fires
  nothing at all.
- ⚠️ The message can land WEEKS after the lapse (whenever they next hit a wall), so the copy must be
  timing-neutral. Never "just ended" or "this week".

#### FREE-TIER VOICE (direction; final copy is B)
- Free Otto keeps his personality. He must never read as broken or thin.
- **ATTRIBUTION IN EVERY DECLINE.** One factual clause, e.g. "on the free plan". No price, no CTA. A silent
  limit reads as Otto being weak; a named limit reads as there being a better version. (Same reasoning
  already locked for the 2-exercise cap.)
- ⚠️ Warmth must NEVER slide into implying he saw data. "Looked like a solid week" while blind is a
  fabricated verdict.
- Declines need a per-mode pass: Discipline flatter, Mindful carries no performance framing.
- ⚠️ **NEVER write "Supporter" bare.** Always "the Supporter plan" / "Supporter membership" / "Supporter
  tier". And any message that references the membership carries a Support the Mission jump button.
- **A wall is any moment Otto can't do something BECAUSE they are free.** Two kinds: DATA walls (the six cut
  pipes) and CAPABILITY walls (the builders, and the 2-exercise cap). A question needing no personal data
  is NOT a wall and gets no attribution line -- attribution appears when he can't do something, never as a
  tagline.

#### CARRIED INTO ITEM 4 (the pitch rules)
- One real pitch per conversation MAX, fired by EITHER the user asking for more OR their **third wall in
  that conversation**. Justin was on the fence that "asks for more" alone means most users never hear a
  pitch at all; the counterweight is that Otto is one of six conversion surfaces, not the closer.
- **The APP counts the walls and passes a flag** saying a pitch is allowed. Otto has no memory between
  messages and would guess.
- ⚠️ Week two is when wall-hits SPIKE, right after the app has already announced the step-down. Consider
  suppressing the pitch trigger for a window after the step-down or it reads as nagging.
- Still open there: never pitching existing Supporters, and the exact wording.

#### BUILD NOTES FOR B
- **Day Detail jump button that opens a specific date.** ✅ **BUILT + DEVICE-VERIFIED 2026-08-01** (commits
  d9200fa, a12349f, 9eea7af). Needed
  because a vague "what did I do yesterday" attaches training + food + sleep at once, so gating them
  individually gives a free user THREE STACKED WALLS in one reply -- the point where free Otto stops reading
  as limited and starts reading as useless.

  **1. DESTINATION: Day Detail. Not Day Summary, not the Calendar.** ("100% day detail" -- Justin.) It shows
  the actual logged contents of a day, which is what they asked for; Day Summary is a recap/scoring view.
  The on-screen title really is "Day Detail", so the wording below is not internal jargon.

  **2. WHAT HE SAYS -- one reason clause, then what is waiting there. Never three declines:**
  > I can't see your logged days on the free plan. Yesterday's food, training and sleep are all together on
  > your Day Detail screen.
  The three things are named as what is ON that screen, not as what he cannot do -- it reads as a handoff
  rather than a refusal.
  ⚠️ **This must NOT hijack specific questions.** "What did I eat yesterday" keeps its existing single food
  wall pointing at the Log tab. Verified in code: `isDayRecall` only fires on a whole-day question with NO
  dimension word, so this is already true and must stay true.

  **3. THE APP RESOLVES THE DATE, NOT OTTO.** On the free plan he cannot see their data, so a guessed date
  sends someone to an empty day and the app looks broken. The app always knows today. A bare weekday resolves
  to the MOST RECENT one (Justin, 2026-08-01). If it cannot pin the date down, the button opens TODAY, which
  has a date picker one tap away.

  **4. BUTTON LABEL: "Tue, Jul 29" -- weekday AND date.** ⚠️ Justin caught the reason: a bare "Tuesday" on a
  Wednesday could be yesterday or eight days ago, and the user only finds out after tapping. **The date on
  the label is not decoration, it is the safety net that makes imperfect date-guessing harmless** -- English
  is genuinely ambiguous here ("last Tuesday" means different things to different people), no parser gets it
  right for everyone, and seeing the real date before tapping is what makes a wrong guess a non-event.

  **5. ONE WALL, not three.** One question, one answer. Three would mean a single "what did I do yesterday"
  earns a pitch on its own. Already true in code (`wallCountRef` increments at most once per message); this
  is a confirmation, not a change.

  **6. BOTH TIERS GET THE BUTTON.** Jump buttons are a free-for-everyone capability, so removing one from
  paying users would be backwards, and tapping through to the real day is useful even after a good summary.
  ⚠️ **A SUPPORTER MUST STILL GET THE FULL ANSWER** (Justin, emphatically). His knowledge already forbids
  deflecting a day question to Day Detail when he has the data; the button is an ADDITION underneath, never
  a substitute. **PASS/FAIL: measure his Supporter answers with the button against without. If they get
  thinner, it does not ship that way.**

  ⚠️ **BUILD TRAP, found while agreeing this.** `app/day-detail.tsx` carries a comment saying Day Detail is
  ALWAYS a modal/sheet opened from Home or Stats, and that **the `/day-detail` page route is never navigated
  to**. It exists and accepts a `date` param, but nothing has ever used it that way. A jump button pointing
  at it would be the first thing ever to, and it may open a sheet with no sensible way back (it is built
  around a close handler that assumes a host screen). Either make that page route genuinely work standalone,
  or send the button to Home with a param that opens the sheet the way the app already does. The second is
  more faithful to real behaviour.

  ⚠️ **CONFIDENCE, split honestly.** The button's DATE is deterministic app code and will be tested
  exhaustively offline (including a weekday name on that same weekday). Otto's QUOTED NUMBERS for a
  Supporter are model reasoning over dated blocks -- a known weak spot for a small model, pre-existing rather
  than new. On the test list; if he quotes the wrong day's numbers that is its own bug.

  **ACCEPTED:** if they ask about a day with nothing logged, the button opens an empty screen. Otto cannot
  know that (no data), and it is identical to tapping the calendar icon themselves.

  #### BUILD RECORD (what actually shipped, and the three bugs device-testing found)

  **1. IT OPENS AS A CENTERED MODAL OVER THE CHAT. It does NOT navigate.** The first build did
  `router.push('/day-detail')` and that was wrong on device: Day Detail is a **centered popup, NOT a bottom
  sheet** (Justin corrected the terminology, and he does not want bottom sheets anywhere), so as a full page
  it kept the handle pill and X with nothing to close back to, and the Otto FAB sat on top of the workout
  rows. It is now rendered inside the chat's own modal layer the way Home raises it -- which fixed the
  chrome, the FAB overlap and the bottom padding in one change, and the user keeps their place in the
  conversation. ⚠️ Rendered as a plain overlay INSIDE the existing Modal, deliberately, rather than stacking
  a second native Modal on iOS.

  **2. THE DETECTOR MISSED "HOW WAS MY DAY ON TUESDAY".** `isDayRecall` needed "what" + a past-tense verb, a
  short message, or certain lead-ins; that phrasing is six words and uses "how was", so it matched none.
  ⚠️ **The button was the small half of this.** The same detector decides whether a SUPPORTER gets that
  day's data attached at all, so the phrasing was silently costing paying users their answer. Now also
  matches "how was / how were / how did / how has".

  **3. HE INVENTED A BIRTHDAY AND CITED THE PROFILE FOR IT.** Asked about "the day after my birthday" he
  answered "yours is in November based on your profile". Two separate faults:
  • **The honesty one, fixed in the STABLE prompt so it covers both tiers:** never state a personal fact that
    is not in the CONTEXT block, and above all never attribute an invented detail to a source ("based on your
    profile", "your logs show"). Citing a source turns a guess into something the user believes.
  • **The data one: the birthday was in `pj_profile` all along and simply never sent.** Onboarding requires
    it. It is now included, with the AGE COMPUTED APP-SIDE -- he is measurably bad at date maths, same reason
    the jump button resolves its own date. Verified after: "Your birthday is September 5, so the day after
    would be September 6", and "How old am I" answers correctly.

  **4. "WHAT DID I DO" vs "WHAT DID I EAT" IS A DELIBERATE SPLIT** (Justin's call, 2026-08-01, after seeing
  it happen). "What did I do on [day]" means ACTIVITY: answer the training in full, then let the button carry
  the rest of the day. "What did I eat" gets the food answer in full. Reciting training + food + sleep +
  steps in one reply is a wall of text, and the button gets them all of it in one tap. ⚠️ Written into the
  app knowledge because his existing rule says never to point at Day Detail when he has the data -- this is
  the ONE case where doing it alongside a real answer is correct, and without writing it down it would drift.

  #### FOLLOW-UP FIXES FROM THE SECOND ROUND OF DEVICE TESTING (2026-08-01, commits 7ced079 + 6f7ffe5)

  **5. ⚠️ A NIGHT IS FILED UNDER THE DAY YOU WOKE UP -- EVERYWHERE IN THE APP.** HealthKit is read from 6pm
  the previous evening through noon and stored under the MORNING date; Day Detail, the Sleep & Recovery hub
  and the trend charts all key nights that way (verified in code, the app does NOT contradict itself). So
  **"Tuesday night" lives under WEDNESDAY** and **"last night" lives under TODAY**. Justin spotted this from
  a screenshot. The resolver now shifts a NAMED night to the wake day, and Otto's knowledge tells him to say
  so in a clause -- he was previously telling people to "step back to Tuesday" while the button correctly
  opened Wednesday, so following his words found the wrong night.
  ⚠️ Only shifted when the text says **"night"**. "How did I sleep on Tuesday" means the night they woke ON
  Tuesday and is left alone. English does not distinguish these, so no rule gets both.

  **6. ⚠️ DO NOT USE `messageWantsSleep` TO DECIDE IF SOMETHING IS A SLEEP QUESTION.** It ends with "...or is
  this any whole-day recall", which is right for its real job (attaching sleep data to "what did I do on
  Tuesday" is cheap and useful) and badly wrong as a signal for the wake-day shift -- it made **"what did I
  do last night" resolve to TODAY**. Use `messageIsAboutSleep`, which is sleep words only.

  **7. NO BUTTON WHEN THE DAY CANNOT BE PINNED DOWN.** The agreed design was "fall back to today", and on
  device that was worse than nothing: "how did I sleep last week" offered a button labelled with TODAY's
  date. A range is not a day. ⚠️ **This also protects the invariant that the label always names the date it
  opens** -- that is the safety net that makes an imperfect date guess harmless, and a fallback button
  quietly breaks it.

  **8. ⚠️ "SLEEP & RECOVERY HUB" CONTAINS THE WORDS "RECOVERY HUB".** The route-trigger list had
  `recovery hub` under `recovery_hub`, so EVERY sleep answer -- which names the hub by its full name --
  handed the user a button onto the RECOVERY tab. `recovery_hub` now only claims phrases that cannot appear
  inside the hub's own name (`recovery tab`, `recovery score`, `recovery data`, `recovery graph`) and
  `sleep_hub` claims the hub name. **Do not "tidy up" that list by adding `recovery hub` back.**

  **VERIFIED ON DEVICE:** correct dates on "yesterday", a weekday name and an explicit date; modal opens and
  closes cleanly; Supporter gets the full answer AND the button; his quoted food totals matched the Day
  Detail screen exactly (1,738 cal / 154g / 141g / 65g), and two different days returned two different sets
  of numbers, so he is genuinely reading the day he was asked about.
- **Decouple the exercise-name list from PRs.** `buildPRContextIfRelevant` returns null when the user has no
  backed PRs, so the name list never ships for a brand-new user or anyone who only does cardio -- exactly
  the people most likely to ask about an exercise they half-remember. Pre-existing, but our guardrail leans
  on it.
- **Free Otto's data-honesty block is its own variant**: no placeholder rules, no personal numbers, point at
  the app instead.
- **"Describe, never rank"** applies to BOTH tiers, not just free: Otto explains how a food behaves and never
  calls it good or bad, and never ranks or judges a body. This is a content rule, not a tiering rule -- a
  Supporter asking "is white rice bad" carries the same risk. Assembling foods into a meal or a day is an
  ARTIFACT and stays paid on both tiers until F exists.
- **Walls COUNT against the 10/day cap.** Considered making them free; rejected because a wall reply is
  still a real API call, so free walls create an uncapped cost path, and a wall still answers them and hands
  over the right screen.

#### ACCEPTED LOOPHOLE
A free user can TYPE their own numbers into the message ("my arms are 15.2, up 0.8 since March") and get
personalised advice. Not a leak -- the app revealed nothing. Left open, same call as the accepted rephrasing
loophole. Artifacts stay locked regardless.

#### KNOWN ODDITY, ACCEPTED
Goal weight stays free (pipe 2) while current weight is cut (snapshot), so Otto knows the destination and
not the position. Consistent with "knows what you set", and the clearest example of why trap 1's rule
matters.

#### TESTING (non-negotiable -- Justin is the ONLY tester)
All 11 TestFlight testers hold the granted yearly `supporter` entitlement, so **not one of them can see the
free tier**. Justin tests both states himself across two accounts (jtharmke, justin.harmke).
➡️ The test list is the ONLY verification this will ever get. ~20 questions spanning food, sleep, training,
weight, measurements, achievements and faith, run on BOTH tiers, written BEFORE the change so it isn't
shaped to pass. Include the pushy ones: *"roughly where am I at?"*, *"just ballpark it"*, *"you know me,
guess."* Those are where it breaks if it breaks. Then read `pj_companion_stat_flags`.

### 2. ✅ RESOLVED 2026-07-30 -- artifacts SURVIVE a downgrade, permanently. But the CAPS need splitting.

**THE DECISION: anything Otto built is theirs permanently.** A downgrade never removes it, hides it, or
locks it. This covers BOTH ways someone lands on free: the 7-day taste ending, and a paying Supporter
cancelling months later. Same rule.

**WHAT AN ARTIFACT IS:** a thing Otto MADE that persists in storage after the conversation ends -- a workout
in the Workout tab (a day's program, or saved into the weekly template), meals in the log or the saved-meals
catalog, and possibly a custom exercise (see open item 3). **What it is NOT:** anything he merely SAYS.
Advice, explanations, a couple of exercise suggestions. Those vanish with the conversation, which is exactly
the line THE CORE PRINCIPLE already draws.

**WHY IT ISN'T REALLY A DEBATE:** the betrayal rule (adding capability later is fine, taking it away is
not), SPEC_monetization's step-down copy already PROMISES it in writing, the DATA INTEGRITY rule, and above
all it would be incoherent. Otto builds her a push day Wednesday. Thursday she performs it and logs every
set, and her top bench set becomes a PR. To claw that artifact back on day 8 you would delete a workout she
already did, orphaning the sets logged against it and possibly the PR that came out of it. Nobody would
design that.

⚠️ **SURVIVING IS NOT THE SAME AS BEING ABLE TO MAKE MORE.** On day 8 she keeps everything and Otto stops
building. That part is clean. What is NOT clean is what happens when things built during her week exceed
the free CREATION caps (item C), and that needed splitting into two categories.

#### THE SPLIT (this is the actual output of this item)
**CONTENT she logs with -> GRANDFATHERED.** Recipes (5), saved meals (5), custom foods (20). She keeps ALL
of it, over cap or not. Everything stays usable, editable and deletable. The ONLY thing blocked is creating
NEW ones until she is back under the cap. This is just item C's own rule ("LIMIT creation, never access").

⚠️ **BOTH LAYOUT CAPS ARE "DEFAULTS PLUS ONE", NOT RAW TOTALS** (Justin, 2026-07-31): meal slots are the 4
defaults plus 1 = **5**, and stats cards are the **7 default GRAPH cards plus 1** of your own (system cards
are not in the cap). Reading either as a bare total culls the defaults, which was never the intent.

**LAYOUT limits -> REVERT to the free cap.** Meal slots (8 -> 5) and stats cards (down to defaults + 1). The extras go
DORMANT, top of the user's own order down to the cap; the rest are stored but not displayed, and come back
exactly as they were if she subscribes again.

⚠️ These two were briefly handled inconsistently (slots reverting, stats cards grandfathered) on a reason
that did not hold -- she configured the stats cards just as deliberately as the slots. Justin caught it.
The line is **content vs screen layout**, not "made vs given".

#### PER-CAP WALKTHROUGH
- **Recipes (5).** Otto builds 6 during her week -> she keeps 6, all usable. Add Recipe tells her she is at
  6 of 5 and must delete first. ⚠️ Mechanical quirk, accepted: "cannot add while AT or OVER the cap" means at
  a cap of 5 she must get to 4 to add a new one. Feels odd the first time, standard cap behaviour.
- **Custom foods (20).** Mostly theoretical. VERIFIED: only Add Food, Food Detail, Settings and
  CustomFoodCreator write `pj_my_foods`. The AI meal estimator does NOT -- it pushes straight into the day's
  `entries` with the nutrition baked in (app/ai-meal-estimator.tsx). It also has its own separate cap and is
  not part of this one.
  ➡️ **RULE: Otto only ever creates a saved custom food on an EXPLICIT request.** Never on his own, never as
  a side effect of building a meal. He follows the estimator's precedent: log the entry, do not mint a food.
  ⚠️ A logged food ENTRY is never capped and never may be -- capping logging is capping her own data.
- **Saved meals (5) -- NEW CAP, added 2026-07-30.** `pj_saved_meals` (utils/savedMeals.ts + RepeatMealModal)
  is a shipped feature that was MISSING from item C's cap list entirely. **This is where Otto's meal builder
  (F) writes**, and those count against the cap. (A worry that a cap of 5 hides the catalog search box was
  checked and dropped: search/sort tools appear at 6+, but every saved meal always shows from the first one.)
- **Stats cards (1).** Reverts. Top card in her order survives, the rest go dormant.
- **Meal slots (4 vs 8).** Reverts. Top 4 in her order survive, the rest go dormant. See below -- this one
  was verified in code.

#### MEAL SLOTS -- VERIFIED IN CODE, and the app ALREADY does this
- Entries store a slot **ID**, not a name. `getMealDisplayName()` resolves in three steps: current slots ->
  `slotNameCache` -> the raw value. **The cache is built to never shrink.** So removing a slot from the
  active list does NOT break history: June 20 still renders "Pre Workout" on its entries, correctly named.
  Summaries, Day Detail and Custom Reports all resolve the same way and need NO changes.
- **The behaviour is already shipped for manual deletion.** `deleteMealSlot` in log.tsx warns, word for word:
  *"This slot has entries logged today. They won't be erased from your history, but they won't appear in
  your log going forward."* A downgrade uses the same path.
- ⚠️ **DEACTIVATE, DO NOT DELETE.** Keep the slot definitions stored and mark them inactive, so they return
  intact on resubscribe instead of her rebuilding them.
- **NOTHING EVER MOVES.** Do not migrate old entries into a surviving slot: rewriting June 20's "Pre Workout"
  entries into "Dinner" falsifies history that was true when she logged it, and would silently change her
  past day summaries. The name cache already displays them correctly.
- **Surface count (verified):** 9 files touch the slot system. FIVE let you PICK a slot and must use the
  ACTIVE list (Log tab, Add Food, AI Meal Estimator, Recipe Log, Food Detail). THREE only DISPLAY a name and
  need nothing (Day Detail, Custom Reports/report.tsx, utils/companionFood.ts).
- **Slot management lives entirely in the LOG TAB, not Settings** -- 4 write points in log.tsx (add, delete,
  rename, drag-reorder). That is where the cap is enforced and where the toast fires.

#### TIMING -- how a downgrade lands (solves the "food vanished off my screen" problem)
- **CAPABILITIES drop immediately** when the entitlement ends: Otto's data access, building things, message
  caps. Nothing on screen changes, so there is no reason to delay them.
- **LAYOUT CHANGES wait for the next LOCAL DAY BOUNDARY**: slots, stats cards, anything visual. So she can
  lose Otto's data access at 2pm Tuesday and her Log tab stays exactly as it is until Wednesday morning.
- **Why this rule and not "the taste ends at midnight":** the taste is a 7-day RevenueCat PROMOTIONAL
  ENTITLEMENT granted at onboarding completion, so expiry is a TIMESTAMP, not midnight. And for a cancelled
  Supporter, Apple owns the expiry moment entirely -- you do not control it. The day-boundary rule handles
  both cases without needing to control either.
- ✅ Side effect: at a day boundary the new day has NO entries yet, so there is never anything stranded and
  no migration to build.
- ⚠️ **CHECK AT BUILD TIME:** whether the RevenueCat promo grant can be given a custom end date so it lands
  on local midnight anyway. Nice to have, NOT required -- the day-boundary rule already covers it.
- ⚠️ Accepted edge, deliberately not built for: food logged to a FUTURE date in a slot that goes dormant
  before she gets there. It stays in her history and totals; the row just is not shown. Justin: "who does
  that lol."

#### STILL OPEN FROM THIS ITEM
- **The exercise library cap (15)** was deliberately HELD for open item 3, because it cannot be answered
  before deciding whether Otto creates exercises at all, how often, and whether they are permanent or
  one-off.
- Item C's cap MESSAGING is undesigned (Justin leans a toast). Recorded in the roadmap under item C.

### 3. ✅ RESOLVED 2026-07-30 -- Otto may create exercises, but ONLY when asked, and never silently.

**THE GOVERNING RULE: Otto never creates an exercise on his own initiative. Every creation traces back to
something the user asked for.** Asked for a routine with no specific movement named, he builds from the
pool, full stop.

#### THE POOL TODAY (verified)
79 built-in exercises, seeded on first run into `pj_exercise_library`. Each carries name, type, tags,
default sets/reps/rest, primary + secondary muscles, and ~4 instruction steps. Users can add their own from
the Workout Library screen. ⚠️ Item C's "exercise library 15" cap means 15 **user-created** exercises, not
15 total (confirmed with Justin).
➡️ **THE POOL IS BEING EXPANDED 79 -> ~143: see THE PLAN item J.** Every curated exercise is one Otto never
has to invent, so J directly reduces the risk here. (Glaring holes found: there is no PUSH-UP, no DUMBBELL
LATERAL RAISE, nothing bodyweight at all, and no shrugs despite traps being on the muscle diagram.)

#### WHEN HE MAY CREATE (three cases, all user-initiated)
1. **Direct ask.** "Add cable crossover to my library."
2. **The user describes something he doesn't recognise** as part of their training.
3. **Mid-build, but ONLY if the user named that specific movement.** Never because he wanted a movement the
   pool lacks.
❌ **NOT a creation trigger: asking ABOUT an exercise.** "How do I do a Jefferson curl?" is a question. He
answers it and creates nothing. Talking about a movement and adding it to a library are different things.
➡️ He MAY offer ("want me to add that to your library?") -- but see the free-user catch below.

#### ⚠️ THE OFFER IS SUPPORTER-ONLY
If a free user asks how to do a movement and Otto offers to add it, they say yes and hit a wall Otto himself
walked them into. **Free users get the answer with no offer.** A free user who directly asks to add one is
hitting a CAPABILITY wall: attribution clause applies, and it counts toward the three walls that unlock a
pitch (see open item 4).

#### DUPLICATE PREVENTION (three layers -- the model never rules on it alone)
Without this the library slowly fills with near-duplicates AND the PR history splits across two names for
the same lift.
1. **A plain text match in CODE, not the model.** Lowercase, strip punctuation and parenthetical bits,
   compare. Catches "cable fly high to low" vs "Cable Fly (High to Low)" every time, no judgement.
2. **Otto SUGGESTS near matches, he does not decide.** He already has the user's full exercise-name list.
3. **The user is the tiebreaker.** He never creates silently. Approved wording:
   > "I don't see a Cable Crossover in your library. Closest thing you've got is Cable Fly, High to Low.
   > Want to use that one, or should I add Cable Crossover as its own exercise?"
   And with no near match at all: *"I don't see a Copenhagen Plank in your library. Want me to add it?"*
⚠️ **THIS DEPENDS ON A KNOWN BUG WE ALREADY LOGGED.** The exercise-name list rides inside the PR attachment,
which returns null early when the user has NO logged PRs -- so a brand-new user, the person most likely to
be building their library out, is exactly the one whose duplicate check silently would not run. Decoupling
the name list from PRs is already in the item-1 build notes for B; **duplicate checking makes it load-bearing,
not a nicety.**

#### ⚠️ CONSTRAINT ON ITEM E: ROUTINES ARE PREVIEWED AND ACCEPTED, NOT WRITTEN STRAIGHT IN
This is a constraint on E, not a decision inside it. E still designs what the preview looks like.
The mid-build problem (does he stop and ask, or build then confess?) is solved by making **accepting the
routine BE the confirmation**: he builds the whole thing including the new movement, shows it, nothing is
saved yet. Accept -> the routine lands AND the exercise joins the library. Decline -> nothing was created.
Beyond this item, it also means a wrong exercise, bad set counts or a movement their gym doesn't have get
caught BEFORE they are in the app, and nothing Otto builds ever appears without the user agreeing to it.
Cost: one extra tap. Worth it.

#### WHAT OTTO FILLS IN WHEN HE CREATES
He gets muscles and instructions from his own general knowledge (commodity fitness knowledge, not user data).
- **Muscles.** ⚠️ The app must hand him the exact valid keys and DROP anything not on the list before saving,
  or a hallucinated "pecs" silently breaks the diagram. **The complete list is the 22 keys in
  components/MuscleMap.tsx:** chest, upper_chest, lower_chest, front_delt, side_delt, rear_delt, triceps,
  biceps, forearms, lats, rhomboids, traps, lower_back, abs, obliques, hip_flexors, quads, hamstrings,
  glutes, hip_abductors, hip_adductors, calves.
  ℹ️ Several collapse onto the same drawing (all 3 chest keys -> chest; all 3 delts -> deltoids; lats +
  rhomboids -> upper-back; hip_flexors -> abs; both hip_ab/adductors -> adductors), so ~14 regions actually
  light up and small precision errors are invisible.
- **Instructions.** ~4 short steps, matching the built-ins' format.
- **Tags.** ⚠️ Found in code: the manual add form will not save without at least one tag, so tags are not
  optional in the data. Otto must assign them **from the user's own tag list**, never invented, which means
  he needs `workoutTags` in context.
- **Default sets / reps / rest.** Every built-in has these. If he omits them his exercise behaves worse than
  the ones that shipped.
- ❌ **NO WEIGHT.** A pre-filled number invites someone to load it without thinking, and he has no idea how
  the last session went or how they feel today. Weight is the one field where being wrong hurts someone.
  When ASKED, he answers from real history instead -- *"Your last three bench sessions topped out at 205 for
  6. Start at 195 and see how the first set moves."* Which a free user cannot get, so it demonstrates the
  split rather than creating an awkward gap.
- **RELIABILITY, honestly:** mainstream movements he will get right essentially always. Niche, regional or
  invented names he will guess at, confidently. The realistic failure is a missed secondary muscle, not
  labelling a squat as chest.
- ➡️ **SAFETY VALVE:** if he cannot confidently name a primary muscle, he creates it WITHOUT a diagram or
  instructions. An absent diagram beats a confidently wrong one, and that is already the standard for
  manually-added exercises.

#### AFTER CREATION
- It is a normal custom exercise: usable anywhere, editable, deletable. Nothing locked.
- Counts against the 15 custom cap; **grandfathered on downgrade** as CONTENT (see open item 2).
- **He can fix anything he created on request** ("actually that's more triceps than chest") -- ⚠️ but he may
  **NEVER edit the 79 built-ins.** Those are curated content.
- **He announces the ability once per conversation** in which he creates something (not once per exercise),
  because otherwise nobody discovers it. Approved copy:
  > One: *"Added Cable Crossover to your library, with the muscle map and steps filled in. If anything looks
  > off, tell me and I'll fix it."*
  > Several: *"Three of those weren't in your library, so I added them with muscle maps and steps. If any of
  > them look off, tell me and I'll fix them."*
  ⚠️ It must be general ("if anything looks off"), NOT "if I got the muscles wrong" -- several fields could
  be wrong.
- **MARKER.** Store it as a real FIELD (not inferred), and leave it in place even after the user edits.
  Shown as ONE quiet line in the exercise DETAIL view, under the muscle map: **"Muscle map and steps added by
  Otto."** Nothing in the list rows -- those already carry a type pill, name, subtitle and star, and another
  pill would be noise on every scroll.
  ❌ Do NOT append "tap to edit": the line isn't tappable and the modal already has a real Edit button.
  ℹ️ Optional later: an "Added by Otto" filter in the library's filter menu. Nice quiet discovery path --
  someone finds the filter, wonders what it means, and learns he can build exercises without being told.

#### DEPENDENCIES THIS ITEM CREATED (all now in THE PLAN)
- **I -- exercise editor.** Today NOBODY can edit instructions or the muscle map (the form only handles name,
  type, tags), so a wrong diagram would be permanent. **The editor is the seatbelt that makes Otto
  pre-filling safe**, and it is worth building on its own merits regardless of Otto.
- **J -- expand the pool 79 -> ~143.**
- **K -- lift-name aliases.** Renaming an exercise currently splits its PR history.
- ⚠️ **NOTE FOR E: Otto has no idea what equipment the user has.** Nothing in the app captures it, so he will
  happily build a hack squat and a sled push for someone training in a garage with dumbbells. This probably
  needs a PROFILE field before E can be any good.
- ⚠️ **NOTE FOR E: the builder needs real programming logic**, not plausible picks from a muscle group.
  Movement-pattern balance, compounds before isolation, sensible volume. It does not fall out for free.

### 4. ✅ RESOLVED 2026-07-30 -- the pitch rules. ✅ **BUILT + DEVICE-VERIFIED 2026-08-01** (commit f091d8c).

> **BUILD RECORD (batch 3 of item B).** Verified on device: the mention lands on the third wall, three
> further questions get no second mention, and exactly one slot is spent.
>
> **Built:** `utils/companionPitch.ts` (client: counts walls per conversation, detects "asks for more",
> blocks on faith messages), `pitchBudgetHasRoom()` + `recordPitch()` + `membershipStatus()` in the functions
> (server: 3 per rolling 7 days, and the THREE-state membership check item A asked for -- access still fails
> closed to free, pitching fails closed to SILENCE), and `PITCH_REQUIRED_BLOCK` in companionSystemPrompt.ts.
>
> **THE SPLIT:** "once per conversation" is the CLIENT's job (a conversation only exists there; the server
> sees one message at a time). The weekly budget is the SERVER's, because it is per-account and must not be
> client-trusted. The client only ever REQUESTS; all three checks must agree.
>
> ⚠️ **A `[pitch]` DIAGNOSTIC LOG LINE IS STILL DEPLOYED IN appCompanion.ts. IT IS TEMPORARY -- REMOVE IT.**
> It prints `{status, pitchRequested, budgetHasRoom, pitchAllowed, pitched}` and it is how the next person
> should debug this. **Read it before guessing** -- four separate wrong theories were burned before and
> during its existence.
>
> ---
>
> ### 🚩 THE FOUR RULES THAT MAKE IT WORK. Break any one and the pitch silently stops.
>
> **1. THE INSTRUCTION RIDES ON THE USER'S MESSAGE, NOT THE SYSTEM PROMPT.** This is the single load-bearing
> fact. Measured against the real prompt and the real model (20 calls, ~$0.50): at the end of the ~90,000
> character system prompt it fired **0 times out of 10**; appended to the user's message, **10 out of 10**.
> With no pitch allowed, **0 out of 10** -- it cannot leak into ordinary replies. Otto runs on Haiku 4.5, and
> one late instruction in a prompt that size loses to his standing "never be pushy" character every time.
> The block is appended SERVER-SIDE only, so the phone never shows it and it never survives into the next
> turn's history. **Moving it back into the system prompt kills the feature with no error and no log line.**
>
> **2. THE LABEL "PITCH REQUIRED" LIVES IN THREE FILES AND MOVES TOGETHER.** The block itself
> (companionSystemPrompt.ts), FREE_TIER_BLOCK's exception clause (same file), and the membership section of
> `assistantAppKnowledge.ts` all name it verbatim. Rename it in one and the other two point at nothing,
> which re-forbids the pitch through the back door. Change all three or none.
>
> **3. THE SLOT IS SPENT AFTER THE REPLY, AND ONLY IF THE REPLY NAMES THE PLAN.** It used to be spent when
> the app DECIDED a pitch was allowed. Every message where Otto stayed quiet burned one of the three, so the
> pitch disabled itself for a week with no trace -- a live production bug, not just a testing annoyance.
> `pitchBudgetHasRoom()` runs before the call, `recordPitch()` after it, and `recordPitch` re-checks the cap
> inside its transaction so two messages in flight can never push the week past three. Crisis replies and
> failed calls cost nothing.
>
> **4. ONE PITCH PER CONVERSATION IS ENFORCED BY A LATCH ON THE WALL TRIGGER ONLY.** The wall count only ever
> climbs, so once it passes three EVERY later message asked again and Otto could pitch three times in one
> sitting -- exactly the nagging the rule exists to prevent. The server now returns `pitched` and the app
> stops asking for the rest of that conversation (resets with the chat, same as the wall count). ⚠️ The latch
> covers the WALL trigger only: if they ASK about the plan he answers every time, because stonewalling a
> direct pricing question is worse than a second mention.
>
> ---
>
> **FOUR BUGS FOUND AND FIXED, each invisible from the outside:**
> 1. **`revokeFirstWeek` never cleared the server's cached membership doc.** The phone knew you were free
>    while the server still thought you were entitled until the taste's original end date. Every free-tier
>    test was running in a half state. Now zeroes `expiresAtMs`/`checkedAtMs` and clears the pitch budget.
> 2. **Wall counting missed PR questions.** "How's my bench trending" contains no food/sleep/workout word,
>    so three walls only ever counted as two and the pitch could never become eligible. Now also counts when
>    the exercise-name context fires.
> 3. ⚠️ **TWO CONTRADICTIONS IN THE PROMPT, in different files.** FREE_TIER_BLOCK said "never explain the
>    plan or offer to sell anything here"; the membership section of the app knowledge said to raise it "only
>    when the user asks", which forbids an unprompted third-wall pitch outright. Both now defer to the pitch
>    block. **This is the failure mode this spec warns about twice: a block that CONTRADICTS an earlier
>    instruction is a coin flip; a block the earlier instruction HANDS OFF to is not.**
> 4. **The placement itself** -- rule 1 above. Fixing the contradictions was necessary and not sufficient.
>
> **PROCESS NOTE WORTH MORE THAN THE FIX:** three theories died to reasoning about the prompt instead of
> measuring it. A throwaway script that rebuilds the real prompt from `lib/` and calls the real model settled
> it in one run. **When Otto ignores an instruction, measure it -- do not reword it and redeploy.**
>
> **RESOLVED, NOT AN OPEN ITEM:** during the broken phase he sometimes landed the mention a message later
> than it was offered. That was a symptom of the weak placement, not a separate quirk -- on the message he
> takes the opening he is given. No watch item.

#### ATTRIBUTION IS NOT A PITCH (the distinction everything else rests on)
- **ATTRIBUTION goes in EVERY decline.** One factual clause, e.g. "on the free plan". No price, no call to
  action. Without it Otto reads as WEAK rather than LIMITED, and the user concludes the app is thin instead
  of concluding there is a better version. (Same reasoning already locked for the 2-exercise cap.)
- **A PITCH names the plan as something they could get.** Rare, capped, and rule-bound (below).
- **A question needing no personal data is NOT a wall** and gets no attribution at all. Attribution appears
  when he genuinely cannot do something, never as a tagline.
- **A WALL = any moment Otto can't do something BECAUSE they are free.** DATA walls (the 6 cut pipes) and
  CAPABILITY walls (the builders, the 2-exercise cap, creating an exercise).

#### TRIGGERS -- two, and only two
1. **The user asks for more.** "Build me the full thing", "can you give me the rest".
   ➡️ **EXTENDED 2026-08-01: "why can't you" counts as asking for more.** "Why can't you / why won't you /
   why don't you / how come you can't". Someone pushing back on a limit is actively reaching for the thing,
   and it is the most natural moment to say a better version exists, because they literally asked why.
   ⚠️ **The honest risk, accepted with eyes open:** from the text alone, frustration and desire look
   identical. "Why can't you do anything?" is a complaint, and answering a complaint with a sales line is
   the one place this reads as a hand on the shoulder pushing someone toward the door. Blunted by the caps
   (once per conversation, three per week) and by the no-urgency/no-guilt rules, but it is a judgement call,
   not a free win. Revisit if it ever feels that way on device.
   ⚠️ Matches on **"you"** so "why can't I see my weight" (a how-to question) does not fire, and handles the
   **curly apostrophe** -- iOS smart punctuation types ’ not ', so a plain ' misses most real phones. Both
   verified against a should-match / must-not-match list. BUILT in `utils/companionPitch.ts`.
2. **Their THIRD wall in one conversation.** ⚠️ Justin was on the fence that trigger 1 alone means most users
   never hear a pitch at all. Counterweight: Otto is one of six conversion surfaces, not the closer.
➡️ **THE APP COUNTS THE WALLS AND PASSES A FLAG** saying a pitch is allowed on this message. Otto has no
memory between messages and would guess. Same principle as the app supplying real numbers.

#### CAPS
- **One pitch per conversation, maximum.**
- **At most THREE pitches in any rolling 7 days.**
- ⚠️ **A SUPPRESSION WINDOW AFTER A DOWNGRADE WAS PROPOSED AND REJECTED** (Justin, and he was right): the
  downgrade is when someone most feels the loss and is most likely to re-up. Going silent at the best moment
  is a bad trade. The rolling cap covers the nagging risk without a special case, and removes the need for
  separate downgrade/cancellation windows.
- ✅ **The day-8 explanation and the lapsed-Supporter explanation DO NOT COUNT** against the cap. Those are
  the app explaining a change it made, not sales. If they burned one, someone would hear the explanation and
  then get nothing when they actually start reaching.

#### NEVER PITCH AN EXISTING SUPPORTER -- do it STRUCTURALLY
**Do not send the pitch instructions to an entitled user at all.** He cannot do a thing he was never told
about. "Don't mention it to paying users" is the willpower version, and willpower is not a wall.
FOUR CASES FALL OUT AUTOMATICALLY, which is how you know it is the right shape:
- **Someone in their 7-day taste is entitled** -> no pitch. Correct, they already have everything.
- **Someone in a billing grace period is entitled** -> no pitch while their payment retries. They have not
  actually left.
- **A lapsed Supporter is not entitled** -> pitching resumes, landing next to the lapsed explanation so they
  get one coherent story rather than a sales line out of nowhere.
- **Mid-conversation upgrade** is already settled (server checks per message; he stops on the next reply).
⚠️ **WHAT MUST NOT BE REMOVED WITH THE PITCH RULES:** the FACTS about the plan stay in his knowledge for
everyone. A Supporter asking "what do I actually get for this?" deserves a real answer. Only the pitch
BEHAVIOUR disappears.

#### ⚠️ TWO BUILD PITFALLS, both invisible in testing -- do not discover these the hard way
**1. `isSupporter()` RETURNS FALSE ON LOOKUP FAILURE** (verified, functions/src/membership.ts:94-97 -- the
catch logs "defaulting to free" and returns false). That is the RIGHT default for data access and must not
change. But it means **a paying Supporter whose lookup hiccups would get pitched** -- a subscriber being
sold the thing they already pay for is the worst version of this feature.
➡️ **The two decisions need OPPOSITE defaults.** Data access defaults to FREE on failure. **Pitching defaults
to SILENCE.** So the pitch check needs THREE states -- entitled / confirmed free / unknown -- and only
**confirmed free** may ever be pitched. Today it is a plain boolean, so "confirmed free" and "we couldn't
tell" are indistinguishable.
**2. TIER-DEPENDENT INSTRUCTIONS MUST LIVE IN THE VOLATILE BLOCK, NOT THE CACHED ONE.** Otto's prompt is
split into a stable cached half (shared across every user on the same faith tier -- that sharing is why he
is affordable) and a small volatile half. If the pitch rules or the free-tier decline behaviour go in the
STABLE half, there are now two versions of it, which splits the cache, cuts the hit rate and works directly
against item H's savings. Built the obvious way (rules go where rules live) this quietly makes Otto more
expensive with nothing on screen to show for it.

#### THE COPY (direction; final wording lands in B)
⚠️ **LANGUAGE RULE, Justin repeated this several times.** Never the bare word "Supporter", and **never
equate a feature WITH the plan** -- the plan is something you JOIN, not a category features belong to.
✅ part of / comes with / included in / on **the Supporter plan**.
❌ "that's Supporter" · "that **is** the Supporter plan" · "all the Supporter plan" · "Supporter, the paid
membership".

**SHAPE 1 -- they asked for more. Naming the price is fair, they asked for the product.**
> *"Can you just build me the whole push day?"*
> "Wish I could hand you the whole thing. On the free plan I'll give you the two that matter most. Open with
> bench press, because that's where you can actually move some weight while you're fresh. Follow it with an
> incline dumbbell press to cover the upper chest, which is the bit most push days come up short on. Three or
> four sets each, and leave a rep in the tank on your last set.
> Building the full session, sets and reps and the order, straight into your Workout tab, comes with the
> Supporter plan. It's $9.99 a month, and it's what keeps the app running."
> *(Support the Mission)*

**SHAPE 2 -- third wall, they asked for nothing. Softer, NO price.**
> *(after already hitting walls on food and on training)* *"How did I sleep last week?"*
> "That's another one I can't reach on the free plan. Your whole last week of nights, scores and stages, is
> sitting on your Sleep page.
> That's three today I've had to send you elsewhere for. Reading your food, your training and your sleep all
> comes with the Supporter plan, if you ever want me working from your actual numbers."
> *(Sleep)* *(Support the Mission)*

**SHAPE 2, MINDFUL** -- nothing about performance or coming up short:
> "That's another one I can't reach on the free plan. Your last week of nights is on your Sleep page.
> Three times today I've had to point you somewhere else. Seeing your own numbers is part of the Supporter
> plan, if that's something you want."

Discipline gets the shortest version. Every message referencing the membership carries a Support the Mission
jump button.

#### EDGE CASES (the first three are non-negotiable)
- **CRISIS.** If crisis screening trips, NO pitch in that conversation. Not on the third wall, not even if
  they ask. Selling to someone in that state is the worst thing this feature could do.
- **THE UNDEREATING SAFEGUARD.** If it fired, no pitch in that exchange. Following "are you eating enough?"
  with a sales line is grotesque and would poison the safeguard itself.
- **FAITH.** A prayer or journal question cannot produce a wall (faith is never paywalled), but the wall
  counter could already be at three from earlier in the conversation and fire on a message about their
  prayer list. **Never pitch on a faith message, regardless of the count.**
- **WHAT COUNTS AS A CONVERSATION:** closing the chat ends it. Reopening could in theory reset the counter,
  but the 3-per-7-days cap is what actually protects them, so this does not need engineering around.
- ✅ **BUILT + DEVICE-VERIFIED 2026-08-01** (commit 5bbde41). Build record:
  • **Otto flags the refusal with a `[[DECLINED]]` tag; the app records the date.** Same shape as the crisis
    tag. ⚠️ **The tag is STRIPPED before the reply is returned** -- unlike crisis, this reply IS shown to the
    user, so a missed strip means they read "[[DECLINED]]" in the chat. Stripped before the dash pass so the
    brackets can never be mangled into something the regex leaves behind.
  • ⚠️ **THE WATCH INSTRUCTION RIDES ON THE USER'S MESSAGE, and only once he has actually pitched in that
    conversation.** In the stable prompt it caught **3 refusals out of 6** -- the ones quoted verbatim in the
    instruction -- and missed the paraphrases ("I'm not paying for this", "I can't afford it right now") and
    a refusal that arrived alongside a real question. On the message: **11 out of 11**, including every
    paraphrase and both must-not-fire cases. Third time the same lesson has landed: position, not wording.
  • **Gating on "he already pitched" is logically right, not just cheap: YOU CAN ONLY DECLINE SOMETHING YOU
    WERE OFFERED.** Someone never pitched has nothing to silence.
  • ⚠️ **THE CLIENT NOW SENDS WHICH TRIGGER FIRED (`pitchAsked`).** Without that split the 30 days would gag
    the person's OWN question too, and "if they ask, he answers" would quietly stop being true -- which would
    make the app worse than before the feature existed.
  • **A decline beats a pitch in the same reply**: record the no, spend no slot.
  • **Revoke First Week clears `declinedAtMs`** alongside the weekly budget, or testing this is once a month.
  • **"I can't afford it" COUNTS as a refusal** (Justin, 2026-08-01). The asymmetry decides it: if they would
    have bought later they can still ask any time and he answers in full, so counting it costs almost
    nothing. Not counting it means raising money again in a fortnight with someone who just said they have
    none, which is the worst possible moment for this app to feel like it is selling.
  • **What he says: one short acknowledgement, then back to what they were doing.** No last pitch ("no
    problem, though it also covers X" is exactly what makes a no feel ignored), no promise with a timeframe
    in it (31 days later he might, and then he is a liar), no apology, no turning it into a conversation
    about selling. If their message also asked something real, he answers it.
  • **NOT silenced by a decline:** the 7-day-taste step-down notice and the lapsed-Supporter explanation.
    Those are the app reporting an access change, not a pitch, and suppressing them would leave someone
    confused about why things changed.
- **AN EXPLICIT NO** ("not interested", "stop asking") buys **30 days** of silence from the unsolicited
  pitch. ⚠️ Trigger 1 still works during those 30 days -- if they ASK, he answers. So the cost of the long
  window is almost nothing, and what it buys is that saying no to this app actually works. Being asked again
  two weeks after declining is how a maybe becomes a never.
- ⚠️ **BUILD NOTE -- WHERE THE COUNTERS LIVE.** "One per conversation" is within a session and is easy. The
  **3-per-rolling-7-days** cap and the **30-day decline** both have to PERSIST, and both must be per ACCOUNT,
  not per device (Justin tests on two accounts across two devices, and a device-local counter would let the
  same person be pitched twice as often).
- ⚠️ **BUILD NOTE -- HOW THE APP LEARNS SOMEONE DECLINED.** Every other counter is app-side by design, but a
  decline starts life as a SENTENCE ("not interested", "stop asking") that something has to recognise.
  Simplest shape: Otto flags it in his reply and the app records the date, exactly like the crisis flag that
  already exists. Do not try to detect it with string matching on the client.
- **THE TIP JAR: never unprompted, and never a selling point.** He knows tips exist, so if someone asks how
  they can support the app he can mention them. He never raises them himself. A tip pitch would need its own
  rules, caps and edge cases, and anyone who wants to tip finds it on the Support the Mission screen the jump
  button already goes to.

### 5. ✅ RESOLVED 2026-07-30 -- the meal builder's food matching.

**SCOPE, LOCKED: it is a MEAL builder, not a MEAL PLAN builder.** One meal, or a couple, on request.
- The saved-meals catalog already exists (`pj_saved_meals` + RepeatMealModal), so a built meal has somewhere
  to go. A meal PLAN has nowhere to go, so it would mean building a whole scheduling feature first.
- "What should I have for dinner" gets asked daily. A 7-day plan gets read once and abandoned by Wednesday.
- One meal is correctable; day four of a plan is wrong on Thursday and the whole thing is dead.
- It also makes F buildable instead of a blank page.
➡️ Meal PLANS go to the backlog as a separate idea if ever wanted.

**HARD-GATED FROM FREE ENTIRELY.** Free Otto gives general nutrition guidance (what to prioritise, why
protein at breakfast helps, what a good dinner looks like in principle) and **never names a food with an
amount attached.** Assembling foods into a meal is an ARTIFACT. Consistent with open item 1.

#### THE PROBLEM, PRECISELY
Generic meal plans fail because people eat what is in their kitchen, and a generic plan is exactly the
commodity ChatGPT gives away free. The unique thing this app has is **months of what this person actually
eats, hand-logged, with real nutrition attached.**
⚠️ **But "just use their logged foods" breaks three ways:** they ate out once and logged it, they ran out of
an ingredient, and a new user has no history at all. Plus **brand ambiguity** -- Justin has two boxes of
white rice in his pantry right now with different nutrition.

#### WHICH LOGGED FOODS QUALIFY
- **Favourited foods ALWAYS qualify**, no threshold. An explicit signal the app already collects, and it
  stops a light logger from facing an empty grid.
- **Otherwise: logged 5+ times in the last 30 days.** That kills the restaurant problem by itself (a burrito
  eaten once in April never gets near it) and kills foods they stopped buying.
- ⚠️ **NO filter can solve "I ran out."** Only asking solves that -- hence the grid below.

#### ⚠️ THE KEY MOVE: THE CONVERSATION GETS THE MEAL, THE UI GETS THE PRODUCTS
Justin's concern, and it is the right one: **Otto's own API cost and the daily message cap.** An early draft
of this flow took FOUR turns to build one dinner (ask, "I don't have chicken", "what have you got", "80/20 or
93/7"). That is four messages of their thirty and four API calls to pick rice.
**Chat costs money and messages. An inline card costs neither.** So:
1. **A "what have you got?" GRID, rendered inline in the chat**, before he builds. ~15 of their qualifying
   foods as tappable toggles, plus a free-text field for anything not listed. No typing, no extra message.
   ⚠️ A brand-new user sees an empty grid and just types -- that is the fallback, and it works.
   ⚠️ **DO NOT route that free-text field through the AI meal estimator.** It was proposed and Justin killed
   it, correctly: the estimator is the SONNET call (the pricey one) with its own monthly quota, so it would
   add an expensive second call per build AND could eat into their photo-estimate allowance. Building a
   dinner must never cost someone an estimate.
   ✅ **Otto handles the free text in the call he is ALREADY making.** "Leftover lasagna" is just text in that
   message; at this point the user is only saying what is AVAILABLE, not logging anything. Real nutrition
   gets resolved later through the card and the normal food search. The estimator earns its cost on photos
   and on precision, and neither applies here.
2. **He builds ONCE**, from exactly what was selected.
3. **The preview card handles everything else.** Per-line swap and amount controls. Replacing his generic
   jasmine rice with the box in your pantry is two taps and costs nothing.
➡️ **RENDER BOTH INLINE IN THE CHAT, as interactive message cards** (same pattern as his existing jump
buttons / tutorial launchers). ❌ NOT a modal over the chat panel -- that is modal-over-modal and feels
cheap. Bonus: the conversation becomes the record, so you can scroll back and see what you said you had and
what he built from it.
⚠️ ONE EXCEPTION: tapping "swap" needs a real food search, which is legitimately bigger than a chat bubble.
That may open the existing picker.

#### FOOD SOURCES, AND MARKING THEM
- **Their own logged foods** = exact nutrition, their real products. Preferred, always.
- **Generic database entries** = used only to fill a gap, and **MARKED AS A STAND-IN** so the user knows
  which line is theirs and which is a guess. Otto says so plainly: *"That one's from the database rather
  than your log, so double check it against your package when you log it."*
- ❌ **He does NOT quiz the user on product specifics.** "80/20 or 93/7?" has a dozen answers and costs a
  message. He picks a reasonable generic, marks it, and the card handles the swap if they care.
- ✅ **Because swaps happen BEFORE saving, a meal saved to the catalog contains THEIR products** -- which
  answers Justin's "saving a meal is pointless if the brand changes" worry.

#### MEAL SIZE, CONSTRAINTS AND ADJUSTMENTS
- **Meal size is DERIVED, never asked.** He knows the daily target and what is already logged. Breakfast with
  nothing logged aims at roughly a quarter to a third of the day, NOT the whole 1,700. Later in the day he
  works from what is left. One line states the assumption: *"Built this around 450, which leaves you room for
  the rest of the day."* ⚠️ In MINDFUL he builds the identical meal and simply does not narrate the maths.
- **Constraints work** ("high protein, low sodium, high carb"). ⚠️ He is NOT a solver: "exactly 50g protein"
  gets CLOSE, not exact, so he must always show the real numbers rather than claim he hit a target. Justin is
  fine with close.
- **Two kinds of adjustment, and they must not be confused:**
  • "Make it 400 calories" / "less rice" = a PORTION change -> the card does it, no API call, instant.
  • "Less sodium" / "swap the carb" = changes WHAT is in the meal -> a rebuild, costs a message.
- "Just make me a meal" (no grid selections) -> he builds from favourites + frequent foods and fills gaps
  with marked generics. **The grid is an offer, not a gate.**
- **GRAMS.** Entries already store nutrition per 100g, so grams are native to the data, not a fake
  conversion. Should be a PREFERENCE set once, not a question every time.

#### WHAT A BUILT MEAL BECOMES
- **Logged as individual entries in a meal slot**, exactly like anything else, so nothing downstream treats
  it specially. The slot defaults sensibly (time of day, or what they asked for) and is changeable on the
  card before committing.
- **Saving to the catalog is a DELIBERATE action, not automatic.** Every built meal auto-saving would clutter
  the catalog fast and most dinners are a one-off. The card offers both: log it, save it, or both.
- Counts against the saved-meals cap (5 free), and is grandfathered on downgrade per open item 2.

#### EATING OUT -- simpler than it looks
FatSecret carries restaurant items, so **if the user says where they are, the MENU becomes the pantry.** No
grid (they are not picking from their fridge), no frequency problem (restaurant food never qualifies through
history anyway). The "restaurant menu lookup" backlog dependency is really a question of whether the database
coverage is good enough, which is a data question, not a design one.

#### ⚠️ HARD PREREQUISITE FOR F: ALLERGIES / DIETARY RESTRICTIONS
**Nothing in the app captures what someone does not eat.** So Otto will cheerfully build a shellfish dinner
for someone with a shellfish allergy, or put chicken in front of a vegetarian. Same shape as the equipment
gap on E, except the consequences are worse.
➡️ **F cannot ship without this.** The field itself is PROFILE work (and would help the AI meal estimator
too, not just Otto). Design it there; treat it as a blocker here.

#### STILL OPEN
- **Should saved RECIPES be candidate components?** They already carry full nutrition and are a real thing the
  user makes, so arguably the best possible component. Wants deciding properly, not assuming.
- **Portion sizes from their history** (if they always log 150g of chicken, build around 150g rather than a
  textbook 200g). Justin likes it; work it out when F is designed.
- Otto's own cost for a build call is roughly 2-3x a normal message, since the candidate foods and their
  nutrition have to be sent. Acceptable: it is ONE call instead of four, Supporter-only, capped at 30/day,
  and it is the thing people would actually be paying for.

### 6. ✅ RESOLVED 2026-07-30 -- NEITHER becomes an Otto capability.

⚠️ First, a correction to this spec's own earlier wording: these were NOT "scoped as standalone features."
They were **one-line backlog entries** with no design behind either of them.

**THE FRAMING THAT ANSWERS IT** (and it is just the core principle again): **Otto can TALK about something.
Only a feature can DO it.** Both of these were about doing something to the user's data, not saying something
about it. So neither is an Otto capability.

**PROTEIN TIMING BADGE -> CUT. Deleted from the backlog 2026-07-30, do not re-add.**
The idea was a yes/no badge for hitting protein within ~2 hours of finishing a workout. It is a dated
bodybuilding idea: the research settled on TOTAL DAILY protein mattering far more than timing. A badge for it
would reward the user for something that is not really true, which fails the honest-numbers rule.
ℹ️ Separately, it may not even be computable: food entries carry timestamps but manually-logged workouts
record only THAT you trained on a given day, not when. So the 2-hour window has no start point unless the
workout came from HealthKit. Moot now, but worth knowing if anything similar is ever proposed.

**CALORIE PERIODIZATION -> STAYS IN THE BACKLOG AS A FEATURE.**
Legitimate idea (eat more on training days, less on rest days, same weekly total) and it matches how people
actually eat. But the value is the APP changing the daily target, and Otto cannot change anything.
✅ **Otto can already talk about it today with zero build** -- someone asks how to handle rest days and he
explains it as general nutrition guidance. So there is nothing to add to him.
⚠️ The feature's real cost, recorded in the backlog entry: the daily target stops being ONE number, which
ripples into the calorie floor, Day Score, weekly/monthly summaries, and MINDFUL, where prescribing calorie
numbers is banned outright.

---

## SETTLED, DO NOT RE-LITIGATE

- **The rephrasing loophole is ACCEPTED.** Two exercises per question means asking five questions gets
  ten exercises and a self-assembled routine. Justin's call: leave it. They still have to build it
  manually, and it is a lot of work to get workouts they could have googled. The BUILDER is what is being
  sold, not the exercise names.
- **Mid-conversation Supporter upgrade is ACCEPTED as-is.** The server checks status per message so Otto
  upgrades on the next reply, but he has no memory so he will not acknowledge the change. Too rare to
  engineer around; an app reopen resolves it.

---

## WHAT WAS CONSIDERED AND REJECTED

- **The "hard split" (free Otto = app help only, everything else paid).** Justin initially preferred it:
  cheaper, and the clearest Supporter pitch. **Rejected on the numbers, because it is backwards.** Otto's
  wellness ability comes from the model plus his small base prompt; the 18k-token knowledge base is
  entirely the APP MAP. So an app question costs roughly 5x what a wellness question costs. The hard
  split gives away the expensive product and sells the cheap one.
- **Gating general workout advice.** Justin's instinct, and the right instinct in the wrong place -- see
  the core principle. Gate the artifact, not the knowledge.
- **Data personalisation as the ONLY Supporter perk.** Justin's read, correct: "he pulled the numbers" is
  thin and not a $9.99 story on its own. It only works as one of three.
- **Otto carrying the Supporter tier alone.** He does not have to. Nobody subscribes for Otto; they
  subscribe for the bundle (Custom Reports, Comparison, deeper EvR cards, badge, gold icon, Otto). Otto is
  one reason among six.

---

## COST OPTIMISATION (separate track, NOT a conversion item)

Otto costs ~$0.21/month per active user, ~59% of the entire AI bill. Inside that, **cache writes on the
18k knowledge base are ~38% of the whole bill** -- one line item, bigger than Halo, Smart Coach and the
meal estimator combined.

⚠️ There is no misconfiguration. Checked 2026-07-28 and again 2026-07-29: Otto's prompt caching is
textbook correct (stable block cached, volatile user block after it, shared across users on the same faith
tier so traffic makes the hit rate BETTER, not worse). There is no bug to find. The 18k is architectural.

**ROUTE BY QUESTION TYPE.** The single biggest lever, and it is invisible to users:
- App question -> send the app map, SKIP the data snapshot
- Wellness question -> send the data snapshot, SKIP the app map
Plus sending only the relevant KB sections rather than all 14. Otto's knowledge is already cleanly divided
by `====` dividers into: Home, Workout, Log (biggest, ~3,800 tok), Stats, Profile, Faith, Key Destinations,
Achievements, Settings, Coaching Modes, monetization, quick index.

Estimated: Otto $0.21 -> ~$0.08/month (~62%). Total per active user $0.40 -> $0.26.
Break-even conversion 4.7% -> ~2.5%, which flips every install scenario positive at 3% conversion.

⚠️ CRITICAL DESIGN CONSTRAINT: prefix caching means sections may only ever be APPENDED within a
conversation, never swapped. Core first, then appended sections. Get this wrong and every message
invalidates the cache, making it MORE expensive than today.

⚠️ REAL RISKS, do not hand-wave them:
- Routing misses -> Otto confabulates. Incomplete knowledge is MORE dangerous than absent knowledge
  because he fills gaps confidently. Test this hardest.
- Long conversations converge on the full KB anyway as sections accumulate, so savings are best on short
  exchanges and evaporate on long ones -- and long ones are where an engaged user lives.
- Every future KB edit now needs someone to know which section it belongs in.

**A local lookup table for navigation questions was also considered** (answer "where is X" on-device, free,
instantly, no AI). Attractive because it structurally cannot confabulate. ⚠️ But its biggest trap is a
THIRD copy of the app knowledge to keep in sync -- and the two existing copies have ALREADY drifted
(the root `ASSISTANT_APP_KNOWLEDGE.md` is missing entire sections the bundled one has). Not pursued.

---

## SOURCES (undereating thresholds, checked 2026-07-29)
- NIH minimums + MyFitnessPal's implementation: https://support.myfitnesspal.com/hc/en-us/articles/360032626031-A-Message-about-MyFitnessPal-s-updated-nutrition-goals
- MFP warning trigger (1000 W / 1200 M net): https://community.myfitnesspal.com/en/discussion/10739478/warning-about-being-under-my-minimum
- MFP net calorie definition: https://support.myfitnesspal.com/hc/en-us/articles/360032274432-Can-I-customize-my-nutritional-goals
