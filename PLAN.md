# THE PLAN

**The single ranked queue. If you want to know what we are doing, read this file and nothing else.**

Created 2026-08-05 after two sessions were derailed by the same failure: the same fact written in four
places, three of them stale, and decisions made off the stale copy.

---

## THE THREE RULES THAT MAKE THIS WORK

1. **Every fact lives in exactly ONE file.** If a number appears in two places, one of them is already
   wrong. Everywhere else gets a pointer, never a copy.
2. **Every number carries its provenance.** `MEASURED` (with how and when) / `DERIVED` (arithmetic on
   measured inputs) / `ASSUMED`. An unearned number must LOOK unearned.
3. **This file holds status and ranking only.** Detail and derivations live in the spec named beside each
   item. Check things off HERE; do not restate them there.

---

## WHERE WE STAND (headline only -- derivation in `SPEC_cost_model.md`)

| | Value | Provenance |
|---|---|---|
| 🔴 **Break-even conversion** | **RUN `node scripts/cost-model.js`** | It prints every table with its assumptions |

📉 **2026-08-09 MILESTONE, recorded because PLAN says log the figure at real milestones only.** The Otto
coach gate shipped and a free user's coaching question no longer reaches the AI at all.
**Free active user $1.86 -> $0.93/yr. Break-even 2.02% -> 1.03% at 12-month Supporters, 1.63% at 6-month.**
⚠️ **STILL RUN THE SCRIPT.** Those three figures are a snapshot of one milestone, not a source. The model
gained a `gateOttoFree` dial the same day and the annual-price proration bug was fixed that morning, so
anything written down before 2026-08-09 is wrong in both directions.
⚠️ **Subscriber lifetime remains the biggest unmeasured assumption and did not move.** RevenueCat confirmed
2026-08-09 that nobody has ever paid, so nobody has ever churned (7.3).

