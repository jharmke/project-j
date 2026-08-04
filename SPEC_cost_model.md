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
| Otto per message | $0.0027 | Spec cost table, with the data gate shipped and item H routing at its cautious setting |
| Halo per message | $0.0025 | SPEC_monetization line 661 |
| Smart Coach | $0.046/user/month | THE PLAN item O |
| Estimates/month | 2 @ ~$0.02 | Light-usage figure; free cap is 5/month |
| Supporter usage | 2x a free user | Judgement. They have 3x the caps but are still one person |

**RESULT: an active free user costs ~$0.18/month. A Supporter costs ~$0.36 and nets $8.49.**
**BREAK-EVEN CONVERSION: 2.16% of active users.**

---

## NET PER YEAR -- at 15% (Small Business Program)

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

## RE-RUN IT
`scratchpad/cost-model.js` computes every table here. Change an assumption at the top and run it.
