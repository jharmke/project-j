# SPEC: Otto knowledge routing (THE PLAN item H)

Status: 🔴 **BUILT, MEASURED, AND PARKED 2026-08-04 EVENING. DO NOT WIRE IT.** See the block below before
reading anything else in this file. The design reasoning here is still worth keeping; the conclusion is not.

## 🔴 MEASURED 2026-08-04: THE ROUTER DOES NOT WORK AS BUILT. TWO INDEPENDENT REASONS.

Run over **566 realistic messages** with the real `routeChapters()` (`scratchpad/model3.js`):

1. **IT FALLS BACK 73% OF THE TIME AND SENDS THE ENTIRE MANUAL.** The confidence gate wants two
   strongly-owned terms and real messages do not have them. It gave up on *"did i eat too much today"*,
   *"log my lunch for me"*, *"macros for my breakfast"*, *"did i hit my protein goal"* -- unmistakable food
   questions. ⚠️ **This is the exact failure mode as the keyword detectors**: tuned against clean phrasing,
   collapses against how people actually type. See [[detectors-are-brittle]].
   ✅ When it DOES route it is excellent: **1.7 chapters, 10,704 tokens, 60% smaller.** The mechanism is
   sound; the gate is not.
2. ⚠️ **IT SHATTERS ONE SHARED CACHE INTO 57 ENTRIES.** Today every user on the app shares one cached block
   and keeps it warm for each other. Routing gives each chapter combination its own entry, each with a
   fraction of the traffic, so they go cold and get REWRITTEN at 1.25x. **On the 5-minute cache this makes
   routing more expensive than doing nothing at normal volume.** Even with the fallback fixed and a 1-hour
   cache it only beats no-router above ~10,000 messages/day.

➡️ **The "~28% off per message" quoted in SPEC_cost_model.md was never real.** Park this; it is a scale
optimisation, not a launch one.
➡️ **THE REPLACEMENT IS IN SPEC_cost_model.md SECTION 7: split Otto into Coach (no manual) and Support
(full manual).** Same idea, reduced to ONE yes/no question instead of a 15-way choice -- far more reliable,
and **2 cache entries instead of 57**, which is what makes the fragmentation problem disappear.

✅ **AND IT WORKED. BUILT, MEASURED AND DEPLOYED 2026-08-05 -- see PLAN.md 4.9.** `ottoCoachRouting.ts`.
**Zero dangerous misses over 306 messages across three corpora**, against this router's 73% fallback.
🔴 **WHY THE YES/NO SUCCEEDED WHERE THE 15-WAY FAILED, since it is the transferable lesson:** this router
needed strong positive evidence to NAME a chapter, so ordinary phrasing starved it. The replacement needs no
evidence at all to reach its default -- it asks only whether the message touches the app, and sends the
manual whenever it cannot tell. **The fallback stopped being a failure and became the answer.**

---

Status (original): **DESIGN AGREED 2026-07-31, NOTHING BUILT.** This is the spec the roadmap said item H
needed before any code. Written after a full pass over the real prompt, the real knowledge base and the real
Anthropic caching docs, not from the sketch in SPEC_otto.md.

⚠️ Read `SPEC_otto.md` first. Item A decided WHAT each tier is sent. This decides WHAT EACH QUESTION is
sent. They are surgery on the same prompt and must be built together (THE PLAN, item B + H).

---

## THE PROBLEM, MEASURED

Otto ships his entire app map on every message: **73,540 characters, ~18,400 tokens.** Caching it is
roughly 38% of the whole AI bill -- one line item, bigger than Halo, Smart Coach and the meal estimator
combined.

**The map is 15 chapters, and they are wildly uneven (measured 2026-07-31):**

| Chapter | Tokens | | Chapter | Tokens |
|---|---|---|---|---|
| Log tab | 3,993 | | Home tab | 954 |
| Workout tab | 2,879 | | Faith tab | 562 |
| Settings | 1,771 | | How To Use This Map | 441 |
| Key Destinations | 1,580 | | Profile tab | 315 |
| Quick Index | 1,315 | | Navigation Model | 138 |
| Stats tab | 1,223 | | Faith Journey Tiers | 136 |
| Achievements catalog | 1,171 | | Coaching Modes | 102 |
| Support the Mission | 1,064 | | | |

