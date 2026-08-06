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
| 🟡 Halo prompt content | Three new voice examples in. Only messages sent were "hi" and "how are you". | Ditto. One real message would settle it |
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

- [ ] **0.2 🆕 THE METER HAS NO RETENTION RULE -- a gap WE created 2026-08-05.** It writes one Firestore
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
| 11 | Otto's 4,425 tokens of rules unread | 🔴 open -- **4.6** |
| 12 | Is Otto wordier on some topics | 🔴 open -- **4.7** |
| 13 | Smart Coach packet not sized | ✅ done -- ~200 tokens |

- [ ] **4.1 ✅ DECIDED 2026-08-05: KEEP SONNET. RESIZE THE PHOTO INSTEAD.** Not built.
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
- [ ] **4.4** The reply-shape block's own comment claims it is "~40 input tokens". **It is 336.** It still
      pays for itself, but ~1.5x over, not the "twelve times over" claimed.
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
- [ ] **4.6** Otto's 4,425 tokens of standing rules -- never once read for cuttable content.
- [ ] **4.7** A second Otto reply-shortening pass, and whether he is wordier on some topics than others.
      ⚠️ Once the prompt shrinks, **output is ~70% of the remaining cost**, so this gets MORE valuable, not
      less.
- [ ] **4.8 SPECCED IN FULL 2026-08-05, NOTHING BUILT.** Canned answers for fixed-answer app questions:
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
      ## 🔨 BUILT 2026-08-05 (evening). NOT DEPLOYED, awaiting Justin's review.
      `ottoCannedAnswers.ts` (**183 answers**), `ottoCannedMatcher.ts`, wired into `appCompanion.ts`.
      Harnesses committed: `_canned_audit.cjs`, `_canned_holdout.cjs`.

      **RESULTS**
      | | tuned corpus | held-out (written after tuning) |
      |---|---:|---:|
      | 🔴 **wrong answers** | **0** | **0** |
      | matched correctly | 71/71 | **47/54 (87%)** |
      | declined correctly | 30/30 | 22/22 |
      | collisions resolved | 22/22 | |
      | stitching | 2/2 | |
      | assertion failures | 0 | |
      ⚠️ **THE HELD-OUT NUMBER IS THE HONEST ONE, AND IT IS NOW PART-BURNED.** It scored **61%** on its first
      run; one round of GENERIC fixes (not per-message patches) took it to 87%. True unseen phrasing sits
      somewhere between. Same overfitting gap 4.9 showed (100% tuned / 81% unseen).
      ✅ **THE NUMBER THAT MATTERS HELD THROUGHOUT: zero wrong answers, on every run, on both corpora.**

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
      - **160 of 183 answers state no explicit path**, so assertion 3 does not cover them. They are mostly
        achievements and concepts, which have nothing to go stale, but the guard is thinner than it sounds.
      - **7 held-out misses remain**, all cost-only: "where do i put my weight in", "how do i wipe a meal",
        "how do i look at an older day", "how do i pause everything for a trip", "the text is too small how
        do i fix it", "what counts as a net carb" (ambiguous tie), and one more. Each is fixable by widening
        one answer's vocabulary; I have NOT done so, because that is fitting the held-out set.
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
| D | 7-day taste | ✅ fully agreed 2026-07-31, **specced not built** |
| E | Workout builder | needs a full spec |
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

### 7. NOT AI, AND BIGGER THAN MOST OF THIS
- [~] **7.1 Apple Small Business Program.** ⚠️ **APPLIED TWICE, NO RESPONSE** (2026-07-13 and 2026-07-29,
      both confirmed received). **NOT a to-do for Justin to start -- do not recommend enrolling again.**
      ✅ **CONTACTED 2026-08-05 via Agreements and Contracts. AWAITING REPLY -- still open.**
      ⚠️ Typical turnaround is 6-10 days with no official timeline published; Justin was at 23. No revenue
      yet, so the delay has cost nothing. Chase again ~2026-08-19 with the Case ID if silent. Worth ~21% more revenue per subscription, more than every AI optimisation
      here combined.
- [ ] **7.2** Revenue levers never properly discussed: price, annual push, tip jar. Cost cutting can only
      ever take you to zero.

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
| 🆕 **TRIM THE APP MANUAL ITSELF once canned answers are live** (Justin's idea, 2026-08-05) | Unknown -- potentially large, it is 22,049 of Otto's 26,474 tokens | **Cannot be done yet, and the reason is the safety story.** The manual is the FALLBACK: canned answers only fire when the matcher is certain, and matchers miss 8-20% of unseen phrasing however carefully built (measured, 4.9). Trim it and every miss stops costing a fraction of a cent and starts being "Otto does not know". ⚠️ **And it cannot be half-removed** -- there is no state where he knows a feature exists but not how to reach it; the path is in the text or it is not. | **Once canned answers have shipped AND the meter shows how often the manual is still genuinely reached.** If that number collapses, this becomes a real conversation backed by data instead of a hunch. Do not attempt it on a hunch. |

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
| **Answering Bible verse lookups from local data instead of Halo** | ❌ **DECLINED 2026-08-05 on cost, kept here because the idea is sound and will come back.** The whole Bible ships in the app (`data/bible-web.ts`), so "what does John 3:16 say" is a local lookup needing no AI. **But it only ever covers reciting the text** -- what it MEANS, how it applies, anything at all interpretive, is Halo's and always will be. Halo is the cheapest AI in the app at $0.00067/message, so deflecting even a fifth of her traffic saves **~$144/yr at 25,000 installs**. Rounding error. ➡️ **The real argument is ACCURACY, not money** -- a lookup returns the actual text where a model can misquote scripture, which matters more in a faith app than most. Revisit as a correctness feature if misquoting is ever observed. |
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
