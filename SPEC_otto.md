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

### 4. ✅ RESOLVED 2026-07-30 -- the pitch rules.

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