**Log and Workout alone are 6,872 tokens, 37% of the whole thing.** Routing does not have to be clever to
win; it only has to stop shipping those two to someone asking about their sleep.

---

## ⚠️ THE NUMBERS THE OLD SKETCH GOT WRONG

**1. "Otto $0.21 -> $0.08" is routing PLUS the tier gate, not routing alone.** Nobody counted output
tokens or the uncached block. A full warm message today:

| | Cost |
|---|---|
| Cached map, 18,400 tok | $0.0018 |
| Volatile block, ~1,500 tok (uncached, full price) | $0.0015 |
<!-- ⚠️ BOTH ROWS ABOVE ARE STALE, LEFT ONLY BECAUSE THIS TABLE IS A RECORD OF THE OLD SKETCH.
     Metered 2026-08-05: the cached block is 26,442 tokens, not 18,400, and full-price input is ~2,200
     tokens a message, not ~1,500 -- and since PLAN.md 4.3 the steady part of the volatile block is itself
     cached, so "uncached, full price" no longer describes it. Current numbers: SPEC_cost_model.md. -->

| Output, ~300 tok @ $5/M | $0.0015 |
| **Total** | **$0.0048** |

Routing alone takes that to ~$0.0035 (a 27% saving on WARM messages, ~67% on cold ones). Adding item B's
tier gate, which removes ~1,200 tokens of snapshot from free users, gets a free user to ~$0.0023.
➡️ Otto per free user per month: **~$0.17 today -> ~$0.08** with B and H. Break-even conversion moves from
4.7% to roughly **3.2%** (not the 2.7% first claimed).

**2. OUTPUT IS NOW THE BIGGEST LINE.** After routing, output is ~65% of a free user's message cost and no
spec has ever mentioned it. Whether to make Otto more concise is a real lever and a separate decision --
it is NOT part of this spec. (⚠️ Do not confuse it with the per-tier depth cap item A already rejected;
that was about making one tier feel worse, this would be app-wide.)

**3. "Append only" is WRONG as written.** See CACHING below. It conflicts with cross-user sharing, which is
worth more.

---

## THE DESIGN

### 1. A PERMANENT CORE, always sent (~2,400 tokens)
This is what makes a routing miss harmless, and it is why the router only has to be roughly right.

| Piece | Tokens | Why it can never be routed away |
|---|---|---|
| How To Use This Map | 441 | Holds the rule that Profile is NOT a tab for most users. Every chapter's "Profile > Settings > X" path is wrong without it. |
| Navigation Model | 138 | The tab list. Needed by any navigation answer. |
| Quick Index | 1,315 | ~60 real "how do I X, go here" answers covering the whole app. Answers most navigation questions on its own. |
| Coaching Modes | 102 | Shapes every answer regardless of topic. |
| Membership RULES (extracted) | ~300 | See below. |

⚠️ **THE MEMBERSHIP RULES MUST BE EXTRACTED INTO THE CORE.** That chapter is 37% instruction and those rules
are GLOBAL, not scoped to membership questions: never bring up the paid plan unprompted, faith is never
paywalled so never suggest paying for anything faith-related, never say "the whole app is free", never
describe a tier as "unlimited". If the chapter is routed away and someone casually asks "is this app free?",
Otto answers wrong about your money AND your faith stance in one breath. **This is the only place a routing
miss does real damage rather than being merely unhelpful.**
✅ Item B is already rewriting that block (item A changed the pitch rules), so the extraction is work that
was happening anyway.

**Everything else is routed.** A typical message becomes ~2,400 + one chapter = **3,500-6,500 tokens**
against 18,400 today.

### 2. WHOLE CHAPTERS ONLY, NEVER FRAGMENTS
The temptation will be to send just the barcode paragraph instead of the whole 4,000-token Log chapter.
**Do not.** A fragment is the dangerous state: Otto can see he has Log material, so he does not realise
anything is missing, and he answers a meal-slot question from a scrap and sounds certain.
Whole chapters keep him in one of two clean states: he fully knows an area, or he has none of it and his
existing NO-GUESS rule fires.

### 3. THE ROUTER
**Plain keyword matching in code. No model call.**
- Free, instant, and you can read the list and know exactly what it will do. A second model call would add
  latency to every reply and be wrong in ways you cannot inspect.
