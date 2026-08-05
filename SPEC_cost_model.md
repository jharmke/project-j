# SPEC: Cost / revenue model -- BUILT 2026-08-04

**⚠️ THIS SUPERSEDES the cost model in SPEC_monetization.md (~line 667-690).** That one was written before
four things changed and has no date on its face, so it kept getting quoted as current. It said every
install scenario loses money. That is no longer true.

**What was wrong with it, all four verified 2026-08-04:**
| It assumed | Actually |
|---|---|
| $6.99/month | **$9.99** |
| Apple takes 30% | **15%** available via the Small Business Program (Justin qualifies; enrolment still a pre-launch to-do) |
| Halo 25 messages/day free | **10/day since 2026-07-29** -- Halo and Otto now match at 10 free / 30 Supporter |
| Free users get the full data snapshot | **The tier gate shipped** (THE PLAN item B) |

⚠️ **HOW THAT HAPPENED, so it does not happen again: the numbers were found by keyword-searching a
2,500-line spec that is half history.** Search lands on superseded blocks as readily as current ones. Caps
and prices were then re-derived FROM THE CODE, which cannot go stale. Do the same next time.

---

# ✅ 2026-08-05: A COST METER NOW EXISTS. STOP CALCULATING, GO AND READ IT.

`functions/src/aiUsageMeter.ts` records Anthropic's own token counts on every AI call to Firestore
`ai_cost/{uid}_{date}`, split by feature. **Per-call costs are now READINGS, not arithmetic.** Before
quoting any per-call figure from this file, check the collection -- it is the source of truth and this file
is a derivation.

**Metered 2026-08-05, BEFORE the fixes:** Smart Coach **$0.00387** · Halo **$0.00406** · Otto cold
**$0.0331** / warm **~$0.0043** · meal estimator with a photo **$0.00953**.

### ✅ AND AFTER, SAME DAY -- ALSO METERED, NOT PROJECTED
| | before | after (warm) | |
|---|---:|---:|---|
| **Smart Coach** | $0.00387 | **$0.00107** | 72% off. Crossed the 4,096 cache minimum for the first time (PLAN 1.1) and moved to a 1-hour TTL (2.1a) |
| **Halo** | $0.00406 | **$0.00067** | 83% off on a short reply, ~$0.0011 on a realistic one. Crossed the minimum for the first time (2.3) |
| **Otto** | ~$0.0043 | unchanged per call | 2.2 collapsed three cached copies into one, which raises the HIT RATE rather than lowering the per-call price |

🔴 **NEITHER SMART COACH NOR HALO HAD EVER CACHED ONCE** before 2026-08-05. Both had been paying full price
for byte-identical text on every message since the day they shipped, because both prompts sat a hundred-odd
tokens under Haiku's 4,096 minimum and nobody had checked.
⚠️ **These are WARM prices.** At Justin's solo volume many calls are still cold writes, so the bill will not
show the full saving until real traffic keeps the caches warm. **Watch the ratio of `cacheReadTokens` to
`cacheWriteTokens` in `ai_cost`** -- that single number says whether the caching work is landing, for every
feature at once.
✅ **The model validated itself** -- Otto's two test calls came to $0.03904195 against a predicted $0.0390,
and the cached block metered at 26,477 tokens against 26,474 measured.
🔴 **It corrected three numbers on day one** (Halo's prompt size, the estimator's prompt size, and the fact
that cache minimums differ by model). See the table in section 10b. **Every per-call number that predates
the meter should be treated as suspect until a reading confirms it.**

### 🔬 THE FIRST FULL DAY OF REAL OTTO TRAFFIC (2026-08-05, 15 calls, one account)
Straight off `ai_cost`. **Where the money actually went:**
| | tokens | rate | cost | share |
|---|---:|---|---:|---:|
| cache WRITES (cold) | 106,968 | 1.25x input | **$0.1337** | **67%** |
| full-price input | 32,960 | 1x | $0.0330 | 16% |
| cache READS (warm) | 294,125 | 0.1x input | $0.0294 | 15% |
| output | 854 | 5x input | $0.0043 | 2% |
| | | | **$0.2004** | |

✅ **The meter's own `usd` field reconciles to this model to the cent** ($0.200352). The price model is sound;
use it.

🔴 **FINDING 1: THE COLD WRITE IS THE COST, NOT THE UNCACHED TAIL.** The 26,442-token block was written cold
~4x and read warm ~11x. Two thirds of the day's spend is rebuilding a cache that expired between sessions.
➡️ **This CONFIRMS 2.1b rather than overturning it.** At a 1-hour TTL those same 4 writes cost 5.3c each
instead of 3.3c (2x premium vs 1.25x), so 1h is worse here unless the longer window actually merges sessions
into one another. Justin's sessions are spread across the day, so it would not. **Hold at 5 minutes.**
⚠️ **This flips at real traffic for a reason that has nothing to do with TTL:** the block is byte-identical
for every user (2.2), so with enough users it never goes cold at any TTL. **The trigger for 2.1b should be a
measured cold-write rate, not the launch date.**

