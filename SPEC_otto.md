# SPEC: Otto (the general companion) -- free vs Supporter

Status: **DIRECTION LOCKED 2026-07-29, NOTHING BUILT.** Otto today is fully free with no tiering.
Last updated 2026-07-30 (OPEN ITEM 1 resolved: the hard gate is LOCKED -- see OPEN ITEMS).

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
| General training guidance, **max 2 exercises** | Built, needs limiting |
| General sleep/recovery guidance ("why am I tired") | Built |
| Coaching mode + faith tier awareness | Built, stays free |
| Crisis screening | Built, stays free |
| 10 messages/day | Built |

### SUPPORTER OTTO
| Capability | Status |
|---|---|
| Reads their actual numbers in answers (`[[stat:key]]` tokens) | Built, needs gating |
| Food log history, PRs, sleep, body measurements, achievements, journal | Built, needs gating |
| Structured routines (sets, reps, ordering) rather than loose recs | Built, needs splitting |
| **Builds a workout into the Workout tab** | NOT BUILT |
| **Meal suggestions / meal builder** | NOT BUILT |
| 30 messages/day | Built |

⚠️ Three of these are capabilities free users have TODAY. Gating them is a REMOVAL, which is why all of
it must ship before launch (see SEQUENCING).

**MAX 2 EXERCISES, NEVER 3.** Three reads as a routine and gives away the thing being sold.

---

## HOW OTTO SELLS (LOCKED -- this one is easy to get wrong)

**He does not.** He never volunteers Supporter. Ever.

The ONLY trigger is the user asking for more: "can you give me more", "what about the rest", "build me
the full thing". That is the user saying they want it, and it is the only moment a price may be named.

❌ NEVER: "For chest I'd go incline press, flat press and a fly. If you want the full session with sets
and reps built into your Workout tab, that's part of Supporter."
That is Otto selling unprompted. Justin's exact reaction to this phrasing was that it was terrible and
that there was no reason to throw the paid plan at someone who had not asked.

✅ SIGNAL WITHOUT SELLING. Deliver the 2 exercises confidently, with a neutral hint that more exists:
"Here's a couple to start with." No price, no pitch, no footnote.

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

## THE UNDEREATING SAFEGUARD (⚠️ OPEN DECISION -- NOT agreed, NOT scrapped)

⚠️ READ THIS FIRST. An earlier draft of this section presented this as decided. It is not. Justin's
reaction, fairly: *"wtf is this undereating safeguard? We have the guards up when making the calorie goal
and then the logic will be added to Otto right? Are we making a new feature or something?"*

**THE DECISION TO MAKE:** is this a separate trigger, or does Otto just know the calorie-floor thresholds?

**THE CASE FOR IT BEING SEPARATE (the gap):** `SPEC_calorie_floor.md` fires on the RECOMMENDED TARGET. It
never fires if the target is healthy. Someone with a perfectly normal 1,800 target who logs 900 a day for
a week trips nothing at all -- the app watches it happen and says nothing.

**THE CASE AGAINST:** it is arguably one condition check and a message, not a feature, and Otto knowing the
thresholds may cover enough of it.

**IF BUILT, the proposal is deliberately small:** same thresholds as the floor spec, different trigger --
net intake under the MODAL line (1,000 women / 1,200 men) on 4+ of the last 7 logged days. Fires a message,
never blocks. The app already computes net calories and 7-day averages, so there is no new machinery.

Everything below applies IF this is built. Thresholds and philosophy are inherited either way.

⚠️ SEPARATE FROM, BUT MUST MATCH, `SPEC_calorie_floor.md`.

That spec (DESIGN LOCKED 2026-07-08) guards the **target the app RECOMMENDS** -- it fires when the
calculation would suggest e.g. 915 kcal to a small woman on an aggressive pace. It does NOT cover what
someone actually EATS. Otto's case is that gap: logging ~900/day for a week regardless of target.

**Reuse its thresholds. Do not invent new ones.** Consistency matters more than precision:
- MEN: whisper below 1500 · modal below 1200
- WOMEN: whisper below 1200 · modal below 1000
- Sex unset -> fall back to the WOMEN'S (stricter) numbers.

Independently corroborated 2026-07-29: these are the NIH figures, and MyFitnessPal enforces 1200/1500 as
a goal floor and warns at 1000/1200 NET. See sources at the bottom.

**Inherit its philosophy too, which also settles the "is Otto too soft" argument:**
> "warn + consent, NEVER hard-block. The real number always shows. An informed adult who deliberately
> picks an aggressive cut is respected."
It explicitly rejects MyFitnessPal's hard clamp as paternalistic. Otto inherits that stance: inform,
never withhold, never lecture.

