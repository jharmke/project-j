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

### 0. THE COST METER -- do this before any optimisation
- [ ] **0.1** Record real token usage on every AI call (`usage.input_tokens`,
      `cache_creation_input_tokens`, `cache_read_input_tokens`, `output_tokens`) to Firestore, tagged by
      feature. Covers Smart Coach + estimator via `aiProxy.ts`; Otto and Halo need their own.
      ⚠️ **Nothing captures this today** -- Anthropic returns it on every call and the code discards it.
      The per-call Firestore write already exists for the daily caps, so this is a small addition.
      ➡️ **Why first:** every number below is arithmetic until this proves it. `cache_read_input_tokens > 0`
      is the binary proof the cache fixes actually landed. Works off Justin's own device; does not need
      real traffic.

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
- [ ] **2.3** Pad Halo's prompt past 4,096 tokens so it caches at all (2,465 today -- it has NEVER cached).
      Safety/theology/crisis blocks are off-limits to cut, so growing them is the allowed direction.
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

- [ ] **4.1** The **meal estimator runs on Sonnet** (3x Haiku on both input and output) on the one feature
      that also sends an image. ~$0.0165/estimate vs ~$0.0055 on Haiku. ⚠️ Vision + structured JSON --
      **needs a quality test, not just a config change.** ⚠️ Also note: item O recorded a Justin decision
      (2026-07-31) to deliberately leave this alone. Revisit that decision explicitly, do not overrule it.
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