🔴 **FINDING 2: ~2,200 FULL-PRICE TOKENS PER MESSAGE, NOT THE 1,100-1,400 ASSUMED** (32,960 / 15). History is
the only piece big enough to explain the gap. ➡️ First real evidence for **PLAN 4.5** (`MAX_HISTORY_TURNS` is
12 and has never been measured or tuned), which is now the biggest open item in section 4.

⚠️ **This day mixes before and after PLAN 4.3**, which deployed mid-afternoon, so it does NOT size 4.3. The
first all-after day is the clean read.

---

# 🔴 READ THIS FIRST -- 2026-08-04 EVENING. THREE THINGS BELOW ARE NOW KNOWN TO BE BACKWARDS.

Everything in this section was measured by running the REAL router over 566 realistic messages and pricing
the result with Anthropic's real cache arithmetic. Scripts: `scratchpad/scan-manual.js`, `model3.js`,
`net2.js`.

## 1. ⛔ THE 1-HOUR CACHE TTL IS NOT A REJECT. IT IS THE SINGLE BIGGEST WIN IN THE APP.

The REJECTED table at the bottom of this file says *"At current traffic it costs MORE. Revisit around a few
hundred active users."* **That is exactly backwards and it cost weeks.**

The reasoning was that a 1-hour write costs 2x versus 1.25x, so a block you only read once is worse. True in
isolation, and it misses the whole point: **at low traffic the 5-minute cache expires BETWEEN MESSAGES, so
you pay the write price on almost every single call.** A 1-hour cache pays 2x once and then reads at 0.1x
for an hour. Low traffic is where it helps MOST, not least.

| total app volume | today (5-min, 3 faith copies) | 1-hour TTL | |
|---:|---:|---:|---|
| 100 msgs/day | $0.02971 | **$0.00422** | **7x cheaper** |
| 500 msgs/day | $0.01690 | **$0.00412** | 4x |
| 2,000/day | $0.00507 | $0.00412 | |
| 10,000+/day | $0.00412 | $0.00412 | identical, no downside |

**It is one line of code, it has no failure mode, and it is worth 7x at the traffic level GoodForge will
actually launch at.** Do this before anything else on this page.

## 2. ⛔ HALO'S FIX IS TO MAKE ITS PROMPT *BIGGER*.

This file already records that Halo's 2,465-token prompt is under Haiku's 4,096 minimum and has therefore
never cached. It then concludes *"its only lever is prompt SIZE -- there is no traffic level at which
caching starts paying for it."* **The direction was wrong.** Shrinking it further keeps it uncacheable
forever. **Padding it PAST 4,096 with genuinely useful content makes it cacheable, and then it reads at
0.1x: $0.0032 -> ~$0.0007 per message. About 6x cheaper by adding to it.**
And Justin has already ruled the safety, theology and crisis blocks off-limits to CUT -- so growing them is
the one direction that was always allowed.

## 3. ⛔ ROUTING (ITEM H) DOES NOT WORK AS BUILT. TWO SEPARATE REASONS.

Measured over 566 realistic messages with the real `routeChapters()`:

- **It falls back 73% of the time and sends the ENTIRE manual.** The confidence gate needs two strongly-owned
  terms, and real messages do not have them. Things it gave up on: *"did i eat too much today"*, *"log my
  lunch for me"*, *"macros for my breakfast"*, *"did i hit my protein goal"*. These are obvious food
  questions. **Identical failure mode to the keyword detectors** -- tuned against clean phrasing, collapses
  against how people type. See [[detectors-are-brittle]].
- **When it DOES route it is excellent**: 1.7 chapters, 10,704 tokens, 60% smaller.
- ⚠️ **But it shatters the cache into 57 separate entries.** One block everybody shares becomes 57 small ones
  that each go cold. On the 5-minute cache this makes routing **more expensive than doing nothing** at normal
  volume. Even with the fallback fixed AND a 1-hour cache, it only beats no-router above ~10,000 messages/day.

➡️ **PARK ROUTING.** It is a scale optimisation, not a launch one, and the "~28% off per message" in the
lever register below was never real. Revisit at 10k+ msgs/day.

## 4. WHAT THE CACHED BLOCK IS ACTUALLY MADE OF (measured, `scan-manual.js`)

**26,474 tokens = 22,049 app manual (83%) + 4,425 Otto's own standing rules (17%).**
⚠️ An earlier note in this session guessed the rules at ~8,000. Wrong; they are 4,425.

