# SPEC: Dietary Profile (allergies, diet, foods to avoid)

**THE PLAN item M.** Design settled with Justin 2026-08-04. Nothing in the app captured what someone does
NOT eat. Hard prerequisite for item F (the meal builder): without it Otto will happily put shrimp in a
dinner for somebody allergic to shellfish.

---

## THE THREE FIELDS

Three separate controls, because they are three different kinds of thing and the app treats them
differently. An earlier two-list version put "Vegetarian" under "Foods to avoid", which reads as though you
are avoiding vegetarian food. Justin caught it.

**ALLERGIES** (pick any) -- the safety list. Otto NEVER suggests these.
> Milk · Eggs · Peanuts · Tree nuts · Fish · Shellfish · Wheat · Soy · Sesame · plus your own

The nine the food industry labels for, so the list matches what is printed on packaging.

**DIET** (pick one) -- a way of eating, not a food.
> No restriction · Vegetarian · Vegan · Pescatarian

**FOODS TO AVOID** (pick any) -- soft. Otto stays away, but nothing bad happens if one turns up.
> Gluten · Dairy · Red meat · Pork · plus your own

⚠️ **GLUTEN AND DAIRY APPEAR ON BOTH LISTS ON PURPOSE.** Coeliac goes in allergies; somebody who just feels
rough after bread goes in avoid. Same food, different rule -- and that distinction is the entire reason
there are two lists. Justin raised the case (his wife: not allergic, but gluten and dairy make her feel
bad). A third "intolerance" tier was considered and REJECTED: Otto only ever has two behaviours, never
suggest and don't suggest, so a third tier asks the user to make a distinction the app never acts on.

⚠️ **CUT DELIBERATELY, do not re-add without a reason:**
- **Alcohol** -- Otto would never suggest it anyway. Padding.
- **Beef** -- redundant next to Red meat, which contains it. Anyone avoiding only beef adds it themselves.
- **Keto / low carb** -- that is what macro goals already do. Two places to say it means they can disagree.

**ORDERING MATTERS:** gluten and dairy lead the avoid list because they are by far the most commonly
avoided. An earlier draft led with pork and beef, which is not what most people are looking for.

## "ADD YOUR OWN"

Free text on the allergy and avoid lists (not diet -- that is a fixed set). Labelled **"Add your own"**,
not "Custom", which sounds like a setting rather than something you type. Without it the lists are simply
wrong for anyone unusual (nightshades, cilantro, a medication interaction), and those are exactly the
people this matters most to.

**CAPS: ~30 characters per entry, 5 entries per list.**

⚠️ **THE CAPS ARE ABOUT COST AND CLUTTER, NOT SAFETY, and the reasoning was checked rather than assumed.**
The worry was prompt injection, since this text reaches Otto in the part of the prompt he treats as fact
rather than as the user talking. It is not a new hole: **`Name:` already does exactly this** (free text the
user typed, in the same trusted block, see `AssistantChat.loadUserContext`). The only person who can type
here is the person it would be used against. What the caps genuinely prevent is somebody pasting an essay
that is then paid for on every single message.

## WHAT OTTO GETS

**ALL THREE, ON BOTH TIERS.** Free users do not receive their own data (THE PLAN item B), and this is an
exception, the same way the undereating safeguard is.

- **Allergies** are the safety case and were never in question: never suggesting shellfish to somebody
  allergic must not depend on paying.
- **Diet and foods to avoid** were briefly going to stay Supporter-only, as preference rather than safety.
  Dropped as mean-spirited and not worth the split: it is three short lines either way, and a free user
  being offered a pork dinner right after telling the app they do not eat pork just makes the app look
  broken. Justin's call: send all three to everyone.

## HOW IT GETS FILLED IN: NO PROMPT

Not in onboarding. That flow is already six steps and a seventh was cut for being one too many, and nothing
in the app can act on this yet -- Otto cannot build meals until item F. Asking a brand new user to list
their allergies before anything uses them is asking for homework.

**Instead, Otto points at it when the subject comes up and the section is empty** (Justin's idea, and a
better moment than a signup form). Triggers: they mention an allergy or a sensitivity, or they turn down
something he suggested because of a food.

- **ONLY WHEN IT IS EMPTY.** Once it is filled in he never raises it again, he just uses it.
- **ONCE PER CONVERSATION.** Same discipline as the Supporter mention. Somebody who says "I don't eat pork"
  does not need telling twice.
- He offers the jump button to the section rather than describing where it is.

## WHERE IT LIVES

**A new section on the PROFILE tab**, under Basic Info, alongside the existing collapsible sections (Basic
Info, Membership, Activity Level, Your Estimates, Weight Goal). That is where personal facts already live
and where somebody goes to tell the app about themselves.

NOT Settings: Settings is app behaviour, this is about the person.

## MODE + FAITH

No variants. Nothing here is judgment-laden, motivational, or about weight, so Discipline, Balanced and
Mindful read identically. Faith tiers are unaffected.

## LATER (not this item)

- **Item F, the meal builder**, is the reason this exists and is where the prompting question gets revisited.
- **The AI meal estimator** could use it too. Out of scope here; noted so it is not forgotten.
