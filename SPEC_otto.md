# SPEC: Otto (the general companion) -- free vs Supporter

Status: **DIRECTION LOCKED 2026-07-29, NOTHING BUILT.** Otto today is fully free with no tiering.
Last updated 2026-07-29.

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

## THE UNDEREATING SAFEGUARD (direction agreed, thresholds inherited)

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

### 1. Do not send the data snapshot to free users at all (agreed in principle, unverified)
Instructing Otto to "know but not say" is unreliable -- LLMs leak. Structural gating is not: if the
snapshot is never sent, he cannot reference it. Also slightly cheaper.
Consequence: free Otto genuinely cannot answer "how much protein today" and needs a clean, non-apologetic
response pointing at the Log tab.
⚠️ NOT YET VERIFIED that removing it breaks nothing else.

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