| tokens | chapter | | tokens | chapter |
|---:|---|---|---:|---|
| 4,188 | Log tab (food diary) | | 1,271 | Achievements catalog |
| 3,183 | Workout tab | | 1,253 | Profile tab |
| 2,534 | Support the Mission / membership | | 1,030 | Home tab |
| 2,249 | Key destination screens | | 635 | Faith tab |
| 1,886 | Settings | | 503 | How to use this map |
| 1,398 | Common "how do I" quick index | | 193/190/165 | Faith tiers, navigation, coaching modes |
| 1,308 | Stats tab | | | |

Top five chapters are 64% of the manual. **The manual is genuinely tight in style** -- the Log chapter was
read line by line and there is no filler; every line is a correction earned from a real bug. Nobody
overstated that. It is long because it is thorough, not because it is loose.

## 5. ❌ IDEAS KILLED BY THE SCAN (do not re-propose)

| Idea | Why it is dead |
|---|---|
| **A smaller "free edition" of the manual** | Assumed lots of the app is Supporter-only. It isn't. Log, Workout, Stats, Home, Profile and Settings are all free; the gating is INSIDE features (macro editing, the exercise cap), not whole chapters. There is almost nothing to stub out. Worth ~15%, not the 40-70% floated |
| **Rewriting the manual denser** | Verified by reading it. It is already tight |
| **Switching AI provider / cheaper model** | Cost is dominated by reading a huge prompt, not by the per-token rate. A cheaper model still reads 26,474 tokens. Shrinking the prompt beats switching models, and Haiku 4.5 is already the cheapest Claude |
| **A 100/month pool instead of a daily cap** | See the cap decision below. Justin killed it and he was right |
| **Removing Otto from free after a trial week** | Justin: *"that is drastic."* DEAD. Do not resurrect |

## 6. ✅ THE CAP DECISION: 5/DAY, NOT A MONTHLY POOL

A monthly pool was proposed and then rejected on Justin's reasoning, which is better than the reasoning that
proposed it:

**A daily cap creates a RECURRING wall. A monthly pool creates ONE wall and then three dead weeks.**
Someone who wants 12/day hits a daily cap thirty times a month -- thirty pitch moments, and they come back
tomorrow. The same person burns a 100/month pool in eight days, gets one pitch, then has no reason to open
the app for three weeks. **The daily cap is the better conversion machine.**

And the heavy free user is not a cost problem, **they are your best lead** -- they are demonstrating daily
that they want more than free gives them.

| cap | worst-case free user, Otto+Halo, per year (after fixes) |
|---|---:|
| 10/day (today) | $26.74 |
| **5/day (DECIDED)** | **$9.61** |
| 5/day + canned answers | $6.60 |
| *(one Supporter is worth)* | *$101.88* |

At 5/day your most expensive possible free user costs **6% of a subscriber**. One in fifteen of them
converting pays for all of them.
🟡 **Still open:** whether a canned (zero-cost) answer counts against the cap. Justin leans YES, because he
wants people reaching the limit. Counter wording/placement deliberately NOT settled -- needs the screen.

## 7. 🆕 THE LEAD IDEA: SPLIT OTTO IN TWO

**Why GoodForge is expensive when competitor AI companions are not:** their prompts are ~2,000 tokens.
Ours is 26,474. Because **Otto is not just a coach, he is also the help desk** -- 22,049 of those tokens
teach him where every button lives. And the coaching half is nearly FREE, because Claude already knows
nutrition, training and sleep. **You are only paying to teach him YOUR APP.** Competitors mostly don't do
that, and they put the AI behind the paywall besides.

➡️ **Two prompts, one Otto:**
- **Coach Otto** -- their body, food, training, motivation. **No manual at all**, ~5,000 tokens.
- **Support Otto** -- "how do I add a custom food." Full manual, exactly as today.

This is routing reduced to **one yes-or-no question**, which is enormously more reliable than a 15-way
choice -- and it gives **two** cache entries instead of 57, so the fragmentation that killed item H
disappears.

⚠️ **Justin's own read on the usage pattern, and it matters: the mix is not fixed, it moves over a user's
life.** Week one is mostly "how does this work"; by month two it is mostly "why is my recovery score low."
So the expensive manual is needed most by NEW users, and long-term users mostly hit the cheap half. **Cost
per message falls as a user is retained.** First structurally good news in the model.

## 8. 🔬 HOW TO GET THE MIX WITHOUT GUESSING (and why the obvious method is invalid)

⚠️ **A generated-question measurement would be CIRCULAR here and must not be run.** The detector audits were
valid because they tested REAL CODE -- "this pattern misses 47 of 60 phrasings" holds no matter what mix you
feed it. Here **the mix IS the answer**, so inventing the questions means marking your own homework. Justin
caught this; it is a genuine methodological line and it applies to any future "what will users do" question.

✅ **Instead, ship the classifier LOGGING-ONLY.** Both halves keep pointing at the full manual, so nothing
changes for anyone and nothing can break. Log the classification. Two weeks of real users gives the real
number, then flip the coach half to the small prompt knowing exactly what it is worth.

