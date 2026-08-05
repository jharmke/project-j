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
| Break-even conversion, today | ~2.8% | DERIVED |
| Break-even after the measured fixes | **~1.9%** | DERIVED. Quote this one. |
| Break-even if canned answers land at 40% | ~1.3% | ASSUMED -- do not quote |
| Affordable usage at 3% conversion | ~2 companion messages/active user/day | DERIVED |

🔴 **The cost tables do NOT yet include Smart Coach or the meal estimator.** They counted Otto and Halo
only. Smart Coach alone is larger than both. **Every projection above is optimistic until item 0 gives us
real readings.**

---

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

### 1. SMART COACH -- the biggest AI cost in the app (~$0.37/user/mo, DERIVED)
Detail: `SMART_COACH_SPEC.md`. Cost derivation: `SPEC_cost_model.md`.
- [ ] **1.1** Send all three voice-example sets instead of one. Crosses Haiku's 4,096-token cache minimum
      (3,520 -> 4,342) so the prompt caches for the first time, AND collapses three cache entries into one
      shared by every user. ⚠️ Requires `aiProxy.ts` to accept a cache marker -- it currently takes the
      system prompt only as a plain string.
- [ ] **1.2** Skip the AI entirely on low-data scenarios (`sleep_data_low`, `log_consistency_low`). The
      packet already carries a written `fallbackBody` that says the same words. **Zero detection risk** --
      the app's own code already chose that packet. Today a new user with no wearable pays for two AI calls
      a day to be told "not enough data".
- [ ] **1.3** Gate generation on card visibility. Hidden cards still generate tips nobody sees.
      (Justin found this.)
- [ ] **1.4** Only regenerate when the underlying packet changed. No staleness -- an unchanged packet would
      have produced the same tip.
- [ ] **1.5** Combine the Home tab's two calls (home tip + sleep tip) into one. Same batching trick the EvR
      card voicer already uses.
- [ ] **1.6** Verify whether the recovery tip has the same low-data waste as sleep. **Unverified.**
- ➡️ Expected: **~$0.37 -> ~$0.10/user/month, DERIVED**, nothing visible changing. Item 0 confirms it.

### 2. THE CACHE FIXES -- launch build
- [ ] **2.1** 1-hour cache TTL on Otto, Halo and Smart Coach. ⚠️ Only correct above ~10 active users; below
      that it costs slightly more. **Set it as part of the launch build, not today.** Make it a dial.
- [ ] **2.2** Faith cache fix: move the faith-tier line out of `buildCompanionStable` so three cached copies
      collapse into one shared entry.
- [ ] **2.3** Pad Halo's prompt past Haiku's 4,096-token minimum so it caches at all -- **METERED 2026-08-05
      at 3,987 tokens, so it needs roughly 150 more, not the ~1,600 the old 2,465 figure implied.**
      Safety/theology/crisis blocks are off-limits to cut, so growing them is the allowed direction anyway.
      ⚠️ Halo's real per-call cost is **$0.00406 metered**, not the $0.0032 in the old docs.
      ⚠️ Once it DOES cache, the old note about the plans catalog varying inside the cached block becomes a
      live problem -- check it then (it is harmless today only because nothing caches).
- [ ] **2.4** Don't send the Faith chapter to "Not Right Now" users. 635 tokens they can never need.

### 3. THE FREE CAP
- [ ] **3.1** Otto and Halo free cap 10/day -> 5/day. Enforced server-side already, so it is a safe change.
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
| 5 | Otto's uncached per-message overhead | 🔴 open -- **4.3** |
| 6 | Reply-shape block is 336 tokens, not 40 | 🔴 open -- **4.4** |
| 7 | Otto's cache is healthy | ✅ nothing to do (good news) |
| 8 | Otto's cap is server-side | ✅ nothing to do -- enables 3.1 |
| 9 | Estimator's cap is client-side | 🔴 open -- **4.2** |
| 10 | History capped at 12 turns | 🔴 open -- **4.5** |
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
- [ ] **4.3** Otto's **uncached per-message overhead**: volatile block 786 tokens + reply-shape block 336 +
      history. ~1,100-1,400 tokens paid at full price on every message, 25-35% of the cost. Never examined.
- [ ] **4.4** The reply-shape block's own comment claims it is "~40 input tokens". **It is 336.** It still
      pays for itself, but ~1.5x over, not the "twelve times over" claimed.
- [ ] **4.5** `MAX_HISTORY_TURNS` is 12. Up to ~$0.0015/message at the cap. Never measured or tuned.
- [ ] **4.6** Otto's 4,425 tokens of standing rules -- never once read for cuttable content.
- [ ] **4.7** A second Otto reply-shortening pass, and whether he is wordier on some topics than others.
      ⚠️ Once the prompt shrinks, **output is ~70% of the remaining cost**, so this gets MORE valuable, not
      less.
- [ ] **4.8** Canned answers for fixed-answer app questions. Zero cost, faster, always correct.
      ⚠️ Needs a matcher, and matchers fail badly in the wild -- **only answer when very sure; anything
      doubtful goes to Otto.**
- [ ] **4.9** Split Otto into **Coach** (no manual, ~5,000 tokens) and **Support** (full manual).
      ⚠️ **Build the two as a STACK, not two packets** (Justin's idea, and it is the right one): rules first
      with a cache marker, manual second with its own. A Support message then reads the rules from the same
      cache a Coach message just used and only pays fresh for the manual.
      ⚠️ **Ship it logging-only first.** Both halves keep the full manual so nothing changes; log the
      classification; two weeks of real users gives the real mix.
      ⚠️ When a question is ambiguous it goes to **Support** -- having the manual and not needing it wastes
      a little money; needing it and not having it makes Otto invent things about the app.
- [ ] **4.10** Enumerate which remaining features call the AI at all. Only Smart Coach is fully mapped.

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
      ➡️ **ACTION 2026-08-05: contact Apple Developer Support** (developer.apple.com/contact, membership /
      App Store Connect topic). Worth ~21% more revenue per subscription, more than every AI optimisation
      here combined.
- [ ] **7.2** Revenue levers never properly discussed: price, annual push, tip jar. Cost cutting can only
      ever take you to zero.

---

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