🔴 **DO NOT WRITE A BREAK-EVEN NUMBER INTO THIS FILE AGAIN.** Replaced 2026-08-05 after an audit found
**eight** different figures across PLAN, the roadmap and `SPEC_cost_model.md` (1.3 / 1.6 / 1.9 / 2.63 / 2.8 /
2.93 / 3.73 / 3.92 / 5.14%), with this table telling everyone to "quote this one".
**All of them were wrong in the same three ways:** they assumed Apple takes **30%** (it is 15% under the
Small Business Program), they silently assumed Supporters stay **12 months** (the single biggest variable in
the model), and they carried **no usage level** -- yet break-even ranges from **2.5% to 8.5%** on usage alone.
➡️ A break-even with no usage and no retention attached is not a fact. **The script is the number.**
⚠️ **And do not log one per change either** (Justin's call): mid-way through the cost work the figure moves
every time we ship, so a dated history would be a graveyard. Record it at real milestones only.
| Affordable usage at 3% conversion | ~2 companion messages/active user/day | DERIVED |

🔴 **The cost tables do NOT yet include Smart Coach or the meal estimator.** They counted Otto and Halo
only. Smart Coach alone is larger than both. **Every projection above is optimistic until item 0 gives us
real readings.**

---

## 🔬 BUILT BUT NOT VERIFIED ON DEVICE

⚠️ **"Built" is not "done".** Anything here is shipped code whose effect nobody has actually seen. Clear it
before starting new work, not after. Added 2026-08-05 after a review turned up a check that was flagged and
then quietly skipped.

| What | The check | Risk if wrong |
|---|---|---|
| ✅ ~~**2.2 faith-tier rules moved position**~~ | **CLEARED 2026-08-05.** Superseded by 4b, which enforces faith behaviour from the user turn and was device-verified on all three tiers. | Residual: only the 19% of faith messages the detector misses, which fall back to the tails. |
| 🟡 Smart Coach prompt content | The tips were checked after the FIRST padding pass, before the second. Four rulebook sections have never had their output read. | Worse tips, silently |
| ✅ ~~**Halo prompt content**~~ | **CLEARED 2026-08-06, and one real message did settle it -- badly.** Two substantive replies came back with NO faith content at all and one ran to three paragraphs, against two rules LOCKED in `SPEC_faith_ai.md` line 245. Fixed by moving both rules onto the user turn (see 2.5), measured A/B over three drafts and 31 cases, deployed and device-verified. | Was: worse voice, silently. Now closed. |
| 🟡 **1.2** skip-the-AI on no-data | Not reachable from an account with full data. | Low -- it is an `if` on a value the engine already computed |
| 🟡 **1.7** EvR voicing scoped to visible cards | ⚠️ **May not be exercisable by Justin at all** -- with the dev Pro toggle on he sees every card and the narrowed path never runs. Check which account first. | Medium. The upgrade path (blank cards) is the failure mode to watch |

## THE QUEUE

Ranked. Do them top down. `[ ]` not started, `[~]` in progress, `[x]` done and verified on device.

### 0. THE COST METER -- ✅ BUILT, DEPLOYED AND VERIFIED 2026-08-05
- [x] **0.1** `functions/src/aiUsageMeter.ts` records Anthropic's own token counts on every AI call to a
      Firestore `ai_cost/{uid}_{date}` document, split by feature. Wired into `aiProxy.ts` (coach +
      estimator), `appCompanion.ts` (Otto) and `faithCompanion.ts` (Halo). Fire-and-forget, never throws,
      writes to its own collection so it can never touch a cap counter or the pitch budget.
      **Device-verified by Justin the same day.**

#### 🔢 MEASURED PER-CALL COSTS -- these are READINGS, not arithmetic (2026-08-05)
| Feature | Measured | What I had estimated |
|---|---:|---:|
| Smart Coach | **$0.00387** | $0.0043 |
| Halo | **$0.00406** | $0.0032 |
| Otto, cold | **$0.0331** | $0.0345 |
| Otto, warm | **~$0.0043** | $0.0041 |
| Otto, **a real 10-message conversation** | **$0.0072/message** | ⚠️ **QUOTE THIS ONE.** The warm price assumes the cold write never happens; it happens once per conversation. A 2-message chat is ~$0.021/message. See `SPEC_cost_model.md` |
| Meal estimator (photo) | **$0.00953** | $0.0165 |

✅ **The cost model validated itself.** Otto's two test calls came to $0.03904195; the model predicts
$0.0390 on those token counts. Otto's cached block metered at **26,477 tokens** against the 26,474 measured
earlier -- a 3-token difference.
✅ **Confirmed from real data:** Otto's cache works (`cacheRead 26,477`). **Smart Coach and Halo have never
cached** -- both returned `cacheRead 0, cacheWrite 0`.

#### 🔴 THREE NUMBERS THE METER CAUGHT ON DAY ONE
1. **Halo's prompt is 3,987 tokens, not the 2,465 recorded in two places (62% low).**
   ➡️ **This makes 2.3 EASIER, not harder: it is only ~150 tokens short of the 4,096 minimum, not 1,600.**
2. **The meal estimator's prompt is 562 tokens, not the "~2,250" in THE PLAN item O.**
3. **Cache minimums differ by model and nobody had checked: Haiku 4.5 needs 4,096, Sonnet 4.6 needs 1,024.**
   Every "under the minimum" conclusion has to name its model.

⚠️ **STILL TO CONFIRM:** Smart Coach logged only ONE call, not the two predicted. Almost certainly because
the app was opened before the meter deployed, so that day's tips were already generated and the dedup
returned early. **The first Home-tab open on a fresh day is the clean test.**

- [x] **0.2 ✅ BUILT + DEPLOYED 2026-08-09. `functions/src/aiCostRollup.ts`, the project's FIRST scheduled
      function.** Nightly at 03:00 UTC it rolls `ai_cost` dailies older than **90 days** into one document
      per user per month (`ai_cost_monthly/{uid}_{YYYY-MM}`) and deletes them. Rolled up, not just deleted:
      the long-run trend is the whole point of having a meter, so only day-level granularity is lost.
      🔴 **A TRANSACTION PER DOCUMENT, NOT A BATCH, AND THAT IS THE WHOLE SAFETY ARGUMENT.** The increment
      and the delete are ATOMIC. There is no window where a daily has been added to the month but still
      exists (a re-run would double-count it) and none where it has been deleted without being counted.
      ⚠️ **A batched write CANNOT give that**: the increments would land, the deletes could fail, and the
      next night would count the same days again, **inflating the only cost record the project has,
      invisibly**. Throughput is irrelevant for a nightly job against old data; correctness is not.
      ✅ **IT REFUSES TO DELETE ANYTHING IT CANNOT FILE.** A document with no uid or a malformed date is
      left exactly where it is and logged every night until somebody looks. Losing a row is worse than
      keeping an untidy one.
      ✅ **DEPLOYED INERT, ON PURPOSE.** The meter only started 2026-08-05, so nothing is within 90 days of
      the cutoff and the first runs find zero documents. It begins working only once there is genuinely old
      data, which is the safest way to introduce anything that deletes.
      🔬 **THE SUMMING WAS PROVEN OFFLINE BEFORE DEPLOY, 9/9 checks** on realistic meter documents: totals
      and per-feature counters add, nested `surfaces` maps merge, **the `model` string survives instead of
      becoming NaN**, per-feature models stay distinct (Haiku vs Sonnet), `days` counts, and per-day
      bookkeeping (`uid`, `date`, `updatedAt`) does not leak into the monthly document.
      ⚠️ Bounded at 300 documents per run, so a first pass after a long gap takes several nights rather than
      one transaction storm. Nothing expires in the meantime.
      ⚠️ Touches `ai_cost` only, never `ai_usage*` (the caps and pitch budget). Blast radius of a bug here
      is a wrong number in a report, never a lost cap or a granted entitlement.
      (Original note follows.)
      ⤷ (superseded, kept for the reasoning) **0.2 THE METER HAS NO RETENTION RULE -- a gap WE created 2026-08-05.** It writes one Firestore
      document per user per day, forever. At 10,000 users that is **3.65 million documents a year** with
      nothing ever deleting them.
      ⚠️ Not a cost problem (Firestore storage is cheap) -- a **tidiness problem that gets harder to fix the
      longer it runs**, and it will quietly become the largest collection in the project.
      ➡️ Options: a scheduled function deleting `ai_cost` docs older than ~90 days, or rolling them up into
      one document per user per month and dropping the dailies. **Rolling up is better** -- it keeps the
      long-run trend, which is the whole point of having a meter.
      ⚠️ **Do it BEFORE launch.** Retrofitting cleanup onto a live collection is worse than shipping with one.

### 1. SMART COACH -- the biggest AI cost in the app (~$0.37/user/mo, DERIVED)
Detail: `SMART_COACH_SPEC.md`. Cost derivation: `SPEC_cost_model.md`.
- [x] **1.1 ✅ BUILT + DEVICE-VERIFIED 2026-08-05.** Smart Coach's prompt now crosses Haiku's 4,096-token
      minimum and caches for the first time. Verified on device: `cacheWriteTokens 4,454`, then a read, with
      a warm call metering **$0.00107 against the old $0.00387 (72% off)**.
      ❌ **THE ORIGINAL PLAN HERE WAS REJECTED.** It was to send all three voice-example sets, which crosses
      the line using content already written and collapses three cache entries into one. But the rulebook
      tells the model to "read the examples for your mode", so putting all three in front of it risks the
      **voices blending** -- and the coaching modes are the point. Justin's call: option B.
      ✅ **BUILT INSTEAD: pad the RULEBOOK**, which lifts all three modes at once. What went in was real
      quality work, not filler -- the rulebook had **no surface guidance at all**, so sleep and recovery tips
      were being written off examples entirely about weight and food logging. Added sleep/recovery guidance,
      day/weekly/monthly guidance, a not-repeating-yesterday rule (the packet carries `previousTip` and
      nothing told the model to read it), conflicting-signal guidance, and four examples per mode.
      ⚠️ **TOOK THREE PASSES BECAUSE THE CHARACTER-TO-TOKEN ESTIMATE WAS 23% OUT** (3.87 assumed, 4.75 real).
      The first attempt looked like it cleared the line and did not; the meter caught it. Final counts, taken
      with Anthropic's own counter rather than arithmetic: discipline 4,331, balanced 4,461, mindful 4,451.
      ⚠️ Required `aiProxy.ts` to attach the cache marker itself, since the client sends the system prompt as
      a plain string. Done, and the estimator gets the same plumbing for free.
- [x] **1.2 ✅ BUILT 2026-08-05.** Skip the AI entirely on "not enough data" verdicts. `NO_DATA_RULE_IDS` in
      `coachAI.ts`, checked in `generateCoachTip` before the prompt is even assembled.
      **Swept the engine rather than trusting the two I had found: FOUR rule IDs across SIX places.**
      `log_consistency_low` (home, EvR, weekly), `log_consistency_low_monthly`, `sleep_data_low`,
      and `rec_no_data` -- **which also closes 1.6: recovery had the same waste.**
      ⚠️ Deliberately EXCLUDED `weight_infrequent`. It reads like a data complaint but it is a genuine
      coaching verdict with a real action, and skipping the model there would flatten a legitimate tip.
      ⚠️ The skip path also guards against rewriting storage on every screen focus -- the existing daily
      dedup tests `aiBody`, which is deliberately null here, so it cannot catch this case.
      ➡️ **Not directly testable on an account with full data.** It is an `if` on a value the engine already
      computed, and the meter will show it at launch.
- [x] **1.6 ✅ ANSWERED** by the sweep above: recovery has `rec_no_data`, the same waste as sleep. Covered.
- [x] **1.3 ✅ BUILT 2026-08-05.** Home now checks the user's layout before generating. `smart_tip` gates
      the home coach tip, `sleep` gates the sleep tip; both were firing on every Home focus regardless.
      (Justin found this.)
      ⚠️ **Reads `pj_settings` from storage, NOT the `cardVisible` state.** The focus effect has `[]` deps
      and runs on the first focus, which can land before the async settings load populates that state --
      trusting it would fall back to defaults and gate nothing, which looks fixed and is not.
      ⚠️ **Fails open** (`!== false`): a wasted call costs a fraction of a cent, a missing tip is a broken
      feature. The Sleep screen's own refreshes are deliberately NOT gated -- being on that screen IS the
      visibility check.
- [x] **1.7 ✅ BUILT 2026-08-05.** EvR now voices only the cards the user can actually read.
      ✅ **VERIFIED NOTHING VISIBLE CHANGES for a free user.** Everything crisp on a locked card is
      deterministic: the topic chip is `lockedTopic(c.id)`, a hardcoded lookup by card ID; the tone accent
      comes from `c.positive`/`c.tone`; the lock icon and "Become a Supporter" are static. The only
      AI-written fields (`claim`, `lever`) render UNDER a full-card `BlurView` at intensity 26. `insight` is
      never passed to `LockedInsightCard` at all. Confirmed this is the only render path for report cards.
      ⚠️ **`isPro` ADDED TO THE EFFECT DEPS** (`[id, isTutorialMode, isPro]`). It was missing, and with
      voicing now scoped to membership that was the same race as 1.3: a Supporter whose membership had not
      resolved when the screen opened would get card 0 voiced and no second pass. Re-running is idempotent.
      ⚠️ Pre-existing type errors at lines 184-278 of that file are untouched and unrelated.
      (Original finding follows.)
      `voiceDiagnosticCards(baseCards, mode)` in `diagnostic-report-view.tsx` is handed EVERY card with no
      membership check. But at line ~942, `!isTutorialMode && !isPro && i > 0` means **a free user sees
      exactly ONE card**; the rest render frosted with only a topic chip. So we pay the AI to write insight
      text for ~7 cards that are never readable.
      | | per report view |
      |---|---:|
      | voicing all ~8 cards | ~$0.0068 |
      | voicing the 1 that is visible | ~$0.0015 |
      | **waste** | **~78%** |
      ⚠️ **TRAP IN THE OBVIOUS FIX.** The report persists voiced cards and decides "already voiced" by
      testing whether ANY card carries an `insight`. Voice only card 0 and the report is flagged done
      forever, so **a user who later upgrades unlocks seven permanently blank cards.**
      ➡️ Fix: judge "already voiced" against the cards the user can actually SEE. On upgrade the
      newly-visible cards have no insight, the check fails, and they voice on next open. Self-healing.
- ❌ **1.4 DROPPED 2026-08-05 after investigating. It does not work.** The idea was to skip the AI when the
      underlying data had not changed. Two things killed it:
      (a) `windowFp` looked perfect -- a "cheap signature of the data" that already exists -- but it is built
      as `count:newestDay:totalLength`, and **the newest day changes daily** as the window slides, so it
      always reports "changed".
      (b) The correct comparison is the VERDICT (ruleId + diagnosis + action + facts), but the diagnosis
      embeds the numbers themselves ("protein averaged 74g"), which shift daily for anyone actively logging.
      **So it overlaps entirely with 1.2 where it would fire, and almost never fires where it does not.**
      The only variant that fires often is one ignoring the numbers, which puts yesterday's figures in
      today's tip. Worse than useless.
- ⏸️ **1.5 PARKED WITH A TRIGGER** (combine Home's two calls into one). See the PARKED table below --
      **$390/yr at 2,500 actives, revisit above ~10,000.** Not deleted.
- 🆕 **1.8 SIX COST IDEAS RAISED 2026-08-06. NONE DECIDED, NONE BUILT. Detail and Justin's framing on each:
      `SMART_COACH_SPEC.md`, "COST IDEAS" at the top.** Logged before any were worked so nothing depends on
      remembering. Take them ONE AT A TIME (Justin's instruction) and delete each from that section as it is
      built or rejected.
      🔴 **THE MAP CAME FIRST AND IT CHANGES THE SIZING: `scripts/cost-model.js` counts 2 of 8 surfaces.**
      Home's coach and sleep tips are in; recovery, Day Summary, the EvR tip, the EvR card feed, weekly and
      monthly are all uncounted. **So Smart Coach's "22% of the bill" is a floor, not a figure.**
      | # | idea | state |
      |---|---|---|
      | 1 | **The Day Summary tip is paid for and never seen** | ✅ **FIXED + DEVICE-VERIFIED 2026-08-07 -- see 4.12.** Not by cutting the call but by DELIVERING it: loading state, voiced version on the visit that paid for it, plain version demoted to the failure path. |
      | 2 | Sleep + Recovery in one call | ❌ **CLOSED 2026-08-07, KILLED BY 1.9.** ~$1,500/yr at 25k before gating, **~$45/yr after.** ➡️ Its one surviving PRODUCT question moved out: should the truncated Home card insights become a "tap for the full read" line? That belongs with the Home card work, not a cost list. |
      | 3 | Partial voicing (deterministic `claim`, voiced `insight`), and a lighter Home card that taps through to EvR | ❌ **CLOSED 2026-08-07, KILLED BY 1.9.** ~$180/yr before, **~$5/yr after.** ✅ **And Justin's extension gets DELIVERED FREE:** under gating the free Home card IS the lighter version and EvR is the full read. |
      | 4 | Batch API for weekly + monthly | ❌ **CLOSED 2026-08-07, KILLED BY 1.9.** ~$100/yr before, **~$4/yr after.** Justin's objection (which surface tolerates a delay AT ALL?) went three sessions unanswered and never needed answering. |
      | 5 | 🔴 **AI voicing becomes a Supporter feature** | ✅ **DECIDED 2026-08-07 -- see 1.9.** Costed first as Justin required, then discussed against real before/after text pulled from the actual files. |
      | 6 | ~~Cap Day Summary to recent days~~ | ❌ dropped same day: the tip is already frozen per date |
      | 7 | ~~The dedup is "once per day per SCENARIO"~~ **✅ DEVICE-TESTED 2026-08-06 AND LARGELY A FALSE ALARM.** Logging 1,120 calories did not flip the verdict; a cold reload did not regenerate. **Ordinary use buys no extra calls.** The 9-calls-in-a-day figure was a UTC document spanning TWO local mornings plus the 7pm bug now fixed. | ⏸️ Real frequency still worth reading at launch, but **not a cost emergency. Do not re-raise without new evidence.** |
      | 8 | ✅ **FIXED 2026-08-06: the coach thought a new day began at 7pm Central.** `generateCoachTip` deduped on the UTC date while the engine and the whole app use LOCAL, so the tip regenerated on identical data for the same local day. Morning-and-evening users paid twice for both Home tips. | ✅ done, one shared `todayDateKey()` |
      🔬 **METERING SHIPPED 2026-08-06 so the six uncounted surfaces stop being guesses:** every Smart Coach
      call now reports which screen it came from, landing in `ai_cost` -> `byFeature.coach.surfaces`.
      ⚠️ **Deliberately a SEPARATE field from `feature`**, which drives the abuse-cap collection, `DAILY_CAPS`
      and `CACHE_TTL` in `aiProxy.ts` -- renaming that per surface would have split the cap eight ways and
      silently dropped Smart Coach back to a 5-minute cache.
      ⚠️ **The label is derived from the CACHE KEY**, not threaded through the seven wrappers: the key already
      encodes the surface uniquely and is the same value that decides whether a call happens at all, so it
      cannot drift. Two callers bypass that path and are labelled by hand (the batched EvR card feed, and the
      Day Summary tip that runs in the background).
      ✅ **TWO THINGS JUSTIN CALLED CORRECTLY AGAINST MY READING:** the Day Summary tip DOES freeze (keyed to
      the date viewed, not to today, so browsing history is free), and the sleep tip fires from HOME, not only
      from the hub. Both corrected above.
- [x] **1.9 AI VOICING IS A SUPPORTER FEATURE. ✅ BUILT, DEVICE-VERIFIED, DEPLOYED AND SHIPPED 2026-08-07,
      ALL THREE STEPS.** The gate, the signposts, and the copy sweep.
      📉 **`scripts/cost-model.js` now runs with `gateCoachFree=1` as its default, because that is the app's
      real behaviour. Break-even fell 2.97% -> 2.02%.**
      ✅ **STEP 2, THE SIGNPOSTS.** Home Smart Tip page 1, weekly and monthly now show free users "Read
      against your numbers with the Supporter plan" in place of the "View in Effort vs Results" footer. The
      tap still goes to the report, deliberately: a free user landing there meets seven frosted cards and a
      Become a Supporter button, which sells better than a pricing screen.
      ⚠️ **PAGE 1 ONLY on Home, and it is load-bearing.** Pages 2 and 3 are deterministic engine tips that a
      Supporter sees IDENTICALLY, so signposting them would advertise an upgrade that does not exist there.
      ✅ Shown in Mindful too (Justin: "we sell to them too. it isnt too aggressive").
      ✅ **STEP 3, THE COPY SWEEP.** Otto's KB, the canned answer, the day 8 step-down, the Supporter page
      perk list, onboarding and two tutorial variants. **Framing locked: coaching is FREE, how it is WRITTEN
      is the Supporter part.** Lead with yes, never "coaching is a Supporter feature".
      🔴 **THE SWEEP FOUND A FIFTH PLACE STATING OTTO'S FREE CAP, AND IT WAS WRONG.** Onboarding promised
      "30 messages a day, up from 10" when his free cap has been 5 since 2026-08-05. PLAN 3.1 found four
      places and called it "never a one-line change"; it was five, and the missed one sat in the exact screen
      whose numbers are supposed to be quoted back on day 8 so the ending reads as a promise kept.
      🔴 **AND THE REAL BUG WAS NOT IN THE KB AT ALL. THREE DEPLOYS WERE SPENT EDITING SOMETHING OTTO NEVER
      SAW.** "Is the sleep tip free" routed to the COACH side, which by design does not receive the app
      manual, so the system prompt's no-guess rule fired on an empty map and he deflected to Settings > Help.
      Bare "free" was not an entitlement pattern (only "free plan", "free version"). Fixed in
      `ottoCoachRouting.ts`, verified against all four routing corpora, zero dangerous misroutes.
      ➡️ **THE RULE THAT CAME OUT OF IT, now in the code: if a KB edit does not change an answer, check the
      ROUTER before editing the KB again.** Same family as [[feedback_verify_the_call_site]].
      ⏳ **NOT VISUALLY CONFIRMED BY JUSTIN (small, none behavioural):** the re-tested sleep tip answer after
      the router fix, the two tutorial variants, and the reworded safety diagnosis on a May summary.
      ✅ **STEP 1 OF 3 DONE: the gate.** `isSupporter` is a required FIRST argument on every export of
      `coachAI.ts`, so the compiler enumerated all 11 call sites across 8 files. It found the one nobody had
      listed by hand (`diagnostic-report.tsx` fires the HOME tip when a report is generated).
      🔬 **DEVICE-VERIFIED ON THE FREE ACCOUNT, and the meter is the proof.** Baseline `calls: 11`
      (day 4, home 4, sleep 3). Justin then cleared the coach cache, cold-started, and opened Home (all 3
      pages), the sleep hub (both coaches), weekly, monthly, two unseen day summaries and a freshly generated
      EvR report. **`calls` still 11. Every surface counter unchanged. No `weekly`, `monthly` or `evr_cards`
      key ever appeared. `usd` did not move.** And every surface rendered real coaching text: nothing blank,
      nothing stuck loading.
      ⚠️ **THE "DID IT ACTUALLY RUN" TRAP WAS DESIGNED OUT OF THE TEST:** a counter that does not move looks
      identical whether the gate held or no rule fired. Justin confirmed real text on every surface, so the
      engine produced verdicts and the gate is what stopped the calls.
      ✅ **MONTHLY IS GATED LIKE EVERY OTHER SURFACE.** It was held back for about an hour on 2026-08-07
      while a copy bug was fixed, and this entry said "deliberately left ungated" in the meantime.
      ⚠️ **The bug was worth holding for:** `computeCoachPacketMonthly` passes a 30-day window into the
      SEVEN-day slot, so its deterministic copy could read "22 of your last 7 logged nights", and gating
      would have made that impossible sentence the default free experience. Fixed with `{period}`,
      `{window}` and `{span}` tokens across 181 phrases. Detail: `project_j_roadmap.md`.
      ➡️ Justin refused to ship the smaller residual ("cant ship it broken") after it was judged shippable,
      and he was right: it was three sentences and one context field.
      🔴 **THE "FAIL OPEN" SPEC IN THIS ITEM WAS WRONG AND WAS CAUGHT BEFORE BUILDING.** `loading` is briefly
      true on EVERY cold start, so "voice it while membership resolves" would have voiced a tip for every
      free user on every launch and deleted most of the saving. **Every call site now WAITS** (`if
      (membershipLoading) return;` with `[membershipLoading, isSupporter]` in the deps), matching how
      `MembershipContext` already gates `enforceIconEntitlement`.
      ⚠️ `diagnostic-report.tsx` skips the coach snapshot entirely while membership is unresolved, because
      that insight is frozen INTO the report forever and would not self-correct on a later open.
      (Original decision follows.)
      ✅ **DECIDED 2026-08-07 (Justin: "A for free users seems like the obvious answer").**
      Free users read the deterministic copy from `utils/smartTipsCopy.ts` on every coach surface; Supporters
      get the AI-voiced version. **`scripts/cost-model.js gateCoachFree=1` is the number** -- do not copy
      figures out of here, run it.
      | at 25k installs, 3% conv, canned 30% | net/yr | break-even |
      |---|---:|---:|
      | today | **+$240** | 2.97% |
      | gated | **+$6,717** | 2.02% |
      🔴 **THE SPEC'S PREMISE FOR THIS IDEA WAS WRONG AND THE CORRECTION IS THE WHOLE ARGUMENT.**
      `SMART_COACH_SPEC.md` described the free fallback as a stitched template
      (*"Something worth flagging. {diagnosis}. {action}."*) and said the CONTENT is identical while the VOICE
      differs. **Both halves are backwards.** That template fires on only two edge paths (a safety verdict and
      a no-data verdict). Every normal tip falls back to `selected.body` -- **hand-written copy, 45 rules and
      306 variants across 102 pools**, split by goal bucket, with a separate pool written for Mindful, rotated round-robin by
      `pickVariant` so the same verdict gives a different sentence three days running.
      ➡️ **So the voice is fine on both sides. What a free user loses is THEIR OWN NUMBERS.** The fallback
      knows which verdict fired and says a well-written generic thing; the AI cites the actual deficit, the
      actual sleep average, the actual days, and connects two signals.
      ✅ **That is a BETTER paywall, not a worse one:** "your coach reads your actual numbers" fits in a
      screenshot, and it is the first Supporter feature that is an upgrade in KIND rather than in quantity.
      🔴 **AND THERE IS NO CLEVER MIDDLE. The money and the pain are perfectly correlated.**
      | surface | $/free user/yr | fallback quality |
      |---|---:|---|
      | Home coach tip **= the EvR insight, ONE call** | $0.385 | generic |
      | Sleep tip (only fires with 3+ of 7 nights of data) | $0.385 | generic |
      | Recovery | $0.077 | **already fully numeric** ("Recovery is 62 today with HRV below your norm") |
      | Weekly / EvR card feed / day / monthly | $0.056 | mixed; day summary is **already fully numeric** |
      ➡️ The two surfaces worth **85%** of the saving are exactly the two whose fallback is generic. The
      surfaces that would cost the user nothing to give up are worth **$0.08 of $0.90**.
      ❌ **"KEEP HOME + EvR VOICED, GATE THE REST" WAS CONSIDERED AND REJECTED** (was worth ~$3,768/yr at 25k
      vs $6,569). It gives up 43% of the money to protect surfaces, and it makes the feature behave
      differently on different screens for a reason the user cannot perceive.
      ✅ **VERIFIED, AND IT MAKES THE BUILD SMALLER THAN IT LOOKS:**
      - **The Home Smart Tip card ALREADY HAS A NO-AI STATE.** It is a 3-page carousel: page 0 is the voiced
        insight, **pages 1-2 are already deterministic engine tips**. With no coach cache it fills all three
        pages deterministically, a path that already exists. The shop window is already two-thirds plain.
      - **The 7-day taste gives a real taste.** `grantFirstWeek` grants a genuine RevenueCat promotional
        entitlement, so a new user gets ~7 days of voiced coaching and then feels it go generic. The
        conversion moment is already built; `FirstWeekEndedModal.tsx` is where it should be named.
      ⚠️ **WATCH LIST FOR THE BUILD (each of these has already bitten this project once):**
      1. **The membership race** -- `isSupporter` must be in the effect deps, or a Supporter whose membership
         has not resolved gets the free path. Hit in both 1.3 and 1.7.
      2. **FAIL OPEN.** If membership cannot resolve, VOICE it. A free user getting one free voiced tip is a
         far better failure than a paying user reading the generic one. (Justin's call still open.)
      3. **Frozen past periods.** Weekly/monthly/day tips freeze per period, so someone upgrading in March
         keeps plain tips for January. Believed correct and honest, but it is a decision, not an accident.
      4. **Every place that states what the plan includes** -- Otto's KB, the canned answer for "what does the
         plan add", `SPEC_monetization.md`, the modals. Same sweep that caught four files on Otto's cap.
      ➡️ **NEXT STEP IS NOT THE BUILD.** It is auditing `utils/smartTipsCopy.ts` (Justin's call, 2026-08-07):
      under gating those pools ARE the free product. **Deepening a pool is free forever; improving the AI is
      a bill that arrives on every call.**
      🔬 **STRUCTURAL HALF DONE 2026-08-07** (`scratchpad/audit_copy.cjs`, read-only). **The copy is in good
      shape:** 45/45 rules have copy and fire, **306 variants across 102 pools** (an earlier "~129" here was
      a bad grep that missed the Mindful pools), no pool under 3 variants, no dead copy, no unfilled slot,
      zero double dashes.
      ✅ **ONE REAL GAP FOUND AND FIXED: `cross_workout_intake` had an EMPTY Mindful pool**, so a Mindful
      user with growth areas enabled fell through to *"rest days are quietly becoming eating days"* and *"the
      discipline from training days does not always carry over"*. Three Mindful variants written.
      ✅ **`weight_infrequent`'s empty Mindful pool is CORRECT, not a gap** -- the rule is suppressed twice
      for Mindful (returns null in `ruleWeightInfrequent`, and blocked again in `applyMindfulSuppression`),
      so the tip can never reach a Mindful user. Nothing to write. **Verified before "fixing" it.**
      🔴 **THE AUDIT SCRIPT WAS WRONG FOUR TIMES AND THE COPY WAS RIGHT EVERY TIME.** It reported all 45
      rules dead, then 11 rules printing raw `{delta}` to users, then three more, then the weigh-in gap. All
      artefacts: a regex needing a newline that single-line calls do not have, ES6 shorthand `{ delta }`
      having no colon, and the last rule's chunk swallowing the rest of the file. **Every flag was
      hand-checked before being reported.** See [[feedback_detectors_are_brittle]].
      🔬 **CONTENT PASS DONE 2026-08-07. THREE FIXES, ALL THE SAME MISTAKE: copy written for ONE goal sitting
      in a pool that EVERY goal reads.**
      1. 🔴 **`protein_under` was telling BULKING users "at a deficit, low protein means more of the weight
         you lose comes from muscle"** and "this is the one macro that cannot slide on a cut". The rule has
         no goal guard. ⚠️ **Not an edge case: `rankCandidates` makes protein_under a TOP priority rule for
         the gain bucket**, so it was one of the first tips a bulking user ever saw. Fixed with
         `pattern_gain` / `urgent_gain` pools, selected by explicit ternary in `ruleProteinUnder`.
         🔴 **THE TERNARY IS DELIBERATE, NOT A TEMPLATE STRING.** `pickBody` falls back
         `db[poolKey] ?? db['insight_all'] ?? db['pattern']`, so a miss on `urgent_lose` would silently serve
         the PATTERN pool to an URGENT tip. Only the gain bucket names a pool, so only it can miss.
      2. 🟡 `active_low` said "On a cut, every bit of that gap matters" to every goal. Reworded.
      3. 🟡 `fat_high` said fat is "where a surplus quietly comes from", which reads as a warning to someone
         deliberately building one. Reworded.
      🟡 **KNOWN RESIDUAL, ACCEPTED, NOT FIXED:** protein_under's lose/maintain copy still says "at a
      deficit", which is right for lose and slightly off for MAINTAIN. Lower priority for that bucket and it
      would need a third pool. Recorded in the guard's allowlist so it is visible rather than forgotten.
      ✅ **VERIFIED CORRECT, so these are oversights and not a pattern:** `weekend_spike` and
      `cross_high_burn_overeating` both `return null` for the gain bucket before firing. Someone wrote those
      carefully; protein and activity just never got the same treatment.
      ✅ **ALSO CHECKED AND CLEAN:** every "last 5 days" / "last 7 logged days" claim matches the window its
      rule actually uses; every hardcoded number matches the code (deep sleep 15%, workout completion 60%,
      fasting window 30 minutes); **no copy anywhere describes how the app works**, so nothing in here goes
      stale when a screen changes; the recovery section (newest copy) is clean.
      🔒 **AND IT IS NOW MECHANISED: `scripts/audit-tips-copy.cjs`, committed, exits non-zero on a problem.**
      Catches dead copy, missing copy, unfilled placeholders, goal mismatch, double dashes and thin pools.
      ⚠️ **It carries an ALLOWLIST WITH A STATED REASON PER ENTRY** (rules that bail out for a bucket may
      safely speak to the rest). Adding to it without verifying the bail-out in the engine defeats the guard.
      ⚠️ **It fails LOUDLY with exit 2 if its own parser matches nothing**, because a broken parser otherwise
      reports a clean bill of health. That is not hypothetical: this script reported false problems FOUR
      times during the audit and the copy was right every time.
      ✍️ **DEPTH PASS STARTED 2026-08-07. 315 -> 351 variants (+36).** Two variants added to every pool on
      the six highest-frequency rules (calorie pace, small gap, protein, calorie consistency, activity,
      logging consistency), standard and Mindful both. Justin read batch 1 in full and approved the voice.
      🔴 **WRITTEN TO DELIBERATELY AVOID FOUR HOUSE TICS, and this was Justin's call after seeing the counts:
      "We noticed" x36, "Worth ..." x27, "most days this week" x16, "than most people realize" x8.**
      ➡️ Deeper rotation buys nothing if every variant opens the same way. **Verified: those four counts did
      not move while 36 sentences were added.** Rejected: rewriting the EXISTING copy to thin the tics out
      (bigger job, touches sentences that work). Kept as an option, not a plan.
      ✅ **FIXED 2026-08-07 (Justin caught it and called it himself).** `log_consistency_low.urgent` said
      *"The app cannot give you useful patterns without consistent input."* Every other variant in that rule
      speaks as "we" ("the patterns we can surface", "we work with whatever you give us"), so one line
      switched to third person and called the app a machine that cannot do things.
      ➡️ **The pronoun was not the real problem.** Its neighbours describe what IS possible; that one
      described what the app CANNOT do, which reads as the app blaming the user for its own limits. Both
      fixed at once: *"There is not enough here yet for us to surface anything useful."*
      🔴 **AND IT CORRECTS AN AUDIT CLAIM MADE EARLIER THE SAME DAY: "no copy anywhere describes how the app
      works" WAS WRONG.** The grep behind it was case-sensitive and missed "The app". One instance, found by
      reading rather than by the script.
      ⏳ **NOT DONE, AND WORTH KNOWING:** only ~a quarter of the variants were read closely for QUALITY.
      Every mechanical class is complete and clean; "is this sentence well written and still good advice" is
      not. ➡️ **The recommended next writing job is DEPTH, not correction:** every pool is exactly 3 variants,
      so a user hitting the same verdict cycles all three and repeats on day four. The rules that fire most
      (protein, calorie pace, logging consistency) are where a 4th/5th variant is worth most, and under 1.9
      that is free forever where AI quality bills on every call.
- ➡️ Expected: **~$0.37 -> ~$0.10/user/month, DERIVED**, nothing visible changing. Item 0 confirms it.

### 2. THE CACHE FIXES -- launch build
- [x] **2.1a ✅ SMART COACH ON 1-HOUR TTL. Deployed 2026-08-05.** Set in `aiProxy.ts` (`CACHE_TTL`).
      Coach tips spread across a morning, which is exactly the gap a 5-minute cache cannot bridge.
      **Measured on real usage: six coach calls cost $0.0263 at 5 minutes, ~$0.0145 at 1 hour** -- they wrote
      four separate copies instead of sharing one.
- [ ] **2.1b OTTO AND HALO STAY ON 5 MINUTES UNTIL LAUNCH.** ⚠️ **Not an oversight -- 1 hour is WORSE for
      them today.** Otto is bursty: two or three messages seconds apart, then hours of nothing. Those already
      share a 5-minute cache, so a longer TTL buys nothing and pays 2x to write instead of 1.25x.
      **Measured 2026-08-05: two back-to-back Otto messages cost $0.0357 at 5 minutes and $0.0556 at 1 hour,
      56% worse.** It flips the moment two conversations land within an hour, which real traffic guarantees.
      ➡️ **Switch at launch.** Make it a dial first (5.1) so it is a config change, not a deploy.
      ✅ **ON `LAUNCH_CHECKLIST.md` AS 3.4 SINCE 2026-08-09**, next to the Anthropic spend cap, so it cannot
      be lost in the launch rush. This item stays open here until the switch is actually made.
      ✅ **ANSWERED: the 1-hour TTL needs NO beta header.** `SPEC_otto_routing.md` carried that as an open
      question; verified against the current Anthropic caching docs 2026-08-05.
- [x] **2.2 ✅ BUILT + DEPLOYED 2026-08-05.** The faith-tier tail is out of `buildCompanionStable`, which
      now takes ONE argument (the app knowledge) and therefore **cannot** vary by user. The tail moved into
      `buildCompanionVolatile`, directly under the CONTEXT block that already carries the tier value.
      **MEASURED BEFORE:** the three cached blocks were 26,483 / 26,480 / 26,551 tokens -- **26,480 tokens
      of byte-identical content cached three separate times because ~71 tokens differed.** Each copy got a
      third of the traffic and went cold three times as often.
      **AFTER:** one shared 26,442-token block for everybody.
      ⚠️ The trade is lopsided and worth remembering: carrying the tail uncached costs **$0.00007 a
      message**; one avoided cold call saves **$0.0305**. Break-even is one extra cold call per 429 messages.
      ⚠️ The codebase had already made this exact call once for MEMBERSHIP tier (see the note on
      `FREE_TIER_BLOCK`). Faith tier was the inconsistency, not the rule.
      ⚠️ The rules now sit LATER in the prompt, which on this project has meant better instruction-following,
      not worse. **Worth a glance at faith behaviour anyway** -- especially that a "Not Right Now" user is
      never pointed at Halo.
- [x] **2.3 ✅ BUILT + DEPLOYED 2026-08-05.** Halo caches for the first time, and the tier no longer splits it.
      **Two problems fixed at once, because fixing one alone would have created the other.**
      1. At 3,987 tokens it was ~109 short of the minimum, so it had never cached. Three voice examples
         carry it to **~4,228**. Halo had **NO examples at all** -- the rules described the voice in detail
         and nothing ever demonstrated it. One example deliberately contains no verse, because the rules say
         sometimes the caring thing is to listen rather than quote and nothing showed that.
      2. The tier chunk sat in the MIDDLE of the prompt, so the moment it started caching it would have split
         the copy in two -- the same trap as 2.2. Moved to the end as its own uncached block (87/99 tokens).
      ✅ **THE TEXT HALO SEES IS UNCHANGED IN ORDER.** System blocks concatenate, and the tier was always the
      answer to the "WHO YOU ARE TALKING TO" header, so header and answer travelled together. A cache
      boundary moved, not a prompt.
      🔴 **A THIRD STALE DOC CLAIM CORRECTED:** item O and this file both warned the plans catalog "varies
      per request and splits the cache". **It does not.** The client builds it once at module load from
      static data files (`CompanionChat.tsx`, `buildFaithCatalog`) and it is byte-identical for everyone.
      ⚠️ **MARGIN IS 132 TOKENS (3%).** The catalog is client-supplied, so if reading plans were ever
      REMOVED the block could fall back under the minimum and silently stop caching. The meter catches it
      (`cacheWriteTokens` returning to 0). A fourth voice example would buy more room if wanted.
      ⚠️ Older clients that send no catalog sit at 2,712 tokens and will not cache. Expected, not a bug.
      ➡️ Expected: **$0.00406 -> ~$0.0012 warm.** (Original note follows.)
      Safety/theology/crisis blocks are off-limits to cut, so growing them is the allowed direction anyway.
      ⚠️ Halo's real per-call cost is **$0.00406 metered**, not the $0.0032 in the old docs.
      ⚠️ Once it DOES cache, the old note about the plans catalog varying inside the cached block becomes a
      live problem -- check it then (it is harmless today only because nothing caches).
- [x] **2.5 🆕 HALO'S TWO LOCKED VOICE RULES NOW RIDE ON THE USER TURN. ✅ BUILT + DEPLOYED + DEVICE-VERIFIED
      2026-08-06.** Not a cost item; it came out of the 2.3 verification check above and is kept separate so
      it does not hide inside the cost work. Full detail and every measurement: `functions/src/faithCompanion.ts`.
      Product side, and the open good-news question: `SPEC_faith_ai.md`.
      **WHAT WAS WRONG.** `SPEC_faith_ai.md` line 245 LOCKS two things: "concise and conversational (not
      sermon-length)" and "always points toward the Word and real community". Both were in the system prompt
      and both were being ignored. Justin's first real message got a warm, completely secular reply.
      🔴 **AND THE CAUSE WAS NOT RELUCTANCE.** The prompt ALSO carried two hold-back rules that appear nowhere
      in the spec ("sometimes the caring thing is to listen, not quote a verse"). Explicit behavioural
      instructions beat identity framing, so the hold-back side won. **A fourth confirmation that a rule Otto
      or Halo must ACT on cannot live in the system prompt** (see 4b, 4.9). Same mechanism as the pitch, the
      cap and the faith handoff.
      🔬 **MEASURED A/B, 31 cases, three drafts** (`functions/_halo_voice.cjs`, the first harness on this
      project to call the real model rather than test deterministic code).
      ⚠️ **DRAFT 1 FIXED LENGTH AND NOT FAITH, AND THE REASON WAS THE FINDING.** On an opening message she
      answered with a clarifying question and nothing else, and a question has nowhere to put faith. Draft 2
      added ANSWER-THEN-ASK (Justin's call); draft 3 added the technique her own voice example already uses:
      when they have said too little to be specific, the hook is the INVITATION, not a claim about God.
      ⚠️ **A CONTRACTION BUG WAS BLAMED ON THE RIDER AND THAT WAS WRONG.** "Tired goes deep, does not it"
      turned up in a NO-RIDER reply on the next run. Pre-existing, rare, unfixed, logged.
      🔴 **READ THE REPLIES, NOT THE TALLY.** The harness prints a keyword count and on identical inputs the
      baseline scored 15, then 16, then 18 across three runs. **At 31 samples against a nondeterministic
      model that counter cannot separate a real move from noise.** Every conclusion came from reading text.
      ✅ **DEVICE-VERIFIED 2026-08-06, all five checks:** grounds before asking, greeting stayed two lines,
      app how-to gave the path plus a jump button, crisis carve-out intact, contractions intact.
      🟡 **OPEN, LOGGED, NOT BUILT: good news.** "I had a really good day today" still returns no explicit
      faith. Justin wants it, tastefully, and says it can wait. Detail: `SPEC_faith_ai.md`.
      ⚠️ Costs ~$0.0003/message because the user turn is never cached. `SPEC_cost_model.md` carries the number.
- ⏸️ **2.4 PARKED WITH A TRIGGER** (skip the Faith chapter for "Not Right Now" users). Recorded elsewhere as
      a "free win"; it is not. Those 635 tokens sit INSIDE the cached block, so at the cached price they are
      worth about **six hundredths of a cent a message** -- and skipping them needs a SECOND variant of the
      block, which re-splits the cache 2.2 just unified. A small slice of users would keep their own copy
      warm, and when it went cold they would pay a full write: **33,000 effective tokens instead of 2,600.**
      **Same trap that killed the router: trading a rounding error for a fragmentation risk.**
      ➡️ **REVISIT** only once traffic is high enough that every variant stays warm regardless.

### 3. THE FREE CAP
- [x] **3.1 ✅ DONE + DEVICE-VERIFIED 2026-08-05. OTTO 5/DAY, HALO STAYS 10.** Otto's free cap is 10 ->
      **5**/day (`appCompanion.ts`); verified by asking Otto himself, who now states 5.
      ✅ **HALO DELIBERATELY NOT CUT** (Justin, 2026-08-05), reversing what this item originally said. She is
      **~3% of a free user's AI bill**, so cutting her buys nothing, and free users getting MORE of the faith
      companion than the fitness one is the app stating its own identity. **Do not "finish" 3.1 by cutting
      Halo later.**
      🟡 **RESIDUAL, NOT URGENT:** free 10 vs Supporter 30 still means faith is *somewhat* upcharged, which
      is not quite what CLAUDE.md says. The clean fix is equal caps, but the only safe direction is RAISING
      free (5.1's rule: never tighten a visible limit), and Halo is cheap enough that it is affordable.
      Decide it when the dials land, not before.
      ⚠️ **IT WAS NEVER A ONE-LINE CHANGE.** Four places state the number and would have contradicted it:
      Otto's knowledge base says it out loud (he would have told users 10), `FirstWeekEndedModal.tsx`
      promises it in copy, and `LAUNCH_CHECKLIST.md` records the locked design. ✅ The in-chat counter needed
      nothing -- it reads `cap` off the server response, which is why it survived.
      ✅ **DONE BEFORE LAUNCH ON PURPOSE.** This is the one dial users SEE, and 5.1's rule is that a visible
      limit may be raised but never tightened. There are no free users yet, so it cost nothing today.
      🔴 **HALO IS HELD FOR A DECISION, and it is a values question not a cost one.** Cutting the FAITH
      companion to 5 while Supporters keep 30 makes faith a paid feature in practice, against CLAUDE.md.
      ⚠️ The code already contradicted itself here: `faithCompanion.ts` carries a comment saying "a Supporter
      does not get more of Halo than a free user" directly above `FREE 10 / SUPPORTER 30`. Whatever is
      decided, that comment is wrong today.
      ⚠️ Halo is ~3% of a free user's AI bill (`scripts/cost-model.js`), so this is worth almost nothing
      financially. Decide it on what the app stands for.
      A monthly 100-message pool was considered and rejected: a daily cap gives thirty pitch moments a month
      and they come back tomorrow; a monthly pool gives one wall and three dead weeks.
- [ ] **3.2** The counter UI. 🟡 **Wording and placement deliberately NOT settled** -- needs the screen.
      🟡 Open: does a zero-cost canned answer count against the cap? Justin leans yes.

### 4. STILL UNDISCUSSED -- from the 2026-08-05 measuring pass
These are measured findings with no decision yet. Work them one at a time, same as section 1.

⚠️ **MAP TO THE ORIGINAL FINDINGS LIST** (the numbering Justin was tracking). Renumbering without this map
is what made him think work had been dropped -- it had not, but he had no way to check. Keep it current.

| Original # | Finding | Now |
|---|---|---|
| 1 | Smart Coach is the #1 AI cost | ✅ decided -- section 1 |
| 2 | Smart Coach can't cache (under 4,096) | ✅ decided -- **same fix as #1**, see 1.1 |
| 3 | Docs said the rulebook was 11,600 tokens | ✅ done -- corrected in 4 places |
| 4 | Meal estimator runs on Sonnet | 🔴 open -- **4.1** |
| 5 | Otto's uncached per-message overhead | ✅ built + device-verified -- **4.3** |
| 6 | Reply-shape block is 336 tokens, not 40 | 🔴 open -- **4.4** |
| 7 | Otto's cache is healthy | ✅ nothing to do (good news) |
| 8 | Otto's cap is server-side | ✅ nothing to do -- enables 3.1 |
| 9 | Estimator's cap is client-side | 🔴 open -- **4.2** |
| 10 | History capped at 12 turns | ✅ measured + closed, LEAVE AT 12 -- **4.5** |
| 11 | Otto's 4,425 tokens of rules unread | ✅ **read + closed 2026-08-06 -- ~3% cuttable, declined** -- **4.6** |
| 12 | Is Otto wordier on some topics | ✅ **measured + closed 2026-08-06 -- he already complies** -- **4.7** (lives in the 4.4 block) |
| 13 | Smart Coach packet not sized | ✅ done -- ~200 tokens |

- [x] **4.1 ✅ BUILT + DEVICE-VERIFIED 2026-08-06.** Photos resize to 1024px on the longest edge before
      sending (`resizeForEstimate` in `app/ai-meal-estimator.tsx`, `MAX_IMAGE_DIM` in
      `services/aiMealEstimator.ts`), JPEG quality raised 0.4 -> 0.8, and the dead `assumption_note` field
      removed. **MEASURED on the same photo: $0.00953 -> $0.00717, ~25% off an estimate.**
      ✅ **PORTION ACCURACY HELD, which was the whole risk.** A blueberry muffin held in Justin's hand came
      back "approx 80-90g **based on hand size comparison**" at 1024px. It still used the hand for scale.
      🔴 **THE 28% AND THE 890 TOKENS WERE BOTH WRONG, and the route to the saving was not the predicted one.**
      A 1024px photo at a normal 4:3 aspect measures **~1,048 image tokens, not ~890** (1024x768/750), so the
      resize alone saved ~500 tokens rather than ~660, worth **~16%**, not 28%. The rest came from removing
      the dead field and from the reply simply being shorter.
      🔴 **QUALITY 0.4 WAS PURE LOSS AND NOBODY HAD NOTICED.** The old comment claimed lower quality meant
      "cheaper vision billing". **Anthropic bills an image on its DIMENSIONS, not its file size**, so 0.4 was
      buying a smaller upload and nothing else while destroying exactly the fine detail (plate rims, a fork
      for scale) that PORTION estimation depends on. Raised to 0.8: costs zero tokens, protects the accuracy
      the resize threatens.
      ⚠️ **A REAL BUG WAS INTRODUCED AND CAUGHT DURING THE BUILD.** `canSubmit` keys off the DESCRIPTION, not
      the image, so Analyze stays live while a newly picked photo resizes: the preview showed the new photo
      while the payload still held the PREVIOUS one. Gated on a `preparingImage` flag.
      ⚠️ **The silent-failure trap:** the old code read base64 straight off the picker. Resizing the file and
      still sending that would have saved exactly zero while looking perfectly shipped.
      ❌ **SHORTENING THE JSON KEYS WAS CONSIDERED AND REJECTED.** Field names are instructions to the model,
      not labels, and the field most at risk is `portion_description` -- this feature's whole value. With a
      legend added to compensate the net is ~5% of an estimate (~0.3% of the AI bill) against a real accuracy
      risk. **Do not re-propose without a measured reason.**
      🟡 **REMAINING, NOT ACTED ON:** after the resize the REPLY is ~40% of an estimate and the photo ~33%.
      There is no filler left to cut here (every line is a number the user acts on) but the same arithmetic
      applies far more profitably to Otto -- see 4.7. Output bills at 5x input everywhere.
      ⚠️ Output varies run to run (155/205/212/384 observed across four estimates), so do NOT read a single
      before/after pair as precise. Input is the stable half.
      (Original decision follows.)
      **✅ DECIDED 2026-08-05: KEEP SONNET. RESIZE THE PHOTO INSTEAD.**
      **MEASURED, one real photo estimate: $0.00953.** Where it goes:
      | | tokens | cost | share |
      |---|---:|---:|---:|
      | **the photo** | ~1,550 | $0.00465 | **49%** |
      | prompt (562) + user text | ~600 | $0.00180 | 19% |
      | the reply | 205 | $0.00308 | 32% |
      ➡️ **The IMAGE is half the cost, not the model.** The photo is uploaded at full resolution and
      Anthropic scales it to their 1568px cap and bills ~1,550 tokens for it.
      ➡️ **Resize to a 1024px max dimension, behind a dial.** Image tokens scale with AREA, so the curve is
      steep early: 1568 -> 1024 costs ~660 tokens (**28% off, $0.0095 -> $0.0068**); going on down to 784
      buys only another 9% for meaningfully more quality risk. **Start at 1024.**
      ✅ **Keeps Justin's 2026-07-31 call that Sonnet is justified for vision** -- switching to Haiku would
      save 66% but you would have to find out whether it reads food worse. This way you never do.
      ⚠️ **The code comment saying a resize "is a native module and needs a rebuild" is STALE.**
      `expo-image-manipulator` is already a dependency and already used in `app/(tabs)/log.tsx` and
      `app/profile-photo-crop.tsx`. No rebuild needed.
      ⚠️ **REAL RISK IS PORTION ESTIMATION, NOT IDENTIFICATION.** A muffin at 1024px is still obviously a
      muffin; judging HOW MUCH leans on fine cues (plate rim, fork, depth) and that is what decides whether
      the calorie number is right. **Nutrition labels are NOT a risk** -- label scanning is a separate
      on-device feature in Create Food and never uses this path.
      ⚠️ **QUALITY TEST BEFORE THIS IS DONE:** four photos of increasing difficulty (single item, mixed
      plate, something small, something with ambiguous portion) at both sizes. Compare the identified foods
      **and the calorie totals**. Ship only if the totals track.
      🔴 Corrections this replaced: the estimate was $0.0165 (74% high); item O recorded the prompt as
      "~2,250 tokens" when it is **562**; and a same-day claim that caching the prompt would recover most of
      the Haiku saving was wrong -- at 562 tokens caching it saves about 2%.
- [x] **4.12 ✅ BUILT + DEVICE-VERIFIED 2026-08-07. THE DAY SUMMARY TIP IS NOW DELIVERED, NOT THROWN AWAY.**
      ⚠️ **RENUMBERED 4.10 -> 4.12 on 2026-08-07 because it collided with the EXISTING 4.10** ("enumerate
      which remaining features call the AI at all"), which Justin has been tracking since 2026-08-05. Two
      items shared a number for a day. Nothing was lost; the old 4.10 is untouched and still open.
      `refreshDayCoachTip` returned the plain fallback instantly and fired the AI in the BACKGROUND, storing
      the result for a second visit to that same date. Justin found it on device: tap "View Full Breakdown",
      land on the page, read the stitched template, and the voiced version you just paid for only appears if
      you come back. It now awaits the call behind a loading state (`dayCoachLoading` in `day-summary.tsx`),
      which is the shape weekly and monthly have always had.
      ✅ **DEVICE-VERIFIED, all three checks:** opened to a loading state, the day counter went up by exactly
      1, and re-opening the same date showed the voiced version with **no new call**.
      ⚠️ **COST-NEUTRAL, and do not let it be written up as a saving.** Same one call per date. It converts a
      wasted call into a delivered one.
      🔴 **THE TRAP THAT WAS DELIBERATELY NOT WALKED INTO: `aiGeneratedDate` MEANS SOMETHING DIFFERENT HERE.**
      Everywhere else it means "written today" and drives the daily dedup, so `generateCoachTip` stamps
      `todayKey`. On the day tip it means "this is the tip FOR this date" and is matched against `dateKey`.
      Routing this through the shared path would stamp every past day with today, break the match on the next
      visit, and **make browsing your own history buy a fresh call on every single open, forever.** The
      bypass is deliberate; a future tidy-up that "unifies" these two paths reintroduces it.
      ⚠️ A failed call saves NOTHING on purpose, so the next visit retries. A failure must never freeze a
      date onto the plain version.
- [ ] **4.2** The estimator's 5/month cap is **client-side** (AsyncStorage). A modified client could burn
      60 Sonnet calls/day through the server backstop -- about $1/day. Wants a server-side cap.
- [x] **4.3 ✅ BUILT + DEPLOYED + DEVICE-VERIFIED 2026-08-05.** The per-user half of Otto's prompt is now
      split at its own stability line and the stable side carries a cache marker. `buildCompanionVolatileSplit`
      in `companionSystemPrompt.ts`; `appCompanion.ts` sends it as two blocks with the marker between them.
      ✅ **THE PROMPT IS BYTE-IDENTICAL.** `buildCompanionVolatile` is now literally `cached + tail`, so the
      two forms cannot drift. Verified across four cases (free, free+extras, Supporter with and without a
      snapshot): free-user prompt is still exactly 3,698 characters, the count taken BEFORE the edit.
      ⚠️ **THE BOUNDARY IS IN A DIFFERENT PLACE PER TIER, deliberately.** Free: the free-plan block is static
      text identical for every free user, so it is cached. Supporter: the data snapshot is rebuilt every
      message so mid-chat logging shows up, so it stays OUT. `freeContext` is always out (it attaches only
      when the question is about achievements/journal/exercise names).
      ⚠️ **IT IS A PER-USER CACHE, NOT A SHARED ONE.** Their name and goals sit above the free-plan block, so
      the cached prefix carries them. Making it genuinely shared means moving the block above the CONTEXT
      section, and the block's own text says "their goals are in the CONTEXT block above" -- a real copy edit.
      Not done. Decide it with the meter, not with an opinion.
      ➡️ **SIZE UNPROVEN.** 786 tokens becomes cacheable for a free user (MEASURED); ~15% of a warm message
      (DERIVED) and only on messages that land warm. Device-verified 7/7 (Supporter data, free-plan wall, app
      how-to, faith handoff) -- that confirms nothing BROKE, not that it saved. First all-after meter day is
      the clean read.
- 🔢 **TWO FINDINGS FROM THE FIRST METER READ (2026-08-05, 15 real Otto calls, MEASURED).** Breakdown and
      arithmetic: `SPEC_cost_model.md`.
      1. 🔴 **Cold cache writes are ~67% of Otto's daily cost** (13.4c of 20.0c). The big block was written
         cold ~4x and read warm ~11x. **The dominant cost is the cache expiring between sessions, not the
         uncached tail 4.3 addresses.** ➡️ Confirms 2.1b: at 1h TTL those 4 writes cost 5.3c each instead of
         3.3c, so it would be WORSE at this volume unless the longer window merged sessions. It would not.
      2. 🔴 **~2,200 full-price tokens per message, not the 1,100-1,400 recorded here** (32,960 over 15
         calls). ➡️ **MEASURED the same day: history is 38% of that, not all of it.** The rest is the
         reply-shape block, the user's own message and the occasional pitch/cap block. **4.5 is closed.**
      ✅ The meter's own dollar figure reconciles to the price model to the cent ($0.200352). These are good numbers.
- [x] **4.4 ✅ MEASURED AND CLOSED 2026-08-06. IT DOES NOT PAY FOR ITSELF AT ALL.** Its own comment claims
      "~40 input tokens" bought back "~100 output tokens", so it "pays for itself roughly twelve times over".
      **Both halves are wrong.** MEASURED on the same 18 coaching questions, with and without the block:
      | | |
      |---|---:|
      | block size | **334 tokens** (1,302 chars), not 40 |
      | output WITHOUT it | 185 tokens |
      | output WITH it | 122 tokens |
      | so it saves | 63 output tokens = **$0.000315** |
      | and it costs | 334 input tokens = **$0.000336** |
      | **net** | **-$0.00002 a message** |
      🔴 **DO NOT DELETE IT ON THIS FINDING.** The block is not only about length: it also carries the
      no-questions rule, the ambiguous-message rule and the no-dashes rule. Those are QUALITY, and they would
      have to be re-homed. ➡️ **The correct conclusion is "its cost justification is false", not "remove it".**
      ⚠️ The earlier note here said it pays back ~1.5x. That was arithmetic on the corrected size against the
      comment's own claimed 100-token saving. The real saving is 63, which tips it negative.
- [x] **4.7 ✅ MEASURED AND CLOSED 2026-08-06. OTTO ALREADY COMPLIES. NOTHING TO DO.**
      Harness: `functions/_otto_length.cjs`, 18 real coaching questions, A/B against the real prompt stack.
      | as shipped | |
      |---|---:|
      | output | **122 tokens** |
      | sentences | **3.3** (rule says two to four) |
      | replies over one paragraph | **0 / 18** |
      ❌ **AN EXTRA LENGTH RIDER MADE IT WORSE**, not better: 136 output tokens and 3.6 sentences, on top of
      123 tokens of uncached input. More instruction produced longer replies. It would have shipped as a net
      loss.
      🔴 **THE FIRST TWO RUNS WERE INVALID AND NEARLY SHIPPED A WRONG CONCLUSION.** The harness omitted
      `REPLY_SHAPE_BLOCK`, which `appCompanion.ts` attaches to the user turn on EVERY message and which is
      already a full length rider. The baseline was therefore Otto with his length rule stripped out, and it
      measured 7.3 sentences and 18/18 multi-paragraph -- which looked like a large opportunity and was an
      artefact. ➡️ **A harness is only as good as its reading of the call site. Reproduce the WHOLE user
      turn, not the parts you happen to have read.** See [[feedback_read_full_context_before_debugging]].
      ✅ **Justin called both 4.6 and 4.7 correctly before either was measured** ("I'm almost certain it is
      all tightly written already"). Two for two.
- [x] **4.5 ✅ MEASURED AND CLOSED 2026-08-05. THE ANSWER IS "LEAVE IT AT 12."** Instrumented
      (`recordHistorySample` in `aiUsageMeter.ts`, fired from `appCompanion.ts`, measurement only, changes
      nothing Otto is sent), then measured on a deliberate 10-message conversation on device.
      **MEASURED, 10 messages, isolated with a before/after read of `ai_cost`:**
      | | |
      |---|---:|
      | history | **3,565 tokens = 38% of full-price input, but only 5% of the bill** |
      | `historyTurns` 84 across 10 samples | 1,3,5,7,9,11,12,12,12,12 -- **the cap genuinely engaged from message 7** |
      ❌ **CUTTING IT IS REJECTED, and the free cap is why.** History is per-session and never persisted
      (`AssistantChat.tsx` holds it in `useState`, closing the sheet wipes it), so it builds 1,3,5,7,9,11 then
      pins at 12. **A free user on the 5/day cap tops out at 9 and can never reach 12.** Trimming the cap
      therefore bills SUPPORTERS almost exclusively -- the people paying -- to save ~0.5% at 10 (~$65/yr at
      2,500 actives) or ~2.5% at 6, and 6 is the setting that makes him lose the thread.
      ✅ **History is worth its money, device-verified.** After nine earlier messages he correctly recapped
      the post-workout window, rest days, logging consistency and the Recipe Builder.
      🔴 **AND IT POINTS THE OTHER WAY.** The cold write is a per-CONVERSATION cost, so history is what gives
      it more messages to spread across: **~$0.0072/message over 10 messages vs ~$0.021/message over 2.**
      A short conversation is ~3x more expensive per message. **Trimming history pushes in the wrong
      direction.** ⚠️ Nobody has costed this against 3.1 -- a 5/day cap pushes users toward exactly the
      short-conversation shape that is worst per message.
      ⚠️ **HALO HAS THE SAME UNMEASURED 12-TURN CAP** (`faithCompanion.ts`). Not measured; do not assume this
      result transfers, her prompt is a seventh the size so the arithmetic is different.
      ➡️ Corrects the same-day claim that history explained the ~2,200-token gap. It is 38% of it, not all.
- [x] **4.6 ✅ READ AND CLOSED 2026-08-06. NOT WORTH CUTTING.** Read end to end looking for redundancy.
      **~3% is genuinely cuttable** (two rules stated twice: "only name a metric that appears in the
      snapshot", and "do not invent a path" restated better in the next paragraph). ~150 tokens of 4,425,
      inside a CACHED block, so it is rounding-error money in exchange for editing safety rules. **Declined.**
      ⚠️ Most of that text is scar tissue from real failures (the "never invent a fact about this person"
      section cites the time Otto stated a birthday off a profile that carries none). Do not mistake length
      for fat.
      🟡 **ONE REAL FINDING, NOT A COST ONE, LOGGED NOT FIXED:** `TIER_NRN` still says *"never point them to
      Halo"*, which Justin REVERSED on 2026-08-05 -- `FAITH_HANDOFF_BLOCK_NRN` names her deliberately, a few
      lines below in the same file. Otto's prompt carries a rule and its reversal. The handoff wins where the
      detector fires (81%); on the ~19% it misses, an NRN user gets the old behaviour. Worst case he is more
      RESERVED than intended, so nothing is exposed. **Justin's call 2026-08-06: leave it, it is functional.**
      ⚠️ **The original wording of this item ("never once read") was too strong** and Justin pushed back
      correctly: that text has been written, edited and red-teamed many times. What had never happened was a
      read hunting specifically for redundancy.
- ➡️ **4.7 was renumbered into the 4.4 block above and is CLOSED.** Otto already writes 3.3 sentences and
      0/18 replies exceed one paragraph; an added length rider made it WORSE. Full measurement lives with
      4.4. ⚠️ **This pointer exists because a duplicate open `[ ] 4.7` survived here for several hours on
      2026-08-06 while the closed version sat higher up the file.** A background contradiction sweep caught
      it, not a doc pass. **Do not delete the pointer; delete the duplicate.**
      ⚠️ The old note here claimed "once the prompt shrinks, output is ~70% of the remaining cost, so this
      gets MORE valuable". **Measured: output is ~55% of a coach-route message and there is no fat in it.**
- [x] **4.8 ✅ DEPLOYED + DEVICE-VERIFIED 2026-08-07.** (Header below was "SPECCED, NOTHING BUILT"; the
      build, the deploy and the inert-gate bug are all recorded further down this item.) Canned answers for
      fixed-answer app questions:
      no API call at all, so the reply costs **zero**, not less. It deflects the EXPENSIVE messages -- an app
      question is a Support-route message at $0.0054.
      **🔢 THE INVENTORY (read all 972 lines of `assistantAppKnowledge.ts` to build it):**
      | | count |
      |---|---:|
      | navigation how-tos (the KB's own "COMMON HOW DO I" index is already question -> one answer) | 43 |
      | achievement definitions ("what is Well Worn" = 50 step-goal days), 13 families | 99 |
      | conceptual fixed answers (Program vs Routine, Net Carbs, why BURNED is high, a night files under the day you woke, where Apple Health permissions really live, ...) | ~25 |
      | money + policy (price, the five tip amounts, restore purchases, what happens if you cancel, faith is never paywalled) | ~10 |
      | **TIER 1 total -- identical for every user** | **~177** |
      ✅ **PLUS PLEASANTRIES**, which nobody had counted: "thanks", "ok", "cool", "hey" each cost a full
      $0.0054 today. Probably more frequent than any single how-to and trivially safe to match.
      **TIER 2 -- fixed but conditional. ALL BUT THREE ARE CANNABLE**, because the server already has
      `supporter`, `faithTier` AND `styleMode` at the point the matcher runs (verified in `appCompanion.ts`):
      branch on membership (AI allowances, the 8 creation limits, custom macros/nutrition, Reports/EvR, "what
      does the plan add"), on faith tier (anything pointing at the Faith tab or Halo), on coaching mode
      (Macros card + calorie strip, hidden in Mindful).
      ❌ **THREE ARE NOT CANNABLE -- the server does not know the fact:** whether they own a wearable, their
      Home layout ("where's my Weight card" -- hidden by default), and their meal-slot names (accounts before
      2026-08-03 have "Morning"). Those go to Otto, who has the snapshot.
      **✅ DECIDED (Justin, 2026-08-05):**
      1. **Canned answers COUNT against the daily cap.** Deliberate: hitting the wall is what creates pitch
         moments, and conversion moves the needle harder than cost does. I argued the other way; his is better.
      2. **Free AND Supporters.** A Supporter's app question costs the same, a canned reply is INSTANT, and
         free-only would give paying users the slower answer to "how do I log a recipe".
      3. **Written in OTTO'S VOICE, not pasted from the KB.** The KB lines are terse index entries and would
         read like a vending machine directly after a warm AI reply. Justin's point, and it is the seam that
         would make this feel cheap.
      4. 🔴 **AND THEREFORE: AN AUTOMATED STALENESS CHECK.** Voicing them by hand re-creates the problem the
         KB-generation idea was meant to solve. So each canned answer asserts that its navigation path still
         appears VERBATIM in `assistantAppKnowledge.ts`; move a feature and the check fails and names the
         answer that is now lying. **This is the whole reason the free-cap change took four edits today --
         mechanise it or it will happen again.**
      5. **Fires only on a SELF-CONTAINED message**, judged per message with no conversation-position rules.
         ⚠️ An earlier draft said "never two canned answers in a row"; Justin killed it with "how do I log
         food?" / "how do I log water?" -- two perfectly good standalone questions. Block only on real
         evidence of context-dependence: a connector opener ("and", "what about", "ok so") or a bare pronoun
         with no noun ("how do I edit it").
      **➡️ EXPECTED, and stated as a range because the deflection rate cannot be known before launch:**
      catching half to two-thirds of app questions is **~17-26% off a free user's bill**, break-even retention
      **4.5 -> ~3.3-3.7 months**, roughly **$5,000-7,000/yr at 25,000 installs**.
      ⚠️ **A MISS COSTS NOTHING EXTRA -- it just saves nothing.** Correcting my own sloppy phrasing: a miss
      falls back to exactly today's behaviour. It is not cheap, it is the whole prize on that message.
      **✅ HOLE 1 CLOSED -- follow-ups.** Fires only on a SELF-CONTAINED message, judged per message with no
      conversation-position rules (see decision 5 above).
      **✅ HOLE 2 CLOSED -- two-part questions.**
      🔴 **THE MATCH MUST EXPLAIN THE WHOLE MESSAGE, NOT PART OF IT.** Not "does this contain a question I
      recognise" -- that is substring matching and it is how you end up answering a third of what somebody
      asked. After matching, if any substance is left unexplained, bail to Otto.
      - Both parts canned -> **answer both, stitched into ONE reply** ("Two things: ..."). Zero cost.
      - **LIMIT 2.** Three stitched answers start reading like a list rather than a person, and three-part
        questions are rare. Three or more -> Otto.
      - Mixed (one canned, one coaching) -> **Otto answers the WHOLE thing.** Costs $0.0054 rather than the
        $0.0032 the coaching half alone would have, because the app words route it to Support. **That is the
        right way to lose $0.002** -- one reply that answers everything beats two that each answer half.
      - **A stitched reply counts as ONE message.** One reply, one message. The cap rule stays one rule.
      ❌ **NEVER A "PLEASE ASK ONE AT A TIME" REPLY.** Justin floated it (free users get a nudge instead of
      being charged) and then killed it himself: it is the app asking the user to work around its own
      limitation at the exact moment they are engaged enough to ask two things, and it would fire on genuine
      coaching two-parters Otto handles fine today. ⚠️ **THE LIMIT IS INTERNAL AND INVISIBLE.** Over it, Otto
      silently takes over and answers everything. Nothing is ever ignored and nobody is ever asked to rephrase.
      ✅ **ONE TEST SERVES BOTH OUTCOMES:** "is every part of this message explained by a canned answer?"
      All explained -> stitch and serve. Any part unexplained -> Otto.
      **✅ HOLE 3 CLOSED -- conversation history, and it settled WHERE THE MATCHER RUNS.**
      The problem: a canned reply never touches the API, so unless it is stored the next turn shows the user
      asking about recipes and Otto saying nothing back. Ask "what about macros for it" and he cannot know
      what "it" is. It looks like amnesia, not a missing line of code.
      ✅ **NOTHING TO BUILD -- the mechanism already exists.** `AssistantChat.tsx` builds `history` from its
      in-memory `messages` list on every send (verified: line ~637, filtered to user/assistant roles), and
      that list is wiped when the sheet closes. A canned reply stored as an ordinary assistant message shows
      on screen, rides the next turn, and disappears with the chat. Exactly Justin's "temp history" instinct,
      already in place.
      🔴 **THEREFORE THE MATCHER RUNS SERVER-SIDE, and this is the load-bearing decision.** Answering on the
      phone would break the two things Justin asked for outright: the daily cap is enforced **server-side**
      atomically, so a reply the server never sees CANNOT count against it; and the meter is server-side too,
      so every canned answer would be invisible and **the deflection rate could never be learned.**
      ⚠️ **ORDERING IS LOAD-BEARING AND EASY TO GET WRONG: the canned check must sit AFTER the cap
      increment**, not before. Put it first and the cap silently stops counting canned answers -- invisible
      when wrong, and it undoes decision 1.
      ⚠️ Honest caveats, having overstated this once: a Cloud Function invocation is **negligible, not free**
      (~1/10,000th of an Otto message), and "faster" comes with an asterisk -- no AI round trip, but a cold
      start still costs a second or two.
      ⚠️ **PRECEDENT, and why it is the WRONG one here:** the crisis response already short-circuits on the
      CLIENT and never calls the server. That is correct for crisis (safety, and it must not consume a cap
      message). Canned answers are the opposite case on both counts.
      **✅ HOLE 4 CLOSED -- Mindful. Much smaller than it was flagged as, and Justin called it.**
      Grepped what ACTUALLY changes in Mindful rather than assuming: only three things (the calorie stat
      strip on Home + the Log header, the Macros card, and the calorie rows in Stats "At a Glance"), plus the
      standing tone rule against deficit math and weight-loss prescriptions.
      ✅ **ACHIEVEMENTS AND STREAKS ARE NOT MODE-DEPENDENT AT ALL**, which removes 99 of the 177 outright.
      ➡️ **SO IT IS A VISIBILITY PROBLEM, NOT A TONE ONE, and it hits ~3-4 answers.** A navigation path or a
      badge definition cannot violate the Mindful rules -- neither does maths and neither grades anything.
      The clearest case is already in the KB's own index: *"Change calorie/macro/water/step/sleep goals:
      Profile > Settings > Goals (macros also via the Home Macros card gear)"* -- for a Mindful user the
      second half points at a card they do not have.
      ❌ **NO THREE-VARIANT SET.** 531 answers to maintain, buying nothing. Written ONCE, neutrally; only the
      three or four that name a Mindful-hidden surface branch on `styleMode`, using the mechanism already
      agreed for the Tier 2 conditionals.
      ✅ **MECHANICAL CHECK, same family as the KB-path assertion:** no canned answer may mention the Macros
      card, the calorie strip or net calories without a mode branch.
      **✅ HOLE 5 CLOSED -- decay. It is TWO failures and they need different answers.**
      1. **A feature changes and the canned answer does not** -- the dangerous one, Otto states an old path
         with total confidence. ✅ Already handled by the KB-path assertion (decision 4).
         ⚠️ Residual, stated honestly: if the app changes and NOBODY updates the KB, both are wrong together
         and the check passes. That is a pre-existing exposure -- Otto would be lying either way -- and
         canned answers do not add it.
      2. **A new feature ships with no canned answer** -- harmless (falls through to Otto) but the saving
         erodes with nothing to flag it. ✅ **Handled by PROCESS, not code:** CLAUDE.md's ship check already
         has a "anything user-facing" row naming tooltips + tutorials + Otto's KB. Canned answers join it,
         and 2026-08-05 that row gained a dedicated line for **a number a user can see**, after the free-cap
         change touched four files while being called a one-liner.
      ✅ **AND A COUNTER IN THE METER:** app questions that reached Otto without matching. The number tells
      you the gap is growing.
      🔴 **COUNT ONLY, NEVER THE MESSAGE TEXT (Justin, 2026-08-05).** Logging the misses verbatim would be a
      ready-made to-do list of what people ask that we do not cover -- and it is new collection of what users
      type at an AI assistant, needing `privacy.html` updated first. The gap can be closed by reading the KB
      instead of reading users. **Easy to add, awkward to explain later.**
      ➡️ **ALL FIVE HOLES CLOSED. The spec is finished; next step is building the matcher.**
      **🔬 HOW IT GETS MEASURED:** three corpora as with 4.9, but the number that must be zero is
      **WRONG-ANSWER rate, not miss rate** -- with 177 candidates the risk is matching the wrong one.
      ⚠️ **Build the third corpus from the collisions the KB ITSELF documents:** PRs vs Records, create vs log
      a recipe, Program vs Routine, Repeat Yesterday vs Find a Meal. Those pairs are where a matcher dies.

      ─────────────────────────────────────────────────────────────────────────────
      ## ✅ DEPLOYED + DEVICE-VERIFIED 2026-08-07. Live and firing.
      `ottoCannedAnswers.ts` (**183 answers**), `ottoCannedMatcher.ts`, wired into `appCompanion.ts`.
      Harnesses committed: `_canned_audit.cjs`, `_canned_holdout.cjs`.
      🔴 **AND IT SHIPPED INERT FOR ITS FIRST DAY. THE GATE WAS WRONG AND NOTHING ON SCREEN SHOWED IT.**
      The canned check ran under `if (!suffix)`, meaning "only when the app has nothing extra riding on this
      message". But `suffix` ALWAYS contains `REPLY_SHAPE_BLOCK`, which is attached to every single message,
      so it was never empty and **the matcher never ran once**. Justin's 10-message test metered
      `cannedBlocked: 10, cannedHit: 0` with every reply AI-written at full price.
      ⚠️ **EVERY REPLY LOOKED CORRECT**, which is why only the counter could have caught it. Otto answered
      all ten perfectly well and charged $0.0721 for the privilege.
      ✅ **Fixed by gating on the CONDITIONAL riders only** (`ridersOnThisMessage`), derived by filtering
      `REPLY_SHAPE_BLOCK` out of the array rather than restating the conditions as a boolean -- so a sixth
      rider added later is counted automatically and cannot silently switch the feature off again.
      ✅ **VERIFIED ON DEVICE the same day, and the meter is the proof:** `cannedHit` 0 -> 3, `cannedBlocked`
      held at 10, and **`calls` and `usd` did not move at all.** Three answers for zero cents.
      🔴 **IT ALSO CAUGHT A LIVE CONFABULATION, which is the product argument for this feature rather than
      the cost one.** Asked "what do I get for the summit", pre-fix Otto invented *"a step-goal achievement
      for hitting your step target 100 times"*. The Summit is the WEIGHT badge for reaching goal weight. He
      also told Justin that Well Worn counts *"each day you reach 10,000 steps"* when the step goal is
      whatever the user set. Both are now exact one-line facts with no model involved.
      ⚠️ **THE LESSON, AND IT IS THE SAME ONE AS 4.7 AND THE DAY SUMMARY TIP:** the code was read, reviewed
      and committed as done without ever being RUN. See [[feedback_verify_the_call_site]].

      **RESULTS -- THREE CORPORA, THE THIRD WRITTEN AFTER ALL TUNING**
      | | corpus 1 (tuned) | corpus 2 (tuned once) | **corpus 3 (never tuned)** |
      |---|---:|---:|---:|
      | 🔴 **wrong answers** | **0** | **0** | **0** |
      | matched correctly | 71/71 | 54/54 | **25/42 (60%)** |
      | declined correctly | 30/30 | 22/22 | **21/21** |
      | collisions resolved | 22/22 | | |
      | stitching | 2/2 | | |
      | assertion failures | 0 | | |

      🔴 **THE HONEST COVERAGE NUMBER IS ~60%, NOT 96%, AND THE PATTERN IS NOW UNMISTAKABLE.**
      Every fresh corpus lands near 60%. Tuning lifts THAT corpus to ~100% and does almost nothing for the
      next one: corpus 2 went 61% -> 87% -> 100%, and corpus 3, written afterwards, still opened at 60%.
      ➡️ **So the tuned scores measure nothing. Quote 60%.**
      ⚠️ **THIS MATTERS FOR THE SAVING.** The 4.8 estimate assumed catching half to two-thirds of app
      questions. 60% is the bottom of that range, so **expect the low end, not the high end.**
      ✅ **AND THE NUMBER THAT ACTUALLY MATTERS NEVER MOVED: ZERO WRONG ANSWERS, on all three corpora, on
      every run, plus 73/73 correct refusals.** It either answers correctly or it steps aside.
      ➡️ **THE FIX FOR COVERAGE IS PRODUCTION, NOT MORE GUESSING.** `cannedMiss` counts app questions that
      reached Otto unmatched. That number, against real phrasing, is the only honest list of what to add.
      Writing a fourth corpus myself would just produce another 60%.

      **FOUR ASSERTIONS, ALL PASSING**
      1. No dashes of any kind (em, en, double hyphen, spaced hyphen). Hyphens inside compounds allowed.
      2. Every `route` is one of the 26 real keys. **158 of 183 answers carry a jump button.**
      3. **Every stated `A > B` path still exists verbatim in `assistantAppKnowledge.ts`** -- the staleness
         guard that buys back the single-source-of-truth we gave up by voicing these by hand.
      4. No Mindful-hidden surface (Macros card, calorie strip, net calories) without a `styleMode` branch.

      **WHAT THE BUILD ITSELF TAUGHT (all found by the harness, none by inspection)**
      - 🔴 **`return` alone on a line silently returned `undefined`** via automatic semicolon insertion. The
        tuned corpus fell 71/71 -> 3/71 and reported "unexplained-remainder" on *"how do i log a recipe"*.
        **That absurdity is what gave it away**: no rule change could break something that simple.
      - 🔴 **Set-cover stitching could never work.** An answer's `excludes` are evaluated against the WHOLE
        message, so "how do i log food and how do i log water" disqualified the food answer for containing
        the word "water". Rewritten to SPLIT on the connector and match each half alone: 0/2 -> 2/2.
      - 🔴 **Two collisions Justin predicted came true on the first run**: "how many custom foods do I HAVE"
        matched the LIMIT answer, and "am I on pace for my goal weight" matched the weight-goal answer. Both
        fixed by a possessive-data guard, with two exemptions the audit then forced: a HOW-TO is never a data
        question however many time words it holds ("how do i repeat YESTERDAY's meal"), and "do I have TO" is
        an obligation, not a possession.
      - ⚠️ **Ambiguous ties are a FEATURE.** When two answers both explain the whole message, the message is
        ambiguous, not the answers. Picking one is exactly how the wrong one of 183 gets returned, so it goes
        to Otto. Five ties in the first run, all resolved with `excludes` rather than by picking a winner.
      - ⚠️ **Almost every held-out miss was ORDINARY FILLER, not a missing topic word** ("whats the FASTEST
        WAY to log breakfast"). Fixed with generic stopwords and a small synonym layer (wipe->clear,
        swap->change, buzzing->notification), because adding each miss to a specific answer's vocabulary
        would be fitting the test, which is what made the first corpus worthless.
      - ⚠️ **Two harness bugs reported as content failures**, both worth remembering: the path extractor
        grabbed whole clauses and punctuation, and the KB wraps lines mid-path so a real path read as missing.

      **WIRING, and the position is load-bearing twice**
      Placed AFTER the cap increment (so a canned answer still spends a message, Justin's call) and AFTER
      `suffix` is built (so if the app has decided a pitch, cap, decline, safeguard or faith handoff must ride
      on this message, we never fire and never swallow it). Crisis needs no guard: the client short-circuits
      it before the call.
      🔬 **`ai_cost` gains three counters:** `cannedHit`, `cannedMiss` (the coverage gap) and `cannedBlocked`
      (prices the guard). **Count only, never message text.**

      **⚠️ OPEN, FOR JUSTIN**
      - **Nothing is cut.** Per instruction, anything questionable stays in and is flagged here instead.
      - ✅ **STALENESS GUARD EXTENDED 2026-08-05 (Justin's item 2).** It now also checks FEATURE NAMES
        written in prose (any run of two or more capitalised words, like "Weight History" or "Sleep &
        Recovery"), not just arrow paths. **147 checks, up from 30**, covering the 160 answers that state no
        path. It immediately caught two real things: an invented example label ("Leg Day", changed to the
        KB's own "Push"), and "King James Version" written in full where the KB abbreviates to KJV.
      - ✅ **THE 7 KNOWN MISSES ARE FIXED (Justin's item 1)**, by mechanism rather than by patching answers:
        synonyms now canonicalise the MESSAGE rather than only the coverage test (so "wipe a meal" and
        "an OLDER day" reach the right answer), the bare-pronoun guard only applies to short messages, and
        two answers were restructured. ⚠️ **And it barely moved corpus 3**, which is the whole lesson.
      - **The 99 achievements are generated from a table**, so their phrasing is uniform and slightly flatter
        than the hand-written ones. Worth reading a few before shipping.
- [x] **4.9 ✅ BUILT + DEPLOYED + DEVICE-VERIFIED 2026-08-05.** `ottoCoachRouting.ts` answers one yes/no --
      can this be answered without the app manual? -- and `appCompanion.ts` sends the manual only when the
      answer is no. **Built as a STACK, Justin's design:** block 1 is the ~4,400-token rules half, identical
      for both routes so Coach and Support keep ONE shared cache warm for each other; block 2 is the manual
      or its stand-in; block 3 is 4.3's per-user block.
      ✅ **THE SUPPORT PATH IS BYTE-IDENTICAL** to what shipped before (`rules + manual === old stable`,
      asserted in code, verified after build).
      **MEASURED, 306 messages across THREE corpora:**
      | | |
      |---|---:|
      | 🔴 app/data questions sent to a manual-less Otto | **0 / 306** |
      | coaching correctly routed | **119 / 120** |
      ⚠️ **EVERY CORPUS FOUND A NEW *CLASS*, NOT NEW WORDS.** Corpus 1: questions about the user's own data
      ("hows my protein this week" names no app noun but is answered by pointing at a screen). Corpus 2:
      "I can't find it" (names no feature at all). Corpus 3: UI verbs and vague product complaints ("i
      tapped it and nothing happened"). **Assume a fourth corpus would find a fourth class** -- which is
      why the default is the manual and why the number to watch is the dangerous one, not recall.
      ✅ **THE KEYWORD WHITELIST WAS ABANDONED and that is the main lesson.** Requiring a recognised coaching
      word capped recall at 81%: food names, exercise names and plain English are unbounded ("is white rice
      bad", "should i take a deload week"). It now works by ELIMINATION -- no app evidence means coaching --
      so the listing burden sits on the app side, which is finite. See [[detectors-are-brittle]].
      🔴 **CAUGHT LIVE THE SAME EVENING, AND IT CORRECTS TWO THINGS I ASSERTED.** A free user asked
      **"how many messages do i get a day"** and it routed to COACH -- no app noun, no coaching word, so
      `coach-by-elimination` fired -- and a manual-less Otto answered **"that's not something GoodForge
      tracks or limits"**. The true answer is 5.
      ⚠️ **CORRECTION 1: three corpora missed an entire CLASS.** Entitlement questions ("how many X do I
      get", "am I limited", "do I run out") have no app noun at all; **only their SHAPE gives them away**, so
      no list of feature names reaches them. Fixed with `ENTITLEMENT_PATTERNS_STRICT` / `_SOFT` +
      `ENTITLEMENT_TERMS`, and a fourth corpus (`_route_holdout3.cjs`) built entirely from the class.
      ⚠️ **THE STRICT/SOFT SPLIT IS LOAD-BEARING.** Guarding every pattern with "no coaching word present"
      broke "how many WORKOUTS can i save" and "do i RUN out of anything" -- both contain coaching words and
      went straight back to Coach. Only the bare `how many ... do i get` shape needs that guard, so that
      "how much protein do i get from chicken" is not read as an allowance question.
      🔴 **CORRECTION 2, AND THE MORE IMPORTANT ONE: THE NO-GUESS RULE DID NOT HOLD.** I claimed a misroute
      would degrade to "I'm not certain, check Settings > Help" because BASE's no-guess rule would catch it.
      **It did not** -- he answered confidently and wrongly. `COACH_NO_MANUAL_BLOCK` has been rewritten to
      say the thing that actually failed, in the words it failed in: **not knowing a limit is never evidence
      that no limit exists**, and never call a thing unlimited, untracked, free or non-existent.
      ➡️ **TREAT THE SAFETY NET AS WEAKER THAN THE CLASSIFIER.** The classifier is measured; the net is a
      prompt instruction, and this is the third time on this project one has lost to the model's own
      inclination. See [[feedback_measure_dont_ask_justin]].
      **✅ AFTER THE FIX: 0 dangerous across FOUR corpora (342 messages), coach recall 132/133.**
      ➡️ **MEASURED EFFECT: $0.0061 -> $0.0032 on a coaching message at warm traffic** (DERIVED from the
      metered block sizes). Blended depends on the mix.
      🔬 **THE MIX IS NOW BEING COUNTED.** `ai_cost` gains `routeCoach` / `routeSupport` per day. That ratio
      is the number no amount of offline testing could produce, and it arrives free with real traffic.
      ⚠️ **NO KILL SWITCH.** Reverting is a one-line change plus a redeploy (~1 minute), not a config flip.
      Fold it into 5.1 when the dials land.
      (Original note follows.)
      ⚠️ **Build the two as a STACK, not two packets** (Justin's idea, and it is the right one): rules first
      with a cache marker, manual second with its own. A Support message then reads the rules from the same
      cache a Coach message just used and only pays fresh for the manual.
      ⚠️ **Ship it logging-only first.** Both halves keep the full manual so nothing changes; log the
      classification; two weeks of real users gives the real mix.
      ⚠️ When a question is ambiguous it goes to **Support** -- having the manual and not needing it wastes
      a little money; needing it and not having it makes Otto invent things about the app.
- [ ] **4.10** Enumerate which remaining features call the AI at all. Only Smart Coach is fully mapped.
- [ ] **4.11 🆕 CLOSING THE CANNED-ANSWER COVERAGE GAP. Two ideas, both Justin's, logged 2026-08-05
      evening. NOT started, and deliberately NOT tonight.**
      **THE PROBLEM THEY SOLVE:** canned coverage measured **~60% on three independent corpora** (4.8), and
      more corpora written by me will keep landing at 60%. **I cannot guess my way to the phrasings real
      people use.** Everything below is about replacing my imagination with evidence.
      🔴 **(a) WAS BUILT, TESTED AND REMOVED ON 2026-08-09 BEFORE IT SHIPPED OR THE POLICY WAS TOUCHED.
      JUSTIN HAD ALREADY SAID YES. IT COLLECTS PEOPLE'S NAMES.**
      The design stored ONE document per unrecognised word holding the word and a count, with **no user id
      at all**, which I argued made attribution impossible and made the "seen by several accounts" guard in
      the original spec unnecessary. **That argument was wrong and one test killed it:** run against
      *"my name is justin harmke and i am 34"* it returned **`["justin","harmke"]`**. The identity filter
      rejected digits, `@` and dots; a first name is plain lowercase letters and walks straight through.
      ➡️ **"NO USER ID" DOES NOT MEAN "NO PERSONAL DATA" WHEN THE WORDS THEMSELVES ARE THE DATA.**
      ➡️ **The guard that fixes it is the one the spec specified and I talked myself out of:** only keep a
      word once SEVERAL DIFFERENT accounts have typed it, which no individual's name ever reaches. That
      needs tracking which accounts contributed a word, i.e. **exactly the person-to-word link the design
      existed to avoid**, at least until the threshold is met. **A real design problem, not a filter to
      widen.**
      ⚠️ **DO NOT REBUILD WITHOUT SOLVING THAT, AND DO NOT AMEND `privacy.html` UNTIL IT IS SOLVED.** The
      policy still says "we never review a conversation you have not reported" and that is still true.
      ✅ **`unknownContentWords()` in `ottoCannedMatcher.ts` SURVIVES and is correct**: it reuses the
      matcher's own vocabulary and stopwords, so the words it reports are genuinely the ones that caused the
      miss. The hard part is solved; the storage is not.
      ✅ **(b) SHIPPED INSTEAD and needs no policy change at all.** See below.
      (Original note follows.)
      **(a) 🔑 KEYWORD CAPTURE ON A MISS.** When a canned answer does NOT fire and the message goes to Otto,
      flag it and keep the words we did not recognise. Justin's framing, and it is narrower and safer than
      mine was: it never touches every message, only app questions we failed on, which is roughly one
      message in five.
      🔴 **ESCALATED 2026-08-08 AT JUSTIN'S EXPLICIT REQUEST ("i want to make sure that isnt lost"). THIS IS
      NO LONGER A COST OPTIMISATION, IT IS THE MECHANISM THAT FINISHES THE FREE TIER.** What changed: the
      general nutrition/fitness canned library (4.13) makes a MISS USER-VISIBLE for the first time. Today a
      miss is invisible -- Otto answers it anyway and nobody knows. Under 4.13 a free user's unmatched
      question gets a Supporter-pointed answer instead of an answer, so **every gap in the library is now a
      free user being sold to instead of helped.**
      ➡️ **AND IT IS THE ONLY HONEST ROUTE TO COMPLETENESS.** Three independently written corpora all landed
      at ~60%; my imagination demonstrably plateaus there (4.8). Real phrasing is the only input that has
      never been tried. **The library cannot be finished any other way.**
      ➡️ **Justin's standing intent: a CONTINUOUS loop, not a one-off audit** -- real questions in, library
      grows, free tier gets better over time without the AI bill moving.
      ⚠️ **STORE ONLY THE UNRECOGNISED WORDS, NOT THE MESSAGE.** "How do i wipe a meal" stores `wipe` and
      nothing else: we already know "meal", so it teaches us nothing. The output is a frequency list of
      words the app does not understand yet, which is directly actionable.
      🔴 **THREE GUARDS BEFORE THIS SHIPS:** only from messages already routed as APP questions; only keep a
      word once SEVERAL DIFFERENT ACCOUNTS have typed it (one person's unusual word is never stored, and you
      cannot reconstruct anybody from a word twenty people used); and drop anything shaped like a name,
      number or email.
      ⚠️ **`privacy.html` MUST GO OUT WITH IT.** Justin is fine with updating it. It is honestly describable
      in one line: *when the app cannot answer a question about itself, it records the words it did not
      recognise so those answers can be improved.* See [[app_store_compliance]].
      ⚠️ **NOT URGENT AND USELESS TODAY** -- with one user it collects nothing. It only starts paying at real
      traffic, so build it any time before launch.
      ✅ **(b) BUILT + DEPLOYED 2026-08-09. A THUMBS-DOWN NOW NAMES THE ANSWER.** The server always computed
      the canned answer's id and threw it away, so a thumbs-down could say "that reply was poor" and never
      WHICH of 321 answers wrote it. It now rides back on the response, onto the message, and into the
      report: `type` becomes `Otto canned answer (gen.protein_target)` and the body leads with the id.
      ✅ **THE GATE'S OWN REPLIES ARE TAGGED TOO** (`gate.no-answer`, `gate.own-data`) **and a thumbs-down
      there is the most useful of the lot: it means a free user was SOLD TO when they wanted HELPING**,
      which is exactly the failure 4.15's coverage number exists to reduce. The faith handoff is tagged by
      tier as well.
      🔴 **CHOSEN OVER (a) DELIBERATELY, AND THE PRIVACY POLICY IS WHY. (a) CANNOT BE BUILT AS WRITTEN.**
      `public/privacy.html` already promises, of Otto and Halo: *"Your conversations are NOT OTHERWISE SENT
      TO US OR STORED ON OUR SERVERS, and we never review a conversation you have not reported."* Section 7
      also lists usage telemetry under Data We Do Not Collect. **Capturing unrecognised words from messages
      nobody reported contradicts a promise already made to live users**, so (a) is not an addition to the
      policy, it is an AMENDMENT, and that is Justin's call rather than a build task.
      ➡️ **(b) needs no policy change at all**: it rides on a report the user chose to send, which section 2
      already covers. ⚠️ **Justin's instinct to write the privacy line BEFORE building was what surfaced
      this.** Building first would have produced a feature the policy forbids.
      ⏳ **(a) STAYS OPEN, with evidence required first.** If thumbs-down volume proves too thin once there
      is real traffic, amending the policy is defensible, and by then there would be a measured reason.
      (Original note follows.)
      **(b) 👍👎 THE THUMBS NOW CARRY REAL WEIGHT (Justin's point).** Otto's replies already have thumbs up
      and down. Until today a thumbs-down meant "the model wrote something poor", which is hard to act on.
      **A thumbs-down on a CANNED answer is different: it points at one specific piece of text we wrote, and
      it is either wrong, stale, or badly worded.** That is the highest-signal feedback in the app and it
      costs nothing to collect.
      ➡️ Needs the reply to record WHICH canned answer id produced it, so a thumbs-down names the entry
      rather than the conversation. Nothing else to build.
      ⚠️ **DO (a) AND (b) AFTER the knowledge-base vocabulary idea below**, which needs no user data at all
      and may close much of the gap for free.
      ❌ **(c) BUILT, MEASURED AND REJECTED 2026-08-09. IT IS WORTH ONE QUESTION IN SEVENTY-FOUR, AND THE
      MEASUREMENT FOUND WHY -- THE PREMISE IS TRUE AND IRRELEVANT.** Nothing was written to any answer
      library and no production code changed: the matcher takes the answer set as a parameter, so the whole
      thing was measured by patching the libraries IN MEMORY (`_derive_vocab.cjs`, `_vocab_preload.cjs`).
      **There was nothing to revert, which is the difference between this and the three designs 4.15 had to
      back out.**
      | source | conversational (of 74) | everything else |
      |---|---:|---|
      | baseline | 19 | -- |
      | KB -> 184 app answers (this item, as written) | **19, no change at all** | unchanged |
      | each general answer's own text -> 137 `gen.*` answers (the sibling idea) | **20** | unchanged |
      ✅ **ZERO wrong answers, zero collisions, zero unsafe matches, and every other corpus unmoved** (app
      audit 71/71, holdouts 54/54 and 30/42, terse 58/77). It is safe. It just does nothing.
      🔴 **WHY, AND THIS IS THE FINDING WORTH KEEPING: 62% OF CONVERSATIONAL MISSES NEVER REACH THE COVERAGE
      TEST AT ALL.** Tallied on the 55 misses: **34 `no-match`** (no answer's `requires` fired, so the answer
      was never a candidate), **18 `unexplained-remainder`** (fired, then failed to explain the message),
      3 own-data. **Vocabulary only touches those 18.** The other 34 need `requires` widened, which is the
      half that feeds the trim's guard and returns wrong answers.
      🔴 **AND THE 18 ARE BLOCKED BY WORDS NO KNOWLEDGE BASE WILL EVER CONTAIN.** Printed them: *hearing,
      told, things, reason, tub, came, most, mentioned, badly, buckets, class, colleague, suffer, four*.
      **They are not feature words, they are the words people wrap a question in.** The KB describes the app
      richly, exactly as the idea assumed, and the app is not what is missing.
      ➡️ **SO 4.11(a) IS NOT JUST THE BEST ROUTE LEFT, IT IS NOW MEASURED AS THE ONLY ONE.** Real phrasing is
      the only source that contains this vocabulary. Recorded here so nobody re-proposes deriving it.
      🔬 **THREE STRUCTURAL FILLER CLASSES WERE THEN MEASURED TOO** (`_filler_preload.cjs`), since the
      blocking words are generic: spelled-out numbers (finishing the existing digit filter), reported speech
      (*my coach mentioned, someone told me*), and other people (*my mate, my colleague*).
      **Numbers: no change. People: no change. Reported speech: +2 coverage AND A WRONG ANSWER** --
      *"ive stopped eating meat will my training suffer"* returned the eat-around-your-workout answer once
      'suffer' became filler. ❌ **All three dropped. Fourth time in two days that buying coverage this way
      has produced a wrong answer.**
      ✅ **THE TRIGGER CHECK IN THAT SCRIPT PAID FOR ITSELF ON THE FIRST RUN** by refusing seven "obviously
      topicless" number words and four person words: **'one' and 'three' (one rep max), 'six', 'hundred' and
      'triple' (the Triple Digits achievement), 'half', and 'wife' / 'husband' / 'friends' / 'everyone'
      (the social-pressure and comparison answers, where who is pressuring you IS the subject).** A number
      word is usually topicless. Usually is not a rule.
      ⚠️ **`has`, `STOPWORDS` and `SYNONYMS` are now EXPORTED from `ottoCannedMatcher.ts`** so tooling cannot
      fork its own word list. Non-behavioural. The three scripts are kept as re-runnable experiments.
      (Original idea follows.)
      **(c) 📚 BUILD EACH ANSWER'S VOCABULARY FROM THE KNOWLEDGE BASE instead of by hand.** Today the words
      each answer recognises are hand-listed by me, which is the guessing. The KB already describes every
      feature far more richly. **Zero privacy exposure, no user data, no doc changes.** ⚠️ Wider vocabulary
      means more messages where two answers both look plausible, and those become ties that go to Otto, so
      it may convert misses into ties rather than into hits. **Measure it the same way: accuracy must stay
      at zero wrong answers.** Guess: 60% -> low 70s. Try this FIRST.
- [x] **4.13 ✅ BUILT, DEPLOYED AND DEVICE-VERIFIED 2026-08-09. A FREE USER'S COACHING QUESTION NEVER
      REACHES THE AI.** 137 general answers, the coach gate, the pitch copy and the escalation are all live
      and confirmed on Justin's phone. **Free-user coaching cost is $0**, and `scripts/cost-model.js` knows
      it (`gateOttoFree=1`): typical free user $1.86 -> $0.93/yr, break-even 2.02% -> 1.03%.
      ⏳ **RESIDUALS, none blocking:** the category-specific case A tails (needs a personal question mapped
      onto its general answer) and coverage beyond 26% on conversational phrasing (4.15).
      (Original entry follows, kept for the reasoning and the rejected options.)
      ⤷ **4.13 A GENERAL NUTRITION & FITNESS CANNED LIBRARY, so a free user's fitness question is answered
      without an AI call. Logged 2026-08-08 while still under discussion.**
      ⚠️ **Logged now only so the work is not lost. Do NOT treat any of this as agreed.** Working drafts live
      in the session scratchpad (`DRAFT_otto_coach_gate.md`, `DRAFT_general_canned_topics.md`); they get
      folded in here and deleted as each piece closes.
      **THE IDEA (Justin's).** Today free users' Otto answers general fitness questions with a paid AI call.
      Pre-write the general answers instead: ~198 topics drafted across nutrition, training, recovery,
      weight/progress, consistency, myths, gym practicalities, named diets, label literacy and safety.
      🔴 **THE LINE JUSTIN DREW, AND IT IS THE WHOLE DESIGN:** general PRINCIPLES are in ("how much protein
      should I eat", "how many rest days"); per-food and per-exercise RULINGS are out ("is white rice bad").
      Rulings are unbounded and would never be finished; principles are a finite list with an end.
      ✅ **ALREADY CORRECTED ONCE:** free users' Otto has **no access to their numbers today** -- `FREE_TIER_BLOCK`
      in `companionSystemPrompt.ts` states it outright. So the "we read YOUR numbers" paywall already exists
      and already holds. This item is a COST cut, not a product-consistency fix. An earlier claim in this
      session that free Otto was a "side door" on 1.9's gate was **wrong**.
      🔴 **THE THING THAT CHANGES EVERYTHING ELSE: A MISS BECOMES USER-VISIBLE.** Today an unmatched question
      falls through to Otto invisibly. Here it lands on a Supporter-pointed answer. **So coverage stops being
      a cost question and becomes a product question**, which is why 4.11(a) was escalated above.
      🔴 **LOCKED, JUSTIN 2026-08-08: EVERY SUPPORTER-POINTED MESSAGE CARRIES A SUPPORT BADGE / BUTTON THAT
      OPENS THE SUPPORT THE MISSION PAGE. "No exceptions."**
      ✅ **STEP 1 BUILT 2026-08-09: THE `support` ROUTE KEY AND BUTTON EXIST.** `utils/companionRoutes.ts`
      gains `support -> /support` labelled **"See what Supporters get"**, and `ROUTE_KEYS` in
      `ottoCannedMatcher.ts` gains `'support'` (26 -> 27).
      ✅ **VERIFIED END TO END, not assumed:** a canned answer's `route` is appended to the reply text as
      `[[route:key]]` (`appCompanion.ts:431`), the client resolves it against `COMPANION_ROUTES`, renders the
      pill, and `openRoute` fades the chat and calls `onClose()` BEFORE navigating. That last part is
      load-bearing: a documented bug had `/support` pushed with the sheet still mounted, leaving the chat
      sitting on top of the page it had just opened.
      ✅ `_canned_audit.cjs` passes (183 answers, 0 wrong, 0 assertion failures) and the functions package
      typechecks clean. Nothing iterates `COMPANION_ROUTES`, so the new key cannot surface by accident.
      🔴 **`support` IS DELIBERATELY *NOT* IN THE MODEL'S KEY LIST** (`companionSystemPrompt.ts`, TAPPABLE
      SCREEN LINKS). Giving Otto the key would let him drop a Become-a-Supporter pill whenever he liked,
      which is exactly what the "never nag" rule forbids: `AssistantChat.tsx` states the free-user nudge
      appears ONLY at the wall, never mid-conversation, never to a Supporter, never on Halo.
      ➡️ Canned answers name their route in a FIELD, so a pitch answer uses it without the model ever being
      able to. **The two lists are deliberately out of sync. Do not "fix" that.** No `ROUTE_TRIGGERS` entry
      either, for the same reason.
      ⚠️ **NOT DEPLOYED, deliberately: nothing uses the key yet**, so the server change is inert until the
      pitch answers land in step 4.
      ✅ **STEP 2 COMPLETE 2026-08-09: `functions/src/ottoGeneralAnswers.ts`, 137 ANSWERS, ALL CHECKS ZERO.**
      Nutrition (26), training (14), sleep and recovery (14), weight and progress (16), myths (7), gym (9),
      named diets (9), labels (6), drinks (5), consistency (12), injury (4), population (4), goals (3),
      safety (8). Separate library from `ottoCannedAnswers.ts`;
      🔴 **THE SAFETY DESIGN IS VERIFIED, AND THIS IS THE RESULT THAT MATTERED MOST.** All three of these
      correctly match NOTHING and fall through to the AI, which carries the `[[CRISIS]]` instruction:
      *"i get dizzy and my chest hurts"*, *"i feel dizzy and short of breath"*, and **"my chest hurts when i
      run"** -- the exact phrasing `faithCrisis.ts` does NOT catch. A canned answer reaching that message
      would have been the worst failure this feature could produce.
      🔴 **A SECOND SHIPPED-CODE FIX: "IS KETO WORTH IT" WAS BEING REFUSED.** The bare-pronoun guard rejects
      any message of four tokens or fewer ending in "it", so every *"is X worth it"* question went to Otto
      at full price. **That is one of the commonest shapes in fitness.** Exempted `worth it`, the same way
      "do i have to" was already exempted as an obligation rather than a possession. Corpora unchanged.
      ⚠️ **ONE LESSON DOMINATED THE BUILD AND IS NOW RULE E IN THE FILE HEADER: there is no stemmer.**
      `covers` must list every word form. Four separate misses came from exactly this and NONE were visible
      from reading the answer, which looks complete and simply never fires: 'lifting' without 'lift',
      'eating' without 'eat', 'calories' without 'calorie', 'lifting' again in the dizziness entry. Time and
      unit tokens ('6pm', 'oz') count as content words too and must appear somewhere.
      ⚠️ **COUNT DROPPED 141 -> 138 FROM THREE MERGES, ALL FOUND WHILE WRITING TRIGGERS AND ALL THE SAME
      MISTAKE: two spec entries whose ANSWERS said the same thing.** "Is soreness necessary" + "what does
      soreness mean"; "what is a plateau" + "what do I do about a plateau"; "can I lose fat and build muscle
      at once" + "body recomposition". The house rule is explicit that near-duplicates are how the wrong one
      of hundreds gets returned. **Reading two answers side by side to write their triggers is what exposed
      it; reading them a category apart in the spec did not.**
      🔴 **A SHIPPED-CODE CHANGE CAME OUT OF THIS: `matchCanned` NOW TRIES THE WHOLE MESSAGE BEFORE SPLITTING
      ON "and".** It used to split first, so the IDIOM "can i lose fat AND build muscle at the same time" was
      cut in half and answered with a stitched "Two things:" reply to a single question.
      ✅ **SAFE BECAUSE OF AN EXISTING RULE:** `matchOne` rejects any answer that does not explain the WHOLE
      message, so a genuine two-part question still fails the whole-message pass and falls through to the
      split exactly as before. ✅ **VERIFIED against the corpora guarding the 183 live answers: A 71/71,
      B 22/22, C 30/30, stitching 2/2, all unchanged.**
      ✅ **`matchCanned` already takes the answer set as a PARAMETER, so the split needed no matcher change.**
      🔬 **NEW HARNESS: `functions/_general_cross.cjs`, committed.** Four checks, all currently ZERO/green:
      app questions reaching a fitness answer, fitness questions reaching an app answer, coverage of an
      unbiased corpus, and **internal collisions between general answers**.
      ✅ **ITS CORPORA ARE LIFTED VERBATIM OUT OF `_canned_audit.cjs`**, where they were written months
      earlier for the OPPOSITE purpose. That is the one thing hand-tuned triggers cannot be fitted to, which
      is exactly what made three earlier corpora worthless. It also exits 2 if its parser matches nothing.
      🔴 **TESTING AFTER 12 ANSWERS INSTEAD OF 141 PAID FOR ITSELF IMMEDIATELY.** Two structural faults were
      found that would otherwise have been baked into every one of the 141:
      1. **A quantity word was required on top of the topic** ("how much", "grams", "target"), so the
         PLAINEST phrasing anyone uses missed. "How do I lose weight" matched nothing. ➡️ **The topic is the
         discriminator and `excludes` is the collision breaker; the quantity word was doing no work.**
      2. **A three-part `requires` on the eat-around-training answer** demanded before/after, so "should I
         train FASTED" (which names no time) missed. ➡️ Food word + training word is the identifying pair.
      🔴 **AND A SILENT TIE CLASS THE PROBE CHECK COULD NOT SEE.** "What is a calorie deficit" matched BOTH
      the definition answer and the how-much-to-eat answer, so the matcher correctly refused to pick and a
      very common question went to Otto at full price. Same for surplus. **Ties look like nothing is wrong;
      they just quietly cost money.** Fixed with definition-shape excludes (`what is a`, `whats a`,
      `what does`, `define`, `mean`) on both size answers. **Found by testing real phrasings, not by the
      mechanical probe.**
      ⚠️ Historical, both checked before adding: `nav.membership` still uses `route: 'profile'` (lands on the
      Profile TAB), and `mission` is NOT the paywall, it points at `/mission`, the philosophy screen.
      ✅ **DECIDED 2026-08-08: THE BUTTON LABEL IS "See what Supporters get".** Rejected: putting "tap below
      to see all perks" in the message copy. Labels live once per route in `companionRoutes.ts`, so the
      label sells in every pitch without adding a word to any of the ~50 variants, and Justin's premium copy
      standard rules out narrating the UI.
      ⚠️ **A DELIBERATE BREAK FROM HOUSE STYLE.** Every other label is a plain destination name ("Goals
      settings", "Sleep", "Profile tab"). This one is benefit-phrased because its job is selling.
      ✅ **ALSO DECIDED: TWO POOLS, NOT ONE.** (A) the question needed their numbers -- name specifically
      what the plan reads ("your own intake across the week"); (B) we simply had no answer -- Otto says he
      is not sure rather than that he lacks a prepared answer. **Case A voice is APPROVED; case B is not
      landing yet after four drafts.**
      ✅ **AND ON A REPEAT MISS THE SELL ESCALATES, IT DOES NOT BACK OFF (Justin's call, reversing my
      recommendation).** Someone hitting the wall three times is the most engaged user in the app; that is
      the moment to make the case properly, not to go quiet.
      ✅ **ALL 33 LINES OF COPY ARE WRITTEN AND APPROVED (2026-08-08/09). THEY LIVE IN `SPEC_otto.md`,
      section "SUPPORTER-POINTED REPLY COPY" -- do not copy any of them back into this file.**
      24 case A tails (4 categories x 3, standard + Mindful) and 9 case B opener/closer combinations.
      That section also carries **the six voice rules it cost ~25 rejected drafts to find**, which are the
      most reusable thing to come out of this and must be read before writing any further Otto copy.
      🔴 **THE THIRD OUTCOME WAS JUSTIN'S CATCH AND IT IS LOAD-BEARING: A PURELY GENERAL QUESTION GETS NO
      PITCH AT ALL.** "How much protein should I eat" is answered and nothing is sold; only "am I eating
      enough protein" earns the tail. My framing had been "needs their numbers = pitch", which would have
      pitched on general questions too.
      ✅ **AND THE SIGNAL THAT SPLITS THEM ALREADY EXISTED:** `OWN_DATA_SIGNALS` in `ottoCannedMatcher.ts`
      literally contains `am i eating`. Built for a different job (stopping "how many custom foods do I
      have" matching the plan's LIMIT); no new work needed. It is a keyword list so it will miss phrasings,
      but **it fails toward NOT pitching**, which is the harmless direction.
      ⏳ **STILL UNWRITTEN: the escalated repeat-miss copy.**
      ✅ **THE LIBRARY ITSELF IS WRITTEN AND APPROVED 2026-08-09: 141 ANSWERS, in `SPEC_otto_general_answers.md`.**
      Do not copy any of them here. Nutrition, training, sleep and recovery, weight and progress, myths, gym
      practicalities, named diets, labels, drinks, consistency, injury prevention, population, goal setting
      and safety. **Verified mechanically: 141 answer lines, zero dashes of any kind.**
      🔴 **THE MOST IMPORTANT RULE THE DRAFTING PASS PRODUCED: NOTHING IN THE CRISIS-ADJACENT SPACE GETS A
      CANNED ANSWER.** `utils/faithCrisis.ts` matches `chest pain`, heart attack, stroke and seizure
      CLIENT-SIDE before the server is called. The danger is the phrasings it MISSES ("my chest hurts when I
      run" does not match): today those fall through to the AI, which carries the `[[CRISIS]]` instruction,
      but **a canned answer catching "chest hurts" would fire FIRST and hand a possible emergency a calm
      "see a doctor sometime" reply.** Chest pain deliberately has no answer; the dizziness answer must
      `exclude` chest and breathing terms.
      ⚠️ **AND THE SYSTEM PROMPT'S MEDICAL GUARDRAIL DOES NOT REACH A CANNED ANSWER**, since the model is
      never called. It is carried by hand in how each answer is written. ✅ Justin's call: **no new
      disclaimer text**, it is already in 25+ files including Otto's own prompt.
      ✅ **THE COPY SWEEP, DONE 2026-08-09 AND DEVICE-CONFIRMED. THE GATE MADE EXISTING COPY FALSE.**
      🔴 **OTTO'S GREETING WAS THE WORST OF IT, AND IT IS THE FIRST THING ANYBODY READS WHEN THEY OPEN HIM.**
      Two of the five randomly-chosen greetings said *"your numbers"* and *"how you're tracking"*, which
      invite precisely the question the coach gate now answers with the Supporter line. **A promise broken by
      the very next message.** Now split: three shared greetings (the app, and food/training/sleep, both true
      for everyone) plus the two data ones for Supporters only. Justin confirmed only the three appear.
      ⚠️ **`useMembership()` HAD TO MOVE UP THE COMPONENT.** The greeting is chosen in a `useState`
      initializer, which runs before any hook declared later in the body. Safe: it takes no arguments and
      depends on nothing in between, and React only requires hook ORDER to stay consistent.
      ✅ Also fixed: the Otto FAB callout (`AssistantOverlay.tsx`) said the same thing, and **four tutorial
      lines** promised "straight answers about your data" and "help with your numbers". Tutorials cannot
      branch on membership, so those now describe what is true for everyone.
      ➡️ **THE LESSON, AND IT IS THE ONE THIS PROJECT KEEPS RELEARNING:** the gate shipped and four other
      surfaces still described the old behaviour. **Checking before building the next thing is what found
      it** -- the planned next task was the escalated pitch line, which would have been polish on top of a
      false promise.
      ✅ **STEP 5 DONE 2026-08-09: THE COACH GATE IS LIVE. A FREE USER'S COACHING QUESTION NEVER REACHES
      THE AI.** Library hits answer it for zero; library misses get the Supporter line from
      `functions/src/ottoPitchCopy.ts`. **Coaching cost for free users is now zero, not reduced.**
      🔴 **AND THIS IS WHAT REFRAMES 4.15. COVERAGE STOPS BEING A COST QUESTION AT THIS LINE.** Below the
      gate the AI is never called either way, so the library's hit rate decides how often a free user is
      HELPED rather than SOLD TO. That is a product judgement now, not a spreadsheet one.
      ✅ **FAITH IS PROTECTED WITH NO CODE.** The gate sits inside the `ridersOnThisMessage.length === 0`
      block and the faith handoff is one of those riders, so a faith message can never reach it.
      ✅ **OWN-DATA QUESTIONS ARE GATED TOO** ("am i eating enough protein"). That call was pure waste:
      `FREE_TIER_BLOCK` tells a free Otto he has no logged food, training or averages, so he could never
      have answered it and we were paying for him to say so.
      🔴 **BUT ONLY WHEN THE ROUTER'S REASON IS `own-data`, AND THAT DISTINCTION WAS FOUND BY TESTING.**
      Gating on the matcher's verdict alone pitched **"how many custom foods do i have"**, which is a
      saved-item count and not coaching data. The router already separates them (`own-data` vs `app-term`).
      ⚠️ **FAILS OPEN:** the router sends roughly 4 in 18 fitness questions to the Support side and those
      still get an AI answer. Costs money, never costs the user anything. Correct direction for a wrong guess.
      ⚠️ **`pitched: false` DELIBERATELY.** The weekly pitch budget exists to stop Otto NAGGING; this is not
      a nag bolted onto an answer, it IS the answer. Spending a slot here would silence the spontaneous
      pitches the budget was built for.
      🔬 **NEW METER COUNTER: `cannedGated`.** `cannedGated` against `cannedHit` is the honest measure of how
      often a free user is sold to rather than helped, and it is the real count of conversion moments.
      🔴 **AND JUSTIN'S DEVICE TEST OF THE ESCALATION FOUND A HOLE IN THE GATE ITSELF, NOT IN THE COPY.**
      He asked three supplement questions in a row; only the FIRST was gated. "Is citrulline worth taking"
      and "is taurine worth taking" both reached the AI, so a free user got a paid answer to exactly the
      kind of question the gate exists to catch, and the escalation could never fire because there was only
      ever one gate.
      ⚠️ **CAUSE: `ottoCoachRouting.ts` only called something coaching-by-elimination at FIVE words.** Those
      two are four. "Is creatine worth it" worked only because 'creatine' happens to be a listed coaching
      word, and there are thousands of supplement names that are not.
      ❌ **A FLAT FOUR-WORD FLOOR WAS TRIED AND IS UNSAFE**, measured against the router's own corpora: it
      sent "what do you mean" and "help me out here" to a manual-less Otto, which is the single failure that
      router must never have.
      ✅ **SO THE TEST IS CONTENT, NOT LENGTH: four words qualify if ONE of them is not a function word.**
      'citrulline' passes, "what do you mean" does not. **All four router corpora re-run at 0 dangerous:
      COACH 59/59, APP 60/60, DATA 20/20, AMBIGUOUS 15/15.**
      ⚠️ The new `FUNCTION_WORDS` list has a safe direction and an unsafe one, stated in the file: adding a
      word makes a four-word message more likely to be treated as a fragment (costs money, harms nobody);
      leaving one out is the dangerous direction.
      ✅ **THE ESCALATION IS BUILT + DEPLOYED 2026-08-09.** First miss gets the opener/closer pair, the
      SECOND names the repeat and adds the price, the third and beyond drop the sales sentence entirely and
      keep only the button. **The count is read off the conversation the client already re-sends**, not
      stored: `countPriorGates` in `ottoPitchCopy.ts`. Verified by simulating the real round trip (token
      stripped, whitespace collapsed, fed back as history) rather than testing the pools in isolation.
      ✅ **OWN-DATA NEVER ESCALATES.** "I cannot see what you have logged" is true every time and repeating
      it does not make Otto look bad; only the "I do not know that one" case gets worse by repetition.
      ⏳ **STILL NOT BUILT: the CATEGORY-SPECIFIC case A tails.** The three shipped case A lines are
      category-neutral because serving the right tail needs a personal question mapped onto its general
      answer ("am i eating enough protein" -> the protein answer), which does not exist yet. The four
      category sets in `SPEC_otto.md` are written and waiting on that.
      ✅ **STEP 4 DONE 2026-08-09: THE LIBRARY IS WIRED IN.** `appCompanion.ts` now searches BOTH libraries.
      | message | free user | Supporter |
      |---|---|---|
      | fitness question | canned answer, **zero cost** | falls through to the AI |
      | app question | canned answer | canned answer |
      🔴 **THE FITNESS LIBRARY IS FREE-USERS-ONLY, and that is the opposite call from the APP library.**
      A Supporter pays for answers written against their own numbers, so a generic pre-written one is a
      downgrade, not a saving. The app library serves both because there the canned answer is EXACT and
      instant, so a Supporter gains from it.
      ❌ **THE HARD SPLIT WAS PROPOSED, MEASURED AND REJECTED THE SAME DAY.** The plan was to let
      `ottoCoachRouting.ts` pick ONE library. Measured: it sends **4 of 18 real fitness questions to the app
      side** ("is keto any good", "how do i stay consistent", "do detox teas work", "is bmi accurate") and 1
      of 8 app questions the other way. Splitting loses every one of those outright, ~20% of coverage, from
      a change meant to help.
      🔴 **AND THE REASON IS WORTH KEEPING: the router's "zero dangerous misroutes" record does not mean what
      it looks like here.** Dangerous there meant an APP question reaching a manual-less Otto. A fitness
      question landing on the Support side was harmless in THAT design and is fatal in THIS one. **Same
      measurement, different question being asked of it.** ➡️ Check what a metric was measuring before
      reusing it.
      ✅ **SO BOTH LIBRARIES ARE ALWAYS SEARCHED AND THE ROUTER ONLY BREAKS A TIE**, where it cannot cost
      coverage. Verified it calls both real leak cases correctly ("how much protein should i be eating" and
      "should i train fasted" both return coaching), so the fitness answer wins those.
      ✅ **RECONCILED 2026-08-09. 148/148 APPROVED ANSWERS ARE REACHABLE.** New harness
      `functions/_general_reconcile.cjs`, committed: it lifts every question heading out of
      `SPEC_otto_general_answers.md` and asserts each one matches something.
      🔴 **IT FOUND ONE APPROVED ANSWER THAT EXISTED ONLY IN THE SPEC AND NOBODY COULD REACH.** "Do I eat
      back exercise calories" was written, approved, verified against the code, flagged as belonging in the
      APP library rather than the general one, and then never moved. **An approved answer living only in a
      spec is invisible from every side**: the general library never had it, the app library never knew
      about it, and no other harness looks across that boundary. Now shipped as `con.eatbackcalories`
      (184 app answers), with the mandatory Mindful branch since net calories are hidden in that mode.
      🔴 **AND WRITING IT EXPOSED A GAP IN THE KB: EVERY SETTINGS SECTION STATED ITS PATH EXCEPT HEALTH.**
      Appearance, Faith & Style, Goals, Help, Notifications and Vacation Mode all had one. The staleness
      check refuses any answer naming a path the KB does not contain, so an answer about burn accuracy
      literally could not say where to go. **Not false, just absent, and the gap got filled** -- the same
      shape as the incomplete-KB failure on 2026-08-07.
      ⚠️ **A HIT IN THIS HARNESS PROVES ALMOST NOTHING and the file says so out loud.** The spec headings are
      the canonical phrasings the triggers were written against, so 148/148 is the minimum bar, not
      evidence. The honest numbers remain the holdouts: 75% terse, 26% conversational.
      ⚠️ **COUNT MOVED: the topic sweep estimated ~198, the library landed at 141.** Not skipped work
      (internal duplicates, three cut as near-duplicates of existing app answers, several topics collapsed),
      but **worth reconciling against the original sweep before calling it complete.**
      **OPEN, NOT DECIDED:** what the miss/pitch answer actually says; whether accuracy is protected by
      splitting the library in two and letting `ottoCoachRouting.ts` pick which half to search (proposed,
      unmeasured); and the exclusion list below.
      ✅ **MINDFUL VERSIONS DONE 2026-08-09: SEVEN, not the "~25" this file used to say.** That number was a
      guess; the audit is in `SPEC_otto_general_answers.md`. Mindful's rules cover deficit maths,
      weight-loss prescriptions and judgment language, and most of the library never touches any of them.
      ✅ **ESCALATED REPEAT-MISS COPY DONE**, 3 lines in `SPEC_otto.md`, price included in the line at
      Justin's call. 🟡 Third-miss behaviour still undecided.
      🔴 **HARD REQUIREMENT, JUSTIN 2026-08-08: DISORDERED-EATING-ADJACENT QUESTIONS GET A REAL, CARING,
      PRE-WRITTEN ANSWER -- NOT A NUMBER AND NOT A REFUSAL.** "How little can I eat", "how do I lose 20lb in
      a month". A pre-written target there is the app handing out a harmful number with no judgement in the
      loop. Routes to the existing undereating safeguard (item L) / crisis path. **Explicit exclusion list,
      never an oversight.** Same treatment for the 8 medical/safety topics, where canning is the SAFEST
      option precisely because it makes improvising impossible.
      ⚠️ **RISK TO WATCH IS COLLISIONS, NOT COVERAGE.** The matcher's zero-wrong-answers record was set on
      183 answers in ONE domain. At ~380 across two very different domains that record proves much less.
      ⚠️ Every answer needs the CLAUDE.md health disclaimer.
      ✅ **FAITH FAILS OPEN. DECIDED 2026-08-09.** A faith message with no app noun ("I'm struggling to trust
      God right now") lands on `coach-by-elimination` in `ottoCoachRouting.ts` and would otherwise be gated,
      so a free user opening up about their faith would be pitched. Against CLAUDE.md outright.
      ➡️ **THE RULE: the coach gate never fires on a message the faith handoff flagged, and when the faith
      check is UNSURE the message is treated as faith.** Faith fails open; everything else fails closed.
      🔴 **AND THE FRAMING OF THIS WAS WRONG FOR TWO MESSAGES UNTIL JUSTIN CAUGHT IT. "Otto answers it" IS
      NOT WHAT HAPPENS.** `FAITH_HANDOFF_BLOCK` instructs him: *"This one is Halo's, not yours. Do NOT answer
      it, do not give your own view, do not quote or paraphrase scripture."* He returns ONE fixed sentence
      pointing at Halo. **He never coaches on faith at all**, so failing open means "send them to Halo", not
      "let Otto answer".
      ⚠️ Detector measured ~81% (4b), so this covers the ~19% it misses. Costs almost nothing: Halo is ~3%
      of a free user's bill, and under 4.14 the handoff reply itself becomes free.

- [x] **4.14 ✅ BUILT + DEPLOYED 2026-08-09. THE FAITH HANDOFF IS SERVED DIRECTLY, WITH NO API CALL.**
      ✅ **JUSTIN WATCHED IT COST MONEY ON DEVICE FIRST.** His faith test returned the handoff sentence word
      for word at full price, which is the evidence this was worth doing.
      ✅ **THREE SENTENCES NOW DEFINED ONCE** (`FAITH_HANDOFF_TEXT`) and used twice: as the words the prompt
      orders the model to produce, and as the text served directly. Two copies of a sentence is two chances
      to drift, and the whole point is that the user sees the same words either way.
      ✅ **BUTTONS BY TIER, VERIFIED ON ALL FIVE CASES:** rooted and exploring get the Faith tab; **Not Right
      Now gets Settings > Faith & Style, NOT the Faith tab they do not have**; a repeat to a Not Right Now
      user gets **no button at all**, because the repeat variant exists precisely so somebody who opted out
      is not shown "here is how to turn her on" three times.
      ⚠️ **GUARDED SO IT CANNOT SWALLOW ANYTHING.** It fires only when the handoff is the ONLY rider on the
      message. Safeguard, workout cap or decline watch active and it goes the long way exactly as before.
      The guard is derived from the rider array, not restated as booleans, so a sixth rider counts itself.
      🔴 **AND THE WORDING IS NOW GUARANTEED, WHICH IS WORTH MORE THAN THE MONEY.** "Reply word for word" is
      an instruction to a MODEL, and on this project a prompt instruction has lost to the model's own
      inclination FOUR times now: Halo's two locked voice rules, Otto's no-guess rule inventing a limit, and
      the invented "supplement tracker" found the same day. A served string cannot paraphrase.
      (Original finding follows.)
      **THE FINDING.** When Otto hands a faith message to Halo he emits a HARDCODED sentence, but producing
      it costs a FULL AI CALL: he is billed to read his whole prompt and then output text we already wrote.
      ⚠️ **And the canned matcher is deliberately switched OFF when a faith handoff is riding** (PLAN 4.8
      wiring), so it can never catch this today.
      **THREE WINS, AND COST IS THE SMALLEST OF THEM:**
      1. **Zero instead of a full AI call.**
      2. 🔴 **GUARANTEED WORDING.** "Reply word for word" is an INSTRUCTION TO A MODEL, and on this project a
         prompt instruction has lost to the model's own inclination **three times** (Halo's two locked voice
         rules, 2.5; Otto's no-guess rule inventing a limit, 4.9). **A canned answer cannot paraphrase.**
         Nothing guarantees that sentence survives intact today.
      3. **A jump button.** The reply DESCRIBES where the gold cross button is and cannot take them there.
      **🔴 FOUR THINGS THAT MUST NOT BE MISSED:**
      1. **It is THREE replies, not one:** normal, Not Right Now, and repeat. `faithTier` is already in
         `CannedContext` so the first two are the existing branch pattern. **`repeat` is NOT and must be added.**
      2. **The ordering guard exists precisely to block this.** Inverting it for faith is a real change, and
         the thing to watch is the CAP rider: if this is their last message of the day, that warning must
         still get through.
      3. **THIS DOES NOT IMPROVE DETECTION.** The ~19% miss is a separate client-side check. Canning the
         reply and widening the detector are two different jobs and it would be easy to ship one and believe
         the other was handled.
      4. **Mixed messages** ("struggling with my faith and how do I log water") drop the app half today. A
         canned version behaves identically. Not a regression, but it becomes a deliberate choice.
      **🔘 BUTTONS, AND JUSTIN CAUGHT THE ONE THAT MATTERS:**
      | user | reply | button |
      |---|---|---|
      | Rooted / Exploring, first | "That one's Halo's rather than mine..." | `faith` (Faith tab) |
      | **Not Right Now, first** | unchanged: "...she's turned off on your account right now. You can turn her back on in Settings, under Faith and Style." | **`faith_style`, NOT the Faith tab** |
      | Rooted / Exploring, repeat | "Still Halo's area rather than mine." | `faith`, harmless |
      | **Not Right Now, repeat** | same | 🔴 **NONE** |
      ⚠️ **THE LAST ROW IS LOAD-BEARING.** The repeat variant exists so someone who opted out does not get the
      full "here is how to turn her on" line three times; the code comment calls it *"a sales pitch aimed at
      the one person who explicitly opted out."* **A faith button on every repeat quietly undoes that.**
      🔴 **A CODE CHANGE THIS EXPOSES: `route` is a PLAIN FIELD, not a function**, while `answer` can be a
      function branching on tier. So one entry cannot send two tiers to two destinations. Either two entries
      (which then collide on the same triggers) or `route` must accept a function. **Small, but without it
      the Not Right Now case cannot be built correctly.**

- [ ] **4.15 🔴 THE CANNED MATCHER COLLAPSES ON CONVERSATIONAL PHRASING, AND THIS AFFECTS THE 183 ANSWERS
      ALREADY SHIPPED. Found 2026-08-09. NOT FIXED: two designs were built, measured and reverted.**
      🔬 **THE MEASUREMENT.** A holdout written in a conversational register scored **7%**; the same
      questions asked tersely scored **69%**. Then the same test on the LIVE app library, same question
      twice each:
      | | terse | conversational |
      |---|---:|---:|
      | 183 shipped app answers | **5/5** | **1/5** |
      *"how do i change my theme"* hits. *"ive been meaning to ask how do i change the theme in here"* misses.
      🔴 **SO THE ~60% COVERAGE ON RECORD (4.8) WAS MEASURED ON TERSE PHRASING ONLY AND OVERSTATES WHAT REAL
      USERS GET.** Every corpus on this project is written "how do i X". Nobody had ever tested a
      conversational message against the matcher. **This has been shipping since 2026-08-07.**
      **THE CAUSE.** An answer is accepted only if it explains EVERY content word. Terse questions are
      nothing but topic words; conversational ones are mostly padding ("i keep hearing different things
      about...", "my mate says...", "i was looking for this earlier and..."), and no answer will ever list
      those words.
      ❌ **ATTEMPT 1: tolerate unexplained words unless one is another answer's single-word trigger.**
      Coverage 7% -> 35%. **Broke it: "how much protein should i be eating" returned the PRICING answer.**
      The money answer's `requires` contain "how much"; protein and eating were merely tolerated.
      ➡️ **The lesson worth keeping: a guard assembled from whatever happens to be in the same array is not
      a guard.** It was built from the library being searched, and the app library has no 'protein' trigger.
      ❌ **ATTEMPT 2: as above, plus "must explain at least as many words as it leaves unexplained".**
      Coverage 7% -> 22%. Killed the pricing leak, produced another: **"should i train fasted" returned the
      app's FASTING TIMER answer.** Cross-library collisions went 0 -> 3.
      ➡️ **BOTH REVERTED. Coverage bought with wrong answers is worth nothing**, and this is the one number
      that must never move. Everything is back to: app audit 71/71, 22/22, 30/30, 2/2; zero collisions.
      ⚠️ **DO NOT REBUILD THIS AT THE END OF A SESSION.** It is a real design problem (how much of a message
      must an answer account for?) and it needs its own pass with the must-not-match corpora as the target,
      not the coverage number.
      ➡️ **IT IS ALSO THE HIGHEST-VALUE OPEN ITEM ON 4.13.** A 137-answer library that only fires on terse
      phrasing is worth a fraction of what it was costed at, and the same is true of the 183 already live.
      ✅ **PARTIALLY FIXED 2026-08-09 ON THE THIRD ATTEMPT. CONVERSATIONAL COVERAGE 7% -> 18%, EVERYTHING
      ELSE CLEAN** (app audit 71/71, 22/22, 30/30, 2/2; zero collisions; zero wrong answers; zero leaks).
      🔴 **WHAT MADE ATTEMPT 3 WORK WHERE 1 AND 2 FAILED: IT RELAXES NOTHING.** Attempts 1 and 2 loosened the
      whole-message-explained rule and immediately returned wrong answers. This drops leading words and
      re-runs the **unchanged** strict matcher on the remainder, so whatever matches still has to explain
      its whole message.
      🔴 **AND THE RULE THAT CAME OUT OF IT: TRIMMING MAY RELAX WHAT AN ANSWER HAS TO *ACCOUNT FOR*. IT MAY
      NEVER RELAX WHAT AN ANSWER HAS TO *MATCH*.** The first cut of attempt 3 re-ran everything on the
      trimmed text and was wrong twice: *"where do i set my goal weight"* lost its "where do i" and matched
      the GENERAL goal-weight answer instead of the app one, because that answer excludes "where do i"
      precisely to prevent this and the exclusion never got to see it. Fixed by judging `requires` and
      `excludes` on the FULL message and only running coverage on the trimmed text.
      ❌ **A TWO-SIDED WINDOW VERSION WAS ALSO BUILT AND REVERTED.** Worth more coverage (18% -> 24%, and
      terse 70% -> 74%) and it broke the one rule that matters: **"whats the tip jar and how much protein do
      i need" came back answering only the tip jar.** Exactly the half-answered two-parter the strict rule
      exists to prevent.
      🔴 **THE SAME STRUCTURAL FLAW KILLED IT AS KILLED ATTEMPT 1, AND IT HAS NOW BITTEN THREE TIMES IN ONE
      DAY: the trigger guard is built from the library being SEARCHED.** Against the app library 'protein'
      is not a trigger, so the guard discarded it happily. ➡️ **A guard assembled from whatever happens to
      be in the same array is not a guard.** Fixing it properly means building the trigger set from BOTH
      libraries, which changes this function's signature and its callers.
      ✅ **THE WINDOW VERSION NOW SHIPS SAFELY. 7% -> 23% CONVERSATIONAL, 69% -> 74% TERSE, APP LIBRARY
      1/5 -> 2/5, AND EVERY SAFETY AND COLLISION NUMBER STILL ZERO.**
      🔴 **THE FIX WAS THE SHARED TRIGGER SET, AS PREDICTED.** `matchCanned` takes a fourth argument, every
      answer in BOTH libraries, used only as the trim's guard vocabulary. `appCompanion.ts` passes it and so
      does every harness. 🔴 **THAT LAST CLAIM WAS FALSE AND WAS FOUND 2026-08-09 -- see 4.16.** Two of the
      six harnesses never passed it. **The "whats the tip jar and how much protein do i need" leak is gone**, because
      'protein' is now a topic the guard can see even while the APP library is the one being searched.
      🔴 **AND THE THING THAT ACTUALLY UNBLOCKED IT WAS NOT THE CAP. STOPWORDS HAD TO BE EXCLUDED FROM THE
      GUARD.** Some answers legitimately use a common verb as a single-word trigger: **'ask', 'work' and
      'where' are all in there.** Treating those as topics meant the guard refused to discard the very words
      conversational padding is MADE of, so *"ive been meaning to ASK how do i change the theme in here"*
      could never be trimmed however high the cap went. A stopword carries no topic by definition, so
      discarding one cannot be discarding a topic. **Raising the cap 6 -> 10 alone changed nothing.**
      🔴 **A SAFETY EXCLUSION WAS SILENTLY BROKEN AND THE HOLDOUT CAUGHT IT.** The dizziness answer excluded
      `breath` and the matcher matches WHOLE WORDS, so **"i went dizzy and could not BREATHE properly" fired
      it** and would have returned a calm "sit down and rest" to somebody describing a possible cardiac
      event. One missing letter. Both safety answers now list every form, and
      🔬 **`_general_cross.cjs` GAINED A PERMANENT CRISIS-ADJACENT ASSERTION: 10 phrasings `faithCrisis.ts`
      does NOT catch, all of which must match nothing. Currently 0/10 matched. Add to that list, never trim it.**
      ✅ **AND THE TOLERANT PASS FINALLY SHIPPED, ON THE THIRD DESIGN. 23% -> 26% CONVERSATIONAL, 74% -> 75%
      TERSE, EVERY SAFETY AND COLLISION NUMBER STILL ZERO.** An answer may now leave up to four content
      words unexplained, but only words that are not a topic ANYWHERE in either library, and only if it
      explains at least as many as it leaves.
      ✅ **BOTH EARLIER LEAKS ARE BLOCKED BY CONSTRUCTION NOW**, which is why this attempt survived where
      1 and 2 did not: 'protein' and 'train' are topics the shared vocabulary can see, so the pricing answer
      and the fasting timer can never win those messages again.
      🔴 **AND IT CAUGHT A BUG IN THE GUARD ITSELF THAT IS WORTH MORE THAN THE FEATURE. THE GUARD MATCHED
      WORDS DIFFERENTLY FROM THE MATCHER IT WAS GUARDING.** It used Set membership; `has()` understands
      plural and gerund forms (`\bterm(s|es|ing|ed)?\b`). The app library registers 'notification', a user
      typed **"how do i stop NOTIFICATIONS at night"**, the guard saw no topic and the message matched the
      EATING LATE answer. ➡️ **Any guard that matches words differently from the thing it guards will leak
      exactly there.** Now shares `has()`.
      📉 **FULL 4.15 RESULT ACROSS THE DAY: conversational 7% -> 26% (3.7x), terse 69% -> 75%, app library
      1/5 -> 2/5, and zero wrong answers, zero collisions and zero unsafe matches throughout.**
      ⏳ **STILL NOT SOLVED, AND THE REMAINING MISSES ARE A DIFFERENT SHAPE.** "I make the same dinner every
      week is there a way to save it as a recipe" carries real content words in its padding ('dinner',
      'week') that are topics elsewhere, so neither trimming nor tolerance may discard them. **That is
      correct behaviour, not a bug** -- those words genuinely could belong to another question. Beating it
      needs the matcher to weigh which topic the message is ABOUT, which is a different kind of change.
      ➡️ **Do not attempt that without production phrasings (4.11a).** Four designs have now been measured
      here and the two that looked cleverest are the two that leaked.

- [x] **4.16 ✅ THE MEASURING INSTRUMENTS WERE AUDITED AND FIXED BEFORE 4.11(c) STARTED, 2026-08-09.**
      No app code changed and nothing was deployed. Found while taking a baseline, not by looking for it.
      🔴 **TWO OF THE SIX HARNESSES WERE NOT TESTING THE APP.** `_canned_holdout.cjs` and
      `_canned_holdout2.cjs` called `matchCanned` with THREE arguments, so 4.15's shared trigger vocabulary
      defaulted to the app library alone and the trim's guard could not see the general library's topics.
      **`_canned_holdout.cjs` was reporting two wrong answers that the real app does not produce**
      (*"is fasting good for fat loss"* -> `nav.fasting`, *"how do i log a recipe and is white rice bad"* ->
      `nav.recipe`). Verified against production arguments: both correctly decline. Now 54/54 and 22/22.
      ⚠️ **It failed in the LOUD direction this time. The same defect hides real leaks just as easily**, and
      these two files are the app library's only held-out corpora.
      🔴 **`_general_holdout2.cjs` COUNTED ANY MATCH AS A HIT.** Its own header calls its score "the only
      number in the whole build that means anything" and it had no expected answer ids, so **coverage bought
      with wrong answers would have read as a win** -- the precise failure 4.15 reverted two designs to
      avoid. All 74 now carry an expected id, chosen by reading the question against the library rather than
      by recording today's output, with `null` on five where more than one answer is genuinely defensible.
      🔴 **AND IT IMMEDIATELY FOUND ONE, PRE-EXISTING AND SHIPPED: *"i see people my age way further ahead"*
      returns `gen.age_recovery`**, which answers warm-ups and recovery between hard sessions to somebody
      who is discouraged by comparison. `gen.comparing` cannot fire: it lists "everyone else" and "compare
      myself" and not this shape. **Not dangerous, not fixed, awaiting Justin** -- fixing it is a library
      change, and adding a trigger to make one holdout sentence pass is the corpus-fitting this project has
      been burned by four times.
      ✅ **`_canned_audit.cjs` NOW EXITS NON-ZERO.** The primary audit always exited 0, including on a wrong
      answer or a broken assertion, so in a run of six harnesses a failure scrolled past silently. Every
      other harness already did this; the most important one did not.
      ✅ Both fixed files now refuse to report a score at all if a library fails to load (exit 2), and
      `_general_holdout2.cjs` refuses to run if an expected id does not exist in the library.
      📉 **CORRECTED BASELINE, and only one number moved:** app holdout 1 **54/54, 22/22, 0 wrong** (was 2
      phantom wrong); app holdout 2 **30/42 71%, 21/21, 0 wrong**; general holdout 1 unchanged; general
      holdout 2 **19/74 26%, 1 wrong (the one above), 0 leaks**; cross-library **0 collisions, 0 unsafe,
      0/10 crisis-adjacent**; audit **71/71, 22/22, 30/30, 2/2, 0 wrong, 0 assertion failures**.

- [~] **4.17 🆕 THE FREE-USER STOCK-TAKE, 2026-08-09. `_free_user_stocktake.cjs`, 318 questions through the
      REAL production path** (both libraries, the router tiebreak and the coach gate, copied from
      `appCompanion.ts` rather than assumed). **Every other harness measures one library in isolation**, so
      "coverage is 26%" and "coverage is 75%" were both true of different things and neither answered the
      only question that matters.
      | | answered free | **sold to** | reaches the AI |
      |---|---:|---:|---:|
      | app: corpus A (tuned) 71 | 100% | 0% | 0% |
      | app: holdout 1, 54 | 100% | 0% | 0% |
      | app: holdout 2, 42 | 71% | **10%** | 19% |
      | fitness: terse, 77 | 75% | **23%** | 1% |
      | fitness: conversational, 74 | 26% | **72%** | 3% |
      | **all 318** | **73%** | **24%** | **3%** |
      💰 **100 free-user questions cost $0.025 against $0.72 before the gate and the libraries, a 97% cut**,
      which is the 4.13 saving confirmed end to end rather than per-component.
      🔴 **AND IT FOUND A PRODUCT BUG THE COMPONENT TESTS COULD NOT SEE: FOUR APP QUESTIONS ARE SOLD TO.**
      A free user asking *"where do i change how many steps im aiming for"* or *"how do i empty out lunch"*
      gets pointed at the Supporter plan instead of being told where the setting is. The canned library
      misses them, and `routeCoachOrSupport` then calls them coaching, so the gate fires.
      ⚠️ **THIS IS A REGRESSION THE GATE INTRODUCED.** Before 4.13 those questions went to the AI and were
      answered correctly. 4.13 reasoned carefully about the router failing the OTHER way (a fitness question
      reaching the Support side still gets answered, so it fails open); **nobody checked an app question
      landing on the coach side, where it fails CLOSED.**
      ❌ **A FIX WAS PROPOSED, MEASURED AND REJECTED THE SAME HOUR. DO NOT REBUILD IT.** The idea was to
      exempt app how-tos from the gate using the matcher's own `isHowTo` regex, which already exempts them
      from the own-data refusal. **Against every corpus in the project it looked perfect: rescues 2, leaks 0
      coaching questions, costs $0.0045 per 100 questions.** That number was reported to Justin.
      🔴 **IT WAS WRONG, AND THE CORPORA ARE WHY. Twenty coaching questions written in how-to shape were
      then tried, and ELEVEN of them would have been freed straight to the AI**: *how do i build muscle*,
      *how do i get abs*, *how can i sleep better*, *how do i cut without losing muscle*, *how do i start
      lifting*, *how do i train for a marathon*. **A rescue of 2 bought with 11 leaks, and the leak is free
      AI coaching, which is the one thing the gate exists to prevent.**
      ➡️ **THE LESSON IS THE CORPUS, NOT THE REGEX. Every corpus on this project was written to measure
      COVERAGE, so not one of them contained an attack on the GATE.** "Leaks zero" meant "leaks zero of the
      cases we happened to have". Same family as the trigger guard built from the wrong array.
      ⚠️ **The obvious second idea is already dead too:** both the app questions and the coaching how-tos
      report `app=no-match, gen=no-match`, so "did an app answer nearly fire" cannot separate them either.
      🔒 **MADE PERMANENT: `_free_user_stocktake.cjs` now carries those 20 questions as a GATE INTEGRITY
      section and reports how many reach the AI. Today 6 answered free, 11 gated, 3 reach the AI** (the
      router's deliberate fail-open). **It is a number to WATCH, not to drive to zero** -- if it jumps after
      a change to the gate or the router, that change is handing out free AI coaching.
      ⏳ The other two (*"why is my burn already so big"*, *"is the navy body fat reliable"*) are NOT gate
      bugs: both have real app answers (`con.burned`, `con.navybf`) that the matcher failed to reach. They
      are ordinary coverage misses and belong to 4.15.
      ⚠️ **WHAT THE STOCK-TAKE CANNOT SEE, and it is written at the top of the file:** riders (so the faith
      handoff never reaches the gate, which is why faith stays free), crisis, and conversation history (so
      every message is treated as a first offence and the escalation copy is never exercised).

- [ ] **4.18 🔴 ITEMS E AND F (WORKOUT BUILDER, MEAL BUILDER) ARE THE LEAD SUPPORTER PERK ON FOUR USER-FACING
      SURFACES AND ARE TRACKED NOWHERE EXCEPT ONE TABLE ROW EACH SAYING "needs a full spec". THAT IS THE
      FINDING. Raised 2026-08-09.**
      🔴 **CORRECTED 2026-08-10, AND THE CORRECTION MATTERS BECAUSE THE ORIGINAL WAS ALARMIST AND WRONG.**
      This was first written up as "the Supporter page sells two features that do not exist", offering
      Justin a choice between building them and rewriting the copy. **Justin's answer: E and F are shipping
      before launch, and he was surprised anyone assumed otherwise.**
      ➡️ **So there is NOTHING WRONG WITH THE COPY. It describes the product being launched**, nobody has
      ever paid (RevenueCat, 2026-08-09), the tier is not on sale to the public, and if E and F ship as
      planned every word of it is true on day one. **Do not "fix" that copy.** The original framing is kept
      below only so the four surfaces stay listed in one place.
      ⚠️ **WHAT IS ACTUALLY TRUE IS NARROWER AND STILL WORTH ACTING ON: the copy is a cheque E and F have to
      cash before launch, and they are the least-tracked items in this file.** Every other Supporter perk is
      built and verified. These two are one row each in the section 6 table, with no spec, no rank in the
      queue, and no launch-blocker tag, while being the FIRST thing a user is told they get.
      ➡️ **NEXT STEP IS THE SPEC, not a copy change.** Both rows have said "needs a full spec" since
      2026-07-29.
      (Original writeup follows, kept for the four surfaces it names.)
      **`app/support.tsx`, the FIRST perk in the list**, whose own code comment says it goes first "because
      building things is now the actual reason to subscribe":
      > **Otto Gets To Work.** He works from everything you've logged, and **builds workouts into your
      > Workout tab and meals from food you actually eat.**
      **And `companionSystemPrompt.ts`, item 1 of the list Otto is told is COMPLETE:**
      > Otto builds things from what they have logged: workouts into their Workout tab, meals from food they
      > actually eat.
      🔴 **NEITHER IS BUILT.** Verified four ways, not assumed: the SUPPORTER OTTO table in `SPEC_otto.md`
      lists both as **NOT BUILT**; PLAN section 6 lists **E (workout builder)** and **F (meal builder)** as
      "needs a full spec"; `utils/companionWorkouts.ts` only ever READS `pj_workout_state`; and the only
      tokens Otto can emit are `[[stat:` and `[[route:`, so **there is no write path from a conversation
      into the app at all.**
      ⚠️ **THE PROMPT SAYING IT CONTAINS THE RULE AGAINST IT, ONE LINE BELOW.** *"Naming a feature that does
      not exist is a false claim about something people pay for."* Item 1 of the list it is guarding is that
      false claim, so the rule cannot save us: Otto is not hallucinating here, **he is being told to say it.**
      🔴 **AND IT IS THE LEAD PERK ON BOTH SURFACES**, not a footnote, so it is the main reason a user is
      given to pay.
      ✅ **NOBODY HAS BEEN CHARGED FOR IT.** RevenueCat confirmed 2026-08-09 that no one has ever paid, and
      all 11 TestFlight testers are comped Supporters. **The exposure is entirely in front of us**, which is
      exactly why this has to be settled before launch and not after.
      ✅ **RESOLVED 2026-08-10: OPTION 1 WAS ALWAYS THE PLAN.** E and F ship before launch, so the copy
      stands and the work item is the SPEC. Option 2 (rewriting the copy) is recorded as considered and
      rejected, and must not be revived while E and F are still on track.
      ⚠️ **THE FOUR SURFACES ARE LISTED HERE FOR ONE REASON: if E or F ever slips past launch, all four have
      to change together, and Otto's is the one that gets quoted back at us because users ask him what the
      plan includes.** `app/support.tsx` (lead perk), `functions/src/companionSystemPrompt.ts` (item 1 of
      the list he is told is complete), `app/onboarding/all-set.tsx`, and `components/FirstWeekEndedModal.tsx`
      (which frames it as something they LOSE on day 8).
      ⚠️ **NOT FLAGGED ANYWHERE BEFORE TODAY.** Zero mentions in any doc. Both halves were individually
      correct in their own file (the perk copy read as a description, the specs read as a build list) and
      nobody had put them side by side. Same shape as every other drift found today.

### 4b. 🆕 OTTO HANDS FAITH CONVERSATION TO HALO -- ✅ BUILT + DEPLOYED 2026-08-05
**Not a cost item.** A product-correctness bug found during the 2.2 verification check. Kept separate on
purpose so it does not hide inside the cost work.

**WHAT WAS WRONG.** A Not Right Now user asked Otto *"is it okay to pray about lust?"* and got a full
pastoral answer: no handoff, no mention of Halo, spiritual framing that presumed belief. **That is a
violation for EVERY tier** -- Otto was never meant to counsel anyone about prayer.
🔴 **AND THE RULE WAS ALREADY THERE, STATED PLAINLY.** The base prompt says *"Faith conversation, Bible
study, prayer, and spiritual guidance are Halo's, not yours."* It could not have been clearer and he
ignored it. **Strongest confirmation yet that a rule Otto must ACT on cannot live in the system prompt.**

**THE FIX.** `utils/companionFaith.ts` detects a faith conversation on the CLIENT; the handoff block rides
on the USER'S MESSAGE (`buildFaithHandoffBlock`), the same mechanism as the pitch, the cap and the
undereating safeguard. The tier tails and base prompt were strengthened too, but only as a fallback for the
misses -- they are not the mechanism.

**MEASURED, THREE DRAFTS:**
| | draft 1 | draft 2 | **final** |
|---|---:|---:|---:|
| **App help wrongly blocked** (must be 0) | 19 | 6 | **0 / 64** |
| **Wellness wrongly blocked** (must be 0) | 2 | 0 | **0 / 77** |
| Faith caught | 42/57 | 39/57 | **46/57 (81%)** |
➡️ **The structure that worked: an app question needs a SHAPE *and* a TARGET.** Draft 2 matched a bare
"how" or "where" anywhere, which fixed the app-help problem and then swallowed *"how do you even pray"*.
➡️ The 11 misses all contain **no religious word at all** (*"why do i feel guilty when i rest"*,
*"what happens after we die"*). Most read as wellness questions Otto should answer. **Misses cost one warm
answer; false alarms cost app help. Fail on the miss side.**

**DECISIONS (Justin, 2026-08-05):**
- Otto gives **no faith answer at all**, for any tier. Acknowledge and hand off, nothing more.
- **App how-to about faith features stays with Otto** -- prayer requests, the verse card, reading plans, the
  gratitude card, turning faith features off. He is the app guide and the Faith tab is part of the app.
- A message that is BOTH hands off. ⚠️ Measuring overrode this in practice: the combined rule made the
  guard leaky and cost 19 app answers, so the app shape now wins outright. Rare case, cheap either way.
- 🆕 **Halo IS named to Not Right Now users**, reversing the old "never point them to Halo" rule. That rule
  existed to avoid a dead END, not to hide her. Naming her, saying she is switched off, and giving the path
  is honest, creates intrigue, and says nothing about belief. CLAUDE.md is explicit that the app does not
  hide or apologise for its faith identity.
- **Once per conversation.** Otto has no memory, so without a client-side flag a person asking three faith
  questions gets the full "here is where to turn her on" line three times -- a sales pitch aimed at the one
  person who explicitly opted out. Same `useRef` pattern as the Supporter pitch.

⚠️ **COPY CORRECTED ON THE WAY:** the first draft said Halo is "on the Faith tab" and the base prompt said
"the gold cross button in the app". She is a floating gold cross FAB rendered on the **Faith tab and the
Bible reader** (`CompanionFAB.tsx`). Both now say "the gold cross button on the Faith tab".

✅ **DEVICE-VERIFIED 2026-08-05, all three paths.** Not Right Now returned the NRN copy word for word; a second faith question returned the short repeat line; "how do I add a prayer request" was answered normally AND Otto worked out unprompted that faith features would need turning on first, which is better than the scripted behaviour. Rooted/Exploring confirmed separately.
      (original check: ask Otto a faith question on each tier.) Rooted/Exploring should point at
the gold cross; Not Right Now should name her, say she is off, and give the Settings path. Ask twice to
confirm the second reply is the short "Still Halo's area" version.

### 5. THE DIALS -- move these out of code and into a Firestore settings doc
Read per call, changeable without an App Store update.
| Dial | Visible to the user? |
|---|---|
| Otto free daily cap | 🔴 **YES** |
| Halo free daily cap | 🔴 **YES** |
| Cache TTL (5-min / 1-hour), all features | No |
| Which model each feature uses | No |
| Whether the manual is attached (Coach/Support split) | No |
| Canned answers on/off, and the question list | No |
| Reply length ceilings | Barely |
- [ ] **5.1** Build the settings doc + the read path.
- 🔴 **THE RULE: tighten the invisible dials freely, never tighten the visible ones.**
  Launch the caps LOW and plan to RAISE ("we've increased your daily messages" is a good thing to send).
  If a cap ever must tighten, **grandfather** existing users. **Never print a cap number in marketing copy** --
  a counter saying "3 left today" is a status; "5 messages a day" on a website is a promise.

### 6. THE PRE-EXISTING PLAN (items A-O, set 2026-07-29)
⚠️ **Still live. Not superseded by the cost work.** Full detail: `project_j_roadmap.md` line ~1722.
| | Item | Status as recorded |
|---|---|---|
| A | Otto open items | ✅ complete 2026-07-30 |
| B | Otto free/paid split | direction locked, prompt/KB work outstanding |
| C | Non-AI walls / paywalls / limits | ⚠️ header says NOT COMPLETE, but the 2026-08-03 commit says closed after audit. **Verify before trusting either.** |
| D | 7-day taste | 🔴 **THIS ROW WAS WRONG. CORRECTED 2026-08-05 by Justin, who said he was "almost certain it is fully built" and was right.** `FirstWeekEndedModal.tsx` exists and is wired into `app/(tabs)/index.tsx`. It said "specced not built" and I quoted that back at him as an unbuilt conversion lever. **Verify what remains on it before planning around it.** |
| E | Workout builder | 🔴 **DECISIONS BELOW THIS TABLE (2026-08-10). Spec not written yet.** |
| F | Meal builder | needs a full spec |
| G | Calorie floor | ✅ complete + device-verified 2026-08-03 |
| H | Cost routing | ⏸️ **PARKED** -- measured 73% fallback + 57 cache entries. See `SPEC_otto_routing.md` |
| I | Exercise editor | new, not started |
| J | Expand exercise library (79 -> ~143) | new, not started |
| K | Lift-name aliases | new, not started |
| L | Undereating safeguard | ✅ complete + device-verified 2026-08-03 |
| M | Dietary restrictions / allergies | ✅ complete + device-verified 2026-08-04 |
| N | Launch-modal priority | ✅ complete + device-verified 2026-08-04 |
| O | Smart Coach cost pass | ➡️ **SUPERSEDED by section 1 of this file.** Item O's numbers were wrong. |

#### 🏗️ ITEM E (WORKOUT BUILDER) -- DECISIONS TAKEN 2026-08-10. NOT A SPEC. Justin's calls, recorded as made.
⚠️ **WRITTEN DOWN BECAUSE THE LAST TIME THIS WAS DISCUSSED IT WAS LOST.** Justin, 2026-08-10: *"ugh this was
discussed before but i guess wasnt saved."* Decisions land here the moment they are made, spec or no spec.

**1. WHERE A BUILT WORKOUT GOES. Three destinations, in order.**
   a. Any genuinely new movement becomes a **custom exercise in the library** (`LibraryExercise`).
   b. The workout itself is saved as a **custom routine** (`Routine`, `pj_routines`, the "My Routines" list).
   c. It is then placed on **a specific day the user agrees to: today or a future date.**
   ✅ **ALL THREE MECHANISMS ALREADY EXIST**, which makes E far smaller than its table row suggested. The
   library already creates custom exercises and routines, and the Workout tab already has a **"Load to N
   Days"** picker with this-week / next-week navigation and past days disabled. Otto drives existing flows
   behind a preview; he does not need new machinery, and what he produces is an ordinary routine and an
   ordinary exercise the user can edit or delete like anything they made themselves.
   ❌ **THE WEEKLY TEMPLATE IS OUT OF SCOPE.** Nothing recurring, nothing that quietly changes every Monday.
   `programs[dateKey]` only.

**2. WHICH EXERCISES HE MAY USE. The default is the library, and the escape hatch is the user.**
   - Unprompted ("build me a chest and bicep workout") he picks **only from the existing library**.
   - He may go outside it **only when the user names a movement themselves** ("include decline bench press
     and low cable flies").
   🔴 **WHY THIS IS THE RIGHT RULE AND NOT JUST A CONSERVATIVE ONE:** Otto never invents a movement on his
   own initiative, so a near-duplicate can only ever appear when the USER typed the name, which is exactly
   the moment they know what they meant. It makes the duplicate problem rare and self-limiting instead of
   systemic.

**3. HE MUST WRITE THE LIBRARY'S EXACT NAME, NEVER HIS OWN PHRASING. This one is load-bearing.**
   🔴 **PRs are keyed by `normalizeLiftName` in `utils/liftPR.ts`, which is trim + lowercase + collapse
   spaces AND NOTHING ELSE.** So *"Decline Bench"* and *"Decline Bench Press"* are two different exercises,
   and so are *"Low Cable Fly"* and *"Low Cable Flies"* -- there is no plural handling. **Any wording
   difference splits the user's lifting history in two, silently.**
   ➡️ So the app hands Otto the **actual library names** and treats anything off-list as a NEW exercise
   rather than a guess. **Identical pattern to the 22 muscle keys already specced for this feature**, where
   the app supplies the valid list and drops anything not on it. Checkable in code, not a rule he has to
   remember. See [[feedback_harnesses_cannot_see_the_model]]: a prompt rule has lost to the model five times.

**4. THE PREVIEW IS INLINE IN THE CHAT AND REVISABLE BY TALKING.** He shows the workout in the conversation;
   the user can add, remove or swap by replying. Accepting is still the confirmation (the locked E constraint
   further up this file), so nothing is written until they agree.
   ⏳ **OPEN, FLAGGED NOT SOLVED:** a draft revised over several turns has to survive across them, and Otto's
   history is capped at 12 turns (4.5, measured, deliberately left at 12). Mechanics question for the spec.

**6. HE MERGES INTO A DAY, HE NEVER REPLACES IT. Justin's call, and the app already agrees with him.**
   *"if i have a couple cardio or core exercises in there, then want otto to add a lift routine, then i
   wouldnt want him removing what i have in there already, right?"*
   🔴 **THE EXISTING "LOAD TO N DAYS" FLOW REPLACES THE DAY'S EXERCISE LIST WHOLESALE AND ASSIGNS FRESH IDS.
   OTTO MUST NOT REUSE THOSE SEMANTICS.** That flow means "make this day BE this routine", which is a
   different verb from "add this workout".
   ✅ **MERGING IS ALREADY THE APP'S OWN CONVENTION:** when Apple Health imports a workout it MERGES into the
   day and dedupes by UUID (`app/(tabs)/workout.tsx`). Replacing would make Otto the odd one out.
   🔴 **AND REPLACING HAS A CONCRETE COST, NOT JUST AN AESTHETIC ONE: AN IMPORTED APPLE SESSION LIVES AS AN
   EXERCISE IN THE DAY**, carrying `fromAppleHealth` and `appleHealthUUID`. Wiping the exercise list deletes
   that session, loses its heart-rate link (fetched by UUID) and drops it out of the dedupe set that stops
   it being re-imported. Logged sets are keyed by exercise id, so fresh ids orphan them too.
   ➡️ **Merge by default, always. Replace only if the user explicitly asks, offered in the preview, never
   the default.** See CLAUDE.md's data-integrity rule: read-then-merge, never replace from scratch.

**7. APPLE WATCH LINKING IS UNAFFECTED, VERIFIED NOT ASSUMED.** An Apple strength session lands as its own
   entry in the day alongside whatever Otto put there, and the app pulls its HR by UUID. Otto's routine is
   ordinary exercises in an ordinary day, so nothing changes. ⚠️ **The only thing that would break it is
   replacing the day's exercises, which decision 6 rules out. The two decisions protect each other.**

**8. SUPERSETS: NEVER UNPROMPTED, OFFERED IN THE PREVIEW. ✅ Justin, 2026-08-10 ("A to D is fine").**
   The data model supports them (`supersetGroup`; consecutive lifts sharing the id render as one block) and
   grouping is two taps and fully reversible, so this was a taste decision rather than a risky one.
   - **He supersets when ASKED and never on his own initiative.** ⚠️ Note **zero preset routines or programs
     use supersets** -- nothing the app ships demonstrates one, so volunteering them would introduce a
     training style the app itself does not.
   - **Discoverability comes from the PREVIEW offering the pairing as a one-tap option**, not from Otto
     imposing it.
   ❌ **REJECTED: "a narrow rule, accessories only, never main compounds."** It sounds tidy and it is the
   weakest option available, because it depends on the model applying a nuanced judgement every time and the
   failure is silent. **A prompt rule has lost to the model five times on this project.** The chosen design
   needs no rule Otto can forget: the app asks, not him. See [[feedback_harnesses_cannot_see_the_model]].
   ⏳ **LATER, NOT NOW: mirror the user's own history** -- if their routines already use supersets he may,
   if they never have he does not. Better long-term answer, it is a FACT the app hands him rather than a
   judgement (the muscle-keys pattern, which is the one that holds here), and it slots in without changing
   anything: it only decides whether the preview bothers offering.

**9. 🔴 THE PREVIEW IS ONE SCREEN WITH ONE PRIMARY ACTION. IT IS NOT A QUESTIONNAIRE. Justin, 2026-08-10:**
   *"i just want to be sure user isnt being asked 50 questions when trying to build a workout or meal."*
   ⚠️ **THIS IS A CONSTRAINT ON EVERY DECISION ABOVE AND ON THE MEAL BUILDER (F) TOO.** Three separate
   "ask in the preview" moments had accumulated across decisions 5, 6 and 8, and stacked as a sequence they
   would be exactly the interrogation he is describing.
   ➡️ **They are OPTIONS VISIBLE ON THE PREVIEW, not questions asked in turn.** In the ordinary case the
   user is asked **nothing**: request a workout, look at it, tap Accept.
   - Merge is the DEFAULT, so it is never a question.
   - The superset is a tappable suggestion, not a prompt.
   - The duplicate-name check appears **only** when the user personally named a movement that resembles one
     they already own, which is rare and is precisely when they would want to be asked.
   ➡️ **Any future addition to this feature must justify itself against this rule.** If it adds a question,
   it needs to earn it or become an inline option.

**10. 🔴 ITEM J NOW BLOCKS ITEM E. SEQUENCING CHANGED 2026-08-10.** J was always "the cheapest way to make
   the workout builder safe"; it turns out to GATE it. **The library has no bodyweight exercises at all** --
   J's own justification says *"there is no PUSH-UP... nothing bodyweight at all, so anyone training at home
   has almost nothing to pick from."* So Otto literally cannot build a home workout today. **Build J first.**
   ✅ **J's instruction-writing is visible work, verified:** `instructions` render in two places in
   `app/workout-library.tsx`. Not wasted effort.

**11. EQUIPMENT: SEVEN TICKS, FILLED BY A LOCATION PRESET, TAGGED ON THE LIBRARY. ✅ Justin, 2026-08-10.**
   **Dumbbells · Barbell · Squat rack · Bench · Cables · Machines · Pull-up / dip bar**, plus one
   **cardio equipment** tick.
   🔴 **WHY EQUIPMENT AND NOT LOGGED HISTORY, WHICH WAS PROPOSED FIRST AND WAS WRONG.** The suggestion was
   that Otto infer available kit from what the user has logged. **Justin killed it with two cases:** a brand
   new user has nothing logged, and somebody who only does cardio has a history saying "no lifts", which is
   silence rather than information. **History says what someone HAS done; it cannot say what they CAN do.**
   ✅ **Counted, not guessed:** of 78 library exercises, 19 need a machine or cable (10 cable, 8 machine,
   1 rowing machine); only **3** need a rack (bench press, incline bench, barbell squat) while 6 more need
   only a barbell, which is why rack and barbell are SEPARATE ticks; pull-up bar gates 3 and dips 2, so they
   share one tick.
   ❌ **NO PER-MACHINE TICKS.** Only 8 exercises hang off the whole Machines tick, so a wrong suggestion is a
   one-tap swap in the preview, not a data problem. Twenty checkboxes to avoid that is a bad trade.
   ❌ **NO SEVEN CARDIO TICKS EITHER.** One cardio tick; when Otto needs to name a machine he uses one the
   user has actually logged, otherwise he names none and says "cardio, your pick".
   ✅ **The tags can ride the EXISTING enrich-on-load migration** (`app/workout-library.tsx` ~2145), which
   already patches library entries with new fields using `e.field ?? def.field` and therefore never
   overwrites a user's own edit. No new migration to invent.
   ⚠️ **TAG WHILE ITEM J HAS THE FILE OPEN.** J adds ~64 entries to the same file; tagging separately later
   is pure duplicated effort.

**12. WHAT ITEM J SHIPS CHANGES, DECIDED 2026-08-10 WHILE SIZING THE EQUIPMENT TICKS.**
   ❌ **CUT from J's "FULL BODY / FUNCTIONAL" section** (the roadmap already flagged it as the easiest to
   cut): **sled push, battle ropes, medicine ball slam, Turkish get-up.** Each needs equipment almost nobody
   has, and cutting them avoids adding ticks for one exercise apiece. Users can still create them by hand.
   ✅ **KEPT: burpee and thruster** (no equipment), and **kettlebell swing** -- Justin: *"that is common
   enough i see people use those like daily."* ➡️ Tagged **"dumbbell or kettlebell"** rather than earning an
   eighth tick, since swings and goblet squats work with either. Revisit if kettlebell work grows.
   ✅ **KEPT: Smith Machine Bench Press.** One exercise today, so folded under the **Machines** tick rather
   than its own; any gym with machines has a Smith. Splits out later if more Smith variants are added.
   ✅ Trap bar and landmine tag as **barbell** rather than inventing a tick each.

**13. NO RULE ABOUT BODYWEIGHT AT A FULL GYM, DELIBERATELY.** Pull-ups, chin-ups and dips are among the best
   movements available and belong in a gym back or arm day; nothing changes about them. The only odd
   outcome would be push-ups on a full-gym chest day, which is a one-tap swap in the preview.
   🔴 **DO NOT WRITE OTTO AN INSTRUCTION FOR THIS.** Every nuanced judgement rule given to the model on this
   project has eventually been ignored, silently. Watch what he actually produces on device and add a
   constraint only with evidence. See [[feedback_harnesses_cannot_see_the_model]].

**14. A "HOME WORKOUT" REQUEST OVERRIDES THE PROFILE, AND ASKS NOTHING.** The equipment profile is a DEFAULT,
   not a lock. *"Make me a home workout"* means bodyweight only; if they have kit at home they say so in the
   request or fix it in the preview. Predictable beats clever, and it respects decision 9.

**15. 🆕 NEW WORK ITEM: THE CREATE / EDIT EXERCISE FORM NEEDS AN UPGRADE. Justin, 2026-08-10.** Not part of
   E's core loop but it lands in the same area and E adds a reason for it.
   **Today the form collects FOUR things: name, type (lift/cardio), one required tag, an optional note.**
   ✅ **ONE FORM, NOT TWO** (Justin asked): the "Create new exercise" link inside the Create Routine modal
   only adds a movement to THAT routine and never writes to the library. Create and Edit share the modal.
   ➡️ **What it needs:** instructions and primary/secondary muscles (currently **no user can view or edit
   either through the UI at all**, on their own exercises or the built-ins), the optional equipment field
   from decision 11, and a visual polish pass. Justin: *"its so plain now."*
   🔴 **THE TRAP TO DESIGN AROUND: `saveExercise` does `{ ...ex, ...form }`.** Today that is safe only
   BECAUSE the form has no instructions or muscles field, so editing a built-in cannot wipe its curated
   content. **Add those fields naively and an empty input overwrites a built-in's instructions with blank.**
   Read-then-merge, never replace. See CLAUDE.md's data-integrity rule.
   ⚠️ **UNSET EQUIPMENT MEANS "AVAILABLE ANYWHERE", AND JUSTIN'S CONDITION IS THAT THIS MUST BE OBVIOUS** in
   the form, not implied.
   🔴 **AND THE REASON THE FIELD EXISTS AT ALL, because the first answer here was wrong.** The argument was
   "if you created the exercise you can evidently do it, so no field is needed". **Justin pushed back and he
   was right: that is true about the PERSON and blind about the PLACE.** Create "Hack Squat" at your gym,
   ask for a home workout two weeks later, and an untagged exercise is "available anywhere". The person most
   likely to create custom exercises is exactly the person who also trains at home, so it is the main case
   rather than an edge one.
   ✅ **Otto always tags the equipment on exercises HE creates**, from the valid list, exactly like the 22
   muscle keys. No UI involved. The optional field only ever concerns hand-made exercises.

**16. HE CAN BUILD A WEEK OR A MONTH, AND A MONTH IS THE SAME WEEK REPEATING. ✅ Justin, 2026-08-10.**
   A **program** in this app is a 7-day SHAPE with `exercises: []` on every day (`PresetProgram` in
   `workoutData.ts`), so the three layers are: program = the shape of the week, routine = a named set of
   exercises, day = a dated day with real exercises in it. **"Build me a month" = one 7-day shape, a
   DISTINCT routine per training day, repeating for four weeks.** What changes week to week is the weight on
   the bar, which the user supplies.
   ✅ **SHORTCUT WORTH TAKING: the app already ships Push/Pull/Legs and Upper/Lower as `PRESET_PROGRAMS`.**
   "Decide together on a split" can mean Otto recommends an existing shape and only generates the routines
   to fill it. Less invention, less to review.
   ❌ **REJECTED: four weeks that progress on their own** (volume creeping, a week-4 deload). Otto would be
   making progression calls without knowing how the sessions actually went. Revisit once real logged data
   can drive it.
   ⚠️ **THE REVIEW BURDEN IS THE REAL COST, NOT THE BUILD.** One routine is a glance; a 4-day split is four
   routines to read before anything can be accepted. **Decision 9 (one screen, one action) has to survive
   this** -- design the single-routine preview first and learn from it on device.

**17. 🔬 RESEARCHED AT JUSTIN'S INSISTENCE, AND THE FIRST ANSWER WAS TOO ABSOLUTE. 2026-08-10.**
   The claim made here was "repeating the same routine is simply correct". Justin asked for that to be
   checked rather than trusted. **The evidence says systematic variation beats BOTH extremes.**
   - **Random weekly rotation HINDERS adaptation** -- constant relearning of motor patterns and redundant
     stimulus. So shuffling exercises every week, the thing that sounds smarter, is the harmful end.
   - **Never changing anything indefinitely is also suboptimal.** The common structure is emphasising a set
     of exercises for **2-3 mesocycles (a mesocycle is 4-8 weeks)** and then rotating.
   - Running identical exercises and adding ~2% to the bar is enough on its own to drive new adaptation.
   ✅ **SO A FOUR-WEEK REPEAT SITS COMFORTABLY IN THE MIDDLE OF THE EVIDENCE.** Decision 16 stands, now on
   a researched basis rather than an asserted one.
   ✅ **AND IT IS RIGHT FOR THIS APP SPECIFICALLY:** PRs key off the exercise NAME (`normalizeLiftName`) and
   "you vs yesterday" compares a lift to the last time it was done. Weekly rotation would scatter history
   across dozens of movements and quietly starve the app's core mechanic.
   📚 Sources: systematic review, PubMed 35438660 and J Strength Cond Res 2022;36(6); plus mesocycle
   periodization guidance. **If this is ever restated, cite them -- it is a health claim in a health app.**
   🆕 **FUTURE FEATURE FALLING OUT OF THE RESEARCH, NOT FOR NOW:** after 2-3 months on the same block a
   change is warranted, so the app could notice a program has gone stale and offer to refresh it.

**18. OTTO MUST BE ABLE TO EXPLAIN THE REPETITION, AND MUST VARY IT ON REQUEST. Justin's condition on 16.**
   - *"Why are my workouts the same every week?"* is a GENERAL FITNESS question, so it belongs in the
     **137-answer general library** (4.13): free, instant, zero AI cost. The answer is that you repeat
     movements so you can add weight to them, and if the exercises change every week there is nothing to
     beat. ⚠️ **It must not be phrased as a limitation of the app.** See [[feedback_premium_copy_voice]].
   - **If a user says they do not want the same thing every time, he varies it. No argument.** Preference
     wins; the research objection is to random weekly churn, not to variety as such. The preview already
     supports swapping, so this needs no new mechanism.
   🟡 **NAMING, Justin's stated direction 2026-08-10, recorded as direction rather than locked because he
   hedged ("idk"):** Otto names the routine from sensible generic templates ("Push A", "Chest & Triceps")
   and the user can rename it whenever, exactly like a routine they made themselves. **No question asked at
   build time**, per decision 9.

**5. NEAR-DUPLICATE WORDING IS SETTLED AT THE PREVIEW.** When a user-named movement looks like an existing
   library entry, the preview asks once ("this looks like your Incline Bench Press, use that?"). It costs no
   new UI because the confirmation step already exists, and it puts the judgement on the person who knows
   what they meant. This is the practical stand-in for item K (lift-name aliases), which is unbuilt.

### 7. NOT AI, AND BIGGER THAN MOST OF THIS
- [~] **7.1 Apple Small Business Program.** ⚠️ **APPLIED TWICE, NO RESPONSE** (2026-07-13 and 2026-07-29,
      both confirmed received). **NOT a to-do for Justin to start -- do not recommend enrolling again.**
      ✅ **CONTACTED 2026-08-05 via Agreements and Contracts. APPLE REPLIED 2026-08-07, case
      20000129383326** (Akhilesh, Developer Support). ⚠️ **THE REPLY IS NOT "KEEP WAITING", IT IS A
      CONDITIONAL, AND IT CONFIRMS WE ARE STILL NOT ENROLLED.**
      ➡️ **IF** a confirmation email titled *"We've received your request to join the App Store Small
      Business Program"* exists, the application is queued and waiting is correct. **IF NOT, the application
      never registered** and must be resubmitted at developer.apple.com/app-store/small-business-program.
      ✅ **BOTH VERIFIED BY JUSTIN 2026-08-07 AND BOTH ARE CLEAN.** The two confirmation emails EXIST, so the
      applications did register. The Paid Apps agreement (Schedule 2) IS active in App Store Connect.
      ➡️ **SO THE DELAY IS ON APPLE'S SIDE.** Both plausible self-inflicted causes are ruled out; do not
      re-check them.
      ⚠️ **AND THERE IS NO CONTRADICTION IN APPLE'S REPLY, despite how it first reads. Justin caught this.**
      "You aren't currently participating" and "our teams will contact you after they complete your
      application review" describe the SAME state: applied, in review, not yet enrolled. Do not write to
      Apple claiming their message contradicts the confirmation emails, because it does not.
      ➡️ **THE ONLY REAL LEVER IS THE TIMELINE.** Typical turnaround is 6-10 days with no published SLA;
      this is ~3.5 weeks from the first submission. **Ask how long review is currently taking and whether
      anything is outstanding on our side**, referencing case 20000129383326. No revenue yet, so the delay
      has cost nothing so far.
      ⚠️ Typical turnaround is 6-10 days with no official timeline published; Justin was at 23. No revenue
      yet, so the delay has cost nothing. Chase again ~2026-08-19 with the Case ID if silent. Worth ~21% more revenue per subscription, more than every AI optimisation
      here combined.
- [ ] **7.2** Revenue levers never properly discussed: price, annual push, tip jar. Cost cutting can only
      ever take you to zero.
      🔬 **MODELLED 2026-08-05, two findings worth keeping:**
      - **Price is the strongest single lever nobody has touched.** ⚠️ **RE-RUN 2026-08-07 after gating
        shipped; the 2026-08-05 figures below are superseded.** At typical usage and canned 30%:
        | price | break-even |
        |---|---:|
        | $6.99 | 2.64% |
        | **$9.99 (today)** | **2.02%** |
        | $12.99 | 1.64% |
        ➡️ The FINDING is unchanged and is arguably stronger: $3 of price is worth more than the entire
        coaching gate was. **Superseded original: "at $12.99 break-even falls to ~2.2%; at $6.99 it rises
        past 4%"** -- those were computed before gating and before the six uncounted coach surfaces were
        added to the model.
      - 🔴 **PUSHING ANNUAL MAKES BREAK-EVEN SLIGHTLY WORSE, not better.** $89.99 against $119.88 of monthly
        payments is a **25% discount**. A 6-month monthly subscriber is worth $50.94; an annual one $76.49.
        **So annual only wins if it genuinely doubles retention** -- which contractually it does, since an
        annual subscriber cannot churn in month three. It is a trade (certainty for margin), not free money.
        Do not "push annual" on the assumption it helps; it helps only through retention.
- [x] ✅ **7.3 ANSWERED 2026-08-09. VERIFY WE CAN MEASURE ACTIVES,
      CONVERSION AND RETENTION. BEFORE LAUNCH.**
      🔬 **WHAT THE 2026-08-07 INVESTIGATION FOUND, so nobody re-derives it:**
      1. ✅ **CHECKED IN THE DASHBOARD 2026-08-09. THE PLUMBING WORKS AND THE NUMBER IS A TRAP.**
         RevenueCat has **53 customers, 12 "paid subscribers", 0 trialing, and $0 total revenue.** Nothing is
         disconnected: customers and entitlements are flowing through exactly as they should.
         🔴 **BUT "12 PAID SUBSCRIBERS" IS NOT 12 PAYING PEOPLE, AND $0 REVENUE IS THE PROOF.** Those are the
         TestFlight testers locked as Supporters plus first-week grants, all comped, every one showing
         "Set to cancel". **RevenueCat counts a GRANTED entitlement as a paid subscriber.**
         ➡️ **SO THE CONVERSION FIGURE ON THAT SCREEN IS FICTION UNTIL SOMEBODY ACTUALLY BUYS SOMETHING.**
         Read naively it is 12/53 = 23%, which would be the most flattering and most wrong number in the
         whole project. **Never quote it.** The warning this item already carried about promotional grants
         muddying the definition was correct and is now confirmed.
         ⚠️ **CHURN CANNOT BE MEASURED AT ALL YET**: nobody has ever paid, so nobody has ever cancelled.
         Subscriber lifetime therefore remains the single biggest unmeasured assumption in
         `scripts/cost-model.js`, exactly as it was this morning.
         ➡️ **NOTHING TO BUILD OR FIX. Re-check after the first real purchases**, and expect the first
         honest conversion reading to need the comped accounts filtered out.
      2. 🔴 **"ACTIVES: NOTHING MEASURES IT" WAS WRONG. CORRECTED 2026-08-09 -- IT IS ALREADY MEASURABLE
         FROM DATA THE APP ALREADY COLLECTS, AND NOTHING NEEDS BUILDING OR INSTRUMENTING.**
         The original finding was true only of ANALYTICS PACKAGES (no Firebase Analytics, no Amplitude, no
         `logEvent` anywhere), and that led to the wrong conclusion.
         ✅ **`services/syncService.ts` writes `{ key, value, updatedAt }` to `users/{uid}/store/{key}` for
         every synced `pj_*` key, and daily data is keyed `pj_YYYY-MM-DD`.** So a user who logged anything
         on a given day already has a document proving it.
         ➡️ **DAU = a `collectionGroup('store')` query for `key == 'pj_<date>'`. MAU = the same across 30
         days.** No new field, no new collection, no scheduled function, and **no `privacy.html` change**:
         this is the sync of the user's own data, which section 2 already covers in full.
         ⚠️ **IT COUNTS PEOPLE WHO LOGGED, NOT PEOPLE WHO OPENED.** Somebody who opens the app, reads their
         Home card and leaves does not appear. That is a NARROWER definition and arguably the more useful
         one, but it is a choice and should be stated wherever the number is quoted.
         ⚠️ **AND IT MEANS ITEM 3 BELOW OVERSTATES THE DAMAGE.** Gating did kill `ai_cost` as an accidental
         proxy, but this was never a proxy: it is a direct measure and it was never affected.
         ❌ **DO NOT ADD AN ANALYTICS SDK OR A `lastSeen` DOC FOR THIS.** A `lastSeen` write was designed and
         then dropped once the existing data was found: it would have been new collection, and `privacy.html`
         section 7 lists "usage telemetry" under Data We Do Not Collect, so it would have needed a policy
         amendment to measure something already measurable.
      3. 🔴 **AND GATING BROKE THE ACCIDENTAL PROXY WE HAD, on the same day.** Until 2026-08-07 every free
         user who opened Home fired two Smart Coach calls, which wrote an `ai_cost` doc for that uid that
         day. That made `ai_cost` a near-perfect stand-in for daily actives that nobody designed.
         **Post-gating a free user generates NO AI call unless they message Otto**, so that proxy is gone.
         ⚠️ Nobody would notice until reading actives at launch and finding the number quietly means
         "people who talked to Otto". **This is a real cost of 1.9 and it was not anticipated.**
      ➡️ **TWO WAYS TO FIX ACTIVES.** Cheap: one Firestore doc per user holding `lastSeen`, written once a
      day when the date changes; DAU is a count query on today, MAU on the last 30 days. No native module,
      no rebuild, uses the Firebase JS SDK already installed. Thorough: add Firebase Analytics for real
      DAU/MAU/retention cohorts, which needs a native module and a fresh dev build.
      (Original note follows.)
      **VERIFY WE CAN MEASURE ACTIVES, CONVERSION AND RETENTION. BEFORE LAUNCH (Justin, 2026-08-05).**
      🔴 **THE UNCOMFORTABLE OBSERVATION THAT PROMPTED THIS: we instrumented the solved problem.** `ai_cost`
      knows every token, cache read and route decision to the cent, and AI cost turned out to be the part
      that was already fine ($2.64 per active user per year). **The three numbers that actually decide
      whether this makes money -- active users, conversion, and retention -- are not verified as
      instrumented at all.**
      ➡️ **CHECK, do not assume:** RevenueCat should give conversion and churn, but nobody has opened it and
      confirmed what it reports or how it defines a conversion. Actives (DAU/MAU) may not be instrumented
      anywhere. **Launch without churn data and every table in `scripts/cost-model.js` stays a guess
      forever**, because subscriber lifetime is the single biggest assumption in it (at 6 months instead of
      12, break-even roughly doubles).
      ✅ **Canned-answer rate IS already tracked** (`cannedHit` / `cannedMiss` / `cannedBlocked` in `ai_cost`,
      PLAN 4.8), as is the coach/support mix (`routeCoach` / `routeSupport`).
      ⚠️ Not urgent tonight and useless at solo volume. Do it in the pre-launch window.

---

## ⏸️ PARKED WITH A TRIGGER -- not dead, revisit when the condition is met

⚠️ **Park with a trigger rather than deleting.** A deleted idea gets re-proposed from scratch months later
with none of the reasoning; a parked one comes back when the maths changes instead of when someone happens
to remember it. Justin's call, 2026-08-05.
⚠️ **And beware per-user framing.** "$0.013 a user a month" sounds like nothing and is $7,800/year at
50,000 actives. That framing is exactly what made Smart Coach look like 4.6 cents. **Always show the
annual figure at a few scales before calling something too small to bother with.**

| Idea | Worth | Why parked | ➡️ REVISIT WHEN |
|---|---|---|---|
| **Combine Home's two Smart Coach calls into one** (was 1.5) | $0.013/user/mo -- **$390/yr at 2,500 actives, $1,560 at 10k, $7,800 at 50k** | One call would have to produce TWO tips for two different surfaces: needs new output parsing, both tips fail together if parsing breaks, and a model doing two jobs at once tends to do both worse. Not worth risking the two flagship tips at today's size. | **Above ~10,000 active users**, or if the two Home tips are ever rewritten anyway |
| **Batch API (50% off) for Smart Coach** | ~$0.05/user/mo | The surfaces where batching is safe (weekly, monthly) are worth ~$0.003/mo; the ones worth real money are daily. **Justin's deciding reason: first open is exactly when someone checks their recovery and sleep read, and batching fails at that moment.** | If a genuinely non-interactive AI feature appears, or if tips ever stop being read on first open |
| 🆕 **CUT AI VOICING ON THE DAY SUMMARY PAGE ENTIRELY** (Justin, 2026-08-07) | Unknown -- **~$100/yr to ~$2,900/yr at 25,000 installs.** DERIVED from $0.00107/call (MEASURED). The whole range is one unknown: how many people tap through to the page. | **The frequency cannot be known before launch, and the old sizing was wrong in BOTH directions.** It was $2,900/yr, then downgraded 2026-08-06 to "cents per user" on the reasoning that the page is only reachable through Stats > Reports. 🔴 **Justin found a SECOND ENTRY POINT on device 2026-08-07: the daily Day Summary modal's own "View Full Breakdown" button**, which puts the ceiling back at one call per user per day. ⚠️ Same lesson as [[feedback_check_duplicate_entry_points]] -- the surface was costed from one route in. **Justin leans NO**: it makes the page permanently worse, and the tip is FROZEN per date so re-visits are already free. ➡️ And it may become moot: if Supporter-gated voicing (`SMART_COACH_SPEC.md` idea 5) ships, free users lose the day tip anyway. | **Once `ai_cost` -> `byFeature.coach.surfaces.day` has real post-launch traffic.** Divide it by actives over the same window and the tap-through rate falls straight out. The counter already ships. |
| 🆕 **TRIM THE APP MANUAL ITSELF once canned answers are live** (Justin's idea, 2026-08-05) | Unknown -- potentially large, it is 22,049 of Otto's 26,474 tokens | **Cannot be done yet, and the reason is the safety story.** The manual is the FALLBACK: canned answers only fire when the matcher is certain, and matchers miss 8-20% of unseen phrasing however carefully built (measured, 4.9). Trim it and every miss stops costing a fraction of a cent and starts being "Otto does not know". ⚠️ **And it cannot be half-removed** -- there is no state where he knows a feature exists but not how to reach it; the path is in the text or it is not. | ✅ **CONDITION 1 MET 2026-08-07: canned answers are live and firing.** ⏳ Condition 2 outstanding: the meter must show how often the manual is still genuinely reached (`cannedMiss` against `cannedHit` on real traffic, not Justin's). If that number collapses, this becomes a real conversation backed by data instead of a hunch. **Do not attempt it on a hunch.** 🔴 **AND THE 8-20% FIGURE IN THE COLUMN LEFT IS THE WRONG ONE FOR THIS DECISION.** That is 4.9's routing detector. The number that governs a trim is the CANNED matcher's own coverage, **MEASURED at ~60% on a never-tuned corpus, i.e. a ~40% miss rate** (4.8). Every one of those misses is a message the manual currently catches. **That makes trimming more dangerous than this row originally read, not less.** |

## ❌ DECIDED AGAINST -- do not re-propose without new evidence

| Idea | Why |
|---|---|
| Removing Otto from free after a trial week | Justin: *"that is drastic."* DEAD. |
| A smaller "free edition" of the app manual | The app is mostly free -- gating is INSIDE features, not whole chapters. Worth ~15%, and the Coach/Support split (4.9) makes it worth almost nothing. |
| Rewriting the manual denser | Verified by reading it. Already tight. |
| Switching AI provider / a cheaper model | Cost is prompt-size dominated, not rate dominated. A cheaper model still reads the same tokens. Haiku is already the cheapest Claude. |
| A 100/month pool instead of a daily cap | A daily wall converts; a monthly wall kills three weeks. |
| Cutting Smart Coach surfaces / templates-for-free-users | Unnecessary once 1.1-1.5 land. |
| **Batch API (50% off) for Smart Coach** | ⏸️ **Parked, not ruled out.** The surfaces where it is safe (weekly, monthly) are worth ~$0.003/mo; the surfaces worth real money are daily. **Justin's deciding reason: first open is exactly when someone checks their recovery and sleep read, and batching fails at that moment.** |
| Shortening Smart Coach replies | Rulebook already says 2-3 sentences and requires connecting two signals. One sentence cannot. No fat. |
| **Answering Bible verse lookups from local data instead of Halo** | ❌ **DECLINED 2026-08-05 on cost, kept here because the idea is sound and will come back.** The whole Bible ships in the app (`data/bible-web.ts`), so "what does John 3:16 say" is a local lookup needing no AI. **But it only ever covers reciting the text** -- what it MEANS, how it applies, anything at all interpretive, is Halo's and always will be. Halo is the cheapest AI in the app at $0.00067/message ⚠️ **(~$0.00097 since her voice rider shipped 2026-08-06; `scripts/cost-model.js` is live)**, so deflecting even a fifth of her traffic saves **~$144/yr at 25,000 installs**. Rounding error. ➡️ **The real argument is ACCURACY, not money** -- a lookup returns the actual text where a model can misquote scripture, which matters more in a faith app than most. Revisit as a correctness feature if misquoting is ever observed. |
| **Cutting Otto's 12-message history cap** | ❌ **MEASURED AND REJECTED 2026-08-05, see 4.5.** History is 38% of full-price input but **5% of the bill**. A free user on the 5/day cap tops out at 9 messages and never reaches 12, so trimming bills Supporters almost exclusively. And it backfires: the cold write is per-conversation, so shorter history means fewer messages to spread it across. **Do not re-propose without new evidence.** |

---

## 🔬 OPEN QUESTIONS

- Is Smart Coach worth **making better** or **shrinking**? Justin on the fence.
  ➡️ **After 1.1-1.5 this is a pure PRODUCT question with no cost pressure.** Decide it on whether the
  feature is good, not on whether it is cheap.
- Does a zero-cost canned answer count against the free cap? (Justin leans yes.)
- The real coach/support message mix, and the real canned-answer deflection rate.
  ⚠️ **Both are unmeasurable before launch without being circular.** Ship logging-only and read the answer
  off production. See `feedback_measure_dont_ask_justin`.

---

## WHERE DETAIL LIVES

| Topic | File |
|---|---|
| Cost arithmetic, every constant, break-evens | `SPEC_cost_model.md` |
| Otto's tiers, prompts, open items | `SPEC_otto.md` |
| Why routing is parked | `SPEC_otto_routing.md` |
| Smart Coach behaviour and rulebook | `SMART_COACH_SPEC.md` |
| Monetisation strategy | `SPEC_monetization.md` |
| Everything else, and items A-O in full | `project_j_roadmap.md` |