## 9. ✅ THE DIALS -- HOW TO LAUNCH WITHOUT GAMBLING

Justin's concern: *"I would hate to launch, lose money, and then have to change a bunch of stuff cause we
gambled and lost."* The answer is not a better forecast. **Move every expensive number out of the code and
into a Firestore settings doc the Cloud Function reads per call.**

| Dial | Visible to the user? |
|---|---|
| Free daily cap (Otto and Halo separately) | 🔴 **YES -- the only one** |
| Which model Otto runs on | No |
| Whether the manual is attached (coach/support split) | No |
| Whether canned answers are on, and which questions | No |
| Reply length | Barely |
| Halo's prompt size and cache setting | No |

➡️ **THE RULE: tighten the invisible dials freely, never tighten the visible one.**
- **Launch low, plan to RAISE.** Start at 5. *"We've increased your daily messages"* is a great message to
  send. The opposite is not.
- **If the cap ever must tighten, GRANDFATHER.** Existing users keep their number; new users get the new one.
  Nobody personally experiences a takeaway, which is the thing that actually makes people angry.
- **Never print a cap number in marketing copy.** A counter saying "3 left today" is a status. "5 messages a
  day" on a website is a promise.

## 10. THE HEADLINE NUMBERS (after 1h cache + faith fix + Halo padding + 5/day cap + canned answers)

**BREAK-EVEN CONVERSION: ~2.8% -> ~1.3%.**

⚠️ **THAT 1.3% ASSUMES CANNED ANSWERS DEFLECT 40% OF OTTO MESSAGES, AND THAT NUMBER IS A GUESS.** It cannot
honestly be measured before launch (section 8 -- generating the questions makes it circular). At 25%
deflection break-even is nearer **1.6%**; with no canned answers at all, nearer **1.9%**. The 1h cache,
faith fix, Halo padding and 5/day cap are all measured and carry the app from 2.8% to ~1.9% on their own.
**Quote 1.9% as the safe figure and 1.3% as the upside.**

50,000 installs (2,500 active), 1 msg/active user/day, 12 months:

| conversion | revenue | net today | net after |
|---|---:|---:|---:|
| 1% | $2,547 | -$4,433 | -$725 |
| 2% | $5,094 | -$1,921 | **+$1,806** |
| 3% | $7,641 | +$591 | **+$4,337** |
| 5% | $12,735 | +$5,616 | **+$9,398** |

AI as a share of revenue at 3% conversion: **92% -> 43%** at 1/day (healthy is under 30%).

🔴 **USAGE IS STILL THE BOSS, and no amount of engineering changes that.** At 3% conversion the app can
afford about **2 messages per active user per day**. At 3/day every scenario loses money; at 5/day nothing
works below 8% conversion. **That is what the cap is for** -- not because 5/day is expected, but so the
people who do get there are bounded.

## 10b. ⚠️ EVERY CONSTANT NEEDED TO REBUILD THIS, BECAUSE THE SCRIPTS DO NOT SURVIVE

⚠️ **Scratchpad scripts live in a per-session temp folder and are GONE next session.** The "RE-RUN IT"
pointer at the bottom of this file already points at a `cost-model.js` that no longer exists. **So the
numbers are recorded here instead of the code that produced them.** Do this for any future model.