- **This pattern is already proven in the app**: `messageWantsFood`, `messageWantsSleep`,
  `messageWantsPRs` etc. all do exactly this, and their comments say they deliberately err toward
  including because a false positive costs a few tokens and a false negative reads as "I don't have that."

⚠️ **DELIBERATELY GENEROUS. Over-sending costs a fraction of a cent; under-sending makes him confabulate.**
An ambiguous word maps to EVERY chapter it could mean. "Library" sends Log AND Workout (~6,900 tokens),
which is still barely a third of today.

⚠️ **THE WORD LIST IS GENERATED FROM THE MAP, NOT WRITTEN FROM IMAGINATION.** The real risk is not common
words, it is the app's own feature names: Primed, At a Glance, Head to Head, Effort vs Results, Smart Tip,
Faith Today. "What does Primed mean" contains no generic word for a hand-written list to catch. Pulling
every feature name out of the map and pointing it at its own chapter is mechanical, complete by
construction, and regenerable when the map changes -- which also kills the sketch's maintenance worry.

❌ **DO NOT route on word FREQUENCY in the document.** Measured: "weight" appears in 10 of 15 chapters,
"goal" in 9, "water" in 9, "streak" in 8. Those chapters are not ABOUT weight; Settings mentions it because
there is a weight-units setting. Route on what a chapter OWNS, not what it mentions.

**Unroutable message -> send everything, exactly as today.** Costs what it costs now, carries no new risk.

### 4. CACHING -- the part that decides whether any of this saves money
Verified against the Anthropic docs 2026-07-31: cache write = 1.25x base input, 1-hour write = 2x,
cache read = 0.1x, up to **4 breakpoints**, exact-prefix match, and a change anywhere before a breakpoint
invalidates it and everything after.

**TWO BREAKPOINTS: one after the core, one after the chapters.**
Without this, any difference in chapters invalidates the core too. With it, two users who get different
chapters still share the core as a matching prefix and only pay a write on the chapter portion. **This is
the difference between fragmentation costing a little and costing everything.**

**CHAPTERS ARE ASSEMBLED IN FIXED DOCUMENT ORDER, ALWAYS.**
⚠️ **THIS CONTRADICTS THE OLD "APPEND ONLY" RULE AND SUPERSEDES IT.** Append-only preserves the prefix
*within* one conversation, but it means a user who asks about Stats then Log produces `[Stats][Log]` while
a user who asks the other way round produces `[Log][Stats]` -- different text, no shared cache. Canonical
order is worth more: with the core cached separately, re-writing the chapter block when a new chapter joins
costs about half a cent, and cross-user sharing pays that back many times over.

**MOVE THE FAITH-TIER LINE OUT OF THE CACHED HALF.** `buildCompanionStable` is `BASE + tierTail(faithTier)
+ map`, so there are three separate caches today for otherwise identical text. The tier is **already** in the
volatile block (`loadUserContext` sends "Faith journey: X"), so the cached copy is duplicated guidance, not
unique information. Removing it collapses three caches into one shared by every user in the app.
✅ Consistent with item A's rule that tier-dependent text belongs in the volatile half.

**1-HOUR CACHE TTL: evaluate, do not assume.** Costs 2x per write instead of 1.25x, but caps how often a
write can possibly happen (at most 24/day rather than up to 288). Worth modelling once real traffic exists;
it stacks with routing rather than replacing it.

### 5. CONVERSATION STATE -- solved, and simpler than feared
**The server RE-DERIVES the chapter set from the conversation history on every message.** Run the router
over every user message in the history and union the results.
- Stateless. No storage, no new plumbing, no client trust, self-healing if anything is ever lost.
- The client already sends the full history (`AssistantChat.tsx` passes `history` to the callable).
- Cost is keyword matching over a handful of short strings: microseconds. **Latency is a non-issue.**
❌ Rejected: having the client track and send the chapter list. It works, but it is state that can drift and
a lever a modified client could pull to inflate cost for nothing.

### 6. FREE WIN: never send the Faith chapter to "Not Right Now" users
Their faith tab is hidden, so 562 tokens they can never need. Zero risk, zero extra work once the machinery
exists.

