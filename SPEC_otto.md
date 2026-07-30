# SPEC: Otto (the general companion) -- free vs Supporter

Status: **DIRECTION LOCKED 2026-07-29, NOTHING BUILT.** Otto today is fully free with no tiering.
Last updated 2026-07-30. TWO things resolved that day: **OPEN ITEM 1** (the hard gate is LOCKED, see OPEN
ITEMS) and **THE UNDEREATING SAFEGUARD** (was the open decision at the top of this spec; app-side detection,
Otto is the only voice, he never speaks first).

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

### ⚠️ STILL TO DECIDE: WHERE THIS LIVES IN THE PLAN
The detection is app-side code, so this is no longer purely an Otto item. It is NOT part of G (that guards
the recommended TARGET; this guards actual INTAKE), though it inherits G's thresholds and philosophy.
It needs a home: either folded into B or given its own letter. Not decided.

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

**LAYOUT limits -> REVERT to the free cap.** Meal slots (8 -> 4) and stats cards (4 -> 1). The extras go
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