| Constant | Value | Source |
|---|---|---|
| Haiku 4.5 input / output | $1.00 / $5.00 per Mtok | Anthropic pricing |
| Cache READ | 0.1x input | |
| Cache WRITE, 5-minute TTL | 1.25x input | |
| Cache WRITE, 1-hour TTL | **2.0x input** | The lever in section 1 |
| **Haiku 4.5 minimum cacheable prefix** | **4,096 tokens** | ⚠️ Under this, NOTHING caches, silently. This is what has been killing Halo |
| Otto cached block | **26,474** = 22,049 manual + 4,425 rules | Measured |
| Otto uncached input / output per msg | ~223 / ~250 tokens | Back-solved from the measured $0.00412 warm call |
| ~~Halo prompt~~ | 🔴 **3,987 tokens, NOT 2,465** | **METERED 2026-08-05** off a real call. The old figure was 62% low. Only ~150 short of the 4,096 minimum, so the padding fix is trivial |
| **Haiku 4.5 cache minimum** | **4,096** | ⚠️ **Minimums DIFFER BY MODEL and this was never checked: Sonnet 4.6 is 1,024.** Any "under the minimum" claim must name its model |
| Meal estimator prompt | **562 tokens** | METERED. Item O recorded "~2,250" -- wrong |
| Meal estimator image | ~1,550 tokens (**49% of that call's cost**) | Full-res upload, scaled by Anthropic to their 1568px cap |
| Router core (always sent) | 6,874 tokens | 4,425 rules + 5 core chapters |
| Router fallback rate | **73%** | 566 realistic messages |
| Router when it works | 1.7 chapters, 10,704 total | |
| Router distinct cache combos | **57** | The fragmentation problem |

**Cache warmth model** (this is the piece that makes low-traffic behaviour come out right, and the piece the
old model was missing entirely):
> `warm_probability = 1 - e^(-rate × ttl_minutes)`, where `rate = total_msgs_per_day ÷ 960 ÷ cache_copies`
> (960 = 16 waking hours × 60 min; `cache_copies` is 3 today because of the faith-tier split, 1 after the fix)
>
> `cost_per_message = uncached_in × $1/M + block × (warm × 0.1 + (1-warm) × write_multiplier) / 1M + out × $5/M`

⚠️ **The cache is shared account-wide, not per user.** Every user on the app keeps the same entry warm for
everyone else, which is why volume improves cost on its own and why the faith-tier split (3 entries instead
of 1) hurts more than it looks.

## 11. ⏭️ THE ORDER TO BUILD IT IN

1. **1-hour cache TTL** -- one line, 7x at launch volume, zero risk
2. **Faith cache fix** -- three cached copies collapse into one shared one
3. **Pad Halo past 4,096 tokens** -- ~6x off Halo, which is ~40% of a free user's cost
4. **5/day cap** + the counter (wording still open)
5. **Canned answers** for fixed-answer app questions -- zero cost, faster, always correct.
   ⚠️ Match conservatively; anything doubtful goes to Otto. A wrong canned answer is worse than paying
6. **Coach/Support split, logging-only first** (see 7 and 8)
7. **Batch API for non-chat AI** -- 50% off anything that need not be instant (Smart Tips, weekly/monthly
   summaries, diagnostic report). ⚠️ Check which of those actually call the AI before promising a number
8. **Audit Otto's 4,425 tokens of standing rules** -- never once reviewed
9. **Apple Small Business Program enrolment** -- still worth more than most of this list

---

## THE INPUTS

**VERIFIED IN CODE (cannot be stale):**
- Otto: **10/day free, 30/day Supporter** (`functions/src/appCompanion.ts`)
- Halo: **10/day free, 30/day Supporter** (`functions/src/faithCompanion.ts`)
- Smart Coach + AI Meal Estimator server safety caps: 100/day and 60/day (`functions/src/aiProxy.ts`).
  These are abuse backstops, NOT the product quota -- the estimator's real free limit is client-side.

**ASSUMPTIONS (each one is a lever; change it and re-run):**
| Input | Value | Where it comes from |
|---|---|---|
| Price | $9.99/month | Live from RevenueCat; never hardcoded in the app |
| Apple's cut | 15% | Small Business Program. The 30% table is below in case enrolment slips |
| Installs still active at day 30 | 5% | SPEC_monetization's own figure |
| Companion messages/month | 36 total across Otto AND Halo | SPEC_monetization's light-usage figure. It is ~6% of what the caps allow |
| Otto per message | ⚠️ **$0.00412 MEASURED** (warm cache), was assumed $0.0027 | Real API call, real prompt, Anthropic's own token counts |
| Halo per message | ⚠️ **$0.0032 MEASURED**, was assumed $0.0025 | 8 real calls |
| ~~Smart Coach~~ | 🔴 **$0.046 IS WRONG -- MEASURED SHAPE IS ~$0.37/user/month (8x)** | It assumed weekly usage. Tips fire on SCREEN OPEN; the Home tab alone fires two a day. See `PLAN.md` section 1 |
| Estimates/month | 2 @ ~$0.02 | Light-usage figure; free cap is 5/month |
| Supporter usage | 2x a free user | Judgement. They have 3x the caps but are still one person |

**RESULT: an active free user costs ~$0.18/month. A Supporter costs ~$0.36 and nets $8.49.**
**BREAK-EVEN CONVERSION: 2.16% of active users.**

## 🔴 EVERYTHING BELOW WAS RE-RUN 2026-08-04 ON MEASURED NUMBERS. WHAT THE ASSUMPTIONS GOT WRONG:

**OTTO'S CACHED BLOCK IS 26,474 TOKENS, NOT 18,400.** Every doc counted the app MANUAL and forgot Otto's
own standing rules sitting in front of it in the same cached half. That is a 44% undercount on the single
biggest line in the app, and it had been quoted in three places. Measured Otto: **$0.00412 warm**, against
$0.0027 assumed.
**HALO IS $0.0032, NOT $0.0025** -- the old figure was input only and never counted its reply.
➡️ **Break-even moves from 2.16% to 2.63% at 1 msg/day, and from 3.80% to 5.14% at 3/day.**

⚠️ **COLD CALLS COST $0.0345, EIGHT TIMES A WARM ONE.** At low traffic the cache expires between messages,
so early users are far more expensive than any table here shows. This is the strongest argument for the
faith-tier cache fix (three separate cached copies collapse into one that every user shares and keeps warm)
and for routing.
✅ **AND IT MAKES ROUTING WORTH MORE THAN THOUGHT.** A bigger cached block means a bigger slice to cut.

(historical) 🔴 **THE TABLES BELOW UNDERCOUNT HALO BY ABOUT 28%, KNOWN AND NOT YET RE-RUN.** They use $0.0025, which came
from SPEC_monetization and is INPUT ONLY -- it never counted Halo's reply. **Measured over 8 real calls on
2026-08-04: $0.0032.** Corrected, at 3 messages/day and 3% conversion, 25,000 installs is about **-$984**
rather than the -$497 the uncorrected figure gives.
🔴 **AND HALO NEVER CACHES AT ALL.** Its prompt is 2,465 tokens, under Haiku's 4,096-token minimum, so the
`cache_control` line in `faithCompanion.ts` has never done anything. Cache reads and writes were ZERO across
all 8 calls. The docs called this Halo's cache "splitting"; there is no cache to split. **Its only lever is
prompt SIZE** -- there is no traffic level at which caching starts paying for it.
⚠️ **The Otto figure below also predates two things that shipped 2026-08-04**: replies are now 46% shorter
(measured), and routing is still NOT wired in. Re-run `scratchpad/cost-model.js` before quoting these.

---

## ✅ NET PER YEAR -- MEASURED NUMBERS, 2026-08-04. THESE ARE THE CURRENT TABLES.

⚠️ **STILL VALID, BUT AS THE "DO NOTHING" BASELINE ONLY.** These are the app as it stands with no fixes
built, and they assume the 5-minute cache is always warm, which is false at launch traffic. **For the
after-fixes numbers use section 10 at the top of this file.** Do not quote the break-evens below as the
app's economics without saying "before the cost fixes".

### 1 message/day (36/mo). Cost per free user **$0.218**. Break-even **2.63%**

| Installs | 1% conv | 3% conv | 5% conv | 10% conv |
|---|---|---|---|---|
| 300 | -$24 | +$5 | +$35 | +$110 |
| 1,500 | -$122 | +$27 | +$176 | +$549 |
| 4,000 | -$324 | +$73 | +$470 | +$1,463 |
| 8,000 | -$648 | +$146 | +$940 | +$2,926 |
| 25,000 | -$2,025 | +$457 | +$2,939 | +$9,144 |

### 2 messages/day (60/mo). Cost per free user **$0.306**. Break-even **3.73%**

| Installs | 1% conv | 3% conv | 5% conv | 10% conv |
|---|---|---|---|---|
| 300 | -$40 | -$11 | +$19 | +$92 |
| 1,500 | -$201 | -$54 | +$93 | +$462 |
| 4,000 | -$537 | -$144 | +$249 | +$1,231 |
| 8,000 | -$1,074 | -$288 | +$498 | +$2,462 |
| 25,000 | -$3,356 | -$900 | +$1,555 | +$7,695 |

### 3 messages/day (90/mo). Cost per free user **$0.415**. Break-even **5.14%**

| Installs | 1% conv | 3% conv | 5% conv | 10% conv |
|---|---|---|---|---|
| 300 | -$60 | -$31 | -$2 | +$71 |
| 1,500 | -$301 | -$156 | -$10 | +$353 |
| 4,000 | -$803 | -$415 | -$28 | +$941 |
| 8,000 | -$1,606 | -$831 | -$56 | +$1,883 |
| 25,000 | -$5,020 | -$2,597 | -$174 | +$5,883 |

🔴 **AT 3 MESSAGES A DAY YOU NEED BETTER THAN 5% CONVERSION.** Even 5% is roughly break-even. That is the
single most important number in this file.

## (historical, assumption-based) NET PER YEAR -- at 15%

| Installs | 1% conv | 3% conv | 5% conv | 10% conv |
|---|---|---|---|---|
| 300 | -$17 | +$13 | +$42 | +$117 |
| 1,500 | -$87 | +$63 | +$212 | +$586 |
| 4,000 | -$232 | +$167 | +$566 | +$1,564 |
| 8,000 | -$463 | +$335 | +$1,133 | +$3,128 |
| 25,000 | -$1,447 | +$1,046 | +$3,540 | +$9,774 |

## NET PER YEAR -- at 30% (if Small Business enrolment slips)

| Installs | 1% conv | 3% conv | 5% conv | 10% conv |
|---|---|---|---|---|
| 300 | -$20 | +$4 | +$29 | +$90 |
| 1,500 | -$100 | +$22 | +$145 | +$452 |
| 4,000 | -$268 | +$60 | +$387 | +$1,204 |
| 8,000 | -$535 | +$119 | +$773 | +$2,408 |
| 25,000 | -$1,672 | +$372 | +$2,416 | +$7,526 |

## THE USAGE LADDER -- THE MOST IMPORTANT PART OF THIS DOC

Everything above uses 36 messages/month, which is ~1.2/day. That is the assumption the whole model rests
on, and nothing enforces it: the CAPS allow ~600/month. Here is the same table as usage rises.

### CASUAL -- 60/month (~2/day). Cost per free user **$0.24**. Break-even **2.93%**

| Installs | 1% conv | 3% conv | 5% conv | 10% conv |
|---|---|---|---|---|
| 300 | -$29 | +$1 | +$31 | +$105 |
| 1,500 | -$144 | +$5 | +$153 | +$525 |
| 4,000 | -$383 | +$13 | +$409 | +$1,399 |
| 8,000 | -$766 | +$26 | +$818 | +$2,798 |
| 25,000 | -$2,393 | +$82 | +$2,557 | +$8,744 |

⚠️ At 2 messages a day, **3% conversion is break-even and nothing more** -- $82/year at 25,000 installs.
The comfortable margin in the headline table exists only at ~1 message a day.

### ENGAGED -- 90/month (~3/day). Cost per free user **$0.32**. Break-even **3.92%**

| Installs | 1% conv | 3% conv | 5% conv | 10% conv |
|---|---|---|---|---|
| 300 | -$43 | -$13 | +$16 | +$89 |
| 1,500 | -$214 | -$67 | +$80 | +$447 |
| 4,000 | -$572 | -$180 | +$213 | +$1,193 |
| 8,000 | -$1,144 | -$359 | +$425 | +$2,386 |
| 25,000 | -$3,574 | -$1,123 | +$1,329 | +$7,457 |

🔴 **At 3 messages a day, 3% conversion LOSES money at every scale.** You need 5%.

## ⚠️ NET PER YEAR -- HEAVIER USE (5 companion messages/day, ~150/month)

Still only ~15% of what the caps allow, and an entirely ordinary number for an engaged user.
An active free user now costs **$0.48/month**.

| Installs | 1% conv | 3% conv | 5% conv | 10% conv |
|---|---|---|---|---|
| 300 | -$71 | -$42 | -$14 | +$59 |
| 1,500 | -$356 | -$212 | -$68 | +$293 |
| 4,000 | -$950 | -$565 | -$181 | +$781 |
| 8,000 | -$1,900 | -$1,131 | -$361 | +$781 |
| 25,000 | -$5,938 | -$3,533 | -$1,128 | +$4,883 |

---

## WHAT THIS ACTUALLY SAYS

1. **At the 3% conversion the docs assume, the app is positive at every scale.** The old model said the
   opposite. Halving Halo's free cap and shipping the tier gate are most of the difference; the price rise
   and the Apple cut are the rest.
2. **Below ~2.2% conversion it loses money at any size**, and the loss grows with scale, because cost
   follows every free user while revenue follows only the few who pay. That has not changed and never will.
3. 🔴 **USAGE IS A BIGGER LEVER THAN CONVERSION, and this is the finding that matters.** Break-even moves
   2.16% -> 2.93% -> 3.92% -> 5%+ as usage goes 1 -> 2 -> 3 -> 5 messages a day. Every one of those is an
   ordinary number, and the highest is still only 15% of what the caps allow.
   **The app is comfortably profitable at ~1 message a day, break-even at 2, and loses money at 3 unless
   conversion reaches 5%.** Nothing in the app enforces the assumption the headline table rests on.
   ➡️ **THE SINGLE MOST VALUABLE THING TO MEASURE BEFORE LAUNCH is real messages per active user per day.**
   It moves the answer more than price, more than the Apple cut, and far more than any routing work.
4. **Item H (routing) is worth about 1-2 cents per free user per month** against these numbers. Real, but it
   was never the thing that decides whether the app makes money. Do not let it be sold as such again.

---

# THE COST LEVER REGISTER

Every idea for cutting AI cost, with a MEASURED number or a reason it was rejected. Add to it rather than
re-proposing. ⚠️ Nothing here may be built by degrading Otto or Halo for free users -- that trades money for
churn, which is a cost this model does not capture. Justin's call, 2026-08-04.

## ✅ MEASURED, READY TO BUILD
| Lever | Measured effect | Status |
|---|---|---|
| **Otto: shorter replies** | Output 193 -> 105 tokens (**46% less**), 8.1 -> 3.0 sentences, ~19% off per message. Dashes in replies also fell 5/8 -> 1/8 | ✅ **BUILT + DEPLOYED 2026-08-04** (`REPLY_SHAPE_BLOCK`). ⚠️ He was ALREADY told all of this in the system prompt and ignored it -- same failure as the pitch, the cap and the decline tag. It only works from the user's message |
| ~~**Otto: knowledge routing** (item H)~~ | 🔴 **"~28% off per message" WAS NEVER REAL -- SEE SECTION 3 AT THE TOP.** Measured on 566 realistic messages: it **falls back 73% of the time and sends the whole manual**, and it shatters one shared cache into **57 entries**, which makes it MORE expensive than doing nothing at normal volume | ⏸️ **PARKED.** Scale optimisation only; revisit above ~10,000 msgs/day, and only after the fallback rate is fixed |

## 🔬 NEEDS MEASURING
| Lever | Why it might be worth it |
|---|---|
| **Halo: shorter replies** | Same chat, same fix, never tested. No reason it behaves differently to Otto's 48% |
| **Halo: its REAL per-message cost** | ⚠️ This model costs Halo at $0.0025, which is INPUT ONLY -- the figure in SPEC_monetization excludes its reply. If Halo answers at Otto's length its true cost is nearer $0.0036 and **every table here undercounts Halo** |
| ~~**Halo: cache splitting**~~ | ✅ **ANSWERED 2026-08-04 EVENING. There is no cache to split -- it has NEVER cached** (2,465 tokens, under Haiku's 4,096 minimum). **And the fix is to make the prompt BIGGER, not smaller** -- padding past 4,096 makes it cacheable and takes it from $0.0032 to ~$0.0007. See section 2 at the top |
| ~~**Smart Coach rulebook** (item O)~~ | ✅ **MEASURED 2026-08-05. The rulebook is 3,109 tokens, NOT 11,600** -- the old figure was the size of the whole `coachAI.ts` file, not the constant inside it. Full system prompt is 3,520, which sits UNDER Haiku's 4,096 cache minimum, so it has never cached. **The fix is to GROW it past 4,096, not shrink it.** Decisions in `PLAN.md` section 1 |
| **Conversation history** | Every message re-sends the previous turns, so a long chat pays for itself again each time. A limit exists (`MAX_HISTORY_TURNS`) but nobody has measured what it costs or whether it is tuned right. Invisible to users |
| **Which prompt rules Otto ignores** | He breaks at least two (dashes, and the length rule) -- found by reading replies, not by testing. The rest of that block is assumption. Quality AND cost |

## 🟡 OPEN DECISIONS
| Lever | What it does |
|---|---|
| ✅ **DECIDED 2026-08-04 EVENING: Otto free cap 10 -> 5.** A monthly 100-message pool was proposed as an alternative and Justin killed it, correctly: a DAILY cap creates a recurring wall (thirty pitch moments a month, and they come back tomorrow) where a monthly pool creates one wall and three dead weeks. See section 6 at the top. Original note follows |
| **Otto free cap 10 -> 5** (Justin's proposal) | Does NOT change the average case, because at 3/day almost nobody hits 10. It cuts the WORST case ~30%, $1.65 -> $1.15/user/month. Justin's reasoning: the counter shows from the first message at a cap of 5, so people stop wasting messages on "hi", and the free week gives them unlimited to get the feelers out of the way. ⚠️ Counter stays visible -- Justin's call, overruling the "fuel gauge" note in the code |

## ✅ FREE WINS ALREADY IDENTIFIED (in SPEC_otto_routing.md, never built)
| Lever | Effect |
|---|---|
| **Never send the Faith chapter to "Not Right Now" users** | 562 tokens they can never need. Zero risk |
| **Move the faith-tier line out of Otto's cached half** | It is already sent in the volatile block, so the cached copy is duplicated. Today it splits one shared cache into three |

## ❌ REJECTED
| Lever | Why |
|---|---|
| **Cutting free caps to fix the AVERAGE cost** | Trades money for churn. A worse free product means fewer people stay long enough to ever pay. (Distinct from the 5-cap proposal above, which targets the worst case only) |
| ~~**1-hour cache TTL**~~ | 🔴 **THIS ROW IS WRONG AND WAS REVERSED 2026-08-04 EVENING -- SEE SECTION 1 AT THE TOP OF THIS FILE.** The claim "at current traffic it costs MORE" is exactly backwards: at low traffic the 5-minute cache expires between messages so you pay the WRITE price nearly every call. Measured **7x cheaper at 100 msgs/day**, identical at high volume. It is now the #1 build item |

## 💰 NOT AI, AND BIGGER THAN MOST OF THE ABOVE
**Apple Small Business Program, 30% -> 15%.** Worth ~$1.50 per subscriber per month. Enrolment is a
pre-launch to-do and is already on the launch checklist.

## RE-RUN IT
🔴 **`scratchpad/cost-model.js` NO LONGER EXISTS.** Scratchpad scripts live in a per-session temp folder and
are deleted between sessions, so this pointer has been stale for a while and anything claiming to have
"re-run" it was not. **Use section 10b at the top instead** -- every constant and both formulas are recorded
there, which is the durable version. Rebuild the script from those if you need the tables again.
⚠️ **The Anthropic key for measurement scripts is NOT in the environment.** Get it with
`firebase functions:secrets:access ANTHROPIC_API_KEY` piped into an env var in the SAME shell command
(shell state does not persist between tool calls). Never print it.