### 7. AN OFF SWITCH
A server-side flag that falls back to sending the whole map, no build required. Costs almost nothing now
and is impossible to add in a hurry when Otto is misbehaving in production.

---

## FAILURE MODES, and why each is survivable

| What goes wrong | What happens | Verdict |
|---|---|---|
| Router misses a chapter on a **"where is X"** question | The core's Quick Index probably covers it. If not, the existing NO-GUESS rule fires and he says he is not certain and points at Settings > Help. | Unhelpful, not dangerous |
| Router misses on an **"explain X"** question | ⚠️ **THE REAL RISK.** The no-guess rule covers LOCATION, not concepts. He could answer plausibly and wrongly. | The thing the test list must hammer |
| Router over-sends | Costs a fraction of a cent | Fine, and preferred |
| Message can't be placed at all | Everything is sent, exactly as today | No change |
| Membership rules routed away | Wrong answers about money and faith | **Prevented by putting them in the core** |
| A chapter is sent as a fragment | Confident wrong detail | **Prevented by the whole-chapters rule** |

➡️ **The test list must be built around "what does X mean", NOT "where is X".** Navigation is covered twice
over; explanations are the exposure.

---

## VERIFYING IT ACTUALLY WORKED
The API response's `usage` reports `cache_creation_input_tokens` and `cache_read_input_tokens`. Log those
plus the chapter set chosen, per call. Without this you are trusting arithmetic forever, and it is the only
way to see the hit rate that the whole saving depends on.

---

## BUILD PROGRESS

**✅ BATCH 1 DONE + DEVICE-VERIFIED 2026-07-31.** `functions/src/knowledgeChapters.ts` parses the map into
its 15 chapters and reassembles them; `appCompanion.ts` now calls `assembleAppKnowledge()` instead of
pasting the blob. **Nothing Otto sees changed** -- proven before deploy by reassembling every chapter and
comparing to the original string character for character (`chapterSplitIsLossless()` returned true, 15
chapters found). Device test passed on all four probes: the step-goal answer still carried the "tap your
profile picture in the top-left" rule from HOW TO USE THIS MAP, and the hydration answer still listed all
eight badge tiers from the ACHIEVEMENTS CATALOG, so both ends of the map are intact.
⚠️ The split is done by PARSING the existing string, never by retyping it into constants -- that map is
dense with corrections earned from real bugs and hand-cutting it would eventually drop one silently. A
runtime check logs loudly if a future edit ever breaks the divider shape.

**🟡 BATCH 2 BUILT + MEASURED 2026-08-04, WIRED TO NOTHING.** `functions/src/knowledgeRouter.ts` decides the
chapter set; `appCompanion.ts` still calls `assembleAppKnowledge()` with no argument, so Otto ships all 15
chapters exactly as before. Turning it on is a one-line change and its own decision.

**HOW IT WORKS, and three earlier versions were measured and discarded getting here:**
- Every term in a message votes for every chapter it appears in, weighted by how CONCENTRATED it is there
  (share squared), then normalised by chapter size. Chapters within 15% of the winner all get sent, up to 4.
- Plus a NAME index: Title Case phrases and consistently-capitalised words pulled out of the map, which is
  the spec's "generate the list from the map, not from imagination" rule. Names are not size-normalised.
- ❌ **Exclusivity ("term belongs to the chapter it appears in ALONE") failed** -- it binned "routine",
  which is overwhelmingly a Workout word mentioned once elsewhere.
- ❌ **A repetition floor failed** -- it threw away every word used once, leaving half of all messages with
  nothing to match on.
- ❌ **Ranking by raw hits failed** -- the LONGEST chapter won on volume alone, taking questions about
  verses and day scores.

**MEASURED against 343 questions generated FROM the chapters (so the label is right by construction):**
| Setting | Right chapter | Manual tokens saved |
|---|---|---|
| **share .65, hits 2, keep .15, max 4** | **95%** | **39%** ⬅️ **CHOSEN BY JUSTIN 2026-08-04** |
| share .45, hits 2 | 92% | 50% |
| share .65, hits 1 | 89% | 56% |
| share .45, hits 1 | 86% | 65% |