### Two different things, do not conflate them (this caused real confusion in session)
1. **Someone ASKS "am I eating enough?"** -> a normal question. Answer it plainly with their real
   numbers, no eggshells, no swerve, in any mode. Usually the most genuine "I want to do better"
   question there is.
2. **A sustained PATTERN nobody asked about** -> the rare case warranting care.

Only #2 needs the careful treatment. Making Otto precious about #1 is the failure mode.

### Trigger (proposed, NOT locked)
Fire on a PATTERN, not a single day: net intake under the modal line on 4+ of the last 7 logged days.
One low day is nothing (sick, busy, fasting). MyFitnessPal fires per-day on completing an entry, which
is noisy; a trend trigger fits how this app already thinks and matches the Smart Coach engine.
Uses net calories (food minus exercise), which the app already computes.

### Who says it (RECOMMENDED: fixed copy, not improvised)
This is the single most sensitive message in the app. Otto has already confabulated a wrong tab position
and a wrong iOS settings path -- harmless there, not here.
Use the same pattern as the crisis path: the model detects the situation, the APP supplies fixed wording.
Live numbers come from the existing `[[stat:key]]` token system, so hardcoded copy never goes stale.

Draft framing (nourishment, not weight; facts, not diagnosis):
> "Your body needs roughly [[stat:bmr]] a day just to run its basic functions. You've been logging closer
> to [[stat:calories_7d_avg]] over the past week. Eating under that for a stretch usually means falling
> short on the nutrients your body's working with, not just the calories."

⚠️ STILL OPEN: the exact threshold and wording deserve a dietitian's eyes. This is also an App Store
consideration, not only an ethical one -- Apple's guidelines have provisions about apps that could
encourage disordered eating, and a calorie tracker with an AI coach sits squarely in that territory.

⚠️ WORTH SITTING WITH: Mindful is exactly the mode someone with a difficult relationship to food would
choose. The users most likely to need Otto to say something are the ones whose mode tells him not to.
That is why the safeguard overrides the mode, the same way crisis detection does.

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

## OPEN ITEMS

### 1. ✅ RESOLVED 2026-07-30 -- HARD GATE, LOCKED. Free users are never sent their logged data.

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
- **Day Detail jump button that opens a specific date.** No such route exists today (Otto's route pills
  cover Settings sections, Sleep, Achievements, Challenges, Comparison, EvR, Bible, Prayer, Plans, Journal,
  Mission, Body, PR home and the six tabs). Needed because a vague "what did I do yesterday" attaches
  training + food + sleep at once, so gating them individually would give a free user THREE STACKED WALLS.
  Fix is one clean in-character line plus the jump button.
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

### 2. Artifacts created during the 7-day taste -- NEEDS WALKING THROUGH
Someone builds three workouts and a meal plan during their week. Day 8 arrives. Does that workout stay
in their Workout tab? It has to -- taking it away is worse than never giving it. But it means the taste
leaves permanent value behind, which is either a feature or a leak depending how you see it. UNRESOLVED.

### 3. Exercise library / on-the-fly creation -- JUSTIN'S PROPOSAL, NEEDS REFINING
Expand the exercise library, have Otto build routines by pulling from that pool. But if a user asks for
a specific movement not in the pool, Otto should be able to create it on the spot and include it.
Not yet pushed on or refined.

### 4. Otto must not pitch to existing Supporters -- CALLED "BIG", NOT TOUCHED
He has to know not to mention Supporter to someone who already pays, and to say it at most once per
conversation to someone who does not.

### 5. Meal builder design (Justin: ships before launch, but the hard parts are unsolved)
- Generic meal plans FAIL: people eat what is in the fridge, not what an AI imagined.
- Suggesting from their own logged foods is better -- real nutrition data attached, no brand ambiguity,
  and only this app can do it. But: what if they ate out once and logged it, or ran out of an ingredient?
- PARTIAL FIX: frequency filter. Only suggest foods logged repeatedly. A restaurant meal logged once
  never qualifies; a shake logged forty times is clearly a staple. Does NOT solve "I ran out."
- Justin's alternative: user tells Otto what they have on hand. Works, but it is friction.
- Not yet resolved. `SPEC_ai_meal_estimator.md` already turns a text description into nutrition, so the
  hard technical part may already exist.
- Backlog item "Restaurant menu lookup" is a real dependency if users eat out.

### 6. Backlog items that may be cheaper as Otto capabilities
"Calorie periodization -- higher calories on workout days" and "Protein timing badge" were both scoped as
standalone features. Both are exactly the personalised, data-aware nudge that only works with the user's
numbers. Worth checking before building them separately.

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