⚠️ **THE SPEC'S 65-80% PROJECTION WAS OPTIMISTIC.** It assumed routing always works and always picks one
chapter; it never accounted for messages that match nothing and fall back to sending everything, which is
47% of them at the chosen setting. That single assumption is most of the gap.
⚠️ **AND THE HEADLINE SAVING IS SMALLER THAN THE TOKEN SAVING SOUNDS.** The map is about a third of a
message's cost, so ~40% off the map is ~19% off the message. Routing is worth **1-2 cents per free user per
month** (SPEC_cost_model.md). Real, but it was never the thing that decides whether the app makes money, and
it was allowed to be framed that way for hours before anyone did the arithmetic.
⚠️ **THE CONSTANTS IN THAT FILE ARE THE CHOSEN SETTING AND ARE NOT TO BE NUDGED** without re-running
`scratchpad/router-bulk.js`. They were briefly left on sweep values, which would have shipped a setting
nobody agreed to. Env-var overrides were removed for the same reason.

**STILL TO DO before it can be turned on:** two cache breakpoints (see CACHING), the membership-rules
extraction into the core, re-deriving the chapter set from conversation HISTORY (section 5), and the off
switch (section 7).

## NOTED FOR ITEM B's VOICE PASS (not a routing problem)
Spotted during batch 1 testing: asked "why am I so tired lately", Otto ended a long answer with three
stacked questions including **"Are you sleeping enough tonight?"** -- odd twice over, since tonight has not
happened yet and he had just told the user their sleep was solid. It is how he has always written, not
something routing caused. Item A already ruled that he must not interrogate users for data he cannot
verify; this is the paid-tier version of the same habit.

## STILL OPEN (deliberately not decided here)
- **Halo and the AI Meal Estimator have never been priced.** Otto, Halo and Smart Coach all run on Haiku;
  the estimator is the only Sonnet call left. Halo is known to sit on the 4,096-token caching threshold with
  content that varies per request, which splits its cache -- the same class of bug this spec fixes. Read
  both before declaring the cost work finished. ⚠️ Item A's scope said "Otto only"; that was a decision, but
  it was made before anyone measured the other two.
- **The duplicate knowledge file.** `ASSISTANT_APP_KNOWLEDGE.md` at the repo root has already drifted from
  the bundled copy. Restructuring the bundled one into chapters makes that worse. Decide: regenerate it from
  the bundled file, or delete it.
- **Output concision** (see THE NUMBERS above).
- **1-hour cache TTL -- PINNED 2026-07-31, do not flip it yet.** It is one extra field and has no
  performance downside (cache hits are marginally faster than fresh reads). But it is NOT a free win, and
  the maths flips with traffic:
  • **A question every few minutes** -> the 5-minute copy never expires, so you rarely pay to make one.
    **5 minutes wins.**
  • **A question every ~20 minutes** -> the 5-minute copy is always gone and you pay 1.25x to remake it every
    time; the 1-hour copy survives and is read at 0.1x. **1 hour wins clearly.**
  • **Less than one question an hour** -> BOTH expire before the next question, so you pay to make a copy
    every time and the 1-hour version costs 2x instead of 1.25x for nothing. **5 minutes wins again.**
  ➡️ At 11 testers you are in the LAST band, so switching now would likely cost MORE. It becomes right
  somewhere around a few hundred active users and stops being right once traffic is properly steady.
  ⚠️ Check whether the 1h TTL still needs a beta header at build time.
  🔴 **UNPINNED 2026-08-04 EVENING -- BUILD IT. The three bands above are CORRECT; the conclusion was
  applied to the wrong traffic level.** "At 11 testers you are in the last band" is true and irrelevant:
  the question is what happens at LAUNCH, not on the tester build. **The crossover sits at roughly 8-10
  companion messages a day across the whole app** -- any launched app clears that on day one, which puts
  GoodForge in the MIDDLE band ("1 hour wins clearly") from the moment it ships.
  **Measured 2026-08-04 (`scratchpad/model3.js`): $0.02971 -> $0.00422 per message at 100 msgs/day, 7x
  cheaper. Identical at high volume, so there is no traffic level at which it hurts a live app.**
  ⚠️ This pin was then copied into SPEC_cost_model.md as a flat "REJECTED -- at current traffic it costs
  MORE", losing the band nuance entirely, and that is what kept it buried. **A conditional decision must
  never be summarised as an unconditional one.** Both files now corrected; see SPEC_cost_model.md section 1.
